// The moving half of the figure: the wall face with its five set-back keys, the five
// feeler-blade carriages on their springs, the push bar and the lit ram on its saddle.
// Rebuilt per frame. Written against the kit as a parameter (K) so build.mjs (Node) and
// the page (inlined kit) run the same code. build.mjs inlines this file with `export` stripped.
//
// Painter's order is fixed by structure, not sorted: everything sits in one of five lanes
// (y bands), so the scene paints the wall's back, then lane by lane from far (small y) to
// near: the lane's far divider and rib, its key, blade, carriage and spring, and the ram
// when its footprint reaches this lane; then the near divider, the push bar and the saddle.

export const GEO = {
  BLADE: 40,      // feeler blade length past the carriage front
  CAR: 12,        // carriage length
  KEY: 34,        // key length
  PLATE_X: [-128, -120], // back plate of the wall
  DIV_X: [-120, -88],    // lane dividers
  RIB_X: [-88, -14],       // lane guide ribs on the bench
  WALL_Z: 20,
};

export function scene(K, P, S, M) {
  const out = [];
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const slab = (x0, x1, y0, y1, z, h, r = 0.6, steps = 3, bevel = 0) =>
    K.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z, h, P, steps, bevel);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  const pitch = M.pitch, half = pitch / 2;
  const n = M.lanes;
  const bound = (j) => (j - n / 2) * pitch;
  const yc = (i) => (i - (n - 1) / 2) * pitch;

  // ---- key backs behind the wall plate, then the plate ----
  // slot j counts lanes far to near (y rising); lane index i = n - 1 - j (lane 1 nearest)
  for (let j = 0; j < n; j++) {
    const i = n - 1 - j;
    const xf = M.face - S.depths[i], xk = xf - GEO.KEY;
    if (xk < GEO.PLATE_X[0]) out.push(solid(slab(xk, GEO.PLATE_X[0], yc(j) - 7.6, yc(j) + 7.6, 0, 18, 0.6, 3, 0.4), { tone: "mid" }));
  }
  {
    const [x0, x1] = GEO.PLATE_X, y = bound(0) - 4, h = GEO.WALL_Z;
    const plan = { x: x0, y, w: x1 - x0, d: -2 * y, r: 1 };
    out.push(solid(K.slabOf(plan, 0, h, P, 3, 0.6), { tone: "mid", inner: line(K.sideSeam(plan, 4, P, 3), { tone: "faint" }) }));
    const sc = [];
    for (let j = 0; j <= n; j++) sc.push([(x0 + x1) / 2, bound(j), h]);
    out.push(dots(sc, 0.45));
  }

  // ---- the ram (rods and head), drawn in the lane its footprint reaches last ----
  const ramSlot = Math.min(n - 1, Math.max(0, Math.floor((S.ramY + 5.2 - bound(0)) / pitch)));
  const ram = () => {
    const y = S.ramY, xb = S.xb;
    const back = xb - 1, headBack = S.ramTip + 10;
    const L = Math.max(0, back - headBack);
    const s1 = Math.min(L, Math.max(4, L / 2 + 2));
    const c = back - s1;
    let s = "";
    if (L - s1 > 0.05) s += solid(slab(headBack, c, y - 1.2, y + 1.2, 10.4, 2.4, 0.4, 2), { tone: "mid", crease: "none" });
    s += solid(slab(c, back, y - 1.8, y + 1.8, 9.8, 3.6, 0.5, 2, 0.3), { tone: "mid" });
    if (L > 4.5) s += solid(slab(c - 1.4, c, y - 2.6, y + 2.6, 9.2, 4.8, 0.5, 2), { tone: "mid" });
    const t = S.ramTip;
    const wedge = [[t, y], [t + 5, y - 5], [t + 10, y - 5], [t + 10, y + 5], [t + 5, y + 5]];
    s += solid(K.extrude(wedge, 9, 5, P, { bevel: 0.4 }), { tone: "hi", lit: true, crease: "lo" });
    s += line(K.lineOnTop([t, y], [t + 10, y], 14, P), { tone: "lit" });
    return s;
  };

  // ---- lane by lane, far to near ----
  const divider = (j) => {
    const end = j === 0 || j === n;
    const w = end ? 2 : 1;
    const yb = bound(j);
    const y0 = j === 0 ? yb - 3 : yb - w, y1 = j === n ? yb + 3 : yb + w;
    const h = end ? GEO.WALL_Z : 19;
    let s = solid(slab(GEO.RIB_X[0], GEO.RIB_X[1], yb - 0.8, yb + 0.8, 0, 3, 0.4, 2), { tone: "mid", crease: "none" });
    s += solid(slab(GEO.DIV_X[0], GEO.DIV_X[1], y0, y1, 0, h, 0.5, 2, 0.3), { tone: end ? "mid" : "mid" });
    s += dots([[GEO.DIV_X[1] - 3, (y0 + y1) / 2, h], [GEO.DIV_X[0] + 4, (y0 + y1) / 2, h]], 0.4);
    return s;
  };
  for (let j = 0; j < n; j++) {
    out.push(divider(j));
    const i = n - 1 - j, y = yc(j);
    // key front: from the plate face to its set-back face
    {
      const xf = M.face - S.depths[i], xk = Math.max(GEO.PLATE_X[1], xf - GEO.KEY);
      if (xf > xk + 0.2) {
        const plan = { x: xk, y: y - 7.6, w: xf - xk, d: 15.2, r: 0.6 };
        const pad = K.pathOf([[xf, y - 5.4, 3], [xf, y + 5.4, 3], [xf, y + 5.4, 14.6], [xf, y - 5.4, 14.6]].map(at), true);
        out.push(solid(K.slabOf(plan, 0, 18, P, 3, 0.4), { tone: "hi", crease: "lo", inner: line(pad, { tone: "faint" }) }));
        if (xf - xk > 5) out.push(line(K.planOutline(K.insetPlan(plan, 1.6), 18, P, 3), { tone: "faint" }));
        if (xf - xk > 7) out.push(dots([[xf - 3, y - 4.6, 18], [xf - 3, y + 4.6, 18]], 0.4));
      }
    }
    // feeler blade, carriage, thumb screw, guide rod and spring
    {
      const tip = S.tips[i], cf = tip + GEO.BLADE, cb = cf + GEO.CAR, xb = S.xb;
      out.push(solid(K.slabOf({ x: tip, y: y - 1.6, w: cf + 2 - tip, d: 3.2, r: 1.2 }, 2.6, 0.5, P, 4), { tone: "hi", crease: "none" }));
      out.push(solid(slab(cf, cb, y - 6.6, y + 6.6, 0.4, 5, 0.8, 3, 0.4), { tone: "mid", inner: line(K.sideSeam({ x: cf, y: y - 6.6, w: GEO.CAR, d: 13.2, r: 0.8 }, 2, P, 3), { tone: "faint" }) }));
      out.push(dots([[cb - 2.2, y - 4.4, 5.4], [cf + 2.2, y - 4.4, 5.4]], 0.4));
      out.push(solid(K.cylinder(cf + 6, y + 3.6, 1.8, 5.4, 1.6, P, 18), { tone: "mid" }) + line(K.knurl(cf + 6, y + 3.6, 1.8, 5.4, 7, 14, P), { tone: "lo" }));
      const w0 = cb, w1 = xb - 0.8;
      const coil = K.coil(w0 + 0.8, w1, [y, 3], 2.2, 7, "x", P);
      out.push(
        solid(slab(w0, w0 + 0.8, y - 2.8, y + 2.8, 0.6, 4.8, 0.4, 2), { tone: "mid", crease: "none" }) +
        line(coil.back, { tone: "lo" }) +
        solid(slab(w0 + 0.8, w1, y - 0.8, y + 0.8, 2.2, 1.6, 0.4, 2), { tone: "mid", crease: "none" }) +
        line(coil.front, { tone: "mid" }) +
        solid(slab(w1, xb, y - 2.8, y + 2.8, 0.6, 4.8, 0.4, 2), { tone: "mid", crease: "none" }),
      );
    }
    if (j === ramSlot) out.push(ram());
  }
  out.push(divider(n));

  // ---- push bar on its two shoes, saddle rail, end knobs ----
  {
    const xb = S.xb, yE = bound(n) + 15;
    for (const sy of [-1, 1]) {
      out.push(solid(slab(xb - 1, xb + 9, sy * yE - 3.5, sy * yE + 3.5, 2, 1.4, 0.6, 2), { tone: "mid" }));
    }
    out.push(barSvg());
    function barSvg() {
      const plan = { x: xb, y: -yE - 3, w: 8, d: 2 * yE + 6, r: 1 };
      let s = solid(K.slabOf(plan, 3.4, 4.6, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(plan, 5.6, P, 3), { tone: "faint" }) });
      s += line(K.planOutline({ x: xb + 2, y: bound(0) - 2, w: 4, d: bound(n) - bound(0) + 4, r: 1 }, 8, P, 3), { tone: "faint" });
      return s;
    }
    for (const sy of [-1, 1]) {
      out.push(solid(K.cylinder(xb + 4, sy * yE, 2.6, 8, 3, P, 20), { tone: "mid" }) + line(K.knurl(xb + 4, sy * yE, 2.6, 8, 11, 16, P), { tone: "lo" }));
    }
  }
  // ---- saddle carrying the ram ----
  {
    const xb = S.xb, y = S.ramY;
    const plan = { x: xb - 1, y: y - 7, w: 10, d: 14, r: 1 };
    out.push(solid(K.slabOf(plan, 8, 5.4, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(plan, 10.4, P, 3), { tone: "faint" }) }) +
      dots([[xb + 0.8, y - 5.2, 13.4], [xb + 0.8, y + 5.2, 13.4], [xb + 7.2, y - 5.2, 13.4], [xb + 7.2, y + 5.2, 13.4]], 0.42) +
      solid(K.cylinder(xb + 4, y, 2.4, 13.4, 2.4, P, 20), { tone: "mid" }) + line(K.knurl(xb + 4, y, 2.4, 13.4, 15.8, 16, P), { tone: "lo" }));
  }
  return out.join("");
}
