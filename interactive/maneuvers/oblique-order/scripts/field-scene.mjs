// The Battlefield view of the Oblique Order, drawn with the terrain kit (../../kit/terrain.mjs):
// full-bleed ground loosely after Leuthen, 5 December 1757, with period linear infantry (battalions
// as short lines a few ranks deep, cocked hats and muskets) and cavalry squadrons. The same model
// state S as the bench drives it:
//   S.ang      the attacking line's angle: the Prussian line wheels on its refused end exactly as
//              the beam pivots on its carriage
//   S.mass     the weights: four battalions leave their sectors, march back behind a chain of low
//              knolls to the far wing and form up behind its leading battalions (scene.mjs MOVES)
//   S.push     each sector's result: where the lines touch, both sides volley (powder smoke, no
//              tracers) and the loser is pushed back as the bench's blocks are
// Casualties on both sides come from model.mjs (casualties()); this file only places them.
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every unit for a state (build and page); obVolleys() turns the volleys into smoke and flashes.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs, terrain.mjs.
import { fdFrame, fdBlob } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trHouse, trObjective, trPrism, trRoute } from "../../kit/terrain.mjs";
import { MODEL, sectors, casualties } from "./model.mjs";
import { discPlaces, loadOf } from "./scene.mjs";

export const FG = {
  world: { x: -300, y: -230, w: 620, d: 480 },
  FS: 0.8,            // field units per bench unit along the lines (the bench's sectors, scaled)
  AUS_FRONT: -20,     // front rank of the Austrian line at rest
  D0: 12,             // notional musket range: front rank to front rank where the lines touch
  COL: 9.6,           // half spacing of a sector's two battalions along the line
  ROW: 11,            // depth between the rows of a massed wing
  PUSH: 1.4,          // field units per bench unit of block travel
  FILE: 2.1,          // interval between files
  RANK: 1.9,          // distance between ranks
  ROAD_Y: 80,         // the hidden march road behind the knolls
  TURN_X: -106,       // where the march turns up toward the far wing
  BORNE: [124, 4],    // the knoll in front of the Austrian right where the Prussian horse shows
  HORSE: [[-58, -54], [-10, -50], [40, -50], [80, -55]], // the Austrian reserve horse's ride behind the line
  DRESS: [46, 46],    // farm behind the line where the wounded are carried
  VOLLEY: [3.4, 0.9], // seconds between a battalion's volleys, and the spread of that period
};
FG.TERRAIN = {
  rises: [
    { cx: -92, cy: 58, r: 15, steps: 3, h: 1.3, top: 0.45, seed: 61, wobble: 0.1, squash: 1.2 },
    { cx: -58, cy: 57, r: 15, steps: 3, h: 1.3, top: 0.45, seed: 62, wobble: 0.1, squash: 1.25 },
    { cx: 124, cy: 4, r: 17, steps: 3, h: 1.2, top: 0.62, seed: 71, wobble: 0.06 },
    { cx: 84, cy: 92, r: 14, steps: 2, h: 1.3, top: 0.5, seed: 73, wobble: 0.12 },
    { cx: -150, cy: -40, r: 18, steps: 2, h: 1.4, top: 0.5, seed: 75, wobble: 0.12 },
    { cx: 150, cy: -86, r: 22, steps: 3, h: 1.4, top: 0.45, seed: 77, wobble: 0.12 },
  ],
};

const OB_RAD = Math.PI / 180;
// walk cycle by distance: a man every 1.7 units; a battalion or squadron re-draws all its men at once,
// so groups step every 2.6 units (a slower cadence, fewer re-draws)
const obStrideOf = (d, step = 1.7) => [1, 0, 2, 0][((Math.floor(d / step) % 4) + 4) % 4];
const obClamp01 = (x) => Math.min(1, Math.max(0, x));
const obSmooth = (x) => { const t = obClamp01(x); return t * t * (3 - 2 * t); };
const obHash = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
const obStep = (f, s = 15) => Math.round((((f % 360) + 360) % 360) / s) * s % 360;
const obBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
const obOct = (F, u, v, r, n = 8) => Array.from({ length: n }, (_, i) => F(u + r * Math.cos((i + 0.5) * 2 * Math.PI / n), v + r * Math.sin((i + 0.5) * 2 * Math.PI / n)));
// a cocked hat: a rounded three-cornered plan, one corner forward
const obTri = (F, u, v, r) => [0, 40, 120, 160, 240, 280].map((a, i) => F(u + (i % 2 ? 0.78 : 1) * r * Math.cos(a * OB_RAD), v + (i % 2 ? 0.78 : 1) * r * Math.sin(a * OB_RAD)));

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- figures, drawn at the origin of P (the caller sets P.origin to the figure's foot) ----------

function obSolids(K, P, list) {
  return list.map(([ring, z0, z1, gear]) => {
    const c = ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length], [0, 0]);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P), trPrism(K, P, ring, z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]).map((p) => p[1]).join("");
}
// Several prisms as ONE path in one tint (cls "tr-g" gear, "tr-l" sunlit): legs, a head, a hat. Each
// figure is a dozen paths at most this way; a battlefield of 300 figures stays light to paint.
const obOne = (K, P, rings, z0, z1, cls = "tr-g") => `<path class="${cls}" d="${rings.map((r) => trPrism(K, P, r, z0, z1, true).match(/ d="([^"]*)"/)[1]).join("")}"/>`;
const obLine = (K, P, F, a, b, cls = "tr-gun") => `<path class="${cls}" d="${K.pathOf([K.iso([...F(a[0], a[1]), a[2]], P), K.iso([...F(b[0], b[1]), b[2]], P)])}"/>`;

// One eighteenth-century foot soldier. pose: "stand" (musket shouldered; stride 0/1/2 walks),
// "present" (musket levelled to fire), "prone" (fallen). role: "m" musketeer, "of" officer (spontoon),
// "col" colour bearer, "b" bearer (no arms). Standing height about 6 units (1.5x scale, like trSoldier).
export function obMan(K, P, face, pose = "stand", role = "m", stride = 0, shadow = true) {
  const F = fdFrame(0, 0, face);
  const [vx, vy] = K.towardViewer(P);
  const fw = F(1, 0), rt = F(0, -1);
  const away = fw[0] * vx + fw[1] * vy < 0, armBehind = rt[0] * vx + rt[1] * vy < 0;
  if (pose === "prone") {
    const body = obSolids(K, P, [
      [obBox(F, -3.7, -2.1, -0.55, 0.55), 0, 0.5],
      [obBox(F, -2.2, 0.35, -0.7, 0.7), 0, 0.85],
      [obOct(F, 0.9, 0, 0.5), 0.1, 0.95],
      [obTri(F, 2.1, 1.0, 0.9), 0, 0.35, true],
    ]);
    const gun = role === "m" ? obLine(K, P, F, [-1.6, 1.5, 0.15], [2.0, 1.75, 0.15]) : "";
    return `<path class="tr-shadow" d="${K.onTop(obBox(F, -3.9, 1.6, -1.0, 1.0), 0, P, true)}"/>` + gun + body;
  }
  const legs = stride === 0 ? [obBox(F, -0.3, 0.3, -0.42, 0.42)]
    : [[stride === 1 ? 0.5 : -0.5, 0.22], [stride === 1 ? -0.5 : 0.5, -0.22]].map(([du, dv]) => obBox(F, du - 0.24, du + 0.24, dv - 0.2, dv + 0.2));
  // legs, then pack and coat far to near, then head and hat on top
  const pack = role === "b" ? "" : trPrism(K, P, obBox(F, -0.9, -0.45, -0.4, 0.4), 3.0, 4.1, true);
  const coat = trPrism(K, P, obBox(F, -0.45, 0.45, -0.68, 0.68), 2.3, 4.8);
  const body = obOne(K, P, legs, 0, 2.45) + (away ? coat + pack : pack + coat) +
    obOne(K, P, [obOct(F, 0, 0, 0.5, 6)], 4.8, 5.5, "tr-l") + obOne(K, P, [obTri(F, 0.05, 0, 0.95)], 5.42, 5.82);
  let arms = "";
  if (role === "m") arms = pose === "present" ? obLine(K, P, F, [0.35, -0.45, 4.35], [3.4, -0.45, 4.5]) : obLine(K, P, F, [0.15, -0.8, 2.8], [-0.3, -0.85, 7.0]);
  else if (role === "of") arms = obLine(K, P, F, [0.4, -0.8, 0.1], [0.4, -0.8, 7.9], "tr-wire");
  else if (role === "col") {
    const pu = 0.25, pv = -0.78;
    const q = (u, z) => K.iso([...F(u, pv), z], P);
    arms = obLine(K, P, F, [pu, pv, 2.6], [pu, pv, 10.6], "tr-wire") +
      `<path class="ob-flag" d="${K.pathOf([q(pu, 10.4), q(pu, 8.1), q(-2.3, 8.3), q(-2.3, 10.5)], true)}"/>`;
  }
  const front = pose === "present" ? away : armBehind;
  return (shadow ? `<path class="tr-shadow" d="${K.onTop(obOct(F, -0.1, 0, 1.1, 10), 0, P, true)}"/>` : "") + (front ? arms + body : body + arms);
}

// A cavalryman of the period: horse (four legs in a gallop cycle by stride), rider in a cocked hat,
// sabre at the shoulder.
export function obRider(K, P, face, stride = 0) {
  const F = fdFrame(0, 0, face);
  const sw = stride === 0 ? 0 : stride === 1 ? 0.42 : -0.42;
  const legs = obOne(K, P, [[1.15, 0.28, sw], [1.15, -0.28, -sw], [-1.35, 0.28, -sw], [-1.35, -0.28, sw]].map(([u, v, d]) => obBox(F, u + d - 0.13, u + d + 0.13, v - 0.13, v + 0.13)), 0, 1.65);
  const body = legs + obSolids(K, P, [
    [obBox(F, -1.8, 1.55, -0.48, 0.48), 1.5, 2.55],
    [obBox(F, -2.15, -1.8, -0.14, 0.14), 1.7, 2.45, true],
    [obBox(F, 1.35, 2.0, -0.28, 0.28), 2.2, 3.25],
    [obBox(F, 1.95, 2.95, -0.25, 0.25), 2.75, 3.3],
    [obBox(F, -0.45, 0.35, -0.6, 0.6), 2.55, 2.95, true],
    [obBox(F, -0.42, 0.28, -0.42, 0.42), 2.95, 4.45],
  ]) + obOne(K, P, [obOct(F, -0.06, 0, 0.4, 6)], 4.45, 5.05, "tr-l") + obOne(K, P, [obTri(F, 0, 0, 0.8)], 4.98, 5.32);
  const sabre = obLine(K, P, F, [0.1, -0.5, 3.8], [0.7, -0.62, 6.0]);
  const [vx, vy] = K.towardViewer(P), rt = F(0, -1), behind = rt[0] * vx + rt[1] * vy < 0;
  return `<path class="tr-shadow" d="${K.onTop(obBox(F, -2.2, 3.0, -0.8, 0.8), 0, P, true)}"/>` + (behind ? sabre + body : body + sabre);
}

// ---------- groups: a battalion line, a squadron, the bearers ----------

// Members of a battalion in its own frame (u forward, v left): three ranks of five files, the colour
// in the middle of the centre rank, the officer in front. `col` (0..1) folds the line into a column of
// march along u. Casualty order: front rank first, then the centre, then the rear.
const OB_BN = (() => {
  const out = [];
  for (let r = 0; r < 3; r++) for (let f = 0; f < 5; f++) out.push({ r, f, role: r === 1 && f === 2 ? "col" : "m" });
  out.push({ r: -1.4, f: 2.25, role: "of" });
  return out;
})();
const OB_FALL = OB_BN.map((m, i) => i).filter((i) => OB_BN[i].role === "m");
export const OB_MUSKETS = OB_FALL.length;
function obMembers(n, col, loose, seed) {
  const gone = new Set(OB_FALL.slice(0, Math.max(0, OB_FALL.length - n)));
  const out = [];
  OB_BN.forEach((m, i) => {
    if (gone.has(i)) return;
    const j = 0.22 + loose * 1.6;
    const lu = (1 - m.r) * FG.RANK, lv = (m.f - 2) * FG.FILE;
    const cu = (2 - m.f) * 2.2 + (m.role === "of" ? 2.4 : 0), cv = (m.role === "of" ? 0 : m.r - 1) * 1.9;
    const du = (obHash(seed, i * 2 + 1) - 0.5) * j, dv = (obHash(seed, i * 2 + 2) - 0.5) * j * 0.7;
    out.push({ role: m.role, u: lu + (cu - lu) * col + du, v: lv + (cv - lv) * col + dv });
  });
  return out;
}
// Each member figure is drawn once per look at the origin and placed with a translate, so a group
// re-draw is string work only. Cache keyed by the figure's look (the projection never changes).
const OB_FIGS = new Map();
const obFig = (key, draw) => { let s = OB_FIGS.get(key); if (s === undefined) { s = draw(); OB_FIGS.set(key, s); } return s; };
// Members { dx, dy, key, draw(P0) } drawn at the group's origin, far to near.
function obGroup(K, P, list) {
  const P0 = { ...P, origin: [0, 0] };
  return list.map((m) => [K.depthOf([m.dx, m.dy, 0], P0), m]).sort((a, b) => a[0] - b[0]).map(([, m]) => {
    const [sx, sy] = K.iso([m.dx, m.dy, 0], P0);
    return `<g transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${obFig(m.key, () => m.draw(P0))}</g>`;
  }).join("");
}
export function obBattalionSvg(K, P, u) {
  const F = fdFrame(0, 0, obStep(u.face, 5));
  const face = obStep(u.face + (u.turn || 0));
  const members = obMembers(u.n, u.col, u.loose, u.seed);
  const P0 = { ...P, origin: [0, 0] };
  const pts = members.map((m) => F(m.u, m.v));
  const xs = members.map((m) => m.u), ys = members.map((m) => m.v);
  const shadow = `<path class="tr-shadow" d="${K.onTop(obBox(F, Math.min(...xs) - 1.2, Math.max(...xs) + 1.0, Math.min(...ys) - 1.1, Math.max(...ys) + 1.1), 0, P0, true)}"/>`;
  return shadow + obGroup(K, P, members.map((m, i) => {
    const [dx, dy] = pts[i];
    const pose = m.role === "m" ? u.pose : "stand";
    return { dx, dy, key: `m|${face}|${pose}|${m.role}|${u.stride}|0`, draw: (Q) => obMan(K, Q, face, pose, m.role, u.stride, false) };
  }));
}
// A squadron: two ranks of three troopers.
export function obSquadronSvg(K, P, u) {
  const F = fdFrame(0, 0, u.face);
  const face = obStep(u.face);
  const list = [];
  for (let r = 0; r < 2; r++) for (let f = 0; f < 3; f++) {
    const [dx, dy] = F(-r * 5.6 + (obHash(u.seed, r * 3 + f) - 0.5) * 0.8, (f - 1) * 2.5);
    const st = u.stride ? 1 + ((u.stride + r + f) % 2) : 0;
    list.push({ dx, dy, key: `r|${face}|${st}`, draw: (P0) => obRider(K, P0, face, st) });
  }
  return obGroup(K, P, list);
}
// Two bearers carrying a litter; loaded, a wounded man (greyed) lies on it.
export function obBearersSvg(K, P, u) {
  const face = obStep(u.face);
  const F = fdFrame(0, 0, face);
  const P0 = { ...P, origin: [0, 0] };
  const litter = `<g class="tr-p">${trPrism(K, P0, obBox(F, -1.7, 1.7, -0.45, 0.45), 2.35, 2.6, true)}</g>` +
    (u.loaded ? `<g class="tr-s" data-side="fc">${trPrism(K, P0, obBox(F, -1.5, 1.0, -0.38, 0.38), 2.6, 3.15)}${trPrism(K, P0, obOct(F, 1.2, 0, 0.36), 2.6, 3.3)}</g>` : "");
  const men = [2.2, -2.2].map((uu, i) => {
    const [dx, dy] = F(uu, 0);
    const st = u.stride ? 1 + ((u.stride + i) % 2) : 0;
    return { d: K.depthOf([dx, dy, 0], P0), svg: obGroup(K, P, [{ dx, dy, key: `m|${face}|stand|b|${st}`, draw: (Q) => obMan(K, Q, face, "stand", "b", st) }]) };
  }).sort((a, b) => a.d - b.d);
  return men[0].svg + litter + men[1].svg;
}
export function obUnitSvg(K, P, u) {
  if (u.kind === "bn") return obBattalionSvg(K, P, u);
  if (u.kind === "sq") return obSquadronSvg(K, P, u);
  if (u.kind === "litter") return obBearersSvg(K, P, u);
  return obMan(K, { ...P, origin: [0, 0] }, obStep(u.face), u.pose, u.role, u.stride);
}
export const obLook = (u) => u.kind === "bn" ? `bn|${u.pose}|${obStep(u.face + (u.turn || 0))}|${obStep(u.face, 5)}|${u.stride}|${u.n}|${u.col}|${u.loose.toFixed(1)}|${u.seed}`
  : u.kind === "sq" ? `sq|${obStep(u.face)}|${u.stride}|${u.seed}`
  : u.kind === "litter" ? `li|${obStep(u.face)}|${u.stride}|${u.loaded ? 1 : 0}`
  : `m|${u.pose}|${u.role}|${u.stride}|${obStep(u.face)}`;

// ---------- static ground ----------

const OB_HOUSES = [
  // Sagschutz, at the angle of the Austrian left
  [-100, -42, 20, 9, 6], [-112, -30, 100, 8, 5.5], [-98, -56, 8, 8, 5.5],
  // Leuthen, behind the Austrian centre (the church tower is added separately)
  [-6, -70, 4, 10, 6.5], [10, -73, -6, 9, 6], [26, -68, 12, 9, 6], [-20, -66, 94, 8, 5.5],
  // a hamlet off the Austrian right, and Borne behind its knoll
  [104, -48, -10, 9, 6], [116, -40, 80, 8, 5.5], [158, 30, 14, 9, 6], [166, 18, 104, 8, 5.5],
  // the farm behind the Prussian line where the wounded are carried, and a hamlet by the refused wing
  [FG.DRESS[0] + 4, FG.DRESS[1] + 4, 8, 12, 7], [118, 50, 96, 9, 6], [130, 58, 6, 8, 5.5],
];

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[-60, 130, 50, 3, 0.6], [40, -120, 60, 5, 0.5], [-190, 30, 40, 7, 0.7], [200, 70, 46, 9, 0.6], [10, 30, 30, 11, 0.5]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-40, 98], [10, 102], [8, 136], [-44, 130]], 8, "a"], [[[20, 104], [62, 100], [66, 134], [24, 138]], 7, "b"],
    [[[-180, 60], [-136, 64], [-140, 100], [-184, 94]], 7, "b"], [[[150, 76], [196, 82], [190, 118], [146, 110]], 8, "a"],
    [[[-80, -112], [-30, -116], [-28, -146], [-82, -140]], 8, "a"], [[[50, -96], [96, -100], [100, -132], [52, -128]], 7, "b"],
    [[[176, -30], [214, -24], [210, 8], [172, 2]], 6, "b"], [[[-200, -96], [-160, -92], [-164, -62], [-204, -66]], 6, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  // the hidden march road behind the knolls, a lane behind the Austrian line, a road in the near corner
  g(trRoad(K, P, [[200, 88], [120, 84], [40, G.ROAD_Y + 1], [-40, G.ROAD_Y], [-90, G.ROAD_Y - 1], [G.TURN_X - 4, G.ROAD_Y - 8], [G.TURN_X - 2, 50], [G.TURN_X, 20], [G.TURN_X + 2, -4], [-120, -60], [-140, -180]], 2.8));
  g(trRoad(K, P, [[-320, -84], [-150, -84], [-60, -86], [30, -88], [120, -90], [320, -96]], 2.4, { ruts: false }));
  g(trRoad(K, P, [[-320, 150], [-180, 140], [-120, 150], [-40, 180], [40, 230]], 2.6, { ruts: false }));
  const nearAction = (x, y) => (y > -64 && y < 44 && x > -124 && x < 104) || (Math.abs(y - G.ROAD_Y) < 15 && x > G.TURN_X - 16 && x < 60)
    || (Math.abs(x - G.TURN_X) < 16 && y > -10 && y < G.ROAD_Y + 10) || (y > -66 && y < -36 && x > -76 && x < 96) || Math.hypot(x - G.BORNE[0], y - G.BORNE[1]) < 26;
  const nearHouse = (x, y) => OB_HOUSES.some(([hx, hy]) => Math.hypot(x - hx, y - hy) < 10);
  const woods = [
    [fdBlob(-148, -8, 22, 31, 0.14, 40, 0.8), 14, 21], [fdBlob(-60, -118, 26, 32, 0.14, 40, 0.6), 12, 22],
    [fdBlob(84, -126, 30, 33, 0.12, 40, 0.6), 14, 23], [fdBlob(186, -34, 22, 34, 0.12, 40, 1), 11, 24],
    [fdBlob(-136, 112, 26, 35, 0.12, 40, 0.8), 13, 25], [fdBlob(122, 122, 26, 36, 0.12, 40, 0.7), 12, 26],
    [fdBlob(-128, -78, 14, 37, 0.12, 40, 0.8), 7, 27], [fdBlob(20, 66, 13, 38, 0.12, 40, 0.8), 6, 28],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.4, 3.8], h: [7, 10.5], cone: 0.75, avoid: (x, y) => nearAction(x, y) || nearHouse(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-40, 98], [10, 102]], 51], [[[150, 76], [196, 82]], 52], [[[-180, 60], [-136, 64]], 53], [[[50, -96], [96, -100]], 54], [[[-80, -112], [-30, -116]], 55]]) items.push(...trHedge(K, P, pts, { seed }));
  for (const [x, y, ang, len, wid] of OB_HOUSES) items.push(trHouse(K, P, x, y, ang, len, wid));
  // Leuthen church: a square tower with a low cap, beside the village
  {
    const F = fdFrame(-10, -82, 4);
    items.push({ key: K.depthOf([-10, -82, 0], P), svg: `<g class="tr-p tr-bag">${trPrism(K, P, obBox(F, -2.2, 2.2, -2.2, 2.2), 0, 13)}${trPrism(K, P, obBox(F, -2.6, 2.6, -2.6, 2.6), 13, 14)}${trPrism(K, P, obOct(F, 0, 0, 1.2), 14, 16)}</g>` });
  }
  g(trRelief(K, P, T));
  // the objective: the angle of the Austrian left at Sagschutz
  items.push(trObjective(K, P, T, -86, -42, { h: 12, ang: 200 }));
  return { ground: ground.join(""), items };
}

// ---------- units for a state ----------

// The Prussian line's frame for an angle: u along the line from the pivot (the refused end) toward
// the leading battalions, v toward the rear. The leading sector's front rank stays at musket range.
function obLineFrame(GEO, ang) {
  const G = FG, a = ang * OB_RAD;
  const px = G.FS * GEO.XP, py = G.AUS_FRONT + G.D0 + G.FS * GEO.U0 * Math.sin(a);
  return (u, v) => [px - u * Math.cos(a) - v * Math.sin(a), py - u * Math.sin(a) + v * Math.cos(a)];
}
// Centre of a battalion in slot `level` of sector j's group: two abreast, rows behind the front.
function obSlot(GEO, F, j, level, fwd) {
  const row = Math.floor(level / 2), col = level % 2;
  return F(FG.FS * (GEO.U0 - GEO.SP * j) + (col ? FG.COL : -FG.COL), FG.RANK + row * FG.ROW - fwd);
}
const obAusX = (GEO, i) => FG.FS * (GEO.BX0 + GEO.BPITCH * i);

// Every unit on the field and every volley for a state. M carries what the page keeps between frames:
// t (clock), cas ({ f: [4], e: [4] } casualty counts shown, eased toward the model's), horse and
// horseV (the reserve horse's progress, eased toward S.mass, and its speed) and trav (distance
// walked per unit, for strides). Defaults serve the build's frame.
export function fieldPose(S, GEO, T, M = {}) {
  const G = FG;
  const units = [], volleys = [];
  const load = loadOf(S.mass);
  const sec = sectors(S.ang, load, MODEL);
  const cas = casualties(S.ang, load, MODEL);
  const shown = M.cas || { f: cas.by.map((c) => c[0]), e: cas.by.map((c) => c[1]) };
  const t = M.t ?? 4.37;
  const fires = sec.map((s) => s.contact && s.a > 0);
  const push = S.push.map((p) => p * G.PUSH);
  const F = obLineFrame(GEO, S.ang), F0 = obLineFrame(GEO, 0);
  const face = S.ang - 90;
  const walk = (u) => {
    if (!M.trav) { u.stride = 0; return u; }   // feet move only at a walking pace or faster (about 2 units/s)
    const p = M.trav[u.id] || (M.trav[u.id] = { x: u.x, y: u.y, d: 0 });
    const d = Math.hypot(u.x - p.x, u.y - p.y);
    p.d += d; p.x = u.x; p.y = u.y;
    u.stride = d > 0.03 ? obStrideOf(p.d + obHash(u.seed || 1, 9) * 3.4, u.kind === "man" || u.kind === "litter" ? 1.7 : 2.6) : 0;
    return u;
  };
  const add = (u) => { u.z = T.height(u.x, u.y); u.look = obLook(walk(u)); units.push(u); return u; };
  const frontRank = (u) => {   // where a firing battalion's volley smoke starts: three points along its front rank's muzzles
    const B = fdFrame(u.x, u.y, u.face);
    return [-1.4, 0, 1.4].map((k) => [...B(G.RANK + 3.6, k * G.FILE), u.z + 4.5]);
  };

  // --- casualties: the n-th figure down in a sector falls from one of its battalions, where the
  // lines met (friendly in front of the Prussian front rows, enemy on the Austrian front) ---
  const fallenF = new Array(8).fill(0), fallenE = new Array(12).fill(0);
  const discs = discPlaces(S.mass);
  const bySector = [[], [], [], []];
  for (const d of discs.rest) bySector[d.peg].push(d);
  for (const list of bySector) list.sort((a, b) => a.level - b.level);
  const downs = [];
  for (let j = 0; j < 4; j++) {
    const nF = Math.floor(shown.f[j] + 1e-6), nE = Math.floor(shown.e[j] + 1e-6);
    const front = bySector[j].filter((d) => d.level < 2);
    for (let n = 0; n < nF && front.length; n++) {
      const d = front[n % front.length];
      fallenF[d.k]++;
      const [hx, hy] = obSlot(GEO, F0, j, d.level, 0);
      const B = fdFrame(hx, hy, -90);
      const [x, y] = B(G.RANK * (0.7 - (n % 3) * 0.8) + (obHash(j, n * 3) - 0.5) * 2.4, (obHash(j, n * 3 + 1) - 0.5) * 11);
      downs.push({ id: `cf${j}-${n}`, kind: "man", side: "fc", role: "m", pose: "prone", stride: 0, face: -90 + (obHash(j, n * 7) - 0.5) * 220, x, y });
    }
    for (let n = 0; n < nE; n++) {
      const i = 3 * j + (n % 3);
      fallenE[i]++;
      const x = obAusX(GEO, i) + (obHash(j + 9, n * 3) - 0.5) * 11;
      const y = G.AUS_FRONT - G.RANK * (0.2 + (Math.floor(n / 3) % 3) * 0.9) + (obHash(j + 9, n * 3 + 1) - 0.5) * 2.4;
      downs.push({ id: `ce${j}-${n}`, kind: "man", side: "hc", role: "m", pose: "prone", stride: 0, face: 90 + (obHash(j + 9, n * 7) - 0.5) * 220, x, y });
    }
  }
  for (const u of downs) { u.z = T.height(u.x, u.y); u.look = obLook(u); units.push(u); }

  // --- the Austrian line: twelve battalions, three to a sector, pushed back where the attacker wins ---
  for (let i = 0; i < 12; i++) {
    const j = Math.floor(i / 3);
    const beat = Math.max(0, push[j]) / (GEO.WIN * G.PUSH);
    const firing = fires[j] && beat < 0.85;
    const strag = beat > 0.5 ? 2 : 0;
    const u = add({ id: `e${i}`, kind: "bn", side: "h", x: obAusX(GEO, i), y: G.AUS_FRONT - G.RANK - push[j], face: 90, turn: -22 * beat, pose: firing ? "present" : "stand", n: OB_MUSKETS - fallenE[i] - strag, col: 0, loose: Math.round(9 * beat) / 10, seed: 100 + i });
    if (firing) volleys.push({ side: "h", id: 200 + i, pts: frontRank(u) });
    // a beaten sector's stragglers head for the rear
    for (let k = 0; k < strag; k++) {
      const w = obSmooth((beat - 0.5) * 2) * (18 + 8 * k);
      add({ id: `es${i}-${k}`, kind: "man", side: "h", role: "m", pose: "stand", face: -90 + (k ? 18 : -12), x: u.x + (k ? 4 : -3.5), y: u.y - 4 - w, seed: 300 + i * 2 + k });
    }
  }

  // --- the Prussian line: eight battalions on the wheeling line, or marching behind the knolls ---
  for (const d of discs.rest) {
    const [x, y] = obSlot(GEO, F, d.peg, d.level, d.level < 2 ? push[d.peg] : Math.max(0, push[d.peg]));
    const firing = fires[d.peg] && d.level < 2;
    const lose = Math.max(0, -push[d.peg]) / (-GEO.LOSE * G.PUSH);
    const u = add({ id: `f${d.k}`, kind: "bn", side: "f", lit: d.k === 0, x, y, face, pose: firing ? "present" : "stand", n: OB_MUSKETS - fallenF[d.k], col: 0, loose: Math.round(5 * lose) / 10, seed: 10 + d.k });
    if (firing) volleys.push({ side: "f", id: 20 + d.k, pts: frontRank(u) });
  }
  for (const d of discs.air) {
    const a = obSlot(GEO, F, d.from[0], d.from[1], 0), b = obSlot(GEO, F, d.to[0], d.to[1], 0);
    const route = trRoute([a, [a[0], a[1] + 14], [a[0] - 4, G.ROAD_Y], [G.TURN_X + 10, G.ROAD_Y], [G.TURN_X, G.ROAD_Y - 14], [G.TURN_X, b[1] + 8], [b[0] - 18, b[1]], b], 4);
    const w = route.at(d.t * route.length);
    const col = obSmooth(Math.min(d.t / 0.1, (1 - d.t) / 0.1));
    // on the march: column faces snap to 15-degree steps, and the battalion keeps step at a quick
    // march rather than re-drawing every frame
    const u = add({ id: `f${d.k}`, kind: "bn", side: "f", x: w.x, y: w.y, face: col > 0.5 ? obStep(w.face) : face, pose: "stand", n: OB_MUSKETS - fallenF[d.k], col: Math.round(col * 4) / 4, loose: 0, seed: 10 + d.k });
    if (u.stride) { u.stride = 1 + (Math.floor((M.t ?? 0) * 3) % 2); u.look = obLook(u); }
  }

  // --- horse: two Prussian squadrons showing on the Borne knoll, pacing to and fro; three squadrons of
  // the Austrian reserve horse riding off behind their line toward its right as the Prussians mass ---
  {
    const fc = -154;
    const B = fdFrame(G.BORNE[0], G.BORNE[1], fc);
    for (let k = 0; k < 2; k++) {
      const ph = (t / 9 + k * 0.06) * 2 * Math.PI;   // the two squadrons pace together, a little out of step
      const [x, y] = B(-2 + k * 0.5, (k ? -6.5 : 6.5) + Math.sin(ph) * 4.5);
      const v = Math.cos(ph);
      add({ id: `pc${k}`, kind: "sq", side: "f", x, y, face: Math.abs(v) < 0.35 ? fc : v > 0 ? fc + 90 : fc - 90, seed: 50 + k });
    }
    const h = M.horse ?? obClamp01(S.mass);
    const ride = trRoute(G.HORSE, 6);
    const hv = M.horseV ?? 0;
    for (let k = 0; k < 3; k++) {
      const w = ride.at(10 + h * (ride.length - 44) + (2 - k) * 14);
      add({ id: `ac${k}`, kind: "sq", side: "h", x: w.x, y: w.y, face: Math.abs(hv) > 1e-3 ? (hv > 0 ? w.face : w.face + 180) : 90, seed: 60 + k });
    }
  }

  // --- the wounded carried back: two bearers shuttle between the latest friendly casualty and the farm ---
  const lastF = downs.filter((u) => u.side === "fc").pop();
  if (lastF) {
    const home = [G.DRESS[0] - 4, G.DRESS[1] - 3], to = [lastF.x + 2.5, lastF.y + 2.5];
    const L = Math.hypot(to[0] - home[0], to[1] - home[1]);
    const speed = 7, rest = 1.2, cyc = 2 * L / speed + 2 * rest;
    const ph = ((t % cyc) + cyc) % cyc;
    const out = ph < L / speed, there = !out && ph < L / speed + rest, back = !out && !there && ph < 2 * L / speed + rest;
    const f = out ? ph * speed / L : there ? 1 : back ? 1 - (ph - L / speed - rest) * speed / L : 0;
    const dir = Math.atan2(to[1] - home[1], to[0] - home[0]) / OB_RAD;
    add({ id: "bearers", kind: "litter", side: "f", x: home[0] + (to[0] - home[0]) * f, y: home[1] + (to[1] - home[1]) * f, face: out ? dir : dir + 180, loaded: back || there, seed: 77 });
  }

  return { units, volleys, cas };
}

// Musket volleys as flashes and powder smoke, a pure function of time: each firing battalion volleys
// every few seconds (its own period and phase), three flashes along its front rank, then smoke that
// grows, drifts with the wind and thins. Returns world points; the page projects them.
export function obVolleys(volleys, t, { life = 3.4, wind = [-0.9, -1.3] } = {}) {
  const flashes = [], smoke = [];
  for (const v of volleys) {
    const period = FG.VOLLEY[0] + obHash(v.id, 3) * FG.VOLLEY[1], phase = obHash(v.id, 5) * period;
    const k1 = Math.floor((t - phase) / period);
    for (let k = k1 - 1; k <= k1; k++) {
      const age = t - (phase + k * period);
      if (age < 0 || age > life) continue;
      v.pts.forEach((p, i) => {
        if (age < 0.1) flashes.push({ p, side: v.side, a: 1 - age / 0.1 });
        const drift = age * (0.6 + 0.2 * i);
        smoke.push({ p: [p[0] + wind[0] * drift + (i - 1) * age * 0.5, p[1] + wind[1] * drift, p[2] + age * 0.7], r: 1.2 + age * 2.1, o: 0.7 * (1 - age / life) ** 1.4 * Math.min(1, age * 10) });
      });
    }
  }
  return { flashes, smoke };
}
