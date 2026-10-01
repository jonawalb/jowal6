// Scripted players for the balance table (scripts/balance.mjs). Each plays one turn at a time through
// the same public actions a person uses. They are rules of thumb, not optimal play.
import { GAME, SENSORS, ROUTES, ACTIONS } from '../data/params.js';
import { place, endTurn, newGame, effortLeft, lastSnap, why } from './game.js';
import { activeAt, covers, makeAsset, pDetect, snapAxis } from './sensors.js';
import { cellCenter } from './filter.js';
import { dist, bearing, step, seaPointNear } from './geo.js';
import { makeRng } from './rng.js';

const lastTurn = g => g.turn === GAME.turns - 1;
const live = (g, type) => g.assets.filter(a => a.type === type && activeAt(a, g.turn * GAME.turnHours + 1));

/** The brightest heat cells, best first, skipping any already inside a live footprint of the given types. */
function hotspots(g, types, k = 1) {
  const heat = lastSnap(g).heat;
  const ranked = Array.from(heat.keys()).filter(i => heat[i] > 0).sort((a, b) => heat[b] - heat[a]);
  const out = [];
  for (const i of ranked.slice(0, 200)) {
    const c = cellCenter(i);
    if (types.some(t => live(g, t).some(a => covers(a, c)))) continue;
    if (out.some(o => dist(o, c) < 20)) continue;
    out.push(c);
    if (out.length >= k) break;
  }
  return out;
}

function attackIf(g, thr) {
  const b = lastSnap(g).best;
  if ((b.v >= thr || lastTurn(g)) && g.torps > 0 && b.v > 0) place(g, 'attack', b.p);
}

/** Move the ship toward p, stopping `short` nm before it. */
function steer(g, p, short = 8) {
  const d = dist(g.ship.p, p);
  if (d > short) place(g, 'move', step(g.ship.p, bearing(g.ship.p, p), d - short));
}

/** The good player's settings (attack threshold falling by dec a turn to min; ship stand-off; value floor). */
export const GOOD = { thr: 0.4, dec: 0.02, min: 0.2, shy: 0.4, stand: 12, floor: 0.01 };

export const STRATEGIES = {
  /** Does nothing but wait, then fires once at the map's best spot on the last turn. */
  lazy(g) { if (lastTurn(g)) attackIf(g, 1); },

  /** Spends its effort on random actions at random points near the report; fires at random at the end. */
  random(g, rng) {
    const types = ['line', 'circle', 'air', 'helo', 'move'];
    for (let k = 0; k < 6 && effortLeft(g) > 0; k++) {
      const t = types[Math.floor(rng.u() * types.length)];
      const p = t === 'helo' ? seaPointNear(rng, g.ship.p, SENSORS.helo.range) : seaPointNear(rng, g.datum, 90);
      place(g, t, p, snapAxis(rng.u() * 180));
    }
    if ((lastTurn(g) || rng.u() < 0.08) && g.torps > 0) place(g, 'attack', seaPointNear(rng, g.datum, 60));
  },

  /** Lays buoy lines across the two southern gaps' approaches (on the nearest of the 8 axes) and relays them; checks contacts with the helicopter. */
  barrier(g) {
    attackIf(g, 0.45);
    if (g.turn % 4 === 0 && g.buoys >= 2) {
      const along = [45, 95, 140][g.turn / 4] || 140;
      for (const r of ROUTES.slice(1)) {
        const brg = bearing(g.datum, r.pts[0]);
        place(g, 'line', step(g.datum, brg, Math.min(along, dist(g.datum, r.pts[0]))), snapAxis(brg + 90));
      }
    }
    const best = lastSnap(g).best;
    if (best.v >= 0.1) {
      steer(g, best.p, 15);
      if (!why(g, 'helo', best.p)) place(g, 'helo', best.p);
      else if (g.buoys > 0) place(g, 'circle', best.p);
    } else steer(g, g.datum, 25);
  },

  /** Every turn searches the brightest water: ship toward it, helicopter on it, a circle and the aircraft nearby. */
  follow(g) {
    attackIf(g, 0.45);
    const best = lastSnap(g).best;
    steer(g, best.p, 12);
    if (!why(g, 'helo', best.p)) place(g, 'helo', best.p);
    const [c] = hotspots(g, ['circle', 'helo']);
    if (c && g.buoys > 0) place(g, 'circle', c);
    if (effortLeft(g) >= 3) { const [a] = hotspots(g, ['air', 'circle', 'helo']); if (a) place(g, 'air', a); }
  },

  /**
   * A good player: spends each point of effort where it buys the most chance of detection (Koopman's
   * distribution of searching effort, greedily), saves effort when nothing is worth it, keeps the ship
   * off a sub the map thinks is shy, and lowers its bar for attacking as time runs out.
   */
  good(g, rng, o = GOOD) {
    const { best, beh } = lastSnap(g);
    if ((best.v >= Math.max(o.min, o.thr - o.dec * g.turn) || lastTurn(g)) && g.torps > 0) place(g, 'attack', best.p);
    if (lastTurn(g) && g.torps > 1) { const [b2] = hotspots(g, [], 6).filter(c => dist(c, best.p) > 2 * GAME.prosR); if (b2) place(g, 'attack', b2); }
    steer(g, best.p, beh.shy > o.shy ? 25 : o.stand);
    greedy(g, o.floor);
  },

};

/**
 * Greedy allocation: value an action by the chance it detects the sub next hour (summed over the map's
 * particles), per point of effort; take the best while it beats `floor`, discounting what is covered.
 */
function greedy(g, floor) {
  const f = g.filter, w = Float64Array.from(f.w);
  // Value each particle where it will be next hour if it holds course and speed (dead reckoning).
  const ahead = f.parts.map(q => ({ ...q, lon: 2 * q.lon - q.plon, lat: 2 * q.lat - q.plat, plon: q.lon, plat: q.lat }));
  const spots = hotspots(g, [], 12);
  const hour = g.turn * GAME.turnHours;
  for (let k = 0; k < 4; k++) {
    let top = null;
    for (const type of ['helo', 'circle', 'air']) {
      if (type === 'circle' && g.buoys <= 0) continue;
      const cost = ACTIONS[type].cost;
      if (cost > effortLeft(g)) continue;
      for (const c of spots) {
        if (why(g, type, c)) continue;
        const a = makeAsset(type, c, hour, 0);
        let v = 0;
        for (let i = 0; i < f.n; i++) if (w[i] > 1e-6) v += w[i] * pDetect(a, ahead[i]);
        if (!top || v / cost > top.r) top = { type, c, a, r: v / cost };
      }
    }
    if (!top || top.r < floor) return;
    place(g, top.type, top.c);
    for (let i = 0; i < f.n; i++) w[i] *= 1 - pDetect(top.a, ahead[i]);
  }
}

/** Play one full hunt with a strategy. Returns a small result record. */
export function botHunt(name, seed, particles = GAME.batchParticles) {
  const g = newGame({ seed, particles });
  const rng = makeRng(seed, 77);
  while (!g.over) { STRATEGIES[name](g, rng); endTurn(g); }
  return { kind: g.over.kind, h: g.over.h, beh: g.sub.beh, shots: g.attacks.length };
}
