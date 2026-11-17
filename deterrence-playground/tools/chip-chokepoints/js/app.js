// AI Chip Chokepoint Twin: state, URL hash, controls and rendering.
import { CHAIN } from '../data/chain.js';
import { SCENARIOS, NOTIONAL, LIMITS } from '../data/scenarios.js';
import { simulate, shareOf, HORIZON } from './model.js';
import { drawFlow, wireFlowTip, legendCountries, esc } from './flow.js';
import { drawSim, simLegend, pct } from './simchart.js';
import { renderCard, renderControls, renderHeat, renderMethod, renderSources, ctlCounts } from './panels.js';
import { createTour } from './tour.js';
import { initDetail, setDetail } from './detail.js';
import { CONTROLS } from '../data/controls.js';

document.title = 'AI Chip Chokepoint Twin | Jonathan Walberg';
const $ = id => document.getElementById(id);
const SC = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));
const ST = Object.fromEntries(CHAIN.stages.map(s => [s.id, s]));
const SIM = CHAIN.stages.filter(s => NOTIONAL[s.id]);
const CTL_N = ctlCounts();
const clamp = (v, a, b) => Math.min(b, Math.max(a, Number.isFinite(v) ? v : a));
const defaults = () => Object.fromEntries(Object.entries(NOTIONAL).map(([k, n]) => [k, n.dep != null ? { buffer: n.buffer, lo: n.lo, hi: n.hi, dep: n.dep / 100 } : { buffer: n.buffer, lo: n.lo, hi: n.hi }]));

// Every actor (country or firm) with a share at some simulated stage.
const ACTORS = (() => {
  const set = new Map();
  SIM.forEach(s => {
    Object.keys(s.shares || {}).forEach(c => { if (!/^(Other|Rest)/.test(c)) set.set(c, 'country'); });
    Object.keys(s.firms || {}).forEach(f => { if (!/^(Other|Rest)/.test(f)) set.set(f, 'firm'); });
  });
  return [...set.entries()].sort((a, b) => (a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1] === 'country' ? -1 : 1));
})();

// Simple-mode view state (not in the URL): stage groups opened with "Show all", and the full shock list.
const UI = { expanded: new Set(), moreSc: false };
const TOP_SC = ['nl-euv', 'tw', 'kr-hbm', 'cn-min'];

const S = { sc: SCENARIOS[0].id, cov: {}, cu: { a: 'Taiwan', st: [], c: 100 }, p: defaults(), open: true, dur: 12, month: 12,
  sel: 'euv', overlay: true, cf: { bloc: 'all', node: 'all' } };

function applyScenario(id) {
  S.sc = id; S.cov = {}; S.p = defaults();
  const sc = SC[id];
  if (sc && sc.set) for (const [k, v] of Object.entries(sc.set)) S.p[k] = { ...S.p[k], ...v };
  if (sc && sc.months) { S.open = false; S.dur = sc.months; } else S.open = true;
  if (id === 'custom' && !S.cu.st.length) S.cu.st = SIM.filter(s => shareOf(s, S.cu.a) > 0).map(s => s.id);
  if (sc && sc.hits.length) S.sel = sc.hits[0].st;
}

function hits() {
  if (S.sc === 'none') return [];
  if (S.sc === 'custom') return S.cu.st.filter(st => shareOf(ST[st], S.cu.a) > 0).map(st => ({ st, a: S.cu.a, c: S.cu.c }));
  return SC[S.sc].hits.map((h, i) => ({ ...h, c: S.cov[i] ?? h.c }));
}

// ---- Hash ------------------------------------------------------------------------------------
function writeHash() {
  const q = new URLSearchParams();
  q.set('s', S.sc);
  if (!S.open) q.set('d', S.dur);
  Object.entries(S.cov).forEach(([i, v]) => q.set('c' + i, v));
  if (S.sc === 'custom') { q.set('ca', S.cu.a); q.set('cs', S.cu.st.join('.')); q.set('cc', S.cu.c); }
  const base = defaults();
  const sc = SC[S.sc];
  if (sc && sc.set) for (const [k, v] of Object.entries(sc.set)) base[k] = { ...base[k], ...v };
  for (const [k, a] of Object.entries(S.p)) for (const f of ['buffer', 'lo', 'hi', 'dep']) if (a[f] != null && a[f] !== base[k][f]) q.set(`p_${k}_${f}`, a[f]);
  if (S.month !== 12) q.set('t', S.month);
  q.set('n', S.sel);
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const sc = q.get('s');
  if (!sc || !(sc === 'none' || sc === 'custom' || SC[sc])) return;
  if (sc === 'custom') {
    const a = q.get('ca');
    if (ACTORS.some(([x]) => x === a)) S.cu = { a, st: (q.get('cs') || '').split('.').filter(x => ST[x] && NOTIONAL[x]), c: clamp(+q.get('cc') || 100, 0, 100) };
  }
  applyScenario(sc);
  if (q.has('d')) { S.open = false; S.dur = clamp(+q.get('d') || 12, 1, 120); }
  for (const [k, v] of q) {
    if (/^c\d+$/.test(k)) S.cov[k.slice(1)] = clamp(+v, 0, 100);
    const m = k.match(/^p_(\w+?)_(buffer|lo|hi|dep)$/);
    if (m && S.p[m[1]] && S.p[m[1]][m[2]] != null) S.p[m[1]][m[2]] = clamp(+v, LIMITS[m[2]].min, LIMITS[m[2]].max);
  }
  if (q.has('t')) S.month = clamp(+q.get('t') || 0, 0, HORIZON - 1);
  if (ST[q.get('n')]) S.sel = q.get('n');
}

// ---- Panel controls --------------------------------------------------------------------------
function buildScenarioPanel() {
  const list = [...SCENARIOS, { id: 'custom', label: 'Build your own shock', status: 'custom' }, { id: 'none', label: 'No shock (baseline)', status: '' }];
  const tag = { announced: 'mirrors an announced measure', stress: 'stress test', custom: 'choose actor and stages' };
  const nMore = list.filter(s => !TOP_SC.includes(s.id)).length;
  $('scenarios').classList.toggle('expanded', UI.moreSc);
  $('sc-more').textContent = UI.moreSc ? 'Fewer shocks' : `More shocks (${nMore})`;
  $('sc-more').setAttribute('aria-expanded', UI.moreSc);
  $('scenarios').innerHTML = list.map(s => `<button type="button" data-s="${s.id}" aria-pressed="${s.id === S.sc}"${TOP_SC.includes(s.id) || s.id === S.sc ? '' : ' class="xtra"'}>${esc(s.label)}${s.status ? `<span class="st">${tag[s.status]}</span>` : ''}</button>`).join('');
  $('scenarios').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { applyScenario(b.dataset.s); render(); }));
  const sc = SC[S.sc];
  $('sc-basis').textContent = sc ? sc.basis : S.sc === 'custom' ? 'Pick a country or firm and the stages where its output is lost. A stress test, not a forecast.' : 'No shock: every stage delivers its pre-shock output.';
  $('custom').hidden = S.sc !== 'custom';
  if (S.sc === 'custom') {
    $('cu-actor').innerHTML = ['country', 'firm'].map(t => `<optgroup label="${t === 'country' ? 'Countries' : 'Firms'}">${ACTORS.filter(([, k]) => k === t).map(([a]) => `<option value="${esc(a)}" ${a === S.cu.a ? 'selected' : ''}>${esc(a === 'Europe' ? 'Europe (aggregate rows only; Netherlands, Germany listed separately)' : a)}</option>`).join('')}</optgroup>`).join('');
    $('cu-stages').innerHTML = SIM.map(s => {
      const v = shareOf(s, S.cu.a);
      return v > 0 ? `<label><input type="checkbox" value="${s.id}" ${S.cu.st.includes(s.id) ? 'checked' : ''}>${esc(s.short)} (${Math.round(v * 1000) / 10}%)</label>` : '';
    }).join('') || '<span class="fine">This actor has no share at any simulated stage.</span>';
  }
  const H = S.sc === 'custom' ? [{ custom: true, a: S.cu.a, c: S.cu.c }] : hits();
  $('hits').innerHTML = H.map((h, i) => {
    const lab = h.custom ? `Share of ${esc(h.a)}’s output lost` : `${esc(h.a)} output lost: ${esc(ST[h.st].short)}`;
    return `<div class="slider"><span class="sl-h"><label for="cov${i}">${lab}</label><output>${h.c}%</output></span>
      <input type="range" id="cov${i}" data-i="${i}" min="0" max="100" step="5" value="${h.c}"></div>`;
  }).join('');
  $('hits').querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
    if (S.sc === 'custom') S.cu.c = +inp.value; else S.cov[inp.dataset.i] = +inp.value;
    inp.previousElementSibling.querySelector('output').textContent = inp.value + '%';
    update();
  }));
  $('open').checked = S.open;
  $('dur').value = S.dur; $('dur-o').textContent = `${S.dur} months`;
  $('dur-wrap').classList.toggle('dis', S.open); $('dur').disabled = S.open;
}

function buildSliders() {
  const ids = [...new Set(hits().map(h => h.st))];
  if (!ids.length) { $('sliders').innerHTML = '<p class="fine">Pick a shock to see the assumptions for the stages it hits.</p>'; return; }
  $('sliders').innerHTML = ids.map(id => {
    const a = S.p[id], n = NOTIONAL[id];
    const sl = (f, lab, unit) => `<div class="slider"><span class="sl-h"><label for="as-${id}-${f}">${lab}</label><output id="as-${id}-${f}-o">${fmtP(f, a[f])}</output></span>
      <input type="range" id="as-${id}-${f}" data-k="${id}" data-f="${f}" min="${LIMITS[f].min}" max="${LIMITS[f].max}" step="${LIMITS[f].step}" value="${a[f]}"></div>`;
    return `<fieldset class="asg"><legend>${esc(ST[id].short)}</legend>
      ${sl('buffer', n.bufferLabel || 'Buffer before output falls', 'mo')}
      ${sl('lo', 'Time to substitute, fast', 'mo')}${sl('hi', 'Time to substitute, slow', 'mo')}
      ${a.dep != null ? sl('dep', 'Accelerator output that needs this input', '') : ''}
      <small class="why">${esc(n.why)}</small></fieldset>`;
  }).join('');
  $('sliders').querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
    const { k, f } = inp.dataset;
    S.p[k][f] = +inp.value;
    if (f === 'lo' && S.p[k].hi < S.p[k].lo) S.p[k].hi = S.p[k].lo;
    if (f === 'hi' && S.p[k].lo > S.p[k].hi) S.p[k].lo = S.p[k].hi;
    for (const g of ['lo', 'hi']) { $(`as-${k}-${g}`).value = S.p[k][g]; $(`as-${k}-${g}-o`).textContent = fmtP(g, S.p[k][g]); }
    $(`as-${k}-${f}-o`).textContent = fmtP(f, S.p[k][f]);
    update();
  }));
}

const fmtP = (f, v) => (f === 'dep' ? `${Math.round(v * 100)}%` : `${v} mo`);

// ---- Render ----------------------------------------------------------------------------------
let run = null;
function render() {
  buildScenarioPanel(); buildSliders();
  renderHeat($('heat'), S.sel, pick);
  renderCtl();
  update();
}
function renderCtl() {
  $('cf-bloc').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.b === S.cf.bloc));
  $('cf-node').value = S.cf.node;
  renderControls($('controls'), $('ctl-note'), S.cf);
}
function pick(id) { S.sel = id; update(); $('card').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

function update() {
  const h = hits();
  run = simulate(SIM, h, S.p, { months: S.open ? Infinity : S.dur });
  drawFlow($('flow'), CHAIN, { losses: run.losses, hits: h, ctlCount: CTL_N, overlay: S.overlay, selected: S.sel, expanded: UI.expanded });
  $('flow-legend').innerHTML = legendCountries(CHAIN.stages).map(([c, col]) => `<li><span class="sw" style="background:${col}"></span>${esc(c)}</li>`).join('')
    + '<li><span class="sw" style="background:var(--faint)"></span>Other</li>'
    + (h.length ? '<li><span class="sw hatch"></span>Lost in this shock</li>' : '');
  renderCard($('card'), S.sel, run.losses[S.sel]);
  drawSim($('sim'), $('sim-tip'), CHAIN, run, S.month, t => { S.month = t; update(); });
  simLegend($('sim-legend'), CHAIN, run);
  $('scrub').value = S.month; $('scrub-o').textContent = `${S.month} (year ${(S.month / 12).toFixed(1)})`;
  $('heat').querySelectorAll('tbody tr').forEach(tr => tr.setAttribute('aria-selected', tr.dataset.st === S.sel));
  readouts();
  writeHash();
}

function readouts() {
  const r = run, F = r.fast, L = r.slow;
  const lab = id => (id ? ST[id].short : 'none');
  let s, b, sub;
  if (!r.hitIds.length) { s = 'good'; b = 'No shock'; sub = S.sc === 'none' ? 'Baseline: every stage delivers its pre-shock output.' : 'This actor has no share at the chosen stages.'; }
  else if (L.peak < 0.005) { s = 'warn'; b = 'Buffers cover the shock'; sub = 'Output never falls under these assumptions.'; }
  else { s = L.peak > 0.5 ? 'bad' : 'warn'; b = `Up to ${pct(L.peak)} of world AI accelerator output lost`; sub = `${lab(L.binder)} binds. Impact starts in month ${L.firstHit}.`; }
  $('status').dataset.s = s; $('st-b').textContent = b; $('st-s').textContent = sub;
  const back = c => (c.open ? 'not within 10 years' : c.recover === 0 ? 'never short' : `month ${c.recover}`);
  const t = S.month;
  const rows = r.hitIds.length ? [
    ['Binding stage', lab(L.binder)],
    ['Peak output lost', pct(L.peak)],
    ['First month with a loss', L.firstHit >= 0 ? `month ${L.firstHit}` : 'none'],
    ['Back to full output', `${back(F)} (fast) · ${back(L)} (slow)`],
    ['Output lost, total', `${F.cum.toFixed(1)}–${L.cum.toFixed(1)} months of world output`],
    [`Month ${t}: output`, `${pct(F.thr[t])} (fast) · ${pct(L.thr[t])} (slow)`],
  ] : [['Stages modelled', String(SIM.length)]];
  $('readout').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  $('sim-desc').textContent = r.hitIds.length
    ? `World AI accelerator output the chain can still support, as a share of pre-shock output. ${b}. Buffers and substitution times are notional; set them in the side panel.`
    : 'No shock selected. Pick one in the side panel.';
}

// ---- Wiring ----------------------------------------------------------------------------------
$('flow').addEventListener('click', e => {
  const more = e.target.closest('[data-ph]');
  if (more) {
    const id = more.dataset.ph;
    if (UI.expanded.has(id)) UI.expanded.delete(id); else UI.expanded.add(id);
    update();
    $('flow').querySelector(`[data-ph="${id}"]`)?.focus();
    return;
  }
  const n = e.target.closest('.node'); if (n) pick(n.dataset.st);
});
$('sc-more').addEventListener('click', () => { UI.moreSc = !UI.moreSc; buildScenarioPanel(); });
wireFlowTip($('flow'), $('flow-tip'), CHAIN);
$('overlay').addEventListener('change', e => { S.overlay = e.target.checked; update(); });
$('open').addEventListener('change', e => { S.open = e.target.checked; buildScenarioPanel(); update(); });
$('dur').addEventListener('input', e => { S.dur = +e.target.value; $('dur-o').textContent = `${S.dur} months`; update(); });
$('scrub').addEventListener('input', e => { S.month = +e.target.value; update(); });
$('cu-actor').addEventListener('change', e => { S.cu.a = e.target.value; S.cu.st = SIM.filter(s => shareOf(s, S.cu.a) > 0).map(s => s.id); render(); });
$('cu-stages').addEventListener('change', () => { S.cu.st = [...$('cu-stages').querySelectorAll('input:checked')].map(i => i.value); render(); });
$('cf-bloc').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.cf.bloc = b.dataset.b; renderCtl(); }));
$('cf-node').innerHTML = '<option value="all">All stages</option>' + CHAIN.stages.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join('');
$('cf-node').addEventListener('change', e => { S.cf.node = e.target.value; renderCtl(); });
$('reset').addEventListener('click', () => { S.month = 12; S.cu = { a: 'Taiwan', st: [], c: 100 }; applyScenario(SCENARIOS[0].id); render(); });
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Copied'; } catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1500);
});
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(update, 150); });

const tour = createTour($('stage'), set => {
  applyScenario(set.s || 'none');
  if (set.month != null) S.month = set.month;
  if (set.sel) S.sel = set.sel;
  if (set.p) for (const [k, v] of Object.entries(set.p)) S.p[k] = { ...S.p[k], ...v };
  render();
});
$('tour-btn').addEventListener('click', () => tour.start());

$('ctl-n').textContent = String(CONTROLS.length);
$('to-full').addEventListener('click', () => { setDetail('full'); $('ctl-card').scrollIntoView({ block: 'start' }); $('ctl-card').querySelector('button').focus({ preventScroll: true }); });
initDetail(m => { $('assume').open = m === 'full'; });

$('asof').textContent = CHAIN.retrieved;
readHash();
renderMethod($('method'));
renderSources($('sources'), $('cite'));
render();
