// Attacking the Update: state, URL hash, panel, and the three figure cards.
import { trajectory, dominanceTable, cell, regionShare, discloseVsReassure, hysteresis, recoverySpread, inoculationSpread } from './experiments.js';
import { drawTrajectory, drawRegion, drawDefenseMap, drawRecovery, dragPlot } from './views.js';
import { actionProb, gainK } from './engine.js';
import { slider, choices, sec, pct, f2 } from './ui.js';
import { FH2, FH3, PAPER } from '../data/params.js';
import { createTour } from './tour.js';
import { KINDS, DEFAULTS } from './state.js';
import { initDetail } from './detail.js';

initDetail();

document.title = 'Attacking the Update | Narrative Tracking';
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
who.classList.add('sec-attack');
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
sl.rhoE.wrap.classList.add('full-only');

const st = sec(panel, 'Result');
st.classList.add('sec-result');
st.insertAdjacentHTML('beforeend', `<div class="status" id="status"><b></b><span></span><small class="fine" id="status-fine"></small></div><dl class="readout full-only" id="read"></dl>
  <div class="bayes full-only"><p class="fine">The first update, with these numbers</p><div id="bayes"></div></div>`);

const world = sec(panel, 'The citizen and the world');
world.classList.add('sec-world', 'full-only');
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
const setDT = segs($('seg-T'), 'dT', FH2.horizons, v => String(v));
const setDE = segs($('seg-E'), 'dE', FH2.decays, v => String(v));
let regF = null;
const moveRegion = (x, y) => { S.rho = +Math.max(0.01, Math.min(100, x)).toPrecision(3); S.tau = +Math.max(0.1, Math.min(10, y)).toFixed(2); changed(); };
dragPlot($('region'), () => regF, moveRegion);
// Keyboard: left/right step the cost ratio by one cell of the paper's 22-point log grid, up/down the stake by 0.5.
keyPlot($('region'), (dx, dy) => moveRegion(S.rho * 10 ** (dx * 4 / 21), S.tau + dy * 0.5));
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
const moveDef = (x, y) => { S.lg = +Math.max(0.1, Math.min(1, Math.round(x * 20) / 20)).toFixed(2); S.b = Math.max(1, Math.min(10, Math.round(y))); changed(); };
dragPlot($('defmap'), () => defF, moveDef);
keyPlot($('defmap'), (dx, dy) => moveDef(S.lg + dx * 0.05, S.b + dy));
function keyPlot(svg, step) {
  const K = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
  svg.addEventListener('keydown', e => { const d = K[e.key]; if (!d) return; e.preventDefault(); step(...d); });
}
const recCache = new Map();
const recFor = (ch, peak) => { const k = ch + peak; if (!recCache.has(k)) recCache.set(k, recoverySpread(ch, peak, 500)); return recCache.get(k); };
let ioSpread = null;

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
  box.querySelector('b').textContent = `Under attack ${pct(aa)} · Undisturbed ${pct(an)}`;
  $('sticky-res').innerHTML = `<b>${K.t}</b> acts on a threat: under attack ${pct(aa)} · undisturbed ${pct(an)}`;
  $('status-fine').textContent = `Chance each citizen puts on the threat being above c = ${f2(S.c)}: the behavior the sender wants to move.`;
  const how = { fear: `which gives threatening news ${f2(S.x)} times its proper weight (λ)`, trust: `which gives reassuring news ${f2(S.x)} times its proper weight (λ)`, anger: `whose confidence is multiplied by κ = ${f2(S.x)} at every step` }[S.kind];
  $('traj-read').innerHTML = S.kind === 'fab'
    ? `<b>Under fabrication ${pct(aa)} · Undisturbed ${pct(an)}.</b> Here the attacker adds a bias b = ${f2(S.x)} to every signal the attacked citizen sees. After ${S.T} signals that citizen believes ${f2(a.mu)} against the undisturbed citizen’s ${f2(n.mu)} (true state θ = ${f2(S.theta)}), and would act on a threat ${pct(aa)} of the time against ${pct(an)}.`
    : `<b>Under attack ${pct(aa)} · Undisturbed ${pct(an)}.</b> Every signal is true (centred on the true state θ = ${f2(S.theta)}), yet after ${S.T} signals the citizen under ${K.t.toLowerCase()}, ${how}, believes ${f2(a.mu)} against the undisturbed citizen’s ${f2(n.mu)}, and would act on a threat ${pct(aa)} of the time against ${pct(an)}. Notional numbers.`;
  box.querySelector('span').textContent = S.kind === 'fab'
    ? `The fabricated bias moves the belief by ${f2(dist)} after ${S.T} signals.`
    : `Every signal was true, yet the attacked belief ends ${f2(dist)} away from the undisturbed one.`;
  $('read').innerHTML = [
    ['Belief, undisturbed', `${f2(n.mu)} ± ${f2(1 / Math.sqrt(n.rho))}`],
    ['Belief, attacked', `${f2(a.mu)} ± ${f2(Math.min(99, 1 / Math.sqrt(a.rho)))}`],
    ['True state θ', f2(S.theta)],
    ['Confidence (precision ρ)', `${f2(n.rho)} vs. ${a.rho > 1e4 ? a.rho.toExponential(1) : f2(a.rho)}`],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  bayesBox(tr);
  // Dominance
  setDT(); setDE();
  const tab = tabFor(S.dE, S.dT);
  regF = drawRegion($('region'), tab, S);
  const c = cell(tab, S.rho, S.tau), tab0 = tabFor(0, S.dT);
  const share = regionShare(tab), share0 = regionShare(tab0), act = regionShare(tab, true), act0 = regionShare(tab0, true);
  const at = `At cost ratio r = ${f2(S.rho)} (higher means fabrication is cheaper) and stake τ = ${f2(S.tau)}`;
  const head = c.quiet ? 'Neither attack pays here.' : c.dom ? 'The weighting attack wins here.' : 'Fabrication wins here.';
  const body = c.quiet
    ? `${at}, the sender’s best weighting move is none (λ* = 1, payoff 0.00), which still beats fabrication (payoff ${f2(c.sigPay)}). The paper counts this cell as a weighting-attack win.`
    : `${at}, the best weight is λ* = ${f2(c.lam)}, paying ${f2(c.lamPay)} against ${f2(c.sigPay)} for fabrication.${c.dom ? ` At λ* it moves the action by ${f2(c.act)} and the mean belief by ${f2(c.mean)}: action and belief move together, so the attack is measurable, not stealthy.` : ''}`;
  $('dom-read').innerHTML = `<p class="why"><b>${head}</b> ${body}</p>
    <p class="why fine-read">By the paper’s count the weighting attack wins on ${pct(share)} of the grid${S.dE > 0 ? `, against ${pct(share0)} with no decay` : ''}. Counting only cells where the sender actually uses it (λ* above 1): ${pct(act)}${S.dE > 0 ? `, against ${pct(act0)} with no decay` : ''}. These are this browser’s rerun at T = ${S.dT}; the paper’s figure, at T = 10, is ${pct(PAPER.regionNoDecay)} with no decay and ${pct(PAPER.regionDecay)} at decay 0.3.</p>`;
  // Defense
  defTabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.d === S.def)));
  ['d', 'r', 'i'].forEach(k => { $('def-' + k).hidden = S.def !== k; });
  dsl.lg.set(S.lg); dsl.b.set(S.b); dsl.peak.set(S.peak);
  if (S.def === 'd') {
    defGrid ??= buildDefGrid();
    defF = drawDefenseMap($('defmap'), defGrid, { lg: S.lg, b: S.b });
    const r = discloseVsReassure(S.lg, S.b);
    $('def-d-read').innerHTML = `<p class="why"><b>${r.reassure > 0.5 && r.disclose > 0.5 ? 'Both leave most of the distortion. ' : ''}Reassurance removes ${pct(1 - r.reassure)}, disclosure ${pct(1 - r.disclose)}.</b> A citizen captured by ten slanted signals holds a belief ${f2(r.before)} from the truth. <b>Disclosure</b> (${S.b} truthful signals at weight λ<sub>g</sub> = ${f2(S.lg)}) leaves ${pct(r.disclose)} of that distortion.
      <b>Reassurance</b> first restores the weight to ${f2(r.lamRestored)}, then sends 3 truthful signals, and leaves ${pct(r.reassure)}. ${r.reassure < r.disclose ? 'Reassurance does better.' : 'Disclosure does as well or better.'}
      This rests on the paper’s assumption that each unit of reassurance budget closes 30% of the gap to full weight. Paper: in the λ<sub>g</sub> &lt; 0.3 band reassurance wins at every budget and disclosure leaves ${pct(PAPER.discloseResidual)} on average.</p>`;
  } else if (S.def === 'r') {
    const fr = hysteresis('fear', S.peak), an2 = hysteresis('anger', S.peak);
    drawRecovery($('recov'), fr, an2);
    const fs = recFor('fear', S.peak), as = recFor('anger', S.peak);
    const lead = fs.mean - as.mean > 0.15 && as.mean < 0.25 ? 'Fear wears off; anger does not.' : `Fear recovers ${pct(fs.mean)}, anger ${pct(as.mean)}.`;
    $('def-r-read').innerHTML = `<p class="why"><b>${lead}</b> After the campaign ends and 80 truthful signals arrive, the fear-captured citizen recovers ${pct(fs.mean)} of the way back on average across ${fs.n} draws (middle 80% of draws: ${pct(fs.p10)} to ${pct(fs.p90)}); the anger-captured citizen recovers ${pct(as.mean)}. The chart shows one draw, in which fear recovers ${pct(fr.recovered)}.
      Anger multiplies confidence at every step, so later truth carries almost no weight. That follows from how the model defines anger; it is an assumption about anger, not a test of it. The paper’s single run: fear ${(PAPER.fearRecovery * 100).toFixed(1)}%, anger ${pct(PAPER.angerRecovery)}.</p>`;
  } else {
    const io = ioSpread ??= inoculationSpread(100), q = io.awareRatio;
    $('def-i-read').innerHTML = `<div class="tablewrap"><table><thead><tr><th>Inoculation</th><th>Error removed, trained channel (fear)</th><th>Error removed, other channel (anger)</th><th>Other / trained</th></tr></thead><tbody>
      <tr><td>Harden the gain (trained on fear)</td><td class="num">${pct(io.harden.own)}</td><td class="num">${pct(io.harden.cross)}</td><td class="num">0 by assumption</td></tr>
      <tr><td>Affect-awareness (both channels)</td><td class="num">${pct(io.aware.own)}</td><td class="num">${pct(io.aware.cross)}</td><td class="num">${f2(q.median)} (${f2(q.p10)} to ${f2(q.p90)})</td></tr></tbody></table></div>
      <p class="why"><b>Both remove only a small share of the citizen’s error. Only affect-awareness reaches the other channel, because the model assumes it damps both.</b> Protection is the share of the citizen’s total error (attack plus ordinary noise) removed, averaged over ${q.n} draws. Hardening gives the untrained channel zero protection by assumption, so its 0 is an input, not a finding. Affect-awareness is assumed to damp both channels; its other/trained ratio has median ${f2(q.median)} across draws, with the middle 80% from ${f2(q.p10)} to ${f2(q.p90)}. The paper’s single run: ${f2(PAPER.hardenRatio)} and ${f2(PAPER.awareRatio)}.</p>
      <p class="fine full-only">Assumed efficacies: hardening ${FH3.protOwn} on its own channel, affect-awareness ${FH3.protPhi} on both (the paper’s choices).</p>`;
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

// The walkthrough snapshots the user's settings and restores them when it ends or is closed. It never touches the detail mode.
let saved = null;
const tour = createTour($('tour-root'), set => { Object.assign(S, set); rebuildX(); changed(); }, {
  onStart: () => { saved ??= { ...S }; document.body.classList.add('touring'); },
  onStop: () => { document.body.classList.remove('touring'); if (!saved) return; Object.assign(S, saved); saved = null; rebuildX(); changed(); },
});
// Phone result bar appears only once Card A (which carries the same result) has scrolled out of view above.
// (A scroll check, not IntersectionObserver: a jump scroll past Card A never reports a crossing.)
let stickyRaf = 0;
const syncSticky = () => { stickyRaf = 0; document.body.classList.toggle('show-sticky', $('card-a').getBoundingClientRect().bottom < 0); };
addEventListener('scroll', () => { stickyRaf ||= requestAnimationFrame(syncSticky); }, { passive: true });
syncSticky();
$('sticky-res').addEventListener('click', () => $('card-a').scrollIntoView({ block: 'start' }));
// "Presenting this in 3 minutes": one click sets each demo state and scrolls to its card.
const DEMO = [
  { set: { kind: 'fear' }, card: 'card-a' },
  { set: { kind: 'anger' }, card: 'card-a' },
  { set: { kind: 'fear', rho: 0.1, tau: 5, dT: 20, dE: 0 }, card: 'card-b' },
  { set: { kind: 'fear', def: 'r', peak: 1 }, card: 'card-c' },
];
document.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => {
  const d = DEMO[+b.dataset.demo];
  Object.assign(S, DEFAULTS, KINDS[d.set.kind].preset, d.set); rebuildX(); changed();
  $(d.card).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}));
$('start-tour').addEventListener('click', () => tour.start());
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
