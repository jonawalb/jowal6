// The moving half of the machine: the target column (ten cars on the rail), the two bars of the
// rack (assault bar, support bar on its hinge), the plungers that strike on initiation, and the two
// boom gates that are the security elements. Rebuilt per frame. Written against the kit as a
// parameter (K) so build.mjs (Node) and the page (inlined kit) run the same code.
// build.mjs inlines this file with `export` stripped.

export const GEO = {
  KB: 0.75,                // bench units per model unit along the route
  CAR: { len: 7, wid: 11.2, z0: 2.4, h: 4.5 },
  PIVOT: [46, -20],        // the support bar's hinge: the end of the kill zone, beside the track
  RACK_Y: -20,             // the assault bar's line
  LA: 40, LS: 44, ARM: 28, // bar lengths and the assault bar's reach arm
  ASSAULT_X: { lin: -41, L: -26 },   // where the assault bar starts, linear and L-shaped
  GATES: [{ x: -57, open: 180, shut: 270 }, { x: 82.5, open: 0, shut: -90 }],
  GATE_Y: 12,
  KZ: [-36, 36],           // the kill zone, bench units
};

const SC_RAD = Math.PI / 180;
const mix = (a, b, t) => a + (b - a) * t;

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const G = GEO;
  const frame = (ox, oy, ang) => {
    const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
    return (u, v) => [ox + u * c - v * s, oy + u * s + v * c];
  };
  const box = (F, u0, u1, v0, v1, z0, h, bevel = 0) =>
    K.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z0, h, P, { bevel });

  // ---- the target column: ten cars, coupled, riding the rails ----
  const down = S.down || new Set();
  const cars = [];
  for (let i = 0; i < S.n; i++) {
    const s = S.head - i * S.gap;
    cars.push({ i, x: G.KB * s, s });
  }
  for (const c of cars) {
    const { len, wid, z0, h } = G.CAR;
    const fell = down.has(c.i);
    const inZone = c.x >= G.KZ[0] && c.x <= G.KZ[1];
    const y0 = fell ? 2.2 : 0;
    const x0 = c.x - len / 2, y1 = y0 - wid / 2;
    const hh = fell ? 1.6 : h;
    let svg = `<path class="iso-halo" d="${K.slabOf({ x: x0, y: y1, w: len, d: wid, r: 1 }, z0, 0.1, P).fill}" style="filter:blur(2px)"/>`;
    svg += solid(K.slabOf({ x: x0, y: y1, w: len, d: wid, r: 1 }, z0, hh, P, 3, 0.5), { tone: fell ? "lo" : inZone ? "hi" : "mid", crease: "lo" });
    if (!fell) {
      svg += line(K.planOutline(K.insetPlan({ x: x0, y: y1, w: len, d: wid, r: 1 }, 1.2), z0 + hh, P), { tone: "faint" });
      svg += K.dotsSvg([at([c.x, y0 - 3.2, z0 + hh]), at([c.x, y0 + 3.2, z0 + hh])], { size: 0.42 });
    }
    put(depth(c.x, y0), svg);
    // the coupling bar to the next car
    if (c.i < S.n - 1) {
      const gx0 = c.x - len / 2 - (G.KB * S.gap - len);
      put(depth(c.x - 4.5, 0) - 0.01, solid(K.slabOf({ x: gx0, y: -0.9, w: G.KB * S.gap - len, d: 1.8, r: 0.4 }, 3.6, 1.2, P, 2), { tone: "mid", crease: "none" }));
    }
  }

  // ---- the rack: assault bar (lit) on its slide, support bar on the hinge ----
  const f = S.f, fm = S.fm;
  const plunger = (F, u, j, stroke, lit) => {
    const len = 2.4 + stroke;
    let o = solid(box(F, u - 1.4, u + 1.4, -4.6, -3, 3.6, 3.2, 0.3), { tone: "mid" });
    o += solid(box(F, u - 0.6, u + 0.6, -3 - len, -3, 4.4, 1.4, 0.2), { tone: "mid", crease: "none" });
    o += solid(box(F, u - 1.5, u + 1.5, -3 - len - 1.6, -3 - len, 3.8, 2.6, 0.3), { tone: "hi", lit, crease: "lo" });
    return o;
  };
  const strokeOf = (j, off) => (S.fire ? f * (0.5 + 0.5 * Math.sin(S.tf * 11 + j * 1.9 + off)) * 3.6 : 0);
  {
    // assault bar: slides from the linear place to the long-leg place
    const ax = mix(G.ASSAULT_X.lin, G.ASSAULT_X.L, fm);
    // plungers face +y (toward the track), so -v must point to +y: use a half-turn
    const Fa = frame(ax + G.LA, G.RACK_Y, 180);
    let o = `<path class="iso-halo" d="${box(Fa, 0, G.LA, -4, 4, 0, 0.1).fill}" style="filter:blur(3px)"/>`;
    for (const u of [4, G.LA - 4]) o += solid(box(Fa, u - 3, u + 3, -5, 5, 0, 2.8, 0.4), { tone: "mid" });
    o += solid(box(Fa, 0, G.LA, -3, 3, 2.8, 6, 0.5), { tone: "hi", lit: true, crease: "lo" });
    o += line(K.onTop([Fa(0, 0), Fa(G.LA, 0)], 8.8, P), { tone: "lit" });
    // the reach arm: it swings from the bar's end across the track and sweeps the kill zone
    const Fr = frame(ax + G.LA, G.RACK_Y, S.asl * 90);
    o += solid(K.cylinder(ax + G.LA, G.RACK_Y, 2.8, 8.8, 0.8, P, 20), { tone: "mid" });
    o += solid(box(Fr, 0, G.ARM, -1.1, 1.1, 9.6, 1.6, 0.3), { tone: "hi", lit: true, crease: "lo" });
    for (let j = 0; j < 4; j++) o += plunger(Fa, 6 + j * 9.5, j, strokeOf(j, 0), false);
    o += K.dotsSvg([Fa(3, -1.8), Fa(3, 1.8), Fa(G.LA - 3, -1.8), Fa(G.LA - 3, 1.8)].map(([x, y]) => at([x, y, 8.8])), { size: 0.42 });
    const [cx, cy] = frame(ax, G.RACK_Y, 0)(G.LA / 2, 0);
    put(depth(cx, cy), o);
  }
  {
    // support bar: hinged at the end of the kill zone, a half-turn (linear) to a quarter-turn (L)
    const ang = mix(180, 270, fm);
    const F = frame(G.PIVOT[0], G.PIVOT[1], ang);
    let o = `<path class="iso-halo" d="${box(F, -4, G.LS, -4, 4, 0, 0.1).fill}" style="filter:blur(3px)"/>`;
    for (const u of [8, G.LS - 4]) o += solid(box(F, u - 3, u + 3, -5, 5, 0, 2.8, 0.4), { tone: "mid" });
    o += solid(box(F, 0, G.LS, -3, 3, 2.8, 6, 0.5), { tone: "hi", crease: "lo" });
    o += line(K.onTop([F(0, 0), F(G.LS, 0)], 8.8, P), { tone: "faint" });
    for (let j = 0; j < 4; j++) o += plunger(F, 7 + j * 9.5, j, strokeOf(j, 1.3), false);
    // the hinge: a post and a knurled cap at the corner
    const [hx, hy] = G.PIVOT;
    o += solid(K.cylinder(hx, hy, 5, 0, 3, P, 28), { tone: "mid" });
    o += solid(K.cylinder(hx, hy, 3.2, 8.8, 2.6, P, 22), { tone: "mid" }) + line(K.knurl(hx, hy, 3.2, 8.8, 11.4, 18, P), { tone: "lo" });
    const [cx, cy] = F(G.LS / 2, 0);
    put(depth(cx, cy) + 0.02, o);
  }

  // ---- the security elements: two boom gates that swing across the track on initiation ----
  const shut = S.gate ?? (S.fire ? 1 : 0);
  const gateSvg = (g) => {
    const px = g.x, py = G.GATE_Y;
    const ang = mix(g.open, g.shut, shut);
    const F = frame(px, py, ang);
    let o = `<path class="iso-halo" d="${K.slabOf({ x: px - 5, y: py - 5, w: 10, d: 10, r: 2 }, 0, 0.1, P).fill}" style="filter:blur(2px)"/>`;
    o += solid(K.slabOf({ x: px - 4.5, y: py - 4.5, w: 9, d: 9, r: 1.5 }, 0, 2.4, P, 4, 0.4), { tone: "mid" });
    o += solid(K.cylinder(px, py, 2.1, 2.4, 9, P, 20), { tone: "mid", crease: "none" });
    o += solid(box(F, -7, 0, -1.4, 1.4, 10.6, 2.6, 0.3), { tone: "mid" });         // counterweight
    o += solid(box(F, 0, 25, -1, 1, 10.8, 2.2, 0.3), { tone: "hi", crease: "lo" });  // the boom
    o += solid(K.cylinder(px, py, 2.9, 11.4, 2, P, 20), { tone: "mid" });
    o += K.dotsSvg([at([px, py, 13.4])], { size: 0.45 });
    return o;
  };
  // drawn last so a boom always passes over the cars it crosses
  S.gates = G.GATES.map(gateSvg);
  items.sort((a, b) => a.key - b.key);
  for (const extra of S.statics || []) items.push({ key: 1e9, svg: extra.svg });
  return items.map((it) => it.svg).join("") + S.gates.join("");
}

// The dial needle for a share f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
