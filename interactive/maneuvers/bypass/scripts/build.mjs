// Builds interactive/maneuvers/bypass/index.html: an isometric flume in which a convoy of
// floats meets three rocks and either reduces them or goes round them, made with the
// Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/bypass/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, CRITERIA, simulate, outcome, readout } from "./model.mjs";
import { GEO, scene, needle, pointer } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, bpTruck } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -184, y: -76, w: 358, d: 142, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;
const TROUGH = { x: -140, y: -34, w: 306, d: 68, r: 2 };
const TANK = { x: -174, y: -40, w: 34, d: 80, r: 3 };
const TANK_H = 26;
const DIALS = [
  { x: 100, y: -57, r: 13, z: 20, h: 6, count: 12, every: 3 },   // floats through the meter line
  { x: 144, y: -57, r: 13, z: 20, h: 6, count: 10, every: 5 },  // elapsed time, 0..10 s
];
for (const d of DIALS) d.top = d.z + d.h;
const KNOB = { x: -156, y: 50, r: 7, z: 3.2, h: 4 };
KNOB.top = KNOB.z + KNOB.h;
const VALVE = [-162, -24];
const LABEL = { x: -126, y: -70, w: 30, d: 16, r: 1.5 };
const { W, FLOOR, WALL, IN } = GEO;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(TANK, 0, TANK_H + 3), [VALVE[0], VALVE[1], TANK_H + 13], [DIALS[0].x, DIALS[0].y, DIALS[0].top + 2]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 64, elevation: 38 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[19, 4.5], [13, 7.5], [16, 10.5]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// Two dial gauges behind the outlet: floats through the meter line, and elapsed time.
function dial(D, part) {
  const out = [];
  const ped = { x: D.x - 11, y: D.y - 11, w: 22, d: 22, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 4, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 2.6), 4, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3).map(([x, y]) => at([x, y, 4])), { size: 0.45 }));
  out.push(S(k.cylinder(D.x, D.y, 4.6, 4, 2.2, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(D.x, D.y, 2.8, 6.2, D.z - 6.2, P, 20), { tone: "mid", crease: "none", inner: L(k.sideArc(D.x, D.y, 2.8, 12, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(D.x, D.y, D.r, D.z, D.h, P, 64, 0.7), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(D.x, D.y, D.r, D.top - 2.6, D.top, 56, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(D.x, D.y, D.r, D.top - 2.6, P, 40), { tone: "faint" }));
  out.push(L(k.ring(D.x, D.y, D.r - 1.8, D.top, P, 64), { tone: "lo" }));
  const t = k.radialTicks(D.x, D.y, D.r - 1.8, D.count, D.every, D.top, [1.1, 2.3], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(`<path data-part="${part}" class="iso-line" data-tone="hi" data-free="" d="${needle(k, P, D, 0)}" style="stroke-width:1"/>`);
  out.push(L(k.ring(D.x, D.y, 1.3, D.top, P, 16), { tone: "mid" }));
  return out.join("");
}

// The header tank the convoy leaves from.
function tank() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(TANK, 0, 0.1, P)}" style="filter:blur(4px)"/>`);
  out.push(S(k.slabOf(TANK, 0, TANK_H, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(TANK, 8, P, 4) + k.sideSeam(TANK, 18, P, 4), { tone: "faint" }) }));
  const lid = k.insetPlan(TANK, -1);
  out.push(S(k.slabOf(lid, TANK_H, 2, P, 4, 0.6), { tone: "mid" }));
  const hatch = { x: TANK.x + 7, y: TANK.y + 14, w: 20, d: 40, r: 2 };
  out.push(L(k.planOutline(hatch, TANK_H + 2, P, 4), { tone: "lo" }));
  out.push(Dt(k.corners(hatch, 2.4).map(([x, y]) => at([x, y, TANK_H + 2])), { size: 0.42 }));
  out.push(Dt(k.corners(lid, 2.4).map(([x, y]) => at([x, y, TANK_H + 2])), { size: 0.42 }));
  out.push(S(k.slabOf({ x: TANK.x + 14, y: TANK.y + 30, w: 6, d: 8, r: 1 }, TANK_H + 2, 2.2, P, 2, 0.3), { tone: "mid" }));
  // feed valve on the lid: flange, body, stem and a knurled handwheel
  const [vx, vy] = VALVE;
  const top = TANK_H + 2;
  out.push(S(k.cylinder(vx, vy, 5, top, 1.4, P, 28, 0.3), { tone: "mid" }));
  out.push(Dt([0, 1, 2, 3].map((i) => at([vx + 3.9 * Math.cos(i * Math.PI / 2 + 0.6), vy + 3.9 * Math.sin(i * Math.PI / 2 + 0.6), top + 1.4])), { size: 0.4 }));
  out.push(S(k.cylinder(vx, vy, 3.2, top + 1.4, 5, P, 24), { tone: "mid", inner: L(k.sideArc(vx, vy, 3.2, top + 4, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(vx, vy, 0.9, top + 6.4, 2.6, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(vx, vy, 6.2, top + 9, 1.4, P, 36, 0.3), { tone: "mid" }));
  out.push(L(k.knurl(vx, vy, 6.2, top + 9.2, top + 10.2, 34, P, 0.2), { tone: "lo" }));
  out.push(Dt([at([vx, vy, top + 10.4])], { size: 0.5 }));
  return out.join("");
}

// The trough: body, far wall with its waterline, and the water.
function troughBack() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(TROUGH, 0, 0.1, P)}" style="filter:blur(4px)"/>`);
  out.push(S(k.slabOf(TROUGH, 0, FLOOR, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(TROUGH, 2, P, 3), { tone: "faint" }) }));
  // far wall
  const far = { x: TROUGH.x, y: -IN - 4, w: TROUGH.w, d: 4, r: 1 };
  out.push(S(k.slabOf(far, FLOOR, WALL - FLOOR, P, 2, 0.4), { tone: "mid" }));
  // water surface, then the waterline along the far wall's inner face
  const water = k.pathOf([[-140, -IN], [162, -IN], [162, IN], [-140, IN]].map(([x, y]) => at([x, y, W])), true);
  out.push(`<path class="bp-water" d="${water}"/>`);
  out.push(L(k.segment([-140, -IN, W], [162, -IN, W], P), { tone: "lo" }));
  out.push(L(k.segment([MODEL.x1, -IN, W], [MODEL.x1, IN, W], P), { tone: "faint" }));
  // screws on the far wall top
  const sc = [];
  for (let x = -130; x <= 156; x += 36) sc.push(at([x, -IN - 2, WALL]));
  out.push(Dt(sc, { size: 0.42 }));
  return out.join("");
}

function troughFront() {
  const out = [];
  const near = { x: TROUGH.x, y: IN, w: TROUGH.w - 4, d: 4, r: 1 };
  out.push(S(k.slabOf(near, FLOOR, WALL - FLOOR, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(near, FLOOR + 5, P, 2), { tone: "faint" }) }));
  // flow scale on the near wall top, growing from its inner edge
  const t = k.topTicks(-130, 115, 5, 5, IN, WALL, [1.2, 2.4], P, "x");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const sc = [];
  for (let x = -133; x <= 157; x += 36) sc.push(at([x, IN + 3.2, WALL]));
  out.push(Dt(sc, { size: 0.42 }));
  // clamps that hold the trough to the plate along its near side
  for (const x of [-112, -32, 48, 128]) {
    const cl = { x: x - 5, y: IN + 4, w: 10, d: 5, r: 1 };
    out.push(S(k.slabOf(cl, 0, 7, P, 2, 0.4), { tone: "mid" }));
    out.push(Dt([at([x - 2.6, IN + 6.5, 7]), at([x + 2.6, IN + 6.5, 7])], { size: 0.42 }));
  }
  const end = { x: 162, y: -IN, w: 4, d: 2 * IN + 4, r: 1 };
  out.push(S(k.slabOf(end, FLOOR, WALL - FLOOR, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(end, FLOOR + 5, P, 2), { tone: "faint" }) }));
  return out.join("");
}

// The bypass-criteria selector: a knob with four detents on a small base.
function knobBase() {
  const out = [];
  const base = { x: KNOB.x - 11, y: KNOB.y - 8, w: 22, d: 20, r: 2 };
  out.push(S(k.slabOf(base, 0, KNOB.z, P, 3, 0.5), { tone: "mid" }));
  const det = [];
  for (let c = 0; c < 4; c++) {
    const a = (120 + c * 40) * Math.PI / 180;
    det.push(at([KNOB.x + Math.sin(a) * (KNOB.r + 2.2), KNOB.y - Math.cos(a) * (KNOB.r + 2.2), KNOB.z]));
  }
  out.push(Dt(det, { size: 0.5 }));
  out.push(Dt(k.corners(base, 2.2).filter(([, y]) => y < KNOB.y).map(([x, y]) => at([x, y, KNOB.z])), { size: 0.42 }));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r, KNOB.z, KNOB.h, P, 40, 0.5), { tone: "mid" }));
  out.push(L(k.knurl(KNOB.x, KNOB.y, KNOB.r, KNOB.z + 0.6, KNOB.top - 0.6, 30, P), { tone: "lo" }));
  out.push(`<path data-part="pointer" class="iso-line" data-tone="hi" data-free="" d="${pointer(k, P, KNOB, 2)}" style="stroke-width:1"/>`);
  out.push(Dt([at([KNOB.x, KNOB.y, KNOB.top])], { size: 0.6 }));
  return out.join("");
}

const START_C = 2;
const START = simulate(START_C, 0);
const vanesOf = (c) => MODEL.rocks.map((r) => (r.rank <= c ? -GEO.VANE_ANG : GEO.VANE_ANG));
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "bp-svg",
  label: "A bench flume. A convoy of twelve lit floats leaves a header tank and runs down a channel past three rocks of different sizes, each beside a divider with a turning vane. Rocks the selector knob allows to be bypassed are passed in the open lane, while a float or two stays behind to hold each one; rocks that may not be bypassed stop the whole convoy until they are cut down. Two dials behind the outlet count the floats that reach the collecting pool and the time they take.",
  body: [plate(), DIALS.map((d, i) => dial(d, i ? "clock" : "count")).join(""), tank(), troughBack(),
    `<g data-part="live">${scene(k, P, MODEL, { ...START, vanes: vanesOf(START_C) })}</g>`, troughFront(), knobBase()],
});

// ---- Battlefield view: the same state on full-bleed terrain at company scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the card at
// every width. The camera turns like the machine's, so the column advances left to right.
const FW = 640, FH = 420;
const FA = 70, FE = 42;
const RAD = Math.PI / 180;
// Four ground points that frame a screen-aligned rect centred on (cx, cy), hw unit-screen units wide each side.
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const PF = k.fitProjection(groundRect(6, 18, 174, 174 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const TT = fieldTerrain();
const FIELD = fieldStatic(k, PF, TT);
const POSE0 = fieldPose(START_C, START, TT);
const look = (u) => (u.kind ? u.kind === "t" ? bpTruck(k, PF, trFaceStep(u.face)) : trVehicle(k, PF, trFaceStep(u.face)) : trSoldier(k, PF, { ...u, face: trFaceStep(u.face) }));
const liveItems = [...POSE0.units, ...POSE0.men].map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${look(u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "bp-field",
  label: "The same idea on a battlefield. A lit blue company column of twelve small tracked vehicles drives from the left along a valley road between wooded slopes. Astride the road stand three red enemy strongpoints of different sizes, each a cluster of fighting positions with its fire sector marked down the road: medium, then large, with wire on its flanks, then small. Beside each one a dirt side track loops round it. A strongpoint within the bypass criteria is passed on its side track while one or two vehicles halt on the road short of it, put out a two-soldier observation post and fire on it to keep it in place. A strongpoint above the criteria stops the column: the lead vehicles fire on it, a squad dismounts and assaults its near flank by fire and movement, the defenders go down or withdraw to the wood behind, and only then does the column drive on. Casualties on both sides lie greyed where they fell, and a white ambulance trails the column to the latest friendly casualty. Past a chalk phase line the vehicles that got through park in a chalk-outlined assembly area. Sizes, distances, timings and casualty counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TT, START_C, START)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...liveItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg bp-field"', 'class="iso-svg bp-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (FM 3-90, 2023) defines bypass as a tactical mission task in which a unit “deliberately avoids contact with an obstacle or an enemy force,” ordered “to maintain momentum.” The floats held back at each bypassed rock stand for the cost: a bypassed force is normally kept under observation until relieved by another force. Flow numbers are notional.";

const LABELS = {
  machine: "Bypass flume. Left and right arrow keys set the bypass criteria; Space or Enter switches between reducing every rock and bypassing; R reruns the convoy; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys set the bypass criteria; Space or Enter switches between reducing every strongpoint and bypassing; R reruns the column; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 21",
  title: "Bypassing strongpoints",
  hint: "Click: reduce / bypass",
  readout: readout(START_C, START),
  keys: [
    { mark: "lit", label: "Floats: the attacking force" },
    { mark: "raised", label: "Rocks: enemy strongpoints, three sizes" },
    { mark: "edge", label: "Knob: bypass criteria; dials: floats out and time" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage bp-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${START_C}" aria-valuetext="${CRITERIA[START_C]}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("The floats held back at each bypassed rock stand for the cost", "The vehicles left behind at each bypassed strongpoint stand for the cost").replace("Flow numbers are notional.", "Unit sizes, distances, timings and casualties are notional.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Attacking company column (main effort), lit" },
    { mark: "blue", label: "Friendly: vehicles left to hold, observers, squad" },
    { mark: "red", label: "Enemy: three strongpoints, small to large" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="bp-legend bp-legend-machine">${m}</div><div class="bp-legend bp-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, DIALS, KNOB, START_C, VANE: GEO.VANE_ANG, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs").replace(/^const MODEL = [\s\S]*?\n};\n/m, "const MODEL = DATA.MODEL;\n")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "const GEO = DATA.GEO;\n")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIALS, KNOB, LABELS } = DATA;
const K = { depthOf, iso, cameraOf, towardViewer, pathOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, slabOf, sideSeam, cylinder, lineOnTop, onTop };
const root = document.querySelector(".bp-figure");
const stage = root.querySelector(".bp-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector('[data-part="live"]');
const countEl = svg.querySelector('[data-part="count"]');
const clockEl = svg.querySelector('[data-part="clock"]');
const pointerEl = svg.querySelector('[data-part="pointer"]');
const readoutEl = root.querySelector("[data-readout]");
const modeBtn = root.querySelector("#bp-mode");
const slider = root.querySelector("#bp-criteria");
const rerun = root.querySelector("#bp-rerun");
const fieldSvgEl = stage.querySelector(".bp-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
const HINTS = { machine: "Click: reduce / bypass", field: "Click: reduce / bypass" };
const TT = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, dt: 0, ambS: null };
let stageF = null, fire = null, marksSig = "";
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { c: DATA.START_C, lastBypass: DATA.START_C || 2, t: 0, knob: DATA.START_C, count: 0, clock: 0, vanes: MODEL.rocks.map((r) => (r.rank <= DATA.START_C ? -DATA.VANE : DATA.VANE)) };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0, sim = simulate(S.c, 0);
// tour: reduce every rock, then bypass by criteria (small and medium may be bypassed)
const FIN = [0, 1, 2, 3].map((c) => outcome(c).finish ?? 10);
const RUN = (c) => FIN[c] + 1.4;
// one incremental run per (criteria, start); a frame advances it a few steps instead of rerunning from 0.
// Past the finish the state no longer changes once the last float has parked, so time is capped there.
let RUNNER = null;
function simAt(c, t) {
  t = Math.min(t, 30, FIN[c] + 2);
  if (!RUNNER || RUNNER.c !== c || Math.round(t / MODEL.dt) < RUNNER.r.steps()) RUNNER = { c, r: runner(c) };
  return RUNNER.r.to(t);
}
const TOUR = [0, 2];
function tourAt(t) {
  const total = TOUR.reduce((a, c) => a + RUN(c), 0);
  t %= total;
  for (const c of TOUR) { if (t < RUN(c)) return [c, t]; t -= RUN(c); }
  return [TOUR[0], 0];
}
function describe() {
  stage.setAttribute("aria-valuenow", String(S.c));
  stage.setAttribute("aria-valuetext", CRITERIA[S.c]);
  modeBtn.setAttribute("aria-pressed", String(S.c === 0));
  modeBtn.textContent = S.c === 0 ? "Bypass by criteria" : "Reduce every strongpoint";
  slider.setAttribute("aria-label", "Bypass criteria: 0 reduce every " + (view === "field" ? "strongpoint" : "rock") + ", 1 bypass small, 2 bypass small and medium, 3 bypass all");
  if (document.activeElement !== slider) slider.value = String(S.c);
}
function setCriteria(c) {
  c = clamp(Math.round(c), 0, 3);
  if (c > 0) S.lastBypass = c;
  if (c !== S.c) { S.c = c; S.t = 0; }
  describe();
}
// Battlefield frame: vehicles and soldiers move by translate and re-render only when their look changes
// (a 15 degree facing step, a stride, a pose or a side); the fire layer writes attributes only; the fire
// sectors redraw only when a strongpoint's state moves them. The ambulance is eased so it never jumps.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S.c, sim, TT, FM.ambS === null ? {} : { ambS: FM.ambS });
  const want = pose.ambS;
  if (FM.ambS === null || still.matches || want < FM.ambS - 30) FM.ambS = want;
  else FM.ambS += clamp(want - FM.ambS, -MODEL.speed * FM.dt, MODEL.speed * FM.dt);
  stageF.put([...pose.units, ...pose.men].map((u) => {
    const f = trFaceStep(u.face);
    const lk = (u.kind ? u.kind + "|" + f : trLook(u)) + "|" + u.side + (u.lit ? "|lit" : "");
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look: lk, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(lk)) LOOKS.set(lk, u.kind ? (u.kind === "t" ? bpTruck(K, PF, f) : trVehicle(K, PF, f)) : trSoldier(K, PF, { ...u, face: f })); return LOOKS.get(lk); } };
  }));
  const sig = S.c + "|" + pose.sig;
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TT, S.c, sim); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  if (view === "field") drawField();
  else {
    layer.innerHTML = scene(K, P, MODEL, { ...sim, vanes: S.vanes });
    countEl.setAttribute("d", needle(K, P, DIALS[0], S.count));
    clockEl.setAttribute("d", needle(K, P, DIALS[1], S.clock));
    pointerEl.setAttribute("d", pointer(K, P, KNOB, S.knob));
  }
  const text = readout(S.c, sim);
  if (readoutEl.textContent !== text) readoutEl.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  FM.t += dt; FM.dt = dt;
  if (touring) {
    clock += dt;
    const [c, t] = tourAt(clock);
    if (c !== S.c) { S.c = c; describe(); }
    S.t = t;
  } else {
    S.t = calm ? 30 : S.t + dt;
  }
  sim = simAt(S.c, S.t);
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  S.knob = ease(S.knob, S.c, 0.2);
  S.vanes = S.vanes.map((v, j) => ease(v, MODEL.rocks[j].rank <= S.c ? -DATA.VANE : DATA.VANE, 0.25));
  S.count = ease(S.count, sim.through / MODEL.n, 0.2);
  S.clock = ease(S.clock, Math.min(sim.finish ?? sim.t, 10) / 10, 0.08);
  draw();
  const done = sim.finish !== null && S.t > sim.finish + 1.2;
  const settled = !touring && (calm || done) && Math.abs(S.knob - S.c) < 0.002 && Math.abs(S.count - sim.through / MODEL.n) < 0.001;
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const choose = (c) => { const was = S.c; setCriteria(c); if (S.c !== was || !touring) S.t = S.c !== was ? 0 : S.t; hold(); };
const toggle = () => { setCriteria(S.c === 0 ? S.lastBypass : 0); S.t = 0; hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  describe();
  draw();
  run();
}
stage.addEventListener("click", toggle);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") choose(S.c + 1);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") choose(S.c - 1);
  else if (event.key === "Home") choose(0);
  else if (event.key === "End") choose(3);
  else if (event.key === " " || event.key === "Enter") toggle();
  else if (event.key === "r" || event.key === "R") { S.t = 0; hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
modeBtn.addEventListener("click", toggle);
slider.addEventListener("input", () => choose(Number(slider.value)));
rerun.addEventListener("click", () => { S.t = 0; hold(); });
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { S.t = 30; sim = simulate(S.c, 30); S.count = sim.through / MODEL.n; S.clock = Math.min(sim.finish, 10) / 10; }
describe();
setView(view, false);
window.__bypass = { S, FM, choose, toggle, setView, view: () => view, sim: () => sim, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (let c = 0; c < 4; c++) console.log(c, CRITERIA[c], JSON.stringify(outcome(c)));
console.log("wrote index.html", PAGE.length, "bytes");
