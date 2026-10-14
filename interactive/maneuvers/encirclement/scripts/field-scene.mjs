// The Battlefield view of Encirclement and Pocket: a brigade closing a ring round an enemy
// battalion, drawn with the terrain kit (../../kit/terrain.mjs). The same model state S as the
// machine drives it (S.t is the run clock, S.N the number of companies in the ring):
//   S.p      the two arms' progress: companies come round both sides in columns, each stepping in
//            to its place on the ring as its column reaches it; the lead companies meet behind the
//            enemy (the linkup). The one or two companies in front are the direct pressure force,
//            in contact from the start.
//   S.out    the enemy's breakout at the seam: its lead company drives out along the road behind
//            the pocket; through a gap if the ring is thin, otherwise it is stopped at the ring.
//   S.r      the ring's radius during the squeeze (km); every company closes in.
//   S.down   the model's casualty counts (notional): knocked-out vehicles, greyed, some smoking.
// Each blue company is three vehicles (one per platoon); the enemy battalion is three companies of
// three vehicles and a headquarters. Ground units are the machine's (MODEL.KM per km).
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame, fdPolar } from "../../kit/field.mjs";
import { MODEL, LOSS, companies, timesOf, stateAt } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

const FS_RAD = Math.PI / 180;
const UF = MODEL.KM;

export const FG = {
  world: { x: -330, y: -330, w: 660, d: 660 },
  AZ: 55,                 // field camera azimuth: the front (bottom of the card) is at this bearing
  R0: MODEL.R0 * UF,      // ring radius at linkup (72)
  RF: 46,                 // ring radius after the squeeze (compressed: the model's 0.85 km would crowd the village)
  PATH: 18,               // the arms travel this far outside the ring
  VEH: 7.5,               // spacing of a company's three vehicles
  E_R: 24,                // enemy companies' radius from the pocket centre
  E_OUT: 200,             // where a breakout that gets through drives to
  E_STOP: 60,             // where a stopped breakout's lead vehicle halts
  REAR: 190,              // the friendly rear (casualty evacuation runs there)
  RATE: 0.7,              // the Battlefield view plays the run at this share of the machine's speed
};
FG.SEAM = FG.AZ + 180;
FG.TERRAIN = { rises: [{ cx: 4, cy: -4, r: 30, steps: 2, h: 1.3, top: 0.55, seed: 41, wobble: 0.12, squash: 0.9 }] };

const fsPol = (r, w) => fdPolar(0, 0, r, w);
const fsClamp = (x) => Math.min(1, Math.max(0, x));
const fsSmooth = (x) => { const t = fsClamp(x); return t * t * (3 - 2 * t); };
const jit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; };

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, FG.world));
  const F = fdFrame(0, 0, FG.AZ);           // (u toward the viewer, v across)
  const ring = (pts) => pts.map(([u, v]) => F(u, v));
  // meadows and fields toward the edges, outside the ring
  for (const [u, v, r, seed, sq] of [[150, -150, 46, 3, 0.7], [-160, 140, 44, 5, 0.7], [170, 150, 40, 7, 0.8], [-150, -170, 48, 9, 0.7]]) g(trPatch(K, P, fdBlob(...F(u, v), r, seed, 0.15, 40, sq)));
  const fields = [
    [[[100, -40], [100, -100], [150, -104], [152, -44]], 7, "a"],
    [[[96, 40], [98, 100], [146, 104], [150, 44]], 6, "b"],
    [[[-110, 50], [-112, 110], [-160, 112], [-158, 52]], 6, "a"],
    [[[-112, -40], [-110, -96], [-150, -100], [-156, -44]], 5, "b"],
    [[[-30, 22], [-56, 24], [-54, 50], [-28, 44]], 4, "b"],
    [[[32, -20], [56, -22], [54, -48], [28, -42]], 4, "a"],
    [[[34, 22], [56, 26], [52, 50], [30, 44]], 4, "a"],
  ];
  for (const [r, n, tint] of fields) g(trField(K, P, ring(r), { furrows: n, tint }));
  // the road that runs through the pocket from the friendly rear (front) out behind it (the enemy's
  // line of communication: the way out), and a cross road
  g(trRoad(K, P, ring([[330, 6], [200, 4], [110, 2], [40, 0], [0, 0], [-40, -2], [-110, -6], [-200, -14], [-330, -24]]), 3.2));
  g(trRoad(K, P, ring([[8, 330], [4, 200], [2, 90], [0, 0], [-2, -90], [-6, -200], [-10, -330]]), 2.2, { ruts: false }));

  // woods: in the pocket behind the village, and copses well outside the ring
  const ringBand = (x, y) => { const r = Math.hypot(x, y); return r > FG.RF - 8 && r < FG.R0 + FG.PATH + 16; };
  const road = (x, y) => { const [u, v] = [x * Math.cos(FG.AZ * FS_RAD) + y * Math.sin(FG.AZ * FS_RAD), -x * Math.sin(FG.AZ * FS_RAD) + y * Math.cos(FG.AZ * FS_RAD)]; return Math.abs(v) < 12 || Math.abs(u) < 10; };
  const avoidBase = (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0 || ringBand(x, y) || road(x, y);
  const woods = [
    [fdBlob(...F(-150, -110), 30, 21, 0.14, 40, 0.8), 14, 21],
    [fdBlob(...F(-170, 90), 26, 22, 0.14, 40, 0.9), 10, 22],
    [fdBlob(...F(150, 120), 22, 23, 0.14, 40, 1), 8, 23],
    [fdBlob(...F(130, -150), 24, 24, 0.12, 40, 0.8), 9, 24],
    [fdBlob(...F(-230, 0), 34, 25, 0.12, 40, 0.8), 14, 25],
    [fdBlob(...F(-92, -92), 20, 26, 0.16, 40, 0.8), 9, 26],
    [fdBlob(...F(-96, 88), 18, 27, 0.16, 40, 0.9), 8, 27],
    [fdBlob(...F(92, 96), 16, 28, 0.16, 40, 0.9), 6, 28],
    [fdBlob(...F(100, -86), 17, 29, 0.16, 40, 0.8), 7, 29],
    [fdBlob(...F(-20, -128), 14, 30, 0.14, 40, 0.9), 5, 30],
    [fdBlob(...F(30, 132), 14, 31, 0.14, 40, 0.9), 5, 31],
  ];
  for (const [r, n, seed] of woods) {
    const trees = trScatter(r, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: avoidBase });
    const w = trWood(K, P, T, r, trees);
    g(w.floor);
    items.push(...w.items);
  }
  // the village in the pocket (the enemy headquarters) and hedges along the outer fields
  for (const [u, v, a, l, wd] of [[-14, 12, 0, 10, 7], [-10, -14, 90, 9, 7], [12, 14, 0, 8, 6], [-24, -2, 90, 8, 6]]) { const [x, y] = F(u, v); items.push(trHouse(K, P, x, y, FG.AZ + a, l, wd)); }
  items.push(...trHedge(K, P, ring([[96, -110], [126, -112], [156, -110]]), { seed: 51 }));
  items.push(...trHedge(K, P, ring([[-108, 120], [-136, 122], [-166, 120]]), { seed: 52 }));
  items.push(...trHedge(K, P, ring([[118, -24], [118, -60], [120, -96]]), { seed: 53 }));
  items.push(...trHedge(K, P, ring([[-118, 24], [-118, 62], [-120, 100]]), { seed: 54 }));
  for (const [u, v, a, l, wd] of [[128, 40, 90, 9, 7], [138, 54, 0, 7, 6], [-130, -40, 90, 9, 7]]) { const [x, y] = F(u, v); items.push(trHouse(K, P, x, y, FG.AZ + a, l, wd)); }

  g(trRelief(K, P, T));

  // the contact point where the two arms link up (C-9), a small chalk square on pegs
  const cp = fsPol(FG.R0 + 12, FG.SEAM);
  const ch = trChalk(K, P, T, [[cp[0] - 4, cp[1] - 4], [cp[0] + 4, cp[1] - 4], [cp[0] + 4, cp[1] + 4], [cp[0] - 4, cp[1] + 4]], { closed: true });
  g(ch.ground); items.push(...ch.items);
  return { ground: ground.join(""), items };
}

// One company's centre and facing for a state: travelling round outside the ring in its arm's
// column, stepping in to its place, then closing in with the squeeze.
function companyAt(c, S, N) {
  const cs = companies(N);
  const top = Math.max(...cs.filter((x) => x.arm).map((x) => x.d + x.k * MODEL.spacing));
  const r = FG.R0 + (FG.RF - FG.R0) * (S.sq || 0);
  const home = { x: 0, y: 0, w: FG.SEAM + c.a, r, moving: false, arrive: 1 };
  if (c.front) { [home.x, home.y] = fsPol(r, home.w); home.face = home.w + 180; return home; }
  const f = Math.min(c.d, S.p * top - c.k * MODEL.spacing);          // share of the half circle from the front
  const step = fsSmooth((S.p - c.at) / 0.08 + 1);                      // stepping in over the last stretch
  const rr = FG.R0 + FG.PATH * (1 - step);
  let x, y, face;
  if (f >= 0) {
    const w = FG.SEAM + 180 + c.arm * 180 * f;
    const arrived = step > 0.98;
    [x, y] = fsPol(arrived ? r : rr, w);
    return { x, y, w, r: Math.hypot(x, y), face: arrived ? w + 180 : w + 90 * c.arm, moving: !arrived && S.p > 0, arrive: step };
  }
  // still on the road in from the rear
  const back = -f * Math.PI * (FG.R0 + FG.PATH);
  [x, y] = fsPol(FG.R0 + FG.PATH + back, FG.AZ + c.arm * 4);
  return { x, y, w: FG.AZ, r: Math.hypot(x, y), face: FG.AZ + 180, moving: S.p > 0 && S.p < 1, arrive: 0 };
}

// The enemy's ten vehicles: three companies (0 = the breakout company at the seam) and a headquarters.
const ENEMY = (() => {
  const out = [];
  [0, 120, -120].forEach((da, co) => [-1, 0, 1].forEach((j) => out.push({ id: `e${co}-${j + 1}`, co, j, da })));
  out.push({ id: "ehq", co: 3, j: 0, da: 200 });
  return out;
})();

// Every vehicle, soldier, marker and fire stream for a state. M carries what the page measures
// between frames (unused here beyond defaults; positions are pure functions of the state).
export function fieldPose(S, GEO, T, M = {}) {
  const N = S.N;
  const men = [];
  const Tm = timesOf();
  const add = (m) => { m.z = T.height(m.x, m.y); men.push(m); return m; };
  const thin = S.thin;
  const down = S.down || { blue: 0, red: 0, escaped: 0, surrendered: 0 };
  const done = S.phase === "done";
  const cs = companies(N);

  // --- the ring: N blue companies, three vehicles each ---
  const blue = [];
  const placeCompany = (c, St) => {
    const A = companyAt(c, St, N);
    const line = A.arrive > 0.98 || c.front;
    const spread = FG.VEH * (0.7 + 0.3 * ((A.r - FG.RF) / (FG.R0 - FG.RF)));
    const F = fdFrame(A.x, A.y, line ? A.w + 90 : A.face);
    return [-1, 0, 1].map((j) => {
      const [x, y] = line ? F(j * spread + 0.9 * jit(c.i, j), 1.6 * jit(j, c.i)) : F(-(j + 1) * FG.VEH, 0.8 * jit(c.i, j));
      return { x, y, face: line ? A.w + 180 + 6 * jit(c.i, j + 3) : A.face, moving: A.moving };
    });
  };
  cs.forEach((c) => placeCompany(c, S).forEach((v, j) => blue.push(add({ id: `b${c.i}-${j}`, kind: "v", side: "f", lit: c.i === 0 || c.i === N - 1, pose: "veh", ...v, co: c.i, j }))));

  // blue losses: which vehicles, and when (they stay where they were hit)
  const frontC = cs.find((c) => c.front);
  const lossB = [{ c: frontC.i, j: 0, t: Tm.link }];
  if (thin) lossB.push({ c: 0, j: 1, t: Tm.hit }, { c: N - 1, j: 1, t: Tm.hit }); else lossB.push({ c: 0, j: 1, t: Tm.hit });
  lossB.push({ c: cs.filter((c) => c.arm === -1).slice(-1)[0].i, j: 2, t: Tm.sq0 + MODEL.sq * 0.5 });
  const smoking = [];
  const koAt = [];
  lossB.slice(0, down.blue).forEach((L, k) => {
    const m = blue.find((b) => b.co === L.c && b.j === L.j);
    if (!m) return;
    const v = placeCompany(cs[L.c], stateAt(L.t, N))[L.j];
    Object.assign(m, { x: v.x, y: v.y, face: v.face + 14, moving: false, side: "fc", lit: false });
    m.z = T.height(m.x, m.y);
    if (k < 2) smoking.push(m);
    koAt.push(m);
  });
  // casualty evacuation: an unarmed blue vehicle runs back from the first knocked-out vehicle to the rear
  if (koAt.length) {
    const k0 = koAt[0], u = fsSmooth((S.t - Tm.link - 0.4) / 3.2);
    const [rx, ry] = fsPol(FG.REAR, FG.AZ + 10);
    const sx = k0.x + 6, sy = k0.y + 6;
    add({ id: "medevac", kind: "v", side: "f", pose: "veh", x: sx + (rx - sx) * u, y: sy + (ry - sy) * u, face: Math.atan2(ry - sy, rx - sx) / FS_RAD, moving: u > 0.01 && u < 0.99 });
  }

  // --- the enemy battalion ---
  const fe = 0.78 + 0.22 * (1 - (S.sq || 0));
  const red = [];
  const enemyHome = (e, f) => {
    if (e.co === 3) { const [x, y] = fsPol(4, FG.SEAM + 200); return { x, y, face: FG.AZ }; }
    const w = FG.SEAM + e.da, Fr = fdFrame(...fsPol(FG.E_R * f, w), w);
    const [x, y] = Fr(0, e.j * 8.5 * f);
    return { x, y, face: w + 8 * jit(e.co, e.j) };
  };
  for (const e of ENEMY) {
    let h = enemyHome(e, fe), moving = false;
    if (e.co === 0 && S.out > 0) {
      // the breakout company drives out along the seam bearing in a short column
      const end = thin ? FG.E_OUT : FG.E_STOP;
      const lead = FG.E_R + (end - FG.E_R) * S.out;
      const rr = lead - (e.j + 1) * 8;
      const w = FG.SEAM + 2.5 * (e.j - 1) * (1 - S.out);
      const [x, y] = fsPol(Math.max(FG.E_R * fe, rr), w);
      const back = !thin && S.t > Tm.b + MODEL.hit + MODEL.pause;
      h = { x, y, face: back ? w + 180 : w };
      moving = S.out > 0.01 && S.out < 0.99;
    }
    red.push(add({ id: e.id, kind: "v", side: "h", pose: "veh", ...h, moving, co: e.co, j: e.j }));
  }
  // red losses: one in contact at linkup, the breakout's losses at the seam, the squeeze's
  const byId = new Map(men.map((m) => [m.id, m]));
  const lossR = [{ id: "e1-0", t: Tm.link, at: "home" }];
  if (thin) lossR.push({ id: "e0-2", t: Tm.hit, at: FG.R0 + 2 });
  else lossR.push({ id: "e0-0", t: Tm.hit, at: FG.E_STOP - 8 }, { id: "e0-1", t: Tm.hit, at: FG.E_STOP - 16 });
  const left = 3 - (thin ? 1 : 0);
  const sqIds = thin ? ["e2-0", "e1-2"] : ["e2-0", "e1-2", "e0-2"];
  sqIds.forEach((id, k) => lossR.push({ id, t: Tm.sq0 + (MODEL.sq * (k + 1)) / (left + 1), at: "home" }));
  lossR.slice(0, down.red).forEach((L, k) => {
    const m = byId.get(L.id);
    if (!m) return;
    if (L.at === "home") { const St = stateAt(L.t, N); const e = ENEMY.find((x) => x.id === L.id); Object.assign(m, enemyHome(e, 0.78 + 0.22 * (1 - St.sq))); }
    else { const [x, y] = fsPol(L.at, FG.SEAM + 2.5 * (m.j - 1) * 0.1); m.x = x; m.y = y; m.face = FG.SEAM + 20; }
    m.z = T.height(m.x, m.y);
    m.side = "hc"; m.moving = false;
    if (k === 1 || k === down.red - 1) smoking.push(m);
  });
  // crews beside knocked-out vehicles, prone and still
  for (const m of [...koAt, ...red.filter((r) => r.side === "hc")]) {
    const Fm = fdFrame(m.x, m.y, m.face);
    const [x, y] = Fm(-2, 5);
    add({ id: m.id + "-crew", side: m.side, role: "r", pose: "prone", face: m.face + 70, x, y });
  }
  // surrender: crews of the vehicles still in the pocket stand beside them, and a white flag goes up
  if (done) {
    red.filter((r) => r.side === "h" && Math.hypot(r.x, r.y) < FG.R0).forEach((m, i) => {
      const Fm = fdFrame(m.x, m.y, m.face);
      [[-1, 5], [1.5, 5.5]].forEach(([u, v], j) => { const [x, y] = Fm(u, v); add({ id: m.id + "-s" + j, side: "h", role: "r", pose: "stand", face: m.face + 160 + 20 * j, x, y, stride: 0, surrender: true }); });
    });
  }

  // --- fire ---
  const mz = (m) => (m.kind ? (() => { const F = fdFrame(m.x, m.y, m.face); return [...F(4.2, 0), m.z + 3.15]; })() : trMuzzle(m, m.x, m.y, m.z));
  const aim = (m) => (m.kind ? [m.x, m.y, m.z + 1.8] : trAimPoint(m, m.x, m.y, m.z));
  const streams = [];
  const redUp = red.filter((r) => r.side === "h" && Math.hypot(r.x, r.y) < FG.R0 + 30);
  const blueUp = blue.filter((b) => b.side === "f");
  if (!done) {
    // blue: companies in place fire into the pocket (one vehicle per company, so the fire reads)
    cs.forEach((c) => {
      const A = companyAt(c, S, N);
      if (!(c.front || A.arrive > 0.98)) return;
      const v = blueUp.find((b) => b.co === c.i && b.j === 1) || blueUp.find((b) => b.co === c.i);
      if (!v || !redUp.length) return;
      const near = redUp.slice().sort((a, b) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(b.x - v.x, b.y - v.y)).slice(0, 3);
      const seam = c.i === 0 || c.i === N - 1;
      streams.push({ id: v.id, side: "f", heavy: true, smoke: true, from: mz(v), to: near.map(aim), period: 2.2 + 0.2 * (c.i % 3), burst: 3, gap: 0.09, flight: 0.5, phase: c.i * 0.37, on: (seam && S.out > 0 ? 0.9 : 0.45) + 0.3 * (S.sq || 0), scatter: 3.5 });
    });
    // red: each company fires at the nearest blue company; the breakout fires ahead as it drives out
    redUp.forEach((m, i) => {
      if (m.j !== 0 && !(m.co === 0 && S.out > 0)) return;
      const tg = blueUp.slice().sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y)).slice(0, 2);
      if (!tg.length) return;
      streams.push({ id: m.id, side: "h", heavy: true, from: mz(m), to: tg.map(aim), period: 2.6 + 0.2 * i, burst: 2, gap: 0.1, flight: 0.55, phase: i * 0.61, on: m.co === 0 && S.out > 0 ? 0.85 : 0.4 * (1 - 0.6 * (S.sq || 0)), scatter: 3.5 });
    });
  }
  return { men, streams, smoking, fans: fansOf(S, N), done };
}

// Each company in place has a sector of fire on the ground, about as wide as the frontage it can
// cover (MODEL.S): the gaps between neighbouring sectors are the ring's thin places.
function fansOf(S, N) {
  if (S.phase === "done") return [];
  const out = [];
  for (const c of companies(N)) {
    const A = companyAt(c, S, N);
    if (!(c.front || A.arrive > 0.98)) continue;
    const half = Math.atan((MODEL.S * UF) / 2 / 26) / FS_RAD;
    out.push({ x: A.x, y: A.y, face: A.w + 180, half, lit: c.i === 0 || c.i === N - 1 });
  }
  return out;
}

export function fieldMarks(K, P, T, pose) {
  return pose.fans.map((f) => trFan(K, P, T, f.x, f.y, 5, 26, f.face - f.half, f.face + f.half, { side: "f", arcs: 1, alpha: 0.75 })).join("");
}

// Dust behind moving vehicles and smoke rising from knocked-out ones, as extra smoke puffs.
export function fieldSmoke(pose, t) {
  const out = [];
  for (const m of pose.men) {
    if (m.kind !== "v" || !m.moving) continue;
    const F = fdFrame(m.x, m.y, m.face);
    for (let j = 0; j < 2; j++) {
      const age = (t * 1.3 + j * 0.5 + (m.x + m.y) * 0.01) % 1;
      out.push({ p: [...F(-5 - age * 7, j ? 1.6 : -1.6), m.z + 0.6 + age * 2], age: Math.abs(age) });
    }
  }
  for (const m of pose.smoking) {
    for (let j = 0; j < 4; j++) {
      const age = (t * 0.32 + j * 0.25) % 1;
      out.push({ p: [m.x - 2.2 * age * 6, m.y - 3.4 * age * 6, m.z + 3 + age * 16], age });
    }
  }
  return out;
}

// A white flag on a pole over the enemy headquarters once the pocket surrenders (an item for trStage).
export function flagSvg(K, P1) {
  const P = { ...P1, origin: [0, 0] };
  const pole = K.solidSvg(K.cylinder(0, 0, 0.35, 0, 13, P, 8), { tone: "mid", crease: "none" });
  const cloth = [[0, 0, 13], [0, 0, 10], [4.6, 0.6, 10.4], [4.8, 0.7, 12.8]].map((p) => K.iso(p, P));
  return pole + `<path class="ec-flag" d="${K.pathOf(cloth, true)}"/>`;
}
