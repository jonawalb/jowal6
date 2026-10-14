// The moving half of the figure: the swing hammer, the enemy block on its pallet,
// the anvil rising from its pit, the near rail and rim pieces that must be painted
// in front of it, and the hold dial's needle. Rebuilt per frame from the model's
// normalized state. Written against the kit as a parameter (K) so build.mjs (Node)
// and the page (inlined kit) run the same code. build.mjs inlines this file with
// `export` stripped. All geometry lives here; model.mjs stays geometry-free.

export const GEO = {
  PIVOT: [18, -70],      // hammer pivot post
  R: 70,                 // radius to the head's centre
  PHI0: -75,             // arm at rest (cocked on the latch), degrees from +y
  PHI1: 20,              // arm at the end of its stroke (on the buffer)
  HEAD: [10, 6],         // head half-length along the arm, half-width across it
  RAIL_Y: 16,            // lane rails at y = ±16 (4 wide)
  BLOCK: [10, 11],       // block half-length (x) and half-width (y)
  XB0: 8,                // block centre at the start
  BUMPER: 153,           // face of the far bumper (escape)
  ANVIL_H: 20,           // anvil height when fully up
  RAIL_X: [-10, 152],    // lane rails run between these x
};
const G_RAD = Math.PI / 180;
// Front (+x) face of the hammer head at swing angle phi: its largest x.
GEO.frontX = (phi) => {
  const s = Math.sin(phi * G_RAD), c = Math.cos(phi * G_RAD);
  return GEO.PIVOT[0] + (GEO.R + Math.sign(s || 1) * GEO.HEAD[0]) * s + GEO.HEAD[1] * c;
};
GEO.XA = GEO.frontX(GEO.PHI1) + 2 * GEO.BLOCK[0];   // anvil striking face
GEO.XE = GEO.BUMPER - GEO.BLOCK[0];                            // escaped block centre
GEO.PIT = { x: GEO.XA - 0.5, y: -11, w: 31, d: 22, r: 1 };      // opening in the bench

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, z, size = 0.42) => K.dotsSvg(pts.map(([x, y]) => at([x, y, z])), { size });
  const { XA, PIT } = GEO;
  const [px, py] = GEO.PIVOT;

  // ---- where everything is this frame ----
  const phi = GEO.PHI0 + (GEO.PHI1 - GEO.PHI0) * S.swing;
  const pushed = Math.max(GEO.XB0, GEO.frontX(phi) + GEO.BLOCK[0]);
  const bx = pushed + (GEO.XE - (GEO.XA - GEO.BLOCK[0])) * S.escape;
  const [hl, hw] = GEO.BLOCK;
  // The anvil rises from the pit; a pallet passing over the pit holds it down at rail height.
  const overPit = bx + hl > PIT.x + 1 && bx - hl < PIT.x + PIT.w;
  const lift = Math.min(S.anvil * GEO.ANVIL_H, overPit ? 3 : GEO.ANVIL_H);
  const base = lift - GEO.ANVIL_H;   // anvil foot height, below the bench when not fully up

  // ---- the anvil: a waist and a horned face block, clipped at the bench top ----
  const A = depth(XA + 15, 0);
  const layer = (pts, z0, z1, style, extra = "") => {
    const lo = Math.max(0, base + z0), hi = base + z1;
    if (hi - lo < 0.05) return "";
    return solid(K.extrude(pts, lo, hi - lo, P, { bevel: hi - lo > 2 ? 0.4 : 0 }), style) + extra;
  };
  {
    const foot = [[XA + 1, -10], [XA + 21, -10], [XA + 21, 10], [XA + 1, 10]];
    const waist = [[XA + 5, -6], [XA + 17, -6], [XA + 17, 6], [XA + 5, 6]];
    // face block: square heel plus a horn that tapers in plan and, layer by layer, in height
    const horn = (tip, w) => [[XA, -10], [XA + 15, -10], [XA + 15 + (tip - 15) * 0.55, -w], [XA + tip, 0], [XA + 15 + (tip - 15) * 0.55, w], [XA + 15, 10], [XA, 10]];
    const body = [[12, 14.5, horn(20, 3.2)], [14.5, 17, horn(25, 3.8)], [17, 20, horn(30, 4.4)]];
    const top = base + GEO.ANVIL_H;
    let face = "";
    if (top > 0.3) {
      face = line(K.onTop([[XA + 1.6, -8.4], [XA + 13.4, -8.4], [XA + 13.4, 8.4], [XA + 1.6, 8.4]], top, P, true), { tone: "faint" }) +
        line(K.onTop([[XA + 9, -1.3], [XA + 11.6, -1.3], [XA + 11.6, 1.3], [XA + 9, 1.3]], top, P, true), { tone: "lo" }) +
        dots([[XA + 5, 0]], top, 0.55);
    }
    put(A, layer(foot, 0, 4, { tone: "mid" }) + layer(waist, 4, 12, { tone: "mid" }) + body.map(([z0, z1, pts], i) => layer(pts, z0, z1, { tone: "hi", crease: "lo" }, i === 2 ? face : "")).join(""));
  }
  // near rim bar of the pit and the near rail's pit section, both in front of the anvil
  put(A + 0.1, solid(K.slabOf({ x: PIT.x, y: PIT.y + PIT.d, w: PIT.w, d: 1.6, r: 0.4 }, 0, 1.4, P, 2), { tone: "mid", crease: "none" }));
  const railPit = solid(K.slabOf({ x: PIT.x - 1, y: GEO.RAIL_Y - 2, w: PIT.w + 2, d: 4, r: 0 }, 0, 3, P, 2, 0.3), { tone: "mid" }) +
    dots([[PIT.x + PIT.w / 2, GEO.RAIL_Y]], 3, 0.4);
  put(A + 0.2, railPit);

  // ---- the enemy block on its pallet ----
  {
    const pal = { x: bx - hl, y: -18, w: 2 * hl, d: 36, r: 1 };
    let out = `<path class="iso-halo" d="${K.slabOf({ x: bx - hl - 1, y: -19, w: 2 * hl + 2, d: 38, r: 2 }, 3, 0.1, P).fill}" style="filter:blur(2px)"/>`;
    // guide shoes outside each rail
    const shoe = (y) => solid(K.slabOf({ x: bx - hl + 3, y, w: 2 * hl - 6, d: 2, r: 0.4 }, 0.8, 4.7, P, 2), { tone: "mid", crease: "none" });
    out += shoe(-20);
    out += solid(K.slabOf(pal, 3, 2.5, P, 3, 0.4), { tone: "mid" });
    out += shoe(18);
    out += dots([[bx - hl + 2.4, -15.6], [bx + hl - 2.4, -15.6], [bx - hl + 2.4, 15.6], [bx + hl - 2.4, 15.6]], 5.5);
    const blk = { x: bx - hl, y: -hw, w: 2 * hl, d: 2 * hw, r: 1.2 };
    out += solid(K.slabOf(blk, 5.5, 13.5, P, 3, 0.6), { tone: "hi", crease: "lo", inner: line(K.sideSeam(blk, 12, P, 3), { tone: "faint" }) });
    out += line(K.planOutline(K.insetPlan(blk, 2.6), 19, P, 3), { tone: "lo" });
    out += dots(K.corners(blk, 1.4), 19, 0.45);
    // a small standard on top: the force's colours
    out += solid(K.cylinder(bx - 3, 0, 1.8, 19, 1, P, 16), { tone: "mid" }) +
      solid(K.cylinder(bx - 3, 0, 0.6, 20, 9, P, 10), { tone: "mid", crease: "none" }) +
      solid(K.slabOf({ x: bx - 2.7, y: -0.3, w: 6.5, d: 0.6, r: 0 }, 24.5, 4.2, P, 2), { tone: "hi", crease: "none" });
    let key = depth(bx, 0);
    if (overPit) key = Math.max(key, A + 0.3);
    put(key, out);
  }

  // ---- the hammer: head (lit), arm, counterweight, hub ----
  {
    const s = Math.sin(phi * G_RAD), c = Math.cos(phi * G_RAD);
    const F = (u, v) => [px + u * s - v * c, py + u * c + v * s];
    const box = (u0, u1, v0, v1, z0, h, bevel = 0) => K.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z0, h, P, { bevel });
    const R = GEO.R, [HL, HW] = GEO.HEAD;
    const [hx, hy] = F(R, 0);
    const headKey = depth(hx, hy);
    let head = `<path class="iso-halo" d="${box(R - HL - 1, R + HL + 1, -HW - 1, HW + 1, 0.2, 0.1).fill}" style="filter:blur(3px);opacity:.6"/>`;
    head += solid(box(R - HL, R + HL, -HW, HW, 6, 15, 0.5), { tone: "hi", lit: true, crease: "lo" });
    head += solid(box(R - HL + 1, R + HL - 1, -HW - 1.4, -HW, 7.5, 12), { tone: "hi", lit: true, crease: "lo" });
    head += line(K.onTop([F(R - HL + 1.8, -HW + 1.8), F(R + HL - 1.8, -HW + 1.8), F(R + HL - 1.8, HW - 1.8), F(R - HL + 1.8, HW - 1.8)], 21, P, true), { tone: "lit" });
    put(headKey, head);

    let arm = solid(box(-20, R + 5, -2.5, 2.5, 21, 3, 0.3), { tone: "mid" });
    arm += dots([F(R - 6, 0), F(R + 2, 0)], 24, 0.45);
    arm += solid(box(-21, -11, -6, 6, 18, 8, 0.4), { tone: "mid", inner: "" });
    arm += line(K.onTop([F(-19.4, -4.4), F(-12.6, -4.4), F(-12.6, 4.4), F(-19.4, 4.4)], 26, P, true), { tone: "faint" });
    arm += solid(K.cylinder(px, py, 5.2, 24, 2.4, P, 24), { tone: "mid" }) + line(K.knurl(px, py, 5.2, 24, 26.4, 22, P), { tone: "lo" });
    arm += line(K.ring(px, py, 2, 26.4, P, 16), { tone: "lo" });
    put(Math.max(headKey + 0.5, depth(px, py) + 1), arm);
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The hold dial's needle for a hold fraction h in 0..1: a 270 degree sweep.
export function needle(K, P, D, h) {
  const a = -0.75 * Math.PI + h * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 2.6, D.y - sy * 2.6], [D.x + sx * (D.r - 3.2), D.y + sy * (D.r - 3.2)], D.top + 0.2, P);
}
