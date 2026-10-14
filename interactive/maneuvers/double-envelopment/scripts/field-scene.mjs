// The Battlefield view of Double Envelopment, at platoon scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same model state S as the vise drives it:
//   S.beta  jaw opening; closure c = 1 - beta / MODEL.open moves the two enveloping squads round
//           both flanks (c = 0 at the line of departure, 1 turned in on the flanks and rear)
//   S.u     the ram's stand-off: 0 while the support-by-fire element fixes the enemy's front with
//           fire; as the pad lifts off (MODEL.withdraw) the fire lifts, and the element stays in place
//   S.s     the block's slide: 0 home; -MODEL.escape once an unheld enemy has slipped out the back.
//           Here that is the enemy platoon leaving its positions by a sunken lane out the back.
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every soldier and fire stream for a state (build and page); fieldMarks() draws the fire sectors.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdPolar, fdSweep, fdBlob, fdSpline, fdFrame } from "../../kit/field.mjs";
import { losses, holding } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trNest, trWire, trFan, trChalk, trObjective, trSquad, trMorph, trPlace, trRoute, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -240, y: -220, w: 500, d: 480 },
  RISE: { cx: 0, cy: 0, r: 48, steps: 6, h: 1.6, top: 0.54, seed: 5, wobble: 0.07, lean: [0.3, -0.25] },
  R_E: 18,                                   // enemy fighting positions: radius on the summit
  HOLES: [-140, -105, -70, -35, 35, 70, 105, 140, 180], // two-man holes round the summit (MG nest at 0)
  ROUTE_R: 88,        // the near squad's track radius round its flank
  ROUTE_FAR: 74,      // the far squad's (kept in from the card's top edge)
  START_B: 30,        // bearing of the line of departure on each side
  END_B: 128,         // bearing where each squad turns in
  TURN: [0.74, 0.97], // closure over which the squads turn in and close
  CLOSE_R: 47,        // radius they close to (outside the wire)
  SBF_X: 106,         // support-by-fire line (kneeling riflemen) x
  WALL_X: 102.4,      // the stone wall in front of it
  LANE: [[-30, 0], [-50, -2], [-68, -3], [-80, -3]], // the sunken lane out the back of the rise
  RALLY: [-84, -3],  // where the enemy gathers after slipping out
  // casualties (counts from model.mjs losses()): which enveloping soldiers go down, in order, and the
  // collection point behind the SBF where they lie with a medic; which enemy go down, front and
  // flank holes first, lying where they fought
  DOWN_F: ["a1-3", "a2-6", "a1-7", "a2-2", "a1-5", "a2-8"],
  DOWN_H: ["e-7", "e-9", "e-4", "e-11", "e-3", "e-13", "e-15"],
  CCP: [[106, 50], [111, 53], [116, 50], [121, 53], [109, 58], [114, 61]],
  MEDIC: [103, 55],
};
FG.TERRAIN = {
  rises: [
    FG.RISE,
    { cx: 120, cy: 4, r: 28, steps: 2, h: 1.1, top: 0.6, seed: 21, wobble: 0.1, squash: 1.3 },
    { cx: -128, cy: 128, r: 36, steps: 4, h: 1.6, top: 0.4, seed: 31, wobble: 0.12 },
    { cx: 40, cy: -150, r: 24, steps: 2, h: 2, top: 0.5, seed: 41, wobble: 0.12 },
    { cx: -178, cy: -96, r: 30, steps: 4, h: 1.5, top: 0.45, seed: 47, wobble: 0.1 },
  ],
};

const FS_RAD = Math.PI / 180;
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const routeR = (n) => (n > 0 ? FG.ROUTE_R : FG.ROUTE_FAR);

// The enemy's escape progress chases its target (0 home, 1 out) at a running pace, so the page
// shows men filing out rather than jumping when the model's block slides.
export function fieldEscape(e, want, dt, rate = 0.14) {
  if (e === undefined) return want;
  const d = want - e;
  return e + Math.sign(d) * Math.min(Math.abs(d), rate * dt);
}

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadows and fields, away from the action
  for (const [cx, cy, r, seed, sq] of [[-60, 160, 46, 3, 0.6], [190, -70, 40, 5, 0.8], [-150, -10, 34, 7, 0.6], [60, 170, 40, 9, 0.5]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[176, 96], [232, 108], [226, 168], [168, 150]], 9, "a"],
    [[[178, 160], [224, 176], [214, 226], [164, 206]], 7, "b"],
    [[[150, -60], [206, -50], [204, -100], [150, -108]], 8, "b"],
    [[[-150, 66], [-84, 74], [-92, 118], [-160, 104]], 7, "a"],
    [[[-220, 20], [-160, 26], [-156, 64], [-216, 60]], 8, "b"],
    [[[-30, 180], [40, 186], [32, 230], [-40, 226]], 9, "b"],
    [[[-50, -176], [10, -180], [12, -214], [-48, -214]], 9, "b"],
    [[[80, -184], [130, -180], [128, -212], [76, -214]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // the stream behind the rise, the farm road on the right, and the two woodland tracks
  g(trStream(K, P, [[-280, -128], [-180, -140], [-90, -146], [0, -134], [80, -124], [150, -128], [220, -150], [300, -170]], 3.2, 5));
  g(trRoad(K, P, [[300, 250], [214, 190], [166, 118], [150, 60], [146, -10], [148, -80], [151, -122], [160, -200], [170, -280]], 3.2));
  for (const n of [1, -1]) {
    const pts = [];
    for (let a = 14; a <= G.END_B + 18; a += 8) pts.push(fdPolar(0, 0, routeR(n) + 3 * Math.sin(a * 0.09), n * a));
    g(trRoad(K, P, [[146, n * 22], ...pts], 2.1, { ruts: false }));
  }
  // the sunken lane out the back of the rise, running on west to the edge of the map
  g(trRoad(K, P, [...G.LANE, [-110, -4], [-150, -6], [-200, -14], [-300, -24]], 2.4, { ruts: false }));

  // woods round both flanks, with a corridor along each track; copses toward the edges
  const ringOf = (n, b0, b1, r0, r1, wob) => {
    const ctrl = [];
    for (let a = b0; a <= b1; a += 8) ctrl.push(fdPolar(0, 0, r1 + wob * Math.sin(a * 0.11), n * a));
    for (let a = b1; a >= b0; a -= 8) ctrl.push(fdPolar(0, 0, r0 + 3 * Math.sin(a * 0.2), n * a));
    return fdSpline(ctrl, 3, true);
  };
  const nearWood = ringOf(1, 34, 158, 60, 126, 8);
  const farWood = ringOf(-1, 50, 156, 56, 110, 6);
  const corridor = (x, y) => {
    const r = Math.hypot(x, y), b = Math.abs(Math.atan2(y, x) / FS_RAD), R = routeR(y);
    if (Math.abs(r - R) < 15) return true;                          // the tracks
    if (b > G.END_B - 14 && r < R + 14) return true;                // where the squads turn in
    return false;
  };
  const nearLane = (x, y) => Math.abs(y) < 16 && x < -20;
  const woods = [
    [nearWood, 140, 21, corridor, [2.6, 4.2], [7, 11.5]],
    [farWood, 70, 28, corridor, [2.6, 4], [7, 11]],
    [fdBlob(-150, 30, 20, 32, 0.12, 40, 0.8), 12, 22],
    [fdBlob(196, -10, 22, 33, 0.14, 40, 0.9), 11, 23],
    [fdBlob(-196, 150, 30, 34, 0.12, 40, 1), 14, 24],
    [fdBlob(96, 214, 26, 35, 0.12, 40, 0.8), 10, 25],
    [fdBlob(-120, -186, 30, 36, 0.12, 40, 0.8), 14, 26],
    [fdBlob(-130, -46, 16, 37, 0.12, 40, 0.8), 7, 27],
  ];
  for (const [ring, n, seed, avoid, r, h] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: r || [2.8, 4.4], h: h || [8, 12.5], avoid: (x, y) => (avoid ? avoid(x, y) : false) || nearLane(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    // the near wood's outer edge keeps smaller trees so the track stays in view
    if (ring === nearWood) for (const t of trees) if (Math.hypot(t.x, t.y) > G.ROUTE_R) { t.r *= 0.82; t.h *= 0.72; }
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // hedgerows along the fields, stone walls round the farmyard and in front of the SBF line
  for (const [pts, seed] of [
    [[[168, 150], [176, 96], [232, 108]], 51], [[[-84, 74], [-150, 66], [-160, 104]], 52], [[[150, -60], [206, -50]], 53],
    [[[-216, 60], [-156, 64]], 54], [[[-30, 180], [40, 186]], 55],
  ]) items.push(...trHedge(K, P, pts, { seed }));
  for (const pts of [[[G.WALL_X, -36], [G.WALL_X, -13]], [[G.WALL_X, -5], [G.WALL_X, 5]], [[G.WALL_X, 13], [G.WALL_X, 36]], [[160, 28], [160, 84], [196, 84]], [[196, 28], [160, 28]]]) items.push(...trWall(K, P, pts));
  items.push(trHouse(K, P, 178, 66, 90, 13, 8.5), trHouse(K, P, 186, 40, 0, 15, 9, 4.8, 8.6), trHouse(K, P, -186, 40, 20, 10, 7.5));

  // the relief, drawn over the flat cover
  g(trRelief(K, P, T));

  // the enemy position: two-man holes all round the summit, the MG nest on the front, wire in front
  for (const b of G.HOLES) {
    const [x, y] = fdPolar(0, 0, G.R_E, b);
    items.push(...trHole(K, P, x, y, T.height(x, y), b));
  }
  { const [x, y] = fdPolar(0, 0, G.R_E, 0); items.push(...trNest(K, P, x, y, T.height(x, y), 0)); }
  const wire = fdSweep(-62, 52, 9).map((a) => fdPolar(0, 0, 35 + 1.5 * Math.cos(a * FS_RAD * 3), a));
  items.push(...trWire(K, P, T, wire));

  // control measures: the support-by-fire position and the objective flag
  const sbf = trChalk(K, P, T, [[G.WALL_X + 2.4, -40], [124, -40], [124, 40], [G.WALL_X + 2.4, 40]], { closed: true });
  g(sbf.ground); items.push(...sbf.items);
  items.push(trObjective(K, P, T, -3, -3, { h: 12, ang: 210 }));

  return { ground: ground.join(""), items };
}

// Where every soldier stands and who fires at whom, for a model state. M carries what the page
// measures between frames: vc, the closure speed per second, and esc, the enemy's escape progress
// eased toward S.s / MODEL.escape at a running pace (fieldEscape). Defaults serve the build's frame.
export function fieldPose(S, MODEL, T, M = { vc: 0 }) {
  const G = FG;
  const men = [];
  const add = (m) => { m.z = T.height(m.x, m.y); men.push(m); };
  const c = clamp01(1 - S.beta / MODEL.open);
  const hold = smooth01(MODEL.withdraw * 0.8, MODEL.withdraw * 0.1, S.u); // 1 while the SBF fixes with fire
  const out = 0;                                      // the SBF stays in position when its fire lifts
  const esc = M.esc ?? clamp01(-S.s / MODEL.escape);  // 0 dug in, 1 gathered at the rally point

  // --- enemy: a platoon (-) in two-man holes round the summit, an MG team in the nest, the platoon
  // leader in the middle. Unheld, as the squads close, they leave by the lane out the back, rear holes first. ---
  const homes = [];
  for (const b of G.HOLES) for (const dv of [1.1, -1.1]) homes.push({ b, dv, role: homes.length % 4 === 1 ? "ar" : homes.length % 4 === 0 ? "tl" : "r" });
  homes.push({ b: 0, dv: 1.1, role: "mg" }, { b: 0, dv: -1.1, role: "r" }, { b: 180, dv: 0, r: 4, role: "pl", kneel: true });
  const order = homes.map((h, i) => i).sort((i, j) => Math.abs(Math.abs(homes[j].b) - 180) - Math.abs(Math.abs(homes[i].b) - 180) || i - j);
  const rank = new Map(order.map((i, n) => [i, n]));
  homes.forEach((h, i) => {
    const [hx, hy] = h.r !== undefined ? fdPolar(0, 0, h.r, h.b) : fdFrame(...fdPolar(0, 0, G.R_E, h.b), h.b)(0, h.dv);
    const n = rank.get(i), N = homes.length;
    const p = clamp01(esc * 2.4 - 1.4 * (n / (N - 1)));
    const id = h.b === 0 && h.role !== "pl" ? (h.role === "mg" ? "e-mg" : "e-ag") : `e-${i}`;
    if (p <= 0) { add({ id, side: "h", role: h.role, pose: h.kneel ? "kneel" : "hole", face: h.kneel ? 0 : h.b, stride: 0, x: hx, y: hy, b: h.b, home: true }); return; }
    const spot = [G.RALLY[0] - 4 * Math.floor(n / 6) - (n % 2) * 2, G.RALLY[1] + ((n % 6) - 2.5) * 3.4];
    const route = trRoute([[hx, hy], [G.LANE[0][0] + 6, (n % 3 - 1) * 2.4], ...G.LANE.slice(1), spot], 0);
    const w = route.at(p * route.length);
    const there = p >= 1;
    add({ id, side: "h", role: h.role, pose: there ? "kneel" : "stand", face: there ? 0 : w.face, stride: there ? 0 : strideAt(p * route.length + n), x: w.x, y: w.y, b: h.b, home: false });
  });

  // --- support by fire: a rifle squad kneeling behind the wall, an MG team prone in its centre gap;
  // released, they cease fire and hold their positions ---
  const sbfRoles = ["tl", "ar", "gr", "r", "tl", "ar", "gr", "r"];
  const sbf = (m, pose) => add({ side: "f", face: 180, ...m, pose, stride: 0 });
  [-31, -26, -21, -16, 16, 21, 26, 31].forEach((y, i) => sbf({ id: `s-${i}`, role: sbfRoles[i], x: G.SBF_X + out, y }, "kneel"));
  sbf({ id: "s-mg", role: "mg", x: G.SBF_X + 2 + out, y: -1.5 }, "prone");
  sbf({ id: "s-ag", role: "r", x: G.SBF_X + 2.6 + out, y: 2 }, "prone");
  sbf({ id: "s-sl", role: "sl", x: G.SBF_X + 8 + out, y: -4 }, "kneel");

  // --- the two enveloping squads (squad column, fire teams in wedges) round both flanks; at the end
  // they turn in and close in squad line. The near squad, with the platoon leader and RTO, is lit. ---
  const tr = clamp01(c / G.TURN[0]);
  const a = smooth01(G.TURN[0], G.TURN[1], c);
  const moving = Math.abs(M.vc) > 0.02;
  const inHoles = men.filter((m) => m.side === "h" && m.home).length;
  const underFire = (1 - hold) * (inHoles > 6 ? 1 : 0);
  const col = trSquad("column", "wedge"), line = trSquad("line", "line");
  const squads = [];
  for (const n of [1, -1]) {
    const R = routeR(n);
    const bear = n * (G.START_B + (G.END_B - G.START_B) * tr + 6 * a);
    const rad = R + (G.CLOSE_R - R) * a;
    const [x, y] = fdPolar(0, 0, rad, bear);
    const face = bear + n * (90 + 90 * a);
    const dist = tr * (G.END_B - G.START_B) * FS_RAD * R + a * (R - G.CLOSE_R);
    const st = moving ? strideAt(dist + (n > 0 ? 0 : 3)) : 0;
    const pose = !moving && underFire > 0.5 && a < 0.5 ? "kneel" : "stand";
    const lit = n > 0;
    squads.push({ n, bear });
    trPlace(trMorph(col, line, a), { x, y, face }).forEach((m, i) => add({ id: `a${n > 0 ? 1 : 2}-${i}`, side: "f", lit, role: m.role, sq: n, pose, stride: st, face, x: m.x, y: m.y }));
    if (lit) {
      const F = fdFrame(...fdPolar(0, 0, rad + 12 * (1 - a) + 14 * a, bear - 9 * (1 - a)), face);
      add({ id: "a-pl", side: "f", lit, role: "pl", pose, stride: st, face, x: F(0, 0)[0], y: F(0, 0)[1] });
      add({ id: "a-rto", side: "f", lit, role: "rto", pose, stride: st, face, x: F(-2.6, -2.2)[0], y: F(-2.6, -2.2)[1] });
    }
  }

  // --- casualties (notional; the model's counts): greyed and still. The enveloping squads' men down are
  // carried back to the collection point behind the SBF, where a medic kneels; the enemy's lie by their holes ---
  const LS = losses(S, holding(S.fixed, S.u, S.s), MODEL);
  const downF = new Set(G.DOWN_F.slice(0, LS.blue)), downH = G.DOWN_H.slice(0, LS.red);
  for (let i = men.length - 1; i >= 0; i--) if (downF.has(men[i].id) || downH.includes(men[i].id)) men.splice(i, 1);
  G.CCP.slice(0, LS.blue).forEach(([x, y], k) => add({ id: `c-f${k}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 75 + 25 * ((k * 7) % 3 - 1), x, y }));
  add({ id: "c-med", side: "f", role: "r", pose: "kneel", stride: 0, face: 10, x: G.MEDIC[0], y: G.MEDIC[1] });
  downH.forEach((id, k) => {
    const h = homes[Number(id.slice(2))];
    const [x, y] = fdFrame(...fdPolar(0, 0, G.R_E - 4, h.b), h.b)(0, h.dv * 1.6);
    add({ id: `c-h${k}`, side: "hc", role: "r", pose: "prone", stride: 0, face: h.b + 150 + 25 * k, x, y });
  });

  // --- fire ---
  const byId = Object.fromEntries(men.map((m) => [m.id, m]));
  const aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z);
  const bearingOf = (m) => Math.atan2(m.y, m.x) / FS_RAD;
  const within = (b0, b1, half) => Math.abs((((b1 - b0) % 360) + 540) % 360 - 180) < half;
  const friends = men.filter((m) => m.side === "f" && m.id !== "c-med");
  const dug = men.filter((m) => m.side === "h" && m.home && m.pose === "hole");
  const streams = [];
  // enemy: the MG and one man per hole fire at friendly troops inside their sector; the SBF's fire
  // on the front cuts their rate (suppression), most on the front positions
  const targetsFor = (b, half) => friends.filter((m) => within(b, bearingOf(m), half)).map(aim);
  const mg = byId["e-mg"];
  if (mg.home) streams.push({ id: "e-mg", side: "h", heavy: true, from: muzzle(mg), to: targetsFor(0, 34), period: 2.3, burst: 3, gap: 0.1, flight: 0.42, phase: 0.3, on: 0.95 - 0.5 * hold, scatter: 3 });
  G.HOLES.forEach((b, i) => {
    const m = byId[`e-${i * 2}`];
    if (!m || !m.home) return;
    const supp = hold * (within(b, 0, 60) ? 1 : 0.4);
    streams.push({ id: `e-r${i}`, side: "h", from: muzzle(m), to: targetsFor(b, 44), period: 2.9 + (i % 4) * 0.37, burst: 1, gap: 0, flight: 0.4, phase: i * 0.71, on: 0.75 - 0.5 * supp, scatter: 3 });
  });
  // SBF: the MG and two riflemen on the enemy's front positions; as the squads close they keep their
  // fire on the front, away from them
  const half = a < 0.3 ? 62 : 38;
  const front = dug.filter((m) => within(0, m.b, half)).map(aim);
  streams.push({ id: "s-mg", side: "f", heavy: true, smoke: true, from: muzzle(byId["s-mg"]), to: front, period: 1.7, burst: 3, gap: 0.09, flight: 0.5, phase: 0.2, on: hold, scatter: 2.4 });
  for (const i of [1, 5]) streams.push({ id: `s-r${i}`, side: "f", from: muzzle(byId[`s-${i}`]), to: front, period: 2.6, burst: 1, gap: 0, flight: 0.5, phase: i * 0.4, on: hold * 0.8, scatter: 2.4 });
  // the enveloping squads: automatic riflemen and team leaders fire as they close, at occupied holes
  // facing them (an empty position draws no fire)
  for (const sq of squads) {
    const fire = smooth01(0.3, 0.7, a);
    if (fire < 0.05) continue;
    men.filter((x) => x.sq === sq.n && (x.role === "ar" || x.role === "tl")).forEach((m, i) => {
      const tgt = dug.filter((e) => within(sq.bear, e.b, 80)).map(aim);
      streams.push({ id: m.id, side: "f", heavy: m.role === "ar", from: muzzle(m), to: tgt, period: m.role === "ar" ? 1.9 : 2.7, burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.36, phase: (sq.n > 0 ? 0.9 : 1.8) + i * 0.53, on: fire, scatter: 2 });
    });
  }
  return { men, streams, hold, out, a, esc, mgHome: mg.home ? 1 : 0, LS };
}

// Per-state ground marks: the SBF's sector on the enemy front (blue, fading as the fire lifts) and
// the enemy MG's sector on its front (red, gone once the MG has left its nest).
export function fieldMarks(K, P, T, pose) {
  const G = FG;
  const sx = G.SBF_X + pose.out;
  const [mx, my] = fdPolar(0, 0, G.R_E, 0);
  return trFan(K, P, T, sx - 2, 0, sx - 44, sx - 10, 180 - 12, 180 + 12, { side: "f", arcs: 1, alpha: 0.55 * pose.hold }) +
    trFan(K, P, T, mx, my, 6, 62, -28, 28, { side: "h", arcs: 2, alpha: 0.8 * pose.mgHome });
}
