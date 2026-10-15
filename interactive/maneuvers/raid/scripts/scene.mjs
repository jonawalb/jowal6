// The machine view's moving parts, rebuilt per frame: a shuttle on a rail (the raiding force) that runs
// out to a target block, holds on it while a task meter fills, and runs back; a gate over the rail that
// a timer drops (the response force reaching the withdrawal route); a brake on the timer (the security
// element holding that force); a dwell rule with a collar; a rack of men down. Written against the kit as
// a parameter (K) so build.mjs (Node) and the page (inlined kit) run the same code.
import { RAIL, MODEL, clamp, ease } from "./model.mjs";

export const GEO = {
  X0: -74, X1: 74,         // rail extent
  Y_FRONT: 31,             // front ruler
  GATE_X: RAIL.GX,
  TARGET_X: 62,
  DIAL: { x: -46, y: -33, r: 11, z: 5, h: 5 },
  METER: { x: -16, y: -36 },
  RACK: { x: 30, y: -41 },
  RULE: { x0: -56, x1: 28, y: 31 },   // the dwell rule: 12 s over 84 units
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;
export const lerp = (a, b, t) => a + (b - a) * t;
export const xOfU = (u) => RAIL.HX + u * (RAIL.OX - RAIL.HX);
export const needleAngle = (f) => -0.75 * Math.PI + clamp(f) * 1.5 * Math.PI;

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
  const gateOn = S.gate;

  // ---- the rail: sleepers, two bars, end stops ----
  for (let x = G.X0 + 4; x <= G.X1 - 3; x += 12) put(depth(x, 0, 0) - 0.6, box(x, 0, 3, 17, 0, 0.8, { tone: "lo" }, 0.3));
  for (const dy of [-RY, RY]) {
    put(depth(0, dy, 0) - 0.3, box((G.X0 + G.X1) / 2, dy, G.X1 - G.X0, 1.4, 0.8, 1.2, { tone: "mid" }, 0.3));
  }
  // the home stop: a block with a buffer, where the force starts and ends
  {
    const x = G.X0 + 2;
    let out = box(x, 0, 6, 15, 0, 6, { tone: "mid" }, 0.8);
    out += solid(K.cylinder(x + 3.6, -3.2, 1.3, 2, 2.2, P, 12), { tone: "lo", crease: "none" });
    out += solid(K.cylinder(x + 3.6, 3.2, 1.3, 2, 2.2, P, 12), { tone: "lo", crease: "none" });
    out += K.dotsSvg([at([x, -5.5, 6]), at([x, 5.5, 6])], { size: 0.4 });
    put(depth(x, 0, 0), out);
  }

  // ---- the target block at the objective: a housing with a pop-up plate that the shuttle trips ----
  {
    const x = G.TARGET_X;
    const up = S.taskDone ? 0 : 1 - 0.0;
    const h = S.taskDone ? 1.6 : 11;
    let out = box(x + 4, 0, 14, 20, 0, 4.5, { tone: "mid" }, 1.4);
    out += line(K.planOutline(K.insetPlan({ x: x - 3, y: -10, w: 14, d: 20, r: 1.4 }, 2.2), 4.5, P), { tone: "faint" });
    out += solid(K.slabOf({ x: x + 2, y: -8, w: 2.6, d: 16, r: 0.4 }, 4.5, h, P, 2, 0.2), { tone: S.taskDone ? "lo" : "hi", crease: "lo" });
    out += K.dotsSvg(K.corners({ x: x - 3, y: -10, w: 14, d: 20 }, 2.4).map(([cx, cy]) => at([cx, cy, 4.5])), { size: 0.4 });
    put(depth(x + 4, 0, 0), out);
  }

  // ---- the gate over the rail: two posts, a header and a drop bar that falls when the timer runs out ----
  {
    const gx = G.GATE_X, closed = S.gate;
    const rest = S.plan.straddle && S.stalled ? 10.2 : 0.9;        // the bar comes to rest on the shuttle if it was under it
    const barZ = lerp(14.5, rest, ease(closed));
    for (const sy of [-11, 11]) {
      let out = box(gx, sy, 5, 5, 0, 1.4, { tone: "lo" }, 0.6) + box(gx, sy, 3, 3, 1.4, 19, { tone: "mid" }, 0.5);
      out += K.dotsSvg([at([gx, sy, 20.4])], { size: 0.4 });
      put(depth(gx, sy, 0) + (sy > 0 ? 0.5 : 0), out);
    }
    // header across the posts
    put(depth(gx, 0, 22) - 0.1 + 6, box(gx, 0, 3.4, 26, 20.4, 3, { tone: "hi" }, 0.6));
    // the drop bar and its two guide rods
    put(depth(gx, 0, barZ) + 6.3, box(gx, 0, 2.6, 19, barZ, 3.2, { tone: "hi", lit: false }, 0.4) + box(gx, -9.6, 1.2, 1.2, barZ, 20.4 - barZ, { tone: "lo" }, 0.3) + box(gx, 9.6, 1.2, 1.2, barZ, 20.4 - barZ, { tone: "lo" }, 0.3));
  }

  // ---- the shuttle: the raiding force, the lit part ----
  {
    const cx = xOfU(S.u);
    const faceRight = S.phase !== "out";
    const y = 0;
    const plan = { x: cx - RAIL.SHL, y: y - 4.5, w: RAIL.SHL * 2, d: 9, r: 1.4 };
    let out = "";
    for (const dx of [-4.5, 4.5]) for (const dy of [-5.6, 5.6]) out += solid(K.cylinder(cx + dx, y + dy, 1.7, 0, 1.8, P, 14), { tone: "lo", crease: "none" });
    out += solid(K.slabOf(plan, 1.4, 6.6, P, 3, 0.4), { tone: "hi", lit: true, crease: "lo" });
    out += line(K.planOutline(K.insetPlan(plan, 1.8), 8, P), { tone: "faint" });
    // a nose pointing the way it is heading, and a cab
    const nx = faceRight ? cx + RAIL.SHL - 1 : cx - RAIL.SHL - 1.6;
    out += solid(K.slabOf({ x: nx, y: y - 2.6, w: 2.6, d: 5.2, r: 0.6 }, 2.6, 3.6, P, 2, 0.2), { tone: "mid", crease: "lo" });
    out += solid(K.cylinder(cx - (faceRight ? 1.5 : -1.5), y, 2.2, 8, 1.4, P, 16), { tone: "mid", crease: "lo" });
    out += K.dotsSvg(K.corners(plan, 2).map(([x, yy]) => at([x, yy, 8])), { size: 0.4 });
    put(depth(cx, y, 0) + 0.6, out);
  }

  // ---- the timer: a dial whose hand sweeps from the alert to the gate closing; a brake on it ----
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
    const a = needleAngle(S.clockFrac), sx = Math.sin(a), sy = -Math.cos(a);
    out += line(K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 5), D.y + sy * (D.r - 5)], D.top + 0.2, P), { tone: "lit", free: true });
    out += line(K.ring(D.x, D.y, 1.4, D.top, P, 16), { tone: "mid" });
    put(depth(D.x, D.y), out);
    // the brake: a lever on a post, on the dial's open (front) side, that presses a pad on the rim when the security element holds the response force
    const by = D.y + 18, lz = S.security ? D.z + 1.2 : D.top + 5;
    const armY = D.y + D.r + 0.4;
    let br = box(D.x, by, 5, 5, 0, 7, { tone: "mid" }, 0.6);
    br += solid(K.cylinder(D.x, by, 0.9, 7, Math.max(0.4, lz + 0.4 - 7), P, 10), { tone: "lo", crease: "none" });
    br += solid(K.slabOf({ x: D.x - 1.6, y: armY, w: 3.2, d: by - armY + 1.5, r: 0.5 }, lz + 0.4, 2.2, P, 2, 0.2), { tone: S.security ? "hi" : "lo", crease: "lo" });
    br += K.dotsSvg([at([D.x, by, 7])], { size: 0.4 });
    put(depth(D.x, by, 0) + 1.2, br);
  }

  // ---- the task meter: six pegs that rise while the shuttle holds on the objective ----
  {
    const M = G.METER;
    let out = solid(K.slabOf({ x: M.x - 4, y: M.y - 4.5, w: MODEL.pegs * 5.4 + 3, d: 9, r: 1.5 }, 0, 2, P, 3, 0.4), { tone: "mid" });
    for (let i = 0; i < MODEL.pegs; i++) {
      const px = M.x + 1.5 + i * 5.4, on = i < S.pegs;
      out += solid(K.cylinder(px, M.y, 1.1, 2, on ? 6.4 : 2.2, P, 10), { tone: on ? "hi" : "lo", crease: "none" });
    }
    put(depth(M.x + 14, M.y) + 2, out);
  }
  // ---- the rack of men down: six pegs for the raiding force, six for the defenders ----
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
  // ---- the dwell rule at the front: a collar set to the time to hold, and an index that follows the clock ----
  {
    const U = G.RULE, per = (U.x1 - U.x0) / MODEL.dwell.max;
    const strip = { x: U.x0 - 4, y: U.y - 5, w: U.x1 - U.x0 + 8, d: 10, r: 1.4 };
    let out = solid(K.slabOf(strip, 0, 1.6, P, 3, 0.4), { tone: "mid" });
    const t = K.topTicks(U.x0, U.x1, per, 2, U.y + 5, 1.6, [-1.6, -2.3], P, "x");
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    const cxp = U.x0 + clamp(S.dwell, 0, MODEL.dwell.max) * per;
    out += solid(K.slabOf({ x: cxp - 1.7, y: U.y - 4, w: 3.4, d: 7, r: 0.6 }, 1.6, 3, P, 2, 0.2), { tone: "hi", crease: "lo" });
    out += K.dotsSvg([at([cxp, U.y - 0.5, 4.6])], { size: 0.4 });
    // the index: how long the shuttle has been on the objective, capped where it leaves
    const held = clamp(Math.min(S.t, S.plan.L) - MODEL.run, 0, MODEL.dwell.max);
    const ix = U.x0 + held * per;
    out += solid(K.slabOf({ x: ix - 0.5, y: U.y - 4.6, w: 1, d: 3.2, r: 0.2 }, 1.6, 1.4, P, 1), { tone: "lo", crease: "none" });
    put(depth(U.x0 + 40, U.y) + 4, out);
  }

  items.sort((a, b) => a.key - b.key);
  return items.map((i) => i.svg).join("");
}
