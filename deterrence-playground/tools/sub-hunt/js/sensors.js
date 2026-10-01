// Detection models. Two classical ideas from Koopman (1946, OEG Report 56):
//  - random search (p. 28, eq. 40): P = 1 - exp(-W L / A) for a target somewhere in an area A searched
//    by a track of length L with sweep width W. Used for the buoy circle and the aircraft box.
//  - the lateral range curve (p. 24): detection chance as a function of the closest distance x between
//    the target and the searcher's track. Its area is the sweep width W (eq. 27). Used for the ship.
// The buoy line uses plain geometry: a sub crossing a line of buoys spaced s apart passes within r of a
// buoy with chance 2r/s. The helicopter dip and the listening network use flat per-hour chances.
// Every number fed into these formulas is notional (data/params.js).
import { SENSORS, SUB } from '../data/params.js';
import { dist, offset, bearing, distToSegment, segmentsCross, seaPointNear, step } from './geo.js';

const C = SENSORS.circle, LN = SENSORS.line, A = SENSORS.air, H = SENSORS.helo, S = SENSORS.ship, N = SENSORS.net;
export const CIRCLE_AREA = Math.PI * C.r ** 2;
export const AIR_AREA = (2 * A.half) ** 2;
export const HELO_AREA = Math.PI * H.r ** 2;
export const LINE_AREA = LN.len * 6;
const SPACING = LN.len / (LN.n - 1);
const RAD = Math.PI / 180;

/** Koopman's random search formula. */
export const randomSearch = (W, L, Ar) => 1 - Math.exp(-W * L / Ar);

/** Ship lateral range curve p(x) and its sweep width W = area under the curve. */
export const lateral = (x, mode) => { const c = S.lat[mode]; return c.pmax * Math.exp(-x * x / (2 * c.sigma * c.sigma)); };
export const lateralW = mode => { const c = S.lat[mode]; return c.pmax * c.sigma * Math.sqrt(2 * Math.PI); };

export const circleP = (mode, v) => randomSearch(C.n * 2 * C.rDet[mode], Math.max(1, v), CIRCLE_AREA);
export const airP = mode => randomSearch(A.W[mode], A.L, AIR_AREA);
export const lineP = mode => Math.min(0.95, 2 * LN.rDet[mode] / SPACING);

/** Buoy lines lie on 8 axes 22.5° apart (a line at θ and θ + 180° is the same line). 90° is east–west. */
export const AXIS_STEP = 180 / 8;
export const AXES = Array.from({ length: 8 }, (_, k) => k * AXIS_STEP);
/** The axis (degrees in [0, 180)) nearest a heading. */
export const snapAxis = ang => (Math.round((((ang % 180) + 180) % 180) / AXIS_STEP) % 8) * AXIS_STEP;
/** A line's stored heading: one of the 8 axes, or (from older links) a whole degree in [0, 180). */
export function lineHeading(ang) {
  const a = ((ang % 180) + 180) % 180, k = a / AXIS_STEP;
  return Math.abs(k - Math.round(k)) < 1e-6 ? snapAxis(a) : Math.round(a) % 180;
}

/** A buoy line centred on p at heading ang: its two ends. */
export function lineEnds(p, ang) {
  return [step(p, ang, LN.len / 2), step(p, ang + 180, LN.len / 2)];
}

/** The line's buoys, evenly spaced (len / (n - 1) nm apart) along its axis from ends[0] to ends[1]. */
export function buoyPoints(p, ang) {
  return Array.from({ length: LN.n }, (_, k) => step(p, ang, LN.len / 2 - k * SPACING));
}

/** Build an asset placed during turn t (clock hour t*2). Hours are numbered from 1. */
export function makeAsset(type, p, hour, id, ang = 0) {
  const a = { id, type, p, t0: hour + 1 };
  if (type === 'circle') a.t1 = hour + C.life;
  else if (type === 'line') { a.t1 = hour + LN.life; a.ang = ang; a.ends = lineEnds(p, ang); }
  else if (type === 'helo') a.t1 = hour + H.hours; // a dip listens in the first hour of the turn
  else a.t1 = hour + 2;               // the aircraft works both hours of this turn
  return a;
}
export const activeAt = (a, h) => h >= a.t0 && h <= a.t1;

function inBox(q, c) { const [x, y] = offset(c, q); return Math.abs(x) <= A.half && Math.abs(y) <= A.half; }

/** Is point q inside an asset's footprint (the strip within 15 nm of a line)? */
export function covers(a, q) {
  if (a.type === 'circle') return dist(q, a.p) <= C.r;
  if (a.type === 'helo') return dist(q, a.p) <= H.r;
  if (a.type === 'air') return inBox(q, a.p);
  if (a.type === 'line') return distToSegment(q, a.ends[0], a.ends[1]) <= 15;
  return false;
}

/** Detection chance this hour against a sub state s (truth or particle). A hiding shy sub is harder to hear. */
export function pDetect(a, s) {
  if (s.out) return 0;
  return s.mode === 'hide' ? SUB.shy.hush * rawDetect(a, s) : rawDetect(a, s);
}

function rawDetect(a, s) {
  const q = [s.lon, s.lat], mode = s.sprint ? 'sprint' : 'quiet';
  switch (a.type) {
    case 'circle': return dist(q, a.p) <= C.r ? circleP(mode, s.speed) : 0;
    case 'line': return segmentsCross([s.plon, s.plat], q, a.ends[0], a.ends[1]) ? lineP(mode) : 0;
    case 'air': return inBox(q, a.p) ? airP(mode) : 0;
    case 'helo': return dist(q, a.p) <= H.r ? H.p[mode] : 0;
    case 'ship': return a.deaf ? 0 : lateral(distToSegment(q, a.seg[0], a.seg[1]), mode);
    case 'net': return s.sprint ? N.p : 0;
    default: return 0;
  }
}

const SPEC = {
  circle: { fa: C.fa, loc: C.loc, area: CIRCLE_AREA }, line: { fa: LN.fa, loc: LN.loc, area: LINE_AREA },
  air: { fa: A.fa, loc: A.loc, area: AIR_AREA }, helo: { fa: H.fa, loc: H.loc, area: HELO_AREA },
  net: { fa: 0, loc: N.loc, area: 1 }, ship: { fa: S.fa, brg: S.brg },
};
export const locOf = type => SPEC[type].loc;

function falsePoint(a, r) {
  if (a.type === 'air') return seaPointNear(r, step(step(a.p, 90, (r.u() * 2 - 1) * A.half), 0, (r.u() * 2 - 1) * A.half), 2);
  if (a.type === 'line') { const t = r.u(); const q = [a.ends[0][0] + t * (a.ends[1][0] - a.ends[0][0]), a.ends[0][1] + t * (a.ends[1][1] - a.ends[0][1])]; return seaPointNear(r, q, 3); }
  return seaPointNear(r, a.p, a.type === 'helo' ? H.r : C.r);
}

/** Roll this hour's contacts for one asset: the true detection (if any) plus false contacts. */
export function rollContacts(a, truth, h, rDet, rFa) {
  const out = [], spec = SPEC[a.type], base = { h, asset: a.id, type: a.type };
  const from = a.type === 'ship' ? a.seg[1] : null;
  if (rDet.u() < pDetect(a, truth)) {
    const tp = [truth.lon, truth.lat];
    if (a.type === 'ship') out.push({ ...base, from, brg: (bearing(from, tp) + rDet.normal() * spec.brg + 360) % 360, real: true });
    else out.push({ ...base, p: step(step(tp, 90, rDet.normal() * spec.loc), 0, rDet.normal() * spec.loc), real: true });
  }
  const n = a.type === 'ship' && a.deaf ? 0 : rFa.poisson(spec.fa);
  for (let k = 0; k < n; k++) {
    if (a.type === 'ship') out.push({ ...base, from, brg: rFa.u() * 360, real: false });
    else out.push({ ...base, p: falsePoint(a, rFa), real: false });
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rFa.u() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const angDiff = (a, b) => ((a - b + 540) % 360) - 180;

/** Likelihood factor for one particle given one asset's contacts this hour (up to a constant). */
export function likelihood(a, s, contacts) {
  const pd = pDetect(a, s);
  if (!contacts.length) return 1 - pd;
  const spec = SPEC[a.type];
  let sum = 0, dens;
  if (a.type === 'ship') {
    const sig = spec.brg * RAD;
    dens = spec.fa / (2 * Math.PI);
    for (const c of contacts) {
      const d = angDiff(bearing(c.from, [s.lon, s.lat]), c.brg) * RAD;
      sum += Math.exp(-d * d / (2 * sig * sig)) / (Math.sqrt(2 * Math.PI) * sig);
    }
  } else {
    const sig = spec.loc;
    dens = spec.fa / spec.area;
    for (const c of contacts) {
      const d = dist([s.lon, s.lat], c.p);
      sum += Math.exp(-d * d / (2 * sig * sig)) / (2 * Math.PI * sig * sig);
    }
  }
  if (!(dens > 0)) return pd * sum; // no false contacts: a contact must be the sub
  return (1 - pd) + pd * sum / dens;
}
