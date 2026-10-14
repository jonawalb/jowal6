// Builds interactive/maneuvers/reverse-slope/index.html: a profile comb with an enemy lamp and a defender
// block (the machine) and a platoon on a hill with an attack coming over the crest (the battlefield), made
// with the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/reverse-slope/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, ground, fresh, simulate, bluesDown, redDown, firstSight } from "./model.mjs";
import { GEO, scene, bx, combZ } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640, HEIGHT = 360;
const PLATE = GEO.PLATE;
const PLATE_H = 12, FOOT_H = 5;
const LABEL = { x: PLATE.x + 6, y: 22, w: 30, d: 8, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [bx(0), 0, 60], [bx(-150), 0, 36]],
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
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.4), 0.8, P), { tone: "faint" }));
  [[20, 2.8], [14, 5.2]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 4, LABEL.y + dy], [LABEL.x + 4 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.4, LABEL.y + 2.4, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8])], { size: 0.4 }));
  return out.join("");
}

const V0 = { xe: MODEL.x0, dx: MODEL.pos.R, see: 0, fE: 0, fB: 0, op: 1, blue: 0, red: 0, sel: 1, hit: null };
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT, className: "rs-svg",
  label: "A bench model of a reverse slope defense. A comb of slats is cut to the profile of a hill, rising from the enemy's side to a crest and falling away behind it. An enemy lamp carriage rides the comb and looks along a line toward the defender, a lit block that stands either on the forward slope or behind the crest. A line of sight runs from the lamp to the block; when the crest is in the way it stops on the crest. A lamp at the front lights while the enemy can see the block; two level gauges rise with the platoon's men down and the attack's. A mast at the crest is the observation post, and two belts of pegs and wire stand on the forward slope and just below the crest. A selector sets the block on the forward slope or the reverse slope. Times, counts and losses are notional.",
  body: [plate(), `<g data-part="live">${scene(k, P, V0, ground, MODEL)}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at platoon scale (kit/terrain.mjs) ----
const FW = 640, FH = 420;
const FRAME = (u, v) => { const a = FG.FACE * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [u * c - v * s, u * s + v * c]; };
const CU = 52, HU = 118, HV = 112;   // the view: along the approach from R = -90 to R = 166, and across it
const PF = k.fitProjection([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [...FRAME(CU + a * HU, b * HV), 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const S0 = fresh("R", true);
const POSE0 = fieldPose(S0, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW, height: FH, className: "rs-field",
  label: "The same idea on a battlefield. A blue rifle platoon in two-man fighting positions holds a hill. Behind the crest, on the reverse slope, it cannot be seen from the enemy's side; two men of an observation post lie at the crest. A red rifle platoon attacks up the forward slope, breaches a belt of wire, and only sees the defenders when it crests the hill, at short range, where the platoon's fires and the final protective fires meet it. Switch the platoon to the forward slope and the enemy sees it from far out and fires first. Sizes, ranges, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, S0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg rs-field"', 'class="iso-svg rs-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "FM 3-90 (2023), para. 9-104: a reverse slope defense “protects the main defensive positions from preparation fires.” Para. 9-105: “The enemy force has the advantage of attacking downhill.” The hill, every range, speed, rate and loss in this model are notional teaching values, not data.";
const LABELS = {
  machine: "Reverse slope bench. Keys 1 and 2 (or the arrow keys) put the platoon on the forward slope or the reverse slope; O toggles the observation post; A or Enter starts the attack; V switches to the Battlefield view. Times, counts and losses are notional.",
  field: "Battlefield. Keys 1 and 2 (or the arrow keys) put the platoon on the forward slope or the reverse slope; O toggles the observation post; A or Enter starts the attack; V switches to the Machine view. Times, counts and losses are notional.",
};
const card = k.plateHtml({
  fig: "Fig 42",
  title: "Reverse slope defense",
  hint: "Click to attack · 1 2 slope",
  readout: "",
  keys: [
    { mark: "lit", label: "Defender: the platoon's line (lit)" },
    { mark: "raised", label: "Lamp carriage: the enemy's eye and weapons" },
    { mark: "edge", label: "Gauges: men down, platoon and attack" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage rs-stage" tabindex="0" role="application" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = "FM 3-90 (2023), para. 9-102: “Although a defender may not occupy a crest in strength, controlling the crest by fire is essential for success.” Unit sizes, ranges, timings and losses are notional, not data.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "blue", label: "Defending platoon: fighting positions, and an OP at the crest" },
    { mark: "red", label: "Attack: one rifle platoon in a vee, up the forward slope" },
    { mark: "edge", label: "Chalk: the FPF box" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="rs-legend rs-legend-machine">${m}</div><div class="rs-legend rs-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO: { ...GEO }, MODEL, V0, LABELS };
const live = readFileSync(join(HERE, "live.js"), "utf8");
const runtime = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^export const GEO = [\s\S]*?\n};\n/m, "const GEO = DATA.GEO;\n").replace(/^const GEO = [\s\S]*?\n};\n/m, "const GEO = DATA.GEO;\n")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
${live}`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + runtime).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const [m, op] of [["F", true], ["R", true], ["R", false]]) { const s = simulate(m, op); console.log(`${m} op ${op}: ${s.ended} at ${s.t.toFixed(1)} s, ${bluesDown(s)} vs ${redDown(s)} down`); }
console.log("first sight F", firstSight(MODEL.pos.F), "R", firstSight(MODEL.pos.R));
console.log("men", POSE0.men.length, "wrote index.html", PAGE.length, "bytes");
