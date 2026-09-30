// Humiliation to Motivation. Wiring: state, URL hash, figures, panel, case cards and walkthrough.
import { DEFAULTS, KINDS, equilibria, fix } from './model.js';
import { drawTree, drawRegion, drawInfo, toMap, LAM_MAX } from './views.js';
import { buildPanel } from './panel.js';
import { renderCases } from './cases.js';
import { createTour } from './tour.js';
import { dragPlot, legend, clamp } from './ui.js';

document.title = 'Humiliation to Motivation | Interactive Deterrence';
const P = { ...DEFAULTS };
const S = { eq: 0 };
const LIM = { s: [0, 1], lam: [0, LAM_MAX], a0: [0.2, 5], pi: [0.02, 0.98], pH: [0.05, 0.99], pL: [0.01, 0.95], v: [0.2, 3], l: [0.1, 3], k: [0.02, 1.5], w: [0.1, 3], d: [0.1, 3], kD: [0.02, 2] };

function clampAll(key) {
  for (const k of Object.keys(LIM)) P[k] = clamp(+P[k], LIM[k][0], LIM[k][1]);
  fix(P, key);
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(LIM)) if (q.has(k) && Number.isFinite(+q.get(k))) P[k] = +q.get(k);
  const e = Number(q.get('eq'));
  if (Number.isInteger(e) && e >= 0 && e < 4) S.eq = e;
  clampAll();
}
function writeHash() {
  const q = new URLSearchParams();
  for (const k of Object.keys(LIM)) q.set(k, String(+P[k].toFixed(3)));
  if (S.eq) q.set('eq', String(S.eq));
  history.replaceState(null, '', '#' + q.toString());
}

const stage = document.getElementById('stage');
stage.innerHTML = `
  <div class="card fig" id="fig-tree">
    <div class="fig-h"><p class="eyebrow">The game, with the current payoffs</p><p class="fine">N draws H’s type; H accommodates (A) or challenges (C); D concedes (K) or resists (R).</p></div>
    <svg id="hm-tree" role="img" aria-label="Extensive-form game tree with current payoffs and the equilibrium path highlighted"></svg>
  </div>
  <div class="card fig" id="fig-region">
    <div class="fig-h"><p class="eyebrow">Which equilibrium, by severity and legitimacy</p><p class="fine">Dashed lines: s̲ and s̄. Click or drag to move the point.</p></div>
    <svg id="hm-region" class="region" role="img" aria-label="Map of equilibria over humiliation severity and legitimacy. Click or drag to move the current point."></svg>
    <div class="legend" id="hm-legend"></div>
  </div>
  <div class="card fig" id="fig-info">
    <div class="fig-h"><p class="eyebrow">Proposition 5: what a challenge tells D</p><p class="fine">Information in bits as severity rises, other values fixed.</p></div>
    <svg id="hm-info" role="img" aria-label="Information carried by a challenge, plotted against humiliation severity"></svg>
  </div>`;
legend(stage.querySelector('#hm-legend'), ['sep', 'trap', 'poolK', 'acc', 'none'].map(k => [KINDS[k].col, KINDS[k].label, KINDS[k].short]));

let all = [], regionF = null;
const panel = buildPanel(document.getElementById('panel'), P,
  (set, how, key) => update(set === 'reset' ? { ...DEFAULTS } : set, set === 'reset' ? 'Reset to the default example' : how, key),
  i => { S.eq = i; render(); writeHash(); });

function render() {
  all = equilibria(P);
  if (S.eq >= all.length) S.eq = 0;
  const eq = all[S.eq];
  drawTree(stage.querySelector('#hm-tree'), P, eq);
  regionF = drawRegion(stage.querySelector('#hm-region'), P);
  drawInfo(stage.querySelector('#hm-info'), P);
  panel.render(all, S.eq);
}
function update(set, how, key) {
  const prev = { ...P }, prevKind = all[S.eq]?.kind || 'none';
  Object.assign(P, set); clampAll(key);
  S.eq = 0;
  render();
  panel.explain(prev, prevKind, all[0]?.kind || 'none', how, key);
  writeHash();
}

dragPlot(stage.querySelector('#hm-region'), () => regionF, (x, y) => update(toMap(x, y)));

renderCases(document.getElementById('cases'), c => {
  update({ ...DEFAULTS, s: c.s, lam: c.lam }, `Placed ${c.title} at a notional s = ${c.s}, λ = ${c.lam}, other values at their defaults`);
  document.getElementById('fig-region').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
});

const tour = createTour(document.getElementById('tour-root'), (step, how) => {
  update({ ...DEFAULTS, ...step.set }, how);
  if (step.focus) document.getElementById(step.focus).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
});
document.getElementById('start-tour').addEventListener('click', () => tour.start());

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
