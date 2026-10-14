// Builds interactive/maneuvers/frontal-attack/index.html: an isometric bench press driving a broad
// platen into a spring-backed wall, made with the Anatomy kit (../../kit, MIT).
// Run: node interactive/maneuvers/frontal-attack/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, pushBack, readoutOf } from "./model.mjs";
import { GEO, scene, needle, knobIndex } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -78, y: -80, w: 230, d: 180, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const HEAD = { x: -72, y: -34, w: 30, d: 68, r: 2 };
const HEAD_H = 40;
const KNOB = { x: -57, y: 0, r: 5, z: HEAD_H, h: 4 };
KNOB.top = KNOB.z + KNOB.h;
const DIAL = { x: 22, y: 84, r: 16, z: 22, h: 7 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: 64, y: 78, w: 32, d: 17, r: 1.5 };
const RULER = { x: 68, y: 50, w: 46, d: 7, r: 0.8 };
const RAILS = [-66, 62];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [HEAD.x, HEAD.y, KNOB.top + 2], [DIAL.x, DIAL.y, DIAL.top + 2], [GEO.WF, -70, 36]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 55 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -6, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // the bed the wall blocks slide on: a shallow inlaid pad with its own outline
  const bed = { x: 58, y: -52, w: 62, d: 104, r: 2 };
  out.push(S(k.slabOf(bed, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[22, 5], [16, 9], [19, 13]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// Two rails the platen's ears ride on, with end stops.
function rails() {
  const out = [];
  for (const y of RAILS) {
    out.push(S(k.slabOf({ x: -2, y, w: 84, d: 4, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([6, 30, 54, 76].map((x) => at([x, y + 2, 3])), { size: 0.4 }));
  }
  for (const x of [-7, 82]) {
    for (const y of RAILS) {
      const stop = { x, y: y - 3, w: 5, d: 10, r: 1 };
      out.push(S(k.slabOf(stop, 0, 8, P, 3, 0.5), { tone: "mid" }));
      out.push(Dt([at([x + 2.5, y + 2, 8])], { size: 0.45 }));
    }
  }
  return out.join("");
}

// A ruler beside the wall: how far the front has been pushed back.
function ruler() {
  const out = [S(k.slabOf(RULER, 0, 0.8, P, 3), { tone: "lo", crease: "none" })];
  const minor = [], major = [];
  for (let x = RULER.x + 2; x <= RULER.x + RULER.w - 2 + 1e-9; x += 2) {
    const big = (x - GEO.WF) % 12 === 0;
    (big ? major : minor).push(k.lineOnTop([x, RULER.y], [x, RULER.y + (big ? 4 : 2.4)], 0.8, P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  return out.join("");
}

// The press: a heavy head block carrying the ratio knob, and the cylinder on two saddles.
function press() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(HEAD, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(HEAD, 0, HEAD_H, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(HEAD, 10, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(HEAD, 3), HEAD_H, P, 3), { tone: "faint" }));
  out.push(Dt(k.corners(HEAD, 4.4).map(([x, y]) => at([x, y, HEAD_H])), { size: 0.45 }));
  // ratio scale round the knob, then the knob
  const t = k.radialTicks(KNOB.x, KNOB.y, KNOB.r + 4.6, 22, 2, HEAD_H, [1.2, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(k.ring(KNOB.x, KNOB.y, KNOB.r + 4.6, HEAD_H, P, 48), { tone: "faint" }));
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r + 1.4, HEAD_H, 1, P, 32), { tone: "mid" }));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r, KNOB.z + 1, KNOB.h - 1, P, 32, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(KNOB.x, KNOB.y, KNOB.r, KNOB.z + 1.4, KNOB.top - 0.4, 26, P), { tone: "lo" }));
  out.push(`<path data-part="knob" class="iso-line" data-tone="hi" d="${knobIndex(k, P, KNOB, 0)}" style="stroke-width:0.9"/>`);
  out.push(L(k.ring(KNOB.x, KNOB.y, 1, KNOB.top, P, 12), { tone: "mid" }));
  // saddles, then the cylinder barrel, its end caps, tie bolts and the rod gland
  for (const x of [-36, -20]) {
    const sad = { x, y: -17, w: 7, d: 34, r: 1 };
    out.push(S(k.slabOf(sad, 0, 8, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([at([x + 3.5, -13.5, 8]), at([x + 3.5, 13.5, 8])], { size: 0.42 }));
  }
  const cap = (x) => ({ x, y: -15, w: 5, d: 30, r: 3 });
  out.push(S(k.slabOf(cap(-42), 4, 30, P, 4, 0.5), { tone: "mid" }));
  const barrel = { x: -37, y: -12, w: 23, d: 24, r: 3 };
  out.push(S(k.slabOf(barrel, 7, 24, P, 4, 0.4), { tone: "mid", inner: L(k.sideSeam(barrel, 19, P, 4), { tone: "faint" }) }));
  out.push(S(k.slabOf(cap(-14), 4, 30, P, 4, 0.5), { tone: "mid" }));
  out.push(Dt([[-39.5, -12.5], [-39.5, 12.5], [-11.5, -12.5], [-11.5, 12.5]].map(([x, y]) => at([x, y, 34])), { size: 0.45 }));
  for (const y of [-10, 10]) out.push(S(k.slabOf({ x: -37, y: y - 1.2, w: 23, d: 2.4, r: 1 }, 31, 2.4, P, 3), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: -9, y: -6, w: 3, d: 12, r: 2 }, GEO.ROD_Z - 6, 12, P, 3, 0.3), { tone: "mid" }));
  return out.join("");
}

// The backstop the springs bear on: bolted to the plate, the last thing drawn in the live layer.
function backstop() {
  const plan = { x: GEO.BACK, y: -56, w: 14, d: 112, r: 2 };
  const out = [S(k.slabOf(plan, 0, 22, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, 8, P, 3), { tone: "faint" }) })];
  out.push(L(k.planOutline(k.insetPlan(plan, 2.4), 22, P, 3), { tone: "faint" }));
  const bolts = [-48, -16, 16, 48].map((y) => [GEO.BACK + 7, y]);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 22, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(bolts.map(([x, y]) => at([x, y, 22])), { size: 0.5 }));
  return out.join("");
}

// The pressure gauge: how hard the press is pushing, as a ratio of the wall's holding strength.
function gauge() {
  const out = [];
  const cy = -12, gy = DIAL.y;
  // port block bolted to the cylinder's front cap, then the line down the bench
  out.push(S(k.slabOf({ x: cy - 2.4, y: 15, w: 4.8, d: 4.4, r: 0.8 }, 0, 12, P, 3, 0.3), { tone: "mid" }));
  out.push(Dt([at([cy, 17.2, 12])], { size: 0.42 }));
  out.push(S(k.slabOf({ x: cy - 1.3, y: 19.4, w: 2.6, d: gy - 19.4 - 1.3, r: 1 }, 0, 2.6, P, 3), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: cy - 2.4, y: gy - 2.4, w: 4.8, d: 4.8, r: 1.2 }, 0, 3.6, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: cy + 2.4, y: gy - 1.3, w: DIAL.x - 13 - cy - 2.4, d: 2.6, r: 1 }, 0, 2.6, P, 3), { tone: "mid", crease: "none" }));
  for (const [x, y, w, d] of [[cy - 3, 34, 6, 3], [cy - 3, 52, 6, 3], [0, gy - 3, 3, 6]]) {
    out.push(S(k.slabOf({ x, y, w, d, r: 0.6 }, 0, 3.4, P, 2, 0.2), { tone: "mid" }));
    out.push(Dt([at([x + w / 2, y + d / 2, 3.4])], { size: 0.4 }));
  }
  const ped = { x: DIAL.x - 13, y: DIAL.y - 13, w: 26, d: 26, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5.6, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3.4, 7.4, DIAL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(DIAL.x, DIAL.y, 3.4, 14, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 64, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" }));
  // 0..6 in steps of 0.5: 12 intervals, a major tick every whole ratio
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 12, 2, DIAL.top, [1.2, 2.6], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // two engraved marks: the wall's holding strength (1:1) and the breach (4.5:1)
  const mark = (r) => {
    const a = -0.75 * Math.PI + (r / MODEL.range[1]) * 1.5 * Math.PI;
    const sx = Math.sin(a), sy = -Math.cos(a), R = DIAL.r - 2;
    return k.lineOnTop([DIAL.x + sx * R, DIAL.y + sy * R], [DIAL.x + sx * (R - 3.4), DIAL.y + sy * (R - 3.4)], DIAL.top, P);
  };
  out.push(L(mark(MODEL.hold), { tone: "hi", free: "end" }), L(mark(MODEL.breach), { tone: "hi", free: "end" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, DIAL, 0)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.5, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}

const BACKSTOP = { key: 1e6, svg: backstop() };
const START = { r: 0.8, d: pushBack(0.8), g: 0, weak: MODEL.weak };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "fa-svg",
  label: "A bench model of a frontal attack. A hydraulic press on the left drives one broad lit platen straight into a wall of six blocks, each backed by a coil spring against a bolted backstop. A knob on the press sets the attacker-to-defender ratio and a gauge reads the pressure. Below the wall's holding strength the wall does not move and is only pinned; above it the whole front is pushed back along a ruler; at a high ratio one block gives way and a gap opens.",
  body: [plate(), rails(), ruler(), `<g data-part="press">${press()}</g>`, `<g data-part="live">${scene(k, P, { ...START, statics: [BACKSTOP] })}</g>`, `<g data-part="gauge">${gauge()}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at platoon scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape, shown with "slice" so the ground fills the whole card at every
// width; a phone crops the sides. PF frames the visible ground rect (the same framing as Fig 1).
const FW = 640, FH = 420;
// Fig 1's ground rect, re-centred on FG.VIEW (a point of the attack axis) and shrunk by its zoom.
const VC = [FG.O[0] + FG.VIEW.u * Math.cos(FG.ANG * Math.PI / 180), FG.O[1] + FG.VIEW.u * Math.sin(FG.ANG * Math.PI / 180)];
const PF = k.fitProjection([[54, -169], [212.5, 57.4], [-18.5, 219], [-177, -7.2]].map(([x, y]) => [VC[0] + (x - 17.75) / FG.VIEW.zoom, VC[1] + (y - 25.05) / FG.VIEW.zoom, 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const POSE0 = fieldPose(START, MODEL, TF);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "fa-field",
  label: "The same idea on a battlefield. Across the top, a red enemy rifle squad and machine-gun team hold a line of two-man fighting positions with sandbagged rims behind a belt of wire, with a hedgerow and a second line of positions behind them and a wood at their back; a stream covers one flank and a wood the other, so there is no open flank. The machine gun's fire sector is marked on the ground. Across the open, ploughed ground in front, the lit blue assault line of rifle squads in squad line attacks the whole front at once, with blue machine-gun teams firing from behind stone walls on the line of departure. The ratio sets how many blue squads and machine-gun teams are in the attack. At a low ratio the assault goes to ground, pinned, short of the wire; above 1:1 the enemy falls back toward its second line and the assault follows; at the breach ratio the enemy pair in one position runs and the centre squad goes through the gap. Sizes, ranges and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg fa-field"', 'class="iso-svg fa-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (FM 3-90, 2023) says a frontal attack keeps “continuous pressure along the entire front until a breach occurs or the attacking forces succeed in pushing the enemy forces back.” The ratio thresholds in this model are notional, not data.";

const LABELS = {
  machine: "Frontal attack press. Left and right arrow keys set the attacker to defender ratio; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys set the attacker to defender ratio; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 6",
  title: "Frontal attack",
  hint: "Hover across · arrows set ratio",
  readout: readoutOf(START.r),
  keys: [
    { mark: "lit", label: "Attacker: the broad platen pressing the whole front" },
    { mark: "raised", label: "Defender: six spring-backed blocks against a backstop" },
    { mark: "edge", label: "Gauge: press pressure; marks at 1:1 and the breach" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage fa-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="${MODEL.range[0]}" aria-valuemax="${MODEL.range[1]}" aria-valuenow="${START.r}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("The ratio thresholds in this model are notional, not data.", "The ratio thresholds, unit sizes, ranges and timings here are notional, not data.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Main effort: the assault line of rifle squads (lit)" },
    { mark: "blue", label: "Friendly: machine-gun teams firing from the start line" },
    { mark: "red", label: "Enemy: a rifle squad and an MG team, dug in" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="fa-legend fa-legend-machine">${m}</div><div class="fa-legend fa-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, DIAL, KNOB, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs").replace(/^const MODEL = [\s\S]*?\n};\n/m, "const MODEL = DATA.MODEL;\n")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, KNOB, START, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf };
const root = document.querySelector(".fa-figure");
const stage = root.querySelector(".fa-stage");
const svg = stage.querySelector(".fa-svg");
const layer = svg.querySelector('[data-part="live"]');
const needleEl = svg.querySelector('[data-part="needle"]');
const knobEl = svg.querySelector('[data-part="knob"]');
const readout = root.querySelector("[data-readout]");
const slider = root.querySelector("#fa-ratio");
const tourBtn = root.querySelector("#fa-tour");
const fieldSvgEl = stage.querySelector(".fa-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const TF = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, dt: 1 / 60, va: 0, ve: 0, vb: 0 };
let stageF = null, fire = null, marksSig = "", lastPose = null;
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const BACKSTOP = { key: 1e6, svg: layer.lastElementChild ? "" : "" };
const S = { ...START, target: START.r, p: START.r };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
const TOUR = [[0, 0.8], [2.6, 2.6], [6, 4.9], [10.2, 0.8]];
const LOOP = 14;
function tourAt(t) {
  t %= LOOP;
  let step = TOUR[0];
  for (const row of TOUR) if (t >= row[0]) step = row;
  return step[1];
}
// Battlefield frame: soldiers move by translate and re-render only when their look changes; the
// fire layer writes attributes only; the fire sectors redraw only when the state moves them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, MODEL, TF, FM);
  if (lastPose && FM.dt > 0) {
    const sp = (a, b) => (a - b) / FM.dt;
    FM.va += (sp(pose.uLine, lastPose.uLine) - FM.va) * 0.3;
    FM.ve += (sp(pose.e * FG.U_ALT, lastPose.e * FG.U_ALT) - FM.ve) * 0.3;
    FM.vb += (sp(pose.b * FG.U_GAP, lastPose.b * FG.U_GAP) - FM.vb) * 0.3;
  }
  lastPose = pose;
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = pose.men.find((m) => m.id === "e-" + FG.MG + "0").pose + "|" + pose.e.toFixed(2) + "|" + pose.supp.toFixed(2) + "|" + pose.mgIn.map((x) => x.toFixed(2)).join(",");
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  if (view === "field") drawField();
  else {
    layer.innerHTML = scene(K, P, { ...S, statics: [STATIC_BACK] });
    needleEl.setAttribute("d", needle(K, P, DIAL, clamp(S.p / MODEL.range[1], 0, 1)));
    knobEl.setAttribute("d", knobIndex(K, P, KNOB, (S.target - MODEL.range[0]) / (MODEL.range[1] - MODEL.range[0])));
  }
  const text = readoutOf(S.r);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", S.r.toFixed(1));
  stage.setAttribute("aria-valuetext", text);
  if (document.activeElement !== slider) slider.value = S.target.toFixed(1);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; S.target = tourAt(clock); }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  S.r = ease(S.r, S.target, 0.5);
  if (Math.abs(S.r - S.target) < 0.004) S.r = S.target;
  S.p = ease(S.p, S.r, 0.2);
  S.d = ease(S.d, pushBack(S.r), 0.25);
  S.g = ease(S.g, breached(S.r) ? MODEL.gap : 0, 0.3);
  const force = fieldForce(S.r);
  FM.sq = force.sq.map((w, i) => (calm ? w : fieldChase(FM.sq?.[i], w, dt, 0.35)));
  FM.mg = force.mg.map((w, i) => (calm ? w : fieldChase(FM.mg?.[i], w, dt, 0.35)));
  FM.t += dt;
  FM.dt = dt;
  draw();
  const settled = !touring && S.r === S.target && Math.abs(S.d - pushBack(S.r)) < 0.005 &&
    Math.abs(S.g - (breached(S.r) ? MODEL.gap : 0)) < 0.005 && Math.abs(S.p - S.r) < 0.002;
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  tourBtn.setAttribute("aria-pressed", "false");
  clearTimeout(idle);
  idle = setTimeout(() => { if (!still.matches) startTour(); }, 9000);
  run();
};
function startTour() { touring = true; clock = 0; tourBtn.setAttribute("aria-pressed", "true"); run(); }
const steer = (r) => { S.target = Math.round(clamp(r, MODEL.range[0], MODEL.range[1]) * 10) / 10; hold(); };
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const box = stage.getBoundingClientRect();
  const f = clamp((event.clientX - box.left) / box.width, 0.08, 0.92);
  steer(MODEL.range[0] + (f - 0.08) / 0.84 * (MODEL.range[1] - MODEL.range[0]));
});
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(S.target + 0.1);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(S.target - 0.1);
  else if (event.key === "PageUp") steer(S.target + 0.5);
  else if (event.key === "PageDown") steer(S.target - 0.5);
  else if (event.key === "Home") steer(MODEL.range[0]);
  else if (event.key === "End") steer(MODEL.range[1]);
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
slider.addEventListener("input", () => steer(Number(slider.value)));
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  lastPose = null;
  draw();
  run();
}
tourBtn.addEventListener("click", () => { if (touring) hold(); else startTour(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setView(view, false);
window.__frontalAttack = { S, steer, setView, view: () => view, stop: () => { touring = false; clearTimeout(idle); tourBtn.setAttribute("aria-pressed", "false"); } };
`.replace("const BACKSTOP = { key: 1e6, svg: layer.lastElementChild ? \"\" : \"\" };", `const STATIC_BACK = { key: 1e6, svg: ${JSON.stringify(BACKSTOP.svg)} };`);

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const r of [0.8, 1, 2, 2.75, 3, 4.5, 6]) console.log(`ratio ${r} → ${readoutOf(r)}`);
console.log("wrote index.html", PAGE.length, "bytes");
