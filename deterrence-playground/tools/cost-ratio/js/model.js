// Cost Ratio Bargaining: the formal model in Walberg, "Cost Ratio and Bargaining" (working paper, April 2026 draft),
// Section 3 (Propositions 1-4) and the kappa index of Section 5.3.2. Notation follows the paper:
// p = Pr(W wins a war), C = c_W + c_S (total war cost, held fixed), kappa = c_S / c_W, x = W's share of the good.

export const DEFAULTS = { p: 0.4, C: 0.24, k: 1, kD: 3, kV: 0.33, off: 0.8, def: 0.7, exp: 0.6 };

/** Keep the model in the interior case the propositions describe: both reservation points inside [0, 1]. */
export const cMax = p => +Math.min(0.6, p, 1 - p).toFixed(2);

/** Cost partition, eq. (2): c_W = C/(1+kappa), c_S = kappa C/(1+kappa). */
export function costs(C, k) {
  return { cW: C / (1 + k), cS: (k * C) / (1 + k) };
}

/** W's equilibrium share, Proposition 2: x*(kappa) = p - C/(1+kappa). */
export const xStar = (p, C, k) => p - C / (1 + k);

/** Everything the page reports for one parameter set. */
export function solve(P) {
  const { cW, cS } = costs(P.C, P.k);
  const lo = P.p - cW, hi = P.p + cS; // Proposition 1
  const x = lo; // Proposition 2: S offers W its war reservation
  const bench = P.p - P.C / 2; // Proposition 3: symmetric-cost benchmark (kappa = 1)
  const dx = P.C / (1 + P.k) ** 2; // Proposition 3: dx*/dkappa
  const xD = xStar(P.p, P.C, P.kD), xV = xStar(P.p, P.C, P.kV);
  const gapFormula = (P.C * (P.kD - P.kV)) / ((1 + P.kD) * (1 + P.kV)); // Proposition 4
  return {
    cW, cS, lo, hi, width: hi - lo, x, sShare: 1 - x, bench, dx, above: x - bench,
    warW: P.p - cW, warS: 1 - P.p - cS,
    xD, xV, gapDirect: xD - xV, gapFormula, premise4: P.kD > 1 && 1 > P.kV,
  };
}

/** Section 5.3.2: kappa_index = (OffCostAsym + DefCostBurden + TargetExposure) / 3; above 0.5 is the high-kappa regime. */
export function kappaIndex(P) {
  const v = (P.off + P.def + P.exp) / 3;
  return { v, regime: v > 0.5 ? 'high' : v < 0.5 ? 'low' : 'edge' };
}

/** Which side of kappa = 1 the cost technology sits on, in the paper's words. */
export function regime(k) {
  if (Math.abs(k - 1) < 0.015) return { key: 'sym', label: 'Symmetric cost technology', s: 'good' };
  return k > 1
    ? { key: 'W', label: 'Cost technology favors W', s: 'good' }
    : { key: 'S', label: 'Cost technology favors S', s: 'warn' };
}
