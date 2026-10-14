// Builds interactive/maneuvers/ooda-tempo/index.html: an isometric "tempo bench" made with the Anatomy kit
// (../../kit, MIT). Run: node interactive/maneuvers/ooda-tempo/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, makeSim, staleShare, readoutOf } from "./model.mjs";
import { GEO, statics, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks, fieldNear } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 350;

const PLATE = { x: -162, y: -104, w: 324, d: 204, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.DIAL.x, GEO.DIAL.y - GEO.DIAL.r, GEO.DIAL.top + 1]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 60 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

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
  out.push(k.dotsSvg(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

const sim0 = makeSim();
const START = {
  blue: { theta: 360 * MODEL.phase0.blue, T: MODEL.start.blue, pins: Array(8).fill(0), lit: true },
  red: { theta: 360 * MODEL.phase0.red, T: MODEL.start.red, pins: Array(8).fill(0), lit: false },
  diff: 0,
};
const ST = statics(k, P);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "oo-svg",
  label: "A bench model of two decision loops. On the left and right, a large gear wheel turns over a round scale divided into four quarters, each driven by a motor through a pinion and an idler gear. Around each wheel stand four small stations: a periscope (observe), a compass card (orient), a slide switch (decide) and a drop hammer (act). A cam block on each wheel trips the stations in turn; the left wheel's block is lit. Between the wheels a differential housing carries a dial whose hand turns once each time the left loop laps the right. In front of each wheel a tempo lever sets its cycle time, and a rack of eight pins records that side's last eight actions, a pin rising when the action was stale.",
  body: [plate(), `<g data-part="live">${scene(k, P, START, ST)}</g>`],
});

// ---- Battlefield view: the same simulation on full-bleed terrain at platoon scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape, shown with "slice" so the ground fills the card at every width.
const FW = 640, FH = 420;
const VC = [FG.O[0] + FG.VIEW.u * Math.cos(FG.ANG * Math.PI / 180), FG.O[1] + FG.VIEW.u * Math.sin(FG.ANG * Math.PI / 180)];
const PF = k.fitProjection([[54, -169], [212.5, 57.4], [-18.5, 219], [-177, -7.2]].map(([x, y]) => [VC[0] + (x - 17.75) / FG.VIEW.zoom, VC[1] + (y - 25.05) / FG.VIEW.zoom, 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const C0 = { ...MODEL.phase0 };
const SEEN0 = { blue: fieldNear(C0.red), red: fieldNear(C0.blue) };
const POSE0 = fieldPose({ c: C0 }, TF, { T: MODEL.start, seen: SEEN0 });
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "oo-field",
  label: "The same idea on a battlefield. Two platoons, the lit blue one on the left and a red one on the right, face each other across broken farmland with hedgerows, copses, low rises and a stream. Each platoon moves round three positions in turn: it halts to observe, then moves to its next position and fires as its action lands. The faster platoon moves and fires more often. Each side's fire sector, a fan on the ground, is laid on the position where it last saw the other side; when that picture is stale the fan points at an empty position, and the slower side's fire falls there while one of its fire teams rushes toward it. Men down on both sides lie greyed at each side's casualty collection point with a medic. Sizes, ranges, timings and casualty counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg oo-field"', 'class="iso-svg oo-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Boyd urged operating “at a faster tempo or rhythm than our adversaries—or, better yet,” getting “inside adversary’s Observation–Orientation–Decision–Action time cycle or loop” (Patterns of Conflict, p. 22). The wheels show the popular four-stage circle, not Boyd’s own sketch; cycle times and the stale rule are notional.";

const LABELS = {
  machine: "Tempo bench. Left and right arrow keys change Blue's cycle time, up and down change Red's; R clears the tallies; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys change Blue's cycle time, up and down change Red's; R clears the tallies; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 16",
  title: "Inside the loop",
  hint: "Hover sets Blue's tempo",
  readout: readoutOf(sim0, MODEL.start),
  keys: [
    { mark: "lit", label: "Blue's rider: the cam that runs Blue's loop" },
    { mark: "raised", label: "Stations: observe, orient, decide, act" },
    { mark: "edge", label: "Pins: last 8 actions; a raised pin was stale" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage oo-stage" tabindex="0" role="group" aria-label="${LABELS.machine}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("cycle times and the stale rule are notional.", "cycle times, the stale rule, unit sizes, ranges and casualty counts are notional.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Blue platoon (lit); its fan: where it last saw Red" },
    { mark: "red", label: "Red platoon; its fan: where it last saw Blue" },
    { mark: "edge", label: "Greyed figures: men down on each side (notional)" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="oo-legend oo-legend-machine">${m}</div><div class="oo-legend oo-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, MODEL, START, LABELS, SEEN0 };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, START, LABELS } = DATA;
const K = { ringSeam, depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, lineOnTop, ring, sideArc, planOutline, insetPlan, corners, haloOf, faceTextSvg, topMatrix, radialTicks };
const root = document.querySelector(".oo-figure");
const stage = root.querySelector(".oo-stage");
const svg = stage.querySelector(".oo-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const blueIn = root.querySelector("#oo-blue");
const redIn = root.querySelector("#oo-red");
const blueOut = root.querySelector("#oo-blue-v");
const redOut = root.querySelector("#oo-red-v");
const resetBtn = root.querySelector("#oo-reset");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const ST = statics(K, P);
const fieldSvgEl = stage.querySelector(".oo-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const TF = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, strikes: [], seen: { ...DATA.SEEN0 }, T: null };
let stageF = null, fire = null, marksSig = "";
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const [LO, HI] = DATA.MODEL.range;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const snap = (v) => clamp(Math.round(v * 2) / 2, LO, HI);
let sim = makeSim(DATA.MODEL);
const target = { ...DATA.MODEL.start };
const S = JSON.parse(JSON.stringify(START));
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
const TOUR = [[0, 6, 6], [3, 3, 6]];
const TOUR_LEN = 15;
function tourAt(t) {
  t %= TOUR_LEN;
  let step = TOUR[0];
  for (const row of TOUR) if (t >= row[0]) step = row;
  return step;
}
function syncInputs() {
  if (document.activeElement !== blueIn) blueIn.value = String(target.blue);
  if (document.activeElement !== redIn) redIn.value = String(target.red);
  blueOut.textContent = target.blue + " h";
  redOut.textContent = target.red + " h";
}
// Battlefield: every action that lands becomes a strike. A fresh one falls on the enemy platoon; a
// stale one on the position where this side last saw the enemy (never the one it now holds). Then
// this side's picture is renewed: it observes where the enemy is now.
function onLanded(events) {
  for (const ev of events) {
    const foe = ev.side === "blue" ? "red" : "blue";
    const near = fieldNear(sim.c[foe]);
    if (ev.stale) {
      let slot = FM.seen[ev.side];
      if (slot === near) slot = (near + 2) % 3;
      FM.strikes.push({ side: ev.side, stale: true, slot, t0: FM.t });
    } else FM.strikes.push({ side: ev.side, stale: false, t0: FM.t });
    FM.seen[ev.side] = near;
  }
  FM.strikes = FM.strikes.filter((s) => FM.t - s.t0 < FG.STRIKE_T);
}
// Reduced motion: one still frame with the slower side's action landing, stale if the tempos make it so.
function stillField() {
  const slow = target.blue > target.red ? "blue" : "red", fast = slow === "blue" ? "red" : "blue";
  const share = slow === "blue" ? staleShare(target.blue, target.red) : staleShare(target.red, target.blue);
  const near = fieldNear(sim.c[fast]);
  const stale = share > 0;
  const slot = (near + 2) % 3;
  return { t: 10, T: target, still: true, seen: { [slow]: stale ? slot : near, [fast]: fieldNear(sim.c[slow]) }, strikes: [{ side: slow, stale, slot, t0: 9.38 }] };
}
// Battlefield frame: soldiers move by translate and re-render only when their look changes; the fire
// layer writes attributes only; the fans redraw only when a position or a picture changes.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  FM.T = target;
  const M = still.matches ? stillField() : FM;
  const pose = fieldPose({ c: sim.c }, TF, M);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = pose.seen.blue + "|" + pose.seen.red + "|" + pose.anchors.blue.near + "|" + pose.anchors.red.near;
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, pose); marksSig = sig; }
  const all = { tracers: [], flashes: [], puffs: [], smoke: [] };
  for (const g of pose.shots) { const o = trShots(g.streams, g.t); for (const key in all) all[key].push(...o[key]); }
  fire.draw(all);
}
function draw() {
  if (view === "field") drawField();
  else layer.innerHTML = scene(K, P, S, ST);
  const text = view === "field" ? (still.matches ? fieldStillReadoutOf(target) : fieldReadoutOf(sim, target)) : (still.matches ? stillReadoutOf(target) : readoutOf(sim, target));
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-description", text);
  syncInputs();
}
function settleStill() {
  S.blue.T = target.blue; S.red.T = target.red;
  draw();
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) {
    clock += dt;
    const [, b, r] = tourAt(clock);
    target.blue = b; target.red = r;
  }
  const ease = (x, to, tau) => x + (to - x) * (1 - Math.exp(-dt / tau));
  for (const side of SIDES) {
    S[side].T = ease(S[side].T, target[side], 0.35);
  }
  const hours = (dt / DATA.MODEL.hourSec) * (view === "field" ? FIELD.rate : 1);
  FM.t += dt;
  onLanded(advance(sim, hours, { blue: S.blue.T, red: S.red.T }, DATA.MODEL));
  for (const side of SIDES) {
    S[side].theta = 360 * sim.c[side];
    const log = sim.log[side];
    for (let i = 0; i < 8; i++) {
      const v = log[log.length - 1 - i];
      S[side].pins[i] = ease(S[side].pins[i], v ? 1 : 0, 0.12);
    }
  }
  S.diff = sim.c.blue - sim.c.red - (DATA.MODEL.phase0.blue - DATA.MODEL.phase0.red);
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (still.matches) { settleStill(); return; } if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const setTempo = (side, v) => { target[side] = snap(v); hold(); };
function reset() {
  sim = makeSim(DATA.MODEL);
  sim.c.blue = S.blue.theta / 360; sim.c.red = S.red.theta / 360;
  hold();
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const r = stage.getBoundingClientRect();
  const f = clamp((event.clientX - r.left) / r.width, 0, 1);
  const v = snap(HI - f * (HI - LO));
  if (v !== target.blue || touring) setTempo("blue", v);
});
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") setTempo("blue", target.blue + 0.5);
  else if (event.key === "ArrowRight") setTempo("blue", target.blue - 0.5);
  else if (event.key === "ArrowUp") setTempo("red", target.red - 0.5);
  else if (event.key === "ArrowDown") setTempo("red", target.red + 0.5);
  else if (event.key === "r" || event.key === "R") reset();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
blueIn.addEventListener("input", () => setTempo("blue", Number(blueIn.value)));
redIn.addEventListener("input", () => setTempo("red", Number(redIn.value)));
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
still.addEventListener("change", () => { touring = !still.matches; run(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setView(view, false);
window.__oodaTempo = { S, sim: () => sim, target, setTempo, reset, setView, view: () => view, FM, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show, and the part count.
for (const [b, r] of [[6, 6], [4, 6], [3, 6], [9, 6]]) console.log(`Blue ${b} h, Red ${r} h → Red stale ${Math.round(staleShare(r, b) * 100)}%, Blue stale ${Math.round(staleShare(b, r) * 100)}%`);
const solids = (svg.match(/class="iso-solid/g) || []).length;
console.log("field: men", POSE0.men.length, "static items", FIELD.items.length, "field paths", (fieldSvg.match(/<path/g) || []).length);
console.log("solids", solids, "paths", (svg.match(/<path/g) || []).length, "wrote index.html", PAGE.length, "bytes");
