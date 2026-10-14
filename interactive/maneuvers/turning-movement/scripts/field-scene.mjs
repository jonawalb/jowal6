// The Battlefield view of the Turning Movement, at operational scale, drawn with the terrain kit
// (../../kit/terrain.mjs). FM 3-90 (2023, para. 2-71) says only divisions and above execute a turning
// movement, so the units here are battalions shown as clusters of vehicles, one vehicle per company.
// The same model state S as the machine drives it:
//   S.s    the turning carriage's distance along the bypass rail: here the turning force's lead along
//          its road round the enemy's southern flank to the crossroads in the enemy's rear
//   S.g    the guard block's angle (0 at the front, G_REAR braced at the lever): here the enemy
//          brigade leaving its positions on the ridge and driving back to block south of the crossroads
//   S.phi  the lever's swing: here the turning force seizing the crossroads and cutting the enemy's
//          supply road (MSR)
//   S.tip  the diversion carriage: here the diversion force rolling onto the ridge the enemy left
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every vehicle and fire stream for a state (build and page); fieldMarks() draws the fire sectors.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame, fdPolar, fdSpline } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trObjective, trRoute, trPrism } from "../../kit/terrain.mjs";
import { MODEL, S_CONTACT, S_END, G_REAR, losses } from "./model.mjs";

export const FG = {
  world: { x: -460, y: -420, w: 920, d: 860 },
  RIDGE: { cx: -4, cy: -30, r: 60, steps: 4, h: 2.2, top: 0.52, seed: 5, wobble: 0.05, squash: 2.1, lean: [-1, 0] },
  BN_Y: [-68, -33, 2],           // enemy battalion centres on the ridge (y)
  PIT_X: 12,                      // and their forward companies' x
  // a battalion: two companies forward, one back (offsets in x, y)
  BN_FORM: [[2, -9], [2, 9], [-9, 0]],
  RIVER: (y) => -192 + 9 * Math.sin(y * 0.018) + 5 * Math.sin(y * 0.041 + 1),
  MSR: [[-470, -22], [-330, -16], [-250, -13], [-192, -12], [-140, -10], [-95, -12], [-58, -16], [-30, -22]],
  CROSS: [-140, -10],             // the crossroads: the turning force's objective
  // the turning force's road: from its assembly area round the south, then north to the crossroads
  ROUTE: [[140, 151], [80, 150], [0, 155], [-78, 150], [-118, 128], [-136, 92], [-140, 56], [-140, 24], [-140, -8]],
  CONTACT: [-140, 70],            // where its lead halts if the enemy gets to the crossroads first
  GAP: 13,                        // vehicle spacing in the march column; plus BN_GAP between battalions
  BN_GAP: 9,
  DIV_X: 96,                      // the diversion force's attack position (x)
  LEAVE: 0.06,                    // stagger of the enemy vehicles leaving their positions (share of the move)
  TRUCK_PERIOD: 18,               // seconds for a supply truck's round trip on the MSR
  // losses (counts from model.mjs losses()): the diversion vehicle hit on its attack position and the
  // enemy vehicle hit in its pit stay put; the evacuation vehicle shuttles from the first to the rear
  KO_DIV: 1, KO_PIT: 8,
  EVAC_TO: [150, 40], EVAC_PERIOD: 16,
};
FG.TERRAIN = {
  rises: [
    FG.RIDGE,
    { cx: 236, cy: 196, r: 26, steps: 2, h: 1.6, top: 0.5, seed: 21, wobble: 0.12, squash: 1.2 },
    { cx: -96, cy: -168, r: 34, steps: 3, h: 1.8, top: 0.45, seed: 31, wobble: 0.12 },
    { cx: 112, cy: -150, r: 28, steps: 3, h: 1.6, top: 0.45, seed: 41, wobble: 0.1 },
    { cx: -290, cy: 110, r: 36, steps: 3, h: 1.8, top: 0.45, seed: 47, wobble: 0.1, squash: 0.8 },
  ],
};

const TM_RAD = Math.PI / 180;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth01 = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const angLerp = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- routes (shared by build and page; built once) ----------
let TM_R = null;
function routes() {
  if (TM_R) return TM_R;
  const G = FG;
  const route = trRoute(G.ROUTE, 6);
  // arc length of the point nearest the contact point
  let Lc = 0, best = 1e9;
  for (let s = 0; s <= route.length; s += 0.5) { const p = route.at(s), d = Math.hypot(p.x - G.CONTACT[0], p.y - G.CONTACT[1]); if (d < best) { best = d; Lc = s; } }
  const msr = trRoute(G.MSR, 6);
  let sBridge = 0, sDump = 0;
  for (let s = 0; s <= msr.length; s += 0.5) { const p = msr.at(s); if (p.x < G.RIVER(p.y)) sBridge = s; if (p.x < -60) sDump = s; }
  // enemy positions: three battalions of three companies on the ridge's forward crest, facing east
  const pits = [];
  G.BN_Y.forEach((by, b) => G.BN_FORM.forEach(([dx, dy]) => pits.push({ b, x: G.PIT_X + dx, y: by + dy })));
  // their blocking line south of the crossroads, facing south toward the turning force
  const slots = [[-168, 26], [-154, 30], [-140, 32], [-126, 30], [-112, 26], [-161, 12], [-147, 15], [-133, 15], [-119, 12]];
  // they leave nearest-the-road first; each drives back off the ridge, west along the MSR, then to its slot
  const exit = [-28, -20];
  const order = pits.map((p, i) => i).sort((a, b) => Math.hypot(pits[a].x - exit[0], pits[a].y - exit[1]) - Math.hypot(pits[b].x - exit[0], pits[b].y - exit[1]));
  const guard = order.map((pi, i) => {
    const p = pits[pi], sl = slots[i];
    return { pit: p, slot: sl, route: trRoute([[p.x, p.y], [p.x - 14, p.y], [-24, (p.y - 20) * 0.5 - 10], [-58, -16], [-95, -12], [-122, -6], [sl[0] + (sl[0] + 140) * 0.3, 2], [sl[0], sl[1] - 6], [sl[0], sl[1]]], 5) };
  });
  // the turning force's deployment round the crossroads once it holds it: one battalion blocks east
  // along the MSR toward the ridge, one faces north, one faces west toward the bridge
  const deploy = [
    [[-108, -22, 0], [-104, -8, 0], [-108, 6, 0]],
    [[-152, -34, 270], [-138, -38, 270], [-124, -34, 270]],
    [[-166, -20, 180], [-168, -4, 180], [-164, 12, 180]],
  ].flat();
  // if it gets there first, the enemy halts short of the crossroads, east of it on the MSR, facing west
  const halt = [[-84, -26], [-82, -12], [-84, 2], [-72, -32], [-70, -18], [-70, -4], [-72, 10], [-60, -24], [-60, -8]];
  // its assembly area east of the start of the road: three battalion clusters
  const assembly = [[134, 104], [134, 120], [144, 112], [158, 86], [158, 102], [168, 94], [164, 122], [164, 138], [174, 130]];
  TM_R = { route, Lc, msr, sBridge, sDump, pits, order, guard, deploy, halt, assembly };
  return TM_R;
}

// Field route distance for the machine's rail distance s: the rail up to contact maps onto the road
// up to the contact point, and the lever's last stretch onto the road from there to the crossroads.
function fieldS(s) {
  const R = routes();
  if (s <= S_CONTACT) return (Math.max(0, s) / S_CONTACT) * R.Lc;
  return R.Lc + ((Math.min(s, S_END) - S_CONTACT) / (S_END - S_CONTACT)) * (R.route.length - R.Lc);
}
// The inverse, for the pointer: the machine's rail distance for a field point near the road.
export function fieldNearest(x, y) {
  const R = routes();
  let bs = 0, bd = 1e9;
  for (let s = 0; s <= R.route.length; s += 1) { const p = R.route.at(s), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; bs = s; } }
  const s = bs <= R.Lc ? (bs / R.Lc) * S_CONTACT : S_CONTACT + ((bs - R.Lc) / (R.route.length - R.Lc)) * (S_END - S_CONTACT);
  return { s, off: bd };
}

// ---------- local drawing helpers ----------
const boxRing = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];

// A supply truck at the origin facing `face`: cab, cargo box and wheels' shadow. About 7 units long.
// Drawn inside a <g class="tr-s" data-side> like a soldier, so it takes the side's tint.
export function trTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],   // cargo box
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],      // cab
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],   // chassis
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const ring = boxRing(F, u0, u1, v0, v1);
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, ring, z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(boxRing(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

// A vehicle fighting position at (x, y) on ground z facing `face`: a dark scrape and an earth berm
// across the front with short side arms. Two items keyed either side of the centre, so a vehicle
// keyed at the centre sorts between the scrape and the front berm.
function scrape(K, P, x, y, z, face) {
  const F = fdFrame(x, y, face);
  const key0 = K.depthOf([x, y, 0], P);
  const pit = `<path class="tr-pit" d="${K.onTop(boxRing(F, -5.2, 4.6, -3.2, 3.2), z + 0.03, P, true)}"/>`;
  const banks = [[4.8, 6.4, -4.2, 4.2], [-2.6, 4.8, 3.4, 4.6], [-2.6, 4.8, -4.6, -3.4]].map(([u0, u1, v0, v1]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return { near: K.depthOf([c[0], c[1], 0], P) > key0, svg: trPrism(K, P, boxRing(F, u0, u1, v0, v1), z, z + 1.3) };
  });
  const wrap = (list) => (list.length ? `<g class="tr-p tr-bag">${list.map((b) => b.svg).join("")}</g>` : "");
  return [
    { key: key0 - 6, svg: pit + wrap(banks.filter((b) => !b.near)) },
    { key: key0 + 6, svg: wrap(banks.filter((b) => b.near)) },
  ];
}

// The bridge where the MSR crosses the river: a deck on two piers with low kerbs.
function bridge(K, P, msr, sBridge) {
  const a = msr.at(sBridge - 9), b = msr.at(sBridge + 9);
  const ang = Math.atan2(b.y - a.y, b.x - a.x) / TM_RAD;
  const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
  const F = fdFrame(mid[0], mid[1], ang);
  const L = Math.hypot(b.x - a.x, b.y - a.y) / 2;
  const svg = [-4, 4].map((u) => K.solidSvg(K.extrude(boxRing(F, u - 0.9, u + 0.9, -3.4, 3.4), 0, 0.9, P), { tone: "lo", crease: "none" })).join("") +
    K.solidSvg(K.extrude(boxRing(F, -L, L, -4, 4), 0.9, 0.7, P), { tone: "mid", className: "tr-wall" }) +
    [-1, 1].map((sv) => K.solidSvg(K.extrude(boxRing(F, -L, L, sv * 4 - 0.35, sv * 4 + 0.35), 1.6, 0.8, P), { tone: "mid", crease: "none", className: "tr-wall" })).join("");
  return { key: K.depthOf([mid[0], mid[1], 0], P), svg };
}

export function fieldStatic(K, P, T) {
  const G = FG, R = routes();
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadows and fields, toward the edges
  for (const [cx, cy, r, seed, sq] of [[60, 40, 60, 3, 0.7], [-60, 205, 70, 5, 0.5], [-250, -100, 60, 7, 0.8], [200, -60, 50, 9, 0.8], [-40, -110, 34, 11, 0.6]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[150, -110], [222, -100], [214, -40], [146, -52]], 9, "a"],
    [[[166, -30], [236, -22], [230, 30], [170, 22]], 8, "b"],
    [[[40, 176], [120, 172], [124, 226], [44, 232]], 9, "b"],
    [[[-60, 176], [24, 178], [22, 236], [-62, 230]], 8, "a"],
    [[[-176, 160], [-104, 168], [-114, 226], [-188, 214]], 8, "b"],
    [[[-300, -70], [-226, -64], [-232, -20], [-306, -28]], 8, "a"],
    [[[-306, 0], [-232, 4], [-236, 56], [-312, 48]], 9, "b"],
    [[[-20, -220], [60, -216], [56, -172], [-24, -176]], 8, "b"],
    [[[160, -210], [228, -200], [220, -160], [156, -170]], 7, "a"],
    [[[-250, -210], [-176, -204], [-182, -150], [-256, -158]], 8, "a"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // the river behind the enemy, the MSR crossing it, the turning force's road, and farm tracks
  const riverPts = [];
  for (let y = -470; y <= 470; y += 20) riverPts.push([G.RIVER(y), y]);
  g(trStream(K, P, riverPts, 5, 5));
  g(trRoad(K, P, G.MSR, 3.4));
  g(trRoad(K, P, [[480, 176], [330, 170], ...G.ROUTE, [-140, -12], [-141, -60], [-150, -140], [-170, -230], [-190, -330], [-200, -460]], 3.1));
  g(trRoad(K, P, [[300, -120], [230, -70], [160, -60], [110, -40], [96, -20], [94, 30], [114, 74], [121, 112], [122, 151]], 2.2, { ruts: false }));
  g(trRoad(K, P, [[-200, 300], [-240, 210], [-250, 120], [-248, 40], [-246, -14]], 2.2, { ruts: false }));

  // woods: the big wood between the ridge and the turning force's road, and copses toward the edges
  const routePts = R.route.line;
  const nearRoute = (x, y, d) => routePts.some((p) => Math.hypot(p[0] - x, p[1] - y) < d);
  const nearMsr = (x, y, d) => R.msr.line.some((p) => Math.hypot(p[0] - x, p[1] - y) < d);
  const clear = (x, y) => nearRoute(x, y, 15) || nearMsr(x, y, 14) || Math.abs(x - G.RIVER(y)) < 12;
  const woods = [
    [fdBlob(-34, 104, 70, 21, 0.1, 48, 0.36), 70, 21],
    [fdBlob(78, 104, 34, 22, 0.12, 40, 0.5), 22, 22],
    [fdBlob(-10, -196, 60, 23, 0.12, 40, 0.5), 40, 23],
    [fdBlob(-240, 160, 40, 24, 0.12, 40, 0.8), 26, 24],
    [fdBlob(-300, -150, 44, 25, 0.12, 40, 0.7), 26, 25],
    [fdBlob(260, -150, 40, 26, 0.12, 40, 0.8), 22, 26],
    [fdBlob(300, 40, 34, 27, 0.12, 40, 0.9), 16, 27],
    [fdBlob(-200, -260, 50, 28, 0.12, 40, 0.6), 22, 28],
    [fdBlob(-130, 215, 26, 29, 0.12, 40, 0.8), 10, 29],
    [fdBlob(150, 250, 30, 30, 0.12, 40, 0.8), 12, 30],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 6.4, r: [3, 4.6], h: [8, 12.5], avoid: (x, y) => clear(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // hedgerows along some fields
  for (const [pts, seed] of [
    [[[146, -52], [150, -110], [222, -100]], 51], [[[170, 22], [166, -30]], 52], [[[44, 232], [40, 176], [120, 172]], 53],
    [[[-62, 230], [-60, 176]], 54], [[[-226, -64], [-300, -70]], 55], [[[-176, 160], [-104, 168]], 56],
  ]) items.push(...trHedge(K, P, pts, { seed }));

  // the village at the crossroads, a hamlet over the bridge, farms in the east
  items.push(
    trHouse(K, P, -152, -58, 0, 11, 7), trHouse(K, P, -126, -62, 90, 10, 7), trHouse(K, P, -110, -50, 0, 9, 6.5),
    trHouse(K, P, -222, -30, 0, 10, 7), trHouse(K, P, -230, 4, 90, 10, 7),
    trHouse(K, P, 204, 64, 10, 12, 8), trHouse(K, P, 220, 46, 100, 9, 6.5), trHouse(K, P, 128, -78, 0, 11, 7),
  );
  items.push(bridge(K, P, R.msr, R.sBridge));

  // the relief, drawn over the flat cover
  g(trRelief(K, P, T));

  // the enemy's prepared positions on the ridge
  for (const p of R.pits) items.push(...scrape(K, P, p.x, p.y, T.height(p.x, p.y), 0));

  // control measures: a phase line across the turning force's road, the objective flag
  const pl = trChalk(K, P, T, [[36, 126], [38, 141], [40, 168], [42, 186]]);
  g(pl.ground); items.push(...pl.items);
  items.push(trObjective(K, P, T, -131, -1, { h: 13, ang: 210 }));

  return { ground: ground.join(""), items };
}

// Where every vehicle stands and who fires at whom, for a model state. M carries what the page
// measures between frames: t (seconds, for the supply trucks), gdir (the enemy's direction of travel,
// -1 when it returns to the ridge) and cut (the MSR cut, eased). Defaults serve the build's first frame.
export function fieldPose(S, GEO, T, M = { t: 0, gdir: 1, cut: 0 }) {
  const G = FG, R = routes();
  const units = [];
  const add = (u) => { u.z = T.height(u.x, u.y); units.push(u); };

  // --- the enemy brigade: in its positions, or driving back to block the crossroads ---
  const gq = clamp01(S.g / G_REAR);
  const n = R.guard.length;
  const span = 1 + (n - 1) * G.LEAVE;
  const back = (M.gdir ?? 1) < 0;
  const aHold = clamp01(S.phi / MODEL.phiMax);
  const LS = losses(S.s, S.g, S.phi);
  R.guard.forEach((v, i) => {
    const q = i === G.KO_PIT ? 0 : smooth01(0, 1, gq * span - i * G.LEAVE);   // the vehicle hit in its pit stays there
    const L = v.route.length, p = v.route.at(q * L);
    let face = p.face + (back && q > 0.02 && q < 0.98 ? 180 : 0);
    if (q < 0.04) face = angLerp(0, face, q / 0.04);
    if (q > 0.96) face = angLerp(face, 90, (q - 0.96) / 0.04);
    let [x, y] = [p.x, p.y];
    const h = aHold * smooth01(0.1, 0.6, q);                       // the crossroads is held: halt short of it
    if (h > 0) { [x, y] = lerp2([x, y], R.halt[i], h); face = angLerp(face, 180, h); }
    add({ id: `e${i}`, kind: "v", side: "h", face, x, y, q, inPit: q < 0.01, blocking: q > 0.99 && h < 0.01, halted: h > 0.6 });
  });
  // shares of the vehicles still able to move (the one hit in its pit does not count)
  const inPit = units.filter((u) => u.inPit && u.id !== `e${G.KO_PIT}`).length / (n - 1);
  const blocking = units.filter((u) => u.blocking).length / (n - 1);

  // --- the turning force (main effort, lit): a brigade of three battalions in march column ---
  const sf = fieldS(S.s);
  const a = clamp01(S.phi / MODEL.phiMax);                      // 0 on the road, 1 holding the crossroads
  const lead = R.route.at(sf);
  const engaged = smooth01(0.85, 1, blocking) * smooth01(R.Lc - 6, R.Lc, sf) * (1 - a);
  for (let j = 0; j < 9; j++) {
    const sj = sf - j * G.GAP - Math.floor(j / 3) * G.BN_GAP;
    let x, y, face;
    if (sj >= 0) { const p = R.route.at(sj); x = p.x; y = p.y; face = p.face; }
    else {
      const st = R.route.at(0), w = smooth01(-34, 0, sj);
      [x, y] = lerp2(R.assembly[j], [st.x, st.y], w);
      face = angLerp(180, st.face, w);
    }
    if (j < 3 && engaged > 0) {                                  // the lead battalion deploys in line facing the block
      const F = fdFrame(lead.x, lead.y, 270);
      const [lx, ly] = F(-2 - (j === 1 ? 0 : 4), (j - 1) * 13);
      [x, y] = lerp2([x, y], [lx, ly], engaged);
      face = angLerp(face, 270, engaged);
    }
    if (a > 0) {                                                 // deploy round the crossroads
      const d = R.deploy[j];
      [x, y] = lerp2([x, y], [d[0], d[1]], a);
      face = angLerp(face, d[2], smooth01(0.3, 1, a));
    }
    add({ id: `t${j}`, kind: "v", side: "f", lit: true, face, x, y, j });
  }

  // --- the diversion force: two battalions attacking the ridge's front; they roll onto it as the enemy leaves ---
  const dv = clamp01((GEO.DIV_FRONT - S.tip) / (GEO.DIV_FRONT - GEO.DIV_KEEPER));
  const divStart = [[G.DIV_X, -60], [G.DIV_X, -42], [G.DIV_X + 10, -51], [G.DIV_X, -10], [G.DIV_X, 8], [G.DIV_X + 10, -1]];
  for (let i = 0; i < 6; i++) {
    const pit = R.guard[i].pit;
    const ko = i === G.KO_DIV;                                     // hit on its attack position: it stays there
    const [x, y] = lerp2(divStart[i], [pit.x + 2, pit.y], ko ? 0 : smooth01(0, 1, dv));
    add({ id: `d${i}`, kind: "v", side: ko ? "kf" : "f", face: ko ? 200 : 180, x, y, ko });
  }
  // --- the reserve, positioned to support the turning force; the security force screening its flank ---
  [[196, 96], [208, 104], [196, 112]].forEach(([x, y], i) => add({ id: `r${i}`, kind: "v", side: "f", face: 180, x, y }));
  [[46, 70, 250], [-96, 62, 230]].forEach(([x, y, face], i) => add({ id: `s${i}`, kind: "v", side: "f", face, x, y }));

  // --- enemy supply trucks shuttling on the MSR; when the crossroads falls they halt west of the bridge ---
  const cut = M.cut ?? (a > 0.4 ? 1 : 0);
  const Lt = R.sDump;
  for (let i = 0; i < 3; i++) {
    const ph = ((((M.t ?? 0) / G.TRUCK_PERIOD) + i / 3) % 1 + 1) % 1;
    const out = ph < 0.5;
    const s = out ? (ph / 0.5) * Lt : (1 - (ph - 0.5) / 0.5) * Lt;
    const p = R.msr.at(s), F = fdFrame(p.x, p.y, p.face);
    const lane = F(0, out ? -2.2 : 2.2);
    const q = R.msr.at(R.sBridge - 22 - i * 12), Fq = fdFrame(q.x, q.y, q.face), lq = Fq(0, -2.2);
    const [x, y] = lerp2(lane, lq, cut);
    const face = cut > 0.5 ? q.face : p.face + (out ? 0 : 180);
    add({ id: `k${i}`, kind: "t", side: "h", face, x, y });
  }

  // --- losses (notional; the model's counts): knocked-out vehicles stop, grey and smoke. Red: the one
  // hit in its pit, then any blocking south of the crossroads, then those halted short of it (or, if the
  // enemy stayed, more on the ridge). Blue: the diversion vehicle, then the turning force's lead battalion. ---
  const ko = (u) => { u.side = u.side === "h" ? "kh" : "kf"; u.lit = false; u.ko = true; u.face += 14 * ((u.id.charCodeAt(1) % 3) - 1); };
  const eU = units.filter((u) => u.id[0] === "e");
  ko(eU[G.KO_PIT]);
  const redPick = [...eU.filter((u) => u.blocking), ...eU.filter((u) => u.halted), ...eU.filter((u) => u.inPit && !u.ko)].filter((u) => !u.ko);
  redPick.slice(0, LS.red - 1).forEach(ko);
  const tU = units.filter((u) => u.id[0] === "t");
  [tU[1], tU[0], tU[2]].slice(0, LS.blue - 1).forEach(ko);
  { // casualty evacuation: an ambulance shuttles from the hit diversion vehicle back to the rear
    const from = units.find((u) => u.id === `d${G.KO_DIV}`);
    const ph = ((((M.t ?? 0) / G.EVAC_PERIOD) % 1) + 1) % 1, out = ph < 0.5;
    const k = smooth01(0, 1, out ? ph / 0.5 : 1 - (ph - 0.5) / 0.5);
    const [x0, y0] = [G.EVAC_TO[0], G.EVAC_TO[1]], [x1, y1] = [from.x + 9, from.y + 5];
    const face = Math.atan2(y1 - y0, x1 - x0) / TM_RAD + (out ? 0 : 180);
    add({ id: "m0", kind: "t", side: "f", face, x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k });
  }

  // --- fire ---
  const streams = [];
  const by = (p) => units.filter((u) => u.id.startsWith(p) && !u.ko);
  const gunAt = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(4.2, 0), u.z + 3.1]; };
  const aim = (u) => [u.x, u.y, u.z + 1.8];
  const enemyPit = by("e").filter((u) => u.inPit), enemyBlock = by("e").filter((u) => u.blocking), enemyHalt = by("e").filter((u) => u.halted);
  // the diversion's attack on the ridge, and the enemy's fire back from its positions
  by("d").forEach((u, i) => { if (u.x > G.PIT_X + 30) streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: enemyPit.map(aim), period: 2.4 + i * 0.21, burst: 1, gap: 0, flight: 0.55, phase: i * 0.53, on: 0.85 * inPit, scatter: 3 }); });
  enemyPit.forEach((u, i) => { if (i % 2 === 0) streams.push({ id: u.id, side: "h", heavy: true, from: gunAt(u), to: by("d").filter((d) => d.x > G.PIT_X + 30).map(aim), period: 2.9 + i * 0.17, burst: 1, gap: 0, flight: 0.55, phase: 0.3 + i * 0.41, on: 0.8, scatter: 3 }); });
  // the fight south of the crossroads if the enemy blocks in time
  if (engaged > 0.05) {
    by("t").filter((u) => u.j < 3).forEach((u, i) => streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: enemyBlock.map(aim), period: 2.1 + i * 0.3, burst: 1, gap: 0, flight: 0.45, phase: i * 0.6, on: engaged, scatter: 3 }));
    enemyBlock.slice(0, 5).forEach((u, i) => streams.push({ id: u.id, side: "h", heavy: true, from: gunAt(u), to: by("t").filter((t) => t.j < 3).map(aim), period: 2.5 + i * 0.23, burst: 1, gap: 0, flight: 0.45, phase: 0.4 + i * 0.37, on: 0.85 * engaged, scatter: 3 }));
  }
  // the enemy halted east of the crossroads and the turning force's battalion blocking the MSR there
  if (enemyHalt.length && a > 0.5) {
    const east = by("t").filter((u) => u.j < 3);
    east.forEach((u, i) => streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: enemyHalt.map(aim), period: 2.2 + i * 0.3, burst: 1, gap: 0, flight: 0.4, phase: i * 0.7, on: a, scatter: 3 }));
    enemyHalt.slice(0, 4).forEach((u, i) => streams.push({ id: u.id, side: "h", heavy: true, from: gunAt(u), to: east.map(aim), period: 2.6 + i * 0.25, burst: 1, gap: 0, flight: 0.4, phase: 0.5 + i * 0.4, on: 0.8 * a, scatter: 3 }));
  }
  return { units, streams, gq, inPit, blocking, a, dv, cut, engaged, LS };
}

// Per-state ground marks: the enemy's fire sector off the ridge (fading as it leaves), its sector from
// the blocking line, and the turning force's sector east along the MSR once it holds the crossroads.
export function fieldMarks(K, P, T, pose) {
  const G = FG;
  return trFan(K, P, T, G.PIT_X + 6, -33, 48, 82, -28, 28, { side: "h", arcs: 2, alpha: 0.8 * pose.inPit }) +
    trFan(K, P, T, -140, 30, 8, 46, 62, 118, { side: "h", arcs: 1, alpha: 0.8 * pose.blocking }) +
    trFan(K, P, T, -108, -10, 8, 54, -22, 22, { side: "f", arcs: 1, alpha: 0.7 * smooth01(0.5, 1, pose.a) });
}

// Smoke rising from every knocked-out vehicle (page only; added to the fire layer's smoke pool).
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
