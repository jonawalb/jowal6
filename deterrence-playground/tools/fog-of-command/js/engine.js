// Fog of Command: the game engine. Pure functions over a plain state object, no DOM, so the same code
// runs the game, the replays in the after-action review and the Monte Carlo balance script.
// Either side can be the player (actions logged in g.log) or a scripted commander (a policy function).
import { GAME, ORDER_DELAY, ORDER_DELAY_MAXRUN, TYPES, COMBAT, FORCES, DISENGAGE, ARTILLERY } from '../data/params.js';
import { NORTH, OBJ, NODE } from '../data/map.js';
import { makeRng, STREAM } from './rng.js';
import { fight, breaks, sum, power } from './combat.js';
import { sight, beliefAt, truthFor, other, posOf, exact } from './vision.js';
import { path, edgeHours, neighbours, hops } from './graph.js';

/**
 * New game. opts: { seed, dice = 0, noDelay = false, players: { blue: policy|null, red: policy|null },
 * rules: { blind: { blue, red } } } (blind = artillery never spotted, for the balance check). A null player is the human; its actions come from issue(), setStance()
 * and setFire(), and are logged in g.log for replays and share links.
 */
export function newGame({ seed, dice = 0, noDelay = false, players = {}, rules = {} }) {
  const mk = (side, d) => ({
    ...d, side, str: TYPES[d.type].str, str0: TYPES[d.type].str, stance: d.stance || 'hold',
    node: d.type === 'arty' ? 'rear' : side === 'blue' ? d.start : 'off', entry: side === 'red' && d.type !== 'arty' ? d.start : null,
    arrive: d.arrive ?? 0, since: -10, from: null, route: [], seg: null, broken: false,
  });
  const g = {
    seed, dice, noDelay, t: 0, over: null, rules: { blind: { blue: false, red: false, ...(rules.blind || {}) } },
    players: { blue: players.blue || null, red: players.red || null },
    units: [...FORCES.blue.map(d => mk('blue', d)), ...FORCES.red.map(d => mk('red', d))],
    orders: [], log: [], fire: { blue: {}, red: {} }, fires: [], seen: { blue: [], red: [] }, fights: [], events: [], snaps: [],
    rCombat: makeRng(seed, STREAM.combat, dice), rFire: makeRng(seed, STREAM.fire, dice),
    rSense: { blue: makeRng(seed, STREAM.sense, dice), red: makeRng(seed, STREAM.sense + 10, dice) },
  };
  // Hidden unit quality: part of the scenario (seed only), so every replay faces the same units.
  const rq = makeRng(seed, STREAM.quality);
  for (const u of g.units) u.q = Math.exp(COMBAT.quality * rq.normal());
  startHour(g);
  return g;
}

export const unit = (g, id) => g.units.find(u => u.id === id);
export const sideUnits = (g, side) => g.units.filter(u => u.side === side);
export const artyOf = (g, side) => g.units.find(u => u.side === side && u.type === 'arty');
export const eff = (g, side, node) => g.units.filter(u => u.side === side && !u.broken && u.node === node && u.str > 0);
export const where = u => u.node || (u.seg && u.seg.to) || null;
/** Where a unit is heading: the end of its route, or the end of the segment it is on. */
export const dest = u => (u.route.length ? u.route[u.route.length - 1] : u.seg ? u.seg.to : u.node);

/** Delay for every order a side sends at hour t: one roll per side per hour, fixed by seed and dice. */
export function orderDelay(g, side, t = g.t) {
  if (g.noDelay) return 0;
  const memo = (g._delay ||= { blue: [], red: [] })[side];
  for (let h = memo.length; h <= t; h++) {
    const r = makeRng(g.seed, 1000 + (side === 'blue' ? 0 : 50) + h, g.dice);
    let d = ORDER_DELAY[r.pick(ORDER_DELAY.map(x => x[1]))][0];
    // Cap on delayed hours in a row (ORDER_DELAY_MAXRUN): after that many, orders start at once.
    const run = g.delayMaxRun ?? ORDER_DELAY_MAXRUN;   // g.delayMaxRun: override for the sensitivity check
    if (d > 0 && run > 0 && h >= run && memo.slice(h - run, h).every(x => x > 0)) d = 0;
    memo.push(d);
  }
  return memo[t];
}

/** First hour of the current run of delayed hours for a side (null if orders this hour start at once). */
export function delaySince(g, side, t = g.t) {
  if (!orderDelay(g, side, t)) return null;
  let h = t;
  while (h > 0 && orderDelay(g, side, h - 1)) h--;
  return h;
}

/**
 * Send an order at the current hour. For a Red unit still off the map, a north sector sets where it
 * enters (at once, no delay). A newer order to the same unit replaces one still in transit.
 */
export function issue(g, id, to, logIt = true, extra = 0) {
  const u = unit(g, id);
  if (!u || u.broken || u.node === 'gone' || g.over || u.type === 'arty') return null;
  if (u.node === 'off') {
    if (!NORTH.includes(to)) return null;
    u.entry = to;
    if (logIt) g.log.push({ t: g.t, kind: 'e', unit: id, v: to });
    return { entry: true, unit: id, dest: to, d: 0 };
  }
  if (!NODE[to]) return null;
  for (const o of g.orders) if (o.unit === id && !o.done && !o.cancelled) o.cancelled = true;
  const d = orderDelay(g, u.side);
  const o = { i: g.orders.length, t: g.t, side: u.side, unit: id, dest: to, d: d + extra, due: g.t + d + extra, done: false, cancelled: false };
  g.orders.push(o);
  if (logIt) g.log.push({ t: g.t, kind: 'o', unit: id, v: to });
  return o;
}

/** Standing order: 'hold' (stay and fight) or 'give' (fall back one sector when a stronger enemy attacks). */
export function setStance(g, id, stance, logIt = true) {
  const u = unit(g, id);
  if (!u || u.broken || g.over || u.stance === stance || u.type === 'arty' || u.type === 'decoy') return;
  u.stance = stance;
  if (logIt) g.log.push({ t: g.t, kind: 's', unit: id, v: stance });
}

/** Fire this side's artillery mission for the hour at a sector. It lands at once; one mission an hour. */
export function setFire(g, side, node, logIt = true) {
  if (g.over || !NODE[node] || g.fire[side][g.t]) return null;
  g.fire[side][g.t] = node;
  if (logIt) g.log.push({ t: g.t, kind: 'f', unit: artyOf(g, side).id, v: node });
  return fire(g, side);
}

/** Withdraw the last order or standing order logged this hour (a fire mission cannot be recalled). */
export function undoLast(g) {
  const k = g.log.map(a => a.t === g.t && a.kind !== 'f').lastIndexOf(true);
  if (k < 0) return null;
  const [a] = g.log.splice(k, 1);
  const u = unit(g, a.unit);
  if (a.kind === 'o') {
    const k = g.orders.map(o => o.unit === a.unit && o.t === g.t && !o.cancelled).lastIndexOf(true);
    if (k >= 0) g.orders.splice(k, 1);
    const prev = [...g.orders].reverse().find(o => o.unit === a.unit && !o.done && o.cancelled && o.due >= g.t);
    if (prev) prev.cancelled = false;
  } else if (a.kind === 's') {
    u.stance = a.v === 'give' ? 'hold' : 'give';
  } else if (a.kind === 'e') {
    const earlier = [...g.log].reverse().find(x => x.kind === 'e' && x.unit === a.unit);
    u.entry = earlier ? earlier.v : FORCES.red.find(d => d.id === a.unit).start;
  }
  return a;
}

function arrivals(g) {
  for (const u of g.units) {
    if (u.side !== 'red' || u.node !== 'off' || u.arrive > g.t) continue;
    u.node = u.entry; u.since = g.t + 1; u.from = 'edge';
    g.events.push({ t: g.t, kind: 'arrive', unit: u.id, node: u.node });
  }
}

/** A scripted side's turn: first its fire mission (the report comes back at once), then its orders. */
function applyPolicy(g, side) {
  const p = g.players[side];
  if (!p) return;
  const target = p(g, side, 'fire');
  if (target) setFire(g, side, target, false);
  const act = p(g, side, 'orders') || {};
  for (const [id, s] of act.stances || []) setStance(g, id, s, false);
  for (const [id, n, extra] of act.orders || []) issue(g, id, n, false, extra || 0);   // extra: a scripted commander's own added delay (AI.blue.recommitDelay)
}

/** One artillery mission (ARTILLERY): damage, a report that is right 90% of the time, danger close, spotting. */
function fire(g, side) {
  const node = g.fire[side][g.t];
  if (!node) return null;
  const A = ARTILLERY, r = g.rFire;
  const inSector = g.units.filter(u => u.side !== side && !u.broken && u.node === node);
  let total = 0;
  const hits = [];
  for (const e of inSector) {
    if (e.str <= 0) continue;
    const l = Math.min(e.str, A.frac * e.str * Math.exp(A.sigma * r.normal() - A.sigma * A.sigma / 2));
    e.str -= l; total += l; hits.push({ unit: e.id, loss: l });
  }
  const right = r.u() < A.reportRight;
  const reported = right ? total : total > 0.3 ? (r.u() < 0.5 ? 0 : total * (2 + 2 * r.u())) : 1.5 + 3 * r.u();
  const friendly = [];
  for (const u of g.units) {
    if (u.side !== side || u.type !== 'recon' || u.broken || u.node !== node) continue;
    if (r.u() < A.friendlyHit) { const l = A.friendlyFrac * u.str; u.str -= l; friendly.push({ unit: u.id, loss: l }); }
  }
  const spotter = !g.rules.blind[side] ? g.units.find(u => u.side === side && u.type === 'recon' && !u.broken && u.str > 0 && u.node && NODE[u.node] && hops(u.node, node) === 1) : null;
  const reveal = [];
  if (spotter) for (const e of inSector) { g.seen[side].push(exact(e, g.t, { byFire: true })); reveal.push({ unit: e.id, type: e.type, hp: e.str0 ? e.str / e.str0 : 0 }); }
  const rec = { t: g.t, side, node, total, reported, right, spotter: spotter ? spotter.id : null, reveal, friendly, hits, n: inSector.filter(e => e.str0 > 0).length };
  g.fires.push(rec);
  return rec;
}

function deliver(g) {
  for (const o of g.orders) {
    if (o.done || o.cancelled || o.due > g.t) continue;
    o.done = true; o.at = g.t;
    const u = unit(g, o.unit);
    if (u.broken || u.node === 'gone' || u.node === 'off') continue;
    u.route = path(where(u), o.dest);
    g.events.push({ t: g.t, kind: 'order', unit: u.id, side: u.side, dest: o.dest, sent: o.t });
  }
}

/** Half an hour of the enemy's fire at the plain rate, for a unit breaking contact (DISENGAGE). */
function disengage(g, u, node) {
  const foes = eff(g, other(u.side), node), mine = eff(g, u.side, node);
  if (!foes.length) return 0;
  const share = u.str / Math.max(1e-9, sum(mine));
  const loss = Math.min(u.str, DISENGAGE * COMBAT.c * power(foes, null) * share);
  u.str -= loss;
  return loss;
}

const onGrid = u => !u.broken && !!NODE[u.node];

function move(g) {
  const contested = new Set(g.units.filter(u => onGrid(u) && u.str > 0 && eff(g, other(u.side), u.node).length).map(u => u.node));
  const leaving = g.units.filter(u => onGrid(u) && !u.seg && u.route.length && contested.has(u.node)).map(u => [u, u.node]);
  for (const [u, n] of leaving) { const l = disengage(g, u, n); if (l > 0) g.events.push({ t: g.t, kind: 'leave', unit: u.id, side: u.side, node: n, loss: l }); }
  for (const u of g.units) {
    if (u.broken || !(onGrid(u) || u.seg)) continue;
    if (!u.seg && u.route.length) {
      const next = u.route.shift();
      u.seg = { from: u.node, to: next, left: edgeHours(u.node, next) };
      u.node = null;
    }
    if (!u.seg) continue;
    u.seg.left -= 1;
    if (u.seg.left > 0) continue;
    u.from = u.seg.from; u.node = u.seg.to; u.seg = null; u.since = g.t + 1;
  }
  // A unit that arrives where the enemy is stops there and fights; the rest of its order is cancelled.
  for (const u of g.units) {
    if (!onGrid(u) || !u.route.length || !eff(g, other(u.side), u.node).length) continue;
    g.events.push({ t: g.t, kind: 'halt', unit: u.id, side: u.side, node: u.node, dest: u.route[u.route.length - 1] });
    u.route = [];
  }
}

const homeDist = (side, n) => (side === 'blue' ? hops(n, OBJ) : Math.min(...NORTH.map(m => hops(n, m))));

/** "Give ground": a unit ordered to give ground falls back one sector when a stronger enemy attacks it. */
function giveGround(g) {
  const nodes = new Set(g.units.filter(u => onGrid(u) && u.str > 0).map(u => u.node));
  for (const n of nodes) {
    for (const side of ['blue', 'red']) {
      const mine = eff(g, side, n), foes = eff(g, other(side), n);
      if (!mine.length || !foes.length || !mine.some(u => u.stance === 'give')) continue;
      const ms = Math.min(...mine.map(u => u.since)), fs = Math.min(...foes.map(u => u.since));
      if (!(fs === g.t + 1 && ms < fs)) continue;                    // the enemy is attacking us this hour
      if (power(foes, 'att') <= power(mine, null)) continue;          // only from a stronger enemy
      const d0 = homeDist(side, n);
      const opts = neighbours(n).filter(m => !eff(g, other(side), m).length && homeDist(side, m) < d0)
        .sort((a, b) => (eff(g, side, b).length ? 1 : 0) - (eff(g, side, a).length ? 1 : 0) || edgeHours(n, a) - edgeHours(n, b));
      if (!opts.length) continue;
      const to = opts[0];
      for (const u of mine.filter(x => x.stance === 'give')) {
        const loss = disengage(g, u, n);
        u.route = [];
        for (const o of g.orders) if (o.unit === u.id && !o.done) o.cancelled = true;
        const h = edgeHours(n, to);
        if (h <= 1) { u.from = n; u.node = to; u.since = g.t + 1; }
        else { u.node = null; u.seg = { from: n, to, left: h - 1 }; }
        g.events.push({ t: g.t, kind: 'give', unit: u.id, side, from: n, to, loss });
      }
    }
  }
}

function combat(g) {
  const nodes = new Set(g.units.filter(u => onGrid(u)).map(u => u.node));
  for (const n of nodes) {
    const b = eff(g, 'blue', n), r = eff(g, 'red', n);
    if (!b.length || !r.length) continue;
    g.fights.push({ node: n, units: [...b, ...r].map(u => u.id), ...fight(b, r, g.t, g.rCombat) });
  }
  for (const u of breaks(g.units)) {
    g.events.push({ t: g.t, kind: 'break', unit: u.id, side: u.side, node: u.node || u.seg?.to });
    u.route = []; u.seg = null; u.node = 'gone';
  }
}

/** Start of an hour: Red's arrivals, then each scripted side fires and gives its orders. */
function startHour(g) {
  arrivals(g);
  applyPolicy(g, 'red');
  applyPolicy(g, 'blue');
  g.snaps[g.t] = snap(g);
}

/** Play out the hour (after both sides have fired and given orders), then start the next one. */
export function advance(g) {
  if (g.over) return g;
  deliver(g);
  move(g);
  giveGround(g);
  combat(g);
  sight(g, 'blue', g.rSense.blue);
  sight(g, 'red', g.rSense.red);
  g.t += 1;
  const redX = sum(eff(g, 'red', OBJ)), blueX = sum(eff(g, 'blue', OBJ));
  if (redX > 0 && blueX === 0) g.over = { winner: 'red', h: g.t };
  else if (g.t >= GAME.hours) g.over = { winner: 'blue', h: g.t };
  if (g.over) { g.snaps[g.t] = snap(g); g.over = { ...g.over, ...score(g) }; g.events.push({ t: g.t, kind: 'over', winner: g.over.winner }); }
  else startHour(g);
  return g;
}

function snap(g) {
  return {
    t: g.t,
    units: g.units.map(u => ({ id: u.id, side: u.side, node: u.node, seg: u.seg ? { from: u.seg.from, to: u.seg.to } : null, str: u.str, broken: u.broken, stance: u.stance })),
  };
}

/** Final score: who won and what each side lost (artillery and decoys have no strength). */
export function score(g) {
  const loss = side => sideUnits(g, side).reduce((s, u) => s + (u.node === 'off' ? 0 : u.str0 - u.str), 0);
  const total = side => sideUnits(g, side).reduce((s, u) => s + u.str0, 0);
  return { lossB: loss('blue'), lossR: loss('red'), totB: total('blue'), totR: total('red') };
}

/** A side's picture now: 'fog' (its own sightings) or 'truth'. */
export const picture = (g, side, mode = 'fog') => (mode === 'truth' ? truthFor(g, side) : beliefAt(g, side, g.t));
export { beliefAt, truthFor, posOf, other };

/** Replay a logged human game (actions [{t, kind, unit, v}]) through hour n, with policies for AI sides. */
export function replay(opts, log, n = Infinity) {
  const g = newGame(opts);
  while (!g.over && g.t < n) {
    applyLog(g, log);
    advance(g);
  }
  if (!g.over) applyLog(g, log);
  return g;
}

function applyLog(g, log) {
  for (const a of log) {
    if (a.t !== g.t) continue;
    if (a.kind === 'o' || a.kind === 'e') issue(g, a.unit, a.v);
    else if (a.kind === 's') setStance(g, a.unit, a.v);
    else if (a.kind === 'f') setFire(g, unit(g, a.unit).side, a.v);
  }
}

/** Play a whole game with a policy on each side. */
export function play(opts) {
  const g = newGame(opts);
  while (!g.over) advance(g);
  return g;
}
