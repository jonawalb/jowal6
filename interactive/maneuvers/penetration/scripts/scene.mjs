// The moving half of the figure, rebuilt per frame: the line of blocks with its
// end springs, the wedge, the pendulum drop hammer, the spreader carriage and the
// shoulder pins, plus the fixed parts that have to sort in depth with them.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  BLOCK_W: 18,     // each block's width along the line (y)
  BLOCKS: 3,       // blocks on each side of the boundary
  BLOCK_H: 18,
  ABUT: 76,        // inner face of the end abutments, |y|
  HX: -48,         // hammer pivot x
  HZ: 63,          // hammer pivot height
  ARM: 50,         // pivot to head centre
  POST_Y: 22,      // hammer posts, |y|
  WEDGE_H: 15,
  PIN: [10, 12.5, 2.5, 20], // shoulder pin x, |y|, radius, full height
  STOP_X: 94,     // objective stop front face
  REAR_X: -124,    // rear stop face
  DIAL: { x: 62, y: 58, r: 14, z: 22, h: 7 }, // gap gauge
};

const SC_RAD = Math.PI / 180;

// A convex prism whose section lies in the x-z plane, extruded along y from y0 to y1.
// Same tone rules as the kit's lathe prisms (light from -sinA, cosA, 1.2).
export function prismY(K, P, poly, y0, y1) {
  const { sinA, cosA, sinE, cosE } = K.cameraOf(P);
  const V = [cosA * cosE, sinA * cosE, sinE];
  const ll = Math.hypot(sinA, cosA, 1.2);
  const L = [-sinA / ll, cosA / ll, 1.2 / ll];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const band = (s) => (s >= 0.62 ? 4 : s >= 0.42 ? 3 : s >= 0.2 ? 2 : s >= 0 ? 1 : 0);
  let area = 0;
  for (let j = 0; j < poly.length; j++) {
    const [x0, z0] = poly[j], [x1, z1] = poly[(j + 1) % poly.length];
    area += x0 * z1 - x1 * z0;
  }
  const ring = area > 0 ? poly : [...poly].reverse();
  const n = ring.length;
  const lo = ring.map(([x, z]) => K.iso([x, y0, z], P));
  const hi = ring.map(([x, z]) => K.iso([x, y1, z], P));
  const buckets = [[], [], [], [], []];
  const seen = [];
  for (let j = 0; j < n; j++) {
    const [x0, z0] = ring[j], [x1, z1] = ring[(j + 1) % n];
    const len = Math.hypot(x1 - x0, z1 - z0) || 1;
    const normal = [(z1 - z0) / len, 0, -(x1 - x0) / len];
    const vis = dot(normal, V) > 1e-6;
    seen.push(vis);
    if (vis) buckets[band(dot(normal, L))].push(K.pathOf([lo[j], lo[(j + 1) % n], hi[(j + 1) % n], hi[j]], true));
  }
  const capNear = dot([0, 1, 0], V) > 0 ? hi : lo;
  const capN = dot([0, 1, 0], V) > 0 ? [0, 1, 0] : [0, -1, 0];
  buckets[band(dot(capN, L))].push(K.pathOf(capNear, true));
  // creases where the near cap meets the visible sides
  const creases = [];
  for (let j = 0; j < n; j++) if (seen[j]) creases.push(K.pathOf([capNear[j], capNear[(j + 1) % n]]));
  const hull = hullOf([...lo, ...hi]);
  return { fill: K.pathOf(hull, true), outline: K.pathOf(hull, true), crease: creases.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) };
}

function hullOf(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of pts.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

const circleXZ = (cx, cz, r, steps = 14) => Array.from({ length: steps }, (_, i) => [cx + r * Math.cos((i / steps) * 2 * Math.PI), cz + r * Math.sin((i / steps) * 2 * Math.PI)]);

// S: { gap, phi, nose, car, pin (0..1 height share) }
export function scene(K, P, M, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  const slab = (x0, x1, y0, y1, z, h, steps = 3, bevel = 0) => K.slabOf({ x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), d: Math.abs(y1 - y0), r: Math.min(1, Math.abs(x1 - x0) / 3, Math.abs(y1 - y0) / 3) }, z, h, P, steps, bevel);
  const halo = (x0, x1, y0, y1) => `<path class="iso-halo" d="${slab(x0, x1, y0, y1, 0, 0.1).fill}" style="filter:blur(3px)"/>`;
  const D = M.depth, g = S.gap, W = GEO.BLOCK_W, H = GEO.BLOCK_H;

  // ---- the line: three blocks each side of the boundary, slid apart by the gap ----
  const keyMax = { 1: -1e9, "-1": -1e9 }, keyMin = { 1: 1e9, "-1": 1e9 };
  for (const side of [-1, 1]) {
    for (let i = 0; i < GEO.BLOCKS; i++) {
      const y0 = side * (g / 2 + i * W), y1 = side * (g / 2 + (i + 1) * W);
      const plan = { x: 0, y: Math.min(y0, y1), w: D, d: W, r: 0.8 };
      const key = depth(D / 2, (y0 + y1) / 2);
      keyMax[side] = Math.max(keyMax[side], key);
      keyMin[side] = Math.min(keyMin[side], key);
      const bolts = [[4, 4], [D - 4, W - 4]].map(([u, v]) => [u, plan.y + v, H]);
      put(key, solid(K.slabOf(plan, 0, H, P, 3, 0.6), { tone: "hi", crease: "lo", inner: line(K.sideSeam(plan, 4, P, 3), { tone: "faint" }) }) +
        line(K.planOutline(K.insetPlan(plan, 2.4), H, P, 3), { tone: "faint" }) + dots(bolts, 0.45));
    }
  }

  // ---- guide lips that keep the blocks square to the attack axis ----
  for (const side of [-1, 1]) {
    const a = side * 20, b = side * 74;
    const fromFront = K.towardViewer(P)[0] < 0;      // viewer on the attacker's side of the line
    put(fromFront ? keyMax[side] + 0.5 : keyMin[side] - 0.5, solid(slab(-5, -1, a, b, 0, 2.5, 2, 0.3), { tone: "mid" }) + dots([[-3, side * 30, 2.5], [-3, side * 68, 2.5]], 0.4));
    put(fromFront ? keyMin[side] - 0.5 : keyMax[side] + 0.5, solid(slab(D + 1, D + 5, a, b, 0, 2.5, 2, 0.3), { tone: "mid" }) + dots([[D + 3, side * 30, 2.5], [D + 3, side * 68, 2.5]], 0.4));
  }

  // ---- end abutments, spring rods, coils and pressure pads: the defender closing the gap ----
  for (const side of [-1, 1]) {
    const yo = side * (g / 2 + GEO.BLOCKS * W);        // outer face of the outer block
    const yp = yo + side * 2;                           // pad's outer face
    const ab0 = side * GEO.ABUT, ab1 = side * (GEO.ABUT + 10);
    const abPlan = { x: -2, y: Math.min(ab0, ab1), w: 24, d: 10, r: 1.2 };
    const nut = solid(slab(7, 13, ab1, ab1 + side * 2.5, 7, 6, 2, 0.3), { tone: "mid" });
    const abut = halo(-3, 23, ab0, ab1) + (side < 0 ? nut : "") + solid(K.slabOf(abPlan, 0, 20, P, 3, 0.6), { tone: "mid", inner: line(K.sideSeam(abPlan, 5, P, 3), { tone: "faint" }) }) +
      dots([[2, side * (GEO.ABUT + 5), 20], [18, side * (GEO.ABUT + 5), 20]], 0.5) + (side > 0 ? nut : "");
    const coil = K.coil(yp, ab0, [10, 10], 3.8, 6, "y", P);
    const rod = solid(slab(8.6, 11.4, yp, ab1 + side * 1.5, 8.6, 2.8, 2), { tone: "mid", crease: "none" });
    const pad = solid(slab(4, 16, yo, yp, 4, 12, 2, 0.3), { tone: "mid" }) + dots([[6, yp, 14], [14, yp, 14]], 0.38);
    const springs = side > 0
      ? pad + line(coil.back, { tone: "lo" }) + rod + line(coil.front, { tone: "mid" })
      : line(coil.back, { tone: "lo" }) + rod + line(coil.front, { tone: "mid" }) + pad;
    if (side > 0) { put(depth(10, (yo + ab0) / 2), springs); put(depth(10, side * (GEO.ABUT + 5)), abut); }
    else { put(depth(10, side * (GEO.ABUT + 5)), abut); put(depth(10, (yo + ab0) / 2), springs); }
  }

  // ---- shoulder pins: rise behind the rollers and hold the gap open ----
  {
    const [px, py, pr, ph] = GEO.PIN;
    const h = ph * S.pin;
    if (h > 0.3) for (const side of [-1, 1]) {
      const y = side * py;
      put(depth(px, y), solid(K.cylinder(px, y, pr, 0, h, P, 22, 0.3), { tone: "mid", inner: line(K.sideArc(px, y, pr, Math.min(h, 4), P, 14), { tone: "faint" }) }) +
        line(K.ring(px, y, pr - 1, h, P, 16), { tone: "lo" }));
    }
  }

  // ---- the wedge: lit, a thin triangle in plan, nose toward the line ----
  {
    const n = S.nose, b = n - M.wedgeLen, t = M.wedgeBack / 2;
    const tri = [[n, 0], [b, -t], [b, t]];
    put(depth((n + b) / 2, 0),
      `<path class="iso-halo" d="${K.extrude(tri, 0, 0.1, P).fill}" style="filter:blur(2px)"/>` +
      solid(K.extrude(tri, 0.2, GEO.WEDGE_H, P, { bevel: 0.4 }), { tone: "hi", lit: true, crease: "lo" }) +
      line(K.lineOnTop([n, 0], [b, 0], 0.2 + GEO.WEDGE_H, P), { tone: "lit" }) +
      solid(slab(b - 1.6, b, -t - 1, t + 1, 2, 12, 2, 0.3), { tone: "mid" }) +
      dots([[b - 0.8, -t + 0.6, 14], [b - 0.8, t - 0.6, 14]], 0.38));
  }

  // ---- spreader carriage: body, shoes, nose plate, roller crosshead and rollers ----
  {
    const c = S.car;
    const rx = c - 3;
    let out = halo(c - 35, c + 1, -11, 11);
    for (const [x0, x1] of [[c - 32, c - 26], [c - 10, c - 4]]) out += solid(slab(x0, x1, -8.5, 8.5, 0, 1.5, 2), { tone: "lo" });
    const body = { x: c - 34, y: -9, w: 32, d: 18, r: 1.6 };
    out += solid(K.slabOf(body, 1.5, 8.5, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(body, 5, P, 3), { tone: "faint" }) });
    out += line(K.planOutline(K.insetPlan({ x: c - 30, y: -6, w: 18, d: 12, r: 1 }, 0), 10, P, 3), { tone: "faint" });
    out += dots([[c - 32, -7, 10], [c - 32, 7, 10], [c - 10, -7, 10], [c - 10, 7, 10]], 0.42);
    // handle at the tail
    out += solid(K.cylinder(c - 26, 0, 2.4, 10, 2, P, 18), { tone: "mid" }) + solid(K.cylinder(c - 26, 0, 3, 12, 4, P, 22), { tone: "mid" }) + line(K.knurl(c - 26, 0, 3, 12, 16, 18, P), { tone: "lo" });
    // nose plate (pushes the wedge), on the far side when the viewer is behind the carriage
    const nosePlate = solid(slab(c - 2, c, -6, 6, 1.5, 10.5, 2, 0.3), { tone: "mid" });
    if (K.towardViewer(P)[0] < 0) out = halo(c - 35, c + 1, -11, 11) + nosePlate + out.slice(halo(c - 35, c + 1, -11, 11).length); else out += nosePlate;
    // rollers under the crosshead: far roller, crosshead, near roller order handled by depth
    const far = -Math.sign(K.towardViewer(P)[1]) || -1;
    const roller = (y) => solid(K.cylinder(rx, y, M.rollerR, 1.6, 9.4, P, 24, 0.3), { tone: "hi", crease: "lo", inner: line(K.sideArc(rx, y, M.rollerR, 5.5, P, 16), { tone: "faint" }) });
    out += roller(far * 12) + roller(-far * 12);
    out += solid(slab(c - 6, c, -13.6, 13.6, 11, 2, 2, 0.4), { tone: "mid" });
    out += solid(K.cylinder(rx, -12, 1.5, 13, 0.8, P, 14), { tone: "mid" }) + solid(K.cylinder(rx, 12, 1.5, 13, 0.8, P, 14), { tone: "mid" });
    put(depth(c - 17, 0), out);
  }

  // ---- pendulum drop hammer: braced frame, pivot pin, clevis, tapered arm, shaped head, catch ----
  {
    const X = GEO.HX, Z = GEO.HZ, PY = GEO.POST_Y;
    const strut = (x0, z0, x1, z1, w) => {
      const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz), ux = -dz / l * w / 2, uz = dx / l * w / 2;
      return [[x0 + ux, z0 + uz], [x1 + ux, z1 + uz], [x1 - ux, z1 - uz], [x0 - ux, z0 - uz]];
    };
    const fromFront = K.towardViewer(P)[0] < 0;
    const post = (y) => {
      const brace = (d) => {
        const fx = X + d * 19;
        return solid(slab(fx - 4, fx + 4, y - 3.5, y + 3.5, 0, 2, 2, 0.3), { tone: "lo" }) + dots([[fx - d * 2, y, 2]], 0.38) +
          solid(prismY(K, P, strut(X + d * 3, 28, fx - d * 1.4, 2, 3), y - 1.4, y + 1.4), { tone: "mid", crease: "none" });
      };
      return halo(X - 7, X + 7, y - 7, y + 7) + solid(slab(X - 6, X + 6, y - 6, y + 6, 0, 2, 3, 0.4), { tone: "lo" }) +
        dots([[X - 4, y - 4, 2], [X + 4, y + 4, 2], [X - 4, y + 4, 2], [X + 4, y - 4, 2]], 0.38) +
        brace(fromFront ? 1 : -1) +
        solid(slab(X - 3, X + 3, y - 3, y + 3, 2, Z - 7, 2), { tone: "mid", crease: "none" }) +
        solid(slab(X - 4, X + 4, y - 4, y + 4, 26, 4, 2, 0.3), { tone: "mid" }) +
        brace(fromFront ? -1 : 1) +
        solid(slab(X - 4.5, X + 4.5, y - 4.5, y + 4.5, Z - 5, 10, 2, 0.4), { tone: "mid", inner: line(K.sideSeam({ x: X - 4.5, y: y - 4.5, w: 9, d: 9, r: 1 }, Z, P, 2), { tone: "faint" }) }) +
        solid(slab(X - 3, X + 3, y - 3, y + 3, Z + 5, 4, 2), { tone: "mid", crease: "none" });
    };
    const nearY = K.towardViewer(P)[1] > 0 ? 1 : -1;
    put(depth(X, -nearY * PY), post(-nearY * PY));
    const pin = (y0, y1) => solid(prismY(K, P, circleXZ(X, Z, 1.8, 12), y0, y1), { tone: "mid", crease: "none" });
    const collar = (y0, y1) => solid(prismY(K, P, circleXZ(X, Z, 2.8, 14), y0, y1), { tone: "mid" });
    const a = S.phi * SC_RAD;
    const ax = Math.sin(a), az = -Math.cos(a);           // unit vector pivot -> head
    const nx = -az, nz = ax;                             // perpendicular in the swing plane (striking side)
    const pt = (s, w) => [X + ax * s + nx * w, Z + az * s + nz * w];
    const R = GEO.ARM;
    const cheekPoly = [...circleXZ(X, Z, 5, 16), pt(13, -3.4), pt(13, 3.4)];
    const cheek = (y0, y1) => solid(prismY(K, P, cheekPoly, y0, y1), { tone: "mid" });
    const arm = solid(prismY(K, P, [pt(3, -3), pt(R - 7.5, -1.9), pt(R - 7.5, 1.9), pt(3, 3)], -1.8, 1.8), { tone: "mid", crease: "none" });
    const boss = solid(prismY(K, P, circleXZ(X, Z, 3.6, 16), -2, 2), { tone: "mid" });
    // head: heavy at the back, narrowing to a hardened striking face (w = +7 is the face)
    const headPoly = [pt(R - 7, -8), pt(R + 7, -8), pt(R + 7, 2), pt(R + 5, 5.6), pt(R - 5, 5.6), pt(R - 7, 2)];
    const head = solid(prismY(K, P, headPoly, -6, 6), { tone: "mid" });
    const face = solid(prismY(K, P, [pt(R - 4, 5.6), pt(R + 4, 5.6), pt(R + 4, 7), pt(R - 4, 7)], -4.4, 4.4), { tone: "mid" });
    const capY = nearY * 6;
    const bolts = [[R - 4.5, -5.2], [R + 4.5, -5.2], [R - 4.5, 0.6], [R + 4.5, 0.6]].map(([s1, w1]) => { const [x, z] = pt(s1, w1); return [x, capY, z]; });
    const { cosA: cA, sinE: sE, cosE: cE } = K.cameraOf(P);
    const faceSeen = nx * cA * cE + nz * sE > 0;
    const headSvg = (faceSeen ? head + face : face + head) + dots(bolts, 0.45);
    put(depth(X, -nearY * 10), pin(-nearY * (PY - 3), -nearY * 4.4));
    put(depth(X, 0),
      collar(-nearY * 4.4, -nearY * 3.4) + cheek(-nearY * 3.4, -nearY * 2) + arm + boss + headSvg +
      cheek(nearY * 2, nearY * 3.4) + collar(nearY * 3.4, nearY * 4.4) + dots([[X, nearY * 4.4, Z]], 0.5));
    put(depth(X, nearY * 10), pin(nearY * 4.4, nearY * (PY - 3)));
    put(depth(X, nearY * PY), post(nearY * PY));
    put(depth(X, nearY * PY) + 0.5, solid(slab(X - 4, X + 4, -PY - 4, PY + 4, Z + 9, 4, 2, 0.4), { tone: "mid" }) + dots([[X, -PY, Z + 13], [X, PY, Z + 13]], 0.45));
    // catch at the top of the swing: a post, a latch arm over the parked head, a sear block and a trip lever
    const CX = X - R, CY = -nearY * 20, top = Z + 8;
    put(depth(CX, CY / 2) + 2,
      halo(CX - 5, CX + 5, CY - 5, CY + 5) + solid(slab(CX - 4.5, CX + 4.5, CY - 4.5, CY + 4.5, 0, 2, 3, 0.4), { tone: "lo" }) +
      dots([[CX - 3, CY - 3, 2], [CX + 3, CY + 3, 2]], 0.38) +
      solid(slab(CX - 2, CX + 2, CY - 2, CY + 2, 2, top + 4.5, 2), { tone: "mid", crease: "none" }) +
      solid(slab(CX - 2.5, CX + 2.5, CY, nearY * 5, top + 2, 3, 2, 0.3), { tone: "mid" }) +
      solid(slab(CX - 2, CX + 2, -3.5, 3.5, top + 0.1, 1.9, 2), { tone: "mid" }) +
      solid(slab(CX - 1, CX + 1, CY * 0.55 - 1, CY * 0.55 + 1, top + 5, 5, 2), { tone: "mid", crease: "none" }) +
      solid(K.cylinder(CX, CY * 0.55, 1.8, top + 10, 2.4, P, 16), { tone: "mid" }) + line(K.knurl(CX, CY * 0.55, 1.8, top + 10, top + 12.4, 12, P), { tone: "lo" }) +
      dots([[CX, CY, top + 5]], 0.42));
  }

  // ---- gap gauge: a dial on a pedestal that reads the gap at the line, 0 to 30 mm ----
  {
    const G = GEO.DIAL;
    const ped = { x: G.x - 13, y: G.y - 13, w: 26, d: 26, r: 3 };
    let out = halo(G.x - 14, G.x + 14, G.y - 14, G.y + 14);
    out += solid(K.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" });
    out += line(K.planOutline(K.insetPlan(ped, 3), 5, P), { tone: "faint" });
    out += dots(K.corners(ped, 3.4).map(([x, y]) => [x, y, 5]), 0.45);
    out += solid(K.cylinder(G.x, G.y, 5.6, 5, 2.4, P, 28), { tone: "mid" });
    out += solid(K.cylinder(G.x, G.y, 3.4, 7.4, G.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: line(K.sideArc(G.x, G.y, 3.4, 13, P, 16), { tone: "faint" }) });
    const topZ = G.z + G.h;
    out += solid(K.cylinder(G.x, G.y, G.r, G.z, G.h, P, 72, 0.8), { tone: "hi", crease: "lo" });
    out += line(K.knurl(G.x, G.y, G.r, topZ - 3, topZ, 64, P, 0.3), { tone: "lo" });
    out += line(K.sideArc(G.x, G.y, G.r, topZ - 3, P, 40), { tone: "faint" });
    out += line(K.ring(G.x, G.y, G.r - 2, topZ, P, 72), { tone: "lo" });
    const t = K.radialTicks(G.x, G.y, G.r - 2, 30, 5, topZ, [1.2, 2.6], P, -0.75 * Math.PI, 1.5 * Math.PI);
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    const f = Math.max(0, Math.min(1, g / M.span));
    const ang = -0.75 * Math.PI + f * 1.5 * Math.PI;
    const sx = Math.sin(ang), sy = -Math.cos(ang);
    out += `<path class="iso-line" data-tone="lit" data-free="" d="${K.lineOnTop([G.x - sx * 3, G.y - sy * 3], [G.x + sx * (G.r - 3.2), G.y + sy * (G.r - 3.2)], topZ + 0.2, P)}" style="stroke-width:1.1"/>`;
    out += line(K.ring(G.x, G.y, 1.5, topZ, P, 16), { tone: "mid" });
    put(depth(G.x, G.y), out);
  }

  // ---- spare-wedge tray beside the hammer: two wedges lying in a rimmed tray ----
  {
    const T = { x: -80, y: 44, w: 32, d: 20, r: 2 };
    let out = halo(T.x - 1, T.x + T.w + 1, T.y - 1, T.y + T.d + 1);
    out += solid(K.slabOf(T, 0, 3, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(T, 1.5, P, 3), { tone: "faint" }) });
    out += line(K.planOutline(K.insetPlan(T, 2), 3, P, 3), { tone: "faint" });
    out += dots(K.corners(T, 1.2).map(([x, y]) => [x, y, 3]), 0.38);
    for (const yc of [T.y + 6, T.y + 14]) {
      const tri = [[T.x + 29, yc], [T.x + 4, yc - 3], [T.x + 4, yc + 3]];
      out += solid(K.extrude(tri, 3, 3.2, P, { bevel: 0.3 }), { tone: "mid" });
    }
    put(depth(T.x + 16, T.y + 10), out);
  }

  // ---- objective stop and rear stop, each with a rubber buffer facing the carriage ----
  {
    const sx = GEO.STOP_X;
    put(depth(sx + 5, 0), halo(sx - 1, sx + 10, -15, 15) + solid(slab(sx, sx + 9, -14, 14, 0, 14, 3, 0.5), { tone: "mid" }) +
      dots([[sx + 4.5, -10, 14], [sx + 4.5, 10, 14]], 0.45) + solid(slab(sx - 2, sx, -8, 8, 3, 8, 2, 0.3), { tone: "lo" }));
    const rx = GEO.REAR_X;
    put(depth(rx - 4, 0), halo(rx - 9, rx + 1, -10, 10) + solid(slab(rx - 8, rx - 2, -9, 9, 0, 9, 2, 0.4), { tone: "mid" }) +
      dots([[rx - 5, -6, 9], [rx - 5, 6, 9]], 0.42) + solid(slab(rx - 2, rx, -6, 6, 2, 6, 2, 0.3), { tone: "lo" }));
  }

  items.sort((p, q) => p.key - q.key);
  return items.map((item) => item.svg).join("");
}
