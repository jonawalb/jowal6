// The Battlefield view of Lifting and Shifting Fires, at platoon scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same run state as the machine drives it (model.mjs stateAt):
//   R.d       the assault element's distance to the objective (m)
//   R.firing  the mortars and the support-by-fire guns are still on the objective
//   R.halted  the assault reached the minimum safe line with fires still falling: cease fire, down
//   R.e       the share of the enemy's fire coming at the assault (its men come back up as it rises)
//   R.rein    an unpinned depth team's progress up to the position (fires lifted, not shifted)
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every soldier and fire stream for a state (build and page); fieldMarks() draws the moving FCL;
// mortarShots() the mortar bursts. build.mjs inlines this file with `import` and `export` lines
// stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdStakes } from "../../kit/field.mjs";
import { MODEL, fellAt } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trChalk, trObjective, trSquad, trPlace, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -260, y: -230, w: 470, d: 440 },
  KXF: 0.75,          // world units per metre along the assault lane
  XF0: -9,            // x of the assault's front line at 0 m (just short of the enemy holes)
  HOLE_X: 2, HOLES_Y: [-21, -7, 7, 21],
  DEPTH: [[57, -11], [57, 1]],               // the enemy depth position: two holes
  REAR: [[16, -9], [16, -1], [17, 7], [17, 15]], // where an unpinned depth team kneels on arrival
  SQ_Y: [-21, 12.6],  // the two assault squads' anchors (squad line), left to right
  SBF: [-26, -82],    // support-by-fire anchor (behind a stone wall), facing the objective
  SBF_FACE: 72,
  UP: ["e-10", "e-20", "e-00", "e-30", "e-11", "e-21", "e-01", "e-31"], // order the enemy comes back up
  DOWN_F: ["a1-2", "a2-6", "a1-7", "a2-1", "a1-4", "a2-8", "a1-0"],
  DOWN_H: ["e-20", "e-11", "e-30", "e-01", "e-21", "e-sl"],
};
FG.xAt = (d) => FG.XF0 - d * FG.KXF;
FG.TERRAIN = {
  rises: [
    { cx: 4, cy: -2, r: 40, steps: 3, h: 1.4, top: 0.62, seed: 5, wobble: 0.08, lean: [0.2, 0] },
    { cx: 60, cy: -6, r: 20, steps: 2, h: 1.3, top: 0.5, seed: 9, wobble: 0.1 },
    { cx: -40, cy: -96, r: 24, steps: 2, h: 1.2, top: 0.5, seed: 13, wobble: 0.12, squash: 1.4 },
    { cx: -150, cy: 90, r: 34, steps: 3, h: 1.5, top: 0.45, seed: 31, wobble: 0.12 },
    { cx: 120, cy: 80, r: 30, steps: 3, h: 1.4, top: 0.45, seed: 37, wobble: 0.12 },
  ],
};

const FS_RAD = Math.PI / 180;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const holePos = (i, j) => [FG.HOLE_X, FG.HOLES_Y[i] + (j ? 1.1 : -1.1)];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[-90, 70, 46, 3, 0.6], [40, 110, 44, 5, 0.7], [-100, -60, 40, 7, 0.6], [110, -60, 40, 9, 0.6]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-230, 20], [-170, 26], [-176, 80], [-236, 70]], 8, "a"],
    [[[-120, 120], [-50, 128], [-58, 180], [-128, 170]], 9, "b"],
    [[[60, 140], [130, 132], [140, 186], [66, 194]], 8, "a"],
    [[[150, -20], [206, -16], [204, 40], [146, 36]], 7, "b"],
    [[[90, -150], [150, -146], [148, -100], [86, -104]], 8, "a"],
    [[[-140, -170], [-80, -170], [-84, -126], [-146, -128]], 7, "b"],
    [[[-176, -104], [-114, -98], [-112, -58], [-172, -62]], 8, "a"],
    [[[-10, -190], [50, -186], [46, -146], [-14, -150]], 8, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  g(trStream(K, P, [[-300, -150], [-200, -140], [-100, -160], [0, -132], [90, -126], [170, -150], [300, -170]], 3.2, 5));
  // the track behind the enemy position the depth team would use, and a farm road on the near side
  g(trRoad(K, P, [[110, -220], [96, -120], [84, -50], [78, 10], [84, 70], [110, 150], [150, 260]], 2.6));
  g(trRoad(K, P, [[-300, 130], [-200, 116], [-120, 104], [-40, 100], [40, 108], [120, 120], [280, 120]], 2.4, { ruts: false }));

  // woods: behind the assault's start, round the support-by-fire position, copses at the edges
  const keep = (x, y) => (x > -150 && x < 80 && y > -48 && y < 48) || Math.hypot(x - G.SBF[0], y - G.SBF[1]) < 22 || (x > -60 && x < 20 && y < -40 && y > -76);
  const woods = [
    [fdBlob(-196, -6, 50, 21, 0.14, 40, 0.65), 34, 21],
    [fdBlob(-60, -118, 46, 22, 0.14, 40, 0.5), 26, 22],
    [fdBlob(26, -96, 26, 23, 0.14, 40, 0.8), 10, 23],
    [fdBlob(130, 20, 24, 24, 0.12, 40, 0.9), 10, 24],
    [fdBlob(-30, 152, 26, 25, 0.12, 40, 0.8), 10, 25],
    [fdBlob(170, -100, 26, 26, 0.12, 40, 0.8), 10, 26],
    [fdBlob(-200, 150, 30, 27, 0.12, 40, 0.8), 12, 27],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.8, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => keep(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-176, 80], [-236, 70]], 51], [[[-50, 128], [-58, 180]], 52], [[[60, 140], [130, 132]], 53], [[[146, 36], [150, -20]], 54], [[[-114, -98], [-112, -58]], 55]]) items.push(...trHedge(K, P, pts, { seed }));
  // the stone wall the support-by-fire element fires over
  const [sx, sy] = G.SBF;
  for (const pts of [[[sx - 18, sy + 9], [sx - 6, sy + 13]], [[sx - 2, sy + 14], [sx + 10, sy + 17]], [[sx + 14, sy + 18], [sx + 26, sy + 21]]]) items.push(...trWall(K, P, pts));
  items.push(trHouse(K, P, -120, 140, 10, 13, 8.5), trHouse(K, P, 150, 132, 100, 14, 9), trHouse(K, P, 96, -78, 80, 11, 7.5));

  g(trRelief(K, P, T));

  // the enemy squad's fighting positions, facing the assault, and the depth position behind
  G.HOLES_Y.forEach((y) => items.push(...trHole(K, P, G.HOLE_X, y, T.height(G.HOLE_X, y), 180)));
  for (const [x, y] of G.DEPTH) items.push(...trHole(K, P, x, y, T.height(x, y), 180));

  // control measures: the minimum safe line as a row of stakes (notional distance), the objective flag
  const xm = G.xAt(MODEL.msl);
  items.push(...fdStakes(K, P, [-40, -28, -16, -4, 8, 20, 32, 44].map((y) => [xm, y]), 0, 3.6));
  items.push(trObjective(K, P, T, 22, 5, { h: 10, ang: 200 }));
  return { ground: ground.join(""), items };
}

// The final coordination line on pegs: where the fires lift or shift (the slider). Per state.
export function fieldMarks(K, P, T, L) {
  const x = FG.xAt(L);
  const m = trChalk(K, P, T, [[x, -44], [x, -15], [x, 15], [x, 44]]);
  return m.ground + m.items.map((it) => it.svg).join("");
}

// Where every soldier stands and who fires at whom, for a run state R (model.mjs stateAt).
// M carries the page's clock (t, for strides of men at rest); defaults suit the build.
export function fieldPose(R, T) {
  const G = FG, m = MODEL;
  const men = [];
  const add = (s) => { s.z = (s.z0 ?? 0) + T.height(s.x, s.y); men.push(s); };
  const rec = R.rec;

  // --- enemy squad: eight men in four holes and the squad leader; heads down while suppressed ---
  const up = new Set(G.UP.slice(0, Math.round(rec * G.UP.length)));
  G.HOLES_Y.forEach((_, i) => [0, 1].forEach((j) => {
    const id = `e-${i}${j}`, [x, y] = holePos(i, j);
    const isUp = up.has(id) || R.arrived;
    add({ id, side: "h", role: j === 0 && i === 1 ? "ar" : j === 0 ? "r" : i === 2 ? "ar" : "r", pose: "hole", face: 180, x, y, z0: isUp ? 0 : -1.25, up: isUp });
  }));
  add({ id: "e-sl", side: "h", role: "sl", pose: R.firing ? "prone" : "kneel", face: 180, x: 13, y: -2, stride: 0, up: !R.firing });
  // --- enemy depth team: in its holes; pinned by shifted fires, or moving up when fires lift ---
  const shiftedOnDepth = R.p.shift && !R.firing;
  [0, 1].forEach((h) => [0, 1].forEach((j) => {
    const k = h * 2 + j, id = `d-${k}`;
    const [hx, hy] = G.DEPTH[h], x0 = hx, y0 = hy + (j ? 1.1 : -1.1);
    if (R.rein > 0.001) {
      const [x1, y1] = G.REAR[k], u = R.rein;
      const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
      const moving = u < 0.999;
      add({ id, side: "h", role: j ? "r" : k === 0 ? "ar" : "r", pose: moving ? "stand" : "kneel", stride: moving ? strideAt(u * 60 + k) : 0, face: moving ? Math.atan2(y1 - y0, x1 - x0) / FS_RAD : 180, x, y, up: !moving });
    } else add({ id, side: "h", role: j ? "r" : k === 0 ? "ar" : "r", pose: "hole", face: 180, x: x0, y: y0, z0: shiftedOnDepth ? -1.25 : 0, up: false });
  }));

  // --- support by fire: two machine-gun teams prone at the wall, a rifle squad kneeling, the WSL ---
  const F = (u, v) => { const c = Math.cos(G.SBF_FACE * FS_RAD), s = Math.sin(G.SBF_FACE * FS_RAD); return [G.SBF[0] + u * c - v * s, G.SBF[1] + u * s + v * c]; };
  const sbf = (id, role, u, v, pose) => { const [x, y] = F(u, v); add({ id, side: "f", role, pose, face: G.SBF_FACE, stride: 0, x, y }); };
  ["tl", "ar", "gr", "r", "tl", "ar", "gr", "r"].forEach((role, i) => sbf(`s-${i}`, role, 4, [-17, -13, -9, -5, 7, 11, 15, 19][i], "kneel"));
  sbf("s-mg0", "mg", 6, -1, "prone"); sbf("s-ag0", "r", 5.4, -3.4, "prone");
  sbf("s-mg1", "mg", 6, 3, "prone"); sbf("s-ag1", "r", 5.4, 5.4, "prone");
  sbf("s-sl", "sl", -2, 1, "kneel");

  // --- the assault element: two rifle squads in squad line with the PL and RTO behind ---
  const xF = G.xAt(R.d);
  const travelled = (m.start - R.d) * G.KXF;
  const started = R.t > 0.02;
  const pose = R.halted ? "prone" : R.arrived ? "kneel" : started ? "stand" : "kneel";
  const st = pose === "stand" ? strideAt(travelled) : 0;
  const line = trSquad("line", "line");
  const OUT = new Set(G.DOWN_F.slice(0, R.blue));
  const assault = [];
  G.SQ_Y.forEach((y, n) => trPlace(line, { x: xF, y, face: 0 }).forEach((s, i) => assault.push({ id: `a${n + 1}-${i}`, side: "f", lit: true, role: s.role, sq: n + 1, pose, stride: st, face: 0, x: s.x, y: s.y, off: [s.x - xF, s.y] })));
  assault.push({ id: "a-pl", side: "f", lit: true, role: "pl", pose, stride: st, face: 0, x: xF - 11, y: -2, off: [-11, -2] });
  assault.push({ id: "a-rto", side: "f", lit: true, role: "rto", pose, stride: st, face: 0, x: xF - 13.5, y: 1.2, off: [-13.5, 1.2] });
  for (const s of assault) {
    const k = G.DOWN_F.indexOf(s.id);
    if (k >= 0 && OUT.has(s.id)) {
      // greyed and still where he fell (notional; the model's count)
      const xd = G.xAt(fellAt(k, R.o.blue));
      add({ id: `c-${s.id}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 160 + 40 * (k % 3), x: xd + s.off[0], y: s.off[1] });
    } else add(s);
  }
  // enemy men down: greyed beside their holes
  const DOWNH = new Set(G.DOWN_H.slice(0, R.red));
  for (let i = men.length - 1; i >= 0; i--) {
    const s = men[i];
    if (!DOWNH.has(s.id)) continue;
    men.splice(i, 1);
    add({ id: `c-${s.id}`, side: "hc", role: "r", pose: "prone", stride: 0, face: 20 + 50 * (G.DOWN_H.indexOf(s.id) % 3), x: s.x + 2.6, y: s.y + 0.6 });
  }

  // --- fire ---
  const byId = Object.fromEntries(men.map((s) => [s.id, s]));
  const aim = (s) => trAimPoint(s, s.x, s.y, s.z);
  const muzzle = (s) => trMuzzle(s, s.x, s.y, s.z);
  const objHoles = G.HOLES_Y.map((y) => [G.HOLE_X, y, T.height(G.HOLE_X, y) + 0.8]);
  const friends = men.filter((s) => s.side === "f" && s.lit);
  const streams = [];
  // the guns' rates of fire follow ATP 3-21.8 para C-121 in order: rapid to gain fire superiority,
  // sustained as the assault moves, increased as it nears, then walking fire forward of the assault
  // line (here onto the rear of the objective), then lift (stop) or shift (onto the depth position)
  const ph = sbfPhase(R, T);
  for (const i of [0, 1]) if (byId[`s-mg${i}`]) streams.push({ id: `s-mg${i}`, side: "f", heavy: true, smoke: true, from: muzzle(byId[`s-mg${i}`]), to: ph.to, period: ph.period, burst: ph.burst, gap: 0.09, flight: 0.55, phase: i * 0.77, on: ph.to.length ? 1 : 0, scatter: 3 });
  for (const i of [1, 5]) if (byId[`s-${i}`]) streams.push({ id: `s-r${i}`, side: "f", from: muzzle(byId[`s-${i}`]), to: ph.to, period: 2.4, burst: 1, gap: 0, flight: 0.55, phase: i * 0.4, on: ph.to.length && ph.name !== "walking" ? 0.8 : 0, scatter: 3 });
  // enemy: every man who is up fires at the assault, the more of them the heavier the fire
  const tgts = friends.filter((s) => s.id.startsWith("a")).map(aim);
  men.filter((s) => s.side === "h" && s.up).forEach((s, i) => streams.push({ id: s.id, side: "h", heavy: s.role === "ar", from: muzzle(s), to: tgts, period: s.role === "ar" ? 1.9 : 2.6 + (i % 3) * 0.31, burst: s.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.38, phase: i * 0.47, on: R.arrived ? 0.5 : 0.85, scatter: 3 }));
  // the assault's automatic riflemen and team leaders fire as they close and on the objective
  const close = R.arrived || (!R.halted && R.d < 40);
  if (close) friends.filter((s) => s.role === "ar" || s.role === "tl").forEach((s, i) => streams.push({ id: s.id, side: "f", heavy: s.role === "ar", from: muzzle(s), to: objHoles, period: s.role === "ar" ? 1.8 : 2.6, burst: s.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.3, phase: i * 0.53, on: 0.9, scatter: 2.6 }));
  return { men, streams };
}

// The support-by-fire guns' phase (ATP 3-21.8, para C-121) for a run state, with its targets.
export function sbfPhase(R, T) {
  const G = FG, m = MODEL;
  const z = (x, y, h) => [x, y, T.height(x, y) + h];
  const Le = Math.max(R.p.L, m.msl);
  const obj = G.HOLES_Y.map((y) => z(G.HOLE_X, y, 0.8));
  if (R.firing && R.d > m.start - 40) return { name: "rapid", period: 0.9, burst: 4, to: obj };
  if (R.firing && R.d > Le + 40) return { name: "sustained", period: 2.2, burst: 2, to: obj };
  if (R.firing) return { name: "increased", period: 1.0, burst: 4, to: obj };
  if (R.halted) return { name: "cease", period: 1.6, burst: 3, to: [] };
  if (!R.arrived) return { name: "walking", period: 1.4, burst: 3, to: [[19, -14], [21, -4], [21, 6], [19, 16]].map(([x, y]) => z(x, y, 0.6)) };
  if (R.p.shift) return { name: "shift", period: 1.6, burst: 3, to: G.DEPTH.map(([x, y]) => z(x, y, 0.8)) };
  return { name: "lift", period: 1.6, burst: 3, to: [] };
}

// Mortar bursts at time t of a run: rounds fired before the lift fall on the objective, rounds
// after it on the depth position (shift) or none (lift). Each burst lives `life` seconds, so smoke
// from rounds already down fades out instead of popping. Returns [{ p: [x, y, z], age: 0..1 }].
export function mortarShots(R, T, t) {
  const G = FG;
  const obj = G.HOLES_Y.map((y) => [G.HOLE_X + 1, y]);
  const out = [], period = 0.42, life = 2.6;
  const k1 = Math.floor(t / period);
  for (let k = Math.max(0, k1 - Math.ceil(life / period)); k <= k1; k++) {
    const t0 = k * period, age = t - t0;
    if (age < 0 || age > life) continue;
    const on = t0 < R.p.tL ? obj : R.p.shift ? G.DEPTH : null;
    if (!on) continue;
    const h = Math.abs(Math.sin(k * 12.9898 + 4.1) * 43758.5453) % 1, g = Math.abs(Math.sin(k * 78.233 + 1.7) * 24634.634) % 1;
    const [x, y] = on[Math.floor(h * on.length) % on.length];
    const px = x + (g - 0.5) * 9, py = y + ((h * 7) % 1 - 0.5) * 9;
    out.push({ p: [px, py, T.height(px, py)], age: age / life });
  }
  return out;
}
