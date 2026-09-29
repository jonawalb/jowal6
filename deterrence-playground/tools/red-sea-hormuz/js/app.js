// Red Sea & Hormuz Pulse: state, URL hash and wiring.
import { escapeHtml } from '../../../shared/js/mapkit.js';
import { addExportBar } from '../../../shared/js/export.js';
import { EVENTS, CATS } from '../data/events.js';
import { PORTWATCH } from '../data/transits.js';
import { PRESETS } from './presets.js';
import { METRICS, validDate, idx, iso, clampIdx, niceDate, N, FIRST, LAST, raw } from './series.js';
import { createCharts } from './charts.js';
import { createMap } from './map.js';
import { buildPanel, renderPanel } from './panel.js';
import { createTour } from './tour.js';

const DEF = PRESETS[0];
const S = { metric: 'total', smooth: 7, from: '2023-01-01', preset: DEF.id, before: [...DEF.before], after: [...DEF.after],
  date: DEF.date, ev: DEF.ev || '', cats: new Set(Object.keys(CATS)), cape: false };

// Read the URL hash
const q = new URLSearchParams(location.hash.slice(1));
if (METRICS[q.get('m')]) S.metric = q.get('m');
if (['1', '7', '30'].includes(q.get('s'))) S.smooth = +q.get('s');
if (['2023-01-01', FIRST, '2025-06-01'].includes(q.get('r'))) S.from = q.get('r');
if (q.has('p')) {
  const p = PRESETS.find(x => x.id === q.get('p'));
  if (p) Object.assign(S, { preset: p.id, before: [...p.before], after: [...p.after], date: p.date, ev: p.ev || '' });
}
const w = k => (q.get(k) || '').split('_');
if (w('b').length === 2 && w('b').every(validDate)) { S.before = w('b').sort(); S.preset = 'custom'; }
if (w('a').length === 2 && w('a').every(validDate)) { S.after = w('a').sort(); S.preset = 'custom'; }
if (validDate(q.get('d'))) S.date = q.get('d');
if (q.has('e')) S.ev = EVENTS.some(e => e.id === q.get('e')) ? q.get('e') : '';
if (q.has('c')) S.cats = new Set(q.get('c').split(',').filter(c => CATS[c]));
if (q.get('cape') === '1') S.cape = true;

buildPanel(document.getElementById('panel'));
const charts = createCharts(document.getElementById('rs-charts'), { onDate: d => { S.date = d; S.ev = ''; update(); }, onEvent: pickEvent });
const card = document.getElementById('rs-evcard');
const map = createMap(document.getElementById('rs-map'), card, { onPick: k => {
  const e = EVENTS.filter(x => x.cp.includes(k) && S.cats.has(x.cat) && x.date <= S.date).pop() || EVENTS.find(x => x.cp.includes(k));
  if (e) pickEvent(e.id);
} });
const slider = document.getElementById('rs-slider');
slider.max = N - 1;

function eventHtml(e) {
  return `<p class="d">${niceDate(e.date)} · ${escapeHtml(CATS[e.cat])}</p><h3>${escapeHtml(e.title)}</h3><p>${escapeHtml(e.desc)}</p>
    <a href="${e.src.url}" target="_blank" rel="noopener">${escapeHtml(e.src.name)}</a>`;
}
function pickEvent(id) {
  const e = EVENTS.find(x => x.id === id);
  if (!e) return;
  S.ev = id; S.date = e.date; S.scrollList = true; update(); S.scrollList = false;
}

function update() {
  const ev = EVENTS.find(e => e.id === S.ev);
  charts.draw(S, EVENTS);
  map.draw(S, ev ? { cp: ev.cp, html: eventHtml(ev) } : null);
  renderPanel(S);
  slider.value = idx(S.date);
  document.getElementById('rs-day').textContent = niceDate(S.date);
  document.getElementById('rs-day-s').textContent = S.smooth > 1 ? `${S.smooth}-day average, ${METRICS[S.metric].label.toLowerCase()}` : `${METRICS[S.metric].label}, daily`;
  const h = new URLSearchParams();
  if (S.metric !== 'total') h.set('m', S.metric);
  if (S.smooth !== 7) h.set('s', S.smooth);
  if (S.from !== '2023-01-01') h.set('r', S.from);
  if (S.preset !== 'custom') h.set('p', S.preset);
  else { h.set('b', S.before.join('_')); h.set('a', S.after.join('_')); }
  h.set('d', S.date);
  if (S.ev) h.set('e', S.ev);
  if (S.cats.size !== Object.keys(CATS).length) h.set('c', [...S.cats].join(','));
  if (S.cape) h.set('cape', '1');
  history.replaceState(null, '', '#' + h.toString());
}

function applyPreset(id) {
  const p = PRESETS.find(x => x.id === id); if (!p) return;
  Object.assign(S, { preset: p.id, before: [...p.before], after: [...p.after], date: p.date, ev: p.ev || '' });
  if (p.from) S.from = p.from;
  update();
}

// Wiring
slider.addEventListener('input', () => { S.date = iso(clampIdx(+slider.value)); S.ev = ''; update(); });
const panel = document.getElementById('panel');
panel.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.p) applyPreset(b.dataset.p);
  else if (b.dataset.m) { S.metric = b.dataset.m; update(); }
  else if (b.dataset.s) { S.smooth = +b.dataset.s; update(); }
  else if (b.dataset.r) { S.from = b.dataset.r; if (S.date < S.from) S.date = S.from; update(); }
  else if (b.dataset.ev) pickEvent(b.dataset.ev);
});
panel.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'rs-cape-tg') { S.cape = t.checked; update(); }
  else if (t.closest('#rs-cats')) { t.checked ? S.cats.add(t.value) : S.cats.delete(t.value); if (S.ev && !S.cats.has(EVENTS.find(x => x.id === S.ev).cat)) S.ev = ''; update(); }
  else if (/^rs-[ba][01]$/.test(t.id) && validDate(t.value)) {
    const win = t.id[3] === 'b' ? S.before : S.after;
    win[+t.id[4]] = t.value; win.sort(); S.preset = 'custom'; update();
  }
});
const tour = createTour(document.getElementById('stage'), set => {
  const p = PRESETS.find(x => x.id === set.preset) || DEF;
  Object.assign(S, { metric: 'total', smooth: 7, from: '2023-01-01', cape: false, cats: new Set(Object.keys(CATS)),
    preset: p.id, before: [...p.before], after: [...p.after], date: p.date, ev: '' }, set.state || {});
  update();
});
document.getElementById('rs-tour').addEventListener('click', () => tour.start());
document.getElementById('rs-copy').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; } catch { b.textContent = 'Copy the address bar'; }
  setTimeout(() => { b.textContent = 'Copy link'; }, 1800);
});
document.getElementById('rs-reset').addEventListener('click', () => { applyPreset(DEF.id); Object.assign(S, { metric: 'total', smooth: 7, from: '2023-01-01', cape: false, cats: new Set(Object.keys(CATS)) }); update(); });

addExportBar(document.getElementById('rs-mapbox'), {
  where: 'after', target: () => document.getElementById('rs-map'),
  title: () => `Ship transits on ${niceDate(S.date)} against the "before" period`,
  note: `IMF PortWatch, retrieved ${PORTWATCH.retrieved}; Natural Earth basemap`,
});
addExportBar(document.getElementById('rs-chartcard'), {
  csv: () => {
    const keys = ['bab', 'suez', 'hormuz', 'cape'];
    const rows = [['date', ...keys.map(k => `${k}_${S.metric}`)]];
    for (let i = idx(S.from); i < N; i++) rows.push([iso(i), ...keys.map(k => raw(k, S.metric)[i] ?? '')]);
    return rows;
  },
  csvLabel: 'Copy daily data as CSV',
});
document.getElementById('rs-asof').textContent = `PortWatch data ${niceDate(FIRST)} to ${niceDate(LAST)}, retrieved ${niceDate(PORTWATCH.retrieved)}.`;
update();
