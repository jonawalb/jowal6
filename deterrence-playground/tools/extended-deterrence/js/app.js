// Extended Deterrence: state, URL hash, figures, panel, real-world panel and walkthrough.
import { DEFAULTS, DEVICES, LIMITS } from './model.js';
import { drawWaterfall, drawBonn, drawFrontier } from './views.js';
import { buildPanel } from './panel.js';
import { renderWorld } from './world.js';
import { createTour } from './tour.js';

const freshParams = () => DEVICES.map(d => ({ id: d.id, name: d.name, short: d.short, a: d.a, s: d.s, t: d.t, d: d.d }));
const S = { ...DEFAULTS, dev: { ...DEFAULTS.dev }, params: freshParams() };
const PK = ['a', 's', 't', 'd'];

function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  for (const k of ['w', 'kC']) {
    const v = Number(q.get(k));
    if (q.has(k) && Number.isFinite(v)) S[k] = Math.max(LIMITS[k][0], Math.min(LIMITS[k][1], v));
  }
  if (q.has('scr')) S.screen = q.get('scr') === '1' ? 1 : 0;
  if (q.has('dev')) { const m = parseInt(q.get('dev'), 10); if (m >= 0 && m < 16) DEVICES.forEach((d, i) => { S.dev[d.id] = (m >> i) & 1; }); }
  if (q.has('p')) {
    const v = q.get('p').split(',').map(Number);
    if (v.length === 16 && v.every(x => Number.isFinite(x) && x >= 0 && x <= 1)) S.params.forEach((p, i) => PK.forEach((k, j) => { p[k] = v[i * 4 + j]; }));
  }
}
function writeHash() {
  const q = new URLSearchParams();
  q.set('w', String(+S.w.toFixed(3))); q.set('kC', String(+S.kC.toFixed(3)));
  q.set('dev', String(DEVICES.reduce((m, d, i) => m | ((S.dev[d.id] ? 1 : 0) << i), 0)));
  q.set('scr', String(S.screen));
  const base = freshParams();
  if (S.params.some((p, i) => PK.some(k => p[k] !== base[i][k]))) q.set('p', S.params.flatMap(p => PK.map(k => +p[k].toFixed(2))).join(','));
  history.replaceState(null, '', '#' + q.toString());
}

const stage = document.getElementById('stage');
stage.innerHTML = `
  <div class="card fig">
    <div class="fig-h"><p class="eyebrow">Credibility, device by device</p><p class="fine">Pr(the patron fights if the ally is attacked). Devices are added in the order listed.</p></div>
    <svg id="ed-wf" class="wf" role="img" aria-label="Waterfall chart of credibility added by each commitment device"></svg>
  </div>
  <div class="card fig">
    <div class="fig-h"><p class="eyebrow">Boston for Bonn: credibility as the patron’s war cost rises</p><p class="fine">Drag to set w.</p></div>
    <svg id="ed-bonn" class="lines" role="img" aria-label="Credibility and deterrence against the patron's war cost, with and without your package. Drag to set the war cost."></svg>
    <div class="legend"><span class="lg"><i class="sw-cur"></i>Your package</span><span class="lg"><i class="sw-base"></i>No devices</span><span class="lg"><i class="sw-solid"></i>Credibility (solid)</span><span class="lg"><i class="sw-dash"></i>Pr(deterred) (dashed)</span></div>
  </div>
  <div class="card fig">
    <div class="fig-h"><p class="eyebrow">All 16 packages: what deterrence costs</p><p class="fine">Circle size is entrapment risk. The line joins packages no other beats on both cost and deterrence. Click a circle to load it.</p></div>
    <svg id="ed-front" class="front-fig" role="img" aria-label="Scatter of all sixteen device packages by peacetime cost and probability of deterrence"></svg>
  </div>`;

const panel = buildPanel(document.getElementById('panel'), S, what => {
  if (what === 'reset') { Object.assign(S, { ...DEFAULTS, dev: { ...DEFAULTS.dev }, params: freshParams() }); }
  changed();
});

function render() {
  drawWaterfall(stage.querySelector('#ed-wf'), S, S.params);
  drawBonn(stage.querySelector('#ed-bonn'), S, S.params, w => { S.w = +w.toFixed(2); changed(); });
  drawFrontier(stage.querySelector('#ed-front'), S, S.params, dev => { S.dev = { ...dev }; changed(); });
  panel.render();
}
let raf = 0;
function changed() { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { render(); writeHash(); }); }

renderWorld(document.getElementById('world'));
const tour = createTour(document.getElementById('tour-root'), set => {
  Object.assign(S, { ...DEFAULTS, dev: { ...DEFAULTS.dev }, params: freshParams() }, set);
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
  return true;
}
if (!renderMath()) window.addEventListener('load', renderMath, { once: true });
