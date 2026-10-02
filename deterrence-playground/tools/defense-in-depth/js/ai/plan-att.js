// Attacker planner (SPEC §1.2, §5.3): the Standard AI's plan and the player's "Auto-plan (doctrinal)" button.
// Returns the same plan object as js/plan-att.js (the Plan UI edits it). It reads only what the attacker
// knows before H-hour: the public map and the defender works its air photographs show (g.known.att, Biddle
// p. 44). Profiles (js/ai/profiles.js) bend it: Standard/Hard = modern-system assault; Easy = massed waves.
import { STACK, SUPP, PREP } from '../../data/params.js';
import { SCALES } from '../../data/scales.js';
import { TERRAIN } from '../../data/terrain.js';
import { gridFor } from '../grid.js';
import { TYPES } from '../../data/units.js';
import { isBattery } from '../forces.js';
import { findPath } from '../move.js';
import { resolve } from './profiles.js';

/** Width of the main effort by scale (2 / 3 / 4 columns; SPEC §5.2). */
export const mainWidth = g => { const d = SCALES[g.scale].divs; return d === 1 ? 2 : d === 2 ? 3 : 4; };

/**
 * Column scores for a main effort from the attacker's knowledge: dead ground and easy going on the approach,
 * minus the works it has seen (trenches, strongpoints, wire). Higher is better.
 */
export function columnScores(g) {
  const G = gridFor(g.scale), S = SCALES[g.scale], K = g.known.att, out = [];
  for (let c = 0; c < G.cols; c++) {
    let s = 0;
    for (let r = S.bands.outpost[0]; r <= S.obj.row; r++) {
      const i = G.idx(r, c), T = TERRAIN[g.sectors.terrain[i]];
      s += 2 * T.g0 - 0.5 * (T.move - 1) + 0.5 * T.all;
      if (K[i] & 8 && !(K[i] & 16)) s -= 1.5;      // a strongpoint (or a dummy it cannot yet tell apart)
      if (K[i] & 4) s -= 0.6;
      if (K[i] & 1) s -= 0.15;
    }
    out.push(s);
  }
  return out;
}

/** The best contiguous window of `w` columns by score (ties broken by the planner's rng, then centrality). */
export function bestWindow(g, w, scores, rng, avoid = null) {
  const G = gridFor(g.scale);
  let best = null, bs = -Infinity;
  for (let c0 = 0; c0 + w <= G.cols; c0++) {
    if (avoid && avoid.some(c => c >= c0 - 1 && c <= c0 + w)) continue;
    let s = 0;
    for (let c = c0; c < c0 + w; c++) s += scores[c];
    s -= 0.05 * Math.abs(c0 + w / 2 - G.cols / 2) - (rng ? 0.3 * rng.u() : 0);
    if (s > bs) { bs = s; best = c0; }
  }
  return best == null ? null : Array.from({ length: w }, (_, i) => best + i);
}

/** Planner. profile: a profiles.js key, level or object (default Standard). rng: g.rng.planAi or any rng. */
export function planAtt(g, profile, rng) {
  const P0 = resolve(profile, 'att', g.diff);
  const P = P0.planAs ? resolve(P0.planAs, 'att', g.diff) : P0;   // W3: Easy plans badly, reacts like Standard
  const G = gridFor(g.scale), S = SCALES[g.scale], B = S.bands, objRow = S.obj.row;
  const scores = columnScores(g);
  const all = Array.from({ length: G.cols }, (_, c) => c);
  const w = P.width ? Math.min(G.cols, P.width) : P.front === 'broad' ? G.cols : P.front === 'narrow' ? Math.max(1, mainWidth(g) - 1) : P.front === 'single' ? (S.divs === 1 ? 1 : 2) : mainWidth(g);
  const mainCols = w >= G.cols ? all : bestWindow(g, w, scores, rng);
  const plan = { mainCols, place: {}, bn: {}, form: {}, posture: {}, orders: [], routes: {}, prep: P.prep || 'none', predicted: true, prepTargets: [],
    barrage: null, bats: {}, ds: {}, reserves: {}, objective: { type: 'breakthrough' }, engineers: {}, ew: {}, ai: { profile: P.key, feint: null } };
  const load = new Map();
  const put = (u, r, c) => {
    for (let k = 0; k < 4 * G.cols; k++) {
      const rr = k >= 2 * G.cols ? 1 - r : r, cc = Math.max(0, Math.min(G.cols - 1, c + (k % 2 ? -1 : 1) * Math.ceil((k % (2 * G.cols)) / 2))), s = G.idx(rr, cc);
      if ((load.get(s) || 0) < STACK.max) { load.set(s, (load.get(s) || 0) + 1); plan.place[u.id] = s; return s; }
    }
    return -1;
  };
  const att = g.units.filter(u => u.side === 'att' && !isBattery(u));
  const quiet = all.filter(c => !mainCols.includes(c));
  // Fixing attacks (Biddle's rho2, p. 47): one second-wave company per other column, holding in no-man's land.
  const fixing = new Set();
  if (P.fixing) {
    const fixers = att.filter(u => u.role === 'wave2' && u.type === 'rifle').slice(0, quiet.length);
    fixers.forEach((u, i) => { put(u, 1, quiet[i]); plan.form[u.id] = 'groups'; plan.orders.push({ unit: u.id, to: G.idx(B.nml[0], quiet[i]) }); fixing.add(u.id); });
  }
  const form = P.form === 'groups' ? 'groups' : 'waves';
  let mi = 0;
  const byBn = new Map(), wave1 = [];
  for (const u of att) {
    if (fixing.has(u.id)) continue;
    const c = mainCols[mi++ % mainCols.length];
    plan.form[u.id] = u.type === 'tank' ? 'groups' : form;
    if (P.allInfil && TYPES[u.type].line) {
      put(u, u.role === 'wave1' || u.role === 'storm' ? 1 : 0, c);
      const to = G.idx(objRow, c);
      plan.posture[u.id] = 'infil'; plan.orders.push({ unit: u.id, to });
      const route = infilRoute(g, plan.place[u.id], to); if (route.length) plan.routes[u.id] = route;
      continue;
    }
    if (P.reserves === 'all') { put(u, u.role === 'wave1' || u.role === 'storm' ? 1 : 0, c); plan.posture[u.id] = 'rush'; plan.orders.push({ unit: u.id, to: G.idx(objRow, c) }); continue; }
    if (u.role === 'storm') {
      put(u, 1, c);
      plan.posture[u.id] = P.infil ? 'infil' : 'rush';
      const to = G.idx(objRow, c);
      plan.orders.push({ unit: u.id, to });
      if (P.infil) { const route = infilRoute(g, plan.place[u.id], to); if (route.length) plan.routes[u.id] = route; }
      continue;
    }
    if (u.role === 'wave1') { put(u, 1, c); const bn = u.fmn[u.fmn.length - 1]; if (!byBn.has(bn)) byBn.set(bn, []); byBn.get(bn).push(u); wave1.push(u); continue; }
    put(u, 0, c);
    if (u.role === 'mortar') plan.orders.push({ unit: u.id, to: G.idx(B.nml[0], c) });
    if (u.role === 'pioneer' && P.engineers) {
      const obst = firstObstacle(g, c);
      plan.engineers[u.id] = obst >= 0 ? obst : G.idx(B.outpost[0], c);   // the outpost wire line is where wire usually is
    }
    if (P.reserves === 'timer' && (u.role === 'wave2' || u.role === 'echelon2')) plan.posture[u.id] = 'rush';
  }
  if (P.leapfrog && P.pairing === false) {
    // No overwatch: every first-wave company bounds on its own (the proxy for "leapfrog without a partner").
    for (const u of wave1) { plan.posture[u.id] = 'bound'; plan.orders.push({ unit: u.id, to: G.idx(objRow, G.col[plan.place[u.id]]) }); }
  } else if (P.leapfrog) {
    // Leapfrog pairs (W3): partners start in the same sector where possible (else next door), rifle with rifle or a
    // rifle with an MG company on overwatch, and both go up the column they start in. Pairs whose members started
    // in different columns lost their overwatch (out of reach of the bound target) and jammed the main effort.
    const left = [...wave1.filter(u => u.type !== 'mg'), ...wave1.filter(u => u.type === 'mg')];
    while (left.length) {
      const u = left.shift(), su = plan.place[u.id];
      let qi = left.findIndex(q => plan.place[q.id] === su);
      if (qi < 0) qi = left.findIndex(q => G.adj(plan.place[q.id], su));
      const to = G.idx(objRow, G.col[su]);
      if (qi < 0) { plan.orders.push({ unit: u.id, to }); continue; }
      const q = left.splice(qi, 1)[0];
      plan.orders.push({ unit: u.id, unit2: q.id, to, to2: to });
    }
  } else {
    // Waves: every first-wave company rushes straight up its own column (broad front: spread over every column).
    wave1.forEach((u, i) => { const c = P.front === 'broad' ? all[i % all.length] : G.col[plan.place[u.id]]; plan.posture[u.id] = 'rush'; plan.orders.push({ unit: u.id, to: G.idx(objRow, c) }); });
  }
  // Batteries: about half on the creeping barrage, the rest on call (Direct support to the first-wave battalions
  // so 1917-18 calls near them land the same hour; Hunzeker pp. 76-77).
  const bats = g.units.filter(u => u.side === 'att' && isBattery(u));
  const nb = Math.max(1, Math.ceil(bats.length / 2));
  bats.forEach((b, i) => { plan.bats[b.id] = i < nb ? 'barrage' : 'call'; });
  const bnIds = [...byBn.keys()];
  if (P.ds) bats.slice(nb).forEach((b, i) => { if (bnIds.length) plan.ds[b.id] = bnIds[i % bnIds.length]; });
  const bcols = P.front === 'broad' ? all : mainCols;
  plan.barrage = P.barrage === false ? null : { cols: bcols, r0: B.outpost[0], rate: P.rate, bats: bats.slice(0, nb).map(b => b.id), stop: objRow + 1 };
  if (!plan.barrage) for (const b of bats) plan.bats[b.id] = 'call';
  const perHour = nb * SUPP.costs.barrage, hours = Math.ceil((objRow + 1 - B.outpost[0]) / P.rate) + 1;
  if (P.prep === 'methodical') {
    const K = g.known.att, tg = [];
    // Before H-hour the attacker knows the mapped trench lines (the scale's inherited trench rows; Biddle p. 44).
    for (let r = B.outpost[0]; r <= B.battle[0]; r++) for (const c of all) { const i = G.idx(r, c); if (K[i] & 8 || K[i] & 4) tg.push(i); }
    for (const r of S.freeTrench.filter(x => x >= B.outpost[0] && x <= B.battle[0])) for (const c of all) { const i = G.idx(r, c); if (!tg.includes(i)) tg.push(i); }
    const max = PREP.sectorsPerGroup * Math.ceil(bats.length / PREP.groupSize);
    plan.prepTargets = tg.slice(0, max);
    while (plan.prepTargets.length && PREP.methodicalCost * plan.prepTargets.length + perHour * hours > g.ammo.att) plan.prepTargets.pop();
  }
  const left = g.ammo.att - (plan.prep === 'hurricane' ? bats.length : PREP.methodicalCost * plan.prepTargets.length);
  if (plan.barrage && perHour * hours > 0.6 * left) plan.barrage.stop = Math.max(B.outpost[0] + 1, B.outpost[0] + Math.floor(0.6 * left / perHour * P.rate) - 1);
  // Second echelon: committed by the hourly policy (follow success) or on a timer (massed waves).
  for (const f of Object.values(g.fmns)) if (f.side === 'att' && f.role === 'echelon2') plan.reserves[f.id] = { mode: 'assembly' };
  for (const u of g.units) if (u.side === 'att' && u.type === 'ew') plan.ew[u.id] = G.idx(B.battle[0], mainCols[Math.floor(mainCols.length / 2)]);
  if (P.feint && quiet.length >= w) plan.ai.feint = bestWindow(g, Math.min(2, w), scores.map(x => -x), rng, mainCols);
  return plan;
}

/** First known obstacle in a column between the outpost line and the first battle-zone row, or -1. */
function firstObstacle(g, c) {
  const G = gridFor(g.scale), S = SCALES[g.scale], K = g.known.att;
  for (let r = S.bands.nml[0]; r <= S.bands.battle[0]; r++) { const i = G.idx(r, c); if (K[i] & 4) return i; }
  return -1;
}

/**
 * Infiltration route (SPEC §1.2 step 4): a path that avoids sectors next to seen strongpoints and trench lines
 * where possible (covered by >= 2 believed directions), from the attacker's start knowledge only.
 */
export function infilRoute(g, from, to) {
  const G = gridFor(g.scale), K = g.known.att, avoid = new Uint8Array(G.n);
  for (let s = 0; s < G.n; s++) {
    if (!(K[s] & 8) || (K[s] & 16)) continue;
    avoid[s] = 1;
    for (const c of G.nbrs[s]) if (G.row[c] === G.row[s]) avoid[c] = 1;
  }
  if (from < 0 || to < 0) return [];
  const p = findPath(g, from, to, { avoid });
  return p.length ? p : findPath(g, from, to, {});
}
