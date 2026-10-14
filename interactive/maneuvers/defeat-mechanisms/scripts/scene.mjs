// The moving half of the figure: the target block (two halves joined by a link plate),
// the crusher, the push rod and lever, the saw, the clamp ring and the supply cart.
// Rebuilt per frame, every part depth-sorted on its own. Written against the kit as a
// parameter (K) so build.mjs (Node) and the page (inlined kit) run the same code.
// build.mjs inlines this file with `export` stripped.

export const GEO = {
  TABLE: 2.5,          // slide-table top: the block's base
  H: 22,               // block height, whole
  H_CRUSH: 13,         // block height, crushed
  HALF_W: 14,          // half the block's length along x
  HALF_D: 13.5,        // depth of each half along y
  SLIDE: 14,           // how far the push rod knocks the block off its seat
  PLATEN_UP: 40,       // platen underside, raised
  RING: [7, 0, 31.5, 35.5], // clamp ring centre x, y, inner and outer radius
  RING_UP: 3.5,        // ring top when raised
  RING_REST: 0.3,      // ring top when sunk in its groove
  BLADE: [5.5, 9.75],  // saw blade radius and arbor height
  SAW_REST: 66,        // blade centre x when the saw is withdrawn
  ARM: 30,             // blade centre to carriage centre
  POSTS: 40,           // crusher posts at y = ±POSTS, x = 7
  CROSS: 64,           // crosshead underside
  PIVOT: [-78, -22],   // lever pivot
  ROD: 46,             // push-rod length, tip to tail
  GUIDE: [-46, -40],   // rod guide block, x range
  CART: [-63, -28],    // supply cart centre y: at the bin, at the block
  CART_HELD: -42,      // furthest the cart may stand while the ring is up
};

const SC_RAD = Math.PI / 180;
const smooth01 = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

// Everything that moves, from the four engagement levels (0..1) plus the cart and ring.
export function pose(S) {
  const platen = GEO.PLATEN_UP - (GEO.PLATEN_UP - GEO.TABLE - GEO.H_CRUSH) * S.d;
  const h = Math.min(GEO.H, platen - GEO.TABLE);
  const bx = GEO.SLIDE * S.l;
  const face = bx + GEO.HALF_W;
  const [r] = GEO.BLADE;
  const sawIn = face + 0.6 - 3 + r;          // blade bites 3 units: through the link and into the seam
  const sawX = GEO.SAW_REST + (sawIn - GEO.SAW_REST) * smooth01(S.s / 0.8);
  const g = 1 + 7 * smooth01((S.s - 0.8) / 0.2); // the halves part only once the link is cut
  const ring = GEO.RING_REST + (GEO.RING_UP - GEO.RING_REST) * S.ring;
  return { platen, h, bx, face, sawX, g, ring, cut: S.s > 0.78 };
}

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  const Q = pose(S);
  const T = GEO.TABLE;

  // ---- clamp ring: twelve segments in a groove round the seat, sorted one by one ----
  {
    const [cx, cy, r0, r1] = GEO.RING;
    for (let i = 0; i < 12; i++) {
      const a0 = i * 30 + 0.6, a1 = (i + 1) * 30 - 0.6;
      const pts = [];
      for (let a = a0; a <= a1 + 1e-9; a += (a1 - a0) / 8) pts.push([cx + r1 * Math.cos(a * SC_RAD), cy + r1 * Math.sin(a * SC_RAD)]);
      for (let a = a1; a >= a0 - 1e-9; a -= (a1 - a0) / 8) pts.push([cx + r0 * Math.cos(a * SC_RAD), cy + r0 * Math.sin(a * SC_RAD)]);
      const am = (a0 + a1) / 2 * SC_RAD;
      const mx = cx + (r0 + r1) / 2 * Math.cos(am), my = cy + (r0 + r1) / 2 * Math.sin(am);
      let svg = solid(K.extrude(pts, 0, Q.ring, P, { convex: false, bevel: Q.ring > 1 ? 0.3 : 0 }), { tone: S.ring > 0.5 ? "hi" : "mid", crease: "lo" });
      if (Q.ring > 1) svg += dots([[mx, my, Q.ring]]);
      put(depth(mx, my), svg);
    }
  }

  // ---- the target: two halves on the slide table, joined by a link plate on the end face ----
  const half = (sign) => {
    const y0 = sign > 0 ? Q.g / 2 : -Q.g / 2 - GEO.HALF_D;
    const plan = { x: Q.bx - GEO.HALF_W, y: y0, w: 2 * GEO.HALF_W, d: GEO.HALF_D, r: 1.2 };
    const top = T + Q.h;
    let svg = `<path class="iso-halo" d="${K.slabOf(plan, T, 0.1, P, 4).fill}" style="filter:blur(2px)"/>`;
    svg += solid(K.slabOf(plan, T, Q.h, P, 4, 0.6), { tone: "hi", lit: true, crease: "lo", inner: line(K.sideSeam(plan, T + 3, P, 4), { tone: "faint" }) });
    svg += line(K.planOutline(K.insetPlan(plan, 2.4), top, P, 4), { tone: "faint" });
    svg += dots(K.corners(plan, 1.4).map(([x, y]) => [x, y, top]), 0.45);
    // the link plate half on this half's end face
    const z0 = T + 0.25 * Q.h, z1 = T + 0.75 * Q.h;
    const ly0 = sign > 0 ? (Q.g - 1) / 2 : -(Q.g - 1) / 2 - 6;
    const link = { x: Q.face, y: ly0, w: 0.6, d: 6, r: 0.1 };
    svg += solid(K.slabOf(link, z0, z1 - z0, P, 2), { tone: "mid", crease: "none" });
    const by = sign > 0 ? ly0 + 3.6 : ly0 + 2.4;
    svg += dots([[Q.face + 0.6, by, z0 + 0.3 * (z1 - z0)], [Q.face + 0.6, by, z0 + 0.7 * (z1 - z0)]], 0.4);
    return { key: depth(Q.bx, y0 + GEO.HALF_D / 2, T), svg };
  };
  const A = half(1), B = half(-1);
  put(B.key, B.svg);
  put(A.key, A.svg);

  // ---- the saw: blade in the seam plane, arbor, arm, carriage and motor on rails ----
  {
    const [r, cz] = GEO.BLADE;
    const bxp = Q.sawX;
    const teeth = [];
    const n = 36;
    for (let i = 0; i < n * 2; i++) {
      const t = (i / (n * 2)) * 2 * Math.PI + (S.spin || 0);
      const rr = i % 2 ? r : r - 0.7;
      teeth.push(at([bxp + rr * Math.cos(t), 0, cz + rr * Math.sin(t)]));
    }
    const circ = (rad, y = 0, steps = 40) => { const out = []; for (let i = 0; i < steps; i++) { const t = (i / steps) * 2 * Math.PI; out.push(at([bxp + rad * Math.cos(t), y, cz + rad * Math.sin(t)])); } return out; };
    const toothD = K.pathOf(teeth, true);
    let blade = `<g class="iso-solid"><path class="iso-fill" d="${toothD}"/><path class="iso-shade" data-shade="2" d="${toothD}"/>` +
      `<path class="iso-line iso-edge" data-tone="${S.s > 0.5 ? "hi" : "mid"}" d="${toothD}"/></g>`;
    blade += line(K.pathOf(circ(r - 1.6), true), { tone: "faint" });
    // arbor: hull of its two end circles, from the blade face to the arm
    const hull = (pts) => {
      const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo = [], hi = [];
      for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
      for (const q of p.reverse()) { while (hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
      return lo.slice(0, -1).concat(hi.slice(0, -1));
    };
    const arbor = K.pathOf(hull([...circ(1.5, 0.4, 24), ...circ(1.5, 2, 24)]), true);
    blade += `<g class="iso-solid"><path class="iso-fill" d="${arbor}"/><path class="iso-shade" data-shade="1" d="${arbor}"/><path class="iso-line iso-edge" data-tone="mid" d="${arbor}"/></g>`;
    blade += line(K.pathOf(circ(1.5, 0.4, 24), true), { tone: "lo" });
    // the blade sits in the seam: after the far half, before the near half
    put(Math.min(depth(bxp, 0, cz), A.key - 0.05), blade);

    const cx = bxp + GEO.ARM;
    const arm = { x: bxp - 1.5, y: 2, w: cx - 7 - (bxp - 1.5), d: 3, r: 0.6 };
    const armSvg = solid(K.slabOf(arm, cz - 1.75, 3.5, P, 2, 0.3), { tone: "mid" }) +
      dots([[bxp, 3.5, cz + 1.75], [cx - 10, 3.5, cz + 1.75]], 0.42);
    const platenKey = Math.max(A.key, depth(GEO.RING[0], 0, T)) + 1;
    put(arm.x < 31 ? Math.min(depth(arm.x + arm.w / 2, 3.5), platenKey - 0.3) : depth(arm.x + arm.w / 2, 3.5), armSvg);

    const body = { x: cx - 8, y: -6, w: 16, d: 19, r: 1.5 };
    let car = `<path class="iso-halo" d="${K.slabOf(body, 2, 0.1, P, 3).fill}" style="filter:blur(2px)"/>`;
    car += solid(K.slabOf(body, 2, 5, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(body, 4.5, P, 3), { tone: "faint" }) });
    car += dots(K.corners(body, 1.6).map(([x, y]) => [x, y, 7]), 0.42);
    const tower = { x: cx - 7, y: 0.5, w: 8, d: 7, r: 0.8 };
    car += solid(K.slabOf(tower, 7, 8, P, 2, 0.4), { tone: "mid" });
    car += line(K.planOutline(K.insetPlan(tower, 1.4), 15, P, 2), { tone: "faint" });
    put(depth(cx - 3, 4), car);
    const mx = cx + 3.6, my = 7.6;
    put(depth(mx, my) + 0.1,
      solid(K.cylinder(mx, my, 3.8, 7, 9, P, 28, 0.4), { tone: "mid", inner: line(K.sideArc(mx, my, 3.8, 9, P, 24), { tone: "faint" }) }) +
      line(K.knurl(mx, my, 3.8, 9, 16, 22, P, 0.3), { tone: "lo" }) +
      solid(K.cylinder(mx, my, 2.2, 16, 1.4, P, 20), { tone: "mid" }));
  }

  // ---- crusher: two posts, sliding platen, screw, crosshead and handwheel ----
  {
    const X = 7, Y = GEO.POSTS;
    const platenKey = Math.max(A.key, depth(GEO.RING[0], 0, T)) + 1;
    for (const sy of [-Y, Y]) {
      let svg = solid(K.cylinder(X, sy, 5.2, 0, 3, P, 28, 0.5), { tone: "mid" });
      svg += dots(K.corners({ x: X - 4, y: sy - 4, w: 8, d: 8, r: 0 }, 0.9).map(([x, y]) => [x, y, 3]), 0.38);
      svg += solid(K.cylinder(X, sy, 3, 3, GEO.CROSS - 3, P, 28), { tone: "mid", crease: "none" });
      svg += solid(K.cylinder(X, sy, 4.4, Q.platen - 1.5, 7, P, 28, 0.4), { tone: "mid", inner: line(K.sideArc(X, sy, 4.4, Q.platen + 2, P, 24), { tone: "faint" }) });
      put(depth(X, sy) + (sy > 0 ? 0 : 0), svg);
    }
    // the platen is a press bar on two yokes that slide on the posts
    const plan = { x: -6, y: -20, w: 26, d: 40, r: 2 };
    let pl = "";
    for (const sy of [-1, 1]) {
      const yoke = { x: X - 3, y: sy > 0 ? 19 : -37, w: 6, d: 18, r: 0.8 };
      pl += solid(K.slabOf(yoke, Q.platen + 0.6, 2.8, P, 2, 0.3), { tone: "mid" });
    }
    pl += solid(K.slabOf(plan, Q.platen, 4, P, 4, 0.6), { tone: S.d > 0.5 ? "hi" : "mid", crease: "lo", inner: line(K.sideSeam(plan, Q.platen + 1.2, P, 4), { tone: "faint" }) });
    pl += line(K.planOutline(K.insetPlan(plan, 3), Q.platen + 4, P, 4), { tone: "faint" });
    pl += dots(K.corners(plan, 1.6).map(([x, y]) => [x, y, Q.platen + 4]), 0.45);
    put(platenKey, pl);
    const top = Q.platen + 4;
    put(platenKey + 0.1,
      solid(K.cylinder(X, 0, 4.2, top, 2.2, P, 24, 0.4), { tone: "mid" }) +
      solid(K.cylinder(X, 0, 2.2, top + 2.2, GEO.CROSS - top - 2.2, P, 20), { tone: "mid", crease: "none" }) +
      line(Array.from({ length: Math.max(0, Math.floor((GEO.CROSS - top - 4) / 2.2)) }, (_, i) => K.sideArc(X, 0, 2.2, top + 3.4 + i * 2.2, P, 12)).join(""), { tone: "lo" }));
    const cross = { x: X - 6, y: -Y - 5, w: 12, d: 2 * Y + 10, r: 2 };
    const nearPost = depth(X, Y);
    let ch = solid(K.slabOf(cross, GEO.CROSS, 6, P, 4, 0.6), { tone: "mid", inner: line(K.sideSeam(cross, GEO.CROSS + 3, P, 4), { tone: "faint" }) });
    ch += dots([[X, -Y, GEO.CROSS + 6], [X, Y, GEO.CROSS + 6], [X - 3, -Y + 6, GEO.CROSS + 6], [X - 3, Y - 6, GEO.CROSS + 6]], 0.45);
    // handwheel turns with the screw
    const z6 = GEO.CROSS + 6;
    ch += solid(K.cylinder(X, 0, 3.2, z6, 2, P, 20), { tone: "mid" });
    ch += solid(K.cylinder(X, 0, 10, z6 + 2, 1.8, P, 56, 0.4), { tone: "mid" });
    ch += line(K.knurl(X, 0, 10, z6 + 2, z6 + 3.8, 60, P, 0.3), { tone: "lo" });
    const ang = -S.d * 540 * SC_RAD + 0.6;
    const spokes = [0, 1, 2].map((i) => K.lineOnTop([X + 3.2 * Math.cos(ang + i * 2.094), 3.2 * Math.sin(ang + i * 2.094)], [X + 9.6 * Math.cos(ang + i * 2.094), 9.6 * Math.sin(ang + i * 2.094)], z6 + 3.8, P)).join("");
    ch += line(spokes, { tone: "lo" });
    ch += line(K.ring(X, 0, 3.2, z6 + 3.8, P, 20), { tone: "lo" }) + line(K.ring(X, 0, 9.6, z6 + 3.8, P, 48), { tone: "faint" });
    const hx = X + 7.4 * Math.cos(ang), hy = 7.4 * Math.sin(ang);
    ch += solid(K.cylinder(hx, hy, 1.4, z6 + 3.8, 6, P, 16), { tone: "mid" }) + line(K.knurl(hx, hy, 1.4, z6 + 3.8, z6 + 9.8, 10, P), { tone: "lo" });
    put(nearPost + 1, ch);
  }

  // ---- dislocation: guide block, push rod and pad, lever on its pivot ----
  {
    const tip = Q.bx - GEO.HALF_W - 0.3;
    const tail = tip - GEO.ROD;
    const [g0, g1] = GEO.GUIDE;
    const rodAt = (x0, x1) => solid(K.slabOf({ x: x0, y: -1.5, w: x1 - x0, d: 3, r: 1.2 }, 10, 3, P, 3), { tone: "mid", crease: "none" });
    put(depth((g0 + g1) / 2, 0) - 0.5, rodAt(tail, g0 + 0.5));
    const guide = { x: g0, y: -6, w: g1 - g0, d: 12, r: 1 };
    put(depth((g0 + g1) / 2, 0),
      `<path class="iso-halo" d="${K.slabOf(guide, 0, 0.1, P, 2).fill}" style="filter:blur(2px)"/>` +
      solid(K.slabOf(guide, 0, 15, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(guide, 4, P, 3), { tone: "faint" }) }) +
      dots([[g0 + 1.6, -4.4, 15], [g1 - 1.6, 4.4, 15], [g0 + 1.6, 4.4, 15], [g1 - 1.6, -4.4, 15]], 0.4));
    put(depth((g1 + tip) / 2, 0), rodAt(g1 - 0.5, tip - 2.5));
    const pad = { x: tip - 2.5, y: -8, w: 2.5, d: 16, r: 0.6 };
    put(depth(tip - 1.2, 0), solid(K.slabOf(pad, 7, 7, P, 2, 0.4), { tone: S.l > 0.5 ? "hi" : "mid", crease: "lo" }) +
      dots([[tip - 1.2, -6, 14], [tip - 1.2, 6, 14]], 0.4));
    // lever: pivots at PIVOT, its slot rides the pin on the rod tail
    const [px, py] = GEO.PIVOT;
    const pin = [tail + 2, 0];
    const phi = Math.atan2(pin[1] - py, pin[0] - px);
    const c = Math.cos(phi), s = Math.sin(phi);
    const F = (u, v) => [px + u * c - v * s, py + u * s + v * c];
    const len = 50;
    const leverKey = depth(-22, 10);
    put(depth(px, py),
      `<path class="iso-halo" d="${K.cylinder(px, py, 6, 0, 0.1, P, 28).fill}" style="filter:blur(2px)"/>` +
      solid(K.cylinder(px, py, 6, 0, 3, P, 28, 0.5), { tone: "mid" }) +
      solid(K.cylinder(px, py, 3.6, 3, 13, P, 24), { tone: "mid", crease: "none", inner: line(K.sideArc(px, py, 3.6, 9, P, 16), { tone: "faint" }) }));
    put(leverKey - 0.2, solid(K.cylinder(pin[0], pin[1], 1.2, 13, 3, P, 14), { tone: "mid" }));
    const bar = [F(-4.5, -2.2), F(len, -2.2), F(len, 2.2), F(-4.5, 2.2)];
    const dist = Math.hypot(pin[0] - px, pin[1] - py);
    const slot = [];
    for (let a = 90; a <= 270; a += 15) slot.push(F(dist - 9 + 1.3 * Math.cos(a * SC_RAD), 1.3 * Math.sin(a * SC_RAD)));
    for (let a = -90; a <= 90; a += 15) slot.push(F(dist + 9 + 1.3 * Math.cos(a * SC_RAD), 1.3 * Math.sin(a * SC_RAD)));
    const [ex, ey] = F(len - 3, 0);
    put(leverKey,
      solid(K.extrude(bar, 16, 2, P, { bevel: 0.3 }), { tone: S.l > 0.5 ? "hi" : "mid", crease: "lo" }) +
      line(K.onTop(slot, 18, P, true), { tone: "lo" }) +
      solid(K.cylinder(px, py, 2.6, 18, 1.4, P, 18), { tone: "mid" }) + dots([[px, py, 19.4]], 0.45) +
      solid(K.cylinder(ex, ey, 2.2, 18, 6, P, 18), { tone: "mid" }) + line(K.knurl(ex, ey, 2.2, 18, 24, 14, P), { tone: "lo" }));
  }

  // ---- supply cart on its track ----
  {
    const y = S.cart;
    const plan = { x: -6, y: y - 5, w: 12, d: 10, r: 1.2 };
    let svg = `<path class="iso-halo" d="${K.slabOf(plan, 1.5, 0.1, P, 3).fill}" style="filter:blur(2px)"/>`;
    for (const [wx, wy] of [[-4, y - 3.4], [4, y - 3.4], [-4, y + 3.4], [4, y + 3.4]].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]))) {
      svg += solid(K.slabOf({ x: wx - 1, y: wy - 1.6, w: 2, d: 3.2, r: 0.8 }, 1.5, 1.6, P, 2), { tone: "lo" });
    }
    svg += solid(K.slabOf(plan, 3.1, 2.4, P, 3, 0.4), { tone: "mid" });
    const crate = { x: -4.4, y: y - 3.6, w: 8.8, d: 7.2, r: 0.4 };
    svg += solid(K.slabOf(crate, 5.5, 5, P, 2, 0.3), { tone: "mid", inner: line(K.sideSeam(crate, 8, P, 2), { tone: "faint" }) });
    svg += line(K.planOutline(K.insetPlan(crate, 1.2), 10.5, P, 2), { tone: "faint" });
    put(depth(0, y) + 3, svg);
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The dial needle for a capability share f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
