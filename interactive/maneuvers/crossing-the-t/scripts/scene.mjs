// The moving half of the figure: the crossing bar with its four gun carriages, and the
// four carriages of the column on their beam, every turret aimed. Rebuilt per frame.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page (inlined
// kit) run the same code. build.mjs inlines this file with `export` stripped.
//
// Model state (model.mjs) is in ship spacings and degrees; GEO maps it onto the bench.

export const GEO = {
  S: 36,            // world units per ship spacing
  OX: 0,            // world x of the column's lead
  BEAM: 10,         // top of the column beam and of the crossing bar: hulls stand here
  TT: 7,            // turntable top, where the bar sits
  BAR: 66,          // half-length of the crossing bar
  CASTER: 36,       // caster distance from the pivot, under the bar
  TURRET: 9,        // fore and aft turret distance from a carriage's centre: MODEL.turretAt spacings
  PX: 97.2,         // world x of the pivot: MODEL.D spacings ahead of the lead (checked in build.mjs)
};

const SC_RAD = Math.PI / 180;

// World point of a model point.
export const toWorld = (p) => [GEO.OX + p.x * GEO.S, p.y * GEO.S];

export function scene(K, P, M, aims, lead) {
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
  const poly = (F, pts, z0, h, bevel = 0) => K.extrude(pts.map(([u, v]) => F(u, v)), z0, h, P, { bevel });
  const box = (F, u0, u1, v0, v1, z0, h, bevel = 0) => poly(F, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], z0, h, bevel);
  const PX = GEO.PX, PY = 0;

  // ---- the crossing bar on the turntable, with two casters on the plate ----
  {
    const F = frame(PX, PY, M.phi);
    let out = "";
    for (const u of [-GEO.CASTER, GEO.CASTER]) {
      const [cx, cy] = F(u, 0);
      out += `<path class="iso-halo" d="${K.cylinder(cx, cy, 4.4, 0, 0.1, P, 24).fill}" style="filter:blur(2px)"/>`;
      out += solid(K.cylinder(cx, cy, 3.2, 0, 2.2, P, 24), { tone: "mid" });
      out += solid(box(F, u - 3, u + 3, -3, 3, 2.2, GEO.TT - 2.2, 0.3), { tone: "mid" });
    }
    const bar = box(F, -GEO.BAR, GEO.BAR, -4, 4, GEO.TT, GEO.BEAM - GEO.TT, 0.4);
    out += solid(bar, { tone: "mid" });
    out += line(K.onTop([F(-GEO.BAR, 0), F(GEO.BAR, 0)], GEO.BEAM, P), { tone: "faint" });
    out += K.dotsSvg([-GEO.BAR + 3, -27, -9, 9, 27, GEO.BAR - 3].flatMap((u) => [F(u, -2.6), F(u, 2.6)]).map(([x, y]) => at([x, y, GEO.BEAM])), { size: 0.4 });
    put(-1e4, out);
  }

  // ---- one gun carriage: hull, bridge and funnel, two twin turrets with barrels ----
  const HULL = [[15, 0], [9.5, 5.6], [-12.5, 5.6], [-15, 3.8], [-15, -3.8], [-12.5, -5.6], [9.5, -5.6]];
  const ship = (p, turrets, aim, isLead) => {
    const [x, y] = toWorld(p);
    const F = frame(x, y, p.heading);
    const z0 = GEO.BEAM, zd = z0 + 4;
    const parts = [];
    const ringPts = HULL.map(([u, v]) => F(u, v));
    const hullSeam = line(K.ringSeam(ringPts, z0 + 1.6, P), { tone: "faint" });
    const deck = line(K.onTop(HULL.map(([u, v]) => F(u * 0.86 - 0.6, v * 0.7)), zd, P, true), { tone: "faint" });
    parts.push({ key: -1e3, svg: `<path class="iso-halo" d="${poly(F, HULL, z0, 0.1).fill}" style="filter:blur(2px)"/>` +
      solid(poly(F, HULL, z0, 4, 0.4), isLead ? { tone: "hi", lit: true, crease: "lo", inner: hullSeam } : { tone: "hi", crease: "lo", inner: hullSeam }) +
      (isLead ? line(K.onTop([F(13.4, 0), F(-13.4, 0)], zd, P), { tone: "lit" }) : deck) });
    // bridge and funnel, amidships
    const [fx, fy] = F(-1.2, 0);
    parts.push({ key: depth(fx, fy), svg:
      solid(box(F, -4.6, 2.4, -2.8, 2.8, zd, 3.2, 0.3), { tone: "mid" }) +
      line(K.onTop([F(-4.2, -1.4), F(2, -1.4), F(2, 1.4), F(-4.2, 1.4)], zd + 3.2, P, true), { tone: "faint" }) +
      solid(K.cylinder(fx, fy, 1.7, zd + 3.2, 5.2, P, 20), { tone: "mid", crease: "none", inner: line(K.sideArc(fx, fy, 1.7, zd + 7, P, 14), { tone: "faint" }) }) });
    // turrets, each with twin barrels aimed at its bearing
    turrets.forEach((t, k) => {
      const u = t.end === "fore" ? GEO.TURRET : -GEO.TURRET;
      const [tx, ty] = F(u, 0);
      const G = frame(tx, ty, aim[k]);
      const zt = zd;
      const tz = depth(tx, ty);
      const barrels = solid(box(G, 3.6, 10, 0.4, 1.5, zt + 0.8, 1.1, 0.15), { tone: "mid", crease: "none" }) +
        solid(box(G, 3.6, 10, -1.5, -0.4, zt + 0.8, 1.1, 0.15), { tone: "mid", crease: "none" });
      const [bx, by] = G(6.8, 0);
      const behind = depth(bx, by) < tz;
      const drum = solid(K.cylinder(tx, ty, 3.6, zt, 2.8, P, 28, 0.3), { tone: t.bears ? "hi" : "mid", crease: "lo" }) +
        line(K.ring(tx, ty, 2.3, zt + 2.8, P, 24), { tone: "faint" }) +
        K.dotsSvg([at([...G(-1.4, 0), zt + 2.8])], { size: 0.42 });
      parts.push({ key: tz + (u > 0 ? 0.01 : 0), svg: behind ? barrels + drum : drum + barrels });
    });
    parts.sort((a, b) => a.key - b.key);
    return { key: depth(x, y), svg: parts.map((q) => q.svg).join("") };
  };

  const fleet = (ships, turrets, aim, leadIndex) => ships.forEach((p, i) => {
    const s = ship(p, turrets.slice(i * 2, i * 2 + 2), aim.slice(i * 2, i * 2 + 2), i === leadIndex);
    put(s.key, s.svg);
  });
  fleet(M.line, M.lineTurrets, aims.line, -1);
  fleet(M.column, M.columnTurrets, aims.column, lead);

  items.sort((a, b) => a.key - b.key);
  return items;
}

// The dial needle for a share f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
