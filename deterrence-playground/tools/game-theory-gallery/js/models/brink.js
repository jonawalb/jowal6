// Brinkmanship: Schelling's "threat that leaves something to chance," formalized by
// Powell (1987), "Crisis Bargaining, Escalation, and MAD," APSR 81(3): 717-735.
// Pure functions, no DOM. Payoffs are normalized per state so that prevailing w = 1 and disaster d = 0
// (a positive affine change that leaves every equilibrium unchanged).
//   Chicken (p. 720, Fig. 1): w > c > s > d. Critical risks (p. 721): Jervis r = (w-c)/[(w-c)+(s-d)],
//     Snyder-Diesing (w-s)/(w-d). Mixed equilibrium (p. 734, n. 4): I stands firm with prob r_II, II with r_I.
//   Complete information (pp. 723-727): escalation creates autonomous risks f, 2f, 3f, ...; II bids odd
//     multiples, I even multiples. Resolve R = (w-s)/(w-d) (p. 725). The state that can make the last bid
//     prevails and there is no crisis (Proposition 1).
//   One-sided incomplete information (pp. 727-733): I faces an irresolute II (prob p) or a resolute II'.
//     N_I = 1 (2f <= R_I < 4f), N_II = 1 (f <= R_II < 3f), N_II' = 2 (3f <= R_II' < 5f). Proposition 2 gives
//     e_II(1) = b*(1-p)/[p(1-b*)], e_I(1) = (R_II - f)/{(1-f)[(1-2f)R_II + 2f]},
//     b* = [1-(1-2f)(1-3f)](1-R_I) / {(1-2f)[(1-3f)R_I + 3f]}; a crisis exists iff p > b* and
//     q_I < p{[1-e_II]w_I + e_II[f d_I + (1-f)s_I]} + (1-p)[f d_I + (1-f)s_I]  (p. 733).

export const BR_DEFAULTS = {
  v: 'chicken', c1: 0.6, s1: 0.3, c2: 0.6, s2: 0.3,
  R1: 0.33, R2: 0.25, f: 0.08,
  ff: 0.08, RI: 0.3, RII: 0.2, RIIp: 0.3, p: 0.85, q: 0.75,
};

const EPS = 1e-9;

/** 2x2 Chicken with w = 1, d = 0 for each player. */
export function solveChicken(P) {
  const crit = (c, s) => (1 - c) / ((1 - c) + s);         // Jervis's critical risk
  const sd = s => 1 - s;                                   // Snyder-Diesing critical risk (w-s)/(w-d)
  const rI = crit(P.c1, P.s1), rII = crit(P.c2, P.s2);
  const firmI = rII, firmII = rI;                          // mixed equilibrium (Powell n. 4)
  return {
    rI, rII, sdI: sd(P.s1), sdII: sd(P.s2), firmI, firmII,
    pDisaster: firmI * firmII, pCompromise: (1 - firmI) * (1 - firmII),
    euI: firmII * P.s1 + (1 - firmII) * P.c1, euII: firmI * P.s2 + (1 - firmI) * P.c2,
  };
}

/** Complete-information escalation ladder (Proposition 1). */
export function solveLadder(P) {
  const { R1, R2, f } = P;
  const NI = Math.floor(R1 / (2 * f) + EPS);                        // largest n with 2nf <= R_I
  const NII = R2 < f - EPS ? 0 : Math.floor((R2 / f + 1) / 2 + EPS); // largest n with (2n-1)f <= R_II
  // Walk the bids until the mover's risk exceeds its resolve; that mover loses.
  const steps = [];
  let k = 1, loser = null;
  while (k * f <= 1 + EPS && k < 60) {
    const mover = k % 2 ? 'II' : 'I';
    const ok = k * f <= (mover === 'I' ? R1 : R2) + EPS;
    steps.push({ k, risk: k * f, mover, ok });
    if (!ok) { loser = mover; break; }
    k++;
  }
  if (!loser) loser = (steps.length % 2) ? 'I' : 'II';     // ran out of room: the next mover faces risk 1
  return { NI, NII, steps, winner: loser === 'I' ? 'II' : 'I' };
}

/** One-sided incomplete information: the crisis equilibrium of Proposition 2, if it exists. */
export function solveCrisis(P) {
  const f = P.ff, RI = P.RI, RII = P.RII, p = P.p;
  const sI = 1 - RI;                                       // I's payoff to submitting when w = 1, d = 0
  const bStar = (1 - (1 - 2 * f) * (1 - 3 * f)) * (1 - RI) / ((1 - 2 * f) * ((1 - 3 * f) * RI + 3 * f));
  const eI1 = (RII - f) / ((1 - f) * ((1 - 2 * f) * RII + 2 * f));
  const out = { bStar, eI1, sI, valid: bands(P) };
  if (!(p > bStar + EPS)) return { ...out, crisis: false, why: 'belief' };
  const eII1 = bStar * (1 - p) / (p * (1 - bStar));
  const vExploit = p * ((1 - eII1) * 1 + eII1 * (1 - f) * sI) + (1 - p) * (1 - f) * sI;
  if (!(P.q < vExploit - EPS)) return { ...out, crisis: false, why: 'status', eII1, vExploit };
  const pd = p * eII1 * (f + (1 - f) * eI1 * 2 * f)
    + (1 - p) * (f + (1 - f) * eI1 * (2 * f + (1 - 2 * f) * 3 * f));
  const weakWins = p * eII1 * (1 - f) * (1 - eI1);          // the least resolved state prevails (p. 730)
  const resWins = (1 - p) * (1 - f) * ((1 - eI1) + eI1 * (1 - 2 * f) * (1 - 3 * f));
  const iWins = p * ((1 - eII1) + eII1 * (1 - f) * eI1 * (1 - 2 * f));
  return { ...out, crisis: true, eII1, vExploit, pd, weakWins, resWins, iWins };
}

/** Parameter bands Powell assumes: 2f <= R_I < 4f, f <= R_II < 3f, 3f <= R_II' < 5f. */
export function bands(P) {
  const f = P.ff;
  return P.RI >= 2 * f - EPS && P.RI < 4 * f && P.RII >= f - EPS && P.RII < 3 * f && P.RIIp >= 3 * f - EPS && P.RIIp < 5 * f;
}

/** Probability of disaster as a function of the prior p, other parameters fixed (for the curve). */
export function pdCurve(P, n = 120) {
  const pts = [];
  for (let i = 1; i < n; i++) {
    const p = i / n;
    const e = solveCrisis({ ...P, p });
    pts.push([p, e.crisis ? e.pd : 0, e.crisis]);
  }
  return pts;
}
