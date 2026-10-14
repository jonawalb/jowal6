// Builds interactive/maneuvers/strongpoint-perimeter/index.html: a turntable of plate sections that stand as
// a straight wall or an all-round ring (the machine) and a rifle company defending a rise as a line or a
// perimeter, hasty or as a strong point (the battlefield), made with the Anatomy kit (../../kit, MIT).
// Run: node interactive/maneuvers/strongpoint-perimeter/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, fresh, simulate, friendDown, enemyDown, compass } from "./model.mjs";
import { GEO, scene, base } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640, HEIGHT = 360;
const P = k.fitProjection(
  [[-GEO.R, -GEO.R, -18], [GEO.R, -GEO.R, -18], [GEO.R, GEO.R, -18], [-GEO.R, GEO.R, -18], [0, 0, 36]],
  WIDTH, HEIGHT, { pad: 12, azimuth: 55 },
);

const TOUR = [
  { layout: "L", fort: 0, main: 0, bearing: 0 },
  { layout: "L", fort: 0, main: 0, bearing: 135 },
  { layout: "P", fort: 1, main: 0, bearing: 135 },
];
const V0 = { L: 0, fort: 0, ang: 0, tip: GEO.RAIL - 4, arm: 180, g: Array(6).fill(0), rg: 0, held: 0, broke: 0 };
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT, className: "sp-svg",
  label: "A bench model of strongpoint and perimeter defense. On a round turntable stand six plate sections, each on a carriage with a spring tube and a pressure gauge behind it. A switch lays them as a straight wall across the likely avenue, north, or as a ring, tied edge to edge. A hub in the middle carries a lit reserve arm that swings to the threatened side. A carriage on a rail round the rim pushes a rod in along any bearing you choose; the plates that face it are pressed back and their gauges climb. A ring of low pickets rises and the plates take roofs when the position is prepared as a strong point. Two lamps at the front say whether the position held or was penetrated. The strengths, fire and losses are notional.",
  body: [`<g data-part="base">${base(k, P)}</g>`, `<g data-part="live">${scene(k, P, V0)}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at company scale (kit/terrain.mjs) ----
const FW = 640, FH = 420;
const PF = k.fitProjection([[-78, -78, 0], [78, -78, 0], [78, 78, 0], [-78, 78, 0]], FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const S0 = fresh(TOUR[0]);
const POSE0 = fieldPose(S0, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW, height: FH, className: "sp-field",
  label: "The same idea on a battlefield. A rifle company defends a low rise in the middle. In the line setting its six positions stand side by side across the likely avenue, north, behind a belt of wire; in the perimeter setting they ring the rise with wire all round and sectors of fire in every direction. A small reserve waits in the centre and moves to the threatened side. Red elements attack from a bearing you choose. The prepared setting adds a second belt of wire, heavier fighting positions and machine-gun nests. Sizes, ranges, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, S0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg sp-field"', 'class="iso-svg sp-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "FM 3-90 (2023), para. 9-61: “A major characteristic of a perimeter defense is a secure inner area with most of the combat power located on the perimeter.” Here six plates share a fixed strength, so a ring spreads it thin and a wall piles it on one side. The strengths and every effect are notional teaching values, not data.";
const LABELS = {
  machine: "Strongpoint and perimeter bench. Left and right arrows set the attack bearing; L lays the plates as a wall or a ring; S prepares the position as a strong point; M reinforces the likely avenue; F or Enter starts the attack; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrows set the attack bearing; L chooses line or perimeter; S prepares a strong point; M reinforces the likely avenue; F or Enter starts the attack; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 43",
  title: "Strongpoint and perimeter",
  hint: "Click to attack · ← → bearing",
  readout: "",
  keys: [
    { mark: "lit", label: "Reserve arm: swings to the threatened side" },
    { mark: "raised", label: "Plates: six sections, a wall or a ring" },
    { mark: "edge", label: "Gauges and lamps: pressure, held, broken" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage sp-stage" tabindex="0" role="application" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = "FM 3-90 (2023), para. A-68: a strong point is “a heavily fortified battle position tied to a natural or reinforcing obstacle to create an anchor for the defense or to deny the enemy decisive or key terrain.” Unit sizes, ranges, timings, strengths, which layout holds and losses are notional, not data.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Reserve: central, moves to the threatened side (lit)" },
    { mark: "blue", label: "Company: six positions, a line or a ring" },
    { mark: "red", label: "Attack: five elements of three, from a bearing" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="sp-legend sp-legend-machine">${m}</div><div class="sp-legend sp-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO: { ...GEO }, MODEL, V0, LABELS, TOUR };
const live = readFileSync(join(HERE, "live.js"), "utf8");
const runtime = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "const GEO = DATA.GEO;\n").replace(/^const GEO = GEO;?/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
${live}`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + runtime).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

console.log("men", POSE0.men.length, "wrote index.html", PAGE.length, "bytes");
for (const o of TOUR) { const s = simulate(o); console.log(o.layout, o.fort, compass(o.bearing), s.end, s.t.toFixed(1), "s", friendDown(s), "vs", enemyDown(s)); }
