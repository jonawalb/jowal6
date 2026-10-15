// The machine view's moving parts, rebuilt per frame: a heavy block at the left (the main body) with an
// alert lamp; three buffers of increasing stiffness on the rail at their security lines, only the chosen
// one raised (the lit part); a ram carriage (the enemy) that comes down the rail from the right; a fire
// band in front of the block (where the enemy can observe the main body); a dial of time since the
// report with a pin at the time bought; a peg meter of the main body's power; a rule for distance; a
// rack of men down. Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code.
import { BENCH, MODEL, benchX, clamp, ease } from "./model.mjs";

export const GEO = {
  X0: -74, X1: 86,         // rail extent
  DIAL: { x: -42, y: -33, r: 11, z: 5, h: 5 },
  METER: { x: -22, y: -37 },
  RACK: { x: 22, y: -44 },
  RULE: { x0: -54, x1: 58, y: 31 },
  BLOCK: { x: -76, w: 22, d: 34, h: 18 },
  Z_RAIL: 0.8,
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;
export const needleAngle = (f) => -0.75 * Math.PI + clamp(f) * 1.5 * Math.PI;
// the three buffers: housing size, spring radius, turns, wire, height of the spring axis
export const BUF = [
  { w: 5, d: 9, h: 5, rad: 1.5, turns: 7, z: 2.6, head: 7 },
  { w: 6, d: 12, h: 7, rad: 2.3, turns: 5, z: 3.6, head: 10 },
  { w: 8, d: 16, h: 9.5, rad: 3.2, turns: 4, z: 4.8, head: 14, twin: true },
];
export const RAM = [{ L: 10, n: 1 }, { L: 15, n: 2 }, { L: 22, n: 3 }];

// S: a model state (stateAt)
export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const G = GEO;
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const box = (cx, cy, w, d, z, h, style = {}, r = 0.6) => solid(K.slabOf({ x: cx - w / 2, y: cy - d / 2, w, d, r }, z, h, P, 3, 0.2), { tone: "mid", crease: "none", ...style });
  const RY = 5;
  const P0 = S.plan;

  // ---- the rail: sleepers, two bars in 12-unit pieces (each sorts on its own), an end stop on the right ----
  for (let x = benchX(0) + 5; x <= G.X1 - 3; x += 12) put(depth(x, 0, 0) - 0.6, box(x, 0, 3, 17, 0, 0.8, { tone: "lo" }, 0.3));
  for (const dy of [-RY, RY]) for (let x0 = benchX(0); x0 < G.X1; x0 += 12) {
    const x1 = Math.min(G.X1, x0 + 12);
    put(depth((x0 + x1) / 2, dy, 0) - 0.3, box((x0 + x1) / 2, dy, x1 - x0, 1.4, 0.8, 1.2, { tone: "mid" }, 0.3));
  }
  {
    const x = G.X1 - 1;
    let out = box(x, 0, 5, 17, 0, 6.5, { tone: "mid" }, 0.8);
    out += solid(K.cylinder(x - 3.4, -3.4, 1.3, 2, 2.2, P, 12), { tone: "lo", crease: "none" });
    out += solid(K.cylinder(x - 3.4, 3.4, 1.3, 2, 2.2, P, 12), { tone: "lo", crease: "none" });
    put(depth(x, 0, 0) + 1, out);
  }

  // ---- the observation band: where the enemy can observe and engage the main body ----
  {
    const x0 = benchX(0), x1 = benchX(MODEL.S_OBS);
    const plan = { x: x0, y: -11, w: x1 - x0, d: 22, r: 1 };
    let out = solid(K.slabOf(plan, 0, 1.3, P, 3, 0.3), { tone: "lo", crease: "none" });
    let d = "";
    const n = Math.floor((x1 - x0) / 4.2);
    for (let i = 1; i < n; i++) d += K.lineOnTop([x0 + i * 4.2, -9.6], [x0 + i * 4.2, -3], 1.3, P) + K.lineOnTop([x0 + i * 4.2, 3], [x0 + i * 4.2, 9.6], 1.3, P);
    out += line(d, { tone: "mid", free: true });
    put(depth(x0, 0, 0) - 0.8, out);
  }

  // ---- the main body: a heavy block with a lamp that lights when the security force has reported ----
  {
    const B = G.BLOCK, bx = B.x + B.w / 2;
    let out = "";
    const plan = { x: B.x, y: -B.d / 2, w: B.w, d: B.d, r: 2 };
    out += solid(K.slabOf(plan, 0, B.h, P, 4, 0.7), { tone: "mid", inner: line(K.sideSeam(plan, B.h * 0.6, P, 4), { tone: "faint" }) });
    const cap = { x: B.x + 2, y: -B.d / 2 + 2.4, w: B.w - 4, d: B.d - 4.8, r: 1.4 };
    out += solid(K.slabOf(cap, B.h, 3, P, 3, 0.4), { tone: "hi", crease: "lo" });
    out += line(K.planOutline(K.insetPlan(cap, 1.6), B.h + 3, P), { tone: "faint" });
    out += K.dotsSvg(K.corners(plan, 2.2).map(([x, y]) => at([x, y, B.h])), { size: 0.45 });
    // the lamp: dim before the report, bright after
    const on = S.reported;
    out += solid(K.cylinder(bx + 2, -5, 2.2, B.h + 3, 2.2, P, 16), { tone: on ? "hi" : "lo", crease: "none" });
    out += solid(K.cylinder(bx + 2, 5, 2.2, B.h + 3, 2.2, P, 16), { tone: S.sObs ? "hi" : "lo", crease: "none" });
    // bumper plate on its face
    out += solid(K.slabOf({ x: B.x + B.w - 0.6, y: -B.d / 2 + 4, w: 1.6, d: B.d - 8, r: 0.4 }, 2.2, B.h - 5, P, 2, 0.2), { tone: "lo", crease: "none" });
    put(depth(bx, 0, 0) + 0.2, out);
  }

  // ---- the three buffers at their lines; the chosen one is raised and lit ----
  const sel = S.task;
  const xEng = (i) => benchX(MODEL.LINE[i] + MODEL.R);
  const strokeX = MODEL.STROKE * (BENCH.X1 - BENCH.X0) / (BENCH.S1 - BENCH.S0);
  for (let i = 0; i < 3; i++) {
    const b = BUF[i], xb = benchX(MODEL.LINE[i]);
    const up = i === sel && !S.through;
    const hx = i === sel ? xEng(i) - S.c * strokeX : xEng(i);          // the head plate's face
    let out = "";
    if (up) {
      // foot plate, housing, a spring between housing and head plate, guide rods, a head plate
      const BZ = 3.2;                 // the buffer saddles the rail bars: foot plate 2.0 to 3.2
      const foot = { x: xb - 1.6, y: -b.d / 2 - 2, w: b.w + 3.2, d: b.d + 4, r: 1 };
      out += solid(K.slabOf(foot, 2, 1.2, P, 3, 0.3), { tone: "lo", crease: "none" });
      const hou = { x: xb, y: -b.d / 2, w: b.w, d: b.d, r: 0.9 };
      out += solid(K.slabOf(hou, BZ, b.h, P, 3, 0.35), { tone: "mid", inner: line(K.sideSeam(hou, BZ + b.h * 0.5, P, 3), { tone: "faint" }) });
      out += K.dotsSvg(K.corners(hou, 1.1).map(([x, y]) => at([x, y, BZ + b.h])), { size: 0.38 });
      const from = xb + b.w, to = hx - b.head * 0.0 - 1.6;
      const headPlan = { x: hx - 1.6, y: -b.d / 2 + 0.6, w: 1.6, d: b.d - 1.2, r: 0.4 };
      const hh = b.h;
      if (to - from > 1) {
        const turns = Math.max(2.2, b.turns * (to - from) / (xEng(i) - xb - b.w - 1.6));
        for (const dy of [-b.d / 2 + 1.2, b.d / 2 - 1.2]) out += solid(K.slabOf({ x: from, y: dy - 0.5, w: to - from, d: 1, r: 0.3 }, BZ + b.z - 0.6, 1.2, P, 1), { tone: "lo", crease: "none" });
        const c = K.coil(from, to, [0, BZ + b.z], b.rad, turns, "x", P, 12);
        out += line(c.back, { tone: "lo" }) + line(c.front, { tone: "hi" });
        if (b.twin) { const c2 = K.coil(from, to, [0, BZ + b.z], b.rad * 0.55, turns * 0.8, "x", P, 12); out += line(c2.back, { tone: "lo" }) + line(c2.front, { tone: "mid" }); }
      }
      out += solid(K.slabOf(headPlan, BZ, hh, P, 2, 0.25), { tone: "hi", lit: true, crease: "lo" });
      out += K.dotsSvg([at([hx - 0.8, -b.d / 2 + 2, BZ + hh - 1]), at([hx - 0.8, b.d / 2 - 2, BZ + hh - 1])], { size: 0.35 });
      put(depth(xb + b.w + 8, RY, 0) + 0.2, out);
    } else {
      // lowered: a flush plate with a dark slot, where the buffer folds down
      const dd = 7.6, plan = { x: xb - 1, y: -dd / 2, w: b.w + 6, d: dd, r: 0.9 };
      out += solid(K.slabOf(plan, 0, 0.9, P, 3, 0.25), { tone: i === sel ? "lo" : "mid", crease: "none" });
      out += solid(K.slabOf({ x: xb + 1, y: -dd / 2 + 1.6, w: b.w + 2, d: dd - 3.2, r: 0.4 }, 0.9, 0.2, P, 2), { tone: "lo", crease: "none" });
      out += K.dotsSvg(K.corners(plan, 1.2).map(([x, y]) => at([x, y, 0.9])), { size: 0.34 });
      put(depth(xb + 2, 0, 0) - 0.5, out);
    }
  }

  // ---- the ram: the enemy, a carriage with one, two or three weights ----
  {
    const r = RAM[S.enemy];
    let sR = S.sE;
    if (S.held && S.released) {            // a held ram is pushed back a little
      const fT = clamp((S.tm - P0.tc - 0.55 * P0.d) / (0.3 * P0.d));
      sR = S.sE + 0.9 * ease(fT) * (S.c > 0 ? 1 : 0);
    }
    const xn = benchX(sR), xt = xn + r.L;
    let out = "";
    for (const dx of [2.4, r.L / 2, r.L - 2.4]) for (const dy of [-RY, RY]) out += solid(K.cylinder(xn + dx, dy, 1.5, 2.0, 1.6, P, 14), { tone: "lo", crease: "none" });
    const body = { x: xn, y: -6.4, w: r.L, d: 12.8, r: 1.4 };
    out += solid(K.slabOf(body, 3.4, 4, P, 4, 0.5), { tone: "mid", inner: line(K.sideSeam(body, 5.4, P, 4), { tone: "faint" }) });
    // weights stacked on the carriage: one per enemy level
    const wl = (r.L - 3) / r.n;
    for (let i = 0; i < r.n; i++) {
      const wp = { x: xn + 1.5 + i * wl, y: -4.4, w: wl - 0.8, d: 8.8, r: 1 };
      out += solid(K.slabOf(wp, 7.4, 4.4, P, 3, 0.4), { tone: i === r.n - 1 ? "hi" : "mid", crease: "lo" });
      out += line(K.planOutline(K.insetPlan(wp, 1.2), 11.8, P), { tone: "faint" });
    }
    // the nose plate
    out += solid(K.slabOf({ x: xn - 1.2, y: -5, w: 1.4, d: 10, r: 0.3 }, 3.6, 3.6, P, 2, 0.15), { tone: "lo", crease: "none" });
    out += K.dotsSvg(K.corners(body, 1.5).map(([x, y]) => at([x, y, 7.4])), { size: 0.38 });
    put(depth(xt + 6, RY, 0) + 0.5, out);
  }

  // ---- the dial: time since the report; a pin at the time bought ----
  {
    const D = G.DIAL;
    let out = "";
    const ped = { x: D.x - 15, y: D.y - 14, w: 30, d: 28, r: 3 };
    out += solid(K.slabOf(ped, 0, 3.4, P, 5, 0.6), { tone: "mid" });
    out += line(K.planOutline(K.insetPlan(ped, 2.6), 3.4, P), { tone: "faint" });
    out += K.dotsSvg(K.corners(ped, 3.2).map(([x, y]) => at([x, y, 3.4])), { size: 0.45 });
    out += solid(K.cylinder(D.x, D.y, 5, 3.4, 1.8, P, 28), { tone: "mid" });
    out += solid(K.cylinder(D.x, D.y, D.r, D.z, D.h, P, 72, 0.8), { tone: "hi", crease: "lo" });
    out += line(K.knurl(D.x, D.y, D.r, D.top - 2.8, D.top, 64, P, 0.3), { tone: "lo" });
    out += line(K.ring(D.x, D.y, D.r - 1.8, D.top, P, 72), { tone: "lo" });
    const t = K.radialTicks(D.x, D.y, D.r - 1.8, 20, 5, D.top, [1.0, 2.0], P, -0.75 * Math.PI, 1.5 * Math.PI);
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    const a0 = needleAngle(clamp(P0.react / MODEL.dialMax)), sx0 = Math.sin(a0), sy0 = -Math.cos(a0), rr = D.r - 0.9;
    out += solid(K.cylinder(D.x + sx0 * rr, D.y + sy0 * rr, 1.05, D.top, 2.2, P, 10), { tone: "hi", crease: "none" });
    const a = needleAngle(S.clock), sx = Math.sin(a), sy = -Math.cos(a);
    out += line(K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 5), D.y + sy * (D.r - 5)], D.top + 0.2, P), { tone: "lit", free: true });
    out += line(K.ring(D.x, D.y, 1.4, D.top, P, 16), { tone: "mid" });
    put(depth(D.x, D.y), out);
  }

  // ---- the power meter: ten pegs; the first ones are down, the share committed to the security force ----
  {
    const M = G.METER, down = MODEL.SHARE[S.task] / 10;
    let out = solid(K.slabOf({ x: M.x - 4, y: M.y - 4.5, w: 10 * 3.6 + 3, d: 9, r: 1.5 }, 0, 2, P, 3, 0.4), { tone: "mid" });
    for (let i = 0; i < 10; i++) {
      const px = M.x + 1 + i * 3.6, off = i < down;
      out += solid(K.cylinder(px, M.y, 0.95, 2, off ? 2.2 : 6.4, P, 10), { tone: off ? "lo" : "hi", crease: "none" });
    }
    put(depth(M.x + 14, M.y) + 2, out);
  }
  // ---- the rack of men down: six for the friendly force, ten for the enemy ----
  {
    const R = G.RACK;
    let out = solid(K.slabOf({ x: R.x - 4, y: R.y - 4, w: 10 * 4.4 + 4, d: 17, r: 1.5 }, 0, 2, P, 3, 0.4), { tone: "mid" });
    for (let r = 0; r < 2; r++) for (let i = 0; i < (r === 0 ? 6 : 10); i++) {
      const px = R.x + 1.5 + i * 4.4, py = R.y + 1.5 + r * 9;
      const down = (r === 0 ? S.downF : S.downE) > i;
      out += down ? solid(K.slabOf({ x: px - 1.5, y: py - 0.6, w: 3, d: 1.2, r: 0.3 }, 2, 0.5, P, 1), { tone: "lo", crease: "none" })
        : solid(K.cylinder(px, py, 0.85, 2, 3.4, P, 10), { tone: r === 0 ? "hi" : "mid", crease: "none" });
    }
    put(depth(R.x + 20, R.y + 6) + 2, out);
  }
  // ---- the distance rule at the front: a collar at the chosen line, an index at the enemy now ----
  {
    const U = G.RULE, per = (U.x1 - U.x0) / MODEL.D0;
    const strip = { x: U.x0 - 4, y: U.y - 5, w: U.x1 - U.x0 + 8, d: 10, r: 1.4 };
    let out = solid(K.slabOf(strip, 0, 1.6, P, 3, 0.4), { tone: "mid" });
    const t = K.topTicks(U.x0, U.x1, per * 2, 4, U.y + 5, 1.6, [-1.6, -2.3], P, "x");
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    const cxp = U.x0 + P0.line * per;
    out += solid(K.slabOf({ x: cxp - 1.7, y: U.y - 4, w: 3.4, d: 7, r: 0.6 }, 1.6, 3, P, 2, 0.2), { tone: "hi", crease: "lo" });
    out += K.dotsSvg([at([cxp, U.y - 0.5, 4.6])], { size: 0.4 });
    const ix = U.x0 + clamp(S.sE, 0, MODEL.D0) * per;
    out += solid(K.slabOf({ x: ix - 0.5, y: U.y - 4.6, w: 1, d: 3.2, r: 0.2 }, 1.6, 1.4, P, 1), { tone: "lo", crease: "none" });
    put(depth(U.x0 + 40, U.y) + 4, out);
  }

  items.sort((a, b) => a.key - b.key);
  return items.map((i) => i.svg).join("");
}
