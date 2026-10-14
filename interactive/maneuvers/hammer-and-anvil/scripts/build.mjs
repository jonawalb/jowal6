// Builds interactive/maneuvers/hammer-and-anvil/index.html: an isometric swing-hammer
// bench made with the Anatomy kit (../../kit, MIT), plus a Battlefield view of the same state
// drawn with the terrain kit (../../kit/terrain.mjs; scripts/field-scene.mjs).
// Run: node interactive/maneuvers/hammer-and-anvil/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, plan, stateAt, readoutOf } from "./model.mjs";
import { GEO, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;
const RAD = Math.PI / 180;
const AZ = 62;

const PLATE = { x: -66, y: -102, w: 236, d: 146, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIAL = { x: 134, y: -64, r: 14, z: 14, h: 7 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: -56, y: 16, w: 30, d: 18, r: 1.5 };
const RULER = { x: -10, y: 21, w: 162, d: 6, r: 1 };
const [PX, PY] = GEO.PIVOT;
const { XA, PIT, RAIL_Y } = GEO;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [PX, PY, 27], [XA + 10, 0, 22], [DIAL.x, DIAL.y, DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 20, azimuth: AZ },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const dep = (x, y, z = 0) => k.depthOf([x, y, z], P);
const byDepth = (points) => [...points].sort((a, b) => dep(a[0], a[1]) - dep(b[0], b[1]));
// a point at radius r and swing angle phi (degrees from +y) about the hammer pivot
const swingPt = (r, phi) => [PX + r * Math.sin(phi * RAD), PY + r * Math.cos(phi * RAD)];

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
  // ruler strip along the lane, ticks hanging from its far edge
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RULER.x + 4, RULER.x + RULER.w - 4, 4, 5, RULER.y, 0.6, [1.8, 3.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([XA, RULER.y], [XA, RULER.y + 4.4], 0.6, P), { tone: "hi" }));
  return out.join("");
}

// The engraved arc strip the hammer head sweeps over, with degree ticks.
function arcStrip() {
  const out = [];
  const a0 = GEO.PHI0 - 3, a1 = GEO.PHI1 + 4;
  const ringPts = [];
  for (let a = a0; a <= a1 + 1e-9; a += 1.5) ringPts.push(swingPt(42, a));
  for (let a = a1; a >= a0 - 1e-9; a -= 1.5) ringPts.push(swingPt(36, a));
  out.push(S(k.extrude(ringPts, 0, 0.7, P, { convex: false }), { tone: "lo" }));
  const minor = [], major = [];
  for (let a = Math.ceil(a0 / 3) * 3; a <= a1; a += 3) {
    const big = a % 15 === 0;
    (big ? major : minor).push(k.lineOnTop(swingPt(42, a), swingPt(big ? 36 : 39.6, a), 0.7, P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(L(k.onTop(ringPts.slice(ringPts.length / 2), 0.7, P), { tone: "lo" }));
  return out.join("");
}

// Lane rails (minus the section that crosses in front of the anvil), sleepers, the pit.
function lane() {
  const out = [];
  const [x0, x1] = GEO.RAIL_X;
  const sleepers = [];
  for (let x = x0 + 4; x <= x1 - 4; x += 12) if (x + 2 < PIT.x - 1 || x - 2 > PIT.x + PIT.w + 1) sleepers.push(x);
  for (const x of sleepers) out.push(S(k.slabOf({ x: x - 2, y: -RAIL_Y - 4, w: 4, d: 2 * RAIL_Y + 8, r: 0.6 }, 0, 0.8, P, 2), { tone: "lo", crease: "none" }));
  // pit: dark floor, far and end rim bars (the near bar is in scene.mjs)
  out.push(S(k.slabOf(PIT, -0.2, 0.2, P, 2), { tone: "lo", flat: true, crease: "none" }));
  out.push(S(k.slabOf({ x: PIT.x, y: PIT.y - 1.6, w: PIT.w, d: 1.6, r: 0.4 }, 0, 1.4, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: PIT.x - 1.6, y: PIT.y - 1.6, w: 1.6, d: PIT.d + 3.2, r: 0.4 }, 0, 1.4, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: PIT.x + PIT.w, y: PIT.y - 1.6, w: 1.6, d: PIT.d + 3.2, r: 0.4 }, 0, 1.4, P, 2), { tone: "mid", crease: "none" }));
  out.push(Dt([[PIT.x - 0.8, PIT.y - 0.8], [PIT.x + PIT.w + 0.8, PIT.y - 0.8], [PIT.x - 0.8, PIT.y + PIT.d + 0.8], [PIT.x + PIT.w + 0.8, PIT.y + PIT.d + 0.8]].map(([x, y]) => at([x, y, 1.4])), { size: 0.4 }));
  // far rail whole, near rail in two pieces round the pit section
  const rail = (y, a, b) => S(k.slabOf({ x: a, y: y - 2, w: b - a, d: 4, r: 0.8 }, 0, 3, P, 2, 0.3), { tone: "mid" });
  out.push(rail(-RAIL_Y, x0, x1));
  out.push(rail(RAIL_Y, x0, PIT.x - 1), rail(RAIL_Y, PIT.x + PIT.w + 1, x1));
  out.push(Dt([x0 + 3, x1 - 3].flatMap((x) => [at([x, -RAIL_Y, 3]), at([x, RAIL_Y, 3])]), { size: 0.4 }));
  for (const y of [-RAIL_Y, RAIL_Y]) {
    out.push(S(k.slabOf({ x: x0 - 5, y: y - 3, w: 5, d: 6, r: 0.8 }, 0, 5, P, 2, 0.3), { tone: "mid" }));
    out.push(Dt([at([x0 - 2.5, y, 5])], { size: 0.42 }));
  }
  return out.join("");
}

// Static parts that still have to be depth-sorted against the moving ones.
function statics() {
  const items = [];
  // pivot: plinth, collar, post, lower hub (the cap is drawn with the arm)
  {
    const pl = { x: PX - 14, y: PY - 14, w: 28, d: 28, r: 3 };
    let s = `<path class="iso-halo" d="${k.haloOf(pl, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    s += S(k.slabOf(pl, 0, 5, P, 5, 0.6), { tone: "mid" });
    s += L(k.planOutline(k.insetPlan(pl, 3), 5, P), { tone: "faint" });
    s += Dt(k.corners(pl, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 });
    s += S(k.cylinder(PX, PY, 7.5, 5, 3, P, 32, 0.4), { tone: "mid" });
    s += S(k.cylinder(PX, PY, 4, 8, 11, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(PX, PY, 4, 13, P, 16), { tone: "faint" }) });
    s += S(k.cylinder(PX, PY, 6, 19, 2, P, 28), { tone: "mid" });
    items.push({ key: dep(PX, PY), svg: s });
  }
  // the release latch at rest and the buffer at the end of the stroke: posts with pads
  const post = (phi, pad) => {
    const [x, y] = swingPt(50, phi);
    let s = S(k.cylinder(x, y, 5, 0, 2, P, 24), { tone: "mid" });
    s += S(k.cylinder(x, y, 2.8, 2, 18.6, P, 18), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 2.8, 11, P, 14), { tone: "faint" }) });
    s += S(k.cylinder(x, y, 3.6, 20.6, 3.8, P, 20), { tone: "lo" });
    s += S(k.cylinder(x, y, 2.8, 24.4, 0.8, P, 18), { tone: "mid", crease: "none" });
    s += S(k.cylinder(x, y, 3.4, 25.2, 2, P, 18), { tone: "mid" });
    s += Dt([at([x, y, 27.2])], { size: 0.45 });
    return { key: dep(x, y) + pad, svg: s };
  };
  items.push(post(GEO.PHI0 - 8, 0), post(GEO.PHI1 + 8, 0));
  // far bumper the escaping block ends against
  {
    const bx = GEO.BUMPER;
    let s = S(k.slabOf({ x: bx + 3, y: -22, w: 6, d: 44, r: 1.2 }, 0, 12, P, 3, 0.5), { tone: "mid" });
    s += Dt([at([bx + 6, -18, 12]), at([bx + 6, 18, 12])], { size: 0.45 });
    s += S(k.slabOf({ x: bx, y: -12, w: 3, d: 24, r: 0.8 }, 4, 7, P, 2), { tone: "lo" });
    items.push({ key: dep(bx + 6, 0), svg: s });
  }
  return items;
}

// The dial that reads how much hold the anvil has left.
function gauge() {
  const out = [];
  const ped = { x: DIAL.x - 13, y: DIAL.y - 13, w: 26, d: 26, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 4, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 4, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.2).map(([x, y]) => at([x, y, 4])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5, 4, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3, 6.4, DIAL.z - 6.4, P, 24), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 60, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 1.8, DIAL.top, P, 64), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 1.8, 20, 5, DIAL.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([DIAL.x - 3.6, DIAL.y + 6.6], DIAL.top, P, "x"), "HOLD", { size: 2, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="hi" data-free="" d="${needle(k, P, DIAL, 1)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.4, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}

const START_DELTA = 1;
const REST = stateAt(-10, START_DELTA);
const STATICS = statics();
const GAUGE = { key: dep(DIAL.x, DIAL.y), svg: `<g data-part="gauge">${gauge()}</g>` };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "ha-svg",
  label: "A bench model of the hammer and anvil. A block standing for the enemy force sits on a pallet on a straight lane. At the far end of the lane a blacksmith's anvil rises out of a pit in the bench and stands across the lane: the fixed holding force. Behind the lane a lit hammer head on a long arm swings round a pivot post, strikes the block and drives it down the lane onto the anvil. A dial reads how much longer the anvil can hold. If the hammer lands before the anvil is up, the block slides past into the far bumper; if it lands after the anvil's hold runs out, the anvil sinks back and the block escapes the same way; in between, the block is caught between hammer and anvil.",
  body: [plate(), arcStrip(), lane(), `<g data-part="live">${scene(k, P, { ...REST, statics: [...STATICS, GAUGE] })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain, a company-team vignette (kit/terrain.mjs) ----
// The viewBox is the card's own shape, shown with "slice" so the ground fills the whole card; PF frames
// the visible ground (Fig 1's ground rect, re-centred on FG.VIEW and shrunk by its zoom).
const FW = 640, FH = 420;
const VC = (() => { const c = Math.cos(FG.ANG * Math.PI / 180), s = Math.sin(FG.ANG * Math.PI / 180); return [FG.VIEW.u * c - FG.VIEW.v * s, FG.VIEW.u * s + FG.VIEW.v * c]; })();
const PF = k.fitProjection([[54, -169], [212.5, 57.4], [-18.5, 219], [-177, -7.2]].map(([x, y]) => [VC[0] + (x - 17.75) / FG.VIEW.zoom, VC[1] + (y - 25.05) / FG.VIEW.zoom, 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const POSE0 = fieldPose({ ...REST, t: -10, delta: START_DELTA }, GEO, TF);
const unitSvg = (KK, PP, m) => (m.kind ? trVehicle(KK, PP, trFaceStep(m.face)) : trSoldier(KK, PP, { ...m, face: trFaceStep(m.face) }));
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(k, PF, m)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "ha-field",
  label: "The same idea on a battlefield. A river runs down the right of the ground with a stone bridge carrying the road over it. Behind the river, on the far bank, a blue blocking force of two rifle squads and a machine-gun team, the anvil, waits in the edge of a wood and moves forward into a chalk-outlined line of two-Soldier fighting positions facing back across the river, its machine gun covering the bridge. In the pocket west of the river a red enemy platoon with two vehicles sits in a hasty perimeter between two low rises held by blue fire teams of the encircling force. From a chalk line of departure on the left, the lit blue hammer, a platoon of four tracked vehicles, drives in, strikes the enemy and drives it toward the river. If the hammer arrives while the anvil is in place and holding, the enemy is pinned on the near bank between the two. If it arrives before the anvil is in position, the enemy runs over the bridge through the anvil as it moves up; if it arrives after the anvil's hold is spent and it has pulled back, the enemy escapes over the bridge unopposed. Greyed figures and a stopped, smoking vehicle are casualties on both sides. Sizes, ranges, timings and casualty counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg ha-field"', 'class="iso-svg ha-field" preserveAspectRatio="xMidYMid slice"');

const LABELS = {
  machine: "Hammer and anvil bench. Left and right arrow keys set when the hammer lands relative to the anvil; Enter or click swings it; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys set when the hammer lands relative to the anvil; Enter or click runs it; V switches to the Machine view.",
};

const CAPTION = "Army doctrine (FM 3-90, 2023) describes a hammer and anvil technique: “a stationary blocking force as an anvil” while other elements “use offensive action as a hammer to force the encircled enemy force against the blocking force.” Here the anvil is that blocking force. Every time on the bench is a notional teaching value, not data.";

const card = k.plateHtml({
  fig: "Fig 30",
  title: "Hammer and anvil",
  hint: "Click to swing · ← → timing",
  readout: "",
  keys: [
    { mark: "lit", label: "Hammer: the mobile striking force" },
    { mark: "raised", label: "Anvil: the fixed blocking force, rising from its pit" },
    { mark: "edge", label: "Dial: how long the anvil can still hold on its own" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage ha-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="${MODEL.range[0]}" aria-valuemax="${MODEL.range[1]}" aria-valuenow="${START_DELTA}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("Every time on the bench is a notional teaching value, not data.", "Every time, unit size, range and casualty count here is a notional teaching value, not data.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Hammer: a platoon of four tracked vehicles (lit)" },
    { mark: "blue", label: "Anvil: two rifle squads and an MG team behind the river" },
    { mark: "red", label: "Enemy: a platoon with two vehicles, in the pocket" },
  ], caption: FIELD_CAPTION, body: "",
}));
const cardBoth = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="ha-legend ha-legend-machine">${m}</div><div class="ha-legend ha-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, MODEL, DIAL, START_DELTA, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, START_DELTA, LABELS } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf };
const root = document.querySelector(".ha-figure");
const stage = root.querySelector(".ha-stage");
const svg = stage.querySelector(".ha-svg");
const layer = svg.querySelector('[data-part="live"]');
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const readout = root.querySelector("[data-readout]");
const runBtn = root.querySelector("#ha-run");
const slider = root.querySelector("#ha-delta");
const sliderOut = root.querySelector("#ha-delta-out");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const fieldSvgEl = stage.querySelector(".ha-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const TF = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, dt: 1 / 60 };
let stageF = null, fire = null, marksSig = "";
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const statics = [];
for (const el of svg.querySelectorAll('[data-static]')) { statics.push({ key: Number(el.dataset.key), svg: el.outerHTML }); el.remove(); }
const GAUGE = { key: depthOf([DIAL.x, DIAL.y, 0], P), svg: gaugeEl.outerHTML };
gaugeEl.remove();
statics.push(GAUGE);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const R0 = DATA.MODEL.range;
let delta = START_DELTA;
let t = -10, running = false, resetting = 0, runDelta = delta;
let touring = !still.matches, tourStep = 0, wait = 1.2, last = 0, frame = 0, visible = false, idle = 0;
const TOUR = [-1, 1, 4];
let shown = stateAt(-10, delta);
function fmt(d) { return (d > 0 ? "+" : d < 0 ? "−" : "") + Math.abs(d).toFixed(1) + " s"; }
function setDelta(d) {
  delta = Math.round(clamp(d, R0[0], R0[1]) * 10) / 10;
  if (document.activeElement !== slider) slider.value = String(delta);
  sliderOut.textContent = fmt(delta);
  stage.setAttribute("aria-valuenow", String(delta));
}
// The field state: the bench state plus the run clock and timing (for the casualties' places).
const fieldState = (s) => ({ ...s, t, delta: running || s.landed ? runDelta : delta });
// The page measures the enemy's, the hammer's and the anvil's speeds between frames (for walking
// and facing). While the bench resets, the battlefield holds the run's last frame, then cuts to the start.
let fieldHold = null;
function measureField(s, dt, snap) {
  const { ue, uh } = fieldTargets(s);
  const k = snap || still.matches || !(dt > 0);
  FM.ve = k || FM.ue === undefined ? 0 : FM.ve + ((ue - FM.ue) / dt - FM.ve) * 0.35;
  FM.vh = k || FM.uh === undefined ? 0 : FM.vh + ((uh - FM.uh) / dt - FM.vh) * 0.35;
  FM.va = k || FM.a === undefined ? 0 : (s.anvil - FM.a) / dt;
  FM.ue = ue; FM.uh = uh; FM.a = s.anvil;
}
// Battlefield frame: soldiers and vehicles move by translate and re-render only when their look
// changes; the fire layer writes attributes only; the sector redraws only when its inputs change.
function drawField(s) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  if (fieldHold) s = fieldHold;
  if (FM.ue === undefined) measureField(s, 0, true);
  const pose = fieldPose(fieldState(s), GEO, TF, FM);
  stageF.put(pose.men.map((m) => {
    const f = trFaceStep(m.face);
    const look = (m.kind ? "v|" + f : trLook(m)) + "|" + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, m.kind ? trVehicle(K, PF, f) : trSoldier(K, PF, { ...m, face: f })); return LOOKS.get(look); } };
  }));
  const sig = pose.nestIn + "|" + pose.hold.toFixed(2);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, pose); marksSig = sig; }
  const ft = still.matches ? 4.37 : FM.t;
  const shots = trShots(pose.streams, ft);
  shots.smoke = shots.smoke.concat(fieldSmoke(pose, ft));
  fire.draw(shots);
}
function draw(s) {
  if (view === "field") drawField(s);
  else {
    layer.innerHTML = scene(K, P, { ...s, statics });
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, s.hold));
  }
  const idleText = "Set to land " + Math.abs(delta).toFixed(1) + " s " + (delta < 0 ? "before" : "after") + " anvil sets";
  const text = running || s.landed ? readoutOf(s, runDelta) : idleText;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function start() {
  fieldHold = null;
  runDelta = delta;
  t = plan(runDelta).start;
  running = true;
  resetting = 0;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (still.matches && running) t = endOf(runDelta) - 0.01;
  if (running) {
    t += dt * (view === "field" ? FG.RATE : 1);
    shown = stateAt(t, runDelta);
    if (t >= endOf(runDelta)) { running = false; resetting = 1; wait = touring ? (view === "field" ? 1.6 : 0.6) : 0; fieldHold = shown; }
  } else if (resetting) {
    // ease everything back to the start: block home, arm on its latch, anvil down
    if (wait > 0) wait -= dt;
    else {
      const k = still.matches ? 1 : 1 - Math.exp(-dt / 0.35);
      shown = { ...shown, swing: shown.swing * (1 - k), escape: shown.escape * (1 - k), anvil: shown.anvil * (1 - k), hold: shown.hold + (1 - shown.hold) * k, landed: false, phase: "waiting" };
      if (shown.swing < 0.002 && shown.anvil < 0.002 && shown.escape < 0.002) { shown = stateAt(-10, delta); resetting = 0; wait = 0.8; FM.ue = undefined; fieldHold = null; }
    }
  } else if (touring) {
    wait -= dt;
    if (wait <= 0) { setDelta(TOUR[tourStep % TOUR.length]); tourStep++; start(); }
  }
  if (!resetting) measureField(shown, dt * (running && view === "field" ? FG.RATE : 1), false);
  FM.t += dt;
  draw(shown);
  // the battlefield keeps firing while it is on screen; the bench stops once it is at rest
  const busy = running || resetting || touring || (view === "field" && !still.matches);
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { if (!running && !resetting) { touring = !still.matches; wait = 0.5; run(); } }, 12000);
};
function swing() { hold(); if (!running) start(); run(); }
function steer(d) { hold(); setDelta(d); if (!running && !resetting) { shown = stateAt(-10, delta); FM.ue = undefined; draw(shown); } run(); }
stage.addEventListener("click", swing);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(delta + 0.5);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(delta - 0.5);
  else if (event.key === " " || event.key === "Enter") swing();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
runBtn.addEventListener("click", swing);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  FM.ue = undefined;
  draw(shown);
  run();
}
slider.addEventListener("input", () => steer(Number(slider.value)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setDelta(delta);
setView(view, false);
window.__hammerAndAnvil = {
  setDelta: steer, swing, setView, view: () => view,
  pose: (d, time) => { touring = false; running = false; resetting = 0; fieldHold = null; clearTimeout(idle); setDelta(d); runDelta = delta; t = time; shown = stateAt(time, delta); FM.ue = undefined; draw(shown); },
  state: () => ({ delta, t, running, shown }),
  stop: () => { touring = false; clearTimeout(idle); },
};
`;

// Statics go into the live layer for the first paint; mark them so the page can lift them out.
const marked = STATICS.map((s) => ({ key: s.key, svg: `<g data-static="" data-key="${s.key}">${s.svg}</g>` }));
const svgMarked = k.figureSvg({
  width: WIDTH, height: HEIGHT, className: "ha-svg", label: svg.match(/aria-label="([^"]*)"/)?.[1] ?? "",
  body: [plate(), arcStrip(), lane(), `<g data-part="live">${scene(k, P, { ...REST, statics: [...marked, GAUGE] })}</g>`],
});

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => cardBoth.replace(svg, () => svgMarked))
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const d of [-1, 0, 1, 3, 4]) {
  const p = plan(d);
  console.log(`delta ${d} s → ${p.why}; at landing:`, readoutOf(stateAt(p.land + 0.01, d), d));
}
console.log("XA", XA.toFixed(2), "XE", GEO.XE, "solids", (PAGE.match(/class="iso-solid/g) || []).length, "wrote index.html", PAGE.length, "bytes");
