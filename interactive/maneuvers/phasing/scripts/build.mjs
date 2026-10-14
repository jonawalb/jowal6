// Builds interactive/maneuvers/phasing/index.html: an isometric "phase gearbox" made with the Anatomy kit
// (../../kit, MIT). Run: node interactive/maneuvers/phasing/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { PHASES, GATE, TIMING, TOUR, notchX, effortOf, readoutFor, fieldReadoutFor } from "./model.mjs";
import { GEO, gearR, gearZ, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks, phTruck, phPerson, phR } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -132, y: -54, w: 262, d: 108, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const GATE_BLOCK = { x: -62, y: -6, w: 124, d: 26, r: 3 };
const DIAL = { x: 100, y: 34, r: 16, z: 22, h: 7 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: -120, y: 24, w: 30, d: 18, r: 1.5 };
const GPED = { x: -116, y: -42, w: 36, d: 36, r: 3 };
const CPED = { x: 78, y: -39, w: 34, d: 34, r: 3 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.GS[0], GEO.GS[1], 54], [GEO.POST[0], GEO.POST[1], 54], [0, 12, 50], [DIAL.x, DIAL.y, DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 55 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const screwsOn = (plan, inset, z) => {
  const pts = k.corners(plan, inset);
  return L(pts.map(([x, y]) => k.ring(x, y, 1.6, z, P, 14)).join(""), { tone: "lo" }) + Dt(pts.map(([x, y]) => at([x, y, z])), { size: 0.45 });
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

// Gear-stack pedestal, the layshaft on its bearing blocks, and the clutch's pedestal and flywheel.
function driveline() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(GPED, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(GPED, 0, 5, P, 5, 0.6), { tone: "mid" }), screwsOn(GPED, 3.6, 5));
  const rod = { x: GPED.x + GPED.w, y: -35.6, w: CPED.x - GPED.x - GPED.w, d: 3.2, r: 1.5 };
  out.push(S(k.slabOf(rod, 3.4, 3.2, P, 4), { tone: "mid", crease: "none" }));
  for (const x of [-30, 20]) {
    const foot = { x: x - 7, y: -42, w: 14, d: 12.8, r: 1 };
    const body = { x: x - 4, y: -40.6, w: 8, d: 10, r: 1.2 };
    const cap = { x: x - 4, y: -38.6, w: 8, d: 6, r: 1 };
    out.push(S(k.slabOf(foot, 0, 2, P, 3, 0.3), { tone: "mid" }));
    out.push(Dt([[x - 5.4, -40.4], [x + 5.4, -40.4], [x - 5.4, -30.8], [x + 5.4, -30.8]].map(([px, py]) => at([px, py, 2])), { size: 0.42 }));
    out.push(S(k.slabOf(body, 2, 5.2, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf(cap, 7.2, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([at([x, -37.4, 10.2]), at([x, -33.8, 10.2])], { size: 0.42 }));
  }
  for (const x of [-72, 70]) {
    const c = { x, y: -38, w: 3, d: 8, r: 1.2 };
    out.push(S(k.slabOf(c, 1.6, 7.2, P, 3, 0.3), { tone: "mid" }));
    out.push(Dt([at([x + 1.5, -34, 8.8])], { size: 0.42 }));
  }
  out.push(`<path class="iso-halo" d="${k.haloOf(CPED, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(CPED, 0, 5, P, 5, 0.6), { tone: "mid" }), screwsOn(CPED, 3.6, 5));
  const [cx, cy] = GEO.CL;
  out.push(S(k.cylinder(cx, cy, 16, 5, 6, P, 80, 0.6), { tone: "mid", inner: L(k.sideArc(cx, cy, 16, 8, P, 48), { tone: "faint" }) }));
  const t = k.radialTicks(cx, cy, 15.8, 60, 5, 11, [1.0, 1.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

// The gate: a block with a cross channel and six notches, an index tick for each phase.
function gate() {
  const out = [];
  const Z = GEO.GATE_TOP;
  out.push(`<path class="iso-halo" d="${k.haloOf(GATE_BLOCK, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(GATE_BLOCK, 0, Z, P, 6, 0.8), { tone: "mid", inner: L(k.sideSeam(GATE_BLOCK, 4, P, 6), { tone: "faint" }) }));
  const half = 2.2, x0 = notchX(0) - half, x1 = notchX(5) + half;
  const slot = [[x0, -2], [x1, -2]];
  for (let i = 5; i >= 0; i--) {
    const x = notchX(i);
    slot.push([x + half, 2], [x + half, GATE.inY + 2.4], [x - half, GATE.inY + 2.4], [x - half, 2]);
  }
  out.push(`<path class="iso-shade" data-shade="0" d="${k.onTop(slot, Z, P, true)}"/>`);
  out.push(L(k.onTop(slot, Z, P, true), { tone: "lo" }));
  // index ticks hang from the front edge, a long one at each notch
  const edge = GATE_BLOCK.y + GATE_BLOCK.d;
  const minor = [], major = [];
  for (let x = -55; x <= 55; x += 5) {
    const notch = (x + 50) % 20 === 0;
    (notch ? major : minor).push(k.lineOnTop([x, edge], [x, edge - (notch ? 3.4 : 1.6)], Z, P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(screwsOn(GATE_BLOCK, 3.4, Z));
  return out.join("");
}

// One gear per phase, its radius set by the phase's notional level of effort.
function gearStack() {
  const out = [];
  const [gx, gy] = GEO.GS;
  out.push(S(k.cylinder(gx, gy, 6, 5, 2, P, 32, 0.3), { tone: "mid" }));
  PHASES.forEach((p, i) => {
    const z = gearZ(i), r = gearR(p.effort);
    out.push(S(k.cylinder(gx, gy, 3.6, z - 2, 2, P, 24), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(gx, gy, r, z, GEO.GEAR_H, P, 72, 0.5), { tone: "hi", crease: "lo" }));
    out.push(L(k.knurl(gx, gy, r, z + 0.6, z + GEO.GEAR_H - 0.6, Math.round(r * 3), P, 0.3), { tone: "lo" }));
    out.push(L(k.sideArc(gx, gy, r, z + 0.6, P, 48), { tone: "faint" }) + L(k.sideArc(gx, gy, r, z + GEO.GEAR_H - 0.6, P, 48), { tone: "faint" }));
    out.push(L(k.ring(gx, gy, r - 2.2, z + GEO.GEAR_H, P, 64), { tone: "faint" }));
  });
  const top = gearZ(5) + GEO.GEAR_H;
  out.push(S(k.cylinder(gx, gy, 2.4, top, 52 - top, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(gx, gy, 3.8, 52, 2.4, P, 6, 0.3), { tone: "mid" }));
  out.push(L(k.ring(gx, gy, 1.4, 54.4, P, 12), { tone: "lo" }));
  return out.join("");
}
const STACK = { key: k.depthOf([GEO.GS[0], GEO.GS[1], 0], P), svg: `<g data-part="stack">${gearStack()}</g>` };

// The dial that reads the level of effort.
function gauge() {
  const out = [];
  const ped = { x: DIAL.x - 13, y: DIAL.y - 13, w: 26, d: 26, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5.6, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3.4, 7.4, DIAL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(DIAL.x, DIAL.y, 3.4, 14, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 60, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 20, 5, DIAL.top, [1.2, 2.6], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([DIAL.x - 4, DIAL.y + 7], DIAL.top, P, "x"), "EFFORT", { size: 2, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="hi" data-free="" d="${needle(k, P, DIAL, effortOf(0))}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.5, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}
const GAUGE = { key: k.depthOf([DIAL.x, DIAL.y, 0], P), svg: `<g data-part="gauge">${gauge()}</g>` };

const gearMid = (f) => GEO.GEAR_Z0 + GEO.GEAR_STEP * f + GEO.GEAR_H / 2 - 2.2;
const START = { lx: notchX(0), ly: GATE.inY, gap: 0, phi: 0, forkZ: gearMid(0) };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "ph-svg",
  label: "A bench model of the six-phase joint operation model as a gearbox. A shift lever with a lit knob sits in a gate with six notches, Phase 0 Shape through Phase V Enable civil authority. To the left, a stack of six gears, one per phase, with an index pointer on a post that rises to the gear in use; the Dominate gear is the largest. To the right, a clutch lifts its pressure plate for every shift and drops it again, and a dial reads the level of effort, which in this notional model peaks in Dominate.",
  body: [plate(), driveline(), gate(), `<g data-part="live">${scene(k, P, { ...START, statics: [STACK, GAUGE] })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at operational scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the card at
// every width. The camera turns like the machine's (azimuth 55): the friendly base is on the left, the
// enemy-held ridge and town on the right.
const FW = 640, FH = 420, FE = 42;
const RAD = Math.PI / 180;
const groundRect = (cu, cv, hw, hh) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [...phR(cu + sx * hw, cv + sy * hh / Math.sin(FE * RAD)), 0]);
const PF = k.fitProjection(groundRect(14, -10, 172, 172 * FH / FW), FW, FH, { pad: 0, azimuth: FG.A, elevation: FE });
const TT = fieldTerrain();
const FIELD = fieldStatic(k, PF, TT);
const POSE0 = fieldPose({ cur: 0 }, TT);
const unitSvg = (u) => u.kind === "t" ? phTruck(k, PF, trFaceStep(u.face)) : u.kind === "v" ? trVehicle(k, PF, trFaceStep(u.face))
  : u.kind === "s" ? trSoldier(k, PF, { face: trFaceStep(u.face), pose: u.pose, role: u.role, stride: u.stride }) : phPerson(k, PF, trFaceStep(u.face), u.stride, u.cap);
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "ph-field",
  label: "The same six phases on one piece of ground, with each small vehicle standing for a platoon and each group of six for a battalion. On the left, beside a road, is a friendly base with sheds and crate stacks; a chalk phase line crosses the ground in the middle; on the right an enemy-held ridge and a town at a crossroads, with townspeople in its streets. In Shape, one friendly company trains at the base while supply trucks bring stocks in and the enemy battalions sit in garrison. In Deter, the lit friendly battalion (the main effort) deploys along the phase line and a second battalion arrives at the base, while the enemy moves onto the ridge and the town's edge; fire sectors face each other on the ground. In Seize initiative, the second battalion attacks the ridge and takes it, and the lit battalion crosses the phase line; vehicles are knocked out on both sides and an ambulance runs casualties back. In Dominate, the lit battalion assaults the town while the second battalion supports by fire from the ridge, then stops firing and stays; more vehicles are knocked out and the surviving enemy withdraws. In Stabilize, the friendly force breaks down into checkpoints and patrols, aid trucks arrive, townspeople queue at the aid point, local police join the checkpoints, and two snipers fire on one checkpoint before they are hit. In Enable civil authority, the police hold the checkpoints alone and the friendly battalions pull back. Each transition shows as units turning and moving into their next posture, with no firing until they are in place. Sizes, distances, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TT, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg ph-field"', 'class="iso-svg ph-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Phase labels from JP 3-0 (2017, Change 1 2018), Figure V-7. JP 5-0 removed the six-phase model in 2017, and JP 5-0 (2020) says phases are unique to each operation. The effort levels are a notional teaching shape, not data.";

const LABELS = {
  machine: "Phase gearbox. Left and right arrow keys shift down or up a phase; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys shift down or up a phase; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 15",
  title: "Phase gearbox",
  hint: "Hover the gate · click to shift",
  readout: readoutFor(0),
  keys: [
    { mark: "lit", label: "Shift lever: the current phase" },
    { mark: "raised", label: "Clutch: lifts for each transition" },
    { mark: "edge", label: "Gears and dial: notional level of effort" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage ph-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = "Phase labels from JP 3-0 (2017, Change 1 2018), Figure V-7, which treats them as notional. JP 5-0 removed the six-phase model in 2017. Unit sizes, positions, timings and losses are notional.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Friendly battalion (main effort), lit" },
    { mark: "blue", label: "Friendly: second battalion, supply, soldiers" },
    { mark: "red", label: "Enemy battalions and snipers" },
    { mark: "dim", label: "Civil: aid trucks, police, townspeople" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="ph-legend ph-legend-machine">${m}</div><div class="ph-legend ph-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, DIAL, START, GATE_BLOCK, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = \{[\s\S]*?\n\};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, START, GATE_BLOCK, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, slabOf, sideSeam, sideArc, planOutline, insetPlan, cylinder, knurl, ring, lineOnTop, onTop, corners, coil };
const root = document.querySelector(".ph-figure");
const stage = root.querySelector(".ph-stage");
const svg = stage.querySelector(".ph-svg");
const layer = svg.querySelector('[data-part="live"]');
const stackEl = svg.querySelector('[data-part="stack"]');
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const readout = root.querySelector("[data-readout]");
const prevBtn = root.querySelector("#ph-prev");
const nextBtn = root.querySelector("#ph-next");
const slider = root.querySelector("#ph-phase");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const fieldSvgEl = stage.querySelector(".ph-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Hover the gate · click to shift", field: "Click or arrow keys to shift" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const TT = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, lap: 0, d: 0, fire: 1, moving: 0 };
let stageF = null, fire = null, marksSig = "";
// the phase the ground shows: the new one as soon as the clutch goes out, so units shift posture during the transition
const FS = () => ({ cur: S.mode === "idle" ? S.cur : S.target });
const STATICS = [
  { key: depthOf([GEO.GS[0], GEO.GS[1], 0], P), svg: stackEl.outerHTML },
  { key: depthOf([DIAL.x, DIAL.y, 0], P), svg: gaugeEl.outerHTML },
];
stackEl.remove(); gaugeEl.remove();
const gearMid = (f) => GEO.GEAR_Z0 + GEO.GEAR_STEP * f + GEO.GEAR_H / 2 - 2.2;
const S = { ...START, cur: 0, from: 0, target: 0, mode: "idle", e: effortOf(0) };
let touring = !still.matches, tourStep = 0, dwell = 0, last = 0, frame = 0, visible = false, idle = 0;
const LABEL = { "clutch-out": "clutch out", "lever-out": "shifting", slide: "shifting", "lever-in": "shifting", "clutch-in": "clutch in" };
// Battlefield frame: units move by translate and re-render only when their look changes (a 15°
// facing step or a stride); the fire layer writes attributes only; the fire sectors redraw only when
// the phase or its action moves them.
function lookOf(u) {
  const f = trFaceStep(u.face);
  if (u.kind === "s") return { key: "s|" + trLook({ ...u, face: f }), make: () => trSoldier(K, PF, { face: f, pose: u.pose, role: u.role, stride: u.stride }) };
  if (u.kind === "p") return { key: "p|" + (u.cap ? 1 : 0) + "|" + u.stride + "|" + f, make: () => phPerson(K, PF, f, u.stride, u.cap) };
  return { key: u.kind + "|" + f, make: () => u.kind === "t" ? phTruck(K, PF, f) : trVehicle(K, PF, f) };
}
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF, { smoke: 60 }); }
  const pose = fieldPose(FS(), TT, FM);
  stageF.put(pose.units.map((u) => {
    const L = lookOf(u);
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look: u.side + "|" + L.key, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(L.key)) LOOKS.set(L.key, L.make()); return LOOKS.get(L.key); } };
  }));
  const sig = fieldMarksSig(pose);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TT, pose); marksSig = sig; }
  const t = still.matches ? 4.37 : FM.t;
  const shots = trShots(pose.streams, t);
  shots.smoke = fieldSmoke(pose, t).concat(shots.smoke);
  fire.draw(shots);
}
function draw() {
  if (view === "field") drawField();
  else {
    layer.innerHTML = scene(K, P, { ...S, statics: STATICS });
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, S.e));
  }
  const text = S.mode !== "idle" ? transitText(S.from, S.target, LABEL[S.mode]) : view === "field" ? fieldReadoutFor(S.cur, FM.d) : readoutFor(S.cur);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(S.target));
  stage.setAttribute("aria-valuetext", readoutFor(S.target));
  if (document.activeElement !== slider) slider.value = String(S.target);
}
function snap() {
  S.cur = S.from = S.target; S.mode = "idle";
  S.lx = notchX(S.target); S.ly = GATE.inY; S.gap = 0; S.forkZ = gearMid(S.target); S.e = effortOf(S.target);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (still.matches) { snap(); FM.d = 1; FM.fire = 1; fieldStep(FM, FS(), 0, true); draw(); frame = 0; return; }
  const ease = (x, to, tau) => x + (to - x) * (1 - Math.exp(-dt / tau));
  if (touring && S.mode === "idle" && S.cur === S.target) {
    // the Battlefield view holds each phase until its action has run, then FG.HOLD more
    if (view !== "field" || FM.d >= 1) dwell += dt;
    if (dwell > (view === "field" ? FG.HOLD : TIMING.dwell)) { dwell = 0; tourStep = (tourStep + 1) % (TOUR.length - 1); S.target = TOUR[tourStep]; }
  }
  if (S.mode === "idle" && S.target !== S.cur) { S.from = S.cur; S.mode = "clutch-out"; }
  if (S.mode === "clutch-out") { S.gap = ease(S.gap, GEO.GAP_OUT, TIMING.clutch); if (S.gap > GEO.GAP_OUT - 0.05) { S.gap = GEO.GAP_OUT; S.mode = "lever-out"; } }
  else if (S.mode === "lever-out") { S.ly = ease(S.ly, GATE.outY, TIMING.lever); if (Math.abs(S.ly - GATE.outY) < 0.05) { S.ly = GATE.outY; S.mode = "slide"; } }
  else if (S.mode === "slide") {
    const to = notchX(S.target), d = to - S.lx, step = TIMING.slide * dt;
    S.lx = Math.abs(d) <= step ? to : S.lx + Math.sign(d) * Math.min(step, Math.max(Math.abs(d) * 6 * dt, step * 0.25));
    if (S.lx === to) { S.cur = S.target; S.mode = "lever-in"; }
  }
  else if (S.mode === "lever-in") { S.ly = ease(S.ly, GATE.inY, TIMING.lever); if (Math.abs(S.ly - GATE.inY) < 0.05) { S.ly = GATE.inY; S.mode = "clutch-in"; } }
  else if (S.mode === "clutch-in") { S.gap = ease(S.gap, 0, TIMING.clutch); if (S.gap < 0.05) { S.gap = 0; S.mode = S.target !== S.cur ? "clutch-out" : "idle"; if (S.mode !== "idle") S.from = S.cur; } }
  S.forkZ = ease(S.forkZ, gearMid((S.lx - GATE.x0) / GATE.pitch), 0.08);
  const drive = 1 - S.gap / GEO.GAP_OUT;
  S.phi += dt * 2.4 * effortOf(S.cur) * drive;
  if (drive > 0.95) S.e = ease(S.e, effortOf(S.cur), 0.3);
  // battlefield clocks: fire time, the supply shuttle, the drive (no fire with the clutch out), and
  // the eased positions that make each transition a visible shift in posture
  FM.t += dt;
  FM.lap = (FM.lap + dt * FG.TRUCK_V / 420) % 1;
  FM.fire = drive;
  fieldStep(FM, FS(), dt);
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tourStep = Math.max(0, TOUR.indexOf(S.target)); dwell = 0; run(); }, 9000);
  run();
};
const go = (i) => { S.target = clampPhase(i); hold(); if (still.matches) { snap(); draw(); } };
function floorAt(event) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const a = P.azimuth * Math.PI / 180, e = (P.elevation ?? 30) * Math.PI / 180;
  const kk = P.scale * Math.sqrt(1.6);
  const u = (p.x - P.origin[0]) / kk, v = (p.y - P.origin[1]) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch" || view === "field") return;
  // the gate top is 10 units up: lift the floor point by that before testing
  const [x, y] = floorAt(event);
  const g = GATE_BLOCK;
  if (x < g.x - 4 || x > g.x + g.w + 4 || y < g.y - 30 || y > g.y + g.d + 6) return;
  const i = phaseAt(x);
  if (i !== S.target) go(i);
});
stage.addEventListener("click", () => go(S.target === 5 ? 0 : S.target + 1));
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") go(S.target - 1);
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") go(S.target + 1);
  else if (event.key === " " || event.key === "Enter") go(S.target === 5 ? 0 : S.target + 1);
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
prevBtn.addEventListener("click", () => go(S.target - 1));
nextBtn.addEventListener("click", () => go(S.target + 1));
slider.addEventListener("input", () => go(Number(slider.value)));
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  // arriving in the battlefield: put every unit straight into the current phase's posture
  if (view === "field") { FM.d = 1; fieldStep(FM, FS(), 0, true); }
  draw();
  run();
}
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
// Reset: back to the state the page opened in (gearbox, field motion, controls and idle tour); the view is kept.
function reset() {
  clearTimeout(idle);
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, START, { cur: 0, from: 0, target: 0, mode: "idle", e: effortOf(0) });
  for (const k of Object.keys(FM)) delete FM[k];
  Object.assign(FM, { t: 0, lap: 0, d: 0, fire: 1, moving: 0 });
  touring = !still.matches; tourStep = 0; dwell = 0;
  if (document.activeElement === slider) slider.blur();
  fieldStep(FM, FS(), 0, true);
  if (view === "field") { FM.d = 1; fieldStep(FM, FS(), 0, true); }
  draw(); run();
}
root.querySelector(".fd-reset").addEventListener("click", reset);
fieldStep(FM, FS(), 0, true);
setView(view, false);
window.__phasing = { S, FM, go, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (let i = 0; i < PHASES.length; i++) console.log(readoutFor(i), "· gear r", gearR(effortOf(i)).toFixed(1), "z", gearZ(i));
console.log("viewer", k.towardViewer(P).map((v) => v.toFixed(2)).join(","), "wrote index.html", PAGE.length, "bytes");
