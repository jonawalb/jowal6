// Battlefield view kit for the Maneuvers figures: a sand table with terrain, wargame unit
// counters with engraved APP-6-style symbols, and control measures as physical objects.
//
// Pure functions written against the iso kit passed in as K (like each figure's scene.mjs),
// so a build script can call them in Node and the page can inline this file (exports
// stripped) and call them again per frame. The one exception is fdPlace(), which touches
// the DOM and only runs in the page. API and recipe: kit/FIELD.md.
//
// K must carry: iso, depthOf, cameraOf, towardViewer, pathOf, onTop, extrude, slabOf,
// cylinder, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, topMatrix, topTicks,
// corners, ring, insetPlan, planOutline, sideSeam, sideArc, haloOf, knurl.

const FD_RAD = Math.PI / 180;

// Tokens and classes. Muted affiliation colours (light and dark), a water tint and the
// view toggle. Inline once into the page's <style> after ISO_CSS.
export const FIELD_CSS = `
.iso{--field-blue:#7d9bd6;--field-blue-top:#1d2330;--field-blue-fill:#253149;--field-blue-side:#1a1f2a;
  --field-red:#d98585;--field-red-top:#2e1f1f;--field-red-fill:#472a2a;--field-red-side:#261b1b;
  --field-water:#161b1f;--field-wood:#191a18}
.iso[data-theme="light"]{--field-blue:#4a68a6;--field-blue-top:#f1f4fa;--field-blue-fill:#dfe7f5;--field-blue-side:#e3e8f1;
  --field-red:#b0504f;--field-red-top:#fbf1f0;--field-red-fill:#f4dfdd;--field-red-side:#efe3e2;
  --field-water:#eef1f2;--field-wood:#f2f3ef}
.fd-f{--anatomy-top:var(--field-blue-top);--anatomy-lit-top:var(--field-blue-top)}
.fd-h{--anatomy-top:var(--field-red-top);--anatomy-lit-top:var(--field-red-top)}
.iso .iso-line.fd-f-line{stroke:var(--field-blue)}
.iso .iso-line.fd-h-line{stroke:var(--field-red)}
.iso .iso-dots.fd-f-dots circle{fill:var(--field-blue);opacity:1}
.iso .iso-dots.fd-h-dots circle{fill:var(--field-red);opacity:1}
.fd-f-fill{fill:var(--field-blue-fill);stroke:none}
.fd-h-fill{fill:var(--field-red-fill);stroke:none}
.fd-water{fill:var(--field-water);stroke:none}
.fd-wood{--anatomy-top:var(--field-wood)}
.fd-keys .iso-swatch[data-mark="blue"] path{stroke:var(--field-blue)}
.fd-keys .iso-swatch[data-mark="red"] path{stroke:var(--field-red)}
.fd-views{display:inline-flex;border-radius:999px;box-shadow:0 0 0 1px var(--anatomy-mid);overflow:hidden;flex:none}
.fd-views button{appearance:none;border:0;background:transparent;color:var(--anatomy-text);font:500 13px/1 var(--anatomy-mono);letter-spacing:.04em;padding:13px 16px;cursor:pointer}
.fd-views button[aria-pressed="true"]{background:var(--anatomy-hi);color:var(--anatomy-card)}
.fd-views button:focus-visible{outline:2px solid var(--anatomy-hi);outline-offset:-3px}
`;

// ---------- small helpers ----------

// Deterministic random numbers (mulberry32), so the build and the page draw the same trees.
export function fdRand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A frame on the floor: local (u forward, v left) about (x, y), turned by ang degrees.
export function fdFrame(x, y, ang) {
  const c = Math.cos(ang * FD_RAD), s = Math.sin(ang * FD_RAD);
  return (u, v) => [x + u * c - v * s, y + u * s + v * c];
}

// Angles from a0 to a1 in about `step` degree steps, ending exactly on a1.
export function fdSweep(a0, a1, step = 3) {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / step));
  return Array.from({ length: n + 1 }, (_, i) => a0 + ((a1 - a0) * i) / n);
}

export const fdPolar = (cx, cy, r, deg) => [cx + r * Math.cos(deg * FD_RAD), cy + r * Math.sin(deg * FD_RAD)];

// Camera vectors: toward the viewer in 3D, screen-right and screen-up laid on the floor, the kit's light.
export function fdView(K, P) {
  const { sinA, cosA, sinE, cosE } = K.cameraOf(P);
  return { v: [cosA * cosE, sinA * cosE, sinE], right: [sinA, -cosA], up: [-cosA, -sinA], light: [-sinA, cosA] };
}

// Convex hull of 2D points (monotone chain), counter-clockwise.
export function fdHull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// Smooth an open or closed polyline (Catmull-Rom), n samples per span.
export function fdSpline(pts, n = 6, closed = false) {
  const out = [];
  const m = pts.length;
  const at = (i) => (closed ? pts[(i + m) % m] : pts[Math.max(0, Math.min(m - 1, i))]);
  const spans = closed ? m : m - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  if (!closed) out.push(pts[m - 1]);
  return out;
}

// A smooth irregular closed outline: radius r about (cx, cy), wobbled by two harmonics.
export function fdBlob(cx, cy, r, seed = 1, wobble = 0.12, steps = 48, squash = 1) {
  const rnd = fdRand(seed);
  const p2 = rnd() * 6.28, p3 = rnd() * 6.28, a2 = wobble * (0.6 + rnd() * 0.6), a3 = wobble * (0.3 + rnd() * 0.5);
  const out = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const rr = r * (1 + a2 * Math.sin(2 * t + p2) + a3 * Math.sin(3 * t + p3));
    out.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t) * squash]);
  }
  return out;
}

// Offset a polygon outline inward by d (approximate, fine for gentle blobs).
export function fdInset(ring, d) {
  const n = ring.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = ring[i], b = ring[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sign = area > 0 ? 1 : -1;
  return ring.map((p, i) => {
    const a = ring[(i + n - 1) % n], b = ring[(i + 1) % n];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return [p[0] - (sign * ty / l) * d, p[1] + (sign * tx / l) * d];
  });
}

export function fdInside(ring, [x, y]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// An open polyline offset sideways by d (positive to the left of travel).
export function fdOffset(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return [p[0] - (ty / l) * d, p[1] + (tx / l) * d];
  });
}

// A ribbon (road, track, river) along a polyline: closed outline of half-width w.
export const fdRibbon = (pts, w) => fdOffset(pts, w).concat(fdOffset(pts, -w).reverse());

// Clip a polygon to a rectangle {x, y, w, d} (Sutherland-Hodgman).
export function fdClipPoly(ring, R) {
  const edges = [[(p) => p[0] >= R.x, (a, b) => R.x], [(p) => p[0] <= R.x + R.w, () => R.x + R.w], [(p) => p[1] >= R.y, () => R.y], [(p) => p[1] <= R.y + R.d, () => R.y + R.d]];
  let out = ring;
  edges.forEach(([inside, at], i) => {
    const src = out;
    out = [];
    for (let j = 0; j < src.length; j++) {
      const a = src[j], b = src[(j + 1) % src.length];
      const cut = () => {
        const v = at();
        if (i < 2) { const t = (v - a[0]) / (b[0] - a[0]); return [v, a[1] + (b[1] - a[1]) * t]; }
        const t = (v - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, v];
      };
      if (inside(b)) { if (!inside(a)) out.push(cut()); out.push(b); } else if (inside(a)) out.push(cut());
    }
  });
  return out;
}

// Clip an open polyline to a rectangle; returns the runs inside it, ending exactly on its edges.
export function fdClipLine(pts, R) {
  const inside = (p) => p[0] >= R.x - 1e-9 && p[0] <= R.x + R.w + 1e-9 && p[1] >= R.y - 1e-9 && p[1] <= R.y + R.d + 1e-9;
  const cross = (a, b) => {
    let t0 = 0, t1 = 1;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0] - R.x], [dx, R.x + R.w - a[0]], [-dy, a[1] - R.y], [dy, R.y + R.d - a[1]]]) {
      if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; }
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    }
    return t0 <= t1 ? [t0, t1] : null;
  };
  const runs = [];
  let run = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], c = cross(a, b);
    if (!c) { if (run) { runs.push(run); run = null; } continue; }
    const pa = [a[0] + (b[0] - a[0]) * c[0], a[1] + (b[1] - a[1]) * c[0]];
    const pb = [a[0] + (b[0] - a[0]) * c[1], a[1] + (b[1] - a[1]) * c[1]];
    if (!run) run = [pa];
    run.push(pb);
    if (c[1] < 1 - 1e-9) { runs.push(run); run = null; }
  }
  if (run) runs.push(run);
  return runs.filter((r) => r.length > 1 && inside(r[0]));
}

// ---------- convex solids from faces (cones, gabled houses, wedges) ----------

// faces: arrays of [x, y, z]. Draws the visible faces shaded by the kit's light, creases between
// visible faces that meet at more than creaseAngle degrees, and the silhouette as the edge.
export function fdPoly(K, P, faces, { tone = "mid", crease = "faint", lit = false, className, creaseAngle = 28 } = {}) {
  const view = fdView(K, P);
  const pts = faces.flat();
  const c = [0, 1, 2].map((j) => pts.reduce((s, p) => s + p[j], 0) / pts.length);
  const info = faces.map((f) => {
    let n = [0, 0, 0];
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]);
      n[1] += (a[2] - b[2]) * (a[0] + b[0]);
      n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const fc = [0, 1, 2].map((j) => f.reduce((s, p) => s + p[j], 0) / f.length);
    if (n[0] * (fc[0] - c[0]) + n[1] * (fc[1] - c[1]) + n[2] * (fc[2] - c[2]) < 0) n = n.map((x) => -x);
    const l = Math.hypot(...n) || 1;
    n = n.map((x) => x / l);
    return { f, n, visible: n[0] * view.v[0] + n[1] * view.v[1] + n[2] * view.v[2] > 1e-6 };
  });
  const flat = (f) => K.pathOf(f.map((p) => K.iso(p, P)), true);
  const tops = [], buckets = [[], [], [], []];
  for (const { f, n, visible } of info) {
    if (!visible) continue;
    if (n[2] > 0.93) { tops.push(flat(f)); continue; }
    const h = Math.hypot(n[0], n[1]) || 1;
    const litv = ((n[0] / h) * view.light[0] + (n[1] / h) * view.light[1] + 1) / 2;
    const b = Math.min(3, Math.floor(litv * 4) + (n[2] > 0.5 ? 1 : 0));
    buckets[b].push(flat(f));
  }
  const edges = new Map();
  const keyOf = (p) => p.map((x) => x.toFixed(2)).join(",");
  info.forEach(({ f, visible }, fi) => {
    if (!visible) return;
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length];
      const k = [keyOf(a), keyOf(b)].sort().join("|");
      if (!edges.has(k)) edges.set(k, { a, b, faces: [] });
      edges.get(k).faces.push(fi);
    }
  });
  const creases = [];
  const cosMax = Math.cos(creaseAngle * FD_RAD);
  for (const { a, b, faces: fs } of edges.values()) {
    if (fs.length !== 2) continue;
    const [n1, n2] = [info[fs[0]].n, info[fs[1]].n];
    if (n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2] < cosMax) creases.push(K.pathOf([K.iso(a, P), K.iso(b, P)]));
  }
  const hull = K.pathOf(fdHull(pts.map((p) => K.iso(p, P))), true);
  const parts = [`<path class="iso-fill" d="${hull}"/>`];
  buckets.forEach((d, i) => { if (d.length) parts.push(`<path class="iso-shade" data-shade="${i}" d="${d.join("")}"/>`); });
  if (tops.length) parts.push(`<path class="iso-top" d="${tops.join("")}"/>`);
  if (crease !== "none" && creases.length) parts.push(`<path class="iso-line iso-crease" data-tone="${crease}" d="${creases.join("")}"/>`);
  parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${hull}"/>`);
  return `<g class="iso-solid${className ? " " + className : ""}"${lit ? ' data-lit=""' : ""}>${parts.join("")}</g>`;
}

export function fdCone(K, P, cx, cy, r, z, h, style = {}, steps = 14) {
  const apex = [cx, cy, z + h];
  const base = Array.from({ length: steps }, (_, i) => { const t = (i / steps) * Math.PI * 2; return [cx + r * Math.cos(t), cy + r * Math.sin(t), z]; });
  const faces = base.map((b, i) => [b, base[(i + 1) % steps], apex]);
  faces.push([...base].reverse());
  return fdPoly(K, P, faces, { creaseAngle: 60, ...style });
}

// A house with a gabled roof, ridge along local u. F from fdFrame.
export function fdHouse(K, P, F, len, wid, eave, ridge, z = 0, style = {}) {
  const u = len / 2, v = wid / 2;
  const q = (a, b, zz) => [...F(a, b), zz];
  const b = [q(-u, -v, z), q(u, -v, z), q(u, v, z), q(-u, v, z)];
  const e = [q(-u, -v, z + eave), q(u, -v, z + eave), q(u, v, z + eave), q(-u, v, z + eave)];
  const r0 = q(-u, 0, z + ridge), r1 = q(u, 0, z + ridge);
  const faces = [
    [b[0], b[1], e[1], e[0]], [b[2], b[3], e[3], e[2]],
    [b[1], b[2], e[2], r1, e[1]], [b[3], b[0], e[0], r0, e[3]],
    [e[0], e[1], r1, r0], [e[2], e[3], r0, r1], [b[3], b[2], b[1], b[0]],
  ];
  return fdPoly(K, P, faces, { creaseAngle: 20, ...style });
}

// A box in a turned frame (u0..u1 along, v0..v1 across, z0..z0+h), as kit solid paths.
export const fdBox = (K, P, F, u0, u1, v0, v1, z0, h, bevel = 0) =>
  K.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z0, h, P, { bevel });

// ---------- the sand table ----------

// T = { plate:{x,y,w,d,r}, inner:{x,y,w,d}, frame:6, frameH:3.2, plateH:12, footH:5,
//       ruler:{x,y,w,d, km}, label:{x,y,w,d} }
// km = world units per notional kilometre. Returns { back, front } SVG strings: draw back
// before the terrain and front after everything on the board.
export function fdTable(K, P, T) {
  const S = (paths, style) => K.solidSvg(paths, style);
  const L = (d, style) => K.lineSvg(d, style);
  const at = (p) => K.iso(p, P);
  const { plate, inner } = T;
  const fw = T.frame ?? 6, fh = T.frameH ?? 3.2, ph = T.plateH ?? 12, foot = T.footH ?? 5;
  const byDepth = (pts) => [...pts].sort((a, b) => K.depthOf([a[0], a[1], 0], P) - K.depthOf([b[0], b[1], 0], P));
  const back = [`<path class="iso-halo" d="${K.haloOf(plate, -ph - foot, ph, P)}"/>`];
  for (const [x, y] of byDepth(K.corners(plate, 22))) {
    back.push(S(K.cylinder(x, y, 7, -ph - foot, 1.6, P, 28), { tone: "lo" }));
    back.push(S(K.cylinder(x, y, 5.4, -ph - foot + 1.6, foot - 1.6, P, 28), { tone: "mid" }));
  }
  back.push(S(K.slabOf(plate, -ph, ph, P, 8, 1.6), { tone: "mid", inner: L(K.sideSeam(plate, -ph / 2, P, 8), { tone: "faint" }) }));
  // the terrain floor: a thin board inside the frame, so the plate top reads as a tray
  const fz = 0.4;
  back.push(S(K.slabOf({ x: inner.x - fw, y: inner.y - fw, w: inner.w + fw * 2, d: inner.d + fw * 2, r: 1.2 }, 0, fz, P, 3), { tone: "lo", crease: "none" }));
  const bars = [
    { x: inner.x - fw, y: inner.y - fw, w: inner.w + fw * 2, d: fw, r: 1.2 },
    { x: inner.x - fw, y: inner.y, w: fw, d: inner.d, r: 1.2 },
    { x: inner.x + inner.w, y: inner.y, w: fw, d: inner.d, r: 1.2 },
    { x: inner.x - fw, y: inner.y + inner.d, w: inner.w + fw * 2, d: fw, r: 1.2 },
  ];
  const bar = (b) => S(K.slabOf(b, fz, fh, P, 3, 0.5), { tone: "mid" }) + L(K.planOutline(K.insetPlan(b, 1.6), fz + fh, P, 3), { tone: "faint" });
  back.push(bar(bars[0]), bar(bars[1]));
  const front = [bar(bars[2]), bar(bars[3])];
  // corner screws on the frame
  const screws = [[inner.x - fw / 2, inner.y - fw / 2], [inner.x + inner.w + fw / 2, inner.y - fw / 2], [inner.x - fw / 2, inner.y + inner.d + fw / 2], [inner.x + inner.w + fw / 2, inner.y + inner.d + fw / 2]];
  const screwSvg = (pts) => L(pts.map(([x, y]) => K.ring(x, y, 1.6, fz + fh, P, 14)).join(""), { tone: "lo" }) + K.dotsSvg(pts.map(([x, y]) => at([x, y, fz + fh])), { size: 0.45 });
  back.push(screwSvg(screws.slice(0, 2)));
  front.push(screwSvg(screws.slice(2)));
  // plate corner screws in the margin
  const ps = K.corners(plate, 9);
  front.push(L(ps.map(([x, y]) => K.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }) + K.dotsSvg(ps.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  if (T.ruler) front.push(fdScaleBar(K, P, T.ruler));
  if (T.label) front.push(fdLabel(K, P, T.label));
  return { back: back.join(""), front: front.join("") };
}

// A map scale bar on a strip: alternating raised blocks per quarter km, ticks rooted on the
// strip's back edge, a major tick per km and one tiny engraved label.
export function fdScaleBar(K, P, R) {
  const S = (paths, style) => K.solidSvg(paths, style);
  const L = (d, style) => K.lineSvg(d, style);
  const out = [S(K.slabOf({ x: R.x, y: R.y, w: R.w, d: R.d, r: 1 }, 0, 0.7, P, 3), { tone: "lo", crease: "none" })];
  const x0 = R.x + 4, x1 = R.x + R.w - 4, q = R.km / 4;
  const n = Math.floor((x1 - x0) / q + 1e-6);
  for (let i = 0; i < n; i++) {
    if (i % 2) continue;
    out.push(S(K.slabOf({ x: x0 + i * q, y: R.y + R.d * 0.55, w: q, d: R.d * 0.32, r: 0.2 }, 0.7, 0.5, P, 1), { tone: "mid", crease: "none" }));
  }
  out.push(L(K.planOutline({ x: x0, y: R.y + R.d * 0.55, w: n * q, d: R.d * 0.32, r: 0.2 }, 0.7, P, 1), { tone: "lo" }));
  const t = K.topTicks(x0, x0 + n * q, q / 2, 8, R.y + 0.5, 0.7, [1.2, 2.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(K.onTop([[x0, R.y + 0.5], [x0 + n * q, R.y + 0.5]], 0.7, P), { tone: "lo" }));
  if (R.text) out.push(K.faceTextSvg(K.topMatrix([x0 + n * q + 3, R.y + R.d * 0.82], 0.7, P, "x"), R.text, { size: 2.1, tone: "lo" }));
  return out.join("");
}

// A label plate with three rule lines standing for print.
export function fdLabel(K, P, B) {
  const out = [K.solidSvg(K.slabOf({ ...B, r: B.r ?? 1.5 }, 0, 0.8, P, 4), { tone: "lo", crease: "none" })];
  out.push(K.lineSvg(K.planOutline(K.insetPlan({ ...B, r: B.r ?? 1.5 }, 1.6), 0.8, P), { tone: "faint" }));
  const rows = [[0.72, 0.28], [0.5, 0.5], [0.6, 0.72]];
  rows.forEach(([len, dy]) => out.push(K.lineSvg(K.lineOnTop([B.x + 4, B.y + B.d * dy], [B.x + 4 + (B.w - 8) * len, B.y + B.d * dy], 0.8, P), { tone: "lo", free: true })));
  out.push(K.dotsSvg([K.iso([B.x + 2.4, B.y + 2.4, 0.8], P), K.iso([B.x + B.w - 2.4, B.y + B.d - 2.4, 0.8], P)], { size: 0.42 }));
  return out.join("");
}

// Faint grid on the floor, every `step`, running frame edge to frame edge.
export function fdGrid(K, P, inner, step = 20, z = 0.4) {
  const d = [];
  for (let x = inner.x + step; x < inner.x + inner.w - 1; x += step) d.push(K.onTop([[x, inner.y], [x, inner.y + inner.d]], z, P));
  for (let y = inner.y + step; y < inner.y + inner.d - 1; y += step) d.push(K.onTop([[inner.x, y], [inner.x + inner.w, y]], z, P));
  return K.lineSvg(d.join(""), { tone: "faint" });
}

// ---------- terrain ----------

// A low stepped contour hill: layers [{ring, h}] stacked, each with a faint contour line.
// Make the rings with fdBlob. Returns { svg, top, ring } where top is the summit height and
// ring the summit outline (for placing things on it).
export function fdHill(K, P, layers, z = 0.4) {
  let zz = z;
  const out = [];
  for (const { ring, h } of layers) {
    const paths = K.extrude(ring, zz, h, P, { convex: false, bevel: 0.6 });
    out.push(K.solidSvg(paths, { tone: "mid", inner: "" }));
    zz += h;
    out.push(K.lineSvg(K.onTop(fdInset(ring, 2.2), zz, P, true), { tone: "faint" }));
  }
  const halo = `<path class="iso-halo" d="${K.extrude(layers[0].ring, z, 0.1, P, { convex: false }).fill}" style="filter:blur(4px)"/>`;
  return { svg: halo + out.join(""), top: zz, ring: layers[layers.length - 1].ring };
}

// A wood: a flat irregular template (ring) and trees as separate depth-sortable items.
// trees: [{x, y, r, h, tiers}] (make them with fdScatter). Returns { base, items }.
export function fdWood(K, P, ring, trees, z = 0.4) {
  const base = K.solidSvg(K.extrude(ring, z, 0.5, P, { convex: false }), { tone: "lo", crease: "none", className: "fd-wood" }) +
    K.lineSvg(K.onTop(fdInset(ring, 1.6), z + 0.5, P, true), { tone: "faint" });
  const items = trees.map((t) => ({ key: K.depthOf([t.x, t.y, 0], P), svg: fdTree(K, P, t, z + 0.5) }));
  return { base, items };
}

// One conifer: a short trunk and one or two stacked cones.
export function fdTree(K, P, t, z = 0) {
  const out = [K.solidSvg(K.cylinder(t.x, t.y, t.r * 0.22, z, t.h * 0.18, P, 10), { tone: "mid", crease: "none" })];
  const z1 = z + t.h * 0.16;
  if ((t.tiers ?? 2) > 1) {
    out.push(fdCone(K, P, t.x, t.y, t.r, z1, t.h * 0.62, { tone: "mid" }));
    out.push(fdCone(K, P, t.x, t.y, t.r * 0.72, z1 + t.h * 0.34, t.h * 0.5, { tone: "mid" }));
  } else out.push(fdCone(K, P, t.x, t.y, t.r, z1, t.h * 0.84, { tone: "mid" }));
  return out.join("");
}

// Scatter n trees inside ring, at least `gap` apart, keeping out of every `avoid(x, y)` that returns true.
export function fdScatter(ring, n, { seed = 7, gap = 7.5, r = [3, 4.4], h = [8, 12], avoid = () => false, margin = 3 } = {}) {
  const rnd = fdRand(seed);
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const inner = fdInset(ring, margin);
  const out = [];
  for (let tries = 0; tries < n * 60 && out.length < n; tries++) {
    const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
    if (!fdInside(inner, [x, y]) || avoid(x, y)) continue;
    if (out.some((t) => Math.hypot(t.x - x, t.y - y) < gap)) continue;
    const s = rnd();
    out.push({ x, y, r: r[0] + (r[1] - r[0]) * s, h: h[0] + (h[1] - h[0]) * s, tiers: rnd() < 0.7 ? 2 : 1 });
  }
  return out;
}

// A ploughed field: a closed outline turned by ang, with n-1 furrows that end on it (ground layer).
export function fdField(K, P, cx, cy, w, d, ang = 0, n = 6, z = 0.4) {
  const F = fdFrame(cx, cy, ang);
  const ring = [F(-w / 2, -d / 2), F(w / 2, -d / 2), F(w / 2, d / 2), F(-w / 2, d / 2)];
  const furrows = [];
  for (let i = 1; i < n; i++) furrows.push(K.onTop([F(-w / 2 + (w * i) / n, -d / 2), F(-w / 2 + (w * i) / n, d / 2)], z, P));
  return K.lineSvg(K.onTop(ring, z, P, true), { tone: "lo" }) + K.lineSvg(furrows.join(""), { tone: "faint" });
}

// A hedge: a low bank along a polyline crowned with overlapping round bushes, so its top reads
// scalloped. Returns one item keyed at its middle (keep hedges short, under about 40 units).
export function fdHedge(K, P, pts, { z = 0.4, w = 1.7, h = 1.1, gap = 2.3, seed = 9 } = {}) {
  const rnd = fdRand(seed);
  const line = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / gap));
    for (let j = i ? 1 : 0; j <= n; j++) line.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
  }
  let svg = K.solidSvg(K.extrude(fdRibbon(line, w), z, h, P, { convex: false, bevel: 0.4 }), { tone: "mid" });
  const bumps = line.map(([x, y]) => [x, y, 1.6 + rnd() * 0.5, 1.8 + rnd() * 0.7]);
  bumps.sort((p, q) => K.depthOf([p[0], p[1], 0], P) - K.depthOf([q[0], q[1], 0], P));
  for (const [x, y, r, hh] of bumps) svg += K.solidSvg(K.cylinder(x, y, r, z + 0.3, hh, P, 12, 0.6), { tone: "mid", crease: "none" });
  const [mx, my] = line[Math.floor(line.length / 2)];
  return { key: K.depthOf([mx, my, 0], P), svg };
}

// A silo: a drum with a domed cap (two stepped drums) and a ladder line down its front.
export function fdSilo(K, P, x, y, z = 0.4, r = 3.2, h = 11) {
  const [vx, vy] = K.towardViewer(P);
  const lx = x + vx * r, ly = y + vy * r;
  return K.solidSvg(K.cylinder(x, y, r, z, h, P, 28), { tone: "mid", inner: K.lineSvg(K.sideArc(x, y, r, z + h * 0.5, P, 20), { tone: "faint" }) }) +
    K.solidSvg(K.cylinder(x, y, r * 0.78, z + h, 1.2, P, 24, 0.4), { tone: "mid" }) +
    K.solidSvg(K.cylinder(x, y, r * 0.4, z + h + 1.2, 0.9, P, 16), { tone: "mid", crease: "none" }) +
    K.lineSvg(K.pathOf([K.iso([lx, ly, z], P), K.iso([lx, ly, z + h], P)]), { tone: "lo" });
}

// A road or track: a flat ribbon along a smoothed polyline. Returns an SVG string (ground layer).
// Pass clip (the table's inner rect) when it runs off the board, so it ends on the frame.
export function fdRoad(K, P, pts, w = 3.4, z = 0.4, { tone = "lo", smooth = 6, clip } = {}) {
  const line = smooth ? fdSpline(pts, smooth) : pts;
  const ring = clip ? fdClipPoly(fdRibbon(line, w), clip) : fdRibbon(line, w);
  return K.solidSvg(K.extrude(ring, z, 0.25, P, { convex: false }), { tone, crease: "none", flat: true });
}

// A river: a water ribbon, two bank lines and ripples that fade out at both ends (ground layer).
// Run its ends past the frame and pass clip (the table's inner rect), so the banks end on it.
export function fdRiver(K, P, pts, w = 6, z = 0.4, seed = 3, clip) {
  const line = fdSpline(pts, 8);
  const water = clip ? fdClipPoly(fdRibbon(line, w), clip) : fdRibbon(line, w);
  const banks = [fdOffset(line, w), fdOffset(line, -w)].flatMap((b) => (clip ? fdClipLine(b, clip) : [b]));
  const out = [`<path class="fd-water" d="${K.onTop(water, z, P, true)}"/>`];
  out.push(K.lineSvg(banks.map((b) => K.onTop(b, z, P)).join(""), { tone: "mid" }));
  const rnd = fdRand(seed);
  for (let i = 1; i < line.length - 6; i += 4) {
    const off = (rnd() - 0.5) * w * 1.1;
    const seg = fdOffset(line.slice(i, i + 4 + Math.floor(rnd() * 3)), off);
    out.push(K.fadeLineSvg(seg.map((p) => K.iso([p[0], p[1], z], P)), { fade: [2.5, 2.5], tone: "lo" }));
  }
  return out.join("");
}

// ---------- unit counters ----------

// U = { x, y, z, face (deg), side: "f" | "h", fn: "inf"|"armor"|"mech"|"arty"|"recon",
//       ech: "plt"|"coy"|"bn", minis: "inf"|"veh"|"none", lit, len, wid }
// A rounded stand turned to face, a round symbol token at its rear (the symbol stays upright
// to the reader, so it never turns upside down), and miniatures along its front edge.
// Returns one depth-sortable item { key, svg }.
export function fdUnit(K, P, U) {
  const z = U.z ?? 0.4, len = U.len ?? 40, wid = U.wid ?? 28, ms = wid / 19;
  const F = fdFrame(U.x, U.y, U.face ?? 0);
  const side = U.side === "h" ? "h" : "f";
  const parts = [];
  const sub = (key, svg) => parts.push({ key, svg });
  const sh = 1.4 * Math.sqrt(ms);
  const stand = K.extrude(fdStandRing(F, len, wid, 1.8 * ms), z, sh, P, { bevel: 0.5 });
  const halo = `<path class="iso-halo" d="${stand.fill}" style="filter:blur(2.5px)"/>`;
  let base = halo + K.solidSvg(stand, { tone: "mid", lit: !!U.lit });
  // a front lip: the edge the unit faces
  base += K.lineSvg(K.onTop([F(len / 2 - 2.2, -wid / 2 + 1.2), F(len / 2 - 2.2, wid / 2 - 1.2)], z + sh, P), { tone: U.lit ? "lit" : "lo" });
  base += K.lineSvg(K.onTop([F(len / 2 - 2.2, -wid / 2 + 1.2), F(len / 2 - 0.4, -wid / 2 + 1.2)], z + sh, P), { tone: "faint" });
  base += K.lineSvg(K.onTop([F(len / 2 - 2.2, wid / 2 - 1.2), F(len / 2 - 0.4, wid / 2 - 1.2)], z + sh, P), { tone: "faint" });
  const zt = z + sh;
  // the token
  const tr = U.token ?? wid / 2 - 1.3;
  const [tx, ty] = F(-len / 2 + tr + 1.2, 0);
  sub(K.depthOf([tx, ty, 0], P), `<g class="fd-${side}">${K.solidSvg(K.cylinder(tx, ty, tr, zt, 2, P, 48, 0.5), { tone: "hi", crease: "lo", lit: !!U.lit })}</g>` +
    fdSymbol(K, P, tx, ty, zt + 2, side, U.fn, U.ech, tr * 0.86));
  // miniatures
  const mu0 = -len / 2 + tr * 2 + 2.4, mu1 = len / 2 - 3;
  if (U.minis === "veh") {
    const n = wid >= 15 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const v = n === 1 ? 0 : (i ? 1 : -1) * wid * 0.24;
      const G = fdFrame(...F((mu0 + mu1) / 2, v), U.face ?? 0);
      const [gx, gy] = G(0, 0);
      sub(K.depthOf([gx, gy, 0], P), fdVehicle(K, P, G, Math.min(mu1 - mu0, 12), zt));
    }
  } else if (U.minis !== "none") {
    const cols = 2, rows = wid >= 15 ? 3 : 2;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const u = mu0 + 1.6 * ms + (c / Math.max(1, cols - 1)) * (mu1 - mu0 - 3.2 * ms) + (r % 2) * 0.8 * ms;
      const v = (r - (rows - 1) / 2) * (wid - 5 * ms) / Math.max(1, rows - 1) * 0.8;
      const [fx, fy] = F(u, v);
      sub(K.depthOf([fx, fy, 0], P), fdFigure(K, P, fx, fy, zt, ms));
    }
  }
  parts.sort((a, b) => a.key - b.key);
  return { key: K.depthOf([U.x, U.y, 0], P), svg: `<g data-unit="${U.id ?? ""}">${base}${parts.map((p) => p.svg).join("")}</g>` };
}

function fdStandRing(F, len, wid, r = 1.8, steps = 4) {
  const out = [];
  const cs = [[len / 2 - r, -wid / 2 + r, -90], [len / 2 - r, wid / 2 - r, 0], [-len / 2 + r, wid / 2 - r, 90], [-len / 2 + r, -wid / 2 + r, 180]];
  for (const [cu, cv, a0] of cs) for (let i = 0; i <= steps; i++) {
    const a = (a0 + (90 * i) / steps) * FD_RAD;
    out.push(F(cu + r * Math.cos(a), cv + r * Math.sin(a)));
  }
  return out;
}

// One infantry figure: a body and a head.
export function fdFigure(K, P, x, y, z, s = 1) {
  return K.solidSvg(K.cylinder(x, y, 0.85 * s, z, 2.1 * s, P, 12), { tone: "mid", crease: "none" }) +
    K.solidSvg(K.cylinder(x, y, 0.62 * s, z + 2.1 * s, 0.9 * s, P, 12), { tone: "mid", crease: "none" });
}

// One small armoured vehicle in frame G (u forward): hull, turret and gun.
export function fdVehicle(K, P, G, len, z) {
  const w = len * 0.5;
  const hull = fdBox(K, P, G, -len / 2, len / 2, -w / 2, w / 2, z, 1.5, 0.25);
  const deck = fdBox(K, P, G, -len / 2 + 1, len / 2 - 1.6, -w / 2 + 0.6, w / 2 - 0.6, z + 1.5, 0.5, 0.15);
  const [cx, cy] = G(-len * 0.08, 0);
  const gun = fdBox(K, P, G, len * 0.05, len * 0.62, -0.28, 0.28, z + 2.45, 0.5);
  const turret = K.solidSvg(K.cylinder(cx, cy, w * 0.36, z + 2.0, 1.1, P, 18, 0.2), { tone: "mid" });
  const gunSvg = K.solidSvg(gun, { tone: "mid", crease: "none" });
  // gun drawn before the turret when it points away from the viewer
  const [vx, vy] = K.towardViewer(P);
  const [fx, fy] = G(1, 0), [ox, oy] = G(0, 0);
  const away = (fx - ox) * vx + (fy - oy) * vy < 0;
  return K.solidSvg(hull, { tone: "mid" }) + K.solidSvg(deck, { tone: "mid", crease: "none" }) + (away ? gunSvg + turret : turret + gunSvg);
}

// The engraved symbol on a token top at (x, y, z): frame, function icon and echelon, in the
// face plane, upright to the reader. side "f" friendly rectangle, "h" hostile diamond.
export function fdSymbol(K, P, x, y, z, side, fn, ech, size) {
  const V = fdView(K, P);
  const pt = (a, b) => [x + a * V.right[0] + b * V.up[0], y + a * V.right[1] + b * V.up[1]];
  const path = (list, closed) => K.onTop(list.map(([a, b]) => pt(a, b)), z, P, closed);
  const cls = side === "h" ? "fd-h" : "fd-f";
  const out = [];
  let frame, X, ell, diag, topAt, dy = 0;
  if (side === "h") {
    const s = size * 0.78;
    dy = -size * 0.08;
    frame = [[0, s + dy], [s, dy], [0, -s + dy], [-s, dy]];
    X = [[[-s / 2, -s / 2 + dy], [s / 2, s / 2 + dy]], [[-s / 2, s / 2 + dy], [s / 2, -s / 2 + dy]]];
    ell = [s * 0.46, s * 0.24];
    diag = [[-s / 2, -s / 2 + dy], [s / 2, s / 2 + dy]];
    topAt = [[0, s + dy]];
  } else {
    const w = size * 1.28, h = size * 0.84;
    dy = -size * 0.1;
    frame = [[-w / 2, h / 2 + dy], [w / 2, h / 2 + dy], [w / 2, -h / 2 + dy], [-w / 2, -h / 2 + dy]];
    X = [[[-w / 2, -h / 2 + dy], [w / 2, h / 2 + dy]], [[-w / 2, h / 2 + dy], [w / 2, -h / 2 + dy]]];
    ell = [w * 0.3, h * 0.28];
    diag = [[-w / 2, -h / 2 + dy], [w / 2, h / 2 + dy]];
    topAt = [[0, h / 2 + dy]];
  }
  out.push(`<path class="${cls}-fill" d="${path(frame, true)}"/>`);
  const lines = [path(frame, true)];
  if (fn === "inf" || fn === "mech") lines.push(path(X[0]), path(X[1]));
  if (fn === "recon") lines.push(path(diag));
  if (fn === "armor" || fn === "mech") {
    const e = [];
    for (let i = 0; i < 28; i++) { const t = (i / 28) * Math.PI * 2; e.push([ell[0] * Math.cos(t), ell[1] * Math.sin(t) + dy]); }
    lines.push(path(e, true));
  }
  // echelon above the frame: bars rooted on the frame's top, dots just above it
  const [ta, tb] = topAt[0];
  const bar = size * 0.22;
  if (ech === "coy") lines.push(path([[ta, tb], [ta, tb + bar]]));
  if (ech === "bn") for (const o of [-0.09, 0.09]) lines.push(path([[ta + o * size, tb - (side === "h" ? Math.abs(o) * size : 0)], [ta + o * size, tb + bar]]));
  out.push(K.lineSvg(lines.join(""), { tone: "hi", className: `${cls}-line` }));
  const dots = [];
  if (ech === "plt") for (const o of [-0.16, 0, 0.16]) dots.push(K.iso([...pt(ta + o * size, tb + bar * 0.75), z], P));
  if (fn === "arty") dots.push(K.iso([...pt(0, dy), z], P));
  if (dots.length) out.push(K.dotsSvg(dots, { size: 0.55, tone: "hi" }).replace('class="iso-dots"', `class="iso-dots ${cls}-dots"`));
  return out.join("");
}

// ---------- control measures ----------

// A peg: post with a cap. Phase lines, start points, checkpoints.
export function fdPeg(K, P, x, y, z = 0.4, h = 5) {
  return K.solidSvg(K.cylinder(x, y, 1.5, z, 0.6, P, 14), { tone: "lo", crease: "none" }) +
    K.solidSvg(K.cylinder(x, y, 0.75, z + 0.6, h - 1.4, P, 12), { tone: "mid", crease: "none" }) +
    K.solidSvg(K.cylinder(x, y, 1.15, z + h - 0.8, 0.8, P, 14, 0.2), { tone: "hi", crease: "lo" });
}

// A phase line: a row of pegs and a faint engraved line from peg to peg. skip(i) leaves a gap
// (for a track); the line still runs through the gap, so both its ends land on pegs.
// Returns { ground, items }.
export function fdPhaseLine(K, P, pts, z = 0.4, { skip = () => false } = {}) {
  const ground = K.lineSvg(K.onTop(pts, z, P), { tone: "lo" });
  const items = pts.filter((_, i) => !skip(i)).map(([x, y]) => ({ key: K.depthOf([x, y, 0], P), svg: fdPeg(K, P, x, y, z) }));
  return { ground, items };
}

// A boundary: a row of low square stakes with a dot on top. Returns items.
export function fdStakes(K, P, pts, z = 0.4, h = 4.2) {
  return pts.map(([x, y]) => ({
    key: K.depthOf([x, y, 0], P),
    svg: K.solidSvg(K.slabOf({ x: x - 0.7, y: y - 0.7, w: 1.4, d: 1.4, r: 0.2 }, z, h, P, 1, 0.15), { tone: "mid" }) +
      K.dotsSvg([K.iso([x, y, z + h], P)], { size: 0.4 }),
  }));
}

// An objective marker: a post on a footing with a flag, flying along `ang` degrees.
export function fdObjective(K, P, x, y, z = 0.4, { h = 15, ang = 200 } = {}) {
  const F = fdFrame(x, y, ang);
  return K.solidSvg(K.cylinder(x, y, 2.6, z, 1, P, 20, 0.3), { tone: "lo" }) +
    K.solidSvg(K.cylinder(x, y, 0.6, z + 1, h, P, 12), { tone: "mid", crease: "none" }) +
    K.solidSvg(K.cylinder(x, y, 0.95, z + h + 1, 0.9, P, 12), { tone: "mid", crease: "none" }) +
    K.solidSvg(fdBox(K, P, F, 0.5, 8.5, -0.2, 0.2, z + h - 4.4, 5), { tone: "hi", crease: "none" });
}

// A low earth bank (prepared position), an arc band about (cx, cy) from a0 to a1 degrees.
export function fdBerm(K, P, cx, cy, r0, r1, a0, a1, z, h = 1.5) {
  const sw = fdSweep(a0, a1, 4);
  const ring = sw.map((a) => fdPolar(cx, cy, r1, a)).concat(sw.reverse().map((a) => fdPolar(cx, cy, r0, a)));
  return K.solidSvg(K.extrude(ring, z, h, P, { convex: false, bevel: 0.4 }), { tone: "mid" });
}

// A fire sector engraved on the terrain: a closed fan outline plus a few range arcs that end on
// its radial edges. alpha fades it (0..1).
export function fdFan(K, P, cx, cy, r0, r1, a0, a1, z = 0.4, { side, arcs = 2, alpha = 1 } = {}) {
  const sw = fdSweep(a0, a1, 3);
  const ring = sw.map((a) => fdPolar(cx, cy, r1, a)).concat([...sw].reverse().map((a) => fdPolar(cx, cy, r0, a)));
  const d = [K.onTop(ring, z, P, true)];
  for (let i = 1; i <= arcs; i++) {
    const r = r0 + ((r1 - r0) * i) / (arcs + 1);
    d.push(K.onTop(sw.map((a) => fdPolar(cx, cy, r, a)), z, P));
  }
  const cls = side ? `fd-${side}-line` : undefined;
  const svg = K.lineSvg(d.join(""), { tone: "lo", className: cls });
  return alpha >= 0.999 ? svg : alpha < 0.02 ? "" : `<g opacity="${alpha.toFixed(2)}">${svg}</g>`;
}

// A closed engraved outline (battle position, support-by-fire position, assembly area).
export function fdOutline(K, P, ring, z = 0.4, { side, tone = "lo" } = {}) {
  return K.lineSvg(K.onTop(ring, z, P, true), { tone, className: side ? `fd-${side}-line` : undefined });
}

// A route trail: faint marks along pts. Start it on a peg and end it under a unit (or the
// reverse), so both ends land on something.
export function fdTrail(K, P, pts, z = 0.4, { side, dotted = false } = {}) {
  if (pts.length < 2) return "";
  return K.lineSvg(K.onTop(pts, z, P), { tone: "lo", dashed: !dotted, dotted, className: side ? `fd-${side}-line` : undefined });
}

// ---------- page only ----------

// Insert per-frame items into a layer of static items without re-rendering the statics.
// Static children carry data-k (their key) and are already in key order; items are
// { key, svg }. Old dynamic nodes (data-dyn) are removed first.
export function fdPlace(layer, items) {
  layer.querySelectorAll(":scope > [data-dyn]").forEach((n) => n.remove());
  const statics = [...layer.children];
  const keys = statics.map((n) => Number(n.getAttribute("data-k")));
  const sorted = [...items].sort((a, b) => a.key - b.key);
  const tmp = document.createElementNS("http://www.w3.org/2000/svg", "g");
  let j = 0;
  for (const item of sorted) {
    while (j < keys.length && keys[j] <= item.key) j++;
    tmp.innerHTML = `<g data-dyn="" data-k="${item.key}">${item.svg}</g>`;
    layer.insertBefore(tmp.firstChild, statics[j] || null);
  }
}

// Wrap items for the build: each becomes <g data-k> in key order. Items marked { dyn: true }
// (the first frame of the live items) get data-dyn, so the page's fdPlace replaces them.
export const fdStatic = (items) => [...items].sort((a, b) => a.key - b.key)
  .map((i) => `<g${i.dyn ? ' data-dyn=""' : ""} data-k="${i.key}">${i.svg}</g>`).join("");
