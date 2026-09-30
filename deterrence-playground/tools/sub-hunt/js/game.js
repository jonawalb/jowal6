// Game engine: one hunt, advanced an hour at a time. Deterministic given (seed, behaviour, sprint share,
// action log), which is what makes a hunt shareable and replayable from the URL.
import { GAME, SENSORS, CLUES, DATUM_BOX } from '../data/params.js';
import { makeRng, STREAM } from './rng.js';
import { spawn, stepSub } from './sub.js';
import { makeAsset, activeAt, rollContacts } from './sensors.js';
import { createFilter, predict, update, applyClue, maybeResample, pOut, pWithin, heat, smooth, halfArea } from './filter.js';
import { dist, bearing, sail, isLand, seaPointNear, BOX } from './geo.js';

const R2 = x => Math.round(x * 100) / 100;
const CLUE_REGION = { lon0: -20, lon1: 0, lat0: 60, lat1: 67 };
const CLUE_AREA = 20 * 60 * Math.cos(63.5 * Math.PI / 180) * 7 * 60;

function pickDatum(rng) {
  for (let k = 0; k < 500; k++) {
    const p = [DATUM_BOX.lon0 + rng.u() * (DATUM_BOX.lon1 - DATUM_BOX.lon0), DATUM_BOX.lat0 + rng.u() * (DATUM_BOX.lat1 - DATUM_BOX.lat0)];
    if (!isLand(p[0], p[1])) return p.map(R2);
  }
  return [-7.5, 65.2];
}

export function newGame({ seed, beh, share, particles = GAME.particles }) {
  const rs = { sub: makeRng(seed, STREAM.sub), det: makeRng(seed, STREAM.detect), fa: makeRng(seed, STREAM.falseAlarm),
    clue: makeRng(seed, STREAM.clue), setup: makeRng(seed, STREAM.setup) };
  const datum = pickDatum(rs.setup);
  const sub = spawn(rs.sub, beh, datum, GAME.datumR);
  const g = {
    seed, beh, share, datum, rs, sub, t: 0, budget: GAME.budget, over: null, nextId: 1,
    assets: [], contacts: [], clues: [], log: [], hourPAny: [],
    ship: { p: SENSORS.ship.start.slice(), dest: SENSORS.ship.start.slice(), track: [SENSORS.ship.start.slice()] },
    subTrack: [{ p: [sub.lon, sub.lat], sprint: false, beh: sub.beh }],
    filter: createFilter(makeRng(seed, STREAM.filter), particles, beh, datum, GAME.datumR),
    snaps: [],
  };
  g.snaps.push(snapshot(g, 0));
  return g;
}

function snapshot(g, pAny) {
  const f = g.filter, truth = [g.sub.lon, g.sub.lat];
  const hm = smooth(heat(f));
  return { h: g.t, heat: hm, pOut: pOut(f), truth, sprint: g.sub.sprint, out: g.sub.out, pAny,
    near: pWithin(f, truth, 20), half: halfArea(hm), ship: g.ship.p.slice() };
}

export const cost = type => SENSORS[type].cost;
export const canPlace = (g, type) => !g.over && g.budget >= cost(type);

/** Lay a sonobuoy field ('buoy') or order an aircraft sweep ('mpa') at p. */
export function place(g, type, p) {
  if (!canPlace(g, type) || isLand(p[0], p[1])) return null;
  p = p.map(R2);
  const a = makeAsset(type, p, g.t, g.nextId++);
  g.assets.push(a);
  g.budget -= cost(type);
  g.log.push({ t: g.t, k: type === 'buoy' ? 'b' : 'm', p });
  return a;
}

export function orderShip(g, p) {
  if (g.over || isLand(p[0], p[1])) return false;
  p = p.map(R2);
  g.ship.dest = p;
  g.log.push({ t: g.t, k: 's', p });
  return true;
}

/** Undo the last action taken this hour. */
export function undo(g) {
  const last = g.log[g.log.length - 1];
  if (!last || last.t !== g.t || g.over) return false;
  g.log.pop();
  if (last.k === 's') {
    const prev = [...g.log].reverse().find(e => e.k === 's');
    g.ship.dest = prev ? prev.p.slice() : g.ship.p.slice();
  } else {
    const a = g.assets.pop();
    g.budget += cost(a.type);
  }
  return true;
}

/** Commit to a prosecution at p. Ends the hunt. */
export function prosecute(g, p) {
  if (g.over) return null;
  p = p.map(R2);
  g.log.push({ t: g.t, k: 'p', p });
  const d = dist(p, [g.sub.lon, g.sub.lat]);
  const pBelief = pWithin(g.filter, p, GAME.prosR);
  g.over = { kind: d <= GAME.prosR ? 'found' : 'missed', p, d, pBelief, h: g.t };
  return g.over;
}

function moveShip(g) {
  const a = g.ship.p, d = dist(a, g.ship.dest);
  if (d < 0.5) return [a, a];
  const [lon, lat] = sail(a, bearing(a, g.ship.dest), Math.min(SENSORS.ship.speed, d));
  g.ship.p = [lon, lat];
  return [a, g.ship.p];
}

function clueFor(g, c) {
  const r = g.rs.clue, s = g.sub;
  if (c.kind === 'side') {
    const v = c.axis === 'lon' ? s.lon < c.cut : s.lat > c.cut;
    const says = r.u() < c.rel ? v : !v;
    const fn = p => { const pv = c.axis === 'lon' ? p.lon < c.cut : p.lat > c.cut; return pv === says ? c.rel : 1 - c.rel; };
    return { h: g.t, text: c.text(says), kind: c.kind, axis: c.axis, cut: c.cut, says, fn };
  }
  let p;
  if (r.u() < c.rel) p = seaPointNear(r, [s.lon, s.lat], c.sigma);
  else {
    p = [CLUE_REGION.lon0 + r.u() * 20, CLUE_REGION.lat0 + r.u() * 7];
    if (isLand(p[0], p[1])) p = seaPointNear(r, p, 60);
  }
  const fn = q => { const d = dist([q.lon, q.lat], p); return c.rel * Math.exp(-d * d / (2 * c.sigma ** 2)) / (2 * Math.PI * c.sigma ** 2) + (1 - c.rel) / CLUE_AREA; };
  return { h: g.t, text: c.text(), kind: c.kind, p, sigma: c.sigma, fn };
}

/** Advance one hour. Returns what happened for the log. */
export function advance(g) {
  if (g.over) return null;
  const h = g.t + 1;
  const threats = [{ p: g.ship.p }, ...g.assets.filter(a => a.type === 'mpa' && activeAt(a, h)).map(a => ({ p: a.p }))];
  stepSub(g.sub, g.rs.sub, threats, g.share);
  predict(g.filter, threats, g.share);
  const seg = moveShip(g);
  g.t = h;
  g.ship.track.push(g.ship.p.slice());
  g.subTrack.push({ p: [g.sub.lon, g.sub.lat], sprint: g.sub.sprint, beh: g.sub.beh, evading: g.sub.evadeT > 0 });

  const obs = [], fresh = [];
  const working = [...g.assets.filter(a => activeAt(a, h)), { id: 0, type: 'ship', seg }];
  for (const a of working) {
    const cs = rollContacts(a, g.sub, h, g.rs.det, g.rs.fa);
    obs.push({ asset: a, contacts: cs });
    fresh.push(...cs);
  }
  fresh.forEach(c => { c.n = g.contacts.length + 1; g.contacts.push(c); });
  const pAny = update(g.filter, obs);
  let clue = null;
  const cdef = CLUES.find(c => c.hour === h);
  if (cdef && !g.sub.out) { clue = clueFor(g, cdef); g.clues.push(clue); applyClue(g.filter, clue.fn); }
  maybeResample(g.filter);
  g.snaps.push(snapshot(g, pAny));
  if (g.sub.out) g.over = { kind: 'escaped', h };
  else if (h >= GAME.hours) g.over = { kind: 'timeout', h };
  return { h, contacts: fresh, clue, pAny };
}

/** Rebuild a hunt from its log: apply each hour's actions, then advance, for n hours. */
export function replay(opts, log, n) {
  const g = newGame(opts);
  for (let t = 0; t <= n && !g.over; t++) {
    for (const e of log.filter(x => x.t === t)) {
      if (e.k === 'b') place(g, 'buoy', e.p);
      else if (e.k === 'm') place(g, 'mpa', e.p);
      else if (e.k === 's') orderShip(g, e.p);
      else if (e.k === 'p') prosecute(g, e.p);
    }
    if (t < n && !g.over) advance(g);
  }
  return g;
}

export const inBox = p => p[0] > BOX[0] && p[0] < BOX[2] && p[1] > BOX[1] && p[1] < BOX[3];

