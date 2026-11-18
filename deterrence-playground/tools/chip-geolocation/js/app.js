// Where Is the Chip? State, controls, verdicts and URL hash.
import { SPEEDS, LINKS, measure, region, verdict, feasible, distKm, simulateRtt } from './geo.js';
import { createMap } from './map.js';
import { createClassifier } from './raster.js';
import { verifierVerdict, attackVerdict, trickNotes } from './text.js';
import { CITIES } from '../data/cities.js';
import { SOURCES, SOURCE_ORDER, TIMELINE, STEPS, CHECKED } from '../data/sources.js';

const d3 = window.d3, topojson = window.topojson;
const EAR = 'China, Hong Kong and Macau';   // HK merged per 85 FR 83765; Macau paired with D:5 in AC/S rules; see Method
const ruleLong = n => n === EAR ? 'China (including Hong Kong and Macau)' : n;
const ruleTag = n => n === EAR ? 'China' : n;
const WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cityIdx = name => CITIES.findIndex(c => c[0] === name);
const cityPos = i => [CITIES[i][3], CITIES[i][2]];
const lmAt = (ci, extra = 0) => ({ ci, name: CITIES[ci][0], pos: cityPos(ci), extra });
const lm = name => lmAt(cityIdx(name));

const NET = {
  route: { n: 'Route inflation', min: 0, max: 0.6, step: 0.05, fmt: v => '+' + Math.round(v * 100) + '%', help: 'Extra path length over the straight line. CSET\'s worst case: +20%.' },
  equip: { n: 'Equipment latency, one way', min: 0.1, max: 3, step: 0.1, fmt: v => v.toFixed(1) + ' ms', help: 'Routers, switches and queues. CSET\'s range: 0.1 to 2 ms.' },
  jitter: { n: 'Jitter, up to', min: 0, max: 5, step: 0.1, fmt: v => v.toFixed(1) + ' ms', help: 'Random extra delay on each measurement. Only ever adds time.' },
};
const ATK = {
  delay: { n: 'Added delay on every reply', min: 0, max: 40, step: 0.5, fmt: v => v.toFixed(1) + ' ms', help: 'The chip waits before answering any landmark.' },
};

const PRESETS = {
  verify: () => ({ mode: 'verify', chip: cityPos(cityIdx('Hanoi')), chipName: 'Hanoi', lms: ['Hanoi', 'Bangkok', 'Vientiane', 'Ho Chi Minh City'].map(lm),
    verifier: 'vacuum', route: 0.2, equip: 0.5, jitter: 0.5, delay: 0, link: 'internet', proxy: '', ruleout: EAR, claim: 'Vietnam', policy: 'strict', seed: 1, view: 'fit', step: 0 }),
  attack: () => ({ mode: 'attack', chip: cityPos(cityIdx('Nanning')), chipName: 'Nanning', lms: ['Hanoi', 'Bangkok', 'Vientiane', 'Ho Chi Minh City'].map(lm),
    verifier: 'vacuum', route: 0.2, equip: 0.5, jitter: 0.5, delay: 0, link: 'internet', proxy: '', ruleout: EAR, claim: 'Vietnam', policy: 'strict', seed: 1, view: 'fit', step: 0 }),
};
let S = PRESETS.verify();

let map = null, cls = null, feats = {}, names = [];

// ---- Detail switch (Simple | Full detail), shared key across the Emerging Technology tools --------
function setDetail(d, save = true) {
  d = d === 'full' ? 'full' : 'simple';
  document.body.classList.toggle('detail-simple', d === 'simple');
  document.body.classList.toggle('detail-full', d === 'full');
  document.querySelectorAll('#detail button').forEach(b => b.setAttribute('aria-pressed', b.dataset.d === d));
  if (save) { try { localStorage.setItem('et-detail', d); } catch { /* storage blocked: keep the in-page choice */ } }
  // Method and sources: always open in Full detail, a collapsed <details> in Simple.
  document.getElementById('msrc').open = d === 'full';
  if (map) update();   // the verdict advice differs between Simple and Full
}
{ let d = 'simple'; try { d = localStorage.getItem('et-detail') || 'simple'; } catch { /* no storage */ } setDetail(d, false); }
document.getElementById('detail').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setDetail(b.dataset.d); });
document.getElementById('tofull').addEventListener('click', () => { document.getElementById('msrc').open = true; document.getElementById('timeline-sec').scrollIntoView({ block: 'start' }); });
let rafId = 0;

// ---- Phone layout: the notional note sits under the map so the verdict and map come first ----------
const PHONE = matchMedia('(max-width: 640px)');
function placeNote() {
  const note = $('simple-note');
  if (PHONE.matches) $('mapbox').after(note); else $('howto').parentElement.insertBefore(note, $('verdict'));
}
PHONE.addEventListener('change', () => { placeNote(); if (map) update(); });
placeNote();
$('v-more').addEventListener('click', () => {
  const open = $('verdict').classList.toggle('open');
  $('v-more').setAttribute('aria-expanded', open); $('v-more').textContent = open ? 'Less' : 'More';
});

// ---- Hash --------------------------------------------------------------------------------------
function writeHash() {
  const q = new URLSearchParams({ m: S.mode, c: S.chip.map(v => v.toFixed(2)).join(','), l: S.lms.map(l => l.ci + (l.extra ? ':' + l.extra : '')).join('.'),
    v: S.verifier, r: S.route, e: S.equip, j: S.jitter, d: S.delay, k: S.link, p: S.proxy, ro: S.ruleout, cl: S.claim, po: S.policy, s: S.seed, vw: S.view, st: S.step });
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (!q.has('m')) return;
  const mode = ['verify', 'attack', 'explain'].includes(q.get('m')) ? q.get('m') : 'verify';
  S = { ...PRESETS[mode === 'attack' ? 'attack' : 'verify'](), mode };
  const c = (q.get('c') || '').split(',').map(Number);
  if (c.length === 2 && c.every(Number.isFinite)) { S.chip = [c[0], Math.max(-85, Math.min(85, c[1]))]; S.chipName = ''; }
  if (q.has('l')) S.lms = q.get('l').split('.').filter(Boolean).map(t => { const [i, x] = t.split(':').map(Number); return CITIES[i] ? lmAt(i, Math.min(50, Math.max(0, x || 0))) : null; }).filter(Boolean);
  if (SPEEDS[q.get('v')]) S.verifier = q.get('v');
  for (const [k, key, f] of [['r', 'route', NET.route], ['e', 'equip', NET.equip], ['j', 'jitter', NET.jitter], ['d', 'delay', ATK.delay]]) {
    const v = parseFloat(q.get(k)); if (Number.isFinite(v)) S[key] = Math.max(f.min, Math.min(f.max, v));
  }
  if (LINKS[q.get('k')]) S.link = q.get('k');
  const p = q.get('p'); if (p === '' || CITIES[+p]) S.proxy = p ?? '';
  if (q.get('ro')) S.ruleout = q.get('ro');
  if (q.get('cl')) S.claim = q.get('cl');
  if (['strict', 'lenient'].includes(q.get('po'))) S.policy = q.get('po');
  S.seed = parseInt(q.get('s')) || 1;
  if (['asia', 'europe', 'americas', 'world', 'fit'].includes(q.get('vw'))) S.view = q.get('vw');
  S.step = Math.max(0, Math.min(STEPS.length - 1, parseInt(q.get('st')) || 0));
}

// ---- Controls -----------------------------------------------------------------------------------
function mountSlider(host, key, f) {
  const id = 'sl-' + key, w = document.createElement('div');
  w.className = 'slider';
  w.innerHTML = `<div class="sl-h"><label for="${id}">${f.n}</label><output for="${id}"></output></div>
    <input type="range" id="${id}" min="${f.min}" max="${f.max}" step="${f.step}"><small>${f.help}</small>`;
  host.appendChild(w);
  const input = w.querySelector('input');
  input.addEventListener('input', () => { S[key] = +input.value; update(); });
  return { sync: () => { input.value = S[key]; w.querySelector('output').textContent = f.fmt(S[key]); } };
}
const sliders = [];

function cityOptions(sel, { none } = {}) {
  const order = CITIES.map((c, i) => i).sort((a, b) => (CITIES[a][1] + CITIES[a][0]).localeCompare(CITIES[b][1] + CITIES[b][0]));
  sel.innerHTML = (none ? `<option value="">${none}</option>` : '') + order.map(i => `<option value="${i}">${esc(CITIES[i][0])}, ${esc(CITIES[i][1])}</option>`).join('');
}

function buildControls() {
  for (const [k, f] of Object.entries(NET)) sliders.push(mountSlider($('netsl'), k, f));
  for (const [k, f] of Object.entries(ATK)) sliders.push(mountSlider($('atksl'), k, f));
  cityOptions($('chipcity'), { none: 'Custom (dragged)' });
  cityOptions($('addlm')); $('addlm').value = String(cityIdx('Singapore'));
  cityOptions($('proxy'), { none: 'No proxy' });
  $('link').innerHTML = Object.entries(LINKS).map(([k, l]) => `<option value="${k}">${l.label}</option>`).join('');
  $('verifier').innerHTML = Object.entries(SPEEDS).map(([k, s]) => `<button type="button" data-k="${k}">${s.label}<small>${s.short === 'c' ? '299.8 km per ms' : s.short === '⅔ c' ? '200 km per ms' : '200 ÷ (1 + inflation)'}</small></button>`).join('');
  const opts = names.map(n => `<option>${esc(n)}</option>`).join('');
  $('ruleout').innerHTML = `<option value="${EAR}">China incl. Hong Kong and Macau (EAR)</option>` + opts; $('claim').innerHTML = opts;

  $('mode').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); });
  $('views').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setView(b.dataset.v); });
  $('verifier').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { S.verifier = b.dataset.k; update(); } });
  $('policy').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { S.policy = b.dataset.p; update(); } });
  $('chipcity').addEventListener('change', e => { const i = e.target.value; if (i === '') return; S.chip = cityPos(+i); S.chipName = CITIES[+i][0]; update(); });
  $('addbtn').addEventListener('click', () => toggleLm(+$('addlm').value, true));
  $('lmhere').addEventListener('click', () => { const ci = chipCity(); if (ci >= 0) toggleLm(ci, true); });
  $('clearlm').addEventListener('click', () => { S.lms = []; update(); });
  $('ruleout').addEventListener('change', e => { S.ruleout = e.target.value; setFeatures(); update(); });
  $('claim').addEventListener('change', e => { S.claim = e.target.value; setFeatures(); update(); });
  $('link').addEventListener('change', e => { S.link = e.target.value; update(); });
  $('proxy').addEventListener('change', e => { S.proxy = e.target.value; update(); });
  $('remeasure').addEventListener('click', () => { S.seed = (S.seed % 9999) + 1; update(); });
  $('reset').addEventListener('click', () => { const m = S.mode; S = PRESETS[m === 'attack' ? 'attack' : 'verify'](); S.mode = m; if (m === 'explain') applyStep(0); setFeatures(); setView(S.view); });
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Copied'; } catch { $('copy').textContent = 'Copy failed'; }
    setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1500);
  });
  $('mtable').addEventListener('click', e => { const b = e.target.closest('button[data-rm]'); if (b) { S.lms.splice(+b.dataset.rm, 1); update(); } });
  $('mtable').addEventListener('change', e => {
    const inp = e.target.closest('input[data-x]'); if (!inp) return;
    S.lms[+inp.dataset.x].extra = Math.max(0, Math.min(50, +inp.value || 0)); update();
  });
}

function toggleLm(ci, addOnly = false) {
  const at = S.lms.findIndex(l => l.ci === ci);
  if (at >= 0) { if (!addOnly) S.lms.splice(at, 1); }
  else if (S.lms.length < 12) S.lms.push(lmAt(ci));
  update();
}

function setMode(m) {
  if (m === S.mode) return;
  const prev = S.mode;
  if (m === 'attack') { S = { ...PRESETS.attack() }; }
  else if (m === 'verify') { S = { ...PRESETS.verify() }; }
  else { S.mode = 'explain'; applyStep(0); }
  if (prev === 'explain' && m !== 'explain') S.step = 0;
  setFeatures(); setView(S.view);
}

function setView(v) { S.view = v; if (v === 'fit') fitRegion(); else map.fit(v); update(); }
function fitRegion() {
  const r = run(S.mode === 'attack', true).reg;
  const lons = r.pts.map(p => p[0]), lats = r.pts.map(p => p[1]);
  // Region, chip and landmarks, padded to at least 16 x 11 degrees so the borders around it stay readable.
  S.lms.forEach(l => { lons.push(l.pos[0]); lats.push(l.pos[1]); });
  lons.push(S.chip[0]); lats.push(S.chip[1]);
  let x0 = Math.min(...lons), x1 = Math.max(...lons), y0 = Math.min(...lats), y1 = Math.max(...lats);
  if (x1 - x0 > 300) { map.fit('world'); return; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = Math.max(8, (x1 - x0) / 2 + 2), hh = Math.max(5.5, (y1 - y0) / 2 + 2);
  map.fit('fit', [[cx - hw, Math.max(-80, cy - hh)], [cx + hw, Math.min(84, cy + hh)]]);
}

function setFeatures() { cls.set(feats[S.ruleout], S.mode === 'attack' ? feats[S.claim] : null); }

// ---- Explainer ---------------------------------------------------------------------------------
function applyStep(i) {
  S.step = i;
  const st = STEPS[i].set;
  const base = PRESETS.verify();
  S = { ...base, mode: 'explain', step: i, chip: cityPos(cityIdx(st.chip)), chipName: st.chip, lms: st.lms.map(lm),
    verifier: st.verifier, route: st.route, equip: st.equip, jitter: st.jitter, delay: st.delay || 0, link: st.link || 'internet', view: st.view };
}
function renderStep() {
  const card = $('stepcard'), s = STEPS[S.step];
  card.innerHTML = `<div class="st-h"><span>Step ${S.step + 1} of ${STEPS.length}</span></div>
    <h3>${s.h}</h3><p>${s.b}</p><p class="fine">Sources: ${s.s.map(k => `<a href="${SOURCES[k].url}" target="_blank" rel="noopener">${esc(SOURCES[k].short)}</a>`).join(' · ')}</p>
    <div class="st-nav"><button type="button" class="btn" data-d="-1" ${S.step === 0 ? 'disabled' : ''}>Back</button>
    <button type="button" class="btn solid" data-d="1">${S.step === STEPS.length - 1 ? 'Try Verifier mode' : 'Next'}</button></div>`;
  card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
    const n = S.step + +b.dataset.d;
    if (n >= STEPS.length) { setMode('verify'); return; }
    applyStep(n); setFeatures(); setView(S.view);
    card.querySelector('.solid')?.focus({ preventScroll: true });
    const sc = STEPS[n].scroll, behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (sc) { $('msrc').open = true; $(sc)?.scrollIntoView({ behavior, block: 'start' }); }   // opens the section without changing Simple/Full
    else if (PHONE.matches) $('mapbox').scrollIntoView({ behavior, block: 'end' });
  });
}

// ---- Model run ----------------------------------------------------------------------------------
function run(attackOn, fast) {
  const proxyPos = attackOn && S.proxy !== '' ? cityPos(+S.proxy) : null;
  const atk = attackOn || S.mode === 'explain' ? { link: S.link, delay: S.delay } : {};
  const lms = S.lms.map(l => ({ pos: l.pos, extra: attackOn ? l.extra : 0 }));
  const meas = measure(lms, S.chip, S, S.verifier, atk, proxyPos, S.seed);
  const reg = region(meas, cls.classify, { maxPts: fast ? 3500 : 9000 });
  const chipC = cls.classify(S.chip[0], S.chip[1]);
  const chipFeasible = meas.length ? feasible(S.chip, meas) : true;
  if (chipFeasible && chipC.r && reg.n) reg.anyR = true;   // the chip's own point is feasible and inside R
  if (chipFeasible && reg.n && !chipC.r) reg.allR = false;
  const v = verdict(reg, { chipInR: chipC.r, chipFeasible, policy: S.policy, needClaim: S.mode === 'attack' });
  return { meas, reg, v: { ...v, chipInR: chipC.r, chipFeasible }, proxyPos };
}

function update() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => { rafId = 0; draw(map.isDragging()); });
}

function draw(fast) {
  document.body.dataset.mode = S.mode;
  const cur = run(S.mode === 'attack', fast);
  const chipLabel = S.mode === 'attack' ? 'Smuggled chip' : 'Chip';
  map.render(S, cur.meas, cur.reg, { ruleFeat: feats[S.ruleout], claimFeat: feats[S.claim], proxyPos: cur.proxyPos, chipLabel });

  // Verdict
  const SV = { ...S, ruleout: ruleLong(S.ruleout), ruleTag: ruleTag(S.ruleout), simple: document.body.classList.contains('detail-simple'), lmAtChip: S.lms.some(l => l.ci === chipCity()) }, vx = { ...cur.v, gridKm: Math.round(cur.reg.step * 111) };
  const vv = S.mode === 'attack' ? attackVerdict(vx, SV) : verifierVerdict(vx, SV);
  $('howto').textContent = S.mode === 'attack'
    ? `Your chip is smuggled into ${ruleTag(S.ruleout)}. Try to pass it off as being in ${S.claim}: drag the chip, or add delay or a proxy in the panel, and see if the check catches you.`
    : PHONE.matches
      ? `Your job: prove the chip is not in ${ruleTag(S.ruleout)}. Each circle is the farthest the chip can be, given how fast it answered. Try it: move the chip with "Put the chip in" below, or tap a city dot to add a landmark server.`
      : `Your job: prove the chip is not in ${ruleTag(S.ruleout)}. Each circle is the farthest the chip can be, given how fast it answered. Try it: move the chip with "Put the chip in" on the right, or click a city dot to add a landmark server.`;
  $('legend-s').textContent = `Green = where the chip could be; red = the part inside ${ruleTag(S.ruleout)}; circles = each landmark's limit.`;
  $('verdict').dataset.s = vv.s; $('v-tag').textContent = vv.tag; $('v-text').textContent = vv.text;
  const fmtA = a => !S.lms.length ? '∞' : a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? Math.round(a / 1000) + 'k' : Math.round(a).toLocaleString('en-US');
  $('k-area').textContent = fmtA(cur.reg.area);
  $('k-share').textContent = !S.lms.length || !cur.reg.n ? '–' : cur.reg.areaR / cur.reg.area < 0.01 && cur.reg.anyR ? '<1%' : Math.round(cur.reg.areaR / cur.reg.area * 100) + '%';
  $('k-share-l').textContent = `Share of area in ${S.ruleout === EAR ? 'China (incl. HK, Macau)' : S.ruleout}`;
  $('k-tight').textContent = cur.meas.length ? Math.round(Math.min(...cur.meas.map(m => m.bound))).toLocaleString('en-US') : '∞';
  $('gridkm').textContent = cur.reg.step ? Math.round(cur.reg.step * 111) : '–';

  // Measurements table
  $('mtable').querySelector('tbody').innerHTML = cur.meas.map((m, i) => {
    const l = S.lms[i], d = distKm(l.pos, S.chip), out = d > m.bound;
    return `<tr${out ? ' class="beaten"' : ''}><th scope="row">${i + 1}. ${esc(l.name)}, ${esc(CITIES[l.ci][1])}</th><td class="num">${Math.round(d).toLocaleString('en-US')}</td>
      <td class="num">${m.rtt.toFixed(2)}</td><td class="num">${Math.round(m.bound).toLocaleString('en-US')}${out ? ' <b class="flag">beaten</b>' : ''}</td>
      <td class="a-only num"><label class="sr" for="x-${i}">Extra delay for ${esc(l.name)}, ms</label><input id="x-${i}" data-x="${i}" type="number" min="0" max="50" step="0.5" value="${l.extra}"></td>
      <td><button type="button" class="x" data-rm="${i}" aria-label="Remove landmark ${esc(l.name)}">×</button></td></tr>`;
  }).join('') || `<tr><td colspan="6" class="fine">No landmarks. Click a city dot on the map or use the panel.</td></tr>`;

  // Attacker feedback
  if (S.mode === 'attack') {
    const base = run(false, true);
    const extraTotal = S.lms.reduce((a, l) => a + l.extra, 0);
    let proxyAdded = null;
    if (cur.proxyPos && S.lms.length) proxyAdded = S.lms.reduce((a, l) => a + simulateRtt(l.pos, S.chip, S, { link: S.link }, cur.proxyPos) - simulateRtt(l.pos, S.chip, S, { link: S.link }), 0) / S.lms.length;
    const strict = verdict(cur.reg, { chipInR: cur.v.chipInR, policy: 'strict', needClaim: true }).pass;
    const lenient = verdict(cur.reg, { chipInR: cur.v.chipInR, policy: 'lenient', needClaim: true }).pass;
    $('score').innerHTML = `<p class="sc-line">Strict policy: <b class="${strict ? 'p' : 'f'}">${strict ? 'passes' : 'fails'}</b> · Lenient policy: <b class="${lenient ? 'p' : 'f'}">${lenient ? 'passes' : 'fails'}</b></p>
      <ul>${trickNotes(S, { ...cur.reg, chipFeasible: cur.v.chipFeasible }, base.reg, extraTotal, proxyAdded).map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
  }
  if (S.mode === 'explain') renderStep();
  syncControls();
  writeHash();
}

function syncControls() {
  sliders.forEach(s => s.sync());
  document.querySelectorAll('#mode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === S.mode));
  document.querySelectorAll('#views button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === S.view));
  document.querySelectorAll('#verifier button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S.verifier));
  document.querySelectorAll('#policy button').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === S.policy));
  $('vnote').textContent = SPEEDS[S.verifier].note;
  const ci = chipCity();
  $('chipcity').value = ci >= 0 ? String(ci) : '';
  const showHere = ci >= 0 && !S.lms.some(l => l.ci === ci) && S.lms.length < 12 && S.mode === 'verify';
  $('lmhere').hidden = !showHere;
  if (showHere) $('lmhere').textContent = `Also add a landmark in ${CITIES[ci][0]}`;
  $('ruleout').value = S.ruleout; $('claim').value = S.claim; $('link').value = S.link; $('proxy').value = S.proxy;
}

function chipCity() { return CITIES.findIndex(c => c[3] === S.chip[0] && c[2] === S.chip[1]); }

function renderBelow() {
  $('asof').textContent = CHECKED; $('asof-s').textContent = CHECKED;
  $('tl').innerHTML = TIMELINE.map(e => `<li><span class="tl-d num">${e.d}</span><p>${esc(e.t)} <a href="${SOURCES[e.s].url}" target="_blank" rel="noopener">Source</a>${e.s2 ? ` · <a href="${SOURCES[e.s2].url}" target="_blank" rel="noopener">${esc(SOURCES[e.s2].short)}</a>` : ''}</p></li>`).join('');
  $('srclist').innerHTML = SOURCE_ORDER.map(k => `<li>${esc(SOURCES[k].cite)} <a href="${SOURCES[k].url}" target="_blank" rel="noopener">Link</a></li>`).join('');
}

// ---- Boot ---------------------------------------------------------------------------------------
async function boot() {
  renderBelow();
  let world;
  try { world = await (await fetch(WORLD_URL)).json(); }
  catch { $('maploading').textContent = 'The map could not load. Check your connection and reload.'; return; }
  const fc = topojson.feature(world, world.objects.countries);
  fc.features.forEach(f => { if (f.properties?.name) feats[f.properties.name] = f; });
  names = Object.keys(feats).sort((a, b) => a.localeCompare(b));
  feats[EAR] = { type: 'FeatureCollection', features: ['China', 'Hong Kong', 'Macao'].map(n => feats[n]).filter(Boolean) };
  const borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);
  cls = createClassifier(d3);
  readHash();
  if (S.mode === 'explain') { const st = S.step; applyStep(st); }
  if (!feats[S.ruleout]) S.ruleout = EAR;
  if (!feats[S.claim]) S.claim = 'Vietnam';
  buildControls();
  map = createMap($('map'), { countries: fc.features, borders, cities: CITIES,
    onChip: (ll, how) => { S.chip = [+ll[0].toFixed(3), +ll[1].toFixed(3)]; S.chipName = ''; if (how.end) { draw(false); } else update(); },
    onCity: ci => toggleLm(ci) });
  $('maploading').remove();
  setFeatures();
  setView(S.view);
}
boot();
