// The machine: a turntable with six plate-and-spring wall sections that can stand as a ring or as a
// straight wall, a hub with a swinging reserve arm, a ring of low pickets that rise when the position is
// prepared, and an attacking carriage on a rail that pushes in along one bearing. Rebuilt per frame from
// the state, depth-sorted. Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code; build.mjs inlines this file with `export` stripped.
//   V.L      0 = straight wall across the likely avenue, 1 = ring (eased layout)
//   V.fort   0..1 pickets raised and roofs on
//   V.ang    attack bearing in degrees (eased); V.tip radius the pushing head has reached
//   V.arm    reserve arm bearing in degrees
//   V.g[6]   pressure read on each plate's gauge, V.rg the hub's; V.held, V.broke lamps 0..1
export const GEO = {
  R: 96,                 // turntable radius
  RING: 50,              // plate-ring radius
  WALL_Y: -40,           // y of the straight wall (north is -y)
  WALL_DX: 28,           // spacing along the wall
  HW: 13,                // plate half width
  PH: 13,                // plate height
  RAIL: 80,              // attacker's rail radius
  PICKET: 68,            // picket ring radius
  HUB: 13,
  PUSH: 8,               // plate travel under full pressure
  LIKELY: 0,
};
const RADS = Math.PI / 180;
const ease3 = (t) => t * t * (3 - 2 * t);

// Plate k's centre and outward-normal bearing for the layout blend L (before deflection).
export function plateAt(k, L, m = 6) {
  const G = GEO, e = ease3(Math.max(0, Math.min(1, L)));
  const a = (k * 360) / m, rx = G.RING * Math.sin(a * RADS), ry = -G.RING * Math.cos(a * RADS);
  const wx = (k - (m - 1) / 2) * G.WALL_DX, wy = G.WALL_Y;
  return { x: wx + (rx - wx) * e, y: wy + (ry - wy) * e, nu: G.LIKELY + (a - G.LIKELY) * e };
}
// First plate face the ray from the centre along bearing a meets, as a radius, or null.
export function rayHit(a, L, defl = [], m = 6) {
  const G = GEO, dx = Math.sin(a * RADS), dy = -Math.cos(a * RADS);
  let best = null;
  for (let k = 0; k < m; k++) {
    const p = plateAt(k, L, m), nx = Math.sin(p.nu * RADS), ny = -Math.cos(p.nu * RADS), tx = Math.cos(p.nu * RADS), ty = Math.sin(p.nu * RADS);
    const d = (defl[k] || 0), cx = p.x - nx * d, cy = p.y - ny * d;
    const fx = cx + nx * 3, fy = cy + ny * 3;       // the plate's outer face
    const den = dx * nx + dy * ny;
    if (den < 1e-6) continue;
    const r = (fx * nx + fy * ny) / den;
    if (r <= 0) continue;
    const hx = dx * r - fx, hy = dy * r - fy;
    if (Math.abs(hx * tx + hy * ty) <= G.HW + 0.5 && (best === null || r < best)) best = r;
  }
  return best;
}
const rect = (cx, cy, nu, hw, hd) => {
  const nx = Math.sin(nu * RADS), ny = -Math.cos(nu * RADS), tx = Math.cos(nu * RADS), ty = Math.sin(nu * RADS);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + tx * hw * a + nx * hd * b, cy + ty * hw * a + ny * hd * b]);
};

// The static turntable: feet, disc, engraved rings and ticks, the rail, the north mark and screws.
export function base(K, P) {
  const S = (paths, style) => K.solidSvg(paths, style);
  const L = (d, style) => K.lineSvg(d, style);
  const Dt = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  const at = (p) => K.iso(p, P);
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const polar = (r, a) => [r * Math.sin(a * RADS), -r * Math.cos(a * RADS)];
  const circ = (cx, cy, r, n = 40) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)]);
  const G = GEO, RING_TOP = 0;
  const parts = [];
  const put = (key, svg) => parts.push({ key, svg });
  // ---- feet, the turntable and its engraving ----
  for (const a of [45, 135, 225, 315]) {
    const [x, y] = polar(76, a);
    put(depth(x, y, -14) - 200, S(K.cylinder(x, y, 8, -18, 2, P, 24), { tone: "lo" }) + S(K.cylinder(x, y, 6, -16, 4, P, 24), { tone: "mid" }));
  }
  {
    let s = `<path class="iso-halo" d="${K.haloOf({ x: -G.R, y: -G.R, w: 2 * G.R, d: 2 * G.R, r: G.R }, -12, 12, P)}"/>`;
    s += S(K.cylinder(0, 0, G.R, -12, 12, P, 72, 1.2), { tone: "mid", inner: L(K.sideArc(0, 0, G.R, -6, P, 40), { tone: "faint" }) });
    s += L(K.onTop(circ(0, 0, G.R - 5, 72), RING_TOP, P, true), { tone: "lo" });
    const t = K.radialTicks(0, 0, G.R - 5, 72, 6, RING_TOP, [1.4, 2.8], P);
    s += L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
    // the rail the attacker rides in: two grooves
    s += L(K.onTop(circ(0, 0, G.RAIL + 4.5, 72), RING_TOP, P, true), { tone: "lo" }) + L(K.onTop(circ(0, 0, G.RAIL - 4.5, 72), RING_TOP, P, true), { tone: "lo" });
    s += L(K.onTop(circ(0, 0, G.HUB + 5, 40), RING_TOP, P, true), { tone: "faint" });
    // north mark: a notch and a wedge at the rim
    const [nx, ny] = polar(G.R - 12, 0);
    s += S(K.extrude([[nx - 3.2, ny + 3], [nx + 3.2, ny + 3], [nx, ny - 5]], 0, 0.8, P, { bevel: 0 }), { tone: "lo", crease: "none" });
    const scr = [0, 90, 180, 270].map((a) => polar(G.R - 2.4, a + 45));
    s += Dt(scr.map(([x, y]) => [x, y, 0]), 0.5);
    put(-9999, s);
  }

  parts.sort((a, b) => a.key - b.key);
  return parts.map((p) => p.svg).join("");
}

export function scene(K, P, V) {
  const G = GEO;
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const S = (paths, style) => K.solidSvg(paths, style);
  const L = (d, style) => K.lineSvg(d, style);
  const Dt = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  const ex = (ring, z, h, bevel = 0.3) => K.extrude(ring, z, h, P, { bevel });
  const polar = (r, a) => [r * Math.sin(a * RADS), -r * Math.cos(a * RADS)];
  const circ = (cx, cy, r, n = 40) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)]);

  // ---- pickets: a ring of low posts that rise (and double) when the position is prepared ----
  for (let i = 0; i < 24; i++) {
    const a = i * 15, extra = i % 2 === 1, h = 1.4 + (extra ? 0 : 1.2) + 4.2 * V.fort * (extra ? 1 : 1);
    if (extra && V.fort < 0.04) continue;
    const [x, y] = polar(G.PICKET, a);
    const hh = extra ? 1.4 + 4.2 * V.fort : h;
    put(depth(x, y, hh / 2), S(K.cylinder(x, y, 1.5, 0, hh, P, 12, 0.2), { tone: "mid", crease: "lo" }) + S(K.cylinder(x, y, 2.3, hh, 0.9, P, 12, 0.2), { tone: "mid" }));
  }
  // a wire between the posts, drawn as a ring on the ground when prepared
  if (V.fort > 0.04) put(-9000, `<g opacity="${V.fort.toFixed(2)}">` + L(K.onTop(circ(0, 0, G.PICKET, 72), 1.2, P, true), { tone: "mid" }) + `</g>`);

  // ---- plates ----
  const defl = V.g.map((g) => G.PUSH * g);
  const pl = [];
  for (let k = 0; k < 6; k++) {
    const p = plateAt(k, V.L), nx = Math.sin(p.nu * RADS), ny = -Math.cos(p.nu * RADS);
    const d = defl[k], cx = p.x - nx * d, cy = p.y - ny * d;
    pl.push({ cx, cy, nu: p.nu, k });
  }
  for (const q of pl) {
    const { cx, cy, nu, k } = q, nx = Math.sin(nu * RADS), ny = -Math.cos(nu * RADS);
    // carriage the plate slides on, and the spring tube behind it
    const bx = cx - nx * 5.5 + nx * defl[k] * 0.0, by = cy - ny * 5.5;
    put(depth(cx, cy, 1.2) - 0.4, S(ex(rect(cx - nx * 1.5, cy - ny * 1.5, nu, G.HW + 1.8, 7), 0, 2.2), { tone: "lo", crease: "lo" }));
    const tubeC = [cx - nx * 12, cy - ny * 12];
    put(depth(tubeC[0], tubeC[1], 3) - 0.2, S(ex(rect(tubeC[0], tubeC[1], nu, 3.2, 8), 2.2, 4.6, 0.2), { tone: "mid", crease: "lo" }) +
      L(K.onTop(rect(tubeC[0], tubeC[1], nu, 2, 6), 6.8, P, true), { tone: "faint" }));
    // the plate
    const ring = rect(cx, cy, nu, G.HW, 3);
    const hot = V.g[k] > 0.55;
    let s = S(ex(ring, 2.2, G.PH, 0.5), { tone: "mid", crease: "lo" });
    const inset = rect(cx, cy, nu, G.HW - 2.4, 1.3);
    s += L(K.onTop(inset, 2.2 + G.PH, P, true), { tone: "faint" });
    const tx = Math.cos(nu * RADS), ty = Math.sin(nu * RADS);
    s += Dt([[cx + tx * (G.HW - 1.6), cy + ty * (G.HW - 1.6), 2.2 + G.PH], [cx - tx * (G.HW - 1.6), cy - ty * (G.HW - 1.6), 2.2 + G.PH]], 0.42);
    put(depth(cx, cy, 8) + 0.5, s);
    if (V.fort > 0.04) {
      const rz = 2.2 + G.PH, hh = 3.2 * V.fort;
      put(depth(cx, cy, rz + hh) + 0.9, S(ex(rect(cx - nx * 0.4, cy - ny * 0.4, nu, G.HW - 0.8, 2.4), rz, hh, 0.2), { tone: "hi", crease: "lo" }));
    }
    // the gauge on its post behind the spring tube: a flat dial, needle sweeping 270 degrees
    const gx = cx - nx * 24, gy = cy - ny * 24, gz = 0;
    const g = V.g[k], ang = (-135 + 270 * g) * RADS;
    let ds = S(K.cylinder(gx, gy, 6.4, gz, 5, P, 28, 0.5), { tone: "mid" });
    ds += L(K.onTop(circ(gx, gy, 5, 28), 5, P, true), { tone: "lo" });
    const dt = K.radialTicks(gx, gy, 5, 9, 3, 5, [0.9, 1.7], P, -135 * RADS, 270 * RADS);
    ds += L(dt.minor, { tone: "lo" }) + L(dt.major, { tone: "mid" });
    ds += `<path class="iso-line" data-tone="${hot ? "mid" : "lo"}" data-free="" d="${K.lineOnTop([gx, gy], [gx + Math.sin(ang) * 4, gy - Math.cos(ang) * 4], 5.1, P)}" style="stroke-width:1.1"/>`;
    ds += Dt([[gx, gy, 5.1]], 0.55);
    put(depth(gx, gy, 3) + 0.3, ds);
  }
  // tie bars: neighbouring plates are tied, so the ring (or wall) reads as one interlocked defense
  for (let k = 0; k < 6; k++) {
    const k2 = (k + 1) % 6;
    if (k === 5 && V.L < 0.5) continue;
    const a = pl[k], b = pl[k2];
    const ta = [Math.cos(a.nu * RADS), Math.sin(a.nu * RADS)], tb = [Math.cos(b.nu * RADS), Math.sin(b.nu * RADS)];
    const p0 = [a.cx + ta[0] * (G.HW - 0.5), a.cy + ta[1] * (G.HW - 0.5)], p1 = [b.cx - tb[0] * (G.HW - 0.5), b.cy - tb[1] * (G.HW - 0.5)];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (len < 1.5) continue;
    const dxn = (p1[0] - p0[0]) / len, dyn = (p1[1] - p0[1]) / len, nxn = -dyn, nyn = dxn;
    const ring = [[p0[0] + nxn * 1.4, p0[1] + nyn * 1.4], [p1[0] + nxn * 1.4, p1[1] + nyn * 1.4], [p1[0] - nxn * 1.4, p1[1] - nyn * 1.4], [p0[0] - nxn * 1.4, p0[1] - nyn * 1.4]];
    put(depth((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 6) + 0.7, S(ex(ring, 5, 2.4, 0.15), { tone: "lo", crease: "lo" }));
  }

  // ---- hub with its dial, and the reserve arm ----
  {
    const z0 = 0;
    let s = S(K.cylinder(0, 0, G.HUB, z0, 9, P, 40, 0.8), { tone: "mid", inner: L(K.sideArc(0, 0, G.HUB, 4.5, P, 20), { tone: "faint" }) });
    s += L(K.onTop(circ(0, 0, G.HUB - 2, 40), 9, P, true), { tone: "faint" });
    const t = K.radialTicks(0, 0, G.HUB - 2, 12, 3, 9, [1.2, 2.2], P);
    s += L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
    // the hub's own gauge needle: how much of the attack no plate faces
    const ang = (-135 + 270 * V.rg) * RADS;
    s += `<path class="iso-line" data-tone="mid" data-free="" d="${K.lineOnTop([0, 0], [Math.sin(ang) * 7.4, -Math.cos(ang) * 7.4], 9.1, P)}" style="stroke-width:1.1"/>`;
    put(depth(0, 0, 5) + 1, s);
    // the arm: a pivot cap, a beam and a shoe, lit
    const ar = V.arm, nx = Math.sin(ar * RADS), ny = -Math.cos(ar * RADS);
    let a = S(K.cylinder(0, 0, 4.2, 9, 3, P, 24, 0.4), { tone: "mid" });
    const beam = rect(nx * 14, ny * 14, ar, 2.6, 13);
    // rect() is width along the tangent and depth along the normal; here the beam runs along the normal
    a += S(ex(rect(nx * 15, ny * 15, ar, 2.6, 13), 12, 3.4, 0.3), { tone: "hi", lit: true, crease: "lo" });
    const shoeC = [nx * 31, ny * 31];
    a += S(ex(rect(shoeC[0], shoeC[1], ar, 7, 2.6), 11, 5.4, 0.4), { tone: "hi", lit: true, crease: "lo" });
    void beam;
    put(depth(nx * 18, ny * 18, 12) + 2, a);
  }

  // ---- the attack: a carriage on the rail and a push rod with a head ----
  {
    const a = V.ang, nx = Math.sin(a * RADS), ny = -Math.cos(a * RADS), cr = G.RAIL;
    const cc = [nx * cr, ny * cr];
    let s = S(ex(rect(cc[0], cc[1], a, 10, 8), 0, 3, 0.3), { tone: "lo", crease: "lo" });
    s += S(ex(rect(cc[0], cc[1], a, 7.4, 5.6), 3, 9, 0.5), { tone: "lo", crease: "lo" });
    s += L(K.onTop(rect(cc[0], cc[1], a, 5, 3.4), 12, P, true), { tone: "faint" });
    put(depth(cc[0], cc[1], 6) + 2, s);
    const tip = Math.max(14, Math.min(G.RAIL - 6, V.tip));
    const len = cr - 5 - tip;
    if (len > 1) {
      const mid = tip + len / 2;
      put(depth(nx * mid, ny * mid, 9) + 3, S(ex(rect(nx * mid, ny * mid, a, 2.2, len / 2), 7, 3, 0.2), { tone: "lo", crease: "lo" }));
    }
    put(depth(nx * tip, ny * tip, 8) + 3.2, S(ex(rect(nx * tip, ny * tip, a, 7, 2.4), 3, 9, 0.4), { tone: "lo", crease: "lo" }));
  }

  // ---- lamps: held and broken, on a panel at the front ----
  {
    const pan = { x: -22, y: 62, w: 44, d: 12, r: 2 };
    let s = S(K.slabOf(pan, 0, 3, P, 4, 0.5), { tone: "mid", inner: L(K.sideSeam(pan, 1.5, P, 4), { tone: "faint" }) }) +
      L(K.planOutline(K.insetPlan(pan, 2), 3, P), { tone: "faint" });
    [[-9, V.held], [9, V.broke]].forEach(([dx, on]) => {
      const x = dx, y = 68, lit = on > 0.5;
      s += S(K.cylinder(x, y, 3.2, 3, 1.4, P, 22, 0.3), { tone: "mid" }) +
        S(K.cylinder(x, y, 2.5, 4.4, 2.4, P, 20, 0.6), lit ? { tone: "hi", crease: "lo" } : { tone: "lo", crease: "lo" }) +
        (lit ? L(K.ring(x, y, 3.8, 3.2, P, 24), { tone: "mid" }) : "");
    });
    s += L(K.lineOnTop([pan.x + 4, pan.y + 2.4], [pan.x + 16, pan.y + 2.4], 3, P), { tone: "lo", free: true });
    put(depth(0, 68, 3) + 14, s);
  }
  items.sort((a, b) => a.key - b.key);
  return items.map((i) => i.svg).join("");
}
