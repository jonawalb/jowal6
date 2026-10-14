// The obstacles-and-fires model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so both
// views, the readout and the tests run this one file.
//
// Sourced (FM 3-90, 1 May 2023, ch. 17): tactical obstacles produce one of four effects, block, disrupt,
// fix or turn, and "obstacle effects occur because of the combined effects of fires and obstacles,
// rather than from obstacles alone" (para 17-21). An obstacle group is "one or more individual
// obstacles that provide a specific obstacle effect" (para 17-64). For obstacles covered by fire a unit
// can seek a bypass or breach as part of a hasty attack; for obstacles not covered by fire it can bypass
// or create the lanes it needs (para 1-79).
// Notional (teaching values, labeled on the page): the column size, speeds, dwell times, which vehicles
// are hit, the route geometry and every loss count.

export const MODEL = {
  n: 8,                 // vehicles in the enemy company-sized column, as drawn (notional)
  speed: 30,            // map units a minute on the march (notional)
  zone: 8,              // a vehicle meets a group this far short of its centre (map units)
  slot: 8,              // spacing of vehicles queued at one group in one lane (map units)
  lane: 7,              // lane offset either side of the centre line on the avenue (map units)
  laneB: 4.5,           // ... on the narrower branch
  gap: 12,              // spacing of vehicles in a lane (map units)
  killAfter: 0.35,      // minutes from meeting a group to a hit vehicle going out of action
  // dwell at a group, minutes: [covered by fires, not covered]
  dwell: { D: [2.0, 0.4], T: [0.5, 0.3], F: [3.0, 0.6], B: [Infinity, 1.5] },
  // vehicles put out of action at each group while it is covered: the k-th arrivals (0-based) there
  kills: { D: [0], T: [0], F: [1, 3], B: [0, 1] },
  nearHit: 0.5,         // friendly men down per covered group that engaged (notional)
  perThrough: 0.6,      // friendly men down per vehicle that got through (notional)
  speedUp: 3.5,         // model minutes per real second on the page
};

export const KEYS = ["D", "T", "F", "B"];
export const NAMES = { D: "Disrupt", T: "Turn", F: "Fix", B: "Block" };

// ---- the map: avenue A, the branch B into the engagement area, and the four groups (map units) ----
// u runs left to right and v down the card in the Battlefield view; the machine's tray is the same plan scaled.
const A_CTRL = [[-170, -46], [-130, -46], [-90, -46], [-60, -45.5], [-20, -43], [30, -41], [90, -39], [160, -37]];
const B_CTRL = [[-8, -34], [14, -14], [34, 8], [52, 26], [74, 42], [96, 58], [122, 78], [160, 104]];
export const ANCHOR = { D: [-86, -46], T: [-12, -43], F: [50, 24], B: [96, 58] };

function crom(c, per = 10) {
  const out = [];
  const p = (i) => c[Math.max(0, Math.min(c.length - 1, i))];
  for (let i = 0; i < c.length - 1; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(c[c.length - 1]);
  return out;
}
function withLen(pts) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const length = L[L.length - 1];
  const at = (s) => {
    const t = Math.max(0, Math.min(length, s));
    let i = 1;
    while (i < L.length - 1 && L[i] < t) i++;
    const a = pts[i - 1], b = pts[i], f = (t - L[i - 1]) / (L[i] - L[i - 1] || 1);
    return { u: a[0] + (b[0] - a[0]) * f, v: a[1] + (b[1] - a[1]) * f, face: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
  };
  const near = ([u, v]) => { let best = 0, bd = Infinity; for (let i = 0; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - u, pts[i][1] - v); if (d < bd) { bd = d; best = L[i]; } } return best; };
  return { pts, L, length, at, near };
}

const A_ROUTE = withLen(crom(A_CTRL));
export const ROUTES = (() => {
  const sT = A_ROUTE.near(ANCHOR.T);
  // B shares avenue A up to just before the turn group, then branches
  const shared = A_ROUTE.pts.filter((_, i) => A_ROUTE.L[i] <= sT - 30);
  const start = A_ROUTE.at(sT - 30);
  const pts = [...shared.slice(0, -1), ...crom([[start.u, start.v], ...(() => { const q = A_ROUTE.at(sT - 12); return [[q.u, q.v]]; })(), ...B_CTRL]).slice(0)];
  const B = withLen(pts);
  return { A: A_ROUTE, B };
})();
// where each group's stop line is, as arc length on the route that meets it
export const STN = (() => {
  const sD = ROUTES.A.near(ANCHOR.D), sT = ROUTES.A.near(ANCHOR.T), sF = ROUTES.B.near(ANCHOR.F), sB = ROUTES.B.near(ANCHOR.B);
  return { D: { route: "A", s: sD }, T: { route: "A", s: sT }, F: { route: "B", s: sF }, B: { route: "B", s: sB } };
})();

export const laneOf = (i) => (i % 2 === 0 ? -1 : 1);       // 0 = north lane, 1 = south lane
export const rankOf = (i) => Math.floor(i / 2);

// ---- one run of the column, for a set of groups covered by fires ----
// cov: { D, T, F, B } booleans. Returns { v: [vehicle], tDone, groups } where each vehicle has samples
// [t, s, routeCode] every dt and events { at, key, fate }.
export function simulate(cov, m = MODEL, dt = 1 / 60) {
  const N = m.n;
  const veh = Array.from({ length: N }, (_, i) => ({ i, lane: laneOf(i), s: -rankOf(i) * m.gap, route: "A", state: "move", key: null, until: 0, off: 0, samples: [], fate: "", tOut: null, done: new Set() }));
  const arrivals = { D: [0, 0], T: [0], F: [0], B: [0] };   // D counts per lane
  const engaged = { D: false, T: false, F: false, B: false };
  const firstMeet = { D: null, T: null, F: null, B: null };
  const through = [];
  let t = 0, guard = 0;
  const stationFor = (k) => STN[k];
  while (guard++ < 60 * 60) {
    let active = false;
    for (const x of veh) {
      if (x.state === "move") {
        active = true;
        x.s += m.speed * dt;
        const route = ROUTES[x.route];
        for (const k of KEYS) {
          const st = stationFor(k);
          if (st.route !== x.route || x.done.has(k)) continue;
          const cnt = veh.filter((y) => y !== x && y.lane === x.lane && y.key === k && (y.state === "dwell" || y.state === "held")).length;
          if (x.s < st.s - m.zone - m.slot * cnt) continue;
          // met a group
          x.done.add(k);
          x.key = k;
          const isCov = cov[k];
          engaged[k] = engaged[k] || isCov;
          if (firstMeet[k] === null) firstMeet[k] = t;
          let rank;
          if (k === "D") {
            // only the south half of the avenue is obstructed
            if (x.lane < 0) { x.key = null; continue; }
            rank = arrivals.D[1]++;
          } else rank = arrivals[k][0]++;
          const hit = isCov && m.kills[k].includes(rank);
          if (hit) { x.state = "hit"; x.until = t + m.killAfter; x.tHit = t; }
          else {
            const d = m.dwell[k][isCov ? 0 : 1];
            if (d === Infinity) x.state = "held"; else { x.state = "dwell"; x.until = t + d; }
          }
          if (k === "T") x.route = isCov ? "B" : "A";
          break;
        }
        if (x.state === "move" && x.s >= ROUTES[x.route].length) { x.state = "through"; x.fate = "through"; x.tOut = t; through.push(x.i); }
      } else if (x.state === "dwell") {
        active = true;
        if (t >= x.until) { x.state = "move"; x.key = null; }
      } else if (x.state === "hit") {
        active = true;
        if (t >= x.until) { x.state = "out"; x.fate = "destroyed"; x.tOut = t; }
      } else if (x.state === "held") {
        active = true;
        // held until the end of the run, then counted as stopped
      }
      x.samples.push([t, x.s, x.route === "A" ? 0 : 1, x.state === "move" || x.state === "through" ? 0 : x.state === "dwell" ? 1 : x.state === "held" ? 2 : x.state === "hit" ? 3 : 4]);
    }
    t += dt;
    // done when nobody can still move or change
    if (!veh.some((x) => x.state === "move" || x.state === "dwell" || x.state === "hit")) break;
  }
  for (const x of veh) if (x.state === "held") x.fate = "held";
  return { v: veh, tDone: t, engaged, firstMeet, cov: { ...cov } };
}

const cache = new Map();
export const keyOf = (cov) => KEYS.map((k) => (cov[k] ? 1 : 0)).join("");
export function planFor(cov, m = MODEL) {
  const k = keyOf(cov);
  if (m === MODEL && cache.has(k)) return cache.get(k);
  const p = simulate(cov, m);
  if (m === MODEL) cache.set(k, p);
  return p;
}

// The pose of vehicle i at model time t in a plan: { route, s, u, v, face, state, lane, off }
// state: "move" | "dwell" | "held" | "hit" | "out" | "through"
const STATES = ["move", "dwell", "held", "hit", "out"];
export function poseAt(plan, i, t, m = MODEL) {
  const x = plan.v[i], smp = x.samples;
  const dt = smp.length > 1 ? smp[1][0] - smp[0][0] : 1 / 60;
  // the vehicle's samples start at t0 = its first sample time (all start at 0)
  const k = Math.max(0, Math.min(smp.length - 1, Math.floor(t / dt)));
  const a = smp[k], b = smp[Math.min(smp.length - 1, k + 1)];
  const f = Math.max(0, Math.min(1, t / dt - k));
  const s = a[1] + (b[1] - a[1]) * f;
  const route = a[2] ? "B" : "A";
  const R = ROUTES[route];
  const p = R.at(s);
  // lane offset: wider on the avenue, narrower on the branch (smooth over 14 units after the branch)
  const sT = STN.T.s;
  const w = route === "B" ? Math.max(0, Math.min(1, (s - (sT - 14)) / 14)) : 0;
  const off0 = x.lane * (m.lane + (m.laneB - m.lane) * w);
  // a vehicle put out of action is pushed off the lane
  let side = 0;
  if (x.fate === "destroyed" && x.tHit !== undefined && t > x.tHit) { const e = Math.min(1, (t - x.tHit) / 0.5); side = x.lane * 5.5 * e * e * (3 - 2 * e); }
  const rad = (p.face + 90) * Math.PI / 180;
  const state = t >= plan.tDone && x.fate === "held" ? "held" : x.fate === "through" && t >= x.tOut ? "through" : STATES[a[3]] ?? "move";
  const off = off0 + side;
  return { route, s, u: p.u + off * Math.cos(rad), v: p.v + off * Math.sin(rad), face: p.face, state, lane: x.lane, off, i };
}

// Counts at time t: enemy vehicles out of action, vehicles through, covered groups that have engaged,
// and the notional friendly men down.
export function tally(plan, t, m = MODEL) {
  let red = 0, through = 0, held = 0;
  for (const x of plan.v) {
    if (x.fate === "destroyed" && t >= x.tOut) red++;
    if (x.fate === "through" && t >= x.tOut) through++;
    if (x.fate === "held" && t >= plan.tDone) held++;
  }
  const engaged = KEYS.filter((k) => plan.cov[k] && plan.firstMeet[k] !== null && t >= plan.firstMeet[k]).length;
  const blue = Math.round(m.nearHit * engaged) + Math.round(m.perThrough * through);
  return { red, through, held, engaged, blue };
}
export const covered = (cov) => KEYS.filter((k) => cov[k]).length;
export const stateWord = (cov) => (covered(cov) === 4 ? "All covered" : covered(cov) === 0 ? "None covered" : `${covered(cov)} of 4 covered`);
