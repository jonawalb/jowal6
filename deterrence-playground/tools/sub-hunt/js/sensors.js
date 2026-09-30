// Detection models. Two classical ideas from Koopman (1946, OEG Report 56):
//  - random search (p. 28, eq. 40): P = 1 - exp(-W L / A) for a target somewhere in an area A searched
//    by a track of length L with sweep width W. Used for the sonobuoy field and the aircraft box.
//  - the lateral range curve (p. 24): detection chance as a function of the closest distance x between
//    the target and the searcher's track. Its area is the sweep width W (eq. 27). Used for the towed array.
// Every number fed into these formulas is notional (data/params.js).
import { SENSORS, GAME } from '../data/params.js';
import { dist, offset, distToSegment, seaPointNear, step } from './geo.js';
import { speedOf } from './sub.js';

const B = SENSORS.buoy, M = SENSORS.mpa, S = SENSORS.ship;
export const BUOY_AREA = Math.PI * B.fieldR ** 2;
export const MPA_AREA = (2 * M.half) ** 2;
export const SHIP_AREA = Math.PI * S.faR ** 2;

/** Koopman's random search formula. */
export const randomSearch = (W, L, A) => 1 - Math.exp(-W * L / A);

/** Towed-array lateral range curve p(x) and its sweep width W = area under the curve. */
export const lateral = (x, mode) => { const c = S.lat[mode]; return c.pmax * Math.exp(-x * x / (2 * c.sigma * c.sigma)); };
export const lateralW = mode => { const c = S.lat[mode]; return c.pmax * c.sigma * Math.sqrt(2 * Math.PI); };

/** Per-hour detection chance of a buoy field on a target inside it, for a target at speed v (kt). */
export const buoyP = (mode, v) => randomSearch(B.n * 2 * B.rDet[mode], v, BUOY_AREA);
export const mpaP = mode => randomSearch(M.W[mode], M.L, MPA_AREA);

/** Hours an asset works. Placed during hour t, it starts on the next step. */
export function makeAsset(type, p, t, id) {
  if (type === 'buoy') return { id, type, p, t0: t + 1, t1: t + B.life };
  return { id, type, p, t0: t + 1 + M.delay, t1: t + M.delay + M.onStation };
}
export const activeAt = (a, h) => h >= a.t0 && h <= a.t1;

function insideBox(q, c) { const [x, y] = offset(c, q); return Math.abs(x) <= M.half && Math.abs(y) <= M.half; }

/** Is point q inside a sonobuoy circle or an aircraft square? */
export const covers = (a, q) => (a.type === 'buoy' ? dist(q, a.p) <= B.fieldR : insideBox(q, a.p));

/**
 * Detection chance this hour against a sub state s (truth or particle).
 * a: asset, or {type:'ship', seg:[a,b]}.
 */
export function pDetect(a, s) {
  if (s.out) return 0;
  const q = [s.lon, s.lat], mode = s.sprint ? 'sprint' : 'quiet';
  if (a.type === 'buoy') return dist(q, a.p) <= B.fieldR ? buoyP(mode, speedOf(s)) : 0;
  if (a.type === 'mpa') return insideBox(q, a.p) ? mpaP(mode) : 0;
  return lateral(distToSegment(q, a.seg[0], a.seg[1]), mode);
}

const SPEC = { buoy: [B, BUOY_AREA], mpa: [M, MPA_AREA], ship: [S, SHIP_AREA] };
export const falseRate = type => SPEC[type][0].fa;
export const coverArea = type => SPEC[type][1];
export const locSigma = type => SPEC[type][0].loc;

/** Roll this hour's contacts for one asset: the true detection (if any) plus false contacts. */
export function rollContacts(a, truth, h, rDet, rFa) {
  const out = [];
  const spec = SPEC[a.type][0];
  if (rDet.u() < pDetect(a, truth)) {
    const e = [rDet.normal() * spec.loc, rDet.normal() * spec.loc];
    const p = step(step([truth.lon, truth.lat], 90, e[0]), 0, e[1]);
    out.push({ h, asset: a.id, type: a.type, p, real: true });
  }
  const n = rFa.poisson(spec.fa);
  for (let k = 0; k < n; k++) {
    let p;
    if (a.type === 'mpa') {
      p = step(step(a.p, 90, (rFa.u() * 2 - 1) * M.half), 0, (rFa.u() * 2 - 1) * M.half);
      p = seaPointNear(rFa, p, 3);
    } else {
      const c = a.type === 'ship' ? a.seg[1] : a.p;
      p = seaPointNear(rFa, c, a.type === 'ship' ? S.faR : B.fieldR);
    }
    out.push({ h, asset: a.id, type: a.type, p, real: false });
  }
  // Shuffle so the true contact is not always first in the log.
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rFa.u() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** Likelihood factor for one particle given one asset's contacts this hour (up to a constant). */
export function likelihood(a, s, contacts) {
  const pd = pDetect(a, s);
  if (!contacts.length) return 1 - pd;
  if (pd === 0) return 1;
  const sig = locSigma(a.type), dens = falseRate(a.type) / coverArea(a.type);
  let sum = 0;
  for (const c of contacts) {
    const d = dist([s.lon, s.lat], c.p);
    sum += Math.exp(-d * d / (2 * sig * sig)) / (2 * Math.PI * sig * sig);
  }
  return (1 - pd) + pd * sum / dens;
}

export const PROS_R = GAME.prosR;
