// The Battlefield view of Shaping, Decisive and Sustaining, at brigade scale, drawn with the terrain
// kit (../../kit/terrain.mjs). Each small vehicle stands for a platoon (or a gun section, or a supply
// section), each group of three for a company. The same switches as the machine drive it:
//   on.shape   shaping: a battery of self-propelled guns shells the enemy's positions on the objective
//              and two scout vehicles on a rise watch it and call the fire; stopped, the guns fall
//              silent and the scouts pull back behind the rise
//   on.decide  decisive: the lit mechanized battalion attacks from its attack position, across a line
//              of departure, onto the objective; stopped, it stays in its attack position
//   on.feed    sustaining: supply trucks run from the brigade's support area to the guns and to the
//              rear of the attack; stopped, they halt on the road, and the guns and the attack run
//              short of ammunition and fuel
// How far the attack gets and the losses come from model.mjs (attackReach, lossesAt), never from here.
// M carries what the page measures between frames: t (fire clock), p (the attack's eased progress,
// 0 at the attack position, 1 on the objective), b (how far the current replay has run), lossOn (the
// switches the shown losses belong to), sh and sup (shaping and supply eased 0..1), lap (the trucks'
// shuttle phase, frozen while sustaining is stopped). Defaults serve the build's first frame.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trObjective, trRoute, trPrism } from "../../kit/terrain.mjs";
import { attackReach, losses, lossesAt } from "./model.mjs";

export const FG = {
  world: { x: -470, y: -420, w: 940, d: 840 },
  AP: [-86, 22],                 // the attack position (centre of the battalion's assembly)
  END: [126, 4],                 // where the battalion's centre stands on the objective
  OBJ: [136, 2],                 // the objective's hill (centre)
  LD_X: -44,                     // the line of departure
  BSA: [-204, 44],               // the brigade support area
  GUNS: [[-178, -48], [-164, -55], [-150, -62], [-136, -69]], // the battery's four guns
  OP: [[16, -104], [28, -114]],  // the scouts on the rise (observation post)
  HIDE: [[-26, -124], [-16, -136]], // where the scouts pull back to, behind the rise
  PITS: [[106, -30], [102, -8], [104, 14], [112, 34], [122, -18], [120, 4], [130, 22], [140, -8], [144, 14]],
  RETREAT: [190, -54],             // where the enemy's survivors fall back to
  DEEP: [[188, -40], [194, -12], [186, 18]], // deep targets the guns shift to once the attack is on the objective
  MSR: [[-470, 62], [-320, 52], [-204, 38], [-140, 34], [-86, 30], [-40, 20], [20, 12], [80, 6], [136, 0], [220, -8], [470, -22]],
  GUN_RD: [[-172, 36], [-172, 6], [-170, -18], [-162, -34]],
  TRUCK_LAP: 9,                  // seconds per truck round trip
  REPLAY_BACK: 1.1,              // (page) progress per second when the battalion drives back to replay
};
FG.TERRAIN = {
  rises: [
    { cx: 128, cy: 2, r: 56, steps: 2, h: 1.6, top: 0.78, seed: 9, wobble: 0.06, squash: 1.1 },  // the objective
    { cx: 24, cy: -112, r: 28, steps: 3, h: 1.7, top: 0.42, seed: 17, wobble: 0.1 },             // the scouts' rise
    { cx: -170, cy: 170, r: 40, steps: 3, h: 1.7, top: 0.45, seed: 23, wobble: 0.12 },
    { cx: 40, cy: 170, r: 34, steps: 2, h: 1.6, top: 0.5, seed: 29, wobble: 0.12, squash: 1.2 },
    { cx: 250, cy: -150, r: 36, steps: 3, h: 1.6, top: 0.45, seed: 31, wobble: 0.1 },
  ],
};

const SDS_RAD = Math.PI / 180;
const sdsClamp = (x) => Math.min(1, Math.max(0, x));
const sdsSmooth = (a, b, x) => { const t = sdsClamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const sdsEase = (t) => { const x = sdsClamp(t); return x * x * (3 - 2 * x); };
const sdsLerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const sdsAng = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const sdsBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
const sdsToward = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / SDS_RAD;

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- routes and the battalion's formation (shared by build and page; built once) ----------
let SDS_R = null;
function sdsRoutes() {
  if (SDS_R) return SDS_R;
  const msr = trRoute(FG.MSR, 6), gun = trRoute(FG.GUN_RD, 4);
  const near = (x) => { let bs = 0, bd = 1e9; for (let s = 0; s <= msr.length; s += 1) { const d = Math.abs(msr.at(s).x - x); if (d < bd) { bd = d; bs = s; } } return bs; };
  SDS_R = { msr, gun, sBsa: near(FG.BSA[0] + 22), sAp: near(FG.AP[0] - 26) };
  return SDS_R;
}
// The battalion: two companies forward, one back; each company three vehicles in a wedge. Offsets
// in the battalion's frame (u forward, v left). w (0..1) closes the companies in on the objective.
function sdsFormation(w) {
  const out = [];
  const half = 30 - 10 * w;
  [[0, half], [0, -half], [-30 + 8 * w, 0]].forEach(([u, v], c) => {
    [[0, 0], [-7, 8], [-7, -8]].forEach(([du, dv], i) => out.push({ c, i, off: [u + du + ((c * 3 + i) * 7 % 5) - 2, v + dv] }));
  });
  return out;
}
// The battalion's anchor and each vehicle's place at progress p.
function sdsAttackAt(p) {
  const at = sdsLerp(FG.AP, FG.END, sdsEase(p * 1.02 - 0.01));
  const face = sdsToward(FG.AP, FG.END);
  const F = fdFrame(at[0], at[1], face);
  return sdsFormation(sdsSmooth(0.7, 1, p)).map((m) => ({ ...m, x: F(...m.off)[0], y: F(...m.off)[1], face }));
}

// ---------- local drawing helpers ----------

// A supply truck at the origin facing `face`: cab, cargo box and chassis, about 7 units long, drawn
// inside a <g class="tr-s" data-side> like a vehicle (the same drawing as Fig 9's supply trucks).
export function sdsTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, sdsBox(F, u0, u1, v0, v1), z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(sdsBox(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

// A self-propelled gun at the origin facing `face`: tracked hull, a large turret set toward the rear
// and a long barrel raised for indirect fire. About 10 units long.
export function sdsGun(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [];
  const put = (u, v, z, svg) => parts.push([K.depthOf([...F(u, v), z], P0), svg]);
  for (const s of [-1, 1]) put(0, s * 2.1, 0.6, trPrism(K, P0, sdsBox(F, -4.6, 4.6, s > 0 ? 1.5 : -2.7, s > 0 ? 2.7 : -1.5), 0, 1.25, true));
  put(0, 0, 1.7, trPrism(K, P0, sdsBox(F, -4.7, 4.2, -2.1, 2.1), 0.9, 2.4));
  put(-1.6, 0, 3.4, trPrism(K, P0, sdsBox(F, -4.2, 1.2, -1.9, 1.9), 2.4, 4.4));
  parts.sort((a, b) => a[0] - b[0]);
  const a = K.iso([...F(1.1, 0), 3.7], P0), b = K.iso([...F(7.4, 0), 6.6], P0);
  return `<path class="tr-shadow" d="${K.onTop(sdsBox(F, -5, 5, -3, 3), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("") +
    `<path class="tr-gun" data-heavy="" d="${K.pathOf([a, b])}"/>`;
}
// Where a gun's barrel ends, in world units, for the muzzle flash.
const sdsMuzzle = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(7.4, 0), u.z + 6.6]; };

// A vehicle fighting position: a dark scrape and an earth berm across the front with short side arms,
// as two items keyed either side of the centre so a vehicle keyed at the centre sorts between them.
function sdsScrape(K, P, x, y, z, face) {
  const F = fdFrame(x, y, face);
  const key0 = K.depthOf([x, y, 0], P);
  const pit = `<path class="tr-pit" d="${K.onTop(sdsBox(F, -5.2, 4.6, -3.2, 3.2), z + 0.03, P, true)}"/>`;
  const banks = [[4.8, 6.4, -4.2, 4.2], [-2.6, 4.8, 3.4, 4.6], [-2.6, 4.8, -4.6, -3.4]].map(([u0, u1, v0, v1]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return { near: K.depthOf([c[0], c[1], 0], P) > key0, svg: trPrism(K, P, sdsBox(F, u0, u1, v0, v1), z, z + 1.3) };
  });
  const wrap = (list) => (list.length ? `<g class="tr-p tr-bag">${list.map((b) => b.svg).join("")}</g>` : "");
  return [{ key: key0 - 6, svg: pit + wrap(banks.filter((b) => !b.near)) }, { key: key0 + 6, svg: wrap(banks.filter((b) => b.near)) }];
}

// A stack of supply crates at (x, y): two courses of small boxes.
function sdsCrates(K, P, x, y, face) {
  const F = fdFrame(x, y, face);
  const boxes = [[-3, 0, -2, 0, 0], [0.4, 3.4, -2, 0, 0], [-3, 0, 0.4, 2.4, 0], [0.4, 3.4, 0.4, 2.4, 0], [-1.4, 1.8, -1, 1.4, 2]];
  const svg = boxes.map(([u0, u1, v0, v1, z]) => ({ c: F((u0 + u1) / 2, (v0 + v1) / 2), z, ring: sdsBox(F, u0, u1, v0, v1) }))
    .sort((a, b) => K.depthOf([a.c[0], a.c[1], a.z], P) - K.depthOf([b.c[0], b.c[1], b.z], P))
    .map((b) => trPrism(K, P, b.ring, b.z, b.z + 2, false)).join("");
  return { key: K.depthOf([x, y, 0], P), svg: `<path class="tr-shadow" d="${K.onTop(sdsBox(F, -3.8, 4.2, -2.8, 3.2), 0, P, true)}"/><g class="tr-p tr-bag">${svg}</g>` };
}

export function fieldStatic(K, P, T) {
  const G = FG, R = sdsRoutes();
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadows and fields, toward the edges
  for (const [cx, cy, r, seed, sq] of [[-40, 90, 50, 3, 0.6], [60, -40, 44, 5, 0.6], [-260, -60, 54, 7, 0.8], [220, 90, 50, 9, 0.8], [-140, -20, 34, 11, 0.7]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-330, 100], [-262, 106], [-266, 150], [-336, 142]], 8, "a"],
    [[[-120, 80], [-60, 86], [-64, 124], [-124, 118]], 7, "b"],
    [[[180, 40], [246, 36], [250, 84], [184, 90]], 8, "a"],
    [[[190, -100], [250, -106], [254, -60], [194, -54]], 8, "b"],
    [[[60, -190], [120, -194], [122, -150], [62, -146]], 7, "a"],
    [[[-300, -150], [-236, -154], [-232, -112], [-296, -108]], 8, "b"],
    [[[-250, 120], [-190, 116], [-186, 160], [-246, 166]], 7, "b"],
    [[[-120, 130], [-70, 128], [-66, 160], [-118, 164]], 6, "a"],
    [[[-10, 60], [50, 56], [54, 96], [-6, 100]], 7, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // a stream behind the objective, the main supply route and the track to the gun line
  const streamPts = [];
  for (let y = -440; y <= 440; y += 20) streamPts.push([206 + 10 * Math.sin(y * 0.02 + 0.4) + 5 * Math.sin(y * 0.05), y]);
  g(trStream(K, P, streamPts, 4.2, 7));
  g(trRoad(K, P, G.MSR, 3.4));
  g(trRoad(K, P, G.GUN_RD, 2.4, { ruts: false }));
  g(trRoad(K, P, [[-20, -330], [-6, -220], [0, -150], [-12, -60], [-24, 16], [-36, 120], [-50, 330]], 2.2, { ruts: false }));

  // woods: clear of every unit, route and position
  const keep = [
    ...G.PITS.map(([x, y]) => [x, y, 12]), ...G.GUNS.map(([x, y]) => [x, y, 14]), ...G.OP.map(([x, y]) => [x, y, 12]), ...G.HIDE.map(([x, y]) => [x, y, 12]),
    [G.BSA[0], G.BSA[1], 40], [G.RETREAT[0], G.RETREAT[1], 30], [G.OBJ[0], G.OBJ[1], 64],
  ];
  for (let t = 0; t <= 1.0001; t += 0.05) { const at = sdsLerp(G.AP, G.END, t); keep.push([at[0], at[1], 52]); }
  const nearLine = (line, x, y, d) => line.some((p) => Math.hypot(p[0] - x, p[1] - y) < d);
  const clear = (x, y) => keep.some(([kx, ky, r]) => Math.hypot(kx - x, ky - y) < r) || nearLine(R.msr.line, x, y, 14) || nearLine(R.gun.line, x, y, 12) ||
    Math.abs(x - 206) < 22 || trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  const woods = [
    [fdBlob(-70, -104, 34, 21, 0.12, 40, 0.7), 18, 21],
    [fdBlob(-70, 196, 44, 29, 0.12, 40, 0.7), 20, 29],
    [fdBlob(-230, -60, 36, 30, 0.12, 40, 0.8), 16, 30],
    [fdBlob(70, 110, 34, 22, 0.12, 40, 0.6), 18, 22],
    [fdBlob(-240, -190, 44, 23, 0.12, 40, 0.7), 20, 23],
    [fdBlob(280, 30, 40, 24, 0.12, 40, 0.8), 18, 24],
    [fdBlob(-20, -210, 40, 25, 0.12, 40, 0.6), 16, 25],
    [fdBlob(-330, 10, 40, 26, 0.12, 40, 0.8), 16, 26],
    [fdBlob(180, 170, 38, 27, 0.12, 40, 0.8), 14, 27],
    [fdBlob(150, -150, 34, 28, 0.12, 40, 0.8), 14, 28],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 6.2, r: [2.8, 4.4], h: [8, 12], avoid: clear });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-330, 100], [-262, 106], [-266, 150]], 51], [[[180, 40], [246, 36]], 53], [[[190, -100], [250, -106]], 54], [[[-120, 80], [-60, 86]], 55]]) items.push(...trHedge(K, P, pts, { seed }));

  // the brigade support area: sheds and crate stacks beside the road
  const [bx, by] = G.BSA;
  for (const [dx, dy, a, l, w] of [[-14, 22, 0, 16, 8], [6, 24, 0, 14, 8], [-26, 40, 90, 12, 7], [18, 44, 90, 10, 7]]) items.push(trHouse(K, P, bx + dx, by + dy, a, l, w));
  for (const [dx, dy] of [[-34, 14], [30, 18], [34, 28], [-6, 46]]) items.push(sdsCrates(K, P, bx + dx, by + dy, 0));
  // a farm by the road, a village on the objective's far side
  for (const [x, y, a, l, w] of [[-20, 132, 10, 11, 7], [164, -36, 0, 10, 7], [170, 30, 90, 9, 6.5], [-150, 96, 0, 10, 7], [-138, 112, 90, 9, 6.5]]) items.push(trHouse(K, P, x, y, a, l, w));

  g(trRelief(K, P, T));

  // the enemy's prepared positions on the objective, facing the attack (west)
  for (const [x, y] of G.PITS) items.push(...sdsScrape(K, P, x, y, T.height(x, y), 186));
  // the gun line's positions
  for (const [x, y] of G.GUNS) items.push(...sdsScrape(K, P, x, y, T.height(x, y), 20));

  // control measures: the attack position, the line of departure, the objective flag
  const F = fdFrame(G.AP[0], G.AP[1], sdsToward(G.AP, G.END));
  const ap = trChalk(K, P, T, [F(-50, -44), F(16, -44), F(16, 44), F(-50, 44)], { closed: true });
  const ld = trChalk(K, P, T, [[G.LD_X, -70], [G.LD_X + 2, -30], [G.LD_X + 4, 30], [G.LD_X + 6, 74]]);
  for (const m of [ap, ld]) { g(m.ground); items.push(...m.items); }
  items.push(trObjective(K, P, T, 150, -24, { h: 13, ang: 200 }));
  return { ground: ground.join(""), items };
}

// Where every vehicle stands and who fires at whom, for the switches `on`.
export function fieldPose(on, T, M = {}) {
  const G = FG, R = sdsRoutes();
  const units = [];
  const add = (u) => { u.z = T.height(u.x, u.y); units.push(u); };
  const reach = attackReach(on);
  const b = M.b ?? 0.6;
  const p = M.p ?? reach * sdsEase(b);
  const lossOn = M.lossOn ?? on;
  const lr = attackReach(lossOn);
  const LS = lossesAt(lossOn, b);
  const sh = M.sh ?? (on.shape ? 1 : 0);
  const sup = M.sup ?? (on.feed ? 1 : 0);
  const seized = reach >= 1 ? sdsSmooth(0.8, 1, p) : 0;              // the enemy's survivors fall back

  // --- the decisive attack (lit): a mechanized battalion; knocked-out vehicles stay where they were hit ---
  const KO_A = [1, 5, 7, 2, 4, 8];
  const nA = losses(lossOn).attack;
  const koP = (k) => lr * sdsEase((k - 0.5) / nA);                     // progress at which the k-th loss falls
  const here = sdsAttackAt(p);
  here.forEach((m, j) => {
    const k = KO_A.indexOf(j);
    if (k >= 0 && k < LS.attack) {
      const w = sdsAttackAt(Math.min(p, koP(k + 1)))[j];
      add({ id: `a${j}`, kind: "v", side: "fk", face: w.face + (k % 2 ? 26 : -26), x: w.x - 2, y: w.y, ko: true });
      return;
    }
    add({ id: `a${j}`, kind: "v", side: "f", lit: true, face: m.face, x: m.x, y: m.y, lead: m.c < 2 });
  });

  // --- shaping: the gun line and the scouts ---
  G.GUNS.forEach(([x, y], i) => add({ id: `g${i}`, kind: "g", side: "f", face: sdsToward([x, y], G.OBJ) + (i - 1.5) * 2, x, y }));
  G.OP.forEach((op, i) => {
    if (i === 0 && LS.scout > 0) { add({ id: `s${i}`, kind: "v", side: "fk", face: 0, x: op[0], y: op[1], ko: true }); return; }
    const [x, y] = sdsLerp(G.HIDE[i], op, sh);
    const face = sh > 0.98 || sh < 0.02 ? (sh > 0.5 ? sdsToward(op, G.OBJ) : 200) : sdsToward(G.HIDE[i], op) + (M.shDir < 0 ? 180 : 0);
    add({ id: `s${i}`, kind: "v", side: "f", face, x, y });
  });

  // --- sustaining: two trucks parked in the support area, four running to the attack, two to the guns ---
  const [bx, by] = G.BSA;
  add({ id: "p0", kind: "t", side: "f", face: 0, x: bx - 4, y: by + 10 });
  add({ id: "p1", kind: "t", side: "f", face: 0, x: bx + 8, y: by + 10 });
  const lap = M.lap ?? 0;
  const tail = Math.max(...here.map((m) => m.x)) - 70;
  let sTo = R.sAp;
  for (let s = R.sAp; s <= R.msr.length; s += 2) if (R.msr.at(s).x <= Math.max(G.AP[0] - 26, tail)) sTo = s;
  const shuttle = (route, s0, s1, ph) => {
    let s, out;
    if (ph < 0.45) { s = s0 + (ph / 0.45) * (s1 - s0); out = true; }
    else if (ph < 0.5) { s = s1; out = false; }
    else if (ph < 0.95) { s = s1 - ((ph - 0.5) / 0.45) * (s1 - s0); out = false; }
    else { s = s0; out = true; }
    const a = route.at(s), F = fdFrame(a.x, a.y, a.face), [x, y] = F(0, out ? -2.2 : 2.2);
    return { x, y, face: a.face + (out ? 0 : 180) };
  };
  for (let i = 0; i < 4; i++) add({ id: `k${i}`, kind: "t", side: "f", ...shuttle(R.msr, R.sBsa, sTo, (((lap + i / 4) % 1) + 1) % 1) });
  for (let i = 0; i < 2; i++) add({ id: `q${i}`, kind: "t", side: "f", ...shuttle(R.gun, 6, R.gun.length - 10, (((lap * 1.4 + 0.2 + i / 2) % 1) + 1) % 1) });
  // casualty evacuation: an ambulance (white) between the attack position and the support area
  if (LS.blue > 0) add({ id: "m0", kind: "t", side: "m", ...shuttle(R.msr, R.sBsa + 10, R.sAp + 6, (((lap * 1.2 + 0.6) % 1) + 1) % 1) });

  // --- the enemy: a mechanized company dug in on the objective, its survivors falling back once it falls ---
  const KO_E = [3, 0, 6, 1, 4, 7, 2, 5, 8];
  G.PITS.forEach(([x, y], i) => {
    if (KO_E.indexOf(i) < LS.red) { add({ id: `e${i}`, kind: "v", side: "hk", face: 186 + (i % 3) * 22 - 22, x, y, ko: true }); return; }
    const q = sdsSmooth(i * 0.03, 0.7 + i * 0.03, seized);
    const back = [G.RETREAT[0] + ((i * 37) % 7 - 3) * 6, G.RETREAT[1] + ((i * 53) % 9 - 4) * 7];
    const [ux, uy] = sdsLerp([x, y], back, q);
    add({ id: `e${i}`, kind: "v", side: "h", face: q > 0.02 ? sdsToward([x, y], back) : 186, x: ux, y: uy, dug: q < 0.02 });
  });

  // --- fire ---
  const streams = [];
  const by_ = (pre) => units.filter((u) => u.id.startsWith(pre));
  const gunAt = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(4.2, 0), u.z + 3.1]; };
  const aim = (u) => [u.x, u.y, u.z + 1.8];
  const reds = by_("e").filter((u) => u.dug);
  const attackers = by_("a").filter((u) => !u.ko);
  const moving = p > 0.03 && on.decide;
  // the guns: a flash at each muzzle, then rounds falling on the enemy's positions (or, once the attack
  // is on the objective, on the enemy's rear); they fire only while shaping runs and ammunition lasts
  const fires = sh * sup;
  const deep = seized > 0.3 || p > 0.72;
  const tgt = deep ? G.DEEP.map(([x, y]) => [x, y, T.height(x, y)]) : reds.map((u) => [u.x, u.y, u.z + 0.6]);
  by_("g").forEach((u, i) => {
    const m = sdsMuzzle(u), F = fdFrame(u.x, u.y, u.face);
    streams.push({ id: `${u.id}-l`, side: "f", heavy: true, from: m, to: [[...F(13, 0), u.z + 13]], period: 2.8, burst: 1, gap: 0, flight: 0.2, phase: i * 0.7, on: fires, scatter: 0.6 });
  });
  for (let i = 0; i < 4; i++) streams.push({ id: `fall${i}`, side: "f", heavy: true, smoke: true, from: [G.OBJ[0] - 30, G.OBJ[1] - 24, 46], to: tgt, period: 2.8, burst: 2, gap: 0.3, flight: 0.45, phase: i * 0.7 + 1.1, on: fires * (tgt.length ? 1 : 0), scatter: 4 });
  // the attack's lead companies fire on the positions as they close
  const close = moving ? sdsSmooth(0.22, 0.4, p) * (1 - seized) : 0;
  attackers.filter((u) => u.lead).forEach((u, i) => { if (i % 2 === 0) streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: reds.map(aim), period: 2.3 + i * 0.21, burst: 1, gap: 0, flight: 0.5, phase: i * 0.57, on: 0.8 * close * (0.45 + 0.55 * sup), scatter: 3 }); });
  // the enemy fires on the attack once it moves (on the scouts before that); suppression by the guns
  // cuts its rate
  const targets = moving ? attackers : by_("s").filter((u) => !u.ko && sh > 0.9);
  const suppress = fires * (deep ? 0.3 : 1);
  reds.forEach((u, i) => { if (i % 2 === 0) streams.push({ id: u.id, side: "h", heavy: true, from: gunAt(u), to: targets.map(aim), period: 2.6 + i * 0.17, burst: 1, gap: 0, flight: 0.5, phase: 0.3 + i * 0.41, on: (moving ? 0.95 : 0.55) - 0.5 * suppress, scatter: 3 }); });
  return { units, streams: streams.filter((st) => st.to.length), p, b, LS, sh, seized, reach };
}

// Per-state ground marks: the enemy's fire sector toward the attack (gone once it falls back) and the
// scouts' observation sector on the objective (only while they are out).
export function fieldMarks(K, P, T, pose) {
  const G = FG, op = G.OP[1];
  const toward = sdsToward(op, G.OBJ);
  return trFan(K, P, T, 98, 2, 10, 76, 150, 214, { side: "h", arcs: 2, alpha: 0.8 * (1 - pose.seized) }) +
    trFan(K, P, T, op[0], op[1], 14, Math.hypot(G.OBJ[0] - op[0], G.OBJ[1] - op[1]) - 40, toward - 9, toward + 9, { side: "f", arcs: 1, alpha: 0.55 * sdsSmooth(0.9, 1, pose.sh) });
}

// Smoke rising from every stopped vehicle (page only; added to the fire layer's smoke pool).
export function fieldSmoke(pose, t) {
  const out = [];
  pose.units.filter((u) => u.ko).forEach((u, i) => {
    for (let j = 0; j < 2; j++) {
      const age = ((t / 4.2 + i * 0.37 + j / 2) % 1 + 1) % 1;
      out.push({ p: [u.x - 2.2 * age * 4, u.y - 3.4 * age * 4, u.z + 2.5 + age * 9], age });
    }
  });
  return out;
}
