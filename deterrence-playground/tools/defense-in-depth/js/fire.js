// Direct fire: exposure-weighted attrition after Biddle A.11-A.12 (pp. 213-214), resolved per unit per hour
// from the actual shooters (SPEC §3.2-3.4). One loss function serves both sides:
//   loss_u = c x sum_j [F_j x G(j,u) x S_ju] x X_u x (1 - D_u) x Leth(era, X_u), capped, x lognormal noise.
// F_j = shooter fire; G = geometry (directional/all-round cover and enfilade); S_ju = j's share of fire on u;
// X_u = exposure (Biddle's speed term); D_u = usable dead ground; Leth = era lethality on exposed targets.
import { FIRE, EXPOSE, GAS, TANK, SUPP, OFFDEF } from '../data/params.js';
import { TYPES } from '../data/units.js';
import { TERRAIN, WORKS } from '../data/terrain.js';
import { ERAS } from '../data/eras.js';
import { gridFor, los, laneCells, turn, opp, popcount } from './grid.js';
import { alive, hidden, other, isVehicle, isCompany, knows } from './forces.js';

const ENF_AXIS = { waves: 2, trenchEW: 2, trenchNS: 0 };   // E-W axis is direction 2 (E) / 6 (W)

/** Is this unit moving this hour (set by the movement step)? */
export const moving = u => !!u.moving;

/** The defender-style position code of a static unit: strong | trench | disp | open. */
export function position(g, u) {
  const f = g.sectors.feat, s = u.sec;
  if (u.side === 'def' && f.strong[s]) return 'strong';
  if (f.trench[s]) return 'trench';
  if (u.side === 'def' && (u.staticH || 0) >= 2) return 'disp';
  return 'open';
}

/**
 * Exposure X (SPEC §3.6). Moving postures follow Biddle's speed term (A.11-A.12, p. 213); static defenders
 * by position; held at an obstacle x1.5.
 */
export function exposure(g, u) {
  let x;
  if (u.ow) x = EXPOSE.overwatch;
  else if (moving(u)) {
    switch (u.posture) {
      case 'bound': x = u.owOk || u.travel ? EXPOSE.bound * (u.bound === 'long' ? 1 : EXPOSE.boundShort) : EXPOSE.boundAlone; break;
      case 'infil': x = TYPES[u.type].stealth ? EXPOSE.infil : EXPOSE.infilLine; break;
      case 'withdraw': x = EXPOSE.withdraw; break;
      default: x = EXPOSE.rush;
    }
  } else if (u.posture === 'consolidate') x = EXPOSE.consolidate;
  else if (u.side === 'def' && !u.stalled && !(u.pinned > g.t)) {
    const p = position(g, u);
    x = p === 'strong' ? EXPOSE.defStrong : p === 'trench' ? EXPOSE.defTrench : p === 'disp' ? EXPOSE.defDispersed : EXPOSE.hold;
  } else x = g.sectors.feat.trench[u.sec] ? EXPOSE.defTrench : EXPOSE.hold;
  if (u.held) x *= EXPOSE.obstacle;
  return x;
}

/** The target's long axis (direction index) and enfilade multiplier, or null (SPEC §3.4). */
export function longAxis(g, u) {
  const f = g.sectors.feat;
  if (u.held) return { axis: ENF_AXIS.waves, enf: FIRE.ENF.waves };          // wire holds attackers in lanes
  if (!moving(u) && f.trench[u.sec] && !(u.side === 'def' && f.strong[u.sec])) {
    return { axis: f.trench[u.sec] === 2 ? ENF_AXIS.trenchNS : ENF_AXIS.trenchEW, enf: FIRE.ENF.trench };
  }
  if (moving(u) && (u.mode === 'road' || (u.mode === 'covered' && f.comm[u.sec]))) return { axis: u.facing, enf: FIRE.ENF.column };
  if (u.formation === 'waves' && isCompany(u) && !isVehicle(u) && (moving(u) || u.side === 'att')) return { axis: ENF_AXIS.waves, enf: FIRE.ENF.waves };
  // W3: a company advancing in small groups still deploys its groups abreast across its frontage, so fire along the
  // frontage (from a flank) passes several groups; the bonus is smaller than against waves (dispersion, Biddle pp. 44-45).
  // Storm / raid infiltrators slip through in the smallest parties and have no frontage to sweep.
  if (u.formation === 'groups' && isCompany(u) && !isVehicle(u) && moving(u) && !(u.posture === 'infil' && TYPES[u.type].stealth)) return { axis: ENF_AXIS.waves, enf: FIRE.ENF.groups };
  return null;
}

/** Enfilade multiplier for fire arriving from direction src (pointing from target to shooter). */
export function enfilade(g, u, src) {
  const la = longAxis(g, u);
  if (!la || src < 0) return 1;
  const a = Math.min(turn(src, la.axis), turn(src, opp(la.axis)));
  if (a === 0) return la.enf;
  if (a === 1 && FIRE.enfHalf) return 1 + (la.enf - 1) / 2;
  return 1;
}

/**
 * Geometry factor G(j,u) = (1 - max(C_dir(theta), C_all)) x E (SPEC §3.3). src: direction from the target
 * toward the shooter; same: true for close-quarter fire inside the sector; indirect: ignores directional cover.
 */
export function geometry(g, u, src, same = false, indirect = false) {
  const s = u.sec, f = g.sectors.feat, T = TERRAIN[g.sectors.terrain[s]];
  const mv = moving(u) ? 0.5 : 1;
  const step = th => (th === 0 ? 1 : th === 1 ? 0.5 : 0);
  let cdir = 0;
  if (!indirect && src >= 0) {
    cdir = T.front * mv * step(turn(src, u.facing));
    if (f.trench[s] && !moving(u)) {
      const nrm = f.trench[s] === 2 ? 2 : 0;
      const th = Math.min(turn(src, nrm), turn(src, opp(nrm)));
      cdir = Math.max(cdir, Math.max(0, WORKS.trench.cover - f.wear[s]) * step(th));
    }
    if (same) cdir *= FIRE.sameSectorCover;
  }
  let call = T.all * mv;
  if (f.strong[s] && u.side === 'def' && !moving(u)) call = Math.max(call, Math.max(0, WORKS.strong.cover - f.wear[s]));
  return (1 - Math.max(cdir, call)) * (indirect ? 1 : enfilade(g, u, src));
}

/** Usable dead ground D_u (SPEC §3.4): g0 x max(0, 1 - 0.35 (dirs - 1)) x use(posture) x scout x drones. */
export function deadGround(g, u) {
  const s = u.sec, g0 = TERRAIN[g.sectors.terrain[s]].g0;
  const dirs = popcount(g.coverDirs[other(u.side)][s]);
  const key = u.ow ? 'overwatch' : moving(u) ? (u.posture === 'bound' ? 'bound' : u.posture === 'infil' ? 'infil' : u.posture === 'withdraw' ? 'withdraw' : 'rush')
    : u.side === 'def' && !u.stalled ? 'static' : u.pinned > g.t ? 'pinned' : u.stalled ? 'stalled' : u.posture === 'consolidate' ? 'consolidate' : 'hold';
  const use = FIRE.deadUse[key] ?? 0;
  if (!use) return 0;
  const scout = u.side === 'att' ? (g.scouted[s] ? 1 : FIRE.unscouted) : 1;
  const drone = g.droneSeen[other(u.side)][s] >= g.t ? FIRE.droneDead : 1;
  return g0 * Math.max(0, 1 - FIRE.deadDecay * (dirs - 1)) * use * scout * drone;
}

/** W3: the offense-defense slider also scales direct-fire losses: on the attacking army x step^((5 - od) / 2), on the
 * defending army the inverse (data/params.js OFFDEF; DECISIONS W3). Exactly 1 at od = 5. */
export const firTilt = (g, side) => { const e = (OFFDEF.standard - (g.od ?? OFFDEF.standard)) * OFFDEF.fire, st = OFFDEF.step[g.scale] ?? OFFDEF.step.d; return side === 'att' ? st ** e : st ** -e; };

export const leth = (g, x) => 1 + (FIRE.Lmod[g.era] - 1) * Math.min(1, x);
const night = g => (g.dark && g.dark[g.t] ? FIRE.night : 1);

/** Shooter j's fire F_j before the target's type (SPEC §3.2). */
export function shooterFire(g, j) {
  if (!alive(j) || hidden(g, j) || j.down) return 0;
  const T = TYPES[j.type];
  if (!T.fp && !T.lane) return 0;
  let f = j.str * (j.q || 1) * (1 - (j.supp || 0)) * night(g);
  if (j.side === 'att') f *= FIRE.cohFire[0] + FIRE.cohFire[1] * (j.coh ?? 1);
  if (g.gas[j.sec]) f *= gasFactor(g, j.sec, GAS.fire);
  if (j.stun > g.t - 1 && j.stun >= g.t) f *= 0.5;
  if (j.type === 'tank' && (j.actH || 0) >= TANK.fatigueHours && g.era === 'w') f *= TANK.fatigue;
  if (T.line && knows(j, 'AT3')) f *= 1.3;
  return f;
}
/** A gas effect at sector s: full the first hour, halved by masks after (and again with gas discipline). */
export function gasFactor(g, s, pen) {
  const first = g.gasAge[s] === 0;
  const k = first ? 1 : 0.5;
  return 1 - (1 - pen) * k;
}

/** Firepower of shooter j against target u, at a range of k sectors, in-lane or not. */
function firepower(g, j, u, inLane, k) {
  const T = TYPES[j.type];
  const fpBase = g.era === 'm' && T.fpM ? T.fpM : T.fp;
  if (isVehicle(u)) {
    if (j.type === 'mg' && g.era === 'm') return T.atgm * (unsupported(g, u) ? FIRE.unsupported : 1);
    if (j.type === 'tank') return fpBase * (unsupported(g, u) ? FIRE.unsupported : 1);
    return (inLane ? T.lane : fpBase) * FIRE.armorSmall;
  }
  if (k > 1 && !inLane && !T.indirect) return 0;
  return inLane ? T.lane : fpBase;
}
const unsupported = (g, u) => !g.occ[u.sec].some(v => v.side === u.side && v !== u && TYPES[v.type].line);

/**
 * Who shooter j can hit this hour: [{ u, fp, src, same, indirect, lane }]. Same sector; adjacent sectors with
 * LOS; MG lane cells (fire x0.3 through smoke); mortars at range on sighted sectors; Modern ATGM at range 2.
 */
export function targetsOf(g, j) {
  const G = gridFor(g.scale), out = [], el = g.sectors.elev, foe = other(j.side), T = TYPES[j.type];
  const add = (u, src, same, indirect, lane, k) => {
    if (u.side !== foe || !alive(u) || hidden(g, u) || (!isCompany(u) && TYPES[u.type].cat !== 'team')) return;
    const fp = firepower(g, j, u, lane, k);
    if (fp > 0 && !out.some(o => o.u === u)) out.push({ u, fp, src, same, indirect, lane });
  };
  for (const u of g.occ[j.sec]) add(u, opp(j.facing), true, false, false, 0);
  if (j.lane != null && j.laneCells) {
    for (const c of j.laneCells) for (const u of g.occ[c]) add(u, opp(j.lane), false, false, true, 1);
  }
  for (const c of G.nbrs[j.sec]) {
    if (!g.occ[c].length || !los(G, el, j.sec, c, g.smokeNow)) continue;
    for (const u of g.occ[c]) add(u, G.dirTo(c, j.sec), false, false, false, 1);
  }
  const R = T.indirect ? ERAS[g.era].ranges.mortar : j.type === 'mg' && g.era === 'm' ? 2 : 0;
  if (R > 1) {
    for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) {
      const c = G.idx(G.row[j.sec] + dr, G.col[j.sec] + dc);
      if (c < 0 || G.dist(c, j.sec) < 2 || !g.occ[c].length) continue;
      if (T.indirect) { if (g.spot[j.side][c]) for (const u of g.occ[c]) add(u, G.dirTo(c, j.sec), false, true, false, 2); }
      else if (los(G, el, j.sec, c, g.smokeNow)) for (const u of g.occ[c]) if (isVehicle(u)) add(u, G.dirTo(c, j.sec), false, false, false, 2);
    }
  }
  return out;
}

/**
 * The direct-fire step (SPEC §3.1 step 5): every unit in contact fires simultaneously from a strength
 * snapshot, then losses are applied. Records incoming by source for telemetry and enfilade events.
 */
export function directFire(g, rng) {
  const N = g.units.length, rate = new Float64Array(N), flank = new Float64Array(N);
  const mgHits = [];   // [shooter, target, share of rate from enfilading lane fire]
  for (const j of g.units) {
    const F = shooterFire(g, j);
    if (!(F > 0)) continue;
    const tg = targetsOf(g, j);
    if (!tg.length) continue;
    let tot = 0;
    const cell = new Map();   // W3: grazing lane fire beats each lane cell in full (the beaten zone runs along the lane)
    for (const t of tg) {
      t.x = exposure(g, t.u); t.w = t.u.str * t.x;
      if (t.lane && FIRE.laneGraze) cell.set(t.u.sec, (cell.get(t.u.sec) || 0) + t.w); else tot += t.w;
    }
    if (!(tot > 0) && !cell.size) continue;
    j.fired = true;
    for (const t of tg) {
      const share = t.lane && FIRE.laneGraze ? t.w / cell.get(t.u.sec) : t.w / tot;
      if (!(share > 0)) continue;
      let Gm = geometry(g, t.u, t.src, t.same, t.indirect);
      if (t.lane && g.smokeNow && j.laneCells.some(c => g.smokeNow[c])) Gm *= SUPP.smokeLane;
      const r = FIRE.c * F * t.fp * Gm * share;
      const k = g.ix[t.u.id];
      rate[k] += r;
      const fl = !t.same && t.src >= 0 && (turn(t.src, t.u.facing) >= 2 || enfilade(g, t.u, t.src) > 1);
      if (fl) flank[k] += r;
      if (t.lane && enfilade(g, t.u, t.src) > 1) mgHits.push([j, t.u, r]);
    }
  }
  const lost = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    if (!(rate[k] > 0)) continue;
    const u = g.units[k], x = exposure(g, u);
    const mean = rate[k] * x * (1 - deadGround(g, u)) * leth(g, x) * firTilt(g, u.side);
    const l = Math.min(u.str, mean * rng.noise(FIRE.sigma));
    lost[k] = l;
    const inc = u.inc || (u.inc = { fr: 0, fl: 0, ar: 0, dr: 0 });
    const fs = flank[k] / rate[k];
    inc.fl += l * fs; inc.fr += l * (1 - fs);
  }
  const enf = new Map();
  for (const [j, u, r] of mgHits) {
    const k = g.ix[u.id], share = lost[k] * r / rate[k];
    enf.set(j, (enf.get(j) || 0) + share);
  }
  for (let k = 0; k < N; k++) if (lost[k] > 0) { const u = g.units[k]; u.str -= lost[k]; u.lossH = (u.lossH || 0) + lost[k]; }
  for (const [j, loss] of enf) g.events.push({ t: g.t, kind: 'enfilade', side: j.side, unit: j.id, sec: j.laneCells[0] ?? j.sec, loss: Math.round(loss * 10) / 10 });
  return lost;
}

/** Disengage cost: half an hour of the enemy's fire at G = 1 on a unit breaking contact (Fog's rule). */
export function disengage(g, u, rng) {
  if (!(u.str > 0)) return 0;
  let F = 0;
  const G = gridFor(g.scale), foe = other(u.side);
  const near = [u.sec, ...G.nbrs[u.sec]];
  for (const c of near) for (const j of g.occ[c]) if (j.side === foe) F += shooterFire(g, j) * (TYPES[j.type].fp || 0);
  const own = g.occ[u.sec].reduce((s, v) => s + (v.side === u.side ? v.str : 0), 0) || u.str;
  const l = Math.min(u.str, 0.5 * FIRE.c * F * (u.str / own) * EXPOSE.withdraw * leth(g, EXPOSE.withdraw) * (rng ? rng.noise(FIRE.sigma) : 1));
  u.str -= l; u.lossH = (u.lossH || 0) + l;
  return l;
}

/**
 * Directions from which a side's fire covers each sector (SPEC §2.4): MG lanes plus the frontal arc of
 * adjacent rifle / storm / MG / tank units. Bitmask per sector; popcount = dirs(i). Also counts the lanes
 * covering each sector (g.laneHit, used for contact and infiltration detection).
 */
export function computeCover(g, side) {
  const G = gridFor(g.scale), m = g.coverDirs[side], lh = g.laneHit[side];
  m.fill(0); lh.fill(0);
  for (const u of g.units) {
    if (u.side !== side || !alive(u) || !isCompany(u) || !TYPES[u.type].fp) continue;
    if (u.lane != null && u.laneCells) for (const c of u.laneCells) { m[c] |= 1 << opp(u.lane); lh[c] = Math.min(255, lh[c] + 1); }
    for (const d of [u.facing, (u.facing + 1) & 7, (u.facing + 7) & 7]) {
      const c = G.at(u.sec, d);
      if (c >= 0) m[c] |= 1 << opp(d);
    }
  }
  return m;
}

/** Re-lay an MG's lane cells from its sector and direction (stops at the first LOS-blocked cell). */
export function layLane(g, u) {
  u.laneCells = u.lane == null || u.sec < 0 ? null : laneCells(gridFor(g.scale), g.sectors.elev, u.sec, u.lane);
}
