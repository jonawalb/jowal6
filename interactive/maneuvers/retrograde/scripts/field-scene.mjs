// The Battlefield view of the retrograde, at company scale, drawn with the terrain kit (../../kit/terrain.mjs).
// A delaying company (two platoons of four tracked vehicles, lit) holds a series of battle positions down a
// valley against an enemy that comes on down the valley road from the right; the enemy's size grows with the
// combat-power ratio. The same model state drives it as the machine: runAt(mode, r, t, tech) from model.mjs.
//   subsequent positions: the whole company holds each battle position, then falls back to the next in
//     contact, its two platoons staggering their moves so both are never moving at once;
//   alternating positions: one platoon holds while the other is set on the next position; the first then
//     passes back between the second's vehicles to the position after, out of contact;
//   withdrawal: the company breaks contact under fire, forms a column on the road and drives to the rear,
//     the enemy following; retirement: the same column with no enemy in contact.
// Vehicles lost on both sides (model.mjs casualties() and lossTimes(), notional) stay greyed where they were
// hit, the latest ones smoking; an ambulance goes to the latest friendly loss.
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places every
// vehicle, soldier and fire stream for a state (build and page); fieldMarks() draws the fire sector.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trPrism } from "../../kit/terrain.mjs";
import { MODEL, runAt, lossTimes } from "./model.mjs";

export const FG = {
  world: { x: -470, y: -340, w: 940, d: 680 },
  X0: 108,             // field x of the first battle position
  KX: 9,               // field units per km of ground (notional; the 24 km area spans 216 units)
  STAND: 38,           // the enemy's line stands this far in front of the position it faces
  ROAD: (X) => 4 * Math.sin(0.012 * X + 0.4),
  // friendly slots across the valley at a battle position: [dx, y]. Vehicles 0-3 are platoon A, 4-7 platoon B.
  SUB: [[1.5, -47], [-1, -35], [2, -23], [-0.5, -11], [-1.5, 11], [1, 23], [-2, 35], [0.5, 47]],
  ALT: [[1, -45], [-1.5, -19], [2, 9], [-0.5, 35], [-1, -32], [1.5, -6], [-2, 22], [0.5, 48]],
  COL: [0, 7, 1, 6, 2, 5, 4, 3],  // column order on the road in a withdrawal or retirement, tail to lead
  SP: 12,              // spacing in column
  RUN: 20,             // how far past the rear line the column's lead drives
  // enemy line slots, centre out: y of each of eight across, two rows deep
  ELINE: [-6, 7, -19, 20, -32, 33, -45, 46],
  EORDER: [1, 2, 0, 3, 5, 4, 6, 7, 9, 8, 10, 11, 13, 12, 14, 15],
  FORDER: { AB: [2, 5, 1, 6, 3, 4, 0, 7], A: [1, 2, 0, 3], B: [5, 6, 4, 7] },
};
FG.TERRAIN = {
  rises: [
    { cx: -150, cy: -112, r: 34, steps: 2, h: 1.7, top: 0.5, seed: 5, wobble: 0.12, squash: 0.6 },
    { cx: 40, cy: -120, r: 40, steps: 3, h: 1.6, top: 0.45, seed: 9, wobble: 0.1, squash: 0.55 },
    { cx: 190, cy: -110, r: 34, steps: 2, h: 1.7, top: 0.5, seed: 13, wobble: 0.12, squash: 0.6 },
    { cx: -60, cy: 118, r: 36, steps: 2, h: 1.6, top: 0.5, seed: 17, wobble: 0.12, squash: 0.6 },
    { cx: 140, cy: 120, r: 34, steps: 2, h: 1.6, top: 0.5, seed: 21, wobble: 0.12, squash: 0.6 },
  ],
};

const RG_RAD = Math.PI / 180;
const rgClamp01 = (x) => Math.min(1, Math.max(0, x));
const rgSmooth = (a, b, x) => { const t = rgClamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const rgBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);
// Field x of a point g km behind the first battle position.
export const rgX = (g) => FG.X0 - FG.KX * g;

// A wheeled ambulance at the origin facing `face`: cab, box body and chassis, about 7 units long, drawn
// inside a <g class="tr-s" data-side="m">. (The same drawing as the ambulance in Fig 21's field view.)
export function rgTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, rgBox(F, u0, u1, v0, v1), z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(rgBox(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  // meadows on the valley floor, fields toward the edges
  for (const [cx, cy, r, seed, sq] of [[-120, 10, 70, 3, 0.5], [60, -10, 70, 5, 0.45], [200, 20, 50, 7, 0.6], [-10, 60, 40, 11, 0.6], [100, 70, 40, 13, 0.6]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-320, 30], [-256, 34], [-260, 82], [-326, 76]], 8, "a"],
    [[[-300, -80], [-240, -76], [-244, -36], [-304, -40]], 7, "b"],
    [[[250, 60], [318, 54], [322, 102], [254, 108]], 8, "b"],
    [[[240, -100], [306, -106], [310, -60], [244, -54]], 8, "a"],
    [[[-230, 92], [-180, 90], [-182, 124], [-232, 126]], 6, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // the valley road, run well past the visible ground, and a farm track off it
  const roadPts = [];
  for (let X = -520; X <= 520; X += 20) roadPts.push([X, G.ROAD(X)]);
  g(trRoad(K, P, roadPts, 3.4));
  g(trRoad(K, P, [[-280, 200], [-272, 120], [-262, 60], [-258, 0]], 2.2, { ruts: false }));

  // woods on the valley sides, clear of the battle positions and the road; copses toward the edges
  const woods = [
    [fdBlob(-60, -100, 46, 21, 0.1, 44, 0.45), 18, 21],
    [fdBlob(120, -104, 40, 22, 0.1, 44, 0.45), 16, 22],
    [fdBlob(-200, -96, 34, 23, 0.12, 40, 0.5), 12, 23],
    [fdBlob(30, 110, 46, 24, 0.12, 40, 0.45), 16, 24],
    [fdBlob(-150, 104, 34, 25, 0.12, 40, 0.5), 12, 25],
    [fdBlob(230, 104, 36, 26, 0.12, 40, 0.5), 12, 26],
    [fdBlob(-300, -190, 50, 27, 0.12, 40, 0.6), 14, 27],
    [fdBlob(300, -200, 46, 28, 0.12, 40, 0.6), 14, 28],
    [fdBlob(-20, -220, 60, 29, 0.12, 40, 0.5), 14, 29],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 6.2, r: [2.8, 4.4], h: [8, 12], avoid: (x, y) => Math.abs(y - G.ROAD(x)) < 70 || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-320, 30], [-256, 34], [-260, 82]], 51], [[[250, 60], [318, 54]], 53], [[[240, -100], [306, -106]], 54], [[[-230, 92], [-180, 90]], 55]]) items.push(...trHedge(K, P, pts, { seed }));
  for (const [x, y, a, l, w] of [[-244, 22, 0, 11, 7], [-228, 36, 90, 9, 6.5], [-268, -22, 10, 10, 7], [262, -26, 0, 11, 7], [278, -12, 90, 9, 6.5]]) items.push(trHouse(K, P, x, y, a, l, w));

  g(trRelief(K, P, T));

  // control measures: the four battle positions (chalk outlines on pegs) and the rear of the area (a phase line)
  for (const p of MODEL.positions) {
    const x = rgX(p);
    const bp = trChalk(K, P, T, [[x - 7, -54], [x + 7, -54], [x + 7, 55], [x - 7, 55]], { closed: true, h: 3 });
    g(bp.ground); items.push(...bp.items);
  }
  const xr = rgX(MODEL.depth) - 8;
  const pl = trChalk(K, P, T, [[xr + 1, -64], [xr, -2], [xr - 1, 62]]);
  g(pl.ground); items.push(...pl.items);
  return { ground: ground.join(""), items };
}

// ---------- where everyone stands ----------

// Friendly vehicle i for state s: { x, y, face, moving }.
function rgFriend(i, s, mode) {
  const G = FG;
  if (mode !== "delay") {
    const k = G.COL.indexOf(i), [dx, sy] = G.SUB[i];
    const at = (d) => {
      const c = rgSmooth(0, 3, d);
      const x = rgX(d) + dx * (1 - c) - (7 - k) * G.SP * c - G.RUN * d / MODEL.depth;
      return [x, sy * (1 - c) + G.ROAD(x) * c];
    };
    const [x, y] = at(s.d), [x2, y2] = at(Math.min(s.d + 0.25, MODEL.depth + 0.25));
    const moving = s.d < MODEL.depth;
    const face = moving ? Math.atan2(y2 - y, x2 - x) / RG_RAD : 180;
    return { x, y, face, moving };
  }
  const el = i < 4 ? "A" : "B";
  if (s.tech === "alternating") {
    const [dx, y] = G.ALT[i], e = s[el];
    const p = e.to > e.from ? rgClamp01((e.d - e.from) / (e.to - e.from)) : 1;
    const face = e.moving ? 180 * rgSmooth(0, 0.18, p) + 180 * rgSmooth(0.82, 1, p) : 0;
    return { x: rgX(e.d) + dx, y: y + (e.moving ? 2.5 * Math.sin(p * Math.PI) : 0), face, moving: e.moving };
  }
  // subsequent: the whole company on each position; in the move platoon A goes in the first half, B in the second
  const [dx, y] = G.SUB[i];
  let km = s.d, moving = false, p = 0;
  if (s.kind === "move") {
    const x0 = MODEL.positions[s.n - 1], x1 = s.n < MODEL.positions.length ? MODEL.positions[s.n] : MODEL.depth;
    const half = el === "A" ? s.f * 2 : s.f * 2 - 1;
    p = rgClamp01(half);
    km = x0 + (x1 - x0) * rgSmooth(0, 1, p);
    moving = half > 0 && half < 1;
  }
  const face = moving ? 180 * rgSmooth(0, 0.2, p) + 180 * rgSmooth(0.8, 1, p) : 0;
  return { x: rgX(km) + dx, y, face, moving };
}

// How deployed the enemy is, 0 (in column behind its lead platoon) to 1 (in line facing the position).
function rgDeploy(s, mode) {
  if (mode === "withdraw") return 1 - rgSmooth(0, MODEL.loss.breakH, s.t);
  if (s.kind === "hold") return s.f;
  if (s.kind === "move" || s.kind === "gap") return 1 - s.f;
  return 0;
}
// Enemy vehicle j (of n) for state s: { x, y, face, w (deployment) }.
// The enemy's front stands off the friendly element nearest it: in a subsequent displacement it waits
// while the first platoon moves and follows the second.
function rgFront(s, mode) {
  if (mode === "delay" && s.kind === "move") {
    const x0 = MODEL.positions[s.n - 1], x1 = s.n < MODEL.positions.length ? MODEL.positions[s.n] : MODEL.depth;
    return Math.min(s.a, x0 + (x1 - x0) * rgSmooth(0, 1, rgClamp01(s.f * 2 - 1)));
  }
  return s.a;
}
function rgEnemy(j, n, s, mode) {
  const G = FG;
  const FX = rgX(rgFront(s, mode)) + G.STAND;
  const dep = rgDeploy(s, mode);
  const nd = 4 + dep * Math.max(0, Math.min(12, n - 4));
  const w = j < 4 ? 1 : rgSmooth(0, 1, nd - j);
  const cx = FX + 16 + j * 10, cy = G.ROAD(cx);
  const row = Math.floor(j / 8), col = j % 8;
  const lx = FX + row * 14 + ((j * 7) % 5) - 2, ly = G.ELINE[col];
  const x = cx + (lx - cx) * w, y = cy + (ly - cy) * w;
  let face = 180;
  if (w > 0.01 && w < 0.99) {
    const rising = mode === "delay" && s.kind === "hold";
    const h = Math.atan2(rising ? ly - cy : cy - ly, rising ? lx - cx : cx - lx) / RG_RAD;
    let dh = ((h - 180) % 360 + 540) % 360 - 180;
    face = 180 + dh * Math.sin(Math.PI * w);
  }
  return { x, y, face, w };
}

const rgEnemyCount = (r) => Math.round(8 * r);

// Where every vehicle stands and who fires at whom, for a mode, ratio r, technique and model state s
// (runAt). M carries what the page eases between frames: amb (the ambulance's position).
export function fieldPose(mode, r, tech, s, T, M = {}) {
  const G = FG;
  const units = [], men = [];
  const put = (u) => { u.z = T.height(u.x, u.y); units.push(u); return u; };
  const lt = lossTimes(mode, r, tech);
  const stateAt = (t) => runAt(mode, r, t, tech);

  // --- losses: which vehicle each loss takes, and where it was when hit ---
  const fWreck = new Map(), eWreck = new Map();
  for (const x of lt.f) {
    if (x.t > s.t) break;
    const order = G.FORDER[x.el].concat(G.FORDER.AB);
    const i = order.find((v) => !fWreck.has(v));
    if (i === undefined) break;
    const p = rgFriend(i, stateAt(x.t), mode);
    fWreck.set(i, { ...p, t: x.t });
  }
  const n = s.a === null ? 0 : rgEnemyCount(r);
  for (const x of lt.e) {
    if (x.t > s.t || !n) break;
    const j = G.EORDER.find((v) => v < n && !eWreck.has(v));
    if (j === undefined) break;
    const p = rgEnemy(j, n, stateAt(x.t), mode);
    eWreck.set(j, { ...p, t: x.t });
  }

  // --- the delaying company: lit where it is in contact (the whole company, or the platoon holding) ---
  const inContact = (i) => mode !== "delay" || s.el === "AB" || s.el === (i < 4 ? "A" : "B");
  const friends = [];
  for (let i = 0; i < 8; i++) {
    const w = fWreck.get(i);
    if (w) { put({ id: `v${i}`, kind: "v", side: "fc", face: w.face, x: w.x, y: w.y, wreck: w.t }); continue; }
    const p = rgFriend(i, s, mode);
    friends.push(put({ id: `v${i}`, kind: "v", side: "f", lit: inContact(i) && s.kind !== "done", face: p.face, x: p.x, y: p.y, moving: p.moving, i }));
  }

  // --- the enemy: its lead platoon in contact, the rest in column on the road or deploying into line ---
  const enemies = [];
  for (let j = 0; j < n; j++) {
    const w = eWreck.get(j);
    if (w) { put({ id: `e${j}`, kind: "v", side: "hc", face: w.face, x: w.x, y: w.y, wreck: w.t }); continue; }
    const p = rgEnemy(j, n, s, mode);
    if (p.x > 250) continue;
    enemies.push(put({ id: `e${j}`, kind: "v", side: "h", face: p.face, x: p.x, y: p.y, w: p.w }));
  }

  // --- casualty evacuation: an ambulance waits behind the company and drives to the latest friendly loss ---
  const lastF = [...fWreck.values()].sort((a, b) => b.t - a.t)[0];
  const rearX = friends.length ? Math.min(...friends.map((u) => u.x)) - 24 : rgX(MODEL.depth) - 30;
  let want = [rearX, G.ROAD(rearX)];
  const busy = lastF && s.t - lastF.t < 1.4;
  if (busy) want = [lastF.x - 7, lastF.y + 4];
  const amb = M.amb || want;
  const face = Math.abs(amb[0] - want[0]) + Math.abs(amb[1] - want[1]) > 0.5 ? Math.atan2(want[1] - amb[1], want[0] - amb[0]) / RG_RAD : 0;
  put({ id: "amb", kind: "t", side: "m", face, x: amb[0], y: amb[1] });
  if (busy && Math.hypot(amb[0] - want[0], amb[1] - want[1]) < 3) {
    const mx = lastF.x - 3.4, my = lastF.y + 3.2;
    men.push({ id: "medic", side: "f", role: "r", pose: "kneel", face: Math.atan2(lastF.y - my, lastF.x - mx) / RG_RAD, x: mx, y: my, z: T.height(mx, my), stride: 0 });
  }

  // --- fire ---
  const streams = [];
  const gunAt = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(4.2, 0), u.z + 3.1]; };
  const hull = (u) => [u.x, u.y, u.z + 1.8];
  const contact = mode === "delay" ? s.kind !== "done" : mode === "withdraw" && s.t < MODEL.loss.breakH;
  if (contact) {
    const deployed = enemies.filter((u) => u.w > 0.6);
    const shooters = friends.filter((u) => !u.moving && inContact(u.i));
    const gap = s.kind === "gap";
    shooters.forEach((u, k) => streams.push({ id: `${u.id}f`, side: "f", heavy: true, smoke: k % 3 === 0, from: gunAt(u), to: deployed.map(hull), period: 1.7 + (k % 4) * 0.31, burst: 1, gap: 0, flight: 0.4, phase: k * 0.53, on: gap ? 0.45 : 0.75, scatter: 3 }));
    const targets = friends.filter((u) => inContact(u.i)).map(hull);
    const dep = rgDeploy(s, mode);
    const on = mode === "withdraw" ? 0.6 : s.kind === "hold" ? 0.3 + 0.45 * dep : 0.4;
    deployed.forEach((u, k) => streams.push({ id: `${u.id}f`, side: "h", heavy: true, from: gunAt(u), to: targets, period: 1.9 + (k % 5) * 0.27, burst: 1, gap: 0, flight: 0.4, phase: 0.3 + k * 0.47, on, scatter: 3.4 }));
  }
  // a smoke screen between the company and the enemy while it falls back in contact or breaks contact
  const screen = (mode === "delay" && s.kind === "move") || (mode === "withdraw" && s.t < MODEL.loss.breakH + 0.3);
  const smokeAt = screen ? rgX(rgFront(s, mode)) + G.STAND * 0.55 : null;
  return { units, men, streams: streams.filter((st) => st.to.length), amb: want, smokeAt,
    wrecks: [...[...fWreck.values()].sort((a, b) => b.t - a.t).slice(0, 3), ...[...eWreck.values()].sort((a, b) => b.t - a.t).slice(0, 3)].map((w) => [w.x, w.y, T.height(w.x, w.y)]),
    sig: `${mode}|${s.kind}|${s.el}|${s.n}` };
}

// Smoke that is not a strike: from the latest wrecks on each side, and the screen across the valley.
// Pure in the page clock t (seconds); returns entries for trFire's smoke pool.
export function fieldSmoke(pose, t) {
  const out = [];
  pose.wrecks.forEach(([x, y, z], i) => {
    for (let k = 0; k < 3; k++) {
      const age = ((t * 0.32 + k / 3 + i * 0.17) % 1);
      out.push({ p: [x - 1.2 * age * 6, y - 2 * age * 6, z + 2.5 + age * 9], age });
    }
  });
  if (pose.smokeAt !== null) {
    for (let k = 0; k < 9; k++) {
      const age = ((t * 0.22 + k * 0.37) % 1);
      const y = -50 + k * 12.5;
      out.push({ p: [pose.smokeAt + (k % 3) * 3 - 2 * age * 4, y - 3 * age * 4, 1 + age * 5], age: 0.15 + age * 0.85 });
    }
  }
  return out;
}

// The fire sector of the element holding a battle position, toward the enemy.
export function fieldMarks(K, P, T, mode, s) {
  if (mode !== "delay" || s.kind === "done") return "";
  const km = s.el === "AB" ? s.d : s[s.el].d;
  if (s.el !== "AB" && s[s.el].moving) return "";
  const x = rgX(s.kind === "move" ? MODEL.positions[s.n - 1] : km);
  if (s.kind === "move") return "";
  return trFan(K, P, T, x + 8, 0, 6, FG.STAND + 18, -26, 26, { side: "f", arcs: 2, alpha: s.kind === "gap" ? 0.55 : 0.75 });
}
