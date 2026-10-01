// Computer players for your seat: the benchmark ("computer") and simple fixed strategies used by the balance
// script and the end-screen baseline. policy(state, rng) → list of actions for this year. No DOM.
import { P } from '../data/params.js';
import { IDS, BY } from '../data/minerals.js';
import { blocked, cost } from '../data/actions.js';
import { parts, exposure } from './market.js';

const L = s => P.years - s.t;
const building = (s, m, kind) => s.projects.filter(p => p.m === m && p.kind === kind && p.status === 'build').reduce((t, p) => t + p.cap, 0);

/** Greedy fill: take candidates in order of value per point while they are legal. */
function fill(s, cands, max = P.maxActions) {
  const out = [];
  for (const c of cands.sort((a, b) => b.v - a.v)) {
    if (out.length >= max || c.v <= 0) break;
    if (!blocked(c.a, s, out)) out.push(c.a);
  }
  return out;
}

/** Rough value of each possible action (importance-weighted share of demand made secure, time-discounted). */
export function candidates(s) {
  const out = [], left = L(s);
  const threat = 1 - (s.belief.commercial || 0) * 0.6;
  const dumpRisk = 0.15 + 0.25 * (s.belief.commercial + s.belief.opportunist);
  for (const m of IDS) {
    const g = BY[m].game, p = parts(s, m), D = p.D, imp = g.importance, V = exposure(s, m);
    const idleOre = Math.max(0, p.ore - p.ref - building(s, m, 'refinery'));
    const idleRef = Math.max(0, p.ref + building(s, m, 'refinery') - p.ore - building(s, m, 'mine'));
    for (const site of ['ally', 'dom']) {
      const r = P.refinery[site], mi = P.mine[site];
      const rGain = Math.min(r.cap, idleOre) / D * imp * Math.max(0, left - r.lead[1]) / P.years * 9;
      const mGain = Math.min(mi.cap, idleRef + (V > 0.6 ? mi.cap * 0.3 : 0)) / D * imp * Math.max(0, left - mi.lead[1]) / P.years * 6;
      for (const floor of [false, true]) {
        const keep = floor ? 1 : 1 - dumpRisk, extra = floor ? P.floorCost : 0;
        out.push({ a: { id: 'refinery', m, site, floor }, v: rGain * keep * (site === 'dom' ? 1.15 : 1) / (r.cost + r.pc + extra) });
        out.push({ a: { id: 'mine', m, site, floor }, v: mGain * keep / (mi.cost + mi.pc + extra) });
      }
    }
    const cover = s.m[m].stock / 12;
    out.push({ a: { id: 'stock', m }, v: imp * V * threat * Math.max(0, 1 - cover * 1.5) * (s.ctrl[m] === 'open' ? 0.35 : 0.6) / cost({ id: 'stock', m }, s) });
    out.push({ a: { id: 'offtake', m }, v: imp * (P.offtake.cap / D) * Math.max(0, left - 1) / P.years * 3 / P.offtake.cost * (V > 0.3 ? 1 : 0.3) });
    out.push({ a: { id: 'recycle', m }, v: imp * Math.min(g.recycleCap - s.m[m].recycled, P.recycle.perYear * Math.max(0, left - P.recycle.ramp)) / 100 * 3 / P.recycle.cost });
    out.push({ a: { id: 'thrift', m }, v: imp * P.thrift.success * P.thrift.perYear * Math.max(0, left - P.thrift.lag) * 1.5 / P.thrift.cost });
  }
  const totV = IDS.reduce((t, m) => t + BY[m].game.importance * exposure(s, m), 0);
  out.push({ a: { id: 'diplo' }, v: s.coalition < 2 ? totV * 0.12 * threat / (P.diplo.cost + P.diplo.pc) : 0 });
  const domPlans = s.projects.filter(p => p.site === 'dom' && p.status === 'build').length;
  out.push({ a: { id: 'permit' }, v: domPlans >= 2 && left > 4 ? 0.03 : 0 });
  return out;
}

export const POLICIES = {
  /** Do nothing: keep the money. */
  nothing: () => [],
  /** Stockpile only: top up the most exposed minerals. */
  stockpile: s => fill(s, IDS.map(m => ({ a: { id: 'stock', m }, v: BY[m].game.importance * exposure(s, m) * (1 - s.m[m].stock / 13) }))),
  /** Mines only: domestic mines where reliance is highest. */
  mines: s => fill(s, IDS.map(m => ({ a: { id: 'mine', m, site: 'dom' }, v: BY[m].game.importance * exposure(s, m) })), 2),
  /** Refining first: allied refineries, with price floors, where ore sits idle. */
  refining: s => fill(s, IDS.flatMap(m => {
    const p = parts(s, m), idle = Math.max(0, p.ore - p.ref - building(s, m, 'refinery'));
    return [{ a: { id: 'refinery', m, site: 'ally', floor: true }, v: Math.min(idle, P.refinery.ally.cap) / p.D * BY[m].game.importance * 10 }];
  }), 2),
  /** The computer in your seat: rough values plus noise, filled greedily. */
  computer: (s, r) => fill(s, candidates(s).map(c => ({ ...c, v: c.v * Math.exp(0.35 * r.normal()) }))),
};
