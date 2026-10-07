(function () {
  'use strict';

  var TAX, ACTORS, CASES, TECH = {}, ACTOR = {};
  var state = { actor: 'all', conf: 'all' };
  var CONF_RANK = { 'well-documented': 3, 'reported': 2, 'single-source': 1 };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function year(c) { return parseInt(String(c.date).slice(0, 4), 10); }
  function fmtDate(d) {
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var p = String(d).split('-');
    if (p.length === 1) return p[0];
    if (p.length === 2) return m[+p[1] - 1] + ' ' + p[0];
    return (+p[2]) + ' ' + m[+p[1] - 1] + ' ' + p[0];
  }
  function heat(n) { return n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : n <= 10 ? 4 : 5; }

  function filtered() {
    return CASES.filter(function (c) {
      if (state.actor !== 'all' && c.actor_id !== state.actor) return false;
      if (state.conf === 'well-documented' && c.confidence !== 'well-documented') return false;
      if (state.conf === 'reported' && c.confidence === 'single-source') return false;
      return true;
    });
  }

  /* ---------- case rendering ---------- */
  function caseHTML(c, showActor) {
    var a = ACTOR[c.actor_id];
    var srcs = c.sources.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.publisher) + ': ' + esc(s.title) + '</a>' +
        (s.date ? ' <span style="color:var(--muted)">(' + esc(fmtDate(s.date)) + ')</span>' : '') + '</li>';
    }).join('');
    var tags = c.techniques.map(function (t) {
      return '<span class="tag" title="' + esc(TECH[t] ? TECH[t].name : t) + '">' + esc(t) + '</span>';
    }).join('');
    return '<article class="case">' +
      '<h4>' + esc(c.title) + '</h4>' +
      '<div class="meta">' + (showActor ? esc(a.name) + ' &middot; ' : '') + esc(fmtDate(c.date)) + ' &middot; ' + esc(c.place) +
      ' &middot; <span class="badge ' + esc(c.confidence) + '">' + esc(c.confidence) + '</span>' +
      (a.state_backed ? ' <span class="badge state">state-backed actor</span>' : '') + '</div>' +
      '<p>' + esc(c.description) + '</p>' +
      '<div>' + tags + '</div>' +
      '<ul>' + srcs + '</ul></article>';
  }

  /* ---------- dialog ---------- */
  var lastFocus = null;
  function openDialog(title, sub, body) {
    lastFocus = document.activeElement;
    $('dlg-title').textContent = title;
    $('dlg-sub').innerHTML = sub;
    $('dlg-body').innerHTML = body;
    var d = $('dlg');
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    $('dlg-body').scrollTop = 0;
    $('dlg-close').focus();
  }
  function closeDialog() {
    var d = $('dlg');
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
  }
  function signalsHTML(t) {
    function list(a) { return '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
    return '<p>' + esc(t.summary) + '</p><div class="sig">' +
      '<div class="concern"><h5>Requests that map onto this tactic</h5>' + list(t.signals.concern) + '</div>' +
      '<div class="legit"><h5>Usually legitimate nearby requests</h5>' + list(t.signals.legitimate) + '</div></div>' +
      '<p style="font-size:12.5px;color:var(--muted);margin-top:12px">Category-level reviewer notes, not a policy. The test is whether an answer would give meaningful operational uplift beyond what public reporting already describes.</p>' +
      '<h5 style="margin:14px 0 4px;font:600 13px var(--body)">Techniques</h5><ul>' +
      t.techniques.map(function (x) { return '<li>' + esc(x.id) + ' ' + esc(x.name) + '</li>'; }).join('') + '</ul>';
  }
  function showTactic(t) {
    openDialog(t.id + ' ' + t.name, 'Tactic &middot; AI-content enforcement signals', signalsHTML(t));
  }
  function showTechnique(tid, list) {
    var t = TECH[tid];
    var scope = state.actor === 'all' ? 'all actors' : ACTOR[state.actor].name;
    var sorted = list.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var none = !CASES.some(function (c) { return c.techniques.indexOf(tid) !== -1; });
    var body = sorted.length ? sorted.map(function (c) { return caseHTML(c, true); }).join('') :
      '<p style="color:var(--muted)">' + (none ? 'No case in the dataset is tagged with this technique yet.' : 'No cases in the dataset for this technique under the current filters.') + ' Absence here reflects this curated sample and its sources, not evidence that the behaviour has not occurred.</p>';
    openDialog(tid + ' ' + t.name, esc(t.tactic.name) + ' &middot; ' + sorted.length + ' case' + (sorted.length === 1 ? '' : 's') + ' &middot; ' + esc(scope), body);
  }
  function showCase(c) {
    openDialog(c.title, esc(ACTOR[c.actor_id].name), caseHTML(c, false));
  }

  /* ---------- stats ---------- */
  function renderStats() {
    var srcSet = {};
    CASES.forEach(function (c) { c.sources.forEach(function (s) { srcSet[s.url] = 1; }); });
    var wd = CASES.filter(function (c) { return c.confidence === 'well-documented'; }).length;
    var yrs = CASES.map(year);
    $('stats').innerHTML = [
      [CASES.length, 'documented cases'], [ACTORS.length, 'actors / clusters'], [Object.keys(srcSet).length, 'distinct sources'],
      [wd, 'well-documented'], [Math.min.apply(null, yrs) + '&ndash;' + Math.max.apply(null, yrs), 'years covered']
    ].map(function (s) { return '<div class="stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('');
  }

  /* ---------- matrix ---------- */
  function renderMatrix() {
    var data = filtered();
    var m = $('matrix');
    m.innerHTML = '';
    TAX.tactics.forEach(function (t) {
      var col = el('div', { 'class': 'col' });
      var tacticCount = data.filter(function (c) { return c.techniques.some(function (x) { return x.indexOf('T' + t.id.slice(2) + '.') === 0; }); }).length;
      var h = el('button', { 'class': 'col-head', type: 'button', 'aria-label': t.name + ', ' + tacticCount + ' cases. Show enforcement signals' },
        esc(t.name) + '<small>' + esc(t.id) + ' &middot; ' + tacticCount + ' case' + (tacticCount === 1 ? '' : 's') + '</small>');
      h.addEventListener('click', function () { showTactic(t); });
      col.appendChild(h);
      t.techniques.forEach(function (x) {
        var list = data.filter(function (c) { return c.techniques.indexOf(x.id) !== -1; });
        var none = !CASES.some(function (c) { return c.techniques.indexOf(x.id) !== -1; });
        var b = el('button', { 'class': 'cell', type: 'button', 'data-h': String(heat(list.length)),
          'aria-label': x.id + ' ' + x.name + ': ' + (none ? '0 cases yet' : list.length + ' case' + (list.length === 1 ? '' : 's')) },
          '<span>' + esc(x.name) + '</span><span><span class="tid">' + esc(x.id) + '</span> ' +
          (none ? '<span class="n none">&middot; 0 cases yet</span>' : '<span class="n">&middot; ' + list.length + '</span>') + '</span>');
        b.addEventListener('click', function () { showTechnique(x.id, list); });
        col.appendChild(b);
      });
      var s = el('button', { 'class': 'signals-btn', type: 'button', 'aria-label': 'Enforcement signals for ' + t.name }, 'Signals for AI-content review');
      s.addEventListener('click', function () { showTactic(t); });
      col.appendChild(s);
      m.appendChild(col);
    });
  }

  /* ---------- timeline ---------- */
  function renderTimeline() {
    var ys = CASES.map(year);
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var actors = ACTORS.filter(function (a) { return CASES.some(function (c) { return c.actor_id === a.id; }); });
    function firstOf(a) {
      return CASES.filter(function (c) { return c.actor_id === a.id; }).sort(function (p, q) { return String(p.date).localeCompare(String(q.date)); })[0];
    }
    actors.sort(function (a, b) { return String(firstOf(a).date).localeCompare(String(firstOf(b).date)); });
    var L = 190, R = 20, T = 28, row = 34, W = 960;
    var H = T + actors.length * row + 10;
    var span = (y1 - y0 + 1);
    function x(d) {
      var p = String(d).split('-');
      var frac = p.length > 1 ? (+p[1] - 1) / 12 + (p.length > 2 ? (+p[2] - 1) / 365 : 0.04) : 0.5;
      return L + ((+p[0] - y0 + frac) / span) * (W - L - R);
    }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Timeline of documented cases by actor, ' + y0 + ' to ' + y1 + '">';
    for (var y = y0; y <= y1 + 1; y++) {
      var gx = L + ((y - y0) / span) * (W - L - R);
      svg += '<line class="grid" x1="' + gx + '" x2="' + gx + '" y1="' + (T - 8) + '" y2="' + (H - 6) + '"/>';
      if (y <= y1) svg += '<text x="' + (gx + 4) + '" y="' + (T - 12) + '">' + y + '</text>';
    }
    actors.forEach(function (a, i) {
      var cy = T + i * row + row / 2;
      svg += '<text class="lbl" x="' + (L - 10) + '" y="' + (cy + 4) + '" text-anchor="end">' + esc(a.short || a.name) + '</text>';
      var cs = CASES.filter(function (c) { return c.actor_id === a.id; }).sort(function (p, q) { return String(p.date).localeCompare(String(q.date)); });
      cs.forEach(function (c, j) {
        svg += '<circle class="dot' + (j === 0 ? ' first' : '') + '" data-id="' + esc(c.id) + '" cx="' + x(c.date).toFixed(1) + '" cy="' + cy +
          '" r="6" tabindex="0" role="button" aria-label="' + esc(a.name + ', ' + fmtDate(c.date) + ': ' + c.title) + '"><title>' +
          esc(fmtDate(c.date) + ': ' + c.title) + '</title></circle>';
      });
    });
    svg += '</svg>';
    $('timeline').innerHTML = svg;
    Array.prototype.forEach.call($('timeline').querySelectorAll('circle.dot'), function (d) {
      function go() { showCase(CASES.filter(function (c) { return c.id === d.getAttribute('data-id'); })[0]); }
      d.addEventListener('click', go);
      d.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    var rows = actors.map(function (a) {
      var f = firstOf(a);
      return '<tr><td>' + esc(a.name) + (a.state_backed ? ' <span class="badge state">state-backed</span>' : '') + '</td><td style="white-space:nowrap">' +
        esc(fmtDate(f.date)) + '</td><td>' + esc(f.title) + ' <span class="badge ' + esc(f.confidence) + '">' + esc(f.confidence) + '</span></td><td><a href="' +
        esc(f.sources[0].url) + '" target="_blank" rel="noopener">' + esc(f.sources[0].publisher) + '</a></td></tr>';
    }).join('');
    $('firsts').innerHTML = '<table><thead><tr><th>Actor</th><th>Earliest case</th><th>Case</th><th>Source</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* ---------- actor profiles ---------- */
  function renderActor() {
    var id = $('a-actor').value;
    var a = ACTOR[id];
    var cs = CASES.filter(function (c) { return c.actor_id === id; }).sort(function (p, q) { return String(p.date).localeCompare(String(q.date)); });
    var mini = '<div class="mini" role="group" aria-label="Technique heatmap for ' + esc(a.name) + '">' + TAX.tactics.map(function (t) {
      return '<div class="mcol"><div class="mh" title="' + esc(t.name) + '"><span class="mh-long">' + esc(t.short) + '</span><span class="mh-id">' + esc(t.id) + '</span></div>' + t.techniques.map(function (x) {
        var n = cs.filter(function (c) { return c.techniques.indexOf(x.id) !== -1; }).length;
        return '<button type="button" data-t="' + x.id + '" data-h="' + (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3) + '" title="' + esc(x.id + ' ' + x.name + ': ' + n) +
          '" aria-label="' + esc(x.id + ' ' + x.name + ': ' + n + ' cases') + '">' + (n || '') + '</button>';
      }).join('') + '</div>';
    }).join('') + '</div>';
    var srcSet = {}, srcs = [];
    (a.sources || []).concat([].concat.apply([], cs.map(function (c) { return c.sources; }))).forEach(function (s) {
      if (!srcSet[s.url]) { srcSet[s.url] = 1; srcs.push(s); }
    });
    $('actor').innerHTML = '<div class="actor-grid">' +
      '<div class="card"><h2>' + esc(a.name) + '</h2>' +
      '<div class="meta" style="font-size:13px;color:var(--muted)">' + esc(a.type) + ' &middot; ' + esc(a.region) + (a.state_backed ? ' &middot; <span class="badge state">state-backed</span>' : '') + '</div>' +
      '<p>' + esc(a.summary) + '</p>' + (a.state_note ? '<p style="font-size:13.5px"><b>Sponsor note.</b> ' + esc(a.state_note) + '</p>' : '') +
      '<h3>Technique heatmap</h3>' + mini +
      '<p style="font-size:12px;color:var(--muted);margin-top:6px">Counts of cases in this dataset. Select a square to list them. <span class="mh-key">' + TAX.tactics.map(function (t) { return esc(t.id) + ' ' + esc(t.short); }).join(' &middot; ') + '</span></p>' +
      '<h3>Sources</h3><ol class="srclist">' + srcs.map(function (s) {
        return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.publisher) + ': ' + esc(s.title) + '</a></li>';
      }).join('') + '</ol></div>' +
      '<div class="card"><h3 style="margin-top:0">Cases (' + cs.length + ')</h3>' + cs.map(function (c) { return caseHTML(c, false); }).join('') + '</div></div>';
    Array.prototype.forEach.call($('actor').querySelectorAll('.mini button'), function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-t');
        var prev = state.actor; state.actor = id;
        showTechnique(t, cs.filter(function (c) { return c.techniques.indexOf(t) !== -1; }));
        state.actor = prev;
      });
    });
  }

  /* ---------- tabs ---------- */
  function initTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        $(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
      try { history.replaceState(null, '', '#' + tab.id.replace('tab-', '')); } catch (e) { /* ignore */ }
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); select(tabs[j], true); }
      });
    });
    var h = (location.hash || '').slice(1);
    var start = $('tab-' + h);
    if (start) select(start);
  }

  function init(tax, actors, cases) {
    TAX = tax; ACTORS = actors.actors; CASES = cases.cases;
    TAX.tactics.forEach(function (t) { t.techniques.forEach(function (x) { x.tactic = t; TECH[x.id] = x; }); });
    ACTORS.forEach(function (a) { ACTOR[a.id] = a; });
    var opts = '<option value="all">All actors (' + CASES.length + ')</option>' + ACTORS.map(function (a) {
      var n = CASES.filter(function (c) { return c.actor_id === a.id; }).length;
      return '<option value="' + esc(a.id) + '">' + esc(a.name) + ' (' + n + ')</option>';
    }).join('');
    $('f-actor').innerHTML = opts;
    $('a-actor').innerHTML = ACTORS.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.name) + '</option>'; }).join('');
    $('f-actor').addEventListener('change', function () { state.actor = this.value; renderMatrix(); });
    $('f-conf').addEventListener('change', function () { state.conf = this.value; renderMatrix(); });
    $('a-actor').addEventListener('change', renderActor);
    $('dlg-close').addEventListener('click', closeDialog);
    $('dlg').addEventListener('close', function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
    $('dlg').addEventListener('click', function (e) { if (e.target === this) closeDialog(); });
    renderStats(); renderMatrix(); renderTimeline(); renderActor(); initTabs();
  }

  Promise.all(['data/taxonomy.json', 'data/actors.json', 'data/cases.json'].map(function (u) {
    return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
  })).then(function (d) { init(d[0], d[1], d[2]); }).catch(function (e) {
    $('matrix').innerHTML = '<p>Could not load data (' + esc(e.message) + ').</p>';
  });
})();
