// Maneuver Trainer core: terrain queries.
// A scenario's terrain spec (plain data, drawable with kit/terrain.mjs) becomes T with
//   height(x, y)            ground height; same terraced rises as kit trTerrain (exact rings)
//   cover(x, y)             { conceal, protect, woods, house, bed, hedge }   (0..1, notional)
//   los(ax, ay, aEye, bx, by, bEye, smoke)  visibility 0..1 (dead ground, woods, hedges, walls,
//                           houses, smoke clouds)
//   crossesObstacle(x0, y0, x1, y1, lanes)  index of a wire/obstacle line crossed, or -1
// Spec fields (all optional except world):
//   world: { w, h }, light: "day" | "limited"
//   rises:   [{ cx, cy, r, steps, h, top, seed, wobble, squash, lean: [dx, dy] }]   (kit trTerrain)
//   woods:   [{ ring: [[x, y]...] }]          draw with trWood(ring, trScatter(ring, ...))
//   hedges:  [[[x, y]...]]  walls: [[[x, y]...]]   polylines (trHedge / trWall)
//   streams: [{ pts, w }]   ditches: [{ pts, w }]   roads: [{ pts, w }]   (trStream / trRoad)
//   houses:  [{ x, y, ang, len, wid }]       (trHouse; ang in degrees, len along ang)
//   fields:  [{ cx, cy, w, d, ang, tint }]   (trField, decoration only)
//   wire:    [[[x, y]...]]  obstacle lines (trWire); mines: [{ ring }] minefield outlines
//   barriers: [[[x, y]...]]  impassable lines (river banks; not drawn); crossings: [{ x, y, r }] bridges / fords
// Pure; no DOM, no dependencies.

const RAD = Math.PI / 180;

// ---- kit-compatible helpers (copied from kit/field.mjs so heights match the renderer) ----
function fdRand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function blobRing(cx, cy, r, seed = 1, wobble = 0.12, steps = 48, squash = 1) {
  const rnd = fdRand(seed);
  const p2 = rnd() * 6.28, p3 = rnd() * 6.28, a2 = wobble * (0.6 + rnd() * 0.6), a3 = wobble * (0.3 + rnd() * 0.5);
  const out = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const rr = r * (1 + a2 * Math.sin(2 * t + p2) + a3 * Math.sin(3 * t + p3));
    out.push([+(cx + rr * Math.cos(t)).toFixed(1), +(cy + rr * Math.sin(t) * squash).toFixed(1)]);
  }
  return out;
}
export function inside(ring, x, y) {
  let ins = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
const bbox = (ring) => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of ring) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, x1, y0, y1];
};
export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
export function polyDist(px, py, pts) {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  return d;
}
function segCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx), d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
}
export function houseRing(h) {
  const c = Math.cos(h.ang * RAD), s = Math.sin(h.ang * RAD), L = h.len / 2, W = h.wid / 2;
  return [[-L, -W], [L, -W], [L, W], [-L, W]].map(([u, v]) => [h.x + u * c - v * s, h.y + u * s + v * c]);
}

// ---- terrain build (cached per spec object) ----
const CELL = 5;
const cache = new WeakMap();

export function buildTerrain(spec) {
  if (cache.has(spec)) return cache.get(spec);
  const W = spec.world.w, H = spec.world.h;
  // rises: identical ring construction to kit trTerrain
  const rises = (spec.rises || []).map((r, ri) => {
    const n = r.steps ?? 3, h = r.h ?? 2, top = r.top ?? 0.45, layers = [];
    for (let i = 0; i < n; i++) {
      const f = 1 - (i / Math.max(1, n - 1)) * (1 - top);
      const lx = (r.lean?.[0] ?? 0) * i, ly = (r.lean?.[1] ?? 0) * i;
      const ring = blobRing(r.cx + lx, r.cy + ly, r.r * f, (r.seed ?? 11) + i * 7 + ri * 31, r.wobble ?? 0.08, 64, r.squash ?? 1);
      layers.push({ ring, z0: i * h, h, box: bbox(ring) });
    }
    return { layers };
  });
  const heightExact = (x, y) => {
    let z = 0;
    for (const rise of rises) for (const L of rise.layers) {
      const [x0, x1, y0, y1] = L.box;
      if (x < x0 || x > x1 || y < y0 || y > y1) break;
      if (inside(L.ring, x, y)) z = L.z0 + L.h; else break;
    }
    return z;
  };
  const woods = (spec.woods || []).map((w) => ({ ring: w.ring, box: bbox(w.ring) }));
  const houses = (spec.houses || []).map((h) => { const ring = houseRing(h); return { ring, box: bbox(ring) }; });
  const hedges = spec.hedges || [], walls = spec.walls || [];
  const beds = [...(spec.streams || []), ...(spec.ditches || [])];
  const wire = [...(spec.wire || []), ...(spec.barriers || [])];
  const nWire = (spec.wire || []).length;

  // grids: height, cover classes
  const gw = Math.ceil(W / CELL) + 1, gh = Math.ceil(H / CELL) + 1;
  const hgt = new Float32Array(gw * gh), conceal = new Float32Array(gw * gh), protect = new Float32Array(gw * gh);
  const flag = new Uint8Array(gw * gh); // 1 woods, 2 house, 4 bed, 8 hedge, 16 wall
  const houseId = new Int16Array(gw * gh).fill(-1);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = i * CELL, y = j * CELL, k = j * gw + i;
    hgt[k] = heightExact(x, y);
    let c = 0, p = 0, f = 0;
    for (const w of woods) { const [x0, x1, y0, y1] = w.box; if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && inside(w.ring, x, y)) { c = Math.max(c, 0.6); p = Math.max(p, 0.35); f |= 1; } }
    houses.forEach((h, hi) => { const [x0, x1, y0, y1] = h.box; if (x >= x0 - 1 && x <= x1 + 1 && y >= y0 - 1 && y <= y1 + 1 && inside(h.ring, x, y)) { c = Math.max(c, 0.75); p = Math.max(p, 0.7); f |= 2; houseId[k] = hi; } });
    for (const b of beds) if (polyDist(x, y, b.pts) < (b.w ?? 4) / 2 + 2.5) { c = Math.max(c, 0.55); p = Math.max(p, 0.5); f |= 4; }
    for (const hd of hedges) if (polyDist(x, y, hd) < 4) { c = Math.max(c, 0.5); p = Math.max(p, 0.15); f |= 8; }
    for (const wl of walls) if (polyDist(x, y, wl) < 3.5) { c = Math.max(c, 0.4); p = Math.max(p, 0.7); f |= 16; }
    conceal[k] = c; protect[k] = p; flag[k] = f;
  }
  const idx = (x, y) => {
    const i = Math.max(0, Math.min(gw - 1, Math.round(x / CELL))), j = Math.max(0, Math.min(gh - 1, Math.round(y / CELL)));
    return j * gw + i;
  };
  const height = (x, y) => hgt[idx(x, y)];
  const coverObj = new Array(gw * gh);
  const cover = (x, y) => {
    const k = idx(x, y);
    let o = coverObj[k];
    if (!o) { const f = flag[k]; o = coverObj[k] = { conceal: conceal[k], protect: protect[k], woods: !!(f & 1), house: !!(f & 2), bed: !!(f & 4), hedge: !!(f & 8), wall: !!(f & 16), houseId: houseId[k] }; }
    return o;
  };

  // line of sight: 0..1
  const los = (ax, ay, aEye, bx, by, bEye, smoke) => {
    const d = Math.hypot(bx - ax, by - ay);
    if (d < 1) return 1;
    const za = hgt[idx(ax, ay)] + aEye, zb = hgt[idx(bx, by)] + bEye;
    const n = Math.max(2, Math.ceil(d / Math.max(6, d / 45)));
    let woodLen = 0, f = 1, prevHedge = 0;
    const ha = houseId[idx(ax, ay)], hb = houseId[idx(bx, by)];
    for (let s = 1; s < n; s++) {
      const t = s / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, k = idx(x, y);
      const zl = za + (zb - za) * t;
      const fl = flag[k], da = t * d, db = (1 - t) * d;
      if (hgt[k] + 0.25 > zl && da > 8 && db > 8) return 0; // dead ground: the slope hides it
      if ((fl & 2) && houseId[k] !== ha && houseId[k] !== hb) return 0;
      if ((fl & 1) && da > 10 && db > 10) woodLen += d / n;
      const hedgy = fl & 24;
      if (hedgy && !prevHedge) {
        // a hedge or wall right at an end: someone kneeling or higher looks over it; lower hides behind it
        if (da > 7 && db > 7) f *= (fl & 8) ? 0.2 : 0.35;
        else if ((da <= 7 && aEye < 1) || (db <= 7 && bEye < 1)) f *= (fl & 8) ? 0.15 : 0.1;
      }
      prevHedge = hedgy;
    }
    f *= Math.exp(-woodLen / 22);
    if (smoke) for (const c of smoke) if (segDist(c.x, c.y, ax, ay, bx, by) < c.r) f *= 0.05;
    return f;
  };

  // obstacle crossing (wire lines); lanes = [{ x, y, r }]
  const crossesObstacle = (x0, y0, x1, y1, lanes) => {
    for (let w = 0; w < wire.length; w++) {
      const pts = wire[w];
      for (let i = 0; i < pts.length - 1; i++) {
        if (!segCross(x0, y0, x1, y1, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])) continue;
        const lane = (lanes || []).some((l) => Math.hypot(l.x - x1, l.y - y1) < l.r || Math.hypot(l.x - x0, l.y - y0) < l.r);
        if (!lane) return w >= nWire ? 1000 + w : w;
      }
    }
    return -1;
  };
  const inMines = (x, y) => (spec.mines || []).some((m) => inside(m.ring, x, y));

  const T = { spec, world: spec.world, light: spec.light || "day", height, heightExact, cover, los, crossesObstacle, inMines };
  cache.set(spec, T);
  return T;
}
