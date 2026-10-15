// Builds interactive/maneuvers/oakoc/index.html: a terrain block under five overlay plates that drop one by one
// (the machine) and a platoon walking the route the five overlays lead to on the same ground (the battlefield),
// made with the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/oakoc/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, ORDERS, height, streamY, GRID, aspectTiles, fresh, setPlan, summary, keyScores, keyTerrain } from "./model.mjs";
import { GEO, staticBlock, postsSvg, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640, HEIGHT = 400;
const PLATE = GEO.PLATE;
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [PLATE.x + 4, PLATE.y + 4, GEO.POST_H + 4], [PLATE.x + PLATE.w - 4, PLATE.y + PLATE.d - 4, GEO.POST_H + 4]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 55 },
);
const A = { height, streamY };
const SB = staticBlock(k, P, MODEL, A);
const ST0 = setPlan(fresh("list", 0));
const V0 = { drop: [0, 0, 0, 0, 0], seq: ORDERS.list.seq.slice(), route: { pts: ST0.w.pts, s: ST0.w.s, length: ST0.w.length }, s: 0, halt: ST0.w.halted ? ST0.w.pts[ST0.w.pts.length - 1] : null };
const LABELS = {
  machine: "Terrain analysis bench. A block of ground with two hills, a knoll, a stream with a ford and a bridge, woods, a village and a belt of wire. Five transparent overlay plates hang above it on four posts and drop one at a time, each marking one military aspect of terrain: observation and fields of fire, avenues of approach, key terrain, obstacles, and cover and concealment. A lit bead walks the route the applied overlays lead to. Keys 0 to 5 (or the arrow keys) set how many overlays are applied; O switches the order; V switches to the Battlefield view. Ground, ranges, routes and losses are notional.",
  field: "Battlefield. The same ground with the applied overlays drawn on it and a rifle platoon walking the route those overlays lead to, from the south bank toward a hill beyond the stream, under an enemy observation post on the hill to the north and a machine gun at the ford. Keys 0 to 5 (or the arrow keys) set how many overlays are applied; O switches the order; V switches to the Machine view. Ground, ranges, routes and losses are notional.",
};
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT, className: "oa-svg",
  label: LABELS.machine,
  body: [SB.base, `<g data-part="posts">${postsSvg(k, P, SB.posts)}</g>`, `<g data-part="live">${scene(k, P, V0, MODEL, (key) => aspectTiles(key))}</g>`],
});

// ---- Battlefield view ----
const FW = 640, FH = 420;
const PF = k.fitProjection([[-122, -88], [122, -88], [122, 88], [-122, 88]].map(([x, y]) => [x, y, 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose(ST0, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW, height: FH, className: "oa-field",
  label: LABELS.field,
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, ST0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg oa-field"', 'class="iso-svg oa-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "ATP 3-21.8 (2024, C1), para. 2-62: leaders “analyze terrain using the categories of observation and fields of fire, avenues of approach, key terrain, obstacles, and cover and concealment (OAKOC).” The ground, every range, route and loss in this model are notional teaching values, not data.";
const card = k.plateHtml({
  fig: "Fig 53",
  title: "Terrain analysis (OAKOC)",
  hint: "Click: next overlay · 0 to 5",
  readout: "",
  keys: [
    { mark: "lit", label: "Bead: the platoon (lit), walking the route so far" },
    { mark: "raised", label: "Plates: one overlay each, dropped in order" },
    { mark: "edge", label: "Rack: four posts holding the plates" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage oa-stage" tabindex="0" role="application" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = "FM 3-90 (2023), para. 3-23: units “try to determine the principal mounted and dismounted avenues of approach to their objectives” and consider “observation and fields of fire, avenues of approach, key terrain, obstacles, and cover and concealment (known as OAKOC).” Unit sizes, ranges, timings and losses are notional, not data.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "blue", label: "Platoon in column (lit: its lead), men down greyed" },
    { mark: "red", label: "Enemy: an observation post on the hill and a machine gun at the ford" },
    { mark: "edge", label: "Pencil line: the route the applied overlays lead to" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="oa-legend oa-legend-machine">${m}</div><div class="oa-legend oa-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO: { ...GEO }, MODEL, V0, LABELS };
const live = readFileSync(join(HERE, "live.js"), "utf8");
const runtime = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
${live}`;

const RES = (order) => [0, 1, 2, 3, 4, 5].map((n) => { const s = summary(setPlan(fresh(order, n))); return { n, ...s }; });
const resText = (rows) => rows.map((r) => `${r.n} overlay${r.n === 1 ? "" : "s"}: a route of ${r.length} units, ${r.exposed} of them in the open in view, ${r.down} down${r.halted ? ", stopped at the " + r.why : ""}`).join("; ");
const RESULTS = `On those numbers, with the overlays applied in the listed order (observation and fields of fire, avenues of approach, key terrain, obstacles, cover and concealment), the platoon’s route is, with ${resText(RES("list"))}. In an alternative order (obstacles, avenues of approach, key terrain, observation and fields of fire, cover and concealment) the first four steps differ (${resText(RES("tech").slice(0, 5))}) and the fifth is the same. These are the model’s figures, not data: the bench shows an argument, not a measurement.`;
const PAGE = readFileSync(join(HERE, "page.html"), "utf8").replace("RESULTS", () => RESULTS)
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + runtime).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const order of ["list", "tech"]) for (let n = 0; n <= 5; n++) { const s = summary(setPlan(fresh(order, n))); console.log(order, n, JSON.stringify(s)); }
console.log("key terrain:", keyTerrain().id, keyScores().map((s) => `${s.id}:${s.score}`).join(" "));
console.log("men", POSE0.men.length, "wrote index.html", PAGE.length, "bytes");
