// Critical-Minerals Chokepoint Twin: state, URL hash, controls and rendering.
import { CHAIN } from '../data/chain.js';
import { SCENARIOS, ASSUMPTIONS, FLEX_DEFAULT } from '../data/scenarios.js';
import { simulate, HORIZON } from './model.js';
import { drawFlow, stageRows, colorOf, esc } from './flow.js';
import { drawSim, simLegend, pct } from './simchart.js';
import { renderHeat, renderUses, renderControls, renderMethod, renderSources } from './panels.js';
import { createTour } from './tour.js';

document.title = 'Critical-Minerals Chokepoint Twin | Interactive Deterrence';
const $ = id => document.getElementById(id);
const BY = Object.fromEntries(CHAIN.minerals.map(m => [m.id, m]));
const SC = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));
const firstScenario = m => (SCENARIOS.find(s => s.m === m && !s.of) || { id: 'custom' }).id;
const defaults = m => {
  const p = Object.fromEntries(Object.entries(ASSUMPTIONS).map(([k, a]) => [k, a.v]));
  p.flex = FLEX_DEFAULT[m];
  if (BY[m].usStocks) p.buffer = BY[m].usStocks.months;
  return p;
};
const actorsOf = m => {
  const tot = {};
  BY[m].stages.forEach(s => Object.entries(s.shares).forEach(([c, v]) => { if (!/^Other/.test(c)) tot[c] = Math.max(tot[c] || 0, v); }));
  return Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([c]) => c);
};

const S = { m: 'ree', sc: 'ree-ban', basis: 'world', open: true, dur: 24, cov: {}, cu: { a: 'China', st: [], c: 100 }, p: defaults('ree'), month: 12, all: false };

function applyScenario(id, keepCov = false) {
  S.sc = id;
  if (!keepCov) S.cov = {};
  const sc = SC[id];
  S.p = { ...defaults(S.m), ...(sc && sc.set ? sc.set : {}) };
  if (sc && sc.months) { S.open = false; S.dur = sc.months; } else if (!keepCov) { S.open = true; }
  if (id === 'custom' && !S.cu.st.length) { S.cu.a = actorsOf(S.m)[0]; S.cu.st = BY[S.m].stages.filter(s => s.shares[S.cu.a]).map(s => s.id); }
}

function hits() {
  if (S.sc === 'none') return [];
  if (S.sc === 'custom') return S.cu.st.filter(st => (BY[S.m].stages.find(s => s.id === st).shares[S.cu.a] || 0) > 0).map(st => ({ st, a: S.cu.a, c: S.cu.c }));
  return SC[S.sc].hits.map((h, i) => ({ ...h, c: S.cov[i] ?? h.c }));
}

// ---- Hash ------------------------------------------------------------------------------------
function writeHash() {
  const q = new URLSearchParams();
  q.set('m', S.m); q.set('s', S.sc);
  if (S.basis !== 'world') q.set('b', S.basis);
  if (!S.open) q.set('d', S.dur);
  Object.entries(S.cov).forEach(([i, v]) => q.set('c' + i, v));
  if (S.sc === 'custom') { q.set('ca', S.cu.a); q.set('cs', S.cu.st.join('.')); q.set('cc', S.cu.c); }
  const base = { ...defaults(S.m), ...((SC[S.sc] || {}).set || {}) };
  Object.entries(S.p).forEach(([k, v]) => { if (v !== base[k]) q.set('p_' + k, v); });
  if (S.month !== 12) q.set('t', S.month);
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const m = q.get('m');
  if (!BY[m]) return;
  S.m = m;
  const sc = q.get('s');
  const valid = sc === 'none' || sc === 'custom' || (SC[sc] && SC[sc].m === m);
  if (sc === 'custom') {
    const a = q.get('ca'); const st = (q.get('cs') || '').split('.').filter(x => BY[m].stages.some(s => s.id === x));
    if (actorsOf(m).includes(a)) S.cu = { a, st, c: clamp(+q.get('cc') || 100, 0, 100) };
  }
  applyScenario(valid ? sc : firstScenario(m));
  if (q.get('b') === 'us') S.basis = 'us';
  if (q.has('d')) { S.open = false; S.dur = clamp(+q.get('d') || 24, 3, 120); }
  for (const [k, v] of q) {
    if (/^c\d$/.test(k)) S.cov[k.slice(1)] = clamp(+v, 0, 100);
    if (k.startsWith('p_') && ASSUMPTIONS[k.slice(2)]) { const a = ASSUMPTIONS[k.slice(2)]; S.p[k.slice(2)] = clamp(+v, a.min, a.max); }
  }
  if (q.has('t')) S.month = clamp(+q.get('t') || 0, 0, HORIZON - 1);
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, Number.isFinite(v) ? v : a));

// ---- Controls --------------------------------------------------------------------------------
function buildMinerals() {
  $('minerals').innerHTML = CHAIN.minerals.map(m => `<button type="button" class="btn" data-m="${m.id}" aria-pressed="${m.id === S.m}">${esc(m.short)}</button>`).join('');
  $('minerals').querySelectorAll('button').forEach(b => b.addEventListener('click', () => pickMineral(b.dataset.m)));
}
function pickMineral(id) {
  S.m = id; S.cu = { a: 'China', st: [], c: 100 };
  applyScenario(firstScenario(id));
  render();
}

function buildScenarioPanel() {
  const list = [...SCENARIOS.filter(s => s.m === S.m), { id: 'custom', label: 'Build your own shock', status: 'custom' }, { id: 'none', label: 'No shock (baseline)', status: '' }];
  $('scenarios').innerHTML = list.map(s => `<button type="button" data-s="${s.id}" aria-pressed="${s.id === S.sc}">${esc(s.label)}${s.status ? `<span class="st">${s.status === 'announced' ? 'mirrors an announced measure' : s.status === 'stress' ? 'stress test' : 'choose actor and stages'}</span>` : ''}</button>`).join('');
  $('scenarios').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { applyScenario(b.dataset.s); render(); }));
  const sc = SC[S.sc];
  $('sc-basis').textContent = sc ? sc.basis : S.sc === 'custom' ? 'Pick who withholds output and at which stages. A stress test, not a forecast.' : 'No shock: every stage delivers its pre-shock flow.';
  // Custom builder
  $('custom').hidden = S.sc !== 'custom';
  if (S.sc === 'custom') {
    $('cu-actor').innerHTML = actorsOf(S.m).map(a => `<option ${a === S.cu.a ? 'selected' : ''}>${esc(a)}</option>`).join('');
    $('cu-stages').innerHTML = BY[S.m].stages.map(s => {
      const has = (s.shares[S.cu.a] || 0) > 0;
      return `<label><input type="checkbox" value="${s.id}" ${S.cu.st.includes(s.id) ? 'checked' : ''} ${has ? '' : 'disabled'}>${esc(s.label)}${has ? ` (${s.shares[S.cu.a]}%)` : ' (none)'}</label>`;
    }).join('');
  }
  // Coverage sliders, one per hit
  const hs = hits();
  const H = S.sc === 'custom' ? [{ st: 'all', a: S.cu.a, c: S.cu.c, custom: true }] : hs;
  $('hits').innerHTML = H.map((h, i) => {
    const st = BY[S.m].stages.find(s => s.id === h.st);
    const lab = h.custom ? `Share of ${esc(h.a)}’s output withheld` : `${esc(h.a)} withholds at ${esc(st.label.toLowerCase())}`;
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

function buildBasis() {
  const m = BY[S.m];
  $('basis').innerHTML = [['world', 'World pool'], ['us', 'U.S. direct imports']].map(([k, l]) => `<button type="button" class="btn" data-b="${k}" aria-pressed="${S.basis === k}">${l}</button>`).join('');
  $('basis').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.basis = b.dataset.b; render(); }));
  const imp = m.usImports;
  $('basis-note').innerHTML = S.basis === 'us'
    ? `U.S. net import reliance ${m.usNir.atLeast ? 'over ' : ''}${m.usNir.value}% (${esc(m.usNir.label)}) × the actor’s share of U.S. imports (${esc(imp.basis)}: ${Object.entries(imp.shares).map(([c, v]) => `${esc(c)} ${v}%`).join(', ')}). USGS MCS 2026. Direct imports only, a lower bound.${imp.caveat ? ' ' + esc(imp.caveat) : ''}`
    : 'Buyers outside the actor share world output pro rata. Overstates the loss where the actor uses much of its own output. See Method.';
}

function buildSliders() {
  const hitKinds = new Set(hits().map(h => BY[S.m].stages.find(s => s.id === h.st).kind));
  const rel = { lagMine: hitKinds.has('mine'), lagRefine: hitKinds.has('refine'), lagComp: hitKinds.has('component'),
    restart: BY[S.m].stages.some(s => s.capacity || s.idle) };
  $('sliders').innerHTML = Object.entries(ASSUMPTIONS).map(([k, a]) => {
    const off = rel[k] === false;
    const v = S.p[k];
    return `<div class="slider${off ? ' dis' : ''}"><span class="sl-h"><label for="as-${k}">${esc(a.label)}</label><output id="as-${k}-o">${fmtA(k, v)}</output></span>
      <input type="range" id="as-${k}" data-k="${k}" min="${a.min}" max="${a.max}" step="${a.step}" value="${v}">
      <small class="why">${esc(a.why)}${off ? ' Not used for this shock.' : ''}</small></div>`;
  }).join('');
  $('sliders').querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
    S.p[inp.dataset.k] = +inp.value; $(`as-${inp.dataset.k}-o`).textContent = fmtA(inp.dataset.k, +inp.value); update();
  }));
}
const fmtA = (k, v) => `${v} ${ASSUMPTIONS[k].unit}`;

// ---- Render ----------------------------------------------------------------------------------
let run = null;
function render() {
  $('minerals').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === S.m));
  buildScenarioPanel(); buildBasis(); buildSliders();
  renderHeat($('heat'), S.m, id => { pickMineral(id); $('flow-card').scrollIntoView({ block: 'start' }); });
  renderUses($('uses'), $('use-scale'), S.m);
  renderControls($('controls'), $('ctl-note'), S.m, S.all);
  update();
}

function update() {
  const m = BY[S.m];
  const h = hits();
  run = simulate(m, h, S.p, { basis: S.basis, months: S.open ? Infinity : S.dur });
  drawFlow($('flow'), $('flow-tip'), m, run.losses, h, { basis: S.basis });
  $('flow-h').textContent = `${m.name}: supply chain by stage`;
  const legend = new Map();
  m.stages.forEach(s => stageRows(s).forEach(r => { if (!legend.has(r.c) && legend.size < 9) legend.set(r.c, colorOf(r.c, legend.size)); }));
  $('flow-legend').innerHTML = h.length && S.basis !== 'us' ? '<li><span class="sw" style="background:repeating-linear-gradient(45deg,var(--bad) 0 2px,transparent 2px 5px)"></span>Withheld in this shock</li>' : '';
  const lead = m.stages.filter(s => Object.keys(s.shares).length).map(s => { const r = stageRows(s)[0]; return `${s.label}: ${r.c} ${r.v}%`; });
  $('flow-desc').textContent = `Largest producer at each stage: ${lead.join('; ')}. Bands link one country across stages; they are not trade flows.`;
  drawSim($('sim'), $('sim-tip'), m, run, S.month, t => { S.month = t; $('scrub').value = t; update(); });
  simLegend($('sim-legend'), m, run);
  $('scrub').value = S.month; $('scrub-o').textContent = `${S.month} (year ${(S.month / 12).toFixed(1)})`;
  readouts(m, run);
  writeHash();
}

function readouts(m, r) {
  const st = id => (id ? m.stages.find(s => s.id === id).label : 'none');
  const hit = r.hitStages.length > 0;
  let s, b, sub;
  if (!hit) { s = 'good'; b = 'No shock'; sub = S.sc === 'none' ? 'Baseline: every stage delivers its pre-shock flow.' : 'This actor has no share at the chosen stages.'; }
  else if (r.peak < 0.005) { s = r.draw.some(x => x > 0) ? 'warn' : 'good'; b = r.draw.some(x => x > 0) ? 'Stocks cover the gap' : 'No shortfall'; sub = `Narrowest stage: ${st(r.binder)}.`; }
  else { s = 'bad'; b = `Short for ${r.shortMonths} months`; sub = `${st(r.binder)} binds. Peak shortfall ${pct(r.peak)} of pre-shock demand${r.open ? '; not recovered within ten years under these assumptions' : ''}.`; }
  $('status').dataset.s = s; $('st-b').textContent = b; $('st-s').textContent = sub;
  const t = S.month;
  const rows = hit ? [
    ['Binding stage', st(r.binder)],
    ['Left at shock start', pct(r.thr[0])],
    ['Stocks last until', r.lastDraw >= 0 ? `month ${r.lastDraw}` : 'not drawn'],
    ['First short month', r.firstShort >= 0 ? `month ${r.firstShort}` : 'none'],
    ['Peak shortfall', pct(r.peak)],
    ['Lost supply, total', `${r.cum.toFixed(1)} months of use`],
    ['Supply meets demand', r.open ? 'not within 10 years' : r.recover === 0 ? 'throughout' : `from month ${r.recover}`],
    [`Month ${t}: supply`, `${pct(r.thr[t])} of pre-shock`],
    [`Month ${t}: short`, pct(r.short[t])],
  ] : [['U.S. import reliance', `${m.usNir.atLeast ? '>' : ''}${m.usNir.value}%`]];
  $('readout').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  $('sim-desc').textContent = hit
    ? `Supply reaching buyers outside the restricting country, month by month, as a share of pre-shock flow. ${b}. Every input except the country shares is an assumption set in the side panel.`
    : 'No shock selected. Pick one in the side panel.';
}

// ---- Wiring ----------------------------------------------------------------------------------
$('open').addEventListener('change', e => { S.open = e.target.checked; buildScenarioPanel(); update(); });
$('dur').addEventListener('input', e => { S.dur = +e.target.value; $('dur-o').textContent = `${S.dur} months`; update(); });
$('scrub').addEventListener('input', e => { S.month = +e.target.value; update(); });
$('cu-actor').addEventListener('change', e => { S.cu.a = e.target.value; S.cu.st = BY[S.m].stages.filter(s => s.shares[S.cu.a]).map(s => s.id); render(); });
$('cu-stages').addEventListener('change', () => { S.cu.st = [...$('cu-stages').querySelectorAll('input:checked')].map(i => i.value); render(); });
$('ctl-all').addEventListener('change', e => { S.all = e.target.checked; renderControls($('controls'), $('ctl-note'), S.m, S.all); });
$('reset').addEventListener('click', () => { S.basis = 'world'; S.month = 12; S.m = 'ree'; S.cu = { a: 'China', st: [], c: 100 }; applyScenario('ree-ban'); render(); });
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Copied'; } catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1500);
});
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(update, 150); });

const tour = createTour($('stage'), set => {
  if (set.m) { S.m = set.m; S.cu = { a: 'China', st: [], c: 100 }; }
  applyScenario(set.s || firstScenario(S.m));
  S.basis = set.b || 'world';
  if (set.month != null) S.month = set.month;
  Object.assign(S.p, set.p || {});
  render();
});
$('tour-btn').addEventListener('click', () => tour.start());

buildMinerals();
readHash();
buildMinerals();
renderMethod($('method'));
renderSources($('sources'), $('cite'));
render();
