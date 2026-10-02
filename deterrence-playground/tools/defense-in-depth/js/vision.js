// What each side sees (SPEC §3.12; Fog of Command's three rules, with posture and terrain signatures):
//   1. an enemy unit in a sector you hold or contest: seen exactly (type and strength);
//   2. an enemy unit next to one of your units, with line of sight: seen with p = 0.9 x signature (x0.5 at
//      night or in morning fog), type only; a concealed static defender has signature 0.3 until it fires;
//   3. observers (your units, 1917-18 air sorties) report "movement" up to 2-3 sectors away, an hour late;
//      drone recon is exact and current.
// Sightings persist VISION.memory hours; a track is dropped when you hold its sector and no longer see it there.
// The computer reads only picture(g, side) in 'fog' mode (Fog's rule); 'truth' is for the review only.
import { VISION } from '../data/params.js';
import { TERRAIN } from '../data/terrain.js';
import { TYPES } from '../data/units.js';
import { SCALES } from '../data/scales.js';
import { gridFor, los } from './grid.js';
import { alive, fighting, hidden, other, isCompany, knows } from './forces.js';
import { position, moving } from './fire.js';

const POSTURE_SIG = { rush: 1.0, bound: 0.8, infil: 0.35, hold: 0.6, consolidate: 0.5, withdraw: 1.0 };

/** Signature of unit e seen by an observer in sector from (SPEC §3.12). */
export function signature(g, e, from = -1) {
  const G = gridFor(g.scale), T = TERRAIN[g.sectors.terrain[e.sec]];
  let s;
  if (e.ow) s = 0.8;
  else if (!moving(e) && e.side === 'def') {
    const p = position(g, e);
    const rev = G.row[e.sec] > G.crest;
    const concealed = p === 'disp' || rev || (p === 'strong' && knows(e, 'ED1'));
    s = concealed ? VISION.concealed : 0.6;
    if (e.firedAt === g.t || e.fired) s = Math.max(s, VISION.flash);
  } else s = moving(e) ? (POSTURE_SIG[e.posture] ?? 1) : e.pinned > g.t || e.stalled ? 0.6 : POSTURE_SIG[e.posture] ?? 0.6;
  let tsig = T.sig;
  if (T.sigBeyond && from >= 0 && G.row[from] <= G.crest) tsig = T.sigBeyond;
  if (e.formation === 'groups') s *= 0.8;
  return s * tsig;
}

/** Sectors a side observes this hour (its units within 2 sectors with LOS, 3 from high ground, plus air/drones). */
export function observe(g, side) {
  const G = gridFor(g.scale), m = g.obs[side], el = g.sectors.elev;
  m.fill(0);
  const done = new Set();
  for (const u of g.units) {
    if (u.side !== side || !alive(u) || u.sec < 0 || done.has(u.sec)) continue;
    done.add(u.sec);
    const R = el[u.sec] >= 2 ? VISION.farRange : 2, r0 = G.row[u.sec], c0 = G.col[u.sec];
    for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) {
      const c = G.idx(r0 + dr, c0 + dc);
      if (c >= 0 && !m[c] && los(G, el, u.sec, c, g.smokeNow)) m[c] = 1;
    }
  }
  for (let s = 0; s < G.n; s++) if (g.droneSeen[side][s] >= g.t || g.airSeen[side][s] === g.t) m[s] = 1;
  return m;
}

/** Make this hour's sightings for one side (after movement and combat, at time T = g.t + 1). */
export function sight(g, side, rng) {
  const G = gridFor(g.scale), T = g.t + 1, foe = other(side), el = g.sectors.elev;
  const out = (g.seen[side][T] = []);
  const exact = g.exactNow[side]; exact.clear();
  const dark = g.dark && g.dark[g.t] ? VISION.night : 1;
  observe(g, side);
  for (const e of g.units) {
    if (e.side !== foe || !alive(e) || e.sec < 0 || hidden(g, e)) continue;
    const at = e.sec;
    const mineHere = g.occ[at].some(u => u.side === side && alive(u));
    if (mineHere || (g.droneRecon[side][at] === g.t)) {
      const late = !mineHere && g.jammed[foe] && g.jammed[foe][at] ? 1 : 0;
      out.push(rec(e, T, true, late)); if (!late) exact.add(e.id); continue;
    }
    let p = 0;
    for (const c of G.nbrs[at]) {
      if (!g.occ[c].some(u => u.side === side && alive(u) && (isCompany(u) || TYPES[u.type].cat === 'team'))) continue;
      if (!los(G, el, c, at, g.smokeNow)) continue;
      p = Math.max(p, VISION.adjacent * signature(g, e, c) * dark);
    }
    if (p > 0 && rng.u() < p) { out.push(rec(e, T, false, 0)); continue; }
    if (moving(e) && g.obs[side][at]) out.push({ T, arr: T + VISION.farDelay, id: null, sec: at, far: true });
  }
  // Start knowledge and works seen up close (the attacker learns the defender's works; SPEC §3.12).
  if (side === 'att') {
    const f = g.sectors.feat, K = g.known.att;
    for (const u of g.units) {
      if (u.side !== 'att' || !fighting(u)) continue;
      for (const c of [u.sec, ...G.nbrs[u.sec]]) {
        if (f.trench[c]) K[c] |= 1;
        if (f.comm[c]) K[c] |= 2;
        if (f.obst[c] > 0 && !f.obstC[c]) K[c] |= 4;
        if (f.strong[c] || f.dummy[c]) K[c] |= 8;
        if (f.dummy[c]) { g.dummyWatch[c] = (g.dummyWatch[c] || 0) + 1; if (c === u.sec || g.dummyWatch[c] >= VISION.dummyHours) { K[c] |= 16; K[c] &= ~8; } }
        if (c !== u.sec) g.scouted[c] = 1;
      }
    }
    for (let s = 0; s < G.n; s++) if (g.droneSeen.att[s] >= g.t || g.airSeen.att[s] === g.t) g.scouted[s] = 1;
  }
  refreshBelief(g, side, T);
}

const rec = (e, T, ex, late) => ({ T, arr: T + late, id: e.id, sec: e.sec, type: e.type, str: ex ? Math.round(e.str * 10) / 10 : (TYPES[e.type].str || 0),
  hp: ex && e.str0 ? e.str / e.str0 : null, exact: ex, moving: !!e.moving });

/**
 * One side's picture at time T (default: now). mode 'fog': its own sightings; 'truth': every enemy unit.
 * Returns { kind, T, tracks: [{ id, sec, type, str, est, hp, age, exact }], marks: [{ sec, age }], sec: Float32Array }.
 */
export function picture(g, side, mode = 'fog', T = g.t) {
  const G = gridFor(g.scale), foe = other(side), est = new Float32Array(G.n);
  if (mode === 'truth') {
    const tracks = g.units.filter(u => u.side === foe && alive(u) && u.sec >= 0)
      .map(u => ({ id: u.id, sec: u.sec, type: u.type, str: u.str, est: u.str, hp: u.str0 ? u.str / u.str0 : 1, age: 0, exact: true, hidden: hidden(g, u) }));
    for (const t of tracks) est[t.sec] += t.est;
    return { kind: 'truth', T, tracks, marks: [], sec: est, works: null };
  }
  const tracks = new Map(), marks = new Map();
  for (let h = Math.max(0, T - VISION.memory); h <= T; h++) {
    for (const s of g.seen[side][h] || []) {
      if (s.arr > T) continue;
      if (s.far) { const m = marks.get(s.sec); if (!m || s.T > m.T) marks.set(s.sec, s); continue; }
      const tr = tracks.get(s.id);
      if (!tr || s.T >= tr.T) tracks.set(s.id, s);
    }
  }
  const held = heldBy(g, side);
  const list = [];
  for (const tr of tracks.values()) {
    const age = T - tr.T;
    if (age > 0 && held[tr.sec]) continue;
    const e = { id: tr.id, sec: tr.sec, type: tr.type, str: tr.str, est: tr.str, hp: tr.hp, age, exact: tr.exact };
    list.push(e); est[e.sec] += e.est;
  }
  const trackSec = new Set(list.map(t => t.sec));
  const ml = [];
  for (const m of marks.values()) if (!trackSec.has(m.sec) && !held[m.sec]) { ml.push({ sec: m.sec, age: T - m.T }); est[m.sec] += VISION.moveEst; }
  return { kind: 'belief', T, tracks: list, marks: ml, sec: est, works: side === 'att' ? g.known.att : null };
}

/** Sectors a side's fighting units stand in now. */
function heldBy(g, side) {
  const m = new Uint8Array(g.cols * g.rows);
  for (const u of g.units) if (u.side === side && fighting(u)) m[u.sec] = 1;
  return m;
}

/** Cache the side's believed enemy strength and spotted sectors (used by pathing, mortars, gauges, SOS). */
export function refreshBelief(g, side, T = g.t + 1) {
  const p = picture(g, side, 'fog', T);
  g.beliefSec[side] = p.sec;
  const sp = g.spot[side]; sp.fill(0);
  for (let s = 0; s < sp.length; s++) if (p.sec[s] > 0) sp[s] = 1;
  return p;
}

/** The true picture for a side (review only; the AI never calls this, SPEC §3.12). */
export const truthFor = (g, side) => picture(g, side, 'truth');

/** Initial knowledge at H-hour: geometric trench lines are mapped from the air (Biddle p. 44). */
export function startKnowledge(g) {
  const G = gridFor(g.scale), S = SCALES[g.scale], f = g.sectors.feat, K = g.known.att;
  for (let s = 0; s < G.n; s++) {
    const r = G.row[s];
    if (r < S.bands.outpost[0] || r > S.bands.battle[0]) continue;
    if (f.trench[s]) K[s] |= 1;
    if (f.comm[s]) K[s] |= 2;
    if (f.obst[s] > 0 && !f.obstC[s]) K[s] |= 4;
    if (f.strong[s] || f.dummy[s]) K[s] |= 8;
  }
}
