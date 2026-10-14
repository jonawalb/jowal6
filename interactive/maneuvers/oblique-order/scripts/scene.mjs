// The moving half of the oblique-order bench: the enemy line of sprung blocks, the swinging
// beam on its pivot carriage with four contact pads, and the weights on their pegs.
// Rebuilt per frame. Written against the kit as a parameter (K) so build.mjs (Node) and the
// page (inlined kit) run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  XP: 112,            // pivot x (the refused end)
  YC: -30,            // enemy line front at rest
  U0: 184,            // leading pad, along the beam from the pivot
  SP: 48,             // pad spacing (= MODEL.spacing)
  E0: 3,              // pad stand-off from the beam face
  BEAM: [-18, 200],   // beam extent along u
  HALF: 6,            // beam half depth
  ZB: 6, HB: 6,       // beam bottom and height
  BX0: -88, BPITCH: 16, // first block x and block pitch
  BLOCK: [5.5, 10, 2.4, 16], // half width, depth, bottom z, height
  BACK: -58,          // backstop face
  PEG_H: 14, DISC_R: 4.4, DISC_H: 1.9,
  LIFT: 30,           // weights travel at this height
  WIN: 8, LOSE: -2,   // block displacement when a sector wins / loses (+ = pushed back)
};
GEO.TOP = GEO.ZB + GEO.HB;

const SC_RAD = Math.PI / 180;
// Which disc moves where when the weights are massed: [disc, from peg, from level, to peg, to level].
// Top discs leave first, so a stack never loses a disc from underneath.
export const MOVES = [[3, 1, 1, 0, 2], [2, 1, 0, 0, 3], [5, 2, 1, 0, 4], [4, 2, 0, 0, 5]];
const smoothT = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
// Progress of mover i for the eased mass state m in 0..1.
export const moverT = (i, m) => smoothT(m * 1.75 - i * 0.25);

// Where every weight sits for a mass state: [{ k, peg, level }] for resting discs,
// plus [{ k, i, t, from, to }] for discs in the air.
export function discPlaces(m) {
  const rest = [], air = [];
  const moving = new Map(MOVES.map((row, i) => [row[0], i]));
  for (let k = 0; k < 8; k++) {
    if (!moving.has(k)) { rest.push({ k, peg: Math.floor(k / 2), level: k % 2 }); continue; }
    const i = moving.get(k), [, fp, fl, tp, tl] = MOVES[i];
    const t = moverT(i, m);
    if (t <= 0) rest.push({ k, peg: fp, level: fl });
    else if (t >= 1) rest.push({ k, peg: tp, level: tl });
    else air.push({ k, i, t, from: [fp, fl], to: [tp, tl] });
  }
  return { rest, air };
}
// Weights per peg that have landed (the model's load), for a mass state.
export function loadOf(m) {
  const load = [0, 0, 0, 0];
  for (const d of discPlaces(m).rest) load[d.peg]++;
  return load;
}

export const pivotY = (ang) => GEO.YC + GEO.U0 * Math.sin(ang * SC_RAD) + (GEO.HALF + GEO.E0) * Math.cos(ang * SC_RAD);
export const padU = (j) => GEO.U0 - GEO.SP * j;
export const blockX = (i) => GEO.BX0 + GEO.BPITCH * i;

// S: { ang, mass, push: [4] (block displacement per sector), contact: [4] (0..1 eased), statics }
// Per-item markup cache: an item's markup is rebuilt only when one of its inputs changes, so
// the output is byte-identical to building it fresh; cleared when the projection changes.
let memoP = null, memoMap = new Map();
function sceneMemo(P, parts, make) {
  if (P !== memoP) { memoP = P; memoMap = new Map(); }
  const key = parts.join("|");
  let svg = memoMap.get(key);
  if (svg === undefined) { if (memoMap.size > 4000) memoMap.clear(); svg = make(); memoMap.set(key, svg); }
  return svg;
}

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const frame = (ox, oy, ang) => {
    const c = Math.cos(ang * SC_RAD), s = Math.sin(ang * SC_RAD);
    return (u, v) => [ox + u * c - v * s, oy + u * s + v * c];
  };
  const box = (F, u0, u1, v0, v1, z0, h, bevel = 0) =>
    K.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z0, h, P, { bevel });
  const G = GEO;
  const [hw, bd, bz, bh] = G.BLOCK;

  // ---- the enemy line: twelve blocks on sprung slides, sorted on their own ----
  for (let i = 0; i < 12; i++) {
    const db = S.push[Math.floor(i / 3)];
    const x = blockX(i), y1 = G.YC - db, y0 = y1 - bd;
    put(depth(x, (G.BACK + y0) / 2) - 0.5, sceneMemo(P, ["sp", i, db], () => {
      const coil = K.coil(G.BACK, y0, [x, bz + 7], 2.4, 5, "y", P);
      return line(coil.back, { tone: "lo" }) +
      solid(K.slabOf({ x: x - 0.9, y: G.BACK, w: 1.8, d: y0 - G.BACK, r: 0.8 }, bz + 6.1, 1.8, P, 3), { tone: "mid", crease: "none" }) +
      line(coil.front, { tone: "mid" }) +
      solid(K.slabOf({ x: x - 2.8, y: G.BACK, w: 5.6, d: 1.4, r: 0.6 }, bz + 4.6, 4.8, P, 2, 0.2), { tone: "mid" });
    }));
    const plan = { x: x - hw, y: y0, w: hw * 2, d: bd, r: 1 };
    put(depth(x, (y0 + y1) / 2), sceneMemo(P, ["bk", i, db], () =>
      solid(K.slabOf(plan, bz, bh, P, 3, 0.6), { tone: "hi", crease: "lo", inner: line(K.sideSeam(plan, bz + 4, P, 3), { tone: "faint" }) }) +
      line(K.planOutline(K.insetPlan(plan, 1.6), bz + bh, P, 3), { tone: "faint" }) +
      K.dotsSvg([at([x, y0 + bd / 2, bz + bh])], { size: 0.42 })));
  }

  // ---- the attacking line: carriage, beam, pads, pegs and weights ----
  const ang = S.ang, yP = pivotY(ang);
  const F = frame(G.XP, yP, 180 + ang);
  const beamItems = [];
  const bput = (svg) => beamItems.push(svg);
  bput(sceneMemo(P, ["car", ang], () => {
    const beamItems = [];
    const bput = (svg) => beamItems.push(svg);
    // pivot carriage on its rails, with the angle quadrant on top
    const plan = { x: G.XP - 16, y: yP - 12, w: 43, d: 24, r: 2 };
    let car = `<path class="iso-halo" d="${K.slabOf(plan, 2, 0.1, P).fill}" style="filter:blur(3px)"/>`;
    for (const sx of [-10, 10]) for (const sy of [-12, 8]) car += solid(K.slabOf({ x: G.XP + sx - 3, y: yP + sy, w: 6, d: 4, r: 0.8 }, 0.6, 1.8, P, 2, 0.2), { tone: "mid" });
    car += solid(K.slabOf(plan, 2.4, 3.6, P, 4, 0.5), { tone: "mid", inner: line(K.sideSeam(plan, 4.2, P, 4), { tone: "faint" }) });
    const t = [], tm = [];
    for (let a = -4; a <= 20; a += 2) {
      const big = a % 4 === 0;
      const r0 = 19.5, r1 = big ? 23.5 : 22;
      (a === 0 ? tm : big ? tm : t).push(K.lineOnTop([G.XP + r0 * Math.cos(a * SC_RAD), yP + r0 * Math.sin(a * SC_RAD)], [G.XP + r1 * Math.cos(a * SC_RAD), yP + r1 * Math.sin(a * SC_RAD)], 6, P));
    }
    const arc = [];
    for (let a = -4; a <= 20; a += 2) arc.push([G.XP + 19.5 * Math.cos(a * SC_RAD), yP + 19.5 * Math.sin(a * SC_RAD)]);
    car += line(K.onTop(arc, 6, P), { tone: "lo" }) + line(t.join(""), { tone: "lo" }) + line(tm.join(""), { tone: "mid" });
    car += K.dotsSvg([[G.XP - 13, yP - 9], [G.XP - 13, yP + 9], [G.XP + 24, yP - 9], [G.XP + 24, yP + 9]].map(([x, y]) => at([x, y, 6])), { size: 0.42 });
    bput(car);
    // casters under the beam
    for (const u of [112, 188]) {
      const [cx, cy] = F(u, 0);
      bput(solid(box(F, u - 3, u + 3, -2.6, 2.6, 3.4, 2.6, 0.2), { tone: "mid" }) +
        solid(K.cylinder(cx, cy, 2.2, 0.3, 3.1, P, 18), { tone: "lo", crease: "none" }));
    }
    return beamItems.join("");
  }));
  {
    // contact pads on the beam's front face (the far side): sleeve, rod and plate
    for (let j = 0; j < 4; j++) {
      const u = padU(j);
      const ext = G.E0 + S.reach[j];
      const lit = j === 0;
      bput(sceneMemo(P, ["pad", j, ang, ext], () => solid(box(F, u - 3, u + 3, G.HALF, G.HALF + 1.5, G.ZB + 1, 4, 0.2), { tone: "mid" }) +
        solid(box(F, u - 0.9, u + 0.9, G.HALF + 1.5, G.HALF + Math.max(1.6, ext - 1.2), G.ZB + 2.4, 1.2), { tone: "mid", crease: "none" }) +
        solid(box(F, u - 5, u + 5, G.HALF + ext - 1.2, G.HALF + ext, G.ZB + 0.5, 5, 0.2), { tone: "hi", crease: "lo", lit })));
    }
    // the beam itself
    bput(sceneMemo(P, ["beam", ang], () => {
    const beamItems = [];
    const bput = (svg) => beamItems.push(svg);
    const [u0, u1] = G.BEAM;
    bput(`<path class="iso-halo" d="${box(F, u0, u1, -G.HALF - 1, G.HALF + 1, 0.3, 0.1).fill}" style="filter:blur(3px)"/>`);
    bput(solid(box(F, u0, u1, -G.HALF, G.HALF, G.ZB, G.HB, 0.5), { tone: "mid" }));
    // top: a slot down the middle, sector marks across, screws at the ends
    bput(line(K.onTop([F(u0 + 4, -0.8), F(u1 - 4, -0.8), F(u1 - 4, 0.8), F(u0 + 4, 0.8)], G.TOP, P, true), { tone: "faint" }));
    const marks = [];
    for (const u of [160, 112, 64]) marks.push(K.onTop([F(u, -G.HALF + 0.6), F(u, G.HALF - 0.6)], G.TOP, P));
    bput(line(marks.join(""), { tone: "lo" }));
    bput(K.dotsSvg([F(u0 + 2.5, -3.5), F(u0 + 2.5, 3.5), F(u1 - 2.5, -3.5), F(u1 - 2.5, 3.5)].map(([x, y]) => at([x, y, G.TOP])), { size: 0.42 }));
    // the tail pointer on the quadrant
    bput(line(K.onTop([F(u0 + 0.4, 0), F(u0 - 5.5, 0)], G.ZB + 0.2, P), { tone: "hi" }));
    // pivot hub and lock knob
    bput(solid(K.cylinder(G.XP, yP, 4.6, G.TOP, 1.6, P, 28, 0.3), { tone: "mid" }) +
      solid(K.cylinder(G.XP, yP, 2.8, G.TOP + 1.6, 4, P, 22), { tone: "mid" }) +
      line(K.knurl(G.XP, yP, 2.8, G.TOP + 1.6, G.TOP + 5.6, 18, P), { tone: "lo" }));
    return beamItems.join("");
    }));

    // pegs and the weights stacked on them
    const { rest, air } = discPlaces(S.mass);
    const pegs = [0, 1, 2, 3].map((j) => {
      const [x, y] = F(padU(j), 0);
      return { j, x, y, n: rest.filter((d) => d.peg === j).length };
    }).sort((a, b) => depth(a.x, a.y) - depth(b.x, b.y));
    const disc = (x, y, z) => solid(K.cylinder(x, y, G.DISC_R, z, G.DISC_H, P, 32, 0.3), { tone: "hi", crease: "lo" }) +
      line(K.ring(x, y, G.DISC_R - 1.4, z + G.DISC_H, P, 24), { tone: "faint" });
    for (const p of pegs) bput(sceneMemo(P, ["peg", ang, p.j, p.n], () => {
      let s = solid(K.cylinder(p.x, p.y, 2.6, G.TOP, 1, P, 20), { tone: "mid" });
      const zb = G.TOP + 1;
      s += solid(K.cylinder(p.x, p.y, 1.05, zb, G.PEG_H - 1, P, 14), { tone: "mid", crease: "none" });
      for (let l = 0; l < p.n; l++) s += disc(p.x, p.y, zb + l * G.DISC_H);
      const zt = zb + p.n * G.DISC_H;
      if (p.n) s += solid(K.cylinder(p.x, p.y, 1.05, zt, G.TOP + G.PEG_H - zt, P, 14), { tone: "mid", crease: "none" });
      s += solid(K.cylinder(p.x, p.y, 1.5, G.TOP + G.PEG_H, 0.8, P, 14, 0.2), { tone: "mid" });
      return s;
    }));
    // weights in the air: up off the peg, across, and down onto the next stack
    for (const d of air.sort((a, b) => a.i - b.i)) {
      const [fx, fy] = F(padU(d.from[0]), 0), [tx, ty] = F(padU(d.to[0]), 0);
      const zf = G.TOP + 1 + d.from[1] * G.DISC_H, zt = G.TOP + 1 + d.to[1] * G.DISC_H;
      const t = d.t;
      let x, y, z;
      if (t < 0.25) { const s = t / 0.25; x = fx; y = fy; z = zf + (G.LIFT - zf) * s; }
      else if (t < 0.75) { const s = smoothT((t - 0.25) / 0.5); x = fx + (tx - fx) * s; y = fy + (ty - fy) * s; z = G.LIFT; }
      else { const s = (t - 0.75) / 0.25; x = tx; y = ty; z = G.LIFT + (zt - G.LIFT) * s; }
      bput(disc(x, y, z));
    }
  }
  for (const svg of beamItems) put(1e5, svg); // equal keys keep their order (stable sort)

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  if (S.items) return items; // the page patches its live layer item by item
  return items.map((item) => item.svg).join("");
}

// The dial needle for a ratio r in 0..3: a 270 degree sweep.
export function needle(K, P, D, r) {
  const f = Math.min(1, Math.max(0, r / 3));
  const a = -0.75 * Math.PI + f * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
