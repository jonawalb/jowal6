// Builds interactive/maneuvers/encirclement/index.html: an isometric iris-and-screw bench made with
// the Anatomy kit (../../kit, MIT), plus a Battlefield view of the same state drawn with the terrain
// kit (../../kit/terrain.mjs; scripts/field-scene.mjs).
// Run: node interactive/maneuvers/encirclement/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, stateAt, readoutOf, timesOf, thinOf } from "./model.mjs";
import { GEO, scene, screwSvg, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 380;
const RAD = Math.PI / 180;

const PLATE = { x: -132, y: -146, w: 268, d: 288, r: 12 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIAL = { x: 104, y: 92, r: 13, z: 12, h: 6 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: -118, y: 88, w: 30, d: 18, r: 1.5 };
const RULER = { x: -60, y: 132, w: 110, d: 6, r: 1 };
const RING_R = GEO.RING[1];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...[0, 90, 180, 270].map((a) => [...GEO.at(GEO.RIM, a), 33])],
  WIDTH, HEIGHT, { pad: 18, azimuth: GEO.AZ },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const dep = (x, y, z = 0) => k.depthOf([x, y, z], P);
const byDepth = (points) => [...points].sort((a, b) => dep(a[0], a[1]) - dep(b[0], b[1]));
const radialBox = (r0, r1, w, h) => {
  const c = Math.cos(w * RAD), s = Math.sin(w * RAD);
  return [[r0 * c + h * s, r0 * s - h * c], [r1 * c + h * s, r1 * s - h * c], [r1 * c - h * s, r1 * s + h * c], [r0 * c - h * s, r0 * s + h * c]];
};

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -6, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[22, 5], [16, 9], [19, 13]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  // km ruler along the front edge: a minor tick every 0.1 km, a major every 0.5 km
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RULER.x + 4, RULER.x + RULER.w - 4, MODEL.KM / 10, 5, RULER.y, 0.6, [1.8, 3.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

// The housing and scroll ring (one turned disc, a seam between them), and the escape tray behind.
function housing() {
  const out = [];
  // tray: a raised table beyond the ring on the seam bearing, with an end stop
  const tray = radialBox(108, 141, GEO.SEAM, 19);
  out.push(S(k.extrude(tray, 0, 5, P, { bevel: 0.5 }), { tone: "mid" }));
  out.push(L(k.onTop(radialBox(114, 134, GEO.SEAM, 16), 5, P, true), { tone: "faint" }));
  out.push(S(k.extrude(radialBox(136, 140, GEO.SEAM, 15), 5, 6, P, { bevel: 0.4 }), { tone: "mid" }));
  out.push(Dt([GEO.at(138, GEO.SEAM - 4.8), GEO.at(138, GEO.SEAM + 4.8)].map(([x, y]) => at([x, y, 11])), { size: 0.45 }));
  out.push(`<path class="iso-halo" d="${k.cylinder(0, 0, RING_R + 2, 0, 0.1, P, 72).fill}" style="filter:blur(3px)"/>`);
  out.push(S(k.cylinder(0, 0, RING_R, 0, 5, P, 96, 0.8), { tone: "mid", inner: L(k.sideArc(0, 0, RING_R, 2.5, P, 48), { tone: "faint" }) }));
  out.push(L(k.ring(0, 0, GEO.HOUSE + 0.2, 5, P, 96), { tone: "lo" }));
  out.push(L(k.ring(0, 0, GEO.RAIL[0] - 2, 5, P, 64), { tone: "faint" }));
  // engraved rings where the leaves stand at linkup and after the squeeze
  out.push(L(k.ring(0, 0, GEO.R0, 5, P, 96) + k.ring(0, 0, GEO.RF, 5, P, 64), { tone: "faint" }));
  return out.join("");
}

// The gap dial: full scale 1.5 km, a lit mark at the gap a breakout needs.
const DIAL_FULL = 1.5;
function gauge() {
  const out = [];
  const ped = { x: DIAL.x - 12, y: DIAL.y - 12, w: 24, d: 24, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 4, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 4, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.2).map(([x, y]) => at([x, y, 4])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 4.6, 4, 2.2, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 2.8, 6.2, DIAL.z - 6.2, P, 24), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 56, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 1.8, DIAL.top, P, 64), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 1.8, 15, 5, DIAL.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // the breakout mark: the gap a breakout needs (MODEL.BW)
  const am = -0.75 * Math.PI + (MODEL.BW / DIAL_FULL) * 1.5 * Math.PI, R1 = DIAL.r - 1.8;
  out.push(L(k.lineOnTop([DIAL.x + Math.sin(am) * (R1 - 3.4), DIAL.y - Math.cos(am) * (R1 - 3.4)], [DIAL.x + Math.sin(am) * R1, DIAL.y - Math.cos(am) * R1], DIAL.top, P), { tone: "hi" }));
  out.push(k.faceTextSvg(k.topMatrix([DIAL.x - 3.2, DIAL.y + 6.2], DIAL.top, P, "x"), "GAP", { size: 2, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="hi" data-free="" d="${needle(k, P, DIAL, 1)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.4, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}

const START_N = 8;
const REST = stateAt(-1, START_N);
const GAUGE = gauge();
const live0 = scene(k, P, REST, START_N) + `<g data-part="screw">${screwSvg(k, P, 0)}</g>` + `<g data-part="gauge">${GAUGE}</g>`;
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "ec-svg",
  label: "A bench model of an encirclement. A block standing for the enemy force sits on a round hub in the middle of a turned housing. Round it, on radial slides, stand curved leaves like those of an iris diaphragm: each leaf is one company of the ring. The one or two leaves in front start in contact; the rest slide in from the rim in order, from the front round both sides, until the two lit lead leaves close behind the block: the linkup. A breakout block then runs out along a slide behind the enemy, through the seam between the two lit leaves. If the leaves are few and the gaps between them wide, it gets through onto a tray beyond the ring; if not, it stops against them and falls back. Then a lead screw at the front turns the scroll ring and pulls every leaf in toward the hub together: the squeeze. A dial reads the widest gap between leaves against the gap a breakout needs.",
  body: [plate(), housing(), `<g data-part="live">${live0}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain (kit/terrain.mjs) ----
const FW = 640, FH = 420;
const PF = k.fitProjection([[...pol(118, FG.AZ), 0], [...pol(128, FG.SEAM), 0], [...pol(132, FG.AZ + 90), 0], [...pol(132, FG.AZ - 90), 0]], FW, FH, { pad: 0, azimuth: FG.AZ, elevation: 42 });
function pol(r, w) { return [r * Math.cos(w * RAD), r * Math.sin(w * RAD)]; }
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const POSE0 = fieldPose({ ...REST, N: START_N }, GEO, TF);
const unitSvg = (KK, PP, m) => (m.kind ? trVehicle(KK, PP, trFaceStep(m.face)) : trSoldier(KK, PP, { ...m, face: trFaceStep(m.face) }));
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(k, PF, m)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "ec-field",
  label: "The same idea on a battlefield. An enemy battalion of three companies of armored vehicles and a headquarters holds a village on a low rise where two roads cross. Blue companies of three vehicles each close a ring round it: one or two in front are already in contact, and the rest come round both sides in two columns, each company stepping in to its place on the ring, until the two lit lead companies meet behind the village at a chalk-marked contact point. Each company's sector of fire is drawn on the ground; the gaps between sectors are the ring's thin places. The enemy's lead company then tries to break out along the road behind the village, through the seam where the arms met. Through a wide gap it gets away, losing a vehicle; against a closed seam it is stopped and falls back. Then the ring closes in on the village, firing as it goes, and the enemy that is left surrenders under a white flag. Greyed vehicles, some smoking, and greyed crewmen lying beside them are losses on both sides; a casualty evacuation vehicle drives back to the rear. Sizes, distances, timings and casualty counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg ec-field"', 'class="iso-svg ec-field" preserveAspectRatio="xMidYMid slice"');

const LABELS = {
  machine: "Encirclement bench. Left and right arrow keys set how many companies are in the ring; Enter or click runs it; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys set how many companies are in the ring; Enter or click runs it; V switches to the Machine view.",
};

const CAPTION = "FM 3-90 (2023): the encircling force “completes the encirclement when it cuts all enemy ground LOCs. This generally occurs when the two arms of a double envelopment complete their linkup.” Here the leaves are the ring’s companies and the screw is the squeeze. Every distance and time on the bench is a notional teaching value, not data.";

const card = k.plateHtml({
  fig: "Fig 34",
  title: "Encirclement",
  hint: "Click to run · ← → companies",
  readout: "",
  keys: [
    { mark: "lit", label: "Lead leaves of the two arms: they close the ring behind the enemy" },
    { mark: "raised", label: "Leaves: the ring’s companies; the block on the hub: the enemy" },
    { mark: "edge", label: "Dial: the widest gap in the ring; the mark is what a breakout needs" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage ec-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="${MODEL.N[0]}" aria-valuemax="${MODEL.N[1]}" aria-valuenow="${START_N}">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = CAPTION.replace("Here the leaves are the ring’s companies and the screw is the squeeze. Every distance and time on the bench is a notional teaching value, not data.", "Every unit size, distance, time and casualty count here is a notional teaching value, not data.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Lead companies of the two arms (lit)" },
    { mark: "blue", label: "The ring: companies of three vehicles, with their sectors of fire" },
    { mark: "red", label: "Enemy: a battalion of three companies and a headquarters" },
  ], caption: FIELD_CAPTION, body: "",
}));
const cardBoth = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="ec-legend ec-legend-machine">${m}</div><div class="ec-legend ec-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, MODEL, DIAL, DIAL_FULL, START_N, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, DIAL_FULL, START_N, LABELS } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf };
const root = document.querySelector(".ec-figure");
const stage = root.querySelector(".ec-stage");
const svg = stage.querySelector(".ec-svg");
const layer = svg.querySelector('[data-part="live"]');
const gaugeHtml = svg.querySelector('[data-part="gauge"]').outerHTML;
const readout = root.querySelector("[data-readout]");
const runBtn = root.querySelector("#ec-run");
const slider = root.querySelector("#ec-n");
const sliderOut = root.querySelector("#ec-n-out");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const fieldSvgEl = stage.querySelector(".ec-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const TF = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "";
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const NR = DATA.MODEL.N;
let N = START_N, runN = N;
let t = -1, running = false, resetting = 0;
let touring = !still.matches, tourStep = 0, wait = 1.2, last = 0, frame = 0, visible = false, idle = 0;
const TOUR = [5, 8];
const END = endOf();
let shown = stateAt(-1, N);
function setN(n) {
  N = Math.round(clamp(n, NR[0], NR[1]));
  if (document.activeElement !== slider) slider.value = String(N);
  sliderOut.textContent = String(N);
  stage.setAttribute("aria-valuenow", String(N));
}
let fieldHold = null;
function drawField(s, n) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF, { tracers: 72, puffs: 56, smoke: 56, flashes: 36 }); }
  const pose = fieldPose({ ...s, N: n }, GEO, TF, FM);
  const list = pose.men.map((m) => {
    const f = trFaceStep(m.face);
    const look = (m.kind ? "v|" + f : trLook(m)) + "|" + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, m.kind ? trVehicle(K, PF, f) : trSoldier(K, PF, { ...m, face: f })); return LOOKS.get(look); } };
  });
  if (pose.done) { const z = TF.height(0, 0); list.push({ id: "flag", key: depthOf([0, 0, 0], PF) + 0.5, at: iso([0, 0, z + 1.2], PF), look: "flag", side: "h", svg: () => flagSvg(K, PF) }); }
  stageF.put(list);
  const sig = pose.fans.map((f) => f.x.toFixed(1) + "," + f.y.toFixed(1)).join("|");
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, pose); marksSig = sig; }
  const ft = still.matches ? 4.37 : FM.t;
  const shots = trShots(pose.streams, ft);
  shots.smoke = shots.smoke.concat(fieldSmoke(pose, ft));
  fire.draw(shots);
}
function drawMachine(s, n) {
  layer.innerHTML = scene(K, P, s, n) + '<g data-part="screw">' + screwSvg(K, P, (s.sq || 0) * 3) + "</g>" + gaugeHtml;
  const g = s.linked ? Math.max(0, s.gap) / DIAL_FULL : 1;
  const nd = layer.querySelector('[data-part="needle"]');
  if (nd) nd.setAttribute("d", needle(K, P, DIAL, g));
}
function draw(s) {
  const n = running || resetting || s.t > 0 ? runN : N;
  if (view === "field") drawField(fieldHold || s, n);
  else drawMachine(s, n);
  const text = readoutOf(s, n);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function start() { fieldHold = null; runN = N; t = 0; running = true; resetting = 0; }
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (still.matches && running) t = END - 0.01;
  if (running) {
    t += dt * (view === "field" ? FG.RATE : 1);
    shown = stateAt(t, runN);
    if (t >= END) { running = false; resetting = 1; wait = touring ? 1.6 : 0; }
  } else if (resetting) {
    if (wait > 0) wait -= dt;
    else { shown = stateAt(-1, N); resetting = 0; wait = 0.9; }
  } else if (touring) {
    wait -= dt;
    if (wait <= 0) { setN(TOUR[tourStep % TOUR.length]); tourStep++; start(); }
  }
  FM.t += dt;
  draw(shown);
  const busy = running || resetting || touring || (view === "field" && !still.matches);
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { if (!running && !resetting) { touring = !still.matches; wait = 0.5; run(); } }, 12000);
};
function go() { hold(); if (!running) start(); run(); }
function steer(n) { hold(); setN(n); if (!running) { resetting = 0; shown = stateAt(-1, N); draw(shown); } run(); }
stage.addEventListener("click", go);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(N + 1);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(N - 1);
  else if (event.key === " " || event.key === "Enter") go();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
runBtn.addEventListener("click", go);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw(shown);
  run();
}
slider.addEventListener("input", () => steer(Number(slider.value)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setN(N);
setView(view, false);
window.__encirclement = {
  setN: steer, run: go, setView, view: () => view,
  pose: (n, time) => { touring = false; running = false; resetting = 0; clearTimeout(idle); setN(n); runN = N; t = time; shown = stateAt(time, N); draw(shown); },
  state: () => ({ N, t, running, shown }),
  stop: () => { touring = false; clearTimeout(idle); },
};
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => cardBoth)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
const T = timesOf();
for (const n of [5, 7, 8, 10]) console.log(`N ${n}: thin ${thinOf(n)};`, readoutOf(stateAt(T.hit + 0.01, n), n), "|", readoutOf(stateAt(T.end, n), n));
console.log("solids", (svg.match(/class="iso-solid/g) || []).length, "wrote index.html", PAGE.length, "bytes");
