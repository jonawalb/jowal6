// Builds interactive/maneuvers/recon-pull/index.html: an isometric marble-run bench for
// reconnaissance pull versus reconnaissance push, made with the Anatomy kit (../../kit, MIT).
// Run: node interactive/maneuvers/recon-pull/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, LAYOUTS, plan, firstThrough, allThrough, stallAt, status, scoutAt, divertAt, marbleAt, readoutOf, downAt } from "./model.mjs";
import { GEO, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;
const M = MODEL;

const PLATE = { x: -148, y: -96, w: 244, d: 154, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const BOARD = { x: -136, y: -36, w: 218, d: 86, r: 3 };
const BZ = GEO.BOARD_Z;
const TRAY = { x: -72, y: -88, w: 144, d: 48 };
const DIAL = { x: -118, y: -60, r: 15, z: 22, h: 7 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: -100, y: -88, w: 22, d: 16, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.WALL_X[0], -40, 24], [GEO.WALL_X[1], -40, 24], [DIAL.x, DIAL.y, DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 55 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const box = (x0, x1, y0, y1, z0, h, bevel = 0) => k.extrude([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, h, P, { bevel });

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -6, P, 8), { tone: "faint" }) }));
  out.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[13, 4.6], [9, 8], [11, 11.4]].forEach(([len, dy]) => out.push(Ln(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The collecting tray behind the wall: the positions the main body is pulled toward.
function tray() {
  const out = [];
  const { x, y, w, d } = TRAY;
  out.push(S(box(x, x + w, y, y + d, 0, 1.5, 0.3), { tone: "lo", crease: "none" }));
  out.push(Ln(k.planOutline(k.insetPlan({ x, y, w, d, r: 0 }, 4), 1.5, P, 2), { tone: "faint" }));
  out.push(S(box(x, x + w, y, y + 3, 0, 6, 0.4), { tone: "mid" }));
  out.push(Dt([x + 8, x + w / 2, x + w - 8].map((px) => at([px, y + 1.5, 6])), { size: 0.42 }));
  out.push(S(box(x, x + 3, y + 3, y + d, 0, 6, 0.4), { tone: "mid" }));
  // drop marks: where each lane lands in the tray
  for (const lx of M.lanes) out.push(Ln(k.ring(lx, -66.7, 12.2, 1.5, P, 32), { tone: "faint" }));
  return out.join("");
}
// Right tray wall: in front of the tray marbles, so it is a sorted static.
const TRAY_KEY = k.depthOf([TRAY.x + TRAY.w - 1.5, TRAY.y + TRAY.d / 2, 0], P);
const TRAY_RIGHT = { key: TRAY_KEY, svg: `<g data-part="tray-right" data-key="${TRAY_KEY}">${S(box(TRAY.x + TRAY.w - 3, TRAY.x + TRAY.w, TRAY.y + 3, TRAY.y + TRAY.d, 0, 6, 0.4), { tone: "mid" })}</g>` };

// The track board: magazine, feeder and five lanes cut as grooves; sills under each opening.
function board() {
  const out = [];
  // an L-shaped board: the queue arm at front left, the lane field behind it
  const yQ = M.feedY - 12, xF = M.lanes[0] - 12;
  const ringL = [[BOARD.x, yQ], [xF, yQ], [xF, BOARD.y], [BOARD.x + BOARD.w, BOARD.y], [BOARD.x + BOARD.w, BOARD.y + BOARD.d], [BOARD.x, BOARD.y + BOARD.d]];
  out.push(`<path class="iso-halo" d="${k.extrude(ringL, 0, 0.1, P, { convex: false }).fill}" style="filter:blur(3px)"/>`);
  out.push(S(k.extrude(ringL, 0, BZ, P, { convex: false, bevel: 0.5 }), { tone: "mid" }));
  const bs = [[BOARD.x + 4, yQ + 4], [BOARD.x + 4, BOARD.y + BOARD.d - 4], [xF + 4, BOARD.y + 4], [BOARD.x + BOARD.w - 4, BOARD.y + 4], [BOARD.x + BOARD.w - 4, BOARD.y + BOARD.d - 4]];
  out.push(Ln(bs.map(([x, y]) => k.ring(x, y, 1.6, BZ, P, 14)).join(""), { tone: "lo" }));
  out.push(Dt(bs.map(([x, y]) => at([x, y, BZ])), { size: 0.45 }));
  // the groove network as one outline: feeder (with the queue behind the escapement) and five lanes
  const g = 4.4;
  const xL = M.magX - (M.n - 1) * M.D - M.r - 2, xR = M.lanes[4] + 10;
  const net = [[xL, M.feedY + g], [xR, M.feedY + g], [xR, M.feedY - g]];
  for (const lx of [...M.lanes].reverse()) net.push([lx + g, M.feedY - g], [lx + g, BOARD.y], [lx - g, BOARD.y], [lx - g, M.feedY - g]);
  net.push([xL, M.feedY - g]);
  out.push(`<path class="rp-groove" d="${k.onTop(net, BZ, P, true)}"/>`);
  // lane numbers as 1 to 5 short rules in front of each lane mouth
  M.lanes.forEach((x, i) => {
    for (let j = 0; j <= i; j++) {
      const tx = x - i * 0.9 + j * 1.8;
      out.push(Ln(k.lineOnTop([tx, M.feedY + g + 1.6], [tx, M.feedY + g + 4], BZ, P), { tone: "mid", free: true }));
    }
  });
  // sills under each gate opening, and the groove carried across them
  for (const x of M.lanes) out.push(S(box(x - GEO.HALF, x + GEO.HALF, GEO.WALL[0], GEO.WALL[1], 0, GEO.SILL, 0.2), { tone: "mid", crease: "none" }));
  // feeder end stop
  out.push(S(box(xR, xR + 3, M.feedY - 6, M.feedY + 6, BZ, 4.4, 0.3), { tone: "mid" }));
  out.push(Dt([at([xR + 1.5, M.feedY - 4, BZ + 4.4]), at([xR + 1.5, M.feedY + 4, BZ + 4.4])], { size: 0.4 }));
  // queue end stop behind the last waiting marble
  out.push(S(box(xL - 3, xL, M.feedY - 6, M.feedY + 6, BZ, 4.4, 0.3), { tone: "mid" }));
  out.push(Dt([at([xL - 1.5, M.feedY - 4, BZ + 4.4]), at([xL - 1.5, M.feedY + 4, BZ + 4.4])], { size: 0.4 }));
  // diverter rail with end stops
  const [r0, r1] = GEO.DIV_Y;
  out.push(S(k.slabOf({ x: -80, y: r0, w: 160, d: r1 - r0, r: 1 }, BZ, 2, P, 3, 0.3), { tone: "mid" }));
  out.push(Ln(k.lineOnTop([-80, (r0 + r1) / 2], [80, (r0 + r1) / 2], BZ + 2, P), { tone: "faint" }));
  for (const x of [-84, 80]) {
    out.push(S(box(x, x + 4, r0 - 3, r1 + 3, BZ, 6, 0.4), { tone: "mid" }));
    out.push(Dt([at([x + 2, r0 - 1, BZ + 6]), at([x + 2, r1 + 1, BZ + 6])], { size: 0.42 }));
  }
  // plan-peg strip: a socket at each lane and one parking socket
  const py = GEO.PEG_Y;
  out.push(S(k.slabOf({ x: -80, y: py - 4, w: 140, d: 8, r: 1.5 }, BZ, 1.2, P, 3, 0.3), { tone: "mid" }));
  for (const x of [GEO.PEG_PARK, ...M.lanes]) out.push(Ln(k.ring(x, py, 1.6, BZ + 1.2, P, 14), { tone: "lo" }));
  out.push(Ln(k.ring(GEO.PEG_PARK, py, 3.2, BZ + 1.2, P, 20), { tone: "faint" }));
  return out.join("");
}

// The stopwatch: seconds until the first marble of the main body is through a gate.
function gauge() {
  const out = [];
  const ped = { x: DIAL.x - 13, y: DIAL.y - 13, w: 26, d: 26, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(Ln(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5.6, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3.4, 7.4, DIAL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: Ln(k.sideArc(DIAL.x, DIAL.y, 3.4, 14, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(Ln(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 64, P, 0.3), { tone: "lo" }));
  out.push(Ln(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" }));
  out.push(Ln(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 20, 2, DIAL.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(Ln(t.minor, { tone: "lo" }), Ln(t.major, { tone: "mid" }));
  // crown and button on the far side
  out.push(S(k.cylinder(DIAL.x - 9, DIAL.y - 9, 1.8, DIAL.top, 2.4, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([DIAL.x - 3.4, DIAL.y + 7], DIAL.top, P, "x"), "SEC", { size: 2.2, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="hi" data-free="" d="${needle(k, P, DIAL, 0)}" style="stroke-width:1.1"/>`);
  out.push(Ln(k.ring(DIAL.x, DIAL.y, 1.5, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}
const GAUGE = { key: k.depthOf([DIAL.x, DIAL.y, 0], P), svg: `<g data-part="gauge">${gauge()}</g>` };

// ---- the state at rest: the first tour run, finished ----
const PLANNED = 2;
const TOUR = [
  { layout: 0, mode: "push", dur: 4.6 },
  { layout: 1, mode: "push", dur: 4.4 },
  { layout: 1, mode: "pull", dur: 6.4 },
];
function frameState(run, t) {
  const p = plan(run);
  return {
    shut: run.open.map((o) => (o ? 0 : 1)),
    scout: scoutAt(run, t, M, p),
    divX: divertAt(run, t, M, p),
    pegX: run.mode === "push" ? M.lanes[run.planned] : GEO.PEG_PARK,
    pegLift: 0,
    pawl: 0,
    marbles: Array.from({ length: M.n }, (_, i) => marbleAt(run, i, t, M, p)),
  };
}
const START_RUN = { mode: "pull", open: LAYOUTS[1], planned: PLANNED };
const START_T = 7;
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "rp-svg",
  label: "A bench marble run for reconnaissance pull and push. Seven marbles, the main body, wait in a magazine at the front left. A feeder groove carries them to five lanes that run back to a wall with five gates; some gates have a shutter raised (held by the enemy), some are open (gaps). Behind the wall is a collecting tray. A lit scout carriage rides along the wall top and drops a feeler at each gate. A diverter on a rail in front of the feeder chooses which lane the marbles turn into, and a plan peg can lock it. In pull mode the scout probes the gates first and the diverter follows it to the first gap; in push mode the peg locks the diverter to the planned lane and the marbles go at once. A stopwatch reads the seconds until the first marble is through.",
  body: [plate(), tray(), board(), `<g data-part="live">${scene(k, P, { ...frameState(START_RUN, START_T), statics: [GAUGE, TRAY_RIGHT] }, M)}</g>`],
});

// ---- Battlefield view: the same run on full-bleed terrain (kit/terrain.mjs) ----
// A scout team probes five crossings through a belt of woods that an enemy screen holds in part; a
// rifle company follows as the main body. The viewBox is the card's own shape, shown with "slice" so
// the ground fills the whole card at every width; a phone crops the sides. PF frames the visible
// ground rect (Fig 1's framing, re-centred on FG.VIEW and zoomed).
const FW = 640, FH = 420;
const VCU = FG.VIEW.u, VCV = FG.VIEW.v, FA = FG.ANG * Math.PI / 180;
const VC = [FG.O[0] + VCU * Math.cos(FA) - VCV * Math.sin(FA), FG.O[1] + VCU * Math.sin(FA) + VCV * Math.cos(FA)];
const PF = k.fitProjection([[54, -169], [212.5, 57.4], [-18.5, 219], [-177, -7.2]].map(([x, y]) => [VC[0] + (x - 17.75) / FG.VIEW.zoom, VC[1] + (y - 25.05) / FG.VIEW.zoom, 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const FS0 = { run: START_RUN, t: START_T };
const POSE0 = fieldPose(FS0, plan(START_RUN), TF);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "rp-field",
  label: "The same idea on a battlefield. Across the middle, a belt of woods screens the enemy side; five farm tracks run up through it, and at the near end of each track there is a fighting position. Red enemy teams man some of them (the held crossings), each with its fire sector marked on the ground; the others are empty (gaps). Along the front of the woods a lit blue scout team moves from crossing to crossing: at a held one it draws fire, goes to ground and pulls back; at a gap it goes through and waits on the far side. A blue rifle company, the main body, comes up the road at the bottom and along the lateral road, then turns up one track. Under recon pull it waits until the scouts find a gap and then follows them through it; under recon push it takes the planned track at once, chalked on the ground, and if that crossing is held it stops in front of it, the leading groups prone and firing. Greyed figures lying still are men down on both sides; a medic runs to the first friendly casualty. Sizes, ranges, timings and casualty counts are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, FS0, plan(START_RUN))}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg rp-field"', 'class="iso-svg rp-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "FM 3-90 (2023) gives two reconnaissance techniques. Reconnaissance pull finds “where the enemy is strong and weak, and where gaps exist, thus pulling the main body toward and along the path of least resistance”; reconnaissance push refines the picture so the commander can finalize a plan already chosen. Timings on the bench are notional.";

const LABELS = {
  machine: "Recon pull bench. Space or Enter swaps pull and push; keys 1 to 5 open or shut a gate; left and right arrows move the planned lane; N gives a new enemy layout; R runs again; V switches to the Battlefield view.",
  field: "Battlefield. Space or Enter swaps pull and push; keys 1 to 5 man or clear a crossing; left and right arrows move the planned track; N gives a new enemy layout; R runs again; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 19",
  title: "Recon pull",
  hint: "Click gates · space: mode",
  readout: readoutOf(START_RUN, START_T),
  keys: [
    { mark: "lit", label: "Scout carriage: reconnaissance probing the gates" },
    { mark: "raised", label: "Marbles: the main body; shutters: enemy strength" },
    { mark: "edge", label: "Stopwatch: seconds until the main body is through" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage rp-stage" tabindex="0" role="group" aria-label="${LABELS.machine}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("Timings on the bench are notional.", "Unit sizes, ranges, timings and casualty counts here are notional.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Scouts: a scout team probing the crossings (lit)" },
    { mark: "blue", label: "Main body: a rifle company in seven groups" },
    { mark: "red", label: "Enemy screen: teams at the held crossings" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="rp-legend rp-legend-machine">${m}</div><div class="rp-legend rp-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL: M, LAYOUTS, DIAL, TOUR, PLANNED, START_T, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
const MODEL = DATA.MODEL, LAYOUTS = DATA.LAYOUTS;
${strip("model.mjs").replace(/^const MODEL = [\s\S]*?\n};\n/m, "").replace(/^const LAYOUTS = [\s\S]*?\n\];\n/m, "")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, TOUR, PLANNED, LABELS } = DATA;
const GEO = DATA.GEO, M = MODEL;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, segment };
const root = document.querySelector(".rp-figure");
const stage = root.querySelector(".rp-stage");
const svg = stage.querySelector("svg");
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
const gaugeEl = svg.querySelector('[data-part="gauge"]');
const readout = root.querySelector("[data-readout]");
const pullBtn = root.querySelector("#rp-pull");
const pushBtn = root.querySelector("#rp-push");
const layoutBtn = root.querySelector("#rp-layout");
const againBtn = root.querySelector("#rp-again");
const slider = root.querySelector("#rp-plan");
const fieldSvgEl = stage.querySelector(".rp-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const TF = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0 };
let stageF = null, fire = null, marksSig = "";
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Click gates · space: mode", field: "Click crossings · space: mode" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const GAUGE = { key: depthOf([DIAL.x, DIAL.y, 0], P), svg: gaugeEl.outerHTML };
gaugeEl.remove();
const trayRight = svg.querySelector('[data-part="tray-right"]');
const TRAY_RIGHT = { key: Number(trayRight.dataset.key), svg: trayRight.outerHTML };
const S = {
  run: { mode: TOUR[0].mode, open: [...LAYOUTS[TOUR[0].layout]], planned: PLANNED },
  layout: TOUR[0].layout, t: 0, shut: LAYOUTS[TOUR[0].layout].map((o) => (o ? 0 : 1)),
  pegX: M.lanes[PLANNED], pegLift: 0, pawl: 0, alpha: 1, prev: [], prevAlpha: 0,
};
let p = plan(S.run);
let touring = !still.matches, tourAt = 0, tourClock = 0, last = 0, frame = 0, visible = false, idle = 0;
const marblesAt = (t) => Array.from({ length: M.n }, (_, i) => marbleAt(S.run, i, t, M, p));
const doneAt = () => (Number.isFinite(firstThrough(S.run, M, p)) ? runEnd(S.run, M, p) + 0.3 : 10.2);
function restart(run) {
  S.prev = marblesAt(S.t);
  S.prevAlpha = S.alpha;
  S.alpha = 0;
  S.run = run;
  p = plan(run);
  S.t = 0;
  syncControls();
  if (still.matches) S.t = doneAt();
}
function syncControls() {
  pullBtn.setAttribute("aria-pressed", String(S.run.mode === "pull"));
  pushBtn.setAttribute("aria-pressed", String(S.run.mode === "push"));
  if (document.activeElement !== slider) slider.value = String(S.run.planned + 1);
}
// Battlefield frame: soldiers move by translate and re-render only when their look changes; the
// fire layer writes attributes only; the fire sectors and the chalked route redraw only on change.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const FS = { run: S.run, t: S.t, shut: S.shut };
  const pose = fieldPose(FS, p, TF);
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = S.shut.map((v) => v.toFixed(2)).join(",") + "|" + routeLane(FS, p);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, FS, p); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  const t = S.t;
  const text = readoutOf(S.run, t, M, p);
  if (readout.textContent !== text) readout.textContent = text;
  if (view === "field") { drawField(); return; }
  const st = {
    shut: S.shut, scout: scoutAt(S.run, t, M, p), divX: divertAt(S.run, t, M, p),
    pegX: S.pegX, pegLift: S.pegLift, pawl: S.pawl,
    marbles: marblesAt(t), alpha: S.alpha, prev: S.prev, prevAlpha: S.prevAlpha,
    statics: [GAUGE, TRAY_RIGHT],
  };
  patchLive(layer, scene(K, P, { ...st, items: true }, M));
  const n = layer.querySelector('[data-part="needle"]');
  if (n) n.setAttribute("d", needle(K, P, DIAL, Math.min(t, firstThrough(S.run, M, p))));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    tourClock += dt;
    if (tourClock >= TOUR[tourAt].dur) {
      tourClock = 0;
      tourAt = (tourAt + 1) % TOUR.length;
      const step = TOUR[tourAt];
      S.layout = step.layout;
      restart({ mode: step.mode, open: [...LAYOUTS[step.layout]], planned: PLANNED });
    }
  }
  const ease = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  S.t = calm ? doneAt() : S.t + dt;
  S.alpha = ease(S.alpha, 1, 0.15);
  S.prevAlpha = ease(S.prevAlpha, 0, 0.12);
  if (S.prevAlpha < 0.02) S.prevAlpha = 0;
  S.shut = S.shut.map((v, i) => ease(v, S.run.open[i] ? 0 : 1, 0.18));
  const pegTo = S.run.mode === "push" ? M.lanes[S.run.planned] : GEO.PEG_PARK;
  const gap = Math.abs(S.pegX - pegTo);
  S.pegLift = ease(S.pegLift, gap > 0.5 ? 5 : 0, 0.1);
  if (S.pegLift > 4 || calm) S.pegX = ease(S.pegX, pegTo, 0.3);
  const rel = p.release;
  const open = S.t >= rel - 0.15 && S.t <= rel + (M.n - 1) * M.gap + M.D / M.v + 0.2;
  S.pawl = ease(S.pawl, open ? 1 : 0, 0.08);
  FM.t += dt;
  draw();
  const settled = !touring && S.t > doneAt() && S.prevAlpha === 0 && S.alpha > 0.995 &&
    S.shut.every((v, i) => Math.abs(v - (S.run.open[i] ? 0 : 1)) < 0.002) && Math.abs(S.pegX - pegTo) < 0.01 && S.pegLift < 0.01 && S.pawl < 0.01;
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => {
    if (still.matches) return;
    touring = true; tourAt = 0; tourClock = 0;
    S.layout = TOUR[0].layout;
    restart({ mode: TOUR[0].mode, open: [...LAYOUTS[TOUR[0].layout]], planned: PLANNED });
    run();
  }, 9000);
  run();
};
const setMode = (mode) => { restart({ ...S.run, open: [...S.run.open], mode }); hold(); };
const toggleGate = (i) => { const open = [...S.run.open]; open[i] = !open[i]; restart({ ...S.run, open }); hold(); };
const setPlanned = (i) => { restart({ ...S.run, open: [...S.run.open], planned: Math.max(0, Math.min(4, i)) }); hold(); };
const nextLayout = () => { S.layout = (S.layout + 1) % LAYOUTS.length; restart({ ...S.run, open: [...LAYOUTS[S.layout]] }); hold(); };
function planeAt(event, z) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const q = pt.matrixTransform(svg.getScreenCTM().inverse());
  const a = P.azimuth * Math.PI / 180, e = (P.elevation ?? 30) * Math.PI / 180;
  const kk = P.scale * Math.sqrt(1.6);
  const u = (q.x - P.origin[0]) / kk, v = (q.y - P.origin[1] + z * Math.cos(e) * kk) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
// Battlefield: the ground point under the pointer, in the field's (u, v) frame.
function fieldUVAt(event) {
  const pt = fieldSvgEl.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const q = pt.matrixTransform(fieldSvgEl.getScreenCTM().inverse());
  const a = PF.azimuth * Math.PI / 180, e = (PF.elevation ?? 30) * Math.PI / 180;
  const kk = PF.scale * Math.sqrt(1.6);
  const u = (q.x - PF.origin[0]) / kk, v = (q.y - PF.origin[1]) / (kk * Math.sin(e));
  const x = u * Math.sin(a) + v * Math.cos(a), y = -u * Math.cos(a) + v * Math.sin(a);
  const [x0, y0] = W(0, 0), c = Math.cos(FG.ANG * Math.PI / 180), s = Math.sin(FG.ANG * Math.PI / 180);
  return [(x - x0) * c + (y - y0) * s, -(x - x0) * s + (y - y0) * c];
}
stage.addEventListener("click", (event) => {
  if (view === "field") {
    const [fu, fv] = fieldUVAt(event);
    let best = -1, bestD = 16;
    M.lanes.forEach((_, i) => { const d = Math.hypot((fu - FG.H_U) * 0.5, fv - laneV(i)); if (d < bestD) { bestD = d; best = i; } });
    if (best >= 0) toggleGate(best); else setMode(S.run.mode === "pull" ? "push" : "pull");
    return;
  }
  const [x, y] = planeAt(event, 8);
  let best = -1, bestD = 14;
  M.lanes.forEach((lx, i) => { const d = Math.hypot(x - lx, (y - M.gateY) * 0.8); if (d < bestD) { bestD = d; best = i; } });
  if (best >= 0) toggleGate(best);
  else setMode(S.run.mode === "pull" ? "push" : "pull");
});
stage.addEventListener("keydown", (event) => {
  const key = event.key;
  if (key === " " || key === "Enter") setMode(S.run.mode === "pull" ? "push" : "pull");
  else if (key >= "1" && key <= "5") toggleGate(Number(key) - 1);
  else if (key === "ArrowLeft" || key === "ArrowDown") setPlanned(S.run.planned - 1);
  else if (key === "ArrowRight" || key === "ArrowUp") setPlanned(S.run.planned + 1);
  else if (key === "n" || key === "N") nextLayout();
  else if (key === "r" || key === "R") { restart({ ...S.run, open: [...S.run.open] }); hold(); }
  else if (key === "v" || key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
pullBtn.addEventListener("click", () => setMode("pull"));
pushBtn.addEventListener("click", () => setMode("push"));
layoutBtn.addEventListener("click", nextLayout);
againBtn.addEventListener("click", () => { restart({ ...S.run, open: [...S.run.open] }); hold(); });
slider.addEventListener("input", () => setPlanned(Number(slider.value) - 1));
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
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { S.run = { mode: "pull", open: [...LAYOUTS[1]], planned: PLANNED }; S.layout = 1; p = plan(S.run); S.shut = S.run.open.map((o) => (o ? 0 : 1)); S.pegX = GEO.PEG_PARK; S.t = doneAt(); }
// Reset: back to the state the page opened in (run, layout, controls and idle tour); the view is kept.
function reset() {
  clearTimeout(idle);
  Object.assign(S, {
    run: { mode: TOUR[0].mode, open: [...LAYOUTS[TOUR[0].layout]], planned: PLANNED },
    layout: TOUR[0].layout, t: 0, shut: LAYOUTS[TOUR[0].layout].map((o) => (o ? 0 : 1)),
    pegX: M.lanes[PLANNED], pegLift: 0, pawl: 0, alpha: 1, prev: [], prevAlpha: 0,
  });
  p = plan(S.run);
  FM.t = 0;
  touring = !still.matches; tourAt = 0; tourClock = 0;
  if (still.matches) { S.run = { mode: "pull", open: [...LAYOUTS[1]], planned: PLANNED }; S.layout = 1; p = plan(S.run); S.shut = S.run.open.map((o) => (o ? 0 : 1)); S.pegX = GEO.PEG_PARK; S.t = doneAt(); }
  if (document.activeElement === slider) slider.blur();
  syncControls();
  draw(); run();
}
root.querySelector(".fd-reset").addEventListener("click", reset);
syncControls();
setView(view, false);
window.__reconPull = { S, setMode, toggleGate, setPlanned, nextLayout, setView, reset, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const [name, run] of [
  ["A push", { mode: "push", open: LAYOUTS[0], planned: PLANNED }],
  ["A pull", { mode: "pull", open: LAYOUTS[0], planned: PLANNED }],
  ["B push", { mode: "push", open: LAYOUTS[1], planned: PLANNED }],
  ["B pull", { mode: "pull", open: LAYOUTS[1], planned: PLANNED }],
]) console.log(name, "first", firstThrough(run).toFixed(2), "all", allThrough(run).toFixed(2), "stall", stallAt(run).toFixed(2), "|", readoutOf(run, 9));
console.log("field: men", POSE0.men.length, "static items", FIELD.items.length);
console.log("wrote index.html", PAGE.length, "bytes");
