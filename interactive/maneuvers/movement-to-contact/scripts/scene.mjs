// The machine view's moving parts, rebuilt per frame: a heavy carriage on a rail (the main body) with
// two wings that swing out from column to line; a small lit feeler out ahead (the lead element) on a long
// coil spring; a fire band on the rail (the enemy's reach) and a row of six posts at the far end (the
// enemy position); a dial of time since contact with two pins; a peg meter of the shake-out; a rule for
// the gap; a rack of men down. Written against the kit as a parameter (K) so build.mjs (Node) and the
// page (inlined kit) run the same code.
import { BENCH, MODEL, benchX, clamp, ease } from "./model.mjs";

export const GEO = {
  X0: -74, X1: 74,         // rail extent
  DIAL: { x: -46, y: -33, r: 11, z: 5, h: 5 },
  METER: { x: -16, y: -36 },
  RACK: { x: 30, y: -41 },
  RULE: { x0: -56, x1: 28, y: 31 },   // the gap rule: 480 units over 84 bench units
  BODY_W: 15,              // carriage width (y)
  WING: 11,                // wing length
  FEELER_L: 3.2,
  Z_RAIL: 0.8,
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;
export const lerp = (a, b, t) => a + (b - a) * t;
export const needleAngle = (f) => -0.75 * Math.PI + clamp(f) * 1.5 * Math.PI;
export const BODY_LEN = MODEL.bodyLen * (BENCH.X1 - BENCH.X0) / (BENCH.S1 - BENCH.S0);

// S: a model state (stateAt)
export function scene(K, P, S, V = {}) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const G = GEO;
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const box = (cx, cy, w, d, z, h, style = {}, r = 0.6) => solid(K.slabOf({ x: cx - w / 2, y: cy - d / 2, w, d, r }, z, h, P, 3, 0.2), { tone: "mid", crease: "none", ...style });
  const RY = 5;       // the rail bars at y = +/- RY

  // ---- the rail: sleepers, two bars, end stops ----
  for (let x = G.X0 + 4; x <= G.X1 - 3; x += 12) put(depth(x, 0, 0) - 0.6, box(x, 0, 3, 17, 0, 0.8, { tone: "lo" }, 0.3));
  for (const dy of [-RY, RY]) put(depth(0, dy, 0) - 0.3, box((G.X0 + G.X1) / 2, dy, G.X1 - G.X0, 1.4, 0.8, 1.2, { tone: "mid" }, 0.3));
  // the start stop: a block with two buffers
  {
    const x = G.X0 + 2;
    let out = box(x, 0, 6, 15, 0, 6, { tone: "mid" }, 0.8);
    out += solid(K.cylinder(x + 3.6, -3.2, 1.3, 2, 2.2, P, 12), { tone: "lo", crease: "none" });
    out += solid(K.cylinder(x + 3.6, 3.2, 1.3, 2, 2.2, P, 12), { tone: "lo", crease: "none" });
    out += K.dotsSvg([at([x, -5.5, 6]), at([x, 5.5, 6])], { size: 0.4 });
    put(depth(x, 0, 0), out);
  }

  // ---- the fire band: the enemy's direct-fire reach, a low plate across the rail with cross-bars ----
  const bandX0 = benchX(MODEL.SC), bandX1 = G.X1 - 6;
  {
    const plan = { x: bandX0, y: -10, w: bandX1 - bandX0, d: 20, r: 1 };
    let out = solid(K.slabOf(plan, 0, 1.3, P, 3, 0.3), { tone: "lo", crease: "none" });
    const n = Math.floor((bandX1 - bandX0) / 4.4);
    let d = "";
    for (let i = 1; i < n; i++) d += K.lineOnTop([bandX0 + i * 4.4, -8.6], [bandX0 + i * 4.4, -3], 1.3, P) + K.lineOnTop([bandX0 + i * 4.4, 3], [bandX0 + i * 4.4, 8.6], 1.3, P);
    out += line(d, { tone: "mid", free: true });
    put(depth(bandX0, 0, 0) - 0.8, out);
  }

  // ---- the enemy position: a housing with six posts that lie down as the defenders go out of action ----
  {
    const x = G.X1 - 6;
    let out = box(x, 0, 10, 24, 0, 4.5, { tone: "mid" }, 1.4);
    out += line(K.planOutline(K.insetPlan({ x: x - 5, y: -12, w: 10, d: 24, r: 1.4 }, 1.6), 4.5, P), { tone: "faint" });
    for (let i = 0; i < MODEL.enemy; i++) {
      const py = -9.2 + i * 3.7, down = i < S.downE;
      out += down ? solid(K.slabOf({ x: x - 1.6, y: py - 0.5, w: 3.2, d: 1.0, r: 0.3 }, 4.5, 0.5, P, 1), { tone: "lo", crease: "none" })
        : solid(K.slabOf({ x: x - 0.9, y: py - 0.9, w: 1.8, d: 1.8, r: 0.3 }, 4.5, 5.2, P, 2, 0.15), { tone: "hi", crease: "lo" });
    }
    out += K.dotsSvg(K.corners({ x: x - 5, y: -12, w: 10, d: 24 }, 1.6).map(([cx, cy]) => at([cx, cy, 4.5])), { size: 0.4 });
    put(depth(x, 0, 0) + 1, out);
  }

  // ---- positions ----
  const headS = Math.min(S.sBody, MODEL.SC);
  const xh = benchX(headS);                       // head of the main body
  const xTail = xh - BODY_LEN;
  const dep = ease(S.dep);

  // ---- the spring and the feeler (the lead element, the lit part) ----
  if (S.lead) {
    const xl = benchX(S.sLead), x0 = xl - G.FEELER_L;
    const from = xh + 0.8, to = x0 - 0.6;
    if (to - from > 1.2) {
      const turns = Math.max(1.5, Math.round((to - from) / 1.9));
      const c = K.coil(from, to, [0, 5], 1.9, turns, "x", P, 12);
      const eyes = K.dotsSvg([at([from, 1.9, 5]), at([to, 1.9, 5])], { size: 0.7, tone: "mid" });
      put(depth((from + to) / 2, 0) + 0.2, line(c.back, { tone: "lo" }) + line(c.front, { tone: "hi" }) + eyes);
    } else {
      put(depth(from, 0) + 0.2, solid(K.cylinder((from + to) / 2, 0, 1.4, 3.6, 2.8, P, 12), { tone: "lo", crease: "none" }));
    }
    const plan = { x: x0, y: -3.4, w: G.FEELER_L, d: 6.8, r: 1.1 };
    let out = "";
    for (const dy of [-4.2, 4.2]) out += solid(K.cylinder(x0 + 1.1, dy, 1.1, 0, 1.4, P, 12), { tone: "lo", crease: "none" }) + solid(K.cylinder(xl - 1.1, dy, 1.1, 0, 1.4, P, 12), { tone: "lo", crease: "none" });
    out += solid(K.slabOf(plan, 1.2, 4.4, P, 3, 0.35), { tone: "hi", lit: true, crease: "lo" });
    // the probe: a short rod and a nose cone pointing at the enemy
    out += solid(K.cylinder(xl + 1.1, 0, 0.6, 3.2, 1.0, P, 8), { tone: "mid", crease: "none" });
    out += solid(K.slabOf({ x: xl, y: -0.5, w: 2.6, d: 1, r: 0.2 }, 3.4, 0.9, P, 1), { tone: "mid", crease: "none" });
    out += line(K.planOutline(K.insetPlan(plan, 1.2), 5.6, P), { tone: "faint" });
    out += K.dotsSvg(K.corners(plan, 1.2).map(([x, y]) => at([x, y, 5.6])), { size: 0.35 });
    put(depth(xl - 1.5, 0, 0) + 0.8, out);
  }

  // ---- the main body: a heavy carriage with a cab and two wings that swing from column to line ----
  {
    const body = { x: xTail, y: -G.BODY_W / 2, w: BODY_LEN, d: G.BODY_W, r: 1.6 };
    let out = "";
    // wheels on the bars
    for (const dx of [2.6, BODY_LEN / 2, BODY_LEN - 2.6]) for (const dy of [-RY, RY]) out += solid(K.cylinder(xTail + dx, dy * 1.45, 1.7, 0, 1.9, P, 14), { tone: "lo", crease: "none" });
    out += solid(K.slabOf(body, 1.4, 4.8, P, 4, 0.6), { tone: "mid", inner: line(K.sideSeam(body, 3.8, P, 4), { tone: "faint" }) });
    out += line(K.planOutline(K.insetPlan(body, 1.8), 6.2, P), { tone: "faint" });
    // a cab and a hatch row on top
    const cab = { x: xTail + 2.4, y: -4.4, w: BODY_LEN * 0.46, d: 8.8, r: 1.2 };
    out += solid(K.slabOf(cab, 6.2, 5, P, 3, 0.45), { tone: "hi", crease: "lo" });
    out += line(K.planOutline(K.insetPlan(cab, 1.4), 11.2, P), { tone: "faint" });
    out += K.dotsSvg(K.corners(body, 1.7).map(([x, y]) => at([x, y, 6.2])), { size: 0.4 });
    // the wings, hinged at the front corners: folded back along the sides (column) to out across the rail (line)
    for (const sy of [-1, 1]) {
      const hx = xh - 0.4, hy = sy * (G.BODY_W / 2 + 0.2);
      const th = dep * Math.PI / 2;             // 0 = pointing back along the body, 90 degrees = across
      const ux = -Math.cos(th), uy = sy * Math.sin(th);
      const nx = -uy, ny = ux;                  // perpendicular, for the wing's width
      const w2 = 1.35;
      const ring = [[hx + nx * w2, hy + ny * w2], [hx + ux * G.WING + nx * w2, hy + uy * G.WING + ny * w2], [hx + ux * G.WING - nx * w2, hy + uy * G.WING - ny * w2], [hx - nx * w2, hy - ny * w2]];
      out += solid(K.extrude(ring, 1.8, 3.4, P, { bevel: 0.2 }), { tone: "mid", crease: "lo" });
      out += solid(K.cylinder(hx, hy, 1.2, 1.4, 4.4, P, 12), { tone: "lo", crease: "none" });
    }
    // the weight plates on the nose
    out += solid(K.slabOf({ x: xh - 1.8, y: -3, w: 1.8, d: 6, r: 0.4 }, 1.4, 2.4, P, 2, 0.15), { tone: "lo", crease: "none" });
    put(depth(xTail + BODY_LEN / 2, 0, 0) + 0.4, out);
  }

  // ---- the timer: a dial whose hand sweeps from contact; two pins on its rim ----
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
    const t = K.radialTicks(D.x, D.y, D.r - 1.8, 16, 4, D.top, [1.0, 2.0], P, -0.75 * Math.PI, 1.5 * Math.PI);
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    // two pins: the shake-out time (fixed) and the time the gap buys (set by the gap)
    const pins = [[MODEL.tDep / MODEL.clockMax, "mid"], [clamp((S.plan.tIn - S.plan.tc) / MODEL.clockMax), "hi"]];
    for (const [f, tone] of pins) {
      const a = needleAngle(f), sx = Math.sin(a), sy = -Math.cos(a), rr = D.r - 0.9;
      out += solid(K.cylinder(D.x + sx * rr, D.y + sy * rr, 1.05, D.top, 2.2, P, 10), { tone, crease: "none" });
    }
    const a = needleAngle(S.clock), sx = Math.sin(a), sy = -Math.cos(a);
    out += line(K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 5), D.y + sy * (D.r - 5)], D.top + 0.2, P), { tone: "lit", free: true });
    out += line(K.ring(D.x, D.y, 1.4, D.top, P, 16), { tone: "mid" });
    put(depth(D.x, D.y), out);
  }

  // ---- the shake-out meter: six pegs that rise as the carriage's wings open ----
  {
    const M = G.METER;
    let out = solid(K.slabOf({ x: M.x - 4, y: M.y - 4.5, w: 6 * 5.4 + 3, d: 9, r: 1.5 }, 0, 2, P, 3, 0.4), { tone: "mid" });
    for (let i = 0; i < 6; i++) {
      const px = M.x + 1.5 + i * 5.4, on = i < S.pegs;
      out += solid(K.cylinder(px, M.y, 1.1, 2, on ? 6.4 : 2.2, P, 10), { tone: on ? "hi" : "lo", crease: "none" });
    }
    put(depth(M.x + 14, M.y) + 2, out);
  }
  // ---- the rack of men down: six pegs for the friendly force, six for the defenders ----
  {
    const R = G.RACK;
    let out = solid(K.slabOf({ x: R.x - 4, y: R.y - 4, w: 6 * 5.4 + 4, d: 17, r: 1.5 }, 0, 2, P, 3, 0.4), { tone: "mid" });
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
      const px = R.x + 1.5 + i * 5.4, py = R.y + 1.5 + r * 9;
      const down = (r === 0 ? S.downF : S.downE) > i;
      out += down ? solid(K.slabOf({ x: px - 1.6, y: py - 0.6, w: 3.2, d: 1.2, r: 0.3 }, 2, 0.5, P, 1), { tone: "lo", crease: "none" })
        : solid(K.cylinder(px, py, 0.9, 2, 3.4, P, 10), { tone: r === 0 ? "hi" : "mid", crease: "none" });
    }
    put(depth(R.x + 16, R.y + 6) + 2, out);
  }
  // ---- the gap rule at the front: a collar at the gap set, and an index at the gap now ----
  {
    const U = G.RULE, per = (U.x1 - U.x0) / MODEL.gap.max;
    const strip = { x: U.x0 - 4, y: U.y - 5, w: U.x1 - U.x0 + 8, d: 10, r: 1.4 };
    let out = solid(K.slabOf(strip, 0, 1.6, P, 3, 0.4), { tone: "mid" });
    const t = K.topTicks(U.x0, U.x1, per * MODEL.gap.step, 5, U.y + 5, 1.6, [-1.6, -2.3], P, "x");
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    const cxp = U.x0 + clamp(S.cfg.gap, 0, MODEL.gap.max) * per;
    out += solid(K.slabOf({ x: cxp - 1.7, y: U.y - 4, w: 3.4, d: 7, r: 0.6 }, 1.6, 3, P, 2, 0.2), { tone: S.lead ? "hi" : "lo", crease: "lo" });
    out += K.dotsSvg([at([cxp, U.y - 0.5, 4.6])], { size: 0.4 });
    // the index: the gap between the lead and the head of the main body now (it closes after contact)
    const now = S.lead ? clamp(S.sLead - S.sBody, 0, MODEL.gap.max) : 0;
    const ix = U.x0 + now * per;
    out += solid(K.slabOf({ x: ix - 0.5, y: U.y - 4.6, w: 1, d: 3.2, r: 0.2 }, 1.6, 1.4, P, 1), { tone: "lo", crease: "none" });
    put(depth(U.x0 + 40, U.y) + 4, out);
  }

  items.sort((a, b) => a.key - b.key);
  return items.map((i) => i.svg).join("");
}
