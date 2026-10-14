// The Battlefield view of Fire Control and Distribution, at platoon scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same engagement state s (model.mjs) as the machine drives it:
//   s.mode   "U" uncontrolled or "C" controlled; s.stage the fire-control steps done (0..4)
//   s.team[k].tgt  which enemy element each fire team is firing at (-1 none)
//   s.down[i]  when enemy element i went out of action (null while it still fires)
//   s.t        battle seconds; the enemy closes from FG.R0 to FG.R1 in model.tEnd seconds
// A defending rifle platoon (six fire teams in two-man fighting positions on the rise) meets an attack by
// five enemy elements; the middle one has the machine gun. fieldStatic() builds the ground (build only);
// fieldPose() places every soldier and fire stream for a state (build and page); fieldMarks() draws the
// per-state ground marks (TRPs, engagement area, sectors of fire).
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdPolar, fdSweep, fdBlob, fdFrame } from "../../kit/field.mjs";
import { MODEL, C_START, N_T, bluesDown } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trWire, trFan, trChalk, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -240, y: -220, w: 500, d: 480 },
  RISE: { cx: 0, cy: 0, r: 48, steps: 6, h: 1.6, top: 0.54, seed: 5, wobble: 0.07, lean: [-0.3, -0.25] },
  FACE: 58,                               // the position's front, degrees (toward the open ground)
  R_FRONT: 21,                            // radius of the fighting positions
  TEAM_A: [-70, -42, -14, 14, 42, 70],    // each fire team's centre, degrees off the front
  HOLE_DA: 6.5,                           // the team's two holes sit this far either side of its centre
  R0: 126, R1: 47,                        // the enemy line's range from the position, start and at the wire
  LANE: 20,                               // spacing between enemy elements across the front
  R_TRP: 92,                              // range of the TRPs, one per enemy lane
  SECT: 11,                               // half-width of a team's sector, degrees
  CCP: [[-58, 4], [-62, 10], [-56, 11], [-64, 3], [-59, 17], [-66, 12]],
  MEDIC: [-57, 8],
  DOWN_F: ["f2-ar", "f3-gr", "f1-tl", "f4-r", "f0-ar", "f5-gr", "f2-tl", "f3-r"],
};
FG.TERRAIN = {
  rises: [
    FG.RISE,
    { cx: 92, cy: -42, r: 24, steps: 2, h: 1.3, top: 0.45, seed: 21, wobble: 0.1 },
    { cx: -140, cy: -40, r: 34, steps: 4, h: 1.5, top: 0.45, seed: 47, wobble: 0.1 },
    { cx: 30, cy: -150, r: 28, steps: 3, h: 1.6, top: 0.5, seed: 41, wobble: 0.12 },
  ],
};

const FS_RAD = Math.PI / 180;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
export const fieldTerrain = () => trTerrain(FG.TERRAIN);
const angTo = (x0, y0, x1, y1) => Math.atan2(y1 - y0, x1 - x0) / FS_RAD;

// The six teams' fighting positions: { team, id, x, y, face, roles }
export function fieldHoles() {
  const G = FG, out = [];
  G.TEAM_A.forEach((a, k) => {
    [[-1, ["tl", "ar"]], [1, ["gr", "r"]]].forEach(([sgn, roles], h) => {
      const b = G.FACE + a + sgn * G.HOLE_DA, [x, y] = fdPolar(0, 0, G.R_FRONT, b);
      out.push({ team: k, h, x, y, face: b, roles });
    });
  });
  return out;
}
// TRP j: the point on the open ground in enemy lane j
export const trpAt = (j) => fdFrame(0, 0, FG.FACE)(FG.R_TRP, (j - (N_T - 1) / 2) * FG.LANE);
const teamCentre = (k) => fdPolar(0, 0, FG.R_FRONT, FG.FACE + FG.TEAM_A[k]);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[60, 150, 46, 3, 0.6], [190, -80, 40, 5, 0.8], [-60, -150, 46, 7, 0.5], [-150, 70, 40, 9, 0.6]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[176, 116], [232, 128], [226, 188], [168, 170]], 9, "a"],
    [[[62, -64], [118, -60], [114, -106], [56, -112]], 8, "b"],
    [[[-150, 66], [-84, 74], [-92, 112], [-160, 104]], 7, "a"],
    [[[-214, 10], [-150, 20], [-148, 62], [-212, 56]], 8, "b"],
    [[[-128, -94], [-70, -100], [-62, -136], [-122, -132]], 8, "a"],
    [[[70, -150], [130, -146], [128, -186], [66, -190]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  g(trStream(K, P, [[-280, -96], [-180, -110], [-90, -122], [0, -112], [80, -124], [150, -104], [220, -126], [300, -150]], 3.2, 5));
  g(trRoad(K, P, [[300, 120], [220, 70], [160, 46], [138, 20], [140, -40], [130, -90], [126, -128], [130, -200], [136, -280]], 3.2));

  const woods = [
    [fdBlob(-60, 160, 42, 31, 0.14, 40, 0.9), 40, 21],
    [fdBlob(-110, 60, 30, 37, 0.14, 40, 0.8), 18, 27],
    [fdBlob(-118, -170, 44, 32, 0.12, 40, 0.7), 24, 22],
    [fdBlob(170, -40, 26, 33, 0.14, 40, 0.9), 12, 23],
    [fdBlob(-200, 150, 30, 34, 0.12, 40, 1), 14, 24],
    [fdBlob(-10, -190, 22, 36, 0.12, 40, 0.8), 10, 26],
    [fdBlob(-70, -92, 20, 38, 0.14, 40, 0.8), 9, 28],
    [fdBlob(150, 210, 26, 35, 0.12, 40, 0.8), 10, 25],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[168, 170], [176, 116], [232, 128]], 51], [[[-84, 74], [-150, 66], [-160, 104]], 52], [[[56, -64], [118, -60]], 53]]) items.push(...trHedge(K, P, pts, { seed }));
  for (const pts of [[[120, 54], [146, 54], [146, 30]], [[120, 54], [120, 46]]]) items.push(...trWall(K, P, pts));
  items.push(trHouse(K, P, 132, 44, 90, 12, 8), trHouse(K, P, 156, 30, 0, 14, 8.5, 4.6, 8.2), trHouse(K, P, -150, 30, 20, 10, 7.5));
  g(trRelief(K, P, T));

  // the platoon's fighting positions, two to a team, and a belt of wire on the front slope
  for (const h of fieldHoles()) items.push(...trHole(K, P, h.x, h.y, T.height(h.x, h.y), h.face));
  const wire = fdSweep(G.FACE - 85, G.FACE + 85, 9).map((a) => fdPolar(0, 0, 37 + 1.5 * Math.cos(a * FS_RAD * 3), a));
  items.push(...trWire(K, P, T, wire));
  return { ground: ground.join(""), items };
}

// Where every soldier stands and who fires at whom.
export function fieldPose(s, T) {
  const G = FG, men = [];
  const add = (m) => { m.z = T.height(m.x, m.y) + (m.dz || 0); men.push(m); };
  const F = fdFrame(0, 0, G.FACE);
  const battle = s.phase === "battle" || s.phase === "done";
  const oriented = s.mode === "C" && s.stage >= 3;

  // --- the defending platoon: six fire teams in two-man positions, PL and RTO behind ---
  const aimOf = (k) => { const T0 = s.team[k].tgt; return battle && T0 >= 0 ? T0 : -1; };
  const enemy = (j) => {
    const te = s.down[j] === null ? s.t : s.down[j];
    const R = G.R0 - (G.R0 - G.R1) * Math.min(1, te / MODEL.tEnd);
    return { R, v: (j - (N_T - 1) / 2) * G.LANE, dist: G.R0 - R };
  };
  for (const h of fieldHoles()) {
    const k = h.team, Fh = fdFrame(h.x, h.y, h.face);
    const j = aimOf(k);
    let face = h.face;
    if (j >= 0) { const e = enemy(j), [ex, ey] = F(e.R, e.v); face = angTo(h.x, h.y, ex, ey); }
    else if (oriented) { const [tx, ty] = trpAt(C_START[k]); face = angTo(h.x, h.y, tx, ty); }
    else face = h.face + 22 * Math.sin(k * 2.3 + h.h * 1.7);
    h.roles.forEach((role, n) => {
      const [x, y] = Fh(0, n === 0 ? 1.1 : -1.1);
      add({ id: `f${k}-${role}`, side: "f", role, pose: "hole", face, x, y, team: k });
    });
  }
  { const [x, y] = fdPolar(0, 0, 4, G.FACE + 180); add({ id: "f-pl", side: "f", role: "pl", pose: "kneel", face: G.FACE, x, y });
    const [x2, y2] = fdPolar(0, 0, 5, G.FACE + 150); add({ id: "f-rto", side: "f", role: "rto", pose: "kneel", face: G.FACE, x: x2, y: y2 }); }

  // --- the enemy attack: five elements of three, line abreast; the middle one has the machine gun ---
  const E = [];
  for (let j = 0; j < N_T; j++) {
    const e = enemy(j), down = s.down[j] !== null;
    const roles = j === MODEL.threat ? ["mg", "ag", "r"] : ["tl", "ar", "r"];
    const offs = [[0, 0], [3.6, -3.2], [3.6, 3.2]];
    const moving = !down && battle && s.phase === "battle";
    roles.forEach((role, n) => {
      const [x, y] = F(e.R + offs[n][0], e.v + offs[n][1]);
      const m = { id: `e${j}-${n}`, side: down ? "hc" : "h", lit: j === MODEL.threat && !down, role: down ? "r" : role, pose: down ? "prone" : (role === "mg" && !moving ? "kneel" : "stand"),
        stride: moving ? strideAt(e.dist + n * 1.3) : 0, face: down ? G.FACE + 20 + 40 * n : G.FACE + 180, x, y };
      add(m);
      E.push({ j, m, role });
    });
  }

  // --- friendly men down (notional), greyed behind the position with a medic ---
  const nF = bluesDown(s);
  const gone = new Set(G.DOWN_F.slice(0, nF));
  for (let i = men.length - 1; i >= 0; i--) if (gone.has(men[i].id)) men.splice(i, 1);
  G.CCP.slice(0, nF).forEach(([x, y], k) => add({ id: `c-f${k}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 40 + 30 * ((k * 7) % 3 - 1), x, y }));
  add({ id: "c-med", side: "f", role: "r", pose: "kneel", stride: 0, face: 230, x: G.MEDIC[0], y: G.MEDIC[1] });

  // --- small-arms fire ---
  const byId = Object.fromEntries(men.map((m) => [m.id, m]));
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z), aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const streams = [];
  if (battle) {
    const live = s.phase === "battle" ? 1 : 0;
    for (let k = 0; k < MODEL.teams; k++) {
      const j = s.team[k].tgt;
      if (j < 0 || !live) continue;
      const tg = E.filter((e) => e.j === j).map((e) => aim(e.m));
      for (const role of ["ar", "tl"]) {
        const m = byId[`f${k}-${role}`];
        if (m) streams.push({ id: m.id, side: "f", heavy: role === "ar", from: muzzle(m), to: tg, period: role === "ar" ? 1.5 : 2.3, burst: role === "ar" ? 3 : 1, gap: 0.08, flight: 0.4, phase: k * 0.37 + (role === "tl" ? 0.5 : 0), on: 1, scatter: 2.4 });
      }
    }
    const platoon = men.filter((m) => m.side === "f" && m.pose === "hole").map(aim);
    for (let j = 0; j < N_T; j++) {
      if (s.down[j] !== null || !live) continue;
      const lead = E.find((e) => e.j === j && (e.role === "mg" || e.role === "tl"));
      streams.push({ id: `e${j}`, side: "h", heavy: j === MODEL.threat, from: muzzle(lead.m), to: platoon, period: j === MODEL.threat ? 1.8 : 2.9, burst: j === MODEL.threat ? 3 : 1, gap: 0.1, flight: 0.45, phase: j * 0.41, on: 0.9, scatter: 4 });
    }
  }
  return { men, streams };
}

// Per-state ground marks of the fire plan: TRPs (step 1), the engagement area and each team's sector (step 2).
// Uncontrolled has no plan, so nothing is drawn.
export function fieldMarks(K, P, T, s) {
  if (s.mode !== "C" || s.stage < 1) return "";
  const G = FG, F = fdFrame(0, 0, G.FACE);
  let out = "";
  // TRPs: a bullseye on the ground at each lane
  for (let j = 0; j < N_T; j++) {
    const [x, y] = trpAt(j);
    const pts = (r) => fdSweep(0, 360, 20).map((a) => fdPolar(x, y, r, a));
    const d = [r1(K, P, T, pts(3.4)), r1(K, P, T, pts(1.5))].join("");
    out += K.lineSvg(d, { tone: j === MODEL.threat ? "mid" : "lo", className: "tr-chalk" });
  }
  if (s.stage >= 2) {
    // the engagement area where the platoon masses its fires
    const a = (N_T - 1) / 2 * G.LANE + 14;
    const ea = trChalk(K, P, T, [F(G.R_TRP - 26, -a), F(G.R_TRP + 26, -a), F(G.R_TRP + 26, a), F(G.R_TRP - 26, a)], { closed: true, pegs: false });
    out += ea.ground;
    // each team's sector of fire, centred on its TRP
    for (let k = 0; k < MODEL.teams; k++) {
      const [cx, cy] = teamCentre(k), [tx, ty] = trpAt(C_START[k]), b = angTo(cx, cy, tx, ty);
      out += trFan(K, P, T, cx, cy, 9, G.R_TRP + 14, b - G.SECT, b + G.SECT, { side: "f", arcs: 1, alpha: 0.5 });
    }
  }
  return out;
}
// a closed ring of ground points as a 3D-draped path
function r1(K, P, T, ring) {
  return K.pathOf(ring.map(([x, y]) => K.iso([x, y, T.height(x, y) + 0.12], P)), true);
}
