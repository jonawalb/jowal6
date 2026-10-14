// Builds interactive/maneuvers/operational-pause/index.html: an isometric bench of two rams
// fed by tanks and one shared pump, made with the Anatomy kit (../../kit, MIT).
// Run: node interactive/maneuvers/operational-pause/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, initial, readout, simulate, losses } from "./model.mjs";
import { GEO, statics, compose } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, opfUnitSvg } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 380;

const PLATE = { x: -132, y: -66, w: 256, d: 132, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: 90, y: 30, w: 32, d: 20, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.TX, GEO.UY[0], GEO.HEADER_Z + 6], [GEO.TX, GEO.UY[1], GEO.HEADER_Z + 6]],
  WIDTH, HEIGHT, { pad: 20, azimuth: GEO.AZ },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

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
  // stroke ruler beside each unit's rails: home to anvil
  for (const UY of GEO.UY) {
    const strip = { x: -46, y: UY + 13, w: 86, d: 5, r: 1 };
    out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
    const t = k.topTicks(strip.x + 2, strip.x + strip.w - 2, 4, 5, strip.y + 0.6, 0.6, [1.6, 3], P);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  }
  return out.join("");
}

const STATICS = statics(k, P);
const START = initial("together");
const view = (S, extra = {}) => ({
  ram: [0, 0], fuel: S.units.map((u) => u.fuel), open: S.units.map((u) => !u.running && u.fuel < 1),
  bob: 0, give: 0, enemy: S.enemy, ...extra,
});

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "op-svg",
  label: "A bench model of an operational pause. Two rams, standing for two parts of a force, strike an anvil on springs. Each ram strokes only while the tank above it holds fuel, shown in a lit sight glass. When a tank runs dry its ram halts and one shared pump refills it. A dial reads the enemy's combat power, which falls with each strike and recovers while no ram is pushing. Pausing both rams together lets it recover; alternating the pauses keeps one ram pushing.",
  body: [plate(), `<g data-part="live">${compose(k, P, STATICS, view(START))}</g>`],
});

const CAPTION = "Joint doctrine (JP 5-0, 2020) defines an operational pause as “a temporary halt in operations” and names its primary drawback: “the risk of forfeiting strategic or operational initiative.” Here a ram halts while its tank refills. Every rate, and the enemy dial, is notional.";

// ---- Battlefield view: the same state on full-bleed terrain at operational scale (kit/terrain.mjs) ----
// The viewBox is the card's own shape (640 x 420), shown with "slice" so the ground fills the whole
// card at every width; a phone crops the sides. Friendly battalions attack left to right, as the rams do.
const FW = 640, FH = 420;
const FA = 64, FE = 42;
const RAD = Math.PI / 180;
// Four ground points that frame a screen-aligned rect centred on (cx, cy), hw unit-screen units wide each side.
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const PF = k.fitProjection(groundRect(0, 0, 196, 196 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const LOSS0 = losses("together", MODEL.pump);
const POSE0 = fieldPose(START, GEO, T, { blue: LOSS0.blue });
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${opfUnitSvg(k, PF, u, trFaceStep(u.face))}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "op-field",
  label: "The same idea on a battlefield, at operational scale, with each small vehicle standing for a platoon, each group of three for a company and each cluster of nine for a battalion. Two blue battalions attack a red enemy battalion dug in along the edge of a village on the right, its fire sector marked on the ground. Behind each blue battalion, on the left, a fuel and ammo point is staked out with tanker trucks and ammunition stacks, fed by supply trucks running from a depot down one supply road. A battalion attacks while it has fuel and ammunition, then breaks contact behind a smoke screen and pulls back to its fuel and ammo point to refuel: its pause. Paused together, both battalions leave the line at once; the enemy's supply trucks and replacement vehicles come forward and it reconstitutes. Alternating, one battalion keeps attacking while the other refuels. Knocked-out vehicles on both sides stop, grey out and smoke, and an ambulance runs casualties back. Sizes, distances, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg op-field"', 'class="iso-svg op-field" preserveAspectRatio="xMidYMid slice"');

const LABELS = {
  machine: "Operational pause bench. Left and right arrow keys set the pump rate; T pauses both rams together, A alternates the pauses; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys set the supply rate; T pauses both battalions together, A alternates the pauses; V switches to the Machine view.",
};

const card = k.plateHtml({
  fig: "Fig 13",
  title: "Operational pause",
  hint: "Click to switch pause plan",
  readout: readout(START),
  keys: [
    { mark: "lit", label: "Fuel: what each ram has left (sight glass)" },
    { mark: "raised", label: "Rams: two components of one force" },
    { mark: "edge", label: "Dial: enemy combat power (notional)" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage op-stage" tabindex="0" role="slider" aria-label="${LABELS.machine}" aria-valuemin="${MODEL.pumpRange[0]}" aria-valuemax="${MODEL.pumpRange[1]}" aria-valuenow="${MODEL.pump}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = CAPTION.replace("Here a ram halts while its tank refills. Every rate, and the enemy dial, is notional.", "Here a battalion halts at its fuel and ammo point while it refuels. Unit sizes, distances, rates, timings and losses are notional.");
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Attacking battalion: in contact with the enemy, lit" },
    { mark: "blue", label: "Friendly: two battalions, fuel and ammo points, supply trucks" },
    { mark: "red", label: "Enemy: a battalion holding the village" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="op-legend op-legend-machine">${m}</div><div class="op-legend op-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\nGEO\.DIAL\.top[^\n]*\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, LABELS } = DATA;
const GEO = DATA.GEO;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, haloOf, insetPlan, planOutline, corners, ring, radialTicks, topTicks, faceTextSvg, topMatrix };
const M = { ...DATA.MODEL };
const root = document.querySelector(".op-figure");
const stage = root.querySelector(".op-stage");
const svg = stage.querySelector(".op-svg");
const layer = svg.querySelector('[data-part="live"]');
const readEl = root.querySelector("[data-readout]");
const btnT = root.querySelector("#op-together");
const btnA = root.querySelector("#op-alternate");
const slider = root.querySelector("#op-pump");
const pumpOut = root.querySelector("#op-pump-out");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const STATICS = statics(K, P);
const S = initial("together");
// Battlefield view: the field SVG, the view toggle and what the page measures between frames.
const fieldSvgEl = stage.querySelector(".op-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const lossEl = root.querySelector("#op-losses");
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
const HINTS = { machine: "Click to switch pause plan", field: "Click to switch pause plan" };
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, pull: S.units.map(fieldPullTarget), vel: [0, 0], sup: 0, trip: [0, 1, 2].map((i) => ({ k: -1, tgt: i % 2 })), fill: Array(9).fill(1), regen: 0, blue: 0 };
let view = "machine", stageF = null, fire = null, lossKey = "", outPrev = null;
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const V = { ram: [0, 0], fuel: [1, 1], open: [false, false], bob: 0, give: 0, enemy: 1 };
let frozen = false, touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0, wall = 0, give = 0;
const TOUR = [[0, "together"], [8.1, "alternate"]];
const LOOP = 16.2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function showMode() {
  btnT.setAttribute("aria-pressed", String(S.mode === "together"));
  btnA.setAttribute("aria-pressed", String(S.mode === "alternate"));
}
function useMode(mode) { if (S.mode !== mode) setMode(S, mode); showMode(); }
function showPump() {
  pumpOut.textContent = M.pump.toFixed(2) + " tank/s";
  if (document.activeElement !== slider) slider.value = String(M.pump);
  stage.setAttribute("aria-valuenow", M.pump.toFixed(2));
}
// Advance what the battlefield measures between frames: each battalion's pull-back toward its FAP
// (eased, speed-limited) and its speed, the supply trucks' trips, enemy replacements and resupply.
function fieldUpdate(dt, calm) {
  FM.t += dt;
  S.units.forEach((u, b) => {
    const want = fieldPullTarget(u), prev = FM.pull[b];
    const next = calm ? want : prev + clamp((want - prev) * (1 - Math.exp(-dt / 0.3)), -0.75 * dt, 0.75 * dt);
    FM.pull[b] = next;
    FM.vel[b] = calm || !dt ? 0 : FM.vel[b] + ((next - prev) / dt - FM.vel[b]) * (1 - Math.exp(-dt / 0.15));
  });
  FM.sup += dt * M.pump / FG.TRIP;
  const refilling = S.units.map((u, b) => (!u.running && u.fuel < 1 ? b : -1)).filter((b) => b >= 0);
  FM.trip.forEach((tr, i) => {
    const k = Math.floor(FM.sup + i / 3);
    if (k === tr.k) return;
    tr.k = k;
    if (refilling.length === 1) tr.tgt = refilling[0];
    else if (refilling.length === 2) tr.tgt = i % 2;
  });
  const outN = Math.min(8, Math.round(9 * (1 - S.enemy)));
  const out = new Set(OPF_RED_ORDER.slice(0, outN));
  for (let s = 0; s < 9; s++) {
    if (out.has(s)) FM.fill[s] = 1;
    else if (outPrev && outPrev.has(s) && !calm) FM.fill[s] = 0;
    else FM.fill[s] = calm ? 1 : Math.min(1, FM.fill[s] + dt / FG.REPLACE);
  }
  outPrev = out;
  const rg = S.units.some((u) => u.running) ? 0 : 1;
  FM.regen = calm ? rg : FM.regen + (rg - FM.regen) * (1 - Math.exp(-dt / 0.8));
}
// Battlefield frame: vehicles move by translate and re-render only when their look changes
// (a 15° facing step, knocked out, lit); the fire layer writes attributes only.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  if (still.matches) fieldUpdate(0, true);
  const pose = fieldPose(S, GEO, T, FM);
  stageF.put(pose.units.map((u) => {
    const f = trFaceStep(u.face), shape = u.kind + "|" + f + (u.out ? "|x" : "");
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look: shape + (u.lit ? "|l" : ""), side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(shape)) LOOKS.set(shape, opfUnitSvg(K, PF, u, f)); return LOOKS.get(shape); } };
  }));
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function showLosses() {
  const key = S.mode + M.pump.toFixed(2);
  if (key === lossKey) return;
  lossKey = key;
  const ls = losses(S.mode, M.pump, M);
  FM.blue = ls.blue;
  lossEl.textContent = "Notional losses in the first minute of this plan: " + ls.blue + " friendly, " + ls.red + " enemy vehicle" + (ls.red === 1 ? "" : "s");
}
function draw() {
  V.fuel = S.units.map((u) => u.fuel);
  V.open = S.units.map((u) => !u.running && u.fuel < 1);
  V.enemy = S.enemy;
  showLosses();
  if (view === "field") drawField();
  else layer.innerHTML = compose(K, P, STATICS, V);
  const text = readout(S);
  if (readEl.textContent !== text) readEl.textContent = text;
  stage.setAttribute("aria-valuetext", text + " · pump " + M.pump.toFixed(2) + " tank/s");
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) {
    clock = (clock + dt) % LOOP;
    let mode = TOUR[0][1];
    for (const row of TOUR) if (clock >= row[0]) mode = row[1];
    useMode(mode);
  }
  const hits = step(S, dt, M);
  wall += dt;
  if (hits) give = 1.4;
  give *= Math.exp(-dt / 0.12);
  V.give = give;
  V.ram = S.units.map((u) => (u.running ? ramAt(u.phase) : 0));
  V.bob = plungerAt(wall, S.units.some((u) => !u.running && u.fuel < 1));
  fieldUpdate(dt, false);
  draw();
  frame = visible && !frozen ? requestAnimationFrame(tick) : 0;
}
// Reduced motion: no animation; each change jumps to the state 12 s later, rams at home.
function jump() {
  for (let i = 0; i < 12 * 60; i++) step(S, 1 / 60, M);
  V.ram = [0, 0]; V.bob = 0; V.give = 0;
  draw();
}
const run = () => { if (still.matches) { draw(); return; } if (!frame && visible && !frozen) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  if (still.matches) { jump(); return; }
  idle = setTimeout(() => { touring = !still.matches; clock = 0; M.pump = DATA.MODEL.pump; showPump(); run(); }, 9000);
  run();
};
const pick = (mode) => { useMode(mode); hold(); };
const pump = (v) => { M.pump = clamp(Math.round(v * 100) / 100, M.pumpRange[0], M.pumpRange[1]); showPump(); hold(); };
function setView(next, save) {
  view = next === "field" ? "field" : "machine";
  root.setAttribute("data-view", view);
  viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  hintEl.textContent = HINTS[view];
  stage.setAttribute("aria-label", LABELS[view]);
  if (save) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  draw();
  run();
}
stage.addEventListener("click", () => pick(S.mode === "together" ? "alternate" : "together"));
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") pump(M.pump + 0.05);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") pump(M.pump - 0.05);
  else if (event.key === "t" || event.key === "T") pick("together");
  else if (event.key === "a" || event.key === "A") pick("alternate");
  else if (event.key === " " || event.key === "Enter") pick(S.mode === "together" ? "alternate" : "together");
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
btnT.addEventListener("click", () => pick("together"));
btnA.addEventListener("click", () => pick("alternate"));
slider.addEventListener("input", () => pump(Number(slider.value)));
viewBtns.forEach((b) => b.addEventListener("click", (event) => { event.stopPropagation(); setView(b.dataset.view, true); }));
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run(); else if (frame) { cancelAnimationFrame(frame); frame = 0; }
}, { rootMargin: "120px 0px" }).observe(stage);
showMode(); showPump(); setView(view, false);
window.__operationalPause = { S, M, FM, pick, pump, setView, draw, view: () => view, stop: () => { touring = false; frozen = true; clearTimeout(idle); if (frame) cancelAnimationFrame(frame); frame = 0; } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
const tog = simulate("together", 60).trace, alt = simulate("alternate", 60).trace;
const at60 = (tr) => Math.round(tr.at(-1).enemy * 100);
console.log("losses together", JSON.stringify(losses("together")), "alternate", JSON.stringify(losses("alternate")), "field units", POSE0.units.length);
console.log("together E@60s", at60(tog), "alternate E@60s", at60(alt), "solids", (svg.match(/class="iso-solid/g) || []).length, "wrote index.html", PAGE.length, "bytes");
