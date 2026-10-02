// Modern systems (SPEC §3.10) and 1917-18 air observation. Drones: 2 recon and 2 strike sorties per team per
// hour; recon gives exact sightings of a 3x3 block and halves dead ground there next hour (D-26); strikes take
// 1 - (1 - P_k)^n with P_k = 0.03 x X x (2 if vehicle), the shape of Biddle's A.22 overflight-attrition model
// (pp. 215-216; calibrated to a 1999 air campaign, p. 219) applied to drones as an extrapolation. EW jams a
// 5x5 area: enemy sorties abort at 0.6, enemy orders and calls for fire +1 h, enemy recon reports an hour late.
// Jammers, decoys and obscurants as "sprint shields": Biddle p. 58. All values NOTIONAL.
import { DRONE, EW } from '../data/params.js';
import { ERAS } from '../data/eras.js';
import { gridFor } from './grid.js';
import { alive, other, isVehicle } from './forces.js';
import { artyLoss } from './arty.js';
import { exposure } from './fire.js';

/** Sectors of the block of radius r around sec. */
export function block(g, sec, r) {
  const G = gridFor(g.scale), out = [];
  for (let dr = -r; dr <= r; dr++) for (let dc = -r; dc <= r; dc++) { const c = G.idx(G.row[sec] + dr, G.col[sec] + dc); if (c >= 0) out.push(c); }
  return out;
}

/** Standing EW jam areas for the hour (call at the start of each hour, before orders are given). */
export function jamAreas(g) {
  for (const side of ['def', 'att']) {
    const m = g.jammed[side]; m.fill(0);
    if (!ERAS[g.era].ew) continue;
    for (const u of g.units) {
      if (u.side !== side || u.type !== 'ew' || !alive(u) || u.jam == null) continue;
      for (const c of block(g, u.jam, EW.radius)) m[c] = 1;
    }
  }
}

/** Queue a drone sortie for this hour. Returns false if the team has none left or the target is out of range. */
export function queueSortie(g, u, m, sec) {
  if (!ERAS[g.era].drones || u.type !== 'drone' || !alive(u)) return false;
  const used = g.sorties.filter(s => s.unit === u.id && s.m === m && s.t === g.t).length;
  if (used >= (m === 'recon' ? DRONE.recon : DRONE.strike)) return false;
  if (gridFor(g.scale).dist(u.sec, sec) > DRONE.range) return false;
  g.sorties.push({ t: g.t, unit: u.id, side: u.side, m, sec });
  return true;
}

/** Fly this hour's sorties, jam, and roll to locate drone teams and jammers. */
export function modernPhase(g, rng) {
  const strikes = new Map();
  for (const s of g.sorties) {
    if (s.t !== g.t) continue;
    const u = g.units[g.ix[s.unit]];
    if (!u || !alive(u)) continue;
    const foe = other(s.side);
    if (g.jammed[foe][s.sec] && rng.u() < EW.abort) { s.aborted = true; continue; }
    u.flew = g.t;
    if (s.m === 'recon') {
      for (const c of block(g, s.sec, DRONE.block)) { g.droneRecon[s.side][c] = g.t; g.droneSeen[s.side][c] = g.t + 1; }
    } else {
      const k = `${s.side}:${s.sec}`;
      strikes.set(k, (strikes.get(k) || 0) + 1);
    }
  }
  for (const [k, n] of strikes) {
    const [side, sc] = k.split(':'), sec = +sc;
    for (const e of g.occ[sec]) {
      if (e.side === side || !alive(e)) continue;
      const Pk = DRONE.Pk * exposure(g, e) * (isVehicle(e) ? DRONE.vehicle : 1);
      artyLoss(g, e, 1 - (1 - Pk) ** n, 'dr');
    }
    g.events.push({ t: g.t, kind: 'drone', side, sec, n, vis: [side] });
  }
  for (const u of g.units) {
    if (!alive(u) || u.located) continue;
    const p = u.type === 'drone' && u.flew === g.t ? DRONE.locate : u.type === 'ew' && u.jam != null ? EW.locate : 0;
    if (p && rng.u() < p) { u.located = true; g.events.push({ t: g.t, kind: 'located', side: other(u.side), unit: u.id, vis: [other(u.side)] }); }
  }
}

/** 1917-18 air observation: a sortie over a 3x3 block reports movement there an hour late and scouts it. */
export function airSortie(g, side, sec) {
  if (!ERAS[g.era].air) return false;
  if ((g.airCount[side][g.t] || 0) >= 1) return false;
  g.airCount[side][g.t] = (g.airCount[side][g.t] || 0) + 1;
  for (const c of block(g, sec, 1)) g.airSeen[side][c] = g.t;
  g.airUp[side] = true;
  return true;
}
