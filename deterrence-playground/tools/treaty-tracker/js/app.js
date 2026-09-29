// Treaty Tracker: state, URL hash, filters and wiring between the matrix, panel, timeline, comparison and tour.
import { TREATIES, EVENTS } from '../data/treaties.js';
import { GROUPS, STATUS, Y0, Y1, T, S, esc, reduceMotion } from './common.js';
import { createMatrix } from './matrix.js';
import { cellHTML, treatyHTML } from './panel.js';
import { createTimeline, eventCard, KINDS } from './timeline.js';
import { fillSelects, renderCompare } from './compare.js';
import { createTour } from './tour.js';

const ALL_G = GROUPS.map(g => g.id), ALL_K = KINDS.map(k => k.id);
const DEF = { year: Y1, groups: ALL_G, preset: 'all', q: '', sort: 'name', sel: 'ctbt.RUS', tsel: 'ctbt', cmp: ['USA', 'RUS'], ev: null, kinds: ALL_K };
const fresh = () => ({ ...DEF, groups: new Set(DEF.groups), kinds: new Set(DEF.kinds), cmp: [...DEF.cmp] });
const state = fresh();
const PRESETS = ['all', 'nuclear', 'changed', 'cfe'];

// ---- URL hash: #y=2019&g=nuclear,usrus&p=nuclear&q=kor&sort=npt&sel=npt.PRK&t=npt&cmp=IND,PAK&ev=ns-end&k=withdrawal
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  Object.assign(state, fresh());
  const y = Number(h.get('y'));
  if (y >= Y0 && y <= Y1) state.year = y;
  if (h.has('g')) state.groups = new Set(h.get('g').split(',').filter(g => ALL_G.includes(g)));
  if (h.has('k')) state.kinds = new Set(h.get('k').split(',').filter(k => ALL_K.includes(k)));
  if (PRESETS.includes(h.get('p'))) state.preset = h.get('p');
  state.q = h.get('q') || '';
  if (T[h.get('sort')]) state.sort = h.get('sort');
  const sel = (h.get('sel') || '').split('.');
  if (T[sel[0]] && S[sel[1]]) { state.sel = sel.join('.'); state.tsel = sel[0]; }
  if (T[h.get('t')]) state.tsel = h.get('t');
  const cmp = (h.get('cmp') || '').split(',');
  if (cmp.length === 2 && cmp.every(c => S[c])) state.cmp = cmp;
  if (EVENTS.some(e => e.id === h.get('ev'))) state.ev = h.get('ev');
}
let hashTimer = 0;
function writeHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const h = new URLSearchParams();
    if (state.year !== Y1) h.set('y', state.year);
    if (state.groups.size !== ALL_G.length) h.set('g', [...state.groups].join(','));
    if (state.kinds.size !== ALL_K.length) h.set('k', [...state.kinds].join(','));
    if (state.preset !== 'all') h.set('p', state.preset);
    if (state.q) h.set('q', state.q);
    if (state.sort !== 'name') h.set('sort', state.sort);
    if (state.sel) h.set('sel', state.sel);
    if (state.tsel !== state.sel?.split('.')[0]) h.set('t', state.tsel);
    h.set('cmp', state.cmp.join(','));
    if (state.ev) h.set('ev', state.ev);
    history.replaceState(null, '', '#' + h.toString());
  }, 150);
}

// ---- DOM
const $ = id => document.getElementById(id);
$('f-groups').innerHTML = GROUPS.map(g => `<label class="tg"><input type="checkbox" data-g="${g.id}" checked><span class="sw"></span><span class="t">${esc(g.name)}<small>${esc(g.help)}</small></span></label>`).join('');
$('legend').innerHTML = STATUS.map(s => `<span><span class="tt-sw" data-s="${s.id}"></span>${esc(s.name)}</span>`).join('');
$('tl-kinds').innerHTML = KINDS.map(k => `<button type="button" class="btn tt-kind" data-k="${k.id}" aria-pressed="true"><span class="tt-dot" style="background:${k.color}"></span>${esc(k.name)}</button>`).join('');
const range = $('year');
range.min = Y0; range.max = Y1;
fillSelects($('cmp-a'), $('cmp-b'));

const matrix = createMatrix($('matrix'), {
  onSelect: sel => set({ sel, tsel: sel.split('.')[0], ev: null }),
  onSort: tid => set({ sort: state.sort === tid ? 'name' : tid, tsel: tid }),
});
const timeline = createTimeline($('timeline'), {
  onYear: y => set({ year: y, ev: null }),
  onEvent: id => {
    const e = EVENTS.find(k => k.id === id);
    set({ ev: id, year: Number(e.date.slice(0, 4)), tsel: e.treaty, ...(e.state ? { sel: `${e.treaty}.${e.state}` } : {}) });
  },
});

function render() {
  $('year-out').textContent = state.year;
  range.value = state.year;
  matrix.draw(state);
  $('m-note').textContent = state.sort !== 'name' ? `Rows sorted by ${T[state.sort].short} status. Click the column again to sort by name.` : 'Click a column heading to sort states by that treaty.';
  $('detail').innerHTML = cellHTML(state.sel, state.year);
  $('treaty').innerHTML = treatyHTML(state.tsel, state.year);
  document.querySelectorAll('#f-groups [data-g]').forEach(i => { i.checked = state.groups.has(i.dataset.g); });
  document.querySelectorAll('[data-preset]').forEach(b => b.setAttribute('aria-pressed', state.preset === b.dataset.preset));
  document.querySelectorAll('[data-k]').forEach(b => b.setAttribute('aria-pressed', state.kinds.has(b.dataset.k)));
  if ($('q').value !== state.q) $('q').value = state.q;
  timeline.draw(state);
  $('ev-card').innerHTML = eventCard(state.ev);
  $('cmp-a').value = state.cmp[0]; $('cmp-b').value = state.cmp[1];
  $('cmp-year').textContent = state.year;
  renderCompare($('compare'), state);
  writeHash();
}
function set(p) { Object.assign(state, p); render(); }

$('f-groups').addEventListener('change', e => {
  const i = e.target.closest('[data-g]'); if (!i) return;
  const g = new Set(state.groups); i.checked ? g.add(i.dataset.g) : g.delete(i.dataset.g); set({ groups: g });
});
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => set({ preset: b.dataset.preset }));
$('tl-kinds').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (!b) return;
  const k = new Set(state.kinds); k.has(b.dataset.k) ? k.delete(b.dataset.k) : k.add(b.dataset.k); set({ kinds: k });
});
range.addEventListener('input', () => set({ year: Number(range.value), ev: null }));
$('q').addEventListener('input', e => set({ q: e.target.value }));
$('cmp-a').addEventListener('change', e => set({ cmp: [e.target.value, state.cmp[1]] }));
$('cmp-b').addEventListener('change', e => set({ cmp: [state.cmp[0], e.target.value] }));
$('swap').addEventListener('click', () => set({ cmp: [state.cmp[1], state.cmp[0]] }));
$('compare').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) set({ tsel: b.dataset.t, sel: `${b.dataset.t}.${state.cmp[0]}` }); });
$('reset').addEventListener('click', () => { Object.assign(state, fresh()); render(); });
$('copy-link').addEventListener('click', async e => {
  writeHash();
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; }
  catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1800);
});

// Play: step through the years.
let playing = 0;
function stopPlay() { clearInterval(playing); playing = 0; $('play').textContent = 'Play'; $('play').setAttribute('aria-pressed', 'false'); }
$('play').addEventListener('click', () => {
  if (playing) return stopPlay();
  if (state.year >= Y1) set({ year: Y0 });
  $('play').textContent = 'Pause'; $('play').setAttribute('aria-pressed', 'true');
  playing = setInterval(() => { if (state.year >= Y1) stopPlay(); else set({ year: state.year + 1, ev: null }); }, reduceMotion() ? 600 : 260);
});

const tour = createTour(s => {
  stopPlay();
  Object.assign(state, fresh(), s, { groups: new Set(s.groups || ALL_G), kinds: new Set(ALL_K), cmp: s.cmp || [...DEF.cmp] });
  render();
  $(s.scroll || 'matrix-card').scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
});
$('start-tour').addEventListener('click', () => tour.start());

let rw = 0;
new ResizeObserver(() => { const w = $('timeline').clientWidth; if (Math.abs(w - rw) > 4) { rw = w; timeline.draw(state); } }).observe($('timeline'));
addEventListener('hashchange', () => { readHash(); render(); });
readHash();
render();
$('k-total').textContent = `${TREATIES.length} treaties`;
