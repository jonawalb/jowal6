// The moving half of the figure: the shaker tray with its bar screen and collecting tray,
// the vibrator motor with its turning eccentric weight, the elements, and the motor cable.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page (inlined kit)
// run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  ZF: 20,                 // shaker deck top
  DECK0: 16.5,            // shaker deck underside
  OUT: { x: -99, y: -34, w: 198, d: 68, r: 2.5 },   // tray outline
  WALL_BACK: 9,           // far side wall and feed end height above the deck
  WALL_NEAR: 6,           // near side wall and far end height (lower, so the reader sees in)
  BAR_H: 16,              // bar height above the deck
  RAIL_H: 3,              // top rail thickness
  TRAY: { x: 34, y: -27, w: 60, d: 54, r: 1.5 },    // collecting tray outline
  RIM: 3,                 // collecting tray rim height
  MOTOR: { x: -111, y: 0, r: 9.5, z0: 17, z1: 35 },
  SHELF: { x: -124, y: -13, w: 25, d: 26, r: 1.5 },
  SHAKE: 0.7,             // stroke of the deck, world units each way
};

const SC_RAD = Math.PI / 180;

// The parts of the tray that never change shape, built once: everything is in deck
// coordinates, and the page moves the whole group with the shake.
export function trayParts(K, P, M, lay) {
  const G = GEO, ZF = G.ZF, O = G.OUT;
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, z, size = 0.42) => K.dotsSvg(pts.map(([x, y]) => at([x, y, z])), { size });
  const depth = (x, y, z) => K.depthOf([x, y, z], P);

  // motor shelf, motor, cap and terminal box: they ride on the tray
  const S = G.SHELF, Mo = G.MOTOR;
  let motor = "";
  motor += solid(K.slabOf(S, 14, 3, P, 3, 0.4), { tone: "mid" });
  motor += dots(K.corners(S, 2.6), 17);
  motor += solid(K.cylinder(Mo.x, Mo.y, Mo.r + 1.4, Mo.z0, 2, P, 48, 0.4), { tone: "mid" });
  const fins = K.knurl(Mo.x, Mo.y, Mo.r, Mo.z0 + 4, Mo.z1 - 3, 40, P, 0.3);
  motor += solid(K.cylinder(Mo.x, Mo.y, Mo.r, Mo.z0 + 2, Mo.z1 - Mo.z0 - 2, P, 56, 0.5), {
    tone: "mid", inner: line(fins, { tone: "lo" }) + line(K.sideArc(Mo.x, Mo.y, Mo.r, Mo.z0 + 4, P, 40) + K.sideArc(Mo.x, Mo.y, Mo.r, Mo.z1 - 3, P, 40), { tone: "faint" }),
  });
  const TB = { x: Mo.x - 4, y: Mo.y + Mo.r - 1.4, w: 8, d: 5.4, r: 0.8 };
  motor += solid(K.slabOf(TB, 22, 7, P, 2, 0.3), { tone: "mid", inner: line(K.sideSeam(TB, 27.4, P, 2), { tone: "faint" }) });
  motor += dots([[TB.x + 1.4, TB.y + 1.2], [TB.x + TB.w - 1.4, TB.y + 1.2]], 29, 0.36);
  motor += solid(K.cylinder(Mo.x, Mo.y, 7.6, Mo.z1, 2.2, P, 40, 0.4), { tone: "mid" });
  motor += dots([0, 90, 180, 270].map((a) => [Mo.x + 6 * Math.cos((a + 45) * SC_RAD), Mo.y + 6 * Math.sin((a + 45) * SC_RAD)]), Mo.z1 + 2.2, 0.38);
  motor += solid(K.cylinder(Mo.x, Mo.y, 2.4, Mo.z1 + 2.2, 1.6, P, 20), { tone: "mid" });

  // deck, far walls (drawn before the contents)
  let back = `<path class="iso-halo" d="${K.haloOf(O, G.DECK0, 0.1, P)}" style="filter:blur(3px)"/>`;
  back += solid(K.slabOf(O, G.DECK0, ZF - G.DECK0, P, 4, 0.6), { tone: "mid", inner: line(K.sideSeam(O, G.DECK0 + 1.6, P, 4), { tone: "faint" }) });
  const BW = { x: O.x, y: O.y, w: O.w, d: 3, r: 1 };
  back += solid(K.slabOf(BW, ZF, G.WALL_BACK, P, 3, 0.4), { tone: "mid" });
  back += dots([-80, -40, 0, 40, 80].map((x) => [x, O.y + 1.5]), ZF + G.WALL_BACK);
  const FW = { x: O.x, y: O.y + 3, w: 3, d: O.d - 6, r: 0.6 };
  back += solid(K.slabOf(FW, ZF, G.WALL_BACK, P, 3, 0.4), { tone: "mid" });
  back += dots([-20, 0, 20].map((y) => [O.x + 1.5, y]), ZF + G.WALL_BACK);

  // things flat on the deck: the load mark, the collecting tray floor and its regroup mark
  let floor = "";
  const side = M.force + 1.2;
  const LOAD = { x: M.feedX - side / 2, y: -side / 2, w: side, d: side, r: 1 };
  floor += line(K.planOutline(LOAD, ZF, P, 3), { tone: "faint" });
  // liner-plate joints across the deck, each with a row of countersunk screws
  for (const x of [-76, -40, -14, 24]) {
    floor += line(K.lineOnTop([x, O.y + 3], [x, O.y + O.d - 3], ZF, P), { tone: "faint" });
    floor += dots([-24, -12, 0, 12, 24].map((y) => [x + 2, y]), ZF, 0.34);
  }
  const T = G.TRAY, TZ = ZF + M.trayLift;
  floor += solid(K.slabOf(T, ZF, M.trayLift, P, 3, 0.3), { tone: "lo", crease: "faint" });
  const MARK = { x: M.collectX - side / 2, y: -side / 2, w: side, d: side, r: 1 };
  floor += line(K.planOutline(MARK, TZ, P, 3), { tone: "lo" });

  // the contents that sort with the elements: bars, top-rail segments, tray rims
  const items = [];
  const bx0 = M.screenX - M.barDepth / 2, bx1 = M.screenX + M.barDepth / 2;
  lay.bars.forEach(([y0, y1]) => {
    const plan = { x: bx0, y: y0, w: M.barDepth, d: y1 - y0, r: 0.5 };
    items.push({ key: depth(M.screenX, (y0 + y1) / 2, ZF + 6), svg: solid(K.slabOf(plan, ZF, G.BAR_H, P, 2, 0.3), { tone: "hi", crease: "lo" }) });
  });
  const cuts = [-M.wall - 3];
  lay.gaps.forEach((g) => cuts.push(g.centre));
  cuts.push(M.wall + 3);
  for (let i = 0; i < cuts.length - 1; i++) {
    const plan = { x: bx0 - 0.9, y: cuts[i], w: M.barDepth + 1.8, d: cuts[i + 1] - cuts[i], r: 0.4 };
    const [b0, b1] = lay.bars[i];
    items.push({
      key: depth(M.screenX, (cuts[i] + cuts[i + 1]) / 2, ZF + G.BAR_H + 8),
      svg: solid(K.slabOf(plan, ZF + G.BAR_H, G.RAIL_H, P, 2, 0.3), { tone: "mid" }) + dots([[M.screenX, (b0 + b1) / 2]], ZF + G.BAR_H + G.RAIL_H),
    });
  }
  // rail end brackets standing on the side-wall tops
  const bracket = (y, hz) => solid(K.slabOf({ x: bx0 - 0.9, y, w: M.barDepth + 1.8, d: 3, r: 0.4 }, ZF + hz, G.BAR_H + G.RAIL_H - hz, P, 2, 0.3), { tone: "mid" });
  items.push({ key: -1e4, svg: bracket(O.y, G.WALL_BACK) });
  const rims = [
    { x: T.x, y: T.y, w: T.w, d: 1.5, r: 0.4 },
    { x: T.x, y: T.y + T.d - 1.5, w: T.w, d: 1.5, r: 0.4 },
    { x: T.x + T.w - 1.5, y: T.y + 1.5, w: 1.5, d: T.d - 3, r: 0.3 },
  ];
  rims.forEach((plan, i) => {
    const cx = plan.x + plan.w / 2, cy = plan.y + plan.d / 2;
    const screws = i === 2 ? [[cx, -18], [cx, 18]] : [[T.x + 10, cy], [T.x + T.w - 10, cy]];
    items.push({ key: i === 0 ? -1e4 + 1 : depth(cx, cy, TZ + 1), svg: solid(K.slabOf(plan, TZ, G.RIM, P, 2, 0.3), { tone: "mid" }) + dots(screws, TZ + G.RIM, 0.36) });
  });

  // near walls (drawn after the contents)
  const NW = { x: O.x, y: O.y + O.d - 3, w: O.w, d: 3, r: 1 };
  let front = solid(K.slabOf(NW, ZF, G.WALL_NEAR, P, 3, 0.4), { tone: "mid", inner: line(K.sideSeam(NW, ZF + 3.5, P, 3), { tone: "faint" }) });
  front += dots([-80, -40, 0, 40, 80].map((x) => [x, NW.y + 1.5]), ZF + G.WALL_NEAR);
  const EW = { x: O.x + O.w - 3, y: O.y + 3, w: 3, d: O.d - 6, r: 0.6 };
  front = solid(K.slabOf(EW, ZF, G.WALL_NEAR, P, 3, 0.4), { tone: "mid" }) + dots([-20, 0, 20].map((y) => [EW.x + 1.5, y]), ZF + G.WALL_NEAR) + front;
  front += bracket(O.y + O.d - 3, G.WALL_NEAR);
  return { motor, back, floor, items, front };
}

// The eccentric weight on the motor shaft, turned to angle phi (degrees).
export function weight(K, P, phi) {
  const Mo = GEO.MOTOR, z = Mo.z1 + 3.8;
  const pts = [];
  for (let a = -90; a <= 90; a += 10) pts.push([Mo.x + 7 * Math.cos((a + phi) * SC_RAD), Mo.y + 7 * Math.sin((a + phi) * SC_RAD)]);
  pts.push([Mo.x + 2.6 * Math.cos((phi + 90) * SC_RAD), Mo.y + 2.6 * Math.sin((phi + 90) * SC_RAD)]);
  pts.push([Mo.x + 2.6 * Math.cos((phi - 90) * SC_RAD), Mo.y + 2.6 * Math.sin((phi - 90) * SC_RAD)]);
  let out = K.solidSvg(K.extrude(pts, z, 3, P, { bevel: 0.3 }), { tone: "mid" });
  out += K.solidSvg(K.cylinder(Mo.x, Mo.y, 2.2, z, 4.4, P, 20, 0.3), { tone: "mid" });
  const [sx, sy] = [Mo.x + 4.6 * Math.cos(phi * SC_RAD), Mo.y + 4.6 * Math.sin(phi * SC_RAD)];
  out += K.dotsSvg([K.iso([sx, sy, z + 3], P)], { size: 0.4 });
  return out;
}

// One element (a block or a pellet) at deck point (x, y).
export function element(K, P, M, p, x, y, z) {
  const w = p.w, h = p.h;
  const plan = { x: x - w / 2, y: y - w / 2, w, d: w, r: Math.min(1.6, w * 0.22) };
  let out = K.solidSvg(K.slabOf(plan, z, h, P, 3, w > 8 ? 0.5 : 0.3), { tone: "hi", lit: true, crease: "lo" });
  if (w > 8) out += K.lineSvg(K.planOutline(K.insetPlan(plan, w > 15 ? 2.4 : 1.6), z + h, P, 3), { tone: "lo" });
  if (w > 15) out += K.dotsSvg(K.corners(plan, 4.2).map(([a, b]) => K.iso([a, b, z + h], P)), { size: 0.45 });
  return out;
}

// The live layer: motor, tray, contents in depth order, elements. S carries
// { p (plan), pos (element positions), fade, dx (deck offset), phi (weight angle) }.
export function scene(K, P, M, parts, S, floorAt) {
  const items = parts.items.slice();
  S.pos.forEach(([x, y]) => {
    const z = GEO.ZF + floorAt(x, M);
    items.push({ key: K.depthOf([x, y, z + S.p.h / 2], P), svg: `<g opacity="${S.fade.toFixed(3)}">${element(K, P, M, S.p, x, y, z)}</g>` });
  });
  items.sort((a, b) => a.key - b.key);
  const shake = K.translateAlong(P, [S.dx, 0, 0]);
  return `<g transform="${shake}">${parts.motor}${weight(K, P, S.phi)}${parts.back}${parts.floor}${items.map((i) => i.svg).join("")}${parts.front}</g>`;
}

// The motor cable: from the gland on the control box to the motor's terminal box,
// with a sag, re-drawn each frame because its motor end rides the deck.
export function cable(K, P, from, to, dx) {
  const a = from, b = [to[0] + dx, to[1], to[2]];
  const c = [(a[0] + b[0]) / 2 - 4, (a[1] + b[1]) / 2 + 6, Math.min(a[2], b[2]) - 4];
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, u = 1 - t;
    pts.push(K.iso([0, 1, 2].map((k) => u * u * a[k] + 2 * u * t * c[k] + t * t * b[k]), P));
  }
  return K.wireSvg(pts[0], pts[pts.length - 1], { via: pts.slice(1, -1), tone: "mid", size: 0.9 });
}

// The gauge needle for a share f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}

// The selector knob's pointer for split index i (0..3).
export const KNOB_ANGLES = [-60, -20, 20, 60];
export const KNOB_FACE = 63;      // the fan of detents faces the camera (azimuth)
export function pointer(K, P, KN, i) {
  const a = (KNOB_ANGLES[i] + KNOB_FACE) * SC_RAD;
  return K.lineOnTop([KN.x, KN.y], [KN.x + Math.cos(a) * (KN.r - 0.1), KN.y + Math.sin(a) * (KN.r - 0.1)], KN.top + 0.05, P);
}
