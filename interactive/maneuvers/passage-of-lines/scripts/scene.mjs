// The machine view's moving parts, rebuilt per frame: a stationary comb (three blocks that stand for the
// stationary unit's platoon positions) and a passing comb (three carriages that stand for the passing
// company's platoons) on rails. In a forward passage the carriages run through the gaps between the blocks;
// in a relief in place each incoming carriage slides into its block's slot while the outgoing block backs
// out beside it. A contact-point gate per lane, passage posts, a battle handover line bar, an outpost pad,
// an enemy-fire dial, a responsibility slide and a rack of men down. Written against the kit as a
// parameter (K) so build.mjs (Node) and the page (inlined kit) run the same code.
import { MODEL, SIG, clamp, ease } from "./model.mjs";

export const GEO = {
  XAA: -76, XCP: -44, XPP: 0, XBHL: 30, XAP: 56,       // assembly area, contact point, passage points, BHL, assault position
  Y_OUT: [-40, -4, 32], Y_IN: [-29, 7, 43], Y_LANE: [-16.5, 19.5],
  BLK: { len: 28, wid: 9, h: 9 },
  PAD: { x: 64, y: -26, w: 24, d: 54 },
  DIAL: { x: -58, y: -62, r: 10, z: 4, h: 5 },
  METER: { x: -20, y: -66 },
  RACK: { x: 18, y: -70 },
  SLIDE: { x0: -14, x1: 40, y: 56 },
  RULE: { x0: -70, x1: -26, y: 56 },
  X0: -88, X1: 90,
};
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;
export const lerp = (a, b, t) => a + (b - a) * t;
// the carriage x for a passage sigma: assembly area, contact point, BHL, assault position
export function xOfSigma(s, G = GEO) {
  if (s <= SIG.cp) return lerp(G.XAA, G.XCP, s / SIG.cp);
  if (s <= SIG.bhl) return lerp(G.XCP, G.XBHL, (s - SIG.cp) / (SIG.bhl - SIG.cp));
  return lerp(G.XBHL, G.XAP, (s - SIG.bhl) / (1 - SIG.bhl));
}
export const needleAngle = (f) => -0.75 * Math.PI + clamp(f) * 1.5 * Math.PI;

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
  const relief = S.mode === "relief";
  const p = S.plan;

  // ---- the three slots: a track plate per platoon position, from the assembly area to the position ----
  for (let i = 0; i < 3; i++) {
    const y0 = G.Y_OUT[i] - 6, y1 = G.Y_IN[i] + 6;
    const tr = { x: G.XAA - 8, y: y0, w: 100, d: y1 - y0, r: 1.6 };
    let out = solid(K.slabOf(tr, 0, 1, P, 3, 0.3), { tone: "lo", crease: "none" });
    out += line(K.planOutline(K.insetPlan(tr, 1.6), 1, P), { tone: "faint" });
    put(depth(G.XAA - 8 + 50, (y0 + y1) / 2, 0) - 2, out);
  }
  // ---- the lanes: two rail bars each with sleepers, from the assembly area to the assault position ----
  for (const ly of G.Y_LANE) {
    for (let x = G.XAA + 2; x <= G.XAP + 12; x += 12) put(depth(x, ly, 0) - 1.2, box(x, ly, 3, 13, 0, 0.7, { tone: "lo" }, 0.3));
    for (const dy of [-5.2, 5.2]) put(depth(0, ly + dy, 0) - 1, box((G.XAA + G.XAP + 12) / 2, ly + dy, G.XAP + 12 - G.XAA, 1.2, 0.7, 1, { tone: "mid" }, 0.3));
  }
  // the stationary unit's area, between the contact points and the BHL, as a faint outline on the plate
  put(depth(G.XPP, 0, 0) - 3, line(K.planOutline({ x: G.XCP, y: -50, w: G.XBHL - G.XCP, d: 106, r: 3 }, 0, P), { tone: "faint" }));

  // ---- the assembly area: a rack with a slot per platoon, where both combs start ----
  {
    const x = G.XAA - 6;
    let out = box(x, 3, 5, 100, 0, 5, { tone: "mid" }, 0.8);
    for (let i = 0; i < 3; i++) out += K.dotsSvg([at([x, G.Y_OUT[i], 5]), at([x, G.Y_IN[i], 5])], { size: 0.4 });
    out += K.dotsSvg([at([x, -44, 5]), at([x, 50, 5])], { size: 0.45 });
    put(depth(x, 0, 0) - 0.5, out);
  }
  // ---- contact points: a gate bar per lane that opens when its lane is free for the next platoon ----
  if (!relief) {
    for (let li = 0; li < 2; li++) {
      const ly = G.Y_LANE[li], gx = G.XCP + 3;
      const users = [0, 1, 2].filter((i) => p.lane[i] === li);
      const open = users.some((i) => S.t >= p.enter[i] - 0.5 && S.t <= p.bhl[i]) || S.t >= p.end;
      const z = open ? 0.9 : 7;
      let out = box(gx, ly - 7.5, 3, 3, 0, 9, { tone: "mid" }, 0.5) + box(gx, ly + 7.5, 3, 3, 0, 9, { tone: "mid" }, 0.5);
      out += box(gx, ly, 2.4, 16, z, 2.2, { tone: open ? "lo" : "hi" }, 0.4);
      out += K.dotsSvg([at([gx, ly - 7.5, 9]), at([gx, ly + 7.5, 9])], { size: 0.4 });
      put(depth(gx, ly, 0) + 1, out);
    }
  }
  // ---- passage points: a pair of low posts with a pennant on each lane, between the stationary blocks ----
  if (!relief) {
    for (const ly of G.Y_LANE) {
      let out = "";
      for (const dy of [-7.5, 7.5]) {
        out += box(G.XPP, ly + dy, 2.4, 2.4, 0, 9, { tone: "mid" }, 0.4);
        out += solid(K.slabOf({ x: G.XPP - 0.4, y: ly + dy - 2.4, w: 0.8, d: 4.8, r: 0.2 }, 6.6, 2.6, P, 1), { tone: "hi", crease: "none" });
      }
      put(depth(G.XPP, ly, 0) + 6, out);
    }
  }
  // ---- the battle handover line: a bar across the rows on posts at both ends, with a pennant ----
  {
    const x = G.XBHL;
    let out = box(x, 3, 1.8, 108, 0.7, 1.4, { tone: "hi" }, 0.3);
    for (const y of [-51, 57]) {
      out += box(x, y, 3, 3, 0, 9, { tone: "mid" }, 0.5);
      out += solid(K.slabOf({ x: x - 0.4, y: y - 2.4, w: 0.8, d: 4.8, r: 0.2 }, 6.4, 2.6, P, 1), { tone: "hi", crease: "none" });
      out += K.dotsSvg([at([x, y, 9])], { size: 0.4 });
    }
    put(depth(x, 0, 0) - 0.4, out);
  }

  // ---- the stationary comb: three blocks; in a relief each is the outgoing platoon and backs out ----
  for (let i = 0; i < 3; i++) {
    const xc = relief ? lerp(G.XAA, G.XPP, S.pl[i].out) : G.XPP;
    const y = G.Y_OUT[i], B = G.BLK;
    const plan = { x: xc - B.len / 2, y: y - B.wid / 2, w: B.len, d: B.wid, r: 1.2 };
    let out = solid(K.slabOf(plan, 1, B.h, P, 3, 0.4), { tone: "mid", crease: "lo" });
    out += line(K.planOutline(K.insetPlan(plan, 1.5), 1 + B.h, P), { tone: "faint" });
    out += K.dotsSvg(K.corners(plan, 1.8).map(([x, yy]) => at([x, yy, 1 + B.h])), { size: 0.4 });
    // an observation post on the roof, and a slit toward the enemy
    out += solid(K.cylinder(xc - 5, y, 2, 1 + B.h, 3.4, P, 14), { tone: "lo", crease: "none" });
    out += solid(K.slabOf({ x: xc + 3, y: y - 2.2, w: 6, d: 4.4, r: 0.4 }, 1 + B.h, 1.8, P, 2, 0.2), { tone: "hi", crease: "lo" });
    put(depth(xc, y, 0) + 0.5, out);
  }

  // ---- the outpost: a pad forward of the BHL with six pegs, each lowered as a defender is put out ----
  {
    const D = G.PAD;
    let out = solid(K.slabOf({ x: D.x, y: D.y, w: D.w, d: D.d, r: 2 }, 0, 2.2, P, 3, 0.4), { tone: "mid" });
    out += line(K.planOutline(K.insetPlan({ x: D.x, y: D.y, w: D.w, d: D.d, r: 2 }, 2.2), 2.2, P), { tone: "faint" });
    for (let n = 0; n < MODEL.enemy; n++) {
      const px = D.x + 6.5 + (n % 2) * 9, py = D.y + 7 + Math.floor(n / 2) * 15;
      const down = S.downE > n;
      out += down ? solid(K.slabOf({ x: px - 1.9, y: py - 0.8, w: 3.8, d: 1.6, r: 0.3 }, 2.2, 0.5, P, 1), { tone: "lo", crease: "none" })
        : solid(K.cylinder(px, py, 1.5, 2.2, 6.6, P, 12), { tone: "hi", crease: "none" });
    }
    put(depth(D.x + D.w / 2, 0, 0) + 3, out);
  }

  // ---- the passing comb: three carriages, the lit parts (the passing company's platoons) ----
  const order = [0, 1, 2].map((i) => {
    const q = S.pl[i];
    let x, y;
    if (relief) { x = lerp(G.XAA, G.XPP, q.sigma); y = G.Y_IN[i]; }
    else { x = xOfSigma(q.sigma); y = G.Y_LANE[p.lane[i]]; }
    return { i, x, y };
  });
  // a carriage queued behind another in the same lane is drawn first when it is further back
  order.sort((a, b) => depth(a.x, a.y) - depth(b.x, b.y));
  for (const { i, x, y } of order) {
    const hit = !relief && S.t >= MODEL.salvo && p.present.includes(i);
    const hitR = relief && S.plan.detected && S.t >= MODEL.reliefSalvo && S.plan.inPos[i] <= MODEL.reliefSalvo && S.plan.ready[i] > MODEL.reliefSalvo;
    const down = hit || hitR;
    const plan = { x: x - 9, y: y - 4.5, w: 18, d: 9, r: 1.4 };
    let out = "";
    for (const dx of [-5.5, 5.5]) for (const dy of [-5.6, 5.6]) out += solid(K.cylinder(x + dx, y + dy, 1.7, 0.8, 1.8, P, 12), { tone: "lo", crease: "none" });
    out += solid(K.slabOf(plan, 1.8, 5.2, P, 3, 0.3), { tone: "hi", lit: true, crease: "lo" });
    out += solid(K.slabOf({ x: x + 8, y: y - 2.4, w: 4, d: 4.8, r: 0.5 }, 2.8, 2.8, P, 2, 0.2), { tone: "mid", crease: "lo" });
    // platoon number: i + 1 short ridges on top
    for (let n = 0; n <= i; n++) out += line(K.lineOnTop([x - 6 + n * 2.8, y - 2.4], [x - 6 + n * 2.8, y + 2.4], 7.0, P), { tone: "faint", free: true });
    // a pennant that lies down when the platoon is hit
    out += solid(K.slabOf({ x: x - 7, y: y - 0.5, w: 1, d: 1, r: 0.2 }, 7, down ? 0.6 : 3.6, P, 1), { tone: down ? "lo" : "mid", crease: "none" });
    if (!down) out += solid(K.slabOf({ x: x - 7.2, y: y - 2.8, w: 0.8, d: 3.4, r: 0.1 }, 9.8, 1.4, P, 1), { tone: "hi", crease: "none" });
    put(depth(x, y, 0) + 1.5, out);
  }

  // ---- the enemy-fire dial: the hand runs to the moment the salvo lands, a pin pops up when it does ----
  {
    const D = G.DIAL;
    let out = "";
    const ped = { x: D.x - 15, y: D.y - 9, w: 30, d: 19, r: 3 };
    out += solid(K.slabOf(ped, 0, 3.4, P, 5, 0.6), { tone: "mid" });
    out += line(K.planOutline(K.insetPlan(ped, 2.2), 3.4, P), { tone: "faint" });
    out += K.dotsSvg(K.corners(ped, 2.6).map(([x, y]) => at([x, y, 3.4])), { size: 0.45 });
    out += solid(K.cylinder(D.x, D.y, 4.4, 3.4, 1.0, P, 24), { tone: "mid" });
    out += solid(K.cylinder(D.x, D.y, D.r, D.z, D.h, P, 64, 0.8), { tone: "hi", crease: "lo" });
    out += line(K.knurl(D.x, D.y, D.r, D.top - 2.8, D.top, 56, P, 0.3), { tone: "lo" });
    out += line(K.ring(D.x, D.y, D.r - 1.6, D.top, P, 64), { tone: "lo" });
    const t = K.radialTicks(D.x, D.y, D.r - 1.6, 20, 5, D.top, [1.0, 1.8], P, -0.75 * Math.PI, 1.5 * Math.PI);
    out += line(t.minor, { tone: "lo" }) + line(t.major, { tone: "mid" });
    const salvoT = relief ? MODEL.reliefSalvo : MODEL.salvo;
    const f = S.released ? clamp(S.t / salvoT) : 0;
    const a = needleAngle(f), sx = Math.sin(a), sy = -Math.cos(a);
    out += line(K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 4.5), D.y + sy * (D.r - 4.5)], D.top + 0.2, P), { tone: "lit", free: true });
    out += line(K.ring(D.x, D.y, 1.3, D.top, P, 16), { tone: "mid" });
    // the pin beside the dial: up while the salvo lands
    const pz = S.salvo ? D.top + 4 : 0.4;
    out += solid(K.cylinder(D.x + 20, D.y, 1.7, 0, 3.4, P, 14), { tone: "mid", crease: "none" });
    out += solid(K.cylinder(D.x + 20, D.y, 0.9, 3.4, pz + 0.6, P, 10), { tone: S.salvo ? "hi" : "lo", crease: "none" });
    put(depth(D.x, D.y) + 1, out);
  }

  // ---- the meter: three pegs that rise as platoons go through their passage points (relief: are in place) ----
  {
    const M = G.METER;
    let out = solid(K.slabOf({ x: M.x - 4, y: M.y - 4.5, w: 3 * 5.4 + 3, d: 9, r: 1.5 }, 0, 2, P, 3, 0.4), { tone: "mid" });
    for (let i = 0; i < 3; i++) {
      const px = M.x + 1.5 + i * 5.4, on = i < S.through;
      out += solid(K.cylinder(px, M.y, 1.1, 2, on ? 6.4 : 2.2, P, 10), { tone: on ? "hi" : "lo", crease: "none" });
    }
    put(depth(M.x + 8, M.y) + 2, out);
  }
  // ---- the rack of men down: six pegs for the passing company, six for the outpost ----
  {
    const R = G.RACK;
    let out = solid(K.slabOf({ x: R.x - 4, y: R.y - 4, w: 6 * 5.4 + 4, d: 17, r: 1.5 }, 0, 2, P, 3, 0.4), { tone: "mid" });
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
      const px = R.x + 1.5 + i * 5.4, py = R.y + 1.5 + r * 9;
      const dn = (r === 0 ? S.downF : S.downE) > i;
      out += dn ? solid(K.slabOf({ x: px - 1.6, y: py - 0.6, w: 3.2, d: 1.2, r: 0.3 }, 2, 0.5, P, 1), { tone: "lo", crease: "none" })
        : solid(K.cylinder(px, py, 0.9, 2, 3.4, P, 10), { tone: r === 0 ? "hi" : "mid", crease: "none" });
    }
    put(depth(R.x + 16, R.y + 6) + 2, out);
  }
  // ---- the responsibility slide: a small carriage at the left while the stationary unit holds the ground,
  //      at the right once control has passed ----
  {
    const U = G.SLIDE;
    const strip = { x: U.x0 - 6, y: U.y - 5, w: U.x1 - U.x0 + 12, d: 10, r: 1.4 };
    let out = solid(K.slabOf(strip, 0, 1.4, P, 3, 0.4), { tone: "mid" });
    out += line(K.lineOnTop([U.x0, U.y], [U.x1, U.y], 1.4, P), { tone: "faint", free: true });
    for (const x of [U.x0 - 3, U.x1 + 3]) out += solid(K.slabOf({ x: x - 1, y: U.y - 4, w: 2, d: 8, r: 0.4 }, 1.4, 3.4, P, 2, 0.2), { tone: "lo", crease: "none" });
    const f = S.released ? ease(clamp((S.t - S.plan.T2 + 0.5) / 1.0)) : 0;
    const cx = lerp(U.x0 + 3, U.x1 - 3, f);
    out += solid(K.slabOf({ x: cx - 3.2, y: U.y - 3.2, w: 6.4, d: 6.4, r: 1 }, 1.4, 3.2, P, 3, 0.3), { tone: "hi", lit: true, crease: "lo" });
    out += K.dotsSvg([at([cx - 1.8, U.y - 1.8, 4.6]), at([cx + 1.8, U.y + 1.8, 4.6])], { size: 0.4 });
    put(depth(U.x0 + 20, U.y) + 3, out);
  }
  // ---- the rule: a collar set to how many platoons move together ----
  {
    const U = G.RULE, per = (U.x1 - U.x0) / 2;
    const strip = { x: U.x0 - 4, y: U.y - 5, w: U.x1 - U.x0 + 8, d: 10, r: 1.4 };
    let out = solid(K.slabOf(strip, 0, 1.6, P, 3, 0.4), { tone: "mid" });
    for (let n = 0; n < 3; n++) out += line(K.lineOnTop([U.x0 + n * per, U.y + 2], [U.x0 + n * per, U.y + 5], 1.6, P), { tone: "mid" });
    const cxp = U.x0 + (S.k - 1) * per;
    out += solid(K.slabOf({ x: cxp - 1.7, y: U.y - 4, w: 3.4, d: 7, r: 0.6 }, 1.6, 3, P, 2, 0.2), { tone: "hi", crease: "lo" });
    out += K.dotsSvg([at([cxp, U.y - 0.5, 4.6])], { size: 0.4 });
    put(depth(U.x0 + 20, U.y) + 4, out);
  }

  items.sort((a, b) => a.key - b.key);
  return items.map((i) => i.svg).join("");
}
