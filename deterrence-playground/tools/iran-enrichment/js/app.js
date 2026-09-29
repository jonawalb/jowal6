// Iran's Enrichment Clock: state, URL hash and wiring between chart, panel, slider and walkthrough.
import { ROWS, VIEWS, slug, fromSlug, niceDate } from './series.js';
import { EVENTS } from '../data/events.js';
import { createChart } from './chart.js';
import { panelHTML, wirePanel, renderPanel } from './panel.js';
import { createTour } from './tour.js';
import { renderNotes } from './notes.js';

const DEFAULT = { report: 'GOV/2025/50', view: 'all', limit: true, events: true, ev: 'strikes-2025' };
const state = { ...DEFAULT };

// #r=GOV-2025-50&v=heu&lim=0&evs=0&e=strikes-2025
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const r = h.get('r') && fromSlug(h.get('r'));
  if (r) state.report = r.id;
  if (VIEWS[h.get('v')]) state.view = h.get('v');
  state.limit = h.get('lim') !== '0';
  state.events = h.get('evs') !== '0';
  if (h.has('e')) state.ev = EVENTS.some(e => e.id === h.get('e')) ? h.get('e') : null;
}
let timer = 0;
function writeHash() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const h = new URLSearchParams();
    h.set('r', slug(state.report));
    if (state.view !== 'all') h.set('v', state.view);
    if (!state.limit) h.set('lim', '0');
    if (!state.events) h.set('evs', '0');
    h.set('e', state.ev || '');
    history.replaceState(null, '', '#' + h.toString());
  }, 150);
}

const panel = document.getElementById('panel');
panel.innerHTML = panelHTML();
const range = document.getElementById('ie-range');
range.max = ROWS.length - 1;
const viewBox = document.getElementById('ie-view');
viewBox.innerHTML = Object.entries(VIEWS).map(([k, v]) => `<button type="button" data-v="${k}" aria-pressed="false">${v.label}</button>`).join('');

const chart = createChart(document.getElementById('ie-chart'), {
  onReport: id => set({ report: id }),
  onEvent: id => set({ ev: id }),
});
const act = {
  event: id => set({ ev: id }),
  step: d => { const k = ROWS.findIndex(r => r.id === state.report) + d; if (ROWS[k]) set({ report: ROWS[k].id }); },
};
wirePanel(panel, act);

function render() {
  chart.draw(state);
  renderPanel(panel, state);
  const k = ROWS.findIndex(r => r.id === state.report);
  range.value = k;
  const r = ROWS[k];
  document.getElementById('ie-out').textContent = `${r.id} · ${niceDate(r.asof)}`;
  viewBox.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === state.view));
  document.getElementById('ie-lim').checked = state.limit;
  document.getElementById('ie-evs').checked = state.events;
  writeHash();
}
function set(p) { Object.assign(state, p); render(); }

range.addEventListener('input', () => set({ report: ROWS[Number(range.value)].id }));
viewBox.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) set({ view: b.dataset.v }); });
document.getElementById('ie-lim').addEventListener('change', e => set({ limit: e.target.checked }));
document.getElementById('ie-evs').addEventListener('change', e => set({ events: e.target.checked }));
document.getElementById('ie-reset').addEventListener('click', () => set({ ...DEFAULT }));

// Play steps through the reports.
const play = document.getElementById('ie-play');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let ptimer = 0;
function stopPlay() { clearInterval(ptimer); ptimer = 0; play.textContent = 'Play'; play.setAttribute('aria-pressed', 'false'); }
play.addEventListener('click', () => {
  if (ptimer) return stopPlay();
  if (state.report === ROWS[ROWS.length - 1].id) set({ report: ROWS[0].id });
  play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
  ptimer = setInterval(() => {
    const k = ROWS.findIndex(r => r.id === state.report);
    if (k >= ROWS.length - 1) return stopPlay();
    set({ report: ROWS[k + 1].id });
  }, reduce.matches ? 900 : 450);
});

const tour = createTour(s => { stopPlay(); set({ ...DEFAULT, ...s }); document.getElementById('ie-chartcard').scrollIntoView({ block: 'nearest' }); });
document.getElementById('ie-tour').addEventListener('click', () => tour.start());
document.getElementById('ie-copy').addEventListener('click', async e => {
  writeHash();
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; }
  catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1800);
});

let rw = 0;
new ResizeObserver(() => { const w = document.getElementById('ie-chart').clientWidth; if (Math.abs(w - rw) > 4) { rw = w; chart.draw(state); } })
  .observe(document.getElementById('ie-chart'));
addEventListener('hashchange', () => { readHash(); render(); });
readHash();
render();
renderNotes();
