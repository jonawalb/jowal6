// The bench: two loop wheels, each driven by a three-gear train, with four stations
// round each wheel, a lap differential between them and a tally rack in front of each.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page (inlined
// kit) run the same code. build.mjs inlines this file with `export` stripped.
//
// statics(K, P) returns the parts that never move as depth-keyed items; scene(K, P, S, st)
// adds the moving parts for state S, sorts everything far to near and returns the SVG.

export const GEO = {
  SIDE: { blue: { x: -78, y: -4, drive: 205 }, red: { x: 78, y: -4, drive: -25 } },
  DISC_R: 68, DISC_H: 2.4,           // stator disc under each wheel
  GZ: 10, GH: 3.5,                    // gear plane: bottom and thickness
  MOD: 44 / 24,                       // tooth module (wheel pitch radius 44, 48 teeth)
  N: { wheel: 48, idler: 20, pinion: 12 },
  STATIONS: [45, 135, 225, 315],      // observe, orient, decide, act: the middle of each quarter
  DIFF: { x: -30, y: -80, w: 60, d: 22, r: 2.5, h: 14 },
  DIAL: { x: 0, y: -69, r: 12.5, z: 20, h: 6 },
  RACK_Y: 70, LEVER_R: 18, LEVER_SPAN: [200, 340],
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;
GEO.R = { wheel: GEO.MOD * GEO.N.wheel / 2, idler: GEO.MOD * GEO.N.idler / 2, pinion: GEO.MOD * GEO.N.pinion / 2 };

const SC_RAD = Math.PI / 180;
const ss = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

// Where each gear of a side sits, and how its angle follows the wheel's.
export function trainOf(side) {
  const s = GEO.SIDE[side];
  const R = GEO.R;
  const idler = { x: s.x, y: s.y - (R.wheel + R.idler), a: 270 };
  const d = s.drive * SC_RAD;
  const pinion = { x: idler.x + (R.idler + R.pinion) * Math.cos(d), y: idler.y + (R.idler + R.pinion) * Math.sin(d), a: s.drive };
  return { wheel: { x: s.x, y: s.y }, idler, pinion };
}
// Meshing: gear 2 has a tooth gap facing gear 1's tooth along the line of centres (alpha).
const meshed = (theta1, n1, n2, alpha) => alpha + 180 - 180 / n2 - (n1 / n2) * (theta1 - alpha);
export function gearAngles(theta) {
  const N = GEO.N;
  const idler = meshed(theta, N.wheel, N.idler, 270);
  return { wheel: theta, idler, pinion: (d) => meshed(idler, N.idler, N.pinion, d) };
}

export function statics(K, P) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const S = (paths, style) => K.solidSvg(paths, style);
  const L = (d, style) => K.lineSvg(d, style);
  const polar = (cx, cy, r, deg) => [cx + r * Math.cos(deg * SC_RAD), cy + r * Math.sin(deg * SC_RAD)];
  const halo = (d, blur = 3) => `<path class="iso-halo" d="${d}" style="filter:blur(${blur}px)"/>`;

  for (const side of ["blue", "red"]) {
    const { x: cx, y: cy } = GEO.SIDE[side];
    const tr = trainOf(side);
    // stator disc with a quarter scale: the four stages, the loop's start in hi
    {
      let out = halo(K.cylinder(cx, cy, GEO.DISC_R + 1, 0, 0.1, P, 72).fill, 4);
      out += S(K.cylinder(cx, cy, GEO.DISC_R, 0, GEO.DISC_H, P, 96, 0.6), { tone: "mid", inner: L(K.sideArc(cx, cy, GEO.DISC_R, 1.2, P, 48), { tone: "faint" }) });
      const minor = [], major = [], zero = [];
      for (let a = 0; a < 360; a += 7.5) {
        const big = a % 90 === 0;
        const d = K.lineOnTop(polar(cx, cy, GEO.DISC_R - 0.4, a), polar(cx, cy, GEO.DISC_R - 0.4 - (big ? 5 : 2.2), a), GEO.DISC_H, P);
        (a === 0 ? zero : big ? major : minor).push(d);
      }
      out += L(minor.join(""), { tone: "lo" }) + L(major.join(""), { tone: "mid" }) + L(zero.join(""), { tone: "hi" });
      out += L(K.ring(cx, cy, 48, GEO.DISC_H, P, 96), { tone: "faint" });
      out += L([90, 180, 270].map((a) => K.lineOnTop(polar(cx, cy, 48, a), polar(cx, cy, GEO.DISC_R - 5.4, a), GEO.DISC_H, P)).join(""), { tone: "lo" });
      out += L(K.lineOnTop(polar(cx, cy, 48, 0), polar(cx, cy, GEO.DISC_R - 5.4, 0), GEO.DISC_H, P), { tone: "hi" });
      put(depth(cx, cy) - 300, out);
      // the column the wheel turns on (mostly hidden under it)
      put(depth(cx, cy) - 250, S(K.cylinder(cx, cy, 9, GEO.DISC_H, GEO.GZ - GEO.DISC_H, P, 32), { tone: "mid", crease: "none" }));
    }
    // idler post standing on the disc, and the shaft from it to the differential
    {
      const { x, y } = tr.idler;
      put(depth(x, y) - 2, S(K.cylinder(x, y, 5.4, GEO.DISC_H, 1.4, P, 28), { tone: "lo" }) +
        S(K.cylinder(x, y, 3.6, GEO.DISC_H + 1.4, GEO.GZ - GEO.DISC_H - 1.4, P, 24), { tone: "mid", crease: "none" }));
      const sx0 = side === "blue" ? x + 3.6 : GEO.DIFF.x + GEO.DIFF.w;
      const sx1 = side === "blue" ? GEO.DIFF.x : x - 3.6;
      const shaft = { x: sx0, y: y - 1.5, w: sx1 - sx0, d: 3, r: 1.3 };
      put(depth((sx0 + sx1) / 2, y) , S(K.slabOf(shaft, 5, 3, P, 3), { tone: "mid", crease: "none" }));
      // pillow block carrying the shaft midway
      const bx = (sx0 + sx1) / 2;
      put(depth(bx, y) + 0.5, S(K.slabOf({ x: bx - 3, y: y - 4.5, w: 6, d: 9, r: 1 }, GEO.DISC_H, 6.2, P, 3, 0.4), { tone: "mid" }) +
        S(K.slabOf({ x: bx - 3.4, y: y - 2.4, w: 6.8, d: 4.8, r: 1.4 }, 8.6, 1.4, P, 3), { tone: "mid", crease: "none" }) +
        K.dotsSvg([at([bx, y - 3.4, 8.6]), at([bx, y + 3.4, 8.6])], { size: 0.42 }));
    }
    // motor under the pinion, with cooling bands and a terminal box
    {
      const { x, y } = tr.pinion;
      const out = halo(K.cylinder(x, y, 10, 0, 0.1, P, 32).fill) +
        S(K.cylinder(x, y, 9.6, 0, 1.6, P, 36), { tone: "lo" }) +
        S(K.cylinder(x, y, 8.4, 1.6, GEO.GZ - 1.6, P, 36, 0.5), {
          tone: "mid",
          inner: L([3.6, 5.4, 7.2].map((z) => K.sideArc(x, y, 8.4, z, P, 24)).join(""), { tone: "faint" }),
        });
      const ox = side === "blue" ? -1 : 1;
      const box = { x: x + (ox < 0 ? -15 : 7.6), y: y - 3.5, w: 7.4, d: 7, r: 1 };
      const boxSvg = S(K.slabOf(box, 1.6, 6, P, 3, 0.4), { tone: "mid" }) + K.dotsSvg([at([box.x + 1.6, box.y + 1.6, 7.6]), at([box.x + box.w - 1.6, box.y + box.d - 1.6, 7.6])], { size: 0.4 });
      put(depth(x, y) - 1, side === "blue" ? boxSvg + out : out + boxSvg);
    }
    // tally rack: a bar with eight pin holes
    {
      const rack = { x: cx - 28, y: GEO.RACK_Y, w: 56, d: 12, r: 2 };
      let out = halo(K.haloOf(rack, 0, 0.1, P));
      out += S(K.slabOf(rack, 0, 4, P, 4, 0.5), { tone: "mid", inner: L(K.sideSeam(rack, 2, P, 4), { tone: "faint" }) });
      const holes = [];
      for (let i = 0; i < 8; i++) holes.push(K.ring(cx - 21 + 6 * i, GEO.RACK_Y + 6, 2.3, 4, P, 18));
      out += L(holes.join(""), { tone: "lo" });
      out += K.dotsSvg([[rack.x + 3, rack.y + 3], [rack.x + 3, rack.y + 9], [rack.x + rack.w - 3, rack.y + 3], [rack.x + rack.w - 3, rack.y + 9]].map(([px, py]) => at([px, py, 4])), { size: 0.45 });
      put(depth(cx, GEO.RACK_Y + 6) - 1, out);
    }
    // lever quadrant: a sector plate with five detents (2, 4, 6, 8, 10 h)
    {
      const px = cx + (side === "blue" ? -54 : 54), py = 84;
      const [a0, a1] = GEO.LEVER_SPAN;
      const fan = [[px, py]];
      for (let a = a0; a <= a1 + 1e-9; a += 5) fan.push(polar(px, py, GEO.LEVER_R + 3, a));
      let out = halo(K.extrude(fan, 0, 0.1, P).fill);
      out += S(K.extrude(fan, 0, 2.4, P, { bevel: 0.4 }), { tone: "mid" });
      const det = [];
      for (let i = 0; i < 5; i++) {
        const a = a0 + (i / 4) * (a1 - a0);
        det.push(K.lineOnTop(polar(px, py, GEO.LEVER_R + 2.6, a), polar(px, py, GEO.LEVER_R - 1.2, a), 2.4, P));
      }
      out += L(det.join(""), { tone: "mid" });
      out += L(K.onTop(Array.from({ length: 29 }, (_, i) => polar(px, py, GEO.LEVER_R + 1.2, a0 + 5 * i)), 2.4, P), { tone: "faint" });
      out += S(K.cylinder(px, py, 3.6, 2.4, 2.4, P, 24), { tone: "mid" });
      put(depth(px, py) - 1, out);
    }
  }

  // the lap differential: a housing between the two trains, a dial on a stem
  {
    const D = GEO.DIFF, DL = GEO.DIAL;
    let out = halo(K.haloOf(D, 0, 0.1, P));
    out += S(K.slabOf(D, 0, D.h, P, 4, 0.8), { tone: "mid", inner: L(K.sideSeam(D, 4, P, 4), { tone: "faint" }) });
    const cover = { x: D.x + 4, y: D.y + 3, w: D.w - 8, d: D.d - 6, r: 1.5 };
    out += S(K.slabOf(cover, D.h, 1, P, 3, 0.3), { tone: "mid" });
    out += K.dotsSvg(K.corners(cover, 1.8).map(([x, y]) => at([x, y, D.h + 1])), { size: 0.42 });
    // dial stem, puck, bezel, ticks
    out += S(K.cylinder(DL.x, DL.y, 5, D.h + 1, 2, P, 24), { tone: "mid" });
    out += S(K.cylinder(DL.x, DL.y, 2.8, D.h + 3, DL.z - D.h - 3, P, 20), { tone: "mid", crease: "none" });
    out += S(K.cylinder(DL.x, DL.y, DL.r, DL.z, DL.h, P, 64, 0.8), { tone: "hi", crease: "lo" });
    out += L(K.knurl(DL.x, DL.y, DL.r, DL.top - 2.8, DL.top, 60, P, 0.3), { tone: "lo" });
    out += L(K.sideArc(DL.x, DL.y, DL.r, DL.top - 2.8, P, 40), { tone: "faint" });
    out += L(K.ring(DL.x, DL.y, DL.r - 1.8, DL.top, P, 64), { tone: "lo" });
    const t = K.radialTicks(DL.x, DL.y, DL.r - 1.8, 32, 4, DL.top, [1, 2.2], P);
    out += L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
    out += K.faceTextSvg(K.topMatrix([DL.x - 2.6, DL.y + 5.6], DL.top, P, "x"), "LAPS", { size: 1.9, tone: "lo", anchor: "middle" });
    put(depth(D.x + D.w / 2, D.y + D.d / 2), out);
  }

  // label plate, front centre
  {
    const LB = { x: -18, y: 74, w: 36, d: 16, r: 1.5 };
    let out = S(K.slabOf(LB, 0, 0.8, P, 4), { tone: "lo", crease: "none" });
    out += L(K.planOutline(K.insetPlan(LB, 1.6), 0.8, P), { tone: "faint" });
    [[24, 5], [16, 8.5], [20, 12]].forEach(([len, dy]) => (out += L(K.lineOnTop([LB.x + 6, LB.y + dy], [LB.x + 6 + len, LB.y + dy], 0.8, P), { tone: "lo", free: true })));
    out += K.dotsSvg([at([LB.x + 2.8, LB.y + 2.8, 0.8]), at([LB.x + LB.w - 2.8, LB.y + LB.d - 2.8, 0.8])], { size: 0.42 });
    put(depth(0, 82), out);
  }
  return items;
}

// S: { blue: { theta, T, pins: [h...], lit }, red: {...}, diff: turns (blue minus red) }
export function scene(K, P, S, st) {
  const items = st.slice();
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const frame = (ox, oy, ang) => {
    const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
    return (u, v) => [ox + u * c - v * s, oy + u * s + v * c];
  };
  const box = (F, u0, u1, v0, v1, z0, h, bevel = 0) => K.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z0, h, P, { bevel });
  const polar = (cx, cy, r, deg) => [cx + r * Math.cos(deg * SC_RAD), cy + r * Math.sin(deg * SC_RAD)];
  const gear = (cx, cy, R, n, ang) => {
    const m = GEO.MOD, p = 360 / n, rt = R + m, rr = R - 1.25 * m, pts = [];
    for (let k = 0; k < n; k++) {
      const c = ang + k * p;
      pts.push(polar(cx, cy, rr, c - 0.5 * p), polar(cx, cy, rr, c - 0.3 * p), polar(cx, cy, rt, c - 0.13 * p), polar(cx, cy, rt, c + 0.13 * p), polar(cx, cy, rr, c + 0.3 * p));
    }
    return K.extrude(pts, GEO.GZ, GEO.GH, P, { convex: false });
  };
  const top = GEO.GZ + GEO.GH;

  for (const side of ["blue", "red"]) {
    const s = S[side];
    const { x: cx, y: cy } = GEO.SIDE[side];
    const tr = trainOf(side);
    const ang = gearAngles(s.theta);
    const base = depth(cx, cy);

    // ---- the loop wheel: gear, spoke windows, hub, rider ----
    {
      let out = solid(gear(cx, cy, GEO.R.wheel, GEO.N.wheel, ang.wheel), { tone: "mid" });
      const win = [];
      for (let k = 0; k < 4; k++) {
        const a0 = ang.wheel + 90 * k + 14, a1 = a0 + 62, pts = [];
        for (let a = a0; a <= a1 + 1e-9; a += 4) pts.push(polar(cx, cy, 31, a));
        for (let a = a1; a >= a0 - 1e-9; a -= 4) pts.push(polar(cx, cy, 17, a));
        win.push(K.onTop(pts, top, P, true));
      }
      out += line(win.join(""), { tone: "lo" });
      out += line(K.ring(cx, cy, 36, top, P, 96), { tone: "faint" });
      out += solid(K.cylinder(cx, cy, 8.5, top, 3, P, 36, 0.5), { tone: "mid" });
      out += line(K.knurl(cx, cy, 8.5, top, top + 3, 40, P), { tone: "lo" });
      out += solid(K.cylinder(cx, cy, 4, top + 3, 1.4, P, 24), { tone: "mid" });
      out += K.dotsSvg([0, 90, 180, 270].map((a) => at([...polar(cx, cy, 6.4, ang.wheel + a + 45), top + 3])), { size: 0.4 });
      put(base, out);
      // rider: the cam block that trips each station as it passes
      const F = frame(cx, cy, s.theta);
      const rider = [[33, -3.6], [41.6, -8.4], [44.6, -6.6], [44.6, 3], [42.6, 5], [33, 3.6]];
      put(base + 0.1, solid(K.extrude(rider.map(([u, v]) => F(u, v)), top, 3, P, { bevel: 0.4 }), { tone: "hi", lit: s.lit, crease: "lo" }) +
        line(K.onTop([F(33, 0), F(44.6, 0)], top + 3, P), { tone: s.lit ? "lit" : "mid" }) +
        K.dotsSvg([at([...F(35.4, 0), top + 3])], { size: 0.45 }));
    }

    // ---- idler and pinion ----
    {
      const I = tr.idler;
      put(depth(I.x, I.y), solid(gear(I.x, I.y, GEO.R.idler, GEO.N.idler, ang.idler), { tone: "mid" }) +
        line(K.ring(I.x, I.y, 12, top, P, 48), { tone: "faint" }) +
        solid(K.cylinder(I.x, I.y, 4.6, top, 2, P, 24, 0.4), { tone: "mid" }) +
        K.dotsSvg([0, 120, 240].map((a) => at([...polar(I.x, I.y, 8.2, ang.idler + a), top])), { size: 0.42 }));
      const Pn = tr.pinion;
      const pa = ang.pinion(GEO.SIDE[side].drive + 180);
      put(depth(Pn.x, Pn.y), solid(gear(Pn.x, Pn.y, GEO.R.pinion, GEO.N.pinion, pa), { tone: "mid" }) +
        solid(K.cylinder(Pn.x, Pn.y, 3.4, top, 1.6, P, 20, 0.3), { tone: "mid" }) +
        K.dotsSvg([at([...polar(Pn.x, Pn.y, 6, pa), top])], { size: 0.42 }));
    }

    // ---- the four stations ----
    const [vx, vy] = K.towardViewer(P);
    GEO.STATIONS.forEach((sa, k) => {
      const F = frame(cx, cy, sa);
      const d = Math.abs((((s.theta - sa) % 360) + 540) % 360 - 180);
      const act = ss(1 - d / 16);
      const lift = 3.2 * act;
      const front = Math.cos(sa * SC_RAD) * vx + Math.sin(sa * SC_RAD) * vy > 0;
      const [sx, sy] = F(57, 0);
      let body = solid(box(F, 49, 65, -8, 8, GEO.DISC_H, 3, 0.5), { tone: "mid" });
      body += K.dotsSvg([F(51, -6), F(51, 6), F(63, 6)].map(([x, y]) => at([x, y, GEO.DISC_H + 3])), { size: 0.42 });
      const pz = GEO.DISC_H + 3;
      const th = ((s.theta % 360) + 360) % 360;
      const [ux, uy] = F(55, 2);
      let device = "";
      if (k === 0) {
        // observe: a periscope that swings its head as the rider passes
        const H = frame(ux, uy, sa + 180 + 34 * act);
        device += solid(K.cylinder(ux, uy, 3.8, pz, 1.4, P, 24, 0.3), { tone: "mid" });
        device += solid(K.cylinder(ux, uy, 2.2, pz + 1.4, 8.4, P, 20), { tone: "mid", crease: "none", inner: line(K.sideArc(ux, uy, 2.2, pz + 5.2, P, 12), { tone: "faint" }) });
        device += solid(box(H, -2.8, 4.4, -2.8, 2.8, pz + 9.8, 4.6, 0.4), { tone: "hi", crease: "lo" });
        device += solid(box(H, 4.4, 5.8, -2, 2, pz + 10.6, 3, 0.2), { tone: "mid" });
      } else if (k === 1) {
        // orient: a compass card whose pointer swings as the rider passes
        device += solid(K.cylinder(ux, uy, 5.6, pz, 1.4, P, 40, 0.3), { tone: "mid" });
        device += solid(K.cylinder(ux, uy, 5, pz + 1.4, 2.6, P, 40, 0.5), { tone: "hi", crease: "lo" });
        const t = K.radialTicks(ux, uy, 4.4, 16, 4, pz + 4, [0.8, 1.6], P);
        device += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
        const pa = (sa + 180 + 120 * act) * SC_RAD;
        device += line(K.lineOnTop([ux - 1.4 * Math.cos(pa), uy - 1.4 * Math.sin(pa)], [ux + 3.8 * Math.cos(pa), uy + 3.8 * Math.sin(pa)], pz + 4.05, P), { tone: "hi", free: true });
        device += line(K.ring(ux, uy, 0.9, pz + 4, P, 12), { tone: "mid" });
      } else if (k === 2) {
        // decide: a two-way slide switch, thrown as the rider passes, reset while observing
        const pos = th < 40 ? 1 - ss(th / 40) : th < 210 ? 0 : ss((th - 210) / 30);
        const dz = pz + 8.6;
        device += solid(box(F, 50.5, 59.5, -3.6, 7.6, pz, 8.6, 0.4), { tone: "mid", inner: line(K.ringSeam([F(50.5, -3.6), F(59.5, -3.6), F(59.5, 7.6), F(50.5, 7.6)], pz + 2.2, P), { tone: "faint" }) });
        const slot = [];
        for (let i = 0; i <= 12; i++) { const a = -90 + 15 * i; slot.push(F(55 + 1 * Math.cos(a * SC_RAD), 5.4 + 1 * Math.sin(a * SC_RAD))); }
        for (let i = 0; i <= 12; i++) { const a = 90 + 15 * i; slot.push(F(55 + 1 * Math.cos(a * SC_RAD), -1.4 + 1 * Math.sin(a * SC_RAD))); }
        device += line(K.onTop(slot, dz, P, true), { tone: "lo" });
        device += K.dotsSvg([F(51.7, -2.4), F(58.3, 6.4)].map(([x, y]) => at([x, y, dz])), { size: 0.38 });
        const [kx, ky] = F(55, -1.4 + 6.8 * pos);
        device += solid(K.cylinder(kx, ky, 0.8, dz, 1.8, P, 12), { tone: "mid", crease: "none" });
        device += solid(K.cylinder(kx, ky, 1.9, dz + 1.8, 1.8, P, 18, 0.2), { tone: "hi", crease: "lo" });
      } else {
        // act: a drop hammer on a guide column, raised through the act quarter, dropped as the loop ends
        const raise = th >= 270 && th < 348 ? ss((th - 270) / 70) : th >= 348 ? 1 - ss((th - 348) / 12) : 0;
        const [gx, gy] = F(60, 2);
        const hz = pz + 3 + 6.5 * raise;
        device += solid(box(F, 49.8, 58.2, -2.2, 6.2, pz, 1.8, 0.3), { tone: "lo" });
        device += solid(box(F, 50.8, 56.8, -1, 5, pz + 1.8, 0.8), { tone: "hi", crease: "lo" });
        device += solid(K.cylinder(gx, gy, 2.2, pz, 1.2, P, 18), { tone: "mid" });
        device += solid(K.cylinder(gx, gy, 1, pz + 1.2, hz + 0.6 - pz - 1.2, P, 12), { tone: "mid", crease: "none" });
        device += solid(box(F, 50.8, 56.8, -1, 5, hz, 4, 0.4), { tone: "hi", crease: "lo" });
        device += solid(box(F, 56.8, 61.8, 0.2, 3.8, hz + 0.6, 2.8, 0.2), { tone: "mid" });
        device += solid(K.cylinder(gx, gy, 1, hz + 3.4, pz + 17 - hz - 3.4, P, 12), { tone: "mid", crease: "none" });
        device += solid(K.cylinder(gx, gy, 1.6, pz + 17, 1, P, 14), { tone: "mid" });
      }
      // post and follower: the arm reaches over the wheel rim, its roller rides the rider
      const post = solid(box(F, 60.4, 64, -7.6, -4.4, pz, 15.6, 0.3), { tone: "mid" });
      const az = pz + 15.6;
      const [rx, ry] = F(43.4, -6);
      const arm = solid(K.cylinder(rx, ry, 1.5, top + 0.8 + lift, az - top - 0.8, P, 16), { tone: "mid", crease: "none" }) +
        solid(box(F, 42, 64, -7.2, -4.8, az + lift * 0.15, 1.6, 0.2), { tone: "mid" }) +
        K.dotsSvg([at([...F(62.2, -6), az + 1.6 + lift * 0.15])], { size: 0.42 });
      const devKey = depth(sx, sy);
      if (front) put(devKey, body + post + device + arm);
      else { put(devKey, body + device + post); put(base + 0.2, arm); }
    });

    // ---- tally pins: last eight actions, newest at the inner end; up = stale ----
    s.pins.forEach((h, i) => {
      const slot = side === "blue" ? 7 - i : i;
      const px = cx - 21 + 6 * slot, py = GEO.RACK_Y + 6;
      put(depth(px, py) + 50, solid(K.cylinder(px, py, 1.8, 4, 0.8 + 7.2 * h, P, 18, 0.3), { tone: h > 0.5 ? "hi" : "mid", crease: h > 0.5 ? "lo" : "faint" }));
    });

    // ---- tempo lever ----
    {
      const px = cx + (side === "blue" ? -54 : 54), py = 84;
      const [a0, a1] = GEO.LEVER_SPAN;
      const f = (s.T - 2) / 8;
      const la = side === "blue" ? a1 - f * (a1 - a0) : a0 + f * (a1 - a0);
      const F = frame(px, py, la);
      const [kx, ky] = F(GEO.LEVER_R - 1, 0);
      put(depth(px, py) + 1,
        solid(box(F, 0, GEO.LEVER_R + 0.6, -1.3, 1.3, 4.8, 1.6, 0.2), { tone: "mid" }) +
        solid(K.cylinder(px, py, 2, 6.4, 1, P, 16), { tone: "mid" }) +
        solid(K.cylinder(kx, ky, 2.6, 6.4, 4.6, P, 24, 0.3), { tone: "hi", crease: "lo" }) +
        line(K.knurl(kx, ky, 2.6, 6.4, 11, 22, P), { tone: "lo" }));
    }
  }

  // ---- differential needles: one turn per lap gained; the short hand per eight laps ----
  {
    const DL = GEO.DIAL;
    const hand = (turns, len, tail) => {
      const a = turns * 2 * Math.PI;
      const sx = Math.sin(a), sy = -Math.cos(a);
      return K.lineOnTop([DL.x - sx * tail, DL.y - sy * tail], [DL.x + sx * len, DL.y + sy * len], DL.top + 0.2, P);
    };
    const key = depth(GEO.DIFF.x + GEO.DIFF.w / 2, GEO.DIFF.y + GEO.DIFF.d / 2) + 0.1;
    put(key,
      `<path class="iso-line" data-tone="hi" data-free="" d="${hand(S.diff / 8, DL.r - 6, 1.6)}" style="stroke-width:1.4"/>` +
      `<path class="iso-line" data-tone="hi" data-free="" d="${hand(S.diff, DL.r - 3, 2.4)}" style="stroke-width:0.9"/>` +
      line(K.ring(DL.x, DL.y, 1.2, DL.top, P, 14), { tone: "mid" }));
  }

  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}
