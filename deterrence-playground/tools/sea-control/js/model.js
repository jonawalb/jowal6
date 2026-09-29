// Sea Control Game: the tool's own two-move model of decisive battle (Mahan) against fleet-in-being and
// sea denial (Corbett). It illustrates the argument of Walberg, "Too Much Mahan, Not Enough Corbett"
// (working paper, draft of 8 May 2026), which states its theory verbally and has no formal model.
// Every functional form and parameter here is the tool's choice and is notional.
//
// Move 1. The dominant navy D, with resources R relative to the challenger's 1, puts a share m of its
//         budget into a concentrated battle fleet and 1 - m into distributed forces (escorts, mine
//         countermeasures, sensors, small combatants).
// Move 2. The challenger C sees m and picks one of three strategies:
//   battle  : seek a decisive fleet action. C wins command with q = 1 / (1 + (mR)^2); D keeps the sea
//             lanes open with 1 - q. C risks its fleet, which it values at L, with probability 1 - q.
//   fleet   : keep a fleet in being and refuse battle. D must hold w units of battle fleet per unit of
//             C's fleet to contain it; short of that, C's sorties close up to a share phi of traffic.
//             open = 1 - phi * max(0, 1 - mR / w).
//   denial  : spend on cheap denial (mines, submarines, missiles). Loss rate r = k / (k + (1 - m)R),
//             where k is the challenger's cost-exchange advantage. open = 1 - r. With insurance-mediated
//             denial on, traffic falls to a residual share rho once r reaches the insurers' threshold tau.
// C picks the strategy that maximises its payoff (1 - open, less the expected fleet loss in battle).
// D's security-optimal mix m* maximises open under C's best response. The locked-in mix renders two of
// the paper's three lock-in pathways: doctrinal inheritance, a planning weight theta on the scenario in
// which the challenger accepts decisive battle, and prestige-platform bias, a premium beta per unit of m.
// mL = argmax (1 - theta) * open(BR) + theta * open(battle) + beta * m. Open traffic is then read at mL
// under the challenger's actual best response.

export const OPTS = [
  { k: 'battle', n: 'Seek decisive battle', short: 'Battle', who: 'Mahan' },
  { k: 'fleet', n: 'Fleet in being', short: 'Fleet in being', who: 'Corbett' },
  { k: 'denial', n: 'Sea denial', short: 'Denial', who: 'Corbett' },
];

/** Outcomes of each challenger strategy at battle-fleet share m. */
export function outcomes(m, P) {
  const B = m * P.R, E = (1 - m) * P.R;
  const q = 1 / (1 + B * B);
  const openB = 1 - q;
  const openF = 1 - P.phi * Math.max(0, 1 - B / P.w);
  const r = P.k / (P.k + E);
  const withdrawn = P.ins && r >= P.tau;
  const openS = withdrawn ? (1 - r) * P.rho : 1 - r;
  return {
    m, q, r, withdrawn,
    battle: { open: openB, uC: q - (1 - q) * P.L },
    fleet: { open: openF, uC: 1 - openF },
    denial: { open: openS, uC: 1 - openS },
  };
}

/** Challenger's best response: first strategy with the highest payoff (ties go to the earlier one). */
export function bestResponse(o) {
  let best = OPTS[0].k;
  for (const { k } of OPTS) if (o[k].uC > o[best].uC + 1e-9) best = k;
  return best;
}

const GRID = 400;

/** Full solution: the curve over m, C's choice at each m, the optimum m* and the locked-in mL. */
export function solve(P, m) {
  const curve = [];
  let mStar = 0, vStar = -1, mL = 0, vL = -Infinity;
  for (let i = 0; i <= GRID; i++) {
    const x = i / GRID, o = outcomes(x, P), br = bestResponse(o), open = o[br].open;
    curve.push({ m: x, br, open, battle: o.battle.open, fleet: o.fleet.open, denial: o.denial.open });
    if (open > vStar + 1e-9) { vStar = open; mStar = x; }
    const u = (1 - P.theta) * open + P.theta * o.battle.open + P.beta * x;
    if (u > vL + 1e-9) { vL = u; mL = x; }
  }
  const cur = outcomes(m, P), br = bestResponse(cur);
  const atL = curve[Math.round(mL * GRID)];
  return { curve, cur, br, open: cur[br].open, mStar, openStar: vStar, mL, openL: atL.open, brL: atL.br,
    brStar: curve[Math.round(mStar * GRID)].br };
}
