// Builds interactive/maneuvers/movement-to-contact/index.html: an isometric carriage-and-feeler bench made
// with the Anatomy kit (../../kit, MIT) plus a company movement-to-contact Battlefield view
// (../../kit/terrain.mjs).
// Run: node interactive/maneuvers/movement-to-contact/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, START, stateAt, finalState, readoutField, readoutMachine, gapMin } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
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
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [2, 0, 24], [G.DIAL.x, G.DIAL.y, G.DIAL.top + 3], [G.X1, 0, 14], [G.RACK.x + 30, G.RACK.y, 6]],
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

const CFG0 = { gap: START.gap, lead: START.lead };
const RUN0 = stateAt(CFG0, 0, false);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "mc-svg",
  label: "A bench model of a movement to contact. A heavy carriage, the main body, runs on a rail behind a small lit feeler, the lead element, joined to it by a long coil spring. The feeler meets the enemy first, at a fire band across the rail, and stops. As the carriage closes up, its two wings swing from folded to open and a meter of six pegs fills: the main body shaking out from column into line. A dial times it from contact, with one pin for the time the shake-out needs and one for the time the gap buys. At the far end six posts are the defenders and fall as they go out of action. A rule at the front sets the gap. In this model, a gap too short and the carriage is hit before it has opened; too long and the feeler is alone too long. A rack shows men down. Distances, times and counts are notional.",
  body: [plate(), `<g data-part="live">${scene(k, P, RUN0)}</g>`],
});

// ---- Battlefield view: the same run on full-bleed terrain at platoon scale ----
const FW = 640, FH = 420;
const AZ = 80 * Math.PI / 180, EL = 42 * Math.PI / 180;
const KK = FW / 215, DU = 215, DV = FH / (KK * Math.sin(EL));
const CEN = [16, 0];
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
  className: "mc-field",
  label: "The same idea on a battlefield, a company moving to contact, with soldiers drawn larger than scale. A lit lead squad of nine goes ahead along a road from the left. Behind it, at the gap you set, the main body follows in two files: two platoon groups of nine and a company headquarters of three. At a dashed chalk line the lead squad is engaged by an enemy position on a rise at the right: six defenders in four fighting positions and two machine-gun nests. The lead squad goes to ground; the main body shakes out from two files into a line and opens fire. In this model, with the gap too short the main body is hit in column, with the gap too long the lead squad is alone too long, and with no lead element the main body makes contact itself. Greyed figures are men down. Sizes, ranges, timings and counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg mc-field"', 'class="iso-svg mc-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "FM 3-90 (1 May 2023, para. 3-4): forces conducting a movement to contact seek to make contact using the smallest friendly force feasible. The feeler meets the enemy first and the carriage opens before it arrives. Distances, times and counts are notional.";
const FIELD_CAPTION = "A company moving to contact: a lead squad ahead, the main body behind it, an enemy position on a rise. Unit sizes, ranges, timings and counts are notional.";
const LABELS = {
  machine: "Movement-to-contact bench. Left and right arrows set the gap between the lead element and the main body; L toggles the lead element; Space starts the run; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrows set the gap between the lead element and the main body; L toggles the lead element; Space starts the run; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 48",
  title: "Movement to Contact",
  hint: "Click: start the run",
  readout: "",
  keys: [
    { mark: "lit", label: "The feeler: the lead element" },
    { mark: "raised", label: "Fire band and posts: the enemy's reach and defenders" },
    { mark: "edge", label: "Dial, shake-out meter, gap rule and rack of men down" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage mc-stage" tabindex="0" role="group" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "blue", label: "Friendly: lead squad (lit), main body in two files" },
    { mark: "red", label: "Enemy: six defenders on a rise" },
    { mark: "dashed", label: "Chalk: the edge of the enemy's reach (notional)" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="mc-legend mc-legend-machine">${m}</div><div class="mc-legend mc-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, LABELS, START, TOUR: [[300, true], [120, true], [420, true], [300, false]] };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, LABELS, TOUR } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks };
const root = document.querySelector(".mc-figure");
const stage = root.querySelector(".mc-stage");
const svg = stage.querySelector(".mc-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const goBtn = root.querySelector("#mc-go");
const slider = root.querySelector("#mc-gap");
const gapOut = root.querySelector("#mc-gap-out");
const leadBox = root.querySelector("#mc-lead");
const fieldSvgEl = stage.querySelector(".mc-field");
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
// the settings (gap, lead element on or off) and the run (t in figure seconds)
let cfg = { gap: DATA.START.gap, lead: DATA.START.lead };
let R = { t: 0, released: false };
const FM = { t: 0 };
let stageF = null, fire = null;
let touring = !still.matches, last = 0, frame = 0, visible = false, idle = 0, wait = 0;
const TOUR0 = () => ({ i: 0, stage: "pre", timer: 0 });
let tour = TOUR0();
const cur = () => stateAt(cfg, R.t, R.released);
function setCfg(next) {
  cfg = { gap: snap(next.gap), lead: !!next.lead };
  slider.value = String(cfg.gap);
  slider.disabled = !cfg.lead;
  gapOut.textContent = cfg.lead ? cfg.gap + " u" : "none";
  leadBox.checked = cfg.lead;
  stage.setAttribute("aria-valuenow", String(cfg.gap));
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
  fire.draw(trShots(pose.streams, FM.t));
}
function draw() {
  const S = cur();
  if (view === "field") drawField(S);
  else layer.innerHTML = scene(K, P, S);
  const text = view === "field" ? readoutField(S) : readoutMachine(S);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text + " (figure seconds, distances and counts are notional)");
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
// the tour: a run with the gap in the window, one too short, one too long, one with no lead element
function tourTick(dt) {
  tour.timer += dt;
  if (tour.stage === "pre") { if (tour.timer > 1.4) release(); return; }
}
function advanceTour() {
  tour.i++; tour.stage = "pre"; tour.timer = 0; wait = 0;
  const [g, l] = TOUR[tour.i % TOUR.length];
  setCfg({ gap: g, lead: l });
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
  const step = MODEL.gap.step;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") change({ ...cfg, gap: cfg.gap - step });
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") change({ ...cfg, gap: cfg.gap + step });
  else if (event.key === "l" || event.key === "L") change({ ...cfg, lead: !cfg.lead });
  else if (event.key === " " || event.key === "Enter") goNow();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
goBtn.addEventListener("click", goNow);
slider.addEventListener("input", () => change({ ...cfg, gap: Number(slider.value) }));
leadBox.addEventListener("change", () => change({ ...cfg, lead: leadBox.checked }));
// Reset: back to the state the page opened in (settings, waiting, the tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function stillRun() { R = { t: 10, released: true }; FM.t = 10; }
function reset() {
  clearTimeout(idle);
  wait = 0;
  FM.t = 0;
  setCfg({ gap: DATA.START.gap, lead: DATA.START.lead });
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
const snapshot = () => JSON.stringify({ cfg, R, FM, wait, touring, tour, slider: slider.value, out: gapOut.textContent, lead: leadBox.checked, readout: readout.textContent });
const LOAD = { field: null, machine: null };
LOAD[view] = snapshot();
window.__movementToContact = {
  get R() { return R; }, get cfg() { return cfg; }, FM, change, goNow, setView, reset, view: () => view,
  snapshot, load: LOAD,
  stop: () => { touring = false; clearTimeout(idle); },
  // jump to a state (for tests and stills): gap, lead element on or off, figure seconds into the run (null = waiting)
  seek: (g, l, t) => { setCfg({ gap: g, lead: l }); R = t === null ? { t: 0, released: false } : { t, released: true }; FM.t = t || 0; draw(); },
};
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const [g, l] of [[300, true], [280, true], [360, true], [260, true], [380, true], [0, true], [300, false]]) console.log(`gap ${g} lead ${l ? "on" : "off"} →`, readoutField(finalState({ gap: g, lead: l })));
console.log("least gap that lets the main body shake out:", gapMin());
console.log("start:", readoutMachine(RUN0));
console.log("wrote index.html", PAGE.length, "bytes; field men", POSE0.men.length);
