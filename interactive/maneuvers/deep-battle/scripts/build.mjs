// Builds interactive/maneuvers/deep-battle/index.html: an isometric "deep battle" bench made with
// the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/deep-battle/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, stateAt, timesOf, readoutOf } from "./model.mjs";
import { GEO, xOf, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, dbUnitSvg } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 320;

const PLATE = { x: -162, y: -84, w: 302, d: 140, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const D = GEO.DIAL;
const LABEL = { x: 24, y: -74, w: 34, d: 18, r: 1.5 };
const RULER = { x: xOf(-1.5), y: 44, w: xOf(71.5) - xOf(-6.5), d: 7, r: 1 };
const LANE = [xOf(-17), xOf(MODEL.deep) + 0.2];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [xOf(MODEL.gateA), 0, 48], [xOf(MODEL.gateB), -31, 48], [xOf(MODEL.gateA), 31, 48]],
  WIDTH, HEIGHT, { pad: 12, azimuth: 66 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const slab = (x0, x1, y0, y1, z, h, steps = 3, bevel = 0, r = 0.8) => k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z, h, P, steps, bevel);

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
  [[24, 5], [17, 9], [21, 13]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The km ruler along the front edge: a tick every 5 km, majors every 10, the start line in hi.
function ruler() {
  const out = [S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" })];
  const t = k.topTicks(xOf(0), xOf(70), 5 * GEO.KM, 2, RULER.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // two inlaid zone plates beside the lane: the tactical zone and the operational depth
  for (const [a, b] of [[0, MODEL.tactical], [MODEL.gateB + 1.5, MODEL.deep]]) {
    const plan = { x: xOf(a), y: 33, w: xOf(b) - xOf(a), d: 7, r: 1.2 };
    out.push(S(k.slabOf(plan, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(plan, 1.4), 0.6, P), { tone: "faint" }));
    out.push(Dt([at([plan.x + 3, plan.y + 3.5, 0.6]), at([plan.x + plan.w - 3, plan.y + 3.5, 0.6])], { size: 0.42 }));
  }
  out.push(L([0, MODEL.tactical, MODEL.deep].map((km) => k.lineOnTop([xOf(km), RULER.y + 0.8], [xOf(km), RULER.y + 5.4], 0.6, P)).join(""), { tone: "hi" }));
  return out.join("");
}

// The lane: sleepers, inner rails (second echelon), outer rails (first echelon), end stops, pin sockets.
function lane() {
  const out = [];
  for (let km = -12.5; km <= MODEL.deep + 0.1; km += 5) {
    const x = xOf(km);
    out.push(S(slab(x - 2, x + 2, -25, 25, 0, 1.2, 2, 0, 0.5), { tone: "lo" }));
  }
  for (const [y0, y1] of [[-22, -19], [-8, -5], [5, 8], [19, 22]]) {
    const outer = Math.abs(y0) > 15;
    const x1 = outer ? xOf(MODEL.stop1 + 2) : LANE[1];
    out.push(S(slab(LANE[0], x1, y0, y1, 1.2, 2.5, 2, 0.3, 0.6), { tone: "mid" }));
  }
  for (const [y0, y1] of [[-23, -18], [18, 23]]) {
    const x = xOf(MODEL.stop1 + 2);
    out.push(S(slab(x, x + 3, y0, y1, 1.2, 5, 2, 0.3, 0.6), { tone: "mid" }) + Dt([at([x + 1.5, (y0 + y1) / 2, 6.2])], { size: 0.42 }));
  }
  out.push(S(slab(LANE[0] - 3, LANE[0], -23, 23, 1.2, 5, 3, 0.3, 0.8), { tone: "mid" }) +
    Dt([-20, -6.5, 6.5, 20].map((y) => at([LANE[0] - 1.5, y, 6.2])), { size: 0.42 }));
  out.push(L(MODEL.pins.map((km) => k.ring(xOf(km), 0, 2.6, 0, P, 18)).join(""), { tone: "lo" }));
  // reserve rails along y beside the rear gate, with end stops
  for (const dx of [-4, 4]) {
    const x = GEO.RES_X + dx;
    out.push(S(slab(x - 1.2, x + 1.2, -71, -30.5, 0, 2.5, 2, 0.3, 0.5), { tone: "mid" }));
  }
  out.push(S(slab(GEO.RES_X - 6, GEO.RES_X + 6, -74, -71, 0, 6, 3, 0.3, 0.6), { tone: "mid" }) +
    Dt([at([GEO.RES_X - 4, -72.5, 6]), at([GEO.RES_X + 4, -72.5, 6])], { size: 0.42 }));
  return out.join("");
}

// The day clock: 0 to MODEL.days, a major tick each day, the reserve's arrival day marked in hi.
function dial() {
  const out = [];
  const ped = { x: D.x - 13, y: D.y - 13, w: 26, d: 26, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(D.x, D.y, 5.6, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(D.x, D.y, 3.4, 7.4, D.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(D.x, D.y, 3.4, 14, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(D.x, D.y, D.r, D.z, D.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(D.x, D.y, D.r, D.top - 3, D.top, 70, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(D.x, D.y, D.r, D.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(D.x, D.y, D.r - 2, D.top, P, 72), { tone: "lo" }));
  const t = k.radialTicks(D.x, D.y, D.r - 2, MODEL.days * 4, 4, D.top, [1.2, 2.6], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const a = -0.75 * Math.PI + (MODEL.reserveDay / MODEL.days) * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  out.push(L(k.lineOnTop([D.x + sx * (D.r - 6.2), D.y + sy * (D.r - 6.2)], [D.x + sx * (D.r - 2), D.y + sy * (D.r - 2)], D.top, P), { tone: "hi" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="hi" data-free="" d="${needle(k, P, D, 0, MODEL.days)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(D.x, D.y, 1.5, D.top, P, 16), { tone: "mid" }));
  return out.join("");
}
const DIAL_ITEM = { key: k.depthOf([D.x, D.y, 0], P), svg: `<g data-part="dial">${dial()}</g>` };

const COMMIT = 1;
const START = stateAt(0, COMMIT);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "db-svg",
  label: "A bench model of Soviet deep battle. A long lane runs from left to right through two lifting gates that mark the front and rear of a defended zone, with obstacle pins between them. A first-echelon gantry with a plough pushes through the zone, knocking the pins down and lifting both gates. A lit second-echelon carriage waits in a cradle behind the start line; once released it follows, passes under the gantry and runs on to a buffer at the far end. Beside the rear gate a reserve shuttle creeps along a lead screw; if it reaches the gate before the second echelon does, the gate drops and the breach is sealed. A day clock shows the time.",
  body: [plate(), ruler(), lane(), `<g data-part="live">${scene(k, P, { ...START, statics: [DIAL_ITEM] }, MODEL)}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at operational scale (kit/terrain.mjs) ----
// The viewBox is close to the card's own shape, shown with "slice" so the ground fills the whole card;
// the camera matches the machine's azimuth, so the axis of attack runs left to right as on the bench.
const RAD = Math.PI / 180;
const FW = 640, FH = 330;
const FA = 72, FE = 42;
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const FVIEW = { cx: -28, cy: -10, hw: 162 };
const PF = k.fitProjection(groundRect(FVIEW.cx, FVIEW.cy, FVIEW.hw, FVIEW.hw * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const POSE0 = fieldPose(START, GEO, TF);
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${dbUnitSvg(k, PF, u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "db-field",
  label: "The same idea on a battlefield, at the scale of one army's slice of a 1930s deep operation, with the axis of attack running left to right. On the left, behind a chalk start line, the lit blue mobile group of light tanks, lorries and cavalry waits in its assembly area. Ahead of the start line, three blue rifle divisions, each a cluster of riflemen with a support tank, advance on the red defender's first belt of trenches, wire and machine-gun posts, then on strongpoints in depth and a second belt at the rear of the tactical zone, where the axis road crosses a lateral road at a hamlet. Riflemen and defenders go down on both sides. Once both belts are broken, the outer divisions turn outward to hold the shoulders of the breach and the mobile group, once committed, drives in column through it toward a town 70 km deep, marked by a flag. Down the lateral road from the top, a red reserve of tanks and lorries races to close the crossroads. If it gets there first, the mobile group is stopped short of it and both sides lose vehicles; if it is late, it closes the crossroads behind the mobile group, which reaches the town. An ambulance shuttles casualties back. Sizes, distances, timings and casualties are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg db-field"', 'class="iso-svg db-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "As the Red Army's 1936 Field Regulations put it (quoted by David Glantz), deep operations meant penetrating the tactical zone and then the “violent development of tactical success into operational success.” Here the gantry is the attack echelon, the lit carriage the echelon to develop success, and the shuttle the defender's reserve. All timings are notional.";
const FIELD_CAPTION = "Glantz: the army attack echelon was “rifle corps reinforced by tanks and artillery”; the mobile group “attacked after penetration of the enemy's second defense belt” or completed the penetration itself. Unit sizes, distances, timings and casualties here are notional.";
const LABELS = {
  machine: "Deep battle bench. Left and right arrow keys change the day the second echelon is committed; Enter or Space replays; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys change the day the mobile group is committed; Enter or Space replays; V switches to the Machine view.",
};

const card = k.plateHtml({
  fig: "Fig 25",
  title: "Deep battle",
  hint: "Hover to scrub · click: replay",
  readout: readoutOf(START),
  keys: [
    { mark: "raised", label: "First echelon: the gantry that breaks the tactical zone" },
    { mark: "lit", label: "Second echelon: fed through the breach to depth" },
    { mark: "edge", label: "Reserve shuttle: seals the rear gate if it gets there first" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage db-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${COMMIT}">${svg}${fieldSvg}<div class="db-labels" aria-hidden="true"></div></div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "blue", label: "First echelon: three rifle divisions with support tanks" },
    { mark: "lit", label: "Second echelon: the mobile group (tanks, lorries, cavalry)" },
    { mark: "red", label: "Defender: two belts, strongpoints and the reserve; greyed = down" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="db-legend db-legend-machine">${m}</div><div class="db-legend db-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, COMMIT, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\nGEO\.DIAL\.top[^\n]*\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, COMMIT, LABELS } = DATA;
const GEO = DATA.GEO;
const M = DATA.MODEL;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, slabOf, cylinder, knurl, sideSeam, lineOnTop, onTop, coil, ring, radialTicks, sideArc, corners, planOutline, insetPlan };
const root = document.querySelector(".db-figure");
const stage = root.querySelector(".db-stage");
const svg = stage.querySelector(".db-svg");
const layer = svg.querySelector('[data-part="live"]');
// Machine view: keep the nodes of every painter item whose markup did not change since the last
// frame, parse only the items that did, and restore painter's order with the fewest moves.
let livePool = new Map();
const liveTpl = document.createElementNS("http://www.w3.org/2000/svg", "g");
function patchLive(el, items) {
  const pool = new Map(), order = [];
  for (const { svg } of items) {
    const old = livePool.get(svg);
    let nodes = old && old.pop();
    if (!nodes) { liveTpl.innerHTML = svg; nodes = [...liveTpl.childNodes]; }
    const list = pool.get(svg);
    if (list) list.push(nodes); else pool.set(svg, [nodes]);
    for (const n of nodes) order.push(n);
  }
  livePool = pool;
  let ref = el.firstChild;
  for (const n of order) { if (n === ref) ref = ref.nextSibling; else el.insertBefore(n, ref); }
  while (ref) { const next = ref.nextSibling; ref.remove(); ref = next; }
}
const dialEl = svg.querySelector('[data-part="dial"]');
const readout = root.querySelector("[data-readout]");
const replayBtn = root.querySelector("#db-replay");
const slider = root.querySelector("#db-commit");
const commitOut = root.querySelector("#db-commit-out");
const commitText = root.querySelector("#db-commit-text");
const fieldSvgEl = stage.querySelector(".db-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const labelsEl = stage.querySelector(".db-labels");
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
const COMMIT_TEXT = { machine: "Commit the second echelon on", field: "Commit the mobile group on" };
const TF = fieldTerrain();
const LOOKS = new Map();
const PLACES = fieldPlaces();
let stageF = null, fire = null, marksSig = "", ft = 0;
const labelNodes = new Map();
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const DIAL_ITEM = { key: depthOf([GEO.DIAL.x, GEO.DIAL.y, 0], P), svg: dialEl.outerHTML };
dialEl.remove();
const SEC_PER_DAY = 1.35;
const endOf = (c) => { const T = timesOf(c, M); return T.sealed ? M.reserveDay + 0.9 : T.deepDay + 0.3; };
const V = { t: 0, commit: COMMIT, mode: "play", hold: 0 };
let touring = !still.matches, leg = 0, last = 0, frame = 0, visible = false, idle = 0, drawn = "";
const TOUR = [1, 2.5];
// Labels for the clusters and places, as HTML over the field so they stay legible on a phone.
// The field SVG to stage-pixel mapping is read once (layout reads every frame would force a reflow)
// and again after a resize or a view switch.
let labelMap = null;
function placeLabels(list) {
  if (!labelMap) {
    const m = fieldSvgEl.getScreenCTM();
    if (!m) return;
    const r = stage.getBoundingClientRect();
    labelMap = { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e - r.left, f: m.f - r.top, width: r.width };
  }
  const L = labelMap, box = { width: L.width };
  const seen = new Set();
  for (const l of list) {
    seen.add(l.id);
    let n = labelNodes.get(l.id);
    if (!n) { n = document.createElement("span"); n.className = "db-label" + (l.place ? " db-label-place" : ""); n.dataset.anchor = l.anchor || "c"; if (l.side) n.dataset.side = l.side; labelsEl.appendChild(n); labelNodes.set(l.id, n); }
    if (n.textContent !== l.text) n.textContent = l.text;
    if (n.dataset.anchor !== (l.anchor || "c")) n.dataset.anchor = l.anchor || "c";
    n.classList.toggle("db-label-lit", !!l.lit);
    const [sx, sy] = iso([l.x, l.y, l.z], PF);
    const q = { x: L.a * sx + L.c * sy + L.e, y: L.b * sx + L.d * sy + L.f };
    // keep the whole label inside the card
    if (n._text !== l.text || n._anchor !== n.dataset.anchor) { n._w = n.offsetWidth; n._text = l.text; n._anchor = n.dataset.anchor; }
    const an = n.dataset.anchor, w = n._w || 0, x0 = q.x;
    const left = an === "r" ? x0 : an === "l" ? x0 - w : x0 - w / 2;
    const x = x0 + Math.min(0, box.width - 8 - (left + w)) + Math.max(0, 8 - left);
    const tr = "translate(" + x.toFixed(1) + "px," + q.y.toFixed(1) + "px)";
    if (n._tr !== tr) { n.style.transform = tr; n._tr = tr; }
  }
  for (const [id, n] of labelNodes) if (!seen.has(id)) { n.remove(); labelNodes.delete(id); }
}
// Battlefield frame: figures and vehicles move by translate and re-render only when their look
// changes; the fire layer writes attributes only; the fire sectors redraw only when they change.
function drawField(s) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF, { smoke: 64 }); }
  const pose = fieldPose(s, GEO, TF, { t: ft });
  stageF.put(pose.units.map((u) => {
    const look = dbLook(u);
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, dbUnitSvg(K, PF, u)); return LOOKS.get(look); } };
  }));
  const sig = pose.belt1.toFixed(2) + "|" + pose.belt2.toFixed(2) + "|" + pose.resFan.toFixed(2);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, pose); marksSig = sig; }
  const tt = still.matches ? 4.37 : ft, shots = trShots(pose.streams, tt);
  shots.smoke = fieldSmoke(pose, tt).concat(shots.smoke);
  fire.draw(shots);
  placeLabels([...pose.labels, ...PLACES.map((p) => ({ ...p, place: true }))]);
}
function draw() {
  const s = stateAt(V.t, V.commit, M);
  if (view === "field") drawField(s);
  else {
    const key = V.t.toFixed(4) + "/" + V.commit;
    if (key !== drawn) {
      drawn = key;
      patchLive(layer, scene(K, P, { ...s, statics: [DIAL_ITEM], items: true }, M));
      const n = layer.querySelector('[data-part="needle"]');
      if (n) n.setAttribute("d", needle(K, P, GEO.DIAL, V.t, M.days));
    }
  }
  const text = view === "field" ? fieldReadoutOf(s, M) : readoutOf(s, M);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(V.commit));
  stage.setAttribute("aria-valuetext", (view === "field" ? "Mobile group" : "Second echelon") + " committed on day " + V.commit.toFixed(1) + ". " + text);
  if (document.activeElement !== slider) slider.value = String(V.commit);
  commitOut.textContent = "day " + V.commit.toFixed(1);
}
function setCommit(c) {
  V.commit = Math.round(Math.min(4, Math.max(0, c)) * 10) / 10;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const end = endOf(V.commit);
  if (still.matches) { V.t = end; V.mode = "rest"; }
  else if (V.mode === "play") {
    V.t = Math.min(end, V.t + dt / SEC_PER_DAY);
    if (V.t >= end) { V.mode = "rest"; V.hold = 0; }
  } else if (V.mode === "rewind") {
    V.t = Math.max(0, V.t - dt * 4);
    if (V.t <= 0) V.mode = "play";
  } else if (V.mode === "rest" && touring) {
    V.hold += dt;
    if (V.hold > 1.4) { leg = (leg + 1) % TOUR.length; setCommit(TOUR[leg]); V.mode = "rewind"; }
  }
  ft += dt;
  draw();
  const busy = V.mode === "play" || V.mode === "rewind" || (V.mode === "rest" && touring);
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (busy || (view === "field" && !still.matches)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; run(); }, 9000);
};
const replay = () => { hold(); V.mode = "rewind"; run(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  commitText.textContent = COMMIT_TEXT[view];
  labelMap = null;
  if (view !== "field") { labelNodes.forEach((n) => n.remove()); labelNodes.clear(); }
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  drawn = "";
  draw();
  run();
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const box = stage.getBoundingClientRect();
  const f = Math.min(1, Math.max(0, (event.clientX - box.left - box.width * 0.1) / (box.width * 0.8)));
  hold();
  V.mode = "scrub";
  V.t = f * endOf(V.commit);
  draw();
  run();
});
stage.addEventListener("pointerleave", () => { if (V.mode === "scrub") { V.mode = "play"; run(); } });
stage.addEventListener("click", replay);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") { setCommit(V.commit + 0.1); replay(); }
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") { setCommit(V.commit - 0.1); replay(); }
  else if (event.key === " " || event.key === "Enter") replay();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
replayBtn.addEventListener("click", replay);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => { setCommit(Number(slider.value)); replay(); });
addEventListener("resize", () => { labelMap = null; if (view === "field") draw(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setView(view, false);
window.__deepBattle = { V, setCommit, replay, setView, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const c of [1, 2, 2.5]) {
  const T = timesOf(c);
  console.log(`commit day ${c}: breach ${T.breach.toFixed(2)} gate ${T.gate.toFixed(2)} ${T.sealed ? "sealed" : "deep by " + T.deepDay.toFixed(2)} (latest ${T.latest.toFixed(2)})`);
}
console.log("field: units", POSE0.units.length, "men", POSE0.units.filter((u) => u.kind === "man").length, "static items", FIELD.items.length);
console.log("wrote index.html", PAGE.length, "bytes");
