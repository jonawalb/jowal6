// The Battlefield view of Screen, Guard and Cover: a main body in its positions at the left, a security
// force of the chosen task forward of it, and an enemy of the chosen level coming down the road from the
// right. Drawn with the terrain kit (../../kit/terrain.mjs). The same run state as the machine drives it
// (model.mjs stateAt): S.sE the enemy's head along the axis, S.sSec the security force (it gives ground
// once it has held as long as it can), S.plan.fT / S.plan.eT when each man went down. Pure function of S.
// World: x along the axis (enemy comes from the right, moving left), y toward the viewer.
// world x = OFF + KS * s. build.mjs inlines this file with `import` and `export` lines stripped, after
// field.mjs and terrain.mjs.
import { fdBlob, fdSpline, fdPolar } from "../../kit/field.mjs";
import { MODEL, clamp, ease } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHole, trNest, trHouse, trChalk, trFan, trDrape, trFireTeam, trSquad, trPlace, trMorph, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

const KS = 4.875, OFF = -66;
export const xOf = (s) => OFF + KS * s;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];

export const FG = {
  world: { x: -260, y: -230, w: 520, d: 400 },
  AXIS_Y: 2,
  // the main body: four positions (a pair in each) and a command post
  MAIN: [[-76, -34], [-75, -12], [-76, 16], [-75, 38]],
  CP: [[-88, 0], [-88, 5]],
  // each task's own positions: holes (pairs), observation posts (pairs), reserve, forward element
  SCREEN: { ops: [[0, -44], [0, -14], [0, 22]] },                                   // x = line (s), y
  GUARD: { holes: [[0, -38], [1, -12], [0, 22]], fwd: [1.5, 11], res: [-4, -2] },   // x offset in km from the line
  COVER: { fwd: [[0, -42], [0.4, -20], [0.2, 22], [-0.2, 42]], back: [[-4, -30], [-3.6, 28]], res: [-7, -16] },
  // who goes down, in order (member ids)
  DOWN_S: ["s0a", "s2b", "s1a"],
  DOWN_G: ["g0a", "g3a", "g2b", "gF0", "g1a"],
  DOWN_C: ["c0a", "c2b", "c1a", "c3a", "c4a", "c5b"],
  DOWN_E: [3, 7, 1, 12, 5, 16, 9, 0, 14, 6, 11, 2, 17, 8, 13, 4, 10, 15],
  OBS_S: MODEL.S_OBS,
};
FG.TERRAIN = {
  rises: [
    { cx: -82, cy: 4, r: 36, steps: 2, h: 1.2, top: 0.55, seed: 81, wobble: 0.08 },
    { cx: 40, cy: -34, r: 26, steps: 2, h: 1.3, top: 0.55, seed: 85, wobble: 0.1 },
  ],
};
export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// task-specific static items are tagged so the page can show only the chosen task's
const tag = (n, item) => ({ ...item, svg: `<g class="tk tk${n}">${item.svg}</g>` });

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[-60, 100, 80, 3, 0.55], [70, 104, 60, 4, 0.5], [0, -150, 90, 5, 0.5], [-210, -20, 40, 6, 0.8], [215, -30, 40, 9, 0.8]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.1, 40, sq)));
  const fields = [
    [[[-250, 82], [-170, 78], [-166, 142], [-246, 146]], 8, "a"],
    [[[170, 82], [248, 78], [250, 142], [172, 146]], 8, "b"],
    [[[-250, -150], [-190, -154], [-186, -214], [-248, -218]], 7, "b"],
    [[[190, -150], [248, -146], [250, -210], [192, -214]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  g(trRoad(K, P, [[-300, 4], [-160, 2], [-40, 3], [60, 1], [150, -3], [300, -2]], 3));
  g(trRoad(K, P, [[-300, 124], [-150, 118], [0, 122], [150, 116], [300, 120]], 3));
  g(trStream(K, P, [[-300, -192], [-180, -186], [-60, -194], [60, -186], [180, -194], [300, -188]], 3, 5));
  // woods: clear of the road and every position
  const clear = (x, y) => (Math.abs(y - G.AXIS_Y) < 70 && x > -150 && x < 130);
  const woods = [
    [fdBlob(-170, 100, 22, 61, 0.14, 40, 0.8), 12, 62],
    [fdBlob(-40, -96, 28, 63, 0.14, 40, 0.8), 16, 64],
    [fdBlob(60, 96, 18, 65, 0.12, 40, 0.9), 9, 66],
    [fdBlob(150, 70, 18, 67, 0.12, 40, 0.8), 9, 68],
    [fdBlob(130, -92, 22, 73, 0.12, 40, 0.9), 11, 74],
    [fdSpline([[-260, -130], [-120, -138], [0, -140], [120, -138], [260, -130], [260, -156], [0, -160], [-260, -156]], 3, true), 26, 69],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0 || clear(x, y) });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-250, 82], [-170, 78]], 71], [[[170, 82], [248, 78]], 72]]) items.push(...trHedge(K, P, pts, { seed }));
  g(trRelief(K, P, T));
  const hole = (x, y, face, o) => trHole(K, P, x, y, T.height(x, y), face, o);
  // the main body's positions, facing the enemy
  for (const [x, y] of G.MAIN) items.push(...hole(x, y, 0));
  // guard: three positions on the line (one with a machine-gun nest)
  G.GUARD.holes.forEach(([dx, y], i) => {
    const x = xOf(MODEL.LINE[1] + dx);
    if (i === 0) items.push(...trNest(K, P, x, y, T.height(x, y), 0).map((it) => tag(1, it)));
    else items.push(...hole(x, y, 0).map((it) => tag(1, it)));
  });
  // cover: a forward position of four and a second position of two, in depth
  G.COVER.fwd.forEach(([dx, y], i) => {
    const x = xOf(MODEL.LINE[2] + dx);
    if (i === 1) items.push(...trNest(K, P, x, y, T.height(x, y), 0).map((it) => tag(2, it)));
    else items.push(...hole(x, y, 0).map((it) => tag(2, it)));
  });
  G.COVER.back.forEach(([dx, y]) => { const x = xOf(MODEL.LINE[2] + dx); items.push(...hole(x, y, 0).map((it) => tag(2, it))); });
  items.push(trHouse(K, P, 120, -14, 90, 15, 9));
  // one control measure: the line inside which the enemy can observe the main body (notional)
  const obs = xOf(G.OBS_S);
  const pl = trChalk(K, P, T, [[obs, -66], [obs, -22], [obs, 22], [obs, 66]], { closed: false });
  g(pl.ground);
  items.push(...pl.items);
  return { ground: ground.join(""), items };
}

// ---- who stands where for state S ----
const ROLES = ["tl", "ar", "gr", "r"];
const pairRoles = ["r", "ar"];

// the enemy's members for a level, in the leader's frame, spread as it deploys
function enemyForm(level, spread) {
  if (level === 0) return trMorph(trFireTeam("wedge", 6.5), trFireTeam("line", 6.5), spread);
  if (level === 1) return trMorph(trSquad("column", "wedge", 4.6), trSquad("line", "wedge", 4.6), spread);
  const a = trMorph(trSquad("column", "wedge", 4.6), trSquad("line", "wedge", 4.6), spread);
  const b = trMorph(trSquad("column", "wedge", 4.6), trSquad("line", "wedge", 4.6), spread).map((m) => ({ ...m, off: [m.off[0] - 24, m.off[1]] }));
  return [...a, ...b];
}

// Where every figure stands and who fires at whom for state S (stateAt) at its time S.t.
export function fieldPose(S, T) {
  const G = FG, plan = S.plan;
  const men = [];
  const add = (p) => { p.z = T.height(p.x, p.y); men.push(p); return p; };
  const tm = S.tm;
  const fDown = new Set((S.task === 0 ? G.DOWN_S : S.task === 1 ? G.DOWN_G : G.DOWN_C).slice(0, S.downF));
  const alive = { f: [], e: [], m: [] };
  const rear = S.sSec < plan.line ? xOf(S.sSec) - xOf(plan.line) : 0;            // metres the security force has given ground (world)
  const moving = rear < -0.5 && S.sSec > 3.02;
  const sx = (x) => x + rear;
  const alert = ease(clamp((tm - plan.tc) / 4));                                   // the main body stands to after the report
  const fire = S.released && tm >= plan.tc - 1 && tm < plan.tc + plan.win + 2;

  // ---- the main body: pairs by their positions, a command post ----
  G.MAIN.forEach(([x, y], i) => {
    for (let j = 0; j < 2; j++) {
      const inHole = alert > 0.85;
      const px = x + (inHole ? 0 : -3.5 - j * 2), py = y + (j ? 2.2 : -2.2) * (inHole ? 0.6 : 1.6);
      alive.m.push(add({ id: "m" + i + j, side: "f", role: pairRoles[j], pose: inHole ? "hole" : "stand", face: 0, stride: 0, x: px, y: py }));
    }
  });
  G.CP.forEach(([x, y], i) => add({ id: "cp" + i, side: "f", role: i ? "rto" : "pl", pose: "stand", face: 0, stride: 0, x, y }));

  // ---- the security force: only the chosen task's ----
  const down = (id, p) => add({ id, side: "fc", role: "r", pose: "prone", face: 190 + ((id.length * 13) % 5 - 2) * 12, stride: 0, x: p.x, y: p.y });
  const placeF = (id, role, pose, x, y, face = 0, lit = false) => {
    if (fDown.has(id)) { down(id, { x, y }); return; }
    const mv = moving ? 1 : 0;
    alive.f.push(add({ id, side: "f", lit, role, pose: mv ? "stand" : pose, face: mv ? 180 : face, stride: mv ? strideAt(tm * 2.2 + id.length * 3) : 0, x: sx(x), y }));
  };
  if (S.task === 0) {
    G.SCREEN.ops.forEach(([, y], i) => {
      const x = xOf(MODEL.LINE[0]);
      placeF("s" + i + "a", "r", "kneel", x, y - 1.6, 0, true);
      placeF("s" + i + "b", "ar", "kneel", x - 0.8, y + 1.8, 0, true);
    });
  } else if (S.task === 1) {
    const L = MODEL.LINE[1];
    G.GUARD.holes.forEach(([dx, y], i) => {
      const x = xOf(L + dx);
      placeF("g" + i + "a", i === 0 ? "mg" : "r", "hole", x, y - 1.8, 0, true);
      placeF("g" + i + "b", i === 0 ? "ag" : "ar", "hole", x, y + 1.8, 0, true);
    });
    const [dx, y] = G.GUARD.fwd;
    placeF("gF0", "r", "prone", xOf(L + dx), y - 1.4, 0, true);
    placeF("gF1", "ar", "prone", xOf(L + dx), y + 1.4, 0, true);
    const [rx, ry] = G.GUARD.res;
    placeF("gR0", "tl", "kneel", xOf(L + rx / 2), ry - 2, 0, true);
    placeF("gR1", "r", "kneel", xOf(L + rx / 2), ry + 2, 0, true);
  } else {
    const L = MODEL.LINE[2];
    G.COVER.fwd.forEach(([dx, y], i) => {
      const x = xOf(L + dx);
      placeF("c" + i + "a", i === 1 ? "mg" : "r", "hole", x, y - 1.8, 0, true);
      placeF("c" + i + "b", i === 1 ? "ag" : "ar", "hole", x, y + 1.8, 0, true);
    });
    G.COVER.back.forEach(([dx, y], i) => {
      const x = xOf(L + dx);
      placeF("c" + (4 + i) + "a", "r", "hole", x, y - 1.8, 0, true);
      placeF("c" + (4 + i) + "b", "ar", "hole", x, y + 1.8, 0, true);
    });
    const [rx, ry] = G.COVER.res;
    ["tl", "ar", "gr", "r"].forEach((role, i) => placeF("cR" + i, role, "kneel", xOf(L + rx / 2), ry + i * 4.4 - 6, 0, true));
  }

  // ---- the enemy: comes down the road, deploys on being engaged; the down ones lie still ----
  const level = S.enemy, N = MODEL.ENEMY_N[level];
  const dep = ease(clamp((tm - plan.tc + 5) / 8));
  const members = enemyForm(level, dep);
  const placed = trPlace(members, { x: xOf(S.sE), y: G.AXIS_Y, face: 180 });
  const eDown = new Set(G.DOWN_E.filter((i) => i < N).slice(0, S.downE));
  const going = S.released && S.t > 0.05 && (tm < plan.tc || S.through) && S.sE > MODEL.S_OBS + 0.02;
  const stopped = trPlace(enemyForm(level, 1), { x: xOf(plan.sEng - MODEL.STROKE * 0.6), y: G.AXIS_Y, face: 180 });
  placed.forEach((m, i) => {
    const id = "e" + i;
    if (eDown.has(i)) { const q = stopped[i]; add({ id, side: "hc", role: "r", pose: "prone", face: 330 + ((i * 7) % 5) * 8, stride: 0, x: q.x, y: q.y }); return; }
    const pose = going ? "stand" : (i % 3 === 0 ? "prone" : "kneel");
    alive.e.push(add({ id, side: "h", role: m.role, pose: S.released && S.reported && !going ? pose : "stand", face: 180, stride: going ? strideAt(tm * 2.2 + i * 3) : 0, x: m.x, y: m.y }));
  });

  // ---- fire ----
  const streams = [];
  const aim = (p) => trAimPoint(p, p.x, p.y, p.z);
  const mz = (p) => trMuzzle(p, p.x, p.y, p.z);
  const fT = alive.f.map(aim), eT = alive.e.map(aim);
  const a = S.task;
  if (fire && eT.length && alive.f.length) {
    // the security force's direct fire: a screen fires little except at reconnaissance (self-defense otherwise)
    const share = [S.enemy === 0 ? 0.7 : 0.18, 0.7, 0.9][a];
    alive.f.forEach((p, i) => streams.push({ id: p.id, side: "f", heavy: p.role === "mg" || p.role === "ar", from: mz(p), to: eT, period: 1.7 + (i % 4) * 0.23, burst: p.role === "ar" || p.role === "mg" ? 3 : 1, gap: 0.1, flight: 0.7, phase: 0.1 + i * 0.27, on: share, scatter: 3.4 }));
  }
  if (fire && fT.length && alive.e.length) {
    const share = clamp(0.25 + 0.5 * (S.enemy / 2)) * (alive.e.length / N);
    alive.e.forEach((p, i) => streams.push({ id: p.id, side: "h", heavy: false, from: mz(p), to: fT, period: 1.9 + (i % 4) * 0.25, burst: 1, gap: 0.1, flight: 0.7, phase: 0.2 + i * 0.31, on: share, scatter: 4 }));
  }
  // indirect fire from the main body's side: bursts on the enemy while it is engaged (a screen relies on it)
  if (fire && eT.length && S.tm < plan.tc + Math.max(plan.d, 4) + 1) {
    const on = [0.7, 0.45, 0.7][a];
    alive.e.slice(0, 5).forEach((p, i) => {
      const t0 = [p.x, p.y, p.z + 0.2];
      streams.push({ id: "ib" + i, side: "f", heavy: true, smoke: true, from: [t0[0], t0[1], t0[2] + 0.05], to: [t0], period: 3.1 + i * 0.4, burst: 1, gap: 0.1, flight: 0.02, phase: 0.6 + i * 0.9, on, scatter: 8 });
    });
  }
  return { men, streams };
}

// Ground marks that depend on the task and the report: fields of observation, the report line.
export function fieldMarks(K, P, T, S) {
  const G = FG;
  let out = "";
  const line = xOf(MODEL.LINE[S.task]);
  if (S.task === 0) for (const [, y] of G.SCREEN.ops) out += trFan(K, P, T, line, y, 4, 30, -26, 26, { side: "f", arcs: 1, alpha: 0.9 });
  if (S.task === 1) { const [dx, y] = G.GUARD.fwd; out += trFan(K, P, T, xOf(MODEL.LINE[1] + dx), y, 4, 24, -30, 30, { side: "f", arcs: 1, alpha: 0.75 }); }
  if (S.reported) {
    const a = [xOf(S.sSec) - 3, 0], b = [-86, 2.5];
    const pts = [];
    const n = 14;
    for (let i = 0; i <= n; i++) pts.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
    const q = trDrape(T, pts, 0.3).map((p) => K.iso(p, P));
    out += K.lineSvg(K.pathOf(q), { tone: "lo", dashed: true, className: "tr-report" });
    out += K.dotsSvg([q[0], q[q.length - 1]], { size: 0.7, tone: "mid" });
  }
  return out;
}
