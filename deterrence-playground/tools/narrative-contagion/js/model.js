// Data loading and every derived number the views show. Pure functions, no DOM.
// Member rows in data/contagion.json.gz: [date, outletIdx, source, lang, headline, url, officialText|null, maxSim, topic, isTitlePassage]

export const OFFICIAL = 'o';
export const TYPE_LABEL = { 'official-official': 'Official in 2+ countries', mixed: 'Official + media', 'media-media': 'Media only' };
const DAY = 86400000;
export const dayNum = d => Math.round(Date.parse(d + 'T00:00:00Z') / DAY);

export async function loadData() {
  const r = await fetch(new URL('../data/contagion.json.gz', import.meta.url));
  if (!r.ok) throw new Error(`data file: HTTP ${r.status}`);
  let buf = new Uint8Array(await r.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    buf = new Uint8Array(await new Response(ds).arrayBuffer());
  }
  return prepare(JSON.parse(new TextDecoder().decode(buf)));
}

/** Attach derived fields to every cluster once. */
export function prepare(D) {
  const O = D.outlets;
  D.clusters.forEach((c, idx) => {
    c.rank = idx;
    c.members = c.m.map((r, i) => ({ i, date: r[0], day: dayNum(r[0]), outlet: r[1], country: O[r[1]].c, otype: O[r[1]].type,
      source: r[2], lang: r[3], title: r[4], url: r[5], text: r[6], sim: r[7], topic: r[8], titlePassage: !!r[9] }));
    delete c.m;
    const first = new Map(); // country -> first day
    c.members.forEach(m => { if (!first.has(m.country)) first.set(m.country, m.day); });
    c.countries = [...first.keys()];
    c.firstDay = new Map(first);
    c.outletsIn = [...new Set(c.members.map(m => m.outlet))];
    const offC = new Set(c.members.filter(m => m.otype === OFFICIAL).map(m => m.country));
    c.officialCountries = [...offC];
    c.type = offC.size >= 2 ? 'official-official' : offC.size ? 'mixed' : 'media-media';
    c.start = c.members[0].date; c.end = c.members[c.members.length - 1].date;
    c.span = c.members[c.members.length - 1].day - c.members[0].day;
    c.month = c.start.slice(0, 7);
    const lead = c.members.find(m => m.text) || c.members[0];
    c.lead = lead;
    c.parents = diffusionParents(c);
  });
  D.byId = new Map(D.clusters.map(c => [c.id, c]));
  D.months = [...new Set(D.clusters.map(c => c.month))].sort();
  return D;
}

/** For each member, the earlier-or-same-day member it matched most closely (-1 = no earlier match: an entry point). */
function diffusionParents(c) {
  const best = c.members.map(() => [-1, -1]);
  for (const [a, b, s] of c.e) {
    const [x, y] = c.members[a].day <= c.members[b].day ? [a, b] : [b, a];
    if (c.members[x].day === c.members[y].day && x > y) continue;
    if (s > best[y][1] && x !== y) best[y] = [x, s];
  }
  return best.map(b => b[0]);
}

export function filterClusters(D, f) {
  return D.clusters.filter(c =>
    (!f.type || c.type === f.type) &&
    (f.topic === '' || f.topic == null || String(c.t) === String(f.topic)) &&
    (!f.country || c.countries.includes(f.country)) &&
    (!f.pair || (c.countries.includes(f.pair[0]) && c.countries.includes(f.pair[1]))) &&
    c.countries.length >= (f.min || 2) &&
    (!f.from || c.start.slice(0, 4) >= f.from) && (!f.to || c.start.slice(0, 4) <= f.to) &&
    (!f.until || c.month <= f.until));
}

const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };

/** Country-level lead/lag over clusters: who appeared first in each cluster both countries are in. */
export function pairMatrix(clusters) {
  const M = new Map(); // "A>B" -> {before, same, lags[]}
  const get = k => M.get(k) || (M.set(k, { before: 0, same: 0, lags: [], ids: [] }), M.get(k));
  for (const c of clusters) {
    const cs = c.countries;
    for (let i = 0; i < cs.length; i++) for (let j = 0; j < cs.length; j++) {
      if (i === j) continue;
      const a = cs[i], b = cs[j], da = c.firstDay.get(a), db = c.firstDay.get(b);
      if (da < db) { const x = get(`${a}>${b}`); x.before++; x.lags.push(db - da); x.ids.push(c.id); }
      else if (da === db && i < j) { get(`${a}>${b}`).same++; get(`${b}>${a}`).same++; }
    }
  }
  for (const v of M.values()) v.medLag = median(v.lags);
  return M;
}

/** Node and link totals for the network at 'country' or 'outlet' level. */
export function network(D, clusters, level) {
  const key = m => (level === 'country' ? m.country : m.outlet);
  const nodes = new Map(), links = new Map(), official = new Map();
  for (const c of clusters) {
    const first = new Map();
    for (const m of c.members) { const k = key(m); if (!first.has(k)) first.set(k, m.day); }
    const ks = [...first.keys()];
    ks.forEach(k => nodes.set(k, (nodes.get(k) || 0) + 1));
    if (level === 'country') new Set(c.members.filter(m => m.otype === OFFICIAL).map(m => m.country)).forEach(k => official.set(k, (official.get(k) || 0) + 1));
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
      const a = ks[i], b = ks[j];
      if (level === 'outlet' && D.outlets[a].c === D.outlets[b].c) continue; // only cross-country echoes count
      const [x, y] = String(a) < String(b) ? [a, b] : [b, a];
      const id = `${x}|${y}`;
      const L = links.get(id) || { a: x, b: y, n: 0, aFirst: 0, bFirst: 0, same: 0 };
      L.n++;
      const dx = first.get(x), dy = first.get(y);
      if (dx < dy) L.aFirst++; else if (dy < dx) L.bFirst++; else L.same++;
      links.set(id, L);
    }
  }
  return { nodes, links: [...links.values()], official };
}

/** Passage-pair edges by pathway (official/media leader -> official/media follower) with lag buckets. */
export function pathways(clusters) {
  const kind = m => (m.otype === OFFICIAL ? 'official' : 'media');
  const P = {};
  for (const a of ['official', 'media']) for (const b of ['official', 'media']) P[`${a}>${b}`] = { n: 0, lags: [], buckets: [0, 0, 0, 0, 0] };
  const same = { 'official|official': 0, 'media|media': 0, 'media|official': 0 };
  let total = 0;
  for (const c of clusters) for (const [i, j] of c.e) {
    const x = c.members[i], y = c.members[j];
    total++;
    if (x.day === y.day) { same[[kind(x), kind(y)].sort().join('|')]++; continue; }
    const [l, f] = x.day < y.day ? [x, y] : [y, x];
    const p = P[`${kind(l)}>${kind(f)}`];
    const lag = f.day - l.day;
    p.n++; p.lags.push(lag);
    p.buckets[lag === 1 ? 0 : lag <= 3 ? 1 : lag <= 7 ? 2 : lag <= 10 ? 3 : 4]++;
  }
  for (const v of Object.values(P)) v.med = median(v.lags);
  return { P, same, total };
}

/** Which outlet type appears first in each cluster (cluster-level pathway). */
export function firstMover(clusters) {
  const out = { official: 0, media: 0, both: 0 };
  for (const c of clusters) {
    const d0 = c.members[0].day;
    const kinds = new Set(c.members.filter(m => m.day === d0).map(m => (m.otype === OFFICIAL ? 'official' : 'media')));
    out[kinds.size > 1 ? 'both' : [...kinds][0]]++;
  }
  return out;
}

export function sortClusters(list, by) {
  const k = {
    countries: c => [-c.countries.length, -c.officialCountries.length, -c.members.length, c.rank],
    members: c => [-c.members.length, -c.countries.length, c.rank],
    official: c => [-c.officialCountries.length, -c.countries.length, -c.members.length, c.rank],
    recent: c => [-dayNum(c.start), c.rank],
    span: c => [-c.span, -c.countries.length, c.rank],
  }[by] || (c => [c.rank]);
  return [...list].sort((a, b) => { const x = k(a), y = k(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; });
}

/** Docs the corpus holds for a country in a month: [official, media]. */
export const coverageAt = (D, country, month) => (D.coverage[country] && D.coverage[country][month]) || [0, 0];
