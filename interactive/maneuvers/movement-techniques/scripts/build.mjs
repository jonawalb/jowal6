// Builds interactive/maneuvers/movement-techniques/index.html: twin rails with two carriages (the machine)
// and a rifle squad crossing open ground (the battlefield), made with the Anatomy kit (../../kit, MIT).
// Run: node interactive/maneuvers/movement-techniques/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, NAMES, TECH, speedShare, securityShare, supportSeconds, losses, OUTPOSTS } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, FW } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640, HEIGHT = 360;
const PLATE = { x: -150, y: -42, w: 300, d: 152, r: 10 };
const PLATE_H = 12, FOOT_H = 5;
const LABEL = { x: -144, y: 90, w: 28, d: 16, r: 1.5 };
const G = GEO;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, 0, 40], [G.TX, G.TY, 30], [-78, 82, 36]],
  WIDTH, HEIGHT, { pad: 14, azimuth: 66, elevation: 34 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const box = (x0, x1, y0, y1, z0, h, bevel = 0) => k.extrude([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, h, P, { bevel });

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
  return out.join("");
}

// Twin rails on beds with cross ties, detent holes for the brake pins, end stops, and the ruler strip.
function rails() {
  const out = [];
  const [x0, x1] = G.RAIL_X;
  // cross ties between the beds
  const ties = [];
  for (let x = x0 + 10; x <= x1 - 8; x += 22) ties.push(x);
  for (const x of ties) out.push(S(box(x - 3, x + 3, G.RAIL_Y[0] + 6, G.RAIL_Y[1] - 6, 0, 1, 0.2), { tone: "lo" }));
  for (const y of G.RAIL_Y) {
    out.push(S(k.slabOf({ x: x0 - 2, y: y - 6.5, w: x1 - x0 + 4, d: 13, r: 1.5 }, 0, 1, P, 3), { tone: "lo", crease: "none" }));
    out.push(S(box(x0, x1, y - 3, y + 3, 1, 2, 0.4), { tone: "mid" }));
    const holes = [];
    for (let x = x0 + 12; x <= x1 - 8; x += 8) holes.push(k.ring(x, y, 1.3, G.RAIL_TOP, P, 12));
    out.push(L(holes.join(""), { tone: "lo" }));
    out.push(Dt([at([x0 + 4, y, G.RAIL_TOP]), at([x1 - 4, y, G.RAIL_TOP])], { size: 0.42 }));
    for (const x of [x0 - 6, x1 + 0]) {
      out.push(S(box(x, x + 6, y - 8, y + 8, 0, 8, 0.4), { tone: "mid" }));
      out.push(Dt([at([x + 3, y - 5, 8]), at([x + 3, y + 5, 8])], { size: 0.42 }));
    }
  }
  // ruler strip along the near edge: ticks every 10, a major every 50; the PLD tab
  const R = G.RULER;
  out.push(S(k.slabOf(R, 0, 0.9, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(R, 0.9, P), { tone: "lo" }));
  const t = k.topTicks(R.x + 4, R.x + R.w - 4, 10, 5, R.y, 0.9, [1.6, 3], P, "x");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const px = G.xOf(128);
  out.push(S(box(px - 1, px + 1, R.y + 8, R.y + 11, 0, 6, 0.2), { tone: "hi", crease: "lo" }));
  out.push(Dt([at([px, R.y + 9.5, 6])], { size: 0.42 }));
  return out.join("");
}

// The selector dial that takes the leader's likelihood of contact, with the technique cuts engraved.
function dial() {
  const D = G.DIAL, out = [];
  const ped = { x: D.x - 14, y: D.y - 14, w: 28, d: 28, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(D.x, D.y, 5.6, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(D.x, D.y, 3.4, 7.4, D.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(D.x, D.y, 3.4, 14, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(D.x, D.y, D.r, D.z, D.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(D.x, D.y, D.r, D.top - 3.2, D.top, 70, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(D.x, D.y, D.r, D.top - 3.2, P, 40), { tone: "faint" }));
  out.push(L(k.ring(D.x, D.y, D.r - 2, D.top, P, 72), { tone: "lo" }));
  const tk = k.radialTicks(D.x, D.y, D.r - 2, 30, 10, D.top, [1.2, 3.2], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(tk.minor, { tone: "lo" }), L(tk.major, { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([D.x - 6.4, D.y + 8.4], D.top, P, "x"), "CONTACT", { size: 2.1, tone: "lo", anchor: "middle" }));
  return out.join("");
}

// Three bar gauges (speed, security, first fire): base, guide posts, a back plate with ticks and caps.
function bars() {
  const out = [];
  G.BAR_X.forEach((bx) => {
    const y = G.BAR_Y, top = 5 + G.BAR_H + 3;
    out.push(`<path class="iso-halo" d="${k.haloOf({ x: bx - 8, y: y - 7, w: 16, d: 14, r: 2 }, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
    out.push(S(box(bx - 8, bx + 8, y - 7, y + 7, 0, 5, 0.5), { tone: "mid" }));
    out.push(Dt([at([bx - 6, y - 5, 5]), at([bx + 6, y - 5, 5]), at([bx - 6, y + 5, 5]), at([bx + 6, y + 5, 5])], { size: 0.42 }));
    out.push(S(box(bx - 6, bx + 6, y - 5.6, y - 4, 5, top - 5, 0.2), { tone: "lo", crease: "faint" }));
    const ticks = [];
    for (let i = 0; i <= 5; i++) { const z = 5.6 + (i * G.BAR_H) / 5; ticks.push(k.segment([bx + 6, y - 4, z], [bx + (i % 5 === 0 ? 3 : 4.4), y - 4, z], P)); }
    out.push(L(ticks.join(""), { tone: "mid" }));
    for (const sx of [-5.4, 5.4]) {
      out.push(S(k.cylinder(bx + sx, y + 3.6, 1, 5, top - 5, P, 12), { tone: "mid", crease: "none" }));
      out.push(S(k.cylinder(bx + sx, y + 3.6, 1.8, top, 1.2, P, 14), { tone: "mid" }));
    }
  });
  return out.join("");
}

// Tally tray: two rows of five holes for pegs, friendly row nearer the viewer.
function tally() {
  const T = G.TALLY, out = [];
  out.push(S(k.slabOf(T, 0, 1.6, P, 4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(T, 2), 1.6, P), { tone: "faint" }));
  const holes = [];
  for (const y of [T.y + 8, T.y + 20]) for (let i = 0; i < 5; i++) holes.push(k.ring(T.x + 6 + i * 10, y, 2, 1.6, P, 14));
  out.push(L(holes.join(""), { tone: "lo" }));
  out.push(Dt([at([T.x + 3, T.y + 20, 1.6]), at([T.x + 3, T.y + 8, 1.6])], { size: 0.5 }));
  out.push(Dt(k.corners(T, 2.6).map(([x, y]) => at([x, y, 1.6])), { size: 0.42 }));
  return out.join("");
}

const MACHINE_STATIC = [plate(), rails(), dial(), bars(), tally()];
const V0 = {
  xA: G.xOf(0), xB: G.xOf(-20), upA: 0, upB: 0, pinA: 0, pinB: 0, pop: 0, fireB: 0, hitA: 0, owX: -1000, owRange: 0,
  risk: 0.12, bars: [1, securityShare(0), supportSeconds(0) / 10], nb: 0, nr: 0,
};
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT, className: "mq-svg",
  label: "A bench model of the three movement techniques. Two carriages stand for a squad's two fire teams on twin rails, with a pop-up target at the far end for the enemy. Each carriage has a brake pin that drops into the rail and a mast that rises when the team is halted and watching. A selector dial takes the leader's likelihood of contact: not likely picks traveling, with both carriages moving together; possible picks traveling overwatch, with the trailing carriage held back and its mast half up; expected picks bounding overwatch, with one carriage pinned and watching while the other moves. Three bar gauges read speed, security and the time to first supporting fire; a tray of pegs counts the men down on each side after contact.",
  body: [...MACHINE_STATIC, `<g data-part="live">${scene(k, P, V0)}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at squad scale (kit/terrain.mjs) ----
const FWID = 640, FH = 420;
const PF = k.fitProjection([[-152, -64], [20, -64], [20, 62], [-152, 62]].map(([u, v]) => [...FW(u, v), 0]), FWID, FH, { pad: 0, azimuth: 55, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const S0 = { s: 0, w: [1, 0, 0], method: "alternating", adv: true, contact: false, tc: 0, e: 0, ctech: 0 };
const POSE0 = fieldPose(S0, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FWID, height: FH, className: "mq-field",
  label: "The same idea on a battlefield. A rifle squad, two fire teams in wedge and the squad leader, walks a farm track from the left across open ground toward two hidden enemy outposts, one in the far wood and one on the near side ahead, each a machine-gun nest and two fighting positions on a low rise. A chalk line across the track marks the probable line of deployment. While contact is not likely the teams close up and walk together; while it is possible the trailing team drops back and the lead team keeps moving; while it is expected one team halts and watches, with its sector marked on the ground, while the other bounds forward. On contact the enemy opens fire on the lead team. The team that is already halted and watching fires at once; in this model, a column that was walking has to go to ground first, and the lead team takes more men down. Sizes, ranges, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg mq-field"', 'class="iso-svg mq-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "ATP 3-21.8 (2024, C1 2025) selects the technique on “the likelihood of enemy contact and need for speed” (para 3-76). Here the dial is that likelihood; speed, security and the time to first supporting fire are notional teaching values that keep the manual’s order, not data.";
const LABELS = {
  machine: "Movement-techniques bench. Left and right arrow keys, or the keys 1, 2 and 3, set the likelihood of contact; C makes contact or resumes the advance; B switches alternating and successive bounds; V switches to the Battlefield view. Speeds, times, counts and losses are notional model values, not data.",
  field: "Battlefield. Left and right arrow keys, or the keys 1, 2 and 3, set the likelihood of contact; C makes contact or resumes the advance; B switches alternating and successive bounds; V switches to the Machine view. Speeds, times, counts and losses are notional model values, not data.",
};
const card = k.plateHtml({
  fig: "Fig 45",
  title: "Movement techniques",
  hint: "Slide likelihood · C contact",
  readout: "",
  keys: [
    { mark: "lit", label: "Lead team: the carriage that starts in front" },
    { mark: "raised", label: "Brake pin and mast: a halted team is pinned and watching" },
    { mark: "edge", label: "Dial and gauges: likelihood of contact; speed, security, first fire" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage mq-stage" tabindex="0" role="application" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = "ATP 3-21.8 (2024, C1 2025): bounding overwatch is “used when contact with enemy forces is expected” (para 3-75) and the overwatching element “can immediately support the bounding elements with fires if the bounding elements make contact” (para 3-82). Unit sizes, distances, timings and losses are notional, not data.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Lead team and squad leader of the squad (lit)" },
    { mark: "blue", label: "Friendly: the squad's other fire team" },
    { mark: "red", label: "Enemy: an MG nest and two holes" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="mq-legend mq-legend-machine">${m}</div><div class="mq-legend mq-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO: G, MODEL, LABELS, V0 };
const live = readFileSync(join(HERE, "live.js"), "utf8");
const runtime = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^export const GEO = [\s\S]*?\nGEO\.DIAL\.top[^\n]*\n/m, "").replace(/^const GEO = [\s\S]*?\nGEO\.DIAL\.top[^\n]*\n/m, "")}
const GEO = DATA.GEO; GEO.xOf = (s) => GEO.X0 + s * GEO.XSPAN / GEO.ROUTE;
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
${live}`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + runtime).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const t of [0, 1, 2]) console.log(`${NAMES[t]}: speed ${Math.round(speedShare(t) * 100)}%, security ${Math.round(securityShare(t) * 100)}%, first fire ${supportSeconds(t)} s, down ${JSON.stringify(losses(t))}`);
console.log("men", POSE0.men.length, "outposts", OUTPOSTS.join(","), "wrote index.html", PAGE.length, "bytes");
