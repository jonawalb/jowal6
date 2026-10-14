// The machine: a spray bar with six nozzle heads over a row of five target blocks. Rebuilt per frame from
// the state, depth-sorted. Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code; build.mjs inlines this file with `export` stripped.
//   V.nx[6]    x of each nozzle head on the bar
//   V.jet[6]   0..1 how much of its jet is running; V.jw[6] 1 when that jet is wasted
//   V.hT[5]    height of each target block's top (it is pressed down as effect lands)
//   V.spill[5] number of wasted jets overflowing each block (spill column into the tray)
//   V.lamp[5]  1 while the target is still firing
//   V.steps    0..4 process lamps lit; V.waste 0..1 the wasted-fire gauge; V.sel 0..1 selector (0 uncontrolled)
export const GEO = {
  TX: [-64, -32, 0, 32, 64],          // target x
  TOP: 66,                            // underside of the bar
  TIP: 50,                            // nozzle tip
  BLOCK: 7, BLOCK_H: 12,              // block half width, height
  SLEEVE: 10,                         // top of the sleeve each plunger rises from
  H0: 34, H1: 24,                     // block top: untouched, fully pressed
  HOME: [-70, -42, -14, 14, 42, 70],  // nozzle parking positions
  TRAY: { x: -78, y: 13, w: 156, d: 13, r: 2 },
  GAUGE: { x: 90, y: 24, h: 40 },
  THREAT: 2,
};
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

  // ---- posts and the beam they carry ----
  for (const sx of [-1, 1]) {
    const x = sx * 86;
    put(depth(x, 0, 4), S(K.cylinder(x, 0, 7, 0, 3, P, 30, 0.5), { tone: "mid" }) +
      S(K.cylinder(x, 0, 4.2, 3, G.TOP + 6 - 3, P, 28), { tone: "mid", crease: "none", inner: L(K.sideArc(x, 0, 4.2, 30, P, 16), { tone: "faint" }) }) +
      Dt(K.corners({ x: x - 5, y: -5, w: 10, d: 10 }, 0).map(([a, b]) => [a, b, 3]), 0.4));
  }
  const beam = { x: -92, y: -7, w: 184, d: 14, r: 2 };
  const bz = G.TOP, bh = 9;
  let beamSvg = S(K.slabOf(beam, bz, bh, P, 4, 0.7), { tone: "mid", inner: L(K.sideSeam(beam, bz + bh / 2, P, 4), { tone: "faint" }) }) +
    L(K.planOutline(K.insetPlan(beam, 2.4), bz + bh, P), { tone: "faint" });
  const tk = K.topTicks(-80, 80, 4, 8, 3.2, bz + bh, [1.4, 2.8], P, "x");
  beamSvg += L(tk.minor, { tone: "lo" }) + L(tk.major, { tone: "mid" });
  // a darker slot along the underside edge that the nozzle heads ride in
  beamSvg += Dt(K.corners(beam, 3.6).filter((_, i) => i < 2).map(([a, b]) => [a, b, bz + bh]), 0.45);
  put(depth(0, 0, bz + bh / 2) + 20, beamSvg);

  // ---- supply riser and the selector knob on the right-hand end of the beam ----
  put(depth(78, -2, bz + bh) + 24,
    S(K.cylinder(78, -2, 4.6, bz + bh, 2, P, 28, 0.4), { tone: "mid" }) +
    S(K.cylinder(78, -2, 2.4, bz + bh + 2, 10, P, 20), { tone: "mid", crease: "none" }) +
    S(K.cylinder(78, -2, 3.4, bz + bh + 12, 1.8, P, 24, 0.4), { tone: "mid" }));
  {
    const kx = -78, ky = -2, kz = bz + bh, a = (-40 + 80 * V.sel) * SC_RAD, sx = Math.sin(a), sy = -Math.cos(a);
    put(depth(kx, ky, kz) + 24,
      S(K.cylinder(kx, ky, 5, kz, 2.2, P, 28, 0.4), { tone: "mid" }) +
      S(K.cylinder(kx, ky, 3.4, kz + 2.2, 3, P, 28, 0.5), { tone: "hi", crease: "lo" }) +
      L(K.knurl(kx, ky, 3.4, kz + 2.5, kz + 4.6, 28, P, 0.3), { tone: "lo" }) +
      `<path class="iso-line" data-tone="lo" data-free="" d="${K.lineOnTop([kx - sx * 0.4, ky - sy * 0.4], [kx + sx * 5.8 * 0.7, ky + sy * 5.8 * 0.7], kz + 5.4, P)}" style="stroke-width:1"/>` +
      Dt([[kx - 4.6, ky - 6.4, kz + 2.2], [kx + 4.6, ky - 6.4, kz + 2.2]], 0.5));
  }

  // ---- target stations: sleeve, plunger, block, lamp on its back pedestal ----
  const B = G.BLOCK;
  G.TX.forEach((x, i) => {
    const lit = i === G.THREAT;
    const hT = V.hT[i], zb = hT - G.BLOCK_H;
    const sl = { x: x - 10, y: -10, w: 20, d: 20, r: 2.5 };
    put(depth(x, 0, 3) - 1, `<path class="iso-halo" d="${K.haloOf(sl, 0, 0.1, P)}" style="filter:blur(3px)"/>` +
      S(K.slabOf(sl, 0, G.SLEEVE, P, 4, 0.6), { tone: "mid", inner: L(K.sideSeam(sl, G.SLEEVE / 2, P, 4), { tone: "faint" }) }) +
      L(K.planOutline(K.insetPlan(sl, 3.4), G.SLEEVE, P), { tone: "faint" }) + Dt(K.corners(sl, 2.2).map(([a, b]) => [a, b, G.SLEEVE]), 0.4));
    put(depth(x, 0, (G.SLEEVE + zb) / 2) + 0.5, S(K.cylinder(x, 0, 2.6, G.SLEEVE, Math.max(0.4, zb - G.SLEEVE), P, 20), { tone: "mid", crease: "none" }));
    const plan = { x: x - B, y: -B, w: 2 * B, d: 2 * B, r: 1 };
    put(depth(x, 0, zb + 6) + 1,
      S(K.slabOf(plan, zb, G.BLOCK_H, P, 3, 0.5), lit ? { tone: "hi", lit: true, crease: "lo" } : { tone: "mid", crease: "lo" }) +
      L(K.planOutline(K.insetPlan(plan, 2.2), hT, P), { tone: "faint" }));
    // lamp on a pedestal behind the station
    const ped = { x: x - 5, y: -31, w: 10, d: 8, r: 1.5 };
    const on = V.lamp[i] > 0.5;
    put(depth(x, -27, 3),
      S(K.slabOf(ped, 0, 3, P, 3, 0.4), { tone: "mid" }) +
      S(K.cylinder(x, -27, 2.5, 3, 1.6, P, 22, 0.3), { tone: "mid" }) +
      S(K.cylinder(x, -27, 1.9, 4.6, 2.4, P, 20, 0.6), on ? { tone: "hi", crease: "lo" } : { tone: "lo", crease: "lo" }) +
      (on ? L(K.ring(x, -27, 3, 3.2, P, 24), { tone: "mid" }) : ""));
  });

  // ---- nozzle heads and their jets ----
  for (let k = 0; k < 6; k++) {
    const x = V.nx[k], z0 = G.TOP - 9;
    put(depth(x, 0, z0 + 4) + 3 + k * 0.01,
      S(slab(x - 1.3, -3, 2.6, 6, z0, 9, 0.4, 0.2), { tone: "mid", crease: "lo" }) +
      S(K.cylinder(x, 0, 1.15, G.TIP, z0 - G.TIP, P, 14), { tone: "mid", crease: "none" }) +
      S(K.cylinder(x, 0, 1.6, G.TIP - 1.4, 1.4, P, 14, 0.3), { tone: "mid" }));
  }
  // jets: a thin column from the tip to the block under it (nozzles over a block fall onto it)
  const under = (x) => G.TX.findIndex((tx) => Math.abs(x - tx) <= B + 1.6);
  for (let k = 0; k < 6; k++) {
    if (V.jet[k] < 0.05) continue;
    const x = V.nx[k], i = under(x);
    if (i < 0) continue;
    const top = V.hT[i];
    put(depth(x, 0, (G.TIP + top) / 2) + 3.6,
      S(K.cylinder(x, 0, 0.6 + 0.3 * V.jet[k], top, G.TIP - 1.4 - top, P, 10), { tone: V.jw[k] ? "lo" : "hi", crease: "none" }));
  }
  // overflow: wasted jets run off the front of the block and down into the tray
  G.TX.forEach((x, i) => {
    const n = V.spill[i];
    if (n <= 0) return;
    const top = V.hT[i], tray = 3;
    put(depth(x, B + 2.2, (top + tray) / 2) + 2,
      S(K.cylinder(x, B + 1.6, 0.5 + 0.28 * Math.min(n, 4), tray, top - 3.6 - tray, P, 10), { tone: "lo", crease: "none" }) +
      S(K.cylinder(x, B + 1.6, 1.4 + 0.3 * Math.min(n, 4), top - 3.6, 3.2, P, 12, 0.3), { tone: "lo", crease: "none" }));
  });

  // ---- tray along the front and the wasted-fire gauge at its right end ----
  const tr = G.TRAY;
  put(depth(0, tr.y + tr.d / 2, 1) + 10,
    S(K.slabOf(tr, 0, 3, P, 4, 0.5), { tone: "lo", inner: L(K.sideSeam(tr, 1.5, P, 4), { tone: "faint" }) }) +
    L(K.planOutline(K.insetPlan(tr, 2.2), 3, P), { tone: "faint" }));
  {
    const g = G.GAUGE, f = Math.max(0, Math.min(1, V.waste));
    let rings = "";
    for (let z = 6; z <= g.h; z += 4) rings += K.sideArc(g.x, g.y, 3, z, P, 14);
    put(depth(g.x, g.y, g.h / 2) + 14,
      S(K.slabOf({ x: g.x - 6, y: g.y - 6, w: 12, d: 12, r: 2 }, 0, 3, P, 3, 0.5), { tone: "mid" }) +
      S(K.cylinder(g.x, g.y, 3, 3, g.h, P, 20), { tone: "mid", crease: "none", inner: L(rings, { tone: "faint" }) }) +
      S(K.cylinder(g.x, g.y, 4.2, 5 + f * (g.h - 8), 2.6, P, 22, 0.4), { tone: "hi", crease: "lo" }) +
      S(K.cylinder(g.x, g.y, 3.4, g.h + 3, 1.2, P, 20, 0.3), { tone: "mid" }));
  }

  // ---- the four fire-control steps: a lamp panel, lit in order ----
  {
    const pan = { x: 16, y: 28, w: 42, d: 12, r: 2 };
    let s = S(K.slabOf(pan, 0, 3, P, 4, 0.5), { tone: "mid", inner: L(K.sideSeam(pan, 1.5, P, 4), { tone: "faint" }) }) +
      L(K.planOutline(K.insetPlan(pan, 2), 3, P), { tone: "faint" });
    for (let j = 0; j < 4; j++) {
      const x = 23.5 + j * 9.6, y = 32.4, on = V.steps > j;
      s += S(K.cylinder(x, y, 2.5, 3, 1.4, P, 22, 0.3), { tone: "mid" }) +
        S(K.cylinder(x, y, 1.9, 4.4, 2.2, P, 20, 0.6), on ? { tone: "hi", crease: "lo" } : { tone: "lo", crease: "lo" }) +
        (on ? L(K.ring(x, y, 3, 3.2, P, 24), { tone: "mid" }) : "") +
        Dt(Array.from({ length: j + 1 }, (_, n) => [x - (j * 0.9) + n * 1.8, y + 4.4, 3]), 0.34);
    }
    put(depth(37, 34, 3) + 14, s);
  }
  items.sort((a, b) => a.key - b.key);
  return items.map((i) => i.svg).join("");
}
