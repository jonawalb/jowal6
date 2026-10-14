// Page runtime (inlined by build.mjs after the kit, model, scene and field scene).
const { P, PF, LABELS } = DATA;
const M_ = MODEL;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks, wireSvg };
const root = document.querySelector(".oe-figure");
const stage = root.querySelector(".oe-stage");
const svg = stage.querySelector(".oe-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const runBtn = root.querySelector("#oe-run");
const grpBtns = root.querySelectorAll(".oe-groups [data-k]");
const fieldSvgEl = stage.querySelector(".oe-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const burstEl = fieldSvgEl.querySelector('[data-part="bursts"]');
const tagsEl = fieldSvgEl.querySelector('[data-part="tags"]');
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const T = fieldTerrain();
const LOOKS = new Map();
const still = matchMedia("(prefers-reduced-motion: reduce)");
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}

const ALL = { D: true, T: true, F: true, B: true };
let cov = { ...ALL };
let plan = planFor(cov);
let t = 0, started = false;
const c = { D: 1, T: 1, F: 1, B: 1 };
const FM = { t: 0, bursts: [], next: { D: 0, T: 0, F: 0, B: 0 }, n: 0 };
let stageF = null, stageM = null, fire = null, marksSig = "", tagSig = "";
let touring = !still.matches, tourI = 0, tourWait = 0, last = 0, frame = 0, visible = false, idle = 0;

// a stage for the machine: like trStage, but its nodes keep the kit's own classes
function makeStage(host) {
  host.querySelectorAll(":scope > [data-dyn]").forEach((n) => n.remove());
  const statics = [...host.children];
  const keys = statics.map((n) => Number(n.getAttribute("data-k")));
  const nodes = new Map();
  const slotOf = (key) => { let lo = 0, hi = keys.length; while (lo < hi) { const m = (lo + hi) >> 1; if (keys[m] <= key) lo = m + 1; else hi = m; } return lo; };
  return {
    put(list) {
      const seen = new Set(), live = [];
      for (const it of list) {
        seen.add(it.id);
        let n = nodes.get(it.id);
        if (!n) { n = document.createElementNS("http://www.w3.org/2000/svg", "g"); n.setAttribute("data-dyn", ""); n._look = null; n._at = ""; nodes.set(it.id, n); }
        if (n._look !== it.look) { n.innerHTML = it.svg(); n._look = it.look; }
        const a = `translate(${it.at[0].toFixed(2)} ${it.at[1].toFixed(2)})`;
        if (n._at !== a) { n.setAttribute("transform", a); n._at = a; }
        live.push({ n, key: it.key, slot: slotOf(it.key) });
      }
      for (const [id, n] of nodes) if (!seen.has(id)) { n.remove(); nodes.delete(id); }
      live.sort((a, b) => a.key - b.key);
      for (let i = live.length - 1; i >= 0; i--) {
        const d = live[i];
        const ref = i < live.length - 1 && live[i + 1].slot === d.slot ? live[i + 1].n : statics[d.slot] || null;
        if (d.n.parentNode !== host || d.n.nextSibling !== ref) host.insertBefore(d.n, ref);
      }
    },
  };
}

// ---- the run ----
const poses = () => plan.v.map((x) => poseAt(plan, x.i, t));
function restart() { plan = planFor(cov); t = 0; started = true; FM.bursts = []; FM.next = { D: 0, T: 0, F: 0, B: 0 }; syncRun(); }
function finishCalm() { if (still.matches) { t = plan.tDone + 1; for (const k of KEYS) c[k] = cov[k] ? 1 : 0; } }
function setCov(k, on, fresh = true) {
  cov[k] = on;
  grpBtns.forEach((b) => b.setAttribute("aria-pressed", String(cov[b.dataset.k])));
  if (fresh) { restart(); finishCalm(); }
}
function syncRun() { runBtn.textContent = started && t < plan.tDone ? "Column moving" : started ? "Send the column again" : "Send the column"; }
const runDone = () => started && t >= plan.tDone;

// ---- mortar bursts and wreck smoke on the battlefield (a short history so smoke lingers) ----
const BURST_LIFE = 3.0, BURSTS = 30;
const NS = "http://www.w3.org/2000/svg";
burstEl.innerHTML = '<defs><radialGradient id="oe-g-smoke"><stop offset="0" stop-color="#6f6f6a" stop-opacity="1"/><stop offset="0.6" stop-color="#7a7a74" stop-opacity="0.55"/><stop offset="1" stop-color="#8a8a84" stop-opacity="0"/></radialGradient><radialGradient id="oe-g-dust"><stop offset="0" stop-color="#7d6a50" stop-opacity="1"/><stop offset="0.55" stop-color="#8a7a62" stop-opacity="0.6"/><stop offset="1" stop-color="#9a8c76" stop-opacity="0"/></radialGradient><radialGradient id="oe-g-flash"><stop offset="0" stop-color="#fff4d0" stop-opacity="1"/><stop offset="0.45" stop-color="#f2b43a" stop-opacity="0.9"/><stop offset="1" stop-color="#d9822b" stop-opacity="0"/></radialGradient></defs>';
const pool = Array.from({ length: BURSTS }, () => {
  const g = document.createElementNS(NS, "g");
  g.setAttribute("visibility", "hidden");
  g.innerHTML = '<circle fill="url(#oe-g-smoke)"/><circle fill="url(#oe-g-dust)"/><circle fill="url(#oe-g-flash)"/>';
  burstEl.appendChild(g);
  return { g, smoke: g.children[0], dust: g.children[1], flash: g.children[2], on: false };
});
const WRECKS = 8;
const wreckPool = Array.from({ length: WRECKS }, () => {
  const g = document.createElementNS(NS, "g");
  g.setAttribute("visibility", "hidden");
  g.innerHTML = '<circle fill="url(#oe-g-smoke)"/><circle fill="url(#oe-g-smoke)"/>';
  burstEl.appendChild(g);
  return { g, a: g.children[0], b: g.children[1], on: false };
});
const kPF = cameraOf(PF).k;
const f1 = (n) => n.toFixed(1);
function drawBursts(vehicles) {
  let i = 0;
  for (const b of FM.bursts) {
    const age = FM.t - b.t0;
    if (age < 0 || age > BURST_LIFE || i >= BURSTS) continue;
    const e = pool[i++];
    if (!e.on) { e.g.removeAttribute("visibility"); e.on = true; }
    const z = T.height(b.x, b.y);
    const [x, y] = iso([b.x, b.y, z], PF);
    const [sx, sy] = iso([b.x - 2.2 * age, b.y - 3.2 * age, z + 2 + 2.4 * age], PF);
    const f = Math.max(0, 1 - age / 0.22), d = Math.min(1, age / 0.9);
    e.flash.setAttribute("cx", f1(x)); e.flash.setAttribute("cy", f1(y - 0.8 * kPF)); e.flash.setAttribute("r", f1((2 + 3 * (1 - f)) * kPF)); e.flash.setAttribute("opacity", (0.95 * f).toFixed(2));
    e.dust.setAttribute("cx", f1(x)); e.dust.setAttribute("cy", f1(y - (1 + 3 * d) * kPF)); e.dust.setAttribute("r", f1((2 + 6.5 * d) * kPF)); e.dust.setAttribute("opacity", (1 * (1 - d * d) * Math.min(1, age * 20)).toFixed(2));
    const a = age / BURST_LIFE;
    e.smoke.setAttribute("cx", f1(sx)); e.smoke.setAttribute("cy", f1(sy)); e.smoke.setAttribute("r", f1((3.5 + 7 * a) * kPF)); e.smoke.setAttribute("opacity", (0.7 * (1 - a) * Math.min(1, age * 4)).toFixed(2));
  }
  for (; i < BURSTS; i++) if (pool[i].on) { pool[i].g.setAttribute("visibility", "hidden"); pool[i].on = false; }
  // a thin column of smoke over each vehicle put out of action
  const wr = vehicles.filter((v) => v.state === "out" || v.state === "hit");
  for (let j = 0; j < WRECKS; j++) {
    const e = wreckPool[j], v = wr[j];
    if (!v) { if (e.on) { e.g.setAttribute("visibility", "hidden"); e.on = false; } continue; }
    if (!e.on) { e.g.removeAttribute("visibility"); e.on = true; }
    for (const [node, ph] of [[e.a, 0], [e.b, 0.5]]) {
      const a = ((still.matches ? 0.3 : FM.t * 0.35) + ph + j * 0.17) % 1;
      const [x, y] = iso([v.x - 1.5 * a, v.y - 2 * a, v.z + 3 + 9 * a], PF);
      node.setAttribute("cx", f1(x)); node.setAttribute("cy", f1(y)); node.setAttribute("r", f1((2.2 + 3.4 * a) * kPF)); node.setAttribute("opacity", ((v.state === "hit" ? 0.5 : 0.75) * (1 - a) * Math.min(1, a * 5)).toFixed(2));
    }
  }
}
function feedBursts(dt, zones) {
  // drawn bursts are representative, not one per round: about 2.2 a second on a covered group while a vehicle is in its zone
  for (const k of KEYS) {
    const rate = c[k] > 0.5 && started && !runDone() && zones[k] > 0 ? 2.2 : 0;
    if (!rate) { FM.next[k] = 0; continue; }
    FM.next[k] -= dt;
    while (FM.next[k] <= 0) { const [x, y] = burstAt(k, FM.n++); FM.bursts.push({ x, y, t0: FM.t + FM.next[k] }); FM.next[k] += 1 / rate; }
  }
  FM.bursts = FM.bursts.filter((b) => FM.t - b.t0 < BURST_LIFE);
}

// ---- tags on the ground: each group's name and whether its fires are on ----
const TAGAT = { D: [-92, -62], T: [-4, -70], F: [64, -8], B: [84, 82] };
const tagNodes = {};
for (const k of KEYS) {
  const el = document.createElementNS(NS, "text");
  const [x, y] = iso([...W(...TAGAT[k]), 0], PF);
  el.setAttribute("x", f1(x)); el.setAttribute("y", f1(y)); el.setAttribute("class", "oe-tag");
  tagsEl.appendChild(el);
  tagNodes[k] = el;
}
function drawTags() {
  const sig = KEYS.map((k) => (cov[k] ? 1 : 0)).join("");
  if (sig === tagSig) return;
  tagSig = sig;
  for (const k of KEYS) { tagNodes[k].textContent = `${NAMES[k]} · fires ${cov[k] ? "on" : "off"}`; if (cov[k]) tagNodes[k].removeAttribute("data-off"); else tagNodes[k].setAttribute("data-off", ""); }
}

// ---- drawing ----
let lastZones = { D: 0, T: 0, F: 0, B: 0 };
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose({ plan, t, c, cov }, T, FM);
  lastZones = pose.zones;
  stageF.put([...pose.men, ...pose.veh].map((m) => {
    const veh = m.kind === "veh";
    const spec = { ...m, face: trFaceStep(m.face) };
    const look = veh ? `veh|${spec.face}|${m.side}|${m.lit ? 1 : 0}` : trLook(spec);
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, veh ? trVehicle(K, PF, spec.face) : trSoldier(K, PF, spec)); return LOOKS.get(look); } };
  }));
  const sig = KEYS.map((k) => c[k].toFixed(2)).join();
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, { c }); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
  drawBursts(pose.veh);
  drawTags();
}
function drawMachine() {
  if (!stageM) stageM = makeStage(layer);
  const dyn = machineDyn(K, P, { c, men: poses() });
  stageM.put(dyn.map((i) => ({ id: i.id, key: i.key, at: i.at, look: i.look, svg: () => i.svg })));
}
function readoutText() {
  const n = KEYS.filter((k) => cov[k]).length, tl = tally(plan, t);
  return `${n} of 4 covered · ${tl.through} through · ${tl.blue} vs ${tl.red} down`;
}
function draw() {
  if (view === "field") drawField(); else drawMachine();
  const text = readoutText();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text + " (counts are notional)");
}

// ---- tour: all covered, the turn uncovered (the column slips past the engagement area), the block uncovered ----
const TOUR = [{ D: true, T: true, F: true, B: true }, { D: true, T: false, F: true, B: true }, { D: true, T: true, F: true, B: false }];
function applyTour() { cov = { ...TOUR[tourI] }; grpBtns.forEach((b) => b.setAttribute("aria-pressed", String(cov[b.dataset.k]))); restart(); }
function tourTick(dt) {
  if (!started) { applyTour(); return; }
  if (runDone()) {
    tourWait += dt;
    if (tourWait > 1.1) { tourWait = 0; tourI = (tourI + 1) % TOUR.length; applyTour(); }
  }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) tourTick(dt);
  if (started && t < plan.tDone + 0.0001) { t = Math.min(plan.tDone, t + dt * M_.speedUp); if (t >= plan.tDone) syncRun(); }
  FM.t += dt;
  for (const k of KEYS) { const to = cov[k] ? 1 : 0; c[k] = calm ? to : c[k] + (to - c[k]) * (1 - Math.exp(-dt / 0.14)); if (Math.abs(c[k] - to) < 0.004) c[k] = to; }
  feedBursts(dt, lastZones);
  draw();
  const settled = !touring && (!started || runDone()) && KEYS.every((k) => c[k] === (cov[k] ? 1 : 0)) && !FM.bursts.length;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tourI = 0; tourWait = 0; started = false; cov = { ...ALL }; grpBtns.forEach((b) => b.setAttribute("aria-pressed", "true")); run(); }, 12000);
  run();
};
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = "Click to run · 1 2 3 4 fires";
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
const sendAgain = () => { restart(); finishCalm(); };
stage.addEventListener("click", () => { sendAgain(); hold(); });
stage.addEventListener("keydown", (event) => {
  const n = ["1", "2", "3", "4"].indexOf(event.key);
  if (n >= 0) { const k = KEYS[n]; setCov(k, !cov[k]); hold(); }
  else if (event.key === "f" || event.key === "F" || event.key === " " || event.key === "Enter") { sendAgain(); hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
runBtn.addEventListener("click", () => { sendAgain(); hold(); });
grpBtns.forEach((b) => b.addEventListener("click", () => { setCov(b.dataset.k, !cov[b.dataset.k]); hold(); }));
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
// Reset: back to the state the page opened in (all fires on, the column at its start, the idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  cov = { ...ALL };
  plan = planFor(cov); t = 0; started = false;
  for (const k of KEYS) c[k] = 1;
  Object.assign(FM, { t: 0, bursts: [], next: { D: 0, T: 0, F: 0, B: 0 }, n: 0 });
  grpBtns.forEach((b) => b.setAttribute("aria-pressed", "true"));
  touring = !still.matches; tourI = 0; tourWait = 0;
  marksSig = ""; tagSig = "";
  syncRun();
  draw(); run();
}
resetBtn.addEventListener("click", reset);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
syncRun();
setView(view, false);
window.__obstacleEffects = {
  get plan() { return plan; }, get cov() { return cov; }, get t() { return t; }, c, FM, setCov, setView, reset, view: () => view,
  restart: () => { restart(); finishCalm(); run(); },
  stop: () => { touring = false; clearTimeout(idle); },
  // jump the run to `min` model minutes since the column started (testing and thumbnails)
  at: (min) => { if (!started) restart(); t = Math.min(plan.tDone, min); for (const k of KEYS) c[k] = cov[k] ? 1 : 0; draw(); run(); },
  advance: (min) => { if (!started) restart(); t = Math.min(plan.tDone, t + min); draw(); run(); },
  snapshot: () => JSON.stringify({ cov, t: +t.toFixed(3), started, c: KEYS.map((k) => +c[k].toFixed(3)), touring, tourI, view, readout: readout.textContent, run: runBtn.textContent, g: [...grpBtns].map((b) => b.getAttribute("aria-pressed")).join(), bursts: FM.bursts.length }),
};
window.__obstacleEffects.initial = window.__obstacleEffects.snapshot();
