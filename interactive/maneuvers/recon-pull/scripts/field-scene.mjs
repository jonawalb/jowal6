// The Battlefield view of Reconnaissance Pull, drawn with the terrain kit (../../kit/terrain.mjs).
// The same run as the marble bench drives it: run = { mode, open: [5], planned }, the time t since
// the run started and the eased gate states S.shut (1 = held). Each model part has a counterpart:
//   gate (held / open)   → a crossing through a belt of woods, held by an enemy team in a fighting
//                          position (with its fire sector on the ground) or empty (a gap)
//   scout carriage       → a lit scout team: it moves along the front of the screen and probes each
//                          crossing it checks (scoutAt: x along the front, dip = how far forward)
//   marbles (main body)  → a rifle company in column, seven groups (two per platoon and the company
//                          headquarters), each placed where its marble is (marbleAt)
//   diverter / plan peg  → the chosen route, chalked on the ground: under push from the start (the
//                          plan), under pull once the scouts find the gap
//   collecting tray      → the far side of the woods, with the objective flag
// Model x (across) and y (forward is -y) map onto a ground frame: u forward (up the card), v across.
// The queue behind the escapement maps onto the road the company comes up from the rear.
// Casualties come from losses() in model.mjs (notional). fieldStatic() builds the ground and what
// never moves (build only); fieldPose() places every soldier and fire stream (build and page);
// fieldMarks() draws the fire sectors and the chosen route.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { MODEL, marbleAt, scoutAt, losses } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trFan, trObjective, trFireTeam, trPlace, trMuzzle, trAimPoint, trDrape } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -300, y: -300, w: 600, d: 600 },
  O: [0, 0],          // the frame's origin (world)
  ANG: 265,           // forward (world degrees): up the card and to the right
  KU: 1.0,            // model y → u (forward), up to the gate
  KT: [2.0, 1.0],     // past the gate: u per model unit to the first row of the tray, then per unit beyond
  KV: 1.1,            // model x → v (across); the sign puts lane 1 on the left of the card
  H_U: 10,            // the enemy fighting positions at each crossing (u)
  BELT: [18, 32],     // the belt of woods the crossings run through (u)
  U_SC: -22,          // the scouts' line along the front of the screen (u)
  U_PROBE: -8,        // how far forward the scouts get at a held crossing (u)
  U_BEYOND: 64,       // where the scouts wait beyond a gap, ahead of the company (u)
  U_OBJ: 66,          // the objective flag (u)
  VIEW: { u: -2, v: -6, zoom: 1.7 }, // the card frames the ground round this point, zoomed
  ENEMY: [["ar", 0, 1.1, "hole"], ["r", 0, -1.1, "hole"], ["tl", 5.5, 3.2, "kneel"]], // per held crossing: role, du, dv, pose
  BODY_ROLES: [["tl", "ar", "r", "gr", "r"], ["tl", "ar", "r", "gr", "r"], ["pl", "rto", "r", "r", "r"], ["tl", "ar", "r", "gr", "r"], ["tl", "ar", "r", "gr", "r"], ["tl", "ar", "r", "gr", "r"], ["tl", "ar", "r", "gr", "r"]],
  MEDIC: [2, 4],      // the medic: company headquarters group, fifth man
  DOWN_BODY: [4, 2, 1, 3], // which man of a group goes down first, second, ...
  DOWN_SCOUT: [3, 1, 2],
  DOWN_ENEMY: [1, 2],
};
FG.TERRAIN = { rises: [] };

const FS_RAD = Math.PI / 180;
const W = fdFrame(FG.O[0], FG.O[1], FG.ANG);          // (u, v) → world [x, y]
const FACE_F = FG.ANG, FACE_H = FG.ANG + 180;
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const jit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; };
const laneV = (i) => MODEL.lanes[i] * FG.KV;
const U_FEED = (MODEL.gateY - MODEL.feedY) * FG.KU;
const V_MAG = MODEL.magX * FG.KV;
const BACK = [-0.72, 0.69];                            // the approach road's direction back from the junction (u, v per unit)
// A point of the bench (model x, y) on the ground frame (u, v).
export function fieldUV(mx, my) {
  if (my >= MODEL.feedY - 1e-6 && mx < MODEL.magX) {
    const d = (MODEL.magX - mx) * Math.abs(FG.KV);
    return [U_FEED + BACK[0] * d, V_MAG + BACK[1] * d * Math.sign(FG.KV)];
  }
  const d = MODEL.gateY - 6 - my;                       // past the gate: open ground beyond the woods
  if (d > 0) return [6 * FG.KU + Math.min(d, 15.4) * FG.KT[0] + Math.max(0, d - 15.4) * FG.KT[1], mx * FG.KV];
  return [(MODEL.gateY - my) * FG.KU, mx * FG.KV];
}
const angOf = (du, dv) => { const [x0, y0] = W(0, 0), [x1, y1] = W(du, dv); return Math.atan2(y1 - y0, x1 - x0) / FS_RAD; };
// rotate a formation offset (forward a, left b) to face `face` (world degrees); return a world delta
const offAt = (face, a, b) => [a * Math.cos(face * FS_RAD) - b * Math.sin(face * FS_RAD), a * Math.sin(face * FS_RAD) + b * Math.cos(face * FS_RAD)];

export const fieldTerrain = () => {
  const r = (u, v, spec) => { const [cx, cy] = W(u, v); return { cx, cy, ...spec }; };
  return trTerrain({ rises: [
    r(-60, 150, { r: 30, steps: 3, h: 1.4, top: 0.45, seed: 61, wobble: 0.12 }),
    r(110, -150, { r: 34, steps: 4, h: 1.5, top: 0.4, seed: 67, wobble: 0.1 }),
    r(-150, 110, { r: 24, steps: 2, h: 1.4, top: 0.5, seed: 71, wobble: 0.12 }),
  ] });
};

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const ring = (pts) => pts.map(([u, v]) => W(u, v));
  const avoidBase = (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  g(trGroundPlane(K, P, G.world));

  // meadows toward the edges and beyond the woods
  for (const [u, v, r, seed, sq] of [[-130, 60, 44, 3, 0.6], [70, 40, 60, 5, 0.5], [-40, -170, 40, 7, 0.7], [90, -110, 40, 9, 0.7], [-150, -150, 40, 11, 0.7]]) g(trPatch(K, P, fdBlob(...W(u, v), r, seed, 0.15, 40, sq)));
  // farm fields between the five tracks, from the lateral road up to the scouts' line
  const vs = MODEL.lanes.map((_, i) => laneV(i)).sort((a, b) => a - b);
  const strips = [[vs[0] - 40, vs[0] - 6]];
  for (let i = 0; i < 4; i++) strips.push([vs[i] + 6, vs[i + 1] - 6]);
  strips.push([vs[4] + 6, vs[4] + 40]);
  strips.forEach(([v0, v1], i) => g(trField(K, P, ring([[U_FEED + 6, v0], [U_FEED + 6, v1], [-30, v1], [-30, v0]]), { furrows: 6 + (i % 3), tint: i % 2 ? "a" : "b" })));
  for (const [r, n, tint] of [
    [[[-170, -60], [-170, 0], [-120, 2], [-120, -58]], 7, "a"],
    [[[-110, 120], [-110, 175], [-150, 175], [-150, 120]], 6, "b"],
  ]) g(trField(K, P, ring(r), { furrows: n, tint }));
  // the stream far behind the screen
  g(trStream(K, P, ring([[118, -320], [112, -200], [120, -90], [114, 20], [122, 130], [116, 240], [124, 330]]), 3.2, 5));
  // the lateral road (the feeder), the road the company comes up (the queue), and the five tracks
  g(trRoad(K, P, ring([[U_FEED, -320], [U_FEED, -160], [U_FEED, 0], [U_FEED, 160], [U_FEED, 320]]), 3.2));
  const app = [];
  for (let d = 0; d <= 260; d += 20) app.push([U_FEED + BACK[0] * d, V_MAG + BACK[1] * d * Math.sign(G.KV)]);
  g(trRoad(K, P, ring(app), 3, { ruts: true }));
  MODEL.lanes.forEach((_, i) => g(trRoad(K, P, ring([[U_FEED, laneV(i)], [-30, laneV(i) + 0.6], [0, laneV(i)], [40, laneV(i) - 0.5], [100, laneV(i) + 0.4], [140, laneV(i)]]), 2.1, { ruts: false })));

  // the belt of woods the enemy screens, with a clear corridor along each track; woods far behind
  const nearLane = (x, y, half) => MODEL.lanes.some((_, i) => { const [hx, hy] = W(0, laneV(i)); const [ex, ey] = W(1, laneV(i)); const fx = ex - hx, fy = ey - hy; const d = Math.abs((x - hx) * -fy + (y - hy) * fx); return d < half; });
  const belt = ring([[G.BELT[0], -180], [G.BELT[0] + 2, -60], [G.BELT[0] - 1, 60], [G.BELT[0], 180], [G.BELT[1], 180], [G.BELT[1] + 3, 0], [G.BELT[1], -180]]);
  const woods = [
    [belt, 420, 21, (x, y) => nearLane(x, y, 9), [2.2, 3.5], [6.5, 10], 3.3],
    [ring([[96, -60], [100, 40], [150, 60], [160, -80]]), 30, 22, (x, y) => nearLane(x, y, 9)],
    [fdBlob(...W(-150, -100), 22, 33, 0.14, 40, 0.9), 9, 23],
    [fdBlob(...W(-120, 150), 20, 34, 0.12, 40, 1), 8, 24],
    [fdBlob(...W(60, 150), 24, 35, 0.12, 40, 0.8), 9, 25],
  ];
  for (const [r, n, seed, avoid, rr, hh, gap] of woods) {
    const trees = trScatter(r, n, { seed, gap: gap || 5.4, r: rr || [2.8, 4.4], h: hh || [8, 12.5], avoid: (x, y) => (avoid ? avoid(x, y) : false) || avoidBase(x, y) });
    const w = trWood(K, P, T, r, trees);
    g(w.floor);
    items.push(...w.items);
  }
  // hedgerows along the fields (they stop short of the scouts' line), a farm by the road
  vs.forEach((v, i) => { if (i < 4) items.push(...trHedge(K, P, ring([[U_FEED + 8, (v + vs[i + 1]) / 2], [-32, (v + vs[i + 1]) / 2 + 1.2]]), { seed: 51 + i })); });
  items.push(...trWall(K, P, ring([[-150, -40], [-150, -10]])), ...trWall(K, P, ring([[-150, -40], [-126, -40]])));
  { const [x, y] = W(-140, -24); items.push(trHouse(K, P, x, y, FG.ANG + 90, 13, 8.5)); }
  { const [x, y] = W(-122, -52); items.push(trHouse(K, P, x, y, FG.ANG, 10, 7.5)); }

  // the relief, drawn over the flat cover
  g(trRelief(K, P, T));

  // a fighting position at every crossing: the enemy mans only some of them (the held gates)
  MODEL.lanes.forEach((_, i) => { const [x, y] = W(G.H_U, laneV(i)); items.push(...trHole(K, P, x, y, T.height(x, y), FACE_H)); });
  { const [x, y] = W(G.U_OBJ, laneV(2) + 14); items.push(trObjective(K, P, T, x, y, { h: 12, ang: 210 })); }
  return { ground: ground.join(""), items };
}

// ---- where everything is at time t ----
// The scout team (four men, lit): along the front in file, a wedge facing forward at each crossing.
function scoutPlace(run, t, p) {
  const G = FG, sc = scoutAt(run, t, MODEL, p);
  let cur = null, idx = -1;
  p.stops.forEach((s, i) => { if (t >= s.arrive) { cur = s; idx = i; } });
  const last = idx === p.stops.length - 1;
  let u = G.U_SC, q = 0, pose = "stand", moving = true, contact = -1;
  const next = !cur ? p.stops[0] : t >= cur.leave ? p.stops[idx + 1] : null;
  const fromX = cur ? MODEL.lanes[cur.lane] : MODEL.scoutPark;
  const lat = (next ? Math.sign(MODEL.lanes[next.lane] - fromX) || 1 : 1) * Math.sign(G.KV);
  if (cur) {
    if (cur.open) {
      const f = smooth01(cur.arrive, cur.arrive + 1.1, t);
      u = G.U_SC + (G.U_BEYOND - G.U_SC) * f; q = smooth01(cur.arrive, cur.arrive + 0.25, t);
      moving = f < 1; pose = moving ? "stand" : "kneel";
    } else if (t < cur.leave || last) {
      u = G.U_SC + (G.U_PROBE - G.U_SC) * sc.dip; q = smooth01(cur.arrive, cur.arrive + 0.25, t);
      if (sc.dip > 0.5 || (last && t >= cur.leave)) { pose = "prone"; contact = cur.lane; }
      moving = sc.dip > 0.02 && sc.dip < 0.98 && !(last && t >= cur.leave);
      if (last && t >= cur.leave) { u = G.U_SC + 6; moving = false; }
    } else q = 1 - smooth01(cur.leave, cur.leave + 0.25, t);
  }
  const v = sc.x * G.KV;
  const fwd = q >= 0.5;
  const faceLat = angOf(0, lat), face = fwd ? FACE_F : faceLat;
  const [ax, ay] = W(u, v);
  const A = trPlace(trFireTeam("file", 3.2), { x: ax, y: ay, face: faceLat });
  const B = trPlace(trFireTeam("wedge", 3.2), { x: ax, y: ay, face: FACE_F });
  const roles = ["tl", "r", "r", "rto"];
  return A.map((m, i) => ({ id: `s-${i}`, side: "f", lit: true, role: roles[i], kind: "scout", pose,
    face, stride: moving ? strideAt((fwd ? u : v) + i * 1.7) : 0,
    x: m.x + (B[i].x - m.x) * q + jit(i, 1) * 0.8, y: m.y + (B[i].y - m.y) * q + jit(1, i) * 0.8, contact }));
}

// One group of the main body at time t: five men in file while moving, kneeling when halted, a
// wedge on the far side, prone in line when stalled at the head of the column against a held gate.
const FORM = {
  file: [[0, 0], [-2.4, 0.4], [-4.8, -0.4], [-7.2, 0.4], [-9.6, 0]],
  line: [[0, 0], [0, 2.7], [0, -2.7], [0, 5.4], [0, -5.4]],
  wedge: [[0, 0], [-2.3, 2.3], [-2.3, -2.3], [-4.6, 4.6], [-4.6, -4.6]],
};
function groupPlace(run, g, t, p) {
  const G = FG;
  const [mx, my] = marbleAt(run, g, t, MODEL, p), [px, py] = marbleAt(run, g, t - 0.08, MODEL, p);
  const [u, v] = fieldUV(mx, my), [pu, pv] = fieldUV(px, py);
  const d = Math.hypot(u - pu, v - pv);
  const q = Math.min(1, d / (Math.abs(G.KV) * MODEL.v * 0.08 * 0.7));
  const queued = my >= MODEL.feedY - 1e-6 && mx <= MODEL.magX + 1e-6;
  const tray = u > G.BELT[1] + 1;
  const stalled = !queued && !tray && q < 0.5 && p.lane !== null && !run.open[p.lane];
  let face;
  if (d > 0.05) face = angOf(u - pu, v - pv);
  else if (queued) face = angOf(-BACK[0], -BACK[1] * Math.sign(G.KV));
  else face = FACE_F;
  const halt = stalled && g < 2 ? FORM.line : tray ? FORM.wedge : FORM.file;
  const pose = q > 0.5 ? "stand" : stalled && g < 2 ? "prone" : "kneel";
  const [ax, ay] = W(u, v);
  return FG.BODY_ROLES[g].map((role, i) => {
    const a = halt[i][0] + (FORM.file[i][0] - halt[i][0]) * q, b = halt[i][1] + (FORM.file[i][1] - halt[i][1]) * q;
    const [dx, dy] = offAt(face, a + 0.9 * jit(i, g), b + 0.6 * jit(g, i));
    return { id: `b${g}-${i}`, side: "f", role, kind: "body", g, pose, face: face + (pose === "kneel" ? 12 * jit(i, g + 5) : 0),
      stride: q > 0.5 ? strideAt(Math.abs(u) + Math.abs(v) + i * 1.7) : 0, x: ax + dx, y: ay + dy, u, stalled };
  });
}

// Where every soldier stands and who fires at whom. S = { run, t, shut } (shut eased by the page;
// without it, the run's own gate states), p = plan(S.run).
export function fieldPose(S, p, T) {
  const G = FG, run = S.run, t = S.t;
  const shut = S.shut || run.open.map((o) => (o ? 0 : 1));
  const men = [];
  const ev = losses(run, MODEL, p).filter((e) => e.t <= t);
  const fix = (m) => { m.z = T.height(m.x, m.y); return m; };

  // --- scouts ---
  const scouts = scoutPlace(run, t, p);
  ev.filter((e) => e.kind === "scout").forEach((e) => {
    const m = scouts[G.DOWN_SCOUT[e.k] ?? 0], at = scoutPlace(run, e.t, p)[G.DOWN_SCOUT[e.k] ?? 0];
    Object.assign(m, { side: "fc", lit: false, pose: "prone", stride: 0, x: at.x, y: at.y, face: FACE_F + 25 * jit(e.k, 7), down: true });
  });
  men.push(...scouts);

  // --- main body ---
  const groups = Array.from({ length: MODEL.n }, (_, g) => groupPlace(run, g, t, p));
  const bodyDown = ev.filter((e) => e.kind === "body");
  const taken = {};
  let firstDown = null;
  bodyDown.forEach((e) => {
    const n = taken[e.g] = (taken[e.g] || 0);
    taken[e.g]++;
    const i = G.DOWN_BODY[n % G.DOWN_BODY.length];
    const at = groupPlace(run, e.g, e.t, p)[i];
    const m = groups[e.g][i];
    Object.assign(m, { side: "fc", pose: "prone", stride: 0, x: at.x, y: at.y, face: at.face + 40 * jit(e.g, n), down: true });
    if (!firstDown) firstDown = { m, t: e.t };
  });
  if (firstDown) {
    // the medic leaves his group and runs to the first man down, then kneels by him
    const med = groups[G.MEDIC[0]][G.MEDIC[1]];
    const from = groupPlace(run, G.MEDIC[0], firstDown.t + 0.2, p)[G.MEDIC[1]];
    const [tx, ty] = [firstDown.m.x + 1.6, firstDown.m.y + 1.2];
    const dist = Math.hypot(tx - from.x, ty - from.y), f = Math.min(1, Math.max(0, (t - firstDown.t - 0.2) * 45 / Math.max(dist, 1)));
    if (f > 0) {
      const arrived = f >= 1;
      Object.assign(med, { x: from.x + (tx - from.x) * f, y: from.y + (ty - from.y) * f, pose: arrived ? "kneel" : "stand",
        face: arrived ? Math.atan2(firstDown.m.y - ty, firstDown.m.x - tx) / FS_RAD : Math.atan2(ty - from.y, tx - from.x) / FS_RAD,
        stride: arrived ? 0 : strideAt(dist * f), medic: true });
    }
  }
  groups.forEach((gr) => men.push(...gr));

  // --- enemy: a team at each held crossing (they run in or out when a gate changes) ---
  const enemy = [];
  MODEL.lanes.forEach((_, j) => {
    const s = shut[j];
    if (s < 0.02) return;
    const inPlace = s > 0.98, coming = !run.open[j];
    const off = (1 - s) * 40;
    G.ENEMY.forEach(([role, du, dv, pose], i) => {
      const [x, y] = W(G.H_U + du + off, laneV(j) + dv);
      enemy.push({ id: `e${j}-${i}`, side: "h", role, lane: j, pose: inPlace ? pose : "stand", face: inPlace || coming ? FACE_H : FACE_F,
        stride: inPlace ? 0 : strideAt(off + i * 1.7), x, y });
    });
  });
  const redTaken = {};
  ev.filter((e) => e.kind === "enemy").forEach((e) => {
    const n = redTaken[e.lane] = (redTaken[e.lane] || 0);
    redTaken[e.lane]++;
    const m = enemy.find((x) => x.id === `e${e.lane}-${G.DOWN_ENEMY[n] ?? 2}`);
    if (!m) return;
    const [x, y] = W(G.H_U + 3.8 + 1.5 * n, laneV(e.lane) + (n ? 3.6 : -1.6));
    Object.assign(m, { side: "hc", pose: "prone", stride: 0, x, y, face: FACE_H + 30 + 40 * n, down: true });
  });
  men.push(...enemy);
  men.forEach(fix);

  // --- fire ---
  const aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z);
  const uvOf = (m) => { const [x0, y0] = W(0, 0); const dx = m.x - x0, dy = m.y - y0, c = Math.cos(G.ANG * FS_RAD), s = Math.sin(G.ANG * FS_RAD); return [dx * c + dy * s, -dx * s + dy * c]; };
  const live = men.filter((m) => !m.down && !m.medic);
  const friends = live.filter((m) => m.side === "f").map((m) => ({ m, uv: uvOf(m) }));
  const foes = live.filter((m) => m.side === "h" && m.pose !== "stand");
  const streams = [];
  // enemy: each held crossing fires at friendly troops in front of it, inside its sector
  MODEL.lanes.forEach((_, j) => {
    const team = foes.filter((m) => m.lane === j);
    if (!team.length) return;
    const lv = laneV(j);
    const to = friends.filter(({ uv }) => uv[0] > -60 && uv[0] < G.H_U - 2 && Math.abs(uv[1] - lv) < 12 + 0.55 * (G.H_U - uv[0])).map(({ m }) => aim(m));
    team.forEach((m, i) => streams.push({ id: m.id, side: "h", heavy: m.role === "ar", from: muzzle(m), to, period: m.role === "ar" ? 0.9 : 1.3, burst: m.role === "ar" ? 3 : 1, gap: 0.1, flight: 0.36, phase: j * 0.37 + i * 0.29, on: to.length ? 0.9 : 0, scatter: 2.6 }));
  });
  // scouts: the team leader and a scout fire back while in contact
  scouts.filter((m) => !m.down && m.contact >= 0 && m.pose === "prone" && (m.role === "tl" || m.role === "r")).forEach((m, i) => {
    const to = foes.filter((e) => e.lane === m.contact).map(aim);
    streams.push({ id: m.id, side: "f", from: muzzle(m), to, period: 0.8, burst: 2, gap: 0.12, flight: 0.3, phase: i * 0.31, on: to.length ? 0.9 : 0, scatter: 2 });
  });
  // main body: automatic riflemen (and team leaders when stalled) fire at held crossings in reach
  groups.forEach((gr, g) => {
    const head = gr[0];
    if (head.u < -45 || head.u > 30) return;
    const [, hv] = uvOf(head);
    const to = foes.filter((e) => Math.abs(uvOf(e)[1] - hv) < 48).map(aim);
    if (!to.length) return;
    gr.filter((m) => !m.down && (m.role === "ar" || (head.stalled && m.role === "tl"))).forEach((m, i) => {
      streams.push({ id: m.id, side: "f", heavy: m.role === "ar", smoke: m.role === "ar", from: muzzle(m), to, period: m.role === "ar" ? 1.1 : 1.6, burst: m.role === "ar" ? 3 : 1, gap: 0.1, flight: 0.34, phase: g * 0.41 + i * 0.23, on: m.pose === "stand" ? 0.6 : 0.9, scatter: 2.2 });
    });
  });
  const blue = ev.filter((e) => e.side === "f").length, red = ev.length - blue;
  return { men, streams, shut, blue, red };
}

// Per-state ground marks: each held crossing's fire sector (red, fading in and out with the gate),
// and the chosen route in chalk: the plan under push, the scouts' gap under pull once it is found.
export function fieldMarks(K, P, T, S, p) {
  const G = FG;
  const out = [];
  (S.shut || S.run.open.map((o) => (o ? 0 : 1))).forEach((s, j) => {
    if (s < 0.05) return;
    const [x, y] = W(G.H_U, laneV(j));
    out.push(trFan(K, P, T, x, y, 5, 30, FACE_H - 20, FACE_H + 20, { side: "h", arcs: 1, alpha: 0.75 * s }));
  });
  const lane = routeLane(S, p);
  if (lane !== null) {
    const lv = laneV(lane) + 6;
    const pts = [[U_FEED + 5, V_MAG + 4], [U_FEED + 5, lv], [-14, lv]];
    const line = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [au, av] = pts[i], [bu, bv] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bu - au, bv - av) / 2));
      for (let k = i ? 1 : 0; k <= n; k++) line.push(W(au + ((bu - au) * k) / n, av + ((bv - av) * k) / n));
    }
    const path = (pp) => K.pathOf(trDrape(T, pp, 0.12).map((q) => K.iso(q, P)));
    const tip = W(-14, lv), l = W(-19, lv - 2.6), r = W(-19, lv + 2.6);
    out.push(K.lineSvg(path(line), { tone: "lo", dashed: true, className: "tr-chalk", free: true }));
    out.push(K.lineSvg(path([l, tip]) + path([r, tip]), { tone: "lo", className: "tr-chalk", free: true }));
  }
  return out.join("");
}
export function routeLane(S, p) {
  if (S.run.mode === "push") return S.run.planned;
  return p.lane !== null && S.t >= p.divertAt ? p.lane : null;
}
