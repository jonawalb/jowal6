// Builds interactive/maneuvers/fire-control/index.html: a spray bar over a row of target blocks (the
// machine) and a defending platoon meeting an attack (the battlefield), made with the Anatomy kit
// (../../kit, MIT). Run: node interactive/maneuvers/fire-control/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, fresh, simulate, wastedPct, bluesDown, redDown } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640, HEIGHT = 360;
const PLATE = { x: -100, y: -42, w: 200, d: 84, r: 10 };
const PLATE_H = 12, FOOT_H = 5;
const LABEL = { x: -96, y: 30, w: 30, d: 8, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-88, 0, GEO.TOP + 24], [88, 0, GEO.TOP + 24]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 55 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -6, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 8);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // a groove that holds the ruler strip along the front edge, ticks every 4 and a major every 5th
  const RUL = { x: -58, y: 33, w: 72, d: 5, r: 1 };
  out.push(S(k.slabOf(RUL, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RUL.x + 4, RUL.x + RUL.w - 4, 4, 5, RUL.y, 0.8, [1.4, 2.6], P, "x");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // label plate with two rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.4), 0.8, P), { tone: "faint" }));
  [[20, 2.8], [14, 5.2]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 4, LABEL.y + dy], [LABEL.x + 4 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.4, LABEL.y + 2.4, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8])], { size: 0.4 }));
  return out.join("");
}

const V0 = { nx: [...GEO.HOME], jet: Array(6).fill(0), jw: Array(6).fill(0), hT: Array(5).fill(GEO.H0), spill: Array(5).fill(0), lamp: Array(5).fill(1), steps: 0, waste: 0, sel: 0 };
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT, className: "fc-svg",
  label: "A bench model of fire control and distribution. A spray bar on two posts carries six nozzle heads over a row of five target blocks, each on a plunger in a sleeve; the middle block is lit and is the greatest threat. Each jet presses its block down; a block pressed to the sleeve is out of action. A block can use only two jets at once, so any further jets overflow into a tray along the front, and a gauge at the right end rises with the share of fire wasted. A selector on the bar sets uncontrolled, where every nozzle slides over the first block, or controlled, where the nozzles are spread over the blocks with two on the lit one. Lamps behind the blocks show which targets are still firing, and a panel of four lamps at the front lights in order for the four steps of the fire control process. The two-team cap on a target and every outcome number are notional.",
  body: [plate(), `<g data-part="live">${scene(k, P, V0)}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at platoon scale (kit/terrain.mjs) ----
const FW = 640, FH = 420;
const ZOOM = 0.9, CEN = [40, 40], OFF = [8, 14];
const PF = k.fitProjection([[54, -169], [212.5, 57.4], [-18.5, 219], [-177, -7.2]].map(([x, y]) => [OFF[0] + CEN[0] + ZOOM * (x - CEN[0]), OFF[1] + CEN[1] + ZOOM * (y - CEN[1]), 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const S0 = fresh("U");
const POSE0 = fieldPose(S0, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW, height: FH, className: "fc-field",
  label: "The same idea on a battlefield. A blue rifle platoon is dug in on a low rise in the middle, its six fire teams in two-man fighting positions along the front behind a belt of wire. Five red enemy elements of three men advance across the open ground in a line; the middle one carries a machine gun and is lit as the greatest threat. When fire is controlled, target reference points, an engagement area and a sector of fire for each team are marked on the ground, two teams take the machine gun and the others take one element each, and a team that finishes shifts to the next. When it is not, every team fires at the first element, and the others keep shooting. Sizes, ranges, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, S0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg fc-field"', 'class="iso-svg fc-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "ATP 3-21.8 (2024), para. A-6: “Target overkill wastes ammunition and ties up weapons better employed acquiring and engaging other targets.” Here a block can use only two jets at once; the rest overflow. That cap, the effect each block needs and every time are notional teaching values, not data.";
const LABELS = {
  machine: "Fire-control bench. Keys 1 and 2 (or the arrow keys) set the selector to uncontrolled or controlled; F or Enter starts the engagement; V switches to the Battlefield view.",
  field: "Battlefield. Keys 1 and 2 (or the arrow keys) choose uncontrolled or controlled fire; F or Enter starts the attack; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 40",
  title: "Fire control",
  hint: "Click to engage · 1 2 mode",
  readout: "",
  keys: [
    { mark: "lit", label: "Target: the lit block is the greatest threat" },
    { mark: "raised", label: "Spray bar: six nozzle heads, one per fire team" },
    { mark: "edge", label: "Lamps: targets still firing, and the four steps" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage fc-stage" tabindex="0" role="application" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = "ATP 3-21.8 (2024): leaders must “focus, distribute, and shift” the platoon’s direct fires (para. A-1) and “destroy the greatest threat first” (para. A-3). Unit sizes, ranges, timings, the two-team cap on a target, the wasted share and losses are notional, not data.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Enemy machine-gun team: the greatest threat (lit)" },
    { mark: "blue", label: "Defending platoon: six fire teams in positions" },
    { mark: "red", label: "Enemy attack: five elements of three, line abreast" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="fc-legend fc-legend-machine">${m}</div><div class="fc-legend fc-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO: { ...GEO }, MODEL, V0, LABELS };
const live = readFileSync(join(HERE, "live.js"), "utf8");
const runtime = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "const GEO = DATA.GEO;\n")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
${live}`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + runtime).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const m of ["U", "C"]) { const s = simulate(m); console.log(`${m}: ${s.end} at ${s.t.toFixed(1)} s, ${wastedPct(s)}% wasted, ${bluesDown(s)} vs ${redDown(s)} down`); }
console.log("men", POSE0.men.length, "wrote index.html", PAGE.length, "bytes");
