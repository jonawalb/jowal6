// The Battlefield view of Deep Battle, at operational scale, drawn with the terrain kit
// (../../kit/terrain.mjs). One army's slice of a 1930s deep operation, left to right along the axis
// of attack as on the bench (3.5 world units to the km through the tactical zone, 2.6 beyond 32 km):
//   the start line (0 km); the defender's first belt (trenches, wire, MG posts) at the forward edge;
//   strongpoints in depth (the bench's obstacle pins); the second belt at the rear of the tactical
//   zone, where the axis road crosses a lateral road at a crossroads (the bench's rear gate); and
//   open country to a town 70 km deep (the bench's buffer).
// The same model state as the machine drives it (s = stateAt(t, commit)):
//   s.f1      the first echelon's front: three rifle divisions abreast, each a cluster of riflemen
//             with an infantry-support tank, breaking both belts; once the breach is complete
//             (s.blade) the outer divisions turn outward to hold its shoulders and the centre one
//             steps off the road
//   s.front2  the lead of the second echelon (lit): a mobile group of light tanks, lorried infantry
//             and cavalry, parked in its assembly area until committed, then in column on the road
//             through the breach to the town
//   s.reserve the defender's reserve (a tank company and lorried infantry) driving down the lateral
//             road toward the crossroads; it reaches its holding point on day 3 and closes the
//             crossroads when the bench's rear gate drops (clearDay)
// Casualties are drawn from fixed rules here and counted (notional, thousands) by model.mjs lossesOf.
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every figure, vehicle, fire stream and label for a state (build and page); fieldMarks() draws the
// fire sectors. build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs
// and terrain.mjs, so every top-level name here carries a db prefix.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trObjective, trRoute, trPrism, trHole, trNest, trWire, trSoldier, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";
import { MODEL, stateAt, clearDay } from "./model.mjs";

const DB_KM = 3.5;                                // world units per km along the axis, to 32 km
const DB_KM_DEEP = 2.6;                           // and beyond it (the empty depth is drawn shorter)
const DB_KM_REAR = 1.9;                           // and behind the start line
const dbX = (km) => -110 + (km < 0 ? km * DB_KM_REAR : Math.min(km, 32) * DB_KM + Math.max(0, km - 32) * DB_KM_DEEP); // world x of a km mark (0 = start line)

export const FG = {
  world: { x: -420, y: -400, w: 760, d: 760 },
  KM: DB_KM,
  BELT1: 3.0, WIRE1: 1.8,                         // km: first-belt trench line and its wire
  BELT2: 27.6, WIRE2: 26.2,                       // km: second-belt trench line and its wire
  GATE: 30.6,                                     // km: the crossroads behind the second belt
  TOWN: 70,                                       // km: the town in depth
  DIV_Y: [-34, 0, 34],                            // the three rifle divisions' lateral centres
  ROAD: [[-26, 10], [-16, 6], [-9.4, 2], [-4, 0], [6, -1.5], [16, 1], [24, -1], [30.6, 0], [40, 2.5], [52, -2], [62, 1.5], [70, 0], [82, 2]],
  LATERAL: [[46, -330], [42, -210], [37, -130], [33.5, -72], [31.6, -34], [30.6, 0], [30.2, 60], [31, 160], [33, 320]],
  RES_HOLD: 0.86,                                 // share of the reserve's road to its holding point (y ≈ -26)
  TRUCK_PERIOD: 12,                               // seconds for the ambulance's round trip
};
FG.TERRAIN = {
  rises: [
    { cx: dbX(14), cy: -112, r: 30, steps: 3, h: 1.8, top: 0.45, seed: 11, wobble: 0.12, squash: 1.3 },
    { cx: dbX(48), cy: 92, r: 30, steps: 3, h: 1.7, top: 0.45, seed: 21, wobble: 0.12, squash: 1.2 },
    { cx: dbX(-14), cy: -84, r: 24, steps: 2, h: 1.6, top: 0.5, seed: 31, wobble: 0.1 },
    { cx: dbX(58), cy: -96, r: 26, steps: 2, h: 1.6, top: 0.5, seed: 41, wobble: 0.1 },
  ],
};

const db_c01 = (x) => Math.min(1, Math.max(0, x));
const db_sm = (a, b, x) => { const t = db_c01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const db_lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const db_ang = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const db_box = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
const db_oct = (F, u, v, r, n = 8) => Array.from({ length: n }, (_, i) => F(u + r * Math.cos((i + 0.5) * 2 * Math.PI / n), v + r * Math.sin((i + 0.5) * 2 * Math.PI / n)));
const db_stride = (d) => [1, 0, 2, 0][((Math.floor(d / 1.7) % 4) + 4) % 4];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- routes and fixed positions (shared by build and page; built once) ----------
let DB_R = null;
function dbRoutes() {
  if (DB_R) return DB_R;
  const G = FG;
  const road = trRoute(G.ROAD.map(([km, y]) => [dbX(km), y]), 6);
  // s on the road for a world x (the road runs left to right, so x grows with s)
  const xs = [];
  for (let s = 0; s <= road.length; s += 1) xs.push([s, road.at(s).x]);
  const sOfX = (x) => {
    let lo = 0, hi = xs.length - 1;
    if (x <= xs[0][1]) return xs[0][0] - (xs[0][1] - x);
    if (x >= xs[hi][1]) return xs[hi][0] + (x - xs[hi][1]);
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m][1] < x) lo = m; else hi = m; }
    const f = (x - xs[lo][1]) / (xs[hi][1] - xs[lo][1] || 1);
    return xs[lo][0] + f;
  };
  const lateral = trRoute(G.LATERAL.map(([km, y]) => [dbX(km), y]), 6);
  // the reserve's own route: down the lateral road from beyond the map to its holding point
  const resRoute = trRoute([[36.2, -104], [34.6, -84], [33.0, -62], [31.9, -40], [31.6, -26]].map(([km, y]) => [dbX(km), y]), 6);
  // defenders: first belt (breach sector, inner ones go down, the rest fall back to the second belt),
  // strongpoints in depth (the bench's pins), second belt (inner go down, outer hold the shoulders)
  const belt1 = [-62, -50, -38, -26, -14, -2, 10, 22, 34, 46, 58].map((y, i) => ({ y, down: i % 2 === 0 || Math.abs(y) < 8, mg: y === -26 || y === 34 }));
  const fallSlots = [-48, -24, 0, 24, 48];
  let fk = 0;
  belt1.forEach((b) => { if (!b.down && !b.mg) b.fall = fallSlots[fk++ % fallSlots.length]; });
  const pinsY = [-22, 16, -10, 24, -30];
  const belt2 = [-66, -54, -42, -30, -18, -6, 6, 18, 30, 42, 54, 66].map((y) => ({ y, down: Math.abs(y) < 22 }));
  DB_R = { road, sOfX, lateral, resRoute, belt1, pinsY, belt2 };
  return DB_R;
}

// ---------- vehicles and horses of the 1930s, drawn at the origin like trSoldier ----------
// Each returns inner SVG for a <g class="tr-s" data-side [data-lit] transform="translate(...)">, so
// the side's tint applies; parts are trPrism solids sorted far to near.
function dbParts(K, P0, list) {
  return list.map(([ring, z0, z1, gear]) => {
    const c = ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length], [0, 0]);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, ring, z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]).map((p) => p[1]).join("");
}
// A light tank of 1930s pattern: twin tracks, a boxy hull, a small round turret and a short gun.
export function dbTank(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const body = dbParts(K, P0, [
    [db_box(F, -3.0, 3.0, 1.05, 1.85), 0, 1.05, true],
    [db_box(F, -3.0, 3.0, -1.85, -1.05), 0, 1.05, true],
    [db_box(F, -3.1, 2.5, -1.3, 1.3), 0.75, 1.9, false],
    [db_box(F, 2.4, 3.1, -1.0, 1.0), 0.6, 1.45, false],
    [db_oct(F, -0.3, 0, 1.0), 1.9, 2.8, false],
  ]);
  const a = K.iso([...F(0.6, 0), 2.38], P0), b = K.iso([...F(3.3, 0), 2.42], P0);
  const gun = `<path class="tr-gun" d="${K.pathOf([a, b])}"/>`;
  const [vx, vy] = K.towardViewer(P0), fw = F(1, 0), away = fw[0] * vx + fw[1] * vy < 0;
  return `<path class="tr-shadow" d="${K.onTop(db_box(F, -3.4, 3.4, -2.2, 2.2), 0, P0, true)}"/>` + (away ? gun + body : body + gun);
}
// A 1930s lorry: chassis, long bonnet, cab and an open bed (closed and taller for the ambulance).
export function dbLorry(K, P, face = 0, closed = false) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  return `<path class="tr-shadow" d="${K.onTop(db_box(F, -3.6, 3.7, -1.6, 1.6), 0, P0, true)}"/>` + dbParts(K, P0, [
    [db_box(F, -3.2, 3.3, -1.0, 1.0), 0.2, 0.7, true],
    [db_box(F, 2.0, 3.4, -0.72, 0.72), 0.7, 1.85, false],
    [db_box(F, 0.8, 2.0, -1.05, 1.05), 0.7, 2.85, false],
    [db_box(F, -3.4, 0.7, -1.2, 1.2), 0.8, closed ? 2.9 : 1.75, false],
  ]);
}
// A cavalryman: horse with four legs (a gallop cycle by stride), neck and head, rider and carbine.
export function dbRider(K, P, face = 0, stride = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const sw = stride === 0 ? 0 : stride === 1 ? 0.42 : -0.42;
  const legs = [[1.15, 0.28, sw], [1.15, -0.28, -sw], [-1.35, 0.28, -sw], [-1.35, -0.28, sw]].map(([u, v, d]) => [db_box(F, u + d - 0.13, u + d + 0.13, v - 0.13, v + 0.13), 0, 1.65, true]);
  const body = dbParts(K, P0, [
    ...legs,
    [db_box(F, -1.8, 1.55, -0.48, 0.48), 1.5, 2.55, false],
    [db_box(F, -2.15, -1.8, -0.14, 0.14), 1.7, 2.45, true],
    [db_box(F, 1.35, 2.0, -0.28, 0.28), 2.2, 3.25, false],
    [db_box(F, 1.95, 2.95, -0.25, 0.25), 2.75, 3.3, false],
    [db_box(F, -0.45, 0.35, -0.6, 0.6), 2.55, 2.95, false],
    [db_box(F, -0.42, 0.28, -0.42, 0.42), 2.95, 4.45, false],
    [db_oct(F, -0.06, 0, 0.4), 4.45, 5.15, true],
  ]);
  const a = K.iso([...F(-0.8, 0.5), 3.1], P0), b = K.iso([...F(0.1, 0.56), 4.75], P0);
  const gun = `<path class="tr-gun" d="${K.pathOf([a, b])}"/>`;
  const [vx, vy] = K.towardViewer(P0), lf = F(0, 1), behind = lf[0] * vx + lf[1] * vy < 0;
  return `<path class="tr-shadow" d="${K.onTop(db_box(F, -2.2, 3.0, -0.8, 0.8), 0, P0, true)}"/>` + (behind ? gun + body : body + gun);
}
// The look key and SVG for any field unit (soldier, tank, lorry, ambulance, rider).
export const dbLook = (u) => u.kind === "man" ? `${u.side}|m|${u.pose}|${u.role}|${u.stride}|${Math.round((((u.face % 360) + 360) % 360) / 15) * 15 % 360}`
  : `${u.side}|${u.kind}|${u.stride || 0}|${Math.round((((u.face % 360) + 360) % 360) / 15) * 15 % 360}`;
export function dbUnitSvg(K, P, u) {
  const f = Math.round((((u.face % 360) + 360) % 360) / 15) * 15 % 360;
  if (u.kind === "man") return trSoldier(K, P, { face: f, pose: u.pose, role: u.role, stride: u.stride });
  if (u.kind === "tank") return dbTank(K, P, f);
  if (u.kind === "lorry") return dbLorry(K, P, f, false);
  if (u.kind === "amb") return dbLorry(K, P, f, true);
  return dbRider(K, P, f, u.stride || 0);
}

// ---------- static ground ----------
export function fieldStatic(K, P, T) {
  const G = FG, R = dbRoutes();
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  for (const [km, y, r, seed, sq] of [[8, -60, 60, 3, 0.6], [44, 40, 70, 5, 0.5], [-14, 50, 50, 7, 0.8], [62, -40, 50, 9, 0.7], [20, 80, 44, 13, 0.6]]) g(trPatch(K, P, fdBlob(dbX(km), y, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-22, 20], [-12, 18], [-11, 42], [-21, 44]], 7, "a"],
    [[[6, 34], [16, 32], [17, 70], [7, 72]], 8, "b"],
    [[[36, -70], [46, -74], [47, -40], [37, -36]], 8, "a"],
    [[[38, 24], [50, 22], [50, 56], [39, 58]], 8, "b"],
    [[[60, 20], [72, 18], [73, 50], [61, 52]], 7, "a"],
    [[[74, -40], [84, -42], [85, -12], [75, -10]], 6, "b"],
    [[[12, -48], [22, -50], [22, -24], [13, -22]], 7, "b"],
    [[[-30, 30], [-20, 28], [-19, 60], [-29, 62]], 6, "a"],
  ];
  for (const [quad, n, tint] of fields) g(trField(K, P, quad.map(([km, y]) => [dbX(km), y]), { furrows: n, tint }));

  // roads: the axis road, the lateral road behind the second belt, a farm track to the town
  g(trRoad(K, P, [[dbX(-40), 14], ...R.road.line, [dbX(100), 4]], 3.2, { smooth: 0 }));
  g(trRoad(K, P, R.lateral.line, 2.8, { smooth: 0 }));
  g(trRoad(K, P, [[dbX(58), -240], [dbX(64), -120], [dbX(68), -40], [dbX(70), -6]], 2.2, { ruts: false }));
  g(trRoad(K, P, [[dbX(4), -260], [dbX(6), -150], [dbX(8), -60], [dbX(6), -1]], 2.2, { ruts: false }));

  // woods and copses at the flanks, clear of the roads, the belts and the breach sector
  const lines = [R.road.line, R.lateral.line, R.resRoute.line];
  const near = (x, y, d) => lines.some((l) => l.some((p) => Math.hypot(p[0] - x, p[1] - y) < d));
  const busy = (x, y) => near(x, y, 16) || (x > dbX(-20) && x < dbX(36) && Math.abs(y) < 78) || (x > dbX(60) && x < dbX(80) && Math.abs(y) < 34) || (x > dbX(-24) && x < dbX(-2) && y > -66 && y < 10);
  const woods = [
    [-6, -120, 40, 21, 0.6, 18], [22, 118, 40, 22, 0.6, 18], [40, -150, 44, 23, 0.6, 18], [78, 90, 40, 24, 0.7, 16],
    [-30, -50, 22, 25, 0.8, 8], [54, 128, 26, 26, 0.8, 10], [86, -84, 30, 27, 0.8, 10], [-34, 110, 34, 28, 0.7, 12],
    [16, -98, 18, 29, 0.9, 6], [62, -150, 30, 30, 0.7, 10],
  ];
  for (const [km, y, r, seed, sq, n] of woods) {
    const ringW = fdBlob(dbX(km), y, r, seed, 0.12, 40, sq);
    const trees = trScatter(ringW, n, { seed, gap: 6.4, r: [3, 4.6], h: [8, 12.5], avoid: (x, yy) => busy(x, yy) || trBehind(K, P, T, x, yy) || T.height(x, yy) > 0 });
    const w = trWood(K, P, T, ringW, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[6, 34], [16, 32], [17, 70]], 51], [[[38, 24], [50, 22]], 52], [[[60, 20], [72, 18]], 53], [[[36, -70], [46, -74]], 54], [[[-30, 30], [-20, 28]], 55]]) {
    items.push(...trHedge(K, P, pts.map(([km, y]) => [dbX(km), y]), { seed }));
  }

  // the crossroads hamlet behind the second belt, the town in depth, a farm or two
  const house = (km, y, ang, len, wid) => trHouse(K, P, dbX(km), y, ang, len, wid);
  items.push(
    house(33.6, -14, 0, 9, 6.5), house(34, 13, 90, 9, 6.5), house(27.4, 16, 0, 8, 6),
    house(66.5, -16, 0, 10, 7), house(73.5, -15, 90, 10, 7), house(66, 14, 90, 11, 7), house(73, 13, 0, 9, 6.5), house(77, -2, 0, 9, 6.5), house(69.5, 26, 0, 9, 6.5),
    house(-20, 52, 0, 9, 6.5), house(46, 52, 90, 9, 6.5), house(84, -30, 0, 9, 6.5),
  );

  g(trRelief(K, P, T));

  // the first belt: trench positions across the front, wire in front with a lane cut at the road
  const yLine = (y0, y1, step) => { const out = []; for (let y = y0; y <= y1 + 1e-9; y += step) out.push(y); return out; };
  for (const y of yLine(-158, 154, 12).filter((y, k) => Math.abs(y) <= 72 || k % 2 === 0)) {
    if (R.belt1.some((b) => b.mg && Math.abs(b.y - y) < 1)) continue;
    items.push(...trHole(K, P, dbX(G.BELT1) + (Math.abs(y) % 24 < 12 ? 0 : 1.6), y, 0, 180));
  }
  for (const b of R.belt1) if (b.mg) items.push(...trNest(K, P, dbX(G.BELT1), b.y, 0, 180));
  items.push(...trWire(K, P, T, [[dbX(G.WIRE1), -164], [dbX(G.WIRE1), -8]], { every: 13 }), ...trWire(K, P, T, [[dbX(G.WIRE1), 8], [dbX(G.WIRE1), 160]], { every: 13 }));
  // strongpoints in depth
  MODEL.pins.forEach((km, i) => items.push(...trHole(K, P, dbX(km), R.pinsY[i], T.height(dbX(km), R.pinsY[i]), 180, { heavy: true })));
  // the second belt
  for (const y of yLine(-150, 150, 12).filter((y, k) => Math.abs(y) <= 72 || k % 2 === 0)) items.push(...trHole(K, P, dbX(G.BELT2) + (Math.abs(y) % 24 < 12 ? 0 : 1.6), y, 0, 180));
  items.push(...trWire(K, P, T, [[dbX(G.WIRE2), -156], [dbX(G.WIRE2), -8]], { every: 13 }), ...trWire(K, P, T, [[dbX(G.WIRE2), 8], [dbX(G.WIRE2), 152]], { every: 13 }));

  // control measures: the start line on pegs; the flag on the town 70 km deep
  const sl = trChalk(K, P, T, [[dbX(-1.2), -74], [dbX(-1.2), -40], [dbX(-1.2), -8], [dbX(-1.2), 24], [dbX(-1.2), 56], [dbX(-1.2), 84]]);
  g(sl.ground); items.push(...sl.items);
  items.push(trObjective(K, P, T, dbX(G.TOWN) + 3, -5, { h: 13, ang: 200 }));
  return { ground: ground.join(""), items };
}

// ---------- the moving picture ----------
// The first echelon: three divisions of eight riflemen (two loose lines) and a support tank in front.
const DB_DIV = [[[3.2, 0], "tank"], [[0, -9], "tl"], [[0.7, -4.6], "ar"], [[-0.5, 4.4], "r"], [[0.3, 9.2], "gr"], [[-6.2, -7], "r"], [[-5.4, -2.2], "ar"], [[-6.6, 3], "tl"], [[-5.8, 8.2], "r"]];
// who falls, and at what depth of the first echelon's front (km): [division, member, km]
const DB_FALL = [[0, 5, 2.4], [1, 2, 3.0], [2, 7, 4.2], [1, 8, 9.6], [0, 3, 16.2], [2, 1, 22.4], [1, 6, 27.4]];
const DB_TANK_HIT = [2, 2.6];                     // division 2's support tank stops at 2.6 km
// The mobile group in column: tanks, lorried infantry and a cavalry squadron at the tail.
const DB_MG = ["tank", "tank", "tank", "lorry", "tank", "lorry", "tank", "lorry", "cav", "cav", "cav", "cav"];
const DB_MG_GAP = (j) => j * 8 - Math.max(0, j - 8) * 2.6;
// the assembly area: three ranks of four, facing the start line (world-unit offsets from km -10, y -52)
const DB_LAAGER = [[0, 0], [0, 10], [0, 20], [-10, 4], [-10, 14], [-10, 24], [0, 30], [-10, 34], [-19, 8], [-19, 16], [-19, 24], [-19, 32]].map(([du, dv]) => [du, -52 + dv]);
// The defender's reserve: three tanks and three lorries.
const DB_RES = ["tank", "tank", "tank", "lorry", "lorry", "lorry"];

export function fieldPose(S, GEO, T, M = {}) {
  const G = FG, R = dbRoutes(), m = MODEL;
  const units = [], streams = [], smoke = [], labels = [];
  const add = (u) => { u.z = T.height(u.x, u.y); units.push(u); return u; };
  const t = S.t, ft = M.t ?? 0;
  const ahead = stateAt(t + 0.02, S.commit, m);
  const fMoving = ahead.f1 - S.f1 > 1e-4 && S.f1 < m.tactical;
  const clr = clearDay(S.T, m);
  const sealed = S.T.sealed;

  // --- first echelon ---
  const blade = S.blade;                                       // breach complete (0..1)
  const front = Math.min(S.f1, m.tactical - 0.6);
  const fe = [];
  G.DIV_Y.forEach((dy, d) => {
    // after the breach: outer divisions turn to the shoulders, the centre one steps off the road
    const sh = d === 0 ? [dbX(27.2), -46, 270] : d === 2 ? [dbX(27.2), 46, 90] : [dbX(23.2), -20, 0];
    DB_DIV.forEach(([[du, dv], role], k) => {
      const fall = DB_FALL.find((f) => f[0] === d && f[1] === k);
      const hitTank = role === "tank" && d === DB_TANK_HIT[0] && S.f1 >= DB_TANK_HIT[1];
      const atKm = fall && S.f1 >= fall[2] ? fall[2] : hitTank ? DB_TANK_HIT[1] : null;
      const fk = atKm ?? front;
      let x = dbX(fk) + du * 1.0 - (fk >= m.tactical - 0.6 ? 0 : 0), y = dy + dv + Math.sin(d * 3 + k * 1.7) * 1.2;
      let face = 0;
      if (atKm == null && blade > 0) {
        const F = fdFrame(sh[0], sh[1], sh[2]);
        const [sx, sy] = F(du * 0.9, dv * 0.9);
        [x, y] = db_lerp([x, y], [sx, sy], blade);
        face = db_ang(0, sh[2], db_sm(0.2, 1, blade));
      }
      const id = `f${d}${k}`;
      if (role === "tank") {
        const u = add({ id, kind: "tank", side: atKm != null ? "fx" : "f", face, x, y });
        if (atKm != null) smoke.push([x, y]); else fe.push(u);
        return;
      }
      const down = atKm != null;
      const fire = !down && (fMoving ? (k + Math.floor(S.f1 / 1.6)) % 2 === 0 : blade > 0.5);
      const pose = down ? "prone" : fire ? (blade > 0.5 && d === 1 ? "kneel" : "kneel") : "stand";
      const u = add({ id, kind: "man", side: down ? "fx" : "f", pose, role, face: down ? face + 20 : face, stride: pose === "stand" ? db_stride(S.f1 * DB_KM + k * 0.9) : 0, x, y, fire });
      if (!down) fe.push(u);
    });
  });
  labels.push({ id: "l1", text: "1st echelon: rifle divisions", x: dbX(front) + 10 - 2 * blade, y: 42 + 6 * blade, z: 0, anchor: "r" });

  // --- defenders: first belt, strongpoints, second belt ---
  const def = [];
  R.belt1.forEach((b, i) => {
    const hx = dbX(G.BELT1) + (Math.abs(b.y) % 24 < 12 ? 0 : 1.6);
    const reach = S.f1 >= G.BELT1 - 0.4 + (i % 3) * 0.12;
    if (b.down || b.mg) {
      const down = reach && (b.down || b.mg);
      const u = add({ id: `h1${i}`, kind: "man", side: down ? "hx" : "h", pose: down ? "prone" : "hole", role: b.mg ? "mg" : "r", face: down ? 160 : 180, stride: 0, x: hx - (down ? 1.2 : 0), y: b.y });
      if (!down) def.push(u);
      return;
    }
    // falls back to the second belt as the first echelon closes
    const w = db_sm(G.BELT1 - 1.2, G.BELT1 + 2.6, S.f1);
    const to = [dbX(G.BELT2) + 0.8, b.fall + 5];
    const [x, y] = db_lerp([hx, b.y], to, w);
    const moving = w > 0.01 && w < 0.99;
    const down2 = S.f1 >= G.BELT2 - 0.3 && Math.abs(to[1]) < 22;
    const u = add({ id: `h1${i}`, kind: "man", side: down2 ? "hx" : "h", pose: down2 ? "prone" : moving ? "stand" : "hole", role: "r", face: moving ? 0 : down2 ? 160 : 180, stride: moving ? db_stride(w * 100) : 0, x, y });
    if (!down2) def.push(u);
  });
  m.pins.forEach((km, i) => {
    const down = S.pins[i] > 0.5;
    const u = add({ id: `hp${i}`, kind: "man", side: down ? "hx" : "h", pose: down ? "prone" : "hole", role: i % 2 ? "mg" : "r", face: down ? 160 : 180, stride: 0, x: dbX(km) - (down ? 1.2 : 0), y: R.pinsY[i] });
    if (!down) def.push(u);
  });
  R.belt2.forEach((b, i) => {
    const hx = dbX(G.BELT2) + (Math.abs(b.y) % 24 < 12 ? 0 : 1.6);
    const down = b.down && S.f1 >= G.BELT2 - 0.5 + (i % 3) * 0.15;
    const u = add({ id: `h2${i}`, kind: "man", side: down ? "hx" : "h", pose: down ? "prone" : "hole", role: i === 3 || i === 8 ? "mg" : "r", face: down ? 160 : b.y < -20 && S.blade > 0.5 ? 140 : b.y > 20 && S.blade > 0.5 ? 220 : 180, stride: 0, x: hx - (down ? 1.2 : 0), y: b.y });
    if (!down) def.push(u);
  });

  // --- the mobile group (lit) ---
  const lead = R.sOfX(dbX(S.front2));
  const s0 = R.sOfX(dbX(m.start2 + m.mgHalf));
  const committed = S.latch > 0.5 || S.c2 > m.start2 + 1e-6;
  const mgMoving = ahead.c2 - S.c2 > 1e-4;
  const fightGate = sealed ? db_sm(m.reserveDay, m.reserveDay + 0.5, t) * db_sm(24, 27, S.front2) : 0;
  const deep = db_sm(m.deep - 6, m.deep, S.front2);
  const mg = [];
  DB_MG.forEach((kind, j) => {
    const sj = lead - DB_MG_GAP(j);
    let x, y, face;
    if (!committed || sj < s0) {
      const p0 = R.road.at(s0), lg = DB_LAAGER[j];
      const w = committed ? db_sm(s0 - 30, s0, sj) : 0;
      [x, y] = db_lerp([dbX(-10) + lg[0], lg[1]], [p0.x, p0.y], w);
      face = db_ang(0, p0.face, w);
    } else {
      const p = R.road.at(sj);
      x = p.x; y = p.y + (kind === "cav" ? (j % 2 ? 2.2 : -2.2) : 0); face = p.face;
    }
    // one tank knocked out passing the second belt; two more at a sealed gate
    let ko = j === 2 && committed && sj >= R.sOfX(dbX(26.4));
    if (ko) { const p = R.road.at(R.sOfX(dbX(26.4))); x = p.x + 1; y = p.y + 6; face = p.face + 25; }
    if (sealed && fightGate > 0) {
      // the head deploys into line short of the crossroads, facing the reserve
      if (j < 6) {
        const F = fdFrame(dbX(m.gateB - 2.2), 0, 0);
        const [lx, ly] = F(-(j % 2) * 4 - Math.floor(j / 2) * 0.5, (j - 2.5) * 7.5);
        [x, y] = db_lerp([x, y], [lx, ly], db_sm(0, 0.5, fightGate));
        face = db_ang(face, 0, db_sm(0, 0.5, fightGate));
      }
      if ((j === 0 && fightGate > 0.45) || (j === 4 && fightGate > 0.8)) ko = true;
    }
    if (deep > 0 && j < 8) {
      // round the town: the head fans out on the far side
      const F = fdFrame(dbX(m.deep) + 4, 0, 0);
      const spots = [[6, -12], [8, 4], [2, 16], [-2, -22], [-6, 24], [-10, -6], [-14, 14], [-18, -16]];
      const [tx, ty] = F(...spots[j]);
      [x, y] = db_lerp([x, y], [tx, ty], db_sm(0.3, 1, deep));
    }
    const side = ko ? "fx" : "f";
    const stride = kind === "cav" && mgMoving ? db_stride(sj * 1.6) : kind === "cav" ? 0 : 0;
    const u = add({ id: `m${j}`, kind, side, lit: !ko, face, x, y, stride, j });
    if (ko) smoke.push([x, y]); else mg.push(u);
  });
  const mgHead = mg.slice(0, 4);
  const lx = mgHead.length ? mgHead.reduce((s, u) => s + u.x, 0) / mgHead.length : dbX(S.front2);
  const ly = mgHead.length ? mgHead.reduce((s, u) => s + u.y, 0) / mgHead.length : 0;
  labels.push(committed ? { id: "l2", text: "2nd echelon: mobile group", x: lx + 4, y: ly - 2, z: 11, lit: true, anchor: "c" } : { id: "l2", text: "2nd echelon: mobile group", x: dbX(-10) - 4, y: -6, z: 0, lit: true, anchor: "below" });

  // --- the defender's reserve ---
  const L = R.resRoute.length * 1.0;
  const prog = db_c01(t / m.reserveDay);
  const deploy = db_sm(clr, clr + 0.3, t);
  const res = [];
  DB_RES.forEach((kind, j) => {
    const sj = prog * L - j * 8.5;
    const p = R.resRoute.at(Math.max(0, sj));
    let x = p.x, y = p.y, face = p.face;
    if (sj < 0) { const p0 = R.resRoute.at(0); x = p0.x + (p.x - p0.x) + sj * Math.cos(p0.face * Math.PI / 180); y = p0.y + sj * Math.sin(p0.face * Math.PI / 180); }
    if (deploy > 0) {
      const spots = j < 3 ? [[dbX(m.gateB + 0.9), (j - 1) * 11, 180]] : [[dbX(m.gateB + 4.2), -24 - (j - 3) * 9, 200]];
      const [tx, ty, tf] = spots[0];
      [x, y] = db_lerp([x, y], [tx, ty], deploy);
      face = db_ang(face, tf, db_sm(0.2, 1, deploy));
    }
    const fight = sealed ? fightGate : db_sm(clr + 0.3, clr + 0.8, t);
    const ko = j === (sealed ? 2 : 0) && fight > 0.6;
    const u = add({ id: `r${j}`, kind, side: ko ? "hx" : "h", face, x, y, stride: 0 });
    if (ko) smoke.push([x, y]); else res.push(u);
  });
  const rh = res[0] || units.find((u) => u.id === "r1");
  labels.push({ id: "l3", text: deploy > 0.5 ? (sealed ? "Reserve: crossroads sealed" : "Reserve: too late") : "Defender's reserve", x: rh.x + (deploy > 0.5 ? 16 : 9), y: rh.y - 3, z: 4, side: "h", anchor: "r" });

  // --- casualty evacuation: an ambulance shuttles from behind the first echelon to the start line ---
  {
    const far = Math.max(2, Math.min(S.f1, m.tactical) - 3);
    const on = db_sm(0.6, 1.0, t);
    const ph = ((ft / G.TRUCK_PERIOD) % 1 + 1) % 1, back = ph < 0.5;
    const u = back ? 1 - ph / 0.5 : (ph - 0.5) / 0.5;
    const km = -3 + (far + 3) * u * on;
    const sA = R.sOfX(dbX(km)), p = R.road.at(sA), F = fdFrame(p.x, p.y, p.face);
    const [x, y] = F(0, -7);
    add({ id: "amb", kind: "amb", side: "f", face: on > 0.01 ? p.face + (back ? 180 : 0) : 0, x, y, stride: 0 });
  }

  // --- the town's rear services: overrun when the mobile group arrives ---
  [[dbX(68), -6, "man"], [dbX(71), 6, "man"], [dbX(74.5), -8, "man"], [dbX(70), -26, "lorry"], [dbX(75), 22, "lorry"]].forEach(([x, y, kind], i) => {
    const down = !sealed && S.front2 > m.deep - 4 - i * 0.8;
    if (kind === "lorry") { add({ id: `t${i}`, kind, side: down ? "hx" : "h", face: 90, x, y, stride: 0 }); if (down && i === 3) smoke.push([x, y]); return; }
    add({ id: `t${i}`, kind: "man", side: down ? "hx" : "h", pose: down ? "prone" : "stand", role: "r", face: 180, stride: 0, x, y });
  });

  // --- fire ---
  const aim = (u) => u.kind === "man" ? trAimPoint(u, u.x, u.y, u.z) : [u.x, u.y, u.z + 1.6];
  const muzzle = (u) => u.kind === "man" ? trMuzzle(u, u.x, u.y, u.z) : (() => { const F = fdFrame(u.x, u.y, Math.round(u.face / 15) * 15); return [...F(3.3, 0), u.z + 2.42]; })();
  const xF = dbX(front);
  const near = (list, x0, x1, ys = 999) => list.filter((u) => u.x > x0 && u.x < x1 && Math.abs(u.y) < ys);
  // the first echelon fires at the defenders just ahead; they fire back
  if (S.f1 < m.tactical) {
    const tg = near(def, xF + 2, xF + 34, 80);
    if (tg.length) {
      fe.filter((u) => u.kind === "tank" || u.fire).forEach((u, i) => streams.push({ id: u.id, side: "f", heavy: u.kind === "tank", smoke: u.kind === "tank", from: muzzle(u), to: tg.map(aim), period: u.kind === "tank" ? 2.2 + i * 0.13 : 1.3 + (i % 5) * 0.21, burst: u.kind === "tank" ? 1 : 2, gap: 0.12, flight: 0.45, phase: i * 0.37, on: 0.85, scatter: 2.6 }));
      const tf = fe.filter((u) => u.x > xF - 12);
      tg.slice(0, 8).forEach((u, i) => streams.push({ id: u.id, side: "h", heavy: u.role === "mg", from: muzzle(u), to: tf.map(aim), period: 1.4 + i * 0.19, burst: u.role === "mg" ? 3 : 1, gap: 0.1, flight: 0.45, phase: 0.2 + i * 0.41, on: 0.8, scatter: 2.6 }));
    }
  }
  // after the breach: the shoulders exchange fire with the second belt's flanks
  if (blade > 0.6) {
    for (const [dsel, ysg] of [[0, -1], [2, 1]]) {
      const mine = fe.filter((u) => u.id.startsWith(`f${dsel}`));
      const theirs = def.filter((u) => u.id.startsWith("h2") && Math.sign(u.y) === ysg && Math.abs(u.y) > 22);
      if (!mine.length || !theirs.length) continue;
      mine.filter((u, i) => i % 2 === 0).forEach((u, i) => streams.push({ id: u.id, side: "f", from: muzzle(u), to: theirs.map(aim), period: 1.9 + i * 0.27, burst: 2, gap: 0.12, flight: 0.4, phase: i * 0.53 + dsel, on: 0.55, scatter: 2.4 }));
      theirs.slice(0, 3).forEach((u, i) => streams.push({ id: u.id, side: "h", heavy: u.role === "mg", from: muzzle(u), to: mine.map(aim), period: 2.1 + i * 0.3, burst: u.role === "mg" ? 3 : 1, gap: 0.1, flight: 0.4, phase: 0.4 + i * 0.6 + dsel, on: 0.5, scatter: 2.4 }));
    }
  }
  // the fight at a sealed crossroads
  if (sealed && fightGate > 0.05) {
    const head = mg.filter((u) => u.j < 6), rt = res.filter((u) => u.kind === "tank");
    head.forEach((u, i) => { if (rt.length) streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: muzzle(u), to: rt.map(aim), period: 2.0 + i * 0.23, burst: 1, gap: 0, flight: 0.4, phase: i * 0.41, on: 0.9 * fightGate, scatter: 3 }); });
    rt.forEach((u, i) => { if (head.length) streams.push({ id: u.id, side: "h", heavy: true, smoke: true, from: muzzle(u), to: head.map(aim), period: 1.8 + i * 0.25, burst: 1, gap: 0, flight: 0.4, phase: 0.3 + i * 0.5, on: 0.9 * fightGate, scatter: 3 }); });
  }
  // a reserve that comes too late meets the first echelon's shoulders at the crossroads
  if (!sealed) {
    const late = db_sm(clr + 0.3, clr + 0.6, t);
    if (late > 0.05) {
      const rt = res.filter((u) => u.kind === "tank");
      const sh = fe.filter((u) => u.kind === "tank" || (u.id.startsWith("f0") || u.id.startsWith("f2")));
      rt.forEach((u, i) => { if (sh.length) streams.push({ id: u.id, side: "h", heavy: true, smoke: true, from: muzzle(u), to: sh.slice(0, 6).map(aim), period: 2.3 + i * 0.3, burst: 1, gap: 0, flight: 0.45, phase: 0.2 + i * 0.6, on: 0.8 * late, scatter: 3 }); });
      fe.filter((u) => u.kind === "tank").forEach((u, i) => { if (rt.length) streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: muzzle(u), to: rt.map(aim), period: 2.1 + i * 0.3, burst: 1, gap: 0, flight: 0.45, phase: i * 0.7, on: 0.8 * late, scatter: 3 }); });
    }
  }
  // the mobile group overruns the town's rear services
  if (!sealed && S.front2 > m.deep - 12 && S.front2 < m.deep - 1) {
    const tg = units.filter((u) => u.id.startsWith("t") && u.side === "h");
    mg.slice(0, 3).forEach((u, i) => { if (tg.length) streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: muzzle(u), to: tg.map(aim), period: 1.6 + i * 0.3, burst: 1, gap: 0, flight: 0.4, phase: i * 0.5, on: 0.9, scatter: 3 }); });
  }

  // dust behind the mobile group's moving vehicles
  const dust = mgMoving ? mg.filter((u) => u.kind !== "cav" || true).slice(0, 8).map((u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(-4, 0), u.z + 0.6]; }) : [];
  smoke.forEach((pt) => { pt[2] = T.height(pt[0], pt[1]) + 3; });
  return { units, streams, smoke, dust, labels, belt1: 1 - S.liftA, belt2: 1 - db_sm(m.tactical - 1, m.tactical, S.f1), resFan: deploy * (res.length ? 1 : 0), sealed };
}

// Thin smoke from knocked-out vehicles and dust behind moving ones: pure functions of time.
export function fieldSmoke(pose, t) {
  const out = [];
  pose.smoke.forEach(([x, y, z], n) => {
    for (let k = 0; k < 3; k++) {
      const age = (((t / 4.2) + k / 3 + n * 0.13) % 1 + 1) % 1;
      out.push({ p: [x - 2.2 * age * 4.2, y - 3.4 * age * 4.2, z + age * 7], age });
    }
  });
  pose.dust.forEach(([x, y, z], n) => {
    const age = (((t / 1.4) + n * 0.37) % 1 + 1) % 1;
    out.push({ p: [x - 3 * age, y - 1.5 * age, z + age * 2.5], age: 0.35 + age * 0.65 });
  });
  return out;
}

// Per-state ground marks: each belt's fire sector over the breach sector, fading as it is broken,
// and the reserve's sector up the axis road once it holds the crossroads.
export function fieldMarks(K, P, T, pose) {
  const G = FG;
  return trFan(K, P, T, dbX(G.BELT1) + 2, 0, 10, 44, 160, 200, { side: "h", arcs: 1, alpha: 0.75 * pose.belt1 }) +
    trFan(K, P, T, dbX(G.BELT2) + 2, 0, 10, 52, 160, 200, { side: "h", arcs: 1, alpha: 0.75 * pose.belt2 }) +
    trFan(K, P, T, dbX(G.GATE) + 2, 0, 8, 40, 162, 198, { side: "h", arcs: 1, alpha: 0.75 * pose.resFan });
}

// Static place labels (world points): the two belts and the depth objective.
export const fieldPlaces = () => [
  { id: "p1", text: "1st belt", x: dbX(FG.BELT1) + 5, y: -74, z: 0, anchor: "r" },
  { id: "p2", text: "2nd belt", x: dbX(FG.BELT2) + 5, y: -74, z: 0, anchor: "r" },
  { id: "p3", text: "Town 70 km deep", x: dbX(FG.TOWN) + 4, y: -24, z: 15, anchor: "c" },
];
