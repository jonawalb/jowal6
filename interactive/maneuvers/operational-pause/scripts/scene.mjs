// Everything above the base plate: two ram units (cylinder block, tank, sight glass,
// rod, crosshead), the shared pump with its header, the anvil on springs and the dial.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  AZ: 40,
  UY: [-40, 40],          // unit A, unit B centre lines (y)
  TX: -90,                // tank, block and header x
  XC: [-44, 32],          // crosshead centre: home, on the anvil
  ANVIL: 40,              // anvil face x
  HEADER_Z: 67.2,
  GLASS: [25.6, 44.4],    // sight-glass bottom and top
  DIAL: { x: 106, y: -44, r: 15, z: 22, h: 8 },
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;

const SC_RAD = Math.PI / 180;

// Items that never move, each with its painter's key. Built once.
export function statics(K, P) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const S = (paths, style) => K.solidSvg(paths, style);
  const L = (d, style) => K.lineSvg(d, style);
  const D = (pts, style) => K.dotsSvg(pts, style);
  const [vx, vy] = K.towardViewer(P);
  const { TX, HEADER_Z: HZ } = GEO;
  const pipeY = (y0, y1, z) => K.slabOf({ x: TX - 1.8, y: y0, w: 3.6, d: y1 - y0, r: 1.7 }, z, 3.6, P, 4);
  const fitting = (y, z) => S(K.slabOf({ x: TX - 3, y: y - 3, w: 6, d: 6, r: 1 }, z, 6, P, 3, 0.4), { tone: "mid" }) +
    D([at([TX, y, z + 6])], { size: 0.42 });

  for (const UY of GEO.UY) {
    // cylinder block with its end caps, cradle and tank stack: one item, drawn bottom up
    const block = { x: -114, y: UY - 11, w: 48, d: 22, r: 2 };
    const backCap = { x: -118, y: UY - 13, w: 4, d: 26, r: 1 };
    const frontCap = { x: -66, y: UY - 13, w: 4, d: 26, r: 1 };
    const cradle = { x: TX - 10, y: UY - 10, w: 20, d: 20, r: 2 };
    let s = `<path class="iso-halo" d="${K.haloOf({ x: -119, y: UY - 14, w: 58, d: 28, r: 3 }, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    s += S(K.slabOf(backCap, 0, 24, P, 3, 0.4), { tone: "mid" });
    s += S(K.slabOf(block, 0, 20, P, 4, 0.6), { tone: "mid", inner: L(K.sideSeam(block, 10, P, 4), { tone: "faint" }) });
    s += S(K.slabOf(cradle, 20, 2, P, 3, 0.3), { tone: "mid" });
    s += D(K.corners(cradle, 2.2).map(([x, y]) => at([x, y, 22])), { size: 0.42 });
    // tank, seam ring and lid
    s += S(K.cylinder(TX, UY, 10, 22, 26, P, 64, 0.6), { tone: "hi", crease: "lo", inner: L(K.sideArc(TX, UY, 10, 35, P, 40), { tone: "faint" }) });
    s += S(K.cylinder(TX, UY, 10.8, 48, 2, P, 64, 0.4), { tone: "mid" });
    const bolts = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; bolts.push(at([TX + 9.2 * Math.cos(a), UY + 9.2 * Math.sin(a), 50])); }
    s += D(bolts, { size: 0.38 });
    // feed drop with its valve body (the lever is live), riser above it and the elbow fitting
    s += S(K.cylinder(TX, UY, 1.8, 50, 4, P, 24), { tone: "mid", crease: "none" });
    s += S(K.cylinder(TX, UY, 3.4, 54, 4, P, 32, 0.3), { tone: "mid" });
    s += `<g data-lever="${UY}"></g>`;
    s += S(K.cylinder(TX, UY, 1.8, 58, HZ - 1.2 - 58, P, 24), { tone: "mid", crease: "none" });
    s += fitting(UY, HZ - 1.2);
    s += `<g data-glass="${UY}"></g>`; // sight glass, rebuilt live (its fluid is the lit part)
    s += S(K.slabOf(frontCap, 0, 24, P, 3, 0.4), { tone: "mid" });
    s += D([[-64, UY - 10], [-64, UY + 10], [-116, UY - 10], [-116, UY + 10]].map(([x, y]) => at([x, y, 24])), { size: 0.45 });
    s += S(K.slabOf({ x: -62, y: UY - 5, w: 3, d: 10, r: 1.5 }, 7, 10, P, 3, 0.3), { tone: "mid" });
    put(depth(TX, UY), s);

    // rear stop and the two rails the crosshead runs on
    const stop = { x: -60, y: UY - 11, w: 4, d: 22, r: 1 };
    put(depth(-58, UY) + 0.01, S(K.slabOf(stop, 0, 6, P, 3, 0.4), { tone: "mid" }) +
      D([at([-58, UY - 8, 6]), at([-58, UY + 8, 6])], { size: 0.42 }));
    let rails = "";
    for (const dy of [-9, 6]) {
      rails += S(K.slabOf({ x: -56, y: UY + dy, w: 92, d: 3, r: 0.8 }, 0, 3, P, 3, 0.3), { tone: "mid" });
      rails += D([-50, -8, 32].map((x) => at([x, UY + dy + 1.5, 3])), { size: 0.36 });
    }
    put(depth(-58, UY) + 0.02, rails);
  }

  // shared pump: reservoir, pump body, plunger gland, riser and tee
  {
    const res = { x: -112, y: -17, w: 44, d: 34, r: 3 };
    let s = `<path class="iso-halo" d="${K.haloOf(K.insetPlan(res, -1), 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    s += S(K.slabOf(res, 0, 9, P, 5, 0.6), { tone: "mid", inner: L(K.sideSeam(res, 4.5, P, 5), { tone: "faint" }) });
    s += L(K.planOutline(K.insetPlan(res, 2.4), 9, P, 5), { tone: "faint" });
    s += S(K.cylinder(-76, 9, 3.4, 9, 2.4, P, 28), { tone: "mid" }) + L(K.knurl(-76, 9, 3.4, 9, 11.4, 22, P, 0.3), { tone: "lo" });
    const body = { x: -103, y: -9, w: 20, d: 18, r: 2 };
    s += S(K.slabOf(body, 9, 15, P, 4, 0.6), { tone: "mid", inner: L(K.sideSeam(body, 16, P, 4), { tone: "faint" }) });
    s += D(K.corners(body, 2.4).map(([x, y]) => at([x, y, 24])), { size: 0.42 });
    s += S(K.cylinder(-97, 0, 3.6, 24, 2, P, 28, 0.3), { tone: "mid" });
    s += `<g data-plunger=""></g>`;
    s += S(K.cylinder(TX, 0, 1.8, 24, HZ - 1.2 - 24, P, 24), { tone: "mid", crease: "none", inner: L(K.sideArc(TX, 0, 1.8, 40, P, 12), { tone: "faint" }) });
    s += fitting(0, HZ - 1.2);
    put(depth(-93, 0), s);
  }

  // header pipes between the fittings: each its own item so it sorts against its fittings
  put(depth(TX, -20), S(pipeY(GEO.UY[0] + 3, -3, HZ), { tone: "mid", crease: "none" }));
  put(depth(TX, 20), S(pipeY(3, GEO.UY[1] - 3, HZ), { tone: "mid", crease: "none" }));

  // anvil back block (the rods, springs and beam are live: the beam gives a little at each strike)
  {
    const back = { x: 72, y: -34, w: 12, d: 68, r: 2 };
    put(59.6, `<path class="iso-halo" d="${K.haloOf(K.insetPlan(back, -1), 0, 0.1, P)}" style="filter:blur(3px)"/>` +
      S(K.slabOf(back, 0, 16, P, 4, 0.6), { tone: "mid", inner: L(K.sideSeam(back, 6, P, 4), { tone: "faint" }) }) +
      L(K.planOutline(K.insetPlan(back, 2.4), 16, P, 4), { tone: "faint" }) +
      D([[74.4, -31.6], [81.6, -31.6], [74.4, 31.6], [81.6, 31.6]].map(([x, y]) => at([x, y, 16])), { size: 0.45 }));
  }

  // dial gauge: enemy combat power
  {
    const DL = GEO.DIAL;
    const ped = { x: DL.x - 13, y: DL.y - 13, w: 26, d: 26, r: 3 };
    let s = `<path class="iso-halo" d="${K.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    s += S(K.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" });
    s += L(K.planOutline(K.insetPlan(ped, 3), 5, P), { tone: "faint" });
    s += D(K.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 });
    s += S(K.cylinder(DL.x, DL.y, 5.6, 5, 2.4, P, 28), { tone: "mid" });
    s += S(K.cylinder(DL.x, DL.y, 3.4, 7.4, DL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(K.sideArc(DL.x, DL.y, 3.4, 14, P, 16), { tone: "faint" }) });
    s += S(K.cylinder(DL.x, DL.y, DL.r, DL.z, DL.h, P, 72, 0.8), { tone: "hi", crease: "lo" });
    s += L(K.knurl(DL.x, DL.y, DL.r, DL.top - 3.2, DL.top, 64, P, 0.3), { tone: "lo" });
    s += L(K.sideArc(DL.x, DL.y, DL.r, DL.top - 3.2, P, 40), { tone: "faint" });
    s += L(K.ring(DL.x, DL.y, DL.r - 2, DL.top, P, 72), { tone: "lo" });
    const t = K.radialTicks(DL.x, DL.y, DL.r - 2, 20, 5, DL.top, [1.2, 2.6], P, -0.75 * Math.PI, 1.5 * Math.PI);
    s += L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
    s += K.faceTextSvg(K.topMatrix([DL.x - 4.2, DL.y + 6.4], DL.top, P, "x"), "ENEMY", { size: 2, tone: "lo", anchor: "middle" });
    s += `<g data-needle=""></g>`;
    put(depth(DL.x, DL.y), s);
  }
  items.sort((a, b) => a.key - b.key);
  return items;
}

// The parts that move, as {key, svg}, for state V:
// V.ram[i] 0..1, V.fuel[i] 0..1, V.open[i] (pump filling it), V.bob 0..1, V.give (anvil give, units), V.enemy 0..1.
export function live(K, P, V) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const S = (paths, style) => K.solidSvg(paths, style);
  const D = (pts, style) => K.dotsSvg(pts, style);
  const [x0, x1] = GEO.XC;
  let ramMax = -1e9;
  GEO.UY.forEach((UY, i) => {
    const xc = x0 + (x1 - x0) * V.ram[i];
    // rod from the gland to the clevis
    const rod = { x: -59, y: UY - 2, w: xc - 8 - -59, d: 4, r: 1.8 };
    put(depth(-57.5, UY) + 0.03, S(K.slabOf(rod, 10, 4, P, 4), { tone: "mid", crease: "none" }));
    // crosshead: carriage on the rails, clevis, ram head
    let c = `<path class="iso-halo" d="${K.haloOf({ x: xc - 9, y: UY - 12, w: 18, d: 24, r: 2 }, 3, 0.1, P)}" style="filter:blur(2.5px)"/>`;
    c += S(K.slabOf({ x: xc - 8, y: UY - 11, w: 16, d: 22, r: 1.5 }, 3, 5, P, 3, 0.5), { tone: "mid" });
    c += D([[xc - 6, UY - 9], [xc + 6, UY - 9], [xc - 6, UY + 9], [xc + 6, UY + 9]].map(([x, y]) => at([x, y, 8])), { size: 0.42 });
    c += S(K.slabOf({ x: xc - 8, y: UY - 4, w: 7, d: 8, r: 1 }, 8, 8, P, 3, 0.4), { tone: "mid" });
    c += D([at([xc - 4.5, UY, 16])], { size: 0.5 });
    c += S(K.slabOf({ x: xc + 5, y: UY - 10, w: 3, d: 20, r: 0.8 }, 8, 18, P, 3, 0.4), { tone: "hi", crease: "lo" });
    c += D([[xc + 6.5, UY - 7], [xc + 6.5, UY + 7]].map(([x, y]) => at([x, y, 26])), { size: 0.4 });
    const key = Math.max(depth(xc, UY), depth(-57.5, UY) + 0.04);
    ramMax = Math.max(ramMax, depth(xc + 6.5, UY));
    put(key, c);
  });

  // anvil: beam on two guide rods with springs, giving a little at each strike
  {
    const g = V.give || 0;
    const fx = GEO.ANVIL + g;
    let rods = "";
    for (const yr of [-20, 20]) {
      const coil = K.coil(fx + 8.8, 71.2, [yr, 12.2], 3.2, 6, "x", P);
      const seat = (x) => S(K.slabOf({ x, y: yr - 3.2, w: 0.8, d: 6.4, r: 0.4 }, 9, 6.4, P, 2), { tone: "mid", crease: "none" });
      rods += seat(fx + 8);
      rods += K.lineSvg(coil.back, { tone: "lo" });
      rods += S(K.slabOf({ x: fx + 8, y: yr - 1.6, w: 72 - fx - 8, d: 3.2, r: 1.4 }, 10.6, 3.2, P, 3), { tone: "mid", crease: "none" });
      rods += K.lineSvg(coil.front, { tone: "mid" });
      rods += seat(71.2);
    }
    const beam = { x: fx, y: -54, w: 8, d: 108, r: 1.5 };
    const beamSvg = S(K.slabOf(beam, 8, 12, P, 3, 0.5), { tone: "mid", inner: K.lineSvg(K.sideSeam(beam, 14, P, 3), { tone: "faint" }) }) +
      D([[fx + 4, -50], [fx + 4, -20], [fx + 4, 20], [fx + 4, 50]].map(([x, y]) => at([x, y, 20])), { size: 0.45 });
    const bk = Math.max(56, ramMax + 0.5);
    put(bk, beamSvg);
    put(bk + 0.1, rods);
  }

  // sight glasses (fluid is the lit part), valve levers, pump plunger, dial needle
  const [vx, vy] = K.towardViewer(P);
  V.glass = GEO.UY.map((UY, i) => {
    const gx = GEO.TX + 13.6 * vx, gy = UY + 13.6 * vy;
    const [b0, b1] = GEO.GLASS;
    const brk = (z) => {
      const ux = -vy, uy = vx;
      const pts = [[9.6, -1], [11.4, -1], [11.4, 1], [9.6, 1]].map(([r, t]) => [GEO.TX + r * vx + t * ux, UY + r * vy + t * uy]);
      return S(K.extrude(pts, z, 1.2, P, { bevel: 0.2 }), { tone: "mid" });
    };
    let s = brk(b0 - 1.4) + S(K.cylinder(gx, gy, 2.8, b0 - 1.8, 1.8, P, 24, 0.2), { tone: "mid" });
    s += S(K.cylinder(gx, gy, 2.2, b0, b1 - b0, P, 24), { tone: "lo", crease: "none" });
    const h = (b1 - b0 - 0.4) * Math.max(0, Math.min(1, V.fuel[i]));
    if (h > 0.25) s += S(K.cylinder(gx, gy, 1.6, b0 + 0.2, h, P, 20), { tone: "hi", lit: true, crease: "none", className: "op-fuel" });
    s += brk(b1 + 0.3) + S(K.cylinder(gx, gy, 2.8, b1, 1.8, P, 24, 0.2), { tone: "mid" });
    return s;
  });
  V.lever = GEO.UY.map((UY, i) => {
    const a = (V.open[i] ? 0 : 90) * SC_RAD + (V.leverTurn ? V.leverTurn[i] : 0);
    const c = Math.cos(a), s = Math.sin(a);
    const pts = [[2.2, -0.9], [9, -0.9], [9, 0.9], [2.2, 0.9]].map(([r, t]) => [GEO.TX + r * c - t * s, UY + r * s + t * c]);
    return S(K.extrude(pts, 58, 1, P, { bevel: 0.2 }), { tone: V.open[i] ? "hi" : "mid", crease: "lo" }) +
      S(K.cylinder(GEO.TX + 9 * c, UY + 9 * s, 1.3, 59, 1.6, P, 16), { tone: "mid" });
  });
  {
    const top = 26 + 4 + 6 * (V.bob || 0);
    V.plunger = S(K.cylinder(-97, 0, 1.6, 26, top - 26, P, 20), { tone: "mid", crease: "none" }) +
      S(K.cylinder(-97, 0, 3, top, 2.6, P, 28, 0.3), { tone: "mid" }) +
      K.lineSvg(K.knurl(-97, 0, 3, top, top + 2.6, 20, P), { tone: "lo" });
  }
  {
    const DL = GEO.DIAL;
    const a = -0.75 * Math.PI + Math.max(0, Math.min(1, V.enemy)) * 1.5 * Math.PI;
    const sx = Math.sin(a), sy = -Math.cos(a);
    V.needle = `<path class="iso-line" data-tone="hi" data-free="" d="${K.lineOnTop([DL.x - sx * 3, DL.y - sy * 3], [DL.x + sx * (DL.r - 3.4), DL.y + sy * (DL.r - 3.4)], DL.top + 0.2, P)}" style="stroke-width:1.1"/>` +
      K.lineSvg(K.ring(DL.x, DL.y, 1.5, DL.top + 0.2, P, 16), { tone: "mid" });
  }
  return items;
}

// Merge the static items with the live ones and fill the live slots inside static items.
export function compose(K, P, statics, V) {
  const items = [...statics, ...live(K, P, V)].sort((a, b) => a.key - b.key);
  let out = items.map((it) => it.svg).join("");
  GEO.UY.forEach((UY, i) => {
    out = out.replace(`<g data-glass="${UY}"></g>`, `<g data-glass="${UY}">${V.glass[i]}</g>`);
    out = out.replace(`<g data-lever="${UY}"></g>`, `<g data-lever="${UY}">${V.lever[i]}</g>`);
  });
  out = out.replace(`<g data-plunger=""></g>`, `<g data-plunger="">${V.plunger}</g>`);
  out = out.replace(`<g data-needle=""></g>`, `<g data-needle="">${V.needle}</g>`);
  return out;
}
