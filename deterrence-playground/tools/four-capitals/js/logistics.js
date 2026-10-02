// The four logistics resources: what moves and orders cost, monthly upkeep and regeneration, and the ledger the
// decision table and the computer both read. Pure functions over the game state `s`. Numbers: data/formations.js.
import { SUPPLY, UPKEEP, READY, FBY } from '../data/formations.js';
import { SEA, ISLAND } from '../data/theater.js';
import { BY_ID, answers } from '../data/actions.js';
import { r2, shiftReady, contributors, fights, munNeed, applyOrders, orderCheck } from './forces.js';

const IDS = ['us', 'tw', 'cn', 'jp'];
export const ZERO = { lift: 0, fuel: 0, mun: 0, ready: 0 };
const clone = x => JSON.parse(JSON.stringify(x));

export function initRes(s) {
  s.res = Object.fromEntries(IDS.map(w => [w, { lift: SUPPLY[w].lift, fuel: SUPPLY[w].fuel.start, mun: SUPPLY[w].mun.start }]));
  s.binds = Object.fromEntries(IDS.map(w => [w, { lift: 0, fuel: 0, mun: 0, ready: 0 }]));
  s.short = {};
}

/** A move's cost { lift, fuel, mun, ready } given its follow-up answers (cost may depend on them). */
export function costOf(id, o) {
  const a = BY_ID[id], c = typeof a.cost === 'function' ? a.cost(answers(id, o)) : a.cost;
  return { ...ZERO, ...(c || {}) };
}
/** What a set of chosen moves adds to the month's resources (surges, call-ups, exercises, arms purchases). */
export const grantOf = ids => ids.reduce((g, id) => { for (const [k, v] of Object.entries(BY_ID[id].grant || {})) g[k] += v; return g; }, { ...ZERO });
export const avgReady = (s, who) => { const l = s.units[who].filter(u => u.str > 0); return l.length ? l.reduce((t, u) => t + u.ready, 0) / l.length : 0; };
export const costText = c => ['lift', 'fuel', 'mun', 'ready'].filter(k => c[k]).map(k => `${{ lift: 'Lift', fuel: 'Fuel', mun: 'Mun', ready: 'Ready' }[k]} ${c[k]}`).join(' · ');

/** The first resource `c` would overdraw from `res` (and average readiness `ready`), or null if affordable. */
export function short(res, ready, c) {
  for (const k of ['lift', 'fuel', 'mun']) if (c[k] > 0 && (res[k] ?? 0) < c[k] - 1e-9) return k;
  if (c.ready > 0 && ready - c.ready < READY.min) return 'ready';
  return null;
}

export function applyGrants(s, who, ids) {
  const g = grantOf(ids), res = s.res[who];
  for (const k of ['lift', 'fuel', 'mun']) if (g[k]) res[k] = r2(res[k] + g[k]);
  if (g.ready) shiftReady(s, who, g.ready);
  return g;
}

/** Pay for the chosen moves in the order chosen. Returns { [id]: resource } for moves that could not be paid. */
export function payMoves(s, who, ids, follow = {}) {
  const res = s.res[who], refused = {};
  for (const id of ids) {
    const c = costOf(id, follow[id]), k = short(res, avgReady(s, who), c);
    if (k) { refused[id] = k; continue; }
    for (const r of ['lift', 'fuel', 'mun']) res[r] = r2(res[r] - c[r]);
    if (c.ready) shiftReady(s, who, -c.ready);
  }
  return refused;
}
/** Give back a paid move's Lift, fuel and munitions when something else blocked it. */
export function refund(s, who, id, o) {
  const c = costOf(id, o), res = s.res[who];
  for (const r of ['lift', 'fuel', 'mun']) res[r] = r2(res[r] + c[r]);
}

/** Fuel the capital's formations at sea burn this month at their areas' stances. */
export const fuelUpkeep = (s, who) => s.units[who].filter(u => u.str > 0).reduce((t, u) => t + (SEA.includes(u.at) ? UPKEEP.fuel[s.stance[who][u.at]] : ISLAND.includes(u.at) && s.rung >= 2 ? UPKEEP.island : 0), 0);
/** Munitions the capital will need for this month's fighting, as things stand. */
export function munUpkeep(s, who) {
  let n = 0;
  for (const a of SEA) {
    const con = { red: contributors(s, 'red', a), blue: contributors(s, 'blue', a) };
    if (fights(s, a, con)) n += munNeed([...con.red, ...con.blue].filter(c => c.w === who), s.stance[who][a]);
  }
  return n;
}

/** Readiness change for one formation at the end of this month. */
export function drift(s, who, u) {
  const t = FBY[u.id].type;
  if (u.at === 'transit') return 0;
  if (SEA.includes(u.at)) return READY[s.stance[who][u.at]] + (s.engaged?.[u.id] ? READY.engaged : 0);
  if (ISLAND.includes(u.at)) return (s.rung >= 2 ? READY.alert : READY.island) + (s.engaged?.[u.id] ? READY.engaged / 2 : 0) + (s.short?.[who]?.dry ? READY.dry : 0);
  if (t === 'strike') return s.engaged?.[u.id] ? READY.strike : READY.idle;
  return READY.rear;
}

/** End of month: fuel upkeep (stances fall back a step, Attack first, when fuel runs short), then readiness. */
export function upkeep(s, log) {
  s.short = s.short || {};
  for (const w of IDS) {
    const res = s.res[w];
    let need = fuelUpkeep(s, w);
    const fell = [];
    while (need > res.fuel + 1e-9) {
      const a = SEA.filter(x => s.units[w].some(u => u.at === x && u.str > 0) && s.stance[w][x] !== 'defend')
        .sort((x, y) => (s.stance[w][y] === 'attack') - (s.stance[w][x] === 'attack'))[0];
      if (!a) break;
      s.stance[w][a] = s.stance[w][a] === 'attack' ? 'contest' : 'defend';
      fell.push(a);
      need = fuelUpkeep(s, w);
    }
    if (fell.length) { (s.short[w] = s.short[w] || {}).fuel = true; log.push({ kind: 'force', who: w, short: 'fuel', text: `Short of fuel: stances fall back in the ${[...new Set(fell)].join(', ')}` }); }
    if (need > res.fuel + 1e-9) { Object.assign(s.short[w] = s.short[w] || {}, { fuel: true, dry: true }); log.push({ kind: 'force', who: w, short: 'fuel', text: 'Out of fuel: forces on the island lose readiness' }); }
    res.fuel = r2(Math.max(0, res.fuel - need));
    for (const u of s.units[w]) u.ready = Math.round(Math.max(READY.floor, Math.min(100, u.ready + drift(s, w, u))));
  }
}

/** Regeneration rates this month (a blockade cuts Taiwan's fuel and stops its munitions resupply). */
export function regenOf(s, who) {
  const S = SUPPLY[who], bite = who === 'tw' ? (s.blockade || 0) * Math.max(0, 1 - (s.escort || 0)) : 0;
  return { lift: S.lift, fuel: r2(S.fuel.regen * (1 - 0.6 * bite)), mun: bite > 0 ? 0 : S.mun.regen };
}
export function regen(s) {
  for (const w of IDS) {
    const res = s.res[w], g = regenOf(s, w), S = SUPPLY[w];
    res.lift = g.lift;
    for (const k of ['fuel', 'mun']) res[k] = r2(Math.min(S[k].cap, res[k] + g[k]));   // grants above the cap do not keep
  }
}

/** Record which resources held this capital back this month (counted for the balance report and the debrief). */
export function noteBinds(s, who, used) {
  const b = s.binds[who], sh = s.short[who] || {};
  for (const k of ['lift', 'fuel', 'mun']) if (sh[k] || used[k]) b[k]++;
  if (sh.ready || s.units[who].some(u => u.str > 0 && u.ready < 50)) b.ready++;
}

/**
 * The decision ledger for `who` given a (partial) choice: rows per resource with have (start of month plus
 * grants), committed (moves, orders and this month's upkeep), left and next month's regeneration; plus what
 * is left before upkeep, which the engine checks moves and orders against.
 */
export function ledger(s, who, choice) {
  const t = clone(s), ids = choice.actions || [];
  t.short = {};
  const ready0 = avgReady(t, who), base = { ...t.res[who] };
  const g = applyGrants(t, who, ids);
  const refused = payMoves(t, who, ids, choice.follow || {});
  const { log } = applyOrders(t, who, choice.orders || {}, { fast: ids.includes('us_surge') });
  const free = { ...t.res[who], ready: avgReady(t, who) };
  const fuelUp = fuelUpkeep(t, who), munUp = munUpkeep(t, who);
  const drains = t.units[who].filter(u => u.str > 0).map(u => Math.max(READY.floor, Math.min(100, u.ready + drift(t, who, u))) - u.ready);
  const n = Math.max(1, drains.length), drop = -drains.filter(d => d < 0).reduce((a, b) => a + b, 0) / n, rise = drains.filter(d => d > 0).reduce((a, b) => a + b, 0) / n;
  const rg = regenOf(s, who), have = { lift: base.lift + g.lift, fuel: base.fuel + g.fuel, mun: base.mun + g.mun, ready: ready0 };
  const left = { lift: free.lift, fuel: free.fuel - fuelUp, mun: free.mun - munUp, ready: free.ready - drop };
  const rows = Object.fromEntries(['lift', 'fuel', 'mun', 'ready'].map(k => [k, { have: r2(have[k]), committed: r2(have[k] - left[k]), left: r2(left[k]), next: k === 'ready' ? r2(rise) : rg[k] }]));
  return { rows, free, refused, orderLog: log, trial: t, upkeep: { fuel: fuelUp, mun: munUp } };
}

/** Can `who` still afford this order on top of the choice so far? (null if yes, else the reason) */
export const orderWhy = (L, who, order, done) => orderCheck(L.trial, who, order, L.free, done).why || null;
