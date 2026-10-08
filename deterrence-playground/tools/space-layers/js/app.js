// Layers of Space: state, filters, list and wiring between the globe, the detail card and the sections below.
import { LAYERS, LAYER, COUNTRIES, COUNTRY, KINDS, TYPES, STATUS, COST_BANDS, THREATS, TYPE_THREAT,
  fmtUsd, esc, cssVar, bandOf, vulnOf, homeLayers } from './common.js';
import { createGlobe } from './globe.js';
import { renderDetail } from './detail.js';
import { renderLayerCard } from './layercard.js';
import { renderBelow } from './below.js';

const load = async (p, k, d) => { try { return (await import(p))[k] ?? d; } catch (e) { console.warn('missing', p, e.message); return d; } };
const [ASSETS, WEAPONS, TESTS, COUNTS, LAYERS_FACTS, LAUNCH, DEBRIS, POPM] = await Promise.all([
  load('../data/assets.js', 'ASSETS', []), load('../data/weapons.js', 'WEAPONS', []), load('../data/tests.js', 'TESTS', []),
  load('../data/counts.js', 'COUNTS', null), load('../data/layers.js', 'LAYERS_FACTS', {}),
  import('../data/launch.js').catch(() => ({})), load('../data/debris.js', 'DEBRIS', null),
  import('../data/population.js').catch(() => null),
]);
const ALL = [...WEAPONS, ...ASSETS].filter(it => it && it.id);
const BY_ID = Object.fromEntries(ALL.map(it => [it.id, it]));
const data = { ALL, BY_ID, TESTS, COUNTS, LAYERS_FACTS, LAUNCH, DEBRIS };

const typesPresent = [...new Set([...ALL.map(it => it.type), ...(POPM?.POP_MISSIONS || [])])].filter(Boolean).sort((a, b) => (TYPES[a] || a).localeCompare(TYPES[b] || b));
const statusPresent = Object.keys(STATUS).filter(s => ALL.some(it => it.status === s));
const countriesPresent = COUNTRIES.filter(c => ALL.some(it => it.country === c.id));

const DEFAULT = () => ({ layer: 'all', colorBy: 'kind', pop: true, deb: false, threat: 'any', scale: 'compressed', sort: 'cost', sel: null,
  kinds: new Set(KINDS.map(k => k.id)), types: new Set(typesPresent), countries: new Set(countriesPresent.map(c => c.id)),
  costs: new Set([...COST_BANDS.map(b => b.id), 'none']), statuses: new Set(statusPresent.filter(s => s !== 'retired')) });
let S = DEFAULT();

// ---- URL hash: only what differs from the default ----
function writeHash() {
  const d = DEFAULT(), p = new URLSearchParams();
  for (const k of ['layer', 'colorBy', 'threat', 'scale', 'sort', 'sel']) if (S[k] !== d[k] && S[k] != null) p.set(k, S[k]);
  if (!S.pop) p.set('pop', '0'); if (S.deb) p.set('deb', '1');
  for (const k of ['kinds', 'types', 'countries', 'costs', 'statuses']) {
    const a = [...S[k]].sort().join('.'), b = [...d[k]].sort().join('.');
    if (a !== b) p.set(k, a || '-');
  }
  history.replaceState(null, '', p.toString() ? '#' + p : location.pathname + location.search);
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  for (const k of ['layer', 'colorBy', 'threat', 'scale', 'sort', 'sel']) if (p.has(k)) S[k] = p.get(k);
  if (p.get('pop') === '0') S.pop = false; if (p.get('deb') === '1') S.deb = true;
  if (p.get('vuln') === '1') S.colorBy = 'vuln';   // older links
  for (const k of ['kinds', 'types', 'countries', 'costs', 'statuses']) if (p.has(k)) S[k] = new Set(p.get(k) === '-' ? [] : p.get(k).split('.'));
  if (!LAYER[S.layer] && S.layer !== 'all') S.layer = 'all';
  if (S.sel && !BY_ID[S.sel]) S.sel = null;
}

// ---- Filtering ----
const isWeapon = it => it.kind === 'offensive' || it.kind === 'defensive';
const inLayer = (it, L) => L === 'all' || homeLayers(it).includes(L) || (it.reach || []).includes(L)
  || (L === 'spectrum' && (it.type === 'jammer' || it.type === 'cyber'));
const FACETS = { kinds: it => it.kind, types: it => it.type, countries: it => it.country, statuses: it => it.status, costs: it => bandOf(it) ?? 'none' };
// Passes every filter except `skip`, so each facet's counts reflect the layer and all the other filters.
function passes(it, skip) {
  return inLayer(it, S.layer) && Object.entries(FACETS).every(([k, f]) => k === skip || S[k].has(f(it)));
}

// ---- Colors ----
function colorOf(it, el) {
  const v = n => cssVar(n, el);
  if (S.colorBy === 'country') return v('--k-' + it.country) || v('--k-com');
  if (S.colorBy === 'cost') return v('--cb-' + (bandOf(it) ?? 'none'));
  if (S.colorBy === 'vuln') { const x = vulnOf(it, S.threat); return x == null ? v('--v-none') : v('--v' + x); }
  return v('--k-' + it.kind);
}
function legendItems() {
  if (S.colorBy === 'country') return countriesPresent.filter(c => S.countries.has(c.id)).map(c => [c.name, '--k-' + c.id]);
  if (S.colorBy === 'cost') return [...COST_BANDS.map(b => [b.name, '--cb-' + b.id]), ['No public figure', '--cb-none']];
  if (S.colorBy === 'vuln') return [['Low', '--v0'], ['Some', '--v1'], ['High', '--v2'], ['Very high', '--v3'], ['Weapon (not rated)', '--v-none']];
  return KINDS.map(k => [k.name, '--k-' + k.id]);
}

// ---- Panel controls ----
const $ = id => document.getElementById(id);
function chips(host, entries, key) {
  const k = v => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : v;
  host.innerHTML = entries.map(([id, label, sw, n, sats]) =>
    `<button type="button" data-id="${esc(id)}" aria-pressed="${S[key].has(id)}"${!n && !sats ? ' class="zero"' : ''} title="${n ?? 0} systems${sats != null ? `, ${sats.toLocaleString('en-US')} satellites` : ''}">${sw ? `<i style="background:var(${sw})"></i>` : ''}${esc(label)}${n != null ? ` <small>${n}</small>` : ''}${sats ? ` <small class="sats">${k(sats)} sats</small>` : ''}</button>`).join('');
  host.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const id = b.dataset.id; S[key].has(id) ? S[key].delete(id) : S[key].add(id); update();
  };
}
function seg(host, key, after) {
  host.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(S[key] === b.dataset.v)));
  host.onclick = e => { const b = e.target.closest('button'); if (!b) return; S[key] = b.dataset.v; after?.(); update(); };
}
const count = (key, v) => ALL.filter(it => FACETS[key](it) === v && passes(it, key)).length;
function renderPanel() {
  const sc = satCounts(), withSats = S.pop && POPM;
  chips($('kinds'), KINDS.map(k => [k.id, k.name, '--k-' + k.id, count('kinds', k.id), withSats && k.id === 'enabler' ? sc.enabler : null]), 'kinds');
  chips($('types'), typesPresent.map(t => [t, TYPES[t] || t, null, count('types', t), withSats ? sc.types[t] || 0 : null]), 'types');
  chips($('countries'), countriesPresent.map(c => [c.id, c.name, '--k-' + c.id, count('countries', c.id), withSats ? sc.countries[c.id] || 0 : null]), 'countries');
  updatePopulation(sc);
  chips($('costs'), [...COST_BANDS.map(b => [b.id, b.name, '--cb-' + b.id, count('costs', b.id)]), ['none', 'No public figure', '--cb-none', count('costs', 'none')]], 'costs');
  chips($('statuses'), statusPresent.map(s => [s, STATUS[s], null, count('statuses', s)]), 'statuses');
  $('pop-on').checked = S.pop; $('deb-on').checked = S.deb;
  seg($('colorby'), 'colorBy');
  seg($('threat'), 'threat');
  seg($('scale'), 'scale', () => globe.setScale(S.scale));
  $('vuln-box').hidden = S.colorBy !== 'vuln';
  $('sort').value = S.sort;
  $('layerbar').innerHTML = [['all', 'All layers', ''], ...LAYERS.map(l => [l.id, l.short, l.id === 'geo' ? '35,786 km' : ''])]
    .map(([id, name, alt]) => `<button type="button" data-v="${id}" aria-pressed="${S.layer === id}">${esc(name)}${alt ? `<span class="alt">${alt}</span>` : ''}</button>`).join('');
}

// ---- List ----
function sortItems(a) {
  const c = it => it.cost?.usd ?? -1, v = it => vulnOf(it, S.threat) ?? -1;
  const by = { cost: (x, y) => c(y) - c(x), costasc: (x, y) => (c(x) < 0) - (c(y) < 0) || c(x) - c(y), name: (x, y) => x.name.localeCompare(y.name),
    country: (x, y) => (COUNTRY[x.country]?.name || '').localeCompare(COUNTRY[y.country]?.name || '') || x.name.localeCompare(y.name),
    vuln: (x, y) => v(y) - v(x) }[S.sort];
  return a.slice().sort(by);
}
function renderList(vis) {
  const L = S.layer, inL = vis.filter(it => L === 'all' || homeLayers(it).includes(L) || L === 'spectrum');
  const reach = L === 'all' ? [] : vis.filter(it => !inL.includes(it));
  const row = it => `<li><button type="button" data-id="${esc(it.id)}" aria-current="${S.sel === it.id}"><i style="background:${colorOf(it)}"></i><b>${esc(it.name)}</b><span class="num">${it.cost?.usd != null ? fmtUsd(it.cost.usd) : ''}</span><small>${esc(COUNTRY[it.country]?.name || '')} · ${esc(TYPES[it.type] || it.type)} · ${esc(STATUS[it.status] || it.status || '')}</small></button></li>`;
  $('list-t').textContent = L === 'all' ? `${vis.length} systems shown of ${ALL.length}` : `${inL.length} in ${LAYER[L].short}${reach.length ? `, ${reach.length} weapons that can reach it` : ''}`;
  $('list').innerHTML = sortItems(inL).map(row).join('') + (reach.length ? `<li style="grid-column:1/-1"><p class="eyebrow" style="margin-top:8px">Weapons that can reach ${esc(LAYER[L].short)}</p></li>` + sortItems(reach).map(row).join('') : '')
    || '<li class="fine">Nothing matches these filters.</li>';
}

// ---- Selection ----
function select(id) {
  S.sel = id; const it = BY_ID[id];
  globe.select(it || null);
  const box = $('detail');
  if (!it) { box.hidden = true; box.innerHTML = ''; }
  else { box.hidden = false; renderDetail(box, it, data, { colorOf, onClose: () => { select(null); writeHash(); }, onPick: id2 => { select(id2); writeHash(); } }); }
  $('list').querySelectorAll('button').forEach(b => b.setAttribute('aria-current', String(b.dataset.id === id)));
}

// ---- Update loop ----
const globeEl = $('globe');
// On narrow screens the detail card sits under the globe card instead of over the globe.
const narrow = matchMedia('(max-width: 760px)');
const placeDetail = () => (narrow.matches ? document.querySelector('.sl-globecard').after($('detail')) : globeEl.appendChild($('detail')));
narrow.addEventListener('change', placeDetail); placeDetail();
const noGlobe = () => {
  globeEl.insertAdjacentHTML('afterbegin', '<p class="sl-noglobe">This browser cannot draw the 3D globe (WebGL is off or unavailable). The filters, list, details and sections below still work.</p>');
  const nop = () => {};
  return { setPopulation: nop, filterPopulation: nop, setItems: nop, recolor: nop, setScale: nop, focusLayer: nop, setThreatLayers: nop, select: nop };
};
let globe;
try { globe = makeGlobe(); } catch (e) { console.warn('globe unavailable:', e.message); globe = noGlobe(); }
function makeGlobe() { return createGlobe(globeEl, {
  onPick: it => { select(it ? it.id : null); writeHash(); },
  onHover: (it, e) => {
    const tip = $('tip');
    if (!it) { tip.hidden = true; return; }
    const r = globeEl.getBoundingClientRect();
    tip.innerHTML = `${esc(it.name)}<small>${esc(COUNTRY[it.country]?.name || '')} · ${esc(TYPES[it.type] || it.type)}</small>`;
    tip.style.left = Math.min(e.clientX - r.left + 12, r.width - 200) + 'px'; tip.style.top = (e.clientY - r.top + 12) + 'px'; tip.hidden = false;
  },
}); }

function threatLayers(vis) {
  if (S.colorBy !== 'vuln') return new Set();
  const set = new Set();
  for (const w of ALL) {
    if (w.kind !== 'offensive' || !S.countries.has(w.country) || !S.statuses.has(w.status)) continue;
    if (S.threat !== 'any' && TYPE_THREAT[w.type] !== S.threat) continue;
    (w.reach || []).forEach(l => set.add(l));
    if (w.type === 'jammer' || w.type === 'cyber') set.add('spectrum');
  }
  return set;
}

// Background population: every active satellite (by country and mission) and, optionally, tracked debris.
// Missions come from CelesTrak purpose groups and public programme names; see the method notes.
const POP_C = POPM?.POP_COUNTRIES || [], POP_M = POPM?.POP_MISSIONS || [];
if (POPM) globe.setPopulation(POPM.POP);
let popKey = '';
const popLayer = (pe, ap) => { const m = (pe + ap) / 2; return ap - pe > 10000 ? 'heo' : m < 450 ? 'vleo' : m < 2000 ? 'leo' : m < 34000 ? 'meo' : m < 38500 ? 'geo' : 'far'; };
const popLayerNow = () => ['vleo', 'leo', 'meo', 'geo', 'heo'].includes(S.layer) ? S.layer : S.layer === 'cislunar' ? 'none' : null;
const popCountryOk = c => S.countries.has(POP_C[c]) || POP_C[c] === 'other';
// Satellites count as "space services": public data cannot say which ones carry weapons.
const popKindOk = () => S.kinds.has('enabler');
// Satellite counts for the chips, faceted like the system counts (skip = the facet being counted).
function satCounts() {
  const out = { types: {}, countries: {}, enabler: 0, act: 0, deb: 0 };
  if (!POPM) return out;
  const P = POPM.POP, L = popLayerNow();
  for (let i = 0; i < P.length; i += 5) {
    if (L && popLayer(P[i], P[i + 1]) !== L) continue;
    const c = P[i + 3], m = POP_M[P[i + 4]];
    if (c < 0) { out.deb++; continue; }
    const cOk = popCountryOk(c), tOk = S.types.has(m), kOk = popKindOk();
    if (cOk && kOk) out.types[m] = (out.types[m] || 0) + 1;
    if (tOk && kOk) out.countries[POP_C[c]] = (out.countries[POP_C[c]] || 0) + 1;
    if (cOk && tOk) out.enabler++;
    if (cOk && tOk && kOk) out.act++;
  }
  return out;
}
function updatePopulation(sc) {
  if (!POPM) { $('pop-n').textContent = $('deb-n').textContent = ''; return; }
  const L = popLayerNow();
  $('pop-n').textContent = '(' + sc.act.toLocaleString('en-US') + ')';
  $('deb-n').textContent = '(' + sc.deb.toLocaleString('en-US') + ')';
  const key = [S.pop, S.deb, L, [...S.countries].sort().join(), [...S.types].sort().join(), popKindOk(), S.colorBy, matchMedia('(prefers-color-scheme: dark)').matches].join('|');
  if (key === popKey) return; popKey = key;
  const v = n => cssVar(n, globeEl);
  globe.filterPopulation((i, c, lay, m) => (c < 0 ? S.deb : S.pop && popKindOk() && popCountryOk(c) && S.types.has(POP_M[m])) && (!L || lay === L),
    c => c < 0 ? '#8c7b6b' : S.colorBy === 'country' ? (v('--k-' + POP_C[c]) || v('--k-com')) : '#86a8d6');
}

let lastLayer = null;
function update() {
  renderPanel();
  const vis = ALL.filter(it => passes(it));
  globe.setItems(vis, it => colorOf(it, globeEl));
  globe.setThreatLayers(threatLayers(vis));
  if (S.layer !== lastLayer) { globe.focusLayer(S.layer); lastLayer = S.layer; }
  $('legend').innerHTML = legendItems().map(([n, c]) => `<span><i style="background:${cssVar(c, globeEl)}"></i>${esc(n)}</span>`).join('');
  renderList(vis);
  renderLayerCard($('layercard'), S.layer, data, { vis, threats: threatLayers(vis), vulnOn: S.colorBy === 'vuln' });
  if (S.sel && !vis.some(it => it.id === S.sel)) select(null); else if (S.sel) select(S.sel);
  writeHash();
}

$('layerbar').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.layer = b.dataset.v; update(); });
$('pop-on').addEventListener('change', e => { S.pop = e.target.checked; update(); });
$('deb-on').addEventListener('change', e => { S.deb = e.target.checked; update(); });
$('sort').addEventListener('change', e => { S.sort = e.target.value; update(); });
$('list').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (!b) return; select(b.dataset.id); writeHash();
  if (matchMedia('(max-width: 760px)').matches) $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
$('all-countries').addEventListener('click', () => { S.countries = new Set(countriesPresent.map(c => c.id)); update(); });
$('no-countries').addEventListener('click', () => { S.countries = new Set(); update(); });
$('reset').addEventListener('click', () => { const sc = S.scale; S = DEFAULT(); S.scale = sc; select(null); update(); });
$('copy-link').addEventListener('click', async e => { try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Copied'; setTimeout(() => e.target.textContent = 'Copy link', 1500); } catch {} });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', update);

readHash();
if (S.scale !== 'compressed') globe.setScale(S.scale);
update();
renderBelow(document.getElementById('below'), data, {
  focus: (layer, sel) => { S.layer = layer || 'all'; update(); if (sel) select(sel); writeHash(); $('globe').scrollIntoView({ behavior: 'smooth' }); },
});
