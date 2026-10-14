// The Battlefield view of Strongpoint and Perimeter Defense, at company scale on a drawn ground: a rifle
// company defends a low rise either as a line facing the likely avenue or all round, hasty or prepared as a
// strong point, with a reserve in the centre. The same state s (model.mjs) as the machine drives it:
//   s.layout "L" line | "P" perimeter; s.fort 0 hasty | 1 strong point; s.main reinforced likely avenue
//   s.bearing the bearing the attack comes from; s.t, s.E, s.D, s.down[], s.res, s.tres, s.tb, s.lost
// Each defending position is drawn as two fighting positions of two men; each enemy element as three men
// (drawn units stand for squads at reduced numbers). Compass: north is -y, so bearing a points along
// (sin a, -cos a), which is ground angle a - 90 degrees.
// build.mjs inlines this file with `import` and `export` lines stripped, after field.mjs and terrain.mjs.
import { fdPolar, fdSweep, fdBlob, fdFrame } from "../../kit/field.mjs";
import { MODEL, posWeight } from "./model.mjs";
import { trTerrain, trGroundPlane, trRelief, trBehind, trField, trPatch, trRoad, trStream, trWood, trScatter, trHedge, trHouse, trHole, trNest, trWire, trFan, trChalk, trMuzzle, trAimPoint } from "../../kit/terrain.mjs";

export const FG = {
  world: { x: -260, y: -260, w: 520, d: 520 },
  RISE: { cx: 0, cy: 0, r: 30, steps: 4, h: 1.2, top: 0.6, seed: 5, wobble: 0.05, lean: [0, 0] },
  R_RING: 24,            // radius of the perimeter's fighting positions
  LINE_Y: -18,           // y of the line's fighting positions (north is -y)
  LINE_DX: 16,
  HOLE_D: 4.4,           // a line position's two holes sit this far to either side of its centre
  R0: 92, R1: 52,       // the attack's range at the start and at the wire
  R_BREACH: 24,          // how far a penetration drives in
  LANE: 11,              // spacing between enemy elements across the front
  T_APPROACH: 4.5,       // seconds the enemy takes to close from R0 to the wire (notional)
  WIRE: [44, 50],        // the wire ring radii: hasty one belt, prepared two
  CCP: [[-7, 5], [-9, 8], [-5, 9], [-10, 3], [-7, 12], [-11, 6], [-4, 6], [-8, 14], [-12, 10], [-6, 2], [-10, 13], [-3, 11]],
  MEDIC: [-7, 7],
};
FG.TERRAIN = { rises: [FG.RISE] };
const RAD = Math.PI / 180;
const STRIDE = [1, 0, 2, 0];
const strideAt = (d) => STRIDE[((Math.floor(d / 1.7) % 4) + 4) % 4];
export const fieldTerrain = () => trTerrain(FG.TERRAIN);
const ground = (bearing) => bearing - 90;           // compass bearing to ground angle in degrees
const angTo = (x0, y0, x1, y1) => Math.atan2(y1 - y0, x1 - x0) / RAD;
const wrap = (items, cls) => items.map((i) => ({ ...i, svg: `<g class="${cls}">${i.svg}</g>` }));

// The twelve fighting positions of a layout: { pos, h, x, y, face, roles } (face = ground angle).
export function fieldHoles(layout) {
  const G = FG, out = [];
  for (let k = 0; k < MODEL.pos; k++) {
    [[-1, ["tl", "ar"]], [1, ["gr", "r"]]].forEach(([sgn, roles], h) => {
      let x, y, face;
      if (layout === "P") {
        const a = ground(60 * k + sgn * 11);
        [x, y] = fdPolar(0, 0, G.R_RING, a); face = a;
      } else {
        x = (k - (MODEL.pos - 1) / 2) * G.LINE_DX + sgn * G.HOLE_D; y = G.LINE_Y; face = -90;
      }
      out.push({ pos: k, h, x, y, face, roles });
    });
  }
  return out;
}
export const posCentre = (layout, k) => {
  const hs = fieldHoles(layout).filter((h) => h.pos === k);
  return [(hs[0].x + hs[1].x) / 2, (hs[0].y + hs[1].y) / 2];
};

export function fieldStatic(K, P, T) {
  const G = FG;
  const gr = [], items = [];
  const g = (svg) => gr.push(svg);
  const gw = (svg, cls) => gr.push(`<g class="${cls}">${svg}</g>`);
  g(trGroundPlane(K, P, G.world));
  for (const [cx, cy, r, seed, sq] of [[70, 40, 26, 3, 0.7], [-60, -50, 24, 7, 0.8], [-20, 70, 22, 9, 0.6], [62, -62, 22, 11, 0.7]]) g(trPatch(K, P, fdBlob(cx, cy, r, seed, 0.15, 40, sq)));
  const fields = [
    [[[56, -92], [96, -88], [92, -122], [52, -126]], 8, "a"],
    [[[-108, 8], [-70, 12], [-74, 40], [-112, 36]], 7, "b"],
    [[[60, 70], [100, 76], [96, 104], [56, 98]], 8, "a"],
    [[[-98, -86], [-62, -90], [-58, -116], [-94, -112]], 7, "b"],
  ];
  for (const [ring, n, tint] of fields) g(trField(K, P, ring, { furrows: n, tint }));
  // a stream curving across the south-west: a natural obstacle the perimeter can tie into
  g(trStream(K, P, [[-220, 30], [-150, 50], [-100, 62], [-66, 66], [-40, 84], [-24, 130], [-10, 260]], 3.2, 5));
  g(trRoad(K, P, [[260, -40], [180, -30], [120, -22], [70, -14], [40, -6], [14, 4]], 3));
  g(trRoad(K, P, [[-260, -90], [-180, -88], [-110, -70], [-64, -40], [-30, -20], [-10, -6]], 3));
  const woods = [
    [fdBlob(-108, -104, 18, 31, 0.14, 40, 0.9), 9, 21],
    [fdBlob(108, 108, 18, 33, 0.14, 40, 0.9), 9, 22],
    [fdBlob(-112, 100, 17, 34, 0.12, 40, 0.9), 8, 23],
    [fdBlob(112, -112, 16, 36, 0.12, 40, 0.8), 8, 24],
  ];
  for (const [ring, n, seed] of woods) {
    const trees = trScatter(ring, n, { seed, gap: 5.6, r: [2.8, 4.4], h: [8, 12.5], avoid: (x, y) => trBehind(K, P, T, x, y) });
    const w = trWood(K, P, T, ring, trees);
    g(w.floor); items.push(...w.items);
  }
  for (const [pts, seed] of [[[[56, 98], [100, 76], [96, 104]], 51], [[[-112, 36], [-108, 8], [-70, 12]], 52]]) items.push(...trHedge(K, P, pts, { seed }));
  items.push(trHouse(K, P, 78, 88, 20, 10, 7), trHouse(K, P, -90, 24, 90, 9, 6.5), trHouse(K, P, 74, -106, 0, 10, 7));
  g(trRelief(K, P, T));

  // the control measures of a position: the trace of the perimeter, or the line of the defense
  const ringPts = fdSweep(0, 360, 12).slice(0, -1).map((a) => fdPolar(0, 0, 32, a));
  gw(trChalk(K, P, T, ringPts, { closed: true, pegs: false }).ground, "sp-P");
  gw(trChalk(K, P, T, [[-56, G.LINE_Y - 12], [56, G.LINE_Y - 12], [56, G.LINE_Y + 10], [-56, G.LINE_Y + 10]], { closed: true, pegs: false }).ground, "sp-L");

  // fighting positions, hasty (plain) and prepared (heavy bags), and the obstacles, per layout
  for (const layout of ["P", "L"]) {
    for (const fort of [0, 1]) {
      const cls = `sp-${layout} sp-${fort ? "s" : "h"}`;
      const list = [];
      for (const h of fieldHoles(layout)) list.push(...trHole(K, P, h.x, h.y, T.height(h.x, h.y), h.face, { heavy: !!fort }));
      items.push(...wrap(list, cls));
    }
  }
  const ring = (r) => fdSweep(0, 360, 10).map((a) => fdPolar(0, 0, r + 1.2 * Math.cos(a * RAD * 3), a));
  items.push(...wrap(trWire(K, P, T, ring(G.WIRE[0])), "sp-P"));
  items.push(...wrap(trWire(K, P, T, ring(G.WIRE[1])), "sp-P sp-s"));
  const belt = (y) => [[-60, y], [-30, y + 1], [0, y], [30, y + 1], [60, y]];
  items.push(...wrap(trWire(K, P, T, belt(-40)), "sp-L"));
  items.push(...wrap(trWire(K, P, T, belt(-46)), "sp-L sp-s"));
  // prepared: machine-gun nests at the platoon junctions
  for (const a of [30, 150, 270]) { const [x, y] = fdPolar(0, 0, 17, ground(a)); items.push(...wrap(trNest(K, P, x, y, T.height(x, y), ground(a)), "sp-P sp-s")); }
  for (const x of [-40, 0, 40]) items.push(...wrap(trNest(K, P, x, G.LINE_Y + 9, T.height(x, G.LINE_Y + 9), -90), "sp-L sp-s"));
  items.push(...wrap(trWire(K, P, T, [[-60, -40], [-68, -24], [-62, 4]]), "sp-L"), ...wrap(trWire(K, P, T, [[60, -40], [68, -24], [62, 4]]), "sp-L"));
  return { ground: gr.join(""), items };
}

// The attack's element j at state s: { R, v, down, idx }.
function enemyAt(s, j) {
  const G = FG;
  const order = [2, 1, 3, 0, 4];
  const idx = order.indexOf(j), td = s.down[idx];
  const tNow = td === null ? s.t : td;
  const approach = Math.min(1, tNow / G.T_APPROACH);
  let R = G.R0 - (G.R0 - G.R1) * approach;
  if (td === null && s.phase === "done" && s.end === "penetrated") R = G.R1 - (G.R1 - G.R_BREACH) * Math.min(1, s.tb / 1.8);
  return { R, v: (j - (MODEL.E0 - 1) / 2) * G.LANE, down: td !== null, idx };
}

// Where every soldier stands and who fires at whom.
export function fieldPose(s, T) {
  const G = FG, men = [];
  const add = (m) => { m.z = T.height(m.x, m.y) + (m.dz || 0); men.push(m); };
  const phi = ground(s.bearing), F = fdFrame(0, 0, phi);
  const running = s.phase === "run" || s.phase === "done";
  const holes = fieldHoles(s.layout);

  // --- friendly casualties (drawn, notional): the most exposed positions lose first, then the reserve ---
  const drawn = Math.min(MODEL.pos * 4 + 4, Math.round(s.lost * 4));
  const cand = [];
  holes.forEach((h) => h.roles.forEach((role) => cand.push({ id: `f${h.pos}-${h.h}-${role}`, pr: posWeight(s.layout, h.pos, s.bearing) })));
  ["tl", "ar", "gr", "r"].forEach((r, i) => cand.push({ id: `res-${r}`, pr: 0.5 - i * 0.001 }));
  cand.sort((a, b) => b.pr - a.pr || (a.id < b.id ? -1 : 1));
  const gone = new Set(cand.slice(0, drawn).map((c) => c.id));

  // --- the company's positions ---
  for (const h of holes) {
    const engaged = running && posWeight(s.layout, h.pos, s.bearing) > 0.12;
    const face = engaged ? angTo(h.x, h.y, ...F(G.R1 + 6, 0)) : h.face;
    const Fh = fdFrame(h.x, h.y, h.face);
    h.roles.forEach((role, n) => {
      const id = `f${h.pos}-${h.h}-${role}`;
      if (gone.has(id)) return;
      const [x, y] = Fh(0, n === 0 ? 1.1 : -1.1);
      add({ id, side: "f", role, pose: "hole", face, x, y, pos: h.pos });
    });
  }
  // --- the command post and the reserve (a fire team in a wedge), moving to the threatened sector ---
  add({ id: "f-pl", side: "f", role: "pl", pose: "kneel", face: phi, x: -2, y: 2 });
  add({ id: "f-rto", side: "f", role: "rto", pose: "kneel", face: phi, x: 2.5, y: 4 });
  const res = s.res && s.tres !== null ? Math.min(1, (Math.max(s.t, s.tres) - s.tres) / 1.5) : 0;
  const rest = [[2, 8], [-1, 11], [5, 11], [2, 14]];
  const [bx, by] = fdPolar(0, 0, 12, phi), Fr = fdFrame(bx, by, phi);
  ["tl", "ar", "gr", "r"].forEach((role, i) => {
    const id = `res-${role}`;
    if (gone.has(id)) return;
    const tgt = Fr(-1.2 * i, (i % 2 ? 1 : -1) * 2.4 * Math.ceil(i / 2));
    const x = rest[i][0] + (tgt[0] - rest[i][0]) * res, y = rest[i][1] + (tgt[1] - rest[i][1]) * res;
    const moving = res > 0 && res < 1;
    add({ id, side: "f", role, pose: res >= 1 ? "kneel" : "stand", stride: moving ? strideAt(res * 22 + i) : 0, face: res > 0 ? phi : 90, x, y, lit: true });
  });

  // --- the attack: elements of three, line abreast on the bearing; they go down by element ---
  const E = [];
  for (let j = 0; j < MODEL.E0; j++) {
    const e = enemyAt(s, j);
    const offs = [[0, 0], [3.6, -3.2], [3.6, 3.2]], roles = ["tl", "ar", "r"];
    const moving = !e.down && ((s.phase === "run" && s.t < G.T_APPROACH) || (s.phase === "done" && s.end === "penetrated" && s.tb < 1.8));
    roles.forEach((role, n) => {
      const [x, y] = F(e.R + offs[n][0], e.v + offs[n][1]);
      const m = { id: `e${j}-${n}`, side: e.down ? "hc" : "h", role: e.down ? "r" : role, pose: e.down ? "prone" : "stand",
        stride: moving ? strideAt((G.R0 - e.R) + n * 1.3) : 0, face: e.down ? phi + 20 + 40 * n : phi + 180, x, y };
      add(m); E.push({ j, m, role, down: e.down });
    });
  }
  // --- friendly men down: greyed in the centre with a medic ---
  let c = 0;
  for (const cd of cand) if (gone.has(cd.id) && c < G.CCP.length) { const [x, y] = G.CCP[c]; add({ id: `c-${cd.id}`, side: "fc", role: "r", pose: "prone", stride: 0, face: 40 + 30 * ((c * 7) % 3 - 1), x, y }); c++; }
  add({ id: "c-med", side: "f", role: "r", pose: "kneel", stride: 0, face: 230, x: G.MEDIC[0], y: G.MEDIC[1] });

  // --- small-arms fire ---
  const byId = Object.fromEntries(men.map((m) => [m.id, m]));
  const muzzle = (m) => trMuzzle(m, m.x, m.y, m.z), aim = (m) => trAimPoint(m, m.x, m.y, m.z);
  const streams = [];
  if (s.phase === "run") {
    const targets = E.filter((e) => !e.down).map((e) => aim(e.m));
    if (targets.length) {
      holes.forEach((h) => {
        if (posWeight(s.layout, h.pos, s.bearing) <= 0.12) return;
        for (const role of ["ar", "tl"]) {
          const m = byId[`f${h.pos}-${h.h}-${role}`];
          if (m) streams.push({ id: m.id, side: "f", heavy: role === "ar", from: muzzle(m), to: targets, period: role === "ar" ? 1.5 : 2.3, burst: role === "ar" ? 3 : 1, gap: 0.08, flight: 0.45, phase: h.pos * 0.37 + h.h * 0.21 + (role === "tl" ? 0.5 : 0), on: 1, scatter: 2.6 });
        }
      });
      if (res >= 1) for (const role of ["ar", "tl"]) { const m = byId[`res-${role}`]; if (m) streams.push({ id: m.id, side: "f", heavy: role === "ar", from: muzzle(m), to: targets, period: 1.7, burst: role === "ar" ? 3 : 1, gap: 0.08, flight: 0.45, phase: 0.2, on: 1, scatter: 2.6 }); }
    }
    const defenders = men.filter((m) => m.side === "f" && m.pose === "hole").map(aim);
    if (defenders.length) for (let j = 0; j < MODEL.E0; j++) {
      const lead = E.find((e) => e.j === j && e.role === "ar" && !e.down);
      if (!lead || enemyAt(s, j).R > G.R1 + 28) continue;
      streams.push({ id: `e${j}`, side: "h", heavy: j === 2, from: muzzle(lead.m), to: defenders, period: 2.6, burst: 2, gap: 0.1, flight: 0.5, phase: j * 0.41, on: 0.85, scatter: 4 });
    }
  }
  return { men, streams };
}

// Per-state ground marks: each position's sector of fire, and a north arrow at the edge of the picture.
export function fieldMarks(K, P, T, s) {
  let out = "";
  for (let k = 0; k < MODEL.pos; k++) {
    const [cx, cy] = posCentre(s.layout, k);
    const a = s.layout === "P" ? ground(60 * k) : -90;
    out += trFan(K, P, T, cx, cy, 6, s.layout === "P" ? 40 : 34, a - 17, a + 17, { side: "f", arcs: 1, alpha: 0.42 });
  }
  // north arrow: a closed outline draped on the ground at the north-west corner (no free ends)
  const poly = [[-66, -44], [-66, -58], [-70, -58], [-64, -68], [-58, -58], [-62, -58], [-62, -44]];
  out += K.lineSvg(K.pathOf(poly.map(([x, y]) => K.iso([x, y, T.height(x, y) + 0.15], P)), true), { tone: "mid", className: "tr-chalk" });
  return out;
}
