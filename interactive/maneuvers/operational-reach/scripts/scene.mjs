// The moving half of the figure, rebuilt per frame: the telescoping arm on its knife
// edge (tilts as one rigid body), the roller stand's jack, and the gauge, which has to
// sort in depth with them.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  ZB: 46,            // sleeve underside when level
  ZP: 42,            // knife-edge apex: the pivot line
  TIP: 7,            // degrees: the tilt at which the sleeve lands on the stop pad
  STOP_X: [10, 14],  // stop pad under the sleeve, x span
  POST: 124,         // roller stand x (same as MODEL.post)
  ROLL_R: 3,         // roller radius
  DROP: 18,          // how far the jack lowers the roller
  HOUSING: 18,       // jack housing top
  REST_X: -50,       // rear rest under the counterweight end
  SW: 7, S1W: 5.2, S2W: 3.6, SH: 12, // half widths (y) of sleeve and stages, sleeve height
};
GEO.ROLL_TOP = GEO.ZB + 2; // roller top when raised: the second stage's underside

const SC_RAD = Math.PI / 180;

// A convex prism whose section lies in the x-z plane, extruded along y from y0 to y1.
// Same tone rules as the kit's lathe prisms (light from -sinA, cosA, 1.2).
// (Pattern from the sibling Penetration figure's scene.mjs.)
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
  const near = dot([0, 1, 0], V) > 0;
  const capNear = near ? hi : lo;
  buckets[band(dot(near ? [0, 1, 0] : [0, -1, 0], L))].push(K.pathOf(capNear, true));
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

export const circleXZ = (cx, cz, r, steps = 18) => Array.from({ length: steps }, (_, i) => [cx + r * Math.cos((i / steps) * 2 * Math.PI), cz + r * Math.sin((i / steps) * 2 * Math.PI)]);

// Rotate an (x, z) point about the knife edge (0, ZP), tip-down by th degrees.
export function tiltXZ(x, z, th) {
  const c = Math.cos(th * SC_RAD), s = Math.sin(th * SC_RAD);
  const dz = z - GEO.ZP;
  return [x * c + dz * s, GEO.ZP - x * s + dz * c];
}

// Tilt (degrees) at which the second stage's underside at the roller meets a roller top at zTop.
export function contactTilt(zTop) {
  let lo = -2, hi = 20;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const [, z] = tiltXZ(GEO.POST, GEO.ZB + 2, mid);
    if (z > zTop) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Pad height so the sleeve lands on it exactly at TIP.
export const stopTop = () => tiltXZ(GEO.STOP_X[1], GEO.ZB, GEO.TIP)[1];

// S: { e (extension), th (tilt, degrees), jack (0 down .. 1 up), statics: [{ key, svg }] }
export function scene(K, P, M, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const T = (x, z) => tiltXZ(x, z, S.th);
  const P3 = (x, y, z) => { const [tx, tz] = T(x, z); return [tx, y, tz]; };
  const box = (x0, x1, z0, z1, y0, y1) => prismY(K, P, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => T(x, z)), y0, y1);
  const poly = (pts, y0, y1) => prismY(K, P, pts.map(([x, z]) => T(x, z)), y0, y1);
  const seg = (a, b) => K.segment(P3(...a), P3(...b), P);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map((p) => at(P3(...p))), { size });
  const { ZB, SW, S1W, S2W, SH } = GEO;

  // ---- roller stand: jack screw, yoke and roller; rises to carry the second stage ----
  {
    const X = GEO.POST;
    const zr = GEO.ROLL_TOP - GEO.ROLL_R - GEO.DROP * (1 - S.jack);   // roller axis height
    const yokeZ = zr - 6.5;                                            // yoke plate underside
    let out = "";
    // screw shaft from the housing to the yoke plate
    const shaft = Math.max(0.01, yokeZ - GEO.HOUSING);
    out += solid(K.cylinder(X, 0, 1.8, GEO.HOUSING, shaft, P, 16), { tone: "mid", crease: "none" });
    if (shaft > 3) {
      const thread = [];
      for (let z = GEO.HOUSING + 1.5; z < yokeZ - 0.8; z += 1.6) thread.push(K.sideArc(X, 0, 1.8, z, P, 10));
      out += line(thread.join(""), { tone: "faint" });
    }
    // yoke plate and its two cheeks, then the roller between them
    out += solid(K.slabOf({ x: X - 6, y: -6, w: 12, d: 12, r: 1.2 }, yokeZ, 2, P, 3, 0.3), { tone: "mid" });
    out += K.dotsSvg([[X - 4.4, -4.4], [X + 4.4, -4.4], [X - 4.4, 4.4], [X + 4.4, 4.4]].map(([x, y]) => at([x, y, yokeZ + 2])), { size: 0.38 });
    const cheek = (y0, y1) => solid(K.slabOf({ x: X - 4.5, y: y0, w: 9, d: y1 - y0, r: 0.5 }, yokeZ + 2, zr + 1.6 - yokeZ - 2, P, 2, 0.2), { tone: "mid" });
    out += cheek(-4.9, -3.4);
    out += solid(prismY(K, P, circleXZ(X, zr, GEO.ROLL_R, 22), -3.2, 3.2), { tone: "hi", crease: "none" });
    out += solid(prismY(K, P, circleXZ(X, zr, 1.1, 12), 3.2, 3.3), { tone: "lo", crease: "none" });
    out += cheek(3.4, 4.9);
    out += solid(prismY(K, P, circleXZ(X, zr, 1.2, 12), 4.9, 5.6), { tone: "mid", crease: "none" });
    put(depth(X, 0) - 400, out);
  }

  // ---- the arm: sleeve, counterweight, stages, head; one rigid body on the knife edge ----
  const sleeveKey = depth(-6, 0) + 200;
  {
    const a = M.sleeve.a, b = M.sleeve.b;
    // knife edge under the sleeve
    put(sleeveKey - 1, solid(poly([[-2.8, ZB], [2.8, ZB], [0, GEO.ZP]], -9.4, 9.4), { tone: "mid", crease: "none" }));
    // rear rest pad block and the sleeve body
    let out = solid(box(a, b, ZB, ZB + SH, -SW, SW), { tone: "mid" });
    out += line(seg([a, SW, ZB + SH - 2.6], [b, SW, ZB + SH - 2.6]), { tone: "faint" });
    const rivets = [];
    for (let x = a + 6; x <= b - 4; x += 10) rivets.push([x, SW, ZB + 4.6]);
    out += dots(rivets, 0.4);
    // front collar of the sleeve: a raised band, then the wear-pad screws on its face
    out += solid(box(b - 3, b, ZB - 0.6, ZB + SH + 0.6, -SW - 0.6, SW + 0.6), { tone: "mid" });
    out += dots([[b, -SW + 1.4, ZB + 1.6], [b, SW - 1.4, ZB + 1.6], [b, -SW + 1.4, ZB + SH - 1.2], [b, SW - 1.4, ZB + SH - 1.2]], 0.36);
    // rear end cap with its handle lug
    out += solid(box(a - 1.6, a, ZB + 1.2, ZB + SH - 1.2, -SW + 1.2, SW - 1.2), { tone: "mid" });
    put(sleeveKey, out);

    // counterweight: three slotted plates on top of the sleeve, a tie-bar clamp on top
    let cw = "";
    const c0 = M.cw.x - 8, c1 = M.cw.x + 8, cz = ZB + SH;
    for (let i = 0; i < 3; i++) {
      const z0 = cz + i * 5;
      cw += solid(box(c0, c1, z0, z0 + 5, -10, 10), { tone: i === 1 ? "lo" : "mid" });
    }
    cw += solid(box(c0 + 2, c1 - 2, cz + 15, cz + 17, -3, 3), { tone: "mid" });
    cw += solid(prismY(K, P, circleXZ(...T(M.cw.x, cz + 19), 2.2, 16), -1.6, 1.6), { tone: "mid", crease: "none" });
    cw += dots([[c0 + 3.5, 3, cz + 17], [c1 - 3.5, 3, cz + 17]], 0.4);
    cw += dots([[c0 + 2, 10, cz + 2.5], [c1 - 2, 10, cz + 2.5], [c0 + 2, 10, cz + 12.5], [c1 - 2, 10, cz + 12.5]], 0.4);
    put(sleeveKey + 0.5, cw);

    // first stage: only the part outside the sleeve is drawn
    const s1a = Math.max(M.stage1.a + S.e * M.stage1.share, b), s1b = M.stage1.b + S.e * M.stage1.share;
    let st1 = solid(box(s1a, s1b, ZB + 1, ZB + 10, -S1W, S1W), { tone: "mid" });
    st1 += solid(box(s1b - 2.4, s1b, ZB + 0.6, ZB + 10.4, -S1W - 0.4, S1W + 0.4), { tone: "mid" });
    st1 += dots([[s1b, -S1W + 1.2, ZB + 1.8], [s1b, S1W - 1.2, ZB + 1.8]], 0.34);
    put(sleeveKey + 1, st1);

    // second stage: only the part outside the first stage
    const s2a = Math.max(M.stage2.a + S.e * M.stage2.share, s1b), s2b = M.head.x - M.head.len / 2 + S.e;
    let st2 = solid(box(s2a, s2b, ZB + 2, ZB + 8, -S2W, S2W), { tone: "mid" });
    const marks = [];
    for (let x = Math.ceil((s2a + 1) / 10) * 10; x < s2b - 1; x += 10) marks.push(seg([x, S2W, ZB + 2], [x, S2W, ZB + 4]));
    if (marks.length) st2 += line(marks.join(""), { tone: "lo" });
    put(sleeveKey + 2, st2);

    // the head: the load carried at the tip, lit
    const h0 = M.head.x - M.head.len / 2 + S.e, h1 = h0 + M.head.len;
    let hd = solid(box(h0, h1, ZB - 1, ZB + 13, -7, 7), { tone: "hi", lit: true, crease: "lo" });
    hd += solid(poly([[h0 + 2.5, ZB + 13], [h1 - 2.5, ZB + 13], [h1 - 3.5, ZB + 16], [h0 + 3.5, ZB + 16]], -1.6, 1.6), { tone: "mid", crease: "none" });
    hd += solid(prismY(K, P, circleXZ(...T((h0 + h1) / 2, ZB + 16.6), 1.9, 16), -1.2, 1.2), { tone: "mid", crease: "none" });
    hd += dots([[h0 + 2, 7, ZB + 1], [h1 - 2, 7, ZB + 1], [h0 + 2, 7, ZB + 11], [h1 - 2, 7, ZB + 11]], 0.42);
    hd += line(seg([h0, 7, ZB + 6], [h1, 7, ZB + 6]), { tone: "lo" });
    put(sleeveKey + 3, hd);
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The gauge needle for a moment ratio q: 270 degree sweep over 0 .. 1.5.
export function needle(K, P, D, q) {
  const f = Math.max(0, Math.min(1, q / 1.5));
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
