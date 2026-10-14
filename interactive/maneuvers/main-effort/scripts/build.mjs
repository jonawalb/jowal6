// Builds interactive/maneuvers/main-effort/index.html: an isometric "weighting bench" made with the
// Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/main-effort/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, allocate, stateOf, gateDrop, summary, readoutOf } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 380;
const PLATE = { x: -142, y: -48, w: 284, d: 106, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: -134, y: 34, w: 30, d: 16, r: 1.5 };
const RULER = { x: -100, y: 46, w: 200, d: 7, r: 1 };
const PIERS = [[-117, -101], [-67, -45], [-11, 11], [45, 67], [101, 117]];
const POSTS = [-128, 128];
const LAYER = 1e5;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-136, GEO.BEAM_Y - 4, 92], [136, GEO.BEAM_Y + 4, 92], [-136, GEO.BEAM_Y, 86]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 60 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
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
  [[22, 5], [15, 8.5], [19, 12]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 4.5, LABEL.y + dy], [LABEL.x + 4.5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.4, LABEL.y + 2.4, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8])], { size: 0.42 }));
  // frontage ruler along the attacker's side, with a mark under each sector
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RULER.x + 2, RULER.x + RULER.w - 2, 4, 7, RULER.y, 0.6, [1.8, 3.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // sector tags: one to four pips, A to D
  GEO.X.forEach((x, i) => {
    const tag = { x: x - 8, y: 20, w: 16, d: 8, r: 1.2 };
    out.push(S(k.slabOf(tag, 0, 1.2, P, 3, 0.3), { tone: "mid" }));
    const pips = Array.from({ length: i + 1 }, (_, j) => at([x + (j - i / 2) * 3, 24, 1.2]));
    out.push(Dt(pips, { size: 0.55, tone: "hi" }));
  });
  // sole rail the gantry stands on, with its screws
  const sole = { x: -136, y: GEO.BEAM_Y - 6, w: 272, d: 12, r: 1.5 };
  out.push(S(k.slabOf(sole, 0, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(Dt([-110, -60, -10, 40, 90].map((x) => at([x + 10, GEO.BEAM_Y, 3])), { size: 0.42 }));
  return out.join("");
}

// The gantry: two posts with caps and gussets, and the beam the loader runs on.
function post(x) {
  const by = GEO.BEAM_Y;
  let out = "";
  const foot = { x: x - 7, y: by - 5.5, w: 14, d: 11, r: 1 };
  out += S(k.slabOf(foot, 3, 2, P, 2, 0.3), { tone: "mid" });
  out += Dt(k.corners(foot, 2).map(([px, py]) => at([px, py, 5])), { size: 0.42 });
  const shaft = { x: x - 4, y: by - 4, w: 8, d: 8, r: 0.8 };
  out += S(k.slabOf(shaft, 5, 73, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(shaft, 40, P, 2), { tone: "faint" }) });
  const cap = { x: x - 6, y: by - 5.5, w: 12, d: 11, r: 0.8 };
  out += S(k.slabOf(cap, 78, 2, P, 2, 0.3), { tone: "mid" });
  return out;
}
function beam() {
  const by = GEO.BEAM_Y;
  const plan = { x: -134, y: by - 4, w: 268, d: 8, r: 1 };
  let out = S(k.slabOf(plan, 80, 6, P, 2, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, 83, P, 2), { tone: "faint" }) });
  // end stops on the beam
  for (const x of [-124, 124]) {
    out += S(k.slabOf({ x: x - 1.5, y: by - 4, w: 3, d: 8, r: 0.5 }, 86, 3, P, 2, 0.3), { tone: "mid" });
  }
  out += Dt(POSTS.map((x) => at([x, by, 86])), { size: 0.42 });
  return out;
}
function pier([x0, x1]) {
  const plan = { x: x0, y: -GEO.WY, w: x1 - x0, d: GEO.WY * 2, r: 0.6 };
  const cap = { x: x0 - 1, y: -GEO.WY - 1.5, w: x1 - x0 + 2, d: GEO.WY * 2 + 3, r: 0.8 };
  return S(k.slabOf(plan, 0, GEO.TOP, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(plan, 13, P, 2), { tone: "faint" }) }) +
    S(k.slabOf(cap, GEO.TOP, 2, P, 2, 0.4), { tone: "mid" }) +
    Dt([[x0 + 3, -GEO.WY + 1.5], [x1 - 3, GEO.WY - 1.5]].map(([px, py]) => at([px, py, GEO.TOP + 2])), { size: 0.42 });
}
const STATICS = [
  ...POSTS.map((x) => ({ key: LAYER - 2e4 + k.depthOf([x, GEO.BEAM_Y, 0], P), svg: post(x) })),
  { key: LAYER - 1e4, svg: beam() },
];
const PIER_ITEMS = PIERS.map((p) => ({ key: k.depthOf([(p[0] + p[1]) / 2, 0, 0], P), svg: pier(p) }));

const START_TARGET = allocate(2, 3);
const START = {
  main: 2, each: 3, stacks: START_TARGET, drops: START_TARGET.map((n) => gateDrop(n)), states: START_TARGET.map((n) => stateOf(n)),
  lx: 0, hz: GEO.REST, carry: 0,
};
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "me-svg",
  label: "A bench model of main effort and economy of force. A wall of four sectors stands on a base plate, each sector a gate held by shear pins, with a stack of weight discs on it. Twelve discs are shared among the four gates, and an overhead loader on a gantry beam carries discs from gate to gate. Spread evenly, three discs per gate, no gate breaks. With the minimum left on three gates and the rest piled on the lit main-effort gate, its pins shear and it drops through the wall while the others stay held. Take every disc off a gate and its gate is pushed back up.",
  body: [plate(), `<g data-part="live">${scene(k, P, { ...START, statics: STATICS, piers: PIER_ITEMS })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at company scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape, shown with "slice" so the ground fills the whole card at every
// width; a phone crops the sides. PF frames the ground rect FG.VIEW of the attack frame.
const FW = 640, FH = 420;
const WF = (u, v) => { const c = Math.cos(FG.ANG * Math.PI / 180), s = Math.sin(FG.ANG * Math.PI / 180); return [FG.O[0] + u * c - v * s, FG.O[1] + u * s + v * c, 0]; };
const PF = k.fitProjection([WF(FG.VIEW.u[0], -FG.VIEW.v), WF(FG.VIEW.u[0], FG.VIEW.v), WF(FG.VIEW.u[1], -FG.VIEW.v), WF(FG.VIEW.u[1], FG.VIEW.v)], FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const POSE0 = fieldPose(START, TF);
const menSvg = (m) => (m.veh ? trVehicle(k, PF, trFaceStep(m.face)) : trSoldier(k, PF, { ...m, face: trFaceStep(m.face) }));
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${menSvg(m)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "me-field",
  label: "The same idea on a battlefield. Across the top, a red enemy line holds two-man fighting positions, two in each of four platoon sectors, with a wood at its back. Across ploughed fields in front, a blue rifle company attacks on a four-sector front from a line of departure, with a lateral road behind it. Each disc on the bench is one blue element on the ground: a rifle squad, a machine-gun team or an attached tank. The lit sector is the main effort. Weighted with most of the elements it drives through the enemy line toward the objective flag while the thinly held sectors stay in place and keep firing; spread evenly, every sector stalls in a firefight; a sector left with nothing is empty and the enemy there comes forward. Elements moved between sectors travel along the road. Greyed figures are men down on both sides. Sizes, ranges, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg me-field"', 'class="iso-svg me-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "U.S. Army doctrine defines the main effort as the unit whose mission “at a given point in time is most critical to overall mission success,” which “is usually weighted with the preponderance of combat power” (ADP 3-0, 2019). Economy of force is to “expend minimum-essential combat power on secondary efforts to allocate the maximum possible combat power on the main effort” (FM 3-0, 2022). The disc counts and break thresholds are notional.";

const LABELS = {
  machine: "Weighting bench. Left and right arrow keys move the main effort; up and down arrow keys change the discs left on each supporting gate; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys move the main effort; up and down arrow keys change the elements left in each supporting sector; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 17",
  title: "Main effort",
  hint: "Click a gate to weight it",
  readout: readoutOf(START.stacks, START.main),
  keys: [
    { mark: "lit", label: "Main effort: the gate the commander weights" },
    { mark: "raised", label: "Supporting sectors: held with the minimum" },
    { mark: "edge", label: "Discs: the force's combat power, 12 in all" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage me-stage" tabindex="0" role="group" aria-label="${LABELS.machine}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("The disc counts and break thresholds are notional.", "The element counts, break thresholds, unit sizes, ranges, timings and losses here are notional.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Main effort: the sector weighted with most elements (lit)" },
    { mark: "blue", label: "Supporting sectors: held with the minimum" },
    { mark: "red", label: "Enemy: rifle pairs in fighting positions" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="me-legend me-legend-machine">${m}</div><div class="me-legend me-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, START, STATICS, PIER_ITEMS, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, START, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, slabOf, cylinder, sideSeam, sideArc, sideRing, planOutline, insetPlan, knurl, coil, ring, corners, lineOnTop, topMatrix, topTicks, haloOf };
const root = document.querySelector(".me-figure");
const stage = root.querySelector(".me-stage");
const svg = stage.querySelector(".me-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const evenBtn = root.querySelector("#me-even");
const slider = root.querySelector("#me-each");
const eachOut = root.querySelector("#me-each-out");
const mainBtns = [...root.querySelectorAll("[data-main]")];
const fieldSvgEl = stage.querySelector(".me-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const TF = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, assign: null, pos: null };
let stageF = null, fire = null, marksSig = "";
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const hintEl = root.querySelector('.iso-plate-corner[data-corner="hint"]');
const VIEW_KEY = "maneuvers.view.v2";
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const S = { ...START, stacks: [...START.stacks], drops: [...START.drops], states: [...START.states], statics: DATA.STATICS, piers: DATA.PIER_ITEMS };
let target = allocate(S.main, S.each);
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
let job = null;          // the loader's current trip: a queue of steps
const TOUR = [[0, 2, 3], [1.2, 2, 1], [7.6, 1, 1], [11.4, 1, 3]];
const TOUR_LEN = 16.5;
function tourAt(t) {
  t %= TOUR_LEN;
  let step = TOUR[0];
  for (const row of TOUR) if (t >= row[0]) step = row;
  return step;
}
function setPlan(main, each) {
  S.main = main; S.each = each;
  target = allocate(main, each);
  mainBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === main)));
  if (document.activeElement !== slider) slider.value = String(each);
  eachOut.textContent = String(each);
}
const smooth = (u) => u * u * (3 - 2 * u);
const travelZ = (count) => Math.max(...S.stacks.map((n, i) => stackTop(S.drops[i], n))) + 4 + count * GEO.DISC;
// Build the steps of one trip: run to the donor, lower, pick, lift, run, lower, drop, lift.
function planTrip(trip) {
  const steps = [];
  const go = (key, to, speed) => steps.push({ key, to: typeof to === "function" ? to : () => to, speed });
  const act = (fn) => steps.push({ fn });
  const up = () => travelZ(trip.count);
  go("hz", up, 70);
  go("lx", GEO.X[trip.from], 150);
  go("hz", () => stackTop(S.drops[trip.from], S.stacks[trip.from]), 70);
  act(() => { S.stacks[trip.from] -= trip.count; S.carry = trip.count; });
  go("hz", up, 70);
  go("lx", GEO.X[trip.to], 150);
  go("hz", () => stackTop(S.drops[trip.to], S.stacks[trip.to]) + trip.count * GEO.DISC, 70);
  act(() => { S.stacks[trip.to] += trip.count; S.carry = 0; });
  return { steps, i: 0, t: 0, from: null, to: null, dur: 0 };
}
function stepJob(dt) {
  if (!job) {
    const trip = nextTrip(S.stacks, target);
    if (trip) job = planTrip(trip);
    else if (Math.abs(S.hz - GEO.REST) > 0.01 || Math.abs(S.lx) > 0.01) job = { steps: [{ key: "hz", to: () => GEO.REST, speed: 70 }, { key: "lx", to: () => 0, speed: 150 }], i: 0, t: 0, from: null };
    else return false;
  }
  const step = job.steps[job.i];
  if (!step) { job = null; return true; }
  if (step.fn) { step.fn(); job.i++; job.from = null; return true; }
  if (job.from === null) {
    job.from = S[step.key];
    job.goal = step.to();
    job.dur = Math.max(0.25, Math.abs(job.goal - job.from) / step.speed);
    job.t = 0;
  }
  job.t += dt;
  const u = Math.min(1, job.t / job.dur);
  S[step.key] = job.from + (job.goal - job.from) * smooth(u);
  if (u >= 1) { job.i++; job.from = null; }
  return true;
}
function finishNow() {
  S.stacks = [...target]; S.carry = 0; S.lx = 0; S.hz = GEO.REST; job = null;
}
// Battlefield frame: soldiers and tanks move by translate and re-render only when their look changes;
// the fire layer writes attributes only; the fire sectors redraw only when exposure changes.
function stepField(dt, calm) {
  FM.assign = fieldAssign(S.stacks, FM.assign);
  fieldStep(FM, fieldTargets(S, FM.assign), dt, calm);
}
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  if (!FM.pos) stepField(0, true);
  const pose = fieldPose(S, TF, FM);
  stageF.put(pose.men.map((m) => {
    const look = (m.veh ? "veh|" + trFaceStep(m.face) : trLook(m)) + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, m.veh ? trVehicle(K, PF, trFaceStep(m.face)) : trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = pose.expose.map((x) => x.toFixed(2)).join(",");
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  S.states = S.stacks.map((n) => stateOf(n));
  if (view === "field") drawField();
  else layer.innerHTML = scene(K, P, S);
  const text = readoutOf(S.stacks, S.main);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-description", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const [, main, each] = tourAt(clock);
    if (main !== S.main || each !== S.each) setPlan(main, each);
  }
  let busy = false;
  if (calm) finishNow(); else busy = stepJob(dt);
  let moving = false;
  S.stacks.forEach((n, i) => {
    const want = gateDrop(n);
    const tau = want > S.drops[i] + 4 ? 0.22 : 0.35;
    const next = calm ? want : S.drops[i] + (want - S.drops[i]) * (1 - Math.exp(-dt / tau));
    if (Math.abs(next - want) > 0.01) moving = true;
    S.drops[i] = Math.abs(next - want) < 0.01 ? want : next;
  });
  stepField(dt, calm);
  FM.t += dt;
  draw();
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (touring || busy || moving || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 12000);
  run();
};
const choose = (main, each = S.each) => { setPlan((main + 4) % 4, Math.max(0, Math.min(3, each))); hold(); };
function floorAt(event, el = svg, PP = P) {
  const pt = el.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const p = pt.matrixTransform(el.getScreenCTM().inverse());
  const a = PP.azimuth * Math.PI / 180, e = (PP.elevation ?? 30) * Math.PI / 180;
  const kk = PP.scale * Math.sqrt(1.6);
  const u = (p.x - PP.origin[0]) / kk, v = (p.y - PP.origin[1]) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
stage.addEventListener("click", (event) => {
  // Pick the sector whose gate (or, on the battlefield, whose ground) is nearest the click.
  let best = 0;
  if (view === "field") {
    const [, fv] = fieldFrameOf(...floorAt(event, fieldSvgEl, PF));
    FG.V.forEach((cv, i) => { if (Math.abs(cv - fv) < Math.abs(FG.V[best] - fv)) best = i; });
  } else {
    const [x] = floorAt({ clientX: event.clientX, clientY: event.clientY + 0 });
    GEO.X.forEach((gx, i) => { if (Math.abs(gx - x) < Math.abs(GEO.X[best] - x)) best = i; });
  }
  choose(best);
});
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") choose(S.main + 1);
  else if (event.key === "ArrowLeft") choose(S.main - 1);
  else if (event.key === "ArrowUp") choose(S.main, S.each + 1);
  else if (event.key === "ArrowDown") choose(S.main, S.each - 1);
  else if (event.key >= "1" && event.key <= "4") choose(Number(event.key) - 1);
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
mainBtns.forEach((b, i) => b.addEventListener("click", () => choose(i)));
evenBtn.addEventListener("click", () => choose(S.main, 3));
slider.addEventListener("input", () => choose(S.main, Number(slider.value)));
// Reset: back to the state the page opened in (model, loader, controls and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  Object.assign(S, START, { stacks: [...START.stacks], drops: [...START.drops], states: [...START.states] });
  job = null;
  Object.assign(FM, { t: 0, assign: null, pos: null });
  marksSig = "";
  setPlan(START.main, START.each);
  touring = !still.matches; clock = 0;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (hintEl) hintEl.textContent = view === "field" ? "Click a sector to weight it" : "Click a gate to weight it";
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
setPlan(S.main, S.each);
setView(view, false);
window.__mainEffort = { S, FM, setPlan, choose, finishNow, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const [main, each] of [[-1, 0], [2, 3], [2, 2], [2, 1], [0, 0]]) console.log(main, each, allocate(main, each).join(","), "→", summary(allocate(main, each)), "|", readoutOf(allocate(main, each), main));
console.log("wrote index.html", PAGE.length, "bytes");
