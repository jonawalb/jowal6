// Builds interactive/maneuvers/elastic-defense/index.html: an isometric buffer-stack bench made
// with the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/elastic-defense/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as M from "./model.mjs";
import { GEO, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks, fieldHelmet } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;
const X = (d) => GEO.X0 - d * GEO.S;

const PLATE = { x: -150, y: -122, w: 306, d: 182, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIAL = { x: -108, y: -72, r: 15, z: 20, h: 7 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: -136, y: 26, w: 30, d: 18, r: 1.5 };
const RULER = { x: X(3.6), y: 48, w: X(-0.6) - X(3.6), d: 7, r: 1 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, -20, 32], [GEO.LAUNCH, 0, 28], [DIAL.x, DIAL.y, DIAL.top + 2], [38, -112, 28]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 55 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const slab = (x0, x1, y0, y1, z, h, r = 0.8, bevel = 0, steps = 3) =>
  k.slabOf({ x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), d: Math.abs(y1 - y0), r }, z, h, P, steps, bevel);

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

// The zones, engraved on the bed beside the track: outpost, battle and rear zone bands.
function zones() {
  const out = [];
  const bands = [[0, M.MODEL.homes[1]], [M.MODEL.homes[1], M.MODEL.apl], [M.MODEL.apl, 3.55]];
  for (const [d0, d1] of bands) {
    const plan = { x: X(d1) + 1, y: 24, w: X(d0) - X(d1) - 2, d: 20, r: 2 };
    out.push(L(k.planOutline(plan, 0, P, 4), { tone: "faint" }));
  }
  // a channel down the middle of the bed for the drive spring
  out.push(L(k.planOutline({ x: X(-0.62), y: -3, w: GEO.LAUNCH - 2 - X(-0.62), d: 6, r: 2 }, 0, P, 4), { tone: "faint" }));
  return out.join("");
}

// Ruler strip along the near edge: a tick every 0.25 notional km, majors every km, zone lines in hi.
function ruler() {
  const out = [];
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const edge = RULER.y + 0.6;
  const minor = [], major = [], zone = [];
  for (let d = -0.5; d <= 3.5 + 1e-9; d += 0.25) {
    const x = X(d);
    const isZone = [0, M.MODEL.homes[1], M.MODEL.apl].some((z) => Math.abs(z - d) < 1e-6);
    const big = Math.abs(d - Math.round(d)) < 1e-6;
    const len = isZone ? 4.6 : big ? 3.4 : 2;
    const seg = k.lineOnTop([x, edge], [x, edge + len], 0.6, P);
    (isZone ? zone : big ? major : minor).push(seg);
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }), L(zone.join(""), { tone: "hi" }));
  return out.join("");
}

// Rails, sleepers under them, and screw dots.
function rails() {
  const out = [];
  const x0 = X(3.0) - 26, x1 = GEO.LAUNCH;
  for (let x = x0 + 6; x <= x1 - 4; x += 16) out.push(S(slab(x, x + 4, -17, 17, 0, 0.8, 0.6, 0, 2), { tone: "lo", crease: "none" }));
  for (const y of [-14, 10]) {
    out.push(S(slab(x0, x1, y, y + 4, 0.8, 2.2, 1, 0.4), { tone: "mid" }));
  }
  const pts = [];
  for (let x = x0 + 8; x <= x1 - 2; x += 16) pts.push([x, -12], [x, 12]);
  out.push(Dt(pts.map(([x, y]) => at([x, y, 3])), { size: 0.4 }));
  return out.join("");
}

// The launcher at the attack's end: the drive spring bears on its face; a crank cocks it.
function launcher() {
  const out = [];
  const x0 = GEO.LAUNCH, x1 = GEO.LAUNCH + 12;
  out.push(`<path class="iso-halo" d="${slab(x0 - 1, x1 + 1, -19, 19, 0, 0.1, 1).fill}" style="filter:blur(3px)"/>`);
  // the drive spring's seat, on the launcher's far face (drawn first: the block hides most of it)
  out.push(S(slab(x0 - 1.4, x0, -6.6, 6.6, 6.4, 13.2, 0.4), { tone: "mid", crease: "none" }));
  const blk = { x: x0, y: -18, w: 12, d: 36, r: 1.6 };
  out.push(S(k.slabOf(blk, 0, 24, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(blk, 8, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(blk, 2.2), 24, P, 3), { tone: "faint" }));
  out.push(Dt(k.corners(blk, 2.6).map(([x, y]) => at([x, y, 24])), { size: 0.45 }));
  out.push(S(k.cylinder(x0 + 6, 0, 4, 24, 3, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(x0 + 6, 0, 4, 24, 27, 22, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([x0 + 6, 0], [x0 + 6, 3.4], 27, P), { tone: "hi" }));
  return out.join("");
}

// The flank carriage's cross rails (along y, with end stops) and the anchor block its spring bears
// on; a crank on the anchor re-cocks it.
function flankBase() {
  const out = [];
  for (const [x, y0, y1] of [[18, -106, -30], [52, -106, -42]]) {
    out.push(S(slab(x, x + 4, y0, y1, 0, 0.8, 1, 0.3), { tone: "lo", crease: "none" }));
    out.push(S(slab(x, x + 4, y0, y1, 0.8, 2.2, 1, 0.4), { tone: "mid" }));
    out.push(Dt([y0 + 4, (y0 + y1) / 2, y1 - 4].map((y) => at([x + 2, y, 3])), { size: 0.4 }));
  }
  for (const [x, y] of [[18, -30], [52, -42]]) {
    out.push(S(slab(x - 1, x + 5, y, y + 3.4, 0, 6, 0.6, 0.4), { tone: "mid" }));
    out.push(Dt([at([x + 2, y + 1.7, 6])], { size: 0.42 }));
  }
  const y1 = GEO.ANCHOR_Y, y0 = GEO.ANCHOR_Y - 10;
  out.push(`<path class="iso-halo" d="${slab(27, 49, y0 - 1, y1 + 1, 0, 0.1, 1).fill}" style="filter:blur(3px)"/>`);
  const blk = { x: 28, y: y0, w: 20, d: 10, r: 1.6 };
  out.push(S(k.slabOf(blk, 0, 26, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(blk, 9, P, 3), { tone: "faint" }) }));
  out.push(Dt(k.corners(blk, 2.4).map(([x, y]) => at([x, y, 26])), { size: 0.45 }));
  out.push(S(slab(31.4, 44.6, y1, y1 + 1.4, 6.4, 13.2, 0.4), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(38, y0 + 5, 3.4, 26, 3, P, 22), { tone: "mid" }));
  out.push(L(k.knurl(38, y0 + 5, 3.4, 26, 29, 20, P), { tone: "lo" }));
  return out.join("");
}

// The dial gauge: the attack's push (lit needle) against what the defense pushes back with.
function gauge(push, resist) {
  const out = [];
  const ped = { x: DIAL.x - 13, y: DIAL.y - 13, w: 26, d: 26, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5.2, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3.2, 7.4, DIAL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(DIAL.x, DIAL.y, 3.2, 13, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 64, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" }));
  // 0..160% in 10% steps, majors every 50%: 16 intervals over 270 degrees
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 16, 5, DIAL.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([DIAL.x - 4, DIAL.y + 6.8], DIAL.top, P, "x"), "PUSH", { size: 2.1, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="resist" class="iso-line" data-tone="hi" data-free="" d="${needle(k, P, DIAL, resist, 0.72)}" style="stroke-width:0.9"/>`);
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, DIAL, push)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.4, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}

const START = M.initial("elastic", 1);
const view = (st) => ({ d: st.d, c: st.c, pl: M.plates(st.d, st.bunch), broken: st.broken, shard: st.shard, stow: st.bunch,
  release: Math.max(Math.min(1, st.c / 0.05), Math.min(1, 3 * Math.sin(Math.PI * st.bunch))) });
const GAUGE = { key: k.depthOf([DIAL.x, DIAL.y, 0], P), svg: `<g data-part="gauge">${gauge(M.push(START.d, START.a), M.resist(START))}</g>` };
const LAUNCHER = { key: k.depthOf([GEO.LAUNCH + 6, 0, 0], P) + 40, svg: `<g data-part="launcher">${launcher()}</g>` };

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "ed-svg",
  label: "A bench model of an elastic defense in depth. A lit ram on a carriage, driven by a long spring that loses force as it stretches, runs along rails into a stack of three plates with springs between them, standing for the outpost zone, the main line of resistance and the battle zone. Beside the track a flank carriage with a wedge blade is held cocked by a latch pin against a heavy spring. The ram compresses the stack and stalls in the battle zone; the latch lifts and the flank carriage drives in from the side, its wedge catching a roller on the ram's outrigger and throwing the ram back until the second plate is home. Switched to a rigid wall, the same three plates are bolted together at the front; a strong enough ram shatters them and runs through to the rear. A dial gauge compares the ram's push with the defense's.",
  body: [plate(), zones(), ruler(), rails(), flankBase(), `<g data-part="live">${scene(k, P, { ...view(START), statics: [GAUGE, LAUNCHER] })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain (kit/terrain.mjs) ----
// The viewBox is the card's own shape, shown with "slice" so the ground fills the whole card at every
// width; a phone crops the sides. PF frames the visible ground rect (Fig 1's framing, re-centred on
// FG.VIEW and zoomed).
const FW = 640, FH = 420;
const VC = [-FG.VIEW.u, -FG.VIEW.v];
const PF = k.fitProjection([[54, -169], [212.5, 57.4], [-18.5, 219], [-177, -7.2]].map(([x, y]) => [VC[0] + (x - 17.75) / FG.VIEW.zoom, VC[1] + (y - 25.05) / FG.VIEW.zoom, 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const POSE0 = fieldPose(START, M.MODEL, TF);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  const spec = { ...m, face: trFaceStep(m.face) };
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, spec) + fieldHelmet(k, PF, spec, m.side)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "ed-field",
  label: "The same idea on a 1917 battlefield. Blue attacking infantry in three extended waves, in broad-brimmed steel helmets, advance from their jump-off trench across shell-torn ground toward a red German defense laid out in depth: a front trench behind wire, a few men in shell-hole outposts, a low rise with the main line of resistance in a trench behind it, machine-gun strongpoints scattered through the battle zone with their fire sectors marked on the ground, and a trench at the rear of the battle zone. A red counterattack force waits beside a wood on the far flank. The waves are drawn in and worn down; when they stall the counterattack moves round and strikes their flank, driving them back out of the battle zone. Switched to the rigid wall, the same defenders are packed into the front trench; a strong enough attack breaks it and runs on to the rear. Greyed figures lying still are men down on both sides. Sizes, ranges, timings and casualty counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg ed-field"', 'class="iso-svg ed-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Lupfer’s account of the German defense of 1917: three zones, with the attack’s “relative power” falling as it outran its artillery and the defender’s echelons growing “stronger as the distance from the front line increased.” Here the plates and springs are those zones and the flank carriage is the counterattack. Every force, stiffness and rate is a notional teaching shape, not data.";

const LABELS = {
  machine: "Elastic defense bench. Enter or click attacks; M switches between elastic depth and a rigid wall; left and right arrows set the attack's weight; V switches to the Battlefield view.",
  field: "Elastic defense battlefield. Enter or click attacks; M switches between elastic depth and a rigid front trench; left and right arrows set the attack's weight; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 27",
  title: "Elastic defense",
  hint: "Click to attack · M switches",
  readout: "",
  keys: [
    { mark: "lit", label: "The attack: a ram whose drive spring weakens as it extends" },
    { mark: "raised", label: "The defense: outpost, main-line and battle-zone plates on springs" },
    { mark: "edge", label: "Flank carriage: the counterattack, latched at the side until the ram stalls" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage ed-stage" tabindex="0" role="application" aria-label="${LABELS.machine}">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = "Lupfer’s account of the German defense of 1917: an outpost zone, a battle zone of machine-gun strongpoints in depth, and counterattack forces held back to strike the attack once it was worn down. Here the counterattack takes the attack in the flank, as FM 3-90 (para. 9-33) describes. Unit sizes, ranges, timings and casualty counts are notional, not data.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "The attack: three waves of infantry (lit)" },
    { mark: "red", label: "Defense in depth: outposts, MLR, strongpoints" },
    { mark: "red", label: "Counterattack force, waiting on the far flank" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="ed-legend ed-legend-machine">${m}</div><div class="ed-legend ed-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, DIAL, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = \{[\s\S]*?\n\};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf };
const root = document.querySelector(".ed-figure");
const stage = root.querySelector(".ed-stage");
const svg = stage.querySelector(".ed-svg");
const layer = svg.querySelector('[data-part="live"]');
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const launcherEl = svg.querySelector('[data-part="launcher"]');
const readoutEl = root.querySelector("[data-readout]");
const fireBtn = root.querySelector("#ed-fire");
const modeBtn = root.querySelector("#ed-mode");
const slider = root.querySelector("#ed-weight");
const sliderOut = root.querySelector("#ed-weight-out");
const fieldSvgEl = stage.querySelector(".ed-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const TF = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0 };
let stageF = null, shots = null, marksSig = "";
const still = matchMedia("(prefers-reduced-motion: reduce)");
const GAUGE = { key: depthOf([DIAL.x, DIAL.y, 0], P), svg: gaugeEl.outerHTML };
const LAUNCHER = { key: depthOf([GEO.LAUNCH + 6, 0, 0], P) + 40, svg: launcherEl.outerHTML };
gaugeEl.remove(); launcherEl.remove();
const ST = initial("elastic", 1);
const benchView = (st) => ({ d: st.d, c: st.c, pl: plates(st.d, st.bunch), broken: st.broken, shard: st.shard, stow: st.bunch,
  release: Math.max(Math.min(1, st.c / 0.05), Math.min(1, 3 * Math.sin(Math.PI * st.bunch))) });
let touring = !still.matches, last = 0, frame = 0, visible = false, idle = 0, dwell = 0;
let gP = push(ST.d, ST.a), gR = resist(ST);
const TERMINAL = { restored: 1, through: 1, held: 1 };
function syncControls() {
  modeBtn.setAttribute("aria-pressed", String(ST.mode === "rigid"));
  modeBtn.textContent = ST.mode === "rigid" ? "Switch to elastic depth" : "Switch to rigid wall";
  if (document.activeElement !== slider) slider.value = String(Math.round(ST.a * 100));
  sliderOut.textContent = Math.round(ST.a * 100) + "%";
}
// Battlefield frame: soldiers move by translate and re-render only when their look changes; the
// fire layer writes attributes only; the MG sectors redraw only when a strongpoint's state changes.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); shots = trFire(fireEl, K, PF); }
  const pose = fieldPose(ST, MODEL, TF);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) { const spec = { ...m, face: trFaceStep(m.face) }; LOOKS.set(look, trSoldier(K, PF, spec) + fieldHelmet(K, PF, spec, m.side)); } return LOOKS.get(look); } };
  }));
  const sig = pose.men.filter((m) => m.kind === "nest" && m.role === "mg").map((m) => m.pose + m.side).join("|") + (pose.bunch > 0.02 ? "R" : "E");
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, pose); marksSig = sig; }
  shots.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  if (view === "field") drawField();
  else {
    layer.innerHTML = scene(K, P, { ...benchView(ST), statics: [GAUGE, LAUNCHER] });
    const n = layer.querySelector('[data-part="needle"]');
    const r = layer.querySelector('[data-part="resist"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, gP));
    if (r) r.setAttribute("d", needle(K, P, DIAL, gR, 0.72));
  }
  const text = readout(ST);
  if (readoutEl.textContent !== text) readoutEl.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function settleAll() {
  // reduced motion: run the model to its resting state in one go and draw that
  for (let i = 0; i < 1200 && !(TERMINAL[ST.phase] || (ST.phase === "ready")); i++) step(ST, 1 / 60);
  gP = push(ST.d, ST.a); gR = resist(ST);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (still.matches) { settleAll(); draw(); frame = 0; return; }
  step(ST, dt);
  FM.t += dt;
  if (touring && TERMINAL[ST.phase]) {
    dwell += dt;
    if (dwell > (view === "field" ? 2.6 : 1.3)) { dwell = 0; setMode(ST, ST.mode === "rigid" ? "elastic" : "rigid"); fire(ST); syncControls(); }
  } else dwell = 0;
  const e = 1 - Math.exp(-dt / 0.12);
  const wantP = push(ST.d, ST.a), wantR = resist(ST);
  gP += (wantP - gP) * e; gR += (wantR - gR) * e;
  draw();
  const settled = !touring && (TERMINAL[ST.phase] || ST.phase === "ready") && Math.abs(gP - wantP) < 0.002 && Math.abs(gR - wantR) < 0.002;
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || view === "field") ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const touch = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { if (!still.matches) { touring = true; run(); } }, 12000);
  run();
};
const attack = () => { fire(ST); touch(); };
const toggle = () => { setMode(ST, ST.mode === "rigid" ? "elastic" : "rigid"); syncControls(); touch(); };
const weigh = (a) => {
  ST.a = Math.min(MODEL.strength[1], Math.max(MODEL.strength[0], Math.round(a * 20) / 20));
  syncControls();
  if (ST.phase !== "ready") fire(ST);
  touch();
};
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
stage.addEventListener("click", attack);
stage.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") attack();
  else if (event.key === "m" || event.key === "M") toggle();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") weigh(ST.a + 0.05);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") weigh(ST.a - 0.05);
  else return;
  event.preventDefault();
});
fireBtn.addEventListener("click", attack);
modeBtn.addEventListener("click", toggle);
// Reset: back to the state the page opened in (model, gauge needles, controls, opening attack and
// idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  for (const key of Object.keys(ST)) delete ST[key];
  Object.assign(ST, initial("elastic", 1));
  gP = push(ST.d, ST.a); gR = resist(ST);
  dwell = 0; FM.t = 0;
  if (!still.matches) fire(ST);
  slider.value = String(Math.round(ST.a * 100));
  syncControls();
  touring = !still.matches;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("change", () => weigh(Number(slider.value) / 100));
slider.addEventListener("input", () => { sliderOut.textContent = slider.value + "%"; });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (!still.matches) fire(ST);
syncControls();
setView(view, false);
window.__elasticDefense = { ST, fire: attack, toggle, weigh, step, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const a of [0.6, 1, 1.6]) console.log(`weight ${a}: stalls ${M.stall(a).toFixed(2)} km, push there ${Math.round(M.push(M.stall(a), a) * 100)}%, wall breaks: ${M.breaks(a)}`);
console.log("breaking weight", M.breakingWeight().toFixed(3), "wrote index.html", PAGE.length, "bytes");
