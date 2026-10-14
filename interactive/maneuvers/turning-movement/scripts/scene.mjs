// The parts that move or stand tall, rebuilt per frame and depth sorted: the lock, its bolt and
// keeper, the guard block on its ring track, the release lever with its crank and rod, the
// turning carriage on the bypass rail, and the diversion carriage at the front.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page (inlined kit)
// run the same code. build.mjs inlines this file with `export` and `import` lines stripped.
import { MODEL, LEVER, ROLLER, routeAt, S_CONTACT } from "./model.mjs";

export const GEO = {
  BOLT_LOCKED: 34,   // bolt tip x when thrown into the keeper
  DIV_FRONT: 48.2,   // diversion pad face x when it bears on the guard at the front
  DIV_KEEPER: 35.2,  // diversion pad face x when it reaches the keeper
  DIV_LEN: 13,       // pad face to carriage front
};

const SC_RAD = Math.PI / 180;

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const frame = (ox, oy, ang) => {
    const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
    return (u, v) => [ox + u * c - v * s, oy + u * s + v * c];
  };
  const box = (F, u0, u1, v0, v1, z0, h, bevel = 0) =>
    K.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z0, h, P, { bevel });
  const poly = (F, pts, z0, h, bevel = 0) => K.extrude(pts.map(([u, v]) => F(u, v)), z0, h, P, { bevel });
  const sector = (r0, r1, a0, a1, step = 3) => {
    const out = [];
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
    for (let i = 0; i <= n; i++) { const a = (a0 + ((a1 - a0) * i) / n) * SC_RAD; out.push([r1 * Math.cos(a), r1 * Math.sin(a)]); }
    for (let i = n; i >= 0; i--) { const a = (a0 + ((a1 - a0) * i) / n) * SC_RAD; out.push([r0 * Math.cos(a), r0 * Math.sin(a)]); }
    return out;
  };
  const dots = (pts, z, size = 0.42) => K.dotsSvg(pts.map(([x, y]) => at([x, y, z])), { size });

  const LF = frame(LEVER.px, LEVER.py, S.phi);
  const handleKey = depth(...LF(-20, 0));

  // ---- the lock: base, case, lid, keyhole, face plate ----
  {
    let out = `<path class="iso-halo" d="${K.slabOf({ x: -19, y: -21, w: 38, d: 42, r: 3 }, 0, 0.1, P).fill}" style="filter:blur(3px)"/>`;
    const base = { x: -18, y: -20, w: 36, d: 40, r: 2.5 };
    out += solid(K.slabOf(base, 0, 3, P, 4, 0.5), { tone: "mid" });
    out += dots(K.corners(base, 2.4), 3, 0.45);
    const body = { x: -14, y: -16, w: 28, d: 32, r: 1.5 };
    let key = "";
    if (K.towardViewer(P)[1] > 0) {
      // keyhole on the +y face: a round head over a tapered slot, as one closed outline
      const pts = [];
      for (let a = -55; a <= 235; a += 15) pts.push([2.2 * Math.cos(a * SC_RAD), 0, 2.2 * Math.sin(a * SC_RAD)]);
      key = line(K.pathOf([...pts.map(([x, , z]) => at([x, 16, 14.6 + z])), at([-1.3, 16, 9.4]), at([1.3, 16, 9.4])], true), { tone: "lo" });
    }
    out += solid(K.slabOf(body, 3, 18, P, 4, 0.5), { tone: "mid", inner: line(K.sideSeam(body, 6, P, 4), { tone: "faint" }) + key });
    const lid = { x: -15, y: -17, w: 30, d: 34, r: 2 };
    out += solid(K.slabOf(lid, 21, 2, P, 4, 0.5), { tone: "hi", crease: "lo" });
    out += line(K.planOutline(K.insetPlan(lid, 3), 23, P), { tone: "faint" });
    out += dots(K.corners(lid, 1.6), 23, 0.45);
    // face plate the bolt runs through
    out += solid(K.slabOf({ x: 14, y: -7, w: 1, d: 14, r: 0.4 }, 7, 11, P, 2), { tone: "mid", crease: "none" });
    out += dots([[14.5, -5.4], [14.5, 5.4]].map(([x, y]) => [x + 0.5, y]), 18, 0.4);
    put(depth(0, 0), out);
  }

  // ---- the bolt, out of the face plate into the keeper ----
  {
    const tip = GEO.BOLT_LOCKED - S.bolt * MODEL.boltTravel;
    put(depth((15 + tip) / 2, 0), solid(K.slabOf({ x: 15, y: -3.5, w: tip - 15, d: 7, r: 0.8 }, 10, 5, P, 2, 0.3), { tone: "hi", crease: "lo" }));
  }

  // ---- the keeper the bolt shoots into ----
  {
    const base = { x: 24, y: -12, w: 14, d: 24, r: 2 };
    const post = { x: 27, y: -9, w: 8, d: 18, r: 1 };
    let out = solid(K.slabOf(base, 0, 3, P, 3, 0.4), { tone: "mid" });
    out += dots([[25.8, -10.2], [36.2, -10.2], [25.8, 10.2], [36.2, 10.2]], 3, 0.42);
    out += solid(K.slabOf(post, 3, 17, P, 3, 0.4), { tone: "mid", inner: line(K.sideSeam(post, 8, P, 3), { tone: "faint" }) });
    out += line(K.planOutline(K.insetPlan(post, 1.8), 20, P, 3), { tone: "faint" });
    put(depth(31, 0), out);
  }

  // ---- the guard block on its ring track ----
  {
    const g = S.g;
    const F = frame(0, 0, g);
    const sec = (r0, r1, h0, h1) => sector(r0, r1, g - h0, g + h1, 3);
    let out = `<path class="iso-halo" d="${K.extrude(sec(39, 49, 10, 10), 3.5, 0.1, P, { convex: false }).fill}" style="filter:blur(3px)"/>`;
    out += solid(K.extrude(sec(40.5, 47.5, 8.6, 8.6), 3.5, 2.5, P, { convex: false }), { tone: "lo" });
    out += solid(K.extrude(sec(40, 48, 9, 9), 6, 16, P, { convex: false, bevel: 0.4 }), { tone: "hi", crease: "lo" });
    out += solid(K.extrude(sec(42, 46, 5.5, 5.5), 22, 1.5, P, { convex: false }), { tone: "mid" });
    out += dots([F(44, -3.4), F(44, 3.4)], 23.5, 0.45);
    let key = depth(...F(44, 0));
    if (g < -120) key = Math.min(key, handleKey - 0.01);
    put(key, out);
  }

  // ---- the release lever: post, hub, bell crank and pin; handle sorted on its own ----
  {
    const [px, py] = [LEVER.px, LEVER.py];
    let out = `<path class="iso-halo" d="${K.slabOf({ x: px - 8, y: py - 8, w: 16, d: 16, r: 3 }, 0, 0.1, P).fill}" style="filter:blur(3px)"/>`;
    const pad = { x: px - 7, y: py - 7, w: 14, d: 14, r: 2 };
    out += solid(K.slabOf(pad, 0, 2.5, P, 3, 0.4), { tone: "mid" });
    out += dots(K.corners(pad, 2), 2.5, 0.42);
    out += solid(K.cylinder(px, py, 4.6, 2.5, 2.5, P, 24), { tone: "mid" });
    out += solid(K.cylinder(px, py, 2.4, 5, 8, P, 18), { tone: "mid", crease: "none", inner: line(K.sideArc(px, py, 2.4, 9, P, 12), { tone: "faint" }) });
    out += solid(K.cylinder(px, py, 4, 13, 3, P, 24, 0.3), { tone: "mid" });
    // bell crank arm to the pin, and the pin
    out += solid(box(LF, -1.6, 1.6, 2, LEVER.crank, 13.6, 2), { tone: "mid", crease: "none" });
    const [qx, qy] = LF(0, LEVER.crank);
    out += solid(K.cylinder(qx, qy, 1.5, 11, 5, P, 14), { tone: "mid", crease: "none" });
    out += solid(K.cylinder(px, py, 1.8, 16, 0.8, P, 16), { tone: "mid", crease: "none" });
    out += line(K.lineOnTop(LF(1.8, 0), LF(3.6, 0), 16, P), { tone: "hi" });
    put(depth(px, py), out);

    // the rod from the pin to the lock's back face
    const [ex, ey] = [-14, LEVER.crank];
    const dx = ex - qx, dy = ey - qy, L = Math.hypot(dx, dy);
    const RF = frame(qx, qy, Math.atan2(dy, dx) / SC_RAD);
    put(depth((qx + ex) / 2, (qy + ey) / 2), solid(box(RF, 1.5, L, -1, 1, 11.6, 2, 0.2), { tone: "mid", crease: "none" }));

    // the handle
    put(handleKey, solid(K.extrude(
      [LF(-3, -LEVER.half), LF(-LEVER.len + 1.5, -LEVER.half), LF(-LEVER.len, -0.6), LF(-LEVER.len, 0.6), LF(-LEVER.len + 1.5, LEVER.half), LF(-3, LEVER.half)],
      13.5, 2, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" }));
  }

  // ---- the turning force: carriage on the bypass rail, lit wedge, arm and roller ----
  {
    const R = routeAt(S.s);
    const F = frame(R.x, R.y, R.h);
    const onB = S.s > S_CONTACT - 40;
    let key = depth(R.x, R.y);
    if (onB) key = Math.min(key, handleKey - 0.02);
    let out = `<path class="iso-halo" d="${box(F, -12, 12, -14, 14, 4.2, 0.1).fill}" style="filter:blur(3px)"/>`;
    const shoes = [];
    for (const [u0, u1] of [[-10, -4], [4, 10]]) for (const [v0, v1] of [[-13, -9], [9, 13]]) shoes.push([u0, u1, v0, v1]);
    const shoeSvg = ([u0, u1, v0, v1]) => solid(box(F, u0, u1, v0, v1, 4.2, 4.4, 0.3), { tone: "mid" }) + dots([F((u0 + u1) / 2, (v0 + v1) / 2)], 8.6);
    const near = ([u0, u1, v0, v1]) => depth(...F((u0 + u1) / 2, (v0 + v1) / 2)) > depth(R.x, R.y);
    out += shoes.filter((p) => !near(p)).map(shoeSvg).join("");
    out += solid(box(F, -11, 11, -9, 9, 5, 4, 0.5), { tone: "mid" });
    out += shoes.filter(near).map(shoeSvg).join("");
    out += dots([F(-9.4, -7.4), F(-9.4, 7.4), F(9.4, -7.4), F(9.4, 7.4)], 9);
    out += solid(poly(F, [[-8, -5], [2, -5], [6, 0], [2, 5], [-8, 5]], 9, 3.2, 0.4), { tone: "hi", lit: true, crease: "lo" });
    out += line(K.onTop([F(-8, 0), F(6, 0)], 12.2, P), { tone: "lit" });
    out += solid(box(F, 6.4, 14.6, -2.2, 2.2, 9, 2, 0.3), { tone: "mid" });
    // handle on the back
    out += solid(box(F, -14, -11, -1.6, 1.6, 6, 2.6), { tone: "mid", crease: "none" });
    const [hx, hy] = F(-16.4, 0);
    out += solid(K.cylinder(hx, hy, 2.4, 5.4, 4.2, P, 20), { tone: "mid" }) + line(K.knurl(hx, hy, 2.4, 5.4, 9.6, 16, P), { tone: "lo" });
    put(key, out);

    const [rx, ry] = F(ROLLER.ahead, 0);
    let rkey = depth(rx, ry);
    if (onB) rkey = Math.max(rkey, handleKey + 0.01);
    put(rkey, solid(K.cylinder(rx, ry, ROLLER.r, 11, 6, P, 20, 0.3), { tone: "hi", crease: "lo", inner: line(K.sideArc(rx, ry, ROLLER.r, 14, P, 12), { tone: "faint" }) }) +
      solid(K.cylinder(rx, ry, 0.9, 17, 0.6, P, 12), { tone: "mid", crease: "none" }));
  }

  // ---- the diversion force: carriage on the front rail, housing, rod and pad ----
  {
    const tip = S.tip, fx = tip + GEO.DIV_LEN;
    let out = `<path class="iso-halo" d="${K.slabOf({ x: fx - 1, y: -13, w: 28, d: 26, r: 2 }, 3, 0.1, P).fill}" style="filter:blur(3px)"/>`;
    const shoes = [];
    for (const sx of [2, 18]) for (const sy of [-16, 12]) shoes.push({ x: fx + sx, y: sy, w: 6, d: 4, r: 0.8 });
    const shoeSvg = (p) => solid(K.slabOf(p, 3, 4.4, P, 2, 0.3), { tone: "mid" }) + dots([[p.x + 3, p.y + 2]], 7.4);
    const near = (p) => depth(p.x + p.w / 2, p.y + p.d / 2) > depth(fx + 13, 0);
    out += shoes.filter((p) => !near(p)).map(shoeSvg).join("");
    const plate = { x: fx, y: -12, w: 26, d: 24, r: 2 };
    out += solid(K.slabOf(plate, 3, 5, P, 4, 0.6), { tone: "mid" });
    out += shoes.filter(near).map(shoeSvg).join("");
    const hous = { x: fx + 1, y: -6, w: 12, d: 12, r: 1.2 };
    out += solid(K.slabOf(hous, 8, 8, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(hous, 12, P, 3), { tone: "faint" }) });
    out += dots(K.corners(hous, 1.6), 16, 0.42);
    out += solid(K.cylinder(fx + 7, 0, 2.6, 16, 2.6, P, 22), { tone: "mid" }) + line(K.knurl(fx + 7, 0, 2.6, 16, 18.6, 18, P), { tone: "lo" });
    out += line(K.lineOnTop([fx, 8.5], [fx + 26, 8.5], 8, P), { tone: "faint" }) + line(K.lineOnTop([fx, -8.5], [fx + 26, -8.5], 8, P), { tone: "faint" });
    out += solid(K.slabOf({ x: fx + 26, y: -1.6, w: 3, d: 3.2, r: 0.6 }, 4.4, 2.6, P, 2), { tone: "mid", crease: "none" });
    out += solid(K.cylinder(fx + 31.4, 0, 2.4, 3.6, 4.4, P, 20), { tone: "mid" }) + line(K.knurl(fx + 31.4, 0, 2.4, 3.6, 8, 16, P), { tone: "lo" });
    put(depth(fx + 13, 0), out);
    put(depth(tip + 6, 0),
      solid(K.slabOf({ x: tip + 2.4, y: -1.3, w: fx + 1 - tip - 2.4, d: 2.6, r: 1.1 }, 11, 2.6, P, 3), { tone: "mid", crease: "none" }) +
      solid(K.slabOf({ x: tip, y: -4.5, w: 2.4, d: 9, r: 0.7 }, 7.6, 9.6, P, 2, 0.3), { tone: "mid", crease: "lo" }) +
      dots([[tip + 1.2, -3], [tip + 1.2, 3]], 17.2, 0.4));
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The dial needle for a share f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 2.4, D.y - sy * 2.4], [D.x + sx * (D.r - 3), D.y + sy * (D.r - 3)], D.top + 0.2, P);
}
