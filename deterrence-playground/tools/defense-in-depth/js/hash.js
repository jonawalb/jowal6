// Share links (SPEC §9.6; D-31):
//   #v=1&r=1&p=d&s=4172&sc=d&e=w&m=s&df=s&b=5&n=9&pl=<plan>&l=<log>&c=<campaign>
// v = link-format version, r = rules version (data/params.js RULES), p = side played (d defend / a attack),
// s = seed (1-999999), sc = scale (d/c/a), e = era (w/m), m = mode (s/c), df = difficulty (e/s/h), b = balance
// 0-10, n = hours played, pl = planning choices, l = action log, c = campaign state.
// The log is compact base36 tokens (fields joined by '.', actions by '_'); pl and c are JSON in base64url.
// Any of pl / l / c longer than 1500 characters is deflate-raw compressed (prefix 'z'; encodeAsync).
// decode() never throws: an unknown or older v / r gives { ok: false, old: true, message, fresh }.
import { RULES, OFFDEF } from '../data/params.js';

const B = 36;
const num = x => (x < 0 ? '~' + (-x).toString(B) : x.toString(B));
const unnum = s => (s[0] === '~' ? -parseInt(s.slice(1), B) : parseInt(s, B));
// Per kind: [code, fields]; field types: u id/enum string, i int, f float (x10), I int list, U string list.
const K = {
  move: ['m', [['unit', 'u'], ['to', 'i'], ['mode', 'u'], ['prefer', 'u']]],
  posture: ['p', [['unit', 'u'], ['v', 'u']]], form: ['f', [['unit', 'u'], ['v', 'u']]],
  stance: ['s', [['unit', 'u'], ['v', 'u']]], mode: ['o', [['unit', 'u'], ['v', 'u']]],
  leapfrog: ['l', [['unit', 'u'], ['unit2', 'u'], ['to', 'i'], ['to2', 'i'], ['bound', 'u']]],
  lane: ['n', [['unit', 'u'], ['dir', 'i']]],
  fire: ['x', [['unit', 'u'], ['m', 'u'], ['sec', 'i'], ['target', 'u']]],
  riposte: ['r', [['unit', 'u'], ['sec', 'i']]],
  counterstroke: ['c', [['fmn', 'u'], ['secs', 'I'], ['h', 'i']]],
  breach: ['b', [['unit', 'u'], ['sec', 'i']]], displace: ['d', [['unit', 'u'], ['sec', 'i']]], ds: ['y', [['unit', 'u'], ['fmn', 'u']]],
  barrage: ['z', [['cols', 'I'], ['r0', 'i'], ['rate', 'f'], ['bats', 'U'], ['stop', 'i']]],
  drone: ['q', [['unit', 'u'], ['m', 'u'], ['sec', 'i']]], jam: ['j', [['unit', 'u'], ['sec', 'i']]],
  air: ['a', [['side', 'u'], ['sec', 'i']]],
  fmn: ['F', [['fmn', 'u'], ['order.kind', 'u'], ['order.to', 'i'], ['order.v', 'u'], ['order.width', 'i'], ['order.rect', 'R'],
    ['order.secs', 'I'], ['order.h', 'i'], ['order.plan', 'u'], ['order.mode', 'u']]],
};
const BY_CODE = Object.fromEntries(Object.entries(K).map(([k, [c, f]]) => [c, [k, f]]));
const get = (o, path) => path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
const put = (o, path, v) => { const ks = path.split('.'); let x = o; for (const k of ks.slice(0, -1)) x = x[k] ||= {}; x[ks[ks.length - 1]] = v; };
const SAFE = /^[a-z0-9]*$/i;

function encField(v, type) {
  if (v == null) return '';
  switch (type) {
    case 'i': return num(Math.round(v));
    case 'f': return num(Math.round(v * 10));
    case 'I': return v.map(x => num(Math.round(x))).join('-');
    case 'U': return v.filter(x => SAFE.test(x)).join('-');
    case 'R': return [v.r0, v.r1, v.c0, v.c1].map(x => num(x)).join('-');
    default: return SAFE.test(String(v)) ? String(v) : '';
  }
}
function decField(s, type) {
  if (s === '') return undefined;
  switch (type) {
    case 'i': return unnum(s);
    case 'f': return unnum(s) / 10;
    case 'I': return s.split('-').map(unnum);
    case 'U': return s.split('-');
    case 'R': { const [r0, r1, c0, c1] = s.split('-').map(unnum); return { r0, r1, c0, c1 }; }
    default: return s;
  }
}

/** Action log -> compact token string. */
export function encodeLog(log) {
  return (log || []).filter(a => K[a.kind]).map(a => {
    const [code, fields] = K[a.kind];
    const parts = [num(a.t), code, ...fields.map(([p, ty]) => encField(get(a, p), ty))];
    while (parts.length > 2 && parts[parts.length - 1] === '') parts.pop();
    return parts.join('.');
  }).join('_');
}
/** Token string -> action log. Unknown tokens are skipped. */
export function decodeLog(s) {
  const out = [];
  for (const tok of (s || '').split('_')) {
    if (!tok) continue;
    const [t, code, ...vals] = tok.split('.');
    const k = BY_CODE[code];
    if (!k || !/^[0-9a-z]+$/.test(t)) continue;
    const a = { t: parseInt(t, B), kind: k[0] };
    k[1].forEach(([p, ty], i) => { const v = decField(vals[i] ?? '', ty); if (v !== undefined && !Number.isNaN(v)) put(a, p, v); });
    out.push(a);
  }
  return out;
}

// base64url of UTF-8 text / bytes (works in browsers and Node).
const toB64 = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64 = s => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const json64 = o => toB64(new TextEncoder().encode(JSON.stringify(o)));
const unjson64 = s => JSON.parse(new TextDecoder().decode(fromB64(s)));

const LIMIT = 1500;
async function pipe(bytes, Stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw')));
  return new Uint8Array(await out.arrayBuffer());
}
const zip = async str => 'z' + toB64(await pipe(new TextEncoder().encode(str), CompressionStream));
const unzip = async str => new TextDecoder().decode(await pipe(fromB64(str.slice(1)), DecompressionStream));

/**
 * State -> URL hash (without '#'). st: { side: 'def'|'att', seed, scale, era, mode, diff, od, n, plan, log, campaign }.
 * Synchronous: no compression (encodeAsync compresses long fields).
 */
export function encode(st) {
  const q = new URLSearchParams();
  q.set('v', RULES.link); q.set('r', RULES.version);
  q.set('p', st.side === 'att' ? 'a' : 'd'); q.set('s', st.seed);
  q.set('sc', st.scale || 'd'); q.set('e', st.era || 'w'); q.set('m', st.mode || 's'); q.set('df', st.diff || 's');
  q.set('b', st.od ?? OFFDEF.standard);
  if (st.n) q.set('n', st.n);
  if (st.plan) q.set('pl', json64(st.plan));
  if (st.log && st.log.length) q.set('l', encodeLog(st.log));
  if (st.campaign) q.set('c', json64(st.campaign));
  return q.toString();
}
export async function encodeAsync(st) {
  const q = new URLSearchParams(encode(st));
  for (const k of ['pl', 'l', 'c']) { const v = q.get(k); if (v && v.length > LIMIT && typeof CompressionStream !== 'undefined') q.set(k, await zip(v)); }
  return q.toString();
}

const pick = (x, list, d) => (list.includes(x) ? x : d);
const FRESH_MSG = r => `This link was made with an earlier version of Defense in Depth (rules r${r}). It can't be replayed exactly. Start the same scenario fresh?`;

/** URL hash -> state. Never throws. Compressed fields ('z') need decodeAsync. */
export function decode(hash) {
  try { return decodeQ(new URLSearchParams(String(hash || '').replace(/^#/, '')), null); }
  catch { return { ok: false, error: 'unreadable', message: 'This link could not be read. Start a new game?' }; }
}
export async function decodeAsync(hash) {
  try {
    const q = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    const raw = {};
    for (const k of ['pl', 'l', 'c']) { const v = q.get(k); raw[k] = v && v[0] === 'z' && typeof DecompressionStream !== 'undefined' ? await unzip(v) : v; }
    return decodeQ(q, raw);
  } catch { return { ok: false, error: 'unreadable', message: 'This link could not be read. Start a new game?' }; }
}

function decodeQ(q, raw) {
  const s = Math.round(Number(q.get('s')));
  const b = q.get('b') === null ? OFFDEF.standard : Math.round(Number(q.get('b')));
  const base = {
    side: q.get('p') === 'a' ? 'att' : 'def',
    seed: Number.isFinite(s) && s >= 1 && s <= 999999 ? s : null,
    scale: pick(q.get('sc'), ['d', 'c', 'a'], 'd'), era: pick(q.get('e'), ['w', 'm'], 'w'), mode: pick(q.get('m'), ['s', 'c'], 's'),
    diff: pick(q.get('df'), ['e', 's', 'h'], 's'), od: Number.isFinite(b) ? Math.max(OFFDEF.min, Math.min(OFFDEF.max, b)) : OFFDEF.standard,
  };
  const v = Number(q.get('v')), r = Number(q.get('r'));
  if (v !== RULES.link || r !== RULES.version) {
    return { ok: false, old: true, error: 'version', message: FRESH_MSG(Number.isFinite(r) ? r : 0), fresh: { ...base, n: 0, plan: null, log: [] } };
  }
  const val = k => (raw && raw[k] != null ? raw[k] : q.get(k));
  const pl = val('pl'), l = val('l'), c = val('c');
  if ([pl, l, c].some(x => x && x[0] === 'z')) return { ok: false, error: 'compressed', message: 'Opening this link needs a newer browser.', fresh: { ...base, n: 0, plan: null, log: [] } };
  return { ok: true, ...base, n: Math.max(0, Math.round(Number(q.get('n')) || 0)), plan: pl ? unjson64(pl) : null, log: decodeLog(l || ''), campaign: c ? unjson64(c) : null };
}

/** Browser helpers: write the current state into location.hash / read it back. */
export function writeHash(st) { if (typeof history !== 'undefined') encodeAsync(st).then(h => history.replaceState(null, '', '#' + h)); }
export function readHash() { return typeof location !== 'undefined' ? decodeAsync(location.hash) : Promise.resolve(decode('')); }
