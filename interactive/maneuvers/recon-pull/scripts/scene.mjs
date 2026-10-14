// The moving half of the recon-pull bench: the gate wall with its shutters, the scout
// carriage riding the wall top, the diverter, the plan peg, the escapement pawl and the
// marbles. Rebuilt per frame and depth sorted. Written against the kit as a parameter (K)
// so build.mjs (Node) and the page (inlined kit) run the same code.

export const GEO = {
  BOARD_Z: 3.8,          // track board top
  WALL: [-40, -36],      // gate wall, y
  WALL_H: 17,            // wall top
  HALF: 6,               // half width of a gate opening
  SILL: 3.2,             // opening sill top
  LINTEL: 13,            // lintel underside
  SHUT_Y: [-38.8, -37.2],
  WALL_X: [-78, 78],
  DIV_Y: [29, 33],       // diverter rail
  PEG_Y: 43,             // plan-peg strip centre line
  PEG_PARK: -72,         // where the peg rests in pull mode
};

// Per-item markup cache: an item's markup is rebuilt only when one of its inputs changes, so
// the output is byte-identical to building it fresh; cleared when the projection changes.
let memoP = null, memoMap = new Map();
function sceneMemo(P, parts, make) {
  if (P !== memoP) { memoP = P; memoMap = new Map(); }
  const key = parts.join("|");
  let svg = memoMap.get(key);
  if (svg === undefined) { if (memoMap.size > 4000) memoMap.clear(); svg = make(); memoMap.set(key, svg); }
  return svg;
}

export function scene(K, P, S, M) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const box = (x0, x1, y0, y1, z0, h, bevel = 0) => K.extrude([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, h, P, { bevel });
  const [WY0, WY1] = GEO.WALL;
  const H = GEO.WALL_H;
  const kz = P.scale * Math.sqrt(1.6);

  // ---- gate wall: panels between the openings, a lintel over each opening, a shutter in each ----
  const L = M.lanes;
  const edges = [GEO.WALL_X[0], ...L.flatMap((x) => [x - GEO.HALF, x + GEO.HALF]), GEO.WALL_X[1]];
  for (let k = 0; k < edges.length; k += 2) {
    const x0 = edges[k], x1 = edges[k + 1];
    put(depth((x0 + x1) / 2, (WY0 + WY1) / 2), sceneMemo(P, ["panel", x0, x1], () => {
      const top = K.planOutline(K.insetPlan({ x: x0, y: WY0, w: x1 - x0, d: WY1 - WY0, r: 0 }, 1.1), H, P, 2);
      return solid(box(x0, x1, WY0, WY1, 0, H, 0.4), { tone: "mid" }) + line(top, { tone: "faint" }) +
        K.dotsSvg([[x0 + 2.4, -38], [x1 - 2.4, -38]].map(([x, y]) => at([x, y, H])), { size: 0.4 });
    }));
  }
  L.forEach((x, i) => {
    const shut = S.shut[i];
    put(shut < 0.12 ? -1e4 + i : depth(x, -38), sceneMemo(P, ["shutter", x, shut], () => {
    const sh = 0.6 + (GEO.LINTEL - GEO.SILL - 0.6) * shut;
    const plate = solid(box(x - GEO.HALF, x + GEO.HALF, GEO.SHUT_Y[0], GEO.SHUT_Y[1], GEO.SILL, sh, 0.2), { tone: shut > 0.5 ? "hi" : "mid", crease: "lo" });
    let slats = "";
    if (shut > 0.3) for (const f of [0.38, 0.68]) {
      const z = GEO.SILL + sh * f;
      slats += line(K.segment([x - GEO.HALF, GEO.SHUT_Y[1], z], [x + GEO.HALF, GEO.SHUT_Y[1], z], P), { tone: "lo" });
    }
    const rivets = shut > 0.15 ? K.dotsSvg([[x - 3.6, GEO.SHUT_Y[1]], [x + 3.6, GEO.SHUT_Y[1]]].map(([px, py]) => at([px, py, GEO.SILL + sh - 1.4])), { size: 0.4 }) : "";
    // a sunk shutter lies under everything that rolls over it
    return plate + slats + rivets;
    }));
    put(depth(x, -38) + 0.01, sceneMemo(P, ["lintel", x], () =>
      solid(box(x - GEO.HALF, x + GEO.HALF, WY0, WY1, GEO.LINTEL, H - GEO.LINTEL, 0.3), { tone: "mid" })));
  });

  // ---- scout carriage on the wall top: the lit part to watch ----
  {
    const x = S.scout.x;
    const tip = 15 - 7 * S.scout.dip;
    put(1e4, sceneMemo(P, ["scout", x, tip], () => {
    let out = `<path class="iso-halo" d="${box(x - 8, x + 8, -42, -34, H, 0.1).fill}" style="filter:blur(2px)"/>`;
    const shoes = [-6.6, 3.6];
    // guide rollers clamp the wall from behind and in front
    for (const sx of shoes) out += solid(box(x + sx, x + sx + 3, -41.4, -40, H - 3.4, 4.8, 0.2), { tone: "mid" });
    out += solid(box(x - 7.5, x + 7.5, -41.4, -34.6, H + 1.4, 5.6, 0.5), { tone: "hi", lit: true, crease: "lo" });
    out += line(K.lineOnTop([x - 7.5, -38], [x + 7.5, -38], H + 7, P), { tone: "lo" });
    out += K.dotsSvg([[x - 5.8, -40], [x + 5.8, -40], [x - 5.8, -36], [x + 5.8, -36]].map(([px, py]) => at([px, py, H + 7])), { size: 0.45 });
    for (const sx of shoes) out += solid(box(x + sx, x + sx + 3, -36, -34.6, H - 3.4, 4.8, 0.2), { tone: "mid" });
    // the arm reaching forward over the gate and the feeler that drops to probe it
    out += solid(box(x - 1.6, x + 1.6, -34.6, -29.6, H + 4, 2, 0.3), { tone: "hi", lit: true, crease: "none" });
    out += solid(K.cylinder(x, -31.2, 0.8, tip, H + 4 - tip, P, 12), { tone: "lit", lit: true, crease: "none" });
    out += solid(K.cylinder(x, -31.2, 1.6, tip - 1, 1.2, P, 16, 0.3), { tone: "lit", lit: true, crease: "none" });
    out += solid(K.cylinder(x - 3, -38, 2, H + 7, 2.2, P, 18), { tone: "mid" }) + line(K.knurl(x - 3, -38, 2, H + 7, H + 9.2, 14, P), { tone: "lo" });
    return out;
    }));
  }

  // ---- diverter carriage and its finger across the feeder ----
  {
    const x = S.divX;
    const [r0, r1] = GEO.DIV_Y;
    const BZ = GEO.BOARD_Z;
    put(depth(x, (r0 + r1) / 2), sceneMemo(P, ["diverter", x, M.feedY], () => {
    let car = `<path class="iso-halo" d="${box(x - 7, x + 7, r0 - 3, r1 + 3, BZ, 0.1).fill}" style="filter:blur(2.5px)"/>`;
    car += solid(K.slabOf({ x: x - 6.5, y: r0 - 2.5, w: 13, d: r1 - r0 + 5, r: 1.2 }, BZ + 2, 4.4, P, 3, 0.4), { tone: "mid" });
    car += line(K.lineOnTop([x - 6.5, (r0 + r1) / 2], [x + 6.5, (r0 + r1) / 2], BZ + 6.4, P), { tone: "faint" });
    car += K.dotsSvg([[x - 4.8, r0 - 1], [x + 4.8, r0 - 1], [x - 4.8, r1 + 1], [x + 4.8, r1 + 1]].map(([px, py]) => at([px, py, BZ + 6.4])), { size: 0.4 });
    car += solid(K.cylinder(x - 1.5, r1 + 0.2, 2.2, BZ + 6.4, 2.4, P, 18), { tone: "mid" }) + line(K.knurl(x - 1.5, r1 + 0.2, 2.2, BZ + 6.4, BZ + 8.8, 14, P), { tone: "lo" });
    // the arm runs from the carriage top back over the feeder and rests on the stop plate
    car += solid(box(x + 3.4, x + 6.6, M.feedY + 1, r0 + 1, BZ + 6.4, 1.6, 0.2), { tone: "mid" });
    car += K.dotsSvg([at([x + 5, r0 - 0.6, BZ + 8]), at([x + 5, M.feedY + 2.4, BZ + 8])], { size: 0.4 });
    return car;
    }));
    // finger: a bar from the carriage back across the feeder, a stop plate on its end
    put(depth(x + 5, M.feedY + 2), sceneMemo(P, ["finger", x, M.feedY], () =>
      solid(box(x + 4.2, x + 5.8, M.feedY - 3.6, M.feedY + 3.6, BZ + 0.4, 6, 0.2), { tone: "hi", crease: "lo" })));
  }

  // ---- plan peg: in the planned socket for push, parked for pull ----
  {
    const x = S.pegX, y = GEO.PEG_Y, z = GEO.BOARD_Z + 1.2 + S.pegLift;
    put(depth(x, y), sceneMemo(P, ["peg", x, z], () =>
      `<path class="iso-halo" d="${K.cylinder(x, y, 2.6, GEO.BOARD_Z + 1.2, 0.1, P, 18).fill}" style="filter:blur(1.5px)"/>` +
      solid(K.cylinder(x, y, 1.3, z, 5, P, 14), { tone: "mid", crease: "none" }) +
      solid(K.cylinder(x, y, 2.6, z + 5, 2.4, P, 22, 0.3), { tone: "hi", crease: "lo" }) +
      line(K.knurl(x, y, 2.6, z + 5, z + 7.4, 16, P), { tone: "lo" })));
  }

  // ---- escapement pawl at the magazine head: across the groove, or drawn back ----
  {
    const x = M.magX + M.r + 1.6;
    const y0 = M.feedY - 4.6 + S.pawl * 9.6;
    const gy = M.feedY + 9;
    put(depth(x, gy), sceneMemo(P, ["pawl", x, y0, gy], () =>
      solid(box(x - 0.9, x + 0.9, y0, gy - 1.8, GEO.BOARD_Z + 0.5, 2.4, 0.2), { tone: "mid", crease: "none" }) +
      solid(box(x - 3.2, x + 3.2, gy - 1.8, gy + 2.6, GEO.BOARD_Z, 4.6, 0.3), { tone: "mid" }) +
      K.dotsSvg([at([x - 1.8, gy + 0.4, GEO.BOARD_Z + 4.6]), at([x + 1.8, gy + 0.4, GEO.BOARD_Z + 4.6])], { size: 0.4 })));
  }

  // ---- marbles ----
  const ball = ([x, y, z], alpha, lit) => {
    const [cx, cy] = at([x, y, z]);
    const r = M.r * kz;
    const floor = z - M.r;
    const op = alpha < 1 ? ` opacity="${Math.max(0, alpha).toFixed(2)}"` : "";
    return `<g class="rp-ball"${op}><path class="rp-shadow" d="${K.cylinder(x + 0.8, y + 0.4, M.r * 0.9, floor, 0.01, P, 16).fill}"/>` +
      `<circle class="rp-body" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}"/>` +
      `<circle class="rp-shine" cx="${(cx - r * 0.32).toFixed(1)}" cy="${(cy - r * 0.36).toFixed(1)}" r="${(r * 0.46).toFixed(2)}"/>` +
      `<circle class="rp-rim" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}"/></g>`;
  };
  for (const [list, alpha] of [[S.prev || [], S.prevAlpha ?? 0], [S.marbles, S.alpha ?? 1]]) {
    if (alpha <= 0.02) continue;
    for (const p of list) put(depth(p[0], p[1]), ball(p, alpha));
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  if (S.items) return items; // the page patches its live layer item by item
  return items.map((item) => item.svg).join("");
}

// Stopwatch needle for t seconds on a 0..10 s dial with a 270 degree sweep.
export function needle(K, P, D, t) {
  const f = Math.max(0, Math.min(1, t / 10));
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
