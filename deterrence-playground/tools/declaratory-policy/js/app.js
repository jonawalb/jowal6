// Who Promises What: state, URL hash, filters and wiring between matrix, detail panel, timeline, comparison
// and walkthrough.
import { STATES, ELEMENTS, EVENTS } from '../data/policies.js';
import { renderMatrix, detailHTML } from './matrix.js';
import { createTimeline, eventCard, T0, T1 } from './timeline.js';
import { fillSelects, renderCompare } from './compare.js';
import { createTour } from './tour.js';
import { ALL_STATES, ALL_ELS, STATE_COLOR, esc, inForce, reduceMotion } from './common.js';
import { num, rise, flash, reveal, wipeIn, fadeUp, onFirstView } from './fx.js';

// ---- Motion (presentation only): remember what each cell said, then flash the cells whose statement
// changed when the year moves; rise the side cards when their subject changes.
const cellText = (root, sel, key) => new Map([...root.querySelectorAll(sel)].map((e, i) => [key(e, i), e.textContent]));
function flashChanged(root, sel, key, before, target = e => e) {
  root.querySelectorAll(sel).forEach((e, i) => { const b = before.get(key(e, i)); if (b != null && b !== e.textContent) flash(target(e)); });
}
const mv = { asOf: null, sel: null, ev: null, cmp: null, st: null, rows: false, tl: false };

const DEF = { asOf: T1, states: ALL_STATES, els: ALL_ELS, q: '', full: false, sel: 'CHN.nfu', cmp: ['USA', 'CHN'], ev: null };
const fresh = () => ({ ...DEF, states: new Set(DEF.states), els: new Set(DEF.els), cmp: [...DEF.cmp] });
const state = fresh();

// ---- URL hash: #y=2019&s=USA,CHN&e=nfu,nsa&q=vital&full=1&sel=RUS.conditions&cmp=IND,PAK&ev=rus2024
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  Object.assign(state, fresh());
  const y = Number(h.get('y'));
  if (y >= T0 && y <= T1) state.asOf = y;
  if (h.has('s')) state.states = new Set(h.get('s').split(',').filter(s => ALL_STATES.includes(s)));
  if (h.has('e')) state.els = new Set(h.get('e').split(',').filter(e => ALL_ELS.includes(e)));
  state.q = h.get('q') || '';
  state.full = h.get('full') === '1';
  const sel = h.get('sel') || '';
  if (ALL_STATES.includes(sel.split('.')[0]) && ALL_ELS.includes(sel.split('.')[1])) state.sel = sel;
  const cmp = (h.get('cmp') || '').split(',');
  if (cmp.length === 2 && cmp.every(c => ALL_STATES.includes(c))) state.cmp = cmp;
  if (EVENTS.some(e => e.id === h.get('ev'))) state.ev = h.get('ev');
}
let hashTimer = 0;
function writeHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const h = new URLSearchParams();
    if (state.asOf !== T1) h.set('y', state.asOf);
    if (state.states.size !== ALL_STATES.length) h.set('s', [...state.states].join(','));
    if (state.els.size !== ALL_ELS.length) h.set('e', [...state.els].join(','));
    if (state.q) h.set('q', state.q);
    if (state.full) h.set('full', '1');
    if (state.sel) h.set('sel', state.sel);
    h.set('cmp', state.cmp.join(','));
    if (state.ev) h.set('ev', state.ev);
    history.replaceState(null, '', '#' + h.toString());
  }, 150);
}

// ---- DOM
const $ = id => document.getElementById(id);
$('f-states').innerHTML = STATES.map(s => `<button type="button" data-st="${s.id}" aria-pressed="true"><span class="sw-dot" style="background:${STATE_COLOR[s.id]}"></span>${esc(s.name)}</button>`).join('');
$('f-els').innerHTML = ELEMENTS.map(e => `<label class="tg"><input type="checkbox" data-el="${e.id}" checked><span class="sw"></span><span class="t">${esc(e.name)}<small>${esc(e.help)}</small></span></label>`).join('');
const range = $('asof');
range.min = T0; range.max = T1;
fillSelects($('cmp-a'), $('cmp-b'));

const timeline = createTimeline($('timeline'), {
  onYear: y => set({ asOf: y, ev: null }),
  onEvent: id => { const e = EVENTS.find(k => k.id === id); set({ ev: id, asOf: Number(e.date.slice(0, 4)), ...(e.sel ? { sel: e.sel } : {}) }); },
});

function render() {
  const yearMoved = mv.asOf !== null && mv.asOf !== state.asOf;
  const mKey = b => b.dataset.sel, cKey = (e, i) => i;
  const mBefore = cellText($('matrix'), '[data-sel]', mKey), cBefore = cellText($('compare'), '.dp-cmp-r > div', cKey);
  const shown = renderMatrix($('matrix'), state, sel => set({ sel }));
  if (yearMoved) flashChanged($('matrix'), '[data-sel]', mKey, mBefore, e => e.closest('td'));
  const cells = state.states.size * state.els.size;
  let declared = 0;
  for (const s of state.states) for (const e of state.els) if (inForce(s, e, state.asOf)) declared++;
  $('asof-out').textContent = state.asOf;
  range.value = state.asOf;
  num($('k-decl'), declared, { fmt: v => `${Math.round(v)} / ${cells}`, ms: 320 });
  $('k-note').textContent = state.q ? `${shown} statement${shown === 1 ? ' mentions' : 's mention'} “${state.q}”.` : `Cells with a quoted statement dated ${state.asOf} or earlier.`;
  $('detail').innerHTML = detailHTML(state.sel, state.asOf, state.q.trim());
  if (mv.sel !== null && mv.sel !== state.sel) rise($('detail'), { ms: 300, dy: 6 });
  document.querySelectorAll('#f-states [data-st]').forEach(b => b.setAttribute('aria-pressed', state.states.has(b.dataset.st)));
  document.querySelectorAll('#f-els [data-el]').forEach(i => { i.checked = state.els.has(i.dataset.el); });
  if ($('q').value !== state.q) $('q').value = state.q;
  $('full').checked = state.full;
  timeline.draw(state);
  $('ev-card').innerHTML = eventCard(state.ev);
  if (mv.ev !== state.ev && state.ev) rise($('ev-card'), { ms: 300, dy: 6 });
  const stKey = [...state.states].join();
  if (mv.tl && mv.st !== stKey) fadeUp($('timeline').querySelector('svg'));
  $('cmp-a').value = state.cmp[0]; $('cmp-b').value = state.cmp[1];
  $('cmp-year').textContent = state.asOf;
  renderCompare($('compare'), state);
  const cmpKey = state.cmp.join() + '|' + [...state.els].join();
  if (mv.cmp !== null && mv.cmp !== cmpKey) $('compare').querySelectorAll('.dp-cmp-h, .dp-cmp-r').forEach((r, i) => rise(r, { delay: i * 40 }));
  else if (yearMoved) flashChanged($('compare'), '.dp-cmp-r > div', cKey, cBefore);
  Object.assign(mv, { asOf: state.asOf, sel: state.sel, ev: state.ev, cmp: cmpKey, st: stKey });
  writeHash();
}
function set(p) { Object.assign(state, p); render(); }

$('f-states').addEventListener('click', e => {
  const b = e.target.closest('[data-st]'); if (!b) return;
  const s = new Set(state.states); s.has(b.dataset.st) ? s.delete(b.dataset.st) : s.add(b.dataset.st); set({ states: s });
});
$('f-els').addEventListener('change', e => {
  const i = e.target.closest('[data-el]'); if (!i) return;
  const s = new Set(state.els); i.checked ? s.add(i.dataset.el) : s.delete(i.dataset.el); set({ els: s });
});
document.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => {
  const q = b.dataset.quick;
  const npt = STATES.filter(s => s.npt).map(s => s.id);
  set({ states: new Set(q === 'all' ? ALL_STATES : q === 'npt' ? npt : ALL_STATES.filter(s => !npt.includes(s))) });
});
range.addEventListener('input', () => set({ asOf: Number(range.value), ev: null }));
$('q').addEventListener('input', e => set({ q: e.target.value }));
$('full').addEventListener('change', e => set({ full: e.target.checked }));
$('cmp-a').addEventListener('change', e => set({ cmp: [e.target.value, state.cmp[1]] }));
$('cmp-b').addEventListener('change', e => set({ cmp: [state.cmp[0], e.target.value] }));
$('swap').addEventListener('click', () => set({ cmp: [state.cmp[1], state.cmp[0]] }));
$('reset').addEventListener('click', () => { Object.assign(state, fresh()); render(); });
$('copy-link').addEventListener('click', async e => {
  writeHash();
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; }
  catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1800);
});

const tour = createTour(s => {
  Object.assign(state, fresh(), s, { states: new Set(s.states || ALL_STATES), els: new Set(s.els || ALL_ELS), cmp: s.cmp || [...DEF.cmp] });
  render();
  $(s.scroll || 'matrix-card').scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
});
$('start-tour').addEventListener('click', () => tour.start());

onFirstView($('timeline'), () => { mv.tl = true; wipeIn($('timeline').querySelector('svg'), 700); });
let rw = 0;
new ResizeObserver(() => { const w = $('timeline').clientWidth; if (Math.abs(w - rw) > 4) { rw = w; timeline.draw(state); } }).observe($('timeline'));
addEventListener('hashchange', () => { readHash(); render(); });
readHash();
render();
reveal($('matrix').querySelectorAll('tbody tr'));
