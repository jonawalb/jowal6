// The machine: a bench press over a lit target block. Rebuilt per frame from the state, depth-sorted.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page (inlined kit) run the
// same code. build.mjs inlines this file with `export` stripped.
//   V.hR    height of the ram pad's underside (world z)
//   V.hB    height of the block's top
//   V.lock  0..1, the ram's pawl in the rack (the press holds without fire)
//   V.crack 0..1, the block broken (destroyed)
//   V.spin  handwheel angle, degrees (turns while the drive is on: rounds landing)
//   V.level "S" | "N" | "D", the detent the stop pin is set to
//   V.rounds, V.t  for the two dials
export const GEO = {
  COL_X: 34, COL_R: 4.2, TOP: 100,            // columns and the crown's underside
  BLOCK: 10, BLOCK_H: 12, UP: 36, TRAVEL: 14,   // half-width, height, top when free, full stroke
  GAP: 12,                                     // pad clearance above the free block
  RAM_H: 9,
  DETENT: { S: 0.5, N: 0.75, D: 1 },           // stroke share of each detent
  RACK: { x: 31.5, y: 9, w: 5, d: 2.6 },
  DIAL_R: { x: 70, y: 56, r: 14, z: 18, h: 6 },  // rounds counter
  DIAL_T: { x: 72, y: 16, r: 14, z: 18, h: 6 },   // mission clock
  ROUNDS_MAX: 70, CLOCK_MAX: 8,
};
GEO.hAt = (d) => GEO.UP - GEO.TRAVEL * d;      // pad / block top height at stroke share d

const SC_RAD = Math.PI / 180;

export function scene(K, P, V) {
  const G = GEO;
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const S = (paths, style) => K.solidSvg(paths, style);
  const L = (d, style) => K.lineSvg(d, style);
  const Dt = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  const slab = (x, y, w, d, z, h, r = 0.8, bevel = 0.3) => K.slabOf({ x, y, w, d, r }, z, h, P, 3, bevel);
  const [vx, vy] = K.towardViewer(P);

  // ---- bolster: the bed the block sits in ----
  const bol = { x: -44, y: -24, w: 88, d: 48, r: 3 };
  put(depth(0, 0, 0) - 40, `<path class="iso-halo" d="${K.haloOf(bol, 0, 0.1, P)}" style="filter:blur(3px)"/>` +
    S(K.slabOf(bol, 0, 6, P, 6, 0.6), { tone: "mid", inner: L(K.sideSeam(bol, 3, P, 6), { tone: "faint" }) }) +
    L(K.planOutline(K.insetPlan(bol, 3.5), 6, P), { tone: "faint" }) + Dt(K.corners(bol, 4).map(([x, y]) => [x, y, 6])));

  // ---- columns, split at the ram, and the ram's bushings ----
  const hR = V.hR, ramZ = hR + 3;
  for (const sy of [-1, 1]) {
    const x = sy * G.COL_X, y = 0;
    put(depth(x, y, 3), S(K.cylinder(x, y, 6.4, 6, 2.4, P, 28, 0.4), { tone: "mid" }));
    put(depth(x, y, ramZ / 2), S(K.cylinder(x, y, G.COL_R, 8.4, ramZ - 8.4, P, 28), { tone: "mid", crease: "none", inner: L(K.sideArc(x, y, G.COL_R, 20, P, 16), { tone: "faint" }) }));
    const up0 = ramZ + G.RAM_H;
    put(depth(x, y, (up0 + G.TOP) / 2), S(K.cylinder(x, y, G.COL_R, up0, G.TOP - up0, P, 28), { tone: "mid", crease: "none" }));
    put(depth(x, y, ramZ + 4.5) + (sy > 0 ? 6 : -6), S(K.cylinder(x, y, 6.6, ramZ, G.RAM_H, P, 32, 0.5), { tone: "mid", inner: L(K.sideArc(x, y, 6.6, ramZ + G.RAM_H / 2, P, 24), { tone: "faint" }) }) +
      L(K.ring(x, y, 5.2, ramZ + G.RAM_H, P, 28), { tone: "faint" }));
  }

  // ---- crown, lead screw, handwheel and its crank ----
  const crown = { x: -45, y: -13, w: 90, d: 26, r: 3 };
  put(depth(0, 0, G.TOP + 5) + 30, S(K.slabOf(crown, G.TOP, 10, P, 6, 0.6), { tone: "mid", inner: L(K.sideSeam(crown, G.TOP + 5, P, 6), { tone: "faint" }) }) +
    L(K.planOutline(K.insetPlan(crown, 3), G.TOP + 10, P), { tone: "faint" }) +
    Dt([[-38, 0, G.TOP + 10], [38, 0, G.TOP + 10]]) +
    S(K.cylinder(0, 0, 4.2, G.TOP + 10, 3, P, 24), { tone: "mid" }) +
    S(K.cylinder(0, 0, 13, G.TOP + 13, 3, P, 56, 0.5), { tone: "mid", crease: "lo" }) +
    L(K.knurl(0, 0, 13, G.TOP + 13.4, G.TOP + 15.6, 56, P, 0.3), { tone: "lo" }) +
    L(K.ring(0, 0, 9.5, G.TOP + 16, P, 48), { tone: "faint" }) +
    S(K.cylinder(0, 0, 2.6, G.TOP + 16, 1.4, P, 18), { tone: "mid" }) +
    (() => { const a = V.spin * SC_RAD, cx = 10.5 * Math.cos(a), cy = 10.5 * Math.sin(a);
      return S(K.cylinder(cx, cy, 1.2, G.TOP + 16, 5, P, 14), { tone: "mid", crease: "none" }) + S(K.cylinder(cx, cy, 1.9, G.TOP + 21, 1.2, P, 16), { tone: "mid" }); })());
  const scr0 = ramZ + G.RAM_H;
  let threads = "";
  for (let z = scr0 + 2; z < G.TOP - 1; z += 2.4) threads += K.sideArc(0, 0, 2.4, z, P, 10);
  put(depth(0, 0, (scr0 + G.TOP) / 2) + 1, S(K.cylinder(0, 0, 2.4, scr0, G.TOP - scr0, P, 18), { tone: "mid", crease: "none", inner: L(threads, { tone: "faint" }) }));

  // ---- ram, its pad and the pawl tab that reads against the rack ----
  const ram = { x: -29, y: -11, w: 58, d: 22, r: 1.5 };
  put(depth(0, 0, ramZ + 4.5), S(K.slabOf(ram, ramZ, G.RAM_H, P, 4, 0.5), { tone: "mid", inner: L(K.sideSeam(ram, ramZ + 4.5, P, 4), { tone: "faint" }) }) +
    L(K.planOutline(K.insetPlan(ram, 2.5), ramZ + G.RAM_H, P), { tone: "faint" }) +
    Dt([[-24, -7], [-24, 7], [24, -7], [24, 7]].map(([x, y]) => [x, y, ramZ + G.RAM_H])));
  put(depth(0, 0, hR + 1.5) - 0.5, S(slab(-10.5, -10.5, 21, 21, hR, 3, 1, 0.4), { tone: "mid", crease: "lo" }));
  {
    const R = G.RACK, tabY = 6 + 3 * V.lock;
    put(depth(R.x + 2.5, R.y + 1, ramZ) + 2, S(slab(R.x + 1, 4.5, 3, tabY - 4.5 + 2, ramZ, 2.4, 0.4, 0.2), { tone: V.lock > 0.5 ? "hi" : "mid", crease: "lo" }));
  }

  // ---- the rack beside the near column: three detent teeth and the stop pin on the chosen one ----
  {
    const R = G.RACK, top = G.UP + G.GAP + 8;
    let teeth = "";
    for (const lvl of ["S", "N", "D"]) {
      const h = G.hAt(G.DETENT[lvl]) + 3;
      teeth += S(slab(R.x + 0.6, R.y + R.d, R.w - 1.2, 1.8, h - 1, 1, 0.2, 0.1), { tone: "mid", crease: "none" });
    }
    const hp = G.hAt(G.DETENT[V.level]) + 3;
    put(depth(R.x + R.w / 2, R.y + R.d / 2, top / 2) + 1,
      S(slab(R.x - 1, R.y - 1, R.w + 2, R.d + 2, 6, 1.6, 0.6, 0.2), { tone: "mid" }) +
      S(slab(R.x, R.y, R.w, R.d, 7.6, top - 7.6, 0.3, 0.2), { tone: "mid", crease: "none" }) + teeth +
      S(K.cylinder(R.x + R.w / 2, R.y + R.d + 3, 1.5, hp - 1.8, 2.6, P, 16), { tone: "hi", crease: "lo" }) +
      Dt([[R.x + R.w / 2, R.y + R.d / 2, top]]));
  }

  // ---- the block, its spring and the four guide posts ----
  const B = G.BLOCK, hB = V.hB, zb = hB - G.BLOCK_H;
  const posts = [[-13.5, -13.5], [13.5, -13.5], [-13.5, 13.5], [13.5, 13.5]];
  for (const [x, y] of posts) {
    put(depth(x, y, 10) + (x + y > 0 ? 30 : -30), S(K.cylinder(x, y, 1.6, 7.5, 22.5, P, 16), { tone: "mid", crease: "none" }) +
      S(K.cylinder(x, y, 2.2, 30, 1.2, P, 16), { tone: "mid" }));
  }
  put(depth(0, 0, 6.5) - 2, S(slab(-11.5, -11.5, 23, 23, 6, 1.5, 1, 0.3), { tone: "lo" }));
  {
    const turns = 4, r = 6.8, z0 = 7.5, z1 = zb - 0.4, back = [], front = [];
    let run = [], near = null;
    for (let i = 0; i <= turns * 18; i++) {
      const a = (i / 18) * Math.PI * 2, z = z0 + (z1 - z0) * i / (turns * 18);
      const facing = Math.cos(a) * vx + Math.sin(a) * vy > 0;
      const p = at([r * Math.cos(a), r * Math.sin(a), z]);
      if (near === null) near = facing;
      if (facing !== near) { run.push(p); (near ? front : back).push(K.pathOf(run)); run = [p]; near = facing; continue; }
      run.push(p);
    }
    if (run.length > 1) (near ? front : back).push(K.pathOf(run));
    put(depth(0, 0, 8) - 1, L(back.join(""), { tone: "lo" }) +
      S(K.cylinder(0, 0, 2, 7.5, z1 - 7.5, P, 14), { tone: "mid", crease: "none" }) +
      L(front.join(""), { tone: "mid" }) +
      Dt([[r, 0, z0], [r * Math.cos(turns * 2 * Math.PI), r * Math.sin(turns * 2 * Math.PI), z1]], 0.5));
  }
  {
    const plan = { x: -B, y: -B, w: 2 * B, d: 2 * B, r: 1 };
    let top = L(K.planOutline(K.insetPlan(plan, 2.2), hB, P), { tone: "faint" });
    if (V.crack > 0.02) {
      // a crack down the front face, from the top edge to the bottom edge, opening as crack grows
      const c = V.crack, face = (pts) => K.pathOf(pts.map(([x, z]) => at([x, B, zb + z])));
      const crackA = [[-2.5, 12], [-1.2, 9.2], [-3.4, 6.6], [-0.6, 3.8], [-2, 0]].map(([x, z]) => [x * c, z]);
      const crackB = [[-3.4 * c, 6.6], [-6 * c, 4.4], [-B, 3.4]];
      top += L(face(crackA), { tone: "lit" }) + L(face(crackB), { tone: "lit" });
    }
    put(depth(0, 0, zb + 6), `<g data-part="block">` + S(K.slabOf(plan, zb, G.BLOCK_H, P, 3, 0.5), { tone: "hi", lit: true, crease: "lo" }) + top + "</g>");
  }

  // ---- dials: rounds counter and mission clock ----
  for (const [D, f] of [[G.DIAL_R, Math.min(1, V.rounds / G.ROUNDS_MAX)], [G.DIAL_T, Math.min(1, V.t / G.CLOCK_MAX)]]) {
    const top = D.z + D.h;
    const ped = { x: D.x - 12, y: D.y - 12, w: 24, d: 24, r: 3 };
    let s = `<path class="iso-halo" d="${K.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    s += S(K.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }) + L(K.planOutline(K.insetPlan(ped, 3), 5, P), { tone: "faint" });
    s += Dt(K.corners(ped, 3.4).map(([x, y]) => [x, y, 5]), 0.45);
    s += S(K.cylinder(D.x, D.y, 5, 5, 2.4, P, 28), { tone: "mid" });
    s += S(K.cylinder(D.x, D.y, 3, 7.4, D.z - 7.4, P, 24), { tone: "mid", crease: "none" });
    s += S(K.cylinder(D.x, D.y, D.r, D.z, D.h, P, 64, 0.8), { tone: "hi", crease: "lo" });
    s += L(K.knurl(D.x, D.y, D.r, top - 2.8, top, 60, P, 0.3), { tone: "lo" });
    s += L(K.sideArc(D.x, D.y, D.r, top - 2.8, P, 40), { tone: "faint" });
    s += L(K.ring(D.x, D.y, D.r - 2, top, P, 64), { tone: "lo" });
    const n = D === G.DIAL_R ? 14 : 16, every = D === G.DIAL_R ? 2 : 2;
    const t = K.radialTicks(D.x, D.y, D.r - 2, n, every, top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
    s += L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
    const a = -0.75 * Math.PI + f * 1.5 * Math.PI, sx = Math.sin(a), sy = -Math.cos(a);
    s += `<path class="iso-line" data-tone="${D === G.DIAL_R ? "hi" : "mid"}" data-free="" d="${K.lineOnTop([D.x - sx * 2.6, D.y - sy * 2.6], [D.x + sx * (D.r - 3.2), D.y + sy * (D.r - 3.2)], top + 0.2, P)}" style="stroke-width:1"/>`;
    s += L(K.ring(D.x, D.y, 1.3, top, P, 16), { tone: "mid" });
    put(depth(D.x, D.y, 0), s);
  }

  items.sort((a, b) => a.key - b.key);
  return items.map((i) => i.svg).join("");
}

// Stroke share of the press for a share hit c: contact at 0.25, then the three detents.
export function strokeOf(c) {
  const xs = [0, 0.03, 0.1, 0.3], ys = [0.25, 0.5, 0.75, 1];
  if (c >= 0.3) return 1;
  for (let i = 1; i < xs.length; i++) if (c <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (c - xs[i - 1]) / (xs[i] - xs[i - 1]);
  return 1;
}
