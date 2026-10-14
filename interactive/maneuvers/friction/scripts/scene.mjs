// Geometry shared by build.mjs (Node) and the page (inlined kit): the slope frame, a box
// at any tilt, the block, the grit, the cord, the balance spring and the handwheel spokes.
// Written against the kit as a parameter (K). build.mjs inlines this file with `export` stripped.

export const GEO = {
  ANG: 20,                // incline, degrees (MODEL.angle)
  TOE: 104,               // x of the slope's foot
  RUN: 144,               // horizontal run of the slope
  BACK: -136,             // x of the deck's back face
  HALF: 28,               // half width of the ramp body
  STRIP: 1.2,             // thickness of the test-surface strip
  BL: 26, BW: 9.5, BH: 12, // block: length along the slope, half width, height
  B0: 8,                  // slope position of the block's rear edge at the bottom stop
  EYE_S: 19,              // eye bolt, along the block from its rear edge
  PUL: { x: -47, dz: 16, r: 5 },   // pulley centre (x, height above the deck) and radius
  DRUM: { r: 6, dz: 15 },          // winch drum radius and centre height above the deck
  CX0: -98,               // winch carriage centre at no load
  PER_N: 2,               // cm of carriage travel per newton (1 / MODEL.stiffness)
  STOP: -128,             // front face of the back stop (spring anchor)
  WHEEL_Y: 16,            // outer face of the handwheel
};
const SC_R = Math.PI / 180;
GEO.H = GEO.RUN * Math.tan(GEO.ANG * SC_R);        // deck height
GEO.L = GEO.RUN / Math.cos(GEO.ANG * SC_R);        // slope length
GEO.U = [-Math.cos(GEO.ANG * SC_R), 0, Math.sin(GEO.ANG * SC_R)]; // up the slope
GEO.N = [Math.sin(GEO.ANG * SC_R), 0, Math.cos(GEO.ANG * SC_R)];  // slope normal
// height of the eye above the strip so the cord runs parallel to the slope and tangent to the pulley
GEO.PC = [GEO.PUL.x, 0, GEO.H + GEO.PUL.dz];
GEO.EYE_H = (GEO.PC[0] - (GEO.TOE - GEO.RUN)) * GEO.N[0] + (GEO.PC[2] - GEO.H) * GEO.N[2] - GEO.STRIP + GEO.PUL.r;
GEO.DZ = GEO.H + GEO.DRUM.dz;                     // drum axle height
GEO.CORD_Z = GEO.PC[2] + GEO.PUL.r;               // horizontal cord height (= drum top)

// A point on the strip's top face: s along the slope from the toe, y across, h above the strip.
export function onSlope(s, y, h = 0) {
  const g = GEO;
  return [g.TOE + g.U[0] * s + g.N[0] * (g.STRIP + h), y, g.U[2] * s + g.N[2] * (g.STRIP + h)];
}

// Convex hull of screen points.
function hullOf(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

// A box at any tilt: corner o, edges ex, ey and ez. Returns kit SolidPaths, lit the way
// kit/lathe.mjs lights its prisms (light from the upper left, four side bands plus a top band).
export function boxSolid(K, P, o, ex, ey, ez) {
  const add = (...v) => v.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const az = P.azimuth * SC_R, el = (P.elevation ?? 30) * SC_R;
  const V = [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)];
  const L = unit([-Math.sin(az), Math.cos(az), 1.2]);
  const band = (score) => { let t = 0; for (const b of [0, 0.2, 0.42, 0.62]) if (score >= b) t++; return t; };
  // corner i has bits (x, y, z)
  const C = Array.from({ length: 8 }, (_, i) => add(o, (i & 1) ? ex : [0, 0, 0], (i & 2) ? ey : [0, 0, 0], (i & 4) ? ez : [0, 0, 0]));
  const S = C.map((p) => K.iso(p, P));
  const faces = [[0, 2, 6, 4], [1, 5, 7, 3], [0, 4, 5, 1], [2, 3, 7, 6], [0, 1, 3, 2], [4, 6, 7, 5]];
  const centre = add(o, ex.map((v) => v / 2), ey.map((v) => v / 2), ez.map((v) => v / 2));
  const buckets = [[], [], [], [], []];
  const seen = faces.map((f) => {
    let n = unit(cross(C[f[1]].map((v, i) => v - C[f[0]][i]), C[f[3]].map((v, i) => v - C[f[0]][i])));
    const mid = C[f[0]].map((v, i) => (v + C[f[2]][i]) / 2 - centre[i]);
    if (dot(n, mid) < 0) n = n.map((v) => -v);
    const vis = dot(n, V) > 1e-6;
    if (vis) buckets[band(dot(n, L))].push(K.pathOf(f.map((i) => S[i]), true));
    return vis;
  });
  const crease = [];
  const edgeKey = (a, b) => (a < b ? a + "-" + b : b + "-" + a);
  const owners = {};
  faces.forEach((f, fi) => f.forEach((a, j) => { const k = edgeKey(a, f[(j + 1) % 4]); (owners[k] = owners[k] || []).push(fi); }));
  for (const [k, list] of Object.entries(owners)) {
    if (list.length === 2 && seen[list[0]] && seen[list[1]]) {
      const [a, b] = k.split("-").map(Number);
      crease.push(K.pathOf([S[a], S[b]]));
    }
  }
  const hull = hullOf(S);
  return { fill: K.pathOf(hull, true), outline: K.pathOf(hull, true), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((list) => list.join("")) };
}

// A box sitting on the strip: from s0 to s1 along the slope, y0 to y1 across, h0 to h1 above it.
export function slopeBox(K, P, s0, s1, y0, y1, h0, h1) {
  const g = GEO;
  const o = onSlope(s0, y0, h0);
  const mul = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
  return boxSolid(K, P, o, mul(g.U, s1 - s0), [0, y1 - y0, 0], mul(g.N, h1 - h0));
}

// The block, drawn at its rest position (rear edge at B0); the page moves it with a translate.
export function blockSvg(K, P) {
  const g = GEO;
  const s0 = g.B0, s1 = g.B0 + g.BL;
  const at = (p) => K.iso(p, P);
  let out = `<path class="iso-halo" d="${K.pathOf(hullOf([onSlope(s0 - 1, -g.BW - 1), onSlope(s1 + 1, -g.BW - 1), onSlope(s1 + 1, g.BW + 1), onSlope(s0 - 1, g.BW + 1)].map(at)), true)}" style="filter:blur(2.5px)"/>`;
  // skid runners under the body, then the body
  out += K.solidSvg(slopeBox(K, P, s0 + 1, s1 - 1, g.BW - 2.4, g.BW - 0.6, 0, 1.4), { tone: "mid" });
  const inset = [onSlope(s0 + 2.2, -g.BW + 2.2, g.BH), onSlope(s1 - 2.2, -g.BW + 2.2, g.BH), onSlope(s1 - 2.2, g.BW - 2.2, g.BH), onSlope(s0 + 2.2, g.BW - 2.2, g.BH)];
  const seam = [onSlope(s0, g.BW, 3.2), onSlope(s1, g.BW, 3.2)];
  const seamX = [onSlope(s0, -g.BW, 3.2), onSlope(s0, g.BW, 3.2)];
  out += K.solidSvg(slopeBox(K, P, s0, s1, -g.BW, g.BW, 1.4, g.BH), {
    tone: "hi", lit: true, crease: "lo",
    inner: K.lineSvg(K.pathOf(seamX.map(at)) + K.pathOf(seam.map(at)), { tone: "faint" }),
  });
  out += K.lineSvg(K.pathOf(inset.map(at), true), { tone: "faint" });
  out += K.dotsSvg(inset.map(at), { size: 0.42 });
  // eye bolt: a pad, a stem and a ring standing in the slope's plane
  const e = g.EYE_S + g.B0;
  out += K.solidSvg(slopeBox(K, P, e - 2.4, e + 2.4, -2.4, 2.4, g.BH, g.BH + 1), { tone: "mid" });
  out += K.solidSvg(slopeBox(K, P, e - 0.7, e + 0.7, -0.7, 0.7, g.BH + 1, g.EYE_H - 1.7), { tone: "mid", crease: "none" });
  out += eyeRing(K, P, e);
  return out;
}

// The eye ring: an annulus in the plane that holds the slope direction and its normal (y = 0).
function eyeRing(K, P, e) {
  const g = GEO;
  const ring = (r) => Array.from({ length: 28 }, (_, i) => {
    const t = (i / 28) * Math.PI * 2;
    return K.iso(onSlope(e + r * Math.cos(t), 0, g.EYE_H + r * Math.sin(t)), P);
  });
  const outer = ring(2), inner = ring(1).reverse();
  return `<g class="iso-solid"><path class="iso-fill" d="${K.pathOf(outer, true)}${K.pathOf(inner, true)}" fill-rule="evenodd"/>` +
    `<path class="iso-top" d="${K.pathOf(outer, true)}${K.pathOf(inner, true)}" fill-rule="evenodd"/>` +
    `<path class="iso-line iso-edge" data-tone="mid" d="${K.pathOf(outer, true)}${K.pathOf(inner, true)}"/></g>`;
}

// The cord: from the eye up the slope to the pulley, over it, and level to the top of the drum.
export function cordPath(K, P, blockAt, carriage) {
  const g = GEO;
  const e = g.B0 + g.EYE_S + blockAt;
  const from = onSlope(e + 2, 0, g.EYE_H);
  const pts = [K.iso(from, P)];
  const a0 = Math.atan2(g.N[2], g.N[0]), a1 = Math.PI / 2;
  for (let i = 0; i <= 6; i++) {
    const a = a0 + (a1 - a0) * (i / 6);
    pts.push(K.iso([g.PC[0] + g.PUL.r * Math.cos(a), 0, g.PC[2] + g.PUL.r * Math.sin(a)], P));
  }
  pts.push(K.iso([g.CX0 + carriage, 0, g.CORD_Z], P));
  return K.pathOf(pts);
}

// The balance spring from the back stop to the carriage lug, rebuilt as it stretches.
export function springSvg(K, P, carriage) {
  const g = GEO;
  const to = g.CX0 + carriage - 14;
  const c = K.coil(g.STOP + 1.2, to, [0, g.H + 9.5], 2.4, 9, "x", P, 14);
  return K.lineSvg(c.back, { tone: "lo" }) + K.lineSvg(c.front, { tone: "mid" }) +
    K.dotsSvg([K.iso([g.STOP + 1.2, 2.4, g.H + 9.5], P), K.iso([to, 2.4, g.H + 9.5], P)], { size: 0.5 });
}

// Handwheel spokes on the wheel's outer face, at the carriage's rest position.
export function spokesPath(K, P, turn) {
  const g = GEO;
  const out = [];
  for (let i = 0; i < 4; i++) {
    const a = turn + (i * Math.PI) / 2;
    const p = (r) => K.iso([g.CX0 + r * Math.cos(a), g.WHEEL_Y, g.DZ + r * Math.sin(a)], P);
    out.push(K.pathOf([p(1.4), p(4)]));
  }
  return out.join("");
}

// One grain of grit lying across the strip, ahead of where the block's front will reach it.
export function grainSvg(K, P, grain) {
  const g = GEO;
  const s = g.B0 + g.BL + grain.at;
  if (grain.crushed) {
    const pts = [[0, 0], [1.6, 1.2], [-1.3, 1.6], [2.2, -1.1], [-0.6, -1.8], [0.9, 2.6]];
    return K.dotsSvg(pts.map(([ds, dy]) => K.iso(onSlope(s - 2 + ds, grain.side + dy, 0), P)), { size: 0.38, tone: "lo" });
  }
  return K.solidSvg(slopeBox(K, P, s + 0.2, s + 3.2, grain.side - 1.5, grain.side + 1.5, 0, 2.6), { tone: "mid" });
}
