// Builds interactive/maneuvers/crossing-the-t/index.html: an isometric "crossing bench"
// made with the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/crossing-the-t/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, stateAt, hitsAt } from "./model.mjs";
import { GEO, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS } from "../../kit/terrain.mjs";
import { FG, SEA_CSS, fieldTerrain, fieldStatic, fieldPose, fieldMarks, shipSvg, shipSpec } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
assert.ok(Math.abs(GEO.PX - MODEL.D * GEO.S) < 1e-9, "GEO.PX must equal MODEL.D × GEO.S");
assert.ok(Math.abs(GEO.TURRET - MODEL.turretAt * GEO.S) < 1e-9, "GEO.TURRET must equal MODEL.turretAt × GEO.S");

const WIDTH = 640;
const HEIGHT = 330;
const RAD = Math.PI / 180;

const PLATE = { x: -142, y: -80, w: 314, d: 160, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIALS = [
  { x: 138, y: -48, r: 14, z: 22, h: 7, side: "line" },
  { x: 46, y: 52, r: 14, z: 22, h: 7, side: "column" },
];
for (const D of DIALS) D.top = D.z + D.h;
const LABEL = { x: -132, y: 50, w: 32, d: 18, r: 1.5 };
const BEAM = { x: -132, y: -4, w: 150, d: 8, r: 1.2 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-125, 0, 30], [GEO.PX, 68, 30], [GEO.PX + 68, 0, 30], [DIALS[0].x, DIALS[0].y, DIALS[0].top + 2]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 70, elevation: 38 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const polar = (cx, cy, r, deg) => [cx + r * Math.cos(deg * RAD), cy + r * Math.sin(deg * RAD)];
const band = (cx, cy, r0, r1, a0, a1, step = 3) => {
  const out = [];
  for (let a = a0; a <= a1 + 1e-9; a += step) out.push(polar(cx, cy, r1, a));
  for (let a = a1; a >= a0 - 1e-9; a -= step) out.push(polar(cx, cy, r0, a));
  return out;
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
  // the casters' tracks: two closed quarter-circle slots round the pivot
  for (const [a0, a1] of [[-4, 94], [176, 274]]) out.push(L(k.onTop(band(GEO.PX, 0, GEO.CASTER - 3.6, GEO.CASTER + 3.6, a0, a1), 0, P, true), { tone: "faint" }));
  return out.join("");
}

// The column's beam: a raised rail with end stops and a spacing scale down its side.
function beam() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BEAM, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  // range strip from the column's bow stop toward the turntable, one major tick per ship spacing
  const range = { x: 24, y: -17, w: 30, d: 6, r: 1 };
  out.push(S(k.slabOf(range, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const rt = k.topTicks(26, 52, 4.5, 8, range.y + 0.4, 0.6, [1.8, 3.4], P);
  out.push(L(rt.minor, { tone: "lo" }), L(rt.major, { tone: "mid" }));
  // ruler strip on the plate beside the beam, one major tick per ship spacing
  const strip = { x: -126, y: 8, w: 140, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(-122, 10, 4.5, 8, strip.y + 0.4, 0.6, [1.8, 3.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(S(k.slabOf(BEAM, 0, GEO.BEAM, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(BEAM, 3, P, 3), { tone: "faint" }) }));
  out.push(L(k.lineOnTop([BEAM.x, 0], [BEAM.x + BEAM.w, 0], GEO.BEAM, P), { tone: "faint" }));
  out.push(Dt([-126, -90, -54, -18, 12].flatMap((x) => [at([x, -2.4, GEO.BEAM]), at([x, 2.4, GEO.BEAM])]), { size: 0.4 }));
  return out.join("");
}
// End stops of the beam: drawn as their own items so the stern and bow blocks sort with the ships.
const STOPS = [-136, 18].map((x) => ({
  key: k.depthOf([x + 2, 0, 0], P) - 50,
  svg: S(k.slabOf({ x, y: -7, w: 4, d: 14, r: 1 }, 0, GEO.BEAM + 3, P, 3, 0.4), { tone: "mid" }) +
    Dt([at([x + 2, -4.6, GEO.BEAM + 3]), at([x + 2, 4.6, GEO.BEAM + 3])], { size: 0.42 }),
}));

// Stator ring with degree ticks (0 to 90 marked), and the turntable that carries the bar.
function table() {
  const out = [];
  const X = GEO.PX;
  out.push(`<path class="iso-halo" d="${k.cylinder(X, 0, 30, 0, 0.1, P, 72).fill}" style="filter:blur(4px)"/>`);
  out.push(S(k.cylinder(X, 0, 29, 0, 3, P, 96, 0.6), { tone: "mid", inner: L(k.sideArc(X, 0, 29, 1.5, P, 48), { tone: "faint" }) }));
  const minor = [], major = [], zero = [];
  for (let a = 0; a <= 90; a += 5) {
    const big = a % 30 === 0;
    const d = k.lineOnTop(polar(X, 0, 28.6, a), polar(X, 0, 28.6 - (big ? 3 : 1.8), a), 3, P);
    (a === 90 ? zero : big ? major : minor).push(d);
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }), L(zero.join(""), { tone: "hi" }));
  out.push(S(k.cylinder(X, 0, 24, 3, GEO.TT - 3, P, 96, 0.8), { tone: "mid", inner: L(k.sideArc(X, 0, 24, 5, P, 48), { tone: "faint" }) }));
  out.push(L(k.ring(X, 0, 21.6, GEO.TT, P, 96), { tone: "faint" }));
  return out.join("");
}

// The hand crank that turns the table: a worm housing on the stator's free side and a flat handwheel.
function crank() {
  const out = [];
  const A = 135, c = Math.cos(A * RAD), s = Math.sin(A * RAD);
  const F = (u, v) => [GEO.PX + u * c - v * s, u * s + v * c];
  const box = (u0, u1, v0, v1, z0, h, bevel = 0) => k.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z0, h, P, { bevel });
  const [hx, hy] = F(38, 0);
  out.push(`<path class="iso-halo" d="${box(28, 46, -7, 7, 0, 0.1).fill}" style="filter:blur(3px)"/>`);
  out.push(S(box(29, 46, -6.5, 6.5, 0, 6, 0.5), { tone: "mid" }));
  out.push(L(k.onTop([F(30.6, -5), F(44.4, -5), F(44.4, 5), F(30.6, 5)], 6, P, true), { tone: "faint" }));
  out.push(Dt([F(31.4, -4.2), F(31.4, 4.2), F(43.6, -4.2), F(43.6, 4.2)].map(([x, y]) => at([x, y, 6])), { size: 0.42 }));
  out.push(S(k.cylinder(hx, hy, 2.4, 6, 2.2, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(hx, hy, 7.4, 8.2, 2.2, P, 40, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(hx, hy, 7.4, 8.2, 10.4, 40, P), { tone: "lo" }));
  out.push(L(k.ring(hx, hy, 5, 10.4, P, 32), { tone: "faint" }));
  const [px, py] = [hx + 5.4 * Math.cos(200 * RAD), hy + 5.4 * Math.sin(200 * RAD)];
  out.push(S(k.cylinder(px, py, 1.1, 10.4, 5.4, P, 14), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(px, py, 1.7, 15.8, 1.4, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(hx, hy, 1.6, 10.4, 1, P, 16), { tone: "mid" }));
  return out.join("");
}

// A dial gauge reading guns bearing for one side, on a pedestal.
function gauge(D) {
  const out = [];
  const ped = { x: D.x - 12, y: D.y - 12, w: 24, d: 24, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(D.x, D.y, 5, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(D.x, D.y, 3, 7.4, D.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(D.x, D.y, 3, 13, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(D.x, D.y, D.r, D.z, D.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(D.x, D.y, D.r, D.top - 3, D.top, 60, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(D.x, D.y, D.r, D.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(D.x, D.y, D.r - 2, D.top, P, 72), { tone: "lo" }));
  // 16 guns full scale: a tick every gun, a major every 4
  const t = k.radialTicks(D.x, D.y, D.r - 2, 16, 4, D.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(`<path data-part="needle-${D.side}" class="iso-line" data-tone="hi" data-free="" d="${needle(k, P, D, 0)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(D.x, D.y, 1.4, D.top, P, 16), { tone: "mid" }));
  return out.join("");
}
// The page eases each barrel toward the model's bearing; the static build shows them on target.
const aimsOf = (M) => ({ line: M.lineTurrets.map((t) => t.bearing), column: M.columnTurrets.map((t) => t.bearing) });
const GAUGES = DIALS.map((D) => ({ key: k.depthOf([D.x, D.y, 0], P), svg: `<g data-part="gauge-${D.side}">${gauge(D)}</g>` }));

const START = 90;
const M0 = stateAt(START);
const liveItems = [...scene(k, P, M0, aimsOf(M0), 0), ...STOPS, ...GAUGES].sort((a, b) => a.key - b.key).map((i) => i.svg).join("");
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "ct-svg",
  label: "A bench model of crossing the T. On the left, four gun carriages stand in a column on a straight beam, all heading toward a turntable on the right; the lead carriage is lit. On the turntable, a long bar carries four more carriages, the crossing line, and can swing from lying end-on in line ahead of the column to lying square across its head. Each carriage has two twin turrets whose barrels swing onto any enemy carriage they can reach without firing through a friend. Two dial gauges read how many guns each side can bring to bear. Swung square across the column's head, all sixteen of the crossing line's guns bear, while in the column only the lead carriage's forward turret can reply.",
  body: [plate(), beam(), table(), crank(), `<g data-part="live">${liveItems}</g>`],
});

// ---- Battlefield view: the same state as a sea scene (kit/terrain.mjs for water, islands, relief) ----
// The viewBox is the card's own shape, shown with "slice" so the sea fills the whole card at every width.
const FW = WIDTH, FH = 395;
const FX0 = -3 * FG.S - 34, FX1 = FG.S * (MODEL.D + 1.5) + 22, FY = 1.5 * FG.S + 20;
const PF = k.fitProjection([[FX0, -30, 0], [FX0, 30, 24], [FG.S * MODEL.D, -FY, 24], [FG.S * MODEL.D, FY, 0], [FX1, -30, 0], [FX1, 30, 0]], FW, FH, { pad: 22, azimuth: 62, elevation: 40 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose({ phi: START, aims: aimsOf(stateAt(START)) }, MODEL);
const shipItems = POSE0.ships.map((s) => {
  const [sx, sy] = k.iso([s.x, s.y, 0], PF);
  return { key: k.depthOf([s.x, s.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${s.side}"${s.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${shipSvg(k, PF, shipSpec(s))}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "ct-field",
  label: "The same idea at sea. Four red battleships steam in column from the left, their lead ship lit. Ahead of the column's head, four blue battleships, the crossing line, lie on the crossing angle. Each ship has two funnels trailing coal smoke, two masts and a twin-gun turret fore and aft. Turrets that can bear flash as they fire, and shell splashes rise round their targets. Square across the column's head, every blue turret fires on the lit lead ship, which burns and smokes from the hits it has taken, while only its forward turret can reply and one blue ship burns from a single hit. Swing the line end-on and the fire falls to one turret a side. Ships drawn larger than scale; ranges, timings and hits are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...shipItems])}</g><g data-part="fire" class="ct-sea-fire"></g>`],
}).replace('class="iso-svg ct-field"', 'class="iso-svg ct-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Andidora (Naval War College Review, 1991) writes that at Tsushima Togo’s battle line was “twice able to cross the Russian ‘T,’ delivering the full weight of its broadside to enemy ships which could only respond with guns facing forward.” The ships, turret arcs and gun counts on this bench are notional, computed from its geometry.";

const LABELS = {
  machine: "Crossing bench. Left and right arrow keys swing the crossing line between end-on and square across the column's head; Enter jumps between the two; V switches to the Battlefield view.",
  field: "Battlefield at sea. Left and right arrow keys swing the crossing line between end-on and square across the column's head; Enter jumps between the two; V switches to the Machine view.",
};
const ARIA = LABELS.machine;
const card = k.plateHtml({
  fig: "Fig 32",
  title: "Crossing the T",
  hint: "Hover to swing the line",
  readout: "",
  keys: [
    { mark: "lit", label: "Column's lead carriage: the only one whose guns can reply" },
    { mark: "raised", label: "Crossing line: four carriages on a bar that swings on the turntable" },
    { mark: "edge", label: "Gauges: guns bearing, the column (front) and the crossing line (back)" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage ct-stage" tabindex="0" role="slider" aria-label="${ARIA}" aria-valuemin="${MODEL.range[0]}" aria-valuemax="${MODEL.range[1]}" aria-valuenow="${START}">${svg}${fieldSvg}</div>`,
});

// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("The ships, turret arcs and gun counts on this bench are notional, computed from its geometry.", "The ships, turret arcs, gun counts and hits in this scene are notional, computed from the same model; ships are drawn larger than scale.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "The column's lead ship: where the line's fire falls (lit)" },
    { mark: "blue", label: "Crossing line: four battleships across the column's head" },
    { mark: "red", label: "Column: four battleships in line ahead" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="ct-legend ct-legend-machine">${m}</div><div class="ct-legend ct-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, DIALS, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = \{[\s\S]*?\n\};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIALS, START, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideArc, ring, ringSeam, lineOnTop };
const root = document.querySelector(".ct-figure");
const stage = root.querySelector(".ct-stage");
const svg = stage.querySelector(".ct-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const slider = root.querySelector("#ct-angle");
const jumpBtn = root.querySelector("#ct-jump");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const fieldSvgEl = stage.querySelector(".ct-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const LOOKS = new Map();
const VIEWER = towardViewer(PF);
const H0 = hitsAt(START, DATA.MODEL);
const FM = { t: 0, hits: { line: H0.line.slice(), column: H0.column.slice() } };
let stageF = null, fire = null, marksSig = "";
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
// Pull the static items (gauges, beam stops) out of the live layer once, keyed by depth.
const statics = [...layer.children].filter((g) => g.matches('[data-part^="gauge"]')).map((g) => {
  const D = DIALS.find((d) => g.dataset.part === "gauge-" + d.side);
  return { key: depthOf([D.x, D.y, 0], P), svg: g.outerHTML, D };
});
const STOPS = ${JSON.stringify(STOPS)};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const wrapDeg = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const M0 = stateAt(START, DATA.MODEL);
const S = { phi: START, target: START, aims: { line: M0.lineTurrets.map((t) => t.bearing), column: M0.columnTurrets.map((t) => t.bearing) },
  f: { line: M0.lineGuns / M0.maxGuns, column: M0.columnGuns / M0.maxGuns } };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
// Tour: square across, swing slowly to end-on, hold, swing back, hold (15 s).
const TOUR = [[0, 90], [1.5, 0], [8.5, 90], [15, 90]];
function tourAt(t) {
  t %= 15;
  let step = TOUR[0];
  for (const row of TOUR) if (t >= row[0]) step = row;
  return step[1];
}
// Battlefield frame: ships move by translate and re-render only when their look changes (heading,
// turret training, fires); splashes are live items sorted among them; smoke and flashes are pooled
// circles above; wakes redraw only when the crossing angle moves.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = seaFire(fireEl, K, PF); }
  const pose = fieldPose(S, DATA.MODEL, FM);
  const t = still.matches ? 4.37 : FM.t;
  const shots = fieldShots(pose, t, VIEWER);
  const list = pose.ships.map((s) => {
    const spec = shipSpec(s), look = shipLook(spec);
    return { id: s.id, key: depthOf([s.x, s.y, 0], PF), at: iso([s.x, s.y, 0], PF), look, side: s.side, lit: s.lit,
      svg: () => { if (!LOOKS.has(look)) { if (LOOKS.size > 400) LOOKS.clear(); LOOKS.set(look, shipSvg(K, PF, spec)); } return LOOKS.get(look); } };
  });
  for (const sp of shots.splashes) {
    const step = Math.round(sp.age * 24);
    list.push({ id: sp.id, key: depthOf([sp.ship.x, sp.ship.y, 0], PF) + (sp.near ? 0.01 : -0.01), at: iso([sp.x, sp.y, 0], PF), look: "s" + step, side: "f",
      svg: () => splashSvg(K, PF, step / 24, sp.size) });
  }
  stageF.put(list);
  const sig = S.phi.toFixed(1);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, pose); marksSig = sig; }
  fire.draw(shots);
}
function draw() {
  const M = stateAt(S.phi, DATA.MODEL);
  if (view === "field") { drawField(); return drawText(M); }
  const items = [...scene(K, P, M, S.aims, 0), ...STOPS, ...statics];
  items.sort((a, b) => a.key - b.key);
  layer.innerHTML = items.map((i) => i.svg).join("");
  for (const side of ["line", "column"]) {
    const D = DIALS.find((d) => d.side === side);
    const n = layer.querySelector('[data-part="needle-' + side + '"]');
    if (n) n.setAttribute("d", needle(K, P, D, S.f[side]));
  }
  return drawText(M);
}
function drawText(M) {
  const H = hitsAt(S.phi, DATA.MODEL);
  const text = Math.round(S.phi) + "° · line " + M.lineGuns + " guns · column " + M.columnGuns + " · " + H.lineTaken + " vs " + H.columnTaken + " hits";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(S.phi)));
  stage.setAttribute("aria-valuetext", text);
  if (document.activeElement !== slider) slider.value = String(Math.round(S.target));
  return M;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; S.target = tourAt(clock); }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  const step = clamp(ease(S.phi, S.target, 0.55) - S.phi, -20 * dt, 20 * dt);
  S.phi = calm ? S.target : S.phi + step;
  const M = stateAt(S.phi, DATA.MODEL);
  let moving = Math.abs(S.phi - S.target) > 0.01;
  for (const side of ["line", "column"]) {
    const want = side === "line" ? M.lineTurrets : M.columnTurrets;
    S.aims[side] = S.aims[side].map((a, i) => {
      const gap = wrapDeg(want[i].bearing - a);
      const next = calm ? want[i].bearing : a + clamp(gap * (1 - Math.exp(-dt / 0.3)), -120 * dt, 120 * dt);
      if (Math.abs(gap) > 0.05) moving = true;
      return next;
    });
    const f = (side === "line" ? M.lineGuns : M.columnGuns) / M.maxGuns;
    S.f[side] = ease(S.f[side], f, 0.25);
    if (Math.abs(S.f[side] - f) > 0.001) moving = true;
  }
  // notional fires fade in and out as the model's hit counts change
  const H = hitsAt(S.phi, DATA.MODEL);
  for (const side of ["line", "column"]) FM.hits[side] = FM.hits[side].map((x, i) => { const n = ease(x, H[side][i], 0.6); if (Math.abs(n - H[side][i]) > 0.01) moving = true; return n; });
  FM.t += dt;
  draw();
  // the battlefield keeps firing while it is on screen and motion is allowed; the machine stops once it settles
  frame = visible && (touring || moving || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const steer = (deg) => { S.target = clamp(deg, DATA.MODEL.range[0], DATA.MODEL.range[1]); hold(); };
const jump = () => steer(S.target > 45 ? 0 : 90);
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
function floorAt(event) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const field = view === "field";
  const P = field ? PF : DATA.P;
  const p = pt.matrixTransform((field ? fieldSvgEl : svg).getScreenCTM().inverse());
  const a = P.azimuth * Math.PI / 180, e = (P.elevation ?? 30) * Math.PI / 180;
  const kk = P.scale * Math.sqrt(1.6);
  const u = (p.x - P.origin[0]) / kk, v = (p.y - P.origin[1]) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const [x, y] = floorAt(event);
  // same rule in both views, in units of the machine's bench (the field's spacing is FG.S, the bench's GEO.S)
  const f = view === "field" ? GEO.S / FG.S : 1;
  const dx = (x - (view === "field" ? FG.S * DATA.MODEL.D : GEO.PX)) * f, dy = y * f;
  if (Math.hypot(dx, dy) < 20 || dx < -30) return;
  steer(Math.atan2(dy, dx) * 180 / Math.PI);
});
stage.addEventListener("click", jump);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") steer(S.target + 6);
  else if (event.key === "ArrowRight" || event.key === "ArrowDown") steer(S.target - 6);
  else if (event.key === " " || event.key === "Enter") jump();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
jumpBtn.addEventListener("click", jump);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => steer(Number(slider.value)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setView(view, false);
window.__crossingTheT = { S, steer, jump, setView, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS + SEA_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const phi of [0, 30, 45, 60, 90]) { const M = stateAt(phi), H = hitsAt(phi); console.log(`phi ${phi}° → line ${M.lineGuns} guns, column ${M.columnGuns}, hits ${H.lineTaken} vs ${H.columnTaken}`); }
console.log("wrote index.html", PAGE.length, "bytes");
