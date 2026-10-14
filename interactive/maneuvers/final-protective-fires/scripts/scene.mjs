// The machine view's parts that stand above the plate, rebuilt per frame: the assault carriage on its
// rail, the trip tab, the wire belt and its gate, the portcullis gantry with its drop pins and lit
// header bar, the two grazing bars on their posts, the shot magazine, the parapet and the gauge.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page (inlined kit) run the
// same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  FPL: 30,          // bench y of the final protective line (the wire's outer edge)
  KS: 0.72,         // bench units per notional metre along the rail
  RAIL: 6.5,        // rails' centre x (both sides)
  RAIL_TOP: 3,
  BELT: 34,         // the wire belt's picket line
  PINS: 16,         // the portcullis line (middle of the beaten zone)
  POST: 44,         // gantry posts' x (both sides)
  HDR_UP: 26,       // header bar bottom when raised (raised pins clear the grazing bars)
  HDR_DOWN: 12.1,   // header bar bottom when dropped (pins reach the strike plate)
  PIN_L: 16,
  MG: 80,           // grazing bar posts' x (both sides), on the FPL
  BAR_L: 122,
  BAR_Z: [10, 12.4], // left and right bars ride at different heights where they cross
  CAR_TOP: 8.4,
  CAR_L: 26,
  DIAL: { x: 64, y: -60, r: 16, z: 20, h: 7 },
  MAG: { x: -64, y: -40 },
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;
GEO.PIN_X = [-25.2, -20, -14.8, -9.6, -4.4, 4.4, 9.6, 14.8, 20, 25.2];

const SC_RAD = Math.PI / 180;
export const benchY = (x) => GEO.FPL - x * GEO.KS;

// S: { x (assault, m), drop (0 raised .. 1 dropped), firing (0..1), t (s, hammer phase),
//      trig (trigger distance, m), tripped (bool), bar (0 sector .. 1 on the FPL), mag (discs left),
//      check (0..1), statics: [{ key, svg }] }
export function scene(K, P, S) {
  const items = [];
  // parts that only change with a few values are built once per value and reused (memo by signature)
  const CACHE = scene.cache || (scene.cache = new Map());
  let sink = items;
  const put = (key, svg) => sink.push({ key, svg });
  const memo = (sig, fn) => {
    let list = CACHE.get(sig);
    if (!list) { list = []; const prev = sink; sink = list; fn(); sink = prev; if (CACHE.size > 800) CACHE.clear(); CACHE.set(sig, list); }
    items.push(...list);
  };
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const slab = (x0, x1, y0, y1, z0, h, steps = 2, bevel = 0, r = 0.5) => K.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, h, P, steps, bevel);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  const frame = (ox, oy, ang) => {
    const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
    return (u, v) => [ox + u * c - v * s, oy + u * s + v * c];
  };
  const box = (F, u0, u1, v0, v1, z0, h, bevel = 0) => K.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z0, h, P, { bevel });
  const G = GEO;

  // ---- the assault carriage: shoes on the rails, body, ram nose, belly skid and a mast ----
  const nose = benchY(S.x);
  const tail = nose - G.CAR_L;
  const carKey = depth(0, nose - G.CAR_L / 2, 4);
  {
    let out = `<path class="iso-halo" d="${K.slabOf({ x: -8, y: tail, w: 16, d: G.CAR_L, r: 2 }, G.RAIL_TOP, 0.1, P).fill}" style="filter:blur(2.5px)"/>`;
    const shoes = [];
    for (const sx of [-G.RAIL - 1.6, G.RAIL - 1.6]) for (const sy of [tail + 2, nose - 8]) shoes.push([sx, sy]);
    const shoeSvg = ([sx, sy]) => solid(slab(sx, sx + 3.2, sy, sy + 6, G.RAIL_TOP, 1.6, 2, 0.2), { tone: "mid" });
    const near = ([sx, sy]) => depth(sx + 1.6, sy + 3) > depth(0, nose - G.CAR_L / 2);
    out += shoes.filter((s) => !near(s)).map(shoeSvg).join("");
    const body = { x: -7, y: tail, w: 14, d: G.CAR_L - 5, r: 1.5 };
    out += solid(K.slabOf(body, 4.6, 3.8, P, 3, 0.5), { tone: "mid", inner: line(K.sideSeam(body, 6.5, P, 3), { tone: "faint" }) });
    out += shoes.filter(near).map(shoeSvg).join("");
    out += dots([[-5.4, tail + 1.6, 8.4], [5.4, tail + 1.6, 8.4], [-5.4, nose - 6.6, 8.4], [5.4, nose - 6.6, 8.4]]);
    // the ram nose: a buffer block on a short neck
    out += solid(slab(-2, 2, nose - 5, nose - 2.6, 5.4, 2.4, 2), { tone: "mid", crease: "none" });
    out += solid(slab(-6, 6, nose - 2.6, nose, 4.8, 3.6, 2, 0.3), { tone: "hi", crease: "lo" });
    out += dots([[-3.6, nose - 1.3, 8.4], [3.6, nose - 1.3, 8.4]]);
    // a knurled push handle on the tail
    out += solid(slab(-1.4, 1.4, tail + 2.4, tail + 5.2, 8.4, 0.9, 1), { tone: "mid", crease: "none" });
    out += solid(K.cylinder(0, tail + 3.8, 1.9, 9.3, 0.8, P, 16), { tone: "mid" }) + line(K.knurl(0, tail + 3.8, 1.9, 9.3, 10.1, 14, P), { tone: "lo" });
    put(carKey, out);
  }

  // ---- the trip tab between the rails, clamped on the ruler at the trigger distance ----
  {
    const yt = benchY(S.trig);
    let out = solid(slab(-2.6, 2.6, yt - 2.2, yt + 2.2, 0.8, 1.4, 2, 0.2), { tone: "mid" });
    out += dots([[-1.6, yt - 1.2, 2.2], [1.6, yt + 1.2, 2.2]], 0.36);
    // the tab itself: standing when armed, knocked flat once the assault trips it
    out += S.tripped
      ? solid(slab(-1.6, 1.6, yt + 0.8, yt + 3.8, 2.2, 0.5, 1), { tone: "hi", crease: "lo" })
      : solid(slab(-1.6, 1.6, yt - 0.3, yt + 0.3, 2.2, 1.9, 1), { tone: "hi", crease: "lo" });
    put(depth(0, yt) + (nose - G.CAR_L < yt + 4 && nose > yt - 4 ? -0.5 : 0), out);
  }

  // ---- the wire belt: pickets, concertina coils (back half, pickets, front half) and the gate ----
  memo("belt", () => {
    for (const [x0, x1] of [[-72, -11], [11, 72]]) {
      const c = K.coil(x0, x1, [G.BELT, 5], 3.2, Math.round((x1 - x0) / 4.2), "x", P);
      const mid = (x0 + x1) / 2;
      put(depth(mid, G.BELT) - 0.6, line(c.back, { tone: "lo" }));
      put(depth(mid, G.BELT) + 0.6, line(c.front, { tone: "mid" }));
      for (let x = x0; x <= x1 + 0.1; x += (x1 - x0) / 5) put(depth(x, G.BELT), solid(slab(x - 0.6, x + 0.6, G.BELT - 0.6, G.BELT + 0.6, 0, 9, 1), { tone: "mid", crease: "none" }));
    }
    // gate posts either side of the rail, and the gate swinging on the left post as the carriage pushes through
    for (const x of [-9.5, 9.5]) put(depth(x, G.BELT), solid(slab(x - 1.2, x + 1.2, G.BELT - 1.2, G.BELT + 1.2, 0, 9.6, 2, 0.2), { tone: "mid" }) + dots([[x, G.BELT, 9.6]], 0.4));
  });
  {
    const open = Math.min(1, Math.max(0, (nose - (G.BELT - 1.6)) / 6));
    const F = frame(-9.5, G.BELT, 80 * open);
    const [gx, gy] = F(9.5, 0);
    put(depth(gx, gy) + 0.2, solid(box(F, 1.2, 17.6, -0.6, 0.6, 4.2, 2.2, 0.2), { tone: "mid" }) + solid(box(F, 1.2, 17.6, -0.4, 0.4, 7.4, 0.8), { tone: "mid", crease: "none" }));
  }

  // ---- the gantry: two posts on feet, a top beam, the lit header bar and its drop pins ----
  const hdr = G.HDR_UP + (G.HDR_DOWN - G.HDR_UP) * S.drop;
  memo("gantry", () => {
    for (const x of [-G.POST, G.POST]) {
      let out = solid(slab(x - 5, x + 5, G.PINS - 5, G.PINS + 5, 0, 3, 3, 0.4), { tone: "mid" });
      out += dots([[x - 3.4, G.PINS - 3.4, 3], [x + 3.4, G.PINS - 3.4, 3], [x - 3.4, G.PINS + 3.4, 3], [x + 3.4, G.PINS + 3.4, 3]]);
      out += solid(slab(x - 2, x + 2, G.PINS - 2, G.PINS + 2, 3, 29, 2, 0.3), { tone: "mid", inner: line(K.sideSeam({ x: x - 2, y: G.PINS - 2, w: 4, d: 4, r: 0.5 }, 9, P, 2), { tone: "faint" }) });
      put(depth(x, G.PINS) - 0.3, out);
    }
    put(depth(0, G.PINS) + 0.5, solid(slab(-G.POST - 3, G.POST + 3, G.PINS - 3, G.PINS + 3, 32, 4, 3, 0.5), { tone: "mid" }) +
      dots([[-G.POST, G.PINS, 36], [G.POST, G.PINS, 36]], 0.45));
  });
  {
    // pins: each slides in a bore of the header; it hangs on its collar, and while the FPF fires the
    // pins hammer up and down out of step; a pin that lands on the carriage stays on it
    const under = (px) => Math.abs(px) < 7 && tail < G.PINS + 1 && nose > G.PINS - 1;
    G.PIN_X.forEach((px, i) => {
      const hammer = S.firing * 2.6 * Math.abs(Math.sin(S.t * 7.3 + i * 1.9));
      let bottom = hdr + 4.5 - G.PIN_L + hammer;
      const onCar = under(px) && bottom < G.CAR_TOP;
      if (onCar) bottom = G.CAR_TOP;
      const top = bottom + G.PIN_L;
      // the whole pin goes under the header (which hides the length inside its bore); the length above
      // the header and the collar are drawn again over it
      const pin = solid(K.cylinder(px, G.PINS, 1, bottom, G.PIN_L, P, 14), { tone: "hi", crease: "none", inner: line(K.sideArc(px, G.PINS, 1, bottom + 1.2, P, 10), { tone: "faint" }) });
      const above = Math.max(0.01, top - 1.4 - (hdr + 3));
      const upper = solid(K.cylinder(px, G.PINS, 1, hdr + 3, above, P, 14), { tone: "hi", crease: "none" }) + solid(K.cylinder(px, G.PINS, 1.7, top - 1.4, 1.4, P, 16), { tone: "mid" });
      put(onCar ? carKey + 0.01 : depth(0, G.PINS) - 0.1 + depth(px, G.PINS) * 1e-4, pin);
      put(depth(0, G.PINS) + 0.3 + depth(px, G.PINS) * 1e-4, upper);
    });
    const H = { x: -G.POST + 2, y: G.PINS - 2.6, w: 2 * G.POST - 4, d: 5.2, r: 0.8 };
    let hd = solid(K.slabOf(H, hdr, 3, P, 3, 0.4), { tone: "hi", lit: true, crease: "lo" });
    hd += line(G.PIN_X.map((px) => K.ring(px, G.PINS, 1.9, hdr + 3, P, 14)).join(""), { tone: "lo" });
    // guide shoes round each post
    for (const x of [-G.POST, G.POST]) hd += solid(slab(x - 3.4, x + 3.4, G.PINS - 3.4, G.PINS + 3.4, hdr - 0.6, 4.2, 2, 0.3), { tone: "mid" });
    put(depth(0, G.PINS) + 0.2, hd);
    // the latch on the right post: a pawl under the header's shoe, swung down once tripped
    const L = S.tripped ? [[G.POST + 2, G.PINS - 1, 14], [G.POST + 3.2, G.PINS + 1, 21]] : [[G.POST + 2, G.PINS - 1, hdr - 1.4], [G.POST + 9, G.PINS + 1, hdr - 0.2]];
    put(depth(G.POST + 3, G.PINS + 1), solid(slab(L[0][0], L[1][0], L[0][1], L[1][1], L[0][2], L[1][2] - L[0][2], 1, 0.2), { tone: "mid" }) + dots([[G.POST + 2.6, G.PINS + 1, S.tripped ? 20.4 : hdr - 0.8]], 0.4));
  }

  // ---- the grazing bars: each on a post at one end of the FPL; in its sector at rest, laid along
  // the FPL when the FPF is called (the FPL is one limit of the gun's sector) ----
  memo("bars|" + S.bar.toFixed(3), () => { for (const [side, ox] of [[-1, -G.MG], [1, G.MG]]) {
    const base = side < 0 ? 0 : 180;
    const ang = base + side * 12 * (1 - S.bar);   // in its sector (12 degrees out, clear of the gantry) at rest, on the FPL once called
    const BZ = G.BAR_Z[side < 0 ? 0 : 1];
    const F = frame(ox, G.FPL, ang);
    let post = solid(K.cylinder(ox, G.FPL, 6, 0, 2, P, 28, 0.4), { tone: "mid" });
    post += dots([[ox - 4.2, G.FPL, 2], [ox + 4.2, G.FPL, 2], [ox, G.FPL - 4.2, 2], [ox, G.FPL + 4.2, 2]], 0.4);
    post += solid(K.cylinder(ox, G.FPL, 2.6, 2, BZ - 2, P, 18), { tone: "mid", crease: "none", inner: line(K.sideArc(ox, G.FPL, 2.6, 6, P, 12), { tone: "faint" }) });
    put(depth(ox, G.FPL) - 0.2, post);
    const v0 = -3.4, v1 = -1.2;
    const [mx, my] = F(G.BAR_L / 2, -2.3);
    let bar = solid(box(F, 2, G.BAR_L, v0, v1, BZ, 1.6, 0.2), { tone: "hi", crease: "lo" });
    bar += solid(box(F, G.BAR_L - 3, G.BAR_L, v0 - 0.6, v1 + 0.6, BZ - 0.6, 2.8, 0.2), { tone: "mid" });
    put(depth(mx, my), bar);
    put(depth(ox, G.FPL) + 0.3, solid(K.cylinder(ox, G.FPL, 3.4, BZ, 2.6, P, 22), { tone: "mid" }) + line(K.knurl(ox, G.FPL, 3.4, BZ, BZ + 2.6, 20, P), { tone: "lo" }) + line(K.ring(ox, G.FPL, 1.2, BZ + 2.6, P, 12), { tone: "mid" }));
  } });

  // ---- the shot magazine: a rack of discs, three rounds each, emptying as the FPF fires ----
  memo("mag|" + S.mag, () => {
    const { x, y } = G.MAG;
    let out = solid(K.slabOf({ x: x - 6, y: y - 6, w: 12, d: 12, r: 1.5 }, 0, 2.4, P, 3, 0.4), { tone: "mid" });
    out += dots([[x - 4.2, y - 4.2, 2.4], [x + 4.2, y + 4.2, 2.4]], 0.4);
    const rods = [[x - 4, y + 1.2], [x + 1.2, y - 4]];
    const rod = ([rx, ry]) => solid(K.cylinder(rx, ry, 0.7, 2.4, 25, P, 10), { tone: "mid", crease: "none" });
    const far = rods.filter(([rx, ry]) => depth(rx, ry) < depth(x, y)), nr = rods.filter(([rx, ry]) => depth(rx, ry) >= depth(x, y));
    out += far.map(rod).join("");
    for (let i = 0; i < S.mag; i++) out += solid(K.cylinder(x, y, 3.2, 2.6 + i * 2.2, 1.8, P, 22, 0.2), { tone: "hi", crease: "lo" });
    out += nr.map(rod).join("");
    out += solid(K.cylinder(x, y, 4.6, 27.4, 1.6, P, 24, 0.3), { tone: "mid" });
    put(depth(x, y), out);
  });

  // ---- the parapet behind the wire: the defended position, with sandbag courses on top ----
  memo("parapet", () => {
    const B = { x: -84, y: 66, w: 168, d: 18, r: 2 };
    let out = `<path class="iso-halo" d="${K.haloOf(B, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    out += solid(K.slabOf(B, 0, 8, P, 4, 0.6), { tone: "mid", inner: line(K.sideSeam(B, 4, P, 4), { tone: "faint" }) });
    for (let i = 0; i < 8; i++) {
      const bx = -80 + i * 20.25;
      const plan = { x: bx, y: 68, w: 16, d: 6, r: 2.4 };
      out += solid(K.slabOf(plan, 8, 2.4, P, 4, 0.3), { tone: "mid" });
    }
    out += line(K.planOutline({ x: -82, y: 76, w: 164, d: 6, r: 1.5 }, 8, P), { tone: "faint" });
    put(depth(0, 75), out);
  });

  // ---- the gauge: how far the FPF has checked the assault (it breaks at full scale) ----
  memo("gauge|" + S.check.toFixed(3), () => {
    const D = G.DIAL;
    let out = "";
    const ped = { x: D.x - 12, y: D.y - 12, w: 24, d: 24, r: 3 };
    out += `<path class="iso-halo" d="${K.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    out += solid(K.slabOf(ped, 0, 4.4, P, 5, 0.6), { tone: "mid" });
    out += line(K.planOutline(K.insetPlan(ped, 2.6), 4.4, P), { tone: "faint" });
    out += dots(K.corners(ped, 3.2).map(([x, y]) => [x, y, 4.4]), 0.45);
    out += solid(K.cylinder(D.x, D.y, 5, 4.4, 2.2, P, 28), { tone: "mid" });
    out += solid(K.cylinder(D.x, D.y, 3, 6.6, D.z - 6.6, P, 22), { tone: "mid", crease: "none", inner: line(K.sideArc(D.x, D.y, 3, 13, P, 14), { tone: "faint" }) });
    out += solid(K.cylinder(D.x, D.y, D.r, D.z, D.h, P, 72, 0.8), { tone: "hi", crease: "lo" });
    out += line(K.knurl(D.x, D.y, D.r, D.top - 2.8, D.top, 64, P, 0.3), { tone: "lo" });
    out += line(K.sideArc(D.x, D.y, D.r, D.top - 2.8, P, 40), { tone: "faint" });
    out += line(K.ring(D.x, D.y, D.r - 1.8, D.top, P, 72), { tone: "lo" });
    const t = K.radialTicks(D.x, D.y, D.r - 1.8, 20, 5, D.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    out += K.faceTextSvg(K.topMatrix([D.x - 4.4, D.y + 6.8], D.top, P, "x"), "CHECK", { size: 2, tone: "lo", anchor: "middle" });
    out += `<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(K, P, D, S.check)}" style="stroke-width:1.1"/>`;
    out += line(K.ring(D.x, D.y, 1.4, D.top, P, 16), { tone: "mid" });
    put(depth(D.x, D.y), out);
  });

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The dial needle for a value f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + Math.min(1, Math.max(0, f)) * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.2), D.y + sy * (D.r - 3.2)], D.top + 0.2, P);
}
