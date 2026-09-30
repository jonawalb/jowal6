// Is It a Nuke? Wiring: state, URL hash, figures, panel, case cards and walkthrough.
import { DEFAULTS, LIMITS, COSTS, CONTEXTS, SITES, TRAJS, STATES, ACTIONS, update } from './model.js';
import { drawChain, drawDecision, drawMap, bindMapDrag, drawRates } from './views.js';
import { buildPanel } from './panel.js';
import { renderCases } from './cases.js';
import { createTour } from './tour.js';
import { legend } from './ui.js';
import { afterRender } from './fx.js';

const cloneCosts = () => JSON.parse(JSON.stringify(COSTS));
const S = { P: { ...DEFAULTS }, costs: cloneCosts() };
const CK = ['F', 'C', 'N', 'Nloss'], AK = ['wait', 'conv', 'low'];

function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(LIMITS)) {
    const v = Number(q.get(k));
    if (q.has(k) && Number.isFinite(v)) S.P[k] = Math.max(LIMITS[k][0], Math.min(LIMITS[k][1], v));
  }
  if (CONTEXTS[q.get('ctx')]) S.P.ctx = q.get('ctx');
  if (SITES.some(s => s.id === q.get('site'))) S.P.site = q.get('site');
  if (TRAJS.some(s => s.id === q.get('traj'))) S.P.traj = q.get('traj');
  if (q.has('corr')) S.P.corr = q.get('corr') === '1' ? 1 : 0;
  if (q.has('low')) S.P.lowCap = q.get('low') === '1' ? 1 : 0;
  const c = (q.get('c') || '').split(',').map(Number);
  if (c.length === 12 && c.every(x => Number.isFinite(x) && x >= 0 && x <= 5000)) AK.forEach((a, i) => CK.forEach((k, j) => { S.costs[a][k] = c[i * 4 + j]; }));
}
function writeHash() {
  const q = new URLSearchParams();
  q.set('ctx', S.P.ctx); q.set('site', S.P.site); q.set('traj', S.P.traj); q.set('corr', String(S.P.corr)); q.set('low', String(S.P.lowCap));
  for (const k of Object.keys(LIMITS)) q.set(k, String(+(+S.P[k]).toFixed(3)));
  const flat = AK.flatMap(a => CK.map(k => S.costs[a][k]));
  if (flat.some((v, i) => v !== COSTS[AK[Math.floor(i / 4)]][CK[i % 4]])) q.set('c', flat.join(','));
  history.replaceState(null, '', '#' + q.toString());
}

const stage = document.getElementById('stage');
stage.innerHTML = `
  <div class="card fig">
    <div class="fig-h"><p class="eyebrow">What you believe, step by step</p><p class="fine">Each row adds one piece of evidence by Bayes’ rule. The note gives how strongly it points to a nuclear rather than a conventional warhead.</p></div>
    <svg id="wa-chain" class="chain" role="img" aria-label="Belief over no attack, conventional and nuclear after each piece of evidence"></svg>
    <div class="legend" id="wa-slegend"></div>
  </div>
  <div class="card fig">
    <div class="fig-h"><p class="eyebrow">What each response is expected to cost</p><p class="fine">Lower is better. The strip shows which response wins at every level of Pr(nuclear). <span class="notional">notional</span></p></div>
    <svg id="wa-dec" class="dec" role="img" aria-label="Expected cost of waiting, conventional retaliation and launch on warning"></svg>
    <div class="legend" id="wa-alegend"></div>
  </div>
  <div class="card fig">
    <div class="fig-h"><p class="eyebrow">Over a whole campaign: wrongful nuclear launches</p><p class="fine">Darker cells: higher chance that at least one conventional launch in the campaign is met with launch on warning. Click or drag to set your prior and the actual entanglement.</p></div>
    <svg id="wa-map" class="region" role="img" aria-label="Map of the chance of a wrongful nuclear launch by prior and actual entanglement. Click or drag to move the point."></svg>
    <div class="rates" id="wa-rates"></div>
  </div>`;
legend(stage.querySelector('#wa-slegend'), STATES.map(s => [s.col, `${s.name}: ${s.long.toLowerCase()}`]));
legend(stage.querySelector('#wa-alegend'), ACTIONS.map(a => [a.col, a.name]));

const panel = buildPanel(document.getElementById('panel'), S, what => {
  if (what === 'reset') { S.P = Object.assign(S.P, DEFAULTS); S.costs = Object.assign(S.costs, cloneCosts()); }
  changed();
});

let mapF = null;
const mapSvg = stage.querySelector('#wa-map');
bindMapDrag(mapSvg, () => mapF, (pNuc, E) => { S.P.pNuc = +pNuc.toFixed(3); S.P.E = +E.toFixed(2); changed(); });

function render() {
  const chain = update(S.P);
  const mu = chain[chain.length - 1].mu;
  drawChain(stage.querySelector('#wa-chain'), chain);
  const dec = drawDecision(stage.querySelector('#wa-dec'), S.P, mu, S.costs);
  mapF = drawMap(mapSvg, S.P, S.costs);
  drawRates(stage.querySelector('#wa-rates'), S.P, S.costs);
  panel.render(mu, dec);
  afterRender(S.P, mu, dec);
}
let raf = 0;
function changed() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => { render(); writeHash(); });
}

const apply = set => { Object.assign(S.P, DEFAULTS, set || {}); changed(); };
renderCases(document.getElementById('cases'), preset => {
  apply(preset);
  document.getElementById('stage').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
});
const tour = createTour(document.getElementById('tour-root'), apply);
document.getElementById('start-tour').addEventListener('click', () => tour.start());

let lastW = innerWidth;
addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; changed(); } });

readHash();
render();
writeHash();
