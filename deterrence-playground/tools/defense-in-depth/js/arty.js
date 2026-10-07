// Artillery (SPEC §3.8): range rings, ammunition, the creeping barrage timetable and its coordination check,
// SOS, ordered missions (Suppress, Destroy, Gas, Smoke, Counter-battery, Precision), battery location and the
// preparation (Hurricane / Methodical / C2 strike). Suppression from k batteries: min(0.86, 1 - 0.4^k);
// the 0.86 is Biddle's "factor of seven or more" (p. 67); Destroy costs 10x Suppress (p. 37).
import { SUPP, GAS, CB, PRECISION, BARRAGE, PREP, FIRE } from '../data/params.js';
import { TYPES } from '../data/units.js';
import { ERAS } from '../data/eras.js';
import { gridFor, los } from './grid.js';
import { alive, other, isBattery, isCompany, isVehicle, companies, knows } from './forces.js';
import { exposure, moving } from './fire.js';

/** Battery range in sectors for this era. */
export const rangeOf = (g, b) => ERAS[g.era].ranges[TYPES[b.type].arty];
/** Distance from a battery to a sector: off-map attacker guns sit on a gun line behind row 0 (SPEC §2.7). */
export function batDist(g, b, sec) {
  const G = gridFor(g.scale);
  if (b.sec >= 0) return G.dist(b.sec, sec);
  return G.row[sec] + ERAS[g.era].gunLine[TYPES[b.type].arty === 'field' ? 'field' : 'heavy'];
}
export const inRange = (g, b, sec) => batDist(g, b, sec) <= rangeOf(g, b);
/** Can this battery fire this hour? (Not displacing, not neutralized, guns left.) */
export const ready = (g, b) => isBattery(b) && !b.broken && b.guns > 0 && !(b.busy > g.t) && b.neutral !== g.t;
/** Is a sector inside the range ring of any of a side's batteries? (Cohesion, SPEC §3.7.) */
export const underGuns = (g, side, sec) => g.units.some(b => b.side === side && isBattery(b) && !b.broken && b.guns > 0 && inRange(g, b, sec));

/** Multiply in a suppression source on a unit this hour (combined later as 1 - prod(1 - s)). */
export const addSupp = (u, s) => { if (s > 0) u._ps = (u._ps ?? 1) * (1 - Math.min(0.99, s)); };
const suppOf = k => Math.min(SUPP.max, 1 - (1 - SUPP.one) ** k);

/** Artillery or drone losses as a fraction of strength, with dugouts, concrete, crowding and pinning. */
export function artyLoss(g, u, frac, kind = 'ar') {
  if (!alive(u) || !isCompany(u) && u.type !== 'drone' && u.type !== 'ew') return 0;
  const f = g.sectors.feat, s = u.sec;
  // 2026-10-07: an attached tank rides with its company and does not add to the crowding (as for stacking).
  const n = g.occ[s].reduce((m, v) => m + (v.side === u.side && isCompany(v) && v.escort == null ? 1 : 0), 0);
  let k = frac * (1 + SUPP.crowd * Math.max(0, n - 2));
  if (!moving(u) && u.side === 'def' && f.dugout[s]) k *= 1 - SUPP.dugout;
  if (!moving(u) && u.side === 'def' && f.strong[s] === 2) k *= SUPP.concrete;
  if (u.pinned > g.t) k *= SUPP.pinnedArty;
  const l = Math.min(u.str, u.str * Math.min(1, k));
  u.str -= l; u.lossH = (u.lossH || 0) + l;
  const inc = u.inc || (u.inc = { fr: 0, fl: 0, ar: 0, dr: 0 });
  inc[kind] += l;
  return l;
}

const spend = (g, side, n) => { if (g.ammo[side] < n) return false; g.ammo[side] -= n; return true; };

// ---- Creeping barrage timetable (D-21) ----

/** Rows the barrage covers at hour t (empty if inactive). plan: { cols, r0, rate, h0, bats }. */
export function barrageRows(g, t = g.t) {
  const b = g.barrage;
  if (!b || !b.cols || !b.cols.length || t < b.h0) return [];
  const h = t - b.h0, r = b.r0 + Math.floor(b.rate * h), rp = h > 0 ? b.r0 + Math.floor(b.rate * (h - 1)) : r - 1;
  if (r > b.stop) return BARRAGE.protect && b.protect !== false ? [b.stop] : [];
  const rows = [];
  for (let x = b.rate > 1 ? rp + 1 : r; x <= r; x++) if (x <= b.stop) rows.push(x);
  return rows;
}
/** First and last hour the barrage stands on row r, or null. */
export function barrageHours(g, r) {
  const b = g.barrage;
  if (!b || !b.cols || r < b.r0 || r > b.stop) return null;
  let first = null, last = null;
  for (let h = 0; h <= g.turns + 1; h++) {
    if (barrageRows(g, b.h0 + h).includes(r)) { if (first === null) first = b.h0 + h; last = b.h0 + h; }
  }
  return first === null ? null : { first, last };
}
/** The coordination case for an attacker entering or assaulting sector sec at hour t (SPEC §3.8 table). */
export function barrageCase(g, sec, t = g.t) {
  const G = gridFor(g.scale), b = g.barrage;
  if (!b || !b.cols || !b.cols.includes(G.col[sec])) return null;
  const hb = barrageHours(g, G.row[sec]);
  if (!hb) return null;
  if (t >= hb.first && t <= hb.last) return 'on';
  if (t < hb.first) return 'late';
  if (t === hb.last + 1) return 'early';
  return 'gap';
}

/** Is the barrage past its timetable and standing on its last row (BARRAGE.protect)? */
export function barrageStanding(g, t = g.t) {
  const b = g.barrage;
  if (!b || !b.cols || !BARRAGE.protect || b.protect === false || t < b.h0) return false;
  return b.r0 + Math.floor(b.rate * (t - b.h0)) > b.stop;
}

function fireBarrage(g) {
  const b = g.barrage, rows = barrageRows(g);
  if (!rows.length) return;
  const G = gridFor(g.scale);
  // 2026-10-07: past its timetable the creeper becomes a standing protective barrage on its last row. Its guns stay on
  // the fire plan; they fire only once the infantry are up to protect (at least on the row before it).
  if (barrageStanding(g) && !g.units.some(u => u.side === 'att' && isCompany(u) && !isVehicle(u) && u.str > 0 && u.sec >= 0 && b.cols.includes(G.col[u.sec]) && G.row[u.sec] >= b.stop - 1)) return;
  const bats = (b.bats || []).map(id => g.units[g.ix[id]]).filter(u => u && ready(g, u) && !u.mission);
  const secs = [];
  for (const r of rows) for (const c of b.cols) { const s = G.idx(r, c); if (s >= 0) secs.push(s); }
  const usable = bats.filter(u => secs.some(s => inRange(g, u, s)));
  if (!usable.length || !secs.length) return;
  if (!spend(g, 'att', usable.length * SUPP.costs.barrage)) { b.dry = true; return; }
  // A barrage faster than a row an hour sweeps several rows in the hour and dwells on each for 1/rate of it.
  const s = SUPP.max * Math.min(1, usable.length * BARRAGE.perBattery / secs.length) * Math.min(1, 1 / b.rate);
  for (const sec of secs) for (const u of g.occ[sec]) if (u.side === 'def') {
    addSupp(u, s);
    artyLoss(g, u, SUPP.light * exposure(g, u) * Math.min(1, usable.length / secs.length));
  }
  for (const u of usable) { u.firedAt = g.t; u.mission = 'barrage'; }
  g.barHist[g.t] = { rows, cols: b.cols.slice() };
}

// ---- Missions ----

/** SOS: standing defensive barrage on the first SOS sector where attackers were seen (Hunzeker p. 75). */
function fireSOS(g) {
  for (const b of g.units) {
    if (b.side !== 'def' || !b.sos || !b.sos.length || !ready(g, b) || b.mission) continue;
    const sec = b.sos.find(s => g.spot.def[s] && g.occ[s].some(u => u.side === 'att') && inRange(g, b, s));
    if (sec == null || !spend(g, 'def', SUPP.costs.sos)) continue;
    b.mission = 'sos'; b.firedAt = g.t;
    for (const u of g.occ[sec]) if (u.side === 'att') { addSupp(u, SUPP.one); artyLoss(g, u, SUPP.light * exposure(g, u)); }
  }
}

function fireMissions(g, rng) {
  const due = g.missions.filter(m => !m.done && m.due === g.t);
  const bySec = new Map();
  for (const m of due) {
    m.done = true;
    const b = g.units[g.ix[m.bat]];
    if (!b || !ready(g, b) || b.mission || !inRange(g, b, m.sec)) { m.failed = true; continue; }
    const cost = SUPP.costs[m.m] ?? 1;
    if (m.m === 'precision') { if (!(g.precision[b.side] > 0)) { m.failed = true; continue; } g.precision[b.side]--; }
    else if (!spend(g, b.side, cost)) { m.failed = true; continue; }
    b.mission = m.m; b.firedAt = g.t;
    if (m.m === 'suppress') { const k = `${b.side}:${m.sec}`; bySec.set(k, (bySec.get(k) || 0) + 1); continue; }
    if (m.m === 'destroy') destroy(g, b.side, m.sec);
    else if (m.m === 'gas' && ERAS[g.era].gas) { g.gas[m.sec] = GAS.hours; g.gasAge[m.sec] = 0; }
    else if (m.m === 'smoke') g.smokeNow[m.sec] = 1;
    else if (m.m === 'cb') counterBattery(g, b, m.target, rng);
    else if (m.m === 'precision') precision(g, b, m.target, m.sec);
  }
  for (const [k, n0] of bySec) {
    const [side, s] = k.split(':'), sec = +s;
    // W3: Modern card CA3 (drone-fires link): Suppress on a sector the side's drones watch this hour lands as one
    // battery more (the drone corrects the fall of shot). NOTIONAL.
    const link = g.era === 'm' && g.droneSeen[side][sec] >= g.t && g.units.some(d => d.side === side && d.type === 'drone' && alive(d) && knows(d, 'CA3'));
    const n = n0 + (link ? 1 : 0);
    for (const u of g.occ[sec]) if (u.side === other(side)) { addSupp(u, suppOf(n)); artyLoss(g, u, SUPP.light * n * exposure(g, u)); }
  }
}

function destroy(g, side, sec) {
  const f = g.sectors.feat, run = g.destroyRun[sec];
  const n = run && run.last === g.t - 1 ? run.n + 1 : run && run.last === g.t ? run.n : 1;
  g.destroyRun[sec] = { last: g.t, n };
  const k = n >= SUPP.destroyHours ? 1 : 0.5;
  f.obst[sec] = Math.max(0, f.obst[sec] - SUPP.destroyObst * k);
  if (f.trench[sec] || f.strong[sec]) f.wear[sec] = Math.min(0.6, f.wear[sec] + SUPP.destroyCover * k);
  f.churn[sec] = 1;
  for (const u of g.occ[sec]) if (u.side === other(side)) { addSupp(u, SUPP.one); artyLoss(g, u, SUPP.destroyLoss * k); }
  if (side === 'att' && !g.warnT) { g.warnT = g.t; g.events.push({ t: g.t, kind: 'warning', side: 'def', sec }); }
}

function counterBattery(g, b, targetId, rng) {
  const e = targetId != null ? g.units[g.ix[targetId]] : null;
  if (!e || !isBattery(e) || e.broken || !e.located) return;
  if (rng.u() < CB.neutral) e.neutral = g.t + 1;
  if (rng.u() < CB.kill[g.era]) {
    e.guns = Math.max(0, e.guns - 1);
    if (e.guns <= 0) { e.broken = true; g.events.push({ t: g.t, kind: 'break', side: e.side, unit: e.id, sec: e.sec }); }
  }
  g.events.push({ t: g.t, kind: 'cb', side: b.side, unit: e.id, vis: [b.side] });
}

function precision(g, b, targetId, sec) {
  const e = targetId != null ? g.units[g.ix[targetId]] : null;
  if (!e || !alive(e) || e.side === b.side) return;
  const seen = g.exactNow[b.side].has(e.id) || (isBattery(e) && e.located);
  if (!seen) return;
  if (isBattery(e)) { e.guns = Math.max(0, e.guns - e.guns0 * PRECISION.asset); if (e.guns < 0.5) e.broken = true; }
  else if (e.type === 'drone' || e.type === 'ew') artyLoss(g, e, PRECISION.asset, 'ar');
  else artyLoss(g, e, (e.X ?? 0.2) >= PRECISION.xCut ? PRECISION.exposed : PRECISION.covered, 'ar');
  g.events.push({ t: g.t, kind: 'precision', side: b.side, unit: e.id, sec: e.sec, vis: [b.side] });
}

/** Each battery that fired is located by the enemy with p (sound ranging, air spotting; drones). */
function locate(g, rng) {
  for (const b of g.units) {
    if (!isBattery(b) || b.firedAt !== g.t || b.located) continue;
    const foe = other(b.side);
    let p = CB.locate[g.era];
    if (g.era === 'w' && g.airUp[foe]) p += CB.air;
    if (g.era === 'm' && b.sec >= 0 && g.droneSeen[foe][b.sec] >= g.t) p += CB.drone;
    if (rng.u() < p) { b.located = true; g.events.push({ t: g.t, kind: 'located', side: foe, unit: b.id, vis: [foe] }); }
  }
}

/** Defender field batteries hit tanks within 2 sectors by direct fire (SPEC §3.9). */
function gunsVsTanks(g) {
  const G = gridFor(g.scale);
  for (const b of g.units) {
    if (b.type !== 'field' || b.sec < 0 || !ready(g, b) || b.mission) continue;
    for (const u of g.units) {
      if (u.side === b.side || !isVehicle(u) || !alive(u) || G.dist(u.sec, b.sec) > 2 || !los(G, g.sectors.elev, b.sec, u.sec, g.smokeNow)) continue;
      const sup = g.occ[u.sec].some(v => v.side === u.side && TYPES[v.type].line);
      const k = Math.min(1, FIRE.fieldVsTank * (sup ? 1 : FIRE.unsupported) * (knows(u, 'CA3') && !sup ? 0.5 : 1));
      const l = u.str * k; u.str -= l; u.lossH = (u.lossH || 0) + l; (u.inc ||= { fr: 0, fl: 0, ar: 0, dr: 0 }).ar += l;
    }
  }
}

/** Gas: units in a gassed sector are suppressed (masked and slowed); 2% losses in the first hour only. */
function gasEffects(g) {
  for (let s = 0; s < g.gas.length; s++) {
    if (!g.gas[s]) continue;
    for (const u of g.occ[s]) {
      if (!isCompany(u)) continue;
      addSupp(u, GAS.supp * (g.gasAge[s] === 0 ? 1 : GAS.mask) * (knows(u, 'CA2') && g.gasAge[s] > 0 ? 0.5 : 1));
      if (g.gasAge[s] === 0) artyLoss(g, u, GAS.firstLoss);
    }
  }
}

/** The fire phase of the hour (SPEC §3.1 step 2): barrage, SOS, missions, CB, gas/smoke/precision, tanks. */
export function firePhase(g, rng) {
  for (const b of g.units) if (isBattery(b)) b.mission = null;
  if (g.t === 0 && g.prep && g.prep.kind === 'hurricane') hurricane(g);
  fireBarrage(g);
  fireMissions(g, rng);
  fireSOS(g);
  gasEffects(g);
  gunsVsTanks(g);
  locate(g, rng);
}

// ---- Preparation (resolved at H-hour) ----

function hurricane(g) {
  const G = gridFor(g.scale), S = G.S;
  for (let r = S.bands.outpost[0]; r <= S.bands.battle[0]; r++) for (const c of g.prep.cols) {
    const s = G.idx(r, c);
    for (const u of g.occ[s]) if (u.side === 'def') { addSupp(u, SUPP.max); u.stun = 1; }
  }
}

/** Apply the attacker's preparation before H-hour (SPEC §3.8). Returns the warning given to the defender. */
export function preparation(g, plan) {
  const att = g.units.filter(u => u.side === 'att' && isBattery(u));
  const cols = plan.mainCols || [];
  g.prep = { kind: plan.prep || 'none', cols };
  if (plan.prep === 'hurricane') {
    spend(g, 'att', att.length);
    if (!att.every(b => knows(b, 'CA1'))) {   // W3: predicted fire needs card CA1 (a plan cannot just declare it)
      g.warn = { level: 'partial', cols, p: PREP.partialWarn };
      g.events.push({ t: 0, kind: 'warning', side: 'def', level: 'partial', cols, text: 'registration fire observed' });
    }
  } else if (plan.prep === 'methodical') {
    const max = PREP.sectorsPerGroup * Math.ceil(att.length / PREP.groupSize);
    const secs = (plan.prepTargets || []).slice(0, max);
    spend(g, 'att', Math.min(g.ammo.att, PREP.methodicalCost * secs.length));
    const f = g.sectors.feat;
    for (const s of secs) {
      f.obst[s] = 0; f.churn[s] = 1;
      if (f.trench[s] || f.strong[s]) f.wear[s] = Math.min(0.6, f.wear[s] + 0.3);
      for (const u of g.units) if (u.side === 'def' && u.sec === s && alive(u)) {
        const fe = f.strong[s] ? 0.1 : f.trench[s] ? 0.5 : 0.2;
        const l = u.str * PREP.methodicalLoss * fe * 2 * (f.dugout[s] ? 1 - SUPP.dugout : 1);
        u.str -= l; (u.inc ||= { fr: 0, fl: 0, ar: 0, dr: 0 }).ar += l;
      }
    }
    g.warn = { level: 'full', cols };
    g.preOrders = { def: PREP.preOrders };
    g.events.push({ t: 0, kind: 'warning', side: 'def', level: 'full', cols });
  }
  if (plan.c2) g.c2 = true;
}
