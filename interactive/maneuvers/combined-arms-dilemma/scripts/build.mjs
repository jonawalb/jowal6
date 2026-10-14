// Builds interactive/maneuvers/combined-arms-dilemma/index.html: an isometric two-key lock made with the
// Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/combined-arms-dilemma/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, held, opens } from "./model.mjs";
import { GEO, scene, needle } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep } from "../../kit/terrain.mjs";
import { FG, fieldTerrain, fieldStatic, fieldPose, fieldMarks, fieldArc } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 360;
const RAD = Math.PI / 180;

const PLATE = { x: -106, y: -46, w: 212, d: 104, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const FLANGE = { x: -68, y: -36, w: 136, d: 68, r: 5 };
const BODY = { x: -62, y: -30, w: 124, d: 56, r: 4 };
const ESC = { x: -56, y: -24, w: 112, d: 46, r: 3 };
const DIAL = { x: -84, y: 38, r: 13, z: 20, h: 7 };
DIAL.top = DIAL.z + DIAL.h;
const LABEL = { x: -36, y: 37, w: 30, d: 15, r: 1.5 };
const HOLD = { x: 44, y: 36, w: 16, d: 14, r: 2 };
const RULER = { x: 70, y: 16, w: 28, d: 6, r: 1 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [30, -2, 62], [-30, -2, 46], [52, 43, 26], [DIAL.x, DIAL.y, DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 50 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const polar = (cx, cy, r, deg) => [cx + r * Math.cos(deg * RAD), cy + r * Math.sin(deg * RAD)];
const loop = (pts) => k.pathOf(pts.map(at), true);

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
  [[20, 4.5], [14, 7.5], [17, 10.5]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The dial gauge that reads how far the bolt is drawn.
function gauge() {
  const out = [];
  const ped = { x: DIAL.x - 13, y: DIAL.y - 13, w: 26, d: 26, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(ped, 0, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), 5, P), { tone: "faint" }));
  out.push(Dt(k.corners(ped, 3.4).map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 5.2, 5, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3.2, 7.4, DIAL.z - 7.4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(DIAL.x, DIAL.y, 3.2, 13, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, DIAL.top, 60, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL.top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL.top, P, 72), { tone: "lo" }));
  const t = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 20, 5, DIAL.top, [1.1, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="hi" data-free="" d="${needle(k, P, DIAL, 0)}" style="stroke-width:1.1"/>`);
  out.push(L(k.ring(DIAL.x, DIAL.y, 1.4, DIAL.top, P, 16), { tone: "mid" }));
  return out.join("");
}

// The lock case: flange, body, escutcheon, the two plugs and the pawl boss.
function lock() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(FLANGE, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(FLANGE, 0, 3, P, 5, 0.5), { tone: "mid" }));
  out.push(Dt(k.corners(FLANGE, 3).map(([x, y]) => at([x, y, 3])), { size: 0.5 }));
  out.push(S(k.slabOf(BODY, 3, 21, P, 5, 0.8), { tone: "mid", inner: L(k.sideSeam(BODY, 6, P, 5), { tone: "faint" }) }));
  // cover plate on the long face, and the bolt port on the end face
  const Y = BODY.y + BODY.d;
  out.push(L(loop([[-48, Y, 10], [48, Y, 10], [48, Y, 20], [-48, Y, 20]]), { tone: "faint" }));
  out.push(Dt([[-45, Y, 12], [45, Y, 12], [-45, Y, 18], [45, Y, 18]].map(at), { size: 0.45 }));
  const X = GEO.BODY_X, [y0, y1] = GEO.BOLT_Y, [z0, z1] = GEO.BOLT_Z;
  out.push(L(loop([[X, y0 - 1.2, z0 - 1.2], [X, y1 + 1.2, z0 - 1.2], [X, y1 + 1.2, z1 + 1.2], [X, y0 - 1.2, z1 + 1.2]]), { tone: "lo" }));
  out.push(Dt([[X, y0 - 4, z1 + 2.5], [X, y1 + 4, z0 - 2.5]].map(at), { size: 0.45 }));
  // escutcheon
  out.push(S(k.slabOf(ESC, 24, 1, P, 4), { tone: "mid", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(ESC, 2), 25, P), { tone: "faint" }));
  out.push(Dt(k.corners(ESC, 4).map(([x, y]) => at([x, y, 25])), { size: 0.45 }));
  // the guard's track: a closed engraved sector round the pivot
  const [px, py] = GEO.PIVOT;
  const a0 = 270 - GEO.SWING, a1 = 270 + GEO.SWING;
  const fan = [];
  for (let a = a0; a <= a1 + 1e-9; a += 4) fan.push(polar(px, py, 17.6, a));
  fan.push(polar(px, py, 17.6, a1));
  for (let a = a1; a >= a0 - 1e-9; a -= 4) fan.push(polar(px, py, 15.6, a));
  fan.push(polar(px, py, 15.6, a0));
  out.push(L(k.onTop(fan, 25, P, true), { tone: "lo" }));
  // plugs: bezel with ticks, the collar the pad presses, the plug face
  for (const [cx, cy] of byDepth([GEO.PLUG_A, GEO.PLUG_B])) {
    out.push(S(k.cylinder(cx, cy, 13, 25, 1.2, P, 56, 0.4), { tone: "mid" }));
    const t = k.radialTicks(cx, cy, 12.6, 16, 4, 26.2, [1.1, 2.2], P);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    out.push(S(k.cylinder(cx, cy, 10, 26.2, 2.2, P, 48, 0.4), { tone: "mid", inner: L(k.sideArc(cx, cy, 10, 27.3, P, 32), { tone: "faint" }) }));
    out.push(S(k.cylinder(cx, cy, 7, 28.4, 0.6, P, 40), { tone: "hi", crease: "lo" }));
    out.push(L(k.ring(cx, cy, 6.6, GEO.PLUG_TOP, P, 40), { tone: "faint" }));
  }
  out.push(S(k.cylinder(px, py, 5, 25, 2.4, P, 28, 0.4), { tone: "mid" }));
  return out.join("");
}

// The socket the spare key rests in, and the bolt-throw ruler beside the keeper.
function extras() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(HOLD, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(HOLD, 0, GEO.HOLDER_TOP, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(HOLD, 3, P, 3), { tone: "faint" }) }));
  const [hx, hy] = GEO.HOLDER;
  out.push(L(k.ring(hx, hy, 4, GEO.HOLDER_TOP, P, 24), { tone: "lo" }));
  out.push(Dt([at([HOLD.x + 2.4, HOLD.y + 2.4, GEO.HOLDER_TOP]), at([HOLD.x + HOLD.w - 2.4, HOLD.y + HOLD.d - 2.4, GEO.HOLDER_TOP])], { size: 0.42 }));
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(72, GEO.BOLT_SHUT, 2, 5, RULER.y, 0.6, [1.8, 3.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

const START = { g: -1, turnA: 0, turnB: 0, kb: 1, tip: GEO.BOLT_SHUT };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "ca-svg",
  label: "A bench model of combined arms: a lock case with two key plugs on its top, A and B, each able to draw the same lit bolt out of a keeper on the right. A single guard pawl, pivoted between the plugs, can swing its pad onto one plug and stop it turning. With one key in the lock, the guard covers it and the bolt stays shut. With both keys in, wherever the guard swings, the other key turns and the bolt draws back. A dial on the left reads how far the bolt is drawn.",
  body: [plate(), lock(), gauge(), extras(), `<g data-part="live">${scene(k, P, START)}</g>`],
});

// ---- Battlefield view: the same state on full-bleed terrain at fire-team scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape, shown with "slice" so the ground fills the whole card at every
// width; a phone crops the sides. PF frames the visible ground rect (Fig 1's framing, re-centred on
// FG.VIEW, a point of the axis from the blue team to the enemy hole, and shrunk by its zoom).
const FW = 640, FH = 420;
const VC = [FG.O[0] + FG.VIEW.u * Math.cos(FG.ANG * RAD), FG.O[1] + FG.VIEW.u * Math.sin(FG.ANG * RAD)];
const PF = k.fitProjection([[54, -169], [212.5, 57.4], [-18.5, 219], [-177, -7.2]].map(([x, y]) => [VC[0] + (x - 17.75) / FG.VIEW.zoom, VC[1] + (y - 25.05) / FG.VIEW.zoom, 0]), FW, FH, { pad: 0, azimuth: 55, elevation: 42 });
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const START_F = { ...START, kb: 1, f: 0 };
const POSE0 = fieldPose(START_F, MODEL, TF);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}"${m.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${trSoldier(k, PF, { ...m, face: trFaceStep(m.face) })}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "ca-field",
  label: "The same idea on a battlefield, using MCDP 1's own fire-team example. At the top, a red enemy rifleman pair holds a two-man fighting position behind a low stone wall, with open ground and a wood behind it. At the bottom, the lit blue fire team lies behind a hedgerow: the automatic rifleman, prone, fires on the wall; the grenadier, with both arms in use, lobs grenades in an arc over the wall into the hole. The guard is what the enemy pair does: stay down in the hole, out of the automatic rifle's fire, where the grenades reach it; rise to fire back over the wall; or run back across the open, where the automatic rifle hits it. With one arm the grenadier is held back, and the enemy simply stays down. Greyed figures lying still are men down on both sides. Sizes, ranges and timings are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="fire" class="tr-fire"></g><path data-part="arc" class="ca-arc" d="${fieldArc(k, PF, POSE0)}"/>`],
}).replace('class="iso-svg ca-field"', 'class="iso-svg ca-field" preserveAspectRatio="xMidYMid slice"');

const CAPTION = "MCDP 1 <i>Warfighting</i> (1997, p. 94) defines combined arms as “the full integration of arms in such a way that to counteract one, the enemy must become more vulnerable to another,” and says it poses the enemy “not just with a problem, but with a dilemma—a no-win situation.” Here the guard can stop one key at a time. The guard’s reach and the turn speeds are notional.";

const LABELS = {
  machine: "Two-key lock. Left and right arrow keys swing the guard; K adds or removes key B; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys swing the guard (what the enemy guards against); K brings the grenadier in or out; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 22",
  title: "Two keys, one guard",
  hint: "Hover to swing the guard",
  readout: "1 key · guard on A · lock holds · 2 vs 0 down",
  keys: [
    { mark: "lit", label: "Bolt: drawn back means the lock is open" },
    { mark: "raised", label: "Keys A and B: two arms; the guard pawl: the defender’s shield" },
    { mark: "edge", label: "Dial: how far the bolt is drawn" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage ca-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="-100">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = "MCDP 1 <i>Warfighting</i> (1997, pp. 94–95) gives this fire-team example: “We pin an enemy down with the high-volume, direct fire of the automatic weapon, making him a vulnerable target for the grenade launcher. If he moves to escape the impact of the grenades, we engage him with the automatic weapon.” Sizes, ranges, timings and casualty counts here are notional.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Fire team (lit): automatic rifleman and grenadier" },
    { mark: "blue", label: "Fire sectors: the automatic rifle’s fan; the grenades’ impact area" },
    { mark: "red", label: "Enemy: a rifleman pair in a hole behind a low wall" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="ca-legend ca-legend-machine">${m}</div><div class="ca-legend ca-legend-field fd-keys">${fieldLegend}</div></figcaption>`)
  .replace(/&lt;(\/?)i&gt;/g, "<$1i>"); // plateHtml escapes captions; let the titles' italics through

const DATA = { P, PF, GEO, MODEL, DIAL, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = \{[\s\S]*?\n\};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, DIAL, START, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf };
const root = document.querySelector(".ca-figure");
const stage = root.querySelector(".ca-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector('[data-part="live"]');
const needleEl = svg.querySelector('[data-part="needle"]');
const readout = root.querySelector("[data-readout]");
const armsBtn = root.querySelector("#ca-arms");
const slider = root.querySelector("#ca-guard");
const fieldSvgEl = stage.querySelector(".ca-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const arcEl = fieldSvgEl.querySelector('[data-part="arc"]');
const TF = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, dt: 1 / 60, vr: 0, vg: 0 };
let stageF = null, fire = null, marksSig = "", lastPose = null;
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const S = { ...START, gT: START.g, kbT: 1, f: 0 };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
// [time, both keys in?, guard target]
const TOUR = [[0, false, -1], [2.4, true, -1], [6.4, true, 1], [9.6, true, 0], [12, false, -1], [15.5, false, -1]];
function tourAt(t) {
  t %= 15.5;
  let step = TOUR[0];
  for (const row of TOUR) if (t >= row[0]) step = row;
  return step;
}
function setArms(two) {
  S.kbT = two ? 0 : 1;
  armsBtn.setAttribute("aria-pressed", String(two));
  armsBtn.textContent = two ? "Use one arm (remove key B)" : "Use both arms (insert key B)";
}
const sideName = (g) => (held(g, -1, DATA.MODEL) ? "A" : held(g, 1, DATA.MODEL) ? "B" : "neither");
// Battlefield frame: soldiers move by translate and re-render only when their look changes; the
// fire layer writes attributes only; the fire sectors and the grenade arc redraw only when they change.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const pose = fieldPose(S, DATA.MODEL, TF, FM);
  if (still.matches) { FM.vr = 0; FM.vg = 0; }
  else if (lastPose && FM.dt > 0) {
    FM.vr += ((pose.run - lastPose.run) / FM.dt - FM.vr) * 0.3;
    FM.vg += ((S.kb - FM.kb0) / FM.dt - FM.vg) * 0.3;
  }
  FM.kb0 = S.kb;
  lastPose = pose;
  stageF.put(pose.men.map((m) => {
    const look = trLook(m) + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: m.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  const sig = String(pose.ready);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, pose); arcEl.setAttribute("d", fieldArc(K, PF, pose)); marksSig = sig; }
  fire.draw(fieldShots(pose, still.matches ? 4.37 : FM.t));
}
function draw() {
  if (view === "field") drawField();
  else {
    layer.innerHTML = scene(K, P, S);
    needleEl.setAttribute("d", needle(K, P, DIAL, S.f));
  }
  const keysIn = S.kb < 0.01 ? 2 : 1;
  const pct = Math.round(S.f * 100);
  const guard = sideName(S.g);
  const state = pct >= 99 ? "bolt open" : pct <= 1 ? "lock holds" : "bolt " + pct + "% drawn";
  const text = keysIn + (keysIn === 1 ? " key" : " keys") + " · guard on " + guard + " · " + state + " · " + downText(casualties(S.f, keysIn));
  if (readout.textContent !== text) readout.textContent = text;
  const v = Math.round(S.g * 100);
  stage.setAttribute("aria-valuenow", String(v));
  stage.setAttribute("aria-valuetext", text);
  if (document.activeElement !== slider) slider.value = String(Math.round(S.gT * 100));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const [, two, g] = tourAt(clock);
    if ((S.kbT === 0) !== two) setArms(two);
    S.gT = g;
  }
  // guard swings at up to MODEL.guardRate units of g per second, eased
  const eg = S.g + (S.gT - S.g) * (1 - Math.exp(-dt / 0.3));
  S.g = calm ? S.gT : S.g + clamp(eg - S.g, -DATA.MODEL.guardRate * dt, DATA.MODEL.guardRate * dt);
  // key B: turn back before it lifts out; travel at 1 / 1.6 s
  const inA = true, inB = S.kb < 0.01;
  const wantB = S.kbT === 1 && S.turnB > 1 ? 0 : S.kbT;
  if (wantB !== S.kb && !(S.kbT === 1 && S.turnB > 1)) S.kb = calm ? wantB : clamp(S.kb + Math.sign(wantB - S.kb) * dt / 1.6, Math.min(S.kb, wantB), Math.max(S.kb, wantB));
  const tA = keyTarget(S.g, -1, inA, DATA.MODEL);
  const tB = S.kbT === 1 ? 0 : keyTarget(S.g, 1, inB, DATA.MODEL);
  S.turnA = calm ? tA : turnToward(S.turnA, tA, dt, DATA.MODEL);
  S.turnB = calm ? tB : turnToward(S.turnB, tB, dt, DATA.MODEL);
  const open = boltOpen(S.turnA, S.turnB);
  S.tip = GEO.BOLT_SHUT + (GEO.BOLT_OPEN - GEO.BOLT_SHUT) * open;
  S.f = open;
  FM.t += dt;
  FM.dt = dt;
  draw();
  const settled = !touring && Math.abs(S.g - S.gT) < 0.001 && S.kb === S.kbT &&
    Math.abs(S.turnA - tA) < 0.05 && Math.abs(S.turnB - tB) < 0.05;
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
const steer = (g) => { S.gT = clamp(g, -1, 1); hold(); };
const toggle = () => { setArms(S.kbT === 1); hold(); };
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const r = stage.getBoundingClientRect();
  steer(((event.clientX - r.left) / r.width - 0.5) * 2.6);
});
stage.addEventListener("click", toggle);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(S.gT - 0.25);
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(S.gT + 0.25);
  else if (event.key === "k" || event.key === "K" || event.key === " " || event.key === "Enter") toggle();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
armsBtn.addEventListener("click", toggle);
slider.addEventListener("input", () => steer(Number(slider.value) / 100));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  lastPose = null;
  draw();
  run();
}
setArms(false);
setView(view, false);
window.__combinedArmsDilemma = { S, setArms, steer, setView, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the outcomes the page describes.
for (const g of [-1, -0.5, 0, 0.5, 1]) console.log(`guard ${g}: one key ${opens(g, true, false) ? "opens" : "holds"}, two keys ${opens(g, true, true) ? "open" : "hold"}`);
console.log("wrote index.html", PAGE.length, "bytes");
