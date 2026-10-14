// The parts of the hub-and-rim bench that stand up off the table, depth-sorted together:
// the hub shuttle, the rim lugs on their link belt, the six station posts, the spoke stops,
// the belt motor, the two counters and the speed box. Moving parts are rebuilt per frame.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page (inlined kit)
// run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  TT: 6,              // table top
  RAIL: 7.8,          // rail top (sleeper 0.6 + rail 1.2)
  TABLE: 132,         // table radius
  DECK: 17.4,         // hub turntable radius
  SPOKE0: 18.6,       // spoke rails start
  SPOKE1: 88,         // spoke rails end, at the stop
  RIM_IN: 95,         // inner rim rail centre
  RIM_OUT: 105,       // outer rim rail centre
  BELT: [109.6, 114], // link belt, inner and outer radius
  POST: 122,          // station post radius
  MOTOR: 225,         // bearing of the belt motor
  CL: { x: -148, y: 102, w: 40, d: 26, r: 2 },  // left counter (hub), window on its +y face
  CR: { x: 102, y: -148, w: 26, d: 40, r: 2 },  // right counter (rim), window on its +x face
  CH: 22,             // counter housing height above its foot
  SB: { x: -150, y: -150, w: 34, d: 30, r: 3 }, // speed box, far corner
  CON: { x: -70, y: 137, w: 90, d: 15, r: 2.5 },  // call console on the front-left edge, one key per station
};

const SC_RAD = Math.PI / 180;

// A frame turned by ang degrees about the hub: local (radius, tangent) to world (x, y).
const turned = (ang) => {
  const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
  return (r, t) => [r * c - t * s, r * s + t * c];
};

// Fixed parts, built once: [{ key, svg }].
export function statics(K, P, stations) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const box = (F, r0, r1, t0, t1, z0, h, bevel = 0) => K.extrude([F(r0, t0), F(r1, t0), F(r1, t1), F(r0, t1)], z0, h, P, { bevel });
  const { TT } = GEO;

  // spoke stops: the end of every interior line
  for (const a of stations) {
    const F = turned(a);
    const [cx, cy] = F(89.6, 0);
    put(depth(cx, cy), solid(box(F, 88, 91.2, -7, 7, TT, 4.6, 0.4), { tone: "mid" }) +
      K.dotsSvg([F(89.6, -4.6), F(89.6, 4.6)].map(([x, y]) => at([x, y, TT + 4.6])), { size: 0.42 }));
  }

  // belt motor: housing on the table rim, cap, and the pinion that drives the link belt
  {
    const F = turned(GEO.MOTOR);
    const [mx, my] = F(124, 0);
    const [px, py] = F(116.4, 0);
    const [cx, cy] = F(124, 0);
    let svg = `<path class="iso-halo" d="${box(F, 118.6, 129.4, -8.4, 8.4, TT, 0.1).fill}" style="filter:blur(3px)"/>`;
    svg += solid(K.cylinder(px, py, 2.4, TT, 1.4, P, 24), { tone: "mid" });
    svg += solid(K.cylinder(px, py, 2.4, TT + 1.4, 3.2, P, 32), { tone: "mid", inner: line(K.knurl(px, py, 2.4, TT + 1.4, TT + 4.6, 18, P, 0.2), { tone: "lo" }) });
    svg += solid(box(F, 118.8, 129.2, -8, 8, TT, 11, 0.5), { tone: "mid", inner: line(K.ringSeam([F(118.8, -8), F(129.2, -8), F(129.2, 8), F(118.8, 8)], TT + 3.4, P), { tone: "faint" }) });
    svg += line(K.onTop([F(120.8, -6), F(127.2, -6), F(127.2, 6), F(120.8, 6)], TT + 11, P, true), { tone: "faint" });
    svg += K.dotsSvg([F(120, -6.8), F(128, -6.8), F(120, 6.8), F(128, 6.8)].map(([x, y]) => at([x, y, TT + 11])), { size: 0.42 });
    svg += solid(K.cylinder(cx, cy, 4.2, TT + 11, 3, P, 32, 0.4), { tone: "mid" });
    svg += line(K.ring(cx, cy, 2, TT + 14, P, 24), { tone: "faint" });
    put(depth(mx, my), svg);
  }

  // counters: foot, housing with a window frame on the face toward the reader, reset button, knob
  const counter = (plan, face) => {
    const foot = { x: plan.x - 2, y: plan.y - 2, w: plan.w + 4, d: plan.d + 4, r: plan.r + 1 };
    const z0 = 2, z1 = 2 + GEO.CH;
    let svg = `<path class="iso-halo" d="${K.haloOf(foot, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    svg += solid(K.slabOf(foot, 0, 2, P, 4, 0.4), { tone: "lo" });
    svg += solid(K.slabOf(plan, z0, GEO.CH, P, 4, 0.6), { tone: "mid", inner: line(K.sideSeam(plan, z0 + 4, P, 4), { tone: "faint" }) });
    const lid = K.insetPlan(plan, 2.4);
    svg += line(K.planOutline(lid, z1, P, 4), { tone: "faint" });
    svg += K.dotsSvg(K.corners(plan, 3.4).map(([x, y]) => at([x, y, z1])), { size: 0.45 });
    // reset button and a knurled set knob on the lid
    const [bx, by] = face === "left" ? [plan.x + 10, plan.y + 9] : [plan.x + 9, plan.y + 10];
    const [nx, ny] = face === "left" ? [plan.x + 28, plan.y + 9] : [plan.x + 9, plan.y + 28];
    svg += solid(K.cylinder(bx, by, 3.4, z1, 1.2, P, 28), { tone: "mid" }) + solid(K.cylinder(bx, by, 2.2, z1 + 1.2, 1.8, P, 24), { tone: "hi", crease: "lo" });
    svg += solid(K.cylinder(nx, ny, 3.6, z1, 4, P, 32), { tone: "mid", inner: line(K.knurl(nx, ny, 3.6, z1, z1 + 4, 22, P, 0.3), { tone: "lo" }) });
    svg += line(K.lineOnTop([nx, ny], face === "left" ? [nx + 2.6, ny + 1.6] : [nx + 1.6, ny + 2.6], z1 + 4, P), { tone: "hi", free: true });
    // window frame and glass on the face, drawn in the face plane
    const m = face === "left" ? K.sideMatrix([plan.x + 4, plan.y + plan.d], z1, P, "left") : K.sideMatrix([plan.x + plan.w, plan.y + plan.d - 4], z1, P, "right");
    const wv = plan.w === 40 ? 32 : 32;
    svg += `<g transform="${m}"><rect x="-0.6" y="5.4" width="${wv + 1.2}" height="11.2" rx="1.4" class="iso-line" data-tone="mid" style="fill:var(--anatomy-shade-1)"/>` +
      `<rect x="1" y="7" width="${wv - 2}" height="8" rx="0.6" class="iso-line" data-tone="lo" style="fill:var(--anatomy-paper)"/></g>`;
    return svg;
  };
  {
    const L = GEO.CL;
    put(depth(L.x + L.w / 2, L.y + L.d / 2), counter(L, "left"));
    const R = GEO.CR;
    put(depth(R.x + R.w / 2, R.y + R.d / 2), counter(R, "right"));
  }

  // speed box: a knob over an arc of ticks (the pointer is drawn live)
  {
    const B = GEO.SB;
    let svg = `<path class="iso-halo" d="${K.haloOf(B, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    svg += solid(K.slabOf(B, 0, 10, P, 4, 0.6), { tone: "mid", inner: line(K.sideSeam(B, 3, P, 4), { tone: "faint" }) });
    svg += K.dotsSvg(K.corners(B, 3.2).map(([x, y]) => at([x, y, 10])), { size: 0.45 });
    const cx = B.x + B.w / 2, cy = B.y + B.d / 2;
    const t = K.radialTicks(cx, cy, 12, 12, 4, 10, [1.2, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
    svg += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    svg += line(K.ring(cx, cy, 12, 10, P, 48), { tone: "faint" });
    svg += solid(K.cylinder(cx, cy, 6.4, 10, 1.2, P, 32), { tone: "mid" });
    svg += solid(K.cylinder(cx, cy, 5.2, 11.2, 4.4, P, 32), { tone: "mid", inner: line(K.knurl(cx, cy, 5.2, 11.2, 15.6, 26, P, 0.3), { tone: "lo" }) });
    put(depth(cx, cy), svg);
  }
  // call console: a low box with a key well per station (the keys are drawn live)
  {
    const C = GEO.CON;
    let svg = `<path class="iso-halo" d="${K.haloOf(C, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    svg += solid(K.slabOf(C, 0, 6, P, 4, 0.6), { tone: "mid", inner: line(K.sideSeam(C, 2.2, P, 4), { tone: "faint" }) });
    svg += K.dotsSvg([[C.x + 3, C.y + 3], [C.x + C.w - 3, C.y + 3], [C.x + 3, C.y + C.d - 3], [C.x + C.w - 3, C.y + C.d - 3]].map(([x, y]) => at([x, y, 6])), { size: 0.42 });
    for (let i = 0; i < stations.length; i++) svg += line(K.ring(C.x + 9 + i * 14.4, C.y + C.d / 2, 4.2, 6, P, 28), { tone: "lo" });
    put(depth(C.x + C.w / 2, C.y + C.d / 2), svg);
  }
  return items;
}

// The moving parts for state S: { psi, r, phi, n, call, k, hubT, rimT, statics }.
export function scene(K, P, S, stations) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const box = (F, r0, r1, t0, t1, z0, h, bevel = 0) => K.extrude([F(r0, t0), F(r1, t0), F(r1, t1), F(r0, t1)], z0, h, P, { bevel });
  const arc = (r0, r1, a0, a1, step = 2.5) => {
    const out = [];
    const n = Math.max(2, Math.ceil((a1 - a0) / step));
    for (let i = 0; i <= n; i++) out.push(turned(a0 + ((a1 - a0) * i) / n)(r1, 0));
    for (let i = n; i >= 0; i--) out.push(turned(a0 + ((a1 - a0) * i) / n)(r0, 0));
    return out;
  };
  const { TT, RAIL } = GEO;

  // ---- floor level, drawn first: the link belt and the turntable bridge ----
  {
    const links = [];
    for (let i = 0; i < 24; i++) {
      const a0 = S.phi + i * 15 + 0.5, a1 = a0 + 14;
      const [mx, my] = turned(a0 + 7)(111.8, 0);
      links.push({ key: depth(mx, my), svg: solid(K.extrude(arc(GEO.BELT[0], GEO.BELT[1], a0, a1, 3.5), TT, 1.4, P, { convex: false, bevel: 0.25 }), { tone: "mid" }) +
        K.dotsSvg([turned(a0 + 0.9)(111.8, 0), turned(a1 - 0.9)(111.8, 0)].map(([x, y]) => at([x, y, TT + 1.4])), { size: 0.36 }) });
    }
    links.sort((a, b) => a.key - b.key);
    put(-1e6, links.map((l) => l.svg).join(""));

    const F = turned(S.psi);
    const rails = [];
    for (const t of [-4, 4]) {
      const [mx, my] = F(0, t);
      rails.push({ key: depth(mx, my), svg: solid(box(F, -16.8, 16.8, t - 0.8, t + 0.8, TT + 0.6, 1.2, 0.2), { tone: "mid", crease: "none" }) });
    }
    rails.sort((a, b) => a.key - b.key);
    // index mark on the deck rim: which spoke the turntable faces
    put(-1e5, solid(box(F, 13.4, 16.8, -1.4, 1.4, TT + 0.6, 0.5), { tone: "lo", crease: "none" }) + rails.map((r) => r.svg).join(""));
  }

  // ---- station posts: pedestal, column, lamp housing; the called station's lens rises ----
  stations.forEach((a, i) => {
    const F = turned(a);
    const [cx, cy] = F(GEO.POST, 0);
    const lift = (S.lift && S.lift[i]) || 0;
    const called = i === S.call;
    let svg = solid(box(F, GEO.POST - 6, GEO.POST + 6, -6, 6, TT, 2.2, 0.4), { tone: "mid" });
    svg += K.dotsSvg([F(GEO.POST - 4.2, -4.2), F(GEO.POST + 4.2, 4.2), F(GEO.POST - 4.2, 4.2), F(GEO.POST + 4.2, -4.2)].map(([x, y]) => at([x, y, TT + 2.2])), { size: 0.4 });
    svg += solid(K.cylinder(cx, cy, 3.6, TT + 2.2, 1.8, P, 28), { tone: "mid" });
    svg += solid(K.cylinder(cx, cy, 2, TT + 4, 8, P, 20), { tone: "mid", crease: "none", inner: line(K.sideArc(cx, cy, 2, TT + 8, P, 14), { tone: "faint" }) });
    svg += solid(K.cylinder(cx, cy, 4.8, TT + 12, 5, P, 36, 0.5), { tone: "mid", inner: line(K.sideArc(cx, cy, 4.8, TT + 14, P, 28), { tone: "faint" }) });
    const lz = TT + 17 + 3.2 * lift;
    if (lift > 0.02) svg += solid(K.cylinder(cx, cy, 2.6, TT + 17, lz - TT - 17, P, 24), { tone: "mid", crease: "none" });
    svg += solid(K.cylinder(cx, cy, 3.6, lz, 2.2, P, 32, 0.4), { tone: called ? "hi" : "mid", crease: called ? "lo" : "faint" });
    svg += line(K.ring(cx, cy, 1.8, lz + 2.2, P, 20), { tone: called ? "hi" : "faint" });
    put(depth(cx, cy), svg);
  });

  // ---- rim lugs: carriages on the rim rails, clamped to the link belt ----
  for (let i = 0; i < S.n; i++) {
    const a = S.phi + (i * 360) / S.n;
    const F = turned(a);
    const [cx, cy] = F(100, 0);
    const key = depth(cx, cy);
    let svg = `<path class="iso-halo" d="${box(F, 91, 113, -8, 8, RAIL, 0.1).fill}" style="filter:blur(3px)"/>`;
    const shoes = [];
    for (const r of [GEO.RIM_IN, GEO.RIM_OUT]) for (const t of [-5, 5]) shoes.push([r, t]);
    const shoe = ([r, t]) => solid(box(F, r - 1.8, r + 1.8, t - 1.6, t + 1.6, RAIL, 1.4, 0.2), { tone: "mid" });
    const near = ([r, t]) => { const [x, y] = F(r, t); return depth(x, y) > key; };
    svg += shoes.filter((s) => !near(s)).map(shoe).join("");
    svg += solid(box(F, 107.6, 113, -2.6, 2.6, TT + 1.4, 4.8, 0.3), { tone: "mid" });
    svg += solid(box(F, 91.6, 108.4, -6.6, 6.6, RAIL + 1.4, 3.6, 0.5), { tone: "hi", crease: "lo" });
    svg += shoes.filter(near).map(shoe).join("");
    svg += K.dotsSvg([F(93.4, -4.8), F(93.4, 4.8), F(106.6, -4.8), F(106.6, 4.8)].map(([x, y]) => at([x, y, RAIL + 5])), { size: 0.42 });
    const [hx, hy] = F(100, 0);
    svg += solid(K.cylinder(hx, hy, 2.6, RAIL + 5, 3.4, P, 24), { tone: "mid", inner: line(K.knurl(hx, hy, 2.6, RAIL + 5, RAIL + 8.4, 16, P, 0.2), { tone: "lo" }) });
    put(key, svg);
  }

  // ---- hub shuttle: the lit carriage on the spokes ----
  {
    const F = turned(S.psi);
    const r = S.r;
    const [cx, cy] = F(r, 0);
    const key = depth(cx, cy);
    let svg = `<path class="iso-halo" d="${box(F, r - 8, r + 8, -7, 7, RAIL, 0.1).fill}" style="filter:blur(3px)"/>`;
    const shoes = [];
    for (const dr of [-4.6, 4.6]) for (const t of [-4, 4]) shoes.push([r + dr, t]);
    const shoe = ([sr, t]) => solid(box(F, sr - 1.8, sr + 1.8, t - 1.5, t + 1.5, RAIL, 1.4, 0.2), { tone: "mid" });
    const near = ([sr, t]) => { const [x, y] = F(sr, t); return depth(x, y) > key; };
    svg += shoes.filter((s) => !near(s)).map(shoe).join("");
    svg += solid(box(F, r - 7, r + 7, -6, 6, RAIL + 1.4, 3.8, 0.5), { tone: "hi", lit: true, crease: "lo" });
    svg += shoes.filter(near).map(shoe).join("");
    svg += solid(box(F, r + 7, r + 8.2, -4.2, 4.2, RAIL + 1.8, 2.6, 0.2), { tone: "mid", crease: "none" });
    svg += solid(box(F, r - 5.6, r + 1.6, -4.4, 4.4, RAIL + 5.2, 4.2, 0.4), { tone: "hi", crease: "lo" });
    svg += line(K.onTop([F(r + 1.6, 0), F(r + 7, 0)], RAIL + 5.2, P), { tone: "lit" });
    svg += K.dotsSvg([F(r - 4, -3), F(r - 4, 3), F(r + 0.2, -3), F(r + 0.2, 3)].map(([x, y]) => at([x, y, RAIL + 9.4])), { size: 0.4 });
    put(key, svg);
  }

  // ---- counter digits and the speed pointer ----
  {
    const L = GEO.CL, R = GEO.CR, z1 = 2 + GEO.CH;
    const digits = (m, text, keyAt) => put(keyAt + 0.01, `<g transform="${m}"><text class="iso-face-text" data-tone="hi" x="16" y="13.6" font-size="7.6" text-anchor="middle">${text}</text></g>`);
    digits(K.sideMatrix([L.x + 4, L.y + L.d], z1, P, "left"), S.hubT, depth(L.x + L.w / 2, L.y + L.d / 2));
    digits(K.sideMatrix([R.x + R.w, R.y + R.d - 4], z1, P, "right"), S.rimT, depth(R.x + R.w / 2, R.y + R.d / 2));
    const B = GEO.SB, cx = B.x + B.w / 2, cy = B.y + B.d / 2;
    const f = (S.k - 0.5) / 1.5;
    const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
    const sx = Math.sin(a), sy = -Math.cos(a);
    put(depth(cx, cy) + 0.01, line(K.lineOnTop([cx, cy], [cx + sx * 4.6, cy + sy * 4.6], 15.6, P), { tone: "hi", free: true }));
  }

  // ---- call keys: the called station's key is pressed in ----
  {
    const C = GEO.CON;
    let svg = "";
    for (let i = 0; i < stations.length; i++) {
      const x = C.x + 9 + i * 14.4, y = C.y + C.d / 2;
      const down = i === S.call;
      svg += solid(K.cylinder(x, y, 3.2, 6, down ? 0.7 : 2.2, P, 28, 0.3), { tone: down ? "hi" : "mid", crease: down ? "lo" : "faint" });
    }
    put(depth(C.x + C.w / 2, C.y + C.d / 2) + 0.01, svg);
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}
