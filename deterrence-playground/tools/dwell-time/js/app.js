// Dwell Time: setup, the turn loop (solo or facilitated), and the after-action report.
import { newGame, step, blocked, encode, decode, replay, clockText, clockAt, turnHours, fill, KINDS, openFlags } from './engine.js';
import { ACTIONS, ROLES, slotsFor, cost } from './actions.js';
import { SCENARIOS, scenarioById } from '../data/scenarios/index.js';
import { SECTORS, sectorById } from '../data/sectors.js';
import { CONTROLS, PRESETS, presetPosture } from '../data/posture.js';
import { SOURCES } from '../data/sources.js';
import { score, PART_LABEL, WEIGHTS } from './score.js';
import { timeline, findings, csfCoverage, report, toCsv } from './aar.js';
import { playPolicy } from './ai.js';
import { learnButton, runLesson, showSheet } from '../../../shared/js/learn.js';
import { lessonSteps, LESSON, SHEET } from './lesson.js';
import { pulse, countUp } from '../../../shared/js/motion.js';
import { escapeHtml as esc } from '../../../shared/js/mapkit.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const show = id => ['setup', 'play', 'end'].forEach(x => { $(x).hidden = x !== id; });
const money = k => (Math.abs(k) >= 1000 ? `$${(k / 1000).toFixed(1)}M` : `$${Math.round(k)}k`);

const setup = { mode: 'solo', scen: SCENARIOS[0].id, sector: 'hospital', preset: 'typical', posture: presetPosture('typical'), seed: newSeed() };
let g = null;   // { s, history: [{acts, note}], picks: [], tab }

/* ======================= Setup ======================= */
const MODES = [
  { id: 'solo', label: 'Solo', k: 'One player', text: 'You sit in every seat. Switch between them with the tabs; each seat has its own question every turn.' },
  { id: 'team', label: 'Facilitated tabletop', k: 'A team, one shared screen', text: 'Project it. Each seat decides for itself, a facilitator runs the clock, can peek at the attacker and takes notes for the report.' },
];
function radioCards(el, items, cur, onPick, draw) {
  el.innerHTML = items.map(x => `<button type="button" role="radio" class="dt-card" aria-checked="${x.id === cur}" data-id="${x.id}">${draw(x)}</button>`).join('');
  el.onclick = e => { const b = e.target.closest('[data-id]'); if (b) { onPick(b.dataset.id); } };
}
function paintSetup() {
  radioCards($('modes'), MODES, setup.mode, id => { setup.mode = id; paintSetup(); }, x => `<span class="k">${x.k}</span><b>${x.label}</b><span>${x.text}</span>`);
  radioCards($('scens'), SCENARIOS, setup.scen, id => { setup.scen = id; paintSetup(); },
    x => `<span class="k">${esc(x.actor)}</span><b>${esc(x.title)}</b><span>${esc(x.tagline)}</span>`);
  radioCards($('sectors'), SECTORS, setup.sector, id => { setup.sector = id; paintSetup(); },
    x => `<span class="k">${esc(x.label)}</span><b>${esc(x.org)}</b><span>${esc(x.blurb)}</span>`);
  const sec = sectorById(setup.sector);
  $('sector-clocks').innerHTML = `<b>Reporting clocks for ${esc(sec.org)}:</b> ${sec.clocks.map(c => `${esc(c.label)} (${c.bdays ? `${c.bdays} business days` : c.hours >= 72 && c.hours % 24 === 0 && c.hours > 72 ? `${c.hours / 24} days` : `${c.hours} hours`})`).join('; ')}.`;
  $('presets').innerHTML = PRESETS.map(p => `<button type="button" role="radio" aria-checked="${p.id === setup.preset}" data-p="${p.id}"><b>${p.label}</b><span>${p.text}</span></button>`).join('')
    + `<button type="button" role="radio" aria-checked="${setup.preset === 'custom'}" data-p="custom" ${setup.preset === 'custom' ? '' : 'hidden'}><b>Custom</b><span>Your own mix of controls.</span></button>`;
  $('presets').onclick = e => { const b = e.target.closest('[data-p]'); if (!b || b.dataset.p === 'custom') return; setup.preset = b.dataset.p; setup.posture = presetPosture(b.dataset.p); paintSetup(); };
  $('controls').innerHTML = CONTROLS.map(c => `<label><input type="checkbox" data-c="${c.id}" ${setup.posture[c.id] ? 'checked' : ''}><b>${c.label}</b><span>${c.text}</span></label>`).join('');
  $('controls').onchange = e => { const c = e.target.dataset.c; if (!c) return; setup.posture[c] = e.target.checked; setup.preset = 'custom'; paintSetup(); };
  $('seed').value = setup.seed;
}
$('seed').addEventListener('change', e => { const v = parseInt(e.target.value, 10); setup.seed = v > 0 ? v : newSeed(); e.target.value = setup.seed; });
$('begin').addEventListener('click', () => start());

function start(history = []) {
  const s0 = newGame({ seed: setup.seed, scen: setup.scen, sector: setup.sector, posture: setup.posture, mode: setup.mode });
  let s = s0; for (const m of history) if (!s.over) s = step(s, m).state;
  g = { s, history: [...history], picks: [], tab: 'ciso', timer: null, left: 600 };
  if (s.over) { endScreen(); return; }
  show('play'); paint(); scrollTo({ top: 0 });
}

/* ======================= Play ======================= */
function nowH() { const sc = scenarioById(g.s.scen); return sc.turns[g.s.t].h; }
function paintBar() {
  const s = g.s, sc = scenarioById(s.scen), sec = sectorById(s.sector);
  const c = clockAt(sc, nowH());
  $('turn-k').textContent = `Turn ${s.t + 1} of ${sc.turns.length} · ${sec.org}`;
  $('clock').textContent = `${c.dow} ${c.hm} · Day ${c.day}`;
  const H = turnHours(sc, s.t);
  $('next-in').textContent = `This turn covers the next ${H < 48 ? `${H} hours` : `${Math.round(H / 24)} days`}.`;
  const gross = Object.values(s.biz.cost).reduce((a, b) => a + b, 0);
  const m = [
    ['Operations', `${s.biz.ops}%`, s.biz.ops, s.biz.ops > 75 ? 'var(--good)' : s.biz.ops > 45 ? 'var(--warn)' : 'var(--bad)'],
    ['Reputation', Math.round(s.biz.rep), s.biz.rep, 'var(--c1)'],
    ['Evidence', Math.round(s.ev), s.ev, 'var(--c3)'],
    ['Spent so far', money(gross), null],
    ['Open alerts', openFlags(s).length, null],
  ];
  $('meters').innerHTML = m.map(([l, v, bar, col]) => `<div class="dt-m"><span>${l}</span><b class="num">${v}</b>${bar != null ? `<span class="bar" aria-hidden="true"><i style="width:${bar}%;background:${col}"></i></span>` : ''}</div>`).join('');
  const h = nowH();
  $('clocks').innerHTML = s.clocks.length ? s.clocks.map(k => {
    if (k.filedH != null) return `<span class="dt-chip ok" title="${esc(k.who)}">✓ ${esc(k.label)}</span>`;
    const left = k.dueH - h;
    const txt = left < 0 ? 'overdue' : left < 48 ? `${Math.round(left)} h left` : `${Math.round(left / 24)} days left`;
    return `<span class="dt-chip ${left < 12 ? 'hot' : 'run'}" title="${esc(k.who)}, due ${esc(clockText(sc, k.dueH))}">${esc(k.label)}: ${txt}</span>`;
  }).join('') : '<span class="dt-chip">No reporting clock running</span>';
}
function itemHtml(x) {
  const role = x.role && x.role !== 'all' ? ROLES.find(r => r.id === x.role)?.label : x.kind === 'result' ? 'Last turn' : 'Everyone';
  const kind = x.kind === 'signal' ? 'Alert' : x.kind === 'inject' ? 'News' : 'Result';
  return `<article class="dt-item ${x.kind}"><h4><span class="who">${kind} · ${esc(role || '')}</span>${esc(x.title)}</h4>
    ${x.text ? `<p>${esc(x.text)}</p>` : ''}${x.art ? `<pre class="dt-art">${esc(x.art)}</pre>` : ''}</article>`;
}
function paintFeed() {
  const s = g.s;
  const fresh = x => x.kind !== 'hidden' && ((x.kind === 'inject' && x.t === s.t) || (x.kind !== 'inject' && (x.t === s.t - 1 || (s.t === 0 && x.t === 0))));
  const now = s.feed.filter(fresh);
  // Results first, then news, then alerts.
  const ord = { result: 0, inject: 1, signal: 2 };
  now.sort((a, b) => ord[a.kind] - ord[b.kind]);
  $('feed').innerHTML = now.length ? now.map(itemHtml).join('') : '<p class="fine">Nothing new.</p>';
  const old = s.feed.filter(x => x.kind !== 'hidden' && !fresh(x) && x.text !== '');
  $('earlier-box').hidden = !old.length;
  $('earlier').innerHTML = old.slice().reverse().map(itemHtml).join('');
}
function paintBoard() {
  const s = g.s;
  const L = { new: 'untriaged', confirmed: 'confirmed', fp: 'false positive', done: 'contained' };
  const rows = [...s.flags].sort((a, b) => ['new', 'confirmed', 'done', 'fp'].indexOf(a.st) - ['new', 'confirmed', 'done', 'fp'].indexOf(b.st));
  $('board').innerHTML = rows.length ? rows.map(x => `<div class="dt-flagrow ${x.st}"><span class="k">${KINDS[x.kind]}</span><span>${esc(x.label)}</span><span class="dt-st ${x.st}">${L[x.st]}</span></div>`).join('')
    : '<p class="fine">No alerts yet.</p>';
}
function usedSlots(picks) {
  const u = {}; for (const id of picks) for (const [r, n] of Object.entries(cost(ACTIONS.find(a => a.id === id)))) u[r] = (u[r] || 0) + n; return u;
}
function canAdd(id) {
  const a = ACTIONS.find(x => x.id === id), sl = slotsFor(g.s), u = usedSlots(g.picks);
  return Object.entries(cost(a)).every(([r, n]) => (u[r] || 0) + n <= sl[r]);
}
function seatHtml(role, team) {
  const s = g.s, sc = scenarioById(s.scen);
  const sl = slotsFor(s), u = usedSlots(g.picks);
  const q = sc.prompts?.[s.t]?.[role.id];
  const acts = ACTIONS.filter(a => a.role === role.id && (!a.scen || a.scen.includes(s.scen)));
  const later = [];
  const rows = acts.map(a => {
    const picked = g.picks.includes(a.id);
    const why = picked ? null : blocked(s, a, g.picks);
    if (why === 'Already done.' || why === 'Not part of this scenario.') return '';
    const full = !picked && !why && !canAdd(a.id);
    const extra = Object.entries(cost(a)).filter(([r]) => r !== role.id).map(([r, n]) => `+${n} ${ROLES.find(x => x.id === r).label}`).join(' ');
    const html = `<button type="button" class="dt-act" title="${esc(fill(a.text, s))}" data-act="${a.id}" aria-pressed="${picked}" ${why || full ? 'disabled' : ''}>
      <span class="box" aria-hidden="true">${picked ? '✓' : ''}</span><b>${esc(fill(a.label, s))}${cost(a)[role.id] > 1 ? `<span class="tag">${cost(a)[role.id]} actions</span>` : ''}${extra ? `<span class="tag">uses ${extra}</span>` : ''}</b>
      <span class="x">${esc(fill(a.text, s))}</span>${why ? `<span class="why">${esc(why)}</span>` : full ? '<span class="why">No actions left for this seat this turn.</span>' : ''}</button>`;
    if (why) { later.push(html); return ''; }
    return html;
  }).join('');
  return `<div class="dt-seat" data-seat="${role.id}"><h3><span>${team ? role.long : role.label}</span><span class="num">${u[role.id] || 0} of ${sl[role.id]} used</span></h3>
    ${q ? `<p class="dt-q">${esc(q)}</p>` : ''}<div class="dt-acts">${rows || '<p class="fine">Nothing this seat can do right now.</p>'}</div>
    ${later.length ? `<details class="dt-more"><summary>${later.length} not available yet</summary><div class="dt-acts">${later.join('')}</div></details>` : ''}</div>`;
}
function paintSeats() {
  const team = g.s.mode === 'team';
  const sl = slotsFor(g.s), u = usedSlots(g.picks);
  $('tabs').hidden = team;
  $('details').hidden = !team;
  $('seats').classList.toggle('terse', team && $('details').getAttribute('aria-pressed') !== 'true');
  $('seats').classList.toggle('team', team);
  if (!team) {
    $('tabs').innerHTML = ROLES.map(r => `<button type="button" role="tab" id="tab-${r.id}" aria-selected="${g.tab === r.id}" aria-controls="seats" tabindex="${g.tab === r.id ? 0 : -1}" data-tab="${r.id}">${r.label}<span class="ct">${u[r.id] || 0}/${sl[r.id]}</span></button>`).join('');
    $('seats').setAttribute('role', 'tabpanel'); $('seats').setAttribute('aria-labelledby', `tab-${g.tab}`);
    $('seats').innerHTML = seatHtml(ROLES.find(r => r.id === g.tab), false);
  } else {
    $('seats').removeAttribute('role');
    $('seats').innerHTML = ROLES.map(r => seatHtml(r, true)).join('');
  }
  const names = g.picks.map(id => fill(ACTIONS.find(a => a.id === id).label, g.s));
  $('chosen').textContent = names.length ? `Chosen: ${names.join(' · ')}` : 'No actions chosen. Ending the turn without acting is allowed, and the attacker will not wait.';
}
$('details').addEventListener('click', () => { const b = $('details'), on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Hide details' : 'Show details'; paintSeats(); });
$('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; g.tab = b.dataset.tab; paintSeats(); $(`tab-${g.tab}`).focus(); });
$('tabs').addEventListener('keydown', e => {
  const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
  e.preventDefault(); const i = ROLES.findIndex(r => r.id === g.tab); g.tab = ROLES[(i + d + ROLES.length) % ROLES.length].id; paintSeats(); $(`tab-${g.tab}`).focus();
});
$('seats').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const id = b.dataset.act;
  if (g.picks.includes(id)) g.picks = g.picks.filter(x => x !== id);
  else if (canAdd(id)) g.picks.push(id);
  // Choices made earlier in the list can make later ones impossible (or possible); drop any that no longer fit.
  g.picks = g.picks.filter(x => !blocked(g.s, ACTIONS.find(a => a.id === x), g.picks.filter(y => y !== x)));
  paintSeats(); paintBar();
  const again = $('seats').querySelector(`[data-act="${id}"]`); if (again) again.focus();
});
function paintFac() {
  const team = g.s.mode === 'team';
  $('fac').hidden = !team;
  if (!team) return;
  $('note').value = '';
  paintPeek();
}
function paintPeek() {
  const s = g.s, sc = scenarioById(s.scen), on = $('peek').getAttribute('aria-pressed') === 'true';
  $('peek-box').hidden = !on;
  if (!on) return;
  const fh = s.adv.fh.filter(f => f.on);
  const known = f => s.flags.some(x => x.fid === f.id && x.st !== 'done' && x.st !== 'fp');
  const next = sc.stages[s.adv.stage];
  $('peek-box').innerHTML = `<b>Hidden from the room.</b> The attacker holds ${fh.length} piece${fh.length === 1 ? '' : 's'} of access; the team has found ${fh.filter(known).length}.
    ${next && !s.adv.finished ? `Its next step: <i>${esc(next.tactic)}</i> (${esc(fill(next.act, s))})` : 'It has finished its plan.'}
    ${s.adv.comms && !s.d.oob ? ' <b>It is reading the team\'s mail and chat.</b>' : ''} ${s.adv.exfil > 0.01 ? ` Data stolen so far: ${Math.round(s.adv.exfil * 100)}%.` : ''}
    <ul>${fh.map(f => `<li>${esc(f.label)} <span class="fine">(${KINDS[f.kind]}${known(f) ? ', found' : ', not found'})</span></li>`).join('') || '<li>None. The attacker is out.</li>'}</ul>`;
}
$('peek').addEventListener('click', () => { const b = $('peek'); b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); b.textContent = b.getAttribute('aria-pressed') === 'true' ? 'Hide the attacker' : 'Peek at the attacker'; paintPeek(); });
function tick() {
  g.left = Math.max(0, g.left - 1);
  const m = Math.floor(g.left / 60), sx = g.left % 60;
  $('timer').textContent = `${m}:${String(sx).padStart(2, '0')}`;
  $('timer').classList.toggle('out', g.left === 0);
  if (g.left === 0) stopTimer();
}
function stopTimer() { clearInterval(g.timer); g.timer = null; $('timer-go').textContent = 'Start timer'; }
$('timer-go').addEventListener('click', () => { if (g.timer) { stopTimer(); return; } g.timer = setInterval(tick, 1000); $('timer-go').textContent = 'Pause'; });
$('timer-reset').addEventListener('click', () => { stopTimer(); g.left = 600; $('timer').textContent = '10:00'; $('timer').classList.remove('out'); });

function paint() {
  paintBar(); paintFac(); paintFeed(); paintBoard(); paintSeats();
  try { history.replaceState(null, '', '#g=' + encodeURIComponent(encode(g.s, g.history))); } catch { /* sandboxed */ }
}
$('end-turn').addEventListener('click', () => {
  if (!g || g.s.over) return;
  const move = { acts: [...g.picks], note: g.s.mode === 'team' ? $('note').value.trim() : '' };
  g.s = step(g.s, move).state; g.history.push(move); g.picks = [];
  if (g.timer) stopTimer();
  if (g.s.over) { try { history.replaceState(null, '', '#g=' + encodeURIComponent(encode(g.s, g.history))); } catch { /* */ } endScreen(); return; }
  paint();
  $('feed-t').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  pulse($('clock'));
});

/* ======================= After-action report ======================= */
function endScreen() {
  const s = g.s, sc = scenarioById(s.scen), sec = sectorById(s.sector);
  show('end');
  const r = score(s);
  $('end-k').textContent = `After-action report · ${sc.title} · ${sec.org}`;
  $('end-t').textContent = r.verdict;
  $('end-x').textContent = `${fill(sc.objective, s)} ${s.remaining.length ? `When the exercise ended, the attacker still had ${s.remaining.length} way${s.remaining.length > 1 ? 's' : ''} in.` : 'When the exercise ended, the attacker was out.'} Exercise code ${s.seed}.`;
  countUp($('total'), r.total, { from: 0 });
  $('parts').innerHTML = Object.keys(WEIGHTS).map(k => `<div class="dt-part"><span>${PART_LABEL[k]} <span class="fine">(${WEIGHTS[k] * 100}%)</span></span>
    <span class="bar" aria-hidden="true"><i style="width:${Math.round(r.parts[k])}%"></i></span><b class="num">${Math.round(r.parts[k])}</b><span class="w">${esc(r.why[k])}</span></div>`).join('');
  const c = s.biz.cost;
  const rows = [['Response (IR firm, counsel, tools)', c.response], ['Recovery and rebuild', c.recovery], ['Downtime', c.downtime], ['Ransom', c.ransom],
    ['Notification', c.notice], ['Litigation reserve', c.litigation], ['Late-filing penalties (notional)', c.fines]].filter(x => x[1] > 0);
  $('money').innerHTML = `<table class="dt-money">${rows.map(([l, v]) => `<tr><td>${l}</td><td>${money(v)}</td></tr>`).join('')}
    <tr><td>Gross</td><td>${money(s.money.gross)}</td></tr><tr><td>Covered by insurance</td><td>−${money(s.money.covered)}</td></tr>
    <tr class="tot"><td>Net cost</td><td>${money(s.money.net)}</td></tr></table>`;
  const setupNow = { seed: s.seed, scen: s.scen, sector: s.sector, posture: s.posture, mode: s.mode };
  const b = score(playPolicy(setupNow, 'textbook'));
  $('bench').textContent = `A computer responder following the textbook (declare early, scope before evicting, move out of band, file on time, never pay) scored ${b.total} on this exact exercise. It sees only what you saw.`;
  const F = findings(s);
  $('findings').innerHTML = F.map(f => `<li class="${f.sev}"><b>${esc(f.title)}<span class="csf">${f.csf}</span></b>${f.text ? `<span>${esc(f.text)}</span>` : ''}${f.rec ? `<div class="rec">${esc(f.rec)}</div>` : ''}</li>`).join('');
  const T = timeline(s);
  $('timeline').innerHTML = `<thead><tr><th>Turn</th><th>The attacker (hidden during play)</th><th>Your team</th></tr></thead><tbody>${T.map(row => `<tr>
    <td class="when">${row.t + 1}<br>${esc(row.clock)}</td>
    <td>${row.adv.length ? `<ul>${row.adv.map(a => `<li class="${a.tip ? 'tip' : ''}">${esc(a.text)} ${a.tech ? `<span class="tech">${esc(a.tech)}</span>` : ''} ${a.ok === false ? '<span class="blk">blocked</span>' : a.seen ? '<span class="seen">seen</span>' : a.seen === false ? '<span class="miss">missed</span>' : ''}</li>`).join('')}</ul>` : '<span class="fine">Quiet.</span>'}</td>
    <td>${row.acts.length ? `<ul>${row.acts.map(a => `<li><b>${ROLES.find(x => x.id === a.role).label}:</b> ${esc(a.label)}</li>`).join('')}</ul>` : '<span class="fine">No action.</span>'}${row.note ? `<p class="fine"><i>Notes: ${esc(row.note)}</i></p>` : ''}</td></tr>`).join('')}</tbody>`;
  $('clocktable').innerHTML = s.clocks.length ? `<thead><tr><th>Obligation</th><th>Started</th><th>Due</th><th>Filed</th><th>Status</th></tr></thead><tbody>${s.clocks.map(k => `<tr>
    <td>${esc(k.label)}<br><span class="fine">${esc(k.who)}</span></td><td class="when">${esc(clockText(sc, k.startH))}, day ${Math.floor(k.startH / 24) + 1}</td>
    <td class="when">${esc(clockText(sc, k.dueH))}, day ${Math.floor(k.dueH / 24) + 1}</td><td class="when">${k.filedH != null ? `${esc(clockText(sc, k.filedH))}, day ${Math.floor(k.filedH / 24) + 1}` : '—'}</td>
    <td>${k.status === 'open' ? 'still open (due after the exercise)' : esc(k.status)}</td></tr>`).join('')}</tbody>` : '<tbody><tr><td>No reporting obligation was triggered.</td></tr></tbody>';
  $('csf').innerHTML = csfCoverage(s).map(fn => `<div class="fn"><h4>${fn.name} (${fn.fn})</h4>${fn.cats.map(c => `<div class="cat ${c.n >= 1 ? 'on' : c.n > 0 ? 'part' : ''}"><code>${c.id}</code>${esc(c.name)}</div>`).join('')}</div>`).join('');
  $('end').focus({ preventScroll: true }); scrollTo({ top: 0 });
}
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const fileBase = () => `dwell-time_${g.s.scen}_${g.s.sector}_${g.s.seed}`;
$('print').addEventListener('click', () => print());
$('json').addEventListener('click', () => download(`${fileBase()}.json`, JSON.stringify(report(g.s), null, 2), 'application/json'));
$('csv').addEventListener('click', () => download(`${fileBase()}.csv`, toCsv(g.s), 'text/csv'));
$('again').addEventListener('click', () => { setup.seed = newSeed(); paintSetup(); show('setup'); try { history.replaceState(null, '', location.pathname); } catch { /* */ } scrollTo({ top: 0 }); });
$('again-same').addEventListener('click', () => start());

/* ======================= Sources, lesson, boot ======================= */
$('sources').innerHTML = Object.values(SOURCES).map(x => `<li>${esc(x.t)}${x.u ? `. <a href="${esc(x.u)}" rel="noopener" target="_blank">Link</a>` : ''}</li>`).join('');

const lessonApi = { get: () => g, tab: id => { if (g) { g.tab = id; paintSeats(); } } };
learnButton($('setup'), {
  slug: 'dwell-time', minutes: 6, sheet: SHEET,
  onStart: () => {
    Object.assign(setup, { mode: 'solo', scen: LESSON.scen, sector: LESSON.sector, preset: 'typical', posture: presetPosture('typical'), seed: LESSON.seed });
    paintSetup(); start();
    runLesson(lessonSteps(lessonApi), { slug: 'dwell-time', title: 'Learn to play' });
  },
});

function boot() {
  const m = location.hash.match(/^#g=(.+)$/);
  if (m) {
    const d = decode(decodeURIComponent(m[1]));
    if (d && SCENARIOS.some(x => x.id === d.setup.scen)) {
      Object.assign(setup, d.setup, { preset: 'custom' });
      paintSetup(); start(d.history); return;
    }
  }
  paintSetup();
}
boot();
export { showSheet };
