// Red's hidden plan and its scripted commander. Red reads the true picture (a simplification: Red gets
// no fog of its own), follows a main effort, a feint with decoys, a probe and a second echelon that
// "reinforces success" by going wherever its attack is doing best.
import { NORTH, LINE } from '../data/map.js';
import { TYPES } from '../data/params.js';
import { makeRng, STREAM } from './rng.js';
import { path } from './graph.js';

const R = (id, type, role, name) => ({ id, side: 'red', type, role, name, str: TYPES[type].str, str0: TYPES[type].str });

/** The plan depends only on the scenario seed, never on the dice, so every replay faces the same plan. */
export function makePlan(seed) {
  const r = makeRng(seed, STREAM.plan);
  const main = r.pick([1, 1, 1]);
  const others = [0, 1, 2].filter(a => a !== main);
  const fi = r.u() < 0.5 ? 0 : 1;
  const feint = others[fi], probe = others[1 - fi];
  const h0 = 3 + r.pick([1, 1, 1]);   // main effort reaches the north edge at hour 3, 4 or 5
  return { main, feint, probe, h0, second: h0 + 5 };
}

export function redUnits(plan) {
  const m = NORTH[plan.main], f = NORTH[plan.feint], p = NORTH[plan.probe];
  return [
    { ...R('r1', 'mech', 'main', 'Red mech bn 1'), arrive: plan.h0, entry: m },
    { ...R('r2', 'mech', 'main', 'Red mech bn 2'), arrive: plan.h0, entry: m },
    { ...R('r3', 'armor', 'main', 'Red tank bn 1'), arrive: plan.h0 + 1, entry: m },
    { ...R('r4', 'armor', 'main', 'Red tank bn 2'), arrive: plan.h0 + 1, entry: m },
    { ...R('r5', 'mech', 'feint', 'Red mech bn 3'), arrive: plan.h0 - 1, entry: f },
    { ...R('d1', 'decoy', 'decoy', 'Decoy group A'), arrive: plan.h0 - 1, entry: f },
    { ...R('d2', 'decoy', 'decoy', 'Decoy group B'), arrive: plan.h0, entry: f },
    { ...R('r6', 'recon', 'probe', 'Red recon coy'), arrive: 1, entry: p },
    { ...R('r7', 'mech', 'second', 'Red mech bn 4'), arrive: plan.second, entry: null },
    { ...R('r8', 'armor', 'second', 'Red tank bn 3'), arrive: plan.second, entry: null },
  ].map(u => ({ ...u, node: 'off', since: 0, route: [], seg: null, broken: false }));
}

const eff = (g, side, node) => g.units.filter(u => u.side === side && !u.broken && u.node === node && u.str > 0);
const sum = us => us.reduce((s, u) => s + u.str, 0);
const go = (u, dest) => { if (u.node && u.node !== dest && !u.seg) u.route = path(u.node, dest); };

/** Red's decisions at the start of hour t. */
export function redAct(g) {
  const { plan } = g, t = g.t;
  // Arrivals. The second echelon picks the axis where Red's local ratio is best right now.
  for (const u of g.units) {
    if (u.side !== 'red' || u.node !== 'off' || u.arrive > t) continue;
    let entry = u.entry;
    if (!entry) {
      const score = [0, 1, 2].map(a => (sum(eff(g, 'red', NORTH[a])) + sum(eff(g, 'red', LINE[a])) + 1) / (sum(eff(g, 'blue', LINE[a])) + 1));
      if (eff(g, 'red', 'x').length) score[1] += 99;
      const a = score.indexOf(Math.max(...score));
      entry = NORTH[a];
      u.axis = a;
    }
    u.node = entry; u.since = t;
  }
  const mainAt = NORTH[plan.main], mainLine = LINE[plan.main];
  const mains = g.units.filter(u => u.role === 'main' && !u.broken && u.node !== 'off' && u.node !== 'gone');
  const assembled = t >= plan.h0 + 3;   // NOTIONAL: an hour to assemble, two hours of preparation
  for (const u of g.units) {
    if (u.side !== 'red' || u.broken || !u.node || u.node === 'off' || u.node === 'gone' || u.seg || u.route.length) continue;
    const lineOf = LINE[NORTH.indexOf(u.entry ?? NORTH[u.axis])] ?? null;
    const blueHere = sum(eff(g, 'blue', u.node));
    if (u.role === 'decoy') continue;
    if (u.node === 'x') continue;
    if (u.role === 'main') {
      if (u.node === mainAt && assembled) go(u, mainLine);
      else if (u.node === mainLine && !blueHere) go(u, 'x');
    } else if (u.role === 'feint') {
      if (u.node === NORTH[plan.feint] && !u.done) go(u, LINE[plan.feint]);
      else if (u.node === LINE[plan.feint] && blueHere && u.str < 0.75 * u.str0) { u.done = true; go(u, NORTH[plan.feint]); }
      else if (u.node === LINE[plan.feint] && !blueHere) go(u, 'x');
    } else if (u.role === 'probe') {
      const lp = LINE[plan.probe];
      if (u.node === NORTH[plan.probe] && !sum(eff(g, 'blue', lp))) go(u, lp);
      else if (u.node === lp && !blueHere && !sum(eff(g, 'blue', 'x'))) go(u, 'x');
    } else if (u.role === 'second') {
      if (NORTH.includes(u.node)) go(u, lineOf);
      else if (u.node === lineOf && !blueHere) go(u, 'x');
    }
  }
}
