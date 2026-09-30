// Airlift: Berlin 1948-49. Page controller: game state, run loop, rendering and the URL hash.
import { COEF, COEF_DEFAULT } from '../data/params.js';
import { MONTHLY, SOURCES } from '../data/history.js';
import { newGame, capacity, requirement, PLAN_DEFAULT } from './model.js';
import { run, choose, dueEvent, request } from './play.js';
import { drawMap } from './map.js';
import { drawChart, describeDay, LEGENDS, HIST_CUM } from './charts.js';
import { bindPanel, renderPanel, renderCoefs } from './panel.js';
import { showEvent, showDebrief } from './story.js';
import { createTour } from './tour.js';
import { afterRender, press } from './fx.js';
import { N_DAYS, dateOf, fmt, fmtDate, monLabel, esc } from './util.js';

const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let g, tab = 'daily', cursor = null, busy = false, chartApi = null;

// ---------- URL hash ----------
const PKEYS = { n: 'north', c: 'c47', d: 'dak', i: 'interval', a: 'approach', h: 'hours', f: 'field', co: 'coal', fo: 'food', b: 'build', pr: 'prio' };
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const seed = Number(q.get('seed')) || 1948;
  const plan = {};
  for (const [s, k] of Object.entries(PKEYS)) {
    if (!q.has(s)) continue;
    const v = q.get(s), def = PLAN_DEFAULT[k];
    plan[k] = typeof def === 'boolean' ? v === '1' : typeof def === 'number' ? Number(v) : v;
  }
  const coef = {};
  for (const part of (q.get('k') || '').split(',').filter(Boolean)) {
    const [k, v] = part.split(':'); const c = COEF.find(x => x.k === k);
    if (c && Number.isFinite(Number(v))) coef[k] = Math.max(c.min, Math.min(c.max, Number(v)));
  }
  return { seed, plan, coef, auto: q.get('auto') === '1' };
}
function writeHash() {
  const q = new URLSearchParams();
  q.set('seed', g.seed);
  for (const [s, k] of Object.entries(PKEYS)) {
    const v = g.plan[k];
    if (v !== PLAN_DEFAULT[k]) q.set(s, typeof v === 'boolean' ? (v ? '1' : '0') : v);
  }
  const diffs = COEF.filter(c => g.coef[c.k] !== c.v).map(c => `${c.k}:${g.coef[c.k]}`);
  if (diffs.length) q.set('k', diffs.join(','));
  if ($('autopilot').checked) q.set('auto', '1');
  history.replaceState(null, '', '#' + q.toString());
}

// ---------- Game flow ----------
function start(seed, plan, coef) {
  g = newGame(seed, coef, plan);
  cursor = null;
  renderCoefs(g, onCoef);
  render();
  offerEvent();
}

function offerEvent() {
  const ev = g.over ? null : dueEvent(g);
  showEvent(ev, i => { choose(g, ev, i); showEvent(null); render(); writeHash(); offerEvent(); });
  setBusy(busy);
}

function setBusy(b) {
  busy = b;
  const blocked = b || g.over || !$('event').hidden;
  for (const id of ['run-day', 'run-week', 'run-month']) $(id).disabled = blocked;
}

async function fly(days) {
  if (busy || g.over || !$('event').hidden) return;
  setBusy(true);
  cursor = null;
  const auto = $('autopilot').checked;
  const delay = reduce ? 0 : days > 7 ? 35 : 70;
  for (let i = 0; i < days && !g.over; i++) {
    const ev = run(g, 1, { auto });
    if (ev && !auto) break;
    if (delay) { render(); await new Promise(r => setTimeout(r, delay)); }
  }
  setBusy(false);
  render();
  offerEvent();
}

function onPlan() { writeHash(); render(); }
function onCoef(k, v) { g.coef[k] = v; writeHash(); render(); }

// ---------- Rendering ----------
function render() {
  const n = g.rec.length, last = g.rec[n - 1];
  const day = Math.min(g.day, N_DAYS - 1), d = dateOf(day);
  const q = requirement(d);
  $('st-week').textContent = g.over ? 'Season over' : `Week ${Math.floor(g.day / 7) + 1} of ${Math.ceil(N_DAYS / 7)}`;
  $('st-date').textContent = fmtDate(g.over ? dateOf(n - 1) : d);
  $('st-sub').textContent = g.over ? (g.outcome === 'lifted' ? 'Blockade lifted 12 May 1949' : 'The airlift has failed') : `Blockade day ${g.day + 1} · ${N_DAYS - g.day} days to the lifting`;
  const wk = g.rec.slice(-7);
  const avg = wk.length ? wk.reduce((a, r) => a + r.tons, 0) / wk.length : 0;
  $('k-week').textContent = wk.length ? fmt(avg) : '–';
  $('k-week').parentElement.className = 'kpi' + (wk.length ? (avg >= q.total ? ' good' : ' bad') : '');
  $('k-req').textContent = fmt(q.total);
  $('k-cum').textContent = fmt(g.cum);
  $('k-cum-s').textContent = `history: ${fmt(n ? HIST_CUM[n - 1] : 0)}`;
  const acc = g.rec.reduce((a, r) => a + r.acc, 0), fat = g.rec.reduce((a, r) => a + r.fatal, 0);
  $('k-acc').textContent = acc; $('k-acc-s').textContent = `${fat} fatal`;
  meter('m-food', g.stocks.food / q.food, 60, v => `${v.toFixed(0)} days`, 10, 20);
  meter('m-coal', g.stocks.coal / q.coal, 60, v => `${v.toFixed(0)} days`, 10, 20);
  meter('m-sup', g.support, 100, v => v.toFixed(0), 15, 35);
  renderMap();
  renderChart();
  renderLog();
  renderPanel(g);
  showDebrief(g);
  const sc = $('scrub');
  sc.max = Math.max(0, n - 1); sc.disabled = n < 2;
  if (cursor == null) sc.value = sc.max;
  $('scrub-out').textContent = n ? fmtDate(dateOf(cursor ?? n - 1)) : '–';
  setBusy(busy);
  afterRender(g, { cursor, avg: wk.length ? avg : null });
}

function meter(id, v, max, fmtV, bad, warn) {
  const m = $(id);
  m.dataset.s = v < bad ? 'bad' : v < warn ? 'warn' : 'good';
  m.querySelector('i').style.width = Math.max(0, Math.min(100, 100 * v / max)) + '%';
  m.querySelector('.m-v').textContent = fmtV(v);
}

function renderMap() {
  const n = g.rec.length;
  const i = cursor ?? n - 1;
  const r = g.rec[i];
  const d = r ? r.d : dateOf(g.day);
  const tegelOpen = !!g.proj.tegel.done && g.proj.tegel.done <= d;
  let land, slots, wx = null, lead;
  if (r) { land = r.land; slots = r.slots; wx = r.wx; lead = `${cursor != null ? 'Replay' : 'Last day flown'}, ${fmtDate(r.d)}: ${fmt(r.tons)} tons in ${fmt(r.flights)} landings.`; }
  else { const c = capacity(g, d, [0, 0]); land = c.land; slots = c.slots; lead = 'Your plan in good weather, before the first day.'; }
  drawMap($('map'), {
    land, slots, wx, flowN: land.gat + land.teg, flowS: land.thf,
    open: { thf: true, gat: true, teg: tegelOpen }, openNote: { teg: d < '1948-08-05' ? 'not yet begun' : 'under construction' },
    narrow: innerWidth < 560,
    northBases: innerWidth < 560 ? ['Fassberg,', 'Celle and', 'RAF bases'] : ['Wunstorf, Fassberg,', 'Celle, Lübeck and', 'other British bases'],
  });
  const f = k => `${k === 'thf' ? 'Tempelhof' : k === 'gat' ? 'Gatow' : 'Tegel'} ${fmt(land[k])} of ${fmt(slots[k])} slots`;
  $('map-read').textContent = `${lead} ${['thf', 'gat'].concat(tegelOpen ? ['teg'] : []).map(f).join('; ')}.`;
}

function renderChart() {
  const svg = $('chart');
  chartApi = drawChart(svg, tab, g.rec, cursor);
  $('legend').innerHTML = LEGENDS[tab].map(([t, c, l, dash]) => `<li><span class="${t}" style="${t === 'dot' ? `background:${c}` : `border-color:${c};${dash ? 'border-top-style:dashed' : ''}`}"></span>${l}</li>`).join('');
  if (cursor != null) $('hover').innerHTML = describeDay(tab, g.rec, cursor);
}

function renderLog() {
  const items = g.log.slice(-60).reverse();
  $('log').innerHTML = items.length ? items.map(x => `<li><span class="lg-d">${esc(fmtDate(x.d).replace(/ 19\d\d$/, ''))}</span><span class="${x.kind}">${esc(x.text)}</span></li>`).join('') : '<li><span class="lg-d"></span><span>No accidents, openings or decisions logged yet.</span></li>';
}

// ---------- Static sections ----------
function renderStatic() {
  $('histtab').innerHTML = MONTHLY.map(m => `<tr><td>${monLabel(m.m)}</td><td class="num">${fmt(m.total)}</td><td class="num">${fmt(m.total / m.days)}</td><td class="num">${fmt(m.flights)}</td><td class="num">${Math.round(100 * m.coal / m.total)}%</td></tr>`).join('');
  $('srclist').innerHTML = SOURCES.map(s => `<li>${s.text} <a href="${s.url}" target="_blank" rel="noopener">Link</a></li>`).join('');
}

// ---------- Wiring ----------
function init() {
  renderStatic();
  const h = readHash();
  $('autopilot').checked = h.auto;
  bindPanel(() => g, onPlan, () => { request(g); writeHash(); render(); });
  $('run-day').addEventListener('click', () => { press($('run-day')); fly(1); });
  $('run-week').addEventListener('click', () => { press($('run-week')); fly(7); });
  $('run-month').addEventListener('click', () => { press($('run-month')); fly(28); });
  $('autopilot').addEventListener('change', () => { writeHash(); render(); });
  $('newgame').addEventListener('click', () => {
    const seed = 1 + Math.floor(Math.random() * 9999);
    start(seed, {}, { ...g.coef });
    writeHash();
  });
  $('copy').addEventListener('click', async () => {
    writeHash();
    try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Link copied'; }
    catch { $('copy').textContent = 'Copy the address bar'; }
    setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1800);
  });
  $('coef-reset').addEventListener('click', () => { g.coef = { ...COEF_DEFAULT }; renderCoefs(g, onCoef); writeHash(); render(); });
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderChart();
  }));
  const svg = $('chart');
  const pick = e => {
    if (!chartApi) return;
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (svg.viewBox.baseVal.width / rect.width);
    const i = chartApi.dayAt(px);
    $('hover').innerHTML = describeDay(tab, g.rec, i);
  };
  svg.addEventListener('pointermove', pick);
  svg.addEventListener('pointerdown', pick);
  $('scrub').addEventListener('input', e => {
    cursor = Number(e.target.value);
    if (cursor >= g.rec.length - 1 && !g.over) cursor = null;
    renderMap(); renderChart();
    $('scrub-out').textContent = fmtDate(dateOf(cursor ?? g.rec.length - 1));
    if (cursor == null) $('hover').innerHTML = describeDay(tab, g.rec, g.rec.length - 1);
  });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { renderChart(); renderMap(); }, 120); });
  const tour = createTour($('statcard'));
  $('tour-btn').addEventListener('click', () => tour.start());
  start(h.seed, h.plan, h.coef);
  writeHash();
}

init();
