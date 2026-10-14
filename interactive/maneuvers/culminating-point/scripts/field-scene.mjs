// The Battlefield view of the Culminating Point, at operational scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The unit is an attacking battalion drawn as three companies of three
// vehicles (one vehicle per platoon) advancing in march column along a road, its supply trucks
// shuttling between a base and the column's tail. The same model state S as the machine drives it:
//   S.x     the carriage front: here the column's lead, FG.K field units per km along the road
//   S.sled  the supply sled: here the base (parked trucks) at the rear depot or the forward site
//   S.target the ordered advance: the column halts and goes over to a hasty defense when it is
//          ordered on but has reached its limit (the model's "Culminated")
// Distance from the base, the power ratio and the limit all come from model.mjs, never from here.
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every vehicle and fire stream for a state (build and page); fieldMarks() draws the fire sectors.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trObjective, trRoute, trPrism } from "../../kit/terrain.mjs";
import { MODEL, limitOf, losses, LOSS } from "./model.mjs";

export const FG = {
  world: { x: -460, y: -400, w: 920, d: 800 },
  K: 1.6,                       // field units per km of the model (notional)
  // the road: the axis of advance and the line of communication back to the base
  ROAD: [[-330, 44], [-240, 36], [-170, 26], [-110, 30], [-50, 20], [10, 6], [70, 2], [120, -8], [175, -16], [260, -28], [360, -34]],
  DEPOT_X: -178,                // the rear depot sits beside the road here
  START_GAP: 16,                // the start line, this far up the road from the depot
  STREAM: (y) => -126 + 9 * Math.sin(y * 0.02 + 0.6) + 4 * Math.sin(y * 0.05),
  GAP: 9,                       // vehicle spacing in the march column
  CO_GAP: 7,                    // extra spacing between companies
  SCREEN_AHEAD: 46,             // the enemy covering force keeps about this far ahead of the column
  SCREEN_HOLD: 125,             // where it waits before the advance (road distance past the start line)
  TRUCK_V: 40,                  // supply truck speed, field units per second (the column's top speed is 54)
};
FG.TERRAIN = {
  rises: [
    { cx: 120, cy: -40, r: 30, steps: 3, h: 1.8, top: 0.5, seed: 9, wobble: 0.08, squash: 1.3 },   // the objective's hill
    { cx: -40, cy: -120, r: 40, steps: 3, h: 1.8, top: 0.45, seed: 17, wobble: 0.1, squash: 0.7 },
    { cx: -150, cy: 140, r: 34, steps: 2, h: 1.6, top: 0.5, seed: 23, wobble: 0.12 },
    { cx: 60, cy: 150, r: 30, steps: 2, h: 1.6, top: 0.5, seed: 29, wobble: 0.12, squash: 1.2 },
  ],
};

const CP_RAD = Math.PI / 180;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth01 = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const angLerp = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const boxRing = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- the road and the model-to-road mapping (shared by build and page; built once) ----------
let CP_R = null;
export function roads() {
  if (CP_R) return CP_R;
  const G = FG, T = MODEL.track;
  const road = trRoute(G.ROAD, 6);
  let sDepot = 0, best = 1e9;
  for (let s = 0; s <= road.length; s += 0.25) { const d = Math.abs(road.at(s).x - G.DEPOT_X); if (d < best) { best = d; sDepot = s; } }
  const s0 = sDepot + G.START_GAP;                                   // start line (distance 0 from the rear base)
  const sObj = s0 + (T.objective - T.start) * G.K;                   // the objective
  const sFwd = sDepot + (T.sledFwd - T.sledRear) * G.K;              // the forward base site
  let sBridge = 0;
  for (let s = 0; s <= road.length; s += 0.5) { const p = road.at(s); if (p.x < G.STREAM(p.y)) sBridge = s; }
  // the column's assembly area beside the start line: three company groups
  const a = road.at(s0), F = fdFrame(a.x, a.y, a.face);
  const assembly = [[-6, -16], [-14, -16], [-22, -16], [-6, -30], [-14, -30], [-22, -30], [-32, -18], [-32, -28], [-40, -23]].map(([u, v]) => F(u, v));
  CP_R = { road, sDepot, s0, sObj, sFwd, sBridge, assembly };
  return CP_R;
}
// Road distance of the column's lead for the model's carriage front x, and of the base for the sled.
const leadS = (x) => roads().s0 + (x - MODEL.track.start) * FG.K;
const baseS = (sled) => roads().sDepot + (sled - MODEL.track.sledRear) * FG.K;
// The inverse, for the pointer: the model's carriage front for a field point near the road.
export function fieldNearest(x, y) {
  const R = roads();
  let bs = 0, bd = 1e9;
  for (let s = 0; s <= R.road.length; s += 1) { const p = R.road.at(s), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; bs = s; } }
  return { x: MODEL.track.start + (bs - R.s0) / FG.K, off: bd };
}
// A point beside the road at distance s: u along it, v to its left (positive) or right.
const beside = (s, u = 0, v = 0) => { const p = roads().road.at(s); const [x, y] = fdFrame(p.x, p.y, p.face)(u, v); return { x, y, face: p.face }; };

// ---------- local drawing helpers ----------

// A supply truck at the origin facing `face`: cab, cargo box and chassis, about 7 units long. Drawn
// inside a <g class="tr-s" data-side> like a vehicle, so it takes the side's tint. (Same drawing as
// the supply trucks in Fig 3, turning-movement/scripts/field-scene.mjs.)
export function cpTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, boxRing(F, u0, u1, v0, v1), z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(boxRing(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

// A vehicle fighting position: a dark scrape and an earth berm across the front with short side arms,
// as two items keyed either side of the centre so a vehicle keyed at the centre sorts between them.
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

// A stack of supply crates at (x, y): two courses of small boxes with a seam round each.
function crates(K, P, x, y, face) {
  const F = fdFrame(x, y, face);
  const boxes = [[-3, 0, -2, 0, 0], [0.4, 3.4, -2, 0, 0], [-3, 0, 0.4, 2.4, 0], [0.4, 3.4, 0.4, 2.4, 0], [-1.4, 1.8, -1, 1.4, 2]];
  const svg = boxes.map(([u0, u1, v0, v1, z]) => ({ c: F((u0 + u1) / 2, (v0 + v1) / 2), z, ring: boxRing(F, u0, u1, v0, v1) }))
    .sort((a, b) => K.depthOf([a.c[0], a.c[1], a.z], P) - K.depthOf([b.c[0], b.c[1], b.z], P))
    .map((b) => trPrism(K, P, b.ring, b.z, b.z + 2, false)).join("");
  return { key: K.depthOf([x, y, 0], P), svg: `<path class="tr-shadow" d="${K.onTop(boxRing(F, -3.8, 4.2, -2.8, 3.2), 0, P, true)}"/><g class="tr-p tr-bag">${svg}</g>` };
}

// The bridge where the road crosses the stream: a deck on two piers with low kerbs.
function bridge(K, P, road, sBridge) {
  const a = road.at(sBridge - 8), b = road.at(sBridge + 8);
  const ang = Math.atan2(b.y - a.y, b.x - a.x) / CP_RAD;
  const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
  const F = fdFrame(mid[0], mid[1], ang);
  const L = Math.hypot(b.x - a.x, b.y - a.y) / 2;
  const svg = [-4, 4].map((u) => K.solidSvg(K.extrude(boxRing(F, u - 0.9, u + 0.9, -3.4, 3.4), 0, 0.9, P), { tone: "lo", crease: "none" })).join("") +
    K.solidSvg(K.extrude(boxRing(F, -L, L, -4, 4), 0.9, 0.7, P), { tone: "mid", className: "tr-wall" }) +
    [-1, 1].map((sv) => K.solidSvg(K.extrude(boxRing(F, -L, L, sv * 4 - 0.35, sv * 4 + 0.35), 1.6, 0.8, P), { tone: "mid", crease: "none", className: "tr-wall" })).join("");
  return { key: K.depthOf([mid[0], mid[1], 0], P), svg };
}

// Enemy positions on the objective's hill, facing back down the road (west), and where they fall back to.
const EN_PITS = [[100, -24], [104, -40], [112, -54], [124, -30], [132, -46]];
const SCREEN_N = 3;
const KO_J = [1, 2, 4, 7];                      // which of the battalion's vehicles are knocked out, in order
// The carriage front at which the notional losses (model.mjs) first reach `n` on side `side`, with the
// base at `sled`; null if they never do on the way to the objective.
function lossAt(side, n, sled) {
  for (let x = MODEL.track.start; x <= MODEL.track.objective; x += 1) if (losses(x, sled)[side] >= n) return x;
  return null;
}

export function fieldStatic(K, P, T) {
  const G = FG, R = roads();
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadows and fields toward the edges
  for (const [cx, cy, r, seed, sq] of [[-90, -40, 50, 3, 0.6], [30, 60, 46, 5, 0.6], [-250, -60, 50, 7, 0.8], [180, 60, 44, 9, 0.8], [40, -70, 30, 11, 0.7]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-260, 70], [-196, 76], [-200, 122], [-266, 114]], 8, "a"],
    [[[-240, -40], [-180, -36], [-186, 4], [-246, -2]], 7, "b"],
    [[[100, 40], [168, 34], [172, 80], [104, 86]], 8, "a"],
    [[[180, -120], [246, -126], [250, -80], [184, -74]], 8, "b"],
    [[[60, -160], [120, -164], [122, -116], [62, -112]], 7, "a"],
    [[[-10, 100], [40, 98], [36, 132], [-14, 134]], 6, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // the stream, the road, and farm tracks
  const streamPts = [];
  for (let y = -420; y <= 420; y += 20) streamPts.push([G.STREAM(y), y]);
  g(trStream(K, P, streamPts, 4.5, 7));
  g(trRoad(K, P, G.ROAD, 3.4));
  g(trRoad(K, P, [[-34, -240], [-22, -150], [-12, -40], [-6, 12], [2, 120], [10, 240]], 2.2, { ruts: false }));
  g(trRoad(K, P, [[150, -220], [146, -120], [150, -16], [156, 80], [170, 220]], 2.2, { ruts: false }));

  // woods: one the road runs through between the bridge and the objective, copses toward the edges
  const roadPts = R.road.line;
  const nearRoad = (x, y, d) => roadPts.some((p) => Math.hypot(p[0] - x, p[1] - y) < d);
  const clear = (x, y) => nearRoad(x, y, 15) || Math.abs(x - G.STREAM(y)) < 10;
  const woods = [
    [fdBlob(36, -58, 30, 21, 0.1, 44, 0.75), 20, 21],
    [fdBlob(-50, 92, 32, 22, 0.12, 40, 0.6), 16, 22],
    [fdBlob(-220, -110, 40, 23, 0.12, 40, 0.7), 20, 23],
    [fdBlob(220, -40, 34, 24, 0.12, 40, 0.8), 16, 24],
    [fdBlob(-10, -190, 46, 25, 0.12, 40, 0.6), 18, 25],
    [fdBlob(-280, 150, 40, 26, 0.12, 40, 0.8), 16, 26],
    [fdBlob(200, 150, 40, 27, 0.12, 40, 0.8), 14, 27],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 6.2, r: [2.8, 4.4], h: [8, 12], avoid: (x, y) => clear(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-260, 70], [-196, 76], [-200, 122]], 51], [[[100, 40], [168, 34]], 53], [[[180, -120], [246, -126]], 54]]) items.push(...trHedge(K, P, pts, { seed }));

  // the rear depot: sheds and crate stacks beside the road
  const dep = (u, v) => beside(R.sDepot, u, v);
  for (const [u, v, len, wid, rot] of [[-16, 36, 16, 8, 0], [4, 38, 14, 8, 0], [-26, 52, 12, 7, 90]]) { const p = dep(u, v); items.push(trHouse(K, P, p.x, p.y, p.face + rot, len, wid)); }
  for (const [u, v] of [[18, 26], [24, 32], [-22, 22]]) { const p = dep(u, v); items.push(crates(K, P, p.x, p.y, p.face)); }
  // the village round the objective, farms elsewhere
  for (const [x, y, a, l, w] of [[96, 14, 0, 10, 7], [112, 12, 90, 9, 6.5], [128, 8, 0, 11, 7], [140, 20, 90, 9, 6.5], [-40, 46, 10, 11, 7], [-232, 10, 0, 10, 7], [190, -60, 90, 10, 7]]) items.push(trHouse(K, P, x, y, a, l, w));
  items.push(bridge(K, P, R.road, R.sBridge));

  g(trRelief(K, P, T));

  // the enemy's prepared positions on the hill
  for (const [x, y] of EN_PITS) items.push(...scrape(K, P, x, y, T.height(x, y), 190));

  // control measures: the start line across the road, the forward base site outline, the objective flag
  const a = beside(R.s0), F = fdFrame(a.x, a.y, a.face);
  const ld = trChalk(K, P, T, [F(0, -34), F(0, -18), F(0, 12), F(0, 26)]);
  g(ld.ground); items.push(...ld.items);
  const site = [[-14, 10], [14, 10], [14, 30], [-14, 30]].map(([u, v]) => { const p = beside(R.sFwd, u, v); return [p.x, p.y]; });
  const fb = trChalk(K, P, T, site, { closed: true });
  g(fb.ground); items.push(...fb.items);
  items.push(trObjective(K, P, T, 116, -40, { h: 13, ang: 200 }));
  return { ground: ground.join(""), items };
}

// Where every vehicle stands and who fires at whom, for a model state. M carries what the page
// measures between frames: lap (the supply trucks' shuttle phase), halt (the culminated column's
// deployment, eased) and move (the base on the move, eased). Defaults serve the build's first frame.
export function fieldPose(S, T, M = {}) {
  const G = FG, R = roads(), TR = MODEL.track;
  const units = [];
  const add = (u) => { u.z = T.height(u.x, u.y); units.push(u); };
  const lim = limitOf(S.sled);
  const culminated = S.x >= lim - 0.5 && lim < TR.objective - 0.05 && S.target > S.x + 0.5;
  const halt = M.halt ?? (culminated ? 1 : 0);
  const sl = leadS(S.x);
  const seize = smooth01(R.sObj - 26, R.sObj, sl);                 // the lead closing on the objective

  // --- losses: knocked-out vehicles stay where they were hit, greyed (counts from model.mjs, notional) ---
  const lost = { blue: M.lostB ?? losses(S.x, S.sled).blue, red: M.lostR ?? losses(S.x, S.sled).red };
  const nB = Math.min(KO_J.length, Math.floor(lost.blue / LOSS.perVehicle));
  const nR = Math.min(SCREEN_N + EN_PITS.length, Math.floor(lost.red / LOSS.perRedVehicle));
  const koB = new Map();
  for (let k = 0; k < nB; k++) {
    const xk = lossAt("blue", (k + 1) * LOSS.perVehicle, S.sled) ?? S.x;
    const j = KO_J[k];
    const sk = Math.max(R.s0 + 4, leadS(xk) - j * G.GAP - Math.floor(j / 3) * G.CO_GAP);
    const p = beside(sk, 0, (k % 2 ? 1 : -1) * 4.5);
    koB.set(j, { x: p.x, y: p.y, face: p.face + (k % 2 ? 28 : -28), s: sk });
  }

  // --- the attacking battalion (main effort, lit): march column on the road ---
  const lead = R.road.at(sl);
  let tailS = sl;
  for (let j = 0; j < 9; j++) {
    if (koB.has(j)) { const ko = koB.get(j); add({ id: `b${j}`, kind: "v", side: "fk", face: ko.face, x: ko.x, y: ko.y, j, ko: true }); continue; }
    const sj = sl - j * G.GAP - Math.floor(j / 3) * G.CO_GAP;
    let x, y, face;
    if (sj >= R.s0) { const p = R.road.at(sj); x = p.x; y = p.y; face = p.face; tailS = sj; }
    else {
      const st = R.road.at(R.s0), w = smooth01(R.s0 - 40, R.s0, sj);
      [x, y] = lerp2(R.assembly[j], [st.x, st.y], w);
      face = st.face;
    }
    if (halt > 0) {                                              // culminated: go over to a hasty defense
      const F = fdFrame(lead.x, lead.y, lead.face);
      const c = Math.floor(j / 3), i = j % 3;
      const spot = c === 0 ? F(-4 - (i === 1 ? 0 : 5), (i - 1) * 14) : F(-24 - (c - 1) * 22 - i * 6, (i % 2 ? 1 : -1) * (8 + c * 2));
      const want = c === 0 ? lead.face : lead.face + (i % 2 ? 50 : -50);
      [x, y] = lerp2([x, y], spot, halt);
      face = angLerp(face, want, smooth01(0.2, 1, halt));
    }
    if (seize > 0) {                                             // on the objective: deploy round the hill
      const spots = [[100, -24, 0], [112, -54, 0], [124, -30, 0], [104, -40, 0], [132, -46, 0], [92, -6, 300], [80, -14, 200], [84, 6, 160], [70, -2, 180]];
      const d = spots[j];
      const w = smooth01(0.4, 1, seize);
      [x, y] = lerp2([x, y], [d[0] + 8, d[1]], w);
      face = angLerp(face, d[2] || lead.face, w);
    }
    add({ id: `b${j}`, kind: "v", side: "f", lit: true, face, x, y, j });
  }

  // --- the base: four trucks parked at the depot or the forward site, in column on the road while it moves ---
  const sb = baseS(S.sled);
  const move = M.move ?? 0;
  [[-6, 14], [4, 14], [-6, 21], [4, 21]].forEach(([u, v], i) => {
    const park = beside(sb, u, v), onRoad = beside(sb - i * 9, 0, -2.2);
    const [x, y] = lerp2([park.x, park.y], [onRoad.x, onRoad.y], move);
    add({ id: `p${i}`, kind: "t", side: "f", face: park.face, x, y });
  });

  // --- the supply trucks: four shuttling between the base and the column's tail ---
  const from = sb + 6, to = Math.max(from + 4, tailS - 10);
  for (let i = 0; i < 4; i++) {
    const ph = ((((M.lap ?? 0) + i / 4) % 1) + 1) % 1;
    let s, out;
    if (ph < 0.45) { s = from + (ph / 0.45) * (to - from); out = true; }
    else if (ph < 0.5) { s = to; out = false; }
    else if (ph < 0.95) { s = to - ((ph - 0.5) / 0.45) * (to - from); out = false; }
    else { s = from; out = true; }
    const p = beside(s, 0, out ? -2.2 : 2.2);
    add({ id: `k${i}`, kind: "t", side: "f", face: p.face + (out ? 0 : 180), x: p.x, y: p.y });
  }
  // --- casualty evacuation: an ambulance runs between the latest knocked-out vehicle and the base ---
  if (nB > 0) {
    const ko = koB.get(KO_J[nB - 1]);
    const a0 = from, a1 = Math.max(a0 + 4, ko.s - 6);
    const ph = ((((M.lap ?? 0) * 1.3 + 0.6) % 1) + 1) % 1;
    const out = ph < 0.5;
    const s = out ? a0 + (ph / 0.45) * (a1 - a0) : a1 - ((ph - 0.5) / 0.45) * (a1 - a0);
    const p = beside(Math.min(a1, Math.max(a0, s)), 0, out ? -2.2 : 2.2);
    add({ id: "m0", kind: "t", side: "m", face: p.face + (out ? 0 : 180), x: p.x, y: p.y });
  }

  // --- the enemy: a covering force falling back ahead of the column, and the defenders on the hill ---
  const scrS = Math.min(R.sObj - 30, Math.max(R.s0 + G.SCREEN_HOLD, sl + G.SCREEN_AHEAD));
  for (let i = 0; i < SCREEN_N; i++) {
    if (i < nR) {                                                 // knocked out where it stood when hit
      const xk = lossAt("red", (i + 1) * LOSS.perRedVehicle, S.sled) ?? S.x;
      const sk = Math.min(R.sObj - 30, Math.max(R.s0 + G.SCREEN_HOLD, leadS(xk) + G.SCREEN_AHEAD));
      const p = beside(sk + i * 8, 0, (i - 1) * 9 + 3);
      add({ id: `c${i}`, kind: "v", side: "hk", face: p.face + 160, x: p.x, y: p.y, ko: true });
      continue;
    }
    const p = beside(scrS + i * 8, 0, (i - 1) * 9);
    const back = beside(R.sObj + 70 + i * 10, 0, (i - 1) * 8);
    const [x, y] = lerp2([p.x, p.y], [back.x, back.y], seize);
    add({ id: `c${i}`, kind: "v", side: "h", face: angLerp(p.face + 180, back.face, seize > 0.02 ? 1 : 0), x, y });
  }
  EN_PITS.forEach(([px, py], i) => {
    if (i + SCREEN_N < nR) { add({ id: `e${i}`, kind: "v", side: "hk", face: 205, x: px, y: py, ko: true }); return; }
    const back = beside(R.sObj + 64 + i * 9, 0, 14 + (i % 2) * 8);
    const [x, y] = lerp2([px, py], [back.x, back.y], seize);
    add({ id: `e${i}`, kind: "v", side: "h", face: seize > 0.02 ? back.face : 190, x, y, dug: seize < 0.02 });
  });

  // --- fire ---
  const streams = [];
  const by = (p) => units.filter((u) => u.id.startsWith(p));
  const gunAt = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(4.2, 0), u.z + 3.1]; };
  const aim = (u) => [u.x, u.y, u.z + 1.8];
  const front = by("b").filter((u) => u.j < 3 && !u.ko);
  const screen = by("c").filter((u) => !u.ko);
  const live = 1 - seize;
  const near = smooth01(R.sObj - 80, R.sObj - 40, sl) * live;    // the hill's defenders in range of the lead
  const contact = sl > R.s0 + 4 ? live : 0;
  front.forEach((u, i) => streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: [...screen, ...(near > 0.3 ? by("e").filter((u) => !u.ko) : [])].map(aim), period: 2.3 + i * 0.27, burst: 1, gap: 0, flight: 0.5, phase: i * 0.61, on: 0.75 * contact, scatter: 3 }));
  screen.forEach((u, i) => streams.push({ id: u.id, side: "h", heavy: true, from: gunAt(u), to: front.map(aim), period: 2.7 + i * 0.31, burst: 1, gap: 0, flight: 0.5, phase: 0.4 + i * 0.47, on: 0.7 * contact, scatter: 3 }));
  by("e").filter((u) => !u.ko).forEach((u, i) => { if (i % 2 === 0) streams.push({ id: u.id, side: "h", heavy: true, from: gunAt(u), to: front.map(aim), period: 3.1 + i * 0.19, burst: 1, gap: 0, flight: 0.6, phase: 0.2 + i * 0.37, on: 0.8 * near, scatter: 3 }); });
  return { units, streams: streams.filter((st) => st.to.length), halt, seize, culminated, sl, sb, nB, nR };
}

// Per-state ground marks: the defenders' fire sector off the hill toward the road (gone once they
// fall back), and the halted column's sector forward of its lead company (only while culminated).
export function fieldMarks(K, P, T, pose) {
  const lead = roads().road.at(pose.sl);
  return trFan(K, P, T, 108, -34, 18, 70, 150, 215, { side: "h", arcs: 2, alpha: 0.8 * (1 - pose.seize) }) +
    trFan(K, P, T, lead.x, lead.y, 8, 40, lead.face - 30, lead.face + 30, { side: "f", arcs: 1, alpha: 0.7 * smooth01(0.4, 1, pose.halt) });
}
