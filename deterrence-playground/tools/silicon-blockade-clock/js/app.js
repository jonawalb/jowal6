// Silicon Blockade Clock: state, controls, rendering, playback and URL hash.
import { SCENARIOS, LEVERS, PARAMS, FIXED, ALTS, HEADLINE } from '../data/chips.js';
import { STOCKS, POLICIES } from '../data/energy.js';
import { simulate, HORIZON } from './model.js';
import { drawWorld, drawTaiwan, WORLD_LAYERS, TW_LINES } from './charts.js';
import { mountMap, drawMap } from './map.js';
import { createTour } from './tour.js';
import { renderBelow } from './method.js';
import { addExportBar } from '../../../shared/js/export.js';
import { fmt } from '../../../shared/js/mapkit.js';

const $ = id => document.getElementById(id);
const H = HORIZON;
const defaults = () => ({
  scen: 'energy', dur: 120, lev: { ...SCENARIOS[1].v }, policy: 'chips', protect: FIXED.protect, stock: 'reported',
  p: Object.fromEntries(PARAMS.map(x => [x.k, x.v])), alts: Object.fromEntries(ALTS.map(a => [a.k, { cap: a.cap, delay: a.delay }])), day: 50,
});
const S = defaults();
let sim = null, playing = false, raf = null, last = null;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pc = (v, dp = 0) => (v * 100).toFixed(dp) + '%';

// ---- Hash -----------------------------------------------------------------------------
const PK = PARAMS.map(x => x.k);
function writeHash() {
  const q = new URLSearchParams({ s: S.scen, d: S.dur, e: S.lev.energyCut, i: S.lev.inputCut, x: S.lev.exportCut,
    r: S.policy, f: S.protect ? 1 : 0, k: S.stock, t: S.day,
    p: PK.map(k => S.p[k]).join('_'), a: ALTS.map(a => `${S.alts[a.k].cap}~${S.alts[a.k].delay}`).join('_') });
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const num = (k, lo, hi) => { const v = parseFloat(q.get(k)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null; };
  if (SCENARIOS.some(s => s.k === q.get('s'))) { S.scen = q.get('s'); S.lev = { ...SCENARIOS.find(s => s.k === S.scen).v }; }
  if (num('d', 7, H) != null) S.dur = Math.round(num('d', 7, H));
  [['e', 'energyCut'], ['i', 'inputCut'], ['x', 'exportCut']].forEach(([h, k]) => { if (num(h, 0, 1) != null) S.lev[k] = num(h, 0, 1); });
  if (POLICIES.some(p => p.k === q.get('r'))) S.policy = q.get('r');
  if (q.has('f')) S.protect = q.get('f') === '1';
  if (STOCKS.some(s => s.k === q.get('k'))) S.stock = q.get('k');
  if (num('t', 0, H - 1) != null) S.day = Math.round(num('t', 0, H - 1));
  if (q.has('p')) q.get('p').split('_').forEach((v, i) => { const P = PARAMS[i], n = parseFloat(v); if (P && Number.isFinite(n)) S.p[P.k] = Math.max(P.min, Math.min(P.max, n)); });
  if (q.has('a')) q.get('a').split('_').forEach((v, i) => { const [c, d] = v.split('~').map(parseFloat); const A = ALTS[i];
    if (A && Number.isFinite(c) && Number.isFinite(d)) S.alts[A.k] = { cap: Math.max(0, Math.min(0.3, c)), delay: Math.max(0, Math.min(720, d)) }; });
}

// ---- Controls ------------------------------------------------------------------------------
const fmtParam = (P, v) => P.pct ? pc(v, P.dp || 0) : `${v} ${P.u}`;
function slider(id, label, min, max, step, why) {
  return `<div class="slider"><div class="sl-h"><label for="${id}">${label}</label><output id="${id}-out"></output></div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}">${why ? `<p class="why">${why}</p>` : ''}</div>`;
}
function mountControls() {
  $('scen-choices').innerHTML = SCENARIOS.map(s => `<button type="button" data-k="${s.k}"><b>${s.n}</b><br><small>${s.s}</small></button>`).join('');
  $('scen-choices').querySelectorAll('button').forEach(b => b.onclick = () => {
    const sc = SCENARIOS.find(s => s.k === b.dataset.k); S.scen = sc.k; S.lev = { ...sc.v }; S.dur = sc.dur; update();
  });
  $('lever-sliders').innerHTML = LEVERS.map(L => slider('lv-' + L.k, L.t, 0, 1, 0.05, L.why)).join('');
  LEVERS.forEach(L => { $('lv-' + L.k).oninput = e => { S.lev[L.k] = +e.target.value; update(); }; });
  $('dur').oninput = e => { S.dur = +e.target.value; update(); };
  $('policy-choices').innerHTML = POLICIES.map(p => `<button type="button" data-k="${p.k}"><b>${p.n}</b><br><small>${p.s}</small></button>`).join('');
  $('policy-choices').querySelectorAll('button').forEach(b => b.onclick = () => { S.policy = b.dataset.k; update(); });
  $('protect').onchange = e => { S.protect = e.target.checked; update(); };
  $('stock-choices').innerHTML = STOCKS.map(s => `<button type="button" data-k="${s.k}"><b>${s.n}</b><br><small>${s.s}</small></button>`).join('');
  $('stock-choices').querySelectorAll('button').forEach(b => b.onclick = () => { S.stock = b.dataset.k; update(); });
  $('param-sliders').innerHTML = PARAMS.map(P => slider('pa-' + P.k, P.t + (P.src ? ' <small>(sourced default)</small>' : ''), P.min, P.max, P.step, P.why)).join('');
  PARAMS.forEach(P => { $('pa-' + P.k).oninput = e => { S.p[P.k] = +e.target.value; update(); }; });
  $('alt-sliders').innerHTML = ALTS.map(A => `<p class="alt-h">${A.n}</p>` +
    slider(`al-${A.k}-delay`, 'Starts after shortfall begins', 0, 720, 10) + slider(`al-${A.k}-cap`, 'Ceiling, share of world output', 0, 0.3, 0.01, A.why)).join('');
  ALTS.forEach(A => {
    $(`al-${A.k}-delay`).oninput = e => { S.alts[A.k].delay = +e.target.value; update(); };
    $(`al-${A.k}-cap`).oninput = e => { S.alts[A.k].cap = +e.target.value; update(); };
  });
  $('reset').onclick = () => { const d = defaults(); S.p = d.p; S.alts = d.alts; S.protect = d.protect; update(); };
  $('day').oninput = e => { stop(); S.day = +e.target.value; renderDay(); writeHash(); };
  $('play').onclick = () => (playing ? stop() : play());
  $('legend-world').innerHTML = WORLD_LAYERS.map(l => `<li><i class="sw" style="background:${l.c}"></i>${l.n}</li>`).join('') +
    '<li><i class="sw gapsw"></i>Short of normal</li><li><i class="sw dash"></i>Normal (above it: catch-up)</li>';
  $('legend-tw').innerHTML = TW_LINES.map(l => `<li><i class="sw line" style="border-color:${l.c}"></i>${l.n}</li>`).join('');
}

function syncControls() {
  const press = (box, k) => $(box).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
  const sc = SCENARIOS.find(s => s.k === S.scen);
  const custom = LEVERS.some(L => Math.abs(S.lev[L.k] - sc.v[L.k]) > 1e-9);
  press('scen-choices', custom ? '' : S.scen);
  $('dur').value = S.dur; $('dur-out').textContent = S.dur + ' days';
  LEVERS.forEach(L => { $('lv-' + L.k).value = S.lev[L.k]; $(`lv-${L.k}-out`).textContent = pc(S.lev[L.k]); });
  press('policy-choices', S.policy);
  $('protect').checked = S.protect;
  press('stock-choices', S.stock);
  $('stock-note').textContent = STOCKS.find(s => s.k === S.stock).note;
  PARAMS.forEach(P => { $('pa-' + P.k).value = S.p[P.k]; $(`pa-${P.k}-out`).textContent = fmtParam(P, S.p[P.k]); });
  ALTS.forEach(A => {
    $(`al-${A.k}-delay`).value = S.alts[A.k].delay; $(`al-${A.k}-delay-out`).textContent = S.alts[A.k].delay + ' days';
    $(`al-${A.k}-cap`).value = S.alts[A.k].cap; $(`al-${A.k}-cap-out`).textContent = pc(S.alts[A.k].cap);
  });
}

// ---- Render ------------------------------------------------------------------------------------
const state = (v, warn = 0.95, bad = 0.5) => (v >= warn ? 'good' : v >= bad ? 'warn' : 'bad');
function chainLinks(d) {
  const st = d.stock, stock0 = STOCKS.find(s => s.k === S.stock).v;
  const fuel = Math.min(1, (st.lng + st.coal) / (stock0.lng + stock0.coal));
  return [
    { n: 'Gas and coal stocks', v: `${Math.round(st.lng)} + ${Math.round(st.coal)} d`, f: fuel, s: st.coal < 0.5 ? 'bad' : st.lng < 0.5 ? 'warn' : 'good', sub: 'days of gas + coal' },
    { n: 'Grid supply', v: pc(d.grid), f: d.grid, s: state(d.grid, 0.97), sub: 'of normal demand' },
    { n: 'Power to leading-edge fabs', v: pc(d.lePower), f: d.lePower, s: state(d.lePower, 0.999), sub: `chip sector gets ${pc(d.chipPower)}` },
    { n: 'Fab and packaging output', v: pc(d.util), f: d.util, s: state(d.util), sub: `materials ${pc(d.mat)} of stock` },
    { n: 'Chips leaving Taiwan', v: pc(Math.min(d.shipped, 9.99)), f: Math.min(1, d.shipped), s: state(Math.min(1, d.shipped)), sub: d.stranded > 0.5 ? `${Math.round(d.stranded)} days of output stranded` : 'of normal output' },
    { n: 'Finished stock abroad', v: `${(d.invDays / 7).toFixed(1)} wk`, f: d.inv, s: d.inv > 0.5 ? 'good' : d.inv > 0.05 ? 'warn' : 'bad', sub: `of ${S.p.chanWeeks} weeks` },
    { n: 'World deliveries', v: pc(d.delivered), f: Math.min(1, d.delivered), s: state(d.onTime, 0.995, 0.6),
      sub: d.catchUp > 0.001 ? `incl. ${pc(d.catchUp)} catch-up` : `${fmt(d.delivered * FIXED.weeklyUnits)} a week` },
  ];
}

function dayText(d) {
  if (d.t < S.dur) return `of ${S.dur} · ${SCENARIOS.find(s => s.k === S.scen).n.toLowerCase()}`;
  return `· lifted ${d.t - S.dur} day${d.t - S.dur === 1 ? '' : 's'} ago`;
}

function renderDay() {
  const d = sim.days[S.day];
  $('day').value = S.day;
  $('day-n').textContent = 'Day ' + S.day;
  $('day-s').textContent = dayText(d);
  $('chain').innerHTML = chainLinks(d).map(l => `<li class="link" data-s="${l.s}"><span class="nm">${l.n}</span><b class="v num">${l.v}</b>
    <span class="bar" aria-hidden="true"><i style="width:${(Math.max(0, Math.min(1, l.f)) * 100).toFixed(1)}%"></i></span><span class="sub">${l.sub}</span></li>`).join('');
  const scrub = t => { stop(); S.day = t; renderDay(); writeHash(); };
  drawWorld($('world'), sim, S.dur, S.day, scrub);
  drawTaiwan($('taiwan'), sim, S.dur, S.day, scrub);
  drawMap($('map'), d.util);
  const st = $('status');
  st.dataset.s = d.onTime >= 0.995 ? (d.util < 0.95 || d.shipped < 0.95 || d.backlog > 0.01 ? 'warn' : 'good') : d.onTime >= 0.6 ? 'warn' : 'bad';
  const shortTo = sim.shortUnitsTo(S.day), owed = sim.backlogUnitsAt(S.day);
  st.querySelector('b').textContent = d.onTime >= 0.995 ? (d.catchUp > 0.001 ? 'Deliveries normal, catching up' : 'World deliveries normal') : `World deliveries at ${pc(d.onTime)}`;
  st.querySelector('span').textContent = `Day ${S.day}. Taiwan's leading-edge output is at ${pc(d.util)} and ${pc(Math.min(1, d.shipped))} of normal is leaving the island. ` +
    (shortTo > 0 ? `About ${fmt(shortTo)} accelerators missed their date so far; ${fmt(owed)} are still owed.` : 'No deliveries missed so far.');
  $('alts').querySelectorAll('tbody tr').forEach((tr, i) => {
    const v = d.alts[i]; tr.classList.toggle('live', v > 0.0005);
    tr.querySelector('.now').textContent = v > 0.0005 ? pc(v, 1) : '0%';
  });
}

function renderSummary() {
  const shortW = sim.cumShortDays / 7, owedW = sim.backlogEndUnits / FIXED.weeklyUnits;
  const days = v => (v == null ? 'never' : 'day ' + v);
  $('summary').innerHTML = `
    <dt>Taiwan, sub-10nm logic<small>SIA/BCG, 2022 data</small></dt><dd>${HEADLINE.logic.v}<small>of world capacity</small></dd>
    <dt>Taiwan, advanced packaging<small>TSMC fab list; TrendForce</small></dt><dd>${HEADLINE.pack.v}<small>TSMC packaging fabs (5 + AP7)</small></dd>
    <dt>Gas / coal run out</dt><dd>${days(sim.energy.runout.lng)} / ${days(sim.energy.runout.coal)}</dd>
    <dt>Fabs throttle</dt><dd>${days(sim.throttle)}</dd>
    <dt>World shortfall starts</dt><dd>${days(sim.shortDay)}</dd>
    <dt>Lowest deliveries</dt><dd>${pc(sim.worst.onTime)}${sim.worst.onTime < 0.995 ? ', day ' + sim.worst.t : ''}</dd>
    <dt>Not delivered on time<small>late or never</small></dt><dd>${fmt(sim.cumShortUnits)}<small>${shortW.toFixed(1)} weeks of world output</small></dd>
    <dt>Still owed on day 364<small>not yet delivered</small></dt><dd>${fmt(sim.backlogEndUnits)}<small>${owedW.toFixed(1)} weeks of world output</small></dd>
    <dt>Never made<small>output lost for good</small></dt><dd>${fmt(sim.neverMadeUnits)}<small>${(sim.neverMadeUnits / FIXED.weeklyUnits).toFixed(1)} weeks of world output</small></dd>
    <dt>Back to normal rate</dt><dd>${sim.shortDay == null ? 'no shortfall' : days(sim.recover)}</dd>
    <dt>Backlog cleared</dt><dd>${sim.shortDay == null ? 'no shortfall' : sim.cleared == null ? 'not within the year' : 'day ' + sim.cleared}</dd>`;
  $('alts').querySelector('tbody').innerHTML = ALTS.map(A => {
    const a = S.alts[A.k], cur = { ...A, ...a };
    const start = sim.t0 == null ? 'no trigger' : cur.delay + sim.t0 >= H ? `day ${cur.delay + sim.t0} (after window)` : `day ${cur.delay + sim.t0}`;
    return `<tr><td>${A.n}</td><td class="st">${A.status}</td><td class="num">${start}</td><td class="num">+${A.ramp} days</td><td class="num">${pc(a.cap)}</td><td class="num now"></td></tr>`;
  }).join('');
}

function update() {
  const stock = STOCKS.find(s => s.k === S.stock).v;
  sim = simulate({ dur: S.dur, ...S.lev, stock, policy: S.policy, p: { ...S.p, protect: S.protect, weeklyUnits: FIXED.weeklyUnits },
    alts: ALTS.map(A => ({ ...A, ...S.alts[A.k] })) });
  syncControls();
  renderSummary();
  renderDay();
  if (!playing) writeHash();
}

// ---- Playback ------------------------------------------------------------------------------------
function play() {
  if (reduced) { S.day = sim.worst.t; renderDay(); writeHash(); return; }  // jump to the worst day
  if (S.day >= H - 1) S.day = 0;
  playing = true; last = null; $('play').textContent = 'Pause';
  raf = requestAnimationFrame(step);
}
function step(ts) {
  if (!playing) return;
  if (last != null) {
    const next = Math.min(H - 1, S.day + Math.max(0, Math.floor((ts - last) / 45)));
    if (next !== S.day) { S.day = next; last = ts; renderDay(); }
  } else last = ts;
  if (S.day >= H - 1) stop(); else raf = requestAnimationFrame(step);
}
function stop() { if (!playing) return; playing = false; cancelAnimationFrame(raf); $('play').textContent = 'Play'; writeHash(); }

// ---- Boot ------------------------------------------------------------------------------------------
readHash();
mountMap($('map'));
mountControls();
renderBelow();
$('map-note').textContent = 'Circles mark TSMC wafer fabs (all generations) and advanced packaging fabs by city, from TSMC\'s fab list; the Chiayi packaging site is from TrendForce. Shading shows modelled output, which is the same island-wide because the model has one grid.';
const tour = createTour($('stage'), set => {
  stop();
  const sc = SCENARIOS.find(s => s.k === set.scen);
  Object.assign(S, defaults(), { scen: sc.k, lev: { ...sc.v }, dur: set.dur, policy: set.policy, protect: set.protect, day: set.day });
  update();
});
$('tour-btn').onclick = () => tour.start();
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Link copied'; }
  catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1600);
};
document.addEventListener('keydown', e => {
  if (e.key === ' ' && e.target === document.body) { e.preventDefault(); playing ? stop() : play(); }
});
update();
let rz = null;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(renderDay, 120); });
const NOTE = 'Notional model (Silicon Blockade Clock, jwalberg.com); sourced inputs from EIA, MOEA, TSMC, SIA/BCG, Epoch AI';
const title = () => `${$('day-n').textContent} ${$('day-s').textContent}`;
addExportBar($('world'), { target: () => $('world'), title: () => `World AI accelerator deliveries · ${title()}`, note: NOTE, where: 'after',
  csv: () => [['day', 'delivered_on_time', 'catch_up', 'taiwan_chain', 'china_made', 'alternatives', 'stock_abroad_weeks', 'stranded_in_taiwan_days', 'short_units_cum', 'owed_units'],
    ...sim.days.map(d => [d.t, d.onTime.toFixed(4), d.catchUp.toFixed(4), d.twSupply.toFixed(4), d.nonTw.toFixed(4), d.altSum.toFixed(4), (d.invDays / 7).toFixed(2), d.stranded.toFixed(2), Math.round(sim.shortUnitsTo(d.t)), Math.round(sim.backlogUnitsAt(d.t))])] });
addExportBar($('taiwan'), { target: () => $('taiwan'), title: () => `Inside Taiwan · ${title()}`, note: NOTE, where: 'after' });
