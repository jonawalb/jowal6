// Builds interactive/maneuvers/security-tasks/index.html: an isometric buffers-and-ram bench made with
// the Anatomy kit (../../kit, MIT) plus a Battlefield view of a screen, a guard and a cover
// (../../kit/terrain.mjs).
// Run: node interactive/maneuvers/security-tasks/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, START, TASKS, ENEMIES, stateAt, finalState, readoutField, readoutMachine } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

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
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-64, 0, 24], [G.DIAL.x, G.DIAL.y, G.DIAL.top + 3], [G.X1, 0, 14], [G.RACK.x + 46, G.RACK.y, 6]],
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
  out.push(L(k.lineOnTop([G.X0 + 20, 0], [G.X1 + 4, 0], 0, P), { tone: "faint", free: true }));
  const ye = PLATE.y + PLATE.d - 11;
  out.push(S(k.slabOf({ x: G.X0 + 20, y: ye - 3, w: G.X1 - G.X0 - 16, d: 3, r: 0.6 }, 0, 0.9, P, 2, 0.2), { tone: "lo", crease: "none" }));
  const t = k.topTicks(G.X0 + 20, G.X1 - 4, 6, 5, ye, 0, [1.3, 2.1], P, "x");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

const CFG0 = { task: START.task, enemy: START.enemy };
const RUN0 = stateAt(CFG0, 0, false);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "sc-svg",
  label: "A bench model of the three security tasks. A heavy block at the left is the main body. Three buffers stand on the rail in front of it, each stiffer than the last: a light one for a screen, a stiffer one for a guard, a heavy twin-spring one for a cover, which stands furthest out. Only the one you choose is raised and lit; the others lie flush. A ram carriage, the enemy, runs down the rail from the right, with one, two or three weights for reconnaissance elements, lead elements or the main body. A dial times the run from the moment the security force reports, with a pin at the time bought. A band in front of the block marks where the enemy can observe the main body. A meter shows the share of power the security force takes from the main body, and a rack counts men down. In this model, a stiffer buffer buys more time and costs the block more power. Distances, times and counts are notional.",
  body: [plate(), `<g data-part="live">${scene(k, P, RUN0)}</g>`],
});

// ---- Battlefield view: the same run on full-bleed terrain at soldier scale ----
const FW = 640, FH = 420;
const AZ = 80 * Math.PI / 180, EL = 42 * Math.PI / 180;
const KK = FW / 215, DU = 215, DV = FH / (KK * Math.sin(EL));
const CEN = [10, 0];
const uc = CEN[0] * Math.sin(AZ) - CEN[1] * Math.cos(AZ), vc = CEN[0] * Math.cos(AZ) + CEN[1] * Math.sin(AZ);
const toWorld = (u, v) => [u * Math.sin(AZ) + v * Math.cos(AZ), -u * Math.cos(AZ) + v * Math.sin(AZ), 0];
const PF = k.fitProjection([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => toWorld(uc + a * DU / 2, vc + b * DV / 2)), FW, FH, { pad: 0, azimuth: 80, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose(RUN0, T);
const unitSvg = (KK2, PP, m) => trSoldier(KK2, PP, { ...m, face: trFaceStep(m.face) });
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? " data-lit" : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(k, PF, m)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "sc-field",
  label: "The same idea on a battlefield, with soldiers drawn larger than scale. At the left a main body sits in four positions with a command post. In front of it is the security force you choose. A screen is three observation posts of two soldiers, each with a field of observation, that engage reconnaissance elements within their means and otherwise fight only in self-defense. A guard is three defensive positions and a forward element, with a reserve behind. A cover is a forward line of four positions and a second line of two in depth, with a reserve, and it works independent of the main body. An enemy of the level you choose comes down the road from the right: reconnaissance elements, lead elements or its main body. The security force reports when the enemy reaches it; a dashed line marks the report. Greyed figures are men down. In this model, the stiffer the task, the more time it buys and the more it costs. Sizes, ranges, timings and counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, RUN0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg sc-field"', 'class="iso-svg sc-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "FM 3-90 (1 May 2023, para. 13-1): security operations give the protected force “time and maneuver space within which to react to the enemy.” The three buffers are this figure’s picture of screen, guard and cover. Distances, times and counts are notional.";
const FIELD_CAPTION = "A main body, a security force forward of it and an enemy coming down the road. Unit sizes, ranges, timings and counts are notional.";
const LABELS = {
  machine: "Security-tasks bench. Left and right arrows choose the task: screen, guard or cover; up and down arrows choose the enemy: reconnaissance elements, lead elements or main body; Space starts the run; V switches to the Battlefield view. All distances, times and counts are notional.",
  field: "Battlefield. Left and right arrows choose the task: screen, guard or cover; up and down arrows choose the enemy: reconnaissance elements, lead elements or main body; Space starts the run; V switches to the Machine view. All sizes, ranges, times and counts are notional.",
};
const card = k.plateHtml({
  fig: "Fig 50",
  title: "Screen, Guard and Cover",
  hint: "Click: start the run",
  readout: "",
  keys: [
    { mark: "lit", label: "The raised buffer: the task you chose" },
    { mark: "raised", label: "Ram carriage: the enemy; band: where it can observe the main body" },
    { mark: "edge", label: "Dial, power meter, distance rule and rack of men down" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage sc-stage" tabindex="0" role="group" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "blue", label: "Friendly: main body at the left, the security force you chose forward" },
    { mark: "red", label: "Enemy: reconnaissance elements, lead elements or main body" },
    { mark: "dashed", label: "Chalk: the line inside which the enemy can observe the main body (notional)" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="sc-legend sc-legend-machine">${m}</div><div class="sc-legend sc-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, LABELS, START, TOUR: [[1, 1], [0, 2], [1, 2], [2, 2], [0, 0]], TASKS, ENEMIES };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, LABELS, TOUR } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks };
const root = document.querySelector(".sc-figure");
const stage = root.querySelector(".sc-stage");
const svg = stage.querySelector(".sc-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const goBtn = root.querySelector("#sc-go");
const taskBtns = root.querySelectorAll("#sc-task [data-v]");
const enemyBtns = root.querySelectorAll("#sc-enemy [data-v]");
const fieldSvgEl = stage.querySelector(".sc-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
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
let cfg = { task: DATA.START.task, enemy: DATA.START.enemy };
let R = { t: 0, released: false };
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "";
let touring = !still.matches, last = 0, frame = 0, visible = false, idle = 0, wait = 0;
const TOUR0 = () => ({ i: 0, stage: "pre", timer: 0 });
let tour = TOUR0();
const cur = () => stateAt(cfg, R.t, R.released);
function setCfg(next) {
  cfg = norm(next);
  taskBtns.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.v) === cfg.task)));
  enemyBtns.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.v) === cfg.enemy)));
  root.setAttribute("data-task", String(cfg.task));
  stage.setAttribute("aria-valuenow", String(cfg.task * 3 + cfg.enemy));
}
function newRun() { R = { t: 0, released: false }; wait = 0; }
function release() { if (!R.released) { R = { t: 0, released: true }; wait = 0; } }
function drawField(S) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, T);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + "|" + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: !!m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = S.task + "|" + (S.reported ? 1 : 0) + "|" + Math.round(S.sSec * 3);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, S); marksSig = sig; }
  fire.draw(trShots(pose.streams, FM.t));
}
function draw() {
  const S = cur();
  if (view === "field") drawField(S);
  else layer.innerHTML = scene(K, P, S);
  const text = view === "field" ? readoutField(S) : readoutMachine(S);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text + " (notional minutes, distances and counts; the model's own numbers, not doctrine)");
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
        if (wait > 0.9) { if (touring) advanceTour(); else newRun(); }
      }
    } else if (touring) tourTick(dt);
  }
  draw();
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
// the tour: a guard holding lead elements, then screen, guard and cover against the same main body,
// then a screen against reconnaissance elements
function tourTick(dt) {
  tour.timer += dt;
  if (tour.stage === "pre") { if (tour.timer > 1.2) release(); return; }
}
function advanceTour() {
  tour.i++; tour.stage = "pre"; tour.timer = 0; wait = 0;
  const [t, e] = TOUR[tour.i % TOUR.length];
  setCfg({ task: t, enemy: e });
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
  if (event.key === "ArrowLeft") change({ ...cfg, task: cfg.task - 1 });
  else if (event.key === "ArrowRight") change({ ...cfg, task: cfg.task + 1 });
  else if (event.key === "ArrowDown") change({ ...cfg, enemy: cfg.enemy - 1 });
  else if (event.key === "ArrowUp") change({ ...cfg, enemy: cfg.enemy + 1 });
  else if (event.key === " " || event.key === "Enter") goNow();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
goBtn.addEventListener("click", goNow);
taskBtns.forEach((b) => b.addEventListener("click", () => change({ ...cfg, task: Number(b.dataset.v) })));
enemyBtns.forEach((b) => b.addEventListener("click", () => change({ ...cfg, enemy: Number(b.dataset.v) })));
// Reset: back to the state the page opened in (settings, waiting, the tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function stillRun() { R = { t: 8, released: true }; FM.t = 8; }
function reset() {
  clearTimeout(idle);
  wait = 0;
  FM.t = 0;
  marksSig = "";
  setCfg({ task: DATA.START.task, enemy: DATA.START.enemy });
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
const snapshot = () => JSON.stringify({ cfg, R, FM, wait, touring, tour, task: root.getAttribute("data-task"), pressed: [...taskBtns, ...enemyBtns].map((b) => b.getAttribute("aria-pressed")).join(""), readout: readout.textContent });
const LOAD = { field: null, machine: null };
LOAD[view] = snapshot();
window.__securityTasks = {
  get R() { return R; }, get cfg() { return cfg; }, FM, change, goNow, setView, reset, view: () => view,
  snapshot, load: LOAD,
  stop: () => { touring = false; clearTimeout(idle); },
  // jump to a state (for tests and stills): task 0..2, enemy 0..2, figure seconds into the run (null = waiting)
  seek: (task, enemy, t) => { setCfg({ task, enemy }); R = t === null ? { t: 0, released: false } : { t, released: true }; FM.t = t || 0; marksSig = ""; draw(); },
};
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (let t = 0; t < 3; t++) for (let e = 0; e < 3; e++) console.log(`${TASKS[t].name} vs ${ENEMIES[e].short} →`, readoutField(finalState({ task: t, enemy: e })));
console.log("start:", readoutMachine(RUN0));
console.log("wrote index.html", PAGE.length, "bytes; field men", POSE0.men.length);
