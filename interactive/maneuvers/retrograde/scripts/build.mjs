// Builds interactive/maneuvers/retrograde/index.html: an isometric "delay bench" made with the
// Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/retrograde/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, MODES, TECHS, duration, runAt, hoursPerKm, readoutOf } from "./model.mjs";
import { GEO, scene, hand, prismY, blockX, toothFace } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, rgTruck } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -100, y: -52, w: 286, d: 100, r: 9 };
const PLATE_H = 10;
const FOOT_H = 5;
const DIAL = { x: 146, y: 31, r: 13, z: 16, h: 7 };
const SEL = { x: 98, y: 34, r: 5.2, z: 6 };   // enemy combat-power selector knob
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: -94, y: 29, w: 25, d: 13, r: 1.5 };
const RULER = { x: blockX(MODEL.depth) - 4, y: 33, w: blockX(0) - blockX(MODEL.depth) + 8, d: 7, r: 1 };
const RAIL_X = [-86, 164];
const SLEEPER_Z = 1.2;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [blockX(0), 0, 26], [150, 0, 26], [DIAL.x, DIAL.y, DIAL.top + 2], [-80, -20, 12]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 40 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const slab = (x, y, w, d, z, h, r = 0.8, steps = 3, bevel = 0) => k.slabOf({ x, y, w, d, r }, z, h, P, steps, bevel);

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
  [[15, 4.2], [11, 7.2], [13, 10.2]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// Ground scale in front of the rack: a tick per km, a major at each delay position and at the rear.
function ruler() {
  const out = [];
  out.push(S(k.slabOf(RULER, 0, 0.7, P, 3), { tone: "lo", crease: "faint" }));
  const minor = [], major = [];
  for (let g = 0; g <= MODEL.depth; g++) {
    const big = g % 6 === 0;
    (big ? major : minor).push(k.lineOnTop([blockX(g), RULER.y], [blockX(g), RULER.y + (big ? 3.8 : 2.2)], 0.7, P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(L(k.lineOnTop([blockX(0), RULER.y], [blockX(0), RULER.y + RULER.d], 0.7, P), { tone: "hi" }));
  out.push(Dt([at([RULER.x + 2, RULER.y + 4.6, 0.7]), at([RULER.x + RULER.w - 2, RULER.y + 4.6, 0.7])], { size: 0.42 }));
  return out.join("");
}

// The track: sleepers, two rails, screws, and the end stops for both carriages.
function track() {
  const out = [];
  const xs = [];
  for (let x = -84; x <= 158; x += 14) xs.push(x);
  for (const x of xs) out.push(S(slab(x, -17, 5, 34, 0, SLEEPER_Z, 0.8, 2), { tone: "lo" }));
  for (const y of [-12, -2, 8]) {
    out.push(S(slab(RAIL_X[0], y, RAIL_X[1] - RAIL_X[0], 4, SLEEPER_Z, GEO.RAIL_Z - SLEEPER_Z, 0.8, 2, 0.4), { tone: "mid" }));
    out.push(Dt(xs.map((x) => at([x + 2.5, y + 2, GEO.RAIL_Z])), { size: 0.36 }));
  }
  // rear stop: the back of the assigned area
  out.push(S(slab(-92, -18, 5, 36, 0, 10, 1.2, 3, 0.5), { tone: "mid" }));
  out.push(Dt([at([-89.5, -13, 10]), at([-89.5, 13, 10])], { size: 0.45 }));
  return out.join("");
}
// The enemy's start stop at the far end: sorted with the moving parts (the carriage can stand in front of it).
function frontStop() {
  return S(slab(166, -18, 5, 36, 0, 10, 1.2, 3, 0.5), { tone: "mid" }) + Dt([at([168.5, -13, 10]), at([168.5, 13, 10])], { size: 0.45 });
}

// Dashpot cylinder on the far side: saddles, body with bands, gland block (lever pivot) and end cap.
function cylinder() {
  const out = [];
  const [c0, c1] = GEO.CYL;
  const y = GEO.ROD_Y, z = GEO.ROD_Z;
  for (const sx of [84, 150]) {
    out.push(S(slab(sx, y - 7, 9, 14, 0, z - 4, 0.8, 2, 0.4), { tone: "mid" }));
    out.push(Dt([at([sx + 4.5, y - 5, z - 4]), at([sx + 4.5, y + 5, z - 4])], { size: 0.42 }));
  }
  const body = { x: c0 + 12, y: y - 4, w: c1 - c0 - 18, d: 8, r: 2.6 };
  out.push(S(k.slabOf(body, z - 4, 8, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(body, z, P, 3), { tone: "faint" }) }));
  for (const bx of [108, 130]) out.push(S(slab(bx, y - 4.6, 2, 9.2, z - 4.6, 9.2, 2.8, 3, 0.2), { tone: "mid", crease: "none" }));
  const gland = { x: c0, y: y - 5.4, w: 12, d: 10.8, r: 1.4 };
  out.push(S(k.slabOf(gland, z - 5.4, 10.8, P, 3, 0.5), { tone: "mid" }));
  out.push(Dt([[c0 + 2, y - 3.6], [c0 + 2, y + 3.6], [c0 + 10, y - 3.6]].map(([x, yy]) => at([x, yy, z + 5.4])), { size: 0.42 }));
  const cap = { x: c1 - 6, y: y - 5, w: 6, d: 10, r: 1.4 };
  out.push(S(k.slabOf(cap, z - 5, 10, P, 3, 0.5), { tone: "mid" }));
  out.push(Dt(k.corners(cap, 1.4).map(([x, yy]) => at([x, yy, z + 5])), { size: 0.4 }));
  // needle valve on the end cap: sets how fast the dashpot lets the rod out
  out.push(S(k.cylinder(c1 - 3, y, 1.4, z + 5, 1.4, P, 14), { tone: "mid" }));
  out.push(S(k.cylinder(c1 - 3, y, 2.4, z + 6.4, 2.6, P, 18), { tone: "mid" }) + L(k.knurl(c1 - 3, y, 2.4, z + 6.4, z + 9, 14, P), { tone: "lo" }));
  return out.join("");
}

// Ratchet rack: a bar with one tooth at each delay position. The near rack holds the near block (A),
// the far rack, between the track and the dashpot, the far block (B).
function rack([y0, y1]) {
  const out = [];
  const bar = { x: blockX(MODEL.depth) - 8, y: y0, w: blockX(0) + 6 - (blockX(MODEL.depth) - 8), d: y1 - y0, r: 1 };
  out.push(S(k.slabOf(bar, 0, GEO.RACK_TOP, P, 3, 0.4), { tone: "mid" }));
  const screws = [];
  for (const g of [3, 9, 15, 21]) screws.push(at([blockX(g), (y0 + y1) / 2, GEO.RACK_TOP]));
  screws.push(at([bar.x + 2.4, (y0 + y1) / 2, GEO.RACK_TOP]), at([bar.x + bar.w - 2.4, (y0 + y1) / 2, GEO.RACK_TOP]));
  out.push(Dt(screws, { size: 0.42 }));
  for (const g of MODEL.positions) {
    const xv = toothFace(g);
    out.push(S(prismY(k, P, [[xv, GEO.RACK_TOP], [xv, GEO.TOOTH_TOP], [xv - 1.5, GEO.TOOTH_TOP], [xv - 8, GEO.RACK_TOP]], y0 + 0.5, y1 - 0.5), { tone: "mid" }));
  }
  return out.join("");
}

// The clock: hours since contact on a 24-hour face.
function clock() {
  const out = [];
  const ped = { x: DIAL.x - 12, y: DIAL.y - 11, w: 24, d: 22, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5.2, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3.2, 7.4, DIAL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(DIAL.x, DIAL.y, 3.2, 12, P, 16), { tone: "faint" }) }));
  // winding crown on the +x side
  out.push(S(slab(DIAL.x + DIAL.r - 0.4, DIAL.y - 1.6, 2.4, 3.2, DIAL.z + 2, 3, 0.5, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(DIAL.x + DIAL.r + 3.4, DIAL.y, 1.8, DIAL.z + 1.6, 3.8, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 64, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 24, 6, DIAL.top, [1.1, 2.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([DIAL.x, DIAL.y - (DIAL.r - 2)], [DIAL.x, DIAL.y - (DIAL.r - 5.4)], DIAL.top, P), { tone: "hi" }));
  out.push(k.faceTextSvg(k.topMatrix([DIAL.x - 3, DIAL.y + 6], DIAL.top, P, "x"), "HOURS", { size: 1.9, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="hand" class="iso-line" data-tone="hi" data-free="" d="${hand(k, P, DIAL, 0)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.4, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}

// The selector that sets the enemy's combat-power ratio (mirrors the slider): plinth, scale arc, knurled knob.
const SEL_FROM = -0.6 * Math.PI, SEL_SPAN = 1.2 * Math.PI;
function selector() {
  const out = [];
  const pl = { x: SEL.x - 10, y: SEL.y - 7, w: 20, d: 13, r: 2 };
  out.push(`<path class="iso-halo" d="${k.haloOf(pl, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(pl, 0, SEL.z, P, 4, 0.5), { tone: "mid", inner: L(k.sideSeam(pl, SEL.z / 2, P, 4), { tone: "faint" }) }));
  out.push(Dt([[pl.x + 2, pl.y + 2], [pl.x + pl.w - 2, pl.y + 2], [pl.x + 2, pl.y + pl.d - 2], [pl.x + pl.w - 2, pl.y + pl.d - 2]].map(([x, y]) => at([x, y, SEL.z])), { size: 0.4 }));
  const t = k.radialTicks(SEL.x, SEL.y, SEL.r + 3.4, 8, 2, SEL.z, [1, 1.8], P, SEL_FROM, SEL_SPAN);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.ring(SEL.x, SEL.y, SEL.r + 1.6, SEL.z, P, 40), { tone: "lo" }));
  out.push(S(k.cylinder(SEL.x, SEL.y, SEL.r, SEL.z, 3.2, P, 28, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(SEL.x, SEL.y, SEL.r, SEL.z, SEL.z + 3.2, 26, P), { tone: "lo" }));
  out.push(`<path data-part="pointer" class="iso-line" data-tone="hi" data-free="" d="${pointer(k, P, MODEL.ratio.start)}" style="stroke-width:1"/>`);
  return out.join("");
}
function pointer(K, P, r) {
  const f = (r - MODEL.ratio.min) / (MODEL.ratio.max - MODEL.ratio.min);
  const a = SEL_FROM + f * SEL_SPAN;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([SEL.x, SEL.y], [SEL.x + sx * (SEL.r - 0.8), SEL.y + sy * (SEL.r - 0.8)], SEL.z + 3.2, P);
}

const keep = (name, svg) => `<g data-keep="${name}">${svg}</g>`;
const FRONT_STOP = { key: k.depthOf([168.5, 0, 0], P), svg: keep("stop", frontStop()) };
const START = { dA: 0, dB: 0, a: 0, pressure: 0, liftA: 0, liftB: 0, couple: 1, bypass: 0, positions: MODEL.positions };
const liveArgs = { ...START, far: keep("far", rack(GEO.RACK2_Y)), cyl: keep("cyl", cylinder()), mid: [keep("mid", rack(GEO.RACK_Y))], front: [keep("front", selector() + clock())], statics: [FRONT_STOP] };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "rg-svg",
  label: "A bench model of a delay. The delaying force is two lit blocks side by side on a two-lane track. A carriage, the enemy, pushes them back along the track through a spring-loaded ram. Each block has a pawl that catches on ratchet teeth set along its own rack, one tooth at each delay position, so a block holds at each tooth while the ram spring compresses, then slips back. With subsequent positions a coupler bar locks the two blocks together and they fall back as one, slowed by a long dashpot tied to the far block. With alternating positions the coupler swings clear: one block holds while the other waits on the next tooth, then the first runs back past it to the tooth after. A clock reads the hours since contact. In a withdrawal the pawls stay up and the dashpot's bypass lever is open, so the blocks run to the rear and the carriage loses contact; in a retirement the carriage never touches them.",
  body: [plate(), track(), ruler(), `<g data-part="live">${scene(k, P, liveArgs)}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at company scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the card at
// every width. The camera turns so the enemy comes on from the right and the company gives ground to the left.
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
const PF = k.fitProjection(groundRect(12, 2, 150, 150 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const TT = fieldTerrain();
const FIELD = fieldStatic(k, PF, TT);
const R0 = MODEL.ratio.start;
const S0 = runAt("delay", R0, 0.6, "subsequent");
const POSE0 = fieldPose("delay", R0, "subsequent", S0, TT);
const look = (u) => (u.kind ? (u.kind === "t" ? rgTruck(k, PF, trFaceStep(u.face)) : trVehicle(k, PF, trFaceStep(u.face))) : trSoldier(k, PF, { ...u, face: trFaceStep(u.face) }));
const liveItems = [...POSE0.units, ...POSE0.men].map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${look(u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "rg-field",
  label: "The same idea on a battlefield. A blue company of eight small tracked vehicles, two platoons of four, delays a larger red force coming down a valley road from the right. Four battle positions are marked across the valley with chalk outlines on pegs, and a chalk phase line marks the rear of the area. With subsequent positions the whole company holds each position, firing down the valley as the enemy deploys from column into line, then falls back to the next behind a smoke screen, one platoon moving while the other covers. With alternating positions one platoon holds while the other waits on the next position; the first then drives back between the second's vehicles to the position after. In a withdrawal the company breaks contact under fire, forms a column on the road and drives to the rear with the enemy following; in a retirement the column leaves with no enemy in sight. Vehicles hit on both sides stay greyed where they were hit, the latest ones smoking, and a white ambulance drives to the latest friendly loss. Sizes, distances, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TT, "delay", S0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...liveItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg rg-field"', 'class="iso-svg rg-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (FM 3-90, 2023) defines a delay as a force under pressure that “trades space for time.” Here each ratchet tooth is a delay position and the dashpot slows the ground given between them. The hold times and speeds are a notional teaching model, not data.";
const LABELS = {
  machine: "Delay bench. Left and right arrow keys move through the hours of the run; up and down change the enemy's combat-power ratio; 1, 2 and 3 choose delay, withdrawal or retirement; T switches between subsequent and alternating positions; Enter replays; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys move through the hours of the run; up and down change the enemy's combat-power ratio; 1, 2 and 3 choose delay, withdrawal or retirement; T switches between subsequent and alternating positions; Enter replays; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 29",
  title: "Retrograde and delay",
  hint: "Hover to scrub · click: replay",
  readout: readoutOf("delay", R0, runAt("delay", R0, 0)),
  keys: [
    { mark: "lit", label: "Delaying force: two blocks, their pawls and the dashpot rod" },
    { mark: "raised", label: "Enemy: the pusher carriage and its ram spring" },
    { mark: "edge", label: "Clock: hours since contact; teeth: delay positions" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage rg-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="24" aria-valuenow="0">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = "Army doctrine (FM 3-90, 2023) defines a delay as a force under pressure that “trades space for time.” Here a company holds each battle position until the enemy has deployed against it, then gives ground to the next. Unit sizes, distances, timings and losses are notional.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Delaying company, lit where it is in contact" },
    { mark: "blue", label: "Friendly: platoon set on the next position, ambulance" },
    { mark: "red", label: "Enemy: lead platoon deployed, the rest on the road" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="rg-legend rg-legend-machine">${m}</div><div class="rg-legend rg-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, MODEL, GEO, DIAL, SEL, SEL_FROM, SEL_SPAN, STOP_KEY: FRONT_STOP.key, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs").replace(/^const MODEL = [\s\S]*?\n};\n/m, "const MODEL = DATA.MODEL;\n").replace(/^const clamp = .*$/m, "")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "const GEO = DATA.GEO;\n")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, SEL, SEL_FROM, SEL_SPAN, LABELS } = DATA;
${pointer.toString()}
const K = { depthOf, iso, cameraOf, towardViewer, pathOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, slabOf, sideSeam, planOutline, insetPlan, cylinder, knurl, lineOnTop, onTop, corners, coil };
const root = document.querySelector(".rg-figure");
const stage = root.querySelector(".rg-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const slider = root.querySelector("#rg-ratio");
const ratioText = root.querySelector("#rg-ratio-val");
const modeBtns = root.querySelectorAll("[data-mode]");
const techBtns = root.querySelectorAll("[data-tech]");
const replayBtn = root.querySelector("#rg-replay");
const fieldSvgEl = stage.querySelector(".rg-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const still = matchMedia("(prefers-reduced-motion: reduce)");
const grab = (name) => layer.querySelector('[data-keep="' + name + '"]').outerHTML;
const KEEP = { far: grab("far"), cyl: grab("cyl"), mid: [grab("mid")], front: [grab("front")], statics: [{ key: DATA.STOP_KEY, svg: grab("stop") }] };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const R = MODEL.ratio;
const TT = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, dt: 0, amb: null };
let stageF = null, fire = null, marksSig = "";
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
// run state (model) and shown state (eased)
const S = { mode: "delay", tech: "subsequent", r: R.start, t: 0, playing: true };
const V = { dA: 0, dB: 0, a: 0, pressure: 0, liftA: 0, liftB: 0, couple: 1, bypass: 0, t: 0 };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0, cur = runAt("delay", R.start, 0);
const PAUSE = 0.9;
// tour: the delay from subsequent and then alternating positions, a withdrawal and a retirement, at the
// starting ratio, each run followed by a short rest
const TOUR = [["delay", "subsequent"], ["delay", "alternating"], ["withdraw", "subsequent"], ["retire", "subsequent"]]
  .map(([m, tech]) => ({ mode: m, tech, len: duration(m, R.start, tech) / MODEL.hoursPerSecond + PAUSE }));
const LOOP = TOUR.reduce((s, x) => s + x.len, 0);
function tourAt(c) {
  c %= LOOP;
  for (const step of TOUR) { if (c < step.len) return { mode: step.mode, tech: step.tech, t: Math.min(c * MODEL.hoursPerSecond, duration(step.mode, R.start, step.tech)) }; c -= step.len; }
  return { mode: "delay", tech: "subsequent", t: 0 };
}
function setMode(m) {
  S.mode = m;
  modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
}
function setTech(t) {
  S.tech = t;
  techBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tech === t)));
}
function setRatio(r) {
  S.r = clamp(Math.round(r * 2) / 2, R.min, R.max);
  ratioText.textContent = S.r.toFixed(1).replace(/\\.0$/, "") + " : 1";
  if (document.activeElement !== slider) slider.value = String(S.r);
}
// Battlefield frame: vehicles move by translate and re-render only when their look changes (a 15 degree
// facing step, a side, lit); the fire layer writes attributes only; the fire sector redraws only when the
// holding element changes. The ambulance is eased so it never jumps.
function drawField(s) {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF, { smoke: 64 }); }
  const pose = fieldPose(S.mode, S.r, S.tech, s, TT, FM.amb ? { amb: FM.amb } : {});
  const want = pose.amb;
  if (!FM.amb || still.matches || Math.hypot(want[0] - FM.amb[0], want[1] - FM.amb[1]) > 160) FM.amb = want.slice();
  else {
    const dx = want[0] - FM.amb[0], dy = want[1] - FM.amb[1], d = Math.hypot(dx, dy), step = 70 * FM.dt;
    FM.amb = d <= step ? want.slice() : [FM.amb[0] + dx / d * step, FM.amb[1] + dy / d * step];
  }
  stageF.put([...pose.units, ...pose.men].map((u) => {
    const f = trFaceStep(u.face);
    const lk = (u.kind ? u.kind + "|" + f : trLook(u)) + "|" + u.side + (u.lit ? "|lit" : "");
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look: lk, side: u.side, lit: u.lit,
      svg: () => { const ck = u.kind ? u.kind + "|" + f : trLook(u); if (!LOOKS.has(ck)) LOOKS.set(ck, u.kind ? (u.kind === "t" ? rgTruck(K, PF, f) : trVehicle(K, PF, f)) : trSoldier(K, PF, { ...u, face: f })); return LOOKS.get(ck); } };
  }));
  const sig = pose.sig + "|" + (S.mode === "delay" && s.el !== "AB" && s.kind !== "done" ? (s[s.el].moving ? "m" : s[s.el].d) : "");
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TT, S.mode, s); marksSig = sig; }
  const tt = still.matches ? 4.37 : FM.t;
  const shots = trShots(pose.streams, tt);
  shots.smoke = fieldSmoke(pose, tt).concat(shots.smoke);
  fire.draw(shots);
}
function draw(s) {
  if (view === "field") drawField(s);
  else {
    layer.innerHTML = scene(K, P, { dA: V.dA, dB: V.dB, a: V.a, pressure: V.pressure, liftA: V.liftA, liftB: V.liftB, couple: V.couple, bypass: V.bypass, positions: MODEL.positions, ...KEEP });
    const h = layer.querySelector('[data-part="hand"]');
    if (h) h.setAttribute("d", hand(K, P, DIAL, V.t));
    const ptr = layer.querySelector('[data-part="pointer"]');
    if (ptr) ptr.setAttribute("d", pointer(K, P, S.r));
  }
  const text = readoutOf(S.mode, S.r, s);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(s.t)));
  stage.setAttribute("aria-valuetext", s.phase + ". " + text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  FM.t += dt; FM.dt = dt;
  if (touring) {
    clock += dt;
    const step = tourAt(clock);
    if (step.mode !== S.mode) setMode(step.mode);
    if (step.tech !== S.tech) setTech(step.tech);
    if (S.r !== R.start) setRatio(R.start);
    S.t = step.t;
  } else if (S.playing) {
    S.t = Math.min(duration(S.mode, S.r, S.tech), S.t + dt * MODEL.hoursPerSecond);
    if (S.t >= duration(S.mode, S.r, S.tech)) S.playing = false;
  }
  const s = runAt(S.mode, S.r, S.t, S.tech);
  cur = s;
  const goal = { dA: s.A.d, dB: s.B.d, a: s.a === null ? -GEO.PARK : s.a, pressure: s.pressure, liftA: s.A.lifted ? 1 : 0, liftB: s.B.lifted ? 1 : 0,
    couple: S.mode === "delay" && S.tech === "alternating" ? 0 : 1, bypass: S.mode === "delay" && S.tech === "subsequent" ? 0 : 1, t: s.t };
  let moving = false;
  for (const key of Object.keys(goal)) {
    const tau = key === "liftA" || key === "liftB" || key === "bypass" || key === "couple" ? 0.15 : key === "t" ? 0.08 : 0.1;
    V[key] = calm ? goal[key] : V[key] + (goal[key] - V[key]) * (1 - Math.exp(-dt / tau));
    if (Math.abs(V[key] - goal[key]) < 0.002) V[key] = goal[key]; else moving = true;
  }
  draw(s);
  const settled = !touring && !S.playing && !moving;
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const pauseTour = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const replay = () => { S.t = 0; S.playing = !still.matches; if (still.matches) S.t = duration(S.mode, S.r, S.tech); pauseTour(); };
const scrub = (t) => { S.t = clamp(t, 0, duration(S.mode, S.r, S.tech)); S.playing = false; pauseTour(); };
const choose = (m) => { setMode(m); replay(); };
// the technique is a way to conduct a delay, so choosing one runs a delay
const chooseTech = (t) => { setTech(t); setMode("delay"); replay(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw(cur);
  run();
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const box = stage.getBoundingClientRect();
  const f = clamp((event.clientX - box.left - box.width * 0.12) / (box.width * 0.76), 0, 1);
  // the field runs right to left, so the pointer scrubs the same way the ground is given
  scrub((view === "field" ? 1 - f : f) * duration(S.mode, S.r, S.tech));
});
stage.addEventListener("click", replay);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") scrub(S.t + 0.5);
  else if (event.key === "ArrowLeft") scrub(S.t - 0.5);
  else if (event.key === "ArrowUp") { setRatio(S.r + 0.5); replay(); }
  else if (event.key === "ArrowDown") { setRatio(S.r - 0.5); replay(); }
  else if (event.key === "1" || event.key === "2" || event.key === "3") choose(MODES[Number(event.key) - 1]);
  else if (event.key === "m" || event.key === "M") choose(MODES[(MODES.indexOf(S.mode) + 1) % 3]);
  else if (event.key === "t" || event.key === "T") chooseTech(S.tech === "subsequent" ? "alternating" : "subsequent");
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else if (event.key === " " || event.key === "Enter") replay();
  else return;
  event.preventDefault();
});
modeBtns.forEach((b) => b.addEventListener("click", () => choose(b.dataset.mode)));
techBtns.forEach((b) => b.addEventListener("click", () => chooseTech(b.dataset.tech)));
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
replayBtn.addEventListener("click", replay);
slider.addEventListener("input", () => { setRatio(Number(slider.value)); replay(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
// Reset: back to the state the page opened in (run, shown state, controls and idle tour); the view is kept.
function reset() {
  clearTimeout(idle);
  Object.assign(S, { mode: "delay", tech: "subsequent", r: R.start, t: 0, playing: true });
  Object.assign(V, { dA: 0, dB: 0, a: 0, pressure: 0, liftA: 0, liftB: 0, couple: 1, bypass: 0, t: 0 });
  Object.assign(FM, { t: 0, dt: 0, amb: null });
  touring = !still.matches; clock = 0;
  if (document.activeElement === slider) slider.blur();
  setMode(S.mode); setTech(S.tech); setRatio(S.r);
  if (still.matches) { touring = false; S.playing = false; S.t = duration(S.mode, S.r, S.tech) * 0.45; }
  cur = runAt(S.mode, S.r, S.t, S.tech);
  if (still.matches) { V.dA = cur.A.d; V.dB = cur.B.d; V.a = cur.a; V.pressure = cur.pressure; V.t = cur.t; }
  draw(cur); run();
}
root.querySelector(".fd-reset").addEventListener("click", reset);
setMode(S.mode);
setTech(S.tech);
setRatio(S.r);
if (still.matches) { touring = false; S.playing = false; S.t = duration(S.mode, S.r, S.tech) * 0.45; }
cur = runAt(S.mode, S.r, S.t, S.tech);
if (still.matches) { V.dA = cur.A.d; V.dB = cur.B.d; V.a = cur.a; V.pressure = cur.pressure; V.t = cur.t; }
setView(view, false);
window.__retrograde = { S, V, FM, setMode, setTech, setRatio, scrub, replay, chooseTech, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const tech of TECHS) for (const r of [2, 3, 4, 6]) console.log(`${tech} delay at ${r}:1 → ${duration("delay", r, tech)} h for ${MODEL.depth} km, ${hoursPerKm("delay", r, tech).toFixed(2)} h/km; end: ${readoutOf("delay", r, runAt("delay", r, 99, tech))}`);
console.log("withdraw", hoursPerKm("withdraw", 3).toFixed(3), "h/km; readout example:", readoutOf("delay", 3, runAt("delay", 3, 5)));
console.log("wrote index.html", PAGE.length, "bytes");
