// The moving half of the figure: the line-of-effort sliders, the line-of-operation
// carriages and their decisive-point gates, and the terminal with its five lock pins
// and the lit end-state block. Rebuilt per frame. Written against the kit as a
// parameter (K) so build.mjs (Node) and the page (inlined kit) run the same code.
// build.mjs inlines this file with `export` stripped.

export const GEO = {
  TERM: { x: 114, y: -72, w: 26, d: 112, r: 2 }, // terminal housing plan
  TH: 16,                                         // terminal height
  PIN_X: 121,                                     // lock pins on the terminal top
  ES: { x: 131, y: -16 },                         // end-state block centre
  LOE_Y: [-62, -44, -26],                         // line-of-effort bar centres (far to near)
  RISER: { x: -128, y: -71, w: 240, d: 54, r: 2 }, // the rack the bars stand on
  RZ: 5,                                          // riser top
  BZ: 9,                                          // bar top
  SX: [-113, 100],                                // slider centre travel, x
  LOO: [                                          // line-of-operation tracks: start, end
    { s: [-118, 62], e: [113, 32] },
    { s: [-116, 4], e: [113, 10] },
  ],
  CAR: 7.5,                                       // carriage half length (along the track)
};

const SC_ROUND = (v) => Math.round(v * 100) / 100;

// Unit frame of a track: along a, across n (n points to +y side), length len.
export function trackFrame(T) {
  const dx = T.e[0] - T.s[0], dy = T.e[1] - T.s[1];
  const len = Math.hypot(dx, dy);
  const a = [dx / len, dy / len];
  const n = [-a[1], a[0]];
  const at = (u, v) => [SC_ROUND(T.s[0] + a[0] * u + n[0] * v), SC_ROUND(T.s[1] + a[1] * u + n[1] * v)];
  return { len, a, n, at, u0: GEO.CAR + 1, u1: len - GEO.CAR };
}

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map((p) => at(p)), { size });
  const quad = (F, u0, u1, v0, v1, z0, h, bevel = 0) => K.extrude([F.at(u0, v0), F.at(u1, v0), F.at(u1, v1), F.at(u0, v1)], z0, h, P, { bevel });

  // ---- lines of effort: one slider per bar, then its condition stop ----
  GEO.LOE_Y.forEach((by, i) => {
    const p = S.p[2 + i];
    const cx = GEO.SX[0] + (GEO.SX[1] - GEO.SX[0]) * p;
    const z = GEO.BZ;
    const plan = { x: cx - 6, y: by - 5.5, w: 12, d: 11, r: 1.2 };
    let out = `<path class="iso-halo" d="${K.slabOf(plan, z, 0.1, P).fill}" style="filter:blur(2px)"/>`;
    out += solid(K.slabOf(plan, z, 5, P, 3, 0.5), { tone: "hi", crease: "lo", inner: line(K.sideSeam(plan, z + 2, P, 3), { tone: "faint" }) });
    out += dots([[cx - 4.4, by - 3.9, z + 5], [cx + 4.4, by - 3.9, z + 5], [cx - 4.4, by + 3.9, z + 5], [cx + 4.4, by + 3.9, z + 5]]);
    out += solid(K.cylinder(cx, by, 2.4, z + 5, 3, P, 20), { tone: "mid" }) + line(K.knurl(cx, by, 2.4, z + 5, z + 8, 16, P), { tone: "lo" });
    // index mark on the slider's near flank points at the detent it sits on
    out += line(K.segment([cx, by + 5.5, z], [cx, by + 5.5, z + 5], P), { tone: "mid" });
    put(-1e4 + i * 10, out);
    // condition stop at the end of the bar
    const stop = { x: 106, y: by - 5, w: 6, d: 10, r: 1 };
    put(-1e4 + i * 10 + 5, solid(K.slabOf(stop, z, 7, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(stop, z + 3.5, P, 3), { tone: "faint" }) }) +
      dots([[109, by - 2.6, z + 7], [109, by + 2.6, z + 7]]));
  });

  // ---- lines of operation: gates at decisive points and the carriages ----
  GEO.LOO.forEach((T, i) => {
    const F = trackFrame(T);
    const line0 = S.lines[i];
    for (const f of line0.dps) {
      const u = F.u0 + (F.u1 - F.u0) * f;
      const [fx, fy] = F.at(u, -10), [nx, ny] = F.at(u, 10);
      const post = (x, y) =>
        solid(K.cylinder(x, y, 2.8, 0, 1.2, P, 20), { tone: "lo" }) +
        solid(K.cylinder(x, y, 1.6, 1.2, 12.4, P, 16), { tone: "mid", crease: "none", inner: line(K.sideArc(x, y, 1.6, 7, P, 12), { tone: "faint" }) });
      put(depth(fx, fy), post(fx, fy));
      const beam = solid(quad(F, u - 1.6, u + 1.6, -11.6, 11.6, 13.6, 2.2, 0.3), { tone: "mid" }) +
        dots([[...F.at(u, -10), 15.8], [...F.at(u, 10), 15.8]]);
      put(depth(nx, ny), post(nx, ny) + beam);
    }
    const u = F.u0 + (F.u1 - F.u0) * S.p[i];
    const [cx, cy] = F.at(u, 0);
    const C = GEO.CAR;
    let out = `<path class="iso-halo" d="${quad(F, u - C - 1, u + C + 1, -7, 7, 3, 0.1).fill}" style="filter:blur(2px)"/>`;
    out += solid(quad(F, u - C, u + C, -6.4, 6.4, 3, 5, 0.5), { tone: "hi", crease: "lo" });
    out += solid(quad(F, u + C, u + C + 1.2, -4, 4, 3.8, 3, 0.2), { tone: "mid" });
    out += line(K.onTop([F.at(u - C + 2.4, -4.2), F.at(u + C - 2.4, -4.2), F.at(u + C - 2.4, 4.2), F.at(u - C + 2.4, 4.2)], 8, P, true), { tone: "faint" });
    out += dots([[...F.at(u - C + 1.2, -5.2), 8], [...F.at(u + C - 1.2, -5.2), 8], [...F.at(u - C + 1.2, 5.2), 8], [...F.at(u + C - 1.2, 5.2), 8]]);
    out += solid(K.cylinder(cx, cy, 2.4, 8, 3, P, 20), { tone: "mid" }) + line(K.knurl(cx, cy, 2.4, 8, 11, 16, P), { tone: "lo" });
    put(depth(cx, cy), out);
  });

  // ---- terminal: housing, lock pins, end-state block ----
  for (const extra of S.statics || []) put(extra.key, extra.svg);
  const top = GEO.TH;
  S.pinY.forEach((py, i) => {
    const h = 1 + 4.5 * S.pins[i];
    put(1e4 + depth(GEO.PIN_X, py) * 1e-3, solid(K.cylinder(GEO.PIN_X, py, 1.7, top + 2.4, h, P, 16), { tone: S.pins[i] > 0.5 ? "hi" : "mid", crease: "lo" }) +
      line(K.ring(GEO.PIN_X, py, 0.8, top + 2.4 + h, P, 10), { tone: "faint" }));
  });
  const es = { x: GEO.ES.x - 6, y: GEO.ES.y - 6, w: 12, d: 12, r: 1.2 };
  const eh = 1.6 + 16 * S.es;
  put(2e4, solid(K.slabOf(es, top + 2.4, eh, P, 3, 0.5), { tone: "hi", lit: true, crease: "lo" }) +
    line(K.planOutline(K.insetPlan(es, 2), top + 2.4 + eh, P, 3), { tone: "lit" }));
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}
