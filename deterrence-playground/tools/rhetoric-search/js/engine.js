// Rhetoric Search: client-side engine. Loads the sharded sentence index built by scripts/build_public.py.
// fold(), tokens() and bucketOf() mirror textnorm.py in the corpus repo exactly; keep them in sync.

const DATA = new URL('../data/', import.meta.url);
const CJK = '\\u1100-\\u11ff\\u3040-\\u30ff\\u3130-\\u318f\\u3400-\\u4dbf\\u4e00-\\u9fff\\uac00-\\ud7af\\uf900-\\ufaff';
const CJK_RUN = new RegExp(`^[${CJK}]+$`, 'u');
const HAS_CJK = new RegExp(`[${CJK}]`, 'u');
// CJK runs, else runs of letters/digits that are not CJK (so "NNSA近日" gives "nnsa" + 近, 日, 近日).
const TOK = new RegExp(`[${CJK}]+|(?:(?![${CJK}])[\\p{L}\\p{N}])+`, 'gu');
const VARIANT = { 'ё': 'е', 'Ё': 'Е', 'ي': 'ی', 'ى': 'ی', 'ك': 'ک', 'ۀ': 'ه', 'ة': 'ه' };
for (let i = 0; i < 10; i++) { VARIANT[String.fromCharCode(0x660 + i)] = String(i); VARIANT[String.fromCharCode(0x6f0 + i)] = String(i); }

const foldCache = new Map();
/** One code point -> one folded code point (lower case, variant-folded, diacritics stripped). */
export function foldChar(c) {
  let f = foldCache.get(c);
  if (f !== undefined) return f;
  if (c >= '\uac00' && c <= '\ud7af') { foldCache.set(c, c); return c; } // Hangul: NFD would leave only the first jamo
  const v = VARIANT[c] || c;
  const low = Array.from(v.toLowerCase())[0] || v;
  f = Array.from(low.normalize('NFD'))[0] || low;
  // Keep UTF-16 length: a folded character must take as many code units as the original.
  if (f.length !== c.length) f = c;
  foldCache.set(c, f);
  return f;
}
export function fold(s) {
  let out = '';
  for (const c of s) out += foldChar(c);
  return out;
}

export function tokens(text) {
  const out = new Set();
  for (const m of fold(text).matchAll(TOK)) {
    const w = m[0];
    if (CJK_RUN.test(w)) {
      const cs = Array.from(w);
      cs.forEach((c) => out.add(c));
      for (let i = 0; i < cs.length - 1; i++) out.add(cs[i] + cs[i + 1]);
    } else if (!(/^\d+$/.test(w) && w.length > 4)) out.add(w);
  }
  return out;
}

export function bucketOf(token, n) {
  let h = 0x811c9dc5;
  for (const c of Array.from(token).slice(0, 2)) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h % n;
}

async function getGz(path) {
  const r = await fetch(new URL(path, DATA));
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  let text;
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    text = await new Response(ds).text();
  } else text = new TextDecoder().decode(buf); // a server already inflated it
  return JSON.parse(text);
}

// ---- Query ------------------------------------------------------------------------------------------------
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const B = `(?:(?![${CJK}])[\\p{L}\\p{N}])`; // a non-CJK letter or digit (word boundary test)

/** A term: a phrase or word, maybe with a trailing * (prefix). */
function makeTerm(raw) {
  const prefix = raw.endsWith('*');
  const text = raw.replace(/\*+$/, '').replace(/^"|"$/g, '').trim();
  const f = fold(text);
  const cjk = HAS_CJK.test(f);
  const words = Array.from(f.matchAll(TOK), (m) => m[0]);
  if (!words.length) return null;
  let src;
  if (cjk && words.every((w) => CJK_RUN.test(w))) src = words.map(esc).join('[^\\p{L}\\p{N}]*');
  else src = `(?<!${B})` + words.map(esc).join(`(?:(?!${B}).)+`) + (prefix ? `${B}*` : `(?!${B})`);
  // Tokens the shard dictionary must hold (prefix only applies to the last word).
  const need = [];
  words.forEach((w, i) => {
    if (CJK_RUN.test(w)) {
      const cs = Array.from(w);
      if (cs.length === 1) need.push({ t: cs[0] });
      for (let k = 0; k < cs.length - 1; k++) need.push({ t: cs[k] + cs[k + 1] });
    } else need.push({ t: w, prefix: prefix && i === words.length - 1 });
  });
  return { text, prefix, cjk, need, re: new RegExp(src, 'gu') };
}

/**
 * Parse a query: no operators -> one phrase. Otherwise "quoted phrases", words (AND), OR between groups,
 * trailing * for prefixes. Returns alternatives: [[term, term], [term]] (OR of ANDs).
 */
export function parseQuery(q) {
  q = q.trim();
  if (!q) return [];
  const toks = q.match(/"[^"]*"\*?|\S+/g) || [];
  const hasOps = toks.some((t) => t === 'OR' || t === 'AND' || t.startsWith('"') || t.endsWith('*'));
  if (!hasOps) { const t = makeTerm(q); return t ? [[t]] : []; }
  const alts = [[]];
  for (const t of toks) {
    if (t === 'OR') { alts.push([]); continue; }
    if (t === 'AND') continue;
    const term = makeTerm(t);
    if (term) alts[alts.length - 1].push(term);
  }
  return alts.filter((a) => a.length);
}

// ---- Index ------------------------------------------------------------------------------------------------
export class Engine {
  constructor() { this.meta = null; this.buckets = new Map(); this.shards = new Map(); this.folded = new Map(); }

  async init() {
    this.meta = await getGz('meta.json.gz');
    this.byId = new Map(this.meta.shards.map((s) => [s[0], s]));
    return this.meta;
  }

  async bucket(b) {
    if (!this.buckets.has(b)) this.buckets.set(b, getGz(`t/${b}.json.gz`));
    return this.buckets.get(b);
  }

  /** Shard ids holding a token (null = every shard). */
  async shardsFor(need) {
    const n = this.meta.buckets;
    if (need.prefix && Array.from(need.t).length < 2) return null;
    const dict = await this.bucket(bucketOf(need.t, n));
    const decode = (v) => { if (v === -1) return null; const out = []; let x = 0; for (const d of v) { x += d; out.push(x); } return out; };
    if (!need.prefix) { const v = dict[need.t]; return v === undefined ? [] : decode(v); }
    let all = new Set();
    for (const [k, v] of Object.entries(dict)) {
      if (!k.startsWith(need.t)) continue;
      const ids = decode(v);
      if (ids === null) return null;
      ids.forEach((i) => all.add(i));
    }
    return [...all];
  }

  /** Candidate shard ids for a parsed query and filters, newest first. */
  async candidates(alts, f) {
    const allIds = this.meta.shards.map((s) => s[0]);
    const union = new Set();
    for (const alt of alts) {
      let cur = null; // null = all
      for (const term of alt) {
        for (const need of term.need) {
          const ids = await this.shardsFor(need);
          if (ids === null) continue;
          cur = cur === null ? new Set(ids) : new Set(ids.filter((i) => cur.has(i)));
          if (!cur.size) break;
        }
        if (cur && !cur.size) break;
      }
      (cur === null ? allIds : [...cur]).forEach((i) => union.add(i));
    }
    const src = this.meta.sources;
    return [...union].map((i) => this.byId.get(i)).filter((s) => {
      if (f.country && s[1] !== f.country) return false;
      if (f.from && s[3] < f.from) return false;
      if (f.to && s[2] > f.to) return false;
      if (f.source && !s[6].some((k) => src[k].id === f.source)) return false;
      if (f.lang && !s[7].some((k) => this.meta.langs[k] === f.lang)) return false;
      return true;
    }).sort((a, b) => (b[3] < a[3] ? -1 : b[3] > a[3] ? 1 : a[0] - b[0])).map((s) => s[0]);
  }

  async shard(id) {
    if (!this.shards.has(id)) {
      this.shards.set(id, getGz(`s/${id}.json.gz`).then((d) => {
        const sents = d.text.split('\n');
        return { docs: d.docs, sents, folded: sents.map(fold) };
      }));
      if (this.shards.size > 60) this.shards.delete(this.shards.keys().next().value); // simple LRU-ish cap
    }
    return this.shards.get(id);
  }

  // ---- Media / commentary: no text ships. Token -> [(document, count)] postings + title/link metadata. -----
  async initMedia() {
    if (!this.meta.media || !this.meta.media.docs) { this.mlite = null; return; }
    const l = await getGz('m/docs.json.gz');
    const base = Date.UTC(2000, 0, 1);
    const dates = new Array(l.days.length);
    const cache = new Map();
    for (let i = 0; i < l.days.length; i++) {
      const d = l.day0 + l.days[i];
      let iso = cache.get(d);
      if (!iso) { iso = new Date(base + d * 864e5).toISOString().slice(0, 10); cache.set(d, iso); }
      dates[i] = iso;
    }
    this.mlite = { dates, src: l.src, lang: l.lang };
    this.mbuckets = new Map();
    this.mchunks = new Map();
  }

  async mbucket(b) {
    if (!this.mbuckets.has(b)) this.mbuckets.set(b, getGz(`m/t/${b}.json.gz`));
    return this.mbuckets.get(b);
  }

  /** Map(doc -> count) for one token (null = in nearly every document; undefined = cannot be looked up). */
  async mediaPostings(need) {
    const chars = Array.from(need.t);
    if (chars.length < 2 && (need.prefix || HAS_CJK.test(need.t))) return undefined;
    const dict = await this.mbucket(bucketOf(need.t, this.meta.buckets));
    const add = (m, v) => {
      if (v === -1) return false;
      const [deltas, counts] = Array.isArray(v[0]) ? v : [v, null];
      let x = 0;
      for (let i = 0; i < deltas.length; i++) { x += deltas[i]; m.set(x, (m.get(x) || 0) + (counts ? counts[i] : 1)); }
      return true;
    };
    const m = new Map();
    if (!need.prefix) { const v = dict[need.t]; if (v !== undefined && !add(m, v)) return null; return m; }
    for (const [k, v] of Object.entries(dict)) if (k.startsWith(need.t) && !add(m, v)) return null;
    return m;
  }

  /** Media documents matching every word of a term (any order), with the smallest per-word count. */
  async mediaSearch(alts, f) {
    if (!this.mlite) return { docs: [], unsupported: false };
    let unsupported = false;
    const total = new Map();
    for (const alt of alts) {
      let cur = null;
      let usable = false;
      for (const term of alt) {
        for (const need of term.need) {
          const p = await this.mediaPostings(need);
          if (p === undefined) { unsupported = true; continue; }
          if (p === null) continue;
          usable = true;
          if (cur === null) cur = p;
          else { const nx = new Map(); for (const [d, c] of p) if (cur.has(d)) nx.set(d, Math.min(c, cur.get(d))); cur = nx; }
          if (!cur.size) break;
        }
        if (cur && !cur.size) break;
      }
      if (!usable || !cur) continue;
      for (const [d, c] of cur) total.set(d, (total.get(d) || 0) + c);
    }
    const { dates, src, lang } = this.mlite;
    const S = this.meta.sources, L = this.meta.langs;
    const docs = [];
    for (const [d, n] of total) {
      const sr = S[src[d]], dt = dates[d];
      if (f.country && sr.country !== f.country) continue;
      if (f.source && sr.id !== f.source) continue;
      if (f.lang && L[lang[d]] !== f.lang) continue;
      if (f.from && dt < f.from) continue;
      if (f.to && dt > f.to) continue;
      docs.push({ doc: d, n, date: dt, src: src[d], lang: lang[d] });
    }
    return { docs, unsupported };
  }

  /** [title, url, outlet, speaker, isHeadline] for a media document. */
  async mediaDoc(d) {
    const k = Math.floor(d / this.meta.media.chunk);
    if (!this.mchunks.has(k)) this.mchunks.set(k, getGz(`m/d/${k}.json.gz`));
    return (await this.mchunks.get(k))[d % this.meta.media.chunk];
  }

  /** Scan one shard: [{doc, sent, spans}] for sentences matching the query and filters. */
  scan(sh, alts, f) {
    const out = [];
    const src = this.meta.sources, langs = this.meta.langs;
    let si = 0;
    for (let di = 0; di < sh.docs.length; di++) {
      const d = sh.docs[di];
      const n = d[5];
      const ok = (!f.from || d[0] >= f.from) && (!f.to || d[0] <= f.to) && (!f.source || src[d[1]].id === f.source)
        && (!f.lang || langs[d[6]] === f.lang);
      if (ok) {
        for (let k = si; k < si + n; k++) {
          const t = sh.folded[k];
          for (const alt of alts) {
            const spans = [];
            let all = true;
            for (const term of alt) {
              term.re.lastIndex = 0;
              let m, hit = false;
              while ((m = term.re.exec(t))) { if (!m[0].length) { term.re.lastIndex++; continue; } hit = true; spans.push([m.index, m.index + m[0].length]); }
              if (!hit) { all = false; break; }
            }
            if (all) { out.push({ doc: di, sent: k, spans }); break; }
          }
        }
      }
      si += n;
    }
    return out;
  }
}
