// Builds interactive/maneuvers/ambush/index.html: an isometric "ambush trap" made with the Anatomy kit
// (kit/, MIT). Run: node interactive/maneuvers/ambush/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, FORMS, criterion, inside, outcome, fallen, fallenBlue, readout, TIMING } from "./model.mjs";
import { GEO, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trLook, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -146, y: -76, w: 260, d: 128, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIAL = { x: 94, y: 33, r: 16, z: 22, h: 8 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: -138, y: 30, w: 30, d: 16, r: 1.5 };
const RAIL = [-134, 102];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.GATES[0].x, GEO.GATE_Y, 14], [GEO.GATES[1].x, GEO.GATE_Y, 14], [DIAL.x, DIAL.y, DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 55, elevation: 34 },
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
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[22, 5], [16, 8.5], [19, 12]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The route the column rides: sleepers, two rails with pins, end stops.
function track() {
  const out = [];
  const sl = [];
  for (let x = RAIL[0] + 6; x <= RAIL[1] - 4; x += 12) sl.push(x);
  sl.sort((a, b) => k.depthOf([a, 0, 0], P) - k.depthOf([b, 0, 0], P));
  for (const x of sl) out.push(S(k.slabOf({ x: x - 2, y: -8, w: 4, d: 16, r: 0.6 }, 0, 1.2, P, 2), { tone: "lo" }));
  for (const y of [-5.2, 2.8]) {
    out.push(S(k.slabOf({ x: RAIL[0], y, w: RAIL[1] - RAIL[0], d: 2.4, r: 0.6 }, 1.2, 1.2, P, 3, 0.3), { tone: "mid" }));
    out.push(Dt([-120, -60, 0, 60, 90].map((x) => at([x, y + 1.2, 2.4])), { size: 0.4 }));
  }
  for (const x of [RAIL[0] - 6, RAIL[1]]) {
    out.push(S(k.slabOf({ x, y: -9, w: 6, d: 18, r: 1 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
    out.push(Dt([at([x + 3, -5.5, 7]), at([x + 3, 5.5, 7])], { size: 0.45 }));
  }
  return out.join("");
}

// The kill zone: an engraved window on the route with raised corner brackets, and a ruler strip.
function window_() {
  const out = [];
  const [z0, z1] = GEO.KZ;
  const w = { x: z0, y: -8.4, w: z1 - z0, d: 16.8, r: 1 };
  out.push(L(k.planOutline(w, 0, P), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(w, 2), 0, P), { tone: "faint" }));
  for (const sx of [z0, z1 - 1.4]) for (const sy of [-8.4, 7.0]) {
    out.push(S(k.slabOf({ x: sx, y: sy, w: 1.4, d: 1.4, r: 0.3 }, 0, 4.4, P, 2, 0.3), { tone: "hi", crease: "lo" }));
  }
  // ruler strip along the near edge: a tick for every model step of 12 units, the window's ends in hi
  const R = { x: RAIL[0], y: 21, w: RAIL[1] - RAIL[0], d: 5, r: 0.8 };
  out.push(S(k.slabOf(R, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const minor = [], major = [], zero = [];
  for (let x = RAIL[0] + 3; x <= RAIL[1] - 2; x += 9) {
    const end = false;
    const big = Math.round((x - RAIL[0]) / 9) % 4 === 0;
    const d = k.lineOnTop([x, 26], [x, 26 - (big ? 3.4 : 2.2)], 0.8, P);
    (end ? zero : big ? major : minor).push(d);
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  for (const e of [z0, z1]) out.push(L(k.lineOnTop([e, 26], [e, 22], 0.8, P), { tone: "hi" }));
  // the assault bar's slide: two engraved slots
  for (const y of [GEO.RACK_Y - 5, GEO.RACK_Y + 5]) out.push(L(k.lineOnTop([-50, y], [20, y], 0, P), { tone: "lo" }));
  for (const x of [-50, 20]) out.push(L(k.lineOnTop([x, GEO.RACK_Y - 5], [x, GEO.RACK_Y + 5], 0, P), { tone: "lo" }));
  // the hinge's quadrant: an arc from the linear to the L-shaped position, with a stop at each end
  const [hx, hy] = GEO.PIVOT;
  const arc = [];
  for (let a = 180; a <= 270; a += 3) arc.push([hx + 48 * Math.cos(a * Math.PI / 180), hy + 48 * Math.sin(a * Math.PI / 180)]);
  out.push(L(k.onTop(arc, 0, P, false), { tone: "mid" }));
  const t0 = [];
  for (let a = 180; a <= 270; a += 15) {
    const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180), big = a % 90 === 0;
    t0.push(k.lineOnTop([hx + 48 * c, hy + 48 * s], [hx + (48 - (big ? 4 : 2.4)) * c, hy + (48 - (big ? 4 : 2.4)) * s], 0, P));
  }
  out.push(L(t0.join(""), { tone: "lo" }));
  return out.join("");
}

// The dial gauge: how many of the ten are in the kill zone, with the halfway mark ("most").
function gauge() {
  const out = [];
  const ped = { x: DIAL.x - 14, y: DIAL.y - 14, w: 28, d: 28, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5.6, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3.4, 7.4, DIAL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(DIAL.x, DIAL.y, 3.4, 14, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3.2, DIAL.top, 70, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3.2, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, MODEL.n, 5, DIAL.top, [1.2, 2.8], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([DIAL.x - 5.4, DIAL.y + 7.6], DIAL.top, P, "x"), "IN ZONE", { size: 2.1, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, DIAL, 0)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.5, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}
const GAUGE = { key: k.depthOf([DIAL.x, DIAL.y, 0], P), svg: `<g data-part="gauge">${gauge()}</g>` };

// Everything that never moves (the live layer holds only what does).
const STATIC = [plate(), track(), window_()];
const START = { form: "linear", fm: 0, head: MODEL.start, target: MODEL.start, fire: false, fireHead: MODEL.start, tf: 0, gate: 0, asl: 0, n: MODEL.n, gap: MODEL.gap, f: 0 };
const sceneState = (s) => ({ ...s, head: s.fire ? s.fireHead : s.head, statics: [GAUGE] });
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "fl-svg",
  label: "A bench model of an ambush. Ten coupled cars ride a rail toward a marked window, the kill zone. Beside the rail a rack carries a lit assault bar and a support bar on a hinge, each with four spring plungers aimed at the window. In the linear formation the two bars lie end to end, parallel to the rail; in the L-shaped formation the support bar swings round the hinge at the end of the window to a right angle. Two boom gates, the security elements, stand at either end of the route. Initiating the ambush strokes the plungers, knocks cars down, swings the gates across the rail and sweeps the assault bar's arm across the window. A dial reads how many cars are in the window; unit sizes and numbers are notional.",
  body: [...STATIC, `<g data-part="live">${scene(k, P, sceneState(START))}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at platoon scale (kit/terrain.mjs) ----
const FW = 640, FH = 420;
const PF = k.fitProjection([[-92, -48, 0], [100, -48, 0], [100, 34, 0], [-92, 34, 0]], FW, FH, { pad: 0, azimuth: 66, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose(START, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "fl-field",
  label: "The same idea on a battlefield. A road runs left to right with a stream along its near bank. On the far side, concealed prone in the grass, lie a platoon's ambush elements: the lit assault element (a rifle squad with the platoon leader and radio operator) and the support element (a rifle squad and two machine-gun teams), either in one line parallel to the road (linear) or with the support element's short leg at the end of the kill zone at a right angle to the assault element's line (L-shaped). A fire team lies at each end of the kill zone as the security element. A column of ten enemy soldiers walks down the road. When most are in the kill zone, outlined in chalk, the leader initiates: machine guns and rifles open fire, enemy soldiers fall, the security teams block the road at both ends, and the assault element crosses the kill zone in fire-team bounds to the limit of advance. Sizes, ranges and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg fl-field"', 'class="iso-svg fl-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (ATP 3-21.8, 2024) says a typical ambush has an assault, a support and a security element, and that the leader initiates it “when most of the enemy force is in the kill zone.” Linear and L-shaped differ in where the support element lies. The bar strokes, the dial and the casualties are a notional teaching model, not data.";
const LABELS = {
  machine: "Ambush trap. Left and right arrow keys move the column; F initiates or sets the ambush again; L switches the formation; V switches to the Battlefield view. Speeds, times, counts and losses are notional model values, not data.",
  field: "Battlefield. Left and right arrow keys move the enemy column along the road; F initiates or sets the ambush again; L switches the formation; V switches to the Machine view. Speeds, times, counts and losses are notional model values, not data.",
};
const card = k.plateHtml({
  fig: "Fig 46",
  title: "Ambush",
  hint: "Hover the rail · click to initiate",
  readout: "",
  keys: [
    { mark: "lit", label: "Assault element: the lit bar and its arm" },
    { mark: "raised", label: "Support element: the hinged bar; security: the two gates" },
    { mark: "edge", label: "Dial: cars in the kill zone, halfway mark = most" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage fl-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="${MODEL.range[0]}" aria-valuemax="${MODEL.range[1]}" aria-valuenow="${START.head}">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = CAPTION.replace("The bar strokes, the dial and the casualties are a notional teaching model, not data.", "Unit sizes, spacing, ranges, timings and the casualties are a notional teaching model, not data.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Assault element: a rifle squad, the platoon leader and RTO (lit)" },
    { mark: "blue", label: "Friendly: support (a squad and two MG teams) and security (two fire teams)" },
    { mark: "red", label: "Enemy: a column of ten on the road" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="fl-legend fl-legend-machine">${m}</div><div class="fl-legend fl-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, DIAL, START, TIMING, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs").replace("function readout(", "function readoutOf(")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, START, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf };
const root = document.querySelector(".am-figure");
const stage = root.querySelector(".fl-stage");
const svg = stage.querySelector(".fl-svg");
const layer = svg.querySelector('[data-part="live"]');
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const readout = root.querySelector("[data-readout]");
const initBtn = root.querySelector("#am-init");
const slider = root.querySelector("#am-head");
const fieldSvgEl = stage.querySelector(".fl-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { vt: 0, dfm: 0, t: 0 };
let stageF = null, fire = null, marksSig = "";
const hintEl = root.querySelector('[data-corner="hint"]');
const sliderText = root.querySelector("#am-head-text");
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const formBtns = root.querySelectorAll(".fd-forms [data-form]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Hover the rail · click to initiate", field: "Hover the road · click to initiate" };
const SLIDER_TEXT = { machine: "Column position", field: "Enemy column position" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const GAUGE = { key: depthOf([DIAL.x, DIAL.y, 0], P), svg: gaugeEl.outerHTML };
gaugeEl.remove();
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { ...START };
const PACE = 40;                                   // the column's pace, notional units per second
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0, tourStep = -1;
// the idle tour: one pass in each formation, about 23 s: the column walks in, the leader waits until
// most are in the kill zone, initiates, the assault crosses; then the same in the L-shaped formation
const TOUR = [
  [0, "linear", -60, false, true], [0.8, "linear", 12, false, false], [4.4, "linear", 12, true, false],
  [11.4, "L", -60, false, true], [12.2, "L", 12, false, false], [15.8, "L", 12, true, false],
];
const TOUR_LEN = 23;
function setFire(on) {
  if (on === S.fire) return;
  S.fire = on;
  S.tf = 0;
  if (on) { S.fireHead = S.head; S.target = S.head; }
  initBtn.setAttribute("aria-pressed", String(on));
  initBtn.textContent = on ? "Set the ambush again" : "Initiate the ambush";
}
function setForm(form) {
  if (form !== S.form && S.fire) setFire(false);
  S.form = form;
  formBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.form === form)));
}
const headNow = () => (S.fire ? S.fireHead : S.head);
function derived() {
  const out = outcome(S.form, headNow(), DATA.MODEL);
  const nF = S.fire ? fallen(out, S.tf, DATA.TIMING) : 0;
  const nB = S.fire ? fallenBlue(out, S.tf, DATA.TIMING) : 0;
  return { out, nF, nB };
}
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, T, FM);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m);
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = pose.fm.toFixed(2) + "|" + (pose.tf > 0 ? 1 : 0);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  const { nF, nB } = derived();
  const state = S.fire ? S.tf : 0;
  if (view === "field") drawField();
  else {
    const down = new Set(derived().out.down.slice(0, nF));
    const f = S.fire ? smooth01(0, 0.3, S.tf) * (1 - smooth01(DATA.TIMING.shift - 0.5, DATA.TIMING.shift, S.tf)) : 0;
    layer.innerHTML = scene(K, P, { ...S, head: headNow(), down, f, asl: smooth01(DATA.TIMING.shift, DATA.TIMING.shift + DATA.TIMING.cross, state), statics: [GAUGE] });
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, inside(headNow(), DATA.MODEL) / DATA.MODEL.n));
  }
  const text = readoutOf(S.form, headNow(), S.fire, S.tf);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(headNow())));
  stage.setAttribute("aria-valuetext", text + " (counts are notional)");
  if (document.activeElement !== slider) slider.value = String(Math.round(S.target));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const t = clock % TOUR_LEN;
    let row = 0;
    TOUR.forEach((r, i) => { if (t >= r[0]) row = i; });
    if (row !== tourStep) {
      tourStep = row;
      const [, form, target, fireOn, jump] = TOUR[row];
      if (jump) { S.fire = false; S.tf = 0; S.head = target; initBtn.setAttribute("aria-pressed", "false"); initBtn.textContent = "Initiate the ambush"; }
      setForm(form);
      S.target = target;
      if (fireOn) setFire(true);
    }
  }
  const head0 = S.head;
  if (!S.fire) S.head = calm ? S.target : S.head + clamp(S.target - S.head, -PACE * dt, PACE * dt);
  FM.vt = (S.head - head0) / dt;
  const fm0 = S.fm;
  const wantFm = S.form === "L" ? 1 : 0;
  S.fm = calm ? wantFm : S.fm + (wantFm - S.fm) * (1 - Math.exp(-dt / 0.45));
  if (Math.abs(S.fm - wantFm) < 0.002) S.fm = wantFm;
  FM.dfm = (S.fm - fm0) / dt;
  S.gate += ((S.fire ? 1 : 0) - S.gate) * (calm ? 1 : 1 - Math.exp(-dt / 0.3));
  if (Math.abs(S.gate - (S.fire ? 1 : 0)) < 0.002) S.gate = S.fire ? 1 : 0;
  if (S.fire) S.tf = calm ? 99 : S.tf + dt;
  FM.t += dt;
  draw();
  const settled = !touring && !S.fire && Math.abs(S.head - S.target) < 0.01 && S.fm === wantFm && S.gate === 0;
  frame = visible && (!settled || view === "field" || S.fire) && !(calm && settled) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; tourStep = -1; run(); }, 9000);
  run();
};
const steer = (units) => { if (S.fire) setFire(false); S.target = clamp(units, DATA.MODEL.range[0], DATA.MODEL.range[1]); hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  sliderText.textContent = SLIDER_TEXT[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
function floorAt(event) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const P = view === "field" ? PF : DATA.P;
  const p = pt.matrixTransform((view === "field" ? stage.querySelector(".fl-field") : svg).getScreenCTM().inverse());
  const a = P.azimuth * Math.PI / 180, e = (P.elevation ?? 30) * Math.PI / 180;
  const kk = P.scale * Math.sqrt(1.6);
  const u = (p.x - P.origin[0]) / kk, v = (p.y - P.origin[1]) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const [x] = floorAt(event);
  // where the pointer is along the route is where the column's lead is (the bench draws it at 0.75)
  steer(view === "field" ? x : x / GEO.KB);
});
stage.addEventListener("click", () => { setFire(!S.fire); hold(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(headNow() + 8);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(headNow() - 8);
  else if (event.key === "f" || event.key === "F" || event.key === " " || event.key === "Enter") { setFire(!S.fire); hold(); }
  else if (event.key === "l" || event.key === "L") { setForm(S.form === "L" ? "linear" : "L"); hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
initBtn.addEventListener("click", () => { setFire(!S.fire); hold(); });
formBtns.forEach((b) => b.addEventListener("click", () => { setForm(b.dataset.form); hold(); }));
// Reset: back to the state the page opened in (model, controls, field motion and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  Object.assign(S, START);
  Object.assign(FM, { vt: 0, dfm: 0, t: 0 });
  initBtn.setAttribute("aria-pressed", "false");
  initBtn.textContent = "Initiate the ambush";
  setForm(START.form);
  slider.value = String(START.head);
  marksSig = "";
  touring = !still.matches; clock = 0; tourStep = -1;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => steer(Number(slider.value)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setForm(S.form);
setView(view, false);
window.__ambush = { S, setFire, setForm, steer, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const h of [-60, -40, 0, 12, 60, 100]) console.log(`head ${h}: ${inside(h)}/${MODEL.n} in zone, criterion ${criterion(h)}, linear ${JSON.stringify({ ...outcome("linear", h), down: undefined })}`);
console.log("wrote index.html", PAGE.length, "bytes", readout("L", 12, false, 0));
