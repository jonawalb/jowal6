// Builds interactive/maneuvers/fire-effects/index.html: a bench press over a lit target block (the
// machine) and an enemy platoon position under mortar fire (the battlefield), made with the Anatomy kit
// (../../kit, MIT). Run: node interactive/maneuvers/fire-effects/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, NAMES, roundsFor, minutesFor, mission, losses } from "./model.mjs";
import { GEO, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640, HEIGHT = 360;
const PLATE = { x: -80, y: -48, w: 172, d: 136, r: 10 };
const PLATE_H = 12, FOOT_H = 5;
const LABEL = { x: -70, y: 40, w: 30, d: 18, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-45, 0, GEO.TOP + 22], [45, 0, GEO.TOP + 22]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 55 },
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
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // a groove that holds the ruler strip along the front edge, with ticks every 4 and a major every 5th
  const RUL = { x: -66, y: 72, w: 72, d: 6, r: 1 };
  out.push(S(k.slabOf(RUL, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RUL.x + 4, RUL.x + RUL.w - 4, 4, 5, RUL.y, 0.8, [1.6, 3], P, "x");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[22, 5], [16, 9], [19, 13]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

const V0 = { hR: GEO.UP + GEO.GAP, hB: GEO.UP, lock: 0, crack: 0, spin: 20, level: "S", rounds: 0, t: 0 };
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT, className: "fe-svg",
  label: "A bench model of the three effects of fire. A press with two columns, a crown and a handwheel stands over a lit target block that sits on a spring between four guide posts. While rounds are fired the ram drives the block down; a rack beside the near column has three detent teeth, suppress, neutralize and destroy, and a stop pin on the chosen one. Two dials count rounds fired and minutes elapsed. Suppression lasts only while the press holds: cease fire and the block springs back up. At the neutralize detent a pawl locks the ram down for a short time; at the destroy detent it stays locked and the block cracks.",
  body: [plate(), `<g data-part="live">${scene(k, P, V0)}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at platoon scale (kit/terrain.mjs) ----
const FW = 640, FH = 420;
// the visible ground: Fig 1's frame drawn in 10% toward the action, so the platoon fight fills the card
const ZOOM = 0.9, CEN = [40, 40];
const PF = k.fitProjection([[54, -169], [212.5, 57.4], [-18.5, 219], [-177, -7.2]].map(([x, y]) => [CEN[0] + ZOOM * (x - CEN[0]), CEN[1] + ZOOM * (y - CEN[1]), 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const S0 = mission("S");
const POSE0 = fieldPose(S0, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW, height: FH, className: "fe-field",
  label: "The same idea on a battlefield. On a low rise in the middle, a red enemy rifle platoon is dug into two-man fighting positions with a machine-gun nest and a belt of wire facing the open ground in the foreground; the machine gun's sector is marked on the ground. A blue forward observer and his radio operator kneel on a knoll to the right. The lit blue platoon, two rifle squads with the platoon leader and his radio operator, starts at the edge of a wood on the left and crosses the open ground to a farm on the right, marked by a chalk outline. Mortar rounds from the company's mortar section, off the map, burst on the enemy position. While rounds land the enemy keeps its heads down; when they stop, a suppressed enemy comes straight back up and fires on the platoon, a neutralized one stays down for a short time, and a destroyed one does not come back. Sizes, ranges, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, S0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="bursts" class="fe-bursts"></g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg fe-field"', 'class="iso-svg fe-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "FM 3-09 (2024) gives the computed effects of field artillery fires as suppression (at least 3 percent casualties or materiel damage), neutralization (10 percent) and destruction (30 percent). Here each is a detent on the press. Rounds, minutes and the casualty curve are notional teaching values, not data.";
const LABELS = {
  machine: "Fire-effects press. Keys 1, 2 and 3 (or the arrow keys) set the detent to suppress, neutralize or destroy; F fires or ceases fire; V switches to the Battlefield view.",
  field: "Battlefield. Keys 1, 2 and 3 (or the arrow keys) choose suppress, neutralize or destroy; F fires the mortars or ceases fire; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 37",
  title: "Effects of fire",
  hint: "Click to fire · 1 2 3 effect",
  readout: "",
  keys: [
    { mark: "lit", label: "Target: the block the press drives down" },
    { mark: "raised", label: "Press and rack: three detents, suppress, neutralize, destroy" },
    { mark: "edge", label: "Dials: rounds fired and minutes elapsed" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage fe-stage" tabindex="0" role="application" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = "FM 3-09 (2024): suppression produces at least 3 percent casualties or materiel damage, neutralization 10 percent and destruction 30 percent, and suppressive fire works “during the conduct of the fires.” Unit sizes, ranges, rates of fire, timings and losses are notional, not data.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Friendly platoon crossing the open ground (lit)" },
    { mark: "blue", label: "Forward observer team; the mortars are off the map" },
    { mark: "red", label: "Enemy rifle platoon, dug in, under mortar fire" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="fe-legend fe-legend-machine">${m}</div><div class="fe-legend fe-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO: { ...GEO, hAt: undefined }, MODEL, LABELS };
const live = readFileSync(join(HERE, "live.js"), "utf8");
const runtime = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\nGEO\.hAt[^\n]*\n/m, "")}
const GEO = DATA.GEO; GEO.hAt = (d) => GEO.UP - GEO.TRAVEL * d;
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
${live}`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + runtime).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const l of ["S", "N", "D"]) console.log(`${NAMES[l]}: ${roundsFor(l)} rounds, ${minutesFor(l).toFixed(1)} min`);
console.log("men", POSE0.men.length, "wrote index.html", PAGE.length, "bytes");
