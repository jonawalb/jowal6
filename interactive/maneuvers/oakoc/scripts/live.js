// Page runtime (inlined by build.mjs after the kit, model, scene and field scene).
const { P, PF, LABELS } = DATA;
const M_ = DATA.MODEL;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks, wireSvg };
const root = document.querySelector(".oa-figure");
const stage = root.querySelector(".oa-stage");
const svg = stage.querySelector(".oa-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const slider = root.querySelector("#oa-n");
const sliderOut = root.querySelector("#oa-n-out");
const orderBtns = root.querySelectorAll(".oa-orders [data-order]");
const nextBtn = root.querySelector("#oa-next");
const fieldSvgEl = stage.querySelector(".oa-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const seqText = root.querySelector("#oa-seq");
const VIEW_KEY = "maneuvers.view.v2";
const T = fieldTerrain();
const LOOKS = new Map();
const still = matchMedia("(prefers-reduced-motion: reduce)");
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}

let st = setPlan(fresh("list", 0));
const V = { drop: [0, 0, 0, 0, 0], seq: ORDERS.list.seq.slice(), route: null, s: 0, halt: null };
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "";
let touring = !still.matches, tourWait = 0, last = 0, frame = 0, visible = false, idle = 0;
const cache = new Map();
const planFor = (order, n) => { const key = order + n; if (!cache.has(key)) cache.set(key, setPlan(fresh(order, n))); const c = cache.get(key); return { order, n, plan: c.plan, w: c.w, s: 0 }; };
const tiles = (key) => aspectTiles(key);
const NAMES = { o: "Observation and fields of fire", a: "Avenues of approach", k: "Key terrain", b: "Obstacles", c: "Cover and concealment" };

function setState(order, n, keepS) {
  const s0 = keepS ? st.s : 0;
  st = planFor(order, Math.max(0, Math.min(5, n)));
  st.s = Math.min(s0, st.w.length);
  V.seq = ORDERS[order].seq.slice();
  V.route = { pts: st.w.pts, s: st.w.s, length: st.w.length };
  V.halt = st.w.halted ? st.w.pts[st.w.pts.length - 1] : null;
  slider.value = String(st.n);
  sliderOut.textContent = String(st.n);
  orderBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.order === order)));
  nextBtn.textContent = st.n >= 5 ? "Take it off again" : "Apply next overlay";
  seqText.textContent = ORDERS[order].seq.map((k, i) => `${i + 1}. ${NAMES[k]}`).join(" · ");
  marksSig = "";
}
const setN = (n) => setState(st.order, n, false);
const setOrder = (o) => setState(o, st.n, false);
function next() { setN(st.n >= 5 ? 0 : st.n + 1); }

// ---- drawing ----
function drawMachine() {
  V.s = st.s;
  layer.innerHTML = scene(K, P, V, M_, tiles);
}
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(st, T);
  stageF.put(pose.men.map((m) => {
    const spec = { ...m, face: trFaceStep(m.face) }, look = trLook(spec);
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, spec)); return LOOKS.get(look); } };
  }));
  const sig = `${st.order}${st.n}`;
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, st); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function readoutText() {
  const name = st.n === 0 ? "No overlay" : NAMES[ORDERS[st.order].seq[st.n - 1]];
  const down = downAt(st.w, st.s, M_);
  return `${st.n}/5 ${name}` + (down ? ` · ${down} down` : "");
}
function longText() {
  const w = st.w, s = summary(st);
  return `${readoutText()}. Route about ${s.length} units, ${s.exposed} of them in the enemy observer's view and in the open; ${s.halted ? "it stops at the " + s.why : "it reaches the position"}. Notional.`;
}
function draw() {
  if (view === "field") drawField(); else drawMachine();
  const text = readoutText();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", longText());
}

// ---- tour: the five overlays in order, then the route again from the start ----
const dwell = () => (still.matches ? 0 : 1.1);
function tourTick(dt) {
  const done = st.s >= st.w.length - 0.01;
  if (done) {
    tourWait += dt;
    if (tourWait > dwell() + 0.6) { tourWait = 0; next(); }
  }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (calm) { st.s = st.w.length; V.drop = V.drop.map((_, j) => (j < st.n ? 1 : 0)); }
  else {
    if (touring) tourTick(dt);
    st.s = Math.min(st.w.length, st.s + dt * M_.speed);
    V.drop = V.drop.map((d, j) => { const to = j < st.n ? 1 : 0; return d + (to - d) * (1 - Math.exp(-dt / 0.16)); });
  }
  FM.t += dt;
  draw();
  const settled = !touring && st.s >= st.w.length - 0.01 && V.drop.every((d, j) => Math.abs(d - (j < st.n ? 1 : 0)) < 0.004);
  frame = visible && (!settled || view === "field") ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tourWait = 0; setState("list", 0, false); V.drop = [0, 0, 0, 0, 0]; run(); }, 14000);
  run();
};
function setView(nextV, save) {
  view = nextV === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = "Click: next overlay · 0 to 5";
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
stage.addEventListener("click", () => { next(); hold(); });
stage.addEventListener("keydown", (event) => {
  if (/^[0-5]$/.test(event.key)) setN(Number(event.key));
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") setN(st.n + 1);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") setN(st.n - 1);
  else if (event.key === "Enter" || event.key === " ") next();
  else if (event.key === "o" || event.key === "O") setOrder(st.order === "list" ? "tech" : "list");
  else if (event.key === "v" || event.key === "V") { setView(view === "field" ? "machine" : "field", true); event.preventDefault(); return; }
  else return;
  hold();
  event.preventDefault();
});
slider.addEventListener("input", () => { setN(Number(slider.value)); hold(); });
nextBtn.addEventListener("click", () => { next(); hold(); });
orderBtns.forEach((b) => b.addEventListener("click", () => { setOrder(b.dataset.order); hold(); }));
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
// Reset: back to the state the page opened in (no overlay, the listed order, idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  FM.t = 0;
  touring = !still.matches; tourWait = 0;
  setState("list", 0, false);
  V.drop = [0, 0, 0, 0, 0];
  draw(); run();
}
resetBtn.addEventListener("click", reset);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setState("list", 0, false);
setView(view, false);
window.__oakoc = {
  get st() { return st; }, V, FM, setN, setOrder, next, setView, reset, view: () => view,
  stop: () => { touring = false; clearTimeout(idle); },
  finish: () => { st.s = st.w.length; V.drop = V.drop.map((_, j) => (j < st.n ? 1 : 0)); draw(); },
  snapshot: () => JSON.stringify({ order: st.order, n: st.n, s: +st.s.toFixed(1), drop: V.drop.map((d) => +d.toFixed(2)), touring, view, readout: readout.textContent, slider: slider.value, orders: [...orderBtns].map((b) => b.getAttribute("aria-pressed")).join(), seq: seqText.textContent }),
};
window.__oakoc.initial = window.__oakoc.snapshot();
