// The Battlefield view of Friction, drawn with the terrain kit (../../kit/terrain.mjs): a concrete
// small-unit vignette. A mounted platoon of four vehicles marches along a farm track from a start
// point to a release point. The plan ("war on paper") is a chalk route on pegs beside the track, a
// peg every 10 planned minutes, and a pale ghost vehicle that keeps the plan's timetable. What
// happens is the machine's run, read through the same state:
//   run.x      the block's travel: here the platoon lead's distance along the route (FG.K units per cm)
//   run.grit   the grit grains: here incidents at the same random points (bog, wrong turn, radio,
//              fog, contact; incidentKinds() in model.mjs gives each grain its kind)
//   run.on     the grain the block is stalled on: the incident in progress; how far the pull has
//              built toward breakaway sets how far the incident has played out (0..1)
//   mu         the friction coefficient: how much goes wrong all the time (more mud on the track)
// Casualties come from contactLoss() in model.mjs (notional). Nothing here is a second model.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame, fdPeg } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trChalk, trObjective, trRoute, trFireTeam, trMorph, trPlace, trMuzzle, trAimPoint, trFaceStep } from "../../kit/terrain.mjs";
import { MODEL, FIELD, rng, tension, breakaway, steadyPull, incidentKinds, contactLoss, paperXAt } from "./model.mjs";

export const FG = {
  world: { x: -400, y: -320, w: 800, d: 640 },
  // the farm track: the platoon's route, run well past the visible ground at both ends
  ROUTE: [[-330, 96], [-250, 78], [-180, 62], [-128, 52], [-92, 44], [-58, 28], [-24, 16], [10, 16], [44, 6], [76, -10], [108, -22], [140, -28], [200, -36], [330, -52]],
  SP_X: -90,          // the start point sits on the track here
  RP_X: 88,           // the release point
  PLAN_V: 8,           // the chalk route runs this far to the left of the track
  GAP: 14,             // vehicle spacing in the column (notional)
  SLOW: 0.5,           // the battlefield plays the model's run at this rate, so the incidents can be followed
  PEG_MIN: [10, 20, 30, 40],   // timeline pegs: planned minutes
  SPUR: [-58, 46],     // the wrong turn's track: angle off the route (degrees) and length
  OP: [16, 30],        // the enemy outpost in a contact: ahead of the incident and to the left
  PUDDLES: 70,         // mud and puddles shown at the highest friction
};
FG.TERRAIN = {
  rises: [
    { cx: 150, cy: 70, r: 34, steps: 3, h: 1.6, top: 0.45, seed: 11, wobble: 0.1, squash: 0.8 },
    { cx: -40, cy: -110, r: 36, steps: 2, h: 1.6, top: 0.5, seed: 17, wobble: 0.12, squash: 0.7 },
    { cx: -150, cy: 150, r: 30, steps: 2, h: 1.5, top: 0.5, seed: 23, wobble: 0.12 },
  ],
};

const FR_RAD = Math.PI / 180;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth01 = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const angLerp = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

// ---------- the route and the model-to-route mapping (built once) ----------
let FR_R = null;
export function route() {
  if (FR_R) return FR_R;
  const road = trRoute(FG.ROUTE, 6);
  const near = (x) => { let b = 0, d = 1e9; for (let s = 0; s <= road.length; s += 0.25) { const e = Math.abs(road.at(s).x - x); if (e < d) { d = e; b = s; } } return b; };
  const sSP = near(FG.SP_X), sRP = near(FG.RP_X);
  FR_R = { road, sSP, sRP, K: (sRP - sSP) / MODEL.travel };
  return FR_R;
}
// A point beside the route at road distance s: u along it, v to its left.
export const beside = (s, u = 0, v = 0) => { const p = route().road.at(s); const [x, y] = fdFrame(p.x, p.y, p.face)(u, v); return { x, y, face: p.face }; };
const sOf = (x) => route().sSP + x * route().K;

// The places of a run's incidents: road distance, kind, and (for a wrong turn) the spur's direction.
export function incidents(run, seed, gritOn) {
  if (!gritOn) return [];
  const kinds = incidentKinds(seed, run.grit.length);
  return run.grit.map((g, i) => {
    const s = sOf(g.at), p = route().road.at(s);
    return { g, i, s, kind: kinds[i], face: p.face, x: p.x, y: p.y };
  });
}
// The wrong turn's spur, and the enemy outpost, for an incident.
const spurAt = (inc, e) => { const a = (inc.face + FG.SPUR[0]) * FR_RAD; return [inc.x + Math.cos(a) * e, inc.y + Math.sin(a) * e]; };
const opAt = (inc) => fdFrame(inc.x, inc.y, inc.face)(FG.OP[0], FG.OP[1]);

// ---------- static ground (build only) ----------
export function fieldStatic(K, P, T) {
  const G = FG, R = route();
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  g(trGroundPlane(K, P, G.world));
  // keep the route, the spurs' sweep (right of the route) and the outposts' sweep (left) clear of cover
  const line = R.road.line;
  const offRoute = (x, y) => {
    let best = 1e9, side = 0;
    for (let i = 1; i < line.length; i++) {
      const [ax, ay] = line[i - 1], [bx, by] = line[i];
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L));
      const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
      if (d < best) { best = d; side = Math.sign(dx * (y - ay) - dy * (x - ax)); }
    }
    return { d: best, left: side > 0 };
  };
  const busy = (x, y) => {
    const o = offRoute(x, y);
    if (x > G.SP_X - 30 && x < G.RP_X + 20) return o.d < (o.left ? 58 : 66);
    return o.d < 20;
  };

  for (const [cx, cy, r, seed, sq] of [[-60, 110, 52, 3, 0.6], [40, -80, 48, 5, 0.6], [-230, -10, 50, 7, 0.8], [210, 30, 40, 9, 0.8], [90, 110, 34, 11, 0.7]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[-150, -60], [-96, -64], [-92, -20], [-146, -14]], 8, "a"],
    [[[-40, -60], [10, -66], [14, -26], [-36, -18]], 7, "b"],
    [[[40, -84], [96, -92], [100, -56], [46, -46]], 7, "a"],
    [[[-120, 110], [-60, 104], [-56, 150], [-118, 156]], 8, "b"],
    [[[10, 90], [70, 82], [74, 126], [14, 134]], 7, "a"],
    [[[-250, 60], [-200, 54], [-196, 100], [-248, 108]], 7, "a"],
    [[[180, -110], [240, -116], [244, -76], [184, -70]], 7, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));

  // a stream well right of the route, the farm track itself, a lane to the farm
  g(trStream(K, P, [[-360, -150], [-250, -134], [-150, -126], [-60, -150], [30, -140], [130, -150], [230, -170], [360, -160]], 3.2, 5));
  g(trRoad(K, P, G.ROUTE, 3.6));
  g(trRoad(K, P, [[-300, -260], [-200, -190], [-180, -100], [-176, -10], [-170, 40], [-168, 58]], 2.2, { ruts: false }));

  // woods beyond the cleared sweep, copses toward the edges
  const woods = [
    [fdBlob(-10, 120, 40, 21, 0.12, 44, 0.6), 18, 21],
    [fdBlob(120, -110, 40, 22, 0.12, 40, 0.6), 16, 22],
    [fdBlob(-220, 140, 40, 23, 0.12, 40, 0.8), 18, 23],
    [fdBlob(-200, -80, 36, 24, 0.12, 40, 0.8), 14, 24],
    [fdBlob(230, -20, 44, 25, 0.12, 40, 0.8), 18, 25],
    [fdBlob(-80, -150, 34, 26, 0.12, 40, 0.7), 12, 26],
    [fdBlob(100, 150, 34, 27, 0.12, 40, 0.8), 12, 27],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 6.2, r: [2.8, 4.4], h: [8, 12], avoid: (x, y) => busy(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    if (!trees.length) continue;
    const w = trWood(K, P, T, ring, trees);
    g(w.floor);
    items.push(...w.items);
  }
  for (const [pts, seed] of [[[[-150, -60], [-96, -64]], 51], [[[-120, 110], [-60, 104]], 52], [[[180, -110], [240, -116]], 53], [[[-250, 60], [-200, 54]], 54]]) items.push(...trHedge(K, P, pts, { seed }));
  // a farm by the lane, near the start point
  for (const [x, y, a, l, w] of [[-196, 34, 0, 12, 7.5], [-186, 14, 90, 10, 7], [-212, 18, 0, 9, 6.5]]) items.push(trHouse(K, P, x, y, a, l, w));

  g(trRelief(K, P, T));

  // the plan: a chalk route beside the track from the start point to the release point, with a peg at
  // each end and one every 10 planned minutes (the paper run's timetable from model.mjs)
  const pts = [];
  for (let s = R.sSP; s <= R.sRP + 1e-6; s += 3) { const p = beside(s, 0, G.PLAN_V); pts.push([p.x, p.y]); }
  const last = beside(R.sRP, 0, G.PLAN_V); pts.push([last.x, last.y]);
  const chalk = trChalk(K, P, T, pts, { pegs: false });
  g(chalk.ground);
  const pegS = [R.sSP, ...G.PEG_MIN.map((m) => sOf(paperXAt(m / FIELD.minPerSec))), R.sRP];
  for (const s of pegS) { const p = beside(s, 0, G.PLAN_V); items.push({ key: K.depthOf([p.x, p.y, 0], P), svg: fdPeg(K, P, p.x, p.y, T.height(p.x, p.y), 4.2) }); }
  // the release point's flag
  const rp = beside(R.sRP, 6, -11);
  items.push(trObjective(K, P, T, rp.x, rp.y, { h: 12, ang: 200 }));
  return { ground: ground.join(""), items };
}

// ---------- per-run ground marks: mud and puddles (friction), the bog, the spur, the outpost scrape ----------
const PUDDLE_AT = (() => {
  const r = rng(231), out = [];
  for (let i = 0; i < FG.PUDDLES; i++) out.push({ u: r(), v: (r() - 0.5) * 7, w: 1.2 + r() * 2.2, d: 0.7 + r() * 1.1, mud: r() < 0.55, seed: i });
  return out;
})();
export function fieldMarks(K, P, T, incs, mu) {
  const R = route(), out = [];
  const n = Math.round((mu / MODEL.mu[1]) * PUDDLE_AT.length);
  const span = R.sRP - R.sSP + 40;
  for (const q of PUDDLE_AT.slice(0, n)) {
    const p = beside(R.sSP - 20 + q.u * span, 0, q.v);
    const ring = fdBlob(0, 0, 1, q.seed, 0.25, 14).map(([a, b]) => fdFrame(p.x, p.y, p.face)(a * q.w, b * q.d));
    out.push(`<path class="${q.mud ? "fr-mud" : "tr-water"}" d="${K.onTop(ring, 0.16, P, true)}"/>`);
  }
  for (const inc of incs) {
    if (inc.kind === "bog") {
      const F = fdFrame(inc.x, inc.y, inc.face);
      out.push(`<path class="fr-mud fr-bog" d="${K.onTop(fdBlob(0, 0, 1, 40 + inc.i, 0.22, 30).map(([a, b]) => F(a * 9 - 1, b * 6)), 0.17, P, true)}"/>`);
    } else if (inc.kind === "turn") {
      out.push(trRoad(K, P, [spurAt(inc, 1.9), spurAt(inc, 12), spurAt(inc, 34), spurAt(inc, FG.SPUR[1] + 30)], 2.4, { ruts: false, smooth: 0 }));
    } else if (inc.kind === "contact") {
      const [ox, oy] = opAt(inc);
      const F = fdFrame(ox, oy, inc.face + 180 + 40);
      out.push(`<path class="tr-pit" d="${K.onTop([F(-2, -4), F(2, -4.4), F(2.4, 4), F(-1.8, 4.4)], T.height(ox, oy) + 0.05, P, true)}"/>`);
    }
  }
  return out.join("");
}

// ---------- the pose of everything that moves, for one state ----------
// run, seed, mu, gritOn: the machine's state. Returns { units, streams, fog }: units are vehicles
// (kind "v") and soldiers (kind "s"); fog is [{ x, y, a }] drifts over a fog incident.
export function fieldPose(run, seed, mu, gritOn, T, M = {}) {
  const G = FG, R = route();
  const units = [];
  const add = (u) => { u.z = T.height(u.x, u.y); units.push(u); };
  const incs = incidents(run, seed, gritOn);
  const sL = sOf(M.lead ?? run.x);
  const progress = (inc) => {
    if (run.on !== inc.g) return inc.g.crushed ? 1 : 0;
    const T0 = steadyPull(mu) - 0.4, T1 = breakaway(mu, inc.g.force);
    return clamp01((tension(run) - T0) / (T1 - T0));
  };
  const after = (inc) => (inc.g.crushed ? Math.max(0, (M.lead ?? run.x) - inc.g.at) : 0);   // cm past it

  // how the column bunches up (radio, fog, bog): 1 while stalled, relaxing as the lead pulls away
  let close = 0, tilt = 0;
  for (const inc of incs) {
    const q = progress(inc), act = run.on === inc.g;
    if (!act && !inc.g.crushed) continue;
    const c = act ? smooth01(0, 0.5, q) : Math.max(0, 1 - after(inc) / 14);
    if (inc.kind === "radio" || inc.kind === "fog" || inc.kind === "bog") close = Math.max(close, c);
    if (inc.kind === "bog") tilt = act ? 16 * smooth01(0, 0.3, q) * (1 - smooth01(0.85, 1, q)) : 0;
  }
  const turn = incs.find((inc) => inc.kind === "turn" && run.on === inc.g);
  const dTurn = turn ? 30 * Math.sin(Math.PI * progress(turn)) : 0;

  // --- the platoon: four vehicles in column on the track (lit) ---
  const veh = [];
  for (let j = 0; j < 4; j++) {
    const gap = G.GAP * (1 - 0.32 * close);
    let s = sL - j * gap, x, y, face;
    ({ x, y, face } = R.road.at(s));
    if (turn && j <= 1) {
      const e = dTurn - j * G.GAP;
      if (e > 0) {
        const q = progress(turn);
        [x, y] = spurAt(turn, e);
        face = angLerp(turn.face + G.SPUR[0], turn.face + G.SPUR[0] + 180, smooth01(0.42, 0.58, q));
      } else ({ x, y, face } = R.road.at(turn.s + e));
    }
    if (j === 0 && tilt) { [x, y] = fdFrame(x, y, face)(0, -1.2 * tilt / 16); face += tilt; }
    veh.push({ x, y, face, s });
    add({ id: `v${j}`, kind: "v", side: "f", lit: true, face, x, y });
  }
  // --- the plan: a pale ghost vehicle on the chalk route, keeping the paper timetable ---
  const gs = sOf(paperXAt(M.t ?? run.t));
  const gp = beside(Math.min(R.sRP, gs), 0, G.PLAN_V);
  add({ id: "ghost", kind: "v", side: "g", face: gp.face, x: gp.x, y: gp.y });

  // --- the incidents ---
  const streams = [], fog = [];
  const man = (id, side, x, y, face, pose, role, dist = 0, lit = false) => add({ id, kind: "s", side, lit, face, x, y, pose, role, stride: pose === "stand" && dist > 0 ? strideAt(dist) : 0 });
  for (const inc of incs) {
    const q = progress(inc), act = run.on === inc.g, done = inc.g.crushed;
    const F = fdFrame(inc.x, inc.y, inc.face);
    if (inc.kind === "bog" && act) {
      // the crew dismount and dig at the bogged vehicle's tracks; the next vehicle closes up to tow
      const v0 = veh[0], Fv = fdFrame(v0.x, v0.y, v0.face);
      const w = smooth01(0.05, 0.3, q);
      [[-6.5, 2.6, "tl"], [-6.5, -2.6, "r"], [1, 4.8, "r"]].forEach(([u, v, role], i) => {
        const [x, y] = lerp2(Fv(-2, v * 0.4), Fv(u, v), w);
        man(`b${i}`, "f", x, y, v0.face + (i === 2 ? -90 : 0), i === 2 ? "kneel" : w < 1 ? "stand" : "kneel", role, w * 8, true);
      });
    } else if (inc.kind === "radio" && act) {
      // the platoon leader and his radio operator stand by the lead vehicle; a runner goes down the column and back
      const v0 = veh[0], Fv = fdFrame(v0.x, v0.y, v0.face);
      const [ax, ay] = Fv(-1, 5), [bx, by] = Fv(-3, 7.4);
      man("r0", "f", ax, ay, v0.face + 160, "stand", "pl", 0, true);
      man("r1", "f", bx, by, v0.face + 200, "stand", "rto", 0, true);
      const L = 3 * G.GAP * (1 - 0.32 * close) - 4, k = Math.sin(Math.PI * q);
      const p = beside(veh[0].s - 3 - L * k, 0, 5);
      man("r2", "f", p.x, p.y, p.face + (q < 0.5 ? 180 : 0), "stand", "r", q < 0.5 ? L * k : 2 * L - L * k, true);
    } else if (inc.kind === "fog") {
      const a = act ? smooth01(0, 0.35, q) : done ? Math.max(0, 1 - after(inc) / 22) : 0;
      if (a > 0.01) [[0, 0, 22], [-24, 8, 18], [-40, -6, 20], [18, -10, 17], [-12, -18, 15], [30, 12, 15], [-58, 4, 16]].forEach(([u, v, r], i) => { const [x, y] = F(u, v); fog.push({ x, y, r, a, i }); });
      if (act) { const p = beside(inc.s + 7 + 5 * q, 0, -0.6); man("g0", "f", p.x, p.y, p.face, "stand", "tl", 5 * q, true); }   // a ground guide walks ahead
    } else if (inc.kind === "contact") {
      const loss = contactLoss(inc.g.force);
      const [ox, oy] = opAt(inc), oz = T.height(ox, oy);
      const toRoad = inc.face + 180 + 40;
      const Fo = fdFrame(ox, oy, toRoad);
      // the enemy outpost: two men lying in wait; at contact one is hit, the other pulls back
      const e0 = Fo(0, 1.6), e1 = Fo(0, -1.6);
      const hitR = act ? q >= 0.55 : done;
      man("e0", hitR ? "hk" : "h", e0[0], e0[1], toRoad, "prone", "ar");
      const back = act ? smooth01(0.62, 1, q) : done ? 1 : 0;
      if (!done) { const [x, y] = lerp2(e1, Fo(-24, -6), back); man("e1", "h", x, y, back > 0.02 ? toRoad + 180 : toRoad, back > 0.02 && back < 1 ? "stand" : "prone", "r", back * 24); }
      if (!act && !done) continue;                         // lying in wait: the platoon has not met them yet
      // a fire team dismounts from the second vehicle and returns fire; casualties go down; a medic comes up
      const sv = veh[1] || veh[0];
      const shoot = Math.atan2(oy - inc.y, ox - inc.x) / FR_RAD;
      const team = trFireTeam("line", 4.4);
      const out = act ? smooth01(0, 0.3, q) : 1;
      const Fv = fdFrame(sv.x, sv.y, sv.face);
      const lineAt = F(4, 13);
      const placed = trPlace(team, { x: lineAt[0], y: lineAt[1], face: shoot });
      const hitB = act ? q >= 0.42 : done;
      const downIdx = loss.blue === 2 ? [1, 3] : [1];
      const shooters = [];
      placed.forEach((m, i) => {
        const down = hitB && downIdx.includes(i);
        if (done && !down) return;                          // the rest remount
        const [x, y] = lerp2(Fv(-5.5, (i - 1.5) * 1.2), [m.x, m.y], out);
        const pose = down ? "prone" : out < 1 ? "stand" : "prone";
        man(`t${i}`, down ? "fk" : "f", x, y, out < 1 ? shoot - 20 : shoot, pose, m.role, out * 14, !down);
        if (!down && out >= 1) shooters.push({ x, y, spec: { face: trFaceStep(shoot), pose, role: m.role } });
      });
      // the medic: from the third vehicle to the first casualty, then kneels by him
      if (hitB) {
        const cas = placed[downIdx[0]];
        const from = veh[2] ? [veh[2].x, veh[2].y] : [sv.x, sv.y];
        const w = act ? smooth01(0.5, 0.85, q) : 1;
        const to = fdFrame(cas.x, cas.y, shoot)(-2.4, 1.2);
        const [x, y] = lerp2(from, to, w);
        man("md", "m", x, y, w < 1 ? Math.atan2(to[1] - from[1], to[0] - from[0]) / FR_RAD : shoot - 90, w < 1 ? "stand" : "kneel", "r", w * 20);
      }
      // fire while the contact lasts: the outpost at the lead vehicle and the team; the team and the lead vehicle back
      if (act) {
        const onH = 1 - smooth01(0.6, 0.75, q), onF = smooth01(0.08, 0.2, q) * (1 - smooth01(0.8, 0.95, q));
        const tgtF = [[veh[0].x, veh[0].y, T.height(veh[0].x, veh[0].y) + 1.8], ...placed.map((m) => trAimPoint({ pose: "prone" }, m.x, m.y, T.height(m.x, m.y)))];
        const spec0 = { face: trFaceStep(toRoad), pose: "prone", role: "ar" };
        streams.push({ id: "eo", side: "h", from: trMuzzle(spec0, e0[0], e0[1], oz), to: tgtF, period: 0.9, burst: 3, gap: 0.09, flight: 0.3, phase: 0.1, on: onH, scatter: 3 });
        if (!hitR) streams.push({ id: "e1", side: "h", from: trMuzzle({ ...spec0, role: "r" }, e1[0], e1[1], oz), to: tgtF, period: 1.3, burst: 1, gap: 0, flight: 0.3, phase: 0.5, on: onH * (1 - back), scatter: 3 });
        const tgtH = [trAimPoint({ pose: "prone" }, e0[0], e0[1], oz), trAimPoint({ pose: "prone" }, e1[0], e1[1], oz)];
        const v0 = veh[0], Fg = fdFrame(v0.x, v0.y, v0.face);
        streams.push({ id: "vg", side: "f", heavy: true, from: [...Fg(4.2, 0), T.height(v0.x, v0.y) + 3.1], to: tgtH, period: 1.1, burst: 3, gap: 0.12, flight: 0.35, phase: 0.3, on: onF, scatter: 3 });
        shooters.forEach((sh, i) => streams.push({ id: `ts${i}`, side: "f", from: trMuzzle(sh.spec, sh.x, sh.y, T.height(sh.x, sh.y)), to: tgtH, period: 1.2 + i * 0.17, burst: 2, gap: 0.1, flight: 0.3, phase: i * 0.37, on: onF, scatter: 3 }));
      }
    }
  }
  return { units, streams, fog, incs };
}

// Fog drifts as soft white ellipses laid on the ground (fill only, no lines).
export function fieldFog(K, P, fog) {
  return fog.map((f) => `<path class="fr-fog" style="opacity:${(0.5 * f.a).toFixed(2)}" d="${K.onTop(fdBlob(f.x, f.y, f.r, 60 + f.i, 0.18, 28, 0.55), 2.5, P, true)}"/>`).join("");
}
