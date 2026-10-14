// The moving half of the figure: sheets on the line, the two rams, the feeder's
// pusher rod, the parts in the bin, the stop knobs and the meter needle. Rebuilt
// per frame. Written against the kit as a parameter (K) so build.mjs (Node) and
// the page (inlined kit) run the same code. build.mjs inlines this file with
// `export` stripped.

export const GEO = {
  ROLL: 11,            // roller top: where a sheet's underside rides
  HALF: 14,            // half the sheet's length (x)
  WIDE: 10,            // half the sheet's width (y)
  THICK: 1.2,          // sheet thickness
  NOTCH: 6,            // die V half-width
  GATE: -109,          // magazine gate front face (x): a sheet shows from here on
  UP: [20, 24],        // punch tip height at rest, shaping and decisive
  BEAM: [42, 48],      // underside of each press's crosshead
  BIN_FLOOR: 2,
  STACK: 1.7,          // rise per part in the bin
};

const SC_RAD = Math.PI / 180;

// A straight prism along world x or y, of a convex polygon given in the other
// floor axis and z. Same shading rules as the kit's prisms: four side tones by
// facing, the hull as fill and outline, creases at sharp corners.
export function prism(K, P, axis, poly, s0, s1, at0 = 0) {
  const a = (P.azimuth ?? 45) * SC_RAD, e = (P.elevation ?? 30) * SC_RAD;
  const V = [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)];
  const Lr = [-Math.sin(a), Math.cos(a), 1.2], ln = Math.hypot(...Lr);
  const L = Lr.map((v) => v / ln);
  const band = (score) => { const B = [0, 0.2, 0.42, 0.62]; let t = 0; while (t < 4 && score >= B[t]) t++; return t; };
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const W = (s, [u, z]) => (axis === "y" ? [u, s, z] : [s, u, z]);
  const N = (du, dz) => (axis === "y" ? [dz, 0, -du] : [0, dz, -du]);
  // orient counter-clockwise in (u, z) so outward normals are (dz, -du)
  let ring = poly.slice();
  let area = 0;
  for (let i = 0; i < ring.length; i++) { const [u0, z0] = ring[i], [u1, z1] = ring[(i + 1) % ring.length]; area += u0 * z1 - u1 * z0; }
  if (area < 0) ring.reverse();
  const n = ring.length;
  const lo = ring.map((p) => K.iso(W(s0, p), P));
  const hi = ring.map((p) => K.iso(W(s1, p), P));
  const buckets = [[], [], [], [], []];
  const seen = [];
  for (let j = 0; j < n; j++) {
    const [u0, z0] = ring[j], [u1, z1] = ring[(j + 1) % n];
    let nm = N(u1 - u0, z1 - z0);
    const len = Math.hypot(...nm) || 1;
    nm = nm.map((v) => v / len);
    const vis = dot(nm, V) > 1e-6;
    seen.push(vis);
    if (vis) buckets[band(dot(nm, L))].push(K.pathOf([lo[j], lo[(j + 1) % n], hi[(j + 1) % n], hi[j]], true));
  }
  const ax = axis === "y" ? [0, 1, 0] : [1, 0, 0];
  const caps = [[lo, ax.map((v) => -v)], [hi, ax]];
  const capSeen = caps.map(([, nm]) => dot(nm, V) > 1e-6);
  caps.forEach(([pts, nm], i) => capSeen[i] && buckets[band(dot(nm, L))].push(K.pathOf(pts, true)));
  const creases = [];
  for (let j = 0; j < n; j++) {
    const pv = (j - 1 + n) % n;
    const d0 = [ring[j][0] - ring[pv][0], ring[j][1] - ring[pv][1]];
    const d1 = [ring[(j + 1) % n][0] - ring[j][0], ring[(j + 1) % n][1] - ring[j][1]];
    const c = (d0[0] * d1[0] + d0[1] * d1[1]) / ((Math.hypot(...d0) * Math.hypot(...d1)) || 1);
    if (c < Math.cos(0.35) && seen[j] && seen[pv]) creases.push(K.pathOf([lo[j], hi[j]]));
    caps.forEach(([pts], i) => capSeen[i] && seen[j] && creases.push(K.pathOf([pts[j], pts[(j + 1) % n]])));
  }
  const hull = hull2([...lo, ...hi]);
  return { fill: K.pathOf(hull, true), outline: K.pathOf(hull, true), crease: creases.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) };
}

function hull2(points) {
  const s = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const lower = [], upper = [];
  for (const p of s) { while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-9) lower.pop(); lower.push(p); }
  for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-9) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// A bent sheet: two wings meeting at the bend line, apex underside at (xc, zb),
// each wing raised by half the bend. Clipped at xMin (the magazine gate).
export function sheetSvg(K, P, xc, y0, zb, bend, xMin = -Infinity) {
  return sheetParts(K, P, xc, y0, zb, bend, xMin).join("");
}

// The same sheet as [far wing, near wing], so a punch can sit between them.
export function sheetParts(K, P, xc, y0, zb, bend, xMin = -Infinity) {
  const { HALF, WIDE, THICK } = GEO;
  const al = (bend / 2) * SC_RAD;
  const c = Math.cos(al), s = Math.sin(al);
  const apexTop = zb + THICK / c;
  const style = { tone: "mid", crease: "lo" };
  if (bend < 0.5) {
    const x0 = Math.max(xc - HALF, xMin), x1 = xc + HALF;
    if (x1 - x0 < 0.3) return ["", ""];
    return [K.solidSvg(K.slabOf({ x: x0, y: y0 - WIDE, w: x1 - x0, d: WIDE * 2, r: 0 }, zb, THICK, P, 2), style), ""];
  }
  const left = [[xc - HALF * c, zb + HALF * s], [xc, zb], [xc, apexTop], [xc - HALF * c + THICK * s, zb + HALF * s + THICK * c]];
  const right = left.map(([u, z]) => [2 * xc - u, z]);
  return [K.solidSvg(prism(K, P, "y", left, y0 - WIDE, y0 + WIDE), style),
    K.solidSvg(prism(K, P, "y", right, y0 - WIDE, y0 + WIDE), style)];
}

// Where a sheet's apex underside sits, given the line state.
export function apexOf(sheet) {
  if (sheet.mode !== "press") return GEO.ROLL;
  const al = (sheet.bend / 2) * SC_RAD;
  return GEO.ROLL - GEO.NOTCH * Math.tan(al) * (sheet.stroke || 0);
}

// The live layer: everything that moves and has to be depth-sorted with the sheets.
export function scene(K, P, L, X, opts) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const at = (p) => K.iso(p, P);

  // sheets on the line
  const pressing = [null, null];
  for (const s of L.sheets) {
    if (s.mode === "land") {
      const g = opts.landing(s);
      const z = GEO.ROLL + (GEO.BIN_FLOOR + GEO.STACK * Math.min(3, opts.binCount(s.good)) - GEO.ROLL) * g.drop;
      put(depth(g.x, g.y, z), sheetSvg(K, P, g.x, g.y, z, s.bend));
      continue;
    }
    const zb = apexOf(s);
    if (s.mode === "press") {
      // far wing under the punch, near wing in front of it
      pressing[s.next] = s;
      const [far, near] = sheetParts(K, P, s.x, 0, zb, s.bend);
      put(depth(s.x, 0, zb), far);
      put(depth(s.x, 0, 30) + 0.6, near);
      continue;
    }
    put(depth(s.x, 0, zb), sheetSvg(K, P, s.x, 0, zb, s.bend, s.mode === "push" ? GEO.GATE : -Infinity));
  }

  // the two rams: rod, punch holder, punch. The decisive punch is the lit part.
  [X.shape, X.decide].forEach((x, i) => {
    const up = GEO.UP[i];
    const s = pressing[i];
    let tip = up;
    if (s) {
      const al = (s.bend / 2) * SC_RAD;
      const contact = apexOf(s) + GEO.THICK / Math.cos(al);
      tip = up + (contact - up) * (s.stroke || 0);
    }
    const lit = i === 1;
    const top = tip + 16;
    let out = "";
    out += solid(K.cylinder(x, 0, 2.3, top, GEO.BEAM[i] - top, P, 20), { tone: "mid", crease: "none" });
    out += solid(K.cylinder(x, 0, 3.6, top, 1.6, P, 22), { tone: "mid" });
    const holder = { x: x - 6, y: -12, w: 12, d: 24, r: 1 };
    out += solid(K.slabOf(holder, tip + 10, 6, P, 3, 0.4), { tone: "mid", inner: K.lineSvg(K.sideSeam(holder, tip + 12, P, 3), { tone: "faint" }) });
    out += K.dotsSvg([[x - 4, -9.5], [x + 4, -9.5], [x - 4, 9.5], [x + 4, 9.5]].map(([px, py]) => at([px, py, tip + 16])), { size: 0.42 });
    const punch = [[x, tip], [x + 3.4, tip + 5], [x + 3.4, tip + 10], [x - 3.4, tip + 10], [x - 3.4, tip + 5]];
    out += solid(prism(K, P, "y", punch, -11, 11), lit ? { tone: "hi", lit: true, crease: "lo" } : { tone: "mid", crease: "faint" });
    if (lit) out += K.lineSvg(K.segment([x, -11, tip], [x, 11, tip], P), { tone: "lit" });
    put(depth(x, 0, 30) + 0.5, out);
  });

  for (const extra of opts.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((it) => it.svg).join("");
}

// Parts already in the bin: nested bends in two compartments (good behind, scrap in front).
export function binSvg(K, P, bin, xc, opts = {}) {
  const out = [];
  for (const [kind, y, bend] of [["good", -13, 90], ["scrap", 12, 45]]) {
    const n = Math.min(3, bin[kind]);
    const list = [];
    for (let i = 0; i < n; i++) list.push(sheetSvg(K, P, xc, y, GEO.BIN_FLOOR + GEO.STACK * i, bend));
    out.push({ key: K.depthOf([xc, y, 0], P), svg: list.join("") });
  }
  return out;
}

// The pusher rod of the feeder's actuator, f = 0 home .. 1 full stroke.
export function rodSvg(K, P, f, x0, len, z) {
  const oct = [];
  for (let i = 0; i < 8; i++) oct.push([1.1 * Math.cos((i + 0.5) * Math.PI / 4), z + 1.1 * Math.sin((i + 0.5) * Math.PI / 4)]);
  return K.solidSvg(prism(K, P, "x", oct, x0, x0 + len + 30 * f), { tone: "mid", crease: "none" });
}

// The meter needle for a rate r in parts per minute, full scale `max`, 270 degree sweep.
export function needle(K, P, D, r, max) {
  const f = Math.max(0, Math.min(1, r / max));
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 2.6, D.y - sy * 2.6], [D.x + sx * (D.r - 3.2), D.y + sy * (D.r - 3.2)], D.top + 0.2, P);
}

// A stop knob: up and light when the stage runs, pressed down when stopped.
export function knobSvg(K, P, x, y, on) {
  const h = on ? 4.2 : 1.4;
  return K.solidSvg(K.cylinder(x, y, 3.4, 3.2, h, P, 24, 0.3), { tone: on ? "hi" : "lo", crease: "lo" }) +
    K.lineSvg(K.knurl(x, y, 3.4, 3.2, 3.2 + h, 20, P, 0.3), { tone: "faint" });
}
