// The Battlefield view of Troop Leading Procedures: a rifle platoon preparing for an attack, drawn with
// the terrain kit (../../kit/terrain.mjs). The same state S as the machine drives it:
//   S.sand    hours the leader keeps, eased (a float);  S.split the target (an integer, for the outcome)
//   S.clock   notional hours since the mission was received (0 to total + after)
// World frame: the platoon's assembly area is at the left (x about -90), the line of departure is the
// chalk line at x = -10 and the objective, a rise with three two-man positions, is at x about 92.
// The leader's terrain model is the chalk rectangle at the top left. fieldStatic() builds the ground
// (build only); fieldPose() places every soldier and fire stream; fieldMarks() the fire lane.
// build.mjs inlines this file after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { MODEL, bounds, outcome, assaultAt, FALL_F, fallenF, fallenE } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trWall, trHouse, trFan, trChalk, trHole, trObjective, trSquad, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -300, y: -250, w: 600, d: 450 },
  HOME: [[-76, -27], [-76, 1], [-76, 29]],      // each squad's lead man at the assembly area
  LDX: -32,                                      // the line of departure
  END_Y: [-23, -1, 21],                           // each squad's line at the end of the assault
  END_X: 36,
  TM: [-64, -46],                                // the terrain model (chalk rectangle centre)
  PL0: [-64, -39],                               // the platoon leader at the model
  VANTAGE: [-6, -42],                            // the leader's reconnaissance point
  G7: [-58, -14],                                // where squad leaders gather for the order
  RISE: [64, -4],
  HOLES: [[57, -12], [61, -4], [57, 4]],
  DOWN_F: [[1, 6], [2, 3], [1, 2], [2, 7], [0, 7]],   // [squad, member] in the order men fall
  DOWN_E: [1, 4, 0, 3, 5, 2],
};
FG.TERRAIN = {
  rises: [
    { cx: FG.RISE[0], cy: FG.RISE[1], r: 26, steps: 3, h: 1.6, top: 0.5, seed: 5, wobble: 0.08 },
    { cx: -20, cy: -126, r: 30, steps: 3, h: 1.5, top: 0.45, seed: 11, wobble: 0.12 },
    { cx: 170, cy: 96, r: 26, steps: 2, h: 1.5, top: 0.5, seed: 17, wobble: 0.1 },
    { cx: -190, cy: -90, r: 26, steps: 3, h: 1.4, top: 0.45, seed: 23, wobble: 0.12 },
  ],
};

const FS_RAD = Math.PI / 180;
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const hash = (i, j) => { const v = Math.sin(i * 12.9898 + j * 78.233 + 4.1) * 43758.5453; return v - Math.floor(v); };
const tri = (x) => { const f = x - Math.floor(x); return f < 0.5 ? f * 2 : 2 - f * 2; };
const COL = trSquad("column", "wedge"), LIN = trSquad("line", "wedge");
const ROLES = LIN.map((m) => m.role);

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[-130, 60, 56, 3, 0.6], [150, -10, 50, 5, 0.7], [20, -180, 70, 7, 0.4], [-240, -20, 40, 9, 0.8]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[120, 70], [210, 78], [206, 128], [116, 120]], 9, "a"],
    [[[-216, 62], [-150, 70], [-146, 120], [-212, 112]], 8, "b"],
    [[[-60, 80], [10, 86], [14, 136], [-58, 130]], 7, "a"],
    [[[110, -230], [200, -226], [204, -190], [112, -192]], 8, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  // a farm track runs behind the assembly area and on east below the line of departure
  g(trRoad(K, P, [[-330, 58], [-200, 56], [-120, 52], [-40, 54], [60, 58], [200, 56], [330, 60]], 3.6));
  const keepOpen = (x, y) => (x > -110 && x < 112 && y > -58 && y < 46) || (x > -140 && x < -100 && y > -60 && y < 40);
  const woods = [
    [fdBlob(-135, -22, 20, 31, 0.1, 40, 1.3), 12, 21],
    [fdBlob(-40, -98, 60, 32, 0.12, 40, 0.5), 40, 22],
    [fdBlob(130, -86, 36, 33, 0.12, 40, 0.7), 20, 23],
    [fdBlob(-200, 30, 30, 34, 0.12, 40, 1), 14, 24],
    [fdBlob(150, 30, 20, 35, 0.12, 40, 1), 9, 25],
    [fdBlob(30, 120, 34, 36, 0.12, 40, 0.8), 16, 26],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => keepOpen(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[120, 70], [210, 78]], 51], [[[-216, 62], [-150, 70]], 52], [[[-60, 80], [10, 86]], 53], [[[-118, -52], [-96, -56]], 54]]) items.push(...trHedge(K, P, pts, { seed }));
  for (const pts of [[[14, 86], [14, 136]], [[116, 120], [206, 128]]]) items.push(...trWall(K, P, pts));
  items.push(trHouse(K, P, 170, 100, 10, 12, 8), trHouse(K, P, -184, 98, 80, 10, 7.5));
  g(trRelief(K, P, T));

  // control measures: the line of departure (a phase line), the terrain model, and the objective's flag
  const ld = trChalk(K, P, T, [[G.LDX, -50], [G.LDX, 38]], { h: 3.4 });
  const [tx, ty] = G.TM;
  const tm = trChalk(K, P, T, [[tx - 6, ty - 3], [tx + 6, ty - 3], [tx + 6, ty + 3], [tx - 6, ty + 3]], { closed: true, pegs: false });
  for (const m of [ld, tm]) { g(m.ground); items.push(...m.items); }
  items.push(trObjective(K, P, T, G.RISE[0] + 8, G.RISE[1] - 2, { h: 11, ang: 200 }));
  // the three two-man positions on the objective, facing the platoon
  for (const [x, y] of G.HOLES) items.push(...trHole(K, P, x, y, T.height(x, y), 180));
  return { ground: ground.join(""), items };
}

// ---- the squads ----
// Where squad j's lead man is, and how its formation is set, at a clock time before the line of departure.
function prep(j, c, h) {
  const G = FG, T = MODEL.total, home = G.HOME[j];
  const tp = c - h;
  const s = { x: home[0], y: home[1], w: 1, cluster: 1, pose: "kneel" };
  if (tp < 0) return s;
  if (tp < 2) return { ...s, cluster: 0.55 };                    // the squad leader briefs: a tight group
  if (tp < 4) return { ...s, pose: "stand" };                    // checks and inspections: standing in line
  if (tp < 7) {                                                  // rehearse: walk the lane out and back, twice
    const f = (((tp - 4) / 3) * 2) % 1;
    const out = f < 0.5 ? smooth01(0, 0.5, f) : 1 - smooth01(0.5, 1, f);
    return { ...s, x: home[0] + 34 * out, w: out > 0.9 ? 1 : out < 0.1 ? 1 : 0.35, pose: "stand" };
  }
  return s;
}
// squad j's state at clock c (before or after the line of departure)
function squadAt(j, c, h, r) {
  const G = FG, T = MODEL.total;
  if (c < T) return prep(j, c, h);
  const base = prep(j, T, h);
  const a = assaultAt(c);
  const lag = j === 2 ? 0.2 * (1 - r) : 0;
  const aj = Math.max(0, a - lag);
  const approach = smooth01(0, 0.35, aj), cross = smooth01(0.35, 1, aj);
  const x = approach < 1 ? lerp(base.x, G.LDX - 14, approach) : lerp(G.LDX - 14, G.END_X, cross);
  const drift = j === 1 ? -11 * (1 - r) * cross : 0;
  const yEnd = G.END_Y[j] + drift;
  const y = lerp(lerp(base.y, G.HOME[j][1], approach), yEnd, cross);
  const w = lerp(lerp(base.w, 0, smooth01(0, 0.2, aj)), 1, smooth01(0.55, 0.88, aj));
  return { x, y, w, cluster: 1, pose: a >= 0.93 ? "kneel" : "stand", aj };
}
function memberAt(j, m, c, h, r) {
  const G = FG;
  const sq = squadAt(j, c, h, r);
  const o = [lerp(COL[m].off[0], LIN[m].off[0], sq.w) * sq.cluster, lerp(COL[m].off[1], LIN[m].off[1], sq.w) * sq.cluster];
  const rag = 1 - r;
  const after = c >= MODEL.total;
  const jv = after ? rag * (hash(m, j) - 0.5) * 9 * smooth01(0.3, 0.9, sq.aj ?? 0) : 0;
  const ju = after ? -rag * hash(m + 9, j) * 7 * smooth01(0.3, 0.9, sq.aj ?? 0) : 0;
  const [x, y] = fdFrame(sq.x, sq.y, 0)(o[0] + ju, o[1] + jv);
  return { x, y, sq };
}

export function fieldPose(S, T, M = {}) {
  const G = FG, m = MODEL;
  const men = [];
  const add = (p) => { p.z = T.height(p.x, p.y); men.push(p); return p; };
  const h = S.sand ?? S.split, c = S.clock;
  const split = Math.round(S.split);
  const out = outcome(split);
  const r = out.rehearsed;
  const a = assaultAt(c);
  const nF = fallenF(out, a), nE = fallenE(out, a);
  const downF = new Set(G.DOWN_F.slice(0, nF).map(([j, k]) => `s${j}-${k}`));
  const dt = 0.05;
  const b = bounds(h);

  // --- squads ---
  for (let j = 0; j < 3; j++) {
    const sq = squadAt(j, c, h, r), sq0 = squadAt(j, c - dt, h, r);
    const moving = Math.hypot(sq.x - sq0.x, sq.y - sq0.y) > 0.012;
    const slW = c >= b[5] && c < b[6] ? (() => { const t = (c - b[5]) / (b[6] - b[5]); return smooth01(0, 0.3, t) * (1 - smooth01(0.75, 1, t)); })() : 0;
    for (let k = 0; k < 9; k++) {
      const id = `s${j}-${k}`;
      if (downF.has(id)) continue;
      const mm = memberAt(j, k, c, h, r);
      let x = mm.x, y = mm.y, pose = sq.pose, mv = moving;
      if (k === 4 && slW > 0.001) { x = lerp(x, G.G7[0] + 1, slW); y = lerp(y, G.G7[1] + (j - 1) * 3.4, slW); pose = "stand"; mv = slW > 0.001 && slW < 0.999; }
      const mm0 = memberAt(j, k, c - dt, h, r);
      const moved = Math.hypot(x - mm0.x, y - mm0.y) > 0.01 || mv;
      const walking = moved && pose === "stand";
      add({ id, side: "f", role: ROLES[k], pose: walking ? "stand" : pose, stride: walking ? strideAt(x * 1.1 + k * 1.3) : 0, face: 0, x, y });
    }
  }
  // fallen friendly men lie where they fell; a medic kneels by the first
  G.DOWN_F.slice(0, nF).forEach(([j, k], i) => {
    const ck = m.total + FALL_F(i) * m.after;
    const p = memberAt(j, k, ck, h, r);
    add({ id: `c-f${i}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 20 + 40 * ((i * 7) % 3), x: p.x, y: p.y });
    if (i === 0 && a > FALL_F(0) + 0.18) add({ id: "c-med", side: "f", role: "r", pose: "kneel", stride: 0, face: 90, x: p.x - 2.6, y: p.y + 2.2 });
  });

  // --- platoon leader, radio operator, platoon sergeant ---
  const plAt = (cc) => {
    const [px, py] = G.PL0, [vx, vy] = G.VANTAGE;
    if (cc < b[3]) return { x: px, y: py, still: "kneel" };
    if (cc < b[4]) {                                              // step 5: the leader's reconnaissance (abbreviated if the block is short)
      const t = (cc - b[3]) / (b[4] - b[3]);
      const q = 0.35 + 0.65 * Math.min(1, h / m.leaderNeed);
      const along = q * (smooth01(0, 0.45, t) - smooth01(0.6, 1, t));
      return { x: lerp(px, vx, along), y: lerp(py, vy, along), still: "stand" };
    }
    if (cc < b[5]) return { x: px, y: py, still: "kneel" };
    if (cc < b[6]) {                                              // step 7: to the gathering point for the order
      const t = (cc - b[5]) / (b[6] - b[5]);
      const w = smooth01(0, 0.3, t);
      return { x: lerp(px, G.G7[0] - 5, w), y: lerp(py, G.G7[1] - 1, w), still: "stand" };
    }
    if (cc < m.total) {                                           // step 8: walk the lines, check, backbrief
      const tp = cc - h;
      const w = smooth01(0, 0.3, tp);
      const wy = lerp(-26, 24, tri(tp / 2.6));
      return { x: lerp(G.G7[0] - 5, -52, w), y: lerp(G.G7[1] - 1, wy, w), still: "stand" };
    }
    const sq = squadAt(1, cc, h, r);
    const from = plAt0();
    const w = smooth01(0, 0.2, assaultAt(cc));
    return { x: lerp(from.x, sq.x - 15, w), y: lerp(from.y, G.END_Y[1] + 1, w), still: "stand" };
  };
  const plAt0 = () => { const tp = m.total - h; const w = smooth01(0, 0.3, tp); const wy = lerp(-26, 24, tri(tp / 2.6)); return { x: lerp(G.G7[0] - 5, -52, w), y: lerp(G.G7[1] - 1, wy, w) }; };
  const pl = plAt(c), pl0 = plAt(c - dt);
  const plMoving = Math.hypot(pl.x - pl0.x, pl.y - pl0.y) > 0.01;
  const plFace = plMoving ? Math.atan2(pl.y - pl0.y, pl.x - pl0.x) / FS_RAD : c < b[3] ? 270 : 0;
  add({ id: "pl", side: "f", lit: true, role: "pl", pose: plMoving ? "stand" : pl.still, stride: plMoving ? strideAt(c * 9) : 0, face: plFace, x: pl.x, y: pl.y });
  const rto = (cc) => { const p = plAt(cc); return { x: p.x - 3.2, y: p.y + 2.6 }; };
  const rt = rto(c), rt0 = rto(c - 0.2);
  const rMoving = Math.hypot(rt.x - rt0.x, rt.y - rt0.y) > 0.01;
  add({ id: "rto", side: "f", role: "rto", pose: rMoving ? "stand" : pl.still === "kneel" ? "kneel" : "stand", stride: rMoving ? strideAt(c * 9 + 3) : 0, face: plFace, x: rt.x, y: rt.y });
  // the platoon sergeant moves up to the ready position in step 4 ("initiate movement"), later follows squad 3
  {
    const t4 = smooth01(b[2], b[3], c);
    const psg = c < m.total ? { x: lerp(-58, -42, t4), y: lerp(8, 10, t4) } : (() => { const sq = squadAt(2, c, h, r); return { x: sq.x - 14, y: sq.y + 6 }; })();
    const mv = c >= m.total ? a > 0 && a < 0.95 : t4 > 0.001 && t4 < 0.999;
    add({ id: "psg", side: "f", role: "r", pose: "stand", stride: mv ? strideAt(c * 7) : 0, face: 0, x: psg.x, y: psg.y });
  }

  // --- the enemy: three two-man positions, men go down one at a time ---
  const downE = new Set(G.DOWN_E.slice(0, nE));
  for (let i = 0; i < m.enemy; i++) {
    const [hx, hy] = G.HOLES[i >> 1];
    const v = i % 2 ? 1.25 : -1.25;
    const x = hx, y = hy - v;
    if (downE.has(i)) add({ id: `e${i}`, side: "hc", role: "r", pose: "prone", stride: 0, face: 150 + ((i * 41) % 60), x: x + 1.4, y });
    else add({ id: `e${i}`, side: "h", role: i === 2 ? "tl" : "r", pose: "hole", stride: 0, face: 180, x, y });
  }

  // --- fire (after the line of departure) ---
  const byId = Object.fromEntries(men.map((p) => [p.id, p]));
  const aim = (p) => trAimPoint(p, p.x, p.y, p.z);
  const muzzle = (p) => trMuzzle(p, p.x, p.y, p.z);
  const streams = [];
  if (a > 0.05) {
    const enemies = men.filter((p) => p.side === "h").map(aim);
    const friends = men.filter((p) => p.side === "f" && /^s/.test(p.id)).map(aim);
    const fOn = smooth01(0.35, 0.5, a), eOn = smooth01(0.1, 0.25, a);
    for (let j = 0; j < 3; j++) for (const k of [0, 1, 3, 5, 6, 8]) {
      const p = byId[`s${j}-${k}`];
      if (p && enemies.length) streams.push({ id: p.id, side: "f", heavy: k === 1 || k === 6, from: muzzle(p), to: enemies, flight: 0.5, scatter: 2.4, period: k === 1 || k === 6 ? 1.9 : 2.7, burst: k === 1 || k === 6 ? 2 : 1, gap: 0.1, phase: (j * 9 + k) * 0.37, on: fOn * 0.8 });
    }
    men.filter((p) => p.side === "h").forEach((p, i) => {
      if (friends.length) streams.push({ id: p.id, side: "h", from: muzzle(p), to: friends, flight: 0.5, scatter: 5, period: 2.3 + (i % 3) * 0.3, burst: i === 2 ? 2 : 1, gap: 0.1, phase: i * 0.5, on: eOn * 0.55 * (1 - smooth01(0.8, 1, a) * 0.5), heavy: i === 2 });
    });
  }
  return { men, streams, a, c, nF, nE, out };
}

// Per-state ground marks: one fire lane from the platoon's line toward the objective once it fires.
export function fieldMarks(K, P, T, pose) {
  const on = pose.a > 0.4 ? Math.min(1, (pose.a - 0.4) / 0.2) : 0;
  return trFan(K, P, T, FG.END_X - 4, FG.END_Y[1] + 4, 8, 26, -26, 26, { side: "f", arcs: 1, alpha: 0.7 * on });
}
