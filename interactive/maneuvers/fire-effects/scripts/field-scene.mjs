// The Battlefield view of Suppress, Neutralize, Destroy, at platoon scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same mission state s (model.mjs) as the machine drives it:
//   s.E      share of the enemy platoon's fire that comes back (heads down below 0.5)
//   s.nEff   rounds fired for effect (the enemy's men down come from it)
//   s.t      mission clock; the friendly platoon crosses the open ground in model.window minutes
// The company mortar section is off the map to the rear; its rounds land on the enemy position.
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places every
// soldier and fire stream for a state (build and page); fieldMarks() draws the per-state ground marks.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdPolar, fdSweep, fdBlob, fdFrame } from "../../kit/field.mjs";
import { MODEL, losses, hitShare } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trNest, trWire, trFan, trChalk, trSquad, trPlace, trBound, trRoute, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -240, y: -220, w: 500, d: 480 },
  RISE: { cx: 0, cy: 0, r: 48, steps: 6, h: 1.6, top: 0.54, seed: 5, wobble: 0.07, lean: [-0.3, -0.25] },
  FACE: 58,                 // the enemy position's front, degrees (toward the open ground)
  R_FRONT: 19,              // front arc of fighting positions
  FRONT: [-96, -72, -48, -24, 0, 24, 48, 72, 96], // offsets off the front; 0 is the MG nest
  R_DEPTH: 9,
  DEPTH: [140, 180, 220],   // depth positions, offsets off the front
  ROUTE: [[-12, 118], [30, 96], [70, 66], [106, 38]],
  GAP: 26,                  // trail squad behind the lead squad on the route (units)
  BOUND: 22,                // bound length when the squads bound under fire (units)
  OP: [92, -42],           // the forward observer team's position
  CCP: [[-26, 134], [-22, 140], [-17, 135], [-31, 141], [-18, 146], [-26, 149]],
  MEDIC: [-20, 130],
  // which assault soldiers go down, in order, and which enemy (by id)
  DOWN_F: ["a1-6", "a2-3", "a1-2", "a2-7", "a1-8", "a2-1"],
  DOWN_H: ["e-f2a", "e-f6b", "e-mg", "e-f3a", "e-f5b", "e-d1a", "e-f1b", "e-ag", "e-f7a", "e-f4b"],
};
FG.TERRAIN = {
  rises: [
    FG.RISE,
    { cx: 92, cy: -42, r: 24, steps: 2, h: 1.3, top: 0.45, seed: 21, wobble: 0.1 },
    { cx: -140, cy: -40, r: 34, steps: 4, h: 1.5, top: 0.45, seed: 47, wobble: 0.1 },
    { cx: 30, cy: -150, r: 28, steps: 3, h: 1.6, top: 0.5, seed: 41, wobble: 0.12 },
  ],
};

const FS_RAD = Math.PI / 180;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const fieldTerrain = () => trTerrain(FG.TERRAIN);
export const fieldRoute = () => trRoute(FG.ROUTE);
// Enemy fighting positions: { id, x, y, face, nest }
export function fieldHoles() {
  const G = FG, out = [];
  G.FRONT.forEach((off, i) => { const b = G.FACE + off, [x, y] = fdPolar(0, 0, G.R_FRONT, b); out.push({ id: off === 0 ? "mg" : `f${i}`, x, y, face: b, nest: off === 0 }); });
  G.DEPTH.forEach((off, i) => { const b = G.FACE + off, [x, y] = fdPolar(0, 0, G.R_DEPTH, b); out.push({ id: `d${i}`, x, y, face: G.FACE + off * 0.25 - (off - 180) * 0.6, nest: false }); });
  return out;
}

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[60, 150, 46, 3, 0.6], [190, -80, 40, 5, 0.8], [-60, -150, 46, 7, 0.5], [-150, 70, 40, 9, 0.6]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[176, 116], [232, 128], [226, 188], [168, 170]], 9, "a"],
    [[[62, -64], [118, -60], [114, -106], [56, -112]], 8, "b"],
    [[[-150, 66], [-84, 74], [-92, 112], [-160, 104]], 7, "a"],
    [[[-214, 10], [-150, 20], [-148, 62], [-212, 56]], 8, "b"],
    [[[-128, -94], [-70, -100], [-62, -136], [-122, -132]], 8, "a"],
    [[[70, -150], [130, -146], [128, -186], [66, -190]], 7, "a"],
    [[[10, 160], [70, 150], [80, 200], [16, 210]], 9, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  g(trStream(K, P, [[-280, -96], [-180, -110], [-90, -122], [0, -112], [80, -124], [150, -104], [220, -126], [300, -150]], 3.2, 5));
  g(trRoad(K, P, [[300, 120], [220, 70], [160, 46], [138, 20], [140, -40], [130, -90], [126, -128], [130, -200], [136, -280]], 3.2));

  // the wood the platoon starts in, and copses toward the edges
  const corridor = (x, y) => Math.hypot(x - G.ROUTE[0][0], y - G.ROUTE[0][1]) < 30 || Math.hypot(x - G.CCP[2][0], y - G.CCP[2][1]) < 16;
  const woods = [
    [fdBlob(-50, 150, 42, 31, 0.14, 40, 0.9), 40, 21, corridor],
    [fdBlob(-110, 60, 30, 37, 0.14, 40, 0.8), 18, 27],
    [fdBlob(-118, -170, 44, 32, 0.12, 40, 0.7), 24, 22],
    [fdBlob(170, -40, 26, 33, 0.14, 40, 0.9), 12, 23],
    [fdBlob(-200, 150, 30, 34, 0.12, 40, 1), 14, 24],
    [fdBlob(-10, -190, 22, 36, 0.12, 40, 0.8), 10, 26],
    [fdBlob(-70, -84, 20, 38, 0.14, 40, 0.8), 9, 28],
    [fdBlob(150, 210, 26, 35, 0.12, 40, 0.8), 10, 25],
  ];
  for (const [ring, n, seed, avoid] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => (avoid ? avoid(x, y) : false) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[168, 170], [176, 116], [232, 128]], 51], [[[-84, 74], [-150, 66], [-160, 104]], 52], [[[56, -64], [118, -60]], 53], [[[10, 160], [70, 150]], 55]]) items.push(...trHedge(K, P, pts, { seed }));
  // the farm the platoon is crossing to
  for (const pts of [[[120, 54], [146, 54], [146, 30]], [[120, 54], [120, 46]]]) items.push(...trWall(K, P, pts));
  items.push(trHouse(K, P, 132, 44, 90, 12, 8), trHouse(K, P, 156, 30, 0, 14, 8.5, 4.6, 8.2), trHouse(K, P, -150, 30, 20, 10, 7.5));

  g(trRelief(K, P, T));

  // the enemy platoon's position: fighting positions, the MG nest, wire on the front slope
  for (const h of fieldHoles()) items.push(...(h.nest ? trNest(K, P, h.x, h.y, T.height(h.x, h.y), h.face) : trHole(K, P, h.x, h.y, T.height(h.x, h.y), h.face)));
  const wire = fdSweep(G.FACE - 70, G.FACE + 70, 9).map((a) => fdPolar(0, 0, 36 + 1.5 * Math.cos(a * FS_RAD * 3), a));
  items.push(...trWire(K, P, T, wire));

  // control measure: the platoon's next position, chalk on pegs
  const [ex, ey] = G.ROUTE[G.ROUTE.length - 1];
  const next = trChalk(K, P, T, [[ex - 8, ey - 14], [ex + 12, ey - 14], [ex + 12, ey + 12], [ex - 8, ey + 12]], { closed: true });
  g(next.ground); items.push(...next.items);
  return { ground: ground.join(""), items };
}

// Where every soldier stands and who fires at whom. M carries what the page measures between frames
// (vt: the platoon's speed, units per second; fire: rounds landing now, "eff" | "sus" | "").
export function fieldPose(s, T, M = { vt: 0 }) {
  const G = FG, men = [];
  const add = (m) => { m.z = (T.height(m.x, m.y)) + (m.dz || 0); men.push(m); };
  const down = s.E < 0.5;                       // heads down
  const LS = losses(s);

  // --- enemy rifle platoon in its fighting positions ---
  const roles = ["r", "ar", "r", "gr", "tl", "r"];
  fieldHoles().forEach((h, i) => {
    const F = fdFrame(h.x, h.y, h.face);
    const pair = h.nest ? [["mg", "mg", 1.1], ["ag", "r", -1.1]] : [[`${h.id}a`, roles[i % 6], 1.1], [`${h.id}b`, roles[(i + 3) % 6], -1.1]];
    for (const [id, role, dv] of pair) {
      const [x, y] = F(0, dv);
      add({ id: `e-${id}`, side: "h", role, pose: "hole", face: h.face, x, y, dz: down ? -1.6 : 0, hole: h });
    }
  });
  { const [x, y] = fdPolar(0, 0, 3, G.FACE + 180); add({ id: "e-pl", side: "h", role: "pl", pose: down ? "prone" : "kneel", face: G.FACE, x, y });
    const [x2, y2] = fdPolar(0, 0, 4, G.FACE + 140); add({ id: "e-rto", side: "h", role: "rto", pose: down ? "prone" : "kneel", face: G.FACE, x: x2, y: y2 }); }

  // --- forward observer team on the knoll: observer and his radio operator ---
  const fb = Math.atan2(-G.OP[1], -G.OP[0]) / FS_RAD;
  add({ id: "o-fo", side: "f", role: "pl", pose: "kneel", face: fb, x: G.OP[0] - 1.5, y: G.OP[1] + 1 });
  add({ id: "o-rto", side: "f", role: "rto", pose: "kneel", face: fb, x: G.OP[0] + 1.6, y: G.OP[1] + 3.2 });

  // --- the friendly platoon (two rifle squads, PL and RTO) crossing the open ground ---
  const R = fieldRoute();
  const p = Math.min(1, s.t / MODEL.window);
  const s0 = G.GAP + 2, sp = s0 + (R.length - s0) * p;
  const moving = Math.abs(M.vt) > 0.5 && p < 1;
  const under = moving ? smooth01(0.45, 0.7, s.E) : 0;
  const B = trBound(sp, G.BOUND, under, G.GAP);
  const col = trSquad("column", "wedge");
  const squads = [];
  for (const [n, at] of [[1, B.a], [2, B.b]]) {
    const r = R.at(Math.max(0, Math.min(R.length, at)));
    const overwatch = under > 0.5 && B.moving !== (n === 1 ? "a" : "b");
    const pose = !s.started ? "kneel" : overwatch ? "prone" : p >= 1 ? "kneel" : "stand";
    const st = moving && !overwatch ? strideAt(at + n * 3) : 0;
    squads.push({ n, overwatch });
    trPlace(col, { x: r.x, y: r.y, face: r.face }).forEach((m, i) => add({ id: `a${n}-${i}`, side: "f", lit: true, role: m.role, sq: n, pose, stride: pose === "stand" ? st : 0, face: r.face, x: m.x, y: m.y }));
  }
  {
    const r = R.at(Math.max(0, sp - G.GAP * 0.5)), F = fdFrame(r.x, r.y, r.face);
    const pose = !s.started || p >= 1 ? "kneel" : under > 0.5 ? "kneel" : "stand";
    const st = moving && pose === "stand" ? strideAt(sp) : 0;
    add({ id: "a-pl", side: "f", lit: true, role: "pl", pose, stride: st, face: r.face, x: F(0, 3)[0], y: F(0, 3)[1] });
    add({ id: "a-rto", side: "f", lit: true, role: "rto", pose, stride: st, face: r.face, x: F(-2.6, 4.4)[0], y: F(-2.6, 4.4)[1] });
  }

  // --- men down (notional; the model's counts), greyed and still ---
  const downF = new Set(G.DOWN_F.slice(0, LS.blue)), downH = new Set(G.DOWN_H.slice(0, LS.red));
  const fallen = [];
  for (let i = men.length - 1; i >= 0; i--) {
    const m = men[i];
    if (downF.has(m.id)) men.splice(i, 1);
    else if (downH.has(m.id)) { men.splice(i, 1); fallen.push(m); }
  }
  G.CCP.slice(0, LS.blue).forEach(([x, y], k) => add({ id: `c-f${k}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 40 + 30 * ((k * 7) % 3 - 1), x, y }));
  add({ id: "c-med", side: "f", role: "r", pose: "kneel", stride: 0, face: 230, x: G.MEDIC[0], y: G.MEDIC[1] });
  // an enemy casualty lies just behind his fighting position
  for (const m of fallen) { const F = fdFrame(m.hole ? m.hole.x : m.x, m.hole ? m.hole.y : m.y, m.face); const [x, y] = F(-4.8, m.id.endsWith("b") || m.id === "e-ag" ? -1.6 : 1.6); add({ id: `c-${m.id}`, side: "hc", role: "r", pose: "prone", stride: 0, face: m.face + 150, x, y }); }

  // --- small-arms fire ---
  const byId = Object.fromEntries(men.map((m) => [m.id, m]));
  const aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z);
  const platoon = men.filter((m) => m.lit);
  const streams = [];
  const live = s.started && p < 1 ? 1 : 0;
  const eFire = live * Math.max(0, (s.E - 0.4) / 0.6);
  if (byId["e-mg"]) streams.push({ id: "e-mg", side: "h", heavy: true, from: muzzle(byId["e-mg"]), to: platoon.map(aim), period: 2.1, burst: 3, gap: 0.1, flight: 0.55, phase: 0.3, on: eFire, scatter: 4 });
  ["e-f1a", "e-f3a", "e-f5a", "e-f7a", "e-f6b"].forEach((id, i) => byId[id] && streams.push({ id, side: "h", from: muzzle(byId[id]), to: platoon.map(aim), period: 2.7 + i * 0.31, burst: 1, gap: 0, flight: 0.5, phase: i * 0.63, on: eFire * 0.8, scatter: 4 }));
  // the overwatching squad's automatic riflemen and team leaders fire back while the other bounds
  const enemyAims = men.filter((m) => m.side === "h").map(aim);
  for (const sq of squads) if (sq.overwatch) men.filter((m) => m.sq === sq.n && (m.role === "ar" || m.role === "tl")).forEach((m, i) =>
    streams.push({ id: m.id, side: "f", heavy: m.role === "ar", from: muzzle(m), to: enemyAims, period: m.role === "ar" ? 1.9 : 2.7, burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.5, phase: sq.n * 0.9 + i * 0.53, on: 1, scatter: 3 }));
  return { men, streams, p, LS, down };
}

// Per-state ground marks: the enemy MG's sector over the open ground, fading as its fire dies away.
export function fieldMarks(K, P, T, s) {
  const G = FG, mg = fieldHoles().find((h) => h.nest);
  return trFan(K, P, T, mg.x, mg.y, 8, 120, G.FACE - 26, G.FACE + 26, { side: "h", arcs: 2, alpha: 0.15 + 0.65 * Math.max(0, Math.min(1, s.E)) });
}

// Where mortar round k lands: scattered over the enemy position (deterministic in k).
export function burstAt(k) {
  const h1 = Math.sin(k * 12.9898 + 4.1) * 43758.5453, h2 = Math.sin(k * 78.233 + 1.7) * 24634.6345;
  const u = h1 - Math.floor(h1), v = h2 - Math.floor(h2);
  const r = 26 * Math.sqrt(u), b = FG.FACE + (v - 0.5) * 300;
  return fdPolar(0, 0, r, b);
}
