// Game engine: one hunt, advanced an hour at a time. Deterministic given (seed, behaviour, sprint share,
// action log), which is what makes a hunt shareable and replayable from the URL.
import { GAME, SENSORS, DATUM_BOX } from '../data/params.js';
import { makeRng, STREAM } from './rng.js';
import { spawn, stepSub } from './sub.js';
import { makeAsset, activeAt, rollContacts, covers } from './sensors.js';
import { createFilter, predict, update, maybeResample, pOut, pWithin, heat, smooth, centre, bestShot } from './filter.js';
import { dist, bearing, sail, isLand, BOX } from './geo.js';

const R2 = x => Math.round(x * 100) / 100;
const CODE = { buoy: 'b', mpa: 'm' };

function pickDatum(rng) {
  for (let k = 0; k < 500; k++) {
    const p = [DATUM_BOX.lon0 + rng.u() * (DATUM_BOX.lon1 - DATUM_BOX.lon0), DATUM_BOX.lat0 + rng.u() * (DATUM_BOX.lat1 - DATUM_BOX.lat0)];
    if (!isLand(p[0], p[1])) return p.map(R2);
  }
  return [-7.5, 65.2];
}

export function newGame({ seed, beh, share, particles = GAME.particles }) {
  const rs = { sub: makeRng(seed, STREAM.sub), det: makeRng(seed, STREAM.detect), fa: makeRng(seed, STREAM.falseAlarm),
    setup: makeRng(seed, STREAM.setup) };
  const datum = pickDatum(rs.setup);
  const sub = spawn(rs.sub, beh, datum, GAME.datumR);
  const g = {
    seed, beh, share, datum, rs, sub, t: 0, over: null, nextId: 1,
    left: { buoy: SENSORS.buoy.count, mpa: SENSORS.mpa.count },
    assets: [], contacts: [], log: [], events: [],
    ship: { p: SENSORS.ship.start.slice(), track: [SENSORS.ship.start.slice()] },
    subTrack: [{ p: [sub.lon, sub.lat], sprint: false, beh: sub.beh }],
    filter: createFilter(makeRng(seed, STREAM.filter), particles, beh, datum, GAME.datumR),
    snaps: [],
  };
  g.snaps.push(snapshot(g));
  return g;
}

function snapshot(g) {
  const f = g.filter, truth = [g.sub.lon, g.sub.lat];
  const hm = smooth(heat(f));
  const recent = g.contacts.filter(c => c.h >= g.t - 2).map(c => c.p);
  return { h: g.t, heat: hm, pOut: pOut(f), truth, out: g.sub.out, near: pWithin(f, truth, 20),
    best: bestShot(f, hm, GAME.prosR, recent), ship: g.ship.p.slice() };
}

/** Did the player already drop buoys or send the aircraft this hour? One of the two per hour. */
export const usedThisHour = g => g.log.some(e => e.t === g.t && (e.k === 'b' || e.k === 'm'));
export const canPlace = (g, type) => !g.over && g.left[type] > 0 && !usedThisHour(g);

/** Drop a sonobuoy pattern ('buoy') or send the aircraft ('mpa') to p. */
export function place(g, type, p) {
  if (!canPlace(g, type) || isLand(p[0], p[1])) return null;
  p = p.map(R2);
  const a = makeAsset(type, p, g.t, g.nextId++);
  a.name = `${type === 'buoy' ? 'B' : 'A'}${SENSORS[type].count - g.left[type] + 1}`;
  g.assets.push(a);
  g.left[type] -= 1;
  g.log.push({ t: g.t, k: CODE[type], p });
  return a;
}

/** Undo this hour's drop or flight. */
export function undo(g) {
  const last = g.log[g.log.length - 1];
  if (!last || last.t !== g.t || g.over || last.k === 'p') return false;
  g.log.pop();
  const a = g.assets.pop();
  g.left[a.type] += 1;
  return true;
}

/** Attack at p. Ends the hunt. */
export function prosecute(g, p) {
  if (g.over) return null;
  p = p.map(R2);
  g.log.push({ t: g.t, k: 'p', p });
  const d = dist(p, [g.sub.lon, g.sub.lat]);
  const pBelief = pWithin(g.filter, p, GAME.prosR);
  g.over = { kind: d <= GAME.prosR ? 'found' : 'missed', p, d, pBelief, h: g.t };
  return g.over;
}

/** The ship steers itself toward the best attack point on the current map. */
function moveShip(g) {
  const a = g.ship.p, dest = g.snaps[g.snaps.length - 1].best.p, d = dist(a, dest);
  if (d < 0.5) return [a, a];
  const [lon, lat] = sail(a, bearing(a, dest), Math.min(SENSORS.ship.speed, d));
  g.ship.p = [lon, lat];
  return [a, g.ship.p];
}

/**
 * Advance one hour. Returns what happened, for the plain-language summary:
 * { h, results: [{asset, contacts}], contacts, shift: {nm, brg} | null, before, after, pAny }
 */
export function advance(g) {
  if (g.over) return null;
  const h = g.t + 1, before = g.snaps[g.snaps.length - 1].best.v;
  const threats = [{ p: g.ship.p }, ...g.assets.filter(a => a.type === 'mpa' && activeAt(a, h)).map(a => ({ p: a.p }))];
  stepSub(g.sub, g.rs.sub, threats, g.share);
  predict(g.filter, threats, g.share);
  const seg = moveShip(g);
  g.t = h;
  g.ship.track.push(g.ship.p.slice());
  g.subTrack.push({ p: [g.sub.lon, g.sub.lat], sprint: g.sub.sprint, beh: g.sub.beh, evading: g.sub.evadeT > 0 });

  const obs = [], fresh = [];
  const working = [...g.assets.filter(a => activeAt(a, h)), { id: 0, type: 'ship', name: 'Ship', seg }];
  for (const a of working) {
    const cs = rollContacts(a, g.sub, h, g.rs.det, g.rs.fa);
    cs.forEach(c => { c.by = a.name; });
    obs.push({ asset: a, contacts: cs });
    fresh.push(...cs);
  }
  fresh.forEach(c => { c.n = g.contacts.length + 1; g.contacts.push(c); });
  // The shift of the map's centre caused by this hour's search results alone (after the sub moved).
  const c0 = centre(g.filter), searched = g.assets.filter(a => activeAt(a, h));
  const m0 = inFootprints(g.filter, searched);
  const pAny = update(g.filter, obs);
  const c1 = centre(g.filter), m1 = inFootprints(g.filter, searched);
  const shift = c0 && c1 ? { nm: dist(c0, c1), brg: bearing(c0, c1) } : null;
  maybeResample(g.filter);
  g.snaps.push(snapshot(g));
  if (g.sub.out) g.over = { kind: 'escaped', h };
  else if (h >= GAME.hours) g.over = { kind: 'timeout', h };
  const ev = { h, results: obs, contacts: fresh, shift, cover: searched.length ? [m0, m1] : null, before, after: g.snaps[g.snaps.length - 1].best.v, pAny };
  g.events.push(ev);
  return ev;
}

/** Probability inside the circles and squares of the given sonobuoy and aircraft searches. */
function inFootprints(f, assets) {
  if (!assets.length) return 0;
  let s = 0;
  f.parts.forEach((q, i) => { if (!q.out && assets.some(a => covers(a, [q.lon, q.lat]))) s += f.w[i]; });
  return s;
}

/** Rebuild a hunt from its log: apply each hour's actions, then advance, for n hours. */
export function replay(opts, log, n) {
  const g = newGame(opts);
  for (let t = 0; t <= n && !g.over; t++) {
    for (const e of log.filter(x => x.t === t)) {
      if (e.k === 'b') place(g, 'buoy', e.p);
      else if (e.k === 'm') place(g, 'mpa', e.p);
      else if (e.k === 'p') prosecute(g, e.p);
    }
    if (t < n && !g.over) advance(g);
  }
  return g;
}

export const inBox = p => p[0] > BOX[0] && p[0] < BOX[2] && p[1] > BOX[1] && p[1] < BOX[3];
