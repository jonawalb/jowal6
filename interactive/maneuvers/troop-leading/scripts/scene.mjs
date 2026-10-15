// The moving half of the machine: the two chambers (the leader's time and the squads' time), the
// eight station lamps, the clock carriage on its rail and the timeline strips. Rebuilt per frame.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page (inlined kit) run the
// same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  HU: 3.4,                    // bench units of sand height per notional hour
  CL: [-70, -20], CS: [-2, -20],
  R: 14,                      // glass radius
  BASE: 3,                    // glass floor
  POSTS_X: [-100, -72, -44, -16, 12, 40, 68, 96],
  POST_Y: -64,
  RAIL_X: -112, HOUR: 14,     // the carriage rail: x of hour 0, and bench units per hour
  RAIL_Y: 37,
  LD_HOURS: 12,
};
const RAD = Math.PI / 180;

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const G = GEO;
  const { k } = K.cameraOf(P);
  const split = S.sand;                       // leader's hours as the sand stands now (eased)
  const sub = S.total - split;

  // ---- one chamber: collar, sand, glass outline, cap ----
  const chamber = ([cx, cy], hours, tone, marks, cls) => {
    const r = G.R, z0 = G.BASE, zTop = z0 + S.total * G.HU;
    let o = "";
    const h = Math.max(0, hours) * G.HU;
    if (h > 0.05) {
      o += solid(K.cylinder(cx, cy, r - 1.1, z0, h, P, 40), { tone, crease: "none", className: cls });
      // sand grain: a scatter of dots on the surface
      const grains = [];
      for (let n = 0; n < 16; n++) { const a = n * 2.399 + 0.7, rr = (r - 2.6) * Math.sqrt((n + 0.5) / 16); grains.push(at([cx + rr * Math.cos(a), cy + rr * Math.sin(a), z0 + h])); }
      o += K.dotsSvg(grains, { size: 0.42, tone: "mid" });
    }
    // glass: two silhouette lines, the front of the floor ring and the sand line seen through
    const [sx, sy0] = at([cx, cy, z0]);
    const sy1 = at([cx, cy, zTop])[1];
    o += line(K.pathOf([[sx - r * k, sy0], [sx - r * k, sy1]]) + K.pathOf([[sx + r * k, sy0], [sx + r * k, sy1]]), { tone: "mid" });
    o += line(K.sideArc(cx, cy, r, z0, P, 28), { tone: "mid" });
    for (const [z, t] of marks) o += line(K.ring(cx, cy, r, z0 + z * G.HU, P, 40), { tone: t });
    o += solid(K.cylinder(cx, cy, r + 0.6, zTop, 1.6, P, 40), { tone: "mid" });
    return o;
  };
  // leader's chamber: mark at the hours the leader needs (3) and the one-third collar (4)
  {
    const [cx, cy] = G.CL;
    let o = chamber(G.CL, split, "hi", [[S.leaderNeed, "mid"]], "tl-sand-l");
    o += solid(K.cylinder(cx, cy, G.R + 1.1, G.BASE + (S.total / 3) * G.HU - 0.6, 1.2, P, 40), { tone: "hi", crease: "lo" });
    put(depth(cx, cy), o);
  }
  // the squads' chamber: marks at 2, 4 and 7 hours (plan, check, rehearse)
  {
    const [cx, cy] = G.CS;
    put(depth(cx, cy), chamber(G.CS, sub, "mid", [[2, "mid"], [4, "mid"], [7, "hi"]], "tl-sand-s"));
  }

  // ---- the eight station lamps (the post and its number are static) ----
  S.states.forEach((st, i) => {
    const x = G.POSTS_X[i], y = G.POST_Y;
    const tone = st === 1 ? "hi" : st === 2 ? "mid" : "lo";
    let o = solid(K.cylinder(x, y, 4.6, 11, 5, P, 28, 0.4), { tone, lit: st === 1, crease: "lo" });
    o += solid(K.cylinder(x, y, 2.4, 16, 1.4, P, 20), { tone: "mid", crease: "none" });
    if (st === 1) o += line(K.ring(x, y, 4.6, 16, P, 28), { tone: "lit" });
    put(depth(x, y, 10), o);
  });

  // ---- the clock: timeline strips on the rail and the carriage ----
  {
    const y = G.RAIL_Y + 1, x0 = G.RAIL_X;
    const xs = x0 + split * G.HOUR, xl = x0 + G.LD_HOURS * G.HOUR;
    let o = solid(K.slabOf({ x: x0, y, w: xs - x0, d: 4, r: 0.6 }, 1.2, 1.2, P, 3, 0.2), { tone: "hi", crease: "none" });
    o += solid(K.slabOf({ x: xs, y, w: xl - xs, d: 4, r: 0.6 }, 1.2, 1.2, P, 3, 0.2), { tone: "mid", crease: "none" });
    put(depth(x0 + 60, y) - 0.02, o);
    const cx = x0 + Math.min(S.clock, S.total + S.after) * G.HOUR;
    let c = `<path class="iso-halo" d="${K.slabOf({ x: cx - 5, y: G.RAIL_Y - 1, w: 10, d: 10, r: 1.5 }, 0, 0.1, P).fill}" style="filter:blur(2px)"/>`;
    c += solid(K.slabOf({ x: cx - 5, y: G.RAIL_Y - 1, w: 10, d: 10, r: 1.5 }, 1.2, 4.4, P, 4, 0.4), { tone: "hi", crease: "lo" });
    c += K.dotsSvg([at([cx - 1.6, G.RAIL_Y + 4, 5.6]), at([cx + 1.6, G.RAIL_Y + 4, 5.6])], { size: 0.42 });
    put(depth(cx, G.RAIL_Y + 4) + 0.01, c);
  }
  items.sort((a, b) => a.key - b.key);
  for (const extra of S.statics || []) items.push({ key: 1e9, svg: extra.svg });
  return items.map((it) => it.svg).join("");
}

// The dial needle for a share f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
