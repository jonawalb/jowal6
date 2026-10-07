// Powell (2006), "War as a Commitment Problem," International Organization 60(1): 169-203.
// Pure functions, no DOM. Two actors divide a flow of pies worth 1 per period; B = 1/(1 - delta).
// M_j(t) is what j can lock in by fighting at t. General inefficiency condition (p. 182, eq. 1):
//     delta * M1(t+1) - M1(t)  >  B - [M1(t) + M2(t)]
//   (shift in the distribution of power)   (bargaining surplus)
// Fighting destroys a fraction d of the flow.
//   Preventive war (p. 183): 1's chance of winning rises from p to p + D.  Condition: (1-d)[delta(p+D) - p] > d.
//   First-strike advantages (pp. 184-185): 1 wins with p+f if it attacks, p-f if attacked.
//     De facto range empty iff 2f(1-d) > d; condition (1) gives [(1+delta)f - (1-delta)p](1-d) > d.
//   Strategic territory (pp. 186-187, eq. 3): p(x) jumps at xbar. 2 fights rather than concede x_t > xbar iff
//     (1-p(xbar))/(1-delta) - c2 > 1 - x_t + delta[(1-p(x_t))/(1-delta) - c2].
//   Domestic factions (pp. 189-190): faction a fights iff d[r(1-l) + (1-r)l] < p(1-d)(r' - r)(1-2l).

export const P06_DEFAULTS = {
  v: 'shift', p: 0.3, D: 0.3, d: 0.1, dl: 0.9,
  f: 0.1, xb: 0.4, pb: 0.5, J: 0.2, e: 0.02, c2: 0.5,
  r: 0.6, rp: 0.9, l: 0.2,
};

const EPS = 1e-9;

/** Preventive war from an exogenous shift in power (p. 183). All values per period (times 1 - delta). */
export function solveShift(P) {
  const { p, D, d, dl } = P;
  const shift = (1 - d) * (dl * (p + D) - p);             // (1 - delta) * [delta M1(t+1) - M1(t)]
  const surplus = d;                                       // (1 - delta) * [B - M1(t) - M2(t)]
  const war = shift > surplus + EPS;
  const warTwo = (1 - p) * (1 - d);                        // 2's per-period value of fighting now
  const xStar = (p + D) * (1 - d);                         // what 2 must give 1 after the shift
  const bestPeace = (1 - dl) * 1 + dl * (1 - xStar);       // 2's best credible peace, per period
  return { shift, surplus, war, warTwo, xStar, bestPeace, limit: D * (1 - d) - d };
}

/** First-strike or offensive advantages (pp. 184-185). */
export function solveFirst(P) {
  const { p, f, d, dl } = P;
  const lo = (p + f) * (1 - d);                            // 1 prefers x to attacking iff x >= lo
  const hi = (p - f) * (1 - d) + d;                        // 2 prefers x to attacking iff x <= hi
  const shift = ((1 + dl) * f - (1 - dl) * p) * (1 - d);   // condition (1), per period
  return { lo, hi, empty: hi < lo - EPS, gap: 2 * f * (1 - d), surplus: d, shift, war: shift > d + EPS };
}

/** Bargaining over objects that are sources of power, with a jump J in p at xbar (eq. 3, pp. 186-187). */
export function solveTerritory(P) {
  const { xb, pb, J, e, c2, dl } = P;
  // The smallest concession past the jump. With no jump (J = 0) p stays continuous, and state 1 asks only for what
  // state 2 will accept, x_t <= p(x̄) + (1 - δ)c₂ (Fearon's no-war result, p. 186), so the cap applies.
  const xe = Math.min(1, xb + e), xMax = pb + (1 - dl) * c2;
  const capped = J <= EPS && xe > xMax;
  const xt = capped ? xMax : xe;
  const pt = Math.min(1, pb + J);                          // p(x_t) just past the jump
  const fightNow = (1 - pb) / (1 - dl) - c2;
  const concede = 1 - xt + dl * ((1 - pt) / (1 - dl) - c2);
  const lhs = dl * pt - pb, rhs = (1 - dl) ** 2 * c2 - (1 - dl) * xt;
  return { xt, pt, capped, fightNow, concede, war: fightNow > concede + EPS, lhs, rhs };
}

/** Shifting power between domestic factions (pp. 189-190). */
export function solveDomestic(P) {
  const { p, d, r, rp, l } = P;
  const keep = r * (1 - l) + (1 - r) * l;                  // a's expected share of the state if it accepts
  const keepW = rp * (1 - l) + (1 - rp) * l;               // ... if it fights and 1 prevails
  const lo = p * (1 - d) * keepW / keep;                   // a accepts x only if x >= lo
  const hi = p * (1 - d) + d;                              // 2 accepts x only if x <= hi
  const lhs = d * keep, rhs = p * (1 - d) * (rp - r) * (1 - 2 * l);
  return { lo, hi, keep, keepW, war: lhs < rhs - EPS, lhs, rhs, unitary: [p * (1 - d), p * (1 - d) + d] };
}
