// The machine view's parts that stand above the plate, rebuilt per frame: the sloped chute table with
// its two lanes (the avenues of approach), the seven things the steps build on it (rails, a marked
// lane, a kill zone with stakes and a trigger sill, weapon blocks, pegs, a pin gantry, a sync bar),
// the enemy balls, the gauge and the loss rack. Written against the kit as a parameter (K) so
// build.mjs (Node) and the page (inlined kit) run the same code.
// build.mjs inlines this file with `import` and `export` stripped, so fdPoly (kit/field.mjs) is a global there.
import { fdPoly } from "../../kit/field.mjs";

export const GEO = {
  X: 60,            // the table's half width
  Y0: -84,         // its high end (the hopper end)
  Y1: 80,           // its low end (the defenders' end)
  Z1: 6,            // height of the low end
  SLOPE: 0.2,       // rise per unit toward the high end
  KS: 0.33,         // bench units per notional metre along the lanes
  YNEAR: 62,        // bench y of the defenders' line (x = 0 m)
  LANE: { A: -26, B: 26 },
  LW: 15,           // lane width between its rails
  BALL: 3,
  DIAL: { x: 78, y: -52, r: 15, z: 18, h: 7 },
  RACK: { x: 78, y: 14 },
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;
export const ZA = (y) => GEO.Z1 + (GEO.Y1 - y) * GEO.SLOPE;
export const benchY = (m) => GEO.YNEAR - m * GEO.KS;
// the three weapon blocks each side of the engagement-area lane, and the peg rows in the obstacle belt
export const BLOCKS = (lx) => [[lx - 22, -26], [lx - 22, 4], [lx - 22, 34], [lx + 22, -26], [lx + 22, 4], [lx + 22, 34]];

const SC_RAD = Math.PI / 180;

// S: { x (lead of the enemy column, m), b: [7 build progress 0..1], lane: "A"|"B" (where the EA is),
//      down: [x of each enemy ball that is down], downF, t (s), firing (0..1), fireT, steps: [7 bool],
//      alive }
export function scene(K, P, S) {
  const items = [];
  const CACHE = scene.cache || (scene.cache = new Map());
  let sink = items;
  const put = (key, svg) => sink.push({ key, svg });
  const memo = (sig, fn) => {
    let list = CACHE.get(sig);
    if (!list) { list = []; const prev = sink; sink = list; fn(); sink = prev; if (CACHE.size > 600) CACHE.clear(); CACHE.set(sig, list); }
    items.push(...list);
  };
  const G = GEO;
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const dots = (pts, size = 0.42) => K.dotsSvg(pts.map(at), { size });
  // a box standing on the slope: x0..x1, y0..y1, h above the slope's surface at each end
  const sbox = (x0, x1, y0, y1, h, style = {}) => {
    const lo = (y) => ZA(y) - 0.4, hi = (y) => ZA(y) + h;
    const q = (y, f) => [[x0, y, f(y)], [x1, y, f(y)]];
    const [a0, a1] = q(y0, lo), [b0, b1] = q(y1, lo), [c0, c1] = q(y0, hi), [d0, d1] = q(y1, hi);
    return fdPoly(K, P, [[a0, a1, b1, b0], [c0, c1, d1, d0], [a0, a1, c1, c0], [b0, b1, d1, d0], [a0, b0, d0, c0], [a1, b1, d1, c1]], { tone: "mid", ...style });
  };
  const ea = S.lane === "A" ? G.LANE.A : G.LANE.B;
  const stepsSig = S.steps.map((v) => (v ? 1 : 0)).join("");
  const bq = (i) => Math.round(S.b[i] * 8) / 8;

  // ---- S1: the lanes' side rails rise ----
  for (const [name, lx] of [["A", G.LANE.A], ["B", G.LANE.B]]) {
    const h = 0.3 + 1.9 * bq(0);
    memo(`rail|${name}|${h.toFixed(2)}`, () => {
      for (const sx of [lx - G.LW / 2 - 1.2, lx + G.LW / 2]) {
        for (let y = G.Y0 + 14; y < G.Y1 - 14; y += 24) {
          const y1 = Math.min(y + 24, G.Y1 - 14);
          put(depth(sx + 0.6, (y + y1) / 2, ZA((y + y1) / 2)) - 0.2, sbox(sx, sx + 1.2, y, y1, h, { tone: "mid", crease: "none" }));
        }
      }
    });
  }
  // ---- S2: the most likely course of action, a chevron inlaid at the head of the lane the enemy takes ----
  if (S.b[1] > 0.02) {
    const lx = G.LANE.A, y = G.Y0 + 34, h = 0.7 * bq(1);
    memo("coa|" + h.toFixed(2), () => {
      const f = (yy) => ZA(yy) + h + 0.2;
      const pts = [[lx - 5, y + 6], [lx, y - 3], [lx + 5, y + 6], [lx + 5, y + 10], [lx, y + 1.4], [lx - 5, y + 10]];
      const d = K.pathOf(pts.map(([px, py]) => K.iso([px, py, f(py)], P)), true);
      put(depth(lx, y, ZA(y)) + 0.1, `<path class="ea-coa" d="${d}"/>` + line(d, { tone: "hi" }));
    });
  }
  // ---- S3: the kill zone (lit), the trigger sill and three stakes (TRPs) on the lane ----
  if (S.b[2] > 0.02) {
    const yT = benchY(290), yN = benchY(60), h = 0.9 * bq(2);
    memo(`kz|${ea}|${h.toFixed(2)}`, () => {
      for (let y = yT; y < yN - 0.01; y += 12) {
        const y1 = Math.min(y + 12, yN);
        put(depth(ea, (y + y1) / 2, ZA((y + y1) / 2)) - 0.1, sbox(ea - 6.6, ea + 6.6, y, y1, h, { tone: "hi", lit: true, crease: "none" }));
      }
      put(depth(ea, yT, ZA(yT)) + 0.2, sbox(ea - 9.4, ea + 9.4, yT - 0.8, yT + 0.8, 1.7 * bq(2), { tone: "hi", crease: "none" }));
      [-26, 0, 26].forEach((dy, i) => {
        const y = (yT + yN) / 2 + dy, z = ZA(y) + h, ph = 7.5 * bq(2);
        const pole = solid(K.cylinder(ea, y, 0.55, z, ph, P, 10), { tone: "mid", crease: "none" });
        const fl = solid(K.slabOf({ x: ea, y: y - 0.2, w: 4.6, d: 0.4, r: 0 }, z + ph - 2.6, 2.4, P, 1), { tone: "hi", crease: "none" });
        put(depth(ea, y, z + 1) + 0.15, pole + fl);
      });
    });
  }
  // ---- S4: the weapon blocks beside the lane, three each side, each with a barrel aimed across it ----
  if (S.b[3] > 0.02) {
    const h = 6 * bq(3);
    memo(`blk|${ea}|${h.toFixed(2)}`, () => {
      BLOCKS(ea).forEach(([bx, by]) => {
        put(depth(bx, by, ZA(by)) + 0.1, sbox(bx - 4.5, bx + 4.5, by - 5, by + 5, h, { tone: "mid" }) +
          (h > 3 ? solid(sbox2(K, P, bx, by, h, bx < ea ? 1 : -1), { tone: "hi", crease: "none" }) : ""));
      });
    });
  }
  // ---- S5: pegs in rows across the lane, in the obstacle belt ----
  if (S.b[4] > 0.02) {
    const h = 4.2 * bq(4);
    memo(`peg|${ea}|${h.toFixed(2)}`, () => {
      const y0 = benchY(150), y1 = benchY(100);
      for (let r = 0; r < 4; r++) {
        const y = y0 + (y1 - y0) * r / 3;
        for (let c = 0; c < 3; c++) {
          const px = ea - 5.4 + (c * 5.4) + (r % 2 ? 2.7 : 0) - 1.4, py = y;
          put(depth(px, py, ZA(py)) + 0.05, solid(K.cylinder(px, py, 0.9, ZA(py) - 0.2, h + 0.2, P, 10), { tone: "hi", crease: "none" }) + dots([[px, py, ZA(py) + h]], 0.35));
        }
      }
    });
  }
  // ---- S6: the pin gantry across the lane: indirect fires, hammering while the kill zone is in use ----
  if (S.b[5] > 0.02) {
    const gy = benchY(210) + 0, rise = 26 * bq(5);
    memo(`gan|${ea}|${rise.toFixed(1)}`, () => {
      for (const px of [ea - 11, ea + 11]) put(depth(px, gy, ZA(gy)) + 0.1, sbox(px - 1.4, px + 1.4, gy - 1.4, gy + 1.4, rise, { tone: "mid" }));
    });
    if (S.b[5] > 0.98) {
      const beamZ = ZA(gy) + 26;
      put(depth(ea, gy, beamZ) + 0.3, solid(K.slabOf({ x: ea - 13.5, y: gy - 1.6, w: 27, d: 3.2, r: 0.6 }, beamZ, 2.4, P, 2, 0.2), { tone: "mid" }));
      [-6, 0, 6].forEach((dx, i) => {
        const dip = S.firing * 4 * Math.abs(Math.sin(S.t * 6.1 + i * 2.1));
        put(depth(ea + dx, gy, ZA(gy)) + 0.5, solid(K.cylinder(ea + dx, gy, 0.9, ZA(gy) + 9 - dip, beamZ - ZA(gy) - 9 + dip, P, 10), { tone: "hi", crease: "none" }));
      });
    }
  }
  // ---- S7: the sync bar linking the three outer blocks and the three inner blocks ----
  if (S.b[6] > 0.02 && S.b[3] > 0.5) {
    const w = bq(6);
    memo(`syn|${ea}|${w.toFixed(2)}`, () => {
      for (const bx of [ea - 22 - 7.5, ea + 22 + 7.5]) {
        const y0 = -26, y1 = 34, ym = y0 + (y1 - y0) * w;
        put(depth(bx, 0, ZA(0)) + 0.6, sbox(bx - 0.5, bx + 0.5, y0, ym, 1.2, { tone: "hi", crease: "none" }) + K.dotsSvg([-26, 4, 34].filter((yy) => yy <= ym).map((yy) => at([bx, yy, ZA(yy) + 1.4])), { size: 0.5 }));
      }
    });
  }

  // ---- the enemy column: balls rolling in the lane; each ball that is down stays where it fell ----
  const kk = K.cameraOf(P).k;
  const laneX = G.LANE.A;
  const nDown = S.down.length;
  const ballSvg = (cx, cy, down) => {
    const [sx, sy] = at([cx, cy, ZA(cy) + G.BALL * (down ? 0.55 : 1) + 0.4]);
    const r = G.BALL * kk * (down ? 0.8 : 1);
    return down
      ? `<circle class="ea-ball ea-down" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${r.toFixed(1)}"/>`
      : `<circle class="ea-ball" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${r.toFixed(1)}"/><circle class="ea-ball-hi" cx="${(sx - r * 0.3).toFixed(1)}" cy="${(sy - r * 0.35).toFixed(1)}" r="${(r * 0.3).toFixed(1)}"/>`;
  };
  const live = [];
  for (let i = 0; i < S.enemy; i++) {
    const down = i < nDown;
    const mx = down ? S.down[i] - 3 * (i % 3) : S.x + (i - nDown) * 14;
    const m = Math.min(mx, 460);
    const y = Math.min(benchY(m), G.Y1 - 20);
    const x = laneX + (i % 2 ? 3.6 : -3.6);
    if (benchY(m) < G.Y0 + 8) continue;
    live.push([depth(x, y, ZA(y)) + 0.4, ballSvg(x, y, down)]);
  }
  // fire from the blocks: a flicker of tracer from each barrel to the lead ball while in the kill zone
  if (S.firing > 0.05 && S.leadY !== null) {
    const ly = S.leadY;
    BLOCKS(ea).forEach(([bx, by], i) => {
      if (S.b[3] < 0.95) return;
      const ph = S.steps[6] ? 0 : i * 0.37;
      const on = (Math.sin((S.t + ph) * 11) > (S.steps[6] ? -0.1 : 0.45));
      if (!on) return;
      const sx = bx < ea ? bx + 9.5 : bx - 9.5;
      const a = at([sx, by, ZA(by) + 6.4]), b = at([laneX === ea ? ea : ea, ly, ZA(ly) + 2.2]);
      live.push([depth(bx, by, ZA(by)) + 9, `<path class="ea-trace" d="${K.pathOf([a, b])}"/>`]);
    });
  }
  for (const [key, svg] of live) put(key, svg);

  // ---- the gauge: enemy down, 0..12 ----
  memo("gauge|" + S.downN, () => {
    const D = G.DIAL;
    let out = "";
    const ped = { x: D.x - 12, y: D.y - 12, w: 24, d: 24, r: 3 };
    out += `<path class="iso-halo" d="${K.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    out += solid(K.slabOf(ped, 0, 4.4, P, 5, 0.6), { tone: "mid" });
    out += line(K.planOutline(K.insetPlan(ped, 2.6), 4.4, P), { tone: "faint" });
    out += dots(K.corners(ped, 3.2).map(([x, y]) => [x, y, 4.4]), 0.45);
    out += solid(K.cylinder(D.x, D.y, 5, 4.4, 2.2, P, 28), { tone: "mid" });
    out += solid(K.cylinder(D.x, D.y, 3, 6.6, D.z - 6.6, P, 22), { tone: "mid", crease: "none", inner: line(K.sideArc(D.x, D.y, 3, 12, P, 14), { tone: "faint" }) });
    out += solid(K.cylinder(D.x, D.y, D.r, D.z, D.h, P, 72, 0.8), { tone: "hi", crease: "lo" });
    out += line(K.knurl(D.x, D.y, D.r, D.top - 2.8, D.top, 64, P, 0.3), { tone: "lo" });
    out += line(K.sideArc(D.x, D.y, D.r, D.top - 2.8, P, 40), { tone: "faint" });
    out += line(K.ring(D.x, D.y, D.r - 1.8, D.top, P, 72), { tone: "lo" });
    const t = K.radialTicks(D.x, D.y, D.r - 1.8, 24, 6, D.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    out += K.faceTextSvg(K.topMatrix([D.x - 4, D.y + 6.8], D.top, P, "x"), "DOWN", { size: 2, tone: "lo", anchor: "middle" });
    out += `<path class="iso-line" data-tone="lit" data-free="" d="${needle(K, P, D, S.downN / S.enemy)}" style="stroke-width:1.1"/>`;
    out += line(K.ring(D.x, D.y, 1.4, D.top, P, 16), { tone: "mid" });
    put(depth(D.x, D.y), out);
  });
  // ---- the loss rack: twelve pegs for the defenders, each laid flat as a man is lost ----
  memo("rack|" + S.downF, () => {
    const R = G.RACK;
    let out = solid(K.slabOf({ x: R.x - 9, y: R.y - 3, w: 18, d: 40, r: 1.5 }, 0, 2, P, 3, 0.4), { tone: "mid" });
    for (let i = 0; i < 12; i++) {
      const px = R.x - 4 + (i % 2) * 8, py = R.y + 2 + Math.floor(i / 2) * 6.2;
      out += i < S.downF ? solid(K.slabOf({ x: px - 1.6, y: py - 0.6, w: 3.2, d: 1.2, r: 0.3 }, 2, 0.5, P, 1), { tone: "lo", crease: "none" })
        : solid(K.cylinder(px, py, 0.9, 2, 3.4, P, 10), { tone: "hi", crease: "none" });
    }
    put(depth(R.x, R.y + 18), out);
  });

  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// a barrel: a small box on the block's inner face
function sbox2(K, P, bx, by, h, dir) {
  const x0 = dir > 0 ? bx + 4.5 : bx - 9.5, x1 = x0 + 5;
  const z = ZA(by) + h * 0.55;
  return K.slabOf({ x: x0, y: by - 0.9, w: x1 - x0, d: 1.8, r: 0.3 }, z, 1.4, P, 1);
}

// The dial needle for a value f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + Math.min(1, Math.max(0, f)) * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.2), D.y + sy * (D.r - 3.2)], D.top + 0.2, P);
}
