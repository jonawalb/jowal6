// The figure's parts above the base plate: two engines with flywheels and band brakes,
// a flyball governor on the left engine, a headquarters console with a handwheel and two
// command rods, the load bar and two speed gauges. Written against the kit as a parameter
// (K) so build.mjs (Node) and the page (inlined kit) run the same code. build.mjs inlines
// this file with `export` stripped. `statics` is built once; `scene` per frame.

export const GEO = {
  ROD_Y: 6,          // the right command rod runs along x at this y
  ROD_YL: -15,       // the left one at this y
  ROD_Z: 20,         // and this height
  FW: { r: 24, z: 6, h: 4, y: 36 },   // flywheels, centred at x = ±70
  GX: -70,           // governed engine flywheel / governor spindle x
  CX: 70,            // cranked engine flywheel x
  PIVOT: 58,         // governor arm pivot height
  ARM: 20,           // governor upper arm length
  LINK: 17,          // governor lower link length
  BAR_Y: 70,         // load bar back face at full load
  GAUGE_R: 12,
  GAUGES: [[-134, 64], [134, 64]],
  GAUGE_Z: 22,
  CPL_L: -32,        // left coupling joint x
  CPL_R: 32,         // right coupling joint x (at u0)
  ROD_GAIN: 20,      // rod travel per unit throttle
};

const SC_RAD = Math.PI / 180;

// Throttle u to lever angle on the throttle body top, degrees.
export const leverAngle = (u) => -50 + (u - 0.5) * 120;
// Speed to governor arm angle from the spindle, degrees.
export const armAngle = (w) => Math.min(50, Math.max(18, 34 + (w - 100) * 0.8));

function kit(K, P) {
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  const box = (x0, x1, y0, y1, z0, h, r = 0.6, steps = 3, bevel = 0) =>
    K.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, h, P, steps, bevel);
  const frame = (ox, oy, ang) => {
    const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
    return (u, v) => [ox + u * c - v * s, oy + u * s + v * c];
  };
  const rbox = (F, u0, u1, v0, v1, z0, h, bevel = 0) =>
    K.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z0, h, P, { bevel });
  const halo = (plan, z) => `<path class="iso-halo" d="${K.haloOf(plan, z, 0.1, P)}" style="filter:blur(3px)"/>`;
  return { depth, at, solid, line, dots, box, frame, rbox, halo };
}

// ---------------------------------------------------------------- static parts
export function statics(K, P) {
  const { depth, at, solid, line, dots, box, halo } = kit(K, P);
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const { ROD_Y, ROD_Z, FW } = GEO;

  // engine blocks with heads, head bolts, exhaust stubs and a side seam
  const blocks = [{ x: -118, side: "L" }, { x: 82, side: "R" }];
  for (const b of blocks) {
    const plan = { x: b.x, y: -28, w: 36, d: 30, r: 2.5 };
    const head = { x: b.x + 3, y: -25, w: 30, d: 24, r: 2 };
    let s = halo(K.insetPlan(plan, -2), 0);
    s += solid(K.slabOf(plan, 0, 24, P, 4, 0.8), { tone: "mid", inner: line(K.sideSeam(plan, 6, P, 4), { tone: "faint" }) });
    s += solid(K.slabOf(head, 24, 4, P, 4, 0.6), { tone: "mid" });
    // cooling fins on the head: closed slots on the top face
    for (let i = 0; i < 4; i++) s += line(K.planOutline({ x: head.x + 5 + i * 5.6, y: head.y + 4, w: 2.4, d: head.d - 8, r: 1.1 }, 28, P, 3), { tone: "lo" });
    s += dots(K.corners(head, 2.2).map(([x, y]) => [x, y, 28]), 0.5);
    // exhaust stack on the back of the head
    const ex = b.x + 28;
    s += solid(K.cylinder(ex, -20, 3, 28, 7, P, 20), { tone: "mid", inner: line(K.sideArc(ex, -20, 3, 31, P, 12), { tone: "faint" }) });
    s += line(K.ring(ex, -20, 1.8, 35, P, 16), { tone: "lo" });
    put(depth(b.x + 18, -13) - 400, s);
  }

  // bevel drive boxes joining each block to its flywheel pedestal
  for (const x of [GEO.GX, GEO.CX]) {
    const plan = { x: x - 6, y: 2, w: 12, d: 22, r: 1.5 };
    let s = solid(K.slabOf(plan, 0, 8, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(plan, 4, P, 3), { tone: "faint" }) });
    s += dots([[x - 3.6, 5, 8], [x + 3.6, 5, 8], [x - 3.6, 21, 8], [x + 3.6, 21, 8]]);
    put(depth(x, 13) - 200, s);
  }

  // headquarters console: case, top plate, glands for the two rods, a vent
  {
    const plan = { x: -15, y: -22, w: 30, d: 32, r: 2.5 };
    let s = halo(K.insetPlan(plan, -2), 0);
    s += solid(K.slabOf({ x: -18, y: -25, w: 36, d: 38, r: 3 }, 0, 3, P, 4, 0.6), { tone: "lo" });
    s += solid(K.slabOf(plan, 3, 23, P, 4, 0.8), { tone: "mid", inner: line(K.sideSeam(plan, 21, P, 4), { tone: "faint" }) });
    s += solid(K.slabOf(K.insetPlan(plan, 2), 26, 1.2, P, 4, 0.4), { tone: "mid" });
    s += dots(K.corners(plan, 2.6).map(([x, y]) => [x, y, 27.2]), 0.48);
    s += dots(K.corners({ x: -18, y: -25, w: 36, d: 38 }, 1.6).map(([x, y]) => [x, y, 3]), 0.42);
    // gland on the right (+x) face, the one the viewer sees
    s += solid(box(15, 17.2, ROD_Y - 3.4, ROD_Y + 3.4, ROD_Z - 2.4, 6.8, 0.8), { tone: "mid" });
    // a closed vent slot on the front (+y) face, drawn as a recessed plate
    s += solid(box(-9, 9, 10, 10.6, 8, 5, 0.3), { tone: "lo", crease: "none" });
    put(depth(0, -6) - 100, s);
  }

  // left gland, on the hidden face: only its stub shows past the case
  put(depth(-16, GEO.ROD_YL) - 150, solid(box(-17.2, -15, GEO.ROD_YL - 3.4, GEO.ROD_YL + 3.4, ROD_Z - 2.4, 6.8, 0.8), { tone: "mid" }));

  // throttle bodies: the governed one on the left block's +x face, the cranked one on the right block's front
  for (const plan of [{ x: -82, y: GEO.ROD_YL - 5, w: 8, d: 10, r: 1 }, { x: 84, y: 2, w: 12, d: 8, r: 1 }]) {
    let s = solid(K.slabOf(plan, 13, 13, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(plan, 16, P, 3), { tone: "faint" }) });
    s += dots(K.corners(plan, 1.8).map(([x, y]) => [x, y, 26]), 0.4);
    // the cranked body is drawn after its rod, which enters its hidden -x face
    put(plan.x > 0 ? depth(50, ROD_Y) + 31 : depth(plan.x + plan.w / 2, plan.y + plan.d / 2) - 50, s);
  }

  // stanchions that carry the rods: foot, post, bushing
  for (const [x, y] of [[-50, GEO.ROD_YL], [52, ROD_Y]]) {
    let s = solid(box(x - 4, x + 4, y - 5, y + 5, 0, 2, 1, 3, 0.4), { tone: "lo" });
    s += dots([[x - 2.6, y - 3.4, 2], [x + 2.6, y + 3.4, 2]], 0.4);
    s += solid(box(x - 1.5, x + 1.5, y - 2, y + 2, 2, ROD_Z - 5, 0.6), { tone: "mid", crease: "none" });
    put(depth(x, y) - 200, s);
  }

  // flywheel pedestals
  for (const x of [GEO.GX, GEO.CX]) {
    put(depth(x, FW.y) - 300, solid(K.cylinder(x, FW.y, 9, 0, 1.6, P, 32), { tone: "lo" }) +
      solid(K.cylinder(x, FW.y, 6.5, 1.6, FW.z - 1.6, P, 32), { tone: "mid" }));
  }

  // load-bar guides at both ends, and the ruler strip the load pointer reads against
  for (const x of [-92, 86]) {
    const plan = { x, y: GEO.BAR_Y - 4, w: 6, d: 16, r: 1 };
    put(depth(x + 3, GEO.BAR_Y + 4) - 20, solid(K.slabOf(plan, 0, 4, P, 3, 0.4), { tone: "mid" }) +
      line(K.planOutline({ x: x + 1.6, y: GEO.BAR_Y - 1.4, w: 2.8, d: 11, r: 1.2 }, 4, P, 3), { tone: "lo" }) +
      dots([[x + 3, GEO.BAR_Y - 2.6, 4], [x + 3, GEO.BAR_Y + 10.6, 4]], 0.4));
  }

  // speed gauges: pedestal, post, knurled puck
  for (const [gx, gy] of GEO.GAUGES) {
    const R = GEO.GAUGE_R, Z = GEO.GAUGE_Z, top = Z + 7;
    const ped = { x: gx - 10, y: gy - 10, w: 20, d: 20, r: 3 };
    let s = halo(ped, 0);
    s += solid(K.slabOf(ped, 0, 4, P, 4, 0.6), { tone: "mid" });
    s += line(K.planOutline(K.insetPlan(ped, 2.6), 4, P), { tone: "faint" });
    s += dots(K.corners(ped, 3).map(([x, y]) => [x, y, 4]), 0.45);
    s += solid(K.cylinder(gx, gy, 4.4, 4, 2, P, 24), { tone: "mid" });
    s += solid(K.cylinder(gx, gy, 2.8, 6, Z - 6, P, 20), { tone: "mid", crease: "none", inner: line(K.sideArc(gx, gy, 2.8, 13, P, 14), { tone: "faint" }) });
    s += solid(K.cylinder(gx, gy, R, Z, 7, P, 64, 0.8), { tone: "hi", crease: "lo" });
    s += line(K.knurl(gx, gy, R, top - 2.6, top, 56, P, 0.3), { tone: "lo" });
    s += line(K.sideArc(gx, gy, R, top - 2.6, P, 36), { tone: "faint" });
    s += line(K.ring(gx, gy, R - 1.8, top, P, 64), { tone: "lo" });
    const t = K.radialTicks(gx, gy, R - 1.8, 30, 5, top, [1, 2.2], P, -0.75 * Math.PI, 1.5 * Math.PI);
    s += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    // the set-point mark at 100 % (two thirds of the sweep)
    const a = -0.75 * Math.PI + (100 / 150) * 1.5 * Math.PI;
    s += line(K.lineOnTop([gx + Math.sin(a) * (R - 1.8), gy - Math.cos(a) * (R - 1.8)], [gx + Math.sin(a) * (R - 4.4), gy - Math.cos(a) * (R - 4.4)], top, P), { tone: "mid" });
    put(depth(gx, gy) + 40, `<g data-gauge="${gx < 0 ? "L" : "R"}">${s}</g>`);
  }
  return items;
}

// ---------------------------------------------------------------- moving parts
// S: { spinG, spinC, wG, uG, uC, dHQ, dR, gap, L, wheel, statics }
export function scene(K, P, S) {
  const { depth, at, solid, line, dots, box, frame, rbox } = kit(K, P);
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const { ROD_Y, ROD_Z, FW } = GEO;
  const top = FW.z + FW.h;

  // ---- flywheels: rim, web with six lightening holes that turn, hub ----
  const flywheel = (x, spin, cap) => {
    let s = `<path class="iso-halo" d="${K.cylinder(x, FW.y, FW.r + 1, FW.z - 0.5, 0.1, P, 48).fill}" style="filter:blur(3px)"/>`;
    s += solid(K.cylinder(x, FW.y, FW.r, FW.z, FW.h, P, 96, 0.8), { tone: "mid", inner: line(K.sideArc(x, FW.y, FW.r, FW.z + FW.h / 2, P, 48), { tone: "faint" }) });
    s += line(K.ring(x, FW.y, FW.r - 3.4, top, P, 80), { tone: "faint" });
    for (let i = 0; i < 6; i++) {
      const a = (spin + i * 60) * SC_RAD;
      s += line(K.ring(x + 12.6 * Math.cos(a), FW.y + 12.6 * Math.sin(a), 3.4, top, P, 20), { tone: "lo" });
    }
    // index mark on the rim top, so the turning reads
    const a = spin * SC_RAD;
    s += line(K.lineOnTop([x + (FW.r - 3.4) * Math.cos(a), FW.y + (FW.r - 3.4) * Math.sin(a)], [x + FW.r * Math.cos(a), FW.y + FW.r * Math.sin(a)], top, P), { tone: "hi" });
    s += solid(K.cylinder(x, FW.y, 5.4, top, 3, P, 32, 0.4), { tone: "mid" });
    s += dots([0, 90, 180, 270].map((d) => [x + 3.6 * Math.cos((d + spin) * SC_RAD), FW.y + 3.6 * Math.sin((d + spin) * SC_RAD), top + 3]), 0.4);
    if (cap) s += solid(K.cylinder(x, FW.y, 2.4, top + 3, 2, P, 20), { tone: "mid" }) + line(K.knurl(x, FW.y, 2.4, top + 3, top + 5, 14, P), { tone: "lo" });
    return s;
  };
  put(depth(GEO.GX, FW.y), flywheel(GEO.GX, S.spinG, false));
  put(depth(GEO.CX, FW.y), flywheel(GEO.CX, S.spinC, true));

  // ---- governor on the left flywheel hub: spindle, arms, flyweights, sleeve ----
  {
    const x = GEO.GX, y = FW.y, base = top + 3;
    const phi = armAngle(S.wG) * SC_RAD;
    const rw = 2 + GEO.ARM * Math.sin(phi);
    const zw = GEO.PIVOT - GEO.ARM * Math.cos(phi);
    const zs = zw - Math.sqrt(GEO.LINK * GEO.LINK - (rw - 3) * (rw - 3));
    const key = depth(x, y) + 0.5;
    // spindle, sleeve and top cap, drawn between the far and near weights
    let mid = solid(K.cylinder(x, y, 1.5, base, GEO.PIVOT + 1 - base, P, 16), { tone: "mid", crease: "none" });
    mid += solid(K.cylinder(x, y, 3.2, zs - 2.2, 4.4, P, 24, 0.3), { tone: "mid", inner: line(K.sideArc(x, y, 3.2, zs, P, 16), { tone: "faint" }) });
    mid += solid(K.cylinder(x, y, 2.8, GEO.PIVOT - 1.5, 3, P, 20), { tone: "mid" });
    mid += solid(K.cylinder(x, y, 1.8, GEO.PIVOT + 1.5, 3.2, P, 16), { tone: "mid" }) + line(K.knurl(x, y, 1.8, GEO.PIVOT + 1.5, GEO.PIVOT + 4.7, 12, P), { tone: "lo" });
    const arms = [0, 180].map((off) => {
      const a = (S.spinG + off) * SC_RAD;
      const c = Math.cos(a), s = Math.sin(a);
      const P0 = [x + 2 * c, y + 2 * s, GEO.PIVOT];
      const W = [x + rw * c, y + rw * s, zw];
      const Q = [x + 3 * c, y + 3 * s, zs];
      let g = `<path class="iso-line" data-tone="mid" d="${K.segment(P0, W, P)}" style="stroke-width:1.2"/>`;
      g += `<path class="iso-line" data-tone="mid" d="${K.segment(Q, W, P)}" style="stroke-width:1"/>`;
      g += solid(K.cylinder(W[0], W[1], 4, zw - 3, 6, P, 28, 0.4), { tone: "hi", lit: true, crease: "lo" });
      g += K.dotsSvg([at(P0), at(Q), at([W[0], W[1], zw + 3])], { size: 0.5 });
      return { k: depth(W[0], W[1]), g };
    }).sort((a, b) => a.k - b.k);
    put(key, arms[0].g + mid + arms[1].g);
    S.sleeve = zs;
  }

  // ---- throttle levers on the bodies, and the governor's link to its lever ----
  const lever = (cx, cy, u, base) => {
    const F = frame(cx, cy, base + leverAngle(u));
    let s = solid(K.cylinder(cx, cy, 2, 26, 1.4, P, 18), { tone: "mid" });
    s += solid(rbox(F, -1.4, 8, -1.2, 1.2, 27.4, 1.4, 0.2), { tone: "hi", crease: "lo" });
    s += K.dotsSvg([at([cx, cy, 28.8])], { size: 0.45 });
    return { s, tip: [...F(7, 0), 28.8] };
  };
  {
    const L = lever(-78, GEO.ROD_YL, S.uG, 90);
    const zs = S.sleeve;
    // the link leaves a pin on the sleeve's back side and lands on the lever tip
    const from = [GEO.GX - 1.2, FW.y - 3, zs];
    put(depth(-78, GEO.ROD_YL) + 1, L.s);
    // a flat link bar: an outline drawn as a wide stroke under a narrow paper core, with pins at both ends
    const d = K.segment(from, L.tip, P);
    put(depth(-72, 10), `<path class="iso-line" data-tone="mid" d="${d}" style="stroke-width:2.2;stroke-linecap:round"/>` +
      `<path class="iso-line" data-tone="faint" d="${d}" style="stroke-width:1;stroke:var(--anatomy-top);stroke-linecap:round"/>` +
      K.dotsSvg([at(from), at(L.tip)], { size: 0.6 }));
  }
  {
    const R = lever(90, 6, S.uC, 0);
    put(depth(50, ROD_Y) + 32, R.s);
  }

  // ---- command rods with their couplings ----
  const rod = (x0, x1, y = ROD_Y) => (x1 - x0 > 0.2 ? solid(box(x0, x1, y - 1, y + 1, ROD_Z - 1, 2, 0.8, 3), { tone: "mid", crease: "none" }) : "");
  const half = (x0, x1, y = ROD_Y) => solid(box(x0, x1, y - 3, y + 3, ROD_Z - 3, 6, 1, 3, 0.4), { tone: "mid" }) +
    dots([[(x0 + x1) / 2, y - 1.8, ROD_Z + 3], [(x0 + x1) / 2, y + 1.8, ROD_Z + 3]], 0.42);
  const bushing = (x, y = ROD_Y) => solid(box(x - 3, x + 3, y - 3, y + 3, ROD_Z - 3, 6, 1, 3, 0.4), { tone: "mid" }) +
    dots([[x, y, ROD_Z + 3]], 0.45);
  {
    // left: headquarters to the governor's set-point spring on the left throttle body.
    // drawn far (low x) to near: spring, far rod, stanchion bushing, far half, near half, rod into the console
    const xc = GEO.CPL_L, g = S.gap, y = GEO.ROD_YL;
    const coil = K.coil(-74, -62, [y, ROD_Z], 2.6, 5, "x", P);
    let s = line(coil.back, { tone: "lo" });
    s += rod(-74, xc - 4, y);
    s += line(coil.front, { tone: "mid" });
    s += solid(box(-62, -60.8, y - 3, y + 3, ROD_Z - 3, 6, 0.4, 3), { tone: "mid", crease: "none" });
    s += bushing(-50, y);
    s += half(xc - 4, xc, y);
    s += rod(xc + g, -15, y);
    s += half(xc + g, xc + 4 + g, y);
    put(depth(-45, y) - 160, s);
  }
  {
    // right: headquarters to the cranked engine's throttle
    const xa = GEO.CPL_R + S.dHQ, xb = GEO.CPL_R + S.dR, g = S.gap;
    let s = rod(17.2, xa - 4 - g);
    s += half(xa - 4 - g, xa - g);
    s += half(xb, xb + 4);
    s += rod(xb + 4, 84);
    s += bushing(52);
    put(depth(50, ROD_Y) + 30, s);
  }

  // ---- headquarters handwheel ----
  {
    const x = 0, y = -6, z = 27.2, R = 10;
    let s = solid(K.cylinder(x, y, 3, z, 3, P, 20), { tone: "mid" });
    s += solid(K.cylinder(x, y, R, z + 3, 2.6, P, 72, 0.5), { tone: "mid", inner: line(K.sideArc(x, y, R, z + 4.3, P, 40), { tone: "faint" }) });
    s += line(K.ring(x, y, R - 2.4, z + 5.6, P, 64), { tone: "faint" });
    for (let i = 0; i < 4; i++) {
      const a = (S.wheel + i * 90) * SC_RAD;
      s += line(K.planOutline({ x: x + 5 * Math.cos(a) - 1.6, y: y + 5 * Math.sin(a) - 1.6, w: 3.2, d: 3.2, r: 1.6 }, z + 5.6, P, 4), { tone: "lo" });
    }
    s += solid(K.cylinder(x, y, 2.6, z + 5.6, 1.4, P, 18), { tone: "mid" });
    const a = S.wheel * SC_RAD;
    const hx = x + (R - 2) * Math.cos(a), hy = y + (R - 2) * Math.sin(a);
    s += solid(K.cylinder(hx, hy, 1.6, z + 5.6, 6, P, 16), { tone: "mid" }) + line(K.knurl(hx, hy, 1.6, z + 7, z + 11.6, 10, P), { tone: "lo" });
    put(depth(x, y) + 2, s);
  }

  // ---- load bar, brake shoes and springs, and the load knob ----
  {
    const by = GEO.BAR_Y + (1 - S.L) * 8;
    let s = solid(box(-90, 90, by, by + 4, 4.4, 4, 1, 3, 0.5), { tone: "mid", inner: line(K.sideSeam({ x: -90, y: by, w: 180, d: 4, r: 1 }, 6.4, P, 3), { tone: "faint" }) });
    s += dots([-80, -40, 40, 80].map((x) => [x, by + 2, 8.4]), 0.42);
    // knob and pointer at the centre
    s += solid(K.cylinder(0, by + 2, 3.4, 8.4, 3, P, 24), { tone: "mid" }) + line(K.knurl(0, by + 2, 3.4, 8.4, 11.4, 22, P), { tone: "lo" });
    // pointer tongue reaching forward over the ruler strip
    s += solid(box(15.6, 18.6, by + 3.9, by + 9, 4.4, 4, 0.6, 2, 0.3), { tone: "hi", crease: "lo" });
    s += line(K.lineOnTop([17.1, by + 4.6], [17.1, by + 9], 8.4, P), { tone: "lo" });
    let back = "";
    for (const x of [GEO.GX, GEO.CX]) {
      const sy = FW.y + FW.r;
      back += solid(box(x - 7, x + 7, sy + 0.1, sy + 3, FW.z - 0.4, FW.h + 0.8, 0.8, 3, 0.3), { tone: "mid" });
      const coil = K.coil(sy + 3, by, [x, 8.4], 1.8, 4, "y", P);
      back += line(coil.back, { tone: "lo" });
      back += solid(box(x - 0.8, x + 0.8, sy + 3, by, 7.6, 1.6, 0.6, 2), { tone: "mid", crease: "none" });
      back += line(coil.front, { tone: "mid" });
    }
    put(depth(0, 64) + 30, back);
    put(depth(0, by + 2) + 60, s);
  }

  // ---- gauge needles ----
  for (const [i, [gx, gy]] of GEO.GAUGES.entries()) {
    const w = i === 0 ? S.wG : S.wC;
    const f = Math.min(1, Math.max(0, w / 150));
    const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
    const sx = Math.sin(a), sy = -Math.cos(a);
    const z = GEO.GAUGE_Z + 7.2;
    const n = `<path class="iso-line" data-tone="hi" data-free="" d="${K.lineOnTop([gx - sx * 2.4, gy - sy * 2.4], [gx + sx * (GEO.GAUGE_R - 3.4), gy + sy * (GEO.GAUGE_R - 3.4)], z, P)}" style="stroke-width:1"/>` +
      line(K.ring(gx, gy, 1.2, z, P, 14), { tone: "mid" });
    put(depth(gx, gy) + 41, n);
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}
