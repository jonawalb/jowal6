// Page runtime (inlined by build.mjs after the kit, model, scene and field scene).
const { P, PF, LABELS } = DATA;
const M_ = DATA.MODEL;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks };
const root = document.querySelector(".fe-figure");
const stage = root.querySelector(".fe-stage");
const svg = stage.querySelector(".fe-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const fireBtn = root.querySelector("#fe-fire");
const lvlBtns = root.querySelectorAll(".fe-levels [data-level]");
const fieldSvgEl = stage.querySelector(".fe-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const burstEl = fieldSvgEl.querySelector('[data-part="bursts"]');
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const T = fieldTerrain();
const LOOKS = new Map();
const still = matchMedia("(prefers-reduced-motion: reduce)");
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}

const UP = GEO.UP + GEO.GAP;
const V0 = { hR: UP, hB: GEO.UP, lock: 0, crack: 0, spin: 20 };
let s = mission("S");
const V = { ...V0 };
const FM = { vt: 0, t: 0, bursts: [], next: 0, k: 0 };
let stageF = null, fire = null, marksSig = "";
let touring = !still.matches, tourI = 0, tourWait = 0, last = 0, frame = 0, visible = false, idle = 0;

// ---- controls ----
function setLevel(lvl, fresh = true) {
  if (fresh) s = mission(lvl); else s.level = lvl;
  lvlBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.level === lvl)));
  syncFire();
}
function syncFire() {
  fireBtn.setAttribute("aria-pressed", String(s.firing));
  fireBtn.textContent = s.firing ? "Cease fire" : "Fire for effect";
}
function finishCalm() { if (still.matches) { while (s.t < M_.window - 1e-9 || s.firing) step(s, 1 / 60); } }
function toggleFire() {
  if (s.firing) cease(s);
  else { if (s.started) s = mission(s.level); s.firing = true; finishCalm(); }
  syncFire();
}

// ---- mortar bursts on the battlefield: a short history so smoke lingers after the last round ----
const BURST_LIFE = 3.2, BURSTS = 26;
const NS = "http://www.w3.org/2000/svg";
burstEl.innerHTML = '<defs><radialGradient id="fe-g-smoke"><stop offset="0" stop-color="#6f6f6a" stop-opacity="1"/><stop offset="0.6" stop-color="#7a7a74" stop-opacity="0.55"/><stop offset="1" stop-color="#8a8a84" stop-opacity="0"/></radialGradient><radialGradient id="fe-g-dust"><stop offset="0" stop-color="#7d6a50" stop-opacity="1"/><stop offset="0.55" stop-color="#8a7a62" stop-opacity="0.6"/><stop offset="1" stop-color="#9a8c76" stop-opacity="0"/></radialGradient><radialGradient id="fe-g-flash"><stop offset="0" stop-color="#fff4d0" stop-opacity="1"/><stop offset="0.45" stop-color="#f2b43a" stop-opacity="0.9"/><stop offset="1" stop-color="#d9822b" stop-opacity="0"/></radialGradient></defs>';
const pool = Array.from({ length: BURSTS }, () => {
  const g = document.createElementNS(NS, "g");
  g.setAttribute("visibility", "hidden");
  g.innerHTML = '<circle class="fe-smoke" fill="url(#fe-g-smoke)"/><circle class="fe-dust" fill="url(#fe-g-dust)"/><circle class="fe-flash" fill="url(#fe-g-flash)"/>';
  burstEl.appendChild(g);
  return { g, smoke: g.children[0], dust: g.children[1], flash: g.children[2], on: false };
});
const kPF = cameraOf(PF).k;
function drawBursts() {
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
    e.flash.setAttribute("cx", x.toFixed(1)); e.flash.setAttribute("cy", (y - 0.8 * kPF).toFixed(1)); e.flash.setAttribute("r", ((2 + 3 * (1 - f)) * kPF).toFixed(1)); e.flash.setAttribute("opacity", (0.95 * f).toFixed(2));
    e.dust.setAttribute("cx", x.toFixed(1)); e.dust.setAttribute("cy", (y - (1 + 3 * d) * kPF).toFixed(1)); e.dust.setAttribute("r", ((2 + 6.5 * d) * kPF).toFixed(1)); e.dust.setAttribute("opacity", (1 * (1 - d * d) * Math.min(1, age * 20)).toFixed(2));
    const a = age / BURST_LIFE;
    e.smoke.setAttribute("cx", sx.toFixed(1)); e.smoke.setAttribute("cy", sy.toFixed(1)); e.smoke.setAttribute("r", ((3.5 + 7 * a) * kPF).toFixed(1)); e.smoke.setAttribute("opacity", (0.7 * (1 - a) * Math.min(1, age * 4)).toFixed(2));
  }
  for (; i < BURSTS; i++) if (pool[i].on) { pool[i].g.setAttribute("visibility", "hidden"); pool[i].on = false; }
}
function feedBursts(dt) {
  // drawn bursts are representative, not one per round: about 3 a second firing for effect, 1.2 sustaining
  const rate = !s.firing ? 0 : s.nEff < roundsFor(s.level, M_) ? 3 : 1.2;
  if (!rate) { FM.next = 0; }
  else {
    FM.next -= dt;
    while (FM.next <= 0) { const [x, y] = burstAt(FM.k++); FM.bursts.push({ x, y, t0: FM.t + FM.next }); FM.next += 1 / rate; }
  }
  FM.bursts = FM.bursts.filter((b) => FM.t - b.t0 < BURST_LIFE);
}

// ---- drawing ----
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(s, T, FM);
  stageF.put(pose.men.map((m) => {
    const spec = { ...m, face: trFaceStep(m.face) }, look = trLook(spec);
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, spec)); return LOOKS.get(look); } };
  }));
  const sig = s.E.toFixed(2);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, s); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
  drawBursts();
}
function readoutText() {
  const word = stateWord(s), n = rounds(s), t = s.t.toFixed(1);
  if (view === "field") { const LS = losses(s); return `${word} · ${n} rds · ${t} min · ${LS.blue} vs ${LS.red} down`; }
  return `${word} · ${n} rds · ${t} min · ${Math.round(hitShare(s.nEff, M_) * 100)}% hit`;
}
function draw() {
  if (view === "field") drawField();
  else layer.innerHTML = scene(K, P, { ...V, level: s.level, rounds: rounds(s), t: s.t });
  const text = readoutText();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
// visual targets for the press from the mission state
function targets() {
  const c = hitShare(s.nEff, M_), eff = effectOf(c, M_);
  const pinned = s.started && !s.firing && (eff === "D" || (eff === "N" && s.tt - s.last < M_.tN));
  const press = s.firing || pinned;
  const h = GEO.hAt(strokeOf(c));
  return { hR: press ? h : UP, hB: press ? h : GEO.UP, lock: pinned ? 1 : 0, crack: eff === "D" ? 1 : 0 };
}

// ---- tour: suppress (cease early), neutralize, destroy ----
const TOUR = [["S", 2.0], ["N", Infinity], ["D", Infinity]];
function tourTick(dt) {
  const [lvl, ceaseAt] = TOUR[tourI];
  if (!s.started && !s.firing) { if (s.level !== lvl) setLevel(lvl); s.firing = true; syncFire(); }
  if (s.firing && s.tt >= ceaseAt) { cease(s); syncFire(); }
  if (s.started && s.t >= M_.window && !s.firing) {
    tourWait += dt;
    if (tourWait > 1.0) { tourWait = 0; tourI = (tourI + 1) % TOUR.length; setLevel(TOUR[tourI][0]); }
  }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) tourTick(dt);
  const wasFiring = s.firing, t0 = s.t;
  const R = fieldRoute();
  step(s, dt * M_.speed, M_);
  if (wasFiring !== s.firing) syncFire();
  FM.t += dt;
  FM.vt = s.started && s.t < M_.window ? (R.length - FG.GAP - 2) / M_.window * (s.t - t0) / dt : 0;
  feedBursts(dt);
  const W = targets(), ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  V.hR = ease(V.hR, W.hR, 0.12);
  V.hB = Math.min(ease(V.hB, W.hB, 0.1), V.hR);
  V.lock = ease(V.lock, W.lock, 0.1);
  V.crack = ease(V.crack, W.crack, 0.25);
  if (s.firing) V.spin += 220 * dt;
  draw();
  const settled = !touring && !s.firing && Math.abs(V.hR - W.hR) < 0.01 && Math.abs(V.hB - W.hB) < 0.01 && Math.abs(V.lock - W.lock) < 0.005 &&
    Math.abs(V.crack - W.crack) < 0.005 && (!s.started || s.t >= M_.window) && Math.abs(s.E - wantE(s, M_)) < 0.002 && !FM.bursts.length &&
    !(s.started && !s.firing && effectOf(hitShare(s.nEff, M_), M_) === "N" && s.tt - s.last < M_.tN + 0.05);
  // the battlefield keeps its fire going while on screen (until the platoon is across); the machine stops once settled
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tourI = 0; tourWait = 0; setLevel("S"); run(); }, 12000);
  run();
};
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = view === "field" ? "Click to fire · 1 2 3 effect" : "Click to fire · 1 2 3 detent";
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
const LV = ["S", "N", "D"];
stage.addEventListener("click", () => { toggleFire(); hold(); });
stage.addEventListener("keydown", (event) => {
  const i = LV.indexOf(s.level);
  if (event.key === "1" || event.key === "2" || event.key === "3") { setLevel(LV[Number(event.key) - 1]); hold(); }
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") { setLevel(LV[Math.min(2, i + 1)]); hold(); }
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") { setLevel(LV[Math.max(0, i - 1)]); hold(); }
  else if (event.key === "f" || event.key === "F" || event.key === " " || event.key === "Enter") { toggleFire(); hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
fireBtn.addEventListener("click", () => { toggleFire(); hold(); });
lvlBtns.forEach((b) => b.addEventListener("click", () => { setLevel(b.dataset.level); hold(); }));
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
// Reset: back to the state the page opened in (mission, press, battlefield and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  Object.assign(V, V0);
  Object.assign(FM, { vt: 0, t: 0, bursts: [], next: 0, k: 0 });
  touring = !still.matches; tourI = 0; tourWait = 0;
  setLevel("S");
  draw(); run();
}
resetBtn.addEventListener("click", reset);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setLevel("S");
setView(view, false);
window.__fireEffects = {
  get s() { return s; }, V, FM, setLevel, toggleFire, setView, reset, view: () => view,
  stop: () => { touring = false; clearTimeout(idle); },
  // jump the mission forward by `min` model minutes (testing and thumbnails)
  advance: (min) => { for (let t = 0; t < min - 1e-9; t += 1 / 60) step(s, 1 / 60, M_); syncFire(); run(); },
  snapshot: () => JSON.stringify({ s, V: { hR: +V.hR.toFixed(3), hB: +V.hB.toFixed(3), lock: +V.lock.toFixed(3), crack: +V.crack.toFixed(3), spin: +V.spin.toFixed(1) }, FM: { t: FM.t, n: FM.bursts.length }, touring, tourI, view, readout: readout.textContent, fire: fireBtn.getAttribute("aria-pressed"), fireText: fireBtn.textContent, lv: [...lvlBtns].map((b) => b.getAttribute("aria-pressed")).join() }),
};
window.__fireEffects.initial = window.__fireEffects.snapshot();
