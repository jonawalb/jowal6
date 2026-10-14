// The Battlefield view of the Lanchester Square Law, drawn with the terrain kit (../../kit/terrain.mjs).
// A concrete small-unit vignette of an abstract idea: 16 blue riflemen against 20 red riflemen in two
// separated groups of 10 (A on the left, B on the right), with a wood between the red groups that
// hides each from the other's field of fire. The same model state as the balance drives it:
//   law    square (aimed fire: every man picks a target) or linear (unaimed area fire into smoke)
//   plan   detail (blue concentrates on group A, shifts behind the wood, then fights group B)
//          or both (blue fights both red groups at once from the open ground in front of the wood)
//   st     stateAt(law, plan, t): the men left on each side, the phase and blue's shift progress
// Everything is laid out in a frame on the ground: u forward (from blue toward red, up the card),
// v across (to the right on the card). fieldStatic() builds the ground and everything that never
// moves (build only); fieldPose() places every soldier and fire stream (build and page);
// fieldMarks() draws the fire sectors. build.mjs inlines this file with `import` and `export`
// lines stripped, after field.mjs, terrain.mjs and model.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { MODEL, alive, casualties, stateAt, battle } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trFan, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -260, y: -240, w: 540, d: 520 },
  O: [-5, -7],          // the frame's origin (world)
  ANG: 235,             // direction from blue toward red (world degrees): straight up the card
  RED: [[58, -52], [58, 52]],      // red groups A and B: line centres (u, v)
  LINE_A: [-26, -52],   // blue's firing line against group A (detail)
  LINE_B: [-26, 52],    // blue's firing line against group B (detail)
  LINE_0: [-40, 0],     // blue's firing line against both groups (both)
  VIA: [-52, 0],        // blue's route behind the wood's tail when it shifts from A to B
  WOOD: [[4, -20], [26, -24], [70, -22], [120, -26], [124, 26], [70, 22], [26, 24], [4, 20]], // the wood between the red groups (u, v)
  S_B: 4.0, S_R: 4.4,   // intervals in the blue and red lines (units)
  DOWN_B: [3, 11, 7, 0, 14, 5, 9, 2, 12, 6, 15, 1, 10, 4, 13, 8], // which blue man goes down k-th
  DOWN_R: [4, 8, 1, 6, 2, 9, 0, 5, 3, 7],                           // which red man of a group goes down k-th
  CCP: [-60, -22],       // blue casualty collection point behind the start line (u, v)
  VIEW: { u: 2, zoom: 1.62 },
};
FG.TERRAIN = {
  rises: [
    { cx: 0, cy: 0, r: 30, steps: 3, h: 1.4, top: 0.45, seed: 61, wobble: 0.12 },
    { cx: 0, cy: 0, r: 24, steps: 2, h: 1.5, top: 0.45, seed: 67, wobble: 0.1 },
    { cx: 0, cy: 0, r: 26, steps: 3, h: 1.4, top: 0.5, seed: 71, wobble: 0.12 },
  ],
};
{
  // the rises sit toward the corners, away from the open ground where the fight happens
  const F = fdFrame(FG.O[0], FG.O[1], FG.ANG);
  [[-120, -150], [150, 140], [-130, 150]].forEach(([u, v], i) => { const [x, y] = F(u, v); FG.TERRAIN.rises[i].cx = x; FG.TERRAIN.rises[i].cy = y; });
}

const FS_RAD = Math.PI / 180;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const jit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; };
const W = fdFrame(FG.O[0], FG.O[1], FG.ANG);           // (u, v) -> world [x, y]
const angUV = (du, dv) => FG.ANG + Math.atan2(dv, du) / FS_RAD;   // world facing of a (du, dv) direction

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const ring = (pts) => pts.map(([u, v]) => W(u, v));
  const avoidBase = (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  g(trGroundPlane(K, P, G.world));

  // meadows, and the open pasture the fight is on
  for (const [u, v, r, seed, sq] of [[-150, -40, 44, 3, 0.6], [150, 40, 50, 5, 0.6], [-10, 0, 80, 7, 0.45], [-110, 120, 40, 9, 0.7]]) g(trPatch(K, P, fdBlob(...W(u, v), r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-150, -118], [-150, -60], [-104, -58], [-102, -116]], 7, "a"],
    [[[-150, 50], [-150, 112], [-106, 114], [-104, 52]], 7, "b"],
    [[[118, -150], [118, -86], [166, -84], [168, -148]], 6, "b"],
    [[[-196, -40], [-196, 30], [-160, 32], [-158, -38]], 5, "a"],
  ];
  for (const [r, n, tint] of fields) g(trField(K, P, ring(r), { furrows: n, tint }));
  // a stream across the right flank, the farm road behind blue's start line
  g(trStream(K, P, ring([[220, 150], [150, 162], [80, 150], [10, 166], [-60, 158], [-140, 172], [-240, 160]]), 3.2, 5));
  g(trRoad(K, P, ring([[-96, -260], [-98, -150], [-94, -40], [-97, 60], [-95, 160], [-100, 280]]), 3));

  // woods: the wood between the red groups (it masks each from the other's field of fire), the
  // wood behind the red line, copses toward the edges
  const woods = [
    [ring(G.WOOD), 46, 21, [2.6, 4.2], [8, 12]],
    [ring([[112, -150], [120, -60], [128, 60], [118, 150], [190, 150], [190, -150]]), 46, 22],
    [fdBlob(...W(-150, -150), 22, 33, 0.14, 40, 0.9), 9, 23],
    [fdBlob(...W(-40, 150), 22, 34, 0.12, 40, 1), 9, 24],
    [fdBlob(...W(30, -150), 24, 35, 0.12, 40, 0.8), 10, 25],
  ];
  for (const [r, n, seed, rr, hh] of woods) {
    const trees = trScatter(r, n, { seed, gap: 5.6, r: rr || [2.8, 4.4], h: hh || [8, 12.5], avoid: avoidBase });
    const w = trWood(K, P, T, r, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // hedgerows along the fields, a farm behind the blue start line
  for (const [pts, seed] of [[[[-102, -116], [-104, -58]], 51], [[[-104, 52], [-106, 114]], 52], [[[118, -86], [166, -84]], 53]]) items.push(...trHedge(K, P, ring(pts), { seed }));
  items.push(...trWall(K, P, ring([[-128, -40], [-128, -10]])), ...trWall(K, P, ring([[-150, -10], [-128, -10]])));
  { const [x, y] = W(-142, -26); items.push(trHouse(K, P, x, y, FG.ANG + 90, 13, 8.5)); }
  { const [x, y] = W(-118, 28); items.push(trHouse(K, P, x, y, FG.ANG, 10, 7.5)); }

  g(trRelief(K, P, T));

  return { ground: ground.join(""), items };
}

// Blue's line centre and facing for a state; pb is the eased plan blend (0 = detail, 1 = both).
function blueLine(st, pb) {
  const G = FG;
  const face = (c, tgt) => angUV(tgt[0] - c[0], tgt[1] - c[1]);
  // detail: line A, then the shift along LINE_A -> VIA -> LINE_B
  let c, f, moving = false;
  const s = st.shift;
  if (s <= 0) { c = G.LINE_A; f = face(c, G.RED[0]); }
  else if (s >= 1) { c = G.LINE_B; f = face(c, G.RED[1]); }
  else {
    moving = true;
    const a = G.LINE_A, m = G.VIA, b = G.LINE_B;
    const l1 = Math.hypot(m[0] - a[0], m[1] - a[1]), l2 = Math.hypot(b[0] - m[0], b[1] - m[1]);
    const d = s * (l1 + l2);
    if (d < l1) { const k = d / l1; c = [a[0] + (m[0] - a[0]) * k, a[1] + (m[1] - a[1]) * k]; f = angUV(m[0] - a[0], m[1] - a[1]); }
    else { const k = (d - l1) / l2; c = [m[0] + (b[0] - m[0]) * k, m[1] + (b[1] - m[1]) * k]; f = angUV(b[0] - m[0], b[1] - m[1]); }
  }
  if (pb > 0) {
    const z = G.LINE_0, fz = FG.ANG;
    c = [c[0] + (z[0] - c[0]) * pb, c[1] + (z[1] - c[1]) * pb];
    f = pb > 0.5 ? (pb < 0.999 ? angUV(z[0] - G.LINE_A[0], z[1] - G.LINE_A[1]) : fz) : f;
    if (pb > 0.001 && pb < 0.999) moving = true;
  }
  return { c, f, moving, dist: s * 200 + pb * 80 };
}

// Where every soldier stands and who fires at whom. M carries what the page measures between
// frames: pb, the plan blend eased in time (soldiers walk between lines when the plan changes).
export function fieldPose(view, T, M = {}) {
  const G = FG;
  const { law, plan, t } = view;
  const st = stateAt(law, plan, t);
  const loss = casualties(st);
  const pb = M.pb ?? (plan === "both" ? 1 : 0);
  const men = [];
  const add = (m) => { const [x, y] = W(m.u, m.v); m.x = x; m.y = y; m.z = T.height(x, y); men.push(m); };
  const engA = st.phase === "A" || st.phase === "both", engB = st.phase === "B" || st.phase === "both";
  const over = st.over;

  // --- red: two groups of 10 riflemen, prone in line in the open ---
  const rDown = [loss.redA, loss.redB];
  G.RED.forEach(([u0, v0], gi) => {
    const downSet = new Set(G.DOWN_R.slice(0, rDown[gi]));
    for (let i = 0; i < 10; i++) {
      const v = v0 + (i - 4.5) * G.S_R + 1.2 * jit(i, gi);
      const u = u0 + 2.2 * jit(gi, i);
      const down = downSet.has(i);
      add({ id: `r${gi}-${i}`, side: down ? "hc" : "h", role: i === 4 ? "tl" : i === 7 ? "ar" : "r", pose: "prone", stride: 0,
        face: down ? FG.ANG + 180 + 30 * jit(i, 9) : angUV(-1, 0) + 6 * jit(i, gi + 3), u: down ? u + 1.5 : u, v, grp: gi, down });
    }
  });

  // --- blue: 16 riflemen in one line; the men down stay where they were hit ---
  const L = blueLine(st, pb);
  const B = battle(law, plan);
  const dA = plan === "detail" && B.tAend !== null ? casualties(stateAt(law, plan, B.tAend)).blue : 99;
  const lineAt = (c, f, i) => {
    // the line runs square to the facing; i = 0 at the left as the line faces
    const off = (i - 7.5) * G.S_B, a = (f - FG.ANG) * FS_RAD;
    return [c[0] - off * Math.sin(a) + 2 * jit(i, 2) * Math.cos(a), c[1] + off * Math.cos(a) + 2 * jit(i, 2) * Math.sin(a)];
  };
  const fA = angUV(G.RED[0][0] - G.LINE_A[0], G.RED[0][1] - G.LINE_A[1]);
  const fB = angUV(G.RED[1][0] - G.LINE_B[0], G.RED[1][1] - G.LINE_B[1]);
  const blueDown = G.DOWN_B.slice(0, loss.blue);
  const won = over && alive(st.b) > 0;
  for (let i = 0; i < 16; i++) {
    const k = blueDown.indexOf(i);
    if (k >= 0) {
      // down: at the line where he was hit, greyed and still; the first one at the collection point
      let c, f;
      if (plan === "both") { c = G.LINE_0; f = FG.ANG; }
      else if (k < dA) { c = G.LINE_A; f = fA; }
      else { c = G.LINE_B; f = fB; }
      let [u, v] = lineAt(c, f, i);
      let face = f + 25 * jit(i, 5);
      if (k === 0) { [u, v] = G.CCP; face = FG.ANG - 90; }
      add({ id: `b-${i}`, side: "fc", role: "r", pose: "prone", stride: 0, face, u: u - 1, v, down: true });
      continue;
    }
    const [u, v] = lineAt(L.c, L.f, i);
    const pose = L.moving ? "stand" : won ? "kneel" : "prone";
    add({ id: `b-${i}`, side: "f", lit: true, role: i === 7 ? "sl" : i % 4 === 1 ? "ar" : "r", pose, stride: L.moving ? strideAt(L.dist + i * 1.3) : 0, face: L.f + (L.moving ? 0 : 5 * jit(i, 7)), u, v });
  }
  if (loss.blue > 0) add({ id: "b-med", side: "f", role: "r", pose: "kneel", stride: 0, face: FG.ANG - 90, u: G.CCP[0] + 0.6, v: G.CCP[1] + 4.2 });

  // --- fire ---
  const aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z);
  const area = law === "linear";
  const streams = [];
  const blues = men.filter((m) => m.side === "f" && m.id !== "b-med" && m.pose !== "stand");
  const reds = (gi) => men.filter((m) => m.side === "h" && m.grp === gi);
  const targetsR = [...(engA ? reds(0) : []), ...(engB ? reds(1) : [])];
  const scatter = area ? 9 : 2.2;
  // area fire aims at points spread over the enemy's ground, not at men
  const areaPts = (list) => list.length ? list.map((m, i) => [m.x + 6 * jit(i, 11), m.y + 6 * jit(i, 13), m.z]) : [];
  if (!over && targetsR.length) blues.filter((_, i) => i % 2 === 0).forEach((m, i) => streams.push({ id: m.id, side: "f", heavy: m.role === "ar", smoke: area, from: muzzle(m), to: area ? areaPts(targetsR) : targetsR.map(aim), period: m.role === "ar" ? 1.9 : 2.6 + 0.3 * jit(i, 1), burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.42, phase: i * 0.37, on: 0.9, scatter }));
  [0, 1].forEach((gi) => {
    const on = gi === 0 ? engA : engB;
    if (!on || over || !blues.length) return;
    reds(gi).filter((_, i) => i % 2 === 0).forEach((m, i) => streams.push({ id: m.id, side: "h", heavy: m.role === "ar", smoke: area, from: muzzle(m), to: area ? areaPts(blues) : blues.map(aim), period: m.role === "ar" ? 2.0 : 2.7 + 0.3 * jit(i, 4), burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.42, phase: gi * 0.5 + i * 0.41, on: 0.9, scatter }));
  });
  return { men, streams, st, loss, L, engA, engB, over, area };
}

// Per-state ground marks: blue's fire sector toward each red group it engages.
export function fieldMarks(K, P, T, pose) {
  const G = FG;
  if (pose.over) return "";
  let out = "";
  const blue = pose.men.filter((m) => m.side === "f" && m.id !== "b-med");
  if (!blue.length) return "";
  const cx = blue.reduce((s, m) => s + m.x, 0) / blue.length, cy = blue.reduce((s, m) => s + m.y, 0) / blue.length;
  const sector = (x0, y0, x1, y1, side, half, alpha) => {
    const a = Math.atan2(y1 - y0, x1 - x0) / FS_RAD, r = Math.hypot(x1 - x0, y1 - y0);
    return trFan(K, P, T, x0, y0, 10, Math.min(42, r * 0.45), a - half, a + half, { side, arcs: 1, alpha });
  };
  if (!pose.L.moving) {
    G.RED.forEach(([u, v], gi) => {
      if (!(gi === 0 ? pose.engA : pose.engB)) return;
      const [x, y] = W(u, v);
      out += sector(cx, cy, x, y, "f", 9, 0.55);
    });
  }
  return out;
}
