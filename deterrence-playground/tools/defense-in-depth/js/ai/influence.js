// Influence maps for the computer opponent (SPEC §5.3): one pass per side per hour over sectors and units,
// built ONLY from the side's own fogged picture (js/vision.js picture(g, side) in fog mode), its own units, the
// public map and the works it has seen. It never reads enemy unit records. Arrays over sectors:
//   bel    believed enemy strength (tracks + movement reports);
//   mine   friendly fighting strength;
//   dirs   believed number of directions the enemy's fire covers a sector from (attacker: inferred from tracks
//          and seen works; defender: its own coverage of the ground, which it knows);
//   threat believed enemy fire potential reaching a sector;
//   toObj  rows from the sector to the objective line (positive = short of it, attacker's view).
// Reaction latency (SPEC §5.2): the picture is read `latency` hours old.
import { SCALES } from '../../data/scales.js';
import { TYPES } from '../../data/units.js';
import { gridFor, popcount, opp } from '../grid.js';
import { picture } from '../vision.js';
import { fighting, isBattery } from '../forces.js';

/** Own units of a side (the only unit records the AI reads). */
export const own = (g, side) => g.units.filter(u => u.side === side);
export const ownFighting = (g, side) => g.units.filter(u => u.side === side && fighting(u));

// Fire reach of a believed enemy track, by type (sectors) and weight (believed fire potential per strength point).
const REACH = { mg: 3, rifle: 1, storm: 1, tank: 1, mortar: 2, pioneer: 1 };

/**
 * Build (or reuse this hour's) influence maps for `side`. Cached on g._ai[side].inf by hour and latency.
 */
export function influence(g, side, latency = 0) {
  const mem = ((g._ai ||= {})[side] ||= {});
  if (mem.inf && mem.inf.t === g.t && mem.inf.lat === latency) return mem.inf;
  const G = gridFor(g.scale), S = SCALES[g.scale], n = G.n;
  const T = Math.max(0, g.t - latency);
  const pic = picture(g, side, 'fog', T);
  const bel = Float32Array.from(pic.sec), mine = new Float32Array(n), threat = new Float32Array(n), dirs = new Uint8Array(n);
  const toObj = new Int16Array(n);
  for (let s = 0; s < n; s++) toObj[s] = S.obj.row - G.row[s];
  for (const u of g.units) if (u.side === side && fighting(u)) mine[u.sec] += u.str;
  if (side === 'def') {
    // The defender knows its own lanes and frontal arcs (g.coverDirs.def is computed from its own units).
    const cd = g.coverDirs.def;
    for (let s = 0; s < n; s++) dirs[s] = popcount(cd[s]);
    for (const tr of pic.tracks) spread(G, threat, tr.sec, (tr.est || 0) * (TYPES[tr.type] ? TYPES[tr.type].fp || 0 : 0), 1);
    for (const m of pic.marks) threat[m.sec] += 2;
  } else {
    // The attacker infers coverage: a believed rifle covers its frontal arc; a believed MG (or a seen strongpoint
    // not yet exposed as a dummy) may lay a lateral lane up to 3 sectors either way along its row.
    const mask = new Uint8Array(n);
    const seenAt = new Set();
    for (const tr of pic.tracks) {
      const fp = TYPES[tr.type] ? TYPES[tr.type].fp || 0 : 0;
      seenAt.add(tr.sec);
      if (!fp) continue;
      arc(G, mask, tr.sec);
      if (tr.type === 'mg') lateral(G, mask, tr.sec);
      spread(G, threat, tr.sec, tr.est * fp, REACH[tr.type] || 1);
    }
    const K = g.known.att;
    for (let s = 0; s < n; s++) {
      if (!(K[s] & 8) || (K[s] & 16) || seenAt.has(s) || g.ctrl[s] === 2) continue;   // seen strongpoint, not a known dummy
      lateral(G, mask, s); arc(G, mask, s);
      spread(G, threat, s, 6 * 1.5, 2);
      bel[s] = Math.max(bel[s], 3);
    }
    for (const m of pic.marks) threat[m.sec] += 2;
    for (let s = 0; s < n; s++) dirs[s] = popcount(mask[s]);
  }
  mem.inf = { t: g.t, lat: latency, T, side, pic, bel, mine, threat, dirs, toObj };
  return mem.inf;
}

/** Add w to the threat of every sector within r of sec (Chebyshev), halving per ring. */
function spread(G, arr, sec, w, r) {
  if (!(w > 0)) return;
  const r0 = G.row[sec], c0 = G.col[sec];
  for (let dr = -r; dr <= r; dr++) for (let dc = -r; dc <= r; dc++) {
    const c = G.idx(r0 + dr, c0 + dc);
    if (c < 0) continue;
    const k = Math.max(Math.abs(dr), Math.abs(dc));
    arr[c] += w / (1 << k);
  }
}

/** A defender's frontal arc (toward the attacker, row - 1) as coverage directions on those cells. */
function arc(G, mask, sec) {
  for (const d of [4, 3, 5]) { const c = G.at(sec, d); if (c >= 0) mask[c] |= 1 << opp(d); }
}
/** A possible lateral MG lane (E and W, 3 cells) from sec. */
function lateral(G, mask, sec) {
  for (const d of [2, 6]) { let c = sec; for (let k = 0; k < 3; k++) { c = G.at(c, d); if (c < 0) break; mask[c] |= 1 << opp(d); } }
}

/** Believed enemy strength in a sector and its neighbours. */
export function near(G, arr, sec) {
  let s = arr[sec];
  for (const c of G.nbrs[sec]) s += arr[c];
  return s;
}

/** Enemy batteries this side has located (from its own 'located' events), most recent first; ids only. */
export function located(g, side, sinceT = 0) {
  const mem = ((g._ai ||= {})[side] ||= {});
  const L = (mem.located ||= { cur: 0, ids: new Map() });
  for (let i = L.cur; i < g.events.length; i++) {
    const e = g.events[i];
    if (e.kind === 'located' && e.side === side && e.unit != null) L.ids.set(e.unit, e.t);
    if (e.kind === 'cb' && e.side === side) L.hit = (L.hit || 0) + 1;
  }
  L.cur = g.events.length;
  return [...L.ids.entries()].filter(([, t]) => t >= sinceT).sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/** Batteries of a side that can take a mission this hour (not on the barrage, not displacing). */
export function freeBatteries(g, side, busy = new Set()) {
  return g.units.filter(b => b.side === side && isBattery(b) && !b.broken && b.guns > 0 && !(b.busy > g.t) && !busy.has(b.id));
}
