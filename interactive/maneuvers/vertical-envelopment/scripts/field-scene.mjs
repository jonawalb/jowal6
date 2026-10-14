// The Battlefield view of the vertical envelopment, drawn with the terrain kit (../../kit/terrain.mjs)
// as a concrete small-unit vignette (FM 3-90 says divisions and larger normally conduct one; this
// shows one air assault inside it). The same model state as the machine drives it (state() and
// casualties() from model.mjs):
//   s.air, s.lift   the crane's carry: here three utility helicopters lifting a rifle platoon (lit) from
//                   a pickup zone, over the enemy's defense line, to a landing zone by a bridge behind it
//   s.cut           the block on the enemy's rail line: here the platoon holding the bridge and the road
//                   junction, so the enemy's supply trucks halt short of it
//   s.supply        the gauge: here the pile of supply crates the platoon brought, shrinking as it is used
//   s.linkup        the carriage: here a mechanized company column on the road from the friendly side,
//                   fighting through the defense line toward the junction
//   withdrawal      if supply runs out first, the helicopters fly in and lift the platoon back out
// Casualties on both sides come from casualties() in model.mjs (notional); this file only places them.
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places every
// helicopter, vehicle, soldier and fire stream for a state (build and page); fieldMarks() draws the
// fire sectors. build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs
// and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trHole, trNest, trWire, trFan, trChalk, trObjective, trPrism, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";
import { MODEL, casualties } from "./model.mjs";

export const FG = {
  world: { x: -480, y: -420, w: 960, d: 840 },
  PZ: [-100, -22],        // pickup zone (lead helicopter), friendly side
  LZ: [142, 24],          // landing zone (lead helicopter), east of the bridge road
  SLOTS: [[0, 0], [-18, 16], [-18, -16]],   // the lift's formation, in the PZ-to-LZ heading frame (u ahead, v left)
  ALT: 34,                // cruise height, field units (notional)
  BRIDGE: [100, -20],     // where the enemy's supply road crosses the stream
  ROAD_X: 100,            // the enemy's supply road (the machine's rail line) runs along y at this x
  LINE_X: -40,            // the enemy defense line
  HOLES: [-100, -64, -28, 50, 84],          // its two-man fighting positions (y)
  NEST: [-42, 13],        // its machine-gun position, covering the road
  LX0: -406,              // the linkup column's head at progress 0 (off the left edge): it passes the line at 0.744,
  LX1: 86,                // as the machine's carriage passes the gate, and halts at the junction at 1
  VGAP: 13,               // vehicle spacing in the column
  TRUCK_STOP: [-80, 96],  // where enemy supply trucks halt north and south of the cut
  TRUCK_SPEED: 30,        // field units per second (wall clock) while the road is open
  CCP: [118, 40],         // the platoon's casualty collection point
};
FG.TERRAIN = {
  rises: [
    { cx: -290, cy: 150, r: 36, steps: 3, h: 1.8, top: 0.45, seed: 5, wobble: 0.1, squash: 0.7 },
    { cx: 260, cy: -120, r: 32, steps: 3, h: 1.7, top: 0.45, seed: 9, wobble: 0.1, squash: 0.7 },
    { cx: -120, cy: -170, r: 30, steps: 2, h: 1.6, top: 0.5, seed: 13, wobble: 0.12, squash: 0.7 },
    { cx: 40, cy: 175, r: 30, steps: 2, h: 1.6, top: 0.5, seed: 17, wobble: 0.12, squash: 0.7 },
  ],
};

const VE_RAD = Math.PI / 180;
const veClamp01 = (x) => Math.min(1, Math.max(0, x));
const veSmooth = (a, b, x) => { const t = veClamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const veLerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const veBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
const veStride = (d) => [1, 0, 2, 0][Math.floor(Math.max(0, d) / 1.7) % 4];
const veToward = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / VE_RAD;
const veAngLerp = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;

// the linkup road: a gentle bend from the friendly side to the junction at (ROAD_X, 30)
export const veRoadY = (x) => 30 + 6 * Math.sin((x - FG.ROAD_X) * 0.011);
export const fieldTerrain = () => trTerrain(FG.TERRAIN);

const HEAD = veToward(FG.PZ, FG.LZ);
const slotAt = (base, i) => fdFrame(base[0], base[1], HEAD)(...FG.SLOTS[i]);

// ---------- the platoon (lit): three chalks, one per helicopter ----------
// Each man: chalk, role, objective place and facing and pose, and his waiting place beside his
// helicopter at the pickup zone. Squad A blocks the bridge (north), squad B the road south, squad C
// the road west toward the defense line, where the linkup force will come from.
let VE_R = null;
function roster() {
  if (VE_R) return VE_R;
  const men = [];
  const squad = (chalk, place) => ["tl", "ar", "gr", "r", "sl", "tl", "ar", "gr", "r"].forEach((role, i) => men.push({ chalk, role, ...place(i) }));
  const xs = [80, 84.5, 89, 93.5, 0, 106.5, 111, 115.5, 120];
  squad(0, (i) => (i === 4 ? { obj: [100, 2], face: -90, pose: "kneel" } : { obj: [xs[i], -4 + (i % 2 ? 1 : -0.6)], face: -90 + (i % 3 - 1) * 8, pose: "prone" }));
  men.push({ chalk: 0, role: "pl", obj: [98, 18], face: -90, pose: "kneel" }, { chalk: 0, role: "rto", obj: [94.5, 20], face: -60, pose: "kneel" });
  squad(1, (i) => (i === 4 ? { obj: [100, 57], face: 90, pose: "kneel" } : { obj: [xs[i], 64 + (i % 2 ? -0.8 : 0.6)], face: 90 + (i % 3 - 1) * 8, pose: "prone" }));
  men.push({ chalk: 1, role: "r", obj: [...FG.CCP], face: 200, pose: "kneel", medic: true });
  const ys = [6, 10.5, 15, 19.5, 0, 38, 42.5, 47, 51.5];
  squad(2, (i) => (i === 4 ? { obj: [74, 18], face: 180, pose: "kneel" } : { obj: [66 + (i % 2 ? 1.2 : -0.6), ys[i]], face: 180 + (i % 3 - 1) * 8, pose: "prone" }));
  const count = [0, 0, 0];
  men.forEach((m, j) => {
    m.id = `s${j}`;
    m.k = count[m.chalk]++;
    const pz = slotAt(FG.PZ, m.chalk);
    m.wait = fdFrame(pz[0], pz[1], HEAD)(-7 + (m.k % 6) * 2.6, 6.5 + Math.floor(m.k / 6) * 2.8);
  });
  // casualty order: the landing fight, then one per spell held (notional, from casualties())
  const land = men.findIndex((m) => m.chalk === 0 && m.role === "gr");
  const hold = [men.findIndex((m, j) => m.chalk === 1 && m.role === "tl" && j > 14), men.findIndex((m, j) => m.chalk === 0 && m.role === "ar" && j > 4), men.findIndex((m) => m.chalk === 2 && m.role === "ar")];
  VE_R = { men, land, hold };
  return VE_R;
}

// ---------- the enemy ----------
function enemies() {
  const out = [];
  const hole = (group, x, y, face, n = 2, roles = ["r", "r"]) => {
    const F = fdFrame(x, y, face);
    for (let i = 0; i < n; i++) { const v = n === 1 ? 0 : i ? 1.1 : -1.1; const [px, py] = F(0, v); out.push({ group, x: px, y: py, hx: x, hy: y, v, face, role: roles[i] }); }
  };
  // the defense line, facing west; ordered for the fight-through by distance from the road
  FG.HOLES.forEach((y, i) => hole("line", FG.LINE_X + (i % 2 ? 1.5 : -1.5), y, 180, 2, i === 2 ? ["ar", "r"] : ["r", "r"]));
  out.push({ group: "line", x: FG.NEST[0], y: FG.NEST[1], hx: FG.NEST[0], hy: FG.NEST[1], v: -1.1, face: 180, role: "mg" });
  { const F = fdFrame(FG.NEST[0], FG.NEST[1], 180), [ax, ay] = F(-1.4, 1.5); out.push({ group: "line", x: ax, y: ay, hx: FG.NEST[0], hy: FG.NEST[1], v: 1.1, face: 180, role: "ag" }); }
  // the bridge guard at the north end, facing south across it
  hole("guard", 92, -38, 90, 2, ["ar", "r"]);
  hole("guard", 110, -38, 90);
  // riflemen round the bridge who keep firing on the platoon while it holds (north bank, and south down the road)
  hole("hold", 70, -62, 60, 1);
  hole("hold", 86, 126, -90, 2);
  hole("hold", 130, -60, 115, 1);
  hole("stay", 152, -72, 120, 1);
  const road = 24;
  const line = out.filter((e) => e.group === "line").sort((a, b) => Math.abs(a.hy - road) - Math.abs(b.hy - road) || a.v - b.v);
  const hold = out.filter((e) => e.group === "hold");
  const holdOrder = [hold[0], hold[1], hold[3], hold[2], ...hold.slice(4)];
  return { all: out, line, guard: out.filter((e) => e.group === "guard"), holdOrder };
}
let VE_E = null;
const foes = () => VE_E || (VE_E = enemies());

// ---------- local drawing helpers ----------

// A wheeled truck at the origin facing `face`: cargo box, cab and chassis, about 7 units long, drawn
// inside a <g class="tr-s" data-side>. Enemy supply trucks are red; the ambulance (data-side="m") white.
export function veTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, veBox(F, u0, u1, v0, v1), z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(veBox(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

// A utility helicopter at the origin (skids on z = 0) facing `face`: skids on cross tubes, cabin with a
// tapered nose, engine deck, tail boom, fin and tail rotor, mast and a four-blade main rotor. `blades`
// is the blade angle in degrees; `spin` adds the rotor's blur disc. About 19 units long.
export function veHeli(K, P, face = 0, blades = 30, spin = false) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [];
  const put = (ring, z0, z1, gear) => {
    const c = ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length], [0, 0]);
    parts.push([K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, ring, z0, z1, gear)]);
  };
  for (const v of [-2.1, 2.1]) put(veBox(F, -4.2, 4.4, v - 0.22, v + 0.22), 0, 0.32, true);           // skids
  for (const u of [-2.4, 2.2]) put(veBox(F, u - 0.25, u + 0.25, -2.1, 2.1), 0.32, 0.9, true);         // cross tubes
  put(veBox(F, -3.6, 3.2, -1.85, 1.85), 0.9, 4.1);                                                    // cabin
  put([F(3.2, -1.85), F(5.8, -1.0), F(6.4, -0.3), F(6.4, 0.3), F(5.8, 1.0), F(3.2, 1.85)], 1.2, 3.7); // nose
  put(veBox(F, -2.8, 1.6, -1.1, 1.1), 4.1, 5.1);                                                      // engine deck
  put([F(-3.6, -0.7), F(-11.2, -0.32), F(-11.2, 0.32), F(-3.6, 0.7)], 3.0, 4.1);                      // tail boom
  put(veBox(F, -11.8, -10.6, -0.2, 0.2), 3.2, 6.6);                                                   // fin
  put(veBox(F, -0.35, 0.35, -0.35, 0.35), 5.1, 5.8, true);                                            // mast
  parts.sort((a, b) => a[0] - b[0]);
  const svg = parts.map((p) => p[1]).join("");
  // tail rotor: a small disc on the fin's left side, edge-on to the boom
  const tr = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * Math.PI; tr.push(K.iso([...F(-11.2 + 1.5 * Math.cos(a), 0.45), 5.4 + 1.5 * Math.sin(a)], P0)); }
  const tail = `<path class="ve-rotor" d="${K.pathOf(tr, true)}"/>`;
  // main rotor at z 6.0: blur disc while turning, and four blades
  const zr = 6.0, R = 8.6;
  const disc = [];
  for (let i = 0; i < 28; i++) { const a = (i / 28) * 2 * Math.PI; disc.push(F(R * Math.cos(a), R * Math.sin(a))); }
  let rotor = spin ? `<path class="ve-rotor" d="${K.onTop(disc, zr, P0, true)}"/>` : "";
  let bl = "";
  for (let k = 0; k < 4; k++) {
    const a = (blades + k * 90) * VE_RAD, c = Math.cos(a), s = Math.sin(a);
    const G = (r, w) => F(r * c - w * s, r * s + w * c);
    bl += K.onTop([G(0.3, -0.28), G(R, -0.22), G(R, 0.22), G(0.3, 0.28)], zr, P0, true);
  }
  rotor += `<path class="ve-blade" d="${bl}"/>`;
  return tail + svg + rotor;
}
// The helicopter's shadow on the ground: fuselage, boom and rotor disc.
export function veHeliShadow(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const disc = [];
  for (let i = 0; i < 24; i++) { const a = (i / 24) * 2 * Math.PI; disc.push(F(8.6 * Math.cos(a), 8.6 * Math.sin(a))); }
  return `<path class="tr-shadow" d="${K.onTop([F(-3.8, -2.2), F(6.4, -1.2), F(6.4, 1.2), F(-3.8, 2.2)], 0, P0, true)}${K.onTop([F(-3.6, -0.7), F(-11.6, -0.4), F(-11.6, 0.4), F(-3.6, 0.7)], 0, P0, true)}"/><path class="tr-shadow ve-disc-shadow" d="${K.onTop(disc, 0, P0, true)}"/>`;
}
// The platoon's supply: a pile of up to six crates, `n` of them left.
export function veCrates(K, P, n) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, 20);
  const spots = [[0, 0, 0], [2.6, 0.2, 0], [0.2, 2.4, 0], [2.8, 2.6, 0], [1.3, 1.2, 1.6], [1.5, 1.3, 3.2]];
  const parts = spots.slice(0, n).map(([u, v, z]) => [K.depthOf([...F(u, v), z + 0.8], P0), trPrism(K, P0, veBox(F, u - 1.1, u + 1.1, v - 0.95, v + 0.95), z, z + 1.6)]);
  parts.sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(veBox(F, -1.6, 4.2, -1.4, 3.9), 0, P0, true)}"/>` + `<g class="ve-crate">${parts.map((p) => p[1]).join("")}</g>`;
}
// A stopped, burning vehicle's smoke: three soft puffs rising from the origin, drifting with the wind.
export function veSmokePlume(K, P, step = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const k = K.cameraOf(P0).k;
  let svg = "";
  for (let i = 0; i < 4; i++) {
    const f = (i + step / 4) / 4;
    const [x, y] = K.iso([-2.2 * f * 6, -3.4 * f * 6, 3 + f * 14], P0);
    svg += `<circle class="tr-smoke" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${((1.4 + f * 4.5) * k).toFixed(1)}" opacity="${(0.42 * (1 - f) + 0.06).toFixed(2)}"/>`;
  }
  return svg;
}

// The bridge where the supply road crosses the stream: a deck on two piers with low kerbs.
function bridge(K, P) {
  const [bx, by] = FG.BRIDGE;
  const F = fdFrame(bx, by, 90);
  const L = 12;
  const svg = [-4.5, 4.5].map((u) => K.solidSvg(K.extrude(veBox(F, u - 0.9, u + 0.9, -3.4, 3.4), 0, 0.9, P), { tone: "lo", crease: "none" })).join("") +
    K.solidSvg(K.extrude(veBox(F, -L, L, -4, 4), 0.9, 0.7, P), { tone: "mid", className: "tr-wall" }) +
    [-1, 1].map((sv) => K.solidSvg(K.extrude(veBox(F, -L, L, sv * 4 - 0.35, sv * 4 + 0.35), 1.6, 0.8, P), { tone: "mid", crease: "none", className: "tr-wall" })).join("");
  return { key: K.depthOf([bx, by, 0], P), svg };
}

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  for (const [cx, cy, r, seed, sq] of [[-170, -40, 56, 3, 0.6], [150, 24, 50, 5, 0.6], [0, 30, 60, 7, 0.5], [-90, 90, 50, 11, 0.6], [200, -70, 40, 13, 0.6]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-330, -10], [-262, -6], [-266, 44], [-334, 38]], 8, "a"],
    [[[-300, -120], [-236, -116], [-240, -76], [-304, -80]], 7, "b"],
    [[[210, 60], [280, 54], [284, 100], [214, 106]], 8, "b"],
    [[[170, -150], [236, -156], [240, -112], [174, -106]], 7, "a"],
    [[[-110, 120], [-50, 118], [-52, 156], [-112, 158]], 6, "b"],
    [[[140, 110], [196, 106], [198, 146], [142, 150]], 6, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // the stream behind the defense line, the enemy's supply road across it, the linkup road, a farm track
  const streamPts = [[470, -72], [300, -48], [190, -30], [100, -20], [50, -36], [22, -110], [4, -240], [-14, -470]];
  g(trStream(K, P, streamPts, 5, 7));
  const supply = [[G.ROAD_X, -470], [G.ROAD_X, 470]];
  g(trRoad(K, P, supply, 3.4));
  const link = [];
  for (let x = -520; x <= G.ROAD_X; x += 12) link.push([x, veRoadY(x)]);
  link.push([G.ROAD_X, veRoadY(G.ROAD_X)]);
  g(trRoad(K, P, link, 3.2));
  g(trRoad(K, P, [[-300, 260], [-270, 150], [-240, 80], [-236, veRoadY(-236)]], 2.1, { ruts: false }));

  // woods and copses, clear of the roads, the stream, the landing and pickup zones and every position
  const R = roster(), E = foes();
  const near = (x, y) =>
    Math.abs(x - G.ROAD_X) < 15 || Math.abs(y - veRoadY(x)) < 15 ||
    streamPts.some((p, i) => i && segDist(x, y, streamPts[i - 1], p) < 11) ||
    [0, 1, 2].some((i) => { const a = slotAt(G.LZ, i), b = slotAt(G.PZ, i); return Math.hypot(x - a[0], y - a[1]) < 30 || Math.hypot(x - b[0], y - b[1]) < 30; }) ||
    R.men.some((m) => Math.hypot(x - m.obj[0], y - m.obj[1]) < 9) || E.all.some((e) => Math.hypot(x - e.hx, y - e.hy) < 10) ||
    Math.abs(x - G.LINE_X) < 24 && y > -130 && y < 130;
  const woods = [
    [fdBlob(12, 96, 36, 21, 0.1, 44, 0.55), 18, 21],
    [fdBlob(-40, -170, 44, 22, 0.1, 44, 0.5), 16, 22],
    [fdBlob(236, 22, 38, 23, 0.12, 40, 0.6), 16, 23],
    [fdBlob(-200, 96, 42, 24, 0.12, 40, 0.55), 16, 24],
    [fdBlob(-300, -190, 50, 26, 0.12, 40, 0.6), 14, 26],
    [fdBlob(300, -200, 46, 27, 0.12, 40, 0.6), 14, 27],
    [fdBlob(200, 170, 40, 28, 0.12, 40, 0.6), 12, 28],
    [fdBlob(-110, -96, 26, 29, 0.12, 36, 0.6), 8, 29],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 6.2, r: [2.8, 4.4], h: [8, 12], avoid: (x, y) => near(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-330, -10], [-262, -6], [-266, 44]], 51], [[[210, 60], [280, 54]], 53], [[[170, -150], [236, -156]], 54], [[[-110, 120], [-50, 118]], 55]]) items.push(...trHedge(K, P, pts, { seed }));
  // a hamlet on the north bank by the bridge, a farm on the friendly side, one to the south-east
  for (const [x, y, a, l, w] of [[140, -44, 0, 10, 7], [160, -32, 90, 9, 6.5], [62, -84, 10, 9, 6.5], [-262, 60, 0, 11, 7], [-246, 74, 90, 9, 6.5], [226, 120, 0, 10, 7]]) items.push(trHouse(K, P, x, y, a, l, w));

  g(trRelief(K, P, T));
  items.push(bridge(K, P));

  // the defense line: fighting positions and a machine-gun position, wire in front with a gap at the road
  G.HOLES.forEach((y, i) => items.push(...trHole(K, P, G.LINE_X + (i % 2 ? 1.5 : -1.5), y, 0, 180)));
  items.push(...trNest(K, P, G.NEST[0], G.NEST[1], 0, 180));
  items.push(...trWire(K, P, T, [[-60, -124], [-58, -60], [-59, 6]]));
  items.push(...trWire(K, P, T, [[-59, 42], [-58, 96], [-60, 126]]));
  // the bridge guard and the riflemen round the bridge
  for (const e of foes().all) if (e.group !== "line" && (e.v <= 0)) items.push(...trHole(K, P, e.hx, e.hy, 0, e.face, e.v === 0 ? { len: 3.2 } : {}));

  // control measures: the pickup zone outlined in chalk, and the objective flag at the bridge
  const pz = [0, 1, 2].map((i) => slotAt(G.PZ, i));
  const xs = pz.map((p) => p[0]), ys = pz.map((p) => p[1]);
  const box = [[Math.min(...xs) - 16, Math.min(...ys) - 14], [Math.max(...xs) + 16, Math.min(...ys) - 18], [Math.max(...xs) + 16, Math.max(...ys) + 18], [Math.min(...xs) - 16, Math.max(...ys) + 14]];
  const c = trChalk(K, P, T, box, { closed: true });
  g(c.ground); items.push(...c.items);
  items.push(trObjective(K, P, T, 124, -12));
  return { ground: ground.join(""), items };
}
function segDist(x, y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? veClamp01(((x - a[0]) * dx + (y - a[1]) * dy) / L) : 0;
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}

// ---------- the helicopters' flights ----------
// Where the lift is for state s: a (0 over the pickup zone, 1 over the landing zone), height z, facing,
// whether the rotors turn, and whether the platoon is aboard. The insertion and the extraction follow
// the model's air and lift; the empty legs (back to the pickup zone after landing, and in again before
// the extraction) are this view's own choreography inside the model's phases.
function flight(s, m = MODEL) {
  const t = s.t, O = s.outAt, ext = !s.inTime;
  const climb = (lift) => FG.ALT * veSmooth(0.25, 1, lift);
  const own = (w) => ({ a: veSmooth(0.12, 0.88, w), z: FG.ALT * (veSmooth(0, 0.2, w) - veSmooth(0.8, 1, w)) });
  const E = 0, W = 180;
  if (t < m.landed) return { a: s.air, z: climb(s.lift), face: HEAD + E, spin: true, aboard: t > 0.15 };
  const back0 = m.landed + 0.05, back1 = m.landed + 0.75;
  if (ext && t >= O - 1.5) {
    if (t < O - 0.25) { const f = own((t - (O - 1.5)) / 1.25); return { a: f.a, z: f.z, face: HEAD, spin: true, aboard: false }; }
    if (t < O) return { a: 1, z: 0, face: HEAD + W * veSmooth(O - 0.25, O, t), spin: true, aboard: false };
    if (t < O + m.lift) return { a: s.air, z: climb(s.lift), face: HEAD + W, spin: true, aboard: t > O + 0.12 || s.lift > 0.2 };
    return { a: 0, z: 0, face: HEAD + W, spin: t < O + m.lift + 0.12, aboard: false };
  }
  if (t < back0) return { a: 1, z: 0, face: HEAD, spin: true, aboard: false };
  if (t < back1) { const w = (t - back0) / (back1 - back0); const f = own(w); return { a: 1 - f.a, z: f.z, face: HEAD + W * veSmooth(0, 0.1, w), spin: true, aboard: false }; }
  return { a: 0, z: 0, face: HEAD + W, spin: t < back1 + 0.1, aboard: false };
}

// Where every helicopter, vehicle and soldier is and who fires at whom, for a model state s.
// M carries what the page measures between frames: t (wall-clock seconds, for rotors, trucks and fire),
// trucks ([{ y, face }] eased positions). Defaults let the build's first frame work without it.
export function fieldPose(s, T, M = {}) {
  const G = FG, MD = MODEL, R = roster(), E = foes();
  const c = casualties(s);
  const wt = M.t ?? 0;
  const men = [], units = [];
  const man = (o) => { o.z = T.height(o.x, o.y); men.push(o); return o; };
  const unit = (o) => { o.z = (o.z ?? 0) + T.height(o.x, o.y); units.push(o); return o; };
  const t = s.t, O = s.outAt, ext = !s.inTime;

  // --- the lift ---
  const fl = flight(s);
  const blades = fl.spin ? (Math.floor(wt * 26) % 6) * 15 : 30;
  const helis = [0, 1, 2].map((i) => {
    const pz = slotAt(G.PZ, i), lz = slotAt(G.LZ, i);
    const [x, y] = veLerp(pz, lz, fl.a);
    return unit({ id: `h${i}`, kind: "heli", side: "f", lit: fl.aboard, face: fl.face, spin: fl.spin, blades, x, y, z: fl.z, i });
  });
  helis.forEach((h) => units.push({ id: `hs${h.i}`, kind: "shadow", side: "f", face: h.face, x: h.x, y: h.y, z: T.height(h.x, h.y), lift: h.z }));

  // --- the platoon ---
  const onObj = t >= 1.84 && !(ext && t >= O + 0.12);
  const atPZ = ext && t >= O + MD.lift;
  const casIdx = [];
  if (c.land) casIdx.push({ j: R.land, tc: MD.landed + 0.1 });
  for (let k = 0; k < c.holdB; k++) casIdx.push({ j: R.hold[k], tc: MD.landed + MD.loss.holdEvery[0] * (k + 1) });
  const down = new Map(casIdx.map((d) => [d.j, d.tc]));
  const lastDown = casIdx.length ? casIdx[casIdx.length - 1].j : -1;
  // a man's place on the objective at time u: out of the door, a run to his position, then down in it
  const placeAt = (m, j, u) => {
    const lz = slotAt(G.LZ, m.chalk), door = fdFrame(lz[0], lz[1], HEAD)(-1 + m.k * 0.6, m.k % 2 ? 2.8 : -2.8);
    const t0 = 1.86 + m.k * 0.012, w = veSmooth(t0, t0 + 0.32, u);
    if (u < t0) return null;
    if (w < 1) { const [x, y] = veLerp(door, m.obj, w); return { x, y, face: veToward(door, m.obj), pose: "stand", stride: veStride(w * Math.hypot(m.obj[0] - door[0], m.obj[1] - door[1])) }; }
    return { x: m.obj[0], y: m.obj[1], face: m.face, pose: m.pose, stride: 0 };
  };
  R.men.forEach((m, j) => {
    const lit = true;
    if (t < 1.84) {
      // waiting by the helicopter at the pickup zone, then boarding
      const pz = slotAt(G.PZ, m.chalk), door = fdFrame(pz[0], pz[1], HEAD)(-1 + m.k * 0.6, 2.8);
      const t0 = m.k * 0.008, w = veSmooth(t0, t0 + 0.1, t);
      if (w >= 1) return;
      const [x, y] = veLerp(m.wait, door, w);
      man({ id: m.id, side: "f", lit, role: m.role, pose: w > 0 ? "stand" : "kneel", face: w > 0 ? veToward(m.wait, door) : HEAD + 90, stride: veStride(w * 9), x, y });
      return;
    }
    if (atPZ) {
      // lifted out: back at the pickup zone, the wounded laid beside the helicopters
      const pz = slotAt(G.PZ, m.chalk), door = fdFrame(pz[0], pz[1], HEAD + 180)(-1 + m.k * 0.6, -2.8);
      const hurt = down.has(j) || (c.extract && j === R.men.findIndex((q) => q.chalk === 2 && q.role === "gr"));
      const w = veSmooth(O + MD.lift + m.k * 0.01, O + MD.lift + 0.25 + m.k * 0.01, t);
      if (hurt) { const [x, y] = fdFrame(pz[0], pz[1], HEAD)(-9 + m.k * 2.2, 13.5); man({ id: m.id, side: "fc", role: m.role, pose: "prone", face: HEAD + 90, stride: 0, x, y }); return; }
      if (w <= 0) return;
      const [x, y] = veLerp(door, m.wait, w);
      man({ id: m.id, side: "f", lit, role: m.role, pose: w < 1 ? "stand" : "kneel", face: w < 1 ? veToward(door, m.wait) : HEAD + 90, stride: veStride(w * 9), x, y });
      return;
    }
    if (!onObj) return;   // aboard
    if (down.has(j)) {
      const p = placeAt(m, j, down.get(j)) || { x: m.obj[0], y: m.obj[1], face: m.face };
      man({ id: m.id, side: "fc", role: m.role, pose: "prone", face: p.face + 30, stride: 0, x: p.x, y: p.y });
      return;
    }
    let p = placeAt(m, j, t);
    if (!p) return;
    if (ext && t >= O - 0.25) {
      // boarding for the extraction: back to the door of his own helicopter
      const lz = slotAt(G.LZ, m.chalk), door = fdFrame(lz[0], lz[1], HEAD)(-1 + m.k * 0.6, m.k % 2 ? 2.8 : -2.8);
      const t0 = O - 0.25 + m.k * 0.01, w = veSmooth(t0, t0 + 0.3, t);
      if (w >= 1) return;
      if (w > 0) { const [x, y] = veLerp(m.obj, door, w); p = { x, y, face: veToward(m.obj, door), pose: "stand", stride: veStride(w * Math.hypot(door[0] - m.obj[0], door[1] - m.obj[1])) }; }
    }
    if (m.medic && lastDown >= 0 && p.pose !== "stand") {
      const d = R.men[lastDown].obj, a = veToward(d, G.CCP) * VE_RAD;
      p = { x: d[0] + 2.4 * Math.cos(a), y: d[1] + 2.4 * Math.sin(a), face: veToward(G.CCP, d), pose: "kneel", stride: 0 };
    }
    man({ id: m.id, side: "f", lit, role: m.role, pose: p.pose, face: p.face, stride: p.stride, x: p.x, y: p.y, obj: p.pose !== "stand", chalk: m.chalk });
  });
  // the supply the platoon brought: crates by the platoon leader, fewer as the gauge falls
  if (onObj && t >= MD.landed) unit({ id: "crates", kind: "crates", side: "f", n: Math.ceil(s.supply * 6 - 1e-6), x: 106, y: 22 });

  // --- the enemy: men in their holes; the fallen greyed behind them ---
  const red = new Set();
  E.guard.slice(0, c.guards).forEach((e) => red.add(e));
  E.holdOrder.slice(0, c.holdR).forEach((e) => red.add(e));
  E.line.slice(0, c.fightR).forEach((e) => red.add(e));
  E.all.forEach((e, k) => {
    if (red.has(e)) {
      const F = fdFrame(e.hx, e.hy, e.face), [x, y] = F(e.v > 0 ? -4.1 : -2.6, 1.9 - e.v * 0.4);
      man({ id: `e${k}`, side: "hc", role: e.role, pose: "prone", face: e.face + 90 + (k % 2 ? 12 : -8), stride: 0, x, y });
    } else man({ id: `e${k}`, side: "h", role: e.role, pose: "hole", face: e.face, stride: 0, x: e.x, y: e.y, live: true, group: e.group });
  });

  // --- enemy supply trucks on the road: shuttling while it is open, halted short of the cut ---
  const want = [0, 1].map((i) => {
    const span = 640, u = ((wt * G.TRUCK_SPEED + i * span) % (2 * span));
    const y = -320 + (u < span ? u : 2 * span - u);
    return { y, face: u < span ? 90 : -90 };
  });
  const trucks = M.trucks || [{ y: s.cut ? G.TRUCK_STOP[0] : want[0].y, face: 90 }, { y: s.cut ? G.TRUCK_STOP[1] : want[1].y, face: -90 }];
  const truckWant = trucks.map((tk, i) => {
    if (!s.cut) return want[i];
    const north = tk.y < 20, other = trucks[1 - i], back = i === 1 && (other.y < 20) === north ? 12 : 0;
    return north ? { y: G.TRUCK_STOP[0] - back, face: 90 } : { y: G.TRUCK_STOP[1] + back, face: -90 };
  });
  trucks.forEach((tk, i) => unit({ id: `t${i}`, kind: "truck", side: "h", face: tk.face, x: G.ROAD_X + (tk.face > 0 ? -1 : 1), y: tk.y }));

  // --- the linkup column: five tracked vehicles and an ambulance; one is hit fighting through the line ---
  const p = s.linkup, hx = G.LX0 + p * (G.LX1 - G.LX0);
  const roadAt = (x) => ({ x, y: veRoadY(x), face: Math.atan2(veRoadY(x + 1) - veRoadY(x - 1), 2) / VE_RAD });
  const hitQ = 0.5, pHit = MD.fight[0] + hitQ * (MD.fight[1] - MD.fight[0]), hitX = G.LX0 + pHit * (G.LX1 - G.LX0) - G.VGAP;
  const vehicles = [];
  for (let k = 0; k < 6; k++) {
    const amb = k === 5;
    let x = hx - k * G.VGAP;
    if (amb && s.phase === "linked") {
      // after linkup the ambulance drives up to the platoon's casualty collection point
      const w = veSmooth(s.linkupAt, s.linkupAt + 1.5, t), from = roadAt(x);
      const to = [G.CCP[0] - 9, G.CCP[1] - 4];
      const [ax, ay] = veLerp([from.x, from.y], to, w);
      vehicles.push(unit({ id: "amb", kind: "amb", side: "m", face: w > 0 && w < 1 ? veToward([from.x, from.y], to) : from.face, x: ax, y: ay }));
      continue;
    }
    if (k === 1 && c.fightB) {
      const r = roadAt(hitX), F = fdFrame(r.x, r.y, r.face);
      const [vx, vy] = F(0, -6.5);
      vehicles.push(unit({ id: "v1", kind: "veh", side: "fc", face: r.face - 25, x: vx, y: vy, hit: true }));
      units.push({ id: "smoke", kind: "smoke", side: "f", x: vx, y: vy, z: T.height(vx, vy), step: Math.floor(wt * 3) % 4 });
      [[-3, -10, 70], [2, -11.5, 110]].forEach(([u, v, f], q) => { const [cx, cy] = F(u, v); man({ id: `vc${q}`, side: "fc", role: "r", pose: "prone", face: r.face + f, stride: 0, x: cx, y: cy }); });
      continue;
    }
    if (x < -470) continue;
    const r = roadAt(x);
    vehicles.push(unit({ id: amb ? "amb" : `v${k}`, kind: amb ? "amb" : "veh", side: amb ? "m" : "f", face: r.face, x: r.x, y: r.y }));
  }

  // --- fire ---
  const streams = [];
  const live = men.filter((q) => q.live);
  const aim = (q) => trAimPoint(q, q.x, q.y, q.z);
  const muzzle = (q) => trMuzzle(q, q.x, q.y, q.z);
  const air = helis.filter((h) => h.z > 8);
  // the lift crossing the defense line (in, and out on an extraction) draws fire; a door gunner answers
  const crossing = air.filter((h) => h.x > -125 && h.x < 40);
  if (crossing.length) {
    const tg = crossing.map((h) => [h.x, h.y, h.z + 2.5]);
    live.filter((q) => q.group === "line" && (q.role === "mg" || q.role === "ar")).forEach((q, k) => streams.push({ id: `${q.id}a`, side: "h", heavy: q.role === "mg", from: muzzle(q), to: tg, period: 0.9, burst: q.role === "mg" ? 3 : 2, gap: 0.08, flight: 0.4, phase: k * 0.3, on: 0.75, scatter: 5 }));
    const lineLive = live.filter((q) => q.group === "line");
    if (lineLive.length) crossing.slice(0, 2).forEach((h, k) => { const F = fdFrame(h.x, h.y, h.face); streams.push({ id: `dg${h.i}`, side: "f", heavy: true, from: [...F(0.5, k ? -2.3 : 2.3), h.z + 2.6], to: lineLive.map(aim), period: 1.1, burst: 3, gap: 0.08, flight: 0.45, phase: 0.2 + k * 0.5, on: 0.6, scatter: 4 }); });
  }
  if (ext && t >= MD.landed + 1) {
    const out = air.filter((h) => h.x > 20);
    if (out.length) live.filter((q) => q.group === "hold" || q.group === "stay").forEach((q, k) => streams.push({ id: `${q.id}x`, side: "h", from: muzzle(q), to: out.map((h) => [h.x, h.y, h.z + 2.5]), period: 1.4, burst: 2, gap: 0.1, flight: 0.4, phase: k * 0.37, on: 0.6, scatter: 5 }));
  }
  const objMen = men.filter((q) => q.obj);
  // the landing fight at the bridge
  const guards = live.filter((q) => q.group === "guard");
  if (guards.length && t > 1.7 && t < MD.landed + 0.8) {
    const tg = [...objMen.filter((q) => q.chalk === 0).map(aim), ...helis.filter((h) => h.z < 2).map((h) => [h.x, h.y, h.z + 2.5])];
    guards.forEach((q, k) => streams.push({ id: `${q.id}g`, side: "h", heavy: q.role === "ar", from: muzzle(q), to: tg, period: 1.0, burst: 2, gap: 0.09, flight: 0.3, phase: k * 0.31, on: 0.8, scatter: 3 }));
    objMen.filter((q) => q.chalk === 0 && q.pose === "prone").forEach((q, k) => streams.push({ id: `${q.id}g`, side: "f", heavy: q.role === "ar", from: muzzle(q), to: guards.map(aim), period: q.role === "ar" ? 0.9 : 1.4, burst: q.role === "ar" ? 2 : 1, gap: 0.08, flight: 0.3, phase: k * 0.29, on: 0.85, scatter: 2 }));
  }
  // holding: the enemy round the bridge keeps the platoon under fire; it answers
  if (s.phase === "holding" || s.phase === "linked" || (ext && s.phase === "withdrawing" && onObj)) {
    const shooters = live.filter((q) => q.group === "hold" || q.group === "stay");
    const level = s.phase === "linked" ? 0.15 : 0.4;
    const tg = objMen.filter((q) => q.chalk !== 2).map(aim);
    if (tg.length) shooters.forEach((q, k) => streams.push({ id: `${q.id}h`, side: "h", from: muzzle(q), to: tg, period: 1.9, burst: 2, gap: 0.1, flight: 0.4, phase: 0.2 + k * 0.53, on: level, scatter: 4 }));
    if (shooters.length) objMen.filter((q) => q.role === "ar" && q.chalk !== 2).forEach((q, k) => streams.push({ id: `${q.id}h`, side: "f", heavy: true, from: muzzle(q), to: shooters.map(aim).filter((a, i) => Math.sign(shooters[i].y - 20) === Math.sign(q.y - 20)), period: 1.3, burst: 2, gap: 0.08, flight: 0.4, phase: 0.4 + k * 0.41, on: level + 0.1, scatter: 3 }));
  }
  // the linkup column fighting through the line
  const lineLive = live.filter((q) => q.group === "line" && Math.abs(q.y - 24) < 80);
  if (lineLive.length && hx > -170 && hx < -10) {
    const lead = vehicles.filter((u) => u.kind === "veh" && !u.hit && u.x > -200).sort((a, b) => b.x - a.x).slice(0, 2);
    const fight = veSmooth(-170, -130, hx) * (1 - veSmooth(-30, -10, hx));
    lead.forEach((u, k) => { const F = fdFrame(u.x, u.y, u.face); streams.push({ id: `${u.id}f`, side: "f", heavy: true, smoke: true, from: [...F(4.2, 0), u.z + 3.1], to: lineLive.map(aim), period: 1.4 + k * 0.37, burst: 1, gap: 0, flight: 0.35, phase: k * 0.6, on: 0.8 * fight, scatter: 3 }); });
    const tg = lead.map((u) => [u.x, u.y, u.z + 1.8]);
    if (tg.length) lineLive.filter((q, k) => q.role === "mg" || q.role === "ar" || k % 2 === 0).forEach((q, k) => streams.push({ id: `${q.id}f`, side: "h", heavy: q.role === "mg", from: muzzle(q), to: tg, period: q.role === "mg" ? 1.1 : 1.7, burst: q.role === "mg" ? 3 : 1, gap: 0.09, flight: 0.35, phase: 0.2 + k * 0.41, on: 0.75 * fight, scatter: 3 }));
  }

  const nest = live.some((q) => q.group === "line" && q.role === "mg");
  return { units, men, streams: streams.filter((st) => st.to.length), truckWant, marks: { onObj: onObj && t >= MD.landed + 0.2, nest }, sig: `${onObj && t >= MD.landed + 0.2 ? 1 : 0}|${nest ? 1 : 0}` };
}

// Per-state ground marks: the platoon's three sectors round the bridge and junction while it holds,
// and the enemy machine gun's sector down the road while it lives.
export function fieldMarks(K, P, T, pose) {
  let svg = "";
  if (pose.marks.nest) svg += trFan(K, P, T, FG.NEST[0] - 4, FG.NEST[1], 6, 50, 160, 200, { side: "h", arcs: 2, alpha: 0.75 });
  if (pose.marks.onObj) {
    svg += trFan(K, P, T, 100, -8, 6, 40, -122, -58, { side: "f", arcs: 1, alpha: 0.7 });
    svg += trFan(K, P, T, 100, 67, 6, 40, 58, 122, { side: "f", arcs: 1, alpha: 0.7 });
    svg += trFan(K, P, T, 62, 29, 6, 38, 150, 210, { side: "f", arcs: 1, alpha: 0.7 });
  }
  return svg;
}
