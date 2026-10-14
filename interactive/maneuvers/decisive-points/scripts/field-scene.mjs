// The Battlefield view of Decisive Points, at operational scale, drawn with the terrain kit
// (../../kit/terrain.mjs). One vehicle stands for a platoon, three for a company (trBattalion's
// convention, as in Fig 7). The enemy matches Fig 7: three mechanized battalions dug in on an arc of
// companies in front of a crossroads, where its tank-battalion reserve waits (lit: the center of
// gravity in this model). Four of the arc's companies hold the decisive points. The same model state S
// as the machine drives it:
//   S.props[i]  the pull of prop i's pin: here a blue two-company team attacking decisive point i and
//               the red company holding it pulling back to the crossroads. The prop's "out" share
//               (propState) is the point seized. Left to right on screen, as on the bench: a hill and the
//               bridge (left), a village on the southern road and the airfield (right). The inner pair
//               (bridge and village) carry the enemy's roads to the front, so they carry the most load.
//   keyLoad     the load on the keystone: here the load on the reserve, shown by its companies leaving
//               the crossroads to block each lost point, thinner as the load grows.
//   S.failed    the keystone gives: here the reserve and every company still in place pull back off the
//               map to the north, leaving vehicles behind (M.col, eased by the page).
// Casualties (soldiers, notional) come from model.mjs losses(); stopped vehicles are greyed.
// Layout is written in screen-aligned coordinates [X right, p toward the viewer] and turned into
// world coordinates by W(), so the picture can be read left to right like the bench.
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every vehicle and fire stream for a state (build and page); fieldMarks() draws the fire sectors.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trFan, trChalk, trRoute, trPrism } from "../../kit/terrain.mjs";
import { MODEL, keyLoad, losses } from "./model.mjs";
import { propState } from "./scene.mjs";

const DF_A = 55 * Math.PI / 180;    // the camera's azimuth; build.mjs uses the same
// screen-aligned [X, p] to world [x, y]
const DF_SX = 0.86;                 // horizontal squeeze so the four points sit inside a phone-width crop
const W = ([X0, p]) => { const X = X0 * DF_SX; return [X * Math.sin(DF_A) + p * Math.cos(DF_A), -X * Math.cos(DF_A) + p * Math.sin(DF_A)]; };
const Ws = (pts) => pts.map(W);
const DF_UP = 235;                  // world facing toward the top of the screen (the enemy's rear)
const DF_DOWN = 55;                 // toward the viewer (the friendly side)

export const FG = {
  world: { x: -360, y: -360, w: 720, d: 720 },
  // decisive points, left to right as on the bench: hill, bridge, crossroads, airfield
  NAMES: ["hill", "bridge", "village", "airfield"],
  // the arc: nine companies of three mechanized platoons, three battalions; dp = the point it holds
  COYS: [[-136, -22, 0], [-110, -50, -1], [-86, -31, 1], [-30, -26, -1], [14, -24, -1], [70, -27, 2], [108, -36, -1], [150, -38, 3], [116, -96, -1]],
  VEH: [[-9, 0], [0, 3], [9, 0]],                                      // platoons in a company, screen-aligned
  HUB: [-4, -126],                                                     // the crossroads behind the enemy's centre
  HOLD: Ws([[-136, -22], [-86, -31], [70, -27], [150, -38]]),        // enemy company positions
  // the armored reserve's laager by the depot, and the blocking spots it moves to for each lost point
  HOME: Ws([[20, -122], [34, -122], [48, -122]]),                     // reserve companies' laager by the crossroads (columns of three)
  BLOCK: Ws([[-44, -96], [-24, -70], [40, -64], [94, -76]]),
  ASSIGN: [[0, 1], [1, 2], [2, 3]],                                   // which points each reserve company covers
  // enemy companies' withdrawal routes to the hub, and their places there
  BACK: [
    [[-136, -22], [-112, -40], [-64, -50], [-36, -86], [-32, -112]],
    [[-86, -31], [-64, -50], [-36, -86], [-14, -102]],
    [[70, -27], [56, -46], [24, -82], [6, -98]],
    [[150, -38], [128, -64], [100, -94], [70, -108]],
  ].map(Ws),
  // blue battalions: centre route from the assembly area to the point; three vehicles per battalion
  ROUTES: [
    [[-164, 108], [-158, 56], [-146, 12], [-136, -22]],
    [[-114, 112], [-110, 56], [-98, 4], [-86, -31]],
    [[88, 112], [82, 56], [74, 4], [70, -27]],
    [[168, 108], [164, 56], [156, 4], [150, -38]],
  ].map(Ws),
  // blue team: six platoons (two companies), screen-aligned offsets; the last is hit on the way in
  SLOT: [[0, 0], [-12, 9], [12, 9], [-18, 22], [0, 20], [16, 24]].map(([X, p]) => W([X, p])),
  RIVER: [[-210, -270], [-160, -180], [-118, -102], [-62, -50], [-32, -22], [-20, 26], [-30, 100], [-44, 180], [-56, 290]],
  ROAD_A: [[-6, -300], [-8, -172], [-4, -126], [20, -86], [56, -48], [64, -40], [70, 20], [78, 120], [86, 300]],
  ROAD_B: [[-4, -126], [-30, -90], [-62, -50], [-96, -10], [-140, 60], [-180, 150], [-222, 300]],
  ROAD_E: [[64, -40], [100, -34], [128, -26], [148, -26]],
  ROAD_W: [[64, -40], [30, -26], [8, 0]],
  ROAD_N: [[-4, -126], [40, -160], [120, -200], [260, -260]],
  RUNWAY: [[100, -72], [184, -72]],
  BRIDGE: [-62, -50],
  TRUCK_PERIOD: 16,
};
FG.TERRAIN = {
  rises: [
    { cx: W([-136, -24])[0], cy: W([-136, -24])[1], r: 34, steps: 3, h: 2.1, top: 0.42, seed: 7, wobble: 0.08 },
    { cx: W([190, -150])[0], cy: W([190, -150])[1], r: 30, steps: 2, h: 1.7, top: 0.5, seed: 17, wobble: 0.12 },
    { cx: W([-40, -200])[0], cy: W([-40, -200])[1], r: 30, steps: 3, h: 1.7, top: 0.45, seed: 27, wobble: 0.1 },
    { cx: W([200, 150])[0], cy: W([200, 150])[1], r: 28, steps: 2, h: 1.6, top: 0.5, seed: 37, wobble: 0.12 },
  ],
};

const DF_RAD = Math.PI / 180;
const df_clamp01 = (x) => Math.min(1, Math.max(0, x));
const df_smooth = (a, b, x) => { const t = df_clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const df_lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const df_ang = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const df_face = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / DF_RAD;

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- routes (shared by build and page; built once) ----------
let DF_R = null;
function routes() {
  if (DF_R) return DF_R;
  const G = FG;
  // each blue vehicle follows its own copy of the battalion's route, shifted by its slot
  const blue = G.ROUTES.map((pts) => G.SLOT.map(([ox, oy]) => trRoute(pts.map(([x, y]) => [x + ox, y + oy]), 6)));
  const back = G.BACK.map((pts) => trRoute(pts, 6));
  DF_R = { blue, back };
  return DF_R;
}
// The decisive points in world coordinates (for the pointer and for the build's DP_AT).
export const fieldPoints = () => FG.HOLD;

// ---------- local drawing helpers ----------
const boxRing = (F, u0, u1, v0, v1) => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)];

// A vehicle fighting position at (x, y) on ground z facing `face`: a dark scrape and an earth berm
// across the front with short side arms (as in Fig 3). Two items keyed either side of the centre,
// so a vehicle keyed at the centre sorts between the scrape and the front berm.
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

// The bridge where road B crosses the river: a deck on two piers with low kerbs.
function bridge(K, P) {
  const mid = W(FG.BRIDGE);
  const a = W([FG.BRIDGE[0] + 14, FG.BRIDGE[1] - 17]), b = W([FG.BRIDGE[0] - 14, FG.BRIDGE[1] + 17]);
  const ang = df_face(a, b);
  const F = fdFrame(mid[0], mid[1], ang);
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2;
  const svg = [-5, 5].map((u) => K.solidSvg(K.extrude(boxRing(F, u - 0.9, u + 0.9, -3.4, 3.4), 0, 0.9, P), { tone: "lo", crease: "none" })).join("") +
    K.solidSvg(K.extrude(boxRing(F, -L, L, -4, 4), 0.9, 0.7, P), { tone: "mid", className: "tr-wall" }) +
    [-1, 1].map((sv) => K.solidSvg(K.extrude(boxRing(F, -L, L, sv * 4 - 0.35, sv * 4 + 0.35), 1.6, 0.8, P), { tone: "mid", crease: "none", className: "tr-wall" })).join("");
  return { key: K.depthOf([mid[0], mid[1], 0], P), svg };
}

// A fuel or ammunition stack at the depot: a low block of crates on the ground.
function stack(K, P, X, p, n = 3) {
  const [x, y] = W([X, p]);
  const F = fdFrame(x, y, DF_DOWN);
  const svg = Array.from({ length: n }, (_, i) => trPrism(K, P, boxRing(F, -1.6, 1.6, -5 + i * 3.4, -2 + i * 3.4), 0, 1.8)).join("");
  return { key: K.depthOf([x, y, 0], P), svg: `<g class="tr-p tr-bag">${svg}</g>` };
}

export function fieldStatic(K, P, T) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));

  // meadows and fields, toward the edges
  for (const [X, p, r, seed, sq] of [[0, 60, 70, 3, 0.6], [-120, -150, 50, 5, 0.8], [130, -150, 60, 7, 0.7], [-190, 40, 40, 9, 0.8], [190, 40, 46, 11, 0.8]]) {
    const [cx, cy] = W([X, p]);
    g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  }
  const fields = [
    [[[-90, 180], [-20, 176], [-24, 230], [-96, 234]], 8, "a"],
    [[[20, 170], [62, 168], [64, 226], [16, 230]], 7, "b"],
    [[[100, 178], [160, 182], [156, 236], [96, 232]], 8, "a"],
    [[[-232, 74], [-196, 70], [-192, 120], [-230, 124]], 6, "b"],
    [[[200, -40], [250, -46], [254, 10], [204, 14]], 7, "b"],
    [[[118, -8], [182, -6], [184, 30], [114, 28]], 8, "a"],
    [[[-10, 60], [46, 56], [48, 96], [-4, 100]], 7, "b"],
    [[[-150, -110], [-100, -124], [-96, -84], [-140, -76]], 6, "a"],
    [[[60, -180], [120, -186], [124, -140], [64, -134]], 8, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, Ws(ring), { furrows: n, tint }));

  // the river, the roads, the runway
  g(trStream(K, P, Ws(G.RIVER), 5, 5));
  g(trRoad(K, P, Ws(G.ROAD_A), 3.4));
  g(trRoad(K, P, Ws(G.ROAD_B), 3.2));
  g(trRoad(K, P, Ws(G.ROAD_E), 2.6, { ruts: false }));
  g(trRoad(K, P, Ws(G.ROAD_W), 2.2, { ruts: false }));
  g(trRoad(K, P, Ws(G.ROAD_N), 2.8, { ruts: false }));
  g(trRoad(K, P, Ws([[-168, 300], [-170, 150], [-172, 100]]), 2.2, { ruts: false }));
  g(trRoad(K, P, Ws([[166, 300], [168, 150], [166, 100]]), 2.2, { ruts: false }));
  g(trRoad(K, P, Ws(G.RUNWAY), 7.5, { ruts: false, smooth: 0 }));

  // woods and copses; a corridor kept clear of every route, road and the river
  const R = routes();
  const lines = [...R.blue.flat().map((r) => r.line), ...R.back.map((r) => r.line), ...[G.ROAD_A, G.ROAD_B, G.ROAD_E, G.ROAD_N, G.RUNWAY].map(Ws)];
  const near = (x, y, d) => lines.some((l) => l.some((p) => Math.hypot(p[0] - x, p[1] - y) < d));
  const river = Ws(G.RIVER);
  const nearRiver = (x, y) => river.some((p, i) => i && (() => {
    const q = river[i - 1], dx = p[0] - q[0], dy = p[1] - q[1], t = df_clamp01(((x - q[0]) * dx + (y - q[1]) * dy) / (dx * dx + dy * dy));
    return Math.hypot(q[0] + dx * t - x, q[1] + dy * t - y) < 12;
  })());
  const hubs = [...G.COYS.map(([X, p]) => W([X, p])), ...G.HOME, ...G.BLOCK, W([-40, -140]), W([150, -60])];
  const clear = (x, y) => near(x, y, 15) || nearRiver(x, y) || hubs.some((h) => Math.hypot(h[0] - x, h[1] - y) < 24);
  const woods = [
    [[-200, -150], 46, 21, 0.7, 22],
    [[-8, 140], 40, 22, 0.6, 22],
    [[-220, 210], 40, 23, 0.8, 14],
    [[210, -100], 36, 24, 0.8, 16],
    [[90, -230], 50, 25, 0.5, 18],
    [[-110, -230], 46, 26, 0.6, 16],
    [[230, 100], 34, 27, 0.8, 12],
    [[120, 100], 26, 28, 0.8, 10],
    [[-60, 220], 30, 29, 0.8, 10],
  ];
  for (const [[X, p], r, seed, sq, n] of woods) {
    const [cx, cy] = W([X, p]);
    const ring = fdBlob(cx, cy, r, seed, 0.12, 40, sq);
    const trees = trScatter(ring, n, { seed, gap: 6.4, r: [3, 4.6], h: [8, 12.5], avoid: (x, y) => clear(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // hedgerows along some fields
  for (const [pts, seed] of [
    [[[-96, 234], [-90, 180], [-20, 176]], 51], [[[16, 230], [20, 170]], 52], [[[96, 232], [100, 178], [160, 182]], 53],
    [[[200, -40], [250, -46]], 54], [[[114, 28], [118, -8]], 55],
  ]) items.push(...trHedge(K, P, Ws(pts), { seed }));

  // the crossroads village, the depot at the hub, the airfield's hangars, farms
  const house = (X, p, ang, len, wid) => { const [x, y] = W([X, p]); return trHouse(K, P, x, y, ang, len, wid); };
  items.push(
    house(48, -60, 55, 10, 7), house(84, -56, 325, 9, 6.5), house(44, -24, 325, 9, 6.5), house(88, -16, 55, 10, 7),
    house(-40, -140, 55, 14, 8), house(-58, -156, 55, 12, 7.5), house(-22, -158, 325, 12, 7.5),
    house(126, -50, 325, 16, 10), house(162, -52, 325, 14, 9),
    house(8, 6, 55, 10, 7), house(-200, -30, 325, 10, 7), house(214, -16, 55, 10, 7), house(-130, 120, 325, 9, 6.5),
  );
  items.push(stack(K, P, -30, -122), stack(K, P, -44, -118), stack(K, P, -18, -138, 2));
  items.push(bridge(K, P));

  // the relief, drawn over the flat cover
  g(trRelief(K, P, T));

  // the enemy companies' prepared positions at the four points, facing the blue side
  for (const [X, p] of G.COYS) for (const [dX, dp] of G.VEH) { const [x, y] = W([X + dX, p + dp]); items.push(...scrape(K, P, x, y, T.height(x, y), DF_DOWN)); }

  // control measure: the blue line of departure on pegs across the front
  const ld = trChalk(K, P, T, Ws([[-200, 82], [-140, 80], [-80, 82], [-20, 80], [40, 82], [100, 80], [156, 82], [204, 80]]));
  g(ld.ground); items.push(...ld.items);

  return { ground: ground.join(""), items };
}

// Where every vehicle stands and who fires at whom, for a model state. M carries what the page
// measures between frames: t (seconds, for fire and trucks), col (the collapse, eased) and dir[i]
// (+1 while battalion i advances, -1 while it goes back on a reset). Defaults serve the first frame.
export function fieldPose(S, GEO, T, M = {}) {
  const G = FG, R = routes();
  const units = [];
  const add = (u) => { u.z = T.height(u.x, u.y); units.push(u); };
  const props = S.props || [0, 0, 0, 0];
  const out = props.map((p) => propState(p, MODEL).out);
  const load = keyLoad(out, MODEL);
  const col = M.col ?? (S.failed ? 1 : 0);
  const dir = M.dir || [1, 1, 1, 1];
  const smoke = [];
  const exitAt = (k) => W([-60 + (k % 7) * 18, -250 - Math.floor(k / 7) * 16]);
  let ek = 0;

  // --- the arc: nine mechanized companies; the four on the points pull back to the crossroads when attacked ---
  const held = [0, 0, 0, 0];
  G.COYS.forEach(([X, p0, dp], c) => {
    const q0 = dp >= 0 ? df_smooth(0.3, 0.62, props[dp]) : 0;
    if (dp >= 0) held[dp] = 1 - q0;
    G.VEH.forEach(([dX, dpp], v) => {
      const [hx, hy] = W([X + dX, p0 + dpp]);
      // the company's third platoon is hit at the point and stays there (greyed)
      if (dp >= 0 && v === 2 && out[dp] > 0.5) {
        add({ id: `e${c}${v}`, side: "hx", face: DF_DOWN, x: hx, y: hy });
        smoke.push([hx, hy]);
        return;
      }
      let x = hx, y = hy, face = DF_DOWN;
      if (dp >= 0) {
        const q = df_smooth(0, 1, q0 * 1.15 - v * 0.075);
        const r = R.back[dp], at = r.at(q * r.length), [ox, oy] = W([dX * 0.9, dpp]);
        if (q > 0) { x = at.x + ox * (1 - q) + ox * 0.6 * q; y = at.y + oy; face = q > 0.97 ? DF_DOWN : df_ang(DF_DOWN, at.face, Math.min(1, q / 0.12)); }
      }
      if (col > 0) {
        const e = exitAt(ek);
        if (c % 3 === 1 && v === 0) { add({ id: `e${c}${v}`, side: "hx", face, x, y }); smoke.push([x, y]); ek++; return; }   // left behind
        [x, y] = df_lerp([x, y], e, df_smooth(0, 1, col * 1.1 - (ek % 9) * 0.01));
        face = df_ang(face, DF_UP, df_smooth(0, 0.25, col));
      }
      ek++;
      add({ id: `e${c}${v}`, side: "h", face, x, y, dp, hold: dp >= 0 ? (1 - q0) * (1 - col) : 1 - col });
    });
  });

  // --- the tank-battalion reserve (lit) at the crossroads: its companies leave the laager to block each lost point ---
  const sh = MODEL.shares;
  G.HOME.forEach((home, j) => {
    const pair = G.ASSIGN[j];
    const wsum = pair.reduce((a, i) => a + out[i] * sh[i], 0);
    const d = Math.max(wsum, 35);
    let [cx, cy] = home;
    let tgt = null, best = 0;
    for (const i of pair) {
      const w = (out[i] * sh[i]) / d;
      const off = W([(j - 1) * 24, 0]), bx = G.BLOCK[i][0] + off[0], by = G.BLOCK[i][1] + off[1];
      cx += (bx - home[0]) * w; cy += (by - home[1]) * w;
      if (out[i] * sh[i] > best) { best = out[i] * sh[i]; tgt = i; }
    }
    const go = Math.min(1, Math.hypot(cx - home[0], cy - home[1]) / 12);
    const face0 = tgt === null ? DF_DOWN : df_face([cx, cy], G.HOLD[tgt]);
    [0, 1, 2].forEach((v) => {
      const lag = W([0, (v - 1) * 12]), line = W([(v - 1) * 9, v === 1 ? 3 : 0]);
      let x = cx + lag[0] + (line[0] - lag[0]) * go, y = cy + lag[1] + (line[1] - lag[1]) * go, face = face0;
      if (col > 0) {
        if (j === 1 && v === 1) { add({ id: `r${j}${v}`, side: "hx", face, x, y, tgt: null, spread: 0 }); smoke.push([x, y]); ek++; return; }   // caught and stopped
        const e = exitAt(ek);
        [x, y] = df_lerp([x, y], e, df_smooth(0, 1, col));
        face = df_ang(face, DF_UP, df_smooth(0, 0.25, col));
      }
      ek++;
      add({ id: `r${j}${v}`, side: "h", lit: true, face, x, y, tgt: v === 1 ? tgt : null, spread: Math.min(1, wsum / 35) });
    });
  });

  // --- the blue teams: from the assembly area to each point, then hold it ---
  for (let i = 0; i < 4; i++) {
    const q = df_smooth(0, 0.62, props[i]);
    R.blue[i].forEach((r, j) => {
      // the team's last platoon is hit on the way in: it stops short and stays (greyed)
      const ko = j === 5 && q >= 0.8;
      const qj = j === 5 ? Math.min(q, 0.8) : q;
      const p = r.at(qj * r.length);
      let face = p.face;
      if (dir[i] < 0 && q > 0.02 && q < 0.98 && !ko) face += 180;
      if (q > 0.97 && !ko) face = df_ang(face, DF_UP, (q - 0.97) / 0.03);
      add({ id: `b${i}${j}`, side: ko ? "fx" : "f", face, x: p.x, y: p.y, i, q, j });
      if (ko && out[i] > 0.5) smoke.push([p.x, p.y]);
    });
    // casualty evacuation: an ambulance shuttles from the seized point back to the line of departure
    if (out[i] > 0.99 && props[i] > 0.97) {
      const r = R.blue[i][1], L = r.length;
      const ph = ((((M.t ?? 0) / 14) + i * 0.27) % 1 + 1) % 1, goBack = ph < 0.5;
      const u = goBack ? 0.9 - 0.9 * (ph / 0.5) : 0.9 * ((ph - 0.5) / 0.5);
      const p = r.at(u * L), F = fdFrame(p.x, p.y, p.face), [x, y] = F(0, 6);
      add({ id: `m${i}`, side: "f", kind: "t", face: p.face + (goBack ? 180 : 0), x, y });
    }
  }

  // --- the enemy's supply trucks between the depot and the bridge and crossroads; they stop at a lost one ---
  const depot = W([-26, -128]);
  [[1, 0], [2, 0.5]].forEach(([i, ph0], n) => {
    const end = W(i === 1 ? [-46, -70] : [44, -62]);
    const ph = ((((M.t ?? 0) / G.TRUCK_PERIOD) + ph0) % 1 + 1) % 1;
    const goOut = ph < 0.5;
    let u = goOut ? ph / 0.5 : 1 - (ph - 0.5) / 0.5;
    const cut = Math.max(out[i], col);
    const at = df_lerp(df_lerp(depot, W([-14 + n * 14, -124 - n * 4]), cut), end, u * (1 - cut));
    const face = df_face(depot, end) + (goOut ? 0 : 180);
    add({ id: `k${n}`, side: "h", kind: "t", face: cut > 0.5 ? df_face(depot, end) + 180 : face, x: at[0], y: at[1] });
  });

  // --- fire ---
  const streams = [];
  const gunAt = (u) => { const F = fdFrame(u.x, u.y, u.face); return [...F(4.2, 0), u.z + 3.1]; };
  const aim = (u) => [u.x, u.y, u.z + 1.8];
  for (let i = 0; i < 4; i++) {
    const fight = df_smooth(0.04, 0.14, props[i]) * (1 - df_smooth(0.42, 0.58, props[i])) * (1 - col);
    if (fight < 0.02) continue;
    const reds = units.filter((u) => u.side === "h" && u.dp === i), bn = units.filter((u) => u.id.startsWith(`b${i}`) && u.side === "f" && u.j < 3);
    if (!reds.length) continue;
    bn.forEach((u, j) => streams.push({ id: u.id, side: "f", heavy: true, smoke: true, from: gunAt(u), to: reds.map(aim), period: 1.3 + j * 0.23, burst: 1, gap: 0, flight: 0.45, phase: i * 0.37 + j * 0.41, on: fight, scatter: 3 }));
    reds.slice(0, 2).forEach((e, k) => streams.push({ id: e.id, side: "h", heavy: true, from: gunAt(e), to: bn.map(aim), period: 1.2 + k * 0.3, burst: 2, gap: 0.16, flight: 0.45, phase: 0.2 + i * 0.29 + k * 0.5, on: 0.9 * fight, scatter: 3 }));
  }
  // the reserve engaging the battalions on the points it blocks
  units.filter((u) => u.id.startsWith("r") && u.tgt != null && u.side === "h").forEach((u, j) => {
    const bn = units.filter((b) => b.id.startsWith(`b${u.tgt}`) && b.side === "f" && b.j < 3);
    const on = 0.55 * u.spread * df_smooth(0.6, 0.95, out[u.tgt]) * (1 - col);
    if (on > 0.02) streams.push({ id: u.id, side: "h", heavy: true, from: gunAt(u), to: bn.map(aim), period: 2.4 + j * 0.3, burst: 1, gap: 0, flight: 0.7, phase: 0.5 + j * 0.6, on, scatter: 4 });
  });
  smoke.forEach((pt) => { pt[2] = T.height(pt[0], pt[1]) + 3; });
  return { units, streams, held, load, col, out, smoke, cas: losses(out, S.failed && !S.resetting) };
}

// Thin smoke rising from stopped vehicles: a pure function of time, merged into the fire layer's smoke.
export function fieldSmoke(pose, t) {
  const out = [];
  pose.smoke.forEach(([x, y, z], n) => {
    for (let k = 0; k < 3; k++) {
      const age = (((t / 4.2) + k / 3 + n * 0.13) % 1 + 1) % 1;
      out.push({ p: [x - 2.2 * age * 4.2, y - 3.4 * age * 4.2, z + age * 7], age });
    }
  });
  return out;
}

// Per-state ground marks: each enemy company's fire sector toward the blue side, fading as it pulls back.
export function fieldMarks(K, P, T, pose) {
  return FG.HOLD.map(([x, y], i) => trFan(K, P, T, x, y, 9, 40, DF_DOWN - 32, DF_DOWN + 32, { side: "h", arcs: 1, alpha: 0.8 * pose.held[i] * (1 - pose.col) })).join("");
}

// A supply truck at the origin facing `face` (as in Fig 3): cab, cargo box and chassis, about 7 units long.
export function dfTruck(K, P, face = 0) {
  const P0 = { ...P, origin: [0, 0] };
  const F = fdFrame(0, 0, face);
  const parts = [
    [[-3.6, 1.4, -1.35, 1.35, 0.7, 3.4], false],
    [[1.8, 3.6, -1.2, 1.2, 0.7, 2.7], false],
    [[-3.4, 3.4, -1.25, 1.25, 0.25, 0.7], true],
  ].map(([[u0, u1, v0, v1, z0, z1], gear]) => {
    const ring = boxRing(F, u0, u1, v0, v1);
    const c = F((u0 + u1) / 2, (v0 + v1) / 2);
    return [K.depthOf([c[0], c[1], (z0 + z1) / 2], P0), trPrism(K, P0, ring, z0, z1, gear)];
  }).sort((a, b) => a[0] - b[0]);
  return `<path class="tr-shadow" d="${K.onTop(boxRing(F, -4, 4, -1.8, 1.8), 0, P0, true)}"/>` + parts.map((p) => p[1]).join("");
}
