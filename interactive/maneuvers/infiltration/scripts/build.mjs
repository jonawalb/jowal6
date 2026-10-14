// Builds interactive/maneuvers/infiltration/index.html: an isometric vibratory sieve made with
// the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/infiltration/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, plan, screenLayout, positionAt, floorAt, readoutText, fits, elementWidth, losses } from "./model.mjs";
import { GEO, trayParts, scene, cable, needle, pointer, KNOB_ANGLES, KNOB_FACE } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, fsW } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 340;
const RAD = Math.PI / 180;

const PLATE = { x: -134, y: -48, w: 258, d: 117, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIAL = { x: 104, y: 54, r: 15, z: 22, h: 7 };
DIAL.top = DIAL.z + DIAL.h;
const BOX = { x: -126, y: 38, w: 26, d: 22, r: 2 };
const BOX_H = 11;
const KNOB = { x: -111, y: 49, r: 4.6, z: BOX_H, h: 4 };
KNOB.top = KNOB.z + KNOB.h;
const GLAND = { x: -122, y: 42, r: 1.5, h: 2.6 };
const LABEL = { x: -92, y: 43, w: 28, d: 16, r: 1.5 };
const RULER = { x: -54, y: 48, w: 124, d: 7, r: 1 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.MOTOR.x, GEO.MOTOR.y, GEO.MOTOR.z1 + 9], [MODEL.screenX, -34, GEO.ZF + GEO.BAR_H + GEO.RAIL_H], [DIAL.x, DIAL.y, DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 14, azimuth: 63, elevation: 42 },
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
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[20, 5], [14, 8.4], [17, 11.8]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  // ruler strip along the front: the tray's length scale
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RULER.x + 4, RULER.x + RULER.w - 4, 4, 5, RULER.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(Dt([at([RULER.x + 2, RULER.y + 3.5, 0.6]), at([RULER.x + RULER.w - 2, RULER.y + 3.5, 0.6])], { size: 0.4 }));
  return out.join("");
}

// Four rubber isolators that carry the shaker deck.
function mounts() {
  const out = [];
  for (const [x, y] of byDepth([[-78, -24], [78, -24], [-78, 24], [78, 24]])) {
    out.push(`<path class="iso-halo" d="${k.cylinder(x, y, 7, 0, 0.1, P, 32).fill}" style="filter:blur(2px)"/>`);
    out.push(S(k.cylinder(x, y, 6.4, 0, 2.4, P, 36, 0.4), { tone: "mid" }));
    out.push(Dt([[x - 4.6, y], [x + 4.6, y], [x, y - 4.6], [x, y + 4.6]].map(([a, b]) => at([a, b, 2.4])), { size: 0.38 }));
    out.push(S(k.cylinder(x, y, 4.4, 2.4, 10.6, P, 32), { tone: "lo", crease: "none", inner: L(k.sideArc(x, y, 4.4, 5.8, P, 24) + k.sideArc(x, y, 4.4, 9.4, P, 24), { tone: "faint" }) }));
    out.push(S(k.cylinder(x, y, 5.6, 13, GEO.DECK0 - 13, P, 36, 0.3), { tone: "mid" }));
  }
  return out.join("");
}

// The control box with the selector knob that sets how many elements the force splits into.
function controlBox() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BOX, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(BOX, 0, BOX_H, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(BOX, 2.4, P, 4), { tone: "faint" }) }));
  out.push(Dt(k.corners(BOX, 2.6).map(([x, y]) => at([x, y, BOX_H])), { size: 0.42 }));
  // detent ring and four index marks, one per split
  const R0 = KNOB.r + 3.4;
  out.push(L(k.ring(KNOB.x, KNOB.y, R0, BOX_H, P, 48), { tone: "lo" }));
  const marks = KNOB_ANGLES.map((deg) => {
    const a = (deg + KNOB_FACE) * RAD;
    return k.lineOnTop([KNOB.x + Math.cos(a) * R0, KNOB.y + Math.sin(a) * R0], [KNOB.x + Math.cos(a) * (R0 - 2), KNOB.y + Math.sin(a) * (R0 - 2)], BOX_H, P);
  });
  out.push(L(marks.join(""), { tone: "mid" }));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r + 1, BOX_H, 1, P, 32), { tone: "mid" }));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r, KNOB.z + 1, KNOB.h - 1, P, 32, 0.3), { tone: "mid", inner: L(k.knurl(KNOB.x, KNOB.y, KNOB.r, KNOB.z + 1.4, KNOB.top, 30, P), { tone: "lo" }) }));
  // switch and cable gland
  out.push(S(k.slabOf({ x: BOX.x + 2.4, y: BOX.y + BOX.d - 6, w: 3.4, d: 3.6, r: 0.6 }, BOX_H, 1.6, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(GLAND.x, GLAND.y, GLAND.r + 0.8, BOX_H, 1, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(GLAND.x, GLAND.y, GLAND.r, BOX_H + 1, GLAND.h - 1, P, 16), { tone: "mid" }));
  return out.join("");
}

// The dial gauge: share of the force regrouped behind the screen.
function gauge() {
  const out = [];
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
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 20, 5, DIAL.top, [1.2, 2.5], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

const LAY = screenLayout();
const PARTS = trayParts(k, P, MODEL, LAY);
const START = { i: 0, n: 1 };
const P0 = plan(START.n);
const CABLE = { from: [GLAND.x, GLAND.y, BOX_H + GLAND.h], to: [GEO.MOTOR.x, GEO.MOTOR.y + GEO.MOTOR.r + 4, 25.5] };
const live = (S0) => scene(k, P, MODEL, PARTS, S0, floorAt);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "inf-svg",
  label: "A bench model of an infiltration. A shaker tray rides on rubber mounts, driven by a motor with a turning eccentric weight. Across the middle of the tray stands a screen of bars with six gaps of different widths, standing for a defended line. A knob sets how many elements the force is split into. A single large block is stopped at the screen; split into smaller pellets, the elements fit through the wider gaps one at a time and regroup in a collecting tray behind the screen, on a square mark the size of the original block. A dial gauge reads the share of the force regrouped.",
  body: [
    plate(), mounts(),
    `<g data-part="live">${live({ p: P0, pos: P0.els.map((e) => positionAt(e, 0)), fade: 1, dx: 0, phi: 0 })}</g>`,
    `<g data-part="cable">${cable(k, P, CABLE.from, CABLE.to, 0)}</g>`,
    controlBox(),
    `<path data-part="pointer" class="iso-line" data-tone="hi" d="${pointer(k, P, KNOB, START.i)}" style="stroke-width:1"/>`,
    Dt([at([KNOB.x, KNOB.y, KNOB.top])], { size: 0.6 }),
    gauge(),
    `<path data-part="needle" class="iso-line" data-tone="hi" data-free="" d="${needle(k, P, DIAL, 0)}" style="stroke-width:1.1"/>`,
    L(k.ring(DIAL.x, DIAL.y, 1.5, DIAL.top, P, 16), { tone: "mid" }),
  ].join(""),
});

// ---- Battlefield view: the same plan and clock on full-bleed night terrain (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420 at desktop), shown with "slice" so the ground fills
// the whole card at every width; a phone crops the sides. PF frames the visible ground rect.
const FW = 640, FH = 420;
const FRAME = [[-108, -88], [104, -88], [104, 88], [-108, 88]].map((q) => [...fsW(q), 0]);   // the visible ground, line frame
const PF = k.fitProjection(FRAME, FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T, MODEL, LAY, plan);
const POSE0 = fieldPose(P0, 0, MODEL, LAY, T, positionAt);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "inf-field",
  label: "The same idea on a battlefield at night. Across the middle runs a red enemy outpost line: seven two-man fighting positions, each with its observed sector marked on the ground, and gaps of different widths between them. On the left, at the edge of a wood, waits the lit blue infiltrating force of 36 soldiers. As one group it is spotted short of the line, fired on and stopped. Split into four squads, nine fire teams or sixteen pairs and threes, the elements file through the gaps they fit, one at a time, and regroup at an objective rally point marked in chalk behind the line. Sizes, ranges and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, MODEL, LAY, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg inf-field"', 'class="iso-svg inf-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "FM 3-90 (2023) defines infiltration as a form of maneuver in which an attacking force “conducts undetected movement through or into an area occupied by enemy forces,” and notes that smaller infiltrating elements “can get through smaller defensive gaps,” though larger ones are “better equipped to react.” The gap widths, sizes and timings here are a notional teaching layout, not data.";

const LABELS = {
  machine: "Infiltration sieve. Left and right arrow keys change how many elements the force is split into; Enter runs it again; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys change how many elements the force is split into; Enter runs it again; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 5",
  title: "Infiltration",
  hint: "Click to split finer",
  readout: readoutText(P0, 0),
  keys: [
    { mark: "lit", label: "Elements of the infiltrating force" },
    { mark: "raised", label: "Screen of bars: the defended line and its gaps" },
    { mark: "flat", label: "Collecting tray: where elements regroup" },
    { mark: "edge", label: "Gauge: share of the force regrouped" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage inf-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="1" aria-valuemax="16" aria-valuenow="${START.n}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("The gap widths, sizes and timings here are a notional teaching layout, not data.", "Unit sizes, gap widths, ranges and timings here are a notional teaching layout, not data.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Infiltrating force: 36 soldiers, split into elements (lit)" },
    { mark: "red", label: "Enemy outposts: two-man positions and their sectors" },
    { mark: "blue", label: "Chalk on pegs: the objective rally point" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="inf-legend inf-legend-machine">${m}</div><div class="inf-legend inf-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, DIAL, KNOB, CABLE, START, LABELS };
const liveJs = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, KNOB, CABLE, START, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, solidSvg, lineSvg, dotsSvg, wireSvg, extrude, slabOf, cylinder, planOutline, insetPlan, corners, translateAlong, lineOnTop, knurl, sideArc, sideSeam, haloOf };
const KF = { ...K, cameraOf, towardViewer, pathOf, onTop, fadeLineSvg };
const root = document.querySelector(".inf-figure");
const stage = root.querySelector(".inf-stage");
const svg = stage.querySelector(".inf-svg");
const layer = svg.querySelector('[data-part="live"]');
const cableEl = svg.querySelector('[data-part="cable"]');
const needleEl = svg.querySelector('[data-part="needle"]');
const pointerEl = svg.querySelector('[data-part="pointer"]');
const readout = root.querySelector("[data-readout]");
const slider = root.querySelector("#inf-split");
const runBtn = root.querySelector("#inf-run");
const sliderOut = root.querySelector("#inf-split-out");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const fieldSvgEl = stage.querySelector(".inf-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Click to split finer", field: "Click to split finer" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const TF = fieldTerrain();
const LOOKS = new Map();
let stageF = null, fire = null, marksSig = "", fieldT = 0, fadeSig = "";
const LAY = screenLayout(MODEL);
const PARTS = trayParts(K, P, MODEL, LAY);
const SPLITS = MODEL.splits;
// One run: fade the old elements out, load the new split, shake them through, hold.
const R = { i: START.i, want: START.i, p: plan(SPLITS[START.i]), t: 0, fade: 1, out: null, phi: 0, amp: 0, f: 0 };
const TOUR = [0, 1, 3];
let tourAt = 0, touring = !still.matches, last = 0, frame = 0, visible = false, idle = 0, hold = 0;
function load(i) {
  if (R.out === null && R.i === i && R.t === 0) return;
  R.next = R.want = i;
  R.out = R.fade;
}
function begin(i) {
  R.i = i; R.p = plan(SPLITS[i]); R.t = 0; R.out = null; R.fade = still.matches ? 1 : 0; hold = 0;
  if (still.matches) R.t = R.p.duration;
  slider.value = String(i);
  sliderOut.textContent = SPLITS[i] === 1 ? "1 (whole force)" : SPLITS[i] + " elements";
  pointerEl.setAttribute("d", pointer(K, P, KNOB, i));
}
// Battlefield frame: soldiers move by translate and re-render only when their look changes; the
// fire layer writes attributes only; the sectors redraw only when the spotting changes.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, KF, PF); }
  const pose = fieldPose(R.p, R.t, MODEL, LAY, TF, positionAt);
  stageF.put(pose.men.map((m) => {
    const shape = trLook(m), look = m.side + "|" + shape;   // side in the look: a man who goes down re-tints
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(shape)) LOOKS.set(shape, trSoldier(KF, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(shape); } };
  }));
  // fade only at the ends of the fade (in or out), not every frame: the whole field repaints on it
  const fs = R.fade < 0.5 ? "0" : "1";
  if (fs !== fadeSig) { fieldLayer.style.setProperty("--inf-fade", fs); fadeSig = fs; }
  const sig = pose.spotted.toFixed(2);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(KF, PF, TF, MODEL, LAY, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : fieldT));
}
function draw() {
  const pos = R.p.els.map((e) => positionAt(e, R.t, MODEL));
  const running = R.out === null && R.t < R.p.duration;
  const dx = GEO.SHAKE * R.amp * Math.sin(R.phi * Math.PI / 180);
  if (view === "field") drawField();
  else {
    layer.innerHTML = scene(K, P, MODEL, PARTS, { p: R.p, pos, fade: R.fade, dx, phi: R.phi }, floorAt);
    cableEl.innerHTML = cable(K, P, CABLE.from, CABLE.to, dx);
    needleEl.setAttribute("d", needle(K, P, DIAL, R.f));
  }
  const count = regroupedAt(R.p, R.t);
  // the battlefield adds the notional men down, friendly vs enemy, in shorter words to fit
  let text = readoutText(R.p, count);
  if (view === "field") {
    const LS = losses(R.p, R.t, MODEL), down = " · " + LS.blue + " vs " + LS.red + " down";
    text = (R.p.through ? R.p.n + " elements · " + count + "/" + R.p.n + " rallied" : "1 element · stopped at line") + down;
  }
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(R.p.n));
  stage.setAttribute("aria-valuetext", text);
  return { running, count };
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (R.out !== null) {
    R.fade = calm ? 0 : Math.max(0, R.fade - dt / 0.25);
    if (R.fade <= 0) begin(R.next);
  } else {
    if (R.fade < 1) R.fade = Math.min(1, R.fade + dt / 0.25);
    else if (R.t < R.p.duration) R.t = Math.min(R.p.duration, R.t + dt * (view === "field" ? FG.SLOW : 1));
    else hold += dt;
  }
  fieldT += dt;
  const working = R.out === null && R.fade >= 1 && R.t < R.p.duration;
  R.amp = calm ? 0 : R.amp + ((working ? 1 : 0) - R.amp) * (1 - Math.exp(-dt / 0.25));
  if (R.amp > 0.002) R.phi = (R.phi + 360 * 2.2 * dt) % 360;
  const share = regroupedAt(R.p, R.t) / R.p.n;
  R.f = calm ? share : R.f + (share - R.f) * (1 - Math.exp(-dt / 0.3));
  draw();
  if (touring && R.out === null && R.t >= R.p.duration && hold > 1.2) {
    tourAt = (tourAt + 1) % TOUR.length;
    load(TOUR[tourAt]);
  }
  const settled = !touring && R.out === null && R.fade >= 1 && R.t >= R.p.duration && R.amp < 0.002 && Math.abs(R.f - share) < 0.001;
  // the battlefield keeps running while the big group is under fire; otherwise both views stop once settled
  const firing = view === "field" && !calm && R.p.through === 0;
  frame = visible && (!settled || firing) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const userHold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tourAt = TOUR.indexOf(R.i); if (tourAt < 0) tourAt = 0; run(); }, 9000);
  run();
};
const choose = (i) => { i = Math.max(0, Math.min(SPLITS.length - 1, i)); R.out = R.fade; R.next = R.want = i; slider.value = String(i); userHold(); };
stage.addEventListener("click", () => choose((R.want + 1) % SPLITS.length));
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") choose(R.want + 1);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") choose(R.want - 1);
  else if (event.key === "Enter" || event.key === " ") choose(R.want);
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
slider.addEventListener("input", () => choose(Number(slider.value)));
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
runBtn.addEventListener("click", () => choose(R.want));
// Reset: back to the state the page opened in (split, run, shaker and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  delete R.next;
  Object.assign(R, { i: START.i, want: START.i, p: plan(SPLITS[START.i]), t: 0, fade: 1, out: null, phi: 0, amp: 0, f: 0 });
  begin(START.i);
  R.fade = 1;
  tourAt = 0; touring = !still.matches; fieldT = 0;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
begin(START.i);
R.fade = 1;
setView(view, false);
window.__infiltration = { R, choose, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + liveJs).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const n of MODEL.splits) {
  const p = plan(n);
  console.log(`n ${n}: width ${elementWidth(n).toFixed(1)}, fits ${fits(n).length}/6, run ${p.duration.toFixed(2)} s`);
}
console.log("wrote index.html", PAGE.length, "bytes");
