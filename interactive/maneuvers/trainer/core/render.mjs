// Maneuver Trainer core: draws a scenario and the sim state with the terrain kit (../../kit/terrain.mjs).
//
//   fitView(scen, W, H)              → projection P that fits the scenario's action area to a W×H card
//   staticScene(scen, P, T, opts)    → { ground, items, holes }: ground layer, depth-sorted standing cover, and
//                                       the enemy fighting positions per element (drawn only once spotted)
//   chalkRoute(P, T, pts, opts)      → a chalk arrow on the ground (dashed line, start dot, closed arrowhead)
//   createMap(host, scen, opts)      → page only: { P, T, frame(state, t, view), setPlan(marks), pick(cx, cy),
//                                       toView([x, y]), resize(W, H), stats() }
//
// World: the core's notional metres (+y north, angles counter-clockwise from east). The kit's iso
// projection is mirror-handed for such a map (screen y grows downward), so everything is drawn in
// "kit space" (x, -y) with angles negated: mirrorScen() and mirrorState() do that once, and pick()
// maps back. The camera (azimuth 62) then looks from the south-south-east: north is up the card,
// east to the right, and the friendly side, usually south, is nearest the viewer. Soldiers, trees and positions are drawn
// larger than the ground (LOOK.fig, LOOK.tree) so they read at company scale on a phone; budget per
// TERRAIN.md: about 60 figures (beyond that, soldiers are drawn in small clusters of 2 or 3).
// Pure except createMap (DOM).

import * as K from "../../kit/iso-kit.mjs";
import { fdBlob, fdFrame, fdRand, fdOffset, fdRibbon, fdSpline, fdPeg } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trNest, trWire, trChalk, trObjective, trSoldier, trLook, trFaceStep, trVehicle, trShots, trStage, trFire, trDrape } from "../../kit/terrain.mjs";

export const LOOK = {
  azimuth: 62, elevation: 42,
  fig: { fireteam: 3.0, platoon: 2.0, company: 3.0 },    // figure size vs the ground (kit figures are already about 1.5x)
  tree: { fireteam: 1.3, platoon: 1.45, company: 2.2 },     // tree and hedge size vs the ground
  maxFigures: 50,
  house: { fireteam: 2.0, platoon: 2.6, company: 2.4 },        // building size vs the ground (big enough that a held house reads as held, not as men on a roof)
  minView: { fireteam: 0.42, platoon: 0.5, company: 0.6 },      // least share of the world kept in view
  treeCap: 600,
};
const MR = Math.PI / 180;

// ---------- view ----------

// Everything the plan and the forces touch, with a margin, inside the world.
export function actionBox(scen) {
  const W = scen.terrain.world.w, H = scen.terrain.world.h, Y0 = scen.terrain.world.y0 || 0;
  const pts = [];
  for (const e of [...scen.forces.friendly, ...scen.forces.enemy]) { pts.push(e.at); for (const s of e.slots || []) pts.push(s); }
  for (const r of Object.values(scen.routes || {})) if (!/^e/.test(r.label || "") || true) pts.push(...r.pts);
  const o = scen.objective;
  if (o) { const r = Math.min(o.r || 0, 120); pts.push([o.x - r, o.y - r], [o.x + r, o.y + r]); }
  for (const p of [scen.ccp, scen.rally]) if (p) pts.push(p);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = 0.05 * Math.max(W, H) + 12;
  x0 = Math.max(0, x0 - pad); x1 = Math.min(W, x1 + pad); y0 = Math.max(Y0, y0 - pad) - Y0; y1 = Math.min(Y0 + H, y1 + pad) - Y0;
  // keep at least 60% of the world in view so the ground reads as ground, not a crop
  const grow = (a, b, L) => { const need = (LOOK.minView[scen.level] || 0.6) * L - (b - a); if (need <= 0) return [a, b]; a -= need / 2; b += need / 2; if (a < 0) { b -= a; a = 0; } if (b > L) { a -= b - L; b = L; } return [Math.max(0, a), Math.min(L, b)]; };
  [x0, x1] = grow(x0, x1, W); [y0, y1] = grow(y0, y1, H);
  return { x0, x1, y0: y0 + Y0, y1: y1 + Y0 };
}

export function fitView(scen, W, H) {
  const b = actionBox(scen);
  const c = [[b.x0, b.y0, 0], [b.x1, b.y0, 0], [b.x1, b.y1, 0], [b.x0, b.y1, 0]];
  return K.fitProjection(c, W, H, { pad: Math.round(Math.min(W, H) * 0.035), azimuth: LOOK.azimuth, elevation: LOOK.elevation });
}

// Screen (viewBox) point → ground point on z = 0 (inverse iso).
export function unproject(P, sx, sy) {
  const { sinA, cosA, sinE, k } = K.cameraOf(P);
  const u = (sx - P.origin[0]) / k, v = (sy - P.origin[1]) / (k * sinE);
  return [u * sinA + v * cosA, -u * cosA + v * sinA];
}

// ---------- the static scene ----------

const area = (ring) => { let a = 0; for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; const u = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0; return Math.hypot(px - ax - u * dx, py - ay - u * dy); };
const polyDist = (x, y, pts) => { let d = Infinity; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return d; };
const inRing = (ring, x, y) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
// Draw a kit part made at the origin with a scaled projection, moved to (x, y, z) on the real one.
const scaledAt = (P, s, x, y, z, draw) => { const [sx, sy] = K.iso([x, y, z], P); return `<g transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${draw({ ...P, scale: P.scale * s, origin: [0, 0] })}</g>`; };
const scaledItems = (P, s, x, y, z, make) => {
  const Ps = { ...P, scale: P.scale * s, origin: [0, 0] };
  const [sx, sy] = K.iso([x, y, z], P), k0 = K.depthOf([x, y, 0], P);
  return make(Ps).map((it) => ({ key: k0 + it.key * s, svg: `<g transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${it.svg}</g>` }));
};

// The ground rectangle that covers the whole card: the world plus whatever the card shows around it.
function groundRect(scen, P, W, H) {
  const w = scen.terrain.world;
  const pts = [[0, 0], [W, 0], [W, H], [0, H]].map(([sx, sy]) => unproject(P, sx, sy)).concat([[0, w.y0 || 0], [w.w, (w.y0 || 0) + w.h]]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs) - 20, y: Math.min(...ys) - 20, w: Math.max(...xs) - Math.min(...xs) + 40, d: Math.max(...ys) - Math.min(...ys) + 40 };
}

export function staticScene(scen, P, T, { W = 760, H = 480 } = {}) {
  const sp = scen.terrain, lvl = scen.level;
  const F = LOOK.fig[lvl], TF = LOOK.tree[lvl];
  const ground = [], items = [];
  const g = (s) => ground.push(s);
  const rnd = fdRand(scen.n * 101 + 7);
  const world = sp.world;
  g(trGroundPlane(K, P, groundRect(scen, P, W, H)));

  // meadow patches toward the edges, then fields
  for (let i = 0; i < 5; i++) {
    const cx = world.w * (0.08 + 0.84 * rnd()), cy = (world.y0 || 0) + world.h * (0.08 + 0.84 * rnd()), r = Math.min(world.w, world.h) * (0.08 + 0.07 * rnd());
    g(trPatch(K, P, fdBlob(cx, cy, r, scen.n * 13 + i, 0.15, 40, 0.5 + rnd() * 0.5)));
  }
  for (const f of sp.fields || []) g(trField(K, P, { cx: f.cx, cy: f.cy, w: f.w, d: f.d, ang: f.ang || 0 }, { furrows: Math.max(3, Math.min(12, Math.round(f.d / (12 * TF)))), tint: f.tint || "a" }));

  // tracks, roads, streams, dry ditches (run past the world edge so nothing stops on the ground)
  const wide = Math.min(2, Math.max(1, TF * 0.8));
  const extend = (pts) => { if (pts.length < 2) return pts; const a = pts[0], b = pts[1], y = pts[pts.length - 2], z = pts[pts.length - 1]; const e = (p, q) => { const L = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1; return [p[0] + (p[0] - q[0]) / L * 60, p[1] + (p[1] - q[1]) / L * 60]; }; return [e(a, b), ...pts, e(z, y)]; };
  for (const r of sp.roads || []) g(trRoad(K, P, extend(r.pts), (r.w || 4) / 2 * wide, { ruts: lvl !== "company" }));
  (sp.streams || []).forEach((s, i) => g(trStream(K, P, extend(s.pts), (s.w || 4) / 2 * wide, 3 + i)));
  for (const d of sp.ditches || []) {
    const line = fdSpline(d.pts, 6), w = (d.w || 4) / 2 * 0.8 * wide;
    g(`<path class="mt-ditch" d="${K.onTop(fdRibbon(line, w), 0, P, true)}"/>`);
    for (const off of [w, -w]) g(K.fadeLineSvg(fdOffset(line, off).map(([x, y]) => K.iso([x, y, 0], P)), { fade: [14, 14], tone: "lo" }));
  }

  // woods: floors in the ground, trees as items; keep a corridor along every route and off positions
  const routes = Object.values(scen.routes || {}).map((r) => r.pts);
  const forcePts = [...scen.forces.friendly, ...scen.forces.enemy].flatMap((e) => [e.at, ...(e.slots || [])]);
  const houses = sp.houses || [];
  const corridor = 6 * TF;
  const woods = (sp.woods || []).map((w) => ({ ring: w.ring, a: area(w.ring), density: w.density ?? 1 }));
  const gap = 5.8 * TF;
  let want = woods.map((w) => w.a / (gap * gap * 1.05));
  const total = want.reduce((a, b) => a + b, 0);
  if (total > LOOK.treeCap) want = want.map((n) => n * LOOK.treeCap / total);
  want = want.map((n, i) => n * woods[i].density); // density < 1 thins a wood (framing woods at the edges)
  woods.forEach((w, i) => {
    const avoid = (x, y) => trBehind(K, P, T, x, y, 6) || routes.some((pts) => polyDist(x, y, pts) < corridor) || forcePts.some((p) => Math.hypot(x - p[0], y - p[1]) < 9 * F) ||
      houses.some((h) => Math.hypot(x - h.x, y - h.y) < Math.max(h.len, h.wid) * LOOK.house[lvl] * 0.8 + 3);
    const trees = trScatter(w.ring, Math.max(3, Math.round(want[i])), { seed: scen.n * 31 + i, gap: gap * (want[i] < w.a / (gap * gap * 1.05) - 1 ? Math.sqrt(w.a / (gap * gap * 1.05) / want[i]) : 1), r: [2.8 * TF, 4.4 * TF], h: [8 * TF, 12.5 * TF], avoid });
    const wd = trWood(K, P, T, w.ring, trees);
    g(wd.floor);
    items.push(...wd.items);
  });

  g(trRelief(K, P, T));

  // obstacles: a minefield is fenced and marked: pickets with one strand of wire round it (one closed line, so no
  // line ends), red mine-marker triangles hung on the strand facing out, mine dots inside; wire on pickets
  for (const m of sp.mines || []) {
    const ring = m.ring, sc = Math.min(F, 2.2), hP = 2.2 * sc, every = 12 * sc;
    const pk = [];
    for (let i = 0; i < ring.length; i++) {
      const [ax, ay] = ring[i], [bx, by] = ring[(i + 1) % ring.length];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / every));
      for (let j = 0; j < n; j++) pk.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
    }
    const strand = pk.map(([x, y]) => [x, y, T.height(x, y) + hP * 0.72]);
    g(K.lineSvg(K.pathOf(strand.map((q) => K.iso(q, P)), true), { tone: "lo", className: "mt-mine-wire" }));
    const cxr = ring.reduce((n, q) => n + q[0], 0) / ring.length, cyr = ring.reduce((n, q) => n + q[1], 0) / ring.length;
    pk.forEach(([x, y], i) => {
      items.push({ key: K.depthOf([x, y, 0], P), svg: fdPeg(K, P, x, y, T.height(x, y), hP) });
      if (i % 2) return;
      // marker triangle half-way to the next picket, point down, on the outside of the strand
      const [nx, ny] = pk[(i + 1) % pk.length], mx = (x + nx) / 2, my = (y + ny) / 2;
      const L = Math.hypot(nx - x, ny - y) || 1, tx = (nx - x) / L, ty = (ny - y) / L;
      let ox = -ty, oy = tx; if ((mx - cxr) * ox + (my - cyr) * oy < 0) { ox = -ox; oy = -oy; }
      const z = T.height(mx, my) + hP * 0.72, w = 1.9 * sc, hh = 1.8 * sc, off = 0.25;
      const tri = [[mx - tx * w + ox * off, my - ty * w + oy * off, z], [mx + tx * w + ox * off, my + ty * w + oy * off, z], [mx + ox * off, my + oy * off, z - hh]].map((q) => K.iso(q, P));
      items.push({ key: K.depthOf([mx + ox, my + oy, 0], P) + 0.05, svg: `<path class="mt-mine-sign" d="${K.pathOf(tri, true)}"/>` });
    });
    const dots = [];
    const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
    const r2 = fdRand(Math.round(xs[0] + ys[0]));
    const n = Math.min(60, Math.round(area(ring) / 900));
    for (let i = 0; i < n * 3 && dots.length < n; i++) {
      const x = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * r2(), y = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * r2();
      if (inRing(ring, x, y)) dots.push(K.iso([x, y, T.height(x, y) + 0.1], P));
    }
    g(`<g class="mt-mines">${K.dotsSvg(dots, { size: 0.9, tone: "lo" })}</g>`);
  }
  for (const pts of sp.wire || []) items.push(...trWire(K, P, T, pts, { every: 9 * Math.min(F, 2), r: 0.75 * Math.min(F, 2) }));
  // bridges: a deck across the crossing
  for (const c of sp.crossings || []) {
    const r = c.r || 12;
    items.push({ key: K.depthOf([c.x, c.y, 0], P), svg: K.solidSvg(K.slabOf({ x: c.x - r * 0.45, y: c.y - r, w: r * 0.9, d: r * 2, r: 0.6 }, 0.2, 1.2, P, 2, 0.2), { tone: "mid", className: "tr-wall" }) });
  }

  // hedges, walls, houses
  (sp.hedges || []).forEach((pts, i) => items.push(...trHedge(K, P, pts, { seed: scen.n * 7 + i, w: 1.3 * Math.min(TF, 1.6), size: 1.5 * Math.min(TF, 1.8) })));
  for (const pts of sp.walls || []) items.push(...trWall(K, P, pts, { h: 1.5 * Math.min(TF, 1.5), w: 0.55 * Math.min(TF, 1.5) }));
  const HS = LOOK.house[lvl];
  for (const h of houses) items.push(trHouse(K, P, h.x, h.y, h.ang || 0, h.len * HS, h.wid * HS, 4.4 * HS, 7.6 * HS));

  // the objective flag
  const o = scen.objective;
  // stand it clear of every enemy position, on the far side from the viewer, so it never hides a nest or a hole
  if (o) {
    const posPts = scen.forces.enemy.flatMap((e) => [e.at, ...(e.slots || [])]);
    const clear = 9 * Math.min(F, 2.2) + 6;
    const near = (x, y) => posPts.reduce((m, p) => Math.min(m, Math.hypot(x - p[0], y - p[1])), Infinity);
    const [vx, vy] = K.towardViewer(P);
    let fx = o.x, fy = o.y;
    if (near(fx, fy) < clear) {
      let best = null;
      for (let r = clear * 0.6; r <= clear * 2.2 && !best; r += clear * 0.2)
        for (const da of [0, 25, -25, 50, -50, 75, -75, 100, -100]) {
          const a = Math.atan2(-vy, -vx) + da * MR, x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r;
          if (near(x, y) >= clear) { best = [x, y]; break; }
        }
      if (best) [fx, fy] = best;
    }
    items.push(trObjective(K, P, T, fx, fy, { h: 12 * Math.min(F, 2.2), ang: 200 }));
  }

  // enemy fighting positions (two to a hole; machine guns in a horseshoe nest), shown once spotted
  const holes = {};
  for (const e of scen.forces.enemy) {
    if (e.pose !== "hole" || !e.slots) continue;
    const list = [];
    const z = (x, y) => T.height(x, y);
    if (e.kind === "mg") {
      const x = e.slots.reduce((s, p) => s + p[0], 0) / e.slots.length, y = e.slots.reduce((s, p) => s + p[1], 0) / e.slots.length;
      list.push(...scaledItems(P, F, x, y, z(x, y), (Ps) => trNest(K, Ps, 0, 0, 0, e.slots[0][2] ?? e.face)));
    } else for (let i = 0; i < e.slots.length; i += 2) {
      const a = e.slots[i], b = e.slots[i + 1] || a;
      const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
      list.push(...scaledItems(P, F, x, y, z(x, y), (Ps) => trHole(K, Ps, 0, 0, 0, a[2] ?? e.face, { len: 4.6 })));
    }
    holes[e.id] = list;
  }
  return { ground: ground.join(""), items, holes };
}

// ---------- chalk on the ground: routes and positions ----------

// A route as a chalk arrow: dashed line draped on the ground from a start dot to a closed arrowhead.
export function chalkRoute(P, T, pts, { cls = "mt-route", head = 7, arrow = true } = {}) {
  if (!pts || pts.length < 2) return "";
  const line = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 4));
    for (let j = i ? 1 : 0; j <= n; j++) line.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
  }
  // trim the line back to the arrowhead's base
  let tip = line[line.length - 1], base = tip, dir = [0, 1];
  if (arrow) {
    let k = line.length - 1, d = 0;
    while (k > 0 && d < head) { d += Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]); k--; }
    base = line[k];
    const L = Math.hypot(tip[0] - base[0], tip[1] - base[1]) || 1;
    dir = [(tip[0] - base[0]) / L, (tip[1] - base[1]) / L];
    line.length = k + 1;
    if (line.length < 2) line.unshift(pts[0]);
  }
  const zl = (x, y) => T.height(x, y) + 0.15;
  const d = K.pathOf(line.map(([x, y]) => K.iso([x, y, zl(x, y)], P)));
  const [cls0, ...more] = cls.split(" "), extra = more.length ? " " + more.join(" ") : "";
  let out = `<path class="iso-line ${cls}" d="${d}"/>`;
  const s = K.iso([line[0][0], line[0][1], zl(line[0][0], line[0][1])], P);
  out += `<circle class="${cls0}-dot${extra}" cx="${s[0].toFixed(1)}" cy="${s[1].toFixed(1)}" r="1.6"/>`;
  if (arrow) {
    const w = head * 0.55, nx = -dir[1], ny = dir[0];
    const tri = [[tip[0], tip[1]], [base[0] + nx * w, base[1] + ny * w], [base[0] - nx * w, base[1] - ny * w]];
    out += `<path class="${cls0}-head${extra}" d="${K.pathOf(tri.map(([x, y]) => K.iso([x, y, zl(x, y)], P)), true)}"/>`;
  }
  return out;
}
// A closed chalk outline (support-by-fire or battle position): a box at (x, y) facing `face`.
export function chalkBox(P, T, x, y, face, w, d, cls = "mt-route") {
  const Fr = fdFrame(x, y, face);
  const ring = [Fr(-d / 2, -w / 2), Fr(d / 2, -w / 2), Fr(d / 2, w / 2), Fr(-d / 2, w / 2)];
  const pts = [];
  for (let i = 0; i < 4; i++) { const a = ring[i], b = ring[(i + 1) % 4]; for (let j = 0; j < 8; j++) pts.push([a[0] + (b[0] - a[0]) * j / 8, a[1] + (b[1] - a[1]) * j / 8]); }
  return `<path class="iso-line ${cls}" d="${K.pathOf(pts.map(([px, py]) => K.iso([px, py, T.height(px, py) + 0.15], P)), true)}"/>`;
}
// Last known position of an enemy element: a faint red chalk ring with a cross whose arms end on it.
export function chalkLastKnown(P, T, x, y, r) {
  const ring = Array.from({ length: 24 }, (_, i) => [x + r * Math.cos(i * 15 * MR), y + r * Math.sin(i * 15 * MR)]);
  const z = T.height(x, y) + 0.2;
  const at = (px, py) => K.iso([px, py, z], P);
  const c = Math.SQRT1_2 * r;
  return `<g class="mt-lastknown"><path class="iso-line" d="${K.pathOf(ring.map(([a, b]) => at(a, b)), true)}"/>` +
    `<path class="iso-line" d="${K.pathOf([at(x - c, y - c), at(x + c, y + c)])}${K.pathOf([at(x - c, y + c), at(x + c, y - c)])}"/></g>`;
}

// ---------- kit space: the world mirrored (x, -y), angles negated ----------

const MP = (p) => (p ? [p[0], -p[1], ...p.slice(2)] : p);
const MPS = (pts) => (pts ? pts.map(MP) : pts);
export function mirrorScen(scen) {
  const t = scen.terrain;
  const terrain = {
    ...t, world: { ...t.world, y0: -t.world.h },
    rises: (t.rises || []).map((r) => ({ ...r })), // drawn from mirrorTerrain(), not from these
    woods: (t.woods || []).map((w) => ({ ...w, ring: MPS(w.ring) })),
    hedges: (t.hedges || []).map(MPS), walls: (t.walls || []).map(MPS), wire: (t.wire || []).map(MPS),
    streams: (t.streams || []).map((x) => ({ ...x, pts: MPS(x.pts) })), ditches: (t.ditches || []).map((x) => ({ ...x, pts: MPS(x.pts) })), roads: (t.roads || []).map((x) => ({ ...x, pts: MPS(x.pts) })),
    houses: (t.houses || []).map((h) => ({ ...h, y: -h.y, ang: -(h.ang || 0) })), fields: (t.fields || []).map((f) => ({ ...f, cy: -f.cy, ang: -(f.ang || 0) })),
    mines: (t.mines || []).map((m) => ({ ring: MPS(m.ring) })), crossings: (t.crossings || []).map((c) => ({ ...c, y: -c.y })),
  };
  const force = (e) => ({ ...e, at: MP(e.at), face: -(e.face ?? 90), slots: e.slots ? e.slots.map((q) => [q[0], -q[1], -(q[2] ?? e.face ?? 90)]) : e.slots });
  const routes = Object.fromEntries(Object.entries(scen.routes || {}).map(([k, r]) => [k, { ...r, pts: MPS(r.pts) }]));
  const o = scen.objective;
  return { id: scen.id, n: scen.n, level: scen.level, title: scen.title, terrain, routes, forces: { friendly: scen.forces.friendly.map(force), enemy: scen.forces.enemy.map(force) },
    objective: o ? { ...o, y: -o.y } : o, ccp: MP(scen.ccp), rally: MP(scen.rally) };
}
// The kit's relief from the core's rises, mirrored (same rings as the sim's height model).
export function mirrorTerrain(spec) {
  const T0 = trTerrain(spec);
  return {
    rises: T0.rises.map((r) => ({ ...r, cy: -r.cy, layers: r.layers.map((L) => ({ ...L, ring: MPS(L.ring), box: [L.box[0], L.box[1], -L.box[3], -L.box[2]] })) })),
    height: (x, y) => T0.height(x, -y),
  };
}
export function mirrorState(st) {
  return {
    ...st,
    soldiers: st.soldiers.map((s) => ({ ...s, y: -s.y, face: -s.face })),
    streams: st.streams.map((q) => ({ ...q, from: MP(q.from), to: q.to.map(MP) })),
    smoke: st.smoke.map((c) => ({ ...c, y: -c.y })),
    contacts: st.contacts.map((c) => ({ ...c, y: -c.y })),
  };
}

// ---------- page: the live map ----------

export function createMap(host, scen0, { W = 760, H = 480 } = {}) {
  const ns = "http://www.w3.org/2000/svg";
  const scen = mirrorScen(scen0);
  const T = mirrorTerrain(scen0.terrain);
  const lvl = scen.level, F = LOOK.fig[lvl];
  let P, PS, scene, stage, fire, svg, groups, LOOKS = new Map();
  let lastMarks = "", planHtml = "", smokePool = [], nFig = 0;
  const allSoldiers = [...scen.forces.friendly, ...scen.forces.enemy].reduce((n, e) => n + (e.roles ? e.roles.length : e.kind === "platoon" ? 30 : e.kind === "squad" ? 9 : e.kind === "hq" ? 3 : e.kind === "mortar" ? 4 : 2), 0);
  const chunk = Math.max(1, Math.ceil(allSoldiers / LOOK.maxFigures));

  function build(w, h) {
    W = w; H = h;
    // a phone crops the sides (fits a wider virtual card, centred), which zooms the middle
    const z = W < 600 ? 1.45 : 1;
    P = fitView(scen, W * z, H);
    P.origin = [P.origin[0] - (W * z - W) / 2, P.origin[1]];
    PS = { ...P, scale: P.scale * F, origin: [0, 0] };
    scene = staticScene(scen, P, T, { W, H });
    LOOKS = new Map();
    host.innerHTML = `<svg class="iso-svg mt-map-svg" data-level="${lvl}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${scen.title}: isometric map of the ground and the troops">` +
      `<g data-part="ground">${scene.ground}</g><g data-part="marks"></g><g data-part="plan"></g>` +
      `<g data-part="live">${scene.items.sort((a, b) => a.key - b.key).map((i) => `<g data-k="${i.key}">${i.svg}</g>`).join("")}</g>` +
      `<g data-part="fx"></g><g data-part="fire" class="tr-fire"></g></svg>`;
    svg = host.firstChild;
    groups = Object.fromEntries([...svg.querySelectorAll("[data-part]")].map((n) => [n.dataset.part, n]));
    stage = trStage(groups.live);
    fire = trFire(groups.fire, K, P);
    smokePool = [];
    lastMarks = "";
    if (planHtml) groups.plan.innerHTML = planHtml;
  }
  build(W, H);

  const figSvg = (m) => {
    const look = (m.veh ? "veh|" : "") + trLook(m);
    let s = LOOKS.get(look);
    if (!s) { s = m.veh ? trVehicle(K, PS, trFaceStep(m.face)) : trSoldier(K, PS, { ...m, face: trFaceStep(m.face) }); LOOKS.set(look, s); }
    return [look, s];
  };
  const hashN = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  // soldiers holding a building stand at its viewer-facing wall (as at windows and the doorway), drawn just in
  // front of it, rather than on top of the roof
  const HSc = LOOK.house[lvl];
  const houseAt = (x, y) => {
    for (const h of scen.terrain.houses || []) {
      const c = Math.cos((h.ang || 0) * MR), sn = Math.sin((h.ang || 0) * MR), dx = x - h.x, dy = y - h.y;
      const u = dx * c + dy * sn, v = -dx * sn + dy * c, hu = h.len * HSc / 2, hv = h.wid * HSc / 2;
      if (Math.abs(u) <= hu + 3 && Math.abs(v) <= hv + 3) return { h, c, sn, u, v, hu, hv };
    }
    return null;
  };
  const atWall = (x, y) => {
    const H = houseAt(x, y);
    if (!H) return null;
    const [vx, vy] = K.towardViewer(P);
    const du = vx * H.c + vy * H.sn, dv = -vx * H.sn + vy * H.c;
    const tu = Math.abs(du) > 1e-6 ? ((du > 0 ? H.hu : -H.hu) - H.u) / du : Infinity, tv = Math.abs(dv) > 1e-6 ? ((dv > 0 ? H.hv : -H.hv) - H.v) / dv : Infinity;
    const t = Math.max(0, Math.min(tu, tv)) + 0.6;
    return [x + vx * t, y + vy * t];
  };

  // view = { fog: bool, lit: Set of element ids }
  function frame(st0, t, view = {}) {
    const st = mirrorState(st0);
    const fog = view.fog !== false, lit = view.lit || new Set();
    const known = new Map(st.contacts.map((c) => [c.el, c]));
    const visible = (el, side) => side === "f" || !fog || (known.get(el)?.spotted ?? false);
    const knownAt = (el, side) => side === "f" || !fog || known.has(el);
    const list = [];
    // soldiers, grouped in chunks of `chunk` per element (1 = everyone drawn)
    let i = 0;
    const S = st.soldiers;
    while (i < S.length) {
      const el = S[i].el;
      let j = i;
      while (j < S.length && S[j].el === el) j++;
      const side = S[i].side;
      const show = visible(el, side), showDown = knownAt(el, side);
      // a lit (selected / main effort) element in clusters draws half as many figures, so its lit
      // outlines stay apart and read as soldiers rather than one dark streak
      const isLit = side === "f" && lit.has(el), ch = isLit && chunk > 1 ? chunk * 2 : chunk, tag = isLit && chunk > 1 ? "L" : "";
      for (let a = i, ci = 0; a < j; a += S[a].role === "veh" ? 1 : ch, ci++) {
        const members = S[a].role === "veh" ? [S[a]] : S.slice(a, Math.min(j, a + ch));
        const ok = [], down = [], cap = [];
        for (const s of members) { if (s.status === "ok") ok.push(s); else if (s.status === "down") down.push(s); else if (s.status === "captured") cap.push(s); }
        const mean = (arr) => [arr.reduce((n, s) => n + s.x, 0) / arr.length, arr.reduce((n, s) => n + s.y, 0) / arr.length];
        const veh = members[0].role === "veh";
        if (ok.length && show) {
          const s0 = ok[0];
          let [x, y] = mean(ok);
          const wall = s0.pose === "building" ? atWall(x, y) : null;
          if (wall) [x, y] = wall;
          const pose = veh ? "veh" : s0.pose === "building" ? "hole" : s0.pose === "veh" ? "stand" : s0.pose;
          const m = { veh, face: s0.face, pose, role: s0.role, stride: s0.stride };
          const [look, svgS] = figSvg(m);
          list.push({ id: `${el}:${tag}${ci}`, key: K.depthOf([x, y, 0], P) + (s0.pose === "building" && !wall ? 9 : 0.1), at: K.iso([x, y, T.height(x, y)], P), look, side, lit: isLit, svg: () => svgS });
        }
        if (down.length && showDown) {
          const [x, y] = mean(down);
          const m = veh ? { veh, face: down[0].face, pose: "veh", role: "veh", stride: 0 } : { face: (hashN(down[0].id) % 24) * 15, pose: "prone", role: down[0].role === "mg" ? "mg" : "r", stride: 0 };
          const [look, svgS] = figSvg(m);
          list.push({ id: `${el}:${tag}${ci}:d`, key: K.depthOf([x, y, 0], P) - 0.2, at: K.iso([x, y, T.height(x, y)], P), look, side: side + "c", svg: () => svgS });
        }
        if (cap.length && showDown) {
          const [x, y] = mean(cap);
          const [look, svgS] = figSvg({ face: cap[0].face, pose: "kneel", role: "r", stride: 0 });
          list.push({ id: `${el}:${tag}${ci}:c`, key: K.depthOf([x, y, 0], P), at: K.iso([x, y, T.height(x, y)], P), look, side: side + "c", svg: () => svgS });
        }
      }
      // fighting positions of spotted enemy elements
      if (side === "h" && scene.holes[el] && showDown) scene.holes[el].forEach((it, hi) => list.push({ id: `${el}:hole${hi}`, key: it.key, at: [0, 0], look: "hole", side: "n", svg: () => it.svg }));
      i = j;
    }
    nFig = list.length;
    stage.put(list);

    // fire: an unseen enemy's tracers show only their last stretch (you see the fire coming, not the shooter)
    const streams = fog ? st.streams.map((s) => (s.side === "h" && s.el && !visible(s.el, "h") ? { ...s, from: s.from.map((v, q) => v + (s.to[0][q] - v) * 0.6) } : s)) : st.streams;
    fire.draw(trShots(streams, t));

    // smoke screens and burning vehicles
    const puffs = [];
    for (const c of st.smoke) {
      if (c.age >= 1) continue;
      const fade = Math.min(1, c.age * 12) * (c.age > 0.75 ? (1 - c.age) / 0.25 : 1);
      for (let q = 0; q < 4; q++) {
        const a = q * 1.7 + c.x * 0.01, rr = c.r * (0.55 + 0.12 * q);
        const x = c.x + Math.cos(a) * c.r * 0.35 - c.age * 14, y = c.y + Math.sin(a) * c.r * 0.3 - c.age * 18;
        puffs.push([x, y, 2 + q * 1.5, rr, 0.24 * fade]);
      }
    }
    for (const s of S) if (s.role === "veh" && s.status === "down") {
      for (let q = 0; q < 3; q++) { const ph = (t * 0.25 + q / 3) % 1; puffs.push([s.x - ph * 10, s.y - ph * 14, 3 + ph * 22, 3 + ph * 8, 0.3 * (1 - ph)]); }
    }
    const { sinE } = K.cameraOf(P);
    while (smokePool.length < puffs.length) { const e = document.createElementNS(ns, "ellipse"); e.setAttribute("class", "mt-smoke"); groups.fx.appendChild(e); smokePool.push(e); }
    smokePool.forEach((e, q) => {
      const p = puffs[q];
      if (!p) { if (e._on !== false) { e.setAttribute("visibility", "hidden"); e._on = false; } return; }
      if (e._on === false) { e.removeAttribute("visibility"); e._on = true; }
      const [sx, sy] = K.iso([p[0], p[1], T.height(p[0], p[1]) + p[2]], P), k = K.cameraOf(P).k;
      e.setAttribute("cx", sx.toFixed(1)); e.setAttribute("cy", sy.toFixed(1)); e.setAttribute("rx", (p[3] * k).toFixed(1)); e.setAttribute("ry", (p[3] * k * (sinE * 0.9 + 0.25)).toFixed(1)); e.setAttribute("opacity", p[4].toFixed(2));
    });

    // last-known enemy positions (faint red chalk), when fog of war is on
    const stale = fog ? st.contacts.filter((c) => !c.spotted && !c.out) : [];
    const sig = stale.map((c) => `${c.el}${Math.round(c.x)},${Math.round(c.y)}`).join("|");
    if (sig !== lastMarks) { groups.marks.innerHTML = stale.map((c) => chalkLastKnown(P, T, c.x, c.y, 7 * F)).join(""); lastMarks = sig; }
  }

  return {
    get P() { return P; }, T, chunk,
    frame,
    setPlan(html) { planHtml = html; groups.plan.innerHTML = html; },
    planMarks(marks) { return marks.map((m) => (m.box ? chalkBox(P, T, m.box[0], -m.box[1], -m.box[2], m.box[3], m.box[4], m.cls) : chalkRoute(P, T, MPS(m.pts), { cls: m.cls, head: (m.head || 7) * Math.min(F, 2.2), arrow: m.arrow !== false }))).join(""); },
    pick(clientX, clientY) {
      const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const [x, y] = unproject(P, p.x, p.y);
      return [x, -y];
    },
    toView([x, y]) { return K.iso([x, -y, T.height(x, -y)], P); },
    resize(w, h) { build(w, h); },
    stats() { return { figures: nFig, statics: groups.live.querySelectorAll(":scope > [data-k]").length, paths: svg.querySelectorAll("path").length, chunk }; },
  };
}
