// Builds interactive/maneuvers/omg/index.html: an isometric "operational maneuver group" bench
// made with the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/omg/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, stateAt, readoutOf, endOf, latestRelease } from "./model.mjs";
import { GEO, xOf, keyOf, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, omBmp, omTruck, omPiece } from "./field-scene.mjs";
import { fieldReadoutOf } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");
const RAD = Math.PI / 180;

const WIDTH = 640;
const HEIGHT = 330;
const U = GEO.U;
const RT = GEO.RAIL_TOP;

const PLATE = { x: xOf(-31.5), y: -40, w: xOf(116) - xOf(-31.5), d: 75, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const D = GEO.DIAL;
const LABEL = { x: xOf(57), y: -31, w: 30, d: 11, r: 1.5 };
const RULER = { x: xOf(6), y: 8, w: xOf(110) - xOf(6), d: 5, r: 1 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [xOf(GEO.PIN_X), 0, 46], [xOf(3), -33, 18], [xOf(3), 30, 18], [D.x, D.y, D.z + D.h + 2]],
  WIDTH, HEIGHT, { pad: 14, azimuth: 132 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const slab = (x0, x1, y0, y1, z, h, steps = 3, bevel = 0, r = 0.8) => k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z, h, P, steps, bevel);
const key = (x, y, z = 0) => keyOf(k, P, x, y, z);

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
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.4), 0.8, P), { tone: "faint" }));
  [[20, 3.2], [14, 5.2], [17, 7.2]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.4, LABEL.y + 2.4, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The km ruler along the near edge: zero at the line's rear face, a tick every 5 km, majors every 25.
function ruler() {
  const out = [S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" })];
  const minor = [], major = [], zero = [];
  for (let km = 0; km <= 100; km += 5) {
    const x = xOf(6 + km);
    const big = km % 25 === 0;
    const d = k.lineOnTop([x, RULER.y], [x, RULER.y + (big ? 3.4 : 2)], 0.6, P);
    (km === 0 ? zero : big ? major : minor).push(d);
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }), L(zero.join(""), { tone: "hi" }));
  return out.join("");
}

// Rails and sleepers: the lane, the reserve's crossing rails, the wedge rails and the siding.
function track() {
  const out = [];
  const skip = (km) => (km > -1 && km < 7) || (km > 41 && km < 49);
  const sleepers = [];
  for (let km = -27; km <= 112; km += 3) if (!skip(km)) sleepers.push(km);
  for (const km of sleepers) out.push(S(slab(xOf(km) - 1, xOf(km) + 1, -6, 6, 0, 1, 2, 0, 0.3), { tone: "lo", crease: "none" }));
  // reserve crossing rails (under the lane rails: a diamond crossing)
  for (const km of [43, 47]) out.push(S(slab(xOf(km) - 0.6, xOf(km) + 0.6, -33, 6.5, 0, RT, 2, 0.3, 0.4), { tone: "mid", crease: "none" }));
  for (const y of [-GEO.RAIL, GEO.RAIL]) out.push(S(slab(xOf(-27.5), xOf(112), y - 0.6, y + 0.6, 1, RT - 1, 2, 0.3, 0.4), { tone: "mid", crease: "none" }));
  // wedge rails, ending at the wall's front face
  for (const side of [-1, 1]) for (const dy of [-2.6, 2.6]) {
    const y = side * GEO.WEDGE_Y + dy;
    out.push(S(slab(xOf(-16), -0.4, y - 0.5, y + 0.5, 0, 1.2, 2, 0.2, 0.3), { tone: "mid", crease: "none" }));
  }
  // siding for the second echelon
  for (const y of [-21.6, -26.4]) out.push(S(slab(xOf(-26), xOf(-6), y - 0.5, y + 0.5, 0, 1.2, 2, 0.2, 0.3), { tone: "mid", crease: "none" }));
  // the reserve's lead screw, between its crossing rails, with threads
  {
    const sx = xOf(45);
    out.push(S(slab(sx - 0.8, sx + 0.8, -34.4, -7, 1, 1.6, 2, 0, 0.8), { tone: "mid", crease: "none" }));
    const th = k.coil(-34, -7.4, [sx, 1.8], 0.95, 22, "y", P);
    out.push(L(th.front, { tone: "lo" }));
  }
  // the slot the gate leaf sinks into
  out.push(L(k.planOutline({ x: xOf(GEO.LEAF[0]) - 0.3, y: -GEO.GAP, w: xOf(GEO.LEAF[1]) - xOf(GEO.LEAF[0]) + 0.6, d: 2 * GEO.GAP, r: 0.3 }, 0, P, 2), { tone: "lo" }));
  return out.join("");
}

// Solids above the plate that never move; sorted with the moving ones each frame.
function statics() {
  const list = [];
  const add = (x, y, svg) => list.push({ key: key(x, y), svg });

  // the defended line: two wall runs either side of the gate, with merlons
  const runs = [[GEO.GAP, 20], [20.4, 30], [-20, -GEO.GAP], [-33, -20.4]];
  for (const [y0, y1] of runs) {
    const w = { x: 0, y: y0, w: xOf(6), d: y1 - y0, r: 0.5 };
    let svg = S(k.slabOf(w, 0, GEO.WALL_H - 2.4, P, 2, 0.5), { tone: "mid", inner: L(k.sideSeam(w, 5, P, 2), { tone: "faint" }) });
    const n = Math.max(2, Math.round((y1 - y0) / 5));
    const cells = [];
    for (let i = 0; i < n; i++) {
      const c0 = y0 + ((y1 - y0) * i) / n + 0.5, c1 = y0 + ((y1 - y0) * (i + 1)) / n - 0.5;
      if (i % 2 === 0) cells.push([c0, c1]);
    }
    const sorted = cells.sort((a, b) => key(0, a[0]) - key(0, b[0]));
    for (const [c0, c1] of sorted) svg += S(slab(0.6, xOf(6) - 0.6, c0, c1, GEO.WALL_H - 2.4, 2.4, 2, 0.2, 0.3), { tone: "mid" });
    add(xOf(3), (y0 + y1) / 2, svg);
  }

  // spring abutment: the launcher's back block, bolted down
  {
    const ab = { x: xOf(-27), y: -9.4, w: xOf(GEO.ABUT) - xOf(-27), d: 18.8, r: 1 };
    add(xOf(-25), 0,
      S(k.slabOf(ab, 0, 9, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(ab, 2.4, P, 3), { tone: "faint" }) }) +
      L(k.planOutline(k.insetPlan(ab, 1.6), 9, P, 3), { tone: "faint" }) +
      Dt(k.corners(ab, 1.4).map(([x, y]) => at([x, y, 9])), { size: 0.45 }));
  }
  // rod end posts (also the push bar's stop)
  for (const side of [-1, 1]) {
    const y = side * GEO.ROD_Y;
    const x0 = xOf(GEO.BAR_STOP) + 1.4;
    add(x0 + 1.2, y, S(slab(x0, x0 + 2.4, y - 1.2, y + 1.2, 0, 8, 2, 0.3, 0.4), { tone: "mid" }) + Dt([at([x0 + 1.2, y, 8])], { size: 0.42 }));
  }

  // the reserve's drive: gearbox with a crank at the far end, bearing block at the lane end
  {
    const sx = xOf(45);
    const gb = { x: sx - 2.2, y: -37.6, w: 4.4, d: 3.4, r: 0.6 };
    add(sx, -35.9, S(k.slabOf(gb, 0, 6, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(gb, 2, P, 2), { tone: "faint" }) }) +
      Dt([[sx - 1.4, -36.9], [sx + 1.4, -36.9]].map(([x, y]) => at([x, y, 6])), { size: 0.42 }) +
      S(k.cylinder(sx, -35.6, 1.3, 6, 1.6, P, 16), { tone: "mid" }) + L(k.knurl(sx, -35.6, 1.3, 6, 7.6, 12, P), { tone: "lo" }));
    add(sx, -6.6, S(slab(sx - 1.6, sx + 1.6, -7.4, -5.8, 0, 3.6, 2, 0.3, 0.4), { tone: "mid" }));
  }
  // end buffer with two pads
  {
    const bx = xOf(110.8);
    let svg = S(slab(bx, xOf(113.5), -7, 7, 0, 10, 3, 0.5, 0.8), { tone: "mid" });
    svg += Dt([[bx + 1.4, -5.4], [bx + 1.4, 5.4], [xOf(113.5) - 1.4, -5.4], [xOf(113.5) - 1.4, 5.4]].map(([x, y]) => at([x, y, 10])), { size: 0.42 });
    add(xOf(112), 0, svg);
    for (const y of [-2.4, 2.4]) add(xOf(110.4), y, S(slab(xOf(110) + 0.1, bx, y - 1.4, y + 1.4, 4.4, 3.2, 2, 0, 0.5), { tone: "lo" }));
  }

  // rail-end stops: lane start, reserve rails, wedge rails, siding
  const stop = (x, y, w = 2, d = 2, h = 4) => add(x, y, S(slab(x - w / 2, x + w / 2, y - d / 2, y + d / 2, 0, h, 2, 0.3, 0.4), { tone: "mid" }));
  for (const km of [43, 47]) stop(xOf(km), -33.6, 3, 1.8, 5);
  for (const side of [-1, 1]) stop(xOf(-16.6), side * GEO.WEDGE_Y, 1.8, 8, 4);
  stop(xOf(-26.6), -24, 1.8, 7, 4);

  // the second echelon, parked on its siding (not committed)
  {
    const x0 = xOf(-21), x1 = xOf(-12.5);
    let svg = `<path class="iso-halo" d="${slab(x0, x1, -28, -20, 1.2, 0.1).fill}" style="filter:blur(2.5px)"/>`;
    for (const sx of [x0 + 0.8, x1 - 3.2]) for (const sy of [-21.6, -26.4]) svg += S(slab(sx, sx + 2.4, sy - 1, sy + 1, 1.2, 1.4, 2, 0, 0.3), { tone: "mid" });
    const body = { x: x0, y: -27.6, w: x1 - x0, d: 7.2, r: 0.8 };
    svg += S(k.slabOf(body, 2.6, 5, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(body, 4.2, P, 3), { tone: "faint" }) });
    svg += L(k.lineOnTop([x0, -24], [x1, -24], 7.6, P), { tone: "lo" });
    svg += Dt([[x0 + 1.4, -26], [x0 + 1.4, -22], [x1 - 1.4, -26], [x1 - 1.4, -22]].map(([x, y]) => at([x, y, 7.6])), { size: 0.42 });
    add((x0 + x1) / 2, -24, svg);
    // wheel chocks either end
    for (const cx of [x0 - 1.3, x1 + 1.3]) add(cx, -24, S(slab(cx - 0.9, cx + 0.9, -27, -21, 1.2, 1.6, 2, 0, 0.3), { tone: "lo" }));
  }
  return list;
}

// The day clock: a dial on a pedestal, 0-4 days.
function gauge() {
  const out = [];
  const ped = { x: D.x - 9, y: D.y - 8, w: 18, d: 16, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 4, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 2.6), 4, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3).map(([x, y]) => at([x, y, 4])), { size: 0.45 }));
  out.push(S(k.cylinder(D.x, D.y, 3, 4, 2, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(D.x, D.y, 2.2, 6, D.z - 6, P, 20), { tone: "mid", crease: "none", inner: L(k.sideArc(D.x, D.y, 2.2, 10, P, 14), { tone: "faint" }) }));
  const top = D.z + D.h;
  out.push(S(k.cylinder(D.x, D.y, D.r, D.z, D.h, P, 64, 0.7), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(D.x, D.y, D.r, top - 2.4, top, 46, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(D.x, D.y, D.r, top - 2.4, P, 36), { tone: "faint" }));
  out.push(L(k.ring(D.x, D.y, D.r - 1.6, top, P, 64), { tone: "lo" }));
  const t = k.radialTicks(D.x, D.y, D.r - 1.6, 16, 4, top, [1, 2.2], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, D, 0, MODEL.days)}" style="stroke-width:1"/>`);
  out.push(L(k.ring(D.x, D.y, 1.2, top, P, 14), { tone: "mid" }));
  return out.join("");
}

const STATICS = [...statics(), { key: key(D.x, D.y), svg: `<g data-part="gauge">${gauge()}</g>` }];

const START = { t: 0, r: 0.5, reserves: false };
const stateFor = (t, r, reserves) => ({ ...stateAt(t, r, reserves), targets: MODEL.targets });
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "omg-svg",
  label: "A bench model of a Soviet operational maneuver group. A wall with a gate stands across a rail lane. Two wedge carriages, the first echelon, drive into the wall beside the gate and the gate drops. Behind the wall a lit shuttle, the OMG, sits cocked against two coil springs, held by a latch pin. Pulling the pin fires it through the breach and down the lane into the enemy rear, where a finger on the shuttle knocks down four drop targets. A block standing for the enemy's operational reserve can slide across the lane and stop it. A parked carriage on a siding is the second echelon, not yet committed. A dial counts days.",
  body: [plate(), ruler(), track(), `<g data-part="live">${scene(k, P, { ...stateFor(0, START.r, START.reserves), statics: STATICS })}</g>`],
});

const CAPTION = "The U.S. Army’s 1984 manual on Soviet tactics (FM 100-2-1) describes the OMG as a tailored high-speed exploitation force “designed to move deep into the enemy rear area and to seize critical objectives, normally before second echelon Soviet formations are committed to combat.” Speeds, days and the reserve’s timing on this bench are notional.";

// ---- Battlefield view: the same state on full-bleed terrain at operational scale (kit/terrain.mjs) ----
// The viewBox has the card's shape and is shown with "slice", so the ground fills the card at every
// width. Layout in field-scene.mjs is screen-aligned for this azimuth.
const FW = 640, FH = 400;   // the plate's shape (taller than the bench's viewBox), so "slice" crops little
const FA = 55, FE = 42;
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const PF = k.fitProjection(groundRect(-8, -8, 206, 206 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const POSE0 = fieldPose({ t: 0, r: START.r, reserves: START.reserves }, GEO, TF);
const unitSvg = (u) => u.kind === "t" || u.kind === "truck" ? omTruck(k, PF, trFaceStep(u.face)) : u.kind === "b" ? omBmp(k, PF, trFaceStep(u.face))
  : u.kind && u.kind !== "v" ? omPiece(k, PF, u.kind, trFaceStep(u.face)) : trVehicle(k, PF, trFaceStep(u.face));
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "omg-field",
  label: "The same idea on a battlefield at operational scale, each small vehicle standing for a battalion. A road runs left to right through a NATO forward defense of blue battalions dug in on a line of low hills and woods. Two red Soviet first-echelon divisions close on the line either side of the road behind a smoke screen; the two blue battalions astride the road are knocked out, greyed and smoking, one red battalion in each division is stopped short, and the rest push in to hold the shoulders of the breach while an ambulance runs back to the rear. Behind the line wait the lit red OMG, twelve battalions of tanks and BMP infantry fighting vehicles, and the red second echelon, parked. On release the OMG forms a march column, drives through the breach and east over a river bridge into the NATO rear, where a battalion detached from the head of the column raids each of four targets in turn: an air-defense site, a command post, a missile launcher and a supply depot, which grey and smoke. With a large reserve switched on, two blue brigades drive down from the north to the road: a late release meets them across the road and the column is stopped in a fight with losses on both sides; an early release gets past, and the reserve closes the road behind it. Sizes, distances, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg omg-field"', 'class="iso-svg omg-field" preserveAspectRatio="xMidYMid slice"');

const LABELS = {
  machine: "OMG bench. Left and right arrow keys change the release day; R toggles the enemy reserve; Enter replays; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys change the release day; R toggles the NATO reserve; Enter replays; V switches to the Machine view.",
};
const FIELD_CAPTION = "FM 100-2-1 (1984) says the OMG could attack targets en route “with its entire force or more likely with units detached for this purpose.” Unit sizes, distances, timings and losses in this view are notional.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "The OMG: tanks and BMPs, released through the breach" },
    { mark: "red", label: "Soviet first echelon (at the line) and second echelon (parked)" },
    { mark: "blue", label: "NATO line, rear targets and reserve; greyed = knocked out" },
  ], caption: FIELD_CAPTION, body: "",
}));

const card = k.plateHtml({
  fig: "Fig 26",
  title: "Operational maneuver group",
  hint: "Hover scrubs · click replays",
  readout: "",
  keys: [
    { mark: "lit", label: "OMG: the spring-loaded shuttle, held behind the line" },
    { mark: "raised", label: "First echelon wedges, the gate (breach), drop targets in the rear" },
    { mark: "edge", label: "Enemy reserve block; second echelon parked on its siding" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage omg-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="${MODEL.release[0]}" aria-valuemax="${MODEL.release[1]}" aria-valuenow="${START.r}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="omg-legend omg-legend-machine">${m}</div><div class="omg-legend omg-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, D, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
const STATICS = ${JSON.stringify(STATICS.filter((s) => !s.svg.includes('data-part="gauge"')))};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "").replace(/^const xOf = [^\n]*\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, D, START, LABELS } = DATA;
const GEO = DATA.GEO;
const xOf = (km) => km * GEO.U;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, cylinder, knurl, slabOf, sideSeam, sideRing, sideArc, ring, lineOnTop, onTop, haloOf, segment, coil, planOutline, insetPlan, corners, radialTicks };
const root = document.querySelector(".omg-figure");
const stage = root.querySelector(".omg-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector('[data-part="live"]');
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const readout = root.querySelector("[data-readout]");
const resBtn = root.querySelector("#omg-res");
const playBtn = root.querySelector("#omg-play");
const slider = root.querySelector("#omg-release");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const fieldSvgEl = stage.querySelector(".omg-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const TF = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "";
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
const HINTS = { machine: "Hover scrubs · click replays", field: "Hover scrubs · click replays" };
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const GAUGE = { key: keyOf(K, P, D.x, D.y), svg: gaugeEl.outerHTML };
gaugeEl.remove();
const ALL = [...STATICS, GAUGE];
const SPD = 1 / 2.4;  // days per second of animation
const S = { t: 0, shown: 0, r: START.r, reserves: START.reserves };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0, scrub = false, frozen = false;
// Tour: a shallow defense with an early release (deep raid), then a large reserve with a late release (blocked).
const TOUR = [[0, 0.5, false], [6.2, 1.0, true]];
const TOUR_LEN = 13;
function tourAt(c) {
  c %= TOUR_LEN;
  let step = TOUR[0];
  for (const row of TOUR) if (c >= row[0]) step = row;
  return { r: step[1], reserves: step[2], t: Math.max(0, (c - step[0] - 0.4) * SPD) };
}
function setReserves(on) {
  S.reserves = on;
  resBtn.setAttribute("aria-pressed", String(on));
  resBtn.textContent = view === "field" ? (on ? "NATO has a large reserve" : "Shallow defense, no large reserve") : (on ? "Enemy has a large reserve" : "Shallow defense, no large reserve");
}
const runEnd = () => Math.min(MODEL.days, endOf(S.r, S.reserves) + 0.25);
// Battlefield frame: units move by translate and re-render only when their look (side, kind, 15° facing
// step) changes; the fire layer writes attributes only; the fire sectors redraw only when they change.
const unitLook = (u, f) => u.kind === "t" || u.kind === "truck" ? omTruck(K, PF, f) : u.kind === "b" ? omBmp(K, PF, f)
  : u.kind && u.kind !== "v" ? omPiece(K, PF, u.kind, f) : trVehicle(K, PF, f);
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF, { smoke: 80 }); }
  const pose = fieldPose({ t: S.shown, r: S.r, reserves: S.reserves }, GEO, TF, FM);
  stageF.put(pose.units.map((u) => {
    const f = trFaceStep(u.face), look = u.side + "|" + (u.kind || "v") + "|" + f;
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, unitLook(u, f)); return LOOKS.get(look); } };
  }));
  const sig = pose.units.filter((u) => u.id[0] === "n").map((u) => u.ko ? 1 : 0).join("") + "|" + pose.st.gate.toFixed(2) + "|" + pose.res.toFixed(2);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, pose); marksSig = sig; }
  const tt = still.matches ? 4.37 : FM.t, shots = trShots(pose.streams, tt);
  shots.smoke = fieldSmoke(pose, tt).concat(shots.smoke);
  fire.draw(shots);
}
function draw() {
  if (view === "field") drawField();
  else {
    const st = stateAt(S.shown, S.r, S.reserves);
    layer.innerHTML = scene(K, P, { ...st, targets: MODEL.targets, statics: ALL });
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, D, S.shown, MODEL.days));
  }
  const text = view === "field" ? fieldReadoutOf(S.shown, S.r, S.reserves) : readoutOf(S.shown, S.r, S.reserves);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", S.r.toFixed(1));
  stage.setAttribute("aria-valuetext", "Release day " + S.r.toFixed(1) + ". " + text);
  if (document.activeElement !== slider) slider.value = S.r.toFixed(1);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (still.matches) {
    S.t = S.shown = runEnd();
  } else if (touring) {
    clock += dt;
    const step = tourAt(clock);
    if (step.reserves !== S.reserves) setReserves(step.reserves);
    S.r = step.r;
    S.t = S.shown = Math.min(step.t, runEnd());
  } else if (frozen) {
    S.shown = S.t;
  } else if (scrub) {
    S.shown += (S.t - S.shown) * (1 - Math.exp(-dt / 0.12));
  } else {
    S.t = Math.min(runEnd(), S.t + dt * SPD);
    S.shown = S.t;
  }
  FM.t += dt;
  draw();
  const settled = !touring && (still.matches || frozen || (scrub ? Math.abs(S.t - S.shown) < 0.002 : S.t >= runEnd()));
  // the battlefield keeps firing while it is on screen and motion is allowed; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !still.matches)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  frozen = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; scrub = false; run(); }, 10000);
  run();
};
const replay = () => { scrub = false; S.t = S.shown = 0; hold(); };
const setRelease = (r) => {
  S.r = Math.round(Math.min(MODEL.release[1], Math.max(MODEL.release[0], r)) * 10) / 10;
  replay();
};
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const box = svg.getBoundingClientRect();
  const f = Math.min(1, Math.max(0, (event.clientX - box.left - box.width * 0.08) / (box.width * 0.84)));
  scrub = true;
  S.t = f * runEnd();
  hold();
});
stage.addEventListener("pointerleave", () => { if (scrub) { scrub = false; S.t = S.shown; hold(); } });
stage.addEventListener("click", replay);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") setRelease(S.r - 0.1);
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") setRelease(S.r + 0.1);
  else if (event.key === "r" || event.key === "R") { setReserves(!S.reserves); replay(); }
  else if (event.key === "Enter" || event.key === " ") replay();
  else if (event.key === "v" || event.key === "V") { setView(view === "field" ? "machine" : "field", true); event.preventDefault(); return; }
  else return;
  event.preventDefault();
});
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  setReserves(S.reserves);
  draw();
  run();
}
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
resBtn.addEventListener("click", () => { setReserves(!S.reserves); replay(); });
playBtn.addEventListener("click", replay);
slider.addEventListener("input", () => setRelease(Number(slider.value)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setReserves(S.reserves);
if (still.matches) S.t = S.shown = runEnd();
setView(view, false);
window.__omg = { S, setReserves, setRelease, replay, setView, view: () => view, at: (t) => { touring = false; scrub = false; frozen = true; clearTimeout(idle); S.t = S.shown = t; draw(); }, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
console.log("latest release that beats the reserve: day", latestRelease().toFixed(3));
for (const [t, r, res] of [[0.3, 0.5, false], [1.3, 0.5, false], [2.3, 0.5, false], [2.0, 1.0, true]]) console.log(readoutOf(t, r, res), "|", fieldReadoutOf(t, r, res));
console.log("field: static items", FIELD.items.length, "units", POSE0.units.length, "paths", (fieldSvg.match(/<path/g) || []).length);
console.log("end day (0.5, shallow)", endOf(0.5, false).toFixed(2), "statics", STATICS.length, "wrote index.html", PAGE.length, "bytes");
