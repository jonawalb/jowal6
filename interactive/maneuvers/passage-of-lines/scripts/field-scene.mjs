// The Battlefield view of Passage of Lines and Relief in Place, drawn with the terrain kit
// (../../kit/terrain.mjs). The same run state as the machine drives it (model.mjs stateAt): S.pl[i].sigma
// and .out for each platoon, S.downFT/S.downET when each man went down, S.passed for the handover.
// World: x across (the passing force moves toward +x, toward the enemy), y toward the viewer. Everything
// is a pure function of S. A platoon is drawn as a squad (the passing or incoming force) or a fire team
// (the stationary or outgoing force); sizes are notional.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdSpline } from "../../kit/field.mjs";
import { MODEL, SIG, stateAt, clamp } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHole, trNest, trHouse, trChalk, trObjective, trMuzzle, trAimPoint, trRoute } from "../../kit/terrain.mjs";

const RAD = Math.PI / 180;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const faceTo = (a, b) => ((Math.atan2(b[1] - a[1], b[0] - a[0]) / RAD) % 360 + 360) % 360;

export const FG = {
  world: { x: -260, y: -230, w: 520, d: 400 },
  AAX: -84, CPX: -46, PPX: -4, BHLX: 30, APX: 60, HX: 2,
  LANEY: [-24, 24],               // passage lanes between the stationary platoon positions
  ROWY: [-48, 0, 48],             // the three stationary (outgoing) platoon positions
  AAY: [-40, 40, 0],              // where the passing platoons wait, in the assembly area
  APY: [-24, 24, 0],              // assault positions
  LANE_OF: [0, 1, 0],
  HOLD: [0, 0, 28],               // how far back from the contact point a platoon waits for a lane that is in use
  OUTPOST: [[94, -22], [100, -8], [96, 8], [102, 22], [110, -14], [112, 14]],
  OBJ: [106, 0],
  LAG: 3.6,
  SPEED_ON: 11,                   // units per s on the onward leg, to finish a squad's arrival
  KILL_ORDER: ["e2", "e3", "e0", "e5", "e1", "e4"],
  DOWN_PASS: ["a0_3", "a1_4", "a0_6", "a1_2"],
  DOWN_RELIEF: ["s1_0", "a1_0", "s0_1", "a0_1", "s2_2"],
};
FG.TERRAIN = { rises: [{ cx: 104, cy: 0, r: 40, steps: 2, h: 1.3, top: 0.7, seed: 83, wobble: 0.08 }] };
export const fieldTerrain = () => trTerrain(FG.TERRAIN);

const ROLES = ["sl", "tl", "ar", "gr", "r", "tl", "ar", "gr", "r"];
const NSQ = 9;
// staging block in the assembly area: three columns by three rows
const STAGE = (i, j) => [FG.AAX - (j % 3) * 4.2, FG.AAY[i] + (Math.floor(j / 3) - 1) * 4.4];
const AP = (i, j) => [FG.APX + (j % 3) * -3.6 + 4, FG.APY[i] + (j - 4) * 3.4];
const lane = (i) => FG.LANEY[FG.LANE_OF[i]];

// A soldier's whole route: stage, the gate out of the assembly area, the holding point, the contact point,
// the passage point, the BHL and the assault position. Distances to the waypoints let the model's sigma
// land on them.
function mk(pts) {
  const rt = trRoute(pts, 3);
  const mark = (pt) => { let best = 0, bd = 1e9; for (let s = 0; s <= rt.length; s += 0.5) { const q = rt.at(s); const d = Math.hypot(q.x - pt[0], q.y - pt[1]); if (d < bd) { bd = d; best = s; } } return best; };
  return { rt, mark };
}
const PASS = [0, 1, 2].map((i) => Array.from({ length: NSQ }, (_, j) => {
  const G = [FG.AAX + 8, FG.AAY[i]];
  const ly = lane(i);
  const H = [FG.CPX - FG.HOLD[i], ly], CP = [FG.CPX, ly], PP = [FG.PPX, ly + (j % 2 ? 1.2 : -1.2)], B = [FG.BHLX, ly], A = AP(i, j);
  const pts = [STAGE(i, j), G, H, CP, PP, B, A];
  const r = mk(pts);
  return { ...r, g: r.mark(G), h: r.mark(H), cp: r.mark(CP), b: r.mark(B), end: r.rt.length, stage: STAGE(i, j), G };
}));
const HOLEX = FG.HX;
const HOLES = [0, 1, 2].map((i) => [[HOLEX, FG.ROWY[i] - 6], [HOLEX, FG.ROWY[i] + 6]]);
const RESERVE = (i, j) => [HOLEX - 14, FG.ROWY[i] + (j - 6) * 3.2];
const INCOMING = [0, 1, 2].map((i) => Array.from({ length: NSQ }, (_, j) => {
  const G = [FG.AAX + 8, FG.ROWY[i]];
  const dest = j < 4 ? [HOLES[i][j % 2][0] - 3.2, HOLES[i][j % 2][1] + (j < 2 ? -1.6 : 1.6)] : RESERVE(i, j);
  const r = mk([[FG.AAX - (j % 3) * 4.2, FG.ROWY[i] + (Math.floor(j / 3) - 1) * 4.4], G, [FG.CPX, FG.ROWY[i]], dest]);
  return { ...r, g: r.mark(G), end: r.rt.length, stage: [FG.AAX - (j % 3) * 4.2, FG.ROWY[i] + (Math.floor(j / 3) - 1) * 4.4], G };
}));
const OUTGOING = [0, 1, 2].map((i) => Array.from({ length: 4 }, (_, j) => {
  const h = HOLES[i][j % 2], start = [h[0] + (j < 2 ? 0 : 3.2), h[1] + (j < 2 ? 0 : 1.6)];
  const r = mk([start, [-12, FG.ROWY[i] + 16], [FG.CPX, FG.ROWY[i] + 18], [FG.AAX - 6, FG.ROWY[i] + 26 - (j % 2) * 4]]);
  return { rt: r.rt, end: r.rt.length, start };
}));

// distance of the lead along its route for platoon i at plan time t (passage): the model's sigma lands
// on the waypoints, and after the run the lead keeps walking so the tail arrives
function leadDist(i, S) {
  const p = S.plan, q = S.pl[i], R = PASS[i][0];
  const s = q.sigma;
  const g = R.g, h = R.h, b = R.b, cp = R.cp;
  let d;
  if (s <= SIG.cp) d = g + (h - g) * (s / SIG.cp);
  else if (s <= SIG.bhl) d = h + (b - h) * ((s - SIG.cp) / (SIG.bhl - SIG.cp));
  else d = b + (R.end - b) * ((s - SIG.bhl) / (1 - SIG.bhl));
  if (s >= 1) d += Math.max(0, S.t - p.done[i]) * FG.SPEED_ON;
  return d;
}
const lerp2 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
function routeSoldier(R, d, j) {
  // d: the lead's distance from the staging start; the soldier trails it by LAG per place
  const u = d - j * FG.LAG - R.g;     // distance beyond the gate; negative = still in the staging block
  if (u >= 0) { const q = R.rt.at(Math.min(R.end, R.g + u)); return { x: q.x, y: q.y, face: q.face, mv: u < R.end - R.g - 0.2 }; }
  const back = Math.min(1, -u / Math.max(1, R.g));
  const p = lerp2(R.G, R.stage, back);
  return { x: p[0], y: p[1], face: faceTo(p, R.G), mv: back < 0.98 && back > 0.02 };
}
function passPos(i, j, S, tOverride) {
  const st = tOverride === undefined ? S : stateAt(S.cfg, tOverride, true);
  const R = PASS[i][j];
  const d = leadDist(i, st);
  const q = routeSoldier(R, d, j);
  return { ...q, ph: st.pl[i].ph };
}
function reliefIn(i, j, S) {
  const R = INCOMING[i][j];
  const q = S.pl[i];
  const total = R.end - R.g;
  const d = R.g + q.sigma * total - j * FG.LAG * (1 - q.sigma);
  const u = d - R.g;
  if (u >= 0) { const p = R.rt.at(Math.min(R.end, d)); return { x: p.x, y: p.y, face: q.sigma >= 1 ? 0 : p.face, mv: q.sigma > 0 && q.sigma < 1 && u < total - 0.2 }; }
  const back = Math.min(1, -u / Math.max(1, R.g));
  const p = lerp2(R.G, R.stage, back);
  return { x: p[0], y: p[1], face: faceTo(p, R.G), mv: back < 0.98 && back > 0.02 };
}
function reliefOut(i, j, S) {
  const R = OUTGOING[i][j], q = S.pl[i];
  const prog = 1 - q.out;                     // 0 in the hole .. 1 at the rear
  const d = Math.max(0, prog * (R.end + j * 2) - j * 2);
  const p = R.rt.at(d);
  return { x: p.x, y: p.y, face: prog <= 0 ? 0 : p.face, mv: prog > 0 && prog < 1 && d < R.end - 0.2 };
}

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[-60, 100, 80, 3, 0.55], [90, 96, 70, 4, 0.5], [0, -150, 90, 5, 0.5], [-210, -30, 40, 6, 0.8], [210, -30, 40, 9, 0.8]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.1, 40, sq)));
  const fields = [
    [[[-250, 84], [-170, 80], [-166, 140], [-246, 144]], 8, "a"],
    [[[170, 84], [248, 80], [250, 140], [172, 144]], 8, "b"],
    [[[-250, -150], [-190, -154], [-186, -214], [-248, -218]], 7, "b"],
    [[[190, -150], [248, -146], [250, -210], [192, -214]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  g(trRoad(K, P, [[-300, 118], [-150, 112], [0, 118], [150, 112], [300, 116]], 3));
  g(trStream(K, P, [[-300, -190], [-180, -184], [-60, -192], [60, -184], [180, -192], [300, -186]], 3, 5));
  const woods = [
    [fdBlob(-140, 84, 20, 61, 0.14, 40, 0.8), 12, 62],
    [fdBlob(-60, -100, 28, 63, 0.14, 40, 0.8), 16, 64],
    [fdBlob(60, 100, 18, 65, 0.12, 40, 0.9), 9, 66],
    [fdBlob(150, -90, 22, 67, 0.12, 40, 0.8), 12, 68],
    [fdBlob(-150, -70, 16, 73, 0.12, 40, 0.9), 8, 74],
    [fdSpline([[-260, -140], [-120, -148], [0, -150], [120, -148], [260, -140], [260, -166], [0, -170], [-260, -166]], 3, true), 26, 69],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-250, 84], [-170, 80]], 71], [[[170, 84], [248, 80]], 72]]) items.push(...trHedge(K, P, pts, { seed }));
  g(trRelief(K, P, T));

  // the stationary unit's three platoon positions: two fighting holes each, a machine gun nest in the middle one
  for (let i = 0; i < 3; i++) for (const [x, y] of HOLES[i]) items.push(...trHole(K, P, x, y, T.height(x, y), 0));
  items.push(...trNest(K, P, HOLEX + 2, FG.ROWY[1] + 12, 0, 0));
  // the enemy outpost on the rise
  for (const [x, y] of G.OUTPOST) items.push(...trHole(K, P, x, y, T.height(x, y), 180));
  items.push(trHouse(K, P, 124, -38, 100, 14, 9));

  // control measures: the battle handover line (open chalk), the lane edges (chalk), contact points and
  // passage points (flags)
  const bhl = trChalk(K, P, T, [[G.BHLX, -78], [G.BHLX, -26], [G.BHLX, 26], [G.BHLX, 78]], { closed: false });
  g(bhl.ground.replace("tr-chalk", "tr-chalk pl-bhl"));
  items.push(...bhl.items);
  for (const ly of G.LANEY) for (const dy of [-8, 8]) {
    const e = trChalk(K, P, T, [[G.CPX, ly + dy], [G.PPX + 10, ly + dy]], { closed: false });
    g(e.ground.replace("tr-chalk", "tr-chalk pl-lane"));
    items.push(...e.items);
  }
  for (const ly of G.LANEY) {
    items.push(trObjective(K, P, T, G.CPX - 6, ly - 10, { h: 9 }));            // contact point: one flag
    items.push(trObjective(K, P, T, G.PPX, ly - 11, { h: 7 }));               // passage point
  }
  items.push(trObjective(K, P, T, G.OBJ[0] + 6, G.OBJ[1] - 20, { h: 12 }));
  return { ground: ground.join(""), items };
}

// Where every figure stands and who fires at whom for state S (stateAt) at its time S.t.
export function fieldPose(S, T) {
  const G = FG;
  const men = [];
  const add = (p) => { p.z = T.height(p.x, p.y); men.push(p); return p; };
  const relief = S.mode === "relief";
  const p = S.plan;

  // ---- the casualties first: where each man was when he went down ----
  const downF = new Map();
  const ids = relief ? G.DOWN_RELIEF : G.DOWN_PASS;
  S.downFT.forEach((tf, k) => downF.set(ids[k % ids.length], tf));
  const alive = [];
  const posOfId = (id, tf) => {
    const t = stateAt(S.cfg, tf, true);
    const [kind, rest] = [id[0], id.slice(1)];
    const [a, b] = rest.split("_").map(Number);
    if (kind === "a") return relief ? reliefIn(a, b, t) : passPos(a, b, t);
    return relief ? reliefOut(a, b, t) : { x: HOLES[a][b % 2][0], y: HOLES[a][b % 2][1] };
  };
  const down = (id) => {
    const tf = downF.get(id);
    if (tf === undefined || S.t < tf) return false;
    const q = posOfId(id, tf);
    add({ id, side: "fc", role: "r", pose: "prone", face: 200 + (id.charCodeAt(1) * 13 % 5 - 2) * 12, stride: 0, x: q.x, y: q.y + 1.5 });
    return true;
  };

  // ---- the passing (or incoming) force: three squads, lit ----
  for (let i = 0; i < 3; i++) for (let j = 0; j < NSQ; j++) {
    const id = `a${i}_${j}`;
    if (down(id)) continue;
    const q = relief ? reliefIn(i, j, S) : passPos(i, j, S);
    const inHole = relief && j < 4 && !q.mv && S.pl[i].sigma >= 1;
    const waiting = !q.mv;
    const settled = relief ? S.pl[i].sigma >= 1 : S.t >= p.done[i] + 3;
    const pose = q.mv ? "stand" : inHole ? "hole" : relief && j >= 4 && S.pl[i].sigma >= 1 ? "kneel" : settled ? "kneel" : waiting ? "stand" : "kneel";
    const m = add({ id, side: "f", lit: true, role: ROLES[j], pose, face: q.face, stride: q.mv ? strideAt(S.t * 14 + j * 3 + i * 5) : 0, x: q.x, y: q.y, group: "a", i, j });
    alive.push(m);
  }
  // ---- the stationary (outgoing) force: a fire team in each position ----
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
    const id = `s${i}_${j}`;
    if (down(id)) continue;
    const h = HOLES[i][j % 2];
    const q = relief ? reliefOut(i, j, S) : { x: h[0] + (j < 2 ? 0 : 3.2), y: h[1] + (j < 2 ? 0 : 1.6), face: 0, mv: false };
    const inHole = !q.mv && (!relief || S.pl[i].out >= 1);
    const m = add({ id, side: "f", role: ["tl", "ar", "gr", "r"][j], pose: inHole ? "hole" : q.mv ? "stand" : "kneel", face: q.face || 0, stride: q.mv ? strideAt(S.t * 14 + j * 3) : 0, x: q.x, y: q.y, group: "s", i, j });
    alive.push(m);
  }
  // ---- guides: the stationary unit posts one at each contact point and each passage point ----
  const guides = [];
  for (let li = 0; li < 2; li++) {
    const ly = G.LANEY[li];
    for (const [id, x, y] of [[`g${li}c`, G.CPX + 3, ly + 3], [`g${li}p`, G.PPX + 3, ly + 3]]) {
      guides.push(add({ id, side: "f", role: "r", pose: "stand", face: 180, stride: 0, x, y, group: "g" }));
    }
  }

  // ---- the outpost: six defenders in holes; the down ones lie still ----
  const eDown = new Set(G.KILL_ORDER.slice(0, S.downE));
  const eAlive = [];
  G.OUTPOST.forEach(([x, y], k) => {
    const id = "e" + k;
    if (eDown.has(id)) { add({ id, side: "hc", role: "r", pose: "prone", face: 320 + ((x * 7) % 5) * 8, stride: 0, x: x + 3, y: y - 3 }); return; }
    eAlive.push(add({ id, side: "h", role: k % 3 === 0 ? "mg" : "r", pose: "hole", face: 180, stride: 0, x, y }));
  });

  // ---- fire ----
  const streams = [];
  const aim = (q) => trAimPoint(q, q.x, q.y, q.z);
  const mz = (q) => trMuzzle(q, q.x, q.y, q.z);
  const eT = eAlive.map(aim);
  if (!relief && S.released) {
    // the stationary unit supports the passage with direct fires until the passing force masks them
    const sOn = S.t >= 1 && S.t < p.T2 + 2;
    if (sOn && eT.length) alive.filter((q) => q.group === "s").forEach((q, k) => {
      streams.push({ id: q.id, side: "f", heavy: q.role === "ar", from: mz(q), to: eT, period: 1.7 + (k % 4) * 0.23, burst: q.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.9, phase: k * 0.31, on: 0.75, scatter: 3 });
    });
    // the passing platoons hold their fire until they cross the BHL, then fire from the assault position
    for (let i = 0; i < 3; i++) if (S.t >= p.bhl[i] + 1.2 && S.t < p.end && eT.length) {
      alive.filter((q) => q.group === "a" && q.i === i && q.x > G.BHLX).forEach((q, k) => {
        streams.push({ id: q.id, side: "f", heavy: q.role === "ar", from: mz(q), to: eT, period: 1.8 + (k % 4) * 0.25, burst: 1, gap: 0.1, flight: 0.9, phase: 0.2 + k * 0.21, on: 0.7, scatter: 3 });
      });
    }
    // the enemy fires on the area; the salvo is a short, heavy burst on whoever is there
    const tg = alive.filter((q) => q.group === "a" && q.x > G.CPX - 40 && q.x < G.BHLX + 4).map(aim);
    const sal = S.t >= MODEL.salvo && S.t < MODEL.salvo + 1.4;
    if (tg.length && S.t >= 3 && S.t < p.T2 + 2) eAlive.forEach((q, k) => {
      streams.push({ id: q.id, side: "h", heavy: q.role === "mg", from: mz(q), to: tg, period: 1.6 + k * 0.23, burst: sal ? 3 : 1, gap: 0.12, flight: 0.8, phase: 0.4 + k * 0.31, on: sal ? 0.95 : 0.3, scatter: 6, smoke: sal });
    });
  }
  if (relief && S.released) {
    const plan = S.plan;
    const tg = alive.filter((q) => q.x > G.CPX && q.x < G.HX + 12).map(aim);
    const sal = S.t >= MODEL.reliefSalvo && S.t < MODEL.reliefSalvo + 1.4;
    if (tg.length && S.t >= MODEL.reliefSalvo - 0.5 && S.t < MODEL.reliefSalvo + 3) eAlive.forEach((q, k) => {
      streams.push({ id: q.id, side: "h", heavy: q.role === "mg", from: mz(q), to: tg, period: 1.5 + k * 0.23, burst: plan.detected && sal ? 3 : 1, gap: 0.12, flight: 0.8, phase: 0.4 + k * 0.31, on: plan.detected ? (sal ? 0.95 : 0.4) : 0.18, scatter: 6, smoke: plan.detected && sal });
    });
    if (eT.length && S.t >= MODEL.reliefSalvo && S.t < MODEL.reliefSalvo + 3.5) {
      alive.filter((q) => q.group === "s" || (q.group === "a" && q.j < 4 && S.pl[q.i].sigma >= 1)).forEach((q, k) => {
        streams.push({ id: q.id, side: "f", heavy: q.role === "ar", from: mz(q), to: eT, period: 1.8 + (k % 4) * 0.25, burst: 1, gap: 0.1, flight: 0.9, phase: 0.2 + k * 0.21, on: plan.detected ? 0.7 : 0.25, scatter: 3 });
      });
    }
  }
  return { men, streams };
}
