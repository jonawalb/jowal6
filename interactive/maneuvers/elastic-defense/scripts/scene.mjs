// The moving half of the Machine view: the ram carriage (with its outrigger roller) and
// its drive spring, the three plates and their springs (or the plates bolted into one
// wall, and its shards), the fixed rear stop, and the flank carriage with its wedge
// blade, spring and latch, which strikes from the side. Rebuilt per frame.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code. build.mjs inlines this file with `export` stripped.
// It draws from a view state V that the caller derives from model.mjs; it holds no
// rules of its own, so another view can reuse the model without this file.

export const GEO = {
  X0: 64,        // bench x of the outpost line (depth 0); the attack runs toward -x
  S: 40,         // bench units per notional km
  TP: 3,         // plate thickness
  LAUNCH: 134,   // launcher face, where the drive spring is anchored
  HEIGHTS: [24, 32, 32], // plate tops: the outpost plate is lighter
  FREE2: 47,     // free length of the last spring, which rides on the rear stop
  // flank carriage (bench coordinates with the carriage latched; it slides toward +y)
  RX: 22,        // the ram's roller sits this far behind the ram's nose
  RY: -46,       // the roller's line, on the far side of the rails
  RR: 2.2,       // roller radius
  TRAVEL: 22,    // flank carriage stroke (y); its wedge face runs 1 in y per 2 in x
  STOW: 5,       // how far further out the carriage is stowed in the rigid run (clear of the roller)
  FACE: [[11, -46], [63, -72]], // the wedge blade's face, inner tip to outer end
  ANCHOR_Y: -102, // flank anchor block face, where the flank spring bears
  LATCH: [66, -79], // latch pin
};

const SC_RAD = Math.PI / 180;

export function scene(K, P, V) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, z, size = 0.42) => K.dotsSvg(pts.map(([x, y]) => at([x, y, z])), { size });
  const X = (d) => GEO.X0 - d * GEO.S;
  const slab = (x0, x1, y0, y1, z, h, r = 0.6, bevel = 0) =>
    K.slabOf({ x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), d: Math.abs(y1 - y0), r }, z, h, P, 3, bevel);
  const halo = (x0, x1, y0, y1, z) =>
    `<path class="iso-halo" d="${slab(x0 - 1, x1 + 1, y0 - 1, y1 + 1, z, 0.1, 1).fill}" style="filter:blur(3px)"/>`;
  // a pair of spring cups and a coil between two x faces, at side y
  const spring = (xa, xb, y, z, r, turns, tone = "mid") => {
    const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
    const cup = (x0) => solid(slab(x0, x0 + 1, y - r - 0.6, y + r + 0.6, z - r - 0.6, 2 * r + 1.2, 0.4), { tone: "mid", crease: "none" });
    if (hi - lo <= 2.6) return cup(hi - 1) + cup(lo);
    const c = K.coil(lo + 1, hi - 1, [y, z], r, turns, "x", P);
    return cup(hi - 1) + line(c.back, { tone: "lo" }) + line(c.front, { tone }) + cup(lo);
  };
  // a weld dot where a coil's wire meets its seat, at the first point of a path
  const weld = (d) => { const m = /M\s*([-\d.]+)[ ,]([-\d.]+)/.exec(d); return m ? K.dotsSvg([[+m[1], +m[2]]], { size: 0.5 }) : ""; };
  // the corridor between the rails is ordered by x (plates span its width); y only breaks ties
  const lane = (x, y = 0) => depth(x, 0) + 0.01 * y;

  // ---- the ram carriage (the attack) and its drive spring ----
  {
    const n = X(V.d);
    let car = halo(n + 6, n + 30, -15, 15, 3);
    const shoes = [];
    for (const sx of [n + 8, n + 20]) for (const sy of [-14, 10]) shoes.push([sx, sy]);
    const shoe = ([sx, sy]) => solid(slab(sx, sx + 6, sy, sy + 4, 3, 1.6, 0.4), { tone: "mid" });
    // the roller on the far outrigger, which the flank carriage's wedge bears on
    const rx = n + GEO.RX, ry = GEO.RY;
    car += solid(K.cylinder(rx, ry, GEO.RR, 5, 4.4, P, 22), { tone: "mid" }) + line(K.knurl(rx, ry, GEO.RR, 5.4, 9, 16, P), { tone: "faint" });
    shoes.filter(([, sy]) => sy < 0).forEach((s) => (car += shoe(s)));
    const base = { x: n + 6, y: -15, w: 24, d: 30, r: 1.6 };
    car += solid(K.slabOf(base, 4.6, 4, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(base, 6.4, P, 3), { tone: "faint" }) });
    shoes.filter(([, sy]) => sy > 0).forEach((s) => (car += shoe(s)));
    car += dots([[n + 8, -13], [n + 28, -13], [n + 8, 13], [n + 28, 13]], 8.6);
    car += solid(slab(rx - 3.5, rx + 3.5, -16, -9, 8.6, 1.6, 0.6, 0.3), { tone: "mid" });
    car += solid(slab(rx - 1.5, rx + 1.5, ry, -10, 9.4, 1.8, 0.6, 0.3), { tone: "mid" });
    car += solid(K.cylinder(rx, ry, 1.1, 11.2, 0.8, P, 14), { tone: "mid", crease: "none" });
    car += dots([[rx - 2.2, -12.5], [rx + 2.2, -12.5]], 10.2, 0.4);
    // back plate where the drive spring bears
    car += solid(slab(n + 30, n + 31.4, -7.5, 7.5, 6, 14, 0.4), { tone: "mid" });
    // ram housing with its cap screws and a knurled bleed knob
    const hous = { x: n + 10, y: -7, w: 15, d: 14, r: 1.4 };
    car += solid(K.slabOf(hous, 8.6, 11.4, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(hous, 14.5, P, 3), { tone: "faint" }) });
    car += dots([[n + 11.8, -5.2], [n + 23.2, -5.2], [n + 11.8, 5.2], [n + 23.2, 5.2]], 20);
    car += solid(K.cylinder(n + 17.5, 0, 2.8, 20, 2.6, P, 20), { tone: "mid" }) + line(K.knurl(n + 17.5, 0, 2.8, 20, 22.6, 18, P), { tone: "lo" });
    // ram rod and the lit head
    car += solid(slab(n + 4.2, n + 10, -2, 2, 15.5, 4, 0.8), { tone: "mid", crease: "none" });
    car += solid(slab(n, n + 4.6, -8, 8, 10, 15, 0.6, 0.3), { tone: "hi", lit: true, crease: "lo" });
    car += line(K.lineOnTop([n + 0.4, 0], [n + 4.2, 0], 25, P), { tone: "lit" });
    car += dots([[n + 2.3, -6], [n + 2.3, 6]], 25);
    put(lane(n + 18), car);

    const from = n + 31.4, to = GEO.LAUNCH - 1;
    if (to - from > 2) {
      const c = K.coil(from, to, [0, 13], 5, 12, "x", P);
      put(lane((from + to) / 2), line(c.back, { tone: "lo" }) + line(c.front, { tone: "mid" }));
    }
  }

  // ---- the plates ----
  const faces = V.pl.map(X);
  const plateSvg = (i, x, y0, y1) => {
    const top = GEO.HEIGHTS[i];
    const pl = { x: x - GEO.TP, y: y0, w: GEO.TP, d: y1 - y0, r: 0.5 };
    return solid(K.slabOf({ x: x - GEO.TP - 2.5, y: y0 + 3, w: GEO.TP + 5, d: y1 - y0 - 6, r: 0.8 }, 3, 3, P, 3, 0.3), { tone: "mid" }) +
      solid(K.slabOf(pl, 6, top - 6, P, 2, 0.3), { tone: "hi", crease: "lo", inner: line(K.sideSeam(pl, top - 3, P, 2), { tone: "faint" }) }) +
      dots([[x - GEO.TP / 2, y0 + 2], [x - GEO.TP / 2, y1 - 2]], top, 0.4);
  };
  if (!V.broken) {
    faces.forEach((x, i) => {
      put(lane(x - 1.5) - 0.5, halo(x - GEO.TP - 2.5, x + 2.5, -17, 17, 3) + plateSvg(i, x, -20, 20));
    });
    // springs between plates, far coil first
    for (let i = 0; i < 2; i++) {
      const a = faces[i] - GEO.TP, b = faces[i + 1];
      for (const y of [-9, 9]) put(lane((a + b) / 2, y), spring(a, b, y, 17, 3.2, 6));
    }
  } else {
    // shards: each plate breaks into two halves that slide off the rails and drop
    const s = V.shard;
    faces.forEach((x, i) => {
      for (const h of [-1, 1]) {
        const ang = h * (12 + 7 * i) * s;
        const dy = h * (14 + 5 * i) * s, dx = -(1 + 2.5 * i) * s, dz = -3 * s * s;
        const px = x - GEO.TP / 2, py = h * 10;
        const c = Math.cos(ang * SC_RAD), sn = Math.sin(ang * SC_RAD);
        const T = ([u, v]) => { const ux = u - px, vy = v - py; return [px + ux * c - vy * sn + dx, py + ux * sn + vy * c + dy]; };
        const box = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(T);
        const y0 = h < 0 ? -20 : 0.6, y1 = h < 0 ? -0.6 : 20;
        const top = GEO.HEIGHTS[i];
        const sled = K.extrude(box(x - GEO.TP - 2.5, x + 2.5, h < 0 ? -17 : 0.6, h < 0 ? -0.6 : 17), 3 + dz, 3, P, { bevel: 0.3 });
        const face = K.extrude(box(x - GEO.TP, x, y0, y1), 6 + dz, top - 6, P, { bevel: 0.3 });
        const [cx, cy] = T([px, py]);
        const scr = [T([px, h < 0 ? -18 : 18])];
        put(depth(cx, cy) - 0.5 + i * 0.01,
          `<path class="iso-halo" d="${K.extrude(box(x - GEO.TP - 3.5, x + 3.5, h < 0 ? -18 : 0, h < 0 ? 0 : 18), 0, 0.1, P).fill}" style="filter:blur(3px)"/>` +
          solid(sled, { tone: "mid" }) + solid(face, { tone: "hi", crease: "lo" }) + dots(scr, top + dz, 0.4));
      }
    });
  }

  // ---- the rear stop: bolted to the bench; the last plate spring rides on it ----
  {
    const f = X(3.0);
    let blk = halo(f - 18, f + 1, -16, 16, 3);
    const base = { x: f - 18, y: -16, w: 19, d: 32, r: 1.6 };
    blk += solid(K.slabOf(base, 0, 8.6, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(base, 3, P, 3), { tone: "faint" }) });
    blk += dots([[f - 16, -14], [f - 16, 14], [f - 6.5, -14], [f - 6.5, 14]], 8.6, 0.5);
    const top = { x: f - 15, y: -12, w: 9, d: 24, r: 1.2 };
    blk += solid(K.slabOf(top, 8.6, 9, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(top, 13, P, 3), { tone: "faint" }) });
    blk += dots([[f - 13.4, -10.4], [f - 7.6, -10.4], [f - 13.4, 10.4], [f - 7.6, 10.4]], 17.6);
    // the thrust plate the stack bears on
    const tp = { x: f - 4, y: -15, w: 4, d: 30, r: 0.6 };
    blk += solid(K.slabOf(tp, 8.6, 15.4, P, 2, 0.3), { tone: "mid", inner: line(K.sideSeam(tp, 21, P, 2), { tone: "faint" }) });
    blk += dots([[f - 2, -13], [f - 2, 13]], 24, 0.4);
    put(lane(f - 8), blk);
    // the last plate spring, with a pad at its free end; in the rigid run the ram, past the
    // broken wall, closes it against the stop
    const back = V.broken ? X(V.d) : faces[2] - GEO.TP;
    const end = Math.min(back, f + GEO.FREE2);
    for (const y of [-9, 9]) put(lane((f + end) / 2, y), spring(f, end, y, 17, 3.2, 7));
  }

  // ---- the flank carriage: a wedge blade on cross rails, driven in from the side by a heavy
  // spring once its latch lifts. Its face meets the ram's roller and throws the ram back. ----
  {
    const oy = V.c * GEO.TRAVEL - GEO.STOW * (V.stow || 0);
    const Q = ([x, y]) => [x, y + oy];
    const [f0, f1] = GEO.FACE;
    const nx = 0.447, ny = 0.894; // unit normal of the face, toward the roller
    const th = 2.6;
    const blade = [f0, f1, [f1[0] - nx * th, f1[1] - ny * th], [f0[0] - nx * th, f0[1] - ny * th]].map(Q);
    const baseRing = [[f0[0], f0[1]], [f1[0], f1[1]], [f1[0], -84], [f0[0], -84]].map(Q);
    let car = `<path class="iso-halo" d="${K.extrude(baseRing.map(([x, y], i) => [x + (i === 1 || i === 2 ? 1 : -1), y + (i < 2 ? 1 : -1)]), 0, 0.1, P).fill}" style="filter:blur(3px)"/>`;
    // shoes on the cross rails, far side first
    for (const sx of [18, 52]) car += solid(slab(sx - 1, sx + 5, -83 + oy, -78 + oy, 1.4, 1.6, 0.4), { tone: "mid" });
    car += solid(K.extrude(baseRing, 3, 3.5, P, { bevel: 0.4 }), { tone: "mid" });
    // latch lug on the right flank, with two pin holes (latched, stowed)
    car += solid(slab(63, 69, -84 + oy, -72 + oy, 3, 4.6, 0.6), { tone: "mid" });
    car += line(K.ring(GEO.LATCH[0], GEO.LATCH[1] + oy, 1.4, 7.6, P, 14) + K.ring(GEO.LATCH[0], GEO.LATCH[1] + GEO.STOW + oy, 1.4, 7.6, P, 14), { tone: "lo" });
    // body block and the thrust plate the flank spring bears on
    const blk = { x: 24, y: -82 + oy, w: 22, d: 12, r: 1.2 };
    car += solid(K.slabOf({ x: 31, y: -84 + oy, w: 14, d: 1.4, r: 0.3 }, 6.5, 13, P, 2, 0.3), { tone: "mid", crease: "none" });
    car += solid(K.slabOf(blk, 6.5, 8, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(blk, 10.5, P, 3), { tone: "faint" }) });
    car += dots([[26, -80 + oy], [44, -80 + oy], [26, -72 + oy], [44, -72 + oy]], 14.5);
    // the hardened wedge blade along the face, with its screws
    car += solid(K.extrude(blade, 6.5, 4.5, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" });
    car += dots([0.2, 0.5, 0.8].map((t) => Q([f0[0] + (f1[0] - f0[0]) * t - nx * th / 2, f0[1] + (f1[1] - f0[1]) * t - ny * th / 2])), 11);
    put(depth(38, -66 + oy), car);

    // the flank spring, from the anchor block to the carriage's thrust plate
    const a = GEO.ANCHOR_Y + 1.4, b = -84 + oy - 0.2;
    const c = K.coil(a, b, [38, 13], 6, 7, "y", P);
    put(depth(38, (a + b) / 2) - 0.2, line(c.back, { tone: "lo" }) + line(c.front, { tone: "mid" }) + weld(c.front));

    // latch: bracket on the bench, an arm over the lug, a pin that lifts to release
    const [L, Ly] = GEO.LATCH, lift = 6 * V.release;
    let latch = solid(slab(73, 79, Ly - 3, Ly + 3, 0, 15, 0.8, 0.4), { tone: "mid" });
    latch += dots([[76, Ly - 1.6], [76, Ly + 1.6]], 15);
    latch += solid(K.cylinder(L, Ly, 1.1, 7.6 + lift, 4.4, P, 14), { tone: "mid", crease: "none" });
    latch += solid(slab(L - 2.4, 73.5, Ly - 2.2, Ly + 2.2, 12, 2.6, 0.8, 0.3), { tone: "mid" });
    latch += line(K.ring(L, Ly, 1.5, 14.6, P, 14), { tone: "lo" });
    latch += solid(K.cylinder(L, Ly, 1.1, 14.6, 2 + lift, P, 14), { tone: "mid", crease: "none" });
    latch += solid(K.cylinder(L, Ly, 2.2, 16.6 + lift, 2, P, 18), { tone: "mid" }) + line(K.knurl(L, Ly, 2.2, 16.6 + lift, 18.6 + lift, 14, P), { tone: "lo" });
    put(depth(76, Ly), latch);
  }

  for (const extra of V.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// A needle on the gauge for a value v on a 0..1.6 scale, 270 degree sweep, kit tick convention.
export function needle(K, P, D, v, len = 1) {
  const f = Math.max(0, Math.min(1, v / 1.6));
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  const r = (D.r - 3.4) * len;
  return K.lineOnTop([D.x - sx * 2.6, D.y - sy * 2.6], [D.x + sx * r, D.y + sy * r], D.top + 0.2, P);
}
