// Builds interactive/maneuvers/passage-of-lines/index.html: an isometric two-comb bench made with the
// Anatomy kit (../../kit, MIT) plus a company-scale Battlefield view (../../kit/terrain.mjs) that shows a
// forward passage of lines or a relief in place.
// Run: node interactive/maneuvers/passage-of-lines/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, START, stateAt, finalState, readoutField, readoutMachine, passPlan, reliefPlan } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 420;
const PLATE = { x: -98, y: -78, w: 196, d: 146, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;
const LABEL = { x: 66, y: 52, w: 20, d: 8, r: 1.5 };
const G = GEO;
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [G.DIAL.x, G.DIAL.y, G.DIAL.top + 3], [G.PAD.x + 10, 0, 10], [G.XAA, 0, 6]],
  WIDTH, HEIGHT, { pad: 10, azimuth: 50, elevation: 36 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 18))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[14, 2.6], [10, 5.2]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 4, LABEL.y + dy], [LABEL.x + 4 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.4, LABEL.y + 2.4, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8])], { size: 0.42 }));
  // a scale of ticks down the left edge, along the line of departure from the assembly area
  out.push(S(k.slabOf({ x: -96, y: -68, w: 3, d: 128, r: 0.6 }, 0, 0.9, P, 2, 0.2), { tone: "lo", crease: "none" }));
  const t = k.topTicks(-66, 60, 6, 5, -93, 0, [1.3, 2.1], P, "y");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

const CFG0 = { mode: START.mode, k: START.k };
const RUN0 = stateAt(CFG0, 0, false);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "pl-svg",
  label: "A bench model of a passage of lines and a relief in place. A stationary comb of three blocks stands for the stationary unit's three platoon positions; a passing comb of three carriages stands for the passing company's platoons. In a forward passage the carriages run through the two gaps between the blocks, past a contact-point gate and passage posts, to a battle handover line bar and on toward an outpost; two lanes take three platoons, so a third platoon halts at the gate if all three start together. In a relief in place each incoming carriage slides into its block's slot while the outgoing block backs out beside it. A dial runs to the moment enemy fires land; a slide shows which unit holds responsibility and moves when two of the three platoons are through; a rack shows men down. Times, lanes and counts are notional.",
  body: [plate(), `<g data-part="live">${scene(k, P, RUN0)}</g>`],
});

// ---- Battlefield view: the same run on full-bleed terrain, a company passage or relief ----
const FW = 640, FH = 420;
const AZ = 80 * Math.PI / 180, EL = 42 * Math.PI / 180;
const KK = FW / 270, DU = 270, DV = FH / (KK * Math.sin(EL));
const CEN = [8, 0];
const uc = CEN[0] * Math.sin(AZ) - CEN[1] * Math.cos(AZ), vc = CEN[0] * Math.cos(AZ) + CEN[1] * Math.sin(AZ);
const toWorld = (u, v) => [u * Math.sin(AZ) + v * Math.cos(AZ), -u * Math.cos(AZ) + v * Math.sin(AZ), 0];
const PF = k.fitProjection([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => toWorld(uc + a * DU / 2, vc + b * DV / 2)), FW, FH, { pad: 0, azimuth: 80, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose(RUN0, T);
const unitSvg = (KK2, PP, m) => (m.kind ? trVehicle(KK2, PP, trFaceStep(m.face)) : trSoldier(KK2, PP, { ...m, face: trFaceStep(m.face) }));
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? " data-lit" : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(k, PF, m)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "pl-field",
  label: "The same idea on a battlefield, with soldiers drawn larger than scale. At left a passing company, three squads in the lit colour, waits in an assembly area. In the middle a stationary company holds three platoon positions of two fighting holes each, with two lanes between them marked by dashed chalk, contact-point flags before the positions and passage-point flags at them. A dashed battle handover line crosses forward of the positions. At right, on a rise, an enemy outpost of six defenders. In a forward passage, set by the mode control, the passing squads go forward through the lanes, a third squad halting short of the contact point if all three start together; the stationary company fires until the passing force masks it; enemy fire falls on the area. In a relief in place the incoming squads move into the positions while the outgoing teams withdraw, and if all three are exchanged at once the enemy notices in this model. Greyed figures are men down. Sizes, ranges, timings and counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg pl-field"', 'class="iso-svg pl-field" preserveAspectRatio="xMidYMid slice" data-handed="0"');

const CAPTION = "FM 3-90 (1 May 2023, para. 16-1) defines a passage of lines as an operation in which a force moves forward or rearward through another force's combat positions. The bench is this figure's own model. Times, lanes and counts are notional.";
const FIELD_CAPTION = "A passing company goes through a stationary company's positions, or relieves it in place. Unit sizes, ranges, timings and counts are notional.";
const LABELS = {
  machine: "Passage bench. Left and right arrows set how many platoons move together; M switches between passage of lines and relief in place; Space starts the run; V switches to the Battlefield view. Times, lanes, counts and losses are notional model values, not data.",
  field: "Battlefield. Left and right arrows set how many platoons move together; M switches between passage of lines and relief in place; Space starts the run; V switches to the Machine view. Times, lanes, counts and losses are notional model values, not data.",
};
const card = k.plateHtml({
  fig: "Fig 51",
  title: "Passage and relief",
  hint: "Click: start the run",
  readout: "",
  keys: [
    { mark: "lit", label: "Carriages: the passing or incoming platoons" },
    { mark: "raised", label: "Blocks: the stationary or outgoing platoons" },
    { mark: "edge", label: "Gates, passage posts, BHL bar, dial, slide, rack" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage pl-stage" tabindex="0" role="group" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "blue", label: "Friendly: passing or incoming (lit), stationary or outgoing" },
    { mark: "red", label: "Enemy outpost: six defenders" },
    { mark: "dashed", label: "Chalk: the battle handover line and lane edges" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="pl-legend pl-legend-machine">${m}</div><div class="pl-legend pl-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, LABELS, START, TOUR: [["pass", 2], ["pass", 3], ["pass", 1], ["relief", 3], ["relief", 1]] };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, LABELS, TOUR } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks };
const root = document.querySelector(".pl-figure");
const stage = root.querySelector(".pl-stage");
const svg = stage.querySelector(".pl-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const goBtn = root.querySelector("#pl-go");
const slider = root.querySelector("#pl-k");
const kOut = root.querySelector("#pl-k-out");
const kLabel = root.querySelector("#pl-k-label");
const modeBtns = root.querySelectorAll(".pl-modes [data-mode]");
const fieldSvgEl = stage.querySelector(".pl-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Click: start the run", field: "Click: start the run" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
// the settings (mode, platoons moving together) and the run (t in figure seconds)
let cfg = { mode: DATA.START.mode, k: DATA.START.k };
let R = { t: 0, released: false };
const FM = { t: 0 };
let stageF = null, fire = null;
let touring = !still.matches, last = 0, frame = 0, visible = false, idle = 0, wait = 0;
const TOUR0 = () => ({ i: 0, stage: "pre", timer: 0 });
let tour = TOUR0();
const cur = () => stateAt(cfg, R.t, R.released);
const kWord = (c) => c.mode === "pass" ? c.k + " together" : c.k === 1 ? "1 at a time, sequential" : c.k === 3 ? "3 at once, simultaneous" : "2 at once";
function setCfg(next) {
  cfg = { mode: next.mode === "relief" ? "relief" : "pass", k: snapK(next.k) };
  slider.value = String(cfg.k);
  kOut.textContent = kWord(cfg);
  kLabel.textContent = cfg.mode === "pass" ? "Platoons moving together" : "Platoons relieved at once";
  modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === cfg.mode)));
  root.setAttribute("data-mode", cfg.mode);
  stage.setAttribute("aria-valuenow", String(cfg.k));
}
function newRun() { R = { t: 0, released: false }; wait = 0; }
function release() { if (!R.released) { R = { t: 0, released: true }; wait = 0; } }
function drawField(S) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const g = S.passed ? "1" : "0";
  if (fieldSvgEl._g !== g) { fieldSvgEl.setAttribute("data-handed", g); fieldSvgEl._g = g; }
  const pose = fieldPose(S, T);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + "|" + m.side + (m.kind ? "|v" : "");
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: !!m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, m.kind ? trVehicle(K, PF, trFaceStep(m.face)) : trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  fire.draw(trShots(pose.streams, FM.t));
}
function draw() {
  const S = cur();
  if (view === "field") drawField(S);
  else layer.innerHTML = scene(K, P, S);
  const text = view === "field" ? readoutField(S) : readoutMachine(S);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text + " (figure seconds, lanes and counts are notional)");
  goBtn.disabled = R.released && !S.done;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (!calm) {
    FM.t += dt;
    if (R.released) {
      R.t += dt;
      if (cur().done) {
        wait += dt;
        if (wait > 1.1) { if (touring) advanceTour(); else newRun(); }
      }
    } else if (touring) tourTick(dt);
  }
  draw();
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
// the tour: a passage with two together, three together (a platoon halts), one at a time, then a simultaneous and a sequential relief
function tourTick(dt) {
  tour.timer += dt;
  if (tour.stage === "pre") { if (tour.timer > 1.4) release(); return; }
}
function advanceTour() {
  tour.i++; tour.stage = "pre"; tour.timer = 0; wait = 0;
  const [m, kk] = TOUR[tour.i % TOUR.length];
  setCfg({ mode: m, k: kk });
  newRun();
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } if (still.matches) tick(performance.now()); };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tour = TOUR0(); tour.stage = R.released ? "run" : "pre"; run(); }, 14000);
  run();
};
function change(next) { setCfg(next); newRun(); hold(); }
function goNow() {
  if (R.released && cur().done) newRun();
  if (!R.released) release();
  hold();
}
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
stage.addEventListener("click", goNow);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") change({ ...cfg, k: cfg.k - 1 });
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") change({ ...cfg, k: cfg.k + 1 });
  else if (event.key === "m" || event.key === "M") change({ ...cfg, mode: cfg.mode === "pass" ? "relief" : "pass" });
  else if (event.key === " " || event.key === "Enter") goNow();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
goBtn.addEventListener("click", goNow);
slider.addEventListener("input", () => change({ ...cfg, k: Number(slider.value) }));
modeBtns.forEach((b) => b.addEventListener("click", () => change({ ...cfg, mode: b.dataset.mode })));
// Reset: back to the state the page opened in (settings, waiting, the tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function stillRun() { R = { t: 10, released: true }; FM.t = 10; }
function reset() {
  clearTimeout(idle);
  wait = 0;
  FM.t = 0;
  setCfg({ mode: DATA.START.mode, k: DATA.START.k });
  newRun();
  tour = TOUR0();
  if (still.matches) stillRun();
  touring = !still.matches;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) stillRun();
setCfg(cfg);
setView(view, false);
const snapshot = () => JSON.stringify({ cfg, R, FM, wait, touring, tour, slider: slider.value, out: kOut.textContent, mode: root.getAttribute("data-mode"), readout: readout.textContent });
const LOAD = { field: null, machine: null };
LOAD[view] = snapshot();
window.__pl = {
  get R() { return R; }, get cfg() { return cfg; }, FM, change, goNow, setView, reset, view: () => view,
  snapshot, load: LOAD,
  stop: () => { touring = false; clearTimeout(idle); },
  // jump to a state (for tests and stills): mode, platoons together, figure seconds into the run (null = waiting)
  seek: (m, kk, t) => { setCfg({ mode: m, k: kk }); R = t === null ? { t: 0, released: false } : { t, released: true }; FM.t = t || 0; draw(); },
};
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const [m, kk] of [["pass", 1], ["pass", 2], ["pass", 3], ["relief", 1], ["relief", 2], ["relief", 3]]) console.log(`${m} ${kk} →`, readoutField(finalState({ mode: m, k: kk })));
console.log("start:", readoutMachine(RUN0));
console.log("wrote index.html", PAGE.length, "bytes; field men", POSE0.men.length);
