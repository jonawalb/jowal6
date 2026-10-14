// Page runtime (inlined by build.mjs after the kit, model, scene and field scene).
const { P, PF, LABELS, V0, TOUR } = DATA;
const M_ = DATA.MODEL;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks };
const root = document.querySelector(".sp-figure");
const stage = root.querySelector(".sp-stage");
const svg = stage.querySelector(".sp-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const engageBtn = root.querySelector("#sp-engage");
const layoutBtns = root.querySelectorAll(".sp-layout [data-layout]");
const fortBtns = root.querySelectorAll(".sp-prep [data-fort]");
const mainBtn = root.querySelector("#sp-main");
const slider = root.querySelector("#sp-bearing");
const bearingOut = root.querySelector("#sp-bearing-out");
const fieldSvgEl = stage.querySelector(".sp-field");
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

let cfg = { ...TOUR[0] };
let s = fresh(cfg);
const V = JSON.parse(JSON.stringify(V0));
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "";
let paused = false, touring = !still.matches, tourI = 0, tourWait = 0, last = 0, frame = 0, visible = false, idle = 0;

// ---- controls ----
const sameCfg = (a, b) => a.layout === b.layout && a.fort === b.fort && a.main === b.main && a.bearing === b.bearing;
function syncControls() {
  layoutBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.layout === cfg.layout)));
  fortBtns.forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.fort === cfg.fort)));
  mainBtn.setAttribute("aria-pressed", String(!!cfg.main));
  slider.value = String(cfg.bearing);
  bearingOut.textContent = `${cfg.bearing}° ${compass(cfg.bearing)}`;
  root.setAttribute("data-layout", cfg.layout);
  root.setAttribute("data-fort", String(cfg.fort));
  syncEngage();
}
function syncEngage() {
  const running = s.phase === "run";
  engageBtn.textContent = running ? "Restart" : s.phase === "done" ? "Attack again" : "Attack";
}
function setCfg(next) {
  cfg = { ...cfg, ...next };
  s = fresh(cfg);
  marksSig = "";
  syncControls();
}
function finishCalm() { if (still.matches) { let n = 0; while (s.phase !== "done" && n++ < 20000) step(s, 1 / 60, M_); } }
function engageNow() {
  if (s.phase !== "ready") s = fresh(cfg);
  engage(s);
  finishCalm();
  syncEngage();
}
const bearingStep = (d) => setCfg({ bearing: (cfg.bearing + d + 360) % 360 });

// ---- machine targets from the state ----
function wants() {
  const G = GEO, out = { L: cfg.layout === "P" ? 1 : 0, fort: cfg.fort, ang: cfg.bearing, tip: G.RAIL - 4, arm: 180, g: [], rg: 0, held: 0, broke: 0 };
  const live = s.phase === "run" || s.phase === "done";
  for (let k = 0; k < M_.pos; k++) out.g.push(live ? gauge(s, k, M_) : 0);
  out.rg = live ? reserveGauge(s, M_) : 0;
  if (s.res) out.arm = cfg.bearing;
  if (live) {
    const defl = V.g.map((g) => G.PUSH * g);
    const hit = rayHit(V.ang, V.L, defl);
    const contact = hit === null ? G.HUB + 24 : hit + 3;
    const go = Math.min(1, s.t / 1.5), push = Math.sqrt(s.E / M_.E0);
    out.tip = G.RAIL - 4 - (G.RAIL - 4 - contact) * go * push;
    if (s.phase === "done" && s.end === "penetrated") out.tip = G.HUB + 2;
  }
  if (s.phase === "done") { out.held = s.end === "held" ? 1 : 0; out.broke = s.end === "penetrated" ? 1 : 0; }
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
  const sig = s.layout;
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, s); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function readoutText() {
  const from = `${compass(s.bearing)}`;
  if (s.phase === "ready") return `Ready · from ${from} · ${s.layout === "P" ? "perimeter" : "line"}`;
  return `${verdict(s)} from ${from} · ${friendDown(s, M_)} vs ${enemyDown(s, M_)} down`;
}
function draw() {
  if (view === "field") drawField();
  else layer.innerHTML = scene(K, P, V);
  const text = readoutText();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}

// ---- tour: the line from its front, the line from the side, then the prepared perimeter ----
function tourTick(dt) {
  if (s.phase === "ready") {
    if (!sameCfg(cfg, TOUR[tourI])) setCfg(TOUR[tourI]);
    engageNow();
  } else if (s.phase === "done") {
    tourWait += dt;
    if (tourWait > 1.8) { tourWait = 0; tourI = (tourI + 1) % TOUR.length; setCfg(TOUR[tourI]); }
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
  V.L = ease(V.L, W.L, 0.22); V.fort = ease(V.fort, W.fort, 0.2);
  let dA = ((W.ang - V.ang + 540) % 360) - 180;
  const nA = calm ? W.ang : V.ang + dA * (1 - Math.exp(-dt / 0.14));
  V.ang = ((nA % 360) + 360) % 360;
  dA = ((W.ang - V.ang + 540) % 360) - 180;
  let dArm = ((W.arm - V.arm + 540) % 360) - 180;
  V.arm = (((calm ? W.arm : V.arm + dArm * (1 - Math.exp(-dt / 0.22))) % 360) + 360) % 360;
  dArm = ((W.arm - V.arm + 540) % 360) - 180;
  V.tip = ease(V.tip, W.tip, 0.12);
  for (let k = 0; k < 6; k++) V.g[k] = ease(V.g[k], W.g[k], 0.1);
  V.rg = ease(V.rg, W.rg, 0.12);
  V.held = W.held; V.broke = W.broke;
  draw();
  moving = Math.abs(V.L - W.L) > 0.004 || Math.abs(V.fort - W.fort) > 0.004 || Math.abs(dA) > 0.2 || Math.abs(dArm) > 0.2 || Math.abs(V.tip - W.tip) > 0.1 ||
    V.g.some((g, k) => Math.abs(g - W.g[k]) > 0.004) || Math.abs(V.rg - W.rg) > 0.004;
  const settled = !touring && (s.phase === "ready" || s.phase === "done") && !moving;
  // the battlefield keeps its tracers going while on screen and an attack runs; both views stop once settled
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tourI = 0; tourWait = 0; setCfg(TOUR[0]); run(); }, 12000);
  run();
};
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
stage.addEventListener("click", () => { engageNow(); hold(); });
stage.addEventListener("keydown", (event) => {
  const k = event.key;
  if (k === "ArrowRight" || k === "ArrowUp") { bearingStep(15); hold(); }
  else if (k === "ArrowLeft" || k === "ArrowDown") { bearingStep(-15); hold(); }
  else if (k === "l" || k === "L") { setCfg({ layout: cfg.layout === "P" ? "L" : "P" }); hold(); }
  else if (k === "s" || k === "S") { setCfg({ fort: cfg.fort ? 0 : 1 }); hold(); }
  else if (k === "m" || k === "M") { setCfg({ main: cfg.main ? 0 : 1 }); hold(); }
  else if (k === "f" || k === "F" || k === " " || k === "Enter") { engageNow(); hold(); }
  else if (k === "v" || k === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
engageBtn.addEventListener("click", () => { engageNow(); hold(); });
layoutBtns.forEach((b) => b.addEventListener("click", () => { setCfg({ layout: b.dataset.layout }); hold(); }));
fortBtns.forEach((b) => b.addEventListener("click", () => { setCfg({ fort: +b.dataset.fort }); hold(); }));
mainBtn.addEventListener("click", () => { setCfg({ main: cfg.main ? 0 : 1 }); hold(); });
slider.addEventListener("input", () => { setCfg({ bearing: +slider.value }); hold(); });
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
// Reset: back to the state the page opened in (setup, bench, battlefield and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  Object.assign(V, JSON.parse(JSON.stringify(V0)));
  FM.t = 0;
  touring = !still.matches; tourI = 0; tourWait = 0;
  cfg = { ...TOUR[0] };
  s = fresh(cfg);
  marksSig = "";
  syncControls();
  draw(); run();
}
resetBtn.addEventListener("click", reset);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
syncControls();
setView(view, false);
window.__strongpointPerimeter = {
  get s() { return s; }, V, FM, setCfg, engage: engageNow, setView, reset, view: () => view,
  stop: () => { touring = false; clearTimeout(idle); },
  pause: (on = true) => { paused = on; },
  advance: (sec) => { if (s.phase === "ready") engage(s); for (let t = 0; t < sec - 1e-9; t += 1 / 60) step(s, 1 / 60, M_); syncEngage(); run(); },
  snapshot: () => JSON.stringify({ s, V: { L: +V.L.toFixed(2), fort: +V.fort.toFixed(2), ang: +V.ang.toFixed(1), tip: +V.tip.toFixed(1), arm: +V.arm.toFixed(1), g: V.g.map((x) => +x.toFixed(2)), rg: +V.rg.toFixed(2) }, cfg, FM: { t: FM.t }, touring, tourI, view, readout: readout.textContent, btn: engageBtn.textContent, slider: slider.value }),
};
window.__strongpointPerimeter.initial = window.__strongpointPerimeter.snapshot();
