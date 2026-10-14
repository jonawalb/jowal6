// Builds interactive/maneuvers/decisive-points/index.html: an isometric stone arch on a bench,
// held up by four pinned props whose pins can be pulled one at a time, with a dial indicator
// reading the keystone's load. Made with the Anatomy kit (../../kit, MIT).
// Run: node interactive/maneuvers/decisive-points/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, keyLoad, failingSets } from "./model.mjs";
import { GEO, scene, meetAngle, propGeo } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trVehicle, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, fieldPoints, dfTruck } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");
const RAD = Math.PI / 180;

const WIDTH = 640;
const HEIGHT = 400;

const PLATE = { x: -34, y: -74, w: 78, d: 148, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: 29, y: -67, w: 13, d: 30, r: 1.5 };
const RULER = { x: 35, y: 37, w: 6, d: 30, r: 1 };
const TRAY = { x: 9, y: -27, w: 18, d: 54, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, 0, GEO.DIAL_Z + 1], [GEO.STAND_X, 0, 84]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 34, elevation: 36 },
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
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[20, 4.5], [14, 7], [17, 9.5]].forEach(([len, dx]) => out.push(L(k.lineOnTop([LABEL.x + dx, LABEL.y + 5], [LABEL.x + dx, LABEL.y + 5 + len], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  // ruler strip, mm
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RULER.y + 2, RULER.y + RULER.d - 2, 2, 5, RULER.x, 0.6, [1.6, 3], P, "y");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

// The pin tray in front of the props: floor, back rim and far side rim. The front and near side
// rims are drawn in the live layer, after the pins that land in the tray.
function tray() {
  const out = [];
  out.push(S(k.slabOf(TRAY, 0, GEO.FLOOR, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(TRAY, 2.6), GEO.FLOOR, P), { tone: "faint" }));
  out.push(S(k.slabOf({ x: TRAY.x, y: TRAY.y, w: 1.5, d: TRAY.d, r: 0.5 }, 0, 3.2, P, 2, 0.3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: TRAY.x + 1.5, y: TRAY.y, w: TRAY.w - 3, d: 1.5, r: 0.4 }, GEO.FLOOR, 2.2, P, 2), { tone: "lo" }));
  return out.join("");
}
function trayFront() {
  return S(k.slabOf({ x: TRAY.x + 1.5, y: TRAY.y + TRAY.d - 1.5, w: TRAY.w - 3, d: 1.5, r: 0.4 }, GEO.FLOOR, 2.2, P, 2), { tone: "lo" }) +
    S(k.slabOf({ x: TRAY.x + TRAY.w - 1.5, y: TRAY.y, w: 1.5, d: TRAY.d, r: 0.5 }, 0, 3.2, P, 2, 0.3), { tone: "lo" });
}

const HOLD = 0.3 * meetAngle();  // the unpropped halves sag in a little, well short of each other (notional)
const D_KEY = GEO.PZ + GEO.R1 * Math.cos(GEO.HALF * Math.PI / 180) - GEO.PAD;
const START = { props: [0, 0, 0, 0], kdrop: 0, leanL: 0, leanR: 0, plunge: 0, needle: keyLoad([0, 0, 0, 0]) / MODEL.dialMax };
const live0 = scene(k, P, MODEL, START);
const FRONT = trayFront();

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "dp-svg",
  label: "A bench model of a stone arch on two piers, with a lit keystone at the crown. Four steel props stand under the arch, two under the stones beside the keystone and two further out, each held up by a pin through its collar. A dial indicator on a stand rests on the keystone and reads its load. Pulling a pin drops that prop and sends its share of the load into the keystone; when the keystone's load reaches its capacity it drops onto a pad below and the unpropped halves sag.",
  body: [plate(), tray(), `<g data-part="live">${live0}</g>`, `<g data-part="front">${FRONT}</g>`],
});

const CAPTION = "Joint doctrine (JP 5-0, 2020) defines a decisive point as “key terrain, key event, critical factor, or function that, when acted upon, enables commanders to gain a marked advantage over an enemy or contribute materially to achieving success.” The props stand in for decisive points and the keystone for the center of gravity. Loads are notional teaching values, not data.";

// ---- Battlefield view: the same state on full-bleed terrain at operational scale (kit/terrain.mjs) ----
// The viewBox is the card's shape (640 x 420), shown with "slice" so the ground fills the whole card at
// every width. Layout in field-scene.mjs is screen-aligned for this azimuth.
const FW = 640, FH = 420;
const FA = 55, FE = 42;
// Four ground points that frame a screen-aligned rect centred on (cx, cy), hw unit-screen units wide each side.
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const PF = k.fitProjection(groundRect(0, -22, 196, 196 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const TF = fieldTerrain();
const FIELD = fieldStatic(k, PF, TF);
const POSE0 = fieldPose({ props: [0, 0, 0, 0], failed: false }, GEO, TF);
const unitSvg = (u) => u.kind === "t" ? dfTruck(k, PF, trFaceStep(u.face)) : trVehicle(k, PF, trFaceStep(u.face));
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${unitSvg(u)}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "dp-field",
  label: "The same idea on a battlefield at operational scale, with each small vehicle standing for a platoon and each group of three for a company. Across the middle, red enemy mechanized companies are dug in on an arc. Four of them, left to right, hold four decisive points, each with its fire sector marked on the ground: a hill, the bridge where the enemy's road crosses a river, a village on the southern road, and an airfield with a runway and hangars. Behind them, at a crossroads by a supply depot, waits the lit red tank-battalion reserve, standing for the center of gravity. At the bottom, blue teams of two companies wait behind a chalk line of departure. Seizing a point sends a blue team forward with fire; one blue platoon is stopped short and one red platoon is stopped at the point, both greyed with thin smoke; the rest of the red company pulls back to the crossroads, an ambulance shuttles casualties back, and the reserve's companies leave the crossroads to block the lost point. Lose the bridge and the village together and the reserve and every company still in place pull back off the map, leaving vehicles behind. Sizes, distances, timings and casualties are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, TF, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg dp-field"', 'class="iso-svg dp-field" preserveAspectRatio="xMidYMid slice"');

const LABELS = {
  machine: "Arch model. Keys 1 to 4 pull or reset the pins of the four props, left to right; R resets everything; V switches to the Battlefield view.",
  field: "Battlefield. Keys 1 to 4 seize or give back the four decisive points, left to right: hill, bridge, village, airfield; R resets everything; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 8",
  title: "Decisive points",
  hint: "Click a prop to pull its pin",
  readout: "",
  keys: [
    { mark: "lit", label: "Keystone: the center of gravity" },
    { mark: "raised", label: "Pinned props: decisive points" },
    { mark: "edge", label: "Dial: keystone load, % of capacity" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage dp-stage" tabindex="0" role="group" aria-label="${LABELS.machine}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = "Joint doctrine (JP 5-0, 2020) names “a hill” and “an air base” among its examples of decisive points. In this model the red tank-battalion reserve is the center of gravity and the keystone of the bench. Unit sizes, distances, timings and casualties are notional.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Enemy tank-battalion reserve at the crossroads: the center of gravity" },
    { mark: "red", label: "Enemy companies holding the decisive points" },
    { mark: "blue", label: "Friendly teams seizing them; greyed = stopped" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="dp-legend dp-legend-machine">${m}</div><div class="dp-legend dp-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DP_FIELD = fieldPoints().map(([x, y]) => k.iso([x, y, TF.height(x, y) + 2], PF));
const DATA = { P, PF, GEO, MODEL, START, HOLD, D_KEY, LABELS, DP_FIELD, PIN_AT: GEO.PROPS.map((p) => k.iso([0, p.y, p.ZC + 1.5], P)) };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n\};\nGEO\.TEND[^\n]*\n[\s\S]*?\n\];\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, HOLD, D_KEY, PIN_AT, DP_FIELD, LABELS } = DATA;
const GEO = DATA.GEO, M = DATA.MODEL;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, slabOf, sideSeam, sideRing, sideArc, cylinder, knurl, ring, lineOnTop, onTop, haloOf, corners, segment, planOutline, insetPlan, radialTicks };
const root = document.querySelector(".dp-figure");
const stage = root.querySelector(".dp-stage");
const svg = stage.querySelector(".dp-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const resetBtn = root.querySelector("#dp-reset");
const pinBtns = [...root.querySelectorAll("[data-pin]")];
const fieldSvgEl = stage.querySelector(".dp-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const TF = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, col: 0, dir: [1, 1, 1, 1] };
let stageF = null, fire = null, marksSig = "";
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
const HINTS = { machine: "Click a prop to pull its pin", field: "Click a point to seize it" };
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const T_FALL = Math.sqrt(2 * D_KEY / GEO.G);
const S = { props: [0, 0, 0, 0], target: [0, 0, 0, 0], c: 0, failed: false, resetting: false, needle: DATA.START.needle };
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
const TOUR = [[0, "reset"], [1.5, 0], [3.5, 3], [5.5, 1], [9, 2], [13.5, "reset"]];
const TOUR_LEN = 17.5;
let tourStep = -1;
const outs = () => S.props.map((p) => propState(p, M).out);
function reset() {
  if (!S.failed && S.target.every((t) => t === 0) && S.props.every((p) => p === 0)) return;
  S.resetting = true;
}
function toggle(i) {
  if (S.failed || S.resetting) { reset(); return; }
  S.target[i] = S.target[i] ? 0 : 1;
}
// Battlefield frame: vehicles move by translate and re-render only when their facing crosses a 15°
// step; the fire layer writes attributes only; the fire sectors redraw only when the state moves them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF, { smoke: 64 }); }
  const pose = fieldPose(S, GEO, TF, FM);
  stageF.put(pose.units.map((u) => {
    const f = trFaceStep(u.face), look = u.side + "|" + (u.kind || "v") + "|" + f;
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, u.kind === "t" ? dfTruck(K, PF, f) : trVehicle(K, PF, f)); return LOOKS.get(look); } };
  }));
  const sig = pose.held.map((h) => h.toFixed(2)).join("|") + "|" + pose.col.toFixed(2);
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, TF, pose); marksSig = sig; }
  const tt = still.matches ? 4.37 : FM.t, shots = trShots(pose.streams, tt);
  shots.smoke = fieldSmoke(pose, tt).concat(shots.smoke);
  fire.draw(shots);
  return pose;
}
function draw() {
  const c = S.c;
  const kdrop = c > 0 ? D_KEY * Math.min(1, (c / T_FALL) ** 2) : 0;
  const o = outs();
  const leanOf = (outer) => (c > GEO.T_LEAN0 && o[outer] > 0.99 ? HOLD * Math.min(1, ((c - GEO.T_LEAN0) / GEO.T_LEAN) ** 2) : 0);
  let pose = null;
  if (view === "field") pose = drawField();
  else layer.innerHTML = scene(K, P, M, { props: S.props, kdrop, leanL: leanOf(0), leanR: leanOf(3), plunge: c > 0 ? -3 * Math.min(1, c / 0.12) : 0, needle: S.needle });
  const load = keyLoad(o, M);
  const n = S.props.filter((p) => p >= 0.45).length;
  let text = S.resetting ? "Resetting the props"
    : S.failed ? "Keystone failed at " + M.cap + "% · crown down"
    : n + " of 4 pins out · keystone " + Math.round(load) + "%";
  if (pose) text = S.resetting ? "Resetting the points"
    : (S.failed ? "Hub gave at " + M.cap + "%" : n + " of 4 seized · load " + Math.round(load) + "%") + " · " + pose.cas.atk + " vs " + pose.cas.def + " down";
  if (readout.textContent !== text) readout.textContent = text;
  pinBtns.forEach((b, i) => b.setAttribute("aria-pressed", S.target[i] ? "true" : "false"));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    if (clock >= TOUR_LEN) { clock = 0; tourStep = -1; }
    let idx = 0;
    TOUR.forEach((row, i) => { if (clock >= row[0]) idx = i; });
    if (idx !== tourStep) {
      tourStep = idx;
      const v = TOUR[idx][1];
      if (v === "reset") reset(); else if (!S.failed && !S.resetting) S.target[v] = 1;
    }
  }
  if (S.resetting) {
    if (S.c > 0) S.c = calm ? 0 : Math.max(0, S.c - dt);
    if (S.c === 0) { S.failed = false; S.target = [0, 0, 0, 0]; }
  }
  {
    const rate = dt / 1.3;
    S.props = S.props.map((p, i) => {
      const t = S.target[i];
      if (t !== p) FM.dir[i] = t > p ? 1 : -1;
      if (calm) return t;
      return t > p ? Math.min(t, p + rate) : Math.max(t, p - rate);
    });
  }
  if (S.resetting && S.c === 0 && S.props.every((p) => p === 0)) S.resetting = false;
  const load = keyLoad(outs(), M);
  if (!S.failed && !S.resetting && fails(outs(), M)) { S.failed = true; S.c = 0; }
  if (S.failed && !S.resetting) S.c = calm ? GEO.TEND : Math.min(GEO.TEND, S.c + dt);
  const want = S.failed ? 0 : dialShare(load, M);
  S.needle = calm ? want : S.needle + (want - S.needle) * (1 - Math.exp(-dt / 0.2));
  if (Math.abs(S.needle - want) < 0.0005) S.needle = want;
  FM.t += dt;
  const colWant = S.failed && !S.resetting ? 1 : 0;
  FM.col = calm ? colWant : colWant > FM.col ? Math.min(1, FM.col + dt / 2.6) : Math.max(0, FM.col - dt / 1.3);
  draw();
  const settled = !touring && S.needle === want && S.props.every((p, i) => p === S.target[i]) && !S.resetting && (!S.failed || S.c >= GEO.TEND);
  // the battlefield keeps firing while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && (!calm || FM.col !== colWant))) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; tourStep = -1; run(); }, 9000);
  run();
};
function nearestPin(event) {
  const el = view === "field" ? fieldSvgEl : svg;
  const pt = el.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const m = el.getScreenCTM();
  if (!m) return -1;
  const p = pt.matrixTransform(m.inverse());
  let best = -1, bestD = view === "field" ? 90 : 60;
  if (view === "field") DP_FIELD.forEach(([x, y], i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bestD) { bestD = d; best = i; } });
  else PIN_AT.forEach(([x, y], i) => { const d = Math.abs(p.x - x) + 0.35 * Math.abs(p.y - y); if (d < bestD) { bestD = d; best = i; } });
  return best;
}
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  stage.setAttribute("aria-label", LABELS[view]);
  pinBtns.forEach((b, i) => { b.dataset.machine ??= b.textContent; b.textContent = view === "field" ? (i + 1) + " · " + ["Hill", "Bridge", "Village", "Airfield"][i] : b.dataset.machine; });
  resetBtn.dataset.machine ??= resetBtn.textContent;
  resetBtn.textContent = view === "field" ? "Reset the points" : resetBtn.dataset.machine;
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
stage.addEventListener("pointerup", (event) => {
  if (S.failed || S.resetting) { reset(); hold(); return; }
  const i = nearestPin(event);
  if (i >= 0) { toggle(i); hold(); }
});
stage.addEventListener("keydown", (event) => {
  const n = Number(event.key);
  if (n >= 1 && n <= 4) toggle(n - 1);
  else if (event.key === "r" || event.key === "R") reset();
  else if (event.key === "v" || event.key === "V") { setView(view === "field" ? "machine" : "field", true); event.preventDefault(); return; }
  else return;
  hold();
  event.preventDefault();
});
pinBtns.forEach((b) => b.addEventListener("click", () => { toggle(Number(b.dataset.pin)); hold(); }));
resetBtn.addEventListener("click", () => { reset(); hold(); });
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setView(view, false);
window.__decisivePoints = { S, toggle, reset, setView, view: () => view, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
console.log("loads:", [[0, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 1], [1, 1, 0, 1], [0, 1, 1, 0], [1, 1, 1, 1]].map((s) => s.join("") + "→" + keyLoad(s)).join(" "));
console.log("failing sets:", failingSets().map((s) => s.join("")).join(" "));
console.log("props:", GEO.PROPS.map((p) => JSON.stringify(propGeo(p), (key, v) => (typeof v === "number" ? +v.toFixed(2) : v))).join(" "));
console.log("hold", (HOLD * 180 / Math.PI).toFixed(2), "° key drop", D_KEY.toFixed(1), "wrote index.html", PAGE.length, "bytes");
