// Builds interactive/maneuvers/oblique-order/index.html: an isometric "oblique-order bench" made with
// the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/oblique-order/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, readout, summary } from "./model.mjs";
import { GEO, scene, needle, blockX, pivotY } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, obUnitSvg } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -114, y: -76, w: 278, d: 148, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIAL = { x: -64, y: 32, r: 14, z: 20, h: 7 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: 128, y: 44, w: 30, d: 18, r: 1.5 };
const BED = { x: -99, y: -64, w: 198, d: 42, r: 2 };
const BED_H = GEO.BLOCK[2];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-72, -20, GEO.LIFT + 2], [-40, -60, 20]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 55, elevation: 34 },
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
  [[22, 5], [16, 9], [19, 13]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  // frontage ruler along the front: a tick every 4, a major tick every block pitch
  const R = { x: -30, y: 58, w: 150, d: 6, r: 1 };
  out.push(S(k.slabOf(R, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const minor = [], major = [];
  for (let x = -26; x <= 116; x += 4) {
    const big = (x + 26) % 16 === 0;
    (big ? major : minor).push(k.lineOnTop([x, R.y], [x, R.y + (big ? 3.4 : 2)], 0.8, P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  return out.join("");
}

// The bed the enemy line stands on: slide grooves, sector dividers, backstop and end stops.
function bed() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BED, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(BED, 0, BED_H, P, 4, 0.4), { tone: "mid" }));
  const grooves = [];
  for (let i = 0; i < 12; i++) grooves.push(k.lineOnTop([blockX(i), GEO.BACK], [blockX(i), BED.y + BED.d], BED_H, P));
  out.push(L(grooves.join(""), { tone: "faint" }));
  // backstop rail with screws
  const back = { x: BED.x, y: BED.y, w: BED.w, d: GEO.BACK - BED.y, r: 1 };
  out.push(S(k.slabOf(back, BED_H, 11, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(back, BED_H + 5, P, 3), { tone: "faint" }) }));
  out.push(Dt([-80, -48, -16, 16, 48, 80].map((x) => at([x, BED.y + 3, BED_H + 11])), { size: 0.42 }));
  // sector dividers: three blocks to a sector
  for (const x of [-48, 0, 48]) out.push(S(k.slabOf({ x: x - 1, y: GEO.BACK, w: 2, d: BED.y + BED.d - GEO.BACK - 1, r: 0.6 }, BED_H, 3, P, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}
// The bed's end stops go in front of the outermost blocks, so they are live statics.
const STOPS = [-1, 1].map((sx) => {
  const plan = { x: sx < 0 ? BED.x + 0.6 : BED.x + BED.w - 3.6, y: GEO.BACK, w: 3, d: BED.y + BED.d - GEO.BACK - 1, r: 0.8 };
  return { key: k.depthOf([plan.x + 1.5, plan.y + plan.d / 2, 0], P) + 0.2, svg: S(k.slabOf(plan, BED_H, 10, P, 3, 0.3), { tone: "mid" }) + Dt([at([plan.x + 1.5, plan.y + 4, BED_H + 10]), at([plan.x + 1.5, plan.y + plan.d - 4, BED_H + 10])], { size: 0.42 }) };
});

// Two rails the pivot carriage runs on, with end stops.
function rails() {
  const out = [];
  const y0 = pivotY(0) - 26, y1 = pivotY(MODEL.maxAngle) + 14;
  for (const x of [GEO.XP - 12, GEO.XP + 8]) {
    out.push(S(k.slabOf({ x, y: y0, w: 4, d: y1 - y0, r: 1 }, 0, 0.6, P, 3, 0.2), { tone: "mid" }));
    out.push(Dt([y0 + 6, (y0 + y1) / 2, y1 - 6].map((y) => at([x + 2, y, 0.6])), { size: 0.38 }));
  }
  for (const y of [y0 - 4, y1]) {
    out.push(S(k.slabOf({ x: GEO.XP - 15, y, w: 26, d: 4, r: 1 }, 0, 6, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([at([GEO.XP - 11, y + 2, 6]), at([GEO.XP + 7, y + 2, 6])], { size: 0.42 }));
  }
  return out.join("");
}

// The dial: the best force ratio anywhere the lines touch, 0 to 3, with 1:1 marked.
function gauge() {
  const out = [];
  const ped = { x: DIAL.x - 13, y: DIAL.y - 13, w: 26, d: 26, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5.2, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3.2, 7.4, DIAL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(DIAL.x, DIAL.y, 3.2, 13, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 64, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 12, 4, DIAL.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // 1:1 in the hi tone
  const a = -0.75 * Math.PI + (1 / 3) * 1.5 * Math.PI;
  out.push(L(k.lineOnTop([DIAL.x + Math.sin(a) * (DIAL.r - 2), DIAL.y - Math.cos(a) * (DIAL.r - 2)], [DIAL.x + Math.sin(a) * (DIAL.r - 5), DIAL.y - Math.cos(a) * (DIAL.r - 5)], DIAL.top, P), { tone: "hi" }));
  out.push(k.faceTextSvg(k.topMatrix([DIAL.x - 4.4, DIAL.y + 6.8], DIAL.top, P, "x"), "RATIO", { size: 2, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, DIAL, 0.67)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.4, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}
const GAUGE = { key: 2e5, svg: `<g data-part="gauge">${gauge()}</g>` };

const START = { ang: 0, mass: 0, push: [GEO.LOSE, GEO.LOSE, GEO.LOSE, GEO.LOSE], reach: [GEO.LOSE, GEO.LOSE, GEO.LOSE, GEO.LOSE], fire: [1, 1, 1, 1], res: ["lose", "lose", "lose", "lose"] };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "ob-svg",
  label: "A bench model of the oblique order. At the back, an enemy line of twelve blocks stands on sprung slides in four sectors of three. In front, a long beam stands for the attacking line: it pivots on a carriage at its right-hand end and carries four contact pads, one per sector, and four pegs holding eight weights. A dial reads the best force ratio where the lines touch. Spread evenly and parallel, every sector touches and is outweighed. Massed on the left-hand peg and swung to an angle, only that sector touches, at two to one, and pushes its blocks back, while the rest of the beam is held clear.",
  body: [plate(), bed(), rails(), `<g data-part="live">${scene(k, P, { ...START, statics: [GAUGE, ...STOPS] })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain loosely after Leuthen (kit/terrain.mjs) ----
// The field SVG covers the whole card (CSS) with preserveAspectRatio "slice"; a phone crops the sides.
// PF frames the visible ground.
const FW = WIDTH, FH = HEIGHT;
const PF = k.fitProjection([[-108, -66, 0], [134, -66, 0], [134, 78, 0], [-108, 78, 0]], FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose(START, GEO, T);
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${obUnitSvg(k, PF, u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "ob-field",
  label: "The same idea on a battlefield, loosely after Leuthen in 1757. Across the back, twelve red Austrian battalions stand in line, each a short line of musketeers a few ranks deep with its colour and an officer; a hamlet with a flag marks the angle of their left, and a village with a church tower stands behind their centre. In front, eight blue Prussian battalions stand on a line that wheels on its near end, as the bench's beam pivots. On a low knoll off the Austrian right, two Prussian squadrons of horse show themselves; behind the Austrian line, three squadrons of the Austrian reserve horse ride off toward that wing as the Prussians mass. When the line masses, four Prussian battalions march back in column, along a road hidden behind a chain of low knolls, and form up behind the leading battalions, which are lit, against the Austrian left. Where the lines touch, both sides fire volleys, shown as flashes and powder smoke; the side that is outweighed is pushed back, and men fall on both sides, greyed where they lie, while two soldiers carry the wounded back to a farm. Swung to an angle, only the massed wing touches the enemy line; the rest of the Prussian line is held back. Unit sizes, distances and casualties are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="ob-fire"></g>`],
}).replace('class="iso-svg ob-field"', 'class="iso-svg ob-field" preserveAspectRatio="xMidYMid slice"');
if (!fieldSvg.includes("xMidYMid slice")) throw new Error("field svg class not found");

const CAPTION = "Frederick the Great wrote that his “oblique order of battle” lets you “refuse one wing to the enemy, whilst you strengthen that which ought to make the attack” (Military Instruction, 1818 translation, pp. 108–109). Here the weights are the strength and the angle is the refusal. Which side wins a sector, the ratios and the contact distances are a notional teaching model, not data.";

const LABELS = {
  machine: "Oblique-order bench. Left and right arrow keys change the beam's angle; M masses or spreads the weights; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys wheel the Prussian line; M masses the battalions on the right wing or spreads them along the line; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 31",
  title: "Oblique order",
  hint: "Hover to swing · click to mass",
  readout: "",
  keys: [
    { mark: "lit", label: "Strong wing: the leading pad, where the weights are massed" },
    { mark: "raised", label: "Attacking line: beam, pegs and weights; enemy line: sprung blocks" },
    { mark: "edge", label: "Dial: best force ratio where the lines touch (1:1 marked)" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage ob-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="${MODEL.maxAngle}" aria-valuenow="0">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = CAPTION.replace("Here the weights are the strength and the angle is the refusal.", "Here the battalions are the strength and the line's angle is the refusal.").replace("the ratios and the contact distances", "the counts, ratios, casualties, unit sizes and distances");
if (!FIELD_CAPTION.includes("battalions are the strength") || !FIELD_CAPTION.includes("casualties")) throw new Error("field caption sentences not found");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Main effort: the leading battalion of the massed Prussian wing (lit)" },
    { mark: "blue", label: "Prussian: battalion lines, horse on the knoll; fallen men greyed" },
    { mark: "red", label: "Austrian: battalion lines and the reserve horse behind them" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="ob-legend ob-legend-machine">${m}</div><div class="ob-legend ob-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, DIAL, START, LABELS, STOPS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\nGEO\.TOP[^\n]*\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, START, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf };
const root = document.querySelector(".ob-figure");
const stage = root.querySelector(".ob-stage");
const svg = stage.querySelector(".ob-svg");
const fieldSvgEl = stage.querySelector(".ob-field");
const layer = svg.querySelector('[data-part="live"]');
// Machine view: keep the nodes of every painter item whose markup did not change since the last
// frame, parse only the items that did, and restore painter's order with the fewest moves.
let livePool = new Map();
const liveTpl = document.createElementNS("http://www.w3.org/2000/svg", "g");
function patchLive(el, items) {
  const pool = new Map(), order = [];
  for (const { svg } of items) {
    const old = livePool.get(svg);
    let nodes = old && old.pop();
    if (!nodes) { liveTpl.innerHTML = svg; nodes = [...liveTpl.childNodes]; }
    const list = pool.get(svg);
    if (list) list.push(nodes); else pool.set(svg, [nodes]);
    for (const n of nodes) order.push(n);
  }
  livePool = pool;
  let ref = el.firstChild;
  for (const n of order) { if (n === ref) ref = ref.nextSibling; else el.insertBefore(n, ref); }
  while (ref) { const next = ref.nextSibling; ref.remove(); ref = next; }
}
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const readoutEl = root.querySelector("[data-readout]");
const massBtn = root.querySelector("#ob-mass");
const slider = root.querySelector("#ob-angle");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
// What the battlefield keeps between frames: clock, casualty counts shown (eased toward the model's),
// the reserve horse's progress and speed, and the distance each unit has walked (for strides).
const FM = { t: 0, cas: null, horse: undefined, horseV: 0, trav: {} };
let stageF = null, smokeDraw = null;
// Volley flashes and powder smoke: pools of circles above the scene; draw() writes attributes only.
function obFireLayer(group) {
  const ns = "http://www.w3.org/2000/svg";
  const make = (cls, n) => Array.from({ length: n }, () => { const e = document.createElementNS(ns, "circle"); e.setAttribute("class", cls); e.setAttribute("visibility", "hidden"); group.appendChild(e); e._on = false; return e; });
  const sm = make("ob-smoke", 110), fl = make("ob-flash", 70);
  const k = cameraOf(PF).k, f1 = (n) => n.toFixed(1);
  const fill = (list, pool, set) => {
    let i = 0;
    for (const s of list) { if (i >= pool.length) break; const e = pool[i++]; if (!e._on) { e.removeAttribute("visibility"); e._on = true; } set(e, s); }
    for (; i < pool.length; i++) if (pool[i]._on) { pool[i].setAttribute("visibility", "hidden"); pool[i]._on = false; }
  };
  return (V) => {
    fill(V.smoke, sm, (e, s) => { const [x, y] = iso(s.p, PF); e.setAttribute("cx", f1(x)); e.setAttribute("cy", f1(y)); e.setAttribute("r", f1(s.r * k)); e.setAttribute("fill-opacity", s.o.toFixed(2)); });
    fill(V.flashes, fl, (e, s) => { const [x, y] = iso(s.p, PF); e.setAttribute("data-side", s.side); e.setAttribute("cx", f1(x)); e.setAttribute("cy", f1(y)); e.setAttribute("r", f1((0.45 + 0.35 * s.a) * k)); e.setAttribute("fill-opacity", s.a.toFixed(2)); });
  };
}
// Battlefield frame: units move by translate and re-render only when their look changes.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); smokeDraw = obFireLayer(fireEl); }
  const pose = fieldPose(S, GEO, T, FM);
  stageF.put(pose.units.map((u) => ({ id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look: u.look, side: u.side, lit: !!u.lit,
    svg: () => { let s = LOOKS.get(u.look); if (s === undefined) { s = obUnitSvg(K, PF, u); LOOKS.set(u.look, s); } return s; } })));
  smokeDraw(obVolleys(pose.volleys, still.matches ? 4.37 : FM.t));
}
const hintEl = root.querySelector('[data-corner="hint"]');
const sliderText = root.querySelector("#ob-angle-text");
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
const HINTS = { machine: "Hover to swing · click to mass", field: "Hover to wheel · click to mass" };
const SLIDER_TEXT = { machine: "Beam angle", field: "Angle of the line" };
const MASS_TEXT = { machine: ["Mass the weights", "Spread the weights"], field: ["Mass the right wing", "Spread along the line"] };
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const GAUGE = { key: 2e5, svg: gaugeEl.outerHTML };
gaugeEl.remove();
const STOPS = DATA.STOPS;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { ...START, push: [...START.push], reach: [...START.reach], fire: [...START.fire], res: [...START.res], angT: 0, massed: false, f: 2 / 3 };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
const TOUR = [[0, false, 0], [3, true, 0], [7.5, true, 14], [12, false, 0]];
const TOUR_LEN = 15;
function tourAt(t) {
  t %= TOUR_LEN;
  let step = TOUR[0];
  for (const row of TOUR) if (t >= row[0]) step = row;
  return step;
}
function setMassed(on) {
  S.massed = on;
  massBtn.setAttribute("aria-pressed", String(on));
  massBtn.textContent = MASS_TEXT[view][on ? 1 : 0];
}
function targets() {
  const load = loadOf(S.mass);
  const sum = summary(S.ang, load, DATA.MODEL);
  return { load, sum };
}
function draw() {
  const { load, sum } = targets();
  if (view === "field") drawField();
  else {
    patchLive(layer, scene(K, P, { ...S, statics: [GAUGE, ...STOPS], items: true }));
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, S.f));
  }
  const text = readout(S.ang, load, DATA.MODEL);
  if (readoutEl.textContent !== text) readoutEl.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(S.ang)));
  stage.setAttribute("aria-valuetext", Math.round(S.ang) + " degrees, " + (S.massed ? "massed" : "spread") + ": " + text);
  if (document.activeElement !== slider) slider.value = String(Math.round(S.angT));
  return sum;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const [, massed, ang] = tourAt(clock);
    if (massed !== S.massed) setMassed(massed);
    S.angT = ang;
  }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  const want = S.massed ? 1 : 0;
  S.mass = calm ? want : S.mass + clamp(want - S.mass, -dt / 3.6, dt / 3.6);
  S.ang = calm ? S.angT : S.ang + clamp(ease(S.ang, S.angT, 0.55) - S.ang, -9 * dt, 9 * dt);
  const { sum } = targets();
  let moving = Math.abs(S.mass - want) > 1e-4 || Math.abs(S.ang - S.angT) > 0.01;
  for (const s of sum.s) {
    const j = s.j;
    S.res[j] = s.result;
    const pushT = s.result === "win" ? GEO.WIN : s.result === "lose" ? GEO.LOSE : 0;
    S.push[j] = ease(S.push[j], pushT, 0.45);
    const reachT = s.contact ? Math.max(GEO.LOSE, gapOf(j, S.ang, DATA.MODEL) + S.push[j]) : 0;
    S.reach[j] = ease(S.reach[j], reachT, 0.2);
    const fireT = s.result === "win" || s.result === "lose" ? 1 : 0;
    S.fire[j] = ease(S.fire[j], fireT, 0.3);
    if (Math.abs(S.push[j] - pushT) > 0.01 || Math.abs(S.reach[j] - reachT) > 0.01 || Math.abs(S.fire[j] - fireT) > 0.005) moving = true;
  }
  S.f = ease(S.f, sum.best, 0.3);
  if (Math.abs(S.f - sum.best) > 0.002) moving = true;
  // battlefield memory: casualties fall (or are cleared) a few figures a second; the reserve horse
  // follows the massing at a trot
  FM.t += dt;
  const cas = casualties(S.ang, loadOf(S.mass), DATA.MODEL).by;
  if (!FM.cas) FM.cas = { f: cas.map((c) => c[0]), e: cas.map((c) => c[1]) };
  const toward = (x, to, rate) => (calm ? to : x + clamp(to - x, -rate * dt, rate * dt));
  for (let j = 0; j < 4; j++) {
    FM.cas.f[j] = toward(FM.cas.f[j], cas[j][0], 7);
    FM.cas.e[j] = toward(FM.cas.e[j], cas[j][1], 9);
    if (FM.cas.f[j] !== cas[j][0] || FM.cas.e[j] !== cas[j][1]) moving = true;
  }
  const h0 = FM.horse ?? S.mass;
  FM.horse = toward(h0, S.mass, 0.2);
  FM.horseV = (FM.horse - h0) / dt;
  if (FM.horse !== S.mass) moving = true;
  draw();
  // the battlefield keeps firing while it is on screen and motion is allowed
  frame = visible && (touring || moving || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const steer = (deg) => { S.angT = clamp(deg, 0, DATA.MODEL.maxAngle); hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  sliderText.textContent = SLIDER_TEXT[view];
  massBtn.textContent = MASS_TEXT[view][S.massed ? 1 : 0];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
}
function floorAt(event) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const Q = view === "field" ? PF : P;
  const p = pt.matrixTransform((view === "field" ? fieldSvgEl : svg).getScreenCTM().inverse());
  const a = Q.azimuth * Math.PI / 180, e = (Q.elevation ?? 30) * Math.PI / 180;
  const kk = Q.scale * Math.sqrt(1.6);
  const u = (p.x - Q.origin[0]) / kk, v = (p.y - Q.origin[1]) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const [x, y] = floorAt(event);
  if (view === "field") {
    const lead = [FG.FS * (GEO.XP - GEO.U0), FG.AUS_FRONT + FG.D0];
    if (x < lead[0] + 30) return;
    steer(Math.atan2(y - lead[1], x - lead[0]) * 180 / Math.PI);
    return;
  }
  if (x > GEO.XP - 20) return;
  steer(Math.atan2(20 - y, GEO.XP - x) * 180 / Math.PI);
});
stage.addEventListener("click", () => { setMassed(!S.massed); hold(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") steer(S.angT + 2);
  else if (event.key === "ArrowRight" || event.key === "ArrowDown") steer(S.angT - 2);
  else if (event.key === "m" || event.key === "M" || event.key === " " || event.key === "Enter") { setMassed(!S.massed); hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
massBtn.addEventListener("click", () => { setMassed(!S.massed); hold(); });
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => steer(Number(slider.value)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setMassed(S.massed);
setView(view, false);
window.__obliqueOrder = { S, setMassed: (on) => { setMassed(on); run(); }, steer: (deg) => { S.angT = clamp(deg, 0, DATA.MODEL.maxAngle); run(); }, setView, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const [a, l] of [[0, MODEL.spread], [0, MODEL.massed], [14, MODEL.massed], [14, MODEL.spread]]) console.log(a, l.join(","), "→", readout(a, l));
console.log("best at 14 massed", summary(14, MODEL.massed).best, "wrote index.html", PAGE.length, "bytes");
