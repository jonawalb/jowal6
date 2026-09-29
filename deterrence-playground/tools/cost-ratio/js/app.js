// Cost Ratio Bargaining. Wiring: state, URL hash, figures, panel, case cards and walkthrough.
import { DEFAULTS, cMax } from './model.js';
import { drawLine, bindLineDrag, drawCurve, drawCompare, drawIndex, KMIN, KMAX } from './views.js';
import { buildPanel } from './panel.js';
import { renderCases } from './cases.js';
import { createTour } from './tour.js';
import { dragPlot, clamp } from './ui.js';

document.title = 'Cost Ratio Bargaining | Interactive Deterrence';
const P = { ...DEFAULTS };
const LIM = { p: [0.05, 0.95], C: [0.02, 0.6], k: [KMIN, KMAX], kD: [KMIN, KMAX], kV: [KMIN, KMAX], off: [0, 1], def: [0, 1], exp: [0, 1] };

function fix() {
  for (const k of Object.keys(LIM)) P[k] = clamp(+P[k], LIM[k][0], LIM[k][1]);
  P.C = Math.min(P.C, cMax(P.p));
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(LIM)) if (q.has(k) && Number.isFinite(+q.get(k))) P[k] = +q.get(k);
  fix();
}
function writeHash() {
  const q = new URLSearchParams();
  for (const k of Object.keys(LIM)) q.set(k, String(+P[k].toFixed(3)));
  history.replaceState(null, '', '#' + q.toString());
}

const stage = document.getElementById('stage');
stage.innerHTML = `
  <div class="card fig" id="fig-line">
    <div class="fig-h"><p class="eyebrow">Where the deal lands</p><p class="fine">Drag the dot to move p. Drag anywhere else to move W’s war payoff, which sets κ.</p></div>
    <svg id="cb-line" class="drag" role="img" aria-label="The division of the good: the bargaining range split into W's and S's war costs, and the equilibrium offer x*"></svg>
    <div class="legend"><span class="lg"><i class="lw"></i>W, the weak actor</span><span class="lg"><i class="ls"></i>S, the strong actor</span><span class="lg"><i class="lx"></i>x*, the equilibrium offer</span></div>
  </div>
  <div class="card fig" id="fig-curve">
    <div class="fig-h"><p class="eyebrow">Proposition 3: W’s share rises with κ</p><p class="fine">Shaded band: the bargaining range. Click or drag to set κ.</p></div>
    <svg id="cb-curve" class="drag" role="img" aria-label="W's equilibrium share x* plotted against the cost-exchange ratio kappa on a log scale"></svg>
  </div>
  <div class="card fig" id="fig-compare">
    <div class="fig-h"><p class="eyebrow">Proposition 4: the same dyad, two kinds of war</p><p class="fine">Same p and C; only κ differs.</p></div>
    <svg id="cb-compare" role="img" aria-label="Bargaining ranges and offers in a denial war and in a survival war"></svg>
  </div>
  <div class="card fig" id="fig-index">
    <div class="fig-h"><p class="eyebrow">Section 5: the κ index</p><p class="fine">Set the three parts in the panel. The index orders cases; it does not measure κ.</p></div>
    <svg id="cb-index" role="img" aria-label="The three components of the kappa index and their average"></svg>
  </div>`;

const panel = buildPanel(document.getElementById('panel'), P, (set, how) => update(set === 'reset' ? { ...DEFAULTS } : set, set === 'reset' ? 'Reset to the default example' : how));

let curveF = null;
function render() {
  drawLine(stage.querySelector('#cb-line'), P);
  curveF = drawCurve(stage.querySelector('#cb-curve'), P);
  drawCompare(stage.querySelector('#cb-compare'), P);
  drawIndex(stage.querySelector('#cb-index'), P);
  panel.render();
}
function update(set, how) {
  const prev = { ...P };
  Object.assign(P, set); fix();
  render(); panel.explain(prev, how); writeHash();
}

bindLineDrag(stage.querySelector('#cb-line'), () => P, set => update(set));
dragPlot(stage.querySelector('#cb-curve'), () => curveF, x => update({ k: +clamp(10 ** x, KMIN, KMAX).toFixed(3) }));

renderCases(document.getElementById('cases'), c => {
  update({ k: c.k }, `Loaded ${c.title} at a notional κ = ${c.k}`);
  document.getElementById('fig-line').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
});

const tour = createTour(document.getElementById('tour-root'), (step, how) => {
  update({ ...DEFAULTS, ...step.set }, how);
  if (step.focus) document.getElementById(step.focus).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
});
document.getElementById('start-tour').addEventListener('click', () => tour.start());
document.getElementById('copy-link').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; } catch (err) { b.textContent = 'Copy the address bar'; }
  setTimeout(() => { b.textContent = 'Copy link to this setup'; }, 1800);
});

let lastW = innerWidth;
addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; render(); } });

readHash();
render();
writeHash();

function renderMath() {
  if (!window.renderMathInElement) return false;
  document.querySelectorAll('.below').forEach(node => window.renderMathInElement(node, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false,
  }));
  render();
  return true;
}
if (!renderMath()) window.addEventListener('load', renderMath, { once: true });
