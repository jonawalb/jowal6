// Page runtime (inlined by build.mjs after the kit, model, scene and field scene).
const { P, PF, LABELS, V0 } = DATA;
const M_ = DATA.MODEL;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks, segment };
const root = document.querySelector(".mq-figure");
const stage = root.querySelector(".mq-stage");
const svg = stage.querySelector(".mq-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const slider = root.querySelector("#mq-risk");
const sliderText = root.querySelector("#mq-risk-text");
const contactBtn = root.querySelector("#mq-contact");
const methodBtn = root.querySelector("#mq-method");
const fieldSvgEl = stage.querySelector(".mq-field");
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

const WALK = 24;            // route units per second at the traveling speed
const S_END = 232;          // the squad starts over from the left here
const RISK0 = 0.12;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const START = () => ({ s: still.matches ? 58 : 0, w: [1, 0, 0], risk: RISK0, riskE: RISK0, method: "alternating", adv: true, contact: false, tc: 0, e: 0, ctech: 0 });
const S = START();
const VIS0 = { upA: 0, upB: 0, pinA: 0, pinB: 0, pop: 0, fireB: 0, hitA: 0, owRange: 0, sp: 1, se: securityShare(0, M_), ff: supportSeconds(0, M_) / 10 };
const VIS = { ...VIS0 };
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "";
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;

const domOf = () => S.w.indexOf(Math.max(...S.w));
function setRisk(r) { S.risk = clamp(r, 0, 1); slider.value = String(Math.round(S.risk * 100)); }
function setMethod(m) {
  S.method = m;
  methodBtn.setAttribute("aria-pressed", String(m === "alternating"));
  methodBtn.textContent = m === "alternating" ? "Alternating bounds" : "Successive bounds";
}
function syncContact() {
  contactBtn.setAttribute("aria-pressed", String(S.contact));
  contactBtn.textContent = S.contact ? "Resume the advance" : "Make contact";
}
function makeContact() {
  if (S.contact) return;
  const q = squad(S.s, S.w, S.method, GEOM);
  S.contact = true; S.tc = 0; S.adv = false; S.ctech = domOf();
  S.e = outpostAhead(Math.max(q.a, q.b));
  if (still.matches) S.tc = 20;
  syncContact();
}
function resume() { S.contact = false; S.tc = 0; S.adv = true; syncContact(); }
const toggleContact = () => (S.contact ? resume() : makeContact());

// ---- drawing ----
function counts() { return S.contact ? downCounts(S.ctech, S.tc, M_) : { blue: 0, red: 0 }; }
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, T, FM);
  stageF.put(pose.men.map((m) => {
    const spec = { ...m, face: trFaceStep(m.face) }, look = trLook(spec);
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, spec)); return LOOKS.get(look); } };
  }));
  const sig = pose.fan.map((f) => f.x.toFixed(0) + "," + f.y.toFixed(0) + "," + f.alpha.toFixed(2)).join("|");
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function machineState() {
  const q = squad(S.s, S.w, S.method, GEOM), wb = S.w[2];
  const hold = (id) => (S.contact ? 1 : wb > 0.5 && q.moving !== id ? 1 : 0);
  const up = (id) => (S.contact ? 1 : wb > 0.5 ? (q.moving !== id ? 1 : 0) : S.w[1] * (id === "b" ? 0.6 : 0.15));
  const lead = q.a >= q.b ? "a" : "b";
  const sup = (S.contact ? (q.moving || lead) === "a" ? "b" : "a" : q.overwatch) || "b";
  const Ts = S.contact ? supportSeconds(S.ctech, M_) : 0;
  return { q, pinA: hold("a"), pinB: hold("b"), upA: up("a"), upB: up("b"), sup, pop: S.contact ? 1 : 0, fireB: S.contact ? smoothStep(Ts, Ts + 0.35, S.tc) : 0,
    hitA: S.contact ? 1 - 0.85 * smoothStep(Ts, Ts + 3.2, S.tc) : 0, owRange: S.contact || wb > 0.5 ? 1 : 0 };
}
const smoothStep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function targets() {
  const w = S.w;
  const mix = (f) => w[0] * f(0) + w[1] * f(1) + w[2] * f(2);
  return { sp: mix((t) => speedShare(t, S.method, M_)), se: mix((t) => securityShare(t, M_)), ff: mix((t) => supportSeconds(t, M_)) / 10 };
}
function readoutText() {
  const c = counts();
  if (S.contact) {
    const Ts = supportSeconds(S.ctech, M_);
    return `Contact · ${S.tc < Ts ? "fire in " + Math.ceil(Ts - S.tc) + " s" : "support firing"} · ${c.blue} vs ${c.red} down`;
  }
  const t = domOf(), tg = targets();
  return `${NAMES[t]} · speed ${Math.round(tg.sp * 100)}% · safe ${Math.round(tg.se * 100)}%`;
}
function draw() {
  if (view === "field") drawField();
  else {
    const m = machineState(), c = counts(), tg = targets();
    const x = (s) => GEO.xOf(s);
    const owX = m.sup === "a" ? x(m.q.a) : x(m.q.b);
    layer.innerHTML = scene(K, P, {
      xA: x(m.q.a), xB: x(m.q.b), upA: VIS.upA, upB: VIS.upB, pinA: VIS.pinA, pinB: VIS.pinB, pop: VIS.pop, fireB: VIS.fireB, hitA: VIS.hitA,
      owX: (S.contact || S.w[2] > 0.5) ? owX : -1000, owRange: VIS.owRange, risk: S.riskE, bars: [VIS.sp, VIS.se, VIS.ff], nb: c.blue, nr: c.red,
    });
  }
  const text = readoutText();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text + " (counts are notional)");
  if (document.activeElement !== slider) slider.value = String(Math.round(S.risk * 100));
}

// ---- tour: traveling meets contact, then bounding meets contact ----
const TOUR = [[0, "reset"], [1.8, "contact"], [6.8, "resume"], [11.4, "contact"], [14.8, "loop"]];
let tourI = 0;
function tourTick() {
  const row = TOUR[tourI];
  if (clock < row[0]) return;
  tourI = tourI + 1;
  if (row[1] === "reset") { Object.assign(S, START(), { riskE: S.riskE }); setRisk(RISK0); setMethod("alternating"); syncContact(); }
  else if (row[1] === "contact") makeContact();
  else if (row[1] === "resume") { resume(); setRisk(0.86); }
  else if (row[1] === "loop") { tourI = 0; clock = 0; Object.assign(S, START(), { riskE: S.riskE, w: S.w.slice() }); S.w = [1, 0, 0]; setRisk(RISK0); syncContact(); }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; tourTick(); }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  // the dial picks the technique; the technique's weight eases in, so teams spread or close up smoothly
  S.riskE = ease(S.riskE, S.risk, 0.2);
  const tech = techniqueOf(S.risk, M_);
  for (let i = 0; i < 3; i++) S.w[i] = ease(S.w[i], i === tech ? 1 : 0, 0.45);
  if (S.adv && !calm) {
    S.s += advanceRate(S.w, S.method, WALK, M_) * dt;
    if (S.s > S_END) S.s = 0;
  } else if (S.contact && !calm) S.tc += dt * M_.replay;
  FM.t += dt;
  const m = machineState(), tg = targets();
  VIS.upA = ease(VIS.upA, m.upA, 0.15); VIS.upB = ease(VIS.upB, m.upB, 0.15);
  VIS.pinA = ease(VIS.pinA, m.pinA, 0.1); VIS.pinB = ease(VIS.pinB, m.pinB, 0.1);
  VIS.pop = ease(VIS.pop, m.pop, 0.12); VIS.fireB = m.fireB; VIS.hitA = m.hitA; VIS.owRange = ease(VIS.owRange, m.owRange, 0.2);
  VIS.sp = ease(VIS.sp, tg.sp, 0.25); VIS.se = ease(VIS.se, tg.se, 0.25); VIS.ff = ease(VIS.ff, tg.ff, 0.25);
  draw();
  // the squad keeps walking, and the fire keeps going, while it is on screen
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; tourI = 0; run(); }, 12000);
  run();
};
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = "Slide likelihood · C contact";
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
const bump = (d) => { setRisk(Math.round((S.risk + d) * 100) / 100); hold(); };
stage.addEventListener("click", () => { toggleContact(); hold(); });
stage.addEventListener("keydown", (event) => {
  const k = event.key;
  if (k === "1") { setRisk(0.15); hold(); }
  else if (k === "2") { setRisk(0.5); hold(); }
  else if (k === "3") { setRisk(0.85); hold(); }
  else if (k === "ArrowRight" || k === "ArrowUp") bump(0.08);
  else if (k === "ArrowLeft" || k === "ArrowDown") bump(-0.08);
  else if (k === "c" || k === "C" || k === " " || k === "Enter") { toggleContact(); hold(); }
  else if (k === "b" || k === "B") { setMethod(S.method === "alternating" ? "successive" : "alternating"); hold(); }
  else if (k === "v" || k === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
contactBtn.addEventListener("click", () => { toggleContact(); hold(); });
methodBtn.addEventListener("click", () => { setMethod(S.method === "alternating" ? "successive" : "alternating"); hold(); });
slider.addEventListener("input", () => { S.risk = Number(slider.value) / 100; hold(); });
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
// Reset: back to the state the page opened in (squad, dial, controls, battlefield clock and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  Object.assign(S, START());
  Object.assign(VIS, VIS0);
  FM.t = 0;
  touring = !still.matches; clock = 0; tourI = 0;
  slider.value = String(Math.round(RISK0 * 100));
  setMethod("alternating"); syncContact();
  marksSig = "";
  draw(); run();
}
resetBtn.addEventListener("click", reset);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setRisk(RISK0); setMethod("alternating"); syncContact();
setView(view, false);
window.__movement = {
  S, VIS, FM, setRisk, setMethod, makeContact, resume, setView, reset, view: () => view,
  stop: () => { touring = false; clearTimeout(idle); },
  // run the model forward by `sec` real seconds without drawing (testing and thumbnails)
  advance: (sec) => { for (let t = 0; t < sec - 1e-9; t += 1 / 60) {
    const tech = techniqueOf(S.risk, M_);
    S.riskE = S.risk;
    for (let i = 0; i < 3; i++) S.w[i] += ((i === tech ? 1 : 0) - S.w[i]) * (1 - Math.exp(-(1 / 60) / 0.45));
    if (S.adv) { S.s += advanceRate(S.w, S.method, WALK, M_) / 60; if (S.s > S_END) S.s = 0; } else if (S.contact) S.tc += M_.replay / 60;
    FM.t += 1 / 60;
  } const m = machineState(), tg = targets(); Object.assign(VIS, { upA: m.upA, upB: m.upB, pinA: m.pinA, pinB: m.pinB, pop: m.pop, fireB: m.fireB, hitA: m.hitA, owRange: m.owRange, sp: tg.sp, se: tg.se, ff: tg.ff }); draw(); run(); },
  snapshot: () => JSON.stringify({ S: { ...S, s: +S.s.toFixed(2), riskE: +S.riskE.toFixed(3), w: S.w.map((x) => +x.toFixed(3)), tc: +S.tc.toFixed(2) }, VIS: Object.fromEntries(Object.entries(VIS).map(([k, v]) => [k, +v.toFixed(3)])), t: +FM.t.toFixed(2), touring, tourI, view, readout: readout.textContent, contact: contactBtn.getAttribute("aria-pressed"), contactText: contactBtn.textContent, method: methodBtn.textContent, risk: slider.value }),
};
window.__movement.initial = window.__movement.snapshot();
