// The moving half of the balance: the pillar and its fork, the tilting beam with its scale, the two
// riders, the hanging pans with their stacks of discs (one disc = one man), the shelf where red's
// second group waits, the trays where men down are stacked, the step dial and the law knob.
// Rebuilt per frame from the model state. Written against the kit as a parameter (K) so build.mjs
// (Node) and the page (inlined kit) run the same code. build.mjs inlines it with `export` stripped.

export const GEO = {
  PIV: 72,            // pivot height
  BEAM: 110,          // beam half length
  BY: 2.5,            // beam half thickness (y)
  BZ: 3.5,            // beam half height (z)
  RX: 4.5, RY: 4.2, RZ: 5.4, // rider half sizes (it straddles the beam)
  RMIN: 24,           // rider stops: a rider never comes closer to the pivot than this (drawing only)
  HANG: 31,           // rider underside to pan top
  PAN: 13,            // pan radius
  DR: 4.6,            // disc radius
  DH: 1.1,            // disc thickness
  SLOT: 5.3,          // red pan: group A at +y, group B at -y
  SHELF: [70, -32, 30], // where red group B waits (top of the shelf)
  TRAY_B: { x: -114, y: 17, w: 50, d: 20, r: 2 },
  TRAY_R: { x: 62, y: 17, w: 54, d: 20, r: 2 },
  DIAL: { x: 34, y: 33, r: 10, z: 12, h: 5 },
  KNOB: [-34, 33],
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;

const SC_RAD = Math.PI / 180;

// Convex hull of screen points (monotone chain).
function hull2(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

// A box in any orientation: centre c, unit axes ex, ey, ez, half sizes hx, hy, hz.
// Returns kit SolidPaths, shaded by the kit's own light and bands.
export function obox(K, P, c, ex, ey, ez, hx, hy, hz) {
  const { sinA, cosA, sinE, cosE } = K.cameraOf(P);
  const V = [cosA * cosE, sinA * cosE, sinE];
  const Lr = [-sinA, cosA, 1.2], ln = Math.hypot(...Lr), L = Lr.map((x) => x / ln);
  const BANDS = [0, 0.2, 0.42, 0.62];
  const band = (s) => { let t = 0; while (t < BANDS.length && s >= BANDS[t]) t++; return t; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const pt = (i, j, k) => [c[0] + ex[0] * i * hx + ey[0] * j * hy + ez[0] * k * hz, c[1] + ex[1] * i * hx + ey[1] * j * hy + ez[1] * k * hz, c[2] + ex[2] * i * hx + ey[2] * j * hy + ez[2] * k * hz];
  const S = (i, j, k) => K.iso(pt(i, j, k), P);
  const faces = [
    { n: ez, q: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], top: true },
    { n: ez.map((x) => -x), q: [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]] },
    { n: ex, q: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
    { n: ex.map((x) => -x), q: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
    { n: ey, q: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] },
    { n: ey.map((x) => -x), q: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
  ];
  const shades = ["", "", "", ""];
  let top = "";
  const seen = faces.map((f) => dot(f.n, V) > 1e-6);
  faces.forEach((f, i) => {
    if (!seen[i]) return;
    const d = K.pathOf(f.q.map((v) => S(...v)), true);
    if (f.top) top += d; else shades[Math.min(3, band(dot(f.n, L)))] += d;
  });
  // creases: edges of the top face shared with a visible side
  const creases = [];
  if (seen[0]) {
    const q = faces[0].q;
    for (let e = 0; e < 4; e++) {
      const a = q[e], b = q[(e + 1) % 4];
      const side = faces.findIndex((f, i) => i > 1 && seen[i] && f.q.some((v) => v.join() === a.join()) && f.q.some((v) => v.join() === b.join()));
      if (side > 1) creases.push(K.pathOf([S(...a), S(...b)]));
    }
  }
  const all = [];
  for (const i of [-1, 1]) for (const j of [-1, 1]) for (const k of [-1, 1]) all.push(S(i, j, k));
  const h = K.pathOf(hull2(all), true);
  return { fill: h, outline: h, crease: creases.join(""), top, shades };
}

// The beam's frame for a tilt phi (degrees, positive = blue end, -x, down).
export function beamFrame(phi, G = GEO) {
  const a = phi * SC_RAD;
  const ex = [Math.cos(a), 0, Math.sin(a)], ey = [0, 1, 0], ez = [-Math.sin(a), 0, Math.cos(a)];
  const at = (s, y = 0, z = 0) => [s * ex[0] + z * ez[0], y, G.PIV + s * ex[2] + z * ez[2]];
  return { ex, ey, ez, at };
}

// The step dial's needle for a share f (0..1) of the slider's range: a 270 degree sweep.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 2.6, D.y - sy * 2.6], [D.x + sx * (D.r - 3.2), D.y + sy * (D.r - 3.2)], D.top + 0.2, P);
}

// S: { phi, db, dr (rider distances), nb, nA, nB (discs on the beam side), bOn (0 = group B on the
//      shelf, 1 = on the pan), downB, downR (discs in the trays), f (step share), law }
// Per-item markup cache: an item's markup is rebuilt only when one of its inputs changes, so
// the output is byte-identical to building it fresh; cleared when the projection changes.
let memoP = null, memoMap = new Map();
function sceneMemo(P, parts, make) {
  if (P !== memoP) { memoP = P; memoMap = new Map(); }
  const key = parts.join("|");
  let svg = memoMap.get(key);
  if (svg === undefined) { if (memoMap.size > 4000) memoMap.clear(); svg = make(); memoMap.set(key, svg); }
  return svg;
}

export function scene(K, P, S, G = GEO) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (p) => K.depthOf(p, P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const BAND2 = 1e4, BAND3 = 2e4;          // beam assembly, then the front of the bench
  const B = beamFrame(S.phi, G);
  const memo = (parts, make) => (G === GEO ? sceneMemo(P, parts, make) : make());

  // a stack of n discs standing at (x, y, z): one cylinder with a seam per disc
  const stack = (x, y, z, n, cls) => memo(["stack", x, y, z, n, cls], () => {
    if (n <= 0) return "";
    const h = n * G.DH;
    let seams = "";
    for (let i = 1; i < n; i++) seams += K.sideArc(x, y, G.DR, z + i * G.DH, P, 24);
    return `<g class="${cls}">${solid(K.cylinder(x, y, G.DR, z, h, P, 32, 0.3), { tone: "mid", inner: line(seams, { tone: "faint" }) })}</g>`;
  });

  // ---- the pillar: plinth, collar, column, pivot block, fork cheeks ----
  put(depth([0, 0, 0]) - 2, memo(["pillar"], () => solid(K.slabOf({ x: -11, y: -11, w: 22, d: 22, r: 2 }, 0, 3, P, 3, 0.5), { tone: "mid" }) +
    K.dotsSvg(K.corners({ x: -11, y: -11, w: 22, d: 22, r: 2 }, 2.8).map(([x, y]) => at([x, y, 3])), { size: 0.45 }) +
    solid(K.cylinder(0, 0, 7.5, 3, 4, P, 40, 0.5), { tone: "mid", inner: line(K.sideArc(0, 0, 7.5, 5, P, 30), { tone: "faint" }) }) +
    solid(K.cylinder(0, 0, 3.6, 7, G.PIV - 16, P, 28), { tone: "mid", crease: "none", inner: line(K.sideArc(0, 0, 3.6, 30, P, 16) + K.sideArc(0, 0, 3.6, 46, P, 16), { tone: "faint" }) }) +
    solid(K.cylinder(0, 0, 5.4, G.PIV - 9, 2.4, P, 32), { tone: "mid" }) +
    solid(K.slabOf({ x: -6, y: -8, w: 12, d: 16, r: 1.2 }, G.PIV - 6.6, 2.4, P, 3, 0.4), { tone: "mid" })));
  const cheek = (y0) => solid(K.slabOf({ x: -4, y: y0, w: 8, d: 3, r: 0.8 }, G.PIV - 4.2, 9.6, P, 3, 0.3), { tone: "mid" });
  put(BAND2 - 5, memo(["cheekF"], () => cheek(-7)));
  put(BAND2 + 50, memo(["cheekN"], () => cheek(4) + line(K.sideRing([0, 7, G.PIV], 1.6, "y", P), { tone: "lo" }) + K.dotsSvg([at([0, 7, G.PIV])], { size: 0.55 })));

  // ---- the index: a scale plate on a bracket in front of the column, and the beam's pointer ----
  {
    const zt = G.PIV - 24;
    const plate = { x: -11, y: 5.2, w: 22, d: 1.6, r: 0.4 };
    put(BAND2 + 40, memo(["index"], () => {
    let d = solid(K.slabOf({ x: -2, y: 3.4, w: 4, d: 1.8, r: 0.4 }, zt - 7, 4, P, 2), { tone: "mid" });
    d += solid(K.slabOf(plate, zt - 6, 6, P, 2, 0.2), { tone: "hi", crease: "lo" });
    const tk = K.sideTicks(-9, 9, 1.5, 4, plate.y + plate.d, zt, [1.1, 2.2], P, "x");
    d += line(tk.minor, { tone: "lo" }) + line(tk.major, { tone: "mid" });
    return d;
    }));
    // the pointer hangs from the beam's centre and swings across the plate as the beam tilts
    const top = B.at(0, 7.8, -G.BZ), tip = B.at(0, 7.8, -(G.PIV - zt) - 0.6);
    put(BAND2 + 60, `<path class="iso-line" data-tone="hi" data-free="end" d="${K.pathOf([at(top), at(tip)])}" style="stroke-width:1"/>` +
      K.dotsSvg([at(top)], { size: 0.7 }));
  }

  // ---- the beam (lit: the part to watch) with its scale of men ----
  {
    const c = B.at(0);
    let d = solid(obox(K, P, c, B.ex, B.ey, B.ez, G.BEAM, G.BY, G.BZ), { lit: true, tone: "hi", crease: "lo" });
    const minor = [], major = [];
    for (let n = 1; n <= 23; n++) for (const sgn of [-1, 1]) {
      const s = sgn * n * 4.5;
      if (Math.abs(s) < 6) continue;
      const big = n % 5 === 0;
      const len = big ? 2.4 : 1.4;
      (big ? major : minor).push(K.pathOf([at(B.at(s, G.BY, G.BZ)), at(B.at(s, G.BY - len, G.BZ))]));
    }
    d += line(minor.join(""), { tone: "lo" }) + line(major.join(""), { tone: "mid" });
    // end caps: small weights screwed to the beam ends
    for (const s of [-G.BEAM - 2.2, G.BEAM + 2.2]) d += solid(obox(K, P, B.at(s), B.ex, B.ey, B.ez, 2.2, G.BY + 1, G.BZ + 1), { tone: "mid" });
    put(BAND2, d);
  }

  // ---- each side: rider, hanger rods, pan, stacks ----
  const side = (sgn, dist, discs) => {
    const s = sgn * Math.max(G.RMIN, Math.min(G.BEAM - 10, dist));
    const rc = B.at(s, 0, 0.6);
    // rider straddling the beam, with a thumb screw on its top
    let r = solid(obox(K, P, rc, B.ex, B.ey, B.ez, G.RX, G.RY, G.RZ), { tone: "mid", crease: "lo" });
    const topC = B.at(s, 0, 0.6 + G.RZ);
    r += solid(K.cylinder(topC[0], topC[1], 1.8, topC[2] - 0.4, 2.2, P, 18), { tone: "mid" });
    // the pointer notch on the rider's front face reads the scale
    r += K.dotsSvg([at(B.at(s, G.RY, 0.6 + G.RZ * 0.4))], { size: 0.5 });
    put(BAND2 + 10 + sgn, r);
    // hook under the rider and the pan below it (the pan hangs level)
    const hook = B.at(s, 0, 0.6 - G.RZ);
    const pz = hook[2] - G.HANG;
    const [px, py] = [hook[0], 0];
    const key = depth([px, py, 0]);
    const rods = (xx) => K.pathOf([at([hook[0] + xx * 0.12, 0, hook[2]]), at([px + xx, py, pz + 1.6])]);
    put(key - 3, line(rods(-G.PAN + 1.2), { tone: "mid" }));
    put(key - 2, memo(["pan", px, py, pz], () => {
    let pan = solid(K.cylinder(px, py, G.PAN, pz, 1.6, P, 56, 0.4), { tone: "mid", inner: line(K.sideArc(px, py, G.PAN, pz + 0.8, P, 40), { tone: "faint" }) });
    pan += line(K.ring(px, py, G.PAN - 1.6, pz + 1.6, P, 56), { tone: "faint" });
    return pan;
    }));
    put(key + 3, line(rods(G.PAN - 1.2), { tone: "mid" }));
    // a small hook block under the rider, where the rods meet
    put(BAND2 + 8 + sgn, solid(obox(K, P, B.at(s, 0, 0.6 - G.RZ - 1.1), B.ex, B.ey, B.ez, 1.6, 1.4, 1.1), { tone: "mid" }));
    return { px, py, pz: pz + 1.6, key };
  };
  const L = side(-1, S.db, S.nb);
  put(L.key, stack(L.px, L.py, L.pz, S.nb, "lc-b"));
  const R = side(1, S.dr, S.nA + S.nB);
  put(R.key - 0.5, stack(R.px, R.py - G.SLOT, R.pz, S.bOn > 0.999 ? S.nB : 0, "lc-r"));
  put(R.key + 1, stack(R.px, R.py + G.SLOT, R.pz, S.nA, "lc-r"));

  // ---- the shelf where red group B waits, and group B in transit ----
  {
    const [sx, sy, sz] = G.SHELF;
    put(depth([sx, sy, 0]) - 1, memo(["shelf"], () => solid(K.cylinder(sx, sy, 5, 0, 2, P, 32, 0.4), { tone: "mid" }) +
      solid(K.cylinder(sx, sy, 2.2, 2, sz - 4, P, 20), { tone: "mid", crease: "none", inner: line(K.sideArc(sx, sy, 2.2, 14, P, 12), { tone: "faint" }) }) +
      solid(K.cylinder(sx, sy, 7.2, sz - 2, 2, P, 40, 0.4), { tone: "mid", inner: line(K.sideArc(sx, sy, 7.2, sz - 1, P, 30), { tone: "faint" }) }) +
      line(K.ring(sx, sy, 5.6, sz, P, 40), { tone: "faint" })));
    if (S.bOn < 0.999 && S.nB > 0) {
      const u = S.bOn, e = u * u * (3 - 2 * u);
      const x = sx + (R.px - sx) * e, y = sy + (R.py - G.SLOT - sy) * e, z = sz + (R.pz - sz) * e + 12 * Math.sin(Math.PI * e);
      put(e < 0.5 ? depth([sx, sy, 0]) : R.key - 0.5, stack(x, y, z, S.nB, "lc-r"));
    }
  }

  // ---- trays of men down, at the front of the bench ----
  const tray = (T, n, cls) => memo(["tray", T.x, n, cls], () => {
    let d = solid(K.slabOf(T, 0, 2.4, P, 4, 0.5), { tone: "mid" });
    d += line(K.planOutline(K.insetPlan(T, 1.6), 2.4, P, 4), { tone: "lo" });
    const cols = [];
    for (let i = 0; n > 0; i++) { cols.push(Math.min(5, n)); n -= 5; }
    const cy = T.y + T.d / 2;
    cols.forEach((m, i) => { d += stack(T.x + 7 + i * 10.6, cy, 1.2, m, cls); });
    return d;
  });
  put(BAND3 + depth([GEO.TRAY_B.x, GEO.TRAY_B.y, 0]), tray(G.TRAY_B, S.downB, "lc-d"));
  put(BAND3 + depth([GEO.TRAY_R.x, GEO.TRAY_R.y, 0]), tray(G.TRAY_R, S.downR, "lc-d"));

  // ---- the step dial ----
  {
    const D = G.DIAL;
    const ped = { x: D.x - 8, y: D.y - 8, w: 16, d: 16, r: 2 };
    let d = memo(["dial"], () => {
    let d = solid(K.slabOf(ped, 0, 3, P, 4, 0.5), { tone: "mid" });
    d += K.dotsSvg(K.corners(ped, 2.4).map(([x, y]) => at([x, y, 3])), { size: 0.42 });
    d += solid(K.cylinder(D.x, D.y, 2.4, 3, D.z - 3, P, 20), { tone: "mid", crease: "none" });
    d += solid(K.cylinder(D.x, D.y, D.r, D.z, D.h, P, 64, 0.6), { tone: "hi", crease: "lo" });
    d += line(K.knurl(D.x, D.y, D.r, D.top - 2.2, D.top, 56, P, 0.3), { tone: "lo" });
    d += line(K.sideArc(D.x, D.y, D.r, D.top - 2.2, P, 32), { tone: "faint" });
    d += line(K.ring(D.x, D.y, D.r - 1.6, D.top, P, 64), { tone: "lo" });
    const t = K.radialTicks(D.x, D.y, D.r - 1.6, 23, 5, D.top, [0.9, 1.9], P, -0.75 * Math.PI, 1.5 * Math.PI);
    d += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    d += K.faceTextSvg(K.topMatrix([D.x - 2.6, D.y + 4.6], D.top, P, "x"), "STEP", { size: 1.5, tone: "lo", anchor: "middle" });
    return d;
    });
    d += `<path class="iso-line" data-tone="hi" data-free="" d="${needle(K, P, D, S.f)}" style="stroke-width:1"/>`;
    d += line(K.ring(D.x, D.y, 1.2, D.top, P, 16), { tone: "mid" });
    put(BAND3 + depth([D.x, D.y, 0]), d);
  }

  // ---- the law knob: points at the square-law mark or the linear-law mark ----
  {
    const [kx, ky] = G.KNOB;
    const base = { x: kx - 8, y: ky - 6, w: 16, d: 12, r: 2 };
    put(BAND3 + depth([kx, ky, 0]), memo(["knob", S.law], () => {
    let d = solid(K.slabOf(base, 0, 2.4, P, 4, 0.5), { tone: "mid" });
    // two engraved index marks: square (toward the bench's left) and linear (toward its front)
    d += line(K.lineOnTop([kx - 5.2, ky - 3.6], [kx - 7.2, ky - 4.8], 2.4, P) + K.lineOnTop([kx + 5.2, ky - 3.6], [kx + 7.2, ky - 4.8], 2.4, P), { tone: "mid", free: true });
    d += solid(K.cylinder(kx, ky, 4.2, 2.4, 3.6, P, 32), { tone: "mid" });
    d += line(K.knurl(kx, ky, 4.2, 2.4, 6, 30, P), { tone: "lo" });
    const a = (S.law === "square" ? 214 : 326) * SC_RAD;
    d += line(K.lineOnTop([kx, ky], [kx + 3.4 * Math.cos(a), ky + 3.4 * Math.sin(a)], 6, P), { tone: "hi", free: true });
    d += K.dotsSvg([at([kx, ky, 6])], { size: 0.5 });
    return d;
    }));
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  if (S.items) return items; // the page patches its live layer item by item
  return items.map((item) => item.svg).join("");
}
