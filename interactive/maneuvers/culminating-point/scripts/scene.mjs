// The moving half of the figure: the supply sled (the base), the tether spring and the
// attacking carriage, sorted with the static parts that stand on the track (depot,
// end stop, objective, gauge). Rebuilt per frame. Written against the kit as a
// parameter (K) so build.mjs (Node) and the page (inlined kit) run the same code.
// build.mjs inlines this file with `export` stripped.

export const GEO = {
  RAIL_Z: 4.2,          // rail top
  SHOE_H: 3.8,          // shoe height above the rail top
  DECK: 8,              // underside of the carriage and sled plates
  AXIS_Z: 13,           // tether axis height
  COIL_R: 3,            // tether coil radius
  TURNS: 26,            // tether coil turns (fixed, so the pitch opens as it stretches)
  SLED_L: 16,           // sled plate length; its hook plate runs from SLED_L to SLED_L + 2
  CAR_L: 30,            // carriage plate length, behind the front x
  PROW: 8,              // prow length ahead of the front x
};

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  const slab = (x, y, w, d, z, h, r = 0.8, steps = 3, bevel = 0) => K.slabOf({ x, y, w, d, r }, z, h, P, steps, bevel);
  const G = GEO;
  const top = G.RAIL_Z + G.SHOE_H;

  // Four rail shoes under a plate: all drawn before it, since the plate overhangs them.
  const shoes = (x0, x1, cx) => {
    const list = [];
    for (const sx of [x0, x1]) for (const sy of [-13, 7]) list.push({ x: sx, y: sy, w: 7, d: 6 });
    list.sort((a, b) => depth(a.x + 3.5, a.y + 3) - depth(b.x + 3.5, b.y + 3));
    return list.map((s) => solid(slab(s.x, s.y, s.w, s.d, G.RAIL_Z, G.SHOE_H, 0.8, 2, 0.3), { tone: "mid" })).join("");
  };
  const hookPlate = (x0) =>
    solid(slab(x0, -4.6, 2, 9.2, G.AXIS_Z - 4.6, 9.2, 0.6, 2, 0.3), { tone: "mid", crease: "none" }) +
    dots([[x0 + 1, -2.6, G.AXIS_Z + 4.6], [x0 + 1, 2.6, G.AXIS_Z + 4.6]], 0.38);

  // ---- supply sled: the base the force draws on ----
  {
    const x = S.sled;
    const sh = shoes(x + 1, x + 8, x + G.SLED_L / 2);
    let out = `<path class="iso-halo" d="${slab(x, -14, G.SLED_L, 28, G.RAIL_Z, 0.1).fill}" style="filter:blur(3px)"/>`;
    out += sh;
    const plate = { x, y: -15, w: G.SLED_L, d: 30, r: 1.6 };
    out += solid(K.slabOf(plate, top, 4, P, 4, 0.5), { tone: "mid", inner: line(K.sideSeam(plate, top + 2, P, 4), { tone: "faint" }) });
    out += dots([[x + 2.2, -12.8, top + 4], [x + 2.2, 12.8, top + 4], [x + 13.8, -12.8, top + 4], [x + 13.8, 12.8, top + 4]]);
    // crate lashed to the sled: the supplies the tether stands for
    const crate = { x: x + 2, y: -11, w: 9, d: 13, r: 0.6 };
    out += solid(K.slabOf(crate, top + 4, 7, P, 2, 0.4), { tone: "lo", inner: line(K.sideSeam(crate, top + 7.5, P, 2), { tone: "faint" }) });
    out += line(K.planOutline(K.insetPlan(crate, 1.4), top + 11, P, 2), { tone: "faint" });
    // the tether post and its lock knob
    out += solid(slab(x + 11.5, 1.5, 4.5, 8, top + 4, 5.5, 0.6, 2, 0.3), { tone: "mid" });
    out += solid(K.cylinder(x + 13.75, 5.5, 2.1, top + 9.5, 3, P, 18), { tone: "mid" }) + line(K.knurl(x + 13.75, 5.5, 2.1, top + 9.5, top + 12.5, 14, P), { tone: "lo" });
    out += hookPlate(x + G.SLED_L);
    put(depth(x + G.SLED_L / 2, 0), out);
  }

  // ---- the tether: a tension spring from the sled's hook plate to the carriage's ----
  {
    const from = S.sled + G.SLED_L + 2;
    const to = S.x - G.CAR_L - 2;
    const c = K.coil(from, to, [0, G.AXIS_Z], G.COIL_R, G.TURNS, "x", P, 12);
    // each end hooks into an eye on its plate
    const eyes = K.dotsSvg([at([from, G.COIL_R, G.AXIS_Z]), at([to, G.COIL_R, G.AXIS_Z])], { size: 0.9, tone: "mid" });
    put(depth((from + to) / 2, 0), line(c.back, { tone: "lo" }) + line(c.front, { tone: "hi" }) + eyes);
  }

  // ---- the attacking carriage, its lit prow pointing at the objective ----
  {
    const x = S.x;
    const x0 = x - G.CAR_L;
    const sh = shoes(x0 + 2, x - 9, x - G.CAR_L / 2);
    let out = `<path class="iso-halo" d="${slab(x0, -15, G.CAR_L + G.PROW, 30, G.RAIL_Z, 0.1).fill}" style="filter:blur(3px)"/>`;
    out += hookPlate(x0 - 2);
    out += sh;
    const plate = { x: x0, y: -16, w: G.CAR_L, d: 32, r: 2 };
    out += solid(K.slabOf(plate, top, 5, P, 4, 0.6), { tone: "mid", inner: line(K.sideSeam(plate, top + 2.5, P, 4), { tone: "faint" }) });
    out += dots([2, 9.5, 17, 24].map((u) => [x0 + u + 1.5, 14.4, top + 5]), 0.4);
    // drive housing with a seam and a knurled throttle
    const box = { x: x0 + 3, y: -10, w: 13, d: 20, r: 1.4 };
    out += solid(K.slabOf(box, top + 5, 8, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(box, top + 9, P, 3), { tone: "faint" }) });
    out += dots(K.corners(box, 1.8).map(([u, v]) => [u, v, top + 13]), 0.4);
    out += solid(K.cylinder(x0 + 9.5, 0, 3, top + 13, 3, P, 22), { tone: "mid" }) + line(K.knurl(x0 + 9.5, 0, 3, top + 13, top + 16, 18, P), { tone: "lo" });
    out += line(K.lineOnTop([x0 + 6.6, 0], [x0 + 12.4, 0], top + 16, P), { tone: "hi" });
    // the prow: the part to watch
    const prow = [[x - 14, -7], [x + G.PROW - 1.6, -1.8], [x + G.PROW, 0], [x + G.PROW - 1.6, 1.8], [x - 14, 7]];
    out += solid(K.extrude(prow, top + 5, 5.5, P, { bevel: 0.4 }), { tone: "hi", lit: true, crease: "lo" });
    out += line(K.onTop([[x - 14, 0], [x + G.PROW, 0]], top + 10.5, P), { tone: "lit" });
    put(depth(x - G.CAR_L / 2, 0), out);
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The gauge needle for a power ratio p in 0..2: a 270 degree sweep, kit tick convention
// (angle 0 points to -y), with the defender's line (1.0) straight up the dial.
export function needle(K, P, D, p) {
  const f = Math.max(0, Math.min(2, p)) / 2;
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.6), D.y + sy * (D.r - 3.6)], D.top + 0.2, P);
}
