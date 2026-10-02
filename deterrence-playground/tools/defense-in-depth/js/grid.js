// Grid geometry (SPEC §2.1, §2.4). All sizes come from data/scales.js: no module holds a literal grid size.
// Sector index i = row * cols + col. Row 0 is the attacker's rear edge; rows grow toward the defender's rear.
// Eight directions, index 0..7 clockwise from "N" (toward the defender's rear, row + 1).
import { SCALES, zoneOf, crestRow } from '../data/scales.js';

export const DIRS = [
  { k: 'N', dr: 1, dc: 0 }, { k: 'NE', dr: 1, dc: 1 }, { k: 'E', dr: 0, dc: 1 }, { k: 'SE', dr: -1, dc: 1 },
  { k: 'S', dr: -1, dc: 0 }, { k: 'SW', dr: -1, dc: -1 }, { k: 'W', dr: 0, dc: -1 }, { k: 'NW', dr: 1, dc: -1 },
];
export const FWD = { att: 0, def: 4 };      // facing: attackers toward the defender's rear, defenders toward the attacker
export const opp = d => (d + 4) & 7;
/** Smallest angle between two directions in 45-degree steps (0..4). */
export const turn = (a, b) => { const x = Math.abs(a - b) & 7; return x > 4 ? 8 - x : x; };

const cache = new Map();

/** Geometry for a scale id ('d' | 'c' | 'a'); cached. */
export function gridFor(scaleId) {
  if (cache.has(scaleId)) return cache.get(scaleId);
  const S = SCALES[scaleId];
  if (!S) throw new Error(`unknown scale ${scaleId}`);
  const { cols, rows } = S, n = cols * rows;
  const row = new Int16Array(n), col = new Int16Array(n), zone = new Array(n);
  for (let i = 0; i < n; i++) { row[i] = (i / cols) | 0; col[i] = i % cols; zone[i] = zoneOf(S, row[i]); }
  // Neighbour i in direction d, or -1.
  const step = new Int32Array(n * 8).fill(-1);
  const nbrs = [];
  for (let i = 0; i < n; i++) {
    const list = [];
    for (let d = 0; d < 8; d++) {
      const r = row[i] + DIRS[d].dr, c = col[i] + DIRS[d].dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      step[i * 8 + d] = r * cols + c;
      list.push(r * cols + c);
    }
    nbrs.push(list);
  }
  const G = {
    id: scaleId, S, cols, rows, n, row, col, zone, step, nbrs, crest: crestRow(S),
    idx: (r, c) => (r < 0 || r >= rows || c < 0 || c >= cols ? -1 : r * cols + c),
    at: (i, d) => step[i * 8 + d],
    /** Chebyshev distance in sectors. */
    dist: (a, b) => Math.max(Math.abs(row[a] - row[b]), Math.abs(col[a] - col[b])),
    adj: (a, b) => a !== b && Math.abs(row[a] - row[b]) <= 1 && Math.abs(col[a] - col[b]) <= 1,
    /** Direction index from a to b (the nearest of the 8 compass steps), or -1 if a === b. */
    dirTo: (a, b) => {
      const dr = Math.sign(row[b] - row[a]), dc = Math.sign(col[b] - col[a]);
      if (!dr && !dc) return -1;
      // For long, shallow lines use the dominant axis so a lane-like line reads straight.
      const ar = Math.abs(row[b] - row[a]), ac = Math.abs(col[b] - col[a]);
      const r2 = ac > 2 * ar ? 0 : dr, c2 = ar > 2 * ac ? 0 : dc;
      return DIRS.findIndex(d => d.dr === r2 && d.dc === c2);
    },
  };
  cache.set(scaleId, G);
  return G;
}

/** Bresenham cells strictly between a and b. */
export function between(G, a, b) {
  const out = [];
  let r0 = G.row[a], c0 = G.col[a];
  const r1 = G.row[b], c1 = G.col[b];
  const dr = Math.abs(r1 - r0), dc = Math.abs(c1 - c0), sr = r0 < r1 ? 1 : -1, sc = c0 < c1 ? 1 : -1;
  let err = dc - dr;
  for (;;) {
    if (r0 === r1 && c0 === c1) break;
    const e2 = 2 * err;
    if (e2 > -dr) { err -= dr; c0 += sc; }
    if (e2 < dc) { err += dc; r0 += sr; }
    if (r0 === r1 && c0 === c1) break;
    out.push(r0 * G.cols + c0);
  }
  return out;
}

/**
 * Line of sight from a to b (SPEC §2.4): blocked if any intermediate cell's elevation exceeds the linear
 * interpolation of the endpoints' elevations by >= 1, or the cell holds smoke. smoke: Uint8Array or null.
 * Smoke in the target cell also blocks ("through and into the sector").
 */
export function los(G, elev, a, b, smoke = null) {
  if (a === b) return true;
  if (smoke && smoke[b]) return false;
  const mid = between(G, a, b);
  if (!mid.length) return true;
  const ea = elev[a], eb = elev[b], L = mid.length + 1;
  for (let k = 0; k < mid.length; k++) {
    const c = mid[k];
    if (smoke && smoke[c]) return false;
    if (elev[c] - (ea + (eb - ea) * (k + 1) / L) >= 1) return false;
  }
  return true;
}

/**
 * An MG lane from sector m in direction d (SPEC §2.4): m+d, m+2d, m+3d, stopping at the first
 * LOS-blocked cell or the map edge. Returns the covered sectors (may be fewer than 3).
 */
export function laneCells(G, elev, m, d, len = 3) {
  const out = [];
  let i = m;
  for (let k = 0; k < len; k++) {
    i = G.at(i, d);
    if (i < 0) break;
    if (!los(G, elev, m, i)) break;
    out.push(i);
  }
  return out;
}

export const popcount = x => { x -= (x >> 1) & 0x55; x = (x & 0x33) + ((x >> 2) & 0x33); return (x + (x >> 4)) & 0x0f; };
