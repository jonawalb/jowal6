// The Battlefield view of the Combined Arms Dilemma: MCDP 1's own fire-team example, drawn with the
// terrain kit (../../kit/terrain.mjs). The same model state S as the lock drives it:
//   S.g   the guard: which threat the enemy pair guards against. -1 (guard on A) = staying down in
//         its hole behind the wall, out of the automatic rifle's fire; toward 0 it rises to fire back
//         over the wall; toward +1 (guard on B) it leaves the hole and runs back across the open,
//         away from where the grenades land.
//   S.kb  key B's travel (0 = in the lock, 1 = in its holder): the grenadier. With key B in he is up
//         in his firing position lobbing grenades into the hole; with it out he is held back.
//   S.turnA, S.turnB, S.f  the keys' turn and the bolt: whether the automatic rifle's or the
//         grenadier's fire reaches the enemy, and the notional casualties (model.mjs casualties()).
// Laid out in a frame on the ground: u forward (from the blue team toward the enemy, up the card),
// v across. fieldStatic() builds the ground and everything that never moves (build only);
// fieldPose() places every soldier and fire stream for a state (build and page); fieldMarks() draws
// the fire sectors; fieldShots() adds the grenades' arcs and bursts to the kit's tracer fire.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { casualties } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trTree, trHedge, trWall, trHouse, trHole, trFan, trMuzzle, trAimPoint, trShots } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -200, y: -200, w: 400, d: 400 },
  O: [0, 0],            // the enemy hole (world)
  ANG: 295,             // direction from the blue team to the enemy (world degrees): up and right on the card
  U_WALL: -3.8,         // the low stone wall in front of the hole (u)
  U_HEDGE: -42,         // the hedgerow the blue team fires from (u)
  // the blue fire team behind the hedge (u, v): automatic rifleman prone, team leader kneeling,
  // grenadier kneeling in his firing position, or held back behind the hedge with one arm
  AR: [-46, -6], TL: [-47.5, 1], GR: [-47, 8], GR_BACK: [-60, 15],
  R_DOWN: [-55, -1],    // the rifleman, down, pulled back behind the hedge (always: success is not free)
  // the enemy pair's escape route out of the back of the hole, across the open toward the wood
  RUN: [[1.2, 0], [4.5, -2.4], [8.5, -5.8], [13, -9.4]],
  E_DOWN: [3.6, 2.2],   // where the first enemy rifleman lies when hit (the hole's rear lip)
  SINK: 1.15,           // how far the pair sinks into the hole when it stays down (units)
  LOB: { period: 3.1, flight: 1.45, apex: 15 },  // the grenades: one round per period, notional
  VIEW: { u: -20, zoom: 2.8 },  // the card frames the ground round this point of the axis, zoomed
};
FG.TERRAIN = {
  rises: [
    { cx: 0, cy: 0, r: 22, steps: 3, h: 1.3, top: 0.45, seed: 41, wobble: 0.12 },
    { cx: 0, cy: 0, r: 18, steps: 2, h: 1.3, top: 0.5, seed: 47, wobble: 0.1 },
  ],
};
{
  const F = fdFrame(FG.O[0], FG.O[1], FG.ANG);
  [[44, 58], [-30, -86]].forEach(([u, v], i) => { const [x, y] = F(u, v); FG.TERRAIN.rises[i].cx = x; FG.TERRAIN.rises[i].cy = y; });
}

const CA_RAD = Math.PI / 180;
const caSmooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const CA_STRIDE = [1, 0, 2, 0];
const caStrideAt = (dist) => CA_STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const CW = fdFrame(FG.O[0], FG.O[1], FG.ANG);           // (u, v) → world [x, y]
const CA_FACE_F = FG.ANG, CA_FACE_H = FG.ANG + 180;
// heading (world degrees) from frame point a to frame point b
const caHeading = (a, b) => { const [x0, y0] = CW(...a), [x1, y1] = CW(...b); return Math.atan2(y1 - y0, x1 - x0) / CA_RAD; };
// a point s (0..1) along the escape route, by length
function caRunAt(s) {
  const R = FG.RUN, seg = [];
  let L = 0;
  for (let i = 0; i < R.length - 1; i++) { const d = Math.hypot(R[i + 1][0] - R[i][0], R[i + 1][1] - R[i][1]); seg.push(d); L += d; }
  let d = Math.min(1, Math.max(0, s)) * L;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) { const t = Math.min(1, d / seg[i]); return { u: R[i][0] + (R[i + 1][0] - R[i][0]) * t, v: R[i][1] + (R[i + 1][1] - R[i][1]) * t, face: caHeading(R[i], R[i + 1]), dist: s * L }; }
    d -= seg[i];
  }
  return { u: R[0][0], v: R[0][1], face: CA_FACE_F, dist: 0 };
}

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const ring = (pts) => pts.map(([u, v]) => CW(u, v));
  const avoidBase = (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  g(trGroundPlane(K, P, G.world));

  // meadows toward the edges
  for (const [u, v, r, seed, sq] of [[-100, 40, 30, 3, 0.6], [30, 70, 28, 5, 0.7], [-20, -80, 26, 7, 0.7], [-120, -30, 24, 9, 0.8]]) g(trPatch(K, P, fdBlob(...CW(u, v), r, seed, 0.15, 40, sq)));
  // the open ground between the hedge and the wall: a ploughed field, and stubble on either side
  g(trField(K, P, ring([[-39, -24], [-39, 24], [-7, 26], [-7, -26]]), { furrows: 9, tint: "a" }));
  g(trField(K, P, ring([[-39, 30], [-39, 62], [-8, 66], [-7, 32]]), { furrows: 6, tint: "b" }));
  g(trField(K, P, ring([[-39, -30], [-39, -60], [-8, -64], [-7, -32]]), { furrows: 6, tint: "b" }));
  // the farm track behind the blue team, and the lane past the enemy's field corner
  g(trRoad(K, P, ring([[-88, -200], [-87, -100], [-85, -20], [-86, 60], [-84, 140], [-87, 220]]), 2.6));
  g(trRoad(K, P, ring([[-85, 62], [-50, 68], [-12, 70], [30, 76], [80, 82], [160, 86]]), 2, { ruts: false }));

  // woods: the wood behind the enemy that its escape route heads for, and copses toward the edges
  const runClear = (x, y) => {
    for (let s = 0; s <= 1.0001; s += 0.1) { const p = caRunAt(s), [px, py] = CW(p.u, p.v); if (Math.hypot(x - px, y - py) < 8) return true; }
    return false;
  };
  const woods = [
    [ring([[21, -70], [19, -30], [23, 8], [22, 26], [80, 40], [86, -76]]), 34, 21, runClear],
    [fdBlob(...CW(-22, -66), 13, 33, 0.14, 40, 0.9), 6, 23],
    [fdBlob(...CW(-64, 44), 12, 34, 0.12, 40, 1), 5, 24],
    [fdBlob(...CW(-34, 100), 15, 35, 0.12, 40, 0.8), 6, 25],
  ];
  for (const [r, n, seed, avoid] of woods) {
    const trees = trScatter(r, n, { seed, gap: 5.6, r: [2.6, 4.0], h: [8, 12], avoid: (x, y) => (avoid ? avoid(x, y) : false) || avoidBase(x, y) });
    const w = trWood(K, P, T, r, trees);
    g(w.floor);
    items.push(...w.items);
  }
  // a few field trees along the hedge
  for (const [u, v, r, h] of [[-42, -30, 3.2, 10], [-42, 33, 3.4, 11]]) {
    const [x, y] = CW(u, v);
    items.push({ key: K.depthOf([x, y, 0], P), svg: trTree(K, P, { x, y, r, h, lobes: 3 }, T.height(x, y)) });
  }

  // the blue team's hedgerow, the enemy's low stone wall along its field edge, and the farm
  items.push(...trHedge(K, P, ring([[G.U_HEDGE, -26], [G.U_HEDGE - 0.6, -12], [G.U_HEDGE + 0.5, 4], [G.U_HEDGE, 20], [G.U_HEDGE + 0.4, 28]]), { seed: 61 }));
  items.push(...trWall(K, P, ring([[G.U_WALL, -32], [G.U_WALL + 0.3, -12], [G.U_WALL, 10], [G.U_WALL - 0.3, 30]])));
  items.push(...trWall(K, P, ring([[G.U_WALL - 0.3, 30], [18, 31]])));
  { const [x, y] = CW(-74, -30); items.push(trHouse(K, P, x, y, FG.ANG + 90, 13, 8.5)); }
  { const [x, y] = CW(-77, -47); items.push(trHouse(K, P, x, y, FG.ANG, 9, 7)); }

  g(trRelief(K, P, T));

  // the enemy's two-man fighting position behind the wall
  { const [x, y] = CW(0, 0); items.push(...trHole(K, P, x, y, T.height(x, y), CA_FACE_H)); }
  return { ground: ground.join(""), items };
}

// Where every soldier stands and who fires at whom, for a model state. M carries what the page
// measures between frames: the speed of the enemy's run (vr, route share per second) and of the
// grenadier (vg, key-B travel per second). Without M (the build's first frame) nobody is moving.
export function fieldPose(S, MODEL, T, M = {}) {
  const G = FG;
  const men = [];
  const add = (m) => { const [x, y] = CW(m.u, m.v); m.x = x; m.y = y; m.z = T.height(x, y) + (m.dz || 0); men.push(m); };
  const keysIn = S.kb < 0.01 ? 2 : 1;
  const loss = casualties(S.f, keysIn);
  const down = caSmooth(-0.45, -0.75, S.g);             // 1 = staying down in the hole
  const run = caSmooth(0.4, 0.95, S.g);                 // share of the escape route covered
  const runMoving = Math.abs(M.vr || 0) > 0.05;
  const hitBy = S.turnA >= S.turnB ? "ar" : "gr";

  // --- the enemy pair (riflemen) ---
  const enemy = [];
  [1.15, -1.15].forEach((dv, j) => {
    const id = `e-${j}`;
    if (j === 0 && loss.red >= 1) {
      add({ id, side: "hc", role: "r", pose: "prone", face: CA_FACE_H + 25, stride: 0, u: G.E_DOWN[0], v: G.E_DOWN[1] });
      return;
    }
    let m;
    if (run > 0.01) {
      const p = caRunAt(run - j * 0.08 * (1 - run));
      const moving = runMoving || run < 0.98;
      const back = (M.vr || 0) < 0;
      m = { pose: moving ? "stand" : "prone", face: moving ? (back ? p.face + 180 : p.face) : CA_FACE_H, stride: moving ? caStrideAt(p.dist + j * 1.7) : 0, u: p.u + (moving ? 0 : 1.6), v: p.v + dv * 0.8 };
    } else if (down > 0.5) {
      m = { pose: "hole", face: CA_FACE_H, stride: 0, u: 0, v: dv, dz: -G.SINK * down };
    } else {
      m = { pose: "kneel", face: CA_FACE_H, stride: 0, u: -0.2, v: dv, dz: -0.2 };
    }
    add({ id, side: "h", role: "r", ...m });
    enemy.push(men[men.length - 1]);
  });

  // --- the blue fire team: team leader, automatic rifleman, grenadier, rifleman ---
  const toHole = (from) => caHeading(from, [0, 0]);
  const tlDown = loss.blue >= 2;
  add({ id: "f-ar", side: "f", lit: true, role: "ar", pose: "prone", face: toHole(G.AR), u: G.AR[0], v: G.AR[1] });
  add(tlDown
    ? { id: "f-tl", side: "fc", role: "tl", pose: "prone", face: CA_FACE_F + 160, u: G.TL[0] - 3, v: G.TL[1] }
    : { id: "f-tl", side: "f", lit: true, role: "tl", pose: "kneel", face: toHole(G.TL), u: G.TL[0], v: G.TL[1] });
  add({ id: "f-r", side: "fc", role: "r", pose: "prone", face: CA_FACE_F - 100, u: G.R_DOWN[0], v: G.R_DOWN[1] });
  const gIn = 1 - Math.min(1, Math.max(0, S.kb));       // 1 = up in his firing position
  const gMoving = Math.abs(M.vg || 0) > 0.05 || (gIn > 0.01 && gIn < 0.99);
  const gu = G.GR_BACK[0] + (G.GR[0] - G.GR_BACK[0]) * gIn, gv = G.GR_BACK[1] + (G.GR[1] - G.GR_BACK[1]) * gIn;
  const gFace = gMoving ? ((M.vg || 0) > 0 ? caHeading(G.GR, G.GR_BACK) : caHeading(G.GR_BACK, G.GR)) : toHole([gu, gv]);
  add({ id: "f-gr", side: "f", lit: true, role: "gr", pose: gMoving ? "stand" : "kneel", face: gFace, stride: gMoving ? caStrideAt(gIn * 16) : 0, u: gu, v: gv });
  const ready = gIn > 0.99 && !gMoving;

  // --- fire ---
  const byId = Object.fromEntries(men.map((m) => [m.id, m]));
  const aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z);
  const wallTop = [-2.6, -0.8, 1, 2.6].map((v) => { const [x, y] = CW(G.U_WALL, v); return [x, y, T.height(x, y) + 1.9]; });
  const [hx, hy] = CW(0.2, 0);
  const holeIn = [hx, hy, T.height(hx, hy) + 0.25];
  const up = enemy.filter((m) => m.pose !== "hole");
  const streams = [];
  // the automatic rifleman: always firing (key A is always in). On the wall's top while the pair
  // stays down (pinning it), on the men themselves once they rise or run.
  streams.push({ id: "f-ar", side: "f", heavy: true, from: muzzle(byId["f-ar"]), to: up.length ? up.map(aim) : wallTop, period: 1.5, burst: 3, gap: 0.09, flight: 0.45, phase: 0.2, on: 1, scatter: up.length ? 1.6 : 1.4 });
  if (!tlDown) streams.push({ id: "f-tl", side: "f", from: muzzle(byId["f-tl"]), to: up.length ? up.map(aim) : wallTop, period: 2.6, burst: 1, gap: 0.1, flight: 0.45, phase: 1.1, on: 0.7, scatter: 1.6 });
  // the enemy fires back while it is up behind the wall (kneeling), never from the hole or on the run
  for (const m of enemy) if (m.pose === "kneel") {
    const tgt = men.filter((x) => x.side === "f").map(aim);
    streams.push({ id: m.id, side: "h", from: muzzle(m), to: tgt, period: 1.9, burst: 1, gap: 0.1, flight: 0.45, phase: m.id === "e-0" ? 0.4 : 1.3, on: 0.85, scatter: 2.4 });
  }
  // the grenadier: rounds lobbed over the wall into the hole, one per period, while key B is in
  const lobs = ready ? [{ from: muzzle(byId["f-gr"]), to: holeIn, ...G.LOB, phase: 0.6 }] : [];
  return { men, streams, lobs, keysIn, loss, run, down, ready, hitBy };
}

// A point on a grenade's arc at share u of its flight.
function caArc(L, u) {
  const a = L.from, b = L.to;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u + 4 * L.apex * u * (1 - u)];
}
// The kit's tracer fire plus the grenades: a short bright dash moving along each arc, then a burst
// of strike puffs and drifting smoke in the hole. A pure function of time, like trShots.
export function fieldShots(pose, t) {
  const out = trShots(pose.streams, t);
  for (const L of pose.lobs) {
    const k1 = Math.floor((t - L.phase) / L.period);
    for (let k = k1 - 1; k <= k1; k++) {
      const age = t - (L.phase + k * L.period);
      if (age < 0) continue;
      if (age < 0.07) out.flashes.push({ p: L.from, side: "f", heavy: true, a: 1 - age / 0.07 });
      if (age < L.flight) {
        const u = age / L.flight;
        out.tracers.push({ a: caArc(L, Math.max(0, u - 0.07)), b: caArc(L, u), u: 1, side: "f", heavy: true });
      } else {
        const ia = age - L.flight;
        if (ia < 0.7) for (let j = 0; j < 4; j++) {
          const r = 1.3 * Math.min(1, ia * 4);
          out.puffs.push({ p: [L.to[0] + r * Math.cos(j * 1.7 + k), L.to[1] + r * Math.sin(j * 1.7 + k), L.to[2] + 0.4 * j], age: Math.min(1, ia / 0.7), side: "f" });
        }
        if (ia < 2.6) out.smoke.push({ p: [L.to[0] - 1.4 * ia, L.to[1] - 2 * ia, L.to[2] + 1 + ia * 1.2], age: ia / 2.6 });
      }
    }
  }
  return out;
}

// The grenade's trajectory as a faint dotted arc (screen path), while the grenadier is firing.
export function fieldArc(K, P, pose) {
  if (!pose.lobs.length) return "";
  const L = pose.lobs[0], pts = [];
  for (let i = 0; i <= 24; i++) pts.push(K.iso(caArc(L, i / 24), P));
  return K.pathOf(pts);
}

// Per-state ground marks: the automatic rifle's sector (blue) over the wall and the open ground
// behind it, and, with key B in, the grenadier's narrow impact sector round the hole.
export function fieldMarks(K, P, T, pose) {
  const ar = pose.men.find((m) => m.id === "f-ar");
  const [hx, hy] = CW(0, 0), [rx, ry] = CW(...FG.RUN[FG.RUN.length - 1]);
  const toHole = Math.atan2(hy - ar.y, hx - ar.x) / CA_RAD, toRun = Math.atan2(ry - ar.y, rx - ar.x) / CA_RAD;
  const a0 = Math.min(toHole, toRun) - 7, a1 = Math.max(toHole, toRun) + 7;
  const dist = Math.hypot(hx - ar.x, hy - ar.y);
  let svg = trFan(K, P, T, ar.x, ar.y, 6, dist + 22, a0, a1, { side: "f", arcs: 2, alpha: 0.75 });
  if (pose.ready) {
    const gr = pose.men.find((m) => m.id === "f-gr");
    const d = Math.hypot(hx - gr.x, hy - gr.y), a = Math.atan2(hy - gr.y, hx - gr.x) / CA_RAD;
    svg += trFan(K, P, T, gr.x, gr.y, d - 5, d + 5, a - 5, a + 5, { side: "f", arcs: 1, alpha: 0.9 });
  }
  return svg;
}
