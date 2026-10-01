// Magazine Depth: computer policies. "balanced" is the computer in your seat; "stock" and "capacity" are the
// pure strategies used in the balance runs. None of them reads the hidden war year; they see only the warnings.
import { P, IDS, BY, CIDS, CBY } from '../data/params.js';
import { emptyDecision, fit, budget, capitalCost, buyCost, maxBuy, floorBuy, compCap, stockNow, canDo, lineCap } from './engine.js';
import { effStock, weeklyOutput } from './war.js';

/** Weeks of full-rate war each class's effective stock would cover. */
export const coverWeeks = s => { const e = stockNow(s); return Object.fromEntries(IDS.map(id => [id, e[id] / BY[id].demand])); };

/** Spend what is left on orders, thinnest stocks first (weighted by importance). */
export function fillBuys(s, d) {
  const cw = coverWeeks(s);
  const order = [...IDS].sort((a, b) => cw[a] / BY[a].imp - cw[b] / BY[b].imp);
  for (const id of IDS) d.buy[id] = floorBuy(s, id);
  for (const id of order) {
    const left = budget(s) - capitalCost(d) - buyCost(s, d);
    if (left <= 0) break;
    const m = maxBuy(s, id), base = d.buy[id];
    let lo = base, hi = m;
    while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); d.buy[id] = mid; if (capitalCost(d) + buyCost(s, d) <= budget(s)) lo = mid; else hi = mid - 1; }
    d.buy[id] = lo;
  }
  return fit(s, d);
}

/** Component load if every line ran flat out at year t. */
function loadAtMax(s, t = s.year + 2) {
  const load = Object.fromEntries(CIDS.map(k => [k, 0]));
  for (const id of IDS) for (const k in BY[id].kits) load[k] += lineCap(s, id, t) * BY[id].kits[k];
  return load;
}
const afford = (s, d, extra) => capitalCost(d) + extra + buyCost(s, { buy: Object.fromEntries(IDS.map(i => [i, floorBuy(s, i)])) }) <= budget(s) * 0.55;

export const STRATEGIES = {
  /** Buy as much as the lines can make, every year. */
  stock: s => fillBuys(s, emptyDecision()),

  /** Spend the first years building lines, suppliers and workers, then buy. */
  capacity: s => {
    const d = emptyDecision(), t = s.year;
    if (t <= 2) {
      if (canDo(s, 'train')) d.train = true;
      for (const k of CIDS) if (canDo(s, 'second', k) && capitalCost(d) + CBY[k].second.cost <= budget(s) * 0.8) d.second.push(k);
      for (const id of [...IDS].sort((a, b) => BY[b].imp - BY[a].imp)) if (capitalCost(d) + BY[id].expand.cost <= budget(s) * 0.9) d.expand.push(id);
    }
    return fillBuys(s, d);
  },

  /** The computer in your seat: audit the sub-tier, train, contract multiyear, fix the scarcest supplier,
   * expand the thinnest line while warnings are low, and switch to buying when they rise. */
  balanced: s => {
    const d = emptyDecision(), t = s.year, warn = s.warn[t].level;
    if (t === 0) { d.audit = CIDS.filter(k => canDo(s, 'audit', k)); d.multi = ['ad', 'shell']; }
    if (t === 1) d.multi = ['ship'];
    if (canDo(s, 'train') && warn < 3) d.train = true;
    if (warn <= 1) {
      const cw = coverWeeks(s);
      const thin = [...IDS].sort((a, b) => cw[a] / BY[a].imp - cw[b] / BY[b].imp);
      if (t <= 5) for (const id of thin.slice(0, t <= 1 ? 2 : 1)) if (afford(s, d, BY[id].expand.cost)) d.expand.push(id);
      const load = loadAtMax(s);
      const tight = CIDS.filter(k => canDo(s, 'second', k) && load[k] > 0.92 * compCap(s, k, t + 2)).sort((a, b) => load[b] / compCap(s, b) - load[a] / compCap(s, a));
      for (const k of tight.slice(0, 2)) if (afford(s, d, CBY[k].second.cost)) d.second.push(k);
      if (t === 1 && afford(s, d, P.coprod.cost)) d.coprod.push('loiter');
      if (t === 1 && afford(s, d, P.modern.cost)) d.modern.push('ad');
    }
    return fillBuys(s, d);
  },
};

/** Wartime rationing for the computer: hold fire back while the line is safe, fire everything when it is not. */
export function rationAI(s) {
  const war = s.war, eff = effStock(war.stock, war.effL), { out } = weeklyOutput(s);
  const left = P.weeks - war.week, f = {};
  for (const id of IDS) {
    const net = BY[id].demand - out[id].own - out[id].partner * s.rel;
    const weeks = net <= 0 ? Infinity : eff[id] / net;
    if (war.hold >= 99 && weeks < left / 2) f[id] = 2;
    else if (war.hold >= 92 && weeks < left) f[id] = 1;
    else f[id] = 0;
  }
  return f;
}
