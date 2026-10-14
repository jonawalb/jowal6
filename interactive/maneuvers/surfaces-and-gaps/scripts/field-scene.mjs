// The Battlefield view of Surfaces and Gaps, at platoon scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same model state as the bench drives it:
//   S.tips    each feeler blade's tip: a probing fire team in that lane advances as its blade does,
//             and stops where its blade stops (under fire in front of an enemy position: a surface)
//             or slips on into the lane (a gap) up to the blade's full stroke.
//   S.depths  each key's set-back: the enemy element holding that lane sits that far back from its
//             front-line position. Flush keys = the element in its forward position (a surface);
//             a deep key = it has pulled back into depth and left the lane uncovered (a gap). When
//             the face shifts, the enemy elements run to new positions and the gaps move.
//   S.ramY, S.ramTip  the ram: the platoon's follow-on element (the main effort's weight), which
//             strikes the planned lane, falls back, moves across behind the line and follows the
//             team that went deepest through its gap.
//   S.p       the model pose (phase, planned and deepest lane, contacts) for the main effort and
//             the casualty counts (model.mjs casualties()).
// Ground frame: u forward (the direction of the attack, up the card), v across the front (right on
// the card). Lane 1 is the left lane, lane 5 the right. fieldStatic() builds the ground and
// everything that never moves (build only); fieldPose() places every soldier and fire stream for a
// state (build and page); fieldMarks() draws the fire sectors.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { MODEL, casualties, isGap } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trNest, trWire, trFan, trChalk, trFireTeam, trPlace, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -260, y: -240, w: 540, d: 520 },
  O: [-5, -7],          // the enemy front line's centre (world)
  ANG: 235,             // direction of the attack (world degrees): straight up the card
  PITCH: 30,            // lane spacing across the front (v)
  SC: 2.4,              // ground units per bench millimetre past the wall face
  STANDOFF: 24,         // how far short of an enemy position a probing team is stopped by its fire (u)
  P_LD: -20,            // blade depth at rest (face - free tip): the teams wait on the line of departure
  U_LD: -70,            // line of departure, chalk on pegs (u)
  U_WIRE: -8,           // wire between the lanes, in front of the enemy line (u)
  DEPTH_HOLES: [[0, 22], [2, 20], [3, 26], [4, 9], [4, 24]], // [lane, set-back] of the enemy's positions in depth
  MG_LANE: 2,           // the lane whose enemy element is the machine-gun team
  CCP: [-88, 50],      // casualty collection point (u, v): the platoon sergeant
  E_SL: [56, 12],       // the enemy squad leader (u, v)
  VIEW: { u: -17, zoom: 1.45 }, // the card frames the ground round this point of the attack axis, zoomed
};
FG.TERRAIN = {
  rises: [
    { cx: 0, cy: 0, r: 30, steps: 3, h: 1.4, top: 0.45, seed: 61, wobble: 0.12 },
    { cx: 0, cy: 0, r: 26, steps: 3, h: 1.5, top: 0.4, seed: 67, wobble: 0.1 },
    { cx: 0, cy: 0, r: 22, steps: 2, h: 1.4, top: 0.5, seed: 71, wobble: 0.12 },
  ],
};
{
  // the rises sit toward the corners, away from the lanes; placed in the attack frame
  const F = fdFrame(FG.O[0], FG.O[1], FG.ANG);
  [[100, -168], [-150, 170], [-70, -185]].forEach(([u, v], i) => { const [x, y] = F(u, v); FG.TERRAIN.rises[i].cx = x; FG.TERRAIN.rises[i].cy = y; });
}

const FS_RAD = Math.PI / 180;
const fsClamp01 = (x) => Math.min(1, Math.max(0, x));
const FS_STRIDE = [1, 0, 2, 0];
const fsStride = (dist) => FS_STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const fsJit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; }; // uneven spacing
const FW_ = fdFrame(FG.O[0], FG.O[1], FG.ANG);          // (u, v) → world [x, y]
const FACE_F = FG.ANG, FACE_H = FG.ANG + 180;
export const fieldLaneV = (i) => (i - (MODEL.lanes - 1) / 2) * FG.PITCH;
// Bench depth past the face → ground u. A team's front is STANDOFF short of what its blade touches;
// an enemy element at set-back d sits in its forward position for d up to 2, deeper beyond.
export const fieldTeamU = (p) => -FG.STANDOFF + FG.SC * p;
export const fieldEnemyU = (d) => FG.SC * Math.max(0, d - 2);
// The follow-on element: on the team scale once level with the line of departure, closer behind it before.
export const fieldRamU = (p) => (p >= FG.P_LD ? fieldTeamU(p) : fieldTeamU(FG.P_LD) + (p - FG.P_LD) * 0.25);
// World point → (u, v), for the pointer.
export function fieldUV(x, y) {
  const c = Math.cos(FG.ANG * FS_RAD), s = Math.sin(FG.ANG * FS_RAD), dx = x - FG.O[0], dy = y - FG.O[1];
  return [dx * c + dy * s, -dx * s + dy * c];
}
// An eased point chasing its target at a walking pace (units per second).
export function fieldChase(pt, want, dt, rate = 14) {
  if (!pt) return want.slice();
  const dx = want[0] - pt[0], dy = want[1] - pt[1], d = Math.hypot(dx, dy), step = Math.min(d, rate * dt);
  return d < 1e-6 ? want.slice() : [pt[0] + (dx / d) * step, pt[1] + (dy / d) * step];
}

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const ring = (pts) => pts.map(([u, v]) => FW_(u, v));
  const avoidBase = (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  g(trGroundPlane(K, P, G.world));

  // meadows: behind the enemy line (where its depth positions sit) and toward the edges
  for (const [u, v, r, seed, sq] of [[30, 0, 70, 3, 0.45], [-150, -40, 44, 5, 0.6], [-40, 170, 40, 7, 0.7], [-50, -160, 40, 9, 0.7]]) g(trPatch(K, P, fdBlob(...FW_(u, v), r, seed, 0.15, 40, sq)));
  // the open ground the probe crosses: ploughed fields from the line of departure to the wire
  const fields = [
    [[[-66, -96], [-64, -54], [-16, -52], [-14, -98]], 7, "a"],
    [[[-64, -48], [-62, -4], [-14, -2], [-12, -46]], 8, "b"],
    [[[-62, 2], [-64, 48], [-16, 50], [-14, 4]], 8, "a"],
    [[[-64, 54], [-66, 98], [-18, 100], [-16, 56]], 7, "b"],
    [[[-160, -70], [-160, 20], [-118, 22], [-118, -68]], 6, "b"],
    [[[-160, 70], [-160, 130], [-120, 132], [-120, 72]], 6, "a"],
  ];
  for (const [r, n, tint] of fields) g(trField(K, P, ring(r), { furrows: n, tint }));
  // the stream on the left flank, the farm road behind the line of departure and a track to the CCP
  g(trStream(K, P, ring([[-260, -132], [-180, -140], [-110, -134], [-40, -146], [20, -138], [70, -150], [140, -144], [220, -156]]), 3.2, 5));
  g(trRoad(K, P, ring([[-112, -240], [-110, -150], [-106, -60], [-108, 30], [-105, 120], [-110, 220], [-112, 300]]), 3));

  // woods: behind the enemy (beyond its depth positions), on the right flank, copses toward the edges
  const woods = [
    [ring([[96, -120], [102, -40], [94, 40], [100, 120], [170, 130], [176, -130]]), 60, 21],
    [ring([[-40, 112], [30, 108], [80, 116], [84, 190], [-40, 196]]), 34, 22],
    [fdBlob(...FW_(-165, -118), 20, 33, 0.14, 40, 0.9), 9, 23],
    [fdBlob(...FW_(-170, 160), 22, 34, 0.12, 40, 1), 10, 24],
    [fdBlob(...FW_(40, -175), 26, 35, 0.12, 40, 0.8), 10, 25],
  ];
  for (const [r, n, seed] of woods) {
    const trees = trScatter(r, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: avoidBase });
    const w = trWood(K, P, T, r, trees);
    g(w.floor);
    items.push(...w.items);
  }
  // small copses in the enemy's depth on the boundaries between lanes, clear of every lane
  const inLane = (x, y) => { const [u, v] = fieldUV(x, y); return Math.abs(v - Math.round(v / G.PITCH) * G.PITCH) < 9 && Math.abs(v) < G.PITCH * 2.6 && u > -20; };
  [[-1.5, 30, 41], [-0.5, 22, 42], [0.5, 34, 43], [1.5, 26, 44]].forEach(([j, u, seed]) => {
    const r = fdBlob(...FW_(u, j * G.PITCH), 7, seed, 0.18, 24, 1);
    const w = trWood(K, P, T, r, trScatter(r, 4, { seed, gap: 4.6, r: [2.4, 3.6], h: [6.5, 10], avoid: (x, y) => inLane(x, y) || avoidBase(x, y) }));
    g(w.floor);
    items.push(...w.items);
  });

  // a hedgerow along the back of the enemy's depth, stone walls and houses of the farm by the road
  items.push(...trHedge(K, P, ring([[80, -100], [81, -40], [79, 20], [80, 96]]), { seed: 51 }));
  items.push(...trWall(K, P, ring([[-136, -112], [-136, -80]])), ...trWall(K, P, ring([[-168, -80], [-136, -80]])));
  { const [x, y] = FW_(-154, -96); items.push(trHouse(K, P, x, y, FG.ANG + 90, 13, 8.5)); }
  { const [x, y] = FW_(-128, -126); items.push(trHouse(K, P, x, y, FG.ANG, 10, 7.5)); }

  // the relief, drawn over the flat cover
  g(trRelief(K, P, T));

  // the enemy's forward positions, one per lane (the machine-gun nest in lane 3), its positions in
  // depth, and wire between the lanes in front of the line (it channels the lanes; it does not close them)
  for (let i = 0; i < MODEL.lanes; i++) {
    const [x, y] = FW_(0, fieldLaneV(i));
    items.push(...(i === G.MG_LANE ? trNest(K, P, x, y, T.height(x, y), FACE_H) : trHole(K, P, x, y, T.height(x, y), FACE_H)));
  }
  for (const [i, d] of G.DEPTH_HOLES) {
    const [x, y] = FW_(fieldEnemyU(d), fieldLaneV(i));
    items.push(...trHole(K, P, x, y, T.height(x, y), FACE_H));
  }
  for (let j = 0; j <= MODEL.lanes; j++) {
    const v = (j - MODEL.lanes / 2) * G.PITCH;
    items.push(...trWire(K, P, T, ring([[G.U_WIRE + 1, v - 5], [G.U_WIRE, v], [G.U_WIRE + 1, v + 5]]), { every: 5 }));
  }

  // control measures: the line of departure on pegs and the objective flag behind the enemy
  const ld = trChalk(K, P, T, ring([[G.U_LD, -96], [G.U_LD, -32], [G.U_LD, 32], [G.U_LD, 96]]));
  g(ld.ground); items.push(...ld.items);

  return { ground: ground.join(""), items };
}

// Where every soldier stands and who fires at whom, for a model state. M carries what the page
// measures between frames: vbar (the push bar's speed, bench units per second; negative = advancing),
// vd (each key's set-back speed), vr and vv (the follow-on element's speed forward and across, ground
// units per second) and med (the medic's eased position). Without M (the build's first frame)
// nobody is moving and the medic stands where he is wanted.
export function fieldPose(S, MODEL, T, M = {}) {
  const G = FG;
  const men = [];
  const add = (m) => { const [x, y] = FW_(m.u, m.v); m.x = x; m.y = y; m.z = T.height(x, y); men.push(m); };
  const p = S.p;
  const vbar = M.vbar || 0;
  const free = S.xb - MODEL.bladeOff;
  const litLane = p.phase === "rest" || p.phase === "probe" ? p.planned : p.ramLane;
  const order = MODEL.phases.map(([n]) => n);
  const at = order.indexOf(p.phase);
  const same = p.deep === p.planned;
  // the main effort is through its gap and turns its fire on the flanks of the positions beside it
  const inPhase = same ? "strike" : "lunge";
  const pen = (at > order.indexOf(inPhase) && at < order.indexOf("home")) || (p.phase === inPhase && p.u >= 0.6);

  // --- enemy: one element per lane (a rifle pair; the machine-gun team in lane 3), each at its key's set-back ---
  const ROLES = [["tl", "r"], ["ar", "gr"], ["mg", "ag"], ["ar", "r"], ["tl", "gr"]];
  const holeUs = (i) => [0, ...G.DEPTH_HOLES.filter(([l]) => l === i).map(([, d]) => fieldEnemyU(d))];
  const enemy = [];
  for (let i = 0; i < MODEL.lanes; i++) {
    const d = S.depths[i], u = fieldEnemyU(d), vd = (M.vd && M.vd[i]) || 0;
    const moving = Math.abs(vd) > 0.3;
    const inHole = !moving && holeUs(i).some((h) => Math.abs(h - u) < 1.2);
    const pose = moving ? "stand" : inHole ? "hole" : "prone";
    const face = moving && vd > 0 ? FACE_F : FACE_H;
    enemy.push({ lane: i, u, front: d < MODEL.gapMin, moving });
    ROLES[i].forEach((role, j) => add({ id: `e${i}-${j}`, side: "h", role, pose, face, stride: moving ? fsStride(u + j * 1.7 + i) : 0,
      u: u + (pose === "prone" ? 1.6 : 0) - (moving ? j * 2.2 : 0), v: fieldLaneV(i) + (j ? -1.1 : 1.1), lane: i }));
  }
  add({ id: "e-sl", side: "h", role: "sl", pose: "kneel", face: FACE_H, u: G.E_SL[0], v: G.E_SL[1] });

  // --- the probe: five fire teams in wedges, one per lane, each riding its blade ---
  const wedge = trPlace(trFireTeam("wedge"), { x: 0, y: 0, face: 0 });
  const teams = [];
  for (let i = 0; i < MODEL.lanes; i++) {
    const tip = S.tips[i], key = MODEL.face - S.depths[i];
    const pd = MODEL.face - tip, u = fieldTeamU(pd);
    const contact = tip - key < 0.3 && S.depths[i] <= MODEL.reach + 0.3;
    const moving = Math.abs(tip - free) < 0.3 && Math.abs(vbar) > 0.5;
    const back = vbar > 0;
    const pose = moving ? "stand" : contact ? "prone" : "kneel";
    teams.push({ lane: i, u, contact, moving });
    wedge.forEach((m, k) => add({ id: `t${i}-${k}`, side: "f", lit: i === litLane, role: m.role, team: i, pose, du: m.x,
      stride: moving ? fsStride(u + k * 1.3 + i) : 0, face: moving && back ? FACE_H : FACE_F,
      u: u + m.x + (pose === "stand" ? 1.6 * fsJit(k, i) : 0), v: fieldLaneV(i) - 2.1 + m.y + 0.9 * fsJit(i, k) }));
  }

  // --- the follow-on element (the ram): a fire team in wedge, its squad leader, the platoon leader
  // and his radio operator, behind the main effort's lane ---
  const lanePos = (MODEL.lanes - 1) / 2 - S.ramY / MODEL.pitch;
  const pr = MODEL.face - S.ramTip, ur = fieldRamU(pr), vr = fieldLaneV(lanePos);
  const rLane = Math.round(lanePos);
  const rContact = Math.abs(lanePos - rLane) < 0.02 && S.ramTip - (MODEL.face - S.depths[rLane]) < 0.3 && pr > -1;
  const rvU = M.vr || 0, rvV = M.vv || 0;
  const rMoving = Math.abs(rvU) > 0.8 || Math.abs(rvV) > 0.8;
  const rFace = !rMoving ? FACE_F : Math.abs(rvV) > Math.abs(rvU) ? FACE_F + (rvV > 0 ? 90 : -90) : rvU < 0 ? FACE_H : FACE_F;
  const rPose = rMoving ? "stand" : rContact ? "prone" : "kneel";
  const follow = [...trPlace(trFireTeam("file"), { x: 0, y: 0, face: 0 }).map((m) => ({ role: m.role, du: m.x, dv: 8 })), { role: "sl", du: -15.5, dv: 8.5 }, { role: "pl", du: -18.5, dv: 9.5 }, { role: "rto", du: -20.5, dv: 7.5 }];
  follow.forEach((m, k) => add({ id: `f-${k}`, side: "f", lit: true, role: m.role, team: "f", pose: rPose, du: m.du,
    stride: rMoving ? fsStride(ur + vr + k * 1.3) : 0, face: rFace, u: ur + m.du, v: vr + m.dv + 0.8 * fsJit(k, 9) }));
  add({ id: "f-psg", side: "f", role: "r", pose: "kneel", face: FACE_F, u: G.CCP[0], v: G.CCP[1] });

  // --- casualties: the model's counts, greyed and still. Blue: one rifleman per two teams stopped on
  // a key, then two of the follow-on element if it struck a surface; red: by the positions in contact,
  // then one beside the main effort's gap ---
  const loss = casualties(p, MODEL);
  const byId = new Map(men.map((m) => [m.id, m]));
  const contactLanes = teams.filter((t) => S.depths[t.lane] <= MODEL.reach).map((t) => t.lane);
  const probeLoss = Math.ceil(contactLanes.length / 2), probeRed = Math.floor(contactLanes.length / 2);
  const blueIds = [];
  for (let k = 0; k < contactLanes.length && blueIds.length < probeLoss; k += 2) blueIds.push(`t${contactLanes[k]}-3`);
  for (let k = 1; k < contactLanes.length && blueIds.length < probeLoss; k += 2) blueIds.push(`t${contactLanes[k]}-2`);
  blueIds.push("f-3", "f-2");
  const redIds = [];
  for (let k = 1; k < contactLanes.length && redIds.length < probeRed; k += 2) redIds.push(`e${contactLanes[k]}-1`);
  for (let k = 0; k < contactLanes.length && redIds.length < probeRed; k += 2) redIds.push(`e${contactLanes[k]}-1`);
  const beside = [p.deep - 1, p.deep + 1].filter((i) => i >= 0 && i < MODEL.lanes && isGap(S.depths[i], MODEL) === false);
  redIds.push(...beside.map((i) => `e${i}-0`), ...[0, 1, 2, 3, 4].map((i) => `e${i}-0`));
  // a blue casualty lies where his element was stopped; from the withdrawal on he is carried back to
  // the collection point (evac 0..1 over the "home" and "shuffle" phases)
  const downed = [];
  const sm01 = (x) => { const t = fsClamp01(x); return t * t * (3 - 2 * t); };
  const evac = p.phase === "home" ? 0.55 * sm01(p.u) : p.phase === "shuffle" ? 0.55 + 0.45 * sm01(p.u) : 0;
  const D = p.depths || S.depths;
  const struck = D[p.planned] < MODEL.gapMin ? D[p.planned] : Math.min(D[p.planned], MODEL.ramReach);
  blueIds.slice(0, loss.blue).forEach((id, k) => {
    const m = byId.get(id);
    if (!m) return;
    m.side = "fc"; m.lit = false; m.pose = "prone"; m.stride = 0; m.face = FACE_F + (k % 2 ? 75 : -75) + 15 * fsJit(k, 3); // lying across the view, so he reads as down
    const u0 = m.team === "f" ? fieldRamU(struck) + m.du * 0.4 - 2 : fieldTeamU(Math.min(D[m.team], MODEL.reach)) + m.du;
    const v0 = m.team === "f" ? fieldLaneV(p.planned) + 8 + 1.5 * fsJit(k, 7) : m.v;
    const slot = [G.CCP[0] + 4 + (k % 2) * 3.2, G.CCP[1] - 7 - k * 3];
    m.u = u0 + (slot[0] - u0) * evac; m.v = v0 + (slot[1] - v0) * evac;
    const [x, y] = FW_(m.u, m.v); m.x = x; m.y = y; m.z = T.height(x, y);
    downed.push(m);
  });
  [...new Set(redIds)].slice(0, loss.red).forEach((id, k) => {
    const m = byId.get(id);
    if (!m) return;
    m.side = "hc"; m.pose = "prone"; m.stride = 0; m.face = FACE_H + (k % 2 ? 70 : -70) + 15 * fsJit(k, 5); m.u += 2.5;
    const [x, y] = FW_(m.u, m.v); m.x = x; m.y = y; m.z = T.height(x, y);
  });
  // the platoon medic goes to the first man down, else waits at the collection point
  const medWant = downed.length ? [downed[0].u - 2.2, downed[0].v - 2.4] : [G.CCP[0] + 1, G.CCP[1] - 4];
  const med = M.med || medWant;
  const medGo = Math.hypot(med[0] - medWant[0], med[1] - medWant[1]) > 0.4;
  const medFace = medGo ? Math.atan2(...(() => { const a = FW_(...med), b = FW_(...medWant); return [b[1] - a[1], b[0] - a[0]]; })()) / FS_RAD : FACE_F;
  add({ id: "f-med", side: "f", role: "r", pose: medGo ? "stand" : "kneel", stride: medGo ? fsStride(med[0] + med[1]) : 0, face: medFace, u: med[0], v: med[1] });

  // --- fire ---
  const live = new Map(men.map((m) => [m.id, m]));
  const aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z);
  const streams = [];
  const shooterOf = (ids) => ids.map((id) => live.get(id)).find((m) => m && (m.side === "f" || m.side === "h") && m.pose !== "stand");
  // enemy: each element fires on the blue troops stopped in its own lane; once the main effort is
  // through, the elements beside its gap fire on it too. Gap teams slipping in draw no fire.
  enemy.forEach((e, i) => {
    if (e.moving) return;
    const shooter = shooterOf([`e${i}-0`, `e${i}-1`]);
    if (!shooter) return;
    const to = men.filter((m) => m.side === "f" && m.pose !== "stand" && m.u > -60 &&
      ((m.team === i && teams[i].contact) || (m.team === "f" && rContact && rLane === i) || (pen && Math.abs(i - p.deep) === 1 && (m.team === p.deep || m.team === "f") && m.u > -6))).map(aim);
    const mg = i === G.MG_LANE;
    streams.push({ id: shooter.id, side: "h", heavy: mg, from: muzzle(shooter), to, period: mg ? 1.5 : 1.7 + i * 0.13, burst: mg ? 3 : 2, gap: 0.12, flight: 0.42, phase: i * 0.61, on: mg ? 0.95 : 0.85, scatter: 3 });
  });
  const enemyIn = (i) => men.filter((m) => m.side === "h" && m.lane === i).map(aim);
  // probing teams in contact: the automatic rifleman and team leader return fire on their lane's element
  teams.forEach((t) => {
    if (!t.contact || t.moving) return;
    [`t${t.lane}-1`, `t${t.lane}-0`].forEach((id, k) => {
      const m = live.get(id);
      if (!m || m.side !== "f") return;
      streams.push({ id, side: "f", heavy: m.role === "ar", from: muzzle(m), to: enemyIn(t.lane), period: m.role === "ar" ? 1.4 : 2.0, burst: m.role === "ar" ? 3 : 1, gap: 0.1, flight: 0.4, phase: t.lane * 0.9 + k * 0.53, on: 0.85, scatter: 2 });
    });
  });
  // the main effort: in contact it fires on the lane ahead; through the gap, on the flanks beside it
  const meTargets = pen ? beside.flatMap((i) => enemyIn(i)) : rContact ? enemyIn(rLane) : [];
  if (meTargets.length) {
    const shooters = pen ? [`t${p.deep}-1`, `t${p.deep}-0`, "f-1", "f-0"] : ["f-1", "f-0"];
    shooters.forEach((id, k) => {
      const m = live.get(id);
      if (!m || m.side !== "f" || m.pose === "stand") return;
      streams.push({ id, side: "f", heavy: m.role === "ar", smoke: m.role === "ar", from: muzzle(m), to: meTargets, period: m.role === "ar" ? 1.8 : 2.6, burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.4, phase: 0.4 + k * 0.47, on: 0.85, scatter: 2 });
    });
  }
  return { men, streams, loss, enemy, pen, medWant };
}

// Per-state ground marks: the enemy machine gun's sector (red), wherever its team is in position.
export function fieldMarks(K, P, T, pose) {
  const mg = pose.men.find((m) => m.id === `e${FG.MG_LANE}-0`);
  if (!mg || mg.side !== "h" || mg.pose === "stand") return "";
  return trFan(K, P, T, mg.x, mg.y, 6, 66, FACE_H - 28, FACE_H + 28, { side: "h", arcs: 2, alpha: 0.8 });
}
