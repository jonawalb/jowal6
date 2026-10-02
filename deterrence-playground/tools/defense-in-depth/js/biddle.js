// Biddle's formal model (Military Power, 2004, Appendix A, equations A.1-A.23, pp. 209-217), as pure functions.
// A line-for-line port of scratchpad/did/model.py (the brief's verified rebuild). Used by the Lessons charts
// (L10-L13) with the BOOK constants and by the planning UI with the NOTIONAL SECTOR rescale.
import { BOOK, SECTOR } from '../data/biddle.js';

export { BOOK, SECTOR };

/** Technology index T = (tau - 1900)/10, A.1-A.2 (p. 211). */
export const techIndex = tau => (tau - 1900) / 10;

/**
 * Run the model once. Any field of BOOK may be overridden; `Va: null` gives the attacker's gain-maximizing
 * assault velocity (A.23, p. 216). Returns raw (unrounded) values.
 * @param {object} over  parameter overrides
 * @param {object} [base=BOOK]  constant set (BOOK or SECTOR)
 */
export function run(over = {}, base = BOOK) {
  const p = { ...base, ...over };
  const { R, B, d, fr, fe, wa, wth, k1, k2, k3, k4, k5, k6, k7, k8, k9 } = p;
  const Vr = Math.max(p.Vr, 1e-6);
  const TR = techIndex(p.tR), TB = techIndex(p.tB);
  const TC = TB * TB / TR;                    // A.3 dyadic balance at the point of attack
  const Trho = TR * TR / TB;                  // A.4 on the flanks
  const Ps = Math.pow(TR, -k2 * Vr);          // A.5 reserves surviving the move
  const H = k1 * (1 - fe);                    // A.6 halt ratio
  const rho1 = k9 * B * fr * Ps / Math.pow(Trho, k4);   // A.7 flank guards per km
  const rho2 = k3 * B * (1 - fr) / wth;       // A.8 pinning density
  const r0 = R - rho2 * (wth - wa);           // A.9 invader strength at the point of attack
  const b0 = B * (1 - fr) * wa / (wth * d);   // A.10 forward defender density
  const db = B * fr * Vr * Ps / wth;          // A.14 daily reinforcement
  const A = k7 * (1 - fe) * TC * b0;          // A.11 without the speed term
  const Va = p.Va == null ? Math.sqrt(H * db / A) : p.Va;   // A.23
  const Ca = A * (Va + k8);                   // A.11 casualties per km
  const dr = Ca * Va + 2 * rho1 * Va;         // A.12 daily invader loss
  const tArrive = wth / Vr;                   // all reserves in by then (A.15 cap)
  let t = (r0 - H * b0) / (dr + H * db);      // A.17, reserves still arriving
  let capped = false;
  if (t >= tArrive) { t = (r0 - H * b0 - H * B * fr * Ps) / dr; capped = true; }
  const G = t * Va;                           // A.18
  const CR = Ca * G + k5;                     // A.20
  const CB = b0 * G + (1 - Ps) * db * t + k6; // A.21
  return { Va, t, G, brk: G > d, CR, CB, LER: CR / CB, Ps, H, r0, b0, db, dr, Ca, TC, rho1, rho2, capped, tArrive, p };
}

/** Same as run() but rounded like model.py's print-out (for tests and readouts). */
export function runRounded(over = {}, base = BOOK) {
  const o = run(over, base);
  const r2 = x => Math.round(x * 100) / 100;
  return { Va: r2(o.Va), t: r2(o.t), G: r2(o.G), brk: o.brk, CR: Math.round(o.CR), CB: Math.round(o.CB), Ps: Math.round(o.Ps * 1000) / 1000 };
}

/** Penetration clamped for display (a negative halt time means the attack never gets started). */
export const gain = (over, base) => Math.max(0, run(over, base).G);

/** Attacker strength at the point of attack and H x defender strength at time t (A.13, A.15, A.16). */
export function racePoint(o, t) {
  const { B, fr } = o.p;
  const rt = o.r0 - o.dr * t;
  const reinf = t < o.tArrive ? o.db * t : B * fr * o.Ps;
  return { rt, hb: o.H * (o.b0 + Math.min(reinf, B * fr * o.Ps)) };
}

/**
 * The attacker's best response (p. 216: the invader observes the defense, then picks V_a). A.23 gives the optimum
 * while reserves are still arriving; once they are exhausted (A.24, p. 217) the best speed is the slowest allowed.
 * So search both regimes: a geometric grid over [vMin, vMax], the A.23 value, then a local refinement.
 * vMin = 0.01 km/day is the left edge of Fig. A.8 (p. 226).
 */
export function bestResponse(over = {}, base = BOOK, vMin = 0.01, vMax = 40) {
  let best = run({ ...over, Va: vMin }, base);
  const consider = o => { if (o.G > best.G) best = o; };
  consider(run({ ...over, Va: null }, base));
  for (let v = vMin * 1.12; v <= vMax; v *= 1.12) consider(run({ ...over, Va: v }, base));
  let lo = Math.max(vMin, best.Va / 1.12), hi = Math.min(vMax, best.Va * 1.12);
  for (let i = 0; i < 24; i++) {
    const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3;
    const oa = run({ ...over, Va: a }, base), ob = run({ ...over, Va: b }, base);
    consider(oa); consider(ob);
    if (oa.G < ob.G) lo = a; else hi = b;
  }
  return best;
}

/** The defender's minimax reserve speed (p. 216): the V_r (1..vMax km/day) that minimizes the attacker's best gain. */
export function minimaxVr(over = {}, base = BOOK, vMax = 100) {
  let bv = 1, bg = Infinity;
  for (let Vr = 1; Vr <= vMax; Vr += 1) { const g = bestResponse({ ...over, Vr }, base).G; if (g < bg) { bg = g; bv = Vr; } }
  return { Vr: bv, G: bg };
}

/**
 * Fig. A.2 / A.3 boundary: for each reserve fraction, the smallest depth (dMin..dMax km) that contains the
 * attacker's best response. Depth alone never turns containment into breakthrough (p. 220), so bisection is safe.
 * Returns [{fr, d}]; d = dMax means even dMax breaks; d = dMin means everything shown contains.
 */
export function containBoundary(over = {}, frs = range(0, 0.99, 0.01), dMax = 50, base = BOOK, dMin = 0.5) {
  const brk = (fr, d) => bestResponse({ ...over, fr, d }, base).brk;
  return frs.map(fr => {
    if (brk(fr, dMax)) return { fr, d: dMax };
    if (!brk(fr, dMin)) return { fr, d: dMin };
    let lo = dMin, hi = dMax;
    for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (brk(fr, m)) lo = m; else hi = m; }
    return { fr, d: hi };
  });
}

/** Curve of gain against one variable, e.g. curve('Va', range(0.1, 20, 0.1), {tR: 2000, tB: 2000}).
 *  best = true lets the attacker pick V_a at every point (use for x = V_r, d or f_r). */
export function curve(key, xs, over = {}, base = BOOK, best = false) {
  return xs.map(x => { const o = best ? bestResponse({ ...over, [key]: x }, base) : run({ ...over, [key]: x }, base); return { x, G: Math.max(0, o.G), Va: o.Va, CR: o.CR, t: o.t, LER: o.LER, Ps: o.Ps, brk: o.brk }; });
}

/** Inclusive numeric range with float-safe steps. */
export function range(a, b, step) {
  const n = Math.round((b - a) / step), out = [];
  for (let i = 0; i <= n; i++) out.push(Math.round((a + i * step) * 1e6) / 1e6);
  return out;
}
