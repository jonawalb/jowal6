// Nuclear Arsenals: state, URL hash, wiring between chart, panel, compare cards, country page and walkthrough.
import { COUNTRIES, Y0, Y1 } from '../data/stockpiles.js';
import { MILESTONES } from '../data/milestones.js';
import { createChart } from './chart.js';
import { panelHTML, renderPanel, wirePanel, renderCompare, renderCountry } from './panel.js';
import { createTour } from './tour.js';
import { COLOR, esc } from './common.js';
import { pulse } from './fx.js';

const ALL = COUNTRIES.map(c => c.iso);
const state = { year: 1986, view: 'stack', log: false, world: true, ms: true, msId: null, on: new Set(ALL), page: 'USA', then: 1986 };

// ---- URL hash: #y=1986&v=lines&log=1&c=USA,RUS&p=CHN&t=1986&m=inf&w=0&ms=0
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const n = k => Number(h.get(k));
  if (h.has('y') && n('y') >= Y0 && n('y') <= Y1) state.year = n('y');
  if (h.get('v') === 'lines') state.view = 'lines';
  state.log = h.get('log') === '1';
  if (h.get('w') === '0') state.world = false;
  if (h.get('ms') === '0') state.ms = false;
  if (h.has('c')) state.on = new Set(h.get('c').split(',').filter(c => ALL.includes(c)));
  if (ALL.includes(h.get('p'))) state.page = h.get('p');
  if (h.has('t') && n('t') >= Y0 && n('t') < Y1) state.then = n('t');
  if (MILESTONES.some(m => m.id === h.get('m'))) state.msId = h.get('m');
}
let hashTimer = 0;
function writeHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const h = new URLSearchParams();
    h.set('y', state.year);
    if (state.view !== 'stack') h.set('v', state.view);
    if (state.log) h.set('log', '1');
    if (!state.world) h.set('w', '0');
    if (!state.ms) h.set('ms', '0');
    if (state.on.size !== ALL.length) h.set('c', [...state.on].join(','));
    h.set('p', state.page);
    if (state.then !== 1986) h.set('t', state.then);
    if (state.msId) h.set('m', state.msId);
    history.replaceState(null, '', '#' + h.toString());
  }, 150);
}

// ---- DOM
const panel = document.getElementById('panel');
panel.innerHTML = panelHTML();
const range = document.getElementById('year');
range.min = Y0; range.max = Y1;
const thenSel = document.getElementById('then');
for (let y = Y0; y < Y1; y++) thenSel.add(new Option(y, y));
const cpick = document.getElementById('cpick');
cpick.innerHTML = COUNTRIES.map(c => `<button type="button" data-iso="${c.iso}" aria-pressed="false"><span class="sw-dot" style="background:${COLOR[c.iso]}"></span>${esc(c.name)}</button>`).join('');
document.getElementById('legend').innerHTML = COUNTRIES.map(c => `<span><span class="sw-dot" style="background:${COLOR[c.iso]}"></span>${esc(c.name)}</span>`).join('')
  + '<span><span class="sw-dash"></span>Global total incl. retired</span>';
// On narrow screens (chart under 560 px, as in chart.js) the markers are numbered; this line is their key.
document.getElementById('ms-key').textContent = 'Milestones: ' + MILESTONES.map((m, k) => `${k + 1} ${m.short}`).join(' · ');

const chart = createChart(document.getElementById('chart'), {
  onYear: y => { state.msId = null; set({ year: y }); },
  onMilestone: id => { const m = MILESTONES.find(k => k.id === id); set({ msId: id, year: m.year }); },
});

const act = {
  set: p => set(p),
  toggle: (iso, on) => { const s = new Set(state.on); on ? s.add(iso) : s.delete(iso); set({ on: s }); },
  quick: q => set({ on: new Set(q === 'all' ? ALL : q === 'big2' ? ['USA', 'RUS'] : ALL.filter(c => c !== 'USA' && c !== 'RUS')),
    ...(q === 'others' ? { view: 'lines' } : {}) }),
  page: (iso, scroll) => { set({ page: iso }); if (scroll) document.getElementById('country-sec').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); },
};
wirePanel(panel, act);

function msKey() { document.getElementById('ms-key').hidden = !state.ms || document.getElementById('chart').clientWidth >= 560; }
function render() {
  chart.draw(state);
  msKey();
  renderPanel(panel, state, act);
  range.value = state.year;
  document.getElementById('year-out').textContent = state.year;
  thenSel.value = state.then;
  renderCompare(document.getElementById('compare'), state.then);
  renderCountry(document.getElementById('country'), state.page);
  cpick.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.iso === state.page));
  writeHash();
}
function set(p) {
  Object.assign(state, p);
  if (p.on && !(p.on instanceof Set)) state.on = new Set(p.on);
  render();
}

range.addEventListener('input', () => { state.msId = null; set({ year: Number(range.value) }); });
thenSel.addEventListener('change', () => set({ then: Number(thenSel.value) }));
cpick.addEventListener('click', e => { const b = e.target.closest('[data-iso]'); if (b) set({ page: b.dataset.iso }); });

// Play: step through the years from the current one (or from 1945 at the end).
const playBtn = document.getElementById('play');
let timer = 0;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
function stopPlay() { clearInterval(timer); timer = 0; playBtn.textContent = 'Play'; playBtn.setAttribute('aria-pressed', 'false'); }
playBtn.addEventListener('click', () => {
  pulse(playBtn);
  if (timer) return stopPlay();
  if (state.year >= Y1) set({ year: Y0 });
  playBtn.textContent = 'Pause'; playBtn.setAttribute('aria-pressed', 'true');
  timer = setInterval(() => { if (state.year >= Y1) return stopPlay(); state.msId = null; set({ year: state.year + 1 }); }, reduce.matches ? 400 : 120);
});

const tour = createTour(s => {
  stopPlay();
  set({ ...s, on: new Set(s.on), world: true, ms: true });
  if (s.scroll) document.getElementById('compare-sec').scrollIntoView({ block: 'start' });
});
document.getElementById('start-tour').addEventListener('click', () => tour.start());
document.getElementById('copy-link').addEventListener('click', async e => {
  writeHash();
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; }
  catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1800);
});

let rw = 0;
new ResizeObserver(() => { const w = document.getElementById('chart').clientWidth; if (Math.abs(w - rw) > 4) { rw = w; chart.draw(state); msKey(); } })
  .observe(document.getElementById('chart'));
addEventListener('hashchange', () => { readHash(); render(); });
readHash();
render();
