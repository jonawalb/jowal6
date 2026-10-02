// Defender planner (SPEC §1.2, §5.3): the Standard AI's plan and the player's "Auto-plan (doctrinal)" button.
// Returns the same plan object as js/plan-def.js. It starts from the engine's doctrinal layout and applies the
// profile: Standard = elastic depth (f_r 0.35-0.45, lateral MG lanes on the flanks of likely axes, reverse-slope
// battle zone, a garrison on the objective line); Hard adds greedy lane optimization and dummy positions forward;
// Easy = forward-heavy (>= 60% forward, Hold, frontal lanes, f_r ~ 0.2). The defender knows its own ground; it
// does not know the attacker's plan (it guesses the likely axes from the terrain an attacker would want).
import { STACK } from '../../data/params.js';
import { SCALES } from '../../data/scales.js';
import { TERRAIN, WORKS } from '../../data/terrain.js';
import { TYPES } from '../../data/units.js';
import { gridFor, laneCells, opp } from '../grid.js';
import { isBattery, isCompany } from '../forces.js';
import { defaultDefPlan, zoneShares, wpSpent } from '../plan-def.js';
import { resolve } from './profiles.js';

/** How attractive each column is to an attacker (dead ground, easy going), from the defender's map. */
export function approachScores(g) {
  const G = gridFor(g.scale), S = SCALES[g.scale], out = [];
  for (let c = 0; c < G.cols; c++) {
    let s = 0;
    for (let r = S.bands.outpost[0]; r <= S.obj.row; r++) { const T = TERRAIN[g.sectors.terrain[G.idx(r, c)]]; s += 2 * T.g0 - 0.5 * (T.move - 1) + 0.5 * T.all; }
    out.push(s);
  }
  return out;
}

/** Planner. profile: a profiles.js key, level or object (default Standard). rng: unused (deterministic). */
export function planDef(g, profile, rng) {
  const P0 = resolve(profile, 'def', g.diff);
  const P = P0.planAs ? resolve(P0.planAs, 'def', g.diff) : P0;   // W3: Easy plans badly, reacts like Standard
  const G = gridFor(g.scale), S = SCALES[g.scale], B = S.bands;
  const plan = defaultDefPlan(g);
  plan.ai = { profile: P.key };
  const units = g.units.filter(u => u.side === 'def');
  const load = new Map();
  for (const u of units) if (isCompany(u) && plan.place[u.id] != null) load.set(plan.place[u.id], (load.get(plan.place[u.id]) || 0) + 1);
  const moveTo = (u, r, c) => {
    for (let k = 0; k < 2 * G.cols; k++) {
      const cc = Math.max(0, Math.min(G.cols - 1, c + (k % 2 ? -1 : 1) * Math.ceil(k / 2))), s = G.idx(r, cc);
      if ((load.get(s) || 0) >= STACK.max - 1) continue;
      const old = plan.place[u.id];
      if (old != null) load.set(old, (load.get(old) || 1) - 1);
      load.set(s, (load.get(s) || 0) + 1); plan.place[u.id] = s;
      return s;
    }
    return plan.place[u.id];
  };
  const scores = approachScores(g);
  const order = scores.map((s, c) => [s, c]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  const inf = u => isCompany(u) && TYPES[u.type].fp && !isBattery(u);
  if (P.stack) {
    // Proxy "stack forward" (anti-cheese check, SPEC §9.2): everything in the outpost zone and first trench row, Hold.
    const rowsF = [B.outpost[0], B.outpost[1], B.battle[0]];
    let k = 0;
    for (const u of units) {
      if (isBattery(u) || !isCompany(u)) continue;
      moveTo(u, rowsF[Math.floor(k / G.cols) % rowsF.length], k % G.cols); k++;
      plan.stance[u.id] = 'hold';
    }
    return plan;
  }
  if (P.key === 'forwardHeavy') {
    // Pull the battle-zone and depth companies, then counterstroke companies, forward until the share is met.
    const movable = units.filter(u => inf(u) && ['front', 'depth', 'strong', 'mortar'].includes(u.role));
    for (const u of movable) { if (zoneShares(g, plan.place).fwd >= P.fwdShare) break; moveTo(u, B.battle[0], G.col[plan.place[u.id]]); }
    const cs = units.filter(u => inf(u) && u.role === 'cs' && u.type === 'rifle');
    for (const u of cs) { if (zoneShares(g, plan.place).fr <= P.fr + 0.02) break; moveTo(u, B.battle[0], G.col[plan.place[u.id]]); }
    for (const u of units) {
      if (plan.stance[u.id] && plan.stance[u.id] !== 'reserve') plan.stance[u.id] = 'hold';
      if (u.type === 'mg' && plan.lanes[u.id] != null && u.role !== 'cs' && P.lanes === 'frontal') plan.lanes[u.id] = 4;   // frontal lanes
    }
    return plan;
  }
  // Elastic depth: a garrison on the objective line (the rear position) in the likeliest columns until f_r is
  // about 0.4, taken from the depth battalion (Biddle p. 221: f_r 0.3-0.5).
  const depth = units.filter(u => inf(u) && u.role === 'depth').sort((a, b) => (a.type === 'mg') - (b.type === 'mg'));
  let k = 0;
  if (P.garrison === 'interval') {
    // Every window of `need` objective sectors holds a garrison, so no contiguous run can be taken without a fight.
    const need = S.obj.need, cols = [];
    for (let c = need - 1; c < G.cols; c += need) cols.push(c);
    if (G.cols - 1 - cols[cols.length - 1] >= need) cols.push(G.cols - 1);
    const pool = depth.concat(units.filter(u => inf(u) && u.role === 'front' && u.type === 'rifle'));
    for (const c of cols) { const u = pool.shift(); if (!u) break; moveTo(u, S.obj.row, c); plan.stance[u.id] = 'hold'; }
  } else for (const u of depth) {
    if (u.type !== 'rifle' || zoneShares(g, plan.place).fr >= P.fr - 0.02) continue;
    moveTo(u, S.obj.row, order[k++ % order.length]);
    plan.stance[u.id] = 'hold';
  }
  for (const u of units) if (plan.place[u.id] != null && G.row[plan.place[u.id]] === S.obj.row && inf(u) && u.role !== 'cs') plan.stance[u.id] = 'hold';
  // Counterstroke companies yield rather than die where they wait (they still attack as a formation).
  if (P.csStance && P.csStance !== 'reserve') for (const u of units) if (plan.stance[u.id] === 'reserve') plan.stance[u.id] = P.csStance;
  // Strongpoint MGs on the flanks of the likeliest axes (Standard keeps the doctrinal lateral lanes; Hard optimizes).
  if (P.lanes === 'greedy') greedyLanes(g, plan, scores);
  if (P.lanes === 'none') for (const u of units) if (u.type === 'mg') delete plan.lanes[u.id];
  if (P.lanes === 'frontal') for (const u of units) if (u.type === 'mg' && plan.lanes[u.id] != null && !['cs', 'corpsCs', 'armyRes'].includes(u.role)) plan.lanes[u.id] = 4;
  if (P.riposte === false) for (const u of units) if (plan.stance[u.id] === 'riposte') plan.stance[u.id] = 'elastic';
  if (P.stanceAll) for (const u of units) if (plan.stance[u.id] && plan.stance[u.id] !== 'reserve' && !['cs', 'corpsCs', 'armyRes'].includes(u.role)) plan.stance[u.id] = P.stanceAll;   // W3: e.g. 'hold' (micro-battles: the old way)
  if (P.dummies) dummies(g, plan, order, P.dummies);
  // Modern: drones watch the likeliest approach; the jammer covers no-man's land in front of it.
  for (const u of units) {
    if (u.type === 'drone') plan.drones[u.id] = G.idx(B.outpost[0], order[0]);
    if (u.type === 'ew') plan.ew[u.id] = G.idx(B.nml[0], order[0]);
  }
  return plan;
}

/**
 * Hard: lay every MG lane greedily to maximize the number of fire directions over the outpost and battle zones
 * (capped at 3; 2+ defeats dead ground and infiltration, Biddle p. 44), weighted toward the likeliest approach
 * columns, with a bonus for lateral lanes that enfilade waves coming up the columns.
 */
function greedyLanes(g, plan, scores) {
  const G = gridFor(g.scale), S = SCALES[g.scale], el = g.sectors.elev;
  const lo = S.bands.outpost[0], hi = S.obj.row;
  const mx = Math.max(...scores), mn = Math.min(...scores);
  const wcol = scores.map(s => 1 + (mx > mn ? (s - mn) / (mx - mn) : 0));
  const mask = new Uint8Array(G.n);
  const mgs = [];
  for (const u of g.units) {
    if (u.side !== 'def' || !TYPES[u.type].fp || !isCompany(u)) continue;
    const s = plan.place[u.id];
    if (s == null) continue;
    for (const d of [4, 3, 5]) { const c = G.at(s, d); if (c >= 0) mask[c] |= 1 << opp(d); }
    if (u.type === 'mg' && u.role !== 'cs' && u.role !== 'corpsCs' && u.role !== 'armyRes') mgs.push(u);
  }
  const bits = x => { let n = 0; while (x) { n += x & 1; x >>= 1; } return n; };
  const val = (c, m) => (G.row[c] < lo || G.row[c] > hi ? 0 : Math.min(3, bits(m)) * wcol[G.col[c]]);
  for (const u of mgs) {
    const s = plan.place[u.id];
    let best = plan.lanes[u.id] ?? 2, bv = -Infinity;
    for (let d = 0; d < 8; d++) {
      const cells = laneCells(G, el, s, d);
      let v = 0;
      for (const c of cells) v += val(c, mask[c] | (1 << opp(d))) - val(c, mask[c]) + ((d === 2 || d === 6) ? 0.4 * wcol[G.col[c]] : 0);
      if (v > bv) { bv = v; best = d; }
    }
    plan.lanes[u.id] = best;
    for (const c of laneCells(G, el, s, best)) mask[c] |= 1 << opp(best);
  }
}

/** Hard: dummy positions forward in the likeliest columns (they look like strongpoints; 1 WP each). */
function dummies(g, plan, order, n) {
  const G = gridFor(g.scale), S = SCALES[g.scale];
  while (S.wp - wpSpent(plan) < n * WORKS.dummy.wp) {
    const kinds = plan.works.map(w => w.kind), i = Math.max(kinds.lastIndexOf('dugout'), kinds.lastIndexOf('obstC'));
    if (i < 0) break;
    plan.works.splice(i, 1);
  }
  const rows = [S.bands.outpost[1], S.bands.battle[0] + 1];
  for (let k = 0; k < n; k++) {
    const s = G.idx(rows[k % 2], order[Math.floor(k / 2) % order.length]);
    if (s >= 0 && !plan.works.some(w => w.sec === s)) plan.works.push({ sec: s, kind: 'dummy' });
  }
}
