// Builds interactive/maneuvers/penetration/index.html: an isometric "breaching bench" made with the
// Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/penetration/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, HAMMER, stateAt, readoutOf, losses } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, W, fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");
const stripAll = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -136, y: -94, w: 246, d: 188, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: -120, y: 50, w: 32, d: 20, r: 1.5 };
const RULER = { x: -16, y: -44, w: 6, d: 88, r: 1 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.HX, -26, 77], [GEO.HX, 26, 77], [GEO.HX - 57, 0, 72], [GEO.HX - 50, -22, 85]],
  WIDTH, HEIGHT, { pad: 14, azimuth: 120, elevation: 38 },
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
  [[22, 6], [16, 10], [19, 14]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The slot the wedge and the carriage key run in, as one closed outline from the rear stop to the objective stop.
function slot() {
  const out = [];
  out.push(S(k.slabOf({ x: GEO.REAR_X - 2, y: -2.6, w: GEO.STOP_X - GEO.REAR_X + 4, d: 5.2, r: 1.4 }, -0.01, 0.01, P, 3), { tone: "lo", flat: true, crease: "none" }));
  out.push(L(k.planOutline({ x: GEO.REAR_X - 2, y: -2.6, w: GEO.STOP_X - GEO.REAR_X + 4, d: 5.2, r: 1.4 }, 0, P, 3), { tone: "lo" }));
  return out.join("");
}

// A ruler across the attack axis, in front of the line: reads the gap in millimetres.
function ruler() {
  const out = [];
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RULER.y + 4, RULER.y + RULER.d - 4, 2, 5, RULER.x + RULER.w, 0.6, [-1.6, -3], P, "y");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([RULER.x + RULER.w, 0], [RULER.x, 0], 0.6, P), { tone: "hi" }));
  // a second ruler along the attack axis, from the back of the line to the stop: how far the carriage has run
  const R2 = { x: 26, y: 17, w: 62, d: 5, r: 1 };
  out.push(S(k.slabOf(R2, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t2 = k.topTicks(R2.x + 3, R2.x + R2.w - 3, 2, 5, R2.y, 0.6, [1.4, 2.8], P, "x");
  out.push(L(t2.minor, { tone: "lo" }), L(t2.major, { tone: "mid" }));
  return out.join("");
}

// Flush bushings the shoulder pins rise out of.
function bushings() {
  const [px, py, pr] = GEO.PIN;
  return [-1, 1].map((s) => L(k.ring(px, s * py, pr + 1.2, 0, P, 20), { tone: "lo" }) + L(k.ring(px, s * py, pr, 0, P, 20), { tone: "faint" })).join("");
}

const START = { p: 0, hold: true };
const s0 = stateAt(START.p, START.hold);
const LIVE0 = { gap: s0.gap, phi: s0.phi, nose: s0.nose, car: s0.car, pin: 0 };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "pn-svg",
  label: "A bench model of a penetration. A line of six blocks stands across a base plate, pressed together by springs at both ends. A pendulum drop hammer drives a lit wedge into the boundary between the two middle blocks until it cuts through the line's depth. The hammer then swings up, and a carriage with two side rollers drives into the gap and forces it wider. Two shoulder pins rise behind the rollers to hold the gap open while the carriage runs on to a stop behind the line. With the pins down, the springs shut the gap behind the carriage. A dial gauge beside the line reads the gap from 0 to 30 mm; a catch on its own post holds the parked hammer, and a tray beside the frame holds two spare wedges.",
  body: [plate(), slot(), ruler(), bushings(), `<g data-part="live">${scene(k, P, MODEL, LIVE0)}</g>`],
});

const CAPTION = "Army doctrine (FM 3-90, 2023) defines a penetration as a form of maneuver “in which a force attacks on a narrow front,” normally planned in three phases: breach the main defensive positions, widen the gap to secure the penetration’s flanks, then seize an objective and exploit. The hammer, rollers and pins act those phases out. Blow counts, widths and timings are bench geometry, not data.";

// ---- Battlefield view: the same state on full-bleed terrain at company scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420 at desktop), shown with "slice" so the ground fills
// the whole card at every width; a phone crops the sides. PF centres FG.VIEW at FG.SCALE.
const FW = 640, FH = 420;
const PF = (() => {
  const P0 = { origin: [0, 0], scale: FG.SCALE, azimuth: 55, elevation: 42 };
  const c = k.iso([...W(...FG.VIEW), 0], P0);
  return { ...P0, origin: [FW / 2 - c[0], FH / 2 - c[1]] };
})();
// The ground under the four card corners (inverse projection at z = 0), boxed with a margin.
const WORLD = (() => {
  const a = PF.azimuth * Math.PI / 180, e = PF.elevation * Math.PI / 180, kk = PF.scale * Math.sqrt(1.6);
  const pts = [[0, 0], [FW, 0], [FW, FH], [0, FH]].map(([sx, sy]) => {
    const u = (sx - PF.origin[0]) / kk, v = (sy - PF.origin[1]) / (kk * Math.sin(e));
    return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
  });
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x = Math.min(...xs) - 30, y = Math.min(...ys) - 30;
  return { x, y, w: Math.max(...xs) + 30 - x, d: Math.max(...ys) + 30 - y };
})();
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T, WORLD);
const POSE0 = fieldPose({ ...START, gap: s0.gap, pin: 0 }, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "pn-field",
  label: "The same idea on a battlefield, at company scale. Across the middle, two red enemy platoon positions hold a line of two-man fighting positions and machine-gun nests on two low hills, with wire in front and a saddle between them: the boundary. Their machine guns' fire sectors cross in front of it. From the foreground, a blue company of three platoons, each drawn as three groups of four, attacks on a narrow front at the boundary. The breach platoon rushes through in a column, one rush at a time, and secures the far side. The follow-on platoon forces the gap wide, driving the enemy pairs at the boundary back to alternate positions, and its squads hold both shoulders. The lit platoon, the main effort, passes through to the objective flag in depth. Let go of the shoulders and the follow-on squads go on with it; the enemy walks back into its holes and the gap closes behind them. Sizes, ranges and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg pn-field"', 'class="iso-svg pn-field" preserveAspectRatio="xMidYMid slice"');

const LABELS = {
  machine: "Penetration bench. Left and right arrow keys step the operation back and forward; H raises or drops the shoulder pins; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys step the operation back and forward; H holds or lets go of the shoulders; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 4",
  title: "Breach, widen, exploit",
  hint: "Hover to run · click holds",
  readout: "",
  keys: [
    { mark: "lit", label: "Wedge: the breach on a narrow front" },
    { mark: "raised", label: "Carriage rollers and shoulder pins: widen and hold the gap" },
    { mark: "edge", label: "Blocks and end springs: the defended line" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage pn-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("The hammer, rollers and pins act those phases out. Blow counts, widths and timings are bench geometry, not data.", "Here a breach platoon, a follow-on platoon and the lit platoon act those phases out. Unit sizes, widths, ranges and timings are notional, not data.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Main effort: the platoon that exploits to the objective (lit)" },
    { mark: "blue", label: "Friendly: the breach and follow-on platoons" },
    { mark: "red", label: "Enemy: two platoon positions, dug in" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="pn-legend pn-legend-machine">${m}</div><div class="pn-legend pn-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, HAMMER, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs").replace(/^export const MODEL = [\s\S]*?\n};\n/m, "const MODEL = DATA.MODEL;\n").replace(/^const HAMMER = [^\n]*\n/m, "const HAMMER = DATA.HAMMER;\n")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "const GEO = DATA.GEO;\n")}
${stripAll("../../kit/field.mjs")}
${stripAll("../../kit/terrain.mjs")}
${stripAll("field-scene.mjs")}
const { P, PF, START, LABELS } = DATA;
const K = { depthOf, iso, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cameraOf, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, planOutline, insetPlan, ring, radialTicks, corners, topMatrix, topTicks, haloOf };
const root = document.querySelector(".pn-figure");
const stage = root.querySelector(".pn-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const holdBtn = root.querySelector("#pn-hold");
const slider = root.querySelector("#pn-progress");
const fieldSvgEl = stage.querySelector(".pn-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, g: undefined, hw: undefined, dhw: 0, vp: 0 };
let stageF = null, fire = null, marksSig = "";
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
const HINTS = { machine: "Hover to run · click holds", field: "Hover to run · click holds" };
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { p: START.p, target: START.p, hold: START.hold, gap: 0, pin: 0 };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
// [time s, progress, pins held]: run the operation, let go of the shoulders, then rewind.
const TOUR = [[0, 0, true], [1, 0, true], [10, 1, true], [11.2, 1, false], [13, 1, false], [14.6, 0, true], [15.4, 0, true]];
const LOOP = 15.4;
function tourAt(t) {
  t %= LOOP;
  for (let i = 1; i < TOUR.length; i++) {
    const [t1, p1, h1] = TOUR[i], [t0, p0, h0] = TOUR[i - 1];
    if (t < t1) return [p0 + (p1 - p0) * (t - t0) / (t1 - t0), h0];
  }
  return [0, true];
}
function setHold(on) {
  S.hold = on;
  holdBtn.setAttribute("aria-pressed", String(on));
  holdBtn.textContent = on ? "Drop the shoulder pins" : "Raise the shoulder pins";
}
// Battlefield frame: soldiers move by translate and re-render only when their look changes; the
// fire layer writes attributes only; the fire sectors redraw only when the state moves them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, T, FM);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m);
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = pose.H.toFixed(1) + "|" + pose.q.toFixed(2) + "|" + pose.hw.toFixed(2) + "|" + pose.uS.toFixed(1);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  const s = stateAt(S.p, S.hold);
  if (view === "field") drawField();
  else layer.innerHTML = scene(K, P, MODEL, { gap: S.gap, phi: s.phi, nose: s.nose, car: s.car, pin: S.pin });
  let text = readoutOf({ ...s, pinsUp: S.pin > 0.98 && s.pinsUp }, S.gap);
  // the battlefield adds the notional men down, friendly vs enemy (the breach drops its "% through" to fit)
  if (view === "field") { const LS = losses(s, S.gap); text = text.replace(/ · [0-9]+% through$/, "") + " · " + LS.blue + " vs " + LS.red + " down"; }
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(S.p * 100)));
  stage.setAttribute("aria-valuetext", text);
  if (document.activeElement !== slider) slider.value = String(Math.round(S.target * 100));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const [p, h] = tourAt(clock);
    S.target = p;
    if (h !== S.hold) setHold(h);
  }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  const p0 = S.p;
  S.p = touring ? S.target : ease(S.p, S.target, 0.6);
  if (Math.abs(S.p - S.target) < 1e-4) S.p = S.target;
  FM.vp = (S.p - p0) / dt;
  const s = stateAt(S.p, S.hold);
  // pins drop before the springs may close the gap; the gap follows what holds it
  S.pin = ease(S.pin, s.pinsUp ? 1 : 0, 0.18);
  const held = S.pin > 0.05 ? MODEL.span : 0;
  const want = Math.max(s.gap, held);
  S.gap = want > S.gap ? want : ease(S.gap, want, 0.16);
  // the battlefield eases the gap on the ground and the hold, so troops walk rather than jump
  FM.t += dt;
  FM.g = calm || FM.g === undefined ? S.gap : FM.g + (S.gap - FM.g) * (1 - Math.exp(-dt / 0.5));
  const hw0 = FM.hw ?? (S.hold ? 1 : 0);
  FM.hw = calm ? (S.hold ? 1 : 0) : hw0 + ((S.hold ? 1 : 0) - hw0) * (1 - Math.exp(-dt / 0.6));
  FM.dhw = (FM.hw - hw0) / dt;
  draw();
  const settled = !touring && S.p === S.target && Math.abs(S.pin - (s.pinsUp ? 1 : 0)) < 0.002 && Math.abs(S.gap - want) < 0.01;
  const fieldSettled = Math.abs(FM.g - S.gap) < 0.01 && Math.abs(FM.hw - (S.hold ? 1 : 0)) < 0.002;
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && (!calm || !fieldSettled))) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const steer = (p) => { S.target = clamp(p, 0, 1); hold(); };
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
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const box = stage.getBoundingClientRect();
  steer((event.clientX - box.left - box.width * 0.1) / (box.width * 0.8));
});
stage.addEventListener("click", () => { setHold(!S.hold); hold(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(S.target + 0.04);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(S.target - 0.04);
  else if (event.key === "h" || event.key === "H" || event.key === " " || event.key === "Enter") { setHold(!S.hold); hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
holdBtn.addEventListener("click", () => { setHold(!S.hold); hold(); });
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => steer(Number(slider.value) / 100));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { S.p = S.target = 1; touring = false; }
{ const s = stateAt(S.p, S.hold); S.pin = s.pinsUp ? 1 : 0; S.gap = s.gap; }
setHold(S.hold);
setView(view, false);
window.__penetration = { S, setHold, steer, setView, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the readouts the page will show.
for (const p of [0.2, 0.46, 0.75, 1]) for (const h of [true, false]) console.log(p, h, readoutOf(stateAt(p, h)));
console.log("wrote index.html", PAGE.length, "bytes");
