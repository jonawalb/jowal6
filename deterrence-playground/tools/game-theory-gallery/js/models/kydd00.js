// Kydd (2000), "Trust, Reassurance, and Cooperation," International Organization 54(2): 325-357.
// Pure functions, no DOM. Player types are nice (N, Stag Hunt preferences) or mean (M, Prisoner's Dilemma
// preferences). Mutual defection pays 0; a sucker gets -S; R is the reward for mutual cooperation, T the
// temptation (p. 331). p2 is player 1's belief that player 2 is nice, i.e. player 1's trust.
//   Trust game (p. 332): player 1 cooperates iff p > p* = S / (R + S).
//   Reassurance game (pp. 334-340): player 1 chooses the weight a of a first round; round 2 is worth 1 - a.
//     Separating equilibrium: nice 1 sends a*, mean 1 sends 0. It requires (appendix, p. 354)
//       a* > T1M / (T1M - p2 R1M + (1 - p2) S1M)       (mean type will not mimic)
//       a* < R1N / ((1 - p2)(R1N + S1N))               (nice type will send it)
//     p2*M = S1M / (R1M + S1M) is the upper bound on p2 (p. 338); the lower bound (p. 338) is
//       p2_low = (S1N/R1N - S1M/T1M) / ((R1N + S1N)/R1N - (R1M + S1M)/T1M).
//     Proposition (p. 339): reassurance is possible if p2*N = S1N/(R1N + S1N) < p2*M.

export const K00_DEFAULTS = { p2: 0.25, RN: 2, SN: 1, TM: 2, RM: 1, SM: 1, a: 0.3 };

const EPS = 1e-9;

export function aLow(P, p2 = P.p2) {
  const den = P.TM - p2 * P.RM + (1 - p2) * P.SM;
  return den > EPS ? P.TM / den : Infinity;
}
export function aHigh(P, p2 = P.p2) {
  const den = (1 - p2) * (P.RN + P.SN);
  return den > EPS ? P.RN / den : Infinity;
}

export function solveK00(P) {
  const pStarN = P.SN / (P.RN + P.SN);          // one-round trust game threshold for the nice type
  const pStarM = P.SM / (P.RM + P.SM);          // ... and for the mean type (upper bound on p2)
  const lowNum = P.SN / P.RN - P.SM / P.TM;
  const lowDen = (P.RN + P.SN) / P.RN - (P.RM + P.SM) / P.TM;
  const pLow = Math.abs(lowDen) > EPS ? lowNum / lowDen : null;
  const lo = aLow(P), hi = aHigh(P);
  const loC = Math.max(0, lo), hiC = Math.min(1, hi);
  const sep = P.p2 < pStarM - EPS && loC < hiC - EPS && lo < 1;
  const trustGame = P.p2 > pStarN + EPS;          // would a nice player 1 cooperate in the one-round game?
  // The user's chosen signal a: does it separate?
  const aOK = P.a > lo + EPS && P.a < hi - EPS && P.a <= 1;
  return { pStarN, pStarM, pLow, lo, hi, loC, hiC, sep, trustGame, aOK, propHolds: pStarN < pStarM - EPS };
}

/** Bounds on a* across p2 for the figure. */
export function boundCurves(P, n = 100) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const p2 = i / n;
    return [p2, aLow(P, p2), aHigh(P, p2)];
  });
}
