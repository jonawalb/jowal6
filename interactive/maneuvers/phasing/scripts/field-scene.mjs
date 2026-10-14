// The Battlefield view of Phasing and Transitions, at operational scale, drawn with the terrain kit
// (../../kit/terrain.mjs). One piece of ground, the same in every phase: a friendly base on the left,
// a chalk phase line, an enemy-held ridge and a town on the right. Each small vehicle stands for a
// platoon, each pair for a company, and each group of six for a battalion. Civil elements (aid
// trucks, local police and townspeople) come and go with the phase. The same model state S as the
// machine drives it: S.cur is the gear engaged (the phase). The page eases each unit toward where
// the phase wants it, so a transition (the clutch) shows as a visible shift in posture: units turn
// and move, and nobody fires until they are in place. Losses come from model.mjs (notional).
// fieldStatic() builds the ground and everything that never moves (build only); fieldTargets() says
// where each unit should be for a phase; fieldStep() eases the page's positions (page only);
// fieldPose() places every unit and fire stream; fieldMarks() draws the fire sectors.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trObjective, trRoute, trPrism, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";
import { lossesAt } from "./model.mjs";

export const FG = {
  A: 55,                 // field camera azimuth, degrees (the machine's own)
  ACT: 1.5,              // seconds of in-phase action once units are in place (notional display timing)
  HOLD: 0.5,             // tour: seconds held after the action before the next shift
  VEH_V: 120, MAN_V: 20, // top speeds while shifting posture, field units per second
  TRUCK_V: 46,           // supply-truck shuttle speed
  // roads, in screen-aligned ground coordinates (U to the right, V toward the viewer)
  MAIN: [[-420, 24], [-300, 22], [-200, 16], [-150, 8], [-90, 2], [-30, -2], [30, -4], [80, -6], [125, -10], [180, -16], [240, -20], [320, -26], [440, -30]],
  NS: [[136, -260], [132, -80], [128, -10], [132, 60], [140, 260]],
  PL: -40,               // the chalk phase line, U
};

const PH_RAD = Math.PI / 180;
const phSin = Math.sin(FG.A * PH_RAD), phCos = Math.cos(FG.A * PH_RAD);
// Screen-aligned ground coordinates (U right, V toward the viewer) to world x, y, and UV angles to world.
// The layout is drawn 0.88 x about (14, -8) so it fills the card (sizes of things are not scaled).
export const phR = (U, V) => [U * phSin + V * phCos, -U * phCos + V * phSin];
export const phW = (U, V) => phR(14 + (U - 14) * 0.88, -8 + (V + 8) * 0.88);
const phFace = (deg) => deg - (90 - FG.A);
const phWs = (pts) => pts.map(([u, v]) => phW(u, v));
const phClamp01 = (x) => Math.min(1, Math.max(0, x));
const phSmooth = (a, b, x) => { const t = phClamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const phAng = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const phRing = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
const phOct = (F, u, v, r, n = 8) => Array.from({ length: n }, (_, i) => F(u + r * Math.cos((i + 0.5) * 2 * Math.PI / n), v + r * Math.sin((i + 0.5) * 2 * Math.PI / n)));

const phRise = (U, V, r, steps, h, top, seed, extra = {}) => { const [cx, cy] = phW(U, V); return { cx, cy, r, steps, h, top, seed, wobble: 0.1, ...extra }; };
FG.TERRAIN = {
  rises: [
    phRise(40, -62, 34, 3, 1.8, 0.45, 9, { squash: 1.2 }),    // the ridge the enemy holds
    phRise(-95, 80, 28, 2, 1.6, 0.5, 17),                      // a low rise behind the phase line
    phRise(-150, -150, 34, 2, 1.6, 0.5, 23, { squash: 0.8 }),
    phRise(200, 130, 30, 2, 1.6, 0.5, 29),
  ],
};
export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- the road and positions along it (built once) ----------
let PH_R = null;
function phRoads() {
  if (PH_R) return PH_R;
  const road = trRoute(phWs(FG.MAIN), 6);
  const sAt = (U) => { const [x, y] = phW(U, 0); let bs = 0, bd = 1e9; for (let s = 0; s <= road.length; s += 1) { const p = road.at(s); const d = Math.abs((p.x - x) * phSin - (p.y - y) * phCos); if (d < bd) { bd = d; bs = s; } } return bs; };
  PH_R = { road, sAt };
  return PH_R;
}
const phBeside = (s, v) => { const p = phRoads().road.at(s); const [x, y] = fdFrame(p.x, p.y, p.face)(0, v); return { x, y, face: p.face }; };

// ---------- local drawing helpers ----------

// A truck at the origin facing `face` (world degrees): cab, cargo box and chassis, about 8 units long.
// Drawn inside <g class="tr-s" data-side>, so it takes the side's tint (blue supply, white ambulance,
// sand aid truck). (Same drawing as the supply trucks in Fig 9.)
export function phTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, phRing(F, u0, u1, v0, v1), z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(phRing(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

// An unarmed figure at the origin (a townsperson, or a police officer with a peaked cap), the same
// size and build as the kit's soldiers but with no weapon. stride 0/1/2 for a walk cycle.
export function phPerson(K, P, face = 0, stride = 0, cap = false) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const solids = [];
  const put = (ring, z0, z1, gear) => {
    const c = ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length], [0, 0]);
    solids.push([K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, ring, z0, z1, gear)]);
  };
  if (!stride) put(phRing(F, -0.34, 0.34, -0.5, 0.5), 0, 2.85, true);
  else for (const [du, dv] of [[stride === 1 ? 0.55 : -0.55, 0.26], [stride === 1 ? -0.55 : 0.55, -0.26]]) put(phRing(F, du - 0.27, du + 0.27, dv - 0.24, dv + 0.24), 0, 2.8, true);
  put(phRing(F, -0.42, 0.45, -0.72, 0.72), 2.7, 4.9);
  put(phOct(F, 0, 0, 0.6), 4.9, 5.85);
  if (cap) put(phOct(F, 0.15, 0, 0.78), 5.85, 6.25, true);
  solids.sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(phOct(F, -0.2, 0, 1.2, 10), 0, P0, true)}"/>` + solids.map((s) => s[1]).join("");
}

// A vehicle fighting position: a dark scrape and an earth berm across the front with short side
// arms, as two items keyed either side of the centre so a vehicle keyed at the centre sorts between.
function phScrape(K, P, x, y, z, face) {
  const F = fdFrame(x, y, face);
  const key0 = K.depthOf([x, y, 0], P);
  const pit = `<path class="tr-pit" d="${K.onTop(phRing(F, -5.2, 4.6, -3.2, 3.2), z + 0.03, P, true)}"/>`;
  const banks = [[4.8, 6.4, -4.2, 4.2], [-2.6, 4.8, 3.4, 4.6], [-2.6, 4.8, -4.6, -3.4]].map(([u0, u1, v0, v1]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return { near: K.depthOf([c[0], c[1], 0], P) > key0, svg: trPrism(K, P, phRing(F, u0, u1, v0, v1), z, z + 1.3) };
  });
  const wrap = (list) => (list.length ? `<g class="tr-p tr-bag">${list.map((b) => b.svg).join("")}</g>` : "");
  return [{ key: key0 - 6, svg: pit + wrap(banks.filter((b) => !b.near)) }, { key: key0 + 6, svg: wrap(banks.filter((b) => b.near)) }];
}

// A stack of crates at (x, y): two courses of small boxes.
function phCrates(K, P, x, y, face) {
  const F = fdFrame(x, y, face);
  const boxes = [[-3, 0, -2, 0, 0], [0.4, 3.4, -2, 0, 0], [-3, 0, 0.4, 2.4, 0], [0.4, 3.4, 0.4, 2.4, 0], [-1.4, 1.8, -1, 1.4, 2]];
  const svg = boxes.map(([u0, u1, v0, v1, z]) => ({ c: F((u0 + u1) / 2, (v0 + v1) / 2), z, ring: phRing(F, u0, u1, v0, v1) }))
    .sort((a, b) => K.depthOf([a.c[0], a.c[1], a.z], P) - K.depthOf([b.c[0], b.c[1], b.z], P))
    .map((b) => trPrism(K, P, b.ring, b.z, b.z + 2, false)).join("");
  return { key: K.depthOf([x, y, 0], P), svg: `<path class="tr-shadow" d="${K.onTop(phRing(F, -3.8, 4.2, -2.8, 3.2), 0, P, true)}"/><g class="tr-p tr-bag">${svg}</g>` };
}

// A checkpoint: a sandbag wall on each side of the road and a striped boom on two posts between them.
function phCheckpoint(K, P, s) {
  const out = [];
  const p = phRoads().road.at(s);
  const F = fdFrame(p.x, p.y, p.face);
  for (const sv of [-1, 1]) {
    const [cx, cy] = F(0, sv * 7);
    out.push({ key: K.depthOf([cx, cy, 0], P), svg: `<g class="tr-p tr-bag">${trPrism(K, P, phRing(F, -1, 1, sv * 4.4, sv * 9.6), 0, 1.5)}</g>` });
  }
  const a = F(0.2, -4.4), b = F(0.2, 4.4);
  const boom = K.solidSvg(K.extrude(phRing(F, -0.5, 0.9, -4.4, 4.4), 2.0, 0.55, P), { tone: "mid", crease: "none", className: "tr-wall" });
  out.push({ key: K.depthOf([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0], P) + 0.5, svg: boom });
  return out;
}

// ---------- where everything stands, phase by phase ----------
// Each unit has one entry per phase: [U, V, face] (stay), or [U, V, face, U2, V2, face2, t0, t1]
// (move from the first point to the second while the phase's action runs from t0 to t1), or null
// (off the map). Faces are UV degrees: 0 = to the right (toward the enemy), 180 = to the left.
const OFFW = (i, v = 40) => [-330 - i * 16, v, 0];
const OFFE = (i) => [330 + i * 16, -40, 0];
const BN_A = [ // friendly battalion, the main effort (lit)
  [[-170, 52, 0], [-72, -34, 0], [-10, 16, 0], [60, 8, 0, 116, -12, 0, 0.1, 0.9], [66, -18, 180], [-134, 46, 180]],
  [[-152, 60, 0], [-66, -16, 0], [-2, 32, 0], [66, 24, 0, 140, -2, 0, 0.12, 0.9], [124, 56, 90], [-148, 38, 180]],
  [OFFW(0), [-70, 18, 0], [-14, 46, 0], [56, 38, 0, 120, 18, 0, 0.14, 0.92], [116, 6, 270], [-122, 60, 180]],
  [OFFW(1), [-64, 34, 0], [-4, 62, 0], [72, 46, 0, 112, 32, 0, 0.1, 0.9], null, null],
  [OFFW(2), [-90, 64, 0], [-24, 26, 0], [46, 20, 0, 136, -26, 0, 0.16, 0.92], [40, 40, 0], [-160, 62, 180]],
  [OFFW(3), [-102, 84, 0], [-22, 56, 0], [50, 52, 0, 100, 10, 0, 0.12, 0.9], null, null],
];
const BN_B = [ // friendly battalion: seizes the ridge, then supports by fire from it
  [OFFW(4, 26), [-140, -30, 0], [-6, -66, 0, 16, -58, 0, 0.55, 1], [16, -58, 28], [-4, -16, 0], OFFW(0, 26)],
  [OFFW(5, 26), [-126, -40, 0], [-2, -48, 0, 20, -74, 0, 0.55, 1], [20, -74, 28], [12, -18, 0], OFFW(1, 26)],
  [OFFW(6, 26), [-154, -44, 0], [-10, -84, 0, 26, -44, 0, 0.55, 1], [26, -44, 28], [-140, -30, 0], OFFW(2, 26)],
  [OFFW(7, 26), [-138, -56, 0], [4, -34, 0, 14, -42, 0, 0.55, 1], [14, -42, 28], [-126, -40, 0], OFFW(3, 26)],
  [OFFW(8, 26), [-162, -26, 0], [-16, -56, 0, 22, -90, 0, 0.55, 1], [22, -90, 28], [-154, -44, 0], OFFW(4, 26)],
  [OFFW(9, 26), [-118, -24, 0], [-14, -38, 0, 8, -28, 0, 0.55, 1], [8, -28, 28], [-162, -26, 0], OFFW(5, 26)],
];
const RIDGE = [[28, -56], [32, -72], [40, -44], [48, -60], [44, -80], [54, -46]];
const TOWN_E = [[168, -48], [178, -30], [172, -62], [186, -46], [160, -66], [182, -74]];
const RED_1 = RIDGE.map(([u, v], i) => [ // enemy battalion: garrison, then the ridge, then the town
  [150 + (i % 3) * 14, -92 - Math.floor(i / 3) * 15, 180],
  [u, v, 180],
  [u, v, 180, TOWN_E[i][0], TOWN_E[i][1], 180, 0.45, 0.95],
  [TOWN_E[i][0], TOWN_E[i][1], 180, ...OFFE(i), 0.55, 1],
  OFFE(i), OFFE(i),
]);
const TOWN_W = [[96, -22], [92, 4], [92, 26], [96, -62]];
const RED_2 = [[138, -22, 270], [144, -2, 0], [118, 2, 0], [122, -26, 0]].map((g, i) => [ // enemy battalion (four drawn) holding the town
  g, [...TOWN_W[i], 180], [...TOWN_W[i], 180], [...TOWN_W[i], 180, ...OFFE(6 + i), 0.55, 1], OFFE(6 + i), OFFE(6 + i),
]);
// Knocked out: [phase, share of that phase's action at which it is hit]. Six enemy and three
// friendly vehicles, then one friendly soldier and two snipers: drawn to match model.mjs's losses.
const KO = { b1: [2, 0.3], r0: [2, 0.4], q0: [3, 0.25], a3: [3, 0.32], r1: [3, 0.4], q1: [3, 0.48], a5: [3, 0.55], q2: [3, 0.5], r2: [3, 0.68], d2: [4, 0.4], i0: [4, 0.5], i1: [4, 0.6] };
// Town: police station (where the police come from) and the doors the townspeople shelter behind.
const STATION = [152, 28];
const HOMES = [[108, -24], [150, -26], [150, 18], [116, -40], [160, 12]];
const CK_W = 70, CK_S = [128, 62];      // checkpoints: on the main road at U = 70, on the south road

function phAt(e, d) {
  if (!e) return null;
  if (e.length < 4) return { U: e[0], V: e[1], F: e[2] };
  const w = phSmooth(e[6], e[7], d);
  return { U: e[0] + (e[3] - e[0]) * w, V: e[1] + (e[4] - e[1]) * w, F: phAng(e[2], e[5], w) };
}

// Where each unit should be in phase `cur` with the phase's action `d` (0..1) done, at clock t and
// supply-shuttle phase lap. Returns [{ id, kind: "v"|"t"|"s"|"p", side, lit, x, y, face, ko, vis,
// pose, role, cap, snap }]: "v" vehicle, "t" truck, "s" soldier, "p" unarmed figure.
export function fieldTargets(cur, d = 0, t = 0, lap = 0) {
  const out = [];
  const R = phRoads();
  const koOf = (id) => KO[id] && (cur > KO[id][0] || (cur === KO[id][0] && d >= KO[id][1]));
  const add = (id, kind, side, at, extra = {}) => {
    const [x, y] = phW(at.U, at.V);
    out.push({ id, kind, side, x, y, face: phFace(at.F), vis: true, ...extra });
  };
  const group = (prefix, list, side, lit) => list.forEach((row, i) => {
    const id = prefix + i;
    if (koOf(id)) {                                   // hit: stays where it was hit, greyed
      const [ph, dk] = KO[id];
      add(id, "v", side + "k", phAt(row[ph], dk), { ko: true });
      return;
    }
    let at = phAt(row[cur], d);
    if (!at) { const off = side === "h" ? OFFE(i) : OFFW(i + (prefix === "b" ? 4 : 0)); at = { U: off[0], V: off[1], F: off[2] }; }
    add(id, "v", side, at, { lit });
  });
  group("a", BN_A, "f", true);
  group("b", BN_B, "f", false);
  group("r", RED_1, "h", false);
  group("q", RED_2, "h", false);

  // supply trucks shuttle along the main road: stocks into the base while it builds up, then
  // from the base to the fighting, to the town in Stabilize, and back out as the force draws down
  const span = [[-330, -150], [-330, -150], [-140, -34], [-140, 50], [-140, 104], [-150, -330]][cur];
  const s0 = R.sAt(span[0]), s1 = R.sAt(span[1]);
  for (let i = 0; i < 3; i++) {
    const ph = ((((lap + i / 3) % 1) + 1) % 1);
    const out1 = ph < 0.5;
    const s = out1 ? s0 + (s1 - s0) * phSmooth(0, 0.46, ph) : s1 + (s0 - s1) * phSmooth(0.5, 0.96, ph);
    const p = phBeside(s, out1 === s1 > s0 ? -2.2 : 2.2);
    out.push({ id: `k${i}`, kind: "t", side: "f", x: p.x, y: p.y, face: p.face + (s1 > s0 === out1 ? 0 : 180), vis: true });
  }
  // the ambulance: runs from the base to the latest friendly casualty while there is fighting
  const lastKo = cur === 2 ? (d >= KO.b1[1] ? "b1" : null) : cur === 3 ? (d >= KO.a3[1] ? (d >= KO.a5[1] ? "a5" : "a3") : "b1") : cur === 4 ? (d >= KO.d2[1] ? "d2" : "a5") : null;
  if (lastKo) {
    const ko = out.find((u) => u.id === lastKo);
    const kx = ko ? ko.x : phW(CK_S[0], CK_S[1] - 4)[0], ky = ko ? ko.y : phW(CK_S[0], CK_S[1] - 4)[1];
    let sk = 0, bd = 1e9;
    for (let s = 0; s <= R.road.length; s += 2) { const p = R.road.at(s); const dd = Math.hypot(p.x - kx, p.y - ky); if (dd < bd) { bd = dd; sk = s; } }
    const sb = R.sAt(-140), ph = ((((lap * 1.3 + 0.6) % 1) + 1) % 1), go = ph < 0.5, fwd = go === sk > sb;
    const s = go ? sb + (sk - sb) * phSmooth(0, 0.46, ph) : sk + (sb - sk) * phSmooth(0.5, 0.96, ph);
    const p = phBeside(s, fwd ? -2.2 : 2.2);
    out.push({ id: "m0", kind: "t", side: "m", x: p.x, y: p.y, face: p.face + (fwd ? 0 : 180), vis: true });
  } else add("m0", "t", "m", { U: -118, V: 30, F: 180 });

  // aid trucks: drive in for Stabilize and stay at the distribution point by the town
  [[139, 38], [147, 40], [139, 50]].forEach(([u, v], i) => add(`g${i}`, "t", "a", cur >= 4 ? { U: u, V: v, F: 90 } : { U: -340 - i * 14, V: 10, F: 0 }));

  // dismounted friendly soldiers at the checkpoints in Stabilize (from the checkpoint vehicles)
  [[CK_W + 2, -16, 180, "a0"], [CK_W + 2, 6, 180, "a0"], [CK_S[0] - 6, CK_S[1] + 4, 90, "a1"], [CK_S[0] + 6, CK_S[1] + 4, 90, "a1"]].forEach(([u, v, f, veh], i) => {
    const id = `d${i}`;
    if (koOf(id)) { add(id, "s", "fk", { U: u, V: v, F: f }, { ko: true, pose: "prone", role: "r", vis: cur === 4 }); return; }
    add(id, "s", "f", { U: u, V: v, F: f }, { role: i % 2 ? "ar" : "tl", pose: cur === 4 && d < 0.6 && i >= 2 ? "kneel" : "stand", vis: cur === 4, snap: veh });
  });
  // local police: two join the checkpoints in Stabilize; four hold them alone in Enable civil authority
  [[CK_W - 4, -14, 180], [CK_S[0], CK_S[1] + 8, 90], [CK_W - 4, 2, 180], [CK_S[0] + 10, CK_S[1] + 8, 90]].forEach(([u, v, f], i) => {
    const on = cur === 5 || (cur === 4 && i < 2);
    add(`p${i}`, "p", "p", { U: u, V: v, F: f }, { cap: true, vis: on, snap: on ? null : "station" });
  });
  // townspeople: about their business in peacetime, behind doors while there is fighting, queueing
  // at the aid point in Stabilize, back in the streets in Enable civil authority
  const STREETS = [[120, -18], [146, -14], [138, 10], [112, -2], [156, 22]];
  const QUEUE = [[114, 40], [116, 34], [118, 28], [120, 22], [113, 16]];
  const MARKET = [[112, 22], [120, 30], [108, 12], [118, 8], [122, 38]];
  for (let i = 0; i < 5; i++) {
    let at;
    if (cur <= 1 || cur === 5) {
      const base = cur === 5 ? MARKET[i] : STREETS[i], w = Math.sin(t * 0.35 + i * 1.7);
      at = { U: base[0] + 5 * w, V: base[1] + 2 * Math.cos(t * 0.27 + i), F: w * Math.cos(t * 0.35 + i * 1.7) > 0 ? 0 : 180 };
    } else if (cur === 4) at = { U: QUEUE[i][0], V: QUEUE[i][1], F: 300 };
    else at = { U: HOMES[i][0], V: HOMES[i][1], F: 90 };
    add(`c${i}`, "p", "c", at, { hide: cur === 2 || cur === 3 });
  }
  // two snipers in Stabilize, firing on the south checkpoint from beside a house; both are hit
  [[172, 16], [176, 26]].forEach(([u, v], i) => {
    const id = `i${i}`, face = 136;
    if (koOf(id)) { add(id, "s", "hk", { U: u, V: v, F: face }, { ko: true, pose: "prone", role: "r", vis: cur === 4 }); return; }
    add(id, "s", "h", { U: u, V: v, F: face }, { pose: "kneel", role: "r", vis: cur === 4 });
  });
  return out;
}

// Page only: ease the drawn positions M.pos toward the targets, so each change of phase shows as
// units turning and moving into their new posture. Also runs the action clock M.d, which starts
// once the combat units are in place (and resets when the gear changes).
export function fieldStep(M, S, dt, snapAll = false) {
  if (M.cur !== S.cur) { M.cur = S.cur; M.d = snapAll ? 1 : 0; }
  M.pos = M.pos || {}; M.walk = M.walk || {};
  const targets = fieldTargets(S.cur, M.d, M.t, M.lap);
  const byId = Object.fromEntries(targets.map((u) => [u.id, u]));
  let left = 0;
  for (const u of targets) {
    let p = M.pos[u.id];
    let tx = u.x, ty = u.y;
    // waiting off stage: at the police station, or riding in the vehicle until it is in place
    const veh = u.snap && u.snap !== "station" ? M.pos[u.snap] : null, vt = veh && byId[u.snap];
    const riding = veh && (!u.vis || !vt || Math.hypot(vt.x - veh.x, vt.y - veh.y) > 3);
    if (u.snap === "station" || riding) {
      const [sx, sy] = veh ? [veh.x, veh.y] : phW(...STATION);
      M.pos[u.id] = { x: sx, y: sy, face: u.face, sp: 0, off: true };
      continue;
    }
    if (!p || snapAll || u.ko || p.off) { if (!p || snapAll || u.ko) { M.pos[u.id] = { x: tx, y: ty, face: u.face, sp: 0 }; continue; } p.off = false; }
    const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
    const vmax = u.kind === "p" || u.kind === "s" ? FG.MAN_V : FG.VEH_V;
    const v = Math.min(vmax, (u.kind === "p" || u.kind === "s" ? 3 : 20) + dist * 2.4);
    const step = Math.min(dist, v * dt);
    if (dist > 0.01) { p.x += (dx / dist) * step; p.y += (dy / dist) * step; }
    p.sp = dt > 0 ? step / dt : 0;
    M.walk[u.id] = (M.walk[u.id] || 0) + step;
    const want = p.sp > 5 && dist > 1.5 ? Math.atan2(dy, dx) / PH_RAD : u.face;
    p.face = phAng(p.face, want, 1 - Math.exp(-dt / 0.12));
    if (u.kind === "v" && dist > 3) left++;
  }
  M.moving = left;
  if (left === 0) M.d = Math.min(1, M.d + dt / FG.ACT);
  return byId;
}

// Every unit and fire stream for a state. M (page) carries the eased positions, the action clock
// d, the fire clock t, the shuttle phase lap and fire (the drive: 0 with the clutch out); the build's
// first frame passes nothing and gets the targets.
export function fieldPose(S, T, M = {}) {
  const cur = S.cur, d = M.d ?? 0;
  const targets = fieldTargets(cur, d, M.t ?? 0, M.lap ?? 0);
  const units = [];
  for (const u of targets) {
    const p = M.pos && M.pos[u.id];
    const x = p ? p.x : u.x, y = p ? p.y : u.y;
    if (!u.vis || (p && p.off)) continue;
    if (u.hide && Math.hypot(u.x - x, u.y - y) < 2.5) continue;    // gone indoors
    const walk = M.walk ? M.walk[u.id] || 0 : 0;
    const moving = p && p.sp > 1;
    units.push({ ...u, x, y, z: T.height(x, y), face: p ? p.face : u.face, stride: (u.kind === "p" || u.kind === "s") && moving ? [1, 0, 2, 0][Math.floor(walk / 1.7) % 4] : 0 });
  }
  // fire: only once the units are in place and the clutch is in
  const settled = (M.moving ?? 0) === 0 ? 1 : 0;
  const drive = (M.fire ?? 1) * settled;
  const live = (pre) => units.filter((u) => u.id[0] === pre && !u.ko && u.kind === "v");
  const gunAt = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(4.2, 0), u.z + 3.1]; };
  const aim = (u) => [u.x, u.y, u.z + 1.8];
  const streams = [];
  const fireAt = (from, to, side, on, base) => from.forEach((u, i) => {
    if (!to.length || on < 0.02) return;
    streams.push({ id: u.id, side, heavy: true, smoke: side === "f", from: gunAt(u), to: to.map(aim), period: 2.2 + ((i * 0.37) % 0.9), burst: 1, gap: 0, flight: 0.55, phase: base + i * 0.53, on, scatter: 3 });
  });
  if (cur === 2) {
    const on = drive * (1 - phSmooth(0.45, 0.7, d));
    const ridge = live("r");
    fireAt(live("b"), ridge, "f", 0.8 * on, 0.1);
    fireAt(ridge, live("b"), "h", 0.7 * on, 0.4);
  } else if (cur === 3) {
    const on = drive * (1 - phSmooth(0.62, 0.85, d));
    const red = [...live("r"), ...live("q")];
    fireAt(live("a"), red, "f", 0.8 * on, 0.2);
    // the ridge battalion supports by fire, then stops firing (and stays) as the main effort closes on the town
    fireAt(live("b"), red, "f", 0.7 * drive * (1 - phSmooth(0.35, 0.55, d)), 0.7);
    fireAt(red, live("a"), "h", 0.75 * on, 0.45);
  } else if (cur === 4) {
    const on = drive * (1 - phSmooth(0.5, 0.62, d));
    const snipers = units.filter((u) => u.id[0] === "i" && !u.ko);
    const ck = units.filter((u) => (u.id === "d2" || u.id === "d3") && !u.ko);
    snipers.forEach((u, i) => streams.push({ id: u.id, side: "h", from: trMuzzle(u, u.x, u.y, u.z), to: ck.map((c) => trAimPoint(c, c.x, c.y, c.z)), period: 1.6 + i * 0.3, burst: 2, gap: 0.12, flight: 0.35, phase: 0.2 + i * 0.7, on: 0.8 * on, scatter: 1.4 }));
    ck.forEach((u, i) => streams.push({ id: u.id, side: "f", from: trMuzzle(u, u.x, u.y, u.z), to: snipers.map((c) => trAimPoint(c, c.x, c.y, c.z)), period: 1.3 + i * 0.25, burst: 3, gap: 0.1, flight: 0.35, phase: 0.5 + i * 0.4, on: 0.85 * on * phSmooth(0.1, 0.25, d), scatter: 1.4 }));
  }
  return { units, streams: streams.filter((s) => s.to.length && s.on > 0.02), cur, d, loss: lossesAt(cur, d) };
}

// Smoke from knocked-out vehicles: a pure function of time, appended to trShots' smoke.
export function fieldSmoke(pose, t) {
  const out = [];
  for (const u of pose.units) {
    if (!u.ko || u.kind !== "v") continue;
    for (let j = 0; j < 3; j++) {
      const age = (((t * 0.28 + j / 3 + (u.x * 0.013)) % 1) + 1) % 1;
      out.push({ p: [u.x - 2.4 * age * 6, u.y - 3.4 * age * 6, u.z + 3 + age * 9], age });
    }
  }
  return out;
}

// Per-phase ground marks: the enemy's fire sector off the ridge while it holds it, the friendly
// battalion's sectors along the phase line in Deter, and the ridge battalion's support-by-fire
// sector toward the town in Dominate (faded as it stops firing).
export function fieldMarks(K, P, T, pose) {
  const { cur, d } = pose;
  const [rx, ry] = phW(40, -62), [bx, by] = phW(-70, 0), [sx, sy] = phW(28, -60);
  let s = "";
  if (cur === 1 || cur === 2) s += trFan(K, P, T, rx, ry, 18, 66, phFace(180 - 30), phFace(180 + 30), { side: "h", arcs: 2, alpha: 0.85 * (cur === 2 ? 1 - phSmooth(0.45, 0.7, d) : 1) });
  if (cur === 1) s += trFan(K, P, T, bx, by, 12, 52, phFace(-32), phFace(32), { side: "f", arcs: 1, alpha: 0.75 });
  if (cur === 3) s += trFan(K, P, T, sx, sy, 22, 100, phFace(28 - 13), phFace(28 + 13), { side: "f", arcs: 2, alpha: 0.8 * (1 - phSmooth(0.35, 0.55, d)) });
  return s;
}
export const fieldMarksSig = (pose) => pose.cur + "|" + (pose.cur === 2 || pose.cur === 3 ? Math.round(pose.d * 20) : 0);

export function fieldStatic(K, P, T) {
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const R = phRoads();
  g(trGroundPlane(K, P, { x: -520, y: -520, w: 1040, d: 1040 }));

  for (const [u, v, r, seed, sq] of [[-60, -30, 50, 3, 0.6], [30, 70, 46, 5, 0.6], [-240, -10, 50, 7, 0.8], [220, 10, 40, 9, 0.8], [90, -100, 30, 11, 0.7]]) { const [cx, cy] = phW(u, v); g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq))); }
  const fields = [
    [[[-250, 50], [-196, 52], [-198, 92], [-252, 90]], 8, "a"],
    [[[-130, -98], [-80, -96], [-82, -66], [-132, -68]], 7, "b"],
    [[[60, 62], [108, 60], [110, 92], [62, 94]], 7, "a"],
    [[[165, 44], [212, 42], [214, 80], [167, 82]], 7, "b"],
    [[[-250, -60], [-204, -62], [-202, -30], [-248, -28]], 6, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, phWs(ring), { furrows: n, tint }));

  g(trRoad(K, P, phWs(FG.MAIN), 3.4));
  g(trRoad(K, P, phWs(FG.NS), 2.6, { ruts: false }));
  g(trRoad(K, P, phWs([[-100, -260], [-96, -120], [-92, 2]]), 2.0, { ruts: false }));

  // woods toward the edges, kept clear of the roads and of anything just behind a rise
  const roadPts = [...R.road.line, ...trRoute(phWs(FG.NS), 6).line];
  const nearRoad = (x, y, dd) => roadPts.some((p) => Math.hypot(p[0] - x, p[1] - y) < dd);
  const woods = [[-40, -135, 36, 20], [92, -152, 36, 16], [-232, -100, 36, 16], [246, -130, 34, 14], [36, 130, 34, 16], [-206, 136, 38, 16], [258, 44, 26, 10], [-150, 104, 18, 6]];
  woods.forEach(([u, v, r, n], i) => {
    const [cx, cy] = phW(u, v);
    const ring = fdBlob(cx, cy, r, 21 + i, 0.12, 40, 0.75);
    const trees = trScatter(ring, n, { seed: 21 + i, gap: 6.2, r: [2.8, 4.4], h: [8, 12], avoid: (x, y) => nearRoad(x, y, 15) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  });
  for (const [pts, seed] of [[[[-250, 50], [-196, 52], [-198, 92]], 51], [[[60, 62], [108, 60]], 53], [[[165, 44], [212, 42]], 54]]) items.push(...trHedge(K, P, phWs(pts), { seed }));

  // the friendly base: sheds and crate stacks beside the road
  for (const [u, v, a, l, w] of [[-162, 26, 0, 16, 8], [-140, 24, 0, 14, 8], [-182, 38, 90, 12, 7]]) { const [x, y] = phW(u, v); items.push(trHouse(K, P, x, y, phFace(a), l, w)); }
  for (const [u, v] of [[-124, 34], [-118, 42], [-188, 20], [-150, 38]]) { const [x, y] = phW(u, v); items.push(phCrates(K, P, x, y, phFace(0))); }
  // the town round the crossroads, the aid point (a tent and crates) and farms elsewhere
  const houses = [[108, -32, 0, 11, 7], [112, -48, 90, 9, 6.5], [96, -42, 0, 9, 6.5], [150, -34, 0, 11, 7], [166, -38, 90, 9, 6.5], [152, -52, 0, 12, 8],
    [150, 14, 0, 10, 7], [166, 8, 90, 9, 6.5], [152, 30, 0, 10, 7], [-60, 44, 10, 11, 7], [-232, 8, 0, 10, 7], [200, -10, 90, 10, 7]];
  for (const [u, v, a, l, w] of houses) { const [x, y] = phW(u, v); items.push(trHouse(K, P, x, y, phFace(a), l, w)); }
  { const [x, y] = phW(112, 48); items.push(trHouse(K, P, x, y, phFace(0), 10, 7, 2.4, 5)); }
  for (const [u, v] of [[121, 52], [124, 42]]) { const [x, y] = phW(u, v); items.push(phCrates(K, P, x, y, phFace(0))); }

  g(trRelief(K, P, T));

  // prepared positions: the enemy's on the ridge and at the town's western edge
  RIDGE.forEach(([u, v]) => { const [x, y] = phW(u, v); items.push(...phScrape(K, P, x, y, T.height(x, y), phFace(180))); });
  TOWN_W.forEach(([u, v]) => { const [x, y] = phW(u, v); items.push(...phScrape(K, P, x, y, T.height(x, y), phFace(180))); });
  // checkpoints on the main road west of the town and on the south road
  items.push(...phCheckpoint(K, P, R.sAt(CK_W)));
  { const ns = trRoute(phWs(FG.NS), 6); let bs = 0, bd = 1e9; const [cx, cy] = phW(...CK_S); for (let s = 0; s <= ns.length; s += 0.5) { const p = ns.at(s); const dd = Math.hypot(p.x - cx, p.y - cy); if (dd < bd) { bd = dd; bs = s; } }
    const p = ns.at(bs), F = fdFrame(p.x, p.y, p.face);
    for (const sv of [-1, 1]) { const [qx, qy] = F(0, sv * 6.4); items.push({ key: K.depthOf([qx, qy, 0], P), svg: `<g class="tr-p tr-bag">${trPrism(K, P, phRing(F, -1, 1, sv * 3.8, sv * 9), 0, 1.5)}</g>` }); }
    items.push({ key: K.depthOf([p.x, p.y, 0], P) + 0.5, svg: K.solidSvg(K.extrude(phRing(F, -0.5, 0.9, -3.8, 3.8), 2.0, 0.55, P), { tone: "mid", crease: "none", className: "tr-wall" }) }); }

  // control measures: the phase line on pegs, the flag on the town hall (the objective in Dominate)
  const pl = trChalk(K, P, T, phWs([[FG.PL, -128], [FG.PL, -50], [FG.PL, 40], [FG.PL, 118]]));
  g(pl.ground); items.push(...pl.items);
  { const [x, y] = phW(146, -64); items.push(trObjective(K, P, T, x, y, { h: 13, ang: 200 })); }
  return { ground: ground.join(""), items };
}
