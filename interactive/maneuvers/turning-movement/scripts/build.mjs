// Builds interactive/maneuvers/turning-movement/index.html: an isometric "lock and bypass" bench made
// with the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/turning-movement/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, ROUTE, LEVER, S_CONTACT, S_END, G_REAR, routePct, phiAt, boltDrawn, runTime, guardTime } from "./model.mjs";
import { GEO, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, trTruck } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;
const RAD = Math.PI / 180;

const PLATE = { x: -91, y: -57, w: 207, d: 150, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: 70, y: 28, w: 28, d: 16, r: 1.5 };
const RULER = { x: -34, y: 81.5, w: 104, d: 5.5, r: 1 };
const DIAL = { x: 42, y: 40, r: 11, z: 8, h: 5 };
DIAL.top = DIAL.z + DIAL.h;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, 0, 23], [0, -48, 23.5], [-66, 36, 17], [-14, 16, 23], [DIAL.x, DIAL.y, DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 66, elevation: 38 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const depth = (x, y) => k.depthOf([x, y, 0], P);
// An annular sector about (cx, cy), radii r0..r1, angles a0..a1 degrees.
const sector = (cx, cy, r0, r1, a0, a1, step = 2) => {
  const out = [];
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
  for (let i = 0; i <= n; i++) { const a = (a0 + ((a1 - a0) * i) / n) * RAD; out.push([cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)]); }
  for (let i = n; i >= 0; i--) { const a = (a0 + ((a1 - a0) * i) / n) * RAD; out.push([cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)]); }
  return out;
};
// A radial box about (cx, cy): radius r0..r1, half-width t, at angle ang degrees.
const rbox = (cx, cy, ang, r0, r1, t) => {
  const c = Math.cos(ang * RAD), s = Math.sin(ang * RAD);
  return [[r0, -t], [r1, -t], [r1, t], [r0, t]].map(([r, v]) => [cx + r * c - v * s, cy + r * s + v * c]);
};

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
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[20, 5], [14, 8.5], [17, 12]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The bypass rail: sleepers and two rails down the near side, round the bend and in behind the lock,
// with a ruler along the straight.
function bypass() {
  const out = [];
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RULER.x + 2, RULER.x + RULER.w - 2, 2, 5, RULER.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const { cx, cy, r, bx, ay } = ROUTE;
  const sleepers = [];
  for (let x = 82; x >= -30; x -= 16) sleepers.push({ d: depth(x, ay), svg: S(k.slabOf({ x: x - 2, y: ay - 14, w: 4, d: 28, r: 0.6 }, 0, 1.2, P, 2), { tone: "lo" }) });
  for (const a of [120, 150]) sleepers.push({ d: depth(cx + r * Math.cos(a * RAD), cy + r * Math.sin(a * RAD)), svg: S(k.extrude(rbox(cx, cy, a, r - 14, r + 14, 2), 0, 1.2, P), { tone: "lo" }) });
  for (let y = 24; y >= -4; y -= 14) sleepers.push({ d: depth(bx, y), svg: S(k.slabOf({ x: bx - 14, y: y - 2, w: 28, d: 4, r: 0.6 }, 0, 1.2, P, 2), { tone: "lo" }) });
  sleepers.sort((a, b) => a.d - b.d).forEach((s) => out.push(s.svg));
  // rails: far rail first, then near rail, each as straight + bend + straight
  for (const [o0, o1] of [[-12.5, -9.5], [9.5, 12.5]]) {
    out.push(S(k.slabOf({ x: bx + o0, y: -8, w: 3, d: cy + 0.01 + 8, r: 0.6 }, 1.2, 3, P, 2, 0.3), { tone: "mid" }));
    out.push(S(k.extrude(sector(cx, cy, r + o0, r + o1, 90, 180, 3), 1.2, 3, P, { convex: false, bevel: 0.3 }), { tone: "mid" }));
    out.push(S(k.slabOf({ x: cx - 0.01, y: ay + o0, w: 90 - cx + 0.01, d: 3, r: 0.6 }, 1.2, 3, P, 2, 0.3), { tone: "mid" }));
  }
  return out.join("");
}

// The ring track the guard slides on, from the front of the lock round the far side to the lever.
function guardTrack() {
  const out = [];
  const ties = [];
  for (let a = 10; a >= -170; a -= 22.5) ties.push(a);
  ties.sort((a, b) => depth(44 * Math.cos(a * RAD), 44 * Math.sin(a * RAD)) - depth(44 * Math.cos(b * RAD), 44 * Math.sin(b * RAD)));
  for (const a of ties) out.push(S(k.extrude(rbox(0, 0, a, 38.5, 49.5, 1.6), 0, 1, P), { tone: "lo" }));
  for (const [r0, r1] of [[41.5, 43], [45, 46.5]]) out.push(S(k.extrude(sector(0, 0, r0, r1, -180.5, 16, 2), 1, 2.5, P, { convex: false, bevel: 0.25 }), { tone: "mid" }));
  return out.join("");
}

// The diversion carriage's straight rails.
function frontRail() {
  const out = [];
  for (const y of [-15, 11]) {
    out.push(S(k.slabOf({ x: 50, y, w: 56, d: 4, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(Dt([56, 100].map((x) => at([x, y + 2, 3])), { size: 0.4 }));
  }
  return out.join("");
}

// Tall fixed parts sorted with the moving ones: end stops on each rail.
function stops() {
  const list = [];
  const stopSvg = (paths, dotsAt) => S(paths, { tone: "mid" }) + Dt(dotsAt.map((p) => at(p)), { size: 0.42 });
  list.push({ key: depth(108, 0), svg: stopSvg(k.slabOf({ x: 106, y: -18, w: 4, d: 36, r: 1.2 }, 0, 8, P, 3, 0.5), [[108, -13, 8], [108, 13, 8]]) });
  list.push({ key: depth(92, ROUTE.ay), svg: stopSvg(k.slabOf({ x: 90, y: ROUTE.ay - 14, w: 4, d: 28, r: 1.2 }, 1.2, 7, P, 3, 0.5), [[92, ROUTE.ay - 11, 8.2], [92, ROUTE.ay + 11, 8.2]]) });
  list.push({ key: depth(ROUTE.bx, -10), svg: stopSvg(k.slabOf({ x: ROUTE.bx - 14, y: -12, w: 28, d: 4, r: 1.2 }, 1.2, 7, P, 3, 0.5), [[ROUTE.bx - 11, -10, 8.2], [ROUTE.bx + 11, -10, 8.2]]) });
  const sa = 15.5;
  list.push({ key: depth(44 * Math.cos(sa * RAD), 44 * Math.sin(sa * RAD)), svg: S(k.extrude(sector(0, 0, 40.5, 47.5, 13.5, 17.5, 1), 1, 6, P, { convex: false, bevel: 0.3 }), { tone: "mid" }) +
    Dt([at([42.4 * Math.cos(sa * RAD), 42.4 * Math.sin(sa * RAD), 7]), at([45.6 * Math.cos(sa * RAD), 45.6 * Math.sin(sa * RAD), 7])], { size: 0.4 }) });
  const sb = -181.5;
  list.push({ key: depth(44 * Math.cos(sb * RAD), 44 * Math.sin(sb * RAD)), svg: S(k.extrude(sector(0, 0, 40.5, 47.5, -183.5, -179.5, 1), 1, 3.5, P, { convex: false, bevel: 0.3 }), { tone: "mid" }) });
  return list;
}
// The dial gauge that reads how far the guard has been pulled off the front (0 to 180 degrees).
function gauge() {
  const out = [];
  const ped = { x: DIAL.x - 8, y: DIAL.y - 8, w: 16, d: 16, r: 2.5 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 3, P, 5, 0.5), { tone: "mid" }));
  out.push(Dt(k.corners(ped, 2.2).map(([x, y]) => at([x, y, 3])), { size: 0.42 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 4, 3, 1.6, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 2.4, 4.6, DIAL.z - 4.6, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 64, 0.7), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 2.6, DIAL.top, 56, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 2.6, P, 36), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 1.6, DIAL.top, P, 64), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 1.6, 18, 3, DIAL.top, [1, 2.2], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needle(k, P, DIAL, 0)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.3, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}
const STOPS = [...stops(), { key: depth(DIAL.x, DIAL.y), svg: `<g data-part="gauge">${gauge()}</g>` }];

const START = { s: 0, g: 0, phi: 0, bolt: 0, tip: GEO.DIV_FRONT };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "tm-svg",
  label: "A bench model of a turning movement. A rim lock stands in the middle of a base plate, its bolt thrown into a keeper at the front. A guard block sits in front of the keeper, pressed by a diversion carriage on a short straight rail. A lit carriage runs on a long bypass rail down the near side and round in behind the lock, where a release lever is linked by a crank and rod to the bolt. As the lit carriage nears the lever, the guard must leave the front and slide round its ring track to brace the lever, and the diversion carriage rolls into the empty front. If the guard stays, the carriage throws the lever and the bolt withdraws.",
  body: [plate(), bypass(), guardTrack(), frontRail(), `<g data-part="live">${scene(k, P, { ...START, statics: STOPS })}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at operational scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the whole
// card at every width; a phone crops the sides. The camera matches the machine's (azimuth 66), so the
// enemy's front faces right and the turning force's road runs along the near side, as on the bench.
const FW = 640, FH = 420;
const FA = 66, FE = 42;
// Four ground points that frame a screen-aligned rect centred on (cx, cy), hw unit-screen units wide each side.
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const PF = k.fitProjection(groundRect(-14, 46, 228, 228 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose({ ...START }, GEO, T);
const unitSvg = (u) => u.kind === "t" ? trTruck(k, PF, trFaceStep(u.face)) : trVehicle(k, PF, trFaceStep(u.face));
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "tm-field",
  label: "The same idea on a battlefield, at division scale, with each small vehicle standing for a company and each cluster of three for a battalion. In the middle, a red enemy brigade of three battalions is dug in along a ridge facing right, its fire sector marked on the ground. On the right, a blue diversion force of two battalions attacks the ridge's front with fire. The lit blue turning force, a brigade of three battalions, drives in march column along a road round the enemy's southern flank, behind a wood and past a phase line, toward a crossroads village in the enemy's rear, marked by a flag, on the enemy's supply road just short of a river bridge. A blue reserve waits behind its assembly area and two blue security vehicles screen its flank. If the enemy reacts, its battalions pull off the ridge, drive back along the supply road and block south of the crossroads, and the diversion force rolls onto the empty ridge. If it holds, the turning force seizes the crossroads, deploys round it and cuts the supply road, and the red supply trucks halt at the bridge. Sizes, distances and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg tm-field"', 'class="iso-svg tm-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "Army doctrine (FM 3-90, 2023, para. 2-71): in a turning movement the attacker “seeks to avoid the enemy’s principal defensive positions by attacking to the rear of their current positions forcing them to move or divert forces to meet the threat.” The timings on this bench are notional.";

const LABELS = {
  machine: "Turning movement bench. Left and right arrow keys move the turning carriage along the bypass rail; H makes the defender hold its front or react; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys move the turning force along its road; H makes the enemy hold its ridge or react; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 3",
  title: "Turning movement",
  hint: "Hover the rail · click: hold",
  readout: "",
  keys: [
    { mark: "lit", label: "Turning force: the carriage on the bypass rail" },
    { mark: "raised", label: "Defender: the guard block on its ring track" },
    { mark: "edge", label: "Objective in the rear: the lever that draws the bolt" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage tm-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("The timings on this bench are notional.", "FM 3-90 adds that only divisions and above can execute one (para. 2-71). Unit sizes, distances and timings here are notional.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Turning force (main effort): a brigade, lit" },
    { mark: "blue", label: "Friendly: diversion force, reserve, security" },
    { mark: "red", label: "Enemy: a brigade on the ridge, supply trucks" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="tm-legend tm-legend-machine">${m}</div><div class="tm-legend tm-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, START, STOPS, DIAL, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = \{[\s\S]*?\n\};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, START, STOPS, DIAL, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, corners, planOutline, insetPlan };
const root = document.querySelector(".tm-figure");
const stage = root.querySelector(".tm-stage");
const svg = stage.querySelector(".tm-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const btn = root.querySelector("#tm-policy");
const slider = root.querySelector("#tm-route");
const fieldSvgEl = stage.querySelector(".tm-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, gdir: 1, cut: 0 };
let stageF = null, fire = null, marksSig = "";
const hintEl = root.querySelector('[data-corner="hint"]');
const sliderText = root.querySelector("#tm-route-text");
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
const HINTS = { machine: "Hover the rail · click: hold", field: "Hover the road · click: hold" };
const SLIDER_TEXT = { machine: "Turning force position", field: "Turning force position" };
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { ...START, target: 0, react: true, speed: MODEL.maxSpeed };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
// [time, defender reacts, target share of the rail, speed]
const TOUR = [[0, true, 0, 80], [0.6, true, 1, MODEL.tourSpeed], [8.4, false, 1, MODEL.tourSpeed], [11.8, false, 0, 80]];
const LOOP = 14.6;
function tourAt(t) {
  t %= LOOP;
  let step = TOUR[0];
  for (const row of TOUR) if (t >= row[0]) step = row;
  return step;
}
function setReact(on) {
  S.react = on;
  btn.setAttribute("aria-pressed", String(!on));
  btn.textContent = on ? "Make the defender hold" : "Let the defender react";
}
function text() {
  const pct = routePct(S.s);
  if (S.phi > 0.5) return "Lever thrown · bolt " + Math.round(S.bolt * 100) + "% drawn";
  if (braced(S.g, S.phi)) return "Route " + pct + "% · front abandoned";
  if (S.g < -1) return "Route " + pct + "% · guard " + Math.round(-S.g) + "° off front";
  return "Route " + pct + "% · guard on front";
}
// Battlefield frame: vehicles move by translate and re-render only when their facing crosses a 15°
// step; the fire layer writes attributes only; the fire sectors redraw only when the state moves them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, GEO, T, FM);
  stageF.put(pose.units.map((u) => {
    const f = trFaceStep(u.face), shape = u.kind + "|" + f, look = u.side + "|" + shape;   // side in the look: a knocked-out vehicle re-tints
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(shape)) LOOKS.set(shape, u.kind === "t" ? trTruck(K, PF, f) : trVehicle(K, PF, f)); return LOOKS.get(shape); } };
  }));
  const sig = pose.inPit.toFixed(2) + "|" + pose.blocking.toFixed(2) + "|" + pose.a.toFixed(2);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  const ft = still.matches ? 4.37 : FM.t, shots = trShots(pose.streams, ft);
  shots.smoke = [...fieldSmoke(pose, ft), ...shots.smoke];
  fire.draw(shots);
}
function draw() {
  if (view === "field") drawField();
  else {
    layer.innerHTML = scene(K, P, { ...S, statics: STOPS });
    const n = layer.querySelector('[data-part="needle"]');
    if (n) n.setAttribute("d", needle(K, P, DIAL, Math.min(1, -S.g / 180)));
  }
  let t = text();
  // the battlefield adds the notional losses, friendly vs enemy vehicles (shorter words to fit)
  if (view === "field") { const LS = losses(S.s, S.g, S.phi); t = t.replace("° off front", "° off") + " · " + LS.blue + " vs " + LS.red + " down"; }
  if (readout.textContent !== t) readout.textContent = t;
  stage.setAttribute("aria-valuenow", String(Math.round((S.s / S_END) * 100)));
  stage.setAttribute("aria-valuetext", t);
  if (document.activeElement !== slider) slider.value = String(Math.round((S.target / S_END) * 100));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const [, react, share, speed] = tourAt(clock);
    if (react !== S.react) setReact(react);
    S.target = share * S_END;
    S.speed = speed;
  }
  const g0 = S.g;
  const want = guardWant(S.react, S.s);
  S.g = calm ? Math.max(want, guardLimit(S.phi)) : guardStep(S.g, want, S.phi, dt);
  const cap = braced(S.g, S.phi) ? S_CONTACT : S_END;
  const goal = Math.min(S.target, cap);
  if (calm) S.s = goal;
  else {
    const eased = S.s + (goal - S.s) * (1 - Math.exp(-dt / 0.45));
    S.s += clamp(eased - S.s, -S.speed * dt, S.speed * dt);
  }
  S.s = Math.min(S.s, cap);
  S.phi = phiAt(S.s);
  S.g = Math.max(S.g, guardLimit(S.phi));
  S.bolt = boltDrawn(S.phi);
  const tipWant = want === G_REAR && S.g < -30 ? GEO.DIV_KEEPER : GEO.DIV_FRONT;
  S.tip = calm ? tipWant : S.tip + (tipWant - S.tip) * (1 - Math.exp(-dt / 0.4));
  FM.t += dt;
  if (Math.abs(S.g - g0) > 1e-6) FM.gdir = S.g < g0 ? 1 : -1;
  const cutWant = S.phi / MODEL.phiMax > 0.4 ? 1 : 0;
  FM.cut = calm ? cutWant : FM.cut + (cutWant - FM.cut) * (1 - Math.exp(-dt / 0.6));
  draw();
  const settled = !touring && Math.abs(S.s - goal) < 0.01 && Math.abs(S.g - Math.max(want, guardLimit(S.phi))) < 0.01 && Math.abs(S.tip - tipWant) < 0.01;
  // the battlefield keeps firing and its trucks keep moving while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && (!calm || Math.abs(FM.cut - cutWant) > 0.001))) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  S.speed = MODEL.maxSpeed;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const steer = (s) => { S.target = clamp(s, 0, S_END); hold(); };
const toggle = () => { setReact(!S.react); hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  sliderText.textContent = SLIDER_TEXT[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
function floorAt(event) {
  const el = view === "field" ? fieldSvgEl : svg;
  const Q = view === "field" ? PF : P;
  const pt = el.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const p = pt.matrixTransform(el.getScreenCTM().inverse());
  const a = Q.azimuth * Math.PI / 180, e = (Q.elevation ?? 30) * Math.PI / 180;
  const kk = Q.scale * Math.sqrt(1.6);
  const u = (p.x - Q.origin[0]) / kk, v = (p.y - Q.origin[1]) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const [x, y] = floorAt(event);
  const n = view === "field" ? fieldNearest(x, y) : nearestS(x, y);
  if (n.off < (view === "field" ? 40 : 20)) steer(n.s);
});
stage.addEventListener("click", toggle);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(S.target + S_END * 0.05);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(S.target - S_END * 0.05);
  else if (event.key === "h" || event.key === "H" || event.key === " " || event.key === "Enter") toggle();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
btn.addEventListener("click", toggle);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
slider.addEventListener("input", () => steer((Number(slider.value) / 100) * S_END));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setReact(S.react);
setView(view, false);
window.__turningMovement = { S, setReact, steer, setView, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
console.log(`contact at s=${S_CONTACT.toFixed(1)}, end s=${S_END.toFixed(1)}, guard brace ${G_REAR.toFixed(1)}°`);
console.log(`trigger to lever: tour ${runTime(MODEL.tourSpeed).toFixed(2)} s, flat out ${runTime(MODEL.maxSpeed).toFixed(2)} s; guard ${guardTime().toFixed(2)} s`);
console.log(`end: route ${routePct(S_END)}%, phi ${phiAt(S_END).toFixed(1)}°, bolt ${Math.round(boltDrawn(phiAt(S_END)) * 100)}%; lever ${LEVER.len} long`);
console.log("wrote index.html", PAGE.length, "bytes");
