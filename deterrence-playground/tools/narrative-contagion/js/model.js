// Data loading and every derived number the views show. Pure functions, no DOM.
// Member rows in data/contagion.json.gz: [date, outletIdx, source, lang, headline, url, officialText|null, maxSim, topic, isTitlePassage]

export const OFFICIAL = 'o';
export const TYPE_LABEL = { 'official-official': 'Official in 2+ countries', mixed: 'Official + media', 'media-media': 'Media only' };
const DAY = 86400000;
export const dayNum = d => Math.round(Date.parse(d + 'T00:00:00Z') / DAY);

export async function loadData() {
  const check = await fetch(new URL('../data/text_check.json', import.meta.url)).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const r = await fetch(new URL('../data/contagion.json.gz', import.meta.url));
  if (!r.ok) throw new Error(`data file: HTTP ${r.status}`);
  let buf = new Uint8Array(await r.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    buf = new Uint8Array(await new Response(ds).arrayBuffer());
  }
  return prepare(JSON.parse(new TextDecoder().decode(buf)), check);
}

// What the shipped passage text is. The corpus stores China's MFA archive in English as TSM translations and the TAO's
// English as machine translation (rhetoric-corpus SOURCES.md), so English is called "official" only where the
// 16 Nov 2026 check (scripts/verify_cn_english.py -> data/text_check.json) found it on the linked official page.
export const LANG_NAME = { en: 'English', zh: 'Chinese', ru: 'Russian', es: 'Spanish' };
const CHECKED_SOURCES = new Set(['mfa_cn', 'mfa_cn_live', 'mnd_cn', 'tao_cn']);
export const TEXT_KIND = {
  checked: { tag: 'Official English', note: 'Official English: the passage matches the English on the linked official page (checked 16 Nov 2026).', quote: true },
  published: { tag: 'English, as published', note: 'English as the source published it on its own English-language site (not checked word for word here).', quote: true },
  original: { tag: 'Original language', note: 'Official text in the original language, as collected.', quote: true },
  tsm: { tag: 'Translation', note: 'Unofficial English translation (TSM) of the Chinese statement. The official English on the linked page uses different wording, so this is not a quote.', quote: false },
  mt: { tag: 'Translation', note: 'Machine translation (TSM translation for April 2026) of the Chinese original; the Taiwan Affairs Office publishes no English. Not a quote.', quote: false },
  unknown: { tag: 'Possibly a translation', note: 'English from the corpus record, which may be a TSM translation of the Chinese text. Not checked against the official page.', quote: false },
};
export function textKind(m, check, cid) {
  if (!m.text) return null;
  if (m.lang !== 'en') return 'original';
  if (!CHECKED_SOURCES.has(m.source)) return 'published';
  if (m.source === 'tao_cn') return 'mt';
  const k = `${cid}:${m.i}`;
  if (check && check.found.has(k)) return 'checked';
  if (check && check.notfound.has(k)) return 'tsm';
  return 'unknown';
}

/** Tag and note for an official passage: reporter's questions first, then what the English is. */
export function passageLabel(m) {
  // The speaker's role decides the main tag; whether the English is a translation is a separate, second tag.
  const K = TEXT_KIND[m.textKind];
  const tag2 = !K.quote && m.role ? K.tag : null;
  const tr = !K.quote && m.role ? ` ${K.note}` : '';
  const where = m.moved ? ` In the network it counts as ${m.movedOutletName} (${m.movedCountryName}).` : m.role === 'q' || m.role === 'f' ? ' It is left out of the country network: the speaker’s country or outlet is not in the corpus.' : '';
  if (m.role === 'q') return { tag: `Reporter's question (${m.asker})`, tag2, note: `A journalist's question at a press conference or interview, not the official's words; the answer may follow within the passage.${where}${tr}`, quote: false };
  if (m.role === 'f') return { tag: `Spoken by ${m.asker}`, tag2, note: `Another government's words, published on this site (a joint appearance, interview or repost), not the publishing government's.${where}${tr}`, quote: false };
  if (m.role === 'j') return { tag: m.asker, tag2, note: `A statement signed by several governments. Its wording is not one government's, so it is left out of the network and of every single-country count.${tr}`, quote: false };
  if (m.role === 'qt') return { tag: `Quoted: ${m.asker}`, tag2, note: `A named person the site quotes (a legislator, executive or other figure), not the publishing government's own wording. Left out of the network.${tr}`, quote: false };
  if (m.role === 'rp') return { tag: 'Repost, author unclear', tag2, note: 'A forwarded Telegram post whose original author the page does not name. It is not counted as official wording.', quote: false };
  if (m.role === 'inc') return { tag: m.other === 'foreign' ? `Includes words of ${m.asker}` : m.other === 'quoted' ? `Includes a quote from ${m.asker}` : `Includes a reporter's question (${m.asker})`, tag2, note: `The official's words run on into ${m.other === 'foreign' ? 'another government’s words' : m.other === 'quoted' ? 'a quote from someone else' : 'a journalist’s question'} in this passage, so it is not all the publishing government's wording.${tr}`, quote: false };
  return { tag: K.tag, tag2: null, note: K.note, quote: K.quote };
}

/** Role of each passage and everything that follows from it. Corrected method (default since 16 Nov 2026): a passage that
 * is a journalist's question is not the government's. It moves to the asking outlet's country when that outlet is in the
 * corpus (Xinhua, TASS, Taiwan's CNA, ...), and otherwise is left out of the cluster's countries, network, matrix and
 * pathways. oldMethod = true counts every passage as its document's outlet, as the page did before. */
export const isQuestion = m => m.role === 'q';
export const isMoved = m => m.role === 'q' || m.role === 'f';
export function setMethod(D, oldMethod) {
  D.oldMethod = !!oldMethod;
  const O = D.outlets;
  for (const c of D.clusters) {
    for (const m of c.allMembers) {
      Object.assign(m, m.base); m.moved = false; m.dropped = false;
      if (oldMethod) continue;
      if (m.role === 'q' || m.role === 'f') {
        // A journalist moves to the asking outlet; another government's official moves to that government. Unknown: left out.
        if (m.askerOutlet != null) {
          const o = O[m.askerOutlet];
          Object.assign(m, { outlet: m.askerOutlet, country: o.c, otype: o.type, moved: true, movedOutletName: o.name, movedCountryName: D.countries[o.c] });
        } else { m.dropped = true; m.otype = m.role; }
      } else if (m.role === 'j' || m.role === 'qt') { m.dropped = true; m.otype = m.role; } // joint statement or a quoted third party: no single government's words
      else if (m.role === 'rp') m.otype = 'r'; // repost with unclear author: kept, never official
    }
    c.members = c.allMembers.filter(m => !m.dropped);
    c.dropped = c.allMembers.filter(m => m.dropped);
    const at = new Map(c.members.map((m, k) => [m.i, k]));
    c.e = c.eAll.filter(([a, b]) => at.has(a) && at.has(b)).map(([a, b, s]) => [at.get(a), at.get(b), s]);
    derive(c);
  }
  D.valid = D.clusters.filter(c => c.countries.length >= 2).length;
  D.months = [...new Set(D.clusters.filter(c => c.countries.length >= 2).map(c => c.month))].sort();
  return D;
}
function derive(c) {
  const ms = c.members.length ? c.members : c.allMembers;
  const first = new Map(); // country -> first day
  c.members.forEach(m => { if (!first.has(m.country)) first.set(m.country, m.day); });
  c.countries = [...first.keys()];
  c.firstDay = new Map(first);
  c.outletsIn = [...new Set(c.members.map(m => m.outlet))];
  const offC = new Set(c.members.filter(m => m.otype === OFFICIAL).map(m => m.country));
  c.officialCountries = [...offC];
  c.type = offC.size >= 2 ? 'official-official' : offC.size ? 'mixed' : 'media-media';
  c.start = ms[0].date; c.end = ms[ms.length - 1].date;
  c.span = ms[ms.length - 1].day - ms[0].day;
  c.month = c.start.slice(0, 7);
  c.docs = new Set(c.members.map(m => m.doc)).size;
  // Representative passage: the first official text in the government's own words, else the first official text.
  c.lead = c.members.find(m => m.text && m.otype === OFFICIAL && !m.asker) || c.members.find(m => m.text && m.otype === OFFICIAL) || c.members.find(m => m.role !== 'q') || ms[0];
  c.parents = diffusionParents(c);
}

/** Language mix of matched items and of passage matches. */
export function langStats(clusters) {
  let total = 0, cross = 0, items = 0, en = 0, zhzh = 0;
  for (const c of clusters) {
    for (const m of c.members) { items++; if (m.lang === 'en') en++; }
    for (const [i, j] of c.e) {
      total++;
      const a = c.members[i].lang, b = c.members[j].lang;
      if (a !== b) cross++; else if (a === 'zh') zhzh++;
    }
  }
  return { total, cross, items, en, zhzh };
}

/** Attach derived fields to every cluster once. */
export function prepare(D, check = null) {
  const O = D.outlets;
  const sets = check ? { found: new Set(check.found), notfound: new Set(check.notfound) } : null;
  const roles = (check && check.roles) || {};
  D.textCheck = check;
  D.clusters.forEach((c, idx) => {
    c.rank = idx;
    c.allMembers = c.m.map((r, i) => ({ i, date: r[0], day: dayNum(r[0]), outlet: r[1], country: O[r[1]].c, otype: O[r[1]].type,
      source: r[2], lang: r[3], title: r[4], url: r[5], text: r[6], sim: r[7], topic: r[8], titlePassage: !!r[9] }));
    delete c.m;
    c.eAll = c.e;
    c.allMembers.forEach(m => {
      m.textKind = textKind(m, sets, c.id);
      // Who is speaking where the passage starts (scripts/tag_speakers.py): 'q' = a journalist's question,
      // 'inc' = official words that run on into a question.
      const r = (m.text && roles[`${c.id}:${m.i}`]) || null;
      m.role = r ? r.r : null;
      m.asker = r ? r.by : null;
      m.askerInside = !!r && r.r === 'inc';
      m.askerOutlet = r && r.outlet != null ? r.outlet : null;
      m.other = r ? r.other || null : null;
      m.base = { outlet: m.outlet, country: m.country, otype: m.otype };
      m.doc = m.url || `${m.outlet}|${m.date}|${m.title}`;
    });
  });
  setMethod(D, false);
  D.byId = new Map(D.clusters.map(c => [c.id, c]));
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
