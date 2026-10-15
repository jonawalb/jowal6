// The Battlefield view of Clearing a Trench or Building: one squad (squad leader and two fire teams)
// clears four points of a trench line or of a building, with a support element outside and a platoon
// medic. Drawn with the terrain kit (../../kit/terrain.mjs). The same run state as the machine drives
// it (model.mjs stateAt): S.p how far along the points the lead team is, S.set which are set, S.cfg
// the three options, S.downFT/S.downET when each man went down. Everything is a pure function of S.
// World: x across the picture, y toward the viewer. Both layouts are in the same page; the page shows
// one by data-mode on the field SVG ("trench" or "building").
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdSpline, fdOffset } from "../../kit/field.mjs";
import { stateAt, MODEL, POINTS, clamp, ease } from "./model.mjs";
import { lerp } from "./scene.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trWall, trChalk, trMuzzle, trAimPoint, trRoute } from "../../kit/terrain.mjs";

const SP = 4.2; // soldier interval in a file
export const FG = {
  world: { x: -260, y: -200, w: 520, d: 400 },
  // trench: a zigzag line; the squad clears four points in order, entering at the left
  trench: {
    E: [-64, 10],
    route: [[-104, 10], [-32, 10], [-32, -8], [0, -8], [0, 10], [32, 10], [32, -8], [100, -8]],
    pins: [
      { via: [[-32, 10], [-32, -8]], exit: [], dest: [-24, -8] },
      { via: [[0, -8], [0, 10]], exit: [], dest: [8, 10] },
      { via: [[32, 10], [32, -8]], exit: [], dest: [40, -8] },
      { via: [], exit: [], dest: [62, -8] },
    ],
    enemy: [[-17, -8], [14, 10], [46, -8], [68, -8]],
    extra: [3, 10],
    support: [[-54, -34, "mg", "prone"], [-48, -35, "ag", "kneel"], [-40, -32, "mg", "prone"], [-34, -34, "r", "kneel"]],
    box: [[-62, -42], [-26, -42], [-26, -26], [-62, -26]],
    face: [-17, -8],
    medic: [-74, 14],
    marks: [[-32, 0], [0, 1], [32, 0], [-24, -12]],
  },
  // building: a hall with two rooms off each side; entry is the west door
  building: {
    E: [-62, 0],
    pins: [
      { via: [[-18, 0]], exit: [[-18, -3]], dest: [-18, -14] },
      { via: [[-18, 0]], exit: [[-18, 3]], dest: [-18, 14] },
      { via: [[18, 0]], exit: [[18, -3]], dest: [18, -14] },
      { via: [[18, 0]], exit: [], dest: [18, 14] },
    ],
    enemy: [[-30, -19], [-30, 19], [30, -19], [30, 19]],
    extra: [-8, 17],
    support: [[-28, 42, "mg", "prone"], [-22, 44, "ag", "kneel"], [-6, 42, "mg", "prone"], [0, 44, "r", "kneel"]],
    box: [[-36, 34], [6, 34], [6, 52], [-36, 52]],
    face: [-6, 20],
    medic: [-56, 16],
    marks: [[-18, -3], [-18, 3], [18, -3], [18, 3]],
  },
};
FG.TERRAIN = {
  rises: [
    { cx: -44, cy: -34, r: 22, steps: 2, h: 1.2, top: 0.6, seed: 91, wobble: 0.1 },
    { cx: -14, cy: 48, r: 24, steps: 2, h: 1.2, top: 0.6, seed: 93, wobble: 0.1 },
  ],
};
// one rise per layout, so each layout draws only its own support position's ground
// Vertical placement: the trench line sits lower and the building higher so that each layout
// fills the picture with its support element (applied once, to every point of the layout).
const TRENCH_DY = 18, BUILD_DY = -10;
const shiftPts = (pts, dy) => pts.map((p) => (p.length > 2 ? [p[0], p[1] + dy, p[2], p[3]] : [p[0], p[1] + dy]));
for (const [mode, dy] of [["trench", TRENCH_DY], ["building", BUILD_DY]]) {
  const C = FG[mode];
  C.E = shiftPts([C.E], dy)[0];
  if (C.route) C.route = shiftPts(C.route, dy);
  C.pins = C.pins.map((p) => ({ via: shiftPts(p.via, dy), exit: shiftPts(p.exit, dy), dest: shiftPts([p.dest], dy)[0] }));
  C.enemy = shiftPts(C.enemy, dy); C.extra = shiftPts([C.extra], dy)[0];
  C.support = shiftPts(C.support, dy); C.box = shiftPts(C.box, dy); C.face = shiftPts([C.face], dy)[0];
  C.medic = shiftPts([C.medic], dy)[0]; C.marks = shiftPts(C.marks, dy);
}
FG.TERRAIN.rises[0].cy += TRENCH_DY; FG.TERRAIN.rises[1].cy += BUILD_DY;
export const fieldTerrain = (mode = "trench") => trTerrain({ rises: [FG.TERRAIN.rises[mode === "building" ? 1 : 0]] });

const RAD = Math.PI / 180;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const faceTo = (a, b) => ((Math.atan2(b[1] - a[1], b[0] - a[0]) / RAD) % 360 + 360) % 360;
const wrapM = (mode, svg) => `<g class="cl-m cl-m-${mode}">${svg}</g>`;

export function fieldStatic(K, P, T0) {
  const G = FG;
  const T = { height: (x, y) => Math.max(fieldTerrain("trench").height(x, y), fieldTerrain("building").height(x, y)), rises: [] };
  const TM = { trench: fieldTerrain("trench"), building: fieldTerrain("building") };
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[-70, 80, 80, 3, 0.55], [90, 70, 70, 4, 0.5], [0, -110, 90, 5, 0.5], [-200, -20, 40, 6, 0.8], [210, -10, 40, 9, 0.8]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.1, 40, sq)));
  const fields = [
    [[[-250, 40], [-170, 36], [-166, 100], [-246, 104]], 8, "a"],
    [[[170, 30], [248, 26], [250, 90], [172, 94]], 8, "b"],
    [[[-250, -150], [-190, -154], [-186, -214], [-248, -218]], 7, "b"],
    [[[190, -150], [248, -146], [250, -210], [192, -214]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  g(trRoad(K, P, [[-300, 62], [-150, 66], [0, 70], [150, 66], [300, 62]], 3));
  const woods = [
    [fdBlob(-150, -86, 28, 61, 0.14, 40, 0.8), 14, 62],
    [fdBlob(150, -88, 28, 63, 0.14, 40, 0.8), 14, 64],
    [fdBlob(-140, 40, 14, 65, 0.12, 40, 1), 5, 66],
    [fdBlob(130, 36, 14, 67, 0.12, 40, 1), 5, 68],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-250, 40], [-170, 36]], 71], [[[170, 30], [248, 26]], 72]]) items.push(...trHedge(K, P, pts, { seed }));
  for (const mode of ["trench", "building"]) g(wrapM(mode, trRelief(K, P, TM[mode])));

  // ---- the trench: a dark cut with a low parapet on both sides ----
  {
    const R = G.trench.route;
    const line = fdSpline(R, 3);
    const ring = [...fdOffset(line, 3.3), ...fdOffset(line, -3.3).reverse()];
    g(wrapM("trench", `<path class="tr-pit" d="${K.onTop(ring, 0.05, P, true)}"/>`));
    for (const d of [4.1, -4.1]) {
      const pts = fdOffset(line, d);
      items.push(...trWall(K, P, pts, { h: 1.7, w: 0.75 }).map((i) => ({ key: i.key, svg: wrapM("trench", i.svg) })));
    }
    const box = trChalk(K, P, TM.trench, G.trench.box, { closed: true, pegs: true });
    g(wrapM("trench", box.ground));
    items.push(...box.items.map((i) => ({ key: i.key, svg: wrapM("trench", i.svg) })));
  }
  // ---- the building: roofless so the rooms show, four rooms off a hall, the west door the entry ----
  {
    const W = { h: 4.2, w: 0.7 };
    const wall = (pts) => trWall(K, P, pts, W).map((i) => ({ key: i.key, svg: wrapM("building", i.svg) }));
    const floor = shiftPts([[-38, -24], [38, -24], [38, 24], [-38, 24]], BUILD_DY);
    g(wrapM("building", `<path class="tr-road" style="fill:var(--tr-stone);stroke:none" d="${K.onTop(floor, 0.06, P, true)}"/>`));
    const seg = (x0, y0, x1, y1) => { y0 += BUILD_DY; y1 += BUILD_DY; const pts = []; const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6)); for (let i = 0; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]); return pts; };
    const lines = [
      seg(-38, -24, 38, -24), seg(38, -24, 38, 24), seg(38, 24, -38, 24),     // north, east, south
      seg(-38, -24, -38, -3.5), seg(-38, 3.5, -38, 24),                       // west, with the entry door
      seg(-38, -3.5, -22, -3.5), seg(-14, -3.5, 14, -3.5), seg(22, -3.5, 38, -3.5),
      seg(-38, 3.5, -22, 3.5), seg(-14, 3.5, 14, 3.5), seg(22, 3.5, 38, 3.5),
      seg(0, -24, 0, -3.5), seg(0, 3.5, 0, 24),
    ];
    for (const pts of lines) items.push(...wall(pts));
    const box = trChalk(K, P, TM.building, G.building.box, { closed: true, pegs: true });
    g(wrapM("building", box.ground));
    items.push(...box.items.map((i) => ({ key: i.key, svg: wrapM("building", i.svg) })));
  }
  // ---- markers a team leaves on points it has secured and marked (shown by the page) ----
  for (const mode of ["trench", "building"]) {
    G[mode].marks.forEach(([x, y], i) => {
      const z = 0;
      items.push({ key: K.depthOf([x, y, 0], P), svg: wrapM(mode, `<g class="cl-mk cl-mk-${i}">` + K.solidSvg(K.cylinder(x, y, 0.5, z, 5.4, P, 8), { tone: "hi", crease: "none" }) + K.dotsSvg([K.iso([x, y, z + 5.4], P)], { size: 0.42 }) + "</g>") });
    });
  }
  return { ground: ground.join(""), items };
}

// ---- movement: each team walks one continuous polyline (a tail behind the entry, the entry, then the
// points it leads), so a file never jumps; the team that is not leading stands still ----
const pathCache = new Map();
function teamPaths(mode, alt) {
  const key = mode + alt;
  if (pathCache.has(key)) return pathCache.get(key);
  const C = FG[mode];
  const first = C.pins[0].via[0] || C.pins[0].dest;
  const dx = first[0] - C.E[0], dy = first[1] - C.E[1], dl = Math.hypot(dx, dy) || 1;
  const TAIL = 60;
  const start = [C.E[0] - (dx / dl) * TAIL, C.E[1] - (dy / dl) * TAIL];
  // points from pin o (-1 = entry) to pin k
  const seq = (o, k) => {
    const pts = [];
    if (o >= 0) pts.push(...C.pins[o].exit);
    for (let m = o + 1; m <= k; m++) { pts.push(...C.pins[m].via); if (m === k) pts.push(C.pins[m].dest); }
    return pts;
  };
  const build = (leads) => {
    const pts = [start, C.E];
    const marks = {};
    let o = -1;
    for (const k of leads) { pts.push(...seq(o, k)); marks[k] = pts.length - 1; o = k; }
    const route = trRoute(pts, 0);
    // arc length at each mark: sum of segments up to that vertex
    const at = [0];
    for (let i = 1; i < pts.length; i++) at.push(at[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const m = {};
    for (const k of leads) m[k] = at[marks[k]];
    return { route, marks: m, u0: TAIL, leads };
  };
  const out = alt ? [build([0, 2]), build([1, 3])] : [build([0, 1, 2, 3]), null];
  pathCache.set(key, out);
  return out;
}

// where the 9 soldiers are for state S (only S.cfg and S.p matter): ids sl, a0..a3, b0..b3
function squadAt(S, mode) {
  const alt = S.cfg[1] && S.cfg[2], secure = S.cfg[2];
  const [PA, PB] = teamPaths(mode, alt);
  const j = Math.min(POINTS - 1, Math.floor(S.p + 1e-9));
  const f = S.p >= POINTS ? 1 : S.p - j;
  const out = {};
  const headOf = (path, leadsHere, base) => {
    if (!path) return base;
    const done = path.leads.filter((k) => k < j);
    const b = done.length ? path.marks[done[done.length - 1]] : base;
    return path.leads.includes(j) ? lerp(b, path.marks[j], f) : b;
  };
  const uA = headOf(PA, null, PA.u0);
  let uB, pathB = PA;
  if (alt) { uB = headOf(PB, null, PB.u0 - 17); pathB = PB; }
  else if (secure) {
    const mk = (k) => (k < 0 ? PA.u0 - 17 : PA.marks[k]);
    uB = lerp(mk(j - 2), mk(j - 1), clamp(f * 2));
    if (j === 0) uB = PA.u0 - 17;
  } else uB = Math.max(PA.u0 - 17, uA - 17);
  const place = (route, u, k) => route.at(Math.max(0, u - k * SP));
  const roles = ["r", "gr", "ar", "tl"];
  roles.forEach((role, k) => {
    out["a" + k] = { ...place(PA.route, uA, k), role, team: "a", moving: false, u: uA - k * SP };
    out["b" + k] = { ...place(pathB.route, uB, k), role, team: "b", moving: false, u: uB - k * SP };
  });
  const uSL = Math.max(PA.u0 - 33, uA - 24);
  out.sl = { ...PA.route.at(uSL), role: "sl", team: "hq", moving: false, u: uSL };
  return out;
}

// Where every figure stands and who fires at whom for state S (stateAt) at its time S.t.
export function fieldPose(S, T, mode = "trench") {
  const C = FG[mode];
  const men = [];
  const add = (p) => { p.z = T.height(p.x, p.y); men.push(p); return p; };
  const cfg = S.cfg;
  const here = squadAt(S, mode);
  // moving: compare with a short moment earlier (a pure function of state)
  const prev = squadAt(stateAt(cfg, Math.max(0, S.t - 0.12), S.released), mode);
  const down = new Map();
  const order = [];
  // casualties: the k-th friendly down is the front man of the team that was leading at that moment
  const taken = new Set();
  S.downFT.forEach((tf) => {
    const s2 = stateAt(cfg, tf, true);
    const j = Math.min(POINTS - 1, s2.nSet);
    const leadTeam = cfg[1] && cfg[2] ? (j % 2 ? "b" : "a") : "a";
    const pick = ["r", "gr", "ar", "tl"].map((r, k) => leadTeam + k).find((id) => !taken.has(id)) || ["a0", "a1", "a2", "a3", "b0", "b1", "b2", "b3"].find((id) => !taken.has(id));
    taken.add(pick);
    down.set(pick, tf);
    order.push({ id: pick, tf });
  });
  const alive = [];
  const ids = ["sl", "a0", "a1", "a2", "a3", "b0", "b1", "b2", "b3"];
  for (const id of ids) {
    const tf = down.get(id);
    if (tf !== undefined) {
      const q = squadAt(stateAt(cfg, tf, true), mode)[id];
      add({ id, side: "fc", role: "r", pose: "prone", face: q.face + ((id.charCodeAt(1) * 13) % 5 - 2) * 12, stride: 0, x: q.x, y: q.y });
      continue;
    }
    const q = here[id], q0 = prev[id];
    const mv = Math.hypot(q.x - q0.x, q.y - q0.y) > 0.012 && S.released;
    const p = add({ id, side: "f", role: q.role, pose: mv ? "stand" : "kneel", face: q.face, stride: mv ? strideAt(S.t * 14 + id.charCodeAt(0) * 3 + (id.charCodeAt(1) || 0)) : 0, x: q.x, y: q.y, team: q.team });
    alive.push(p);
  }
  // the support element, outside: fires only when support fires are applied
  const sface = faceTo([C.support[0][0], C.support[0][1]], C.face);
  const supp = [];
  C.support.forEach(([x, y, role, pose], i) => {
    supp.push(add({ id: "s" + i, side: "f", role, pose, face: sface, stride: 0, x, y, group: "s" }));
  });
  // the platoon medic goes to the latest man down, once he is hit
  {
    let x = C.medic[0], y = C.medic[1], face = 0, pose = "kneel", stride = 0;
    if (order.length) {
      const l = order[order.length - 1];
      const tp = squadAt(stateAt(cfg, l.tf, true), mode)[l.id];
      const u = clamp((S.t - l.tf - 0.8) / 4);
      x = lerp(C.medic[0], tp.x - 3, u); y = lerp(C.medic[1], tp.y + 3, u);
      face = faceTo(C.medic, [tp.x, tp.y]);
      if (u > 0.02 && u < 0.98) { pose = "stand"; stride = strideAt(u * 60); }
    }
    add({ id: "med", side: "f", role: "r", pose, face, stride, x, y });
  }
  // the enemy: one at each point, down when that point is set; one more if a cleared point is not held
  const eAlive = [];
  C.enemy.forEach(([x, y], i) => {
    const dead = S.released && S.t >= S.T[i] - 0.7;
    if (dead) { add({ id: "e" + i, side: "hc", role: "r", pose: "prone", face: 180 + (i % 2 ? 25 : -25), stride: 0, x: x - 1.5, y: y + 2 }); return; }
    const toward = faceTo([x, y], C.E);
    eAlive.push(add({ id: "e" + i, side: "h", role: "r", pose: "kneel", face: toward, stride: 0, x, y, idx: i }));
  });
  if (S.extra) {
    const kill = S.T[1] + MODEL.back + MODEL.reclear;
    const [x, y] = C.extra;
    if (S.t >= kill) add({ id: "ex", side: "hc", role: "r", pose: "prone", face: 200, stride: 0, x: x - 1.5, y: y + 2 });
    else eAlive.push(add({ id: "ex", side: "h", role: "r", pose: "kneel", face: faceTo([x, y], C.E), stride: 0, x, y, idx: -1 }));
  }
  // ---- fire ----
  const streams = [];
  const aim = (p) => trAimPoint(p, p.x, p.y, p.z);
  const mz = (p) => trMuzzle(p, p.x, p.y, p.z);
  const eT = eAlive.map(aim);
  if (cfg[0] && S.released && eT.length) {
    supp.forEach((p, i) => {
      streams.push({ id: p.id, side: "f", heavy: p.role === "mg", from: mz(p), to: eT, period: 1.5 + i * 0.2, burst: p.role === "mg" ? 3 : 1, gap: 0.1, flight: 0.7, phase: i * 0.37, on: 0.9, scatter: 2.4 });
    });
  }
  if (S.released) {
    const tg = alive.filter((p) => p.team).map(aim);
    const j = Math.min(POINTS - 1, S.nSet);
    eAlive.forEach((p, i) => {
      if (!tg.length) return;
      const engaged = p.idx === j || p.idx === -1 || (p.idx === 0 && !cfg[0] && S.t < S.t0 + 1);
      if (!engaged) return;
      const on = (cfg[0] ? 0.42 : 0.9) * clamp((S.t - 0.8) / 1.5);
      streams.push({ id: p.id, side: "h", heavy: false, from: mz(p), to: tg, period: 1.6 + i * 0.27, burst: 1, gap: 0.12, flight: 0.6, phase: 0.4 + i * 0.31, on, scatter: 3.2 });
    });
    // the lead team answers the enemy at the point it is working
    const wk = eAlive.find((p) => p.idx === j) || eAlive[0];
    if (wk && S.t >= S.t0 - 0.5) {
      alive.filter((p) => p.team && p.team !== "hq").slice(0, 8).forEach((p, i) => {
        const near = Math.hypot(p.x - wk.x, p.y - wk.y) < 38;
        if (!near) return;
        streams.push({ id: "f" + p.id, side: "f", heavy: p.role === "ar", from: mz(p), to: [aim(wk)], period: 1.8 + (i % 4) * 0.25, burst: 1, gap: 0.1, flight: 0.5, phase: 0.2 + i * 0.21, on: 0.8, scatter: 1.8 });
      });
    }
  }
  return { men, streams, marks: S.cfg[2] ? S.set.map((v, i) => v && !(i === 1 && S.reopen)) : [false, false, false, false] };
}
