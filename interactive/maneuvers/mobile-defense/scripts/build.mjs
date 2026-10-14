// Builds interactive/maneuvers/mobile-defense/index.html: an isometric "sprung trap" made with
// the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/mobile-defense/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, forces, enemyAt, fixNeeded, outcome, band, runAt, ratioAt } from "./model.mjs";
import { GEO, fixtures, scene, frontAt, sliderX } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, mdTruck } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -156, y: -50, w: 298, d: 136, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: 98, y: -40, w: 30, d: 14, r: 1.5 };
const STRIP = { x: -140, y: 66, w: 100, d: 11, r: 1.5 };
const SLOT = { x: GEO.SLIDER.x0 - 2, y: GEO.SLIDER.y - 0.6, w: GEO.SLIDER.x1 - GEO.SLIDER.x0 + 4, d: 4.2, r: 2 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.LATCH[0], GEO.LATCH[1], 31], [GEO.DIAL.x, GEO.DIAL.y, GEO.DIAL.top + 2], [GEO.PV[0], GEO.PV[1], 25]],
  WIDTH, HEIGHT, { pad: 16, azimuth: 50 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
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
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[20, 4.2], [14, 7.2], [17, 10.2]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The track: sleepers, two rails, the fixing stop's housing, and a pocket-depth ruler.
function track() {
  const out = [];
  const sleepers = [];
  for (let x = -136; x <= 118; x += 12) if (x < 54 || x > 82) sleepers.push(x);
  for (const x of sleepers) out.push(S(k.slabOf({ x: x - 2, y: -15, w: 4, d: 30, r: 0.6 }, 0, 1.2, P, 2), { tone: "lo" }));
  for (const y of [-11.5, 8.5]) {
    out.push(S(k.slabOf({ x: -142, y, w: 265, d: 3, r: 1 }, 1.2, 2.8, P, 3, 0.3), { tone: "mid" }));
    out.push(Dt([-130, -82, -34, 14, 98, 116].map((x) => at([x, y + 1.5, 4])), { size: 0.38 }));
  }
  // housing for the sprung stop, between the rails
  const hp = { x: 58, y: -6.6, w: 16, d: 13.2, r: 1.2 };
  out.push(S(k.slabOf(hp, 0, GEO.HOUSING, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline({ x: 61.4, y: -5.4, w: 9.2, d: 10.8, r: 1 }, GEO.HOUSING, P, 2), { tone: "lo" }));
  out.push(Dt([[59.6, -5], [72.4, -5], [59.6, 5], [72.4, 5]].map(([x, y]) => at([x, y, GEO.HOUSING])), { size: 0.4 }));
  // pocket ruler along the far rail: from the wall mouth to the stop
  const ruler = { x: -44, y: -21, w: 106, d: 4.5, r: 0.8 };
  out.push(S(k.slabOf(ruler, 0, 0.6, P, 2), { tone: "lo", crease: "none" }));
  const minor = [], major = [];
  for (let x = -40, i = 0; x <= 58.01; x += 4.9, i++) (i % 5 === 0 ? major : minor).push(k.lineOnTop([x, -16.5], [x, -16.5 - (i % 5 === 0 ? 2.8 : 1.6)], 0.6, P));
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  // rest pedestal the cocked head sits on
  const rest = { x: GEO.LATCH[0] - 4.5, y: GEO.PV[1] - 5, w: 9, d: 10, r: 1 };
  out.push(S(k.slabOf(rest, 0, 10, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(rest, 5, P, 3), { tone: "faint" }) }));
  out.push(Dt([at([rest.x + 4.5, rest.y + 2, 10]), at([rest.x + 4.5, rest.y + 8, 10])], { size: 0.4 }));
  return out.join("");
}

// The split strip: ticks for 30% to 80% striking share, a slot and two end stops.
function splitStrip() {
  const out = [];
  out.push(S(k.slabOf(STRIP, 0, 1.2, P, 3, 0.2), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(SLOT, 1.2, P, 3), { tone: "faint" }));
  const minor = [], major = [];
  const [s0, s1] = MODEL.split;
  for (let pct = Math.round(s0 * 100), i = 0; pct <= Math.round(s1 * 100); pct += 5, i++) {
    const x = sliderX(pct / 100, MODEL.split);
    (pct % 10 === 0 ? major : minor).push(k.lineOnTop([x, STRIP.y], [x, STRIP.y + (pct % 10 === 0 ? 2.6 : 1.5)], 1.2, P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  for (const x of [STRIP.x + 2, STRIP.x + STRIP.w - 5]) {
    out.push(S(k.slabOf({ x, y: STRIP.y + 4, w: 3, d: 6.2, r: 0.6 }, 1.2, 2.6, P, 2), { tone: "mid" }));
  }
  out.push(Dt([at([STRIP.x + 3.5, STRIP.y + 7.1, 3.8]), at([STRIP.x + STRIP.w - 3.5, STRIP.y + 7.1, 3.8])], { size: 0.38 }));
  return out.join("");
}

const START = { s: MODEL.start, split: MODEL.split, overrunTo: MODEL.overrunTo, p: 0, drop: 0, arm: 0, latch: 0 };
const FIX = fixtures(k, P);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "md-svg",
  label: "A bench model of a mobile defense, built as a sprung trap. An enemy carriage runs along a track between two converging guide walls into an open pocket, where a sprung stop rises between the rails. Beside the pocket, a lit striking arm on a torsion-spring pivot lies cocked, held by a latch. If the stop holds the carriage and the striking force is stronger than the enemy it meets, the latch opens and the arm swings across behind the carriage. A slider sets the striking force's share of the defender's power, and a dial reads the striking force over the enemy power.",
  body: [plate(), track(), splitStrip(), `<g data-part="live">${scene(k, P, START, FIX)}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain (kit/terrain.mjs), one vehicle per 5 units of power ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the card at every
// width. The camera looks so the enemy column drives in from the left, as the carriage does on the bench.
const FW = 640, FH = 420;
const FA = 70, FE = 42;
const RAD = Math.PI / 180;
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const PF = k.fitProjection(groundRect(26, -8, 158, 158 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const TT = fieldTerrain();
const FIELD = fieldStatic(k, PF, TT);
const POSE0 = fieldPose(MODEL.start, 0, TT);
const look = (u) => (u.kind ? u.kind === "t" ? mdTruck(k, PF, trFaceStep(u.face)) : trVehicle(k, PF, trFaceStep(u.face)) : trSoldier(k, PF, { ...u, face: trFaceStep(u.face) }));
const liveItems = [...POSE0.units, ...POSE0.men].map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${u.fade ? `<g class="md-fade">${look(u)}</g>` : look(u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "md-field",
  label: "The same idea on a battlefield. A red enemy armored column of fourteen vehicles drives in from the left along a valley road, through a gap between two low hills, into an open pocket. Blue fixing forces hold both shoulders of the gap from fighting positions, machine-gun positions and vehicles, with wire along both sides of the pocket, and a blue blocking position of vehicles stands across the far end of the road. Beside the pocket, in a wood behind a chalk line of departure, waits the lit striking force, a tank-heavy battalion. When the blocking position holds the column and the striking force is the stronger, the striking force swings out of the wood and in astride the road behind the column and attacks its rear. If the striking force is too weak it stays in the wood; if the fixing force is too thin the column breaks through the blocking position and drives on out of the pocket. Knocked-out vehicles on both sides stand greyed and smoking, and an ambulance drives up behind the blocking position. One vehicle is drawn for every 5 units of the model's combat power; sizes, distances, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TT, MODEL.start, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...liveItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg md-field"', 'class="iso-svg md-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (FM 3-90, 2023) splits a mobile defense's main body into a fixing force and a striking force: the fixing force holds and shapes the enemy's penetration with the minimum combat power it needs, and the striking force, the bulk of the power, counterattacks. Every number on this bench is notional.";

const LABELS = {
  machine: "Mobile defense trap. Left and right arrow keys change the striking force's share; Enter or Space runs the attack; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys change the striking force's share; Enter or Space runs the attack; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 28",
  title: "Mobile defense",
  hint: "Click to run · ←/→ split",
  readout: "",
  keys: [
    { mark: "lit", label: "Striking force: the sprung arm and head" },
    { mark: "raised", label: "Fixing force: guide walls and sprung stop" },
    { mark: "edge", label: "Gauge: striking force over enemy power" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage md-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="${MODEL.split[0] * 100}" aria-valuemax="${MODEL.split[1] * 100}" aria-valuenow="${MODEL.start * 100}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("Every number on this bench is notional.", "One vehicle is drawn per 5 units of combat power; unit sizes, distances, timings and losses are notional.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Striking force: tank-heavy battalion, lit" },
    { mark: "blue", label: "Fixing force: shoulders and blocking position" },
    { mark: "red", label: "Enemy: armored column in the pocket" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="md-legend md-legend-machine">${m}</div><div class="md-legend md-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = \{[\s\S]*?\n\};\nGEO\.DIAL\.top[^\n]*\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, START, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, lineOnTop, planOutline, insetPlan, sideArc, radialTicks, haloOf, corners, ring, ringSeam, topMatrix, faceTextSvg };
const root = document.querySelector(".md-figure");
const stage = root.querySelector(".md-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const runBtn = root.querySelector("#md-run");
const slider = root.querySelector("#md-split");
const fieldSvgEl = stage.querySelector(".md-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
const still = matchMedia("(prefers-reduced-motion: reduce)");
const FIX = fixtures(K, P);
const S = { ...START, needle: 0.5, rt: 0 };
const TF = fieldTerrain();
const LOOKS = new Map();
let stageF = null, fire = null, marksSig = "", fadeNow = -1, fieldT = 0;
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
// idle tour: one run each at a working split, a split too weak to strike, one too thin to fix
const TOUR = [0.58, 0.40, 0.74];
const STILL_T = DATA.MODEL.T.advance + DATA.MODEL.T.settle + DATA.MODEL.T.strike + 0.01;
let posed = false, touring = !still.matches, clock = 0, runT = 0, running = false, last = 0, frame = 0, visible = false, idle = 0, tourIx = 0;
const fmt = (v) => Math.round(v);
// readout: the machine's text plus the notional losses so far, "N vs M down" (friendly vs enemy)
function text(st) {
  const f = forces(S.s), e = enemyAt(st.phase === "reset" ? 1 : Math.min(st.p, 1));   // the reset shows the run's result
  const L = lossesAt(S.rt, S.s), down = " · " + L.blue + " vs " + L.red + " down";
  const split = "Split " + fmt(f.strike) + "/" + fmt(f.fix);
  if (st.phase === "advance") return st.p === 0 ? split + " · ready" : split + " · enemy " + fmt(e) + down;
  if (st.phase === "contact" && st.outcome !== "overrun") return "Fixed · enemy " + fmt(e) + " at the stop" + down;
  if (st.outcome === "overrun") return "Overrun · fix " + fmt(f.fix) + " < " + fmt(fixNeeded()) + " needed" + down;
  if (st.outcome === "held") return "Held · strike " + fmt(f.strike) + " ≤ enemy " + fmt(e) + down;
  return "Trapped · strike " + fmt(f.strike) + " > " + fmt(e) + down;
}
// Battlefield frame: vehicles and soldiers move by translate and re-render only when their look changes;
// the fire layer writes attributes only; the fire sectors redraw only when the state moves them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S.s, S.rt, TF);
  stageF.put([...pose.units, ...pose.men].map((u) => {
    const f = trFaceStep(u.face);
    const lk = (u.kind ? u.kind + "|" + f : trLook(u)) + "|" + u.side + (u.lit ? "|lit" : "") + (u.fade ? "|fd" : "");
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look: lk, side: u.side, lit: u.lit,
      svg: () => {
        if (!LOOKS.has(lk)) {
          const inner = u.kind ? (u.kind === "t" ? mdTruck(K, PF, f) : trVehicle(K, PF, f)) : trSoldier(K, PF, { ...u, face: f });
          LOOKS.set(lk, u.fade ? '<g class="md-fade">' + inner + "</g>" : inner);
        }
        return LOOKS.get(lk);
      } };
  }));
  // the reset fade: set opacity on the few nodes that change within a run (not a variable on the whole scene)
  if (pose.fade !== fadeNow) {
    const o = pose.fade >= 0.999 ? "" : pose.fade.toFixed(3);
    fieldLayer.querySelectorAll(".md-fade").forEach((n) => { n.style.opacity = o; });
    fireEl.style.opacity = o;
    fadeNow = pose.fade;
  }
  if (pose.sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, S.s, pose); marksSig = pose.sig; }
  const t = still.matches ? 4.37 : fieldT;
  const shots = trShots(pose.streams, t);
  // knocked-out vehicles smoke: one rising puff each, cycling
  const wreckSmoke = pose.wrecks.map(([x, y, z, seed]) => { const age = (t * 0.3 + seed * 0.37) % 1; return { p: [x - 2.2 * age * 3, y - 3.4 * age * 3, z + age * 7], age }; });
  shots.smoke = [...wreckSmoke, ...shots.smoke];
  fire.draw(shots);
}
function draw(st) {
  if (view === "field") drawField();
  else {
    S.p = st.p; S.drop = st.drop; S.arm = st.arm; S.latch = Math.min(1, st.arm * 6);
    layer.innerHTML = scene(K, P, S, FIX);
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, GEO.DIAL, S.needle));
  }
  const t = text(st);
  if (readout.textContent !== t) readout.textContent = t;
  stage.setAttribute("aria-valuenow", String(Math.round(S.s * 100)));
  stage.setAttribute("aria-valuetext", t);
  if (document.activeElement !== slider) slider.value = String(Math.round(S.s * 100));
}
let st = runAt(0, S.s);
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  fieldT += dt;
  if (still.matches) {
    // reduced motion: show the end state of the run, no motion
    S.rt = STILL_T;
    st = runAt(STILL_T, S.s);
    S.needle = clamp(ratioAt(st.p, S.s) / 2, 0, 1);
    draw(st); frame = 0; return;
  }
  if (posed) {
    // a test pose: hold the state it set
  } else if (touring) {
    clock += dt;
    if (clock >= MODEL.cycle) { clock -= MODEL.cycle; tourIx = (tourIx + 1) % TOUR.length; }
    S.s = TOUR[tourIx];
    S.rt = clock;
    st = runAt(clock, S.s);
  } else if (running) {
    runT += dt;
    if (runT >= MODEL.cycle) { running = false; runT = 0; }
    S.rt = runT;
    st = runAt(runT, S.s);
  } else {
    S.rt = 0;
    st = runAt(0, S.s);
  }
  const target = clamp(ratioAt(st.p, S.s) / 2, 0, 1);
  S.needle += (target - S.needle) * (1 - Math.exp(-dt / 0.2));
  draw(st);
  const settled = !touring && !running && Math.abs(S.needle - target) < 0.001;
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || view === "field") ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { if (!running) { touring = !still.matches; clock = 0; tourIx = 0; run(); } }, 9000);
  run();
};
const setSplit = (pct) => { posed = false; S.s = clamp(Math.round(pct), MODEL.split[0] * 100, MODEL.split[1] * 100) / 100; running = false; runT = 0; hold(); };
const fireRun = () => { posed = false; running = true; runT = 0; hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw(st);
  run();
}
stage.addEventListener("click", fireRun);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") setSplit(S.s * 100 - 1);
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") setSplit(S.s * 100 + 1);
  else if (event.key === " " || event.key === "Enter") fireRun();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
runBtn.addEventListener("click", fireRun);
slider.addEventListener("input", () => setSplit(Number(slider.value)));
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { S.rt = STILL_T; st = runAt(STILL_T, S.s); }
setView(view, false);
window.__mobileDefense = { S, setSplit, fire: fireRun, runAt, setView, view: () => view, stop: () => { touring = false; running = false; clearTimeout(idle); },
  pose: (t, s) => { posed = true; touring = false; running = false; clearTimeout(idle); S.s = s; S.rt = t; st = runAt(t, s); S.needle = clamp(ratioAt(st.p, s) / 2, 0, 1); draw(st); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
const [lo, hi] = band();
console.log(`enemy at mouth ${enemyAt(0)}, at stop ${enemyAt(1)}, fix needed ${fixNeeded().toFixed(1)}, trapping band ${lo}–${hi}%`);
for (const s of [0.40, 0.58, 0.74]) console.log(`split ${s * 100}: ${outcome(s)}`, forces(s));
console.log("wrote index.html", PAGE.length, "bytes; front at stop", frontAt(1, MODEL.overrunTo), "ratio at mouth", ratioAt(0, 0.58).toFixed(2));
