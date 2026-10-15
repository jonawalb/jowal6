// The machine view's moving parts, rebuilt per frame: a carriage on a rail (the platoon's line) that advances
// in four bounds and halts after each; a gauge of the ammunition it carries; a belt along the front with a
// collection tray (the platoon CCP) and a bin (the company CCP); a cart (the logistics team, litter bearers or
// a nonmedical vehicle) that takes casualties down the belt and then brings ammunition up the lane; a clock;
// a time rule whose dark segments are the halts; a rack of men down. Written against the kit as a parameter (K)
// so build.mjs (Node) and the page (inlined kit) run the same code.
import { MODEL, clamp, ease } from "./model.mjs";

export const GEO = {
  X0: -76, X1: 72,           // rail extent
  RAIL_Y: -14,               // the line's rail
  LANE_Y: -2,                // the cart's lane to the line
  BELT_Y: 9,                 // the belt (casualties)
  PH0: -54, PH: 28,          // phase line x = PH0 + j * PH
  CCP: { x0: -66, y: 21, n: 8, step: 5.2 },   // the collection tray
  BIN: { x: -84, y: 9 },
  DIAL: { x: 46, y: -40, r: 11, z: 5, h: 5 },
  RACK: { x: -44, y: -45 },
  RULE: { x0: -56, x1: 64, y: 37 },
  TANK: { x: -84, y: -14 },
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;
export const lerp = (a, b, t) => a + (b - a) * t;
export const lineX = (u) => GEO.PH0 + u * GEO.PH;
export const slotX = (n) => GEO.CCP.x0 + 3 + n * GEO.CCP.step;
export const needleAngle = (f) => -0.75 * Math.PI + clamp(f) * 1.5 * Math.PI;
export const CCP_X = GEO.CCP.x0 + 22;   // where the cart waits

export function cartPos(S) {
  const c = S.carrier, G = GEO;
  if (c.mode === "cas") return { x: lerp(CCP_X, G.BIN.x + 8, ease(c.f)), y: G.BELT_Y, lane: false };
  if (c.mode === "ammoOut") return { x: lerp(CCP_X, lineX(c.bound + 1) - 12, ease(c.f)), y: G.LANE_Y, lane: true };
  if (c.mode === "ammoBack") return { x: lerp(lineX(c.bound + 1) - 12, CCP_X, ease(c.f)), y: G.LANE_Y, lane: true };
  if (c.mode === "atLine") return { x: lineX(MODEL.B) - 12, y: G.LANE_Y, lane: true };
  return { x: CCP_X, y: G.BELT_Y, lane: false };
}
// where a casualty token is: at the carriage when it occurs, carried down the belt to its slot, in the tray,
// on the cart, then in the bin
export function tokenPos(x, S) {
  const G = GEO;
  const slot = slotX(x.n % G.CCP.n);
  if (!x.down) return null;
  if (!x.arrived) { const f = ease(clamp(x.carryF)); const x0 = lineX(x.bound + (x.tc - S.plan.bounds[x.bound].S) / MODEL.bound); return { x: lerp(x0, slot, f), y: lerp(G.BELT_Y, G.CCP.y, f), z: 0 }; }
  if (!x.left) return { x: slot, y: G.CCP.y, z: 0 };
  if (!x.evac) { const c = S.carrier, f = c.mode === "cas" && c.idx === x.n ? c.f : 0; return { x: lerp(slot, cartPos(S).x, 1), y: lerp(G.CCP.y, G.BELT_Y, 1), z: 3.4 }; }
  const k = S.cas.filter((y) => y.evac && y.n <= x.n).length - 1;
  return { x: G.BIN.x - 1.5 + (k % 2) * 3, y: G.BIN.y - 3 + (Math.floor(k / 2) % 4) * 2.2, z: 1.2 + Math.floor(k / 8) * 1.1 };
}

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

  // ---- the rail the line runs on: sleepers, two bars, the line of departure stop ----
  for (let x = G.X0 + 4; x <= G.X1 - 3; x += 12) put(depth(x, G.RAIL_Y, 0) - 0.6, box(x, G.RAIL_Y, 3, 17, 0, 0.8, { tone: "lo" }, 0.3));
  for (const dy of [-RY, RY]) put(depth(0, G.RAIL_Y + dy, 0) - 0.3, box((G.X0 + G.X1) / 2, G.RAIL_Y + dy, G.X1 - G.X0, 1.4, 0.8, 1.2, { tone: "mid" }, 0.3));
  // phase line pegs: five posts with a flag plate; the line halts at each
  for (let j = 0; j <= MODEL.B; j++) {
    const x = G.PH0 + j * G.PH + 8;
    let out = solid(K.cylinder(x, G.RAIL_Y - 10.5, 0.9, 0, 6.5, P, 10), { tone: "lo", crease: "none" });
    out += solid(K.slabOf({ x: x - 0.4, y: G.RAIL_Y - 12.2, w: 0.8, d: 3.4, r: 0.2 }, 3.6, 2.8, P, 1), { tone: j <= S.u + 1e-6 ? "hi" : "mid", crease: "none" });
    put(depth(x, G.RAIL_Y - 10.5, 0), out);
  }

  // ---- the ammunition tank: the level is what the line has left ----
  {
    const T = G.TANK;
    let out = solid(K.cylinder(T.x, T.y, 6.4, 0, 2, P, 28), { tone: "lo" });
    out += solid(K.cylinder(T.x, T.y, 5, 2, 16, P, 28, 0.6), { tone: "mid", crease: "lo" });
    out += line(K.ring(T.x, T.y, 5, 18, P, 28), { tone: "lo" });
    const h = 0.8 + 12 * S.ammo;
    out += solid(K.cylinder(T.x, T.y, 3.4, 4, h, P, 22), { tone: "hi", lit: false, crease: "lo" });
    out += K.dotsSvg([at([T.x + 5, T.y, 18])], { size: 0.4 });
    put(depth(T.x, T.y, 0), out);
  }

  // ---- the belt: two bars and a bed; the platoon CCP tray with eight slots; the company CCP bin ----
  {
    const bed = { x: G.BIN.x - 4, y: G.BELT_Y - 4.5, w: 150, d: 9, r: 1 };
    put(depth(0, G.BELT_Y, 0) - 1, solid(K.slabOf(bed, 0, 1.0, P, 3, 0.3), { tone: "lo", crease: "none" }));
    const t = K.topTicks(bed.x + 8, bed.x + bed.w - 8, 6, 5, G.BELT_Y + 3.9, 1.0, [-1.2, -1.9], P, "x");
    put(depth(0, G.BELT_Y, 0) - 0.5, line(K.planOutline(K.insetPlan(bed, 0.6), 1.0, P), { tone: "faint" }) + line(t.minor, { tone: "faint" }) + line(t.major, { tone: "lo" }));
    const C = G.CCP;
    const tray = { x: C.x0, y: C.y - 4.5, w: C.n * C.step + 5, d: 9, r: 1.4 };
    let out = solid(K.slabOf(tray, 0, 1.8, P, 3, 0.4), { tone: "mid" });
    for (let n = 0; n < C.n; n++) out += line(K.planOutline({ x: slotX(n) - 1.8, y: C.y - 2.2, w: 3.6, d: 4.4, r: 0.5 }, 1.8, P), { tone: "lo" });
    out += line(K.planOutline(K.insetPlan(tray, 1.2), 1.8, P), { tone: "faint" });
    put(depth(C.x0 + 20, C.y, 0), out);
    // the bin
    const B = G.BIN;
    let bin = box(B.x, B.y, 14, 16, 0, 1.2, { tone: "lo" }, 1);
    bin += box(B.x, B.y - 7.4, 14, 1.4, 1.2, 5, { tone: "mid" }, 0.3) + box(B.x - 6.6, B.y, 1.4, 16, 1.2, 5, { tone: "mid" }, 0.3) + box(B.x + 6.6, B.y, 1.4, 16, 1.2, 5, { tone: "mid" }, 0.3);
    bin += K.dotsSvg([at([B.x - 6.6, B.y - 7.4, 6.2]), at([B.x + 6.6, B.y - 7.4, 6.2])], { size: 0.4 });
    put(depth(B.x, B.y - 6, 0), bin);
    put(depth(B.x, B.y + 8, 0) + 2, box(B.x, B.y + 7.4, 14, 1.4, 1.2, 3.4, { tone: "mid" }, 0.3));
  }

  // ---- the line: a carriage on the rail, the lit part ----
  {
    const cx = lineX(S.u) + 8, y = G.RAIL_Y;
    const plan = { x: cx - 8, y: y - 4.5, w: 16, d: 9, r: 1.4 };
    let out = "";
    for (const dx of [-5.5, 5.5]) for (const dy of [-5.6, 5.6]) out += solid(K.cylinder(cx + dx, y + dy, 1.7, 0, 1.8, P, 14), { tone: "lo", crease: "none" });
    out += solid(K.slabOf(plan, 1.4, 6.6, P, 3, 0.4), { tone: "hi", lit: true, crease: "lo" });
    out += line(K.planOutline(K.insetPlan(plan, 1.8), 8, P), { tone: "faint" });
    // a row of pegs on top: the platoon (a few fall as casualties occur) and a small hopper for the ammunition
    const strong = Math.max(0, 6 - Math.min(S.downF, 6));
    for (let i = 0; i < 6; i++) out += solid(K.cylinder(cx - 6 + i * 2.4, y, 0.8, 8, i < strong ? 3.2 : 0.6, P, 10), { tone: i < strong ? "mid" : "lo", crease: "none" });
    out += K.dotsSvg(K.corners(plan, 2).map(([x, yy]) => at([x, yy, 8])), { size: 0.4 });
    put(depth(cx, y, 0) + 0.6, out);
  }

  // ---- the cart: litter bearers (a stretcher) or a nonmedical vehicle; carries the casualty out, then the ammunition up ----
  {
    const c = cartPos(S);
    let out = "";
    if (S.vehicle) {
      out += box(c.x, c.y, 11, 6, 1.6, 3.6, { tone: "mid", crease: "lo" }, 0.8) + box(c.x - 3.4, c.y, 4, 6, 5.2, 2.4, { tone: "hi", crease: "lo" }, 0.6);
      for (const dx of [-3.6, 3.6]) for (const dy of [-3.4, 3.4]) out += solid(K.cylinder(c.x + dx, c.y + dy, 1.5, 0, 1.6, P, 12), { tone: "lo", crease: "none" });
    } else {
      out += box(c.x, c.y, 10, 3, 2.2, 0.8, { tone: "mid", crease: "none" }, 0.3);
      for (const dx of [-5.4, 5.4]) for (const dy of [-1.8, 1.8]) out += solid(K.cylinder(c.x + dx, c.y + dy, 0.5, 0, 2.2, P, 8), { tone: "lo", crease: "none" });
    }
    if (c.lane && S.carrier.mode === "ammoOut") out += solid(K.cylinder(c.x + (S.vehicle ? 0 : 0), c.y, 1.5, S.vehicle ? 5.2 : 3, 2.6, P, 12), { tone: "hi", crease: "none" });
    put(depth(c.x, c.y, 0) + 1.4, out);
  }

  // ---- the casualty tokens: grey, still, lying flat ----
  for (const x of S.cas) {
    const p = tokenPos(x, S);
    if (!p) continue;
    const z = x.left && !x.evac ? 3.4 : p.z;
    const out = solid(K.slabOf({ x: p.x - 2, y: p.y - 0.9, w: 4, d: 1.8, r: 0.4 }, z + 0.9, 0.9, P, 1), { tone: "lo", crease: "none" })
      + solid(K.cylinder(p.x - 2.4, p.y, 0.9, z + 0.9, 0.9, P, 10), { tone: "lo", crease: "none" });
    put(depth(p.x, p.y, 0) + 3 + (x.left && !x.evac ? 1 : 0), out);
  }

  // ---- the clock: the run's progress from the line of departure to the last phase line ----
  {
    const D = G.DIAL;
    let out = "";
    const ped = { x: D.x - 15, y: D.y - 12, w: 30, d: 24, r: 3 };
    out += solid(K.slabOf(ped, 0, 3.4, P, 5, 0.6), { tone: "mid" });
    out += line(K.planOutline(K.insetPlan(ped, 2.6), 3.4, P), { tone: "faint" });
    out += K.dotsSvg(K.corners(ped, 3.2).map(([x, y]) => at([x, y, 3.4])), { size: 0.45 });
    out += solid(K.cylinder(D.x, D.y, 5, 3.4, 1.8, P, 28), { tone: "mid" });
    out += solid(K.cylinder(D.x, D.y, D.r, D.z, D.h, P, 72, 0.8), { tone: "hi", crease: "lo" });
    out += line(K.knurl(D.x, D.y, D.r, D.top - 2.8, D.top, 64, P, 0.3), { tone: "lo" });
    out += line(K.ring(D.x, D.y, D.r - 1.8, D.top, P, 72), { tone: "lo" });
    const t = K.radialTicks(D.x, D.y, D.r - 1.8, 20, 5, D.top, [1.0, 2.0], P, -0.75 * Math.PI, 1.5 * Math.PI);
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    const frac = S.released ? clamp(S.t / S.end) : 0;
    const a = needleAngle(frac), sx = Math.sin(a), sy = -Math.cos(a);
    out += line(K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 5), D.y + sy * (D.r - 5)], D.top + 0.2, P), { tone: "lit", free: true });
    out += line(K.ring(D.x, D.y, 1.4, D.top, P, 16), { tone: "mid" });
    put(depth(D.x, D.y), out);
  }

  // ---- the rack: eight pegs for men down in the platoon, six for the defenders ----
  {
    const R = G.RACK;
    let out = solid(K.slabOf({ x: R.x - 4, y: R.y - 4, w: 8 * 5.4 + 4, d: 17, r: 1.5 }, 0, 2, P, 3, 0.4), { tone: "mid" });
    for (let r = 0; r < 2; r++) for (let i = 0; i < (r === 0 ? 8 : 6); i++) {
      const px = R.x + 1.5 + i * 5.4, py = R.y + 1.5 + r * 9;
      const down = (r === 0 ? S.downF : S.downE) > i;
      if (r === 0 && i >= S.cfg.cas) { out += solid(K.cylinder(px, py, 0.5, 2, 0.6, P, 8), { tone: "lo", crease: "none" }); continue; }
      out += down ? solid(K.slabOf({ x: px - 1.6, y: py - 0.6, w: 3.2, d: 1.2, r: 0.3 }, 2, 0.5, P, 1), { tone: "lo", crease: "none" })
        : solid(K.cylinder(px, py, 0.9, 2, 3.4, P, 10), { tone: r === 0 ? "hi" : "mid", crease: "none" });
    }
    put(depth(R.x + 20, R.y + 6) + 2, out);
  }

  // ---- the time rule at the front: light segments are bounds, dark segments the halts; the index is the clock ----
  {
    const U = G.RULE, per = (U.x1 - U.x0) / 40;
    let out = solid(K.slabOf({ x: U.x0 - 4, y: U.y - 6, w: U.x1 - U.x0 + 8, d: 12, r: 1.4 }, 0, 1.4, P, 3, 0.4), { tone: "mid" });
    const t = K.topTicks(U.x0, U.x1, per * 5, 1, U.y + 6, 1.4, [-1.4, -2.2], P, "x");
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    for (const b of S.plan.bounds) {
      out += solid(K.slabOf({ x: U.x0 + b.S * per, y: U.y - 3.4, w: Math.max(0.4, MODEL.bound * per - 0.4), d: 5, r: 0.3 }, 1.4, 0.9, P, 1), { tone: "hi", crease: "none" });
      out += solid(K.slabOf({ x: U.x0 + b.Hs * per, y: U.y - 3.4, w: Math.max(0.4, b.H * per - 0.4), d: 5, r: 0.3 }, 1.4, 0.9, P, 1), { tone: "lo", crease: "none" });
    }
    const ix = U.x0 + clamp(S.released ? S.t : 0, 0, S.end) * per;
    out += solid(K.slabOf({ x: ix - 0.5, y: U.y - 5, w: 1, d: 3, r: 0.2 }, 1.4, 3.2, P, 1), { tone: "mid", crease: "lo" });
    out += K.dotsSvg([at([ix, U.y - 3.5, 4.6])], { size: 0.38 });
    put(depth(U.x0 + 60, U.y) + 4, out);
  }

  items.sort((a, b) => a.key - b.key);
  return items.map((i) => i.svg).join("");
}
