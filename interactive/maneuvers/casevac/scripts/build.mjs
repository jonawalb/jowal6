// Builds interactive/maneuvers/casevac/index.html: an isometric conveyor bench made with the Anatomy kit
// (../../kit, MIT) plus a platoon-scale Battlefield view (../../kit/terrain.mjs) of an attack whose casualties
// and ammunition share one carrier.
// Run: node interactive/maneuvers/casevac/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, START, stateAt, finalState, readoutField, readoutMachine } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, cvTruck } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 400;
const PLATE = { x: -100, y: -58, w: 186, d: 108, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;
const LABEL = { x: 71, y: 38, w: 12, d: 8, r: 1.5 };
const G = GEO;
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [G.DIAL.x, G.DIAL.y, G.DIAL.top + 3], [G.TANK.x, G.TANK.y, 22], [G.RACK.x, G.RACK.y, 8]],
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
  [[6, 2.6], [4, 5.2]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 3, LABEL.y + dy], [LABEL.x + 3 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  return out.join("");
}

const CFG0 = { cas: START.cas, vehicle: START.vehicle };
const RUN0 = stateAt(CFG0, 0, false);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "cv-svg",
  label: "A bench model of casualty evacuation, notional. A carriage on a rail at the back is a platoon's line; it moves in four steps between five posts and halts after each. A tank at the left end shows its ammunition. A belt runs along the middle with an eight-slot tray, the platoon casualty collection point, and a bin at its end, the company casualty collection point. A cart, litter bearers or a nonmedical vehicle, takes casualties along the belt to the bin and then runs ammunition up a lane to the line; in this model the line does not step off until the ammunition arrives. A dial shows the run's progress, a rack shows men down, and a time rule shows moves and halts. Times and counts are notional.",
  body: [plate(), `<g data-part="live">${scene(k, P, RUN0)}</g>`],
});

// ---- Battlefield view: the same run on full-bleed terrain, a platoon attack with its casualty flow ----
const FW = 640, FH = 420;
const PF = k.fitProjection([[-122, -54, 0], [80, -54, 0], [80, 50, 0], [-122, 50, 0]], FW, FH, { pad: 0, azimuth: 72, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose(RUN0, T);
const unitSvg = (KK2, PP, m) => (m.kind ? cvTruck(KK2, PP, trFaceStep(m.face)) : trSoldier(KK2, PP, { ...m, face: trFaceStep(m.face) }));
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? " data-lit" : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(k, PF, m)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "cv-field",
  label: "The same idea on a battlefield, notional, with soldiers drawn larger than scale. At left a company casualty collection point in a chalk rectangle with a combat medic, and a farm track along the bottom. A platoon of three squads in a line attacks toward an enemy position of three two-man holes on a rise at the right, moving between chalk phase lines and halting at each. Behind the line of departure the platoon casualty collection point is a chalk rectangle with the platoon sergeant, a combat medic and two pairs of aid and litter bearers. When a man goes down, a pair fetches him to the platoon CCP; at each halt the lit carrier, a nonmedical vehicle or litter bearers, takes the casualties down the track to the company CCP and then brings ammunition forward, and in this model the platoon steps off only when it arrives. Greyed figures lying still are men down. Sizes, times and counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg cv-field"', 'class="iso-svg cv-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "ATP 4-02.13 (30 June 2021, para. 1-2) defines casualty evacuation as the movement of casualties aboard nonmedical vehicles or aircraft without en route medical care. The bench is this figure's own model. Times and counts are notional.";
const FIELD_CAPTION = "A platoon attack in which casualties and ammunition share one carrier. Unit sizes, ranges, times and counts are notional.";
const LABELS = {
  machine: "Casualty evacuation bench, a notional model. Left and right arrows change the number of casualties; M switches between a nonmedical vehicle and litter bearers; space starts the run; V switches to the Battlefield view. Times, counts and losses are notional values in this model, not data.",
  field: "Battlefield, a notional model. Left and right arrows change the number of casualties; M switches between a nonmedical vehicle and litter bearers; space starts the run; V switches to the Machine view. Times, counts and losses are notional values in this model, not data.",
};
const card = k.plateHtml({
  fig: "Fig 54",
  title: "Casualty Evacuation",
  hint: "Click: start the run",
  readout: "",
  keys: [
    { mark: "lit", label: "Carriage: the platoon's line" },
    { mark: "raised", label: "Belt, tray (platoon CCP), bin (company CCP), cart" },
    { mark: "edge", label: "Tank: ammunition; dial, rack, time rule" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage cv-stage" tabindex="0" role="slider" aria-label="${LABELS.field}" aria-valuemin="0" aria-valuemax="8" aria-valuenow="${START.cas}" aria-valuetext="${readoutMachine(RUN0)} (in this model; counts and times are notional)">${svg}${fieldSvg}</div>`,
});
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Carrier (lit): a nonmedical vehicle or litter bearers" },
    { mark: "blue", label: "Friendly: three squads, the platoon CCP and the company CCP" },
    { mark: "red", label: "Enemy: three two-man positions on the rise" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="cv-legend cv-legend-machine">${m}</div><div class="cv-legend cv-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, LABELS, START, MODEL, TOUR: [[3, true], [3, false], [6, false], [0, true]] };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, LABELS, TOUR } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks };
const root = document.querySelector(".cv-figure");
const stage = root.querySelector(".cv-stage");
const svg = stage.querySelector(".cv-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const goBtn = root.querySelector("#cv-go");
const slider = root.querySelector("#cv-n");
const nOut = root.querySelector("#cv-n-out");
const meansBtns = root.querySelectorAll(".cv-modes [data-means]");
const fieldSvgEl = stage.querySelector(".cv-field");
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
// the settings (casualties, means) and the run (t in figure seconds)
let cfg = { cas: DATA.START.cas, vehicle: DATA.START.vehicle };
let R = { t: 0, released: false };
const FM = { t: 0 };
let stageF = null, fire = null;
let touring = !still.matches, last = 0, frame = 0, visible = false, idle = 0, wait = 0;
const TOUR0 = () => ({ i: 0, stage: "pre", timer: 0 });
let tour = TOUR0();
const cur = () => stateAt(cfg, R.t, R.released);
function setCfg(next) {
  cfg = { cas: snap(next.cas), vehicle: !!next.vehicle };
  slider.value = String(cfg.cas);
  nOut.textContent = String(cfg.cas);
  meansBtns.forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.means === "vehicle") === cfg.vehicle)));
  root.setAttribute("data-means", cfg.vehicle ? "vehicle" : "litter");
  stage.setAttribute("aria-valuenow", String(cfg.cas));
}
function newRun() { R = { t: 0, released: false }; wait = 0; }
function release() { if (!R.released) { R = { t: 0, released: true }; wait = 0; } }
function drawField(S) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, T);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + "|" + m.side + (m.kind ? "|v" : "");
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: !!m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, m.kind ? cvTruck(K, PF, trFaceStep(m.face)) : trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  fire.draw(trShots(pose.streams, FM.t));
}
function draw() {
  const S = cur();
  if (view === "field") drawField(S);
  else layer.innerHTML = scene(K, P, S);
  const text = view === "field" ? readoutField(S) : readoutMachine(S);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text + " (in this model; seconds, counts and casualties are notional)");
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
// the tour: 3 casualties by vehicle, the same by litter bearers, 6 by litter bearers, then none
function tourTick(dt) {
  tour.timer += dt;
  if (tour.stage === "pre") { if (tour.timer > 1.4) release(); return; }
}
function advanceTour() {
  tour.i++; tour.stage = "pre"; tour.timer = 0; wait = 0;
  const [c, v] = TOUR[tour.i % TOUR.length];
  setCfg({ cas: c, vehicle: v });
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
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") change({ ...cfg, cas: cfg.cas - 1 });
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") change({ ...cfg, cas: cfg.cas + 1 });
  else if (event.key === "m" || event.key === "M") change({ ...cfg, vehicle: !cfg.vehicle });
  else if (event.key === " " || event.key === "Enter") goNow();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
goBtn.addEventListener("click", goNow);
slider.addEventListener("input", () => change({ ...cfg, cas: Number(slider.value) }));
meansBtns.forEach((b) => b.addEventListener("click", () => change({ ...cfg, vehicle: b.dataset.means === "vehicle" })));
// Reset: back to the state the page opened in (settings, waiting, the tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function stillRun() { R = { t: 10, released: true }; FM.t = 10; }
function reset() {
  clearTimeout(idle);
  wait = 0;
  FM.t = 0;
  setCfg({ cas: DATA.START.cas, vehicle: DATA.START.vehicle });
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
const snapshot = () => JSON.stringify({ cfg, R, FM, wait, touring, tour, slider: slider.value, out: nOut.textContent, means: root.getAttribute("data-means"), readout: readout.textContent });
const LOAD = { field: null, machine: null };
LOAD[view] = snapshot();
window.__casevac = {
  get R() { return R; }, get cfg() { return cfg; }, FM, change, goNow, setView, reset, view: () => view,
  snapshot, load: LOAD,
  stop: () => { touring = false; clearTimeout(idle); },
  // jump to a state (for tests and stills): casualties, vehicle (bool), figure seconds into the run (null = waiting)
  seek: (c, v, t) => { setCfg({ cas: c, vehicle: v }); R = t === null ? { t: 0, released: false } : { t, released: true }; FM.t = t || 0; draw(); },
};
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const [c, v] of [[0, true], [3, true], [3, false], [8, true], [8, false]]) console.log(`${c} ${v ? "vehicle" : "litters"} →`, readoutField(finalState({ cas: c, vehicle: v })));
console.log("start:", readoutMachine(RUN0));
console.log("wrote index.html", PAGE.length, "bytes; field men", POSE0.men.length);
