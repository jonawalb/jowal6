// Orders (SPEC §1.3, §3.8, §8.4): one function, issue(g, action), for every action kind, including formation
// orders expanded deterministically by expandFormation(). Order delay is rolled once per side per hour (Fog's
// rule), so formation orders never desynchronize; EW jamming and the C2 strike add hours per unit.
// Action kinds: move, posture, form, stance, mode, leapfrog, lane, fire, riposte, counterstroke, breach,
// displace, ds, barrage, drone, jam, air, fmn, standing (W3). Every action is { kind, ... } plus t (set here).
import { ORDERS, PREP, STACK, EW, COUNTER } from '../data/params.js';
import { TYPES } from '../data/units.js';
import { ERAS } from '../data/eras.js';
import { SCALES } from '../data/scales.js';
import { makeRng } from './rng.js';
import { gridFor } from './grid.js';
import { alive, fighting, other, isBattery, isCompany, knows } from './forces.js';
import { routeUnit } from './move.js';
import { layLane } from './fire.js';
import { inRange } from './arty.js';
import { riposteAuthority, csPlanTime, CS_ROLES } from './counter.js';
import { queueSortie, airSortie } from './modern.js';

const POSTURES = new Set(['rush', 'bound', 'infil', 'hold', 'consolidate', 'withdraw']);
const STANCES = new Set(['hold', 'elastic', 'delay', 'riposte', 'reserve']);
const MISSIONS = new Set(['suppress', 'destroy', 'gas', 'smoke', 'cb', 'precision']);

/** Order delay for a side's orders sent at hour t: one roll per side per hour, fixed by seed and dice. */
export function orderDelay(g, side, t = g.t) {
  if (g.noDelay) return 0;
  const memo = (g._delay ||= { def: [], att: [] })[side];
  const table = ORDERS.delay[g.era];
  for (let h = memo.length; h <= t; h++) {
    const r = makeRng(g.seed, 1000 + (side === 'def' ? 0 : 50) + h, g.dice);
    let d = table[r.pick(table.map(x => x[1]))][0];
    if (d > 0 && ORDERS.maxRun > 0 && h >= ORDERS.maxRun && memo.slice(h - ORDERS.maxRun, h).every(x => x > 0)) d = 0;
    memo.push(d);
  }
  return memo[t];
}

/** Delay for one unit's order this hour: the side's roll plus jamming, the C2 strike and campaign extras. */
export function unitDelay(g, u, t = g.t) {
  if (g.preOrders && g.preOrders[u.side] > 0 && t === 0) return 0;
  let d = orderDelay(g, u.side, t);
  if (g.jammed[other(u.side)][u.sec] ) d += EW.delay;
  if (g.c2 && u.side === 'def' && t <= 1) d += PREP.c2Delay;
  if (g.ctx && g.ctx.orderDelay && g.ctx.orderDelay[u.side]) d += g.ctx.orderDelay[u.side];
  return d;
}

/** Delay for a call for fire (SPEC §3.8): 1 h in 1917-18 unless the battery is in direct support nearby. */
function fireDelay(g, b, sec) {
  if (b.side === 'def' && g.era === 'w') return 0;                     // buried cable to the defender's guns
  let d = b.side === 'att' ? ORDERS.callFire[g.era] : 0;
  if (d && b.ds) {
    const G = gridFor(g.scale);
    if (g.units.some(u => u.fmn.includes(b.ds) && fighting(u) && G.dist(u.sec, sec) <= 1)) d = 0;
  }
  if (g.jammed[other(b.side)][sec]) d += EW.delay;              // calls for fire into an enemy-jammed area
  if (d && b.side === 'att' && knows(b, 'CA2')) d = Math.max(0, d - 1);
  return d;
}

const ok = (extra = {}) => ({ ok: true, ...extra });
const no = reason => ({ ok: false, reason });

/**
 * Issue one action at the current hour. opts.log (default true): record it in g.log (the player's actions;
 * scripted sides pass log: false). Returns { ok, d?, reason? }.
 */
export function issue(g, action, opts = {}) {
  if (!action || g.over || g.phase !== 'battle') return no('not in battle');
  const a = { ...action, t: g.t };
  const r = apply(g, a);
  if (r.ok && opts.log !== false) g.log.push(a);
  return r;
}

function apply(g, a) {
  if (a.kind === 'fmn' && a.order && a.order.kind === 'plan') {
    if (!g.fmns[a.fmn]) return no('no such formation');
    (g.fplans ||= {})[a.fmn] = { plan: a.order.plan, v: a.order.v, t: g.t };
    if (a.order.plan === 'riposte') for (const id of g.fmns[a.fmn].units) { const u = g.units[g.ix[id]]; if (fighting(u)) u.stance = 'riposte'; }
    if (a.order.plan === 'consolidateRow' && Number.isInteger(a.order.v)) g.biteRow = a.order.v;
    return ok();
  }
  if (a.kind === 'fmn') {
    const list = expandFormation(g, a.fmn, a.order || {});
    if (!list.length) return no('no units');
    let n = 0;
    for (const x of list) if (apply(g, { ...x, t: a.t }).ok) n++;
    return n ? ok({ n }) : no('no valid orders');
  }
  if (a.kind === 'air') return airSortie(g, a.side || 'att', a.sec) ? ok() : no('no sortie');
  if (a.kind === 'standing') {   // W3: switch a standing order on or off ({ side, key, on }); logged so replays agree
    const st = g.standing && g.standing[a.side];
    if (!st || !(a.key in st)) return no('no such standing order');
    st[a.key] = !!a.on; return ok();
  }
  if (a.kind === 'counterstroke') return counterstroke(g, a);
  if (a.kind === 'barrage') return barrageChange(g, a);
  const u = a.unit != null ? g.units[g.ix[a.unit]] : null;
  if (!u || !alive(u)) return no('no such unit');
  const G = gridFor(g.scale);
  const valid = s => Number.isInteger(s) && s >= 0 && s < G.n;
  switch (a.kind) {
    case 'posture':
      if (!POSTURES.has(a.v) || isBattery(u)) return no('bad posture');
      if (a.v === 'infil' && u.posture !== 'infil') u.stealth = !!(TYPES[u.type].stealth || knows(u, 'AT2'));
      if (a.v !== 'bound' && a.v !== 'rush') unpair(g, u);       // a pair may Rush for an hour and resume leapfrog
      u.posture = a.v;
      if (u.dest != null && u.dest !== u.sec && (a.v === 'infil' || a.v === 'withdraw')) routeUnit(g, u, u.dest);
      return ok();
    case 'form':
      if (a.v !== 'waves' && a.v !== 'groups') return no('bad formation');
      if (a.v === 'groups' && u.formation !== 'groups' && TYPES[u.type].line && !knows(u, 'AT1') && u.side === 'att') u.coh = Math.max(0.3, (u.coh ?? 1) - 0.2);
      u.formation = a.v; return ok();
    case 'stance':
      if (!STANCES.has(a.v)) return no('bad stance');
      if (g.flags && g.flags.noElastic && g.flags.noElastic[u.side] && a.v === 'elastic') return no('elastic not allowed');
      u.stance = a.v; return ok();
    case 'mode':
      if (!['normal', 'covered', 'road'].includes(a.v)) return no('bad mode');
      u.mode = a.v; u.prefer = a.v === 'covered' ? 'covered' : u.prefer; return ok();
    case 'drone': return queueSortie(g, u, a.m, a.sec) ? ok() : no('no sortie');
    case 'jam': if (u.type !== 'ew' || !valid(a.sec)) return no('not a jammer'); u.jam = a.sec; return ok();
    case 'ds': if (!isBattery(u)) return no('not a battery'); u.ds = a.fmn || null; return ok();
    case 'riposte': {
      if (u.side !== 'def' || !isCompany(u) || !g.lodg[a.sec] || !G.adj(u.sec, a.sec)) return no('no lodgment next to it');
      const auth = riposteAuthority(g, u);
      if (auth) { u.riposteAt = a.sec; u.riposteT = g.t; return ok({ d: 0 }); }
      return queue(g, u, a, unitDelay(g, u));
    }
    case 'fire': {
      if (!isBattery(u) || !MISSIONS.has(a.m) || !valid(a.sec)) return no('bad mission');
      if (a.m === 'gas' && !ERAS[g.era].gas) return no('no gas in this era');
      if (a.m === 'precision' && TYPES[u.type].arty !== 'rocket') return no('rocket batteries only');
      if (!inRange(g, u, a.sec)) return no('out of range');
      if (g.missions.some(m => m.bat === u.id && m.due === g.t + fireDelay(g, u, a.sec) && !m.done)) return no('battery busy');
      const d = fireDelay(g, u, a.sec);
      g.missions.push({ t: g.t, due: g.t + d, side: u.side, bat: u.id, m: a.m, sec: a.sec, target: a.target ?? null, done: false });
      return ok({ d });
    }
    case 'move': case 'leapfrog': case 'lane': case 'breach': case 'displace':
      if (a.kind !== 'displace' && !isCompany(u) && u.type !== 'drone' && u.type !== 'ew') return no('cannot move');
      if ((a.kind === 'move' || a.kind === 'leapfrog') && !valid(a.to)) return no('bad target');
      if (a.kind === 'lane' && (u.type !== 'mg' || !(a.dir >= 0 && a.dir < 8))) return no('only MG companies lay fire lanes');
      if (a.kind === 'leapfrog') {
        const p = g.units[g.ix[a.unit2]];
        if (!p || !fighting(p) || p.side !== u.side || p === u || !(p.sec === u.sec || G.adj(p.sec, u.sec))) return no('partner must be in the same or next sector');
      }
      if (a.kind === 'displace' && !isBattery(u)) return no('not a battery');
      return queue(g, u, a, a.kind === 'displace' ? 0 : unitDelay(g, u));
    default: return no('unknown action');
  }
}

/** Put an order in transit; a newer order of the same kind to the same unit replaces one still in transit. */
function queue(g, u, a, d) {
  for (const o of g.orders) if (o.unit === u.id && !o.done && !o.cancelled && o.a.kind === a.kind) o.cancelled = true;
  g.orders.push({ i: g.orders.length, t: g.t, due: g.t + d, side: u.side, unit: u.id, a, done: false, cancelled: false });
  return ok({ d });
}

function unpair(g, u) {
  if (u.pair == null) return;
  const p = g.units[g.ix[u.pair]];
  if (p && p.pair === u.id) { p.pair = null; if (p.posture === 'bound') p.posture = 'rush'; }
  u.pair = null;
}

/** Deliver the orders due this hour (SPEC §3.1 step 3). */
export function deliver(g) {
  const G = gridFor(g.scale);
  for (const o of g.orders) {
    if (o.done || o.cancelled || o.due > g.t) continue;
    o.done = true; o.at = g.t;
    if (o.a.kind === 'barrage') { if (!o.lost) g.barrage = { ...g.barrage, ...o.plan, h0: g.t }; continue; }
    const u = g.units[g.ix[o.unit]], a = o.a;
    if (!u || !alive(u)) continue;
    g.events.push({ t: g.t, kind: 'order', side: u.side, unit: u.id, sent: o.t, vis: [u.side] });
    if (a.kind === 'move') {
      if (a.mode) u.mode = a.mode;
      if (a.prefer) u.prefer = a.prefer;
      routeUnit(g, u, a.to);
      if (u.side === 'def' && G.zone[u.sec] === 'rear' && u.path.length) g.telemetry.events.push({ t: g.t, kind: 'reserveMove', s: 'def', side: 'def', unit: u.id });
    } else if (a.kind === 'leapfrog') {
      const p = g.units[g.ix[a.unit2]];
      if (!p || !fighting(p)) { routeUnit(g, u, a.to); continue; }
      unpair(g, u); unpair(g, p);
      u.pair = p.id; p.pair = u.id; u.posture = p.posture = 'bound'; u.bound = p.bound = a.bound === 'long' ? 'long' : 'short';
      u.lfT0 = p.lfT0 = g.t; u.lfOw = false; p.lfOw = true;
      const to2 = a.to2 != null ? a.to2 : a.to;
      routeUnit(g, u, a.to); routeUnit(g, p, to2);
    } else if (a.kind === 'lane') { u.lane = a.dir; layLane(g, u); g.coverDirty = true; }
    else if (a.kind === 'breach') u.breaching = true;
    else if (a.kind === 'riposte') { u.riposteAt = a.sec; u.riposteT = g.t; u.caAuth = false; }
    else if (a.kind === 'displace') {
      u.busy = g.t + ERAS[g.era].displaceHours; u.located = false;
      if (a.sec != null && a.sec >= 0 && g.ctrl[a.sec] === (u.side === 'att' ? 2 : 1)) u.sec = a.sec;
    }
  }
}

/** Counterstroke: the Counterstroke formation strikes lodgment sectors at H-hour >= now + planning time. */
function counterstroke(g, a) {
  const f = g.fmns[a.fmn];
  if (!f || f.side !== 'def') return no('no such formation');
  const secs = (a.secs || []).filter(s => s >= 0 && s < g.cols * g.rows);
  if (!secs.length) return no('no target');
  const units = f.units.map(id => g.units[g.ix[id]]).filter(u => fighting(u));
  if (!units.length) return no('no units');
  // W3: without immediate-counterattack authority (card ED3 for most of the formation) it waits for orders from above.
  const auth = units.filter(u => riposteAuthority(g, u)).length >= units.length / 2;
  const plan = csPlanTime(g) + (auth ? 0 : COUNTER.noAuthorityHours), h = Math.max(a.h ?? 0, g.t + plan);
  const G = gridFor(g.scale);
  const cs = { fmn: a.fmn, secs, h, units: units.map(u => u.id), t: g.t, done: false };
  g.cstrokes.push(cs);
  for (const u of units) {
    const tgt = secs.slice().sort((x, y) => G.dist(u.sec, x) - G.dist(u.sec, y))[0];
    u.cs = { h, tgt }; u.csGo = false; u.posture = u.posture === 'infil' ? 'rush' : u.posture;
    routeUnit(g, u, tgt);
  }
  // Its own supporting fire: a Suppress on each target the hour it goes in, from free batteries in range.
  const bats = g.units.filter(b => b.side === 'def' && isBattery(b) && alive(b));
  for (const s of secs) for (const b of bats.filter(b => inRange(g, b, s)).slice(0, 2)) {
    if (!g.missions.some(m => m.bat === b.id && m.due === h)) g.missions.push({ t: g.t, due: h, side: 'def', bat: b.id, m: 'suppress', sec: s, target: null, done: false });
  }
  return ok({ h });
}

/** A change to the barrage plan after H-hour is a message: runner (1917-18) or radio (Modern) (SPEC §3.8). */
function barrageChange(g, a) {
  if (!g.barrage) return no('no barrage');
  const r = makeRng(g.seed, 3000 + g.t * 13 + g.orders.length, g.dice);
  let d = 0, lost = false;
  if (g.era === 'w') { d = r.u() < ORDERS.phone ? 1 : ORDERS.runner.delay; lost = r.u() < ORDERS.runner.loss; }
  else if (g.units.some(u => u.side === 'att' && g.jammed.def[u.sec])) { d = 1; lost = r.u() < EW.msgLoss; }
  const plan = {};
  for (const k of ['cols', 'r0', 'rate', 'bats', 'stop']) if (a[k] != null) plan[k] = a[k];
  g.orders.push({ i: g.orders.length, t: g.t, due: g.t + d, side: 'att', unit: null, a: { kind: 'barrage' }, plan, lost, done: false, cancelled: false });
  if (lost) g.events.push({ t: g.t, kind: 'msgLost', side: 'att', vis: ['att'] });
  return ok({ d, lost });
}

/**
 * Expand a formation order into unit actions (SPEC §8.4). order: { kind: 'move'|'attack'|'posture'|'form'|
 * 'stance'|'mode'|'hold'|'counterstroke'|'plan', to?, v?, width?, rect?, secs?, h?, plan? }.
 */
export function expandFormation(g, fmnId, order) {
  const f = g.fmns[fmnId];
  if (!f) return [];
  const G = gridFor(g.scale);
  const us = f.units.map(id => g.units[g.ix[id]]).filter(u => fighting(u));
  const k = order.kind;
  if (['posture', 'form', 'stance', 'mode'].includes(k)) return us.map(u => ({ kind: k, unit: u.id, v: order.v }));
  if (k === 'counterstroke') return [{ kind: 'counterstroke', fmn: fmnId, secs: order.secs, h: order.h }];
  const load = new Map();
  const place = s => { let best = s; if ((load.get(s) || 0) >= STACK.max) best = G.nbrs[s].slice().sort((a, b) => (load.get(a) || 0) - (load.get(b) || 0) || a - b)[0]; load.set(best, (load.get(best) || 0) + 1); return best; };
  if (k === 'move') {
    if (!us.length || order.to == null) return [];
    const cr = Math.round(us.reduce((s, u) => s + G.row[u.sec], 0) / us.length), cc = Math.round(us.reduce((s, u) => s + G.col[u.sec], 0) / us.length);
    const dr = G.row[order.to] - cr, dc = G.col[order.to] - cc;
    return us.map(u => ({ kind: 'move', unit: u.id, to: place(G.idx(clamp(G.row[u.sec] + dr, 0, G.rows - 1), clamp(G.col[u.sec] + dc, 0, G.cols - 1))), mode: order.mode }));
  }
  if (k === 'hold') {
    const { r0, r1, c0, c1 } = order.rect || {};
    const cells = [];
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const s = G.idx(r, c); if (s >= 0) cells.push(s); }
    if (!cells.length) return [];
    return us.map((u, i) => ({ kind: 'move', unit: u.id, to: place(cells[i % cells.length]) }));
  }
  if (k === 'attack') {
    if (order.to == null) return [];
    const w = order.width ?? 1, row = G.row[order.to], c = G.col[order.to], out = [];
    const colsAt = []; for (let x = c - w; x <= c + w; x++) if (x >= 0 && x < G.cols) colsAt.push(x);
    const byBn = new Map();
    for (const u of us) { const bn = u.fmn[u.fmn.length - 1]; if (!byBn.has(bn)) byBn.set(bn, []); byBn.get(bn).push(u); }
    let i = 0;
    for (const list of byBn.values()) {
      const line = list.filter(u => TYPES[u.type].line || u.type === 'mg');
      for (let j = 0; j + 1 < line.length; j += 2) {
        const to = place(G.idx(row, colsAt[i++ % colsAt.length]));
        out.push({ kind: 'leapfrog', unit: line[j].id, unit2: line[j + 1].id, to });
      }
      for (const u of list.filter(u => !line.includes(u) || (line.length % 2 && u === line[line.length - 1]))) out.push({ kind: 'move', unit: u.id, to: place(G.idx(row, colsAt[i++ % colsAt.length])) });
    }
    return out;
  }
  return [];
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** Is a unit a counterstroke-formation unit? */
export const isCounterstroke = u => CS_ROLES.has(u.role);
export const scaleOf = g => SCALES[g.scale];

/**
 * Initiative events (SPEC §6.4; Hunzeker pp. 28-29): each Stalled or Pinned unit improvises with probability
 * 0.03 x latitude level (1-4): breaks into small groups, infiltrates around the obstacle, or (a defender next to
 * a lodgment) ripostes without orders. Most experiments fail through the normal model (p. 29).
 */
export function initiative(g, rng) {
  const G = gridFor(g.scale);
  for (const u of g.units) {
    if (!fighting(u) || !(u.wasStalled || u.pinned >= g.t)) continue;
    const lvl = (g.ctx.latitude && g.ctx.latitude[u.side]) || 2;
    if (rng.u() >= 0.03 * lvl) continue;
    const lodg = u.side === 'def' ? G.nbrs[u.sec].find(s => g.lodg[s]) : undefined;
    let what;
    if (lodg != null) { u.riposteAt = lodg; u.riposteT = g.t; what = 'riposte'; }
    else if (u.formation !== 'groups') { u.formation = 'groups'; what = 'groups'; }
    else if (TYPES[u.type].line) { u.posture = 'infil'; u.stealth = false; what = 'infiltrate'; }
    if (!what) continue;
    u.impT = g.t;
    g.events.push({ t: g.t, kind: 'improvise', side: u.side, unit: u.id, sec: u.sec, what, vis: [u.side] });
  }
}
