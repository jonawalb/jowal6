// Builds interactive/maneuvers/lift-shift-fires/index.html: an isometric "lift rig" made with the
// Anatomy kit (../../kit, MIT) plus a Battlefield view on the terrain kit.
// Run: node interactive/maneuvers/lift-shift-fires/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, plan, stateAt, outcome } from "./model.mjs";
import { GEO, scene, needle, shotsAt } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;

const PLATE = { x: -158, y: -72, w: 322, d: 126, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DIAL = { x: -26, y: -53, r: 10, z: 15, h: 6 };
DIAL.top = DIAL.z + DIAL.h;
const DIAL2 = { x: -3, y: -55, r: 7, z: 12, h: 5 };
DIAL2.top = DIAL2.z + DIAL2.h;
const LABEL = { x: -148, y: 30, w: 30, d: 16, r: 1.5 };
const RULER = { x: -106, y: 20, w: 208, d: 7, r: 1 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.HOP[0], GEO.HOP[1], GEO.ARM_Z + 6], [GEO.POST[0], GEO.POST[1], GEO.ARM_Z + 6]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 55 },
);

const at = (p) => k.iso(p, P);
const S_ = (paths, style) => k.solidSvg(paths, style);
const L_ = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S_(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S_(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S_(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L_(k.sideSeam(PLATE, -6, P, 8), { tone: "faint" }) }));
  out.push(L_(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L_(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  out.push(S_(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L_(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[22, 5], [16, 9], [19, 13]].forEach(([len, dy]) => out.push(L_(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The distance ruler along the near side of the rail: a tick every 5 m from 150 m to 0, a major
// every 50 m, the zero mark at the target; and the minimum-safe-line stop standing on it.
function ruler() {
  const out = [S_(k.slabOf(RULER, 0, 0.8, P, 3), { tone: "lo", crease: "none" })];
  const minor = [], major = [], zero = [];
  for (let m = 0; m <= 150; m += 5) {
    const x = GEO.xAt(m), big = m % 50 === 0;
    const d = k.lineOnTop([x, RULER.y], [x, RULER.y + (big ? 3.8 : 2.2)], 0.8, P);
    (m === 0 ? zero : big ? major : minor).push(d);
  }
  out.push(L_(minor.join(""), { tone: "lo" }), L_(major.join(""), { tone: "mid" }), L_(zero.join(""), { tone: "hi" }));
  const xm = GEO.xAt(MODEL.msl);
  out.push(S_(k.slabOf({ x: xm - 1.6, y: RULER.y + 0.6, w: 3.2, d: 5.8, r: 0.6 }, 0.8, 4.4, P, 2, 0.3), { tone: "mid" }));
  out.push(Dt([at([xm, RULER.y + 3.5, 5.2])], { size: 0.45 }));
  return out.join("");
}

// The cam bar on the far side: a slotted bar the trip dog clamps to, with its end bracket at the post.
function camBar() {
  const [y0, y1] = GEO.BAR_Y;
  const bar = { x: -112, y: y0, w: 218, d: y1 - y0, r: 1.2 };
  const out = [S_(k.slabOf(bar, 0, 3, P, 3, 0.4), { tone: "mid", inner: L_(k.sideSeam(bar, 1.5, P, 3), { tone: "faint" }) })];
  out.push(L_(k.planOutline({ x: -108, y: (y0 + y1) / 2 - 1.1, w: 210, d: 2.2, r: 1.1 }, 3, P), { tone: "lo" }));
  out.push(Dt([[-110, y0 + 1.5], [-110, y1 - 1.5], [104, y0 + 1.5], [104, y1 - 1.5]].map(([x, y]) => at([x, y, 3])), { size: 0.42 }));
  // bracket from the bar's end to the cam on the post
  out.push(S_(k.slabOf({ x: 104, y: GEO.POST[1] + 6, w: 4, d: y1 - GEO.POST[1] - 6, r: 0.8 }, 0, 9, P, 3, 0.4), { tone: "mid" }));
  return out.join("");
}

// Sleepers, two rails and the start stop.
function rails() {
  const out = [];
  const xs = [];
  for (let x = -150; x <= 92; x += 11) xs.push(x);
  for (const x of xs) out.push(S_(k.slabOf({ x: x - 2, y: -14, w: 4, d: 28, r: 0.6 }, 0, 1.2, P, 2), { tone: "lo" }));
  for (const y of [-9.5, 5.5]) {
    out.push(S_(k.slabOf({ x: -152, y, w: 248, d: 4, r: 1 }, 1.2, 1.8, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([-140, 80].map((x) => at([x, y + 2, 3])), { size: 0.4 }));
  }
  out.push(S_(k.slabOf({ x: -156, y: -16, w: 4, d: 32, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: "mid" }));
  out.push(Dt([at([-154, -11, 8]), at([-154, 11, 8])], { size: 0.45 }));
  return out.join("");
}

// The two dials: the big one reads the enemy's fire, the small one the risk to the assault.
function dial(D, label) {
  const out = [];
  out.push(S_(k.cylinder(D.x, D.y, D.r * 0.42, 5, 2.2, P, 24), { tone: "mid" }));
  out.push(S_(k.cylinder(D.x, D.y, 2.6, 7.2, D.z - 7.2, P, 20), { tone: "mid", crease: "none" }));
  out.push(S_(k.cylinder(D.x, D.y, D.r, D.z, D.h, P, 64, 0.7), { tone: "hi", crease: "lo" }));
  out.push(L_(k.knurl(D.x, D.y, D.r, D.top - 2.6, D.top, Math.round(D.r * 4), P, 0.3), { tone: "lo" }));
  out.push(L_(k.sideArc(D.x, D.y, D.r, D.top - 2.6, P, 36), { tone: "faint" }));
  out.push(L_(k.ring(D.x, D.y, D.r - 1.8, D.top, P, 64), { tone: "lo" }));
  const t = k.radialTicks(D.x, D.y, D.r - 1.8, 20, 5, D.top, [1, 2.2], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L_(t.minor, { tone: "lo" }), L_(t.major, { tone: "mid" }));
  if (label) out.push(k.faceTextSvg(k.topMatrix([D.x - 3.6, D.y + 5.6], D.top, P, "x"), label, { size: 1.9, tone: "lo", anchor: "middle" }));
  out.push(`<path data-part="${label ? "needle" : "needle2"}" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, D, 0)}" style="stroke-width:1"/>`);
  out.push(L_(k.ring(D.x, D.y, 1.3, D.top, P, 16), { tone: "mid" }));
  return out.join("");
}
function gauges() {
  const ped = { x: -38, y: -65, w: 44, d: 22, r: 3 };
  const out = [`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S_(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L_(k.planOutline(k.insetPlan(ped, 2.6), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(dial(DIAL, "FIRE %"), dial(DIAL2, ""));
  return out.join("");
}
const GAUGE = { key: k.depthOf([-16, -54, 0], P), svg: `<g data-part="gauge">${gauges()}</g>` };

const START = { L: 140, shift: true, t: 0 };
const V0 = { d: MODEL.start, L: START.L, flag: 0, cam: 0, chute: 0, gate: 0, halted: 0, front: 0, rear: 0, shots: [] };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "lsf-svg",
  label: "A bench model of lifting and shifting fires. A lit assault carriage runs down a straight rail toward a hinged pop-up target, the enemy's position. Above the target, a hopper on a cantilever drops shot on it, which keeps the target folded down. A trip dog clamped on a bar beside the rail marks where the fires lift: when the carriage passes it, a cam closes the hopper's gate or swings its chute onto a second target behind, the enemy's depth. Once the shot stops, the target swings back up, and the further the carriage still has to go, the higher it gets. A stop on the distance ruler marks a minimum safe line: if the carriage reaches it with shot still falling, its brake drops and it halts. A big dial reads the enemy's fire, a small dial the risk to the assault.",
  body: [plate(), ruler(), camBar(), rails(), `<g data-part="live">${scene(k, P, { ...V0, statics: [GAUGE] })}</g>`],
});

// ---- Battlefield view: the same run on full-bleed terrain at platoon scale (kit/terrain.mjs) ----
const FW = 640, FH = 420;
const AZ = 55, EL = 42, RAD = Math.PI / 180;
const C0 = [-36, -16], UH = 122, VH = UH / ((FW / FH) * Math.sin(EL * RAD));
const fr = (u, v) => [C0[0] + u * Math.sin(AZ * RAD) + v * Math.cos(AZ * RAD), C0[1] - u * Math.cos(AZ * RAD) + v * Math.sin(AZ * RAD), 0];
const PF = k.fitProjection([fr(-UH, -VH), fr(UH, -VH), fr(UH, VH), fr(-UH, VH)], FW, FH, { pad: 0, azimuth: AZ, elevation: EL });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const R0 = stateAt(START.t, START.L, START.shift);
const POSE0 = fieldPose(R0, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "lsf-field",
  label: "The same idea on a battlefield. On a low rise, a red enemy rifle squad is dug into four two-man fighting positions facing left, with a two-man-hole depth position on a smaller rise behind it. On the far side, behind a stone wall, a blue support-by-fire element (two machine-gun teams and a rifle squad) fires tracers onto the enemy position while mortar rounds burst on it, keeping the enemy's heads down. The lit blue assault element, two rifle squads in squad line with the platoon leader and his radio operator, advances across open ground from the left. A chalk line on pegs is the final coordination line, where the fires lift or shift to the depth position; a row of stakes nearer the enemy is the figure's minimum safe line. Lift early and the enemy comes back up and fires before the assault arrives; lift late and the assault halts at the stakes while the fires are stopped. Sizes, ranges and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, START.L)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="mortar" class="tr-fire"></g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg lsf-field"', 'class="iso-svg lsf-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (FM 3-90, 2023) says a suppressed enemy “regains its effectiveness without needing to reconstitute once the effects of the systems involved in the suppression effort lift or shift to another target.” Lift too soon and the target is back up before the carriage arrives; too late and the shot is still falling when it gets close. The recovery curve and the safe distance are notional.";
const LABELS = {
  machine: "Lift rig. Left and right arrow keys move the trip dog (where the fires lift); Enter runs the carriage; F switches between shifting and lifting; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys move the final coordination line (where the fires lift); Enter runs the assault; F switches between shifting and lifting; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 36",
  title: "Lift and shift",
  hint: "Click to run · arrows set lift",
  readout: "",
  keys: [
    { mark: "lit", label: "Assault: the carriage running at the target" },
    { mark: "raised", label: "Supporting fires: the hopper; the trip dog sets where they lift" },
    { mark: "edge", label: "Dials: enemy fire (big), risk to the assault (small)" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage lsf-stage" tabindex="0" role="slider" aria-label="${LABELS.field}" aria-valuemin="${MODEL.lift[0]}" aria-valuemax="${MODEL.lift[1]}" aria-valuenow="${START.L}">${svg}${fieldSvg}</div>`,
});
const FIELD_CAPTION = CAPTION.replace("Lift too soon and the target is back up before the carriage arrives; too late and the shot is still falling when it gets close. The recovery curve and the safe distance are notional.", "Lift too soon and the enemy is back up and firing before the assault arrives; too late and the assault must halt short while the fires are stopped. Unit sizes, ranges, timings, the recovery curve and the safe distance are notional.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Main effort: the assault element, two rifle squads (lit)" },
    { mark: "blue", label: "Friendly: support by fire (two MG teams and a rifle squad); mortar bursts" },
    { mark: "red", label: "Enemy: a rifle squad dug in, a depth team behind" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="lsf-legend lsf-legend-machine">${m}</div><div class="lsf-legend lsf-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO: { ...GEO, xAt: undefined }, MODEL, DIAL, DIAL2, START, LABELS };
const live = readFileSync(join(HERE, "live.js"), "utf8");
const script = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\nGEO\.xAt[^\n]*\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const GEO = DATA.GEO; GEO.xAt = (d) => GEO.X0 - d * GEO.KX;
${live}`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + script).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const L of [0, 10, 50, 100, 140]) { const o = outcome(L, true); console.log(`lift ${L} m → enemy ${Math.round(o.eA * 100)}% · risk ${Math.round(o.risk * 100)}% · ${o.blue} vs ${o.red} down`); }
console.log("men", POSE0.men.length, "static items", FIELD.items.length, "wrote index.html", PAGE.length, "bytes");
