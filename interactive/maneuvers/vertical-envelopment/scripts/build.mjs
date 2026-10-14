// Builds interactive/maneuvers/vertical-envelopment/index.html: an isometric gantry-crane bench made with
// the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/vertical-envelopment/scripts/build.mjs
// Two views from one model: the Machine (the bench) and the Battlefield (field-scene.mjs on kit/terrain.mjs).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, state, readout, sliderAt, minSpeed } from "./model.mjs";
import { GEO, scene, needle, cartWant } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, veHeli, veHeliShadow, veTruck, veCrates, veSmokePlume } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const stripKit = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import [\s\S]*?;\n/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -152, y: -88, w: 304, d: 176, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIAL = { x: 120, y: 36, r: 13, z: 20, h: 7 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: -84, y: 34, w: 30, d: 18, r: 1.5 };
const RULER = { x: -136, y: 73, w: 272, d: 7, r: 1 };
const PZ = { x: GEO.PZ_X - 16, y: GEO.BY - 12, w: 32, d: 24, r: 2 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.PZ_X - 4, -GEO.GR_Y - 4, 63], [GEO.LZ_X - 4, GEO.GR_Y + 4, 63], [GEO.LZ_X - 4, -GEO.GR_Y - 4, 63]],
  WIDTH, HEIGHT, { pad: 6, azimuth: 58 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const box = (x0, x1, y0, y1, z0, h, steps = 2, bevel = 0) =>
  k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: Math.min(0.8, (x1 - x0) / 4, (y1 - y0) / 4) }, z0, h, P, steps, bevel);

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
  // ruler strip along the near gantry rail
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RULER.x + 4, RULER.x + RULER.w - 4, 4, 5, RULER.y + 0.6, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

// Pickup pad on the friendly side, the gantry's floor rails, the enemy rail line and the linkup rail.
function floor() {
  const out = [];
  // pickup zone pad: a low plate with a groove and four screws
  out.push(S(k.slabOf(PZ, 0, GEO.PAD_TOP, P, 3, 0.3), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PZ, 3), GEO.PAD_TOP, P), { tone: "faint" }));
  out.push(Dt(k.corners(PZ, 1.6).map(([x, y]) => at([x, y, GEO.PAD_TOP])), { size: 0.42 }));
  // gantry floor rails with end stops
  for (const side of [-1, 1]) {
    const y = side * GEO.GR_Y;
    out.push(S(box(-142, 142, y - 2, y + 2, 0, GEO.GR_TOP, 2, 0.3), { tone: "mid" }));
    out.push(Dt([-120, -60, 0, 60, 120].map((x) => at([x, y, GEO.GR_TOP])), { size: 0.4 }));
  }
  // enemy rail line: sleepers, two rails, buffer stops
  const ys = [];
  for (let y = -52; y <= 52; y += 8) ys.push(y);
  for (const y of ys.sort((a, b) => k.depthOf([GEO.ER_X, a, 0], P) - k.depthOf([GEO.ER_X, b, 0], P))) {
    out.push(S(box(GEO.ER_X - 7, GEO.ER_X + 7, y - 1.2, y + 1.2, 0, 1, 2, 0.2), { tone: "lo" }));
  }
  for (const rx of [GEO.ER_X - 4, GEO.ER_X + 4].sort((a, b) => k.depthOf([a, 0, 0], P) - k.depthOf([b, 0, 0], P))) {
    out.push(S(box(rx - 0.8, rx + 0.8, -56, 56, 1, GEO.RAIL_TOP - 1, 2, 0.2), { tone: "mid", crease: "none" }));
  }
  // linkup rail: two rails on sleepers from the friendly edge through the gate
  const xs = [];
  for (let x = -132; x <= 54; x += 8) if (Math.abs(x - GEO.WALL_X) > 5) xs.push(x);
  for (const x of xs) out.push(S(box(x - 1.2, x + 1.2, GEO.LY - 6, GEO.LY + 6, 0, 0.8, 2, 0.2), { tone: "lo" }));
  for (const ry of [GEO.LY - 4.5, GEO.LY + 4.5]) out.push(S(box(-134, 56, ry - 0.7, ry + 0.7, 0.8, 1, 2, 0.2), { tone: "mid", crease: "none" }));
  for (const x of [-138, 57]) {
    out.push(S(box(x, x + 3, GEO.LY - 7, GEO.LY + 7, 0, 5, 2, 0.3), { tone: "mid" }));
    out.push(Dt([at([x + 1.5, GEO.LY - 4.5, 5]), at([x + 1.5, GEO.LY + 4.5, 5])], { size: 0.42 }));
  }
  return out.join("");
}

// Sorted statics: gantry end stops, enemy buffer stops, the defense line's posts and panels, the gauge.
function statics() {
  const items = [];
  const put = (x, y, svg) => items.push({ key: k.depthOf([x, y, 0], P), svg });
  for (const side of [-1, 1]) for (const x of [-145, 142]) {
    const y = side * GEO.GR_Y;
    put(x + 1.5, y, S(box(x, x + 3, y - 4, y + 4, 0, 7, 2, 0.4), { tone: "mid" }) + Dt([at([x + 1.5, y, 7])], { size: 0.45 }));
  }
  for (const y0 of [-60, 57]) {
    put(GEO.ER_X, y0 + 1.5, S(box(GEO.ER_X - 7, GEO.ER_X + 7, y0, y0 + 3, 0, 6, 2, 0.4), { tone: "mid" }) +
      Dt([at([GEO.ER_X - 4, y0 + 1.5, 6]), at([GEO.ER_X + 4, y0 + 1.5, 6])], { size: 0.42 }));
  }
  const X = GEO.WALL_X;
  const posts = GEO.POSTS;
  for (let i = 0; i + 1 < posts.length; i++) {
    const a = posts[i] + 2.5, b = posts[i + 1] - 2.5;
    if (posts[i] === GEO.GATE[0]) continue;
    const plan = { x: X - 3, y: a, w: 6, d: b - a, r: 0.4 };
    put(X, (a + b) / 2, S(k.slabOf(plan, 0, 13, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(plan, 6.5, P, 2), { tone: "faint" }) }) +
      S(k.slabOf({ x: X - 3.6, y: a, w: 7.2, d: b - a, r: 0.4 }, 13, 1.4, P, 2, 0.3), { tone: "mid", crease: "none" }));
  }
  for (const y of posts) {
    put(X, y, S(box(X - 4, X + 4, y - 2.5, y + 2.5, 0, 17, 2, 0.4), { tone: "mid" }) +
      S(box(X - 4.8, X + 4.8, y - 3.2, y + 3.2, 17, 1.6, 2, 0.4), { tone: "mid" }) +
      Dt([at([X, y, 18.6])], { size: 0.45 }));
  }
  items.push({ key: k.depthOf([DIAL.x, DIAL.y, 0], P), svg: `<g data-part="gauge">${gauge()}</g>` });
  return items;
}

// The dial gauge that reads the landed force's supply.
function gauge() {
  const out = [];
  const ped = { x: DIAL.x - 13, y: DIAL.y - 13, w: 26, d: 26, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5.4, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3.2, 7.4, DIAL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(DIAL.x, DIAL.y, 3.2, 13, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 64, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 20, 5, DIAL.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([DIAL.x - 4.4, DIAL.y + 6.4], DIAL.top, P, "x"), "SUPPLY", { size: 1.9, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, DIAL, 1)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.4, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}

const STATICS = statics();
const V0 = MODEL.speed0;
const T0 = 30;
const S0 = state(T0, V0);
S0.cartY = cartWant(S0, 30);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "ve-svg",
  label: "A bench model of a vertical envelopment. Across the middle of a base plate runs a defense line, a wall of panels between posts, with a gate where a rail passes through it. A gantry crane runs on two floor rails that pass beyond the ends of the wall. It lifts a lit block from a pad on the friendly side, carries it over the wall and sets it down on the enemy's rail line behind it, which stops the enemy's supply cart. A linkup carriage creeps along the ground rail toward the gate and the landed block, and a dial gauge shows the block's supply running down. If the carriage arrives first, the supply refills; if the supply runs out first, the crane lifts the block back out.",
  body: [plate(), floor(), `<g data-part="live">${scene(k, P, { ...S0, statics: STATICS })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain (kit/terrain.mjs), a small-unit vignette ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the card at every
// width. The camera looks from the south-south-east, so the friendly side is on the left and the enemy's rear
// on the right, as on the bench.
const FW = 640, FH = 420;
const FA = 70, FE = 42;
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
const PF = k.fitProjection(groundRect(0, 8, 152, 152 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const TT = fieldTerrain();
const FIELD = fieldStatic(k, PF, TT);
const POSE0 = fieldPose(S0, TT);
// one renderer for every live thing in the field: soldiers, helicopters and their shadows, vehicles, trucks, crates, smoke
const fieldLook = (u) => {
  const f = trFaceStep(u.face ?? 0);
  switch (u.kind) {
    case "heli": return veHeli(k, PF, f, u.blades, u.spin);
    case "shadow": return veHeliShadow(k, PF, f);
    case "veh": return trVehicle(k, PF, f);
    case "truck": case "amb": return veTruck(k, PF, f);
    case "crates": return veCrates(k, PF, u.n);
    case "smoke": return veSmokePlume(k, PF, u.step);
    default: return trSoldier(k, PF, { ...u, face: f });
  }
};
const fieldKey = (u) => k.depthOf([u.x, u.y, 0], PF) + (u.kind === "heli" ? (u.z - TT.height(u.x, u.y)) * 2 : u.kind === "shadow" ? -0.5 : u.kind === "smoke" ? 3 : 0);
const liveItems = [...POSE0.units, ...POSE0.men].map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: fieldKey(u), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${fieldLook(u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "ve-field",
  label: "The same idea on a battlefield. On the left, behind the friendly lines, three utility helicopters wait in a pickup zone outlined in chalk. A red enemy defense line of fighting positions and a machine-gun position, with wire in front, runs across the middle. Behind it, on the right, the enemy's supply road crosses a stream on a bridge. The helicopters lift a lit blue rifle platoon over the defense line, drawing fire as they cross, and land it beside the bridge; the platoon knocks out the bridge guard and holds the bridge and the road junction, its sectors marked on the ground, and the enemy's supply trucks halt short of it. A pile of supply crates by the platoon leader shrinks as the supply runs down. From the left a blue mechanized company column drives up the road, fights through the defense line, losing one vehicle, and links up at the junction; or, if it is too late, the helicopters fly back in and lift the platoon out. Casualties on both sides lie greyed where they fell. Sizes, distances, timings and casualty counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TT, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...liveItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg ve-field"', 'class="iso-svg ve-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (FM 3-90, 2023) defines a vertical envelopment as “a variation of envelopment where air-dropped or airlanded troops attack an enemy forces’ rear, flank, or both.” FM 3-99 (2015) adds that “the amount of time before linkup or withdrawal drives sustainment planning.” The hours, distance and supply curve here are notional, not data.";
const LABEL_TEXT = "Vertical envelopment bench. Left and right arrow keys move the clock; up and down change the linkup force's speed; space pauses the tour; V switches to the Battlefield view.";
const LABELS = { machine: LABEL_TEXT, field: "Vertical envelopment battlefield. Left and right arrow keys move the clock; up and down change the linkup force's speed; space pauses the tour; V switches to the Machine view." };
const card = k.plateHtml({
  fig: "Fig 33",
  title: "Vertical envelopment",
  hint: "Hover to scrub · click to pause",
  readout: readout(S0),
  keys: [
    { mark: "lit", label: "Air-landed force: the block the crane carries over the line" },
    { mark: "raised", label: "Linkup force: the carriage on the ground rail" },
    { mark: "edge", label: "Gauge: the landed force's supply" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage ve-stage" tabindex="0" role="slider" aria-label="${LABEL_TEXT}" aria-valuemin="0" aria-valuemax="${MODEL.horizon}" aria-valuenow="${T0}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("The hours, distance and supply curve here are notional, not data.", "The hours, distance, supply curve, unit sizes and casualties here are notional, not data.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Air-landed rifle platoon (main effort), lit" },
    { mark: "blue", label: "Friendly: helicopters, linkup company column" },
    { mark: "red", label: "Enemy: defense line, bridge guard, supply trucks" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="ve-legend ve-legend-machine">${m}</div><div class="ve-legend ve-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, DIAL, T0, V0, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = \{[\s\S]*?\n\};\n/m, "")}
${stripKit("../../kit/field.mjs")}
${stripKit("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, wireSvg, fadeLineSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, ring, corners, insetPlan, planOutline, haloOf };
const root = document.querySelector(".ve-figure");
const stage = root.querySelector(".ve-stage");
const svg = stage.querySelector(".ve-svg");
const layer = svg.querySelector('[data-part="live"]');
const readoutEl = root.querySelector("[data-readout]");
const playBtn = root.querySelector("#ve-play");
const timeIn = root.querySelector("#ve-time");
const speedIn = root.querySelector("#ve-speed");
const speedOut = root.querySelector("#ve-speed-val");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const STATICS = ${JSON.stringify(STATICS)};
const fieldSvgEl = stage.querySelector(".ve-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const TT = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, dt: 0, trucks: null };
let stageF = null, fire = null, marksSig = "";
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const M = DATA.MODEL;
const S = { t: DATA.T0, target: DATA.T0, v: DATA.V0, f: 1, cartY: 30 };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
// [tour seconds, hours, km/h]: an in-time linkup, then a late one that ends in withdrawal
// (slower round the landing and the extraction, so the Battlefield view's boarding and flights can be seen)
const TOUR = [[0, 0, 1.2], [0.4, 0, 1.2], [2.9, 2, 1.2], [4.1, 2.8, 1.2], [6.0, 56, 1.2], [7.2, 56, 1.2], [7.7, 0, 0.7], [9.4, 2, 0.7], [11.0, 72.2, 0.7], [12.8, 74, 0.7], [13.8, 76.4, 0.7], [14.6, 84, 0.7], [15.2, 84, 0.7]];
const TOUR_LEN = 15.2;
function tourAt(c) {
  c %= TOUR_LEN;
  for (let i = 0; i + 1 < TOUR.length; i++) {
    const a = TOUR[i], b = TOUR[i + 1];
    if (c < b[0]) return [a[1] + (b[1] - a[1]) * ((c - a[0]) / (b[0] - a[0])), a[2]];
  }
  return [TOUR[TOUR.length - 1][1], TOUR[TOUR.length - 1][2]];
}
function setPlaying(on) {
  playBtn.setAttribute("aria-pressed", String(on));
  playBtn.textContent = on ? "Pause tour" : "Play tour";
}
// Battlefield frame: every live thing moves by translate and re-renders only when its look changes (a 15 degree
// facing step, a stride, a pose, a rotor blade step); the fire layer writes attributes only; the sectors redraw
// only when they change. The enemy trucks are eased so they never jump when the road is cut or reopened.
function lookOf(u) {
  const f = trFaceStep(u.face ?? 0);
  switch (u.kind) {
    case "heli": return "h|" + f + "|" + (u.spin ? u.blades : "s");
    case "shadow": return "hs|" + f;
    case "veh": return "v|" + f;
    case "truck": case "amb": return "t|" + f;
    case "crates": return "c|" + u.n;
    case "smoke": return "sm|" + u.step;
    default: return trLook(u);
  }
}
function render(u, f) {
  switch (u.kind) {
    case "heli": return veHeli(K, PF, f, u.blades, u.spin);
    case "shadow": return veHeliShadow(K, PF, f);
    case "veh": return trVehicle(K, PF, f);
    case "truck": case "amb": return veTruck(K, PF, f);
    case "crates": return veCrates(K, PF, u.n);
    case "smoke": return veSmokePlume(K, PF, u.step);
    default: return trSoldier(K, PF, { ...u, face: f });
  }
}
function drawField(st) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(st, TT, { t: FM.t, trucks: FM.trucks || undefined });
  if (!FM.trucks || still.matches) FM.trucks = pose.truckWant.map((w) => ({ ...w }));
  else FM.trucks.forEach((tk, i) => {
    const w = pose.truckWant[i], d = w.y - tk.y, step = 40 * FM.dt;
    if (Math.abs(d) > 200) tk.y = w.y; else tk.y += clamp(d, -step, step);
    if (Math.abs(d) > 0.5) tk.face = d > 0 ? 90 : -90; else tk.face = w.face;
  });
  stageF.put([...pose.units, ...pose.men].map((u) => {
    const f = trFaceStep(u.face ?? 0);
    const lk = lookOf(u) + "|" + u.side + (u.lit ? "|lit" : "");
    const key = depthOf([u.x, u.y, 0], PF) + (u.kind === "heli" ? (u.z - TT.height(u.x, u.y)) * 2 : u.kind === "shadow" ? -0.5 : u.kind === "smoke" ? 3 : 0);
    return { id: u.id, key, at: iso([u.x, u.y, u.z], PF), look: lk, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(lk)) LOOKS.set(lk, render(u, f)); return LOOKS.get(lk); } };
  }));
  if (pose.sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TT, pose); marksSig = pose.sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  const st = state(S.t, S.v, M);
  const text = readout(st);
  if (view === "field") drawField(st);
  else {
    layer.innerHTML = scene(K, P, { ...st, cartY: S.cartY, statics: STATICS });
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, S.f));
  }
  if (readoutEl.textContent !== text) readoutEl.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(S.t)));
  stage.setAttribute("aria-valuetext", text);
  if (document.activeElement !== timeIn) timeIn.value = String(Math.round(sliderAt(S.target, M) * 1000));
  if (document.activeElement !== speedIn) speedIn.value = String(S.v);
  speedOut.textContent = S.v.toFixed(2) + " km/h";
  return st;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  FM.t += dt; FM.dt = dt;
  if (touring) {
    clock += dt;
    const [t, v] = tourAt(clock);
    S.target = t; S.v = v;
  }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  S.t = Math.abs(S.target - S.t) < 0.002 ? S.target : ease(S.t, S.target, touring ? 0.12 : 0.3);
  const st = state(S.t, S.v, M);
  const want = cartWant(st, S.cartY);
  S.cartY = ease(S.cartY, want, 0.35);
  S.f = ease(S.f, st.supply, 0.2);
  draw();
  const settled = !touring && S.t === S.target && Math.abs(S.cartY - want) < 0.01 && Math.abs(S.f - st.supply) < 0.001;
  // the battlefield keeps moving (rotors, fire, trucks) while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  setPlaying(false);
  clearTimeout(idle);
  idle = setTimeout(() => { if (!still.matches) { touring = true; clock = 0; setPlaying(true); } run(); }, 9000);
  run();
};
const scrubTo = (hours) => { S.target = clamp(hours, 0, M.horizon); hold(); };
const setSpeed = (v) => { S.v = clamp(Math.round(v * 20) / 20, M.speed[0], M.speed[1]); hold(); };
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const r = stage.getBoundingClientRect();
  scrubTo(hoursAt(clamp((event.clientX - r.left - r.width * 0.08) / (r.width * 0.84), 0, 1), M));
});
stage.addEventListener("click", () => {
  if (touring) { touring = false; setPlaying(false); clearTimeout(idle); }
  else { touring = !still.matches; setPlaying(touring); clock = 0; run(); }
});
stage.addEventListener("keydown", (event) => {
  const u = sliderAt(S.target, M);
  if (event.key === "ArrowRight") scrubTo(hoursAt(u + 0.025, M));
  else if (event.key === "ArrowLeft") scrubTo(hoursAt(u - 0.025, M));
  else if (event.key === "ArrowUp") setSpeed(S.v + 0.05);
  else if (event.key === "ArrowDown") setSpeed(S.v - 0.05);
  else if (event.key === " " || event.key === "Enter") stage.click();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
playBtn.addEventListener("click", () => {
  if (touring) { touring = false; setPlaying(false); clearTimeout(idle); }
  else { touring = !still.matches; clock = 0; setPlaying(touring); run(); }
});
timeIn.addEventListener("input", () => scrubTo(hoursAt(Number(timeIn.value) / 1000, M)));
speedIn.addEventListener("input", () => setSpeed(Number(speedIn.value)));
// Reset: back to the state the page opened in (time, speed, battle clocks, sliders and tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  Object.assign(S, { t: DATA.T0, target: DATA.T0, v: DATA.V0, f: 1, cartY: 30 });
  Object.assign(FM, { t: 0, dt: 0, trucks: null });
  marksSig = "";
  touring = !still.matches; clock = 0;
  setPlaying(touring);
  timeIn.value = String(Math.round(sliderAt(S.target, M) * 1000));
  speedIn.value = String(S.v);
  draw(); run();
}
resetBtn.addEventListener("click", reset);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
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
setPlaying(touring);
setView(view, false);
window.__verticalEnvelopment = { S, FM, scrubTo, setSpeed, setView, reset, view: () => view, stop: () => { touring = false; setPlaying(false); clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

console.log("out at H+" + (MODEL.landed + MODEL.hold), "min speed", minSpeed().toFixed(3), "readout", readout(S0), "wrote index.html", PAGE.length, "bytes");
