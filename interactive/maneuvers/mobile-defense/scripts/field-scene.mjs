// The Battlefield view of the mobile defense, drawn with the terrain kit (../../kit/terrain.mjs).
// The bench's track becomes a valley road; the carriage, an enemy armored column of 14 vehicles; the guide
// walls, the fixing force dug in on the two shoulders of the gap where the road enters the valley (holes,
// machine guns, vehicles) with wire along both sides of the pocket; the sprung stop, a blocking position
// of fixing-force vehicles across the far end; the striking arm, a lit tank-heavy battalion hidden in a
// wood beside the pocket that, when launched, swings in astride the road behind the column and attacks
// its rear. One vehicle is drawn per 5 units of the model's combat power, so the slider moves vehicles
// between the striking force and the fixing positions.
// The same model state drives both views: runAt(t, s) gives the enemy's progress p, the stop's give and
// the striking arm's swing; lossesAt(t, s) gives which vehicles are knocked out. This file only places them.
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places every
// vehicle, soldier and fire stream for a state (build and page); fieldMarks() draws the fire sectors.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trHouse, trHole, trNest, trWire, trFan, trChalk, trPrism, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";
import { MODEL, LOSS, runAt, outcome, vehicles, lossFinal, lossWindows, lossesAt } from "./model.mjs";

export const FG = {
  world: { x: -470, y: -340, w: 940, d: 680 },
  ROAD: (x) => 4 * Math.sin(0.012 * x + 0.4),
  X0: -112,            // enemy lead at p = 0 (outside the gap)
  XS: 120,             // enemy lead at p = 1 (held short of the blocking position)
  XB: 134,             // the blocking position's line
  GAP: 12,             // column interval on the move; it closes up by CLOSE when the lead is held
  CLOSE: 2.4,
  FIRE_ORDER: [5, 4, 1, 7],                  // enemy vehicles knocked out on the way in, in order
  STRIKE_ORDER: [13, 12, 11, 10, 9, 8, 6, 3, 2], // enemy vehicles the counterattack knocks out: the rear first
  SHOULDER: { N: [[-64, -21], [-88, -22], [-52, -20], [-100, -21], [-76, -22], [-40, -19], [-112, -20]], S: [[-64, 21], [-88, 22], [-52, 20], [-100, 21], [-76, 22], [-40, 19], [-112, 20]] },
  HIDE: { at: [-6, -60] },                           // the striking force's hide in the wood (its front row's centre)
  STRIKE: { x: -24, dx: 10, dy: 8.6, rows: [6, 5, 5] }, // its formation, and its attack position astride the road behind the column
  AMB: { wait: [194, 30] },
};
FG.TERRAIN = {
  rises: [
    { cx: -78, cy: -50, r: 30, steps: 2, h: 2.0, top: 0.5, seed: 5, wobble: 0.1, squash: 0.62 },   // north shoulder
    { cx: -78, cy: 50, r: 30, steps: 2, h: 2.0, top: 0.5, seed: 9, wobble: 0.1, squash: 0.62 },    // south shoulder
    { cx: 120, cy: -150, r: 50, steps: 3, h: 1.8, top: 0.45, seed: 13, wobble: 0.1, squash: 0.55 },
    { cx: -220, cy: -150, r: 44, steps: 3, h: 1.8, top: 0.45, seed: 17, wobble: 0.1, squash: 0.55 },
    { cx: 80, cy: 150, r: 40, steps: 2, h: 1.6, top: 0.5, seed: 21, wobble: 0.12, squash: 0.6 },
  ],
};
// shoulder positions on the hilltops: two-man holes [x, y, face] and machine-gun positions
FG.HOLES = [[-85, -44, 75], [-71, -44, 105], [-85, 44, -75], [-71, 44, -105]];
FG.NESTS = [[-78, -52, 90], [-78, 52, -90]];
FG.BLOCK_HOLES = [[142, -40, 180], [142, 40, 180]];

const MD_RAD = Math.PI / 180;
const mdClamp01 = (x) => Math.min(1, Math.max(0, x));
const mdSmooth = (x) => { const t = mdClamp01(x); return t * t * (3 - 2 * t); };
const mdBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
const mdHeading = (x) => Math.atan2(FG.ROAD(x + 1) - FG.ROAD(x - 1), 2) / MD_RAD;

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// A wheeled ambulance at the origin facing `face` (cab, box body, chassis), drawn inside a <g class="tr-s" data-side="m">.
export function mdTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, mdBox(F, u0, u1, v0, v1), z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(mdBox(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

// The blocking position's vehicle slots for n vehicles: either side of the road, which stays open.
function mdBlockSlots(n) {
  const out = [];
  for (let j = 0; j < n; j++) {
    const side = j % 2 ? 1 : -1, row = Math.floor(j / 2);
    const y = FG.ROAD(FG.XB) + side * (6.5 + row * 9);
    out.push([FG.XB + (row % 2) * 2.5, y]);
  }
  return out;
}
// Every fixing-force vehicle for share s, in the order they are knocked out: the blocking position (the
// road side first), then the shoulders alternately.
function mdFixers(s) {
  const n = vehicles(s).fix, nb = Math.ceil(n / 2), rest = n - nb;
  const block = mdBlockSlots(nb).map(([x, y], j) => ({ id: `b${j}`, x, y, face: 180, at: "block" }))
    .sort((a, b) => Math.abs(a.y - FG.ROAD(FG.XB)) - Math.abs(b.y - FG.ROAD(FG.XB)));
  const sh = [];
  for (let j = 0; j < rest; j++) {
    const side = j % 2 ? "S" : "N", k = Math.floor(j / 2);
    const [x, y] = FG.SHOULDER[side][k];
    sh.push({ id: `s${side}${k}`, x, y: y + FG.ROAD(x), face: side === "N" ? 62 : -62, at: side });
  }
  return [...block, ...sh];
}
// The striking force moves as one formation: rows of 6, 5, 5 (front row first), offsets u forward and v to
// the left of an anchor at the front row's centre. The anchor runs a cubic from the hide (facing south,
// toward the pocket) to the attack position astride the road behind the column (facing east, onto its rear).
function mdStrikeSlot(j, n) {
  const S = FG.STRIKE, sizes = [];
  for (let left = n, r = 0; left > 0; r++) { const k = Math.min(S.rows[Math.min(r, S.rows.length - 1)], left); sizes.push(k); left -= k; }
  let r = 0, c = j;
  while (c >= sizes[r]) { c -= sizes[r]; r++; }
  const inRow = sizes[r];
  return { u: -r * S.dx + (c % 2) * 1.5, v: ((inRow - 1) / 2 - c) * S.dy, front: r === 0, c, inRow };
}
function mdAnchorAt(a) {
  const H = FG.HIDE.at, F = [FG.STRIKE.x, FG.ROAD(FG.STRIKE.x)];
  const C1 = [H[0], H[1] + 30], C2 = [F[0] - 30, F[1]];
  const b = 1 - a, w = [b * b * b, 3 * b * b * a, 3 * b * a * a, a * a * a], d = [3 * b * b, 6 * b * a, 3 * a * a];
  const x = w[0] * H[0] + w[1] * C1[0] + w[2] * C2[0] + w[3] * F[0], y = w[0] * H[1] + w[1] * C1[1] + w[2] * C2[1] + w[3] * F[1];
  const dx = d[0] * (C1[0] - H[0]) + d[1] * (C2[0] - C1[0]) + d[2] * (F[0] - C2[0]);
  const dy = d[0] * (C1[1] - H[1]) + d[1] * (C2[1] - C1[1]) + d[2] * (F[1] - C2[1]);
  return { x, y, face: Math.atan2(dy, dx) / MD_RAD };
}
function mdStrikeAt(slot, a) {
  const A = mdAnchorAt(a), [x, y] = fdFrame(A.x, A.y, A.face)(slot.u, slot.v);
  return { x, y, face: A.face };
}

export function fieldStatic(K, P, T) {
  const G = FG, ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadow in the pocket, fields toward the edges
  for (const [cx, cy, r, seed, sq] of [[30, 0, 70, 3, 0.45], [-150, 0, 50, 5, 0.5], [190, -10, 50, 7, 0.55], [60, -70, 34, 11, 0.6], [-10, 70, 34, 13, 0.6]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-300, 40], [-236, 44], [-240, 92], [-306, 86]], 8, "a"],
    [[[-290, -100], [-230, -96], [-234, -56], [-294, -60]], 7, "b"],
    [[[236, 74], [300, 68], [304, 114], [240, 120]], 8, "b"],
    [[[230, -110], [296, -116], [300, -70], [234, -64]], 8, "a"],
    [[[120, 60], [170, 58], [168, 92], [118, 94]], 6, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // the valley road, run well past the visible ground, and a farm track
  const roadPts = [];
  for (let x = -520; x <= 520; x += 20) roadPts.push([x, G.ROAD(x)]);
  g(trRoad(K, P, roadPts, 3.6));
  g(trRoad(K, P, [[200, 140], [196, 70], [192, 36], [188, 6]], 2.2, { ruts: false }));

  // woods: the striking force's hide beside the pocket (north), and copses toward the edges, clear of the
  // road, the strike routes and the hide's vehicle slots
  const n = 16, slots = Array.from({ length: n }, (_, j) => mdStrikeSlot(j, n));
  const route = slots.flatMap((sl) => [0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1].map((a) => mdStrikeAt(sl, a)));
  const hides = slots.map((sl) => { const p = mdStrikeAt(sl, 0); return [p.x, p.y]; });
  const nearRoad = (x, y, d) => Math.abs(y - G.ROAD(x)) < d;
  const nearRoute = (x, y, d) => route.some((p) => Math.hypot(p.x - x, p.y - y) < d);
  const woods = [
    [fdBlob(-6, -84, 50, 21, 0.1, 44, 0.5), 26, 21, 0],
    [fdBlob(-180, -80, 40, 22, 0.12, 40, 0.55), 14, 22, 0],
    [fdBlob(60, -108, 36, 23, 0.12, 40, 0.5), 14, 23, 0],
    [fdBlob(30, 76, 34, 24, 0.12, 40, 0.5), 10, 24, 1],
    [fdBlob(-180, 80, 36, 25, 0.12, 40, 0.55), 12, 25, 1],
    [fdBlob(220, -50, 32, 26, 0.12, 40, 0.6), 10, 26, 0],
    [fdBlob(-300, -210, 50, 27, 0.12, 40, 0.6), 12, 27, 0],
  ];
  for (const [ring, k, seed, near] of woods) {
    const trees = trScatter(ring, k, { seed, gap: 6.2, r: near ? [2.4, 3.4] : [2.8, 4.4], h: near ? [6.5, 9] : [8, 12],
      avoid: (x, y) => nearRoad(x, y, 18) || nearRoute(x, y, 9) || hides.some(([hx, hy]) => Math.hypot(hx - x, hy - y) < 7.5) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-300, 40], [-236, 44], [-240, 92]], 51], [[[236, 74], [300, 68]], 53], [[[230, -110], [296, -116]], 54], [[[120, 60], [170, 58]], 55]]) items.push(...trHedge(K, P, pts, { seed }));
  for (const [x, y, a, l, w] of [[206, 52, 0, 11, 7], [220, 66, 90, 9, 6.5], [-250, 20, 10, 10, 7]]) items.push(trHouse(K, P, x, y, a, l, w));

  g(trRelief(K, P, T));

  // the fixing force's positions: holes and machine guns on both shoulders, two holes by the blocking position
  for (const [x, y, face] of [...G.HOLES, ...G.BLOCK_HOLES]) items.push(...trHole(K, P, x, y, T.height(x, y), face));
  for (const [x, y, face] of G.NESTS) items.push(...trNest(K, P, x, y, T.height(x, y), face));
  // obstacles: wire along both sides of the pocket (open on the north for the striking force's lane) and
  // either side of the road in front of the blocking position
  for (const run of [[[20, -35], [50, -36], [80, -33]], [[-40, 31], [-6, 34], [30, 35], [80, 33]], [[122, -42], [124, -12]], [[124, 12], [122, 42]]]) items.push(...trWire(K, P, T, run));

  // control measures: the striking force's line of departure, and the blocking position outlined
  const ld = trChalk(K, P, T, [[-40, -43], [-14, -46], [12, -44]]);
  g(ld.ground); items.push(...ld.items);
  const bp = trChalk(K, P, T, [[127, -34], [148, -34], [148, 34], [127, 34]], { closed: true });
  g(bp.ground); items.push(...bp.items);
  return { ground: ground.join(""), items };
}

// Where every vehicle and soldier stands and who fires at whom, for striking share s at time rt into the
// run (seconds). During the model's reset the field fades the end state out and the start state in,
// instead of driving the column backwards: pose.fade (0..1) applies to everything that changes in a run.
export function fieldPose(s, rt, T, M = {}) {
  const G = FG, MD = MODEL, TT = MD.T;
  const t1 = TT.advance, t2 = t1 + TT.settle, t4 = t2 + TT.strike + TT.hold;
  let time = rt, fade = 1;
  if (rt >= t4) {
    const u = (rt - t4) / TT.reset;
    if (u < 0.5) { time = t4 - 1e-4; fade = 1 - mdSmooth(u * 2); } else { time = 0; fade = mdSmooth(u * 2 - 1); }
  }
  const st = runAt(time, s), out = outcome(s), L = lossesAt(time, s), F = lossFinal(s), W = lossWindows(s);
  const units = [], men = [], wrecks = [];
  const put = (u) => { u.z = T.height(u.x, u.y); (u.kind ? units : men).push(u); if (u.wreck) wrecks.push([u.x, u.y, u.z + 3.2, u.wreck]); return u; };
  const XL = (p) => G.X0 + p * (G.XS - G.X0);
  const close = out === "overrun" ? 0 : mdSmooth((time - t1) / TT.settle);
  const gapNow = G.GAP - G.CLOSE * close;

  // --- the enemy column: 14 vehicles on the road; knocked-out ones pulled off it, greyed and smoking ---
  const nE = vehicles(s).enemy;
  const downAt = new Map();   // index -> [x, y, face]
  const off = (x, y, k, d) => [x, y + (k % 2 ? d : -d)];
  G.FIRE_ORDER.slice(0, L.fires).forEach((i, k) => {
    const pk = (k + 0.5) / ((MD.enemy * MD.fires) / LOSS.perVeh);
    const x = XL(pk) - i * G.GAP;
    downAt.set(i, [...off(x, G.ROAD(x), k, 8), mdHeading(x) + (k % 2 ? 24 : -24)]);
  });
  if (L.stop) {
    const x = XL(runAt(W.stop, s).p);
    downAt.set(0, [x, G.ROAD(x) - 7, mdHeading(x) - 28]);
  }
  G.STRIKE_ORDER.slice(0, L.strikeRed).forEach((i, k) => {
    const x = XL(1) - i * (G.GAP - G.CLOSE);
    downAt.set(i, [...off(x, G.ROAD(x), k, 3.5), (k % 2 ? 22 : -26)]);
  });
  const enemy = [];
  for (let i = 0; i < nE; i++) {
    const d = downAt.get(i);
    if (d) { put({ id: `e${i}`, kind: "v", side: "hc", x: d[0], y: d[1], face: d[2], wreck: 1 + i, fade: true }); continue; }
    const x = XL(st.p) - i * gapNow;
    enemy.push(put({ id: `e${i}`, kind: "v", side: "h", x, y: G.ROAD(x), face: mdHeading(x), i, fade: true }));
  }

  // --- the fixing force: vehicles at the blocking position and on the shoulders (knocked out in order) ---
  const fixers = mdFixers(s).map((f, k) => {
    const down = k < L.fix, hit = k < F.fix;
    return put({ id: f.id, kind: "v", side: down ? "fc" : "f", x: f.x, y: f.y, face: f.face + (down ? 18 : 0), at: f.at, wreck: down ? 40 + k : 0, fade: hit });
  });
  // the infantry in the shoulder and blocking holes
  const inf = [];
  [...G.HOLES, ...G.BLOCK_HOLES].forEach(([hx, hy, face], h) => {
    const Fr = fdFrame(hx, hy, face);
    [-1.1, 1.1].forEach((v, j) => { const [x, y] = Fr(0, v); inf.push(put({ id: `i${h}-${j}`, side: "f", role: j ? "ar" : "r", pose: "hole", face, x, y, stride: 0, at: h < 2 ? "N" : h < 4 ? "S" : "block" })); });
  });
  G.NESTS.forEach(([hx, hy, face], h) => {
    const Fr = fdFrame(hx, hy, face);
    const [x, y] = Fr(0, 0), [ax, ay] = Fr(-1.4, 1.5);
    inf.push(put({ id: `n${h}`, side: "f", role: "mg", pose: "hole", face, x, y, stride: 0, at: h ? "S" : "N" }));
    put({ id: `n${h}a`, side: "f", role: "ag", pose: "hole", face, x: ax, y: ay, stride: 0 });
  });

  // --- the striking force: the lit battalion in its hide, swinging in behind the column when launched ---
  const nS = vehicles(s).strike;
  const strikeHit = [];
  for (let j = 0; j < nS; j++) { const sl = mdStrikeSlot(j, nS); if (sl.front) strikeHit.push([Math.abs(sl.c - (sl.inRow - 1) / 2), j]); }
  strikeHit.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const hitOrder = strikeHit.map((h) => h[1]);
  const strikers = [];
  for (let j = 0; j < nS; j++) {
    const sl = mdStrikeSlot(j, nS), k = hitOrder.indexOf(j);
    const down = k >= 0 && k < L.strikeBlue;
    let a = st.arm;
    if (down) { const [w0, wd] = W.strike; a = runAt(w0 + wd * (k + 0.5) / F.strikeBlue, s).arm; }
    const p = mdStrikeAt(sl, a);
    const u = put({ id: `k${j}`, kind: "v", side: down ? "fc" : "f", lit: !down, x: p.x, y: p.y, face: p.face + (down ? 10 : 0), wreck: down ? 60 + j : 0, fade: true, front: sl.front });
    if (!down) strikers.push(u);
  }

  // --- casualty evacuation: an ambulance drives up behind the blocking position once a vehicle there is hit ---
  const firstDown = fixers.find((f) => f.side === "fc");
  const go = out !== "overrun" && firstDown ? mdSmooth((time - (W.fix[0] + 0.25)) / 1.1) : 0;
  const to = firstDown ? [firstDown.x + 16, firstDown.y + 6] : G.AMB.wait;
  const ax = G.AMB.wait[0] + (to[0] - G.AMB.wait[0]) * go, ay = G.AMB.wait[1] + (to[1] - G.AMB.wait[1]) * go;
  put({ id: "amb", kind: "t", side: "m", x: ax, y: ay, face: go > 0 && go < 1 ? Math.atan2(to[1] - G.AMB.wait[1], to[0] - G.AMB.wait[0]) / MD_RAD : 200, fade: true });
  if (go > 0.98) put({ id: "medic", side: "f", role: "r", pose: "kneel", face: 200, x: firstDown.x + 8.5, y: firstDown.y + 3, stride: 0, fade: true });

  // --- fire ---
  const streams = [];
  const firing = rt < t4 || fade > 0.5 ? 1 : 0;   // no fire while the reset fades
  const hull = (u) => [u.x, u.y, u.z + 1.8];
  const gunAt = (u) => { const Fr = fdFrame(u.x, u.y, u.face); return [...Fr(4.2, 0), u.z + 3.1]; };
  const inPocket = enemy.filter((e) => e.x > -130 && e.x < 150);
  const passed = out === "overrun" && st.p > 1.12;   // the column is through: the block ceases fire and stays
  // shoulders: infantry and vehicles fire into the column's flank
  inf.filter((m) => m.at !== "block" && (m.role !== "r" || Number(m.id.slice(1, 2)) % 2 === 0)).forEach((m, k) => {
    const tg = inPocket.filter((e) => e.x < 70).map(hull);
    streams.push({ id: `${m.id}f`, side: "f", heavy: m.role === "mg", from: trMuzzle(m, m.x, m.y, m.z), to: tg, period: m.role === "mg" ? 1.2 : 1.7, burst: m.role === "mg" ? 3 : m.role === "ar" ? 2 : 1, gap: 0.08, flight: 0.4, phase: k * 0.37, on: 0.7 * firing, scatter: 3 });
  });
  fixers.filter((f) => f.side === "f" && f.at !== "block").forEach((f, k) => {
    streams.push({ id: `${f.id}f`, side: "f", heavy: true, smoke: true, from: gunAt(f), to: inPocket.filter((e) => e.x < 90).map(hull), period: 1.9 + k * 0.31, burst: 1, gap: 0, flight: 0.4, phase: 0.2 + k * 0.53, on: 0.6 * firing, scatter: 3 });
  });
  // the blocking position engages the head of the column; once the column is through it stops firing and stays
  fixers.filter((f) => f.side === "f" && f.at === "block").forEach((f, k) => {
    const tg = inPocket.filter((e) => e.x > 30).sort((a, b) => b.x - a.x).slice(0, 4).map(hull);
    streams.push({ id: `${f.id}f`, side: "f", heavy: true, smoke: true, from: gunAt(f), to: tg, period: 1.5 + k * 0.29, burst: 1, gap: 0, flight: 0.35, phase: 0.1 + k * 0.47, on: passed ? 0 : 0.8 * firing, scatter: 3 });
  });
  inf.filter((m) => m.at === "block").forEach((m, k) => streams.push({ id: `${m.id}f`, side: "f", heavy: m.role === "ar", from: trMuzzle(m, m.x, m.y, m.z), to: inPocket.filter((e) => e.x > 50).map(hull), period: 1.6, burst: m.role === "ar" ? 2 : 1, gap: 0.08, flight: 0.4, phase: 0.3 + k * 0.41, on: passed ? 0 : 0.6 * firing, scatter: 3 }));
  // the column fires back: its head at the blocking position, a few others at the shoulders
  const blockLive = fixers.filter((f) => f.side === "f" && f.at === "block").map(hull);
  const shoulderTargets = inf.filter((m) => m.at !== "block").map((m) => trAimPoint(m, m.x, m.y, m.z));
  enemy.slice(0, 3).forEach((e, k) => streams.push({ id: `${e.id}f`, side: "h", heavy: true, smoke: true, from: gunAt(e), to: e.x > 10 && e.x < 150 ? blockLive : [], period: 1.7 + k * 0.33, burst: 1, gap: 0, flight: 0.35, phase: 0.5 + k * 0.6, on: 0.7 * firing, scatter: 3 }));
  enemy.slice(3).filter((e, k) => k % 3 === 0).forEach((e, k) => streams.push({ id: `${e.id}g`, side: "h", heavy: false, from: gunAt(e), to: e.x > -110 && e.x < 20 ? shoulderTargets : [], period: 1.4, burst: 3, gap: 0.09, flight: 0.4, phase: 0.7 + k * 0.45, on: 0.5 * firing, scatter: 3 }));
  // the striking force's front engages the column's rear; the rear fires back
  const rear = enemy.slice().sort((a, b) => a.x - b.x).slice(0, 4);
  if (st.arm > 0.5) {
    strikers.filter((u) => u.front).forEach((u, k) => streams.push({ id: `${u.id}f`, side: "f", heavy: true, smoke: true, from: gunAt(u), to: rear.map(hull), period: 1.3 + k * 0.23, burst: 1, gap: 0, flight: 0.3, phase: k * 0.41, on: 0.85 * firing, scatter: 3 }));
    rear.slice(0, 2).forEach((e, k) => streams.push({ id: `${e.id}r`, side: "h", heavy: true, smoke: true, from: [e.x - 3, e.y, e.z + 3.1], to: strikers.filter((u) => u.front).map(hull), period: 2.1 + k * 0.4, burst: 1, gap: 0, flight: 0.3, phase: 0.9 + k * 0.7, on: 0.5 * firing, scatter: 3 }));
  }
  return {
    units, men, wrecks, fade, arm: st.arm, passed,
    streams: streams.filter((x) => x.to.length && x.on > 0),
    sig: `${out}|${vehicles(s).fix}|${Math.round(st.arm * 20)}|${passed ? 1 : 0}|${Math.round(fade * 10)}`,
  };
}

// Per-state ground marks: the shoulders' and the blocking position's fire sectors, and the striking
// force's sector onto the column's rear as it swings in.
export function fieldMarks(K, P, T, s, pose) {
  let svg = "";
  svg += trFan(K, P, T, -72, -30, 8, 46, 18, 62, { side: "f", arcs: 1, alpha: 0.6 });
  svg += trFan(K, P, T, -72, 30, 8, 46, -62, -18, { side: "f", arcs: 1, alpha: 0.6 });
  svg += trFan(K, P, T, FG.XB + 4, FG.ROAD(FG.XB), 10, 86, 164, 196, { side: "f", arcs: 2, alpha: pose.passed ? 0.3 : 0.85 });
  if (pose.arm > 0.05) svg += trFan(K, P, T, FG.STRIKE.x + 5, FG.ROAD(FG.STRIKE.x), 6, 40, -16, 16, { side: "f", arcs: 1, alpha: 0.85 * pose.arm * pose.fade });
  return svg;
}
