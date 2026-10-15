// Builds interactive/maneuvers/clearing/index.html: an isometric four-pin sequential lock made with
// the Anatomy kit (../../kit, MIT) plus a squad Battlefield view (../../kit/terrain.mjs) that clears a
// trench line or a building.
// Run: node interactive/maneuvers/clearing/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, allOn, stateAt, finalState, readoutField, readoutMachine } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 420;
const PLATE = { x: -94, y: -62, w: 196, d: 136, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;
const LABEL = { x: 76, y: 62, w: 22, d: 8, r: 1.5 };
const G = GEO;
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [G.ST_X[1], G.ST_Y, 26], [G.DIAL.x, G.DIAL.y, G.DIAL.top + 3], [G.SHIELD_X, 18, 14]],
  WIDTH, HEIGHT, { pad: 10, azimuth: 52, elevation: 34 },
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
  out.push(L(k.lineOnTop([LABEL.x + 4, LABEL.y + 3], [LABEL.x + 20, LABEL.y + 3], 0.8, P), { tone: "lo", free: true }));
  out.push(Dt([at([LABEL.x + 2.4, LABEL.y + 2.4, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8])], { size: 0.42 }));
  // a rule along the front edge with a tick every 10 units
  const t = k.topTicks([G.X0, PLATE.y + PLATE.d - 10], [G.X1, PLATE.y + PLATE.d - 10], 4, 5, 0, 0, [1.4, 2.6], P, "x");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

const RUN0 = stateAt(allOn(), 0, false);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "cl-svg",
  label: "A bench model, with notional numbers, of clearing a trench or a building one point at a time. Four pins stand in a row; a bar below them grows as each is set. The lit key carriage on the front rail can advance to the next pin only when the pin before it is set. A second carriage on its own rail holds the point just cleared. A turntable on the key carriage swaps the lead team when the teams alternate. A shield for the support element stands at the entry. Behind the pins a row of pegs is the enemy, one for each point. A dial reads points set, a bar reads how fresh the lead team is, and a rack shows men down. In this model, leaving out support fires, alternation or holding behind each costs time or men. Times, rates and losses are notional.",
  body: [plate(), `<g data-part="live">${scene(k, P, RUN0, MODEL)}</g>`],
});

// ---- Battlefield view: the same run on full-bleed terrain at squad scale ----
const FW = 640, FH = 420;
const AZ = 80 * Math.PI / 180, EL = 42 * Math.PI / 180;
const KK = FW / 190, DU = 190, DV = FH / (KK * Math.sin(EL));
const CEN = [0, 6];
const uc = CEN[0] * Math.sin(AZ) - CEN[1] * Math.cos(AZ), vc = CEN[0] * Math.cos(AZ) + CEN[1] * Math.sin(AZ);
const toWorld = (u, v) => [u * Math.sin(AZ) + v * Math.cos(AZ), -u * Math.cos(AZ) + v * Math.sin(AZ), 0];
const PF = k.fitProjection([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => toWorld(uc + a * DU / 2, vc + b * DV / 2)), FW, FH, { pad: 0, azimuth: 80, elevation: 42 });
const TT = { trench: fieldTerrain("trench"), building: fieldTerrain("building") };
const FIELD = fieldStatic(k, PF, TT.trench);
const POSE0 = fieldPose(RUN0, TT.trench, "trench");
const POSE0B = fieldPose(RUN0, TT.building, "building");
const menOf = (pose, mode) => pose.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}" transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "cl-field",
  label: "The same idea on the ground, with notional numbers: one rifle squad, a squad leader and two fire teams, clears four points of a trench line or of a building, with a support element outside and a platoon medic. Each fire team moves in file. A lead team clears the next point while the other holds the one just cleared, and in this model the teams swap the lead. Greyed figures lying still are men down. Leave an option out and it shows. Sizes, ranges, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menOf(POSE0, "trench")])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg cl-field"', 'class="iso-svg cl-field" preserveAspectRatio="xMidYMid slice" data-mode="trench" data-m0="0" data-m1="0" data-m2="0" data-m3="0"');

const CAPTION = "A bench model, not doctrine: four points are cleared in order, and the key can advance only when the pin before it is set. Army doctrine names the drills Enter a Trench to Secure a Foothold and Enter and Clear a Room (ATP 3-21.8, 11 January 2024, incl. C1, para. E-2, p. E-2). The sequence, times and losses here are notional.";
const FIELD_CAPTION = "One squad clearing a trench line or a building, drawn in this figure's own sequence. The trench drill itself is a platoon drill (ATP 3-21.8, appendix E); one squad is drawn. Unit sizes, ranges, timings and losses are notional.";
const LABELS = {
  machine: "Clearing bench. Keys 1 to 3 toggle the options; Space starts the clearing; M switches trench and building; V switches to the Battlefield view. The sequence, times and losses are the figure's own and notional.",
  field: "Battlefield. Keys 1 to 3 toggle the options; Space starts the clearing; M switches trench and building; V switches to the Machine view. The sequence, times and losses are the figure's own and notional.",
};
const card = k.plateHtml({
  fig: "Fig 49",
  title: "Clearing a Trench or Building",
  hint: "Click: start clearing",
  readout: "",
  keys: [
    { mark: "lit", label: "The key carriage: the lead team, advancing pin by pin" },
    { mark: "raised", label: "Four pins in order; the pegs behind are the enemy" },
    { mark: "edge", label: "Second carriage: the team holding the last point" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage cl-stage" tabindex="0" role="group" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "blue", label: "Friendly: squad, support element, medic" },
    { mark: "red", label: "Enemy: one at each point" },
    { mark: "dashed", label: "Chalk: the support element's position" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="cl-legend cl-legend-machine">${m}</div><div class="cl-legend cl-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, LABELS } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks };
const root = document.querySelector(".cl-figure");
const stage = root.querySelector(".cl-stage");
const svg = stage.querySelector(".cl-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const goBtn = root.querySelector("#cl-go");
const boxes = [...root.querySelectorAll(".cl-opt input")];
const fieldSvgEl = stage.querySelector(".cl-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const TT = { trench: fieldTerrain("trench"), building: fieldTerrain("building") };
const LOOKS = new Map();
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const modeBtns = root.querySelectorAll(".cl-modes [data-mode]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Click: start clearing", field: "Click: start clearing" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
let mode = "trench";
const still = matchMedia("(prefers-reduced-motion: reduce)");
let cfg = allOn();
let R = { t: 0, released: false };
const FM = { t: 0 };
let stageF = null, fire = null;
let touring = !still.matches, last = 0, frame = 0, visible = false, idle = 0, wait = 0;
// the idle tour: all three options; then without support fires; without alternation; without holding behind
const PLANS = [[], [0], [1], [2]];
const TOUR0 = () => ({ plan: 0, stage: "pre", timer: 0 });
let tour = TOUR0();
const unit = () => (mode === "building" ? "Room" : "Bay");
const cur = () => stateAt(cfg, R.t, R.released);
function setCfg(next) {
  cfg = next.slice();
  boxes.forEach((b, i) => { b.checked = cfg[i]; });
}
function newRun() { R = { t: 0, released: false }; wait = 0; }
function release() { if (!R.released) { R = { t: 0, released: true }; wait = 0; } }
function drawField(S) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, TT[mode], mode);
  const sig = pose.marks.map((v) => (v ? "1" : "0")).join("");
  if (fieldSvgEl._sig !== sig) {
    pose.marks.forEach((v, i) => fieldSvgEl.setAttribute("data-m" + i, v ? "1" : "0"));
    fieldSvgEl._sig = sig;
  }
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + "|" + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: false,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  fire.draw(trShots(pose.streams, FM.t));
}
function draw() {
  const S = cur();
  if (view === "field") drawField(S);
  else layer.innerHTML = scene(K, P, S, MODEL);
  const text = view === "field" ? readoutField(S, unit()) : readoutMachine(S);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text + " (counts are notional, in this model)");
  goBtn.disabled = R.released && !stateAt(cfg, R.t, true).done;
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
// the tour: start with all three options, then leave one out per run; switch trench and building each lap
function tourTick(dt) {
  tour.timer += dt;
  if (tour.stage === "pre" && tour.timer > 1.2) release();
}
function advanceTour() {
  tour.plan++; tour.stage = "pre"; tour.timer = 0; wait = 0;
  const off = PLANS[tour.plan % PLANS.length];
  setCfg([!off.includes(0), !off.includes(1), !off.includes(2)]);
  if (tour.plan % PLANS.length === 0) setMode(mode === "trench" ? "building" : "trench", false);
  newRun();
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } if (still.matches) tick(performance.now()); };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tour = TOUR0(); tour.stage = R.released ? "run" : "pre"; run(); }, 14000);
  run();
};
function toggle(i, on) {
  const c = cfg.slice();
  c[i] = on === undefined ? !c[i] : on;
  setCfg(c);
  newRun();
  hold();
}
function goNow() {
  if (R.released && cur().done) newRun();
  if (!R.released) release();
  hold();
}
function setMode(next, user) {
  mode = next === "building" ? "building" : "trench";
  fieldSvgEl.setAttribute("data-mode", mode);
  modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  if (user) { newRun(); hold(); }
  draw();
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
  if (event.key >= "1" && event.key <= "3") toggle(Number(event.key) - 1);
  else if (event.key === " " || event.key === "Enter") goNow();
  else if (event.key === "m" || event.key === "M") setMode(mode === "trench" ? "building" : "trench", true);
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
goBtn.addEventListener("click", goNow);
boxes.forEach((b, i) => b.addEventListener("change", () => toggle(i, b.checked)));
modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode, true)));
// Reset: back to the state the page opened in (all options, trench, waiting, the tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function stillRun() { R = { t: 12, released: true }; FM.t = 12; }
function reset() {
  clearTimeout(idle);
  wait = 0;
  FM.t = 0;
  setCfg(allOn());
  newRun();
  tour = TOUR0();
  mode = "trench";
  fieldSvgEl.setAttribute("data-mode", mode);
  modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  if (still.matches) stillRun();
  touring = !still.matches;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) stillRun();
setCfg(cfg);
setMode(mode, false);
setView(view, false);
const snapshot = () => JSON.stringify({ cfg, R, FM, wait, touring, tour, mode, boxes: boxes.map((b) => b.checked), readout: readout.textContent });
const LOAD = { field: null, machine: null };
LOAD[view] = snapshot();
window.__cl = {
  get R() { return R; }, get cfg() { return cfg; }, FM, toggle, goNow, setView, setMode, reset, view: () => view, mode: () => mode,
  snapshot, load: LOAD,
  stop: () => { touring = false; clearTimeout(idle); },
  // jump to a state (for tests and stills): which options, figure seconds into the run (null = waiting)
  seek: (c, t) => { setCfg(c); R = t === null ? { t: 0, released: false } : { t, released: true }; FM.t = t || 0; draw(); },
};
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (let m = 7; m >= 0; m--) { const c = [0, 1, 2].map((i) => !!(m & (1 << i))); console.log(c.map(Number).join(""), "→", readoutField(finalState(c))); }
console.log("start:", readoutMachine(RUN0), "|", readoutField(RUN0));
console.log("wrote index.html", PAGE.length, "bytes; field men", POSE0.men.length, POSE0B.men.length);
