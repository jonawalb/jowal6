// Proliferation Paths: state, URL hash, filters, and wiring between the map, timeline, card, table and walkthrough.
import { STATES, COVER, FIRST } from '../data/codings.js';
import { createMap } from './map.js';
import { createTimeline } from './timeline.js';
import { cardHTML, reconcileHTML, diffsHTML } from './card.js';
import { createTour } from './tour.js';
import { num, rise, pulse, reveal, wipeIn, fadeUp, onFirstView } from './fx.js';
import { T0, T1, DATASETS, DS_LABEL, STAGES, STAGE_LABEL, ALL_IDS, stageAt, everHighest, everReversed, firstActivity, covers, disagree, reduceMotion, esc } from './common.js';

const FILTERS = {
  all: ['All states', () => true],
  acquire: ['Acquired', id => everHighest(id) === 'acquire'],
  pursue: ['Pursued or more', id => ['pursue', 'acquire'].includes(everHighest(id))],
  rev: ['Reversed course', id => everReversed(id)],
  inh: ['Not coded', id => everHighest(id) === 'none'],
};
const SORTS = { first: 'First activity', stage: 'Highest stage', name: 'Name' };
const DEF = { year: 1975, ds: 'bleek', sel: 'ZAF', f: 'all', sort: 'first', gaps: false };
const state = { ...DEF, visible: new Set(ALL_IDS) };
const $ = id => document.getElementById(id);

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  Object.assign(state, DEF);
  const y = Number(h.get('y'));
  if (y >= T0 && y <= T1) state.year = y;
  if ([...DATASETS, 'any'].includes(h.get('d'))) state.ds = h.get('d');
  if (ALL_IDS.includes(h.get('s'))) state.sel = h.get('s');
  if (h.get('s') === '') state.sel = '';
  if (FILTERS[h.get('f')]) state.f = h.get('f');
  if (SORTS[h.get('o')]) state.sort = h.get('o');
  state.gaps = h.get('gaps') === '1';
}
let hashTimer = 0;
function writeHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const h = new URLSearchParams({ y: state.year, d: state.ds, s: state.sel });
    if (state.f !== 'all') h.set('f', state.f);
    if (state.sort !== 'first') h.set('o', state.sort);
    if (state.gaps) h.set('gaps', '1');
    history.replaceState(null, '', '#' + h.toString());
  }, 150);
}

function order() {
  const rank = { none: 0, explore: 1, pursue: 2, acquire: 3 };
  const ids = [...ALL_IDS];
  if (state.sort === 'name') return ids.sort((a, b) => STATES.find(s => s.id === a).name.localeCompare(STATES.find(s => s.id === b).name));
  if (state.sort === 'stage') return ids.sort((a, b) => rank[everHighest(b)] - rank[everHighest(a)] || firstActivity(a) - firstActivity(b));
  return ids.sort((a, b) => firstActivity(a) - firstActivity(b));
}

// ---- static controls
$('f-ds').innerHTML = [...DATASETS, 'any'].map(d => `<button type="button" data-ds="${d}" aria-pressed="false">${esc(d === 'any' ? 'Compare all three' : DS_LABEL[d])}</button>`).join('');
$('f-filter').innerHTML = Object.entries(FILTERS).map(([k, [l]]) => `<button type="button" data-f="${k}" aria-pressed="false">${esc(l)}</button>`).join('');
$('sort').innerHTML = Object.entries(SORTS).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('');
const range = $('year');
range.min = T0; range.max = T1;

const map = createMap($('map'), { onSelect: id => set({ sel: id }) });
const timeline = createTimeline($('timeline'), { onYear: y => set({ year: y }), onSelect: id => set({ sel: id }) });

function readout() {
  const ds = state.ds;
  if (ds !== 'any' && !covers(ds, state.year)) {
    return `<p class="fine pp-warn">${esc(DS_LABEL[ds])} codes ${FIRST[ds]}–${COVER[ds]} only. Pick another dataset or move the year.</p>`;
  }
  const n = Object.fromEntries(STAGES.map(s => [s, 0]));
  let dis = 0;
  for (const id of ALL_IDS) { const s = stageAt(ds, id, state.year); if (n[s] != null) n[s]++; if (ds === 'any' && disagree(id, state.year)) dis++; }
  return `<dl class="readout pp-read">${STAGES.slice().reverse().map(s => `<div><dt><i class="pp-sw" data-st="${s}"></i>${STAGE_LABEL[s]}</dt><dd class="num">${n[s]}</dd></div>`).join('')}
    ${ds === 'any' ? `<div><dt><i class="pp-sw dis"></i>Datasets disagree</dt><dd class="num">${dis}</dd></div>` : ''}</dl>
    <p class="fine">${ds === 'any' ? 'Highest stage any dataset codes in' : 'States at each stage in'} ${state.year}${ds === 'any' ? ', among the datasets that cover that year' : `, as coded by ${esc(DS_LABEL[ds])}`}.</p>`;
}

function render() {
  const pred = FILTERS[state.f][1];
  state.visible = new Set(ALL_IDS.filter(pred));
  $('year-out').textContent = state.year;
  range.value = state.year;
  const prevN = new Map([...$('readout').querySelectorAll('dd.num')].map(d => [d.previousElementSibling.textContent, d.textContent]));
  $('readout').innerHTML = readout();
  $('readout').querySelectorAll('dd.num').forEach(d => {
    const p = prevN.get(d.previousElementSibling.textContent);
    if (p != null) d.dataset.fx = p;
    num(d, Number(d.textContent), { ms: 300, flashIt: true });
  });
  document.querySelectorAll('[data-ds]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ds === state.ds));
  document.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', b.dataset.f === state.f));
  $('sort').value = state.sort;
  $('gaps').checked = state.gaps;
  $('map-ds').textContent = DS_LABEL[state.ds];
  $('map-year').textContent = state.year;
  map.draw(state);
  timeline.draw(state, order());
  const tlKey = [state.ds, state.f, state.sort].join('|');
  if (mv.tl && mv.tlKey !== tlKey) fadeUp($('timeline').querySelector('svg'));
  $('card').innerHTML = cardHTML(state.sel);
  if (mv.sel !== null && mv.sel !== state.sel) rise($('card'), { ms: 300, dy: 6 });
  $('rec').innerHTML = reconcileHTML(state.gaps);
  if (mv.gaps !== null && mv.gaps !== state.gaps) $('rec').querySelectorAll('tbody tr').forEach((r, i) => rise(r, { ms: 300, delay: Math.min(i, 12) * 25 }));
  Object.assign(mv, { sel: state.sel, gaps: state.gaps, tlKey });
  writeHash();
}
// Motion bookkeeping (presentation only).
const mv = { sel: null, gaps: null, tlKey: null, tl: false };
function set(p) { Object.assign(state, p); render(); }

$('f-ds').addEventListener('click', e => { const b = e.target.closest('[data-ds]'); if (b) set({ ds: b.dataset.ds }); });
$('f-filter').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) set({ f: b.dataset.f }); });
$('sort').addEventListener('change', e => set({ sort: e.target.value }));
$('gaps').addEventListener('change', e => set({ gaps: e.target.checked }));
range.addEventListener('input', () => set({ year: Number(range.value) }));
$('rec').addEventListener('click', e => {
  const b = e.target.closest('[data-open]'); if (!b) return;
  set({ sel: b.dataset.open });
  if (matchMedia('(max-width: 1020px)').matches) $('card').scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
});

let timer = 0;
const play = $('play');
function stopPlay() { clearInterval(timer); timer = 0; play.setAttribute('aria-pressed', 'false'); play.textContent = 'Play'; }
play.addEventListener('click', () => {
  pulse(play);
  if (timer) return stopPlay();
  if (state.year >= T1) set({ year: T0 });
  play.setAttribute('aria-pressed', 'true'); play.textContent = 'Pause';
  timer = setInterval(() => { if (state.year >= T1) stopPlay(); else set({ year: state.year + 1 }); }, reduceMotion() ? 600 : 220);
});
$('reset').addEventListener('click', () => { stopPlay(); Object.assign(state, DEF); render(); });
$('copy-link').addEventListener('click', async e => {
  writeHash();
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; }
  catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1800);
});
$('diffs').innerHTML = diffsHTML();

const tour = createTour(s => {
  stopPlay();
  Object.assign(state, DEF, s);
  render();
  $(s.scroll || 'map-card').scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
});
$('start-tour').addEventListener('click', () => tour.start());

let rw = 0;
new ResizeObserver(() => { const w = $('timeline').clientWidth; if (Math.abs(w - rw) > 4) { rw = w; timeline.draw(state, order()); } }).observe($('timeline'));
addEventListener('hashchange', () => { readHash(); render(); });
readHash();
render();
{ // rise only the rows inside the scroll box's first view; the rest are shown as they are
  const box = $('rec').getBoundingClientRect().bottom;
  reveal([...$('rec').querySelectorAll('tbody tr')].filter(r => r.getBoundingClientRect().bottom <= box));
}
onFirstView($('timeline'), () => { mv.tl = true; wipeIn($('timeline').querySelector('svg'), 700); });
