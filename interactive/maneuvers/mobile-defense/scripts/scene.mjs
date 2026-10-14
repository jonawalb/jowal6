// The machine view of the mobile-defense trap: every part that moves (the enemy carriage,
// the sprung fixing stop, the striking arm and its latch, the split slider, the preload
// knob, the gauge needle) plus the standing fixtures that must sort against them.
// Geometry only: the state comes from model.mjs (runAt), so a second view can reuse it.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page (inlined
// kit) run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  X_MOUTH: -96,      // enemy front at p = 0
  X_STOP: 62,        // enemy front against the fixing stop (p = 1)
  X_DEEP: 121.5,     // enemy front at the end of an overrun
  CAR_L: 30,         // enemy carriage length
  STOP_TOP: 17,      // fixing stop top when up
  HOUSING: 4.5,      // fixing stop housing top
  PV: [23.5, 50],    // striking arm pivot
  ARM_Z: 19,         // underside of the arm beam
  HEAD_U: [48, 60],  // head along the arm
  POST: [28.1, 26],  // arm stop post (catches the beam side at full swing)
  LATCH: [-30.5, 63],
  CHEEK: { x: 58, y: 15, w: 18, d: 10, r: 1.4 },
  SLIDER: { x0: -132, x1: -48, y: 72.5 },
  DIAL: { x: 102, y: 58, r: 16, z: 22, h: 7 },
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;

const SC_RAD = Math.PI / 180;

// Enemy front x for progress p (overrunTo is the model's end of an overrun).
export function frontAt(p, overrunTo) {
  if (p <= 1) return GEO.X_MOUTH + p * (GEO.X_STOP - GEO.X_MOUTH);
  return GEO.X_STOP + ((p - 1) / (overrunTo - 1)) * (GEO.X_DEEP - GEO.X_STOP);
}
export const sliderX = (s, split) => GEO.SLIDER.x0 + ((s - split[0]) / (split[1] - split[0])) * (GEO.SLIDER.x1 - GEO.SLIDER.x0);

function kit(K, P) {
  const at = (p) => K.iso(p, P);
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map((p) => at(p)), { size });
  const frame = (ox, oy, ang) => {
    const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
    return (u, v) => [ox + u * c - v * s, oy + u * s + v * c];
  };
  const box = (F, u0, u1, v0, v1, z0, h, bevel = 0) =>
    K.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z0, h, P, { bevel });
  const slab = (plan, z, h, steps = 3, bevel = 0) => K.slabOf(plan, z, h, P, steps, bevel);
  const halo = (paths, blur = 3) => `<path class="iso-halo" d="${paths.fill}" style="filter:blur(${blur}px)"/>`;
  return { at, depth, solid, line, dots, frame, box, slab, halo };
}

// Standing parts that moving parts pass in front of or behind. Built once.
export function fixtures(K, P) {
  const { at, depth, solid, line, dots, slab, halo } = kit(K, P);
  const items = [];
  const put = (key, svg) => items.push({ key, svg });

  // Guide walls (fixing force: canalize the enemy into the pocket), bolted sections.
  const wallY = (x) => 36 + ((x + 128) / 84) * (15 - 36);
  for (const side of [1, -1]) {
    const cuts = [-128, -100, -72, -44];
    for (let i = 0; i < 3; i++) {
      const a = cuts[i], b = cuts[i + 1];
      const ring = [[a, side * wallY(a)], [b, side * wallY(b)], [b, side * (wallY(b) + 5.5)], [a, side * (wallY(a) + 5.5)]];
      const cx = (a + b) / 2, cy = side * (wallY(cx) + 2.75);
      const tabX = cx, tabY = side * (wallY(cx) + 5.5 + 3.2);
      let svg = solid(K.extrude(ring, 0, 9, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" });
      // a bolt-down tab on the outside of each section
      svg = solid(slab({ x: tabX - 3.4, y: tabY - 3, w: 6.8, d: 6, r: 1 }, 0, 1.4, 3, 0.2), { tone: "mid", crease: "none" }) + svg;
      svg += dots([[tabX, tabY + side * 0.6, 1.4]], 0.45);
      put(depth(cx, cy), svg);
    }
    // bollard on the narrow end of each wall
    const by = side * (wallY(-44) + 2.75);
    put(depth(-44, by) + 0.5,
      solid(K.cylinder(-44, by, 3.4, 0, 1.4, P, 24), { tone: "mid" }) +
      solid(K.cylinder(-44, by, 2.7, 1.4, 10, P, 24, 0.3), { tone: "hi", crease: "lo", inner: line(K.sideArc(-44, by, 2.7, 9.2, P, 16), { tone: "faint" }) }) +
      dots([[-44, by, 11.4]], 0.4));
  }

  // Obstacle studs (fixing force) flanking the pocket, in two staggered rows a side.
  for (const [y0, x0, x1] of [[28, -36, -8], [-28, -36, 54]]) {
    for (let row = 0; row < 2; row++) {
      const y = y0 + Math.sign(y0) * row * 4.5;
      for (let x = x0 + row * 3.5; x <= x1; x += 7) {
        put(depth(x, y),
          solid(K.cylinder(x, y, 1.9, 0, 0.8, P, 16), { tone: "lo" }) +
          solid(K.cylinder(x, y, 1.3, 0.8, 3.2, P, 14, 0.3), { tone: "mid" }));
      }
    }
  }

  // End stops across the rails.
  for (const x of [-146, 123]) {
    put(depth(x + 2, 0),
      solid(slab({ x, y: -15, w: 4, d: 30, r: 1 }, 0, 7.5, 3, 0.4), { tone: "mid" }) +
      dots([[x + 2, -11, 7.5], [x + 2, 11, 7.5]], 0.45));
  }

  // Stop post that catches the arm at full swing, with a rubber pad.
  {
    const [x, y] = GEO.POST;
    put(depth(x, y),
      solid(K.cylinder(x, y, 3.8, 0, 1.6, P, 24), { tone: "mid" }) +
      solid(K.cylinder(x, y, 2.2, 1.6, 16.4, P, 20), { tone: "mid", crease: "none", inner: line(K.sideArc(x, y, 2.2, 9, P, 14), { tone: "faint" }) }) +
      solid(K.cylinder(x, y, 2.3, 18, 4.6, P, 20, 0.3), { tone: "lo" }) +
      dots([[x + 2.9, y, 1.6], [x - 2.9, y, 1.6]], 0.4));
  }

  // Dial gauge: striking force over the enemy power it would meet.
  {
    const D = GEO.DIAL;
    const ped = { x: D.x - 13, y: D.y - 13, w: 26, d: 26, r: 3 };
    let g = `<path class="iso-halo" d="${K.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    g += solid(slab(ped, 0, 5, 5, 0.6), { tone: "mid" });
    g += line(K.planOutline(K.insetPlan(ped, 3), 5, P), { tone: "faint" });
    g += K.dotsSvg(K.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 });
    g += solid(K.cylinder(D.x, D.y, 5.6, 5, 2.4, P, 28), { tone: "mid" });
    g += solid(K.cylinder(D.x, D.y, 3.4, 7.4, D.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: line(K.sideArc(D.x, D.y, 3.4, 14, P, 16), { tone: "faint" }) });
    g += solid(K.cylinder(D.x, D.y, D.r, D.z, D.h, P, 72, 0.8), { tone: "hi", crease: "lo" });
    g += line(K.knurl(D.x, D.y, D.r, D.top - 3.2, D.top, 70, P, 0.3), { tone: "lo" });
    g += line(K.sideArc(D.x, D.y, D.r, D.top - 3.2, P, 40), { tone: "faint" });
    g += line(K.ring(D.x, D.y, D.r - 2, D.top, P, 72), { tone: "lo" });
    const t = K.radialTicks(D.x, D.y, D.r - 2, 20, 5, D.top, [1.2, 2.6], P, -0.75 * Math.PI, 1.5 * Math.PI);
    g += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    // the 1.0 mark (striking force equal to the enemy) as the zero mark
    g += line(K.lineOnTop([D.x, D.y - (D.r - 2)], [D.x, D.y - (D.r - 2) + 3.4], D.top, P), { tone: "hi" });
    g += K.faceTextSvg(K.topMatrix([D.x - 3.2, D.y + 7.6], D.top, P, "x"), "S : E", { size: 2.2, tone: "lo", anchor: "middle" });
    g += `<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(K, P, D, 0.5)}" style="stroke-width:1.1"/>`;
    g += line(K.ring(D.x, D.y, 1.5, D.top, P, 16), { tone: "mid" });
    put(depth(D.x, D.y), `<g data-part="gauge">${g}</g>`);
  }
  return items;
}

// The moving parts for state S = { p, drop, arm, latch, s, split, overrunTo, ratio }.
export function scene(K, P, S, statics = []) {
  const { at, depth, solid, line, dots, frame, box, slab, halo } = kit(K, P);
  const items = [];
  const put = (key, svg) => items.push({ key, svg });

  // ---- fixing stop: a sprung block that rises out of its housing between the rails ----
  {
    const h = (GEO.STOP_TOP - GEO.HOUSING) * (1 - S.drop);
    if (h > 0.05) {
      const plan = { x: 62, y: -5, w: 8, d: 10, r: 0.8 };
      const top = GEO.HOUSING + h;
      let svg = solid(slab(plan, GEO.HOUSING, h, 2, 0.4), { tone: "hi", crease: "lo" });
      if (h > 3) svg += line(K.planOutline(K.insetPlan(plan, 1.6), top, P, 2), { tone: "faint" });
      svg += dots([[64, -2.6, top], [68, 2.6, top]], 0.4);
      // sunk below the enemy's belly once pushed down: draw it with the floor
      put(S.drop > 0.5 ? -1e4 : depth(66, 0, 2), svg);
    }
  }

  // ---- preload knob on the cheek block: its pointer reads the fixing force ----
  {
    const c = GEO.CHEEK, kx = c.x + c.w / 2, ky = c.y + c.d / 2;
    let svg = halo(slab({ ...c, x: c.x - 1, y: c.y - 1, w: c.w + 2, d: c.d + 2 }, 0, 0.1));
    svg += solid(slab(c, 0, 7, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(c, 3.5, P, 3), { tone: "faint" }) });
    svg += dots([[c.x + 2.2, c.y + 2.2, 7], [c.x + c.w - 2.2, c.y + 2.2, 7], [c.x + 2.2, c.y + c.d - 2.2, 7], [c.x + c.w - 2.2, c.y + c.d - 2.2, 7]], 0.4);
    const t = K.radialTicks(kx, ky, 4.6, 10, 5, 7, [0.8, 1.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
    svg += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    svg += solid(K.cylinder(kx, ky, 3, 7, 3, P, 22), { tone: "mid" }) + line(K.knurl(kx, ky, 3, 7, 10, 18, P), { tone: "lo" });
    const fix = 1 - S.s;
    const a = -0.75 * Math.PI + fix * 1.5 * Math.PI;
    svg += line(K.lineOnTop([kx, ky], [kx + Math.sin(a) * 2.5, ky - Math.cos(a) * 2.5], 10, P), { tone: "hi" }) + dots([[kx, ky, 10]], 0.4);
    put(depth(kx, ky), svg);
  }

  // ---- the enemy carriage on the rails ----
  {
    const X = frontAt(S.p, S.overrunTo), R = X - GEO.CAR_L;
    const cx = (X + R) / 2;
    let car = halo(slab({ x: R - 1, y: -12, w: GEO.CAR_L + 2, d: 24, r: 2 }, 4, 0.1));
    const shoes = [];
    for (const sx of [R + 2, X - 9]) for (const sy of [-12, 8]) shoes.push({ x: sx, y: sy, w: 7, d: 4, r: 0.8 });
    const shoe = (pl) => solid(slab(pl, 4, 3.5, 2, 0.3), { tone: "mid" });
    const near = (pl) => depth(pl.x + pl.w / 2, pl.y + pl.d / 2) > depth(cx, 0);
    car += shoes.filter((p) => !near(p)).map(shoe).join("");
    const body = { x: R, y: -10, w: GEO.CAR_L - 2, d: 20, r: 2 };
    car += solid(slab(body, 7.5, 6, 3, 0.5), { tone: "hi", crease: "lo", inner: line(K.sideSeam(body, 10.5, P, 3), { tone: "faint" }) });
    car += shoes.filter(near).map(shoe).join("");
    car += dots([[R + 2.4, -7.6, 13.5], [X - 4.4, -7.6, 13.5], [R + 2.4, 7.6, 13.5], [X - 4.4, 7.6, 13.5]], 0.42);
    // bumper bar: the face that meets the fixing stop
    car += solid(slab({ x: X - 2, y: -8, w: 2, d: 16, r: 0.6 }, 8.5, 4, 2), { tone: "hi", crease: "lo" });
    // deck block, hatch and a tow eye at the rear
    const deck = { x: R + 5, y: -6.5, w: 15, d: 13, r: 1.4 };
    car += solid(slab(deck, 13.5, 5, 3, 0.5), { tone: "hi", crease: "lo" });
    car += line(K.planOutline(K.insetPlan(deck, 2), 18.5, P, 3), { tone: "faint" });
    car += solid(K.cylinder(R + 12.5, 0, 2.8, 18.5, 1.6, P, 20), { tone: "mid" }) + line(K.knurl(R + 12.5, 0, 2.8, 18.5, 20.1, 16, P, 0.25), { tone: "lo" });
    car += solid(slab({ x: R - 2.2, y: -2, w: 2.2, d: 4, r: 0.6 }, 9, 2.6, 2), { tone: "mid", crease: "none" });
    put(depth(cx, 0), car);
  }

  // ---- striking arm: pivot, torsion spring, beam and the lit head ----
  let armKey = 0;
  {
    const [px, py] = GEO.PV;
    const phi = 180 + 90 * S.arm;
    const F = frame(px, py, phi);
    const Z = GEO.ARM_Z;
    let arm = "";
    // pivot base, boss and torsion spring (round, so they never change)
    const base = { x: px - 12, y: py - 12, w: 24, d: 24, r: 2.4 };
    arm += halo(slab({ ...base, x: base.x - 1, y: base.y - 1, w: 26, d: 26 }, 0, 0.1));
    arm += solid(slab(base, 0, 2.5, 3, 0.4), { tone: "mid" });
    arm += line(K.planOutline(K.insetPlan(base, 2.4), 2.5, P, 3), { tone: "faint" });
    arm += dots(K.corners(base, 3.4).map(([x, y]) => [x, y, 2.5]), 0.45);
    arm += solid(K.cylinder(px, py, 6.5, 2.5, 4.5, P, 32, 0.4), { tone: "mid" });
    let coils = "";
    for (let z = 8.4; z < 17; z += 1.5) coils += K.sideArc(px, py, 5, z, P, 20);
    arm += solid(K.cylinder(px, py, 5, 7, 10.5, P, 32), { tone: "mid", crease: "none", inner: line(coils, { tone: "lo" }) });
    arm += solid(K.cylinder(px, py, 6.6, 17.5, 1.5, P, 32, 0.3), { tone: "mid" });
    // the beam, hub and nut
    arm += solid(box(F, -4, 50, -2.2, 2.2, Z, 3.5, 0.3), { tone: "hi", lit: true, crease: "lo" });
    arm += line(K.onTop([F(-5, 0), F(48, 0)], Z + 3.5, P), { tone: "lit" });
    arm += solid(K.cylinder(px, py, 6, Z, 3.5, P, 32, 0.4), { tone: "hi", lit: true, crease: "lo" });
    arm += solid(K.cylinder(px, py, 2.6, Z + 3.5, 2, P, 6), { tone: "mid" });
    // the head: a hammer block with a pad on its striking face
    const [u0, u1] = GEO.HEAD_U;
    // the striking face carries a pad; it is drawn before the head when it faces away
    const [vx, vy] = K.towardViewer(P);
    const padNear = -Math.sin(phi * SC_RAD) * vx + Math.cos(phi * SC_RAD) * vy > 0;
    const pad = solid(box(F, u0 + 1.5, u1 - 1.5, 6.5, 7.6, 11.5, 10.5, 0.2), { tone: "lo" });
    const ring = [F(u0, -6.5), F(u1, -6.5), F(u1, 6.5), F(u0, 6.5)];
    let head = padNear ? "" : pad;
    head += solid(K.extrude(ring, 10, 13.5, P, { bevel: 0.5 }), { tone: "hi", lit: true, crease: "lo", inner: line(K.ringSeam(ring, 17, P), { tone: "faint" }) });
    head += padNear ? pad : "";
    // a bolted cap plate on top
    head += solid(box(F, u0 + 2, u1 - 2, -4.5, 4.5, 23.5, 1.4, 0.3), { tone: "hi", crease: "lo" });
    head += dots([[...F(u0 + 3.6, -3), 24.9], [...F(u1 - 3.6, -3), 24.9], [...F(u0 + 3.6, 3), 24.9], [...F(u1 - 3.6, 3), 24.9]], 0.42);
    // one item, head last: the beam end runs under the head's top
    const [bx, by] = F(40, 0);
    armKey = S.arm > 0.5 ? depth(bx, by) : depth(px, py);
    put(armKey, arm + head);
  }

  // ---- latch: post with a pawl that holds the head until the commit ----
  {
    const [lx, ly] = GEO.LATCH;
    const back = 9 * S.latch;
    let svg = solid(K.cylinder(lx, ly, 4, 0, 1.6, P, 24), { tone: "mid" });
    svg += solid(K.cylinder(lx, ly, 2.6, 1.6, 26.4, P, 22), { tone: "mid", crease: "none", inner: line(K.sideArc(lx, ly, 2.6, 12, P, 14), { tone: "faint" }) });
    svg += solid(slab({ x: lx - 1.6, y: ly - 13 + back, w: 3.2, d: 13, r: 0.6 }, 25, 2, 2), { tone: "mid" });
    svg += solid(K.cylinder(lx, ly, 3.2, 28, 3, P, 22), { tone: "mid" }) + line(K.knurl(lx, ly, 3.2, 28, 31, 18, P), { tone: "lo" });
    // while the arm is cocked the pawl rests on the head, so it draws after the arm
    put(S.arm < 0.5 ? Math.max(depth(lx, ly), armKey + 0.1) : depth(lx, ly), svg);
  }

  // ---- split slider: the carriage's pointer reads the striking share ----
  {
    const sx = sliderX(S.s, S.split), y = GEO.SLIDER.y;
    let svg = solid(slab({ x: sx - 4.5, y: y - 2, w: 9, d: 7, r: 1 }, 1.2, 3, 3, 0.3), { tone: "mid" });
    svg += solid(K.extrude([[sx, y - 4.6], [sx + 2.4, y - 2], [sx - 2.4, y - 2]], 1.2, 1, P), { tone: "hi", crease: "none" });
    svg += solid(K.cylinder(sx, y + 1.5, 2.2, 4.2, 3, P, 20), { tone: "mid" }) + line(K.knurl(sx, y + 1.5, 2.2, 4.2, 7.2, 14, P, 0.25), { tone: "lo" });
    put(depth(sx, y), svg);
  }

  for (const st of statics) put(st.key, st.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The dial needle for a share f in 0..1 of the 270 degree sweep (ratio 0 to 2).
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
