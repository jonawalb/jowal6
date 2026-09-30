// Markets vs. Analysts: state, URL hash, wiring.
import { BY_ID, BUILT, DATA_LAST, dayOf, isoOf, nice, AIR_LAST, TSM, AIR, priceAt } from './series.js';
import { dayLink, exerciseFor, exerciseLink, linkHtml } from '../../../shared/js/links.js';
import { SITE } from '../../../shared/js/site.js';
import { addExportBar } from '../../../shared/js/export.js';
import { createChart, colorOf } from './chart.js';
import { createBrush } from './brush.js';
import { crossCorr, drawXcorr, xcorrText } from './xcorr.js';
import { panelHtml, syncPicker, focusHtml, PRESETS, MAX_SEL } from './panel.js';
import { createTour } from './tour.js';

const $ = id => document.getElementById(id);

const S = {
  markets: [], focus: null, preset: null, win: [0, 0],
  show: { air: true, jcrp: true, ex: true },
  xc: { src: '7', diff: true, lag: 21 },
};

function applyPreset(k) {
  const p = PRESETS.find(x => x.k === k); if (!p) return;
  S.preset = k;
  S.markets = [...p.ids];
  const ms = p.ids.map(id => BY_ID.get(id));
  const a = p.win[0] ? dayOf(p.win[0]) : Math.min(...ms.map(m => m.first)) - 3;
  S.win = [a, p.win[1] ? dayOf(p.win[1]) : DATA_LAST];
  if (!S.markets.includes(S.focus)) S.focus = S.markets[S.markets.length > 0 ? 0 : -1] ?? null;
}

// ---- hash ------------------------------------------------------------------------------
function writeHash() {
  const q = new URLSearchParams({
    m: S.markets.join(','), f: S.focus || '', from: isoOf(S.win[0]), to: isoOf(S.win[1]),
    ov: Object.keys(S.show).filter(k => S.show[k]).join(','), xc: `${S.xc.src}${S.xc.diff ? 'd' : 'l'}${S.xc.lag}`,
  });
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const ids = (q.get('m') || '').split(',').filter(id => BY_ID.has(id)).slice(0, MAX_SEL);
  if (!ids.length) return false;
  S.markets = ids;
  S.focus = ids.includes(q.get('f')) ? q.get('f') : ids[0];
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (iso.test(q.get('from') || '') && iso.test(q.get('to') || '')) S.win = [dayOf(q.get('from')), dayOf(q.get('to'))];
  else S.win = [Math.min(...ids.map(id => BY_ID.get(id).first)), DATA_LAST];
  if (q.has('ov')) { const on = new Set(q.get('ov').split(',')); Object.keys(S.show).forEach(k => { S.show[k] = on.has(k); }); }
  const xc = /^([17])([dl])(\d+)$/.exec(q.get('xc') || '');
  if (xc) S.xc = { src: xc[1], diff: xc[2] === 'd', lag: Math.max(7, Math.min(45, +xc[3])) };
  return true;
}

// ---- mount -----------------------------------------------------------------------------
$('panel').innerHTML = panelHtml();
if (!readHash()) applyPreset('open');

const tip = $('tip');
// Links for the hovered (or clicked) day: A Day in the Strait (2026) and any exercise replay around it.
let pinned = null;
function dayLinks(iso) {
  const box = $('day-links');
  if (!iso) iso = pinned;
  if (!iso) { box.innerHTML = '<span class="fine">Hover or click a day on the chart for links to that day in other tools.</span>'; return; }
  const x = exerciseFor(iso);
  // A Day in the Strait is on Interactive Deterrence only.
  const links = [SITE === 'tsm' ? linkHtml(dayLink(iso), 'See this day in A Day in the Strait') : '', x ? linkHtml(exerciseLink(x.id, iso), `Replay ${x.short}`) : ''].filter(Boolean);
  box.innerHTML = `<span class="fine">${nice(dayOf(iso))}${pinned === iso ? ' (pinned)' : ''}:</span> ` + (links.join('') || '<span class="fine">no linked view for this day.</span>');
}
const chart = createChart($('chart'), tip, iso => { $('focus-card').innerHTML = focusHtml(S, iso); bindFocus(); dayLinks(iso); });
$('chart').addEventListener('click', e => { const d = chart.dayAt(e); pinned = d == null ? null : isoOf(d); dayLinks(pinned); });
const brush = createBrush($('brush'), done => { S.preset = null; draw(done); });

function bindFocus() {
  const sel = $('focus-sel');
  if (sel) sel.onchange = () => { S.focus = sel.value; render(); };
}

function draw(done = true) {
  chart.render(S);
  $('win-label').textContent = `${nice(S.win[0])} – ${nice(S.win[1])} · ${S.win[1] - S.win[0] + 1} days`;
  if (done) { renderSide(); writeHash(); }
}

function renderSide() {
  syncPicker(S);
  $('focus-card').innerHTML = focusHtml(S, null);
  bindFocus();
  const m = BY_ID.get(S.focus);
  if (!m) { $('xc').innerHTML = ''; $('xc-text').innerHTML = ''; return; }
  const res = crossCorr(m, S.win, { src: S.xc.src, diff: S.xc.diff, maxLag: S.xc.lag });
  drawXcorr($('xc'), res, colorOf(S.markets.indexOf(m.id)));
  $('xc-title').textContent = m.label;
  $('xc-text').innerHTML = xcorrText(res, m, S.xc);
  $('xc-diff').checked = S.xc.diff;
  document.querySelectorAll('#xc-src button').forEach(b => b.setAttribute('aria-pressed', b.dataset.src === S.xc.src));
  $('xc-lag').value = S.xc.lag; $('xc-lag-out').textContent = `±${S.xc.lag} days`;
}

function render() { brush.render(S); draw(true); }

// ---- events ----------------------------------------------------------------------------
document.querySelectorAll('.mk').forEach(b => b.onclick = () => {
  const id = b.dataset.id, i = S.markets.indexOf(id);
  S.preset = null;
  if (i >= 0) { S.markets.splice(i, 1); if (S.focus === id) S.focus = S.markets[0] ?? null; }
  else if (S.markets.length < MAX_SEL) {
    S.markets.push(id); S.focus = id;
    const m = BY_ID.get(id);
    if (m.last < S.win[0] || m.first > S.win[1]) S.win = [Math.min(S.win[0], m.first - 3), Math.max(S.win[1], m.last)];
  }
  render();
});
document.querySelectorAll('#presets button').forEach(b => b.onclick = () => { applyPreset(b.dataset.k); render(); });
['air', 'jcrp', 'ex'].forEach(k => { $('ov-' + k).onchange = e => { S.show[k] = e.target.checked; draw(true); }; });
document.querySelectorAll('#xc-src button').forEach(b => b.onclick = () => { S.xc.src = b.dataset.src; renderSide(); writeHash(); });
$('xc-diff').onchange = e => { S.xc.diff = e.target.checked; renderSide(); writeHash(); };
$('xc-lag').oninput = e => { S.xc.lag = +e.target.value; renderSide(); writeHash(); };
document.querySelectorAll('[data-zoom]').forEach(b => b.onclick = () => {
  const n = b.dataset.zoom;
  S.preset = null;
  if (n === 'all') S.win = [Math.min(...S.markets.map(id => BY_ID.get(id).first)) - 3, DATA_LAST];
  else S.win = [DATA_LAST - (+n) + 1, DATA_LAST];
  render();
});

const cs = $('chart');
cs.addEventListener('pointermove', e => chart.hover(chart.dayAt(e), S));
cs.addEventListener('pointerleave', () => chart.hover(null, S));
cs.addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  e.preventDefault();
  cs._d = Math.max(S.win[0], Math.min(S.win[1], (cs._d ?? S.win[1]) + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 7 : 1)));
  chart.hover(cs._d, S);
});
cs.addEventListener('blur', () => { cs._d = null; chart.hover(null, S); });

const tour = createTour($('stagebox'), set => {
  if (set.preset) applyPreset(set.preset);
  if (set.markets) { S.markets = [...set.markets]; S.preset = null; }
  if (set.focus) S.focus = set.focus;
  if (set.win) S.win = [dayOf(set.win[0]), set.win[1] ? dayOf(set.win[1]) : DATA_LAST];
  else if (set.markets) S.win = [Math.min(...S.markets.map(id => BY_ID.get(id).first)) - 3, DATA_LAST];
  if (set.show) Object.assign(S.show, set.show);
  if (set.xc) Object.assign(S.xc, set.xc);
  render();
});
$('start-tour').onclick = () => tour.start();
$('copy-link').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy-link').textContent = 'Link copied'; }
  catch { $('copy-link').textContent = 'Copy the address bar'; }
  setTimeout(() => { $('copy-link').textContent = 'Copy link'; }, 1800);
};

$('asof').textContent = `Markets through ${nice(DATA_LAST)} (built ${BUILT}). PLA aircraft through ${nice(AIR_LAST)} (TSM, as of ${TSM.asOf}).`;
addExportBar($('stagebox'), {
  target: () => $('chart'),
  title: () => `Prediction-market prices${S.show.air ? ' and PLA aircraft' : ''}, ${nice(S.win[0])} to ${nice(S.win[1])}`,
  note: () => `Lines: ${S.markets.map(id => BY_ID.get(id).label).join('; ')}${S.show.air ? '; grey = PLA aircraft, 7-day mean (right axis)' : ''}. Data: Polymarket daily prices; PLA aircraft from TSM PLA Activity Center`,
  csv: () => {
    const ms = S.markets.map(id => BY_ID.get(id));
    const rows = [['date', ...ms.map(m => `${m.label} (price %)`), 'pla_aircraft']];
    for (let d = S.win[0]; d <= S.win[1]; d++) rows.push([isoOf(d), ...ms.map(m => { const p = priceAt(m, d); return p == null ? '' : p.toFixed(1); }), AIR.get(d) ?? '']);
    return rows;
  },
});
dayLinks(null);
let rt;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(render, 120); });
render();
