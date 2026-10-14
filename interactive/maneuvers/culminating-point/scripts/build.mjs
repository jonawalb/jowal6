// Builds interactive/maneuvers/culminating-point/index.html: an isometric "reach bench" made
// with the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/culminating-point/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, distance, power, limitOf } from "./model.mjs";
import { GEO, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, cpTruck } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;
const T = MODEL.track;

const PLATE = { x: -156, y: -56, w: 306, d: 106, r: 9 };
const PLATE_H = 10;
const FOOT_H = 5;
const DIAL = { x: -34, y: -38, r: 15, z: 16, h: 7 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: 117, y: 31, w: 27, d: 14, r: 1.5 };
const RULER = { x: T.start - 6, y: 31, w: T.objective - T.start + 12, d: 7, r: 1 };
const RAIL_X = [-136, 116];
const SLEEPER_Z = 1.2;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-150, -30, 27], [130, 0, 24], [DIAL.x, DIAL.y, DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 52 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const faceLoop = (pts) => k.pathOf(pts.map(at), true);

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[17, 4.2], [12, 7.2], [15, 10.2]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// Distance scale in front of the track: a tick every 5 km from the start line, a major every 25.
function ruler() {
  const out = [];
  out.push(S(k.slabOf(RULER, 0, 0.7, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(T.start, T.objective - 2, 5, 5, RULER.y + 0.6, 0.7, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([T.start, RULER.y + 0.6], [T.start, RULER.y + 5.4], 0.7, P), { tone: "hi" }));
  out.push(Dt([at([RULER.x + 2.4, RULER.y + 3.5, 0.7]), at([RULER.x + RULER.w - 2.4, RULER.y + 3.5, 0.7])], { size: 0.42 }));
  return out.join("");
}

// The track: sleepers, two rails, screws.
function track() {
  const out = [];
  const xs = [];
  for (let x = -132; x <= 110; x += 14) xs.push(x);
  for (const x of xs) {
    out.push(S(k.slabOf({ x, y: -17, w: 5, d: 34, r: 0.8 }, 0, SLEEPER_Z, P, 2), { tone: "lo" }));
  }
  for (const y of [-12, 8]) {
    out.push(S(k.slabOf({ x: RAIL_X[0], y, w: RAIL_X[1] - RAIL_X[0], d: 4, r: 0.8 }, SLEEPER_Z, GEO.RAIL_Z - SLEEPER_Z, P, 2, 0.4), { tone: "mid" }));
    out.push(Dt(xs.map((x) => at([x + 2.5, y + 2, GEO.RAIL_Z])), { size: 0.36 }));
  }
  return out.join("");
}

// Static parts that stand on the track and sort with the moving ones.
function statics() {
  const list = [];
  const key = (x, y) => k.depthOf([x, y, 0], P);
  // end stop behind the sled
  {
    const stop = { x: -141, y: -16, w: 5, d: 32, r: 1.2 };
    list.push({ key: key(-138.5, 0), svg: S(k.slabOf(stop, 0, 10, P, 3, 0.5), { tone: "mid" }) +
      Dt([at([-138.5, -11, 10]), at([-138.5, 11, 10])], { size: 0.45 }) });
  }
  // the depot: a cabinet with a door, and two crates beside it
  {
    const cab = { x: -152, y: -30, w: 9, d: 26, r: 1.2 };
    let svg = `<path class="iso-halo" d="${k.haloOf(cab, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    svg += S(k.slabOf(cab, 0, 26, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(cab, 22, P, 3), { tone: "faint" }) });
    svg += L(faceLoop([[-143, -26, 3], [-143, -9, 3], [-143, -9, 19], [-143, -26, 19]]), { tone: "lo" });
    svg += S(k.slabOf({ x: -143, y: -12, w: 1.6, d: 1.6, r: 0.4 }, 9.5, 3, P, 2), { tone: "mid", crease: "none" });
    svg += Dt(k.corners(cab, 1.8).map(([x, y]) => at([x, y, 26])), { size: 0.42 });
    list.push({ key: key(-147.5, -17), svg });
    const crate = (c, z) => S(k.slabOf(c, z, 8, P, 2, 0.4), { tone: "lo", inner: L(k.sideSeam(c, z + 4, P, 2), { tone: "faint" }) }) +
      L(k.planOutline(k.insetPlan(c, 1.4), z + 8, P, 2), { tone: "faint" });
    const c1 = { x: -153, y: -1, w: 10, d: 11, r: 0.6 };
    const c2 = { x: -152, y: 0, w: 8, d: 9, r: 0.6 };
    list.push({ key: key(-148, 4.5), svg: crate(c1, 0) + crate(c2, 8) });
  }
  // the objective: a blockhouse at the end of the track
  {
    const base = { x: 116, y: -22, w: 27, d: 44, r: 2 };
    const block = { x: 118.5, y: -19.5, w: 22, d: 39, r: 1.2 };
    let svg = `<path class="iso-halo" d="${k.haloOf(base, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    svg += S(k.slabOf(base, 0, 3, P, 4, 0.5), { tone: "mid" });
    svg += S(k.slabOf({ x: 116, y: -7, w: 2.5, d: 14, r: 0.6 }, 3, 13, P, 2, 0.3), { tone: "mid" });
    svg += S(k.slabOf(block, 3, 17, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(block, 9, P, 3), { tone: "faint" }) });
    for (const c of [-9, 9]) svg += L(faceLoop([[140.5, c - 3, 12.5], [140.5, c + 3, 12.5], [140.5, c + 3, 15], [140.5, c - 3, 15]]), { tone: "lo" });
    for (const c of [123, 136]) svg += L(faceLoop([[c - 2.5, 19.5, 12.5], [c + 2.5, 19.5, 12.5], [c + 2.5, 19.5, 15], [c - 2.5, 19.5, 15]]), { tone: "lo" });
    const merlons = [];
    for (const y of [-19.5, -8, 3.5, 14]) merlons.push({ x: 135, y, w: 5.5, d: 5.5 });
    for (const x of [118.5, 126.75]) merlons.push({ x, y: 14, w: 5.5, d: 5.5 });
    merlons.sort((a, b) => key(a.x + 2.75, a.y + 2.75) - key(b.x + 2.75, b.y + 2.75));
    svg += L(k.planOutline(k.insetPlan(block, 2), 20, P, 3), { tone: "faint" });
    for (const m of merlons) svg += S(k.slabOf({ ...m, r: 0.5 }, 20, 3.5, P, 2, 0.3), { tone: "mid" });
    list.push({ key: key(129.5, 0), svg });
  }
  // the gauge: combat power as a ratio of what the advance needs
  {
    const ped = { x: DIAL.x - 12, y: DIAL.y - 11, w: 24, d: 22, r: 3 };
    let svg = `<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`;
    svg += S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" });
    svg += L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" });
    svg += Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 });
    svg += S(k.cylinder(DIAL.x, DIAL.y, 5.2, 5, 2.4, P, 28), { tone: "mid" });
    svg += S(k.cylinder(DIAL.x, DIAL.y, 3.2, 7.4, DIAL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(DIAL.x, DIAL.y, 3.2, 13, P, 16), { tone: "faint" }) });
    // crown on the +x side
    svg += S(k.slabOf({ x: DIAL.x + DIAL.r - 0.4, y: DIAL.y - 1.6, w: 2.4, d: 3.2, r: 0.5 }, DIAL.z + 2, 3, P, 2), { tone: "mid", crease: "none" });
    svg += S(k.cylinder(DIAL.x + DIAL.r + 3.4, DIAL.y, 1.8, DIAL.z + 1.6, 3.8, P, 16), { tone: "mid" });
    svg += S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" });
    svg += L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 64, P, 0.3), { tone: "lo" });
    svg += L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" });
    svg += L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" });
    const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 20, 5, DIAL.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
    svg += L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
    // the defender's line at 1.0, straight up the dial, and the stall zone below it engraved as one outline
    svg += L(k.lineOnTop([DIAL.x, DIAL.y - (DIAL.r - 2)], [DIAL.x, DIAL.y - (DIAL.r - 6.4)], DIAL.top, P), { tone: "hi" });
    const zone = [];
    const R = (rr, a) => [DIAL.x + rr * Math.sin(a), DIAL.y - rr * Math.cos(a)];
    for (let a = -0.75 * Math.PI; a <= 0.0001; a += Math.PI / 24) zone.push(R(DIAL.r - 2.6, a));
    for (let a = 0; a >= -0.75 * Math.PI - 0.0001; a -= Math.PI / 24) zone.push(R(DIAL.r - 4, a));
    svg += L(k.onTop(zone, DIAL.top, P, true), { tone: "faint" });
    svg += k.faceTextSvg(k.topMatrix([DIAL.x - 3.4, DIAL.y + 6.4], DIAL.top, P, "x"), "POWER", { size: 2, tone: "lo", anchor: "middle" });
    svg += `<path data-part="needle" class="iso-line" data-tone="hi" data-free="" d="${needle(k, P, DIAL, MODEL.p0)}" style="stroke-width:1.1"/>`;
    svg += L(k.ring(DIAL.x, DIAL.y, 1.5, DIAL.top, P, 16), { tone: "mid" });
    list.push({ key: key(DIAL.x, DIAL.y), svg: `<g data-part="gauge">${svg}</g>` });
  }
  return list.map((item, i) => ({ key: item.key, svg: `<g data-static="${i}">${item.svg}</g>` }));
}

const STATICS = statics();
const START = { x: T.start, sled: T.sledRear };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "cp-svg",
  label: "A bench model of the culminating point. A lit carriage, the attacking force, drives along a straight track toward a blockhouse, the objective. A tension spring tethers it to a supply sled at the depot behind it, and stretches as the carriage advances. A dial gauge reads the carriage's combat power as a ratio of what the advance needs: it falls with distance from the base until it reaches the defender's line at 1.0, where the carriage stalls short of the objective. Moving the supply sled forward shortens the tether, and the carriage can then reach the objective.",
  body: [plate(), track(), ruler(), `<g data-part="live">${scene(k, P, { ...START, statics: STATICS })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at operational scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the card at
// every width. The camera turns like the machine's (azimuth 52), so the advance runs left to right.
const FW = 640, FH = 420;
const FA = 52, FE = 42;
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
const PF = k.fitProjection(groundRect(-28, -6, 192, 192 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const TT = fieldTerrain();
const FIELD = fieldStatic(k, PF, TT);
const POSE0 = fieldPose({ ...START, target: T.objective }, TT);
const unitSvg = (u) => u.kind === "t" ? cpTruck(k, PF, trFaceStep(u.face)) : trVehicle(k, PF, trFaceStep(u.face));
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "cp-field",
  label: "The same idea on a battlefield, with each small vehicle standing for a platoon. On the left, beside a road, is the rear depot: sheds, crate stacks and four parked blue supply trucks, the base. A chalk start line crosses the road just past it. The lit blue attacking battalion, three companies of three vehicles, advances in march column along the road to the right, over a bridge and past a wood, toward a village and a hill marked with a flag, the objective, where red enemy vehicles are dug in with their fire sector on the ground. A red covering force falls back ahead of the column, trading fire with its lead. Four blue supply trucks shuttle between the base and the tail of the column; the farther the column goes, the longer each round trip. Short of the objective the column slows and halts, and its lead company deploys in a hasty defense: the culminating point. Move the base forward to the chalk outline by the road and the column can reach the objective, and the enemy falls back off the hill. Sizes, distances and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TT, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg cp-field"', 'class="iso-svg cp-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (ADP 3-0, 2019) calls operational reach “a tether” and says “the limit of a unit’s operational reach is its culminating point.” Here the tether is the spring to the supply sled. The power curve and the distances are a notional teaching shape, not data.";

const LABELS = {
  machine: "Culmination bench. Left and right arrow keys order the carriage back or forward; B moves the supply base forward or back; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys order the battalion back or forward along the road; B moves its base forward or back; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 9",
  title: "Culminating point",
  hint: "Hover to push · click: base",
  readout: "",
  keys: [
    { mark: "lit", label: "Attacking force: the carriage and its prow" },
    { mark: "raised", label: "Base: the supply sled and its tether spring" },
    { mark: "edge", label: "Gauge: combat power over what the advance needs" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage cp-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="${T.objective - T.start}" aria-valuenow="0">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("Here the tether is the spring to the supply sled. The power curve and the distances are a notional teaching shape, not data.", "Here the tether is the road back to the base, worked by the supply trucks. Unit sizes, the power curve, distances and timings are notional.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Attacking battalion (main effort), lit" },
    { mark: "blue", label: "Friendly: the base and its supply trucks" },
    { mark: "red", label: "Enemy: covering force, defenders on the hill" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="cp-legend cp-legend-machine">${m}</div><div class="cp-legend cp-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, MODEL, DIAL, START, LABELS, STATIC_KEYS: STATICS.map((s) => s.key) };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs").replace(/^const clamp = .*$/m, "")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, START, LABELS } = DATA;
const T = MODEL.track;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, slabOf, sideSeam, sideArc, planOutline, insetPlan, cylinder, knurl, lineOnTop, onTop, corners, coil };
const root = document.querySelector(".cp-figure");
const stage = root.querySelector(".cp-stage");
const svg = stage.querySelector(".cp-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const baseBtn = root.querySelector("#cp-base");
const slider = root.querySelector("#cp-push");
const fieldSvgEl = stage.querySelector(".cp-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const TT = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, lap: 0, halt: 0, move: 0, lostB: 0, lostR: 0 };
let stageF = null, fire = null, marksSig = "";
const hintEl = root.querySelector('[data-corner="hint"]');
const sliderText = root.querySelector("#cp-push-text");
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Hover to push · click: base", field: "Hover the road · click: base" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
// the static items rendered by the build, kept as markup and re-sorted with the moving parts each frame
const STATICS = [...layer.querySelectorAll("[data-static]")].map((el) => ({ key: DATA.STATIC_KEYS[Number(el.dataset.static)], svg: el.outerHTML }));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { x: START.x, sled: START.sled, target: T.objective, forward: false, p: MODEL.p0 };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
const TOUR = [[0, T.objective, false], [8, T.objective, true], [12.4, T.start, false]];
const LOOP = 15;
function tourAt(t) {
  t %= LOOP;
  let step = TOUR[0];
  for (const row of TOUR) if (t >= row[0]) step = row;
  return step;
}
function setBase(on) {
  S.forward = on;
  baseBtn.setAttribute("aria-pressed", String(on));
  baseBtn.textContent = on ? "Pull the base back" : "Move the base forward";
}
const sledGoal = () => Math.min(S.forward ? T.sledFwd : T.sledRear, sledLimit(S.x));
// Battlefield frame: vehicles move by translate and re-render only when their facing crosses a 15°
// step; the fire layer writes attributes only; the fire sectors redraw only when the state moves them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, TT, FM);
  stageF.put(pose.units.map((u) => {
    const f = trFaceStep(u.face), look = u.kind + "|" + f;
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, u.kind === "t" ? cpTruck(K, PF, f) : trVehicle(K, PF, f)); return LOOKS.get(look); } };
  }));
  const sig = pose.seize.toFixed(2) + "|" + pose.halt.toFixed(2) + "|" + (pose.halt > 0.01 ? pose.sl.toFixed(1) : "");
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TT, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  const d = distance(S.x, S.sled);
  const p = power(d);
  if (view === "field") drawField();
  else {
    layer.innerHTML = scene(K, P, { ...S, statics: STATICS });
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, S.p));
  }
  const text = stateOf(S.x, S.target, S.sled) + " · " + p.toFixed(2) + " : 1 · " + FM.lostB + " vs " + FM.lostR + " down";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(S.x - T.start)));
  stage.setAttribute("aria-valuetext", text);
  if (document.activeElement !== slider) slider.value = String(Math.round(S.target - T.start));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const [, target, fwd] = tourAt(clock);
    if (fwd !== S.forward) setBase(fwd);
    S.target = target;
  }
  if (calm) {
    S.sled = sledGoal();
    S.x = clamp(S.target, S.sled + T.span + T.slack, limitOf(S.sled));
    S.sled = sledGoal();
  } else {
    const goal = sledGoal();
    const step = (goal - S.sled) * (1 - Math.exp(-dt / 0.45));
    S.sled += clamp(step, -70 * dt, 70 * dt);
    if (Math.abs(goal - S.sled) < 0.02) S.sled = goal;
    S.x = advance(S.x, S.target, S.sled, dt);
  }
  const p = power(distance(S.x, S.sled));
  S.p = calm ? p : S.p + (p - S.p) * (1 - Math.exp(-dt / 0.2));
  // battlefield clocks: fire time, the supply trucks' shuttle (slower per lap the longer the haul),
  // the halted column's deployment and the base's move, eased
  FM.t += dt;
  // notional losses (model.mjs) never come back: keep the worst so far, and start over at the start line
  const L = losses(S.x, sledGoal());   // the ordered base, so a base on the move adds no extra losses
  if (S.x <= T.start + 0.5) { FM.lostB = L.blue; FM.lostR = L.red; }
  else { FM.lostB = Math.max(FM.lostB, L.blue); FM.lostR = Math.max(FM.lostR, L.red); }
  const lim = limitOf(S.sled);
  const haltWant = S.x >= lim - 0.5 && lim < T.objective - 0.05 && S.target > S.x + 0.5 ? 1 : 0;
  const moveWant = Math.abs(sledGoal() - S.sled) > 0.5 ? 1 : 0;
  if (calm) { FM.halt = haltWant; FM.move = moveWant; }
  else {
    const haul = Math.max(20, leadS(S.x) - baseS(S.sled));
    FM.lap = (FM.lap + dt * FG.TRUCK_V / (2.2 * haul)) % 1;
    FM.halt += (haltWant - FM.halt) * (1 - Math.exp(-dt / 0.5));
    FM.move += (moveWant - FM.move) * (1 - Math.exp(-dt / 0.25));
  }
  draw();
  const goalX = clamp(S.target, S.sled + T.span + T.slack, limitOf(S.sled));
  const settled = !touring && Math.abs(S.sled - sledGoal()) < 0.01 && Math.abs(S.x - goalX) < 0.01 && Math.abs(S.p - p) < 0.001;
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
const order = (x) => { S.target = clamp(x, T.start, T.objective); hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  sliderText.textContent = view === "field" ? "Ordered advance (battalion)" : "Ordered advance";
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
function floorAt(event) {
  const el = view === "field" ? fieldSvgEl : svg;
  const Q = view === "field" ? PF : P;
  const pt = el.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const q = pt.matrixTransform(el.getScreenCTM().inverse());
  const a = Q.azimuth * Math.PI / 180, e = (Q.elevation ?? 30) * Math.PI / 180;
  const kk = Q.scale * Math.sqrt(1.6);
  const u = (q.x - Q.origin[0]) / kk, v = (q.y - Q.origin[1]) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const [x, y] = floorAt(event);
  if (view === "machine") { order(x); return; }
  const n = fieldNearest(x, y);
  if (n.off < 60) order(n.x);
});
const toggle = () => { setBase(!S.forward); hold(); };
stage.addEventListener("click", toggle);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") order(S.target + 10);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") order(S.target - 10);
  else if (event.key === "b" || event.key === "B" || event.key === " " || event.key === "Enter") toggle();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
baseBtn.addEventListener("click", toggle);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => order(T.start + Number(slider.value)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
// Reset: back to the state the page opened in (column, base, losses, field clocks and idle tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  Object.assign(S, { x: START.x, sled: START.sled, target: T.objective, forward: false, p: MODEL.p0 });
  Object.assign(FM, { t: 0, lap: 0, halt: 0, move: 0, lostB: 0, lostR: 0 });
  setBase(false);
  slider.value = String(Math.round(T.objective - T.start));
  touring = !still.matches; clock = 0;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
setBase(S.forward);
setView(view, false);
window.__culminatingPoint = { S, FM, setBase, order, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const d of [0, 60, 98, 120]) console.log(`${d} km from base → ${power(d).toFixed(2)} : 1`);
console.log("rear limit", limitOf(T.sledRear), "fwd limit", limitOf(T.sledFwd), "objective from rear", distance(T.objective, T.sledRear), "wrote index.html", PAGE.length, "bytes");
