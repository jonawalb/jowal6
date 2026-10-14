// Builds interactive/maneuvers/breach-sosra/index.html: an isometric five-station lock bench made with
// the Anatomy kit (../../kit, MIT) plus a company-breach Battlefield view (../../kit/terrain.mjs).
// Run: node interactive/maneuvers/breach-sosra/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, NAMES, allOn, stateAt, finalState, readoutField, readoutMachine } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 420;
const PLATE = { x: -82, y: -60, w: 184, d: 122, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;
const LABEL = { x: 66, y: 50, w: 22, d: 8, r: 1.5 };
const G = GEO;
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [G.ST_X[2], G.ST_Y, 26], [G.DIAL.x, G.DIAL.y, G.DIAL.top + 3], [G.SCREEN_X, 10, 14]],
  WIDTH, HEIGHT, { pad: 10, azimuth: 52, elevation: 34 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 18))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[16, 3]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 4, LABEL.y + dy], [LABEL.x + 4 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.4, LABEL.y + 2.4, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8])], { size: 0.42 }));
  // a rule along the front edge with a tick every 10 units
  const t = k.topTicks([G.X0, PLATE.y + PLATE.d - 10], [G.X1, PLATE.y + PLATE.d - 10], 4, 5, 0, 0, [1.4, 2.6], P, "x");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

const RUN0 = stateAt(allOn(), 0, false);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "br-svg",
  label: "A bench model of the breaching fundamentals. Five stations stand in a row, in the manual's order: suppress, obscure, secure, reduce, assault. Each has a pin that drops when its fundamental is set, and a bar below grows along them. In front, a belt of tines crosses two rails: a sled on one rail, the breach force, reaches into the belt and retracts the tines in the lane, while a screen rises for the smoke and a press holds a pop-up target down. When all five are set the lit carriage on the other rail, the assault, runs through the lane to the far side. Leave one out and the chain stops there and the carriage jams at the belt. A dial reads the lane reduced and a rack shows men down. Times, rates and losses are notional.",
  body: [plate(), `<g data-part="live">${scene(k, P, RUN0)}</g>`],
});

// ---- Battlefield view: the same run on full-bleed terrain at company scale ----
const FW = 640, FH = 420;
const AZ = 80 * Math.PI / 180, EL = 42 * Math.PI / 180;
const KK = FW / 270, DU = 270, DV = FH / (KK * Math.sin(EL));
const CEN = [-8, -16];
const uc = CEN[0] * Math.sin(AZ) - CEN[1] * Math.cos(AZ), vc = CEN[0] * Math.cos(AZ) + CEN[1] * Math.sin(AZ);
const toWorld = (u, v) => [u * Math.sin(AZ) + v * Math.cos(AZ), -u * Math.cos(AZ) + v * Math.sin(AZ), 0];
const PF = k.fitProjection([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => toWorld(uc + a * DU / 2, vc + b * DV / 2)), FW, FH, { pad: 0, azimuth: 80, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose(stateAt(allOn(), 0, false), T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}" transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "br-field",
  label: "The same idea on a battlefield, a rifle company breaching a belt of wire and mines covered by an enemy position. A support force of two machine guns with assistants and riflemen opens fire from the left and holds the enemy down. Smoke builds in a line between the obstacle and the enemy. A breach force of eight moves up and secures the point of breach, then clears a lane through the wire and mines and marks it inside a lit chalk box. The assault force of twelve passes through the lane and takes the far side. Greyed figures are men down. Leave a fundamental out and it shows. Sizes, ranges, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="smoke" class="br-smoke"></g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg br-field"', 'class="iso-svg br-field" preserveAspectRatio="xMidYMid slice" data-l1="0" data-l2="0" data-lm="0"');

const CAPTION = "Army doctrine names the breaching fundamentals in this order: suppress, obscure, secure, reduce, assault, described by the memory aid SOSRA (FM 3-90, 1 May 2023, para. 18-23; ATP 3-21.10, 1 June 2026, para. F-23). The bench sets them in that order. Times, rates and losses are notional.";
const FIELD_CAPTION = "The same five fundamentals on the ground, with the support, breach and assault forces. Unit sizes, ranges, timings and losses are notional.";
const LABELS = {
  machine: "Breaching bench. Keys 1 to 5 toggle the fundamentals; N applies the next; Space starts the breach; V switches to the Battlefield view.",
  field: "Battlefield. Keys 1 to 5 toggle the fundamentals; N applies the next; Space starts the breach; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 44",
  title: "Breaching (SOSRA)",
  hint: "Click: next, then start",
  readout: "",
  keys: [
    { mark: "lit", label: "The assault carriage: the force that passes the lane" },
    { mark: "raised", label: "Five stations in order; the belt of tines is the obstacle" },
    { mark: "edge", label: "Sled: the breach force; press: the support force" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage br-stage" tabindex="0" role="group" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "blue", label: "Friendly: support, breach and assault forces" },
    { mark: "red", label: "Enemy: six defenders in nests and holes" },
    { mark: "dashed", label: "Chalk: support position, the lit reduction area" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="br-legend br-legend-machine">${m}</div><div class="br-legend br-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, LABELS } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks };
const root = document.querySelector(".br-figure");
const stage = root.querySelector(".br-stage");
const svg = stage.querySelector(".br-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const nextBtn = root.querySelector("#br-next");
const goBtn = root.querySelector("#br-go");
const boxes = [...root.querySelectorAll(".br-step input")];
const fieldSvgEl = stage.querySelector(".br-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const smokeEl = fieldSvgEl.querySelector('[data-part="smoke"]');
const T = fieldTerrain();
const LOOKS = new Map();
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Click: next, then start", field: "Click: next, then start" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
// the applied fundamentals, and the run (t in figure seconds, released or waiting)
let cfg = allOn();
let R = { t: 0, released: false };
const FM = { t: 0 };
let stageF = null, fire = null;
let touring = !still.matches, last = 0, frame = 0, visible = false, idle = 0, wait = 0;
// the idle tour: apply the five in order and go; then without suppress; then without reduce
const PLANS = [[], [0], [3]];
const TOUR0 = () => ({ plan: 0, stage: "pre", timer: 0, k: 0 });
let tour = TOUR0();
const cur = () => stateAt(cfg, R.t, R.released);
function setCfg(next) {
  cfg = next.slice();
  boxes.forEach((b, i) => { b.checked = cfg[i]; });
}
function newRun() { R = { t: 0, released: false }; wait = 0; }
function release() { if (!R.released) { R = { t: 0, released: true }; wait = 0; } }
const PUFFS = Array.from({ length: 13 }, () => {
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("visibility", "hidden");
  smokeEl.appendChild(c);
  return c;
});
const kF = cameraOf(PF).k;
function drawSmoke(S) {
  const list = smokePuffs(S, FM.t);
  PUFFS.forEach((c, i) => {
    const p = list[i];
    if (!p) { if (c._on) { c.setAttribute("visibility", "hidden"); c._on = false; } return; }
    if (!c._on) { c.removeAttribute("visibility"); c._on = true; }
    const [x, y] = iso(p.p, PF);
    c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1)); c.setAttribute("r", (p.r * kF).toFixed(1)); c.setAttribute("opacity", p.a.toFixed(2));
  });
}
function drawField(S) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const l1 = S.lane > 0.35 ? "1" : "0", l2 = S.lane > 0.7 ? "1" : "0", lm = S.lane >= 0.99 ? "1" : "0";
  if (fieldSvgEl._sig !== l1 + l2 + lm) {
    fieldSvgEl.setAttribute("data-l1", l1); fieldSvgEl.setAttribute("data-l2", l2); fieldSvgEl.setAttribute("data-lm", lm);
    fieldSvgEl._sig = l1 + l2 + lm;
  }
  const pose = fieldPose(S, T);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + "|" + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: false,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  fire.draw(trShots(pose.streams, FM.t));
  drawSmoke(S);
}
function draw() {
  const S = cur();
  if (view === "field") drawField(S);
  else layer.innerHTML = scene(K, P, S);
  const text = view === "field" ? readoutField(S) : readoutMachine(S);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text + " (counts are notional)");
  goBtn.disabled = R.released && !stateAt(cfg, R.t, true).done;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (!calm) {
    FM.t += dt;
    if (R.released) {
      R.t += dt;
      if (cur().done) {
        wait += dt;
        if (wait > 1.1) { if (touring) advanceTour(); else newRun(); }
      }
    } else if (touring) tourTick(dt);
  }
  draw();
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
// the tour: clear, apply the fundamentals one by one in the manual's order, start, watch, go again
function tourTick(dt) {
  tour.timer += dt;
  const plan = PLANS[tour.plan % PLANS.length];
  if (tour.stage === "pre") { if (tour.timer > 1.2) release(); return; }
  if (tour.stage === "clear") { if (tour.timer > 0.6) { tour.stage = "build"; tour.k = 0; tour.timer = 0; } return; }
  if (tour.stage === "build" && tour.timer > 0.7) {
    tour.timer = 0;
    if (tour.k < 5) { if (!plan.includes(tour.k)) { const c = cfg.slice(); c[tour.k] = true; setCfg(c); } tour.k++; }
    else { newRun(); release(); }
  }
}
function advanceTour() {
  tour.plan++; tour.stage = "clear"; tour.timer = 0; wait = 0;
  setCfg([false, false, false, false, false]);
  newRun();
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } if (still.matches) tick(performance.now()); };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tour = TOUR0(); tour.stage = R.released ? "build" : "pre"; run(); }, 14000);
  run();
};
function toggle(i, on) {
  const c = cfg.slice();
  c[i] = on === undefined ? !c[i] : on;
  setCfg(c);
  newRun();
  hold();
}
function buildNext() {
  if (R.released && !cur().done) return;
  const i = cfg.indexOf(false);
  if (i === -1) { goNow(); return; }
  toggle(i, true);
}
function goNow() {
  if (R.released && cur().done) newRun();
  if (!R.released) release();
  hold();
}
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
stage.addEventListener("click", buildNext);
stage.addEventListener("keydown", (event) => {
  if (event.key >= "1" && event.key <= "5") toggle(Number(event.key) - 1);
  else if (event.key === "n" || event.key === "N") buildNext();
  else if (event.key === " " || event.key === "Enter") goNow();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
nextBtn.addEventListener("click", buildNext);
goBtn.addEventListener("click", goNow);
boxes.forEach((b, i) => b.addEventListener("change", () => toggle(i, b.checked)));
// Reset: back to the state the page opened in (all five applied, waiting, the tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function stillRun() { R = { t: 10, released: true }; FM.t = 10; }
function reset() {
  clearTimeout(idle);
  wait = 0;
  FM.t = 0;
  setCfg(allOn());
  newRun();
  tour = TOUR0();
  if (still.matches) stillRun();
  touring = !still.matches;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) stillRun();
setCfg(cfg);
setView(view, false);
const snapshot = () => JSON.stringify({ cfg, R, FM, wait, touring, tour, boxes: boxes.map((b) => b.checked), readout: readout.textContent });
const LOAD = { field: null, machine: null };
LOAD[view] = snapshot();
window.__br = {
  get R() { return R; }, get cfg() { return cfg; }, FM, toggle, buildNext, goNow, setView, reset, view: () => view,
  snapshot, load: LOAD,
  stop: () => { touring = false; clearTimeout(idle); },
  // jump to a state (for tests and stills): which fundamentals, figure seconds into the run (null = waiting)
  seek: (c, t) => { setCfg(c); R = t === null ? { t: 0, released: false } : { t, released: true }; FM.t = t || 0; draw(); },
};
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (let i = -1; i < 5; i++) { const c = allOn(); if (i >= 0) c[i] = false; console.log(i < 0 ? "all" : "no " + NAMES[i], "→", readoutField(finalState(c))); }
console.log("start:", readoutMachine(RUN0), "|", readoutField(RUN0));
console.log("wrote index.html", PAGE.length, "bytes; field men", POSE0.men.length);
