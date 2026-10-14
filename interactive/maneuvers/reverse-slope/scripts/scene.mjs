// The machine: a profile comb (slats cut to the hill's height), an enemy lamp carriage that rides it, the
// defender block, a sight line and two level gauges. Rebuilt per frame from the state, depth-sorted.
// Written against the kit as a parameter (K); build.mjs inlines this file with `export` stripped.
//   V.xe  enemy x (model units)      V.dx  defender x          V.see 1 when the enemy sees the platoon
//   V.fE  1 while the enemy fires    V.fB  1 while the platoon fires      V.op 0..1 observation post mast
//   V.blue, V.red 0..1 gauge levels  V.sel 0..1 selector (0 forward slope, 1 reverse slope)
//   V.hit  [x, z] where a blocked sight line ends (null when it reaches)
export const GEO = {
  SX: 0.66,           // bench units per model unit along the approach
  SLAT: 7.5,          // model units per slat
  X0: -150, N: 28,    // first slat edge, slat count
  ZS: 2.2,            // bench units of height per model unit
  Z0: 1.5,            // floor thickness of every slat
  Y: 12,              // half depth of the comb
  GAUGE_H: 36,
  PLATE: { x: -108, y: -34, w: 170, d: 66, r: 8 },
};
export const bx = (x) => GEO.SX * x;
export const slatX = (i) => GEO.X0 + GEO.SLAT * (i + 0.5);
export const slatTop = (i, ground) => GEO.Z0 + GEO.ZS * ground(slatX(i));
// height of the comb at model x
export const combZ = (x, ground) => {
  const i = Math.max(0, Math.min(GEO.N - 1, Math.floor((x - GEO.X0) / GEO.SLAT)));
  return slatTop(i, ground);
};
const SC_RAD = Math.PI / 180;

export function scene(K, P, V, ground, model) {
  const G = GEO, items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const S = (paths, style) => K.solidSvg(paths, style);
  const L = (d, style) => K.lineSvg(d, style);
  const Dt = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });

  // ---- the comb: one slat per 7.5 model units, cut to the ground's height ----
  for (let i = 0; i < G.N; i++) {
    const x = slatX(i), z = slatTop(i, ground), w = G.SLAT * G.SX;
    const plan = { x: bx(x) - w / 2 + 0.25, y: -G.Y, w: w - 0.5, d: 2 * G.Y, r: 0.5 };
    const crest = Math.abs(x) < 12;
    put(depth(bx(x), 0, z / 2),
      S(K.slabOf(plan, 0, z, P, 3, 0.35), { tone: "mid", crease: "lo", ...(crest && 0 ? { lit: true } : {}) }) +
      L(K.lineOnTop([bx(x) - w / 2 + 1.2, -G.Y + 2.4], [bx(x) + w / 2 - 1.2, -G.Y + 2.4], z, P), { tone: "faint" }));
  }
  // a rail along the back edge of the comb and its end stops
  {
    const rail = { x: bx(G.X0) - 2, y: -G.Y - 4.4, w: bx(G.X0 + G.N * G.SLAT) - bx(G.X0) + 4, d: 3.2, r: 1 };
    put(depth(0, -G.Y - 3, 2) - 40, S(K.slabOf(rail, 0, 3.2, P, 3, 0.4), { tone: "lo" }));
  }

  // ---- obstacle belts: three pegs and a wire on a slat top, forward slope and just below the crest ----
  for (const bxm of [model.belt.fwd, model.belt.rear]) {
    const z = combZ(bxm, ground), x = bx(bxm);
    for (const y of [-8, 0, 8]) put(depth(x, y, z + 2), S(K.cylinder(x, y, 0.8, z, 4.2, P, 10, 0.2), { tone: "mid", crease: "none" }));
    put(depth(x, 0, z + 4.4) + 0.4, L(K.pathOf([-8, 0, 8].map((y) => at([x, y, z + 4.2]))), { tone: "lo" }) + Dt([-8, 0, 8].map((y) => [x, y, z + 4.2]), 0.45));
  }

  // ---- the observation post at the crest: a mast that rises when the OP is manned ----
  {
    const x = bx(model.op), z = combZ(model.op, ground), h = 2 + 11 * V.op;
    put(depth(x, 6, z + h / 2) + 2,
      S(K.cylinder(x, 6, 2.2, z, 1.4, P, 16, 0.3), { tone: "mid" }) +
      S(K.cylinder(x, 6, 0.8, z + 1.4, h, P, 12), { tone: "mid", crease: "none" }) +
      (V.op > 0.5 ? S(K.cylinder(x, 6, 1.7, z + 1.4 + h, 1.6, P, 14, 0.3), { tone: "hi", crease: "lo" }) : ""));
  }

  // ---- the defender block: the platoon's line, on the slat it stands on ----
  {
    const x = bx(V.dx), z = combZ(V.dx, ground), w = 3 * G.SLAT * G.SX * 0.5;
    const plan = { x: x - 5.2, y: -9, w: 10.4, d: 18, r: 1.2 };
    put(depth(x, 0, z + 5) + 3,
      S(K.slabOf(plan, z, 2.2, P, 3, 0.4), { tone: "mid" }) +
      S(K.slabOf({ x: x - 3.2, y: -6.5, w: 6.4, d: 13, r: 1 }, z + 2.2, 5, P, 3, 0.4), { tone: "hi", lit: true, crease: "lo" }) +
      L(K.planOutline(K.insetPlan({ x: x - 3.2, y: -6.5, w: 6.4, d: 13 }, 1.4), z + 7.2, P), { tone: "faint" }) +
      Dt([[x - 3.8, -7.8, z + 2.2], [x + 3.8, 7.8, z + 2.2]], 0.4));
  }

  // ---- the enemy carriage: rides the comb; its lamp is the enemy's eye and its weapons ----
  const eyeZ = (x, eye) => combZ(x, ground) + G.ZS * eye;
  {
    const x = bx(V.xe), z = combZ(V.xe, ground);
    const plan = { x: x - 3.6, y: -6, w: 7.2, d: 12, r: 1.2 };
    put(depth(x, 0, z + 5) + 3,
      S(K.slabOf(plan, z, 3, P, 3, 0.4), { tone: "mid" }) +
      S(K.cylinder(x, 0, 2, z + 3, G.ZS * model.eyeE - 2.4 + 1.6, P, 18), { tone: "mid", crease: "none" }) +
      S(K.cylinder(x, 0, 2.7, z + G.ZS * model.eyeE + 2.2, 2.2, P, 20, 0.4), { tone: V.fE ? "hi" : "mid", crease: "lo" }) +
      Dt([[x - 2.6, -4.4, z + 3], [x + 2.6, 4.4, z + 3]], 0.4));
  }

  // ---- sight lines: the enemy's, from the top of its lamp to the top of the block or the slat that stops it ----
  {
    const ex = bx(V.xe), ez = combZ(V.xe, ground) + G.ZS * model.eyeE + 4.4, dxp = bx(V.dx), dz = combZ(V.dx, ground) + 7.2;
    const ok = !V.hit;
    const tx = ok ? dxp : bx(V.hit[0]), tz = ok ? dz : combZ(V.hit[0], ground);
    const style = V.fE ? { tone: "hi" } : { tone: "mid" };
    put(depth((ex + tx) / 2, -0.8, Math.max(ez, tz)) + 6, K.wireSvg(at([ex, -0.8, ez]), at([tx, -0.8, tz]), { ...style, size: 1.1 }));
    if (V.fB) put(depth((ex + dxp) / 2, 0.8, Math.max(ez, dz)) + 6, K.wireSvg(at([dxp, 0.8, dz]), at([ex, 0.8, ez]), { tone: "mid", size: 1.1 }));
  }

  // ---- the front rail: a ruler strip with the crest marked, and the in-view lamp ----
  {
    const ru = { x: bx(G.X0) + 4, y: G.Y + 6, w: bx(G.X0 + G.N * G.SLAT) - bx(G.X0) - 8, d: 5, r: 1 };
    put(depth(0, ru.y + 2.5, 0.4) + 30,
      S(K.slabOf(ru, 0, 0.8, P, 3), { tone: "lo", crease: "none" }) +
      (() => { const t = K.topTicks(ru.x + 3, ru.x + ru.w - 3, 5, 5, ru.y, 0.8, [1.4, 2.6], P, "x"); return L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }); })() +
      S(K.slabOf({ x: bx(0) - 0.7, y: ru.y + 0.6, w: 1.4, d: 3.8, r: 0.3 }, 0.8, 0.6, P, 3), { tone: "hi", crease: "none" }));
    const lx = bx(G.X0 + G.N * G.SLAT) - 14, ly = G.Y + 8.5, on = V.see > 0.5;
    put(depth(lx, ly, 3) + 30,
      S(K.slabOf({ x: lx - 5, y: ly - 4, w: 10, d: 8, r: 1.5 }, 0, 3, P, 3, 0.4), { tone: "mid" }) +
      S(K.cylinder(lx, ly, 2.5, 3, 1.6, P, 22, 0.3), { tone: "mid" }) +
      S(K.cylinder(lx, ly, 1.9, 4.6, 2.4, P, 20, 0.6), on ? { tone: "hi", crease: "lo" } : { tone: "lo", crease: "lo" }) +
      (on ? L(K.ring(lx, ly, 3, 3.2, P, 24), { tone: "mid" }) : ""));
  }

  // ---- two level gauges: the platoon's men down and the attack's ----
  [["blue", 0], ["red", 1]].forEach(([k, n]) => {
    const gx = bx(G.X0 + G.N * G.SLAT) - 8 - n * 0, gy = -14 + n * 14, f = Math.max(0, Math.min(1, V[k])), h = G.GAUGE_H;
    let rings = ""; for (let z = 6; z <= h; z += 4) rings += K.sideArc(gx + 4, gy, 3, z, P, 14);
    put(depth(gx + 4, gy, h / 2) + 14,
      S(K.slabOf({ x: gx - 2, y: gy - 6, w: 12, d: 12, r: 2 }, 0, 3, P, 3, 0.5), { tone: "mid" }) +
      S(K.cylinder(gx + 4, gy, 3, 3, h, P, 20), { tone: "mid", crease: "none", inner: L(rings, { tone: "faint" }) }) +
      S(K.cylinder(gx + 4, gy, 4.2, 5 + f * (h - 8), 2.6, P, 22, 0.4), { tone: k === "red" ? "hi" : "mid", crease: "lo" }) +
      S(K.cylinder(gx + 4, gy, 3.4, h + 3, 1.2, P, 20, 0.3), { tone: "mid" }));
  });

  // ---- the selector knob at the left end of the plate: forward slope or reverse slope ----
  {
    const kx = bx(G.X0) - 4, ky = G.Y + 16, a = (-40 + 80 * V.sel) * SC_RAD, sx = Math.sin(a), sy = -Math.cos(a);
    put(depth(kx, ky, 3) + 30,
      S(K.cylinder(kx, ky, 5, 0, 2.2, P, 28, 0.4), { tone: "mid" }) +
      S(K.cylinder(kx, ky, 3.4, 2.2, 3, P, 28, 0.5), { tone: "hi", crease: "lo" }) +
      L(K.knurl(kx, ky, 3.4, 2.5, 4.6, 28, P, 0.3), { tone: "lo" }) +
      `<path class="iso-line" data-tone="lo" data-free="" d="${K.lineOnTop([kx - sx * 0.4, ky - sy * 0.4], [kx + sx * 5.8 * 0.7, ky + sy * 5.8 * 0.7], 5.4, P)}" style="stroke-width:1"/>`);
  }
  items.sort((a, b) => a.key - b.key);
  return items.map((i) => i.svg).join("");
}
