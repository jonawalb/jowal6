// Trust but Verify: state, controls, rendering and URL hash.
import { quotaGame, alarmGame } from './model.js';
import { drawLines, drawTimeline, drawRoc } from './charts.js';
import { createTour } from './tour.js';
import { REGIMES, SOURCES, SOURCE_ORDER } from '../data/regimes.js';
import { addExportBar } from '../../../shared/js/export.js';

const $ = id => document.getElementById(id);
const pct = v => (v > 0 && v < 0.001 ? '<0.1%' : (v < 0.01 && v > 0 ? (v * 100).toFixed(1) : Math.round(v * 100)) + '%');
const f2 = v => v.toFixed(2);

export const FIELDS = {
  b: { n: 'Penalty if caught', sym: 'b', min: 0.2, max: 10, step: 0.1, fmt: f2, help: 'Inspectee\'s loss when a violation is caught, against a gain of 1 for getting away with it.' },
  a: { n: 'Inspector\'s loss from a caught violation', sym: 'a', min: 0.05, max: 0.95, step: 0.05, fmt: f2, help: 'Between 0 (legal throughout) and 1 (an undetected violation). A caught violation still means the treaty failed.' },
  n: { n: 'Periods covered', sym: 'n', min: 2, max: 24, step: 1, fmt: v => String(v), help: 'Stages at which a violation could start, such as months of a year.' },
  m: { n: 'Inspection quota', sym: 'm', min: 0, max: 24, step: 1, fmt: v => String(v), help: 'Inspections allowed across all periods.' },
  dq: { n: 'Chance an inspection catches a violation', sym: 'd', min: 0.3, max: 1, step: 0.05, fmt: pct, help: 'Tool extension. At 100% the game is exactly the published one.' },
  e: { n: 'False-alarm cost to the inspector', sym: 'e', min: 0.02, max: 0.9, step: 0.02, fmt: f2, help: 'Political cost of accusing a compliant party. Must be below 1.' },
  h: { n: 'False-alarm cost to the inspectee', sym: 'h', min: 0.02, max: 5, step: 0.02, fmt: f2, help: 'Cost of being wrongly accused. Held below the penalty b.' },
  s: { n: 'Detection strength', sym: 'd', min: 0.25, max: 4, step: 0.05, fmt: f2, help: 'Size of a violation in units of measurement noise. Larger means a sharper test.' },
};
const DEFAULT = () => ({ mode: 'quota', b: 2, a: 0.5, n: 12, m: 4, dq: 1, e: 0.2, h: 0.3, s: 1.5, sweep: 'b' });
const S = DEFAULT();
let Q = null, G = null;

// ---- Hash --------------------------------------------------------------------------------------
function writeHash() {
  const q = new URLSearchParams({ mode: S.mode, sw: S.sweep });
  Object.keys(FIELDS).forEach(k => q.set(k, +(+S[k]).toFixed(3)));
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (['quota', 'alarm'].includes(q.get('mode'))) S.mode = q.get('mode');
  Object.entries(FIELDS).forEach(([k, f]) => { const v = parseFloat(q.get(k)); if (Number.isFinite(v)) S[k] = Math.max(f.min, Math.min(f.max, v)); });
  if (SWEEPS.some(s => s.k === q.get('sw'))) S.sweep = q.get('sw');
  clampState();
}
function clampState() { S.n = Math.round(S.n); S.m = Math.min(Math.round(S.m), S.n); S.h = Math.min(S.h, +(S.b * 0.95).toFixed(2)); }

// ---- Controls -----------------------------------------------------------------------------------
const sliders = {};
function mountSlider(host, k) {
  const f = FIELDS[k], id = 'sl-' + k;
  const w = document.createElement('div');
  w.className = 'slider';
  w.innerHTML = `<div class="sl-h"><label for="${id}">${f.n} <i class="sym">${f.sym}</i> <span class="notional">notional</span></label><output for="${id}"></output></div>
    <input type="range" id="${id}" min="${f.min}" max="${f.max}" step="${f.step}"><small>${f.help}</small>`;
  host.appendChild(w);
  const input = w.querySelector('input'), out = w.querySelector('output');
  input.addEventListener('input', () => { S[k] = +input.value; clampState(); update(); });
  sliders[k] = { input, set: v => { input.value = v; out.textContent = f.fmt(+v); } };
}
function syncControls() {
  sliders.m.input.max = S.n;
  Object.keys(sliders).forEach(k => sliders[k].set(S[k]));
  document.querySelectorAll('#mode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === S.mode));
  document.body.dataset.mode = S.mode;
}

// ---- Alarm-game sweeps --------------------------------------------------------------------------
const SWEEPS = [
  { k: 'b', n: 'Penalty b', xs: [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 10] },
  { k: 'h', n: 'False-alarm cost to inspectee h', xs: [0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2, 3], cap: true },
  { k: 'e', n: 'False-alarm cost to inspector e', xs: [0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 0.9] },
  { k: 'a', n: 'Inspector\'s loss from a caught violation a', xs: [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9] },
  { k: 's', n: 'Detection strength d', xs: [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4] },
];
const curIdx = (xs, v) => { let i = xs.findIndex(x => x >= v - 1e-9); if (i < 0) return xs.length - 1; if (i === 0) return 0; return i - 1 + (v - xs[i - 1]) / (xs[i] - xs[i - 1]); };
const alarmArgs = T => ({ a: T.a, b: T.b, e: T.e, h: Math.min(T.h, T.b * 0.95), d: T.s });

// ---- Render ------------------------------------------------------------------------------------
function renderQuota() {
  Q = quotaGame({ n: S.n, m: S.m, a: S.a, b: S.b, d: S.dq });
  $('k1').textContent = pct(Q.pViol); $('k1l').textContent = 'Chance the inspectee violates at some point';
  $('k2').textContent = pct(Q.detect); $('k2l').textContent = 'Chance a violation is caught';
  $('k3').textContent = pct(Q.p1); $('k3l').textContent = 'Chance of inspecting in period 1';
  const ms = Array.from({ length: S.n + 1 }, (_, i) => i), runs = ms.map(m => quotaGame({ n: S.n, m, a: S.a, b: S.b, d: S.dq }));
  drawLines($('chart1'), { xs: ms, fmt: String, xl: `Inspection quota m (of ${S.n} periods)`, cur: S.m,
    series: [{ cls: 'l-v', vals: runs.map(r => r.pViol) }, { cls: 'l-d', vals: runs.map(r => r.detect) }, { cls: 'l-c', vals: runs.map(r => r.pCaught) }] });
  drawTimeline($('chart2q'), Q.timeline);
  const st = $('status');
  st.dataset.s = Q.pViol < 0.5 ? 'good' : Q.pViol < 0.9 ? 'warn' : 'bad';
  st.querySelector('b').textContent = `${S.m} inspections over ${S.n} periods`;
  st.querySelector('span').textContent = S.m >= S.n ? (Q.pViol > 0 ? 'Every period is inspected, but inspections miss often enough that violating still pays.' : 'Every period is inspected, so the inspectee stays legal.')
    : S.m === 0 ? 'No inspections: violating is safe.'
    : `The inspectee expects ${f2(Q.V)} (1 = a sure, unpunished violation); the inspector expects ${f2(Q.I)}. Each first-period move is a coin the other side cannot read.`;
}

function renderAlarm() {
  G = alarmGame(alarmArgs(S));
  $('k1').textContent = pct(G.q); $('k1l').textContent = 'Chance the inspectee violates';
  $('k2').textContent = pct(G.detect); $('k2l').textContent = 'Chance a violation is detected';
  $('k3').textContent = pct(G.alpha); $('k3l').textContent = 'False-alarm chance the inspector accepts';
  drawRoc($('chart1'), G);
  const sw = SWEEPS.find(x => x.k === S.sweep);
  const xs = sw.cap ? sw.xs.filter(v => v < S.b * 0.95) : sw.xs;
  const runs = xs.map(v => alarmGame(alarmArgs({ ...S, [sw.k]: v, h: sw.k === 'b' ? Math.min(S.h, v * 0.95) : sw.k === 'h' ? v : S.h })));
  const cur = curIdx(xs, S[sw.k]);
  const qtop = Math.max(...runs.map(r => r.q)), qmax = [0.04, 0.08, 0.2, 0.4, 0.6, 0.8, 1].find(v => v >= qtop - 1e-9) || 1;
  drawLines($('chart2'), { xs, fmt: v => String(v), xl: sw.n, cur, ymax: qmax, series: [{ cls: 'l-v', vals: runs.map(r => r.q) }] });
  drawLines($('chart3'), { xs, fmt: v => String(v), xl: sw.n, cur, series: [{ cls: 'l-d', vals: runs.map(r => r.detect) }, { cls: 'l-f', vals: runs.map(r => r.alpha) }] });
  document.querySelectorAll('#sweep-choices button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S.sweep));
  const st = $('status');
  st.dataset.s = G.q < 0.1 ? 'good' : G.q < 0.3 ? 'warn' : 'bad';
  st.querySelector('b').textContent = `Violation ${pct(G.q)} · detection ${pct(G.detect)}`;
  st.querySelector('span').textContent = `The inspector's alarm threshold is set by the inspectee's stakes (b and h); the inspectee's cheating rate is set by the inspector's (e and a). That is Theorem 3.1.`;
}

function update() {
  syncControls();
  if (S.mode === 'quota') renderQuota(); else renderAlarm();
  writeHash();
}

function renderRegimes() {
  $('regimes').innerHTML = REGIMES.map(r => `<article class="reg">
    <h3>${r.title}</h3><p class="reg-s">${r.status}</p>
    <dl class="facts">${r.facts.map(f => `<div><dt class="num">${f.v}</dt><dd>${f.t}</dd></div>`).join('')}</dl>
    ${r.body ? `<p>${r.body}</p>` : ''}<p class="fine">Sources: ${r.src.map(s => `<a href="${s.u}" target="_blank" rel="noopener">${s.t}</a>`).join(' · ')}</p></article>`).join('');
  $('srclist').innerHTML = SOURCE_ORDER.map(k => `<li>${SOURCES[k]}</li>`).join('');
}

// ---- Boot ----------------------------------------------------------------------------------------
readHash();
['b', 'a'].forEach(k => mountSlider($('shared-sl'), k));
['n', 'm', 'dq'].forEach(k => mountSlider($('quota-sl'), k));
['e', 'h', 's'].forEach(k => mountSlider($('alarm-sl'), k));
$('sweep-choices').innerHTML = SWEEPS.map(s => `<button type="button" data-k="${s.k}">${s.n.split(' ').slice(0, -1).join(' ')}</button>`).join('');
document.querySelectorAll('#sweep-choices button').forEach(b => b.onclick = () => { S.sweep = b.dataset.k; update(); });
document.querySelectorAll('#mode button').forEach(b => b.onclick = () => { S.mode = b.dataset.m; update(); });
renderRegimes();
const tour = createTour($('stage'), set => { Object.assign(S, DEFAULT(), set); clampState(); update(); });
$('tour-btn').onclick = () => tour.start();
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Link copied'; }
  catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1600);
};
$('reset').onclick = () => { tour.stop(); Object.assign(S, DEFAULT()); update(); };
update();
let rz = null;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(update, 120); });
const NOTE = 'Inspection games after Avenhaus, von Stengel & Zamir (2002); all payoffs notional.';
addExportBar($('chart1'), { target: () => $('chart1'), title: () => (S.mode === 'quota' ? 'Violation and detection vs inspection quota' : 'Detection vs false-alarm chance, with equilibrium') + ' (notional)', note: NOTE, where: 'after',
  csv: () => (S.mode === 'quota'
    ? [['quota_m', 'p_violation', 'p_caught_given_violation', 'p_caught'], ...Array.from({ length: S.n + 1 }, (_, m) => { const r = quotaGame({ n: S.n, m, a: S.a, b: S.b, d: S.dq }); return [m, r.pViol.toFixed(4), r.detect.toFixed(4), r.pCaught.toFixed(4)]; })]
    : [['alpha', 'detection'], ...Array.from({ length: 101 }, (_, i) => { const al = (i / 100) ** 2; return [al.toFixed(4), G.roc(al).toFixed(4)]; })]) });
