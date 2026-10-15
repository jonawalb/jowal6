// The Battlefield view of Movement Techniques, at squad scale, drawn with the terrain kit
// (../../kit/terrain.mjs). The same model state S as the machine drives it:
//   S.s       the squad's progress along its route (route units, as the machine's rail)
//   S.w       eased weights of the three techniques (traveling, traveling overwatch, bounding overwatch)
//   S.method  "alternating" | "successive" bounds
//   S.adv     the squad is advancing (false while a contact is being fought)
//   S.contact an enemy position ahead has opened fire; S.tc seconds since (model seconds); S.e which
//   S.ctech   the technique in force when contact was made (0, 1, 2)
// fieldStatic() builds the ground and everything that never moves (build only); fieldPose() places
// every soldier and fire stream for a state (build and page); fieldMarks() draws the overwatch fans.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { squad, losses, supportSeconds, downCounts } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trWall, trHouse, trHole, trNest, trFan, trChalk, trFireTeam, trPlace, trRoute, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

const FS_C = Math.SQRT1_2;
const FS_RAD = Math.PI / 180;
// the ground is drawn in (u along the route, v across it); world (x, y) is that frame turned 45 degrees,
// so the route runs left to right across the card and +v is toward the viewer
export const FW = (u, v) => [(u + v) * FS_C, (v - u) * FS_C];

export const FG = {
  world: { x: -270, y: -270, w: 540, d: 540 },
  ROUTE_UV: [[-215, 20], [-160, 14], [-110, 16], [-55, 6], [0, -4], [55, 6], [105, 16], [155, 10], [215, 6]],
  START: 105,         // route arc length at squad progress s = 0 (the rear team trails behind it)
  FK: 0.45,            // field units per route unit
  LANE: 0.45,          // field units per unit of the model's bounding lane offset
  PLD: 128,           // probable line of deployment, route units
  RANGE: 36,          // the overwatching weapons' reach drawn on the ground (notional), field units
  // enemy outposts, in (u, v): a hole and a nest on a low rise, one on each side of the route
  OUT: [{ u: -63, v: -38, face: 45 }, { u: -8, v: 34, face: 225 }],  // on the route at the model's OUTPOSTS
  DOWN_BLUE: ["r", "gr", "ar"],
};
const [E1x, E1y] = FW(FG.OUT[0].u, FG.OUT[0].v), [E2x, E2y] = FW(FG.OUT[1].u, FG.OUT[1].v);
const [K1x, K1y] = FW(-130, -42), [K2x, K2y] = FW(-100, 58), [K3x, K3y] = FW(22, -48);
FG.TERRAIN = {
  rises: [
    { cx: E1x, cy: E1y, r: 21, steps: 3, h: 1.2, top: 0.5, seed: 5, wobble: 0.08 },
    { cx: E2x, cy: E2y, r: 21, steps: 3, h: 1.2, top: 0.5, seed: 9, wobble: 0.08 },
    { cx: K1x, cy: K1y, r: 17, steps: 3, h: 1.5, top: 0.45, seed: 31, wobble: 0.12 },
    { cx: K2x, cy: K2y, r: 15, steps: 2, h: 1.3, top: 0.5, seed: 33, wobble: 0.12 },
    { cx: K3x, cy: K3y, r: 17, steps: 3, h: 1.6, top: 0.45, seed: 37, wobble: 0.12 },
  ],
};

const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let ROUTE = null;
const route = () => ROUTE || (ROUTE = trRoute(FG.ROUTE_UV.map(([u, v]) => FW(u, v)), 6));
export const fieldTerrain = () => trTerrain(FG.TERRAIN);
// world point and heading on the route at arc length `arc`, `lat` to the left of it
const onRoute = (arc, lat = 0) => {
  const r = route().at(arc), f = r.face * FS_RAD;
  return { x: r.x - Math.sin(f) * lat, y: r.y + Math.cos(f) * lat, face: r.face };
};
export const fieldArc = (s) => FG.START + FG.FK * s;

export function fieldStatic(K, P, T) {
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const uv = (pts) => pts.map(([u, v]) => FW(u, v));
  g(trGroundPlane(K, P, FG.world));

  // meadows and fields: the open ground the squad crosses, with wood and hedge round it
  for (const [u, v, r, seed, sq] of [[-62, 50, 28, 3, 0.6], [14, -22, 26, 5, 0.7], [-136, -6, 24, 7, 0.6], [14, 44, 20, 9, 0.6]]) { const [cx, cy] = FW(u, v); g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq))); }
  const fields = [
    [[[-86, 30], [-42, 28], [-40, 58], [-88, 62]], 8, "a"],
    [[[-148, 28], [-120, 30], [-122, 60], [-150, 56]], 7, "b"],
    [[[-112, -36], [-86, -38], [-86, -62], [-114, -60]], 7, "a"],
    [[[-36, -34], [-14, -36], [-12, -60], [-34, -58]], 5, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, uv(ring), { furrows: n, tint }));
  // a stream along the far edge, and the farm track the squad walks
  g(trStream(K, P, uv([[-240, -68], [-150, -66], [-60, -64], [30, -68], [130, -62]]), 3, 5));
  g(trRoad(K, P, uv([[-290, 24], ...FG.ROUTE_UV, [290, 4]]), 2.4, { ruts: false }));

  // woods: one behind the far outpost, copses at the edges, kept off the route
  const woods = [
    [fdBlob(...FW(-50, -60), 18, 21, 0.12, 40, 0.55), 10, 21],
    [fdBlob(...FW(-144, 56), 14, 22, 0.12, 40, 0.8), 6, 22],
    [fdBlob(...FW(22, 52), 16, 23, 0.12, 40, 0.7), 7, 23],
    [fdBlob(...FW(34, -26), 14, 24, 0.12, 40, 0.8), 6, 24],
    [fdBlob(...FW(-60, 60), 10, 25, 0.12, 40, 0.8), 4, 25],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-86, 30], [-42, 28]], 51], [[[-88, 62], [-86, 30]], 52], [[[-148, 28], [-120, 30]], 54], [[[-112, -36], [-86, -38]], 55]])
    items.push(...trHedge(K, P, uv(pts), { seed }));
  items.push(...trWall(K, P, uv([[24, 14], [30, 24], [30, 34]])));
  items.push(trHouse(K, P, ...FW(40, 40), 110, 12, 8, 4.4, 7.6));

  g(trRelief(K, P, T));

  // the two outposts: an MG nest and two two-man holes each, empty until they open fire
  for (const o of FG.OUT) {
    const F = fdFrame(...FW(o.u, o.v), o.face);
    const [nx, ny] = F(0, 0), [hx, hy] = F(-1.5, 11), [jx, jy] = F(-1.5, -11);
    items.push(...trNest(K, P, nx, ny, T.height(nx, ny), o.face));
    items.push(...trHole(K, P, hx, hy, T.height(hx, hy), o.face));
    items.push(...trHole(K, P, jx, jy, T.height(jx, jy), o.face));
  }
  // one control measure: the probable line of deployment across the route (ATP 3-21.8, para 6-66)
  const a = fieldArc(FG.PLD), r0 = onRoute(a, -15), r1 = onRoute(a, 15);
  const pld = trChalk(K, P, T, [[r0.x, r0.y], [r1.x, r1.y]]);
  g(pld.ground); items.push(...pld.items);
  return { ground: ground.join(""), items };
}

// Where every soldier stands and who fires at whom, for a model state.
export function fieldPose(S, T, M = {}) {
  const G = FG, men = [];
  const add = (m) => { m.z = T.height(m.x, m.y); men.push(m); };
  const q = squad(S.s, S.w, S.method);
  const dom = S.w.indexOf(Math.max(...S.w));
  const wb = S.w[2];
  const contact = !!S.contact, tc = contact ? S.tc : -1;
  const ct = S.ctech ?? dom, Ts = supportSeconds(ct), LS = losses(ct);
  // which team is hit and which supports: in bounding the bounding team is where contact is made
  const lead = q.a >= q.b ? "a" : "b";
  const hit = q.moving || lead, sup = hit === "a" ? "b" : "a";
  const DC = contact ? downCounts(ct, tc) : { blue: 0, red: 0 };
  const downB = new Set(G.DOWN_BLUE.slice(0, DC.blue).map((r) => `${hit}-${r}`));

  // --- the squad: two fire teams in wedge and the squad leader, on the route ---
  const teams = { a: { arc: fieldArc(q.a), lat: q.la * G.LANE }, b: { arc: fieldArc(q.b), lat: q.lb * G.LANE } };
  for (const id of ["a", "b"]) {
    const t = teams[id], A = onRoute(t.arc, t.lat);
    const moving = S.adv && !(wb > 0.5 && q.moving !== id);
    const prone = contact && tc >= (id === hit ? 0.4 : 0.7);
    const pose = prone ? "prone" : moving ? "stand" : "kneel";
    const st = moving ? strideAt(t.arc) : 0;
    trPlace(trFireTeam("wedge"), { x: A.x, y: A.y, face: A.face }).forEach((m) => {
      const mid = `${id}-${m.role}`;
      const down = downB.has(mid);
      add({ id: `q-${mid}`, side: down ? "fc" : "f", lit: id === "a" && !down, role: m.role, tm: id, pose: down ? "prone" : pose, stride: down ? 0 : st, face: down ? A.face + 25 : A.face, x: m.x, y: m.y });
    });
  }
  {
    // the squad leader stays with the halted team in bounding (ATP 3-21.8, para 3-80), else between the teams
    const A = onRoute(fieldArc(q.sl), 1.5);
    const pose = contact && tc >= 0.7 ? "kneel" : S.adv ? "stand" : "kneel";
    add({ id: "q-sl", side: "f", lit: true, role: "sl", pose, stride: S.adv ? strideAt(fieldArc(q.sl)) : 0, face: A.face, x: A.x, y: A.y });
  }

  // --- the enemy outpost that opened fire: appears at contact, loses men once the support is on it ---
  const fan = [];
  const enemy = [];
  if (contact) {
    const o = G.OUT[S.e], F = fdFrame(...FW(o.u, o.v), o.face);
    const spots = [["mg", "mg", 0, 0.9], ["ag", "r", 0, -0.9], ["a1", "tl", -1.5, 11 + 1.1], ["a2", "ar", -1.5, 11 - 1.1], ["b1", "gr", -1.5, -11 + 1.1], ["b2", "r", -1.5, -11 - 1.1]];
    const order = ["b2", "a2", "ag", "b1", "a1", "mg"];
    const downR = new Set(order.slice(0, DC.red));
    for (const [id, role, du, dv] of spots) {
      const [x, y] = F(du, dv), down = downR.has(id);
      const m = { id: `e${S.e}-${id}`, side: down ? "hc" : "h", role, pose: down ? "prone" : "hole", stride: 0, face: o.face + 180 + (down ? 20 : 0), x, y, b: o.face };
      add(m); if (!down) enemy.push(m);
    }
    { const [x, y] = F(-8, 0); add({ id: `e${S.e}-sl`, side: "h", role: "sl", pose: downR.size >= 5 ? "prone" : "kneel", face: o.face + 180, x, y }); }
  }

  // --- fire ---
  const byId = Object.fromEntries(men.map((m) => [m.id, m]));
  const aim = (m) => trAimPoint(m, m.x, m.y, m.z), muzzle = (m) => trMuzzle(m, m.x, m.y, m.z);
  const streams = [];
  if (contact) {
    const us = men.filter((m) => m.side === "f" && m.tm === hit);
    const them = men.filter((m) => m.side === "h" && m.id.startsWith(`e${S.e}-`) && m.role !== "sl");
    const supp = smooth01(Ts, Ts + 3.2, tc);
    const e0 = 1 - 0.85 * supp;
    for (const m of them) streams.push({ id: m.id, side: "h", heavy: m.role === "mg", from: muzzle(m), to: us.length ? us.map(aim) : [], period: m.role === "mg" ? 1.9 : 2.7 + (m.x % 1), burst: m.role === "mg" ? 3 : 1, gap: 0.1, flight: 0.4, phase: (m.y * 0.37) % 1.3, on: (m.role === "mg" ? 0.95 : 0.7) * e0, scatter: 3 });
    const tgt = them.map(aim);
    for (const m of men.filter((x) => x.side === "f" && x.tm === sup && (x.role === "ar" || x.role === "tl" || x.role === "gr")))
      streams.push({ id: m.id, side: "f", heavy: m.role === "ar", smoke: m.role === "ar", from: muzzle(m), to: tgt, period: m.role === "ar" ? 1.6 : 2.5, burst: m.role === "ar" ? 3 : 1, gap: 0.09, flight: 0.45, phase: (m.x % 1) + 0.2, on: smooth01(Ts, Ts + 0.35, tc), scatter: 2.4 });
    for (const m of us.filter((x) => x.role === "ar" && x.side === "f"))
      streams.push({ id: `${m.id}-r`, side: "f", heavy: true, from: muzzle(m), to: tgt, period: 2.1, burst: 2, gap: 0.1, flight: 0.4, phase: 0.6, on: smooth01(1.2, 1.8, tc) * (1 - 0.4 * supp), scatter: 2.6 });
  }

  // overwatch fans: the halted team's sector in bounding, the trailing team's while traveling overwatch
  const sector = (id, alpha) => { const A = onRoute(teams[id].arc, teams[id].lat); return { x: A.x, y: A.y, face: A.face, alpha }; };
  if (wb > 0.05) fan.push(sector(q.overwatch === "a" ? "a" : "b", smooth01(0.4, 0.9, wb)));
  if (S.w[1] > 0.05) fan.push(sector("b", 0.55 * smooth01(0.3, 0.9, S.w[1])));
  return { men, streams, fan, q, hit, sup, LS, Ts, byId, DC };
}

export function fieldMarks(K, P, T, pose) {
  return pose.fan.map((f) => trFan(K, P, T, f.x, f.y, 5, FG.RANGE, f.face - 38, f.face + 38, { side: "f", arcs: 1, alpha: f.alpha })).join("");
}
