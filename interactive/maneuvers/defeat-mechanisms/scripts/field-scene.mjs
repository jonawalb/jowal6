// The Battlefield view of the defeat mechanisms, at operational scale, drawn with the terrain kit
// (../../kit/terrain.mjs). Each small vehicle stands for a platoon (trBattalion's convention), each
// cluster of three for a company; trucks and command-post vehicles stand for themselves.
// The bench maps onto one enemy battalion defending astride a road:
//   target block   the enemy battalion: three mechanized companies dug in facing east (lit)
//   link plate     its command post (two command vehicles and two antenna masts) behind the centre
//   supply cart    its supply trucks shuttling along the road from the west
// and each tool onto a friendly element that carries out one mechanism (ADP 3-0, 2025, 4-39 to 4-42):
//   press  (S.d)   destroy: an artillery battery and an attack-by-fire company knock out its vehicles
//   lever  (S.l)   dislocate: an armored company works round the northern flank to its rear, so its
//                  prepared positions face the wrong way; the vehicles try to turn out of them
//   saw    (S.s)   disintegrate: the battery strikes the command post; the masts fall and the companies,
//                  without coordination, drift out of their positions and fire raggedly
//   ring   (S.i)   isolate: a blocking company comes up a farm track and sits astride the supply road;
//                  the trucks halt and the lead one is hit
// The same model state S as the machine drives it (the four eased effort levels). M carries what
// the page measures between frames: t (seconds, for fire and the trucks) and trucks (their road
// positions, eased by fieldTrucks). Defaults serve the build's first frame.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame, fdRand } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trRoute, trPrism } from "../../kit/terrain.mjs";
import { MODEL, capability, losses } from "./model.mjs";

// Layout in screen-aligned ground coordinates (u to the right across the card, v toward the viewer),
// turned into world x, y by dmW, so the enemy faces right and its supply road comes in from the left.
const DM_AZ = 55 * Math.PI / 180;
const dmW = (u, v) => [u * Math.sin(DM_AZ) + v * Math.cos(DM_AZ), -u * Math.cos(DM_AZ) + v * Math.sin(DM_AZ)];
const dmWs = (pts) => pts.map(([u, v]) => dmW(u, v));
const DM_RIGHT = -35;                          // world facing that points right across the card

export const FG = {
  world: { x: -520, y: -520, w: 1040, d: 1040 },
  FACE: DM_RIGHT,                              // the enemy's positions face right, toward the friendly side
  COYS: dmWs([[-14, -62], [2, 0], [-14, 62]]), // enemy company centres, far to near
  VEH: 9,                                      // vehicle interval inside a company
  HQ: dmW(-70, -4),                            // the enemy command post
  CMD: [dmW(-70, -4), dmW(-80, 6)],            // its two command vehicles
  MASTS: dmWs([[-82, -20], [-66, -24]]),       // its two antenna masts
  MAST_H: 15,
  ROAD: dmWs([[-520, 30], [-330, 26], [-220, 22], [-140, 14], [-90, 6], [-40, 2], [60, 4], [200, -6], [520, -14]]),
  TRUCK_RUN: [-180, -94],                      // the stretch the supply trucks shuttle along (u at each end)
  TRUCK_PERIOD: 20,                            // seconds for one truck's round trip
  TRUCK_SPEED: 40,                             // top speed (world units per second) when they halt or move on
  BLOCK_U: -124,                               // where the blocking company cuts the road
  BLOCK_TRACK: dmWs([[-84, 240], [-94, 170], [-108, 100], [-122, 50]]),
  ABF: dmW(90, 30),                           // the attack-by-fire company (destroy), on a rise
  BATTERY: dmW(112, 100),                      // the artillery battery (destroy and disintegrate)
  MANEUVER: dmWs([[112, -112], [50, -142], [-20, -146], [-74, -128], [-104, -96]]), // the dislocating company's route
  EVAC: dmWs([[92, 48], [106, 80], [150, 120], [300, 180]]), // casualty evacuation, to the rear
  EVAC_PERIOD: 14,
};
FG.TERRAIN = {
  rises: [
    { cx: dmW(92, 30)[0], cy: dmW(92, 30)[1], r: 30, steps: 2, h: 1.4, top: 0.6, seed: 5, wobble: 0.08, squash: 0.8 },
    { cx: dmW(250, -120)[0], cy: dmW(250, -120)[1], r: 30, steps: 3, h: 1.6, top: 0.45, seed: 21, wobble: 0.12 },
    { cx: dmW(-270, -120)[0], cy: dmW(-270, -120)[1], r: 36, steps: 3, h: 1.7, top: 0.45, seed: 31, wobble: 0.1, squash: 0.8 },
    { cx: dmW(-20, 150)[0], cy: dmW(-20, 150)[1], r: 28, steps: 3, h: 1.6, top: 0.45, seed: 41, wobble: 0.12 },
    { cx: dmW(40, -80)[0], cy: dmW(40, -80)[1], r: 20, steps: 2, h: 1.5, top: 0.5, seed: 47, wobble: 0.1 },
  ],
};

const DM_RAD = Math.PI / 180;
const dmClamp = (x) => Math.min(1, Math.max(0, x));
const dmSmooth = (a, b, x) => { const t = dmClamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const dmLerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dmAng = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const dmToward = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / DM_RAD;
const dmBox = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- layout (shared by build and page; built once) ----------
let DM_L = null;
function dmLayout() {
  if (DM_L) return DM_L;
  const G = FG;
  const rnd = fdRand(17);
  // the enemy companies: three vehicles each, the middle one a little forward
  const pits = [];
  G.COYS.forEach(([cx, cy], c) => [-1, 0, 1].forEach((j) => { const F = fdFrame(cx, cy, G.FACE); const [x, y] = F(j === 0 ? 2.5 : 0, j * G.VEH); pits.push({ c, j, x, y, b: G.FACE }); }));
  // destroy knocks them out nearest the attack-by-fire position first
  const order = pits.map((p, i) => i).sort((a, b) => Math.hypot(pits[a].x - G.ABF[0], pits[a].y - G.ABF[1]) - Math.hypot(pits[b].x - G.ABF[0], pits[b].y - G.ABF[1]));
  const koRank = [];
  order.forEach((pi, n) => { koRank[pi] = n; });
  // dislocate catches the north company's rear vehicle as it turns
  const disloc = 0;
  // disintegrate: each vehicle's drift once coordination fails
  const drift = pits.map(() => { const a = rnd() * 360, r = 9 + rnd() * 9; return [Math.cos(a * DM_RAD) * r, Math.sin(a * DM_RAD) * r, (rnd() - 0.5) * 150]; });
  const road = trRoute(G.ROAD, 6);
  const sAt = (u) => { const [x, y] = dmW(u, 0); let best = 0, bd = Infinity; for (let s = 0; s <= road.length; s += 1) { const p = road.at(s); const d = Math.abs((p.x - x) * Math.sin(DM_AZ) - (p.y - y) * Math.cos(DM_AZ)); if (d < bd) { bd = d; best = s; } } return best; };
  const run = G.TRUCK_RUN.map(sAt);
  const sBlock = sAt(G.BLOCK_U);
  const track = trRoute(G.BLOCK_TRACK, 6);
  const maneuver = trRoute(G.MANEUVER, 6);
  const evac = trRoute(G.EVAC, 4);
  // the blocking company's final slots astride the road: two facing west (the trucks), one east
  const bp = road.at(sBlock);
  const BF = fdFrame(bp.x, bp.y, bp.face);
  const blockSlots = [[BF(-3, 12), 180 + bp.face], [BF(-5, -11), 180 + bp.face], [BF(8, 1), bp.face]];
  DM_L = { pits, koRank, disloc, drift, road, run, sBlock, track, maneuver, evac, blockSlots, bp };
  return DM_L;
}

// A vehicle fighting position (scrape plus berm), as Fig 7: two items either side of its centre.
function dmScrape(K, P, x, y, z, face) {
  const F = fdFrame(x, y, face);
  const key0 = K.depthOf([x, y, 0], P);
  const pit = `<path class="tr-pit" d="${K.onTop(dmBox(F, -5.2, 4.6, -3.2, 3.2), z + 0.03, P, true)}"/>`;
  const banks = [[4.8, 6.4, -4.2, 4.2], [-2.6, 4.8, 3.4, 4.6], [-2.6, 4.8, -4.6, -3.4]].map(([u0, u1, v0, v1]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return { near: K.depthOf([c[0], c[1], 0], P) > key0, svg: trPrism(K, P, dmBox(F, u0, u1, v0, v1), z, z + 1.3) };
  });
  const wrap = (list) => (list.length ? `<g class="tr-p tr-bag">${list.map((b) => b.svg).join("")}</g>` : "");
  return [
    { key: key0 - 6, svg: pit + wrap(banks.filter((b) => !b.near)) },
    { key: key0 + 6, svg: wrap(banks.filter((b) => b.near)) },
  ];
}

// A wheeled truck at the origin facing `face` (supply trucks, command vehicles, the evacuation
// vehicle): cab, box body and chassis, tinted by the <g class="tr-s" data-side> it is drawn in.
export function dmTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, dmBox(F, u0, u1, v0, v1), z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(dmBox(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}

// An antenna mast at the origin: a pole with a short cross-arm at the top and three guy lines to
// ground pegs while it stands. lean 0..90 degrees tips it over toward `dir` until it lies on the ground.
export function dmMast(K, P, lean = 0, dir = 200, h = FG.MAST_H) {
  const P0 = { ...P, origin: [0, 0] };
  const a = lean * DM_RAD, d = dir * DM_RAD;
  const along = (r) => [Math.sin(a) * r * Math.cos(d), Math.sin(a) * r * Math.sin(d), Math.cos(a) * r + 0.25];
  const top = along(h);
  const pole = K.pathOf([K.iso([0, 0, 0.25], P0), K.iso(top, P0)]);
  // the cross-arm: perpendicular to the lean direction, level with the ground
  const px = -Math.sin(d) * 1.8, py = Math.cos(d) * 1.8, arm = along(h - 1.2);
  let svg = `<path class="tr-shadow" d="${K.onTop([[-1, -1], [1, -1], [1, 1], [-1, 1]], 0, P0, true)}"/>`;
  svg += `<path class="tr-gun" d="${pole}"/><path class="tr-gun" d="${K.pathOf([K.iso([arm[0] - px, arm[1] - py, arm[2]], P0), K.iso([arm[0] + px, arm[1] + py, arm[2]], P0)])}"/>`;
  if (lean < 4) {
    const guy = along(h * 0.7);
    for (const g of [0, 120, 240]) {
      const peg = [Math.cos((g + 30) * DM_RAD) * 6, Math.sin((g + 30) * DM_RAD) * 6, 0];
      svg += `<path class="tr-wire" d="${K.pathOf([K.iso(guy, P0), K.iso(peg, P0)])}"/>`;
    }
  }
  return svg;
}

export function fieldStatic(K, P, T) {
  const G = FG, L = dmLayout();
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadows and fields, toward the edges (u, v in the card-aligned frame)
  const blob = (u, v, r, seed, sq) => { const [x, y] = dmW(u, v); return fdBlob(x, y, r, seed, 0.15, 40, sq); };
  for (const [u, v, r, seed, sq] of [[60, -70, 44, 3, 0.7], [-200, 110, 56, 5, 0.5], [-190, -70, 44, 7, 0.8], [240, 30, 46, 9, 0.8], [40, 110, 34, 11, 0.6]]) g(trPatch(K, P, blob(u, v, r, seed, sq)));
  const quad = (u, v, w, d) => dmWs([[u, v], [u + w, v + 3], [u + w - 4, v + d], [u - 4, v + d - 3]]);
  const fields = [
    [quad(190, 50, 70, 46), 9, "a"],
    [quad(60, 150, 72, 50), 8, "b"],
    [quad(-300, 50, 72, 50), 8, "a"],
    [quad(-300, -200, 70, 44), 8, "b"],
    [quad(-110, 160, 66, 46), 7, "a"],
    [quad(110, -230, 76, 40), 8, "b"],
    [quad(-160, -250, 70, 44), 7, "a"],
    [quad(250, 150, 66, 44), 7, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // a stream at the back, the road through the enemy position (its supply road to the left), the
  // farm track the blocking company uses, a track from the battery forward and one behind the enemy
  const stream = dmWs([[-560, -236], [-400, -222], [-260, -240], [-120, -226], [0, -236], [120, -250], [240, -240], [360, -256], [560, -262]]);
  g(trStream(K, P, stream, 4.6, 5));
  g(trRoad(K, P, G.ROAD, 3.4));
  g(trRoad(K, P, [...G.BLOCK_TRACK, [L.bp.x, L.bp.y]], 2.2, { ruts: false }));
  g(trRoad(K, P, [dmW(330, 260), dmW(200, 170), G.BATTERY, dmW(104, 66), dmW(92, 44)], 2.2, { ruts: false }));
  g(trRoad(K, P, dmWs([[-90, 6], [-96, -30], [-110, -90], [-120, -170], [-130, -300]]), 2.2, { ruts: false }));

  // woods and copses, clear of every unit, route and the stream's banks
  const keep = [
    ...L.pits.map((p) => [p.x, p.y, 30]), [G.HQ[0], G.HQ[1], 30], ...G.MASTS.map(([x, y]) => [x, y, 22]),
    [G.ABF[0], G.ABF[1], 34], [G.BATTERY[0], G.BATTERY[1], 34], [L.bp.x, L.bp.y, 30],
  ];
  for (const R of [L.track, L.maneuver, L.evac]) R.line.forEach(([x, y], i) => { if (i % 2 === 0) keep.push([x, y, 18]); });
  const onRoad = (x, y) => L.road.line.some(([rx, ry]) => Math.hypot(rx - x, ry - y) < 14);
  const clear = (x, y) => keep.some(([kx, ky, r]) => Math.hypot(kx - x, ky - y) < r) || stream.some((p) => Math.hypot(p[0] - x, p[1] - y) < 22) ||
    onRoad(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0;
  const woods = [
    [blob(40, 70, 30, 21, 0.7), 18, 21],
    [blob(-230, 190, 30, 22, 0.8), 14, 22],
    [blob(-200, -140, 38, 23, 0.6), 20, 23],
    [blob(140, -60, 30, 24, 0.7), 14, 24],
    [blob(280, -40, 40, 25, 0.8), 18, 25],
    [blob(-320, -20, 36, 26, 0.8), 14, 26],
    [blob(-60, 90, 26, 27, 0.8), 12, 27],
    [blob(150, 220, 36, 28, 0.7), 14, 28],
    [blob(-20, -270, 40, 29, 0.6), 14, 29],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 6.4, r: [3, 4.6], h: [8, 12.5], avoid: clear });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // hedgerows along some fields
  for (const [ring, seed] of [[fields[0][0], 51], [fields[1][0], 52], [fields[2][0], 54], [fields[4][0], 55], [fields[7][0], 56]]) items.push(...trHedge(K, P, [ring[3], ring[0], ring[1]], { seed }));

  // a farm by the command post, a hamlet on the supply road behind the block, a farm behind the battery
  const house = (u, v, ang, len, wid) => { const [x, y] = dmW(u, v); return trHouse(K, P, x, y, ang + DM_RIGHT, len, wid); };
  items.push(
    house(-52, 36, 10, 10, 7), house(-36, 44, 100, 8, 6),
    house(-196, -26, 5, 11, 7), house(-178, -36, 95, 9, 6.5), house(-206, 44, 0, 8, 6),
    house(200, 120, 15, 11, 7), house(214, 104, 105, 8, 6),
  );

  g(trRelief(K, P, T));

  // the enemy companies' prepared positions, all facing east
  for (const p of L.pits) items.push(...dmScrape(K, P, p.x, p.y, T.height(p.x, p.y), p.b));

  // control measures: the attack-by-fire position (destroy) and the blocking position (isolate)
  const FA = fdFrame(G.ABF[0], G.ABF[1], dmToward(G.ABF, G.COYS[1]));
  const abf = trChalk(K, P, T, [FA(-14, -24), FA(14, -24), FA(14, 24), FA(-14, 24)], { closed: true });
  const FB = fdFrame(L.bp.x, L.bp.y, L.bp.face);
  const blk = trChalk(K, P, T, [FB(-16, -22), FB(16, -22), FB(16, 22), FB(-16, 22)], { closed: true });
  g(abf.ground + blk.ground); items.push(...abf.items, ...blk.items);

  return { ground: ground.join(""), items };
}

// Advance the supply trucks one frame (page only): they shuttle while the road is open; once the
// blocking company is astride it they halt where they are, or short of the block, and stay.
export function fieldTrucks(M, S, dt) {
  const L = dmLayout(), G = FG;
  const [s0, s1] = L.run, span = s1 - s0;
  M.tc = (M.tc ?? 0) + (S.i > 0.55 ? 0 : dt);
  const free = (k) => { const ph = ((M.tc / G.TRUCK_PERIOD + k / 3) % 1 + 1) % 1; const u = ph < 0.42 ? ph / 0.42 : ph < 0.5 ? 1 : ph < 0.92 ? 1 - (ph - 0.5) / 0.42 : 0; return { s: s0 + span * u * u * (3 - 2 * u), out: ph < 0.5 }; };
  M.trucks = M.trucks || [0, 1, 2].map((k) => ({ ...free(k) }));
  M.trucks.forEach((tr, k) => {
    let want = free(k);
    if (S.i > 0.55) {
      const gap = 22;                                          // halt outside the blocking position
      const s = Math.abs(tr.s - L.sBlock) < gap ? L.sBlock + Math.sign(tr.s - L.sBlock || -1) * gap : tr.s;
      want = { s, out: tr.out };
    }
    const step = G.TRUCK_SPEED * dt;
    tr.s += Math.max(-step, Math.min(step, want.s - tr.s));
    tr.out = want.out;
  });
  return M.trucks;
}

// Where every vehicle stands and who fires at whom, for a model state.
export function fieldPose(S, GEO, T, M = {}) {
  const G = FG, L = dmLayout();
  const units = [];
  const add = (u) => { u.z = T.height(u.x, u.y); units.push(u); };
  const a = [S.d, S.l, S.s, S.i];
  const LS = losses(a, MODEL);
  const cap = capability(a, MODEL);
  const t = M.t ?? 0;
  const dOn = dmSmooth(0.02, 0.5, S.d), lMove = dmSmooth(0, 1, S.l), sOn = dmSmooth(0.02, 0.45, S.s), iMove = dmSmooth(0, 1, S.i);
  const fall = dmSmooth(0.35, 0.95, S.s);                       // masts tip and companies lose coordination

  // --- the dislocating company: along its route round the northern flank, then into line facing the enemy rear ---
  const man = [];
  const mEnd = L.maneuver.at(L.maneuver.length);
  const rearAim = dmW(-20, -10);
  const mFace = dmToward([mEnd.x, mEnd.y], rearAim);
  const MF = fdFrame(mEnd.x, mEnd.y, mFace);
  const mSlots = [MF(0, 0), MF(-3, 13), MF(-3, -13)];
  [0, 1, 2].forEach((j) => {
    const s = Math.max(0, lMove * L.maneuver.length - j * 12);
    const p = L.maneuver.at(s);
    const w = dmSmooth(0.82, 1, S.l);
    const [x, y] = dmLerp([p.x, p.y], mSlots[j], w);
    const hit = j < LS.blueBy[1];
    man.push({ id: `m${j}`, side: hit ? "kf" : "f", ko: hit, face: hit ? dmAng(p.face, mFace, w) + 25 : dmAng(p.face, mFace, w), x: x + (hit ? 0 : 0), y });
  });
  man.forEach(add);
  const manAt = [mEnd.x, mEnd.y];

  // --- the enemy companies (lit): knocked out by destroy, turned by dislocate, adrift under disintegrate ---
  const turnW = [1, 0.75, 0.5];
  L.pits.forEach((p, i) => {
    const koD = L.koRank[i] < LS.redBy[0];
    const koL = !koD && i === L.disloc && LS.redBy[1] > 0;
    const ko = koD || koL;
    const want = dmToward([p.x, p.y], manAt);
    let face = dmAng(p.b, want, lMove * turnW[p.c]);
    const F = fdFrame(p.x, p.y, p.b);
    let [x, y] = F(-6 * lMove * turnW[p.c], 0);                   // backing out of the scrape to turn
    if (!ko) {
      const [dx, dy, df] = L.drift[i];
      x += dx * fall; y += dy * fall; face += df * fall;
    } else face += ((i * 37) % 50) - 25;
    add({ id: `e${i}`, side: ko ? "kh" : "h", lit: !ko, ko, face, x, y, c: p.c });
  });

  // --- the command post: two command vehicles and two masts; the strike knocks them out and topples the masts ---
  [[...G.CMD[0], DM_RIGHT + 150], [...G.CMD[1], DM_RIGHT + 60]].forEach(([x, y, f], j) => {
    const ko = j < LS.redBy[2];
    add({ id: `h${j}`, kind: "t", side: ko ? "kh" : "h", ko, face: ko ? f + 20 : f, x, y });
  });
  G.MASTS.forEach(([x, y], j) => add({ id: `a${j}`, kind: "mast", side: "h", lean: Math.round(86 * fall / 6) * 6, dir: j ? 230 : 160, face: 0, x, y }));

  // --- the supply trucks on the road ---
  const trucks = M.trucks || [0.1, 0.45, 0.8].map((u, k) => ({ s: L.run[0] + (L.run[1] - L.run[0]) * u, out: k !== 1 }));
  let lead = -1;
  if (LS.redBy[3] > 0) { let bd = Infinity; trucks.forEach((tr, k) => { const d = Math.abs(tr.s - L.sBlock); if (d < bd) { bd = d; lead = k; } }); }
  trucks.forEach((tr, k) => {
    const p = L.road.at(tr.s);
    const F = fdFrame(p.x, p.y, p.face);
    const [x, y] = F(0, tr.out ? -2 : 2);                          // keep to the right of the road
    add({ id: `t${k}`, kind: "t", side: k === lead ? "kh" : "h", ko: k === lead, face: p.face + (tr.out ? 0 : 180) + (k === lead ? 20 : 0), x, y });
  });

  // --- the attack-by-fire company (destroy): stays in its position; it fires only while destroy is on ---
  const FA = fdFrame(G.ABF[0], G.ABF[1], dmToward(G.ABF, G.COYS[1]));
  const aFace = dmToward(G.ABF, G.COYS[1]);
  [[0, -12], [2, 0], [0, 12]].forEach(([u, v], j) => {
    const hit = (j === 0 && LS.blueBy[0] > 0) || (j === 2 && LS.blueBy[0] > 1);
    const [x, y] = FA(u - (hit ? 3 : 0), v);
    add({ id: `f${j}`, side: hit ? "kf" : "f", ko: hit, face: hit ? aFace + 20 : aFace + ((j * 23) % 9) - 4, x, y });
  });

  // --- the artillery battery: guns 0-1 on the companies (destroy), guns 2-3 on the command post (disintegrate) ---
  const gFace = dmToward(G.BATTERY, G.COYS[1]);
  const FB = fdFrame(G.BATTERY[0], G.BATTERY[1], gFace);
  [[0, -15], [3, -5], [0, 5], [3, 15]].forEach(([u, v], j) => {
    const hit = j === 3 && LS.blueBy[2] > 0;
    const [x, y] = FB(u, v);
    add({ id: `g${j}`, side: hit ? "kf" : "f", ko: hit, face: hit ? gFace + 35 : gFace, x, y });
  });

  // --- the blocking company (isolate): up the farm track, then astride the supply road ---
  [0, 1, 2].forEach((j) => {
    const s = Math.max(0, iMove * L.track.length - j * 11);
    const p = L.track.at(s);
    const w = dmSmooth(0.72, 1, S.i);
    const [slot, sf] = L.blockSlots[j];
    const [x, y] = dmLerp([p.x, p.y], slot, w);
    const hit = j === 2 && LS.blueBy[3] > 0;
    add({ id: `b${j}`, side: hit ? "kf" : "f", ko: hit, face: dmAng(p.face, sf, w) + (hit ? 25 : 0), x, y });
  });

  // casualty evacuation: once blue has losses, a vehicle shuttles them back along the track to the rear
  if (LS.blue > 0) {
    const R = L.evac;
    const ph = ((t / G.EVAC_PERIOD) % 1 + 1) % 1, out = ph < 0.5;
    const at = R.at((out ? ph / 0.5 : 1 - (ph - 0.5) / 0.5) * R.length);
    const F = fdFrame(at.x, at.y, at.face), [x, y] = F(0, out ? -2.2 : 2.2);
    add({ id: "v0", kind: "t", side: "f", face: at.face + (out ? 0 : 180), x, y });
  }

  // --- fire ---
  const streams = [];
  const by = (p) => units.filter((u) => u.id.startsWith(p));
  const gunAt = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(4.2, 0), u.z + 3.1]; };
  const aim = (u) => [u.x, u.y, u.z + 1.8];
  const enemy = by("e"), live = enemy.filter((u) => !u.ko);
  // destroy: the attack-by-fire company fires on the companies, the next to be hit first
  const next = live.filter((u) => L.koRank[Number(u.id.slice(1))] < LS.redBy[0] + 3);
  const dTo = (next.length ? next : live).map(aim);
  by("f").forEach((u, i) => { if (!u.ko) streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: dTo, period: 2.2 + i * 0.21, burst: 1, gap: 0, flight: 0.6, phase: i * 0.43, on: 0.9 * dOn, scatter: 3 }); });
  // the battery: long flights, big smoky strikes
  const gunsBy = by("g");
  const shell = (u, i, to, on) => streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: [...fdFrame(u.x, u.y, u.face)(4.4, 0), u.z + 3.4], to, period: 3.1 + i * 0.23, burst: 1, gap: 0, flight: 1.5, phase: 0.2 + i * 0.71, on, scatter: 7 });
  gunsBy.slice(0, 2).forEach((u, i) => shell(u, i, dTo, 0.85 * dOn));
  const hqTo = [...by("h"), ...by("a")].map(aim);
  gunsBy.slice(2).forEach((u, i) => { if (!u.ko) shell(u, i + 2, hqTo, 0.85 * sOn * (S.s < 0.98 ? 1 : 0.5)); });
  // dislocate: the maneuver company, once in line, fires into the enemy's flank and rear
  const mFire = dmSmooth(0.8, 1, S.l);
  by("m").forEach((u, i) => { if (!u.ko) streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: live.filter((e) => e.c === 0 || e.c === 1).map(aim), period: 2.5 + i * 0.19, burst: 1, gap: 0, flight: 0.6, phase: 0.7 + i * 0.37, on: 0.8 * mFire, scatter: 3 }); });
  // isolate: the blocking company engages the lead truck
  const tLead = by("t").filter((u) => u.ko);
  by("b").forEach((u, i) => { if (!u.ko && i < 2) streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: tLead.map(aim), period: 2.9 + i * 0.3, burst: 1, gap: 0, flight: 0.45, phase: 0.4 + i, on: 0.7 * dmSmooth(0.85, 1, S.i), scatter: 3 }); });
  // the enemy fires back while it can: east at the attack-by-fire company, at the maneuver company if
  // it has turned toward it, and its rear at the block; ragged once its command post is gone
  const ragged = 1 - 0.55 * fall;
  const fTargets = by("f").filter((u) => !u.ko).map(aim), mTargets = by("m").filter((u) => !u.ko).map(aim), bTargets = by("b").filter((u) => !u.ko).map(aim);
  live.forEach((u, i) => {
    const toMan = lMove * turnW[u.c] > 0.45 && mTargets.length;
    const to = toMan ? mTargets : fTargets;
    const on = (toMan ? 0.7 : 0.7 * dOn) * ragged * (0.5 + 0.5 * cap);
    if (i % 2 === 0) streams.push({ id: u.id, side: "h", heavy: true, from: gunAt(u), to, period: 2.7 + i * 0.17, burst: 1, gap: 0, flight: 0.6, phase: 0.3 + i * 0.41, on, scatter: 4 + 6 * fall });
  });
  const hqLive = by("h").filter((u) => !u.ko);
  if (hqLive.length && bTargets.length) streams.push({ id: "h-b", side: "h", heavy: false, from: gunAt(hqLive[0]), to: bTargets, period: 1.9, burst: 3, gap: 0.12, flight: 0.7, phase: 0.2, on: 0.5 * dmSmooth(0.85, 1, S.i), scatter: 4 });
  return { units, streams, LS, cap, dOn, lMove, sOn, iMove, fall, manAt, mFace };
}

// Per-state ground marks: the enemy's prepared fire sector (east, where its positions face; it fades
// as coordination fails), the attack-by-fire company's sector while it fires, and the maneuver
// company's sector into the enemy rear once it is in line.
export function fieldMarks(K, P, T, pose) {
  const G = FG;
  const c = G.COYS[1];
  const toAbf = dmToward(G.ABF, c);
  const [mx, my] = pose.manAt;
  const [fx, fy] = fdFrame(c[0], c[1], G.FACE)(14, 0);
  return trFan(K, P, T, fx, fy, 10, 64, G.FACE - 32, G.FACE + 32, { side: "h", arcs: 2, alpha: 0.8 * (1 - 0.7 * pose.fall) }) +
    trFan(K, P, T, G.ABF[0], G.ABF[1], 18, 0.62 * Math.hypot(c[0] - G.ABF[0], c[1] - G.ABF[1]), toAbf - 16, toAbf + 16, { side: "f", arcs: 1, alpha: 0.6 * pose.dOn }) +
    trFan(K, P, T, mx, my, 14, 70, pose.mFace - 26, pose.mFace + 26, { side: "f", arcs: 1, alpha: 0.6 * dmSmooth(0.85, 1, pose.lMove) });
}

// Smoke rising from every stopped vehicle (page only; added to the fire layer's smoke pool).
export function fieldSmoke(pose, t) {
  const out = [];
  const wrecks = pose.units.filter((u) => u.ko), n = wrecks.length > 9 ? 1 : 2;
  wrecks.forEach((u, i) => {
    for (let j = 0; j < n; j++) {
      const age = ((t / 4.2 + i * 0.37 + j / n) % 1 + 1) % 1;
      out.push({ p: [u.x - 2.2 * age * 4, u.y - 3.4 * age * 4, u.z + 2.5 + age * 9], age });
    }
  });
  return out;
}

// Click targets in the field view, one per mechanism (world points): the attack-by-fire company,
// the maneuver company, the command post, the blocking position.
export function fieldAnchors(pose) {
  const L = dmLayout(), m = pose.units.find((u) => u.id === "m0");
  return [[...FG.ABF, 3], [m.x, m.y, 3], [...FG.HQ, 6], [L.bp.x, L.bp.y, 3]];
}
