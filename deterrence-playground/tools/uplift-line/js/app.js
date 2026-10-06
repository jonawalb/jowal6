/* Where's the Uplift Line? - triage trainer. No dependencies. */
(function () {
  'use strict';

  var ORDER = ['full', 'safety', 'general', 'decline', 'escalate'];
  var FACTOR_KEYS = ['avail', 'spec', 'action', 'gap', 'intent'];
  var LEVELS = ['0 none', '1 low', '2 moderate', '3 high', '4 severe'];
  var CLASS_LABEL = { answer: 'Should answer', gray: 'Gray zone', violation: 'Violation' };
  var FLAG_LABEL = { trajectory: 'Multi-turn', 'context-shift': 'Context shift' };
  var RUBRIC = {
    avail: {
      q: 'Is this already in encyclopedias, manuals, museums or standard courses, at this level of detail?',
      lo: '0: Widely available at this level (textbooks, museum placards, hunter education).',
      hi: '4: Not publicly available, or only scattered pieces that the answer would assemble.'
    },
    spec: {
      q: 'Is the request for a principle or for a procedure?',
      lo: '0: Concepts, history, why something works or matters.',
      hi: '4: Steps, quantities, parts, settings or sequences.'
    },
    action: {
      q: 'Could someone act on the answer without other expertise, tools or materials?',
      lo: '0: Nothing to act on; understanding only.',
      hi: '4: A complete plan someone could follow.'
    },
    gap: {
      q: 'Does the answer remove a real bottleneck between wanting to cause harm and being able to?',
      lo: '0: No bottleneck touched.',
      hi: '4: Removes the hardest remaining step.'
    },
    intent: {
      q: 'Are there intent or target signals: a stated harmful purpose, a named target, prohibited status, evasion language, hostile earlier turns?',
      lo: '0: None, or a clear benign purpose.',
      hi: '4: Explicit harmful intent or a specific target.'
    }
  };
  var STORE_KEY = 'uplift-line-v1';

  var data = null;
  var byId = {};
  var state = { order: [], idx: 0, answers: {}, domain: '', type: '' };
  var draft = { decision: null, factors: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && Array.isArray(s.order)) return s;
      }
    } catch (e) { /* storage unavailable */ }
    return null;
  }
  function save() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function rank(d) { return ORDER.indexOf(d); }
  function compare(user, ref) {
    var diff = rank(user) - rank(ref);
    var fp = rank(ref) <= 2 && rank(user) >= 3;
    var fn = rank(ref) >= 3 && rank(user) <= 1;
    var pts = diff === 0 ? 2 : (Math.abs(diff) === 1 ? 1 : 0);
    return { diff: diff, fp: fp, fn: fn, pts: pts };
  }

  function filtered() {
    return state.order.filter(function (id) {
      var s = byId[id];
      if (!s) return false;
      if (state.domain && s.domain !== state.domain) return false;
      if (state.type) {
        if (state.type === 'answer' || state.type === 'gray' || state.type === 'violation') {
          if (s['class'] !== state.type) return false;
        } else if ((s.flags || []).indexOf(state.type) === -1) return false;
      }
      return true;
    });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- Practice view ---------- */

  function renderStatus() {
    var list = filtered();
    var answered = Object.keys(state.answers).length;
    var pts = 0;
    Object.keys(state.answers).forEach(function (id) {
      pts += compare(state.answers[id].decision, byId[id].ref.decision).pts;
    });
    $('progress').textContent = list.length
      ? 'Case ' + (state.idx + 1) + ' of ' + list.length + (list.length < data.scenarios.length ? ' (filtered)' : '')
      : 'No cases match these filters';
    $('score').textContent = 'Answered ' + answered + ' of ' + data.scenarios.length +
      ' · Score ' + pts + ' / ' + (answered * 2);
  }

  function factorScale(ref, you) {
    var html = '<div class="fcompare">';
    FACTOR_KEYS.forEach(function (k) {
      html += '<div class="frow"><span>' + esc(data.factors[k]) + '</span><div class="scale" role="img" aria-label="' +
        esc(data.factors[k]) + ': reference ' + ref[k] + (you ? ', yours ' + you[k] : '') + ' out of 4">';
      html += '<span class="mark ref" style="left:' + (6 + ref[k] * 22) + '%"></span>';
      if (you) html += '<span class="mark you" style="left:' + (6 + you[k] * 22) + '%"></span>';
      html += '</div></div>';
    });
    html += '</div><div class="legend"><span><i style="background:var(--g900)"></i>Reference</span>' +
      (you ? '<span><i style="background:var(--strict)"></i>Yours</span>' : '<span>You did not rate the factors for this case.</span>') +
      '<span>Scale 0 (left) to 4 (right)</span></div>';
    return html;
  }

  function renderCase() {
    renderStatus();
    var list = filtered();
    var el = $('case');
    if (!list.length) {
      el.innerHTML = '<p class="muted">No cases match these filters. Change the domain or type above.</p>';
      return;
    }
    if (state.idx >= list.length) state.idx = list.length - 1;
    if (state.idx < 0) state.idx = 0;
    var s = byId[list[state.idx]];
    var ans = state.answers[s.id];
    var revealed = !!ans;
    var cur = revealed ? ans : draft;

    var tags = '<span class="tag">' + esc(s.domain) + '</span>';
    if (revealed) tags += '<span class="tag ' + s['class'] + '">' + CLASS_LABEL[s['class']] + '</span>';
    (s.flags || []).forEach(function (f) { tags += '<span class="tag">' + FLAG_LABEL[f] + '</span>'; });

    var html = '<div class="meta">' + tags + '</div>';
    html += '<h2>' + esc(s.title) + '</h2>';
    if (s.context) html += '<p class="context">' + esc(s.context) + '</p>';
    html += '<p class="request">' + esc(s.request) + '</p>';
    if (s.turns) {
      html += '<ol class="turns">';
      s.turns.forEach(function (t, i) {
        var crossed = revealed && s.ref.crossAt && i + 1 >= s.ref.crossAt;
        html += '<li' + (crossed ? ' class="crossed"' : '') + '>' +
          (revealed && s.ref.crossAt === i + 1 ? '<span class="cross-note">Line crossed here</span>' : '') +
          esc(t) + '</li>';
      });
      html += '</ol>';
      if (!revealed) html += '<p class="slider-hint">Make one call for the conversation as it stands after the last turn.</p>';
    }

    html += '<fieldset><legend>Your call</legend><div class="choices">';
    ORDER.forEach(function (d, i) {
      html += '<label class="choice"><input type="radio" name="decision" value="' + d + '"' +
        (cur.decision === d ? ' checked' : '') + (revealed ? ' disabled' : '') + '><span><kbd>' + (i + 1) + '</kbd>' +
        esc(data.decisions[d]) + '</span></label>';
    });
    html += '</div></fieldset>';

    if (!revealed) {
      var fv = draft.factors;
      html += '<details class="factors"' + (fv ? ' open' : '') + '><summary>Rate the five factors (optional)</summary>';
      FACTOR_KEYS.forEach(function (k) {
        var v = fv ? fv[k] : 0;
        html += '<div class="slider-row"><label for="sl-' + k + '">' + esc(data.factors[k]) + '</label>' +
          '<output id="out-' + k + '" for="sl-' + k + '">' + (fv ? LEVELS[v] : 'not rated') + '</output>' +
          '<input type="range" id="sl-' + k + '" data-k="' + k + '" min="0" max="4" step="1" value="' + v + '"></div>';
      });
      html += '<p class="slider-hint">0 = no concern, 4 = high concern. See the Rubric tab for anchors. Moving any slider counts the case as rated.</p></details>';
    }

    html += '<div class="actions">';
    if (!revealed) {
      html += '<button type="button" class="btn" id="btn-reveal"' + (draft.decision ? '' : ' disabled') + '>Reveal reference call</button>';
    } else {
      html += '<button type="button" class="btn ghost" id="btn-clear">Clear my answer</button>';
    }
    html += '<div class="nav-btns"><button type="button" class="btn ghost" id="btn-prev"' + (state.idx === 0 ? ' disabled' : '') +
      '>Previous</button><button type="button" class="btn ghost" id="btn-next"' + (state.idx >= list.length - 1 ? ' disabled' : '') +
      '>Next</button></div></div>';

    if (revealed) html += renderReveal(s, ans);
    el.innerHTML = html;
    bindCase(s);
  }

  function renderReveal(s, ans) {
    var c = compare(ans.decision, s.ref.decision);
    var verdict;
    if (c.diff === 0) verdict = '<span class="pill match">Match</span>';
    else {
      var steps = Math.abs(c.diff) + (Math.abs(c.diff) === 1 ? ' step ' : ' steps ');
      verdict = '<span class="pill ' + (c.diff > 0 ? 'stricter' : 'looser') + '">' + steps + (c.diff > 0 ? 'stricter' : 'looser') + ' than reference</span>';
    }
    if (c.fp) verdict += '<span class="pill stricter">Over-refusal</span>';
    if (c.fn) verdict += '<span class="pill looser">Under-refusal</span>';
    verdict += '<span class="muted">+' + c.pts + ' pts</span>';

    var html = '<section class="reveal" aria-label="Reference call"><div class="verdict">' + verdict + '</div>';
    html += '<dl class="calls-compare"><dt>Reference</dt><dd>' + esc(data.decisions[s.ref.decision]) + '</dd>' +
      '<dt>Yours</dt><dd>' + esc(data.decisions[ans.decision]) + '</dd></dl>';
    html += '<h3>Why</h3><p>' + esc(s.ref.rationale) + '</p>';
    if (s.ref.goodAnswer) {
      var label = s['class'] === 'violation' ? 'What the response should do' : 'What a good answer covers (general level)';
      html += '<h3>' + label + '</h3><p>' + esc(s.ref.goodAnswer) + '</p>';
    }
    html += '<h3>Factor scores</h3>' + factorScale(s.ref.factors, ans.factors);
    if (s.pair && byId[s.pair]) {
      html += '<p class="slider-hint" style="margin-top:.8rem">Paired case: <button type="button" class="btn ghost" data-goto="' +
        esc(s.pair) + '">' + esc(byId[s.pair].title) + '</button></p>';
    }
    if (s.sources && s.sources.length) {
      html += '<h3>Sources</h3><ul class="sources">';
      s.sources.forEach(function (k) {
        var src = data.sources[k];
        html += '<li><a href="' + esc(src.url) + '" target="_blank" rel="noopener">' + esc(src.label) + '</a></li>';
      });
      html += '</ul>';
    }
    html += '<p class="slider-hint">Reference call: one analyst\'s judgment for training, not any company\'s policy.</p></section>';
    return html;
  }

  function bindCase(s) {
    var el = $('case');
    el.querySelectorAll('input[name=decision]').forEach(function (r) {
      r.addEventListener('change', function () {
        draft.decision = r.value;
        var b = $('btn-reveal');
        if (b) b.disabled = false;
      });
    });
    el.querySelectorAll('input[type=range]').forEach(function (r) {
      r.addEventListener('input', function () {
        if (!draft.factors) {
          draft.factors = {};
          FACTOR_KEYS.forEach(function (k) { draft.factors[k] = Number($('sl-' + k).value); });
          FACTOR_KEYS.forEach(function (k) { $('out-' + k).textContent = LEVELS[draft.factors[k]]; });
        }
        draft.factors[r.dataset.k] = Number(r.value);
        $('out-' + r.dataset.k).textContent = LEVELS[Number(r.value)];
      });
    });
    var reveal = $('btn-reveal');
    if (reveal) reveal.addEventListener('click', function () {
      if (!draft.decision) return;
      state.answers[s.id] = { decision: draft.decision, factors: draft.factors };
      draft = { decision: null, factors: null };
      save();
      renderCase();
      var rv = $('case').querySelector('.reveal');
      if (rv) rv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    var clear = $('btn-clear');
    if (clear) clear.addEventListener('click', function () {
      delete state.answers[s.id];
      draft = { decision: null, factors: null };
      save();
      renderCase();
    });
    $('btn-prev').addEventListener('click', function () { step(-1); });
    $('btn-next').addEventListener('click', function () { step(1); });
    el.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { gotoCase(b.getAttribute('data-goto')); });
    });
  }

  function step(n) {
    state.idx += n;
    draft = { decision: null, factors: null };
    save();
    renderCase();
    $('case').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function gotoCase(id) {
    var list = filtered();
    if (list.indexOf(id) === -1) {
      state.domain = ''; state.type = '';
      $('f-domain').value = ''; $('f-type').value = '';
      list = filtered();
    }
    state.idx = list.indexOf(id);
    draft = { decision: null, factors: null };
    save();
    selectTab('tab-practice');
    renderCase();
    $('case').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Calibration view ---------- */

  function renderCalibration() {
    var el = $('calib');
    var ids = Object.keys(state.answers).filter(function (id) { return byId[id]; });
    if (!ids.length) {
      el.innerHTML = '<div class="card"><p class="muted">Answer a few cases in Practice to see where you sit relative to the reference calls.</p></div>';
      return;
    }
    var tot = { pts: 0, exact: 0, stricter: 0, looser: 0, fp: 0, fn: 0 };
    var byClass = {};
    var matrix = {};
    ORDER.forEach(function (r) { matrix[r] = {}; ORDER.forEach(function (u) { matrix[r][u] = 0; }); });
    var bias = {}; var rated = 0;
    FACTOR_KEYS.forEach(function (k) { bias[k] = 0; });
    var misses = [];

    ids.forEach(function (id) {
      var s = byId[id]; var a = state.answers[id];
      var c = compare(a.decision, s.ref.decision);
      tot.pts += c.pts;
      if (c.diff === 0) tot.exact++; else if (c.diff > 0) tot.stricter++; else tot.looser++;
      if (c.fp) tot.fp++;
      if (c.fn) tot.fn++;
      var k = s['class'];
      byClass[k] = byClass[k] || { n: 0, match: 0, stricter: 0, looser: 0 };
      byClass[k].n++;
      if (c.diff === 0) byClass[k].match++; else if (c.diff > 0) byClass[k].stricter++; else byClass[k].looser++;
      matrix[s.ref.decision][a.decision]++;
      if (a.factors) {
        rated++;
        FACTOR_KEYS.forEach(function (f) { bias[f] += a.factors[f] - s.ref.factors[f]; });
      }
      if (c.diff !== 0) misses.push({ s: s, a: a, c: c });
    });

    var n = ids.length;
    var html = '<div class="tiles">' +
      tile(n + ' / ' + data.scenarios.length, 'Cases answered') +
      tile(tot.pts + ' / ' + n * 2, 'Score') +
      tile(Math.round(100 * tot.exact / n) + '%', 'Exact match') +
      tile(tot.stricter, 'Stricter than reference', tot.stricter ? 'caution' : '') +
      tile(tot.looser, 'Looser than reference', tot.looser ? 'warn' : '') +
      tile(tot.fp, 'Over-refusals (false positives)', tot.fp ? 'caution' : '') +
      tile(tot.fn, 'Under-refusals (false negatives)', tot.fn ? 'warn' : '') +
      '</div>';

    var lean;
    if (tot.stricter > tot.looser * 1.5 && tot.stricter >= 2) lean = 'You lean stricter than the reference. Check the over-refusal cases below: most of them are requests a good assistant should answer.';
    else if (tot.looser > tot.stricter * 1.5 && tot.looser >= 2) lean = 'You lean looser than the reference. Look at where specificity, aggregation or intent signals tipped the reference call.';
    else if (tot.stricter + tot.looser < 2) lean = 'Too few disagreements yet to show a lean.';
    else lean = 'Your misses are roughly balanced between stricter and looser.';
    html += '<div class="card calib-section"><h3>Which way you lean</h3><p>' + lean + '</p>';
    ['answer', 'gray', 'violation'].forEach(function (k) {
      var b = byClass[k];
      if (!b) return;
      html += '<div class="lean"><span>' + CLASS_LABEL[k] + '</span><div class="stack" role="img" aria-label="' + CLASS_LABEL[k] + ': ' +
        b.looser + ' looser, ' + b.match + ' match, ' + b.stricter + ' stricter">' +
        '<span class="s-loose" style="width:' + (100 * b.looser / b.n) + '%"></span>' +
        '<span class="s-match" style="width:' + (100 * b.match / b.n) + '%"></span>' +
        '<span class="s-strict" style="width:' + (100 * b.stricter / b.n) + '%"></span></div>' +
        '<span class="muted">' + b.match + '/' + b.n + '</span></div>';
    });
    html += '<div class="legend"><span><i style="background:var(--loose)"></i>Looser</span><span><i style="background:var(--g600)"></i>Match</span><span><i style="background:var(--strict)"></i>Stricter</span></div></div>';

    html += '<div class="card calib-section"><h3>Your calls against the reference</h3><div class="table-wrap"><table class="matrix"><thead><tr><th scope="col">Reference ↓ / Yours →</th>';
    ORDER.forEach(function (u) { html += '<th scope="col">' + esc(shortLabel(u)) + '</th>'; });
    html += '</tr></thead><tbody>';
    ORDER.forEach(function (r) {
      html += '<tr><th scope="row">' + esc(shortLabel(r)) + '</th>';
      ORDER.forEach(function (u) {
        var v = matrix[r][u];
        html += '<td class="' + (r === u ? 'diag' : (v ? '' : 'zero')) + '">' + v + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div><p class="slider-hint">Cells right of the diagonal are stricter than the reference; cells left of it are looser.</p></div>';

    html += '<div class="card calib-section"><h3>Factor bias</h3>';
    if (rated) {
      html += '<p class="muted" style="font-size:.88rem">Average of your score minus the reference score across ' + rated + ' rated case' + (rated === 1 ? '' : 's') + '. Right of center means you saw more concern than the reference.</p>';
      FACTOR_KEYS.forEach(function (f) {
        var m = bias[f] / rated;
        var w = Math.min(Math.abs(m) / 4, 1) * 50;
        var left = m >= 0 ? 50 : 50 - w;
        html += '<div class="bias"><span>' + esc(data.factors[f]) + '</span><div class="bias-bar" role="img" aria-label="' + esc(data.factors[f]) + ' bias ' + m.toFixed(2) + '">' +
          '<span style="left:' + left + '%;width:' + w + '%;background:' + (m >= 0 ? 'var(--strict)' : 'var(--loose)') + '"></span></div>' +
          '<span class="v">' + (m > 0 ? '+' : '') + m.toFixed(2) + '</span></div>';
      });
    } else {
      html += '<p class="muted">Rate the factors on a few cases (optional sliders in Practice) to see this.</p>';
    }
    html += '</div>';

    html += '<div class="card calib-section"><h3>Disagreements</h3>';
    if (misses.length) {
      misses.sort(function (x, y) { return Math.abs(y.c.diff) - Math.abs(x.c.diff); });
      html += '<ul class="misses">';
      misses.forEach(function (m) {
        var why = 'You: ' + shortLabel(m.a.decision) + ' · Reference: ' + shortLabel(m.s.ref.decision) +
          (m.c.fp ? ' · over-refusal' : '') + (m.c.fn ? ' · under-refusal' : '');
        html += '<li><span><strong>' + esc(m.s.title) + '</strong><br><span class="why">' + esc(why) + '</span></span>' +
          '<button type="button" class="btn ghost" data-goto="' + esc(m.s.id) + '">Review</button></li>';
      });
      html += '</ul>';
    } else {
      html += '<p class="muted">None so far.</p>';
    }
    html += '</div>';

    el.innerHTML = html;
    el.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { gotoCase(b.getAttribute('data-goto')); });
    });
  }

  function tile(n, l, cls) {
    return '<div class="tile ' + (cls || '') + '"><div class="n">' + n + '</div><div class="l">' + esc(l) + '</div></div>';
  }
  function shortLabel(d) {
    return { full: 'Answer fully', safety: 'Safety framing', general: 'General only', decline: 'Decline', escalate: 'Escalate' }[d];
  }

  /* ---------- Static views ---------- */

  function renderRubric() {
    var html = '';
    FACTOR_KEYS.forEach(function (k, i) {
      html += '<div class="rubric-item"><h4>' + (i + 1) + '. ' + esc(data.factors[k]) + '</h4><p>' + esc(RUBRIC[k].q) +
        '</p><div class="anchors"><span>' + esc(RUBRIC[k].lo) + '</span><span>' + esc(RUBRIC[k].hi) + '</span></div></div>';
    });
    $('rubric-factors').innerHTML = html;
  }

  function renderSources() {
    var html = '';
    Object.keys(data.sources).forEach(function (k) {
      var s = data.sources[k];
      html += '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '</a></li>';
    });
    $('source-list').innerHTML = html;
  }

  /* ---------- Tabs ---------- */

  var TABS = ['tab-practice', 'tab-calibration', 'tab-rubric', 'tab-method'];
  function selectTab(id) {
    TABS.forEach(function (t) {
      var b = $(t); var on = t === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      $(b.getAttribute('aria-controls')).hidden = !on;
    });
    if (id === 'tab-calibration') renderCalibration();
  }
  function bindTabs() {
    TABS.forEach(function (t, i) {
      var b = $(t);
      b.addEventListener('click', function () { selectTab(t); });
      b.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % TABS.length;
        if (e.key === 'ArrowLeft') j = (i - 1 + TABS.length) % TABS.length;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = TABS.length - 1;
        if (j !== null) { e.preventDefault(); selectTab(TABS[j]); $(TABS[j]).focus(); }
      });
    });
  }

  /* ---------- Controls ---------- */

  function bindControls() {
    var domains = [];
    data.scenarios.forEach(function (s) { if (domains.indexOf(s.domain) === -1) domains.push(s.domain); });
    domains.sort().forEach(function (d) {
      var o = document.createElement('option'); o.value = d; o.textContent = d; $('f-domain').appendChild(o);
    });
    $('f-domain').value = state.domain;
    $('f-type').value = state.type;
    $('f-domain').addEventListener('change', function () { state.domain = this.value; state.idx = 0; draft = { decision: null, factors: null }; save(); renderCase(); });
    $('f-type').addEventListener('change', function () { state.type = this.value; state.idx = 0; draft = { decision: null, factors: null }; save(); renderCase(); });
    $('btn-shuffle').addEventListener('click', function () {
      state.order = shuffle(state.order); state.idx = 0; draft = { decision: null, factors: null }; save(); renderCase();
    });
    $('btn-reset').addEventListener('click', function () { $('reset-confirm').hidden = false; $('reset-yes').focus(); });
    $('reset-no').addEventListener('click', function () { $('reset-confirm').hidden = true; $('btn-reset').focus(); });
    $('reset-yes').addEventListener('click', function () {
      state.answers = {}; state.idx = 0; draft = { decision: null, factors: null };
      $('reset-confirm').hidden = true; save(); renderCase();
    });
    document.addEventListener('keydown', function (e) {
      if ($('view-practice').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'select' || tag === 'textarea' || (tag === 'input' && e.target.type === 'range')) return;
      var n = Number(e.key);
      if (n >= 1 && n <= 5) {
        var r = document.querySelector('input[name=decision][value="' + ORDER[n - 1] + '"]');
        if (r && !r.disabled) { r.checked = true; r.dispatchEvent(new Event('change')); r.focus(); }
      }
    });
  }

  /* ---------- Init ---------- */

  fetch('data/scenarios.json')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) {
      data = d;
      d.scenarios.forEach(function (s) { byId[s.id] = s; });
      var saved = load();
      var ids = d.scenarios.map(function (s) { return s.id; });
      if (saved) {
        state = saved;
        state.order = state.order.filter(function (id) { return byId[id]; });
        ids.forEach(function (id) { if (state.order.indexOf(id) === -1) state.order.push(id); });
        state.answers = state.answers || {};
        state.domain = state.domain || '';
        state.type = state.type || '';
        state.idx = state.idx || 0;
      } else {
        state.order = ids;
      }
      bindTabs();
      bindControls();
      renderRubric();
      renderSources();
      renderCase();
    })
    .catch(function (err) {
      $('case').innerHTML = '<p>Could not load the scenario file (' + esc(err.message) + '). Serve this folder over HTTP rather than opening the file directly.</p>';
    });
})();
