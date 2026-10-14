// Builds interactive/maneuvers/final-protective-fires/index.html: an isometric FPF bench made with the
// Anatomy kit (../../kit, MIT) plus a platoon-defense Battlefield view (../../kit/terrain.mjs).
// Run: node interactive/maneuvers/final-protective-fires/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, newRun, simulate, readoutField, readoutMachine } from "./model.mjs";
import { GEO, scene, benchY } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -98, y: -124, w: 196, d: 226, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: -90, y: 86, w: 26, d: 12, r: 1.5 };
const RULER = { x: -3, y: -110, w: 6, d: 143, r: 0.8 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-GEO.POST, GEO.PINS, 38], [GEO.POST, GEO.PINS, 38], [GEO.DIAL.x, GEO.DIAL.y, GEO.DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 55 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// The base: plate on feet, groove, corner screws, label plate; the beaten zone and the FPL engraved.
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
  [[18, 3.5], [12, 6], [15, 8.5]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  // the beaten zone (the FPF box, 2:1 like the 60 x 30 m of Table B-1), inlaid; the strike plate under the pins
  const zone = { x: -27, y: benchY(32), w: 54, d: 27, r: 1 };
  out.push(L(k.planOutline(zone, 0, P, 2), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(zone, 1.4), 0, P, 2), { tone: "faint" }));
  out.push(S(k.slabOf({ x: -28.5, y: GEO.PINS - 2.4, w: 57, d: 4.8, r: 0.8 }, 0, 0.6, P, 2), { tone: "lo", crease: "none" }));
  // the FPL: a groove from one grazing post's base to the other's
  out.push(L(k.lineOnTop([-GEO.MG + 6, GEO.FPL], [GEO.MG - 6, GEO.FPL], 0, P), { tone: "mid" }));
  return out.join("");
}

// The rail: sleepers, two rails, end stops, and the distance ruler between the rails.
function rail() {
  const out = [];
  for (let y = -112; y <= 60; y += 8) out.push(S(k.slabOf({ x: -10, y: y - 1.6, w: 20, d: 3.2, r: 0.5 }, 0, 1.2, P, 2), { tone: "lo" }));
  out.push(S(k.slabOf(RULER, 1.2, 0.6, P, 2), { tone: "lo", crease: "none" }));
  const t = k.topTicks(benchY(150), benchY(0), GEO.KS * 5, 10, RULER.x + 0.2, 1.8, [1.6, 3.2], P, "y");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([RULER.x, GEO.FPL], [RULER.x + RULER.w, GEO.FPL], 1.8, P), { tone: "hi" }));
  for (const x of [-GEO.RAIL, GEO.RAIL]) {
    out.push(S(k.slabOf({ x: x - 1, y: -116, w: 2, d: 180, r: 0.6 }, 1.2, 1.8, P, 2, 0.3), { tone: "mid" }));
    out.push(Dt([-100, -40, 10, 50].map((y) => at([x, y, 3])), { size: 0.35 }));
  }
  out.push(S(k.slabOf({ x: -10, y: -121, w: 20, d: 4, r: 1 }, 0, 6, P, 3, 0.4), { tone: "mid" }));
  out.push(Dt([at([-6, -119, 6]), at([6, -119, 6])], { size: 0.42 }));
  return out.join("");
}

const START = { trigger: 10 };
const RUN0 = newRun(START.trigger);
const M0 = { x: RUN0.x, drop: 0, firing: 0, t: 0, trig: START.trigger, tripped: false, bar: 0, mag: Math.ceil(MODEL.rounds / 3), check: 0 };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "fp-svg",
  label: "A bench model of final protective fires. An assault carriage runs down a rail toward a parapet at the near end, past a trip tab clamped between the rails and through a wire belt with a gate. Over the stretch of rail in front of the wire stands a gantry holding a lit header bar with ten drop pins: the mortars' final protective fire. Two grazing bars on posts at the ends of a line engraved in front of the wire point out into their sectors. When the carriage knocks the trip tab, or the FPF is called by hand, the header falls and its pins hammer while a magazine of rounds empties, and both bars swing to lie low along the engraved line. A gauge reads how far the assault is checked. Distances, rates and losses are notional.",
  body: [plate(), rail(), `<g data-part="live">${scene(k, P, M0)}</g>`],
});

// ---- Battlefield view: the same run on full-bleed terrain at platoon scale ----
// The view is framed by the four ground points that map to the card's corners (640 x 420, shown with
// "slice" so the ground fills the card at every width; a phone crops the sides).
const FW = 640, FH = 420;
const AZ = 80 * Math.PI / 180, EL = 42 * Math.PI / 180;
const KK = FW / 198, DU = 198, DV = FH / (KK * Math.sin(EL));
const CEN = [0, -32];
const uc = CEN[0] * Math.sin(AZ) - CEN[1] * Math.cos(AZ), vc = CEN[0] * Math.cos(AZ) + CEN[1] * Math.sin(AZ);
const toWorld = (u, v) => [u * Math.sin(AZ) + v * Math.cos(AZ), -u * Math.cos(AZ) + v * Math.sin(AZ), 0];
const PF = k.fitProjection([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => toWorld(uc + a * DU / 2, vc + b * DV / 2)), FW, FH, { pad: 0, azimuth: 80, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose(RUN0, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "fp-field",
  label: "The same idea on a battlefield, a platoon defense seen from behind. Two blue rifle squads hold two-man fighting positions along a line behind a belt of wire, with a machine gun in a nest at each end of the wire. Each gun's sector is a blue fan on the ground whose inner edge, its final protective line, is marked in chalk across the front of the wire; the two lines cross. A chalk box just in front of the wire marks the final protective fire of two mortars. A red enemy assault of two rifle squads in line crosses the open ground from a far treeline, supported by a machine-gun team firing from behind a wall on the right. When the final protective fires are called, mortar bursts fill the box and both machine guns fire grazing tracer along their final protective lines; the assault goes to ground at the wire and, if the fire lasts, breaks and falls back. Called too early or too late, the assault comes through the wire. Sizes, ranges and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="bursts" class="fp-bursts"></g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg fp-field"', 'class="iso-svg fp-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (ATP 3-21.8, 2024) calls the final protective fire “an immediately available, prearranged barrier of fire designed to impede enemy movement across defensive lines or areas,” fired “at the maximum rate until the mortars are ordered to stop, or until ammunition is depleted.” Here the pins are that barrier and the magazine its rounds. Speeds, rounds and timings are notional.";
const FIELD_CAPTION = CAPTION.replace("Here the pins are that barrier and the magazine its rounds. Speeds, rounds and timings are notional.", "Here it is the mortar bursts in the box, with the machine guns’ grazing fire along their final protective lines. Unit sizes, ranges, timings and losses are notional.");

const LABELS = {
  machine: "FPF bench. Left and right arrow keys move the trip tab; F calls the final protective fires now; N starts a new assault; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys set the trigger distance; F calls the final protective fires now; N starts a new assault; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 38",
  title: "Final protective fires",
  hint: "Click to call the FPF",
  readout: "",
  keys: [
    { mark: "lit", label: "The FPF: header bar and drop pins over the beaten zone" },
    { mark: "raised", label: "Grazing bars: the machine guns, laid along the FPL" },
    { mark: "edge", label: "Assault carriage, trip tab, magazine of rounds" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage fp-stage" tabindex="0" role="slider" aria-label="${LABELS.field}" aria-valuemin="${MODEL.trigger[0]}" aria-valuemax="${MODEL.trigger[1]}" aria-valuenow="${START.trigger}">${svg}${fieldSvg}</div>`,
});
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "blue", label: "Friendly: two rifle squads in holes, two MGs with their FPLs" },
    { mark: "red", label: "Enemy: an assault of two squads and a support team" },
    { mark: "dashed", label: "Chalk: the FPF box and the two FPLs" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="fp-legend fp-legend-machine">${m}</div><div class="fp-legend fp-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs").replace(/^const MODEL = [\s\S]*?\n};\n/m, "const MODEL = DATA.MODEL;\n")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\nGEO\.PIN_X[^\n]*\n/m, "const GEO = DATA.GEO;\n")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, START, LABELS } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks };
const root = document.querySelector(".fp-figure");
const stage = root.querySelector(".fp-stage");
const svg = stage.querySelector(".fp-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const callBtn = root.querySelector("#fp-call");
const newBtn = root.querySelector("#fp-new");
const slider = root.querySelector("#fp-trig");
const trigOut = root.querySelector("#fp-trig-out");
const fieldSvgEl = stage.querySelector(".fp-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const burstEl = fieldSvgEl.querySelector('[data-part="bursts"]');
const T = fieldTerrain();
const LOOKS = new Map();
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Click to call the FPF", field: "Click to call the FPF" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// the run (model.mjs), the machine's eased parts, and what the battlefield measures between frames
let R = newRun(START.trigger);
const MS = { drop: 0, firing: 0, bar: 0, check: 0 };
const FM = { vt: 0, t: 0 };
let trigger = START.trigger, wait = 0, runNo = 0;
let stageF = null, fire = null, marksSig = "";
let touring = !still.matches, last = 0, frame = 0, visible = false, idle = 0;
const TOUR = [10, 150];   // the idle tour: one run called at the wire, one called far too early
function setTrigger(v) {
  trigger = clamp(Math.round(v / 5) * 5, MODEL.trigger[0], MODEL.trigger[1]);
  if (!R.called) R.trigger = trigger;
  slider.value = String(trigger);
  trigOut.textContent = trigger + " m out";
  stage.setAttribute("aria-valuenow", String(trigger));
}
function newAssault() { R = newRun(trigger); wait = 0; }
function stillRun() { R = simulate(START.trigger, 6); FM.t = 6; }
// Mortar bursts: a pool of dust, core and smoke circles, attributes only.
const BURSTS = Array.from({ length: 30 }, () => {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.innerHTML = '<circle class="fp-smoke"/><circle class="fp-dust"/><circle class="fp-core"/>';
  g.setAttribute("visibility", "hidden");
  burstEl.appendChild(g);
  return g;
});
const kF = cameraOf(PF).k;
function drawBursts() {
  const list = still.matches && R.called ? fieldBursts(R, 0, 1.2) : fieldBursts(R, 0, R.calledT === null ? null : R.t - R.calledT);
  BURSTS.forEach((g, i) => {
    const b = list[i];
    if (!b) { if (g._on) { g.setAttribute("visibility", "hidden"); g._on = false; } return; }
    if (!g._on) { g.removeAttribute("visibility"); g._on = true; }
    const [x, y] = iso(b.p, PF), a = b.age;
    const [sm, du, co] = g.children;
    const [wx, wy] = iso([b.p[0] - 6 * a, b.p[1] - 9 * a, 3 + 7 * a], PF);
    sm.setAttribute("cx", wx.toFixed(1)); sm.setAttribute("cy", wy.toFixed(1)); sm.setAttribute("r", ((3 + 9 * a) * kF).toFixed(1)); sm.setAttribute("opacity", (0.28 * (1 - a) * Math.min(1, a * 8)).toFixed(2));
    du.setAttribute("cx", x.toFixed(1)); du.setAttribute("cy", (y - a * 3 * kF).toFixed(1)); du.setAttribute("r", ((1.5 + 5.5 * Math.sqrt(a)) * kF).toFixed(1)); du.setAttribute("opacity", (0.55 * (1 - a)).toFixed(2));
    co.setAttribute("cx", x.toFixed(1)); co.setAttribute("cy", y.toFixed(1)); co.setAttribute("r", ((0.8 + 2.4 * a) * kF).toFixed(1)); co.setAttribute("opacity", Math.max(0, 0.9 - a * 6).toFixed(2));
  });
}
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(R, T, FM);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m);
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = pose.onFPL ? "1" : "0";
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, FM.t));
  drawBursts();
}
function draw() {
  if (view === "field") drawField();
  else layer.innerHTML = scene(K, P, { x: R.x, drop: MS.drop, firing: MS.firing, t: FM.t, trig: R.trigger ?? trigger, tripped: R.called, bar: MS.bar, mag: Math.ceil(R.rounds / 3 - 1e-6), check: MS.check });
  const text = view === "field" ? readoutField(R) : readoutMachine(R);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (!calm) {
    const x0 = R.x;
    if (R.done) {
      wait += dt;
      if (wait > 0.9) {
        runNo++;
        if (touring) setTrigger(TOUR[runNo % TOUR.length]);
        newAssault();
      }
    } else step(R, dt);
    FM.vt = R.done ? 0 : (x0 - R.x) / dt;
    FM.t += dt;
  }
  const firing = R.called && R.rounds > 0 ? 1 : 0;
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  MS.drop = ease(MS.drop, firing, firing ? 0.09 : 0.45);
  MS.firing = ease(MS.firing, firing, 0.12);
  MS.bar = ease(MS.bar, R.called ? 1 : 0, 0.22);   // the guns stay on the FPL after the mortar rounds are spent
  MS.check = ease(MS.check, R.check, 0.15);
  draw();
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } if (still.matches) tick(performance.now()); };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; run(); }, 9000);
  run();
};
function callNow() { if (!R.done && !R.called) step(R, 0, MODEL, true); hold(); }
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
stage.addEventListener("click", callNow);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") { setTrigger(trigger - 5); hold(); }
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") { setTrigger(trigger + 5); hold(); }
  else if (event.key === "f" || event.key === "F" || event.key === " " || event.key === "Enter") callNow();
  else if (event.key === "n" || event.key === "N") { newAssault(); hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
callBtn.addEventListener("click", callNow);
newBtn.addEventListener("click", () => { newAssault(); hold(); });
slider.addEventListener("input", () => { setTrigger(Number(slider.value)); hold(); });
// Reset: back to the state the page opened in (run, trigger, machine parts, tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  runNo = 0; wait = 0;
  Object.assign(MS, { drop: 0, firing: 0, bar: 0, check: 0 });
  Object.assign(FM, { vt: 0, t: 0 });
  setTrigger(START.trigger);
  R = newRun(START.trigger);
  if (still.matches) stillRun();
  touring = !still.matches;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) stillRun();
setTrigger(START.trigger);
setView(view, false);
// the state Reset must restore (everything but the view), taken before the first frame
const snapshot = () => JSON.stringify({ R, MS, FM, trigger, runNo, wait, touring, slider: slider.value, out: trigOut.textContent, readout: view === "field" ? readoutField(R) : readoutMachine(R) });
const LOAD = { field: null, machine: null };
LOAD[view] = snapshot();
window.__fpf = {
  get R() { return R; }, MS, FM, setTrigger, callNow, newAssault, setView, reset, view: () => view,
  snapshot, load: LOAD,
  stop: () => { touring = false; clearTimeout(idle); },
  // jump the run to a moment (for tests and stills): trigger, figure seconds
  seek: (trig, t) => { setTrigger(trig); R = simulate(trig, t); FM.t = t; MS.drop = R.called && R.rounds > 0 ? 1 : 0; MS.firing = MS.drop; MS.bar = R.called ? 1 : 0; MS.check = R.check; draw(); },
  pause: () => { const r = R; r.done = true; wait = -1e9; },
};
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const tr of [10, 80, 90, 150]) { const s = simulate(tr); console.log(`trigger ${tr} m → ${readoutField(s)}`); }
console.log("start:", readoutMachine(RUN0), "|", readoutField(RUN0));
console.log("wrote index.html", PAGE.length, "bytes; field men", POSE0.men.length);
