// The machine view's moving parts, rebuilt per frame: a four-pin sequential lock (one pin per point to
// clear), an interlock bar that grows as pins set, a lit key carriage that advances only when the pin
// before it is set, a second carriage that holds the last pin, a turntable that swaps the lead team,
// a shield for the support element, a row of enemy pegs, a dial, a wear bar and a loss rack. Written
// against the kit as a parameter (K) so build.mjs (Node) and the page (inlined kit) run the same code.
export const GEO = {
  RAIL_Y: 10,         // the key carriage's rail
  RAIL2_Y: 27,        // the securing carriage's rail
  X0: -80, X1: 90,
  ST_X: [-45, -15, 15, 45],
  ST_Y: -36,
  PEG_Y: -8,
  SHIELD_X: -66,
  DIAL: { x: 60, y: 50, r: 11, z: 6, h: 6 },
  RACK: { x: -70, y: 47 },
  WEAR: { x: 14, y: 50 },
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;
export const lerp = (a, b, t) => a + (b - a) * t;
// position along the rail for p points set (0 = entry point)
export const kx = (p) => -75 + 30 * p;

export function scene(K, P, S, M) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const G = GEO;
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const box = (cx, cy, w, d, z, h, style = {}, r = 0.6) => solid(K.slabOf({ x: cx - w / 2, y: cy - d / 2, w, d, r }, z, h, P, 3, 0.2), { tone: "mid", crease: "none", ...style });

  // ---- the two rails with sleepers ----
  for (const ry of [G.RAIL_Y, G.RAIL2_Y]) {
    for (let x = G.X0 + 4; x <= G.X1 - 4; x += 16) put(-1e5 + x, box(x, ry, 3, 14, 0, 0.8, { tone: "lo" }, 0.3));
    for (const dy of [-4.5, 4.5]) put(-1e5 + 200 + dy, box((G.X0 + G.X1) / 2, ry + dy, G.X1 - G.X0, 1.4, 0.8, 1.2, { tone: "mid" }, 0.3));
  }

  // ---- the four stations: a pin that drops when its point is set (rises again if the point is re-entered) ----
  G.ST_X.forEach((sx, i) => {
    const up = !S.set[i] || (i === 1 && S.reopen);
    const cur = i === S.nSet && S.released && !S.cleared;
    let out = "";
    const plan = { x: sx - 9, y: G.ST_Y - 7, w: 18, d: 14, r: 1.4 };
    out += solid(K.slabOf(plan, 0, 11, P, 3, 0.4), { tone: "mid", inner: line(K.sideSeam(plan, 5.5, P, 3), { tone: "faint" }) });
    out += line(K.planOutline(K.insetPlan(plan, 2.4), 11, P), { tone: "faint" });
    out += solid(K.cylinder(sx, G.ST_Y, 3.4, 11, 0.6, P, 18), { tone: "lo", crease: "none" });
    const pinTop = 11 + (up ? 9 : 0.4);
    out += solid(K.cylinder(sx, G.ST_Y, 1.5, 11.4, pinTop - 11.4, P, 14), { tone: "hi", crease: "none" });
    out += solid(K.cylinder(sx, G.ST_Y, 3, pinTop, 2.2, P, 18, 0.3), { tone: cur ? "hi" : "lo", crease: "lo" });
    const dots = [];
    for (let k = 0; k <= i; k++) dots.push(at([sx - 6 + k * 3, G.ST_Y + 7, 5.5]));
    out += K.dotsSvg(dots, { size: 0.5 });
    put(depth(sx, G.ST_Y, 0), out);
  });
  // ---- the interlock bar: grows to the pin that is set, in order ----
  {
    const x0 = G.ST_X[0] - 10;
    const head = Math.min(G.ST_X[3] + 12, kx(S.p) + (S.p > 0 ? 0 : -3) + 0);
    const w = Math.max(4, head - x0);
    put(depth(x0 + w / 2, G.ST_Y + 12, 3), box(x0 + w / 2, G.ST_Y + 14, w, 3, 2, 3, { tone: "hi" }, 0.4));
    put(depth(x0 + w / 2, G.ST_Y + 12, 0) - 0.2, box((x0 + G.ST_X[3] + 14) / 2, G.ST_Y + 14, G.ST_X[3] + 14 - x0, 4.4, 0, 2, { tone: "lo" }, 0.4));
    G.ST_X.forEach((sx, i) => { if (S.set[i] && !(i === 1 && S.reopen)) put(depth(sx, G.ST_Y + 9, 0) + 0.1, box(sx, G.ST_Y + 9, 1.6, 5, 2, 3.5, { tone: "mid" }, 0.3)); });
  }

  // ---- the enemy: one peg behind each station, down when its point is set; a fifth if one re-enters ----
  {
    const upAt = (i) => S.released ? !(S.t >= S.T[i] - 0.7) : true;
    const pegs = G.ST_X.map((sx, i) => ({ x: sx, up: upAt(i) }));
    if (S.extra && S.t < S.T[1] + M.back + M.reclear - 0.0) pegs.push({ x: G.ST_X[1] + 8, up: true });
    pegs.forEach((pg) => {
      const px = pg.x, py = G.PEG_Y;
      let out = box(px, py, 9, 6, 0, 1.4, { tone: "lo" }, 0.8);
      out += pg.up ? solid(K.cylinder(px, py, 1.2, 1.4, 6.5, P, 12), { tone: "hi", crease: "none" }) + solid(K.cylinder(px, py, 2.1, 7.9, 1.8, P, 14, 0.2), { tone: "mid", crease: "lo" })
        : solid(K.slabOf({ x: px - 3, y: py - 1, w: 6, d: 2, r: 0.4 }, 1.4, 0.8, P, 1), { tone: "lo", crease: "none" });
      put(depth(px, py, 0), out);
    });
  }

  // ---- the shield for the support element: up when support fires are applied ----
  {
    const sx = G.SHIELD_X, h = S.support ? 10 : 1.2;
    let out = box(sx, 18, 3, 52, 0, 1.2, { tone: "lo" }, 0.6);
    out += box(sx, 18, 1.4, 50, 1.2, h, { tone: S.support ? "mid" : "lo", crease: "lo" }, 0.4);
    if (S.support) out += K.dotsSvg([at([sx, -4, 9]), at([sx, 40, 9])], { size: 0.4 });
    put(depth(sx, 18, 0) + 0.2, out);
  }

  // ---- the securing carriage: holds the last point, one pin behind the key (or crowds it when nobody holds) ----
  {
    const pTr = S.secure ? Math.max(0, S.p - 1) : Math.max(0, S.p - 0.25);
    const cx = kx(pTr), y = G.RAIL2_Y;
    let out = "";
    for (const dx of [-4, 4]) for (const dy of [-5.6, 5.6]) out += solid(K.cylinder(cx + dx, y + dy, 1.6, 0, 1.8, P, 14), { tone: "lo", crease: "none" });
    out += solid(K.slabOf({ x: cx - 6.5, y: y - 4.5, w: 13, d: 9, r: 1.4 }, 1.4, 6, P, 3, 0.4), { tone: "mid", crease: "lo" });
    out += line(K.planOutline(K.insetPlan({ x: cx - 6.5, y: y - 4.5, w: 13, d: 9, r: 1.4 }, 1.8), 7.4, P), { tone: "faint" });
    out += solid(K.cylinder(cx - 1, y, 2, 7.4, 1.8, P, 16), { tone: S.secure ? "hi" : "lo", crease: "lo" });
    put(depth(cx, y, 0) + 0.5, out);
  }
  // ---- the key carriage: the lit part. A turntable on it swaps the lead team when the teams alternate ----
  {
    const cx = kx(S.p), y = G.RAIL_Y;
    let out = "";
    for (const dx of [-4.5, 4.5]) for (const dy of [-5.6, 5.6]) out += solid(K.cylinder(cx + dx, y + dy, 1.7, 0, 1.8, P, 14), { tone: "lo", crease: "none" });
    out += solid(K.slabOf({ x: cx - 7, y: y - 4.5, w: 14, d: 9, r: 1.4 }, 1.4, 8, P, 3, 0.4), { tone: "hi", lit: true, crease: "lo" });
    out += line(K.planOutline(K.insetPlan({ x: cx - 7, y: y - 4.5, w: 14, d: 9, r: 1.4 }, 1.8), 9.4, P), { tone: "faint" });
    out += solid(K.cylinder(cx, y, 3, 9.4, 1.6, P, 20), { tone: "mid", crease: "lo" });
    const a = S.alt ? Math.PI * S.p : 0;
    const sx = Math.cos(a), sy = Math.sin(a);
    out += `<path class="iso-line" data-tone="lit" data-free="" d="${K.lineOnTop([cx - sx * 2.4, y - sy * 2.4], [cx + sx * 2.4, y + sy * 2.4], 11.1, P)}" style="stroke-width:1.1"/>`;
    put(depth(cx, y, 0) + 0.6, out);
  }

  // ---- the dial: points set, 0..4 ----
  {
    const D = G.DIAL;
    let out = "";
    const ped = { x: D.x - 15, y: D.y - 15, w: 30, d: 30, r: 3 };
    out += `<path class="iso-halo" d="${K.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    out += solid(K.slabOf(ped, 0, 3.6, P, 5, 0.6), { tone: "mid" });
    out += line(K.planOutline(K.insetPlan(ped, 2.6), 3.6, P), { tone: "faint" });
    out += K.dotsSvg(K.corners(ped, 3.2).map(([x, y]) => at([x, y, 3.6])), { size: 0.45 });
    out += solid(K.cylinder(D.x, D.y, 5, 3.6, 2.4, P, 28), { tone: "mid" });
    out += solid(K.cylinder(D.x, D.y, D.r, D.z, D.h, P, 72, 0.8), { tone: "hi", crease: "lo" });
    out += line(K.knurl(D.x, D.y, D.r, D.top - 2.8, D.top, 64, P, 0.3), { tone: "lo" });
    out += line(K.ring(D.x, D.y, D.r - 1.8, D.top, P, 72), { tone: "lo" });
    const t = K.radialTicks(D.x, D.y, D.r - 1.8, 16, 4, D.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    out += `<path class="iso-line" data-tone="lit" data-free="" d="${needle(K, P, D, S.p / 4)}" style="stroke-width:1.1"/>`;
    out += line(K.ring(D.x, D.y, 1.4, D.top, P, 16), { tone: "mid" });
    put(depth(D.x, D.y), out);
  }
  // ---- the wear bar: how fresh the lead team is (it only falls when one team keeps the lead) ----
  {
    const W = G.WEAR, len = 26;
    let out = solid(K.slabOf({ x: W.x - 2, y: W.y - 5, w: len + 4, d: 10, r: 1.4 }, 0, 2, P, 3, 0.4), { tone: "mid" });
    out += solid(K.slabOf({ x: W.x, y: W.y - 2, w: len, d: 4, r: 0.6 }, 2, 0.6, P, 1), { tone: "lo", crease: "none" });
    const f = Math.max(0.5, len * (1 - 0.7 * S.wear));
    out += solid(K.slabOf({ x: W.x, y: W.y - 2, w: f, d: 4, r: 0.6 }, 2.6, 1.2, P, 2), { tone: "hi", crease: "none" });
    put(depth(W.x + len / 2, W.y), out);
  }
  // ---- the loss rack: nine pegs for the squad, five for the enemy, each laid flat when lost ----
  {
    const R = G.RACK;
    let out = solid(K.slabOf({ x: R.x - 4, y: R.y - 4, w: 60, d: 22, r: 1.5 }, 0, 2, P, 3, 0.4), { tone: "mid" });
    for (let i = 0; i < 9; i++) {
      const px = R.x + 2 + i * 5.5, py = R.y + 2;
      out += i < S.downF ? solid(K.slabOf({ x: px - 1.6, y: py - 0.6, w: 3.2, d: 1.2, r: 0.3 }, 2, 0.5, P, 1), { tone: "lo", crease: "none" })
        : solid(K.cylinder(px, py, 0.9, 2, 3.4, P, 10), { tone: "hi", crease: "none" });
    }
    for (let i = 0; i < 5; i++) {
      const px = R.x + 2 + i * 5.5, py = R.y + 11;
      out += i < S.downE ? solid(K.slabOf({ x: px - 1.6, y: py - 0.6, w: 3.2, d: 1.2, r: 0.3 }, 2, 0.5, P, 1), { tone: "lo", crease: "none" })
        : solid(K.cylinder(px, py, 0.9, 2, 3.4, P, 10), { tone: "mid", crease: "none" });
    }
    put(depth(R.x + 26, R.y + 8) + 3, out);
  }

  items.sort((a, b) => a.key - b.key);
  return items.map((i) => i.svg).join("");
}

export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + Math.min(1, Math.max(0, f)) * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.2), D.y + sy * (D.r - 3.2)], D.top + 0.2, P);
}
