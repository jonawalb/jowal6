// The Battlefield view of the Center of Gravity, at operational scale, drawn with the terrain kit
// (../../kit/terrain.mjs). Units are battalions shown as clusters of vehicles, one vehicle per platoon
// (trBattalion's convention). The arch maps onto an enemy force whose cohesion rests on one hub:
//   keystone   the enemy's armored reserve (a tank battalion) parked at the crossroads behind its centre,
//              the "powerful element" JP 5-0 says an operational COG is often associated with (lit)
//   voussoirs  the three mechanized battalions holding the forward arc, which hold only while the
//              reserve can reach any of them (the model's analogy, not a doctrinal claim)
//   puller     a friendly armored battalion that has worked round the southern flank and strikes the
//              reserve from an attack-by-fire position; a friendly mechanized battalion fixes the front
// The same model state S as the machine drives it:
//   S.e        keystone lift: the strike's progress. The share of the reserve still fighting is the
//              machine's ring-load share, bearing(S.e); the rest of its vehicles are knocked out
//   S.c, S.collapsing, S.rebuilding   collapse and rebuild: the forward battalions lose cohesion and
//              fall back (centre to the rear, flanks to their flank anchors), and Rebuild resets the battle
// M carries what the page measures between frames: t (seconds, for the fire) and k (0..1, the collapse
// eased in time, with kdir -1 while the battle resets). Defaults serve the build's first frame.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame, fdPolar } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trObjective, trRoute, trPrism } from "../../kit/terrain.mjs";
import { MODEL, bearing, losses } from "./model.mjs";

export const FG = {
  world: { x: -470, y: -430, w: 940, d: 860 },
  HUB: [-78, 0],                   // the crossroads behind the enemy's centre
  ARC_R: 118,                      // radius of the enemy's forward arc about the hub
  COY: [-60, -45, -30, -15, 0, 15, 30, 45, 60], // company bearings on the arc (three per battalion)
  VEH: 9,                          // vehicle interval inside a company
  RESERVE: [[-104, -16], [-104, 0], [-104, 16], [-118, -16], [-118, 0], [-118, 16], [-132, -16], [-132, 0], [-132, 16]],
  STRIKE0: [-110, 130],             // the strike force's attack-by-fire position (centre) at lift 0
  STRIKE1: [-116, 94],              // where it has bounded to by the failure point
  STRIKE_FACE: 270,                // its facing: toward the reserve
  FIX_X: 126,                      // the fixing battalion's line
  RETREAT: [[-162, -88], [-206, -40], [-200, 32]], // where each forward battalion falls back to (north, centre, south)
  STAGGER: 0.05,                   // stagger of the vehicles pulling out (share of the move)
  ABANDON: [4, 13, 22],            // forward vehicles left behind, stopped, when the arc falls back
  FIX_HIT: 4,                      // the fixing-force vehicle hit
  EVAC: [[-104, 140], [-80, 142], [-58, 150], [-20, 166]], // casualty evacuation road, strike force to the rear
  EVAC_PERIOD: 14,                 // seconds for the evacuation vehicle's round trip
};
FG.TERRAIN = {
  rises: [
    { cx: -112, cy: 110, r: 36, steps: 2, h: 1.4, top: 0.62, seed: 5, wobble: 0.08, squash: 0.8 },
    { cx: 196, cy: 150, r: 30, steps: 3, h: 1.6, top: 0.45, seed: 21, wobble: 0.12 },
    { cx: -250, cy: 150, r: 38, steps: 3, h: 1.7, top: 0.45, seed: 31, wobble: 0.1, squash: 0.8 },
    { cx: 170, cy: -96, r: 30, steps: 3, h: 1.6, top: 0.45, seed: 41, wobble: 0.12 },
    { cx: -246, cy: -70, r: 32, steps: 3, h: 1.6, top: 0.5, seed: 47, wobble: 0.1 },
  ],
};

const CG_RAD = Math.PI / 180;
const cgClamp = (x) => Math.min(1, Math.max(0, x));
const cgSmooth = (a, b, x) => { const t = cgClamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const cgLerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const cgAng = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- layout (shared by build and page; built once) ----------
let CG_L = null;
function layout() {
  if (CG_L) return CG_L;
  const G = FG;
  // the forward arc: nine companies of three vehicles, facing out from the hub
  const pits = [];
  G.COY.forEach((b, c) => {
    const F = fdFrame(...fdPolar(G.HUB[0], G.HUB[1], G.ARC_R, b), b);
    [-1, 0, 1].forEach((j) => { const [x, y] = F(j === 0 ? 2.5 : 0, j * G.VEH); pits.push({ bn: Math.floor(c / 3), c, j, b, x, y }); });
  });
  // each vehicle's road back: straight back off its position, then to its battalion's rally area
  const back = pits.map((p, i) => {
    const R = G.RETREAT[p.bn];
    const F = fdFrame(p.x, p.y, p.b);
    const spot = [R[0] + ((i * 37) % 9 - 4) * 4.2 + (p.c % 3 - 1) * 9, R[1] + ((i * 53) % 7 - 3) * 4.6 + (p.c % 3 - 1) * 5];
    return trRoute([[p.x, p.y], F(-12, 0), cgLerp(F(-12, 0), spot, 0.5), spot], 4);
  });
  // the fixing battalion: three companies abreast facing the enemy's centre
  const fix = [];
  [-36, 0, 36].forEach((cy) => [-1, 0, 1].forEach((j) => fix.push([G.FIX_X + (j === 0 ? -2.5 : 0), cy + j * G.VEH])));
  // the strike force: three companies in an attack-by-fire line, offsets in its own frame
  const strike = [];
  [[0, -20], [0, 0], [0, 20]].forEach(([u, v]) => [-1, 0, 1].forEach((j) => strike.push([u + (j === 0 ? 2.5 : -1), v + j * G.VEH * 0.85])));
  // the reserve is knocked out nearest-the-strike first
  const s1 = G.STRIKE1;
  const koOrder = G.RESERVE.map((p, i) => i).sort((a, b) => Math.hypot(G.RESERVE[a][0] - s1[0], G.RESERVE[a][1] - s1[1]) - Math.hypot(G.RESERVE[b][0] - s1[0], G.RESERVE[b][1] - s1[1]));
  const koRank = [];
  koOrder.forEach((ri, n) => { koRank[ri] = n; });
  CG_L = { pits, back, fix, strike, koRank };
  return CG_L;
}

// A vehicle fighting position at (x, y) on ground z facing `face`: a dark scrape and an earth berm
// across the front with short side arms (as Fig 3). Two items keyed either side of the centre, so a
// vehicle keyed at the centre sorts between the scrape and the front berm.
const cgBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
function cgScrape(K, P, x, y, z, face) {
  const F = fdFrame(x, y, face);
  const key0 = K.depthOf([x, y, 0], P);
  const pit = `<path class="tr-pit" d="${K.onTop(cgBox(F, -5.2, 4.6, -3.2, 3.2), z + 0.03, P, true)}"/>`;
  const banks = [[4.8, 6.4, -4.2, 4.2], [-2.6, 4.8, 3.4, 4.6], [-2.6, 4.8, -4.6, -3.4]].map(([u0, u1, v0, v1]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return { near: K.depthOf([c[0], c[1], 0], P) > key0, svg: trPrism(K, P, cgBox(F, u0, u1, v0, v1), z, z + 1.3) };
  });
  const wrap = (list) => (list.length ? `<g class="tr-p tr-bag">${list.map((b) => b.svg).join("")}</g>` : "");
  return [
    { key: key0 - 6, svg: pit + wrap(banks.filter((b) => !b.near)) },
    { key: key0 + 6, svg: wrap(banks.filter((b) => b.near)) },
  ];
}

// A wheeled vehicle at the origin facing `face` (the casualty evacuation vehicle): cab, box body and
// chassis, drawn inside a <g class="tr-s" data-side> like a soldier so it takes the side's tint.
export function cgTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, cgBox(F, u0, u1, v0, v1), z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(cgBox(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

export function fieldStatic(K, P, T) {
  const G = FG, L = layout();
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadows and fields, toward the edges
  for (const [cx, cy, r, seed, sq] of [[40, 60, 56, 3, 0.7], [-150, 200, 70, 5, 0.5], [-210, -40, 50, 7, 0.8], [210, 20, 50, 9, 0.8], [-20, -60, 30, 11, 0.6]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[150, -60], [222, -52], [216, 0], [148, -8]], 9, "a"],
    [[[160, 40], [232, 48], [226, 100], [156, 92]], 8, "b"],
    [[[40, 176], [116, 172], [120, 226], [44, 232]], 9, "b"],
    [[[-300, 30], [-226, 36], [-232, 90], [-306, 82]], 8, "a"],
    [[[-310, -150], [-236, -146], [-240, -100], [-314, -106]], 8, "b"],
    [[[-180, 170], [-110, 176], [-116, 226], [-188, 220]], 8, "a"],
    [[[60, -230], [140, -226], [136, -186], [56, -190]], 8, "b"],
    [[[-150, -260], [-76, -254], [-82, -206], [-156, -212]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // the river that anchors the enemy's northern flank, the main road through the hub, and the
  // tracks from the hub out to each battalion (the reserve's counterattack routes)
  const river = [[-480, -214], [-330, -182], [-200, -150], [-100, -134], [-20, -138], [60, -156], [150, -186], [260, -204], [480, -236]];
  g(trStream(K, P, river, 5, 5));
  g(trRoad(K, P, [[-480, 18], [-300, 12], [-200, 4], [-130, 0], G.HUB, [-20, 0], [40, 2], [120, 0], [260, -6], [480, -14]], 3.4));
  for (const b of [-45, 45]) {
    const end = fdPolar(G.HUB[0], G.HUB[1], G.ARC_R - 14, b);
    g(trRoad(K, P, [G.HUB, fdPolar(G.HUB[0], G.HUB[1], 40, b * 0.8), end], 2.2, { ruts: false }));
  }
  g(trRoad(K, P, [G.HUB, [-92, -44], [-124, -76], [-162, -88]], 2.2, { ruts: false }));
  g(trRoad(K, P, [[180, 300], [120, 220], [60, 186], [-10, 170], [-58, 150], [-80, 140], [-160, 120], [-250, 100], [-480, 90]], 2.6));

  // woods and copses, clear of every unit, route and the river banks
  const keep = [
    ...L.pits.map((p) => [p.x, p.y, 13]), ...G.RESERVE.map(([x, y]) => [x, y, 14]), ...L.fix.map(([x, y]) => [x, y, 12]),
    ...G.RETREAT.map(([x, y]) => [x, y, 46]), [G.HUB[0], G.HUB[1], 24],
  ];
  L.back.forEach((r) => r.line.forEach(([x, y], i) => { if (i % 3 === 0) keep.push([x, y, 10]); }));
  for (let t = 0; t <= 1; t += 0.1) keep.push([...cgLerp(G.STRIKE0, G.STRIKE1, t), 34]);
  const clear = (x, y) => keep.some(([kx, ky, r]) => Math.hypot(kx - x, ky - y) < r) || river.some((p) => Math.hypot(p[0] - x, p[1] - y) < 26) ||
    Math.abs(y) < 9 && x > -470 || trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  const woods = [
    [fdBlob(14, 128, 40, 21, 0.12, 40, 0.7), 30, 21],
    [fdBlob(-196, 100, 28, 22, 0.12, 40, 0.8), 14, 22],
    [fdBlob(-180, -120, 36, 23, 0.12, 40, 0.6), 18, 23],
    [fdBlob(80, -96, 34, 24, 0.12, 40, 0.7), 18, 24],
    [fdBlob(250, -40, 40, 25, 0.12, 40, 0.8), 18, 25],
    [fdBlob(-300, -10, 34, 26, 0.12, 40, 0.8), 14, 26],
    [fdBlob(120, 120, 26, 27, 0.12, 40, 0.8), 10, 27],
    [fdBlob(-20, 230, 36, 28, 0.12, 40, 0.7), 16, 28],
    [fdBlob(-60, -230, 40, 29, 0.12, 40, 0.6), 16, 29],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 6.4, r: [3, 4.6], h: [8, 12.5], avoid: clear });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // hedgerows along some fields
  for (const [pts, seed] of [
    [[[148, -8], [150, -60], [222, -52]], 51], [[[156, 92], [160, 40]], 52], [[[44, 232], [40, 176], [116, 172]], 53],
    [[[-226, 36], [-300, 30]], 54], [[[-180, 170], [-110, 176]], 55],
  ]) items.push(...trHedge(K, P, pts, { seed }));

  // the village at the crossroads (the hub), a farm behind the friendly line
  items.push(
    trHouse(K, P, -70, -17, 0, 10, 7), trHouse(K, P, -88, -18, 90, 9, 6.5), trHouse(K, P, -66, 16, 0, 11, 7), trHouse(K, P, -86, 19, 90, 8, 6),
    trHouse(K, P, 196, -24, 10, 12, 8), trHouse(K, P, 212, -40, 100, 9, 6.5),
  );

  // the relief, drawn over the flat cover
  g(trRelief(K, P, T));

  // the enemy's prepared positions on the arc
  for (const p of L.pits) items.push(...cgScrape(K, P, p.x, p.y, T.height(p.x, p.y), p.b));

  // control measures: the strike force's attack-by-fire position, and the objective flag on the reserve
  const F = fdFrame(...cgLerp(G.STRIKE0, G.STRIKE1, 0.5), G.STRIKE_FACE);
  const abf = trChalk(K, P, T, [F(-22, -36), F(24, -36), F(24, 36), F(-22, 36)], { closed: true });
  g(abf.ground); items.push(...abf.items);
  items.push(trObjective(K, P, T, -142, -30, { h: 13, ang: 210 }));

  return { ground: ground.join(""), items };
}

// Where every vehicle stands and who fires at whom, for a model state.
export function fieldPose(S, GEO, T, M = {}) {
  const G = FG, L = layout();
  const units = [];
  const add = (u) => { u.z = T.height(u.x, u.y); units.push(u); };
  const down = S.c > 0 || S.collapsing;
  const b = down ? 0 : bearing(S.e, MODEL);                       // the machine's ring-load share
  const k = M.k ?? (down && !S.rebuilding ? 1 : 0);              // the forward battalions' collapse, eased
  const kback = (M.kdir ?? 1) < 0;
  const strikeOn = cgSmooth(0.15, 1.2, Math.min(S.e, MODEL.EC)) * (down ? 0 : 1);

  // --- the enemy reserve (lit): a tank battalion; the share still fighting is b, the rest knocked out ---
  const LS = losses(S.e, down, MODEL);
  const alive = 9 - LS.reserve;
  const sp = cgLerp(G.STRIKE0, G.STRIKE1, cgSmooth(0, MODEL.EC, Math.min(S.e, MODEL.EC)));
  G.RESERVE.forEach(([x, y], i) => {
    const ko = L.koRank[i] < 9 - alive;                            // nearest the strike go first
    const turn = cgAng(0, Math.atan2(sp[1] - y, sp[0] - x) / CG_RAD, cgSmooth(0, 0.5, strikeOn));  // live tanks turn to meet the strike
    add({ id: `r${i}`, side: ko ? "kh" : "h", lit: !ko, face: ko ? turn + (i % 3) * 25 - 25 : turn, x, y, ko });
  });

  // --- the forward arc: three mechanized battalions; they hold until the reserve is gone, then fall back ---
  const n = L.pits.length, span = 1 + (n - 1) * G.STAGGER;
  // the order they pull out: centre first (the crown drops), flanks last
  L.pits.forEach((p, i) => {
    if (LS.front && G.ABANDON.includes(i)) { add({ id: `e${i}`, side: "kh", face: p.b + 20, x: p.x, y: p.y, q: 0, b: p.b, held: false, ko: true }); return; }
    const rank = Math.abs(p.c - 4) * 3 + (p.j + 1);
    const q = cgSmooth(0, 1, k * span - rank * G.STAGGER);
    const r = L.back[i], at = r.at(q * r.length);
    let face = at.face + (kback && q > 0.02 && q < 0.98 ? 180 : 0);
    if (q < 0.05) face = cgAng(p.b, face, q / 0.05);
    if (q > 0.95) face = cgAng(face, face + ((i * 47) % 70) - 35, (q - 0.95) / 0.05); // scattered, facing every way
    add({ id: `e${i}`, side: "h", face, x: at.x, y: at.y, q, b: p.b, held: q < 0.01 });
  });

  // --- the fixing battalion: holds its line in front of the enemy's centre ---
  L.fix.forEach(([x, y], i) => { const hit = i === G.FIX_HIT && LS.fix > 0; add({ id: `f${i}`, side: hit ? "kf" : "f", face: hit ? 165 : 180 + ((i * 29) % 11) - 5, x: x + ((i * 13) % 5) - 2, y, ko: hit }); });

  // --- the strike force: an armored battalion bounding closer to the reserve as the strike goes in ---
  const SF = fdFrame(sp[0], sp[1], G.STRIKE_FACE);
  // the strike force's losses are the vehicles nearest the reserve (front rank, middles first)
  const sHit = [1, 4, 7].slice(0, LS.strike);
  L.strike.forEach(([u, v], i) => {
    const hit = sHit.includes(i);
    const [x, y] = SF(u + ((i * 17) % 5) - 2 - (hit ? 3 : 0), v);   // uneven line; the hit ones stopped short
    add({ id: `s${i}`, side: hit ? "kf" : "f", face: G.STRIKE_FACE + (hit ? 18 : ((i * 23) % 9) - 4), x, y, ko: hit });
  });
  // casualty evacuation: once the strike force has losses, a vehicle shuttles them back to the rear
  if (LS.blue > 0) {
    const R = layout().evac || (layout().evac = trRoute(G.EVAC, 4));
    const ph = (((M.t ?? 0) / G.EVAC_PERIOD) % 1 + 1) % 1, out = ph < 0.5;
    const at = R.at((out ? ph / 0.5 : 1 - (ph - 0.5) / 0.5) * R.length);
    const F = fdFrame(at.x, at.y, at.face), [x, y] = F(0, out ? -2.2 : 2.2);
    add({ id: "m0", kind: "t", side: "f", face: at.face + (out ? 0 : 180), x, y });
  }

  // --- fire ---
  const streams = [];
  const by = (p) => units.filter((u) => u.id.startsWith(p));
  const gunAt = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(4.2, 0), u.z + 3.1]; };
  const aim = (u) => [u.x, u.y, u.z + 1.8];
  const within = (b0, b1, half) => Math.abs((((b1 - b0) % 360) + 540) % 360 - 180) < half;
  const held = by("e").filter((u) => u.held);
  const live = by("r").filter((u) => !u.ko);
  // the fixing battalion fires on the forward companies facing it; they fire back
  const front = held.filter((u) => within(u.b, 0, 40));
  by("f").forEach((u, i) => { if (i % 2 === 0 && !u.ko) streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: front.map(aim), period: 2.4 + i * 0.13, burst: 1, gap: 0, flight: 0.5, phase: i * 0.47, on: 0.85, scatter: 3 }); });
  front.forEach((u, i) => { if (i % 2 === 0) streams.push({ id: u.id, side: "h", heavy: true, from: gunAt(u), to: by("f").filter((f) => !f.ko).map(aim), period: 2.8 + i * 0.17, burst: 1, gap: 0, flight: 0.5, phase: 0.3 + i * 0.41, on: 0.75, scatter: 3 }); });
  // the strike force fires on the reserve: the vehicles still fighting and the one it is hitting next
  const strikeTo = live.filter((u) => L.koRank[Number(u.id.slice(1))] < 12 - alive).map(aim);
  by("s").forEach((u, i) => { if (i % 3 !== 2 && !u.ko) streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: strikeTo, period: 2.2 + i * 0.19, burst: 1, gap: 0, flight: 0.55, phase: i * 0.37, on: strikeOn * (live.length ? 0.9 : 0), scatter: 3 }); });
  // the reserve's tanks still fighting fire back at the strike force
  live.forEach((u, i) => { if (i % 2 === 0) streams.push({ id: u.id, side: "h", heavy: true, from: gunAt(u), to: by("s").filter((s) => !s.ko).map(aim), period: 2.7 + i * 0.21, burst: 1, gap: 0, flight: 0.55, phase: 0.5 + i * 0.33, on: 0.75 * strikeOn, scatter: 3 }); });
  return { units, streams, b, k, alive, strikeOn, sp, LS };
}

// Per-state ground marks: the enemy centre's fire sector toward the fixing battalion (fading as the
// arc falls back) and the strike force's sector onto the reserve (while it fires).
export function fieldMarks(K, P, T, pose) {
  const G = FG;
  const [sx, sy] = pose.sp;
  const toward = Math.atan2(G.RESERVE[4][1] - sy, G.RESERVE[4][0] - sx) / CG_RAD;
  return trFan(K, P, T, G.HUB[0] + G.ARC_R + 10, 0, 10, 52, -24, 24, { side: "h", arcs: 2, alpha: 0.8 * (1 - pose.k) }) +
    trFan(K, P, T, sx, sy, 22, Math.hypot(G.RESERVE[4][0] - sx, G.RESERVE[4][1] - sy) - 4, toward - 14, toward + 14, { side: "f", arcs: 1, alpha: 0.6 * pose.strikeOn * (pose.alive > 0 ? 1 : 0) });
}

// Smoke rising from every stopped vehicle (page only; added to the fire layer's smoke pool).
export function fieldSmoke(pose, t) {
  const out = [];
  const wrecks = pose.units.filter((u) => u.ko), n = wrecks.length > 10 ? 1 : 2;
  wrecks.forEach((u, i) => {
    for (let j = 0; j < n; j++) {
      const age = ((t / 4.2 + i * 0.37 + j / n) % 1 + 1) % 1;
      out.push({ p: [u.x - 2.2 * age * 4, u.y - 3.4 * age * 4, u.z + 2.5 + age * 9], age });
    }
  });
  return out;
}
