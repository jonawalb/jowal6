// Bayesian search map as a particle filter, the representation Stone et al. (2014) used for AF 447:
// each particle is one possible submarine that follows the same movement rules as the real one. Every hour
// the particles move (prediction), then each is reweighted by how likely this hour's search results would
// be if the sub were there (Bayes' rule). Searching an area and finding nothing drains weight from it.
import { spawn, stepSub } from './sub.js';
import { likelihood, pDetect } from './sensors.js';
import { dist, isLand, step, BOX } from './geo.js';

export const HEAT = { nx: 80, ny: 50 };
const CW = (BOX[2] - BOX[0]) / HEAT.nx, CH = (BOX[3] - BOX[1]) / HEAT.ny;

export function createFilter(rng, n, beh, datum, r) {
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(spawn(rng, beh, datum, r));
  const w = new Float64Array(n).fill(1 / n);
  return { rng, parts, w, n };
}

export function predict(f, threats, share) {
  for (const s of f.parts) stepSub(s, f.rng, threats, share);
}

/**
 * Reweight by one hour of search. obs: [{asset, contacts}]. Returns the prior chance (before this
 * hour's results) that this hour's search would detect the sub.
 */
export function update(f, obs) {
  let pAny = 0, tot = 0;
  for (let i = 0; i < f.n; i++) {
    const s = f.parts[i];
    let miss = 1, L = 1;
    for (const o of obs) {
      miss *= 1 - pDetect(o.asset, s);
      L *= likelihood(o.asset, s, o.contacts);
    }
    pAny += f.w[i] * (1 - miss);
    f.w[i] *= L;
    tot += f.w[i];
  }
  normalize(f, tot);
  return pAny;
}

/** Reweight by a clue: fn(s) returns the likelihood of the clue if the sub were at particle s. */
export function applyClue(f, fn) {
  let tot = 0;
  for (let i = 0; i < f.n; i++) { f.w[i] *= fn(f.parts[i]); tot += f.w[i]; }
  normalize(f, tot);
}

function normalize(f, tot) {
  if (!(tot > 0)) { f.w.fill(1 / f.n); return; }
  for (let i = 0; i < f.n; i++) f.w[i] /= tot;
}

export function ess(f) { let s = 0; for (const x of f.w) s += x * x; return 1 / s; }

/** Systematic resampling with a small position jitter, when the weights have collapsed. */
export function maybeResample(f) {
  if (ess(f) > f.n / 2) return false;
  const out = [], u0 = f.rng.u() / f.n;
  let c = f.w[0], i = 0;
  for (let k = 0; k < f.n; k++) {
    const u = u0 + k / f.n;
    while (u > c && i < f.n - 1) { i += 1; c += f.w[i]; }
    const s = { ...f.parts[i], home: f.parts[i].home ? f.parts[i].home.slice() : null };
    if (!s.out) {
      const q = step([s.lon, s.lat], f.rng.u() * 360, Math.abs(f.rng.normal()) * 1.5);
      if (!isLand(q[0], q[1])) { s.lon = q[0]; s.lat = q[1]; }
    }
    out.push(s);
  }
  f.parts = out;
  f.w.fill(1 / f.n);
  return true;
}

/** Probability the sub has already broken out into the Atlantic. */
export function pOut(f) { let s = 0; f.parts.forEach((p, i) => { if (p.out) s += f.w[i]; }); return s; }

/** Probability the sub is within r nm of point q. */
export function pWithin(f, q, r) {
  let s = 0;
  f.parts.forEach((p, i) => { if (!p.out && dist(q, [p.lon, p.lat]) <= r) s += f.w[i]; });
  return s;
}

/** Heat grid of probability per cell (sums to 1 - pOut), lightly smoothed for display. */
export function heat(f) {
  const { nx, ny } = HEAT, g = new Float32Array(nx * ny);
  f.parts.forEach((p, k) => {
    if (p.out) return;
    const i = Math.floor((p.lon - BOX[0]) / CW), j = Math.floor((BOX[3] - p.lat) / CH);
    if (i >= 0 && j >= 0 && i < nx && j < ny) g[j * nx + i] += f.w[k];
  });
  return g;
}

export function smooth(g) {
  const { nx, ny } = HEAT, o = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let s = 0, wsum = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
      const k = di === 0 && dj === 0 ? 4 : (di === 0 || dj === 0 ? 2 : 1);
      s += g[b * nx + a] * k; wsum += k;
    }
    o[j * nx + i] = s / wsum;
  }
  return o;
}

/** Centre [lon, lat] of heat cell k. */
export const cellCenter = k => [BOX[0] + (k % HEAT.nx + 0.5) * CW, BOX[3] - (Math.floor(k / HEAT.nx) + 0.5) * CH];

/** Smallest area (in cells) holding half the probability: a measure of how sharp the map is. */
export function halfArea(g) {
  const v = Array.from(g).sort((a, b) => b - a), tot = v.reduce((a, b) => a + b, 0);
  let s = 0, n = 0;
  for (const x of v) { if (s >= tot / 2) break; s += x; n += 1; }
  return n;
}
