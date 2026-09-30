// The submarine's movement rules. The same code moves the real (hidden) sub and every particle in the
// belief map, so the map "knows" the rules but not the dice.
import { ROUTES, WAYPOINT_R, ESCAPE_R, SUB } from '../data/params.js';
import { dist, bearing, sail, seaPointNear } from './geo.js';

const BEH = ['transit', 'loiter', 'evade'];

/**
 * A new sub near the datum.
 * @param rng generator; beh 'transit' | 'loiter' | 'evade' | 'unknown'; datum [lon, lat]; r cue radius (nm)
 */
export function spawn(rng, beh, datum, r) {
  const b = beh === 'unknown' ? BEH[Math.floor(rng.u() * 3)] : beh;
  const p = seaPointNear(rng, datum, r);
  const route = rng.pick(ROUTES.map(x => x.w));
  const s = { lon: p[0], lat: p[1], beh: b, route, wp: 0, hdg: 0, evadeT: 0, sprint: false, out: false, home: null };
  if (b === 'loiter') s.home = [p[0], p[1]];
  s.hdg = b === 'loiter' ? rng.u() * 360 : bearing(p, ROUTES[route].pts[0]);
  return s;
}

export const clone = s => ({ ...s, home: s.home ? s.home.slice() : null });

/** Speed this hour in knots. */
export const speedOf = s => (s.sprint ? SUB.sprint : SUB.quiet);

/**
 * Advance one hour.
 * @param threats [{p:[lon,lat]}] things an evader can hear this hour (search ship, aircraft on station)
 * @param share sprint chance per hour
 */
export function stepSub(s, rng, threats, share) {
  if (s.out) return s;
  const here = [s.lon, s.lat];
  // Counter-detection: only the evader reacts, and only if it is not already evading.
  if (s.beh === 'evade' && s.evadeT === 0) {
    for (const t of threats) {
      if (dist(here, t.p) < SUB.counterR && rng.u() < SUB.counterP) {
        s.evadeT = SUB.evadeHours;
        s.hdg = (bearing(t.p, here) + (rng.u() - 0.5) * 60 + 360) % 360;
        break;
      }
    }
  }
  const pSprint = s.beh === 'loiter' ? share * SUB.loiterSprint : share;
  const roll = rng.u();
  let h;
  if (s.evadeT > 0) {
    s.sprint = false;
    s.evadeT -= 1;
    h = s.hdg + rng.normal() * 10;
  } else if (s.beh === 'loiter') {
    s.sprint = roll < pSprint;
    h = dist(here, s.home) > SUB.loiterR ? bearing(here, s.home) + rng.normal() * 20 : s.hdg + rng.normal() * SUB.loiterTurn;
  } else {
    s.sprint = roll < pSprint;
    h = bearing(here, ROUTES[s.route].pts[s.wp]) + rng.normal() * SUB.hdgNoise;
  }
  const [lon, lat, hd] = sail(here, (h + 360) % 360, speedOf(s));
  s.lon = lon; s.lat = lat; s.hdg = hd;
  if (s.beh !== 'loiter') {
    const pts = ROUTES[s.route].pts, last = s.wp === pts.length - 1;
    const d = dist([lon, lat], pts[s.wp]);
    if (last && d < ESCAPE_R) s.out = true;
    else if (!last && d < WAYPOINT_R) s.wp += 1;
  }
  return s;
}


