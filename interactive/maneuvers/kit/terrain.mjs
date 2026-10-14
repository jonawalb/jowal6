// Terrain kit for the Maneuvers Battlefield views: full-bleed isometric ground (no board), rolling
// contour relief, woods, fields, tracks, a stream, walls, hedges and buildings; tiny soldiers and
// vehicles placed in doctrinal groups and formations; fighting positions, wire and an MG nest;
// tracer fire, impact puffs and drifting smoke; chalk control measures on pegs.
//
// Like kit/field.mjs, everything is a pure function of the iso kit passed in as K, so a build script
// calls it in Node and the page inlines this file (imports and exports stripped, after field.mjs)
// and calls it again per frame. trStage() and trFire() touch the DOM and only run in the page.
// API and recipe: kit/TERRAIN.md.
//
// K must carry: iso, depthOf, cameraOf, towardViewer, pathOf, onTop, extrude, slabOf, cylinder,
// solidSvg, lineSvg, dotsSvg, fadeLineSvg (the same set field.mjs needs covers it).
import { fdRand, fdFrame, fdPolar, fdSweep, fdSpline, fdBlob, fdInset, fdInside, fdOffset, fdRibbon, fdView, fdPoly, fdCone, fdPeg, fdObjective } from "./field.mjs";

const TR_RAD = Math.PI / 180;

// Tokens: muted earth tints for the ground and the affiliation tints for soldiers. Light values
// are the shipping ones; the dark block keeps the kit's dark theme usable. Inline after FIELD_CSS.
export const TERRAIN_CSS = `
.iso{--tr-ground:#191a17;--tr-meadow:#1a1c17;--tr-field-a:#1d1c18;--tr-field-b:#1b1b17;--tr-road:#22211d;--tr-wood:#181b16;
  --tr-canopy:#232820;--tr-canopy-dk:#1a1e18;--tr-canopy-ink:#5d6656;--tr-water:#151a1d;--tr-chalk:#9fb3da;
  --tr-shadow:#000;--tr-smoke:#9a9a96;--tr-bag:#3a372f;--tr-bag-dk:#2c2a24;--tr-bag-ink:#77705e;--tr-pit:#0c0c0b;--tr-roof:#2a2622;
  --tr-f-ink:#a9bdf0;--tr-f-t:#34466e;--tr-f-l:#2b3b5e;--tr-f-d:#22304d;--tr-f-g:#1b2640;
  --tr-h-ink:#f0a9a5;--tr-h-t:#6e3634;--tr-h-l:#5e2d2b;--tr-h-d:#4d2423;--tr-h-g:#3e1c1b;
  --tr-lit-ink:#fff;--tr-f-fire:#8fb0ff;--tr-h-fire:#ff8a80;
  --tr-high:#24221b;--tr-stone:#2a2924;--tr-stone-dk:#1d1c19;--tr-slope-0:#11120f;--tr-slope-1:#141511;--tr-slope-2:#171814;--tr-slope-3:#1a1b17}
.iso[data-theme="light"]{--tr-ground:#f1f0e8;--tr-meadow:#ebede0;--tr-field-a:#f0eadb;--tr-field-b:#ecebdd;--tr-road:#e6e0d1;--tr-wood:#e7ebdc;
  --tr-canopy:#e2e8d3;--tr-canopy-dk:#cfd8bd;--tr-canopy-ink:#8e9a7c;--tr-water:#dde7ea;--tr-chalk:#5b78b4;
  --tr-shadow:#5a5a40;--tr-smoke:#b7b6ae;--tr-bag:#e2d7bd;--tr-bag-dk:#cdbf9f;--tr-bag-ink:#8f8267;--tr-pit:#7c7465;--tr-roof:#d9d1c6;
  --tr-f-ink:#24396a;--tr-f-t:#b6c7ea;--tr-f-l:#8aa3d8;--tr-f-d:#6884c2;--tr-f-g:#3f5a96;
  --tr-h-ink:#6e2421;--tr-h-t:#efc0ba;--tr-h-l:#da8f87;--tr-h-d:#c26f67;--tr-h-g:#8f3a35;
  --tr-lit-ink:#000;--tr-f-fire:#2f5fd0;--tr-h-fire:#d23a2e;
  --tr-high:#e6dcc0;--tr-stone:#e3ded2;--tr-stone-dk:#c9c2b2;--tr-slope-0:#cfc8b2;--tr-slope-1:#dbd5c1;--tr-slope-2:#e5e0ce;--tr-slope-3:#ece8d9}
.tr-ground{fill:var(--tr-ground);stroke:none}
.tr-meadow{fill:var(--tr-meadow);stroke:none}
.tr-fill-a{fill:var(--tr-field-a);stroke:none}
.tr-fill-b{fill:var(--tr-field-b);stroke:none}
.tr-woodfloor{fill:var(--tr-wood);stroke:none}
.tr-water{fill:var(--tr-water);stroke:none}
.tr-shadow{fill:var(--tr-shadow);opacity:.16;stroke:none}
.tr-road{--anatomy-paper:var(--tr-road)}
.tr-terrace{--anatomy-top:var(--tr-ground)}
.tr-slope,.tr-step{stroke:none}.tr-slope[data-shade="0"]{fill:var(--tr-slope-0)}.tr-slope[data-shade="1"]{fill:var(--tr-slope-1)}
.tr-slope[data-shade="2"]{fill:var(--tr-slope-2)}.tr-slope[data-shade="3"]{fill:var(--tr-slope-3)}
.tr-roof{--anatomy-top:var(--tr-roof)}
.tr-wall{--anatomy-top:var(--tr-stone);--anatomy-paper:var(--tr-stone)}
.iso .tr-wall>.iso-shade{fill:var(--tr-stone-dk)}
.tr-canopy{fill:var(--tr-canopy);stroke:var(--tr-canopy-ink);stroke-width:.5}
.tr-canopy-dk{fill:var(--tr-canopy-dk);stroke:none}
.tr-conifer{--anatomy-top:var(--tr-canopy);--anatomy-paper:var(--tr-canopy)}
.tr-pit{fill:var(--tr-pit);stroke:var(--tr-bag-ink);stroke-width:.4;opacity:.75}
.tr-p path{stroke-width:.45;stroke-linejoin:round}
.tr-bag .tr-t{fill:var(--tr-bag)}.tr-bag .tr-l{fill:var(--tr-bag)}.tr-bag .tr-d{fill:var(--tr-bag-dk)}.tr-bag path{stroke:var(--tr-bag-ink)}
.tr-trunk .tr-t,.tr-trunk .tr-l{fill:var(--tr-bag-dk)}.tr-trunk .tr-d{fill:var(--tr-bag-ink)}.tr-trunk path{stroke:var(--tr-canopy-ink)}
.tr-s path{stroke-width:.42;stroke-linejoin:round}
.tr-s[data-side="f"] path{stroke:var(--tr-f-ink)}.tr-s[data-side="h"] path{stroke:var(--tr-h-ink)}
.tr-s[data-side="f"] .tr-t{fill:var(--tr-f-t)}.tr-s[data-side="f"] .tr-l{fill:var(--tr-f-l)}.tr-s[data-side="f"] .tr-d{fill:var(--tr-f-d)}
.tr-s[data-side="h"] .tr-t{fill:var(--tr-h-t)}.tr-s[data-side="h"] .tr-l{fill:var(--tr-h-l)}.tr-s[data-side="h"] .tr-d{fill:var(--tr-h-d)}
.tr-s[data-side="f"] .tr-g{fill:var(--tr-f-g)}.tr-s[data-side="h"] .tr-g{fill:var(--tr-h-g)}
.tr-s[data-lit] path{stroke:var(--tr-lit-ink)}
.tr-s[data-side="f"] .tr-veh{--anatomy-top:var(--tr-f-t);--anatomy-paper:var(--tr-f-l)}.tr-s[data-side="h"] .tr-veh{--anatomy-top:var(--tr-h-t);--anatomy-paper:var(--tr-h-l)}
.iso .tr-s[data-side="f"] .tr-veh>.iso-shade{fill:var(--tr-f-d)}.iso .tr-s[data-side="h"] .tr-veh>.iso-shade{fill:var(--tr-h-d)}
.iso .tr-s[data-side="f"] .tr-veh>.iso-shade[data-shade="3"],.iso .tr-s[data-side="f"] .tr-veh>.iso-shade[data-shade="2"]{fill:var(--tr-f-l)}.iso .tr-s[data-side="h"] .tr-veh>.iso-shade[data-shade="3"],.iso .tr-s[data-side="h"] .tr-veh>.iso-shade[data-shade="2"]{fill:var(--tr-h-l)}
.tr-s .tr-gun{fill:none;stroke-width:.95;stroke-linecap:round}
.tr-s .tr-gun[data-heavy]{stroke-width:1.5}
.tr-s .tr-wire{fill:none;stroke-width:.5;stroke-linecap:round}
.tr-s .tr-shadow{stroke:none}
.tr-chalk{stroke:var(--tr-chalk)!important;opacity:.85}
.tr-fire path,.tr-fire circle{pointer-events:none}
.tr-tracer{fill:none;stroke-linecap:round}
.tr-tracer[data-side="f"]{stroke:var(--tr-f-fire)}.tr-tracer[data-side="h"]{stroke:var(--tr-h-fire)}
.tr-flash[data-side="f"],.tr-puff[data-side="f"]{fill:var(--tr-f-fire)}.tr-flash[data-side="h"],.tr-puff[data-side="h"]{fill:var(--tr-h-fire)}
.tr-dust{fill:var(--tr-smoke)}
.tr-smoke{fill:var(--tr-smoke)}
`;

// ---------- the ground: relief as stepped contour terraces ----------

// spec.rises: [{ cx, cy, r, steps, h, top, seed, wobble, squash, lean: [dx, dy] }]. Each rise is a
// stack of `steps` terraces `h` high whose rings shrink from radius r to r * top; lean shifts each
// higher ring so the slope is steeper on one side. Rises must not overlap.
// Returns T = { rises: [{ cx, cy, r, layers: [{ ring, z0, h, box }] }], height(x, y) }.
export function trTerrain(spec) {
  const rises = (spec.rises || []).map((r, ri) => {
    const n = r.steps ?? 3, h = r.h ?? 2, top = r.top ?? 0.45;
    const layers = [];
    for (let i = 0; i < n; i++) {
      const f = 1 - (i / Math.max(1, n - 1)) * (1 - top);
      const lx = (r.lean?.[0] ?? 0) * i, ly = (r.lean?.[1] ?? 0) * i;
      const ring = fdBlob(r.cx + lx, r.cy + ly, r.r * f, (r.seed ?? 11) + i * 7 + ri * 31, r.wobble ?? 0.08, 64, r.squash ?? 1);
      const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
      layers.push({ ring, z0: i * h, h, box: [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)] });
    }
    return { cx: r.cx, cy: r.cy, r: r.r, layers };
  });
  const height = (x, y) => {
    let z = 0;
    for (const rise of rises) for (const L of rise.layers) {
      const [x0, x1, y0, y1] = L.box;
      if (x < x0 || x > x1 || y < y0 || y > y1) break; // rings are nested: once outside, stop
      if (fdInside(L.ring, [x, y])) z = L.z0 + L.h; else break;
    }
    return z;
  };
  return { rises, height };
}

// Lift a 2D polyline onto the ground (z from T.height plus lift).
export const trDrape = (T, pts, lift = 0.15) => pts.map(([x, y]) => [x, y, T.height(x, y) + lift]);
const trPath3 = (K, P, pts, closed) => K.pathOf(pts.map((p) => K.iso(p, P)), closed);

// The flat ground: one fill over the world rect (z = 0). Draw it first.
export function trGroundPlane(K, P, R) {
  const ring = [[R.x, R.y], [R.x + R.w, R.y], [R.x + R.w, R.y + R.d], [R.x, R.y + R.d]];
  return `<path class="tr-ground" d="${K.onTop(ring, 0, P, true)}"/>`;
}

// The terraces of every rise, far rise first, each stack bottom-up. Goes in the ground layer:
// keep trees and buildings out of the band just behind a rise (trBehind tells you where).
export function trRelief(K, P, T) {
  const out = [];
  const rises = [...T.rises].sort((a, b) => K.depthOf([a.cx, a.cy, 0], P) - K.depthOf([b.cx, b.cy, 0], P));
  for (const rise of rises) {
    out.push(`<path class="tr-shadow" d="${K.onTop(rise.layers[0].ring, 0, P, true)}" style="opacity:.06"/>`);
    rise.layers.forEach((L, i) => {
      const t = rise.layers.length > 1 ? i / (rise.layers.length - 1) : 0;
      const e = K.extrude(L.ring, L.z0, L.h, P, { convex: false });
      // a contour step, not a plate: slope faces and a tinted top with one contour line at the lip,
      // no outline along the foot (the step meets the one below by tone alone)
      const mix = `color-mix(in srgb, var(--tr-ground), var(--tr-high) ${Math.round(t * 75)}%)`;
      out.push(`<g class="tr-terrace">` + e.shades.map((d, j) => (d ? `<path class="tr-slope" data-shade="${j}" d="${d}"/>` : "")).join("") +
        `<path class="tr-step" d="${e.top}" style="fill:${mix}"/>` + K.lineSvg(K.onTop(L.ring, L.z0 + L.h, P, true), { tone: i ? "lo" : "faint" }) + `</g>`);
    });
  }
  return out.join("");
}

// True where a standing thing at (x, y) would sit behind a rise and poke through it (tree trunks,
// houses): within `pad` of its foot ring and further from the viewer than its centre.
export function trBehind(K, P, T, x, y, pad = 20) {
  return T.rises.some((r) => K.depthOf([x, y, 0], P) < K.depthOf([r.cx, r.cy, 0], P) + 4 && Math.hypot(x - r.cx, y - r.cy) < r.r + pad);
}

// ---------- flat ground cover ----------

// A field: a convex outline (or {cx, cy, w, d, ang}) with a tint and furrows that end on the outline.
export function trField(K, P, shape, { furrows = 8, tint = "a", hedge = false } = {}) {
  const ring = Array.isArray(shape) ? shape : (() => { const F = fdFrame(shape.cx, shape.cy, shape.ang ?? 0); const w = shape.w / 2, d = shape.d / 2; return [F(-w, -d), F(w, -d), F(w, d), F(-w, d)]; })();
  const out = [`<path class="tr-fill-${tint}" d="${K.onTop(ring, 0, P, true)}"/>`];
  const lines = [];
  if (furrows > 0) {
    // furrows run parallel to the first edge, clipped to the (convex) outline
    const [a, b] = ring;
    const ux = b[0] - a[0], uy = b[1] - a[1], ul = Math.hypot(ux, uy);
    const nx = -uy / ul, ny = ux / ul;
    const ds = ring.map(([x, y]) => (x - a[0]) * nx + (y - a[1]) * ny);
    const d0 = Math.min(...ds), d1 = Math.max(...ds);
    for (let i = 1; i <= furrows; i++) {
      const d = d0 + ((d1 - d0) * i) / (furrows + 1);
      const hits = [];
      for (let j = 0; j < ring.length; j++) {
        const p = ring[j], q = ring[(j + 1) % ring.length], dp = ds[j], dq = ds[(j + 1) % ring.length];
        if ((dp - d) * (dq - d) < 0) { const t = (d - dp) / (dq - dp); hits.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
      }
      if (hits.length === 2) lines.push(K.onTop(hits, 0, P));
    }
  }
  out.push(K.lineSvg(K.onTop(ring, 0, P, true), { tone: "lo" }));
  if (lines.length) out.push(K.lineSvg(lines.join(""), { tone: "faint" }));
  return out.join("");
}

// A patch of meadow or a wood floor: a soft tinted blob, no outline.
export const trPatch = (K, P, ring, cls = "tr-meadow") => `<path class="${cls}" d="${K.onTop(ring, 0, P, true)}"/>`;

// A farm track or road: a flat ribbon with two faint wheel ruts that fade out at both ends. Run its
// ends past the visible ground; the ruts fade so nothing stops in mid-air.
export function trRoad(K, P, pts, w = 3, { smooth = 6, ruts = true, z = 0.05 } = {}) {
  const line = smooth ? fdSpline(pts, smooth) : pts;
  let svg = K.solidSvg(K.extrude(fdRibbon(line, w), z, 0.1, P, { convex: false }), { tone: "lo", crease: "none", flat: true, className: "tr-road" });
  if (ruts) for (const off of [w * 0.42, -w * 0.42]) svg += K.fadeLineSvg(fdOffset(line, off).map(([x, y]) => K.iso([x, y, z + 0.1], P)), { fade: [14, 14], tone: "faint" });
  return svg;
}

// A stream: water ribbon, banks and ripples, every line fading at its ends.
export function trStream(K, P, pts, w = 3.2, seed = 3) {
  const line = fdSpline(pts, 8);
  const out = [`<path class="tr-water" d="${K.onTop(fdRibbon(line, w), 0, P, true)}"/>`];
  for (const off of [w, -w]) out.push(K.fadeLineSvg(fdOffset(line, off).map(([x, y]) => K.iso([x, y, 0], P)), { fade: [18, 18], tone: "mid" }));
  const rnd = fdRand(seed);
  for (let i = 2; i < line.length - 8; i += 3) {
    const seg = fdOffset(line.slice(i, i + 3 + Math.floor(rnd() * 3)), (rnd() - 0.5) * w * 1.1);
    out.push(K.fadeLineSvg(seg.map(([x, y]) => K.iso([x, y, 0], P)), { fade: [1.6, 1.6], tone: "lo" }));
  }
  return out.join("");
}

// ---------- small convex prisms in two tints (soldiers, sandbags, trunks) ----------

// A vertical prism over a convex ring, as at most three paths: top, sunlit sides, shaded sides.
// Faces of one convex prism never overlap on screen, so merging them by shade is safe. cls picks
// the tint classes: "" body (tr-t, tr-l, tr-d) or "g" gear (all tr-g).
export function trPrism(K, P, ring, z0, z1, gear = false) {
  const V = fdView(K, P);
  let area = 0;
  for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const s = area > 0 ? 1 : -1;
  const lit = [], dark = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const nx = s * (b[1] - a[1]), ny = -s * (b[0] - a[0]);
    if (nx * V.v[0] + ny * V.v[1] <= 1e-9) continue;
    const face = K.pathOf([K.iso([a[0], a[1], z0], P), K.iso([b[0], b[1], z0], P), K.iso([b[0], b[1], z1], P), K.iso([a[0], a[1], z1], P)], true);
    (nx * V.light[0] + ny * V.light[1] > 0 ? lit : dark).push(face);
  }
  const top = K.onTop(ring, z1, P, true);
  if (gear) return `<path class="tr-g" d="${dark.join("")}${lit.join("")}${top}"/>`;
  return (dark.length ? `<path class="tr-d" d="${dark.join("")}"/>` : "") + (lit.length ? `<path class="tr-l" d="${lit.join("")}"/>` : "") + `<path class="tr-t" d="${top}"/>`;
}
const trBoxRing = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
const trOct = (F, u, v, r, n = 8) => Array.from({ length: n }, (_, i) => F(u + r * Math.cos((i + 0.5) * 2 * Math.PI / n), v + r * Math.sin((i + 0.5) * 2 * Math.PI / n)));

// ---------- soldiers ----------

// One soldier at the origin (draw it inside a translate), facing `face` degrees on the floor.
// spec = { face, pose: "stand"|"kneel"|"prone"|"hole", role: "tl"|"ar"|"gr"|"r"|"sl"|"pl"|"rto"|"mg"|"ag",
// stride: 0|1|2 }. Sizes are exaggerated about 1.5x against the ground so a figure still reads at
// phone width: standing height 6.4 units. Returns the inner SVG (no group, no colour: the caller's
// <g class="tr-s" data-side> gives the tint). Pair with trLook() as the cache key.
export function trSoldier(K, P, spec) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, spec.face ?? 0);
  const pose = spec.pose || "stand", role = spec.role || "r";
  const solids = []; // [depth, svg]
  const put = (ring, z0, z1, gear) => {
    const c = ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length], [0, 0]);
    solids.push([K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, ring, z0, z1, gear)]);
  };
  const box = (u0, u1, v0, v1, z0, z1, gear) => put(trBoxRing(F, u0, u1, v0, v1), z0, z1, gear);
  let gun, shadow, mount = 0;
  const heavy = role === "ar" || role === "mg";
  if (pose === "prone") {
    box(-4.2, -2.3, -0.62, 0.62, 0, 0.55);
    box(-2.4, 0.45, -0.78, 0.78, 0, 0.92);
    box(-1.9, -0.55, -0.52, 0.52, 0.92, 1.42, true);
    put(trOct(F, 0.95, 0, 0.62), 0.32, 1.32, true);
    gun = [[1.1, -0.34, 0.86], [heavy ? 4.6 : 3.9, -0.34, 0.8]];
    shadow = trBoxRing(F, -4.4, 1.8, -1.1, 1.1);
  } else if (pose === "kneel") {
    box(-0.55, 0.95, -0.58, 0.58, 0, 1.35);
    box(-0.42, 0.45, -0.72, 0.72, 1.3, 3.45);
    box(-0.98, -0.42, -0.5, 0.5, 1.6, 3.3, true);
    put(trOct(F, 0, 0, 0.64), 3.45, 4.45, true);
    gun = [[0.45, -0.42, 2.95], [heavy ? 3.9 : 3.3, -0.42, 3.05]];
    mount = 2.2;
  } else if (pose === "hole") {
    box(-0.42, 0.45, -0.72, 0.72, 0, 1.25);
    put(trOct(F, 0, 0, 0.64), 1.25, 2.25, true);
    gun = [[0.45, -0.42, 1.05], [heavy ? 3.7 : 3.1, -0.42, 1.2]];
  } else {
    const st = spec.stride ?? 0;
    if (st === 0) box(-0.34, 0.34, -0.5, 0.5, 0, 2.85);
    else for (const [du, dv] of [[st === 1 ? 0.55 : -0.55, 0.26], [st === 1 ? -0.55 : 0.55, -0.26]]) box(du - 0.27, du + 0.27, dv - 0.24, dv + 0.24, 0, 2.8);
    box(-0.42, 0.45, -0.72, 0.72, 2.7, 4.9);
    box(-0.98, -0.42, -0.5, 0.5, 3.0, 4.7, true);
    put(trOct(F, 0, 0, 0.64), 4.9, 5.9, true);
    gun = [[0.45, -0.45, 3.9], [heavy ? 3.4 : 2.9, -0.32, 4.35]];
    mount = 4.7;
  }
  if (!shadow) shadow = trOct(F, -0.2, 0, 1.25, 10);
  solids.sort((a, b) => a[0] - b[0]);
  const g = gun.map(([u, v, z]) => K.iso([...F(u, v), z], P0));
  let gunSvg = `<path class="tr-gun"${heavy ? ' data-heavy=""' : ""} d="${K.pathOf(g)}"/>`;
  if (role === "gr") { const a = K.iso([...F(gun[0][0] + 0.7, gun[0][1]), gun[0][2] - 0.35], P0), b = K.iso([...F(gun[0][0] + 1.8, gun[0][1]), gun[0][2] - 0.3], P0); gunSvg += `<path class="tr-gun" d="${K.pathOf([a, b])}"/>`; }
  if (heavy && pose === "prone") {
    // bipod legs from near the muzzle to the ground
    const [mu, mv] = [gun[1][0] - 0.9, gun[1][1]];
    gunSvg += `<path class="tr-wire" d="${K.pathOf([K.iso([...F(mu, mv - 0.45), 0], P0), K.iso([...F(mu, mv), 0.78], P0), K.iso([...F(mu, mv + 0.45), 0], P0)])}"/>`;
  }
  let extra = "";
  if ((role === "sl" || role === "pl" || role === "rto") && mount) {
    extra = `<path class="tr-wire" d="${K.pathOf([K.iso([...F(-0.8, 0.32), mount], P0), K.iso([...F(-0.95, 0.4), mount + 2.8], P0)])}"/>`;
  }
  const [vx, vy] = K.towardViewer(P0);
  const fwd = F(1, 0);
  const away = fwd[0] * vx + fwd[1] * vy < 0;
  const body = solids.map((s) => s[1]).join("");
  return `<path class="tr-shadow" d="${K.onTop(shadow, 0, P0, true)}"/>` + (away ? gunSvg + extra + body : extra + body + gunSvg);
}

// Cache key for trSoldier: facing rounded to `step` degrees (default 15) so a turning figure only
// re-renders when it crosses a step.
export const trLook = (spec, step = 15) => `${spec.pose || "stand"}|${spec.role || "r"}|${spec.stride ?? 0}|${Math.round((((spec.face ?? 0) % 360) + 360) % 360 / step) * step % 360}`;
export const trFaceStep = (face, step = 15) => Math.round((((face % 360) + 360) % 360) / step) * step;

// The muzzle of a soldier at (x, y, z) in world units, for tracers.
export function trMuzzle(spec, x, y, z) {
  const pose = spec.pose || "stand", heavy = spec.role === "ar" || spec.role === "mg";
  const [u, v, h] = pose === "prone" ? [heavy ? 4.6 : 3.9, -0.34, 0.8] : pose === "kneel" ? [heavy ? 3.9 : 3.3, -0.42, 3.05] : pose === "hole" ? [heavy ? 3.7 : 3.1, -0.42, 1.2] : [heavy ? 3.4 : 2.9, -0.32, 4.35];
  const F = fdFrame(x, y, trFaceStep(spec.face ?? 0));
  return [...F(u, v), z + h];
}
// Where shots aimed at a soldier land: the torso, or the parapet for a man in a hole.
export const trAimPoint = (spec, x, y, z) => [x, y, z + ({ prone: 0.6, kneel: 2.4, hole: 1.0 }[spec.pose] ?? 3.6)];

// A small tracked vehicle at the origin facing `face` (mechanized concepts): hull with a sloped
// glacis, track skirts, turret and gun. About 9 units long. Cache it like a soldier (trLook-style).
export function trVehicle(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const q = (u, v, z) => [...F(u, v), z];
  const parts = [];
  const put = (c, svg) => parts.push([K.depthOf([...F(c[0], c[1]), c[2]], P0), svg]);
  for (const side of [-1, 1]) put([0, side * 2.05, 0.6], trPrism(K, P0, trBoxRing(F, -4.3, 4.3, side > 0 ? 1.45 : -2.65, side > 0 ? 2.65 : -1.45), 0, 1.25, true));
  const hull = [[q(-4.4, -2.1, 0.9), q(3.0, -2.1, 0.9), q(3.0, 2.1, 0.9), q(-4.4, 2.1, 0.9)], [q(-4.4, -2.1, 2.5), q(1.6, -2.1, 2.5), q(1.6, 2.1, 2.5), q(-4.4, 2.1, 2.5)]];
  const faces = [hull[0].slice().reverse(), hull[1], [hull[0][0], hull[0][1], hull[1][1], hull[1][0]], [hull[0][2], hull[0][3], hull[1][3], hull[1][2]],
    [hull[0][1], hull[0][2], hull[1][2], hull[1][1]], [hull[0][3], hull[0][0], hull[1][0], hull[1][3]]];
  parts.push([K.depthOf(q(-0.5, 0, 1.6), P0), fdPoly(K, P0, faces, { tone: "mid", className: "tr-veh" })]);
  put([-1.2, 0, 3.0], trPrism(K, P0, trOct(F, -1.2, 0, 1.25), 2.5, 3.5));
  parts.sort((a, b) => a[0] - b[0]);
  const gun = `<path class="tr-gun" data-heavy="" d="${K.pathOf([K.iso(q(-0.2, 0, 3.05), P0), K.iso(q(3.9, 0, 3.15), P0)])}"/>`;
  return `<path class="tr-shadow" d="${K.onTop(trBoxRing(F, -4.8, 4.8, -2.9, 2.9), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("") + gun;
}

// ---------- groups and formations ----------

// Formation offsets in the leader's frame: u forward, v to the left, s the interval in units.
// fire team (4): team leader, automatic rifleman, grenadier, rifleman.
export function trFireTeam(form = "wedge", s = 4.2) {
  const roles = ["tl", "ar", "gr", "r"];
  const at = {
    wedge: [[0, 0], [-s, -s], [-s, s], [-2 * s, 2 * s]],
    file: [[0, 0], [-s, 0], [-2 * s, 0], [-3 * s, 0]],
    line: [[0, 0], [0, -s * 1.1], [0, s * 1.1], [0, s * 2.2]],
  }[form];
  return roles.map((role, i) => ({ role, off: at[i] }));
}
// squad (9): two fire teams and the squad leader. form: "column" (team A leads, SL, team B),
// "line" (teams abreast, SL behind the centre), "file". team: the fire teams' own formation.
export function trSquad(form = "column", team = "wedge", s = 4.2) {
  const A = trFireTeam(team, s), B = trFireTeam(team, s);
  const place = (list, du, dv, t) => list.map((m) => ({ ...m, team: t, off: [m.off[0] + du, m.off[1] + dv] }));
  if (form === "line") return [...place(A, 0, s * 2.6, "a"), { role: "sl", team: "hq", off: [-s * 1.4, 0] }, ...place(B, 0, -s * 1.6, "b")];
  if (form === "file") return [...place(trFireTeam("file", s), 0, 0, "a"), { role: "sl", team: "hq", off: [-s * 4, 0] }, ...place(trFireTeam("file", s), -s * 5, 0, "b")];
  return [...place(A, 0, 0, "a"), { role: "sl", team: "hq", off: [-s * 3, 0] }, ...place(B, -s * 4.6, 0, "b")];
}
// platoon: three squads and the platoon headquarters (PL, RTO, PSG). form: "column", "line", "wedge"
// (one squad forward, two back), "vee" (two forward, one back).
export function trPlatoon(form = "column", squadForm = "column", team = "wedge", s = 4.2) {
  const sq = () => trSquad(squadForm, team, s);
  const D = s * 9, W = s * 6.5;
  const at = { column: [[0, 0], [-D, 0], [-2 * D, 0]], line: [[0, W], [0, 0], [0, -W]], wedge: [[0, 0], [-D * 0.7, W], [-D * 0.7, -W]], vee: [[0, W * 0.7], [0, -W * 0.7], [-D * 0.8, 0]] }[form];
  const out = [];
  at.forEach(([du, dv], i) => out.push(...sq().map((m) => ({ ...m, squad: i + 1, off: [m.off[0] + du, m.off[1] + dv] }))));
  const hq = form === "column" ? [-D * 0.55, 0] : [-D * 0.45, 0];
  out.push({ role: "pl", team: "hq", squad: 0, off: hq }, { role: "rto", team: "hq", squad: 0, off: [hq[0] - s * 0.6, hq[1] - s * 0.8] }, { role: "r", team: "psg", squad: 0, off: [hq[0] - s * 2.2, hq[1] + s * 0.4] });
  return out;
}
// Operational scale: a company or battalion as clusters of vehicles or figures (one cluster per
// platoon), for figures whose units are companies and battalions. Returns members with kind.
export function trCompany(kind = "mech", s = 9) {
  const out = [];
  [[0, 0], [-s * 2.2, s * 2.4], [-s * 2.2, -s * 2.4]].forEach(([du, dv], p) => {
    for (let i = 0; i < (kind === "inf" ? 5 : 3); i++) out.push({ kind: kind === "inf" ? "man" : "veh", role: "r", platoon: p, off: [du - (i % 2) * s * 0.7, dv + (i - 1) * s * 0.75] });
  });
  return out;
}
export function trBattalion(kind = "mech", s = 9) {
  const out = [];
  [[0, s * 7.5], [0, -s * 7.5], [-s * 7, 0]].forEach(([du, dv], c) => out.push(...trCompany(kind, s).map((m) => ({ ...m, company: c, off: [m.off[0] + du, m.off[1] + dv] }))));
  return out;
}
// Blend two formations (same members in the same order): t = 0 gives a, 1 gives b.
export const trMorph = (a, b, t) => a.map((m, i) => ({ ...m, off: [m.off[0] + (b[i].off[0] - m.off[0]) * t, m.off[1] + (b[i].off[1] - m.off[1]) * t] }));
// Place members at an anchor {x, y, face}: world positions, each facing the anchor's way.
export function trPlace(members, A) {
  const F = fdFrame(A.x, A.y, A.face);
  return members.map((m) => { const [x, y] = F(m.off[0], m.off[1]); return { ...m, x, y, face: m.face ?? A.face }; });
}

// A route: arc-length table over a smoothed polyline. at(s) → {x, y, face} (face = travel direction).
export function trRoute(pts, smooth = 6) {
  const line = smooth ? fdSpline(pts, smooth) : pts;
  const L = [0];
  for (let i = 1; i < line.length; i++) L.push(L[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const length = L[L.length - 1];
  const at = (s) => {
    const t = Math.max(0, Math.min(length, s));
    let i = 1;
    while (i < L.length - 1 && L[i] < t) i++;
    const a = line[i - 1], b = line[i], f = (t - L[i - 1]) / (L[i] - L[i - 1] || 1);
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, face: Math.atan2(b[1] - a[1], b[0] - a[0]) / TR_RAD };
  };
  return { line, length, at };
}

// Bounding overwatch along a route parameter s: two elements a and b advance in alternate bounds of
// length L; w blends from travelling together (0) to bounding (1). Returns their parameters and
// which one is moving in this half of the bound (the other overwatches).
export function trBound(s, L = 24, w = 1, gap = 0) {
  const ease = (x) => x * x * (3 - 2 * x);
  const stair = (x) => { const k = Math.floor(x / L), f = x / L - k; return L * (k + ease(Math.min(1, f * 2))); };
  const p = s / L - Math.floor(s / L);
  const a = s + w * (stair(s) - s), b = s - gap + w * (stair(s - L / 2) + L / 2 - s);
  return { a, b, moving: p < 0.5 ? "a" : "b" };
}

// ---------- enemy positions and obstacles ----------

// A two-man fighting position at (x, y) on ground z, facing `face`: a dark pit, an earth spoil bank
// and a row of sandbags along the front with short returns. Returns two items keyed either side of
// the centre so an occupant (keyed at the centre) sorts between the back and the front bags.
export function trHole(K, P, x, y, z, face, { len = 4.6, deep = 2.2, heavy = false } = {}) {
  const F = fdFrame(x, y, face);
  const pit = trBoxRing(F, -deep / 2, deep / 2, -len / 2, len / 2);
  const back = [`<path class="tr-pit" d="${K.onTop(pit, z + 0.02, P, true)}"/>`], front = [];
  const bags = [];
  const n = heavy ? 6 : 5;
  for (let i = 0; i < n; i++) { const v = -len / 2 - 0.4 + ((len + 0.8) * (i + 0.5)) / n; bags.push([deep / 2 + 0.7, v, 0]); }
  for (let i = 0; i < n - 1; i++) { const v = -len / 2 + ((len) * (i + 0.5)) / (n - 1); bags.push([deep / 2 + 0.7, v, 0.55]); }
  for (const sv of [-1, 1]) bags.push([0.2, sv * (len / 2 + 0.75), 0]);
  if (heavy) for (const sv of [-1, 1]) bags.push([-0.9, sv * (len / 2 + 0.75), 0]);
  const key0 = K.depthOf([x, y, 0], P);
  const list = bags.map(([u, v, zz]) => {
    const [bx, by] = F(u, v);
    const along = Math.abs(u) > deep / 2 ? 0.55 : 0.5;
    const ring = Math.abs(u) > deep / 2 ? trBoxRing(F, u - 0.42, u + 0.42, v - along, v + along) : trBoxRing(F, u - 0.55, u + 0.55, v - 0.4, v + 0.4);
    return { d: K.depthOf([bx, by, zz], P), near: K.depthOf([bx, by, 0], P) > key0, svg: trPrism(K, P, ring, z + zz, z + zz + 0.55) };
  }).sort((a, b) => a.d - b.d);
  for (const b of list) (b.near ? front : back).push(b.svg);
  return [
    { key: key0 - 1.8, svg: back[0] + `<g class="tr-p tr-bag">${back.slice(1).join("")}</g>` },
    { key: key0 + 1.8, svg: `<g class="tr-p tr-bag">${front.join("")}</g>` },
  ];
}

// Concertina wire on pickets along pts (ground z from T): loops between pickets every `every` units.
// Each coil starts and ends at the top of a picket, so no line end floats.
export function trWire(K, P, T, pts, { every = 9, r = 0.75 } = {}) {
  const items = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / every));
    for (let j = 0; j < n; j++) {
      const p = [ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n], q = [ax + ((bx - ax) * (j + 1)) / n, ay + ((by - ay) * (j + 1)) / n];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]), tx = (q[0] - p[0]) / len, ty = (q[1] - p[1]) / len;
      const loops = Math.max(3, Math.round(len / 1.3));
      const coil = [];
      for (let k = 0; k <= loops * 12; k++) {
        const t = k / (loops * 12), ph = Math.PI / 2 + t * loops * 2 * Math.PI;
        const x = p[0] + tx * len * t - ty * r * Math.cos(ph), y = p[1] + ty * len * t + tx * r * Math.cos(ph);
        coil.push([x, y, T.height(x, y) + r * (1 + Math.sin(ph))]);
      }
      const [mx, my] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      items.push({ key: K.depthOf([mx, my, 0], P), svg: K.lineSvg(trPath3(K, P, coil), { tone: "mid" }) });
    }
  }
  for (const [x, y] of pts.flatMap((p, i) => (i < pts.length - 1 ? (() => { const q = pts[i + 1]; const n = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / every)); return Array.from({ length: n }, (_, j) => [p[0] + ((q[0] - p[0]) * j) / n, p[1] + ((q[1] - p[1]) * j) / n]); })() : [p]))) {
    const z = T.height(x, y);
    items.push({ key: K.depthOf([x, y, 0], P) + 0.01, svg: K.solidSvg(K.cylinder(x, y, 0.3, z, r * 2 + 0.5, P, 6), { tone: "mid", crease: "none" }) });
  }
  return items;
}

// A machine-gun position: a horseshoe of sandbags two courses high, open to the rear, facing `face`.
export function trNest(K, P, x, y, z, face, { r = 3.4 } = {}) {
  const F = fdFrame(x, y, face);
  const key0 = K.depthOf([x, y, 0], P);
  const bags = [];
  for (const [course, off] of [[0, 0], [1, 9]]) for (let a = -110 + off; a <= 110 - off + 1e-6; a += 18) bags.push([a, course]);
  const back = [`<path class="tr-pit" d="${K.onTop(trOct(F, 0, 0, r - 0.9, 12), z + 0.02, P, true)}"/>`], front = [];
  bags.map(([a, c]) => {
    const [u, v] = [r * Math.cos(a * TR_RAD), r * Math.sin(a * TR_RAD)];
    const G = fdFrame(...F(u, v), face + a);
    const [bx, by] = F(u, v);
    return { d: K.depthOf([bx, by, c], P), near: K.depthOf([bx, by, 0], P) > key0, svg: trPrism(K, P, trBoxRing(G, -0.45, 0.45, -0.58, 0.58), z + c * 0.55, z + c * 0.55 + 0.55) };
  }).sort((a, b) => a.d - b.d).forEach((b) => (b.near ? front : back).push(b.svg));
  return [
    { key: key0 - 2.6, svg: back[0] + `<g class="tr-p tr-bag">${back.slice(1).join("")}</g>` },
    { key: key0 + 2.6, svg: `<g class="tr-p tr-bag">${front.join("")}</g>` },
  ];
}

// ---------- standing cover: trees, hedges, walls, buildings ----------

// A broadleaf tree (kind "round", default) or a conifer ("cone") on ground z. t = {x, y, r, h}.
export function trTree(K, P, t, z = 0) {
  const k = K.cameraOf(P).k, V = fdView(K, P);
  const sx = t.x - V.light[0] * t.r * 0.55, sy = t.y - V.light[1] * t.r * 0.55;
  let svg = `<path class="tr-shadow" d="${K.onTop(fdBlob(sx, sy, t.r * 1.05, 3, 0.05, 14), z, P, true)}"/>`;
  if (t.kind === "cone") {
    svg += `<g class="tr-p tr-trunk">${trPrism(K, P, trOct(fdFrame(t.x, t.y, 0), 0, 0, t.r * 0.16, 6), z, z + t.h * 0.22)}</g>`;
    return svg + fdCone(K, P, t.x, t.y, t.r, z + t.h * 0.18, t.h * 0.82, { tone: "mid", className: "tr-conifer" }, 12);
  }
  svg += `<g class="tr-p tr-trunk">${trPrism(K, P, trOct(fdFrame(t.x, t.y, 0), 0, 0, t.r * 0.14, 6), z, z + t.h * 0.5)}</g>`;
  const [cx, cy] = K.iso([t.x, t.y, z + t.h * 0.62], P);
  const R = t.r * k, f = (n) => (Math.round(n * 10) / 10).toString();
  const lobes = (t.lobes ?? 1);
  if (lobes > 1) {
    // a clumped crown: a few overlapping lobes, back to front
    const rnd = fdRand(Math.round(t.x * 13 + t.y * 7));
    const ls = Array.from({ length: lobes }, (_, i) => ({ a: (i / lobes) * 6.28 + rnd(), d: R * 0.38, r: R * (0.62 + rnd() * 0.12) }))
      .map((l) => ({ ...l, x: cx + Math.cos(l.a) * l.d, y: cy + Math.sin(l.a) * l.d * 0.6 })).sort((a, b) => a.y - b.y);
    ls.push({ x: cx, y: cy - R * 0.12, r: R * 0.7 });
    for (const l of ls) svg += trCrown(l.x, l.y, l.r, f);
    return svg;
  }
  return svg + trCrown(cx, cy, R, f);
}
function trCrown(cx, cy, R, f) {
  return `<circle class="tr-canopy" cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}"/>` +
    `<path class="tr-canopy-dk" d="M${f(cx + R * 0.1)} ${f(cy - R * 0.99)}A${f(R)} ${f(R)} 0 0 1 ${f(cx + R * 0.1)} ${f(cy + R * 0.99)}A${f(R * 1.35)} ${f(R * 1.35)} 0 0 0 ${f(cx + R * 0.1)} ${f(cy - R * 0.99)}Z" style="opacity:.75"/>`;
}

// Scatter trees in a ring, at least `gap` apart, skipping avoid(x, y). Deterministic for a seed.
export function trScatter(ring, n, { seed = 7, gap = 6, r = [2.8, 4.2], h = [8, 12], cone = 0.2, lobes = 0.4, avoid = () => false, margin = 2 } = {}) {
  const rnd = fdRand(seed);
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const inner = fdInset(ring, margin);
  const out = [];
  for (let tries = 0; tries < n * 80 && out.length < n; tries++) {
    const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
    if (!fdInside(inner, [x, y]) || avoid(x, y) || out.some((t) => Math.hypot(t.x - x, t.y - y) < gap)) continue;
    const s = rnd(), kind = rnd() < cone ? "cone" : "round";
    out.push({ x, y, r: r[0] + (r[1] - r[0]) * s, h: h[0] + (h[1] - h[0]) * s, kind, lobes: kind === "round" && rnd() < lobes ? 3 : 1 });
  }
  return out;
}

// A wood: its floor (ground layer) and one item per tree.
export function trWood(K, P, T, ring, trees) {
  return { floor: trPatch(K, P, ring, "tr-woodfloor"), items: trees.map((t) => ({ key: K.depthOf([t.x, t.y, 0], P), svg: trTree(K, P, t, T.height(t.x, t.y)) })) };
}

// Split a polyline into pieces of about `len` units (for hedges and walls, so each piece sorts on its own).
function trPieces(pts, len) {
  const line = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 1));
    for (let j = i ? 1 : 0; j <= n; j++) line.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
  }
  const out = [];
  for (let i = 0; i < line.length - 1; i += len) out.push(line.slice(i, Math.min(line.length, i + len + 1)));
  return out.filter((p) => p.length > 1);
}

// A hedgerow: a low bank crowned with round bushes, in pieces that each sort on their own.
export function trHedge(K, P, pts, { seed = 9, w = 1.3, size = 1.5 } = {}) {
  const k = K.cameraOf(P).k, rnd = fdRand(seed), f = (n) => (Math.round(n * 10) / 10).toString();
  return trPieces(pts, 10).map((piece) => {
    let svg = K.solidSvg(K.extrude(fdRibbon(piece, w), 0, 0.6, P, { convex: false }), { tone: "lo", crease: "none", className: "tr-terrace" });
    const bumps = [];
    for (let i = 0; i < piece.length; i += 2) bumps.push([piece[i][0] + (rnd() - 0.5) * 0.6, piece[i][1] + (rnd() - 0.5) * 0.6, size * (0.8 + rnd() * 0.45)]);
    bumps.sort((a, b) => K.depthOf([a[0], a[1], 0], P) - K.depthOf([b[0], b[1], 0], P));
    for (const [x, y, r] of bumps) { const [cx, cy] = K.iso([x, y, 0.6 + r * 0.8], P); svg += trCrown(cx, cy, r * k, f); }
    const m = piece[Math.floor(piece.length / 2)];
    return { key: K.depthOf([m[0], m[1], 0], P), svg };
  });
}

// A dry-stone wall: a low narrow ribbon with a capstone course, in pieces.
export function trWall(K, P, pts, { h = 1.5, w = 0.55 } = {}) {
  return trPieces(pts, 8).map((piece) => {
    const svg = K.solidSvg(K.extrude(fdRibbon(piece, w), 0, h, P, { convex: false, bevel: 0.2 }), { tone: "lo", crease: "faint", className: "tr-wall" }) +
      K.solidSvg(K.extrude(fdRibbon(piece, w + 0.12), h, 0.32, P, { convex: false }), { tone: "lo", crease: "none", className: "tr-wall" });
    const m = piece[Math.floor(piece.length / 2)];
    return { key: K.depthOf([m[0], m[1], 0], P), svg };
  });
}

// A farm building: walls, a gabled roof (tinted), a door and two windows on the faces you can see.
export function trHouse(K, P, x, y, ang, len, wid, eave = 4.4, ridge = 7.6) {
  const F = fdFrame(x, y, ang), u = len / 2, v = wid / 2;
  const walls = K.solidSvg(K.extrude(trBoxRing(F, -u, u, -v, v), 0, eave, P), { tone: "mid" });
  const q = (a, b, z) => [...F(a, b), z];
  const e = [q(-u - 0.5, -v - 0.6, eave - 0.3), q(u + 0.5, -v - 0.6, eave - 0.3), q(u + 0.5, v + 0.6, eave - 0.3), q(-u - 0.5, v + 0.6, eave - 0.3)];
  const r0 = q(-u - 0.5, 0, ridge), r1 = q(u + 0.5, 0, ridge);
  const roof = fdPoly(K, P, [[e[0], e[1], r1, r0], [e[2], e[3], r0, r1], [e[1], e[2], r1], [e[3], e[0], r0], [e[3], e[2], e[1], e[0]]], { tone: "mid", className: "tr-roof", creaseAngle: 20 });
  // openings: closed outlines on the two faces that face the viewer
  const [vx, vy] = K.towardViewer(P);
  const holes = [];
  for (const [nu, nv, a0, a1, side] of [[1, 0, -v, v, u], [-1, 0, -v, v, -u], [0, 1, -u, u, v], [0, -1, -u, u, -v]]) {
    const n = F(nu, nv), o = F(0, 0);
    if ((n[0] - o[0]) * vx + (n[1] - o[1]) * vy <= 0.05) continue;
    const span = a1 - a0;
    const at = (t, z) => (nu ? q(side, a0 + span * t, z) : q(a0 + span * t, side, z));
    const rect = (t0, t1, z0, z1) => K.pathOf([at(t0, z0), at(t1, z0), at(t1, z1), at(t0, z1)].map((p) => K.iso(p, P)), true);
    holes.push(rect(0.42, 0.58, 0, 2.6), rect(0.14, 0.28, 1.6, 2.8), rect(0.72, 0.86, 1.6, 2.8));
  }
  const shadow = `<path class="tr-shadow" d="${K.onTop(trBoxRing(F, -u - 1, u + 1.6, -v - 1, v + 1.6), 0, P, true)}"/>`;
  return { key: K.depthOf([x, y, 0], P), svg: shadow + walls + K.lineSvg(holes.join(""), { tone: "lo" }) + roof };
}

// ---------- marks on the ground: fire sectors and control measures ----------

// A fire sector draped on the ground: closed fan outline plus range arcs ending on its edges.
export function trFan(K, P, T, cx, cy, r0, r1, a0, a1, { side = "h", arcs = 2, alpha = 1 } = {}) {
  if (alpha < 0.02) return "";
  const sw = fdSweep(a0, a1, 2.5);
  const rad = (r) => { const pts = []; for (let t = 0; t <= 1.0001; t += 0.05) pts.push(fdPolar(cx, cy, r0 + (r1 - r0) * t, r)); return pts; };
  const ring = [...sw.map((a) => fdPolar(cx, cy, r1, a)), ...rad(a1).reverse().slice(1), ...[...sw].reverse().map((a) => fdPolar(cx, cy, r0, a)).slice(1), ...rad(a0).slice(1)];
  const d = [trPath3(K, P, trDrape(T, ring), true)];
  for (let i = 1; i <= arcs; i++) d.push(trPath3(K, P, trDrape(T, sw.map((a) => fdPolar(cx, cy, r0 + ((r1 - r0) * i) / (arcs + 1), a)))));
  const svg = K.lineSvg(d.join(""), { tone: "lo", className: `fd-${side}-line` });
  return alpha >= 0.999 ? svg : `<g opacity="${alpha.toFixed(2)}">${svg}</g>`;
}

// A chalk control line on pegs: a phase line (open) or a position outline (closed). The line runs
// peg to peg on the ground; returns { ground, items } (items: the pegs).
export function trChalk(K, P, T, pts, { closed = false, pegs = true, h = 3.4 } = {}) {
  const line = [];
  const all = closed ? [...pts, pts[0]] : pts;
  for (let i = 0; i < all.length - 1; i++) {
    const [ax, ay] = all[i], [bx, by] = all[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
    for (let j = i ? 1 : 0; j <= n; j++) line.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
  }
  const ground = K.lineSvg(trPath3(K, P, trDrape(T, line, 0.12), closed), { tone: "lo", dashed: true, className: "tr-chalk" });
  const items = pegs ? pts.map(([x, y]) => ({ key: K.depthOf([x, y, 0], P), svg: fdPeg(K, P, x, y, T.height(x, y), h) })) : [];
  return { ground, items };
}
// The objective: a flag on a post (fdObjective) standing on the ground at (x, y).
export const trObjective = (K, P, T, x, y, opts) => ({ key: K.depthOf([x, y, 0], P), svg: fdObjective(K, P, x, y, T.height(x, y), opts) });

// ---------- fire: deterministic streams of rounds ----------

// stream = { id, side: "f"|"h", from: [x,y,z], to: [[x,y,z]...] (targets), period (s between bursts),
// burst (rounds), gap (s between rounds), flight (s muzzle to impact), phase, on (0..1 share of bursts
// fired), smoke (impacts leave drifting smoke), heavy (machine gun) }. Everything is a function of
// time t, so the build and the page agree and a paused page shows a still frame.
const trHash = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
export function trShots(streams, t, { smokeLife = 3.6, wind = [-2.2, -3.4] } = {}) {
  const out = { tracers: [], flashes: [], puffs: [], smoke: [] };
  streams.forEach((st, si) => {
    if (!st.to || !st.to.length || !(st.on > 0.01)) return;
    const life = st.flight + (st.smoke ? smokeLife : 0.6);
    const k0 = Math.floor((t - life - st.phase) / st.period) - 1, k1 = Math.floor((t - st.phase) / st.period);
    for (let k = k0; k <= k1; k++) {
      if (trHash(si * 977 + 13, k) > st.on) continue;
      const target = st.to[Math.floor(trHash(si, k * 7 + 1) * st.to.length) % st.to.length];
      for (let j = 0; j < st.burst; j++) {
        const t0 = st.phase + k * st.period + j * st.gap, age = t - t0;
        if (age < 0) continue;
        const sc = st.scatter ?? 1.6;
        const b = [target[0] + (trHash(k, j * 3 + si) - 0.5) * sc, target[1] + (trHash(j, k * 5 + si) - 0.5) * sc, target[2] + (trHash(k + j, si) - 0.3) * sc * 0.4];
        if (age < 0.07) out.flashes.push({ p: st.from, side: st.side, heavy: st.heavy, a: 1 - age / 0.07 });
        if (age < st.flight) out.tracers.push({ a: st.from, b, u: age / st.flight, side: st.side, heavy: st.heavy });
        else {
          const ia = age - st.flight;
          if (ia < 0.55) out.puffs.push({ p: b, age: ia / 0.55, side: st.side });
          if (st.smoke && ia < smokeLife && j === 0) out.smoke.push({ p: [b[0] + wind[0] * ia, b[1] + wind[1] * ia, b[2] + ia * 1.1], age: ia / smokeLife });
        }
      }
    }
  });
  return out;
}

// ---------- page only: ordering live items among the statics, and the fire layer ----------

// trStage(layer): the layer holds static <g data-k> items in key order (from fdStatic). put(list)
// keeps one <g> per live item (id), re-renders it only when its look changes, moves it with a
// translate, and re-inserts it among the statics only when its slot changes. list items:
// { id, key, at: [sx, sy] screen offset, look, svg: () => string, side, lit }.
export function trStage(layer) {
  layer.querySelectorAll(":scope > [data-dyn]").forEach((n) => n.remove());
  const statics = [...layer.children];
  const keys = statics.map((n) => Number(n.getAttribute("data-k")));
  const nodes = new Map();
  const slotOf = (key) => { let lo = 0, hi = keys.length; while (lo < hi) { const m = (lo + hi) >> 1; if (keys[m] <= key) lo = m + 1; else hi = m; } return lo; };
  return {
    put(list) {
      const seen = new Set();
      const live = [];
      for (const it of list) {
        seen.add(it.id);
        let n = nodes.get(it.id);
        if (!n) {
          n = document.createElementNS("http://www.w3.org/2000/svg", "g");
          n.setAttribute("data-dyn", "");
          n._look = null; n._at = "";
          nodes.set(it.id, n);
        }
        if (n._look !== it.look) {
          n.setAttribute("class", "tr-s");
          n.setAttribute("data-side", it.side || "f");
          if (it.lit) n.setAttribute("data-lit", ""); else n.removeAttribute("data-lit");
          n.innerHTML = it.svg();
          n._look = it.look;
        }
        const at = `translate(${it.at[0].toFixed(2)} ${it.at[1].toFixed(2)})`;
        if (n._at !== at) { n.setAttribute("transform", at); n._at = at; }
        live.push({ n, key: it.key, slot: slotOf(it.key) });
      }
      for (const [id, n] of nodes) if (!seen.has(id)) { n.remove(); nodes.delete(id); }
      live.sort((a, b) => a.key - b.key);
      for (let i = live.length - 1; i >= 0; i--) {
        const d = live[i];
        const ref = i < live.length - 1 && live[i + 1].slot === d.slot ? live[i + 1].n : statics[d.slot] || null;
        if (d.n.parentNode !== layer || d.n.nextSibling !== ref) layer.insertBefore(d.n, ref);
      }
    },
  };
}

// trFire(group, K, P): pools of tracer, flash, puff and smoke nodes in an SVG <g> drawn above the
// scene. draw(shots) writes only attributes. Tracers are short bright heads with a fainter tail,
// clipped to the muzzle-to-impact segment so a tracer never starts before the shooter or runs past
// the target.
export function trFire(group, K, P, { tracers = 56, puffs = 44, smoke = 40, flashes = 28 } = {}) {
  const ns = "http://www.w3.org/2000/svg";
  const make = (tag, cls, n) => Array.from({ length: n }, () => { const e = document.createElementNS(ns, tag); e.setAttribute("class", cls); group.appendChild(e); e._on = true; return e; });
  const sm = make("circle", "tr-smoke", smoke), du = make("circle", "tr-dust", puffs), tt = make("path", "tr-tracer", tracers), th = make("path", "tr-tracer", tracers), fl = make("circle", "tr-flash", flashes), pf = make("circle", "tr-puff", puffs);
  const k = K.cameraOf(P).k;
  const hide = (list, from) => { for (let i = from; i < list.length; i++) if (list[i]._on) { list[i].setAttribute("visibility", "hidden"); list[i]._on = false; } };
  const show = (e) => { if (!e._on) { e.removeAttribute("visibility"); e._on = true; } };
  const f1 = (n) => n.toFixed(1);
  const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  return {
    draw(S) {
      let i = 0;
      for (const s of S.smoke.slice(0, smoke)) {
        const e = sm[i++], [x, y] = K.iso(s.p, P);
        show(e); e.setAttribute("cx", f1(x)); e.setAttribute("cy", f1(y)); e.setAttribute("r", f1((1.6 + s.age * 6) * k)); e.setAttribute("opacity", (0.2 * (1 - s.age) * Math.min(1, s.age * 6)).toFixed(2));
      }
      hide(sm, i);
      i = 0;
      for (const s of S.tracers.slice(0, tracers)) {
        const head = lerp(s.a, s.b, s.u), tail = lerp(s.a, s.b, Math.max(0, s.u - 0.22)), neck = lerp(s.a, s.b, Math.max(0, s.u - 0.06));
        const [hx, hy] = K.iso(head, P), [tx, ty] = K.iso(tail, P), [nx, ny] = K.iso(neck, P);
        const a = tt[i], b = th[i]; i++;
        show(a); show(b);
        a.setAttribute("data-side", s.side); b.setAttribute("data-side", s.side);
        a.setAttribute("d", `M${f1(tx)} ${f1(ty)}L${f1(hx)} ${f1(hy)}`); a.setAttribute("stroke-width", s.heavy ? "1.1" : "0.8"); a.setAttribute("opacity", "0.32");
        b.setAttribute("d", `M${f1(nx)} ${f1(ny)}L${f1(hx)} ${f1(hy)}`); b.setAttribute("stroke-width", s.heavy ? "1.9" : "1.3"); b.setAttribute("opacity", "1");
      }
      hide(tt, i); hide(th, i);
      i = 0;
      for (const s of S.flashes.slice(0, flashes)) {
        const e = fl[i++], [x, y] = K.iso(s.p, P);
        show(e); e.setAttribute("data-side", s.side); e.setAttribute("cx", f1(x)); e.setAttribute("cy", f1(y)); e.setAttribute("r", f1((s.heavy ? 1.15 : 0.8) * k * (0.6 + 0.4 * s.a))); e.setAttribute("opacity", (0.95 * s.a).toFixed(2));
      }
      hide(fl, i);
      i = 0;
      for (const s of S.puffs.slice(0, puffs)) {
        const e = pf[i], d = du[i]; i++;
        const [x, y] = K.iso(s.p, P);
        show(e); show(d);
        e.setAttribute("data-side", s.side); e.setAttribute("cx", f1(x)); e.setAttribute("cy", f1(y)); e.setAttribute("r", f1((0.5 + s.age * 0.6) * k)); e.setAttribute("opacity", (0.9 * (1 - s.age) ** 2).toFixed(2));
        d.setAttribute("cx", f1(x)); d.setAttribute("cy", f1(y - s.age * 1.6 * k)); d.setAttribute("r", f1((0.7 + s.age * 1.9) * k)); d.setAttribute("opacity", (0.45 * (1 - s.age)).toFixed(2));
      }
      hide(pf, i); hide(du, i);
    },
  };
}
