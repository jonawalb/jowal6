// Builds interactive/maneuvers/surfaces-and-gaps/index.html: an isometric feeler-gauge rig
// made with the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/surfaces-and-gaps/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, CYCLE, pose, readout, deepest, laneY } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -162, y: -74, w: 196, d: 148, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: -154, y: 54, w: 26, d: 14, r: 1.5 };
const RULER = { x: -90, y: 48, w: 70, d: 6, r: 0.8 };
const RAIL_X = [-46, 22];
const RAIL_Y = 60;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-128, -49, GEO.WALL_Z], [-120, 49, GEO.WALL_Z]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 38, elevation: 36 },
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
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[18, 4], [12, 7], [15, 10]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 4, LABEL.y + dy], [LABEL.x + 4 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.4, LABEL.y + 2.4, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8])], { size: 0.42 }));
  return out.join("");
}

// Ruler strip along the near lane: zero at the wall face, ticks every 2, major every 10.
function ruler() {
  const out = [S(k.slabOf(RULER, 0, 0.8, P, 3), { tone: "lo", crease: "none" })];
  const minor = [], major = [], zero = [];
  for (let x = RULER.x + 2; x <= RULER.x + RULER.w - 2; x += 2) {
    const off = x - MODEL.face;
    const big = off % 10 === 0;
    const d = k.lineOnTop([x, RULER.y], [x, RULER.y + (big ? 3.2 : 1.8)], 0.8, P);
    (off === 0 ? zero : big ? major : minor).push(d);
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }), L(zero.join(""), { tone: "hi" }));
  return out.join("");
}

// Two side rails for the push bar, with end stops.
function rails() {
  const out = [];
  for (const sy of [-1, 1]) {
    const y = sy * RAIL_Y;
    out.push(S(k.slabOf({ x: RAIL_X[0], y: y - 2, w: RAIL_X[1] - RAIL_X[0], d: 4, r: 1 }, 0, 2, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([-38, -8, 22].map((x) => at([x, y, 2])), { size: 0.4 }));
    for (const x of [RAIL_X[0] - 4, RAIL_X[1]]) {
      out.push(S(k.slabOf({ x, y: y - 3.5, w: 4, d: 7, r: 1 }, 0, 6, P, 3, 0.4), { tone: "mid" }));
      out.push(Dt([at([x + 2, y, 6])], { size: 0.45 }));
    }
  }
  return out.join("");
}

// Lane tags at the near end of each lane: one to five pips.
function tags() {
  const out = [];
  for (let i = 0; i < MODEL.lanes; i++) {
    const y = laneY(i);
    const plan = { x: -10, y: y - 4.5, w: 8, d: 9, r: 1 };
    out.push(S(k.slabOf(plan, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
    const pts = [];
    for (let j = 0; j <= i; j++) pts.push(at([-6, y - (i * 1.6) / 2 + j * 1.6, 0.8]));
    out.push(Dt(pts, { size: 0.42 }));
  }
  return out.join("");
}

const START_DEPTHS = MODEL.patterns[0];
const START_PLANNED = 1;
const startPose = pose(0, START_PLANNED, START_DEPTHS);
const st = (p, depths) => ({ xb: p.xb, tips: p.tips, ramY: p.ramY, ramTip: p.ramTip, depths });
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "sg-svg",
  label: "A bench model of surfaces and gaps. On the left stands a wall face of five lanes; in each lane a key is either flush with the face (a surface) or set back (a gap). Five feeler blades on spring-loaded carriages are pushed toward the face by one bar: blades that meet a surface stop, and a blade over a gap slips in. A lit ram on a saddle rides the bar. It first strikes its planned lane; when that lane is a surface it withdraws, slides across to the lane whose blade went deepest and drives through the gap. Then the keys reset, and the old gap closes.",
  body: [plate(), ruler(), rails(), tags(), `<g data-part="live">${scene(k, P, st(startPose, START_DEPTHS), MODEL)}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at platoon scale (kit/terrain.mjs) ----
// The viewBox is the card's shape, shown with "slice" so the ground fills the whole card at every
// width; a phone crops the sides. PF frames the visible ground rect (Fig 1's framing, re-centred on
// FG.VIEW, a point of the attack axis, and shrunk by its zoom).
const FW = 640, FH = 420;
const VC = [FG.O[0] + FG.VIEW.u * Math.cos(FG.ANG * Math.PI / 180), FG.O[1] + FG.VIEW.u * Math.sin(FG.ANG * Math.PI / 180)];
const PF = k.fitProjection([[54, -169], [212.5, 57.4], [-18.5, 219], [-177, -7.2]].map(([x, y]) => [VC[0] + (x - 17.75) / FG.VIEW.zoom, VC[1] + (y - 25.05) / FG.VIEW.zoom, 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const FS0 = { ...st(startPose, START_DEPTHS), p: startPose };
const POSE0 = fieldPose(FS0, MODEL, TF);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "sg-field",
  label: "The same idea on a battlefield. Across the top, a red enemy line holds five lanes: in each lane a rifle pair, or in the centre lane a machine-gun team, sits either in its forward fighting position (a surface) or pulled back to a position in depth, leaving the lane uncovered (a gap). Wire runs between the lanes in front of the line. From the line of departure in the foreground, five blue fire teams in wedges probe the five lanes together. Teams that reach a surface go to ground under fire and trade tracer fire with the position; a team in a gap slips in. The platoon's lit follow-on element, a fire team with the squad leader, platoon leader and radio operator, first strikes its planned lane; if that lane is a surface it is stopped, falls back, moves across behind the line and follows the team that went deepest through its gap, and the lit main effort shifts to that team. Then the enemy repositions and the gaps move. Men down on both sides are greyed; a medic goes to the first blue casualty, and the platoon sergeant waits at a collection point. Sizes, ranges, timings and casualty counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg sg-field"', 'class="iso-svg sg-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Marine Corps doctrine (MCDP 1, 1997) calls surfaces “hard spots—enemy strengths” and gaps “soft spots—enemy weaknesses,” and says that if the main effort “has struck a surface but another unit has located a gap,” the second unit becomes the main effort. The blades are that search; the ram is the main effort. Depths and thresholds are notional.";

const LABELS = {
  machine: "Surfaces and gaps rig. Left and right arrow keys choose the planned lane for the main effort; Enter probes the face; S shifts the face; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys choose the lane planned for the main effort; Enter sends the probe; S lets the enemy reposition; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 20",
  title: "Surfaces and gaps",
  hint: "Hover a lane · click to probe",
  readout: "",
  keys: [
    { mark: "lit", label: "Main effort: the ram on its saddle" },
    { mark: "raised", label: "Feeler blades: stop on a surface, slip into a gap" },
    { mark: "edge", label: "Wall face: keys flush (surfaces) or set back (gaps)" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage sg-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="1" aria-valuemax="5" aria-valuenow="${START_PLANNED + 1}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("The blades are that search; the ram is the main effort. Depths and thresholds are notional.", "The probing fire teams are that search; the lit element is the main effort. Unit sizes, ranges, timings and casualty counts are notional.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Main effort: the lead team and the follow-on element (lit)" },
    { mark: "blue", label: "Friendly: fire teams probing five lanes" },
    { mark: "red", label: "Enemy: a pair or MG team per lane, forward or in depth" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="sg-legend sg-legend-machine">${m}</div><div class="sg-legend sg-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, MODEL, START_PLANNED, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, START_PLANNED, LABELS } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf };
const root = document.querySelector(".sg-figure");
const stage = root.querySelector(".sg-stage");
const svg = stage.querySelector(".sg-svg");
const fieldSvgEl = stage.querySelector(".sg-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const TF = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, vbar: 0, vd: [0, 0, 0, 0, 0], vr: 0, vv: 0, med: undefined };
let stageF = null, fire = null, marksSig = "", prevF = null;
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const layer = svg.querySelector('[data-part="live"]');
const readoutEl = root.querySelector("[data-readout]");
const probeBtn = root.querySelector("#sg-probe");
const shuffleBtn = root.querySelector("#sg-shuffle");
const slider = root.querySelector("#sg-lane");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const SHUF = startOf("shuffle"), HOME = startOf("home"), HOLD = startOf("hold");
// mode: "tour" loops the whole cycle; "probe" plays it once to rest; "shuffle" plays the shuffle; "rest" holds.
const st = { mode: still.matches ? "rest" : "tour", t: 0, planned: START_PLANNED, pat: 0, next: 1 };
const shown = { xb: MODEL.barHome, tips: null, ramY: laneY(START_PLANNED), ramTip: MODEL.barHome - MODEL.ramOff, depths: MODEL.patterns[0].slice() };
shown.tips = shown.depths.map((d) => Math.max(shown.xb - MODEL.bladeOff, MODEL.face - d));
let last = 0, frame = 0, visible = false, idle = 0;
function target() {
  const a = MODEL.patterns[st.pat], b = MODEL.patterns[st.next];
  if (st.mode === "rest") { const p = pose(0, st.planned, a); return { p, depths: a }; }
  if (st.t >= SHUF) { const u = (st.t - SHUF) / (CYCLE - SHUF); const d = mixDepths(a, b, u); return { p: pose(st.t, st.planned, a), depths: d }; }
  return { p: pose(st.t, st.planned, a), depths: a };
}
function endCycle(p) {
  st.planned = p.deep;
  if (st.mode === "tour" || st.mode === "shuffle") { st.pat = st.next; st.next = (st.next + 1) % MODEL.patterns.length; }
}
// Battlefield frame: soldiers move by translate and re-render only when their look changes; the
// fire layer writes attributes only; the fire sector redraws only when the machine gun moves.
function drawField(p, dt) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const S = { ...shown, p };
  const pose = fieldPose(S, MODEL, TF, FM);
  const lanePos = (MODEL.lanes - 1) / 2 - shown.ramY / MODEL.pitch;
  const now = { xb: shown.xb, d: shown.depths.slice(), ur: fieldRamU(MODEL.face - shown.ramTip), vr: fieldLaneV(lanePos) };
  if (prevF && dt > 0) {
    const sm = (a, b) => a + (b - a) * 0.35;
    FM.vbar = sm(FM.vbar, (now.xb - prevF.xb) / dt);
    FM.vd = FM.vd.map((v, i) => sm(v, (now.d[i] - prevF.d[i]) / dt));
    FM.vr = sm(FM.vr, (now.ur - prevF.ur) / dt);
    FM.vv = sm(FM.vv, (now.vr - prevF.vr) / dt);
  }
  prevF = now;
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  // the medic walks toward the man he is wanted by; fieldPose says where (first man down, else the CCP)
  const want = pose.medWant;
  FM.med = still.matches ? want.slice() : fieldChase(FM.med, want, dt, 16);
  const mg = pose.men.find((m) => m.id === "e" + FG.MG_LANE + "-0");
  const sig = mg.pose + "|" + mg.side + "|" + mg.x.toFixed(1) + "|" + mg.y.toFixed(1);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw(p, depths, dt = 0) {
  if (view === "field") drawField(p, dt);
  else layer.innerHTML = scene(K, P, shown, MODEL);
  const text = readout(p, depths);
  if (readoutEl.textContent !== text) readoutEl.textContent = text;
  stage.setAttribute("aria-valuenow", String(st.planned + 1));
  stage.setAttribute("aria-valuetext", text);
  if (document.activeElement !== slider) slider.value = String(st.planned + 1);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (st.mode !== "rest" && !calm) {
    st.t += dt;
    const stop = st.mode === "probe" ? SHUF : CYCLE;
    if (st.t >= stop) {
      const p = pose(Math.min(st.t, CYCLE - 1e-6), st.planned, MODEL.patterns[st.pat]);
      endCycle(p);
      if (st.mode === "tour") st.t -= CYCLE; else { st.mode = "rest"; st.t = 0; }
    }
  }
  const { p, depths } = target();
  const f = (x, to, tau = 0.12) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  shown.xb = f(shown.xb, p.xb);
  shown.ramY = f(shown.ramY, p.ramY, st.mode === "rest" ? 0.25 : 0.12);
  shown.ramTip = f(shown.ramTip - shown.xb, p.ramTip - p.xb) + shown.xb;
  shown.depths = shown.depths.map((d, i) => f(d, depths[i]));
  // blades: free tip rides the bar, stops on its key face
  shown.tips = shown.depths.map((d) => Math.max(shown.xb - MODEL.bladeOff, MODEL.face - d));
  shown.ramTip = Math.max(shown.ramTip, MODEL.face - shown.depths[clamp(Math.round(2 - shown.ramY / MODEL.pitch), 0, 4)]);
  FM.t += dt;
  draw(p, depths, dt);
  const settled = st.mode === "rest" && Math.abs(shown.xb - p.xb) < 0.01 && Math.abs(shown.ramY - p.ramY) < 0.01 &&
    Math.abs(shown.ramTip - p.ramTip) < 0.01 && shown.depths.every((d, i) => Math.abs(d - depths[i]) < 0.01);
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
function hold() {
  clearTimeout(idle);
  idle = setTimeout(() => { if (!still.matches && st.mode === "rest") { st.mode = "tour"; st.t = 0; run(); } }, 9000);
  run();
}
function settleNow() { if (st.mode === "tour" || st.mode === "probe") { if (st.t >= HOME) endCycle(pose(st.t, st.planned, MODEL.patterns[st.pat])); } st.mode = "rest"; st.t = 0; }
function plan(i) {
  i = clamp(i, 0, MODEL.lanes - 1);
  if (st.mode === "rest" && i === st.planned) return;
  settleNow();
  st.planned = i;
  hold();
}
function probe() {
  settleNow();
  if (still.matches) { st.mode = "probe"; st.t = HOLD; } else { st.mode = "probe"; st.t = 0; }
  hold();
}
function shuffle() {
  settleNow();
  if (still.matches) { st.pat = st.next; st.next = (st.next + 1) % MODEL.patterns.length; }
  else { st.mode = "shuffle"; st.t = SHUF; }
  hold();
}
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  prevF = null;
  const { p, depths } = target();
  draw(p, depths);
  run();
}
function floorAt(event) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const P = view === "field" ? PF : DATA.P;
  const q = pt.matrixTransform((view === "field" ? fieldSvgEl : svg).getScreenCTM().inverse());
  const a = P.azimuth * Math.PI / 180, e = (P.elevation ?? 30) * Math.PI / 180;
  const kk = P.scale * Math.sqrt(1.6);
  const u = (q.x - P.origin[0]) / kk, v = (q.y - P.origin[1]) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch" || st.mode === "probe" || st.mode === "shuffle") return;
  const [x, y] = floorAt(event);
  if (view === "field") {
    const [u, v] = fieldUV(x, y);
    if (u < -110 || u > 70 || Math.abs(v) > FG.PITCH * 2.5) return;
    plan(Math.floor(v / FG.PITCH + MODEL.lanes / 2));
    return;
  }
  if (x < -125 || x > 30 || Math.abs(y) > MODEL.pitch * 2.5) return;
  plan(MODEL.lanes - 1 - Math.floor(y / MODEL.pitch + MODEL.lanes / 2));
});
stage.addEventListener("click", probe);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") plan(st.planned - 1);
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") plan(st.planned + 1);
  else if (event.key === "Enter" || event.key === " " || event.key === "p" || event.key === "P") probe();
  else if (event.key === "s" || event.key === "S") shuffle();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
probeBtn.addEventListener("click", probe);
shuffleBtn.addEventListener("click", shuffle);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => plan(Number(slider.value) - 1));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { st.mode = "probe"; st.t = HOLD; }
setView(view, false);
window.__surfacesAndGaps = { st, shown, probe, shuffle, plan, setView, view: () => view, stop: () => { clearTimeout(idle); settleNow(); run(); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
MODEL.patterns.forEach((d, i) => console.log(`face ${i + 1} [${d}] → deepest lane ${deepest(d, 1) + 1}`));
for (const t of [0, 3.5, 4.4, 6, 8, 10.5, 12.5]) console.log(t, readout(pose(t, START_PLANNED, START_DEPTHS), START_DEPTHS));
console.log("cycle", CYCLE, "s · wrote index.html", PAGE.length, "bytes");
