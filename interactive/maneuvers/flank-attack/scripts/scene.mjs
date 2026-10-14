// The moving half of the figure: the fort on its turntable, the brake jaw, the fixing
// carriage with its ram, and the maneuver carriage on the ring. Rebuilt per frame.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  TT: 7,                 // turntable top
  FRONT: 23,             // fort front face, local u
  CAL: 28,              // brake caliper bearing, degrees
  PAD_CONTACT: 23.2,     // ram pad tip x when it touches the front
  ROD_FREE: 46,          // spring length with no load
  PRELOAD: 4,            // spring compression when the ram is home
  CX_OUT: 112,           // fixing carriage centre when withdrawn
  R_CAR: 95,             // maneuver carriage radius
};
GEO.CX_HOME = GEO.PAD_CONTACT + 3 + GEO.ROD_FREE + 12 - GEO.PRELOAD;

const SC_RAD = Math.PI / 180;

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);

  // A box in a rotated frame: local (u, v) about (ox, oy), turned by ang degrees.
  const frame = (ox, oy, ang) => {
    const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
    return (u, v) => [ox + u * c - v * s, oy + u * s + v * c];
  };
  const box = (F, u0, u1, v0, v1, z0, h, bevel = 0) =>
    K.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z0, h, P, { bevel });
  const poly = (F, pts, z0, h, bevel = 0) => K.extrude(pts.map(([u, v]) => F(u, v)), z0, h, P, { bevel });
  const centre = (F, u0, u1, v0, v1) => F((u0 + u1) / 2, (v0 + v1) / 2);
  const facing = (ang) => {
    const [vx, vy] = K.towardViewer(P);
    return Math.cos(ang * SC_RAD) * vx + Math.sin(ang * SC_RAD) * vy > 0.02;
  };
  const faceLoop = (F, pts) => K.pathOf(pts.map(([u, v, z]) => at([...F(u, v), z])), true);

  // ---- engravings on the turntable top: the frontal arc and the facing pointer ----
  {
    // the sector the guns mainly cover, inlaid as one closed outline
    const F = frame(0, 0, S.psi);
    const fan = [];
    for (let a = -60; a <= 60; a += 4) fan.push(F(42 * Math.cos(a * SC_RAD), 42 * Math.sin(a * SC_RAD)));
    for (let a = 60; a >= -60; a -= 4) fan.push(F(36 * Math.cos(a * SC_RAD), 36 * Math.sin(a * SC_RAD)));
    put(-1e3, line(K.onTop(fan, GEO.TT, P, true), { tone: "lo" }));
    // index block on the rim: which way the fort faces
    put(-999, solid(box(F, 39, 44.6, -1.6, 1.6, GEO.TT, 1.6, 0.2), { tone: "hi", crease: "lo" }));
  }

  // ---- the fort, every part sorted on its own ----
  {
    const F = frame(0, 0, S.psi);
    const Z = GEO.TT;
    const part = (u0, u1, v0, v1, z0, z1, style, extra = "", bevel = 0) => {
      const [cx, cy] = centre(F, u0, u1, v0, v1);
      put(depth(cx, cy), solid(box(F, u0, u1, v0, v1, z0, z1 - z0, bevel), style) + extra);
    };
    // base course, under everything else
    const [bx, by] = centre(F, -23, 23, -20, 20);
    put(depth(bx, by) - 60, `<path class="iso-halo" d="${K.extrude([F(-24, -21), F(24, -21), F(24, 21), F(-24, 21)], Z, 0.1, P).fill}" style="filter:blur(3px)"/>` +
      solid(box(F, -23, 23, -20, 20, Z, 3, 0.5), { tone: "mid" }));
    const B = Z + 3;
    // front rampart: the thick face that carries the guns
    const front = facing(S.psi);
    let ports = "";
    if (front) for (const c of [-11, 11]) ports += line(faceLoop(F, [[GEO.FRONT, c - 2.4, B + 7], [GEO.FRONT, c + 2.4, B + 7], [GEO.FRONT, c + 2.4, B + 11.6], [GEO.FRONT, c - 2.4, B + 11.6]]), { tone: "lo" });
    const ramTop = K.onTop([F(15.2, -18.6), F(21.8, -18.6), F(21.8, 18.6), F(15.2, 18.6)], B + 16, P, true);
    part(14, GEO.FRONT, -20, 20, B, B + 16, { tone: "hi", crease: "lo" }, ports + line(ramTop, { tone: "faint" }), 0.5);
    for (const [v0, v1] of [[-20, -14], [-3, 3], [14, 20]]) part(15, 22, v0, v1, B + 16, B + 19, { tone: "hi", crease: "lo" });
    for (const c of [-11, 11]) part(GEO.FRONT, GEO.FRONT + 5, c - 0.9, c + 0.9, B + 8.4, B + 10.2, { tone: "mid" });
    // thin side and rear walls: the flanks and rear
    part(-23, 14, 17, 20, B, B + 10, { tone: "mid" });
    part(-23, 14, -20, -17, B, B + 10, { tone: "mid" });
    let gate = "";
    if (facing(S.psi + 180)) gate = line(faceLoop(F, [[-23, -4, B], [-23, 4, B], [-23, 4, B + 6], [-23, -4, B + 6]]), { tone: "lo" });
    part(-23, -20, -17, 17, B, B + 8, { tone: "mid" }, gate);
    // keep, mast and flag
    const keepTop = K.onTop([F(-9.5, -6.5), F(3.5, -6.5), F(3.5, 6.5), F(-9.5, 6.5)], B + 21, P, true);
    const [kx, ky] = centre(F, -11, 5, -8, 8);
    const [mx, my] = F(-3, 0);
    put(depth(kx, ky), solid(box(F, -11, 5, -8, 8, B, 21, 0.4), { tone: "mid" }) + line(keepTop, { tone: "faint" }) +
      K.dotsSvg([F(-9.5, -6.5), F(3.5, -6.5), F(3.5, 6.5), F(-9.5, 6.5)].map(([x, y]) => at([x, y, B + 21])), { size: 0.4 }) +
      solid(K.cylinder(mx, my, 1.8, B + 21, 1.2, P, 18), { tone: "mid" }) +
      solid(K.cylinder(mx, my, 0.7, B + 22.2, 14, P, 12), { tone: "mid", crease: "none" }) +
      solid(box(F, -12.5, -3.7, -0.3, 0.3, B + 30, 6), { tone: "hi", crease: "none" }));
  }

  // ---- brake caliper: body fixed to the base, jaw closes on the turntable rim when fixed ----
  {
    const F = frame(0, 0, GEO.CAL);
    const jawZ = GEO.TT + 0.15 + S.gap;
    const [x0, y0] = F(57, 0);
    const knob = F(57, 0);
    put(depth(x0, y0),
      solid(box(F, 53, 61, -6, 6, 0, 13, 0.4), { tone: "mid" }) +
      solid(box(F, 40, 53, -4, 4, jawZ, 3, 0.3), { tone: S.fixed ? "hi" : "mid", crease: "lo" }) +
      solid(K.cylinder(knob[0], knob[1], 2.6, 13, 2.4, P, 20), { tone: "mid" }) +
      line(K.knurl(knob[0], knob[1], 2.6, 13, 15.4, 18, P), { tone: "lo" }) +
      K.dotsSvg([F(54.6, -4.4), F(54.6, 4.4), F(59.4, -4.4), F(59.4, 4.4)].map(([x, y]) => at([x, y, 13])), { size: 0.42 }));
  }

  // ---- fixing force: carriage, ram housing, spring, rod and pad ----
  {
    const cx = S.cx, tip = S.tip;
    const rod0 = tip + 3, rod1 = cx - 12;
    let car = `<path class="iso-halo" d="${K.slabOf({ x: cx - 13, y: -11, w: 26, d: 22, r: 2 }, 3, 0.1, P).fill}" style="filter:blur(3px)"/>`;
    const shoes = [];
    for (const sx of [-11, 3]) for (const sy of [-16, 12]) shoes.push({ x: cx + sx, y: sy, w: 8, d: 4, r: 0.8 });
    const shoeSvg = (plan) => solid(K.slabOf(plan, 3, 4.6, P, 2, 0.3), { tone: "mid" }) +
      K.dotsSvg([at([plan.x + 4, plan.y + 2, 7.6])], { size: 0.42 });
    const near = (plan) => depth(plan.x + plan.w / 2, plan.y + plan.d / 2) > depth(cx, 0);
    car += shoes.filter((p) => !near(p)).map(shoeSvg).join("");
    car += solid(K.slabOf({ x: cx - 14, y: -12, w: 28, d: 24, r: 2 }, 3, 6, P, 4, 0.6), { tone: "mid" });
    car += shoes.filter(near).map(shoeSvg).join("");
    car += line(K.lineOnTop([cx - 14, 8.5], [cx + 14, 8.5], 9, P), { tone: "faint" }) + line(K.lineOnTop([cx - 14, -8.5], [cx + 14, -8.5], 9, P), { tone: "faint" });
    car += solid(K.slabOf({ x: cx - 12, y: -7, w: 11, d: 14, r: 1.2 }, 9, 11, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam({ x: cx - 12, y: -7, w: 11, d: 14, r: 1.2 }, 15, P, 3), { tone: "faint" }) });
    car += K.dotsSvg([[cx - 10.4, -5.4], [cx - 2.6, -5.4], [cx - 10.4, 5.4], [cx - 2.6, 5.4]].map(([x, y]) => at([x, y, 20])), { size: 0.42 });
    car += solid(K.cylinder(cx - 6.5, 0, 3, 20, 3, P, 24), { tone: "mid" }) + line(K.knurl(cx - 6.5, 0, 3, 20, 23, 20, P), { tone: "lo" });
    // handle on the far end
    car += solid(K.slabOf({ x: cx + 14, y: -1.6, w: 3, d: 3.2, r: 0.6 }, 4.5, 3, P, 2), { tone: "mid", crease: "none" });
    car += solid(K.cylinder(cx + 19, 0, 2.6, 3.6, 4.8, P, 20), { tone: "mid" }) + line(K.knurl(cx + 19, 0, 2.6, 3.6, 8.4, 16, P), { tone: "lo" });
    put(depth(cx, 0), car);

    const coil = K.coil(rod0, rod1, [0, 14.4], 3, 8, "x", P);
    put(depth((rod0 + rod1) / 2, 0),
      solid(K.slabOf({ x: rod0, y: -3, w: 0.8, d: 6, r: 0.4 }, 11.4, 6, P, 2), { tone: "mid", crease: "none" }) +
      solid(K.slabOf({ x: rod1 - 0.8, y: -3, w: 0.8, d: 6, r: 0.4 }, 11.4, 6, P, 2), { tone: "mid", crease: "none" }) +
      line(coil.back, { tone: "lo" }) +
      solid(K.slabOf({ x: rod0, y: -1.4, w: rod1 - rod0, d: 2.8, r: 1.2 }, 13, 2.8, P, 3), { tone: "mid", crease: "none" }) +
      line(coil.front, { tone: "mid" }));
    put(depth(tip + 1.5, 0),
      solid(K.slabOf({ x: tip, y: -6, w: 3, d: 12, r: 0.8 }, 9, 12, P, 2, 0.4), { tone: "hi", crease: "lo" }) +
      K.dotsSvg([[tip + 1.5, -4], [tip + 1.5, 4]].map(([x, y]) => at([x, y, 21])), { size: 0.42 }));
  }

  // ---- maneuver force: carriage on the ring, lit spearhead pointing at the fort ----
  {
    const F = frame(0, 0, S.theta);
    const [ox, oy] = F(GEO.R_CAR, 0);
    const key = depth(ox, oy);
    let out = `<path class="iso-halo" d="${box(F, 83, 107, -10, 10, 4.2, 0.1).fill}" style="filter:blur(3px)"/>`;
    const shoes = [];
    for (const [r0, r1] of [[85, 91], [99, 105]]) for (const [t0, t1] of [[-14, -11], [11, 14]]) shoes.push([r0, r1, t0, t1]);
    const shoeSvg = ([r0, r1, t0, t1]) => solid(box(F, r0, r1, t0, t1, 4.2, 3.8, 0.3), { tone: "mid" });
    const isNear = ([r0, r1, t0, t1]) => { const [x, y] = centre(F, r0, r1, t0, t1); return depth(x, y) > key; };
    out += shoes.filter((s) => !isNear(s)).map(shoeSvg).join("");
    out += solid(box(F, 82, 108, -11, 11, 4.2, 4.8, 0.5), { tone: "mid" });
    out += shoes.filter(isNear).map(shoeSvg).join("");
    out += K.dotsSvg([F(84, -9), F(84, 9), F(106, -9), F(106, 9)].map(([x, y]) => at([x, y, 9])), { size: 0.42 });
    const wedge = [[74, 0], [93, -8], [104, -8], [104, 8], [93, 8]];
    out += solid(poly(F, wedge, 9, 7, 0.4), { tone: "hi", lit: true, crease: "lo" });
    out += line(K.onTop([F(74, 0), F(104, 0)], 16, P), { tone: "lit" });
    const [hx, hy] = F(100, 0);
    out += solid(K.cylinder(hx, hy, 2.8, 16, 3.6, P, 22), { tone: "mid" }) + line(K.knurl(hx, hy, 2.8, 16, 19.6, 18, P), { tone: "lo" });
    put(key, out);
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The dial needle for a fire share f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
