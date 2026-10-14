// Builds interactive/maneuvers/operational-reach/index.html: an isometric telescoping arm
// on a knife edge, made with the Anatomy kit (../../kit, MIT).
// Run: node interactive/maneuvers/operational-reach/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, moments, state, safeExtension, tipOf } from "./model.mjs";
import { GEO, scene, needle, prismY, circleXZ, stopTop } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, orUnitSvg, RING_HOME, RING_FWD } from "./field-scene.mjs";
import { losses } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -78, y: -24, w: 276, d: 74, r: 9 };
const PLATE_H = 10;
const FOOT_H = 5;
const DIAL = { x: -40, y: 32, r: 13, z: 20, h: 7 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: 158, y: 30, w: 30, d: 14, r: 1.5 };
const RULE = { x0: -4, x1: 196, y: 18, d: 6 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-58, -10, GEO.ZB + 34], [-58, 10, GEO.ZB + 34], [186, 0, GEO.ZB + 13], [DIAL.x, DIAL.y, DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 70, elevation: 33 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const halo = (plan, z = 0, blur = 3) => `<path class="iso-halo" d="${k.haloOf(plan, z, 0.1, P)}" style="filter:blur(${blur}px)"/>`;

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 16))) {
    out.push(S(k.cylinder(x, y, 6.4, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 9.5);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[20, 4], [14, 7.5], [17, 11]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 6, LABEL.y + dy], [LABEL.x + 6 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The reach ruler: a strip inlaid along the arm, ticks every 4 units from the knife edge.
function ruler() {
  const out = [];
  const plan = { x: RULE.x0, y: RULE.y, w: RULE.x1 - RULE.x0, d: RULE.d, r: 0.8 };
  out.push(S(k.slabOf(plan, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(0, 192, 4, 5, RULE.y, 0.8, [1.6, 3.2], P, "x");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([0, RULE.y], [0, RULE.y + 4.4], 0.8, P), { tone: "hi" }));
  out.push(L(k.lineOnTop([GEO.POST, RULE.y], [GEO.POST, RULE.y + 4.4], 0.8, P), { tone: "hi" }));
  out.push(Dt([at([RULE.x0 + 2, RULE.y + RULE.d - 1.4, 0.8]), at([RULE.x1 - 2, RULE.y + RULE.d - 1.4, 0.8])], { size: 0.38 }));
  return out.join("");
}

// The home pedestal: foot, column, head block, V-block and the stop pad.
function pedestal() {
  const out = [];
  const foot = { x: -15, y: -15, w: 30, d: 30, r: 2.4 };
  out.push(halo(foot));
  out.push(S(k.slabOf(foot, 0, 4, P, 4, 0.5), { tone: "mid" }));
  out.push(Dt(k.corners(foot, 3.4).map(([x, y]) => at([x, y, 4])), { size: 0.48 }));
  out.push(L(k.corners(foot, 3.4).map(([x, y]) => k.ring(x, y, 1.6, 4, P, 14)).join(""), { tone: "lo" }));
  const col = { x: -7, y: -7, w: 14, d: 14, r: 1.4 };
  const headZ = GEO.ZP - 10;
  out.push(S(k.slabOf(col, 4, headZ - 4, P, 3), { tone: "mid", inner: L(k.sideSeam(col, 10, P, 3), { tone: "faint" }) }));
  const head = { x: -11, y: -9.5, w: 27, d: 19, r: 1.4 };
  out.push(S(k.slabOf(head, headZ, 4, P, 3, 0.4), { tone: "mid" }));
  // V-block: a body and two convex jaws, the notch apex on the pivot line
  const zb = headZ + 4, zt = GEO.ZP + 2.5, w = 2.5 * Math.tan(50 * Math.PI / 180);
  out.push(S(prismY(k, P, [[-9, zb], [9, zb], [9, GEO.ZP], [-9, GEO.ZP]], -7.5, 7.5), { tone: "mid" }));
  out.push(S(prismY(k, P, [[-9, GEO.ZP], [0, GEO.ZP], [-w, zt], [-9, zt]], -7.5, 7.5), { tone: "mid" }));
  out.push(S(prismY(k, P, [[0, GEO.ZP], [9, GEO.ZP], [9, zt], [w, zt]], -7.5, 7.5), { tone: "mid" }));
  out.push(Dt([at([-6.5, 7.5, zb + 3]), at([6.5, 7.5, zb + 3])], { size: 0.4 }));
  // stop pad bracket on the head block's front: the sleeve lands here when it tips
  const st = stopTop();
  out.push(S(k.slabOf({ x: GEO.STOP_X[0], y: -4, w: 4, d: 8, r: 0.6 }, zb, st - 1.4 - zb, P, 2, 0.2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: GEO.STOP_X[0] - 0.3, y: -4.3, w: 4.6, d: 8.6, r: 1 }, st - 1.4, 1.4, P, 3), { tone: "lo" }));
  return out.join("");
}

// The rear rest: a short post with a rubber pad that the counterweight end sits on.
function rearRest() {
  const X = GEO.REST_X;
  const foot = { x: X - 7, y: -7, w: 14, d: 14, r: 1.6 };
  return halo(foot) +
    S(k.slabOf(foot, 0, 3, P, 3, 0.4), { tone: "mid" }) +
    Dt(k.corners(foot, 2.6).map(([x, y]) => at([x, y, 3])), { size: 0.42 }) +
    S(k.cylinder(X, 0, 3, 3, GEO.ZB - 2 - 3, P, 22), { tone: "mid", crease: "none", inner: L(k.sideArc(X, 0, 3, 12, P, 14), { tone: "faint" }) }) +
    S(k.cylinder(X, 0, 3.8, GEO.ZB - 2, 2, P, 24), { tone: "lo" });
}

// The roller stand's fixed parts: foot, jack housing and hand nut.
function standBase() {
  const X = GEO.POST;
  const foot = { x: X - 12, y: -12, w: 24, d: 24, r: 2 };
  return halo(foot) +
    S(k.slabOf(foot, 0, 3.4, P, 4, 0.5), { tone: "mid" }) +
    Dt(k.corners(foot, 3).map(([x, y]) => at([x, y, 3.4])), { size: 0.45 }) +
    L(k.corners(foot, 3).map(([x, y]) => k.ring(x, y, 1.5, 3.4, P, 14)).join(""), { tone: "lo" }) +
    S(k.cylinder(X, 0, 4.6, 3.4, GEO.HOUSING - 3.4 - 2.6, P, 28), { tone: "mid", crease: "none", inner: L(k.sideArc(X, 0, 4.6, 7, P, 20), { tone: "faint" }) }) +
    S(k.cylinder(X, 0, 6.4, GEO.HOUSING - 2.6, 2.6, P, 32, 0.3), { tone: "mid" }) +
    L(k.knurl(X, 0, 6.4, GEO.HOUSING - 2.6, GEO.HOUSING, 26, P, 0.3), { tone: "lo" });
}

// The dial gauge: moment ratio about the support the arm would tip over, 0 to 1.5.
function gauge() {
  const out = [];
  const ped = { x: DIAL.x - 12, y: DIAL.y - 12, w: 24, d: 24, r: 3 };
  out.push(halo(ped));
  out.push(S(k.slabOf(ped, 0, 4, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 2.6), 4, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3).map(([x, y]) => at([x, y, 4])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5, 4, 2.2, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3, 6.2, DIAL.z - 6.2, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(DIAL.x, DIAL.y, 3, 12, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 60, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 15, 5, DIAL.top, [1.1, 2.3], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // the 1.0 mark (tipping line) at two thirds of the sweep, drawn longer in hi
  const a1 = -0.75 * Math.PI + (1 / 1.5) * 1.5 * Math.PI;
  const r0 = DIAL.r - 2, sx = Math.sin(a1), sy = -Math.cos(a1);
  out.push(L(k.lineOnTop([DIAL.x + sx * r0, DIAL.y + sy * r0], [DIAL.x + sx * (r0 - 3.6), DIAL.y + sy * (r0 - 3.6)], DIAL.top, P), { tone: "hi" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, DIAL, 0.6)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.4, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}
const GAUGE = { key: 1e7, svg: `<g data-part="gauge">${gauge()}</g>` };

const START = { e: 0, th: 0, jack: 0 };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "or-svg",
  label: "A bench model of operational reach. A telescoping arm rests on a knife edge on a pedestal, the home base, with counterweight plates on its rear end. Extending the arm carries a lit load head farther out, and the moment it puts on the knife edge grows until the arm tips forward onto a stop. A roller stand farther along the bench, the forward base, can be jacked up under the arm; once it carries the arm, the arm can extend to full length without tipping. A dial gauge reads the ratio of tipping moment to holding moment about the support the arm would tip over.",
  body: [plate(), ruler(), pedestal(), rearRest(), standBase(), `<g data-part="live">${scene(k, P, MODEL, { ...START, statics: [GAUGE] })}</g>`],
});

const SAFE = safeExtension();
const CAPTION = `Joint doctrine (JP 5-0, 2020) defines operational reach as “the distance and duration across which a joint force can successfully employ military capabilities,” and says locating forces, bases and logistics forward extends it. Here the knife edge is the home base and the roller stand a forward one. The statics are real; the weights, lengths and the mapping to a force are notional.`;

// ---- Battlefield view: the same state on full-bleed terrain at operational scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the whole
// card at every width; a phone crops the sides. The camera is turned like the machine's, so the
// brigade pushes out from the home base on the left toward the objective on the right, as the arm does.
const FW = 640, FH = 420;
const FA = 68, FE = 42;
const RAD = Math.PI / 180;
// Four ground points that frame a screen-aligned rect centred on (cx, cy), hw unit-screen units wide each side.
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const PF = k.fitProjection(groundRect(30, 10, 232, 232 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose({ ...START }, GEO, T);
const unitSvg = (u) => orUnitSvg(k, PF, u, trFaceStep(u.face));
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "or-field",
  label: "The same idea on a battlefield, at operational scale, with each small vehicle standing for a company and each cluster of three for a battalion. On the left, a blue home base of depot sheds and supply stacks sits on a supply road that runs right, over a stream bridge, to a town held by a red enemy battalion dug in on its western edge, its fire sector marked on the ground and an objective flag behind it. A dashed chalk ring round the home base marks how far it can support the force. A blue brigade of three battalions pushes out along the road, the lit lead battalion in front, and supply trucks shuttle out to it from the base, but only inside the ring. Push the lead battalion past the ring and it disperses and stops firing while the trucks turn back at the ring's edge. Set the forward base and a convoy of supply trucks drives up to a planned site staked out beside the road, opens a logistics node, and a second ring grows from it out past the town, so the trucks run from there and the lead battalion can fight at the objective. Sizes, distances and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg or-field"', 'class="iso-svg or-field" preserveAspectRatio="xMidYMid slice"');

const LABELS = {
  machine: "Reach arm. Left and right arrow keys extend and retract the arm; B sets or removes the forward base; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys push the brigade out along its supply road or pull it back; B sets or removes the forward base; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 10",
  title: "Operational reach",
  hint: "Hover to extend · click: base",
  readout: "",
  keys: [
    { mark: "lit", label: "Load head: the force employed at the end of its reach" },
    { mark: "raised", label: "Knife edge and counterweight: the home base; roller stand: a forward base" },
    { mark: "edge", label: "Gauge: tipping moment ÷ holding moment, tips above 1.0" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage or-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="${Math.round(tipOf(0))}" aria-valuemax="${Math.round(tipOf(MODEL.eMax))}" aria-valuenow="${Math.round(tipOf(0))}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("Here the knife edge is the home base and the roller stand a forward one. The statics are real; the weights, lengths and the mapping to a force are notional.", "Here the depot on the left is the home base and the staked site on the road a forward one; the chalk rings show how far each can support the brigade in this model. Unit sizes, distances, rings and timings are notional.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Lead battalion: the force at the end of its reach, lit" },
    { mark: "blue", label: "Friendly: the brigade, supply trucks, home and forward bases" },
    { mark: "red", label: "Enemy: a battalion holding the town" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="or-legend or-legend-machine">${m}</div><div class="or-legend or-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, DIAL, START, LABELS, ZLINE: GEO.ZB + 5 };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\nGEO\.ROLL_TOP[^\n]*\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, START, ZLINE, LABELS } = DATA;
const GEO = DATA.GEO;
const M = DATA.MODEL;
const K = { depthOf, iso, solidSvg, lineSvg, dotsSvg, fadeLineSvg, cameraOf, pathOf, segment, cylinder, slabOf, sideArc, lineOnTop, extrude, towardViewer, onTop, knurl, sideSeam, corners, planOutline, insetPlan };
const root = document.querySelector(".or-figure");
const stage = root.querySelector(".or-stage");
const svg = stage.querySelector(".or-svg");
const layer = svg.querySelector('[data-part="live"]');
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const readout = root.querySelector("[data-readout]");
const baseBtn = root.querySelector("#or-base");
const slider = root.querySelector("#or-reach");
const lossEl = root.querySelector("#or-losses");
const fieldSvgEl = stage.querySelector(".or-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "";
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Hover to extend · click: base", field: "Hover the road · click: base" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const GAUGE = { key: 1e7, svg: gaugeEl.outerHTML };
gaugeEl.remove();
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { ...START, target: 0, base: false, q: moments(0, M.pivot, M).ratio };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
// [time s, forward base set, extension]
const TOUR = [[0, false, 0], [0.6, false, 70], [5, false, 12], [7, true, 12], [8.4, true, 90], [12.4, true, 0], [14.6, false, 0]];
const LOOP = 15.4;
function tourAt(t) {
  t %= LOOP;
  let step = TOUR[0];
  for (const row of TOUR) if (t >= row[0]) step = row;
  return step;
}
function setBase(on) {
  S.base = on;
  baseBtn.setAttribute("aria-pressed", String(on));
  baseBtn.textContent = on ? "Remove the forward base" : "Set the forward base";
}
// Which support carries the arm, and the tilt it settles at.
function settle() {
  const zTop = GEO.ROLL_TOP - GEO.DROP * (1 - S.jack);
  const spans = overPost(S.e, M);
  const onPost = spans && S.jack > 0.985;
  const pivot = moments(S.e, M.pivot, M).ratio;
  let th = 0;
  if (!onPost && pivot > 1) th = spans ? Math.max(0, Math.min(GEO.TIP, contactTilt(zTop))) : GEO.TIP;
  const q = onPost ? moments(S.e, M.post, M).ratio : pivot;
  return { th, q, onPost, resting: !onPost && pivot > 1 && spans && th < GEO.TIP - 0.05 };
}
// Battlefield frame: vehicles move by translate and re-render only when their facing crosses a 15°
// step; the fire layer writes attributes only; the rings redraw only when the state moves them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, GEO, T, FM);
  stageF.put(pose.units.map((u) => {
    const f = trFaceStep(u.face), look = u.kind + "|" + f + (u.out ? "|x" : "");
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, orUnitSvg(K, PF, u, f)); return LOOKS.get(look); } };
  }));
  const sig = pose.jack.toFixed(3);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw(info) {
  if (view === "field") drawField();
  else {
    layer.innerHTML = scene(K, P, M, { ...S, statics: [GAUGE] });
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, S.q));
  }
  const reach = Math.round(tipOf(S.e, M) - M.pivot);
  const ls = losses(S.e, S.base && S.jack > 0.985, M);
  const lossText = "Notional losses at the objective: " + ls.blue + " friendly, " + ls.red + " enemy vehicle" + (ls.red === 1 ? "" : "s") + " knocked out";
  if (lossEl.textContent !== lossText) lossEl.textContent = lossText;
  const word = info.th > 0.6 ? (info.resting ? "on the stand" : "tipped") : info.onPost ? "held by forward base" : "holding";
  const text = "Reach " + reach + " · ratio " + info.q.toFixed(2) + " · " + word;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(reach));
  stage.setAttribute("aria-valuetext", text);
  if (document.activeElement !== slider) slider.value = String(Math.round(tipOf(S.target, M)));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const [, base, e] = tourAt(clock);
    if (base !== S.base) setBase(base);
    S.target = e;
  }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  const step = clamp(ease(S.e, S.target, 0.6) - S.e, -26 * dt, 26 * dt);
  S.e = calm ? S.target : S.e + step;
  S.jack = calm ? (S.base ? 1 : 0) : clamp(S.jack + (S.base ? 1 : -1) * dt / 1.1, 0, 1);
  const info = settle();
  S.th = ease(S.th, info.th, info.th > S.th ? 0.16 : 0.3);
  S.q = ease(S.q, info.q, 0.22);
  FM.t += dt;
  draw(info);
  const settled = !touring && Math.abs(S.e - S.target) < 0.01 && Math.abs(S.th - info.th) < 0.005 &&
    (S.jack === 0 || S.jack === 1) && Math.abs(S.q - info.q) < 0.001;
  // the battlefield keeps firing and its trucks keep moving while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const reachTo = (tip) => { S.target = clamp(tip - tipOf(0, M), 0, M.eMax); hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw(settle());
  run();
}
// The floor point under the pointer in the battlefield's projection.
function fieldFloor(event) {
  const pt = fieldSvgEl.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const p = pt.matrixTransform(fieldSvgEl.getScreenCTM().inverse());
  const a = PF.azimuth * Math.PI / 180, e = (PF.elevation ?? 30) * Math.PI / 180;
  const kk = PF.scale * Math.sqrt(1.6);
  const u = (p.x - PF.origin[0]) / kk, v = (p.y - PF.origin[1]) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
const A0 = iso([0, 0, ZLINE], P), A1 = iso([100, 0, ZLINE], P);
function alongArm(event) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const q = pt.matrixTransform(svg.getScreenCTM().inverse());
  const dx = A1[0] - A0[0], dy = A1[1] - A0[1];
  return 100 * ((q.x - A0[0]) * dx + (q.y - A0[1]) * dy) / (dx * dx + dy * dy);
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  if (view === "field") {
    const [x, y] = fieldFloor(event);
    const n = fieldNearest(x, y);
    if (n.off < 60) reachTo(n.reach);
  } else reachTo(alongArm(event));
});
const toggle = () => { setBase(!S.base); hold(); };
stage.addEventListener("click", toggle);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") reachTo(tipOf(S.target, M) + 8);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") reachTo(tipOf(S.target, M) - 8);
  else if (event.key === "b" || event.key === "B" || event.key === " " || event.key === "Enter") toggle();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
baseBtn.addEventListener("click", (event) => { event.stopPropagation(); toggle(); });
slider.addEventListener("input", () => reachTo(Number(slider.value)));
viewBtns.forEach((b) => b.addEventListener("click", (event) => { event.stopPropagation(); setView(b.dataset.view, true); }));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
// Reset: back to the state the page opened in (model, controls and idle tour); the view is kept.
function reset() {
  clearTimeout(idle);
  Object.assign(S, START, { target: 0, base: false, q: moments(0, M.pivot, M).ratio });
  FM.t = 0;
  setBase(false);
  if (document.activeElement === slider) slider.blur();
  slider.value = String(Math.round(tipOf(0, M)));
  touring = !still.matches; clock = 0;
  draw(settle()); run();
}
root.querySelector(".fd-reset").addEventListener("click", reset);
setBase(S.base);
setView(view, false);
window.__operationalReach = { S, setBase, reachTo, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
console.log("safe extension on the knife edge", SAFE.toFixed(1), "→ reach", tipOf(SAFE).toFixed(1));
for (const e of [0, 48, 90]) console.log(`e ${e}: reach ${tipOf(e)} · pivot ratio ${moments(e, 0).ratio.toFixed(2)} · with base`, state(e, true).fulcrum, state(e, true).ratio.toFixed(3));
console.log(`rings: home ${RING_HOME.toFixed(1)}, forward ${RING_FWD.toFixed(1)} (bench units); field units ${POSE0.units.length}`);
console.log("stop top", stopTop().toFixed(2), "wrote index.html", PAGE.length, "bytes");
