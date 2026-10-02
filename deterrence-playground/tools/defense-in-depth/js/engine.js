// Defense in Depth: the game engine. Pure functions over a plain state object, no DOM, so the same code runs
// the game, the replays in the review, the campaign's micro-battles and the Monte Carlo scripts (the Fog of
// Command architecture). Either side can be the player (actions logged in g.log via issue()) or a scripted
// commander: a policy function policy(g, side, phase) -> { missions, actions }, optionally with policy.plan(g, side).
//
// State g (SPEC §10.2; see also js/telemetry.js): { v, seed, dice, scale, era, mode, diff, od, t, turns, over,
//   phase: 'plan' | 'battle', cols, rows, att: 'att', def: 'def', sectors: { terrain, elev, name, feat, ridge, stream },
//   units: [{ id, side, type, name, role, fmn: [path], sec, str, str0, q, posture, formation, stance, facing, coh,
//   supp, pair, lane, laneCells, trained, prog, path, dest, mode, broken, ... }], fmns, ix, ctrl, contest, lodg,
//   orders, missions, cstrokes, log, events, seen: { def, att }, snaps, ammo, barrage, telemetry, ... }
import { BIDDLE, FIRE, SUPP, COHESION, BREAK, TANK, CARDS, CLOCK, OFFDEF } from '../data/params.js';
import { SCALES, turnsFor } from '../data/scales.js';
import { ERAS } from '../data/eras.js';
import { TYPES } from '../data/units.js';
import { makeRng, STREAM } from './rng.js';
import { gridFor, FWD } from './grid.js';
import { mapgen } from './mapgen.js';
import { buildForces, reindex, fighting, alive, isCompany, isBattery, other, knows } from './forces.js';
import { directFire, computeCover, exposure, geometry, deadGround, leth } from './fire.js';
import { firePhase, preparation, underGuns } from './arty.js';
import { moveAll, goToGround, breachWork, inContact } from './move.js';
import { resolveAssaults, updateCtrl, stallGauge } from './assault.js';
import { counterMoves, updateLodgments, fixedBy, raceClock as race, CS_ROLES } from './counter.js';
import { modernPhase, jamAreas } from './modern.js';
import { sight, picture, startKnowledge, refreshBelief, observe } from './vision.js';
import { issue as issueOrder, deliver, initiative } from './orders.js';
import { objectiveStatus, checkVictory } from './victory.js';
import { newTelemetry, recordHour, layoutSummary, endSummary } from './telemetry.js';
import { applyDefPlan, defaultDefPlan, checkDef } from './plan-def.js';
import { applyAttPlan, defaultAttPlan, checkAtt, hHourOrders } from './plan-att.js';
import { standingOrders, standingDefaults } from './ai/standing.js';

const ERA = { w: 'w', m: 'm', ww1: 'w', modern: 'm' }, MODE = { s: 's', c: 'c', single: 's', campaign: 'c' };
const SIDES = ['def', 'att'];

/**
 * New game. opts: { seed, dice = 0, scale = 'd', era = 'w', mode = 's', diff = 's', od = 5, players: { def, att },
 * plans: { def, att }, doctrine: { def, att } (card -> 0..1, or a function unit -> trained), campaign: { ctx },
 * noDelay, telemetry = true, standing: true | { def, att } (W3: standing orders for a human side, js/ai/standing.js) }. A null player is the human. With both plans known the battle starts at once;
 * otherwise g.phase is 'plan' until applyPlan() has been called for the missing side(s).
 */
export function newGame(opts = {}) {
  const scale = SCALES[opts.scale] ? opts.scale : 'd', era = ERA[opts.era] || 'w', S = SCALES[scale], G = gridFor(scale);
  const seed = Math.max(1, Math.round(opts.seed || 1)), dice = opts.dice || 0;
  const ctx = { ...((opts.campaign && opts.campaign.ctx) || opts.ctx || {}) };   // a copy: never mutate a campaign template
  const mk = () => ({ def: new Uint8Array(G.n), att: new Uint8Array(G.n) });
  const mkI = () => ({ def: new Int16Array(G.n).fill(-99), att: new Int16Array(G.n).fill(-99) });
  const sectors = mapgen(scale, seed, { broken: ctx.broken === 'more' ? 0.3 : 0, corridor: !!ctx.corridor,
    freeTrench: ctx.defTrenchRows ? range(ctx.defTrenchRows[0], ctx.defTrenchRows[1]) : null });
  const d = buildForces(scale, era, 'def'), a = buildForces(scale, era, 'att');
  const g = {
    v: 1, seed, dice, scale, era, mode: MODE[opts.mode] || 's', diff: opts.diff || 's', od: opts.od ?? OFFDEF.standard,
    t: 0, turns: turnsFor(S, era), over: null, phase: 'plan', cols: G.cols, rows: G.rows, att: 'att', def: 'def', ctx,
    players: { def: (opts.players && opts.players.def) || null, att: (opts.players && opts.players.att) || null },
    sectors, units: [...d.units, ...a.units], fmns: { ...d.fmns, ...a.fmns }, tops: { def: d.top, att: a.top }, ix: {},
    ctrl: new Int8Array(G.n), contest: {}, lodg: {}, lodgEver: {}, taken: {}, known: { att: new Uint8Array(G.n) },
    scouted: new Uint8Array(G.n), dummyWatch: {}, coverDirs: mk(), laneHit: mk(), obs: mk(), spot: mk(),
    beliefSec: { def: new Float32Array(G.n), att: new Float32Array(G.n) }, exactNow: { def: new Set(), att: new Set() },
    droneSeen: mkI(), droneRecon: mkI(), airSeen: mkI(), airUp: {}, airCount: { def: {}, att: {} }, jammed: mk(),
    gas: new Uint8Array(G.n), gasAge: new Uint8Array(G.n), smokeNow: new Uint8Array(G.n), destroyRun: {},
    missions: [], orders: [], cstrokes: [], sorties: [], log: [], events: [], snaps: [], seen: { def: [], att: [] },
    ammo: { ...S.ammo[era] }, precision: { def: 0, att: 0 }, barrage: null, barHist: {}, deepHist: [], plans: {},
    noDelay: !!opts.noDelay, noTelemetry: opts.telemetry === false, dark: [],
    standing: { def: null, att: null },
  };
  // Standing orders (W3) for a human side: opts.standing true (every order on) or { def, att } switch objects.
  if (opts.standing) for (const side of SIDES) {
    if (g.players[side]) continue;
    const want = opts.standing === true ? true : opts.standing[side];
    if (want) g.standing[side] = { ...standingDefaults(side), ...(want === true ? {} : want) };
  }
  if (ctx.attAmmo) g.ammo.att = Math.round(g.ammo.att * ctx.attAmmo);
  if (ERAS[era].precision) g.precision = { def: 8, att: 8 };
  for (let t = 0; t <= g.turns; t++) {
    const h = (CLOCK.start + t) % 24;
    g.dark[t] = h >= CLOCK.nightFrom || h < CLOCK.nightTo || !!(ctx.fogHours && t >= ctx.fogHours[0] && t <= ctx.fogHours[1]);
  }
  for (let s = 0; s < G.n; s++) g.ctrl[s] = G.row[s] <= S.bands.assembly[1] ? 2 : G.row[s] >= S.bands.outpost[0] ? 1 : 0;
  const rq = makeRng(seed, STREAM.quality);
  for (const u of g.units) initUnit(g, u, rq, opts.doctrine);
  applyCtx(g, ctx);
  g.rng = Object.fromEntries(['combat', 'fire', 'senseDef', 'senseAtt', 'move', 'assault', 'modern', 'initiative', 'planAi'].map(k => [k, makeRng(seed, STREAM[k], dice)]));
  g.telemetry = newTelemetry(g);
  index(g);
  for (const side of SIDES) {
    const p = g.players[side];
    const plan = opts.plans && opts.plans[side] ? opts.plans[side] : p ? (p.plan ? p.plan(g, side, g.rng.planAi) : side === 'def' ? defaultDefPlan(g) : defaultAttPlan(g)) : null;
    if (plan) applyPlan(g, side, plan);
  }
  return g;
}

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function initUnit(g, u, rq, doctrine) {
  const T = TYPES[u.type];
  Object.assign(u, {
    sec: -1, q: Math.exp(FIRE.quality * rq.normal()), posture: u.side === 'att' ? 'rush' : 'hold', formation: 'waves',
    stance: u.side === 'att' ? 'elastic' : 'hold', facing: FWD[u.side], coh: COHESION.start, supp: 0, _ps: 1, pair: null, lane: null,
    laneCells: null, prog: 0, path: [], dest: null, mode: 'normal', broken: false, staticH: 0, gain: 0, lossH: 0,
    inc: { fr: 0, fl: 0, ar: 0, dr: 0 }, arrive: null, X: 0,
  });
  const doc = doctrine && doctrine[u.side];
  u.trained = typeof doc === 'function' ? doc(u) : doc ? { ...doc } : g.mode === 's' ? Object.fromEntries(CARDS.map(c => [c, 1])) : {};
  if (T.cat === 'bat') u.str = u.str0 = 0;
}

/** Campaign context modifiers (data/campaign.js ctx; SPEC §6.1). */
function applyCtx(g, ctx) {
  const drop = ids => { g.units = g.units.filter(u => !ids.has(u.id)); };
  if (ctx.tanks === false) drop(new Set(g.units.filter(u => u.side === 'att' && u.type === 'tank').map(u => u.id)));
  if (ctx.attStorm != null) drop(new Set(g.units.filter(u => u.side === 'att' && u.type === 'storm').slice(ctx.attStorm).map(u => u.id)));
  if (ctx.attFormation) for (const u of g.units) if (u.side === 'att') u.formation = ctx.attFormation;
  if (ctx.counterstrokeArrives != null) for (const u of g.units) if (u.side === 'def' && CS_ROLES.has(u.role)) u.arrive = ctx.counterstrokeArrives;
  if (ctx.attOrderDelay) g.ctx.orderDelay = { ...(g.ctx.orderDelay || {}), att: ctx.attOrderDelay };
  if (ctx.pulverized) { const r = makeRng(g.seed, 77); ctx.pulverizedCol = r.int(g.cols); }
}

/** Rebuild the id -> index map and formation unit lists (call if g.units was edited, e.g. campaign doctrine). */
export function index(g) {
  g.ix = {};
  g.units.forEach((u, i) => { g.ix[u.id] = i; });
  for (const f of Object.values(g.fmns)) f.units = f.units.filter(id => g.ix[id] != null);
  reindex(g);
}

/** Apply a side's plan (SPEC §1.2). Returns the plan checklist. Starts the battle once both sides have plans. */
export function applyPlan(g, side, plan) {
  if (g.phase !== 'plan') return [];
  index(g);
  if (side === 'def') applyDefPlan(g, plan); else applyAttPlan(g, plan);
  g.plans[side] = plan;
  const list = side === 'def' ? checkDef(g, plan) : checkAtt(g, plan);
  if (g.plans.def && g.plans.att) begin(g);
  return list;
}

/** H-hour: fill any unplaced unit from the default plan, apply the preparation, first sightings, first hour. */
function begin(g) {
  index(g);
  for (const side of SIDES) {
    if (!g.units.some(u => u.side === side && u.sec < 0 && u.arrive == null && !isBattery(u) || u.side === side && u.sec < 0 && isBattery(u) && side === 'def')) continue;
    const dp = side === 'def' ? defaultDefPlan(g) : defaultAttPlan(g);
    for (const u of g.units) if (u.side === side && u.sec < 0 && u.arrive == null && dp.place[u.id] != null && !(side === 'att' && isBattery(u))) u.sec = dp.place[u.id];
  }
  if (g.ctx.pulverized && g.ctx.pulverizedCol != null) {
    const G = gridFor(g.scale);
    for (const u of g.units) if (u.side === 'def' && u.sec >= 0 && G.col[u.sec] === g.ctx.pulverizedCol && G.row[u.sec] <= SCALES[g.scale].obj.row) u.str = u.str0 * (g.ctx.pulverizedStr ?? 0.4);
    for (let r = 0; r < G.rows; r++) g.sectors.feat.obst[G.idx(r, g.ctx.pulverizedCol)] = 0;
  }
  for (const u of g.units) if (u.arrive != null && u.arrive > 0) u.sec = -1;
  g.phase = 'battle';
  reindex(g);
  startKnowledge(g);
  covers(g);
  preparation(g, g.plans.att || {});
  g.telemetry.meta.prep = g.prep ? g.prep.kind : 'none';
  layoutSummary(g);
  hHourOrders(g, g.plans.att || {});
  g.t = -1;
  for (const side of SIDES) { observe(g, side); sight(g, side, side === 'def' ? g.rng.senseDef : g.rng.senseAtt); }
  g.t = 0;
  startHour(g);
}

function covers(g) {
  for (const side of SIDES) computeCover(g, side);
  g.coverDirty = false;
}

/** Start of an hour: arrivals, standing plans, jamming, initiative, then each scripted side fires and orders. */
function startHour(g) {
  const G = gridFor(g.scale), S = SCALES[g.scale];
  for (const u of g.units) {
    if (u.arrive !== g.t || u.sec >= 0 || u.broken) continue;
    const row = u.side === 'def' ? G.rows - 1 : 0, cols = [...Array(G.cols).keys()].sort((a, b) => Math.abs(a - G.cols / 2) - Math.abs(b - G.cols / 2));
    const c = cols.find(cc => g.occ[G.idx(row, cc)].filter(isCompany).length < 4) ?? 0;
    u.sec = G.idx(row, c); g.occ[u.sec].push(u);
    g.events.push({ t: g.t, kind: 'arrive', side: u.side, unit: u.id, sec: u.sec, vis: [u.side] });
  }
  for (const [fid, r] of Object.entries(g.reserves || {})) {
    if (r.mode !== 'follow' || r.hour !== g.t || !g.fmns[fid]) continue;
    let best = -1, col = Math.floor(G.cols / 2);
    for (const u of g.units) if (u.side === 'att' && fighting(u) && G.row[u.sec] > best) { best = G.row[u.sec]; col = G.col[u.sec]; }
    issueOrder(g, { kind: 'fmn', fmn: fid, order: { kind: 'attack', to: G.idx(S.obj.row, col), width: 1 } }, { log: false });
  }
  g.airUp = {};
  jamAreas(g);
  if (g.mode === 'c' || g.ctx.initiative) initiative(g, g.rng.initiative);
  for (const side of ['att', 'def']) {
    const p = g.players[side];
    if (!p) { for (const a of standingOrders(g, side)) issueOrder(g, a, { log: false }); continue; }
    const res = p(g, side, 'hour') || {};
    for (const m of res.missions || []) issueOrder(g, { kind: 'fire', ...m }, { log: false });
    for (const a of res.actions || []) issueOrder(g, a, { log: false });
  }
  g.snaps[g.t] = snap(g);
}

/** Issue a player's action (logged). Keeps an hour-start copy so undoLast() can roll back. */
export function issue(g, action, opts = {}) {
  if (g.phase === 'battle' && opts.log !== false && (!g._hs || g._hs.t !== g.t)) g._hs = hourCopy(g);
  return issueOrder(g, action, opts);
}

const HOUR_KEYS = ['units', 'orders', 'missions', 'cstrokes', 'sorties', 'preOrders', 'barrage', 'fplans', 'biteRow', 'airSeen', 'airUp', 'airCount', 'coverDirty', 'standing'];
function hourCopy(g) {
  const o = { t: g.t, logLen: g.log.length };
  for (const k of HOUR_KEYS) o[k] = g[k] === undefined ? undefined : structuredClone(g[k]);
  return o;
}

/** Withdraw the last action logged this hour (restores the hour-start copy and re-issues the rest). */
export function undoLast(g) {
  const hs = g._hs;
  if (!hs || hs.t !== g.t || g.log.length <= hs.logLen) return null;
  const mine = g.log.slice(hs.logLen), last = mine.pop();
  for (const k of HOUR_KEYS) g[k] = hs[k] === undefined ? undefined : structuredClone(hs[k]);
  g.log.length = hs.logLen;
  index(g);
  for (const a of mine) issueOrder(g, a);
  return last;
}

/** Play out the hour (SPEC §3.1), then start the next one. */
export function advance(g) {
  if (g.over || g.phase !== 'battle') return g;
  const G = gridFor(g.scale), R = g.rng;
  for (const u of g.units) {
    u._ps = 1; u.lossH = 0; u.inc = { fr: 0, fl: 0, ar: 0, dr: 0 }; u.moving = false; u.held = false; u.gain = 0; u.fired = false;
    u.stalled = !!g.contest[u.sec] && g.contest[u.sec].by === u.side && u.wasStalled; u.wasStalled = false;
    u.yld = false; u.bc = null; u.gtg = false; u.ex = false; u.roadObs = false; u.imp = u.impT === g.t; u.steps = 0;
  }
  g.smokeNow.fill(0);
  reindex(g);
  firePhase(g, R.fire);
  modernPhase(g, R.modern);
  deliver(g);
  if (g.coverDirty) covers(g);
  counterMoves(g);
  moveAll(g, R.move);
  for (const u of g.units) { u.supp = Math.min(SUPP.cap, 1 - (u._ps ?? 1)); }
  for (const u of g.units) if (alive(u) && u.sec >= 0) u.X = exposure(g, u);
  covers(g);
  directFire(g, R.combat);
  resolveAssaults(g, R.assault);
  updateCtrl(g);
  afterAction(g);
  sight(g, 'def', R.senseDef);
  sight(g, 'att', R.senseAtt);
  recordHour(g);
  let deep = 0;
  for (const u of g.units) if (u.side === 'att' && fighting(u)) deep = Math.max(deep, G.row[u.sec]);
  g.deepHist[g.t] = deep;
  g.t += 1;
  checkVictory(g);
  if (g.over) {
    g.snaps[g.t] = snap(g);
    endSummary(g);
    g.events.push({ t: g.t, kind: 'over', side: g.over.winner, winner: g.over.winner, vis: ['def', 'att'] });
  } else startHour(g);
  return g;
}

/** After-action (SPEC §3.1 step 7): breaks, go to ground, cohesion, fixing, lodgments, breakthrough, decay. */
function afterAction(g) {
  const G = gridFor(g.scale), S = SCALES[g.scale];
  for (const u of g.units) {
    if (u.broken || !isCompany(u) || u.sec < 0 || u.str0 <= 0) continue;
    if (u.str < BREAK.frac * u.str0) {
      u.broken = true; u.path = []; u.pair = null;
      const seen = g.occ[u.sec].some(v => v.side !== u.side) || G.nbrs[u.sec].some(c => g.occ[c].some(v => v.side !== u.side && fighting(v)));
      g.events.push({ t: g.t, kind: 'break', side: u.side, unit: u.id, sec: u.sec, vis: seen ? ['def', 'att'] : [u.side] });
    }
  }
  for (const u of g.units) if (u.stalled) u.wasStalled = true;
  goToGround(g, g.rng.move);
  for (const u of g.units) {
    if (!fighting(u)) continue;
    const contact = inContact(g, u);
    if (u.side === 'att') {
      let dc = 0;
      const beyond = Math.max(0, Math.min(u.gain, G.row[u.sec] - S.bands.nml[1]));
      dc -= COHESION.perRow * beyond;
      if (!underGuns(g, 'att', u.sec)) dc -= COHESION.outsideGuns;
      if (contact) dc -= COHESION.contact;
      if (!contact || u.posture === 'consolidate') dc += COHESION.recover;
      u.coh = Math.max(COHESION.floor, Math.min(1, (u.coh ?? 1) + dc));
    }
    u.fixed = fixedBy(g, u, BIDDLE.k3);
    u.staticH = u.moving ? 0 : (u.staticH || 0) + 1;
    if (u.posture === 'infil' && u.stealth === false && !contact) { u.outH = (u.outH || 0) + 1; if (u.outH >= 1) { u.stealth = !!(TYPES[u.type].stealth || knows(u, 'AT2')); u.outH = 0; } }
    if (u.type === 'tank') {
      if (contact) u.actH = (u.actH || 0) + 1;
      const p = g.ctx.tankBreakdown ?? TANK.breakdown;
      if (ERAS[g.era].tankBreakdown && u.moving && g.rng.move.u() < p) { u.broken = true; u.down = true; g.events.push({ t: g.t, kind: 'breakdown', side: u.side, unit: u.id, sec: u.sec, vis: [u.side] }); }
    }
    if (u.side === 'def' && u.stance === 'delay' && contact && !u.delayed) {           // fight one hour, then fall back
      u.delayed = true; u.stance = 'elastic';
      const back = G.idx(G.row[u.sec] + 1, G.col[u.sec]);
      if (back >= 0) { u.path = [back]; u.dest = back; u.yielding = true; }
    }
  }
  updateLodgments(g);
  for (const k of Object.keys(g.lodg)) g.lodgEver[k] = true;
  breachWork(g);
  if (g.breakthrough == null) {
    const row = S.obj.row;
    for (const u of g.units) {
      if (u.side !== 'att' || !fighting(u) || G.row[u.sec] !== row || (u.coh ?? 1) < 0.5 || u.str < 0.5 * u.str0) continue;
      const near = [u.sec, G.at(u.sec, 2), G.at(u.sec, 6)].filter(s => s >= 0);
      if (near.some(s => g.occ[s].some(v => v.side === 'def' && fighting(v)))) continue;
      g.breakthrough = g.t;
      g.events.push({ t: g.t, kind: 'breakthrough', side: 'att', sec: u.sec, vis: ['def', 'att'] });
      break;
    }
  }
  const prev = g._obj || 0, o = objectiveStatus(g);
  if (o.best !== prev) g.events.push({ t: g.t, kind: 'objective', side: 'att', held: o.best, prevHeld: prev, need: o.need, vis: ['def', 'att'] });
  g._obj = o.best;
  for (let s = 0; s < g.gas.length; s++) if (g.gas[s]) { g.gas[s]--; g.gasAge[s]++; if (!g.gas[s]) g.gasAge[s] = 0; }
}

/** Compact snapshot of an hour for replays and the review. */
function snap(g) {
  const n = g.units.length, sec = new Int16Array(n), str = new Float32Array(n), flags = new Uint8Array(n);
  g.units.forEach((u, i) => {
    sec[i] = u.sec; str[i] = u.str;
    flags[i] = (u.broken ? 1 : 0) | (u.moving ? 2 : 0) | (u.stalled ? 4 : 0) | (u.pinned > g.t ? 8 : 0) | (u.posture === 'infil' && u.stealth ? 16 : 0);
  });
  return { t: g.t, sec, str, flags, ctrl: Int8Array.from(g.ctrl), lodg: Object.keys(g.lodg).map(Number), posture: g.units.map(u => u.posture) };
}

/** Replay a logged human game: the human's plan and actions [{ t, kind, ... }] through hour n. */
export function replay(opts, plan, log = [], n = Infinity) {
  const human = SIDES.find(s => !(opts.players && opts.players[s])) || 'def';
  const g = newGame({ ...opts, plans: { ...(opts.plans || {}), ...(plan ? { [human]: plan } : {}) } });
  if (g.phase === 'plan') for (const s of SIDES) if (!g.plans[s]) applyPlan(g, s, s === 'def' ? defaultDefPlan(g) : defaultAttPlan(g));
  while (!g.over && g.t < n) { applyLog(g, log); advance(g); }
  if (!g.over) applyLog(g, log);
  return g;
}
function applyLog(g, log) { for (const a of log) if (a.t === g.t) issue(g, a); }

/** Play a whole game with a policy (or none) on each side. */
export function play(opts) {
  const g = newGame(opts);
  if (g.phase === 'plan') for (const s of SIDES) if (!g.plans[s]) applyPlan(g, s, s === 'def' ? defaultDefPlan(g) : defaultAttPlan(g));
  while (!g.over) advance(g);
  return g;
}

/** A side's picture: 'fog' (its own sightings; what the AI reads) or 'truth' (review only). */
export { picture, stallGauge, objectiveStatus };

/** The race clock from a side's own picture (SPEC §3.11): { row, pace, hoursToObj, csHours, first, margin }. */
export const raceClock = (g, side) => race(g, side, picture(g, side));

/**
 * Expected loss this hour for a planned move, from what the side has seen (SPEC §7.2): the share of the unit's
 * strength the believed enemy around the destination would take at the posture's exposure.
 * move: { to, posture? }. Returns { frac, terms }.
 */
export function expectedLoss(g, unitId, move = {}) {
  const u = g.units[g.ix[unitId]];
  if (!u || !alive(u) || !isCompany(u)) return { frac: 0, terms: {} };
  const G = gridFor(g.scale), to = move.to ?? u.sec, bel = g.beliefSec[u.side];
  let F = bel[to] * 1.0;
  for (const c of G.nbrs[to]) F += bel[c] * 0.5;
  const saved = { sec: u.sec, posture: u.posture, moving: u.moving };
  u.sec = to; u.posture = move.posture || u.posture; u.moving = to !== saved.sec;
  const X = exposure(g, u), Gm = geometry(g, u, FWD[other(u.side)] === 0 ? 0 : 4), D = deadGround(g, u), L = leth(g, X);
  Object.assign(u, saved);
  const frac = Math.min(1, FIRE.c * F * Gm * X * (1 - D) * L / Math.max(1, u.str));
  return { frac, terms: { c: FIRE.c, believedFire: F, G: Gm, X, D, leth: L, from: 'what you have seen' } };
}

export { refreshBelief };
