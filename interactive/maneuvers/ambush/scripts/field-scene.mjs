// The Battlefield view of Ambush: a platoon ambush on a road, drawn with the terrain kit
// (../../kit/terrain.mjs). The same state S as the machine drives it:
//   S.form      "linear" or "L"           S.fm   the formation's morph 0 (linear) to 1 (L-shaped)
//   S.head      the enemy column's lead, notional units along the road (x), until initiated
//   S.fire      the ambush has been initiated;  S.fireHead where the lead was then;  S.tf seconds since
// World frame: the road runs along +x at y = 0 and the enemy walks toward +x; the friendly elements
// lie on the far (negative y) side, the stream and the near bank on the other. Route coordinate = x.
// fieldStatic() builds the ground (build only); fieldPose() places every soldier and fire stream;
// fieldMarks() draws the fire lanes. build.mjs inlines this file after field.mjs and terrain.mjs.
import { fdPolar, fdBlob, fdSpline, fdFrame } from "../../kit/field.mjs";
import { MODEL, outcome, fallen, fallenBlue, TIMING } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trFan, trChalk, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -300, y: -250, w: 600, d: 450 },
  LY: -19,                     // the friendly line's y in the linear formation
  ASSAULT: { lin: [-28, 5.5], L: [-8, 7.5] },       // line centre x and spacing, linear and L-shaped
  SUPPORT: { lin: [24, 5], leg: [62, -33, 4.6] },   // linear: centre x, spacing; L: leg x, centre y, spacing
  MG_LIN: [0.5, 50], MG_LEG: [[62, -8.5], [62, -13]],
  SEC: [[-76, -8, 180], [110, -8, 0]],              // rear and forward security teams: x, y, facing
  LOA_Y: 15,
  CCP: [[-46, -34], [-40, -37], [-34, -34], [-43, -42]],
  MEDIC: [-37, -31],
  DOWN_F: ["a-6", "s-3", "a-2", "s-6"],             // who goes down, in order
};
FG.TERRAIN = {
  rises: [
    { cx: -10, cy: -112, r: 34, steps: 3, h: 1.6, top: 0.45, seed: 5, wobble: 0.1, lean: [0.2, -0.2] },
    { cx: -200, cy: -86, r: 28, steps: 3, h: 1.5, top: 0.45, seed: 11, wobble: 0.12 },
    { cx: 190, cy: -100, r: 30, steps: 3, h: 1.5, top: 0.5, seed: 17, wobble: 0.1 },
    { cx: 40, cy: 120, r: 26, steps: 2, h: 1.6, top: 0.5, seed: 23, wobble: 0.12 },
  ],
};

const FS_RAD = Math.PI / 180;
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAng = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[-130, 70, 56, 3, 0.6], [150, 40, 50, 5, 0.7], [0, -190, 70, 7, 0.4], [-230, -10, 40, 9, 0.8]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[130, 66], [214, 76], [208, 130], [124, 120]], 9, "a"],
    [[[-216, 58], [-150, 66], [-146, 118], [-212, 110]], 8, "b"],
    [[[-90, 84], [-30, 90], [-26, 138], [-88, 132]], 7, "a"],
    [[[110, -230], [200, -226], [204, -190], [112, -192]], 8, "b"],
    [[[-250, -200], [-170, -204], [-168, -170], [-246, -166]], 8, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  // the stream on the near bank: the natural obstacle that blocks the road's far flank
  g(trStream(K, P, [[-320, 40], [-220, 34], [-130, 40], [-40, 36], [40, 40], [130, 34], [240, 38], [330, 32]], 3.4, 5));
  g(trRoad(K, P, [[-330, 0], [-200, 0], [-100, 0], [0, 0], [100, 0], [200, 0], [330, 0]], 4.2));
  // woods behind the friendly line and copses toward the edges; the road corridor stays open
  const keepOpen = (x, y) => y > -36 || (x > -72 && x < 84 && y > -60);
  const woods = [
    [fdBlob(-30, -176, 82, 31, 0.1, 40, 0.5), 70, 21],
    [fdBlob(150, -162, 40, 32, 0.12, 40, 0.8), 22, 22],
    [fdBlob(-112, -58, 26, 38, 0.12, 40, 0.8), 14, 28],
    [fdBlob(122, -54, 28, 39, 0.12, 40, 0.8), 15, 29],
    [fdBlob(-190, -150, 36, 33, 0.14, 40, 0.8), 18, 23],
    [fdBlob(-150, 104, 30, 34, 0.12, 40, 1), 14, 24],
    [fdBlob(224, 18, 22, 35, 0.12, 40, 1), 10, 25],
    [fdBlob(-258, 20, 28, 36, 0.12, 40, 1), 12, 26],
    [fdBlob(100, 150, 30, 37, 0.12, 40, 0.9), 14, 27],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => keepOpen(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[130, 66], [214, 76]], 51], [[[-216, 58], [-150, 66]], 52], [[[-90, 84], [-30, 90]], 53], [[[-96, -34], [-60, -36]], 54], [[[72, -36], [104, -34]], 55]]) items.push(...trHedge(K, P, pts, { seed }));
  for (const pts of [[[-30, 90], [-26, 138]], [[130, 120], [208, 130]]]) items.push(...trWall(K, P, pts));
  items.push(trHouse(K, P, 170, 100, 10, 12, 8), trHouse(K, P, -184, 92, 80, 10, 7.5));
  g(trRelief(K, P, T));

  // control measures: the kill zone (closed chalk on the road) and the limit of advance beyond it
  const kz = [[MODEL.kz[0], -7.5], [MODEL.kz[1], -7.5], [MODEL.kz[1], 7.5], [MODEL.kz[0], 7.5]];
  const kzc = trChalk(K, P, T, kz, { closed: true });
  const loa = trChalk(K, P, T, [[MODEL.kz[0], G.LOA_Y], [0, G.LOA_Y + 1.5], [MODEL.kz[1], G.LOA_Y]], { h: 2.8 });
  for (const m of [kzc, loa]) { g(m.ground); items.push(...m.items); }
  return { ground: ground.join(""), items };
}

// A soldier's place on a line of nine facing `face`: k = 0..3 team A, 4 the squad leader (set back), 5..8 team B.
function linePos(cx, cy, face, sp, k) {
  const fx = Math.cos(face * FS_RAD), fy = Math.sin(face * FS_RAD);
  const along = (k - 4) * sp, back = k === 4 ? 3.2 : 0;
  return [cx - fy * along - fx * back, cy + fx * along - fy * back];
}
const ROLES9 = ["tl", "ar", "gr", "r", "sl", "tl", "ar", "gr", "r"];

export function fieldPose(S, T, M = { vt: 0, dfm: 0 }) {
  const G = FG, m = MODEL;
  const men = [];
  const add = (p) => { p.z = T.height(p.x, p.y); men.push(p); return p; };
  const fm = S.fm ?? (S.form === "L" ? 1 : 0);
  const head = S.fire ? S.fireHead : S.head;
  const moving = Math.abs(M.vt) > 1.5;
  const morphing = Math.abs(M.dfm) > 0.004;
  const tf = S.fire ? S.tf : 0;
  const out = outcome(S.form, head, m);
  const nFall = S.fire ? fallen(out, tf) : 0;
  const nBlue = S.fire ? fallenBlue(out, tf) : 0;
  const downE = new Set(out.down.slice(0, nFall));
  const downF = new Set(G.DOWN_F.slice(0, nBlue));
  const asl = smooth01(TIMING.shift, TIMING.shift + TIMING.cross, tf);        // the assault crossing, 0..1
  const aA = smooth01(0, 0.55, asl), aB = smooth01(0.45, 1, asl);             // team A then team B
  const prone = (p) => ({ pose: "prone", stride: 0, ...p });

  // --- the enemy column: ten men walking down the road in file, staggered either side of its centre ---
  const alive = [];
  for (let i = 0; i < m.n; i++) {
    const x = head - i * m.gap, y = i % 2 ? 1.6 : -1.6;
    if (downE.has(i)) { add({ id: `e${i}`, side: "hc", role: "r", pose: "prone", stride: 0, face: 20 + ((i * 53) % 90), x, y: y + (i % 3 - 1) * 0.8 }); continue; }
    const q = S.fire
      ? { pose: tf > 0.25 ? "prone" : "stand", stride: 0, face: tf > 0.25 ? 20 : 0 }
      : { pose: "stand", stride: moving ? strideAt(x + i * 1.3) : 0, face: 0 };
    alive.push(add({ id: `e${i}`, side: "h", role: i === 0 ? "tl" : "r", ...q, x, y, inKZ: x >= m.kz[0] && x <= m.kz[1] }));
  }

  // --- friendly: assault element (a squad on the line, the platoon leader and RTO) ---
  const [ax0, asp0] = G.ASSAULT.lin, [ax1, asp1] = G.ASSAULT.L;
  const cxA = lerp(ax0, ax1, fm), spA = lerp(asp0, asp1, fm);
  const act = (n) => (n < 0.02 || n > 0.98 ? 0 : 1);
  for (let k = 0; k < 9; k++) {
    const id = `a-${k}`;
    if (downF.has(id)) continue;
    const team = k < 4 ? 0 : k === 4 ? 0 : 1;
    const a = team ? aB : aA;
    const [x, y0] = linePos(cxA, G.LY, 90, spA, k);
    const y = lerp(y0, G.LOA_Y - 2, a);
    const walking = act(a) || morphing;
    add({ id, side: "f", lit: true, role: ROLES9[k], pose: walking ? "stand" : "prone", stride: walking ? strideAt(y * 1.2 + x) : 0, face: 90, x, y, team });
  }
  for (const [id, du, dy] of [["a-pl", 4.5, -6.5], ["a-rto", -0.5, -9]]) {
    const a = aA;
    const walking = act(a) || morphing;
    add({ id, side: "f", lit: true, role: id === "a-pl" ? "pl" : "rto", pose: walking ? "stand" : "kneel", stride: walking ? strideAt(a * 40 + du) : 0, face: 90, x: cxA + du, y: lerp(G.LY + dy, G.LOA_Y - 9, a) });
  }

  // --- friendly: support element (a squad and two MG teams): in line with the assault element
  // (linear), or the short leg at the end of the kill zone, at a right angle to it (L-shaped) ---
  const [sxl, ssl] = G.SUPPORT.lin, [lx, lcy, lsp] = G.SUPPORT.leg;
  const sface = lerpAng(90, 180, fm);
  const sw = morphing;
  for (let k = 0; k < 9; k++) {
    const id = `s-${k}`;
    if (downF.has(id)) continue;
    const [x0, y0] = linePos(sxl, G.LY, 90, ssl, k);
    const [x1, y1] = linePos(lx, lcy, 180, lsp, k);
    add({ id, side: "f", role: ROLES9[k], pose: sw ? "stand" : "kneel", stride: sw ? strideAt(fm * 60 + k * 1.1) : 0, face: sface, x: lerp(x0, x1, fm), y: lerp(y0, y1, fm) });
  }
  [0, 1].forEach((j) => {
    const x0 = G.MG_LIN[j], [x1, y1] = G.MG_LEG[j];
    add({ id: `s-mg${j}`, side: "f", role: "mg", pose: sw ? "stand" : "prone", stride: sw ? strideAt(fm * 60 + j * 4) : 0, face: sface, x: lerp(x0, x1, fm), y: lerp(G.LY, y1, fm) });
    add({ id: `s-ag${j}`, side: "f", role: "r", pose: sw ? "stand" : "prone", stride: sw ? strideAt(fm * 60 + j * 4 + 2) : 0, face: sface, x: lerp(x0, x1 + 3, fm), y: lerp(G.LY - 2.6, y1 - 0.5, fm) });
  });

  // --- friendly: security element, a fire team at each end of the kill zone, blocking the road ---
  G.SEC.forEach(([x, y, face], j) => {
    [[0, 0, "tl"], [-3.4, -3, "ar"], [-3.4, 3, "gr"], [-6.8, 6, "r"]].forEach(([u, v, role], k) => {
      const F = fdFrame(x, y, face);
      const [px, py] = F(u, v);
      add({ id: `x${j}-${k}`, side: "f", role, pose: "prone", stride: 0, face, x: px, y: py });
    });
  });

  // --- casualties (notional): friendly men down are carried to a collection point behind the line,
  // where a medic kneels; the enemy's lie in the road (above) ---
  G.CCP.slice(0, nBlue).forEach(([x, y], k) => add({ id: `c-f${k}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 70 + 25 * ((k * 7) % 3 - 1), x, y }));
  if (nBlue) add({ id: "c-med", side: "f", role: "r", pose: "kneel", stride: 0, face: 10, x: G.MEDIC[0], y: G.MEDIC[1] });

  // --- fire ---
  const byId = Object.fromEntries(men.map((p) => [p.id, p]));
  const aim = (p) => trAimPoint(p, p.x, p.y, p.z);
  const muzzle = (p) => trMuzzle(p, p.x, p.y, p.z);
  const streams = [];
  if (S.fire) {
    const ramp = smooth01(0, 0.3, tf);
    const cease = 1 - smooth01(TIMING.shift - 0.5, TIMING.shift, tf);          // the signal to cease or shift fire
    const inZone = alive.filter((p) => p.inKZ).map(aim);
    const outZone = alive.filter((p) => !p.inKZ).map(aim);
    const zone = inZone.length ? inZone : outZone.length ? outZone : [];
    const friends = men.filter((p) => p.side === "f" && p.id !== "c-med");
    const gun = (id, o) => { const p = byId[id]; if (p && zone.length) streams.push({ id, side: "f", from: muzzle(p), to: zone, flight: 0.45, scatter: 2.2, ...o }); };
    // support: the machine guns open the ambush, the riflemen follow
    gun("s-mg0", { heavy: true, smoke: true, period: 1.7, burst: 3, gap: 0.09, phase: 0, on: ramp * cease });
    gun("s-mg1", { heavy: true, smoke: true, period: 1.7, burst: 3, gap: 0.09, phase: 0.8, on: ramp * cease });
    for (const k of [1, 3, 5, 7]) gun(`s-${k}`, { period: 2.5, burst: 1, gap: 0, phase: k * 0.37, on: ramp * cease * 0.85 });
    // assault: fires into the kill zone from the line; the team that is not moving overwatches
    for (const k of [0, 1, 5, 6, 3, 8]) {
      const p = byId[`a-${k}`];
      if (!p) continue;
      const stopped = p.team === 0 ? aA < 0.05 || aA > 0.95 : aB < 0.05 || aB > 0.95;
      const on = stopped ? ramp * (asl > 0 ? 0.8 : cease * 0.85) : 0;
      gun(`a-${k}`, { heavy: p.role === "ar", period: p.role === "ar" ? 1.9 : 2.7, burst: p.role === "ar" ? 2 : 1, gap: 0.1, phase: k * 0.43, on });
    }
    // security: fire on whoever is outside the kill zone, near its own end
    G.SEC.forEach(([x], j) => {
      const near = alive.filter((p) => !p.inKZ && Math.abs(p.x - x) < 90).map(aim);
      [0, 1].forEach((k) => { const p = byId[`x${j}-${k}`]; if (p && near.length) streams.push({ id: `x${j}-${k}`, side: "f", heavy: k === 1, from: muzzle(p), to: near, period: 2.2 + k * 0.5, burst: k === 1 ? 2 : 1, gap: 0.1, flight: 0.4, phase: j * 0.5 + k * 0.7, on: ramp * 0.55, scatter: 2.6 }); });
    });
    // the enemy that is still alive answers, briefly, from where it dropped
    const defs = friends.filter((p) => p.side === "f").map(aim);
    alive.forEach((p, i) => {
      if (!defs.length) return;
      const spent = smooth01(1.2, 3.0, tf);
      streams.push({ id: p.id, side: "h", from: muzzle(p), to: defs, period: 2.7 + (i % 4) * 0.3, burst: 1, gap: 0, flight: 0.5, phase: 0.4 + i * 0.37, on: ramp * 0.5 * (1 - spent), scatter: 6 });
    });
  }
  return { men, streams, fm, tf, asl, nFall, nBlue, out };
}

// Per-state ground marks: the fire lanes of the support element, which move with the formation:
// flanking fire across the road from the line (linear), or the leg's enfilade lane down the road.
export function fieldMarks(K, P, T, pose) {
  const G = FG;
  const a = 0.5 + 0.4 * (pose.tf > 0 ? 1 : 0);
  const lin = 1 - pose.fm, L = pose.fm;
  return trFan(K, P, T, G.SUPPORT.lin[0], G.LY, 8, 28, 62, 118, { side: "f", arcs: 1, alpha: a * lin }) +
    trFan(K, P, T, G.ASSAULT.lin[0] * lin + G.ASSAULT.L[0] * L, G.LY, 8, 28, 62, 118, { side: "f", arcs: 1, alpha: a }) +
    trFan(K, P, T, G.SUPPORT.leg[0] - 3, -5, 6, 104, 180 - 8, 180 + 8, { side: "f", arcs: 2, alpha: a * L });
}
