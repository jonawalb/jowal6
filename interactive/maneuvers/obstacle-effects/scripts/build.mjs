// Builds interactive/maneuvers/obstacle-effects/index.html: a flow table with four baffles, each held up
// by a fire jet (the machine), and an enemy company column meeting four obstacle groups with and without
// fires (the battlefield), made with the Anatomy kit (../../kit, MIT).
// Run: node interactive/maneuvers/obstacle-effects/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, KEYS, NAMES, planFor, poseAt, tally } from "./model.mjs";
import { MG, machineStatic, machineDyn } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, FW as FWC } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

// ---- Machine ----
const WIDTH = 640, HEIGHT = 360;
const BED = MG.BED, PLATE = { x: BED.x - 8, y: BED.y - 8, w: BED.w + 16, d: BED.d + 16, r: 9 };
const PLATE_H = 10, FOOT_H = 5;
const P = k.fitProjection([...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, 0, 40]], WIDTH, HEIGHT, { pad: 14, azimuth: 62, elevation: 36 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 14))) {
    out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 8);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // a ruler strip along the front edge: ticks every 4, a major every 5th
  const RUL = { x: PLATE.x + 40, y: PLATE.y + PLATE.d - 12, w: 90, d: 5, r: 1 };
  out.push(S(k.slabOf(RUL, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RUL.x + 4, RUL.x + RUL.w - 4, 4, 5, RUL.y, 0.8, [1.6, 3], P, "x");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // label plate with three rule lines standing for print
  const LAB = { x: PLATE.x + PLATE.w - 40, y: PLATE.y + PLATE.d - 20, w: 30, d: 14, r: 1.5 };
  out.push(S(k.slabOf(LAB, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LAB, 1.6), 0.8, P), { tone: "faint" }));
  [[20, 4], [14, 7.4], [17, 10.8]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LAB.x + 5, LAB.y + dy], [LAB.x + 5 + len, LAB.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LAB.x + 2.6, LAB.y + 2.6, 0.8]), at([LAB.x + LAB.w - 2.6, LAB.y + LAB.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

const COV0 = { D: true, T: true, F: true, B: true };
const PLAN0 = planFor(COV0);
const men0 = PLAN0.v.map((x) => poseAt(PLAN0, x.i, 0));
const V0 = { c: { D: 1, T: 1, F: 1, B: 1 }, men: men0 };
const machineItems = [...machineStatic(k, P), ...machineDyn(k, P, V0).map((i) => ({ key: i.key, svg: i.svg, dyn: true }))];
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT, className: "oe-svg",
  label: "A bench model of obstacles and fires. A flow table has a long channel, avenue A, running left to right with a branch, B, leaving it toward the viewer. A hopper at the left end feeds a column of eight balls, two abreast. Four baffles stand in the channels: a row of pins across the near half of avenue A (disrupt), a hinged vane across avenue A that sends the flow into the branch (turn), a pocket of staggered lips in the branch (fix) and a gate across the end of the branch (block). Beside each baffle a nozzle post holds a fine jet on it; while the jet is on, the baffle stands up and works. Switch a jet off and its baffle drops flat, and the balls simply roll over or through it. Catch troughs at the ends of both channels collect the balls that get through. Speeds, counts and losses are notional.",
  body: [plate(), `<g data-part="live">${fdStatic(machineItems)}</g>`],
});

// ---- Battlefield: the same run on full-bleed terrain at company scale (kit/terrain.mjs) ----
const FW = 640, FH = 420;
const ZOOM = 0.9, CEN = [40, 40];
const PF = k.fitProjection([[54, -169], [212.5, 57.4], [-18.5, 219], [-177, -7.2]].map(([x, y]) => [CEN[0] + ZOOM * (x - CEN[0]), CEN[1] + ZOOM * (y - CEN[1]), 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const S0 = { plan: PLAN0, t: 0, c: { D: 1, T: 1, F: 1, B: 1 }, cov: COV0 };
const POSE0 = fieldPose(S0, T);
const unitSvg = (m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  const inner = m.kind === "veh" ? trVehicle(k, PF, trFaceStep(m.face)) : trSoldier(k, PF, { ...m, face: trFaceStep(m.face) });
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${inner}</g>` };
};
const unitItems = [...POSE0.men, ...POSE0.veh].map(unitSvg);
const fieldSvg = k.figureSvg({
  width: FW, height: FH, className: "oe-field",
  label: "The same idea on a battlefield. A red company-sized column of eight tracked vehicles, two abreast, drives from the left edge along a broad avenue. Four obstacle groups lie across its way, each with friendly fighting positions overwatching it, and a fire fan on the ground shows the fires that cover it. First a belt of wire and mines across the near half of the avenue, the disrupt group: half the column is slowed, the other half drives on. Then a ditch, wire and mines in a diagonal line anchored on a wooded hill, the turn group, which pushes the column off the avenue onto a branch that runs into an open engagement area. There a fix group of staggered wire belts and a minefield slows it. At the end of the branch a block group of ditch, teeth and wire spans the corridor and stops it. Blue positions on three rises and a hill fire on the vehicles that meet a covered group and mortar rounds burst on the obstacles. Turn a group's fires off and the column breaches or bypasses its obstacles unopposed. Vehicles put out of action are greyed and smoke; friendly men down lie greyed near a collection point. Sizes, ranges, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, S0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="bursts" class="oe-bursts"></g><g data-part="fire" class="tr-fire"></g><g data-part="tags" class="oe-tags"></g>`],
}).replace('class="iso-svg oe-field"', 'class="iso-svg oe-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "FM 3-90 (2023, para. 17-21): obstacle effects occur because of the combined effects of fires and obstacles, rather than from obstacles alone. Here each baffle works only while its jet holds it. The column, the times and the losses are notional.";
const LABELS = {
  machine: "Obstacle and fire flow table. Keys 1 to 4 switch the fires on the disrupt, turn, fix and block baffles; F or the button sends the column again; V switches to the Battlefield view.",
  field: "Battlefield. Keys 1 to 4 switch the fires on the disrupt, turn, fix and block groups; F or the button sends the column again; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 39",
  title: "Obstacles and fires",
  hint: "Click to run · 1 2 3 4 fires",
  readout: "",
  keys: [
    { mark: "lit", label: "Balls: the enemy column the baffles shape" },
    { mark: "raised", label: "Baffles: pins (disrupt), vane (turn), lips (fix), gate (block)" },
    { mark: "edge", label: "Nozzle posts: the fire jet that holds each baffle up" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage oe-stage" tabindex="0" role="application" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = "FM 3-90 (2023, para. 17-21): obstacle effects occur because of the combined effects of fires and obstacles, rather than from obstacles alone. Unit sizes, distances, timings and losses are notional, not data.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Enemy company column (eight vehicles, notional)" },
    { mark: "blue", label: "Friendly positions; fire fans mark the fires on each group" },
    { mark: "red", label: "Vehicles put out of action stay greyed where they stopped" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="oe-legend oe-legend-machine">${m}</div><div class="oe-legend oe-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, LABELS, FWC };
const live = readFileSync(join(HERE, "live.js"), "utf8");
const runtime = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
${live}`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + runtime).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (let b = 15; b >= 0; b--) {
  const cov = { D: !!(b & 8), T: !!(b & 4), F: !!(b & 2), B: !!(b & 1) };
  const p = planFor(cov), t = tally(p, p.tDone + 1);
  console.log(KEYS.map((x) => (cov[x] ? x : "-")).join(""), `${p.tDone.toFixed(1)} min`, `through ${t.through} held ${t.held} out ${t.red} · ${t.blue} vs ${t.red} down`);
}
console.log("men", POSE0.men.length, "vehicles", POSE0.veh.length, "wrote index.html", PAGE.length, "bytes");
