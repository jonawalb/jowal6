// The submarine's movement rules: four readable behaviours (data/params.js SUB, BEHAVIOURS). The same
// code moves the real (hidden) sub and every particle in the probability map, so the map knows the
// rules but not the dice: which behaviour, which gap, where in its cycle, and the small heading wobble.
import { ROUTES, WAYPOINT_R, ESCAPE_R, SUB, PATROL } from '../data/params.js';
import { dist, bearing, sail, seaPointNear } from './geo.js';

export const BEHS = ['sprinter', 'zigzag', 'shy', 'loiter'];

/**
 * A new sub near the datum.
 * @param rng generator; beh one of BEHS or 'any'; datum [lon, lat]; r opening-report radius (nm)
 */
export function spawn(rng, beh, datum, r) {
  const b = BEHS.includes(beh) ? beh : BEHS[rng.pick(BEHS.map(k => SUB.mix[k]))];
  const p = seaPointNear(rng, datum, r);
  const route = rng.pick(ROUTES.map(x => x.w));
  const s = {
    lon: p[0], lat: p[1], plon: p[0], plat: p[1], beh: b, route, wp: 0, age: 0,
    phase: Math.floor(rng.u() * 4), zig: rng.u() < 0.5 ? 1 : -1, orbit: rng.u() < 0.5 ? 1 : -1,
    quietT: 0, away: 0, mode: 'start', boltT: 0, boltH: 0, sprint: false, speed: 0, out: false, home: -1, orbitR: 0,
  };
  if (b === 'loiter') {
    s.home = dist(p, PATROL[0].p) <= dist(p, PATROL[1].p) ? 0 : 1;
    s.orbitR = SUB.loiter.orbitR[0] + rng.u() * (SUB.loiter.orbitR[1] - SUB.loiter.orbitR[0]);
  }
  return s;
}

/** Is this hour a sprint hour for a sprint-and-drift sub? */
export const sprintHour = s => (s.age + s.phase) % SUB.sprinter.cycle === 0;

/** A missed attack at p: a sub within range hears it and bolts directly away. */
export function alert(s, p, range) {
  if (s.out || dist([s.lon, s.lat], p) > range) return false;
  s.boltT = SUB.bolt.hours;
  s.boltH = bearing(p, [s.lon, s.lat]);
  return true;
}

function toGap(s, here, rng, noise) {
  return bearing(here, ROUTES[s.route].pts[s.wp]) + rng.normal() * noise;
}

/**
 * Advance one hour.
 * @param threats [{p:[lon,lat]}] what a shy sub can hear this hour: your ship and any helicopter dip
 */
export function stepSub(s, rng, threats) {
  if (s.out) return s;
  const here = [s.lon, s.lat];
  s.plon = s.lon; s.plat = s.lat;
  let h, v, loud = false, mode;
  if (s.boltT > 0) {
    s.boltT -= 1;
    h = s.boltH + rng.normal() * 10; v = SUB.bolt.speed; loud = true; mode = 'bolt';
  } else if (s.beh === 'sprinter') {
    loud = sprintHour(s);
    h = toGap(s, here, rng, SUB.sprinter.hdgNoise);
    v = loud ? SUB.sprinter.sprint : SUB.sprinter.drift; mode = loud ? 'sprint' : 'drift';
  } else if (s.beh === 'zigzag') {
    const leg = Math.floor((s.age + s.phase) / SUB.zigzag.leg) % 2 ? 1 : -1;
    h = toGap(s, here, rng, SUB.zigzag.hdgNoise) + leg * s.zig * SUB.zigzag.angle;
    v = SUB.zigzag.speed; mode = leg * s.zig > 0 ? 'zig-r' : 'zig-l';
  } else if (s.beh === 'shy') {
    for (const t of threats) {
      if (dist(here, t.p) < SUB.shy.hearR) { s.quietT = SUB.shy.hours; s.away = bearing(t.p, here); break; }
    }
    if (s.quietT > 0) { s.quietT -= 1; h = s.away + rng.normal() * SUB.shy.hdgNoise; v = SUB.shy.quiet; mode = 'hide'; }
    else { h = toGap(s, here, rng, SUB.shy.hdgNoise); v = SUB.shy.speed; mode = 'run'; }
  } else {
    const c = PATROL[s.home].p, d = dist(here, c), L = SUB.loiter;
    if (d > s.orbitR + 4) { h = bearing(here, c) + rng.normal() * 6; v = L.transit; mode = 'go'; }
    else {
      // Steer along the circle, bending in or out to hold the orbit radius.
      h = bearing(c, here) + s.orbit * (90 + Math.max(-40, Math.min(40, (d - s.orbitR) * 6))) + rng.normal() * 6;
      v = L.speed; mode = 'orbit';
    }
  }
  s.sprint = loud; s.speed = v; s.mode = mode;
  const [lon, lat] = sail(here, (h + 720) % 360, v);
  s.lon = lon; s.lat = lat; s.age += 1;
  if (s.beh !== 'loiter') {
    const pts = ROUTES[s.route].pts, last = s.wp === pts.length - 1;
    const d = dist([lon, lat], pts[s.wp]);
    if (last && d < ESCAPE_R) s.out = true;
    else if (!last && d < WAYPOINT_R) s.wp += 1;
  }
  return s;
}
