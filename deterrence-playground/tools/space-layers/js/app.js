// Layers of Space: state, filters, list and wiring between the globe, the detail card and the sections below.
import { LAYERS, LAYER, COUNTRIES, COUNTRY, KINDS, TYPES, STATUS, COST_BANDS, THREATS, TYPE_THREAT,
  fmtUsd, esc, cssVar, bandOf, vulnOf, homeLayers } from './common.js';
import { createGlobe } from './globe.js';
import { renderDetail } from './detail.js';
import { renderLayerCard } from './layercard.js';
import { renderBelow } from './below.js';

const load = async (p, k, d) => { try { return (await import(p))[k] ?? d; } catch (e) { console.warn('missing', p, e.message); return d; } };
const [ASSETS, WEAPONS, TESTS, COUNTS, LAYERS_FACTS, LAUNCH] = await Promise.all([
  load('../data/assets.js', 'ASSETS', []), load('../data/weapons.js', 'WEAPONS', []), load('../data/tests.js', 'TESTS', []),
  load('../data/counts.js', 'COUNTS', null), load('../data/layers.js', 'LAYERS_FACTS', {}),
  import('../data/launch.js').catch(() => ({})),
]);
const ALL = [...WEAPONS, ...ASSETS].filter(it => it && it.id);
const BY_ID = Object.fromEntries(ALL.map(it => [it.id, it]));
const data = { ALL, BY_ID, TESTS, COUNTS, LAYERS_FACTS, LAUNCH };

const typesPresent = [...new Set(ALL.map(it => it.type))].filter(Boolean).sort((a, b) => (TYPES[a] || a).localeCompare(TYPES[b] || b));
const statusPresent = Object.keys(STATUS).filter(s => ALL.some(it => it.status === s));
const countriesPresent = COUNTRIES.filter(c => ALL.some(it => it.country === c.id));

const DEFAULT = () => ({ layer: 'all', colorBy: 'kind', vuln: false, threat: 'any', scale: 'compressed', sort: 'cost', sel: null,
  kinds: new Set(KINDS.map(k => k.id)), types: new Set(typesPresent), countries: new Set(countriesPresent.map(c => c.id)),
  costs: new Set([...COST_BANDS.map(b => b.id), 'none']), statuses: new Set(statusPresent.filter(s => s !== 'retired')) });
let S = DEFAULT();

// ---- URL hash: only what differs from the default ----
function writeHash() {
  const d = DEFAULT(), p = new URLSearchParams();
  for (const k of ['layer', 'colorBy', 'threat', 'scale', 'sort', 'sel']) if (S[k] !== d[k] && S[k] != null) p.set(k, S[k]);
  if (S.vuln) p.set('vuln', '1');
  for (const k of ['kinds', 'types', 'countries', 'costs', 'statuses']) {
    const a = [...S[k]].sort().join('.'), b = [...d[k]].sort().join('.');
    if (a !== b) p.set(k, a || '-');
  }
  history.replaceState(null, '', p.toString() ? '#' + p : location.pathname + location.search);
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  for (const k of ['layer', 'colorBy', 'threat', 'scale', 'sort', 'sel']) if (p.has(k)) S[k] = p.get(k);
  if (p.get('vuln') === '1') S.vuln = true;
  for (const k of ['kinds', 'types', 'countries', 'costs', 'statuses']) if (p.has(k)) S[k] = new Set(p.get(k) === '-' ? [] : p.get(k).split('.'));
  if (!LAYER[S.layer] && S.layer !== 'all') S.layer = 'all';
  if (S.sel && !BY_ID[S.sel]) S.sel = null;
}

// ---- Filtering ----
const isWeapon = it => it.kind === 'offensive' || it.kind === 'defensive';
const inLayer = (it, L) => L === 'all' || homeLayers(it).includes(L) || (it.reach || []).includes(L)
  || (L === 'spectrum' && (it.type === 'jammer' || it.type === 'cyber'));
function passes(it) {
  return S.kinds.has(it.kind) && S.types.has(it.type) && S.countries.has(it.country) && S.statuses.has(it.status)
    && S.costs.has(bandOf(it) ?? 'none') && inLayer(it, S.layer);
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
  host.innerHTML = entries.map(([id, label, sw, n]) =>
    `<button type="button" data-id="${esc(id)}" aria-pressed="${S[key].has(id)}">${sw ? `<i style="background:var(${sw})"></i>` : ''}${esc(label)}${n != null ? ` <small>${n}</small>` : ''}</button>`).join('');
  host.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const id = b.dataset.id; S[key].has(id) ? S[key].delete(id) : S[key].add(id); update();
  };
}
function seg(host, key, after) {
  host.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(S[key] === b.dataset.v)));
  host.onclick = e => { const b = e.target.closest('button'); if (!b) return; S[key] = b.dataset.v; after?.(); update(); };
}
const count = f => ALL.filter(f).length;
function renderPanel() {
  chips($('kinds'), KINDS.map(k => [k.id, k.name, '--k-' + k.id, count(it => it.kind === k.id)]), 'kinds');
  chips($('types'), typesPresent.map(t => [t, TYPES[t] || t, null, count(it => it.type === t)]), 'types');
  chips($('countries'), countriesPresent.map(c => [c.id, c.name, '--k-' + c.id, count(it => it.country === c.id)]), 'countries');
  chips($('costs'), [...COST_BANDS.map(b => [b.id, b.name, '--cb-' + b.id]), ['none', 'No public figure', '--cb-none']], 'costs');
  chips($('statuses'), statusPresent.map(s => [s, STATUS[s], null, count(it => it.status === s)]), 'statuses');
  seg($('colorby'), 'colorBy', () => { if (S.colorBy === 'vuln') S.vuln = true; });
  seg($('threat'), 'threat', () => { S.vuln = true; S.colorBy = 'vuln'; });
  seg($('scale'), 'scale', () => globe.setScale(S.scale));
  $('vuln-on').checked = S.vuln;
  $('threat').style.opacity = S.vuln ? 1 : .55;
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
const globe = createGlobe(globeEl, {
  onPick: it => { select(it ? it.id : null); writeHash(); },
  onHover: (it, e) => {
    const tip = $('tip');
    if (!it) { tip.hidden = true; return; }
    const r = globeEl.getBoundingClientRect();
    tip.innerHTML = `${esc(it.name)}<small>${esc(COUNTRY[it.country]?.name || '')} · ${esc(TYPES[it.type] || it.type)}</small>`;
    tip.style.left = Math.min(e.clientX - r.left + 12, r.width - 200) + 'px'; tip.style.top = (e.clientY - r.top + 12) + 'px'; tip.hidden = false;
  },
});

function threatLayers(vis) {
  if (!S.vuln) return new Set();
  const set = new Set();
  for (const w of ALL) {
    if (w.kind !== 'offensive' || !S.countries.has(w.country) || !S.statuses.has(w.status)) continue;
    if (S.threat !== 'any' && TYPE_THREAT[w.type] !== S.threat) continue;
    (w.reach || []).forEach(l => set.add(l));
    if (w.type === 'jammer' || w.type === 'cyber') set.add('spectrum');
  }
  return set;
}

let lastLayer = null;
function update() {
  if (S.vuln && S.colorBy !== 'vuln') S.colorBy = 'vuln';
  renderPanel();
  const vis = ALL.filter(passes);
  globe.setItems(vis, it => colorOf(it, globeEl));
  globe.setThreatLayers(threatLayers(vis));
  if (S.layer !== lastLayer) { globe.focusLayer(S.layer); lastLayer = S.layer; }
  $('legend').innerHTML = legendItems().map(([n, c]) => `<span><i style="background:${cssVar(c, globeEl)}"></i>${esc(n)}</span>`).join('');
  renderList(vis);
  renderLayerCard($('layercard'), S.layer, data, { vis, threats: threatLayers(vis), vulnOn: S.vuln });
  if (S.sel && !vis.some(it => it.id === S.sel)) select(null); else if (S.sel) select(S.sel);
  writeHash();
}

$('layerbar').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.layer = b.dataset.v; update(); });
$('vuln-on').addEventListener('change', e => { S.vuln = e.target.checked; S.colorBy = S.vuln ? 'vuln' : 'kind'; update(); });
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
