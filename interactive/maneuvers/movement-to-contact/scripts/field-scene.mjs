// The Battlefield view of Movement to Contact: a company moving to contact, drawn with the terrain kit
// (../../kit/terrain.mjs). The same run state as the machine drives it (model.mjs stateAt): S.sLead the
// lead squad along the axis of advance, S.sBody the head of the main body, S.dep the main body's
// shake-out from column to line, S.plan.leadT / S.plan.bodyT when each man went down, S.downE the
// defenders. Everything is a pure function of S.
// World: x along the axis of advance (left to right), y toward the viewer. world x = 0.17 * s.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdSpline } from "../../kit/field.mjs";
import { MODEL, clamp, ease } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHole, trNest, trHouse, trChalk, trSquad, trPlace, trMorph, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

const KS = 0.17;                          // world units per model unit along the axis
export const xOf = (s) => s * KS;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];

export const FG = {
  world: { x: -260, y: -230, w: 520, d: 400 },
  AXIS_Y: 2,
  ENEMY: [   // defenders: id, position, kind (m = machine-gun nest)
    { id: "e0", x: 80, y: -20 }, { id: "e1", x: 88, y: -10, m: true }, { id: "e2", x: 81, y: 0 },
    { id: "e3", x: 90, y: 9, m: true }, { id: "e4", x: 83, y: 18 }, { id: "e5", x: 94, y: -2 },
  ],
  KILL_ORDER: ["e1", "e3", "e0", "e4", "e2", "e5"],
  LINE_S: MODEL.SC,                       // the edge of the enemy's reach
};
FG.TERRAIN = {
  rises: [
    { cx: 90, cy: -2, r: 25, steps: 2, h: 1.3, top: 0.7, seed: 81, wobble: 0.08 },
  ],
};
export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---- who is drawn ----
const BODY_ROLES = ["pl", "tl", "ar", "gr", "r", "tl", "ar", "gr", "r"];
const CP_ROLES = ["pl", "rto", "r"];
const DN_LEAD = ["l8", "l5", "l7", "l2"];                 // the lead squad's men go down in this order
const DN_BODY = ["b4", "b13", "b3", "b12", "b2", "b11"];   // the main body's, in this order

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[-60, 90, 80, 3, 0.55], [60, 100, 60, 4, 0.5], [0, -150, 90, 5, 0.5], [-210, -20, 40, 6, 0.8], [215, -30, 40, 9, 0.8]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.1, 40, sq)));
  const fields = [
    [[[-250, 78], [-170, 74], [-166, 138], [-246, 142]], 8, "a"],
    [[[170, 78], [248, 74], [250, 138], [172, 142]], 8, "b"],
    [[[-250, -150], [-190, -154], [-186, -214], [-248, -218]], 7, "b"],
    [[[190, -150], [248, -146], [250, -210], [192, -214]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  g(trRoad(K, P, [[-300, 4], [-160, 2], [-40, 3], [60, 1], [150, -3], [300, -2]], 3));
  g(trRoad(K, P, [[-300, 124], [-150, 118], [0, 122], [150, 116], [300, 120]], 3));
  g(trStream(K, P, [[-300, -192], [-180, -186], [-60, -194], [60, -186], [180, -194], [300, -188]], 3, 5));
  // woods: clear of the road and the troops' lanes
  const clear = (x, y) => (Math.abs(y - G.AXIS_Y) < 56 && x > -150 && x < 130);
  const woods = [
    [fdBlob(-150, 100, 22, 61, 0.14, 40, 0.8), 12, 62],
    [fdBlob(-40, -88, 30, 63, 0.14, 40, 0.8), 18, 64],
    [fdBlob(30, 78, 18, 65, 0.12, 40, 0.9), 9, 66],
    [fdBlob(150, 60, 18, 67, 0.12, 40, 0.8), 9, 68],
    [fdBlob(140, -86, 22, 73, 0.12, 40, 0.9), 11, 74],
    [fdSpline([[-260, -130], [-120, -138], [0, -140], [120, -138], [260, -130], [260, -156], [0, -160], [-260, -156]], 3, true), 26, 69],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0 || clear(x, y) });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-250, 78], [-170, 74]], 71], [[[170, 78], [248, 74]], 72]]) items.push(...trHedge(K, P, pts, { seed }));
  g(trRelief(K, P, T));
  // the enemy position on the rise: four fighting positions and two machine-gun nests, facing the road
  for (const e of G.ENEMY) {
    const z = T.height(e.x, e.y);
    if (e.m) items.push(...trNest(K, P, e.x, e.y, z, 180));
    else items.push(...trHole(K, P, e.x, e.y, z, 180));
  }
  items.push(trHouse(K, P, 114, 12, 90, 15, 9));
  // one control measure: a phase line at the edge of the enemy's reach (an open chalk line)
  const edge = xOf(G.LINE_S);
  const pl = trChalk(K, P, T, [[edge, -66], [edge, -22], [edge, 22], [edge, 66]], { closed: false });
  g(pl.ground);
  items.push(...pl.items);
  return { ground: ground.join(""), items };
}

// Where every figure stands and who fires at whom for state S (stateAt) at its time S.t.
export function fieldPose(S, T) {
  const G = FG;
  const men = [];
  const add = (p) => { p.z = T.height(p.x, p.y); men.push(p); return p; };
  const plan = S.plan;
  const downL = new Set(DN_LEAD.slice(0, plan.leadT.filter((x) => x <= S.t + 1e-9).length));
  const downB = new Set(DN_BODY.slice(0, plan.bodyT.filter((x) => x <= S.t + 1e-9).length));
  const dep = ease(S.dep);
  const moving = S.sBody < MODEL.SSTOP - 0.5;
  const alive = { l: [], b: [] };

  // ---- the lead squad (lit): two fire teams in wedge and the squad leader; goes to ground on contact ----
  if (S.lead) {
    const x = xOf(S.sLead), y = G.AXIS_Y;
    const spread = ease(clamp((S.t - plan.tc) / 1.6));
    const form = trMorph(trSquad("column", "wedge", 3.4), trSquad("line", "wedge", 3.4), spread);
    const placed = trPlace(form, { x, y, face: 0 });
    const going = S.sLead < MODEL.SL - 0.5 && S.t > 0.05;
    placed.forEach((m, i) => {
      const id = "l" + i;
      if (downL.has(id)) { add({ id, side: "fc", role: "r", pose: "prone", face: 200 + ((i * 13) % 5 - 2) * 12, stride: 0, x: m.x, y: m.y }); return; }
      const pose = going ? "stand" : S.contact ? (i % 3 === 0 ? "prone" : "kneel") : "stand";
      alive.l.push(add({ id, side: "f", lit: true, role: m.role, pose, face: m.face, stride: going ? strideAt(S.t * 14 + i * 3) : 0, x: m.x, y: m.y, group: "l" }));
    });
  }

  // ---- the main body: two platoons (a leader and two fire teams each) in two files, and the company headquarters ----
  const xh = xOf(S.sBody);
  const colOf = (p, k) => [-k * 3.4, p ? 5.5 : -5.5];
  const lineOf = (p, k) => [-(k % 2) * 2.2, (p ? 1 : -1) * (16 + k * 4.4)];
  for (let p = 0; p < 2; p++) for (let k = 0; k < 9; k++) {
    const id = "b" + (p * 9 + k);
    const a = colOf(p, k), b = lineOf(p, k);
    const u = a[0] + (b[0] - a[0]) * dep, v = a[1] + (b[1] - a[1]) * dep;
    const x = xh + u, y = G.AXIS_Y + v;
    if (downB.has(id)) { add({ id, side: "fc", role: "r", pose: "prone", face: 190 + ((k * 11) % 5 - 2) * 12, stride: 0, x, y }); continue; }
    const pose = moving && S.t > 0.05 ? "stand" : (S.dep > 0.99 ? "kneel" : "stand");
    alive.b.push(add({ id, side: "f", role: BODY_ROLES[k], pose, face: 0, stride: moving && S.t > 0.05 ? strideAt(S.t * 14 + (p * 9 + k) * 3) : 0, x, y, group: "b" }));
  }
  CP_ROLES.forEach((role, i) => {
    const u = -34 - i * 3.6 + dep * 8, v = (i - 1) * 4;
    add({ id: "c" + i, side: "f", role, pose: moving && S.t > 0.05 ? "stand" : "kneel", face: 0, stride: moving && S.t > 0.05 ? strideAt(S.t * 14 + 40 + i * 3) : 0, x: xh + u, y: G.AXIS_Y + v, group: "c" });
  });

  // ---- the defenders: in positions facing the road; the down ones lie still ----
  const eDown = new Set(G.KILL_ORDER.slice(0, S.downE));
  const eAlive = [];
  for (const e of G.ENEMY) {
    if (eDown.has(e.id)) { add({ id: e.id, side: "hc", role: "r", pose: "prone", face: 320 + ((e.x * 7) % 5) * 8, stride: 0, x: e.x + 3, y: e.y - 3 }); continue; }
    eAlive.push(add({ id: e.id, side: "h", role: e.m ? "mg" : "r", pose: "hole", face: 180, stride: 0, x: e.x, y: e.y }));
  }

  // ---- fire ----
  const streams = [];
  const aim = (p) => trAimPoint(p, p.x, p.y, p.z);
  const mz = (p) => trMuzzle(p, p.x, p.y, p.z);
  const eT = eAlive.map(aim);
  const engaged = S.released && S.t >= plan.tc - 0.4 && eAlive.length;
  // the defenders fire at the lead from the moment of contact, and at the main body once it is in their reach
  if (engaged) {
    const tgt = [...alive.l, ...(S.inRange ? alive.b : [])].map(aim);
    const share = eAlive.length / G.ENEMY.length;
    eAlive.forEach((p, i) => {
      if (!tgt.length) return;
      streams.push({ id: p.id, side: "h", heavy: p.role === "mg", from: mz(p), to: tgt, period: 1.7 + i * 0.23, burst: p.role === "mg" ? 3 : 1, gap: 0.1, flight: 0.7, phase: 0.2 + i * 0.31, on: 0.8 * share + 0.1, scatter: 4 });
    });
  }
  // the lead squad returns fire as it goes to ground
  if (S.contact && eT.length) {
    alive.l.forEach((p, i) => {
      streams.push({ id: p.id, side: "f", heavy: p.role === "ar", from: mz(p), to: eT, period: 1.9 + (i % 4) * 0.25, burst: 1, gap: 0.1, flight: 0.6, phase: 0.1 + i * 0.21, on: S.firing ? 0.5 : 0.7, scatter: 3 });
    });
  }
  // the main body's weapons, once it is shaken out and in range
  if (S.firing && eT.length) {
    alive.b.forEach((p, i) => {
      streams.push({ id: p.id, side: "f", heavy: p.role === "ar", from: mz(p), to: eT, period: 1.5 + (i % 4) * 0.2, burst: p.role === "ar" ? 3 : 1, gap: 0.1, flight: 0.6, phase: 0.05 + i * 0.17, on: 0.9, scatter: 2.4 });
    });
  }
  return { men, streams };
}
