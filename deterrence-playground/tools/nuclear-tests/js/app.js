// Every Nuclear Test: state, URL hash, and wiring between timeline, panel, map, reconciliation and walkthrough.
import { SITES, TESTS } from '../data/tests.js';
import { MILESTONES } from '../data/milestones.js';
import { createChart } from './chart.js';
import { createMap, siteCard } from './map.js';
import { panelHTML, wirePanel, renderPanel } from './panel.js';
import { renderRecon } from './recon.js';
import { createTour } from './tour.js';
import { Y0, Y1, ALL_STATES, STATE_COLOR, ENV_COLOR, SHORT, filtered, reduceMotion } from './common.js';
import { ENVS } from '../data/tests.js';
import { pulse, rise, reveal } from './fx.js';

const DEF = { year: 1962, by: 'state', env: [0, 1, 2, 3], st: ALL_STATES, yc: [0, 1, 2, 3, 4], ms: null, site: 'semipalatinsk' };
const state = { ...DEF, env: new Set(DEF.env), st: new Set(DEF.st), yc: new Set(DEF.yc) };

// ---- URL hash: #y=1962&by=env&e=013&s=0167&yc=0124&m=ptbt&site=nts
const digits = (s, n) => new Set([...String(s)].map(Number).filter(d => d >= 0 && d < n));
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const y = Number(h.get('y'));
  if (y >= Y0 && y <= Y1) state.year = y;
  state.by = h.get('by') === 'env' ? 'env' : 'state';
  state.env = h.has('e') ? digits(h.get('e'), 4) : new Set(DEF.env);
  state.st = h.has('s') ? digits(h.get('s'), 8) : new Set(DEF.st);
  state.yc = h.has('yc') ? digits(h.get('yc'), 5) : new Set(DEF.yc);
  state.ms = MILESTONES.some(m => m.id === h.get('m')) ? h.get('m') : null;
  if (SITES.some(s => s.id === h.get('site'))) state.site = h.get('site');
}
let hashTimer = 0;
function writeHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const h = new URLSearchParams();
    h.set('y', state.year);
    if (state.by !== 'state') h.set('by', state.by);
    const d = s => [...s].sort().join('');
    if (state.env.size !== 4) h.set('e', d(state.env));
    if (state.st.size !== 8) h.set('s', d(state.st));
    if (state.yc.size !== 5) h.set('yc', d(state.yc));
    if (state.ms) h.set('m', state.ms);
    if (state.site) h.set('site', state.site);
    history.replaceState(null, '', '#' + h.toString());
  }, 150);
}

// ---- DOM
const panel = document.getElementById('panel');
panel.innerHTML = panelHTML();
const range = document.getElementById('year');
range.min = Y0; range.max = Y1;

const chart = createChart(document.getElementById('chart'), {
  onYear: y => set({ year: y, ms: null }),
  onMilestone: id => set({ ms: id, year: MILESTONES.find(m => m.id === id).year }),
});
const map = createMap(document.getElementById('map'), document.getElementById('offsite'), { onSite: id => set({ site: id }) });

const act = {
  set: p => set(p),
  toggle: (key, v, on) => { const s = new Set(state[key]); on ? s.add(v) : s.delete(v); set({ [key]: s }); },
  quick: q => set({ st: new Set(q === 'all' ? ALL_STATES : q === 'big2' ? [0, 1] : [3, 4, 5, 6, 7]) }),
};
wirePanel(panel, act);
panel.addEventListener('st', e => act.toggle('st', e.detail[0], e.detail[1]));

function legend() {
  const items = state.by === 'env' ? ENVS.map((e, i) => [ENV_COLOR[i], e, state.env.has(i)])
    : SHORT.map((s, i) => [STATE_COLOR[i], s, state.st.has(i)]);
  document.getElementById('legend').innerHTML = items.filter(i => i[2]).map(([c, t]) => `<span><span class="sw-dot" style="background:${c}"></span>${t}</span>`).join('');
}

function render() {
  const rows = filtered(state);
  chart.draw(state);
  renderPanel(panel, state, rows);
  map.draw(state, rows);
  const card = document.getElementById('site-card'), prevSite = card.dataset.site;
  card.innerHTML = siteCard(state.site, rows, state.year);
  card.dataset.site = state.site;
  if (prevSite && prevSite !== state.site) rise(card, { ms: 300, dy: 6 });
  document.getElementById('map-year').textContent = state.year;
  range.value = state.year;
  document.getElementById('year-out').textContent = state.year;
  legend();
  writeHash();
}
function set(p) { Object.assign(state, p); render(); }

range.addEventListener('input', () => set({ year: Number(range.value), ms: null }));

// Play: step through the years from the current one (or from 1945 at the end).
const playBtn = document.getElementById('play');
let timer = 0;
function stopPlay() { clearInterval(timer); timer = 0; playBtn.textContent = 'Play'; playBtn.setAttribute('aria-pressed', 'false'); }
playBtn.addEventListener('click', () => {
  pulse(playBtn);
  if (timer) return stopPlay();
  if (state.year >= Y1) set({ year: Y0 });
  playBtn.textContent = 'Pause'; playBtn.setAttribute('aria-pressed', 'true');
  timer = setInterval(() => { if (state.year >= Y1) return stopPlay(); set({ year: state.year + 1, ms: null }); }, reduceMotion() ? 450 : 160);
});

const tour = createTour(s => {
  stopPlay();
  set({ ...DEF, ...s, env: new Set(s.env || DEF.env), st: new Set(s.st || DEF.st), yc: new Set(s.yc || DEF.yc) });
  const target = document.getElementById(s.scroll || 'top-card');
  target.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
});
document.getElementById('start-tour').addEventListener('click', () => tour.start());
document.getElementById('reset').addEventListener('click', () => { stopPlay(); set({ ...DEF, env: new Set(DEF.env), st: new Set(DEF.st), yc: new Set(DEF.yc) }); });
document.getElementById('copy-link').addEventListener('click', async e => {
  writeHash();
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; }
  catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1800);
});

renderRecon(document.getElementById('recon'), TESTS);
reveal(document.querySelectorAll('#recon tbody tr'));
let rw = 0;
new ResizeObserver(() => { const w = document.getElementById('chart').clientWidth; if (Math.abs(w - rw) > 4) { rw = w; chart.draw(state); } })
  .observe(document.getElementById('chart'));
addEventListener('hashchange', () => { readHash(); render(); });
readHash();
render();
