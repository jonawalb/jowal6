// Builds interactive/maneuvers/flank-attack/index.html: an isometric "flank rig" made with the Anatomy kit
// (scripts/kit, MIT). Run: node interactive/maneuvers/flank-attack/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, bearing, offFront } from "./model.mjs";
import { GEO, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trLook, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;
const RAD = Math.PI / 180;

const PLATE = { x: -128, y: -60, w: 276, d: 190, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIAL = { x: 110, y: 100, r: 18, z: 24, h: 8 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: -118, y: 96, w: 30, d: 18, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, 0, 46], [-3, 0, 46], [DIAL.x, DIAL.y, DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 55 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const polar = (r, deg) => [r * Math.cos(deg * RAD), r * Math.sin(deg * RAD)];
const sector = (r0, r1, a0, a1, step = 2) => {
  const out = [];
  for (let a = a0; a <= a1 + 1e-9; a += step) out.push(polar(r1, a));
  for (let a = a1; a >= a0 - 1e-9; a -= step) out.push(polar(r0, a));
  return out;
};
const rbox = (ang, r0, r1, t0, t1) => {
  const c = Math.cos(ang * RAD), s = Math.sin(ang * RAD);
  return [[r0, t0], [r1, t0], [r1, t1], [r0, t1]].map(([r, t]) => [r * c - t * s, r * s + t * c]);
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
  return out.join("");
}

// The ring the maneuver force runs on: a degree scale, sleepers, two rails and end stops.
function ring() {
  const out = [];
  out.push(S(k.extrude(sector(111, 118, 13, 175), 0, 0.8, P, { convex: false }), { tone: "lo", crease: "none" }));
  const minor = [], major = [], zero = [];
  for (let a = 14; a <= 174; a += 2) {
    const big = a % 10 === 0;
    const into = big ? 3.6 : 2.2;
    const d = k.lineOnTop(polar(118, a), polar(118 - into, a), 0.8, P);
    (a === 90 ? zero : big ? major : minor).push(d);
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }), L(zero.join(""), { tone: "hi" }));
  const sleepers = [];
  for (let a = 18; a <= 170; a += 8) sleepers.push(a);
  sleepers.sort((a, b) => k.depthOf([...polar(95, a), 0], P) - k.depthOf([...polar(95, b), 0], P));
  for (const a of sleepers) out.push(S(k.extrude(rbox(a, 82, 108, -2, 2), 0, 1.2, P), { tone: "lo" }));
  for (const [r0, r1] of [[100, 104], [86, 90]]) {
    out.push(S(k.extrude(sector(r0, r1, 13, 175, 1.5), 1.2, 3, P, { convex: false, bevel: 0.3 }), { tone: "mid" }));
  }
  for (const a of [15, 173]) {
    out.push(S(k.extrude(rbox(a, 83, 107, -2, 2), 1.2, 7, P, { bevel: 0.4 }), { tone: "mid" }));
    out.push(Dt([at([...polar(87, a), 8.2]), at([...polar(103, a), 8.2])], { size: 0.42 }));
  }
  return out.join("");
}

// The straight rail the fixing force runs on.
function fixRail() {
  const out = [];
  for (const y of [-15, 11]) {
    out.push(S(k.slabOf({ x: 64, y, w: 72, d: 4, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([70, 130].map((x) => at([x, y + 2, 3])), { size: 0.4 }));
  }
  for (const x of [60, 136]) {
    out.push(S(k.slabOf({ x, y: -18, w: 4, d: 36, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: "mid" }));
    out.push(Dt([at([x + 2, -13, 8]), at([x + 2, 13, 8])], { size: 0.45 }));
  }
  return out.join("");
}

// Stator ring with degree ticks and the zero mark (the fixing axis), and the turntable.
function table() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.cylinder(0, 0, 53, 0, 0.1, P, 72).fill}" style="filter:blur(4px)"/>`);
  out.push(S(k.cylinder(0, 0, 52, 0, 3, P, 96, 0.6), { tone: "mid", inner: L(k.sideArc(0, 0, 52, 1.5, P, 48), { tone: "faint" }) }));
  const t = k.radialTicks(0, 0, 51.6, 72, 6, 3, [1.4, 2.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([45, 0], [51.6, 0], 3, P), { tone: "hi" }));
  out.push(S(k.cylinder(0, 0, 45, 3, 4, P, 96, 0.8), { tone: "mid", inner: L(k.sideArc(0, 0, 45, 5, P, 48), { tone: "faint" }) }));
  out.push(L(k.ring(0, 0, 42.6, GEO.TT, P, 96), { tone: "faint" }));
  return out.join("");
}

// The dial gauge that reads the share of the defender's fire that bears on the spearhead.
function gauge() {
  const out = [];
  const ped = { x: DIAL.x - 14, y: DIAL.y - 14, w: 28, d: 28, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5.6, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3.4, 7.4, DIAL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(DIAL.x, DIAL.y, 3.4, 14, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3.2, DIAL.top, 70, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3.2, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 20, 5, DIAL.top, [1.2, 2.6], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([DIAL.x - 4.6, DIAL.y + 7.6], DIAL.top, P, "x"), "FIRE %", { size: 2.2, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, DIAL, 1)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.5, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}
const GAUGE = { key: k.depthOf([DIAL.x, DIAL.y, 0], P), svg: `<g data-part="gauge">${gauge()}</g>` };

const START = { theta: 30, psi: 0, cx: GEO.CX_HOME, tip: GEO.PAD_CONTACT, gap: 0, fixed: true };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "fl-svg",
  label: "A bench model of a flank attack. A fort sits on a turntable in the middle, its thick gun wall facing a fixing force: a carriage on a straight rail whose spring-loaded ram presses the wall while a brake clamps the turntable. A lit spearhead carriage runs on a curved rail around the fort. A dial gauge reads how much of the fort's fire can reach the spearhead. While the fort is fixed, the spearhead can move round to its thin side wall and the gauge falls; released, the fort turns to face the spearhead and the gauge climbs back.",
  body: [plate(), ring(), fixRail(), table(), `<g data-part="live">${scene(k, P, { ...START, statics: [GAUGE] })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at platoon scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420 at desktop), shown with "slice" so the ground fills
// the whole card at every width; a phone crops the sides. PF frames the visible ground rect.
const FW = 640, FH = 420;
const PF = k.fitProjection([[54, -169, 0], [212.5, 57.4, 0], [-18.5, 219, 0], [-177, -7.2, 0]], FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose(START, GEO, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "fl-field",
  label: "The same idea on a battlefield. On a low rise in the middle, a red enemy rifle squad and machine-gun team are dug into fighting positions with sandbagged rims behind a belt of wire, the machine gun's fire sector marked on the ground toward the right. On the right, behind a stone wall, a blue support-by-fire element (a rifle squad and two machine-gun teams) fires tracers into the enemy's front. The lit blue assault element, two rifle squads in squad columns with fire teams in wedges, moves along a track through the wood in the foreground round the enemy's flank, past a phase line, then turns in and assaults in squad line. Released, the enemy shifts round its positions and turns its fire on the assault, which then uses fire and movement, one squad firing while the other moves. Sizes, ranges and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg fl-field"', 'class="iso-svg fl-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (FM 3-90, 2023) says an envelopment avoids “the enemy’s front—where the effects of enemy fires and obstacles are generally the greatest” and attacks along an assailable flank, and that its odds rise with “supporting efforts that fix the bulk of the enemy’s forces in their current positions.” Here the ram is that fix. The fire-share curve is a notional teaching shape, not data.";

const LABELS = {
  machine: "Flank rig. Left and right arrow keys move the spearhead round the ring; F fixes or releases the fort; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys move the assault element along its track; F fixes or releases the enemy; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 1",
  title: "Fix and flank",
  hint: "Hover the ring · click to fix",
  readout: "",
  keys: [
    { mark: "lit", label: "Maneuver force: the spearhead on the ring" },
    { mark: "raised", label: "Fixing force: ram and brake that hold the fort's front" },
    { mark: "edge", label: "Gauge: share of the fort's fire that reaches the spearhead" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage fl-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="${MODEL.arc[0]}" aria-valuemax="${MODEL.arc[1]}" aria-valuenow="${START.theta}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("Here the ram is that fix. The fire-share curve is a notional teaching shape, not data.", "Here the support-by-fire element is that fix. Unit sizes, ranges, timings and the fire-share curve are notional, not data.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Main effort: the assault element, two rifle squads (lit)" },
    { mark: "blue", label: "Friendly: support by fire, a squad and two MG teams" },
    { mark: "red", label: "Enemy: a rifle squad and an MG team, dug in" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="fl-legend fl-legend-machine">${m}</div><div class="fl-legend fl-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, DIAL, START, ARC: [26, 162], LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\nGEO\.CX_HOME[^\n]*\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, START, ARC, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf };
const root = document.querySelector(".fl-figure");
const stage = root.querySelector(".fl-stage");
const svg = stage.querySelector(".fl-svg");
const layer = svg.querySelector('[data-part="live"]');
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const readout = root.querySelector("[data-readout]");
const fixBtn = root.querySelector("#fl-fix");
const slider = root.querySelector("#fl-angle");
const fieldSvgEl = stage.querySelector(".fl-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { vt: 0, t: 0, ps: undefined };
let stageF = null, fire = null, marksSig = "";
const hintEl = root.querySelector('[data-corner="hint"]');
const sliderText = root.querySelector("#fl-angle-text");
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Hover the ring · click to fix", field: "Hover the field · click to fix" };
const SLIDER_TEXT = { machine: "Spearhead position", field: "Assault element position" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const GAUGE = { key: depthOf([DIAL.x, DIAL.y, 0], P), svg: gaugeEl.outerHTML };
gaugeEl.remove();
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { ...START, target: START.theta, f: 1 };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
const TOUR = [[0, true, 30], [1, true, 118], [7, false, 118], [10.5, false, 40], [12.8, true, 40], [14.5, true, 30]];
function tourAt(t) {
  t %= 14.5;
  let step = TOUR[0];
  for (const row of TOUR) if (t >= row[0]) step = row;
  return step;
}
function setFixed(on) {
  S.fixed = on;
  fixBtn.setAttribute("aria-pressed", String(on));
  fixBtn.textContent = on ? "Release the front" : "Fix the front";
}
// Battlefield frame: soldiers move by translate and re-render only when their look changes; the
// fire layer writes attributes only; the fire sectors redraw only when the state moves them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, GEO, T, FM);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m);
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = pose.ps.toFixed(1) + "|" + pose.hold.toFixed(2) + "|" + pose.out.toFixed(1);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  const off = offFront(S.theta, S.psi);
  const f = bearing(off, DATA.MODEL);
  if (view === "field") drawField();
  else {
    layer.innerHTML = scene(K, P, { ...S, statics: [GAUGE] });
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, S.f));
  }
  const state = S.fixed ? (Math.abs(S.psi) < 2 ? "Fixed" : "Fixing") : (S.tip > 34 ? "Free to turn" : "Releasing");
  // the battlefield adds the notional men down, friendly vs enemy (shorter state words to fit)
  const LS = losses(f);
  const text = view === "field"
    ? (state === "Free to turn" ? "Free" : state) + " · " + Math.round(f * 100) + "% of fire bears · " + LS.blue + " vs " + LS.red + " down"
    : state + " · " + Math.round(off) + "° off front · " + Math.round(f * 100) + "% of fire bears";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(S.theta)));
  stage.setAttribute("aria-valuetext", text);
  if (document.activeElement !== slider) slider.value = String(Math.round(S.target));
  return f;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const [, fixed, theta] = tourAt(clock);
    if (fixed !== S.fixed) setFixed(fixed);
    S.target = theta;
  }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  const theta0 = S.theta;
  const step = clamp(ease(S.theta, S.target, 0.5) - S.theta, -60 * dt, 60 * dt);
  S.theta = calm ? S.target : S.theta + step;
  const free = !S.fixed && S.tip > 34;
  const want = S.fixed ? 0 : free ? S.theta : S.psi;
  S.psi = calm ? want : turnToward(S.psi, want, dt, DATA.MODEL);
  const home = S.fixed && Math.abs(S.psi) < 2;
  S.cx = ease(S.cx, home ? GEO.CX_HOME : GEO.CX_OUT, 0.42);
  S.tip = Math.max(GEO.PAD_CONTACT, S.cx - 12 - GEO.ROD_FREE - 3);
  S.gap = ease(S.gap, home && S.tip <= GEO.PAD_CONTACT + 0.4 ? 0 : 1.6, 0.18);
  const f = bearing(offFront(S.theta, S.psi), DATA.MODEL);
  S.f = ease(S.f, f, 0.25);
  FM.t += dt;
  FM.vt = ease(FM.vt, (S.theta - theta0) / dt, 0.12);
  FM.ps = calm ? fieldShift(undefined, S.psi, dt) : fieldShift(FM.ps, S.psi, dt);
  draw();
  const settled = !touring && Math.abs(S.theta - S.target) < 0.01 && Math.abs(S.psi - want) < 0.01 &&
    Math.abs(S.cx - (home ? GEO.CX_HOME : GEO.CX_OUT)) < 0.01 && Math.abs(S.f - f) < 0.001;
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && (!calm || FM.ps !== fieldShift(undefined, S.psi, 0)))) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const steer = (deg) => { S.target = clamp(deg, ARC[0], ARC[1]); hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  sliderText.textContent = SLIDER_TEXT[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
function floorAt(event) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const P = view === "field" ? PF : DATA.P;
  const p = pt.matrixTransform((view === "field" ? stage.querySelector(".fl-field") : svg).getScreenCTM().inverse());
  const a = P.azimuth * Math.PI / 180, e = (P.elevation ?? 30) * Math.PI / 180;
  const kk = P.scale * Math.sqrt(1.6);
  const u = (p.x - P.origin[0]) / kk, v = (p.y - P.origin[1]) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const [x, y] = floorAt(event);
  if (Math.hypot(x, y) < 30) return;
  steer(Math.atan2(y, x) * 180 / Math.PI);
});
stage.addEventListener("click", () => { setFixed(!S.fixed); hold(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") steer(S.target + 6);
  else if (event.key === "ArrowRight" || event.key === "ArrowDown") steer(S.target - 6);
  else if (event.key === "f" || event.key === "F" || event.key === " " || event.key === "Enter") { setFixed(!S.fixed); hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
fixBtn.addEventListener("click", () => { setFixed(!S.fixed); hold(); });
// Reset: back to the state the page opened in (model, controls and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  Object.assign(S, START, { target: START.theta, f: 1 });
  Object.assign(FM, { vt: 0, t: 0, ps: undefined });
  setFixed(START.fixed);
  slider.value = String(START.theta);
  touring = !still.matches; clock = 0;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => steer(Number(slider.value)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setFixed(S.fixed);
setView(view, false);
window.__flank = { S, setFixed, steer, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const off of [0, 45, 90, 135, 180]) console.log(`off ${off}° → ${Math.round(bearing(off) * 100)}% bears`);
console.log("check", offFront(350, 10), "CX_HOME", GEO.CX_HOME.toFixed(1), "wrote index.html", PAGE.length, "bytes");
