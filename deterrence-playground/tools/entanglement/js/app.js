// Nuclear Entanglement: state, URL hash, figures, panel, real-world examples and the Learn to play lesson.
import { CATS, CHANNELS, DEFAULTS, LIMITS, DEFAULT_PLAN, DEFAULT_MIT, MITIGATIONS, run, baseline } from './model.js';
import { drawPlanner, drawTimeline, drawChannels } from './views.js';
import { buildPanel } from './panel.js';
import { renderWorld } from './world.js';
import { learnButton, runLesson } from '../../../shared/js/learn.js';
import { lessonSteps, SHEET } from './lesson.js';
import { legend } from './ui.js';
import { afterRender } from './fx.js';

const freshCats = () => CATS.map(c => ({ n: c.n }));
const clonePlan = p => Object.fromEntries(CATS.map(c => [c.id, [...p[c.id]]]));
const S = { P: { ...DEFAULTS }, plan: clonePlan(DEFAULT_PLAN), mit: { ...DEFAULT_MIT }, cats: freshCats(), hi: null };

function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(LIMITS)) {
    const v = Number(q.get(k));
    if (q.has(k) && Number.isFinite(v)) S.P[k] = Math.max(LIMITS[k][0], Math.min(LIMITS[k][1], v));
  }
  if (q.has('dl')) S.P.dlDoc = q.get('dl') === '1' ? 1 : 0;
  const pl = q.get('plan');
  if (pl && /^[0-9a-f]{5}$/i.test(pl)) CATS.forEach((c, i) => { const m = parseInt(pl[i], 16); S.plan[c.id] = [0, 1, 2, 3].map(t => (m >> t) & 1); });
  const mt = q.get('mit');
  if (mt && /^\d+$/.test(mt)) MITIGATIONS.forEach((m, i) => { S.mit[m.id] = (+mt >> i) & 1; });
  const n = (q.get('n') || '').split(',').map(Number);
  if (n.length === CATS.length && n.every(x => Number.isFinite(x) && x >= 0 && x <= 1)) n.forEach((x, i) => { S.cats[i].n = x; });
}
function writeHash() {
  const q = new URLSearchParams();
  q.set('plan', CATS.map(c => S.plan[c.id].reduce((m, v, t) => m | (v << t), 0).toString(16)).join(''));
  q.set('mit', String(MITIGATIONS.reduce((m, x, i) => m | ((S.mit[x.id] ? 1 : 0) << i), 0)));
  for (const k of Object.keys(LIMITS)) if (S.P[k] !== DEFAULTS[k]) q.set(k, String(+S.P[k].toFixed(4)));
  if (S.P.dlDoc) q.set('dl', '1');
  if (S.cats.some((c, i) => c.n !== CATS[i].n)) q.set('n', S.cats.map(c => +c.n.toFixed(2)).join(','));
  history.replaceState(null, '', '#' + q.toString());
}

const stage = document.getElementById('stage');
stage.innerHTML = `
  <div class="card fig" id="fig-plan">
    <div class="fig-h"><p class="eyebrow">Your conventional campaign</p><p class="fine">Click a cell to strike that category in that phase. Bars show damage to the category after each phase.</p></div>
    <div id="en-plan"></div>
    <div class="plan-actions"><button type="button" class="btn sm" data-preset="none">Clear the plan</button><button type="button" class="btn sm" data-preset="default">Default campaign</button><button type="button" class="btn sm" data-preset="all">Strike everything</button></div>
  </div>
  <div class="card fig">
    <div class="fig-h"><p class="eyebrow">How the risk builds, phase by phase</p><p class="fine">Bars: hazard by channel. Solid line: cumulative chance of nuclear use. Dashed line: the same war without strikes on entangled assets. <span class="notional">notional</span></p></div>
    <svg id="en-time" class="lines" role="img" aria-label="Escalation hazard per phase by channel, and cumulative probability of nuclear use"></svg>
    <div class="legend" id="en-legend"></div>
  </div>
  <div class="card fig">
    <div class="fig-h"><p class="eyebrow">Why the target might go nuclear</p><p class="fine">Acton’s escalation mechanisms, plus the fog that amplifies them. Shares of the total hazard over the campaign.</p></div>
    <div id="en-ch" class="chgrid"></div>
  </div>`;
legend(stage.querySelector('#en-legend'), [['--faint', 'Baseline'], ...CHANNELS.map(c => [c.col, c.name])]);

const panel = buildPanel(document.getElementById('panel'), S, what => {
  if (what === 'reset') { S.P = { ...DEFAULTS }; S.plan = clonePlan(DEFAULT_PLAN); S.mit = { ...DEFAULT_MIT }; S.cats = freshCats(); S.hi = null; }
  changed();
});

stage.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
  const p = b.dataset.preset;
  S.plan = p === 'default' ? clonePlan(DEFAULT_PLAN) : Object.fromEntries(CATS.map(c => [c.id, p === 'all' ? [1, 1, 1, 1] : [0, 0, 0, 0]]));
  changed();
}));

function render() {
  const R = run(S), B = baseline(S);
  drawPlanner(stage.querySelector('#en-plan'), S, R,
    (c, t) => { S.plan[c][t] = S.plan[c][t] ? 0 : 1; changed(); },
    c => { const full = S.plan[c].every(Boolean); S.plan[c] = [0, 1, 2, 3].map(() => (full ? 0 : 1)); changed(); });
  if (S.hi) stage.querySelectorAll('.pl-r').forEach((r, i) => r.classList.toggle('hi', S.hi.includes(CATS[i].id)));
  drawTimeline(stage.querySelector('#en-time'), R, B);
  drawChannels(stage.querySelector('#en-ch'), R, S.P);
  panel.render(R, B);
  afterRender(S, R);
}
let raf = 0;
function changed() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => { render(); writeHash(); });
}

renderWorld(document.getElementById('world'), cats => {
  S.hi = cats; render();
  document.getElementById('fig-plan').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
});

// Learn to play: start from the defaults with an empty plan, then run the hands-on lesson.
const startLesson = () => {
  S.P = { ...DEFAULTS }; S.mit = { ...DEFAULT_MIT }; S.cats = freshCats(); S.hi = null;
  S.plan = Object.fromEntries(CATS.map(c => [c.id, [0, 0, 0, 0]]));
  render(); writeHash();
  runLesson(lessonSteps(S), { slug: 'entanglement', title: 'Learn to play', onFinish: () => banner.refresh() });
};
const banner = learnButton(document.getElementById('learn-slot'), { slug: 'entanglement', minutes: 4, onStart: startLesson, sheet: SHEET });

let lastW = innerWidth;
addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; changed(); } });

readHash();
render();
writeHash();
