// Page runtime for Lifting and Shifting Fires (inlined by build.mjs after the kit, model.mjs,
// scene.mjs, field.mjs, terrain.mjs and field-scene.mjs). One run clock drives both views.
const { P, PF, DIAL, DIAL2, START, LABELS } = DATA;
const M = DATA.MODEL;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf };
const root = document.querySelector(".lsf-figure");
const stage = root.querySelector(".lsf-stage");
const svg = stage.querySelector(".lsf-svg");
const layer = svg.querySelector('[data-part="live"]');
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const readout = root.querySelector("[data-readout]");
const slider = root.querySelector("#lsf-lift");
const sliderVal = root.querySelector("#lsf-lift-val");
const sliderText = root.querySelector("#lsf-lift-text");
const runBtn = root.querySelector("#lsf-run");
const modeBtns = root.querySelectorAll(".lsf-modes [data-mode]");
const fieldSvgEl = stage.querySelector(".lsf-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const mortarEl = fieldSvgEl.querySelector('[data-part="mortar"]');
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const T = fieldTerrain();
const LOOKS = new Map();
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Click to run · arrows set lift", field: "Click to run · arrows set lift" };
const SLIDER_TEXT = { machine: "Trip dog (lift at)", field: "Final coordination line (lift at)" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const GAUGE = { key: depthOf([-16, -54, 0], P), svg: gaugeEl.outerHTML };
gaugeEl.remove();
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// S: the run (lift distance, mode, run clock). V: the machine's eased parts. FM: field clocks.
const TOUR = [[140, true], [50, true], [10, true]];
const fresh = () => ({ L: START.L, Lv: START.L, shift: START.shift, ft: still.matches ? Infinity : 0 });
const freshV = () => ({ flag: 0, cam: 0, chute: 0, gate: 0, halted: 0, front: 0, rear: 0, e: M.floor, risk: 0 });
const S = fresh();
const V = freshV();
const FM = { t: 0 };
let touring = !still.matches, tourIdx = 0, last = 0, frame = 0, visible = false, idle = 0;
let stageF = null, fire = null, mortar = null, marksSig = "";

const runState = () => { const p = plan(S.L, S.shift); return stateAt(Math.min(S.ft, p.tEnd), S.L, S.shift); };
function setModeButtons() { modeBtns.forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.mode === "shift") === S.shift))); }
function setSlider() {
  if (document.activeElement !== slider) slider.value = String(S.L);
  sliderVal.textContent = S.L + " m";
  stage.setAttribute("aria-valuenow", String(S.L));
}

// Mortar bursts: pooled circles (flash, dust column, drifting smoke) that only get attributes.
function mortarLayer(group) {
  const ns = "http://www.w3.org/2000/svg", n = 10;
  const make = (cls) => Array.from({ length: n }, () => { const e = document.createElementNS(ns, "circle"); e.setAttribute("class", cls); e.setAttribute("visibility", "hidden"); group.appendChild(e); return e; });
  const sm = make("tr-smoke"), du = make("tr-dust"), fl = make("tr-flash");
  fl.forEach((e) => e.setAttribute("data-side", "f"));
  const kk = cameraOf(PF).k;
  return {
    draw(list) {
      for (let i = 0; i < n; i++) {
        const b = list[i];
        if (!b) { sm[i].setAttribute("visibility", "hidden"); du[i].setAttribute("visibility", "hidden"); fl[i].setAttribute("visibility", "hidden"); continue; }
        const a = b.age;
        const [x, y] = iso(b.p, PF);
        const [sx, sy] = iso([b.p[0] - 6 * a, b.p[1] - 9 * a, b.p[2] + 6 * a], PF);
        sm[i].removeAttribute("visibility"); du[i].removeAttribute("visibility");
        sm[i].setAttribute("cx", sx.toFixed(1)); sm[i].setAttribute("cy", sy.toFixed(1)); sm[i].setAttribute("r", ((2.4 + a * 7) * kk).toFixed(1));
        sm[i].setAttribute("opacity", (0.34 * (1 - a) * Math.min(1, a * 8)).toFixed(2));
        const da = Math.min(1, a * 4);
        du[i].setAttribute("cx", x.toFixed(1)); du[i].setAttribute("cy", (y - da * 2.2 * kk).toFixed(1)); du[i].setAttribute("r", ((1.2 + da * 3.4) * kk).toFixed(1));
        du[i].setAttribute("opacity", (0.6 * (1 - da) ** 1.5).toFixed(2));
        if (a < 0.035) { fl[i].removeAttribute("visibility"); fl[i].setAttribute("cx", x.toFixed(1)); fl[i].setAttribute("cy", (y - 0.6 * kk).toFixed(1)); fl[i].setAttribute("r", (2.2 * kk).toFixed(1)); fl[i].setAttribute("opacity", (0.9 * (1 - a / 0.035)).toFixed(2)); }
        else fl[i].setAttribute("visibility", "hidden");
      }
    },
  };
}

function drawField(R) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); mortar = mortarLayer(mortarEl); }
  const pose = fieldPose(R, T);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m);
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = String(Math.round(S.Lv * 2) / 2);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, Math.round(S.Lv * 2) / 2); marksSig = sig; }
  const ft = Number.isFinite(S.ft) ? S.ft : R.p.tEnd + 1.3;
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
  mortar.draw(mortarShots(R, T, ft).slice(-10));
}
function drawMachine(R) {
  const p = R.p;
  const running = S.ft < p.tEnd;
  const on = running ? (R.firing ? 1 : S.shift ? 1 : 0) : 0;
  const shots = shotsAt(Math.min(S.ft, p.tEnd), V.chute, on, !R.firing && S.shift);
  layer.innerHTML = scene(K, P, { d: R.d, L: S.Lv, flag: V.flag, cam: V.cam, chute: V.chute, gate: V.gate, halted: V.halted, front: V.front, rear: V.rear, shots, statics: [GAUGE] });
  const n1 = layer.querySelector('[data-part="needle"]'), n2 = layer.querySelector('[data-part="needle2"]');
  if (n1) n1.setAttribute("d", needle(K, P, DIAL, V.e));
  if (n2) n2.setAttribute("d", needle(K, P, DIAL2, V.risk));
}
function phaseWord(R) { return R.phase === "Cease fire" ? "MSL hold (model)" : R.phase; }
function draw() {
  const R = runState();
  if (view === "field") drawField(R); else drawMachine(R);
  const pct = Math.round(R.e * 100);
  const text = view === "field"
    ? `${phaseWord(R)} · enemy ${pct}% · ${R.blue} vs ${R.red} down`
    : `${phaseWord(R)} · enemy ${pct}% · risk ${Math.round(R.risk * 100)}%`;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", `Lift at ${S.L} m. ${text}`);
  setSlider();
  return R;
}
function restartRun() { S.ft = still.matches ? Infinity : 0; }
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  const p = plan(S.L, S.shift);
  if (Number.isFinite(S.ft)) S.ft += dt;
  if (touring && S.ft >= p.tEnd + 0.4) {
    tourIdx = (tourIdx + 1) % TOUR.length;
    [S.L, S.shift] = TOUR[tourIdx];
    setModeButtons();
    S.ft = 0;
  }
  const R = runState();
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  S.Lv = ease(S.Lv, S.L, 0.22);
  const rec = R.rec;
  const want = { flag: R.d <= S.L + 1e-6 ? 1 : 0, cam: R.firing ? 0 : 1, chute: !R.firing && S.shift ? GEO.SHIFT_ANG : 0, gate: !R.firing && !S.shift ? 1 : 0, halted: R.halted ? 1 : 0, front: rec, rear: R.rein, e: R.e, risk: R.risk };
  V.flag = ease(V.flag, want.flag, 0.08); V.cam = ease(V.cam, want.cam, 0.12); V.chute = ease(V.chute, want.chute, 0.18);
  V.gate = ease(V.gate, want.gate, 0.12); V.halted = ease(V.halted, want.halted, 0.08);
  V.front = ease(V.front, want.front, 0.1); V.rear = ease(V.rear, want.rear, 0.1);
  V.e = ease(V.e, want.e, 0.15); V.risk = ease(V.risk, want.risk, 0.25);
  FM.t += dt;
  draw();
  const settled = !touring && S.ft >= p.tEnd && Math.abs(S.Lv - S.L) < 0.01 &&
    Object.keys(want).every((key) => Math.abs(V[key] - want[key]) < 0.002);
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tourIdx = 0; [S.L, S.shift] = TOUR[0]; setModeButtons(); restartRun(); run(); }, 9000);
  run();
};
const setLift = (v) => { S.L = clamp(Math.round(v / 5) * 5, M.lift[0], M.lift[1]); restartRun(); hold(); };
const setShift = (on) => { S.shift = on; setModeButtons(); restartRun(); hold(); };
const runNow = () => { restartRun(); hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  sliderText.textContent = SLIDER_TEXT[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
stage.addEventListener("click", runNow);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") setLift(S.L + 5);
  else if (event.key === "ArrowRight" || event.key === "ArrowDown") setLift(S.L - 5);
  else if (event.key === " " || event.key === "Enter") runNow();
  else if (event.key === "f" || event.key === "F") setShift(!S.shift);
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
runBtn.addEventListener("click", runNow);
modeBtns.forEach((b) => b.addEventListener("click", () => setShift(b.dataset.mode === "shift")));
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => setLift(Number(slider.value)));
// Reset: back to the state the page opened in (run, controls, machine parts, idle tour); the view is kept.
function reset() {
  clearTimeout(idle);
  Object.assign(S, fresh());
  Object.assign(V, freshV());
  FM.t = 0;
  touring = !still.matches; tourIdx = 0;
  slider.value = String(S.L);
  setModeButtons();
  draw(); run();
}
root.querySelector(".fd-reset").addEventListener("click", reset);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setModeButtons();
setView(view, false);
window.__liftShift = {
  S, V, setLift, setShift, runNow, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); },
  snapshot: () => JSON.stringify({ S: { L: S.L, shift: S.shift, ft: S.ft }, V, touring, tourIdx, slider: slider.value, modes: [...modeBtns].map((b) => b.getAttribute("aria-pressed")), view: [...viewBtns].map((b) => b.getAttribute("aria-pressed")).join() === (view === "field" ? "false,true" : "true,false") }),
};
window.__liftShift.load = window.__liftShift.snapshot();
