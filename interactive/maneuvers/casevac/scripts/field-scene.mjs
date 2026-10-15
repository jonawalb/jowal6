// The Battlefield view of Casualty Evacuation, drawn with the terrain kit (../../kit/terrain.mjs).
// The same run state as the machine drives it (model.mjs stateAt): S.u the line's position in moves,
// S.cas each casualty's stages, S.carrier the evacuation carrier, S.ammo the platoon's ammunition,
// S.downF / S.downE the men down. Everything is a pure function of S.
// World: x across (the platoon attacks toward +x, toward the enemy on the rise), y toward the viewer. The
// platoon is three squads in a line; the platoon CCP is a chalk rectangle behind the line of departure; the
// company CCP is at the far left; a farm track along the bottom carries the carrier (litter bearers or a
// nonmedical vehicle) between them and forward to the line with ammunition. Sizes and times are notional.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { MODEL, stateAt, clamp, ease } from "./model.mjs";
import { lerp } from "./scene.mjs";
import { trPrism, trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trWood, trScatter, trHedge, trWall, trHouse, trChalk, trHole, trObjective, trSquad, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -300, y: -230, w: 560, d: 420 },
  X0: -40, STEP: 18,               // the line of departure and the spacing of the phase lines: x = X0 + u * STEP
  SQY: [-40, -12, 16],              // each squad's lead-man row
  CCP: [-66, 31],                  // the platoon CCP (chalk rectangle centre)
  CO: [-96, 31],                  // the company CCP
  TRACK_Y: 45,                     // the farm track: the carrier's route
  HOLES: [[55, -13], [59, 0], [55, 13]],
  RISE: [64, 0],
  DOWN_F: [[0, 6], [1, 2], [2, 7], [0, 3], [1, 7], [2, 2], [0, 8], [1, 5]],   // [squad, member] in the order men fall
  DOWN_E: [1, 4, 0, 3, 5, 2],
};
FG.TERRAIN = {
  rises: [
    { cx: FG.RISE[0], cy: FG.RISE[1], r: 28, steps: 3, h: 1.6, top: 0.5, seed: 5, wobble: 0.08 },
    { cx: -10, cy: -120, r: 30, steps: 3, h: 1.5, top: 0.45, seed: 11, wobble: 0.12 },
    { cx: 160, cy: 96, r: 26, steps: 2, h: 1.5, top: 0.5, seed: 17, wobble: 0.1 },
  ],
};

const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const LIN = trSquad("line", "wedge");
const ROLES = LIN.map((m) => m.role);
export const fLineX = (u) => FG.X0 + u * FG.STEP;
const SLOTS = (n) => [FG.CCP[0] - 6 + (n % 4) * 4, FG.CCP[1] - 1.6 + Math.floor(n / 4) * 3.4 - 2];
const COSLOTS = (n) => [FG.CO[0] - 6 + (n % 4) * 4, FG.CO[1] - 1.6 + Math.floor(n / 4) * 3.4 - 2];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// A nonmedical cargo vehicle (not the kit's armoured hull): wheels, an open bed and a cab, at the origin
// facing `face` degrees. Drawn inside a translate like a soldier.
export function cvTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const box = (u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];
  const parts = [];
  const add = (u, v, z, svg) => parts.push([K.depthOf([...F(u, v), z], P0), svg]);
  for (const side of [-1, 1]) for (const u of [-2.8, 2.6]) add(u, side * 2.1, 0.5, trPrism(K, P0, box(u - 1, u + 1, side * 2.1 - 0.5, side * 2.1 + 0.5), 0, 1.7, true));
  add(-0.9, 0, 1.2, trPrism(K, P0, box(-4.7, 1.0, -2, 2), 0.9, 2.2));
  add(3.0, 0, 2.2, trPrism(K, P0, box(1.3, 4.7, -2, 2), 0.9, 3.7));
  parts.sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(box(-4.9, 4.9, -2.9, 2.9), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[-150, -40, 56, 3, 0.6], [150, -20, 50, 5, 0.7], [10, -170, 70, 7, 0.4], [-60, 130, 40, 9, 0.8]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[130, 70], [214, 78], [210, 128], [126, 120]], 9, "a"],
    [[[-216, -84], [-150, -78], [-146, -34], [-212, -40]], 8, "b"],
    [[[-40, 84], [30, 90], [34, 136], [-38, 130]], 7, "a"],
    [[[120, -230], [200, -226], [204, -190], [122, -192]], 8, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  // the farm track the carrier uses: from the company CCP at the left, along the rear of the platoon and on forward
  g(trRoad(K, P, [[-330, 48], [-220, 46], [-96, G.TRACK_Y], [-40, G.TRACK_Y], [40, G.TRACK_Y + 1], [140, 50], [260, 56]], 3.6));
  const keepOpen = (x, y) => (x > -160 && x < 100 && y > -64 && y < 58);
  const woods = [
    [fdBlob(-176, -26, 22, 31, 0.1, 40, 1.2), 12, 21],
    [fdBlob(-30, -104, 62, 32, 0.12, 40, 0.5), 40, 22],
    [fdBlob(120, -92, 34, 33, 0.12, 40, 0.7), 18, 23],
    [fdBlob(150, 28, 20, 35, 0.12, 40, 1), 9, 25],
    [fdBlob(20, 118, 36, 36, 0.12, 40, 0.8), 18, 26],
    [fdBlob(-120, 112, 30, 37, 0.12, 40, 0.9), 12, 27],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => keepOpen(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[130, 70], [214, 78]], 51], [[[-216, -84], [-150, -78]], 52], [[[-40, 84], [30, 90]], 53], [[[-150, 54], [-100, 58]], 54]]) items.push(...trHedge(K, P, pts, { seed }));
  for (const pts of [[[30, 90], [34, 136]], [[126, 120], [210, 128]]]) items.push(...trWall(K, P, pts));
  items.push(trHouse(K, P, 180, 104, 10, 12, 8), trHouse(K, P, -196, 96, 80, 10, 7.5));
  g(trRelief(K, P, T));

  // control measures: the line of departure and three phase lines, the platoon CCP and the company CCP
  const marks = [];
  for (let j = 0; j <= MODEL.B; j++) marks.push(trChalk(K, P, T, [[fLineX(j), -52], [fLineX(j), 38]], { h: 3.0 }));
  const box = (c, w, d) => trChalk(K, P, T, [[c[0] - w / 2, c[1] - d / 2], [c[0] + w / 2, c[1] - d / 2], [c[0] + w / 2, c[1] + d / 2], [c[0] - w / 2, c[1] + d / 2]], { closed: true, pegs: false });
  marks.push(box(G.CCP, 24, 12), box(G.CO, 22, 13));
  for (const m of marks) { g(m.ground); items.push(...m.items); }
  items.push(trObjective(K, P, T, G.RISE[0] + 8, G.RISE[1] - 2, { h: 11, ang: 200 }));
  for (const [x, y] of G.HOLES) items.push(...trHole(K, P, x, y, T.height(x, y), 180));
  return { ground: ground.join(""), items };
}

// Member k of squad j when its lead man is at (x, y): the line formation, faced toward the enemy.
const member = (j, k, x, y) => fdFrame(x, y, 0)(LIN[k].off[0], LIN[k].off[1]);

// the carrier's centre on the ground, from the model's carrier state
function carrierAt(S) {
  const c = S.carrier, G = FG, y = G.TRACK_Y;
  const ccpX = G.CCP[0] + 14, coX = G.CO[0] + 8;
  if (c.mode === "cas") return { x: lerp(ccpX, coX, ease(c.f)), y, face: c.out ? 180 : 0 };
  if (c.mode === "ammoOut") return { x: lerp(ccpX, fLineX(c.bound + 1) - 12, ease(c.f)), y, face: 0 };
  if (c.mode === "ammoBack") return { x: lerp(fLineX(c.bound + 1) - 12, ccpX, ease(c.f)), y, face: 180 };
  if (c.mode === "atLine") return { x: fLineX(MODEL.B) - 12, y, face: 0 };
  return { x: ccpX, y, face: 0 };
}

export function fieldPose(S, T, M = {}) {
  const G = FG;
  const men = [];
  const add = (p) => { p.z = T.height(p.x, p.y); men.push(p); return p; };
  const dt = 0.05;
  const down = new Set();
  G.DOWN_F.slice(0, S.cas.length).forEach(([j, k], n) => down.add(`s${j}-${k}`));
  const uNow = S.u, xNow = fLineX(uNow);
  const Sb = S.cfg && S.released ? stateAt(S.cfg, Math.max(0, S.t - dt), true) : S;
  const moving = S.released && Math.abs(S.u - Sb.u) > 1e-5;

  // --- the platoon: three squads in a line, every man still up ---
  for (let j = 0; j < 3; j++) {
    for (let k = 0; k < 9; k++) {
      const id = `s${j}-${k}`;
      const ci = down.has(id) ? G.DOWN_F.findIndex(([a, b]) => `s${a}-${b}` === id) : -1;
      if (ci >= 0 && S.cas[ci] && S.cas[ci].down) continue;           // a casualty: drawn below
      const [x, y] = member(j, k, xNow, G.SQY[j]);
      const wob = Math.sin((j * 9 + k) * 2.3) * 1.4;
      add({ id, side: "f", role: ROLES[k], pose: moving ? "stand" : "kneel", stride: moving ? strideAt(x * 1.1 + k * 1.3) : 0, face: 0, x: x + (moving ? wob : 0), y });
    }
  }

  // --- the platoon CCP: the platoon sergeant and the combat medic ---
  add({ id: "psg", side: "f", role: "r", pose: "stand", stride: 0, face: 0, x: G.CCP[0] + 8.5, y: G.CCP[1] - 4 });
  add({ id: "med", side: "f", role: "r", pose: "kneel", stride: 0, face: 90, x: G.CCP[0] + 5, y: G.CCP[1] + 4 });
  add({ id: "comed", side: "f", role: "r", pose: "kneel", stride: 0, face: 90, x: G.CO[0] + 8, y: G.CO[1] + 5 });

  // --- each casualty: where he fell, the aid and litter pair that fetches him, the CCP, the carrier, the company CCP ---
  const pairs = [[0, 0], [0, 0]];
  S.cas.forEach((c, n) => {
    if (!c.down) return;
    const [j, k] = G.DOWN_F[n];
    const uFall = stateAt(S.cfg, c.tc, true).u;
    const [fx, fy] = member(j, k, fLineX(uFall), G.SQY[j]);
    const slot = SLOTS(n % 8);
    let pos = [fx, fy], hide = false;
    if (!c.arrived) {
      const f = clamp(c.carryF);
      if (f > 0.5) pos = [lerp(fx, slot[0], ease(f * 2 - 1)), lerp(fy, slot[1], ease(f * 2 - 1))];
    } else if (!c.left) pos = slot;
    else if (!c.evac) {
      if (S.vehicle) hide = true;
      else { const cp = carrierAt(S); pos = [cp.x, cp.y]; }
    } else {
      const cs = COSLOTS(S.cas.filter((y) => y.evac && y.n <= c.n).length - 1);
      pos = cs;
    }
    if (!hide) add({ id: `c${n}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 20 + 40 * ((n * 7) % 3), x: pos[0], y: pos[1] });
    // the pair of aid and litter bearers for this casualty
    if (!c.arrived) {
      const f = clamp(c.carryF);
      const home = [G.CCP[0] + 3 + c.rank * 4, G.CCP[1] - 5];
      const at = f < 0.5 ? [lerp(home[0], fx, ease(f * 2)), lerp(home[1], fy, ease(f * 2))] : [lerp(fx, slot[0], ease(f * 2 - 1)), lerp(fy, slot[1], ease(f * 2 - 1))];
      pairs[c.rank] = at;
    }
  });
  for (let r = 0; r < 2; r++) {
    const pending = S.cas.some((c) => c.down && !c.arrived && c.rank === r);
    const home = [G.CCP[0] + 3 + r * 4, G.CCP[1] - 5];
    const p = pending ? pairs[r] : home;
    const mv = pending;
    for (let b = 0; b < 2; b++) add({ id: `lb${r}${b}`, side: "f", role: "r", pose: mv ? "stand" : "kneel", stride: mv ? strideAt(p[0] * 1.1 + b + r * 3) : 0, face: 0, x: p[0] + b * 2.2, y: p[1] + b * 1.2 });
  }

  // --- the carrier: a nonmedical vehicle, or two litter bearers ---
  {
    const cp = carrierAt(S);
    const mv = S.released && S.carrier.mode !== "idle" && S.carrier.mode !== "atLine" && Math.abs(S.carrier.f) > 0 && S.carrier.f < 1;
    if (S.vehicle) add({ id: "veh", kind: "veh", side: "f", lit: true, role: "r", pose: "stand", stride: 0, face: cp.face, x: cp.x, y: cp.y });
    else {
      for (let b = 0; b < 2; b++) add({ id: `cb${b}`, side: "f", lit: b === 0, role: "r", pose: "stand", stride: mv ? strideAt(cp.x * 1.1 + b) : 0, face: cp.face, x: cp.x + (b ? -3.4 : 3.4), y: cp.y });
    }
  }

  // --- the enemy: three two-man positions on the rise, men go out of action one at a time ---
  const downE = new Set(G.DOWN_E.slice(0, S.downE));
  for (let i = 0; i < 6; i++) {
    const [hx, hy] = G.HOLES[i >> 1];
    const v = i % 2 ? 1.25 : -1.25;
    const x = hx, y = hy - v;
    if (downE.has(i)) add({ id: `e${i}`, side: "hc", role: "r", pose: "prone", stride: 0, face: 150 + ((i * 41) % 60), x: x + 1.4, y });
    else add({ id: `e${i}`, side: "h", role: i === 2 ? "tl" : "r", pose: "hole", stride: 0, face: 180, x, y });
  }

  // --- fire: the platoon's volume follows its ammunition; the enemy's falls as it goes down ---
  const aim = (p) => trAimPoint(p, p.x, p.y, p.z);
  const muzzle = (p) => trMuzzle(p, p.x, p.y, p.z);
  const streams = [];
  if (S.released && S.downE < 6) {
    const enemies = men.filter((p) => p.side === "h").map(aim);
    const friends = men.filter((p) => p.side === "f" && /^s/.test(p.id)).map(aim);
    const fOn = clamp((S.ammo - 0.3) / 0.6) * 0.85;
    men.filter((p) => p.side === "f" && /^s/.test(p.id) && [0, 1, 3, 5, 6, 8].includes(Number(p.id.split("-")[1]))).forEach((p, i) => {
      const heavy = /-(1|6)$/.test(p.id);
      if (enemies.length) streams.push({ id: p.id, side: "f", heavy, from: muzzle(p), to: enemies, flight: 0.5, scatter: 2.4, period: heavy ? 1.9 : 2.7, burst: heavy ? 2 : 1, gap: 0.1, phase: i * 0.37, on: fOn });
    });
    const eOn = 0.5 * (1 - S.downE / 6);
    men.filter((p) => p.side === "h").forEach((p, i) => {
      if (friends.length) streams.push({ id: p.id, side: "h", from: muzzle(p), to: friends, flight: 0.5, scatter: 5, period: 2.3 + (i % 3) * 0.3, burst: i === 2 ? 2 : 1, gap: 0.1, phase: i * 0.5, on: eOn, heavy: i === 2 });
    });
  }
  return { men, streams, u: S.u };
}
