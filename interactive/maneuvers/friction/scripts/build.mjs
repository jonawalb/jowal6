// Builds interactive/maneuvers/friction/index.html: an isometric inclined-plane rig made with the
// Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/friction/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { MODEL, steadyPull, paperPull, paperTime, breakaway, startRun, fieldReadout } from "./model.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, fieldFog, incidents } from "./field-scene.mjs";
import { GEO, onSlope, boxSolid, slopeBox, blockSvg, cordPath, springSvg, spokesPath, grainSvg } from "./scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;
const RAD = Math.PI / 180;
const { H, L, HALF, TOE, RUN, BACK } = GEO;
const CREST = TOE - RUN;

const PLATE = { x: -150, y: -38, w: 272, d: 86, r: 9 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: 58, y: 33, w: 34, d: 9, r: 1.4 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [BACK, -16, H + 23], [-60, 16, H + 23], [CREST, -HALF, H + 22]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 52 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const box = (x0, x1, y0, y1, z0, z1) => boxSolid(k, P, [x0, y0, z0], [x1 - x0, 0, 0], [0, y1 - y0, 0], [0, 0, z1 - z0]);
const alongY = (x, z, y) => G.frameOf([x, y, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -6, P, 8), { tone: "faint" }) }));
  out.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.4), 0.8, P), { tone: "faint" }));
  [[24, 3], [17, 5], [21, 7]].forEach(([len, dy]) => out.push(Ln(k.lineOnTop([LABEL.x + 5, LABEL.y + dy - 0.5], [LABEL.x + 5 + len, LABEL.y + dy - 0.5], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.4, LABEL.y + 2.4, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The ramp body: one casting, a wedge rising to a level deck, with a protractor on its near side.
function ramp() {
  const F = G.frameOf([0, -HALF, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const body = G.prismOf(F, [[TOE, 0], [BACK, 0], [BACK, H], [CREST, H]], 0, HALF * 2, P);
  const tan = Math.tan(GEO.ANG * RAD);
  const y = HALF;
  // seam along the side at z = 8, edge to edge; joint between wedge and deck; protractor
  const seamZ = 8;
  const lines = [k.segment([BACK, y, seamZ], [TOE - seamZ / tan, y, seamZ], P)];
  // panel joints, each running the full face: bottom edge to the deck edge or the slope edge
  for (const x of [-88, CREST, 6]) lines.push(k.segment([x, y, 0], [x, y, Math.min(H, (TOE - x) * tan)], P));
  const R = 46;
  const arc = [];
  for (let a = 180; a >= 180 - GEO.ANG - 1e-9; a -= 1) arc.push(at([TOE + R * Math.cos(a * RAD), y, R * Math.sin(a * RAD)]));
  lines.push(k.pathOf(arc));
  const minor = [], major = [];
  for (let d = 1; d < GEO.ANG; d++) {
    const a = (180 - d) * RAD;
    const len = d % 5 === 0 ? 3.4 : 1.8;
    const p0 = [TOE + R * Math.cos(a), y, R * Math.sin(a)];
    const p1 = [TOE + (R - len) * Math.cos(a), y, (R - len) * Math.sin(a)];
    (d % 5 === 0 ? major : minor).push(k.segment(p0, p1, P));
  }
  const arcD = lines.pop();
  const inner = Ln(lines.join(""), { tone: "faint" });
  let out = S(body, { tone: "mid", inner });
  out += Ln(arcD, { tone: "lo" }) + Ln(minor.join(""), { tone: "lo" }) + Ln(major.join(""), { tone: "mid" });
  // screws along the side, below the seam
  const sx = [];
  for (const [x0, x1] of [[BACK, -88], [-88, CREST], [CREST, 6]]) for (const x of [x0 + 5, x1 - 5]) sx.push(at([x, y, 4]), at([x, y, Math.min(H, (TOE - x) * tan) - 4]));
  sx.push(at([12, y, 4]), at([TOE - R - 6, y, 4]));
  out += Dt(sx, { size: 0.45 });
  // deck screws at the four corners of the deck top
  out += Dt([[BACK + 4, -HALF + 4], [BACK + 4, HALF - 4], [CREST - 4, -HALF + 4], [CREST - 4, HALF - 4]].map(([x, yy]) => at([x, yy, H])), { size: 0.45 });
  return out;
}

// On the slope: the test-surface strip, its finish (dots, set by the friction control), stops.
function slopeBack() {
  let out = S(slopeBox(k, P, 3, L - 3, -10, 10, -GEO.STRIP, 0), { tone: "mid" });
  out += `<g data-part="finish"></g>`;
  // far rail, bottom and top stops
  out += S(slopeBox(k, P, 1, L - 1, -13.5, -11, -GEO.STRIP, 2.6), { tone: "mid" });
  out += S(slopeBox(k, P, 3.8, GEO.B0 - 0.2, -10.6, 10.6, 0, 4.4), { tone: "mid" });
  out += Dt([onSlope(6, -7, 4.4), onSlope(6, 7, 4.4)].map(at), { size: 0.42 });
  const top = GEO.B0 + GEO.BL + MODEL.travel;
  out += S(slopeBox(k, P, top + 0.2, top + 3.6, -10.6, 10.6, 0, 4.4), { tone: "mid" });
  out += Dt([onSlope(top + 1.9, -7, 4.4), onSlope(top + 1.9, 7, 4.4)].map(at), { size: 0.42 });
  return out;
}

// Near rail, with a distance scale on its top hanging from the outer edge.
function slopeFront() {
  let out = S(slopeBox(k, P, 1, L - 1, 11, 13.5, -GEO.STRIP, 2.6), { tone: "mid" });
  const minor = [], major = [], zero = [];
  for (let s = GEO.B0 + GEO.BL, i = 0; s <= GEO.B0 + GEO.BL + MODEL.travel + 1e-9; s += 4, i++) {
    const big = i % 5 === 0;
    const d = k.pathOf([at(onSlope(s, 13.5, 2.6)), at(onSlope(s, 13.5 - (big ? 1.9 : 1.1), 2.6))]);
    (i === 0 ? zero : big ? major : minor).push(d);
  }
  out += Ln(minor.join(""), { tone: "lo" }) + Ln(major.join(""), { tone: "mid" }) + Ln(zero.join(""), { tone: "hi" });
  out += Dt([onSlope(4, 12.25, 2.6), onSlope(L - 4, 12.25, 2.6)].map(at), { size: 0.42 });
  return out;
}

// Deck: back stop, carriage rails with their front stops, the force scale.
function deck() {
  let out = "";
  out += S(box(-134, GEO.STOP, -16, 16, H, H + 14), { tone: "mid", crease: "lo" });
  out += Dt([[-131, -12], [-131, 12]].map(([x, y]) => at([x, y, H + 14])), { size: 0.45 });
  // anchor boss on the stop's face that the spring hooks onto
  const FA = G.frameOf([GEO.STOP, 0, H + 9.5], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out += S(G.disc(0, 1.2, 3.4, FA, P), { tone: "mid" });
  for (const y of [-12.5, 10.5]) {
    out += S(box(GEO.STOP, -55, y, y + 2, H, H + 2.5), { tone: "mid" });
    out += Dt([-118, -66].map((x) => at([x, y + 1, H + 2.5])), { size: 0.4 });
  }
  out += S(box(-55, -52, -14, 14, H, H + 6), { tone: "mid" });
  out += Dt([at([-53.5, -11.5, H + 6]), at([-53.5, 11.5, H + 6])], { size: 0.42 });
  // the force scale: a strip beside the rails, 1 tick per newton, the paper pull marked
  const st = { x: GEO.CX0 - 3, y: 17.5, w: GEO.PER_N * MODEL.scale + 6, d: 7, r: 1 };
  out += S(k.slabOf(st, H, 0.6, P, 3), { tone: "lo", crease: "none" });
  const t = k.topTicks(GEO.CX0, GEO.CX0 + GEO.PER_N * MODEL.scale, GEO.PER_N, 5, st.y, H + 0.6, [1.4, 2.6], P);
  out += Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" });
  const px = GEO.CX0 + GEO.PER_N * paperPull();
  out += Ln(k.lineOnTop([px, st.y], [px, st.y + 4.4], H + 0.6, P), { tone: "hi" });
  out += Ln(k.lineOnTop([GEO.CX0, st.y], [GEO.CX0, st.y + 4.4], H + 0.6, P), { tone: "hi" });
  out += Dt([at([st.x + 1.4, st.y + 5.6, H + 0.6]), at([st.x + st.w - 1.4, st.y + 5.6, H + 0.6])], { size: 0.4 });
  return out;
}

// The winch carriage at no load (centre CX0): shoes, plate, lug, uprights, drum, handwheel, pointer.
function carriage() {
  const cx = GEO.CX0, D = GEO.DZ, R = GEO.DRUM.r;
  let out = `<path class="iso-halo" d="${k.slabOf({ x: cx - 11, y: -14, w: 22, d: 28, r: 2 }, H + 2.5, 0.1, P).fill}" style="filter:blur(3px)"/>`;
  const shoes = [];
  for (const sx of [-9, 4]) for (const y of [-12.8, 10.2]) shoes.push([cx + sx, y]);
  const near = ([x, y]) => k.depthOf([x + 2.5, y + 1.3, 0], P) > k.depthOf([cx, 0, 0], P);
  const shoe = ([x, y]) => S(box(x, x + 5, y, y + 2.6, H + 2.5, H + 4), { tone: "mid" });
  out += shoes.filter((s) => !near(s)).map(shoe).join("");
  out += S(k.slabOf({ x: cx - 10, y: -13, w: 20, d: 26, r: 1.6 }, H + 4, 3, P, 4, 0.5), { tone: "mid" });
  out += shoes.filter(near).map(shoe).join("");
  out += Dt([[cx - 8, -11], [cx + 8, -11], [cx - 8, 11], [cx + 8, 11]].map(([x, y]) => at([x, y, H + 7])), { size: 0.42 });
  // lug the spring hooks onto
  out += S(box(cx - 14, cx - 10, -3, 3, H + 5, H + 13), { tone: "mid" });
  out += Dt([at([cx - 12, 0, H + 13])], { size: 0.42 });
  // far upright, drum, near upright
  const upright = (y0) => S(box(cx - 3.5, cx + 3.5, y0, y0 + 2, H + 7, D + 3.5), { tone: "mid" });
  out += upright(-10);
  const FD = alongY(cx, D, -7);
  const wraps = [];
  for (let s = 1.2; s < 14; s += 1.6) wraps.push(G.arcOf(FD, s, R, P));
  out += S(G.disc(-0.9, 0, R + 1.5, FD, P), { tone: "mid" });
  out += S(G.disc(0, 14, R, FD, P), { tone: "hi", crease: "lo", inner: Ln(wraps.join(""), { tone: "faint" }) });
  out += S(G.disc(14, 14.9, R + 1.5, FD, P), { tone: "mid" });
  out += upright(8);
  out += Dt([at([cx - 2.2, 9, D + 3.5]), at([cx + 2.2, 9, D + 3.5])], { size: 0.4 });
  // pointer arm out over the scale, with a hanging index
  out += S(box(cx - 0.8, cx + 0.8, 13, 20, H + 4.2, H + 5.2), { tone: "hi", crease: "lo" });
  out += S(box(cx - 0.45, cx + 0.45, 19.1, 20, H + 1.2, H + 4.2), { tone: "hi", crease: "lo" });
  // axle boss, axle and handwheel on the near side
  const FW = alongY(cx, D, 10);
  out += S(G.disc(0, 1.4, 2.4, FW, P), { tone: "mid" });
  out += S(G.disc(1.4, 4, 1.1, FW, P), { tone: "mid", crease: "none" });
  const face = GEO.WHEEL_Y - 10;
  out += S(G.disc(4, face, 5, FW, P), { tone: "mid" });
  out += Ln(G.circleOf(FW, face, 4, P) + G.circleOf(FW, face, 1.4, P), { tone: "lo" });
  out += `<path data-part="spokes" class="iso-line" data-tone="mid" d="${spokesPath(k, P, 0)}"/>`;
  return out;
}

// The pulley at the crest: far cheek and pulley go behind the cord, the near cheek in front.
const FP = alongY(GEO.PC[0], GEO.PC[2], 0);
function pulleyBack() {
  let out = S(box(-50.5, -43.5, -4.6, -3, H, GEO.PC[2] + 3.5), { tone: "mid" });
  out += S(G.solidOf([[-2.6, 5.4], [-1.4, 5.4], [-1.4, 5], [1.4, 5], [1.4, 5.4], [2.6, 5.4]], FP, P), { tone: "mid" });
  return out;
}
function pulleyFront() {
  let out = S(box(-50.5, -43.5, 3, 4.6, H, GEO.PC[2] + 3.5), { tone: "mid" });
  const FB = alongY(GEO.PC[0], GEO.PC[2], 4.6);
  out += S(G.disc(0, 1.2, 1.9, FB, P), { tone: "mid" });
  out += Dt([at([-49, 3.8, GEO.PC[2] + 3.5]), at([-45, 3.8, GEO.PC[2] + 3.5])], { size: 0.4 });
  return out;
}

const START = { b: 0, d: 0 };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "fr-svg",
  label: "A bench model of friction. A lit block sits at the foot of a 20 degree ramp. A cord runs from an eye on the block up the slope, over a pulley at the crest and level to a winch drum on a sliding carriage. A spring behind the carriage stretches with the pull, and a pointer on the carriage reads the pull in newtons on a scale where one mark shows the pull the slope alone would need. The friction control changes the surface; grit grains on the strip stall the block until the pull builds enough to break it free.",
  body: [
    plate(), ramp(), slopeBack(), deck(),
    `<g data-part="spring">${springSvg(k, P, 0)}</g>`,
    `<g data-part="carriage">${carriage()}</g>`,
    pulleyBack(),
    `<g data-part="grit-back"></g>`,
    `<g data-part="block">${blockSvg(k, P)}</g>`,
    `<g data-part="grit-front"></g>`,
    `<path data-part="cord" class="iso-line" data-tone="hi" d="${cordPath(k, P, 0, 0)}" style="stroke-width:0.8"/>`,
    pulleyFront(), slopeFront(),
  ],
});

// ---- Battlefield view: the same run as a platoon's march on full-bleed terrain (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the card at
// every width; a phone crops the sides. The camera turns like the machine's, so the march runs left to right.
const FW = 640, FH = 420;
const FA = 52, FE = 42;
// Four ground points that frame a screen-aligned rect centred on (cx, cy), hw unit-screen units wide each side.
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const PF = k.fitProjection(groundRect(4, 8, 124, 124 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const TT = fieldTerrain();
const FIELD = fieldStatic(k, PF, TT);
const RUN0 = startRun(1);
const POSE0 = fieldPose(RUN0, 1, 0.1, true, TT);
const unitSvg = (u) => u.kind === "v" ? trVehicle(k, PF, trFaceStep(u.face)) : trSoldier(k, PF, { ...u, face: trFaceStep(u.face) });
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "fr-field",
  label: "The same idea as a platoon's march. A lit blue platoon of four vehicles moves in column along a farm track from a start point on the left to a release point marked with a flag on the right. Beside the track runs the plan: a dashed chalk route on pegs, one peg every ten planned minutes, with a pale ghost vehicle keeping the planned timetable. On the way things go wrong at random points: a vehicle bogs in mud and its crew dig it out, the lead takes a wrong turn down a side track and comes back, the radio fails and a runner goes down the column, fog rolls in and a ground guide walks ahead, or a red enemy outpost opens fire and a fire team dismounts to return it, with casualties on both sides and a medic. The more friction, the more mud and puddles on the track. The ghost reaches the release point first; the platoon arrives late. Sizes, distances, timings and casualties are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TT, incidents(RUN0, 1, true), 0.1)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fog">${fieldFog(k, PF, POSE0.fog)}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg fr-field"', 'class="iso-svg fr-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Clausewitz: “Everything is very simple in War, but the simplest thing is difficult” (On War, Book I, ch. 7, J. J. Graham translation). The physics is real: a 1 kg block, a 20° slope and Coulomb friction. Mapping it onto war is a teaching device, and the winch, spring and grit numbers are notional.";

const LABELS = {
  machine: "Friction rig. Left and right arrow keys set the friction coefficient; G turns grit on or off; R restarts the run; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys set the friction; G turns the incidents on or off; R restarts the march; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 23",
  title: "Friction",
  hint: "Click: grit · ←→ friction",
  readout: "",
  keys: [
    { mark: "lit", label: "The block: a simple task, moved up the slope" },
    { mark: "raised", label: "Winch, spring and pointer: the pull it takes, in newtons" },
    { mark: "edge", label: "Bright mark on the scale: the pull on paper (no friction)" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage fr-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="0.6" aria-valuenow="0.3">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = "Clausewitz: “Everything is very simple in War, but the simplest thing is difficult” (On War, Book I, ch. 7, J. J. Graham translation). The incidents stand in for friction that in war is everywhere, not at a few points; the platoon, distances, timings and casualties are notional.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "The platoon: four vehicles on the march (lit)" },
    { mark: "blue", label: "The plan: chalk route, a peg every 10 min, pale ghost" },
    { mark: "red", label: "Enemy outpost, met in a contact" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="fr-legend fr-legend-machine">${m}</div><div class="fr-legend fr-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "const GEO = DATA.GEO;\n").replace(/^GEO\.[A-Z_]+ = [^\n]*\n/gm, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, LABELS } = DATA;
const K = { iso, pathOf, solidSvg, lineSvg, dotsSvg, coil, depthOf };
const KF = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, slabOf, planOutline, insetPlan, cylinder, onTop, corners };
const root = document.querySelector(".fr-figure");
const stage = root.querySelector(".fr-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const el = { block: part("block"), carriage: part("carriage"), spring: part("spring"), cord: part("cord"), spokes: part("spokes"),
  back: part("grit-back"), front: part("grit-front"), finish: part("finish") };
const readout = root.querySelector("[data-readout]");
const gritBtn = root.querySelector("#fr-grit");
const restartBtn = root.querySelector("#fr-restart");
const slider = root.querySelector("#fr-mu");
const muOut = root.querySelector("#fr-mu-out");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const PAPER_N = paperPull(), PAPER_T = paperTime();
const fieldSvgEl = stage.querySelector(".fr-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fogEl = fieldSvgEl.querySelector('[data-part="fog"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Click: grit · ←→ friction", field: "Click: incidents · ←→ friction" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const TF = fieldTerrain();
const LOOKS = new Map();
let stageF = null, fire = null, marksSig = "", fogSig = "", fieldT = 0;
const U = GEO.U;
// finish dots: a fixed scatter, more of it shown the higher the friction
const FIN = (() => { const r = rng(23), out = []; for (let i = 0; i < 110; i++) out.push([14 + r() * (GEO.L - 24), (r() - 0.5) * 17]); return out; })();
let seed = 1, run = startRun(seed), phase = "run", hold = 0, gritOn = true, mu = 0.3, shownMu = -1;
let touring = !still.matches, last = 0, frame = 0, visible = false, idle = 0, turn = 0, gritKey = "";
const S = { b: 0, d: 0 };
function setGrit(on) {
  gritOn = on;
  gritBtn.setAttribute("aria-pressed", String(on));
  gritBtn.textContent = (view === "field" ? "Incidents: " : "Grit: ") + (on ? "on" : "off");
  gritKey = "";
}
function setMu(v) {
  mu = clamp(Math.round(v * 100) / 100, MODEL.mu[0], MODEL.mu[1]);
  if (document.activeElement !== slider) slider.value = String(mu);
  muOut.textContent = mu.toFixed(2);
  stage.setAttribute("aria-valuenow", String(mu));
}
function newRun() { seed = (seed * 7 + 3) % 9973 || 1; run = startRun(seed); phase = "run"; gritKey = ""; }
function drawFinish() {
  if (shownMu === mu) return;
  shownMu = mu;
  const n = Math.round((mu / MODEL.mu[1]) * FIN.length);
  el.finish.innerHTML = dotsSvg(FIN.slice(0, n).map(([s, y]) => iso(onSlope(s, y, 0), P)), { size: 0.36, tone: "lo" });
}
function drawGrit() {
  const rear = GEO.B0 + S.b;
  const key = (gritOn ? 1 : 0) + ":" + seed + ":" + run.grit.map((g) => (g.crushed ? (GEO.B0 + GEO.BL + g.at - 2 < rear ? "f" : "c") : "u")).join("");
  if (key === gritKey) return;
  gritKey = key;
  let back = "", front = "";
  if (gritOn) for (const g of run.grit) {
    const svgG = grainSvg(K, P, g);
    if (g.crushed && GEO.B0 + GEO.BL + g.at - 4 < rear) front += svgG; else back += svgG;
  }
  el.back.innerHTML = back;
  el.front.innerHTML = front;
}
// Battlefield frame: vehicles and soldiers move by translate and re-render only when their look
// changes; the fire layer writes attributes only; the ground marks redraw only when the run, the grit
// switch or the friction changes, and the fog only while it moves.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, KF, PF); }
  const pose = fieldPose(run, seed, mu, gritOn, TF);
  stageF.put(pose.units.map((u) => {
    const f = trFaceStep(u.face), look = u.side + "|" + (u.kind === "v" ? "v|" + f : trLook(u));
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look, side: u.side, lit: u.lit,
      svg: () => { const kl = look.slice(look.indexOf("|") + 1); if (!LOOKS.has(kl)) LOOKS.set(kl, u.kind === "v" ? trVehicle(KF, PF, f) : trSoldier(KF, PF, { ...u, face: f })); return LOOKS.get(kl); } };
  }));
  const n = Math.round((mu / MODEL.mu[1]) * FG.PUDDLES);
  const sig = seed + "|" + gritOn + "|" + n;
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(KF, PF, TF, pose.incs, mu); marksSig = sig; }
  const fsig = pose.fog.length ? pose.fog[0].a.toFixed(2) + "|" + pose.fog[0].x.toFixed(0) : "";
  if (fsig !== fogSig) { fogEl.innerHTML = fieldFog(KF, PF, pose.fog); fogSig = fsig; }
  fieldSvgEl.toggleAttribute("data-reset", phase === "reset");
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : fieldT));
}
function draw() {
  if (view === "field") { drawField(); drawReadout(); return; }
  el.block.setAttribute("transform", translateAlong(P, [U[0] * S.b, 0, U[2] * S.b]));
  el.carriage.setAttribute("transform", translateAlong(P, [S.d, 0, 0]));
  el.spring.innerHTML = springSvg(K, P, S.d);
  el.cord.setAttribute("d", cordPath(K, P, S.b, S.d));
  el.spokes.setAttribute("d", spokesPath(K, P, turn));
  drawFinish();
  drawGrit();
  drawReadout();
}
function drawReadout() {
  const T = tension(run);
  let text;
  if (phase === "reset") text = "Resetting · friction μ " + mu.toFixed(2);
  else if (run.done) text = "At the top in " + run.t.toFixed(1) + " s · paper " + PAPER_T.toFixed(1) + " s";
  else {
    const st = stateOf(run);
    const head = st === "grit" ? "Stalled on grit" : st === "stuck" ? "Stuck" : "Moving";
    text = head + " · pull " + T.toFixed(1) + " N · paper " + PAPER_N.toFixed(1) + " N";
  }
  if (view === "field") text = fieldReadout(run, seed, mu, phase);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", "Friction " + mu.toFixed(2) + ". " + text);
}
function tick(now) {
  const dt0 = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  fieldT += dt0;
  const dt = view === "field" ? dt0 * FG.SLOW : dt0;
  if (phase === "posed") { if (view === "field" && visible && !still.matches) { draw(); frame = requestAnimationFrame(tick); } else frame = 0; return; }
  if (phase === "run") {
    if (touring) setMu(0.1 + 0.4 * Math.min(1, Math.max(0, run.x / MODEL.travel)) ** 1.2);
    const before = run.wound;
    step(run, dt, mu, gritOn);
    turn -= (run.wound - before) / GEO.DRUM.r;
    S.b = run.x;
    S.d = tension(run) * GEO.PER_N;
    if (run.done) { phase = "hold"; hold = 0; }
  } else if (phase === "hold") {
    hold += dt;
    if (hold > 2.2) { phase = "reset"; if (touring) setMu(0.1); }
  } else if (phase === "reset") {
    const f = 1 - Math.exp(-dt / 0.35);
    turn += (S.b * f) / GEO.DRUM.r;
    S.b -= S.b * f; S.d -= S.d * f;
    if (S.b < 0.05) { S.b = 0; S.d = 0; newRun(); }
  }
  draw();
  const settled = phase === "hold" && hold > 2.2 && !touring;
  // the battlefield keeps going while a contact is firing; otherwise both views stop once settled
  const firing = view === "field" && !still.matches && run.on && incidentKinds(seed, run.grit.length)[run.grit.indexOf(run.on)] === "contact";
  frame = visible && ((!settled && !(phase === "hold" && !touring)) || firing) ? requestAnimationFrame(tick) : 0;
}
const go = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const poke = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; go(); }, 9000);
  go();
};
function restart() { phase = "reset"; poke(); }
const resume = () => { if (phase === "posed") phase = "reset"; };
stage.addEventListener("click", () => { resume(); setGrit(!gritOn); poke(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") setMu(mu + 0.05);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") setMu(mu - 0.05);
  else if (event.key === "g" || event.key === "G" || event.key === " " || event.key === "Enter") setGrit(!gritOn);
  else if (event.key === "r" || event.key === "R") { restart(); event.preventDefault(); return; }
  else if (event.key === "v" || event.key === "V") { setView(view === "field" ? "machine" : "field", true); event.preventDefault(); return; }
  else return;
  event.preventDefault();
  poke();
});
gritBtn.addEventListener("click", () => { setGrit(!gritOn); poke(); });
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  stage.setAttribute("aria-label", LABELS[view]);
  setGrit(gritOn);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  gritKey = ""; shownMu = -1;
  draw();
  if (!still.matches) go();
}
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
restartBtn.addEventListener("click", restart);
// Reset: back to the state the page opened in (first run and its seed, grit, friction, drum and
// idle tour); the view is kept. Restart run is kept as it is: it only starts a fresh run.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  // stop the running frame: reduced motion opens on a still frame with no clock running
  cancelAnimationFrame(frame); frame = 0;
  touring = !still.matches;
  seed = 1; run = startRun(seed); phase = "run"; hold = 0; turn = 0; fieldT = 0;
  S.b = 0; S.d = 0;
  setGrit(true);
  setMu(touring ? 0.1 : 0.3);
  slider.value = String(mu);
  gritKey = ""; shownMu = -1; marksSig = ""; fogSig = "";
  if (still.matches) stillFrame(); else { draw(); go(); }
}
resetBtn.addEventListener("click", reset);
slider.addEventListener("input", () => { setMu(Number(slider.value)); poke(); });
function stillFrame() {
  // reduced motion: one still frame, a run stopped on its first grit grain
  setMu(0.3);
  run = startRun(seed);
  while (!run.on && !run.done) step(run, 1 / 60, mu, gritOn);
  while (run.on && tension(run) < breakaway(mu, run.on.force) - 0.6) step(run, 1 / 60, mu, gritOn);
  S.b = run.x; S.d = tension(run) * GEO.PER_N;
  draw();
}
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible && !still.matches) go();
}, { rootMargin: "120px 0px" }).observe(stage);
setGrit(true);
setMu(touring ? 0.1 : 0.3);
if (still.matches) stillFrame(); else draw();
setView(view, false);
window.__friction = { S, get run() { return run; }, setMu, setGrit, restart, setView, reset, view: () => view,
  stop: () => { touring = false; clearTimeout(idle); },
  poseAt: (sd, m, t) => { touring = false; clearTimeout(idle); seed = sd; setMu(m); setGrit(true); run = startRun(seed); while (run.t < t && !run.done) step(run, 1 / 60, mu, gritOn); S.b = run.x; S.d = tension(run) * GEO.PER_N; phase = "posed"; gritKey = ""; draw(); return document.querySelector("[data-readout]").textContent; },
  pose: (x, m, grit) => { touring = false; clearTimeout(idle); setMu(m); setGrit(grit); run = startRun(seed); while (run.x < x && !run.done) step(run, 1 / 60, mu, gritOn); S.b = run.x; S.d = tension(run) * GEO.PER_N; phase = "posed"; draw(); return document.querySelector("[data-readout]").textContent; } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const mu of [0, 0.3, 0.6]) console.log(`mu ${mu} → steady pull ${steadyPull(mu).toFixed(2)} N`);
console.log("paper", paperPull().toFixed(2), "N", paperTime().toFixed(2), "s · eye", GEO.EYE_H.toFixed(2), "H", H.toFixed(1), "L", L.toFixed(1), "· wrote", PAGE.length, "bytes");
