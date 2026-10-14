// The Battlefield view of Penetration and Exploitation: a rifle company's part in a penetration,
// drawn with the terrain kit (../../kit/terrain.mjs). The same model state as the machine drives it
// (stateAt(S.p, S.hold) from model.mjs, plus the live S.gap and S.pin):
//   the wedge     = the breach platoon, which rushes through the boundary between two enemy
//                   platoon positions, one rush per hammer blow, and secures the far side;
//   the rollers   = the follow-on platoon, whose arrival forces the gap wide (enemy pairs at the
//                   boundary are driven back to their alternate positions);
//   the pins      = the same platoon's squads holding both shoulders (doctrine: the flanks);
//   the carriage  = the lit platoon (main effort), which passes through to the objective in depth.
// Drop the pins and the follow-on squads go on with the lit platoon; the enemy pairs walk back into
// their holes and the gap shuts behind them.
// Layout coordinates are (u, v): u along the attack axis (toward the objective, up the card),
// v across it, origin at the boundary on the enemy line. W() turns them into world x, y.
// fieldStatic() builds everything that never moves (build only); fieldPose() places every soldier
// and fire stream for a state (build and page); fieldMarks() draws the fire sectors.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdBlob, fdFrame } from "../../kit/field.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trHole, trNest, trWire, trFan, trChalk, trObjective, trFireTeam, trPlace, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";
import { MODEL, stateAt, losses } from "./model.mjs";

export const FG = {
  AX: 225,                 // attack axis, world bearing in degrees (straight up the card, a little left)
  VIEW: [0, 0],            // (u, v) at the card's centre
  SCALE: 2.3,              // projection scale (px per unit)
  HOLE_U: 6,               // the enemy's two-man positions (u): the line's front row
  HOLES: [12, 26, 40, 54], // |v| of the four two-man positions each side of the boundary
  MG: [12, 70],            // enemy MG nests (u, |v|)
  ALT: [[25, 64], [25, 78]], // alternate positions (u, |v|) for the pairs driven out of holes 12 and 26
  GAP0: 4,                 // half-width of the seam at the boundary with no gap forced (units)
  GAP_K: 1,                // units of half-width per mm of the machine's gap
  START: { b: [-34, 0], f: [-48, -20], l: [-50, 20] }, // platoon start points (u, v): breach, follow-on, lit
  B_END: 30,               // breach platoon's lead squad at the end of the breach
  B_HOLD: [52, 24],        // where the breach platoon secures the far side
  U_PIN: 14,               // the shoulders: where the follow-on squads hold (u)
  OBJ: [70, -6],           // the objective flag
  LD: -30,                 // line of departure (u)
  SQ: 9,                   // spacing between squads in a platoon column (units)
  // casualties (counts from model.mjs losses()), in order: who goes down and where he lies (u, v). The
  // first is at the collection point behind the line of departure with a medic; then the breach lane,
  // the seam the follow-on platoon forced, and the objective (only when cut off)
  DOWN_F: [["b2-3", -72, 2], ["b0-1", -20, 3], ["b1-2", -8, -3], ["f0-3", -1, -7], ["l0-2", 56, -14], ["l1-1", 61, 3]],
  MEDIC: [-74, 6],
  DOWN_H: [["el01", -1, 12], ["er01", 1, 12], ["el11", -1, 26], ["er11", 1, 26]], // (id, side, |v|)
};
const PN_RAD = Math.PI / 180;
export const W = (u, v) => fdFrame(0, 0, FG.AX)(u, v);
const Wf = (rel) => FG.AX + rel;             // a facing relative to the axis, as a world bearing
FG.TERRAIN = {
  rises: [
    { ...pnRise(14, -48), r: 36, steps: 3, h: 1.3, top: 0.62, seed: 7, wobble: 0.08 },
    { ...pnRise(14, 48), r: 36, steps: 3, h: 1.3, top: 0.62, seed: 9, wobble: 0.08 },
    { ...pnRise(74, -6), r: 20, steps: 2, h: 1.4, top: 0.55, seed: 13, wobble: 0.1 },
    { ...pnRise(-40, 120), r: 26, steps: 3, h: 1.5, top: 0.45, seed: 17, wobble: 0.12 },
    { ...pnRise(110, 100), r: 24, steps: 3, h: 1.6, top: 0.45, seed: 19, wobble: 0.12 },
  ],
};
function pnRise(u, v) { const [cx, cy] = W(u, v); return { cx, cy }; }

const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const STRIDE = [1, 0, 2, 0];
const strideAt = (dist) => STRIDE[((Math.floor(dist / 1.7) % 4) + 4) % 4];
// The half-width of the gap on the ground for a machine gap in mm.
export const fieldHalfGap = (gap) => FG.GAP0 + FG.GAP_K * gap;

export const fieldTerrain = () => trTerrain(FG.TERRAIN);

export function fieldStatic(K, P, T, world) {
  const G = FG;
  const ground = [], items = [];
  const g = (svg) => ground.push(svg);
  const ring = (pts) => pts.map(([u, v]) => W(u, v));
  g(trGroundPlane(K, P, world));

  // meadows and fields toward the edges
  for (const [u, v, r, seed] of [[-110, -40, 44, 3], [60, 150, 40, 5], [130, -60, 36, 7], [-20, -150, 34, 9]]) g(trPatch(K, P, fdBlob(...W(u, v), r, seed, 0.15, 40, 0.7)));
  const fields = [
    [[[-70, -80], [-70, -130], [-118, -134], [-116, -84]], 8, "a"],
    [[[-122, -84], [-124, -132], [-160, -128], [-158, -88]], 6, "b"],
    [[[-80, 64], [-82, 104], [-122, 100], [-118, 62]], 7, "b"],
    [[[60, -60], [62, -110], [104, -106], [100, -62]], 8, "b"],
    [[[106, -40], [146, -36], [150, -84], [110, -88]], 7, "a"],
    [[[30, 100], [72, 104], [70, 150], [26, 144]], 8, "a"],
    [[[-150, 30], [-150, 70], [-190, 74], [-186, 30]], 7, "a"],
  ];
  for (const [r, n, tint] of fields) g(trField(K, P, ring(r), { furrows: n, tint }));

  // a stream across the far ground, and the farm track up the axis through the saddle
  g(trStream(K, P, ring([[150, -220], [138, -120], [126, -40], [132, 30], [124, 100], [140, 180], [150, 260]]), 3, 5));
  g(trRoad(K, P, ring([[-200, 8], [-120, 4], [-60, 2], [-10, 0], [30, -2], [70, -6], [110, -4], [150, 0], [220, 8]]), 2.4));
  g(trRoad(K, P, ring([[-160, -230], [-120, -150], [-96, -60], [-90, 0]]), 2, { ruts: false }));

  // woods: on the flanks of the start area, and copses toward the edges, kept off the routes
  const clear = (x, y) => {
    const [u, v] = toUV(x, y);
    if (u < 34 && Math.abs(v) < 44) return true;              // the company's approach and the gap
    if (u > 20 && u < 90 && Math.abs(v + 6) < 30) return true; // the run to the objective
    return false;
  };
  const woods = [
    [fdBlob(...W(-64, -96), 30, 21, 0.14, 40, 0.8), 26, 21],
    [fdBlob(...W(-64, 82), 26, 22, 0.14, 40, 0.8), 20, 22],
    [fdBlob(...W(64, -124), 24, 23, 0.14, 40, 0.8), 14, 23],
    [fdBlob(...W(130, 40), 24, 24, 0.12, 40, 0.9), 14, 24],
    [fdBlob(...W(-130, -10), 18, 25, 0.12, 40, 0.8), 8, 25],
    [fdBlob(...W(-150, 120), 22, 26, 0.12, 40, 0.8), 10, 26],
    [fdBlob(...W(10, 136), 18, 27, 0.12, 40, 0.8), 8, 27],
  ];
  for (const [r, n, seed] of woods) {
    const trees = trScatter(r, n, { seed, gap: 5.6, r: [2.6, 4.2], h: [7, 11.5], avoid: (x, y) => clear(x, y) || trBehind(K, P, T, x, y) || T.height(x, y) > 0 });
    const w = trWood(K, P, T, r, trees);
    g(w.floor);
    items.push(...w.items);
  }

  // hedgerows, a farm behind the left of the line and a barn near the start
  for (const [pts, seed] of [
    [[[-70, -80], [-70, -130]], 51], [[[-80, 64], [-118, 62]], 52], [[[60, -60], [100, -62]], 53], [[[30, 100], [72, 104]], 54], [[[106, -40], [146, -36]], 55],
  ]) items.push(...trHedge(K, P, ring(pts), { seed }));
  for (const [u, v, ang, len, wid, eave, ridge] of [[96, -82, 0, 13, 8.5], [108, -76, 90, 10, 7], [-104, 50, 0, 14, 9, 4.8, 8.6]]) items.push(trHouse(K, P, ...W(u, v), G.AX + ang, len, wid, eave, ridge));

  // the relief, drawn over the flat cover
  g(trRelief(K, P, T));

  // the enemy line: two platoon positions with the boundary between them; each has four two-man
  // positions and an MG nest facing the front, two alternate positions behind, and wire in front
  for (const sv of [-1, 1]) {
    for (const h of G.HOLES) { const [x, y] = W(G.HOLE_U, sv * h); items.push(...trHole(K, P, x, y, T.height(x, y), Wf(180))); }
    { const [x, y] = W(G.MG[0], sv * G.MG[1]); items.push(...trNest(K, P, x, y, T.height(x, y), Wf(180 + sv * 28))); }
    for (const [au, av] of G.ALT) { const [x, y] = W(au, sv * av); items.push(...trHole(K, P, x, y, T.height(x, y), Wf(sv * -118))); }
    const wire = [];
    for (let v = 16; v <= 92; v += 6) wire.push(W(-12 - 2 * Math.sin(v * 0.09), sv * v));
    items.push(...trWire(K, P, T, wire));
  }

  // control measures: the line of departure and the objective
  const ld = trChalk(K, P, T, [-34, -12, 12, 34].map((v) => W(G.LD, v)));
  g(ld.ground); items.push(...ld.items);
  items.push(trObjective(K, P, T, ...W(G.OBJ[0], G.OBJ[1]), { h: 12, ang: 200 }));
  return { ground: ground.join(""), items };
}
// World x, y back to layout (u, v).
function toUV(x, y) {
  const c = Math.cos(FG.AX * PN_RAD), s = Math.sin(FG.AX * PN_RAD);
  return [x * c + y * s, -x * s + y * c];
}

// Where the follow-on platoon's lead is (u) for the machine's roller position rx (mm), and the lit
// platoon's for the carriage nose car (mm). Piecewise: the approach, the line (1.4 units per mm of
// its 20 mm depth) and beyond.
const followU = (rx) => (rx <= -3 ? mix(FG.START.f[0], -4, (rx + 93) / 90) : rx <= 20 ? -4 + (rx + 3) * 1.4 : 28.2 + (rx - 20) * 1.5);
const litU = (car) => (car <= 0 ? mix(FG.START.l[0], -28, (car + 90) / 90) : car <= 30 ? mix(-28, 30, car / 30) : mix(30, 64, (car - 30) / 26));

// Every soldier and fire stream for a state. M carries what the page eases between frames: g, the
// gap on the ground (mm, eased from S.gap so the enemy is pushed back at a walking pace), hw, the
// hold (1 while the shoulders are held, eased), dhw its rate, and vp, the rate of S.p (so feet move
// only while a unit moves). Defaults make the build's first frame work.
export function fieldPose(S, T, M = {}) {
  const G = FG;
  const s = stateAt(S.p, S.hold);
  const gap = M.g ?? S.gap ?? s.gap;
  const H = fieldHalfGap(gap);
  const hw = M.hw ?? (S.hold ? 1 : 0);
  const men = [];
  const add = (m) => { const [x, y] = W(m.u, m.v); m.x = x; m.y = y; m.z = T.height(x, y); m.face = Wf(m.rf); men.push(m); };

  // --- breach platoon: a column of three squads; one rush per hammer blow, prone and firing
  // between rushes; after the breach it moves off the axis to secure the far side ---
  const [pa] = MODEL.phases;
  const per = pa / MODEL.blows;
  let prog = 1, rushing = false;
  if (S.p < pa) {
    const k = Math.floor(S.p / per), uu = (S.p - k * per) / per;
    prog = (k + smooth01(0.3, 0.85, uu)) / MODEL.blows;
    rushing = uu > 0.3 && uu < 0.85;
  }
  const post = smooth01(pa, MODEL.phases[1], S.p);
  const bU = mix(G.START.b[0], G.B_END, prog);
  const bLead = [mix(bU, G.B_HOLD[0], post), mix(0, G.B_HOLD[1], post)];
  const bMove = rushing || (post > 0.02 && post < 0.98);
  const bFace = post > 0.02 && post < 0.98 ? Math.atan2(G.B_HOLD[1], G.B_HOLD[0] - G.B_END) / PN_RAD : 0;
  const wedge = trFireTeam("wedge");
  const bSq = [[0, 0], [-G.SQ, 0], [-2 * G.SQ, 0]].map(([du, dv], i) => [du * (1 - post) + [0, -10, -10][i] * post, dv * (1 - post) + [0, 9, -9][i] * post]);
  bSq.forEach(([du, dv], n) => wedge.forEach((m, i) => add({
    id: `b${n}-${i}`, side: "f", role: m.role, sq: `b${n}`,
    u: bLead[0] + du + rot(m.off, bFace)[0], v: bLead[1] + dv + rot(m.off, bFace)[1], rf: bFace,
    pose: bMove ? "stand" : "prone", stride: bMove ? strideAt(bU + post * 30 + n * 2 + i) : 0,
  })));

  // --- follow-on platoon: a column of squads up to the line; there its two lead squads turn out
  // to the shoulders (pushed out as the gap widens) and the third backs up the right shoulder.
  // Held, the shoulder squads stay at U_PIN; released, they go on with the lit platoon. ---
  const rx = s.car - 3;
  const fU = Math.min(followU(rx), Math.max(G.U_PIN, litU(s.car) - 16)); // released, it follows the lit platoon
  const fV = mix(G.START.f[1], 0, smooth01(G.START.f[0], -24, fU));
  const q = smooth01(-16, -2, fU);                       // 0 in column, 1 deployed on the shoulders
  const uS = mix(fU, Math.min(fU, G.U_PIN), hw);
  const vS = Math.max(5, H - 7);
  const carMoving = Math.abs(M.vp ?? 0) > 0.004 && S.p > MODEL.phases[1];
  const fMove = (carMoving && !(hw > 0.5 && fU >= G.U_PIN)) || Math.abs(M.dhw ?? 0) > 0.05;
  const fSquads = [
    { col: [0, 0], at: [uS, -vS], rf: -90 },
    { col: [-G.SQ, 0], at: [uS, vS], rf: 90 },
    { col: [-2 * G.SQ, 0], at: [uS - 10, vS - 2], rf: 90 },
  ];
  fSquads.forEach((F, n) => {
    const cu = fU + F.col[0], cv = fV + F.col[1];
    // released and through the line, the squads fall into a column behind the lit platoon
    const fw = (1 - hw) * smooth01(18, 30, fU), cu2 = fU + F.col[0];
    const u0 = mix(mix(cu, F.at[0], q), cu2, fw), v0 = mix(mix(cv, F.at[1], q), cu2 < 30 ? 0 : mix(0, G.OBJ[1], smooth01(30, 60, cu2)), fw);
    const rf = F.rf * q * (1 - fw);
    const deployed = q > 0.98 && fw < 0.02 && !fMove && H > 12;
    const form = deployed ? trFireTeam("line") : wedge;
    form.forEach((m, i) => {
      const [ou, ov] = rot(m.off, rf);
      add({ id: `f${n}-${i}`, side: "f", role: m.role, sq: `f${n}`, u: u0 + ou, v: v0 + ov, rf, deployed,
        pose: deployed ? (i % 2 ? "prone" : "kneel") : "stand", stride: deployed || !fMove ? 0 : strideAt(fU + Math.abs(v0) + n * 2 + i) });
    });
  });

  // --- the lit platoon (main effort): a column of squads with the platoon leader and his radio
  // operator, through the gap to the objective, where it shakes out into a line ---
  const lU = litU(s.car);
  const lV = lU < 30 ? mix(G.START.l[1], 0, smooth01(-30, -6, lU)) : mix(0, G.OBJ[1], smooth01(30, 60, lU));
  const shake = smooth01(48, 64, lU);
  const lMove = carMoving;
  [[0, 0], [-G.SQ, 0], [-2 * G.SQ, 0]].forEach(([du, dv], n) => {
    const [lu, lv] = [mix(du, -4, shake), mix(dv, [0, 14, -14][n], shake)];
    wedge.forEach((m, i) => add({ id: `l${n}-${i}`, side: "f", lit: true, role: m.role, sq: `l${n}`, u: lU + lu + m.off[0], v: lV + lv + m.off[1], rf: 0,
      pose: lMove ? "stand" : shake > 0.9 ? "kneel" : "stand", stride: lMove ? strideAt(lU + n * 2 + i) : 0 }));
  });
  add({ id: "l-pl", side: "f", lit: true, role: "pl", u: lU - G.SQ * 0.5 - 4 * shake, v: lV + 3, rf: 0, pose: lMove || shake < 0.9 ? "stand" : "kneel", stride: lMove ? strideAt(lU + 1) : 0 });
  add({ id: "l-rto", side: "f", lit: true, role: "rto", u: lU - G.SQ * 0.5 - 2.6 - 4 * shake, v: lV + 5.4, rf: 0, pose: lMove || shake < 0.9 ? "stand" : "kneel", stride: lMove ? strideAt(lU + 2) : 0 });

  // --- enemy: per side four pairs and an MG team. A pair whose hole lies inside the forced gap is
  // driven back to an alternate position; when the gap shuts it walks back. With friendly troops
  // cut off behind the line, the pairs at the boundary turn and fire to their rear. ---
  const deep = men.filter((m) => m.side === "f" && m.u > 34);
  const cut = deep.length > 0 && H < 9;
  for (const sv of [-1, 1]) {
    G.HOLES.forEach((h, i) => {
      const d = i < G.ALT.length ? smooth01(h - 2, h + 4, H) : 0;
      const alt = G.ALT[i] || [G.HOLE_U, h];
      const u0 = mix(G.HOLE_U, alt[0], d), v0 = sv * mix(h, alt[1], d);
      const moving = d > 0.03 && d < 0.97;
      const rear = cut && i === 0 && d < 0.03;
      const rfHole = d >= 0.97 ? sv * -118 : rear ? 0 : 180;
      const rf = moving ? Math.atan2(sv * (alt[1] - h), alt[0] - G.HOLE_U) / PN_RAD : rfHole;
      [1.1, -1.1].forEach((dv, j) => {
        const [ou, ov] = rot([0, dv], rf);
        add({ id: `e${sv > 0 ? "r" : "l"}${i}${j}`, side: "h", role: j ? "r" : i % 2 ? "ar" : "tl", u: u0 + ou, v: v0 + ov, rf,
          pose: moving ? "stand" : rear ? "kneel" : "hole", stride: moving ? strideAt(d * 40 + j) : 0, hole: !moving, side2: sv });
      });
    });
    const mf = 180 + sv * 28;
    [[1.1, "mg"], [-1.1, "r"]].forEach(([dv, role]) => {
      const [ou, ov] = rot([0, dv], mf);
      add({ id: `e${sv > 0 ? "r" : "l"}mg${role}`, side: "h", role, u: G.MG[0] + ou, v: sv * G.MG[1] + ov, rf: mf, pose: "hole", hole: true, side2: sv });
    });
  }

  // --- casualties (notional; the model's counts): greyed and still, taken out of their squads ---
  const LS = losses(s, gap);
  const downF = G.DOWN_F.slice(0, LS.blue), downH = G.DOWN_H.slice(0, LS.red);
  const gone = new Set([...downF, ...downH].map((d) => d[0]));
  for (let i = men.length - 1; i >= 0; i--) if (gone.has(men[i].id)) men.splice(i, 1);
  downF.forEach(([, u, v], k) => add({ id: `c-f${k}`, side: "fc", role: "r", pose: "prone", stride: 0, u, v, rf: 160 + 35 * ((k * 5) % 3 - 1) }));
  add({ id: "c-med", side: "f", role: "r", pose: "kneel", stride: 0, u: G.MEDIC[0], v: G.MEDIC[1], rf: 70 });
  downH.forEach(([, sv, h], k) => add({ id: `c-h${k}`, side: "hc", role: "r", pose: "prone", stride: 0, u: G.HOLE_U + 4.5, v: sv * (h + 1.5), rf: 20 - sv * 30 * (k + 1) }));

  // --- fire ---
  const aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z);
  const friends = men.filter((m) => m.side === "f" && m.id !== "c-med");
  const enemies = men.filter((m) => m.side === "h");
  const streams = [];
  const inArc = (from, to, face, half, range) => {
    const b = Math.atan2(to.y - from.y, to.x - from.x) / PN_RAD;
    const off = Math.abs((((b - face) % 360) + 540) % 360 - 180);
    return off < half && Math.hypot(to.x - from.x, to.y - from.y) < range;
  };
  // enemy: the first man of each pair and the MG fire at friendly troops inside their sector
  enemies.forEach((m, i) => {
    if (!m.hole || !(m.role === "tl" || m.role === "ar" || m.role === "mg")) return;
    const heavy = m.role === "mg";
    const to = friends.filter((f) => inArc(m, f, m.face, heavy ? 30 : 55, heavy ? 150 : 110)).map(aim);
    streams.push({ id: m.id, side: "h", heavy, from: muzzle(m), to, period: heavy ? 2.2 : 2.7 + (i % 4) * 0.31, burst: heavy ? 3 : 1, gap: 0.1, flight: 0.42, phase: i * 0.37, on: heavy ? 0.85 : 0.6, scatter: 3 });
  });
  // breach platoon: its automatic riflemen and team leaders fire on the boundary positions between
  // rushes, and from the far side once it is through
  const near = enemies.filter((e) => e.hole && Math.abs(e.v) < 34);
  friends.filter((m) => m.sq?.[0] === "b" && (m.role === "ar" || m.role === "tl") && m.pose === "prone").forEach((m, i) => {
    const to = (S.p < pa ? near : enemies.filter((e) => e.hole && inArc(m, e, m.face, 75, 90))).map(aim);
    streams.push({ id: m.id, side: "f", heavy: m.role === "ar", smoke: m.role === "ar", from: muzzle(m), to, period: m.role === "ar" ? 1.8 : 2.6, burst: m.role === "ar" ? 3 : 1, gap: 0.09, flight: 0.38, phase: i * 0.53, on: S.p < pa ? 0.9 : 0.5, scatter: 2.4 });
  });
  // follow-on squads on the shoulders fire outward at the nearest enemy positions on their side
  friends.filter((m) => m.deployed && (m.role === "ar" || m.role === "tl")).forEach((m, i) => {
    const to = enemies.filter((e) => e.hole && Math.sign(e.v) === Math.sign(m.v) && inArc(m, e, m.face, 70, 80)).map(aim);
    streams.push({ id: m.id, side: "f", heavy: m.role === "ar", smoke: m.role === "ar", from: muzzle(m), to, period: m.role === "ar" ? 1.9 : 2.7, burst: m.role === "ar" ? 2 : 1, gap: 0.1, flight: 0.36, phase: 0.4 + i * 0.61, on: 0.85, scatter: 2.2 });
  });
  return { men, streams, H, q, uS, vS, hw, cut, LS };
}
// Turn a formation offset (u, v) by rel degrees.
function rot([u, v], rel) {
  const c = Math.cos(rel * PN_RAD), s = Math.sin(rel * PN_RAD);
  return [u * c - v * s, u * s + v * c];
}

// Per-state ground marks: the enemy MGs' sectors (red), interlocking across the boundary, and the
// follow-on squads' sectors on the shoulders (blue), which move out as the gap widens and fade
// when the shoulders are let go.
export function fieldMarks(K, P, T, pose) {
  const G = FG;
  let out = "";
  for (const sv of [-1, 1]) {
    const [x, y] = W(G.MG[0], sv * G.MG[1]);
    const c = Wf(180 + sv * 28);
    out += trFan(K, P, T, x, y, 6, 74, c - 16, c + 16, { side: "h", arcs: 1, alpha: 0.8 });
  }
  const a = pose.q * smooth01(12, 20, pose.H) * Math.max(0.15, pose.hw);
  if (a > 0.03) for (const sv of [-1, 1]) {
    const [x, y] = W(pose.uS, sv * (pose.vS + 3));
    const c = Wf(sv * 90);
    out += trFan(K, P, T, x, y, 3, 22, c - 24, c + 24, { side: "f", arcs: 1, alpha: 0.6 * a });
  }
  return out;
}
