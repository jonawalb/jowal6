// The machine view's moving parts, rebuilt per frame: a five-station lock line (suppress, obscure,
// secure, reduce, assault), an interlock bar that grows as stations set, a belt of tines across the
// rail (the obstacle) whose lane tines retract as the lane is reduced, a screen that rises for the
// smoke, a pop-up target held down by a press, the breach sled, the assault carriage (the lit part),
// a dial for the lane and a rack of men down. Written against the kit as a parameter (K) so build.mjs
// (Node) and the page (inlined kit) run the same code.
export const GEO = {
  RAIL_Y: 10,          // the assault carriage's rail
  SLED_Y: 26,          // the breach sled's rail
  X0: -70, X1: 88,
  ST_X: [-60, -30, 0, 30, 60],  // the five stations, in doctrinal order, left to right
  ST_Y: -40,
  GATE_X: 50,          // the belt of tines
  BELT: { x0: 44, x1: 56, y0: -14, y1: 34 },
  SCREEN_X: 64,
  TARGET: { x: 77, y: 10 },
  DIAL: { x: -50, y: 45, r: 12, z: 6, h: 6 },
  RACK: { x: -22, y: 40 },
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;
export const lerp = (a, b, t) => a + (b - a) * t;

// S: a model state (stateAt) plus S.t
export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const G = GEO;
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const box = (cx, cy, w, d, z, h, style = {}, r = 0.6) => solid(K.slabOf({ x: cx - w / 2, y: cy - d / 2, w, d, r }, z, h, P, 3, 0.2), { tone: "mid", crease: "none", ...style });

  // ---- the two rails with sleepers ----
  for (const ry of [G.RAIL_Y, G.SLED_Y]) {
    for (let x = G.X0 + 4; x <= G.X1 - 4; x += 16) put(depth(x, ry, 0) - 0.6, box(x, ry, 3, 14, 0, 0.8, { tone: "lo" }, 0.3));
    for (const dy of [-4.5, 4.5]) put(depth(0, ry + dy, 0) - 0.3, box((G.X0 + G.X1) / 2, ry + dy, G.X1 - G.X0, 1.4, 0.8, 1.2, { tone: "mid" }, 0.3));
  }

  // ---- the five stations, with pins that drop as each fundamental is set ----
  const lastSet = S.nSet;
  G.ST_X.forEach((sx, i) => {
    const set = S.set[i];
    const cur = !set && i === Math.min(4, S.nSet) && S.released && !S.jammed && S.cfg[i] && S.t > (i ? 0 : 0);
    const applied = S.cfg[i];
    const pinZ = 12 - (set ? 8 : cur ? 4.2 + 2.2 * Math.sin(S.t * 5) * 0 : 0);
    let out = "";
    out += solid(K.slabOf({ x: sx - 9, y: G.ST_Y - 7, w: 18, d: 14, r: 1.4 }, 0, 11, P, 3, 0.4), { tone: "mid", inner: line(K.sideSeam({ x: sx - 9, y: G.ST_Y - 7, w: 18, d: 14, r: 1.4 }, 5.5, P, 3), { tone: "faint" }) });
    out += line(K.planOutline(K.insetPlan({ x: sx - 9, y: G.ST_Y - 7, w: 18, d: 14, r: 1.4 }, 2.4), 11, P), { tone: "faint" });
    out += solid(K.cylinder(sx, G.ST_Y, 3.4, 11, 0.6, P, 18), { tone: "lo", crease: "none" });
    // the pin: a rod with a knob; its top is the lit accent only when this is the station being worked
    const pinTop = 11 + (set ? 0.4 : 9);
    out += solid(K.cylinder(sx, G.ST_Y, 1.5, 11.4, pinTop - 11.4 + (set ? 0 : 0), P, 14), { tone: "hi", crease: "none" });
    out += solid(K.cylinder(sx, G.ST_Y, 3, pinTop, 2.2, P, 18, 0.3), { tone: applied ? "hi" : "lo", crease: "lo" });
    // k small dots on the front plate engrave the station's place in the order
    const dots = [];
    for (let k = 0; k <= i; k++) dots.push(at([sx - 6 + k * 3, G.ST_Y + 7, 5.5]));
    out += K.dotsSvg(dots, { size: 0.5 });
    put(depth(sx, G.ST_Y, 0), out);
  });
  // ---- the interlock bar: grows to the last station that is set, in order ----
  {
    const head = S.nSet === 0 ? G.ST_X[0] - 10 : lerp(G.ST_X[S.nSet - 1], S.nSet < 5 ? G.ST_X[S.nSet] : G.ST_X[4] + 12, S.nSet < 5 && S.released && !S.jammed && S.cfg[S.nSet] ? stageFrac(S) : 0);
    const x0 = G.ST_X[0] - 10, w = Math.max(4, head - x0);
    put(depth(x0 + w / 2, G.ST_Y + 12, 3), box(x0 + w / 2, G.ST_Y + 14, w, 3, 2, 3, { tone: "hi" }, 0.4));
    put(depth(x0 + w / 2, G.ST_Y + 12, 0) - 0.2, box((x0 + G.ST_X[4] + 14) / 2, G.ST_Y + 14, G.ST_X[4] + 14 - x0, 4.4, 0, 2, { tone: "lo" }, 0.4));
    // short tie rods from each set station down to the bar
    G.ST_X.forEach((sx, i) => { if (S.set[i]) put(depth(sx, G.ST_Y + 9, 0) + 0.1, box(sx, G.ST_Y + 9, 1.6, 5, 2, 3.5, { tone: "mid" }, 0.3)); });
  }

  // ---- the obstacle: a belt of tines across the rails; the lane tines retract as the lane is reduced ----
  {
    const B = G.BELT;
    // a base strip under the belt
    put(depth((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, 0) - 0.4, box((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, B.x1 - B.x0 + 4, B.y1 - B.y0 + 4, 0, 1, { tone: "lo" }, 1));
    const rows = [];
    for (let y = B.y0 + 3; y <= B.y1 - 2; y += 5.5) rows.push(+y.toFixed(1));
    rows.forEach((ry) => {
      [B.x0 + 3, B.x1 - 3].forEach((tx, c) => {
        const inLane = Math.abs(ry - G.RAIL_Y) < 7;
        // lane tines retract in order across the lane as the lane progresses, back column first
        let h = 7.5;
        if (inLane) {
          const thr = c === 0 ? 0.0 + (ry - (G.RAIL_Y - 7)) / 28 : 0.5 + (ry - (G.RAIL_Y - 7)) / 28;
          const f = Math.min(1, Math.max(0, (S.lane - thr * 0.9) / 0.12));
          h = 7.5 - 6.7 * f;
        }
        put(depth(tx, ry, 0), solid(K.cylinder(tx, ry, 1.1, 0.8, h, P, 12), { tone: "hi", crease: "none" }) + K.dotsSvg([at([tx, ry, 0.8 + h])], { size: 0.38 }));
      });
    });
    // the sled's reducing arm reaches from the sled's rail into the belt as the lane is made
    const sled = sledX(S);
    const reach = 3 + 12 * S.lane;
    put(depth(G.GATE_X, G.SLED_Y - reach / 2, 3) + 0.4, box(G.GATE_X + 1, G.SLED_Y - 2 - reach / 2, 2.2, reach + 4, 3, 2.4, { tone: "hi" }, 0.3));
    // the sled: a low block with a cab
    const sy = G.SLED_Y;
    put(depth(sled, sy, 0) + 0.4, box(sled, sy, 16, 9, 1.4, 5, { tone: "mid" }, 1.2) + box(sled + 2, sy, 8, 6, 6.4, 2.6, { tone: "hi" }, 1) + K.dotsSvg(K.corners({ x: sled - 8, y: sy - 4.5, w: 16, d: 9 }, 2).map(([x, y]) => at([x, y, 6.4])), { size: 0.4 }));
  }

  // ---- the smoke screen: a panel that rises as obscuration builds ----
  {
    const h = 6 * S.obscure;
    if (h > 0.4) {
      put(depth(G.SCREEN_X, G.RAIL_Y, 0) + 0.2, box(G.SCREEN_X, 10, 1.4, 52, 0, h, { tone: "faint", crease: "lo" }, 0.4));
    }
  }

  // ---- the far side: an enemy target block that pops up unless the press holds it down ----
  {
    const T = G.TARGET, up = 1 - S.supp;  // 0 = held down, 1 = up
    const downE = S.downE;
    put(depth(T.x, T.y, 0), box(T.x, T.y, 14, 18, 0, 4, { tone: "mid" }, 1.2) + solid(K.cylinder(T.x, T.y, 3, 4, 2 + 7 * up * (downE >= 6 ? 0 : 1), P, 16), { tone: "lo" }));
    // the press: a bar above the target that comes down as suppression takes hold (the support force's fires)
    const pz = 8 + 14 * (1 - S.supp);
    put(depth(T.x, T.y, pz) + 0.5, box(T.x, T.y, 16, 4, pz, 2.4, { tone: S.cfg[0] ? "hi" : "lo" }, 0.5) + box(T.x - 6, T.y, 2.2, 3, 4, pz - 4, { tone: "mid" }, 0.3) + box(T.x + 6, T.y, 2.2, 3, 4, pz - 4, { tone: "mid" }, 0.3));
  }

  // ---- the assault carriage: the lit part. It waits behind the belt; with the chain set it runs through ----
  {
    const jamX = G.BELT.x0 - 12;
    const e = Math.min(1, S.t / 9);
    const cx = S.assault > 0 ? lerp(jamX, G.TARGET.x - 14, S.assault) : lerp(G.X0 + 8, jamX, e * e * (3 - 2 * e));
    const y = G.RAIL_Y;
    const body = K.slabOf({ x: cx - 7, y: y - 4.5, w: 14, d: 9, r: 1.4 }, 1.4, 8, P, 3, 0.4);
    let out = "";
    for (const dx of [-4.5, 4.5]) for (const dy of [-5.6, 5.6]) out += solid(K.cylinder(cx + dx, y + dy, 1.7, 0, 1.8, P, 14), { tone: "lo", crease: "none" });
    out += solid(body, { tone: "hi", lit: true, crease: "lo" });
    out += line(K.planOutline(K.insetPlan({ x: cx - 7, y: y - 4.5, w: 14, d: 9, r: 1.4 }, 1.8), 9.4, P), { tone: "faint" });
    out += solid(K.cylinder(cx + 2, y, 2.2, 9.4, 2.2, P, 16), { tone: "mid", crease: "lo" });
    put(depth(cx, y, 0) + 0.6, out);
  }

  // ---- the dial: lane reduced, 0..1 ----
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
    const t = K.radialTicks(D.x, D.y, D.r - 1.8, 20, 5, D.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    out += `<path class="iso-line" data-tone="lit" data-free="" d="${needle(K, P, D, S.lane)}" style="stroke-width:1.1"/>`;
    out += line(K.ring(D.x, D.y, 1.4, D.top, P, 16), { tone: "mid" });
    put(depth(D.x, D.y), out);
  }
  // ---- the loss rack: eight pegs for the breach force and six for the enemy, each laid flat when lost ----
  {
    const R = G.RACK;
    let out = solid(K.slabOf({ x: R.x - 4, y: R.y - 4, w: 48, d: 22, r: 1.5 }, 0, 2, P, 3, 0.4), { tone: "mid" });
    for (let i = 0; i < 8; i++) {
      const px = R.x + 2 + i * 5.5, py = R.y + 2;
      out += i < S.downF ? solid(K.slabOf({ x: px - 1.6, y: py - 0.6, w: 3.2, d: 1.2, r: 0.3 }, 2, 0.5, P, 1), { tone: "lo", crease: "none" })
        : solid(K.cylinder(px, py, 0.9, 2, 3.4, P, 10), { tone: "hi", crease: "none" });
    }
    for (let i = 0; i < 6; i++) {
      const px = R.x + 2 + i * 5.5, py = R.y + 11;
      out += i < S.downE ? solid(K.slabOf({ x: px - 1.6, y: py - 0.6, w: 3.2, d: 1.2, r: 0.3 }, 2, 0.5, P, 1), { tone: "lo", crease: "none" })
        : solid(K.cylinder(px, py, 0.9, 2, 3.4, P, 10), { tone: "mid", crease: "none" });
    }
    put(depth(R.x + 20, R.y + 8) + 3, out);
  }

  items.sort((a, b) => a.key - b.key);
  return items.map((i) => i.svg).join("");
}

// how far through the stage being worked the model is (0..1), for the interlock bar head
function stageFrac(S) {
  const T = [0, 1.5, 3.5, 5.5, 9.0, 12.5];
  const i = S.nSet;
  return Math.min(1, Math.max(0, (S.t - T[i]) / (T[i + 1] - T[i])));
}
export const sledX = (S) => lerp(GEO.X0 + 14, GEO.BELT.x0 - 10, S.breach);

export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + Math.min(1, Math.max(0, f)) * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.2), D.y + sy * (D.r - 3.2)], D.top + 0.2, P);
}
