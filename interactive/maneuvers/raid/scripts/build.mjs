// Builds interactive/maneuvers/raid/index.html: an isometric shuttle-and-gate bench made with the
// Anatomy kit (../../kit, MIT) plus a platoon-raid Battlefield view (../../kit/terrain.mjs).
// Run: node interactive/maneuvers/raid/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, START, stateAt, finalState, readoutField, readoutMachine, maxDwell } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 420;
const PLATE = { x: -94, y: -52, w: 186, d: 100, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;
const LABEL = { x: 68, y: 33, w: 20, d: 8, r: 1.5 };
const G = GEO;
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [2, 0, 24], [G.DIAL.x, G.DIAL.y, G.DIAL.top + 3], [G.TARGET_X + 10, 0, 14], [G.RACK.x + 30, G.RACK.y, 6]],
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
  [[14, 2.6], [10, 5.2]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 4, LABEL.y + dy], [LABEL.x + 4 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.4, LABEL.y + 2.4, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8])], { size: 0.42 }));
  // a groove along the rail's centre line and a ruler along the front edge with a tick every 6 units
  out.push(L(k.lineOnTop([G.X0 - 6, 0], [G.X1 + 6, 0], 0, P), { tone: "faint", free: true }));
  const ye = PLATE.y + PLATE.d - 11;
  out.push(S(k.slabOf({ x: G.X0 - 4, y: ye - 3, w: G.X1 - G.X0 + 8, d: 3, r: 0.6 }, 0, 0.9, P, 2, 0.2), { tone: "lo", crease: "none" }));
  const t = k.topTicks(G.X0, G.X1, 6, 5, ye, 0, [1.3, 2.1], P, "x");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

const CFG0 = { dwell: START.dwell, security: START.security };
const RUN0 = stateAt(CFG0, 0, false);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "rd-svg",
  label: "A bench model of a raid. A shuttle, the raiding force, runs on a rail from a home stop to a target block, holds on it while a meter of six pegs fills, trips the target, and runs back. Over the rail a gate with a drop bar falls when a timer dial reaches its end, which stands for the response force reaching the withdrawal route. A brake on the timer, the security element holding that force, slows it. A rule at the front sets how long the shuttle holds on the objective. Hold too briefly and the target is not tripped; hold too long and the gate shuts on the shuttle. A rack shows men down. Times and counts are notional.",
  body: [plate(), `<g data-part="live">${scene(k, P, RUN0)}</g>`],
});

// ---- Battlefield view: the same run on full-bleed terrain at platoon scale ----
const FW = 640, FH = 420;
const AZ = 80 * Math.PI / 180, EL = 42 * Math.PI / 180;
const KK = FW / 270, DU = 270, DV = FH / (KK * Math.sin(EL));
const CEN = [8, -2];
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
  className: "rd-field",
  label: "The same idea on a battlefield, a platoon raid on an enemy mortar position, with soldiers drawn larger than scale. A lit assault element of eleven runs in from a release point at lower left by the near side to the objective on the rise at upper right, where six defenders sit in three mortar pits and three guard positions. A support element of machine guns fires from a chalk position and shifts its fire as the assault crosses the objective. One security team holds the road at the top of the picture, where a response force of two vehicles and four men is coming down toward the withdrawal route; the other watches the far side. Time on the objective is set by the slider. Held too briefly, the task is not done; held too long, or with the security element not holding the road, in this model the response force reaches the withdrawal route and the raiding force is caught. Greyed figures are men down. Sizes, ranges, timings and counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg rd-field"', 'class="iso-svg rd-field" preserveAspectRatio="xMidYMid slice" data-gate="0"');

const CAPTION = "FM 3-90 (1 May 2023, para. 5-142) defines a raid as a variation of attack to temporarily seize an objective with a planned withdrawal. The shuttle must come back through the gate before the timer shuts it. Times and counts are notional.";
const FIELD_CAPTION = "A platoon raid on a mortar position: assault, support and security elements, and a response force coming down the road. Unit sizes, ranges, timings and counts are notional.";
const LABELS = {
  machine: "Raid bench. Left and right arrows set the time on the objective; S toggles the security element; Space starts the raid; V switches to the Battlefield view. Speeds, times, counts and losses are notional model values, not data.",
  field: "Battlefield. Left and right arrows set the time on the objective; S toggles the security element; Space starts the raid; V switches to the Machine view. Speeds, times, counts and losses are notional model values, not data.",
};
const card = k.plateHtml({
  fig: "Fig 47",
  title: "Raid",
  hint: "Click: start the raid",
  readout: "",
  keys: [
    { mark: "lit", label: "The shuttle: the raiding force" },
    { mark: "raised", label: "Gate and timer: the response force reaching the route" },
    { mark: "edge", label: "Task meter, dwell rule and rack of men down" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage rd-stage" tabindex="0" role="group" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "blue", label: "Friendly: assault (lit), support and security elements" },
    { mark: "red", label: "Enemy: six defenders and the response force" },
    { mark: "dashed", label: "Chalk: support position, and the route's gate line" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="rd-legend rd-legend-machine">${m}</div><div class="rd-legend rd-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, LABELS, START, TOUR: [[4, true], [7, false], [1.5, true], [4, false]] };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, LABELS, TOUR } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks };
const root = document.querySelector(".rd-figure");
const stage = root.querySelector(".rd-stage");
const svg = stage.querySelector(".rd-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const goBtn = root.querySelector("#rd-go");
const slider = root.querySelector("#rd-hold");
const holdOut = root.querySelector("#rd-hold-out");
const secBox = root.querySelector("#rd-sec");
const fieldSvgEl = stage.querySelector(".rd-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Click: start the raid", field: "Click: start the raid" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
// the settings (time held on the objective, security element on or off) and the run (t in figure seconds)
let cfg = { dwell: DATA.START.dwell, security: DATA.START.security };
let R = { t: 0, released: false };
const FM = { t: 0 };
let stageF = null, fire = null;
let touring = !still.matches, last = 0, frame = 0, visible = false, idle = 0, wait = 0;
const TOUR0 = () => ({ i: 0, stage: "pre", timer: 0 });
let tour = TOUR0();
const cur = () => stateAt(cfg, R.t, R.released);
function setCfg(next) {
  cfg = { dwell: snap(next.dwell), security: !!next.security };
  slider.value = String(cfg.dwell);
  holdOut.textContent = cfg.dwell.toFixed(1) + " s";
  secBox.checked = cfg.security;
  stage.setAttribute("aria-valuenow", String(cfg.dwell));
}
function newRun() { R = { t: 0, released: false }; wait = 0; }
function release() { if (!R.released) { R = { t: 0, released: true }; wait = 0; } }
function drawField(S) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const g = S.gate > 0.5 ? "1" : "0";
  if (fieldSvgEl._g !== g) { fieldSvgEl.setAttribute("data-gate", g); fieldSvgEl._g = g; }
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
  stage.setAttribute("aria-valuetext", text + " (figure seconds and counts are notional)");
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
// the tour: a run with the hold in the window, one held too long, one too short, one with security off
function tourTick(dt) {
  tour.timer += dt;
  if (tour.stage === "pre") { if (tour.timer > 1.4) release(); return; }
}
function advanceTour() {
  tour.i++; tour.stage = "pre"; tour.timer = 0; wait = 0;
  const [d, s] = TOUR[tour.i % TOUR.length];
  setCfg({ dwell: d, security: s });
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
  const step = MODEL.dwell.step;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") change({ ...cfg, dwell: cfg.dwell - step });
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") change({ ...cfg, dwell: cfg.dwell + step });
  else if (event.key === "s" || event.key === "S") change({ ...cfg, security: !cfg.security });
  else if (event.key === " " || event.key === "Enter") goNow();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
goBtn.addEventListener("click", goNow);
slider.addEventListener("input", () => change({ ...cfg, dwell: Number(slider.value) }));
secBox.addEventListener("change", () => change({ ...cfg, security: secBox.checked }));
// Reset: back to the state the page opened in (settings, waiting, the tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function stillRun() { R = { t: 10, released: true }; FM.t = 10; }
function reset() {
  clearTimeout(idle);
  wait = 0;
  FM.t = 0;
  setCfg({ dwell: DATA.START.dwell, security: DATA.START.security });
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
const snapshot = () => JSON.stringify({ cfg, R, FM, wait, touring, tour, slider: slider.value, out: holdOut.textContent, sec: secBox.checked, readout: readout.textContent });
const LOAD = { field: null, machine: null };
LOAD[view] = snapshot();
window.__rd = {
  get R() { return R; }, get cfg() { return cfg; }, FM, change, goNow, setView, reset, view: () => view,
  snapshot, load: LOAD,
  stop: () => { touring = false; clearTimeout(idle); },
  // jump to a state (for tests and stills): time held, security on or off, figure seconds into the run (null = waiting)
  seek: (d, s, t) => { setCfg({ dwell: d, security: s }); R = t === null ? { t: 0, released: false } : { t, released: true }; FM.t = t || 0; draw(); },
};
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const [d, s] of [[4, true], [3, false], [4.5, false], [5, false], [10.5, true], [11, true], [1.5, true], [7, false]]) console.log(`hold ${d} security ${s ? "on" : "off"} →`, readoutField(finalState({ dwell: d, security: s })));
console.log("max hold: security on", maxDwell(true), "off", maxDwell(false));
console.log("start:", readoutMachine(RUN0));
console.log("wrote index.html", PAGE.length, "bytes; field men", POSE0.men.length);
