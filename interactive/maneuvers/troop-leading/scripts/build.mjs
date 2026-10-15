// Builds interactive/maneuvers/troop-leading/index.html: an isometric "time bench" made with the Anatomy kit
// (kit/, MIT). Run: node interactive/maneuvers/troop-leading/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, STEPS, END, stepStates, outcome, readout, rehearsed, covered } from "./model.mjs";
import { GEO, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 380;
const G = GEO;
const PLATE = { x: -132, y: -76, w: 240, d: 124, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIAL = { x: 74, y: -20, r: 16, z: 22, h: 8 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: -126, y: -2, w: 24, d: 14, r: 1.5 };
const ZTOP = G.BASE + MODEL.total * G.HU + 2.4;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [G.CL[0], G.CL[1], ZTOP + 2], [G.CS[0], G.CS[1], ZTOP + 2], [G.POSTS_X[0], G.POST_Y, 20], [G.POSTS_X[7], G.POST_Y, 20], [DIAL.x, DIAL.y, DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 55, elevation: 34 },
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
  [[14, 3.6], [10, 6.4], [12, 9.2]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 4, LABEL.y + dy], [LABEL.x + 4 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.4, LABEL.y + 2.4, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8])], { size: 0.42 }));
  return { key: -1e6, svg: out.join("") };
}

// The station rail at the back and the eight posts (columns and number plates; the lamps are live).
function stations() {
  const items = [];
  const rail = { x: -114, y: G.POST_Y - 4, w: 220, d: 8, r: 0.8 };
  let o = S(k.slabOf(rail, 0, 1.2, P, 3, 0.2), { tone: "lo" });
  o += Dt(k.corners(rail, 3).map(([x, y]) => at([x, y, 1.2])), { size: 0.4 });
  items.push({ key: k.depthOf([-8, G.POST_Y, 0], P) - 3, svg: o });
  G.POSTS_X.forEach((x, i) => {
    const y = G.POST_Y;
    let s = S(k.slabOf({ x: x - 6.5, y: y - 3.4, w: 13, d: 6.8, r: 0.8 }, 1.2, 2.2, P, 3, 0.3), { tone: "mid" });
    s += S(k.cylinder(x, y, 1.6, 3.4, 7.6, P, 16), { tone: "mid", crease: "none" });
    // the station number: one dot per step, in two rows
    const dots = [];
    for (let n = 0; n <= i; n++) dots.push(at([x - 4.2 + (n % 4) * 2.8, y + (n < 4 ? 0.9 : -0.9) * 1.4 + 0.2, 3.4]));
    s += Dt(dots, { size: 0.5, tone: "hi" });
    items.push({ key: k.depthOf([x, y, 0], P) - 0.5, svg: s });
  });
  return items;
}

// The two chambers' collars and scale pillars, the neck pipe and its valve.
function chambers() {
  const items = [];
  const col = ([cx, cy]) => {
    let o = `<path class="iso-halo" d="${k.slabOf({ x: cx - 17, y: cy - 17, w: 34, d: 34, r: 6 }, 0, 0.1, P).fill}" style="filter:blur(3px)"/>`;
    o += S(k.cylinder(cx, cy, 16.6, 0, G.BASE, P, 48, 0.5), { tone: "mid" });
    o += L(k.ring(cx, cy, 14.4, G.BASE, P, 48), { tone: "faint" });
    o += Dt(Array.from({ length: 6 }, (_, n) => at([cx + 15.4 * Math.cos(n * 1.0472 + 0.5), cy + 15.4 * Math.sin(n * 1.0472 + 0.5), G.BASE])), { size: 0.4 });
    return o;
  };
  items.push({ key: k.depthOf([G.CL[0], G.CL[1], 0], P) - 1, svg: col(G.CL) }, { key: k.depthOf([G.CS[0], G.CS[1], 0], P) - 1, svg: col(G.CS) });
  // neck pipe between the collars and a valve wheel on its stem
  const mx = (G.CL[0] + G.CS[0]) / 2, y = G.CL[1];
  let n = S(k.slabOf({ x: G.CL[0] + 16, y: y - 2.4, w: G.CS[0] - G.CL[0] - 32, d: 4.8, r: 1 }, 0.4, 3.4, P, 4, 0.4), { tone: "mid" });
  n += S(k.cylinder(mx, y, 1.3, 3.8, 5, P, 16), { tone: "mid", crease: "none" });
  n += S(k.cylinder(mx, y, 4.6, 8.8, 2.2, P, 28, 0.4), { tone: "hi", crease: "lo" });
  n += L(k.knurl(mx, y, 4.6, 8.8, 11, 24, P, 0.3), { tone: "lo" });
  items.push({ key: k.depthOf([mx, y, 0], P) - 0.5, svg: n });
  // scale pillars: a tick every notional hour, longer at every third (4, 8, 12)
  const pillar = (px, py) => {
    const pl = { x: px, y: py, w: 3, d: 3, r: 0.4 };
    let o = S(k.slabOf(pl, 0, G.BASE + MODEL.total * G.HU + 2.4, P, 3, 0.3), { tone: "mid" });
    const minor = [], major = [];
    for (let h = 1; h <= MODEL.total; h++) {
      const z = G.BASE + h * G.HU, big = h % 4 === 0;
      (big ? major : minor).push(k.segment([px + 3, py, z], [px + 3 + (big ? 3.2 : 2.2), py, z], P));
    }
    o += L(minor.join(""), { tone: "lo" }) + L(major.join(""), { tone: "hi" });
    return o;
  };
  items.push({ key: k.depthOf([G.CL[0] - 26, G.CL[1], 0], P), svg: pillar(G.CL[0] - 26, G.CL[1] - 1.5) });
  items.push({ key: k.depthOf([G.CS[0] + 26, G.CS[1], 0], P), svg: pillar(G.CS[0] + 20, G.CS[1] - 1.5) });
  return items;
}

// The clock rail: hour ticks, the one-third stud, the line of departure gate.
function clockRail() {
  const x0 = G.RAIL_X, y = G.RAIL_Y;
  const R = { x: x0 - 8, y, w: 218, d: 6, r: 0.8 };
  let o = S(k.slabOf(R, 0, 1.2, P, 3, 0.2), { tone: "lo", crease: "none" });
  const minor = [], major = [];
  o += L(k.planOutline(k.insetPlan(R, 0.6), 1.2, P), { tone: "faint" });
  for (let h = 0; h <= MODEL.total + MODEL.after; h++) {
    const x = x0 + h * G.HOUR, big = h % 4 === 0;
    const d = k.lineOnTop([x, y + 5.4], [x, y + 5.4 - (big ? 3.4 : 2.2)], 1.2, P);
    (big ? major : minor).push(d);
  }
  o += L(minor.join(""), { tone: "lo" }) + L(major.join(""), { tone: "mid" });
  o += Dt(k.corners(R, 2.2).map(([x, yy]) => at([x, yy, 1.2])), { size: 0.4 });
  // one-third stud (4 h): a bright pin the leader's strip should not pass
  const sx = x0 + (MODEL.total / 3) * G.HOUR;
  o += S(k.cylinder(sx, y - 3.2, 1.6, 0, 6, P, 16), { tone: "hi", crease: "lo" });
  o += Dt([at([sx, y - 3.2, 6])], { size: 0.45 });
  // the line of departure: two posts and a bar across the rail
  const lx = x0 + MODEL.total * G.HOUR;
  for (const yy of [y - 4.4, y + 10.4]) o += S(k.cylinder(lx, yy, 1.5, 0, 9, P, 16), { tone: "mid", crease: "none" });
  o += S(k.slabOf({ x: lx - 1, y: y - 4.4, w: 2, d: 14.8, r: 0.4 }, 7.4, 1.6, P, 2, 0.2), { tone: "hi", crease: "lo" });
  return [{ key: k.depthOf([x0 + 100, y, 0], P) - 0.4, svg: o }];
}

// The dial gauge: how much of the squads' three tasks the time they are given covers.
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
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 7, 7, DIAL.top, [1.2, 2.8], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([DIAL.x - 5.4, DIAL.y + 7.6], DIAL.top, P, "x"), "TASKS", { size: 2.1, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, DIAL, 0)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.5, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}
const GAUGE = { key: k.depthOf([DIAL.x, DIAL.y, 0], P), svg: `<g data-part="gauge">${gauge()}</g>` };

const STATIC = [plate(), ...stations(), ...chambers(), ...clockRail()].sort((a, b) => a.key - b.key).map((i) => i.svg);
const START = { split: MODEL.start, sand: MODEL.start, clock: 0, running: false };
const sceneState = (s) => ({ sand: s.sand, total: MODEL.total, after: MODEL.after, leaderNeed: MODEL.leaderNeed, clock: s.clock, states: stepStates(s.clock, Math.round(s.split)), statics: [GAUGE] });
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "fl-svg",
  label: "A bench model of troop leading procedures. Two glass chambers joined by a pipe hold the notional twelve hours: the left chamber is the time the leader keeps, with a bright collar at one third; the right chamber is the time given to the squads, with rings marking their three tasks, plan, check and rehearse. A row of eight station lamps lights in order, the eight steps. Below, a carriage rides a rail marked in hours toward a line of departure gate. A dial shows how much of the squads' list the time given to them covers. Hours and numbers are notional.",
  body: [`<g data-part="static">${STATIC.join("")}</g>`, `<g data-part="live">${scene(k, P, sceneState(START))}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at platoon scale (kit/terrain.mjs) ----
const FW = 640, FH = 420;
const PF = k.fitProjection([[-106, -54, 0], [84, -54, 0], [84, 38, 0], [-106, 38, 0]], FW, FH, { pad: 0, azimuth: 72, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose({ sand: START.sand, split: START.split, clock: START.clock }, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "fl-field",
  label: "The same idea on a battlefield, notional. At the left a rifle platoon is in its assembly area: three squads, a platoon sergeant, and the lit platoon leader with a radio operator kneeling at a terrain model marked in chalk. While the leader works through the steps, makes a reconnaissance and gathers the squad leaders for the order, the squads brief, check and rehearse in the time they are given, then cross a chalk line of departure and attack a position of three two-man fighting positions on a rise. A squad that has not rehearsed crosses strung out and bunched, and more men go down. Sizes, ranges, times and casualties are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg fl-field"', 'class="iso-svg fl-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (ATP 3-21.8, 2024) lists eight troop leading procedures steps, and says leaders should “adhere to the one-third/two-thirds rule, allocating roughly one-third of available planning and preparation time to themselves, and allowing their subordinates the remaining two-thirds.” The hours, tasks and casualties here are a notional teaching model, not data.";
const LABELS = {
  machine: "Troop leading time bench. Left and right arrow keys move the clock by an hour; up and down arrow keys change the hours the leader keeps; space runs or pauses the clock; V switches to the Battlefield view. Hours, tasks and casualties are notional model values, not data.",
  field: "Battlefield. Left and right arrow keys move the clock by an hour; up and down arrow keys change the hours the leader keeps; space runs or pauses the clock; V switches to the Machine view. Hours, tasks and casualties are notional model values, not data.",
};
const card = k.plateHtml({
  fig: "Fig 52",
  title: "Troop Leading Procedures",
  hint: "Hover to move the clock",
  readout: "",
  keys: [
    { mark: "lit", label: "Lit lamp: the step being done now" },
    { mark: "raised", label: "Left chamber: the leader’s hours; right chamber: the squads’ hours" },
    { mark: "edge", label: "Collar: one third; dial: share of the squads’ list covered" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage fl-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="${END}" aria-valuenow="0">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = CAPTION.replace("The hours, tasks and casualties here are a notional teaching model, not data.", "Hours, tasks, unit sizes, ranges, timings and casualties are a notional teaching model, not data.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Platoon leader (lit): at the terrain model, then reconnaissance, then the order" },
    { mark: "blue", label: "Friendly: three squads, the radio operator and the platoon sergeant" },
    { mark: "red", label: "Enemy: three two-man positions on the objective" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="fl-legend fl-legend-machine">${m}</div><div class="fl-legend fl-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const stepsHtml = STEPS.map((s, i) => `<li data-step="${i}"><span class="tl-n">${i + 1}</span>${s}</li>`).join("");

const DATA = { P, PF, GEO, MODEL, DIAL, START, LABELS, END };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs").replace("function readout(", "function readoutOf(")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, START, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, segment, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf };
const root = document.querySelector(".tl-figure");
const stage = root.querySelector(".fl-stage");
const svg = stage.querySelector(".fl-svg");
const layer = svg.querySelector('[data-part="live"]');
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const readout = root.querySelector("[data-readout]");
const runBtn = root.querySelector("#tl-run");
const slider = root.querySelector("#tl-split");
const stepEls = [...document.querySelectorAll(".tl-steps [data-step]")];
const fieldSvgEl = stage.querySelector(".fl-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "", stepSig = "";
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Hover to move the clock", field: "Hover to move the clock" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const GAUGE = { key: depthOf([DIAL.x, DIAL.y, 0], P), svg: gaugeEl.outerHTML };
gaugeEl.remove();
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { ...START };
const PACE = 2;                                    // the clock's pace, notional hours per second
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0, tourStep = -1;
// the idle tour (about 17 s): the leader keeps one third and the squads rehearse, then the leader
// keeps seven hours and the squads cross the line unrehearsed
const TOUR = [[0, 4], [8.5, 7]];
const TOUR_LEN = 17.5;
function setRunning(on) {
  S.running = on;
  runBtn.setAttribute("aria-pressed", String(on));
  runBtn.textContent = on ? "Pause the clock" : "Run the clock";
}
function setSplit(v) {
  S.split = clamp(Math.round(v), DATA.MODEL.range[0], DATA.MODEL.range[1]);
  slider.value = String(S.split);
}
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, T, FM);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m);
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = pose.a > 0.4 ? pose.a.toFixed(2) : "0";
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  const states = stepStates(S.clock, Math.round(S.split));
  if (view === "field") drawField();
  else {
    layer.innerHTML = scene(K, P, { sand: S.sand, total: DATA.MODEL.total, after: DATA.MODEL.after, leaderNeed: DATA.MODEL.leaderNeed, clock: S.clock, states, statics: [GAUGE] });
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, covered(S.sand, DATA.MODEL)));
  }
  const sig = states.join("");
  if (sig !== stepSig) {
    stepSig = sig;
    stepEls.forEach((li, i) => { li.dataset.state = ["pending", "active", "done"][states[i]]; if (states[i] === 1) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current"); });
  }
  const text = readoutOf(S.split, S.clock);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(S.clock * 10) / 10));
  stage.setAttribute("aria-valuetext", text + " (hours, tasks and casualties are notional)");
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const t = clock % TOUR_LEN;
    let row = 0;
    TOUR.forEach((r, i) => { if (t >= r[0]) row = i; });
    if (row !== tourStep) { tourStep = row; setSplit(TOUR[row][1]); S.clock = 0; setRunning(true); }
  }
  S.sand = calm ? S.split : S.sand + (S.split - S.sand) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(S.sand - S.split) < 0.002) S.sand = S.split;
  if (S.running) {
    S.clock = calm ? DATA.END : Math.min(DATA.END, S.clock + PACE * dt);
    if (S.clock >= DATA.END) setRunning(false);
  }
  FM.t += dt;
  draw();
  const settled = !touring && !S.running && S.sand === S.split;
  frame = visible && (!settled || view === "field") && !(calm && settled) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; tourStep = -1; run(); }, 9000);
  run();
};
const toggleRun = () => {
  if (!S.running && S.clock >= DATA.END) S.clock = 0;
  setRunning(!S.running);
  hold();
};
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
  const r = stage.getBoundingClientRect();
  S.clock = clamp((event.clientX - r.left) / r.width, 0, 1) * DATA.END;
  setRunning(false);
  hold();
});
stage.addEventListener("click", toggleRun);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") { S.clock = clamp(Math.floor(S.clock) + 1, 0, DATA.END); setRunning(false); }
  else if (event.key === "ArrowLeft") { S.clock = clamp(Math.ceil(S.clock) - 1, 0, DATA.END); setRunning(false); }
  else if (event.key === "ArrowUp") setSplit(S.split + 1);
  else if (event.key === "ArrowDown") setSplit(S.split - 1);
  else if (event.key === " " || event.key === "Enter") toggleRun();
  else if (event.key === "v" || event.key === "V") { setView(view === "field" ? "machine" : "field", true); return event.preventDefault(); }
  else return;
  hold();
  event.preventDefault();
});
runBtn.addEventListener("click", toggleRun);
// Reset: back to the state the page opened in (model, controls, field motion and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  Object.assign(S, START);
  Object.assign(FM, { t: 0 });
  setRunning(false);
  setSplit(START.split);
  marksSig = "";
  touring = !still.matches; clock = 0; tourStep = -1;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => { setSplit(Number(slider.value)); hold(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setRunning(false);
setView(view, false);
window.__troopLeading = { S, setSplit, setRunning, setClock: (c) => { S.clock = clamp(c, 0, DATA.END); draw(); }, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("<!--STEPS-->", () => stepsHtml)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const s of [2, 3, 4, 5, 6, 7, 8]) { const o = outcome(s); console.log(`leader ${s} h, squads ${MODEL.total - s} h: rehearsed ${o.rehearsed.toFixed(2)}, plan ${o.plan.toFixed(2)}, ${o.friendly} vs ${o.enemy} down`); }
console.log("wrote index.html", PAGE.length, "bytes", readout(4, 8), "|", readout(7, 13.5));
