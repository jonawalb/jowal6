// The Battlefield view of Operational Reach, at operational scale, drawn with the terrain kit
// (../../kit/terrain.mjs). Each small vehicle stands for a company and each cluster of three for a
// battalion. The same model state S as the machine drives it:
//   S.e     the arm's extension: here how far the brigade has pushed out along its supply road from
//           the home base. The lit lead battalion is the load head (its front at reach tipOf(e)); the
//           second battalion rides at the second stage's centre and the third at the first stage's.
//   S.jack  the roller stand's jack: here a forward logistics node (a convoy of supply trucks) moving
//           up to its planned site on the road and opening; its reach ring grows as it opens.
//   S.th    the arm's tilt: here the lead battalion overreaching the ring its base can support. It
//           disperses and stops firing, and the supply trucks turn back at the edge of the ring.
// The home ring's radius is the model's own: the reach at which the ratio about the knife edge
// reaches 1 (about 141). With the forward base the model holds at every reach in the travel, so the
// forward ring is drawn out past the objective. Both are notional pictures of the bench.
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every vehicle and fire stream for a state (build and page); fieldMarks() draws the rings and the
// enemy's fire sector. build.mjs inlines this file with `import` and `export` lines stripped, after
// model.mjs, scene.mjs, field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trVehicle, trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trObjective, trRoute, trPrism } from "../../kit/terrain.mjs";
import { MODEL, safeExtension, tipOf, losses } from "./model.mjs";

export const FG = {
  world: { x: -470, y: -420, w: 940, d: 840 },
  XB: -130,                       // the home base (knife edge, model x = 0) on the road
  KX: 1.5,                        // world units per bench unit along the road
  MSR: [[-480, 6], [-320, 5], [-200, 2], [-130, 0], [-70, -3], [0, -4], [60, -2], [120, 1], [176, 2], [240, 5], [480, 9]],
  CROSS_ROAD: [[204, -420], [200, -160], [192, -40], [188, 2], [184, 60], [176, 180], [168, 420]],
  RIVER: (y) => -24 + 7 * Math.sin(y * 0.02) + 4 * Math.sin(y * 0.047 + 1),
  ENEMY: [[172, -16], [168, 2], [172, 20]],   // the enemy battalion's three company positions, facing west
  OBJ: [196, -8],                 // the objective flag in the town
  FWD_SITE: { u0: -14, u1: 14, v0: 9, v1: 26 }, // the forward node's outline, south of the road at the post
  GAP: 11,                        // vehicle spacing in a battalion column
  CONTACT: 92,                    // the lead battalion and the enemy exchange fire inside this range
  TRUCK_PERIOD: 12,               // seconds for a supply truck's round trip
};
FG.TERRAIN = {
  rises: [
    { cx: 30, cy: -96, r: 46, steps: 3, h: 2, top: 0.5, seed: 7, wobble: 0.1, squash: 1.9 },
    { cx: -70, cy: 110, r: 36, steps: 3, h: 1.8, top: 0.45, seed: 13, wobble: 0.12, squash: 1.4 },
    { cx: 250, cy: 120, r: 30, steps: 2, h: 1.6, top: 0.5, seed: 21, wobble: 0.12 },
    { cx: -230, cy: -130, r: 34, steps: 3, h: 1.8, top: 0.45, seed: 31, wobble: 0.1 },
    { cx: 110, cy: 150, r: 26, steps: 2, h: 1.6, top: 0.5, seed: 41, wobble: 0.12, squash: 1.3 },
  ],
};

const OR_RAD = Math.PI / 180;
const orClamp01 = (x) => Math.min(1, Math.max(0, x));
const orSmooth = (a, b, x) => { const t = orClamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const orLerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const orAngLerp = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const orBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// The rings, in bench units: the home ring is the model's safe reach on the knife edge; the
// forward ring runs from the post out past the objective.
export const RING_HOME = tipOf(safeExtension());
export const fieldX = (m) => FG.XB + FG.KX * m;
export const RING_FWD = (FG.ENEMY[1][0] + 12 - fieldX(MODEL.post)) / FG.KX;

// ---------- the road (built once): positions by world x ----------
let OR_R = null;
function orRoads() {
  if (OR_R) return OR_R;
  const msr = trRoute(FG.MSR, 6);
  const xs = [];
  for (let s = 0; s <= msr.length; s += 1) xs.push([msr.at(s).x, s]);
  const sAtX = (x) => {
    let lo = 0, hi = xs.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid][0] < x) lo = mid; else hi = mid; }
    const [x0, s0] = xs[lo], [x1, s1] = xs[hi];
    return s0 + (s1 - s0) * orClamp01((x - x0) / (x1 - x0 || 1));
  };
  const post = msr.at(sAtX(fieldX(MODEL.post)));
  OR_R = { msr, sAtX, post, Fpost: fdFrame(post.x, post.y, post.face) };
  return OR_R;
}
// The road point a bench distance m from the home base.
const orAt = (m) => { const R = orRoads(); return R.msr.at(R.sAtX(fieldX(m))); };

// The machine's extension for a field point near the road (the pointer's inverse).
export function fieldNearest(x, y) {
  const R = orRoads();
  const p = R.msr.at(R.sAtX(x));
  return { reach: (x - FG.XB) / FG.KX, off: Math.hypot(p.x - x, p.y - y) };
}

// A supply truck at the origin facing `face`: cab, cargo box, chassis. About 8 units long; drawn
// inside a <g class="tr-s" data-side> like a vehicle, so it takes the side's tint.
export function orTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, orBox(F, u0, u1, v0, v1), z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(orBox(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

// A vehicle fighting position: a dark scrape and an earth berm across the front with short arms,
// as two items keyed either side of the centre so the occupant sorts between them.
function orScrape(K, P, x, y, z, face) {
  const F = fdFrame(x, y, face);
  const key0 = K.depthOf([x, y, 0], P);
  const pit = `<path class="tr-pit" d="${K.onTop(orBox(F, -5.2, 4.6, -3.2, 3.2), z + 0.03, P, true)}"/>`;
  const banks = [[4.8, 6.4, -4.2, 4.2], [-2.6, 4.8, 3.4, 4.6], [-2.6, 4.8, -4.6, -3.4]].map(([u0, u1, v0, v1]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return { near: K.depthOf([c[0], c[1], 0], P) > key0, svg: trPrism(K, P, orBox(F, u0, u1, v0, v1), z, z + 1.3) };
  });
  const wrap = (list) => (list.length ? `<g class="tr-p tr-bag">${list.map((b) => b.svg).join("")}</g>` : "");
  return [{ key: key0 - 6, svg: pit + wrap(banks.filter((b) => !b.near)) }, { key: key0 + 6, svg: wrap(banks.filter((b) => b.near)) }];
}

// A supply stack: pallets under a tarp, two or three tiers, one item.
function orStack(K, P, x, y, ang, w, d, tiers) {
  const F = fdFrame(x, y, ang);
  let svg = "";
  for (let i = 0; i < tiers; i++) { const s = i * 0.6; svg += trPrism(K, P, orBox(F, -w + s, w - s, -d + s, d - s), i * 1.3, (i + 1) * 1.3); }
  return { key: K.depthOf([x, y, 0], P), svg: `<g class="tr-p tr-bag">${svg}</g>` };
}

// The bridge where the road crosses the stream: a deck on two piers with low kerbs.
function orBridge(K, P) {
  const R = orRoads();
  const s0 = R.sAtX(FG.RIVER(0));
  const a = R.msr.at(s0 - 9), b = R.msr.at(s0 + 9);
  const ang = Math.atan2(b.y - a.y, b.x - a.x) / OR_RAD;
  const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
  const F = fdFrame(mid[0], mid[1], ang);
  const L = Math.hypot(b.x - a.x, b.y - a.y) / 2;
  const svg = [-4, 4].map((u) => K.solidSvg(K.extrude(orBox(F, u - 0.9, u + 0.9, -3.4, 3.4), 0, 0.9, P), { tone: "lo", crease: "none" })).join("") +
    K.solidSvg(K.extrude(orBox(F, -L, L, -4, 4), 0.9, 0.7, P), { tone: "mid", className: "tr-wall" }) +
    [-1, 1].map((sv) => K.solidSvg(K.extrude(orBox(F, -L, L, sv * 4 - 0.35, sv * 4 + 0.35), 1.6, 0.8, P), { tone: "mid", crease: "none", className: "tr-wall" })).join("");
  return { key: K.depthOf([mid[0], mid[1], 0], P), svg };
}

export function fieldStatic(K, P, T) {
  const G = FG, R = orRoads();
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadows and fields toward the edges
  for (const [cx, cy, r, seed, sq] of [[-40, 60, 60, 3, 0.6], [80, -60, 50, 5, 0.6], [-260, 60, 60, 7, 0.8], [260, -80, 50, 9, 0.8], [40, 200, 60, 11, 0.5]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-210, 30], [-150, 34], [-156, 84], [-216, 78]], 8, "a"],
    [[[-300, -70], [-226, -64], [-232, -20], [-306, -28]], 8, "b"],
    [[[-120, 150], [-50, 160], [-56, 216], [-126, 206]], 8, "b"],
    [[[10, 170], [80, 176], [76, 230], [6, 226]], 9, "a"],
    [[[-100, -200], [-30, -196], [-34, -150], [-104, -156]], 8, "a"],
    [[[90, -200], [160, -196], [156, -150], [86, -154]], 8, "b"],
    [[[230, -40], [300, -34], [296, 20], [226, 14]], 9, "a"],
    [[[220, 40], [290, 46], [284, 96], [216, 90]], 8, "b"],
    [[[-60, -70], [-10, -66], [-14, -30], [-64, -34]], 6, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // the stream, the supply road (MSR) out from the base, the north-south road through the town, tracks
  const riverPts = [];
  for (let y = -470; y <= 470; y += 20) riverPts.push([G.RIVER(y), y]);
  g(trStream(K, P, riverPts, 5, 5));
  g(trRoad(K, P, G.MSR, 3.4));
  g(trRoad(K, P, G.CROSS_ROAD, 2.8));
  g(trRoad(K, P, [[-150, 2], [-152, 60], [-170, 130], [-200, 240], [-230, 420]], 2.2, { ruts: false }));
  g(trRoad(K, P, [[60, -2], [74, -50], [92, -120], [110, -260], [130, -420]], 2.2, { ruts: false }));

  // woods and copses, clear of the roads and the stream
  const nearRoad = (pts, x, y, d) => pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < d);
  const msrPts = R.msr.line;
  const cross = trRoute(G.CROSS_ROAD, 6).line;
  const clear = (x, y) => nearRoad(msrPts, x, y, 16) || nearRoad(cross, x, y, 14) || Math.abs(x - G.RIVER(y)) < 12 || (x > 150 && x < 230 && Math.abs(y) < 60);
  const woods = [
    [fdBlob(-60, -60, 44, 21, 0.1, 44, 0.5), 30, 21],
    [fdBlob(110, -50, 36, 22, 0.12, 40, 0.6), 22, 22],
    [fdBlob(10, 70, 40, 23, 0.12, 40, 0.5), 22, 23],
    [fdBlob(-200, -60, 40, 24, 0.12, 40, 0.8), 24, 24],
    [fdBlob(140, 90, 30, 25, 0.12, 40, 0.8), 14, 25],
    [fdBlob(-290, 150, 44, 26, 0.12, 40, 0.8), 22, 26],
    [fdBlob(280, -150, 40, 27, 0.12, 40, 0.8), 18, 27],
    [fdBlob(-140, -230, 46, 28, 0.12, 40, 0.6), 22, 28],
    [fdBlob(300, 180, 36, 29, 0.12, 40, 0.8), 14, 29],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 6.4, r: [3, 4.6], h: [8, 12.5], avoid: (x, y) => clear(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [
    [[[-216, 78], [-210, 30], [-150, 34]], 51], [[[6, 226], [10, 170], [80, 176]], 52], [[[226, 14], [230, -40], [300, -34]], 53],
    [[[-104, -156], [-100, -200]], 54], [[[216, 90], [220, 40]], 55],
  ]) items.push(...trHedge(K, P, pts, { seed }));

  // the home base: depot sheds either side of the road, supply stacks, parked trucks
  items.push(
    trHouse(K, P, -162, -26, 0, 16, 9, 4.6, 7.4), trHouse(K, P, -136, -30, 0, 14, 9, 4.6, 7.4),
    trHouse(K, P, -160, 24, 0, 16, 9, 4.6, 7.4), trHouse(K, P, -186, 18, 90, 12, 8),
  );
  for (const [x, y, ang, w, d, n] of [[-112, -18, 0, 4, 3, 3], [-102, -24, 0, 3.4, 2.6, 2], [-116, 18, 0, 4.4, 3, 3], [-104, 22, 0, 3.4, 2.8, 2], [-128, 26, 0, 3.6, 2.6, 2]]) items.push(orStack(K, P, x, y, ang, w, d, n));
  // the town at the objective, and a farm or two
  items.push(
    trHouse(K, P, 206, -24, 0, 11, 7), trHouse(K, P, 214, 14, 90, 10, 7), trHouse(K, P, 226, -6, 0, 9, 6.5),
    trHouse(K, P, 200, 32, 0, 10, 7), trHouse(K, P, 180, -40, 90, 9, 6.5), trHouse(K, P, 230, 30, 0, 9, 6.5),
    trHouse(K, P, -250, -10, 0, 10, 7), trHouse(K, P, 60, 120, 10, 11, 7), trHouse(K, P, -20, -150, 90, 10, 7),
  );
  items.push(orBridge(K, P));

  g(trRelief(K, P, T));

  // the enemy battalion's positions on the town's western edge
  for (const [x, y] of G.ENEMY) items.push(...orScrape(K, P, x, y, T.height(x, y), 180));

  // control measures: the planned forward node outline on pegs, the objective flag
  const F = R.Fpost, S = G.FWD_SITE;
  const site = trChalk(K, P, T, orBox(F, S.u0, S.u1, S.v0, S.v1), { closed: true });
  g(site.ground); items.push(...site.items);
  items.push(trObjective(K, P, T, G.OBJ[0], G.OBJ[1], { h: 13, ang: 200 }));

  return { ground: ground.join(""), items };
}

// Where every vehicle stands and who fires at whom, for a model state. M carries what the page
// measures between frames: t (seconds, for the supply trucks). Defaults serve the build's first frame.
export function fieldPose(S, GEO, T, M = { t: 0 }) {
  const G = FG, R = orRoads();
  const units = [];
  const add = (u) => { u.z = T.height(u.x, u.y); units.push(u); };
  const e = S.e, jack = orClamp01(S.jack ?? 0);
  const tq = orClamp01((S.th ?? 0) / GEO.TIP);
  const reach = tipOf(e);
  // notional losses from the model: knocked-out vehicles stop, grey out and smoke
  const loss = losses(e, !!S.base && jack > 0.985);
  const outIds = new Set([...["l2", "l0"].slice(0, loss.blue), ...["e0", "e2"].slice(0, loss.red)]);

  // --- the brigade: lit lead battalion at the head, the other two at the stages' centres ---
  const lead = orAt(reach - 4);
  const enemyX = G.ENEMY[1][0];
  const contact = orSmooth(G.CONTACT, G.CONTACT - 34, enemyX - lead.x);
  const column = (cm, id, lit) => {
    const c = orAt(cm);
    for (let j = 0; j < 3; j++) {
      const p = orAt(cm - ((j - 1) * G.GAP) / G.KX);
      add({ id: `${id}${j}`, kind: "v", side: "f", lit, face: p.face, x: p.x, y: p.y, j, c });
    }
  };
  column(MODEL.stage1.a + 40 + e * MODEL.stage1.share, "a", false);
  column(MODEL.stage2.a + 40 + e * MODEL.stage2.share, "b", false);
  // the lead battalion: column on the road, deploying into line as it closes on the enemy; when
  // it overreaches its ring it disperses
  const spread = [[-5, -9, -40], [5, 1, 25], [-6, 10, 45]];
  for (let j = 0; j < 3; j++) {
    const back = orAt(reach - 4 - (j * G.GAP) / G.KX);
    const F = fdFrame(lead.x, lead.y, 0);
    const line = F(j === 1 ? 0 : -4, (j - 1) * -14);
    let [x, y] = orLerp2([back.x, back.y], line, contact);
    let face = orAngLerp(back.face, 0, contact);
    const out = outIds.has(`l${j}`);
    if (!out) { x += spread[j][0] * tq; y += spread[j][1] * tq; face += spread[j][2] * tq; }
    add({ id: `l${j}`, kind: "v", side: "f", lit: !out, out, face, x, y, j });
  }

  // --- the forward node: three supply trucks drive up to the planned site and park there ---
  const homePark = [[-120, -8], [-128, -10], [-136, -8]];
  const F = R.Fpost;
  const slots = [F(-8, 14), F(0, 21), F(8, 14)];
  const sHome = R.sAtX(-118), sPost = R.sAtX(R.post.x);
  const nq = orSmooth(0, 1, jack);
  for (let i = 0; i < 3; i++) {
    const q = orClamp01(nq * 1.25 - i * 0.12);
    const s = sHome + (sPost - sHome) * orSmooth(0.05, 0.85, q) - i * 9 * (1 - q);
    const p = R.msr.at(s), Fp = fdFrame(p.x, p.y, p.face);
    let [x, y] = Fp(0, 2.2), face = p.face;
    if (q < 0.05) { [x, y] = orLerp2(homePark[i], [x, y], q / 0.05); }
    const park = orSmooth(0.85, 1, q);
    if (park > 0) { [x, y] = orLerp2([x, y], slots[i], park); face = orAngLerp(face, 90, park); }
    add({ id: `n${i}`, kind: "t", side: "f", face, x, y });
  }

  // --- supply trucks shuttling from the supporting base out to the brigade, inside the ring ---
  const depotX = (-112) + (R.post.x + 16 - (-112)) * nq;
  const ringEdge = jack > 0.5 ? fieldX(MODEL.post + RING_FWD) : fieldX(RING_HOME);
  const want = lead.x - 26 - contact * 8;
  const destX = Math.max(depotX + 10, Math.min(want, ringEdge - 6));
  const sD = R.sAtX(depotX), sT = R.sAtX(destX);
  for (let i = 0; i < 3; i++) {
    const ph = ((((M.t ?? 0) / G.TRUCK_PERIOD) + i / 3) % 1 + 1) % 1;
    const out = ph < 0.5;
    const u = out ? ph / 0.5 : 1 - (ph - 0.5) / 0.5;
    const k = u * u * (3 - 2 * u);
    const p = R.msr.at(sD + (sT - sD) * k), Fp = fdFrame(p.x, p.y, p.face);
    const [x, y] = Fp(0, out ? -2.2 : 2.2);
    add({ id: `k${i}`, kind: "t", side: "f", face: p.face + (out ? 0 : 180), x, y });
  }

  // --- the enemy battalion holding the town ---
  G.ENEMY.forEach(([x, y], i) => add({ id: `e${i}`, kind: "v", side: "h", face: 180, x, y, out: outIds.has(`e${i}`) }));

  // --- casualty evacuation: one vehicle shuttles from the lead battalion back to the supporting base ---
  if (loss.blue > 0) {
    const ph = ((((M.t ?? 0) / 10) % 1) + 1) % 1;
    const u = ph < 0.5 ? ph / 0.5 : 1 - (ph - 0.5) / 0.5, k = u * u * (3 - 2 * u);
    const sA = R.sAtX(lead.x - 22), sB = R.sAtX(depotX + 6);
    const p = R.msr.at(sA + (sB - sA) * k), Fp = fdFrame(p.x, p.y, p.face);
    const [x, y] = Fp(0, ph < 0.5 ? 2.2 : -2.2);
    add({ id: "m0", kind: "m", side: "f", face: p.face + (ph < 0.5 ? 180 : 0), x, y });
  }

  // --- fire: the lead battalion and the enemy, once in range; the lead stops firing when it overreaches ---
  const streams = [];
  const by = (p) => units.filter((u) => u.id.startsWith(p) && !u.out);
  const gunAt = (u) => { const Fu = fdFrame(u.x, u.y, u.face); return [...Fu(4.2, 0), u.z + 3.1]; };
  const aim = (u) => [u.x, u.y, u.z + 1.8];
  if (contact > 0.02) {
    by("l").forEach((u, i) => streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: by("e").map(aim), period: 2.2 + i * 0.27, burst: 1, gap: 0, flight: 0.5, phase: i * 0.61, on: 0.9 * contact * (1 - tq), scatter: 3 }));
    by("e").forEach((u, i) => streams.push({ id: u.id, side: "h", heavy: true, from: gunAt(u), to: by("l").map(aim), period: 2.6 + i * 0.21, burst: 1, gap: 0, flight: 0.5, phase: 0.35 + i * 0.47, on: contact * (0.55 + 0.4 * tq), scatter: 3 }));
  }
  // smoke rising from each knocked-out vehicle
  units.filter((u) => u.out).forEach((u, i) => streams.push({ id: `x${u.id}`, side: u.side, smoke: true, from: [u.x, u.y, u.z + 2.6], to: [[u.x, u.y, u.z + 2.7]], period: 1.1, burst: 1, gap: 0, flight: 0.02, phase: i * 0.37, on: 1, scatter: 0.4 }));
  return { units, streams, contact, tq, jack, reach, loss };
}

// Per-state ground marks: the reach ring round the home base, the forward node's ring growing as it
// opens, and the enemy's fire sector west from the town.
function orRing(K, P, T, cx, cy, r) {
  const pts = [];
  const n = Math.max(48, Math.ceil(r / 3));
  for (let i = 0; i < n; i++) pts.push([cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)]);
  return trChalk(K, P, T, pts, { closed: true, pegs: false }).ground;
}
export function fieldMarks(K, P, T, pose) {
  const G = FG, R = orRoads();
  let out = `<g class="or-ring">${orRing(K, P, T, G.XB, 0, G.KX * RING_HOME)}</g>`;
  if (pose.jack > 0.02) {
    const r = G.KX * RING_FWD * orSmooth(0, 1, pose.jack);
    if (r > 2) out += `<g class="or-ring" data-fwd=""${pose.jack < 0.999 ? ` opacity="${pose.jack.toFixed(2)}"` : ""}>${orRing(K, P, T, R.post.x, R.post.y, r)}</g>`;
  }
  return out + trFan(K, P, T, G.ENEMY[1][0] - 6, G.ENEMY[1][1], 10, 70, 160, 200, { side: "h", arcs: 2, alpha: 0.75 });
}

// One unit's look: a vehicle, a supply truck, or the casualty evacuation truck (white roof); a
// knocked-out vehicle is wrapped so the page CSS greys it.
export function orUnitSvg(K, P, u, face) {
  const body = u.kind === "v" ? trVehicle(K, P, face) : orTruck(K, P, face);
  if (u.out) return `<g class="or-out">${body}</g>`;
  return u.kind === "m" ? `<g class="or-medevac">${body}</g>` : body;
}
