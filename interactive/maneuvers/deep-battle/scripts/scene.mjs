// The moving half of the deep-battle bench: both gates, the obstacle pins, the
// first-echelon gantry with its plough, the second-echelon carriage, the reserve
// shuttle on its lead screw, the assembly cradle and latch, the end buffer and
// the day clock. Rebuilt per frame from a model state.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  KM: 3,             // world units per km along the axis of attack
  X0: -99,             // world x of the start line (0 km)
  RAIL: 3.7,           // rail top
  ARCH: 7,             // half-length of the gantry, world units (MODEL.archHalf km)
  MG: 7.9,             // half-length of the second-echelon carriage (MODEL.mgHalf km)
  POST: 28,            // gate post centre, |y|
  LEAF_LIFT: 25,       // how far a gate leaf rises
  RES_X: 2,            // reserve shuttle rail centre, just beyond the rear gate
  RES_Y0: -64,         // shuttle centre, at its depot
  RES_Y1: -42.2,       // shuttle centre when its pusher meets the trip arm
  SCREW_X: 13.5,       // lead screw axis
  SCREW_Z: 5.4,
  CRADLE_KM: -12,      // second echelon's start, km
  DIAL: { x: 116, y: -58, r: 15, z: 22, h: 7 },
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;

export const xOf = (km) => GEO.X0 + km * GEO.KM;
const SC_RAD = Math.PI / 180;

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

export function scene(K, P, S, M) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  const slab = (x0, x1, y0, y1, z, h, steps = 3, bevel = 0, r = 0.8) =>
    K.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z, h, P, steps, bevel);
  const halo = (x0, x1, y0, y1, z) =>
    `<path class="iso-halo" d="${K.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 2 }, z, 0.1, P).fill}" style="filter:blur(3px)"/>`;
  const R = GEO.RAIL;

  // ---- gates: far post, near post, then leaf and lintel ----
  const gate = (km, lift) => {
    const x = xOf(km);
    const post = (y0, y1) => solid(slab(x - 2.5, x + 2.5, y0, y1, 0, 44, 3, 0.4), { tone: "mid", inner: line(K.sideSeam({ x: x - 2.5, y: y0, w: 5, d: y1 - y0, r: 0.8 }, 6, P, 3), { tone: "faint" }) });
    put(depth(x, -GEO.POST), sceneMemo(P, ["postF", x], () => post(-30, -26) + solid(slab(x - 3.5, x + 3.5, -31, -25, 0, 2.4, 3, 0.3), { tone: "lo" })));
    put(depth(x, GEO.POST), sceneMemo(P, ["postN", x], () => solid(slab(x - 3.5, x + 3.5, 25, 31, 0, 2.4, 3, 0.3), { tone: "lo" }) + post(26, 30)));
    put(depth(x, 0) + 1.5, sceneMemo(P, ["leaf", x, lift], () => {
    const z0 = R + lift * GEO.LEAF_LIFT;
    const leafPlan = { x: x - 1.2, y: -25.6, w: 2.4, d: 51.2, r: 0.5 };
    const leaf = solid(K.slabOf(leafPlan, z0, 14.4, P, 2, 0.3), {
      tone: "hi", crease: "lo",
      inner: line(K.sideSeam(leafPlan, z0 + 4.8, P, 2) + K.sideSeam(leafPlan, z0 + 9.6, P, 2), { tone: "lo" }),
    });
    const lintel = solid(slab(x - 2.8, x + 2.8, -31, 31, 44, 4, 3, 0.5), { tone: "mid" }) +
      dots([[x, -28, 48], [x, 28, 48], [x, -12, 48], [x, 12, 48]], 0.42);
    return leaf + lintel;
    }));
  };
  gate(M.gateA, S.liftA);
  gate(M.gateB, S.liftB);

  // ---- obstacle pins in the tactical zone: stand until the plough passes, then drop flush ----
  M.pins.forEach((km, i) => {
    const x = xOf(km);
    const drop = S.pins[i];
    const h = 0.6 + (1 - drop) * 7;
    const svg = sceneMemo(P, ["pin", x, drop], () => solid(K.cylinder(x, 0, 1.8, 0, h, P, 20, 0.3), { tone: drop > 0.98 ? "mid" : "hi", crease: "lo" }) +
      line(K.ring(x, 0, 0.8, h, P, 12), { tone: "lo" }));
    put(drop > 0.98 ? -1e3 + i : depth(x, 0), svg);
  });

  // ---- assembly cradle and latch for the second echelon ----
  {
    const xc = xOf(GEO.CRADLE_KM);
    const wall = (y0, y1) => solid(slab(xc - 12, xc + 10, y0, y1, 0, 9, 3, 0.4), { tone: "mid", inner: line(K.sideSeam({ x: xc - 12, y: y0, w: 22, d: y1 - y0, r: 0.8 }, 4.5, P, 3), { tone: "faint" }) }) +
      dots([[xc - 9, (y0 + y1) / 2, 9], [xc + 7, (y0 + y1) / 2, 9]]);
    put(depth(xc, -13), sceneMemo(P, ["wallF"], () => wall(-14.5, -11.5)));
    put(depth(xc, 13), sceneMemo(P, ["wallN"], () => wall(11.5, 14.5)));
    // latch bar pivots on the near wall's front end and swings forward to open
    const px = xc + 10 + 1.6, py = 13;
    const ang = -90 + 88 * S.latch;
    const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
    const F = (u, v) => [px + u * c - v * s, py + u * s + v * c];
    const latchSvg = sceneMemo(P, ["latch", S.latch], () => {
    const bar = K.extrude([F(0, -1.1), F(25, -1.1), F(25, 1.1), F(0, 1.1)], 6.5, 2.6, P, { bevel: 0.25 });
    return solid(K.cylinder(px, py, 2.2, 0, 6.5, P, 20), { tone: "mid" }) +
      solid(bar, { tone: "hi", crease: "lo" }) +
      solid(K.cylinder(px, py, 1.5, 9.1, 1.4, P, 16), { tone: "mid" });
    });
    const mid = F(12, 0);
    put(depth(mid[0], mid[1]) + 0.5, latchSvg);
  }

  // ---- commitment timer: a drum marked in days turns with the clock; its peg is the commit day,
  // and when the peg reaches the index lever a push rod opens the cradle latch ----
  {
    const cx = xOf(GEO.CRADLE_KM) + 11.6, cy = 35.4, R0 = 13;
    const span = 1.5 * Math.PI;
    const turn = (d) => ((d - S.t) / M.days) * span;
    const top = 10;
    let out = sceneMemo(P, ["drum"], () => {
    let out = halo(cx - 16, cx + 16, cy - 16, cy + 16, 0);
    out += solid(K.slabOf({ x: cx - 16, y: cy - 16, w: 32, d: 32, r: 3 }, 0, 3, P, 5, 0.5), { tone: "mid" });
    out += dots([[cx - 13.4, cy - 13.4, 3], [cx + 13.4, cy - 13.4, 3], [cx - 13.4, cy + 13.4, 3], [cx + 13.4, cy + 13.4, 3]]);
    out += solid(K.cylinder(cx, cy, R0, 3, top - 3, P, 72, 0.6), { tone: "mid", inner: line(K.sideArc(cx, cy, R0, 6.5, P, 48), { tone: "faint" }) });
    out += line(K.ring(cx, cy, R0 - 1.6, top, P, 72), { tone: "faint" });
    return out;
    });
    // the drum body, its turning ticks and the peg go in as separate items under one key (the
    // sort is stable) so the page re-parses only the parts that changed
    put(depth(cx, cy), out);
    out = sceneMemo(P, ["ticks", M.days, S.t], () => {
      const t = K.radialTicks(cx, cy, R0 - 1.6, M.days * 4, 4, top, [1.2, 2.6], P, turn(0), span);
      return line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    });
    out += sceneMemo(P, ["hub"], () => solid(K.cylinder(cx, cy, 2.4, top, 1.6, P, 20), { tone: "mid" }));
    const pa = turn(S.commit);
    const px = cx + Math.sin(pa) * (R0 - 5.6), py = cy - Math.cos(pa) * (R0 - 5.6);
    out += solid(K.cylinder(px, py, 1.3, top, 3.2, P, 16), { tone: "hi", crease: "lo" });
    put(depth(cx, cy), out);
    // index lever on its post at the drum's far edge, and the push rod to the latch pivot
    const ly = cy - R0 - 2.2;
    put(depth(cx, ly), sceneMemo(P, ["lever", S.latch], () =>
      solid(slab(cx - 1.2, cx + 1.2, 15.2, ly - 2, 1.2, 1.8, 2, 0.2, 0.5), { tone: "mid" }) +
      solid(slab(cx - 2, cx + 2, ly - 2, ly + 2, 0, 13, 2, 0.3, 0.6), { tone: "mid" }) +
      solid(slab(cx - 0.9, cx + 0.9, ly, ly + 6.6 + 1.4 * S.latch, 13, 1.4, 2, 0.2, 0.4), { tone: "hi", crease: "lo" })));
  }

  // ---- reserve: depot housing, lead screw, shuttle with nut ----
  {
    const xr = GEO.RES_X;
    const yr = GEO.RES_Y0 + (GEO.RES_Y1 - GEO.RES_Y0) * S.reserve;
    const sx = GEO.SCREW_X, sz = GEO.SCREW_Z;
    // gearbox and handwheel at the far end of the screw
    put(depth(sx, -76), sceneMemo(P, ["gearbox"], () =>
      solid(slab(sx - 5, sx + 5, -80, -72, 0, 10, 3, 0.5), { tone: "mid" }) +
      dots([[sx - 3.4, -78.4, 10], [sx + 3.4, -73.6, 10]]) +
      solid(K.cylinder(sx, -76, 3.4, 10, 2.6, P, 24), { tone: "mid" }) +
      line(K.knurl(sx, -76, 3.4, 10, 12.6, 22, P), { tone: "lo" }) +
      line(K.lineOnTop([sx, -76], [sx + 2.6, -76 + 1.4], 12.6, P), { tone: "hi" })));
    // bearing block at the gate end
    put(depth(sx, -31), sceneMemo(P, ["bearing"], () =>
      solid(slab(sx - 3.4, sx + 3.4, -33, -29, 0, 9, 3, 0.4), { tone: "mid" }) +
      dots([[sx, -31, 9]])));
    // the screw, split at the nut so each half sorts on its own
    const nut0 = yr - 3, nut1 = yr + 3;
    const rod = (y0, y1, key) => {
      if (y1 - y0 < 0.5) return;
      put(key, sceneMemo(P, ["rod", y0, y1], () => {
        const thread = K.coil(y0 + 0.6, y1 - 0.6, [sx, sz], 1.35, (y1 - y0 - 1.2) / 1.6, "y", P, 12);
        return line(thread.back, { tone: "lo" }) +
          solid(slab(sx - 1.3, sx + 1.3, y0, y1, sz - 1.3, 2.6, 3, 0, 1.2), { tone: "mid", crease: "none" }) +
          line(thread.front, { tone: "mid" });
      }));
    };
    const nearKey = depth(sx, (nut1 - 33) / 2) - 0.2;
    rod(-72, nut0, depth(sx, (-72 + nut0) / 2) - 0.2);
    rod(nut1, -33, nearKey);
    // shuttle: shoes on two rails, body, the reserve block on top, and the nut arm
    const sh = sceneMemo(P, ["shuttle", yr], () => {
    let sh = halo(xr - 8, xr + 8, yr - 7, yr + 7, 2.5);
    const shoes = [];
    for (const dx of [-4, 4]) for (const dy of [-4.5, 4.5]) shoes.push([xr + dx, yr + dy]);
    const shoe = ([x, y]) => solid(slab(x - 1.8, x + 1.8, y - 1.6, y + 1.6, 2.5, 2.4, 2, 0.2, 0.5), { tone: "mid" });
    const near = ([x, y]) => depth(x, y) > depth(xr, yr);
    sh += shoes.filter((p) => !near(p)).map(shoe).join("");
    sh += solid(slab(xr - 7, xr + 7, yr - 6.5, yr + 6.5, 4, 3, 4, 0.5, 1.5), { tone: "mid" });
    sh += shoes.filter(near).map(shoe).join("");
    sh += solid(slab(xr - 5, xr + 5, yr - 4.5, yr + 4.5, 7, 6, 3, 0.5, 1), { tone: "hi", crease: "lo" });
    sh += dots([[xr - 5.6, yr - 5, 7], [xr + 5.6, yr - 5, 7], [xr - 5.6, yr + 5, 7], [xr + 5.6, yr + 5, 7]]);
    // pusher pad on the gate side: the face that trips the rear gate's latch
    sh += solid(slab(xr - 3, xr + 3, yr + 6.5, yr + 8, 6, 4, 2, 0.2, 0.4), { tone: "mid" });
    return sh;
    });
    put(depth(xr, yr), sh);
    const nutKey = Math.max(depth(sx, yr), nearKey) + 0.1;
    items[items.length - 1].key = Math.max(items[items.length - 1].key, nutKey + 0.1);
    put(nutKey, sceneMemo(P, ["nut", yr], () =>
      solid(slab(Math.min(sx, xr) + 7, Math.max(sx, xr) - 2.6, yr - 2.2, yr + 2.2, 4.6, 2.4, 2, 0.2, 0.4), { tone: "mid" }) +
      solid(slab(sx - 2.6, sx + 2.6, nut0, nut1, sz - 2.6, 5.2, 3, 0.4, 1), { tone: "mid" }) +
      dots([[sx, yr, sz + 2.6]])));
    // trip arm cantilevered off the rear gate's far post; the pusher meets its far face on arrival
    const xg = xOf(M.gateB);
    put(depth((xg + xr) / 2, -32.1), sceneMemo(P, ["trip", xg], () =>
      solid(slab(xg + 2.5, xr + 3.5, -34.2, -30, 8, 3, 2, 0.2, 0.5), { tone: "mid" }) +
      dots([[xg + 4.5, -32.1, 11], [xr + 1.5, -32.1, 11]])));
  }

  // ---- first echelon: a gantry on the outer rails with a plough under its front ----
  const xa = xOf(S.f1) - GEO.ARCH;
  const xm = xOf(S.c2);
  const under = Math.abs(xm - xa) < GEO.ARCH + GEO.MG + 2;
  {
    const truck = (sgn) => {
      const y0 = sgn > 0 ? 17.5 : -23.5;
      const yc = y0 + 3;
      return solid(slab(xa - 7, xa + 7, y0, y0 + 6, R, 3.6, 3, 0.4), { tone: "mid" }) +
        dots([[xa - 5, yc, R + 3.6], [xa + 5, yc, R + 3.6]]) +
        solid(slab(xa - 3, xa + 3, yc - 2, yc + 2, R + 3.6, 20 - R - 3.6, 3, 0.3), { tone: "mid", inner: line(K.sideSeam({ x: xa - 3, y: yc - 2, w: 6, d: 4, r: 0.8 }, 14, P, 3), { tone: "faint" }) });
    };
    put(depth(xa, -20.5), sceneMemo(P, ["truckF", xa], () => halo(xa - 8, xa + 8, -24.5, -16.5, R) + truck(-1)));
    put(depth(xa, 20.5), sceneMemo(P, ["truckN", xa], () => halo(xa - 8, xa + 8, 16.5, 24.5, R) + truck(1)));
    const beamKey = under ? Math.max(depth(xa, 0), depth(xm, 0) + 0.5) : depth(xa, 0);
    put(beamKey + 0.2, sceneMemo(P, ["gantry", xa], () =>
      solid(slab(xa - 5, xa + 5, -24, 24, 20, 5, 4, 0.5, 1.2), { tone: "hi", crease: "lo", inner: line(K.sideSeam({ x: xa - 5, y: -24, w: 10, d: 48, r: 1.2 }, 22.5, P, 4), { tone: "faint" }) }) +
      dots([[xa - 3.4, -21.5, 25], [xa + 3.4, -21.5, 25], [xa - 3.4, 21.5, 25], [xa + 3.4, 21.5, 25]]) +
      solid(K.cylinder(xa, 0, 2.6, 25, 2.4, P, 20), { tone: "mid" }) +
      line(K.knurl(xa, 0, 2.6, 25, 27.4, 18, P), { tone: "lo" })));
    // plough: raised clear once the breach is complete so the second echelon passes under
    const bz = 1.5 + S.blade * 11;
    put(beamKey + 0.4, sceneMemo(P, ["plough", xa, bz], () =>
      solid(slab(xa + 3.8, xa + 5, -1, 1, bz + 7.5, 20 - bz - 7.5, 2, 0, 0.4), { tone: "mid", crease: "none" }) +
      solid(slab(xa + 3.5, xa + 6.5, -3.5, 3.5, bz, 7.5, 2, 0.3, 0.6), { tone: "hi", crease: "lo" })));
  }

  // ---- second echelon: the carriage to watch ----
  {
    const out = sceneMemo(P, ["carriage", xm], () => {
    let out = halo(xm - 9, xm + 9, -9, 9, R);
    const shoes = [];
    for (const dx of [-5, 5]) for (const dy of [-6, 6]) shoes.push([xm + dx, dy]);
    const shoe = ([x, y]) => solid(slab(x - 2.6, x + 2.6, y - 2, y + 2, R, 2.4, 2, 0.2, 0.5), { tone: "mid" });
    const near = ([x, y]) => depth(x, y) > depth(xm, 0);
    out += shoes.filter((p) => !near(p)).map(shoe).join("");
    out += solid(slab(xm - GEO.MG, xm + GEO.MG, -9, 9, R + 2.4, 3.4, 4, 0.5, 1.5), { tone: "mid" });
    out += shoes.filter(near).map(shoe).join("");
    out += dots([[xm - 6.4, -7.5, R + 5.8], [xm + 6.4, -7.5, R + 5.8], [xm - 6.4, 7.5, R + 5.8], [xm + 6.4, 7.5, R + 5.8]]);
    const wedge = [[7.9, 0], [1.5, -6], [-6.5, -6], [-6.5, 6], [1.5, 6]].map(([u, v]) => [xm + u, v]);
    out += solid(K.extrude(wedge, R + 5.8, 2.5, P, { bevel: 0.35 }), { tone: "hi", lit: true, crease: "lo" });
    out += line(K.onTop([[xm - 6.5, 0], [xm + 7.9, 0]], R + 8.3, P), { tone: "lit" });
    return out;
    });
    put(depth(xm, 0), out);
  }

  // ---- end buffer at the deep end ----
  {
    const x0 = xOf(M.deep) + 0.3;
    const rods = [-5, 5].map((y) => sceneMemo(P, ["buffer", x0, y], () => {
      const coil = K.coil(x0 + 1.2, x0 + 6, [y, 7], 1.9, 4, "x", P);
      return line(coil.back, { tone: "lo" }) +
        solid(slab(x0 + 1, x0 + 6.2, y - 0.9, y + 0.9, 6.1, 1.8, 2, 0, 0.8), { tone: "mid", crease: "none" }) +
        line(coil.front, { tone: "mid" }) +
        solid(slab(x0, x0 + 1.2, y - 2.6, y + 2.6, 4.4, 5.2, 2, 0.2, 0.6), { tone: "mid" });
    }));
    put(depth(x0 + 3, -5), rods[0]);
    put(depth(x0 + 3, 5), rods[1]);
    put(depth(x0 + 10, 0) - 2, sceneMemo(P, ["block", x0], () =>
      solid(slab(x0 + 6, x0 + 14, -12, 12, 0, 13, 4, 0.5, 1.4), { tone: "mid", inner: line(K.sideSeam({ x: x0 + 6, y: -12, w: 8, d: 24, r: 1.4 }, 3, P, 4), { tone: "faint" }) }) +
      dots([[x0 + 10, -9, 13], [x0 + 10, 9, 13], [x0 + 10, -3, 13], [x0 + 10, 3, 13]])));
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  if (S.items) return items; // the page patches its live layer item by item
  return items.map((item) => item.svg).join("");
}

// The day-clock needle for day t: a 270 degree sweep over M.days, kit tick convention.
export function needle(K, P, D, t, days) {
  const f = Math.max(0, Math.min(1, t / days));
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.6), D.y + sy * (D.r - 3.6)], D.top + 0.2, P);
}
