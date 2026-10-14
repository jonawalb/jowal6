// The Battlefield view of the OMG, at operational scale, drawn with the terrain kit
// (../../kit/terrain.mjs). One vehicle stands for a battalion and a group of three for a regiment
// (Soviet) or a brigade (NATO). Soviet forces are red, NATO blue; the OMG is lit. The same model
// state as the machine drives it (stateAt in model.mjs, for day t, release day r, reserve on or off):
//   s.wedge   the first-echelon wedges reaching the wall: here two first-echelon divisions closing
//             on the NATO forward defense either side of the road
//   s.gate    the gate dropping: here the breach, as the two NATO battalions astride the road are
//             knocked out and the first echelon pushes in to hold its shoulders
//   s.nose    the shuttle's nose (km): here the head of the OMG's march column on the road east
//   s.hit[i]  the drop targets: here an air-defense site, a command post, a missile launcher and a
//             supply depot in the NATO rear, each raided by a battalion detached from the column
//   s.res     the reserve block on its cross rails: here a NATO reserve of two brigades driving down
//             from the north to the road; it blocks the column or closes the road behind it
//   the siding: the second echelon, parked behind the line, not committed
// Losses (notional) come from lossesAt() in model.mjs; knocked-out vehicles are greyed and smoke.
// Layout is written in screen-aligned coordinates [X right, p toward the viewer] and turned into world
// coordinates by OM_W(), so the axis of advance runs left to right like the bench.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame, fdPoly } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trFan, trRoute, trPrism } from "../../kit/terrain.mjs";
import { MODEL, stateAt, lossesAt } from "./model.mjs";

const OM_A = 55 * Math.PI / 180;   // the camera's azimuth; build.mjs uses the same
const OM_W = ([X, p]) => [X * Math.sin(OM_A) + p * Math.cos(OM_A), -X * Math.cos(OM_A) + p * Math.sin(OM_A)];
const OM_X = (x, y) => x * Math.sin(OM_A) - y * Math.cos(OM_A);         // world to screen-aligned X
const OM_Ws = (pts) => pts.map(OM_W);
const OM_RIGHT = -35, OM_LEFT = 145, OM_UP = 235, OM_DOWN = 55;        // world facings for screen directions
const OM_RAD = Math.PI / 180;
const om_c01 = (x) => Math.min(1, Math.max(0, x));
const om_sm = (a, b, x) => { const t = om_c01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const om_lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const om_ang = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const om_face = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / OM_RAD;
// km along the axis to screen X: the line's front face (0 km) at X = -105, 2.45 units a km (notional)
export const omKmX = (km) => -105 + 2.45 * km;

export const FG = {
  world: { x: -430, y: -430, w: 860, d: 860 },
  // the road east through the breach: the OMG's axis. The route starts where the OMG's head waits (-11 km).
  AXIS: [[-133.6, 0.4], [-118, -1.6], [-97, 0], [-70, 2.6], [-40, 0.6], [-10, -1.4], [14, 0], [44, 2], [64, 0.4], [92, -1.6], [124, 1.4], [160, 0.6], [196, -1], [240, 1], [320, 2]],
  AXIS_W: [[-330, 8], [-240, 6], [-170, 3], [-150, 1.4]],               // the road behind the start, drawn only
  // NATO forward defense: eight battalions on the line, 0-6 km; 3 and 4 sit astride the road (the breach)
  LINE: [[-99, -128], [-92, -92], [-100, -57], [-97, -19], [-97, 19], [-101, 55], [-92, 92], [-99, 126]],
  // first-echelon divisions, four battalions each: start, at the line, holding the breach's shoulders
  ECH: [
    { start: [[-158, -20], [-160, -34], [-158, -48], [-171, -33]], front: [[-114, -16], [-116, -30], [-114, -45], [-127, -31]], hold: [[-86, -10], [-92, -36], null, [-112, -22]], aim: 2 },
    { start: [[-158, 20], [-160, 34], [-158, 48], [-171, 33]], front: [[-114, 16], [-116, 30], [-114, 45], [-127, 31]], hold: [[-86, 10], [-92, 36], null, [-112, 22]], aim: 5 },
  ],
  KO_ECH: 2,                                                             // the battalion in each division stopped short of the line
  SECOND: [[-160, -88], [-150, -94], [-160, -102], [-144, -78], [-134, -84], [-144, -92]],
  // the OMG's assembly area behind the line: twelve battalions in four groups of three
  OMG_AT: [[-133.6, 0.4], [-142, -7], [-142, 8], [-152, -12], [-152, 0], [-152, 12], [-162, -10], [-162, 2], [-162, 14], [-172, -6], [-172, 6], [-180, 0]],
  BMP: [3, 4, 5],                                                        // the battalions drawn as BMPs; the rest are tanks
  GAP: 12, GROUP_GAP: 6,                                                  // march-column spacing (units)
  // the four rear targets, by km as on the bench; p and the pieces at each, offsets in [dX, dp]
  TGT_P: [-27, -31, -25, -29],
  PIECES: [
    [["sam", -6, 1, OM_DOWN], ["sam", 6, -2, OM_DOWN + 30], ["radar", 0, -9, OM_DOWN]],
    [["van", -1, 1, OM_RIGHT], ["van", 9, -2, OM_RIGHT], ["mast", 4, -9, 0]],
    [["tel", 0, 0, OM_RIGHT], ["truck", -10, -4, OM_RIGHT]],
    [["crate", -7, 0, OM_DOWN], ["crate", 3, -5, OM_DOWN], ["crate", -3, -12, OM_DOWN], ["truck", 11, 0, OM_LEFT]],
  ],
  KO_DET: 1,                                                             // the detachment that is hit at its target (free run)
  // the NATO reserve: laager in the north, the lane edge, across the road (the bench's three positions)
  RES_HOME: [[-8, -122], [2, -128], [12, -122], [-6, -140], [4, -146], [14, -140]],
  RES_EDGE: [[-4, -20], [4, -25], [12, -20], [-4, -34], [4, -39], [12, -34]],
  RES_ACROSS: [[1, -15], [2, -4], [1, 7], [11, -11], [12, 0], [11, 11]],
  RES_AWAY: -300,                                                        // p of the laager when there is no large reserve (off the map)
  NORTH: [[6, -330], [4, -220], [2, -150], [6, -90], [4, -40], [4, -2]],
  RIVER_X: (p) => 54 + 6 * Math.sin(p * 0.02) + 3 * Math.sin(p * 0.05 + 1),
  EVAC: [[-114, -45], [-140, -40], [-176, -30]],                         // the Soviet casualty evacuation run
  TRUCK_PERIOD: 14,
};
FG.TERRAIN = {
  rises: [
    { cx: OM_W([-92, -92])[0], cy: OM_W([-92, -92])[1], r: 30, steps: 3, h: 1.9, top: 0.5, seed: 7, wobble: 0.08 },
    { cx: OM_W([-92, 92])[0], cy: OM_W([-92, 92])[1], r: 30, steps: 3, h: 1.9, top: 0.5, seed: 11, wobble: 0.08 },
    { cx: OM_W([110, -120])[0], cy: OM_W([110, -120])[1], r: 26, steps: 2, h: 1.7, top: 0.5, seed: 17, wobble: 0.12 },
    { cx: OM_W([30, 110])[0], cy: OM_W([30, 110])[1], r: 28, steps: 2, h: 1.6, top: 0.5, seed: 27, wobble: 0.12 },
    { cx: OM_W([-176, 120])[0], cy: OM_W([-176, 120])[1], r: 24, steps: 2, h: 1.6, top: 0.5, seed: 37, wobble: 0.12 },
  ],
};

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- routes (shared by build and page; built once) ----------
let OM_R = null;
function omRoutes() {
  if (OM_R) return OM_R;
  const route = trRoute(OM_Ws(FG.AXIS), 6);
  // arc length for each screen X along the road, for mapping the model's km onto it
  const tab = [];
  for (let s = 0; s <= route.length; s += 0.5) { const q = route.at(s); tab.push([s, OM_X(q.x, q.y)]); }
  const sOfX = (X) => {
    if (X <= tab[0][1]) return X - tab[0][1];
    for (let i = 1; i < tab.length; i++) if (tab[i][1] >= X) { const [s0, x0] = tab[i - 1], [s1, x1] = tab[i]; return s0 + (s1 - s0) * (X - x0) / (x1 - x0 || 1); }
    return tab[tab.length - 1][0];
  };
  const evac = trRoute(OM_Ws(FG.EVAC), 6);
  OM_R = { route, sOfX, evac, tgtS: MODEL.targets.map((g) => sOfX(omKmX(g.x))) };
  return OM_R;
}
const omTgtAt = (i) => [omKmX(MODEL.targets[i].x), FG.TGT_P[i]];

// ---------- local drawing helpers ----------
const omBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
const omOct = (F, u, v, r, n = 8) => Array.from({ length: n }, (_, i) => F(u + r * Math.cos((i + 0.5) * 2 * Math.PI / n), v + r * Math.sin((i + 0.5) * 2 * Math.PI / n)));
// A small object at the origin facing `face`, from boxes [u0, u1, v0, v1, z0, z1, gear] and posts
// [u, v, r, z0, z1, gear], depth-sorted, over a ground shadow; `extra` (screen paths) drawn last.
function omParts(K, P, face, boxes, posts = [], shadow = [-4, 4, -1.8, 1.8], extra = "") {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = boxes.map(([u0, u1, v0, v1, z0, z1, gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, omBox(F, u0, u1, v0, v1), z0, z1, !!gear)];
  }).concat(posts.map(([u, v, r, z0, z1, gear]) => {
    const c = F(u, v);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, omOct(F, u, v, r), z0, z1, !!gear)];
  })).sort((a, b) => a[0] - b[0]);
  const sh = shadow ? `<path class="tr-shadow" d="${K.onTop(omBox(F, ...shadow), 0, P0, true)}"/>` : "";
  return sh + parts.map((p) => p[1]).join("") + extra;
}

// A BMP-style infantry fighting vehicle at the origin facing `face`: a low hull with a sloped nose,
// a small turret set forward and a short gun. Same origin and tint convention as trVehicle.
export function omBmp(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const q = (u, v, z) => [...F(u, v), z];
  const parts = [];
  for (const side of [-1, 1]) {
    const c = F(0, side * 1.95);
    parts.push([K.depthOf([c[0], c[1], 0.5], P0), trPrism(K, P0, omBox(F, -4.0, 4.0, side > 0 ? 1.4 : -2.5, side > 0 ? 2.5 : -1.4), 0, 1.05, true)]);
  }
  // hull: flat deck, long sloped glacis to a sharp nose
  const lo = [q(-4.1, -1.95, 0.8), q(4.3, -1.95, 0.8), q(4.3, 1.95, 0.8), q(-4.1, 1.95, 0.8)];
  const hi = [q(-4.1, -1.95, 2.1), q(0.9, -1.95, 2.1), q(0.9, 1.95, 2.1), q(-4.1, 1.95, 2.1)];
  const faces = [lo.slice().reverse(), hi, [lo[0], lo[1], hi[1], hi[0]], [lo[2], lo[3], hi[3], hi[2]], [lo[1], lo[2], hi[2], hi[1]], [lo[3], lo[0], hi[0], hi[3]]];
  parts.push([K.depthOf(q(-0.5, 0, 1.4), P0), fdPoly(K, P0, faces, { tone: "mid", className: "tr-veh" })]);
  const tc = F(-0.2, 0);
  parts.push([K.depthOf([tc[0], tc[1], 2.5], P0), trPrism(K, P0, omOct(F, -0.2, 0, 0.95), 2.1, 2.9)]);
  parts.sort((a, b) => a[0] - b[0]);
  const gun = `<path class="tr-gun" d="${K.pathOf([K.iso(q(0.4, 0, 2.6), P0), K.iso(q(3.0, 0, 2.7), P0)])}"/>`;
  return `<path class="tr-shadow" d="${K.onTop(omBox(F, -4.5, 4.6, -2.8, 2.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("") + gun;
}

// A truck (cargo or ambulance): cab, box body, chassis. About 7 units long.
export const omTruck = (K, P, face) => omParts(K, P, face, [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], [1.8, 3.6, -1.2, 1.2, 0.7, 2.7], [-3.4, 3.4, -1.25, 1.25, 0.25, 0.7, true]]);

// The rear targets' pieces, all at the origin facing `face`.
export function omPiece(K, P, kind, face) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  if (kind === "sam") return omParts(K, P, face, [[-3.2, 3.2, -1.7, 1.7, 0.25, 1.6, true], [-2.6, 2.0, -1.5, 1.5, 1.6, 2.3], [-1.6, 1.6, -1.25, -0.15, 2.3, 3.5], [-1.6, 1.6, 0.15, 1.25, 2.3, 3.5]], [], [-3.8, 3.8, -2.3, 2.3]);
  if (kind === "radar") {
    const tip = K.iso([...F(0, 0), 9.6], P0), base = K.iso([...F(0, 0), 7.8], P0);
    return omParts(K, P, face, [[-2.2, 2.2, -1.6, 1.6, 0, 1.2, true], [-0.35, 0.35, -2.6, 2.6, 5.4, 7.8]], [[0, 0, 0.42, 1.2, 5.4]], [-2.8, 2.8, -2.8, 2.8],
      `<path class="tr-wire" d="${K.pathOf([base, tip])}"/>`);
  }
  if (kind === "van") return omParts(K, P, face, [[-3.6, 2.0, -1.5, 1.5, 0.7, 3.9], [2.1, 3.7, -1.3, 1.3, 0.7, 2.8], [-3.4, 3.4, -1.3, 1.3, 0.25, 0.7, true]]);
  if (kind === "mast") {
    const tip = K.iso([...F(0, 0), 14], P0), base = K.iso([...F(0, 0), 1.0], P0);
    const g1 = K.iso([...F(-2.6, 0), 0.1], P0), g2 = K.iso([...F(2.6, 0), 0.1], P0), top1 = K.iso([...F(0, 0), 8], P0);
    return omParts(K, P, face, [[-0.9, 0.9, -0.9, 0.9, 0, 1.0, true]], [], [-1.2, 1.2, -1.2, 1.2],
      `<path class="tr-wire" d="${K.pathOf([base, tip])}"/><path class="tr-wire" d="${K.pathOf([g1, top1])}"/><path class="tr-wire" d="${K.pathOf([g2, top1])}"/>`);
  }
  if (kind === "tel") return omParts(K, P, face, [[-4.2, 4.2, -1.7, 1.7, 0.3, 1.5, true], [1.6, 4.0, -1.5, 1.5, 1.5, 3.0], [-4.0, -1.6, -1.2, 1.2, 1.5, 2.2]], [[-2.8, 0, 0.6, 2.2, 9.4]], [-4.8, 4.8, -2.3, 2.3]);
  if (kind === "crate") return `<g class="tr-bag">${omParts(K, P, face, [[-1.7, 1.7, -4.8, -1.8, 0, 1.9], [-1.7, 1.7, -1.5, 1.5, 0, 1.9], [-1.7, 1.7, 1.8, 4.8, 0, 1.9], [-1.4, 1.4, -1.3, 1.3, 1.9, 3.4]], [], null)}</g>`;
  return omTruck(K, P, face);
}

// The bridge where the road crosses the river: a deck on two piers with low kerbs.
function omBridge(K, P, route, sOfX) {
  const sb = sOfX(FG.RIVER_X(0));
  const a = route.at(sb - 10), b = route.at(sb + 10);
  const ang = om_face([a.x, a.y], [b.x, b.y]);
  const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
  const F = fdFrame(mid[0], mid[1], ang);
  const L = Math.hypot(b.x - a.x, b.y - a.y) / 2;
  const svg = [-5, 5].map((u) => K.solidSvg(K.extrude(omBox(F, u - 0.9, u + 0.9, -3.4, 3.4), 0, 0.9, P), { tone: "lo", crease: "none" })).join("") +
    K.solidSvg(K.extrude(omBox(F, -L, L, -4.2, 4.2), 0.9, 0.7, P), { tone: "mid", className: "tr-wall" }) +
    [-1, 1].map((sv) => K.solidSvg(K.extrude(omBox(F, -L, L, sv * 4.2 - 0.35, sv * 4.2 + 0.35), 1.6, 0.6, P), { tone: "mid", crease: "none", className: "tr-wall" })).join("");
  return { key: K.depthOf([mid[0], mid[1], 0], P) - 40, svg };   // keyed early so vehicles on the deck draw over it
}

// A vehicle fighting position (scrape and berm) facing `face`, as two items either side of the centre.
function omScrape(K, P, x, y, z, face) {
  const F = fdFrame(x, y, face);
  const key0 = K.depthOf([x, y, 0], P);
  const pit = `<path class="tr-pit" d="${K.onTop(omBox(F, -5.2, 4.6, -3.2, 3.2), z + 0.03, P, true)}"/>`;
  const banks = [[4.8, 6.4, -4.2, 4.2], [-2.6, 4.8, 3.4, 4.6], [-2.6, 4.8, -4.6, -3.4]].map(([u0, u1, v0, v1]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return { near: K.depthOf([c[0], c[1], 0], P) > key0, svg: trPrism(K, P, omBox(F, u0, u1, v0, v1), z, z + 1.3) };
  });
  const wrap = (list) => (list.length ? `<g class="tr-p tr-bag">${list.map((b) => b.svg).join("")}</g>` : "");
  return [{ key: key0 - 6, svg: pit + wrap(banks.filter((b) => !b.near)) }, { key: key0 + 6, svg: wrap(banks.filter((b) => b.near)) }];
}

export function fieldStatic(K, P, T) {
  const G = FG, R = omRoutes();
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  for (const [X, p, r, seed, sq] of [[-150, 70, 46, 3, 0.7], [-40, 80, 56, 5, 0.6], [100, 70, 50, 7, 0.7], [-30, -90, 44, 9, 0.7], [170, -80, 40, 11, 0.8], [-200, -40, 40, 13, 0.8]]) {
    const [cx, cy] = OM_W([X, p]);
    g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  }
  const fields = [
    [[[-210, 30], [-172, 28], [-170, 64], [-212, 66]], 6, "a"],
    [[[-60, 30], [-14, 26], [-12, 60], [-58, 64]], 7, "b"],
    [[[0, 34], [44, 30], [46, 70], [2, 72]], 7, "a"],
    [[[100, 22], [150, 18], [152, 56], [102, 58]], 8, "b"],
    [[[160, 30], [206, 26], [208, 70], [164, 72]], 7, "a"],
    [[[-70, -60], [-30, -64], [-28, -40], [-68, -38]], 6, "a"],
    [[[120, -60], [170, -64], [172, -36], [122, -34]], 7, "b"],
    [[[-140, 140], [-90, 136], [-88, 170], [-138, 174]], 7, "b"],
    [[[60, 140], [120, 136], [122, 172], [62, 176]], 7, "a"],
    [[[40, -150], [90, -154], [92, -120], [42, -116]], 6, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, OM_Ws(ring), { furrows: n, tint }));

  // the river in the NATO rear, the axis road, the reserve's road from the north, farm tracks
  const riverPts = [];
  for (let p = -340; p <= 340; p += 20) riverPts.push(OM_W([G.RIVER_X(p), p]));
  g(trStream(K, P, riverPts, 5, 5));
  g(trRoad(K, P, OM_Ws([...G.AXIS_W, ...G.AXIS]), 3.4));
  g(trRoad(K, P, OM_Ws(G.NORTH), 2.8, { ruts: false }));
  g(trRoad(K, P, OM_Ws([[-36, 300], [-30, 160], [-26, 60], [-28, 2]]), 2.2, { ruts: false }));
  g(trRoad(K, P, OM_Ws([[164, 1], [162, -60], [156, -160], [166, -320]]), 2.2, { ruts: false }));
  g(trRoad(K, P, OM_Ws([[-196, -320], [-190, -160], [-180, -60], [-172, 0]]), 2.2, { ruts: false }));

  // woods and copses, with corridors kept clear of the road, the north road, the river and every position
  const lines = [OM_Ws(G.AXIS), OM_Ws(G.NORTH), OM_Ws(G.EVAC)];
  const near = (x, y, d) => lines.some((l) => l.some((p, i) => {
    if (!i) return false;
    const q = l[i - 1], dx = p[0] - q[0], dy = p[1] - q[1], t = om_c01(((x - q[0]) * dx + (y - q[1]) * dy) / (dx * dx + dy * dy || 1));
    return Math.hypot(q[0] + dx * t - x, q[1] + dy * t - y) < d;
  }));
  const spots = [...G.LINE, ...G.ECH.flatMap((e) => [...e.start, ...e.front]), ...G.SECOND, ...G.OMG_AT, ...G.RES_HOME, ...G.RES_EDGE,
    ...MODEL.targets.map((_, i) => omTgtAt(i))].map(OM_W);
  const clear = (x, y) => {
    const X = OM_X(x, y), p = x * Math.cos(OM_A) + y * Math.sin(OM_A);
    return near(x, y, 16) || Math.abs(X - G.RIVER_X(p)) < 12 || spots.some((s) => Math.hypot(s[0] - x, s[1] - y) < 16);
  };
  const woods = [
    [[-104, -40], 22, 21, 0.8, 8], [[-108, 40], 22, 22, 0.8, 8], [[-80, -150], 30, 23, 0.7, 12], [[-84, 150], 30, 24, 0.7, 12],
    [[-10, -60], 26, 25, 0.7, 10], [[30, 60], 22, 26, 0.8, 8], [[110, -40], 24, 27, 0.8, 8], [[180, 110], 30, 28, 0.7, 10],
    [[-130, -150], 28, 29, 0.8, 10], [[-200, 100], 26, 30, 0.8, 8], [[70, -100], 22, 31, 0.8, 8], [[200, -150], 30, 32, 0.8, 10],
    [[-50, 120], 26, 33, 0.8, 10], [[130, 130], 24, 34, 0.8, 8],
  ];
  for (const [[X, p], r, seed, sq, n] of woods) {
    const [cx, cy] = OM_W([X, p]);
    const ring = fdBlob(cx, cy, r, seed, 0.12, 40, sq);
    const trees = trScatter(ring, n, { seed, gap: 6.4, r: [3, 4.4], h: [8, 12], avoid: (x, y) => clear(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }

  for (const [pts, seed] of [
    [[[-212, 66], [-210, 30], [-172, 28]], 51], [[[-58, 64], [-60, 30]], 52], [[[102, 58], [100, 22], [150, 18]], 53],
    [[[-138, 174], [-140, 140]], 54], [[[120, -60], [170, -64]], 55], [[[2, 72], [0, 34]], 56],
  ]) items.push(...trHedge(K, P, OM_Ws(pts), { seed }));

  // villages: by the command post, a hamlet over the bridge, farms; the depot's sheds
  const house = (X, p, ang, len, wid) => { const [x, y] = OM_W([X, p]); return trHouse(K, P, x, y, ang, len, wid); };
  items.push(
    house(22, -58, 55, 10, 7), house(46, -56, 325, 9, 6.5), house(58, -36, 325, 9, 6.5), house(48, -12, 55, 10, 7),
    house(70, 22, 325, 9, 6.5), house(86, 24, 55, 10, 7),
    house(122, -48, 325, 14, 9), house(-58, 16, 55, 9, 6.5), house(-180, 20, 325, 10, 7), house(-36, -44, 55, 9, 6.5), house(186, 18, 55, 9, 6.5),
  );
  items.push(omBridge(K, P, R.route, R.sOfX));

  g(trRelief(K, P, T));

  // NATO's prepared positions on the line, facing west
  for (const [X, p] of G.LINE) { const [x, y] = OM_W([X, p]); items.push(...omScrape(K, P, x, y, T.height(x, y), OM_LEFT)); }

  return { ground: ground.join(""), items };
}

// Where every unit stands, who fires at whom and what smokes, for day t, release r and reserve on or
// off. M carries what the page measures between frames: t (seconds, for the casualty-evacuation run).
export function fieldPose(S, GEO, T, M = {}) {
  const G = FG, R = omRoutes();
  const st = stateAt(S.t, S.r, S.reserves);
  const cas = lossesAt(S.t, S.r, S.reserves);
  const units = [], smoke = [], screen = [];
  const add = (u) => {
    const X = OM_X(u.x, u.y), p = u.x * Math.cos(OM_A) + u.y * Math.sin(OM_A);
    const onDeck = om_c01((14 - Math.abs(X - G.RIVER_X(p))) / 3) * om_c01((6 - Math.abs(p)) / 2);
    u.z = T.height(u.x, u.y) + 1.6 * onDeck;
    units.push(u);
  };
  const at = (Xp) => OM_W(Xp);
  const dd = S.t;

  // --- NATO forward defense: the two battalions astride the road are knocked out as the breach opens ---
  G.LINE.forEach((Xp, i) => {
    const [x, y] = at(Xp);
    const ko = (i === 3 || i === 4) && st.gate > 0.5;
    add({ id: `n${i}`, side: ko ? "fx" : "f", face: OM_LEFT, x, y, line: i, ko });
    if (ko) smoke.push([x, y]);
  });

  // --- the first echelon: two divisions close on the line, then hold the breach's shoulders ---
  G.ECH.forEach((e, d) => {
    e.start.forEach((s0, j) => {
      let Xp = om_lerp(s0, e.front[j], st.wedge);
      const ko = j === G.KO_ECH && st.gate > 0.5;
      if (!ko && e.hold[j]) Xp = om_lerp(Xp, e.hold[j], st.gate);
      const [x, y] = at(Xp);
      const tgt = at(G.LINE[e.aim]);
      const face = ko ? OM_RIGHT : om_ang(OM_RIGHT, om_face([x, y], tgt), om_sm(0.3, 1, st.gate));
      add({ id: `a${d}${j}`, side: ko ? "hx" : "h", face, x, y, div: d, ko });
      if (ko) smoke.push([x, y]);
    });
  });

  // --- the second echelon: parked behind the line, not committed ---
  G.SECOND.forEach((Xp, j) => { const [x, y] = at(Xp); add({ id: `s${j}`, side: "h", face: OM_RIGHT, x, y }); });

  // --- the OMG (lit): from its assembly area into a march column on the road; detachments raid the targets ---
  const sN = R.sOfX(omKmX(st.nose));
  const s0 = R.sOfX(omKmX(MODEL.start));
  // detachment i is the column's head when it reaches target i; it turns off toward the target
  const detQ = R.tgtS.map((sT) => om_sm(sT - 16, sT - 1, sN));
  const detOf = [];                                   // which battalion detaches for each target
  let next = 0;
  for (let i = 0; i < 4; i++) detOf.push(next++);
  const contact = st.blocked ? om_sm(MODEL.reserve.face - 3, MODEL.reserve.face - 0.45, st.nose) : 0;
  const fightF = cas.fight;
  for (let j = 0; j < 12; j++) {
    const di = detOf.indexOf(j);
    // rank in the column: battalions ahead that have turned off no longer count
    let rank = j;
    detOf.forEach((k, i) => { if (k < j) rank -= detQ[i]; });
    const sj = sN - s0 - rank * G.GAP - Math.floor(j / 3) * G.GROUP_GAP;
    let x, y, face;
    if (sj >= 0) { const q = R.route.at(s0 + sj); x = q.x; y = q.y; face = q.face; }
    else {
      const q = R.route.at(s0), w = om_sm(-34, 0, sj);
      [x, y] = om_lerp(at(G.OMG_AT[j]), [q.x, q.y], w);
      face = om_ang(OM_RIGHT, q.face, w);
    }
    let side = "h", ko = false, raid = -1;
    if (di >= 0 && detQ[di] > 0) {
      // turn off the road to a firing position between the road and the target, and stay there
      const sT = R.tgtS[di], q = R.route.at(Math.min(s0 + Math.max(sj, 0), sT - 1));
      const [tX, tp] = omTgtAt(di);
      const spot = at([tX - 3, tp + 15]);
      const w = detQ[di];
      [x, y] = om_lerp([q.x, q.y], spot, w);
      face = om_ang(q.face, om_face(spot, at([tX, tp])), om_sm(0.2, 1, w));
      raid = w > 0.9 ? di : -1;
      if (di === G.KO_DET && !st.blocked && st.nose - MODEL.targets[di].x > 12) { side = "hx"; ko = true; raid = -1; }
    }
    // blocked: the head deploys facing the reserve; two battalions are knocked out in the fight
    if (contact > 0 && di < 0) {
      const head = R.route.at(sN);
      const r0 = rank;
      if (r0 < 3.01) {
        const F = fdFrame(head.x, head.y, OM_RIGHT);
        const [lx, ly] = F(-11 - Math.abs(r0 - 1) * 3, (r0 - 1) * 12);
        [x, y] = om_lerp([x, y], [lx, ly], contact);
        face = om_ang(face, OM_RIGHT, contact);
        if ((Math.round(r0) === 0 && fightF > 0.35) || (Math.round(r0) === 2 && fightF > 0.75)) { side = "hx"; ko = true; }
      }
    }
    if (ko) smoke.push([x, y]);
    add({ id: `o${j}`, side, lit: side === "h", kind: G.BMP.includes(j) ? "b" : "v", face, x, y, rank, raid, ko, det: di >= 0 && detQ[di] > 0 });
  }

  // --- the rear targets: greyed and smoking once raided ---
  G.PIECES.forEach((pieces, i) => {
    const [tX, tp] = omTgtAt(i);
    const down = st.hit[i] >= 1;
    pieces.forEach(([kind, dX, dp, face], k) => {
      const [x, y] = at([tX + dX, tp + dp]);
      add({ id: `g${i}${k}`, side: down ? "fx" : "f", kind, face, x, y, tgt: i });
      if (down && (k === 0 || kind === "tel" || kind === "radar")) smoke.push([x, y]);
    });
  });

  // --- the NATO reserve: from its laager to the lane edge, then across the road ---
  const res = S.reserves ? st.res : 0;
  const column = units.filter((u) => u.id.startsWith("o") && !u.det);
  const tailX = Math.min(...column.map((u) => OM_X(u.x, u.y)));
  const across = st.blocked ? 1 : om_sm(18, 26, tailX);
  G.RES_HOME.forEach((h0, j) => {
    const home = S.reserves ? h0 : [h0[0], G.RES_AWAY + h0[1] + 120];
    let Xp = om_lerp(home, G.RES_EDGE[j], om_c01(res / 0.85));
    const ax = res > 0.85 ? ((res - 0.85) / 0.15) * across : 0;
    if (ax > 0) Xp = om_lerp(G.RES_EDGE[j], G.RES_ACROSS[j], ax);
    const [x, y] = at(Xp);
    let face = res < 0.02 ? OM_DOWN : res < 0.84 ? om_face(at(home), at(G.RES_EDGE[j])) : om_ang(OM_DOWN, OM_LEFT, ax);
    const ko = st.blocked && j === 1 && fightF > 0.55;
    add({ id: `r${j}`, side: ko ? "fx" : "f", face, x, y, front: j < 3, ko });
    if (ko) smoke.push([x, y]);
  });

  // --- Soviet casualty evacuation: an ambulance shuttles from the breach back to the rear once it is open ---
  if (st.gate > 0.9) {
    const L = R.evac.length;
    const ph = (((M.t ?? 0) / G.TRUCK_PERIOD) % 1 + 1) % 1, back = ph < 0.5;
    const u = back ? ph / 0.5 : 1 - (ph - 0.5) / 0.5;
    const q = R.evac.at(u * L), F = fdFrame(q.x, q.y, q.face), [x, y] = F(0, 5);
    add({ id: "m0", side: "h", kind: "t", face: q.face + (back ? 0 : 180), x, y });
  }

  // --- smoke screen laid in front of the breach while it is being forced ---
  const scr = om_sm(0.06, 0.16, dd) * (1 - om_sm(0.42, 0.58, dd));
  if (scr > 0.02) for (const p of [-40, -26, -12, 2, 16, 30, 44]) screen.push([...at([-110, p]), scr]);

  // --- fire ---
  const streams = [];
  const gunAt = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(4.2, 0), u.z + 3.1]; };
  const aim = (u) => [u.x, u.y, u.z + 1.8];
  const live = (pre) => units.filter((u) => u.id.startsWith(pre) && !u.ko);
  const natoLine = live("n");
  const breachFight = om_sm(0.08, 0.2, dd) * (1 - om_sm(0.48, 0.62, dd));
  const shoulder = om_sm(0.4, 0.6, dd);
  live("a").forEach((u, i) => {
    const tg = natoLine.filter((n) => (u.div === 0 ? n.line <= 3 && n.line >= 2 : n.line >= 4 && n.line <= 5));
    const on = 0.9 * breachFight + 0.35 * shoulder;
    if (tg.length) streams.push({ id: u.id, side: "h", heavy: true, smoke: true, from: gunAt(u), to: tg.map(aim), period: 1.6 + i * 0.23, burst: 1, gap: 0, flight: 0.5, phase: i * 0.41, on, scatter: 3 });
  });
  natoLine.filter((n) => n.line >= 2 && n.line <= 5).forEach((n, i) => {
    const tg = live("a").filter((u) => (n.line <= 3 ? u.div === 0 : u.div === 1));
    const on = n.line === 3 || n.line === 4 ? 0.9 * breachFight : 0.85 * breachFight + 0.3 * shoulder;
    if (tg.length) streams.push({ id: n.id, side: "f", heavy: true, smoke: true, from: gunAt(n), to: tg.map(aim), period: 1.7 + i * 0.29, burst: 2, gap: 0.16, flight: 0.5, phase: 0.3 + i * 0.37, on, scatter: 3 });
  });
  // the detachments raiding their targets
  units.filter((u) => u.id.startsWith("o") && u.raid >= 0).forEach((u, i) => {
    const tg = units.filter((g) => g.tgt === u.raid);
    const on = st.hit[u.raid] < 1 ? 1 : 0.3;
    streams.push({ id: u.id, side: "h", heavy: true, smoke: true, from: gunAt(u), to: tg.map((g) => [g.x, g.y, g.z + 1.4]), period: 1.3 + i * 0.2, burst: 2, gap: 0.18, flight: 0.4, phase: i * 0.53, on, scatter: 3 });
  });
  // the blocking fight
  if (contact > 0.5) {
    const head = units.filter((u) => u.id.startsWith("o") && !u.ko && u.raid < 0 && u.rank < 3.01);
    const front = live("r").filter((u) => u.front);
    const on = 0.5 + 0.5 * (1 - fightF * 0.6);
    head.forEach((u, i) => streams.push({ id: u.id, side: "h", heavy: true, smoke: true, from: gunAt(u), to: front.map(aim), period: 1.4 + i * 0.3, burst: 1, gap: 0, flight: 0.45, phase: i * 0.6, on, scatter: 3 }));
    front.forEach((u, i) => streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: head.map(aim), period: 1.5 + i * 0.27, burst: 1, gap: 0, flight: 0.45, phase: 0.4 + i * 0.37, on, scatter: 3 }));
  }
  smoke.forEach((pt) => { pt[2] = T.height(pt[0], pt[1]) + 3; });
  screen.forEach((pt) => { pt.splice(2, 0, T.height(pt[0], pt[1]) + 1.2); });
  return { units, streams, smoke, screen, st, cas, res: res * (res > 0.85 ? across : 1), breachFight };
}

// Thin smoke rising from knocked-out vehicles and raided targets, and the smoke screen at the breach:
// a pure function of time, merged into the fire layer's smoke.
export function fieldSmoke(pose, t) {
  const out = [];
  pose.smoke.forEach(([x, y, z], n) => {
    for (let k = 0; k < 3; k++) {
      const age = (((t / 4.2) + k / 3 + n * 0.13) % 1 + 1) % 1;
      out.push({ p: [x - 2.2 * age * 4.2, y - 3.4 * age * 4.2, z + age * 7], age });
    }
  });
  pose.screen.forEach(([x, y, z, a], n) => {
    for (let k = 0; k < 3; k++) {
      const age = (((t / 3.2) + k / 3 + n * 0.29) % 1 + 1) % 1;
      if (age < 1 - a) continue;
      out.push({ p: [x - 1.6 * age * 3.2 + k * 2, y - 2.4 * age * 3.2, z + age * 3], age: age * 0.8 });
    }
  });
  return out;
}

// Per-state ground marks: the NATO line's fire sectors (fading as battalions are knocked out) and the
// reserve's sector across the road once it is there.
export function fieldMarks(K, P, T, pose) {
  const out = [];
  pose.units.filter((u) => u.id.startsWith("n")).forEach((u) => {
    const a = u.ko ? 0 : (u.line === 3 || u.line === 4) ? 0.8 * (1 - om_sm(0.2, 0.5, pose.st.gate)) : 0.7;
    if (a > 0.02) out.push(trFan(K, P, T, u.x, u.y, 7, 36, OM_LEFT - 30, OM_LEFT + 30, { side: "f", arcs: 1, alpha: a }));
  });
  const ra = om_sm(0.9, 1, pose.res);
  if (ra > 0.02) { const [x, y] = OM_W([0, -4]); out.push(trFan(K, P, T, x, y, 8, 40, OM_LEFT - 28, OM_LEFT + 28, { side: "f", arcs: 1, alpha: 0.75 * ra })); }
  return out.join("");
}
