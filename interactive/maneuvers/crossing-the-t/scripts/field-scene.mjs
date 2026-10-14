// The Battlefield view of Crossing the T: a sea scene, not land troops. Four battleships in column
// (red) steam on their course while four more (blue, the crossing line) lie on the crossing angle
// ahead of the column's head. The same model state S as the machine drives it:
//   S.phi    the crossing line's heading off the column's course (the machine's turntable angle)
//   S.aims   each turret's eased bearing (the machine's barrels), absolute degrees
// stateAt(phi) gives every ship's position, which turrets bear and on which enemy ship; hitsAt(phi)
// gives the notional hits each ship has taken (one per enemy turret bearing on it). Ships hold the
// model's geometry exactly; the sea moves past them (wakes, funnel smoke), so the scene steams
// without the gun counts drifting away from the machine's.
// The ships are figure-local drawings (generic turret-era battleships, not models of any real ship);
// the kit supplies the iso maths, the water and island tints, the relief and the trees.
// fieldStatic() builds the sea and the islands (build only); fieldPose() places the ships for a
// state (build and page); fieldMarks() draws wakes and foam; fieldShots() is the gunfire as a pure
// function of time (flashes, cordite smoke, splashes, hits, fires); seaFire() and shipSvg()/splashSvg()
// render it. build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs
// and terrain.mjs.
import { fdRand, fdFrame, fdBlob, fdView } from "../../kit/field.mjs";
import { stateAt, hitsAt } from "./model.mjs";
import { trTerrain, trRelief, trScatter, trWood, trPatch } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -420, y: -300, w: 860, d: 600 },
  S: 54,           // world units per ship spacing (notional)
  LEN: 18,         // half hull length: ships drawn larger than scale against their spacing
  TURRET: 12,      // fore and aft turret distance from midships, units
  FREE: 2.4,       // freeboard: deck height above the water
  WIND: [-0.42, -1], // drift of smoke, units per second per unit of speed
  FLIGHT: 1.4,     // seconds from a turret's flash to its splashes (notional)
  HIT_SHOW: 0.25,  // share of salvos the animation shows as a hit (visual only; the readout's hits come from hitsAt)
};
FG.TERRAIN = {
  rises: [
    { cx: 30, cy: -182, r: 30, steps: 4, h: 2.2, top: 0.4, seed: 17, wobble: 0.16, squash: 1.5, lean: [2, -1.5] },
    { cx: -30, cy: 178, r: 22, steps: 3, h: 2, top: 0.45, seed: 29, wobble: 0.15, squash: 1.3 },
  ],
};

const CT_RAD = Math.PI / 180;
const ctHash = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
const ctFrac = (x) => x - Math.floor(x);
const ctClamp01 = (x) => Math.max(0, Math.min(1, x));

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- the sea and the islands (static) ----------
export function fieldStatic(K, P, T) {
  const G = FG, R = G.world;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(`<path class="tr-water" d="${K.onTop([[R.x, R.y], [R.x + R.w, R.y], [R.x + R.w, R.y + R.d], [R.x, R.y + R.d]], 0, P, true)}"/>`);
  // darker swells: long low patches across the sea
  const rnd = fdRand(11);
  for (let i = 0; i < 14; i++) {
    const cx = R.x + 40 + rnd() * (R.w - 80), cy = R.y + 40 + rnd() * (R.d - 80);
    g(`<path class="ct-swell" d="${K.onTop(fdBlob(cx, cy, 30 + rnd() * 40, 100 + i, 0.18, 32, 0.35), 0, P, true)}"/>`);
  }
  // ripples: short strokes along the swell, all in one path (cheap to repaint under the moving smoke)
  const rip = [];
  for (let i = 0; i < 150; i++) {
    const x = R.x + 20 + rnd() * (R.w - 40), y = R.y + 20 + rnd() * (R.d - 40);
    if (T.rises.some((r) => Math.hypot(x - r.cx, y - r.cy) < r.r + 10)) continue;
    const L = 5 + rnd() * 8, a = -38 + rnd() * 16;
    const pts = [0, 0.33, 0.66, 1].map((f) => { const u = (f - 0.5) * L; return K.iso([x + u * Math.cos(a * CT_RAD), y + u * Math.sin(a * CT_RAD) + Math.sin(f * Math.PI) * 0.8, 0], P); });
    rip.push(K.pathOf(pts));
  }
  g(`<path class="ct-ripple" d="${rip.join("")}"/>`);
  // islands: a pale shoal round each, the shore, contour steps, a few pines
  for (const r of G.TERRAIN.rises) {
    g(`<path class="ct-shoal" d="${K.onTop(fdBlob(r.cx, r.cy, r.r + 9, r.seed + 3, 0.12, 48, r.squash ?? 1), 0, P, true)}"/>`);
    g(trPatch(K, P, fdBlob(r.cx, r.cy, r.r + 2.5, r.seed + 5, 0.1, 48, r.squash ?? 1), "ct-beach"));
  }
  g(trRelief(K, P, T));
  T.rises.forEach((rise, i) => {
    const top = rise.layers[1] || rise.layers[0];
    const trees = trScatter(top.ring, 14 - i * 5, { seed: 60 + i, gap: 5, r: [2.2, 3.2], h: [7, 10], cone: 0, avoid: () => false });
    const w = trWood(K, P, T, top.ring, trees);
    items.push(...w.items);
  });
  return { ground: ground.join(""), items };
}

// ---------- where the ships are, for a model state ----------
// S = { phi, aims: { line: [...], column: [...] } }; M (page-measured, optional) = { hits: { line, column } }
// with eased hit counts, so fires fade in rather than pop. Without M the model's own counts are used.
export function fieldPose(S, MODEL, M) {
  const st = stateAt(S.phi, MODEL);
  const h = hitsAt(S.phi, MODEL);
  const G = FG;
  const ships = [];
  const side = (list, turrets, aims, key, hits, eased) => list.forEach((p, i) => {
    const x = p.x * G.S, y = p.y * G.S, face = p.heading;
    const F = fdFrame(x, y, face);
    const ts = [0, 1].map((j) => {
      const t = turrets[i * 2 + j];
      const u = j === 0 ? G.TURRET : -G.TURRET;
      const [tx, ty] = F(u, 0);
      return { bears: t.bears, target: t.target, x: tx, y: ty, aim: aims[i * 2 + j] };
    });
    ships.push({ id: `${key}${i}`, side: key === "l" ? "f" : "h", lit: key === "c" && i === 0, i, x, y, face, turrets: ts,
      hits: hits[i], dmg: eased ? eased[i] : hits[i] });
  });
  side(st.line, st.lineTurrets, S.aims.line, "l", h.line, M && M.hits && M.hits.line);
  side(st.column, st.columnTurrets, S.aims.column, "c", h.column, M && M.hits && M.hits.column);
  return { ships, st, h };
}

// Deck spots where hits burn, in a ship's own frame (u forward, v to port).
const CT_SPOTS = [[8.5, 1.2], [-3.5, -1.4], [3.2, 1.6], [-10, 1], [13.5, -0.6], [0, -1.8], [-6.5, 0.8], [6, -1.8], [-14, -0.6]];
export const ctDeckSpot = (ship, i) => { const [u, v] = CT_SPOTS[i % CT_SPOTS.length]; return [...fdFrame(ship.x, ship.y, ship.face)(u, v), FG.FREE + 0.6]; };

// ---------- one battleship, drawn at the origin (place it with a translate) ----------
// A prism over a convex ring as at most three paths, with the caller's classes for top, lit and dark sides.
function ctPrism(K, P, ring, z0, z1, [ct, cl, cd]) {
  const V = fdView(K, P);
  let area = 0;
  for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const s = area > 0 ? 1 : -1;
  const lit = [], dark = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const nx = s * (b[1] - a[1]), ny = -s * (b[0] - a[0]);
    if (nx * V.v[0] + ny * V.v[1] <= 1e-9) continue;
    const face = K.pathOf([K.iso([a[0], a[1], z0], P), K.iso([b[0], b[1], z0], P), K.iso([b[0], b[1], z1], P), K.iso([a[0], a[1], z1], P)], true);
    (nx * V.light[0] + ny * V.light[1] > 0 ? lit : dark).push(face);
  }
  return (dark.length ? `<path class="${cd}" d="${dark.join("")}"/>` : "") + (lit.length ? `<path class="${cl}" d="${lit.join("")}"/>` : "") + `<path class="${ct}" d="${K.onTop(ring, z1, P, true)}"/>`;
}
const CT_SIDE = ["tr-t", "tr-l", "tr-d"], CT_SUP = ["ct-sup-t", "ct-sup-l", "ct-sup-d"], CT_HULL = ["ct-deck", "tr-l", "tr-d"];
const ctRing = (F, pts) => pts.map(([u, v]) => F(u, v));
const ctOct = (F, u, v, ru, rv = ru, n = 10) => Array.from({ length: n }, (_, i) => F(u + ru * Math.cos((i + 0.5) * 2 * Math.PI / n), v + rv * Math.sin((i + 0.5) * 2 * Math.PI / n)));
const ctBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
const CT_HULL_PTS = [[18, 0], [14.5, 2.5], [7, 3.3], [-11, 3.3], [-15.6, 2.6], [-17.6, 1.2], [-17.6, -1.2], [-15.6, -2.6], [-11, -3.3], [7, -3.3], [14.5, -2.5]];

// spec = { face, fore, aft (turret bearings relative to the bow, degrees), dmg (fires shown), shotAway (a funnel lost) }
export function shipSvg(K, P, spec) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, spec.face);
  const Z = FG.FREE;
  const parts = [];
  const put = (u, v, z, svg) => parts.push([K.depthOf([...F(u, v), z], P0), svg]);
  const q = (u, v, z) => K.iso([...F(u, v), z], P0);
  const [vx, vy] = K.towardViewer(P0);
  // hull and deck (always under everything else), with a scorched patch per fire
  let out = `<path class="ct-hullshadow" d="${K.onTop(ctRing(F, CT_HULL_PTS.map(([u, v]) => [u * 1.04, v * 1.25])), 0, P0, true)}"/>`;
  out += ctPrism(K, P0, ctRing(F, CT_HULL_PTS), 0, Z, CT_HULL);
  out += `<path class="ct-plank" d="${K.onTop(ctRing(F, CT_HULL_PTS.map(([u, v]) => [u * 0.9 - 0.4, v * 0.62])), Z, P0, true)}"/>`;
  for (let i = 0; i < Math.min(spec.dmg, 5); i++) { const [u, v] = CT_SPOTS[i]; out += `<path class="ct-scorch" d="${K.onTop(ctOct(F, u, v, 2.2, 1.3, 9), Z + 0.02, P0, true)}"/>`; }
  // superstructure: midships deckhouse, fore bridge with wings, aft house
  put(0, 0, Z + 0.7, ctPrism(K, P0, ctBox(F, -5.5, 5, -2.4, 2.4), Z, Z + 1.4, CT_SUP));
  put(7.2, 0, Z + 1.3, ctPrism(K, P0, ctBox(F, 5.2, 9.2, -1.9, 1.9), Z, Z + 2.6, CT_SUP));
  put(7.4, 0, Z + 2.9, ctPrism(K, P0, ctBox(F, 6.2, 8.6, -2.9, 2.9), Z + 2.6, Z + 3.1, CT_SUP));
  put(-7.3, 0, Z + 1, ctPrism(K, P0, ctBox(F, -9.6, -5.2, -1.7, 1.7), Z, Z + 2, CT_SUP));
  // two funnels on the deckhouse (one may be shot away to a stump)
  [[2.6, 8.6], [-2.2, spec.shotAway ? 3.2 : 8.2]].forEach(([u, h]) => {
    put(u, 0, Z + 1.4 + h * 0.5, ctPrism(K, P0, ctOct(F, u, 0, 1.45, 1.05), Z + 1.4, Z + 1.4 + h, CT_SIDE) +
      `<path class="ct-cap" d="${K.onTop(ctOct(F, u, 0, 1.0, 0.65), Z + 1.4 + h + 0.01, P0, true)}"/>`);
  });
  // masts with fighting tops and a yard on the foremast
  for (const [u, z0, z1, top] of [[7.6, Z + 3.1, Z + 16, Z + 11], [-7.4, Z + 2, Z + 13.2, Z + 9.2]]) {
    const mast = `<path class="ct-mast" d="${K.pathOf([q(u, 0, z0), q(u, 0, z1)])}"/>`;
    const yard = u > 0 ? `<path class="ct-mast" d="${K.pathOf([q(u, -2.6, z1 - 2.2), q(u, 2.6, z1 - 2.2)])}"/>` : "";
    put(u, 0, top, mast + yard + ctPrism(K, P0, ctOct(F, u, 0, 0.85, 0.85, 8), top, top + 0.8, CT_SUP));
  }
  // turrets on barbettes, twin guns trained on their bearings
  for (const [u, rel] of [[FG.TURRET, spec.fore], [-FG.TURRET, spec.aft]]) {
    const [tx, ty] = F(u, 0);
    const G = fdFrame(tx, ty, spec.face + rel);
    const gq = (a, b, z) => K.iso([...G(a, b), z], P0);
    const barbette = ctPrism(K, P0, ctOct(F, u, 0, 2.15, 2.15, 12), Z, Z + 0.8, CT_SUP);
    const turret = ctPrism(K, P0, ctRing(G, [[1.7, 1.0], [1.1, 1.75], [-1.7, 1.75], [-2.2, 1.1], [-2.2, -1.1], [-1.7, -1.75], [1.1, -1.75], [1.7, -1.0]]), Z + 0.8, Z + 2.5, CT_SIDE);
    const guns = [0.62, -0.62].map((b) => `<path class="ct-gun" d="${K.pathOf([gq(1.4, b, Z + 1.75), gq(8.2, b, Z + 1.85)])}"/>`).join("");
    const fwd = G(1, 0);
    const away = (fwd[0] - tx) * vx + (fwd[1] - ty) * vy < 0;
    put(u, 0, Z + 1.2, barbette + (away ? guns + turret : turret + guns));
  }
  parts.sort((a, b) => a[0] - b[0]);
  return out + parts.map((p) => p[1]).join("");
}
// Cache key for shipSvg: heading to 2°, turret bearings to 3°, fires shown.
export const shipLook = (s) => `${s.side}|${s.face}|${Math.round(s.fore / 3) * 3}|${Math.round(s.aft / 3) * 3}|${s.dmg}|${s.shotAway ? 1 : 0}`;
// The drawing spec of a pose ship: relative turret bearings, fires shown, a funnel shot away at heavy damage.
export function shipSpec(s) {
  const rel = (a) => ((((a - s.face) % 360) + 540) % 360) - 180;
  const dmg = Math.round(s.dmg);
  return { side: s.side, face: Math.round(s.face / 2) * 2, fore: Math.round(rel(s.turrets[0].aim) / 3) * 3, aft: Math.round(rel(s.turrets[1].aim) / 3) * 3, dmg, shotAway: dmg >= 6 };
}

// A shell splash at the origin: a white column that shoots up and collapses, over a ring of foam.
export function splashSvg(K, P, age, size = 1) {
  const P0 = { ...P, origin: [0, 0] };
  const k = K.cameraOf(P).k;
  const up = age < 0.22 ? 1 - (1 - age / 0.22) ** 3 : 1 - 0.75 * ctClamp01((age - 0.45) / 0.55);
  const h = 17 * size * up * k * 0.8, w = (1.3 + age * 2.6) * size * k;
  const op = (age < 0.7 ? 0.95 : 0.95 * (1 - (age - 0.7) / 0.3)).toFixed(2);
  const col = [[-w, 0], [-w * 0.55, -h * 0.5], [-w * 0.4, -h * 0.9], [-w * 0.12, -h], [w * 0.2, -h * 0.96], [w * 0.45, -h * 0.82], [w * 0.6, -h * 0.45], [w, 0]];
  const foam = Array.from({ length: 16 }, (_, i) => [Math.cos(i * Math.PI / 8) * (1.6 + age * 4) * size, Math.sin(i * Math.PI / 8) * (1.6 + age * 4) * size]);
  return `<path class="ct-foam" style="opacity:${(op * 0.8).toFixed(2)}" d="${K.onTop(foam, 0, P0, true)}"/>` +
    `<path class="ct-splash" style="opacity:${op}" d="${K.pathOf(col, true)}"/>`;
}

// ---------- wakes and bow waves, per state ----------
export function fieldMarks(K, P, pose) {
  const out = [];
  for (const s of pose.ships) {
    const F = fdFrame(s.x, s.y, s.face);
    const at = (u, v) => K.iso([...F(u, v), 0], P);
    out.push(`<path class="ct-wash" d="${K.onTop(CT_HULL_PTS.map(([u, v]) => F(u * 1.06 + 0.4, v * 1.5)), 0, P, true)}"/>`);
    for (const sg of [1, -1]) {
      const pts = []; for (let d = 0; d <= 36; d += 3) pts.push([-17 - d, sg * (2 + d * 0.34)]);
      [[0, 5, 0.8], [4, 9, 0.5], [8, 12, 0.22]].forEach(([a, b, o]) => out.push(`<path class="ct-wake" style="opacity:${o}" d="${K.pathOf(pts.slice(a, b + 1).map(([u, v]) => at(u, v)))}"/>`));
      out.push(`<path class="ct-wake ct-bow" d="${K.pathOf([at(18.2, 0), at(15, sg * 3.2), at(10.5, sg * 4.6)])}"/>`);
    }
    out.push(`<path class="ct-churn" d="${K.pathOf([at(-17.6, 0), at(-28, 0.6), at(-40, -0.4)])}"/>`);
  }
  return out.join("");
}

// ---------- gunfire, as a pure function of time ----------
// Every turret that bears fires a two-gun salvo every few seconds at its target: a flash at the
// muzzles, a puff of cordite smoke, then two splashes round the target (or a hit: a burst on deck).
// Ships burn where they have taken the model's hits. Returns circles (flashes, smoke, flames) and
// splash items. Timings are notional.
export function fieldShots(pose, t, viewer = [0, 0]) {
  const G = FG;
  const circ = { coal: [], dark: [], cordite: [], flame: [], burst: [], flash: [] };
  const splashes = [];
  const byId = Object.fromEntries(pose.ships.map((s) => [s.id, s]));
  const W = G.WIND;
  for (const s of pose.ships) {
    const F = fdFrame(s.x, s.y, s.face);
    const dir = [Math.cos(s.face * CT_RAD), Math.sin(s.face * CT_RAD)];
    // coal smoke from both funnels, trailing astern and drifting downwind
    [[2.6, 8.6], [-2.2, 8.2]].forEach(([u, h], fi) => {
      if (fi === 1 && Math.round(s.dmg) >= 6) h = 3.2;
      const [fx, fy] = F(u, 0);
      for (let j = 0; j < 3; j++) {
        const a = ctFrac(t * 0.42 + j / 3 + s.i * 0.17 + fi * 0.11 + (s.side === "f" ? 0.5 : 0));
        circ.coal.push({ p: [fx - dir[0] * a * 16 + W[0] * a * 9, fy - dir[1] * a * 16 + W[1] * a * 9, G.FREE + 1.4 + h + 0.6 + a * 4], r: 1 + a * 3.4, o: 0.34 * (1 - a) * Math.min(1, a * 6) });
      }
    });
    // fires where the ship has been hit, with dark smoke
    const n = Math.ceil(s.dmg - 0.02);
    for (let i = 0; i < n; i++) {
      const fade = ctClamp01(s.dmg - i);
      const p = ctDeckSpot(s, i);
      const fl = 0.75 + 0.25 * Math.sin(t * 11 + i * 2.1) * Math.sin(t * 7.3 + i);
      circ.flame.push({ p, r: 1.05 * fl, o: 0.7 * fade, hot: false }, { p: [p[0], p[1], p[2] + 0.35], r: 0.5 * fl, o: 0.95 * fade, hot: true });
      for (let j = 0; j < (i < 4 ? 3 : i < 6 ? 1 : 0); j++) {
        const a = ctFrac(t * 0.3 + j / 3 + i * 0.29);
        circ.dark.push({ p: [p[0] + W[0] * a * 16, p[1] + W[1] * a * 16, p[2] + 1 + a * 13], r: 1.2 + a * 4.4, o: 0.5 * (1 - a) * Math.min(1, a * 5) * fade });
      }
    }
    // salvos from every turret that bears
    s.turrets.forEach((tu, j) => {
      if (!tu.bears) return;
      const target = byId[(s.side === "f" ? "c" : "l") + tu.target];
      if (!target) return;
      const seed = (s.side === "f" ? 100 : 200) + s.i * 2 + j;
      const period = 3.3 + ctHash(seed, 1) * 1.1, phase = ctHash(seed, 2) * period;
      const aim = tu.aim * CT_RAD, c = Math.cos(aim), sn = Math.sin(aim);
      const muzzle = (b) => [tu.x + c * 8.2 - sn * b, tu.y + sn * 8.2 + c * b, G.FREE + 1.85];
      const n1 = Math.floor((t - phase) / period), n0 = n1 - 2;
      for (let k = n0; k <= n1; k++) {
        const age = t - (phase + k * period);
        if (age < 0) continue;
        if (age < 0.2) for (const b of [0.62, -0.62]) circ.flash.push({ p: muzzle(b), r: 1.6 * (1 - age / 0.2) + 0.5, o: 1 - age / 0.2 });
        if (age < 2.6) { const m = muzzle(0); circ.cordite.push({ p: [m[0] + c * 2 + W[0] * age * 5, m[1] + sn * 2 + W[1] * age * 5, m[2] + age * 1.6], r: 1 + age * 1.7, o: 0.5 * (1 - age / 2.6) }); }
        const ia = age - G.FLIGHT;
        if (ia < 0) continue;
        const hit = ctHash(seed, k * 3 + 7) < G.HIT_SHOW;
        const TF = fdFrame(target.x, target.y, target.face);
        for (const b of [0, 1]) {
          if (hit && b === 0) {
            const p = ctDeckSpot(target, Math.floor(ctHash(seed, k) * 5));
            if (ia < 0.45) circ.burst.push({ p, r: 1.2 + ia * 6, o: 1 - ia / 0.45 });
            if (ia < 2.4) circ.dark.push({ p: [p[0] + W[0] * ia * 4, p[1] + W[1] * ia * 4, p[2] + ia * 3], r: 1.2 + ia * 2, o: 0.55 * (1 - ia / 2.4) });
            continue;
          }
          if (ia > 2) continue;
          const u = (ctHash(seed, k * 5 + b) - 0.5) * 34;
          const v = (ctHash(k, seed * 3 + b) < 0.5 ? -1 : 1) * (6 + ctHash(seed + b, k) * 9);
          const [x, y] = TF(u, v);
          // a splash sorts just behind or just in front of the ship it straddles, by which side of it it falls
          const near = (x - target.x) * viewer[0] + (y - target.y) * viewer[1] > 0;
          splashes.push({ id: `sp${seed}-${k}-${b}`, x, y, ship: target, near, age: ia / 2, size: 0.85 + ctHash(b, k + seed) * 0.35 });
        }
      }
    });
  }
  return { circ, splashes };
}

// Page only: the smoke as a few paths (puffs bucketed by opacity, each bucket one path of circles, so
// overlapping puffs do not stack up paint), and pools of circles for flames, bursts and flashes, all
// drawn above the ships. draw() writes attributes only.
export function seaFire(group, K, P) {
  const ns = "http://www.w3.org/2000/svg";
  const LEVELS = 4, SMOKE = { coal: 0.34, dark: 0.55, cordite: 0.5 };
  const paths = {};
  for (const name of Object.keys(SMOKE)) paths[name] = Array.from({ length: LEVELS }, (_, i) => {
    const e = document.createElementNS(ns, "path"); e.setAttribute("class", "ct-" + name); e.setAttribute("fill-opacity", (SMOKE[name] * (i + 1) / LEVELS).toFixed(2)); e._d = ""; group.appendChild(e); return e;
  });
  const sizes = { flame: 40, burst: 16, flash: 40 };
  const pools = {};
  for (const [name, n] of Object.entries(sizes)) pools[name] = Array.from({ length: n }, () => {
    const e = document.createElementNS(ns, "circle"); e.setAttribute("class", "ct-" + name); e.setAttribute("visibility", "hidden"); e._on = false; group.appendChild(e); return e;
  });
  const k = K.cameraOf(P).k;
  const f1 = (x) => x.toFixed(1);
  return {
    draw(shots) {
      for (const [name, max] of Object.entries(SMOKE)) {
        const d = Array.from({ length: LEVELS }, () => []);
        for (const c of shots.circ[name]) {
          const lv = Math.min(LEVELS, Math.round((c.o / max) * LEVELS));
          if (lv < 1) continue;
          const [x, y] = K.iso(c.p, P), r = c.r * k;
          d[lv - 1].push(`M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`);
        }
        paths[name].forEach((e, i) => { const v = d[i].join(""); if (v !== e._d) { e.setAttribute("d", v); e._d = v; } });
      }
      for (const [name, pool] of Object.entries(pools)) {
        let i = 0;
        for (const c of shots.circ[name]) {
          if (i >= pool.length) break;
          if (c.o < 0.01) continue;
          const e = pool[i++], [x, y] = K.iso(c.p, P);
          if (!e._on) { e.removeAttribute("visibility"); e._on = true; }
          e.setAttribute("cx", f1(x)); e.setAttribute("cy", f1(y)); e.setAttribute("r", f1(c.r * k)); e.setAttribute("fill-opacity", c.o.toFixed(2));
          if (name === "flame") e.setAttribute("data-hot", c.hot ? "1" : "0");
        }
        for (; i < pool.length; i++) if (pool[i]._on) { pool[i].setAttribute("visibility", "hidden"); pool[i]._on = false; }
      }
    },
  };
}

// Figure-local tints for the sea scene (light theme only; the site has no dark mode).
export const SEA_CSS = `
.ct-figure .tr-water{fill:#d9e5ea}
.ct-field{--tr-ground:#e6e8d6;--tr-high:#cfd6b4}
.ct-swell{fill:#d3e0e6;stroke:none}
.ct-shoal{fill:#e3ecee;stroke:none}
.ct-beach{fill:#ece4cf;stroke:none}
.ct-ripple{fill:none;stroke:#aebfc8;stroke-width:.55;stroke-linecap:round}
.ct-hullshadow{fill:#5d7480;opacity:.22;stroke:none}
.ct-wash{fill:#fbfdfd;opacity:.75;stroke:none}
.ct-wake{fill:none;stroke:#fbfdfd;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}
.ct-bow{opacity:.9}
.ct-churn{fill:none;stroke:#fbfdfd;stroke-width:2.6;stroke-linecap:round;opacity:.42}
.iso .tr-s path.ct-deck{fill:#e8dcc0}
.iso .tr-s path.ct-plank{fill:none;stroke:#cdbd98;stroke-width:.35}
.iso .tr-s path.ct-scorch{fill:#5b5650;stroke:none;opacity:.75}
.iso .tr-s path.ct-sup-t{fill:#f1f1ee}.iso .tr-s path.ct-sup-l{fill:#dcdcd8}.iso .tr-s path.ct-sup-d{fill:#c3c3be}
.iso .tr-s path.ct-cap{fill:#3c3c3e;stroke:none}
.iso .tr-s path.ct-mast{fill:none;stroke-width:.6;stroke-linecap:round}
.iso .tr-s path.ct-gun{fill:none;stroke-width:1.05;stroke-linecap:round}
.iso .tr-s path.ct-hullshadow,.iso .tr-s path.ct-scorch,.iso .tr-s path.ct-cap{stroke:none}
.iso .tr-s path.ct-splash{fill:#f7fafb;stroke:#8fa5b0;stroke-width:.4}
.iso .tr-s path.ct-foam{fill:#f7fafb;stroke:none}
.ct-sea-fire circle,.ct-sea-fire path{pointer-events:none;stroke:none}
.ct-coal{fill:#6f6c68}
.ct-dark{fill:#3f3c39}
.ct-cordite{fill:#c9c4b8}
.ct-flame{fill:#e5672a}.ct-flame[data-hot="1"]{fill:#ffd166}
.ct-burst{fill:#ff9a3c}
.ct-flash{fill:#ffd36b;stroke:#f08a24!important;stroke-width:.5!important}
`;
