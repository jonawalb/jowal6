// Fearon (1994), "Domestic Political Audiences and the Escalation of International Disputes," APSR 88(3): 577-592.
// Pure functions, no DOM. A crisis is a continuous-time war of attrition over a prize v (p. 582). At each moment
// a state can attack, quit or escalate. Quitting at t costs audience costs a_i(t) = a_i * t (the linear case the
// article uses, p. 582). State i's value for war w_i is private, drawn from [w_i_low, 0] (p. 583). We use the
// uniform distribution on [-W_i, 0], which the article also uses for one comparative static (p. 586).
//   u_i(t) = F_j(-a_j t) v - (1 - F_j(-a_j t)) a_i t     (p. 584), t_i* solves u_i(t) = 0, horizon t* = min(t_1*, t_2*).
//   Label so that t* = t_2* ("L" here). Proposition 2 (p. 584): types w_i >= -a_i t* escalate to t* and attack;
//   the rest quit with cumulative distributions  Q_H(t) = a_L t / (v + a_L t)  and  Q_L(t) = (k + a_H t) / (v + a_H t),
//   k = u_H(t*) >= 0, so L concedes at t = 0 with probability k / v (p. 585).
//   Odds that L rather than H backs down once a crisis starts: (a_H v + a_H a_L t*) / (a_L v + a_H a_L t*) (p. 586).

export const F94_DEFAULTS = { v: 1, a1: 1, a2: 1, W1: 2, W2: 2 };

/** Root of u_i(t) = 0 for uniform F_j on [-W_j, 0]: a_i a_j t^2 + a_j v t - v W_j = 0. */
export function tStar(ai, aj, v, Wj) {
  return (-aj * v + Math.sqrt(aj * aj * v * v + 4 * ai * aj * v * Wj)) / (2 * ai * aj);
}

/** Uniform CDF of w on [-W, 0] evaluated at x. */
const F = (x, W) => Math.max(0, Math.min(1, (x + W) / W));

export function solveF94(P) {
  const { v } = P;
  const s = [{ a: P.a1, W: P.W1 }, { a: P.a2, W: P.W2 }];
  const t1 = tStar(s[0].a, s[1].a, v, s[1].W), t2 = tStar(s[1].a, s[0].a, v, s[0].W);
  const L = t2 <= t1 ? 1 : 0, H = 1 - L;                    // indices 0 = state 1, 1 = state 2
  const ts = Math.min(t1, t2);
  const aH = s[H].a, aL = s[L].a;
  const quitH = F(-aH * ts, s[H].W), quitL = F(-aL * ts, s[L].W); // prior shares of types that back down
  const k = quitL * v - (1 - quitL) * aH * ts;             // u_H(t*)
  const QHx = t => aL * t / (v + aL * t);
  const QL = t => (k + aH * t) / (v + aH * t);
  const pConcede0 = k / v;
  const pWar = (1 - quitH) * (1 - quitL);
  const pCrisis = 1 - pConcede0;
  // Paper's measure (p. 586): each state's chance of being a type that backs down, given that a crisis began.
  const backH = aL * ts / (v + aL * ts), backL = aH * ts / (v + aH * ts);
  // Who actually quits first, integrated from the equilibrium quit distributions.
  const n = 400, dt = ts / n;
  let firstH = 0, firstL = 0, eT = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * dt;
    const qH = aL * v / (v + aL * t) ** 2, qL = aH * (v - k) / (v + aH * t) ** 2;
    firstH += qH * (1 - QL(t)) * dt;
    firstL += qL * (1 - QHx(t)) * dt;
    eT += (1 - QHx(t)) * (1 - QL(t)) * dt;                  // E[min(stopping time, t*)] = integral of survival
  }
  const curve = Array.from({ length: 81 }, (_, i) => { const t = ts * i / 80; return [t, QHx(t), QL(t)]; });
  return {
    t1, t2, ts, L, H, k, quitH, quitL, pConcede0, pWar, pCrisis, warGivenCrisis: pCrisis > 0 ? pWar / pCrisis : 0,
    backH, backL, odds: backL / backH, firstH, firstL, eT, curve,
    names: ['State 1', 'State 2'],
  };
}
