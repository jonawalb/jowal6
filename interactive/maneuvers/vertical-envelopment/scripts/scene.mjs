// The moving half of the figure: the gantry crane and the lit block it carries, the gate in the
// defense line, the linkup carriage and the enemy's rail cart. Rebuilt per frame from the model's
// normalized state. Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  PZ_X: -104,          // block centre over the pickup zone
  LZ_X: 70,            // block centre over the objective (the enemy rail line)
  BY: 4,               // block centre, y
  PAD_TOP: 1.2,        // pickup pad top
  RAIL_TOP: 2.8,       // enemy rail top
  LIFT_Z: 23,          // block bottom when clear of the line
  BEAM_Z: 45,          // gantry beam underside
  GR_Y: 66,            // gantry floor rails at y = ±GR_Y
  GR_TOP: 2.6,         // gantry rail top
  WALL_X: -6,          // defense line centre, x
  POSTS: [-56, -42, -28, -14, 0, 12, 32, 44, 56],
  GATE: [12, 32],      // the gap the linkup rail runs through
  LY: 22,              // linkup rail, y
  LINK_X: [-122, 34],  // linkup carriage centre, start and end
  ER_X: 70,            // enemy rail line, x
};

const SC_RAD = Math.PI / 180;

// Where the moving parts sit, from the model state plus the eased cart position.
export function poseOf(S) {
  const BX = GEO.PZ_X + (GEO.LZ_X - GEO.PZ_X) * S.air;
  const ground = GEO.PAD_TOP + (GEO.RAIL_TOP - GEO.PAD_TOP) * S.air;
  const bz = ground + (GEO.LIFT_Z - ground) * S.lift;
  const cx = GEO.LINK_X[0] + (GEO.LINK_X[1] - GEO.LINK_X[0]) * S.linkup;
  const open = Math.min(1, Math.max(0, (cx + 38) / 14));
  return { BX, bz, cx, open };
}

// The enemy cart's wanted y: it shuttles along its line until the line is cut, then stops short of the cut.
export function cartWant(S, y) {
  if (S.cut) return y > GEO.BY ? 27 : -19;
  const ph = ((S.t - 1.5) / 10) * 2 * Math.PI;
  return 48 - 70 * (0.5 - 0.5 * Math.cos(ph));
}

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const slab = (x0, x1, y0, y1, z0, h, steps = 2, bevel = 0) =>
    K.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: Math.min(0.8, (x1 - x0) / 4, (y1 - y0) / 4) }, z0, h, P, steps, bevel);
  const dots = (pts, z, size = 0.42) => K.dotsSvg(pts.map(([x, y]) => at([x, y, z])), { size });
  const { BX, bz, cx, open } = poseOf(S);
  const BY = GEO.BY;
  const gx = BX - 4;

  // ---- the gate in the defense line: two leaves hinged on the gate posts, swung open toward the enemy side ----
  {
    const [g0, g1] = GEO.GATE;
    const half = (g1 - g0) / 2 - 2.6;
    for (const [hy, dir] of [[g0 + 2.5, 1], [g1 - 2.5, -1]]) {
      const a = open * 82 * SC_RAD;
      const ux = Math.sin(a), uy = dir * Math.cos(a);
      const nx = -uy * 0.8, ny = ux * 0.8;
      const hx = GEO.WALL_X + 1.2;
      const tip = [hx + ux * half, hy + uy * half];
      const pts = [[hx + nx, hy + ny], [tip[0] + nx, tip[1] + ny], [tip[0] - nx, tip[1] - ny], [hx - nx, hy - ny]];
      const k = depth((hx + tip[0]) / 2, (hy + tip[1]) / 2);
      put(k, solid(K.extrude(pts, 0.4, 11, P, { bevel: 0.2 }), { tone: "mid" }));
    }
  }

  // ---- linkup carriage: the ground force coming to relieve the landed force ----
  {
    const y0 = GEO.LY - 6, y1 = GEO.LY + 6;
    let out = `<path class="iso-halo" d="${K.slabOf({ x: cx - 11, y: y0 - 1, w: 22, d: 14, r: 2 }, 1.8, 0.1, P).fill}" style="filter:blur(3px)"/>`;
    const shoes = [];
    for (const sx of [-9, 3]) for (const sy of [GEO.LY - 6.5, GEO.LY + 3.5]) shoes.push([cx + sx, sy]);
    const shoe = ([x, y]) => solid(slab(x, x + 6, y, y + 3, 1.8, 2.6, 2, 0.3), { tone: "mid" });
    const near = ([x, y]) => depth(x + 3, y + 1.5) > depth(cx, GEO.LY);
    out += shoes.filter((s) => !near(s)).map(shoe).join("");
    const deck = { x: cx - 10, y: y0, w: 20, d: 12, r: 1.4 };
    out += solid(K.slabOf(deck, 4.4, 4, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(deck, 6.4, P, 3), { tone: "faint" }) });
    out += shoes.filter(near).map(shoe).join("");
    out += dots([[cx - 8.6, y0 + 1.4], [cx + 8.6, y0 + 1.4], [cx - 8.6, y1 - 1.4], [cx + 8.6, y1 - 1.4]], 8.4);
    const cab = { x: cx - 7, y: y0 + 2.5, w: 9, d: 7, r: 1 };
    out += solid(K.slabOf(cab, 8.4, 6, P, 3, 0.4), { tone: "mid" });
    out += line(K.planOutline(K.insetPlan(cab, 1.6), 14.4, P), { tone: "faint" });
    out += solid(slab(cx + 7.4, cx + 10.4, y0 + 1.5, y1 - 1.5, 4.8, 5.2, 2, 0.3), { tone: "mid" });
    out += solid(K.cylinder(cx + 5, GEO.LY, 2, 8.4, 2.6, P, 18), { tone: "mid" }) + line(K.knurl(cx + 5, GEO.LY, 2, 8.4, 11, 14, P), { tone: "lo" });
    put(depth(cx, GEO.LY), out);
  }

  // ---- the enemy's rail cart on its line of supply behind the defense ----
  {
    const cy = S.cartY, x0 = GEO.ER_X - 6, x1 = GEO.ER_X + 6;
    let out = "";
    for (const sy of [cy - 4.5, cy + 2.5]) out += solid(slab(x0 + 1, x1 - 1, sy, sy + 2, GEO.RAIL_TOP, 1.6, 2, 0.2), { tone: "lo" });
    const bed = { x: x0, y: cy - 6, w: 12, d: 12, r: 1 };
    out += solid(K.slabOf(bed, GEO.RAIL_TOP + 1.6, 5.6, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(bed, GEO.RAIL_TOP + 4.4, P, 3), { tone: "faint" }) });
    out += line(K.planOutline(K.insetPlan(bed, 1.6), GEO.RAIL_TOP + 7.2, P), { tone: "lo" });
    for (const [px, py] of [[x0 + 3.2, cy - 2.4], [x1 - 3.2, cy + 2.4], [x0 + 3.4, cy + 2.6]]) {
      out += solid(K.slabOf({ x: px - 1.8, y: py - 1.8, w: 3.6, d: 3.6, r: 0.5 }, GEO.RAIL_TOP + 7.2, 2.4, P, 2, 0.3), { tone: "mid" });
    }
    put(depth(GEO.ER_X, cy), out);
  }

  // ---- gantry side frames: truck on the rail, two legs, a tie ----
  for (const side of [-1, 1]) {
    const y = side * GEO.GR_Y;
    let out = `<path class="iso-halo" d="${K.slabOf({ x: gx - 15, y: y - 4, w: 30, d: 8, r: 2 }, GEO.GR_TOP, 0.1, P).fill}" style="filter:blur(2.5px)"/>`;
    const truck = { x: gx - 14, y: y - 3.5, w: 28, d: 7, r: 1.2 };
    out += solid(K.slabOf(truck, GEO.GR_TOP, 5, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(truck, GEO.GR_TOP + 2.2, P, 3), { tone: "faint" }) });
    out += dots([[gx - 12, y - 1.8], [gx + 12, y - 1.8], [gx - 12, y + 1.8], [gx + 12, y + 1.8]], GEO.GR_TOP + 5);
    const top = GEO.GR_TOP + 5;
    const legs = [gx - 9, gx + 9].sort((a, b) => depth(a, y) - depth(b, y));
    const leg = (lx) => solid(slab(lx - 2, lx + 2, y - 2, y + 2, top, GEO.BEAM_Z - top, 2, 0.3), { tone: "mid" });
    out += leg(legs[0]);
    out += solid(slab(gx - 7, gx + 7, y - 1.4, y + 1.4, 27, 3, 2, 0.3), { tone: "mid", crease: "none" });
    out += leg(legs[1]);
    out += dots([[gx - 6, y], [gx + 6, y]], 30);
    put(depth(gx, y) + (side > 0 ? 0 : 0), out);
  }

  // ---- the lit block (the air-landed force) on its spreader and cables ----
  {
    const z0 = bz, top = bz + 11;
    let out = "";
    if (S.lift > 0.02) out += `<path class="iso-halo" d="${K.slabOf({ x: BX - 11, y: BY - 10, w: 22, d: 20, r: 3 }, GEO.PAD_TOP + (GEO.RAIL_TOP - GEO.PAD_TOP) * S.air, 0.1, P).fill}" style="filter:blur(${(2 + S.lift * 5).toFixed(1)}px);opacity:${(1 - S.lift * 0.6).toFixed(2)}"/>`;
    for (const sy of [BY - 7.5, BY + 5.5].sort((a, b) => depth(BX, a) - depth(BX, b))) {
      out += solid(slab(BX - 11, BX + 11, sy, sy + 2, z0, 2, 2, 0.3), { tone: "mid" });
    }
    const body = { x: BX - 10, y: BY - 9, w: 20, d: 18, r: 1.2 };
    out += solid(K.slabOf(body, z0 + 2, 9, P, 3, 0.6), { tone: "hi", lit: true, crease: "lo", inner: line(K.sideSeam(body, z0 + 6.5, P, 3), { tone: "faint" }) });
    out += line(K.planOutline(K.insetPlan(body, 2.2), top, P), { tone: "lit" });
    const lugs = [[BX, BY - 6], [BX, BY + 6]];
    out += lugs.map(([x, y]) => solid(K.cylinder(x, y, 1.6, top, 2, P, 16), { tone: "mid" })).join("");
    const sp = { x: BX - 3, y: BY - 10, w: 6, d: 20, r: 1 };
    out += solid(K.slabOf(sp, top + 2, 2, P, 3, 0.3), { tone: "mid" });
    for (const y of [BY - 7, BY + 7]) {
      out += K.wireSvg(at([BX, y, GEO.BEAM_Z]), at([BX, y, top + 4]), { tone: "mid", size: 0.55 });
    }
    put(depth(BX, BY, (z0 + top) / 2), out);
  }

  // ---- gantry beam with the trolley and hoist on top: always above everything else ----
  {
    let out = "";
    const beam = { x: gx - 4, y: -GEO.GR_Y - 4, w: 8, d: GEO.GR_Y * 2 + 8, r: 1 };
    out += solid(K.slabOf(beam, GEO.BEAM_Z, 7, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(beam, GEO.BEAM_Z + 3.5, P, 3), { tone: "faint" }) });
    out += line(K.planOutline(K.insetPlan(beam, 1.8), GEO.BEAM_Z + 7, P), { tone: "faint" });
    out += dots([[gx, -GEO.GR_Y], [gx, GEO.GR_Y]], GEO.BEAM_Z + 7, 0.5);
    const tz = GEO.BEAM_Z + 7;
    const tr = { x: gx - 6, y: BY - 8, w: 12, d: 16, r: 1.2 };
    out += solid(K.slabOf(tr, tz, 5, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(tr, tz + 2.5, P, 3), { tone: "faint" }) });
    out += dots(K.corners(tr, 1.8), tz + 5);
    out += solid(K.cylinder(gx, BY, 3.6, tz + 5, 3.4, P, 24, 0.4), { tone: "mid" }) + line(K.knurl(gx, BY, 3.6, tz + 5.6, tz + 8.4, 20, P), { tone: "lo" });
    out += line(K.ring(gx, BY, 1.4, tz + 8.4, P, 14), { tone: "lo" });
    put(1e6, out);
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The dial needle for a supply share f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
