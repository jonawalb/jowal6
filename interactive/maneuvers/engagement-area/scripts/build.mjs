// Builds interactive/maneuvers/engagement-area/index.html: an isometric chute-table bench made with the
// Anatomy kit (../../kit, MIT) plus a company-defense Battlefield view (../../kit/terrain.mjs).
// Run: node interactive/maneuvers/engagement-area/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, STEPS, allSteps, newRun, simulate, readoutField, readoutMachine } from "./model.mjs";
import { GEO, ZA, benchY, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic, fdPoly } from "../../kit/field.mjs";
import { TERRAIN_CSS, trSoldier, trFaceStep, trVehicle } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose } from "./field-scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 420;

const PLATE = { x: -88, y: -104, w: 184, d: 196, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: -80, y: 68, w: 26, d: 12, r: 1.5 };

const G = GEO;
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-G.X, G.Y0, ZA(G.Y0) + 6], [G.X, G.Y0, ZA(G.Y0) + 6], [G.DIAL.x, G.DIAL.y, G.DIAL.top + 2]],
  WIDTH, HEIGHT, { pad: 14, azimuth: 72, elevation: 34 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const onSlope = (pts, lift = 0.05) => k.pathOf(pts.map(([x, y]) => k.iso([x, y, ZA(y) + lift], P)));

// The base: plate on feet, groove, screws, label plate, the sloped chute table with its two lanes,
// the distance scale along its edge, the hopper at the head and the parapet at the foot.
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
  [[18, 3.5], [12, 6], [15, 8.5]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  // the table: a wedge, high at the hopper end
  const X = G.X, y0 = G.Y0, y1 = G.Y1;
  const q = (y, z) => [[-X, y, z], [X, y, z]];
  const [a0, a1] = q(y0, 0), [b0, b1] = q(y1, 0), [c0, c1] = q(y0, ZA(y0)), [d0, d1] = q(y1, ZA(y1));
  out.push(fdPoly(k, P, [[a0, a1, b1, b0], [c0, c1, d1, d0], [a0, a1, c1, c0], [b0, b1, d1, d0], [a0, b0, d0, c0], [a1, b1, d1, c1]], { tone: "mid" }));
  out.push(L(k.pathOf([[-X + 4, y0 + 3], [X - 4, y0 + 3], [X - 4, y1 - 3], [-X + 4, y1 - 3]].map(([x, y]) => k.iso([x, y, ZA(y) + 0.05], P)), true), { tone: "faint" }));
  // the two lanes: floor lines either side of each lane's centre
  for (const lx of [G.LANE.A, G.LANE.B]) {
    out.push(L(onSlope([[lx - G.LW / 2 + 1, y0 + 14], [lx - G.LW / 2 + 1, y1 - 12]]), { tone: "faint" }));
    out.push(L(onSlope([[lx + G.LW / 2 - 1, y0 + 14], [lx + G.LW / 2 - 1, y1 - 12]]), { tone: "faint" }));
    out.push(L(onSlope([[lx, y0 + 14], [lx, y1 - 12]]), { tone: "faint" }));
  }
  // the distance scale along the right edge: a ruler strip with a tick every 50 m, a long one every 100
  {
    const sx0 = X - 8, sx1 = X - 3, ya = benchY(0) + 6, yb = benchY(400) - 6;
    const lo = (y) => ZA(y) - 0.3, hi = (y) => ZA(y) + 0.6;
    const v = (x, y, f) => [x, y, f(y)];
    const [a0, a1, b0, b1] = [v(sx0, yb, lo), v(sx1, yb, lo), v(sx0, ya, lo), v(sx1, ya, lo)];
    const [c0, c1, d0, d1] = [v(sx0, yb, hi), v(sx1, yb, hi), v(sx0, ya, hi), v(sx1, ya, hi)];
    out.push(fdPoly(k, P, [[a0, a1, b1, b0], [c0, c1, d1, d0], [a0, a1, c1, c0], [b0, b1, d1, d0], [a0, b0, d0, c0], [a1, b1, d1, c1]], { tone: "mid", crease: "none" }));
    const ticks = [], majors = [];
    for (let m = 0; m <= 400; m += 50) {
      const y = benchY(m), len = m % 100 === 0 ? 2.5 : 1.6;
      const seg = [[sx0 - len, y], [sx0, y]].map(([x, yy]) => k.iso([x, yy, ZA(yy) + 0.6], P));
      (m % 100 === 0 ? majors : ticks).push(k.pathOf(seg));
    }
    out.push(L(k.pathOf([[sx0, ya], [sx0, yb]].map(([x, yy]) => k.iso([x, yy, ZA(yy) + 0.6], P))), { tone: "lo" }));
    out.push(L(ticks.join(""), { tone: "lo" }), L(majors.join(""), { tone: "mid" }));
  }
  // the hopper at the head of the lanes, over the enemy's start
  {
    const hy0 = y0 + 2, hy1 = y0 + 14, z = ZA(hy1) - 0.5;
    out.push(S(k.slabOf({ x: -X + 8, y: hy0, w: 2 * X - 16, d: hy1 - hy0, r: 1.5 }, z, 6, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam({ x: -X + 8, y: hy0, w: 2 * X - 16, d: hy1 - hy0, r: 1.5 }, z + 3, P, 3), { tone: "faint" }) }));
    for (const lx of [G.LANE.A, G.LANE.B]) out.push(S(k.slabOf({ x: lx - 6, y: hy1 - 0.8, w: 12, d: 1.6, r: 0.3 }, z, 4, P, 1), { tone: "lo", crease: "none" }));
    out.push(Dt(k.corners({ x: -X + 8, y: hy0, w: 2 * X - 16, d: hy1 - hy0 }, 3).map(([x, y]) => at([x, y, z + 6])), { size: 0.42 }));
  }
  // the parapet at the foot: the defenders' end, sandbag courses on a low wall
  {
    const B = { x: -X + 4, y: y1 - 12, w: 2 * X - 8, d: 9, r: 1.5 };
    out.push(S(k.slabOf(B, ZA(y1 - 12), 4, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(B, ZA(y1 - 12) + 2, P, 3), { tone: "faint" }) }));
    for (let i = 0; i < 7; i++) out.push(S(k.slabOf({ x: B.x + 3 + i * 16.5, y: B.y + 1.5, w: 13, d: 6, r: 2.2 }, ZA(y1 - 12) + 4, 2.2, P, 3, 0.3), { tone: "mid" }));
  }
  return out.join("");
}

const RUN0 = newRun(allSteps());
const S0 = (run, b) => ({ x: run.x, b, lane: "A", down: run.downE, downN: run.downE.length, downF: run.released ? Math.max(1, run.downF) : 0, t: 0, firing: 0, steps: run.steps, enemy: MODEL.enemy, released: run.released, leadY: null });
const B1 = [1, 1, 1, 1, 1, 1, 1];
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "ea-svg",
  label: "A bench model of engagement area development. A sloped chute table has two lanes, the avenues of approach, running from a hopper at the high end down to a parapet at the low end. The seven steps build parts onto it in the manual's order: raised rails on both lanes, a chevron on the lane the enemy will take, a lit kill zone with a trigger sill and three stakes, six weapon blocks beside the lane, rows of pegs, a gantry of pins over the lane, and a sync bar linking the blocks. A column of twelve balls, the enemy, is released and rolls down the lane; balls inside the kill zone are knocked down, one by one, and stay where they fell. A dial reads how many are down, and a rack of twelve pegs shows the defenders lost. A step left out takes its part away and the column gets through. Unit sizes, speeds, rates and losses are notional.",
  body: [plate(), `<g data-part="live">${scene(k, P, S0(RUN0, B1))}</g>`],
});

// ---- Battlefield view: the same run on full-bleed terrain at company scale ----
const FW = 640, FH = 420;
const AZ = 80 * Math.PI / 180, EL = 42 * Math.PI / 180;
const KK = FW / 320, DU = 320, DV = FH / (KK * Math.sin(EL));
const CEN = [-16, -45];
const uc = CEN[0] * Math.sin(AZ) - CEN[1] * Math.cos(AZ), vc = CEN[0] * Math.cos(AZ) + CEN[1] * Math.sin(AZ);
const toWorld = (u, v) => [u * Math.sin(AZ) + v * Math.cos(AZ), -u * Math.cos(AZ) + v * Math.sin(AZ), 0];
const PF = k.fitProjection([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => toWorld(uc + a * DU / 2, vc + b * DV / 2)), FW, FH, { pad: 0, azimuth: 80, elevation: 42 });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose({ ...RUN0, b: B1 }, T);
const menItems = POSE0.men.map((m) => {
  const [sx, sy] = k.iso([m.x, m.y, m.z], PF);
  const inner = m.veh ? trVehicle(k, PF, trFaceStep(m.face)) : trSoldier(k, PF, { ...m, face: trFaceStep(m.face) });
  return { key: k.depthOf([m.x, m.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${m.side}" transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${inner}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "ea-field",
  label: "The same idea on a battlefield, a company area defense seen from behind. Two avenues of approach run down the valley either side of a wooded rise. As each step is built, its marks appear on the ground: the avenues are tinted, a red arrow shows the enemy's most likely COA (course of action) down the left one, a lit chalk engagement area with a trigger line and three target reference points is laid on it, three platoons move from an assembly area into battle positions with sectors of fire, two rows of wire cross the avenue, and a mortar section and an observer join with the fires. A soldier walks the avenue in the rehearsal. Then a red column of six vehicles and six dismounts comes down the avenue into the engagement area and is destroyed there; leave a step out and it shows. Sizes, ranges, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...menItems])}</g><g data-part="bursts" class="ea-bursts"></g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg ea-field"', 'class="iso-svg ea-field" preserveAspectRatio="xMidYMid slice" data-lane="A" data-b1="1" data-b2="1" data-b3="1" data-b4="1" data-b5="1" data-b6="1" data-b7="1"');

const CAPTION = "Army doctrine (ATP 3-21.10, 1 June 2026) lists seven steps of engagement area (EA) development: identify likely enemy avenues of approach; identify the most likely enemy COA (course of action); determine where to kill the enemy; position subordinate forces and weapons systems; plan and integrate obstacles; plan and integrate fires; rehearse the execution of operations within the EA. The bench builds them in that order. Unit sizes, speeds, rates and losses are notional.";
const FIELD_CAPTION = "The same seven steps, in the same order, on the ground. Unit sizes, ranges, timings and losses are notional.";

const LABELS = {
  machine: "Engagement area bench. Keys 1 to 7 toggle the steps; N builds the next step; Space releases the enemy; V switches to the Battlefield view.",
  field: "Battlefield. Keys 1 to 7 toggle the steps; N builds the next step; Space releases the enemy; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 41",
  title: "Engagement area development",
  hint: "Click: next step, then release",
  readout: "",
  keys: [
    { mark: "lit", label: "The kill zone: the engagement area, built in step 3" },
    { mark: "raised", label: "Weapon blocks, pegs and gantry: steps 4, 5 and 6" },
    { mark: "edge", label: "The enemy column: twelve balls" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage ea-stage" tabindex="0" role="group" aria-label="${LABELS.field}">${svg}${fieldSvg}</div>`,
});
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "blue", label: "Friendly: three platoons in battle positions, a mortar section" },
    { mark: "red", label: "Enemy: six vehicles and six dismounts, two avenues" },
    { mark: "dashed", label: "Chalk: the engagement area, trigger line, battle positions" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="ea-legend ea-legend-machine">${m}</div><div class="ea-legend ea-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, LABELS, STEPS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, LABELS } = DATA;
const K = { depthOf, iso, cameraOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg, faceTextSvg, extrude, towardViewer, pathOf, onTop, cylinder, knurl, slabOf, sideSeam, sideArc, lineOnTop, coil, ring, corners, insetPlan, planOutline, topMatrix, topTicks, haloOf, radialTicks };
const root = document.querySelector(".ea-figure");
const stage = root.querySelector(".ea-stage");
const svg = stage.querySelector(".ea-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const nextBtn = root.querySelector("#ea-next");
const goBtn = root.querySelector("#ea-go");
const boxes = [...root.querySelectorAll(".ea-step input")];
const fieldSvgEl = stage.querySelector(".ea-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const burstEl = fieldSvgEl.querySelector('[data-part="bursts"]');
const T = fieldTerrain();
const LOOKS = new Map();
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view.v2";
const HINTS = { machine: "Click: next step, then release", field: "Click: next step, then release" };
let view = "field";
try { if (localStorage.getItem(VIEW_KEY) === "machine") view = "machine"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// the configuration (which steps are built), its eased build progress, the run (model.mjs), and what
// the battlefield measures between frames
let cfg = allSteps();
let B = cfg.map((v) => (v ? 1 : 0));
let R = newRun(cfg);
const MS = { firing: 0 };
const FM = { t: 0 };
let stageF = null, fire = null;
let touring = !still.matches, last = 0, frame = 0, visible = false, idle = 0, wait = 0, runNo = 0;
// the idle tour: build the seven steps in order, release; then again without step 5, then without step 3
const PLANS = [[], [4], [2]];
let tour = { plan: 0, stage: "pre", timer: 0, k: 0 };
const TOUR0 = () => ({ plan: 0, stage: "pre", timer: 0, k: 0 });
function setCfg(next) {
  cfg = next.slice();
  boxes.forEach((b, i) => { b.checked = cfg[i]; });
}
function newAssault() { R = newRun(cfg); wait = 0; }
function stillRun() { R = simulate(allSteps(), 9); FM.t = 9; }
function release() { if (!R.released) step(R, 0, MODEL, true); }
const BURSTS = Array.from({ length: 24 }, () => {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.innerHTML = '<circle class="ea-smoke"/><circle class="ea-dust"/><circle class="ea-core"/>';
  g.setAttribute("visibility", "hidden");
  burstEl.appendChild(g);
  return g;
});
const kF = cameraOf(PF).k;
function drawBursts(lane) {
  const list = fieldBursts(R, lane, FM.t);
  BURSTS.forEach((g, i) => {
    const b = list[i];
    if (!b) { if (g._on) { g.setAttribute("visibility", "hidden"); g._on = false; } return; }
    if (!g._on) { g.removeAttribute("visibility"); g._on = true; }
    const [x, y] = iso(b.p, PF), a = b.age;
    const [sm, du, co] = g.children;
    const [wx, wy] = iso([b.p[0] - 6 * a, b.p[1] - 9 * a, 3 + 7 * a], PF);
    sm.setAttribute("cx", wx.toFixed(1)); sm.setAttribute("cy", wy.toFixed(1)); sm.setAttribute("r", ((3 + 9 * a) * kF).toFixed(1)); sm.setAttribute("opacity", (0.28 * (1 - a) * Math.min(1, a * 8)).toFixed(2));
    du.setAttribute("cx", x.toFixed(1)); du.setAttribute("cy", (y - a * 3 * kF).toFixed(1)); du.setAttribute("r", ((1.5 + 5.5 * Math.sqrt(a)) * kF).toFixed(1)); du.setAttribute("opacity", (0.55 * (1 - a)).toFixed(2));
    co.setAttribute("cx", x.toFixed(1)); co.setAttribute("cy", y.toFixed(1)); co.setAttribute("r", ((0.8 + 2.4 * a) * kF).toFixed(1)); co.setAttribute("opacity", Math.max(0, 0.9 - a * 6).toFixed(2));
  });
}
function state() {
  const steps = R.released ? R.steps : cfg;
  return { steps, lane: laneOf(steps) };
}
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const { steps, lane } = state();
  const S = Object.assign({}, R, { steps, b: B });
  const sig = lane + "|" + B.map((v) => (v > 0.5 ? 1 : 0)).join("");
  if (fieldSvgEl._sig !== sig) {
    fieldSvgEl.setAttribute("data-lane", lane);
    B.forEach((v, i) => fieldSvgEl.setAttribute("data-b" + (i + 1), v > 0.5 ? "1" : "0"));
    fieldSvgEl._sig = sig;
  }
  const pose = fieldPose(S, T, FM);
  stageF.put(pose.men.map((m) => {
    const look = (m.veh ? "veh|" + trFaceStep(m.face) : trLook(m)) + "|" + m.side;
    return { id: m.id, key: depthOf([m.x, m.y, 0], PF), at: iso([m.x, m.y, m.z], PF), look, side: m.side, lit: false,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, m.veh ? trVehicle(K, PF, trFaceStep(m.face)) : trSoldier(K, PF, { ...m, face: trFaceStep(m.face) })); return LOOKS.get(look); } };
  }));
  fire.draw(trShots(pose.streams, FM.t));
  drawBursts(lane);
}
function draw() {
  const { steps, lane } = state();
  if (view === "field") drawField();
  else {
    const inz = R.released && R.phase === "advancing" && inEA(R.x);
    layer.innerHTML = scene(K, P, { x: R.x, b: B, lane, down: R.downE, downN: R.downE.length, downF: friendlyDown(R), t: FM.t, firing: MS.firing, steps, enemy: MODEL.enemy, released: R.released, leadY: inz ? benchY(R.x) : null });
  }
  const text = view === "field" ? readoutField(Object.assign({}, R, { steps })) : readoutMachine(Object.assign({}, R, { steps }));
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
  goBtn.disabled = R.released && !R.done;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (!calm) {
    if (R.released) {
      step(R, dt);
      FM.t += dt;
      if (R.done) {
        wait += dt;
        if (wait > 1.1) { if (touring) advanceTour(); else newAssault(); }
      }
    } else if (touring) tourTick(dt);
    else FM.t += dt;
  }
  const firing = R.released && R.phase === "advancing" && inEA(R.x) ? 1 : 0;
  const k1 = (x, to, tau) => (calm ? to : x + (to - x) * (1 - Math.exp(-dt / tau)));
  MS.firing = k1(MS.firing, firing, 0.15);
  let moving = false;
  const goal = R.released ? R.steps : cfg;
  for (let i = 0; i < 7; i++) {
    const to = goal[i] ? 1 : 0, nb = calm ? to : (Math.abs(B[i] - to) < 0.004 ? to : B[i] + Math.sign(to - B[i]) * Math.min(Math.abs(to - B[i]), dt / (i === 6 ? 2.4 : i === 3 ? 1.6 : 0.5)));
    if (nb !== B[i]) { B[i] = nb; moving = true; }
  }
  draw();
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
// the tour: clear the steps, build them one by one in the manual's order, release, watch, go again
function tourTick(dt) {
  tour.timer += dt;
  const plan = PLANS[tour.plan % PLANS.length];
  if (tour.stage === "pre") { if (tour.timer > 1.2) { release(); } return; }
  if (tour.stage === "clear") { if (tour.timer > 0.6) { tour.stage = "build"; tour.k = 0; tour.timer = 0; } return; }
  if (tour.stage === "build") {
    if (tour.timer > (tour.k === 3 ? 1.5 : 0.8)) {
      tour.timer = 0;
      if (tour.k < 7) { if (!plan.includes(tour.k)) { const c = cfg.slice(); c[tour.k] = true; setCfg(c); } tour.k++; }
      else { newAssault(); release(); }
    }
  }
}
function advanceTour() {
  tour.plan++; tour.stage = "clear"; tour.timer = 0; wait = 0;
  setCfg(noSteps());
  newAssault();
  FM.t = 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } if (still.matches) tick(performance.now()); };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; tour = TOUR0(); tour.stage = R.released ? "build" : "pre"; run(); }, 14000);
  run();
};
function toggle(i, on) {
  const c = cfg.slice();
  c[i] = on === undefined ? !c[i] : on;
  setCfg(c);
  if (R.released) { newAssault(); FM.t = 0; } else R = newRun(cfg);
  hold();
}
function buildNext() {
  if (R.released && !R.done) return;
  const i = cfg.indexOf(false);
  if (i === -1) { releaseNow(); return; }
  toggle(i, true);
}
function releaseNow() {
  if (R.released && R.done) { newAssault(); }
  if (!R.released) { R = newRun(cfg); release(); }
  hold();
}
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
stage.addEventListener("click", buildNext);
stage.addEventListener("keydown", (event) => {
  if (event.key >= "1" && event.key <= "7") toggle(Number(event.key) - 1);
  else if (event.key === "n" || event.key === "N") buildNext();
  else if (event.key === " " || event.key === "Enter") releaseNow();
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
nextBtn.addEventListener("click", buildNext);
goBtn.addEventListener("click", releaseNow);
boxes.forEach((b, i) => b.addEventListener("change", () => toggle(i, b.checked)));
// Reset: back to the state the page opened in (all seven steps built, the column waiting, the tour); the view is kept.
const resetBtn = root.querySelector(".fd-reset");
function reset() {
  clearTimeout(idle);
  runNo = 0; wait = 0;
  Object.assign(MS, { firing: 0 });
  FM.t = 0;
  setCfg(allSteps());
  B = cfg.map((v) => (v ? 1 : 0));
  R = newRun(cfg);
  tour = TOUR0();
  if (still.matches) stillRun();
  touring = !still.matches;
  draw(); run();
}
resetBtn.addEventListener("click", reset);
viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) stillRun();
setCfg(cfg);
setView(view, false);
const snapshot = () => JSON.stringify({ cfg, B, R, MS, FM, runNo, wait, touring, tour, boxes: boxes.map((b) => b.checked), readout: readout.textContent });
const LOAD = { field: null, machine: null };
LOAD[view] = snapshot();
window.__ea = {
  get R() { return R; }, get cfg() { return cfg; }, B, MS, FM, toggle, buildNext, releaseNow, newAssault, setView, reset, view: () => view,
  snapshot, load: LOAD,
  stop: () => { touring = false; clearTimeout(idle); },
  // jump to a state (for tests and stills): which steps, figure seconds into the run (null = still waiting)
  seek: (steps, t) => { setCfg(steps); B = cfg.map((v) => (v ? 1 : 0)); window.__ea.B = B; R = t === null ? newRun(cfg) : simulate(cfg, t); FM.t = t || 0; MS.firing = R.released && R.phase === "advancing" && inEA(R.x) ? 1 : 0; draw(); },
};
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

for (const st of [allSteps(), [1,1,1,1,0,1,1].map(Boolean), [1,1,0,1,1,1,1].map(Boolean), [0,1,1,1,1,1,1].map(Boolean)]) { const s = simulate(st); console.log(st.map((v) => (v ? 1 : 0)).join(""), "→", readoutField(s)); }
console.log("start:", readoutMachine(RUN0), "|", readoutField(RUN0));
console.log("wrote index.html", PAGE.length, "bytes; field men", POSE0.men.length);
