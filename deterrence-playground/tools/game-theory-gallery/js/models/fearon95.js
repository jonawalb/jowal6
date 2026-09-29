// Fearon (1995), "Rationalist Explanations for War," International Organization 49(3): 379-414.
// Pure functions, no DOM. Notation follows the article: the issue is X = [0, 1]; A prefers outcomes near 1,
// B near 0; A wins a war with probability p; c_A, c_B are the states' costs of war (risk-neutral case).
//   Bargaining range (p. 387):             A accepts x >= p - cA, B accepts x <= p + cB.
//   Disagreement about power (p. 391):     A expects to win with p, B with r; if p + r > 1 the range shrinks.
//   Indivisibility (pp. 389-390):          only some divisions of X are feasible; random allocation can restore them.
//   Take-it-or-leave-it with private cB (Claim 2, pp. 410-411): A demands x, B fights iff cB < x - p.
//     Here cB ~ Uniform[0, cmax] (our choice of H; it has the nondecreasing hazard rate Fearon assumes),
//     which gives x* = p + (cmax - cA)/2, clipped to [p, 1].
//   First-strike advantage (p. 403):       de facto range (pf - cA, ps + cB); empty iff pf - ps > cA + cB.
//   Preventive war (pp. 405-406):          p rises from p1 to p2; B attacks now iff delta*p2 - p1 > cB(1 - delta)^2
//                                          (when A's later demand p2 + cB(1 - delta) stays inside [0, 1]).

export const F95_DEFAULTS = {
  v: 'range', p: 0.5, ca: 0.1, cb: 0.1, opt: 0, r: 0.5, div: 'cont', k: 2, lot: 0,
  cmax: 0.4, cbt: 0.25, pf: 0.6, ps: 0.45, p1: 0.35, p2: 0.65, dl: 0.9,
};

const EPS = 1e-9;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/** Bargaining range with optional disagreement about power and limits on divisibility. */
export function solveRange(P) {
  const rB = P.opt ? P.r : 1 - P.p;          // B's own estimate of its chance of winning
  const lo = P.p - P.ca;                      // A's reservation level
  const hi = 1 - rB + P.cb;                   // B's reservation level, in units of x
  const width = hi - lo;
  const empty = width < -EPS;
  // Feasible settlements.
  let pts = null;                             // null means every x in [0, 1]
  if (!P.lot) {
    if (P.div === 'none') pts = [0, 1];
    else if (P.div === 'steps') pts = Array.from({ length: P.k + 1 }, (_, i) => i / P.k);
  }
  const inRange = x => x >= lo - EPS && x <= hi + EPS;
  let deal = null;
  if (!empty) {
    if (pts === null) deal = clamp((Math.max(lo, 0) + Math.min(hi, 1)) / 2, 0, 1);
    else { const ok = pts.filter(inRange); if (ok.length) deal = ok.reduce((a, b) => Math.abs(b - (lo + hi) / 2) < Math.abs(a - (lo + hi) / 2) ? b : a); }
  }
  let cls;
  if (empty) cls = 'optimism';
  else if (deal === null) cls = 'indivisible';
  else cls = 'peace';
  return { lo, hi, width, rB, pts, deal, cls, sumBeliefs: P.p + rB };
}

/** A's expected utility for demand x when cB ~ U[0, cmax] (Fearon 1995, 411: uA(x) = H(x-p)(p-cA) + (1-H(x-p))x). */
export function eUA(P, x) {
  const H = clamp((x - P.p) / P.cmax, 0, 1);
  return H * (P.p - P.ca) + (1 - H) * x;
}

/** Take-it-or-leave-it bargaining with private information about B's cost (Claim 2). */
export function solveInfo(P) {
  const interior = P.p + (P.cmax - P.ca) / 2;
  let xs, kase;
  if (P.ca >= P.cmax) { xs = P.p; kase = 'i'; }          // h(0) >= 1/cA: no risk worth running
  else if (interior >= 1) { xs = 1; kase = 'ii'; }       // grab everything
  else { xs = interior; kase = 'iii'; }
  const pWar = clamp((xs - P.p) / P.cmax, 0, 1);
  const fights = P.cbt < xs - P.p;                        // B fights iff cB < x - p
  return { xs, kase, pWar, fights, eu: eUA(P, xs), euSafe: P.p, full: P.p + P.cb };
}

/** First-strike advantages: de facto bargaining range (p. 403). */
export function solvePreempt(P) {
  const lo = P.pf - P.ca, hi = P.ps + P.cb;
  return { lo, hi, width: hi - lo, empty: hi < lo - EPS, loPlain: P.p - P.ca, hiPlain: P.p + P.cb, gap: P.pf - P.ps, costs: P.ca + P.cb };
}

/** Preventive war as a commitment problem (pp. 405-406). Payoffs also reported per period (times 1 - delta). */
export function solvePrevent(P) {
  const d = P.dl;
  const x2raw = P.p2 + P.cb * (1 - d);
  const x2 = Math.min(1, x2raw);
  const warB = (1 - P.p1) / (1 - d) - P.cb;              // B attacks in period 1
  const acqB = 1 + d * (1 - x2) / (1 - d);                // best A can offer: x1 = 0, then x2 forever
  const war = warB > acqB + EPS;
  const x1 = clamp(acqB - warB, 0, 1);                    // A's period-1 demand that leaves B indifferent
  return {
    x2, clipped: x2raw > 1, warB, acqB, war, x1,
    lhs: d * P.p2 - P.p1, rhs: P.cb * (1 - d) ** 2,      // Fearon's closed form, exact when x2 <= 1
    perWar: warB * (1 - d), perAcq: acqB * (1 - d),
  };
}
