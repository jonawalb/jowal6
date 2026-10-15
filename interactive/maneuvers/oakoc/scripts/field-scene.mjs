// The Battlefield view of Terrain Analysis (OAKOC), at platoon scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same state st (model.mjs) as the machine drives it:
//   st.order, st.n   the order the five aspects are taken in and how many are applied
//   st.plan, st.w    the route the planner picks with those applied and its walk (length, exposure)
//   st.s             how far the platoon has walked along it
// One distance unit is about a metre of ground (notional). The hills are the model's terraces, so line of
// sight in the model is line of sight on the ground. fieldStatic() builds the ground (build only);
// fieldPose() places every soldier and fire stream; fieldMarks() draws the overlays for the applied aspects.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdPolar, fdSweep, fdBlob, fdSpline, fdRibbon, fdFrame } from "../../kit/field.mjs";
import { MODEL, ORDERS, GRID, aspectTiles, keyTop, posAt, downAt, cx, cy, AVENUES, smooth, streamY } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trNest, trWire, trObjective, trPlatoon, trPlace, trMorph, trMuzzle, trAimPoint, trDrape } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -150, y: -112, w: 300, d: 224 },
  TEAM_ROLES: [["tl", "ar"], ["gr", "r"]],
  KILL: [21, 7, 14, 2, 25, 11, 18, 5, 28, 9, 16, 23, 1, 12, 27, 6, 19, 3, 24, 10],
};
FG.TERRAIN = { rises: MODEL.hills.map((h, i) => ({ cx: h.cx, cy: h.cy, r: h.r, steps: h.steps, h: h.h, top: h.top, seed: 5 + i, wobble: 0.0, lean: [0, 0] })) };

const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const nearFeature = (x, y) => MODEL.village.some(([a, b]) => Math.hypot(x - a, y - b) < 16);
  g(trGroundPlane(K, P, FG.world));
  for (const [cx0, cy0, r, seed, sq] of [[-30, -70, 36, 3, 0.6], [100, -60, 34, 5, 0.8], [-120, 50, 30, 7, 0.5], [30, 80, 34, 9, 0.6]]) g(trPatch(K, P, fdBlob(cx0, cy0, r, seed, 0.15, 40, sq)));
  for (const [ring, n, tint] of [
    [[[-140, -80], [-112, -78], [-114, -50], [-142, -52]], 7, "a"],
    [[[118, -84], [146, -82], [144, -52], [116, -54]], 8, "b"],
    [[[-146, 70], [-120, 72], [-122, 98], [-148, 96]], 6, "a"],
  ]) g(trField(K, P, ring, { furrows: n, tint }));
  // the stream and the two ways across it: a bridge on the road and a ford
  const sp = [-160, ...MODEL.stream.map((p) => p[0]), 160].length;
  g(trStream(K, P, [[-170, 0], ...MODEL.stream, [170, 8]], 4.4, 5));
  g(trRoad(K, P, [[40, -112], [48, -60], [54, -24], [58, 0], [62, 24], [80, 50], [110, 64], [150, 70]], 3.4));
  g(trRoad(K, P, [[-40, -20], [-40, 0], [-40, 18]], 2.4, { ruts: false, smooth: 0 }));
  // woods
  const woods = [
    [fdBlob(MODEL.woods[0].cx, MODEL.woods[0].cy, MODEL.woods[0].r, 31, 0.12, 40, 0.9), 18, 21],
    [fdBlob(MODEL.woods[1].cx, MODEL.woods[1].cy, MODEL.woods[1].r, 34, 0.12, 40, 1), 12, 24],
    [fdBlob(-118, -70, 18, 36, 0.12, 40, 0.8), 8, 26],
    [fdBlob(120, 20, 16, 38, 0.12, 40, 0.8), 7, 28],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor); items.push(...w.items);
  }
  // the village, the wall and a hedge
  [[0, 0, 90, 12, 8], [6, 6, 0, 10, 7.5], [-6, -4, 20, 11, 7.5], [12, -2, 70, 9, 7]].forEach(([dx, dy, a, l, w], i) => { const [hx, hy] = MODEL.village[i]; items.push(trHouse(K, P, hx, hy, a, l, w)); });
  items.push(...trWall(K, P, MODEL.wall));
  items.push(...trHedge(K, P, [[-90, -36], [-70, -30], [-52, -34]], { seed: 51 }));
  g(trRelief(K, P, T));
  // wire north of the ford, and the enemy's MG covering the ford
  items.push(...trWire(K, P, T, MODEL.wire));
  items.push(...trNest(K, P, -36, 22, 0, 270));
  return { ground: ground.join(""), items };
}

const hash = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
const KILL = Array.from({ length: 30 }, (_, i) => i).sort((a, b) => hash(a, 77) - hash(b, 77));
const S2 = 30;

// Where every soldier stands and who fires at whom.
export function fieldPose(st, T) {
  const men = [], add = (m) => { m.z = T.height(m.x, m.y) + (m.dz || 0); men.push(m); return m; };
  const w = st.w;
  const here = posAt(w, st.s);
  const arrived = st.s >= w.length - 0.01 && !w.halted;
  const halted = st.s >= w.length - 0.01 && w.halted;
  const down = Math.min(MODEL.P0, downAt(w, st.s));
  const goneSet = new Set(KILL.slice(0, down));
  const col = trPlatoon("column", "column", "wedge", 3.2), line = trPlatoon("line", "column", "wedge", 3.2);
  const members = arrived ? trMorph(col, line, 1) : col;
  const placed = trPlace(members, { x: here.x, y: here.y, face: here.face });
  const walking = !arrived && !halted && st.s > 0.01 && st.s < w.length - 0.01;
  placed.forEach((m, i) => {
    if (goneSet.has(i)) return;
    add({ id: `p${i}`, side: "f", role: m.role, pose: arrived ? "kneel" : "stand", stride: walking ? strideAt(st.s + i * 1.3) : 0, face: arrived ? here.face : m.face, x: m.x, y: m.y, lit: i === 0 });
  });
  // men down: prone and greyed where they fell, with a medic at the nearest
  KILL.slice(0, down).forEach((idx, n) => {
    const at = (() => { const target = (n + 1) / MODEL.rate; let q = 0; while (q < w.exp.length - 1 && w.exp[q] < target - 1e-6) q++; return posAt(w, w.s[q]); })();
    const jitter = (hash(n, 5) - 0.5) * 6;
    add({ id: `d${n}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 40 + 30 * ((n * 7) % 3 - 1), x: at.x - Math.sin(at.face * Math.PI / 180) * jitter, y: at.y + Math.cos(at.face * Math.PI / 180) * jitter });
  });
  if (down > 0) { const n = down - 1; const at = (() => { const target = (down) / MODEL.rate; let q = 0; while (q < w.exp.length - 1 && w.exp[q] < target - 1e-6) q++; return posAt(w, w.s[q]); })(); add({ id: "med", side: "f", role: "r", pose: "kneel", stride: 0, face: at.face + 180, x: at.x + 3.2, y: at.y + 2.4 }); }
  // the enemy: an observation post on the first hill, and a machine gun covering the ford
  const h = MODEL.hills[0];
  add({ id: "op0", side: "h", role: "rto", pose: "kneel", face: 235, x: h.cx - 2, y: h.cy - 2 });
  add({ id: "op1", side: "h", role: "r", pose: "prone", face: 235, x: h.cx + 2, y: h.cy - 3 });
  add({ id: "mg0", side: "h", role: "mg", pose: "hole", face: 270, x: -36, y: 22 });
  add({ id: "mg1", side: "h", role: "r", pose: "hole", face: 270, x: -33, y: 24.5 });

  // fire: the machine gun on the ford while the platoon is within its reach and in the open; indirect fire
  // on a platoon in the observer's view and in the open
  const byId = Object.fromEntries(men.map((m) => [m.id, m]));
  const streams = [];
  const k = (() => { const i = Math.floor((here.x - MODEL.world.x0) / MODEL.cell), j = Math.floor((here.y - MODEL.world.y0) / MODEL.cell); return i < 0 || j < 0 || i >= 60 || j >= 45 ? -1 : j * 60 + i; })();
  const exposed = k >= 0 && GRID.exposed[k] && st.s > 0.01 && !arrived;
  const lead = men.find((m) => m.id.startsWith("p")) || null;
  if (exposed && lead) {
    const tg = men.filter((m) => m.id.startsWith("p")).slice(0, 12).map((m) => trAimPoint(m, m.x, m.y, m.z));
    const mg = byId.mg0;
    if (Math.hypot(here.x - mg.x, here.y - mg.y) <= 70) streams.push({ id: "mg", side: "h", heavy: true, from: trMuzzle(mg, mg.x, mg.y, mg.z), to: tg, period: 1.6, burst: 3, gap: 0.08, flight: 0.4, phase: 0.1, on: 1, scatter: 5 });
    streams.push({ id: "ind", side: "h", heavy: true, smoke: true, from: [tg[0][0], tg[0][1], 40], to: tg, period: 2.4, burst: 2, gap: 0.5, flight: 0.7, phase: 0.2, on: 0.8, scatter: 12 });
  }
  return { men, streams, down, halted, arrived };
}

// ---- overlay marks, drawn on the ground as filled shapes (not lines) ----
const cellQuads = (K, P, T, runs, z0 = 0.18) => {
  const C = MODEL.cell, W = MODEL.world;
  let d = "";
  for (const [i0, i1, j] of runs) {
    // split a run where the ground height changes so the strip stays on one terrace
    let a = i0;
    for (let i = i0; i <= i1; i++) {
      const hz = T.height(cx(i), cy(j)), hn = i < i1 ? T.height(cx(i + 1), cy(j)) : null;
      if (i === i1 || hn !== hz) {
        const xa = W.x0 + a * C + 0.25, xb = W.x0 + (i + 1) * C - 0.25, ya = W.y0 + j * C + 0.25, yb = W.y0 + (j + 1) * C - 0.25;
        d += K.pathOf([[xa, ya], [xb, ya], [xb, yb], [xa, yb]].map(([x, y]) => K.iso([x, y, hz + z0], P)), true);
        a = i + 1;
      }
    }
  }
  return d;
};
const ribbonPath = (K, P, T, pts, w, lift) => K.pathOf(fdRibbon(pts, w / 2).map(([x, y]) => K.iso([x, y, T.height(x, y) + lift], P)), true);
const ringPath = (K, P, T, cx0, cy0, r0, r1, lift) => {
  const outer = fdSweep(0, 360, 6).map((a) => fdPolar(cx0, cy0, r1, a)), inner = fdSweep(0, 360, 6).map((a) => fdPolar(cx0, cy0, r0, a)).reverse();
  const f = (pts) => K.pathOf(pts.map(([x, y]) => K.iso([x, y, T.height(x, y) + lift], P)), true);
  return f(outer) + f(inner);
};
const CLS = { dead: "oa-dead", aa: "oa-aa", key: "oa-key", nogo: "oa-nogo", slow: "oa-slow", cover: "oa-cover", conceal: "oa-conceal" };

// the marks for the applied aspects (st.order, st.n) and the planned route
export function fieldMarks(K, P, T, st) {
  const seq = ORDERS[st.order].seq;
  let out = "";
  for (let q = 0; q < st.n; q++) {
    const key = seq[q];
    out += `<g data-aspect="${key}">`;
    if (key === "o") {
      for (const t of aspectTiles("o")) out += `<path class="${CLS[t.cls]}" d="${cellQuads(K, P, T, t.runs)}"/>`;
      const h = MODEL.hills[0];
      out += `<path class="oa-range" d="${ringPath(K, P, T, h.cx, h.cy, MODEL.Re - 0.5, MODEL.Re + 0.5, 0.2)}"/>`;
    } else if (key === "a") {
      for (const t of aspectTiles("a")) out += `<path class="${CLS[t.cls]}" d="${cellQuads(K, P, T, t.runs, 0.12)}"/>`;
      const av = AVENUES();
      for (const pts of [av.ford, av.bridge]) {
        const sm = smooth(smooth(pts));
        out += `<path class="oa-axis" d="${ribbonPath(K, P, T, sm.filter((_, i) => i % 2 === 0 || i === sm.length - 1), 1.1, 0.3)}"/>`;
      }
    } else if (key === "k") {
      const [kx, ky] = keyTop();
      out += `<path class="oa-key" d="${ringPath(K, P, T, kx, ky, 0, 9.5, 0.25)}"/>`;
    } else if (key === "b") {
      for (const t of aspectTiles("b")) out += `<path class="${CLS[t.cls]}" d="${cellQuads(K, P, T, t.runs, 0.2)}"/>`;
    } else if (key === "c") {
      for (const t of aspectTiles("c")) out += `<path class="${CLS[t.cls]}" d="${cellQuads(K, P, T, t.runs, 0.22)}"/>`;
    }
    out += `</g>`;
  }
  // the planned route (the machine's pencilled route): always shown, as a thin ribbon
  const pts = st.w.pts;
  if (pts.length > 1) {
    const step = Math.max(1, Math.floor(pts.length / 70));
    const line = []; for (let q = 0; q < pts.length; q += step) line.push(pts[q]); line.push(pts[pts.length - 1]);
    out += `<path class="oa-route" d="${ribbonPath(K, P, T, line, 1.3, 0.4)}"/>`;
    if (st.w.halted) { const h = pts[pts.length - 1]; out += `<path class="oa-halt" d="${ringPath(K, P, T, h[0], h[1], 2.2, 4.2, 0.45)}"/>`; }
  }
  return out;
}
