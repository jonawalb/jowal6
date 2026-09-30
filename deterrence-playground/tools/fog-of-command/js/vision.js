// What each side sees. The same three rules for both sides (data/params.js, VISION):
//   1. an enemy unit in a sector you hold: seen exactly (type and strength); a decoy there is exposed;
//   2. an enemy unit in a sector next to one of yours: seen 90% of the time, with its type (so its full
//      strength), not how much it has lost; a decoy group looks like a tank battalion;
//   3. your recon troops also see "movement" up to two sectors away, reported an hour late.
// A sighting stays on the map for VISION.memory hours. The only other source is an artillery fire
// mission watched by a recon troop next to the target (engine.js), which shows that sector exactly.
import { VISION, TYPES } from '../data/params.js';
import { NODES, NODE, NORTH, FORWARD, MAIN, REAR, OBJ } from '../data/map.js';
import { hops } from './graph.js';

export const other = side => (side === 'blue' ? 'red' : 'blue');
export const posOf = u => u.node || (u.seg && u.seg.from) || null;
export const onMap = u => !u.broken && !!NODE[posOf(u)];

/** Make this hour's sightings for one side (after movement and combat, at time t + 1). */
export function sight(g, side, rng) {
  const T = g.t + 1;
  const eyes = g.units.filter(u => u.side === side && onMap(u) && u.str > 0);
  const held = new Set(eyes.filter(u => u.node).map(u => u.node));
  const out = g.seen[side];
  for (const e of g.units) {
    if (e.side === side || !onMap(e)) continue;
    const at = posOf(e);
    if (held.has(at) && e.node) { out.push(exact(e, T)); continue; }
    const near = eyes.some(o => hops(posOf(o), at) <= 1);
    if (near) {
      if (rng.u() < VISION.next) {
        const decoy = e.type === 'decoy' && VISION.decoyLooksReal;
        const type = decoy ? 'armor' : e.type;
        if (e.type === 'decoy' && !decoy) { out.push(exact(e, T)); continue; }
        out.push({ obsT: T, arrT: T, elem: e.id, node: at, type, str: TYPES[type].str, exact: false });
      }
      continue;
    }
    if (eyes.some(o => o.type === 'recon' && hops(posOf(o), at) <= VISION.farHops)) {
      out.push({ obsT: T, arrT: T + VISION.farDelay, elem: null, node: at, far: true });
    }
  }
}

/** An exact sighting of unit e at time T (type, strength and remaining strength as a fraction). */
export const exact = (e, T, extra = {}) => ({ obsT: T, arrT: T, elem: e.id, node: posOf(e), type: e.type, str: Math.round(e.str * 10) / 10, hp: e.str0 ? e.str / e.str0 : 0, exact: true, ...extra });

/**
 * One side's picture at time T: tracks of enemy units (latest sighting within VISION.memory hours) and
 * "movement" marks. A track is dropped if you now hold its sector and no longer see it there.
 * est = the strength your commander counts for it (a decoy seen from next door counts as a tank).
 */
export function beliefAt(g, side, T, heldNow = null) {
  const tracks = new Map(), moves = new Map(), exposed = new Set();
  for (const s of g.seen[side]) if (s.type === 'decoy' && s.arrT <= T + 1e-9) exposed.add(s.elem);   // once exposed, always known
  for (const s of g.seen[side]) {
    if (s.arrT > T + 1e-9 || T - s.obsT > VISION.memory) continue;
    if (s.far) { const m = moves.get(s.node); if (!m || s.obsT > m.obsT) moves.set(s.node, { node: s.node, obsT: s.obsT }); continue; }
    const tr = tracks.get(s.elem);
    if (!tr || s.obsT >= tr.obsT) tracks.set(s.elem, { ...s });
  }
  const held = heldNow || heldAt(g, side, T);
  const list = [];
  for (const tr of tracks.values()) {
    const age = T - tr.obsT;
    if (age > 0 && held.has(tr.node)) continue;
    if (exposed.has(tr.elem)) { tr.type = 'decoy'; tr.str = 0; }
    list.push({ ...tr, age, est: tr.type === 'decoy' ? 0 : tr.str });
  }
  const trackNodes = new Set(list.map(t => t.node));
  const marks = [...moves.values()].filter(m => !trackNodes.has(m.node) && !held.has(m.node)).map(m => ({ ...m, age: T - m.obsT }));
  return summarise(list, marks, 'belief');
}

/** Sectors a side holds at time T (from the snapshot of that hour). */
function heldAt(g, side, T) {
  const s = g.snaps[Math.min(T, g.snaps.length - 1)];
  const set = new Set();
  if (!s) return set;
  for (const u of s.units) if (u.side === side && NODE[u.node] && !u.broken && u.str > 0) set.add(u.node);
  return set;
}

/** The true picture of the enemy at the current hour, in the same shape. Decoys are left out. */
export function truthFor(g, side) {
  const list = g.units.filter(u => u.side !== side && onMap(u) && u.type !== 'decoy')
    .map(u => ({ elem: u.id, node: posOf(u), type: u.type, str: Math.round(u.str), est: u.str, age: 0, exact: true, moving: !!u.seg }));
  return summarise(list, [], 'truth');
}

function summarise(tracks, marks, kind) {
  const node = Object.fromEntries(NODES.map(n => [n.id, 0]));
  for (const tr of tracks) node[tr.node] += tr.est;
  for (const m of marks) node[m.node] += VISION.moveEst;
  const col = [0, 1, 2, 3].map(c => node[NORTH[c]] + node[FORWARD[c]] + node[MAIN[c]] + node[REAR[c]]);
  const near = [0, 1, 2, 3].map(c => node[FORWARD[c]] + node[MAIN[c]] + node[REAR[c]]);   // south of the north approach
  return { kind, tracks, marks, node, col, near, obj: node[OBJ] };
}
