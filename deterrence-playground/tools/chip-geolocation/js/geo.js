// Where Is the Chip? Pure model math: distances, round-trip times, distance bounds and the feasible region.
// No DOM and no d3, so scripts/geo.test.mjs can run it under node.
//
// Physics (sources in data/sources.js):
//   c in vacuum = 299,792.458 km/s = 299.792458 km/ms (SI definition).
//   Light in standard fiber travels at about two-thirds of c, ~200 km/ms (IAPS 2024 report, p. 17; CSET 2026, App. B).
//   A round-trip time t (ms) at assumed speed v bounds the one-way distance: d_max = v * t / 2 (CSET 2026, Eq. 1.1).
// Everything about the network (route inflation, equipment latency, jitter) is a NOTIONAL parameter.

export const R_EARTH = 6371.0088;          // km, IUGG mean radius
export const C_VACUUM = 299.792458;        // km per ms
export const V_FIBER = 200;                // km per ms, about 2/3 c
export const DARK_FIBER_EQUIP = 0.1;       // ms one-way equipment latency on a private line (CSET best case)

const RAD = Math.PI / 180;

/** Great-circle distance in km between [lon, lat] points. */
export function distKm(a, b) {
  const [lon1, lat1] = a, [lon2, lat2] = b;
  const dLat = (lat2 - lat1) * RAD, dLon = (lon2 - lon1) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Verifier speed assumptions. `speed(net)` returns km/ms used to turn RTT into a distance bound. */
export const SPEEDS = {
  vacuum: { label: 'Light in vacuum', short: 'c', speed: () => C_VACUUM,
    note: 'Nothing travels faster, so the bound always holds.' },
  fiber: { label: 'Light in fiber', short: '⅔ c', speed: () => V_FIBER,
    note: 'Holds for any fiber path. A faster medium (a radio link) can beat it.' },
  calibrated: { label: 'Calibrated to the internet', short: 'fiber ÷ route', speed: net => V_FIBER / (1 + net.route),
    note: 'Assumes the usual route inflation. Tighter circles, but a straighter private line can beat it.' },
};

/** Link types a chip operator can use on its own legs. */
export const LINKS = {
  internet: { label: 'Ordinary internet', speed: () => V_FIBER, inflate: net => 1 + net.route, equip: net => net.equip },
  dark: { label: 'Dark fiber (straight private line)', speed: () => V_FIBER, inflate: () => 1, equip: () => DARK_FIBER_EQUIP },
  radio: { label: 'Radio link (near light speed)', speed: () => C_VACUUM * 0.997, inflate: () => 1, equip: () => DARK_FIBER_EQUIP },
};

/** One-way time in ms over a leg of straight-line length d km for a link type. */
export function legMs(d, link, net) {
  const L = LINKS[link] || LINKS.internet;
  return (d * L.inflate(net)) / L.speed(net) + L.equip(net);
}

/**
 * Simulated round-trip time (ms) from a landmark to the chip.
 *   landmark, chip, proxy: [lon, lat]; proxy may be null.
 *   net: { route (fraction, e.g. 0.2), equip (ms one-way), jitter (ms max) }
 *   attack: { link, delay (ms added to every reply), extra (ms added to this landmark only) }
 *   u: a number in [0, 1) that sets this measurement's jitter.
 * With a proxy, the landmark talks to the proxy over the ordinary internet, and the proxy forwards the
 * signed challenge to the chip over the attacker's link; only the chip holds the signing key.
 */
export function simulateRtt(landmark, chip, net, attack = {}, proxy = null, u = 0) {
  const link = attack.link || 'internet';
  let oneWay;
  if (proxy) oneWay = legMs(distKm(landmark, proxy), 'internet', net) + legMs(distKm(proxy, chip), link, net);
  else oneWay = legMs(distKm(landmark, chip), link, net);
  return 2 * oneWay + net.jitter * u + (attack.delay || 0) + (attack.extra || 0);
}

/** Distance bound (km) from an RTT under an assumed speed (km/ms). Never negative. */
export function boundKm(rtt, speed) { return Math.max(0, (speed * rtt) / 2); }

/** Deterministic jitter draws in [0, 1): one per landmark per measurement round. */
export function jitterDraw(seed, i) {
  let s = (Math.imul(seed + 1, 2654435761) ^ Math.imul(i + 7, 40503)) >>> 0;
  s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
  s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
  return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
}

/**
 * Measure every landmark. Returns [{ i, pos, rtt, bound }].
 *   landmarks: [{ pos:[lon,lat], extra? }]
 */
export function measure(landmarks, chip, net, verifier, attack = {}, proxy = null, seed = 0) {
  const v = (SPEEDS[verifier] || SPEEDS.vacuum).speed(net);
  return landmarks.map((L, i) => {
    const rtt = simulateRtt(L.pos, chip, net, { ...attack, extra: L.extra || 0 }, proxy, jitterDraw(seed, i));
    return { i, pos: L.pos, rtt, bound: boundKm(rtt, v) };
  });
}

/** Is a point inside every bound disk? */
export function feasible(p, bounds) {
  for (const b of bounds) if (distKm(p, b.pos) > b.bound) return false;
  return true;
}

/** Latitude/longitude window that contains a disk of radius r km around c. */
export function diskWindow(c, r) {
  const rd = r / R_EARTH / RAD;
  const [lon, lat] = c;
  const lat0 = Math.max(-90, lat - rd), lat1 = Math.min(90, lat + rd);
  if (rd >= 180 || Math.abs(lat) + rd >= 89.9) return { lat0, lat1, lon0: -180, lon1: 180, full: true };
  const dl = Math.asin(Math.min(1, Math.sin(rd * RAD) / Math.cos(lat * RAD))) / RAD;
  if (dl >= 179.9) return { lat0, lat1, lon0: -180, lon1: 180, full: true };
  return { lat0, lat1, lon0: lon - dl, lon1: lon + dl, full: false };
}

const wrap = lon => ((((lon + 180) % 360) + 360) % 360) - 180;

/** Point at distance km and bearing (radians) from c = [lon, lat]. */
export function destination([lon, lat], km, brg) {
  const d = km / R_EARTH, p1 = lat * RAD, l1 = lon * RAD;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(brg));
  const l2 = l1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [wrap(l2 / RAD), p2 / RAD];
}

/** Classification within `d` degrees: `any` if the point or a neighbour is in R, `all` if all are. */
function near(classify, lon, lat, d) {
  let any = false, all = true;
  for (const [dx, dy] of [[0, 0], [-d, -d], [d, -d], [-d, d], [d, d], [0, -d], [0, d], [-d, 0], [d, 0]]) {
    const r = classify(wrap(lon + dx), Math.max(-89.99, Math.min(89.99, lat + dy))).r;
    any = any || r; all = all && r;
  }
  return { any, all };
}

export const RASTER_DEG = 0.125;   // resolution of the browser's country raster (raster.js)
export const EDGE_KM = 3;          // spacing of boundary samples along each circle

/**
 * Sample the feasible region.
 *   classify(lon, lat) -> { r: bool (in the country to rule out), k: bool (in the claimed country) }
 * Two passes:
 *   1. A lat/lon grid inside the smallest circle (step adapts between minStep and 2 degrees) for areas.
 *   2. Points every ~EDGE_KM along every circle that fall inside all the others: the region's whole boundary.
 * For "any part in R" (ruling a country out), every sample also tests neighbours one raster cell away (and half a
 * grid step on the grid), so a thin overlap at the region's edge or a border cell is not missed. For "all in R"
 * (proof the chip is inside), every sample and its neighbours must be in R. Areas are grid estimates.
 */
export function region(bounds, classify, { maxPts = 9000, minStep = 0.05, edgeKm = EDGE_KM, cellDeg = RASTER_DEG } = {}) {
  const empty = { area: 0, areaR: 0, areaK: 0, n: 0, nEdge: 0, step: 0, pts: [], anyR: false, allR: false, anyK: false };
  if (!bounds.length) return { ...empty, unbounded: true };
  const tight = bounds.reduce((a, b) => (b.bound < a.bound ? b : a));
  const w = diskWindow(tight.pos, tight.bound);
  const span = (w.lat1 - w.lat0) * (w.lon1 - w.lon0);
  let step = Math.sqrt(Math.max(span, 1e-6) / maxPts);
  step = Math.min(2, Math.max(minStep, step));
  const cell = (step * RAD * R_EARTH) ** 2;
  const dGrid = Math.max(cellDeg, Math.min(step / 2, 0.5));
  let area = 0, areaR = 0, areaK = 0, n = 0, anyR = false, allR = true, anyK = false;
  const pts = [];
  for (let lat = w.lat0 + step / 2; lat < w.lat1; lat += step) {
    const a = cell * Math.cos(lat * RAD);
    for (let lon = w.lon0 + step / 2; lon < w.lon1; lon += step) {
      const p = [wrap(lon), lat];
      if (!feasible(p, bounds)) continue;
      const c = classify(p[0], p[1]);
      n++; area += a;
      if (c.r) areaR += a;
      if (c.k) { areaK += a; anyK = true; }
      const nb = near(classify, p[0], p[1], dGrid);
      anyR = anyR || nb.any; allR = allR && nb.all;
      if (pts.length < 4000) pts.push(p);
    }
  }
  // Boundary pass
  let nEdge = 0;
  const slack = b => b.bound + 1e-6;
  for (const b of bounds) {
    if (b.bound <= 0) continue;
    const circ = 2 * Math.PI * R_EARTH * Math.sin(Math.min(Math.PI / 2, b.bound / R_EARTH));
    const m = Math.min(6000, Math.max(360, Math.ceil(circ / edgeKm)));
    const r = b.bound * (1 - 1e-9);
    for (let k = 0; k < m; k++) {
      const p = destination(b.pos, r, (2 * Math.PI * k) / m);
      if (!bounds.every(o => distKm(p, o.pos) <= slack(o))) continue;
      nEdge++;
      const nb = near(classify, p[0], p[1], cellDeg);
      anyR = anyR || nb.any; allR = allR && nb.all;
      if (!anyK && classify(p[0], p[1]).k) anyK = true;
      if (pts.length < 4000 && n === 0) pts.push(p);
    }
  }
  if (!n && !nEdge) allR = false;
  return { area, areaR, areaK, n: n + nEdge, nGrid: n, nEdge, step, pts, anyR, allR, anyK };
}

/**
 * Verdicts.
 * Verifier view: can the country be ruled out?
 * Attacker view: under a strict policy the chip passes only if the country is ruled out; under a lenient
 * policy it passes unless the whole region lies inside the country, as long as the region reaches the claimed country.
 */
export function verdict(reg, { chipInR = false, chipFeasible = true, policy = 'strict', needClaim = false } = {}) {
  if (!reg.n) return { key: 'empty', ruledOut: false, pass: false };
  const ruledOut = !reg.anyR;
  const proven = reg.allR;
  const claimOk = !needClaim || reg.anyK;
  const pass = claimOk && (policy === 'strict' ? ruledOut : !proven);
  let key;
  if (ruledOut && chipInR) key = 'fooled';           // only possible when the speed assumption was beaten
  else if (ruledOut) key = 'ruledout';
  else if (proven) key = 'proven';
  else key = 'ambiguous';
  return { key, ruledOut, proven, pass, claimOk, chipFeasible, shareR: reg.area ? reg.areaR / reg.area : 0 };
}
