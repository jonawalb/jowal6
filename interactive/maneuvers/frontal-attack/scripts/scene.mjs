// The moving half of the figure: the ram rod, the broad platen, the six wall blocks,
// their springs and guide pins, and the backstop they bear on. Rebuilt per frame.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  WF: 64,            // wall front face x at rest (platen face)
  BD: 12,            // block depth along x
  BH: 26,            // block height
  BW: 14,            // block width across the front
  PITCH: 16.4,       // block spacing across the front
  Y0: -48,           // first block's far edge
  BACK: 118,         // backstop face x
  SZ: 14,            // spring axis height
  SR: 4,             // spring radius
  GLAND: -6,        // where the ram rod leaves the cylinder
  ROD_Z: 19,         // ram rod axis height
};

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const G = GEO;
  const cf = G.WF + S.d;

  // ---- ram rod and its boss on the platen's back ----
  put(-1e6,
    solid(K.slabOf({ x: G.GLAND, y: -2.6, w: cf - 9 - G.GLAND, d: 5.2, r: 2.2 }, G.ROD_Z - 2.6, 5.2, P, 4), { tone: "mid", crease: "none" }) +
    solid(K.slabOf({ x: cf - 10, y: -8, w: 4.2, d: 16, r: 1.6 }, G.ROD_Z - 8, 16, P, 4, 0.4), { tone: "mid" }));

  // ---- the platen: one broad plate across the whole front (the lit accent) ----
  {
    const plan = { x: cf - 6, y: -70, w: 6, d: 140, r: 1.2 };
    put(-1e5,
      solid(K.slabOf(plan, 3, 31, P, 3, 0.5), { tone: "hi", lit: true, crease: "lo", inner: line(K.sideSeam(plan, 28, P, 3), { tone: "lit" }) }) +
      K.dotsSvg([-64, -32, 0, 32, 64].map((y) => at([cf - 3, y, 34])), { size: 0.45 }));
  }

  // ---- blocks, springs and guide pins ----
  for (let i = 0; i < 6; i++) {
    const y0 = G.Y0 + i * G.PITCH, y1 = y0 + G.BW, yc = (y0 + y1) / 2;
    const bx = cf + (i === S.weak ? S.g : 0);
    const plan = { x: bx, y: y0, w: G.BD, d: G.BW, r: 1 };
    let block = solid(K.slabOf(plan, 0, G.BH, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(plan, 6, P, 3), { tone: "faint" }) });
    block += line(K.planOutline(K.insetPlan(plan, 2.2), G.BH, P, 3), { tone: "faint" });
    block += K.dotsSvg([[bx + 3.4, y0 + 3.4], [bx + G.BD - 3.4, y1 - 3.4]].map(([x, y]) => at([x, y, G.BH])), { size: 0.42 });
    if (i === 5) block += solid(K.slabOf({ x: bx + 5, y: y1, w: 2, d: 4.6, r: 0.4 }, 1.4, 1, P, 2), { tone: "hi", crease: "none" });
    put(depth(bx + G.BD / 2, yc), block);

    const s0 = bx + G.BD + 0.8, s1 = G.BACK - 0.8;
    const coil = K.coil(s0, s1, [yc, G.SZ], G.SR, 7, "x", P);
    put(depth((s0 + s1) / 2, yc),
      solid(K.slabOf({ x: bx + G.BD, y: yc - G.SR, w: 0.8, d: 2 * G.SR, r: 0.4 }, G.SZ - G.SR, 2 * G.SR, P, 2), { tone: "mid", crease: "none" }) +
      solid(K.slabOf({ x: s1, y: yc - G.SR, w: 0.8, d: 2 * G.SR, r: 0.4 }, G.SZ - G.SR, 2 * G.SR, P, 2), { tone: "mid", crease: "none" }) +
      line(coil.back, { tone: "lo" }) +
      solid(K.slabOf({ x: s0, y: yc - 1.2, w: s1 - s0, d: 2.4, r: 1 }, G.SZ - 1.2, 2.4, P, 3), { tone: "mid", crease: "none" }) +
      line(coil.front, { tone: "mid" }));
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The dial needle for a pressure share f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}

// The index line on the ratio knob, same sweep.
export function knobIndex(K, P, N, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([N.x + sx * 1.2, N.y + sy * 1.2], [N.x + sx * (N.r - 0.8), N.y + sy * (N.r - 0.8)], N.top + 0.05, P);
}
