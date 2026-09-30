// Fog of Command: the game engine. Pure functions over a plain state object, no DOM, so the same code
// runs the game, the replays in the after-action review and the Monte Carlo balance script.
import { GAME, ORDER_DELAY, TYPES, COMBAT } from '../data/params.js';
import { makeRng, STREAM } from './rng.js';
import { makePlan, redUnits, redAct } from './red.js';
import { fight, breaks, sum } from './combat.js';
import { sense, beliefAt, truthNow } from './sense.js';
import { path, edgeHours } from './graph.js';

export const BLUE = [
  { id: 'a', key: '1', type: 'mech',  name: '1st Mech Bn', node: 'mw' },
  { id: 'b', key: '2', type: 'mech',  name: '2nd Mech Bn', node: 'mc' },
  { id: 'e', key: '3', type: 'mech',  name: '3rd Mech Bn', node: 'me' },
  { id: 'c', key: '4', type: 'recon', name: 'Recon Sqn',   node: 'nc' },
  { id: 'd', key: '5', type: 'armor', name: 'Armor Bn',    node: 'x' },
];

/** New game. opts: { seed, dice = 0, noDelay = false }. */
export function newGame({ seed, dice = 0, noDelay = false }) {
  const plan = makePlan(seed);
  const blue = BLUE.map(b => ({ ...b, side: 'blue', str: TYPES[b.type].str, str0: TYPES[b.type].str, since: -10, route: [], seg: null, broken: false }));
  const g = {
    seed, dice, noDelay, plan, t: 0, over: null,
    units: [...blue, ...redUnits(plan)],
    orders: [], drones: {}, reports: [], fights: [], events: [], snaps: [],
    rCombat: makeRng(seed, STREAM.combat, dice), rSense: makeRng(seed, STREAM.sense, dice),
  };
  // Hidden unit quality: part of the scenario (seed only), so every replay faces the same units.
  const rq = makeRng(seed, STREAM.quality);
  for (const u of g.units) u.q = Math.exp(COMBAT.quality * rq.normal());
  g.snaps.push(snap(g));
  return g;
}

export const unit = (g, id) => g.units.find(u => u.id === id);
export const blueUnits = g => g.units.filter(u => u.side === 'blue');

/** Delay for the i-th order: fixed by seed, dice and order index, so replays of the same orders match. */
export function orderDelay(g, i) {
  if (g.noDelay) return 0;
  const r = makeRng(g.seed, STREAM.orders + 10 * (i + 1), g.dice);
  return ORDER_DELAY[r.pick(ORDER_DELAY.map(d => d[1]))][0];
}

/** Send an order at the current hour. A newer order to the same unit replaces one still in transit. */
export function issue(g, id, dest) {
  const u = unit(g, id);
  if (!u || u.broken || g.over) return null;
  const replaced = [];
  for (const o of g.orders) if (o.unit === id && !o.done && !o.cancelled) { o.cancelled = true; replaced.push(o.i); }
  const i = g.orders.length, d = orderDelay(g, i);
  const o = { i, t: g.t, unit: id, dest, d, due: g.t + d, done: false, cancelled: false, replaced };
  g.orders.push(o);
  return o;
}

/** Withdraw the last order sent this hour (it has not left headquarters yet). */
export function undoLast(g) {
  const o = g.orders[g.orders.length - 1];
  if (!o || o.t !== g.t) return null;
  g.orders.pop();
  for (const i of o.replaced) g.orders[i].cancelled = false;
  return o;
}

export const setDrone = (g, node) => { if (node) g.drones[g.t] = node; else delete g.drones[g.t]; };

const where = u => u.node || (u.seg && u.seg.to);
const eff = (g, side, node) => g.units.filter(u => u.side === side && !u.broken && u.node === node && u.str > 0);

function deliver(g) {
  for (const o of g.orders) {
    if (o.done || o.cancelled || o.due > g.t) continue;
    o.done = true; o.at = g.t;
    const u = unit(g, o.unit);
    if (u.broken) continue;
    const from = where(u);
    u.route = path(from, o.dest);
    g.events.push({ t: g.t, kind: 'order', unit: u.id, dest: o.dest, sent: o.t });
  }
}

function move(g) {
  for (const u of g.units) {
    if (u.broken || u.node === 'off' || u.node === 'gone' || u.node === 'rear') continue;
    if (!u.seg && u.route.length) {
      const next = u.route.shift();
      u.seg = { from: u.node, to: next, left: edgeHours(u.node, next) };
      u.node = null;
    }
    if (!u.seg) continue;
    u.seg.left -= 1;
    if (u.seg.left > 0) continue;
    u.node = u.seg.to; u.seg = null; u.since = g.t + 1;
    const enemy = eff(g, u.side === 'blue' ? 'red' : 'blue', u.node);
    if (enemy.length) u.route = [];
  }
}

function combat(g) {
  const engaged = new Set();
  const nodes = new Set(g.units.filter(u => u.node && !u.broken).map(u => u.node));
  for (const n of nodes) {
    const b = eff(g, 'blue', n), r = eff(g, 'red', n);
    if (!b.length || !r.length) continue;
    engaged.add(n);
    g.fights.push({ node: n, ...fight(b, r, g.t, g.rCombat) });
  }
  for (const u of breaks(g.units)) {
    g.events.push({ t: g.t, kind: 'break', unit: u.id, side: u.side, node: u.node || u.seg?.to });
    u.route = []; u.seg = null; u.node = u.side === 'blue' ? 'rear' : 'gone';
  }
  return engaged;
}

/** Play one hour. */
export function advance(g) {
  if (g.over) return g;
  deliver(g);
  redAct(g);
  move(g);
  const engaged = combat(g);
  sense(g, g.drones[g.t] || null, engaged, g.rSense);
  g.t += 1;
  const redX = sum(eff(g, 'red', 'x')), blueX = sum(eff(g, 'blue', 'x'));
  if (redX > 0 && blueX === 0) g.over = { kind: 'lost', h: g.t };
  else if (g.t >= GAME.hours) g.over = { kind: 'held', h: g.t };
  g.snaps.push(snap(g));
  if (g.over) g.over = { ...g.over, ...score(g) };
  return g;
}

function snap(g) {
  return {
    t: g.t,
    units: g.units.map(u => ({ id: u.id, node: u.node, seg: u.seg ? { from: u.seg.from, to: u.seg.to } : null, str: u.str, broken: u.broken })),
    truth: truthNow(g),
  };
}

/** Final score: did Blue hold, what did each side lose, which line sectors did Red end up holding. */
export function score(g) {
  const lossB = blueUnits(g).reduce((s, u) => s + (u.str0 - u.str), 0);
  const reds = g.units.filter(u => u.side === 'red' && u.type !== 'decoy');
  const lossR = reds.reduce((s, u) => s + (u.str0 - u.str), 0);
  const redLine = ['mw', 'mc', 'me'].filter(n => eff(g, 'red', n).length && !eff(g, 'blue', n).length);
  return { lossB, lossR, redLine, held: g.over?.kind !== 'lost' };
}

export const belief = (g, T = g.t) => beliefAt(g, T);
export const truth = g => truthNow(g);

/** Replay a logged game: orders [{t, unit, dest}] and drones {t: node}, through hour n. */
export function replay({ seed, dice = 0, noDelay = false }, orders, drones, n = Infinity) {
  const g = newGame({ seed, dice, noDelay });
  while (!g.over && g.t < n) {
    for (const o of orders) if (o.t === g.t) issue(g, o.unit, o.dest);
    if (drones[g.t]) setDrone(g, drones[g.t]);
    advance(g);
  }
  return g;
}

/** Play a whole game with a policy(g) -> { orders: [[unit, dest]], drone }. */
export function play(opts, policy) {
  const g = newGame(opts);
  while (!g.over) {
    const act = policy(g) || {};
    for (const [u, d] of act.orders || []) issue(g, u, d);
    if (act.drone) setDrone(g, act.drone);
    advance(g);
  }
  return g;
}
