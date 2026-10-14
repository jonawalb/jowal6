// The moving half of the figure: the block on its pallet, the two curved jaws with their
// pivots and tail rollers, the escape stop, and the fixing carriage with its concave ram pad.
// Rebuilt per frame. Written against the kit as a parameter (K) and the model as a parameter
// (M) so build.mjs (Node) and the page (inlined kit and model) run the same code.
// build.mjs inlines this file with `export` stripped.

export const GEO = {
  RAIL_TOP: 1.5,     // top of the pallet slot rails
  PAL_TOP: 4,        // top of the pallet
  BLK_TOP: 14,       // top of the block
  JAW_Z: 5,          // underside of the jaws
  JAW_H: 12,         // jaw height
  PAD_Z: 6,          // underside of the ram pad
  PAD_H: 11,         // pad height
  ROD_LEN: 30,       // rod from the pad back plate to the carriage housing
  STOP_X: -83.5,     // escape stop: rear end of the slot
  SEG: 4,            // jaw segments per jaw (for depth order)
  ROLLER: 160,       // angle of the tail roller that rides the arc slide
};

const SC_RAD = Math.PI / 180;

export function scene(K, P, M, S) {
  const m = M.MODEL;
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  const polar = (cx, r, deg) => [cx + r * Math.cos(deg * SC_RAD), r * Math.sin(deg * SC_RAD)];
  const rout = m.rin + m.thick, rmid = m.rin + m.thick / 2;

  // ---- the block (enemy force) on its pallet ----
  const s = S.s;
  const blockKey = depth(s, 0);
  {
    let out = `<path class="iso-halo" d="${K.cylinder(s, 0, m.rb + 1, GEO.RAIL_TOP, 0.1, P, 64).fill}" style="filter:blur(3px)"/>`;
    out += solid(K.slabOf({ x: s - 17, y: -12.5, w: 34, d: 25, r: 4 }, GEO.RAIL_TOP, GEO.PAL_TOP - GEO.RAIL_TOP, P, 4, 0.4), { tone: "mid" });
    const bh = GEO.BLK_TOP - GEO.PAL_TOP;
    out += solid(K.cylinder(s, 0, m.rb, GEO.PAL_TOP, bh, P, 96, 0.8), { tone: "hi", lit: true, crease: "lo", inner: line(K.sideArc(s, 0, m.rb, GEO.PAL_TOP + 3, P, 64), { tone: "faint" }) });
    // a degree scale round the rim: the perimeter the gauge measures
    const t = K.radialTicks(s, 0, m.rb - 0.15, 72, 6, GEO.BLK_TOP, [1.2, 2.2], P);
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    out += line(K.ring(s, 0, m.rb - 3.6, GEO.BLK_TOP, P, 72), { tone: "faint" });
    // six units in formation, and a centre boss
    const pegs = [];
    for (let i = 0; i < 6; i++) pegs.push(polar(s, 11, 30 + i * 60));
    pegs.sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));
    for (const [x, y] of pegs) out += solid(K.cylinder(x, y, 2.3, GEO.BLK_TOP, 1.6, P, 18), { tone: "hi", crease: "lo" });
    out += solid(K.cylinder(s, 0, 4.2, GEO.BLK_TOP, 2.4, P, 28, 0.3), { tone: "mid" }) + line(K.knurl(s, 0, 4.2, GEO.BLK_TOP, GEO.BLK_TOP + 2.4, 28, P), { tone: "lo" });
    // the enemy's standard on the boss
    const bt = GEO.BLK_TOP + 2.4;
    out += solid(K.cylinder(s, 0, 0.75, bt, 12, P, 12), { tone: "mid", crease: "none" });
    out += solid(K.slabOf({ x: s + 0.4, y: -0.3, w: 8.4, d: 0.6, r: 0.2 }, bt + 6.2, 5.4, P, 2), { tone: "hi", crease: "none" });
    out += solid(K.cylinder(s, 0, 1.2, bt + 12, 1, P, 12), { tone: "mid" });
    put(blockKey, out);
  }

  // ---- escape stop at the rear end of the slot, just beyond the escaped block's rim ----
  {
    const X = GEO.STOP_X;
    const svg = solid(K.slabOf({ x: X, y: -9, w: 3, d: 18, r: 0.8 }, 0, GEO.PAL_TOP - 0.5, P, 3, 0.3), { tone: "mid" }) +
      dots([[X + 1.5, -6.5, GEO.PAL_TOP - 0.5], [X + 1.5, 6.5, GEO.PAL_TOP - 0.5]]);
    put(depth(X + 1.5, 0), svg);
  }

  // ---- the jaws (enveloping forces): each in segments so the block can sit between them ----
  for (const side of [-1, 1]) {
    const segKeys = [];
    const jp = (deg, r) => M.jawPoint(side, deg, r, S.beta, m);
    const [px, py] = M.pivot(side, m);
    const span = (m.tail - m.root) / GEO.SEG;
    // a point on an end cap: centre at mid radius at angle deg, psi measured from the outward radial
    const cap = (deg, psi) => {
      const a = side * deg * SC_RAD;
      const cx = rmid * Math.cos(a), cy = rmid * Math.sin(a);
      const ux = Math.cos(a), uy = Math.sin(a); // outward radial
      const tx = -uy * side, ty = ux * side;    // toward larger deg
      const h = m.thick / 2;
      const x = cx + h * (ux * Math.cos(psi) + tx * Math.sin(psi)), y = cy + h * (uy * Math.cos(psi) + ty * Math.sin(psi));
      const [qx, qy] = [x - px, y - py];
      const t = -side * S.beta * SC_RAD, c = Math.cos(t), sn = Math.sin(t);
      return [px + qx * c - qy * sn, py + qx * sn + qy * c];
    };
    for (let i = 0; i < GEO.SEG; i++) {
      const a0 = m.root + i * span, a1 = a0 + span;
      const ring = [];
      for (let d = a0; d <= a1 + 1e-9; d += 2) ring.push(jp(d, m.rin));
      if (i === GEO.SEG - 1) for (let k = 15; k < 180; k += 15) ring.push(cap(a1, (180 - k) * SC_RAD));
      for (let d = a1; d >= a0 - 1e-9; d -= 2) ring.push(jp(d, rout));
      if (i === 0) for (let k = 15; k < 180; k += 15) ring.push(cap(a0, -k * SC_RAD));
      const [mx, my] = jp((a0 + a1) / 2, rmid);
      const top = GEO.JAW_Z + GEO.JAW_H;
      let out = "";
      if (i === 0) {
        // pivot boss under the root
        out += solid(K.cylinder(px, py, 5.2, 0, GEO.JAW_Z, P, 28, 0.4), { tone: "mid" });
      }
      if (i === GEO.SEG - 1) {
        // tail roller riding the arc slide
        const [tx, ty] = jp(GEO.ROLLER, rmid);
        // index tab from the roller out to the slide's scale
        const ux = tx - px, uy = ty - py, R = Math.hypot(ux, uy), ex = ux / R, ey = uy / R;
        const tab = [[R + 1.5, -0.8], [R + 4.5, -0.8], [R + 4.5, 0.8], [R + 1.5, 0.8]].map(([r, w]) => [px + ex * r - ey * w, py + ey * r + ex * w]);
        out += solid(K.extrude(tab, 0.8, 0.8, P), { tone: "hi", crease: "lo" });
        out += solid(K.cylinder(tx, ty, 3, 0.8, GEO.JAW_Z - 0.8, P, 24), { tone: "mid", crease: "none", inner: line(K.sideArc(tx, ty, 3, 2.9, P, 16), { tone: "faint" }) });
      }
      const g1 = i === GEO.SEG - 1 ? m.tail - 4 : a1;
      const groove = K.onTop((() => { const g = []; for (let d = a0; d < g1 - 1e-9; d += 2) g.push(jp(d, rmid)); g.push(jp(g1, rmid)); return g; })(), top, P);
      out += solid(K.extrude(ring, GEO.JAW_Z, GEO.JAW_H, P, { convex: false, bevel: 0.4 }), { tone: "hi", crease: "lo", inner: line(K.ringSeam(ring, GEO.JAW_Z + 3, P), { tone: "faint" }) });
      out += line(groove, { tone: "faint" });
      const sc = [jp(a0 + span * 0.3, rmid), jp(a0 + span * 0.7, rmid)];
      out += K.dotsSvg(sc.map(([x, y]) => at([x, y, top])), { size: 0.45 });
      if (i === 0) {
        out += solid(K.cylinder(px, py, 3.4, top, 1.6, P, 24, 0.3), { tone: "mid" });
        out += K.dotsSvg([at([px, py, top + 1.6])], { size: 0.5 });
      }
      if (i === GEO.SEG - 1) {
        const [tx, ty] = jp(m.tail - 4, rmid);
        out += solid(K.cylinder(tx, ty, 2.6, top, 3.2, P, 20), { tone: "mid" }) + line(K.knurl(tx, ty, 2.6, top, top + 3.2, 18, P), { tone: "lo" });
      }
      segKeys.push(depth(mx, my));
      put(depth(mx, my), out);
    }
    // hinge pins across each seam between segments, drawn after both neighbours
    for (let i = 1; i < GEO.SEG; i++) {
      const [hx, hy] = jp(m.root + i * span, rmid);
      const top = GEO.JAW_Z + GEO.JAW_H;
      put(Math.max(segKeys[i - 1], segKeys[i]) + 0.01, solid(K.cylinder(hx, hy, 1.9, top, 1.1, P, 18), { tone: "mid" }) + K.dotsSvg([at([hx, hy, top + 1.1])], { size: 0.42 }));
    }
  }

  // ---- fixing force: concave ram pad, back plate, rod and spring, carriage on its rails ----
  {
    const u = S.u;
    const ring = [];
    for (let d = -m.padHalf; d <= m.padHalf + 1e-9; d += 4) ring.push(polar(u, m.rin, d));
    for (let d = m.padHalf; d >= -m.padHalf - 1e-9; d -= 4) ring.push(polar(u, m.padOut, d));
    const pz = GEO.PAD_Z, ph = GEO.PAD_H;
    const back0 = u + 25.4, back1 = u + 28.6;
    const rod0 = back1, rod1 = back1 + GEO.ROD_LEN;
    const cx = rod1 + 12;
    const rodZ = 11;
    // pad and back plate
    put(depth(u + 24, 0),
      solid(K.extrude(ring, pz, ph, P, { convex: false, bevel: 0.4 }), { tone: "hi", crease: "lo", inner: line(K.ringSeam(ring, pz + 3, P), { tone: "faint" }) }) +
      K.dotsSvg([polar(u, (m.rin + m.padOut) / 2, -28), polar(u, (m.rin + m.padOut) / 2, 28)].map(([x, y]) => at([x, y, pz + ph])), { size: 0.45 }) +
      solid(K.slabOf({ x: back0, y: -8, w: back1 - back0, d: 16, r: 0.8 }, pz + 0.5, ph - 1, P, 2, 0.3), { tone: "mid" }) +
      K.dotsSvg([[back1 - 1.6, -5.5], [back1 - 1.6, 5.5]].map(([x, y]) => at([x, y, pz + ph - 0.5])), { size: 0.42 }));
    // rod with its spring, split back / rod / front
    const coil = K.coil(rod0 + 1, rod1 - 1, [0, rodZ], 3, 7, "x", P);
    put(depth((rod0 + rod1) / 2, 0),
      solid(K.slabOf({ x: rod0, y: -3, w: 1, d: 6, r: 0.4 }, rodZ - 3, 6, P, 2), { tone: "mid", crease: "none" }) +
      solid(K.slabOf({ x: rod1 - 1, y: -3, w: 1, d: 6, r: 0.4 }, rodZ - 3, 6, P, 2), { tone: "mid", crease: "none" }) +
      solid(K.slabOf({ x: rod0 + 1, y: 4.6, w: rod1 - rod0 - 1, d: 1.8, r: 0.8 }, rodZ + 1.2, 1.8, P, 3), { tone: "mid", crease: "none" }) +
      line(coil.back, { tone: "lo" }) +
      solid(K.slabOf({ x: rod0, y: -1.4, w: rod1 - rod0, d: 2.8, r: 1.2 }, rodZ - 1.4, 2.8, P, 3), { tone: "mid", crease: "none" }) +
      line(coil.front, { tone: "mid" }) +
      solid(K.slabOf({ x: rod0 + 1, y: -6.4, w: rod1 - rod0 - 1, d: 1.8, r: 0.8 }, rodZ + 1.2, 1.8, P, 3), { tone: "mid", crease: "none" }));
    // carriage
    let car = `<path class="iso-halo" d="${K.slabOf({ x: cx - 13, y: -11, w: 26, d: 22, r: 2 }, 3, 0.1, P).fill}" style="filter:blur(3px)"/>`;
    const shoes = [];
    for (const sx of [-11, 3]) for (const sy of [-16, 12]) shoes.push({ x: cx + sx, y: sy, w: 8, d: 4, r: 0.8 });
    const shoeSvg = (plan) => solid(K.slabOf(plan, 3, 4.6, P, 2, 0.3), { tone: "mid" }) + K.dotsSvg([at([plan.x + 4, plan.y + 2, 7.6])], { size: 0.42 });
    const near = (plan) => depth(plan.x + plan.w / 2, plan.y + plan.d / 2) > depth(cx, 0);
    car += shoes.filter((p) => !near(p)).map(shoeSvg).join("");
    const plate = { x: cx - 14, y: -12, w: 28, d: 24, r: 2 };
    car += solid(K.slabOf(plate, 3, 6, P, 4, 0.6), { tone: "mid", inner: line(K.sideSeam(plate, 5.5, P, 4), { tone: "faint" }) });
    car += shoes.filter(near).map(shoeSvg).join("");
    car += line(K.lineOnTop([cx - 14, 8.5], [cx + 14, 8.5], 9, P), { tone: "faint" }) + line(K.lineOnTop([cx - 14, -8.5], [cx + 14, -8.5], 9, P), { tone: "faint" });
    const hous = { x: cx - 12, y: -7, w: 11, d: 14, r: 1.2 };
    car += solid(K.slabOf(hous, 9, 9, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(hous, 14, P, 3), { tone: "faint" }) });
    car += K.dotsSvg([[cx - 10.4, -5.4], [cx - 2.6, -5.4], [cx - 10.4, 5.4], [cx - 2.6, 5.4]].map(([x, y]) => at([x, y, 18])), { size: 0.42 });
    car += solid(K.cylinder(cx - 6.5, 0, 3, 18, 3, P, 36), { tone: "mid" }) + line(K.knurl(cx - 6.5, 0, 3, 18, 21, 20, P), { tone: "lo" });
    car += solid(K.slabOf({ x: cx + 14, y: -1.6, w: 3, d: 3.2, r: 0.6 }, 4.5, 3, P, 2), { tone: "mid", crease: "none" });
    car += solid(K.cylinder(cx + 19, 0, 2.6, 3.6, 4.8, P, 32), { tone: "mid" }) + line(K.knurl(cx + 19, 0, 2.6, 3.6, 8.4, 16, P, 0.25), { tone: "lo" });
    put(depth(cx, 0), car);
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}


// The dial needle for a share f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = D.from + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
