// The Battlefield view of Main Effort and Economy of Force, at company scale with individual soldiers,
// drawn with the terrain kit (../../kit/terrain.mjs). The same model state S as the bench drives it:
//   S.stacks  discs on each gate = elements in each platoon sector (A to D, left to right). Each disc
//             is one element: a rifle squad, a machine-gun team or an attached tank (HOME in model.mjs).
//   S.carry   discs on the loader's hook = elements on the lateral road behind the line, moving with
//   S.lx      the loader's position along the beam.
//   S.drops   each gate's travel (eased): a breached gate's sector drives through the enemy line; an
//             exposed gate's sector is empty and the enemy there comes forward out of its positions.
//   S.main    the lit sector: the main effort.
// Everything is laid out in a frame on the ground: u forward (the direction of the attack, up the
// card), v across the front (to the right on the card). fieldStatic() builds the ground and
// everything that never moves (build only); fieldAssign() keeps track of which element is in which
// sector; fieldTargets() and fieldStep() move every element and enemy soldier at a walking pace
// (page); fieldPose() places every soldier, vehicle and fire stream (build and page); fieldMarks()
// draws the fire sectors. build.mjs inlines this file with `import` and `export` lines stripped,
// after model.mjs, field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { HOME, NAMES, stateOf, casualties } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trWall, trHouse, trHole, trFan, trChalk, trObjective, trSquad, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -340, y: -340, w: 680, d: 680 },
  O: [0, 0],            // centre of the enemy line (world)
  ANG: 235,             // direction of the attack (world degrees): straight up the card
  V: [-75, -25, 25, 75], // sector centres across the front (v), A to D, matching the bench's gates
  HW: 25,               // half the width of a platoon sector (v)
  HOLE_DV: 11,          // enemy fighting positions: two per sector, this far either side of its centre
  U_HOLD: -42,          // where a sector's elements hold and fire (u)
  U_LD: -66,            // line of departure (u)
  U_ROAD: -82,          // the lateral road behind the line: elements shifting between sectors use it
  U_TANK: 6,            // tanks stand this far ahead of the squads (u)
  U_BREACH: 26,         // where a breaching sector's tanks stop, past the enemy line (u)
  U_SQ_BREACH: 12,      // where its squads stop (u)
  U_RUN: 42,            // where the enemy's survivor runs to from a breached position (u)
  U_EXPOSE: -24,        // where the enemy comes forward to in an exposed sector (u)
  U_OBJ: 34,            // the objective flag (u, at v = 0)
  CCP: [-75, -14],      // casualty collection point beside the road (u, v)
  SPEED: 26,            // walking/driving pace of every element (units per second, notional)
  S: 3.4,               // interval between men in a squad (units)
  DOWN: [2, 7, 3, 8, 1, 6, 0, 5, 4], // which man of a squad goes down first (squad line order)
  VIEW: { u: [-104, 86], v: 98 }, // the ground the card frames (u range, v half-width)
};
FG.TERRAIN = {
  rises: [
    { cx: 0, cy: 0, r: 30, steps: 3, h: 1.4, top: 0.45, seed: 61, wobble: 0.12 },
    { cx: 0, cy: 0, r: 26, steps: 3, h: 1.5, top: 0.4, seed: 67, wobble: 0.1 },
    { cx: 0, cy: 0, r: 24, steps: 2, h: 1.4, top: 0.5, seed: 71, wobble: 0.12 },
  ],
};
{
  // the rises sit off to the corners, away from the action
  const F = fdFrame(FG.O[0], FG.O[1], FG.ANG);
  [[-124, -132], [72, 160], [96, -158]].forEach(([u, v], i) => { const [x, y] = F(u, v); FG.TERRAIN.rises[i].cx = x; FG.TERRAIN.rises[i].cy = y; });
}

const FS_RAD = Math.PI / 180;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const jit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; }; // uneven spacing
const W = fdFrame(FG.O[0], FG.O[1], FG.ANG);           // (u, v) → world [x, y]
const FACE_F = FG.ANG, FACE_H = FG.ANG + 180;
const KIND = Object.fromEntries(HOME.flatMap((list, i) => list.map((kind, k) => [NAMES[i] + k, kind])));
const homeOf = (id) => NAMES.indexOf(id[0]);
const LINE = trSquad("line", "line", FG.S), COLUMN = trSquad("column", "wedge", FG.S);

// World point → frame (u, v), for the page's click handler.
export function fieldFrameOf(x, y) {
  const c = Math.cos(FG.ANG * FS_RAD), s = Math.sin(FG.ANG * FS_RAD), dx = x - FG.O[0], dy = y - FG.O[1];
  return [dx * c + dy * s, -dx * s + dy * c];
}
// Sector i's progress toward breach (0..1) and toward exposure (0..1), from the eased gate travel.
const breachOf = (drop) => clamp01((drop - 2) / 13);
const exposeOf = (drop) => clamp01(-drop / 6);

// Which element is in which sector, and which are on the road (in transit with the loader). The
// bench takes discs off a gate first and puts them on another later, so a sector that loses discs
// sends elements to the road, and a sector that gains discs takes them from the road. A sector gives
// up its attached elements first (last in, first out), then its own in reverse order, so its rifle
// squad is the last to go; a sector takes back its own elements first, then rifle squads.
export function fieldAssign(stacks, prev) {
  const A = prev ? { sec: prev.sec.map((l) => [...l]), road: [...prev.road] } : { sec: HOME.map((h, i) => h.map((_, k) => NAMES[i] + k)), road: [] };
  A.sec.forEach((list, i) => {
    while (list.length > stacks[i]) {
      let at = -1;
      for (let j = list.length - 1; j >= 0 && at < 0; j--) if (homeOf(list[j]) !== i) at = j;
      if (at < 0) { let best = -1; list.forEach((id, j) => { if (best < 0 || Number(id[1]) > Number(list[best][1])) best = j; }); at = best; }
      A.road.push(list.splice(at, 1)[0]);
    }
  });
  A.sec.forEach((list, i) => {
    while (list.length < stacks[i] && A.road.length) {
      let at = A.road.findIndex((id) => homeOf(id) === i);
      if (at < 0) at = A.road.findIndex((id) => KIND[id] === "sq");
      if (at < 0) at = 0;
      list.push(A.road.splice(at, 1)[0]);
    }
  });
  return A;
}

// Where each element and each enemy soldier should be for a state: { id: { u, v, form } }, plus the
// facts fieldPose needs. form: "line" for a squad holding, "column" for one moving or breaching.
export function fieldTargets(S, assign) {
  const G = FG;
  const out = {};
  const info = {};
  assign.sec.forEach((list, i) => {
    const b = breachOf(S.drops[i]) > 0.5;
    const tanks = list.filter((id) => KIND[id] === "tk"), squads = list.filter((id) => KIND[id] === "sq"), mgs = list.filter((id) => KIND[id] === "mg");
    tanks.forEach((id, j) => { out[id] = { u: b ? G.U_BREACH - 5 * (j % 2) : G.U_HOLD + G.U_TANK, v: G.V[i] + (j - (tanks.length - 1) / 2) * (b ? 10.5 : 11), form: "veh" }; });
    squads.forEach((id, j) => {
      out[id] = b ? { u: G.U_SQ_BREACH - 7 * j, v: G.V[i] + (j - (squads.length - 1) / 2) * 10, form: "column" }
        : { u: G.U_HOLD - 3 - 10 * j, v: G.V[i] + (j % 2 ? 6 : -4) + (squads.length > 1 ? -3 : 0), form: "line" };
    });
    mgs.forEach((id, j) => { const side = j % 2 ? 1 : -1, row = Math.floor(j / 2); out[id] = { u: G.U_HOLD - 4 - 6 * row, v: G.V[i] + side * (17 + 4 * row), form: "mg" }; });
    list.forEach((id) => { info[id] = { sec: i }; });
  });
  const roadV = (S.lx ?? 0) * (G.V[3] / 84);
  assign.road.forEach((id, j) => {
    out[id] = { u: G.U_ROAD + (j % 2 ? 3 : -2), v: roadV + (j - (assign.road.length - 1) / 2) * 10, form: KIND[id] === "tk" ? "veh" : KIND[id] === "mg" ? "mg" : "column" };
    info[id] = { sec: -1 };
  });
  // the enemy: a rifle pair in each fighting position; forward when its sector is exposed, the
  // survivor of a breached position runs back
  const red = casualties(S.stacks).redBy;
  G.V.forEach((cv, i) => {
    const x = exposeOf(S.drops[i]) > 0.5, b = breachOf(S.drops[i]) > 0.5;
    [-1, 1].forEach((side, h) => [0, 1].forEach((j) => {
      const id = `e${i}${h}${j}`, v = cv + side * G.HOLE_DV + (j ? 1.1 : -1.1);
      const runner = b && h === 1 && j === 0 && red[i] < 4;
      out[id] = { u: runner ? G.U_RUN : x ? G.U_EXPOSE + 3 * j : 0, v: runner ? v + 6 : v, form: "man" };
    }));
  });
  return { out, info };
}

// The page's walking pace: every element and enemy soldier chases its target in straight lines at
// FG.SPEED, a squad's formation blends between line and column, and the distance walked sets each
// man's stride. M.pos: { id: { u, v, dist, du, dv, form } }.
export function fieldStep(M, T, dt, calm) {
  M.pos = M.pos || {};
  for (const [id, t] of Object.entries(T.out)) {
    let p = M.pos[id];
    if (!p || calm) { M.pos[id] = { u: t.u, v: t.v, dist: p ? p.dist : 0, du: 0, dv: 0, col: t.form === "column" ? 1 : 0 }; continue; }
    const du = t.u - p.u, dv = t.v - p.v, d = Math.hypot(du, dv), step = Math.min(d, FG.SPEED * dt);
    if (d > 1e-6) { p.u += (du / d) * step; p.v += (dv / d) * step; p.dist += step; p.du = du / d; p.dv = dv / d; }
    p.moving = d > 0.35;
    const want = p.moving || t.form === "column" ? 1 : 0;
    p.col += Math.sign(want - p.col) * Math.min(Math.abs(want - p.col), dt * 1.6);
  }
}

// Where every soldier and vehicle stands and who fires at whom, for a model state. M carries the
// assignment and the walked positions from the page; without it (the build's first frame) every
// element stands at its target.
export function fieldPose(S, T, M = {}) {
  const G = FG;
  const assign = M.assign || fieldAssign(S.stacks);
  const tg = fieldTargets(S, assign);
  const pos = (id) => (M.pos && M.pos[id]) || { ...tg.out[id], dist: 0, moving: false, col: tg.out[id].form === "column" ? 1 : 0 };
  const loss = casualties(S.stacks);
  const men = [];
  const place = (m, u, v) => { const [x, y] = W(u, v); m.u = u; m.v = v; m.x = x; m.y = y; m.z = T.height(x, y); men.push(m); return m; };
  const faceOf = (p) => (p.moving ? FG.ANG + Math.atan2(p.dv, p.du) / FS_RAD : null);
  const els = [];

  // --- blue elements ---
  for (const id of Object.keys(KIND)) {
    const p = pos(id), t = tg.out[id], sec = tg.info[id].sec;
    const lit = sec === S.main;
    const state = sec >= 0 ? stateOf(S.stacks[sec]) : "road";
    const breach = sec >= 0 && breachOf(S.drops[sec]) > 0.5;
    const face = faceOf(p) ?? FACE_F;
    const kind = KIND[id];
    const el = { id, kind, sec, lit, moving: !!p.moving, breach, men: [] };
    els.push(el);
    if (kind === "tk") {
      el.men.push(place({ id, side: "f", lit, veh: true, face, pose: "veh", role: "tk" }, p.u, p.v));
      continue;
    }
    const F = fdFrame(0, 0, face - FG.ANG);
    if (kind === "mg") {
      const pose = p.moving ? "stand" : "prone";
      [["mg", 0, 0], ["ag", -1.2, -2.4]].forEach(([role, du, dv], j) => {
        const [ou, ov] = F(du, dv * (t.v > G.V[sec < 0 ? 0 : sec] ? -1 : 1));
        el.men.push(place({ id: `${id}-${j}`, side: "f", lit, role, pose, face, stride: p.moving ? strideAt(p.dist + j * 1.7) : 0, el: id }, p.u + ou, p.v + ov));
      });
      continue;
    }
    // rifle squad: line while it holds, column while it moves or breaches
    const col = p.col ?? (t.form === "column" ? 1 : 0);
    const pinned = state === "held" && S.stacks[sec] <= 2;   // economy of force: down and firing
    const pose = p.moving ? "stand" : pinned ? "prone" : "kneel";
    LINE.forEach((m, k) => {
      const off0 = m.off, off1 = COLUMN[k].off;
      const ou0 = off0[0] + (off1[0] - off0[0]) * col, ov0 = off0[1] + (off1[1] - off0[1]) * col;
      const [ou, ov] = F(ou0, ov0);
      el.men.push(place({ id: `${id}-${k}`, side: "f", lit, role: m.role, pose, face, stride: p.moving ? strideAt(p.dist + k * 1.3) : 0, el: id, k },
        p.u + ou + 1.6 * jit(k, id.charCodeAt(0)), p.v + ov + 1.0 * jit(id.charCodeAt(0), k)));
    });
  }

  // --- enemy ---
  G.V.forEach((cv, i) => [0, 1].forEach((h) => [0, 1].forEach((j) => {
    const id = `e${i}${h}${j}`, p = pos(id);
    const roles = h ? ["tl", "gr"] : ["ar", "r"];
    const inHole = Math.abs(p.u) < 0.5 && !p.moving;
    const pose = p.moving ? "stand" : inHole ? "hole" : "prone";
    const face = p.moving ? (p.du > 0 ? FACE_F : FACE_H) : FACE_H;
    place({ id, side: "h", role: roles[j], pose, face, stride: p.moving ? strideAt(p.dist + j * 1.7) : 0, sec: i, runner: p.u > 20 }, p.u + (pose === "prone" ? 1.5 : 0), p.v);
  })));

  // --- casualties: the model's counts per sector, greyed and still; blue ones lie where their squad
  // was hit (never past the enemy line), the first at the collection point with a medic kneeling
  // beside him; red ones by their positions ---
  const byId = new Map(men.map((m) => [m.id, m]));
  let first = true;
  loss.blueBy.forEach((n, i) => {
    if (!n) return;
    const list = assign.sec[i];
    const squads = list.filter((id) => KIND[id] === "sq"), mgs = list.filter((id) => KIND[id] === "mg");
    const pool = [];
    for (let r = 0; r < G.DOWN.length; r++) for (const sq of squads) pool.push(`${sq}-${G.DOWN[r]}`);
    for (const mg of mgs) pool.push(`${mg}-1`, `${mg}-0`);
    pool.slice(0, n).forEach((mid, k) => {
      const m = byId.get(mid);
      if (!m) return;
      const t = tg.out[m.el];
      m.side = "fc"; m.lit = false; m.pose = "prone"; m.stride = 0; m.face = FACE_F + 25 * jit(k, i);
      let u, v;
      if (first) { [u, v] = G.CCP; m.face = FACE_F - 90; first = false; }
      else { u = Math.min(t.u + (m.u - pos(m.el).u), -9 - 5 * (k % 3)); v = m.v; }
      const [x, y] = W(u, v); m.u = u; m.v = v; m.x = x; m.y = y; m.z = T.height(x, y);
    });
  });
  if (loss.blue > 0) place({ id: "medic", side: "f", role: "r", pose: "kneel", face: FACE_F - 90, stride: 0 }, G.CCP[0] + 0.6, G.CCP[1] + 3.8);
  loss.redBy.forEach((n, i) => {
    ["e" + i + "00", "e" + i + "01", "e" + i + "11"].slice(0, n).forEach((id, k) => {
      const m = byId.get(id);
      m.side = "hc"; m.pose = "prone"; m.stride = 0; m.face = FACE_H + 30 - 20 * k;
      const [x, y] = W(3.5, m.v); m.u = 3.5; m.x = x; m.y = y; m.z = T.height(x, y);
    });
  });

  // --- fire ---
  const live = men.filter((m) => m.side === "f" || m.side === "h");
  const aim = (m) => (m.veh ? [m.x, m.y, m.z + 2] : trAimPoint(m, m.x, m.y, m.z));
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z);
  const enemyIn = (v0, r) => live.filter((m) => m.side === "h" && !m.runner && Math.abs(m.v - v0) < r);
  const streams = [];
  // enemy: the first live man of each position fires at the blue troops in front of it (or, come
  // forward into an empty sector, into the open flank beside it); weight in his sector suppresses him
  G.V.forEach((cv, i) => [0, 1].forEach((h) => {
    const m = live.find((x) => x.sec === i && x.id.startsWith(`e${i}${h}`) && x.side === "h" && !x.runner && x.pose !== "stand");
    if (!m) return;
    const forward = m.pose === "prone";
    const to = live.filter((x) => x.side === "f" && x.u < m.u - 6 && Math.abs(x.v - m.v) < (forward ? 64 : 36) && x.u > G.U_ROAD + 20).map(aim);
    streams.push({ id: m.id, side: "h", heavy: m.role === "ar", from: muzzle(m), to, period: 2.4 + i * 0.23 + h * 0.31, burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.42,
      phase: i * 0.61 + h * 1.3, on: Math.max(0.25, 0.85 - 0.08 * S.stacks[i]), scatter: 3 });
  }));
  // blue: tanks and machine-gun teams fire on the enemy in their sector while they stand still; a
  // squad's automatic riflemen and team leaders fire while it is down. With no enemy left in front
  // of them (after a breach), they stop firing and stay where they are.
  for (const el of els) {
    if (el.moving || el.sec < 0) continue;
    const tgt = enemyIn(G.V[el.sec], 32).map(aim);
    if (!tgt.length) continue;
    if (el.kind === "tk") {
      const m = el.men[0], F = fdFrame(m.x, m.y, m.face);
      streams.push({ id: el.id, side: "f", heavy: true, smoke: true, from: [...F(3.9, 0), m.z + 3.15], to: tgt, period: 3.3, burst: 1, gap: 0.1, flight: 0.3, phase: el.sec * 0.7 + Number(el.id[1]) * 1.1, on: 0.8, scatter: 2 });
    } else if (el.kind === "mg") {
      const m = el.men[0];
      if (m.side === "f") streams.push({ id: el.id, side: "f", heavy: true, from: muzzle(m), to: tgt, period: 1.8, burst: 3, gap: 0.09, flight: 0.5, phase: el.sec * 0.83 + Number(el.id[1]) * 0.4, on: 0.9, scatter: 2.4 });
    } else {
      el.men.filter((m) => m.side === "f" && (m.role === "ar" || m.role === "tl")).forEach((m, k) => streams.push({ id: m.id, side: "f", heavy: m.role === "ar", from: muzzle(m), to: tgt,
        period: m.role === "ar" ? 2.0 : 2.8, burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.4, phase: el.sec * 0.9 + k * 0.53, on: m.pose === "prone" ? 0.55 : 0.8, scatter: 2 }));
    }
  }
  return { men, streams, assign, loss, expose: S.drops.map(exposeOf) };
}

// Per-state ground marks: in an exposed sector, the enemy's fire sector over the empty ground
// (red), fading in as the enemy comes forward.
export function fieldMarks(K, P, T, pose) {
  return FG.V.map((cv, i) => {
    const a = pose.expose[i];
    if (a < 0.02) return "";
    const [x, y] = W(FG.U_EXPOSE * a + 2, cv);
    return trFan(K, P, T, x, y, 6, 30, FACE_H - 32, FACE_H + 32, { side: "h", arcs: 2, alpha: a * 0.85 });
  }).join("");
}

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const ring = (pts) => pts.map(([u, v]) => W(u, v));
  const avoidBase = (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  g(trGroundPlane(K, P, G.world));

  // meadows: behind the enemy line and toward the edges
  for (const [u, v, r, seed, sq] of [[24, -50, 30, 3, 0.5], [26, 58, 32, 5, 0.5], [-120, 40, 40, 7, 0.6], [-30, -150, 30, 9, 0.7], [-20, 150, 30, 11, 0.7]]) g(trPatch(K, P, fdBlob(...W(u, v), r, seed, 0.15, 40, sq)));
  // the open ground each platoon crosses: one ploughed field per sector, so the four sectors read
  G.V.forEach((cv, i) => g(trField(K, P, ring([[-64, cv - G.HW + 2], [-64, cv + G.HW - 2], [-12, cv + G.HW - 3], [-12, cv - G.HW + 3]]), { furrows: 6, tint: i % 2 ? "b" : "a" })));
  for (const [r, n, tint] of [[[[-130, -96], [-130, -20], [-100, -20], [-100, -96]], 5, "b"], [[[-132, 20], [-132, 100], [-100, 100], [-100, 20]], 6, "a"]]) g(trField(K, P, ring(r), { furrows: n, tint }));
  // the lateral road behind the line of departure, and a track to the rear
  g(trRoad(K, P, ring([[G.U_ROAD - 2, -300], [G.U_ROAD + 1, -150], [G.U_ROAD - 1, 0], [G.U_ROAD + 1, 150], [G.U_ROAD - 2, 300]]), 3.2));
  g(trRoad(K, P, ring([[G.U_ROAD, 2], [-120, 4], [-170, 0], [-260, 6]]), 2.2, { ruts: false }));

  // woods: one behind the enemy, one on each flank of the company front, copses to the rear
  const keepClear = (x, y) => { const [u, v] = fieldFrameOf(x, y); return (u < G.U_RUN + 6 && Math.abs(v) < 130) || Math.hypot(u - G.U_OBJ, v) < 18; };
  const woods = [
    [ring([[50, -180], [56, -90], [48, 0], [54, 90], [50, 180], [160, 180], [160, -180]]), 64, 21],
    [ring([[-60, 106], [30, 104], [40, 180], [-60, 180]]), 26, 22],
    [ring([[-60, -106], [30, -104], [40, -180], [-60, -180]]), 26, 23],
    [fdBlob(...W(-160, 120), 22, 33, 0.14, 40, 0.9), 9, 24],
    [fdBlob(...W(-165, -60), 20, 34, 0.12, 40, 1), 8, 25],
  ];
  for (const [r, n, seed] of woods) {
    const trees = trScatter(r, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => keepClear(x, y) || avoidBase(x, y) });
    const w = trWood(K, P, T, r, trees);
    g(w.floor);
    items.push(...w.items);
  }
  // hedges along the road behind the line, a farm by the track, and stone walls by it
  for (const [v0, v1, seed] of [[-140, -54, 51], [36, 140, 52]]) items.push(...trHedge(K, P, ring([[G.U_ROAD - 6, v0], [G.U_ROAD - 7, (v0 + v1) / 2], [G.U_ROAD - 6, v1]]), { seed }));
  { const [x, y] = W(-116, -18); items.push(trHouse(K, P, x, y, G.ANG + 90, 12, 8)); }
  { const [x, y] = W(-122, 12); items.push(trHouse(K, P, x, y, G.ANG, 10, 7)); }
  items.push(...trWall(K, P, ring([[-104, -34], [-134, -34]])), ...trWall(K, P, ring([[-134, -34], [-134, -4]])));

  // the relief, drawn over the flat cover
  g(trRelief(K, P, T));

  // the enemy's fighting positions: two in each platoon sector
  G.V.forEach((cv) => [-1, 1].forEach((side) => { const [x, y] = W(0, cv + side * G.HOLE_DV); items.push(...trHole(K, P, x, y, T.height(x, y), FACE_H)); }));

  // control measures: the line of departure and the sector boundaries on pegs, the objective flag
  const ld = trChalk(K, P, T, ring([[G.U_LD, -100], [G.U_LD, -50], [G.U_LD, 0], [G.U_LD, 50], [G.U_LD, 100]]));
  g(ld.ground); items.push(...ld.items);
  for (const v of [-50, 0, 50]) { const b = trChalk(K, P, T, ring([[G.U_LD, v], [-18, v]]), { h: 2.6 }); g(b.ground); items.push(b.items[1]); }
  { const [x, y] = W(G.U_OBJ, 0); items.push(trObjective(K, P, T, x, y, { h: 12, ang: 210 })); }

  return { ground: ground.join(""), items };
}
