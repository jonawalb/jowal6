// The machine: a terrain block under five transparent overlay plates that drop one by one, a pencilled route
// on the top plate and a lit bead (the platoon) that walks it. Written against the kit as a parameter (K);
// build.mjs inlines this file with `export` stripped. The ground is the model's (model.mjs).
//   V.drop[0..4]  how far plate j has dropped, 0 raised .. 1 down (plate j is the j-th overlay applied)
//   V.seq         the aspect keys in the order applied
//   V.route       the walked route {pts, s, length} and V.s the bead's distance along it
//   V.n           overlays applied (for the route's level)
export const GEO = {
  SX: 0.72,           // bench units per model unit
  ZS: 1.5,            // bench units of height per model height unit
  BASE: 3,            // the ground block's slab thickness
  PLATE: { x: -102, y: -78, w: 204, d: 156, r: 8 },
  PLATE_T: 0.9,       // each overlay's thickness
  STACK0: 30,         // z of the first applied plate
  STEP: 3.4,          // gap between applied plates
  RAISED: 74,         // z of the first raised plate
  POST_H: 108,
};
export const bxy = (x, y) => [GEO.SX * x, GEO.SX * y];
const TILE = { dead: "oa-dead", aa: "oa-aa", key: "oa-key", nogo: "oa-nogo", slow: "oa-slow", cover: "oa-cover", conceal: "oa-conceal" };

export function plateZ(j, drop) {
  const G = GEO, a = G.STACK0 + G.STEP * j, r = G.RAISED + G.STEP * 1.6 * j;
  return r + (a - r) * drop;
}
// z of the surface the route is drawn on: the top applied plate, or the block
export function routeZ(V, model, model_height) {
  let top = null;
  for (let j = 0; j < V.drop.length; j++) if (V.drop[j] > 0.98) top = j;
  return top === null ? GEO.BASE + GEO.ZS * 10.4 + 4 : plateZ(top, 1) + GEO.PLATE_T + 0.6;
}

export function staticBlock(K, P, MODEL, A) {
  // A: { height, aspectTiles unused }. Everything that does not move: plate, feet, ground, hills, features, rack.
  const G = GEO, out = [];
  const S = (paths, style) => K.solidSvg(paths, style);
  const L = (d, style) => K.lineSvg(d, style);
  const Dt = (pts, size = 0.42) => K.dotsSvg(pts.map((p) => K.iso(p, P)), { size });
  const PLATE = G.PLATE, PH = 12, FH = 5;
  out.push(`<path class="iso-halo" d="${K.haloOf(PLATE, -PH - FH, PH, P)}"/>`);
  const byDepth = (pts) => [...pts].sort((a, b) => K.depthOf([a[0], a[1], 0], P) - K.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of byDepth(K.corners(PLATE, 20))) {
    out.push(S(K.cylinder(x, y, 7, -PH - FH, 1.6, P, 28), { tone: "lo" }));
    out.push(S(K.cylinder(x, y, 5.4, -PH - FH + 1.6, FH - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(K.slabOf(PLATE, -PH, PH, P, 8, 1.6), { tone: "mid", inner: L(K.sideSeam(PLATE, -6, P, 8), { tone: "faint" }) }));
  out.push(L(K.planOutline(K.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = K.corners(PLATE, 8);
  out.push(L(screws.map(([x, y]) => K.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => [x, y, 0])));
  // label plate with rule lines at the front left
  const LABEL = { x: PLATE.x + 8, y: PLATE.y + PLATE.d - 15, w: 34, d: 9, r: 1.5 };
  out.push(S(K.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(K.planOutline(K.insetPlan(LABEL, 1.4), 0.8, P), { tone: "faint" }));
  [[22, 3.2], [15, 5.8]].forEach(([len, dy]) => out.push(L(K.lineOnTop([LABEL.x + 4, LABEL.y + dy], [LABEL.x + 4 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([[LABEL.x + 2.4, LABEL.y + 2.4, 0.8], [LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8]], 0.4));

  // the ground block: one slab for the world rect, then each hill's terraces
  const W = MODEL.world, [x0, y0] = bxy(W.x0, W.y0), [x1, y1] = bxy(W.x1, W.y1);
  const block = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 2 };
  out.push(S(K.slabOf(block, 0, G.BASE, P, 6, 0.6), { tone: "mid", inner: L(K.sideSeam(block, 1.5, P, 6), { tone: "faint" }) }));
  // the stream, drawn on the ground as a ribbon, with the ford and the bridge left as gaps
  const water = [];
  const SY = (x) => A.streamY(x, MODEL);
  const seg = (xa, xb) => {
    const top = [], bot = [];
    for (let x = xa; x <= xb + 1e-6; x += 4) { const y = SY(x), [px, py] = bxy(x, y), [, hy] = bxy(0, MODEL.streamHalf); top.push([px, py - hy, G.BASE + 0.05]); bot.push([px, py + hy, G.BASE + 0.05]); }
    return [...top, ...bot.reverse()];
  };
  const gaps = [[MODEL.ford.x - MODEL.ford.half, MODEL.ford.x + MODEL.ford.half], [MODEL.bridge.x - MODEL.bridge.half, MODEL.bridge.x + MODEL.bridge.half]].sort((a, b) => a[0] - b[0]);
  let at = W.x0;
  for (const [ga, gb] of gaps) { water.push(seg(at, ga)); at = gb; }
  water.push(seg(at, W.x1));
  for (const ring of water) out.push(`<path class="tr-water" d="${K.onTop(ring.map(([x, y]) => [x, y]), G.BASE + 0.05, P, true)}"/>`);
  // the bridge deck
  {
    const bxm = bxy(MODEL.bridge.x, SY(MODEL.bridge.x));
    out.push(S(K.slabOf({ x: bxm[0] - 4.2, y: bxm[1] - 6.2, w: 8.4, d: 12.4, r: 0.6 }, G.BASE, 0.9, P, 3, 0.2), { tone: "lo", crease: "faint" }));
  }
  // woods: a floor patch with a few trees
  for (const w of MODEL.woods) {
    const [px, py] = bxy(w.cx, w.cy), r = w.r * G.SX;
    const ring = Array.from({ length: 24 }, (_, i) => [px + Math.cos((i / 24) * 6.2832) * r, py + Math.sin((i / 24) * 6.2832) * r]);
    out.push(`<path class="tr-meadow" d="${K.onTop(ring, G.BASE + 0.04, P, true)}"/>`);
  }
  // hills: terraces, bottom up
  const hillItems = [];
  for (const h of MODEL.hills) {
    for (let i = 0; i < h.steps; i++) {
      const f = 1 - (i / Math.max(1, h.steps - 1)) * (1 - h.top);
      const [cx0, cy0] = bxy(h.cx, h.cy), r = h.r * f * G.SX;
      const ring = Array.from({ length: 36 }, (_, q) => [cx0 + Math.cos((q / 36) * 6.2832) * r, cy0 + Math.sin((q / 36) * 6.2832) * r]);
      hillItems.push({ key: K.depthOf([cx0, cy0, 0], P) * 1 + i * 0.001, svg: S(K.extrude(ring, G.BASE + i * h.h * G.ZS, h.h * G.ZS, P), { tone: "mid", crease: "faint" }) });
    }
  }
  hillItems.sort((a, b) => a.key - b.key);
  // trees, village, wire, wall as small solids, depth-sorted with the hills by key
  const small = [];
  const put = (x, y, z, svg) => small.push({ key: K.depthOf([x, y, z], P), svg });
  MODEL.woods.forEach((w, wi) => {
    for (let q = 0; q < 9; q++) {
      const a = (q * 2.399 + wi) % 6.283, rr = w.r * 0.75 * Math.sqrt((q + 0.5) / 9);
      const [tx, ty] = bxy(w.cx + Math.cos(a) * rr, w.cy + Math.sin(a) * rr);
      const gz = G.BASE + A.height(w.cx + Math.cos(a) * rr, w.cy + Math.sin(a) * rr, MODEL) * G.ZS;
      put(tx, ty, gz + 2, S(K.cylinder(tx, ty, 0.5, gz, 2.4, P, 8), { tone: "lo", crease: "none" }) + S(K.cylinder(tx, ty, 2.0, gz + 2.4, 3.6, P, 12, 0.3), { tone: "mid", crease: "faint" }));
    }
  });
  MODEL.village.forEach(([hx, hy]) => { const [px, py] = bxy(hx, hy); put(px, py, G.BASE + 3, S(K.slabOf({ x: px - 3.2, y: py - 2.4, w: 6.4, d: 4.8, r: 0.5 }, G.BASE, 3.6, P, 3, 0.3), { tone: "mid" })); });
  for (let q = 0; q < 5; q++) { // wall
    const t = q / 4, [wx, wy] = [MODEL.wall[0][0] + (MODEL.wall[2][0] - MODEL.wall[0][0]) * t, MODEL.wall[0][1] + (MODEL.wall[2][1] - MODEL.wall[0][1]) * t];
    const [px, py] = bxy(wx, wy);
    put(px, py, G.BASE + 1, S(K.slabOf({ x: px - 1.6, y: py - 1.0, w: 3.2, d: 2.0, r: 0.3 }, G.BASE, 1.6, P, 3, 0.2), { tone: "lo", crease: "none" }));
  }
  // wire belt: pegs
  { const p = MODEL.wire; for (let q = 0; q < 7; q++) { const t = q / 6, seg = t < 0.5 ? [p[0], p[1], t * 2] : [p[1], p[2], (t - 0.5) * 2]; const wx = seg[0][0] + (seg[1][0] - seg[0][0]) * seg[2], wy = seg[0][1] + (seg[1][1] - seg[0][1]) * seg[2]; const [px, py] = bxy(wx, wy); const gz = G.BASE + A.height(wx, wy, MODEL) * G.ZS; put(px, py, gz + 1.5, S(K.cylinder(px, py, 0.45, gz, 3, P, 8), { tone: "mid", crease: "none" })); } }
  // the enemy observer's mast on the top of the first hill, and the objective post
  { const h = MODEL.hills[0], [px, py] = bxy(h.cx, h.cy), gz = G.BASE + A.height(h.cx, h.cy, MODEL) * G.ZS; put(px, py, gz + 6, S(K.cylinder(px, py, 0.7, gz, 8, P, 10), { tone: "mid", crease: "none" }) + S(K.cylinder(px, py, 1.7, gz + 8, 1.8, P, 14, 0.3), { tone: "hi", crease: "lo" })); }
  { const [jx, jy] = bxy(MODEL.junction[0], MODEL.junction[1]); put(jx, jy, G.BASE + 2, S(K.cylinder(jx, jy, 0.5, G.BASE, 5, P, 8), { tone: "mid", crease: "none" }) + S(K.slabOf({ x: jx + 0.4, y: jy - 0.4, w: 5, d: 0.8, r: 0.2 }, G.BASE + 3, 2.6, P, 3), { tone: "hi", crease: "none" })); }
  const all = [...hillItems, ...small].sort((a, b) => a.key - b.key);
  out.push(`<g data-part="ground">${all.map((i) => i.svg).join("")}</g>`);
  // the rack: four posts at the corners of the plate and a top bar
  const posts = [[PLATE.x + 4, PLATE.y + 4], [PLATE.x + PLATE.w - 4, PLATE.y + 4], [PLATE.x + 4, PLATE.y + PLATE.d - 4], [PLATE.x + PLATE.w - 4, PLATE.y + PLATE.d - 4]];
  return { base: out.join(""), posts };
}

export function postsSvg(K, P, posts) {
  const G = GEO, S = (paths, style) => K.solidSvg(paths, style);
  const sorted = [...posts].sort((a, b) => K.depthOf([a[0], a[1], 0], P) - K.depthOf([b[0], b[1], 0], P));
  return sorted.map(([x, y]) => S(K.cylinder(x, y, 1.6, 0, G.POST_H, P, 12), { tone: "mid", crease: "none" }) + S(K.cylinder(x, y, 2.4, G.POST_H, 2.2, P, 14, 0.4), { tone: "hi", crease: "lo" })).join("");
}

// the live part: plates, tiles, route, bead. V.drop: five numbers; V.seq: five aspect keys.
export function scene(K, P, V, MODEL, tilesOf, cellsX, cellsY) {
  const G = GEO, items = [];
  const put = (key, svg) => items.push({ key, svg });
  const S = (paths, style) => K.solidSvg(paths, style);
  const W = MODEL.world, C = MODEL.cell;
  const quad = (i0, i1, j, z) => {
    const xa = W.x0 + i0 * C, xb = W.x0 + (i1 + 1) * C, ya = W.y0 + j * C, yb = W.y0 + (j + 1) * C;
    const [a, b] = bxy(xa, ya), [c, d] = bxy(xb, yb);
    return [[a, b], [c, b], [c, d], [a, d]];
  };
  const [bx0, by0] = bxy(W.x0, W.y0), [bx1, by1] = bxy(W.x1, W.y1);
  for (let j = 0; j < V.seq.length; j++) {
    const z = plateZ(j, V.drop[j]);
    const plan = { x: bx0 - 1.5, y: by0 - 1.5, w: bx1 - bx0 + 3, d: by1 - by0 + 3, r: 3 };
    let tiles = "";
    for (const t of tilesOf(V.seq[j])) {
      const d = t.runs.map(([i0, i1, jj]) => K.onTop(quad(i0, i1, jj), z + G.PLATE_T, P, true)).join("");
      tiles += `<path class="${TILE[t.cls]}" d="${d}"/>`;
    }
    put(z, `<g class="oa-plate" data-j="${j}"><g opacity="0.34">${S(K.slabOf(plan, z, G.PLATE_T, P, 6, 0.3), { tone: "lo", crease: "none" })}</g>${tiles}</g>`);
  }
  // route and bead on the surface
  if (V.route && V.route.pts.length > 1) {
    const z = routeZ(V, MODEL) + 0.2;
    const pts = V.route.pts, ribbon = [];
    const step = Math.max(1, Math.floor(pts.length / 90));
    const line = []; for (let q = 0; q < pts.length; q += step) line.push(pts[q]); line.push(pts[pts.length - 1]);
    const d = K.pathOf(line.map(([x, y]) => K.iso([bxy(x, y)[0], bxy(x, y)[1], z], P)));
    put(z + 0.05, `<path class="oa-route" d="${d}"/>`);
    const [sx, sy] = (() => { let s = Math.min(V.s, V.route.length), lo = 0; for (let q = 0; q < V.route.s.length - 1; q++) { if (V.route.s[q] <= s) lo = q; else break; } const a = V.route.pts[lo], b = V.route.pts[Math.min(lo + 1, V.route.pts.length - 1)], dd = V.route.s[Math.min(lo + 1, V.route.s.length - 1)] - V.route.s[lo] || 1, t = Math.max(0, Math.min(1, (s - V.route.s[lo]) / dd)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; })();
    const [px, py] = bxy(sx, sy);
    put(z + 0.5, S(K.cylinder(px, py, 2.2, z, 1.4, P, 20, 0.3), { tone: "hi", lit: true, crease: "lo" }) + S(K.cylinder(px, py, 1.1, z + 1.4, 3.4, P, 14), { tone: "hi", lit: true, crease: "none" }));
    if (V.halt) { const [hx, hy] = bxy(V.halt[0], V.halt[1]); put(z + 0.4, `<path class="oa-halt" d="${K.onTop(Array.from({ length: 16 }, (_, q) => [hx + Math.cos(q / 16 * 6.2832) * 3, hy + Math.sin(q / 16 * 6.2832) * 3]), z + 0.2, P, true)}"/>`); }
  }
  items.sort((a, b) => a.key - b.key);
  return items.map((i) => i.svg).join("");
}
