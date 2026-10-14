// The moving half of the figure: the delaying force as two lit blocks side by side on a
// two-lane track (element A in the near lane, B in the far lane), each with a pawl on its
// own ratchet rack, a coupler bar that locks them together (subsequent positions) or
// swings clear (alternating positions), the dashpot arm and rod off the far block, the
// bypass lever and the enemy's pusher carriage with its ram spring. Rebuilt per frame. Written against the kit as a parameter (K) so
// build.mjs (Node) and the page (inlined kit) run the same code. build.mjs inlines
// this file with `export` stripped. It reads only the model's state (km, hours,
// 0..1 levels); the mapping from km to bench units lives here, in GEO.

export const GEO = {
  U: 4.5,            // bench units per km of ground (notional)
  XB0: 46,           // block centre at the first delay position
  PARK: 6,           // km in front of the first position where the enemy waits during a retirement
  RAIL_Z: 4.2,       // rail top
  SHOE_H: 3.8,       // shoe height
  DECK: 8,           // underside of the carriage plates
  BLOCK_HALF: 9,     // half-length of the block body; its front face is at centre + 9
  SPRING: 26,        // ram spring free length
  SQUEEZE: 9,        // ram spring compression at the displacement threshold
  RACK_Y: [21, 27],  // ratchet rack, y range
  RACK_TOP: 4,       // rack bar top
  TOOTH_TOP: 9,      // tooth top
  RACK2_Y: [-27, -21], // the far rack (the far block's pawl), y range
  NEAR: [2, 11],     // near block body, y range (element A)
  FAR: [-11, -2],    // far block body, y range (element B)
  ROD_Y: -36,        // dashpot axis, y
  ROD_Z: 15,         // dashpot axis, z (clear of the far rack's teeth)
  CYL: [62, 172],    // dashpot cylinder, x range (gland face to end cap)
  ARM_DX: 10,        // dashpot arm, x offset from the block centre
};

// Block centre for a given km of ground given.
export const blockX = (g) => GEO.XB0 - GEO.U * g;
// The catching (front) face of the ratchet tooth at a delay position.
export const toothFace = (g) => blockX(g) - 1.4;

// A convex profile in the x–z plane, extruded along y from y0 to y1: the ratchet teeth.
// Returns the same path set the kit's extrude does, so solidSvg can draw it.
export function prismY(K, P, profile, y0, y1) {
  const n = profile.length;
  const pts0 = profile.map(([x, z]) => [x, y0, z]);
  const pts1 = profile.map(([x, z]) => [x, y1, z]);
  const seen = (nv) => K.depthOf(nv, P) > 1e-9;
  const cx = profile.reduce((s, p) => s + p[0], 0) / n, cz = profile.reduce((s, p) => s + p[1], 0) / n;
  const { sinA, cosA } = K.cameraOf(P);
  const light = (nx, ny) => Math.min(3, Math.max(0, Math.floor(((nx * -sinA + ny * cosA + 1) / 2) * 4)));
  const shades = [[], [], [], []];
  const tops = [];
  const sides = [];
  for (let i = 0; i < n; i++) {
    const [ax, az] = profile[i], [bx, bz] = profile[(i + 1) % n];
    let nx = bz - az, nz = -(bx - ax);
    if (nx * ((ax + bx) / 2 - cx) + nz * ((az + bz) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    const len = Math.hypot(nx, nz) || 1;
    nx /= len; nz /= len;
    const vis = seen([nx, 0, nz]);
    sides.push(vis);
    if (!vis) continue;
    const quad = K.pathOf([pts0[i], pts0[(i + 1) % n], pts1[(i + 1) % n], pts1[i]].map((p) => K.iso(p, P)), true);
    if (nz > 0.3) tops.push(quad); else shades[light(nx, 0)].push(quad);
  }
  const capNear = seen([0, 1, 0]) ? pts1 : pts0;
  const capNy = capNear === pts1 ? 1 : -1;
  shades[light(0, capNy)].push(K.pathOf(capNear.map((p) => K.iso(p, P)), true));
  const flat = [...pts0, ...pts1].map((p) => K.iso(p, P));
  const hull = hullOf(flat);
  const crease = [];
  for (let i = 0; i < n; i++) {
    if (sides[i]) crease.push(K.pathOf([K.iso(capNear[i], P), K.iso(capNear[(i + 1) % n], P)]));
    if (sides[i] && sides[(i + n - 1) % n]) crease.push(K.pathOf([K.iso(pts0[i], P), K.iso(pts1[i], P)]));
  }
  return { fill: K.pathOf(hull, true), outline: K.pathOf(hull, true), crease: crease.join(""), top: tops.join(""), shades: shades.map((s) => s.join("")) };
}

function hullOf(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// Height of the rack surface under the span [x0, x1], for the teeth at the given positions.
export function rackUnder(x0, x1, positions) {
  let h = GEO.RACK_TOP;
  for (const g of positions) {
    const xv = toothFace(g);
    const prof = (x) => (x > xv || x < xv - 8 ? GEO.RACK_TOP : x >= xv - 1.5 ? GEO.TOOTH_TOP : GEO.RACK_TOP + (GEO.TOOTH_TOP - GEO.RACK_TOP) * (x - (xv - 8)) / 6.5);
    for (let k = 0; k <= 6; k++) h = Math.max(h, prof(x0 + (x1 - x0) * k / 6));
  }
  return h;
}

// S: { dA, dB (km each block has given), a (km, or null: no enemy in contact), pressure 0..1,
//      liftA, liftB 0..1 (pawls), couple 0..1 (coupler bar across: 1), bypass 0..1, positions,
//      far (drawn first: the far rack), cyl (the dashpot cylinder, drawn between rod and lever),
//      statics (sorted with the moving parts), mid (drawn over them: near rack), front (drawn last: clock) }
export function scene(K, P, S) {
  const G = GEO;
  const back = [], items = [], front = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  const slab = (x, y, w, d, z, h, r = 0.8, steps = 3, bevel = 0) => K.slabOf({ x, y, w, d, r }, z, h, P, steps, bevel);
  const top = G.RAIL_Z + G.SHOE_H;
  const xA = blockX(S.dA), xB = blockX(S.dB);
  const armZ = top + 6;

  const shoes = (xs, ys) => {
    const list = [];
    for (const sx of xs) for (const [sy, sd] of ys) list.push({ x: sx, y: sy, w: 7, d: sd });
    list.sort((a, b) => depth(a.x + 3.5, a.y + a.d / 2) - depth(b.x + 3.5, b.y + b.d / 2));
    return list.map((s) => solid(slab(s.x, s.y, s.w, s.d, G.RAIL_Z, G.SHOE_H, 0.6, 2, 0.3), { tone: "mid" })).join("");
  };
  // a pawl: finger riding the rack whose centre line is fy, arm back to the block's side at y = side
  const pawl = (xb, fy, side, lift) => {
    const under = rackUnder(xb - 1.2, xb + 1.2, S.positions || []);
    const z0 = Math.max(under + 0.6, G.RACK_TOP + 1 + lift * 5.4);
    const y0 = Math.min(fy - 1.5, side), y1 = Math.max(fy + 1.5, side);
    let svg = solid(slab(xb - 1.2, fy - 1.5, 2.4, 3, z0, armZ - z0 + 0.4, 0.5, 2, 0.2), { tone: "mid" });
    svg += solid(slab(xb - 1.5, y0, 3, y1 - y0, armZ, 3, 0.6, 2, 0.3), { tone: "mid" });
    svg += solid(K.cylinder(xb, fy, 1.8, armZ + 3, 2.2, P, 16), { tone: "mid" }) + line(K.knurl(xb, fy, 1.8, armZ + 3, armZ + 5.2, 12, P), { tone: "lo" });
    return svg;
  };

  back.push(S.far || "");
  // ---- the far block's pawl on the far rack (wholly behind the far block, so drawn first) ----
  back.push(pawl(xB, (G.RACK2_Y[0] + G.RACK2_Y[1]) / 2, G.FAR[0] + 1, S.liftB));

  // ---- dashpot arm and clevis off the far block's far side, then the rod from the clevis to the gland ----
  const xc = xB + G.ARM_DX;
  back.push(solid(slab(xc - 1.6, G.ROD_Y - 2.6, 3.2, G.FAR[0] + 1 - (G.ROD_Y - 2.6), G.ROD_Z - 2.2, 4.4, 0.6, 2, 0.3), { tone: "mid" }) +
    solid(slab(xc - 2.6, G.ROD_Y - 3.4, 5.2, 6.8, G.ROD_Z - 3.4, 6.8, 1.2, 3, 0.3), { tone: "mid" }) +
    dots([[xc, G.ROD_Y, G.ROD_Z + 3.4]], 0.6));
  {
    const r0 = xc + 2.6, r1 = G.CYL[0];
    if (r1 - r0 > 0.5) back.push(solid(slab(r0, G.ROD_Y - 1.3, r1 - r0, 2.6, G.ROD_Z - 1.3, 2.6, 1.1, 3), { tone: "mid", crease: "none" }));
  }

  back.push(S.cyl || "");

  // ---- bypass lever on the dashpot's gland block: along the cylinder when shut, across it when open ----
  {
    const ang = S.bypass * 90 * Math.PI / 180;
    const c = Math.cos(ang), s = Math.sin(ang);
    const px = G.CYL[0] + 9, py = G.ROD_Y, pz = G.ROD_Z + 5.4;
    const R = (u, v) => [px + u * c - v * s, py + u * s + v * c];
    const lever = [R(0, -1), R(13, -0.7), R(13, 0.7), R(0, 1)];
    let svg = solid(K.cylinder(px, py, 2.2, pz, 1.6, P, 18), { tone: "mid" });
    svg += solid(K.extrude(lever, pz + 1.6, 1.2, P, { bevel: 0.2 }), { tone: "mid", crease: "none" });
    const [kx, ky] = R(13, 0);
    svg += solid(K.cylinder(kx, ky, 1.6, pz + 1.6, 2.6, P, 16), { tone: "mid" }) + line(K.knurl(kx, ky, 1.6, pz + 1.6, pz + 4.2, 12, P), { tone: "lo" });
    svg += dots([[px, py, pz + 2.8]], 0.5);
    back.push(svg);
  }

  // ---- the coupler bar: pivot on the near block, across to a pin on the far block when coupled,
  //      swung back along the near block's top when the elements work apart ----
  const bar = (() => {
    const ang = (1 - S.couple) * Math.PI / 2;
    const px = xA + 3, py = (G.NEAR[0] + G.NEAR[1]) / 2, pz = top + 15;
    const dx = -Math.sin(ang), dy = -Math.cos(ang);
    const nx = -dy, ny = dx;
    const L = 12;
    const ring = [[px + nx * 1.1, py + ny * 1.1], [px + dx * L + nx * 0.9, py + dy * L + ny * 0.9], [px + dx * L - nx * 0.9, py + dy * L - ny * 0.9], [px - nx * 1.1, py - ny * 1.1]];
    let svg = solid(K.extrude(ring, pz, 1.1, P, { bevel: 0.2 }), { tone: "mid", crease: "none" });
    svg += solid(K.cylinder(px, py, 1.7, pz + 1.1, 1.2, P, 16), { tone: "mid" });
    svg += dots([[px, py, pz + 2.3]], 0.45);
    if (S.couple > 0.98) svg += dots([[px + dx * (L - 1.4), py + dy * (L - 1.4), pz + 1.1]], 0.5);
    return svg;
  })();

  // ---- the delaying force: two blocks, each on its own carriage in its own lane ----
  const block = (xb, Y, plateY, shoeYs, extra) => {
    let out = `<path class="iso-halo" d="${slab(xb - 11, plateY[0], 22, plateY[1] - plateY[0], G.RAIL_Z, 0.1).fill}" style="filter:blur(3px)"/>`;
    out += shoes([xb - 10, xb + 3], shoeYs);
    const plate = { x: xb - 12, y: plateY[0], w: 24, d: plateY[1] - plateY[0], r: 1.6 };
    out += solid(K.slabOf(plate, top, 4, P, 4, 0.5), { tone: "mid", inner: line(K.sideSeam(plate, top + 2, P, 4), { tone: "faint" }) });
    out += dots(K.corners(plate, 2).map(([x, y]) => [x, y, top + 4]));
    const body = { x: xb - G.BLOCK_HALF, y: Y[0], w: G.BLOCK_HALF * 2, d: Y[1] - Y[0], r: 1.2 };
    out += solid(K.slabOf(body, top + 4, 11, P, 3, 0.6), { tone: "hi", lit: true, crease: "lo" });
    out += line(K.planOutline(K.insetPlan(body, 2), top + 15, P, 3), { tone: "lit" });
    out += dots(K.corners(body, 1.2).map(([x, y]) => [x, y, top + 15]), 0.45);
    return out + (extra || "");
  };
  const kB = depth(xB, -6.5), kA = depth(xA, 6.5);
  put(kB, block(xB, G.FAR, [-15, -0.6], [[-14, 6], [-2, 1.6]]));
  if (S.couple > 0.02 && Math.abs(xA - xB) < 0.5) {
    put(kA, block(xA, G.NEAR, [0.6, 15], [[0.4, 1.6], [8, 6]]));
    put(Math.max(kA, kB) + 1e-6, bar);
  } else put(kA, block(xA, G.NEAR, [0.6, 15], [[0.4, 1.6], [8, 6]], bar));

  // ---- the enemy's pusher: pad, ram spring, carriage ----
  {
    const parked = S.a === null;
    const xa = parked ? blockX(-G.PARK) : blockX(S.a);
    const tip = xa + G.BLOCK_HALF;
    const len = G.SPRING - G.SQUEEZE * Math.min(1, S.pressure);
    const cf = tip + 3 + len;          // carriage front
    const cx = cf + 14;
    let car = `<path class="iso-halo" d="${slab(cx - 14, -15, 30, 30, G.RAIL_Z, 0.1).fill}" style="filter:blur(3px)"/>`;
    car += shoes([cx - 12, cx + 4], [[-14, 6], [6, 6]]);
    const plate = { x: cx - 14, y: -16, w: 28, d: 32, r: 2 };
    car += solid(K.slabOf(plate, top, 5, P, 4, 0.6), { tone: "mid", inner: line(K.sideSeam(plate, top + 2.5, P, 4), { tone: "faint" }) });
    car += dots([cx - 11.6, cx - 4, cx + 4, cx + 11.6].map((u) => [u, 13.6, top + 5]), 0.4);
    const box = { x: cx - 6, y: -10, w: 16, d: 20, r: 1.4 };
    car += solid(K.slabOf(box, top + 5, 9, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(box, top + 9.5, P, 3), { tone: "faint" }) });
    car += dots(K.corners(box, 1.8).map(([u, v]) => [u, v, top + 14]), 0.4);
    car += solid(K.cylinder(cx + 2, 0, 3, top + 14, 3, P, 22), { tone: "mid" }) + line(K.knurl(cx + 2, 0, 3, top + 14, top + 17, 18, P), { tone: "lo" });
    // ram bracket at the carriage front, where the spring seats
    car += solid(slab(cx - 13.5, -6, 2.4, 12, top + 5, 9, 0.6, 2, 0.3), { tone: "mid" });
    // handle at the far end
    car += solid(slab(cx + 14, -1.6, 3, 3.2, top + 0.5, 3, 0.6, 2), { tone: "mid", crease: "none" });
    car += solid(K.cylinder(cx + 19, 0, 2.6, top - 0.4, 4.8, P, 20), { tone: "mid" }) + line(K.knurl(cx + 19, 0, 2.6, top - 0.4, top + 4.4, 16, P), { tone: "lo" });
    put(depth(cx, 0), car);

    const az = top + 9.5;
    const rod0 = tip + 3, rod1 = cf - 1;
    const coil = K.coil(rod0 + 0.8, rod1, [0, az], 3, 8, "x", P);
    put(depth((rod0 + rod1) / 2, 0),
      solid(slab(rod0, -3, 0.8, 6, az - 3, 6, 0.4, 2), { tone: "mid", crease: "none" }) +
      line(coil.back, { tone: "lo" }) +
      solid(slab(rod0, -1.3, rod1 + 1 - rod0, 2.6, az - 1.3, 2.6, 1.1, 3), { tone: "mid", crease: "none" }) +
      line(coil.front, { tone: "mid" }));
    // the pad spans both lanes, so it bears on whichever block is in front
    put(depth(tip + 1.5, 0),
      solid(slab(tip, -11, 3, 22, top + 3.5, 12, 0.8, 2, 0.4), { tone: "hi", crease: "lo" }) +
      dots([[tip + 1.5, -8.5, top + 15.5], [tip + 1.5, 8.5, top + 15.5]]));
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);

  // ---- the near block's pawl: arm off its near side, finger riding the near rack (drawn over the rack) ----
  front.push(pawl(xA, (G.RACK_Y[0] + G.RACK_Y[1]) / 2, G.NEAR[1] - 1, S.liftA));
  return back.join("") + items.map((item) => item.svg).join("") + (S.mid || []).join("") + front.join("") + (S.front || []).join("");
}

// The clock hand for t hours on a 24-hour face; kit tick convention (angle 0 points to -y).
export function hand(K, P, D, t) {
  const a = (t / 24) * Math.PI * 2;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 2.6, D.y - sy * 2.6], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
