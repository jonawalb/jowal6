// The Battlefield view of Interior vs Exterior Lines, at operational scale, drawn with the terrain kit
// (../../kit/terrain.mjs). Each small vehicle stands for a company and each cluster of three for a
// battalion. The same model state S as the machine drives it, with the same bearings:
//   S.r, S.psi  the hub shuttle: here the lit blue battalion at the road hub in the middle, running out
//               along one of six radial roads to a town (r 0..80 maps onto the road, hub to town)
//   S.phi, S.n  the rim carriages: here one, two or three red battalions on the ring road that links
//               the six towns, all moving round it together as the belt turns
//   S.call      the called station: the town both sides race for (chalk outline)
// The race (page-measured, passed in M.race) decides the clash at the called town: whoever arrives
// first holds the town and the side that arrives second halts short of it and attacks. Losses come from
// model.mjs losses() and are notional. When the machine's shuttle runs back to the hub, the blue
// battalion drives back to the hub too; a red battalion halted short of the town then moves into it,
// so the end state matches the machine (a carriage at the station).
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every vehicle and fire stream for a state (build and page); fieldMarks() draws the objective outline
// and the holder's fire sector. build.mjs inlines this file with `import` and `export` lines stripped,
// after model.mjs, scene.mjs, field.mjs and terrain.mjs.
import { fdBlob, fdFrame, fdPolar } from "../../kit/field.mjs";
import { trVehicle, trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trPrism } from "../../kit/terrain.mjs";
import { MODEL, wrap, losses } from "./model.mjs";

export const FG = {
  world: { x: -360, y: -360, w: 720, d: 720 },
  RT: 150,                 // radius of the ring road and the six towns on it
  STOP: 142,               // where the blue battalion's lead stops in a town (the shuttle's stop, r = 80)
  GAP: 11,                 // vehicle spacing in a march column
  HALT: 34,                // the side that arrives second halts this far short of the town
  RANGE: 84,               // the holder opens fire on an attacker inside this distance of the town
  CASEVAC: 8,              // seconds for the casualty evacuation truck's round trip
  KO: [0.25, 0.6],         // seconds after contact at which the first and second vehicle is knocked out
};
// rises between the roads: three inside the ring and two outside it, all on the bearings halfway
// between two radial roads, so no road climbs one
FG.TERRAIN = {
  rises: [[45, 88, 24, 2, 7], [165, 88, 26, 3, 13], [285, 88, 24, 2, 21], [45, 210, 24, 2, 31], [285, 232, 30, 3, 47]].map(([m, r, rr, steps, seed]) => ({
    cx: r * Math.cos(m * Math.PI / 180), cy: r * Math.sin(m * Math.PI / 180), r: rr, steps, h: 1.7, top: 0.48, seed, wobble: 0.12,
  })),
};

const IL_RAD = Math.PI / 180;
const ilClamp01 = (x) => Math.min(1, Math.max(0, x));
const ilSmooth = (a, b, x) => { const t = ilClamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ilLerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const ilAngLerp = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const ilBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
const ilArc = (r, a0, a1, step = 2) => { const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / step)); return Array.from({ length: n + 1 }, (_, i) => fdPolar(0, 0, r, a0 + ((a1 - a0) * i) / n)); };

export const fieldTerrain = () => trTerrain(FG.TERRAIN);
const ilTown = (a) => fdPolar(0, 0, FG.RT, a);
const ilDeg = (len) => (len / FG.RT) / IL_RAD;   // arc length on the ring road, in degrees

// A supply or command truck at the origin facing `face`: cargo box, cab and chassis. About 8 long.
export function ilTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, ilBox(F, u0, u1, v0, v1), z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(ilBox(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

// One unit's look: a vehicle, a truck, or the casualty evacuation truck (white roof); a knocked-out
// vehicle is wrapped so the page CSS greys it.
export function ilUnitSvg(K, P, u, face) {
  const body = u.kind === "v" ? trVehicle(K, P, face) : ilTruck(K, P, face);
  if (u.out) return `<g class="il-out">${body}</g>`;
  return u.kind === "m" ? `<g class="il-medevac">${body}</g>` : body;
}

// ---------- the ground ----------
export function fieldStatic(K, P, T) {
  const G = FG, ST = MODEL.stations;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadows, and fields on two of the outer bearings, toward the edges
  for (const [m, r, rr, seed, sq] of [[105, 92, 34, 3, 0.8], [225, 96, 36, 5, 0.7], [345, 96, 34, 7, 0.8], [45, 205, 46, 9, 0.7], [165, 215, 40, 11, 0.6], [285, 200, 44, 13, 0.7]]) g(trPatch(K, P, fdBlob(...fdPolar(0, 0, r, m), rr, seed, 0.15, 40, sq)));
  const fields = [];
  for (const [m, rf] of [[105, 236], [225, 200]]) for (const [dm, r, tint] of [[-11, rf, "a"], [11, rf, "b"], [0, rf + 64, "a"]]) {
    const F = fdFrame(...fdPolar(0, 0, r, m + dm), m + dm);
    fields.push([ilBox(F, -22, 22, -26, 26), 8, tint]);
  }
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // the road network: six radial roads from the hub through the towns and on out, and the ring road
  for (const a of ST) g(trRoad(K, P, [fdPolar(0, 0, 0, a), fdPolar(0, 0, G.RT, a), fdPolar(0, 0, 480, a)], 3.2, { smooth: 0 }));
  for (const a of ST) g(trRoad(K, P, ilArc(G.RT, a, a + 60), 3.2, { smooth: 0 }));
  // junction patches (road fill, no outline) over the ribbon ends where the roads meet: a hexagon at the
  // hub whose corners are where neighbouring road edges cross, and a square at each town
  const patch = (ring) => `<path style="fill:var(--tr-road);stroke:none" d="${K.onTop(ring, 0.17, P, true)}"/>`;
  const hx = 3.2 / Math.sin(30 * IL_RAD);
  g(patch(ST.map((a) => fdPolar(0, 0, hx, a + 30))));
  for (const a of ST) { const F = fdFrame(...ilTown(a), a); g(patch(ilBox(F, -3.2, 3.2, -3.2, 3.2))); }

  // woods between the roads, kept clear of roads, towns, the hub and the fields
  const nearRoad = (x, y, d) => {
    const r = Math.hypot(x, y), th = Math.atan2(y, x) / IL_RAD;
    if (Math.abs(r - G.RT) < d) return true;
    return ST.some((a) => { const dd = wrap(th - a); return Math.abs(dd) < 90 && r * Math.abs(Math.sin(dd * IL_RAD)) < d; });
  };
  const nearTown = (x, y, d) => Math.hypot(x, y) < 40 + d || ST.some((a) => { const [tx, ty] = ilTown(a); return Math.hypot(x - tx, y - ty) < d; });
  const inField = (x, y) => fields.some(([ring]) => { const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]); return x > Math.min(...xs) - 5 && x < Math.max(...xs) + 5 && y > Math.min(...ys) - 5 && y < Math.max(...ys) + 5; });
  const clear = (x, y) => nearRoad(x, y, 15) || nearTown(x, y, 28) || inField(x, y);
  const woods = [[105, 100, 30, 16], [225, 100, 30, 16], [345, 100, 30, 16], [45, 88, 36, 10], [165, 88, 38, 11], [285, 88, 36, 10],
    [165, 236, 52, 34], [345, 236, 52, 34], [45, 262, 52, 26], [285, 300, 44, 22], [225, 310, 50, 20], [165, 330, 50, 20], [345, 330, 50, 20]]
    .map(([m, r, rr, nn], i) => [fdBlob(...fdPolar(0, 0, r, m), rr, 21 + i, 0.12, 40, 0.8), nn, 21 + i]);
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 6.4, r: [3, 4.6], h: [8, 12.5], avoid: (x, y) => clear(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // hedgerows along the inner and one outer side of each field
  fields.forEach(([ring], i) => items.push(...trHedge(K, P, i % 3 === 2 ? [ring[1], ring[2]] : [ring[3], ring[0], ring[1]], { seed: 51 + i })));

  // the hub town between its six roads, and three houses at each town on the ring
  ST.forEach((a, i) => {
    const m = a + 30;
    if (m !== 105 && m !== 225) { const [x, y] = fdPolar(0, 0, i % 2 ? 31 : 27, m); items.push(i % 2 ? trHouse(K, P, x, y, m, 9, 6.5) : trHouse(K, P, x, y, m + 90, 10, 7)); }
    const [tx, ty] = ilTown(a), F = fdFrame(tx, ty, a);
    for (const [u, v, len, wid, turn] of [[15, -13, 9, 6.5, 0], [15, 13, 10, 7, 90], [-21, 15, 8.5, 6, 0]]) {
      const [hx, hy] = F(u, v);
      items.push(trHouse(K, P, hx, hy, a + turn, len, wid));
    }
  });

  g(trRelief(K, P, T));
  return { ground: ground.join(""), items };
}

// ---------- the clash at the called town ----------
// M.race = { t, h, r }: seconds into the race, and each side's arrival time. Returns who holds the
// town (f, h or level), the losses, how far into contact the race is and the rim's direction.
function ilClash(S, M) {
  const R = M.race;
  if (!R) return null;
  const ls = losses(R.h, R.r);
  const first = ls.first === "hub" ? "f" : ls.first === "rim" ? "h" : "level";
  const tC = Math.max(R.h, R.r);
  const held = R.t >= Math.min(R.h, R.r);
  return { ...ls, side: first, held, tC, since: R.t - tC, a: MODEL.stations[S.call] };
}
// Holder slots at a town in its radial frame (u out from the hub, v round the ring): blue faces the
// side red comes from; red faces in toward the hub, as do red battalions resting at any town.
const IL_HOLD_F = [[2, -10], [-8, -4], [-12, 10]];
const IL_HOLD_H = [[-4, 0], [5, -8], [5, 8]];

export function fieldPose(S, GEO, T, M = {}) {
  const G = FG, ST = MODEL.stations;
  const units = [];
  const add = (u) => { u.z = T.height(u.x, u.y); units.push(u); };
  const C = ilClash(S, M);
  const dir = M.dir ?? 1;
  const ko = (side, j) => {
    if (!C || C.since < 0) return false;
    const n = side === "f" ? C.blue : C.red;
    const order = (side === "f" ? C.side === "f" : C.side === "h") ? [2] : [1, 2];
    const k = order.indexOf(j);
    return k >= 0 && k < n && C.since >= G.KO[Math.min(k, 1)];
  };

  // --- the blue battalion on interior lines (lit): hub, radial road, the called town ---
  const rho = (S.r / MODEL.spoke) * G.STOP;
  const psi = S.psi;
  const a = C ? C.a : psi;
  const blueHalts = C && C.side !== "f";                       // red holds or level: blue halts short
  const rhoD = blueHalts && Math.abs(wrap(psi - a)) < 1e-3 ? Math.min(rho, G.RT - G.HALT) : rho;
  const Fhub = fdFrame(0, 0, psi);
  const hubSlots = [[7, 0], [-3, -8], [-3, 8]];
  const Ft = fdFrame(...ilTown(a), a);
  const holdF = (j) => { const [u, v] = IL_HOLD_F[j]; return Ft(u, v * dir); };
  const lineF = (j) => Ft(-G.HALT + (j ? -5 : 0), j === 0 ? 0 : j === 1 ? -11 : 11);
  const blueAtTown = C && Math.abs(wrap(psi - a)) < 1e-3;
  const depHold = blueAtTown && C.side === "f" ? ilSmooth(G.STOP - 18, G.STOP, rho) : 0;
  const depLine = blueAtTown && blueHalts ? ilSmooth(G.RT - G.HALT - 16, G.RT - G.HALT, rho) : 0;
  const blueAway = blueAtTown ? 1 - ilSmooth(G.RT - G.HALT - 46, G.RT - G.HALT - 20, rho) : 1;
  for (let j = 0; j < 3; j++) {
    const out = ko("f", j);
    let x, y, face;
    if (out) {
      [x, y] = C.side === "f" ? holdF(j) : lineF(j);
      face = C.side === "f" ? a - dir * 90 : a;
    } else {
      const sj = Math.max(0, rhoD - j * G.GAP);
      const road = fdPolar(0, 0, sj, psi);
      const w = ilSmooth(0, 1, (rhoD - j * G.GAP * 0.5) / G.GAP);
      [x, y] = ilLerp2(Fhub(...hubSlots[j]), road, w);
      face = psi;
      if (depHold > 0) { [x, y] = ilLerp2([x, y], holdF(j), depHold); face = ilAngLerp(face, a - dir * 90, depHold); }
      if (depLine > 0) { [x, y] = ilLerp2([x, y], lineF(j), depLine); }
    }
    add({ id: `b${j}`, kind: "v", side: "f", lit: !out, out, face, x, y, j });
  }
  // the brigade's command post and supply trucks at the hub
  [[105, 20, 195], [112, 32, 22], [225, 22, 315]].forEach(([b, r, face], i) => { const [x, y] = fdPolar(0, 0, r, b); add({ id: `q${i}`, kind: i === 2 ? "v" : "t", side: "f", face, x, y }); });

  // --- the red battalions on exterior lines: on the ring road, together, as the belt turns ---
  const n = S.n;
  const lugs = Array.from({ length: n }, (_, k) => S.phi + (k * 360) / n);
  let ck = -1;
  if (C) { let best = 1e9; lugs.forEach((th, k) => { const d = Math.abs(wrap(a - th)); if (d < best) { best = d; ck = k; } }); }
  const rc = M.rc ?? 0;                                         // 1 while the belt moves: march column
  const halt = ilDeg(G.HALT);
  lugs.forEach((th0, k) => {
    const contest = k === ck;
    let th = th0;
    let dLine = 0;
    if (contest && C.side !== "h") {                             // blue holds or level: red halts short
      const d = wrap(a - th0);
      if (Math.abs(d) < halt + 1e-6) {
        const relax = blueAway;
        const dd = (d === 0 ? dir : Math.sign(d)) * halt;
        th = a - (dd + (d - dd) * relax);
        dLine = 1 - relax;
      } else dLine = ilSmooth(halt + ilDeg(16), halt, Math.abs(d));
    }
    const sgn = contest && C.side !== "h" ? Math.sign(wrap(a - th)) || dir : dir;
    const Fl = fdFrame(...ilTown(th), th + 180);
    const lineFace = th + sgn * 90;
    const Fline = fdFrame(...ilTown(th), lineFace);
    for (let j = 0; j < 3; j++) {
      const id = `r${k}${j}`;
      const out = contest && ko("h", j);
      const colTh = th - dir * j * ilDeg(G.GAP);
      const col = ilTown(colTh);
      const rest = Fl(...IL_HOLD_H[j]);
      let [x, y] = ilLerp2(rest, col, rc);
      let face = ilAngLerp(th + 180, colTh + dir * 90, rc);
      if (dLine > 0) {
        const ln = Fline(j ? -5 : 0, j === 0 ? 0 : j === 1 ? -11 : 11);
        [x, y] = ilLerp2([x, y], ln, dLine);
        face = ilAngLerp(face, lineFace, dLine);
      }
      if (out) {
        if (C.side === "h") { [x, y] = fdFrame(...ilTown(a), a + 180)(...IL_HOLD_H[j]); face = a + 180; }
        else { const s0 = Math.sign(wrap(a - th0)) || dir, ah = a - s0 * halt; face = ah + s0 * 90; [x, y] = fdFrame(...ilTown(ah), face)(j ? -5 : 0, j === 1 ? -11 : 11); }
      }
      add({ id, kind: "v", side: "h", face, x, y, out, contest, k, j });
    }
  });

  // --- casualty evacuation: a truck runs from the called town back to the hub once blue has losses ---
  const blueOut = units.filter((u) => u.side === "f" && u.out);
  if (blueOut.length) {
    const ph = ((((M.t ?? 0) / G.CASEVAC) % 1) + 1) % 1;
    const u = ph < 0.5 ? ph / 0.5 : 1 - (ph - 0.5) / 0.5, kk = u * u * (3 - 2 * u);
    const r0 = 30, r1 = (C.side === "f" ? G.RT : G.RT - G.HALT) - 16;
    const p = fdPolar(0, 0, r0 + (r1 - r0) * kk, a), F = fdFrame(p[0], p[1], a);
    const [x, y] = F(0, ph < 0.5 ? 2.2 : -2.2);
    add({ id: "m0", kind: "m", side: "f", face: a + (ph < 0.5 ? 0 : 180), x, y });
  }

  // --- fire at the called town ---
  const streams = [];
  let holdOn = 0;
  if (C && C.held) {
    const blue = units.filter((u) => u.side === "f" && u.id[0] === "b" && !u.out);
    const red = units.filter((u) => u.side === "h" && u.contest && !u.out);
    const [tx, ty] = ilTown(a);
    const dist = (us) => Math.min(...us.map((u) => Math.hypot(u.x - tx, u.y - ty)), 1e9);
    const near = (d) => ilSmooth(G.RANGE, G.HALT + 8, d);
    const fb = blue.length ? near(dist(blue)) : 0, fr = red.length ? near(dist(red)) : 0;
    const on = Math.min(fb, fr);
    holdOn = on;
    const gunAt = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(4.2, 0), u.z + 3.1]; };
    const aim = (u) => [u.x, u.y, u.z + 1.8];
    if (on > 0.02) {
      blue.forEach((u, i) => streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: red.map(aim), period: 1.5 + i * 0.23, burst: 1, gap: 0, flight: 0.42, phase: i * 0.47, on: on * 0.95, scatter: 3 }));
      red.forEach((u, i) => streams.push({ id: u.id, side: "h", heavy: true, smoke: true, from: gunAt(u), to: blue.map(aim), period: 1.7 + i * 0.21, burst: 1, gap: 0, flight: 0.42, phase: 0.3 + i * 0.41, on: on * 0.9, scatter: 3 }));
    }
  }
  // smoke rising from each knocked-out vehicle
  units.filter((u) => u.out).forEach((u, i) => streams.push({ id: `x${u.id}`, side: u.side, smoke: true, from: [u.x, u.y, u.z + 2.6], to: [[u.x, u.y, u.z + 2.7]], period: 1.1, burst: 1, gap: 0, flight: 0.02, phase: i * 0.37, on: 1, scatter: 0.4 }));
  return { units, streams, C, holdOn, a, dir, call: S.call };
}

// Per-state ground marks: a chalk outline round the called town (the objective) and the holder's fire
// sector, toward where the other side comes from, while the clash is on.
export function fieldMarks(K, P, T, pose) {
  const G = FG, a = MODEL.stations[pose.call ?? 0];
  const [tx, ty] = ilTown(a);
  const ring = [];
  for (let i = 0; i < 40; i++) ring.push(fdPolar(tx, ty, 24, (i / 40) * 360));
  let out = trChalk(K, P, T, ring, { closed: true, pegs: false }).ground;
  const C = pose.C;
  if (C && C.held && C.side !== "level") {
    const toward = C.side === "f" ? a - pose.dir * 90 + pose.dir * 12 : a + 180;
    const alpha = 0.8 * ilSmooth(0, 0.3, pose.holdOn + (C.since < 0 ? 0.3 : 0)) * (pose.holdOn > 0.02 || C.since < 0 ? 1 : 0);
    out += trFan(K, P, T, tx, ty, 10, G.RANGE - 10, toward - 26, toward + 26, { side: C.side, arcs: 2, alpha });
  }
  return out;
}
