// Conceal or Reveal? Wiring: state, URL hash, figures, panel, case cards and walkthrough.
import { DEFAULTS, KINDS, allEquilibria } from './model.js';
import { drawTypeGrid, drawRegion, bindRegionDrag, drawBayes, AXES, TYPE_COL } from './views.js';
import { buildPanel } from './panel.js';
import { renderCases } from './cases.js';
import { createTour } from './tour.js';
import { legend } from './ui.js';

const P = { ...DEFAULTS };
const S = { ax: 'Vr', eq: 0, hi: null };
const LIM = { b: [0.2, 2], c: [0, 1.2], piH: [0.05, 0.95], piL: [0.01, 0.9], sig: [0, 0.3], V: [0, 2], r: [0, 1], g: [0.02, 0.98], hC: [0.02, 0.98], hO: [0.02, 0.98] };

function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(LIM)) {
    if (!q.has(k)) continue;
    const v = Number(q.get(k));
    if (Number.isFinite(v)) P[k] = Math.max(LIM[k][0], Math.min(LIM[k][1], v));
  }
  if (P.piL >= P.piH) P.piL = Math.max(0.01, P.piH - 0.01);
  if (P.piH + P.sig >= 0.99) P.sig = Math.max(0, 0.99 - P.piH);
  if (AXES[q.get('ax')]) S.ax = q.get('ax');
  const e = Number(q.get('eq'));
  if (Number.isInteger(e) && e >= 0 && e < 16) S.eq = e;
}
function writeHash() {
  const q = new URLSearchParams();
  for (const k of Object.keys(LIM)) q.set(k, String(+P[k].toFixed(3)));
  q.set('ax', S.ax);
  if (S.eq) q.set('eq', String(S.eq));
  history.replaceState(null, '', '#' + q.toString());
}

const stage = document.getElementById('stage'), panelEl = document.getElementById('panel');
stage.innerHTML = `
  <div class="card fig" id="fig-types">
    <div class="fig-h"><p class="eyebrow">The four Sender types and what each does</p><p class="fine">Rows: capability. Columns: intent. Both are private to the Sender.</p></div>
    <div id="cr-grid"></div>
  </div>
  <div class="card fig" id="fig-region">
    <div class="fig-h"><p class="eyebrow">Which equilibrium, by two parameters</p>
      <div class="seg" role="group" aria-label="Axes of the map">
        <button type="button" data-ax="Vr">V and r</button><button type="button" data-ax="sc">σ and c</button><button type="button" data-ax="hh">Priors</button></div></div>
    <svg id="cr-region" class="region" role="img" aria-label="Region map of equilibria. Click or drag to move the current point."></svg>
    <div class="legend" id="cr-legend"></div>
    <p class="fine">Dashed lines are the Proposition 1 boundaries. Where several equilibria exist the map shows the most informative one. Click or drag to move the point.</p>
  </div>
  <div class="card fig" id="fig-bayes">
    <div class="fig-h"><p class="eyebrow">What the Receiver learns from the signal</p><p class="fine">Bar colors match the type grid. The shaded strip is where the Receiver fights.</p></div>
    <svg id="cr-bayes" class="bayes-fig" role="img" aria-label="Prior and posterior beliefs over the four types, and the Receiver's cutoff for fighting"></svg>
    <div class="legend" id="cr-tlegend"></div>
  </div>`;

let region = null, all = [];
const panel = buildPanel(panelEl, P, what => {
  if (what === 'reset') Object.assign(P, DEFAULTS);
  S.eq = 0; changed();
}, i => { S.eq = i; changed(); });

const regionSvg = stage.querySelector('#cr-region');
bindRegionDrag(regionSvg, () => region, (kx, x, ky, y) => { P[kx] = +x.toFixed(3); P[ky] = +y.toFixed(3); S.eq = 0; changed(); });
stage.querySelectorAll('[data-ax]').forEach(b => b.addEventListener('click', () => { S.ax = b.dataset.ax; changed(); }));
legend(stage.querySelector('#cr-legend'), Object.values(KINDS).map(k => [k.col, k.label, k.short]));
legend(stage.querySelector('#cr-tlegend'), [
  [TYPE_COL.HC, 'HC high, coercive'], [TYPE_COL.HO, 'HO high, operational'], [TYPE_COL.LC, 'LC low, coercive'], [TYPE_COL.LO, 'LO low, operational']]);

function render() {
  all = allEquilibria(P);
  if (S.eq >= all.length) S.eq = 0;
  const eq = all[S.eq];
  drawTypeGrid(stage.querySelector('#cr-grid'), P, eq, S.hi);
  region = drawRegion(regionSvg, P, S.ax);
  stage.querySelectorAll('[data-ax]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ax === S.ax)));
  drawBayes(stage.querySelector('#cr-bayes'), P, eq);
  panel.render(all, S.eq);
}
let raf = 0;
function changed() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => { render(); writeHash(); });
}

renderCases(document.getElementById('cases'), cells => {
  S.hi = cells; render();
  document.getElementById('fig-types').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
});

const tour = createTour(document.getElementById('tour-root'), set => {
  Object.assign(P, DEFAULTS, set.P || {});
  S.ax = set.ax || 'Vr'; S.eq = 0; S.hi = set.hi || null;
  changed();
});
document.getElementById('start-tour').addEventListener('click', () => tour.start());
document.getElementById('copy-link').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; } catch (err) { b.textContent = 'Copy the address bar'; }
  setTimeout(() => { b.textContent = 'Copy link to this setup'; }, 1800);
});

let lastW = innerWidth;
addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; changed(); } });

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
