// Formations on the theater board: orders, delayed arrivals, who holds each area, and monthly fighting.
// Pure functions over the game state `s` (they mutate the draft passed in by the engine). The formations in
// s.units are the truth; s.f[who][area] is a derived sum of raw strength kept for the moves and the map.
import { SEA, AREAS, ISLAND, COAST, START_STANCE, START_EMPH, SIDE, WAR, moveCost, adjacent, AREA_LABEL } from '../data/theater.js';
import { FORMATIONS, FBY, TYPES, UPKEEP, READY, placesFor, readyFactor } from '../data/formations.js';
import { P } from '../data/params.js';

const IDS = ['us', 'tw', 'cn', 'jp'];
export const r2 = x => Math.round(x * 100) / 100;
export const areasOf = who => (who === 'tw' ? [...ISLAND, ...SEA] : AREAS);
export const total = (s, who) => r2(s.units[who].reduce((t, u) => t + u.str, 0));
export const unit = (s, id) => s.units[FBY[id].who].find(u => u.id === id);
/** Effective strength: raw strength scaled by readiness. */
export const eff = u => u.str * readyFactor(u.ready);

export function initForces(s) {
  s.units = Object.fromEntries(IDS.map(w => [w, FORMATIONS[w].map(f => ({ id: f.id, at: f.at, str: f.str, ready: 100, ...(f.focus ? { focus: f.focus } : {}) }))]));
  s.stance = Object.fromEntries(IDS.map(w => [w, Object.fromEntries(SEA.map(a => [a, START_STANCE[w]]))]));
  s.emph = { ...START_EMPH };
  s.moved = {}; s.losses = {}; s.engaged = {};
  syncF(s);
  s.fStart = Object.fromEntries(IDS.map(w => [w, total(s, w)]));
  updateControl(s);
}

/** Recompute s.f (raw strength per area) from the formations. */
export function syncF(s) {
  s.f = Object.fromEntries(IDS.map(w => [w, Object.fromEntries(areasOf(w).map(a => [a, 0]))]));
  for (const w of IDS) for (const u of s.units[w]) if (u.at in s.f[w]) s.f[w][u.at] = r2(s.f[w][u.at] + u.str);
}

/** Months a U.S. formation leaving the Rear takes to arrive: 1 (0 with a surge); 2 (1 with a surge) when a human
 * plays the United States, who must decide early. The computer's United States is unchanged. */
export const arrivalDelay = (s, who, fast) => Math.max(0, (who === 'us' && s.human === 'us' ? 2 : 1) - (fast ? 1 : 0));
/** "arrives in May" (or "after the game ends"). */
export const etaText = eta => (eta < P.turns ? `arrives in ${P.months[eta]}` : 'arrives after the game ends');

/** Bring in U.S. formations whose arrival month has come. */
export function arrive(s, log) {
  for (const w of IDS) for (const u of s.units[w]) if (u.at === 'transit' && (u.eta ?? s.turn) <= s.turn) {
    u.at = u.to; delete u.to; delete u.eta;
    log.push({ kind: 'force', who: w, area: u.at, type: FBY[u.id].type, text: `${FBY[u.id].short} arrived in the ${AREA_LABEL[u.at]}` });
  }
  syncF(s);
}

/** Why one order cannot be carried out (null if it can), and its Lift and fuel cost. */
export function orderCheck(s, who, [id, to], res, done = {}) {
  const f = FBY[id], u = f && f.who === who && unit(s, id);
  if (!u) return { why: 'not your formation' };
  if (done[id]) return { why: 'already has an order this month' };
  if (f.type === 'strike') return SEA.includes(to) || to === 'none' ? { lift: 0, fuel: 0, aim: true } : { why: 'can only aim at a sea area' };
  if (u.at === 'transit') return { why: 'still in transit' };
  if (!placesFor(id).includes(to)) return { why: `cannot go to the ${AREA_LABEL[to] || to}` };
  const c = moveCost(u.at, to);
  if (c == null) return { why: 'not a route from where it is' };
  const lift = c * TYPES[f.type].lift, fuel = UPKEEP.move;
  if (res && res.lift < lift - 1e-9) return { why: 'not enough Lift', res: 'lift', lift, fuel };
  if (res && res.fuel < fuel - 1e-9) return { why: 'not enough fuel', res: 'fuel', lift, fuel };
  return { lift, fuel };
}

/**
 * Apply one capital's force orders, paying from s.res[who]. orders = { moves: [[formationId, to]],
 * stance: { seaArea: 'defend'|'contest'|'attack' }, emph: coastSector }. Unaffordable or illegal orders are
 * refused with a reason; earlier orders stand. opts.fast: a U.S. surge (arrivals one month sooner; see arrivalDelay).
 */
export function applyOrders(s, who, orders = {}, opts = {}) {
  const log = [], res = s.res[who], done = {};
  s.moved[who] = {};
  for (const [id, to] of orders.moves || []) {
    const c = orderCheck(s, who, [id, to], res, done);
    const name = FBY[id]?.short || id;
    if (c.why) { log.push({ kind: 'order', who, ok: false, res: c.res, text: `${name} → ${AREA_LABEL[to] || to}: ${c.why}` }); continue; }
    done[id] = true;
    const u = unit(s, id);
    if (c.aim) { u.focus = to; log.push({ kind: 'order', who, ok: true, text: `${name} aimed at ${to === 'none' ? 'nothing' : 'the ' + AREA_LABEL[to]}` }); continue; }
    res.lift = r2(res.lift - c.lift); res.fuel = r2(res.fuel - c.fuel);
    const from = u.at;
    const wait = who === 'us' && from === 'rear' ? arrivalDelay(s, who, opts.fast) : 0;
    if (wait > 0) { u.at = 'transit'; u.to = to; u.eta = s.turn + wait; }
    else u.at = to;
    if (SEA.includes(to)) s.moved[who][to] = (s.moved[who][to] || 0) + u.str;
    log.push({ kind: 'order', who, ok: true, text: `${name} ${AREA_LABEL[from]} → ${AREA_LABEL[to]}${u.at === 'transit' ? ` (${etaText(u.eta)})` : ''}` });
  }
  for (const [a, st] of Object.entries(orders.stance || {})) if (SEA.includes(a) && ['defend', 'contest', 'attack'].includes(st)) s.stance[who][a] = st;
  if (who in s.emph && COAST.includes(orders.emph)) s.emph[who] = orders.emph;
  syncF(s);
  return { log };
}

/** Everything that counts for a side in a sea area: formations there; Taiwan's island forces in the Strait;
 * from Limited strikes up, air formations next door (half) and strike formations aimed there. */
export function contributors(s, side, area) {
  const out = [], war = s.rung >= 3;
  for (const w of IDS) {
    if (SIDE[w] !== side) continue;
    for (const u of s.units[w]) {
      if (u.str <= 0) continue;
      const t = FBY[u.id].type;
      if (u.at === area) out.push({ w, u, wt: 1, kind: 'here' });
      else if (w === 'tw' && area === 'strait' && ISLAND.includes(u.at)) out.push({ w, u, wt: t === 'air' ? WAR.twAir : WAR.twLand, kind: 'coast' });
      else if (war && t === 'air' && adjacent(u.at, area)) out.push({ w, u, wt: WAR.support, kind: 'support' });
      else if (war && t === 'strike' && u.focus === area) out.push({ w, u, wt: 1, kind: 'strike' });
    }
  }
  return out;
}
export const strength = (s, side, area) => contributors(s, side, area).reduce((t, c) => t + eff(c.u) * c.wt, 0);

export function updateControl(s) {
  const hold = s.rung >= 3 ? WAR.warHold : WAR.peaceHold;
  s.ctrl = {};
  for (const a of SEA) {
    const r = strength(s, 'red', a), b = strength(s, 'blue', a);
    s.ctrl[a] = r > 0 && r >= hold * b ? 'red' : b > 0 && b >= hold * r ? 'blue' : r + b > 0 ? 'contested' : 'empty';
  }
}
export const holds = (s, area, side) => s.ctrl[area] === side;

/** Munitions a capital's contributors in one fight need this month. */
export const munNeed = (list, st) => list.reduce((t, c) => t + (c.kind === 'strike' ? UPKEEP.mun.strike : c.kind === 'support' ? UPKEEP.mun.support : c.kind === 'coast' ? UPKEEP.mun.coast : UPKEEP.mun[st]), 0);
/** Will this sea area see fighting this month, given both sides' stances? */
export function fights(s, a, con = { red: contributors(s, 'red', a), blue: contributors(s, 'blue', a) }) {
  if (s.rung < 3) return false;
  const here = side => [...new Set(con[side].filter(c => c.kind === 'here').map(c => c.w))];
  if (!here('red').length || !here('blue').length) return false;
  const st = w => s.stance[w][a];
  return [...here('red'), ...here('blue')].some(w => st(w) === 'attack') || (here('red').some(w => st(w) !== 'defend') && here('blue').some(w => st(w) !== 'defend'));
}

/** One month of fighting in every sea area where both sides have forces and someone is fighting. Pays munitions. */
export function combat(s, rng, log) {
  if (s.rung < 3) return;
  s.short = s.short || {};
  for (const a of SEA) {
    const con = { red: contributors(s, 'red', a), blue: contributors(s, 'blue', a) };
    if (!fights(s, a, con)) continue;
    const st = w => s.stance[w][a];
    const munF = {};
    for (const w of new Set([...con.red, ...con.blue].map(c => c.w))) {
      const need = munNeed([...con.red, ...con.blue].filter(c => c.w === w), st(w)), pay = Math.min(need, s.res[w].mun);
      s.res[w].mun = r2(s.res[w].mun - pay);
      munF[w] = need > 0 ? Math.max(WAR.noMun, pay / need) : 1;
      if (pay < need - 1e-9) (s.short[w] = s.short[w] || {}).mun = true;
    }
    const by = c => eff(c.u) * c.wt * (WAR[st(c.w)]?.dealt ?? 1) * munF[c.w];
    const dealt = side => con[side].reduce((t, c) => t + by(c), 0);
    const dmg = { red: dealt('blue'), blue: dealt('red') };
    // Who dealt each side's damage, by capital (the peace forum's anger reads it: s.hurt[victim][by]).
    const share = side => { const d = {}; for (const c of con[side]) d[c.w] = (d[c.w] || 0) + by(c); const t = Object.values(d).reduce((a, b) => a + b, 0) || 1; for (const k in d) d[k] /= t; return d; };
    const from = { red: share('blue'), blue: share('red') };
    s.hurt = s.hurt || {};
    const lost = {};
    for (const side of ['red', 'blue']) {
      const wts = con[side].map(c => eff(c.u) * c.wt * (c.kind === 'strike' ? WAR.strikeTaken : 1)), sum = wts.reduce((x, y) => x + y, 0) || 1;
      con[side].forEach((c, i) => {
        const loss = Math.min(c.u.str, WAR.k * dmg[side] * (wts[i] / sum) * (WAR[st(c.w)]?.taken ?? 1) * (0.7 + 0.6 * rng.u()));
        c.u.str = r2(c.u.str - loss);
        s.losses[c.w] = (s.losses[c.w] || 0) + loss; lost[c.w] = (lost[c.w] || 0) + loss;
        for (const [k, f] of Object.entries(from[side])) { const h = (s.hurt[c.w] = s.hurt[c.w] || {}); h[k] = (h[k] || 0) + loss * f; }
        s.engaged[c.u.id] = true;
      });
    }
    log.push({ kind: 'battle', area: a, text: `Fighting in the ${AREA_LABEL[a]}: ${Object.entries(lost).map(([w, x]) => `${w.toUpperCase()} −${x.toFixed(1)}`).join(', ')}` });
  }
  syncF(s);
}

/** Military track = share of starting strength left. */
export function syncMilitary(s) {
  for (const w of IDS) s.c[w].military = Math.max(0, Math.min(100, Math.round(100 * total(s, w) / s.fStart[w])));
}

/** Damage a capital's formations in one area (strikes), spread by strength; `type` limits it to one kind. */
export function hit(s, who, area, n, type) {
  const list = s.units[who].filter(u => u.at === area && u.str > 0 && (!type || FBY[u.id].type === type));
  const have = list.reduce((t, u) => t + u.str, 0), loss = Math.min(have, n);
  for (const u of list) u.str = r2(u.str - loss * u.str / have);
  if (loss > 0) s.losses[who] = (s.losses[who] || 0) + loss;
  syncF(s);
  return loss;
}

/** Add strength in an area (reserves called up, arms arriving): to the largest formation there, else the reserve. */
export function addStr(s, who, area, n) {
  const pick = l => l.sort((x, y) => y.str - x.str)[0];
  const u = pick(s.units[who].filter(x => x.at === area && FBY[x.id].type !== 'strike')) || pick(s.units[who].filter(x => x.at === 'res' || x.at === 'rear'));
  if (u) u.str = r2(u.str + n);
  syncF(s);
}

/** Change readiness of a capital's formations (all, or those matching `where`). */
export function shiftReady(s, who, d, where) {
  for (const u of s.units[who]) if (!where || where(u)) u.ready = Math.round(Math.max(READY.floor, Math.min(100, u.ready + d)));
}

/** How forward and massed a deployment reads (adds to the move's intensity): uses starting strengths, so it
 * needs no game state. */
export function deployIntensity(orders) {
  orders = orders || {};
  let x = 0;
  const into = {};
  for (const [id, to] of orders.moves || []) if (SEA.includes(to) && FBY[id] && FBY[id].type !== 'strike') into[to] = (into[to] || 0) + FBY[id].str;
  for (const n of Object.values(into)) if (n >= WAR.massing) x += 1;
  for (const st of Object.values(orders.stance || {})) if (st === 'attack') x += 0.5;
  return x;
}
