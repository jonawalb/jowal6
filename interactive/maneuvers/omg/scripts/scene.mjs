// The moving half of the OMG bench: the first-echelon wedges, the gate, the latch pin,
// the spring push bar, the lit OMG shuttle, the drop targets and the reserve block.
// Rebuilt per frame and depth-sorted with the static solids passed in as `statics`.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  U: 1.7,            // world units per km along the axis
  RAIL: 3.2,         // lane rails at y = ±RAIL
  RAIL_TOP: 2.6,     // rail top height
  BODY: [4, 10],    // shuttle body z range
  FINGER: 9.0,       // trip finger tip, y
  FINGER_Z: 11,     // trip finger underside
  GAP: 9.6,          // gate opening half-width
  WALL_H: 15,        // wall height
  LEAF: [2.4, 3.6],  // gate leaf, km
  WEDGE_Y: 16,       // first-echelon wedge lines at y = ±WEDGE_Y
  TGT: [-14.6, -8.6], // drop target block y range (far side of the lane)
  RES_Y: [-27, -14.8, 0], // reserve centre y: parked, at the lane edge, across the lane
  PIN_X: -10.4,      // latch pin, km
  POST_Y: 10.6,      // latch bridge posts at y = ±POST_Y
  BAR_Z: [18, 20],   // latch bridge crossbar
  ROD_Y: 6.2,        // spring rods at y = ±ROD_Y
  ROD_Z: 6.2,
  ABUT: -23,         // spring abutment face, km
  BAR_STOP: -12.8,   // push bar stops here (tail of the shuttle when the spring is spent), km
  DIAL: { x: 150, y: 25, r: 7, z: 13, h: 4.4 },
};
export const xOf = (km) => km * GEO.U;

const SC_RAD = Math.PI / 180;

// Painter's key: true depth, with lateral (y) position weighted up so parts in
// side-by-side lanes keep their order while one slides past the other.
export const keyOf = (K, P, x, y, z = 0) => K.depthOf([x, y, z], P) + 0.6 * y;

export function reserveY(res) {
  const [park, edge, across] = GEO.RES_Y;
  return res <= 0.85 ? park + (res / 0.85) * (edge - park) : edge + ((res - 0.85) / 0.15) * (across - edge);
}

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, z, size = 0.42) => K.dotsSvg(pts.map(([x, y]) => at([x, y, z])), { size });
  const slab = (x0, x1, y0, y1, z, h, steps = 3, bevel = 0, r = 0.6) => K.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z, h, P, steps, bevel);
  const key = (x, y, z = 0) => keyOf(K, P, x, y, z);
  const U = GEO.U;
  const RT = GEO.RAIL_TOP;

  // ---- first echelon: two wedge carriages driven into the line beside the gate ----
  for (const side of [-1, 1]) {
    const yc = side * GEO.WEDGE_Y;
    const n = xOf(-7 + 7 * S.wedge);          // nose tip, touches the wall face at x = 0
    const x0 = n - 12, x1 = n - 3.4;
    let out = `<path class="iso-halo" d="${slab(x0, x1, yc - 3.6, yc + 3.6, RT, 0.1).fill}" style="filter:blur(2.5px)"/>`;
    for (const sx of [x0 + 1, x1 - 3.4]) for (const sy of [-2.6, 2.6]) out += solid(slab(sx, sx + 2.4, yc + sy - 1, yc + sy + 1, RT, 1.2, 2, 0, 0.3), { tone: "mid" });
    const body = { x: x0, y: yc - 3.4, w: x1 - x0, d: 6.8, r: 0.8 };
    out += solid(K.slabOf(body, RT + 1.2, 4.2, P, 3, 0.4), { tone: "mid", inner: line(K.sideSeam(body, RT + 3, P, 3), { tone: "faint" }) });
    out += solid(K.extrude([[x1, yc - 3.4], [n, yc - 0.6], [n, yc + 0.6], [x1, yc + 3.4]], RT + 1.2, 4.2, P, { bevel: 0.3 }), { tone: "mid" });
    out += dots([[x0 + 1.4, yc - 2.2], [x0 + 1.4, yc + 2.2], [x1 - 1.2, yc - 2.2], [x1 - 1.2, yc + 2.2]], RT + 5.4);
    const kx = x0 + 4;
    out += solid(K.cylinder(kx, yc, 1.6, RT + 5.4, 2, P, 18), { tone: "mid" }) + line(K.knurl(kx, yc, 1.6, RT + 5.4, RT + 7.4, 14, P), { tone: "lo" });
    put(key((x0 + n) / 2, yc), out);
  }

  // ---- gate leaf: sinks into its slot once the line is broken ----
  {
    const h = GEO.WALL_H * (1 - S.gate);
    if (h > 0.15) {
      const x0 = xOf(GEO.LEAF[0]), x1 = xOf(GEO.LEAF[1]);
      const leaf = { x: x0, y: -GEO.GAP, w: x1 - x0, d: 2 * GEO.GAP, r: 0.3 };
      let out = solid(K.slabOf(leaf, 0, h, P, 2, 0.3), { tone: "mid" });
      if (h > 4) out += line(K.sideSeam(leaf, h - 2.4, P, 2), { tone: "faint" });
      put(key((x0 + x1) / 2, 0), out);
    }
  }

  // ---- latch bridge and pin: the pin drops in front of the shuttle's nose and lifts on release ----
  {
    const px = xOf(GEO.PIN_X);
    const lift = 10 * Math.min(1, Math.max(0, S.pin));
    const z0 = 3 + lift;
    const [b0, b1] = GEO.BAR_Z;
    const below = solid(K.cylinder(px, 0, 0.9, z0, b0 - z0, P, 16), { tone: "mid", crease: "none" });
    put(key(px, 0) + (lift > 0.5 ? 40 : 0), below);
    for (const side of [-1, 1]) {
      const y = side * GEO.POST_Y;
      put(key(px, y), solid(slab(px - 1.2, px + 1.2, y - 0.8, y + 0.8, 0, b0, 2, 0.3, 0.3), { tone: "mid" }) +
        "");
    }
    const bar = { x: px - 1.4, y: -GEO.POST_Y - 1.2, w: 2.8, d: 2 * GEO.POST_Y + 2.4, r: 0.5 };
    const top = z0 + 20;
    put(key(px, 0) + 41,
      solid(K.slabOf(bar, b0, b1 - b0, P, 2, 0.4), { tone: "mid", inner: line(K.sideSeam(bar, b0 + 1, P, 2), { tone: "faint" }) }) +
      dots([[px, -GEO.POST_Y], [px, GEO.POST_Y]], b1) +
      solid(K.cylinder(px, 0, 1.7, b1, 1.4, P, 20), { tone: "mid" }) +
      solid(K.cylinder(px, 0, 0.9, b1 + 1.4, top - b1 - 1.4, P, 16), { tone: "mid", crease: "none" }) +
      solid(K.cylinder(px, 0, 2, top, 1.8, P, 20), { tone: "mid" }) +
      line(K.knurl(px, 0, 2, top, top + 1.8, 14, P), { tone: "lo" }));
  }

  // ---- spring push bar on its two rods, with the coils (back half, bar, front half) ----
  {
    const tail = xOf(S.nose - 6);
    const bx = Math.min(tail, xOf(GEO.BAR_STOP));
    const ab = xOf(GEO.ABUT);
    for (const side of [-1, 1]) {
      const y = side * GEO.ROD_Y;
      const coil = K.coil(ab, bx - 0.6, [y, GEO.ROD_Z], 1.9, 9, "x", P);
      put(key((ab + bx) / 2, y),
        line(coil.back, { tone: "lo" }) +
        solid(slab(ab, xOf(GEO.BAR_STOP) + 2.2, y - 0.8, y + 0.8, GEO.ROD_Z - 0.8, 1.6, 2, 0, 0.7), { tone: "mid", crease: "none" }) +
        line(coil.front, { tone: "mid" }) +
        solid(slab(bx - 1.4, bx, y - 1.5, y + 1.5, GEO.ROD_Z - 1.5, 3, 2, 0.3, 0.5), { tone: "mid" }) +
        dots([[bx - 0.7, y]], GEO.ROD_Z + 1.5));
    }
    const bar = { x: bx - 1.4, y: -GEO.ROD_Y + 1.3, w: 1.4, d: 2 * GEO.ROD_Y - 2.6, r: 0.3 };
    put(key(bx - 0.7, 0) + 0.01, solid(K.slabOf(bar, 3.6, 4.6, P, 2, 0.3), { tone: "mid" }));
  }

  // ---- the OMG: lit shuttle with a trip finger reaching out over the targets ----
  {
    const n = xOf(S.nose), t = xOf(S.nose - 6);
    const [z0, z1] = GEO.BODY;
    let out = `<path class="iso-halo" d="${slab(t, n, -4.4, 4.4, RT, 0.1).fill}" style="filter:blur(2.5px)"/>`;
    for (const sx of [t + 0.6, n - 4.2]) for (const sy of [-GEO.RAIL, GEO.RAIL]) out += solid(slab(sx, sx + 2.6, sy - 1, sy + 1, RT, z0 - RT, 2, 0, 0.3), { tone: "mid" });
    const body = { x: t, y: -4, w: n - 2.6 - t, d: 8, r: 0.8 };
    out += solid(K.slabOf(body, z0, z1 - z0, P, 3, 0.5), { tone: "hi", lit: true, crease: "lo", inner: line(K.sideSeam(body, z0 + 1.6, P, 3), { tone: "faint" }) });
    out += solid(K.extrude([[n - 2.6, -4], [n, -1.2], [n, 1.2], [n - 2.6, 4]], z0, z1 - z0, P, { bevel: 0.3 }), { tone: "hi", lit: true, crease: "lo" });
    out += dots([[t + 1.2, -2.8], [t + 1.2, 2.8], [n - 3.6, -2.8], [n - 3.6, 2.8]], z1);
    const fx = n - 4.2;
    out += solid(slab(fx - 0.7, fx + 0.7, -GEO.FINGER, -0.6, GEO.FINGER_Z, 1.1, 2, 0, 0.3), { tone: "mid", crease: "none" });
    out += solid(K.cylinder(fx, -1.4, 0.8, z1, GEO.FINGER_Z - z1 + 1.1, P, 14), { tone: "mid", crease: "none" });
    const kx = t + 3;
    out += solid(K.cylinder(kx, 0, 1.6, z1, 1.6, P, 18), { tone: "mid" }) + line(K.knurl(kx, 0, 1.6, z1, z1 + 1.6, 14, P), { tone: "lo" });
    put(key((t + n) / 2, 0), out);
  }

  // ---- drop targets in the rear: each block sinks into its housing when the finger trips it ----
  S.targets.forEach((g, i) => {
    const cx = xOf(g.x) - 4.2;   // under the finger when the nose is at g.x
    const [y0, y1] = GEO.TGT;
    const hit = S.hit[i];
    const housing = { x: cx - 3.4, y: y0 - 0.6, w: 6.8, d: y1 - y0 + 1.6, r: 0.6 };
    let out = solid(K.slabOf(housing, 0, 2.2, P, 2, 0.3), { tone: "mid" });
    out += line(K.planOutline({ x: cx - 2.5, y: y0 - 0.1, w: 5, d: y1 - y0 + 0.2, r: 0.3 }, 2.2, P, 2), { tone: "lo" });
    out += dots([[cx - 2.9, y0 - 0.1], [cx + 2.9, y0 - 0.1]], 2.2, 0.36);
    const top = 2.2 + 11.8 * (1 - hit);
    if (top - 2.2 > 0.12) {
      const blk = { x: cx - 2.2, y: y0 + 0.2, w: 4.4, d: y1 - y0 - 0.4, r: 0.3 };
      out += solid(K.slabOf(blk, 2.2, top - 2.2, P, 2, 0.3), { tone: "hi", crease: "lo" });
      if (top - 2.2 > 3) out += line(K.sideSeam(blk, top - 1.6, P, 2), { tone: "faint" });
    }
    put(key(cx, (y0 + y1) / 2), out);
  });

  // ---- the enemy's operational reserve: a block that slides across the lane at 42-48 km ----
  {
    const yc = reserveY(S.res);
    const x0 = xOf(42), x1 = xOf(48);
    let out = `<path class="iso-halo" d="${slab(x0, x1, yc - 5.2, yc + 5.2, RT, 0.1).fill}" style="filter:blur(2.5px)"/>`;
    for (const sx of [xOf(43), xOf(47)]) for (const sy of [-3.2, 3.2]) out += solid(slab(sx - 1, sx + 1, yc + sy - 1.2, yc + sy + 1.2, RT, 1.4, 2, 0, 0.3), { tone: "mid" });
    const body = { x: x0, y: yc - 5, w: x1 - x0, d: 10, r: 0.8 };
    out += solid(K.slabOf(body, RT + 1.4, 8, P, 3, 0.5), { tone: "hi", crease: "lo", inner: line(K.sideSeam(body, RT + 3.2, P, 3), { tone: "faint" }) });
    out += line(K.planOutline(K.insetPlan(body, 1.6), RT + 9.4, P, 3), { tone: "faint" });
    out += dots(K.corners(body, 1).map((p) => p), RT + 9.4);
    put(key((x0 + x1) / 2, yc), out);
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The day clock needle for day t on a 0..days dial: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, t, days) {
  const f = Math.min(1, Math.max(0, t / days));
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 2.4, D.y - sy * 2.4], [D.x + sx * (D.r - 3), D.y + sy * (D.r - 3)], D.z + D.h + 0.2, P);
}
