// The moving half of the figure: the nine arch stones (the lit keystone among them), the four
// pinned props under the arch, the piers and catch pad they pass in front of or behind, and the
// dial indicator on its stand. Rebuilt per frame. Written against the kit as a parameter (K) and
// the model (M) so build.mjs (Node) and the page (inlined kit) run the same code. build.mjs
// inlines this file with `export` stripped.

export const GEO = {
  PZ: 24,          // springing level: top of the piers
  X0: -8,          // arch faces, x
  X1: 8,
  R1: 34,          // intrados radius
  R2: 46,          // extrados radius
  HALF: 10,        // half the wedge angle of every stone, degrees
  KTOP: 49,        // keystone top above the springing centre
  PAD: 10,         // top of the catch pad under the crown
  FLOOR: 1,        // top of the pin tray floor
  PIN_R: 0.7,      // pin radius
  KNOB_R: 1.0,     // pin knob radius
  PIN0: -3.6,      // pin back end at rest, x
  PIN1: 8.4,       // pin front end (knob face) at rest, x
  SLIDE: 14,       // how far a pulled pin slides out, x
  G: 380,          // fall acceleration for the choreography, mm/s² (slowed for reading)
  T_LEAN0: 0.3,    // seconds after failure the unpropped halves start to lean in
  T_LEAN: 0.5,     // seconds the lean takes
  DIAL_Z: 84.2,    // dial face
  STAND_X: -26,    // stand pillar
};
GEO.TEND = GEO.T_LEAN0 + GEO.T_LEAN;
// Props, left to right as the reader sees them (+y is on the left): under stones 2, 1, -1, -2. ZC is the bottom of the collar that holds the pin.
GEO.PROPS = [
  { y: 21.5, stone: 2, ZC: 30 },
  { y: 12.25, stone: 1, ZC: 34 },
  { y: -12.25, stone: -1, ZC: 34 },
  { y: -21.5, stone: -2, ZC: 30 },
];

const DP_D = Math.PI / 180;
const dp_pol = (r, deg) => [r * Math.sin(deg * DP_D), r * Math.cos(deg * DP_D)];
const dp_rot = ([y, z], a) => [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const dp_clamp01 = (v) => Math.min(1, Math.max(0, v));
const dp_ease = (u) => u * u * (3 - 2 * u);

// Stone i (0 keystone, -4..4) as a convex outline in the arch plane: [y, z] about the springing centre.
export function stonePoly(i) {
  const h = GEO.HALF;
  if (i === 0) {
    const t = Math.tan(h * DP_D) * GEO.KTOP;
    const [y0, z0] = dp_pol(GEO.R1, h);
    return [[-y0, z0], [y0, z0], [t, GEO.KTOP], [-t, GEO.KTOP]];
  }
  const phi = 2 * h * i;
  const a0 = phi - h, a1 = phi + h;
  const pts = [dp_pol(GEO.R1, a0), dp_pol(GEO.R1, a1)];
  for (let k = 0; k <= 4; k++) pts.push(dp_pol(GEO.R2, a1 - (k * (a1 - a0)) / 4));
  return pts;
}
const dp_centroid = (poly) => {
  let a = 0, cy = 0, cz = 0;
  poly.forEach(([y0, z0], k) => {
    const [y1, z1] = poly[(k + 1) % poly.length];
    const c = y0 * z1 - y1 * z0;
    a += c; cy += (y0 + y1) * c; cz += (z0 + z1) * c;
  });
  return [cy / (3 * a), cz / (3 * a)];
};

// The angle at which a half arch, leaning in about its springing, would touch the centre line.
export function meetAngle() {
  const [cy, cz] = dp_pol(GEO.R2, GEO.HALF);
  const rel = [cy - GEO.R1, cz];
  let lo = 0, hi = 0.6;
  for (let n = 0; n < 50; n++) {
    const mid = (lo + hi) / 2;
    if (GEO.R1 + dp_rot(rel, mid)[0] > 0) lo = mid; else hi = mid;
  }
  return lo;
}

// Height (above the springing centre) of a stone's intrados chord at |y|, for stone n = 1 or 2.
export function chordZ(n, y) {
  const [ya, za] = dp_pol(GEO.R1, 20 * n - GEO.HALF);
  const [yb, zb] = dp_pol(GEO.R1, 20 * n + GEO.HALF);
  return za + ((Math.abs(y) - ya) * (zb - za)) / (yb - ya);
}

// A prop's fixed numbers: head span, head-plate bottom (absolute z), pin height.
export function propGeo(p) {
  const s = Math.sign(p.y), n = Math.abs(p.stone);
  const ya = Math.abs(p.y) - 2.25, yb = Math.abs(p.y) + 2.25;
  const za = GEO.PZ + chordZ(n, ya), zb = GEO.PZ + chordZ(n, yb);
  const HB = Math.min(za, zb) - 2.5;
  return { s, ya: s * ya, yb: s * yb, za, zb, HB, zp: p.ZC + 1.5 };
}

// Where a prop's pin is and how far its head has dropped, from its progress p (0 pinned, 1 pulled and landed).
export function propState(p, M) {
  const slide = GEO.SLIDE * dp_ease(dp_clamp01(p / 0.45));
  const f = dp_clamp01((p - 0.45) / 0.3);
  const u = dp_clamp01((p - 0.35) / 0.2);
  return { slide, fall: f * f, drop: M.drop * u * u, out: u * u };
}

// Each stone's pose: lean (radians, about its springing) for stones; the keystone's drop.
function poseOf(i, S) {
  const poly = stonePoly(i);
  const c0 = dp_centroid(poly);
  if (i === 0) return { poly, c0, at: [c0[0], c0[1] - S.kdrop], ang: 0 };
  const s = Math.sign(i);
  const th = s > 0 ? S.leanL : S.leanR;  // +y half is on the reader's left
  const piv = [s * GEO.R1, 0];
  const r = dp_rot([c0[0] - piv[0], c0[1] - piv[1]], s * th);
  return { poly, c0, at: [piv[0] + r[0], piv[1] + r[1]], ang: s * th };
}

export function scene(K, P, M, S) {
  const groups = { far: [], left: [], mid: [], right: [], top: [] };
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const az = (P.azimuth ?? 45) * DP_D;
  const sinA = Math.sin(az), cosA = Math.cos(az);
  const E = (P.elevation ?? 30) * DP_D;
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
    const hull = dp_hull([...lo, ...hi]);
    return { fill: K.pathOf(hull, true), outline: K.pathOf(hull, true), crease: creases.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) };
  }
  const roundPoly = (cy, cz, r, n = 14) => Array.from({ length: n }, (_, k) => [cy + r * Math.cos((2 * Math.PI * k) / n), cz + r * Math.sin((2 * Math.PI * k) / n)]);

  const world = (pose) => pose.poly.map(([y, z]) => {
    const r = dp_rot([y - pose.c0[0], z - pose.c0[1]], pose.ang);
    return [pose.at[0] + r[0], GEO.PZ + pose.at[1] + r[1]];
  });

  // ---- the arch stones ----
  for (let i = -4; i <= 4; i++) {
    const pose = poseOf(i, S);
    const pts = world(pose);
    const key = depth(0, pose.at[0], GEO.PZ + pose.at[1]);
    if (i === 0) {
      groups.mid.push({ key: 1, svg: solid(wedge(pts, GEO.X0, GEO.X1), { tone: "hi", lit: true, crease: "lo" }) });
      continue;
    }
    (i < 0 ? groups.left : groups.right).push({ key: 100 + key, svg: solid(wedge(pts, GEO.X0, GEO.X1), { tone: "mid" }) });
  }

  // ---- piers: plinth, coursed body, impost ----
  for (const s of [-1, 1]) {
    const plinth = { x: -14, y: s > 0 ? 32 : -58, w: 28, d: 26, r: 1.5 };
    const body = { x: -10, y: s > 0 ? 33.5 : -55.5, w: 20, d: 22, r: 0.8 };
    const cap = { x: -11.5, y: s > 0 ? 32.5 : -56.5, w: 23, d: 24, r: 1 };
    let out = `<path class="iso-halo" d="${K.haloOf(plinth, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    out += solid(K.slabOf(plinth, 0, 4, P, 3, 0.5), { tone: "mid" });
    out += K.dotsSvg(K.corners(plinth, 2.4).map(([x, y]) => at([x, y, 4])), { size: 0.42 });
    out += solid(K.slabOf(body, 4, 17, P, 2), { tone: "mid", inner: line(K.sideSeam(body, 9.6, P, 2) + K.sideSeam(body, 15.2, P, 2), { tone: "faint" }) });
    out += solid(K.slabOf(cap, 21, 3, P, 3, 0.5), { tone: "mid" });
    (s < 0 ? groups.left : groups.right).push({ key: s < 0 ? -10 : 50, svg: out });
  }

  // ---- props: base plate, outer tube, collar with its pin, inner tube with holes, head plate, wedge ----
  GEO.PROPS.forEach((p, idx) => {
    const g = propGeo(p);
    const st = propState(S.props[idx], M);
    const yc = p.y, d = st.drop;
    const basePlan = { x: -3.6, y: yc - 3.6, w: 7.2, d: 7.2, r: 0.8 };
    let out = `<path class="iso-halo" d="${K.haloOf(basePlan, 0, 0.1, P)}" style="filter:blur(2px)"/>`;
    out += solid(K.slabOf(basePlan, 0, 1.4, P, 2, 0.3), { tone: "mid" });
    out += K.dotsSvg(K.corners(basePlan, 1.2).map(([x, y]) => at([x, y, 1.4])), { size: 0.4 });
    out += solid(K.cylinder(0, yc, 1.8, 1.4, p.ZC - 1.4, P, 20), { tone: "mid", crease: "none" });
    // inner tube: hidden below the collar top, so it is drawn first and the collar over it
    const tubeTop = g.HB - d;
    const holes = [];
    for (let z = p.ZC + 4.4 - d; z < tubeTop - 1; z += 2.6) if (z > p.ZC + 3.8) holes.push(at([cosA * 1.25, yc + sinA * 1.25, z]));
    out += solid(K.cylinder(0, yc, 1.25, p.ZC + 3, tubeTop - p.ZC - 3, P, 18), { tone: "mid", crease: "none" });
    if (holes.length) out += K.dotsSvg(holes, { size: 0.32 });
    // collar with two thread lines
    out += solid(K.cylinder(0, yc, 2.6, p.ZC, 3, P, 24, 0.3), { tone: "mid", inner: line(K.sideArc(0, yc, 2.6, p.ZC + 1, P, 16) + K.sideArc(0, yc, 2.6, p.ZC + 2, P, 16), { tone: "faint" }) });
    // head plate and wedge seated on the stone's intrados
    const hp = { x: -4.5, y: yc - 2.75, w: 9, d: 5.5, r: 0.5 };
    out += solid(K.slabOf(hp, g.HB - d, 1, P, 2, 0.2), { tone: "mid" });
    const head = [[g.ya, g.HB + 1 - d], [g.yb, g.HB + 1 - d], [g.yb, g.zb - d], [g.ya, g.za - d]];
    out += solid(wedge(head, -4, 4), { tone: "mid" });
    // the pin: through the collar, out along x, then down into the tray
    const zpin = g.zp + (GEO.FLOOR + GEO.KNOB_R - g.zp) * st.fall;
    const back = GEO.PIN0 + st.slide, front = GEO.PIN1 + st.slide;
    const surf = 2.4;
    if (back > 2.6 - 0.05 || st.fall > 0) out += line(K.sideRing([2.62, yc, g.zp], GEO.PIN_R, "x", P, 14), { tone: "lo" });
    const x0 = Math.max(back, surf);
    if (front > x0 + 0.1) out += solid(wedge(roundPoly(yc, zpin, GEO.PIN_R), x0, front), { tone: "hi" });
    out += solid(wedge(roundPoly(yc, zpin, GEO.KNOB_R, 16), front, front + 1.2), { tone: "mid" });
    const side = yc < 0 ? groups.left : groups.right;
    side.push({ key: Math.abs(yc) > 15 ? (yc < 0 ? 0 : 20) : 10, svg: out });
  });

  // ---- catch pad under the crown ----
  {
    const block = { x: -7, y: -7, w: 14, d: 14, r: 1 };
    const pad = { x: -6, y: -6, w: 12, d: 12, r: 1.5 };
    let out = `<path class="iso-halo" d="${K.haloOf(block, 0, 0.1, P)}" style="filter:blur(2px)"/>`;
    out += solid(K.slabOf(block, 0, 8, P, 2, 0.4), { tone: "mid", inner: line(K.sideSeam(block, 4, P, 2), { tone: "faint" }) });
    out += solid(K.slabOf(pad, 8, GEO.PAD - 8, P, 3), { tone: "lo" });
    out += line(K.planOutline(K.insetPlan(pad, 1.6), GEO.PAD, P), { tone: "faint" });
    groups.mid.push({ key: 0, svg: out });
  }

  // ---- dial stand behind the arch: magnetic base, pillar ----
  {
    const X = GEO.STAND_X;
    const base = { x: X - 6, y: -7, w: 12, d: 14, r: 1.2 };
    let out = `<path class="iso-halo" d="${K.haloOf(base, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    out += solid(K.slabOf(base, 0, 7, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(base, 2.2, P, 3), { tone: "faint" }) });
    out += K.dotsSvg(K.corners(base, 1.8).map(([x, y]) => at([x, y, 7])), { size: 0.42 });
    out += solid(K.cylinder(X, 4.2, 1.6, 7, 1.2, P, 18), { tone: "mid" });
    out += solid(K.cylinder(X, 4.2, 1.2, 8.2, 2.4, P, 16), { tone: "mid", inner: line(K.knurl(X, 4.2, 1.2, 8.2, 10.6, 16, P, 0.3), { tone: "lo" }) });
    out += solid(K.cylinder(X, 0, 1.6, 7, 69, P, 20), { tone: "mid", crease: "none" });
    groups.far.push({ key: 0, svg: out });
  }

  // ---- arm, clamp and the dial indicator over the crown ----
  {
    const X = GEO.STAND_X;
    const clamp = { x: X - 2.6, y: -2.6, w: 5.2, d: 5.2, r: 0.8 };
    let out = solid(K.slabOf(clamp, 76, 5.4, P, 2, 0.3), { tone: "mid" });
    out += solid(K.cylinder(X, 0, 1.6, 81.4, 1.2, P, 18), { tone: "mid" });
    out += K.dotsSvg([at([X, 0, 82.6])], { size: 0.4 });
    out += solid(K.slabOf({ x: X + 2.6, y: -1.2, w: 21.4, d: 2.4, r: 0.4 }, 77.4, 2.4, P, 2), { tone: "mid" });
    const dc = { x: -2.6, y: -2.6, w: 5.2, d: 5.2, r: 0.8 };
    // plunger: foot on the keystone, stem up into the clamp
    const tip = GEO.PZ + GEO.KTOP + S.plunge;
    out += solid(K.cylinder(0, 0, 1.3, tip, 0.8, P, 16, 0.2), { tone: "mid" });
    out += solid(K.cylinder(0, 0, 0.75, tip + 0.8, 76.6 - tip - 0.8, P, 14), { tone: "mid", crease: "none" });
    out += solid(K.slabOf(dc, 76.6, 3.6, P, 2, 0.3), { tone: "mid" });
    out += solid(K.cylinder(0, 0, 7, 80.2, GEO.DIAL_Z - 80.2, P, 48, 0.5), { tone: "mid", inner: line(K.sideArc(0, 0, 7, 81.6, P, 32), { tone: "faint" }) });
    const Z = GEO.DIAL_Z;
    out += line(K.ring(0, 0, 6.2, Z, P, 48), { tone: "lo" });
    const far = Math.atan2(-cosA, sinA);
    const sweep = 1.5 * Math.PI, from = far - sweep / 2;
    const t = K.radialTicks(0, 0, 6.2, 15, 5, Z, [0.8, 1.8], P, from, sweep);
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    // over-capacity arc, 100% to 150%, at the inner ends of the major ticks
    const arc = [];
    for (let k = 0; k <= 16; k++) {
      const a = from + sweep * (2 / 3 + (k / 16) / 3);
      arc.push([4.4 * Math.sin(a), -4.4 * Math.cos(a)]);
    }
    out += line(K.onTop(arc, Z, P), { tone: "mid" });
    const a = from + sweep * S.needle;
    out += line(K.lineOnTop([0, 0], [5.4 * Math.sin(a), -5.4 * Math.cos(a)], Z + 0.05, P), { tone: "hi", free: "end" });
    out += line(K.lineOnTop([0, 0], [-1.4 * Math.sin(a), 1.4 * Math.cos(a)], Z + 0.05, P), { tone: "hi", free: "end" });
    out += K.dotsSvg([at([0, 0, Z + 0.05])], { size: 0.7 });
    groups.top.push({ key: 0, svg: out });
  }

  const order = (list) => list.sort((a, b) => a.key - b.key).map((it) => it.svg).join("");
  return order(groups.far) + order(groups.left) + order(groups.mid) + order(groups.right) + order(groups.top);
}

function dp_hull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of sorted) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (let k = sorted.length - 1; k >= 0; k--) { const p = sorted[k]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
