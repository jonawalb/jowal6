// Game engine: one hunt, played in turns of two hours. Each turn you get effort points and may queue
// several actions (buoy lines and circles, an aircraft box, helicopter dips, a ship order, attacks);
// "End turn" resolves any attacks, then runs two hours of movement and listening. Deterministic given
// (seed, practice behaviour, action log), which is what makes a hunt shareable from the URL.
import { GAME, SENSORS, DATUM_BOX, ACTIONS } from '../data/params.js';
import { makeRng, STREAM } from './rng.js';
import { spawn, stepSub, alert } from './sub.js';
import { makeAsset, activeAt, rollContacts, lineHeading } from './sensors.js';
import { createFilter, predict, update, missed, maybeResample, pOut, pWithin, heat, smooth, centre, bestShot, behOdds } from './filter.js';
import { dist, bearing, sail, isLand, BOX } from './geo.js';

const R2 = x => Math.round(x * 100) / 100;
export const CODE = { line: 'l', circle: 'c', air: 'a', helo: 'h', move: 'm', dash: 'd', attack: 'x' };
export const TYPE = Object.fromEntries(Object.entries(CODE).map(([k, v]) => [v, k]));
const PREFIX = { line: 'L', circle: 'C', air: 'A', helo: 'H' };

function pickDatum(rng) {
  for (let k = 0; k < 500; k++) {
    const p = [DATUM_BOX.lon0 + rng.u() * (DATUM_BOX.lon1 - DATUM_BOX.lon0), DATUM_BOX.lat0 + rng.u() * (DATUM_BOX.lat1 - DATUM_BOX.lat0)];
    if (!isLand(p[0], p[1])) return p.map(R2);
  }
  return [-7.5, 65.0];
}

export function newGame({ seed, beh = 'any', particles = GAME.particles }) {
  const rs = { sub: makeRng(seed, STREAM.sub), det: makeRng(seed, STREAM.detect), fa: makeRng(seed, STREAM.falseAlarm),
    setup: makeRng(seed, STREAM.setup) };
  const datum = pickDatum(rs.setup);
  const sub = spawn(rs.sub, beh, datum, GAME.datumR);
  for (let k = 0; k < GAME.reportAge; k++) stepSub(sub, rs.sub, []);
  const start = SENSORS.ship.start.slice();
  const g = {
    seed, beh, datum, rs, sub, turn: 0, over: null, nextId: 1, count: { line: 0, circle: 0, air: 0, helo: 0 },
    effort: GAME.effort, buoys: GAME.buoyLoads, torps: GAME.torpedoes,
    assets: [], contacts: [], log: [], events: [], attacks: [],
    ship: { p: start, track: [start.slice()], deaf: [false] },
    subTrack: [{ p: [sub.lon, sub.lat], prev: [sub.lon, sub.lat], sprint: false, speed: 0, mode: 'start', wp: 0 }],
    filter: createFilter(makeRng(seed, STREAM.filter), particles, beh, datum, GAME.datumR),
    snaps: [],
  };
  for (let k = 0; k < GAME.reportAge; k++) predict(g.filter, []); // the report is already this many hours old
  g.snaps.push(snapshot(g, 0));
  return g;
}

export const hourOf = g => g.turn * GAME.turnHours;
export const thisTurn = g => g.log.filter(e => e.t === g.turn);
export const spent = g => thisTurn(g).reduce((s, e) => s + ACTIONS[TYPE[e.k]].cost, 0);
export const effortLeft = g => g.effort - spent(g);
export const shipOrder = g => thisTurn(g).find(e => e.k === 'm' || e.k === 'd') || null;
export const lastSnap = g => g.snaps[g.snaps.length - 1];

function snapshot(g, h) {
  const f = g.filter, truth = [g.sub.lon, g.sub.lat];
  const hm = smooth(heat(f));
  const recent = g.contacts.filter(c => c.p && c.h >= h - 2).map(c => c.p);
  return { h, heat: hm, pOut: pOut(f), truth, out: g.sub.out, near: pWithin(f, truth, 20), beh: behOdds(f),
    best: bestShot(f, hm, GAME.prosR, recent), ship: g.ship.p.slice() };
}

/**
 * Can this action be queued at p now? Returns '' if yes, or a plain reason.
 * Ship orders replace this turn's earlier ship order, so they are checked net of it.
 */
export function why(g, type, p) {
  if (g.over) return 'The hunt is over.';
  const a = ACTIONS[type];
  if (p && (isLand(p[0], p[1]) || !inBox(p))) return 'That is land. Pick a point at sea.';
  const old = (type === 'move' || type === 'dash') && shipOrder(g) ? ACTIONS[TYPE[shipOrder(g).k]].cost : 0;
  if (a.cost > effortLeft(g) + old) return `Not enough effort: ${a.name} costs ${a.cost} and you have ${effortLeft(g)} left this turn.`;
  if (a.stock === 'buoys' && g.buoys <= 0) return 'No buoy patterns left.';
  if (a.stock === 'torps' && g.torps - thisTurn(g).filter(e => e.k === 'x').length <= 0) return 'No attacks left.';
  if (type === 'helo' && p && dist(p, g.ship.p) > SENSORS.helo.range) return `Too far: the helicopter works within ${SENSORS.helo.range} nm of the ship.`;
  return '';
}

/**
 * Queue an action. For a buoy line, ang is the compass heading of its axis in degrees (90 = east–west, the
 * default); the page offers the 8 axes 22.5° apart. Returns the new asset/order, or null.
 */
export function place(g, type, p, ang = 90) {
  if (why(g, type, p)) return null;
  p = p.map(R2);
  const e = { t: g.turn, k: CODE[type], p };
  if (type === 'line') e.a = lineHeading(ang);
  if (type === 'move' || type === 'dash') {
    const old = shipOrder(g);
    if (old) g.log.splice(g.log.indexOf(old), 1);
    const cap = type === 'dash' ? SENSORS.ship.sprint : SENSORS.ship.speed;
    const d = Math.min(dist(g.ship.p, p), cap * GAME.turnHours);
    e.dest = d < 0.5 ? g.ship.p.slice() : sail(g.ship.p, bearing(g.ship.p, p), d).slice(0, 2).map(R2);
    g.log.push(e);
    return e;
  }
  if (type === 'attack') { g.log.push(e); return e; }
  const a = makeAsset(type, p, hourOf(g), g.nextId++, type === 'line' ? e.a : 0);
  g.count[type] += 1;
  a.name = `${PREFIX[type]}${g.count[type]}`;
  if (ACTIONS[type].stock === 'buoys') g.buoys -= 1;
  e.id = a.id;
  g.assets.push(a);
  g.log.push(e);
  return a;
}

/** Undo the last action queued this turn. */
export function undo(g) {
  const last = g.log[g.log.length - 1];
  if (g.over || !last || last.t !== g.turn) return null;
  g.log.pop();
  if (last.id) {
    const a = g.assets.pop();
    g.count[a.type] -= 1;
    g.nextId -= 1;
    if (ACTIONS[a.type].stock === 'buoys') g.buoys += 1;
  }
  return last;
}

/** Move the ship one hour along this turn's order. Returns [from, to, deaf]. */
function moveShip(g, order) {
  const a = g.ship.p;
  if (!order) return [a, a, false];
  const deaf = order.k === 'd', v = deaf ? SENSORS.ship.sprint : SENSORS.ship.speed, d = dist(a, order.dest);
  if (d > 0.5) g.ship.p = sail(a, bearing(a, order.dest), Math.min(v, d)).slice(0, 2);
  return [a, g.ship.p, deaf];
}

function advanceHour(g, h, order, ev) {
  const dips = g.assets.filter(a => a.type === 'helo' && activeAt(a, h));
  const threats = [{ p: g.ship.p }, ...dips.map(a => ({ p: a.p }))];
  stepSub(g.sub, g.rs.sub, threats);
  predict(g.filter, threats);
  const [s0, s1, deaf] = moveShip(g, order);
  g.ship.track.push(g.ship.p.slice());
  g.ship.deaf.push(deaf);
  const t = g.sub;
  g.subTrack.push({ p: [t.lon, t.lat], prev: [t.plon, t.plat], sprint: t.sprint, speed: t.speed, mode: t.mode, wp: t.wp });
  const working = [...g.assets.filter(a => activeAt(a, h)), { id: 0, type: 'ship', name: 'Ship', seg: [s0, s1], deaf }, { id: -1, type: 'net', name: 'Network' }];
  const obs = [];
  for (const a of working) {
    const cs = rollContacts(a, g.sub, h, g.rs.det, g.rs.fa);
    cs.forEach(c => { c.by = a.name; c.n = g.contacts.length + 1; g.contacts.push(c); });
    obs.push({ asset: a, contacts: cs });
    ev.contacts.push(...cs);
    if (a.type !== 'net' && !(a.type === 'ship' && deaf)) ev.heard[a.name] = (ev.heard[a.name] || 0) + cs.length;
  }
  update(g.filter, obs);
  maybeResample(g.filter);
  g.snaps.push(snapshot(g, h));
  if (g.sub.out) g.over = { kind: 'escaped', h };
}

/** Resolve this turn: attacks first, then two hours of movement and listening. Returns the turn's events. */
export function endTurn(g) {
  if (g.over) return null;
  const h0 = hourOf(g), before = lastSnap(g).best.v, c0 = centre(g.filter);
  const ev = { turn: g.turn, h0, h1: h0 + GAME.turnHours, attacks: [], contacts: [], heard: {}, before, after: before, shift: null, bolted: false };
  const acts = thisTurn(g);
  for (const e of acts.filter(x => x.k === 'x')) {
    g.torps -= 1;
    const d = dist(e.p, [g.sub.lon, g.sub.lat]), pBelief = pWithin(g.filter, e.p, GAME.prosR);
    const hit = d <= GAME.prosR;
    ev.attacks.push({ p: e.p, d, hit, pBelief });
    g.attacks.push({ h: h0, p: e.p, d, hit, pBelief });
    if (hit) { g.over = { kind: 'found', p: e.p, d, pBelief, h: h0 }; g.turn += 1; break; }
    if (alert(g.sub, e.p, GAME.alertR)) ev.bolted = true;
    missed(g.filter, e.p, GAME.prosR, GAME.alertR);
  }
  if (!g.over) {
    const order = shipOrder(g);
    for (let k = 1; k <= GAME.turnHours && !g.over; k++) advanceHour(g, h0 + k, order, ev);
    const unspent = effortLeft(g);
    g.turn += 1;
    g.effort = Math.min(GAME.bank, unspent + GAME.effort);
    if (!g.over && g.turn >= GAME.turns) g.over = { kind: 'timeout', h: hourOf(g) };
  }
  const c1 = centre(g.filter);
  ev.after = lastSnap(g).best.v;
  ev.shift = c0 && c1 ? { nm: dist(c0, c1), brg: bearing(c0, c1) } : null;
  ev.torpsLeft = g.torps;
  g.events.push(ev);
  return ev;
}

/** Rebuild a hunt from its log: queue each turn's actions, then end the turn, for n turns. */
export function replay(opts, log, n) {
  const g = newGame(opts);
  for (let t = 0; t <= n && !g.over; t++) {
    for (const e of log.filter(x => x.t === t)) place(g, TYPE[e.k], e.p, e.a ?? 90);
    if (t < n && !g.over) endTurn(g);
  }
  return g;
}

export const inBox = p => p[0] > BOX[0] && p[0] < BOX[2] && p[1] > BOX[1] && p[1] < BOX[3];
