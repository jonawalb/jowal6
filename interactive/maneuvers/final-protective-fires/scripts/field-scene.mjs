// The Battlefield view of Final Protective Fires, at platoon scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same run state as the machine drives it (model.mjs newRun/step):
//   S.x       the enemy assault line's distance in front of the FPL (m); world y = -x here
//   S.called  the FPF has been called;  S.rounds  mortar rounds left (the FPF fires while > 0)
//   S.phase   advancing | breaking | through;  S.downE  where each enemy casualty fell (x)
//   S.downF   friendly men down
// World frame: x runs along the front (left to right as the defender sees it), y toward the
// defender's rear, so the enemy comes from negative y. One world unit is about a metre (notional).
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every soldier and fire stream for a state (build and page); fieldMarks() draws the per-state marks;
// fieldBursts() lists the mortar bursts for a time.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdPolar, fdSweep, fdBlob, fdSpline } from "../../kit/field.mjs";
import { MODEL } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trNest, trWire, trFan, trChalk, trSquad, trPlace, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -230, y: -260, w: 460, d: 420 },
  HOLES: [-50, -38, -26, -14, 14, 26, 38, 50],  // two-man fighting positions along the front (x)
  LINE: 34,           // their depth behind the FPL (y)
  WIRE: 6,            // the wire belt's line (y), from x = -62 to 62
  MG: [[-70, 3], [70, 3]], // MG nests at the ends of the wire, each with its FPL across the front
  FPL_END: [[54, -1.5], [-54, -1.5]],
  BOX: [-30, 30, -32, -2], // the FPF: 60 m wide by 30 m deep (Table B-1, two 60-mm mortars), in front of the wire
  SBF: [74, -112],    // the enemy's support-by-fire team
  PL: [0, 44],        // platoon leader and RTO behind the centre
  CCP: [[-22, 50], [-17, 52], [-12, 50], [-24, 56], [-19, 58], [-14, 56], [-21, 62], [-16, 63], [-26, 61], [-11, 61]],
  MEDIC: [-9, 53],
  // which assault members go down, in order, and which defenders (hole index, man)
  DOWN_E: ["a-3", "b-6", "a-1", "b-2", "a-7", "b-4", "a-5", "b-8", "a-0", "b-1", "a-6", "b-3", "a-2", "b-7", "a-8"],
  DOWN_F: ["h3-0", "h4-1", "h1-0", "h6-1", "h2-1", "h5-0", "h0-1", "h7-0", "h3-1", "h4-0"],
};
FG.TERRAIN = {
  rises: [
    { cx: -170, cy: -150, r: 34, steps: 3, h: 1.6, top: 0.45, seed: 13, wobble: 0.12 },
    { cx: 175, cy: 40, r: 30, steps: 3, h: 1.4, top: 0.5, seed: 19, wobble: 0.12 },
    { cx: 150, cy: -210, r: 26, steps: 2, h: 1.6, top: 0.5, seed: 23, wobble: 0.12 },
  ],
};

const FS_RAD = Math.PI / 180;
const fsHash = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const bearingTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / FS_RAD;

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // open meadow in front of the position (level ground, so the guns get grazing fire), fields beyond
  for (const [cx, cy, r, seed, sq] of [[0, -70, 70, 3, 0.55], [-120, 40, 40, 5, 0.8], [130, -40, 36, 9, 0.7]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.12, 40, sq)));
  const fields = [
    [[[-190, -120], [-110, -126], [-104, -184], [-186, -178]], 9, "a"],
    [[[-80, -196], [10, -200], [14, -250], [-76, -246]], 8, "b"],
    [[[40, -196], [120, -190], [118, -240], [36, -246]], 9, "a"],
    [[[150, -110], [220, -100], [216, -160], [146, -166]], 7, "b"],
    [[[-220, 70], [-150, 64], [-146, 120], [-216, 126]], 7, "b"],
    [[[120, 80], [200, 74], [204, 130], [124, 136]], 8, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // a farm track behind the position, a stream far out on the enemy side
  g(trRoad(K, P, [[-300, 118], [-150, 112], [-40, 106], [60, 110], [180, 100], [300, 108]], 3));
  g(trStream(K, P, [[-320, -232], [-200, -218], [-90, -226], [20, -214], [130, -226], [240, -210], [330, -220]], 3, 5));

  // woods: the treeline the enemy comes out of, the wood behind the position, copses on the flanks
  const keepOpen = (x, y) => y > -126 && y < 80 && Math.abs(x) < 84;   // the field of fire stays open
  const woods = [
    [fdSpline([[-230, -160], [-120, -156], [-40, -162], [40, -158], [130, -164], [230, -158], [230, -192], [130, -188], [40, -194], [-40, -186], [-130, -192], [-230, -188]], 3, true), 70, 31],
    [fdSpline([[-150, 84], [-60, 80], [60, 82], [150, 86], [150, 104], [60, 100], [-60, 100], [-150, 102]], 3, true), 46, 32],
    [fdBlob(-106, -78, 22, 33, 0.14, 40, 0.8), 14, 33],
    [fdBlob(108, -48, 20, 34, 0.14, 40, 0.9), 12, 34],
    [fdBlob(-104, 34, 15, 35, 0.12, 40, 1), 7, 35],
    [fdBlob(104, 50, 14, 36, 0.12, 40, 1), 6, 36],
    [fdBlob(-60, -136, 14, 37, 0.12, 40, 0.8), 6, 37],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => keepOpen(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  // hedges along the fields; the stone wall the enemy's support-by-fire team lies behind
  for (const [pts, seed] of [[[[-190, -120], [-110, -126]], 51], [[[150, -110], [220, -100]], 52], [[[120, 80], [200, 74]], 53], [[[-220, 70], [-150, 64]], 54]]) items.push(...trHedge(K, P, pts, { seed }));
  items.push(...trWall(K, P, [[G.SBF[0] - 14, G.SBF[1] + 4], [G.SBF[0] + 14, G.SBF[1] + 8]]));
  items.push(trHouse(K, P, -176, 96, 0, 13, 8.5), trHouse(K, P, 180, 116, 90, 12, 8));

  g(trRelief(K, P, T));

  // the defended position: two-man holes on the line, the MG nests at the wire's ends, the wire belt
  G.HOLES.forEach((x) => items.push(...trHole(K, P, x, G.LINE, T.height(x, G.LINE), 270)));
  G.MG.forEach(([x, y], i) => items.push(...trNest(K, P, x, y, 0, i ? 225 : 315)));
  const wire = [];
  for (let x = -62; x <= 62.01; x += 9.54) wire.push([x, G.WIRE + 0.6 * Math.sin(x * 0.11)]);
  items.push(...trWire(K, P, T, wire));

  // control measures: the FPF box (a planned target, chalk on pegs) and each gun's FPL
  const [x0, x1, y0, y1] = G.BOX;
  const box = trChalk(K, P, T, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { closed: true });
  // each FPL starts a few metres out from its gun, so the first peg stands clear of the nest
  const fpls = G.MG.map((m, i) => { const e = G.FPL_END[i], L = Math.hypot(e[0] - m[0], e[1] - m[1]); return trChalk(K, P, T, [[m[0] + (e[0] - m[0]) * 7 / L, m[1] + (e[1] - m[1]) * 7 / L], e], { h: 2.6 }); });
  for (const m of [box, ...fpls]) { g(m.ground); items.push(...m.items); }
  return { ground: ground.join(""), items };
}

// Where every soldier stands and who fires at whom, for a run state S. M carries what the page
// measures between frames (vt: the assault's speed, m/s); the build's first frame uses the default.
export function fieldPose(S, T, M = { vt: 30 }) {
  const G = FG, m = MODEL;
  const men = [];
  const add = (p) => { p.z = T.height(p.x, p.y); men.push(p); };
  const firing = S.called && S.rounds > 0;   // the mortars: they stop when the rounds are spent
  const onFPL = !!S.called;                  // the guns stay on the FPL once it is called (ATP 3-21.8, C-69, C-81)
  const inZone = S.x <= m.box[1] && S.x >= m.wire[1];
  const checked = S.phase === "advancing" && firing && inZone;
  const breaking = S.phase === "breaking", through = S.phase === "through";
  const moving = Math.abs(M.vt) > 2;

  // --- enemy assault: two rifle squads in squad line abreast, and its leader behind them ---
  const ay = -S.x;
  const face = breaking ? 270 : 90;
  const pose = checked ? "prone" : "stand";
  const travel = Math.abs(S.x);
  const line = trSquad("line", "line");
  const downE = new Map(S.downE.map((x, i) => [G.DOWN_E[i], x]).filter(([id]) => id));
  const assault = [];
  for (const [sq, cx] of [["a", -15], ["b", 15]]) {
    trPlace(line, { x: cx, y: ay, face: 90 }).forEach((p, i) => {
      const id = `${sq}-${i}`;
      // ragged line: each man a little ahead or behind
      const jit = (fsHash(i + 3, sq === "a" ? 11 : 17) - 0.5) * 5;
      const y = p.y + jit;
      if (downE.has(id)) { add({ id: `c-${id}`, side: "hc", role: "r", pose: "prone", stride: 0, face: 90 + (i % 3 - 1) * 35, x: p.x, y: -downE.get(id) + p.y - ay + jit }); return; }
      const q = { id, side: "h", role: p.role, pose, face, stride: pose === "stand" && (moving || through) ? strideAt(travel + i * 0.7) : 0, x: p.x, y };
      add(q); assault.push(q);
    });
  }
  { const id = "e-pl"; add({ id, side: "h", role: "pl", pose: checked ? "kneel" : "stand", face, stride: moving && !checked ? strideAt(travel) : 0, x: 0, y: ay - (breaking ? -10 : 12) }); }
  // --- enemy support by fire: an MG team and two riflemen prone behind a wall far out on the flank ---
  const sbfFace = bearingTo(G.SBF, [0, G.LINE]);
  const sbf = [];
  [[0, 0, "mg"], [2.4, 2.2, "r"], [-5, -1, "r"], [6, 3, "r"]].forEach(([dx, dy, role], i) => { const q = { id: `s-${i}`, side: "h", role, pose: "prone", face: sbfFace, stride: 0, x: G.SBF[0] + dx, y: G.SBF[1] + 10 + dy }; add(q); sbf.push(q); });

  // --- the defenders: two-man holes, two MG teams at the wire's ends, PL and RTO, a medic ---
  const downF = new Set(G.DOWN_F.slice(0, Math.max(1, S.downF)));
  const holeMen = [];
  const roles = ["tl", "ar", "gr", "r", "tl", "ar", "gr", "r"];
  G.HOLES.forEach((x, h) => [-1.2, 1.2].forEach((dx, k) => {
    const id = `h${h}-${k}`;
    if (downF.has(id)) return;
    const q = { id, side: "f", role: k ? roles[h] : (h % 4 === 0 ? "sl" : "r"), pose: "hole", face: 270, stride: 0, x: x + dx, y: G.LINE };
    add(q); holeMen.push(q);
  }));
  const fplFace = (i) => bearingTo(G.MG[i], G.FPL_END[i]);
  const mgs = G.MG.map(([x, y], i) => {
    const sector = i ? 225 : 315;
    const f = onFPL ? fplFace(i) : sector;
    const gun = { id: `mg${i}`, side: "f", role: "mg", pose: "prone", face: f, stride: 0, x, y };
    add(gun);
    const back = fdPolar(x, y, 2.4, f + 180 + (i ? -40 : 40));
    add({ id: `ag${i}`, side: "f", role: "ag", pose: "prone", face: f, stride: 0, x: back[0], y: back[1] });
    return gun;
  });
  add({ id: "pl", side: "f", role: "pl", pose: "kneel", face: 270, stride: 0, x: G.PL[0] - 2, y: G.PL[1] });
  add({ id: "rto", side: "f", role: "rto", pose: "kneel", face: 270, stride: 0, x: G.PL[0] + 2.4, y: G.PL[1] + 1.6 });
  G.CCP.slice(0, downF.size).forEach(([x, y], k) => add({ id: `c-f${k}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 60 + 30 * ((k * 7) % 3 - 1), x, y }));
  add({ id: "medic", side: "f", role: "r", pose: "kneel", stride: 0, face: 90, x: G.MEDIC[0], y: G.MEDIC[1] });

  // --- fire ---
  const aim = (p) => trAimPoint(p, p.x, p.y, p.z);
  const muzzle = (p) => trMuzzle(p, p.x, p.y, p.z);
  const streams = [];
  const live = assault.length ? assault : [];
  const inRange = S.x < m.range;
  // riflemen in the holes fire at the assault once it is in range (pairs alternate)
  holeMen.forEach((p, i) => {
    if (i % 2) return;
    const tgt = live.filter((e) => Math.abs(e.x - p.x) < 40).map(aim);
    streams.push({ id: p.id, side: "f", heavy: p.role === "ar", from: muzzle(p), to: tgt.length ? tgt : live.map(aim), period: 2.4 + (i % 5) * 0.31, burst: p.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.5, phase: i * 0.37, on: inRange ? 0.75 : 0, scatter: 2.6 });
  });
  // the MGs: on the assault in their sectors until the FPF is called, then grazing fire along the FPL
  mgs.forEach((gun, i) => {
    let to;
    if (onFPL) {
      const [ex, ey] = G.FPL_END[i];
      to = [];
      for (let k = 2; k <= 8; k++) to.push([gun.x + (ex - gun.x) * k / 8, gun.y + (ey - gun.y) * k / 8, 0.7]);
    } else to = live.filter((e) => (i ? e.x > -20 : e.x < 20)).map(aim);
    streams.push({ id: gun.id, side: "f", heavy: true, from: muzzle(gun), to: to.length ? to : live.map(aim), period: onFPL ? 0.9 : 1.8, burst: onFPL ? 5 : 3, gap: 0.08, flight: onFPL ? 0.75 : 0.55, phase: i * 0.47, on: firing || S.phase === "breaking" ? 1 : inRange ? 0.9 : 0, scatter: firing ? 1.2 : 2.4 });
  });
  // the enemy: the support team fires on the holes until its assault nears the wire; the assault's
  // automatic riflemen fire as they move; checked, they hardly fire
  const holes = holeMen.map(aim);
  sbf.forEach((p, i) => { if (p.role === "mg" || i === 1) streams.push({ id: p.id, side: "h", heavy: p.role === "mg", from: muzzle(p), to: holes, period: p.role === "mg" ? 2.1 : 2.9, burst: p.role === "mg" ? 3 : 1, gap: 0.1, flight: 0.7, phase: 0.2 + i * 0.6, on: S.phase === "advancing" && S.x > 40 ? 0.9 : 0, scatter: 3 }); });
  assault.filter((p) => p.role === "ar" || p.role === "tl").forEach((p, i) => streams.push({ id: p.id, side: "h", heavy: p.role === "ar", from: muzzle(p), to: holes, period: 2.6 + i * 0.23, burst: p.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.55, phase: i * 0.61, on: breaking ? 0 : checked ? 0.15 : S.x < 120 ? 0.6 : 0, scatter: 3 }));
  return { men, streams, firing, onFPL, checked };
}

// Per-state ground marks: each MG's primary sector (the FPL is its inner limit), brighter once the FPF
// is called; drawn under the chalk.
export function fieldMarks(K, P, T, pose) {
  const G = FG;
  return G.MG.map(([x, y], i) => {
    const b = bearingTo([x, y], G.FPL_END[i]);
    const [a0, a1] = i ? [b, b + 48] : [b - 48, b];
    return trFan(K, P, T, x, y, 6, 84, a0, a1, { side: "f", arcs: 1, alpha: pose.onFPL ? 0.6 : 0.28 });
  }).join("");
}

// Mortar bursts for time t while the FPF fires: about 7.5 a second (the model's notional rate),
// scattered over the 60 by 30 m box; each a flash, a dust cloud and drifting smoke.
export function fieldBursts(S, t, since) {
  const out = [];
  if (!S.called || since === null) return out;
  const m = MODEL, G = FG;
  const dur = m.rounds / m.rate;
  const life = 2.6;
  const k0 = Math.max(0, Math.floor((since - life) * m.rate)), k1 = Math.floor(Math.min(since, dur) * m.rate);
  for (let k = k0; k <= k1; k++) {
    const age = since - k / m.rate;
    if (age < 0 || age > life) continue;
    const x = G.BOX[0] + 4 + fsHash(k, 3) * (G.BOX[1] - G.BOX[0] - 8);
    const y = G.BOX[2] + 3 + fsHash(k, 7) * (G.BOX[3] - G.BOX[2] - 6);
    out.push({ p: [x, y, 0], age: age / life, k });
  }
  return out;
}
