// The Battlefield view of Raid: a platoon raid on an enemy mortar position, drawn with the terrain kit
// (../../kit/terrain.mjs). The same run state as the machine drives it (model.mjs stateAt): S.u the lead
// of the raiding force along its route, S.phase, S.downFT/S.downET when each man went down, S.gate and
// S.stalled for the response force at the withdrawal route. Everything is a pure function of S.
// World: x across, y toward the viewer. The raiding force starts at the release point in the left
// foreground, attacks by the near side to the objective on the rise (upper right), and withdraws by
// a different route to a crossroads (the withdrawal route's gate) and back to the release point.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdSpline } from "../../kit/field.mjs";
import { MODEL, stateAt, columnAt, clamp, ease } from "./model.mjs";
import { lerp } from "./scene.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHole, trNest, trHouse, trChalk, trObjective, trMuzzle, trAimPoint, trRoute } from "../../kit/terrain.mjs";

const NA = 11;     // the assault element drawn: platoon leader, RTO and a squad of nine
const RAD = Math.PI / 180;
const faceTo = (a, b) => ((Math.atan2(b[1] - a[1], b[0] - a[0]) / RAD) % 360 + 360) % 360;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];

export const FG = {
  world: { x: -260, y: -230, w: 520, d: 400 },
  ENEMY: [   // defenders: id, position, kind (m = mortar pit)
    { id: "e0", x: 58, y: -38, m: true }, { id: "e1", x: 70, y: -42, m: true }, { id: "e2", x: 80, y: -34, m: true },
    { id: "e3", x: 50, y: -27 }, { id: "e4", x: 64, y: -23 }, { id: "e5", x: 81, y: -21 },
  ],
  KILL_ORDER: ["e3", "e1", "e4", "e0", "e5", "e2"],
  HOUSE: [92, -55, 0, 15, 9],
  SBF: [[8, 8], [38, 8], [38, 34], [8, 34]],
  OBJ: [66, -40],
  ORP: [-84, 40],
  ASSEMBLY: [10, -124],   // offset from the road: the response force's assembly area
  DOWN_IDS: ["a6", "a4", "a9", "a3", "a8", "a10"],
};
FG.TERRAIN = {
  rises: [
    { cx: 66, cy: -40, r: 34, steps: 2, h: 1.3, top: 0.7, seed: 51, wobble: 0.08 },
    { cx: 23, cy: 21, r: 15, steps: 1, h: 1.0, top: 0.65, seed: 53, wobble: 0.1 },
  ],
};
export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---- routes, built once. The assault element goes out along the south side and comes back by a different way. ----
const STARTP = (i) => [-88 + (i % 4) * 6.4, 44 + Math.floor(i / 4) * 6.2];
const ENDP = (i) => [46 + (i % 6) * 6.5, -50 - Math.floor(i / 6) * 5 - (i % 2) * 2];
const HOME = (i) => [-84 + (i % 4) * 3.6, 36 + Math.floor(i / 4) * 4];
const OUT = Array.from({ length: NA }, (_, i) => trRoute([STARTP(i), [-70, 57], [-42, 66], [-8, 70], [20, 52], [32, 8], [40, -22], ENDP(i)], 4));
const BACK = Array.from({ length: NA }, (_, i) => trRoute([ENDP(i), [48, -30], [36, -8], [14, 2], [-14, 8], [-48, 22], HOME(i)], 4));
const DU = MODEL.uNose - MODEL.uTail;   // the column straddles the gate line for this much of the run
// the interval between men: the lead meets the gate line at uNose and the last man leaves it at uTail
export const STAG = (DU * BACK[0].length) / ((NA - 1) - DU * NA);
const LAG = NA * STAG;
// the gate line on the withdrawal route: where the lead man is when u = uNose
export const GATE = BACK[0].at((1 - MODEL.uNose) * (BACK[0].length + LAG));
const ROAD = [[GATE.x + 16, -165], [GATE.x + 10, -110], [GATE.x + 5, -60], [GATE.x, -15], [GATE.x, GATE.y], [GATE.x - 5, 50], [GATE.x - 10, 110], [GATE.x - 14, 165]];
// the response force's road: its assembly area is the first stretch (its lead starts COL0 along it)
const COL = trRoute([[GATE.x + 15, -146], [GATE.x + 11, -112], [GATE.x + 5, -60], [GATE.x, -15], [GATE.x, GATE.y - 14]], 4);
const COL0 = 34;
const BLOCK = COL.at(COL0 + (COL.length - COL0) * (MODEL.block / MODEL.R.off));

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[-60, 90, 80, 3, 0.55], [100, 80, 70, 4, 0.5], [0, -150, 90, 5, 0.5], [-200, -30, 40, 6, 0.8], [210, -30, 40, 9, 0.8]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.1, 40, sq)));
  const fields = [
    [[[-250, 70], [-170, 66], [-166, 130], [-246, 134]], 8, "a"],
    [[[170, 70], [248, 66], [250, 130], [172, 134]], 8, "b"],
    [[[-250, -150], [-190, -154], [-186, -214], [-248, -218]], 7, "b"],
    [[[190, -150], [248, -146], [250, -210], [192, -214]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  g(trRoad(K, P, ROAD, 3));
  g(trRoad(K, P, [[-300, 118], [-150, 112], [0, 118], [150, 112], [300, 116]], 3));
  g(trStream(K, P, [[-300, -190], [-180, -184], [-60, -192], [60, -184], [180, -192], [300, -186]], 3, 5));
  // woods: clear of the routes, the road and the positions
  const clear = (x, y) => {
    for (const r of [...OUT, ...BACK]) for (let s = 0; s <= r.length; s += 8) { const p = r.at(s); if (Math.hypot(p.x - x, p.y - y) < 12) return true; }
    for (let s = 0; s <= COL.length; s += 8) { const p = COL.at(s); if (Math.hypot(p.x - x, p.y - y) < 10) return true; }
    return Math.hypot(x - BLOCK.x + 16, y - BLOCK.y) < 14;
  };
  const woods = [
    [fdBlob(-118, 86, 20, 61, 0.14, 40, 0.8), 12, 62],
    [fdBlob(-70, -62, 30, 63, 0.14, 40, 0.8), 18, 64],
    [fdBlob(116, 22, 16, 65, 0.12, 40, 0.9), 8, 66],
    [fdBlob(112, -96, 22, 67, 0.12, 40, 0.8), 12, 68],
    [fdBlob(-40, 100, 14, 73, 0.12, 40, 0.9), 7, 74],
    [fdBlob(34, -92, 16, 75, 0.12, 40, 0.9), 8, 76],
    [fdSpline([[-260, -140], [-120, -148], [0, -150], [120, -148], [260, -140], [260, -166], [0, -170], [-260, -166]], 3, true), 26, 69],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0 || clear(x, y) });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-250, 70], [-170, 66]], 71], [[[170, 70], [248, 66]], 72]]) items.push(...trHedge(K, P, pts, { seed }));
  g(trRelief(K, P, T));

  // the enemy mortar position on the rise: three mortar pits, three guard positions and a command post
  for (const e of G.ENEMY) {
    const z = T.height(e.x, e.y);
    items.push(...(e.m ? trHole(K, P, e.x, e.y, z, 140, { heavy: true }) : trHole(K, P, e.x, e.y, z, 140)));
  }
  const [hx, hy, ha, hl, hw] = G.HOUSE;
  items.push(trHouse(K, P, hx, hy, ha, hl, hw));
  // the response force's assembly area, up the road: a house and two parked vehicles are drawn live by the pose
  items.push(trHouse(K, P, GATE.x + 34, -138, 80, 12, 8));
  // control measures, sparingly: the support position (closed chalk), the withdrawal route's gate line (open), the objective flag
  const sbf = trChalk(K, P, T, G.SBF, { closed: true, pegs: false });
  g(sbf.ground);
  const gl = trChalk(K, P, T, [[GATE.x - 26, GATE.y + 2], [GATE.x + 2, GATE.y + 2], [GATE.x + 30, GATE.y + 2]], { closed: false });
  g(gl.ground.replace("tr-chalk", "tr-chalk rd-line"));
  items.push(...gl.items);
  items.push(trObjective(K, P, T, G.OBJ[0] + 16, G.OBJ[1] - 16));
  return { ground: ground.join(""), items };
}

// Where every figure stands and who fires at whom for state S (stateAt) at its time S.t.
export function fieldPose(S, T) {
  const G = FG;
  const men = [];
  const add = (p) => { p.z = T.height(p.x, p.y); men.push(p); return p; };
  const cfg = S.cfg;
  const plan = S.plan;

  // ---- the assault element: platoon leader, RTO and nine, in a column; the model's u is its lead ----
  const AROLES = ["pl", "rto", "sl", "tl", "ar", "gr", "r", "tl", "ar", "gr", "r"];
  const apos = (i, s) => {
    if (s.phase === "in") {
      const R = OUT[i], d = clamp(s.u * (R.length + LAG) - i * STAG, 0, R.length), q = R.at(d);
      return { x: q.x, y: q.y, face: q.face, mv: d > 0.2 && d < R.length - 0.2 };
    }
    if (s.phase === "on") { const q = OUT[i].at(OUT[i].length); return { x: q.x, y: q.y, face: 40 + (i % 3) * 10, mv: false }; }
    const R = BACK[i], d = clamp((1 - s.u) * (R.length + LAG) - i * STAG, 0, R.length), q = R.at(d);
    const held = s.stalled && s.u <= (s.plan.uStall ?? -1) + 1e-6;
    return { x: q.x, y: q.y, face: held ? faceTo([q.x, q.y], [GATE.x, GATE.y - 40]) : q.face, mv: !held && d > 0.2 && d < R.length - 0.2 };
  };
  const downMap = new Map();
  S.downFT.forEach((tf, k) => downMap.set(G.DOWN_IDS[k % G.DOWN_IDS.length], tf));
  const alive = [];
  for (let i = 0; i < NA; i++) {
    const id = "a" + i;
    const tf = downMap.get(id);
    if (tf !== undefined) {
      const p = apos(i, stateAt(cfg, tf, true));
      add({ id, side: "fc", role: "r", pose: "prone", face: 200 + ((i * 13) % 5 - 2) * 12, stride: 0, x: p.x, y: p.y });
      continue;
    }
    const p = apos(i, S);
    const pose = p.mv ? "stand" : S.phase === "in" && S.t < 0.1 ? "stand" : "kneel";
    alive.push(add({ id, side: "f", lit: true, role: AROLES[i], pose, face: p.face, stride: p.mv ? strideAt(S.t * 14 + i * 3) : 0, x: p.x, y: p.y, group: "a", mv: p.mv }));
  }

  // ---- the support element: two machine guns with assistants and two riflemen, on the support position ----
  const sfFace = faceTo([23, 21], G.OBJ);
  const crossT = plan.crossT;
  const gone = (t0, dur) => (plan.caught ? 0 : clamp((S.t - t0) / dur));
  const SUP = [[16, 16, "mg", "prone"], [23, 14, "ag", "kneel"], [30, 18, "mg", "prone"], [36, 22, "ag", "kneel"], [14, 26, "r", "kneel"], [28, 30, "r", "kneel"]];
  const SUPR = SUP.map(([x, y]) => trRoute([[x, y], [-14, 40], [-52, 48], [HOME(0)[0] + 6, HOME(0)[1] + 8]], 4));
  SUP.forEach(([x, y, role, pose], i) => {
    const w = gone(crossT + 0.5 + i * 0.15, 4.2);
    const q = SUPR[i].at(w * SUPR[i].length);
    const mv = w > 0.01 && w < 0.99;
    alive.push(add({ id: "s" + i, side: "f", role, pose: mv ? "stand" : pose, face: mv ? q.face : sfFace, stride: mv ? strideAt(w * 60) : 0, x: q.x, y: q.y, group: "s" }));
  });
  // ---- the security element: one team holds the response force's road, the other watches the far side ----
  const SECA = [[0, 0, "tl"], [-3.5, 5, "ar"], [-3.5, -5, "gr"], [-7, 0, "r"]];
  const SECB = [[0, 0, "tl"], [-4, 4.5, "ar"], [-4, -4.5, "gr"], [-8, 0, "r"]];
  const aOrg = [BLOCK.x - 20, BLOCK.y + 4], bOrg = [98, -16];
  const aFace = faceTo(aOrg, [BLOCK.x, BLOCK.y]);
  SECA.forEach(([du, dv, role], i) => {
    const x = aOrg[0] + du * Math.cos(aFace * RAD) - dv * Math.sin(aFace * RAD), y = aOrg[1] + du * Math.sin(aFace * RAD) + dv * Math.cos(aFace * RAD);
    const R = trRoute([[x, y], [-54, 20], [HOME(0)[0] + 8, HOME(0)[1] - 6]], 4);
    const w = gone(crossT + 2.0 + i * 0.2, 4.4), q = R.at(w * R.length), mv = w > 0.01 && w < 0.99;
    alive.push(add({ id: "ta" + i, side: "f", role, pose: mv ? "stand" : "kneel", face: mv ? q.face : aFace, stride: mv ? strideAt(w * 60) : 0, x: q.x, y: q.y, group: "ta" }));
  });
  SECB.forEach(([du, dv, role], i) => {
    const x = bOrg[0] + du, y = bOrg[1] + dv;
    const R = trRoute([[x, y], [74, 28], [24, 60], [-36, 66], [HOME(0)[0] + 10, HOME(0)[1] + 10]], 4);
    const w = gone(crossT + 2.4 + i * 0.2, 5), q = R.at(w * R.length), mv = w > 0.01 && w < 0.99;
    alive.push(add({ id: "tb" + i, side: "f", role, pose: mv ? "stand" : "prone", face: mv ? q.face : 20, stride: mv ? strideAt(w * 60) : 0, x: q.x, y: q.y, group: "tb" }));
  });

  // ---- the defenders: six in pits and holes; the down ones lie still ----
  const eDown = new Set(G.KILL_ORDER.slice(0, S.downE));
  const eAlive = [];
  for (const e of G.ENEMY) {
    if (eDown.has(e.id)) { add({ id: e.id, side: "hc", role: "r", pose: "prone", face: 320 + ((e.x * 7) % 5) * 8, stride: 0, x: e.x + 3, y: e.y - 3 }); continue; }
    eAlive.push(add({ id: e.id, side: "h", role: e.m ? "mg" : "r", pose: "hole", face: 140, stride: 0, x: e.x, y: e.y, nest: false }));
  }

  // ---- the response force: two vehicles and four men coming down the road to the withdrawal route ----
  const col = columnAt(S);
  const sCol = COL0 + col.f * (COL.length - COL0);
  const CF = [[0, "v0", true], [11, "v1", true], [19, "c0", false], [23, "c1", false], [27, "c2", false], [31, "c3", false]];
  const colAlive = [];
  CF.forEach(([off, id, veh], i) => {
    const q = COL.at(clamp(sCol - off, 0, COL.length));
    const at0 = COL.at(COL0);
    const sideShift = veh ? 0 : (i % 2 ? 3 : -3);
    const mv = col.f > 0.001 && col.f < 0.999 && !col.halted;
    const p = { id, side: "h", kind: veh ? "veh" : undefined, role: "r", pose: mv ? "stand" : "kneel", face: sCol > 0.5 ? q.face : at0.face, stride: mv && !veh ? strideAt(sCol * 0.9 + i * 3) : 0, x: q.x + sideShift, y: q.y, group: "c" };
    colAlive.push(add(p));
  });

  // ---- fire ----
  const streams = [];
  const aim = (p) => trAimPoint(p, p.x, p.y, p.z);
  const mz = (p) => trMuzzle(p, p.x, p.y, p.z);
  const eT = eAlive.map(aim);
  const gunsOn = S.alert && S.t < plan.L + 0.5;
  // the support element opens the raid and shifts its fire forward of the assault as it crosses the objective
  if (gunsOn && eT.length) {
    const shifted = S.t >= MODEL.run - 0.2;
    const tg = shifted ? eT.map((t) => [t[0] + 14, t[1] - 14, t[2]]) : eT;
    alive.filter((p) => p.group === "s").forEach((p, i) => {
      streams.push({ id: p.id, side: "f", heavy: p.role === "mg", from: mz(p), to: tg, period: 1.5 + i * 0.2, burst: p.role === "mg" ? 3 : 1, gap: 0.1, flight: 0.8, phase: i * 0.37, on: 0.9, scatter: 2.4 });
    });
  }
  // the defenders fire at the assault as it comes in, less as they are suppressed
  if (S.alert && S.t < plan.L + 0.4 && eAlive.length) {
    const tg = alive.filter((p) => p.group === "a").map(aim);
    const seen = clamp((S.t - MODEL.fire) / 1.4);
    const sup = S.t < MODEL.run ? 0.45 : 0.3;
    eAlive.forEach((p, i) => {
      if (!tg.length) return;
      streams.push({ id: p.id, side: "h", heavy: p.role === "mg", from: mz(p), to: tg, period: 1.9 + i * 0.23, burst: p.role === "mg" ? 2 : 1, gap: 0.12, flight: 0.7, phase: 0.4 + i * 0.31, on: seen * sup, scatter: 4 });
    });
  }
  // the assault element fires on the objective
  if (S.phase !== "in" && S.t <= plan.L + 0.2 && eT.length) {
    alive.filter((p) => p.group === "a").forEach((p, i) => {
      streams.push({ id: p.id, side: "f", heavy: p.role === "ar", from: mz(p), to: eT, period: 1.8 + (i % 4) * 0.25, burst: 1, gap: 0.1, flight: 0.6, phase: 0.2 + i * 0.21, on: 0.8, scatter: 2.4 });
    });
  }
  // the security team on the road and the response force trade fire while the force is held at the block
  if (S.security && col.halted) {
    const cT = colAlive.filter((p) => p.kind === "veh").map(aim);
    alive.filter((p) => p.group === "ta").forEach((p, i) => {
      streams.push({ id: p.id, side: "f", heavy: p.role === "ar", from: mz(p), to: cT, period: 1.6 + i * 0.2, burst: 1, gap: 0.1, flight: 0.7, phase: i * 0.3, on: 0.85, scatter: 3 });
    });
    const sT = alive.filter((p) => p.group === "ta").map(aim);
    colAlive.forEach((p, i) => {
      streams.push({ id: p.id, side: "h", heavy: !!p.kind, from: mz(p), to: sT, period: 1.8 + i * 0.2, burst: 1, gap: 0.1, flight: 0.7, phase: 0.3 + i * 0.27, on: 0.6, scatter: 4 });
    });
  }
  // the response force reaches the route: it fires on the raiding force if it is still there, else into the empty ground
  if (col.f >= 0.999) {
    const tg = alive.filter((p) => p.group === "a" && p.y < 40).map(aim);
    const where = tg.length && plan.caught ? tg : [[GATE.x - 40, GATE.y + 14, 2], [GATE.x - 60, GATE.y + 22, 2]];
    colAlive.forEach((p, i) => {
      streams.push({ id: p.id, side: "h", heavy: !!p.kind, from: mz(p), to: where, period: 1.7 + i * 0.2, burst: 1, gap: 0.1, flight: 0.7, phase: 0.2 + i * 0.3, on: plan.caught ? 0.8 : 0.35, scatter: plan.caught ? 3 : 9 });
    });
    if (plan.caught) {
      alive.filter((p) => p.group === "a").slice(0, 7).forEach((p, i) => {
        streams.push({ id: p.id + "r", side: "f", heavy: p.role === "ar", from: mz(p), to: colAlive.map(aim), period: 1.8 + (i % 4) * 0.25, burst: 1, gap: 0.1, flight: 0.7, phase: 0.1 + i * 0.2, on: 0.7, scatter: 3 });
      });
    }
  }
  return { men, streams };
}
