// The moving half of the machine: the iris leaves on their radial slides, the enemy block on its
// hub, the breakout block on its slide, the scroll ring's teeth, the lead screw and its crank, and
// the gap dial's needle. Rebuilt per frame from the model's state. Written against the kit as a
// parameter (K) so build.mjs (Node) and the page (inlined kit) run the same code; build.mjs inlines
// this file with `import` and `export` lines stripped.
import { MODEL, companies, inAt } from "./model.mjs";

const SC_RAD = Math.PI / 180;
const U = MODEL.KM;                       // drawing units per km

export const GEO = {
  AZ: 50,                                 // camera azimuth; the front (toward the viewer) is at this bearing
  R0: MODEL.R0 * U,                       // leaf radius at linkup (72)
  RF: MODEL.RF * U,                       // leaf radius when the squeeze ends (34)
  RIM: 90,                                // leaf radius when a leaf is out (not yet in the ring)
  S: MODEL.S * U,                         // a leaf's arc length (30): what one company covers
  BW: MODEL.BW * U,                       // the breakout block's width (28): the gap it needs
  T: 4,                                   // leaf half-thickness (radial)
  HUB: 26,                                // enemy hub radius
  HOUSE: 104,                             // housing radius (top at z 5)
  RING: [104.5, 112],                     // scroll ring (top at z 5), teeth on its top
  RAIL: [30, 104],                        // leaf slide rails
  BR: [26, 136],                          // the breakout slide: hub edge to the end stop
  SEAT: 17,                               // the breakout block's centre at rest (radius)
  STOP: 60.5,                             // its centre when its front corners meet two leaves at R0
  CLEAR: 130,                             // its centre once through a gap, against the tray's end stop
  SCREW: { x0: -34, x1: 34, y: 116.5, z: 4.5, r: 4.5, pitch: 4.2 },
};
GEO.SEAM = GEO.AZ + 230;                  // world bearing of the seam behind the enemy (upper right on the card)
// world bearing (degrees) of a company bearing a (degrees from the seam)
GEO.bearing = (a) => GEO.SEAM + a;
GEO.at = (r, w) => [r * Math.cos(w * SC_RAD), r * Math.sin(w * SC_RAD)];

// A straight prism along world x of a convex polygon given in (y, z), shaded like the kit's prisms
// (four side tones by facing, the hull as fill and outline, creases at sharp corners).
export function prismX(K, P, poly, s0, s1) {
  const a = (P.azimuth ?? 45) * SC_RAD, e = (P.elevation ?? 30) * SC_RAD;
  const V = [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)];
  const Lr = [-Math.sin(a), Math.cos(a), 1.2], ln = Math.hypot(...Lr);
  const L = Lr.map((v) => v / ln);
  const band = (score) => { const B = [0, 0.2, 0.42, 0.62]; let t = 0; while (t < 4 && score >= B[t]) t++; return t; };
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  let ring = poly.slice();
  let area = 0;
  for (let i = 0; i < ring.length; i++) { const [u0, z0] = ring[i], [u1, z1] = ring[(i + 1) % ring.length]; area += u0 * z1 - u1 * z0; }
  if (area < 0) ring.reverse();
  const n = ring.length;
  const lo = ring.map(([u, z]) => K.iso([s0, u, z], P));
  const hi = ring.map(([u, z]) => K.iso([s1, u, z], P));
  const buckets = [[], [], [], [], []];
  const seen = [];
  for (let j = 0; j < n; j++) {
    const [u0, z0] = ring[j], [u1, z1] = ring[(j + 1) % n];
    let nm = [0, z1 - z0, -(u1 - u0)];
    const len = Math.hypot(...nm) || 1;
    nm = nm.map((v) => v / len);
    const vis = dot(nm, V) > 1e-6;
    seen.push(vis);
    if (vis) buckets[band(dot(nm, L))].push(K.pathOf([lo[j], lo[(j + 1) % n], hi[(j + 1) % n], hi[j]], true));
  }
  const caps = [[lo, [-1, 0, 0]], [hi, [1, 0, 0]]];
  const capSeen = caps.map(([, nm]) => dot(nm, V) > 1e-6);
  caps.forEach(([pts, nm], i) => capSeen[i] && buckets[band(dot(nm, L))].push(K.pathOf(pts, true)));
  const creases = [];
  for (let j = 0; j < n; j++) {
    const pv = (j - 1 + n) % n;
    const d0 = [ring[j][0] - ring[pv][0], ring[j][1] - ring[pv][1]];
    const d1 = [ring[(j + 1) % n][0] - ring[j][0], ring[(j + 1) % n][1] - ring[j][1]];
    const c = (d0[0] * d1[0] + d0[1] * d1[1]) / ((Math.hypot(...d0) * Math.hypot(...d1)) || 1);
    if (c < Math.cos(0.35) && seen[j] && seen[pv]) creases.push(K.pathOf([lo[j], hi[j]]));
  }
  const hull = ec_hull2([...lo, ...hi]);
  return { fill: K.pathOf(hull, true), outline: K.pathOf(hull, true), crease: creases.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) };
}
function ec_hull2(points) {
  const s = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const lower = [], upper = [];
  for (const p of s) { while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-9) lower.pop(); lower.push(p); }
  for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-9) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
const ec_ngon = (cy, cz, r, n, rot = 0) => Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * Math.PI * 2; return [cy + r * Math.cos(a), cz + r * Math.sin(a)]; });

// A box in a radial frame: radius r0..r1 along bearing w (degrees), tangential half-width h.
function ec_radialBox(r0, r1, w, h) {
  const c = Math.cos(w * SC_RAD), s = Math.sin(w * SC_RAD);
  const P2 = (r, t) => [r * c - t * s, r * s + t * c];
  return [P2(r0, -h), P2(r1, -h), P2(r1, h), P2(r0, h)];
}
// An annular sector: radius r0..r1, centred on bearing w, spanning `span` degrees.
function ec_sector(r0, r1, w, span, steps = 10) {
  const out = [];
  for (let i = 0; i <= steps; i++) { const a = (w - span / 2 + (span * i) / steps) * SC_RAD; out.push([r1 * Math.cos(a), r1 * Math.sin(a)]); }
  for (let i = steps; i >= 0; i--) { const a = (w - span / 2 + (span * i) / steps) * SC_RAD; out.push([r0 * Math.cos(a), r0 * Math.sin(a)]); }
  return out;
}

// Where the state puts each leaf: radius and bearing. Before linkup a leaf slides in from the rim
// as its arm's column reaches it; the squeeze then pulls every leaf in together.
export function leaves(S, N) {
  const sq = S.sq || 0;
  return companies(N).map((c) => {
    const rIn = GEO.R0 + (GEO.RF - GEO.R0) * sq;
    const r = GEO.RIM + (rIn - GEO.RIM) * inAt(c, S.p);
    return { ...c, r, w: GEO.bearing(c.a), lit: c.i === 0 || c.i === N - 1 };
  });
}

// The breakout block's centre radius for a state.
export function breakoutR(S) {
  const end = S.thin ? GEO.CLEAR : GEO.STOP;
  return GEO.SEAT + (end - GEO.SEAT) * (S.out || 0);
}

export function scene(K, P, S, N) {
  const items = [];
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, z, size = 0.42) => K.dotsSvg(pts.map(([x, y]) => at([x, y, z])), { size });
  const ex = (pts, z, h, bevel = 0) => K.extrude(pts, z, h, P, { bevel, convex: false });
  const out = [];

  // ---- scroll ring teeth, turned by the screw during the squeeze ----
  {
    const psi = (S.sq || 0) * 48;
    const t = [];
    for (let i = 0; i < 90; i++) {
      const a = (psi + i * 4) * SC_RAD, c = Math.cos(a), s = Math.sin(a);
      t.push(K.lineOnTop([GEO.RING[1] * c, GEO.RING[1] * s], [(GEO.RING[1] - (i % 5 ? 2.2 : 3.6)) * c, (GEO.RING[1] - (i % 5 ? 2.2 : 3.6)) * s], 5, P));
    }
    out.push(line(t.join(""), { tone: "lo" }));
  }

  // ---- slide rails: one per leaf, and the breakout slide (all lie on the housing top, z 5) ----
  const L = leaves(S, N);
  {
    let rails = "";
    const railOf = (w, r0, r1, h, z1) => {
      const pts = ec_radialBox(r0, r1, w, h);
      return solid(K.extrude(pts, 5, z1 - 5, P, { bevel: 0.3 }), { tone: "mid", crease: "faint" });
    };
    const list = L.map((l) => ({ w: l.w, k: depth(...GEO.at(67, l.w)) })).sort((a, b) => a.k - b.k);
    for (const { w } of list) {
      rails += railOf(w, GEO.RAIL[0], GEO.RAIL[1], 3, 7);
      rails += dots([GEO.at(GEO.RAIL[0] + 2.5, w), GEO.at(GEO.RAIL[1] - 2.5, w)], 7, 0.4);
    }
    // the breakout slide, from the hub's edge out over the ring to the tray's end stop
    rails = solid(K.extrude(ec_radialBox(GEO.BR[0], GEO.BR[1], GEO.SEAM, 3), 5, 4, P, { bevel: 0.3 }), { tone: "mid", crease: "faint" }) +
      dots([GEO.at(GEO.HOUSE - 3, GEO.SEAM), GEO.at(GEO.BR[1] - 6, GEO.SEAM)], 9, 0.4) + rails;
    out.push(rails);
  }

  // ---- leaves (iris), the enemy on its hub, the breakout block: depth-sorted with tier rules ----
  const sorted = [];
  for (const l of L) {
    const z0 = 10 + 8 * l.tier;
    const span = (GEO.S / l.r) / SC_RAD;
    let s = "";
    // carriage on the rail, with a gib screw
    s += solid(ex(ec_radialBox(l.r + GEO.T, l.r + GEO.T + 10, l.w, 5), 7, 3, 0.4), { tone: "mid" });
    s += dots([GEO.at(l.r + GEO.T + 7, l.w)], 10, 0.45);
    // upright behind the leaf (the leaf is cantilevered from it)
    s += solid(ex(ec_radialBox(l.r + GEO.T, l.r + GEO.T + 4, l.w, 4), 10, z0 + 7 - 10, 0.3), { tone: "mid" });
    // the leaf itself: an arc of fixed length S
    const leaf = ec_sector(l.r - GEO.T, l.r + GEO.T, l.w, span, 12);
    const seam = K.onTop(ec_sector(l.r - GEO.T + 1.2, l.r + GEO.T - 1.2, l.w, span * (1 - 2.4 / GEO.S), 12), z0 + 7, P, true);
    s += solid(ex(leaf, z0, 7, 0.5), { tone: l.lit ? "hi" : "mid", lit: l.lit, crease: l.lit ? "lo" : "faint", inner: "" });
    s += line(seam, { tone: l.lit ? "lit" : "faint" });
    s += dots([GEO.at(l.r + GEO.T - 1.6, l.w - span * 0.36), GEO.at(l.r + GEO.T - 1.6, l.w + span * 0.36)], z0 + 7, 0.42);
    const [cx, cy] = GEO.at(l.r, l.w);
    const ends = [GEO.at(l.r, l.w - span / 2), GEO.at(l.r, l.w + span / 2), GEO.at(l.r + GEO.T + 10, l.w)];
    sorted.push({ kind: "leaf", l, key: depth(cx, cy), span, box: ec_boxOf(K, P, [...ends, [cx, cy]], z0 + 7), svg: s });
  }
  // enemy hub: a pad, two company blocks and a headquarters with a mast
  {
    let s = solid(K.cylinder(0, 0, GEO.HUB, 5, 4, P, 48, 0.5), { tone: "mid" });
    s += line(K.ring(0, 0, GEO.HUB - 3, 9, P, 48), { tone: "faint" });
    const blk = (w) => {
      const pts = ec_radialBox(10, 22, w, 10);
      return solid(ex(pts, 9, 9, 0.5), { tone: "hi", crease: "lo" }) + line(K.onTop(ec_radialBox(12, 20, w, 8), 18, P, true), { tone: "faint" });
    };
    const ws = [GEO.SEAM + 120, GEO.SEAM - 120].sort((a, b) => depth(...GEO.at(16, a)) - depth(...GEO.at(16, b)));
    const far = ws.filter((w) => depth(...GEO.at(16, w)) < 0), near = ws.filter((w) => depth(...GEO.at(16, w)) >= 0);
    s += far.map(blk).join("");
    s += solid(K.cylinder(0, 0, 5, 9, 5, P, 28, 0.4), { tone: "hi", crease: "lo" });
    s += solid(K.cylinder(0, 0, 0.7, 14, 10, P, 10), { tone: "mid", crease: "none" });
    s += solid(K.slabOf({ x: -0.3, y: 0.4, w: 0.6, d: 5.5, r: 0 }, 19.6, 4, P, 2), { tone: "hi", crease: "none" });
    s += near.map(blk).join("");
    sorted.push({ kind: "hub", key: depth(0, 0), box: ec_boxOf(K, P, [[-GEO.HUB, -GEO.HUB], [GEO.HUB, GEO.HUB], [GEO.HUB, -GEO.HUB], [-GEO.HUB, GEO.HUB]], 24), svg: s });
  }
  // the breakout block on its slide
  {
    const r = breakoutR(S), w = GEO.SEAM, h = GEO.BW / 2;
    let s = solid(ex(ec_radialBox(r - 6, r + 6, w, h), 9, 8, 0.5), { tone: "hi", crease: "lo" });
    s += line(K.onTop(ec_radialBox(r - 4, r + 4, w, h - 2), 17, P, true), { tone: "faint" });
    s += dots([GEO.at(r, w)], 17, 0.5);
    const [cx, cy] = GEO.at(r, w);
    sorted.push({ kind: "block", key: depth(cx, cy), box: ec_boxOf(K, P, ec_radialBox(r - 6, r + 6, w, h), 18), svg: s });
  }
  out.push(ec_order(sorted, N).map((it) => it.svg).join(""));
  return out.join("");
}

// screen bounding box of a footprint from z 5 to zTop
function ec_boxOf(K, P, pts, zTop) {
  const xs = [], ys = [];
  for (const [x, y] of pts) for (const z of [5, zTop]) { const [sx, sy] = K.iso([x, y, z], P); xs.push(sx); ys.push(sy); }
  return [Math.min(...xs) - 3, Math.min(...ys) - 3, Math.max(...xs) + 3, Math.max(...ys) + 3];
}
// Painter's order: by depth, except that where two neighbouring leaves overlap in plan, the higher
// tier is drawn after the lower (it lies on top of it, like iris leaves).
function ec_order(items, N) {
  const n = items.length;
  const before = Array.from({ length: n }, () => []);
  const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const A = items[i], B = items[j];
    if (!hit(A.box, B.box)) continue;
    let first = A.key <= B.key ? i : j;
    if (A.kind === "leaf" && B.kind === "leaf") {
      const di = Math.abs(A.l.i - B.l.i);
      const nb = di === 1 || di === N - 1;
      let dw = Math.abs(((A.l.w - B.l.w) % 360 + 540) % 360 - 180);
      if (nb && dw < (A.span + B.span) / 2) first = A.l.tier < B.l.tier ? i : j;
    }
    before[first === i ? j : i].push(first);
  }
  const done = new Array(n).fill(false), outList = [];
  const byKey = items.map((_, i) => i).sort((a, b) => items[a].key - items[b].key);
  while (outList.length < n) {
    let pick = byKey.find((i) => !done[i] && before[i].every((j) => done[j]));
    if (pick === undefined) pick = byKey.find((i) => !done[i]);
    done[pick] = true;
    outList.push(items[pick]);
  }
  return outList;
}

// The lead screw between its bearing blocks, its thread, and the crank on the near end. Turned
// during the squeeze: `turns` is the crank's angle in turns.
export function screwSvg(K, P, turns) {
  const { x0, x1, y, z, r, pitch } = GEO.SCREW;
  const a = (P.azimuth ?? 45) * SC_RAD, e = (P.elevation ?? 30) * SC_RAD;
  const ac = Math.atan2(Math.sin(e), Math.sin(a) * Math.cos(e));   // centre of the visible half, in (y, z)
  let s = "";
  const block = (xc) => {
    const pl = { x: xc - 4, y: y - 7, w: 8, d: 14, r: 1 };
    return K.solidSvg(K.slabOf(pl, 0, z + r + 3.5, P, 3, 0.5), { tone: "mid" }) +
      K.dotsSvg([K.iso([xc, y - 4.6, z + r + 3.5], P), K.iso([xc, y + 4.6, z + r + 3.5], P)], { size: 0.45 });
  };
  s += block(x0 - 4);
  s += K.solidSvg(prismX(K, P, ec_ngon(y, z, r, 18), x0, x1), { tone: "mid", crease: "none" });
  // thread: one crest line per pitch across the visible half, ending on the outline
  const ph = ((turns % 1) + 1) % 1;
  const th = [];
  for (let kk = -2; kk < (x1 - x0) / pitch + 2; kk++) {
    const pts = [];
    for (let j = 0; j <= 12; j++) {
      const ang = ac - Math.PI / 2 + (Math.PI * j) / 12;
      const x = x0 + (kk + ph + (ang - ac) / (Math.PI * 2)) * pitch;
      if (x < x0 + 0.4 || x > x1 - 0.4) { pts.length = 0; break; }
      pts.push(K.iso([x, y + r * Math.cos(ang), z + r * Math.sin(ang)], P));
    }
    if (pts.length) th.push(K.pathOf(pts));
  }
  s += K.lineSvg(th.join(""), { tone: "lo" });
  s += block(x1 + 4);
  // stub, crank disc and handle on the near (+x) end
  s += K.solidSvg(prismX(K, P, ec_ngon(y, z, 2.2, 14), x1 + 8, x1 + 12), { tone: "mid", crease: "none" });
  s += K.solidSvg(prismX(K, P, ec_ngon(y, z + 4, 8.5, 32), x1 + 12, x1 + 14.4), { tone: "mid", crease: "none" });
  const w = turns * Math.PI * 2;
  const hy = y + 5.8 * Math.cos(w), hz = z + 4 + 5.8 * Math.sin(w);
  s += K.solidSvg(prismX(K, P, ec_ngon(hy, hz, 1.4, 12), x1 + 14.4, x1 + 21), { tone: "hi", crease: "none" });
  s += K.dotsSvg([K.iso([x1 + 14.4, y, z + 4], P)], { size: 0.6 });
  return s;
}

// The gap dial's needle for a gap fraction f (0..1 of full scale), a 270 degree sweep.
export function needle(K, P, D, f) {
  const ang = -0.75 * Math.PI + Math.min(1, Math.max(0, f)) * 1.5 * Math.PI;
  const sx = Math.sin(ang), sy = -Math.cos(ang);
  return K.lineOnTop([D.x - sx * 2.6, D.y - sy * 2.6], [D.x + sx * (D.r - 3.2), D.y + sy * (D.r - 3.2)], D.top + 0.2, P);
}
