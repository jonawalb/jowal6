// The OAKOC model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so both views, the readout
// and the tests run this one file.
//
// Sourced (the five military aspects of terrain and their order): ATP 3-21.8 para 2-62 and FM 3-90
// para 3-23 list observation and fields of fire, avenues of approach, key terrain, obstacles, and cover and
// concealment; another order is the model's own notional alternative.
// Notional (teaching values, labeled on the page): the ground, every distance, the observer's reach, the
// step costs, the route search and the loss rate. One distance unit is about a metre (notional).

export const ASPECTS = {
  o: { key: "o", name: "Observation and fields of fire", short: "Observation and fields of fire" },
  a: { key: "a", name: "Avenues of approach", short: "Avenues of approach" },
  k: { key: "k", name: "Key terrain", short: "Key terrain" },
  b: { key: "b", name: "Obstacles", short: "Obstacles" },
  c: { key: "c", name: "Cover and concealment", short: "Cover and concealment" },
};
// The order the manuals list the five in (ATP 3-21.8 para 2-62; FM 3-90 para 3-23), and the order of the
// alternative order (obstacles, avenues of approach, key terrain, observation and fields of fire,
// cover and concealment).
export const ORDERS = {
  list: { name: "As listed (ATP 3-21.8)", seq: ["o", "a", "k", "b", "c"] },
  tech: { name: "Alternative order (notional)", seq: ["b", "a", "k", "o", "c"] },
};

export const MODEL = {
  world: { x0: -120, y0: -90, x1: 120, y1: 90 },
  cell: 4,
  hills: [
    { id: "H1", cx: -22, cy: 46, r: 36, steps: 4, h: 2.6, top: 0.3 },   // the enemy's observation hill
    { id: "H2", cx: 76, cy: 34, r: 32, steps: 4, h: 2.6, top: 0.3 },    // the hill over the crossing and the objective
    { id: "H3", cx: 8, cy: -26, r: 24, steps: 3, h: 3.2, top: 0.4 },  // a knoll: high ground that is not key terrain
  ],
  stream: [[-130, 2], [-84, 8], [-34, 3], [18, 9], [62, 2], [130, 6]],   // an obstacle except at a ford and a bridge
  streamHalf: 4.4,
  ford: { x: -40, half: 7 },
  bridge: { x: 58, half: 5 },
  wire: [[-62, 20], [-44, 24], [-24, 18]],   // a wire belt north of the ford
  wireHalf: 3.2,
  woods: [{ cx: -96, cy: 22, r: 24 }, { cx: 6, cy: -52, r: 18 }],
  village: [[30, -34], [40, -30], [34, -42], [46, -40]],   // house centres: cover
  wall: [[48, -26], [54, -18], [58, -10]],                  // a stone wall to the bridge: cover
  bankHalf: 3.0,    // the bank is cover for this much either side of the water's edge
  start: [-104, -60],
  objective: [110, 64],     // the mission's objective (the model's own)
  junction: [110, 64],
  eyeE: 1.7, eyeP: 1.0,     // eye heights
  obsHeight: 0.4,
  Re: 85,                  // how far the enemy observer sees and its weapons reach
  corridor: 9,              // half width of an avenue corridor
  cost: { wood: 2.2, climb: 2.0, exposed: 5.0 },
  P0: 30,                   // men in the platoon
  rate: 0.095,              // men down per unit of route walked in the enemy's view, in the open
  speed: 22,                // units a second the platoon walks on the page
};
const M = MODEL;

// ---- ground ----
export function height(x, y, m = M) {
  let z = 0;
  for (const h of m.hills) {
    const d = Math.hypot(x - h.cx, y - h.cy);
    for (let i = 0; i < h.steps; i++) {
      const f = 1 - (i / Math.max(1, h.steps - 1)) * (1 - h.top);
      if (h.r * f >= d - 1e-9) z += h.h; else break;
    }
  }
  return z;
}
export function sees(ax, ay, ha, bx, by, hb, m = M) {
  const za = height(ax, ay, m) + ha, zb = height(bx, by, m) + hb;
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (height(ax + (bx - ax) * t, ay + (by - ay) * t, m) > za + (zb - za) * t + 1e-9) return false;
  }
  return true;
}
const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const polyDist = (px, py, pts) => { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, py, ...pts[i], ...pts[i + 1])); return d; };
export const streamY = (x, m = M) => {
  const p = m.stream;
  for (let i = 0; i < p.length - 1; i++) if (x >= p[i][0] && x <= p[i + 1][0]) return p[i][1] + ((p[i + 1][1] - p[i][1]) * (x - p[i][0])) / (p[i + 1][0] - p[i][0]);
  return p[p.length - 1][1];
};
const inWood = (x, y, m = M) => m.woods.some((w) => Math.hypot(x - w.cx, y - w.cy) <= w.r);
const crossing = (x, m = M) => Math.abs(x - m.ford.x) <= m.ford.half || Math.abs(x - m.bridge.x) <= m.bridge.half;

// ---- the grid ----
const C = M.cell, W = M.world;
export const NX = Math.round((W.x1 - W.x0) / C), NY = Math.round((W.y1 - W.y0) / C);
export const cx = (i) => W.x0 + (i + 0.5) * C;
export const cy = (j) => W.y0 + (j + 0.5) * C;
export const idx = (i, j) => j * NX + i;
export const E_POS = () => [M.hills[0].cx, M.hills[0].cy];

function build(m = M) {
  const n = NX * NY;
  const g = { z: new Float32Array(n), visible: new Uint8Array(n), nogo: new Uint8Array(n), wood: new Uint8Array(n), cover: new Uint8Array(n), exposed: new Uint8Array(n), water: new Uint8Array(n), wire: new Uint8Array(n) };
  const [ex, ey] = [m.hills[0].cx, m.hills[0].cy];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const x = cx(i), y = cy(j), k = idx(i, j);
    g.z[k] = height(x, y, m);
    const d = Math.hypot(x - ex, y - ey);
    g.visible[k] = d <= m.Re && sees(ex, ey, m.eyeE + m.obsHeight, x, y, m.eyeP, m) ? 1 : 0;
    const sd = polyDist(x, y, m.stream);
    g.water[k] = sd <= m.streamHalf && !crossing(x, m) ? 1 : 0;
    g.wire[k] = polyDist(x, y, m.wire) <= m.wireHalf ? 1 : 0;
    g.nogo[k] = g.water[k] || g.wire[k] ? 1 : 0;
    g.wood[k] = inWood(x, y, m) ? 1 : 0;
    const bank = sd <= m.streamHalf + m.bankHalf && sd > m.streamHalf - 0.5 && !crossing(x, m);
    const vil = m.village.some(([hx, hy]) => Math.hypot(x - hx, y - hy) <= 6.5);
    const wal = polyDist(x, y, m.wall) <= 2.6;
    g.cover[k] = bank || vil || wal ? 1 : 0;
    g.exposed[k] = g.visible[k] && !g.cover[k] && !g.wood[k] ? 1 : 0;
  }
  return g;
}
export const GRID = build();

// ---- route search (8-neighbour A* on the grid) ----
// knows: which aspects the planner has applied. Costs use only what is known.
function search(from, to, know, opts = {}, g = GRID, m = M) {
  const fi = Math.max(0, Math.min(NX - 1, Math.floor((from[0] - W.x0) / C))), fj = Math.max(0, Math.min(NY - 1, Math.floor((from[1] - W.y0) / C)));
  const ti = Math.max(0, Math.min(NX - 1, Math.floor((to[0] - W.x0) / C))), tj = Math.max(0, Math.min(NY - 1, Math.floor((to[1] - W.y0) / C)));
  const N = NX * NY, dist = new Float64Array(N).fill(1e12), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const open = [[0, idx(fi, fj)]];
  dist[idx(fi, fj)] = 0;
  const allowed = (k) => {
    if (opts.corridor && !opts.corridor[k]) return false;
    if (opts.blockX && g.water[k] === 0) { /* handled below */ }
    return true;
  };
  while (open.length) {
    let bi = 0; for (let q = 1; q < open.length; q++) if (open[q][0] < open[bi][0]) bi = q;
    const [, k] = open.splice(bi, 1)[0];
    if (done[k]) continue; done[k] = 1;
    if (k === idx(ti, tj)) break;
    const ki = k % NX, kj = (k / NX) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ki + di, nj = kj + dj;
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NY) continue;
      const nk = idx(ni, nj);
      if (done[nk] || !allowed(nk)) continue;
      if (know.b && g.nogo[nk]) continue;
      if (know.b && di && dj && (g.nogo[idx(ki + di, kj)] || g.nogo[idx(ki, kj + dj)])) continue;
      if (opts.blockCrossing) { const x = cx(ni); if (Math.abs(x - opts.blockCrossing) <= 12 && polyDist(cx(ni), cy(nj), m.stream) <= m.streamHalf + 0.5) continue; }
      const step = Math.hypot(di, dj) * C;
      let c = step;
      if (know.b && g.wood[nk]) c *= m.cost.wood;
      const dz = Math.max(0, g.z[nk] - g.z[k]);
      if (know.b || opts.terrainCost) c += dz * m.cost.climb;
      if (know.o) { const exp = know.c ? g.exposed[nk] : g.visible[nk]; if (exp) c += step * m.cost.exposed; }
      const nd = dist[k] + c;
      if (nd < dist[nk]) { dist[nk] = nd; prev[nk] = k; open.push([nd + Math.hypot(ni - ti, nj - tj) * C, nk]); }
    }
  }
  const path = [];
  let k = idx(ti, tj);
  if (prev[k] < 0 && k !== idx(fi, fj)) return null;
  for (; k >= 0; k = prev[k]) { path.push([cx(k % NX), cy((k / NX) | 0)]); if (k === idx(fi, fj)) break; }
  path.reverse();
  path[0] = from.slice(); path[path.length - 1] = to.slice();
  return path;
}
// light smoothing that keeps the path honest: a 3-point average, ends fixed
export const smooth = (p) => p.length < 4 ? p : p.map((q, i) => i === 0 || i === p.length - 1 ? q : [(p[i - 1][0] + q[0] * 2 + p[i + 1][0]) / 4, (p[i - 1][1] + q[1] * 2 + p[i + 1][1]) / 4]);

// the two avenues (the staff's overlay): the cheapest way in through the ford and through the bridge
const wholeKnow = { b: 1 };
export function avenues(m = M) {
  const A = search(m.start, m.objective, wholeKnow, { blockCrossing: m.bridge.x, terrainCost: true });
  const B = search(m.start, m.objective, wholeKnow, { blockCrossing: m.ford.x, terrainCost: true });
  return { ford: A, bridge: B };
}
const keyTopCache = {};
export function keyTop(m = M) { return [m.hills[1].cx, m.hills[1].cy]; }

// ---- key terrain: the candidate that sees the most of the two avenues (notional score) ----
export function keyScores(m = M) {
  const av = avenues(m);
  const cand = [
    { id: "H1", at: [m.hills[0].cx, m.hills[0].cy] }, { id: "H2", at: [m.hills[1].cx, m.hills[1].cy] }, { id: "H3", at: [m.hills[2].cx, m.hills[2].cy] },
    { id: "Bridge", at: [m.bridge.x, streamY(m.bridge.x, m)] },
  ];
  const pts = [];
  for (const a of [av.ford, av.bridge]) for (let i = 0; i < a.length; i++) pts.push(a[i]);
  return cand.map((c) => {
    let seen = 0;
    for (const [x, y] of pts) if (Math.hypot(x - c.at[0], y - c.at[1]) <= m.Re && sees(c.at[0], c.at[1], m.eyeE + m.obsHeight, x, y, m.eyeP, m)) seen++;
    // the crossing site, and the objective, count too: what a position sees of the way to the objective
    const jx = m.junction;
    const seesJ = Math.hypot(jx[0] - c.at[0], jx[1] - c.at[1]) <= m.Re && sees(c.at[0], c.at[1], m.eyeE + m.obsHeight, jx[0], jx[1], m.eyeP, m);
    return { ...c, seen, seesJ, score: seen + (seesJ ? 60 : 0) };
  });
}
export function keyTerrain(m = M) {
  const s = keyScores(m);
  return s.reduce((a, b) => (b.score > a.score ? b : a));
}

// ---- the planner's route given what it has applied ----
export const knowOf = (seq, n) => { const k = {}; for (let i = 0; i < n; i++) k[seq[i]] = 1; return k; };
let AV = null;
export function corridorMask(av) {
  const mk = new Uint8Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const x = cx(i), y = cy(j);
    if (Math.min(polyDist(x, y, av.ford), polyDist(x, y, av.bridge)) <= M.corridor || Math.hypot(x - M.hills[1].cx, y - M.hills[1].cy) <= M.hills[1].r) mk[idx(i, j)] = 1;
  }
  return mk;
}
export function plan(seq, n, m = M) {
  const know = knowOf(seq, n);
  const goal = know.k ? keyTop(m) : m.objective;
  AV = AV || avenuesFor(m);
  const opts = { terrainCost: false };
  if (know.a) opts.corridor = AV.mask;
  let path = search(m.start, goal, know, opts);
  if (!path) path = [m.start, goal];
  return path;
}
function avenuesFor(m = M) { const av = avenues(m); return { ...av, mask: corridorMask(av) }; }
export const AVENUES = () => (AV = AV || avenuesFor(M));

// ---- walking a route: length, what it crosses, who sees it ----
export function walk(path, m = M, g = GRID) {
  const pts = [path[0]], at = [0], ex = [0], halt = { at: null, why: "" };
  let len = 0, expo = 0, blocked = -1, haltD = 0;
  const out = { pts: [], s: [], exp: [], halted: false, haltWhy: "" };
  const step = 1;
  const cellOf = (x, y) => { const i = Math.floor((x - W.x0) / C), j = Math.floor((y - W.y0) / C); return i < 0 || j < 0 || i >= NX || j >= NY ? -1 : idx(i, j); };
  out.pts.push(path[0]); out.s.push(0); out.exp.push(0);
  let stop = false;
  for (let i = 0; i < path.length - 1 && !stop; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1];
    const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / step));
    for (let q = 1; q <= n; q++) {
      const x = ax + ((bx - ax) * q) / n, y = ay + ((by - ay) * q) / n, k = cellOf(x, y);
      if (k >= 0 && g.nogo[k]) { out.halted = true; out.haltWhy = g.wire[k] ? "wire" : "stream"; stop = true; break; }
      const d = L / n; len += d;
      if (k >= 0 && g.exposed[k]) expo += d;
      out.pts.push([x, y]); out.s.push(len); out.exp.push(expo);
    }
  }
  out.length = len; out.exposed = expo;
  out.down = Math.floor(expo * m.rate + 1e-9);
  return out;
}
export const downAt = (w, s, m = M) => {
  let lo = 0;
  for (let i = 0; i < w.s.length; i++) { if (w.s[i] <= s) lo = i; else break; }
  return Math.floor(w.exp[lo] * m.rate + 1e-9);
};
// the position on a walked route at distance s
export function posAt(w, s) {
  const S = Math.min(Math.max(0, s), w.length);
  let lo = 0;
  for (let i = 0; i < w.s.length - 1; i++) { if (w.s[i] <= S) lo = i; else break; }
  const a = w.pts[lo], b = w.pts[Math.min(lo + 1, w.pts.length - 1)], d = w.s[Math.min(lo + 1, w.s.length - 1)] - w.s[lo] || 1;
  const t = Math.max(0, Math.min(1, (S - w.s[lo]) / d));
  const j = Math.min(w.pts.length - 1, lo + 1);
  const bx = w.pts[Math.min(w.pts.length - 1, lo + 3)];
  const ax = w.pts[Math.max(0, lo - 0)];
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, face: Math.atan2(bx[1] - ax[1], bx[0] - ax[0]) * 180 / Math.PI };
}

// ---- state ----
export function fresh(order = "list", n = 0) { return { order, n, s: 0, plan: null, w: null }; }
export function setPlan(st, m = M) {
  st.plan = plan(ORDERS[st.order].seq, st.n, m);
  st.w = walk(st.plan, m);
  st.s = 0;
  return st;
}
export const aspectAt = (st, i) => ASPECTS[ORDERS[st.order].seq[i]];
export function summary(st) {
  const w = st.w;
  return { n: st.n, length: Math.round(w.length), exposed: Math.round(w.exposed), down: w.down, halted: w.halted, why: w.haltWhy };
}
// the finished picture for each order (the same five aspects applied): used by the tests and the page text
export function finalFor(order, m = M) { const st = fresh(order, 5); return setPlan(st, m); }

// ---- what each overlay marks, as runs of grid cells: { cls, runs: [[i0, i1, j], ...] } ----
const cellRuns = (pred) => {
  const out = [];
  for (let j = 0; j < NY; j++) {
    let i0 = -1;
    for (let i = 0; i <= NX; i++) {
      const on = i < NX && pred(idx(i, j), i, j);
      if (on && i0 < 0) i0 = i;
      if (!on && i0 >= 0) { out.push([i0, i - 1, j]); i0 = -1; }
    }
  }
  return out;
};
export function aspectTiles(key, m = M, g = GRID) {
  const [ex, ey] = [m.hills[0].cx, m.hills[0].cy];
  if (key === "o") return [{ cls: "dead", runs: cellRuns((k, i, j) => Math.hypot(cx(i) - ex, cy(j) - ey) <= m.Re && !g.visible[k]) }];
  if (key === "a") { const mk = corridorMask(AVENUES()); return [{ cls: "aa", runs: cellRuns((k, i, j) => mk[k] && Math.hypot(cx(i) - m.hills[1].cx, cy(j) - m.hills[1].cy) > m.hills[1].r) }]; }
  if (key === "k") { const [kx, ky] = keyTop(m); return [{ cls: "key", runs: cellRuns((k, i, j) => Math.hypot(cx(i) - kx, cy(j) - ky) <= 9) }]; }
  if (key === "b") return [{ cls: "nogo", runs: cellRuns((k) => g.nogo[k]) }, { cls: "slow", runs: cellRuns((k) => g.wood[k]) }];
  if (key === "c") return [{ cls: "cover", runs: cellRuns((k) => g.cover[k] && !g.wood[k]) }, { cls: "conceal", runs: cellRuns((k) => g.wood[k]) }];
  return [];
}
