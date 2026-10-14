// The Battlefield view of the bypass, at company scale, drawn with the terrain kit (../../kit/terrain.mjs).
// The flume becomes a valley road. Each float is a vehicle of an attacking company (twelve vehicles,
// drawn as three platoons of four) moving in column; each rock is an enemy strongpoint astride the road
// (small, medium and large: two, three and five two-man fighting positions, the larger two with
// machine-gun positions). The same model state drives it as the machine: simulate(criteria, t) from
// model.mjs gives every vehicle's station and lane and each strongpoint's reduction progress, and
//   a strongpoint within the bypass criteria is passed on a side track while the vehicles the model
//   leaves to hold it halt on the road short of it, put out an observation post and fire on it;
//   a strongpoint above the criteria stops the column: the lead vehicles fire on it, a squad dismounts
//   and assaults its near flank, and the column waits until it is reduced.
// Casualties on both sides come from model.mjs (LOSS, casualties()); this file only places them.
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places every
// vehicle, soldier and fire stream for a state (build and page); fieldMarks() draws the fire sectors.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trHouse, trHole, trNest, trWire, trFan, trChalk, trPrism, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";
import { MODEL, LOSS, plan, posOf, passed } from "./model.mjs";

export const FG = {
  world: { x: -470, y: -340, w: 940, d: 680 },
  KX: 1.1,              // field units per flume unit along the valley (notional)
  KY: 1.15,             // field units per flume unit across it: the side track runs 37 units off the road
  ROAD: (X) => 5 * Math.sin(0.011 * X + 0.5),
  // each strongpoint, offsets from its centre on the road (dx along the valley, dy toward the viewer):
  // two-man holes [dx, dy, face], machine-gun positions, wire on its flanks, and the far wood its
  // survivors withdraw to; R is the reach of the assault line
  SP: {
    small: { holes: [[-4, -8, 185], [-3, 9, 175]], nests: [], wire: [], R: 12 },
    medium: { holes: [[-6, -10, 185], [-6, 10, 175], [3, -16, 205]], nests: [[3, 16, 160]], wire: [], R: 16 },
    large: { holes: [[-10, -9, 185], [-10, 9, 175], [-2, -18, 200], [-2, 18, 160], [7, -11, 210]], nests: [[6, 14, 165], [5, -25, 195]], wire: [[[-19, -31], [-20, -13]], [[-20, 13], [-18, 27]]], R: 20 },
  },
  CAS: [2, 6, 0],
  AA_OFF: 16,           // the assembly area's offset off the road, field units       // which dismounts are hit, in order (one from each fire team first)
};
FG.TERRAIN = {
  rises: [
    { cx: -210, cy: -150, r: 46, steps: 3, h: 1.8, top: 0.45, seed: 5, wobble: 0.1, squash: 0.6 },
    { cx: -40, cy: -170, r: 54, steps: 3, h: 1.8, top: 0.45, seed: 9, wobble: 0.1, squash: 0.55 },
    { cx: 150, cy: -160, r: 50, steps: 3, h: 1.8, top: 0.45, seed: 13, wobble: 0.1, squash: 0.6 },
    { cx: -150, cy: 150, r: 40, steps: 2, h: 1.6, top: 0.5, seed: 17, wobble: 0.12, squash: 0.6 },
    { cx: 90, cy: 160, r: 44, steps: 2, h: 1.6, top: 0.5, seed: 21, wobble: 0.12, squash: 0.6 },
  ],
};

const BP_RAD = Math.PI / 180;
const bpClamp01 = (x) => Math.min(1, Math.max(0, x));
const bpSmooth = (a, b, x) => { const t = bpClamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const bpLerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const bpBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// The model's flume point (x, y) on the ground: x along the valley, the rock lane (y = -lane) on the road.
// Past the meter line (the phase line) the pool becomes an assembly area set off the road toward the viewer.
export function bpAt(x, y) {
  const X = FG.KX * x;
  return [X, FG.ROAD(X) + FG.KY * (y + MODEL.lane) + FG.AA_OFF * bpSmooth(MODEL.x1, MODEL.slots.x[0], x)];
}
// A strongpoint's centre on the road.
export const bpCentre = (rock) => bpAt(rock.x, -MODEL.lane);
// The side track round rock j: the model's open-lane curve for that rock alone, as a ground polyline.
function bpTrack(rock) {
  const pts = [];
  for (let x = rock.x - 48; x <= rock.x + 48; x += 2) {
    const u = bpSmooth(rock.x - 46, rock.x - 28, x) - bpSmooth(rock.x + 28, rock.x + 46, x);
    pts.push(bpAt(x, -MODEL.lane + 2 * MODEL.lane * bpClamp01(u)));
  }
  return pts;
}
// Where the column halts for a strongpoint it must reduce, and where the k-th holding vehicle parks.
const bpStop = (rock) => rock.x - rock.r - MODEL.puck - 1.5;
const bpPark = (rock, k) => bpStop(rock) - k * MODEL.gap;

// Every defender of strongpoint j: { x, y, face, role, dy } in casualty order (the near side, which the
// assault and the passing column reach first, goes down first).
function bpDefenders(rock) {
  const L = FG.SP[rock.name], [cx, cy] = bpCentre(rock);
  const out = [];
  L.holes.forEach(([dx, dy, face], h) => {
    const F = fdFrame(cx + dx, cy + dy, face);
    for (const v of [-1.1, 1.1]) { const [x, y] = F(0, v); out.push({ x, y, hx: cx + dx, hy: cy + dy, v, face, role: h === 0 && v > 0 ? "ar" : "r", dy, ord: dy + v * 0.01 }); }
  });
  L.nests.forEach(([dx, dy, face]) => {
    const F = fdFrame(cx + dx, cy + dy, face);
    out.push({ x: F(0, 0)[0], y: F(0, 0)[1], hx: cx + dx, hy: cy + dy, v: -1.1, face, role: "mg", dy, ord: dy + 0.5 });
    const [ax, ay] = F(-1.4, 1.5);
    out.push({ x: ax, y: ay, hx: cx + dx, hy: cy + dy, v: 1.1, face, role: "ag", dy, ord: dy + 0.4 });
  });
  return out.sort((a, b) => b.ord - a.ord);
}

// ---------- local drawing helpers ----------

// A wheeled ambulance at the origin facing `face`: cab, box body and chassis, about 7 units long, drawn
// inside a <g class="tr-s" data-side="m">. (Same drawing as the supply trucks in Fig 9's field view.)
export function bpTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, bpBox(F, u0, u1, v0, v1), z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(bpBox(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

export function fieldStatic(K, P, T) {
  const G = FG, M = MODEL;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadows on the valley floor, fields toward the edges
  for (const [cx, cy, r, seed, sq] of [[-160, 10, 60, 3, 0.5], [40, 20, 60, 5, 0.45], [230, 30, 50, 7, 0.6], [-60, -70, 40, 11, 0.6], [120, 80, 40, 13, 0.6]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-330, 40], [-266, 44], [-270, 92], [-336, 86]], 8, "a"],
    [[[-300, -90], [-240, -86], [-244, -46], [-304, -50]], 7, "b"],
    [[[250, 70], [318, 64], [322, 112], [254, 118]], 8, "b"],
    [[[240, -110], [306, -116], [310, -70], [244, -64]], 8, "a"],
    [[[-40, 70], [10, 68], [8, 104], [-42, 106]], 6, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // the valley road, run well past the visible ground, and the side tracks round each strongpoint
  const roadPts = [];
  for (let X = -520; X <= 520; X += 20) roadPts.push([X, G.ROAD(X)]);
  const tracks = M.rocks.map(bpTrack);
  for (const t of tracks) g(trRoad(K, P, t, 2.3, { ruts: false }));   // under the road, which covers their ends
  g(trRoad(K, P, roadPts, 3.4));
  g(trRoad(K, P, [[-300, 200], [-290, 120], [-280, 60], [-276, 0]], 2.2, { ruts: false }));

  // woods on the valley sides, clear of the road and the tracks; copses toward the edges
  const lines = [roadPts, ...tracks];
  const nearRoute = (x, y, d) => lines.some((l) => l.some((p) => Math.hypot(p[0] - x, p[1] - y) < d));
  const woods = [
    [fdBlob(-120, -92, 40, 21, 0.1, 44, 0.55), 20, 21],
    [fdBlob(6, -104, 46, 22, 0.1, 44, 0.5), 22, 22],
    [fdBlob(110, -96, 36, 23, 0.12, 40, 0.55), 16, 23],
    [fdBlob(-40, 128, 40, 24, 0.12, 40, 0.5), 14, 24],
    [fdBlob(200, 118, 40, 25, 0.12, 40, 0.55), 14, 25],
    [fdBlob(-280, -200, 50, 26, 0.12, 40, 0.6), 14, 26],
    [fdBlob(300, -200, 46, 27, 0.12, 40, 0.6), 14, 27],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 6.2, r: [2.8, 4.4], h: [8, 12], avoid: (x, y) => nearRoute(x, y, 15) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-330, 40], [-266, 44], [-270, 92]], 51], [[[250, 70], [318, 64]], 53], [[[240, -110], [306, -116]], 54], [[[-40, 70], [10, 68]], 55]]) items.push(...trHedge(K, P, pts, { seed }));
  // a farm by the road where the column enters the valley, and one past the assembly area
  for (const [x, y, a, l, w] of [[-262, 22, 0, 11, 7], [-246, 36, 90, 9, 6.5], [-288, -22, 10, 10, 7], [262, -30, 0, 11, 7], [278, -16, 90, 9, 6.5]]) items.push(trHouse(K, P, x, y, a, l, w));

  g(trRelief(K, P, T));

  // the strongpoints: fighting positions, machine-gun positions, wire on the large one's flanks
  for (const rock of M.rocks) {
    const L = G.SP[rock.name], [cx, cy] = bpCentre(rock);
    for (const [dx, dy, face] of L.holes) items.push(...trHole(K, P, cx + dx, cy + dy, 0, face));
    for (const [dx, dy, face] of L.nests) items.push(...trNest(K, P, cx + dx, cy + dy, 0, face));
    for (const run of L.wire) items.push(...trWire(K, P, T, run.map(([dx, dy]) => [cx + dx, cy + dy])));
  }

  // control measures: a phase line across the road at the model's meter line, and the assembly area
  const [plx, ply] = bpAt(M.x1, -M.lane);
  const pl = trChalk(K, P, T, [[plx + 3, ply - 36], [plx + 1.5, ply - 18], [plx, ply - 1]]);
  g(pl.ground); items.push(...pl.items);
  const a0 = bpAt(M.slots.x[0], M.slots.y[0]), a1 = bpAt(M.slots.x[2], M.slots.y[3]);
  const aa = trChalk(K, P, T, [[a0[0] - 10, a0[1] - 9], [a1[0] + 10, a0[1] - 8], [a1[0] + 10, a1[1] + 9], [a0[0] - 10, a1[1] + 8]], { closed: true });
  g(aa.ground); items.push(...aa.items);
  return { ground: ground.join(""), items };
}

// The dismounted squad's place for strongpoint `rock` at reduction progress p (0..1): member i of nine
// (two fire teams of four either side of the squad leader). It dismounts by the lead vehicle, forms a
// squad line on the near flank, closes by fire and movement (one team moves while the other lies down
// and fires), kneels on the position, then runs back and mounts. Returns { x, y, face, pose, dist }.
function bpSquad(rock, p, i) {
  const L = FG.SP[rock.name], [cx, cy] = bpCentre(rock);
  const [sx, sy] = bpAt(bpStop(rock), -MODEL.lane);
  const door = [sx - 6 - (i % 3) * 1.6, sy + 3 + Math.floor(i / 3) * 1.4];
  const lineX = cx - 2 + (i - 4) * 4.2 + (i % 2 ? 0.8 : -0.6), y0 = cy + L.R + 10, y1 = cy + 3 + (i % 3) * 1.3;
  const ap = [lineX, y0];
  const team = i < 4 ? 0 : i > 4 ? 1 : 2;
  const toward = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / BP_RAD;
  const legA = Math.hypot(ap[0] - door[0], ap[1] - door[1]);
  if (p < 0.2) {
    const w = bpSmooth(0, 0.2, p);
    const [x, y] = bpLerp(door, ap, w);
    return { x, y, face: toward(door, ap), pose: "stand", dist: w * legA, moving: true };
  }
  if (p < 0.75) {
    // four bounds: team A moves in the first and third, team B in the second and fourth; the squad leader moves throughout
    const q = (p - 0.2) / 0.55, b = Math.min(3, Math.floor(q * 4)), f = q * 4 - b;
    let prog, moving;
    if (team === 2) { prog = q; moving = true; }
    else {
      const mine = team === 0 ? [0, 2] : [1, 3];
      const done = mine.filter((m) => m < b).length;
      moving = mine.includes(b) && f < 0.999;
      prog = (done + (moving ? bpSmooth(0, 1, f) : 0)) / 2;
    }
    const y = y0 + (y1 - y0) * prog;
    return { x: lineX, y, face: -90, pose: moving ? "stand" : "prone", dist: legA + prog * (y0 - y1), moving };
  }
  if (p < 0.88) return { x: lineX, y: y1, face: -90, pose: "kneel", dist: 0, moving: false };
  const w = bpSmooth(0.88, 1, p), from = [lineX, y1];
  const [x, y] = bpLerp(from, door, w);
  return { x, y, face: toward(from, door), pose: "stand", dist: w * Math.hypot(door[0] - from[0], door[1] - from[1]), moving: true };
}
const bpStride = (d) => [1, 0, 2, 0][Math.floor(Math.max(0, d) / 1.7) % 4];

// Where every vehicle and soldier stands and who fires at whom, for criteria c and a model run `sim`
// (simulate(c, t)). M carries what the page eases between frames: ambS (the ambulance's station).
export function fieldPose(c, sim, T, M = {}) {
  const G = FG, MD = MODEL;
  const units = [], men = [];
  const veh = (u) => { u.z = T.height(u.x, u.y); units.push(u); };
  const man = (m) => { m.z = T.height(m.x, m.y); men.push(m); };
  const fixerOf = plan(c);
  const vs = (f) => (f.live ? f.s : MD.x0 - (f.born - sim.t) * MD.speed);   // stations of vehicles still to come, off the left edge
  const ground = (f, s) => { const p = posOf({ ...f, s }, c); return bpAt(p.x, p.y); };
  const heading = (f, s) => {
    const a = ground(f, s), b = ground(f, s + 1.5);
    return Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-3 ? 0 : Math.atan2(b[1] - a[1], b[0] - a[0]) / BP_RAD;
  };

  // --- the attacking company: twelve vehicles in column, lit (main effort) until left to hold a strongpoint ---
  sim.floats.forEach((f, i) => {
    const s = vs(f);
    const [x, y] = ground(f, s);
    veh({ id: `v${i}`, kind: "v", side: "f", lit: !(f.fixer >= 0 && f.parked), face: heading(f, s), x, y, s, fixer: f.fixer, parked: f.parked, out: f.out });
  });
  const vehicles = units.slice();

  // --- the strongpoints: defenders in their holes; casualties greyed where they fell; survivors of a reduced
  // strongpoint withdraw to the wood behind it ---
  const downRed = [], downBlue = [];
  MD.rocks.forEach((rock, j) => {
    const r = sim.rocks[j], L = G.SP[rock.name], [cx, cy] = bpCentre(rock);
    const defs = bpDefenders(rock);
    const nDown = r.by ? (passed(sim, j) ? LOSS.bypass[rock.name][1] : 0) : Math.round(LOSS.reduce[rock.name][1] * r.progress);
    const cost = r.by ? 0 : LOSS.reduce[rock.name][1];
    defs.forEach((d, k) => {
      if (k < nDown) {
        // lying still behind the position, along it (the two men of a hole one behind the other)
        const F = fdFrame(d.hx, d.hy, d.face), back = d.v > 0 ? -4.1 : -2.4;
        const [x, y] = F(back, 1.9 - d.v * 0.4);
        man({ id: `e${j}-${k}`, side: "hc", role: d.role, pose: "prone", face: d.face + 90 + (k % 2 ? 12 : -8), x, y, stride: 0 });
        downRed.push([d.x, d.y]);
        return;
      }
      const survivor = !r.by && k >= cost;
      const w = survivor ? bpSmooth(0.6, 1, r.progress) : 0;
      if (w >= 0.999) return;                                         // gone into the wood
      if (w > 0) {
        const to = [cx + 14 + (k % 3) * 5, cy - 70 - (k % 2) * 6];
        const [x, y] = bpLerp([d.x, d.y], to, w);
        man({ id: `e${j}-${k}`, side: "h", role: d.role === "mg" ? "r" : d.role, pose: "stand", face: Math.atan2(to[1] - d.y, to[0] - d.x) / BP_RAD, x, y, stride: bpStride(w * 70) });
        return;
      }
      man({ id: `e${j}-${k}`, side: "h", role: d.role, pose: "hole", face: d.face, x: d.x, y: d.y, stride: 0, live: true, j });
    });

    if (!r.by) {
      // --- reduction: the squad's assault, and the friendly casualties it takes ---
      const costB = LOSS.reduce[rock.name][0];
      const nB = Math.round(costB * r.progress);
      const hit = new Set();
      for (let k = 1; k <= nB; k++) {
        const i = G.CAS[k - 1], q = bpSquad(rock, (k - 0.5) / costB, i);
        hit.add(i);
        man({ id: `bc${j}-${k}`, side: "fc", role: i === 4 ? "sl" : "r", pose: "prone", face: q.face + 25, x: q.x, y: q.y, stride: 0 });
        downBlue.push({ x: q.x, y: q.y, s: bpStop(rock) - 3, fixer: -1, j });
      }
      if (r.progress > 0 && r.progress < 1) {
        for (let i = 0; i < 9; i++) {
          if (hit.has(i)) continue;
          const q = bpSquad(rock, r.progress, i);
          const role = i === 4 ? "sl" : ["tl", "ar", "gr", "r"][i < 4 ? i : i - 5];
          man({ id: `d${i}`, side: "f", role, pose: q.pose, face: q.face, x: q.x, y: q.y, stride: q.moving ? bpStride(q.dist) : 0, squad: true });
        }
      }
    } else {
      // --- bypass: the holding vehicles' observation post (two soldiers by the first one), once it has halted ---
      const first = vehicles.find((u) => u.fixer === j);
      if (first && first.parked) {
        const F = fdFrame(first.x, first.y, 0);
        const lost = passed(sim, j) ? LOSS.bypass[rock.name][0] : 0;
        [[1.5, 5.5], [-2.5, 7.2]].forEach(([u, v], k) => {
          const [x, y] = F(u, v);
          const face = Math.atan2(cy - y, cx - x) / BP_RAD;
          if (k < lost) { man({ id: `op${j}-${k}`, side: "fc", role: "r", pose: "prone", face: face + 30, x, y, stride: 0 }); downBlue.push({ x, y, s: bpPark(rock, rock.fix - 1) - MD.gap, fixer: j, j }); }
          else man({ id: `op${j}-${k}`, side: "f", role: k ? "r" : "rto", pose: "kneel", face, x, y, stride: 0, op: j });
        });
      }
    }
  });

  // --- casualty evacuation: an ambulance trails the column and halts by the latest friendly casualty, with a medic ---
  const last = downBlue.length ? downBlue.reduce((a, b) => (b.j >= a.j ? b : a)) : null;
  const launch = MD.gap / MD.speed, born = MD.n * launch;
  const free = vehicles.filter((u) => u.fixer < 0 && u.out < 0);
  const tailS = free.length ? Math.min(...free.map((u) => u.s)) : Infinity;
  const own = Math.min(MD.x0 + (sim.t - born) * MD.speed, tailS - MD.gap * 1.2, last ? last.s : MD.x1 - 12);
  const ambS = M.ambS ?? own;
  const amb = { i: -1, fixer: last ? last.fixer : -1, s: ambS, out: -1, parked: false };
  const [ax, ay] = ground(amb, ambS);
  veh({ id: "amb", kind: "t", side: "m", face: heading(amb, ambS), x: ax, y: ay });
  if (last && Math.abs(ambS - last.s) < 1.5) {
    const toAmb = Math.atan2(ay - last.y, ax - last.x) / BP_RAD;
    man({ id: "medic", side: "f", role: "r", pose: "kneel", face: toAmb + 180, x: last.x + 2.2 * Math.cos(toAmb * BP_RAD), y: last.y + 2.2 * Math.sin(toAmb * BP_RAD), stride: 0 });
  }

  // --- fire ---
  const streams = [];
  const gunAt = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(4.2, 0), u.z + 3.1]; };
  const hull = (u) => [u.x, u.y, u.z + 1.8];
  const aimMan = (m) => trAimPoint(m, m.x, m.y, m.z);
  MD.rocks.forEach((rock, j) => {
    const r = sim.rocks[j], [cx] = bpCentre(rock);
    const alive = men.filter((m) => m.live && m.j === j);
    if (!alive.length) return;
    const near = vehicles.filter((u) => u.s > rock.x - 75 && u.s < rock.x + 30 && u.out < 0 && u.fixer !== j);
    const holders = vehicles.filter((u) => u.fixer === j && u.parked);
    if (!r.by) {
      if (r.progress >= 1) return;
      const lead = vehicles.filter((u) => u.s <= rock.x && u.s > rock.x - 75 && u.fixer < 0).sort((a, b) => b.s - a.s).slice(0, 2);
      const fight = r.started ? 1 : lead.length ? 0.6 : 0;
      lead.forEach((u, k) => streams.push({ id: `${u.id}f`, side: "f", heavy: true, smoke: true, from: gunAt(u), to: alive.map(aimMan), period: 1.5 + k * 0.37, burst: 1, gap: 0, flight: 0.35, phase: j * 0.3 + k * 0.6, on: 0.8 * fight, scatter: 3 }));
      men.filter((m) => m.squad && m.pose === "prone").forEach((m, k) => streams.push({ id: `${m.id}f`, side: "f", heavy: m.role === "ar", from: trMuzzle(m, m.x, m.y, m.z), to: alive.map(aimMan), period: m.role === "ar" ? 1.1 : 1.6, burst: m.role === "ar" ? 2 : 1, gap: 0.08, flight: 0.3, phase: k * 0.37, on: 0.8, scatter: 2 }));
      const targets = [...lead.map(hull), ...men.filter((m) => m.squad).map(aimMan)];
      alive.filter((m, k) => m.role === "mg" || m.role === "ar" || k % 3 === 0).forEach((m, k) => streams.push({ id: `${m.id}f`, side: "h", heavy: m.role === "mg", from: trMuzzle(m, m.x, m.y, m.z), to: targets, period: m.role === "mg" ? 1.2 : 1.9, burst: m.role === "mg" ? 3 : 1, gap: 0.09, flight: 0.35, phase: 0.2 + k * 0.41, on: 0.75 * fight * (1 - 0.6 * r.progress), scatter: 3 }));
    } else {
      // the holding vehicles fix it with fire; it fires on the column passing on the side track and on them
      holders.forEach((u, k) => streams.push({ id: `${u.id}f`, side: "f", heavy: true, smoke: true, from: gunAt(u), to: alive.map(aimMan), period: 2.1 + k * 0.43, burst: 1, gap: 0, flight: 0.35, phase: j * 0.5 + k * 0.7, on: 0.6, scatter: 3 }));
      const targets = [...near.map(hull), ...holders.map(hull)];
      const passing = near.some((u) => Math.abs(u.s - rock.x) < 50);
      alive.filter((m, k) => m.role === "mg" || k % 3 === 0).forEach((m, k) => streams.push({ id: `${m.id}f`, side: "h", heavy: m.role === "mg", from: trMuzzle(m, m.x, m.y, m.z), to: targets, period: m.role === "mg" ? 1.4 : 2.2, burst: m.role === "mg" ? 3 : 1, gap: 0.09, flight: 0.35, phase: 0.3 + k * 0.53, on: passing ? 0.65 : holders.length ? 0.25 : 0, scatter: 3 }));
    }
  });
  return { units, men, streams: streams.filter((st) => st.to.length), ambS: own, sig: sim.rocks.map((r, j) => (r.by ? (vehicles.some((u) => u.fixer === j && u.parked) ? "h" : "b") : r.progress.toFixed(2))).join("|") };
}

// Per-state ground marks: each live strongpoint's fire sector down the road toward the column (fading as it
// is reduced), and the holding vehicles' sector onto a bypassed one once they have halted.
export function fieldMarks(K, P, T, c, sim) {
  let svg = "";
  const fix = plan(c);
  MODEL.rocks.forEach((rock, j) => {
    const r = sim.rocks[j], [cx, cy] = bpCentre(rock), L = FG.SP[rock.name];
    const a = r.by ? 0.75 : 0.8 * (1 - bpSmooth(0, 0.7, r.progress));
    svg += trFan(K, P, T, cx - 8, cy, L.R * 0.6, L.R + 38, 162, 198, { side: "h", arcs: 2, alpha: a });
    if (r.by && sim.floats.some((f) => f.fixer === j && f.parked)) {
      const k = fix.indexOf(j);
      const [hx, hy] = bpAt(bpPark(rock, 0), -MODEL.lane);
      if (k >= 0) svg += trFan(K, P, T, hx + 6, hy, 6, cx - hx + L.R - 4, -14, 14, { side: "f", arcs: 1, alpha: 0.7 });
    }
  });
  return svg;
}
