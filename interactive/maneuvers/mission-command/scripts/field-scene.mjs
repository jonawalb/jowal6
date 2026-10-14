// The Battlefield view of Mission Command, at platoon scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same model state as the engines drives it:
//   s   the engines (model.mjs step()): s.L is the enemy situation, s.wG and s.wC the two engines'
//       speeds, s.uC the throttle headquarters last cranked into the right engine.
//   F   the battlefield (model.mjs fieldStep()): F.pG / F.pC how far each platoon has got along its
//       route to its bridge, F.rG / F.rC how far it has shifted from the road to the covered route
//       behind the hedge, F.gun the enemy machine guns moving up to cover the roads, F.back the
//       enemy at the bridges pulling back, F.hitG / F.hitC and F.tookG / F.tookC the losses.
// Two platoons of one company each have a bridge to seize over a stream. The left platoon (lit)
// works to the commander's intent: it reads the situation itself. The right platoon waits for
// orders over the radio from company headquarters (bottom centre: the mast, the commander and his
// RTO). The radio links show as faint signal arcs; they vanish when the link is jammed.
// Everything is laid out in a frame on the ground: u forward (up the card, toward the bridges), v
// across. fieldStatic() builds the ground and everything that never moves (build only); fieldPose()
// places every soldier and fire stream for a state (build and page); fieldMarks() draws the machine
// guns' fire sectors; fieldLink() the signal arcs.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { FIELD, fit, threat, fieldLosses } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trNest, trFan, trChalk, trObjective, trSquad, trMorph, trPlace, trRoute, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -300, y: -300, w: 600, d: 600 },
  O: [0, 0],
  ANG: 235,             // direction of the advance (world degrees): straight up the card
  VIEW: { u: [-98, 96], v: [-126, 126] }, // the ground the card frames
  STREAM: 38,           // the stream's centre line (u)
  DECK: [31, 45],       // each bridge deck runs between these (u), 6 units wide
  BV: { g: -38, c: 38 },// each platoon's bridge and road (v): g the platoon on intent, c the one on orders
  HEDGE: 15,            // the masking hedge runs this far outside each road (v)
  COVER: 25,            // the covered route runs this far outside each road (v)
  LD: -52,              // line of departure (u)
  LEAD: 70,             // route run-in behind the line of departure, so the column starts whole
  HOLE_U: 51,           // the enemy's fighting positions on the far bank (u)
  NEST: 18,             // each machine-gun nest sits this far inside its bridge (v), at HOLE_U - 2
  DEPTH: 84,            // the enemy's positions in depth, beyond the hamlet (u)
  SEIZE: 60,            // where the lead squad forms its line beyond a bridge (u)
  HQ: [-70, 0],         // company headquarters (u, v)
  S: 3.4,               // interval between men in a squad (units)
  // casualties: who goes down first in each platoon (the lead squad first)
  DOWN: ["1-1", "1-6", "1-3", "1-7", "1-2"],
  DOWN_H: [1, 2],       // which of each bridge's fire team go down when the bridge is taken
};
FG.TERRAIN = {
  rises: [
    { cx: 0, cy: 0, r: 26, steps: 3, h: 1.4, top: 0.45, seed: 61, wobble: 0.12 },
    { cx: 0, cy: 0, r: 24, steps: 3, h: 1.4, top: 0.4, seed: 67, wobble: 0.1 },
  ],
};
const W = fdFrame(FG.O[0], FG.O[1], FG.ANG);          // (u, v) → world [x, y]
{
  // the rises sit in the far corners, away from the routes
  [[-84, 112], [88, -112]].forEach(([u, v], i) => { const [x, y] = W(u, v); FG.TERRAIN.rises[i].cx = x; FG.TERRAIN.rises[i].cy = y; });
}

const FS_RAD = Math.PI / 180;
const FACE_F = FG.ANG, FACE_H = FG.ANG + 180;
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const jit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; }; // uneven spacing
// world → (u, v)
const UV = (x, y) => { const c = Math.cos(FG.ANG * FS_RAD), s = Math.sin(FG.ANG * FS_RAD); const dx = x - FG.O[0], dy = y - FG.O[1]; return [dx * c + dy * s, -dx * s + dy * c]; };
const onDeck = (x, y) => { const [u, v] = UV(x, y); return u > FG.DECK[0] - 0.5 && u < FG.DECK[1] + 0.5 && (Math.abs(v - FG.BV.g) < 3.4 || Math.abs(v - FG.BV.c) < 3.4); };
const DECK_Z = 0.4;

// The two routes of each platoon, in world coordinates: the road straight to the bridge, and the
// covered route that bends out behind the hedge and back in short of the bridge.
function routesOf(key) {
  const bv = FG.BV[key], o = Math.sign(bv), G = FG;
  const tail = [[G.LD - G.LEAD, bv], [G.LD, bv]];
  const end = [[G.DECK[0], bv], [G.DECK[1], bv], [G.SEIZE, bv]];
  const road = trRoute([...tail, ...end].map(([u, v]) => W(u, v)), 0);
  const cover = trRoute([...tail, [G.LD + 12, bv + o * 12], [G.LD + 26, bv + o * G.COVER], [16, bv + o * G.COVER], [26, bv + o * 9], ...end].map(([u, v]) => W(u, v)), 6);
  return { road, cover };
}
const ROUTES = { g: routesOf("g"), c: routesOf("c") };
// A point on a platoon's way: share p of the route (0 at the line of departure, 1 at the seize line),
// shifted by du units along it, blended between road and covered route by r.
function wayAt(key, p, du, r) {
  const { road, cover } = ROUTES[key];
  const sR = FG.LEAD + p * (road.length - FG.LEAD) + du, sC = FG.LEAD + p * (cover.length - FG.LEAD) + du;
  const a = road.at(sR), b = cover.at(sC);
  const ax = Math.cos(a.face * FS_RAD) * (1 - r) + Math.cos(b.face * FS_RAD) * r, ay = Math.sin(a.face * FS_RAD) * (1 - r) + Math.sin(b.face * FS_RAD) * r;
  return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r, face: Math.atan2(ay, ax) / FS_RAD, s: sR * (1 - r) + sC * r };
}

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const ring = (pts) => pts.map(([u, v]) => W(u, v));
  const avoidBase = (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  g(trGroundPlane(K, P, G.world));

  // meadows, then the ploughed fields between and beside the roads
  for (const [u, v, r, seed, sq] of [[-20, 0, 40, 3, 0.7], [70, 60, 36, 5, 0.6], [70, -60, 36, 7, 0.6], [-90, 70, 30, 9, 0.8], [-90, -70, 30, 11, 0.8]]) g(trPatch(K, P, fdBlob(...W(u, v), r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-46, -31], [-46, -4], [-6, -4], [-6, -31]], 7, "a"],
    [[[-46, 4], [-46, 31], [-6, 31], [-6, 4]], 7, "b"],
    [[[0, -31], [0, -4], [28, -4], [28, -31]], 6, "b"],
    [[[0, 4], [0, 31], [28, 31], [28, 4]], 6, "a"],
    [[[-96, -36], [-96, 36], [-62, 36], [-62, -36]], 9, "a"],
  ];
  for (const [r, n, tint] of fields) g(trField(K, P, ring(r), { furrows: n, tint }));
  // the stream across the top, the two roads to the bridges and the lateral road behind the start line
  const sv = [];
  for (let v = -300; v <= 300; v += 25) sv.push([G.STREAM + 2.6 * Math.sin(v * 0.031) + (v > 60 ? 1.5 : 0), v]);
  g(trStream(K, P, ring(sv), 3.4, 5));
  for (const key of ["g", "c"]) g(trRoad(K, P, ring([[-300, G.BV[key]], [G.DECK[0] - 1, G.BV[key]]]), 2.6, { smooth: 0 }), trRoad(K, P, ring([[G.DECK[1] + 1, G.BV[key]], [300, G.BV[key]]]), 2.6, { smooth: 0 }));
  g(trRoad(K, P, ring([[-64, -300], [-62, -120], [-64, -60], [-63, 0], [-62, 60], [-64, 120], [-62, 300]]), 2.4));
  // the bridge decks: stone slabs over the water, laid on the ground layer so men on them sort above
  for (const key of ["g", "c"]) {
    const bv = G.BV[key];
    g(K.solidSvg(K.extrude(ring([[G.DECK[0], bv - 3.2], [G.DECK[1], bv - 3.2], [G.DECK[1], bv + 3.2], [G.DECK[0], bv + 3.2]]), 0, DECK_Z, P), { tone: "lo", crease: "none", className: "tr-wall" }));
  }

  // woods: a band outside each covered route, copses behind the enemy, the far-bank wood
  const corridor = (x, y) => {
    for (const key of ["g", "c"]) {
      const bv = G.BV[key];
      const [u, v] = UV(x, y);
      if (Math.abs(v - bv) < 12) return true;
      if (Math.abs(v - (bv + Math.sign(bv) * G.COVER)) < 14 && u > G.LD - 30 && u < 30) return true;
    }
    return false;
  };
  const woods = [
    [ring([[-96, 76], [-40, 78], [20, 80], [30, 90], [30, 140], [-96, 140]]), 44, 21],
    [ring([[-96, -76], [-40, -78], [20, -80], [30, -90], [30, -140], [-96, -140]]), 44, 22],
    [ring([[64, -140], [64, -70], [74, -54], [110, -50], [110, -140]]), 26, 23],
    [ring([[64, 140], [64, 70], [74, 54], [110, 50], [110, 140]]), 26, 24],
    [fdBlob(...W(-112, 30), 18, 33, 0.14, 40, 0.9), 7, 25],
  ];
  for (const [r, n, seed] of woods) {
    const trees = trScatter(r, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => corridor(x, y) || avoidBase(x, y) });
    // the near (viewer) edge of each wood keeps smaller trees so the routes stay in view
    for (const t of trees) { const [u] = UV(t.x, t.y); if (u < -40) { t.r *= 0.85; t.h *= 0.75; } }
    const w = trWood(K, P, T, r, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // the masking hedge outside each road, hedges on the far bank, walls round the headquarters farm
  for (const key of ["g", "c"]) {
    const bv = G.BV[key], o = Math.sign(bv);
    items.push(...trHedge(K, P, ring([[G.LD + 16, bv + o * (G.HEDGE + 3)], [-10, bv + o * G.HEDGE], [18, bv + o * (G.HEDGE - 1)]]), { seed: 51 + (o > 0 ? 1 : 0) }));
  }
  items.push(...trHedge(K, P, ring([[66, -36], [70, -6]]), { seed: 55 }), ...trHedge(K, P, ring([[66, 6], [70, 36]]), { seed: 56 }));
  items.push(...trWall(K, P, ring([[-86, 8], [-86, 26], [-74, 26]])), ...trWall(K, P, ring([[-86, -8], [-86, -20]])));
  { const [x, y] = W(-80, 17); items.push(trHouse(K, P, x, y, FG.ANG + 90, 11, 7.5)); }
  // the hamlet on the far bank, where the enemy's machine guns wait in depth
  for (const [u, v, a, l, w] of [[78, -6, 0, 11, 8], [80, 10, 90, 12, 8], [90, -20, 90, 10, 7]]) { const [x, y] = W(u, v); items.push(trHouse(K, P, x, y, FG.ANG + a, l, w)); }
  // the bridges' parapets
  for (const key of ["g", "c"]) {
    const bv = G.BV[key];
    for (const dv of [-3.2, 3.2]) items.push(...trWall(K, P, ring([[G.DECK[0] + 0.5, bv + dv], [G.DECK[1] - 0.5, bv + dv]]), { h: 1.2 }));
  }

  g(trRelief(K, P, T));

  // the enemy at each bridge: two fighting positions astride the road and a machine-gun nest inside it
  for (const key of ["g", "c"]) {
    const bv = G.BV[key], o = Math.sign(bv);
    for (const dv of [-7, 7]) { const [x, y] = W(G.HOLE_U, bv + dv); items.push(...trHole(K, P, x, y, T.height(x, y), FACE_H)); }
    const [nx, ny] = W(G.HOLE_U - 2, bv - o * G.NEST);
    items.push(...trNest(K, P, nx, ny, T.height(nx, ny), nestFace(key)));
  }

  // company headquarters: the radio mast with its guy lines, beside the farm
  items.push(mast(K, P));

  // control measures: the line of departure on pegs and a flag on each objective
  const ld = trChalk(K, P, T, ring([[G.LD, -100], [G.LD, -20], [G.LD, 20], [G.LD, 100]]));
  g(ld.ground); items.push(...ld.items);
  for (const key of ["g", "c"]) { const [x, y] = W(G.SEIZE + 6, G.BV[key] - Math.sign(G.BV[key]) * 8); items.push(trObjective(K, P, T, x, y, { h: 8, ang: 210 })); }

  return { ground: ground.join(""), items };
}

// Where each machine gun points: from its nest at the road short of its bridge.
function nestFace(key) {
  const bv = FG.BV[key], o = Math.sign(bv);
  const [x0, y0] = W(FG.HOLE_U - 2, bv - o * FG.NEST), [x1, y1] = W(-18, bv);
  return Math.atan2(y1 - y0, x1 - x0) / FS_RAD;
}
// The radio mast at headquarters: a pole and three guy lines to pegs, as one depth-sorted item.
const MAST_H = 15;
function mastFoot() { return W(FG.HQ[0] - 3, FG.HQ[1] - 7); }
function mast(K, P) {
  const [x, y] = mastFoot();
  const top = K.iso([x, y, MAST_H], P);
  let svg = `<g class="tr-s" data-side="f"><path class="tr-gun" d="${K.pathOf([K.iso([x, y, 0], P), top])}"/>`;
  for (let i = 0; i < 3; i++) {
    const a = (i * 120 + 30) * FS_RAD, gx = x + 6 * Math.cos(a), gy = y + 6 * Math.sin(a);
    svg += `<path class="tr-wire" d="${K.pathOf([K.iso([x, y, MAST_H * 0.72], P), K.iso([gx, gy, 0.6], P)])}"/>` + K.solidSvg(K.cylinder(gx, gy, 0.5, 0, 0.7, P, 8), { tone: "lo", crease: "none" });
  }
  svg += `<path class="tr-wire" d="${K.pathOf([K.iso([x - 1.4, y, MAST_H - 0.6], P), K.iso([x + 1.4, y, MAST_H - 0.6], P)])}"/></g>`;
  return { key: K.depthOf([x, y, 0], P), svg: `<path class="tr-shadow" d="${K.onTop(Array.from({ length: 8 }, (_, i) => [x + 1.2 * Math.cos(i * Math.PI / 4), y + 1.2 * Math.sin(i * Math.PI / 4)]), 0, P, true)}"/>` + svg };
}
export const fieldMastTop = () => { const [x, y] = mastFoot(); return [x, y, MAST_H]; };

// Where every soldier stands and who fires at whom. s: the engines, F: the battlefield (model.mjs),
// linked: the radio link. M carries what the page remembers between frames: where each casualty
// fell (M.fell) and the enemy's eased flight from a taken bridge (M.rout). Without M (the build's
// first frame) casualties lie where their squad is and nobody runs.
export function fieldPose(s, F, linked, T, M = {}) {
  const G = FG;
  const men = [];
  const add = (m) => { m.z = T.height(m.x, m.y) + (onDeck(m.x, m.y) ? DECK_Z : 0); men.push(m); };
  const onRoad = smooth01(0.9, 1, F.gun);
  const plat = {};

  // --- the two platoons: two rifle squads in squad column (fire teams in wedges), the platoon
  // leader and his RTO between them; at the bridge the lead squad forms a line beyond it and the
  // second squad a line on the near bank ---
  const col = trSquad("column", "wedge", G.S), line = trSquad("line", "line", G.S + 0.6);
  for (const key of ["g", "c"]) {
    const p = key === "g" ? F.pG : F.pC, r = key === "g" ? F.rG : F.rC, w = key === "g" ? s.wG : s.wC, sees = key === "g" ? s.L : s.uC;
    const go = fit(w);
    const moving = (go > 0.05 && p < 1) || Math.abs(threat(sees) - r) > 0.004 && p < 0.86;
    const exposed = onRoad * (1 - r) * (p > FIELD.reach[0] && p < FIELD.reach[1] ? 1 : 0) > 0.3;
    const a = smooth01(0.88, 1, p);                                    // forming up at the bridge
    const bv = G.BV[key], o = Math.sign(bv);
    const pose = moving && a < 0.98 ? "stand" : exposed ? "prone" : "kneel";
    plat[key] = { p, r, exposed, moving, pose, bv };
    const lit = key === "g";
    const place = (id, role, du, dv, anchorU, anchorV, lineOff, n) => {
      const q = wayAt(key, p, du, r);
      const F0 = fdFrame(q.x, q.y, q.face);
      let [x, y] = F0(0, dv);
      let face = q.face;
      if (a > 0.001) {
        const [lx, ly] = W(anchorU + lineOff[0], anchorV + lineOff[1]);
        x += (lx - x) * a; y += (ly - y) * a;
        face = q.face + (((FACE_F - q.face) % 360 + 540) % 360 - 180) * a;
      }
      add({ id: `${key}${id}`, side: "f", lit, role, pl: key, sq: n, pose, face, stride: pose === "stand" ? strideAt(q.s + n * 2.3 + du) : 0,
        x: x + 0.8 * jit(n, du), y: y + 0.8 * jit(du, n) });
    };
    // squad 1 leads; the PL and RTO; squad 2 follows. In line: squad 1 beyond the bridge, squad 2 short of it.
    col.forEach((m, i) => place(`1-${i}`, m.role, m.off[0], m.off[1], G.SEIZE, bv, [line[i].off[0], -line[i].off[1]], 1));
    place("-pl", "pl", -G.S * 7.2, 0.8, G.DECK[0] - 3, bv, [0, -o * 6], 0);
    place("-rto", "rto", -G.S * 7.8, -1.6, G.DECK[0] - 4.5, bv, [0, -o * 8.2], 0);
    col.forEach((m, i) => place(`2-${i}`, m.role, m.off[0] - G.S * 9, m.off[1], G.DECK[0] - 7, bv, [line[i].off[0], -line[i].off[1]], 2));
  }

  // --- company headquarters: the commander and his RTO kneeling by the mast, one more soldier ---
  {
    const [u, v] = G.HQ;
    for (const [id, role, du, dv, face] of [["hq-co", "pl", 0, 0, FACE_F], ["hq-rto", "rto", -1.6, -3, FACE_F + 30], ["hq-hq", "r", -3, 4, FACE_F - 40]]) {
      const [x, y] = W(u + du, v + dv);
      add({ id, side: "f", role, pose: "kneel", face, stride: 0, x, y });
    }
  }

  // --- the enemy at each bridge: a fire team in the two positions and a machine-gun team that
  // moves up from the hamlet to its nest when the situation turns heavy; at a light load they all
  // pull back into depth; when a platoon takes its bridge two go down and the rest run ---
  const rout = M.rout || { g: (F.tookG ? 1 : 0), c: (F.tookC ? 1 : 0) };
  const took = { g: F.tookG, c: F.tookC };
  const enemyAt = {};
  for (const key of ["g", "c"]) {
    const bv = G.BV[key], o = Math.sign(bv);
    const run = rout[key];
    const back = Math.max(F.back, run);
    const list = [];
    const roles = ["tl", "ar", "gr", "r"];
    roles.forEach((role, i) => {
      const hv = bv + (i < 2 ? -7 : 7) + (i % 2 ? -1.1 : 1.1);
      const down = took[key] === 1 && G.DOWN_H.includes(i);
      if (down) {
        const [x, y] = W(G.HOLE_U + 2.6, hv);
        add({ id: `e${key}-${i}`, side: "hc", role, pose: "prone", face: FACE_H + 25, stride: 0, x, y });
        return;
      }
      if (back > 0.985) return;                                       // gone into depth, out of sight
      const u = G.HOLE_U + (G.DEPTH - G.HOLE_U) * back;
      const mv = back > 0.015;
      const [x, y] = W(u, hv + (mv ? 3 * o * back : 0));
      const m = { id: `e${key}-${i}`, side: "h", role, pose: mv ? "stand" : "hole", face: mv ? FACE_F : FACE_H, stride: mv ? strideAt(u * 1.3 + i) : 0, x, y };
      add(m); list.push(m);
    });
    // the machine-gun team: in the hamlet (depth) → its nest
    const gun = Math.min(F.gun, 1 - back);
    if (gun > 0.015 || F.gun > 0.015) {
      const [nu, nv] = [G.HOLE_U - 2, bv - o * G.NEST], [du, dv] = [G.DEPTH - 6, bv - o * (G.NEST + 10)];
      const u = du + (nu - du) * gun, v = dv + (nv - dv) * gun;
      const placed = gun > 0.985;
      const going = F.gun > gun + 0.01 || threat(s.L) < 0.5;            // walking back toward the hamlet
      if (gun > 0.015) {
        const face = placed ? nestFace(key) : going ? FACE_F : FACE_H;
        const st = placed ? 0 : strideAt(u * 1.4);
        const [x, y] = W(u, v), [x2, y2] = W(u - 0.6, v + o * 2.2);
        const g1 = { id: `e${key}-mg`, side: "h", role: "mg", pose: placed ? "hole" : "stand", face, stride: st, x, y };
        add(g1); add({ id: `e${key}-ag`, side: "h", role: "ag", pose: placed ? "hole" : "stand", face, stride: st, x: x2, y: y2 });
        list.push(g1);
        enemyAt[key + "mg"] = placed ? g1 : null;
      }
    }
    enemyAt[key] = list;
  }

  // --- casualties: the model's counts, greyed and still where they fell; a medic kneels by the
  // first man down in each platoon ---
  const losses = { g: Math.floor(F.hitG) + (F.tookG === 1 ? FIELD.assault[0] : 0), c: Math.floor(F.hitC) + (F.tookC === 1 ? FIELD.assault[0] : 0) };
  const live = new Map(men.map((m) => [m.id, m]));
  for (const key of ["g", "c"]) {
    // fire casualties go down in DOWN order; the assault casualty is the lead man of the lead squad
    const fire = Math.floor(key === "g" ? F.hitG : F.hitC);
    const ids = (fire > 0 ? G.DOWN.slice(0, fire) : []).concat((key === "g" ? F.tookG : F.tookC) === 1 ? ["1-0"] : []);
    ids.slice(0, losses[key]).forEach((sid, k) => {
      const m = live.get(key + sid);
      if (!m) return;
      const fell = M.fell && M.fell[m.id];
      if (fell) { m.x = fell[0]; m.y = fell[1]; } else if (M.fell) M.fell[m.id] = [m.x, m.y];
      m.side = "fc"; m.lit = false; m.pose = "prone"; m.stride = 0; m.face = FACE_F + 30 * jit(k, 5);
      m.z = T.height(m.x, m.y) + (onDeck(m.x, m.y) ? DECK_Z : 0);
      if (k === 0) {
        const [mx, my] = fdFrame(m.x, m.y, FACE_F)(-1.2, 2.6);
        add({ id: `${key}-med`, side: "f", lit: key === "g", role: "r", pose: "kneel", face: FACE_F - 90, stride: 0, x: mx, y: my });
      }
    });
  }

  // --- fire ---
  const aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z);
  const streams = [];
  const friends = (key, sq) => men.filter((m) => m.pl === key && m.side === "f" && (sq === undefined || m.sq === sq));
  for (const key of ["g", "c"]) {
    const P_ = plat[key];
    const gunner = enemyAt[key + "mg"];
    // the machine gun: on whatever of this platoon is on the open road in its reach
    if (gunner && onRoad > 0.5) {
      const tgt = P_.exposed ? friends(key).map(aim) : [];
      streams.push({ id: gunner.id, side: "h", heavy: true, from: muzzle(gunner), to: tgt, period: 2.1, burst: 3, gap: 0.1, flight: 0.5, phase: key === "g" ? 0.2 : 0.9, on: 0.95, scatter: 3.2 });
    }
    // the fire team at the bridge: on the lead squad once it is within range
    const holders = enemyAt[key].filter((m) => m.pose === "hole" && m.role !== "mg");
    if (holders.length && P_.p > 0.32) {
      const tgt = friends(key, 1).map(aim);
      holders.slice(0, 2).forEach((m, i) => streams.push({ id: m.id, side: "h", heavy: m.role === "ar", from: muzzle(m), to: tgt, period: 2.6 + i * 0.4, burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.45, phase: i * 0.7 + (key === "g" ? 0 : 1.1), on: 0.55, scatter: 3 }));
    }
    // the platoon: the lead squad's automatic riflemen and team leaders fire back while pinned, and
    // in the assault; the second squad's automatic riflemen cover the crossing from the near bank
    const enemy = enemyAt[key].filter((m) => m.pose === "hole");
    if (!enemy.length) continue;
    const eAims = enemy.map(aim);
    const pinned = P_.exposed && !P_.moving;
    const assault = smooth01(0.7, 0.9, P_.p) * (took[key] ? 0 : 1);
    if (pinned || assault > 0.05) {
      friends(key, 1).filter((m) => m.role === "ar" || m.role === "tl").forEach((m, i) => streams.push({ id: m.id, side: "f", heavy: m.role === "ar", from: muzzle(m),
        to: pinned && gunner ? [aim(gunner)] : eAims, period: m.role === "ar" ? 1.9 : 2.7, burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.45, phase: i * 0.53 + (key === "g" ? 0.3 : 0.8), on: pinned ? 0.6 : assault, scatter: 2.2 }));
    }
    if (assault > 0.05) friends(key, 2).filter((m) => m.role === "ar").forEach((m, i) => streams.push({ id: m.id, side: "f", heavy: true, smoke: true, from: muzzle(m), to: eAims, period: 1.8, burst: 3, gap: 0.09, flight: 0.5, phase: i * 0.8 + 0.4, on: assault, scatter: 2.4 }));
  }
  return { men, streams, plat, onRoad, gunner: { g: enemyAt.gmg, c: enemyAt.cmg }, losses: fieldLosses(F), linked };
}

// Per-state ground marks: each machine gun's sector (red) while it is in its nest.
export function fieldMarks(K, P, T, pose) {
  let out = "";
  for (const key of ["g", "c"]) {
    const m = pose.gunner[key];
    if (!m || pose.onRoad < 0.5) continue;
    const f = nestFace(key);
    out += trFan(K, P, T, m.x, m.y, 6, 88, f - 9, f + 9, { side: "h", arcs: 2, alpha: 0.8 * pose.onRoad });
  }
  return out;
}

// The radio links: faint arcs rippling out from the headquarters mast to each platoon's RTO
// antenna, in screen space; `on` (0..1) fades them, so they vanish when the link is jammed.
export function fieldLink(K, P, pose, t, on) {
  if (on < 0.02) return "";
  const c = K.iso(fieldMastTop(), P);
  const ops = [];
  for (const key of ["g", "c"]) {
    const r = pose.men.find((m) => m.id === `${key}-rto`);
    if (!r) continue;
    const tipH = r.pose === "stand" ? 7.4 : r.pose === "kneel" ? 4.9 : 1.6;
    const e = K.iso([r.x, r.y, r.z + tipH], P);
    const dx = e[0] - c[0], dy = e[1] - c[1], dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    for (let i = 0; i < 5; i++) {
      const f = (t * 0.4 + i / 5 + (key === "g" ? 0 : 0.1)) % 1;
      const R = 3 + f * (dist - 5), half = Math.min(0.32, 7 / R + 0.06);
      const p0 = [c[0] + R * Math.cos(ang - half), c[1] + R * Math.sin(ang - half)], p1 = [c[0] + R * Math.cos(ang + half), c[1] + R * Math.sin(ang + half)];
      ops.push(`<path class="mc-sig" d="M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}A${R.toFixed(1)} ${R.toFixed(1)} 0 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}" opacity="${(on * 0.7 * Math.sin(Math.PI * f)).toFixed(2)}"/>`);
    }
  }
  return ops.join("");
}
