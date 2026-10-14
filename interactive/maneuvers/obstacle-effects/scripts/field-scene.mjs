// The Battlefield view of Obstacles and Fires, at company scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same run (model.mjs) as the machine drives it:
//   S.plan   the simulated run for the set of groups covered by fires
//   S.t      model minutes since the column started
//   S.c      { D, T, F, B } 0..1, how far each group's fires have come on (eased by the page)
// The map is drawn in a local frame (u to the right, v down the card) and laid on the ground at
// W(u, v). fieldStatic() builds the ground and everything that never moves (build only); fieldPose()
// places every vehicle and soldier and the fire streams for a state (build and page); fieldMarks()
// draws the per-state ground marks (the fires covering each group).
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdPolar, fdBlob, fdFrame, fdRibbon, fdSpline } from "../../kit/field.mjs";
import { MODEL, KEYS, NAMES, ROUTES, STN, ANCHOR, poseAt, tally } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trNest, trWire, trFan, trChalk, trPrism, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

const FS_RAD = Math.PI / 180;
const TH = -35;                                   // the local u axis lies along this world bearing
export const FW = { cx: 9.5, cy: 33.4 };         // world point at the middle of the card
export const W = (u, v) => [FW.cx + u * Math.cos(TH * FS_RAD) - v * Math.sin(TH * FS_RAD), FW.cy + u * Math.sin(TH * FS_RAD) + v * Math.cos(TH * FS_RAD)];
export const wFace = (deg) => deg + TH;           // a local bearing as a world bearing

export const FG = {
  world: { x: -240, y: -220, w: 500, d: 480 },
  RISES: [
    { n: "anchor", u: -26, v: -86, r: 27, steps: 4, h: 1.6, top: 0.5, seed: 5, wobble: 0.08 },
    { n: "op", u: -88, v: -80, r: 15, steps: 2, h: 1.4, top: 0.5, seed: 21, wobble: 0.1 },
    { n: "south", u: 30, v: 82, r: 36, steps: 3, h: 1.6, top: 0.5, seed: 41, wobble: 0.1 },
    { n: "east", u: 112, v: 12, r: 26, steps: 3, h: 1.6, top: 0.5, seed: 47, wobble: 0.1 },
  ],
  // friendly positions: holes { id, u, v, face (local bearing), men: [[id, role], ...] }, nests the same
  POS: {
    D: { holes: [{ id: "d1", u: -90, v: -78, face: 80, men: [["a", "mg"], ["b", "ag"]] }], fo: [-80, -80], nest: [-90, -78] },
    T: { holes: [{ id: "t1", u: -34, v: -80, face: 60, men: [["a", "ar"], ["b", "r"]] }, { id: "t2", u: -16, v: -78, face: 70, men: [["a", "tl"], ["b", "r"]] }, { id: "t3", u: -25, v: -74, face: 65, men: [["a", "mg"], ["b", "ag"]], nest: true }] },
    F: { holes: [{ id: "f1", u: 12, v: 68, face: -50, men: [["a", "ar"], ["b", "r"]] }, { id: "f2", u: 26, v: 64, face: -62, men: [["a", "tl"], ["b", "gr"]] }, { id: "f3", u: 42, v: 66, face: -48, men: [["a", "mg"], ["b", "ag"]], nest: true }, { id: "f4", u: 54, v: 70, face: -42, men: [["a", "ar"], ["b", "r"]] }] },
    B: { holes: [{ id: "b1", u: 104, v: 24, face: 125, men: [["a", "ar"], ["b", "r"]] }, { id: "b2", u: 116, v: 26, face: 130, men: [["a", "mg"], ["b", "ag"]], nest: true }, { id: "b3", u: 124, v: 14, face: 118, men: [["a", "tl"], ["b", "r"]] }] },
  },
  CCP: [[2, 92], [8, 96], [-1, 98], [12, 90]],
  MEDIC: [6, 93],
  DOWN_F: ["t-t1a", "f-f1b", "b-b1a", "d-d1a", "f-f4b", "t-t2b"],
  RANGE: { D: 62, T: 58, F: 52, B: 54 },          // how far from a group's centre a vehicle counts as in its zone
  BURSTS: {
    D: [[-92, -38], [-84, -30], [-96, -44], [-80, -40]],
    T: [[-14, -48], [-6, -40], [2, -34], [-20, -58]],
    F: [[44, 16], [52, 28], [58, 24], [40, 20], [48, 36]],
    B: [[96, 60], [90, 52], [102, 66], [86, 60]],
  },
};
FG.TERRAIN = { rises: FG.RISES.map((r) => { const [cx, cy] = W(r.u, r.v); return { cx, cy, r: r.r, steps: r.steps, h: r.h, top: r.top, seed: r.seed, wobble: r.wobble }; }) };

const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
export const fieldTerrain = () => trTerrain(FG.TERRAIN);
const along = (route, s, off = 0) => { const p = ROUTES[route].at(s), r = (p.face + 90) * FS_RAD; return [p.u + off * Math.cos(r), p.v + off * Math.sin(r), p.face]; };
const perp = (route, s, a, b) => [along(route, s, a), along(route, s, b)];

// every friendly firing position as { id, group, x, y, face, nest, men }
export function fieldHoles() {
  const out = [];
  for (const k of KEYS) for (const h of FG.POS[k].holes) { const [x, y] = W(h.u, h.v); out.push({ ...h, id: `${k.toLowerCase()}-${h.id}`, group: k, x, y, face: wFace(h.face), nest: !!h.nest }); }
  return out;
}
// where the shooters of a group are, as a mean world point
export function groupFire(k) {
  const hs = fieldHoles().filter((h) => h.group === k);
  return [hs.reduce((s, h) => s + h.x, 0) / hs.length, hs.reduce((s, h) => s + h.y, 0) / hs.length];
}

export function fieldStatic(K, P, T) {
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const Wp = (pts) => pts.map(([u, v]) => W(u, v));
  const onRoad = (x, y, d) => ["A", "B"].some((r) => ROUTES[r].pts.some(([u, v]) => { const [wx, wy] = W(u, v); return Math.hypot(wx - x, wy - y) < d; }));
  g(trGroundPlane(K, P, FG.world));
  for (const [u, v, r, seed, sq] of [[-40, 30, 50, 3, 0.7], [90, -70, 44, 5, 0.8], [140, 80, 40, 7, 0.6], [-120, 70, 44, 9, 0.7]]) g(trPatch(K, P, fdBlob(...W(u, v), r, seed, 0.15, 40, sq)));
  // fields: the engagement area is open farmland between the two avenues
  const quad = (u, v, w, d, ang = 0) => { const F = fdFrame(...W(u, v), wFace(ang)); return [F(-w / 2, -d / 2), F(w / 2, -d / 2), F(w / 2, d / 2), F(-w / 2, d / 2)]; };
  for (const [u, v, w, d, ang, n, tint] of [[20, -12, 30, 20, 8, 7, "a"], [66, 4, 24, 26, 10, 7, "b"], [-60, 20, 40, 26, 0, 8, "a"], [-110, 20, 30, 24, 5, 7, "b"], [140, -30, 36, 22, 0, 7, "a"], [60, -86, 36, 22, 0, 7, "b"], [-30, 74, 30, 20, 0, 7, "b"]]) g(trField(K, P, quad(u, v, w, d, ang), { furrows: n, tint }));
  g(trStream(K, P, Wp([[-150, 108], [-100, 100], [-40, 104], [20, 112], [80, 118], [150, 112]]), 3.2, 5));
  // avenue A and the branch B into the engagement area (the roads the column drives)
  g(trRoad(K, P, Wp(ROUTES.A.pts.filter((_, i) => i % 5 === 0)), 10.5, { smooth: 0 }));
  g(trRoad(K, P, Wp(ROUTES.B.pts.filter((_, i) => i % 5 === 0).filter(([u]) => u > -50)), 7.6, { smooth: 0 }));

  // woods toward the edges, kept clear of the roads and the groups
  const corridor = (x, y) => onRoad(x, y, 18) || Math.hypot(x - W(40, 20)[0], y - W(40, 20)[1]) < 50;
  const woods = [
    [fdBlob(...W(-130, -40), 22, 31, 0.14, 40, 0.9), 12, 21],
    [fdBlob(...W(-66, -108), 20, 32, 0.12, 40, 0.8), 10, 22],
    [fdBlob(...W(46, -100), 26, 33, 0.14, 40, 0.9), 14, 23],
    [fdBlob(...W(118, -60), 26, 34, 0.12, 40, 1), 14, 24],
    [fdBlob(...W(-110, 78), 24, 36, 0.12, 40, 0.8), 12, 26],
    [fdBlob(...W(-52, 66), 18, 38, 0.14, 40, 0.8), 8, 28],
    [fdBlob(...W(100, 96), 22, 35, 0.12, 40, 0.8), 10, 25],
    [fdBlob(...W(150, 10), 20, 37, 0.12, 40, 0.8), 8, 29],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => corridor(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[30, -60], [76, -58]], 51], [[[-40, 36], [-76, 40]], 52], [[[130, 40], [150, 60]], 53]]) items.push(...trHedge(K, P, Wp(pts), { seed }));
  items.push(trHouse(K, P, ...W(-96, 40), wFace(10), 12, 8), trHouse(K, P, ...W(-82, 46), wFace(100), 10, 7.5), trHouse(K, P, ...W(150, 40), wFace(20), 11, 8));

  g(trRelief(K, P, T));

  // ---- the four obstacle groups ----
  const ditch = (pts, w = 2.2) => {
    const line = fdSpline(Wp(pts), 4);
    return K.solidSvg(K.extrude(fdRibbon(line, w), 0.02, 0.06, P, { convex: false }), { tone: "lo", crease: "none", flat: true, className: "oe-ditch" });
  };
  // a row of earth spoil blocks beside a ditch (the berm), one item each
  const berm = (pts, off, n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, a = pts[0], b = pts[pts.length - 1];
      const [u, v] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nu = -dy / l * off, nv = dx / l * off;
      const [x, y] = W(u + nu, v + nv), F = fdFrame(x, y, wFace(Math.atan2(dy, dx) / FS_RAD));
      const len = (l / n) * 0.5;
      out.push({ key: K.depthOf([x, y, 0], P), svg: `<g class="tr-p tr-bag">${trPrism(K, P, [F(-len, -1.2), F(len, -1.2), F(len, 1.2), F(-len, 1.2)], T.height(x, y), T.height(x, y) + 1.5)}</g>` });
    }
    return out;
  };
  // a minefield: its boundary chalked, mines as small dots on the ground
  const mines = (ring, n, seed) => {
    const world = ring.map(([u, v]) => W(u, v));
    const cx = world.reduce((s, p) => s + p[0], 0) / world.length, cy = world.reduce((s, p) => s + p[1], 0) / world.length;
    const ch = trChalk(K, P, T, world, { closed: true, pegs: false });
    g(ch.ground);
    const dots = [];
    let a = seed;
    const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    const xs = world.map((p) => p[0]), ys = world.map((p) => p[1]);
    for (let i = 0, tries = 0; i < n && tries < n * 40; tries++) {
      const x = Math.min(...xs) + rnd() * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + rnd() * (Math.max(...ys) - Math.min(...ys));
      if (!inside(world, x, y)) continue;
      dots.push(K.iso([x, y, 0.05], P)); i++;
    }
    g(K.dotsSvg(dots, { size: 0.55, tone: "hi" }));
  };
  const inside = (ring, x, y) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const wire = (pts) => items.push(...trWire(K, P, T, Wp(pts), { every: 8 }));

  // D, disrupt: wire and a minefield across the south half of the avenue, the north half open
  {
    const [a, b] = [[-92, -47], [-92, -24]];
    wire([a, b]); wire([[-84, -47], [-84, -24]]);
    mines([[-82, -45], [-66, -45], [-66, -26], [-82, -26]], 22, 11);
    g(ditch([[-92, -22], [-62, -22]], 1.2));
  }
  // T, turn: an antitank ditch with its berm and a wire belt on the enemy's side, anchored on the hill
  {
    const line = [[-26, -66], [-8, -42], [12, -18]];
    g(ditch(line, 2.2));
    items.push(...berm([line[0], line[2]], 4.2, 7));
    wire(line.map(([u, v]) => [u - 5.5, v + 3.6]));
    mines([[-14, -36], [-6, -30], [-2, -24], [-8, -22], [-16, -30]], 12, 23);
  }
  // F, fix: obstacles in depth in the engagement area, each easy to bypass alone
  {
    const sF = STN.F.s;
    for (const [ds, side, len] of [[-16, -1, 9], [0, 1, 9], [16, -1, 9]]) {
      const [a, b] = perp("B", sF + ds, side * 13, side * (13 - len - 8));
      wire([[a[0], a[1]], [b[0], b[1]]]);
    }
    const c = along("B", sF, 0);
    mines([[c[0] - 22, c[1] + 10], [c[0] - 8, c[1] + 18], [c[0] + 4, c[1] + 24], [c[0] - 10, c[1] + 28], [c[0] - 26, c[1] + 22]], 12, 31);
    const cr = along("B", sF + 8, 13);
    for (const [du, dv] of [[0, 0], [6, 3], [-6, -3]]) { const [x, y] = W(cr[0] + du, cr[1] + dv); g(`<path class="oe-ditch" d="${K.onTop(fdBlob(x, y, 2.4, 3 + du, 0.15, 12), 0.03, P, true)}"/>`); }
  }
  // B, block: a complex obstacle across the whole corridor: ditch, wire and dragon's teeth
  {
    const sB = STN.B.s;
    const a = along("B", sB, -26), b = along("B", sB, 26);
    g(ditch([[a[0], a[1]], [b[0], b[1]]], 2.4));
    items.push(...berm([[a[0], a[1]], [b[0], b[1]]], -4.6, 9));
    const a2 = along("B", sB + 7, -26), b2 = along("B", sB + 7, 26);
    wire([[a2[0], a2[1]], [b2[0], b2[1]]]);
    // dragon's teeth between the ditch and the wire
    const ts = [];
    for (let i = 0; i < 9; i++) { const [u, v] = along("B", sB + 3.2, -22 + i * 5.5); const [x, y] = W(u, v), F = fdFrame(x, y, wFace(ROUTES.B.at(sB).face)); ts.push({ key: K.depthOf([x, y, 0], P), svg: `<g class="tr-p tr-bag">${trPrism(K, P, [F(-1, -1), F(1, -1), F(1, 1), F(-1, 1)], T.height(x, y), T.height(x, y) + 2.2)}</g>` }); }
    items.push(...ts);
  }

  // ---- friendly fighting positions on the four rises ----
  for (const h of fieldHoles()) items.push(...(h.nest ? trNest(K, P, h.x, h.y, T.height(h.x, h.y), h.face) : trHole(K, P, h.x, h.y, T.height(h.x, h.y), h.face)));
  return { ground: ground.join(""), items };
}

// Where every vehicle and soldier is and who fires at whom. S = { plan, t, c, cov }.
export function fieldPose(S, T, M = {}) {
  const men = [], veh = [];
  const t = S.t, plan = S.plan;
  const add = (list, m) => { m.z = T.height(m.x, m.y) + (m.dz || 0); list.push(m); };
  const tl = tally(plan, t);
  const holes = fieldHoles();

  // --- the enemy column ---
  const poses = plan.v.map((x) => poseAt(plan, x.i, t));
  poses.forEach((p, i) => {
    const [x, y] = W(p.u, p.v);
    const out = p.state === "hit" || p.state === "out";
    add(veh, { id: `v${i}`, kind: "veh", side: out ? "hc" : "h", lit: !out, face: wFace(p.face), x, y, state: p.state, route: p.route, s: p.s });
  });

  // --- friendly shooters and the men down ---
  const downN = Math.min(FG.DOWN_F.length, tl.blue);
  const downIds = new Set(FG.DOWN_F.slice(0, downN));
  const fallen = [];
  for (const h of holes) {
    const F = fdFrame(h.x, h.y, h.face);
    h.men.forEach(([sid, role], j) => {
      const id = `${h.group.toLowerCase()}-${h.id.split("-")[1]}${sid}`;
      const [x, y] = F(0, j ? -1.1 : 1.1);
      if (downIds.has(id)) { fallen.push({ id, x, y, face: h.face }); return; }
      add(men, { id, side: "f", role, pose: "hole", face: h.face, x, y, group: h.group, nest: h.nest });
    });
  }
  { const [fu, fv] = FG.POS.D.fo; const [x, y] = W(fu, fv); const f = wFace(80);
    add(men, { id: "d-fo", side: "f", role: "pl", pose: "kneel", face: f, x, y, group: "D" });
    add(men, { id: "d-rto", side: "f", role: "rto", pose: "kneel", face: f, x: x + 2.4, y: y + 1.6, group: "D" }); }
  FG.CCP.slice(0, downN).forEach(([u, v], k) => { const [x, y] = W(u, v); add(men, { id: `c-f${k}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 20 + 30 * ((k * 7) % 3 - 1), x, y }); });
  { const [x, y] = W(...FG.MEDIC); add(men, { id: "c-med", side: "f", role: "r", pose: "kneel", face: 200, x, y }); }

  // --- fire: friendly weapons on a covered group's zone, and the enemy firing back at a position ---
  const streams = [], zones = {};
  const cov = (k) => S.c[k];
  const alive = veh.filter((v) => v.state !== "hit" && v.state !== "out" && v.state !== "through");
  const inZone = (k) => alive.filter((v) => { const [au, av] = ANCHOR[k]; const [ax, ay] = W(au, av); return Math.hypot(v.x - ax, v.y - ay) < FG.RANGE[k] && v.s < 1e9; });
  const aim = (v) => [v.x, v.y, v.z + 2.4];
  const mz = (m) => trMuzzle(m, m.x, m.y, m.z);
  const byGroup = (k) => men.filter((m) => m.group === k && m.pose === "hole");
  for (const k of KEYS) {
    const targets = inZone(k);
    zones[k] = targets.length;
    if (!targets.length) continue;
    const shooters = byGroup(k);
    shooters.forEach((m, i) => streams.push({ id: `fs-${m.id}`, side: "f", heavy: m.role === "mg" || m.role === "ar", from: mz(m), to: targets.map(aim), period: m.role === "mg" ? 1.7 : 2.6 + (i % 3) * 0.3, burst: m.role === "mg" ? 3 : 1, gap: 0.1, flight: 0.5, phase: i * 0.37, on: cov(k), scatter: 3 }));
  }
  // the enemy: vehicles that meet a covered group (dwelling, held, or just hit) shoot back at its nearest position
  veh.forEach((v) => {
    if (!(v.state === "dwell" || v.state === "held")) return;
    let best = null, bd = Infinity;
    for (const k of KEYS) { if (!(S.c[k] > 0.5)) continue; const [ax, ay] = W(...ANCHOR[k]); const d = Math.hypot(v.x - ax, v.y - ay); if (d < bd && d < FG.RANGE[k]) { bd = d; best = k; } }
    if (!best) return;
    const tg = byGroup(best);
    if (!tg.length) return;
    const f = fdFrame(v.x, v.y, v.face), [mx, my] = f(4, 0);
    streams.push({ id: `es-${v.id}`, side: "h", heavy: true, from: [mx, my, v.z + 3.1], to: tg.map(aim), period: 3.1, burst: 2, gap: 0.12, flight: 0.55, phase: 0.4 + parseInt(v.id.slice(1), 10) * 0.31, on: 0.7, scatter: 5 });
  });
  return { men, veh, streams, tl, zones };
}

// Per-state ground marks: the fires covering each group, as friendly fire fans from the group's positions.
export function fieldMarks(K, P, T, S) {
  let out = "";
  for (const k of KEYS) {
    const c = S.c[k];
    if (c < 0.02) continue;
    const [fx, fy] = groupFire(k), [ax, ay] = W(...ANCHOR[k]);
    const brg = Math.atan2(ay - fy, ax - fx) / FS_RAD, d = Math.hypot(ax - fx, ay - fy);
    out += trFan(K, P, T, fx, fy, Math.max(6, d - 38), d + 26, brg - 17, brg + 17, { side: "f", arcs: 1, alpha: 0.85 * c });
  }
  return out;
}

// Where mortar round n lands in group k's obstacles (deterministic in n).
export function burstAt(k, n) {
  const list = FG.BURSTS[k];
  const h = Math.sin(n * 12.9898 + k.charCodeAt(0) * 3.7) * 43758.5453, u = h - Math.floor(h);
  const [bu, bv] = list[(n + Math.floor(u * 7)) % list.length];
  const j = Math.sin(n * 78.233 + 1.3) * 24634.6345, q = j - Math.floor(j);
  return W(bu + (u - 0.5) * 6, bv + (q - 0.5) * 6);
}
