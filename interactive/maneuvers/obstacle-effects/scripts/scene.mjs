// The machine: a flow table with four baffles, each held in working position by a fire jet. Written
// against the kit as a parameter (K) so build.mjs (Node) and the page (inlined kit) run the same code.
// The tray is the Battlefield's map scaled by MG.S: the same avenue A, branch B and four groups, so the
// balls take the same routes at the same times (model.mjs).
//   machineStatic(K, P)  -> items [{ key, svg }] that never change (bed, rails, posts, trough)
//   machineDyn(K, P, V)  -> items [{ id, key, at, look, svg }] that move or change with V
//   V.c    { D, T, F, B } 0..1 how far each jet has the baffle up (eased)
//   V.men  [{ id, x, y, state }] ball poses in map units (poseAt), state move|dwell|held|hit|out|through
import { MODEL, ROUTES, STN, ANCHOR } from "./model.mjs";

export const MG = {
  S: 0.56,                // machine units per map unit
  FLOOR: 5, RAIL: 3,    // channel floor height and rail height above it
  WA: 7.6, WB: 6.4,       // channel half widths, avenue A and branch B
  BALL: 2.5,              // ball radius
  BED: { x: -118, y: -46, w: 222, d: 118, r: 5 },
  BED_H: 5,
  TANK: { x: -78, y: 46 },
  GAUGE: { x: -50, y: 50, r: 11, z: 14, h: 5 },
  TROUGH: 12,
};

const toM = (u, v) => [u * MG.S, v * MG.S];
const rail = 1.3;
const halfWidth = (route, s) => {
  if (route === "A") return MG.WA;
  const sF = STN.F.s;
  const bump = Math.exp(-(((s - sF) / 26) ** 2));
  const open = Math.min(1, Math.max(0, (s - (STN.T.s - 36)) / 24));      // the branch widens out of avenue A
  return MG.WB * (0.55 + 0.45 * open) + 4 * bump;
};
// a point at arc length s on a route, `off` machine units to its left
export function mAt(route, s, off = 0) {
  const p = ROUTES[route].at(s);
  const rad = (p.face + 90) * Math.PI / 180;
  const [x, y] = toM(p.u, p.v);
  return [x + off * Math.cos(rad), y + off * Math.sin(rad), p.face];
}
const ribbon = (route, s0, s1, wf, step = 6) => {
  const L = [], R = [];
  for (let s = s0; s <= s1 + 1e-6; s += step) {
    const w = wf(s);
    const [lx, ly] = mAt(route, s, -w), [rx, ry] = mAt(route, s, w);
    L.push([lx, ly]); R.push([rx, ry]);
  }
  return [...L, ...R.reverse()];
};

export function machineStatic(K, P) {
  const G = MG, items = [];
  const put = (key, svg) => items.push({ key, svg });
  const S = (paths, style) => K.solidSvg(paths, style);
  const L = (d, style) => K.lineSvg(d, style);
  const dep = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const z0 = G.BED_H, zf = z0 + 0.25;

  // ---- the bed the channels are cut into ----
  const B = G.BED;
  put(dep(B.x + B.w / 2, B.y + B.d / 2, 0) - 400, `<path class="iso-halo" d="${K.haloOf(B, 0, 0.1, P)}" style="filter:blur(3px)"/>` +
    S(K.slabOf(B, 0, G.BED_H, P, 8, 0.8), { tone: "mid", inner: L(K.sideSeam(B, 2.4, P, 8), { tone: "faint" }) }) +
    L(K.planOutline(K.insetPlan(B, 4), z0, P), { tone: "faint" }) +
    K.dotsSvg(K.corners(B, 5.5).map(([x, y]) => at([x, y, z0])), { size: 0.5 }));

  // ---- channel floors: avenue A and branch B (the pocket widens B round the fix baffle) ----
  const A0 = -52, AL = ROUTES.A.length + 6, B0 = STN.T.s - 36, BL = ROUTES.B.length + 6;
  put(dep(0, 0, 0) - 300, S(K.extrude(ribbon("A", A0, AL, () => MG.WA), z0, 0.25, P, { convex: false }), { tone: "lo", crease: "none", className: "oe-floor" }));
  put(dep(0, 0, 0) - 299, S(K.extrude(ribbon("B", B0, BL, (s) => halfWidth("B", s)), z0, 0.25, P, { convex: false }), { tone: "lo", crease: "none", className: "oe-floor" }));

  // ---- rails: short chunks, each sorted on its own so balls pass between the near and far rails ----
  const wallPts = (route) => ROUTES[route].pts.map(([u, v]) => toM(u, v));
  const distTo = (pts, x, y) => { let d = Infinity; for (const [px, py] of pts) d = Math.min(d, Math.hypot(px - x, py - y)); return d; };
  const aPts = wallPts("A"), bPts = wallPts("B");
  const chunks = (route, s0, s1, other, otherW) => {
    for (let s = s0; s < s1; s += 8) {
      const e = Math.min(s1, s + 8);
      for (const side of [-1, 1]) {
        const w0 = halfWidth(route, s) , w1 = halfWidth(route, e);
        const [ax, ay] = mAt(route, s, side * w0), [bx, by] = mAt(route, e, side * w1);
        const [cx, cy] = mAt(route, e, side * (w1 + rail)), [dx, dy] = mAt(route, s, side * (w0 + rail));
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        // leave the inside walls out where the other channel runs through
        const o = other ? distTo(other, mx, my) : Infinity;
        if (o < otherW + 0.4) continue;
        put(dep(mx, my, z0), S(K.extrude([[ax, ay], [bx, by], [cx, cy], [dx, dy]], z0, G.RAIL, P, { convex: true }), { tone: "mid", crease: "none" }));
      }
    }
  };
  chunks("A", A0, AL, bPts, MG.WB * 0.55 + 3.2);
  chunks("B", B0 + 6, BL, aPts, MG.WA + 0.2);

  // ---- the hopper that feeds the column (left end of A) and the catch trough at the end of each route ----
  {
    const [hx, hy] = mAt("A", A0 - 8, 0), n = mAt("A", A0 - 8, 1);
    const f = [(hx - 0) , hy];
    const hop = { x: hx - 9, y: hy - 12, w: 11, d: 24, r: 1.5 };
    put(dep(hop.x + hop.w / 2, hop.y + hop.d / 2, 6) + 2, S(K.slabOf(hop, z0, 9, P, 4, 0.5), { tone: "mid", inner: L(K.sideSeam(hop, z0 + 4.5, P, 4), { tone: "faint" }) }) +
      L(K.planOutline(K.insetPlan(hop, 2.2), z0 + 9, P), { tone: "faint" }) + K.dotsSvg([[hop.x + 2.4, hop.y + 2.4], [hop.x + hop.w - 2.4, hop.y + hop.d - 2.4]].map(([x, y]) => at([x, y, z0 + 9])), { size: 0.45 }));
  }
  for (const route of ["A", "B"]) {
    const end = ROUTES[route].length - 4;
    const [ex, ey, face] = mAt(route, end, 0);
    const rad = face * Math.PI / 180;
    const cx = ex + 9 * Math.cos(rad), cy = ey + 9 * Math.sin(rad);
    const tr = { x: cx - 10, y: cy - 8, w: 20, d: 16, r: 1.6 };
    if (tr.x + tr.w > B.x + B.w - 2 || tr.y + tr.d > B.y + B.d - 2) {
      tr.x = Math.min(tr.x, B.x + B.w - 2 - tr.w); tr.y = Math.min(tr.y, B.y + B.d - 2 - tr.d);
    }
    put(dep(cx, cy, 6) + 2, S(K.slabOf(tr, z0, 2.2, P, 4, 0.4), { tone: "mid" }) + L(K.planOutline(K.insetPlan(tr, 2), z0 + 2.2, P), { tone: "faint" }));
  }
  // ---- gate posts, and the fire supply: a tank on a cradle with a pressure dial (needle in machineDyn) ----
  {
    const sB = STN.B.s, w = halfWidth("B", sB);
    for (const side of [-1, 1]) {
      const [x, y] = mAt("B", sB, side * (w + rail + 1.4));
      put(dep(x, y, z0 + 6), S(K.cylinder(x, y, 1.6, z0, 13, P, 16, 0.3), { tone: "mid" }) + S(K.cylinder(x, y, 2.1, z0 + 13, 1.2, P, 16, 0.3), { tone: "mid" }));
    }
    const TK = G.TANK;
    const ped = { x: TK.x - 11, y: TK.y - 9, w: 22, d: 18, r: 2 };
    put(dep(TK.x, TK.y, 8), S(K.slabOf(ped, z0, 2, P, 4, 0.4), { tone: "mid" }) + L(K.planOutline(K.insetPlan(ped, 2), z0 + 2, P), { tone: "faint" }) +
      S(K.cylinder(TK.x, TK.y, 7.5, z0 + 2, 15, P, 36, 0.6), { tone: "hi", crease: "lo" }) +
      L(K.ring(TK.x, TK.y, 7.5, z0 + 9, P, 36), { tone: "faint" }) + L(K.ring(TK.x, TK.y, 7.5, z0 + 14, P, 36), { tone: "faint" }) +
      S(K.cylinder(TK.x, TK.y, 2.4, z0 + 17, 2, P, 18, 0.3), { tone: "mid" }));
    const D = G.GAUGE;
    put(dep(D.x, D.y, 8), S(K.cylinder(D.x, D.y, 4, z0, 2.4, P, 24, 0.4), { tone: "mid" }) + S(K.cylinder(D.x, D.y, 2.4, z0 + 2.4, D.z - z0 - 2.4, P, 18), { tone: "mid", crease: "none" }) +
      S(K.cylinder(D.x, D.y, D.r, D.z, D.h, P, 56, 0.7), { tone: "hi", crease: "lo" }) +
      L(K.knurl(D.x, D.y, D.r, D.z + D.h - 2.4, D.z + D.h, 52, P, 0.3), { tone: "lo" }) +
      L(K.ring(D.x, D.y, D.r - 1.8, D.z + D.h, P, 56), { tone: "lo" }));
    const t = K.radialTicks(D.x, D.y, D.r - 1.8, 8, 2, D.z + D.h, [1, 2.2], P, -0.75 * Math.PI, 1.5 * Math.PI);
    put(dep(D.x, D.y, D.z + D.h) + 0.5, L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }));
  }
  // ---- nozzle posts: one beside each baffle, with the jet that holds it ----
  for (const k of Object.keys(JETS())) {
    const J = JETS()[k];
    const [px, py] = J.post;
    put(dep(px, py, z0 + 6), S(K.cylinder(px, py, 2.6, z0, 1.1, P, 20, 0.3), { tone: "mid" }) + S(K.cylinder(px, py, 1.0, z0 + 1.1, 11.4, P, 14), { tone: "mid", crease: "none" }) +
      S(K.cylinder(px, py, 1.7, z0 + 12.5, 1.6, P, 16, 0.3), { tone: "mid" }) +
      L(K.ring(px, py, 1.5, z0 + 13.2, P, 14), { tone: "faint" }) + K.dotsSvg(K.corners({ x: px - 1.6, y: py - 1.6, w: 3.2, d: 3.2 }, 0.6).map(([x, y]) => at([x, y, z0 + 1.1])), { size: 0.4 }));
    // the nozzle: a short box from the post's head toward the baffle
    const [dx, dy] = J.dir;
    const ring = [[px - dy * 0.7, py + dx * 0.7], [px + dx * 4.2 - dy * 0.7, py + dy * 4.2 + dx * 0.7], [px + dx * 4.2 + dy * 0.7, py + dy * 4.2 - dx * 0.7], [px + dy * 0.7, py - dx * 0.7]];
    put(dep(px + dx * 2, py + dy * 2, z0 + 14) + 1, S(K.extrude(ring, z0 + 13.2, 1.5, P, { convex: true }), { tone: "mid", crease: "none" }));
  }
  return items;
}

// ---- jets ----
// post and direction of each group's nozzle post, and the points its jet lands on (machine units)
let JC = null;
export function JETS() {
  if (JC) return JC;
  const G = MG;
  const outside = (route, s, side, d) => mAt(route, s, side * (halfWidth(route, s) + rail + d));
  const mk = (post, aim) => { const dx = aim[0][0] - post[0], dy = aim[0][1] - post[1], l = Math.hypot(dx, dy) || 1; return { post: [post[0], post[1]], dir: [dx / l, dy / l], aim }; };
  JC = {
    D: mk(outside("A", STN.D.s, -1, 5), [mAt("A", STN.D.s, 1.2), mAt("A", STN.D.s, 3.4), mAt("A", STN.D.s, 5.4)]),
    T: mk(outside("A", STN.T.s - 14, -1, 5), [mAt("A", STN.T.s + 2, -2.5), mAt("A", STN.T.s + 7, 1.2)]),
    F: mk(outside("B", STN.F.s, 1, 7), [mAt("B", STN.F.s - 15, 2), mAt("B", STN.F.s, -3), mAt("B", STN.F.s + 15, 2)]),
    B: mk(outside("B", STN.B.s, 1, 6), [mAt("B", STN.B.s, 0), mAt("B", STN.B.s, -3.5)]),
  };
  return JC;
}

// ---- dynamic part geometry ----
// where the n-th vehicle through is stacked in its route's trough (by through order)
export function troughSlot(route, k) {
  const end = ROUTES[route].length - 4;
  const [ex, ey, face] = mAt(route, end, 0);
  const rad = face * Math.PI / 180, n = [-Math.sin(rad), Math.cos(rad)];
  const row = k % 4, col = Math.floor(k / 4);
  const [cx, cy] = [ex + 6 * Math.cos(rad), ey + 6 * Math.sin(rad)];
  return [cx + n[0] * (row - 1.5) * 4.2 + Math.cos(rad) * col * 4.4, cy + n[1] * (row - 1.5) * 4.2 + Math.sin(rad) * col * 4.4];
}

export function machineDyn(K, P, V) {
  const G = MG, out = [];
  const c = V.c;
  const dep = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const S = (paths, style) => K.solidSvg(paths, style);
  const Ln = (d, style) => K.lineSvg(d, style);
  const z0 = G.BED_H + 0.25;
  const q = (v) => Math.round(v * 20) / 20;
  const P0 = { ...P, origin: [0, 0] };
  const k = K.cameraOf(P).k;
  const add = (id, key, look, svg) => out.push({ id, key, at: [0, 0], look, svg });

  // ---- D: pins across the south half of avenue A, standing while the jet holds them ----
  {
    const [x0, y0, face] = mAt("A", STN.D.s, 0);
    const rad = (face + 90) * Math.PI / 180, nx = Math.cos(rad), ny = Math.sin(rad), tx = Math.cos(face * Math.PI / 180), ty = Math.sin(face * Math.PI / 180);
    const h = 4.4 * c.D;
    for (let j = 0; j < 7; j++) {
      const off = 0.6 + (j + 0.5) * (G.WA - 0.6) / 7 * 1.0, along = (j % 2 ? 1.1 : -1.1);
      const x = x0 + nx * off + tx * along, y = y0 + ny * off + ty * along;
      add(`pin${j}`, dep(x, y, z0 + 1), `p${q(c.D)}`, `<g class="oe-pin">${K.solidSvg(K.cylinder(x, y, 0.7, z0, Math.max(0.05, h), P, 14, 0.15), { tone: "hi", crease: "none" })}</g>`);
    }
  }
  // ---- T: a vane hinged at the north wall; the jet swings it across avenue A ----
  {
    const tip = mAt("A", STN.T.s + 14, MG.WA - 0.2);          // on the south wall, just past the branch
    const hinge = mAt("A", STN.T.s - 4, -MG.WA - 0.5);
    const ang = Math.atan2(tip[1] - hinge[1], tip[0] - hinge[0]);
    const len = Math.hypot(tip[0] - hinge[0], tip[1] - hinge[1]);
    const a0 = 0.02, a = a0 + (ang - a0) * c.T;
    const along0 = Math.atan2(0, 1);
    const pieces = 3;
    for (let j = 0; j < pieces; j++) {
      const s0 = (j / pieces) * len, s1 = ((j + 1) / pieces) * len;
      const p = (s, w) => [hinge[0] + Math.cos(a) * s - Math.sin(a) * w, hinge[1] + Math.sin(a) * s + Math.cos(a) * w];
      const ring = [p(s0, -0.6), p(s1, -0.6), p(s1, 0.6), p(s0, 0.6)];
      const mx = (p(s0, 0)[0] + p(s1, 0)[0]) / 2, my = (p(s0, 0)[1] + p(s1, 0)[1]) / 2;
      add(`vane${j}`, dep(mx, my, z0 + 2), `v${q(c.T)}`, S(K.extrude(ring, z0 + 0.4, 3.4, P, { convex: true }), { tone: "hi", crease: "lo" }));
    }
  }
  // ---- F: staggered lips in the pocket, rising with the jet ----
  {
    const lips = [[-15, -1], [0, 1], [15, -1]];
    lips.forEach(([ds, side], j) => {
      const s = STN.F.s + ds;
      const w = halfWidth("B", s);
      const [x0, y0] = mAt("B", s, side * w), [x1, y1] = mAt("B", s, side * (w - w * 1.15));
      const ring = (() => { const [ax, ay] = mAt("B", s - 0.7, side * w), [bx, by] = mAt("B", s + 0.7, side * w), [cx, cy] = mAt("B", s + 0.7, side * (w - w * 1.15)), [dx, dy] = mAt("B", s - 0.7, side * (w - w * 1.15)); return [[ax, ay], [bx, by], [cx, cy], [dx, dy]]; })();
      add(`lip${j}`, dep((x0 + x1) / 2, (y0 + y1) / 2, z0 + 1), `l${q(c.F)}`, S(K.extrude(ring, z0, Math.max(0.05, 3.4 * c.F), P, { convex: true }), { tone: "hi", crease: "lo" }));
    });
  }
  // ---- B: the gate, lowered across the whole branch by the jet ----
  {
    const s = STN.B.s, w = halfWidth("B", s);
    const [x0, y0, face] = mAt("B", s, 0);
    const bz = z0 + 0.6 + (1 - c.B) * 9;
    const ring = (() => { const [ax, ay] = mAt("B", s - 0.9, -w - 0.4), [bx, by] = mAt("B", s + 0.9, -w - 0.4), [cx, cy] = mAt("B", s + 0.9, w + 0.4), [dx, dy] = mAt("B", s - 0.9, w + 0.4); return [[ax, ay], [bx, by], [cx, cy], [dx, dy]]; })();
    add("gate", dep(x0, y0, bz + 1), `g${q(c.B)}`, S(K.extrude(ring, bz, 2.2, P, { convex: true }), { tone: "hi", crease: "lo", inner: Ln(K.planOutline({ x: x0 - 0.4, y: y0 - 0.4, w: 0.8, d: 0.8, r: 0.1 }, bz + 2.2, P), { tone: "faint", free: true }) }));
  }
  // ---- the four fire jets and their valves ----
  const J = JETS();
  for (const kk of Object.keys(J)) {
    const { post, dir, aim } = J[kk];
    const cc = c[kk];
    const tip = [post[0] + dir[0] * 4.4, post[1] + dir[1] * 4.4, z0 + 13.95];
    let svg = "";
    const phi = Math.atan2(dir[1], dir[0]) + Math.PI / 2;
    const lev = (a) => [post[0] + Math.cos(a) * 4.2, post[1] + Math.sin(a) * 4.2, z0 + 7];
    const l1 = lev(phi + (1 - cc) * 1.15);
    svg += K.wireSvg(at([post[0], post[1], z0 + 7]), at(l1), { tone: "hi", ends: "both", size: 0.75 });
    if (cc > 0.04) {
      aim.forEach(([ax, ay], j) => {
        const to = [ax, ay, z0 + 3.2 + (kk === "B" ? 2.2 : 0) + (kk === "T" ? 1.2 : 0)];
        const from = [tip[0], tip[1], tip[2]];
        svg += `<g opacity="${cc.toFixed(2)}">` + K.wireSvg(at(from), at(to), { tone: "hi", flow: true, ends: "both", size: 0.7 }) + `</g>`;
      });
    }
    add(`jet${kk}`, dep(post[0], post[1], z0 + 14) + 2, `j${q(cc)}`, svg);
  }
  // ---- the supply dial: how many jets are holding a baffle ----
  {
    const D = G.GAUGE, top = D.z + D.h, n = c.D + c.T + c.F + c.B;
    const a = -0.75 * Math.PI + (n / 4) * 1.5 * Math.PI, sx = Math.sin(a), sy = -Math.cos(a);
    const ln = (r0, r1) => K.lineSvg(K.lineOnTop([D.x + sx * r0, D.y + sy * r0], [D.x + sx * r1, D.y + sy * r1], top + 0.2, P), { tone: "hi", free: true });
    add("needle", dep(D.x, D.y, top) + 1, `n${q(n)}`, ln(-2.4, D.r - 3) + K.dotsSvg([at([D.x, D.y, top + 0.2])], { size: 0.6, tone: "hi" }));
  }
  // ---- the balls: the enemy column, moved by the same run as the Battlefield ----
  const R = G.BALL;
  const ballSvg = (spent) => {
    if (spent) return `<g class="oe-spent">${K.solidSvg(K.cylinder(0, 0, R * 0.95, -R, R * 0.62, P0, 18, 0.2), { tone: "mid", crease: "none" })}</g>`;
    const r = R * k;
    const sh = K.cylinder(0.8, 0.5, R * 0.9, -R, 0.01, P0, 16).fill;
    return `<g class="oe-ball"><path class="oe-shadow" d="${sh}"/><circle class="oe-body" cx="0" cy="0" r="${r.toFixed(2)}"/><circle class="oe-shine" cx="${(-r * 0.3).toFixed(2)}" cy="${(-r * 0.34).toFixed(2)}" r="${(r * 0.42).toFixed(2)}"/><circle class="oe-rim" cx="0" cy="0" r="${r.toFixed(2)}"/></g>`;
  };
  const thr = { A: 0, B: 0 };
  for (const m of V.men) {
    let x = m.u * G.S, y = m.v * G.S, spent = false;
    if (m.state === "through") { [x, y] = troughSlot(m.route, thr[m.route]++); }
    if (m.state === "out" || m.state === "hit") spent = m.state === "out";
    add(`ball${m.i}`, dep(x, y, z0 + 1) + (spent ? -0.5 : 0), spent ? "s" : "b", ballSvg(spent));
    out[out.length - 1].at = at([x, y, z0 + R]);
  }
  return out;
}

