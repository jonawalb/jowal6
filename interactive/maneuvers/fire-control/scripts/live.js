// Page runtime (inlined by build.mjs after the kit, model, scene and field scene).
const { P, PF, LABELS, V0 } = DATA;
const M_ = DATA.MODEL;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks };
const root = document.querySelector(".fc-figure");
const stage = root.querySelector(".fc-stage");
const svg = stage.querySelector(".fc-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const engageBtn = root.querySelector("#fc-engage");
const modeBtns = root.querySelectorAll(".fc-modes [data-mode]");
const fieldSvgEl = stage.querySelector(".fc-field");
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

let s = fresh("U");
const V = JSON.parse(JSON.stringify(V0));
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "";
let paused = false, touring = !still.matches, tourI = 0, tourWait = 0, last = 0, frame = 0, visible = false, idle = 0;
const TOUR = ["U", "C"];

// ---- controls ----
function setMode(mode) {
  s = fresh(mode);
  modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  syncEngage();
}
function syncEngage() {
  const running = s.phase === "prep" || s.phase === "start" || s.phase === "battle";
  engageBtn.textContent = running ? "Restart" : s.phase === "done" ? "Engage again" : "Engage";
}
function finishCalm() { if (still.matches) { let n = 0; while (s.phase !== "done" && n++ < 20000) step(s, 1 / 60, M_); } }
function engageNow() {
  if (s.phase !== "ready") s = fresh(s.mode);
  engage(s);
  finishCalm();
  syncEngage();
}

// ---- machine targets from the state ----
function wants() {
  const G = GEO, out = { nx: [], jet: [], jw: [], hT: [], spill: Array(5).fill(0), lamp: [], on: [] };
  const live = s.phase === "battle" || s.phase === "done";
  const grp = Array.from({ length: 5 }, () => []);
  s.team.forEach((T0, k) => { if (live && T0.tgt >= 0) grp[T0.tgt].push(k); });
  for (let k = 0; k < 6; k++) {
    const tgt = live ? s.team[k].tgt : -1;
    if (tgt < 0) { out.nx.push(G.HOME[k]); out.jet.push(0); out.jw.push(0); continue; }
    const g = grp[tgt], j = g.indexOf(k);
    out.nx.push(G.TX[tgt] + (j - (g.length - 1) / 2) * 2.6);
    const stale = !alive(s, tgt) || s.team[k].stale > 0;
    out.jet.push(s.phase === "battle" ? 1 : 0);
    out.jw.push(stale || j >= M_.cap ? 1 : 0);
  }
  for (let i = 0; i < 5; i++) {
    out.hT.push(G.H0 - (G.H0 - G.H1) * hitShare(s, i, M_));
    out.lamp.push(alive(s, i) ? 1 : 0);
  }
  return out;
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
  const sig = `${s.mode}${s.stage}`;
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, s); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function readoutText() {
  if (s.phase === "prep") { const cur = Math.max(1, Math.min(3, s.stage)); return `Step ${cur}: ${STEP_SHORT[cur - 1].toLowerCase()}`; }
  const word = s.phase === "ready" ? "Ready" : s.mode === "C" ? "Controlled" : "Uncontrolled";
  if (view === "field") return `${word} · ${firing(s)} of 5 firing · ${bluesDown(s, M_)} vs ${redDown(s)} down`;
  return `${word} · ${firing(s)} of 5 firing · ${wastedPct(s)}% wasted`;
}
function draw() {
  if (view === "field") drawField();
  else layer.innerHTML = scene(K, P, V);
  const text = readoutText();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}

// ---- tour: uncontrolled, then controlled ----
function tourTick(dt) {
  if (s.phase === "ready") { if (s.mode !== TOUR[tourI]) setMode(TOUR[tourI]); engageNow(); }
  else if (s.phase === "done") {
    tourWait += dt;
    if (tourWait > 1.4) { tourWait = 0; tourI = (tourI + 1) % TOUR.length; setMode(TOUR[tourI]); }
  }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) tourTick(dt);
  const was = s.phase;
  if (!paused) step(s, dt * M_.speed, M_);
  if (was !== s.phase) syncEngage();
  FM.t += dt;
  const W = wants(), ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  let moving = false;
  for (let k = 0; k < 6; k++) {
    V.nx[k] = ease(V.nx[k], W.nx[k], 0.16);
    if (Math.abs(V.nx[k] - W.nx[k]) > 0.02) moving = true;
    const arrived = Math.abs(V.nx[k] - W.nx[k]) < 1.2;
    V.jet[k] = ease(V.jet[k], W.jet[k] && arrived ? 1 : 0, 0.06);
    V.jw[k] = W.jw[k];
  }
  V.spill.fill(0);
  for (let k = 0; k < 6; k++) if (V.jw[k] && V.jet[k] > 0.5) { const i = GEO.TX.findIndex((tx) => Math.abs(V.nx[k] - tx) <= 8.6); if (i >= 0) V.spill[i]++; }
  for (let i = 0; i < 5; i++) {
    V.hT[i] = ease(V.hT[i], W.hT[i], 0.1);
    V.lamp[i] = W.lamp[i];
  }
  V.steps = s.mode === "C" ? s.stage : 0;
  V.waste = ease(V.waste, wastedPct(s) / 100, 0.15);
  V.sel = ease(V.sel, s.mode === "C" ? 1 : 0, 0.12);
  draw();
  const settled = !touring && (s.phase === "ready" || s.phase === "done") && !moving && V.jet.every((j) => j < 0.01) &&
    V.hT.every((h, i) => Math.abs(h - W.hT[i]) < 0.01) && Math.abs(V.waste - wastedPct(s) / 100) < 0.002 && Math.abs(V.sel - (s.mode === "C" ? 1 : 0)) < 0.005;
  // the battlefield keeps its tracers going while on screen and an engagement runs; both views stop once settled
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tourI = 0; tourWait = 0; setMode("U"); run(); }, 12000);
  run();
};
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = view === "field" ? "Click to attack · 1 2 mode" : "Click to engage · 1 2 mode";
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
stage.addEventListener("click", () => { engageNow(); hold(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === "1") { setMode("U"); hold(); }
  else if (event.key === "2") { setMode("C"); hold(); }
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") { setMode("C"); hold(); }
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") { setMode("U"); hold(); }
  else if (event.key === "f" || event.key === "F" || event.key === " " || event.key === "Enter") { engageNow(); hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
engageBtn.addEventListener("click", () => { engageNow(); hold(); });
modeBtns.forEach((b) => b.addEventListener("click", () => { setMode(b.dataset.mode); hold(); }));
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
// Reset: back to the state the page opened in (mode, bench, battlefield and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  Object.assign(V, JSON.parse(JSON.stringify(V0)));
  FM.t = 0;
  touring = !still.matches; tourI = 0; tourWait = 0;
  setMode("U");
  marksSig = "";
  draw(); run();
}
resetBtn.addEventListener("click", reset);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setMode("U");
setView(view, false);
window.__fireControl = {
  get s() { return s; }, V, FM, setMode, engage: engageNow, setView, reset, view: () => view,
  stop: () => { touring = false; clearTimeout(idle); },
  // freeze the clock (testing and thumbnails): the engagement stops advancing, drawing continues
  pause: (on = true) => { paused = on; },
  // jump the engagement forward by `sec` model seconds (testing and thumbnails)
  advance: (sec) => { if (s.phase === "ready") engage(s); for (let t = 0; t < sec - 1e-9; t += 1 / 60) step(s, 1 / 60, M_); syncEngage(); run(); },
  snapshot: () => JSON.stringify({ s, V: { nx: V.nx.map((x) => +x.toFixed(2)), jet: V.jet.map((x) => +x.toFixed(2)), hT: V.hT.map((x) => +x.toFixed(2)), waste: +V.waste.toFixed(3), sel: +V.sel.toFixed(3), steps: V.steps }, FM: { t: FM.t }, touring, tourI, view, readout: readout.textContent, btn: engageBtn.textContent, modes: [...modeBtns].map((b) => b.getAttribute("aria-pressed")).join() }),
};
window.__fireControl.initial = window.__fireControl.snapshot();
