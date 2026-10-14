// Page runtime (inlined by build.mjs after the kit, model, scene and field scene).
const { P, PF, LABELS, V0 } = DATA;
const M_ = DATA.MODEL;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks, wireSvg };
const root = document.querySelector(".rs-figure");
const stage = root.querySelector(".rs-stage");
const svg = stage.querySelector(".rs-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const goBtn = root.querySelector("#rs-go");
const opBtn = root.querySelector("#rs-op");
const modeBtns = root.querySelectorAll(".rs-modes [data-mode]");
const fieldSvgEl = stage.querySelector(".rs-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const T = fieldTerrain();
const LOOKS = new Map();
const still = matchMedia("(prefers-reduced-motion: reduce)");
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}

let s = fresh("R", true);
const V = JSON.parse(JSON.stringify(V0));
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "";
let paused = false, touring = !still.matches, tourI = 0, tourWait = 0, last = 0, frame = 0, visible = false, idle = 0;
const TOUR = [["R", true], ["F", true], ["R", false]];

// ---- controls ----
function setSetup(mode, op) {
  s = fresh(mode, op);
  modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  opBtn.setAttribute("aria-pressed", String(op));
  opBtn.textContent = op ? "Observation post: manned" : "Observation post: none";
  syncGo();
}
const setMode = (mode) => setSetup(mode, s.op);
const toggleOp = () => setSetup(s.mode, !s.op);
function syncGo() {
  const running = s.phase === "battle";
  goBtn.textContent = running ? "Restart" : s.phase === "done" ? "Attack again" : "Attack";
}
function finishCalm() { if (still.matches) { let n = 0; while (s.phase !== "done" && n++ < 20000) step(s, 1 / 60, M_); } }
function attackNow() {
  if (s.phase !== "ready") s = fresh(s.mode, s.op);
  advance(s);
  finishCalm();
  syncGo();
}

// ---- machine state from the model state ----
function drawMachine() {
  V.hit = null;
  if (!sees(V.xe, M_.eyeE, V.dx, M_.eyeD, M_)) {
    // the sight line ends on the first slat of the ground that stands in its way
    const za = ground(V.xe, M_) + M_.eyeE, zb = ground(V.dx, M_) + M_.eyeD, dir = Math.sign(V.dx - V.xe) || 1;
    for (let x = V.xe; dir > 0 ? x <= V.dx : x >= V.dx; x += 0.5 * dir) {
      const t = (x - V.xe) / (V.dx - V.xe || 1);
      if (ground(x, M_) > za + (zb - za) * t + 1e-9) { V.hit = [x]; break; }
    }
  }
  V.see = sees(V.xe, M_.eyeE, V.dx, M_.eyeD, M_) ? 1 : 0;
  layer.innerHTML = scene(K, P, V, (x) => ground(x, M_), M_);
}
// ---- drawing ----
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(s, T);
  stageF.put(pose.men.map((m) => {
    const spec = { ...m, face: trFaceStep(m.face) }, look = trLook(spec);
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, spec)); return LOOKS.get(look); } };
  }));
  const sig = `${s.mode}`;
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, s); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function readoutText() {
  const word = s.mode === "R" ? "Reverse slope" : "Forward slope";
  if (s.phase === "ready") return `${word} · ${s.op ? "OP manned" : "no OP"} · ready`;
  const seen = sees(s.x, M_.eyeE, pos(s, M_), M_.eyeD, M_) ? "seen" : "masked";
  return `${word} · ${seen} · ${bluesDown(s, M_)} vs ${redDown(s, M_)} down`;
}
function draw() {
  if (view === "field") drawField();
  else drawMachine();
  const text = readoutText();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}

// ---- tour: reverse slope with an OP, forward slope, reverse slope with no OP ----
function tourTick(dt) {
  if (s.phase === "ready") { const [m, o] = TOUR[tourI]; if (s.mode !== m || s.op !== o) setSetup(m, o); attackNow(); }
  else if (s.phase === "done") {
    tourWait += dt;
    if (tourWait > 1.6) { tourWait = 0; tourI = (tourI + 1) % TOUR.length; setSetup(...TOUR[tourI]); }
  }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) tourTick(dt);
  const was = s.phase;
  if (!paused) step(s, dt * M_.speed, M_);
  if (was !== s.phase) syncGo();
  FM.t += dt;
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  V.xe = s.x;
  V.dx = ease(V.dx, pos(s, M_), 0.18);
  V.fE = s.phase === "battle" && s.fireE ? 1 : 0;
  V.fB = s.phase === "battle" && s.fireB ? 1 : 0;
  V.op = ease(V.op, s.op ? 1 : 0, 0.12);
  V.blue = ease(V.blue, bluesDown(s, M_) / M_.B0, 0.15);
  V.red = ease(V.red, redDown(s, M_) / M_.R0, 0.15);
  V.sel = ease(V.sel, s.mode === "R" ? 1 : 0, 0.12);
  draw();
  const settled = !touring && (s.phase === "ready" || s.phase === "done") && Math.abs(V.dx - pos(s, M_)) < 0.05 && Math.abs(V.op - (s.op ? 1 : 0)) < 0.01 &&
    Math.abs(V.blue - bluesDown(s, M_) / M_.B0) < 0.002 && Math.abs(V.red - redDown(s, M_) / M_.R0) < 0.002 && Math.abs(V.sel - (s.mode === "R" ? 1 : 0)) < 0.005;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tourI = 0; tourWait = 0; setSetup("R", true); run(); }, 12000);
  run();
};
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = "Click to attack · 1 2 slope";
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
stage.addEventListener("click", () => { attackNow(); hold(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === "1") { setMode("F"); hold(); }
  else if (event.key === "2") { setMode("R"); hold(); }
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") { setMode("R"); hold(); }
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") { setMode("F"); hold(); }
  else if (event.key === "o" || event.key === "O") { toggleOp(); hold(); }
  else if (event.key === "a" || event.key === "A" || event.key === " " || event.key === "Enter") { attackNow(); hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
goBtn.addEventListener("click", () => { attackNow(); hold(); });
opBtn.addEventListener("click", () => { toggleOp(); hold(); });
modeBtns.forEach((b) => b.addEventListener("click", () => { setMode(b.dataset.mode); hold(); }));
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
// Reset: back to the state the page opened in (slope, OP, bench, battlefield and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  Object.assign(V, JSON.parse(JSON.stringify(V0)));
  FM.t = 0;
  touring = !still.matches; tourI = 0; tourWait = 0;
  setSetup("R", true);
  marksSig = "";
  draw(); run();
}
resetBtn.addEventListener("click", reset);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setSetup("R", true);
setView(view, false);
window.__reverseSlope = {
  get s() { return s; }, V, FM, setMode, setSetup, attack: attackNow, setView, reset, view: () => view,
  stop: () => { touring = false; clearTimeout(idle); },
  pause: (on = true) => { paused = on; },
  advance: (sec) => { if (s.phase === "ready") advance(s); for (let t = 0; t < sec - 1e-9; t += 1 / 60) step(s, 1 / 60, M_); syncGo(); run(); },
  snapshot: () => JSON.stringify({ s, V: { xe: +V.xe.toFixed(2), dx: +V.dx.toFixed(2), op: +V.op.toFixed(2), blue: +V.blue.toFixed(3), red: +V.red.toFixed(3), sel: +V.sel.toFixed(3) }, FM: { t: FM.t }, touring, tourI, view, readout: readout.textContent, btn: goBtn.textContent, modes: [...modeBtns].map((b) => b.getAttribute("aria-pressed")).join(), op: opBtn.getAttribute("aria-pressed") }),
};
window.__reverseSlope.initial = window.__reverseSlope.snapshot();
