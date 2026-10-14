// Builds interactive/maneuvers/lines-of-operation/index.html: an isometric bench with two
// physical tracks (lines of operation) and three slotted bars (lines of effort) that all
// end on one terminal (the end state). Made with the Anatomy kit (../../kit, MIT).
// Run: node interactive/maneuvers/lines-of-operation/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, state, endTime, readoutText, fieldReadoutText } from "./model.mjs";
import { GEO, scene, trackFrame } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks, loTruck, loCivilian, loCrates, loBarrier, loFlag } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -150, y: -86, w: 302, d: 176, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const RULER = { x: -132, y: 75, w: 244, d: 7, r: 1 };
const LABEL = { x: 118, y: 52, w: 28, d: 18, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.ES.x, GEO.ES.y, GEO.TH + 22]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 60 },
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
  // ruler strip along the front: ground distance, which only the tracks measure
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RULER.x + 4, RULER.x + RULER.w - 4, 4, 5, RULER.y + 0.01, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[20, 5], [14, 9], [17, 13]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The rack for the lines of effort: a riser, three slotted bars with five task detents
// each, and a start bracket on each bar. No ruler: these lines are logical, not ground.
function rack() {
  const out = [];
  const R = GEO.RISER;
  out.push(`<path class="iso-halo" d="${k.haloOf(R, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(R, 0, GEO.RZ, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(R, 2.5, P, 4), { tone: "faint" }) }));
  out.push(Dt([[R.x + 4, R.y + 4], [R.x + 4, R.y + R.d - 4], [R.x + R.w - 4, R.y + 4], [R.x + R.w - 4, R.y + R.d - 4]].map(([x, y]) => at([x, y, GEO.RZ])), { size: 0.45 }));
  for (const by of GEO.LOE_Y) {
    const bar = { x: -126, y: by - 4, w: 238, d: 8, r: 1 };
    out.push(S(k.slabOf(bar, GEO.RZ, GEO.BZ - GEO.RZ, P, 3, 0.4), { tone: "mid" }));
    // slot down the bar (closed outline) and the five task detents rooted on the near edge
    out.push(L(k.planOutline({ x: -118, y: by - 0.9, w: 220, d: 1.8, r: 0.9 }, GEO.BZ, P, 3), { tone: "lo" }));
    const det = [];
    for (let j = 0; j <= 5; j++) {
      const x = GEO.SX[0] + ((GEO.SX[1] - GEO.SX[0]) * j) / 5;
      det.push(k.lineOnTop([x, by + 4], [x, by + 0.9], GEO.BZ, P));
    }
    out.push(L(det.join(""), { tone: "hi" }));
    // start bracket
    const br = { x: -126, y: by - 5, w: 6, d: 10, r: 1 };
    out.push(S(k.slabOf(br, GEO.BZ, 5, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([at([-123, by - 2.6, GEO.BZ + 5]), at([-123, by + 2.6, GEO.BZ + 5])], { size: 0.42 }));
  }
  return out.join("");
}

// The tracks for the lines of operation: sleepers, two rails each, a buffer stop at the start.
function tracks() {
  const out = [];
  for (const T of GEO.LOO) {
    const F = trackFrame(T);
    const quad = (u0, u1, v0, v1, z0, h, bevel = 0) => k.extrude([F.at(u0, v0), F.at(u1, v0), F.at(u1, v1), F.at(u0, v1)], z0, h, P, { bevel });
    const sleepers = [];
    for (let u = 3; u <= F.len - 2; u += 11) sleepers.push(u);
    sleepers.sort((a, b) => k.depthOf([...F.at(a, 0), 0], P) - k.depthOf([...F.at(b, 0), 0], P));
    for (const u of sleepers) out.push(S(quad(u - 1.6, u + 1.6, -7.5, 7.5, 0, 1.2, 0.2), { tone: "lo" }));
    const rails = [-4.5, 4.5].sort((a, b) => k.depthOf([...F.at(0, a), 0], P) - k.depthOf([...F.at(0, b), 0], P));
    for (const v of rails) out.push(S(quad(0, F.len, v - 0.9, v + 0.9, 1.2, 1.8, 0.2), { tone: "mid" }));
    // buffer stop: the base the line starts from
    const plan = [F.at(-9, -8), F.at(0, -8), F.at(0, 8), F.at(-9, 8)];
    out.push(S(k.extrude(plan, 0, 8, P, { bevel: 0.5 }), { tone: "mid" }));
    out.push(Dt([F.at(-4.5, -5.5), F.at(-4.5, 5.5)].map(([x, y]) => at([x, y, 8])), { size: 0.45 }));
    out.push(S(quad(0, 1.2, -5.5, 5.5, 3.4, 3.2, 0.2), { tone: "mid" }));
  }
  return out.join("");
}

// Terminal housing (drawn inside the live scene so it sorts over the arriving carriages).
const PIN_Y = [...GEO.LOO.map((T) => T.e[1]), ...GEO.LOE_Y];
function terminal() {
  const T = GEO.TERM, top = GEO.TH;
  const out = [`<path class="iso-halo" d="${k.haloOf(T, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(T, 0, top, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(T, 5, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(T, 3), top, P, 4), { tone: "faint" }));
  out.push(Dt(k.corners(T, 1.6).map(([x, y]) => at([x, y, top])), { size: 0.45 }));
  // pin guide block: a raised strip the five lock pins rise through
  const G = { x: GEO.PIN_X - 4, y: T.y + 4, w: 8, d: T.d - 8, r: 1.2 };
  out.push(S(k.slabOf(G, top, 2.4, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(G, top + 1.2, P, 3), { tone: "faint" }) }));
  out.push(L(PIN_Y.map((y) => k.ring(GEO.PIN_X, y, 2.6, top + 2.4, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt([G.y + 2.2, G.y + G.d - 2.2].map((y) => at([GEO.PIN_X, y, top + 2.4])), { size: 0.45 }));
  // lid panel and the collar the end-state block rises from
  const LID = { x: GEO.ES.x - 9, y: T.y + 6, w: 18, d: T.d - 12, r: 1.5 };
  out.push(L(k.planOutline(LID, top, P, 3), { tone: "lo" }));
  out.push(Dt(k.corners(LID, 2).map(([x, y]) => at([x, y, top])), { size: 0.42 }));
  const C = { x: GEO.ES.x - 8.5, y: GEO.ES.y - 8.5, w: 17, d: 17, r: 2 };
  out.push(S(k.slabOf(C, top, 2.4, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(C, top + 1.2, P, 3), { tone: "faint" }) }));
  out.push(Dt(k.corners(C, 1.6).map(([x, y]) => at([x, y, top + 2.4])), { size: 0.42 }));
  // vent slots on the housing top, near end
  for (let j = 0; j < 4; j++) out.push(L(k.planOutline({ x: GEO.ES.x - 6, y: 18 + j * 4, w: 12, d: 1.6, r: 0.8 }, top, P, 3), { tone: "lo" }));
  return out.join("");
}
const TERMINAL = { key: 1e4 - 1, svg: `<g data-part="terminal">${terminal()}</g>` };

const pose = (t, stalled) => {
  const s = state(t, stalled);
  const pins = s.home.map((h) => (h ? 1 : 0));
  return { p: s.p, pins, es: s.end ? 1 : 0, lines: MODEL.lines, pinY: PIN_Y };
};
const START = { t: 0.5, stalled: false };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "lo-svg",
  label: "A bench model of lines of operation and lines of effort. In front, two railway tracks cross the bench toward a terminal block on the right; each carriage pauses at gates along its track (decisive points), and a ruler strip measures ground distance. Behind them, three parallel slotted bars on a rack carry sliders that step from detent to detent (tasks) to a stop at the bar's end (a condition). All five lines end on the terminal, which carries one lock pin per line. When every pin is up, a lit block rises from the terminal: the end state.",
  body: [plate(), rack(), tracks(), `<g data-part="live">${scene(k, P, { ...pose(START.t, false), statics: [TERMINAL] })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at operational scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the card at
// every width. The camera's azimuth matches the bench's (60), so the lines run left to right toward the
// end state on the right, the lines of operation in front and the lines of effort behind, as on the bench.
const FW = 640, FH = 420;
const FE = 42, RAD = Math.PI / 180;
const groundRect = (cx, cd, hw, hh) => {
  const e = FE * RAD;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = cx + sx * hw, D = (cd * Math.sin(e) + sy * hh) / Math.sin(e);
    const a = FG.FA * RAD;
    return [X * Math.sin(a) + D * Math.cos(a), -X * Math.cos(a) + D * Math.sin(a), 0];
  });
};
const PF = k.fitProjection(groundRect(-4, 24, 224, 224 * FH / FW), FW, FH, { pad: 0, azimuth: FG.FA, elevation: FE });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose({ t: START.t, stalled: false, es: 0 }, GEO, T);
const unitSvg = (u) => {
  const f = trFaceStep(u.face);
  if (u.kind === "v") return trVehicle(k, PF, f);
  if (u.kind === "t") return loTruck(k, PF, f);
  if (u.kind === "c") return loCivilian(k, PF, f);
  if (u.kind === "crate") return loCrates(k, PF);
  if (u.kind === "bar") return loBarrier(k, PF, f);
  if (u.kind === "flag") return loFlag(k, PF, u.h);
  return trSoldier(k, PF, { ...u, face: f });
};
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "lo-field",
  label: "The same idea on a battlefield at operational scale, with each small vehicle standing for a company. On the left is a walled base. Two lines of operation leave it as blue columns of six vehicles on two roads to a town on the right, the objective, ringed by a chalk outline on pegs. Each road runs through decisive points held by pairs of red vehicles dug in, each with its fire sector marked on the ground: on the near road a bridge over a stream, a village and a hill; on the middle road another bridge and a pass between two hills. A column halts short of each point, deploys and fights for it; red vehicles are knocked out and left greyed with thin smoke, one blue vehicle per road is lost the same way, and an ambulance shuttles casualties back to the base. Behind, three lines of effort work through five villages on a district road that also ends at the town: an aid convoy leaves supplies, a patrol sets a checkpoint, and a training team posts local police in each village in turn. When every line is in, a lit flag rises over the town: the end state. With line of effort 3 stalled, police never reach the last two villages, insurgents come back and fire on the checkpoints there, and the flag never rises. Sizes, distances, timings and casualties are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg lo-field"', 'class="iso-svg lo-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Joint doctrine (JP 5-0, 2020) names two primary methods of organizing an operation: lines of operation, which tie tasks to “geographic and positional references,” and lines of effort, which link tasks by “the logic of purpose—cause and effect.” The schedules on this bench are notional.";

const LABELS = {
  machine: "Lines bench. Left and right arrow keys move campaign time; S stalls or frees line of effort 3; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys move campaign time; S stalls or frees line of effort 3; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 12",
  title: "Lines of operation and effort",
  hint: "Hover to scrub · click to stall",
  readout: "",
  keys: [
    { mark: "raised", label: "Lines of operation: carriages on tracks, gates at decisive points" },
    { mark: "edge", label: "Lines of effort: sliders stepping through tasks to a condition" },
    { mark: "lit", label: "End state: rises only when all five lines are in" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage lo-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${START.t * 100}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("The schedules on this bench are notional.", "Here the lines of operation are columns fighting along roads through decisive points and the lines of effort are civil-military work in villages. Unit sizes, distances, timings and casualties are notional.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "End state: the flag over the town, raised only when all five lines are in" },
    { mark: "blue", label: "Friendly: two columns (LOOs); convoy, patrol, trainers (LOEs)" },
    { mark: "red", label: "Enemy: holding the decisive points; insurgents if LOE 3 stalls" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="lo-legend lo-legend-machine">${m}</div><div class="lo-legend lo-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, START, PIN_Y, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, START, PIN_Y, LABELS } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, lineOnTop, segment, sideArc, ring, corners, planOutline, insetPlan };
const root = document.querySelector(".lo-figure");
const stage = root.querySelector(".lo-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector('[data-part="live"]');
const termEl = svg.querySelector('[data-part="terminal"]');
const readout = root.querySelector("[data-readout]");
const stallBtn = root.querySelector("#lo-stall");
const slider = root.querySelector("#lo-time");
const fieldSvgEl = stage.querySelector(".lo-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "";
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const TERMINAL = { key: 1e4 - 1, svg: termEl.outerHTML };
termEl.remove();
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { t: START.t, target: START.t, stalled: false, pins: [0, 0, 0, 0, 0], es: 0 };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
const TOUR_LEN = 15;
function tourAt(c) {
  c %= TOUR_LEN;
  if (c < 1) return 0;
  if (c < 11.5) return (c - 1) / 10.5;
  if (c < 13.5) return 1;
  return 0;
}
function setStall(on) {
  S.stalled = on;
  stallBtn.setAttribute("aria-pressed", String(on));
  stallBtn.textContent = on ? "Free line of effort 3" : "Stall line of effort 3";
}
// Battlefield frame: units move by translate and re-render only when their look changes (a 15° facing
// step, a stride, a pose, the flag's height); the fire layer writes attributes only; the fire sectors
// redraw only when a fight moves them.
function unitLook(u) {
  const f = trFaceStep(u.face);
  if (u.kind === "m") return "m|" + trLook({ ...u, face: f });
  if (u.kind === "flag") return "flag|" + Math.round(u.h * 40);
  return u.kind + "|" + f;
}
function unitSvg(u) {
  const f = trFaceStep(u.face);
  if (u.kind === "v") return trVehicle(K, PF, f);
  if (u.kind === "t") return loTruck(K, PF, f);
  if (u.kind === "c") return loCivilian(K, PF, f);
  if (u.kind === "crate") return loCrates(K, PF);
  if (u.kind === "bar") return loBarrier(K, PF, f);
  if (u.kind === "flag") return loFlag(K, PF, Math.round(u.h * 40) / 40);
  return trSoldier(K, PF, { ...u, face: f });
}
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF, { smoke: 64 }); }
  const pose = fieldPose(S, null, T, FM);
  stageF.put(pose.units.map((u) => {
    const look = unitLook(u);
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, unitSvg(u)); return LOOKS.get(look); } };
  }));
  const sig = Object.values(pose.fights).flat().map((f) => f.toFixed(2)).join("|");
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  const tt = still.matches ? 4.37 : FM.t;
  const shots = trShots(pose.streams, tt);
  shots.smoke = fieldSmoke(pose, tt).concat(shots.smoke);
  fire.draw(shots);
}
function draw() {
  const s = state(S.t, S.stalled);
  if (view === "field") drawField();
  else layer.innerHTML = scene(K, P, { p: s.p, pins: S.pins, es: S.es, lines: MODEL.lines, pinY: PIN_Y, statics: [TERMINAL] });
  const text = view === "field" ? fieldReadoutText(S.t, S.stalled) : readoutText(S.t, S.stalled);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(S.t * 100)));
  stage.setAttribute("aria-valuetext", text);
  if (document.activeElement !== slider) slider.value = String(Math.round(S.target * 100));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    S.target = tourAt(clock);
  }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  const back = S.target < S.t - 0.2;
  S.t = calm ? S.target : ease(S.t, S.target, back ? 0.35 : 0.25);
  if (Math.abs(S.t - S.target) < 1e-4) S.t = S.target;
  const s = state(S.t, S.stalled);
  S.pins = S.pins.map((v, i) => ease(v, s.home[i] ? 1 : 0, 0.12));
  S.es = ease(S.es, s.end ? 1 : 0, 0.3);
  FM.t += dt;
  draw();
  const settled = !touring && S.t === S.target && S.pins.every((v, i) => Math.abs(v - (s.home[i] ? 1 : 0)) < 0.001) && Math.abs(S.es - (s.end ? 1 : 0)) < 0.001;
  // the battlefield keeps firing and its ambulances keep moving while it is on screen; the bench stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const steer = (t) => { S.target = clamp(t, 0, 1); hold(); };
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const r = stage.getBoundingClientRect();
  steer((event.clientX - r.left - r.width * 0.12) / (r.width * 0.76));
});
stage.addEventListener("click", () => { setStall(!S.stalled); hold(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(S.target + 0.05);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(S.target - 0.05);
  else if (event.key === "s" || event.key === "S" || event.key === " " || event.key === "Enter") { setStall(!S.stalled); hold(); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
stallBtn.addEventListener("click", () => { setStall(!S.stalled); hold(); });
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => steer(Number(slider.value) / 100));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setStall(false);
{ const s0 = state(S.t, false); S.pins = s0.home.map((h) => (h ? 1 : 0)); S.es = s0.end ? 1 : 0; }
setView(view, false);
window.__linesOfOperation = { S, setStall, steer, setView, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const t of [0, 0.25, 0.5, 0.75, 0.9, 1]) console.log(t, readoutText(t), "| stalled:", readoutText(t, true));
console.log("field:", fieldReadoutText(0.5), "|", fieldReadoutText(1), "|", fieldReadoutText(1, true), "| units", POSE0.units.length);
console.log("end state at", endTime(), "stalled:", endTime(true), "wrote index.html", PAGE.length, "bytes");
