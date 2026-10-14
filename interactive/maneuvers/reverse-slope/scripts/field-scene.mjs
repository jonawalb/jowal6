// The Battlefield view of the Reverse Slope Defense, at platoon scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same state s (model.mjs) as the machine drives it:
//   s.mode   "F" platoon on the forward slope, "R" behind the crest; s.op the observation post is manned
//   s.x      the enemy's position along the approach (model units; R = -x on the ground, crest at 0)
//   s.fireE  the enemy sees and fires on the platoon; s.fireB the platoon fires
//   s.fallR  where each enemy casualty fell (x); s.fallB friendly men down
// One distance unit is about a metre of ground (notional). The hill is the model's terraces (MODEL.hill),
// so line of sight in the model is line of sight on the ground. fieldStatic() builds the ground (build
// only); fieldPose() places every soldier and fire stream for a state (build and page); fieldMarks()
// draws the ground marks (the FPF box).
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdPolar, fdSweep, fdBlob, fdFrame } from "../../kit/field.mjs";
import { MODEL } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trWire, trChalk, trPlatoon, trPlace, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -260, y: -240, w: 520, d: 500 },
  FACE: 238,                 // the direction of the enemy from the hill's centre, degrees
  HOLE_V: [-33, -27, -21, -15, -9, -3, 3, 9, 15, 21, 27, 33],   // positions across the front (v)
  TEAM_ROLES: [["tl", "ar"], ["gr", "r"]],
  OPV: 6,                    // the observation post's offset across the front
  CCP: [[-14, -20], [-18, -14], [-12, -9], [-17, -4], [-21, -10], [-15, 4]],  // behind the line, relative (R offset, v)
  DOWN_F: [3, 8, 14, 1, 6, 11, 17, 4, 9, 15, 0, 5, 12, 18, 7, 2, 10, 16, 13, 19],   // which men go down, in order
};
FG.TERRAIN = { rises: [{ cx: 0, cy: 0, r: MODEL.hill.r, steps: MODEL.hill.steps, h: MODEL.hill.h, top: MODEL.hill.top, seed: 5, wobble: 0.0, lean: [0, 0] }] };

const FS_RAD = Math.PI / 180;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const fsHash = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
export const fieldTerrain = () => trTerrain(FG.TERRAIN);
const axisFrame = () => fdFrame(0, 0, FG.FACE);
// a point at model x (R = -x along the approach) and v across it
export const atX = (x, v = 0) => axisFrame()(-x, v);
const angTo = (x0, y0, x1, y1) => Math.atan2(y1 - y0, x1 - x0) / FS_RAD;

// The platoon's two-man fighting positions on the line at model x: { team, id, x, y, face, roles }
export function fieldHoles(xline) {
  return FG.HOLE_V.map((v, k) => {
    const [x, y] = atX(xline, v);
    return { k, x, y, face: FG.FACE, roles: FG.TEAM_ROLES[k % 2] };
  });
}

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const openLane = (x, y) => { const d = Math.hypot(x, y); if (d > 260) return false; const a = Math.abs((((Math.atan2(y, x) / FS_RAD - G.FACE) % 360) + 540) % 360 - 180); return a < 34; };
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[60, 150, 46, 3, 0.6], [190, -80, 40, 5, 0.8], [-60, 150, 46, 7, 0.5], [-150, 70, 40, 9, 0.6]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[176, 116], [232, 128], [226, 188], [168, 170]], 9, "a"],
    [[[-150, 66], [-84, 74], [-92, 112], [-160, 104]], 7, "a"],
    [[[190, -30], [236, -24], [232, 20], [186, 14]], 8, "b"],
    [[[-214, 10], [-150, 20], [-148, 62], [-212, 56]], 8, "b"],
    [[[-26, 160], [30, 168], [36, 206], [-20, 200]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  g(trStream(K, P, [[-280, 200], [-180, 214], [-90, 226], [0, 214], [80, 226], [150, 204], [220, 226], [300, 250]], 3.2, 5));
  g(trRoad(K, P, [[300, -60], [220, -20], [150, 20], [110, 60], [100, 120], [110, 170], [120, 230], [136, 280]], 3.2));
  const woods = [
    [fdBlob(-60, 120, 28, 31, 0.14, 40, 0.9), 16, 21],
    [fdBlob(-170, 20, 28, 37, 0.14, 40, 0.8), 14, 27],
    [fdBlob(170, 40, 26, 33, 0.14, 40, 0.9), 12, 23],
    [fdBlob(30, -190, 30, 34, 0.12, 40, 1), 14, 24],
    [fdBlob(150, 190, 26, 35, 0.12, 40, 0.8), 10, 25],
    [fdBlob(-120, 150, 22, 36, 0.12, 40, 0.8), 9, 26],
    [fdBlob(-200, -60, 26, 38, 0.14, 40, 0.8), 10, 28],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0 || openLane(x, y) });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[168, 170], [176, 116], [232, 128]], 51], [[[-84, 74], [-150, 66], [-160, 104]], 52]]) items.push(...trHedge(K, P, pts, { seed }));
  items.push(trHouse(K, P, 96, 90, 90, 12, 8), trHouse(K, P, 122, 100, 0, 14, 8.5, 4.6, 8.2), trHouse(K, P, -150, 30, 20, 10, 7.5));
  g(trRelief(K, P, T));
  // wire: a belt across the forward slope and a protective belt just down from the crest (ATP 3-21.8, para 5-132)
  const arc = (R, half, mid = G.FACE) => fdSweep(mid - half, mid + half, 8).map((a) => fdPolar(0, 0, R, a));
  items.push(...trWire(K, P, T, arc(-MODEL.belt.fwd, 52)));
  items.push(...trWire(K, P, T, arc(-MODEL.belt.rear, 56, G.FACE)));
  return { ground: ground.join(""), items };
}

// kill order of the attack's 30 men: a fixed shuffle
const KILL = Array.from({ length: 30 }, (_, i) => i).sort((a, b) => fsHash(a, 91) - fsHash(b, 91));

// Where every soldier stands and who fires at whom.
export function fieldPose(s, T) {
  const G = FG, men = [], pxl = MODEL.pos[s.mode];
  const add = (m) => { m.z = T.height(m.x, m.y) + (m.dz || 0); men.push(m); return m; };
  const battle = s.phase === "battle" || s.phase === "done";
  const enemyFace = (x, y) => angTo(x, y, ...atX(s.x, 0));
  // --- the attack: one platoon in a vee, columns of fire teams in wedges; its lead moves along the approach ---
  const mem = trPlatoon("vee", "column", "wedge", 3.4);
  const anchor = { x: atX(s.x)[0], y: atX(s.x)[1], face: G.FACE + 180 };
  const placed = trPlace(mem, anchor);
  const gone = new Set(KILL.slice(0, s.fallR.length));
  const moving = battle && s.phase === "battle" && s.dwell <= 0;
  const E = [];
  placed.forEach((m, i) => {
    if (gone.has(i)) return;
    const mm = add({ id: `e${i}`, side: "h", role: m.role, pose: moving ? "stand" : (s.dwell > 0 ? "kneel" : "stand"), stride: moving ? strideAt(s.x - MODEL.x0 + i * 1.3) : 0, face: m.face, x: m.x, y: m.y });
    E.push({ i, m: mm });
  });
  // fallen of the attack: prone where each fell, in the formation's place at that moment
  KILL.slice(0, s.fallR.length).forEach((idx, n) => {
    const a = trPlace([mem[idx]], { x: atX(s.fallR[n])[0], y: atX(s.fallR[n])[1], face: G.FACE + 180 })[0];
    add({ id: `r${n}`, side: "hc", role: "r", pose: "prone", stride: 0, face: G.FACE + 40 * ((n % 5) - 2), x: a.x, y: a.y });
  });
  // --- the platoon: twelve positions, two men each, PL and RTO behind ---
  const holes = fieldHoles(pxl), live = battle && s.phase === "battle";
  const gunnersDown = new Set(G.DOWN_F.filter((n) => n < 24).slice(0, s.fallB));
  const lead = E.length ? E[0].m : null;
  let bi = 0;
  for (const h of holes) {
    const Fh = fdFrame(h.x, h.y, h.face);
    h.roles.forEach((role, n) => {
      const idx = bi++;
      if (gunnersDown.has(idx)) return;
      const [x, y] = Fh(0, n === 0 ? 1.1 : -1.1);
      add({ id: `f${idx}`, side: "f", role, pose: "hole", face: lead && live && (s.seen || s.fireB) ? angTo(x, y, lead.x, lead.y) : G.FACE, x, y });
    });
  }
  { const [x, y] = atX(pxl - 12, 0), [x2, y2] = atX(pxl - 14, 5); add({ id: "f-pl", side: "f", role: "pl", pose: "kneel", face: G.FACE, x, y }); add({ id: "f-rto", side: "f", role: "rto", pose: "kneel", face: G.FACE, x: x2, y: y2 }); }
  // --- the observation post: two men at the crest, with the platoon's eyes ---
  if (s.op) {
    [["tl", 0], ["r", 3.2]].forEach(([role, dv], n) => { const [x, y] = atX(MODEL.op, G.OPV + dv); add({ id: `op${n}`, side: "f", role, pose: "prone", face: G.FACE, x, y }); });
  }
  // --- friendly casualties, greyed behind the line, and a medic ---
  G.CCP.slice(0, s.fallB).forEach(([dr, v], k) => { const [x, y] = atX(pxl - 10 + dr + 10, v); add({ id: `c-f${k}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 40 + 30 * ((k * 7) % 3 - 1), x, y }); });
  { const [x, y] = atX(pxl - 20, -12); add({ id: "c-med", side: "f", role: "r", pose: "kneel", stride: 0, face: 230, x, y }); }

  // --- fire ---
  const byId = Object.fromEntries(men.map((m) => [m.id, m]));
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z), aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const streams = [];
  if (live && E.length) {
    const front = E.filter((e) => e.m.role !== "pl").slice(0, 8);
    if (s.fireB) {
      const tg = E.slice(0, 10).map((e) => aim(e.m));
      holes.forEach((h, k) => { for (const role of h.roles.slice(0, 1)) { const m = byId[`f${k * 2 + h.roles.indexOf(role)}`]; if (m) streams.push({ id: m.id, side: "f", heavy: role === "ar", from: muzzle(m), to: tg, period: role === "ar" ? 1.4 : 2.1, burst: role === "ar" ? 3 : 1, gap: 0.08, flight: 0.35, phase: k * 0.31, on: 1, scatter: 2.6 }); } });
    }
    if (s.fireE) {
      const tg = men.filter((m) => m.side === "f" && m.pose === "hole").map(aim);
      front.forEach((e, k) => streams.push({ id: `e${e.i}`, side: "h", heavy: e.m.role === "ar", from: muzzle(e.m), to: tg, period: 2.2 + (k % 3) * 0.4, burst: e.m.role === "ar" ? 3 : 1, gap: 0.1, flight: 0.4, phase: k * 0.43, on: 0.9, scatter: 4 }));
    }
    // enemy indirect fire on a position it observes: rounds falling on the line (heavy, with smoke)
    if (s.seen && s.red > 0) {
      const tg = men.filter((m) => m.side === "f" && m.pose === "hole").map(aim);
      streams.push({ id: "ind", side: "h", heavy: true, smoke: true, from: [tg[0][0], tg[0][1], 40], to: tg, period: 2.6, burst: 2, gap: 0.5, flight: 0.7, phase: 0.2, on: 0.8, scatter: 14 });
    }
    // the platoon's FPF: rounds on the crest or the ground in front of the line while the attack is in its box
    const box = MODEL.fpf[s.mode];
    if (s.x >= box[0] && s.x <= box[1] && (s.mode === "F" || s.op) && s.blue > 0) {
      const [cx, cy] = atX((box[0] + box[1]) / 2, 0);
      const tg = [[cx, cy, T.height(cx, cy)], ...[-30, -15, 15, 30].map((v) => { const [x, y] = atX((box[0] + box[1]) / 2, v); return [x, y, T.height(x, y)]; })];
      streams.push({ id: "fpf", side: "f", heavy: true, smoke: true, from: [cx, cy, 44], to: tg, period: 1.8, burst: 2, gap: 0.4, flight: 0.6, phase: 0.1, on: 1, scatter: 8 });
    }
  }
  return { men, streams };
}

// Per-state ground marks: the FPF box.
export function fieldMarks(K, P, T, s) {
  const G = FG;
  let out = "";
  const box = MODEL.fpf[s.mode], hv = 40;
  const fpf = trChalk(K, P, T, [atX(box[0], -hv), atX(box[1], -hv), atX(box[1], hv), atX(box[0], hv)], { closed: true, pegs: false });
  out += fpf.ground;
  return out;
}
