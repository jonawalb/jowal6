// Movement (SPEC §3.6, §3.9, §3.11): progress accumulators, posture speeds, leapfrog (Hunzeker p. 56,
// "akin to playing a game of leapfrog, albeit with guns"; 50-100-yd bounds p. 70), infiltration and its
// detection, obstacles and breaching, the barrage coordination check, overwatch suppression and the survival
// of units moving under observation, P = T^(-k2' v) (Biddle A.5, p. 212).
import { SPEED, OVERWATCH, DETECT, OBSTACLE, BIDDLE, BARRAGE, TANK, GROUND, STACK, GAS } from '../data/params.js';
import { TERRAIN, CHURN } from '../data/terrain.js';
import { TYPES } from '../data/units.js';
import { SCALES } from '../data/scales.js';
import { gridFor, los, popcount } from './grid.js';
import { alive, fighting, other, companies, isCompany, isVehicle, knows } from './forces.js';
import { addSupp, barrageCase, artyLoss } from './arty.js';
import { exposure, disengage } from './fire.js';

/** Movement cost of entering sector s (terrain + churned ground). */
export const moveCost = (g, s) => TERRAIN[g.sectors.terrain[s]].move + (g.sectors.feat.churn[s] ? CHURN.move : 0);

// A small binary heap for path search.
function heap() {
  const a = [];
  return {
    push(k, v) { a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } },
    pop() { const top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; },
    get size() { return a.length; },
  };
}

/**
 * Cheapest path from a to b (excluding a). opts: { side, avoid: Uint8Array of sectors to avoid (except b),
 * covered: weight sectors by believed enemy fire, comm: prefer communication trenches }.
 */
export function findPath(g, a, b, opts = {}) {
  const G = gridFor(g.scale);
  if (a === b || a < 0 || b < 0) return [];
  const dist = new Float64Array(G.n).fill(Infinity), prev = new Int32Array(G.n).fill(-1), h = heap();
  dist[a] = 0; h.push(0, a);
  const spot = opts.side ? g.spot[opts.side] : null;
  while (h.size) {
    const [d, i] = h.pop();
    if (i === b) break;
    if (d > dist[i]) continue;
    for (let k = 0; k < 8; k++) {
      const j = G.at(i, k);
      if (j < 0 || (opts.avoid && opts.avoid[j] && j !== b)) continue;
      let c = moveCost(g, j) * (k & 1 ? SPEED.diagonal : 1);
      if (opts.covered && spot) { let n = 0; for (const x of G.nbrs[j]) n += spot[x] ? 1 : 0; c += 0.5 * n + (spot[j] ? 2 : 0); }
      if (opts.comm && g.sectors.feat.comm[j]) c *= 0.7;
      const nd = d + c + Math.abs(G.col[j] - G.col[b]) * 1e-3;
      if (nd < dist[j]) { dist[j] = nd; prev[j] = i; h.push(nd, j); }
    }
  }
  if (prev[b] < 0) return [];
  const out = [];
  for (let i = b; i !== a; i = prev[i]) out.unshift(i);
  return out;
}

/** Plan a unit's route to dest by its posture (infiltrators avoid believed enemy sectors). */
export function routeUnit(g, u, dest) {
  u.dest = dest;
  const opts = { side: u.side, covered: u.posture === 'infil' || u.prefer === 'covered', comm: u.mode === 'covered' };
  if (u.posture === 'infil') opts.avoid = g.spot[u.side];
  u.path = findPath(g, u.sec, dest, opts);
  if (!u.path.length && opts.avoid) u.path = findPath(g, u.sec, dest, { side: u.side });
}

/** In contact: in, or next to, a sector the enemy holds, or inside an enemy lane (SPEC §3.6 footnote). */
export function inContact(g, u, sec = u.sec) {
  const G = gridFor(g.scale), foe = other(u.side);
  if (g.laneHit[foe][sec]) return true;
  for (const c of [sec, ...G.nbrs[sec]]) for (const v of g.occ[c]) if (v.side === foe && isCompany(v)) return true;
  return false;
}

const enemyHeld = (g, s, side) => g.occ[s].some(v => v.side === other(side) && isCompany(v));
const canStealth = u => TYPES[u.type].stealth || knows(u, 'AT2');

/** Speed this hour in sectors (SPEC §3.6, §3.11). */
function speedOf(g, u, contact) {
  const S = SCALES[g.scale], G = gridFor(g.scale);
  let v;
  if (u.type === 'tank' && g.era === 'w') v = SPEED.tank1917;
  else if (!contact && (u.mode === 'road' || u.mode === 'covered') && g.ctrl[u.sec] === (u.side === 'def' ? 1 : 2)) v = u.mode === 'road' ? SPEED.road : SPEED.covered;
  else {
    const p = u.posture === 'bound' ? SPEED.bound : u.posture === 'infil' ? SPEED.infil : u.posture === 'withdraw' ? SPEED.withdraw : SPEED.rush;
    v = contact ? p.contact : p.free;
    if (u.side === 'att' && g.breakthrough != null && G.row[u.sec] >= S.obj.row && !contact) v = Math.max(v, u.mode === 'road' ? SPEED.road : SPEED.exploit);
  }
  if (u.posture === 'bound' && u.owOk && contact) v *= SPEED.leapPast;
  if ((u.posture === 'bound' && !u.owOk && !u.travel || u.posture === 'infil' && u.stealth === false && !TYPES[u.type].stealth) && contact) v *= SPEED.lone;   // W3: no covering fire
  else if (u.posture === 'bound' && u.bound !== 'long') v *= SPEED.shortBound;
  if (g.gas[u.sec]) v *= 1 - (1 - GAS.move) * (g.gasAge[u.sec] === 0 ? 1 : GAS.mask);
  return v;
}

function shift(g, u, to) {
  const G = gridFor(g.scale), from = u.sec;
  const arr = g.occ[from]; arr.splice(arr.indexOf(u), 1);
  u.facing = G.dirTo(from, to); u.from = from; u.sec = to;
  g.occ[to].push(u);
  u.gain += u.side === 'att' ? G.row[to] - G.row[from] : G.row[from] - G.row[to];
}

/** Is a fighting enemy company within `r` sectors of any of the given sectors? (Physical proximity of fire.) */
function enemyWithin(g, side, secs, r) {
  const G = gridFor(g.scale), foe = other(side);
  for (const s of secs) {
    if (s == null || s < 0) continue;
    for (let dr = -r; dr <= r; dr++) for (let dc = -r; dc <= r; dc++) {
      const c = G.idx(G.row[s] + dr, G.col[s] + dc);
      if (c >= 0 && g.occ[c].some(v => v.side === foe && isCompany(v) && fighting(v))) return true;
    }
  }
  return false;
}

/**
 * Leapfrog roles for the hour and whether each bounding element has a working overwatch (SPEC §3.6).
 * W3: with no enemy within 2 sectors (1 km) the pair uses traveling overwatch: both elements move and both count
 * as covered (u.travel). If the bounding element's partner cannot watch its target (no line of sight, too far,
 * pinned), the partner does not sit idle: both move as lone bounders until they can watch again.
 */
function leapfrogRoles(g) {
  const G = gridFor(g.scale);
  for (const u of g.units) {
    u.ow = false; u.owOk = false; u.travel = false;
    if (u.pair == null || !fighting(u)) continue;
    const p = g.units[g.ix[u.pair]];
    if (!p || !fighting(p) || p.pair !== u.id) { u.pair = null; continue; }
    if (u.posture !== 'bound' || p.posture !== 'bound') continue;      // paused (e.g. rushing behind the barrage)
    if (!enemyWithin(g, u.side, [u.sec, p.sec, u.path[0], p.path[0]], 1) && ![u.sec, p.sec, u.path[0], p.path[0]].some(s => s != null && g.laneHit[other(u.side)][s])) { u.travel = true; continue; }
    u.ow = !!u.lfOw !== ((g.t - u.lfT0) % 2 === 1);
    if (!u.path.length && p.path.length) u.ow = true;       // at its goal: keeps watching while the partner comes up
    if (!p.path.length && u.path.length) u.ow = false;
  }
  for (const u of g.units) {
    if (u.posture !== 'bound' || u.ow || u.travel || u.pair == null) continue;
    const p = g.units[g.ix[u.pair]];
    const tgt = g.contest[u.sec] ? u.sec : u.path[0];
    u.owTarget = tgt ?? null;
    if (tgt == null || !p.ow) continue;
    u.owOk = !(p.pinned > g.t) && (p.sec === tgt || G.dist(p.sec, tgt) <= 2 && los(G, g.sectors.elev, p.sec, tgt, g.smokeNow));
    if (!u.owOk && p.path.length) p.ow = false;               // the partner cannot watch: it moves up instead of idling
  }
}

/** Overwatch suppression on the defenders the bounding element moves into or assaults. */
function overwatchFire(g) {
  for (const u of g.units) {
    if (!u.owOk || u.owTarget == null) continue;
    const p = g.units[g.ix[u.pair]], foe = other(u.side);
    const believed = g.beliefSec[u.side] ? g.beliefSec[u.side][u.owTarget] : 0;
    const cap = (p.type === 'mg' ? OVERWATCH.cap.mg : p.type === 'storm' ? OVERWATCH.cap.storm : OVERWATCH.cap.rifle) + (knows(p, 'AT3') ? OVERWATCH.at3 : 0);
    const s = Math.min(cap, OVERWATCH.k * p.str / Math.max(1, believed));
    for (const v of g.occ[u.owTarget]) if (v.side === foe) addSupp(v, s);
  }
}

/**
 * The movement step (SPEC §3.1 step 4). rng: the move stream. Units entering a sector the enemy holds
 * start an assault (g.contest). Returns nothing; sets u.moving, u.held, u.gain and the events.
 */
export function moveAll(g, rng) {
  const G = gridFor(g.scale), f = g.sectors.feat, foeOf = other;
  leapfrogRoles(g);
  const order = g.units.filter(u => fighting(u) || (alive(u) && (u.type === 'drone' || u.type === 'ew')));
  // 2026-10-07: attached tanks move after the infantry they are with and follow it (SPEC §1.2 step 7; Biddle p. 61).
  order.sort((a, b) => (a.escort != null) - (b.escort != null));
  for (const u of order) {
    if (u.escort != null) {
      let e = g.units[g.ix[u.escort]];
      if (!e || !fighting(e) || e.sec < 0) e = reattach(g, u);
      if (e && e.sec !== u.sec) routeUnit(g, u, e.sec); else if (e && u.path.length) u.path = [];
    }
    if (!u.path.length || u.ow || u.pinned > g.t || u.down) continue;
    if (g.contest[u.sec] && u.posture !== 'withdraw' && !u.yielding) continue;  // assaulting or holding: no leaving
    if (u.cs && !u.csGo && u.path.length === 1) continue;                       // counterstroke units wait next to the target
    const contact = inContact(g, u);
    u.prog += speedOf(g, u, contact);
    let first = true;
    while (u.path.length) {
      const nx = u.path[0], diag = G.row[nx] !== G.row[u.sec] && G.col[nx] !== G.col[u.sec];
      const cost = moveCost(g, nx) * (diag ? SPEED.diagonal : 1);
      if (u.prog < cost) break;
      if (isCompany(u) && u.escort == null && stacked(g, nx, u.side) >= STACK.max) { u.prog = Math.min(u.prog, cost); break; }   // W3: no banking progress in a jam
      const hostile = enemyHeld(g, nx, u.side);
      if (hostile && u.posture === 'infil' && nx !== u.dest) { routeUnit(g, u, u.dest); break; }
      if (hostile && u.cs && !u.csGo) break;
      if ((g.contest[u.sec] || u.fixed) && first) {
        const l = disengage(g, u, rng);
        if (l > 0) g.events.push({ t: g.t, kind: 'leave', side: u.side, unit: u.id, sec: u.sec, loss: l });
      }
      shift(g, u, nx); u.path.shift(); u.prog -= cost; u.moving = true; u.steps = (u.steps || 0) + 1; first = false;
      if (u.cs && u.csGo) u.ca = 'counterstroke';
      if (hostile) {
        if (!g.contest[nx]) g.contest[nx] = { by: u.side, t: g.t };
        if (!g.firstContact) { g.firstContact = g.t; g.events.push({ t: g.t, kind: 'contact', side: u.side, sec: nx, vis: ['def', 'att'] }); }
        u.prog = 0; break;
      }
      if (f.obst[nx] > 0 && f.breach[nx] < OBSTACLE.breachHours) {
        u.held = true; u.prog = 0;
        if (f.obstC[nx]) { f.obstC[nx] = 0; g.known.att[nx] |= 4; }
        if (isVehicle(u) && u.type === 'tank' && g.era === 'w') f.obst[nx] = 0;       // tanks crush wire (Hunzeker p. 113)
        break;
      }
    }
    if (!u.path.length) { u.prog = 0; if (u.posture === 'withdraw') u.posture = 'hold'; u.yielding = false; }
  }
  // Mines take infantry and vehicles that are held in them.
  if (g.era === 'm') for (const u of order) if (u.held && f.obst[u.sec] > 0) artyLoss(g, u, isVehicle(u) ? OBSTACLE.mineVeh : OBSTACLE.mineInf);
  overwatchFire(g);
  barrageCheck(g, rng);
  tankSupport(g);
  infiltration(g, rng);
  observedMoves(g);
}

/** Companies counted against the stacking limit: an attached tank rides with its company and is not counted. */
const stacked = (g, s, side) => g.occ[s].reduce((n, v) => n + (v.side === side && isCompany(v) && v.escort == null ? 1 : 0), 0);

/** A tank whose company is gone joins the deepest fighting rifle or storm company in or next to its sector, else goes free. */
function reattach(g, u) {
  const G = gridFor(g.scale), taken = new Set(g.units.filter(t => t !== u && t.escort != null).map(t => t.escort));
  const e = g.units.filter(v => v.side === u.side && fighting(v) && TYPES[v.type].line && v.sec >= 0 && G.dist(v.sec, u.sec) <= 1 && !taken.has(v.id))
    .sort((a, b) => (u.side === 'att' ? G.row[b.sec] - G.row[a.sec] : G.row[a.sec] - G.row[b.sec]) || (a.id < b.id ? -1 : 1))[0];
  u.escort = e ? e.id : null;
  return e || null;
}

/** The barrage coordination check for attackers entering or assaulting enemy-held sectors (SPEC §3.8). */
function barrageCheck(g, rng) {
  if (!g.barrage) return;
  const done = new Set();
  for (const s of Object.keys(g.contest)) {
    const sec = +s, c = g.contest[sec];
    if (c.by !== 'att') continue;
    const k = barrageCase(g, sec);
    if (!k) continue;
    for (const u of g.occ[sec]) if (u.side === 'att' && isCompany(u)) u.bc = k;
    if (k === 'early') for (const v of g.occ[sec]) { if (v.side === 'def') addSupp(v, g.units.some(b => b.side === 'att' && knows(b, 'CA2')) ? BARRAGE.earlyCA2 : BARRAGE.early); }
    if (k === 'late') for (const v of g.occ[sec]) {
      if (v.side === 'def') addSupp(v, 0.86);
      else if (isCompany(v)) artyLoss(g, v, BARRAGE.fratricide * Math.min(1, exposure(g, v)));
    }
    if (k !== 'on' && !done.has(sec)) { done.add(sec); g.events.push({ t: g.t, kind: 'lift', side: 'att', sec, case: k, vis: ['att'] }); }
  }
}

/** Tanks give supp 0.5 to the defenders where they assault with infantry (SPEC §3.9). */
function tankSupport(g) {
  for (const s of Object.keys(g.contest)) {
    const sec = +s, c = g.contest[sec];
    const tanks = g.occ[sec].filter(u => u.side === c.by && u.type === 'tank' && !u.down);
    if (!tanks.length) continue;
    if (!g.occ[sec].some(v => v.side === c.by && TYPES[v.type].line && fighting(v))) continue;   // 2026-10-07: only with infantry (SPEC §3.9)
    // W3: tanks suppress at full effect only with infantry trained to work with them (card CA3, 1917-18 name).
    const coop = g.era === 'm' || g.occ[sec].some(v => v.side === c.by && TYPES[v.type].line && knows(v, 'CA3'));
    for (const v of g.occ[sec]) if (v.side !== c.by) addSupp(v, TANK.assaultSupp * (coop ? 1 : TANK.untrained));
  }
}

/** Infiltration detection rolls for every stealthy infiltrator in a watched sector (SPEC §3.6). */
function infiltration(g, rng) {
  const G = gridFor(g.scale);
  for (const u of g.units) {
    if (!fighting(u) || u.posture !== 'infil') continue;
    if (u.stealth == null) u.stealth = canStealth(u);
    if (!u.stealth || u.detected > g.t) continue;
    const foe = other(u.side), s = u.sec;
    let miss = 1, watched = false;
    for (const v of g.occ[s]) if (v.side === foe && isCompany(v)) { miss *= 1 - DETECT.same; watched = true; }
    const two = popcount(g.coverDirs[foe][s]) >= 2;
    for (const c of G.nbrs[s]) for (const v of g.occ[c]) {
      if (v.side !== foe || !(v.type === 'rifle' || v.type === 'storm' || v.type === 'mg')) continue;
      miss *= 1 - DETECT.adjacent * (two || knows(v, 'ED1') ? DETECT.adjBoost : 1); watched = true;
    }
    const lanes = g.laneHit[foe][s] || 0;
    for (let k = 0; k < lanes; k++) { miss *= 1 - DETECT.lane; watched = true; }
    if (g.droneSeen[foe][s] >= g.t) { miss *= 1 - DETECT.drone; watched = true; }
    if (!watched) continue;
    // W3: a line company trained to infiltrate (AT2) is bigger and less practised than a storm detachment: it is
    // watched twice over (DETECT.line rolls). Storm / raid companies infiltrate at the base rate (SPEC §3.6).
    if (!TYPES[u.type].stealth) miss **= DETECT.line;
    let p = 1 - miss;
    if (g.dark && g.dark[g.t]) p *= DETECT.fog;
    if (rng.u() < p) {
      u.detected = g.t + DETECT.visibleHours; u.stealth = false;
      g.events.push({ t: g.t, kind: 'detect', side: foe, unit: u.id, sec: s, vis: [foe] });
    } else if (!u.infilLogged || u.infilLogged !== g.t) {
      u.infilLogged = g.t;
      g.events.push({ t: g.t, kind: 'infiltrate', side: u.side, unit: u.id, sec: s, detected: false, vis: [u.side] });
    }
  }
}

/**
 * Units moving out of contact behind their own lines, in sectors the enemy observes, survive with
 * P = T^(-k2' v) (SPEC §3.11; Biddle A.5, p. 212), v = sectors moved this hour. Moves in contact are paid
 * for by direct fire instead.
 */
function observedMoves(g) {
  const T = BIDDLE.T[g.era];
  for (const u of g.units) {
    if (!u.moving || !fighting(u) || u.ca) continue;
    const foe = other(u.side);
    if (!g.obs[foe][u.sec]) continue;
    const covered = u.mode === 'covered' && (g.sectors.feat.comm[u.sec] || TERRAIN[g.sectors.terrain[u.sec]].key === 'reverse');
    u.ex = !covered;
    if (covered || inContact(g, u) || g.ctrl[u.sec] !== (u.side === 'def' ? 1 : 2)) continue;
    const v = u.steps || 1;
    const P = T ** (-BIDDLE.k2 * v);
    artyLoss(g, u, 1 - P, 'ar');
    if (u.mode === 'road') u.roadObs = true;
  }
}

/** Engineers breach an obstacle in their sector (2 h); a tank crushes wire in 1 h (SPEC §3.9). */
export function breachWork(g) {
  const f = g.sectors.feat;
  for (const u of g.units) {
    if (!fighting(u)) continue;
    if (TYPES[u.type].engineer && u.breaching && f.obst[u.sec] > 0 && !u.moving) {
      f.breach[u.sec] += 1;
      if (f.breach[u.sec] >= OBSTACLE.breachHours) { f.obst[u.sec] = 0; u.breaching = false; g.events.push({ t: g.t, kind: 'breach', side: u.side, sec: u.sec, vis: [u.side] }); }
    }
    if (TYPES[u.type].engineer && !u.moving) {   // an engineer next to a concealed obstacle finds it in 1 h
      for (const c of gridFor(g.scale).nbrs[u.sec]) if (f.obstC[c] && u.side === 'att') { f.obstC[c] = 0; g.known.att[c] |= 4; }
    }
  }
}

/** Strength-weighted share of the enemy fire on u that is not suppressed (adjacent companies and lanes over u). */
export function liveFire(g, u) {
  const G = gridFor(g.scale), foe = other(u.side);
  let w = 0, live = 0;
  for (const c of [u.sec, ...G.nbrs[u.sec]]) for (const v of g.occ[c]) {
    if (v.side !== foe || !fighting(v) || !isCompany(v) || !TYPES[v.type].fp) continue;
    w += v.str; live += v.str * (1 - (v.supp || 0));
  }
  return w > 0 ? live / w : g.laneHit[foe][u.sec] ? 1 : 0;
}

/** Go to ground (SPEC §3.6): stalled units, units that lost > 10%, and bounding elements roll to be pinned. */
export function goToGround(g, rng) {
  for (const u of g.units) {
    if (!fighting(u) || u.side !== 'att' && !u.ca && !u.stalled) continue;
    const trained = knows(u, 'AT1');
    let p = 0;
    if (u.stalled || (u.moving && (u.lossH || 0) > GROUND.lossTrigger * (u.str + (u.lossH || 0)))) p = (trained ? GROUND.trained : GROUND.untrained) + GROUND.add;
    if (u.posture === 'bound' && u.moving && !u.ow && inContact(g, u)) {
      // Covered bounders rarely go to ground; a lone bounder facing unsuppressed fire usually does (Biddle p. 31:
      // suppression, not exposure alone, is what lets infantry move under fire). W3.
      const cov = u.owOk || u.travel;
      p = Math.max(p, cov ? (knows(u, 'AT3') ? GROUND.boundTrained : GROUND.boundUntrained) : GROUND.alone * liveFire(g, u));
    }
    if (u.posture === 'infil' && u.moving && u.stealth === false && !TYPES[u.type].stealth && inContact(g, u)) p = Math.max(p, GROUND.alone * liveFire(g, u));   // a line company caught infiltrating
    if (p > 0 && rng.u() < p) { u.pinned = g.t + 2; u.gtg = true; }   // W3: pinned through the next hour (was g.t + 1, which expired before it could bite)
  }
}
