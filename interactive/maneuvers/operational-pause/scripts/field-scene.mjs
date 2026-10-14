// The Battlefield view of Operational Pause, at operational scale, drawn with the terrain kit
// (../../kit/terrain.mjs). Each small vehicle stands for a platoon, each group of three for a
// company and each cluster of nine for a battalion. The same model state S as the machine drives it:
//   S.units[i].running  battalion i (A far, B near, like rams A and B) is attacking the enemy line
//   S.units[i].fuel     what it has left; when it can't pay for another attack it pulls back to its
//                       fuel and ammo point (FAP) and refuels there: its pause
//   S.enemy             the enemy battalion's combat power (the dial): its vehicles out of action are
//                       9 x (1 - S.enemy); while no battalion attacks, recovery teams and replacement
//                       vehicles come forward and the enemy reconstitutes
//   M.pump              the shared pump: one supply column whose trucks shuttle from the depot to
//                       whichever FAP is refuelling, faster as the pump rate rises
// M also carries what the page measures between frames (eased pull-back of each battalion, its
// speed, the supply trucks' trip memory, replacement progress). Defaults serve the build's first frame.
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every vehicle and fire stream for a state (build and page); fieldMarks() draws the enemy's fire
// sector. build.mjs inlines this file with `import` and `export` lines stripped, after model.mjs,
// scene.mjs, field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trVehicle, trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trObjective, trRoute, trPrism } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -330, y: -280, w: 680, d: 560 },
  DEPOT: [-170, 0],                      // the supporting depot on the supply road
  JUNCTION: [-96, 0],                   // where the supply road splits to the two FAPs
  FAP: [[-46, -76], [-46, 74]],          // fuel and ammo point centres, A (far) and B (near)
  ATTACK: [[40, -74], [40, 70]],         // each battalion's attack position, in contact
  ENEMY_X: 110,                          // the enemy battalion's line
  ENEMY_Y: [-66, 0, 64],                 // its three company positions
  ENEMY_REAR: [214, 6],                  // where its replacements and supply trucks come from
  OBJ: [156, -22],                       // the objective flag in the village
  CONTACT: 0.3,                          // a battalion pulled back past this share is out of contact
  TRIP: 2.4,                             // supply-truck round trip, in seconds x pump (tank/s): 5.3 s at 0.45
  REPLACE: 1.6,                          // seconds for an enemy replacement to drive up to the line
};
FG.TERRAIN = {
  rises: [
    { cx: -176, cy: -150, r: 38, steps: 3, h: 1.8, top: 0.45, seed: 7, wobble: 0.1, squash: 1.4 },
    { cx: -170, cy: 160, r: 34, steps: 3, h: 1.8, top: 0.45, seed: 13, wobble: 0.12 },
    { cx: 214, cy: -158, r: 32, steps: 2, h: 1.6, top: 0.5, seed: 21, wobble: 0.12 },
    { cx: 236, cy: 150, r: 30, steps: 3, h: 1.6, top: 0.45, seed: 31, wobble: 0.1, squash: 1.3 },
    { cx: -2, cy: -176, r: 30, steps: 2, h: 1.8, top: 0.5, seed: 41, wobble: 0.12, squash: 1.6 },
  ],
};

const OPF_RAD = Math.PI / 180;
const opfClamp01 = (x) => Math.min(1, Math.max(0, x));
const opfSmooth = (a, b, x) => { const t = opfClamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const opfLerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const opfAngLerp = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const opfBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
const opfHash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// Each battalion's nine vehicles: the attack line (three companies abreast, the middle one a little
// ahead, uneven) and the parked rows at the FAP; dj staggers when each vehicle moves.
const OPF_LINE = [];
const OPF_PARK = [];
for (let c = 0; c < 3; c++) for (let p = 0; p < 3; p++) {
  const j = c * 3 + p;
  OPF_LINE.push([(c === 1 ? 4 : -2) + (opfHash(j, 1) - 0.5) * 5 - (p === 1 ? 0 : 2.5), (c - 1) * 25 + (p - 1) * 8 + (opfHash(j, 2) - 0.5) * 2.4]);
  OPF_PARK.push([(1 - c) * 11 + (opfHash(j, 3) - 0.5) * 1.6, (p - 1) * 8.5]);
}
const OPF_DJ = OPF_LINE.map((_, j) => 0.06 + 0.24 * opfHash(j, 4));
// Which friendly vehicles are knocked out first (one per battalion in turn), and which enemy ones.
const OPF_BLUE_ORDER = [[0, 4], [1, 1], [0, 7], [1, 5], [0, 2], [1, 8]];
const OPF_RED_ORDER = [1, 4, 7, 3, 6, 0, 2, 8, 5];
const opfEnemySlot = (s) => [FG.ENEMY_X + (s % 3 === 1 ? -3 : 1) + (opfHash(s, 9) - 0.5) * 4, FG.ENEMY_Y[Math.floor(s / 3)] + ((s % 3) - 1) * 10];

// ---------- roads (built once) ----------
let OPF_R = null;
function opfRoads() {
  if (OPF_R) return OPF_R;
  const G = FG;
  const msr = [[-360, 6], [-260, 3], G.DEPOT, [-132, -2], G.JUNCTION];
  // a north-south road crosses the supply road at the junction and runs past the back of each FAP
  const branch = (i) => { const s = i ? 1 : -1, f = G.FAP[i]; return [G.JUNCTION, [-89, s * 30], [f[0] - 40, f[1]]]; };
  const cross = [[-104, -340], [-92, -160], [FG.FAP[0][0] - 40, FG.FAP[0][1]], [-89, -30], G.JUNCTION, [-89, 30], [FG.FAP[1][0] - 40, FG.FAP[1][1]], [-92, 160], [-104, 340]];
  const to = [0, 1].map((i) => trRoute([...msr.slice(2), ...branch(i).slice(1)], 6));
  const enemy = [[G.ENEMY_X + 4, 2], [140, 4], [176, 8], G.ENEMY_REAR, [300, 10], [380, 14]];
  OPF_R = { msr, branch, cross, crossLine: trRoute(cross, 6).line, to, enemy, enemyRoute: trRoute([[G.ENEMY_X + 10, 3], [140, 4], [176, 8], G.ENEMY_REAR], 6) };
  return OPF_R;
}

// A supply truck at the origin facing `face`: cab, cargo box (or a fuel tank), chassis. About 8
// units long; drawn inside a <g class="tr-s" data-side> so it takes the side's tint.
export function opfTruck(K, P, face = 0, tanker = false) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const cargo = tanker ? [-3.6, 1.3, -1.05, 1.05, 0.8, 2.7] : [-3.6, 1.4, -1.35, 1.35, 0.7, 3.4];
  const parts = [
    [cargo, false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, opfBox(F, u0, u1, v0, v1), z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(opfBox(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

// A vehicle fighting position: a dark scrape and an earth berm across the front with short arms,
// as two items keyed either side of the centre so the occupant sorts between them.
function opfScrape(K, P, x, y, z, face) {
  const F = fdFrame(x, y, face);
  const key0 = K.depthOf([x, y, 0], P);
  const pit = `<path class="tr-pit" d="${K.onTop(opfBox(F, -5.2, 4.6, -3.2, 3.2), z + 0.03, P, true)}"/>`;
  const banks = [[4.8, 6.4, -4.2, 4.2], [-2.6, 4.8, 3.4, 4.6], [-2.6, 4.8, -4.6, -3.4]].map(([u0, u1, v0, v1]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return { near: K.depthOf([c[0], c[1], 0], P) > key0, svg: trPrism(K, P, opfBox(F, u0, u1, v0, v1), z, z + 1.3) };
  });
  const wrap = (list) => (list.length ? `<g class="tr-p tr-bag">${list.map((b) => b.svg).join("")}</g>` : "");
  return [{ key: key0 - 6, svg: pit + wrap(banks.filter((b) => !b.near)) }, { key: key0 + 6, svg: wrap(banks.filter((b) => b.near)) }];
}

// A supply stack: pallets under a tarp, two or three tiers, one item.
function opfStack(K, P, x, y, ang, w, d, tiers) {
  const F = fdFrame(x, y, ang);
  let svg = "";
  for (let i = 0; i < tiers; i++) { const s = i * 0.6; svg += trPrism(K, P, opfBox(F, -w + s, w - s, -d + s, d - s), i * 1.3, (i + 1) * 1.3); }
  return { key: K.depthOf([x, y, 0], P), svg: `<g class="tr-p tr-bag">${svg}</g>` };
}

export function fieldStatic(K, P, T) {
  const G = FG, R = opfRoads();
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadows and fields toward the edges
  for (const [cx, cy, r, seed, sq] of [[-10, 0, 60, 3, 0.7], [170, -90, 50, 5, 0.8], [-250, 70, 60, 7, 0.8], [90, 170, 60, 11, 0.5], [-120, -210, 60, 13, 0.5]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-270, 30], [-210, 34], [-214, 86], [-276, 80]], 8, "a"],
    [[[-300, -80], [-236, -72], [-240, -26], [-306, -32]], 8, "b"],
    [[[-120, 170], [-50, 176], [-56, 230], [-126, 222]], 8, "b"],
    [[[20, 150], [90, 156], [86, 210], [16, 206]], 9, "a"],
    [[[-110, -230], [-40, -226], [-44, -180], [-114, -186]], 8, "a"],
    [[[80, -230], [150, -226], [146, -180], [76, -184]], 8, "b"],
    [[[250, -60], [320, -54], [316, -6], [246, -12]], 9, "a"],
    [[[250, 30], [320, 36], [314, 86], [246, 80]], 8, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // the supply road from the depot, the road past the back of both FAPs, the enemy's road back
  // from the village, a farm lane
  g(trRoad(K, P, R.msr, 3.4));
  g(trRoad(K, P, R.cross, 2.8));
  g(trRoad(K, P, R.enemy, 3));
  g(trRoad(K, P, [[150, -340], [156, -120], [162, -40], [164, 40], [170, 140], [182, 340]], 2.4, { ruts: false }));

  // woods and copses, clear of the roads and the battalions' lanes
  const near = (pts, x, y, d) => pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < d);
  const lines = [R.crossLine, R.enemyRoute.line];
  const lane = (x, y) => G.FAP.some((f, i) => x > f[0] - 44 && x < G.ENEMY_X + 22 && Math.abs(y - (f[1] + G.ATTACK[i][1]) / 2) < 46);
  const clear = (x, y) => lines.some((l) => near(l, x, y, 16)) || lane(x, y) || (x > G.ENEMY_X - 10 && x < 200 && Math.abs(y) < 110) || near(R.msr, x, y, 18);
  const woods = [
    [fdBlob(-62, -150, 46, 21, 0.1, 44, 0.6), 26, 21],
    [fdBlob(-60, 150, 40, 22, 0.12, 40, 0.6), 18, 22],
    [fdBlob(-16, 0, 26, 23, 0.12, 40, 0.5), 12, 23],
    [fdBlob(80, -150, 40, 24, 0.12, 40, 0.8), 20, 24],
    [fdBlob(-250, -170, 44, 25, 0.12, 40, 0.8), 20, 25],
    [fdBlob(260, -220, 44, 26, 0.12, 40, 0.8), 18, 26],
    [fdBlob(-270, 200, 44, 27, 0.12, 40, 0.8), 18, 27],
    [fdBlob(300, 200, 40, 28, 0.12, 40, 0.8), 14, 28],
    [fdBlob(210, 80, 30, 29, 0.12, 40, 0.8), 12, 29],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 6.4, r: [3, 4.6], h: [8, 12.5], avoid: (x, y) => clear(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [
    [[[-276, 80], [-270, 30], [-210, 34]], 51], [[[16, 206], [20, 150], [90, 156]], 52], [[[246, -12], [250, -60], [320, -54]], 53],
    [[[-114, -186], [-110, -230]], 54], [[[246, 80], [250, 30]], 55],
  ]) items.push(...trHedge(K, P, pts, { seed }));

  // the depot: sheds either side of the road and supply stacks
  items.push(
    trHouse(K, P, -194, -24, 0, 16, 9, 4.6, 7.4), trHouse(K, P, -168, -28, 0, 14, 9, 4.6, 7.4),
    trHouse(K, P, -192, 24, 0, 16, 9, 4.6, 7.4), trHouse(K, P, -218, 16, 90, 12, 8),
  );
  for (const [x, y, w, d, n] of [[-146, -18, 4, 3, 3], [-136, -24, 3.4, 2.6, 2], [-150, 18, 4.4, 3, 3], [-138, 22, 3.4, 2.8, 2]]) items.push(opfStack(K, P, x, y, 0, w, d, n));
  // the village behind the enemy line, and farms
  items.push(
    trHouse(K, P, 148, -40, 0, 11, 7), trHouse(K, P, 172, -8, 90, 10, 7), trHouse(K, P, 180, 28, 0, 9, 6.5),
    trHouse(K, P, 146, 36, 0, 10, 7), trHouse(K, P, 174, -60, 90, 9, 6.5), trHouse(K, P, 140, 80, 0, 9, 6.5),
    trHouse(K, P, -290, -110, 0, 10, 7), trHouse(K, P, 60, 230, 10, 11, 7), trHouse(K, P, -150, 230, 90, 10, 7),
  );

  g(trRelief(K, P, T));

  // the enemy battalion's vehicle positions, facing west
  for (let s = 0; s < 9; s++) { const [x, y] = opfEnemySlot(s); items.push(...opfScrape(K, P, x, y, T.height(x, y), 180)); }

  // each FAP: staked outline on pegs, ammunition stacks beside the parked rows
  G.FAP.forEach(([cx, cy], i) => {
    const F = fdFrame(cx, cy, 0), sv = i ? 1 : -1;
    const site = trChalk(K, P, T, opfBox(F, -36, 20, -22, 22), { closed: true });
    g(site.ground); items.push(...site.items);
    for (const [u, v, w, d, n] of [[-30, sv * 15, 3.2, 2.4, 3], [-24, sv * 16, 2.8, 2.2, 2]]) { const [x, y] = F(u, v); items.push(opfStack(K, P, x, y, 0, w, d, n)); }
  });
  items.push(trObjective(K, P, T, G.OBJ[0], G.OBJ[1], { h: 13, ang: 200 }));

  return { ground: ground.join(""), items };
}

// Where each battalion wants to be: in contact while it attacks (0), at its FAP while it refuels (1),
// moved up to a ready position halfway while it is full but waiting for its turn (alternating).
export const fieldPullTarget = (u) => (u.running ? 0 : u.fuel < 1 - 1e-6 ? 1 : 0.5);

// Where every vehicle stands and who fires at whom, for a model state.
export function fieldPose(S, GEO, T, M = {}) {
  const G = FG, R = opfRoads();
  const t = M.t ?? 0;
  const pull = M.pull ?? S.units.map(fieldPullTarget);
  const vel = M.vel ?? [0, 0];
  const lossBlue = M.blue ?? 0;
  const units = [];
  const add = (u) => { u.z = T.height(u.x, u.y); units.push(u); };

  // --- the two battalions: attack line <-> FAP rows; wrecks stay where they were hit ---
  const wrecked = new Set(OPF_BLUE_ORDER.slice(0, lossBlue).map(([b, j]) => `${b}:${j}`));
  for (let b = 0; b < 2; b++) {
    const A = G.ATTACK[b], Fp = G.FAP[b];
    const back = opfSmooth(0.02, 0.35, vel[b]), fwd = opfSmooth(0.02, 0.35, -vel[b]);
    for (let j = 0; j < 9; j++) {
      const atk = [A[0] + OPF_LINE[j][0], A[1] + OPF_LINE[j][1]];
      if (wrecked.has(`${b}:${j}`)) { add({ id: `${b}v${j}`, kind: "v", side: "f", out: true, face: 0, x: atk[0], y: atk[1], b }); continue; }
      const park = [Fp[0] + OPF_PARK[j][0], Fp[1] + OPF_PARK[j][1]];
      const d = OPF_DJ[j];
      const q = opfSmooth(d, d + 0.66, pull[b]);
      const [x, y] = opfLerp2(atk, park, q);
      const moving = q > 0.001 && q < 0.999;
      const face = moving ? opfAngLerp(0, 180, back * (1 - fwd)) : 0;
      add({ id: `${b}v${j}`, kind: "v", side: "f", lit: S.units[b].running, face, x, y, b, q });
    }
  }

  // --- tankers at each FAP: they close up on the parked rows while their battalion refuels ---
  for (let b = 0; b < 2; b++) {
    const F = fdFrame(G.FAP[b][0], G.FAP[b][1], 0);
    const u = S.units[b];
    const fill = (!u.running && u.fuel < 1 ? 1 : 0) * opfSmooth(0.85, 1, pull[b]);
    for (let i = 0; i < 2; i++) {
      const [x, y] = F(-26 + 6 * fill, (i - 0.5) * 12);
      add({ id: `t${b}${i}`, kind: "k", side: "f", face: 0, x, y });
    }
  }

  // --- the shared pump: supply trucks shuttling from the depot to whichever FAP is refuelling ---
  const sup = M.sup ?? 0;
  for (let i = 0; i < 3; i++) {
    const ph = sup + i / 3;
    const k = Math.floor(ph), f = ph - k;
    const tgt = M.trip?.[i]?.tgt ?? (i % 2);
    const route = R.to[tgt];
    const out = f < 0.5;
    const s0 = route.length * (out ? opfSmooth(0, 1, f / 0.5) : 1 - opfSmooth(0, 1, (f - 0.5) / 0.5));
    const p = route.at(Math.max(2, Math.min(route.length - 2, s0)));
    const Fp = fdFrame(p.x, p.y, p.face);
    const [x, y] = Fp(0, out ? -3 : 3);
    add({ id: `s${i}`, kind: "t", side: "f", face: p.face + (out ? 0 : 180), x, y, tgt, k });
  }

  // --- casualty evacuation: once a battalion has losses, an ambulance runs from its wrecks to its FAP ---
  for (let b = 0; b < 2; b++) {
    if (!OPF_BLUE_ORDER.slice(0, lossBlue).some(([bb]) => bb === b)) continue;
    const ph = (((t / 9 + b * 0.5) % 1) + 1) % 1;
    const u = ph < 0.5 ? ph / 0.5 : 1 - (ph - 0.5) / 0.5, k = u * u * (3 - 2 * u);
    const a = [G.ATTACK[b][0] - 16, G.ATTACK[b][1] + (b ? 10 : -10)], z = [G.FAP[b][0] + 22, G.FAP[b][1] + (b ? 8 : -8)];
    const [x, y] = opfLerp2(a, z, k);
    add({ id: `m${b}`, kind: "m", side: "f", face: ph < 0.5 ? 180 : 0, x, y });
  }

  // --- the enemy battalion: 9 x (1 - power) vehicles out of action; replacements drive up from the rear ---
  const outN = Math.min(8, Math.round(9 * (1 - S.enemy)));
  const outSet = new Set(OPF_RED_ORDER.slice(0, outN));
  const fillIn = M.fill ?? [];
  const rear = R.enemyRoute;
  for (let s = 0; s < 9; s++) {
    const [sx, sy] = opfEnemySlot(s);
    if (outSet.has(s)) { add({ id: `e${s}`, kind: "v", side: "h", out: true, face: 180, x: sx, y: sy }); continue; }
    const q = fillIn[s] ?? 1;
    if (q >= 0.999) { add({ id: `e${s}`, kind: "v", side: "h", face: 180, x: sx, y: sy }); continue; }
    // driving up the road from the rear, then off it into the position
    const k = opfSmooth(0, 1, q);
    const onRoad = rear.at(rear.length * (1 - Math.min(1, k / 0.8)));
    const [x, y] = k < 0.8 ? [onRoad.x, onRoad.y + 2.2] : opfLerp2([onRoad.x, onRoad.y + 2.2], [sx, sy], (k - 0.8) / 0.2);
    add({ id: `e${s}`, kind: "v", side: "h", face: 180, x, y, coming: true });
  }
  // enemy supply trucks come forward while no friendly battalion attacks, and go back when one does
  const regen = M.regen ?? (S.units.some((u) => u.running) ? 0 : 1);
  for (let i = 0; i < 2; i++) {
    const k = opfSmooth(0, 1, regen);
    const p = rear.at(rear.length * (1 - k * (0.78 - i * 0.16)));
    const Fp = fdFrame(p.x, p.y, p.face);
    const [x, y] = Fp(0, i ? 2.4 : -2.4);
    add({ id: `r${i}`, kind: "t", side: "h", face: p.face + 180, x, y });
  }

  // --- fire: each battalion in contact and the enemy's working vehicles ---
  const streams = [];
  const gunAt = (u) => { const Fu = fdFrame(u.x, u.y, u.face); return [...Fu(4.2, 0), u.z + 3.1]; };
  const aim = (u) => [u.x, u.y, u.z + 1.8];
  const redLive = units.filter((u) => u.side === "h" && u.kind === "v" && !u.out && !u.coming);
  const inContact = (u) => u.kind === "v" && u.side === "f" && !u.out && (u.q ?? 0) < G.CONTACT;
  for (let b = 0; b < 2; b++) {
    const mine = units.filter((u) => u.b === b && inContact(u));
    if (!S.units[b].running || !mine.length) continue;
    const targets = redLive.filter((u) => (b ? u.y > -30 : u.y < 30)).map(aim);
    mine.forEach((u, i) => streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: targets, period: 1.9 + (i % 4) * 0.27, burst: 1, gap: 0, flight: 0.45, phase: i * 0.53 + b * 0.27, on: 0.85, scatter: 3 }));
  }
  const blueIn = units.filter(inContact);
  redLive.forEach((u, i) => {
    const targets = blueIn.filter((v) => Math.abs(v.y - u.y) < 80).map(aim);
    if (targets.length) streams.push({ id: u.id, side: "h", heavy: true, from: gunAt(u), to: targets, period: 2.1 + (i % 3) * 0.23, burst: 1, gap: 0, flight: 0.45, phase: 0.35 + i * 0.41, on: 0.35 + 0.55 * S.enemy, scatter: 3 });
  });
  // a smoke screen fired across the front of a battalion as it breaks contact
  for (let b = 0; b < 2; b++) {
    const on = opfSmooth(0.05, 0.3, vel[b]) * (1 - opfSmooth(0.7, 0.95, pull[b]));
    if (on < 0.02) continue;
    const y0 = G.ATTACK[b][1];
    for (let i = 0; i < 3; i++) {
      const p = [G.ENEMY_X - 36, y0 + (i - 1) * 22, 1.4];
      streams.push({ id: `sm${b}${i}`, side: "f", smoke: true, from: p, to: [p], period: 0.9, burst: 1, gap: 0, flight: 0.02, phase: i * 0.3 + b * 0.13, on, scatter: 9 });
    }
  }
  // smoke rising from each knocked-out vehicle
  units.filter((u) => u.out).forEach((u, i) => streams.push({ id: `x${u.id}`, side: u.side, smoke: true, from: [u.x, u.y, u.z + 2.6], to: [[u.x, u.y, u.z + 2.7]], period: 1.3, burst: 1, gap: 0, flight: 0.02, phase: i * 0.37, on: 1, scatter: 0.4 }));
  return { units, streams, outN };
}

// Per-state ground marks: the enemy's fire sector west from its line (static here).
export function fieldMarks(K, P, T) {
  return trFan(K, P, T, FG.ENEMY_X - 6, 0, 10, 86, 152, 208, { side: "h", arcs: 2, alpha: 0.7 });
}

// One unit's look: a fighting vehicle, a supply truck, a tanker, or the casualty evacuation truck
// (white roof); a knocked-out vehicle is wrapped so the page CSS greys it.
export function opfUnitSvg(K, P, u, face) {
  const body = u.kind === "v" ? trVehicle(K, P, face) : opfTruck(K, P, face, u.kind === "k");
  if (u.out) return `<g class="op-out">${body}</g>`;
  return u.kind === "m" ? `<g class="op-medevac">${body}</g>` : body;
}
