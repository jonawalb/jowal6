// First-strike stability after Kent & Thaler, RAND R-3765-AF (1989).
// Page numbers are the report's printed page numbers.
//   Cost (App. C, p. 61):   C_X = D_X^0.75 + 0.3 * (1 - D_Y^0.75), where D_X is the share of X's value destroyed.
//   Stop rule (p. 22):      the first striker ends its counterforce attack where its own cost is lowest and,
//                           among such points, the enemy's cost is highest.
//   Index (pp. 26, 29):     (C1_A / C2_A) * (C1_B / C2_B), C1 = own cost of striking first, C2 = of being struck first.
//   Striker uses all fixed forces and 90% of survivable forces (p. 34); launch under attack saves 90% of the
//   fixed force (p. 35, n. 4).
// The damage curve D(w) = 1 - exp(-w / k) is this tool's stand-in for the hand-drawn curves of Fig. 7 (p. 18).

export const COST = { exp: 0.75, surcharge: 0.3 };       // App. C, p. 61
export const STRIKER_SURV_AVAIL = 0.9;                  // p. 34
export const PRL_SAVED = 0.9;                            // p. 35, n. 4
const LN5 = Math.log(5);

/** Share of a side's value destroyed by w weapons. w80 = weapons that destroy 80% of it. */
export const damage = (w, w80) => (w <= 0 ? 0 : 1 - Math.exp(-w * LN5 / Math.max(1, w80)));

/** Kent-Thaler cost to side X given damage to X (dOwn) and to the enemy (dEnemy). */
export const cost = (dOwn, dEnemy) => dOwn ** COST.exp + COST.surcharge * (1 - dEnemy ** COST.exp);

/** Warhead totals for one side. s: { nf, mf, ns, ms, alert, de, hold, w80 } */
export function totals(s) {
  const fixed = s.nf * s.mf, surv = s.ns * s.ms;
  return { fixed, surv, all: fixed + surv };
}

/**
 * Counterforce options the striker (att) has against the victim (vic), as linear segments
 * sorted from most to least efficient. Each segment: { n, spend, kill, eff }.
 * Targets: fixed launchers (silos) and survivable launchers caught off alert (in port, in garrison, on base).
 * A second warhead on the same launcher is its own, less efficient segment.
 */
export function options(att, vic, prl, wpt) {
  const p = att.de;
  const segs = [];
  const add = (n, launchers, whPer, killShare) => {
    if (launchers <= 0 || whPer <= 0) return;
    const k1 = p, k2 = (1 - p) * p;                      // kill added by the first and the second warhead
    segs.push({ n, spend: launchers, kill: launchers * whPer * killShare * k1 });
    if (wpt > 1) segs.push({ n: n + ', 2nd warhead', spend: launchers, kill: launchers * whPer * killShare * k2 });
  };
  add('Fixed launchers', vic.nf, vic.mf, prl ? 1 - PRL_SAVED : 1);
  add('Survivable launchers off alert', vic.ns * (1 - vic.alert), vic.ms, 1);
  segs.forEach(g => { g.eff = g.spend > 0 ? g.kill / g.spend : 0; });
  return segs.filter(g => g.kill > 1e-9).sort((a, b) => b.eff - a.eff);
}

/**
 * One first strike by att on vic. Returns the draw-down curve and the chosen stopping point.
 * Weapons held for a third country (hold) are excluded from the exchange on both sides.
 */
export function strike(att, vic, prl, wpt) {
  const tA = totals(att), tV = totals(vic);
  const useA = 1 - att.hold, useV = 1 - vic.hold;
  const aAvail = (tA.fixed + STRIKER_SURV_AVAIL * tA.surv) * useA;
  const vAll = tV.all * useV;
  const segs = options(att, vic, prl, wpt).map(g => ({ ...g, spend: g.spend * useA, kill: g.kill * useV }));

  // Walk the segments, sampling points: s = weapons spent on counterforce, left = striker weapons for value,
  // surv = victim weapons that survive.
  const pts = [{ s: 0, left: aAvail, surv: vAll, seg: -1 }];
  let s = 0, killed = 0;
  segs.forEach((g, i) => {
    const room = Math.max(0, aAvail - s);
    const use = Math.min(g.spend, room);
    if (use <= 0) return;
    const steps = Math.max(2, Math.ceil(use / Math.max(1, aAvail / 160)));
    for (let k = 1; k <= steps; k++) {
      const u = use * k / steps;
      pts.push({ s: s + u, left: aAvail - s - u, surv: Math.max(0, vAll - killed - g.kill * (u / g.spend)), seg: i });
    }
    s += use; killed += g.kill * (use / g.spend);
  });

  // Surviving victim weapons strike the attacker's value; the attacker's leftover weapons strike the victim's.
  const cA = p => cost(damage(p.surv, att.w80), damage(p.left, vic.w80));
  const cV = p => cost(damage(p.left, vic.w80), damage(p.surv, att.w80));
  pts.forEach(p => { p.cAtt = cA(p); p.cVic = cV(p); });
  const min = Math.min(...pts.map(p => p.cAtt));
  const tol = 0.002;
  let best = null;
  pts.forEach(p => { if (p.cAtt <= min + tol && (!best || p.cVic > best.cVic + 1e-9)) best = p; });
  return { pts, stop: best, segs, aAvail, vAll };
}

/**
 * Full evaluation. S: { A, B, prl, wpt }. Each side's w80 is the number of enemy weapons that would
 * destroy 80% of that side's own value.
 */
export function evaluate(S) {
  const ab = strike(S.A, S.B, S.prl, S.wpt);
  const ba = strike(S.B, S.A, S.prl, S.wpt);
  const c1A = ab.stop.cAtt, c2B = ab.stop.cVic, c1B = ba.stop.cAtt, c2A = ba.stop.cVic;
  const rA = c2A > 0 ? Math.min(1, c1A / c2A) : 1, rB = c2B > 0 ? Math.min(1, c1B / c2B) : 1;
  return { ab, ba, c1A, c2A, c1B, c2B, rA, rB, index: rA * rB, tA: totals(S.A), tB: totals(S.B) };
}

export const indexOf = S => evaluate(S).index;
