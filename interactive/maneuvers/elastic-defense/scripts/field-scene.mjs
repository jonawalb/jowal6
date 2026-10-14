// The Battlefield view of Elastic Defense in Depth: a 1917 German defense in depth on full-bleed
// terrain (../../kit/terrain.mjs), driven by the same model state S as the bench.
//   S.d      the ram's depth in notional km = the leading attack wave's depth from the outpost line
//   S.c      the flank carriage's stroke = the counterattack force's progress round the attack's flank
//   S.bunch  0 = the defenders spread in depth, 1 = the same men packed into the front trench (rigid)
//   S.broken the rigid front trench has broken
// The attack runs the same way as the ram (world -x, up and left on the card) and the counterattack
// comes from the same side as the flank carriage (world -y, the far side), so the views agree.
// Everything is laid out in a frame on the ground: u = depth in the direction of the attack (units,
// FG.SF per notional km from the outpost line), v = across the front (v > 0 is the far flank).
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every soldier and every stream of fire for a state (build and page); fieldMarks() draws the MG sectors.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame, fdRibbon, fdRand } from "../../kit/field.mjs";
import { MODEL, FORCE, LOSS, stages, faceDepth, casualties, thrown } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trPatch, trField, trRoad, trWood, trScatter, trHouse, trHole, trNest, trWire, trFan, trPrism, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -300, y: -250, w: 560, d: 500 },
  SF: 52,                 // units per notional km of depth
  ANG: 180,               // direction of the attack (world degrees): world -x, the ram's direction
  U_JUMP: -41,            // the attackers' jump-off trench
  U_FRONT: 8,             // the front trench (the outpost zone's forward trench; the rigid wall)
  U_WIRE: 2.5,            // wire belt in front of the front trench, with lanes cut through it
  U_MLR: 39,              // main line of resistance (0.75 km), behind a low rise
  U_APL: 143,             // artillery protective line (2.75 km), the battle zone's rear edge
  LANE: [-30, 20],        // the attack's lane across the front (v)
  WAVES: 3, PER: 8, GAP: 15, SPACE: 6.2, V0: -5, // three waves of eight, 15 units apart
  OUTPOSTS: [[19, -48], [17, -5], [20, 42]],     // shell-hole outposts (two men each); they stay and fight
  MLR: [[39, -40], [39, -2], [39, 44]],          // MLR posts: a machine gun and a rifleman each
  NESTS: [[57, -32], [75, 29], [104, -9]],       // strongpoints in the battle zone: MG, assistant, rifleman
  WAIT: [122, 76],        // the counterattack force waits at the rear of the battle zone, on the far flank
  STRIKE_V: 36,           // the counterattack meets the attack's flank this far across (v)
  SWEEP_V: 18,            // ...and drives in to here as it throws the attack back
  CCP: [-50, 34],        // the attackers' casualty collection point, behind the jump-off trench
  VIEW: { u: 58, v: 24, zoom: 1.22 },
};
FG.TERRAIN = {
  rises: [
    { cx: -205, cy: 120, r: 26, steps: 3, h: 1.3, top: 0.45, seed: 43, wobble: 0.12 },
    { cx: 70, cy: 130, r: 24, steps: 3, h: 1.2, top: 0.5, seed: 47, wobble: 0.12 },
  ],
};

const FS_RAD = Math.PI / 180;
const W = fdFrame(0, 0, FG.ANG);                 // (u, v) → world [x, y] = [-u, -v]
const FACE_F = FG.ANG, FACE_H = FG.ANG - 180;    // attackers face up the attack; defenders face them
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const jit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; };
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax) / FS_RAD;

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// A trench: a zigzag (traversed) cut with a spoil bank toward the enemy, both flat on the ground.
function trench(K, P, T, u, v0, v1, bank = -1) {
  const pts = [];
  for (let v = v0, i = 0; v <= v1 + 1e-6; v += 5, i++) pts.push(W(u + (i % 2 ? 0.9 : -0.9), v));
  const z = (x, y) => T.height(x, y) + 0.04;
  const ring = (r) => r.map(([x, y]) => [x, y]);
  const cut = fdRibbon(pts, 0.75), spoil = fdRibbon(pts.map(([x, y]) => [x - bank * 1.9, y]), 0.6);
  const top = (r) => K.pathOf(r.map(([x, y]) => K.iso([x, y, z(x, y)], P)), true);
  return `<path class="ed-spoil" d="${top(ring(spoil))}"/><path class="tr-pit" d="${top(ring(cut))}"/>`;
}

// Helmets: the attackers' broad-brimmed steel helmet, the defenders' flared one, added to a figure.
const HEAD = { stand: [0, 4.9], kneel: [0, 3.45], hole: [0, 1.25], prone: [0.95, 0.32] };
function octRing(F, u, v, r, n = 10) {
  return Array.from({ length: n }, (_, i) => F(u + r * Math.cos((i + 0.5) * 2 * Math.PI / n), v + r * Math.sin((i + 0.5) * 2 * Math.PI / n)));
}
export function fieldHelmet(K, P, spec, side) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, spec.face ?? 0);
  const [hu, hz] = HEAD[spec.pose || "stand"] || HEAD.stand;
  if (side === "f" || side === "fc") return trPrism(K, P0, octRing(F, hu, 0, 1.04), hz + 0.62, hz + 0.76, true);
  return trPrism(K, P0, octRing(F, hu - 0.06, 0, 0.82), hz + 0.05, hz + 0.42, true);
}

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const ring = (pts) => pts.map(([u, v]) => W(u, v));
  const avoidBase = (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  g(trGroundPlane(K, P, G.world));

  // behind the attackers, and in the rearward zone: fields and meadows still farmed
  for (const [u, v, r, seed, sq] of [[-95, 40, 40, 3, 0.7], [-90, -90, 38, 5, 0.6], [190, -40, 44, 7, 0.7], [175, 130, 34, 9, 0.8]]) g(trPatch(K, P, fdBlob(...W(u, v), r, seed, 0.15, 40, sq)));
  g(trField(K, P, ring([[-130, -60], [-130, 10], [-80, 12], [-78, -58]]), { furrows: 7, tint: "a" }));
  g(trField(K, P, ring([[178, -110], [178, -40], [222, -38], [224, -108]]), { furrows: 6, tint: "b" }));
  g(trField(K, P, ring([[180, 10], [180, 70], [226, 72], [226, 12]]), { furrows: 6, tint: "a" }));
  // the road up to the rear village, and a farm track behind the attackers' lines
  g(trRoad(K, P, ring([[160, -260], [168, -140], [176, -60], [182, 20], [178, 120], [186, 260]]), 3));
  g(trRoad(K, P, ring([[-70, -250], [-66, -120], [-72, 0], [-66, 120], [-70, 260]]), 2.4, { ruts: false }));

  // torn ground: shell craters, thickest in the outpost zone (filled, no outlines)
  const rnd = fdRand(77);
  const craters = [];
  for (let i = 0; i < 120; i++) {
    const u = -28 + rnd() * 150 * rnd() ** 0.6, v = -105 + rnd() * 210, r = 1.1 + rnd() * 1.6;
    craters.push(`<path class="ed-crater" d="${K.onTop(fdBlob(...W(u, v), r, 100 + i, 0.25, 12, 0.8 + rnd() * 0.3), 0.02, P, true)}"/>`);
  }
  g(`<g>${craters.join("")}</g>`);

  // trenches: the attackers' jump-off trench, the front trench, the MLR and the artillery protective line
  g(trench(K, P, T, G.U_JUMP, -95, 85, 1));
  g(trench(K, P, T, G.U_FRONT, -105, 105));
  g(trench(K, P, T, G.U_MLR, -105, 105));
  g(trench(K, P, T, G.U_APL, -98, 98));
  g(trRelief(K, P, T));

  // woods: the wood on the far flank that hides the counterattack force; copses toward the edges
  const clear = (x, y) => {
    const [wx, wy] = W(G.WAIT[0], G.WAIT[1]);
    return Math.hypot(x - wx, y - wy) < 20;
  };
  const woods = [
    [ring([[104, 112], [150, 104], [196, 116], [200, 170], [110, 176]]), 30, 21, clear],
    [fdBlob(...W(92, -122), 22, 33, 0.14, 40, 0.8), 9, 22],
    [fdBlob(...W(-110, 110), 22, 34, 0.12, 40, 0.9), 9, 23],
    [fdBlob(...W(-120, -120), 18, 35, 0.12, 40, 1), 6, 24],
  ];
  for (const [r, n, seed, avoid] of woods) {
    const trees = trScatter(r, n, { seed, gap: 5.6, r: [2.6, 4.0], h: [7.5, 11.5], avoid: (x, y) => (avoid ? avoid(x, y) : false) || avoidBase(x, y) });
    const w = trWood(K, P, T, r, trees);
    g(w.floor);
    items.push(...w.items);
  }
  // the rear village behind the artillery protective line
  for (const [u, v, a, l, w] of [[176, -78, 90, 12, 8], [168, -50, 0, 10, 7], [182, -28, 90, 11, 7.5], [196, -60, 0, 9, 7]]) {
    const [x, y] = W(u, v);
    items.push(trHouse(K, P, x, y, a, l, w));
  }

  // wire in front of the front trench and of the MLR, with lanes cut through it where the attack comes
  for (const u of [G.U_WIRE, G.U_MLR - 6]) {
    for (const [v0, v1] of [[-100, G.LANE[0] - 3], [G.LANE[1] + 3, 100]]) {
      const pts = [];
      for (let v = v0; v <= v1 + 1e-6; v += (v1 - v0) / Math.max(1, Math.round((v1 - v0) / 8))) pts.push(W(u + 1.1 * Math.sin(v * 0.13), v));
      items.push(...trWire(K, P, T, pts));
    }
  }
  // the outposts' shell-hole positions and the strongpoints (MG horseshoes) in the battle zone
  for (const [u, v] of G.OUTPOSTS) { const [x, y] = W(u, v); items.push(...trHole(K, P, x, y, T.height(x, y), FACE_H, { len: 4, deep: 2 })); }
  for (const [u, v] of G.NESTS) { const [x, y] = W(u, v); items.push(...trNest(K, P, x, y, T.height(x, y), FACE_H)); }
  return { ground: ground.join(""), items };
}

// ---- who is where ----

// The defenders, in order: outposts, MLR posts, strongpoints, the counterattack force. Each has a
// spread position (elastic) and a slot in the front trench (rigid).
const RED = [];
FG.OUTPOSTS.forEach(([u, v], i) => ["r", "r"].forEach((role, j) => RED.push({ id: `o${i}${j}`, kind: "out", role, u, v: v + (j ? -1.3 : 1.3) })));
FG.MLR.forEach(([u, v], i) => ["mg", "r"].forEach((role, j) => RED.push({ id: `m${i}${j}`, kind: "mlr", role, u, v: v + (j ? -1.6 : 1.6) })));
FG.NESTS.forEach(([u, v], i) => ["mg", "ag", "r"].forEach((role, j) => RED.push({ id: `s${i}${j}`, kind: "nest", role, u: u - [0, 1.2, -0.6][j], v: v + [0, 1.7, -1.6][j], nest: i })));
for (let j = 0; j < 12; j++) RED.push({ id: `c${j}`, kind: "ctr", role: j === 2 ? "tl" : "r", rank: j % 2, file: Math.floor(j / 2) });
RED.forEach((m, i) => { m.slot = i; });
// front-trench slots, filled from the centre outward so the attack's lane is as full as the rest
const SLOTS = RED.map((_, i) => (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 5.9 + FG.V0).sort((a, b) => Math.abs(a - FG.V0) - Math.abs(b - FG.V0));
// the order the defenders go down: in elastic, a man in each line the attack passes, then the
// counterattack force; in rigid, the men in the trench nearest the attack's lane first
const RED_ORDER_E = ["o10", "m10", "s01", "s12", "o21", "s22"];
const RED_ORDER_C = ["c0", "c3", "c4", "c7", "c8"];
const RED_ORDER_R = RED.map((m, i) => ({ id: m.id, d: Math.abs(SLOTS[i] - FG.V0) + 0.01 * i })).sort((a, b) => a.d - b.d).map((x) => x.id);
// the attackers: three waves of eight; each has a Lewis gunner and a leader
const BLUE = [];
for (let k = 0; k < FG.WAVES; k++) for (let j = 0; j < FG.PER; j++) BLUE.push({ id: `b${k}${j}`, wave: k, j, role: j === 2 ? "ar" : j === 5 ? "tl" : "r" });
const BLUE_ORDER = [];
for (let k = 0; k < FG.WAVES; k++) for (const j of [3, 6, 0, 4, 7, 1, 5, 2]) BLUE_ORDER.push(`b${k}${j}`);

// The counterattack force's centre, facing and motion for a state (elastic only).
function counterForce(S, m = MODEL) {
  const G = FG, SF = G.SF;
  const A = { u: G.WAIT[0], v: G.WAIT[1] };
  const lead = SF * S.d;
  if (S.phase === "restored") return { u: SF * stages(m)[1] + 7, v: G.SWEEP_V, face: FACE_H, moving: false, pose: "kneel", fire: 0.35 };
  if (S.phase !== "counter") {
    const [ax, ay] = W(A.u, A.v), [bx, by] = W(60, 20);
    return { u: A.u, v: A.v, face: angTo(ax, ay, bx, by), moving: false, pose: "kneel", fire: 0 };
  }
  const cC = (m.strike - S.d0) / (m.strike - stages(m)[1]);
  const ap = cC > 1e-6 ? clamp01(S.c / cC) : 1;
  const B = { u: SF * S.d0 + 7, v: G.STRIKE_V };
  if (ap < 1) {
    const e = smooth(ap);
    const u = A.u + (B.u - A.u) * e, v = A.v + (B.v - A.v) * e;
    const [ax, ay] = W(A.u, A.v), [bx, by] = W(B.u, B.v);
    return { u, v, face: angTo(ax, ay, bx, by), moving: true, pose: "stand", fire: 0 };
  }
  const k = thrown(S, m);
  const u = lead + 7, v = G.STRIKE_V - (G.STRIKE_V - G.SWEEP_V) * k;
  const [cx, cy] = W(u, v), [tx, ty] = W(lead - 4, G.V0);
  return { u, v, face: angTo(cx, cy, tx, ty), moving: k < 0.995, pose: k < 0.995 ? "stand" : "kneel", fire: 0.85 };
}

// Where every soldier stands and who fires at whom, for a model state.
export function fieldPose(S, MODEL_, T, M = {}) {
  const m = MODEL_ || MODEL;
  const G = FG, SF = G.SF;
  const men = [];
  const byId = {};
  const add = (p) => { const [x, y] = W(p.u, p.v); p.x = x; p.y = y; p.z = T.height(x, y); men.push(p); byId[p.id] = p; return p; };
  const rigid = S.mode === "rigid";
  const bunch = S.bunch ?? (rigid ? 1 : 0);
  const lead = SF * S.d;
  const phase = S.phase;
  const contact = phase === "counter" && faceDepth(S.c, m) <= S.d0 + 1e-9;
  const k = thrown(S, m);
  const advancing = phase === "attack";
  const ejected = phase === "counter" && contact && k < 0.995;
  const loss = casualties(S, m);

  // --- the attackers: three waves in extended line ---
  const aPose = advancing ? "stand" : ejected ? "stand" : phase === "ready" || phase === "reset" ? "kneel" : "prone";
  for (const b of BLUE) {
    const u = lead - G.GAP * b.wave + 2.2 * jit(b.j, b.wave) - (aPose === "prone" ? 2.5 : 0);
    const v = G.V0 + (b.j - (G.PER - 1) / 2) * G.SPACE + 1.4 * jit(b.wave, b.j);
    const moving = advancing || ejected || (phase === "reset" && Math.abs(lead - SF * m.start) > 1);
    const back = ejected || (phase === "reset" && lead > SF * m.start + 1);
    add({ id: b.id, side: "f", lit: true, role: b.role, wave: b.wave, pose: moving ? "stand" : aPose,
      face: back ? FACE_H : FACE_F, stride: moving ? strideAt(u + b.j * 1.3) : 0, u, v });
  }

  // --- the defenders ---
  const cf = counterForce(rigid ? { ...S, phase: "ready" } : S, m);
  const fleeing = rigid && S.broken;
  const past = Math.max(0, lead - G.U_FRONT);
  const fleeU = fleeing ? Math.min(past + 18 * smooth(past / 20), 115) : 0;
  for (const r of RED) {
    // spread (elastic) position
    let eu = r.u, ev = r.v, ePose = "hole", eFace = FACE_H, eMove = false;
    if (r.kind === "ctr") {
      const lat = (r.file - 2.5) * 4.4 + 1.2 * jit(r.file, r.rank), back = -4.5 * r.rank + 1.4 * jit(r.rank, r.file);
      // offsets in the force's own frame (back along its facing, lateral across it)
      const a = cf.face * FS_RAD;
      const [cx, cy] = W(cf.u, cf.v);
      const x = cx + back * Math.cos(a) - lat * Math.sin(a), y = cy + back * Math.sin(a) + lat * Math.cos(a);
      eu = -x; ev = -y; ePose = cf.pose; eFace = cf.face; eMove = cf.moving;
    }
    // front-trench (rigid) position
    const tu = G.U_FRONT + 0.6 * jit(r.slot, 3), tv = SLOTS[r.slot];
    let u = eu + (tu - eu) * bunch, v = ev + (tv - ev) * bunch;
    let pose = bunch > 0.98 ? "hole" : bunch < 0.02 ? ePose : "stand";
    let face = bunch > 0.02 && bunch < 0.98 ? angTo(...W(eu, ev), ...W(tu, tv)) : bunch >= 0.98 ? FACE_H : eFace;
    let moving = (bunch > 0.02 && bunch < 0.98) || (bunch < 0.02 && eMove);
    if (fleeing && bunch > 0.98) {
      u = tu + fleeU + 3 * jit(r.slot, 5);
      const runningNow = advancing;
      pose = runningNow ? "stand" : "prone"; face = runningNow ? FACE_F : FACE_H; moving = runningNow;
    }
    add({ id: r.id, side: "h", role: r.role, kind: r.kind, pose, face, stride: moving ? strideAt(u * 0.9 + v * 0.5 + r.slot) : 0, u, v, home: bunch > 0.98 ? tu : u });
  }

  // --- casualties: the model's counts, greyed and still, lying where they fell ---
  const fall = (p, u, pose = "prone") => { p.side = p.side === "f" ? "fc" : "hc"; p.lit = false; p.pose = pose; p.stride = 0; p.u = u; const [x, y] = W(p.u, p.v); p.x = x; p.y = y; p.z = T.height(x, y); p.down = true; };
  {
    // attackers: per-km losses fall where their wave was when the lead was at that depth; the rest
    // fall where the counterattack (elastic) or the wire, trench or run (rigid) caught them
    const E = LOSS.elastic.blue, R = LOSS.rigid.blue, N = FORCE.blue;
    BLUE_ORDER.slice(0, loss.blue).forEach((id, i) => {
      const p = byId[id], wave = BLUE[BLUE.findIndex((b) => b.id === id)].wave;
      let d;
      if (!rigid) {
        const dk = (i + 0.5) / (N * E.perKm);
        if (dk <= Math.max(0, S.dm)) d = dk;
        else { const nPer = Math.floor(N * E.perKm * Math.max(0, S.dm) + 0.5); const f = clamp01((i - nPer + 0.5) / (N * E.counter)); d = S.d0 - f * (S.d0 - S.d); }
      } else {
        const nA = N * R.approach;
        if (i < nA) d = m.start + clamp01((i + 0.5) / nA) * (m.homes[0] - m.start);
        else if (phase === "held") d = m.homes[0] - 0.02;
        else d = Math.min(S.d, ((i - nA + 0.5) / (N * R.through)) * (m.homes[3] - 0.06));
      }
      fall(p, SF * d - G.GAP * wave + 2.2 * jit(p.v, 7) - 1.5);
    });
    if (loss.blue > 0) {
      // the first casualty has been carried back to the collection point, with a stretcher-bearer beside him
      const p = byId[BLUE_ORDER[0]];
      p.u = G.CCP[0]; p.v = G.CCP[1]; p.face = FACE_F - 90; const [x, y] = W(p.u, p.v); p.x = x; p.y = y; p.z = T.height(x, y);
      add({ id: "b-med", side: "f", role: "r", pose: "kneel", face: FACE_F - 90, stride: 0, u: G.CCP[0] + 0.6, v: G.CCP[1] - 4 });
    }
    // defenders: in place (elastic: at their posts or in the counterattack's sweep; rigid: in the trench)
    let order;
    if (!rigid) {
      const nPer = Math.min(RED_ORDER_E.length, Math.floor(FORCE.red * LOSS.elastic.red.perKm * Math.max(0, S.dm) + 0.5));
      order = [...RED_ORDER_E.slice(0, nPer), ...RED_ORDER_C, ...RED_ORDER_E.slice(nPer)];
    } else order = RED_ORDER_R;
    order.slice(0, loss.red).forEach((id) => { const p = byId[id]; if (!p.down) fall(p, rigid ? p.home + 0.4 : p.u + (p.pose === "hole" ? 0.4 : 0)); });
  }

  // --- fire ---
  const aim = (p) => trAimPoint(p, p.x, p.y, p.z);
  const muzzle = (p) => trMuzzle(p, p.x, p.y, p.z);
  const attackers = men.filter((p) => p.side === "f" && p.id !== "b-med");
  const defenders = men.filter((p) => p.side === "h");
  const near = (p, list, r) => list.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) < r).map(aim);
  const streams = [];
  const live = phase !== "ready" && phase !== "reset";
  const inFight = advancing ? 1 : phase === "stalled" || phase === "held" ? 1 : phase === "counter" ? 0.7 : phase === "restored" ? 0.25 : 0;
  // defenders: machine guns and riflemen in positions fire at attackers in range (the strongpoints
  // across the attack's flank); the counterattack's front rank fires as it closes
  defenders.forEach((p, i) => {
    if (!live || p.pose === "stand") return;
    const mg = p.role === "mg";
    if (p.kind === "ctr") {
      if (!(cf && cf.fire > 0) || (+p.id.slice(1)) % 2) return;
      const to = near(p, attackers, 80);
      streams.push({ id: p.id, side: "h", from: muzzle(p), to, period: 2.1 + 0.2 * i % 1, burst: 1, gap: 0.1, flight: 0.38, phase: i * 0.37, on: cf.fire, scatter: 2.4 });
      return;
    }
    if (!(mg || p.role === "r") || (p.role === "r" && i % 2)) return;
    const to = near(p, attackers, mg ? 95 : 55);
    if (!to.length) return;
    streams.push({ id: p.id, side: "h", heavy: mg, from: muzzle(p), to, period: mg ? 2.0 + 0.13 * (i % 3) : 2.8 + 0.21 * (i % 4), burst: mg ? 3 : 1, gap: 0.09, flight: mg ? 0.45 : 0.4, phase: i * 0.53, on: (mg ? 0.95 : 0.6) * inFight, scatter: 2.6 });
  });
  // attackers: Lewis gunners and leaders fire while their wave is down
  attackers.forEach((p, i) => {
    if (p.pose !== "prone" || (p.role !== "ar" && p.role !== "tl")) return;
    const to = near(p, defenders.filter((q) => q.pose !== "stand"), 90);
    if (!to.length) return;
    streams.push({ id: p.id, side: "f", heavy: p.role === "ar", from: muzzle(p), to, period: p.role === "ar" ? 1.9 : 2.7, burst: p.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.42, phase: i * 0.41, on: phase === "restored" ? 0.3 : 0.8, scatter: 2.2 });
  });
  // artillery as shell bursts (a flash, a puff and drifting smoke at the point of impact): the
  // attackers' barrage creeping ahead of the waves; the defenders' fire behind the stalled attack
  const burst = (side, u, v, i, on) => {
    const [x, y] = W(u, v), z = T.height(x, y);
    streams.push({ id: `${side}a${i}`, side, heavy: true, smoke: true, from: [x, y, z + 0.5], to: [[x, y, z]], period: 1.7 + 0.31 * (i % 4), burst: 1, gap: 0, flight: 0.05, phase: i * 0.43, on, scatter: 0.3 });
  };
  if (advancing && !(rigid && S.broken)) {
    const ub = rigid ? G.U_FRONT : lead + 28;
    const vs = rigid ? [-60, -36, -12, 8, 30, 54] : [-70, -40, -12, 14, 40, 66];
    vs.forEach((v, i) => burst("f", ub + 6 * jit(i, 2) + (rigid ? 0 : 8 * (i % 2)), v + 6 * jit(2, i), i, 0.85));
  }
  if (phase === "stalled" || phase === "held" || (phase === "counter" && !contact)) {
    [-22, -6, 10].forEach((v, i) => burst("h", lead - G.GAP * (G.WAVES - 1) - 14 + 5 * jit(i, 4), v, 10 + i, 0.8));
  }
  return { men, streams, lead, k, cf, loss, bunch };
}

// Per-state ground marks: each manned strongpoint's machine-gun sector (red), fading out of the fight.
export function fieldMarks(K, P, T, pose) {
  let out = "";
  if (pose.bunch > 0.02) return out;
  FG.NESTS.forEach((_, i) => {
    const p = pose.men.find((q) => q.id === `s${i}0`);
    if (!p || p.pose !== "hole" || p.side !== "h") return;
    const a = FACE_H + (FG.NESTS[i][1] > 0 ? -18 : 18);
    out += trFan(K, P, T, p.x, p.y, 6, 40, a - 24, a + 24, { side: "h", arcs: 1, alpha: 0.5 });
  });
  return out;
}
