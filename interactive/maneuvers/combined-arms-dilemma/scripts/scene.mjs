// The moving half of the figure: the guard pawl, the two keys and their plug indexes,
// the bolt and the keeper it runs in. Rebuilt per frame. Written against the kit as a
// parameter (K) so build.mjs (Node) and the page (inlined kit) run the same code.
// build.mjs inlines this file with `export` stripped.

export const GEO = {
  TOP: 25,                 // escutcheon top
  PLUG_A: [-30, -2],
  PLUG_B: [30, -2],
  PLUG_TOP: 29,            // plug face, where a key's collar sits
  PIVOT: [0, 14],          // guard pawl pivot
  SWING: 61.93,            // half swing, degrees: the pad reaches each plug at g = +-1
  HOLDER: [52, 43],        // socket the spare key rests in
  HOLDER_TOP: 9,
  LIFT: 18,                // how high a key is lifted to move it
  BODY_X: 62,              // body's +x face, where the bolt comes out
  BOLT_SHUT: 92,           // bolt tip when shut (inside the keeper)
  BOLT_OPEN: 64,           // bolt tip when drawn
  BOLT_Y: [-7, 3],
  BOLT_Z: [9, 17],
};

const SC_RAD = Math.PI / 180;

// The pawl's heading in degrees for a guard position g in -1..1.
export const pawlAngle = (g) => 270 + g * GEO.SWING;

// Where the spare key B stands for a transit s in 0..1 (0 in its plug, 1 in its holder).
export function keyBPose(s) {
  const e = (x) => x * x * (3 - 2 * x);
  const [ax, ay] = GEO.PLUG_B, [hx, hy] = GEO.HOLDER;
  const z0 = GEO.PLUG_TOP, z1 = GEO.HOLDER_TOP, top = z0 + GEO.LIFT;
  if (s <= 0.28) return [ax, ay, z0 + (top - z0) * e(s / 0.28)];
  if (s >= 0.72) { const t = e((s - 0.72) / 0.28); return [hx, hy, top + (z1 - top) * t]; }
  const t = e((s - 0.28) / 0.44);
  return [ax + (hx - ax) * t, ay + (hy - ay) * t, top];
}

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const frame = (ox, oy, ang) => {
    const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
    return (u, v) => [ox + u * c - v * s, oy + u * s + v * c];
  };
  const box = (F, u0, u1, v0, v1, z0, h, bevel = 0) =>
    K.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z0, h, P, { bevel });

  // ---- index pointers on the plug faces: they turn with the keys ----
  for (const [[px, py], turn] of [[GEO.PLUG_A, S.turnA], [GEO.PLUG_B, S.turnB]]) {
    const F = frame(px, py, 90 - turn);
    put(depth(px, py) - 0.5, line(K.lineOnTop(F(3.4, 0), F(6.2, 0), GEO.PLUG_TOP + 0.6, P), { tone: "hi", free: "end" }) +
      line(K.lineOnTop(F(-3.4, 0), F(-6.2, 0), GEO.PLUG_TOP + 0.6, P), { tone: "lo", free: "end" }));
  }

  // ---- guard pawl: arm and pad swing from the pivot boss ----
  {
    const [ox, oy] = GEO.PIVOT;
    const F = frame(ox, oy, pawlAngle(S.g));
    const [cx, cy] = F(12, 0);
    let out = solid(K.cylinder(ox, oy, 4.2, 27.4, 2.4, P, 24, 0.3), { tone: "hi", crease: "lo" });
    out += solid(box(F, 2.6, 20.4, -2.4, 2.4, 27.4, 2.4, 0.3), { tone: "hi", crease: "lo" });
    out += K.dotsSvg([F(14.5, 0)].map(([x, y]) => at([x, y, 29.8])), { size: 0.42 });
    out += solid(box(F, 20, 24, -4.2, 4.2, 26.6, 3.6, 0.3), { tone: "hi", crease: "lo" });
    out += line(K.onTop([F(20.8, -3.4), F(23.2, -3.4), F(23.2, 3.4), F(20.8, 3.4)], 30.2, P, true), { tone: "faint" });
    out += solid(K.cylinder(ox, oy, 3, 29.8, 1.6, P, 22), { tone: "mid" }) + line(K.knurl(ox, oy, 3, 29.8, 31.4, 18, P), { tone: "lo" });
    out += K.dotsSvg([at([ox, oy, 31.4])], { size: 0.5 });
    put(depth(cx, cy, 2), out);
  }

  // ---- keeper (a U channel on its own plate) with the bolt running in it ----
  {
    const kx = 86, ky = GEO.BOLT_Y[0] + 5;
    const kd = depth(kx, ky);
    const plan = (x, y, w, d, r = 0.8) => ({ x, y, w, d, r });
    let back = solid(K.slabOf(plan(74, -18, 24, 32, 2), 0, 2, P, 3, 0.4), { tone: "mid" });
    back += K.dotsSvg([[77, -15], [95, -15], [77, 11], [95, 11]].map(([x, y]) => at([x, y, 2])), { size: 0.45 });
    back += solid(K.slabOf(plan(76, -9, 20, 14), 2, 7, P, 2, 0.3), { tone: "mid" });
    back += solid(K.slabOf(plan(76, -15, 20, 6), 2, 11, P, 2, 0.4), { tone: "mid" });
    back += solid(K.slabOf(plan(94, -9, 2.6, 14), 9, 4, P, 2, 0.3), { tone: "mid" });
    back += K.dotsSvg([at([79, -12, 13]), at([86, -12, 13]), at([93, -12, 13])], { size: 0.42 });
    put(kd - 40, back);
    const tip = S.tip;
    const [y0, y1] = GEO.BOLT_Y, [z0, z1] = GEO.BOLT_Z;
    let bolt = solid(K.slabOf(plan(GEO.BODY_X, y0, tip - GEO.BODY_X, y1 - y0, 0.8), z0, z1 - z0, P, 2, 0.4), { tone: "hi", lit: true, crease: "lo" });
    bolt += line(K.lineOnTop([GEO.BODY_X, (y0 + y1) / 2], [tip - 0.8, (y0 + y1) / 2], z1, P), { tone: "lit" });
    put(kd - 20, bolt);
    let front = solid(K.slabOf(plan(76, 5, 20, 6), 2, 11, P, 2, 0.4), { tone: "mid" });
    front += K.dotsSvg([at([79, 8, 13]), at([86, 8, 13]), at([93, 8, 13])], { size: 0.42 });
    put(kd + 20, front);
  }

  // ---- the keys: T-handles on their stems; always above everything else in this layer ----
  const key = (x, y, zb, turn) => {
    const F = frame(x, y, 90 - turn);
    let out = solid(K.cylinder(x, y, 3.4, zb, 1.4, P, 22), { tone: "mid" });
    out += solid(K.cylinder(x, y, 2.1, zb + 1.4, 10.6, P, 18), { tone: "hi", crease: "none", inner: line(K.sideArc(x, y, 2.1, zb + 6, P, 12), { tone: "faint" }) });
    const grips = [-10.5, 10.5].map((u) => ({ u, p: F(u, 0) })).sort((a, b) => depth(...a.p) - depth(...b.p));
    const grip = ({ p: [gx, gy] }) => solid(K.cylinder(gx, gy, 2.8, zb + 11.4, 5, P, 20), { tone: "hi", crease: "lo" }) +
      line(K.knurl(gx, gy, 2.8, zb + 11.4, zb + 14.2, 14, P), { tone: "lo" }) +
      line(K.sideArc(gx, gy, 2.8, zb + 14.2, P, 14), { tone: "faint" });
    out += grip(grips[0]);
    out += solid(box(F, -9.5, 9.5, -2, 2, zb + 12, 3.6, 0.4), { tone: "hi", crease: "lo" });
    out += K.dotsSvg([at([x, y, zb + 15.6])], { size: 0.45 });
    out += grip(grips[1]);
    return out;
  };
  put(1000 + depth(...GEO.PLUG_A), key(...GEO.PLUG_A, GEO.PLUG_TOP, S.turnA));
  const [bx, by, bz] = keyBPose(S.kb);
  put(1000 + depth(bx, by) + (S.kb > 0.01 && S.kb < 0.99 ? 500 : 0), key(bx, by, bz, S.kb > 0.01 ? 0 : S.turnB));

  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The dial needle for a bolt draw f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
