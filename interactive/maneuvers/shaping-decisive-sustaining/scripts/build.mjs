// Builds interactive/maneuvers/shaping-decisive-sustaining/index.html: an isometric
// three-stage press line made with the Anatomy kit (../../kit, MIT).
// Run: node interactive/maneuvers/shaping-decisive-sustaining/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, LINE, newLine, steadyRate, finalBend, losses, attackReach } from "./model.mjs";
import { GEO, prism, scene, binSvg, rodSvg, needle, knobSvg } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks, sdsTruck, sdsGun } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -180, y: -52, w: 354, d: 114, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: -172, y: -45, w: 28, d: 16, r: 1.5 };
const DIAL = { x: 140, y: 46, r: 11, z: 20, h: 6 };
DIAL.top = DIAL.z + DIAL.h;
const METER_MAX = 40;
const X = { feed: LINE.feed, shape: LINE.shape, decide: LINE.decide };
const ST = [
  { x: X.shape, hw: 6, beam: GEO.BEAM[0], bh: 7, cr: 5, ch: 9, notch: GEO.NOTCH * Math.tan(22.5 * Math.PI / 180) },
  { x: X.decide, hw: 7, beam: GEO.BEAM[1], bh: 8, cr: 6, ch: 11, notch: GEO.NOTCH },
];
const KNOB_Y = 44;
const ROD = { x0: -149, len: 8, z: 12.6 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [X.decide, -31, 70], [X.decide, 31, 70], [X.shape, -31, 60], [X.feed, 15, 38]],
  WIDTH, HEIGHT, { pad: 16, azimuth: 58 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const slab = (plan, z, h, style, steps = 3, bevel = 0) => S(k.slabOf(plan, z, h, P, steps, bevel), style);
const seamed = (plan, z, h, seamZ, style, steps = 3, bevel = 0) =>
  S(k.slabOf(plan, z, h, P, steps, bevel), { ...style, inner: L(k.sideSeam(plan, seamZ, P, steps), { tone: "faint" }) });
const topDots = (plan, z, inset = 1.6) => Dt(k.corners(plan, inset).map(([x, y]) => at([x, y, z])), { size: 0.42 });

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
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
  [[18, 5], [13, 8], [16, 11]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The rear column of each press, on its foot flange.
function column(st, y0) {
  const flange = { x: st.x - st.hw - 2.5, y: y0 - 1.5, w: st.hw * 2 + 5, d: 9, r: 1 };
  const col = { x: st.x - st.hw, y: y0, w: st.hw * 2, d: 6, r: 0.8 };
  return slab(flange, 0, 2, { tone: "lo" }, 2, 0.3) + topDots(flange, 2, 1.3) +
    seamed(col, 2, st.beam - 2, 12, { tone: "mid" }, 2, 0.4);
}

// Crosshead beam with its hydraulic cylinder, cap and bolts.
function head(st, lit) {
  const beam = { x: st.x - st.hw - 2, y: -32, w: st.hw * 2 + 4, d: 64, r: 1.5 };
  let out = seamed(beam, st.beam, st.bh, st.beam + st.bh / 2, { tone: "mid" }, 3, 0.6);
  out += Dt([[st.x - st.hw, -29], [st.x + st.hw, -29], [st.x - st.hw, 29], [st.x + st.hw, 29]].map(([x, y]) => at([x, y, st.beam + st.bh])), { size: 0.45 });
  const z0 = st.beam + st.bh;
  out += S(k.cylinder(st.x, 0, st.cr + 1.6, z0, 1.4, P, 32, 0.3), { tone: "mid" });
  out += S(k.cylinder(st.x, 0, st.cr, z0 + 1.4, st.ch, P, 40, 0.5), { tone: lit ? "hi" : "mid", inner: L(k.sideArc(st.x, 0, st.cr, z0 + 1.4 + st.ch * 0.55, P, 24), { tone: "faint" }) });
  const zt = z0 + 1.4 + st.ch;
  out += S(k.cylinder(st.x, 0, st.cr + 0.9, zt, 1.6, P, 36, 0.3), { tone: "mid" });
  const bolts = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; bolts.push(at([st.x + Math.cos(a) * (st.cr - 0.6), Math.sin(a) * (st.cr - 0.6), zt + 1.6])); }
  out += Dt(bolts, { size: 0.42 });
  out += S(k.cylinder(st.x, 0, 1.4, zt + 1.6, 1.4, P, 14), { tone: "mid" });
  return out;
}

// Die bed and the two halves of the V die, between the rails.
function die(st) {
  const bed = { x: st.x - 12, y: -11.6, w: 24, d: 23.2, r: 0.6 };
  const n = st.notch;
  const left = [[st.x - 11, 2], [st.x, 2], [st.x, GEO.ROLL - n], [st.x - GEO.NOTCH, GEO.ROLL], [st.x - 11, GEO.ROLL]];
  const right = left.map(([u, z]) => [2 * st.x - u, z]);
  return slab(bed, 0, 2, { tone: "lo" }, 2) +
    S(prism(k, P, "y", left, -11.5, 11.5), { tone: "mid" }) +
    S(prism(k, P, "y", right, -11.5, 11.5), { tone: "mid" });
}

const RAIL0 = -108, RAIL1 = 116;
function rail(y0) {
  const plan = { x: RAIL0, y: y0, w: RAIL1 - RAIL0, d: 3, r: 0.6 };
  return slab(plan, 0, 10, { tone: "mid" }, 2, 0.3);
}
function rollers() {
  const out = [];
  const oct = (zc) => { const r = []; for (let i = 0; i < 8; i++) r.push([1.6 * Math.cos((i + 0.5) * Math.PI / 4), zc + 1.6 * Math.sin((i + 0.5) * Math.PI / 4)]); return r; };
  for (let x = -104; x <= 112; x += 9) {
    if (Math.abs(x - X.shape) < 15 || Math.abs(x - X.decide) < 15) continue;
    out.push(S(prism(k, P, "y", oct(GEO.ROLL - 1.6).map(([u, z]) => [u + x, z]), -12, 12), { tone: "mid", crease: "none" }));
  }
  return out.join("");
}
function frontRail() {
  const plan = { x: RAIL0, y: 12, w: RAIL1 - RAIL0, d: 3, r: 0.6 };
  const t = k.topTicks(RAIL0 + 2, RAIL1 - 2, 3, 5, 12, 10, [1.1, 2.1], P, "x");
  const axles = [];
  for (let x = -104; x <= 112; x += 9) if (!(Math.abs(x - X.shape) < 15 || Math.abs(x - X.decide) < 15)) axles.push(at([x, 15, GEO.ROLL - 1.6]));
  return slab(plan, 0, 10, { tone: "mid" }, 2, 0.3) + L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) + Dt(axles, { size: 0.42 });
}

// The feeder: actuator on its mounts (the rod is live) and the magazine of flat sheets.
function actuator() {
  const out = [];
  for (const x of [-172, -152.4]) out.push(slab({ x, y: -4.4, w: 3.4, d: 8.8, r: 0.5 }, 0, 8, { tone: "lo" }, 2, 0.3));
  const oct = []; for (let i = 0; i < 8; i++) oct.push([3.6 * Math.cos((i + 0.5) * Math.PI / 4), ROD.z + 3.6 * Math.sin((i + 0.5) * Math.PI / 4)]);
  out.push(S(prism(k, P, "x", oct, -170, -152), { tone: "mid" }));
  for (const x of [-172, -152.4]) out.push(slab({ x, y: -4.4, w: 3.4, d: 8.8, r: 0.5 }, 8, 9.2, { tone: "mid" }, 2, 0.3) + topDots({ x, y: -4.4, w: 3.4, d: 8.8 }, 17.2, 1.1));
  return out.join("");
}
const MAG = { x: -143, y: -16, w: 34, d: 32, r: 1.5 };
const POSTS = [[-143, -15], [-111.4, -15], [-143, 12.6], [-111.4, 12.6]];
function magazineBack() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(MAG, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(seamed(MAG, 0, GEO.ROLL, 4, { tone: "mid" }, 3, 0.5));
  out.push(Dt([[-141, -14], [-141, 14], [-111, -14], [-111, 14]].map(([x, y]) => at([x, y, GEO.ROLL])), { size: 0.42 }));
  for (const [x, y] of POSTS.slice(0, 2)) out.push(slab({ x, y, w: 2.4, d: 2.4, r: 0.3 }, GEO.ROLL, 26, { tone: "mid" }, 2));
  out.push(slab({ x: -141.4, y: -12.6, w: 2, d: 25.2, r: 0.3 }, 13.8, 23.2, { tone: "lo" }, 2));
  for (let i = 0; i < 10; i++) out.push(slab({ x: X.feed - GEO.HALF, y: -GEO.WIDE, w: GEO.HALF * 2, d: GEO.WIDE * 2, r: 0 }, GEO.ROLL + 1.35 * i, GEO.THICK, { tone: "mid", crease: "lo" }, 2));
  out.push(slab({ x: -111.4, y: -12.6, w: 2.4, d: 25.2, r: 0.3 }, 13.8, 23.2, { tone: "mid" }, 2, 0.3));
  for (const [x, y] of POSTS.slice(2)) out.push(slab({ x, y, w: 2.4, d: 2.4, r: 0.3 }, GEO.ROLL, 26, { tone: "mid" }, 2));
  out.push(slab({ x: -143.6, y: -15.6, w: 35.2, d: 31.2, r: 1 }, 37, 1.6, { tone: "mid" }, 3, 0.4));
  out.push(Dt(POSTS.map(([x, y]) => at([x + 1.2, y + 1.2, 38.6])), { size: 0.42 }));
  return out.join("");
}

// The bin: floor and far walls here; the near walls are drawn in front of the parts.
const BIN = { x: 118, y: -28, w: 36, d: 54, r: 1.5 };
function binBack() {
  return `<path class="iso-halo" d="${k.haloOf(BIN, 0, 0.1, P)}" style="filter:blur(3px)"/>` +
    slab(BIN, 0, GEO.BIN_FLOOR, { tone: "lo" }, 3, 0.4) +
    slab({ x: 118, y: -28, w: 36, d: 2, r: 0.4 }, 2, 8, { tone: "mid" }, 2, 0.3) +
    slab({ x: 118, y: -26, w: 2, d: 50, r: 0.4 }, 2, 5, { tone: "mid" }, 2, 0.3);
}
function binFront() {
  return slab({ x: 152, y: -28, w: 2, d: 54, r: 0.4 }, 2, 8, { tone: "mid" }, 2, 0.3) +
    slab({ x: 120, y: 24, w: 32, d: 2, r: 0.4 }, 2, 8, { tone: "mid" }, 2, 0.3) +
    Dt([[121, 25], [151, 25], [153, -27], [153, 25]].map(([x, y]) => at([x, y, 10])), { size: 0.42 });
}
const DIVIDER = { key: k.depthOf([136, 0.3, 0], P), svg: slab({ x: 120, y: -0.5, w: 32, d: 1.6, r: 0.3 }, 2, 6, { tone: "mid" }, 2) };

// Stop-knob bases with their cables to each stage.
function knobBases() {
  const out = [];
  for (const [x, yEnd] of [[X.feed, 16], [X.shape, 32.5], [X.decide, 32.5]]) {
    const base = { x: x - 8, y: KNOB_Y - 6, w: 16, d: 12, r: 1.5 };
    out.push(L(k.lineOnTop([x + 5, yEnd], [x + 5, KNOB_Y - 6], 0, P), { tone: "lo" }));
    out.push(Dt([at([x + 5, yEnd, 0]), at([x + 5, KNOB_Y - 6, 0])], { size: 0.55 }));
    out.push(slab(base, 0, 3.2, { tone: "mid" }, 3, 0.4));
    out.push(L(k.ring(x, KNOB_Y, 4.8, 3.2, P, 28), { tone: "lo" }));
    out.push(Dt([at([x - 6, KNOB_Y - 4, 3.2]), at([x + 6, KNOB_Y + 4, 3.2])], { size: 0.42 }));
  }
  return out.join("");
}

// The meter: good parts per minute.
function gauge() {
  const out = [];
  const ped = { x: DIAL.x - 13, y: DIAL.y - 13, w: 26, d: 26, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3, 7.4, DIAL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(DIAL.x, DIAL.y, 3, 13, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 2.6, DIAL.top, 60, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 2.6, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 1.8, DIAL.top, P, 64), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 1.8, 16, 4, DIAL.top, [1, 2.2], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, DIAL, 60 / MODEL.cycle, METER_MAX)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.3, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}

const ON = { feed: true, shape: true, decide: true };
const START = newLine();
const knobs = (on) => knobSvg(k, P, X.feed, KNOB_Y, on.feed) + knobSvg(k, P, X.shape, KNOB_Y, on.shape) + knobSvg(k, P, X.decide, KNOB_Y, on.decide);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "sds-svg",
  label: "A bench model of decisive, shaping and sustaining operations as a three-stage sheet-metal press line. On the left a feeder pushes flat sheets out of a magazine onto a roller conveyor: the sustaining stage. A small press in the middle pre-bends each sheet: the shaping stage. A larger press with a lit punch makes the final ninety-degree bend: the decisive stage. Finished parts drop into the back compartment of a bin and scrap into the front one, and a dial reads good parts per minute. Three stop knobs on the front edge stop each stage; stopping any one of them leaves the line making no good parts.",
  body: [
    plate(),
    ST.map((st) => column(st, -31)).join(""),
    rail(-15),
    ST.map(die).join(""),
    rollers(),
    frontRail(),
    actuator(),
    `<g data-part="rod">${rodSvg(k, P, 1, ROD.x0, ROD.len, ROD.z)}</g>`,
    magazineBack(),
    binBack(),
    `<g data-part="live">${scene(k, P, START, X, { landing: () => ({ x: 0, y: 0, drop: 0 }), binCount: () => 0, statics: [DIVIDER] })}</g>`,
    ST.map((st) => column(st, 25)).join(""),
    ST.map((st, i) => head(st, false)).join(""),
    binFront(),
    knobBases(),
    `<g data-part="knobs">${knobs(ON)}</g>`,
    `<g data-part="gauge">${gauge()}</g>`,
  ],
});

// ---- Battlefield view: the same switches on full-bleed terrain at brigade scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the whole
// card at every width; a phone crops the sides. PF frames a screen-aligned ground rect.
const FW = 640, FH = 420, FA = 55, FE = 42, RAD = Math.PI / 180;
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const PF = k.fitProjection(groundRect(-4, -6, 215, 215 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const T = fieldTerrain();
const FIELD_STATIC = fieldStatic(k, PF, T);
const POSE0 = fieldPose(ON, T);
const unitSvg = (K, P, u, f) => (u.kind === "t" ? sdsTruck : u.kind === "g" ? sdsGun : trVehicle)(K, P, f);
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(k, PF, u, trFaceStep(u.face))}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "sds-field",
  label: "The same idea on a battlefield, at brigade scale, with each small vehicle standing for a platoon and each group of three for a company. On the right, a red enemy mechanized company is dug in on a low hill, the objective, its fire sector marked on the ground toward the attack. On the left rear, the blue brigade support area: sheds, crate stacks and parked supply trucks. Supply trucks run along the main road to the rear of the attack and along a track to a battery of four self-propelled guns. The guns shell the enemy positions, and two scout vehicles on a rise watch the objective and call the fire: the shaping operations. The lit blue mechanized battalion, the decisive operation, attacks from its attack position, marked in chalk on pegs, across a line of departure onto the hill. With all three running, the enemy is suppressed, the attack takes the hill and the enemy's survivors fall back; vehicles knocked out on both sides stop, greyed and smoking, and an ambulance carries casualties to the rear. Stop the shaping and the unsuppressed enemy stops the attack halfway with heavy losses; stop the decisive attack and it never leaves its attack position; stop the sustainment and the trucks halt, the guns fall silent and the attack stalls short of the hill. Each change replays the attack. Unit sizes, distances, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD_STATIC.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD_STATIC.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg sds-field"', 'class="iso-svg sds-field" preserveAspectRatio="xMidYMid slice"');

const LABELS = {
  machine: "Press line. Keys 1, 2 and 3 stop or restart the feeder, the shaping press and the decisive press; R restarts all three; V switches to the Battlefield view.",
  field: "Battlefield. Keys 1, 2 and 3 stop or restart the sustaining supply trucks, the shaping guns and scouts, and the decisive attack; R restarts all three; V switches to the Machine view.",
};

const CAPTION = "U.S. Army ADP 3-0 (2019) sorts an operation by purpose into decisive, shaping and sustaining operations: the decisive operation “directly accomplishes the mission,” shaping operations create “conditions for success of the decisive operation,” and sustaining operations enable both “by generating and maintaining combat power.” FM 3-0 (2022) frames operations differently. The press rates and the 45° per stroke are notional.";

const body = k.plateHtml({
  fig: "Fig 14",
  title: "Shape, decide, sustain",
  hint: "Click a stage to stop it",
  readout: "",
  keys: [
    { mark: "lit", label: "Decisive press: makes the final bend" },
    { mark: "raised", label: "Shaping press and the feeder (sustaining)" },
    { mark: "edge", label: "Meter: good parts per minute" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage sds-stage" tabindex="0" role="group" aria-label="${LABELS.machine}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("The press rates and the 45° per stroke are notional.", "Here the guns and scouts shape, the lit battalion's attack is decisive and the supply trucks sustain. Unit sizes, distances, timings and losses are notional, not data.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Decisive: the mechanized battalion's attack (lit)" },
    { mark: "blue", label: "Shaping: guns and scouts · sustaining: supply trucks" },
    { mark: "red", label: "Enemy: a mechanized company dug in on the objective" },
  ], caption: FIELD_CAPTION, body: "",
}));
const cardHtml = body.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="sds-legend sds-legend-machine">${m}</div><div class="sds-legend sds-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, X, GEO, MODEL, LINE, DIAL, METER_MAX, KNOB_Y, ROD, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = \{[\s\S]*?\n\};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, X, DIAL, METER_MAX, KNOB_Y, ROD, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, segment, ring, corners, insetPlan, planOutline, haloOf };
const root = document.querySelector(".sds-figure");
const stage = root.querySelector(".sds-stage");
const svg = stage.querySelector(".sds-svg");
const layer = svg.querySelector('[data-part="live"]');
const rodEl = svg.querySelector('[data-part="rod"]');
const knobEl = svg.querySelector('[data-part="knobs"]');
const needleEl = svg.querySelector('[data-part="needle"]');
const readout = root.querySelector("[data-readout]");
const buttons = { feed: root.querySelector("#sds-feed"), shape: root.querySelector("#sds-shape"), decide: root.querySelector("#sds-decide") };
const resetBtn = root.querySelector("#sds-all");
const fieldSvgEl = stage.querySelector(".sds-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Click a stage to stop it", field: "Click a force to stop it" };
const NAMES = { machine: { feed: "feeder", shape: "shaping press", decide: "decisive press" }, field: { feed: "supply trucks", shape: "guns and scouts", decide: "decisive attack" } };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const T = fieldTerrain();
const LOOKS = new Map();
// What the Battlefield view measures between frames (see field-scene.mjs): the attack's progress p,
// how far the current replay has run b, the switches its losses belong to, shaping and supply eased.
const FM = { t: 0, p: 0, b: 0, back: false, lossOn: { feed: true, shape: true, decide: true }, sh: 1, shDir: 1, sup: 1, lap: 0 };
let stageF = null, fire = null, marksSig = "";
const still = matchMedia("(prefers-reduced-motion: reduce)");
const DIVIDER = { key: depthOf([136, 0.3, 0], P), svg: ${JSON.stringify(DIVIDER.svg)} };
const on = { feed: true, shape: true, decide: true };
let line = newLine();
let shown = line.rate;
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
const TOUR = [[0, 1, 1, 1], [3.5, 0, 1, 1], [7, 1, 0, 1], [10.5, 1, 1, 0], [13.5, 1, 1, 1]];
const TOUR_LEN = 16;
// The Battlefield's tour gives each replay time to play out: all running, then each stage stopped.
const FTOUR = [[0, 1, 1, 1], [5.5, 0, 1, 1], [11, 1, 0, 1], [16.5, 1, 1, 0]];
const FTOUR_LEN = 22;
function tourAt(t) {
  const rows = view === "field" ? FTOUR : TOUR;
  t %= view === "field" ? FTOUR_LEN : TOUR_LEN;
  let row = rows[0];
  for (const r of rows) if (t >= r[0]) row = r;
  return row;
}
// One step of the Battlefield's own clocks (run in both views, so a switch shows the same battle).
function stepField(dt) {
  FM.t += dt;
  if (FM.back) {
    FM.p = Math.max(0, FM.p - dt * FG.REPLAY_BACK * (0.35 + FM.p));
    if (FM.p <= 0.002) { FM.p = 0; FM.back = false; FM.b = 0; FM.lossOn = { ...on }; }
  } else {
    FM.b = Math.min(1, FM.b + dt / FIELD.replay);
    FM.p = attackReach(on) * sdsEase(FM.b);
  }
  const shWant = on.shape ? 1 : 0;
  FM.shDir = shWant > FM.sh ? 1 : shWant < FM.sh ? -1 : FM.shDir;
  FM.sh = FM.sh + Math.max(-dt / 1.4, Math.min(dt / 1.4, shWant - FM.sh));
  FM.sup += ((on.feed ? 1 : 0) - FM.sup) * (1 - Math.exp(-dt / 1.2));
  if (on.feed) FM.lap += dt / FG.TRUCK_LAP;
}
function sync() {
  for (const key of STAGES) {
    buttons[key].setAttribute("aria-pressed", String(!on[key]));
    buttons[key].textContent = (on[key] ? "Stop " : "Restart ") + NAMES[view][key];
  }
  knobEl.innerHTML = knobSvg(K, P, X.feed, KNOB_Y, on.feed) + knobSvg(K, P, X.shape, KNOB_Y, on.shape) + knobSvg(K, P, X.decide, KNOB_Y, on.decide);
}
function setStages(next) {
  let changed = false;
  for (const key of STAGES) if (on[key] !== next[key]) { on[key] = next[key]; changed = true; }
  if (!changed) return;
  line.good = 0; line.scrap = 0;
  // the Battlefield replays the attack: drive back to the attack position first if it has moved
  FM.back = FM.p > 0.002;
  if (!FM.back) { FM.b = 0; FM.lossOn = { ...on }; }
  sync();
  if (still.matches) settle();
}
// Reduced motion: no animation, jump the line forward to where it settles.
function settle() {
  for (let i = 0; i < 600; i++) stepLine(line, on, 1 / 60);
  line.good = 0; line.scrap = 0;
  for (let i = 0; i < 300; i++) stepLine(line, on, 1 / 60);
  shown = line.rate;
  FM.back = false; FM.b = 1; FM.p = attackReach(on); FM.lossOn = { ...on };
  FM.sh = on.shape ? 1 : 0; FM.sup = on.feed ? 1 : 0;
  draw();
}
const binCount = (good) => (good ? line.bin.good : line.bin.scrap);
// Battlefield frame: vehicles move by translate and re-render only when their facing crosses a 15°
// step or they are knocked out; the fire layer writes attributes only; the fire sectors redraw only
// when the state moves them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(on, T, FM);
  stageF.put(pose.units.map((u) => {
    const f = trFaceStep(u.face), shape = (u.kind || "v") + "|" + f, look = u.side + "|" + shape;
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(shape)) LOOKS.set(shape, (u.kind === "t" ? sdsTruck : u.kind === "g" ? sdsGun : trVehicle)(K, PF, f)); return LOOKS.get(shape); } };
  }));
  const sig = pose.seized.toFixed(2) + "|" + pose.sh.toFixed(2);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  const ft = still.matches ? 4.37 : FM.t, shots = trShots(pose.streams, ft);
  shots.smoke = [...fieldSmoke(pose, ft), ...shots.smoke];
  fire.draw(shots);
  return pose;
}
function draw() {
  let text;
  if (view === "field") {
    const pose = drawField();
    text = fieldStatus(on, FM.back ? 0 : FM.b) + " · " + (FM.back ? "regrouping" : pose.LS.blue + " vs " + pose.LS.red + " down");
  } else {
    const bins = binSvg(K, P, line.bin, LINE.bin);
    layer.innerHTML = scene(K, P, line, X, { landing, binCount, statics: [DIVIDER, ...bins] });
    rodEl.innerHTML = rodSvg(K, P, line.push < 1 ? Math.sin(Math.min(1, line.push) * Math.PI) : 0, ROD.x0, ROD.len, ROD.z);
    needleEl.setAttribute("d", needle(K, P, DIAL, shown, METER_MAX));
    text = status(on) + " · " + line.good + " good · " + line.scrap + " scrap";
  }
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) {
    clock += dt;
    const [, f, s, d] = tourAt(clock);
    setStages({ feed: !!f, shape: !!s, decide: !!d });
  }
  stepLine(line, on, dt);
  stepField(dt);
  shown += (line.rate - shown) * (1 - Math.exp(-dt / 0.6));
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 12000);
  run();
};
const toggle = (key) => { setStages({ ...on, [key]: !on[key] }); hold(); };
const restart = () => { setStages({ feed: true, shape: true, decide: true }); hold(); };
function floorAt(event) {
  const el = view === "field" ? fieldSvgEl : svg, P = view === "field" ? PF : DATA.P;
  const pt = el.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const p = pt.matrixTransform(el.getScreenCTM().inverse());
  const a = P.azimuth * Math.PI / 180, e = (P.elevation ?? 30) * Math.PI / 180;
  const kk = P.scale * Math.sqrt(1.6);
  const u = (p.x - P.origin[0]) / kk, v = (p.y - P.origin[1]) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
// Battlefield: the force nearest the click (supply trucks and support area, guns and scouts, or the attack).
const FORCE_AT = () => ({ feed: [FG.BSA, [-150, 40], [-196, -10]], shape: [...FG.GUNS, ...FG.OP], decide: [FG.AP, [FG.AP[0] + (FG.END[0] - FG.AP[0]) * FM.p, FG.AP[1] + (FG.END[1] - FG.AP[1]) * FM.p]] });
stage.addEventListener("click", (event) => {
  const [x, y] = floorAt(event);
  let best = null, gap = 48;
  if (view === "field") {
    gap = 70;
    const at = FORCE_AT();
    for (const key of STAGES) for (const [fx, fy] of at[key]) { const d = Math.hypot(x - fx, y - fy); if (d < gap) { gap = d; best = key; } }
  } else for (const key of STAGES) { const d = Math.abs(x - X[key]); if (d < gap) { gap = d; best = key; } }
  if (best) toggle(best);
});
stage.addEventListener("keydown", (event) => {
  const map = { "1": "feed", "2": "shape", "3": "decide" };
  if (map[event.key]) toggle(map[event.key]);
  else if (event.key === "r" || event.key === "R") restart();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
for (const key of STAGES) buttons[key].addEventListener("click", () => toggle(key));
resetBtn.addEventListener("click", restart);
// Reset: back to the state the page opened in (switches, line, battle clocks and idle tour); the view is kept.
const fullResetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  for (const key of STAGES) on[key] = true;
  line = newLine();
  shown = line.rate;
  Object.assign(FM, { t: 0, p: 0, b: 0, back: false, lossOn: { feed: true, shape: true, decide: true }, sh: 1, shDir: 1, sup: 1, lap: 0 });
  marksSig = "";
  touring = !still.matches; clock = 0;
  sync();
  if (still.matches) settle(); else { for (let i = 0; i < 420; i++) stepLine(line, on, 1 / 60); line.good = 0; line.scrap = 0; draw(); }
  run();
}
fullResetBtn.addEventListener("click", reset);
still.addEventListener("change", () => { touring = !still.matches; if (still.matches) settle(); else run(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  clock = 0;
  sync();
  draw();
  run();
}
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
root.setAttribute("data-view", view);
sync();
if (still.matches) settle(); else { for (let i = 0; i < 420; i++) stepLine(line, on, 1 / 60); line.good = 0; line.scrap = 0; }
setView(view, false);
window.__shapingDecisiveSustaining = { on, line: () => line, field: FM, setStages, toggle, restart, reset, setView, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => cardHtml)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

console.log("steady rate", steadyRate(ON).toFixed(1), "/min; bend all on", finalBend(ON), "· shaping off", finalBend({ ...ON, shape: false }), "· decisive off", finalBend({ ...ON, decide: false }));
console.log("solids", (PAGE.match(/class="iso-solid/g) || []).length, "wrote index.html", PAGE.length, "bytes");
