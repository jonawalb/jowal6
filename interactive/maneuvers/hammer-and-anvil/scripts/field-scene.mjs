// The Battlefield view of Hammer and Anvil: a company-team vignette drawn with the terrain kit
// (../../kit/terrain.mjs). The same model state S as the bench drives it:
//   S.anvil   the anvil's insertion (0..1): the blocking force (two rifle squads and a machine-gun
//             team) moves from cover behind the far bank into two-Soldier fighting positions behind
//             the river line; when its hold is spent (and nothing was caught) it pulls back to cover.
//   S.hold    the anvil's hold left: its fire thins as the hold runs down.
//   S.swing   the hammer's stroke: the lit mechanized platoon (four tracked vehicles) drives in from
//             the line of departure; once it reaches the enemy it drives it toward the river.
//   S.escape  an uncaught enemy's slide past the anvil: it funnels over the bridge and away.
//   S.down    the model's casualty counts (notional), shown as greyed figures and stopped vehicles.
// Positions come from the bench's own geometry (GEO): the enemy is where the bench's block is, the
// hammer is where the swing puts the head, mapped onto the ground along the road (u, rightward on the
// card; v across it, toward the viewer). fieldStatic() builds the ground and everything that never
// moves (build only); fieldPose() places every soldier, vehicle and fire stream for a state (build
// and page); fieldMarks() draws the anvil's machine-gun sector; fieldSmoke() adds dust and smoke.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { MODEL, LOSS, plan, anvilFree } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trNest, trFan, trChalk, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -320, y: -320, w: 640, d: 640 },
  O: [0, 0],
  ANG: 325,              // u (the enemy's way out, along the road) points right on the card
  VIEW: { u: -6, v: -2, zoom: 1.3 },
  RIVER: 43,             // the river's centreline (u); the bridge carries the road over it at v = 0
  U_HOLE: 57,            // the anvil's fighting positions, on the far bank
  HOLES: [-50, -38, -26, -14, 12, 24, 36, 48], // two-Soldier positions (v); squad 1 left of the road, squad 2 right
  NEST: -3,              // the anvil's machine-gun position (v), covering the bridge
  U_STAGE: 72,           // where the anvil waits in cover before it moves in (u); it spreads 18 wider in v
  U0: -30,               // the enemy's position in the pocket (centre, u)
  UA: 22,                // where a caught enemy is pinned, on the near bank (u)
  UEND: 122,             // where an escaping enemy runs to (off the card)
  UH0: -76,             // the hammer's line of departure (u)
  GAP: 28,               // the hammer's distance behind the enemy's centre once in contact (u)
  HAM: [[5, -10], [5, 10], [-3, -30], [-3, 30]], // the hammer's four vehicles (u, v offsets)
  SCREEN: [[-28, -60, 90], [-40, 58, 270]],       // the encircling force's two fire teams on the high ground (u, v, facing from u)
  CCP: [67, 9],          // the anvil's casualty collection point, behind the positions
  // who goes down first (casualty counts from model.mjs downAt)
  DOWN_A: ["a1-1", "a2-3", "a1-5", "a2-6", "a1-7", "a2-0"],
  DOWN_H: ["e-5", "e-13", "e-2", "e-9", "e-16", "e-7", "e-11", "e-0", "e-14", "e-4"],
  RUN: 70,               // an escaping enemy's top speed (units per model second)
  RATE: 0.6,             // the Battlefield view plays the run at this share of the bench's speed, so movement reads
};
FG.TERRAIN = {
  rises: [
    { cx: 0, cy: 0, r: 17, steps: 3, h: 1.2, top: 0.5, seed: 61, wobble: 0.12, squash: 0.8 },
    { cx: 0, cy: 0, r: 16, steps: 3, h: 1.2, top: 0.5, seed: 67, wobble: 0.12, squash: 0.8 },
    { cx: 0, cy: 0, r: 28, steps: 3, h: 1.5, top: 0.45, seed: 71, wobble: 0.1 },
  ],
};
{
  // two low rises under the encircling force's fire teams, one in the far corner past the river
  const F = fdFrame(FG.O[0], FG.O[1], FG.ANG);
  [[-28, -63], [-40, 61], [130, -86]].forEach(([u, v], i) => { const [x, y] = F(u, v); FG.TERRAIN.rises[i].cx = x; FG.TERRAIN.rises[i].cy = y; });
}

const FS_RAD = Math.PI / 180;
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const fsClamp = (x) => Math.min(1, Math.max(0, x));
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const jit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; };
const W = fdFrame(FG.O[0], FG.O[1], FG.ANG);      // (u, v) → world [x, y]
const FACE_F = FG.ANG, FACE_B = FG.ANG + 180;     // facing along the road: toward the river, and back
const riverU = (v) => FG.RIVER + 5 * Math.sin(v * 0.035) + 0.03 * v;

// The enemy: two rifle squads, the platoon leader and his radio operator in a hasty perimeter round
// two vehicles. Offsets (u, v) from the centre, facing outward.
const ENEMY = (() => {
  const out = [];
  const roles = ["tl", "ar", "gr", "r", "r", "sl", "tl", "ar", "gr"];
  for (let i = 0; i < 18; i++) {
    const pair = Math.floor(i / 2), a = (pair / 9) * 360 + 14 + 26 * jit(pair, 3) + (i % 2 ? 9 : -9), r = 1 + 0.32 * jit(pair, 4);
    out.push({ role: roles[i % 9], du: 13 * r * Math.cos(a * FS_RAD) + 1.4 * jit(i, 1), dv: 19 * r * Math.sin(a * FS_RAD) + 1.4 * jit(i, 2), out: a + 18 * jit(i, 5), low: jit(i, 6) > 0 });
  }
  out.push({ role: "pl", du: -2, dv: 3, out: 180 }, { role: "rto", du: -4.5, dv: 5, out: 180 });
  return out;
})();
const EVEH = [[7, -6], [-8, 7]];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const ring = (pts) => pts.map(([u, v]) => W(u, v));
  const avoidBase = (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  g(trGroundPlane(K, P, G.world));

  // meadows toward the edges
  for (const [u, v, r, seed, sq] of [[-150, -60, 44, 3, 0.6], [110, 60, 40, 5, 0.7], [-120, 110, 44, 7, 0.7], [170, -40, 40, 9, 0.7]]) g(trPatch(K, P, fdBlob(...W(u, v), r, seed, 0.15, 40, sq)));
  // the pocket: ploughed fields either side of the road, and a few beyond the river
  const fields = [
    [[[-82, -38], [-82, -8], [-14, -6], [-12, -36]], 8, "a"],
    [[[-82, 8], [-82, 38], [-16, 40], [-14, 10]], 8, "b"],
    [[[-6, -34], [-6, -8], [24, -6], [26, -32]], 5, "b"],
    [[[-6, 10], [-6, 36], [24, 38], [24, 12]], 5, "a"],
    [[[-160, 20], [-160, 66], [-110, 68], [-108, 22]], 6, "a"],
  ];
  for (const [r, n, tint] of fields) g(trField(K, P, ring(r), { furrows: n, tint }));
  // the river line (the obstacle), the road and the bridge
  const river = [];
  for (let v = -300; v <= 300; v += 30) river.push([riverU(v), v]);
  g(trStream(K, P, ring(river), 6.5, 5));
  g(trRoad(K, P, ring([[-320, 12], [-200, 8], [-110, 4], [-40, 1], [10, 0], [50, 0], [90, -2], [140, -10], [200, -26], [320, -46]]), 3.2));
  g(trRoad(K, P, ring([[-100, 4], [-108, 60], [-112, 130], [-116, 240]]), 2.2, { ruts: false }));

  // woods: behind the anvil on the far bank (its cover), along the far edge, copses toward the corners
  const corridor = (x, y) => {
    const near = (u, v, r) => { const [px, py] = W(u, v); return Math.hypot(x - px, y - py) < r; };
    for (const v of [...G.HOLES, G.NEST]) if (near(G.U_STAGE + 2, v + Math.sign(v || 1) * 16, 10) || near(G.U_HOLE, v, 9)) return true;
    for (let u = 50; u <= 240; u += 10) if (near(u, -2 - Math.max(0, u - 90) * 0.16, 17)) return true; // the road east
    return near(G.CCP[0], G.CCP[1], 10);
  };
  const woods = [
    [ring([[72, -100], [76, -70], [70, -36], [74, 30], [70, 70], [86, 100], [180, 100], [190, -104]]), 66, 21, corridor],
    [ring([[-190, -112], [-100, -100], [-60, -106], [-40, -130], [-190, -140]]), 22, 22],
    [fdBlob(...W(-140, 96), 20, 33, 0.14, 40, 0.9), 9, 23],
    [fdBlob(...W(18, 92), 16, 34, 0.12, 40, 1), 7, 24],
    [fdBlob(...W(-4, -96), 15, 35, 0.12, 40, 0.8), 6, 25],
  ];
  for (const [r, n, seed, avoid] of woods) {
    const trees = trScatter(r, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => (avoid ? avoid(x, y) : false) || avoidBase(x, y) });
    const w = trWood(K, P, T, r, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // hedges along the pocket's field edges, a farm by the side road, the bridge parapets
  items.push(...trHedge(K, P, ring([[-74, -42], [-60, -43], [-46, -42.5]]), { seed: 51 }));
  items.push(...trHedge(K, P, ring([[-10, -38], [10, -38.5], [26, -36]]), { seed: 53 }));
  items.push(...trHedge(K, P, ring([[-74, 42], [-66, 43], [-56, 42.5]]), { seed: 52 }));
  items.push(...trHedge(K, P, ring([[-14, 42], [6, 43], [24, 41]]), { seed: 54 }));
  { const [x, y] = W(-124, 32); items.push(trHouse(K, P, x, y, FG.ANG + 90, 12, 8)); }
  { const [x, y] = W(-136, 50); items.push(trHouse(K, P, x, y, FG.ANG, 9, 7)); }
  for (const dv of [-3.6, 3.6]) items.push(...trWall(K, P, ring([[riverU(0) - 10, dv], [riverU(0) + 10, dv]]), { h: 1.1 }));

  // the relief, drawn over the flat cover
  g(trRelief(K, P, T));

  // the anvil's prepared fighting positions behind the river, facing back across it, and its
  // machine-gun position covering the bridge
  for (const v of G.HOLES) { const [x, y] = W(G.U_HOLE, v); items.push(...trHole(K, P, x, y, T.height(x, y), FACE_B)); }
  { const [x, y] = W(G.U_HOLE - 1, G.NEST); items.push(...trNest(K, P, x, y, T.height(x, y), FACE_B)); }

  // control measures: the blocking position outlined in chalk, and the hammer's line of departure
  const bp = trChalk(K, P, T, ring([[51, -57], [68, -57], [69, 56], [51, 56]]), { closed: true });
  g(bp.ground); items.push(...bp.items);
  const ld = trChalk(K, P, T, ring([[G.UH0 - 9, -42], [G.UH0 - 9, 0], [G.UH0 - 9, 42]]));
  g(ld.ground); items.push(...ld.items);

  return { ground: ground.join(""), items };
}

// Where the state puts the enemy and the hammer along the road (u). The hammer's run is linear in
// time (the bench's swing is its square): it drives from the line of departure to the river bank,
// and the enemy, under its fire, falls back ahead of it, reaching the bank as the hammer lands (the
// bench's block reaches the anvil face at the same moment). An uncaught enemy then runs on over the
// bridge as the bench's block slides on, at no more than FG.RUN units per second.
export function fieldTargets(S) {
  const G = FG;
  const run = Math.sqrt(fsClamp(S.swing));
  const ue0 = G.U0 + (G.UA - G.U0) * smooth01(0.12, 1, run) ;
  const tau = S.escape > 0 ? -MODEL.slide * Math.log(Math.max(1e-6, 1 - S.escape)) : 0;
  const ue = ue0 + Math.min(G.RUN * tau, (G.UEND - G.UA) * S.escape);
  const uh = G.UH0 + (G.UA - G.GAP - G.UH0) * run;
  return { ue, uh };
}

// Every soldier, vehicle and fire stream for a state. S is the bench state plus S.t (run clock) and
// S.delta (the run's timing). M carries what the page measures between frames: the eased enemy and
// hammer positions (ue, uh), their speeds (ve, vh) and the anvil's direction of travel (va). Without
// M (the build's first frame) everything sits where the state puts it and nothing is moving.
export function fieldPose(S, GEO, T, M = {}) {
  const G = FG;
  const men = [];
  const add = (m) => { const [x, y] = W(m.u, m.v); m.x = x; m.y = y; m.z = T.height(x, y); men.push(m); return m; };
  const { ue, uh } = fieldTargets(S);
  const ve = M.ve || 0, vh = M.vh || 0;
  const down = S.down || { anvil: 0, hammer: 0, red: 0 };
  const p = plan(S.delta ?? 1);
  const caught = S.caught && S.landed;

  // --- the anvil: two rifle squads and a machine-gun team; in cover, moving in, in position, pulling back ---
  const a = S.anvil;
  const spent = !S.caught && S.hold <= 0.001 && a < 0.999;
  const back = spent || (M.va || 0) < -0.05;
  const aMoving = a > 0.015 && a < 0.985;
  const anvil = [];
  const slot = (id, role, v, du, dv, crew) => {
    const sv = v + Math.sign(v || 1) * 16 + dv * 1.6;
    const us = G.U_STAGE + 4 * jit(v, dv) + (crew ? 0 : 3);
    const u = us + (G.U_HOLE + du - us) * a, vv = sv + (v + dv - sv) * a;
    const pose = aMoving ? "stand" : a >= 0.985 ? (crew ? "hole" : "kneel") : "kneel";
    const face = aMoving ? (back ? FACE_F : FACE_B) : FACE_B;
    anvil.push(add({ id, side: "f", role, pose, face, stride: aMoving ? strideAt(a * 26 + du * 0.7 + v * 0.3) : 0, u: u + (aMoving ? 1.4 * jit(v, du) : 0), v: vv, home: [G.U_HOLE + du, v + dv] }));
  };
  const sqRoles = ["tl", "ar", "gr", "r", "tl", "ar", "gr", "r"];
  [[1, G.HOLES.slice(0, 4)], [2, G.HOLES.slice(4)]].forEach(([n, holes]) => {
    holes.forEach((v, h) => [0, 1].forEach((j) => slot(`a${n}-${h * 2 + j}`, sqRoles[h * 2 + j], v, 0, j ? 1.1 : -1.1, true)));
    slot(`a${n}-sl`, "sl", (holes[1] + holes[2]) / 2, 7, 0, false);
  });
  slot("am-g", "mg", G.NEST, -1, -1, true);
  slot("am-a", "ag", G.NEST, -1, 1.4, true);
  slot("a-pl", "pl", 6, 11, 0, false);
  slot("a-rto", "rto", 8, 13, 0, false);

  // --- the enemy: in its hasty perimeter, driven toward the river, pinned on the bank or escaping over the bridge ---
  const eMoving = Math.abs(ve) > 2;
  const driven = smooth01(G.U0 + 0.5, G.U0 + 8, ue);
  const file = caught ? 0 : smooth01(G.UA - 6, G.UA + 14, ue);
  const enemy = [];
  const members = [...ENEMY.map((m, i) => ({ ...m, id: `e-${i}`, kind: null })), ...EVEH.map(([du, dv], i) => ({ id: `ev-${i}`, kind: "v", role: "r", du, dv, out: 0 }))];
  const order = members.map((m, i) => i).sort((i, j) => members[j].du - members[i].du);
  const rank = new Map(order.map((i, r) => [members[i].id, r]));
  members.forEach((m, i) => {
    const r = rank.get(m.id);
    const du0 = m.du * (1 - 0.35 * driven), dv0 = m.dv * (1 - 0.15 * driven);
    const duF = (members.length / 2 - r) * 3.6;
    let u = ue + du0 + (duF - du0) * file;
    const funnel = fsClamp((Math.abs(u - riverU(0)) - 6) / 34);
    let v = dv0 * (1 + (Math.max(0.04, funnel) - 1) * file) + (file > 0.01 ? 1.2 * jit(i, 7) * funnel : 0);
    if (Math.abs(u - riverU(v)) < 9 && file > 0.01) v *= 0.15; // on the bridge
    let pose = "kneel", face = FACE_B + m.out, stride = 0;
    if (eMoving) { pose = "stand"; face = ve > 0 ? FACE_F : FACE_B; stride = strideAt(u + i * 1.7); }
    else if (caught) { pose = "prone"; face = m.du > 2 ? FACE_F : FACE_B; }
    else if (driven > 0.5 || m.low) pose = "prone";
    if (m.kind) { face = eMoving ? (ve > 0 ? FACE_F : FACE_B) : FACE_F + (i % 2 ? 20 : -15); pose = "veh"; }
    enemy.push(add({ id: m.id, kind: m.kind, side: "h", role: m.role, pose, face, stride, u, v, du: m.du, dv: m.dv }));
  });

  // --- the hammer: four tracked vehicles (lit), the main effort ---
  const hMoving = Math.abs(vh) > 2;
  const hammer = G.HAM.map(([du, dv], i) => add({ id: `hv-${i}`, kind: "v", side: "f", lit: true, pose: "veh", face: FACE_F + (hMoving ? 0 : 4 * jit(i, 4)), u: uh + du, v: dv, moving: hMoving }));

  // --- the encircling force: a fire team on each rise, watching the pocket ---
  const screens = [];
  G.SCREEN.forEach(([u0, v0, f], n) => ["tl", "ar", "gr", "r"].forEach((role, i) => {
    screens.push(add({ id: `s${n}-${i}`, side: "f", role, pose: "prone", face: FACE_F + f + 8 * jit(n, i), u: u0 + (i - 1.5) * 4.6, v: v0 + 1.2 * jit(i, n) }));
  }));

  // --- casualties (counts from model.mjs downAt, notional): greyed, still, prone ---
  const byId = new Map(men.map((m) => [m.id, m]));
  const place = (m, u, v) => { m.u = u; m.v = v; const [x, y] = W(u, v); m.x = x; m.y = y; m.z = T.height(x, y); };
  // the anvil's: where they fell (in position, or caught moving in), carried back if the anvil pulls back
  const aLand = anvilFree(p.land);
  G.DOWN_A.slice(0, down.anvil).forEach((id, k) => {
    const m = byId.get(id);
    if (!m) return;
    const overrun = p.why === "early" && k >= down.anvil - LOSS.overrun;
    const fell = overrun ? [G.U_STAGE + (m.home[0] - G.U_STAGE) * aLand, m.v] : k === 0 ? G.CCP : [m.home[0] + 3.5, m.home[1]];
    const carry = spent ? 1 - a : 0;
    const stage = [G.U_STAGE + 2, m.v];
    m.side = "fc"; m.pose = "prone"; m.stride = 0; m.face = FACE_B + 70 + 25 * jit(k, 5);
    place(m, fell[0] + (stage[0] - fell[0]) * carry, fell[1] + (stage[1] - fell[1]) * carry);
  });
  if (down.anvil > 0) add({ id: "a-med", side: "f", role: "r", pose: "kneel", face: FACE_B + 90, u: G.CCP[0] + 0.6, v: G.CCP[1] + 3.6 });
  // the hammer's: one vehicle stopped and smoking short of the others, a crewman down beside it
  const smoking = [];
  if (down.hammer > 0) {
    const v3 = hammer[3];
    v3.side = "fc"; v3.lit = false; v3.moving = false;
    place(v3, Math.min(v3.u, G.UA - G.GAP - 16 + G.HAM[3][0]), v3.v);
    add({ id: "h-crew", side: "fc", role: "r", pose: "prone", face: FACE_F - 100, u: v3.u - 2, v: v3.v - 5.5 });
    smoking.push(v3);
  }
  // the enemy's: two left where the hammer struck them, the rest (if caught) on the bank; one enemy vehicle burns
  const live = G.DOWN_H.map((id) => byId.get(id)).filter(Boolean);
  live.slice(0, down.red).forEach((m, k) => {
    m.side = "hc"; m.pose = "prone"; m.stride = 0; m.face = FACE_B + 40 * jit(k, 9);
    if (k < LOSS.contact) place(m, G.U0 + 4 + 9 * k, m.dv * 0.8);
    m.gone = true;
  });
  if (caught && down.red > 0) { const v = byId.get("ev-0"); v.side = "hc"; smoking.push(v); }

  // --- fire ---
  const mz = (m) => (m.kind ? (() => { const F = fdFrame(m.x, m.y, m.face); return [...F(4.2, 0), m.z + 3.15]; })() : trMuzzle(m, m.x, m.y, m.z));
  const aim = (m) => (m.kind ? [m.x, m.y, m.z + 1.8] : trAimPoint(m, m.x, m.y, m.z));
  const visible = (m) => m.u < 100;
  const enemyUp = enemy.filter((m) => m.side === "h" && visible(m));
  const eTargets = enemyUp.map(aim);
  const anvilIn = anvil.filter((m) => m.side === "f" && m.pose === "hole");
  const streams = [];
  const inPocket = ue < G.UA + 6;
  // the anvil fires on the enemy once it is in position; its fire thins as its hold runs down
  if (a >= 0.985 && eTargets.length) {
    anvilIn.filter((m) => m.role === "mg" || m.role === "ar" || m.role === "tl").forEach((m, i) => {
      streams.push({ id: m.id, side: "f", heavy: m.role !== "tl", smoke: m.role === "mg", from: mz(m), to: eTargets, period: m.role === "mg" ? 1.8 : 2.5, burst: m.role === "tl" ? 1 : 3, gap: 0.09, flight: 0.55, phase: i * 0.47, on: (caught ? 0.5 : 0.3) + 0.55 * S.hold, scatter: 3 });
    });
  }
  // the enemy fires back at the anvil while it holds the crossing, and at the hammer as it closes
  if (!eMoving && inPocket) {
    const aT = anvilIn.map(aim), hT = hammer.filter((v) => v.side === "f").map(aim);
    enemyUp.filter((m) => !m.kind && (m.role === "ar" || m.role === "tl")).forEach((m, i) => {
      const atHammer = m.du < 0 && hT.length && S.swing > 0;
      const to = atHammer ? hT : aT;
      if (!to.length) return;
      streams.push({ id: m.id, side: "h", heavy: m.role === "ar", from: mz(m), to, period: 2.6 + i * 0.21, burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.6, phase: i * 0.71, on: caught ? 0.2 : 0.5, scatter: 3 });
    });
  }
  // the hammer fires as it drives in, and on whatever is still in reach
  if (S.swing > 0 && eTargets.length && (S.landed || uh > G.UH0 + 4)) {
    hammer.filter((v) => v.side === "f").forEach((v, i) => {
      streams.push({ id: v.id, side: "f", heavy: true, smoke: true, from: mz(v), to: eTargets, period: 1.5, burst: 3, gap: 0.08, flight: 0.45, phase: i * 0.37, on: caught ? 0.45 : 0.9, scatter: 3.5 });
    });
  }
  // the encircling fire teams' automatic riflemen fire into the pocket while the enemy is in it
  if (inPocket && eTargets.length) screens.filter((m) => m.role === "ar").forEach((m, i) => {
    streams.push({ id: m.id, side: "f", heavy: true, from: mz(m), to: eTargets, period: 2.3, burst: 2, gap: 0.1, flight: 0.5, phase: 0.9 + i * 1.1, on: 0.35, scatter: 3 });
  });

  return { men, streams, smoking, a, hold: S.hold, ue, uh, nestIn: byId.get("am-g").pose === "hole" };
}

// The anvil's machine-gun sector across the bridge (blue), fading as its hold runs down; gone while
// the gun team is out of its position.
export function fieldMarks(K, P, T, pose) {
  if (!pose.nestIn) return "";
  const [x, y] = W(FG.U_HOLE - 1, FG.NEST);
  return trFan(K, P, T, x, y, 6, 46, FACE_B - 24, FACE_B + 24, { side: "f", arcs: 2, alpha: 0.4 + 0.5 * pose.hold });
}

// Dust behind moving vehicles and smoke rising from stopped ones, as extra smoke puffs for trFire
// (a pure function of time, like trShots).
export function fieldSmoke(pose, t) {
  const out = [];
  for (const m of pose.men) {
    if (m.kind !== "v" || !m.moving) continue;
    const F = fdFrame(m.x, m.y, m.face);
    for (let j = 0; j < 2; j++) {
      const age = (t * 1.3 + j * 0.5 + m.u * 0.01) % 1;
      out.push({ p: [...F(-5 - age * 7, (j ? 1.6 : -1.6)), m.z + 0.6 + age * 2], age });
    }
  }
  for (const m of pose.smoking) {
    for (let j = 0; j < 4; j++) {
      const age = (t * 0.32 + j * 0.25) % 1;
      out.push({ p: [m.x - 2.2 * age * 6, m.y - 3.4 * age * 6, m.z + 3 + age * 16], age });
    }
  }
  return out;
}
