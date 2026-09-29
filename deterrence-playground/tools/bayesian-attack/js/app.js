// Attacking the Update: state, URL hash, panel, and the three figure cards.
import { trajectory, dominanceTable, cell, regionShare, discloseVsReassure, hysteresis, inoculation } from './experiments.js';
import { drawTrajectory, drawRegion, drawDefenseMap, drawRecovery, dragPlot } from './views.js';
import { actionProb, gainK } from './engine.js';
import { slider, choices, sec, pct, f2 } from './ui.js';
import { FH2, FH3, PAPER } from '../data/params.js';
import { createTour } from './tour.js';
import { KINDS, DEFAULTS } from './state.js';

document.title = 'Attacking the Update | Interactive Deterrence';
const S = { ...DEFAULTS };
const LIM = { mu0: [-2, 2], theta: [-2, 2], rho0: [0.2, 5], rhoS: [0.2, 5], x: [0, 4], rhoE: [0, 0.5], T: [2, 50], c: [-2, 2], seed: [1, 9999], rho: [0.01, 100], tau: [0.1, 10], dT: [1, 50], dE: [0, 0.5], lg: [0.1, 1], b: [1, 10], peak: [0.1, 1] };
const INT = new Set(['T', 'seed', 'dT', 'b']);

function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(DEFAULTS)) {
    if (!q.has(k)) continue;
    const raw = q.get(k);
    if (k === 'kind') { if (KINDS[raw]) S.kind = raw; continue; }
    if (k === 'def') { if (['d', 'r', 'i'].includes(raw)) S.def = raw; continue; }
    const v = Number(raw);
    if (Number.isFinite(v) && LIM[k]) S[k] = Math.max(LIM[k][0], Math.min(LIM[k][1], INT.has(k) ? Math.round(v) : v));
  }
  if (q.has('kind') && !q.has('x')) Object.assign(S, KINDS[S.kind].preset);
  const xr = KINDS[S.kind].x; S.x = Math.max(xr[0], Math.min(xr[1], S.x));
  if (!FH2.horizons.includes(S.dT)) S.dT = 20;
  if (!FH2.decays.includes(S.dE)) S.dE = 0;
}
function writeHash() {
  const q = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS)) q.set(k, String(typeof S[k] === 'number' ? +S[k].toFixed(3) : S[k]));
  history.replaceState(null, '', '#' + q.toString());
}
const $ = id => document.getElementById(id);

// ---------- Panel ----------
const panel = $('panel');
const who = sec(panel, 'The attack');
const kindPick = choices(who, Object.entries(KINDS).map(([v, k]) => ({ v, t: k.t, s: k.s })), S.kind, v => { S.kind = v; Object.assign(S, KINDS[v].preset); rebuildX(); changed(); }, 'Attack type');
const xWrap = document.createElement('div'); who.appendChild(xWrap);
let xs = null;
function rebuildX() {
  xWrap.innerHTML = '';
  const k = KINDS[S.kind];
  xs = slider(xWrap, { key: 'x', label: k.lab, math: k.sym, min: k.x[0], max: k.x[1], step: k.x[2] }, S.x, v => { S.x = v; changed(); });
}
rebuildX();
const sl = {};
const add = (parent, key, spec) => { sl[key] = slider(parent, { key, ...spec }, S[key], v => { S[key] = v; changed(); }); };
add(who, 'rhoE', { label: 'Decay of the emotion per signal', math: 'ρ<sub>e</sub>', min: 0, max: 0.5, step: 0.01, help: 'Affect fades: λ<sub>t</sub> = 1 + (λ − 1)(1 − ρ<sub>e</sub>)<sup>t</sup>. Fabrication does not decay.' });

const st = sec(panel, 'Result');
st.insertAdjacentHTML('beforeend', `<div class="status" id="status"><b></b><span></span></div><dl class="readout" id="read"></dl>
  <div class="bayes"><p class="fine">The first update, with these numbers</p><div id="bayes"></div></div>`);

const world = sec(panel, 'The citizen and the world');
add(world, 'mu0', { label: 'Prior belief', math: 'μ<sub>0</sub>', min: -2, max: 2, step: 0.05, help: 'Where the citizen starts. Higher means more threat.' });
add(world, 'rho0', { label: 'Prior confidence', math: 'ρ<sub>0</sub>', min: 0.2, max: 5, step: 0.05 });
add(world, 'theta', { label: 'True state', math: 'θ', min: -2, max: 2, step: 0.05, help: 'What the signals are centred on. Every signal is true unless the attack is fabrication.' });
add(world, 'rhoS', { label: 'Signal precision', math: 'ρ<sub>s</sub>', min: 0.2, max: 5, step: 0.05 });
add(world, 'T', { label: 'Signals received', math: 'T', min: 2, max: 50, step: 1, fmt: v => String(v) });
add(world, 'c', { label: 'Acts on a threat above', math: 'c', min: -2, max: 2, step: 0.05, help: 'The citizen’s action is P(θ > c). The paper uses c = 0.' });
world.insertAdjacentHTML('beforeend', `<div class="row"><button type="button" class="btn" id="new-draw">New signal draw</button><span class="fine" id="seed-l"></span></div>`);
$('new-draw').addEventListener('click', () => { S.seed = (S.seed * 48271) % 9973 + 1; changed(); });

// ---------- Card B: dominance ----------
const segs = (host, key, opts, fmt) => {
  host.innerHTML = opts.map(v => `<button type="button" data-v="${v}">${fmt(v)}</button>`).join('');
  host.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S[key] = +b.dataset.v; changed(); }));
  return () => host.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === S[key])));
};
const setDT = segs($('seg-T'), 'dT', FH2.horizons, v => `T = ${v}`);
const setDE = segs($('seg-E'), 'dE', FH2.decays, v => `ρe = ${v}`);
let regF = null;
dragPlot($('region'), () => regF, (x, y) => {
  S.rho = +Math.max(0.01, Math.min(100, x)).toPrecision(3); S.tau = +Math.max(0.1, Math.min(10, y)).toFixed(2); changed();
});
const tabCache = new Map();
const tabFor = (e, T) => { const k = e + '|' + T; if (!tabCache.has(k)) tabCache.set(k, dominanceTable(e, T)); return tabCache.get(k); };

// ---------- Card C: defense ----------
const defTabs = [...document.querySelectorAll('#def-tabs button')];
defTabs.forEach(b => b.addEventListener('click', () => { S.def = b.dataset.d; changed(); }));
const dsl = {};
dsl.lg = slider($('def-ctl-d'), { key: 'lg', label: 'Captured weight on evidence', math: 'λ<sub>g</sub>', min: 0.1, max: 1, step: 0.05 }, S.lg, v => { S.lg = v; changed(); });
dsl.b = slider($('def-ctl-d'), { key: 'b', label: 'Government budget', min: 1, max: 10, step: 1, fmt: v => String(v) }, S.b, v => { S.b = v; changed(); });
dsl.peak = slider($('def-ctl-r'), { key: 'peak', label: 'Campaign peak intensity', min: 0.1, max: 1, step: 0.05, help: 'At 1, fear reaches λ = 3 and anger κ = 10, as in the paper.' }, S.peak, v => { S.peak = v; changed(); });
let defF = null, defGrid = null;
dragPlot($('defmap'), () => defF, (x, y) => { S.lg = +Math.max(0.1, Math.min(1, Math.round(x * 20) / 20)).toFixed(2); S.b = Math.max(1, Math.min(10, Math.round(y))); changed(); });

// ---------- Render ----------
function render() {
  kindPick.set(S.kind); xs.set(S.x);
  for (const k of Object.keys(sl)) sl[k].set(S[k]);
  $('seed-l').textContent = `Draw ${S.seed}`;
  const tr = trajectory(S);
  drawTrajectory($('traj'), tr, S);
  const K = KINDS[S.kind];
  $('traj-leg').innerHTML = `<span class="lg"><i class="k neu"></i>Undisturbed citizen</span><span class="lg"><i class="k att"></i>Citizen under ${K.t.toLowerCase()}</span>
    <span class="lg"><i class="k dot"></i>${S.kind === 'fab' ? 'True signals (the attacked citizen sees each one shifted by b)' : 'Signals (all true)'}</span><span class="lg"><i class="k band"></i>±1 standard deviation</span>`;
  const n = tr.neu.at(-1), a = tr.att.at(-1);
  const an = actionProb(n, S.c), aa = actionProb(a, S.c);
  const dist = a.mu - n.mu;
  const box = $('status');
  box.dataset.s = Math.abs(aa - an) < 0.1 ? 'good' : Math.abs(aa - an) < 0.3 ? 'warn' : 'bad';
  box.querySelector('b').textContent = `Acts on a threat: ${pct(aa)} vs. ${pct(an)}`;
  box.querySelector('span').textContent = S.kind === 'fab'
    ? `The fabricated bias moves the belief by ${f2(dist)} after ${S.T} signals.`
    : `Every signal was true, yet the attacked belief ends ${f2(dist)} away from the undisturbed one.`;
  $('read').innerHTML = [
    ['Belief, undisturbed', `${f2(n.mu)} ± ${f2(1 / Math.sqrt(n.rho))}`],
    ['Belief, attacked', `${f2(a.mu)} ± ${f2(Math.min(99, 1 / Math.sqrt(a.rho)))}`],
    ['True state θ', f2(S.theta)],
    ['Posterior precision', `${f2(n.rho)} vs. ${a.rho > 1e4 ? a.rho.toExponential(1) : f2(a.rho)}`],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  bayesBox(tr);
  // Dominance
  setDT(); setDE();
  const tab = tabFor(S.dE, S.dT);
  regF = drawRegion($('region'), tab, S);
  const c = cell(tab, S.rho, S.tau), share = regionShare(tab), share0 = regionShare(tabFor(0, S.dT));
  $('dom-read').innerHTML = `<p class="why"><b>${c.dom ? 'The weighting attack wins here.' : 'Fabrication wins here.'}</b> At ρ = ${f2(S.rho)} and τ = ${f2(S.tau)} the best gain is λ* = ${f2(c.lam)}, paying ${f2(c.lamPay)} against ${f2(c.sigPay)} for fabrication.
    The weighting attack wins on ${pct(share)} of the paper’s grid${S.dE > 0 ? `, against ${pct(share0)} with no decay` : ''}. At λ* it moves the action by ${f2(c.act)} and the mean belief by ${f2(c.mean)}: action and belief move together, so the attack is measurable, not stealthy.</p>`;
  // Defense
  defTabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.d === S.def)));
  ['d', 'r', 'i'].forEach(k => { $('def-' + k).hidden = S.def !== k; });
  dsl.lg.set(S.lg); dsl.b.set(S.b); dsl.peak.set(S.peak);
  if (S.def === 'd') {
    defGrid ??= buildDefGrid();
    defF = drawDefenseMap($('defmap'), defGrid, { lg: S.lg, b: S.b });
    const r = discloseVsReassure(S.lg, S.b);
    $('def-d-read').innerHTML = `<p class="why">A citizen captured by ten slanted signals holds a belief ${f2(r.before)} from the truth. <b>Disclosure</b> (${S.b} truthful signals at weight λ<sub>g</sub> = ${f2(S.lg)}) leaves ${pct(r.disclose)} of that distortion.
      <b>Reassurance</b> first restores the weight to ${f2(r.lamRestored)}, then sends 3 truthful signals, and leaves ${pct(r.reassure)}. ${r.reassure < r.disclose ? 'Reassurance does better.' : 'Disclosure does as well or better.'}
      Paper: in the λ<sub>g</sub> &lt; 0.3 band reassurance wins at every budget and disclosure leaves ${pct(PAPER.discloseResidual)}.</p>`;
  } else if (S.def === 'r') {
    const fr = hysteresis('fear', S.peak), an2 = hysteresis('anger', S.peak);
    drawRecovery($('recov'), fr, an2);
    $('def-r-read').innerHTML = `<p class="why">After the campaign ends and 80 truthful signals arrive, the fear-captured citizen recovers ${pct(fr.recovered)} of the way back and the anger-captured citizen ${pct(an2.recovered)}. Anger multiplies precision at every step, so later truth carries almost no weight. Paper, one draw: fear ${pct(PAPER.fearRecovery)}, anger ${pct(PAPER.angerRecovery)}.</p>`;
  } else {
    const io = inoculation();
    $('def-i-read').innerHTML = `<div class="tablewrap"><table><thead><tr><th>Inoculation</th><th>Protects the trained channel</th><th>Protects the other channel</th><th>Ratio</th></tr></thead><tbody>
      <tr><td>Harden the gain (trained on fear)</td><td class="num">${pct(io.harden.own)}</td><td class="num">${pct(io.harden.cross)}</td><td class="num">${f2(io.harden.ratio)}</td></tr>
      <tr><td>Affect-awareness (both channels)</td><td class="num">${pct(io.aware.own)}</td><td class="num">${pct(io.aware.cross)}</td><td class="num">${f2(io.aware.ratio)}</td></tr></tbody></table></div>
      <p class="why">Protection is the share of the attack’s distortion removed. Hardening the gain against fear does nothing against anger; teaching people to notice their own arousal transfers. Paper: ratios ${f2(PAPER.hardenRatio)} and ${f2(PAPER.awareRatio)}. Efficacies ${FH3.protOwn} and ${FH3.protPhi} are the paper’s assumptions.</p>`;
  }
}

function buildDefGrid() {
  const out = [];
  for (let i = 0; i < 19; i++) for (let b = 1; b <= 10; b++) { const lg = +(0.1 + 0.05 * i).toFixed(2); out.push({ lg, b, ...discloseVsReassure(lg, b) }); }
  return out;
}

function bayesBox(tr) {
  const s = tr.sig[0], d = s - S.mu0, k = KINDS[S.kind];
  let lam = 1, sUsed = s;
  if (S.kind === 'fear' && d >= 0) lam = S.x;
  if (S.kind === 'trust' && d < 0) lam = S.x;
  if (S.kind === 'fab') { sUsed = s + S.x; }
  const dU = sUsed - S.mu0, K1 = gainK(1, S.rho0, S.rhoS), Kl = gainK(lam, S.rho0, S.rhoS);
  const mu = S.mu0 + Kl * dU;
  $('bayes').innerHTML = `<p class="eq">δ = s<sub>1</sub> − μ<sub>0</sub> = ${f2(sUsed)} − ${f2(S.mu0)} = <b>${f2(dU)}</b></p>
    <p class="eq">K(λ) = λρ<sub>s</sub> / (ρ<sub>0</sub> + λρ<sub>s</sub>) = <b>${f2(Kl)}</b> <span class="fine">(undisturbed: ${f2(K1)})</span></p>
    <p class="eq">μ<sub>1</sub> = μ<sub>0</sub> + K·δ = <b>${f2(mu)}</b>${S.kind === 'anger' ? `, with precision × κ = ${f2(S.x)}` : ''}</p>
    <p class="fine">${S.kind === 'fear' ? (d >= 0 ? 'This signal raised the threat, so fear applies λ.' : 'This signal lowered the threat, so fear leaves it alone (λ = 1).')
      : S.kind === 'trust' ? (d < 0 ? 'This signal was reassuring, so distrust applies λ.' : 'This signal raised the threat, so it gets full weight.')
      : S.kind === 'anger' ? 'Anger leaves the gain alone and inflates confidence instead.' : 'Fabrication leaves the gain alone and shifts the signal.'}</p>`;
}

function changed() { render(); writeHash(); }

const tour = createTour($('tour-root'), set => { Object.assign(S, set); rebuildX(); changed(); });
$('start-tour').addEventListener('click', () => tour.start());
$('copy-link').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; }
  catch (err) { b.textContent = 'Copy the address bar'; }
  setTimeout(() => { b.textContent = 'Copy link to this setup'; }, 1800);
});
$('reset').addEventListener('click', () => { Object.assign(S, DEFAULTS); rebuildX(); changed(); });

readHash(); rebuildX(); changed();
let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(render, 150); });
function renderMath() {
  if (!window.renderMathInElement) return false;
  document.querySelectorAll('.below').forEach(node => window.renderMathInElement(node, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }));
  return true;
}
if (!renderMath()) window.addEventListener('load', renderMath, { once: true });
