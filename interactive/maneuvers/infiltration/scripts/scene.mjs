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
  BEAM_Y: 28.6,           // the beam housings' inner faces (either side of the tray)
  HOUSE_H: 8,             // the housings' height above the deck
};

// A beam housing on the inside of a side wall (side -1: the emitter on the far wall; +1: the
// receiver on the near wall). The emitter's lens faces the reader; the receiver's is on its far face.
function housing(K, P, M, side) {
  const G = GEO, ZF = G.ZF, y0 = side < 0 ? -G.BEAM_Y - 2.4 : G.BEAM_Y;
  const H = { x: M.beamX - 2, y: y0, w: 4, d: 2.4, r: 0.4 };
  let out = K.solidSvg(K.slabOf(H, ZF + 2.2, G.HOUSE_H - 2.2, P, 2, 0.3), { tone: "mid", inner: K.lineSvg(K.sideSeam(H, ZF + G.HOUSE_H - 1.4, P, 2), { tone: "faint" }) });
  // the two bolts into the wall
  out += K.dotsSvg([[H.x + 0.9, H.y + 1.2], [H.x + H.w - 0.9, H.y + 1.2]].map(([x, y]) => K.iso([x, y, ZF + G.HOUSE_H], P)), { size: 0.36 });
  if (side < 0) {
    // the lens: a ring and its centre on the face toward the reader
    const yl = -G.BEAM_Y, zl = ZF + M.beamH;
    const ring = [];
    for (let a = 0; a <= 360; a += 30) ring.push(K.iso([M.beamX + 0.9 * Math.cos(a * SC_RAD), yl, zl + 0.9 * Math.sin(a * SC_RAD)], P));
    out += K.lineSvg(K.pathOf(ring), { tone: "lo" });
  }
  return out;
}

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
  // the beam's emitter, bolted to the inside of the far wall in front of the screen
  back += housing(K, P, M, -1);

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
  // the target carriage's slot track, flush in the tray floor; its far end is the carriage's stop
  const Tg = M.target;
  const SLOT = { x: Tg.x - Tg.half - Tg.travel + 1.2, y: Tg.y - 0.8, w: 2 * Tg.half - 2.4 + Tg.travel, d: 1.6, r: 0.8 };
  floor += K.solidSvg(K.slabOf(SLOT, TZ - 0.02, 0.04, P, 3), { tone: "lo", flat: true, className: "inf-slot" });
  floor += dots([[SLOT.x - 1.4, Tg.y], [SLOT.x + SLOT.w + 1.4, Tg.y]], TZ, 0.36);

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
  const receiver = housing(K, P, M, 1);
  let front = receiver + solid(K.slabOf(NW, ZF, G.WALL_NEAR, P, 3, 0.4), { tone: "mid", inner: line(K.sideSeam(NW, ZF + 3.5, P, 3), { tone: "faint" }) });
  front += dots([-80, -40, 0, 40, 80].map((x) => [x, NW.y + 1.5]), ZF + G.WALL_NEAR);
  const EW = { x: O.x + O.w - 3, y: O.y + 3, w: 3, d: O.d - 6, r: 0.6 };
  front = solid(K.slabOf(EW, ZF, G.WALL_NEAR, P, 3, 0.4), { tone: "mid" }) + dots([-20, 0, 20].map((y) => [EW.x + 1.5, y]), ZF + G.WALL_NEAR) + front;
  // the lamp's socket on the receiver's top
  front += solid(K.cylinder(M.beamX, G.BEAM_Y + 1.2, 1.5, ZF + G.HOUSE_H, 0.6, P, 24, 0.2), { tone: "mid" });
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

// The beam across the tray at the shaker floor's beam height, as depth-sorted pieces. cut: the y
// at which an element breaks it (the beam stops on that element's far face), or null.
export function beamItems(K, P, M, cut) {
  const G = GEO, z = G.ZF + M.beamH, y0 = -G.BEAM_Y, y1 = cut === null ? G.BEAM_Y : cut;
  const items = [];
  const n = Math.max(1, Math.ceil((y1 - y0) / 6));
  for (let i = 0; i < n; i++) {
    const a = y0 + ((y1 - y0) * i) / n, b = y0 + ((y1 - y0) * (i + 1)) / n;
    items.push({ key: K.depthOf([M.beamX, (a + b) / 2, z], P), svg: `<path class="iso-line inf-beam" data-tone="mid" d="${K.pathOf([K.iso([M.beamX, a, z], P), K.iso([M.beamX, b, z], P)])}"/>` });
  }
  items.push({ key: K.depthOf([M.beamX, y0 + 0.5, z], P), svg: K.dotsSvg([K.iso([M.beamX, y0, z], P)], { size: 0.5 }) });
  return items;
}

// The alarm lamp on the receiver: lit once the beam has been broken.
export function lamp(K, P, M, on) {
  const G = GEO, x = M.beamX, y = G.BEAM_Y + 1.2, z = G.ZF + G.HOUSE_H + 0.6;
  let out = on ? `<ellipse class="inf-glow" cx="${K.iso([x, y, z + 1.2], P)[0].toFixed(2)}" cy="${K.iso([x, y, z + 1.2], P)[1].toFixed(2)}" rx="${(6 * K.cameraOf(P).k).toFixed(2)}" ry="${(4.6 * K.cameraOf(P).k).toFixed(2)}"/>` : "";
  out += K.solidSvg(K.cylinder(x, y, 1.05, z, 1.7, P, 24, 0.3), { tone: "mid", className: on ? "inf-lamp inf-lamp-on" : "inf-lamp" });
  return out;
}

// The target: a gun turret on a turntable, on a carriage that rides the slot track. Its gun faces
// the screen (the front); turn 0..1 swings it to face the collecting tray and lowers the brake shoe
// at the carriage's front onto the track; push moves the carriage toward the screen. Returns
// depth-sorted items.
export function targetItems(K, P, M, push, turn) {
  const G = GEO, T = M.target, TZ = G.ZF + M.trayLift;
  const cx = T.x - push, cy = T.y;
  const items = [];
  const C = { x: cx - T.half, y: cy - T.side, w: 2 * T.half, d: 2 * T.side, r: 0.6 };
  let car = K.solidSvg(K.slabOf(C, TZ, 1.2, P, 2, 0.3), { tone: "mid", inner: K.lineSvg(K.sideSeam(C, TZ + 0.5, P, 2), { tone: "faint" }) });
  car += K.dotsSvg(K.corners(C, 0.9).map(([x, y]) => K.iso([x, y, TZ + 1.2], P)), { size: 0.34 });
  // the brake: a bracket on the carriage's front end and a shoe that drops onto the track
  const BR = { x: cx - T.half - 1.4, y: cy - 1.3, w: 1.4, d: 2.6, r: 0.3 };
  const drop = 0.9 * turn;
  let brake = K.solidSvg(K.slabOf({ ...BR, x: BR.x + 0.3, w: 1.1 }, TZ + 1.0 - drop, 0.9, P, 2, 0.2), { tone: "lo" });
  brake += K.solidSvg(K.slabOf(BR, TZ + 1.9, 0.5, P, 2, 0.2), { tone: "mid" });
  items.push({ key: K.depthOf([cx, cy, TZ + 0.6], P) - 3, svg: brake + car });
  // turntable with its index ring
  items.push({ key: K.depthOf([cx, cy, TZ + 1.5], P) - 2, svg: K.solidSvg(K.cylinder(cx, cy, 2.5, TZ + 1.2, 0.6, P, 28, 0.2), { tone: "mid", inner: "" }) + K.lineSvg(K.ring(cx, cy, 2.0, TZ + 1.8, P, 28), { tone: "faint" }) });
  const ang = (180 - 180 * turn) * SC_RAD;      // the gun's direction: -x at rest, +x when turned
  const dir = [Math.cos(ang), Math.sin(ang)];   // swings through +y (toward the reader)
  const rot = (u, v) => [cx + u * dir[0] - v * dir[1], cy + u * dir[1] + v * dir[0]];
  const b = T.block, z0 = TZ + 1.8, z1 = TZ + T.tall;
  let tower = K.solidSvg(K.extrude([rot(-b, -b), rot(b, -b), rot(b, b), rot(-b, b)], z0, z1 - z0, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" });
  // the hatch on top and its hinge line, rivets at the corners
  tower += K.lineSvg(K.pathOf([rot(-b + 0.9, -b + 0.7), rot(-b + 0.9, b - 0.7)].map(([x, y]) => K.iso([x, y, z1], P))), { tone: "lo", free: true });
  tower += K.dotsSvg([rot(-b + 0.5, -b + 0.5), rot(-b + 0.5, b - 0.5), rot(b - 0.5, -b + 0.5), rot(b - 0.5, b - 0.5)].map(([x, y]) => K.iso([x, y, z1], P)), { size: 0.32 });
  // the gun: a square barrel from the tower's front face, above the tallest element, with a collar
  const gz = TZ + T.gunZ;
  const barrel = K.solidSvg(K.extrude([rot(b, -0.5), rot(b + T.gun, -0.5), rot(b + T.gun, 0.5), rot(b, 0.5)], gz, 1, P, { bevel: 0.12 }), { tone: "mid" });
  const collar = K.solidSvg(K.extrude([rot(b, -0.95), rot(b + 0.8, -0.95), rot(b + 0.8, 0.95), rot(b, 0.95)], gz - 0.45, 1.9, P, { bevel: 0.12 }), { tone: "mid" });
  // the barrel only overlaps other parts near its muzzle (it passes above the tallest element), so it
  // sorts at the muzzle; the tower and collar sort at the tower's centre
  const towards = K.depthOf([dir[0], dir[1], 0], P) - K.depthOf([0, 0, 0], P);
  items.push({ key: K.depthOf([cx, cy, TZ + 5], P), svg: towards > 0 ? tower + collar : collar + tower });
  items.push({ key: K.depthOf([...rot(b + T.gun, 0), gz + 0.5], P), svg: barrel });
  return items;
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
  items.push(...beamItems(K, P, M, S.cut ?? null), ...targetItems(K, P, M, S.push || 0, S.turn || 0));
  S.pos.forEach(([x, y]) => {
    const z = GEO.ZF + floorAt(x, M);
    items.push({ key: K.depthOf([x, y, z + S.p.h / 2], P), svg: `<g opacity="${S.fade.toFixed(3)}">${element(K, P, M, S.p, x, y, z)}</g>` });
  });
  items.sort((a, b) => a.key - b.key);
  const shake = K.translateAlong(P, [S.dx, 0, 0]);
  return `<g transform="${shake}">${parts.motor}${weight(K, P, S.phi)}${parts.back}${parts.floor}${items.map((i) => i.svg).join("")}${parts.front}${lamp(K, P, M, !!S.lit)}</g>`;
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
