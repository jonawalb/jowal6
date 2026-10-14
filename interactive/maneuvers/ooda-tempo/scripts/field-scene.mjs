// The Battlefield view of OODA Loop and Tempo, at platoon scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same simulation as the bench drives it (sim.c, the loops each side has
// run, and the actions advance() reports as they land):
//   - Each side's platoon holds one of three positions in broken ground and moves round them in turn.
//     In loop n it halts at position n (mod 3) through its observe quarter, then moves to position n+1
//     while it orients, decides and acts, arriving as its action lands.
//   - When an action lands the side fires (its automatic riflemen). A fresh action falls on the enemy
//     platoon. A stale one (the model's rule: the other side has run a whole loop since this side
//     observed) falls on the position where this side saw the enemy, which the enemy has left; one fire
//     team also rushes toward it.
//   - Each side's fire sector (a fan on the ground) is laid on the position where it last saw the
//     enemy, so a stale picture shows as a fan pointing at empty ground.
//   - Casualties: the model's notional counts (casualties()), greyed and still at each side's
//     casualty collection point with a medic.
// Frame on the ground: u from Blue toward Red (left to right on the card), v across (down the card).
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { casualties } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trFan, trPlatoon, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -300, y: -300, w: 600, d: 600 },
  O: [0, 0],
  ANG: 325,             // the u axis (world degrees): Blue → Red, left to right on the card
  S: 3.0,               // interval between men (units)
  // three positions per side (u, v), visited in order 0 → 1 → 2 → 0
  SLOTS: { blue: [[-46, -36], [-46, 36], [-82, 0]], red: [[46, 36], [46, -36], [82, 0]] },
  HALT: 0.25,           // share of each loop spent halted (the observe quarter); the rest is the move
  CCP: { blue: [-94, 58], red: [94, -58] }, // casualty collection points (u, v)
  RUSH: 18,             // how far the fire team rushes toward a stale target (units)
  RUSH_T: 2.2,          // and how long the rush lasts (s)
  STRIKE_T: 5,          // how long a strike's fire and smoke last on screen (s)
  VIEW: { u: 0, zoom: 1.25 },
};
FG.TERRAIN = {
  rises: [
    { cx: 0, cy: 0, r: 27, steps: 2, h: 1.3, top: 0.62, seed: 41, wobble: 0.1 },
    { cx: 0, cy: 0, r: 27, steps: 2, h: 1.3, top: 0.62, seed: 47, wobble: 0.1 },
    { cx: 0, cy: 0, r: 22, steps: 3, h: 1.4, top: 0.45, seed: 53, wobble: 0.12 },
  ],
};
const W = fdFrame(FG.O[0], FG.O[1], FG.ANG); // (u, v) → world [x, y]
{
  // the two rear positions sit on low rises; a third, higher knoll stands in the middle ground off the fire lines
  [[-88, 0], [88, 0], [4, -76]].forEach(([u, v], i) => { const [x, y] = W(u, v); FG.TERRAIN.rises[i].cx = x; FG.TERRAIN.rises[i].cy = y; });
}

const FS_SIDES = ["blue", "red"];
const FS_OTHER = { blue: "red", red: "blue" };
const FS_FACE = { blue: FG.ANG, red: FG.ANG + 180 };
const fsSmooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const fsStride = (dist) => [1, 0, 2, 0][((Math.floor(dist / 1.7) % 4) + 4) % 4];
const fsJit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; };
const fsRad = Math.PI / 180;

// The platoon: three rifle squads (squad line when halted, squad column with teams in wedges when
// moving) and the platoon leader with his radio operator. Same members in the same order in both.
const fsDrop = (list) => list.filter((m) => !(m.team === "psg"));
const FS_HALT = fsDrop(trPlatoon("line", "line", "line", FG.S));
const FS_MOVE = fsDrop(trPlatoon("wedge", "column", "wedge", FG.S));
// who goes down first (index into the platoon): riflemen and grenadiers from the rear squad forward
const FS_DOWN = FS_HALT.map((m, i) => ({ i, r: { r: 0, gr: 1, tl: 3, ar: 4, sl: 5, rto: 6, pl: 7 }[m.role] ?? 2, sq: m.squad }))
  .sort((a, b) => a.r - b.r || b.sq - a.sq || a.i - b.i).map((d) => d.i);

// Where a side is in its loop: position index, move share (0 halted .. 1 arrived), moving or not.
export function fieldPhase(c) {
  const n = Math.floor(c), ph = c - n;
  const f = fsSmooth((ph - FG.HALT) / (1 - FG.HALT));
  return { n, ph, f, moving: ph > FG.HALT };
}
// The position a side is at or nearest to (index 0..2).
export function fieldNear(c) {
  const { n, f } = fieldPhase(c);
  return (((f < 0.5 ? n : n + 1) % 3) + 3) % 3;
}
const fsSlot = (side, k) => FG.SLOTS[side][((k % 3) + 3) % 3];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const ring = (pts) => pts.map(([u, v]) => W(u, v));
  g(trGroundPlane(K, P, FG.world));

  // meadows and ploughed fields: the open middle ground and the farmland toward the edges
  for (const [u, v, r, seed, sq] of [[0, 4, 46, 3, 0.7], [-150, 40, 40, 5, 0.7], [150, -40, 40, 7, 0.7], [-70, 110, 40, 9, 0.6], [70, -112, 38, 11, 0.6]]) g(trPatch(K, P, fdBlob(...W(u, v), r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-24, 10], [-22, 52], [20, 56], [22, 14]], 7, "a"],
    [[[-20, -52], [-22, -14], [20, -10], [24, -50]], 7, "b"],
    [[[-150, -40], [-150, 20], [-122, 22], [-120, -38]], 5, "a"],
    [[[122, -20], [120, 38], [150, 40], [152, -18]], 5, "b"],
  ];
  for (const [r, n, tint] of fields) g(trField(K, P, ring(r), { furrows: n, tint }));
  // a stream across the lower edge, and a farm track along the top
  g(trStream(K, P, ring([[-300, 90], [-200, 84], [-120, 92], [-40, 84], [40, 92], [120, 82], [200, 90], [300, 84]]), 3, 7));
  g(trRoad(K, P, ring([[-300, -84], [-200, -90], [-120, -82], [-40, -94], [40, -98], [120, -90], [200, -96], [300, -88]]), 2.6));

  // the corridors the platoons use: never a tree within reach of a position, a route or a fire line
  const lanes = [];
  for (const side of FS_SIDES) for (let k = 0; k < 3; k++) lanes.push([fsSlot(side, k), fsSlot(side, k + 1)]);
  for (const a of FG.SLOTS.blue) for (const b of FG.SLOTS.red) lanes.push([a, b]);
  const nearLane = (u, v) => lanes.some(([[au, av], [bu, bv]]) => {
    const du = bu - au, dv = bv - av, L = du * du + dv * dv;
    const t = Math.max(0, Math.min(1, ((u - au) * du + (v - av) * dv) / L));
    return Math.hypot(u - au - du * t, v - av - dv * t) < 40;
  });
  const IW = fdFrame(0, 0, -FG.ANG); // world → (u, v) (the frame is a pure rotation about the origin)
  const avoid = (x, y) => {
    const [u, v] = IW(x, y);
    if (nearLane(u, v)) return true;
    for (const side of FS_SIDES) { const [cu, cv] = FG.CCP[side]; if (Math.hypot(u - cu, v - cv) < 18) return true; }
    return trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  };
  const woods = [
    [ring([[-220, -104], [-120, -102], [-60, -110], [20, -118], [120, -104], [220, -110], [220, -170], [-220, -170]]), 46, 21],
    [ring([[-220, 100], [-150, 98], [-40, 106], [60, 98], [160, 104], [220, 100], [220, 170], [-220, 170]]), 46, 22],
    [ring([[-220, -104], [-124, -100], [-120, 98], [-220, 100]]), 34, 23],
    [ring([[220, -110], [124, -104], [120, 100], [220, 100]]), 34, 24],
    [fdBlob(...W(-2, 64), 13, 31, 0.14, 40, 1), 7, 25],
    [fdBlob(...W(-104, -70), 12, 33, 0.14, 40, 1), 5, 26],
    [fdBlob(...W(106, 72), 12, 35, 0.14, 40, 1), 5, 27],
    [fdBlob(...W(-30, -74), 9, 37, 0.14, 40, 1), 3, 28],
  ];
  for (const [r, n, seed] of woods) {
    const trees = trScatter(r, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid });
    const w = trWood(K, P, T, r, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // cover at the front positions: a hedgerow in front of each, with a gap at the centre where the
  // routes pass; dry-stone walls across the farmland; a farm at each end of the track
  for (const sgn of [-1, 1]) {
    const u = sgn * 32;
    items.push(...trHedge(K, P, ring([[u, -74], [u + sgn * 1.2, -52], [u, -26], [u - sgn * 1, -14]]), { seed: 61 + sgn }));
    items.push(...trHedge(K, P, ring([[u - sgn * 1, 14], [u, 26], [u + sgn * 1.2, 52], [u, 74]]), { seed: 65 + sgn }));
  }
  items.push(...trWall(K, P, ring([[-120, -40], [-120, -72]])), ...trWall(K, P, ring([[120, 40], [120, 70]])));
  { const [x, y] = W(-112, -88); items.push(trHouse(K, P, x, y, FG.ANG, 12, 8)); }
  { const [x, y] = W(114, 88); items.push(trHouse(K, P, x, y, FG.ANG + 90, 11, 7.5)); }

  g(trRelief(K, P, T));
  return { ground: ground.join(""), items };
}

// Where every soldier stands and who fires at whom, for the simulation state S = { c: { blue, red } }
// (loops run, sim.c). M carries what the page keeps between frames: t (seconds), the strikes still on
// screen ([{ side, stale, slot, t0 }]), T (the cycle times, for the casualty counts) and still
// (reduced motion). Without M (the build's first frame) nobody fires.
export function fieldPose(S, T, M = {}) {
  const t = M.t || 0, strikes = M.strikes || [];
  const men = [];
  const loss = casualties(M.T || { blue: 4, red: 6 });
  const anchors = {};
  for (const side of FS_SIDES) {
    const { n, f, moving } = fieldPhase(S.c[side]);
    const [au, av] = fsSlot(side, n), [bu, bv] = fsSlot(side, n + 1);
    const u = au + (bu - au) * f, v = av + (bv - av) * f;
    const leg = Math.hypot(bu - au, bv - av);
    const travel = Math.atan2(...(() => { const [x0, y0] = W(au, av), [x1, y1] = W(bu, bv); return [y1 - y0, x1 - x0]; })()) / fsRad;
    const m = moving ? fsSmooth(f / 0.22) * fsSmooth((1 - f) / 0.22) : 0; // halted line ↔ moving column
    const face0 = FS_FACE[side];
    const [x, y] = W(u, v);
    const tRad = travel * fsRad;
    const halt = FS_HALT.map((mm) => fdFrame(x, y, face0)(mm.off[0] + FG.S * 2.2, mm.off[1]));
    const move = FS_MOVE.map((mm) => fdFrame(x + Math.cos(tRad) * 16, y + Math.sin(tRad) * 16, travel)(mm.off[0], mm.off[1]));
    // under fresh fire, a halted platoon goes to ground
    const hit = strikes.some((s) => s.side !== side && !s.stale && t - s.t0 > 0.45 && t - s.t0 < 2.6);
    const observing = !moving;
    anchors[side] = { u, v, n, near: fieldNear(S.c[side]) };
    const downSet = new Set(FS_DOWN.slice(0, loss[side]));
    let k = 0;
    FS_HALT.forEach((mm, i) => {
      const id = `${side[0]}-${i}`;
      if (downSet.has(i)) {
        // casualties lie in a row at the collection point, greyed and still
        const [cu, cv] = FG.CCP[side];
        const j = k++;
        const [px, py] = W(cu + (side === "blue" ? -1 : 1) * ((j % 2) * 6.5 + 1.8 * fsJit(j, 5)), cv + (j >> 1) * 3.8 - 5 + 0.9 * fsJit(5, j));
        men.push({ id, side: side === "blue" ? "fc" : "hc", role: mm.role, pose: "prone", face: face0 + 180 + 24 * fsJit(i, 2), stride: 0, x: px, y: py, sq: mm.squad });
        return;
      }
      const jx = 1.4 * fsJit(i, side.length), jy = 1.4 * fsJit(side.length, i);
      let px = halt[i][0] + (move[i][0] - halt[i][0]) * m + jx, py = halt[i][1] + (move[i][1] - halt[i][1]) * m + jy;
      let pose, face = m > 0.5 ? travel : face0, stride = 0;
      if (moving && f < 0.985) { pose = "stand"; stride = fsStride(f * leg + i * 1.3); }
      else if (hit) pose = "prone";
      else if (mm.role === "pl" && observing) pose = "stand";
      else pose = mm.role === "ar" ? "prone" : "kneel";
      // a stale action: the lead fire team of the first squad rushes toward the empty position
      if (mm.squad === 1 && mm.team === "a") {
        const s = strikes.find((q) => q.side === side && q.stale && t - q.t0 >= 0 && t - q.t0 < FG.RUSH_T);
        if (s) {
          const p = (t - s.t0) / FG.RUSH_T, [tu, tv] = fsSlot(FS_OTHER[side], s.slot);
          const [tx, ty] = W(tu, tv), d = Math.hypot(tx - px, ty - py) || 1, a = Math.sin(Math.PI * p) * FG.RUSH;
          px += ((tx - px) / d) * a; py += ((ty - py) / d) * a;
          pose = "stand"; stride = fsStride(a * 2 + i); face = p < 0.5 ? Math.atan2(ty - py, tx - px) / fsRad : Math.atan2(py - ty, px - tx) / fsRad;
        }
      }
      men.push({ id, side: side === "blue" ? "f" : "h", lit: side === "blue", role: mm.role, pose, face, stride, x: px, y: py, sq: mm.squad });
    });
    if (loss[side] > 0) {
      const [cu, cv] = FG.CCP[side];
      const [px, py] = W(cu + (side === "blue" ? 4.5 : -4.5), cv - 3);
      men.push({ id: `${side[0]}-med`, side: side === "blue" ? "f" : "h", role: "r", pose: "kneel", face: face0 + (side === "blue" ? 180 : 0), stride: 0, x: px, y: py });
    }
  }
  for (const m of men) m.z = T.height(m.x, m.y);

  // fire: each strike is one or two bursts from every automatic rifleman of the side whose action
  // landed, timed from the moment it landed (t0); returned per strike for trShots(streams, t - t0)
  const shots = [];
  for (const s of strikes) {
    const age = t - s.t0;
    if (age < 0 || age > FG.STRIKE_T) continue;
    const sideTag = s.side === "blue" ? "f" : "h", foe = s.side === "blue" ? "h" : "f";
    let to;
    if (s.stale) {
      const [cu, cv] = fsSlot(FS_OTHER[s.side], s.slot);
      to = [-26, -16, -6, 4, 14, 24].map((dv) => { const [x, y] = W(cu + (s.side === "blue" ? -4 : 4), cv + dv); return [x, y, T.height(x, y) + 0.5]; });
    } else to = men.filter((m) => m.side === foe).map((m) => trAimPoint(m, m.x, m.y, m.z));
    const shooters = men.filter((m) => m.side === sideTag && m.role === "ar");
    const streams = [];
    shooters.forEach((m, i) => {
      const from = trMuzzle(m, m.x, m.y, m.z);
      streams.push({ side: s.side === "blue" ? "f" : "h", heavy: true, smoke: i % 2 === 0, from, to, period: 1000, burst: 3, gap: 0.11, flight: 0.5, phase: 0.05 + i * 0.09, on: 1, scatter: 3.2 });
      streams.push({ side: s.side === "blue" ? "f" : "h", heavy: true, from, to, period: 1000, burst: 3, gap: 0.11, flight: 0.5, phase: 0.75 + i * 0.11, on: 1, scatter: 3.2 });
    });
    shots.push({ streams, t: age + 0 });
  }
  return { men, shots, anchors, seen: M.seen || {} };
}

// Per-state ground marks: each side's fire sector, laid from its position on the position where it
// last saw the enemy (M.seen). When that picture is stale the fan points at empty ground.
export function fieldMarks(K, P, T, pose) {
  let out = "";
  for (const side of FS_SIDES) {
    const seen = pose.seen[side];
    if (seen === undefined) continue;
    const [ou, ov] = fsSlot(side, pose.anchors[side].near), [tu, tv] = fsSlot(FS_OTHER[side], seen);
    const [ox, oy] = W(ou + (side === "blue" ? 6 : -6), ov), [tx, ty] = W(tu, tv);
    const d = Math.hypot(tx - ox, ty - oy), a = Math.atan2(ty - oy, tx - ox) / fsRad, half = Math.atan2(24, d) / fsRad;
    out += trFan(K, P, T, ox, oy, 12, d + 8, a - half, a + half, { side: side === "blue" ? "f" : "h", arcs: 1, alpha: 0.55 });
  }
  return out;
}
