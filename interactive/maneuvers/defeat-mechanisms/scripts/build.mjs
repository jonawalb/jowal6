// Builds interactive/maneuvers/defeat-mechanisms/index.html: an isometric bench where four
// tools act on one target block, made with the Anatomy kit (../../kit, MIT).
// Run: node interactive/maneuvers/defeat-mechanisms/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, capability, separately } from "./model.mjs";
import { GEO, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, dmTruck, dmMast } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 380;

const PLATE = { x: -96, y: -94, w: 214, d: 150, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIAL = { x: -58, y: 38, r: 15, z: 22, h: 7 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: 70, y: 32, w: 30, d: 18, r: 1.5 };
const TABLE = { x: -16, y: -21, w: 45, d: 42, r: 7 };
const BIN = { x: -13, y: -88, w: 26, d: 17, r: 2 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [7, -45, 80], [7, 45, 80], [7, 0, 84]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 50 },
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
  [[22, 5], [16, 9], [19, 13]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The groove the clamp ring sinks into.
function groove() {
  const [cx, cy, r0, r1] = GEO.RING;
  return L(k.ring(cx, cy, r0 - 0.4, 0, P, 120) + k.ring(cx, cy, r1 + 0.4, 0, P, 120), { tone: "faint" });
}

// The slide table the block sits on: the engraved home footprint and a scale along its near edge.
function table() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TABLE, 0, 2.5, P)}" style="opacity:.5"/>`];
  out.push(S(k.slabOf(TABLE, 0, GEO.TABLE, P, 6, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline({ x: -14.6, y: -15, w: 29.2, d: 30, r: 1 }, GEO.TABLE, P, 3), { tone: "lo" }));
  const minor = [], major = [];
  const edge = TABLE.y + TABLE.d;
  for (let x = -8; x <= 22; x += 2) {
    const big = (x + 8) % 14 === 0 || x === 6;
    (big ? major : minor).push(k.lineOnTop([x, edge], [x, edge - (big ? 3 : 1.8)], GEO.TABLE, P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(Dt(k.corners(TABLE, 3.4).map(([x, y]) => at([x, y, GEO.TABLE])), { size: 0.45 }));
  return out.join("");
}

// Saw rails with end stops.
function sawRails() {
  const out = [];
  for (const y of [-4.5, 9]) {
    out.push(S(k.slabOf({ x: 46, y, w: 64, d: 2, r: 0.6 }, 0, 2, P, 2, 0.3), { tone: "mid" }));
    out.push(Dt([52, 78, 104].map((x) => at([x, y + 1, 2])), { size: 0.38 }));
  }
  for (const x of [43, 110]) {
    out.push(S(k.slabOf({ x, y: -7, w: 3, d: 20, r: 0.8 }, 0, 5, P, 2, 0.4), { tone: "mid" }));
    out.push(Dt([at([x + 1.5, -4, 5]), at([x + 1.5, 10, 5])], { size: 0.4 }));
  }
  return out.join("");
}

// The supply line: a bin at the back and a two-rail track to the seat, gapped where the ring rises.
function supply() {
  const out = [];
  for (const x of [-4.8, 3.2]) {
    for (const [y0, y1] of [[-71, -36.2], [-28.8, -22]]) {
      out.push(S(k.slabOf({ x, y: y0, w: 1.6, d: y1 - y0, r: 0.4 }, 0, 1.5, P, 2), { tone: "mid", crease: "none" }));
    }
  }
  for (const y of [-68, -58, -48, -40]) out.push(Dt([at([-4, y, 1.5]), at([4, y, 1.5])], { size: 0.36 }));
  out.push(`<path class="iso-halo" d="${k.haloOf(BIN, 0, 18, P)}" style="opacity:.6"/>`);
  out.push(S(k.slabOf(BIN, 0, 18, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(BIN, 6, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BIN, 2.4), 18, P, 4), { tone: "lo" }));
  out.push(Dt(k.corners(BIN, 1.2).map(([x, y]) => at([x, y, 18])), { size: 0.45 }));
  // spare crates stacked beside the bin
  for (const [plan, z] of [[{ x: 18, y: -86, w: 10, d: 8, r: 0.5 }, 0], [{ x: 30, y: -86, w: 10, d: 8, r: 0.5 }, 0], [{ x: 24, y: -85.5, w: 10, d: 7, r: 0.5 }, 6]]) {
    out.push(S(k.slabOf(plan, z, 6, P, 2, 0.3), { tone: "mid", inner: L(k.sideSeam(plan, z + 3, P, 2), { tone: "faint" }) }));
    out.push(L(k.planOutline(k.insetPlan(plan, 1.2), z + 6, P, 2), { tone: "faint" }));
  }
  // the chute mouth on the bin's front face, a closed outline
  const fy = BIN.y + BIN.d;
  out.push(L(k.pathOf([[-5, fy, 2], [5, fy, 2], [5, fy, 10], [-5, fy, 10]].map(at), true), { tone: "lo" }));
  return out.join("");
}

// The dial gauge that reads the target's capability left.
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
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 64, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 20, 5, DIAL.top, [1.2, 2.6], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([DIAL.x - 4.2, DIAL.y + 7], DIAL.top, P, "x"), "CAP %", { size: 2.1, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="mid" data-free="" d="${needle(k, P, DIAL, 1)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.5, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}
const GAUGE = { key: k.depthOf([DIAL.x, DIAL.y, 0], P), svg: `<g data-part="gauge">${gauge()}</g>` };

const START = { d: 0, l: 0, s: 0, i: 0, ring: 0, cart: GEO.CART[0], spin: 0 };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "dm-svg",
  label: "A bench model of the four defeat mechanisms. A lit target block, made of two halves joined by a link plate, sits on a slide table. Around it are four tools: a screw press whose platen crushes the block (destroy), a lever and push rod that knock it off its seat (dislocate), a saw that cuts the link so the halves come apart (disintegrate), and a clamp ring that rises round the seat and stops the supply cart (isolate). A dial gauge reads the block's capability left; it falls further when the tools are combined.",
  body: [plate(), groove(), supply(), sawRails(), table(), `<g data-part="live">${scene(k, P, { ...START, statics: [GAUGE] })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at operational scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape, shown with "slice" so the ground fills the whole card at every
// width; a phone crops the sides. PF frames a screen-aligned ground rect.
const RAD = Math.PI / 180;
const FW = 640, FH = 380;
const FA = 55, FE = 42;
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const FC = [-30 * Math.sin(FA * RAD), 30 * Math.cos(FA * RAD)]; // the card's centre: 30 units left of the enemy centre
const PF = k.fitProjection(groundRect(FC[0], FC[1], 220, 220 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose({ d: 0, l: 0, s: 0, i: 0 }, GEO, T);
const unitSvg = (K, P, u, f) => (u.kind === "t" ? dmTruck(K, P, f) : u.kind === "mast" ? dmMast(K, P, u.lean, u.dir) : trVehicle(K, P, f));
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(k, PF, u, trFaceStep(u.face))}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "dm-field",
  label: "The same idea on a battlefield, at operational scale, with each small vehicle standing for a platoon and each cluster of three for a company. In the middle, a red enemy battalion, lit, holds three company positions dug in facing right, with its fire sector marked on the ground; behind its centre stands its command post, two command vehicles and two antenna masts, and red supply trucks shuttle to it along a road from the left. Four blue elements each carry out one defeat mechanism. Destroy: an artillery battery at the lower right and a company in an attack-by-fire position marked in chalk on a rise knock out enemy vehicles, which stop and smoke. Dislocate: a blue armored company works round the northern flank to the enemy's rear, so its positions face the wrong way, and its vehicles try to turn out of them. Disintegrate: the battery strikes the command post, its masts fall, and the companies drift out of position and fire raggedly. Isolate: a blue blocking company comes up a farm track to a chalk-marked blocking position astride the supply road; the trucks halt and the lead one is hit. Some blue vehicles are hit too, and an evacuation vehicle carries casualties to the rear. Sizes, distances, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg dm-field"', 'class="iso-svg dm-field" preserveAspectRatio="xMidYMid slice"');

const LABELS = {
  machine: "Defeat mechanism bench. Keys 1 to 4 apply or lift destroy, dislocate, disintegrate and isolate; 0 lifts them all; V switches to the Battlefield view.",
  field: "Battlefield. Keys 1 to 4 apply or lift destroy, dislocate, disintegrate and isolate against the enemy battalion; 0 lifts them all; V switches to the Machine view.",
};

const CAPTION = "Army doctrine (ADP 3-0, 2019) names four defeat mechanisms (destroy, dislocate, disintegrate and isolate) and says forces “use combinations” of them. Each tool here stands for one. The gauge’s numbers are a notional teaching shape, not data.";

const card = k.plateHtml({
  fig: "Fig 24",
  title: "Defeat mechanisms",
  hint: "Click a tool · keys 1–4",
  readout: "",
  keys: [
    { mark: "lit", label: "Target: an enemy force, two halves held by a link" },
    { mark: "raised", label: "Tools: press, lever, saw and clamp ring" },
    { mark: "edge", label: "Gauge: the target's capability left (notional)" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage dm-stage" tabindex="0" role="group" aria-label="${LABELS.machine}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = "Army doctrine (ADP 3-0, 2019) names four defeat mechanisms (destroy, dislocate, disintegrate and isolate) and says forces “use combinations” of them. Here each is one friendly element acting on the same enemy battalion. Unit sizes, distances, timings and losses are notional, not data.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Target: the enemy battalion's three companies (lit)" },
    { mark: "red", label: "Enemy: its command post, masts and supply trucks" },
    { mark: "blue", label: "Friendly: battery and three companies, one per mechanism" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="dm-legend dm-legend-machine">${m}</div><div class="dm-legend dm-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, DIAL, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = \{[\s\S]*?\n\};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, START, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, planOutline, insetPlan, corners, ring };
const root = document.querySelector(".dm-figure");
const stage = root.querySelector(".dm-stage");
const svg = stage.querySelector(".dm-svg");
const fieldSvgEl = stage.querySelector(".dm-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Click a tool · keys 1–4", field: "Click a force · keys 1–4" };
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "", lastPose = null;
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const layer = svg.querySelector('[data-part="live"]');
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const readout = root.querySelector("[data-readout]");
const buttons = [...root.querySelectorAll("[data-mech]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const GAUGE = { key: depthOf([DIAL.x, DIAL.y, 0], P), svg: gaugeEl.outerHTML };
gaugeEl.remove();
const KEYS = ["d", "l", "s", "i"];
const S = { ...START, f: 1 };
const on = [false, false, false, false];
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0, cartClock = 0;
// tour: one tool, then two, three and all four together, then lift them all
const TOUR = [[0, [0, 0, 0, 0]], [1.2, [1, 0, 0, 0]], [3.6, [1, 0, 0, 1]], [6.2, [1, 1, 0, 1]], [8.8, [1, 1, 1, 1]], [12.2, [0, 0, 0, 0]]];
const TOUR_LEN = 14.5;
function tourAt(t) {
  t %= TOUR_LEN;
  let step = TOUR[0];
  for (const row of TOUR) if (t >= row[0]) step = row;
  return step[1];
}
function set(i, v) {
  on[i] = v;
  buttons[i].setAttribute("aria-pressed", String(v));
}
function cartTarget(dt) {
  // the cart shuttles supply from the bin to the seat unless the ring is up or rising
  if (on[3]) return GEO.CART[0];
  cartClock = (cartClock + dt) % 6;
  const t = cartClock;
  const u = t < 1 ? 0 : t < 3 ? (t - 1) / 2 : t < 4 ? 1 : (6 - t) / 2;
  return GEO.CART[0] + (GEO.CART[1] - GEO.CART[0]) * (u * u * (3 - 2 * u));
}
// Battlefield frame: vehicles move by translate and re-render only when their look changes (a 15°
// facing step, knocked out, a mast's lean step); the fire layer writes attributes only; the fire
// sectors redraw only when the state moves them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, GEO, T, FM);
  stageF.put(pose.units.map((u) => {
    const f = trFaceStep(u.face), shape = (u.kind || "v") + "|" + f + "|" + (u.lean ?? "") + "|" + (u.dir ?? ""), look = u.side + "|" + shape;
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(shape)) LOOKS.set(shape, u.kind === "t" ? dmTruck(K, PF, f) : u.kind === "mast" ? dmMast(K, PF, u.lean, u.dir) : trVehicle(K, PF, f)); return LOOKS.get(shape); } };
  }));
  const sig = [pose.fall, pose.dOn, pose.lMove, pose.manAt[0]].map((v) => v.toFixed(2)).join("|");
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  const ft = still.matches ? 4.37 : FM.t, shots = trShots(pose.streams, ft);
  shots.smoke = [...fieldSmoke(pose, ft), ...shots.smoke];
  fire.draw(shots);
  lastPose = pose;
  return pose;
}
function draw() {
  const pose = view === "field" ? drawField() : null;
  if (!pose) {
    layer.innerHTML = scene(K, P, { ...S, statics: [GAUGE] });
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, S.f));
  }
  // the readout names the switched-on set and its value; the needle eases toward it. The battlefield
  // adds the set's notional losses, blue vs red vehicles down; the wrecks on the ground catch up with it
  const text = pose ? fieldText(on, capability(on.map(Number)), losses(on.map(Number))) : readoutText(on, capability(on.map(Number)));
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-description", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    tourAt(clock).forEach((v, i) => { if (Boolean(v) !== on[i]) set(i, Boolean(v)); });
  }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  const rate = (x, to, r) => (calm ? to : x + Math.max(-r * dt, Math.min(r * dt, to - x)));
  S.d = rate(S.d, on[0] ? 1 : 0, 0.7);
  S.l = rate(S.l, on[1] ? 1 : 0, 0.8);
  S.s = rate(S.s, on[2] ? 1 : 0, 0.55);
  S.i = rate(S.i, on[3] ? 1 : 0, 1.2);
  if (S.s > 0 && S.s < 1 || on[2]) S.spin = (S.spin + dt * 9) % (2 * Math.PI);
  const ct = calm ? (on[3] ? GEO.CART[0] : GEO.CART[1]) : cartTarget(dt);
  S.cart = ease(S.cart, ct, 0.25);
  // the ring may only rise once the cart is behind it
  const ringWant = S.cart <= GEO.CART_HELD + 0.5 ? S.i : Math.min(S.ring, S.i);
  S.ring = rate(S.ring, ringWant, 1.4);
  S.f = ease(S.f, capability([S.d, S.l, S.s, S.i]), 0.25);
  FM.t += dt;
  fieldTrucks(FM, S, calm ? 0 : dt);
  draw();
  const targets = on.map(Number);
  const settled = !touring && KEYS.every((key, i) => Math.abs(S[key] - targets[i]) < 1e-4) &&
    Math.abs(S.ring - S.i) < 1e-4 && (calm || (on[3] && Math.abs(S.cart - GEO.CART[0]) < 0.01)) && Math.abs(S.f - capability(targets)) < 0.001;
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const toggle = (i) => { set(i, !on[i]); hold(); };
function anchors() {
  if (view === "field") return fieldAnchors(lastPose || fieldPose(S, GEO, T, FM)).map((p) => iso(p, PF));
  const Q = pose(S);
  return [[7, 0, Q.platen + 6], [-48, -2, 18], [Q.sawX + 18, 4, 12], [7, -GEO.RING[2] - 2, 2]].map((p) => iso(p, P));
}
stage.addEventListener("click", (event) => {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const p = pt.matrixTransform((view === "field" ? fieldSvgEl : svg).getScreenCTM().inverse());
  let best = 0, bestD = Infinity;
  anchors().forEach(([x, y], i) => { const d = Math.hypot(x - p.x, y - p.y); if (d < bestD) { bestD = d; best = i; } });
  toggle(best);
});
stage.addEventListener("keydown", (event) => {
  const i = ["1", "2", "3", "4"].indexOf(event.key);
  if (i >= 0) toggle(i);
  else if (event.key === "0") { on.forEach((_, j) => set(j, false)); hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
buttons.forEach((b, i) => b.addEventListener("click", () => toggle(i)));
root.querySelector("#dm-clear").addEventListener("click", () => { on.forEach((_, j) => set(j, false)); hold(); });
// Reset: back to the state the page opened in (tools, model, supply cart and trucks, idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  on.forEach((_, j) => set(j, false));
  Object.assign(S, START, { f: 1 });
  delete FM.tc; delete FM.trucks; FM.t = 0;
  cartClock = 0; lastPose = null;
  touring = !still.matches; clock = 0;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
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
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setView(view, false);
window.__defeatMechanisms = { S, on, set, toggle, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (let n = 0; n <= 4; n++) {
  const a = [0, 1, 2, 3].map((i) => (i < n ? 1 : 0));
  console.log(`${n} mechanisms → ${Math.round(capability(a) * 100)}% left (separately ${Math.round(separately(a) * 100)}%)`);
}
console.log("wrote index.html", PAGE.length, "bytes");
