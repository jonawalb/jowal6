// Builds interactive/maneuvers/lanchester/index.html: an isometric "square-law balance" made with the
// Anatomy kit (../../kit, MIT), plus its Battlefield view. Run: node interactive/maneuvers/lanchester/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, stateAt, alive, casualties, riderDist, tilt, readoutOf, outcome } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;
const PLATE = { x: -142, y: -50, w: 284, d: 100, r: 9 };
const PLATE_H = 10;
const FOOT_H = 5;
const LABEL = { x: -132, y: -42, w: 30, d: 17, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-110, 0, GEO.PIV + 20], [110, 0, GEO.PIV + 20], [0, 0, GEO.PIV + 12]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 78 },
);
const at = (p) => k.iso(p, P);
const S_ = (paths, style) => k.solidSvg(paths, style);
const L_ = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S_(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S_(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S_(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L_(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L_(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L_(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // label plate with three rule lines standing for print
  out.push(S_(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L_(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[21, 5], [15, 8.6], [18, 12.2]].forEach(([len, dy]) => out.push(L_(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  // a ruler strip along the front edge, one tick per man of beam travel
  const strip = { x: -112, y: PLATE.y + PLATE.d - 9, w: 224, d: 5, r: 1 };
  out.push(S_(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4.5, 5, strip.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L_(t.minor, { tone: "lo" }), L_(t.major, { tone: "mid" }));
  return out.join("");
}

// The bench state the scene draws, from the model state at step t.
function bench(law, plan, t) {
  const st = stateAt(law, plan, t);
  const c = casualties(st);
  const bOn = plan === "both" ? 1 : st.shift;
  const rEng = st.rA + st.rB * bOn;
  return {
    law, phi: tilt(law, st.b, rEng), db: riderDist(law, st.b), dr: riderDist(law, rEng),
    nb: alive(st.b), nA: alive(st.rA), nB: alive(st.rB), bOn, downB: c.blue, downR: c.red, f: Math.min(1, t / MODEL.maxStep),
  };
}

const START = { law: "square", plan: "detail", t: 0 };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "lc-svg",
  label: "A bench balance for Lanchester's square law. A lit beam pivots on a pillar. Blue discs, one per man, hang in a pan from a rider on the left arm; red discs in two groups hang from a rider on the right arm, and red's second group can wait on a shelf behind the beam, out of the fight. Under the square law each rider sits out along the beam in proportion to the discs it carries, so its turning force goes with the square of the count. Stepping through the battle removes discs from both pans into trays at the front, and a dial counts the steps. The beam barely moves while discs come off, because the difference of the squares stays the same. A knob switches to the linear law, where the riders lock at one mark.",
  body: [plate(), `<g data-part="live">${scene(k, P, bench(START.law, START.plan, START.t))}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain (kit/terrain.mjs) ----
const FW = 640, FH = 420;
const VC = [FG.O[0] + FG.VIEW.u * Math.cos(FG.ANG * Math.PI / 180), FG.O[1] + FG.VIEW.u * Math.sin(FG.ANG * Math.PI / 180)];
const PF = k.fitProjection([[54, -169], [212.5, 57.4], [-18.5, 219], [-177, -7.2]].map(([x, y]) => [VC[0] + (x - 17.75) / FG.VIEW.zoom, VC[1] + (y - 25.05) / FG.VIEW.zoom, 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const POSE0 = fieldPose(START, TF);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "lc-field",
  label: "The same idea on a battlefield. In open pasture, sixteen lit blue riflemen lie prone facing twenty red riflemen in two groups of ten, with a wood between the red groups so neither can fire across to help the other. Concentrating, blue fights the left group alone from a firing line screened from the right group by the wood, then moves round behind the wood and fights the right group. Fighting both at once, blue lies in front of the wood under fire from both groups. Tracers run between the lines; greyed figures lying still are men down on both sides, with a medic at a blue collection point. Under the linear law the fire goes into smoke over the enemy's ground. Sizes, distances and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg lc-field"', 'class="iso-svg lc-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Lanchester (1916): under aimed fire “the number of men knocked out per unit time will be directly proportional to the numerical strength of the opposing force,” so fighting strength goes with the square of numbers. The force sizes, rates and casualty counts are notional; the law’s fit to real battles is contested.";
const LABELS = {
  machine: "Square-law balance. Left and right arrow keys step the battle back and forward; C switches between concentrating on one red group and fighting both; L switches the law; Space plays; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys step the battle back and forward; C switches between concentrating on one red group and fighting both; L switches the law; Space plays; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 35",
  title: "Square law",
  hint: "Hover to step · click: plan",
  readout: "",
  keys: [
    { mark: "lit", label: "The beam: it tips toward the stronger side" },
    { mark: "blue", label: "Blue discs: one per man; red discs in two groups" },
    { mark: "raised", label: "Riders: slide out one mark per man (square law)" },
    { mark: "edge", label: "Trays and dial: men down and steps fought" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage lc-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="${MODEL.maxStep}" aria-valuenow="0">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = "Lanchester (1916): under aimed fire “the number of men knocked out per unit time will be directly proportional to the numerical strength of the opposing force.” Concentrating on one red group at a time, blue wins a fight it loses when it takes both at once. Unit sizes, ranges, timings and casualty counts are notional.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Blue: sixteen riflemen, one line (lit)" },
    { mark: "red", label: "Red: twenty riflemen in two groups of ten" },
    { mark: "dim", label: "Greyed and still: men down, both sides" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="lc-legend lc-legend-machine">${m}</div><div class="lc-legend lc-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, START, LABELS } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, sideRing, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, sideTicks, radialTicks, haloOf };
function bench(law, plan, t) {
  const st = stateAt(law, plan, t);
  const c = casualties(st);
  const bOn = plan === "both" ? 1 : st.shift;
  const rEng = st.rA + st.rB * bOn;
  return { law, phi: tilt(law, st.b, rEng), db: riderDist(law, st.b), dr: riderDist(law, rEng),
    nb: alive(st.b), nA: alive(st.rA), nB: alive(st.rB), bOn, downB: c.blue, downR: c.red, f: Math.min(1, t / MODEL.maxStep) };
}
const root = document.querySelector(".lc-figure");
const stage = root.querySelector(".lc-stage");
const svg = stage.querySelector(".lc-svg");
const layer = svg.querySelector('[data-part="live"]');
// Machine view: keep the nodes of every painter item whose markup did not change since the last
// frame, parse only the items that did, and restore painter's order with the fewest moves.
let livePool = new Map();
const liveTpl = document.createElementNS("http://www.w3.org/2000/svg", "g");
function patchLive(el, items) {
  const pool = new Map(), order = [];
  for (const { svg } of items) {
    const old = livePool.get(svg);
    let nodes = old && old.pop();
    if (!nodes) { liveTpl.innerHTML = svg; nodes = [...liveTpl.childNodes]; }
    const list = pool.get(svg);
    if (list) list.push(nodes); else pool.set(svg, [nodes]);
    for (const n of nodes) order.push(n);
  }
  livePool = pool;
  let ref = el.firstChild;
  for (const n of order) { if (n === ref) ref = ref.nextSibling; else el.insertBefore(n, ref); }
  while (ref) { const next = ref.nextSibling; ref.remove(); ref = next; }
}
const readout = root.querySelector("[data-readout]");
const planBtn = root.querySelector("#lc-plan");
const lawBtn = root.querySelector("#lc-law");
const playBtn = root.querySelector("#lc-play");
const slider = root.querySelector("#lc-step");
const fieldSvgEl = stage.querySelector(".lc-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, pb: undefined };
let stageF = null, fire = null, marksSig = "";
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Hover to step · click: plan", field: "Hover to step · click: plan" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { law: START.law, plan: START.plan, t: 0, target: 0, playing: false, phi: 0, db: 0, dr: 0 };
{ const b0 = bench(S.law, S.plan, 0); S.phi = b0.phi; S.db = b0.db; S.dr = b0.dr; }
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0, lastSig = "";
// The tour: [law, plan, steps per second]; each leg plays a battle to its end, then holds 1 s.
const TOUR = [["square", "detail", 8], ["square", "both", 8], ["linear", "detail", 10]];
const endOf = (law, plan) => Math.ceil(battle(law, plan).tEnd ?? MODEL.maxStep);
const legLen = (leg) => endOf(leg[0], leg[1]) / leg[2] + 1.2;
const TOUR_LEN = TOUR.reduce((s, leg) => s + legLen(leg), 0);
function tourAt(c) {
  c %= TOUR_LEN;
  for (const leg of TOUR) { const n = legLen(leg); if (c < n) return { law: leg[0], plan: leg[1], t: Math.min(endOf(leg[0], leg[1]), c * leg[2]) }; c -= n; }
  return { law: "square", plan: "detail", t: 0 };
}
function setScenario(law, plan, reset) {
  const changed = law !== S.law || plan !== S.plan;
  S.law = law; S.plan = plan;
  lawBtn.textContent = law === "square" ? "Square law (aimed fire)" : "Linear law (area fire)";
  lawBtn.setAttribute("aria-pressed", String(law === "square"));
  planBtn.textContent = plan === "detail" ? "Concentrating on one group" : "Fighting both at once";
  planBtn.setAttribute("aria-pressed", String(plan === "detail"));
  if (changed && reset) { S.t = 0; S.target = 0; }
}
function setPlaying(on) { S.playing = on; playBtn.textContent = on ? "Pause" : "Play"; playBtn.setAttribute("aria-pressed", String(on)); }
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose({ law: S.law, plan: S.plan, t: S.t }, T, FM);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + "|" + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = [pose.engA, pose.engB, pose.over, pose.L.moving, Math.round(pose.L.c[0]), Math.round(pose.L.c[1]), pose.men.filter((m) => m.side === "f").length].join("|");
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  if (view === "field") drawField();
  else {
    const b = bench(S.law, S.plan, S.t);
    const sc = { ...b, phi: S.phi, db: S.db, dr: S.dr };
    const sig = [sc.phi.toFixed(3), sc.db.toFixed(2), sc.dr.toFixed(2), sc.nb, sc.nA, sc.nB, sc.bOn.toFixed(3), sc.downB, sc.downR, sc.f.toFixed(3), sc.law].join("|");
    if (sig !== lastSig) { patchLive(layer, scene(K, P, { ...sc, items: true })); lastSig = sig; }
  }
  const text = readoutOf(S.law, S.plan, S.t);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(S.t)));
  stage.setAttribute("aria-valuetext", text);
  if (document.activeElement !== slider) slider.value = String(Math.round(S.target));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const w = tourAt(clock);
    setScenario(w.law, w.plan, false);
    if (w.t < S.t - 0.5) S.t = w.t;
    S.target = w.t;
  } else if (S.playing) {
    S.target = Math.min(endOf(S.law, S.plan), S.target + 8 * dt);
    if (S.target >= endOf(S.law, S.plan)) setPlaying(false);
  }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  S.t = touring ? S.target : ease(S.t, S.target, 0.18);
  if (Math.abs(S.t - S.target) < 0.002) S.t = S.target;
  const b = bench(S.law, S.plan, S.t);
  S.phi = ease(S.phi, b.phi, 0.3); S.db = ease(S.db, b.db, 0.25); S.dr = ease(S.dr, b.dr, 0.25);
  const pbWant = S.plan === "both" ? 1 : 0;
  FM.pb = FM.pb === undefined || calm ? pbWant : FM.pb + Math.sign(pbWant - FM.pb) * Math.min(Math.abs(pbWant - FM.pb), 0.5 * dt);
  FM.t += dt;
  draw();
  const settled = !touring && !S.playing && S.t === S.target && Math.abs(S.phi - b.phi) < 0.002 && Math.abs(S.db - b.db) < 0.01 && Math.abs(S.dr - b.dr) < 0.01 && FM.pb === pbWant;
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; setPlaying(false); run(); }, 9000);
  run();
};
const stepTo = (n) => { setPlaying(false); S.target = clamp(n, 0, MODEL.maxStep); hold(); };
const togglePlan = () => { setPlaying(false); setScenario(S.law, S.plan === "detail" ? "both" : "detail", true); hold(); };
const toggleLaw = () => { setPlaying(false); setScenario(S.law === "square" ? "linear" : "square", S.plan, true); hold(); };
const play = () => { if (S.playing) setPlaying(false); else { if (S.target >= endOf(S.law, S.plan)) { S.t = 0; S.target = 0; } setPlaying(true); } hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  lastSig = "";
  draw();
  run();
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const r = stage.getBoundingClientRect();
  const f = clamp((event.clientX - r.left - r.width * 0.1) / (r.width * 0.8), 0, 1);
  setPlaying(false);
  S.target = Math.round(f * endOf(S.law, S.plan));
  hold();
});
stage.addEventListener("click", togglePlan);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") stepTo(Math.round(S.target) + 1);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") stepTo(Math.round(S.target) - 1);
  else if (event.key === "c" || event.key === "C" || event.key === "Enter") togglePlan();
  else if (event.key === "l" || event.key === "L") toggleLaw();
  else if (event.key === " ") play();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
planBtn.addEventListener("click", togglePlan);
lawBtn.addEventListener("click", toggleLaw);
playBtn.addEventListener("click", play);
// Reset: back to the state the page opened in (law, plan, step, playback and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  setPlaying(false);
  setScenario(START.law, START.plan, false);
  S.t = 0; S.target = 0;
  { const b0 = bench(S.law, S.plan, 0); S.phi = b0.phi; S.db = b0.db; S.dr = b0.dr; }
  FM.t = 0; FM.pb = undefined;
  lastSig = ""; marksSig = "";
  slider.value = "0";
  touring = !still.matches; clock = 0;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => stepTo(Number(slider.value)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setScenario(S.law, S.plan, false);
setView(view, false);
window.__lanchester = { S, setScenario: (law, plan) => { setScenario(law, plan, true); hold(); }, stepTo, setView, reset, view: () => view, stop: () => { touring = false; setPlaying(false); clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const law of ["square", "linear"]) for (const plan of ["detail", "both"]) console.log(law, plan, readoutOf(law, plan, MODEL.maxStep), JSON.stringify(outcome(law, plan).down));
console.log("men on the field:", POSE0.men.length, "wrote index.html", PAGE.length, "bytes");
