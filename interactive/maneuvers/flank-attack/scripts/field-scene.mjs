// The Battlefield view of Fix and Flank, at platoon scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same model state S as the machine drives it:
//   S.theta  bearing of the assault element round the enemy (0 = the enemy's front, toward the SBF)
//   S.psi    the enemy's facing (0 while fixed; it turns toward the assault when released)
//   S.cx     the machine's fixing carriage: at GEO.CX_HOME the support-by-fire element fixes the
//            enemy with fire; as the carriage pulls back to GEO.CX_OUT the fire lifts and the SBF holds.
//   S.f      the share of the enemy's fire that bears on the assault (the machine's gauge)
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every soldier and fire stream for a state (build and page); fieldMarks() draws the fire sectors.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdPolar, fdSweep, fdBlob, fdSpline, fdFrame } from "../../kit/field.mjs";
import { bearing, offFront, losses } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trNest, trWire, trFan, trChalk, trObjective, trSquad, trMorph, trPlace, trBound, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -240, y: -220, w: 500, d: 480 },
  RISE: { cx: 0, cy: 0, r: 48, steps: 6, h: 1.6, top: 0.54, seed: 5, wobble: 0.07, lean: [0.3, -0.25] },
  R_E: 18,          // enemy fighting positions: radius on the summit
  GRID: 24,           // degrees between fighting positions round the summit
  HOLES: [-48, 216],  // first and last hole bearing
  ROUTE_R: 90,        // the assault element's track radius through the wood
  ASSAULT: [138, 160, 47], // bearings where the assault turns in, and the radius it closes to
  GAP: 30,            // trailing squad's distance behind the lead squad on the track (units)
  BOUND: 26,          // bound length in bounding overwatch (units)
  SBF_X: 106,         // support-by-fire line (kneeling riflemen) x
  WALL_X: 102.4,      // the stone wall in front of it
  PL: 70,             // phase line bearing
  AP: [150, 80],      // assault position: bearing, radius
  // casualties (counts from model.mjs losses()): which assault soldiers go down, in order; the
  // casualty collection point behind the SBF where they lie and a medic kneels; and where the
  // enemy's men down lie, by the summit's inner ring, nearest the SBF's fire first
  DOWN_F: ["a1-3", "a2-6", "a1-7", "a2-2", "a1-5", "a2-8", "a1-1"],
  DOWN_H: ["e-00", "e-21", "e-11", "e-30", "e-ag"],
  CCP: [[106, 50], [111, 53], [116, 50], [121, 53], [109, 58], [114, 61], [119, 58]],
  MEDIC: [103, 55],
  DOWN_AT: [[12, -14], [12, 14], [12, -40], [12, 40], [12, 66]],
};
FG.TERRAIN = {
  rises: [
    FG.RISE,
    { cx: 120, cy: 4, r: 28, steps: 2, h: 1.1, top: 0.6, seed: 21, wobble: 0.1, squash: 1.3 },
    { cx: -128, cy: 128, r: 36, steps: 4, h: 1.6, top: 0.4, seed: 31, wobble: 0.12 },
    { cx: 36, cy: -84, r: 26, steps: 2, h: 2, top: 0.5, seed: 41, wobble: 0.12 },
    { cx: -160, cy: -40, r: 30, steps: 4, h: 1.5, top: 0.45, seed: 47, wobble: 0.1 },
  ],
};

const FS_RAD = Math.PI / 180;
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const holeBearings = () => { const out = []; for (let b = FG.HOLES[0]; b <= FG.HOLES[1]; b += FG.GRID) out.push(b); return out; };
// The enemy shifts between fighting positions: its grid bearing ps chases the nearest grid step to
// its facing at a running pace (degrees per second), so it rests in a hole whatever the facing.
export function fieldShift(ps, psi, dt, rate = 34) {
  const want = Math.round(psi / FG.GRID) * FG.GRID;
  if (ps === undefined) return want;
  const d = want - ps;
  return ps + Math.sign(d) * Math.min(Math.abs(d), rate * dt);
}
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadows and fields, away from the action
  for (const [cx, cy, r, seed, sq] of [[-60, 150, 50, 3, 0.6], [190, -70, 40, 5, 0.8], [-40, -150, 46, 7, 0.5], [60, 160, 40, 9, 0.5]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[176, 96], [232, 108], [226, 168], [168, 150]], 9, "a"],
    [[[178, 160], [224, 176], [214, 226], [164, 206]], 7, "b"],
    [[[60, -58], [126, -52], [122, -102], [58, -110]], 8, "b"],
    [[[-150, 66], [-84, 74], [-92, 118], [-160, 104]], 7, "a"],
    [[[-214, 10], [-150, 20], [-148, 72], [-212, 66]], 8, "b"],
    [[[-30, 170], [40, 176], [32, 226], [-40, 220]], 9, "b"],
    [[[-128, -54], [-70, -64], [-62, -104], [-122, -98]], 8, "a"],
    [[[-50, -150], [24, -150], [26, -194], [-48, -198]], 9, "b"],
    [[[70, -150], [130, -146], [128, -186], [66, -190]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // the stream behind the rise, the farm road crossing it, the woodland track
  g(trStream(K, P, [[-280, -96], [-180, -118], [-90, -134], [0, -128], [80, -136], [150, -118], [220, -138], [300, -160]], 3.2, 5));
  g(trRoad(K, P, [[300, 250], [214, 190], [166, 118], [150, 60], [146, -10], [148, -80], [151, -122], [160, -200], [170, -280]], 3.2));
  const trackPts = [];
  for (let a = 8; a <= 168; a += 8) trackPts.push(fdPolar(0, 0, G.ROUTE_R + 4 * Math.sin(a * 0.07), a));
  g(trRoad(K, P, [[146, 30], ...trackPts], 2.1, { ruts: false }));

  // woods: the big wood the assault moves through, and copses toward the edges
  const ctrl = [];
  for (let a = 34; a <= 162; a += 8) ctrl.push(fdPolar(0, 0, 128 + 8 * Math.sin(a * 0.11), a));
  for (let a = 162; a >= 34; a -= 8) ctrl.push(fdPolar(0, 0, 60 + 3 * Math.sin(a * 0.2), a));
  const woodRing = fdSpline(ctrl, 3, true);
  const corridor = (x, y) => {
    const r = Math.hypot(x, y), b = Math.atan2(y, x) / FS_RAD;
    if (Math.abs(r - G.ROUTE_R) < 15) return true;                 // the track
    if (b > G.ASSAULT[0] - 12 && r < G.ROUTE_R + 14) return true;   // where the assault turns in
    if (Math.abs(b - G.PL) * r * FS_RAD < 4) return true;          // the phase line
    return false;
  };
  const woods = [
    [woodRing, 150, 21, corridor, [2.6, 4.2], [7, 11.5]],
    [fdBlob(-118, -170, 44, 32, 0.12, 40, 0.7), 26, 22],
    [fdBlob(186, -36, 24, 33, 0.14, 40, 0.9), 12, 23],
    [fdBlob(-196, 150, 30, 34, 0.12, 40, 1), 14, 24],
    [fdBlob(96, 214, 26, 35, 0.12, 40, 0.8), 10, 25],
    [fdBlob(-10, -178, 22, 36, 0.12, 40, 0.8), 10, 26],
    [fdBlob(-90, -128, 16, 37, 0.12, 40, 0.8), 6, 27],
  ];
  for (const [ring, n, seed, avoid, r, h] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: r || [2.8, 4.4], h: h || [8, 12.5], avoid: (x, y) => (avoid ? avoid(x, y) : false) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    // the wood's outer edge, nearest the viewer, keeps smaller trees so the track stays in view
    if (ring === woodRing) for (const t of trees) if (Math.hypot(t.x, t.y) > G.ROUTE_R) { t.r *= 0.82; t.h *= 0.72; }
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // hedgerows along the fields, stone walls round the farmyard and in front of the SBF line
  for (const [pts, seed] of [
    [[[168, 150], [176, 96], [232, 108]], 51], [[[-84, 74], [-150, 66], [-160, 104]], 52], [[[58, -58], [126, -52]], 53],
    [[[-212, 66], [-150, 20]], 54], [[[-30, 170], [40, 176]], 55],
  ]) items.push(...trHedge(K, P, pts, { seed }));
  for (const pts of [[[G.WALL_X, -36], [G.WALL_X, -13]], [[G.WALL_X, -5], [G.WALL_X, 5]], [[G.WALL_X, 13], [G.WALL_X, 36]], [[160, 28], [160, 84], [196, 84]], [[196, 28], [160, 28]]]) items.push(...trWall(K, P, pts));
  items.push(trHouse(K, P, 178, 66, 90, 13, 8.5), trHouse(K, P, 186, 40, 0, 15, 9, 4.8, 8.6), trHouse(K, P, -150, 40, 20, 10, 7.5));

  // the relief, drawn over the flat cover
  g(trRelief(K, P, T));

  // the enemy position: fighting positions round the summit, the MG nest, wire on the front slope
  for (const b of holeBearings()) {
    const [x, y] = fdPolar(0, 0, G.R_E, b);
    items.push(...(b === 0 ? trNest(K, P, x, y, T.height(x, y), b) : trHole(K, P, x, y, T.height(x, y), b)));
  }
  const wire = fdSweep(-62, 52, 9).map((a) => fdPolar(0, 0, 35 + 1.5 * Math.cos(a * FS_RAD * 3), a));
  items.push(...trWire(K, P, T, wire));

  // control measures: phase line, assault position, SBF position, objective flag
  const pl = trChalk(K, P, T, [66, 74, 108, 116].map((r) => fdPolar(0, 0, r, G.PL)));
  const [ab, ar] = G.AP;
  const ap = trChalk(K, P, T, [[ar - 8, ab - 5], [ar + 8, ab - 5], [ar + 8, ab + 5], [ar - 8, ab + 5]].map(([r, b]) => fdPolar(0, 0, r, b)), { closed: true });
  const sbf = trChalk(K, P, T, [[G.WALL_X + 2.4, -40], [124, -40], [124, 40], [G.WALL_X + 2.4, 40]], { closed: true });
  for (const m of [pl, ap, sbf]) { g(m.ground); items.push(...m.items); }
  items.push(trObjective(K, P, T, -3, -3, { h: 12, ang: 210 }));

  return { ground: ground.join(""), items };
}

// Where every soldier stands and who fires at whom, for a model state. M carries what the page
// measures between frames: vt, the assault's speed in degrees per second, and ps, the enemy's
// position-grid bearing eased in time toward its facing (fieldShift). Without M.ps (the build's
// first frame) the enemy sits on the grid step nearest its facing.
export function fieldPose(S, GEO, T, M = { vt: 0 }) {
  const G = FG;
  const men = [];
  const add = (m) => { m.z = T.height(m.x, m.y); men.push(m); };
  const hold = smooth01(GEO.CX_HOME + 8, GEO.CX_HOME + 0.5, S.cx);   // 1 while the SBF fixes with fire
  const out = 0;                                                       // the SBF holds its position when the fix is released (owner's choice)

  // --- enemy: a rifle squad and an MG team in fighting positions, shifting with the enemy's facing ---
  const ps = M.ps ?? Math.round(S.psi / G.GRID) * G.GRID;
  const settled = Math.abs(ps - Math.round(ps / G.GRID) * G.GRID) < 1.2;
  const dir = Math.sign(Math.round(S.psi / G.GRID) * G.GRID - ps) || 1;
  const run = (b, off) => ({ pose: settled ? "hole" : "stand", face: settled ? b : b + 90 * dir, stride: settled ? 0 : strideAt(Math.abs(ps * FS_RAD * G.R_E) + off * 1.7) });
  const enemyAt = (b, dv) => { const [x, y] = fdFrame(...fdPolar(0, 0, G.R_E, b), b)(0, dv); return { x, y }; };
  add({ id: "e-mg", side: "h", role: "mg", ...run(ps, 0), ...enemyAt(ps, 1.1), b: ps });
  add({ id: "e-ag", side: "h", role: "r", ...run(ps, 2), ...enemyAt(ps, -1.1), b: ps });
  const roles = ["tl", "ar", "gr", "r", "tl", "ar", "gr", "r"];
  [-48, -24, 24, 48].forEach((off, i) => [1.1, -1.1].forEach((dv, j) => {
    const b = ps + off;
    add({ id: `e-${i}${j}`, side: "h", role: roles[i * 2 + j], ...run(b, i + j), ...enemyAt(b, dv), b });
  }));
  { const [x, y] = fdPolar(0, 0, 9, ps + 180); add({ id: "e-sl", side: "h", role: "sl", pose: "kneel", face: ps, x, y }); }

  // --- support by fire: a rifle squad kneeling behind the wall and two MG teams prone in its gaps ---
  const sbfRoles = ["tl", "ar", "gr", "r", "tl", "ar", "gr", "r"];
  const up = false;                                                    // fire lifted: they stay down in position
  const stride = out > 0.1 && out < 15.8 ? strideAt(out) : 0;
  const sbf = (m, pose) => add({ side: "f", face: 180, ...m, pose: up ? "stand" : pose, stride: up ? stride : 0 });
  [-31, -26, -21, -16, 16, 21, 26, 31].forEach((y, i) => sbf({ id: `s-${i}`, role: sbfRoles[i], x: G.SBF_X + out, y }, "kneel"));
  for (const [i, y] of [[0, -9], [1, 9]]) {
    sbf({ id: `s-mg${i}`, role: "mg", x: G.SBF_X + 2 + out, y }, "prone");
    sbf({ id: `s-ag${i}`, role: "r", x: G.SBF_X + 2.6 + out, y: y + (y < 0 ? -2.3 : 2.3) }, "prone");
  }
  sbf({ id: "s-sl", role: "sl", x: G.SBF_X + 7 + out, y: -2 }, "kneel");
  sbf({ id: "s-psg", role: "r", x: G.SBF_X + 11 + out, y: 4 }, "kneel");

  // --- assault: two rifle squads (squad columns, fire teams in wedges) and the platoon leader with
  // his RTO, along the track through the wood; at the end they turn in and close in squad line. ---
  const R = G.ROUTE_R;
  const a = smooth01(G.ASSAULT[0], G.ASSAULT[1], S.theta);            // 0 on the track, 1 assaulting
  const under = smooth01(0.34, 0.6, S.f) * (1 - a);                    // enemy fire bears on them: bound
  const s = S.theta * FS_RAD * R;
  const B = trBound(s, G.BOUND, under, G.GAP);
  const moving = Math.abs(M.vt) > 2;
  const col = trSquad("column", "wedge"), line = trSquad("line", "line");
  const squads = [];
  for (const [n, sp] of [[1, B.a], [2, B.b]]) {
    const tb = sp / (FS_RAD * R);                                       // travel bearing
    const ab = S.theta + (n === 1 ? 7 : -7);                            // assault bearing
    const bear = tb + (ab - tb) * a;
    const rad = R + (G.ASSAULT[2] - R) * a;
    const [x, y] = fdPolar(0, 0, rad, bear);
    const face = bear + 90 + 90 * a;                                    // along the track, then at the enemy
    const overwatch = under > 0.5 && B.moving !== (n === 1 ? "a" : "b");
    const st = moving || a > 0.02 ? strideAt(sp + n * 3) : 0;
    squads.push({ n, overwatch });
    trPlace(trMorph(col, line, a), { x, y, face }).forEach((m, i) => add({ id: `a${n}-${i}`, side: "f", lit: true, role: m.role, sq: n,
      pose: overwatch ? "prone" : under > 0.5 && !moving ? "kneel" : "stand", stride: overwatch ? 0 : st, face, x: m.x, y: m.y }));
  }
  {
    const tb = (s - G.GAP * 0.5) / (FS_RAD * R), bear = tb + (S.theta - tb) * a, rad = R + (G.ASSAULT[2] + 16 - R) * a;
    const F = fdFrame(...fdPolar(0, 0, rad, bear), bear + 90 + 90 * a);
    const face = bear + 90 + 90 * a;
    const st = moving || a > 0.02 ? strideAt(s) : 0;
    const pose = under > 0.5 && !moving ? "kneel" : "stand";
    add({ id: "a-pl", side: "f", lit: true, role: "pl", pose, stride: st, face, x: F(0, 2)[0], y: F(0, 2)[1] });
    add({ id: "a-rto", side: "f", lit: true, role: "rto", pose, stride: st, face, x: F(-2.6, 3.4)[0], y: F(-2.6, 3.4)[1] });
  }

  // --- casualties (notional; the model's counts): greyed and still. The assault's men down are carried
  // back to the collection point behind the SBF, where a medic kneels; the enemy's lie by the summit ---
  const LS = losses(bearing(offFront(S.theta, S.psi)));
  const downF = new Set(G.DOWN_F.slice(0, LS.blue)), downH = new Set(G.DOWN_H.slice(0, LS.red));
  for (let i = men.length - 1; i >= 0; i--) if (downF.has(men[i].id) || downH.has(men[i].id)) men.splice(i, 1);
  G.CCP.slice(0, LS.blue).forEach(([x, y], k) => add({ id: `c-f${k}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 75 + 25 * ((k * 7) % 3 - 1), x, y }));
  add({ id: "c-med", side: "f", role: "r", pose: "kneel", stride: 0, face: 10, x: G.MEDIC[0], y: G.MEDIC[1] });
  G.DOWN_AT.slice(0, LS.red).forEach(([r, b], k) => { const [x, y] = fdPolar(0, 0, r, b); add({ id: `c-h${k}`, side: "hc", role: "r", pose: "prone", stride: 0, face: b + 150 + 20 * k, x, y }); });

  // --- fire ---
  const byId = Object.fromEntries(men.map((m) => [m.id, m]));
  const aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z);
  const bearingOf = (m) => Math.atan2(m.y, m.x) / FS_RAD;
  const within = (b0, b1, half) => Math.abs((((b1 - b0) % 360) + 540) % 360 - 180) < half;
  const friends = men.filter((m) => m.side === "f" && m.id !== "c-med");
  const enemies = men.filter((m) => m.side === "h");
  const streams = [];
  // enemy: the MG and each pair fire at whatever friendly troops are inside their sector; the
  // SBF's fire on their front cuts their rate (suppression)
  const suppressed = hold * (within(ps, 0, 40) ? 1 : 0.3);
  const targetsFor = (b, half) => friends.filter((m) => within(b, bearingOf(m), half)).map(aim);
  streams.push({ id: "e-mg", side: "h", heavy: true, from: muzzle(byId["e-mg"]), to: targetsFor(ps, 34), period: 2.3, burst: 3, gap: 0.1, flight: 0.42, phase: 0.3, on: settled ? 0.95 - 0.45 * suppressed : 0, scatter: 3 });
  [-48, -24, 24, 48].forEach((off, i) => byId[`e-${i}0`] && streams.push({ id: `e-r${i}`, side: "h", from: muzzle(byId[`e-${i}0`]), to: targetsFor(ps + off, 40), period: 2.9 + i * 0.37, burst: 1, gap: 0, flight: 0.4, phase: i * 0.71, on: settled ? 0.7 - 0.45 * suppressed : 0, scatter: 3 }));
  // SBF: both machine guns and two riflemen on the enemy's front positions; as the assault closes
  // they shift onto the positions away from it
  const front = enemies.filter((m) => m.pose === "hole" && within(0, m.b, 62) && (a < 0.3 || !within(S.theta, m.b, 75))).map(aim);
  const sbfTargets = front.length ? front : enemies.filter((m) => m.pose === "hole").map(aim);
  for (const i of [0, 1]) streams.push({ id: `s-mg${i}`, side: "f", heavy: true, smoke: true, from: muzzle(byId[`s-mg${i}`]), to: sbfTargets, period: 1.7, burst: 3, gap: 0.09, flight: 0.5, phase: i * 0.83, on: hold, scatter: 2.4 });
  for (const i of [1, 5]) streams.push({ id: `s-r${i}`, side: "f", from: muzzle(byId[`s-${i}`]), to: sbfTargets, period: 2.6, burst: 1, gap: 0, flight: 0.5, phase: i * 0.4, on: hold * 0.8, scatter: 2.4 });
  // assault: the automatic riflemen and team leaders fire when assaulting or overwatching
  for (const sq of squads) {
    const fire = Math.max(smooth01(0.3, 0.7, a), sq.overwatch ? 1 : 0);
    if (fire < 0.05) continue;
    men.filter((x) => x.sq === sq.n && (x.role === "ar" || x.role === "tl")).forEach((m, i) => {
      const tgt = enemies.filter((e) => within(bearingOf(m), e.b ?? bearingOf(e), 70)).map(aim);
      streams.push({ id: m.id, side: "f", heavy: m.role === "ar", from: muzzle(m), to: tgt.length ? tgt : enemies.map(aim), period: m.role === "ar" ? 1.9 : 2.7, burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.36, phase: sq.n * 0.9 + i * 0.53, on: fire, scatter: 2 });
    });
  }
  return { men, streams, hold, out, a, ps, LS };
}

// Per-state ground marks: the SBF's sector on the enemy front (blue, fading as the fire lifts) and
// the enemy MG's sector (red), which turns as the enemy shifts.
export function fieldMarks(K, P, T, pose) {
  const G = FG;
  const mg = pose.men.find((m) => m.id === "e-mg");
  const sx = G.SBF_X + pose.out;
  return trFan(K, P, T, sx - 2, 0, sx - 44, sx - 10, 180 - 12, 180 + 12, { side: "f", arcs: 1, alpha: 0.55 * pose.hold }) +
    trFan(K, P, T, mg.x, mg.y, 6, 62, pose.ps - 28, pose.ps + 28, { side: "h", arcs: 2, alpha: 0.8 });
}
