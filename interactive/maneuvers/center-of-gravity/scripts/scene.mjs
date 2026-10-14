// The moving half of the figure: the nine arch stones (the lit keystone among them), the
// piers and tray parts they pass in front of or behind, the screw puller, and the bank of
// load columns. Rebuilt per frame. Written against the kit as a parameter (K) and the model
// (M) so build.mjs (Node) and the page (inlined kit) run the same code. build.mjs inlines
// this file with `export` stripped.

export const GEO = {
  PZ: 24,          // springing level: top of the piers
  X0: -8,          // arch faces, x
  X1: 8,
  KTOP: 49,        // keystone top, above the springing centre (proud of the 46 mm extrados)
  BEAM: 100,       // underside of the puller beam
  HUB: 114,        // top of the hand-wheel hub
  ROD_TOP: 116,    // top of the screw at rest
  FLOOR: 1.2,      // tray floor top
  T1: 0.55,        // seconds the half arches take to lean in and meet
  T2: 0.8,         // seconds the crown stones take to fall into the tray
  TUBE_X: 43,      // load columns
  PER_W: 3,        // column height per stone weight, mm
};
GEO.TEND = GEO.T1 + GEO.T2;

const SC_D = Math.PI / 180;
const sc_pol = (r, deg) => [r * Math.sin(deg * SC_D), r * Math.cos(deg * SC_D)];
const sc_rot = ([y, z], a) => [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const sc_smooth = (u) => u * u * (3 - 2 * u);

// Stone i (0 keystone, -4..4) as a convex outline in the arch plane: [y, z] about the springing centre.
export function stonePoly(i, M) {
  const h = M.half;
  if (i === 0) {
    const t = Math.tan(h * SC_D) * GEO.KTOP;
    const [y0, z0] = sc_pol(M.R1, h);
    return [[-y0, z0], [y0, z0], [t, GEO.KTOP], [-t, GEO.KTOP]];
  }
  const phi = 2 * h * i;
  const a0 = phi - h, a1 = phi + h;
  const pts = [sc_pol(M.R1, a0), sc_pol(M.R1, a1)];
  for (let k = 0; k <= 4; k++) pts.push(sc_pol(M.R2, a1 - (k * (a1 - a0)) / 4));
  return pts;
}
const sc_centroid = (poly) => {
  let a = 0, cy = 0, cz = 0;
  poly.forEach(([y0, z0], k) => {
    const [y1, z1] = poly[(k + 1) % poly.length];
    const c = y0 * z1 - y1 * z0;
    a += c; cy += (y0 + y1) * c; cz += (z0 + z1) * c;
  });
  return [cy / (3 * a), cz / (3 * a)];
};

// The angle at which the two leaning halves would touch at the crown (top inner corner of stone 1 reaches y = 0).
export function meetAngle(M) {
  const [cy, cz] = sc_pol(M.R2, M.half);
  const rel = [cy - M.R1, cz];
  let lo = 0, hi = 0.6;
  for (let n = 0; n < 50; n++) {
    const mid = (lo + hi) / 2;
    const y = M.R1 + sc_rot(rel, mid)[0];
    if (y > 0) lo = mid; else hi = mid;
  }
  return lo;
}

// Where the crown stones come to rest in the tray, lying on their crown-side joint face.
export function restPoses(M) {
  const out = {};
  let edge = 0.4;
  for (const n of [1, 2]) {
    const poly = stonePoly(n, M);
    const c = sc_centroid(poly);
    const beta = 2 * M.half * n - M.half;
    const ang = (90 + beta) * SC_D;
    const pts = poly.map((p) => sc_rot([p[0] - c[0], p[1] - c[1]], ang));
    const ys = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    const cy = edge - Math.min(...ys);
    const cz = GEO.FLOOR - GEO.PZ - Math.min(...zs);
    out[n] = { c: [cy, cz], ang, span: [edge, cy + Math.max(...ys)] };
    edge = cy + Math.max(...ys) + 0.6;
  }
  return out;
}

// Each stone's pose: its centroid now and its turn, from the lift e and the collapse clock c.
export function poseOf(i, e, c, M, extra) {
  const poly = stonePoly(i, M);
  const c0 = sc_centroid(poly);
  if (i === 0) return { poly, c0, at: [c0[0], c0[1] + e], ang: 0 };
  const s = Math.sign(i), n = Math.abs(i);
  const piv = [s * M.R1, 0];
  const lean0 = extra.lean(e, M);
  const hold = extra.hold;
  const swing = (th) => {
    const r = sc_rot([c0[0] - piv[0], c0[1] - piv[1]], s * th);
    return { poly, c0, at: [piv[0] + r[0], piv[1] + r[1]], ang: s * th };
  };
  if (c <= 0) return swing(lean0);
  const leanC = extra.lean(M.EC, M);
  if (c < GEO.T1) { const u = c / GEO.T1; return swing(leanC + (hold - leanC) * u * u); }
  const u = Math.min(1, (c - GEO.T1) / GEO.T2);
  if (n >= 3) return swing(hold * (1 - sc_smooth(u)));
  const d = swing(hold);
  const r = extra.rest[n];
  const ry = s * r.c[0], ra = s * r.ang;
  const y = d.at[0] + (ry - d.at[0]) * (1 - (1 - u) * (1 - u));
  const z = d.at[1] + (r.c[1] - d.at[1]) * u * u;
  return { poly, c0, at: [y, z], ang: d.ang + (ra - d.ang) * u };
}

export function scene(K, P, M, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const { sinA, cosA } = { sinA: Math.sin((P.azimuth ?? 45) * SC_D), cosA: Math.cos((P.azimuth ?? 45) * SC_D) };
  const E = (P.elevation ?? 30) * SC_D;
  const V = [cosA * Math.cos(E), sinA * Math.cos(E), Math.sin(E)];
  const Lr = [-sinA, cosA, 1.2], Ln = Math.hypot(...Lr);
  const L = Lr.map((v) => v / Ln);
  const BANDS = [0, 0.2, 0.42, 0.62];
  const band = (score) => { let t = 0; while (t < BANDS.length && score >= BANDS[t]) t++; return t; };

  // A prism of a convex [y, z] outline between two x planes, shaded by the kit's light and bands.
  function wedge(poly, x0, x1) {
    let area = 0;
    poly.forEach(([a, b], k) => { const [c, d] = poly[(k + 1) % poly.length]; area += a * d - c * b; });
    const ring = area < 0 ? [...poly].reverse() : poly;
    const n = ring.length;
    const lo = ring.map(([y, z]) => at([x0, y, z]));
    const hi = ring.map(([y, z]) => at([x1, y, z]));
    const buckets = [[], [], [], [], []];
    const seen = [];
    for (let j = 0; j < n; j++) {
      const [y0, z0] = ring[j], [y1, z1] = ring[(j + 1) % n];
      const len = Math.hypot(y1 - y0, z1 - z0) || 1;
      const nm = [0, (z1 - z0) / len, -(y1 - y0) / len];
      const vis = nm[1] * V[1] + nm[2] * V[2] > 1e-6;
      seen.push(vis);
      if (vis) buckets[band(nm[1] * L[1] + nm[2] * L[2])].push(K.pathOf([lo[j], lo[(j + 1) % n], hi[(j + 1) % n], hi[j]], true));
    }
    const capHi = V[0] > 0;
    const cap = capHi ? hi : lo;
    buckets[band(capHi ? L[0] : -L[0])].push(K.pathOf(cap, true));
    const creases = [];
    for (let j = 0; j < n; j++) {
      const prev = (j - 1 + n) % n;
      const a = [ring[j][0] - ring[prev][0], ring[j][1] - ring[prev][1]];
      const b = [ring[(j + 1) % n][0] - ring[j][0], ring[(j + 1) % n][1] - ring[j][1]];
      const cs = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b) || 1);
      if (cs < Math.cos(0.35) && seen[j] && seen[prev]) creases.push(K.pathOf([lo[j], hi[j]]));
      if (seen[j]) creases.push(K.pathOf([cap[j], cap[(j + 1) % n]]));
    }
    const hull = sc_hull([...lo, ...hi]);
    return { fill: K.pathOf(hull, true), outline: K.pathOf(hull, true), crease: creases.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) };
  }

  const world = (pose) => pose.poly.map(([y, z]) => {
    const r = sc_rot([y - pose.c0[0], z - pose.c0[1]], pose.ang);
    return [pose.at[0] + r[0], GEO.PZ + pose.at[1] + r[1]];
  });

  // ---- the arch stones ----
  const extra = { lean: S.lean, hold: S.hold, rest: S.rest };
  for (let i = -M.stones; i <= M.stones; i++) {
    const pose = poseOf(i, S.e, S.c, M, extra);
    const pts = world(pose);
    const key = depth(0, pose.at[0], GEO.PZ + pose.at[1]);
    if (i !== 0) {
      put(key, solid(wedge(pts, GEO.X0, GEO.X1), { tone: "mid" }));
      continue;
    }
    // keystone, lug, pin, coupling and the screw below the beam
    const top = GEO.PZ + GEO.KTOP + S.e;
    let out = solid(wedge(pts, GEO.X0, GEO.X1), { tone: "hi", lit: true, crease: "lo" });
    out += solid(K.slabOf({ x: -3, y: -2.6, w: 6, d: 5.2, r: 0.6 }, top, 3.4, P, 2, 0.3), { tone: "mid" });
    out += line(K.sideRing([3, 0, top + 1.8], 1, "x", P, 16), { tone: "lo" });
    out += K.dotsSvg([at([3, 0, top + 1.8])], { size: 0.45 });
    out += solid(K.cylinder(0, 0, 2.4, top + 3.4, 2.6, P, 20), { tone: "mid", inner: line(K.sideArc(0, 0, 2.4, top + 4.7, P, 16), { tone: "faint" }) });
    const r0 = top + 6, r1 = GEO.BEAM;
    let threads = "";
    for (let z = r0 + 1.2 + ((S.e * 1.25) % 1.5); z < r1 - 0.4; z += 1.5) threads += K.sideArc(0, 0, 1.4, z, P, 10);
    out += solid(K.cylinder(0, 0, 1.4, r0, r1 - r0, P, 16), { tone: "mid", crease: "none", inner: line(threads, { tone: "faint" }) });
    put(key, out);
  }

  // ---- piers: plinth, coursed body, impost ----
  for (const s of [-1, 1]) {
    const y0 = s > 0 ? 32 : -58;
    const plinth = { x: -14, y: y0, w: 28, d: 26, r: 1.5 };
    const body = { x: -10, y: s > 0 ? 33.5 : -55.5, w: 20, d: 22, r: 0.8 };
    const cap = { x: -11.5, y: s > 0 ? 32.5 : -56.5, w: 23, d: 24, r: 1 };
    let out = `<path class="iso-halo" d="${K.haloOf(plinth, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    out += solid(K.slabOf(plinth, 0, 4, P, 3, 0.5), { tone: "mid" });
    out += K.dotsSvg(K.corners(plinth, 2.4).map(([x, y]) => at([x, y, 4])), { size: 0.42 });
    out += solid(K.slabOf(body, 4, 17, P, 2), { tone: "mid", inner: line(K.sideSeam(body, 9.6, P, 2) + K.sideSeam(body, 15.2, P, 2), { tone: "faint" }) });
    out += solid(K.slabOf(cap, 21, 3, P, 3, 0.5), { tone: "mid" });
    put(depth(0, s * 45, 12), out);
  }

  // ---- posts of the puller frame ----
  for (const s of [-1, 1]) {
    const flange = { x: -8, y: s > 0 ? 64 : -76, w: 16, d: 12, r: 1.5 };
    const col = { x: -4.5, y: s > 0 ? 66.5 : -73.5, w: 9, d: 7, r: 0.8 };
    let out = solid(K.slabOf(flange, 0, 3, P, 3, 0.4), { tone: "mid" });
    out += K.dotsSvg(K.corners(flange, 2).map(([x, y]) => at([x, y, 3])), { size: 0.45 });
    out += solid(K.slabOf(col, 3, GEO.BEAM - 7, P, 2), { tone: "mid", inner: line(K.sideSeam(col, 10, P, 2), { tone: "faint" }) });
    const capP = { x: -6, y: s > 0 ? 65 : -75, w: 12, d: 10, r: 0.8 };
    out += solid(K.slabOf(capP, GEO.BEAM - 4, 4, P, 2, 0.3), { tone: "mid" });
    put(depth(0, s * 70, 0), out);
  }

  // ---- tray rims: in front of the fallen stones, behind the near pier ----
  const rimKey = depth(0, 45, 12) - 0.5;
  put(rimKey, solid(K.slabOf({ x: -10.5, y: 29.5, w: 21, d: 1.5, r: 0.4 }, GEO.FLOOR, 3.4, P, 2), { tone: "lo" }));
  put(rimKey + 0.1, solid(K.slabOf({ x: 10.5, y: -31, w: 1.5, d: 62, r: 0.5 }, 0, 4.6, P, 2, 0.3), { tone: "lo" }));

  // ---- the puller: beam, nut block, hand wheel, hub, screw top ----
  {
    const beam = { x: -6, y: -75, w: 12, d: 150, r: 1.5 };
    let out = solid(K.slabOf(beam, GEO.BEAM, 6, P, 3, 0.6), { tone: "mid", inner: line(K.sideSeam(beam, GEO.BEAM + 2, P, 3), { tone: "faint" }) });
    out += K.dotsSvg([[-3, 70], [3, 70], [-3, -70], [3, -70]].map(([x, y]) => at([x, y, GEO.BEAM + 6])), { size: 0.45 });
    const nut = { x: -6, y: -6, w: 12, d: 12, r: 1.2 };
    out += solid(K.slabOf(nut, GEO.BEAM + 6, 3.5, P, 3, 0.4), { tone: "mid" });
    out += K.dotsSvg(K.corners(nut, 1.8).map(([x, y]) => at([x, y, GEO.BEAM + 9.5])), { size: 0.42 });
    const wz = GEO.BEAM + 9.5, wt = wz + 2.5;
    out += solid(K.cylinder(0, 0, 10, wz, 2.5, P, 56, 0.5), { tone: "mid" });
    out += line(K.knurl(0, 0, 10, wz, wt, 64, P, 0.3), { tone: "lo" });
    out += line(K.ring(0, 0, 8, wt, P, 48), { tone: "lo" });
    const spin = S.spin;
    let spokes = "";
    for (let k = 0; k < 3; k++) {
      const a = spin + (k * 2 * Math.PI) / 3;
      spokes += K.lineOnTop([2.4 * Math.cos(a), 2.4 * Math.sin(a)], [8 * Math.cos(a), 8 * Math.sin(a)], wt, P);
    }
    out += line(spokes, { tone: "mid" });
    out += solid(K.cylinder(0, 0, 3, wt, GEO.HUB - wt, P, 24), { tone: "mid" });
    const rt = GEO.ROD_TOP + S.e;
    let th = "";
    for (let z = rt - 1.6 - 0.9; z > GEO.HUB + 0.4; z -= 1.5) th += K.sideArc(0, 0, 1.4, z, P, 10);
    if (rt - 1.6 > GEO.HUB + 0.05) out += solid(K.cylinder(0, 0, 1.4, GEO.HUB, rt - 1.6 - GEO.HUB, P, 16), { tone: "mid", crease: "none", inner: line(th, { tone: "faint" }) });
    out += solid(K.cylinder(0, 0, 2.3, rt - 1.6, 1.6, P, 6, 0.2), { tone: "mid" });
    put(1e4, out);
  }

  // ---- load columns: one per stone, left to right as in the arch ----
  {
    const X = GEO.TUBE_X;
    const base = { x: 37, y: -54, w: 12, d: 108, r: 2 };
    let out = `<path class="iso-halo" d="${K.haloOf(base, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    out += solid(K.slabOf(base, 0, 5, P, 4, 0.6), { tone: "mid" });
    out += line(K.planOutline(K.insetPlan(base, 2.2), 5, P), { tone: "faint" });
    out += K.dotsSvg([[39, -52], [47, -52], [39, 52], [47, 52]].map(([x, y]) => at([x, y, 5])), { size: 0.45 });
    put(2e4, out);
    const postL = { x: 39, y: -52, w: 8, d: 4, r: 0.6 };
    put(2e4 + 1, solid(K.slabOf(postL, 5, 18, P, 2), { tone: "mid" }));
    const [px, py] = [-sinA * 1.7, cosA * 1.7];
    for (let k = 0; k <= 2 * M.stones; k++) {
      const y = -40 + 10 * k;
      const h = S.heights[Math.abs(k - M.stones)];
      let t = solid(K.cylinder(X, y, 2.6, 5, 2, P, 20), { tone: "mid" });
      t += line(K.ring(X, y, 1.7, 7, P, 18), { tone: "lo" });
      if (h > 0.15) t += solid(K.cylinder(X, y, 1.2, 7, h, P, 14), { tone: "hi", crease: "none" });
      t += line(K.segment([X - px, y - py, 7], [X - px, y - py, 23], P) + K.segment([X + px, y + py, 7], [X + px, y + py, 23], P), { tone: "lo" });
      put(2e4 + 2 + k * 0.01, t);
    }
    const postR = { x: 39, y: 48, w: 8, d: 4, r: 0.6 };
    let ticks = { minor: "", major: "" };
    for (let q = 1; q <= 9; q++) {
      const z = 7 + q * GEO.PER_W / 2;
      const big = q % 2 === 0;
      ticks[big ? "major" : "minor"] += K.segment([47, 48, z], [47, 48 + (big ? 1.8 : 1.1), z], P);
    }
    put(2e4 + 3, solid(K.slabOf(postR, 5, 18, P, 2), { tone: "mid" }) + line(ticks.minor, { tone: "lo" }) + line(ticks.major, { tone: "mid" }));
    const bar = { x: 39, y: -52, w: 8, d: 104, r: 1.2 };
    let rings = "";
    for (let k = 0; k <= 2 * M.stones; k++) rings += K.ring(X, -40 + 10 * k, 1.7, 26, P, 16);
    put(2e4 + 4, solid(K.slabOf(bar, 23, 3, P, 3, 0.4), { tone: "mid" }) + line(rings, { tone: "lo" }) +
      K.dotsSvg([[43, -50], [43, 50]].map(([x, y]) => at([x, y, 26])), { size: 0.45 }));
  }

  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

function sc_hull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of sorted) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (let k = sorted.length - 1; k >= 0; k--) { const p = sorted[k]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
