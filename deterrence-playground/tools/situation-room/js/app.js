// Situation Room Replay: state, URL hash, filters, view switching and event wiring.
import { MEETINGS, PEOPLE, ADMINS, BY_ID, filterMeetings, esc } from './model.js';
import { renderHeader, renderRoom, renderStrip, renderTurn } from './replay.js';
import { meetingPanel, dossier, summaryPanel, personStats, partners } from './panels.js';
import { drawTimeline, meetingList, peopleList, drawNetwork } from './views.js';
import { renderPatterns } from './patterns.js';
import { createTour } from './tour.js';

document.title = 'Situation Room Replay | Interactive Deterrence';
const $ = id => document.getElementById(id);
const START = '506'; // 21 October 1962: the Cuban Missile Crisis meeting before the quarantine speech
const DEFAULT = { v: 'replay', m: START, i: '', t: -1, p: null, a: '', q: '', c: 'all', nm: 'opp', nn: 28, nw: 2, dim: 'hd', min: 5, sort: 'st', pq: '' };
const S = { ...DEFAULT };
let limit = 40, timer = null;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Hash ----------------------------------------------------------------------------------
const KEYS = { v: 'v', m: 'm', i: 'i', t: 't', p: 'p', a: 'a', q: 'q', c: 'c', nm: 'nm', nn: 'nn', nw: 'nw', dim: 'd', min: 'min' };
function writeHash() {
  const q = new URLSearchParams();
  for (const [k, h] of Object.entries(KEYS)) if (S[k] !== DEFAULT[k] && S[k] !== '' && S[k] != null) q.set(h, S[k]);
  history.replaceState(null, '', q.toString() ? '#' + q : location.pathname + location.search);
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  Object.assign(S, DEFAULT);
  if (['replay', 'timeline', 'people', 'network', 'patterns'].includes(q.get('v'))) S.v = q.get('v');
  if (q.get('m') in BY_ID) S.m = q.get('m');
  const m = MEETINGS[BY_ID[S.m]];
  S.i = m.issues.includes(q.get('i')) ? q.get('i') : (m.issues[0] || '');
  const t = parseInt(q.get('t'), 10);
  S.t = Number.isFinite(t) ? Math.max(0, Math.min(t, m.turns.length - 1)) : m.turns.length - 1;
  const p = parseInt(q.get('p'), 10);
  S.p = Number.isFinite(p) && PEOPLE[p] ? p : null;
  if (ADMINS.includes(q.get('a'))) S.a = q.get('a');
  S.q = (q.get('q') || '').slice(0, 60);
  if (['all', 'issues', '1'].includes(q.get('c'))) S.c = q.get('c');
  if (['opp', 'same'].includes(q.get('nm'))) S.nm = q.get('nm');
  const clamp = (v, lo, hi, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
  S.nn = clamp(q.get('nn'), 10, 50, DEFAULT.nn); S.nw = clamp(q.get('nw'), 1, 6, DEFAULT.nw); S.min = clamp(q.get('min'), 2, 10, DEFAULT.min);
  if (['hd', 'ac', 'fp', 'sp'].includes(q.get('d'))) S.dim = q.get('d');
}

// ---- Rendering -------------------------------------------------------------------------------
const meeting = () => MEETINGS[BY_ID[S.m]];
const view = () => filterMeetings({ admin: S.a, q: S.q, code: S.c });

function renderReplay() {
  const m = meeting();
  const idx = view();
  const sel = $('m-sel');
  const opts = idx.includes(BY_ID[S.m]) ? idx : [BY_ID[S.m], ...idx].sort((a, b) => a - b);
  sel.innerHTML = opts.map(mi => { const x = MEETINGS[mi]; return `<option value="${x.id}">${x.date} · ${esc(x.subj.slice(0, 70))}${x.subj.length > 70 ? '…' : ''}</option>`; }).join('');
  sel.value = S.m;
  const pos = opts.indexOf(BY_ID[S.m]);
  $('m-prev').disabled = pos <= 0; $('m-next').disabled = pos >= opts.length - 1;
  renderHeader(S, m);
  renderRoom(S, m, pid => { S.p = pid; setView('people'); });
  renderStrip(S, m, i => { stop(); S.t = i; update(); });
  renderTurn(S, m);
  $('p-coded').disabled = !S.i;
  $('panel').innerHTML = meetingPanel(S, m);
}

function render() {
  const idx = view();
  $('f-n').textContent = `${idx.length} of ${MEETINGS.length} meetings in view${S.a || S.q || S.c !== 'all' ? ' (filtered)' : ''}.`;
  document.querySelectorAll('#tabs [role=tab]').forEach(b => {
    const on = b.dataset.v === S.v;
    b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1;
    $('view-' + b.dataset.v).hidden = !on;
  });
  if (S.v === 'replay') renderReplay();
  if (S.v === 'timeline') {
    drawTimeline(idx, S.m, openMeeting);
    meetingList(idx, limit, openMeeting);
    $('panel').innerHTML = summaryPanel(idx, S.a || S.q ? 'Meetings in view' : 'All 220 meetings');
  }
  if (S.v === 'people') {
    peopleList(idx, { sort: $('pp-sort').value, q: $('pp-q').value, sel: S.p }, pid => { S.p = pid; update(); });
    $('dossier').innerHTML = dossier(S.p);
    $('panel').innerHTML = S.p == null ? summaryPanel(idx, 'Meetings in view') : personPanel(S.p);
  }
  if (S.v === 'network') {
    $('nw-n-o').textContent = S.nn; $('nw-w-o').textContent = S.nw;
    document.querySelectorAll('#nw-mode .btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S.nm));
    const ne = drawNetwork(idx, { mode: S.nm, n: S.nn, w: S.nw, sel: S.p }, pid => { S.p = pid; update(); });
    $('panel').innerHTML = (S.p == null ? '' : personPanel(S.p)) + `<div class="sec"><p class="fine">${ne} link${ne === 1 ? '' : 's'} drawn. A link joins two people coded on ${S.nm === 'opp' ? 'opposite sides' : 'the same side'} of at least ${S.nw} issue${S.nw > 1 ? 's' : ''} in the meetings in view. Only people who spoke in the same meeting can be linked, so frequent co-attendees dominate. Select a person to isolate their links.</p></div>`;
  }
  if (S.v === 'patterns') {
    $('pt-min-o').textContent = S.min; $('pt-min').value = S.min;
    document.querySelectorAll('#pt-dim .btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S.dim));
    renderPatterns(idx, S, pid => { S.p = pid; setView('people'); });
    $('panel').innerHTML = summaryPanel(idx, S.a || S.q ? 'Meetings in view' : 'All 220 meetings') +
      '<div class="sec"><p class="fine">"With the hawks" and "with the A/C side" compare the President\'s coded side to the coded hawk side or the side fearing it would look soft on communism. They describe where he stood in the meeting record. Whether policy followed is not coded.</p></div>';
  }
  wireLinks();
  writeHash();
}

function personPanel(pid) {
  const { r, agreeRate } = personStats(pid);
  const opp = partners(pid, 'opp')[0];
  return `<div class="sec"><p class="eyebrow">${esc(PEOPLE[pid].n)}</p><dl class="readout"><dt>Meetings</dt><dd>${r.meetings.length}</dd><dt>Issues with a side</dt><dd>${r.stances.filter(s => s.v === 0 || s.v === 1).length}</dd>
    <dt>President matched</dt><dd>${agreeRate == null ? '–' : `${r.agree} of ${r.agree + r.differ}`}</dd><dt>Top opponent</dt><dd>${opp ? `${esc(PEOPLE[opp.other].n)} (${opp.n})` : '–'}</dd></dl>
    <button type="button" class="btn" data-goto-person="${pid}">Open full record</button></div>`;
}

function wireLinks() {
  document.querySelectorAll('.plink').forEach(b => { b.onclick = () => { S.p = +b.dataset.pid; setView('people'); }; });
  document.querySelectorAll('.ilink').forEach(b => { b.onclick = () => openMeeting(b.dataset.m, b.dataset.k); });
  document.querySelectorAll('[data-goto-person]').forEach(b => { b.onclick = () => { S.p = +b.dataset.gotoPerson; setView('people'); }; });
  document.querySelectorAll('#m-issues .ichip').forEach(b => { b.onclick = () => { S.i = b.dataset.k; update(); }; });
}

const update = () => render();
function setView(v) { stop(); S.v = v; render(); $('tab-' + v).focus({ preventScroll: true }); window.scrollTo({ top: $('stage').offsetTop - 8, behavior: reduce ? 'auto' : 'smooth' }); }
function openMeeting(id, k) {
  stop();
  S.m = id; const m = meeting();
  S.i = k && m.issues.includes(k) ? k : (m.issues[0] || '');
  S.t = m.turns.length - 1;
  setView('replay');
}

// ---- Player --------------------------------------------------------------------------------
function stop() { if (timer) { clearInterval(timer); timer = null; } $('p-play').textContent = 'Play'; }
function play() {
  const m = meeting();
  if (timer) { stop(); return; }
  if (S.t >= m.turns.length - 1) S.t = 0;
  $('p-play').textContent = 'Pause';
  update();
  timer = setInterval(() => {
    if (S.t >= meeting().turns.length - 1) { stop(); return; }
    S.t++; update();
  }, reduce ? 1400 : 900);
}

// ---- Controls ------------------------------------------------------------------------------
$('f-admin').innerHTML = '<option value="">All, 1948–1983</option>' + ADMINS.map(a => `<option value="${a}">${a}</option>`).join('');
document.querySelectorAll('#tabs [role=tab]').forEach(b => {
  b.onclick = () => setView(b.dataset.v);
  b.onkeydown = e => {
    const tabs = [...document.querySelectorAll('#tabs [role=tab]')];
    const i = tabs.indexOf(b), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (d) { e.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; setView(n.dataset.v); }
  };
});
$('f-admin').onchange = e => { S.a = e.target.value; limit = 40; update(); };
let qt; $('f-q').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value; limit = 40; update(); }, 200); };
$('f-code').onchange = e => { S.c = e.target.value; update(); };
$('m-sel').onchange = e => openMeeting(e.target.value);
const step = d => { const o = [...$('m-sel').options].map(x => x.value); const i = o.indexOf(S.m) + d; if (o[i]) openMeeting(o[i]); };
$('m-prev').onclick = () => step(-1); $('m-next').onclick = () => step(1);
$('p-play').onclick = play;
$('p-first').onclick = () => { stop(); S.t = 0; update(); };
$('p-back').onclick = () => { stop(); S.t = Math.max(0, S.t - 1); update(); };
$('p-fwd').onclick = () => { stop(); S.t = Math.min(meeting().turns.length - 1, S.t + 1); update(); };
$('p-end').onclick = () => { stop(); S.t = meeting().turns.length - 1; update(); };
$('p-coded').onclick = () => {
  stop(); const m = meeting();
  const n = m.turns.findIndex((t, i) => i > S.t && t[2] && S.i in t[2]);
  S.t = n >= 0 ? n : m.turns.findIndex(t => t[2] && S.i in t[2]);
  update();
};
$('p-range').oninput = e => { stop(); S.t = +e.target.value; update(); };
$('tl-more').onclick = () => { limit += 60; update(); };
$('pp-sort').onchange = update;
$('pp-q').oninput = update;
document.querySelectorAll('#nw-mode .btn').forEach(b => { b.onclick = () => { S.nm = b.dataset.k; update(); }; });
$('nw-n').oninput = e => { S.nn = +e.target.value; update(); };
$('nw-w').oninput = e => { S.nw = +e.target.value; update(); };
document.querySelectorAll('#pt-dim .btn').forEach(b => { b.onclick = () => { S.dim = b.dataset.k; update(); }; });
$('pt-min').oninput = e => { S.min = +e.target.value; update(); };
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Copied'; } catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1500);
};

const tour = createTour($('stage'), set => {
  stop();
  if (set.reset) { Object.assign(S, DEFAULT); $('f-q').value = ''; }
  if (set.m) { S.m = set.m; const m = meeting(); S.i = set.i || m.issues[0] || ''; S.t = set.t ?? m.turns.length - 1; }
  for (const k of ['v', 'a', 'q', 'c', 'nm', 'nn', 'nw', 'dim', 'min', 'p']) if (k in set) S[k] = set[k];
  syncControls(); render();
});
$('tour-btn').onclick = () => tour.start();

function syncControls() {
  $('f-admin').value = S.a; $('f-q').value = S.q; $('f-code').value = S.c;
  $('nw-n').value = S.nn; $('nw-w').value = S.nw;
}
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (S.v === 'replay') render(); }, 150); });
window.addEventListener('hashchange', () => { readHash(); syncControls(); render(); });
readHash(); syncControls(); render();
