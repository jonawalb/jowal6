// The Battlefield view of Breaching (SOSRA): a company breach of a wire and mine belt, drawn with the
// terrain kit (../../kit/terrain.mjs). The same run state as the machine drives it (model.mjs
// stateAt): S.cfg which fundamentals are applied, S.supp/S.obscure/S.breach/S.lane/S.assault the
// progress of each, S.downFT/S.downET when each man went down. Everything is a pure function of S.
// World: x across, y toward the viewer; the attack goes toward negative y, the enemy faces +y.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdSpline } from "../../kit/field.mjs";
import { stateAt, MODEL, clamp, ease } from "./model.mjs";
import { lerp } from "./scene.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHole, trNest, trWire, trChalk, trObjective, trMuzzle, trAimPoint, trRoute } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -260, y: -230, w: 520, d: 400 },
  LANE: 0,                       // the lane's x
  WIRE: [-6, -12],               // y of the two wire rows
  BELT: [-66, 66],               // x extent of the belt
  POB: [0, 2],                   // the point of breach, near side
  SBF: [-92, 10],                // support by fire position
  ENEMY: [                       // far-side defenders: id, x, y, kind
    { id: "n0", x: -26, y: -54, nest: true }, { id: "n1", x: 26, y: -52, nest: true },
    { id: "h0", x: -38, y: -48 }, { id: "h1", x: -11, y: -45 }, { id: "h2", x: 11, y: -45 }, { id: "h3", x: 38, y: -48 },
  ],
  KILL_ORDER: ["n1", "h1", "h2", "n0", "h0", "h3"],
  CCP: [-34, 56],
};
FG.TERRAIN = {
  rises: [
    { cx: 0, cy: -62, r: 66, steps: 2, h: 1.3, top: 0.7, seed: 51, wobble: 0.08 },
    { cx: -92, cy: 10, r: 24, steps: 2, h: 1.1, top: 0.6, seed: 53, wobble: 0.1 },
  ],
};
export const fieldTerrain = () => trTerrain(FG.TERRAIN);

const RAD = Math.PI / 180;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const faceTo = (a, b) => ((Math.atan2(b[1] - a[1], b[0] - a[0]) / RAD) % 360 + 360) % 360;

// group wrapper for things the page shows or hides with the lane's progress
const wrap = (cls, svg) => `<g class="${cls}">${svg}</g>`;

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[-60, 70, 80, 3, 0.55], [90, 60, 70, 4, 0.5], [0, -110, 90, 5, 0.5], [-190, -20, 40, 6, 0.8], [200, -10, 40, 9, 0.8]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.1, 40, sq)));
  const fields = [
    [[[-250, 40], [-170, 36], [-166, 100], [-246, 104]], 8, "a"],
    [[[170, 30], [248, 26], [250, 90], [172, 94]], 8, "b"],
    [[[-250, -150], [-190, -154], [-186, -214], [-248, -218]], 7, "b"],
    [[[190, -150], [248, -146], [250, -210], [192, -214]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  g(trRoad(K, P, [[-300, 98], [-150, 96], [0, 100], [150, 96], [300, 98]], 3));
  g(trRoad(K, P, [[40, 100], [44, 60], [52, 30], [60, 10]], 2.2));
  g(trStream(K, P, [[-300, -178], [-180, -172], [-60, -180], [60, -172], [180, -180], [300, -174]], 3, 5));
  const woods = [
    [fdBlob(-170, -90, 30, 61, 0.14, 40, 0.8), 18, 62],
    [fdBlob(172, -92, 30, 63, 0.14, 40, 0.8), 18, 64],
    [fdBlob(-150, 52, 14, 65, 0.12, 40, 1), 6, 66],
    [fdBlob(140, 36, 14, 67, 0.12, 40, 1), 6, 68],
    [fdSpline([[-260, -140], [-120, -144], [0, -140], [120, -144], [260, -140], [260, -160], [0, -158], [-260, -160]], 3, true), 26, 69],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-250, 40], [-170, 36]], 71], [[[170, 30], [248, 26]], 72]]) items.push(...trHedge(K, P, pts, { seed }));
  g(trRelief(K, P, T));

  // the obstacle belt: two rows of concertina wire with mines between, a lane position in the middle
  const rows = G.WIRE;
  const seg = (y, x0, x1) => { const pts = []; for (let x = x0; x <= x1 + 0.01; x += 8) pts.push([x, y]); return pts; };
  for (const y of rows) {
    items.push(...trWire(K, P, T, seg(y, G.BELT[0], -4)));
    items.push(...trWire(K, P, T, seg(y, 4, G.BELT[1])));
    items.push(...trWire(K, P, T, [[-4, y], [0, y]]).map((i) => ({ key: i.key, svg: wrap("br-w br-w1", i.svg) })));
    items.push(...trWire(K, P, T, [[0, y], [4, y]]).map((i) => ({ key: i.key, svg: wrap("br-w br-w2", i.svg) })));
  }
  const mineY = (rows[0] + rows[1]) / 2;
  for (let x = G.BELT[0] + 4; x <= G.BELT[1] - 3; x += 7) {
    const inLane = Math.abs(x) < 5;
    const s = K.lineSvg(K.ring(x, mineY + ((x * 3) % 2) - 1, 1.0, T.height(x, mineY) + 0.1, P, 10), { tone: "lo" }) + K.dotsSvg([K.iso([x, mineY + ((x * 3) % 2) - 1, T.height(x, mineY) + 0.1], P)], { size: 0.3 });
    items.push({ key: K.depthOf([x, mineY, 0], P) - 1, svg: inLane ? wrap("br-mine", s) : s });
  }
  // the enemy positions on the far side
  for (const e of G.ENEMY) {
    const z = T.height(e.x, e.y);
    if (e.nest) items.push(...trNest(K, P, e.x, e.y, z, 90));
    else items.push(...trHole(K, P, e.x, e.y, z, 90));
  }
  // marked lane: two lane markers appear when the lane is reduced
  for (const sx of [-5.5, 5.5]) for (const y of [-3, -16]) {
    const z = T.height(sx, y);
    items.push({ key: K.depthOf([sx, y, 0], P), svg: wrap("br-lm", K.solidSvg(K.cylinder(sx, y, 0.45, z, 5, P, 8), { tone: "hi", crease: "none" }) + K.dotsSvg([K.iso([sx, y, z + 5], P)], { size: 0.4 })) });
  }
  // control measures, sparingly: the support-by-fire position (open chalk box), the reduction area (lit), the far side objective flag
  const sbf = trChalk(K, P, T, [[-106, -2], [-80, -2], [-80, 24], [-106, 24]], { closed: true, pegs: false });
  g(sbf.ground);
  const red = trChalk(K, P, T, [[-14, 6], [14, 6], [14, -20], [-14, -20]], { closed: true });
  g(red.ground.replace("tr-chalk", "tr-chalk br-lit"));
  items.push(...red.items);
  items.push(trObjective(K, P, T, 0, -66));
  return { ground: ground.join(""), items };
}

// Where every figure stands and who fires at whom for state S (stateAt) at its time S.t.
export function fieldPose(S, T) {
  const G = FG;
  const men = [];
  const add = (p) => { p.z = T.height(p.x, p.y); men.push(p); return p; };
  const cfg = S.cfg;

  // ---- breach force (8): reduce team b0..b3, security b4..b7 ----
  const BSTART = (k) => [-24 + (k % 4) * 5, 38 + Math.floor(k / 4) * 5];
  const bpos = (k, s) => {
    const m = s.breach, ln = ease(s.lane);
    const st = BSTART(k);
    if (k < 4) {
      const end = [-7.5 + k * 5, -2.5 - ln * 11 * (k === 0 || k === 1 ? 1 : 0.6)];
      const mk = k === 0 ? [-5.5, -9] : k === 1 ? [5.5, -9] : end;
      const to = ln > 0.98 && (k === 0 || k === 1) ? mk : [end[0], end[1]];
      return { x: lerp(st[0], to[0], m), y: lerp(st[1], to[1], m), mv: m > 0.02 && m < 0.98 || (ln > 0.02 && ln < 0.98) };
    }
    const ends = [[-24, 2], [24, 2], [-66, -20], [66, -20]];
    const e = ends[k - 4];
    if (k < 6) return { x: lerp(st[0], e[0], m), y: lerp(st[1], e[1], m), mv: m > 0.02 && m < 0.98 };
    // far-side security goes round the end of the belt
    const way = [k === 6 ? -70 : 70, 4];
    const a = clamp(m * 2), b = clamp(m * 2 - 1);
    const x = b > 0 ? lerp(way[0], e[0], b) : lerp(st[0], way[0], a);
    const y = b > 0 ? lerp(way[1], e[1], b) : lerp(st[1], way[1], a);
    return { x, y, mv: m > 0.02 && m < 0.98 };
  };
  const BROLES = ["tl", "ar", "gr", "r", "r", "r", "r", "r"];
  // ---- assault force (12): PL, RTO, PSG, nine in a squad column ----
  const AROLES = ["pl", "rto", "sl", "tl", "ar", "gr", "r", "tl", "ar", "gr", "r", "r"];
  const ASTART = (i) => [26 + (i % 4) * 5.4, 52 + Math.floor(i / 4) * 5.4];
  const AROUTE = Array.from({ length: 12 }, (_, i) => {
    const a = ASTART(i);
    const end = [-33 + i * 6, -37 - (i % 2) * 2];
    return trRoute([a, [8, 30], [0, 14], [0, -9], [0, -24], end], 4);
  });
  const STAG = 5;
  const apos = (i, s) => {
    const R = AROUTE[i];
    const d = s.assault * (R.length + 11 * STAG) - i * STAG;
    const q = R.at(clamp(d, 0, R.length));
    return { x: q.x, y: q.y, face: q.face, mv: d > 0.3 && d < R.length - 0.3 };
  };

  // casualties: the kth friendly down is this man, where he stood at that moment
  const downIds = cfg.every(Boolean) ? ["b2", "a5", "a9"] : ["b2", "b0", "b5", "b1", "b6", "b3", "b7", "b4"];
  const downMap = new Map();
  S.downFT.forEach((tf, k) => { downMap.set(downIds[k % downIds.length], tf); });
  const at = (tf) => stateAt(cfg, tf, true);
  const posAt = (id, s) => {
    if (id[0] === "b") return bpos(+id.slice(1), s);
    return apos(+id.slice(1), s);
  };
  const place = (id, role, live) => {
    const tf = downMap.get(id);
    if (tf !== undefined) {
      const p = posAt(id, at(tf));
      return add({ id, side: "fc", role: "r", pose: "prone", face: 270 + ((id.charCodeAt(1) * 13) % 5 - 2) * 12, stride: 0, x: p.x, y: p.y });
    }
    return null;
  };
  const alive = [];
  for (let k = 0; k < 8; k++) {
    const id = "b" + k;
    if (place(id)) continue;
    const p = bpos(k, S);
    const there = S.breach > 0.98;
    const reducing = k < 4 && there && S.lane < 0.98 && S.lane > 0;
    const pose = S.released && there ? (k < 4 ? (S.lane >= 0.98 ? "stand" : "kneel") : "prone") : "kneel";
    const face = p.mv ? (k < 6 ? 270 : 270) : 270;
    alive.push(add({ id, side: "f", role: BROLES[k], pose: p.mv ? "stand" : pose, face, stride: p.mv ? strideAt(S.t * 14 + k * 3) : 0, x: p.x, y: p.y, group: "b" }));
  }
  for (let i = 0; i < 12; i++) {
    const id = "a" + i;
    if (place(id)) continue;
    const p = apos(i, S);
    const pose = p.mv ? "stand" : S.assault >= 1 ? "kneel" : "kneel";
    alive.push(add({ id, side: "f", role: AROLES[i], pose, face: p.mv ? p.face : 270, stride: p.mv ? strideAt(S.t * 14 + i * 3) : 0, x: p.x, y: p.y, group: "a" }));
  }
  // ---- support force (6): two machine guns with assistants, two riflemen, on the support-by-fire position ----
  const sfaceTo = faceTo(G.SBF, [0, -50]);
  [[-98, 4, "mg", "prone"], [-91, 3, "ag", "kneel"], [-86, 6, "mg", "prone"], [-81, 5, "ag", "kneel"], [-100, 12, "r", "kneel"], [-90, 15, "r", "kneel"]].forEach(([x, y, role, pose], i) => {
    alive.push(add({ id: "s" + i, side: "f", role, pose, face: sfaceTo, stride: 0, x, y, group: "s" }));
  });
  // the medic: goes to the most recent man down once he is hit, else waits at the casualty collection point
  {
    let x = G.CCP[0], y = G.CCP[1], face = 90;
    const last = S.downFT.length ? S.downFT[S.downFT.length - 1] : null;
    if (last !== null) {
      const id = downIds[(S.downFT.length - 1) % downIds.length];
      const tp = posAt(id, at(last));
      const u = clamp((S.t - last - 0.8) / 4);
      x = lerp(G.CCP[0], tp.x + 3, u); y = lerp(G.CCP[1], tp.y + 3, u);
      face = faceTo([G.CCP[0], G.CCP[1]], [tp.x, tp.y]);
      add({ id: "med", side: "f", role: "r", pose: u > 0.02 && u < 0.98 ? "stand" : "kneel", face, stride: u > 0.02 && u < 0.98 ? strideAt(u * 60) : 0, x, y });
    } else add({ id: "med", side: "f", role: "r", pose: "kneel", face: 270, stride: 0, x, y });
  }
  // ---- the enemy: six in holes and nests, face the friendly side; down ones lie still ----
  const eDown = new Set(G.KILL_ORDER.slice(0, S.downE));
  const eAlive = [];
  for (const e of G.ENEMY) {
    if (eDown.has(e.id)) { add({ id: e.id, side: "hc", role: "r", pose: "prone", face: 90 + (e.x > 0 ? 25 : -25), stride: 0, x: e.x - 3, y: e.y + 4 }); continue; }
    const up = (1 - S.supp) > 0.6 && S.released;   // unsuppressed, they stand to fire; suppressed they are heads down
    eAlive.push(add({ id: e.id, side: "h", role: e.nest ? "mg" : "r", pose: "hole", face: 90, stride: 0, x: e.x, y: e.y, nest: !!e.nest, up }));
  }

  // ---- fire ----
  const streams = [];
  const aim = (p) => trAimPoint(p, p.x, p.y, p.z);
  const mz = (p) => trMuzzle(p, p.x, p.y, p.z);
  const eT = eAlive.map(aim);
  // the support force suppresses from the start (full effect once the model says it is set)
  if (cfg[0] && S.released && eT.length) {
    alive.filter((p) => p.group === "s").forEach((p, i) => {
      streams.push({ id: p.id, side: "f", heavy: p.role === "mg", from: mz(p), to: eT, period: 1.5 + i * 0.2, burst: p.role === "mg" ? 3 : 1, gap: 0.1, flight: 0.7, phase: i * 0.37, on: 0.9, scatter: 2.2 });
    });
  }
  // the enemy fires at the breach force and the assault in proportion to how unsuppressed it is; smoke blunts it
  if (S.released) {
    const tg = alive.filter((p) => p.group === "b" || p.group === "a").map(aim);
    const base = 0.1 + 0.85 * (1 - S.supp);
    const seen = clamp((S.t - 1.5) / 2);
    const on = base * (1 - 0.6 * S.obscure) * seen * (cfg[2] || S.breach < 0.5 ? 1 : 1.3);
    eAlive.forEach((p, i) => {
      if (!tg.length || on < 0.02) return;
      streams.push({ id: p.id, side: "h", heavy: !!p.nest, from: mz(p), to: tg, period: 1.7 + i * 0.23, burst: p.nest ? 3 : 1, gap: 0.12, flight: 0.7, phase: 0.4 + i * 0.31, on: Math.min(1, on), scatter: 2 + 7 * S.obscure });
    });
  }
  // the assault and the security elements return fire once the lane is open
  if (S.assault > 0.02 && eT.length) {
    alive.filter((p) => p.group === "a").forEach((p, i) => {
      streams.push({ id: p.id, side: "f", heavy: p.role === "ar", from: mz(p), to: eT, period: 1.8 + (i % 4) * 0.25, burst: 1, gap: 0.1, flight: 0.6, phase: 0.2 + i * 0.21, on: 0.8, scatter: 2.4 });
    });
  }
  return { men, streams };
}

// smoke between the obstacle and the overwatching enemy: a line of drifting puffs, density from S.obscure
export function smokePuffs(S, t) {
  const out = [];
  const n = 13, d = S.obscure;
  if (d < 0.02) return out;
  for (let i = 0; i < n; i++) {
    const x = -64 + (128 * i) / (n - 1) + 4 * Math.sin(t * 0.5 + i * 1.7);
    const y = -29 + 3 * Math.cos(t * 0.4 + i * 2.3) - (i % 2) * 3;
    const rise = (1 + Math.sin(t * 0.7 + i)) * 0.5;
    out.push({ p: [x, y, 4 + 3 * rise], r: (7 + 3 * rise) * (0.4 + 0.6 * d), a: 0.42 * d });
  }
  return out;
}
