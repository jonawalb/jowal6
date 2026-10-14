// The Battlefield view of Engagement Area Development: a company area defense drawn with the terrain
// kit (../../kit/terrain.mjs). The same run state as the machine drives it (model.mjs newRun/step):
//   S.x          the enemy column's lead, notional m in front of the defenders; world y = -0.55 * x
//   S.steps      which of the seven steps are built;  S.phase  advancing | destroyed | through
//   S.downE      where each enemy element fell (x);  S.downF  defenders down
//   S.b          each step's build progress 0..1 (the page eases it; the build uses the steps)
// World frame: x along the front, y toward the defenders' rear, the enemy comes from negative y.
// Two avenues of approach run down the valley, A on the left and B on the right, either side of a
// wooded rise. The engagement area is built on the avenue the defenders think the enemy will take:
// A when steps 1 and 2 are both done, otherwise B (the wrong one). Everything that belongs to a step is
// a static group tagged data-s (and data-lane); the page shows or hides it with the build progress.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdPolar, fdBlob, fdSpline, fdRibbon, fdStakes, fdPoly } from "../../kit/field.mjs";
import { MODEL, inEA, rightAvenue } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trHole, trWire, trFan, trChalk, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -250, y: -310, w: 500, d: 430 },
  LANE: { A: -62, B: 62 },
  MY: 0.46,            // world units per notional metre
  CP: [0, 62],
  ASSEMBLY: [[-34, 76], [0, 82], [34, 76]],
  MORTAR: [38, 72],
  CCP: [[-26, 92], [-21, 94], [-16, 92], [-24, 98], [-19, 100], [-14, 98], [-23, 104], [-18, 105], [-28, 103], [-13, 103]],
  // which defenders go down, in order: platoon-man ids
  DOWN_F: ["p0-1", "p1-4", "p0-3", "p2-2", "p1-0", "p0-5", "p2-5", "p1-2", "p0-0", "p2-0", "p1-5", "p2-3"],
  KINDS: ["veh", "veh", "man", "veh", "man", "veh", "veh", "man", "man", "veh", "man", "man"],
};
FG.TERRAIN = {
  rises: [
    { cx: 0, cy: -125, r: 34, steps: 3, h: 1.7, top: 0.45, seed: 41, wobble: 0.1 },
    { cx: -200, cy: -170, r: 36, steps: 3, h: 1.6, top: 0.45, seed: 43, wobble: 0.12 },
    { cx: 200, cy: -150, r: 34, steps: 3, h: 1.6, top: 0.5, seed: 47, wobble: 0.12 },
  ],
};
export const yOf = (x) => -FG.MY * x;
export const laneOf = (steps) => (rightAvenue(steps) ? "A" : "B");
// a platoon's battle position for an engagement area on the lane at x = L
export const bpOf = (L) => [{ c: [L - 58, 18], face: 292 }, { c: [L + 58, 14], face: 248 }, { c: [L, 54], face: 270 }];

const FS_RAD = Math.PI / 180;
const fsHash = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

const wrap = (n, lane, svg) => `<g class="ea-s" data-s="${n}"${lane ? ` data-lane="${lane}"` : ""}>${svg}</g>`;

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[-62, -60, 70, 3, 0.55], [62, -60, 70, 4, 0.55], [0, 30, 90, 5, 0.5], [-180, 10, 40, 6, 0.8], [190, 20, 36, 9, 0.7]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.1, 40, sq)));
  const fields = [
    [[[-240, 30], [-170, 24], [-166, 80], [-236, 86]], 8, "a"],
    [[[160, 60], [235, 54], [238, 108], [164, 114]], 8, "b"],
    [[[-150, -250], [-110, -254], [-106, -300], [-148, -304]], 7, "b"],
    [[[110, -250], [160, -246], [164, -296], [114, -300]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  // the two avenues of approach: farm tracks down the valley
  g(trRoad(K, P, [[-74, -330], [-68, -230], [-64, -130], [-62, -30], [-62, 40], [-60, 110]], 3));
  g(trRoad(K, P, [[74, -330], [68, -230], [64, -130], [62, -30], [62, 40], [60, 110]], 3));
  g(trStream(K, P, [[-300, -262], [-180, -256], [-60, -262], [60, -254], [180, -262], [300, -256]], 3, 5));
  const keepOpen = (x, y) => y < 70 && (Math.abs(x - G.LANE.A) < 36 || Math.abs(x - G.LANE.B) < 36);
  const woods = [
    [fdSpline([[-250, -228], [-130, -222], [-90, -226], [-30, -222], [30, -226], [90, -222], [130, -226], [250, -222], [250, -250], [130, -246], [90, -250], [30, -246], [-30, -250], [-90, -246], [-130, -250], [-250, -252]], 3, true), 60, 61],
    [fdBlob(-175, -70, 26, 62, 0.14, 40, 0.8), 18, 62],
    [fdBlob(180, -50, 26, 63, 0.14, 40, 0.8), 18, 63],
    [fdBlob(-120, 70, 16, 64, 0.12, 40, 1), 7, 64],
    [fdBlob(130, 80, 16, 65, 0.12, 40, 1), 7, 65],
    [fdSpline([[-250, 118], [-130, 114], [0, 118], [130, 114], [250, 118], [250, 130], [0, 130], [-250, 130]], 3, true), 30, 66],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => keepOpen(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-240, 30], [-170, 24]], 71], [[[160, 60], [235, 54]], 72]]) items.push(...trHedge(K, P, pts, { seed }));
  items.push(trHouse(K, P, 150, 20, 90, 12, 8));
  g(trRelief(K, P, T));

  // ---- step 1: the avenues of approach, identified (a tint laid over each) ----
  for (const L of [G.LANE.A, G.LANE.B]) {
    const ring = fdRibbon(fdSpline([[L - 12, -226], [L - 6, -130], [L, -30], [L, 20]], 5), 13);
    g(wrap(1, null, trPatch(K, P, ring, "ea-ribbon")));
  }
  // ---- step 2: the enemy's most likely course of action, down avenue A ----
  {
    const L = G.LANE.A, y0 = -218, y1 = -52;
    const ring = [[L - 3, y0], [L + 3, y0], [L + 3, y1 - 18], [L + 9, y1 - 18], [L, y1], [L - 9, y1 - 18], [L - 3, y1 - 18]];
    g(wrap(2, null, trPatch(K, P, ring, "ea-coa")));
  }
  // ---- steps 3 to 6, once for each avenue the engagement area could be built on ----
  for (const [name, L] of [["A", G.LANE.A], ["B", G.LANE.B]]) {
    const yT = yOf(MODEL.trigger), yN = yOf(MODEL.standoff);
    // step 3: the engagement area outline (lit chalk), the trigger line, three target reference points
    const outline = trChalk(K, P, T, [[L - 30, yT], [L + 30, yT], [L + 30, yN], [L - 30, yN]], { closed: true });
    g(wrap(3, name, outline.ground.replace("tr-chalk", "tr-chalk ea-lit")));
    items.push(...outline.items.map((i) => ({ key: i.key, svg: wrap(3, name, i.svg) })));
    const trig = trChalk(K, P, T, [[L - 24, yT + 8], [L + 24, yT + 8]], { h: 2.6 });
    items.push(...trig.items.map((i) => ({ key: i.key, svg: wrap(3, name, i.svg) })));
    g(wrap(3, name, trig.ground));
    items.push(...fdStakes(K, P, [[L - 10, yOf(210)], [L + 9, yOf(150)], [L - 5, yOf(95)]], 0.1, 7).map((i) => ({ key: i.key, svg: wrap(3, name, i.svg) })));
    // step 4: the three battle positions (chalk) and the sectors of fire of the two flank platoons
    const bps = bpOf(L);
    bps.forEach((b, i) => {
      const ch = trChalk(K, P, T, [[b.c[0] - 17, b.c[1] - 6], [b.c[0] + 17, b.c[1] - 6], [b.c[0] + 17, b.c[1] + 7], [b.c[0] - 17, b.c[1] + 7]], { closed: true, pegs: false });
      g(wrap(4, name, ch.ground));
    });
    const tgt = [L, yOf(170)];
    [bps[0], bps[1]].forEach((b) => {
      const brg = Math.atan2(tgt[1] - b.c[1], tgt[0] - b.c[0]) / FS_RAD;
      g(wrap(4, name, trFan(K, P, T, b.c[0], b.c[1], 8, 100, brg - 13, brg + 13, { side: "f", arcs: 1, alpha: 0.4 })));
    });
    // step 5: two rows of concertina wire across the avenue, in the obstacle belt
    for (const m of [140, 108]) {
      const y = yOf(m);
      const wire = [];
      for (let x = L - 34; x <= L + 34.01; x += 8.5) wire.push([x, y + 0.7 * Math.sin(x * 0.2)]);
      items.push(...trWire(K, P, T, wire).map((i) => ({ key: i.key, svg: wrap(5, name, i.svg) })));
    }
    // step 6: the mortar section's two pits behind the position
    items.push(...trHole(K, P, L + G.MORTAR[0] - 3, G.MORTAR[1], 0, 270).map((i) => ({ key: i.key, svg: wrap(6, name, i.svg) })));
    items.push(...trHole(K, P, L + G.MORTAR[0] + 6, G.MORTAR[1] + 2, 0, 270).map((i) => ({ key: i.key, svg: wrap(6, name, i.svg) })));
  }
  return { ground: ground.join(""), items };
}

// Where every figure stands and who fires at whom for a run state S (S.b: build progress; M: { t }).
export function fieldPose(S, T, M = { t: 0 }) {
  const G = FG, m = MODEL;
  const steps = S.steps, b = S.b || steps.map((v) => (v ? 1 : 0));
  const L = G.LANE[laneOf(steps)];
  const men = [];
  const add = (p) => { p.z = T.height(p.x, p.y); men.push(p); return p; };
  const laneA = G.LANE.A;

  // --- the enemy column: vehicles and dismounts, two abreast down avenue A ---
  const nDown = S.downE.length;
  const through = S.phase === "through";
  const overrun = through ? Math.min(46, (S.t - S.end) * 14) : 0;
  const yLead = yOf(S.x) + overrun;
  const alive = [];
  const moving = S.released && S.phase === "advancing";
  G.KINDS.forEach((kind, i) => {
    const id = `e${i}`;
    if (i < nDown) {
      add({ id, side: "hc", veh: kind === "veh", role: "r", pose: "prone", stride: 0, face: 90 + ((i * 7) % 5 - 2) * 14, x: laneA + ((i * 7) % 11) - 5, y: yOf(S.downE[i]) - (i % 3) * 2 });
      return;
    }
    const j = i - nDown;
    const q = { id, side: "h", veh: kind === "veh", role: kind === "veh" ? "r" : "r", pose: "stand", stride: kind === "man" && (moving || through) ? strideAt(-yLead + j * 0.7) : 0, face: 90, x: laneA + (j % 2 ? 5 : -5), y: yLead - j * 8.5 };
    add(q); alive.push(q);
  });

  // --- the defenders ---
  const e = ease(Math.min(1, Math.max(0, b[3])));
  const bps = bpOf(L);
  const roles = ["tl", "ar", "gr", "r", "r", "mg"];
  const down = new Set(G.DOWN_F.slice(0, S.released ? Math.max(1, S.downF) : 0));
  const live = [];
  bps.forEach((bp, p) => {
    const asm = G.ASSEMBLY[p];
    for (let k = 0; k < 6; k++) {
      const id = `p${p}-${k}`;
      if (down.has(id)) continue;
      const along = (k - 2.5) * 5.4;
      const fx = Math.cos((bp.face + 90) * FS_RAD), fy = Math.sin((bp.face + 90) * FS_RAD);
      const bx = bp.c[0] + fx * along, by = bp.c[1] + fy * along;
      const ax = asm[0] + (k - 2.5) * 3.1 + (p - 1) * 0, ay = asm[1] + (k % 2) * 3;
      const x = lerp(ax, bx, e), y = lerp(ay, by, e);
      const inPos = e > 0.97;
      const q = add({ id, side: "f", role: roles[k], pose: inPos ? (k === 5 ? "prone" : "kneel") : "stand", stride: !inPos && e > 0 && e < 1 ? strideAt(e * 90 + k) : 0, face: lerp(270, bp.face, e), x, y });
      live.push(q);
    }
  });
  add({ id: "co", side: "f", role: "pl", pose: "kneel", face: 270, stride: 0, x: G.CP[0] + L - 4, y: G.CP[1] });
  add({ id: "rto", side: "f", role: "rto", pose: "kneel", face: 270, stride: 0, x: G.CP[0] + L + 1, y: G.CP[1] + 2 });
  G.CCP.slice(0, down.size).forEach(([x, y], k) => add({ id: `c-f${k}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 70 + 25 * ((k * 5) % 3 - 1), x: x + L, y }));
  if (down.size) add({ id: "medic", side: "f", role: "r", pose: "kneel", stride: 0, face: 90, x: G.CCP[0][0] + L + 7, y: G.CCP[0][1] - 5 });
  // step 6: the mortar crew and the observer; they are only there when the fires are planned
  if (steps[5]) {
    add({ id: "mc0", side: "f", role: "r", pose: "kneel", face: 270, stride: 0, x: L + G.MORTAR[0] - 3, y: G.MORTAR[1] - 3 });
    add({ id: "mc1", side: "f", role: "r", pose: "kneel", face: 270, stride: 0, x: L + G.MORTAR[0] + 6, y: G.MORTAR[1] - 1 });
    add({ id: "obs", side: "f", role: "r", pose: "prone", face: 270, stride: 0, x: bps[0].c[0] + 9, y: bps[0].c[1] - 9 });
  }
  // step 7: the rehearsal: one soldier walks down the avenue while the
  // leaders watch; once rehearsed he is back at the command post
  if (steps[6] || b[6] > 0.01) {
    const r = Math.min(1, Math.max(0, b[6]));
    const walking = r > 0.02 && r < 0.98;
    const wy = lerp(yOf(MODEL.trigger), yOf(MODEL.standoff), r);
    add({ id: "dummy", side: "f", role: "r", pose: "stand", face: 90, stride: walking ? strideAt(r * 160) : 0, x: walking ? L : G.CP[0] + L + 8, y: walking ? wy : G.CP[1] + 3 });
  }

  // --- fire ---
  const streams = [];
  const aim = (p) => (p.veh ? [p.x, p.y, p.z + 2.2] : trAimPoint(p, p.x, p.y, p.z));
  const muzzle = (p) => trMuzzle(p, p.x, p.y, p.z);
  const running = S.released && S.phase === "advancing";
  const inKZ = (p) => p.y >= yOf(m.trigger) - 2 && p.y <= yOf(m.standoff) + 2;
  const targets = alive.filter(inKZ).map(aim);
  const early = alive.filter((p) => p.y >= yOf(m.trigger + 90)).map(aim);
  const positioned = e > 0.97;
  const fireOn = running || (S.phase === "destroyed" && false);
  if (fireOn) {
    live.forEach((p, i) => {
      // with the EA built and rehearsed everyone opens together at the trigger line; without the
      // rehearsal some open early, at long range, and the rest late; with no TRPs the fire is scattered
      const premature = !steps[6] && i % 3 === 0;
      const tg = premature ? (early.length ? early : targets) : targets;
      if (!tg.length) return;
      const share = positioned ? 1 : (i % 3 === 0 ? 0.5 : 0);   // unpositioned: few weapons reach
      streams.push({ id: p.id, side: "f", heavy: p.role === "mg" || p.role === "ar", from: muzzle(p), to: tg, period: 1.9 + (i % 5) * 0.27, burst: p.role === "mg" ? 3 : 1, gap: 0.1, flight: 0.5, phase: (steps[6] ? 0 : i * 0.43) + i * 0.09, on: share * (steps[2] ? 0.85 : 0.4), scatter: steps[2] ? 2.4 : 7 });
    });
    // the enemy answers from its vehicles and its dismounts
    const defs = live.map(aim);
    alive.forEach((p, i) => {
      if (!defs.length) return;
      streams.push({ id: p.id, side: "h", heavy: !!p.veh, from: p.veh ? [p.x, p.y + 4, p.z + 3] : muzzle(p), to: defs, period: 2.6 + (i % 4) * 0.3, burst: p.veh ? 2 : 1, gap: 0.12, flight: 0.6, phase: 0.3 + i * 0.37, on: S.x < m.start - 60 ? 0.35 : 0, scatter: 5 });
    });
  }
  return { men, streams, lane: laneOf(steps), alive: alive.length };
}

// Mortar bursts while the fires are planned and the column is in the engagement area: about two a
// second, scattered over the kill zone.
export function fieldBursts(S, lane, t) {
  const out = [];
  if (!S.steps[5] || !S.released || S.phase !== "advancing" || !inEA(S.x)) return out;
  const L = FG.LANE[lane], life = 2.4, rate = 2.2;
  const k1 = Math.floor(t * rate), k0 = k1 - Math.ceil(life * rate);
  for (let k = k0; k <= k1; k++) {
    const age = t - k / rate;
    if (age < 0 || age > life) continue;
    const x = L - 24 + fsHash(k, 3) * 48;
    const y = yOf(MODEL.trigger) + 6 + fsHash(k, 7) * (yOf(MODEL.standoff) - yOf(MODEL.trigger) - 12);
    out.push({ p: [x, y, 0], age: age / life, k });
  }
  return out;
}
