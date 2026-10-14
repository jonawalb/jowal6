// Builds interactive/maneuvers/double-envelopment/index.html: an isometric "envelopment vise"
// made with the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/double-envelopment/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as M from "./model.mjs";
import { GEO, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const { MODEL, engaged, jawPoint, pivot, pivotR } = M;
const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 380;
const RAD = Math.PI / 180;

const PLATE = { x: -98, y: -55, w: 226, d: 104, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIAL = { x: 48, y: -35, r: 16, z: 11, h: 6 };
DIAL.top = DIAL.z + DIAL.h;
// the scale's gap faces the viewer: kit angles run clockwise from -y
DIAL.from = Math.atan2(Math.cos(218 * Math.PI / 180), -Math.sin(218 * Math.PI / 180)) + Math.PI / 4;
const LABEL = { x: 84, y: -46, w: 30, d: 16, r: 1.5 };
const RAIL_Y = [-16, 12];
const RAIL_X = [50, 120];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, 0, 24], [DIAL.x, DIAL.y, DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 218 },
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
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[22, 5], [16, 9], [19, 13]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// A turntable-style bed under the block: a round seat with a degree ring, and the pallet slot.
function bed() {
  const out = [];
  // slot rails the pallet slides on, with the ruler that reads how far the block has moved
  for (const y of [-11, 7]) {
    out.push(S(k.slabOf({ x: -88, y, w: 122, d: 4, r: 1 }, 0, GEO.RAIL_TOP, P, 3, 0.2), { tone: "mid" }));
    out.push(Dt([-85, 30].map((x) => at([x, y + 2, GEO.RAIL_TOP])), { size: 0.4 }));
  }
  return out.join("");
}

// The arc slides the jaw tail rollers run on: annular sectors about each pivot, with a scale.
function arcSlides() {
  const out = [];
  const rmid = MODEL.rin + MODEL.thick / 2;
  for (const side of [-1, 1]) {
    const p = pivot(side);
    const q0 = jawPoint(side, GEO.ROLLER, rmid, 0), q1 = jawPoint(side, GEO.ROLLER, rmid, MODEL.open);
    const R = Math.hypot(q0[0] - p[0], q0[1] - p[1]);
    let a0 = Math.atan2(q0[1] - p[1], q0[0] - p[0]) / RAD, a1 = Math.atan2(q1[1] - p[1], q1[0] - p[0]) / RAD;
    while (a1 - a0 > 180) a1 -= 360;
    while (a0 - a1 > 180) a1 += 360;
    if (a1 < a0) [a0, a1] = [a1, a0];
    const lo = a0 - 6, hi = a1 + 6;
    const ar = (r, a) => [p[0] + r * Math.cos(a * RAD), p[1] + r * Math.sin(a * RAD)];
    const sector = (r0, r1) => {
      const pts = [];
      for (let a = lo; a <= hi + 1e-9; a += 2) pts.push(ar(r1, a));
      for (let a = hi; a >= lo - 1e-9; a -= 2) pts.push(ar(r0, a));
      return pts;
    };
    out.push(S(k.extrude(sector(R - 4.5, R + 4.5), 0, 0.8, P, { convex: false, bevel: 0.2 }), { tone: "mid" }));
    // the groove the roller runs in, as a closed slot
    out.push(L(k.onTop(sector(R - 1.2, R + 1.2), 0.8, P, true), { tone: "lo" }));
    // ticks every 2 degrees of jaw opening, hanging from the outer edge
    const minor = [], major = [];
    for (let b = 0; b <= MODEL.open + 1e-9; b += 2) {
      const q = jawPoint(side, GEO.ROLLER, rmid, b);
      const a = Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD;
      const big = b % 10 === 0;
      (big ? major : minor).push(k.lineOnTop(ar(R + 4.5, a), ar(R + 4.5 - (big ? 2.4 : 1.4), a), 0.8, P));
    }
    out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
    // end stops
    for (const a of [lo + 1.2, hi - 1.2]) {
      const c = Math.cos(a * RAD), s = Math.sin(a * RAD);
      const box = [[R - 4.5, -1.4], [R + 4.5, -1.4], [R + 4.5, 1.4], [R - 4.5, 1.4]].map(([r, t]) => [p[0] + r * c - t * s, p[1] + r * s + t * c]);
      out.push(S(k.extrude(box, 0.8, 3.2, P, { bevel: 0.3 }), { tone: "mid" }));
      out.push(Dt([ar(R - 2.8, a), ar(R + 2.8, a)].map(([x, y]) => at([x, y, 4])), { size: 0.4 }));
    }
  }
  return out.join("");
}

// The straight rail the fixing carriage runs on.
function ramRail() {
  const out = [];
  for (const y of RAIL_Y) {
    out.push(S(k.slabOf({ x: RAIL_X[0], y, w: RAIL_X[1] - RAIL_X[0], d: 4, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([RAIL_X[0] + 5, RAIL_X[1] - 5].map((x) => at([x, y + 2, 3])), { size: 0.4 }));
  }
  // a ruler between the rails: how far the carriage stands back
  const strip = { x: RAIL_X[0] + 2, y: -3.5, w: RAIL_X[1] - RAIL_X[0] - 4, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 3, 5, strip.y, 0.6, [1.6, 2.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  for (const x of [RAIL_X[0] - 4, RAIL_X[1]]) {
    out.push(S(k.slabOf({ x, y: -19, w: 4, d: 38, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: "mid" }));
    out.push(Dt([at([x + 2, -14, 8]), at([x + 2, 14, 8])], { size: 0.45 }));
  }
  return out.join("");
}

// The dial gauge: share of the block's rim under attack.
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
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 20, 5, DIAL.top, [1.1, 2.1], P, DIAL.from, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, DIAL, 0.24)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.5, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}
const GAUGE = { key: k.depthOf([DIAL.x, DIAL.y, 0], P), svg: `<g data-part="gauge">${gauge()}</g>` };

const START = { beta: MODEL.open, s: 0, u: 0, fixed: true };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "de-svg",
  label: "A bench vise that models a double envelopment. A round block, the enemy force, sits on a sliding pallet in the middle. On its front a concave ram pad on a straight rail holds it in place: the fixing force. Two curved jaws pivot on its flanks and swing shut round its sides and rear, their tails running on arc slides: the two enveloping forces. A dial gauge reads the share of the block's rim that is under attack. While the ram holds, the jaws close round the block and the gauge climbs to about three quarters. With the ram released, its pad lifts off but stays on the rail, and as the jaws start to close the block slips out the back, through the gap between the jaw tails, and the gauge falls to zero.",
  body: [plate(), bed(), arcSlides(), ramRail(), `<g data-part="live">${scene(k, P, M, { ...START, statics: [GAUGE] })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at platoon scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape, shown with "slice" so the ground fills the whole card at every
// width; a phone crops the sides. PF frames the visible ground rect.
const FW = 640, FH = 420;
const PF = k.fitProjection([[54, -169, 0], [212.5, 57.4, 0], [-18.5, 219, 0], [-177, -7.2, 0]], FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose(START, MODEL, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "de-field",
  label: "The same idea on a battlefield. On a low rise in the middle, a red enemy platoon is dug into two-man fighting positions all round the summit, with a machine-gun nest and a belt of wire on its front; the machine gun's fire sector is marked on the ground toward the right. On the right, behind a stone wall, a blue support-by-fire element (a rifle squad and a machine-gun team) fires tracers into the enemy's front and fixes it. Two blue rifle squads move along tracks through the woods round both of the enemy's flanks; the near one, with the platoon leader, is lit. At the end of their tracks they turn in and close on the flanks and rear in squad line. While the front is held the enemy stays in its holes; released, the support-by-fire element ceases fire but stays in place, and as the squads close the enemy slips out of its positions by a sunken lane out the back. Sizes, ranges and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg de-field"', 'class="iso-svg de-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (FM 3-90, 2023) says a unit performs a double envelopment “by conducting a frontal attack to fix enemy forces in place while enveloping both of the enemy force’s flanks.” Here the ram is that frontal attack and the jaws are the two enveloping forces. The jaws and rim are real geometry; the mapping and the escape rule are a notional teaching model.";

const LABELS = {
  machine: "Envelopment vise. Left and right arrow keys open and close the jaws; F fixes or releases the front; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys move the enveloping squads round the flanks; F fixes or releases the enemy's front; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 2",
  title: "Double envelopment",
  hint: "Move across · click to fix",
  readout: "",
  keys: [
    { mark: "lit", label: "Enemy force: the block on its sliding pallet" },
    { mark: "raised", label: "Fixing force: the ram pad on the front; enveloping forces: the two jaws" },
    { mark: "edge", label: "Gauge: share of the block's rim under attack" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage de-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("Here the ram is that frontal attack and the jaws are the two enveloping forces. The jaws and rim are real geometry; the mapping and the escape rule are a notional teaching model.", "Here the support-by-fire element fixes the front and the two rifle squads are the enveloping forces. Unit sizes, ranges, timings and the escape are notional; the readout is the vise's.");
if (FIELD_CAPTION === CAPTION) throw new Error("field caption sentence not found");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Main effort: the near enveloping squad and the platoon leader (lit)" },
    { mark: "blue", label: "Friendly: support by fire, a squad and an MG team; the far squad" },
    { mark: "red", label: "Enemy: a platoon dug in round the summit" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="de-legend de-legend-machine">${m}</div><div class="de-legend de-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, DIAL, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs").replace(/^export const MODEL = \{[\s\S]*?\n\};\n/m, "const MODEL = DATA.MODEL;\n")}
${strip("scene.mjs").replace(/^const GEO = \{[\s\S]*?\n\};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, START, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, ringSeam, sideArc, lineOnTop, coil, radialTicks, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf };
const MM = { MODEL, jawPoint, pivot };
const root = document.querySelector(".de-figure");
const stage = root.querySelector(".de-stage");
const svg = stage.querySelector(".de-svg");
const fieldSvgEl = stage.querySelector(".de-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { vc: 0, t: 0, esc: undefined };
let stageF = null, fire = null, marksSig = "";
const sliderText = root.querySelector("#de-close-text");
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const SLIDER_TEXT = { machine: "Jaw closure", field: "Envelopment" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const layer = svg.querySelector('[data-part="live"]');
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const readout = root.querySelector("[data-readout]");
const fixBtn = root.querySelector("#de-fix");
const slider = root.querySelector("#de-close");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const GAUGE = { key: depthOf([DIAL.x, DIAL.y, 0], P), svg: gaugeEl.outerHTML };
gaugeEl.remove();
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// closure c in 0..1 (0 open, 1 shut) maps to jaw opening beta
const betaOf = (c) => MODEL.open * (1 - c);
const S = { ...START, c: 0, target: 0, f: engaged(START).share };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
// [time, fixed, closure]
const TOUR = [[0, true, 0], [1.2, true, 1], [5, true, 0], [6.6, false, 0], [7.8, false, 1], [11.6, false, 0], [13.2, true, 0], [15, true, 0]];
function tourAt(t) {
  t %= 15;
  let step = TOUR[0];
  for (const row of TOUR) if (t >= row[0]) step = row;
  return step;
}
function setFixed(on) {
  S.fixed = on;
  fixBtn.setAttribute("aria-pressed", String(on));
  fixBtn.textContent = on ? "Release the front" : "Fix the front";
}
let said = "";
// Battlefield frame: soldiers move by translate and re-render only when their look changes; the
// fire layer writes attributes only; the fire sectors redraw only when the state moves them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, MODEL, T, FM);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m);
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = pose.hold.toFixed(2) + "|" + pose.out.toFixed(1) + "|" + pose.mgHome;
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  const e = engaged(S);
  if (view === "field") drawField();
  else {
    layer.innerHTML = scene(K, P, MM, { ...S, statics: [GAUGE] });
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, S.f));
  }
  const hold = holding(S.fixed, S.u, S.s);
  const front = hold ? "Front held" : S.fixed ? "Fixing" : S.s < -1 ? "Slipped out" : "Front free";
  const jaws = S.beta < 0.5 ? "jaws shut" : S.beta > MODEL.open - 0.5 ? "jaws open" : "jaws " + Math.round(S.c * 100) + "%";
  // the battlefield adds the notional men down, friendly vs enemy (shorter words to fit)
  const LS = view === "field" ? losses(S, hold, MODEL) : null;
  const text = LS
    ? (hold ? "Held" : S.fixed ? "Fixing" : S.s < -1 ? "Slipped" : "Free") + " · " + jaws + " · " + Math.round(e.share * 100) + "% rim · " + LS.blue + " vs " + LS.red + " down"
    : front + " · " + jaws + " · " + Math.round(e.share * 100) + "% of rim";
  if (readout.textContent !== text) readout.textContent = text;
  const words = (S.fixed ? "Front fixed" : "Front released") + ", jaws " + Math.round(S.target * 100) + "% closed";
  if (words !== said) { said = words; stage.setAttribute("aria-valuenow", String(Math.round(S.target * 100))); stage.setAttribute("aria-valuetext", words); }
  if (document.activeElement !== slider) slider.value = String(Math.round(S.target * 100));
  return e.share;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const [, fixed, c] = tourAt(clock);
    if (fixed !== S.fixed) setFixed(fixed);
    S.target = c;
  }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  const near = (x, to) => (Math.abs(x - to) < 1e-3 ? to : x);
  // jaws: eased, rate-limited to a calm swing
  const c0 = S.c;
  const step = clamp(ease(S.c, S.target, 0.6) - S.c, -0.9 * dt, 0.9 * dt);
  const s0 = S.s;
  S.c = near(calm ? S.target : S.c + step, S.target);
  S.beta = betaOf(S.c);
  // the jaws cannot close through a block that is part-way out the back: they wait for it
  const jawStuck = blocked(S.beta, s0);
  if (jawStuck) { S.c = c0; S.beta = betaOf(c0); }
  // ram: home on the block when fixed, backed off when released
  S.u = near(ease(S.u, S.fixed ? 0 : MODEL.withdraw, 0.4), S.fixed ? 0 : MODEL.withdraw);
  // block: slips out the back when unheld and the jaws start to close, never through the pad
  const want = blockTarget(S.fixed, S.beta, S.s);
  S.s = near(Math.min(ease(S.s, want, 0.3), S.u), want);
  if (S.fixed) S.s = Math.min(S.s, S.u);
  if (calm && S.s > s0 && blocked(S.beta, Math.max(s0, -30))) S.s = s0;
  // nor can the block slide back in through the jaws
  const blockStuck = blocked(S.beta, S.s);
  if (blockStuck) S.s = s0;
  const share = engaged(S).share;
  S.f = near(ease(S.f, share, 0.22), share);
  FM.t += dt;
  FM.vc = ease(FM.vc, (S.c - c0) / dt, 0.12);
  const esc = -S.s / MODEL.escape;
  FM.esc = calm ? esc : fieldEscape(FM.esc, esc, dt);
  draw();
  const settled = !touring && (S.c === S.target || jawStuck) && S.u === (S.fixed ? 0 : MODEL.withdraw) && (S.s === want || blockStuck) && S.f === share;
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && (!calm || FM.esc !== esc || Math.abs(FM.vc) > 1e-4))) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const steer = (c) => { S.target = clamp(c, 0, 1); hold(); };
const toggle = () => { setFixed(!S.fixed); hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  sliderText.textContent = SLIDER_TEXT[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const r = stage.getBoundingClientRect();
  steer(((event.clientX - r.left) / r.width - 0.15) / 0.7);
});
stage.addEventListener("click", toggle);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(S.target + 0.1);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(S.target - 0.1);
  else if (event.key === "Home") steer(0);
  else if (event.key === "End") steer(1);
  else if (event.key === "f" || event.key === "F" || event.key === " " || event.key === "Enter") toggle();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
fixBtn.addEventListener("click", toggle);
// Reset: back to the state the page opened in (model, controls and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  Object.assign(S, START, { c: 0, target: 0, f: engaged(START).share });
  Object.assign(FM, { vc: 0, t: 0, esc: undefined });
  setFixed(S.fixed);
  slider.value = "0";
  touring = !still.matches; clock = 0;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => steer(Number(slider.value) / 100));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setFixed(S.fixed);
setView(view, false);
window.__doubleEnvelopment = { S, setFixed, steer, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
const pct = (st) => Math.round(engaged(st).share * 100);
console.log("held, open", pct({ beta: MODEL.open, s: 0, u: 0 }), "% · held, shut", pct({ beta: 0, s: 0, u: 0 }), "% · free, slipped out the back", pct({ beta: 0, s: -MODEL.escape, u: MODEL.withdraw }), "%");
console.log("pivot radius", pivotR(), "wrote index.html", PAGE.length, "bytes");
