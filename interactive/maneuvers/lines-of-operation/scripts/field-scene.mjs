// The Battlefield view of Lines of Operation and Effort, at operational scale, drawn with the terrain
// kit (../../kit/terrain.mjs). The same model state as the bench drives it: campaign time S.t and the
// stall control S.stalled (and S.es, the end state's eased rise).
//   Lines of operation: two battalion columns (one vehicle per company) leave the base on two roads
//     and fight through their decisive points (bridges, a village, a hill, a pass) to the town, the
//     objective. Each pause of a carriage at a gate on the bench is a fight for that point here.
//   Lines of effort: civil-military work in five villages on the district road behind the front.
//     Each task on a bar is that line's work in the next village: LOE 1 an aid convoy that leaves
//     supplies, LOE 2 a patrol that sets a checkpoint, LOE 3 a training team that posts local police.
//   All three roads end at the town, where the lit end-state flag goes up only when every line is in.
// Layout is written in screen-aligned ground coordinates (X to the right on the card, D down it) and
// turned into world coordinates by LW(); the camera's azimuth is FA.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trFan, trChalk, trRoute, trPrism } from "../../kit/terrain.mjs";
import { MODEL, LOSSES, state, fightShare } from "./model.mjs";

const FA = 60;
const LO_RAD = Math.PI / 180;
const LO_SA = Math.sin(FA * LO_RAD), LO_CA = Math.cos(FA * LO_RAD);
// screen-aligned ground (X right, D down the card) to world
export const LW = (X, D) => [X * LO_SA + D * LO_CA, -X * LO_CA + D * LO_SA];
const LWs = (pts) => pts.map(([X, D]) => LW(X, D));
// world facing for a direction on the card
const loFace = (dX, dD) => { const [x, y] = LW(dX, dD); return Math.atan2(y, x) / LO_RAD; };
const FACE_E = loFace(1, 0), FACE_W = loFace(-1, 0);

export const FG = {
  FA,
  world: { X: [-330, 330], D: [-300, 300] },
  FOB: [-196, 4],                       // the base all three lines start from (X, D)
  TOWN: [166, 6],                       // the objective town and the end state
  FLAG: [168, 4],
  // roads (X, D); each runs in from off the map on the left (the rear)
  ROAD_A: [[-340, 52], [-250, 46], [-200, 40], [-172, 66], [-146, 100], [-110, 112], [-60, 116], [0, 112], [50, 116], [96, 110], [132, 84], [152, 52], [160, 34]],
  ROAD_B: [[-340, 14], [-250, 12], [-196, 12], [-150, 15], [-110, 14], [-50, 16], [40, 14], [100, 10], [140, 8]],
  ROAD_C: [[-340, -22], [-250, -14], [-200, -10], [-178, -44], [-150, -84], [-110, -96], [-70, -100], [-15, -104], [40, -100], [92, -102], [132, -88], [154, -56], [160, -22]],
  GATE: -196,                           // X where each line leaves the base
  // decisive points (X, D) on each line, with the enemy's two positions there
  DP: {
    "loo-a": [{ at: [-110, 112], kind: "bridge", foes: [[-92, 100], [-90, 124]] },
              { at: [0, 112], kind: "village", foes: [[10, 103], [12, 122]] },
              { at: [96, 150], kind: "hill", road: [96, 110], foes: [[90, 146], [104, 154]] }],
    "loo-b": [{ at: [-110, 14], kind: "bridge", foes: [[-92, 4], [-91, 25]] },
              { at: [40, 14], kind: "pass", foes: [[38, -24], [40, 56]] }],
  },
  STANDOFF: 30,                         // how far short of a point a column halts to fight for it
  GAP: 12,                              // vehicle spacing in a march column
  COL: 6,                               // vehicles per column (one per company of two battalions)
  LOST: { "loo-a": [1, 1], "loo-b": [1, 2] }, // [decisive point, column member] of the vehicle each line loses
  VILLAGES: [[-70, -100], [-15, -104], [40, -100], [92, -102], [132, -88]],
  STREAM: [[-122, -330], [-112, -150], [-110, -96], [-104, -40], [-110, 14], [-116, 62], [-110, 112], [-102, 170], [-110, 330]],
  RAID: [76, -146],                    // where the insurgent cell lies up when line of effort 3 stalls
  EVAC_PERIOD: 14,                      // seconds for an ambulance's round trip
};
FG.TERRAIN = {
  rises: [
    { ...((([x, y]) => ({ cx: x, cy: y }))(LW(96, 152))), r: 30, steps: 3, h: 2.2, top: 0.5, seed: 7, wobble: 0.06, squash: 1.3 },
    { ...((([x, y]) => ({ cx: x, cy: y }))(LW(38, -26))), r: 22, steps: 3, h: 2.0, top: 0.5, seed: 11, wobble: 0.06 },
    { ...((([x, y]) => ({ cx: x, cy: y }))(LW(40, 56))), r: 22, steps: 3, h: 2.0, top: 0.5, seed: 13, wobble: 0.06 },
    { ...((([x, y]) => ({ cx: x, cy: y }))(LW(-220, -150))), r: 34, steps: 3, h: 1.8, top: 0.45, seed: 17, wobble: 0.1 },
    { ...((([x, y]) => ({ cx: x, cy: y }))(LW(240, 170))), r: 34, steps: 2, h: 1.8, top: 0.45, seed: 19, wobble: 0.1 },
    { ...((([x, y]) => ({ cx: x, cy: y }))(LW(-30, 200))), r: 28, steps: 2, h: 1.6, top: 0.45, seed: 23, wobble: 0.1 },
  ],
};

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth01 = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const angLerp = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const boxRing = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- routes (built once, shared by build and page) ----------
let LO_R = null;
function routes() {
  if (LO_R) return LO_R;
  const G = FG;
  const nearestS = (route, [x, y]) => { let bs = 0, bd = 1e9; for (let s = 0; s <= route.length; s += 0.5) { const p = route.at(s), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; bs = s; } } return bs; };
  const mk = (pts) => trRoute(LWs(pts), 6);
  const R = { A: mk(G.ROAD_A), B: mk(G.ROAD_B), C: mk(G.ROAD_C) };
  const gateOf = (route, D) => nearestS(route, LW(G.GATE, D));
  R.loo = {};
  for (const [id, route, D0] of [["loo-a", R.A, 40], ["loo-b", R.B, 12]]) {
    const line = MODEL.lines.find((l) => l.id === id);
    const dps = G.DP[id].map((d) => nearestS(route, LW(...(d.road || d.at))));
    // the p -> road distance knots: the gate, a stand-off short of each point, the end of the road
    const sk = [gateOf(route, D0), ...dps.map((s) => s - G.STANDOFF), route.length];
    const pk = [0, ...line.dps, 1];
    R.loo[id] = { route, line, dps, sk, pk };
  }
  R.gateC = gateOf(R.C, -10);
  R.vill = G.VILLAGES.map((v) => nearestS(R.C, LW(...v)));
  LO_R = R;
  return R;
}
// road distance of a line of operation's lead vehicle for its progress p
function looS(L, p) {
  for (let i = 1; i < L.pk.length; i++) if (p <= L.pk[i]) return L.sk[i - 1] + (L.sk[i] - L.sk[i - 1]) * ((p - L.pk[i - 1]) / (L.pk[i] - L.pk[i - 1]));
  return L.sk[L.sk.length - 1];
}

// ---------- small figures and props ----------

// A supply truck at the origin facing `face` (as in Figs 3 and 8): cab, cargo box, chassis.
export function loTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const ring = boxRing(F, u0, u1, v0, v1);
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, ring, z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(boxRing(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

// A villager at the origin: legs, a long coat and a head, no weapon. Same size as the soldiers.
export function loCivilian(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const oct = (r, n = 8) => Array.from({ length: n }, (_, i) => F(r * Math.cos((i + 0.5) * 2 * Math.PI / n), r * Math.sin((i + 0.5) * 2 * Math.PI / n)));
  return `<path class="tr-shadow" d="${K.onTop(oct(1.2, 10), 0, P0, true)}"/>` +
    trPrism(K, P0, boxRing(F, -0.34, 0.34, -0.5, 0.5), 0, 1.6) +
    trPrism(K, P0, boxRing(F, -0.5, 0.5, -0.8, 0.8), 1.5, 4.9) +
    trPrism(K, P0, oct(0.62), 4.9, 5.9);
}

// A stack of aid crates at the origin.
export function loCrates(K, P) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, FACE_E);
  return `<g class="tr-p tr-bag">${trPrism(K, P0, boxRing(F, -2.6, 0, -1.4, 1.2), 0, 1.6)}${trPrism(K, P0, boxRing(F, 0.3, 2.6, -1.2, 1.4), 0, 1.6)}${trPrism(K, P0, boxRing(F, -1.4, 1.2, -1, 1), 1.6, 3)}</g>`;
}

// A checkpoint barrier at the origin across a road running along `face`: two posts and a pole.
export function loBarrier(K, P, face) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const post = (v) => trPrism(K, P0, boxRing(F, -0.5, 0.5, v - 0.5, v + 0.5), 0, 2.6);
  const pole = trPrism(K, P0, boxRing(F, -0.25, 0.25, -5, 5), 2.1, 2.6);
  const parts = [[K.depthOf([...F(0, 5), 0], P0), post(5)], [K.depthOf([...F(0, -5), 0], P0), post(-5)]].sort((a, b) => a[0] - b[0]);
  return `<g class="tr-p tr-bag">${parts[0][1]}${pole}${parts[1][1]}</g>`;
}

// The end-state flag: a mast on a plinth in the town square, the flag raised by `h` (0..1).
// The one lit part of the field.
export function loFlag(K, P, h) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, FACE_E);
  const z = 1.2 + 15.5 * h;
  return `<path class="tr-shadow" d="${K.onTop(boxRing(F, -2.6, 2.6, -2.6, 2.6), 0, P0, true)}"/>` +
    K.solidSvg(K.slabOf({ x: -2.2, y: -2.2, w: 4.4, d: 4.4, r: 0.4 }, 0, 1.2, P0, 2, 0.2), { tone: "lo" }) +
    K.solidSvg(K.cylinder(0, 0, 0.5, 1.2, 21, P0, 10), { tone: "mid", crease: "none" }) +
    K.solidSvg(K.cylinder(0, 0, 0.8, 22.2, 0.7, P0, 10), { tone: "mid", crease: "none" }) +
    K.solidSvg(K.extrude(boxRing(F, 0.55, 9.5, -0.2, 0.2), z, 5.5, P0), { tone: "hi", lit: true, crease: "none" });
}

// A vehicle fighting position (as in Fig 3): a dark scrape and an earth berm with short side arms.
function scrape(K, P, x, y, z, face) {
  const F = fdFrame(x, y, face);
  const key0 = K.depthOf([x, y, 0], P);
  const pit = `<path class="tr-pit" d="${K.onTop(boxRing(F, -5.2, 4.6, -3.2, 3.2), z + 0.03, P, true)}"/>`;
  const banks = [[4.8, 6.4, -4.2, 4.2], [-2.6, 4.8, 3.4, 4.6], [-2.6, 4.8, -4.6, -3.4]].map(([u0, u1, v0, v1]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return { near: K.depthOf([c[0], c[1], 0], P) > key0, svg: trPrism(K, P, boxRing(F, u0, u1, v0, v1), z, z + 1.3) };
  });
  const wrap = (list) => (list.length ? `<g class="tr-p tr-bag">${list.map((b) => b.svg).join("")}</g>` : "");
  return [{ key: key0 - 6, svg: pit + wrap(banks.filter((b) => !b.near)) }, { key: key0 + 6, svg: wrap(banks.filter((b) => b.near)) }];
}

// A road bridge over the stream at road distance s: deck on two piers with low kerbs.
function bridge(K, P, route, s) {
  const a = route.at(s - 8), b = route.at(s + 8);
  const ang = Math.atan2(b.y - a.y, b.x - a.x) / LO_RAD;
  const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
  const F = fdFrame(mid[0], mid[1], ang);
  const L = Math.hypot(b.x - a.x, b.y - a.y) / 2;
  const svg = [-3.5, 3.5].map((u) => K.solidSvg(K.extrude(boxRing(F, u - 0.9, u + 0.9, -3.2, 3.2), 0, 0.9, P), { tone: "lo", crease: "none" })).join("") +
    K.solidSvg(K.extrude(boxRing(F, -L, L, -3.8, 3.8), 0.9, 0.7, P), { tone: "mid", className: "tr-wall" }) +
    [-1, 1].map((sv) => K.solidSvg(K.extrude(boxRing(F, -L, L, sv * 3.8 - 0.35, sv * 3.8 + 0.35), 1.6, 0.8, P), { tone: "mid", crease: "none", className: "tr-wall" })).join("");
  return { key: K.depthOf([mid[0], mid[1], 0], P), svg };
}

// Where the village props sit: aid spot, checkpoint (on the road at the village's east end), police post.
function villageSlots(R, k) {
  const s = R.vill[k];
  const p = R.C.at(s), q = R.C.at(s + 14);
  const F = fdFrame(p.x, p.y, p.face);
  return {
    aid: F(2, -9), civ: F(-6, -10), civAid: F(3, -13),
    bar: [q.x, q.y], barFace: q.face, guard: fdFrame(q.x, q.y, q.face)(1.5, 6.5),
    police: F(-13, 6.5), policeFace: p.face - 90,
  };
}

// ---------- the ground and everything that never moves ----------
export function fieldStatic(K, P, T) {
  const G = FG, R = routes();
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const [X0, X1] = G.world.X, [D0, D1] = G.world.D;
  const c = [LW(X0, D0), LW(X1, D0), LW(X1, D1), LW(X0, D1)];
  const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]);
  g(trGroundPlane(K, P, { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), d: Math.max(...ys) - Math.min(...ys) }));

  // meadows and fields, mostly toward the edges and round the villages
  for (const [X, D, r, seed, sq] of [[-40, 64, 44, 3, 0.5], [60, -50, 36, 5, 0.6], [-200, 120, 50, 7, 0.7], [220, -80, 50, 9, 0.7], [-60, -170, 50, 11, 0.5], [120, 200, 50, 13, 0.6]]) g(trPatch(K, P, fdBlob(...LW(X, D), r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-90, -128], [-40, -132], [-38, -116], [-88, -114]], 6, "a"],
    [[[-5, -136], [50, -132], [48, -116], [-4, -120]], 6, "b"],
    [[[60, -134], [100, -134], [96, -120], [62, -118]], 5, "a"],
    [[[-60, 34], [-12, 34], [-14, 58], [-62, 60]], 7, "b"],
    [[[-50, 136], [0, 134], [2, 162], [-48, 166]], 7, "a"],
    [[[10, 132], [56, 130], [58, 150], [12, 154]], 6, "b"],
    [[[-250, 70], [-200, 76], [-206, 110], [-256, 104]], 7, "a"],
    [[[-260, -60], [-210, -56], [-214, -30], [-262, -34]], 6, "b"],
    [[[190, 40], [240, 44], [236, 80], [188, 76]], 7, "b"],
    [[[200, -40], [250, -36], [246, -4], [198, -8]], 6, "a"],
    [[[120, -150], [170, -146], [168, -122], [118, -126]], 6, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, LWs(ring), { furrows: n, tint }));

  // the stream across all three roads, then the roads
  g(trStream(K, P, LWs(G.STREAM), 4.6, 5));
  g(trRoad(K, P, R.A.line, 3.2, { smooth: 0 }));
  g(trRoad(K, P, R.B.line, 3.2, { smooth: 0 }));
  g(trRoad(K, P, R.C.line, 2.6, { smooth: 0 }));
  g(trRoad(K, P, LWs([[160, 34], [176, 60], [200, 120], [220, 330]]), 2.4, { ruts: false }));
  g(trRoad(K, P, LWs([[160, -22], [190, -60], [240, -160], [270, -330]]), 2.4, { ruts: false }));

  // woods toward the edges, kept off the roads, the stream and the rises
  const lines = [R.A.line, R.B.line, R.C.line];
  const nearRoad = (x, y, d) => lines.some((l) => l.some((p) => Math.hypot(p[0] - x, p[1] - y) < d));
  const stream = LWs(G.STREAM);
  const nearStream = (x, y) => stream.some((p, i) => i && Math.hypot((p[0] + stream[i - 1][0]) / 2 - x, (p[1] + stream[i - 1][1]) / 2 - y) < 14);
  const town = LW(...G.TOWN), fob = LW(...G.FOB);
  const busy = (x, y) => nearRoad(x, y, 15) || nearStream(x, y) || Math.hypot(x - town[0], y - town[1]) < 44 || Math.hypot(x - fob[0], y - fob[1]) < 36 ||
    G.VILLAGES.some((v) => { const w = LW(...v); return Math.hypot(x - w[0], y - w[1]) < 24; });
  const woods = [
    [-170, -150, 46, 21, 0.6, 30], [40, -180, 50, 22, 0.5, 30], [150, -190, 40, 23, 0.6, 18], [-60, 66, 26, 24, 0.7, 10],
    [-180, 180, 50, 25, 0.6, 24], [80, 210, 46, 26, 0.6, 18], [240, 100, 40, 27, 0.8, 16], [-280, 20, 40, 28, 0.8, 16],
    [100, 50, 22, 29, 0.8, 7], [-60, -40, 26, 30, 0.6, 10], [260, -120, 40, 31, 0.8, 14],
  ];
  for (const [X, D, r, seed, sq, n] of woods) {
    const ring = fdBlob(...LW(X, D), r, seed, 0.12, 40, sq);
    const trees = trScatter(ring, n, { seed, gap: 6.4, r: [3, 4.6], h: [8, 12.5], avoid: (x, y) => busy(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  // hedgerows along some village fields
  for (const [pts, seed] of [[[[-90, -128], [-40, -132]], 51], [[[-5, -136], [50, -132]], 52], [[[-50, 136], [0, 134]], 53], [[[-250, 70], [-200, 76]], 54], [[[190, 40], [240, 44]], 55]]) items.push(...trHedge(K, P, LWs(pts), { seed }));

  // the five villages: three houses each, set back from the district road
  const H = (X, D, ang, len, wid) => { const [x, y] = LW(X, D); return trHouse(K, P, x, y, ang, len, wid); };
  G.VILLAGES.forEach(([X, D], k) => {
    const a = FACE_E + (k % 2 ? 8 : -6);
    items.push(H(X - 8, D - 14, a, 9, 6.5), H(X + 10, D - 16, a + 90, 8, 6), H(X - 2, D + 12, a, 9, 6.5));
  });
  // the village at decisive point A2, the hamlet on road B, farms
  items.push(H(-12, 100, FACE_E, 9, 6.5), H(-6, 126, FACE_E + 90, 8, 6), H(20, 94, FACE_E, 8, 6), H(26, 130, FACE_E, 9, 6.5));
  items.push(H(100, -2, FACE_E, 9, 6.5), H(-240, 92, FACE_E, 9, 6.5), H(210, 60, FACE_E + 90, 9, 6.5), H(214, -20, FACE_E, 9, 6.5));
  // the town: the objective and the end state, a square of houses round the flag
  const [TX, TD] = G.TOWN;
  for (const [dX, dD, rot, len, wid] of [[-14, -20, 0, 10, 7], [6, -24, 90, 9, 7], [22, -12, 0, 10, 7], [-20, 2, 90, 9, 6.5], [24, 10, 90, 10, 7], [-10, 22, 0, 10, 7], [12, 26, 0, 9, 6.5], [32, -4, 0, 8, 6]]) items.push(H(TX + dX, TD + dD, FACE_E + rot, len, wid));

  // the base: a walled compound with two buildings
  const [FX, FD] = G.FOB;
  const wall = LWs([[FX - 22, FD - 18], [FX + 18, FD - 18], [FX + 18, FD - 6], [FX + 18, FD + 6], [FX + 18, FD + 26], [FX - 22, FD + 26], [FX - 22, FD - 18]]);
  items.push(...trWall(K, P, wall.slice(0, 3)), ...trWall(K, P, wall.slice(3)));
  items.push(H(FX - 10, FD - 6, FACE_E, 12, 7), H(FX - 8, FD + 14, FACE_E, 12, 7));

  // bridges where the roads cross the stream
  const cross = (route) => { const st = LWs(G.STREAM); let bs = 0, bd = 1e9; for (let s = 0; s <= route.length; s += 0.5) { const p = route.at(s); for (let i = 1; i < st.length; i++) { const d = Math.hypot(p.x - (st[i][0] + st[i - 1][0]) / 2, p.y - (st[i][1] + st[i - 1][1]) / 2); if (d < bd) { bd = d; bs = s; } } } return bs; };
  for (const route of [R.A, R.B, R.C]) items.push(bridge(K, P, route, cross(route)));

  g(trRelief(K, P, T));

  // the enemy's positions at the decisive points
  for (const id of ["loo-a", "loo-b"]) for (const d of G.DP[id]) for (const f of d.foes) { const [x, y] = LW(...f); items.push(...scrape(K, P, x, y, T.height(x, y), FACE_W)); }

  // control measure: a chalk outline round the objective town
  const ring = [[-34, -36], [12, -42], [46, -18], [44, 24], [16, 44], [-30, 36], [-42, 0]].map(([dX, dD]) => LW(TX + dX, TD + dD));
  const obj = trChalk(K, P, T, ring, { closed: true });
  g(obj.ground); items.push(...obj.items);

  return { ground: ground.join(""), items };
}

// ---------- the moving picture for a model state ----------
// M carries what the page measures between frames: t (seconds, for the ambulances' shuttles).
export function fieldPose(S, GEO, T, M = { t: 0 }) {
  const G = FG, R = routes();
  const st = state(S.t, S.stalled);
  const units = [];
  const add = (u) => { u.z = T.height(u.x, u.y); units.push(u); };
  const smoke = [];
  const streams = [];
  const gunAt = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(4.2, 0), u.z + 3.1]; };
  const aim = (u) => [u.x, u.y, u.z + 1.8];
  const fights = {};

  // --- lines of operation: a column per road, fighting through its decisive points ---
  ["loo-a", "loo-b"].forEach((id, li) => {
    const L = R.loo[id], line = L.line, p = st.p[li];
    const sLead = looS(L, p);
    const fs = G.DP[id].map((d, k) => fightShare(line, k, S.t));
    fights[id] = fs;
    const [lostK, lostJ] = G.LOST[id];
    const lost = fs[lostK] > 0.6;
    // which point is being fought for now (the lead halts short of it and deploys)
    const kNow = fs.findIndex((f) => f > 0 && f < 1);
    const deploy = kNow < 0 ? 0 : smooth01(0, 0.15, fs[kNow]) * (1 - smooth01(0.85, 1, fs[kNow]));
    const deployAt = (k, rank) => {
      const s = L.dps[k] - G.STANDOFF, a = L.route.at(s);
      const dp = LW(...G.DP[id][k].at);
      const face = Math.atan2(dp[1] - a.y, dp[0] - a.x) / LO_RAD;
      const F = fdFrame(a.x, a.y, face);
      const [x, y] = F(rank === 1 ? 0 : -4, (rank - 1) * 13);
      return { x, y, face };
    };
    let rank = 0;
    for (let j = 0; j < G.COL; j++) {
      if (lost && j === lostJ) {
        const w = deployAt(lostK, Math.min(j, 2));
        add({ id: `${id}-${j}`, kind: "v", side: "fx", face: w.face + 25, x: w.x, y: w.y });
        smoke.push([w.x, w.y]);
        continue;
      }
      // march intervals are a little uneven, and vehicles drift off the crown of the road
      const sj = sLead - rank * G.GAP - (rank ? 1.6 * Math.sin(j * 2.3 + li) : 0);
      const a = L.route.at(sj), Fa = fdFrame(a.x, a.y, a.face);
      let [x, y] = Fa(0, 0.7 * Math.sin(j * 1.7 + li * 2)), face = a.face + 4 * Math.sin(j * 1.3 + li);
      if (kNow >= 0 && rank < 3 && deploy > 0) {
        const w = deployAt(kNow, rank);
        [x, y] = lerp2([x, y], [w.x, w.y], deploy);
        face = angLerp(face, w.face, deploy);
      }
      add({ id: `${id}-${j}`, kind: "v", side: "f", face, x, y, rank, li });
      rank++;
    }
    // the enemy at each point: two vehicles; the first is knocked out halfway through the fight, the second near its end
    G.DP[id].forEach((d, k) => {
      d.foes.forEach((f, n) => {
        const [x, y] = LW(...f);
        const down = fs[k] > (n ? 0.85 : 0.45);
        add({ id: `${id}-e${k}${n}`, kind: "v", side: down ? "hx" : "h", face: FACE_W + (down ? 30 : 0), x, y, dp: k, line: id });
        if (down) smoke.push([x, y]);
      });
    });
    // fire while the fight lasts
    if (kNow >= 0) {
      const on = smooth01(0, 0.1, fs[kNow]) * (1 - smooth01(0.9, 1, fs[kNow]));
      const reds = units.filter((u) => u.line === id && u.dp === kNow && u.side === "h");
      const blues = units.filter((u) => u.li === li && u.side === "f" && u.rank < 3);
      if (reds.length && on > 0.02) {
        blues.forEach((u, j) => streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: reds.map(aim), period: 1.5 + j * 0.27, burst: 1, gap: 0, flight: 0.45, phase: li * 0.37 + j * 0.41, on, scatter: 3 }));
        reds.forEach((e, n) => streams.push({ id: e.id, side: "h", heavy: true, from: gunAt(e), to: blues.map(aim), period: 1.4 + n * 0.3, burst: 2, gap: 0.16, flight: 0.45, phase: 0.2 + li * 0.29 + n * 0.5, on: 0.9 * on, scatter: 3 }));
      }
    }
    // casualty evacuation: once the line has lost a vehicle, an ambulance shuttles from there back to the base
    if (lost) {
      const s1 = L.dps[lostK] - G.STANDOFF - 8, s0 = L.sk[0];
      const ph = ((((M.t ?? 0) / G.EVAC_PERIOD) + li * 0.43) % 1 + 1) % 1, back = ph < 0.5;
      const u = back ? 1 - smooth01(0, 1, ph / 0.5) : smooth01(0, 1, (ph - 0.5) / 0.5);
      const a = L.route.at(s0 + (s1 - s0) * u), F = fdFrame(a.x, a.y, a.face), [x, y] = F(0, back ? 2.2 : -2.2);
      add({ id: `${id}-amb`, kind: "t", side: "f", face: a.face + (back ? 180 : 0), x, y });
    }
  });

  // --- lines of effort: work in the villages on the district road ---
  // Each line's team travels to the next village between tasks and does the task there; a task shows
  // as done once the bar's slider is past halfway to its detent.
  const loes = MODEL.lines.filter((l) => l.kind === "loe");
  const done = loes.map((l, i) => Math.floor(st.p[2 + i] * l.tasks.length + 0.5));
  const teamS = (line, stalled) => {
    const n = line.tasks.length, limit = stalled && MODEL.stall.id === line.id ? MODEL.stall.after : n;
    let s = R.gateC, moving = false;
    for (let k = 0; k < limit; k++) {
      const t0 = k ? line.tasks[k - 1] : 0, t1 = line.tasks[k] - MODEL.move;
      const from = k ? R.vill[k - 1] : R.gateC;
      if (S.t <= t0) break;
      const f = smooth01(0, 1, (S.t - t0) / (t1 - t0));
      s = from + (R.vill[k] - from) * f;
      moving = f > 0 && f < 1;
      if (f < 1) break;
    }
    return { s, moving };
  };
  const strideAt = (d) => [1, 0, 2, 0][Math.floor(Math.abs(d) / 1.7) % 4];
  const slots = G.VILLAGES.map((v, k) => villageSlots(R, k));
  // LOE 1: an aid convoy of two trucks
  {
    const tm = teamS(loes[0], S.stalled);
    [0, 1].forEach((j) => {
      const a = R.C.at(tm.s - j * 10), F = fdFrame(a.x, a.y, a.face), [x, y] = F(0, -2.2);
      add({ id: `aid${j}`, kind: "t", side: "f", face: a.face, x, y });
    });
  }
  // LOE 2: a patrol of four in file, which sets each checkpoint
  {
    const tm = teamS(loes[1], S.stalled);
    for (let j = 0; j < 4; j++) {
      const sj = tm.s - 8 - j * 4.2, a = R.C.at(sj), F = fdFrame(a.x, a.y, a.face), [x, y] = F(0, 4.6);
      add({ id: `pat${j}`, kind: "m", side: "f", role: ["tl", "ar", "gr", "r"][j], pose: "stand", stride: tm.moving ? strideAt(sj) : 0, face: a.face, x, y });
    }
  }
  // LOE 3: a training team (one soldier, two police trainees) that posts police in each village
  {
    const tm = teamS(loes[2], S.stalled);
    for (let j = 0; j < 3; j++) {
      const sj = tm.s - 22 - j * 4.4, a = R.C.at(sj), F = fdFrame(a.x, a.y, a.face), [x, y] = F(0, -5.2);
      add({ id: `trn${j}`, kind: "m", side: j ? "p" : "f", role: j ? "r" : "sl", pose: "stand", stride: tm.moving ? strideAt(sj + j) : 0, face: a.face, x, y });
    }
  }
  // the villages: a villager in each, the aid, the checkpoints and the police posts that are done
  const raid = S.stalled && S.t >= LOSSES.raids[0][0];
  slots.forEach((sl, k) => {
    const aid = done[0] > k;
    const [cx, cy] = aid ? sl.civAid : sl.civ;
    add({ id: `civ${k}`, kind: "c", side: "c", face: aid ? sl.barFace - 120 : sl.barFace + 90, x: cx, y: cy });
    if (aid) add({ id: `crate${k}`, kind: "crate", side: "c", face: 0, x: sl.aid[0], y: sl.aid[1] });
    if (done[1] > k) {
      add({ id: `bar${k}`, kind: "bar", side: "c", face: sl.barFace, x: sl.bar[0], y: sl.bar[1] });
      // with line of effort 3 stalled, the raids put down the checkpoint guards in villages 4 and 5
      const hit = raid && ((k === 3 && S.t >= LOSSES.raids[0][0]) || (k === 4 && S.t >= LOSSES.raids[2][0]));
      add({ id: `grd${k}`, kind: "m", side: hit ? "fc" : "f", role: "r", pose: hit ? "prone" : "stand", stride: 0, face: hit ? sl.barFace + 60 : sl.barFace - 90, x: sl.guard[0], y: sl.guard[1] });
    }
    if (done[2] > k) add({ id: `pol${k}`, kind: "m", side: "p", role: "r", pose: "stand", stride: 0, face: sl.policeFace, x: sl.police[0], y: sl.police[1] });
  });
  // a medic beside the first guard hit
  if (raid && done[1] > 3) { const g4 = slots[3].guard, F = fdFrame(g4[0], g4[1], slots[3].barFace); const [x, y] = F(-3, 2.4); add({ id: "medic", kind: "m", side: "f", role: "r", pose: "kneel", stride: 0, face: slots[3].barFace + 30, x, y }); }
  // the insurgent cell at the wood's edge above village 4 (only while line of effort 3 is stalled)
  if (raid) {
    const base = G.RAID;
    [[0, 0], [-7, 3], [7, 2]].forEach(([dX, dD], n) => {
      const [x, y] = LW(base[0] + dX, base[1] + dD);
      const down = (n === 1 && S.t >= LOSSES.raids[1][0]) || (n === 2 && S.t >= LOSSES.raids[2][0]);
      const tgt = LW(...G.VILLAGES[3]);
      add({ id: `ins${n}`, kind: "m", side: down ? "hc" : "h", role: n ? "r" : "ar", pose: "prone", stride: 0, face: Math.atan2(tgt[1] - y, tgt[0] - x) / LO_RAD + (down ? 40 : 0), x, y });
    });
    const shooters = units.filter((u) => u.id.startsWith("ins") && u.side === "h");
    const targets = units.filter((u) => (u.id === "grd3" || u.id === "grd4" || u.id.startsWith("pat")) && u.side === "f");
    if (targets.length) shooters.forEach((u, n) => { const F = fdFrame(u.x, u.y, u.face); streams.push({ id: u.id, side: "h", heavy: u.role === "ar", from: [...F(n ? 3.9 : 4.6, -0.34), u.z + 0.8], to: targets.map(aim), period: 2.4 + n * 0.5, burst: u.role === "ar" ? 3 : 1, gap: 0.12, flight: 0.5, phase: n * 0.7, on: 0.7, scatter: 3 }); });
    const ins = units.filter((u) => u.id.startsWith("ins") && u.side === "h");
    const guards = units.filter((u) => u.id.startsWith("pat") && u.side === "f").slice(0, 2);
    if (ins.length) guards.forEach((u, n) => { const F = fdFrame(u.x, u.y, u.face); streams.push({ id: u.id, side: "f", heavy: u.role === "ar", from: [...F(2.9, -0.32), u.z + 4.35], to: ins.map(aim), period: 2.1 + n * 0.4, burst: 1, gap: 0, flight: 0.5, phase: 0.4 + n * 0.6, on: 0.8, scatter: 3 }); });
  }

  // --- the end state: the lit flag over the town ---
  const [fx, fy] = LW(...G.FLAG);
  add({ id: "flag", kind: "flag", side: "c", face: 0, x: fx, y: fy, h: S.es ?? (st.end ? 1 : 0) });

  smoke.forEach((pt) => { pt[2] = T.height(pt[0], pt[1]) + 3; });
  return { units, streams, smoke, fights, done };
}

// Thin smoke rising from stopped vehicles: a pure function of time, merged into the fire layer's smoke.
export function fieldSmoke(pose, t) {
  const out = [];
  pose.smoke.forEach(([x, y, z], n) => {
    for (let k = 0; k < 3; k++) {
      const age = (((t / 4.2) + k / 3 + n * 0.13) % 1 + 1) % 1;
      out.push({ p: [x - 2.2 * age * 4.2, y - 3.4 * age * 4.2, z + age * 7], age });
    }
  });
  return out;
}

// Per-state ground marks: each held decisive point's fire sector toward the approaching column,
// fading out as the point falls.
export function fieldMarks(K, P, T, pose) {
  const out = [];
  for (const id of ["loo-a", "loo-b"]) FG.DP[id].forEach((d, k) => {
    const f = pose.fights[id][k];
    const alpha = 0.75 * (1 - smooth01(0.6, 0.9, f));
    if (alpha < 0.02) return;
    const c = d.foes.reduce((s, p) => [s[0] + p[0] / 2, s[1] + p[1] / 2], [0, 0]);
    const [x, y] = LW(c[0] + 2, c[1]);
    out.push(trFan(K, P, T, x, y, 10, 38, FACE_W - 28, FACE_W + 28, { side: "h", arcs: 1, alpha }));
  });
  return out.join("");
}
