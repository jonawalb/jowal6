// The Battlefield view of Infiltration, at small-unit scale and at night, drawn with the terrain kit
// (../../kit/terrain.mjs). The same model plan and clock as the machine drive it:
//   p = plan(n)   the force split into n elements (1, 4, 9 or 16), each with its lane, queue place,
//                 timing and regroup place (model.mjs)
//   t             seconds into the run (the machine's R.t)
// The machine's tray maps onto the ground by a fixed scale: tray x (toward the screen) becomes the
// direction of the infiltration (+x), tray y becomes the width of the enemy line (y). The seven bars
// of the screen become seven enemy outposts, and the six gaps between bars the gaps between them;
// the collecting tray becomes the objective rally point. 36 friendly soldiers stay the same men
// whatever the split: one group of 36, four squads of 9, nine fire teams of 4, or sixteen pairs and
// threes. An element that fits no gap (the single big group) is spotted short of the line, fired on
// and stopped, as the machine's block is stopped at the bars.
// The back end: behind the line an enemy mortar section faces the front. A force that is detected
// on the way (model detection(): the big group, or the four squads) sends up a flare, turns the
// sentries and the mortar crew; after the regroup the force attacks the section from its rear by
// fire and movement, and the model's outcome (follow()) decides whether it takes it or stalls.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { losses, follow } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trHole, trNest, trPrism, trFan, trChalk, trSoldier, trFaceStep, trFireTeam, trSquad, trMorph, trPlace, trMuzzle, trAimPoint, trBound } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -340, y: -320, w: 680, d: 640 },
  ROT: -15,           // the line frame's turn on the ground (degrees), so the movement runs left to right
  KX: 1.1,            // ground units per tray unit along the direction of movement
  KY: 2.6,            // ground units per tray unit along the enemy line
  SLOW: 0.4,          // the battlefield runs the model's clock at this rate, so the men walk
  MEN: 36,            // friendly soldiers, the same men in every split
  FAN: [5, 30, 22],   // each outpost's observed sector: inner and outer radius, half-angle (degrees)
  ORP_PAD: [6, 6],    // the rally point's chalk outline beyond the regroup places (x, y)
  // casualties (counts from model.mjs losses()): the enemy men who can go down (outpost index, side
  // offset), drawn per frame instead of with the static outposts; which men of the single group go
  // down; and, for a split force, where its men down lie at the rally point (line frame u, v) and
  // where the man tending them kneels
  DOWN_H: [[3, 1.1], [3, -1.1]],
  DOWN_GROUP: [2, 9, 15, 22, 30],
  DOWN_ORP: [[85, -7], [85, 1]],
  MEDIC_ORP: [82, -3],
  // the back end (notional layout, line frame u, v): the enemy mortar section behind the outpost line
  // (two pits facing the front, clear of every route), the assault position behind it, the
  // support-by-fire line on its flank, and how far the assault gets
  TGT: { u: 30, v: -70, pits: [[0, 4.6], [0, -4.6]], r: 4.2 },
  AP: { back: 18, groups: 8, rank: 3, file: 2.8 },
  SBF: { u: 28, v: -46, file: 2.6, rank: 3 },
  BOUND: 5,           // length of one rush in the assault (units)
  HELD_TO: 8,         // the assault ends this far behind the pits when it takes the position
  LOST_TO: 15,        // ... and here when it stalls
  LIVE_POSTS: [3, 4], // outposts drawn per frame (their men turn or go down)
  REACT: 0.6,         // model seconds from the alarm to the mortar crew turning to face the rear
};
FG.TERRAIN = {
  rises: [
    { cx: -60, cy: -150, r: 30, steps: 3, h: 1.5, top: 0.45, seed: 13, wobble: 0.1 },
    { cx: 92, cy: 150, r: 30, steps: 4, h: 1.4, top: 0.42, seed: 17, wobble: 0.12 },
    { cx: -150, cy: 130, r: 28, steps: 3, h: 1.4, top: 0.45, seed: 19, wobble: 0.1 },
  ],
};

const FS_RAD = Math.PI / 180;
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];

// The layout is authored in a "line frame": u along the direction of movement (tray x), v along the
// enemy line (tray y). The ground is that frame turned by FG.ROT so the movement runs left to right
// across the card. fsW() maps line frame to ground, fsWi() back.
const FS_C = Math.cos(FG.ROT * FS_RAD), FS_S = Math.sin(FG.ROT * FS_RAD);
export const fsW = ([u, v]) => [u * FS_C - v * FS_S, u * FS_S + v * FS_C];
export const fsWi = ([x, y]) => [x * FS_C + y * FS_S, -x * FS_S + y * FS_C];
const fsWr = (ring) => ring.map(fsW);

// tray coordinates → ground
export const fieldXY = ([tx, ty], M) => fsW([(tx - M.screenX) * FG.KX, ty * FG.KY]);

export const fieldTerrain = () => trTerrain({ rises: FG.TERRAIN.rises.map((r) => { const [cx, cy] = fsW([r.cx, r.cy]); return { ...r, cx, cy }; }) });

// The seven outposts on the line, one per bar of the machine's screen (ground coordinates).
export function fieldPosts(M, lay) {
  return lay.bars.map(([y0, y1], i) => { const [x, y] = fsW([0, ((y0 + y1) / 2) * FG.KY]); return { i, x, y }; });
}

// The rally point's outline: the regroup places of the 2x2 split (the widest) plus a margin.
function orpRing(M) {
  const cu = (M.collectX - M.screenX) * FG.KX, hu = (M.force / 2) * FG.KX + FG.ORP_PAD[0], hv = (M.force / 2) * FG.KY + FG.ORP_PAD[1];
  return fsWr([[cu - hu, -hv], [cu + hu, -hv], [cu + hu, hv], [cu - hu, hv]]);
}

// Every route an element takes in any split (line frame), so cover is kept off them.
function routes(M, planFn) {
  const segs = [];
  const uv = ([tx, ty]) => [(tx - M.screenX) * FG.KX, ty * FG.KY];
  for (const n of M.splits) for (const e of planFn(n, M).els) {
    const pts = e.blocked ? [e.feed, e.stop] : [e.feed, e.pre, e.post, e.slot];
    for (let i = 0; i < pts.length - 1; i++) segs.push([uv(pts[i]), uv(pts[i + 1])]);
  }
  return segs;
}
const segDist = ([u, v], [[a, b], [c, d]]) => {
  const dx = c - a, dy = d - b, L = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((u - a) * dx + (v - b) * dy) / L));
  return Math.hypot(u - a - t * dx, v - b - t * dy);
};

export function fieldStatic(K, P, T, M, lay, planFn) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  const segs = routes(M, planFn);
  const orpU = (M.collectX - M.screenX) * G.KX;
  // keep the action clear: the start, every route, the posts and the rally point (line frame)
  const onRoute = (u, v, pad) => segs.some((s) => segDist([u, v], s) < pad);
  const busy = (x, y, pad = 12) => {
    const [u, v] = fsWi([x, y]);
    if (u > -100 - pad && u < -40 + pad && Math.abs(v) < 50 + pad) return true;                  // the start
    if (Math.abs(u) < 14 + pad * 0.3 && Math.abs(v) < 92) return true;                              // the line
    if (Math.abs(u - orpU) < 24 + pad * 0.5 && Math.abs(v) < 44 + pad * 0.5) return true;            // the rally point
    if (u > G.TGT.u - 14 - pad * 0.5 && u < G.TGT.u + G.AP.back + 12 + pad * 0.5 && v > G.TGT.v - 26 - pad * 0.5 && v < G.SBF.v + 8 + pad * 0.5) return true;   // the attack
    return onRoute(u, v, pad);
  };
  const blob = (u, v, r, seed, sq = 1, wob = 0.13) => fsWr(fdBlob(u, v, r, seed, wob, 40, sq));

  // meadows and fields toward the edges
  for (const [u, v, r, seed, sq] of [[-70, 128, 44, 3, 0.55], [60, -132, 40, 5, 0.6], [150, 40, 36, 7, 1.2], [-150, -100, 40, 9, 0.8]]) g(trPatch(K, P, blob(u, v, r, seed, sq)));
  const fields = [
    [[[-64, -96], [-20, -92], [-18, -42], [-62, -46]], 7, "a"],
    [[[-62, 34], [-20, 30], [-22, 92], [-64, 88]], 8, "b"],
    [[[18, -96], [52, -92], [50, -48], [16, -52]], 6, "b"],
    [[[16, 50], [50, 46], [52, 96], [18, 98]], 6, "a"],
    [[[-40, 104], [20, 106], [16, 150], [-46, 146]], 8, "a"],
    [[[30, 104], [96, 100], [100, 146], [34, 150]], 7, "b"],
    [[[-120, 104], [-52, 102], [-56, 146], [-124, 146]], 8, "b"],
    [[[30, -104], [96, -100], [100, -146], [34, -150]], 7, "a"],
    [[[-40, -104], [20, -106], [16, -150], [-46, -146]], 7, "b"],
    [[[140, -90], [190, -86], [186, -30], [136, -34]], 7, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, fsWr(ring), { furrows: n, tint }));

  // a stream behind the rally point, a farm road beyond it, a track from the farm toward the line
  g(trStream(K, P, fsWr([[118, -300], [112, -180], [120, -90], [114, -10], [122, 70], [116, 160], [124, 300]]), 3, 5));
  g(trRoad(K, P, fsWr([[150, -320], [146, -200], [150, -60], [148, 60], [152, 200], [148, 320]]), 3));
  g(trRoad(K, P, fsWr([[150, -60], [126, -86], [88, -106], [40, -116], [-40, -112], [-130, -118], [-260, -120]]), 2.2, { ruts: false }));

  // woods: the assembly area's wood behind the start, woods anchoring both ends of the line, a copse
  // beyond the rally point, and clumps of cover in the ground the routes cross
  const woods = [
    [blob(-158, 0, 52, 21, 2.3), 52, 21, [2.8, 4.4], [8, 12.5]],
    [blob(-6, -132, 30, 22, 0.8), 16, 22, [2.8, 4.4], [8, 12.5]],
    [blob(-2, 136, 30, 23, 0.8), 14, 23, [2.4, 3.6], [6, 9]],
    [blob(176, 10, 34, 24, 2), 24, 24, [2.8, 4.4], [8, 12.5]],
    [blob(-100, -130, 22, 25, 1), 9, 25, [2.8, 4.4], [8, 12.5]],
  ];
  // copses of a few trees in no man's land and behind the line, kept off every route
  for (const [u, v, r, seed] of [[-30, -86, 10, 31], [-28, 84, 9, 32], [-34, -22, 6, 33], [34, -78, 9, 34], [36, 76, 9, 35], [-56, 70, 7, 36], [-58, -72, 7, 37], [26, -32, 6, 38], [26, 34, 6, 39]]) woods.push([blob(u, v, r, seed), 4, seed, [2.2, 3.4], [5.5, 8.5], true]);
  for (const [ring, n, seed, r, h, small] of woods) {
    const trees = trScatter(ring, n, { seed, cone: 0, gap: small ? 4.6 : 5.6, r, h, avoid: (x, y) => busy(x, y, small ? 7 : 12) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    if (!trees.length) continue;
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-40, 104], [20, 106]], 51], [[[30, 104], [96, 100]], 52], [[[30, -104], [96, -100]], 53], [[[-120, 104], [-52, 102]], 54], [[[140, -90], [190, -86]], 55]]) items.push(...trHedge(K, P, fsWr(pts), { seed }));
  for (const [u, v, ang, len, wid] of [[168, -70, 0, 13, 8.5], [178, -50, 90, 11, 8]]) { const [x, y] = fsW([u, v]); items.push(trHouse(K, P, x, y, ang + G.ROT, len, wid)); }

  // covered routes through the gaps the elements use: a hedgerow either side of each lane where it
  // crosses the line, and a stream bed with bushes on its banks through the widest gap. Each hedge is
  // cut wherever an element's route crosses it, so the cover lines the routes without blocking them.
  const used = [...new Set(M.splits.flatMap((n) => planFn(n, M).open))];
  const gapsV = lay.gaps.map((gp) => ({ c: gp.centre * G.KY, h: (gp.width * G.KY) / 2 }));
  const widest = used.reduce((a, b) => (lay.gaps[b].width > lay.gaps[a].width ? b : a), used[0]);
  const hedgeAlong = (v, u0, u1, seed) => {
    let run = [];
    const flush = () => { if (run.length >= 2) items.push(...trHedge(K, P, fsWr(run), { seed: seed + run[0][0] })); run = []; };
    for (let u = u0; u <= u1 + 1e-6; u += 3) { if (onRoute(u, v, 3.2)) flush(); else run.push([u, v]); }
    flush();
  };
  for (const gi of used) {
    const { c, h } = gapsV[gi];
    const off = Math.max(3.4, h - 2.8);
    hedgeAlong(c - off, -34, 22, 60 + gi * 7);
    hedgeAlong(c + off, -34, 22, 61 + gi * 7);
  }
  {
    const c = gapsV[widest].c;
    g(trStream(K, P, fsWr([[-150, 190], [-90, 120], [-46, 52], [-22, c + 3], [0, c], [20, c + 3], [40, 52], [60, 92], [84, 160], [104, 300]]), 2.6, 9));
  }
  g(trRelief(K, P, T));

  // the enemy outpost line: a two-man fighting position per outpost, both men in it, facing the
  // friendly side
  const face = 180 + G.ROT;
  for (const p of fieldPosts(M, lay)) {
    const z = T.height(p.x, p.y);
    items.push(...trHole(K, P, p.x, p.y, z, face));
    const F = fdFrame(p.x, p.y, face);
    for (const [dv, role] of [[1.1, "ar"], [-1.1, "r"]]) {
      if (G.LIVE_POSTS.includes(p.i)) continue;   // drawn per frame (they turn, or go down)
      const [x, y] = F(0, dv);
      items.push({ key: K.depthOf([x, y, 0], P), svg: `<g class="tr-s" data-side="h" transform="translate(${K.iso([x, y, z], P).map((c) => c.toFixed(2)).join(" ")})">${trSoldier(K, P, { face: trFaceStep(face), pose: "hole", role })}</g>` });
    }
  }

  // the enemy mortar section behind the line: two horseshoe pits open to the rear, each with its
  // mortar laid on the front (the crews are drawn per frame)
  for (const pit of mortarPits()) {
    const z = T.height(pit.x, pit.y);
    items.push(...trNest(K, P, pit.x, pit.y, z, pit.face, { r: G.TGT.r }));
    items.push({ key: K.depthOf([pit.x, pit.y, 0], P), svg: `<g class="tr-s" data-side="h">${mortarSvg(K, P, pit, z)}</g>` });
  }

  // control measure: the objective rally point behind the line, a chalk outline on pegs
  const orp = trChalk(K, P, T, orpRing(M), { closed: true });
  g(orp.ground); items.push(...orp.items);
  return { ground: ground.join(""), items };
}

// The men of an element in three formations (offsets in the element's frame, u forward): moving
// toward the line, filing through a gap, and huddled at the rally point.
function forms(n, size) {
  const s = 4.2;
  if (n === 1) {
    // the whole force as one group: four squad columns abreast (teams in wedges)
    const move = [];
    [-27, -9, 9, 27].forEach((dv, q) => trSquad("column", "wedge", 3.4).forEach((m) => move.push({ ...m, off: [m.off[0] - 10, m.off[1] + dv] })));
    return { move, file: move, hud: move };
  }
  if (size === 9) {
    const move = trSquad("column", "wedge", s), file = trSquad("file", "wedge", 2.3);
    const hud = move.map((m, i) => ({ ...m, off: [-Math.floor(i / 3) * 3.2 + 3.2, (i % 3 - 1) * 3.4] }));
    return { move, file, hud };
  }
  if (size === 4) {
    const move = trFireTeam("wedge", s), file = trFireTeam("file", 2.8);
    const hud = move.map((m, i) => ({ ...m, off: [(i < 2 ? 1.6 : -1.6), (i % 2 ? -1.7 : 1.7)] }));
    return { move, file, hud };
  }
  const roles = ["tl", "ar", "r"];
  const mv = [[0, 0], [-3.4, -3], [-3.4, 3]], fl = [[0, 0], [-3, 0], [-6, 0]], hd = [[1.4, -1.6], [1.4, 1.6], [-1.6, 0]];
  const pick = (a) => a.slice(0, size).map((off, i) => ({ role: roles[i], off }));
  return { move: pick(mv), file: pick(fl), hud: pick(hd) };
}

// How many men each element of a split carries (always 36 in all).
export function fieldSizes(n) {
  if (n === 1) return [36];
  if (n === 4) return [9, 9, 9, 9];
  if (n === 9) return Array(9).fill(4);
  return Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? 3 : 2));
}

// The mortar pits (ground coordinates) and the crew places in each (pit frame: u forward, toward
// the front).
const FRONT = 180 + FG.ROT;
export function mortarPits() {
  return FG.TGT.pits.map(([du, dv], i) => { const [x, y] = fsW([FG.TGT.u + du, FG.TGT.v + dv]); return { i, x, y, face: FRONT }; });
}
const CREW = [[-0.7, 1.5, "r"], [-0.7, -1.5, "r"], [-5.6, 0.9, "r"]];   // gunner, assistant, ammo bearer
// A mortar on its baseplate: the tube laid toward the front at about 60 degrees, on a bipod.
function mortarSvg(K, P, pit, z) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, pit.face);
  const at = (u, v, h) => K.iso([...F(u, v), h], P0);
  const plate = [F(-0.2, -0.9), F(1.2, -0.9), F(1.2, 0.9), F(-0.2, 0.9)];
  let out = trPrism(K, P0, plate, 0.02, 0.32, true);
  out += `<path class="tr-wire" d="${K.pathOf([at(2.1, -0.95, 0), at(1.85, 0, 2.1), at(2.1, 0.95, 0)])}"/>`;
  out += `<path class="tr-gun" data-heavy="" d="${K.pathOf([at(0.5, 0, 0.32), at(2.4, 0, 3.6)])}"/>`;
  const [sx, sy] = K.iso([pit.x, pit.y, z], P);
  return `<g transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${out}</g>`;
}

const lf = ([u, v]) => fsW([u, v]);
const angTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / FS_RAD;   // world degrees

// When each man goes down (model seconds), from the model's loss counts: the k-th friendly and
// enemy loss of the run, found by a scan. Cached per plan.
const DOWNS = new WeakMap();
function downTimes(p, M, f) {
  if (DOWNS.has(p)) return DOWNS.get(p);
  const blue = [], red = [];
  for (let t = 0; t <= f.end + 0.01; t += 0.005) {
    const L = losses(p, t, M, f);
    while (blue.length < L.blue) blue.push(t);
    while (red.length < L.red) red.push(t);
  }
  const d = { blue, red };
  DOWNS.set(p, d);
  return d;
}

// The crossing: where every friendly soldier of the plan stands at model time t (before the attack,
// or kneeling at the rally point after it has regrouped). Returns men with el (element index).
function crossing(p, t, M, T, posAt, f) {
  const G = FG, A = M.approach, PS = M.pass, RG = M.regroup;
  const WX = (q) => fieldXY(q, M);
  const sizes = fieldSizes(p.n);
  const men = [];
  let spotted = 0, bigAt = null;
  p.els.forEach((e, ei) => {
    const size = sizes[ei];
    const Fm = forms(p.n, size);
    const here = WX(posAt(e, t, M));
    let mix, form0, form1, face, pose = "stand", dist = 0, moving = true;
    const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / FS_RAD - FG.ROT;   // in the line frame
    const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (e.blocked) {
      const fr = Math.min(1, t / A);
      face = 0; form0 = Fm.move; form1 = Fm.move; mix = 0;
      dist = len(WX(e.feed), here);
      const sp = f.at === null ? 0 : smooth01(0, 0.2 * A, t - f.at);
      spotted = Math.max(spotted, sp);
      if (sp > 0.5) { pose = "prone"; moving = false; }
      else if (fr <= 0) { pose = "kneel"; moving = false; }
      bigAt = here;
    } else {
      const s = t - e.start;
      const feed = WX(e.feed), pre = WX(e.pre), post = WX(e.post), slot = WX(e.slot);
      if (s <= 0) { form0 = form1 = Fm.hud; mix = 0; face = 0; pose = "kneel"; moving = false; }
      else if (s < A * 0.4) { form0 = Fm.hud; form1 = Fm.move; mix = smooth01(0, 0.4, s / A); face = ang(feed, pre); dist = len(feed, here); }
      else if (s < A) { form0 = Fm.move; form1 = Fm.file; mix = smooth01(0.5, 0.95, s / A); face = ang(feed, pre); dist = len(feed, here); }
      else if (s < A + PS) { form0 = form1 = Fm.file; mix = 0; face = ang(pre, post); dist = len(feed, pre) + len(pre, here); }
      else if (s < A + PS + RG) {
        const u = (s - A - PS) / RG;
        form0 = Fm.file; form1 = Fm.hud; mix = smooth01(0.45, 1, u);
        face = u < 0.85 ? ang(post, slot) : 0; dist = len(feed, pre) + len(pre, post) + len(post, here);
      } else { form0 = form1 = Fm.hud; mix = 0; face = 0; pose = "kneel"; moving = false; }
    }
    face += FG.ROT;
    const placed = trPlace(trMorph(form0, form1, mix), { x: here[0], y: here[1], face });
    placed.forEach((m, i) => men.push({ id: `f-${men.length}`, side: "f", lit: true, el: ei, role: (form0[i] && form0[i].role) || m.role || "r", pose, face,
      stride: moving ? strideAt(dist + i * 0.9) : 0, x: m.x, y: m.y, z: T.height(m.x, m.y) }));
  });
  return { men, spotted, bigAt };
}

// The attack: each attacker's place at model time t (t >= f.move0). Attackers are split into a
// support-by-fire line on the target's flank (a third) and two assault groups that bound in turn
// from the assault position behind the target (fire and movement): the group not moving lies down
// and fires. When surprise held they reach the position; when it was lost they stall short of it.
function attackPlaces(list, f, M, t) {
  const G = FG, n = list.length, nS = Math.round(n / 3), rest = n - nS;
  const AP = { u: G.TGT.u + G.AP.back, v: G.TGT.v };
  const out = [];
  const mv = smooth01(f.move0, f.strike0, t);
  const a = Math.max(0, Math.min(1, (t - f.strike0) / M.assault));
  const goal = f.detected ? G.LOST_TO : G.HELD_TO;
  const S = Math.max(0, G.AP.back - goal);
  const sAt = S * smooth01(0, f.detected ? 0.45 : 0.8, a);
  const bound = trBound(sAt, G.BOUND, sAt >= S - 1e-6 ? 0 : 1);
  const done = sAt >= S - 1e-6;
  list.forEach((m, k) => {
    let target, face, pose, moving = false;
    if (k < nS) {
      // support by fire: two ranks on the flank, facing the target
      const cols = Math.ceil(nS / 2), j = (k % cols) - (cols - 1) / 2, r = Math.floor(k / cols);
      const to = [G.SBF.u + j * G.SBF.file, G.SBF.v + r * G.SBF.rank + Math.abs(j) * 0.4];
      target = to;
      face = Math.atan2(G.TGT.v - to[1], G.TGT.u - to[0]) / FS_RAD;
      pose = mv < 1 ? "stand" : "prone";
    } else {
      const q = k - nS, g = q % 2, j = Math.floor(q / 2), per = Math.ceil(rest / 2);
      const cols = Math.ceil(per / 2), r = j % 2, c = Math.floor(j / 2);
      const gv = AP.v + (g ? G.AP.groups : -G.AP.groups);
      const s = t < f.strike0 ? 0 : g ? bound.b : bound.a;
      target = [AP.u + r * G.AP.rank - s, gv + (c - (cols - 1) / 2) * G.AP.file];
      face = 180;
      const rushing = t >= f.strike0 && !done && bound.moving === (g ? "b" : "a");
      pose = t < f.strike0 ? (mv < 1 ? "stand" : "kneel") : rushing ? "stand" : done && !f.detected ? "kneel" : "prone";
      moving = rushing;
      m.group = g;
    }
    out.push({ m, k, support: k < nS, target, face, pose, moving });
  });
  return { out, mv, done, a };
}

// Where every soldier stands and who fires at whom, for the plan p at model time t.
// Returns { men, streams, alert, flare, LS }.
export function fieldPose(p, t, M, lay, T, posAt, f = follow(p, M)) {
  const G = FG;
  const { men, spotted, bigAt } = crossing(p, t, M, T, posAt, f);
  const LS = losses(p, t, M, f);
  const D = downTimes(p, M, f);
  const o = f.out;
  const grey = (m, x, y) => Object.assign(m, { side: "fc", lit: false, pose: "prone", stride: 0, x, y, z: T.height(x, y) });

  // --- crossing casualties (notional; the model's counts): greyed and still ---
  if (!p.through) {
    G.DOWN_GROUP.slice(0, LS.blue).forEach((k) => Object.assign(men[k], { side: "fc", lit: false, pose: "prone", stride: 0 }));
    if (LS.blue > 0) Object.assign(men[G.DOWN_GROUP[0] + 1], { pose: "kneel", stride: 0 });
  }
  const atORP = [];
  if (p.through && f.detected && t >= D.blue[0]) {
    // one man of the squad that was seen is hit in the gap; once his squad has regrouped he lies at
    // the rally point with a man of his squad kneeling by him
    const e = p.els[f.el];
    const mine = men.filter((m) => m.el === f.el);
    const hit = mine[mine.length - 1], medic = mine[mine.length - 2];
    if (t < e.end) {
      const at = crossing(p, D.blue[0], M, T, posAt, f).men.find((m) => m.id === hit.id);
      grey(hit, at.x, at.y);
    } else {
      const [x, y] = lf(G.DOWN_ORP[0]);
      grey(hit, x, y); hit.face = FG.ROT + 75;
      const [mx, my] = lf(G.MEDIC_ORP);
      Object.assign(medic, { pose: "kneel", stride: 0, face: FG.ROT + 10, x: mx, y: my, z: T.height(mx, my) });
    }
    atORP.push(hit.id, medic.id);
  }

  // --- the attack ---
  let att = null;
  if (p.through && t >= f.move0) {
    const list = men.filter((m) => !atORP.includes(m.id));
    att = attackPlaces(list, f, M, t);
    const start = new Map(crossing(p, f.reorg0 + 0.001, M, T, posAt, f).men.map((m) => [m.id, m]));
    att.out.forEach((A) => {
      const s0 = start.get(A.m.id), [tx, ty] = lf(A.target);
      const x = s0.x + (tx - s0.x) * att.mv, y = s0.y + (ty - s0.y) * att.mv;
      const travelling = att.mv > 0 && att.mv < 1;
      const face = travelling ? angTo([s0.x, s0.y], [tx, ty]) : A.face + FG.ROT;
      const dist = Math.hypot(x - s0.x, y - s0.y) + (A.moving ? (t - f.strike0) * 30 : 0);
      Object.assign(A.m, { x, y, z: T.height(x, y), face, pose: travelling ? "stand" : A.pose, stride: travelling || A.moving ? strideAt(dist + A.k * 0.9) : 0 });
    });
    // the attack's own losses: assault men, taken in turn from the two groups
    const assault = att.out.filter((A) => !A.support);
    D.blue.forEach((td, k) => {
      if (k < o.crossBlue || t < td) return;
      const A = assault[((k - o.crossBlue) * 5 + 2) % assault.length];
      if (!A) return;
      const then = attackPlaces(list.map((m) => ({ ...m })), f, M, td).out[A.k];
      const s0 = start.get(A.m.id), [tx, ty] = lf(then.target), mv = smooth01(f.move0, f.strike0, td);
      grey(A.m, s0.x + (tx - s0.x) * mv, s0.y + (ty - s0.y) * mv);
      A.down = true;
    });
  }

  // --- the enemy: the live outposts, and the mortar crew ---
  const alertAt = f.detected ? f.at : null;
  const alert = alertAt === null ? 0 : smooth01(alertAt, alertAt + 0.3, t);
  const posts = fieldPosts(M, lay);
  const seenEl = f.detected && p.through ? f.el : -1;
  const enemy = [];
  G.LIVE_POSTS.forEach((i) => {
    const po = posts[i], F = fdFrame(po.x, po.y, FRONT);
    [[1.1, "ar"], [-1.1, "r"]].forEach(([dv, role]) => {
      const kDown = G.DOWN_H.findIndex(([j, d]) => j === i && d === dv);
      const down = kDown >= 0 && kDown < (p.through ? 0 : LS.red);
      let face = FRONT;
      // a sentry who has seen a squad slip through his gap turns to follow it
      if (seenEl >= 0 && t > alertAt + 0.15) {
        const el = men.filter((m) => m.el === seenEl && m.side === "f");
        const c = el.length ? [el.reduce((s, m) => s + m.x, 0) / el.length, el.reduce((s, m) => s + m.y, 0) / el.length] : lf([60, 0]);
        face = angTo([po.x, po.y], c);
      }
      const [x, y] = down ? F(-4, dv * 2.2) : F(0, dv);
      enemy.push({ id: `e-${i}${dv > 0 ? "a" : "b"}`, side: down ? "hc" : "h", role, pose: down ? "prone" : "hole", stride: 0, face: down ? FRONT + 60 * (dv > 0 ? 1 : -1) : face, x, y, z: T.height(po.x, po.y) });
    });
  });
  // the crew: at their mortars facing the front; alerted (seen on the way in) they turn to face the
  // rear after REACT; caught by surprise they turn only once the assault is under way
  const pits = mortarPits();
  const rear = FG.ROT;                     // facing +u, toward the rally point and the assault
  const turnAt = !p.through ? Infinity : f.detected ? f.at + G.REACT : f.strike0 + 0.3 * M.assault;
  const crew = [];
  pits.forEach((pit) => CREW.forEach(([du, dv, role], c) => {
    const F = fdFrame(pit.x, pit.y, pit.face);
    const k = crew.length;
    const down = p.through && D.red[o.crossRed + k] !== undefined && t >= D.red[o.crossRed + k];
    const turned = t >= turnAt;
    const [x, y] = down ? F(du - 1.2, dv * 1.6) : turned && c === 2 ? F(-3.4, 0.9) : F(du, dv);
    const m = { id: `e-m${pit.i}${c}`, side: down ? "hc" : "h", role, pose: down ? "prone" : "kneel", stride: 0, face: down ? rear + 90 : turned ? rear : pit.face, x, y, z: T.height(x, y) };
    crew.push(m);
  }));
  const all = [...men, ...enemy, ...crew];

  // --- fire ---
  const streams = [];
  if (bigAt && spotted > 0.02) {
    // the big group, spotted short of the line: the outposts in front of it open fire on it
    const targets = men.filter((m) => m.side === "f").map((m) => trAimPoint(m, m.x, m.y, m.z));
    const bigV = fsWi(bigAt)[1];
    posts.forEach((po, i) => {
      if (G.DOWN_H.some(([j, d], k) => j === i && d > 0 && k < LS.red)) return;   // its gunner is down
      if (Math.abs(fsWi([po.x, po.y])[1] - bigV) > 52) return;
      const F = fdFrame(po.x, po.y, FRONT);
      const [x, y] = F(0, 1.1), z = T.height(x, y);
      streams.push({ id: `p${i}`, side: "h", heavy: true, from: trMuzzle({ face: trFaceStep(FRONT), pose: "hole", role: "ar" }, x, y, z), to: targets, period: 1.3 + i * 0.17, burst: 3, gap: 0.1, flight: 0.34, phase: i * 0.61, on: spotted, scatter: 4 });
    });
  }
  if (seenEl >= 0) {
    // the squad seen in the gap draws a short burst of fire from the outposts either side of it
    const on = smooth01(alertAt, alertAt + 0.1, t) * (1 - smooth01(alertAt + 0.9, alertAt + 1.2, t));
    const targets = men.filter((m) => m.el === seenEl && m.side === "f").map((m) => trAimPoint(m, m.x, m.y, m.z));
    if (on > 0.01 && targets.length) enemy.filter((m) => m.role === "ar" && m.side === "h").forEach((m, i) => streams.push({ id: `g${i}`, side: "h", heavy: true, from: trMuzzle(m, m.x, m.y, m.z), to: targets, period: 0.9 + i * 0.2, burst: 3, gap: 0.1, flight: 0.3, phase: i * 0.37, on, scatter: 3 }));
  }
  if (att && t >= f.strike0) {
    const liveCrew = crew.filter((m) => m.side === "h");
    const crewAims = liveCrew.map((m) => trAimPoint(m, m.x, m.y, m.z));
    const firing = att.out.filter((A) => !A.down && A.pose === "prone" && (A.support || !A.moving));
    if (crewAims.length) firing.forEach((A, i) => {
      if (i % 3) return;
      streams.push({ id: `b${A.k}`, side: "f", from: trMuzzle(A.m, A.m.x, A.m.y, A.m.z), to: crewAims, period: 1.0 + (i % 5) * 0.13, burst: 3, gap: 0.09, flight: 0.3, phase: i * 0.29, on: 1, scatter: 2.4 });
    });
    // the crew fires back only once it has turned; caught by surprise, little and late
    const blueAims = att.out.filter((A) => !A.down).map((A) => trAimPoint(A.m, A.m.x, A.m.y, A.m.z));
    if (t >= turnAt) liveCrew.forEach((m, i) => streams.push({ id: `r${i}`, side: "h", from: trMuzzle(m, m.x, m.y, m.z), to: blueAims, period: 1.1 + i * 0.15, burst: 2, gap: 0.12, flight: 0.3, phase: i * 0.41, on: f.detected ? 1 : 0.35, scatter: 3 }));
  }

  // --- the illumination flare, sent up from the outpost line when the force is detected ---
  let flare = null;
  if (f.detected && t >= f.at) {
    const age = t - f.at, life = M.flare;
    const from = posts[3];
    const over = p.through ? lf([2, (lay.gaps[p.open[0]].centre) * G.KY]) : [bigAt[0], bigAt[1]];
    const rise = smooth01(0, 0.35, age);
    const hx = from.x + (over[0] - from.x) * rise + 1.2 * age, hy = from.y + (over[1] - from.y) * rise;
    const hz = 44 * Math.sin(Math.min(1, age / 0.35) * Math.PI / 2) - 4 * Math.max(0, age - 0.35);
    const b = age < 0.35 ? 0.15 : smooth01(0.35, 0.6, age) * (1 - smooth01(life - 1.2, life, age));
    const trail = [];
    for (let i = 0; i <= 12; i++) {
      const a2 = (Math.min(age, 0.35) * i) / 12, r2 = smooth01(0, 0.35, a2);
      trail.push([from.x + (over[0] - from.x) * r2 + 1.2 * a2, from.y + (over[1] - from.y) * r2, T.height(from.x, from.y) + 44 * Math.sin(Math.min(1, a2 / 0.35) * Math.PI / 2)]);
    }
    flare = { head: [hx, hy, hz + T.height(hx, hy)], ground: [hx, hy, T.height(hx, hy)], b, trail, trailA: 0.55 * (1 - smooth01(0.4, 1.6, age)) };
  }
  return { men: all, streams, alert: Math.max(alert, spotted), flare, LS };
}

// Per-state ground marks: each outpost's observed sector (red), brighter once the line is alerted.
export function fieldMarks(K, P, T, M, lay, pose) {
  const [r0, r1, half] = FG.FAN;
  const a = 180 + FG.ROT, [ox, oy] = fsW([-1.5, 0]);
  return fieldPosts(M, lay).map((po) => trFan(K, P, T, po.x + ox, po.y + oy, r0, r1, a - half, a + half, { side: "h", arcs: 1, alpha: 0.45 + 0.4 * pose.alert })).join("");
}
