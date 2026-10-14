// The moving half of the machine: the assault carriage on its rail, the trip dog on the cam bar,
// the hopper and its chute on the cantilever, the pop-up targets and the falling shot. Rebuilt per
// frame from the state V the page computes (and the build's first frame). Written against the kit
// as a parameter (K) so build.mjs (Node) and the page (inlined kit) run the same code. build.mjs
// inlines this file with `import` and `export` lines stripped.
import { fdPoly } from "../../kit/field.mjs";

export const GEO = {
  X0: 96,          // carriage nose x at 0 m (the front target's hinge sits just beyond)
  KX: 1.3,         // world units per metre on the rail
  HX: 100, HZ: 10.5, PH: 20, PW: 12,     // front target block's front x, hinge z, plate height, half width
  RX: 136, RZ: 8.5, RH: 13, RW: 9,       // rear (depth) target
  HOP: [108, 0],   // hopper axis
  POST: [110, -46],
  ARM_Z: 74,
  CHUTE_Z: 58,     // chute pivot (hopper throat)
  CHUTE_L: 10,
  BAR_Y: [-32, -24],
  SHIFT_ANG: 34,   // degrees the chute swings toward the depth target
};
GEO.xAt = (d) => GEO.X0 - d * GEO.KX;

const SC_RAD = Math.PI / 180;

// A box in a frame hinged on a line parallel to y through (hx, hz): u runs along the frame's axis
// tilted by ang degrees up from +x, w along its normal, v along y.
function tiltBox(hx, hz, ang, u0, u1, v0, v1, w0, w1, dir = 1) {
  const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
  const p = (u, v, w) => [hx + dir * (u * c - w * s), v, hz + u * s + w * c];
  const A = p(u0, v0, w0), B = p(u1, v0, w0), C = p(u1, v1, w0), D = p(u0, v1, w0);
  const E = p(u0, v0, w1), F = p(u1, v0, w1), G = p(u1, v1, w1), H = p(u0, v1, w1);
  return [[A, B, C, D], [E, F, G, H], [A, B, F, E], [B, C, G, F], [C, D, H, G], [D, A, E, H]];
}
// The same for a chute hanging from a pivot and swung toward +x by ang degrees.
function hangBox(px, pz, ang, len, r, py = 0) {
  const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
  const p = (u, v, w) => [px + w * c + u * s, py + v, pz - u * c + w * s];
  const A = p(0, -r, -r), B = p(len, -r, -r), C = p(len, r, -r), D = p(0, r, -r);
  const E = p(0, -r, r), F = p(len, -r, r), G = p(len, r, r), H = p(0, r, r);
  return [[A, B, C, D], [E, F, G, H], [A, B, F, E], [B, C, G, F], [C, D, H, G], [D, A, E, H]];
}
export function chuteExit(ang) {
  const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
  return [GEO.HOP[0] + GEO.CHUTE_L * s, GEO.HOP[1], GEO.CHUTE_Z - GEO.CHUTE_L * c];
}

// V = { d (m), L (trip dog setting, m), flag (0..1 flag folded), cam (0..1 cam turned), chute (deg), gate (0 open..1 closed),
//       halted (0..1 brake), front (0..1 target up), rear (0..1 depth target up), shots: [[x,y,z]...] }
export function scene(K, P, V) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const slab = (x0, x1, y0, y1, z0, h, r = 0.8, bevel = 0.4) => K.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, h, P, 3, bevel);

  // ---- the trip dog: a clamp block on the cam bar with a thumb screw and a fold-down flag ----
  {
    const xT = GEO.xAt(V.L) + 3;
    const [y0, y1] = GEO.BAR_Y;
    const ym = (y0 + y1) / 2;
    let out = `<path class="iso-halo" d="${K.slabOf({ x: xT - 5, y: y0 - 1, w: 10, d: y1 - y0 + 2, r: 1 }, 3, 0.1, P).fill}" style="filter:blur(2px)"/>`;
    out += solid(slab(xT - 4, xT + 4, y0 - 0.6, y1 + 0.6, 3, 5, 0.8, 0.4), { tone: "mid" });
    out += line(K.sideSeam({ x: xT - 4, y: y0 - 0.6, w: 8, d: y1 - y0 + 1.2, r: 0.8 }, 5, P, 3), { tone: "faint" });
    out += K.dotsSvg([[xT - 2.6, y0 + 0.8], [xT - 2.6, y1 - 0.8]].map(([x, y]) => at([x, y, 8])), { size: 0.42 });
    out += solid(K.cylinder(xT + 1.6, ym, 2, 8, 3, P, 18), { tone: "mid" }) + line(K.knurl(xT + 1.6, ym, 2, 8, 11, 14, P), { tone: "lo" });
    // the flag hinges on the block's top at its -x edge and folds toward +x when the carriage trips it
    const fold = 90 * (1 - V.flag);
    out += fdPoly(K, P, tiltBox(xT - 3.4, 8.2, fold, 0, 8, ym - 3, ym + 3, -0.5, 0.5), { tone: "hi", crease: "lo" });
    put(depth(xT, ym), out);
  }

  // ---- the assault carriage (lit spearhead) ----
  {
    const n = GEO.xAt(V.d);
    const cx = n - 17;
    let car = `<path class="iso-halo" d="${K.slabOf({ x: n - 31, y: -12, w: 28, d: 24, r: 2 }, 3, 0.1, P).fill}" style="filter:blur(3px)"/>`;
    const shoes = [];
    for (const sx of [-28, -12]) for (const sy of [-9.5, 4.5]) shoes.push({ x: n + sx, y: sy, w: 8, d: 5, r: 0.8 });
    const shoeSvg = (plan) => solid(K.slabOf(plan, 3, 4.6, P, 2, 0.3), { tone: "mid" }) + K.dotsSvg([at([plan.x + 4, plan.y + 2.5, 7.6])], { size: 0.42 });
    const near = (plan) => depth(plan.x + plan.w / 2, plan.y + plan.d / 2) > depth(cx, 0);
    car += shoes.filter((p) => !near(p)).map(shoeSvg).join("");
    // the striker arm reaches over the cam bar to trip the dog's flag
    car += solid(slab(n - 4, n - 1, -28, -10, 8.6, 2.2, 0.5, 0.2), { tone: "mid" });
    car += K.dotsSvg([at([n - 2.5, -26.6, 10.8])], { size: 0.42 });
    car += solid(K.slabOf({ x: n - 30, y: -12, w: 26, d: 24, r: 2 }, 3, 6, P, 4, 0.6), { tone: "mid" });
    car += shoes.filter(near).map(shoeSvg).join("");
    car += line(K.lineOnTop([n - 30, 8.5], [n - 4, 8.5], 9, P), { tone: "faint" }) + line(K.lineOnTop([n - 30, -8.5], [n - 4, -8.5], 9, P), { tone: "faint" });
    // brake caliper on the near side: the shoe drops onto the rail when the assault halts
    const bz = 4.6 - 1.4 * V.halted;
    car += solid(slab(n - 22, n - 14, 11.2, 14.6, 4, 6.2, 0.6, 0.3), { tone: "mid" });
    car += solid(slab(n - 21, n - 15, 5.4, 9.2, bz, 1.2, 0.4, 0.2), { tone: V.halted > 0.5 ? "hi" : "mid", crease: "lo" });
    car += solid(K.cylinder(n - 18, 12.9, 1.6, 10.2, 2.2, P, 14), { tone: "mid" }) + line(K.knurl(n - 18, 12.9, 1.6, 10.2, 12.4, 12, P), { tone: "lo" });
    // spearhead
    const wedge = [[n + 2, 0], [n - 10, -8], [n - 24, -8], [n - 24, 8], [n - 10, 8]];
    car += solid(K.extrude(wedge, 9, 6, P, { bevel: 0.4 }), { tone: "hi", lit: true, crease: "lo" });
    car += line(K.lineOnTop([n + 2, 0], [n - 24, 0], 15, P), { tone: "lit" });
    car += solid(K.cylinder(n - 20, 0, 2.6, 15, 3.4, P, 20), { tone: "mid" }) + line(K.knurl(n - 20, 0, 2.6, 15, 18.4, 16, P), { tone: "lo" });
    put(depth(cx, 0), car);
  }

  // ---- the targets: a plate hinged at the rear edge of its block; folded down (toward the carriage)
  // it lies on the block, suppressed; standing, with its barrel out toward the carriage, it fires ----
  const target = (bx0, len, hz, H, W, up, by, key) => {
    const bx1 = bx0 + len, hx = bx1 - 1.8, bh = hz - 0.5;
    let out = `<path class="iso-halo" d="${K.slabOf({ x: bx0 - 1, y: -by - 1, w: len + 2, d: 2 * by + 2, r: 2 }, 0, 0.1, P).fill}" style="filter:blur(3px)"/>`;
    out += solid(slab(bx0, bx1, -by, by, 0, bh, 1.4, 0.6), { tone: "mid", inner: line(K.sideSeam({ x: bx0, y: -by, w: len, d: 2 * by, r: 1.4 }, bh * 0.45, P, 3), { tone: "faint" }) });
    out += K.dotsSvg(K.corners({ x: bx0, y: -by, w: len, d: 2 * by }, 2.4).map(([x, y]) => at([x, y, bh])), { size: 0.45 });
    // a rest pad the plate lies on when down
    out += solid(slab(bx0 + 2, bx0 + 5, -W + 2, W - 2, bh, 0.8, 0.4, 0.2), { tone: "mid", crease: "none" });
    for (const v of [-W + 1, -2, W - 5]) out += solid(slab(hx - 1.6, hx + 1.6, v, v + 4, bh, hz - bh + 1.4, 0.6, 0.2), { tone: "mid" });
    const ang = 90 * up;
    out += fdPoly(K, P, tiltBox(hx, hz + 0.8, ang, 0, H, -W, W, -1, 1, -1), { tone: "hi", crease: "lo" });
    const gl = 6 * Math.max(0, (up - 0.35) / 0.65);
    if (gl > 0.3) out += fdPoly(K, P, tiltBox(hx, hz + 0.8, ang, H * 0.6, H * 0.6 + 2.2, -1.1, 1.1, -1, -1 - gl, -1), { tone: "mid", crease: "none" });
    put(key, out);
  };
  target(GEO.HX - 2, 24, GEO.HZ, GEO.PH, GEO.PW, V.front, 15, depth(GEO.HX + 10, 0));
  target(GEO.RX - 2, 17, GEO.RZ, GEO.RH, GEO.RW, V.rear, 11, depth(GEO.RX + 6, 0));

  // ---- the hopper on its cantilever: post, cam disc, arm, funnel, gate and swinging chute ----
  {
    const [px, py] = GEO.POST, [hx, hy] = GEO.HOP, Z = GEO.ARM_Z;
    let out = `<path class="iso-halo" d="${K.cylinder(px, py, 8, 0, 0.1, P, 28).fill}" style="filter:blur(3px)"/>`;
    out += solid(K.cylinder(px, py, 7, 0, 3, P, 28, 0.4), { tone: "mid" });
    out += K.dotsSvg([0, 90, 180, 270].map((a) => at([px + 5.4 * Math.cos((a + 45) * SC_RAD), py + 5.4 * Math.sin((a + 45) * SC_RAD), 3])), { size: 0.42 });
    out += solid(K.cylinder(px, py, 3.2, 3, Z - 3, P, 24), { tone: "mid", crease: "none", inner: line(K.sideArc(px, py, 3.2, 30, P, 16), { tone: "faint" }) });
    // cam disc with its index lobe: turns a quarter when the trip fires
    const camA = -90 + 90 * V.cam;
    out += solid(K.cylinder(px, py, 7.5, 9, 2.6, P, 32, 0.4), { tone: "mid" });
    const F = (u, v) => [px + u * Math.cos(camA * SC_RAD) - v * Math.sin(camA * SC_RAD), py + u * Math.sin(camA * SC_RAD) + v * Math.cos(camA * SC_RAD)];
    out += solid(K.extrude([F(5.5, -1.8), F(10, -1.2), F(10, 1.2), F(5.5, 1.8)], 9, 2.6, P, { bevel: 0.2 }), { tone: "hi", crease: "lo" });
    out += line(K.ring(px, py, 5.2, 11.6, P, 32), { tone: "faint" });
    // the arm
    out += solid(slab(px - 3, px + 3, py - 4, hy + 6, Z, 5, 0.8, 0.5), { tone: "mid", inner: line(K.sideSeam({ x: px - 3, y: py - 4, w: 6, d: hy + 10 - py, r: 0.8 }, Z + 2.5, P, 3), { tone: "faint" }) });
    out += K.dotsSvg([[px, py], [px, py + 6], [hx, hy - 2], [hx, hy + 3]].map(([x, y]) => at([x, y, Z + 5])), { size: 0.42 });
    put(depth(px, py), out);

    // funnel (hung under the arm end) with shot heaped in its mouth
    const T0 = Z - 1.5, B0 = GEO.CHUTE_Z + 1.5, r0 = 9, r1 = 2.8;
    const sq = (r, z) => [[hx - r, hy - r, z], [hx + r, hy - r, z], [hx + r, hy + r, z], [hx - r, hy + r, z]];
    const top = sq(r0, T0), bot = sq(r1, B0);
    const faces = [top, bot.slice().reverse()];
    for (let i = 0; i < 4; i++) faces.push([top[i], top[(i + 1) % 4], bot[(i + 1) % 4], bot[i]]);
    let hop = solid(slab(hx - 3, hx + 3, hy - 3, hy + 3, T0, Z - T0, 0.5, 0.2), { tone: "mid" });
    hop += fdPoly(K, P, faces, { tone: "mid", crease: "faint" });
    hop += line(K.planOutline({ x: hx - r0 + 1.6, y: hy - r0 + 1.6, w: 2 * r0 - 3.2, d: 2 * r0 - 3.2, r: 0.6 }, T0, P), { tone: "faint" });
    const heap = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2 === 0) heap.push(at([hx - 5 + i * 2.5, hy - 5 + j * 2.5, T0]));
    hop += K.dotsSvg(heap, { size: 0.55, tone: "lo" });
    // the gate: a slide plate across the throat, pushed in to close (lift)
    const gx = hx + 3.2 + 7 * (1 - V.gate);
    hop += solid(slab(gx - 7, gx, hy - 3.6, hy + 3.6, B0 - 1.6, 1.2, 0.4, 0.2), { tone: V.gate > 0.5 ? "hi" : "mid", crease: "lo" });
    // the chute swings toward the depth target to shift
    hop += fdPoly(K, P, hangBox(hx, B0 - 1.6, V.chute, GEO.CHUTE_L, 2.2, hy), { tone: "mid", crease: "faint" });
    put(depth(hx, hy) + 0.5, hop);
  }

  // ---- shot in the air ----
  for (const s of V.shots || []) put(depth(s[0], s[1], s[2]) + 200, solid(K.cylinder(s[0], s[1], 1.5, s[2] - 1, 2, P, 12, 0.3), { tone: "lo", crease: "none" }));

  for (const extra of V.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// A dial needle for a share f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + Math.min(1, Math.max(0, f)) * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 2.4, D.y - sy * 2.4], [D.x + sx * (D.r - 3), D.y + sy * (D.r - 3)], D.top + 0.2, P);
}

// Shot positions at time t: falling from the chute onto the front target while fires suppress, or
// thrown by the swung chute onto the depth target once they shift. on: 0..1 how many fly.
export function shotsAt(t, chute, on, rearFall) {
  const out = [];
  if (on < 0.02) return out;
  const ex = chuteExit(chute);
  const period = 0.16, flight = 0.5;
  const k1 = Math.floor(t / period);
  for (let k = k1 - 4; k <= k1; k++) {
    const age = t - k * period;
    if (age < 0 || age > flight) continue;
    const h = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1, g = Math.abs(Math.sin(k * 78.233) * 12345.678) % 1;
    if (h > on) continue;
    const u = age / flight;
    const tgt = rearFall
      ? [GEO.RX + 2 + g * 6, (h - 0.5) * 10, GEO.RZ + 2]
      : [GEO.HX + 2 + g * 10, (h - 0.5) * 14, GEO.HZ + 2.6];
    const x = ex[0] + (tgt[0] - ex[0]) * u, y = ex[1] + (tgt[1] - ex[1]) * u;
    const z = rearFall ? ex[2] + (tgt[2] - ex[2]) * u + 10 * u * (1 - u) : ex[2] + (tgt[2] - ex[2]) * u * u;
    out.push([x, y, z]);
  }
  return out;
}
