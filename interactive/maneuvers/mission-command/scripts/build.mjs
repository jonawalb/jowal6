// Builds interactive/maneuvers/mission-command/index.html: an isometric bench with a governed
// engine and a hand-cranked engine, made with the Anatomy kit (MIT).
// Run: node interactive/maneuvers/mission-command/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, initial, step, governedSteady, frozenSteady, fieldInitial, fieldStep, fieldReadout } from "./model.mjs";
import { GEO, statics, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks, fieldLink } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 330;

const PLATE = { x: -160, y: -38, w: 320, d: 134, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: 44, y: 76, w: 30, d: 14, r: 1.5 };
const RULER = { x: 12, y: 79, w: 9, d: 11, r: 0.8 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.GX, GEO.FW.y, 64], [-98, -20, 36]],
  WIDTH, HEIGHT, { pad: 12, azimuth: 62 },
);

const at = (p) => k.iso(p, P);
const S_ = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S_(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S_(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S_(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -6, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // label plate with three rule lines standing for print
  out.push(S_(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[22, 4], [16, 7], [19, 10]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  // ruler block under the load pointer: ticks grow from its -x edge
  out.push(S_(k.slabOf(RULER, 0, 4, P, 3, 0.4), { tone: "mid" }));
  const t = k.topTicks(RULER.y + 1, RULER.y + RULER.d - 1, 1, 4, RULER.x, 4, [2, 3.6], P, "y");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

const START = { spinG: 0, spinC: 20, wG: 100, wC: 100, uG: MODEL.u0, uC: MODEL.u0, dHQ: 0, dR: 0, gap: 0, L: MODEL.load0, wheel: 0 };
const STATICS = statics(k, P);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "mc-svg",
  label: "A bench model of mission command. Two identical engines with horizontal flywheels share one load bar that presses a brake on each. The left engine carries a lit flyball governor that reads its own speed and sets its own throttle toward a set point. The right engine's throttle is moved only by a rod from a handwheel on a headquarters console between them. Speed gauges stand at each end. When the link is jammed, the couplings on both rods open: the right throttle freezes and its speed drifts with the load, while the governed engine keeps holding near its set point.",
  body: [plate(), `<g data-part="live">${scene(k, P, { ...START, statics: STATICS })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at platoon scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (the machine's 640 x 330), shown with "slice" so the ground
// fills the whole card at every width. PF frames the ground rect FG.VIEW (u up the card, v across).
const FW = WIDTH, FH = HEIGHT;
const [U0, U1] = FG.VIEW.u, [V0, V1] = FG.VIEW.v;
const toW = (u, v) => { const c = Math.cos(FG.ANG * Math.PI / 180), s = Math.sin(FG.ANG * Math.PI / 180); return [FG.O[0] + u * c - v * s, FG.O[1] + u * s + v * c, 0]; };
const PF = k.fitProjection([toW(U0, V0), toW(U1, V0), toW(U1, V1), toW(U0, V1)], FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const TF = fieldTerrain();
const FIELDS = fieldStatic(k, PF, TF);
const M0 = initial(), F0 = fieldInitial();
const POSE0 = fieldPose(M0, F0, true, TF);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "mc-field",
  label: "The same idea on a battlefield. Two platoons of one company, each in two squad columns, advance from a line of departure toward two stone bridges over a stream; an enemy fire team holds fighting positions at the far end of each bridge, with a machine-gun nest beside the road and a hamlet behind. Company headquarters stands at the bottom centre with a radio mast, the company commander and his radio operator; faint signal arcs ripple from the mast to each platoon's radio operator and vanish when the link is jammed. The left platoon, lit, works to the commander's intent: when the enemy machine gun moves up to cover the road it shifts behind a hedge and keeps going, and takes its bridge. The right platoon waits for orders: while the link is jammed, or while headquarters' orders lag the situation, it halts and waits, and on the open road it lies under the machine gun's fire. Greyed figures lying still are men down on both sides. Sizes, ranges, timings and casualty counts are notional.",
  body: [`<g data-part="ground">${FIELDS.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELDS.items, ...menItems])}</g><g data-part="link">${fieldLink(k, PF, POSE0, 0.3, 1)}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg mc-field"', 'class="iso-svg mc-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (ADP 6-0, 2019) says the commander’s intent lets subordinates act “when communication with higher echelons is intermittent or decisions must be made immediately.” The governor acts on its own reading, toward a set point headquarters chose. Engine numbers are a notional teaching model, not data.";

const LABELS = {
  machine: "Mission command bench. Left and right arrow keys change the load; J jams or restores the link; V switches to the Battlefield view.",
  field: "Battlefield: two platoons and their company headquarters. Left and right arrow keys change the enemy situation; J jams or restores the radio link; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 18",
  title: "Governor and crank",
  hint: "Hover: load · click: jam",
  readout: "",
  keys: [
    { mark: "lit", label: "Governor: reads its own speed, sets its own throttle" },
    { mark: "raised", label: "Command rods from headquarters, with couplings" },
    { mark: "edge", label: "Gauges: each engine’s speed, % of the set point" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage mc-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="50" aria-valuemax="100" aria-valuenow="70">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("Engine numbers are a notional teaching model, not data.", "Unit sizes, ranges, timings and casualty counts here are notional, not data.").replace("The governor acts on its own reading, toward a set point headquarters chose.", "The lit platoon acts on its own reading, toward the intent headquarters gave.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Platoon on intent: reads the situation, adapts (lit)" },
    { mark: "blue", label: "Platoon on orders; headquarters and its radio links" },
    { mark: "red", label: "Enemy: a fire team and an MG team at each bridge" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="mc-legend mc-legend-machine">${m}</div><div class="mc-legend mc-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, START, LABELS } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, wireSvg, fadeLineSvg, faceTextSvg, extrude, pathOf, onTop, slabOf, cylinder, knurl, sideArc, sideSeam, ring, lineOnTop, planOutline, segment, coil, haloOf, insetPlan, corners, radialTicks, towardViewer, topMatrix, topTicks };
const root = document.querySelector(".mc-figure");
const stage = root.querySelector(".mc-stage");
const svg = stage.querySelector(".mc-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const jamBtn = root.querySelector("#mc-jam");
const slider = root.querySelector("#mc-load");
const fieldSvgEl = stage.querySelector(".mc-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const linkEl = fieldSvgEl.querySelector('[data-part="link"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const STATICS = statics(K, P);
const M = initial();
const S = { ...START, linked: true, target: MODEL.load0 };
// the battlefield: F is the model's field state (model.mjs fieldStep), FM what the page remembers
const TF = fieldTerrain();
const LOOKS = new Map();
let F = fieldInitial();
const FM = { t: 0, fell: {}, rout: { g: 0, c: 0 }, held: 0, resetting: 0 };
let stageF = null, fire = null, marksSig = "", runTimer = 0;
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
// [time s, link up, load]
const TOUR = [[0, true, 0.7], [1, true, 1.0], [5, true, 0.7], [7.5, false, 0.7], [8.5, false, 1.0], [11, false, 0.6], [14.5, true, 0.6], [15.2, true, 0.7]];
const LOOP = 16;
function tourAt(t) {
  t %= LOOP;
  let row = TOUR[0];
  for (const r of TOUR) if (t >= r[0]) row = r;
  return row;
}
function setLinked(on) {
  S.linked = on;
  jamBtn.setAttribute("aria-pressed", String(!on));
  jamBtn.textContent = on ? "Jam the link" : "Restore the link";
}
// A new run on the battlefield: the troops fade, go back to the start line and fade in again.
function newRun() {
  if (FM.resetting) return;
  FM.resetting = 1;
  fieldSvgEl.classList.add("mc-reset");
  runTimer = setTimeout(() => {
    const gun = F.gun, back = F.back;
    F = fieldInitial(); F.gun = gun; F.back = back;
    FM.fell = {}; FM.rout = { g: 0, c: 0 }; FM.held = 0;
    fieldSvgEl.classList.remove("mc-reset");
    FM.resetting = 0;
  }, still.matches ? 0 : 420);
}
// Reduced motion: the battlefield at rest for this situation, from a whole run of the same model.
function fieldAtRest() {
  const f = fieldInitial();
  for (let i = 0; i < 2400; i++) fieldStep(f, M, 1 / 60);
  return f;
}
// Battlefield frame: soldiers move by translate and re-render only when their look changes; the
// fire layer writes attributes only; the fire sectors redraw only when the guns move.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(M, F, S.linked, TF, FM);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = ["g", "c"].map((k) => (pose.gunner[k] ? "1" : "0")).join("") + pose.onRoad.toFixed(2);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, pose); marksSig = sig; }
  linkEl.innerHTML = fieldLink(K, PF, pose, still.matches ? 0.3 : FM.t, 1 - S.gap / 3.2);
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  let text;
  if (view === "field") {
    drawField();
    text = fieldReadout(M, F, S.linked);
  } else {
    layer.innerHTML = scene(K, P, { ...S, wG: M.wG, wC: M.wC, uG: M.uG, uC: M.uC, L: M.L, statics: STATICS });
    text = (S.linked ? "Link up" : "Link cut") + " · governed " + Math.round(M.wG) + "% · cranked " + Math.round(M.wC) + "%";
  }
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(S.target * 100)));
  stage.setAttribute("aria-valuetext", text);
  if (document.activeElement !== slider) slider.value = String(Math.round(S.target * 100));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    const lap = Math.floor(clock / LOOP);
    clock += dt;
    if (Math.floor(clock / LOOP) !== lap) newRun();
    const [, linked, load] = tourAt(clock);
    if (linked !== S.linked) setLinked(linked);
    S.target = load;
  }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  // the load bar moves smoothly; the model steps with it (reduced motion: run to rest)
  const L = ease(M.L, S.target, 0.35);
  if (calm) { for (let i = 0; i < 1800; i++) step(M, S.target, S.linked, 1 / 60); }
  else step(M, L, S.linked, dt);
  // the battlefield steps with the same engines (reduced motion: a whole run at rest)
  if (calm) { F = fieldAtRest(); FM.fell = {}; FM.rout = { g: F.tookG ? 1 : 0, c: F.tookC ? 1 : 0 }; }
  else if (!FM.resetting) {
    fieldStep(F, M, dt);
    for (const k of ["g", "c"]) { const took = k === "g" ? F.tookG : F.tookC; FM.rout[k] = took ? Math.min(1, FM.rout[k] + dt * 0.5) : 0; }
    // out of the tour, a run that has ended (the lit platoon on its bridge for 4 s) starts again
    FM.held = F.pG >= 1 ? FM.held + dt : 0;
    if (!touring && FM.held > 4) newRun();
  }
  FM.t += calm ? 0 : dt;
  S.spinG = (S.spinG + (calm ? 0 : M.wG * 0.9 * dt)) % 360;
  S.spinC = (S.spinC + (calm ? 0 : M.wC * 0.9 * dt)) % 360;
  S.dHQ = (M.uHQ - MODEL.u0) * GEO.ROD_GAIN;
  S.dR = (M.uC - MODEL.u0) * GEO.ROD_GAIN;
  S.wheel = (M.uHQ - MODEL.u0) * 600;
  S.gap = ease(S.gap, S.linked ? 0 : 3.2, 0.25);
  draw();
  const rest = calm || (!touring && Math.abs(M.L - S.target) < 1e-4 && Math.abs(M.wG - governedSteady(M.L)) < 0.05 && Math.abs(M.wC - frozenSteady(M.uC, M.L)) < 0.05 && Math.abs(M.uHQ - clamp(M.seen, 0, MODEL.uMax)) < 1e-3 && Math.abs(M.seen - M.L) < 1e-3);
  // the flywheels keep turning (and the battlefield keeps firing) while the figure is on screen and motion is allowed
  frame = visible && !(calm && rest) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; if (touring) newRun(); run(); }, 9000);
  run();
};
const steer = (load) => { S.target = clamp(load, MODEL.load[0], MODEL.load[1]); hold(); };
const toggle = () => { setLinked(!S.linked); hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const r = stage.getBoundingClientRect();
  const f = clamp((event.clientX - r.left) / r.width, 0.1, 0.9);
  steer(0.5 + (f - 0.1) / 0.8 * 0.5);
});
stage.addEventListener("click", toggle);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(S.target + 0.05);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(S.target - 0.05);
  else if (event.key === "j" || event.key === "J" || event.key === " " || event.key === "Enter") toggle();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
jamBtn.addEventListener("click", toggle);
slider.addEventListener("input", () => steer(Number(slider.value) / 100));
// Reset: back to the state the page opened in (engines, battlefield, controls and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  clearTimeout(runTimer);
  fieldSvgEl.classList.remove("mc-reset");
  Object.assign(M, initial());
  Object.assign(S, START, { linked: true, target: MODEL.load0 });
  F = fieldInitial();
  Object.assign(FM, { t: 0, fell: {}, rout: { g: 0, c: 0 }, held: 0, resetting: 0 });
  marksSig = "";
  setLinked(true);
  slider.value = String(Math.round(MODEL.load0 * 100));
  touring = !still.matches; clock = 0;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
still.addEventListener?.("change", run);
setLinked(true);
setView(view, false);
window.__missionCommand = { S, M, F: () => F, setLinked, steer, setView, reset, view: () => view, newRun, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const L of [0.5, 0.7, 1.0]) console.log(`load ${L}: governed ${governedSteady(L).toFixed(1)}%, frozen-at-0.7 ${frozenSteady(0.7, L).toFixed(1)}%`);
const s = initial();
for (let t = 0; t < 2; t += 1 / 60) step(s, 1.0, true, 1 / 60);
console.log("after 2 s at full load, linked:", s.wG.toFixed(1), s.wC.toFixed(1), "· wrote index.html", PAGE.length, "bytes");
