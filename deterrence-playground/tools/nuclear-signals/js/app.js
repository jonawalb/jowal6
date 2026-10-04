// Nuclear Signals Observatory: state, URL hash, views and wiring.
import { addExportBar } from '../../../shared/js/export.js';
import { ITEMS, byId, LANES, RANGES, CAT_COL, filterItems, laneName, esc, $, tooltip, NOW, glyph } from './common.js';
import { CATS, DYADS } from './rules.js';
import { drawTimeline } from './timeline.js';
import { renderDetail, renderList } from './detail.js';
import { renderDossier } from './dossier.js';
import { renderLadder } from './ladder.js';
import { renderSeries, RC, METRICS } from './series.js';
import { renderMethod } from './method.js';
import { placement } from './placement.js';
import { RUNGS } from '../data/ladder.js';
import { createTour } from './tour.js';

const LAST = NOW.slice(0, 7);
const VIEWS = [
  { k: 'timeline', n: 'Timeline' }, { k: 'dossier', n: 'State dossier' }, { k: 'ladder', n: 'Escalation ladder' },
  { k: 'rhet', n: 'Rhetoric vs events' }, { k: 'method', n: 'Method & sources' },
];
const CAT_KEYS = CATS.map(c => c.k);
const DEF = { view: 'timeline', range: 'now', states: [...LANES], cats: [...CAT_KEYS], corpus: true, q: '', sel: null, limit: 50,
  dossier: 'RUS', dyad: 'RUS-NATO', asOf: LAST, win: 12, hist: 'now', rc: 'RU', metric: 'share', rmonth: null };
const S = { ...DEF };
const setRange = k => { const r = RANGES.find(x => x.k === k) || RANGES[0]; Object.assign(S, { range: r.k, from: r.from, to: r.to }); };
setRange('now');

// ---- Hash ----
function writeHash() {
  const q = new URLSearchParams({ v: S.view });
  if (S.range !== DEF.range) q.set('r', S.range);
  if (S.states.length !== LANES.length) q.set('s', S.states.join('.'));
  if (S.cats.length !== CAT_KEYS.length) q.set('c', S.cats.join('.'));
  if (!S.corpus) q.set('cx', 0);
  if (S.q) q.set('q', S.q);
  if (S.sel) q.set('sel', S.sel);
  if (S.view === 'dossier') q.set('ds', S.dossier);
  if (S.view === 'ladder') { q.set('dy', S.dyad); if (S.asOf !== LAST) q.set('as', S.asOf); if (S.win !== 12) q.set('w', S.win); if (S.hist !== 'now') q.set('h', S.hist); }
  if (S.view === 'rhet') { q.set('rc', S.rc); if (S.metric !== 'share') q.set('mt', S.metric); if (S.rmonth) q.set('rm', S.rmonth); }
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (VIEWS.some(v => v.k === q.get('v'))) S.view = q.get('v');
  setRange(q.get('r'));
  if (q.has('s')) { const v = q.get('s').split('.').filter(k => LANES.includes(k)); if (v.length) S.states = v; }
  if (q.has('c')) { const v = q.get('c').split('.').filter(k => CAT_KEYS.includes(k)); if (v.length) S.cats = v; }
  S.corpus = q.get('cx') !== '0';
  S.q = (q.get('q') || '').slice(0, 60);
  if (byId.has(q.get('sel'))) S.sel = q.get('sel');
  if (LANES.includes(q.get('ds'))) S.dossier = q.get('ds');
  if (DYADS.some(d => d.id === q.get('dy'))) S.dyad = q.get('dy');
  if (/^\d{4}-\d{2}$/.test(q.get('as') || '') && q.get('as') >= '1960-01' && q.get('as') <= LAST) S.asOf = q.get('as');
  if ([3, 6, 12, 24].includes(+q.get('w'))) S.win = +q.get('w');
  if (q.get('h') === 'all') S.hist = 'all';
  if (RC.some(c => c.k === q.get('rc'))) S.rc = q.get('rc');
  if (METRICS.some(m => m.k === q.get('mt'))) S.metric = q.get('mt');
  if (/^\d{4}-\d{2}$/.test(q.get('rm') || '')) S.rmonth = q.get('rm');
}

// ---- Controls (timeline) ----
function renderControls() {
  $('tabs').innerHTML = VIEWS.map(v => `<button type="button" role="tab" class="tab" data-v="${v.k}" aria-selected="${v.k === S.view}" aria-controls="view">${esc(v.n)}</button>`).join('');
  $('tabs').querySelectorAll('[data-v]').forEach(b => { b.onclick = () => { S.view = b.dataset.v; update(); }; });
  $('tl-controls').hidden = S.view !== 'timeline';
  if (S.view !== 'timeline') return;
  $('range').innerHTML = RANGES.map(r => `<button type="button" class="btn" data-k="${r.k}" aria-pressed="${r.k === S.range}">${esc(r.n)}</button>`).join('');
  $('range').querySelectorAll('button').forEach(b => { b.onclick = () => { setRange(b.dataset.k); S.limit = 50; update(); }; });
  $('cats').innerHTML = CATS.map(c => `<button type="button" class="gchip" data-k="${c.k}" aria-pressed="${S.cats.includes(c.k)}" title="${esc(c.d)}"><i style="background:${CAT_COL[c.k]}"></i>${esc(c.n)}</button>`).join('');
  $('cats').querySelectorAll('.gchip').forEach(b => { b.onclick = () => { S.cats = toggle(S.cats, b.dataset.k, CAT_KEYS); update(); }; });
  $('states').innerHTML = LANES.map(l => `<button type="button" class="gchip st" data-k="${l}" aria-pressed="${S.states.includes(l)}">${esc(laneName(l))}</button>`).join('')
    + `<button type="button" class="gchip st" data-all="1">All</button>`;
  $('states').querySelectorAll('.gchip').forEach(b => { b.onclick = () => { S.states = b.dataset.all ? [...LANES] : toggle(S.states, b.dataset.k, LANES); update(); }; });
  $('corpus').checked = S.corpus;
  if ($('q').value !== S.q) $('q').value = S.q;
}
const toggle = (arr, k, all) => { const on = arr.includes(k); if (on && arr.length === 1) return arr; return on ? arr.filter(x => x !== k) : all.filter(x => x === k || arr.includes(x)); };

// ---- Render ----
const tipEl = $('tip');
const tip = tooltip(tipEl);
let current = [];
function pick(id, scroll) {
  S.sel = id; update();
  if (scroll && window.matchMedia('(max-width: 1020px)').matches) $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function step(d) {
  const list = current.length ? current : ITEMS;
  const i = list.findIndex(it => it.id === S.sel);
  const n = list[Math.max(0, Math.min(list.length - 1, i + d))];
  if (n) { S.sel = n.id; update(); }
}
const set = patch => { Object.assign(S, patch); update(); };

function renderNow() {
  $('now').innerHTML = DYADS.filter(d => !d.d1only).map(d => {
    const p = placement(d.id, LAST, 12);
    return `<li><button type="button" class="linkbtn" data-dy="${d.id}">${esc(d.name)}</button><span class="rbar"><i style="width:${(p.rung / 12 * 100).toFixed(0)}%"></i></span><span class="num">${p.rung || '–'}</span>
      <span class="fine nw">${p.rung ? esc(RUNGS[p.rung]) : 'No placed item'}</span></li>`;
  }).join('');
  $('now').querySelectorAll('[data-dy]').forEach(b => { b.onclick = () => set({ view: 'ladder', dyad: b.dataset.dy, asOf: LAST }); });
}

function update() {
  renderControls();
  const V = $('view');
  V.dataset.v = S.view;
  current = [];
  if (S.view === 'timeline') {
    current = filterItems(S);
    V.innerHTML = `<div class="card chartcard"><div class="chart-h"><p class="eyebrow">Nuclear signalling by state</p><p class="fine" id="count"></p></div>
      <ul class="keyrow">${CATS.map(c => `<li><svg viewBox="-6 -6 12 12" aria-hidden="true"><path d="${glyphPath(c.k)}" style="fill:${CAT_COL[c.k]}"/></svg>${esc(c.n)}</li>`).join('')}</ul>
      <div class="chartbox"><svg id="tl" class="chart" role="group" aria-label="Timeline of nuclear signalling items by state. Use the list below to reach every item by keyboard."></svg></div><div id="tl-export"></div></div>
      <div class="card"><p class="eyebrow">Items in view, newest first</p><ol class="list" id="list"></ol></div>`;
    drawTimeline($('tl'), current, S, { onPick: pick, tip });
    const sorted = [...current].sort((a, b) => b.d.localeCompare(a.d));
    renderList($('list'), sorted, S.sel, pick, S.limit, () => { S.limit += 100; update(); });
    const ev = current.filter(i => i.from !== 'cx').length;
    $('count').textContent = `${ev.toLocaleString('en-US')} events and ${(current.length - ev).toLocaleString('en-US')} corpus sentences in view`;
    addExportBar($('tl-export'), { target: () => $('tl'), title: () => `Nuclear signalling, ${RANGES.find(r => r.k === S.range).n}`,
      note: 'Data: Nuclear Signals Observatory (datasets of eight Interactive Deterrence tools, verified events, rhetoric corpus)',
      csv: () => [['date', 'precision', 'category', 'states', 'title', 'rung', 'rule', 'dyads', 'source'], ...sorted.map(i => [i.d, i.prec, i.cat, i.st.join(' '), i.t, i.rung || '', i.rule, (i.dy || []).join(' '), i.src[0][1]])] });
    current = sorted;
  } else if (S.view === 'dossier') {
    renderDossier(V, S, { onPick: pick, setState: s => set({ dossier: s }), setDyad: (dy, rc) => (rc ? set({ view: 'rhet', rc }) : set({ view: 'ladder', dyad: dy, asOf: LAST })) });
  } else if (S.view === 'ladder') {
    renderLadder(V, S, { onPick: pick, set });
  } else if (S.view === 'rhet') {
    V.innerHTML = '<div id="rhet-root"></div>';
    renderSeries($('rhet-root'), S, { onPick: pick, set, tip });
  } else {
    renderMethod(V);
  }
  renderDetail($('detail'), byId.get(S.sel), S.sel ? step : null);
  renderNow();
  writeHash();
}
const glyphPath = k => glyph(k, 10);

// ---- Wiring ----
readHash();
$('corpus').onchange = e => { S.corpus = e.target.checked; update(); };
let qt;
$('q').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value; S.limit = 50; update(); }, 200); };
$('copy').onclick = async () => { try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Copied'; } catch { $('copy').textContent = 'Copy failed'; } setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1500); };
$('reset').onclick = () => { Object.assign(S, DEF, { states: [...LANES], cats: [...CAT_KEYS] }); setRange('now'); update(); };
const tour = createTour($('stage'), patch => { Object.assign(S, DEF, { states: [...LANES], cats: [...CAT_KEYS] }, patch); setRange(patch.range || 'now'); update(); });
$('tour-btn').onclick = () => tour.start();
document.addEventListener('keydown', e => {
  if (!S.sel || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { if (document.activeElement.closest('#tabs')) return; step(e.key === 'ArrowRight' ? 1 : -1); }
});
let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(update, 150); });
update();
