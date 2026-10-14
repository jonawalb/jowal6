// The Battlefield view of Frontal Attack, at platoon scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same model state S as the press drives it:
//   S.r  the attacker:defender ratio (eased). It sets how many blue elements are in the attack
//        (one rifle squad at the low end, up to three rifle squads and two machine-gun teams) and
//        how hard the enemy's fire is suppressed.
//   S.d  the wall's push-back (0..MODEL.push): the enemy line falls back from its forward fighting
//        positions to the alternate positions behind the hedge, and the assault line follows.
//   S.g  the weak block's extra travel (0..MODEL.gap): at the breach the enemy pair in that
//        position runs and the centre squad goes through the gap in squad column.
// Everything is laid out in a frame on the ground: u forward (the direction of the attack, up the
// card), v across the front (to the right on the card). fieldStatic() builds the ground and
// everything that never moves (build only); fieldPose() places every soldier and fire stream for a
// state (build and page); fieldMarks() draws the fire sectors.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { FORCE, casualties } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trNest, trWire, trFan, trChalk, trObjective, trSquad, trMorph, trPlace, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -260, y: -240, w: 540, d: 520 },
  O: [-5, -7],          // the enemy line's centre (world)
  ANG: 235,             // direction of the attack (world degrees): straight up the card
  HOLES: [-75, -45, -15, 15, 45, 75], // fighting positions across the front (v), one per machine block
  MG: 3,                // the machine-gun nest's index
  U_ALT: 30,            // the enemy's alternate positions behind the hedge (u)
  U_HEDGE: 12,          // the hedgerow between the two lines (u)
  U_WIRE: -12,          // the wire belt in front of the forward positions (u)
  U_LD: -84,            // line of departure (u)
  U_PIN: [-72, -58],    // where the assault goes to ground at ratio 0.5 and at 1:1 (u)
  U_CLOSE: -6,          // where the assault line stands when the wall is pushed all the way back (u)
  U_RUN: 44,            // how far past the alternate line the breached pair runs (u)
  U_GAP: 36,            // how far the centre squad goes through the gap at the breach (u)
  U_REAR: -175,         // where elements not yet committed wait (off the card's lower edge)
  SQ_V: [0, 60, -60],   // squad sectors (v): centre first, then right, then left (join at FORCE.squads)
  MG_V: [84, -84],      // machine-gun teams (v), prone behind the stone walls on the line of departure (FORCE.guns)
  // casualties (counts from model.mjs casualties()): who goes down first, and where the blue
  // casualty collection point is (behind the line of departure, a medic kneeling by the first casualty)
  DOWN_F: ["a0-3", "a0-7", "a1-2", "a0-6", "a2-3", "a1-8", "a2-7", "a1-1", "a0-2", "a2-1"],
  DOWN_H: ["e-11", "e-41", "e-01", "e-40", "e-10"],
  CCP: [-96, 18],
  U_MG: -88,
  VIEW: { u: -30, zoom: 1.45 }, // the card frames the ground round this point of the attack axis, zoomed
  S: 5,                 // interval between men in the assault line (units)
};
FG.TERRAIN = {
  rises: [
    { cx: 0, cy: 0, r: 30, steps: 3, h: 1.4, top: 0.45, seed: 61, wobble: 0.12 },
    { cx: 0, cy: 0, r: 26, steps: 3, h: 1.5, top: 0.4, seed: 67, wobble: 0.1 },
    { cx: 0, cy: 0, r: 22, steps: 2, h: 1.4, top: 0.5, seed: 71, wobble: 0.12 },
  ],
};
{
  // the rises sit off to the sides and corners, away from the action; placed in the attack frame
  const F = fdFrame(FG.O[0], FG.O[1], FG.ANG);
  [[64, -150], [-150, 150], [-60, 168]].forEach(([u, v], i) => { const [x, y] = F(u, v); FG.TERRAIN.rises[i].cx = x; FG.TERRAIN.rises[i].cy = y; });
}

const FS_RAD = Math.PI / 180;
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const jit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; }; // uneven spacing
const W = fdFrame(FG.O[0], FG.O[1], FG.ANG);          // (u, v) → world [x, y]
const FACE_F = FG.ANG, FACE_H = FG.ANG + 180;

// Which elements the ratio puts into the attack: 1 if committed, else 0. The page eases these.
export function fieldForce(r) {
  return { sq: FORCE.squads.map((t) => (r >= t - 1e-9 ? 1 : 0)), mg: FORCE.guns.map((t) => (r >= t - 1e-9 ? 1 : 0)) };
}
// An eased value chasing its target at a walking pace (share per second).
export function fieldChase(x, want, dt, rate = 0.45) {
  if (x === undefined) return want;
  const d = want - x;
  return x + Math.sign(d) * Math.min(Math.abs(d), rate * dt);
}

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const ring = (pts) => pts.map(([u, v]) => W(u, v));
  const avoidBase = (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  g(trGroundPlane(K, P, G.world));

  // meadows toward the edges
  for (const [u, v, r, seed, sq] of [[-150, -40, 44, 3, 0.6], [80, 40, 50, 5, 0.6], [-30, 150, 40, 7, 0.7], [-40, -150, 40, 9, 0.7]]) g(trPatch(K, P, fdBlob(...W(u, v), r, seed, 0.15, 40, sq)));
  // the open ground the attack crosses: ploughed fields from the line of departure to the wire
  const fields = [
    [[[-86, -112], [-86, -34], [-26, -30], [-24, -110]], 8, "a"],
    [[[-86, -28], [-86, 48], [-24, 52], [-22, -24]], 9, "b"],
    [[[-86, 54], [-86, 116], [-28, 120], [-26, 58]], 7, "a"],
    [[[-162, -70], [-162, 20], [-118, 22], [-118, -68]], 6, "b"],
    [[[-164, 30], [-164, 110], [-120, 112], [-120, 32]], 6, "a"],
  ];
  for (const [r, n, tint] of fields) g(trField(K, P, ring(r), { furrows: n, tint }));
  // the stream on the left flank, and the farm road behind the line of departure
  g(trStream(K, P, ring([[-260, -112], [-180, -124], [-110, -118], [-40, -128], [20, -122], [70, -134], [140, -128], [220, -140]]), 3.2, 5));
  g(trRoad(K, P, ring([[-110, -240], [-108, -150], [-104, -60], [-106, 30], [-103, 120], [-108, 220], [-110, 300]]), 3));
  g(trRoad(K, P, ring([[-103, 150], [-60, 152], [10, 148], [80, 154], [150, 160]]), 2.2, { ruts: false }));

  // woods: the wood behind the enemy, the wood anchoring its right flank, copses toward the edges
  const corridor = (x, y) => {
    for (const h of G.HOLES) { const [hx, hy] = W(G.U_ALT, h); if (Math.hypot(x - hx, y - hy) < 12) return true; }
    const [ox, oy] = W(G.U_ALT + G.U_RUN * 0.6, G.HOLES[2]);
    return Math.hypot(x - ox, y - oy) < 12;
  };
  const woods = [
    [ring([[46, -110], [50, -40], [44, 30], [50, 110], [140, 120], [150, -120]]), 64, 21, corridor],
    [ring([[-60, 128], [10, 122], [60, 132], [60, 190], [-60, 196]]), 34, 22],
    [fdBlob(...W(-165, 122), 20, 33, 0.14, 40, 0.9), 9, 23],
    [fdBlob(...W(-160, -150), 22, 34, 0.12, 40, 1), 10, 24],
    [fdBlob(...W(110, -160), 26, 35, 0.12, 40, 0.8), 10, 25],
  ];
  for (const [r, n, seed, avoid] of woods) {
    const trees = trScatter(r, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => (avoid ? avoid(x, y) : false) || avoidBase(x, y) });
    const w = trWood(K, P, T, r, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // the hedgerow between the enemy's two lines, with gaps where the positions are linked;
  // stone walls along the line of departure where the machine guns lie; the farm
  const hedge = [];
  for (let i = 0; i <= G.HOLES.length; i++) {
    const v0 = i ? G.HOLES[i - 1] + 6 : -112, v1 = i < G.HOLES.length ? G.HOLES[i] - 6 : 112;
    hedge.push([[G.U_HEDGE, v0], [G.U_HEDGE + (i % 2 ? 1.5 : -1), (v0 + v1) / 2], [G.U_HEDGE, v1]]);
  }
  hedge.forEach((pts, i) => items.push(...trHedge(K, P, ring(pts), { seed: 51 + i })));
  for (const v of G.MG_V) items.push(...trWall(K, P, ring([[G.U_MG + 4.5, v - 14], [G.U_MG + 4.5, v + 14]])));
  items.push(...trWall(K, P, ring([[-136, -128], [-136, -96]])), ...trWall(K, P, ring([[-168, -96], [-136, -96]])));
  { const [x, y] = W(-154, -112); items.push(trHouse(K, P, x, y, FG.ANG + 90, 13, 8.5)); }
  { const [x, y] = W(-126, -140); items.push(trHouse(K, P, x, y, FG.ANG, 10, 7.5)); }

  // the relief, drawn over the flat cover
  g(trRelief(K, P, T));

  // the enemy's forward fighting positions (one a machine-gun nest), the alternate positions
  // behind the hedge, and the wire belt across the whole front
  G.HOLES.forEach((h, i) => {
    const [x, y] = W(0, h);
    items.push(...(i === G.MG ? trNest(K, P, x, y, T.height(x, y), FACE_H) : trHole(K, P, x, y, T.height(x, y), FACE_H)));
    const [ax, ay] = W(G.U_ALT, h);
    items.push(...trHole(K, P, ax, ay, T.height(ax, ay), FACE_H));
  });
  const wire = [];
  for (let v = -100; v <= 100.001; v += 8) wire.push(W(G.U_WIRE + 1.2 * Math.sin(v * 0.11), v));
  items.push(...trWire(K, P, T, wire));

  // control measures: the line of departure on pegs and the objective flag behind the enemy line
  const ld = trChalk(K, P, T, ring([[G.U_LD, -100], [G.U_LD, -34], [G.U_LD, 30], [G.U_LD, 100]]));
  g(ld.ground); items.push(...ld.items);
  { const [x, y] = W(24, 0); items.push(trObjective(K, P, T, x, y, { h: 12, ang: 210 })); }

  return { ground: ground.join(""), items };
}

// Where every soldier stands and who fires at whom, for a model state. M carries what the page
// measures between frames: the eased commitment of each element (sq, mg) and the speeds of the
// assault line (va), the enemy line (ve) and the breach (vb), in units per second. Without M (the
// build's first frame) every element sits where the state puts it and nobody is moving.
export function fieldPose(S, MODEL, T, M = {}) {
  const G = FG;
  const men = [];
  const add = (m) => { const [x, y] = W(m.u, m.v); m.x = x; m.y = y; m.z = T.height(x, y); men.push(m); };
  const force = fieldForce(S.r);
  const sqIn = M.sq || force.sq, mgIn = M.mg || force.mg;
  const e = clamp01(S.d / MODEL.push);                       // how far the enemy line has been pushed back
  const b = clamp01(S.g / MODEL.gap);                        // the breach
  const pinned = smooth01(1.08, 1.0, S.r) * (1 - smooth01(0.0, 0.04, e)); // 1 while the assault is held on the ground
  const supp = clamp01((S.r - 0.5) / 4);                     // how hard the enemy's fire is suppressed

  // --- enemy: a rifle squad and a machine-gun team, forward positions → alternate positions ---
  const ue = G.U_ALT * e;
  const eMoving = Math.abs(M.ve || 0) > 0.4;
  const inHole = e < 0.03 || e > 0.97;
  const roles = [["tl", "r"], ["ar", "gr"], ["tl", "r"], ["mg", "r"], ["ar", "gr"], ["sl", null]];
  G.HOLES.forEach((h, i) => {
    const breach = i === MODEL.weak ? b : 0;
    const runs = breach > 0.02;
    const u = ue + G.U_RUN * breach;
    roles[i].forEach((role, j) => {
      if (!role) return;
      const dv = roles[i][1] ? (j ? -1.1 : 1.1) : 0;
      let pose = "hole", face = FACE_H, stride = 0;
      if (runs || (!inHole)) {
        const moving = runs ? Math.abs(M.vb || 0) > 0.05 || breach < 0.98 : eMoving;
        pose = moving ? "stand" : "prone";
        const back = runs ? (M.vb || 0) < 0 : (M.ve || 0) < 0;
        face = moving && !back ? FACE_F : FACE_H;
        stride = moving ? strideAt(u + i * 3 + j * 1.7) : 0;
      }
      add({ id: `e-${i}${j}`, side: "h", role, pose, face, stride, u: u + (pose === "prone" ? 1.5 : 0), v: h + dv, slot: i, gone: breach > 0.6 });
    });
  });

  // --- the assault: up to three rifle squads in squad line, the platoon leader and his RTO ---
  const uLine = S.r <= 1 ? G.U_PIN[0] + (G.U_PIN[1] - G.U_PIN[0]) * clamp01((S.r - 0.5) / 0.5) : G.U_PIN[1] + (G.U_CLOSE - G.U_PIN[1]) * e;
  const aMoving = Math.abs(M.va || 0) > 0.4;
  const line = trSquad("line", "line", G.S), col = trSquad("column", "wedge", 4.2);
  const squads = [];
  G.SQ_V.forEach((sv, n) => {
    const p = sqIn[n];
    if (p < 0.01) return;
    const coming = p < 0.99;
    const thru = n === 0 ? b : 0;                              // the centre squad goes through the gap
    const u = (uLine + G.U_GAP * thru) * p + G.U_REAR * (1 - p);
    const v = sv - G.S * 1.6 + (G.HOLES[MODEL.weak] + 8 - sv + G.S * 1.6) * smooth01(0, 0.5, thru); // beside the empty position, not on it
    const moving = coming || aMoving || (thru > 0.02 && (Math.abs(M.vb || 0) > 0.05 || thru < 0.98));
    const pose = moving ? "stand" : pinned > 0.5 ? "prone" : "kneel";
    const back = coming ? force.sq[n] < p : thru > 0.02 && thru < 0.98 ? (M.vb || 0) < 0 : (M.va || 0) < -0.4;
    squads.push({ n, pose, moving, v: sv });
    const [x, y] = W(u, v);
    const form = thru > 0.01 ? trMorph(line, col, smooth01(0, 0.4, thru)) : line;
    trPlace(form, { x: 0, y: 0, face: 0 }).forEach((m, i) => add({ id: `a${n}-${i}`, side: "f", lit: true, role: m.role, sq: n, pose,
      stride: moving ? strideAt(u + i * 1.3) : 0, face: moving && back ? FACE_H : FACE_F, u: u + m.x + 2.4 * jit(i, n), v: v + m.y + 1.2 * jit(n, i) }));
  });
  {
    const moving = aMoving;
    const pose = moving ? "stand" : pinned > 0.5 ? "prone" : "kneel";
    const face = moving && (M.va || 0) < 0 ? FACE_H : FACE_F;
    const u = uLine - 14;
    add({ id: "a-pl", side: "f", lit: true, role: "pl", pose, stride: moving ? strideAt(u) : 0, face, u, v: 22 });
    add({ id: "a-rto", side: "f", lit: true, role: "rto", pose, stride: moving ? strideAt(u + 2) : 0, face, u: u - 2.6, v: 25 });
  }

  // --- machine-gun teams (gunner and assistant gunner), prone behind the walls on the line of departure ---
  const mgs = [];
  G.MG_V.forEach((mv, n) => {
    const p = mgIn[n];
    if (p < 0.01) return;
    const u = G.U_MG * p + G.U_REAR * (1 - p);
    const moving = p < 0.99;
    const pose = moving ? "stand" : "prone";
    const toward = Math.atan2(...(() => { const [x0, y0] = W(u, mv), [x1, y1] = W(-10, mv * 0.25); return [y1 - y0, x1 - x0]; })()) / FS_RAD;
    const mf = moving ? (force.mg[n] < p ? FACE_H : FACE_F) : toward;
    add({ id: `m${n}-g`, side: "f", role: "mg", pose, stride: moving ? strideAt(u) : 0, face: mf, u, v: mv });
    add({ id: `m${n}-a`, side: "f", role: "ag", pose, stride: moving ? strideAt(u + 2) : 0, face: mf, u: u - 1.2, v: mv + (mv > 0 ? 2.4 : -2.4) });
    mgs.push({ n, ready: !moving });
  });

  // --- casualties: the model's counts, greyed and still; blue ones lie where the line was hit
  // (never ahead of it), the first at the collection point with a medic; red ones by their positions ---
  const loss = casualties(S.r, MODEL);
  const live = new Map(men.map((m) => [m.id, m]));
  G.DOWN_F.filter((id) => live.has(id) && sqIn[live.get(id).sq] > 0.99).slice(0, loss.blue).forEach((id, k) => {
    const m = live.get(id);
    m.side = "fc"; m.lit = false; m.pose = "prone"; m.stride = 0; m.face = FACE_F + 20 * jit(k, 3);
    if (k === 0) { m.u = G.CCP[0]; m.v = G.CCP[1]; m.face = FACE_F - 90; }
    else m.u = Math.min(m.u, -54 + 9 * (k % 4));
    const [x, y] = W(m.u, m.v); m.x = x; m.y = y; m.z = T.height(x, y);
  });
  if (loss.blue > 0) add({ id: "a-med", side: "f", role: "r", pose: "kneel", face: FACE_F - 90, u: G.CCP[0] + 0.5, v: G.CCP[1] + 4 });
  G.DOWN_H.filter((id) => live.has(id) && !live.get(id).gone).slice(0, loss.red).forEach((id) => {
    const m = live.get(id);
    m.side = "hc"; m.pose = "prone"; m.stride = 0; m.face = FACE_H + 30; m.u = 3.5;
    const [x, y] = W(m.u, m.v); m.x = x; m.y = y; m.z = T.height(x, y);
  });

  // --- fire ---
  const byId = Object.fromEntries(men.map((m) => [m.id, m]));
  const aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z);
  const friends = men.filter((m) => m.side === "f" && m.u > G.U_REAR + 40);
  const enemies = men.filter((m) => m.side === "h" && !m.gone);
  const streams = [];
  // enemy: each position fires at the blue troops in front of it; suppression cuts its rate
  G.HOLES.forEach((h, i) => {
    const shooter = byId[`e-${i}0`];
    if (!shooter || shooter.gone || shooter.side !== "h" || shooter.pose === "stand") return;
    const to = friends.filter((m) => Math.abs(m.v - h) < 55).map(aim);
    const mg = i === G.MG;
    streams.push({ id: shooter.id, side: "h", heavy: mg, from: muzzle(shooter), to, period: mg ? 2.2 : 2.7 + i * 0.29, burst: mg ? 3 : 1, gap: 0.1, flight: 0.42, phase: i * 0.61, on: (mg ? 0.95 : 0.75) - (mg ? 0.55 : 0.5) * supp, scatter: 3 });
  });
  // machine-gun teams: on the enemy positions across the front
  const eTargets = enemies.filter((m) => m.pose !== "stand").map(aim);
  if (!eTargets.length) eTargets.push(...enemies.map(aim));
  for (const m of mgs) if (m.ready) streams.push({ id: `m${m.n}`, side: "f", heavy: true, smoke: true, from: muzzle(byId[`m${m.n}-g`]), to: eTargets, period: 1.7, burst: 3, gap: 0.09, flight: 0.5, phase: m.n * 0.83, on: 1, scatter: 2.4 });
  // the assault: automatic riflemen and team leaders fire while their squad is down (pinned or kneeling)
  for (const sq of squads) {
    if (sq.moving) continue;
    men.filter((x) => x.sq === sq.n && x.side === "f" && (x.role === "ar" || x.role === "tl")).forEach((m, i) => {
      const tgt = enemies.filter((e) => e.pose !== "stand" && Math.abs(e.v - m.v) < 50).map(aim);
      streams.push({ id: m.id, side: "f", heavy: m.role === "ar", from: muzzle(m), to: tgt.length ? tgt : eTargets, period: m.role === "ar" ? 1.9 : 2.7, burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.4, phase: sq.n * 0.9 + i * 0.53, on: sq.pose === "prone" ? 0.55 : 0.85, scatter: 2 });
    });
  }
  return { men, streams, e, b, supp, mgIn, uLine, loss };
}

// Per-state ground marks: the enemy machine gun's sector (red), fading as its fire is suppressed;
// gone while the gun is out of a fighting position.
export function fieldMarks(K, P, T, pose) {
  const mg = pose.men.find((m) => m.id === `e-${FG.MG}0`);
  if (!mg || mg.pose !== "hole") return "";
  return trFan(K, P, T, mg.x, mg.y, 6, 72, FACE_H - 30, FACE_H + 30, { side: "h", arcs: 2, alpha: 0.85 - 0.45 * pose.supp });
}
