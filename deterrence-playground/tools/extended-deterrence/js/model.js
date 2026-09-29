// Extended Deterrence: a transparent teaching model of the credibility problem in protecting an ally.
// Mechanisms from Schelling (1966) (the tripwire: forward forces make involvement automatic) and
// Fearon (1997) (tying hands vs. sinking costs); Huth (1988) motivates the denial term (the local balance).
// Every number in DEFAULTS and DEVICES is notional. Pure functions, no DOM.
//
// Patron P has private value v for defending the ally; the Challenger believes v ~ U[L, 1] (L = 0 unless
// sunk costs screen). If the ally is attacked, P defends automatically with probability T (tripwires,
// loss of control); otherwise it defends iff v - w + A >= 0, where w is P's cost of the war and A the
// hands-tying cost of backing out. Credibility kappa = Pr(defend | attack).
// Challenger's gain from an unopposed attack x ~ U[0, 1]; if P defends, the Challenger loses K = kC + denial.
// It attacks iff (1 - kappa) x - kappa K > 0.

export const DEFAULTS = { w: 0.9, kC: 0.1, screen: 0, dev: { treaty: 1, statements: 0, tripwire: 0, sharing: 0 } };

/** a: cost to P of backing out (ties hands); s: peacetime cost (sunk); t: chance defense is automatic; d: denial. */
export const DEVICES = [
  { id: 'treaty', name: 'Defense treaty', short: 'Treaty', kind: 'Ties hands', a: 0.25, s: 0.02, t: 0, d: 0,
    help: 'A ratified pledge. Walking away costs reputation with every ally.' },
  { id: 'statements', name: 'Public statements', short: 'Statements', kind: 'Ties hands', a: 0.10, s: 0, t: 0, d: 0,
    help: 'Leaders restate the pledge. Cheap now, costly to break.' },
  { id: 'tripwire', name: 'Forward tripwire force', short: 'Tripwire', kind: 'Sinks costs, automatic', a: 0.10, s: 0.25, t: 0.35, d: 0.10,
    help: 'Troops in harm’s way. An attack engages the patron at once and stiffens local defense.' },
  { id: 'sharing', name: 'Nuclear sharing', short: 'Nuclear sharing', kind: 'Ties hands, some automaticity', a: 0.15, s: 0.06, t: 0.05, d: 0,
    help: 'Weapons and planning shared with the ally. Adds a small chance escalation slips out of the patron’s control.' },
];

export const LIMITS = { w: [0, 1.5], kC: [0, 2] };
const clamp01 = x => Math.max(0, Math.min(1, x));

/** Pr(v < y) when v ~ U[L, 1]. */
const cdf = (y, L) => (L >= 1 ? (y > 1 ? 1 : 0) : clamp01((y - L) / (1 - L)));

/** Aggregate a device package. */
export function pack(dev, params = DEVICES) {
  let A = 0, S = 0, keep = 1, D = 0;
  for (const d of params) if (dev[d.id]) { A += d.a; S += d.s; keep *= 1 - d.t; D += d.d; }
  return { A, S, T: 1 - keep, D };
}

/** Full solution for a package. Returns credibility, attack/war probabilities and the patron's costs. */
export function solve(P, dev = P.dev, params = DEVICES) {
  const { A, S, T, D } = pack(dev, params);
  const L = P.screen ? Math.min(S, 0.999) : 0;
  const pBack = cdf(P.w - A, L);                 // would back out if not automatic
  const kappa = 1 - (1 - T) * pBack;
  const K = P.kC + D;
  const xStar = kappa >= 1 ? Infinity : kappa * K / (1 - kappa);
  const pAttack = 1 - clamp01(xStar);
  const pUnwilling = cdf(P.w, L);                // v < w: war not worth it on the merits
  const entrap = Math.max(0, pUnwilling - (1 - T) * pBack); // conditional on an attack
  return {
    A, S, T, D, K, L, kappa, pAttack, deter: 1 - pAttack,
    pWar: pAttack * kappa, pAbandon: pAttack * (1 - kappa), entrap,
    audience: pAttack * (1 - T) * pBack * A,
    xStar,
  };
}

/** Credibility built up device by device, in the fixed order of DEVICES. */
export function waterfall(P, params = DEVICES) {
  const steps = [{ id: 'base', name: 'Interests alone', short: 'Interests only', kappa: solve(P, {}, params).kappa }];
  const on = {};
  for (const d of params) {
    if (!P.dev[d.id]) continue;
    on[d.id] = 1;
    steps.push({ id: d.id, name: d.name, short: d.short || d.name, kappa: solve(P, { ...on }, params).kappa });
  }
  return steps;
}

/** All 16 packages, for the cost frontier. */
export function allPackages(P, params = DEVICES) {
  const out = [];
  for (let m = 0; m < 16; m++) {
    const dev = {};
    params.forEach((d, k) => { dev[d.id] = (m >> k) & 1; });
    out.push({ m, dev, ...solve(P, dev, params) });
  }
  return out;
}
