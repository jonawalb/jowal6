// Forces on the theater board: orders, delayed arrivals, who holds each area, and monthly fighting.
// Pure functions over the game state `s` (they mutate the draft passed in by the engine).
import { SEA, AREAS, ISLAND, START_FORCES, LOGISTICS, START_STANCE, SIDE, WAR, moveCost, AREA_LABEL } from '../data/theater.js';

const IDS = ['us', 'tw', 'cn', 'jp'];
const round1 = x => Math.round(x * 10) / 10;
export const total = (s, who) => Object.values(s.f[who]).reduce((a, b) => a + b, 0);
export const areasOf = who => (who === 'tw' ? ISLAND : AREAS);

export function initForces(s) {
  s.f = JSON.parse(JSON.stringify(START_FORCES));
  s.stance = Object.fromEntries(IDS.map(w => [w, Object.fromEntries(areasOf(w).map(a => [a, START_STANCE[w]]))]));
  s.fStart = Object.fromEntries(IDS.map(w => [w, total(s, w)]));
  s.pending = [];
  s.moved = {};
  s.losses = {};
  updateControl(s);
}

/** Bring in U.S. points ordered out of the Rear last month. */
export function arrive(s, log) {
  for (const p of s.pending) {
    s.f[p.who][p.to] = round1(s.f[p.who][p.to] + p.n);
    log.push({ kind: 'force', who: p.who, text: `${p.n} point${p.n === 1 ? '' : 's'} arrived in the ${AREA_LABEL[p.to]}` });
  }
  s.pending = [];
}

/**
 * Apply one capital's force orders. orders = { moves: [[from, to, n]], stance: { area: 'defend'|'contest'|'attack' } }.
 * Orders past the logistics budget are trimmed or refused with a reason; earlier valid orders stand.
 */
export function applyOrders(s, who, orders = {}, bonus = 0) {
  const log = [];
  let budget = LOGISTICS[who] + bonus;
  s.moved[who] = {};
  for (const [from, to, want] of orders.moves || []) {
    const c = moveCost(from, to);
    if (c == null) { log.push({ kind: 'order', who, ok: false, text: `${AREA_LABEL[from]} → ${AREA_LABEL[to]}: not a route` }); continue; }
    const have = Math.floor(s.f[who][from] ?? 0);
    const n = Math.min(want, have, Math.floor(budget / c));
    if (n <= 0) { log.push({ kind: 'order', who, ok: false, text: `${AREA_LABEL[from]} → ${AREA_LABEL[to]}: ${have <= 0 ? 'no forces there' : 'not enough logistics'}` }); continue; }
    budget -= n * c;
    s.f[who][from] = round1(s.f[who][from] - n);
    if (who === 'us' && from === 'rear') s.pending.push({ who, to, n });
    else s.f[who][to] = round1(s.f[who][to] + n);
    if (SEA.includes(to)) s.moved[who][to] = (s.moved[who][to] || 0) + n;
    log.push({ kind: 'order', who, ok: true, text: `${n} point${n === 1 ? '' : 's'} ${AREA_LABEL[from]} → ${AREA_LABEL[to]}${who === 'us' && from === 'rear' ? ' (arrives next month)' : ''}${n < want ? ` (${want - n} short of logistics)` : ''}` });
  }
  for (const [a, st] of Object.entries(orders.stance || {})) if (s.stance[who][a] && ['defend', 'contest', 'attack'].includes(st)) s.stance[who][a] = st;
  return { log, left: budget };
}

/** Strength of a side in a sea area (Taiwan's island forces count half in the Strait). */
export function strength(s, side, area) {
  const own = IDS.filter(w => SIDE[w] === side && w !== 'tw').reduce((t, w) => t + (s.f[w][area] || 0), 0);
  return own + (side === 'blue' && area === 'strait' ? WAR.twStrait * total(s, 'tw') : 0);
}

export function updateControl(s) {
  const hold = s.rung >= 3 ? WAR.warHold : WAR.peaceHold;
  s.ctrl = {};
  for (const a of SEA) {
    const r = strength(s, 'red', a), b = strength(s, 'blue', a);
    s.ctrl[a] = r > 0 && r >= hold * b ? 'red' : b > 0 && b >= hold * r ? 'blue' : r + b > 0 ? 'contested' : 'empty';
  }
}
export const holds = (s, area, side) => s.ctrl[area] === side;

/** One month of fighting in every sea area where both sides are present and someone is fighting. */
export function combat(s, rng, log) {
  if (s.rung < 3) return;
  for (const a of SEA) {
    const sides = { red: ['cn'], blue: ['us', 'jp'] };
    const present = side => sides[side].filter(w => (s.f[w][a] || 0) > 0);
    if (!present('red').length || !present('blue').length) continue;
    const st = w => s.stance[w][a];
    const all = [...present('red'), ...present('blue')];
    const fighting = all.some(w => st(w) === 'attack') || (present('red').some(w => st(w) !== 'defend') && present('blue').some(w => st(w) !== 'defend'));
    if (!fighting) continue;
    const dealt = side => present(side).reduce((t, w) => t + s.f[w][a] * (WAR[st(w)]?.dealt ?? 1), 0) + (side === 'blue' && a === 'strait' ? WAR.twStrait * total(s, 'tw') : 0);
    const dmg = { red: dealt('blue'), blue: dealt('red') };
    const parts = [];
    for (const side of ['red', 'blue']) {
      const ps = present(side), str = ps.reduce((t, w) => t + s.f[w][a], 0);
      for (const w of ps) {
        const loss = Math.min(s.f[w][a], WAR.k * dmg[side] * (s.f[w][a] / str) * (WAR[st(w)]?.taken ?? 1) * (0.7 + 0.6 * rng.u()));
        s.f[w][a] = round1(s.f[w][a] - loss);
        s.losses[w] = (s.losses[w] || 0) + loss;
        parts.push(`${w.toUpperCase()} −${loss.toFixed(1)}`);
      }
    }
    log.push({ kind: 'battle', area: a, text: `Fighting in the ${AREA_LABEL[a]}: ${parts.join(', ')}` });
  }
}

/** Military track = share of starting force points left. */
export function syncMilitary(s) {
  for (const w of IDS) s.c[w].military = Math.max(0, Math.min(100, Math.round(100 * total(s, w) / s.fStart[w])));
}

/** Damage a capital's forces in one area (strikes). Returns points removed. */
export function hit(s, who, area, n) {
  const have = s.f[who][area] || 0, loss = Math.min(have, n);
  s.f[who][area] = round1(have - loss);
  s.losses[who] = (s.losses[who] || 0) + loss;
  return loss;
}

/** How forward and massed a capital's deployment was this month (adds to the move's intensity). */
export function deployIntensity(s, who, orders) {
  orders = orders || {};
  let x = 0;
  const into = {};
  for (const [from, to, n] of orders.moves || []) if (SEA.includes(to)) into[to] = (into[to] || 0) + n;
  for (const n of Object.values(into)) if (n >= WAR.massing) x += 1;
  for (const st of Object.values(orders.stance || {})) if (st === 'attack') x += 0.5;
  return x;
}
