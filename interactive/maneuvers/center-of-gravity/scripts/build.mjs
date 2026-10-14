// Builds interactive/maneuvers/center-of-gravity/index.html: an isometric stone arch on a bench
// whose lit keystone a screw puller can withdraw, made with the Anatomy kit (../../kit, MIT).
// Run: node interactive/maneuvers/center-of-gravity/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, loads, bearing, lean, turns } from "./model.mjs";
import { GEO, scene, meetAngle, restPoses } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, cgTruck } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 400;
const RAD = Math.PI / 180;

const PLATE = { x: -34, y: -98, w: 92, d: 196, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: 37, y: -92, w: 13, d: 30, r: 1.5 };
const RULER = { x: 44, y: 60, w: 6, d: 32, r: 1 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, 0, GEO.ROD_TOP + MODEL.EMAX + 2], [0, -75, 106], [0, 75, 106]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 34, elevation: 36 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
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
  [[20, 4.5], [14, 7], [17, 9.5]].forEach(([len, dx]) => out.push(L(k.lineOnTop([LABEL.x + dx, LABEL.y + 5], [LABEL.x + dx, LABEL.y + 5 + len], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  // ruler strip, mm
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RULER.y + 2, RULER.y + RULER.d - 2, 2, 5, RULER.x, 0.6, [1.6, 3], P, "y");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

// The catch tray between the piers: floor, back rim and the far side rim (the near rims are live, in front of the stones).
function tray() {
  const out = [];
  const floor = { x: -12, y: -31, w: 24, d: 62, r: 1.5 };
  out.push(S(k.slabOf(floor, 0, GEO.FLOOR, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(floor, 3), GEO.FLOOR, P), { tone: "faint" }));
  out.push(S(k.slabOf({ x: -12, y: -31, w: 1.5, d: 62, r: 0.5 }, 0, 4.6, P, 2, 0.3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -10.5, y: -31, w: 21, d: 1.5, r: 0.4 }, GEO.FLOOR, 3.4, P, 2), { tone: "lo" }));
  return out.join("");
}

const HOLD = 0.96 * meetAngle(MODEL);
const REST = restPoses(MODEL);
const LOADS = loads(MODEL);
const heightsAt = (e, c) => LOADS.map((n) => (c > 0 ? 0 : GEO.PER_W * bearing(e) * n));
const START = { e: 0, c: 0, spin: 0 };
const live0 = scene(k, P, MODEL, { ...START, lean, hold: HOLD, rest: REST, heights: heightsAt(0, 0) });

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "cg-svg",
  label: "A bench model of a stone arch. Nine wedge-shaped stones span two piers; the lit keystone at the crown is fixed to a screw puller hung from a beam on two posts. In front, a bank of nine glass columns shows the load through each stone, rising from the crown to the springing. Turning the puller lifts the keystone: the columns fall, the arch leans in, and when the keystone clears its seat the two halves fall in and the crown stones drop into a tray.",
  body: [plate(), tray(), `<g data-part="live">${live0}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at operational scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the whole
// card at every width; a phone crops the sides. PF frames a screen-aligned ground rect.
const FW = 640, FH = 420;
const FA = 55, FE = 42;
// Four ground points that frame a screen-aligned rect centred on (cx, cy), hw unit-screen units wide each side.
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const PF = k.fitProjection(groundRect(-40, 4, 218, 218 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose({ e: 0, c: 0, collapsing: false, rebuilding: false }, GEO, T);
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${(u.kind === "t" ? cgTruck : trVehicle)(k, PF, trFaceStep(u.face))}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "cg-field",
  label: "The same idea on a battlefield, at operational scale, with each small vehicle standing for a platoon and each cluster of three for a company. In the middle, three red enemy mechanized battalions hold a forward arc in dug-in positions, facing right, with their fire sector marked on the ground. Behind their centre, at a crossroads village, the lit red armored reserve, a tank battalion, can reach any of them along tracks from the crossroads. On the right a blue mechanized battalion fixes the enemy's front with fire; at the lower left a blue armored battalion, having worked round the southern flank, strikes the reserve from an attack-by-fire position marked in chalk on pegs, and the flag marks the reserve as its objective. As the strike goes in, the reserve's tanks are knocked out one by one, stop and smoke; the reserve fires back and some strike-force vehicles are hit too, and an evacuation vehicle carries casualties to the rear. When the last is gone, the forward battalions lose cohesion and fall back, leaving stopped vehicles behind, the centre first to the rear and the flanks toward the river and the woods. Rebuild resets the battle. The arch is an analogy; sizes, distances and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg cg-field"', 'class="iso-svg cg-field" preserveAspectRatio="xMidYMid slice"');

const LABELS = {
  machine: "Arch model. Up and down arrow keys turn the puller to lift or lower the keystone; R rebuilds the arch; V switches to the Battlefield view.",
  field: "Battlefield. Up and down arrow keys press or ease the strike on the enemy's armored reserve; R resets the battle; V switches to the Machine view.",
};

const CAPTION = "Joint doctrine (JP 5-0, 2020) defines a center of gravity as “the source of power that provides moral or physical strength, freedom of action, or will to act.” The keystone stands in for it here: every stone carries load only while the keystone holds. Loads and collapse are notional teaching values, not data.";

const card = k.plateHtml({
  fig: "Fig 7",
  title: "Center of gravity",
  hint: "Drag up to pull the keystone",
  readout: "",
  keys: [
    { mark: "lit", label: "Keystone: the center of gravity" },
    { mark: "raised", label: "Voussoirs: the stones its thrust holds in place" },
    { mark: "edge", label: "Columns: load through each stone, crown in the middle" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage cg-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="${MODEL.EMAX}" aria-valuenow="0">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("The keystone stands in for it here: every stone carries load only while the keystone holds. Loads and collapse are notional teaching values, not data.", "Here, by analogy, the enemy's armored reserve plays the keystone: its forward battalions hold only while it can reach them. Unit sizes, distances, timings, losses and the collapse are notional, not data.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Keystone: the enemy's armored reserve (lit)" },
    { mark: "red", label: "Enemy: three battalions holding the forward arc" },
    { mark: "blue", label: "Friendly: a battalion fixing, a battalion striking" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="cg-legend cg-legend-machine">${m}</div><div class="cg-legend cg-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, START, HOLD, REST, LOADS, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\nGEO\.TEND[^\n]*\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, START, HOLD, REST, LOADS, LABELS } = DATA;
const GEO = DATA.GEO, M = DATA.MODEL;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, onTop, slabOf, sideSeam, sideRing, sideArc, cylinder, knurl, ring, lineOnTop, haloOf, corners, segment, planOutline, insetPlan };
const root = document.querySelector(".cg-figure");
const stage = root.querySelector(".cg-stage");
const svg = stage.querySelector(".cg-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const rebuildBtn = root.querySelector("#cg-rebuild");
const slider = root.querySelector("#cg-lift");
const fieldSvgEl = stage.querySelector(".cg-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, k: 0, kdir: 1 };
let stageF = null, fire = null, marksSig = "";
const hintEl = root.querySelector('[data-corner="hint"]');
const sliderText = root.querySelector("#cg-lift-text");
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
const HINTS = { machine: "Drag up to pull the keystone", field: "Drag up to strike the reserve" };
const SLIDER_TEXT = { machine: "Keystone lift", field: "Strike on the reserve" };
const REBUILD_TEXT = { machine: "Rebuild the arch", field: "Reset the battle" };
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { e: 0, target: 0, c: 0, collapsing: false, rebuilding: false, heights: LOADS.map((n) => GEO.PER_W * n) };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0, phase = "";
const TOUR = [[0, 0], [2, 11], [8, 13.5], [11.6, "rebuild"]];
const TOUR_LEN = 16.5;
let tourStep = -1;
function rebuild() {
  if (S.c <= 0 && !S.collapsing) return;
  S.collapsing = false;
  S.rebuilding = true;
}
function phaseOf() {
  if (S.collapsing || S.c > 0) return S.rebuilding ? "rebuilding" : "collapsed";
  if (S.rebuilding) return "seating";
  return S.e < 0.05 ? "seated" : "lifted";
}
// Battlefield frame: vehicles move by translate and re-render only when their facing crosses a 15°
// step or they are knocked out; the fire layer writes attributes only; the fire sectors redraw only
// when the state moves them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, GEO, T, FM);
  stageF.put(pose.units.map((u) => {
    const f = trFaceStep(u.face), shape = (u.kind || "v") + "|" + f, look = u.side + "|" + shape;
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(shape)) LOOKS.set(shape, (u.kind === "t" ? cgTruck : trVehicle)(K, PF, f)); return LOOKS.get(shape); } };
  }));
  const sig = pose.k.toFixed(2) + "|" + pose.strikeOn.toFixed(2) + "|" + pose.alive + "|" + pose.sp[0].toFixed(1);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  const ft = still.matches ? 4.37 : FM.t, shots = trShots(pose.streams, ft);
  shots.smoke = [...fieldSmoke(pose, ft), ...shots.smoke];
  fire.draw(shots);
  return pose;
}
function draw() {
  const b = S.c > 0 || S.collapsing ? 0 : bearing(S.e, M);
  const pose = view === "field" ? drawField() : null;
  if (!pose) layer.innerHTML = scene(K, P, M, { e: S.e, c: S.c, spin: 2 * Math.PI * turns(S.e, M), lean, hold: HOLD, rest: REST, heights: S.heights });
  const p = phaseOf();
  const pct = Math.round(b * 100);
  let text = p === "collapsed" ? "Keystone out · ring load 0% · collapsed"
    : p === "rebuilding" ? "Rebuilding the arch"
    : p === "seated" ? "Keystone seated · ring load 100%"
    : (p === "seating" ? "Seating · " : "Lifted " + S.e.toFixed(1) + " mm · ") + "ring load " + pct + "%" + (p === "lifted" ? " · sagging" : "");
  // the battlefield reads the same state as the reserve's fighting share plus the notional losses
  const lost = pose ? " · lost " + pose.LS.red + " red, " + pose.LS.blue + " blue" : "";
  const fieldText = !pose ? "" : p === "collapsed" ? "Reserve out · collapse" + lost
    : p === "rebuilding" ? "Resetting the battle"
    : p === "seated" ? "Reserve 100% fighting · no losses"
    : "Reserve " + pct + "% fighting" + lost;
  if (pose) text = fieldText;
  if (readout.textContent !== text) readout.textContent = text;
  if (p !== phase) { phase = p; stage.setAttribute("aria-valuetext", p === "lifted" ? "Keystone lifted, arch sagging" : text); }
  stage.setAttribute("aria-valuenow", String(Math.round(S.e)));
  if (document.activeElement !== slider) slider.value = String(Math.round(S.target * 2) / 2);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    if (clock >= TOUR_LEN) { clock = 0; tourStep = -1; }
    let idx = 0;
    TOUR.forEach((row, i) => { if (clock >= row[0]) idx = i; });
    if (idx !== tourStep) {
      tourStep = idx;
      const v = TOUR[idx][1];
      if (v === "rebuild") rebuild(); else S.target = v;
    }
  }
  if (S.collapsing || S.c > 0) S.target = Math.max(S.target, M.EC);
  if (S.rebuilding) {
    S.c = calm ? 0 : Math.max(0, S.c - dt);
    if (S.c === 0) S.target = 0;
    if (S.c === 0 && S.e < M.EC - 0.2) S.rebuilding = false;
  }
  const cap = (touring ? (S.rebuilding ? 6 : 2.4) : 10) * dt;
  const eased = S.e + (S.target - S.e) * (1 - Math.exp(-dt / 0.45));
  S.e = calm ? S.target : S.e + clamp(eased - S.e, -cap, cap);
  if (Math.abs(S.e - S.target) < 0.005) S.e = S.target;
  if (!S.rebuilding && S.c === 0 && fails(S.e, M)) S.collapsing = true;
  if (S.collapsing) {
    S.c = calm ? GEO.TEND : Math.min(GEO.TEND, S.c + dt);
    if (S.c >= GEO.TEND) S.collapsing = false;
  }
  const b = S.c > 0 || S.collapsing ? 0 : bearing(S.e, M);
  let moving = false;
  S.heights = S.heights.map((h, i) => {
    const want = GEO.PER_W * b * LOADS[i];
    const next = calm ? want : h + (want - h) * (1 - Math.exp(-dt / 0.18));
    if (Math.abs(next - want) > 0.01) moving = true;
    return Math.abs(next - want) < 0.01 ? want : next;
  });
  FM.t += dt;
  const kWant = (S.c > 0 || S.collapsing) && !S.rebuilding ? 1 : 0;
  FM.kdir = kWant > FM.k ? 1 : kWant < FM.k ? -1 : FM.kdir;
  FM.k = calm ? kWant : FM.k + clamp(kWant - FM.k, -dt / 2.2, dt / 2.2);
  draw();
  const settled = !touring && !moving && S.e === S.target && !S.collapsing && !(S.rebuilding) && FM.k === kWant;
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; tourStep = -1; run(); }, 9000);
  run();
};
const setLift = (mm) => { S.target = clamp(mm, 0, M.EMAX); hold(); };
let drag = null;
stage.addEventListener("pointerdown", (event) => {
  drag = { y: event.clientY, e: S.target, moved: false, id: event.pointerId };
  stage.setPointerCapture(event.pointerId);
  hold();
});
stage.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const dy = drag.y - event.clientY;
  if (Math.abs(dy) > 4) drag.moved = true;
  if (drag.moved) setLift(drag.e + dy * M.EMAX / (stage.clientHeight * 0.6));
});
const endDrag = (event) => {
  if (!drag) return;
  if (!drag.moved && event.type === "pointerup") { if (S.c > 0 || S.collapsing) rebuild(); else setLift(S.target + 2); hold(); }
  try { stage.releasePointerCapture(drag.id); } catch (err) { /* already released */ }
  drag = null;
};
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);
stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 3 : 1;
  if (event.key === "ArrowUp" || event.key === "ArrowRight") setLift(S.target + step);
  else if (event.key === "ArrowDown" || event.key === "ArrowLeft") setLift(S.target - step);
  else if (event.key === "Home") setLift(0);
  else if (event.key === "End") setLift(M.EMAX);
  else if (event.key === "r" || event.key === "R") { rebuild(); hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
rebuildBtn.addEventListener("click", () => { rebuild(); hold(); });
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  sliderText.textContent = SLIDER_TEXT[view];
  rebuildBtn.textContent = REBUILD_TEXT[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => setLift(Number(slider.value)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setView(view, false);
window.__centerOfGravity = { S, setLift, rebuild, setView, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
console.log("joint loads (W):", LOADS.map((n) => n.toFixed(2)).join(", "));
for (const e of [0, 4, 6, 9, 12]) console.log(`lift ${e} mm → ring load ${Math.round(bearing(e) * 100)}%, lean ${(lean(e) * 180 / Math.PI).toFixed(2)}°`);
console.log("hold", (HOLD * 180 / Math.PI).toFixed(2), "° rest spans", JSON.stringify(Object.values(REST).map((r) => r.span.map((v) => +v.toFixed(1)))), "wrote index.html", PAGE.length, "bytes");
