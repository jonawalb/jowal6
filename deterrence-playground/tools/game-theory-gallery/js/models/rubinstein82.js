// Rubinstein (1982), "Perfect Equilibrium in a Bargaining Model," Econometrica 50(1): 97-109.
// Pure functions, no DOM. Players 1 and 2 alternate offers over a pie of size 1; 1 offers first.
//   Fixed discounting factors (Conclusion 2, p. 108): if at least one delta_i < 1 and one is > 0, the unique
//     perfect equilibrium partition gives 1 the share M = (1 - delta_2) / (1 - delta_1 delta_2), agreed at once.
//   Fixed bargaining costs (Conclusion 1, p. 107): c1 > c2 -> 1 gets c2; c1 = c2 -> any x in [c1, 1] is a
//     perfect equilibrium partition; c1 < c2 -> 1 gets the whole pie.
//   Remark (p. 107): in almost all cases agreement is reached in the first period.

export const R82_DEFAULTS = { v: 'disc', d1: 0.9, d2: 0.9, c1: 0.1, c2: 0.2 };

export function solveDisc(P) {
  const { d1, d2 } = P;
  const M = (1 - d2) / (1 - d1 * d2);
  // Stationary offers: 1 offers (M, 1-M); if 2 proposed instead, 2 would offer 1 the share d1*M.
  return { M, share2: 1 - M, offer2: d1 * M, firstMover: M - 0.5 };
}

export function solveCost(P) {
  const { c1, c2 } = P;
  if (Math.abs(c1 - c2) < 1e-9) return { kind: 'equal', M: null, lo: c1 };
  if (c1 > c2) return { kind: 'c1>c2', M: c2 };
  return { kind: 'c1<c2', M: 1 };
}

/** Share of player 1 across delta_1 with delta_2 fixed, for the figure. */
export function curveDisc(d2, n = 100) {
  return Array.from({ length: n }, (_, i) => { const d1 = i / n; return [d1, (1 - d2) / (1 - d1 * d2)]; });
}
