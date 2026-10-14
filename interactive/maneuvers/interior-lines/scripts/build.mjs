// Builds interactive/maneuvers/interior-lines/index.html: an isometric hub-and-rim bench made
// with the Anatomy kit (../../kit, MIT). Run: node interactive/maneuvers/interior-lines/scripts/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { MODEL, hubPlan, rimPlan } from "./model.mjs";
import { GEO, statics, scene } from "./scene.mjs";
import { FIELD_CSS, fdStatic } from "../../kit/field.mjs";
import { TERRAIN_CSS, trFaceStep } from "../../kit/terrain.mjs";
import { fieldTerrain, fieldStatic, fieldPose, fieldMarks, ilUnitSvg } from "./field-scene.mjs";
import { losses } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "..");
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 400;
const RAD = Math.PI / 180;

const PLATE = { x: -158, y: -158, w: 316, d: 316, r: 14 };
const PLATE_H = 12;
const FOOT_H = 5;
const LABEL = { x: 112, y: 116, w: 32, d: 20, r: 1.5 };
const RULER = { x: 138, y: -92, w: 8, d: 184, r: 1 };
const { TT, RAIL } = GEO;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GEO.CR.x, GEO.CR.y, 26], [GEO.CL.x, GEO.CL.y, 26], [-133, -133, 30], [-86, -86, 40]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 45, elevation: 36 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const turned = (ang) => {
  const c = Math.cos(ang * RAD), s = Math.sin(ang * RAD);
  return (r, t) => [r * c - t * s, r * s + t * c];
};
const box = (F, r0, r1, t0, t1, z0, h, bevel = 0) => k.extrude([F(r0, t0), F(r1, t0), F(r1, t1), F(r0, t1)], z0, h, P, { bevel });
const arc = (r0, r1, a0, a1, step = 2) => {
  const out = [];
  const n = Math.max(2, Math.ceil((a1 - a0) / step));
  for (let i = 0; i <= n; i++) out.push(turned(a0 + ((a1 - a0) * i) / n)(r1, 0));
  for (let i = n; i >= 0; i--) out.push(turned(a0 + ((a1 - a0) * i) / n)(r0, 0));
  return out;
};
const ST = MODEL.stations;

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 26))) {
    out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.2, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -6, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip along the right-hand front edge: the bench's length scale, every 4 units
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(RULER.y + 4, RULER.y + RULER.d - 4, 4, 5, RULER.x + 0.8, 0.6, [2, 3.6], P, "y");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // label plate with three rule lines standing for print
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  [[22, 5], [16, 9.5], [19, 14]].forEach(([len, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + len, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(Dt([at([LABEL.x + 2.6, LABEL.y + 2.6, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8])], { size: 0.42 }));
  return out.join("");
}

// The round table: drum, rim rail bed and rails, hub pit and deck, spokes on sleepers.
function table() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.cylinder(0, 0, GEO.TABLE + 2, 0, 0.1, P, 96).fill}" style="filter:blur(5px)"/>`);
  out.push(S(k.cylinder(0, 0, GEO.TABLE, 0, TT, P, 128, 0.8), { tone: "mid", inner: L(k.sideArc(0, 0, GEO.TABLE, 2.4, P, 64), { tone: "faint" }) }));
  out.push(L(k.ring(0, 0, GEO.TABLE - 4, TT, P, 128), { tone: "faint" }));
  // station marks: a short inlaid tick at each station, inboard of its post
  for (const a of ST) {
    const F = turned(a);
    out.push(L(k.onTop([F(116.4, -1.2), F(116.4, 1.2), F(GEO.TABLE - 4, 1.2), F(GEO.TABLE - 4, -1.2)], TT, P, true), { tone: "lo" }));
  }
  // rim rail bed, then the two rails in six lengths with joints between stations
  out.push(S(k.extrude(arc(91, 109, 0, 359.9, 2), TT, 0.6, P, { convex: false }), { tone: "lo", crease: "none" }));
  for (const rc of [GEO.RIM_IN, GEO.RIM_OUT]) {
    for (const a of ST) {
      out.push(S(k.extrude(arc(rc - 0.8, rc + 0.8, a - 29.6, a + 29.6, 2), TT + 0.6, 1.2, P, { convex: false, bevel: 0.2 }), { tone: "mid", crease: "none" }));
    }
  }
  // hub pit and deck
  out.push(L(k.ring(0, 0, GEO.DECK + 0.8, TT, P, 72), { tone: "lo" }));
  out.push(S(k.cylinder(0, 0, GEO.DECK, TT, 0.6, P, 72), { tone: "mid", crease: "none" }));
  out.push(L(k.ring(0, 0, 3, TT + 0.6, P, 24), { tone: "faint" }));
  // spokes: sleepers then a pair of rails, far spokes first
  const spokes = [...ST].sort((a, b) => k.depthOf([...turned(a)(50, 0), 0], P) - k.depthOf([...turned(b)(50, 0), 0], P));
  for (const a of spokes) {
    const F = turned(a);
    let svg = "";
    for (let s = 24; s <= 84; s += 10) svg += S(box(F, s - 1.4, s + 1.4, -7, 7, TT, 0.6), { tone: "lo", crease: "none" });
    const rails = [-4, 4].map((t) => ({ t, key: k.depthOf([...F(50, t), 0], P) })).sort((p, q) => p.key - q.key);
    for (const { t } of rails) svg += S(box(F, GEO.SPOKE0, GEO.SPOKE1, t - 0.8, t + 0.8, TT + 0.6, 1.2, 0.2), { tone: "mid", crease: "none" });
    out.push(svg);
  }
  return out.join("");
}

const START = { psi: ST[0], r: 0, phi: ST[0], n: 1, k: 1, call: 0, hubT: "0.00", rimT: "0.00", lift: [1, 0, 0, 0, 0, 0] };
const STATICS = statics(k, P, ST);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "il-svg",
  label: "A bench model of interior and exterior lines. A round table carries six station posts round its edge. In the middle, a lit shuttle sits on a turntable and runs out along straight spokes to any station: that is the force on interior lines. Round the rim, carriages clamped to a link belt run on a circular track: the force on exterior lines. Two counters time each force's trip to the called station. More carriages on the belt, or a faster belt, close the gap.",
  body: [plate(), table(), `<g data-part="live">${scene(k, P, { ...START, statics: STATICS }, ST)}</g>`],
});

const CAPTION = "The shuttle on the spokes has interior lines: from the hub, every station is one spoke away. The carriages on the rim have exterior lines and must go round. Distances are measured on the tracks as drawn; the speeds and the hub's turning rate are notional bench values, not data.";

// ---- Battlefield view: the same state on full-bleed terrain at operational scale (kit/terrain.mjs) ----
// The viewBox is the card's shape, shown with "slice" so the ground fills the whole card at every width;
// a phone crops the sides. The camera turns like the machine's (azimuth 45), so every town sits where
// its station post does on the bench.
const FW = 640, FH = 420;
const FA = 45, FE = 42;
const groundRect = (cx, cy, hw, hh) => {
  const a = FA * RAD, e = FE * RAD;
  const X0 = cx * Math.sin(a) - cy * Math.cos(a), Y0 = (cx * Math.cos(a) + cy * Math.sin(a)) * Math.sin(e);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const X = X0 + sx * hw, p = (Y0 + sy * hh) / Math.sin(e);
    return [X * Math.sin(a) + p * Math.cos(a), -X * Math.cos(a) + p * Math.sin(a), 0];
  });
};
const PF = k.fitProjection(groundRect(0, 6, 200, 200 * FH / FW), FW, FH, { pad: 0, azimuth: FA, elevation: FE });
const T = fieldTerrain();
const FIELD = fieldStatic(k, PF, T);
const POSE0 = fieldPose({ ...START }, GEO, T);
const unitItems = POSE0.units.map((u) => {
  const [sx, sy] = k.iso([u.x, u.y, u.z], PF);
  return { key: k.depthOf([u.x, u.y, 0], PF), dyn: true, svg: `<g class="tr-s" data-side="${u.side}"${u.lit ? ' data-lit=""' : ""} transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">${ilUnitSvg(k, PF, u, trFaceStep(u.face))}</g>` };
});
const fieldSvg = k.figureSvg({
  width: FW,
  height: FH,
  className: "il-field",
  label: "The same idea on a battlefield, at operational scale, with each small vehicle standing for a company and each cluster of three for a battalion. Six radial roads run out from a road hub in the middle to six towns on a ring road. A lit blue battalion waits at the hub with its brigade's command post and supply trucks: it is on interior lines. Red battalions, one, two or three, stand on the ring road at the towns: they are on exterior lines and move round the ring together. When a town is called (chalk outline), the blue battalion drives out along its road while the red battalions march round the ring. Whoever arrives first holds the town and fires on the other side, which halts short of it and attacks. Knocked-out vehicles on both sides stop, grey out and smoke, and a casualty evacuation truck runs blue casualties back to the hub. Sizes, distances, timings and losses are notional.",
  body: [`<g data-part="ground">${FIELD.ground}</g><g data-part="marks">${fieldMarks(k, PF, T, POSE0)}</g><g data-part="field-live">${fdStatic([...FIELD.items, ...unitItems])}</g><g data-part="fire" class="tr-fire"></g>`],
}).replace('class="iso-svg il-field"', 'class="iso-svg il-field" preserveAspectRatio="xMidYMid slice"');

const LABELS = {
  machine: "Interior and exterior lines bench. Left and right arrow keys call the previous or next station; 1, 2 and 3 set the number of rim carriages; plus and minus change the rim speed; V switches to the Battlefield view.",
  field: "Battlefield. Left and right arrow keys call the previous or next town; 1, 2 and 3 set the number of red battalions on the ring road; plus and minus change their speed; V switches to the Machine view.",
};
const card = k.plateHtml({
  fig: "Fig 11",
  title: "Interior vs exterior",
  hint: "Click a station to call it",
  readout: "",
  keys: [
    { mark: "lit", label: "Interior lines: the shuttle on the spokes (left counter)" },
    { mark: "raised", label: "Exterior lines: carriages on the rim belt (right counter)" },
    { mark: "edge", label: "Raised lamp: the station being called" },
  ],
  caption: CAPTION,
  body: `<div class="iso-stage il-stage" tabindex="0" role="group" aria-label="${LABELS.machine}">${svg}${fieldSvg}</div>`,
});
// The legend and caption for each view; CSS shows the one that matches the card's data-view.
const FIELD_CAPTION = "The blue battalion at the road hub has interior lines: from the hub, every town is one road away. The red battalions on the ring road have exterior lines and must go round. The roads stand for the bench's tracks; unit sizes, distances, timings and losses are notional.";
const legendOf = (html) => html.slice(html.indexOf('<figcaption class="iso-legend">') + 31, html.indexOf("</figcaption>"));
const fieldLegend = legendOf(k.plateHtml({
  fig: "", keys: [
    { mark: "lit", label: "Interior lines: the blue battalion at the road hub, lit" },
    { mark: "blue", label: "Friendly: brigade command post, supply and casualty evacuation trucks" },
    { mark: "red", label: "Exterior lines: red battalions on the ring road" },
  ], caption: FIELD_CAPTION, body: "",
}));
const body = card.replace(/<figcaption class="iso-legend">([\s\S]*)<\/figcaption>/, (_, m) =>
  `<figcaption class="iso-legend"><div class="il-legend il-legend-machine">${m}</div><div class="il-legend il-legend-field fd-keys">${fieldLegend}</div></figcaption>`);

const DATA = { P, PF, GEO, MODEL, START, LABELS };
const live = `
const DATA = ${JSON.stringify(DATA)};
${strip("model.mjs")}
${strip("scene.mjs").replace(/^const GEO = [\s\S]*?\n};\n/m, "")}
${strip("../../kit/field.mjs")}
${strip("../../kit/terrain.mjs")}
${strip("field-scene.mjs")}
const { P, PF, START, LABELS } = DATA;
const GEO = DATA.GEO;
const ST = MODEL.stations;
const K = { depthOf, iso, solidSvg, lineSvg, dotsSvg, extrude, cylinder, knurl, slabOf, sideSeam, ringSeam, sideArc, ring, onTop, lineOnTop, insetPlan, planOutline, corners, haloOf, radialTicks, sideMatrix, fadeLineSvg, cameraOf, pathOf, segment, towardViewer, faceTextSvg, topMatrix, topTicks };
const root = document.querySelector(".il-figure");
const stage = root.querySelector(".il-stage");
const svg = stage.querySelector(".il-svg");
const layer = svg.querySelector('[data-part="live"]');
const readout = root.querySelector("[data-readout]");
const status = root.querySelector("#il-status");
const lugBtns = [...root.querySelectorAll("[data-lugs]")];
const speed = root.querySelector("#il-speed");
const speedOut = root.querySelector("#il-speed-out");
const nextBtn = root.querySelector("#il-next");
const lossEl = root.querySelector("#il-losses");
const fieldSvgEl = stage.querySelector(".il-field");
const fieldLayer = fieldSvgEl.querySelector('[data-part="field-live"]');
const marksEl = fieldSvgEl.querySelector('[data-part="marks"]');
const fireEl = fieldSvgEl.querySelector('[data-part="fire"]');
const T = fieldTerrain();
const LOOKS = new Map();
const FM = { t: 0, rc: 0, dir: 1, race: null };
let stageF = null, fire = null, marksSig = "";
const hintEl = root.querySelector('[data-corner="hint"]');
const viewBtns = root.querySelectorAll(".fd-views [data-view]");
const VIEW_KEY = "maneuvers.view";
const HINTS = { machine: "Click a station to call it", field: "Click a town to call it" };
let view = "machine";
try { if (localStorage.getItem(VIEW_KEY) === "field") view = "field"; } catch (e) {}
const still = matchMedia("(prefers-reduced-motion: reduce)");
const STATICS = statics(K, P, ST);
const S = { ...START, lift: [...START.lift] };
let race = null, back = false;
let touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0, step = -1;
const fmt = (t) => t.toFixed(2);

function say() {
  if (!race) return;
  const h = race.hub.time, r = race.rim.time;
  const who = Math.abs(h - r) < 0.005 ? "level" : h < r ? "hub first" : "rim first";
  const text = "Hub " + fmt(h) + " s · rim " + fmt(r) + " s · " + who;
  if (readout.textContent !== text) readout.textContent = text;
  const words = "Station " + (S.call + 1) + " called. Hub shuttle " + fmt(h) + " seconds, rim " + fmt(r) + " seconds with " + S.n + (S.n === 1 ? " carriage" : " carriages") + " at rim speed " + S.k.toFixed(1) + ": " + who + ".";
  if (status.textContent !== words) status.textContent = words;
}
// The notional losses line under the card: the clash at the called station, once both sides are there.
function sayLosses() {
  let text = "Notional losses at the called station: none yet";
  if (race) {
    const end = Math.max(race.hub.time, race.rim.time);
    if (race.t + 1e-9 < end) text = "Notional losses at the called station: not yet in contact";
    else { const ls = losses(race.hub.time, race.rim.time); text = "Notional losses at the called station: " + ls.blue + " friendly, " + ls.red + " enemy company vehicle" + (ls.red === 1 ? "" : "s") + " knocked out"; }
  }
  if (lossEl.textContent !== text) lossEl.textContent = text;
}
function call(i) {
  S.call = ((i % ST.length) + ST.length) % ST.length;
  const st = ST[S.call];
  race = { t: 0, r0: S.r, psi0: S.psi, phi0: S.phi, hub: hubPlan(S.r, S.psi, st), rim: rimPlan(S.phi, S.n, st, S.k) };
  if (race.rim.turn) FM.dir = Math.sign(race.rim.turn);
  marksSig = "";
  back = false;
  say();
  run();
}
function setLugs(n) {
  S.n = n;
  lugBtns.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.lugs) === n)));
  if (race && race.t < race.rim.time) call(S.call);
  run();
}
function setSpeed(v) {
  S.k = Math.min(MODEL.rimSpeeds[1], Math.max(MODEL.rimSpeeds[0], Math.round(v * 10) / 10));
  speed.value = String(S.k);
  speedOut.textContent = "×" + S.k.toFixed(1);
  run();
}
// The station the rim needs longest to reach, from where things stand now.
function farthest() {
  let best = 0, far = -1;
  ST.forEach((a, i) => { const d = Math.abs(rimPlan(S.phi, S.n, a, S.k).turn); if (d > far + 1e-6) { far = d; best = i; } });
  return best;
}
const TOUR = [
  [0.8, () => { setLugs(1); setSpeed(1); call(farthest()); }],
  [7.0, () => { setLugs(3); call(farthest()); }],
  [10.0, () => { setSpeed(2); call(farthest()); }],
  [13.2, () => { setLugs(1); setSpeed(1); }],
];
const LOOP = 14.4;
// Battlefield frame: vehicles move by translate and re-render only when their facing crosses a 15°
// step; the fire layer writes attributes only; the marks redraw only when the clash changes them.
function drawField() {
  if (!stageF) { stageF = trStage(fieldLayer); fire = trFire(fireEl, K, PF); }
  const end = race ? Math.max(race.hub.time, race.rim.time) : 0;
  FM.race = race ? { t: still.matches ? end + 5 : race.t, h: race.hub.time, r: race.rim.time } : null;
  const pose = fieldPose(S, GEO, T, FM);
  stageF.put(pose.units.map((u) => {
    const f = trFaceStep(u.face), look = u.kind + "|" + f + (u.out ? "|x" : "") + (u.lit ? "|l" : "");
    return { id: u.id, key: depthOf([u.x, u.y, 0], PF), at: iso([u.x, u.y, u.z], PF), look, side: u.side, lit: u.lit,
      svg: () => { if (!LOOKS.has(look)) LOOKS.set(look, ilUnitSvg(K, PF, u, f)); return LOOKS.get(look); } };
  }));
  const C = pose.C;
  const sig = S.call + "|" + (C ? C.side + (C.held ? "h" : "") + (C.since < 0 ? "p" : "") : "-") + "|" + pose.holdOn.toFixed(1) + "|" + pose.dir;
  if (sig !== marksSig) { marksEl.innerHTML = fieldMarks(K, PF, T, pose); marksSig = sig; }
  fire.draw(trShots(pose.streams, still.matches ? 4.37 : FM.t));
}
function draw() {
  if (view === "field") drawField();
  else layer.innerHTML = scene(K, P, { ...S, statics: STATICS }, ST);
  sayLosses();
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    if (clock >= LOOP) { clock -= LOOP; step = -1; }
    for (let i = step + 1; i < TOUR.length; i++) if (clock >= TOUR[i][0]) { step = i; TOUR[i][1](); }
  }
  if (race) {
    const end = Math.max(race.hub.time, race.rim.time);
    race.t = calm ? end : race.t + dt;
    const th = Math.min(race.t, race.hub.time), tr = Math.min(race.t, race.rim.time);
    // once the shuttle has started back to the hub, the return below moves it (the plan would pin it at the stop)
    if (!back) { const h = hubAt(race.hub, race.r0, race.psi0, th); S.r = h.r; S.psi = h.psi; }
    S.phi = race.phi0 + race.rim.turn * (race.rim.time > 0 ? tr / race.rim.time : 1);
    S.hubT = fmt(th); S.rimT = fmt(tr);
    if (race.t >= end + (calm ? 0 : 0.9)) back = true;
  }
  let lifting = false;
  S.lift = S.lift.map((v, i) => { const to = i === S.call ? 1 : 0; const nv = calm ? to : v + (to - v) * (1 - Math.exp(-dt / 0.22)); if (Math.abs(nv - to) > 0.002) lifting = true; return Math.abs(nv - to) <= 0.002 ? to : nv; });
  if (back && S.r > 0) S.r = calm ? 0 : Math.max(0, S.r - MODEL.speed * dt);
  const marching = !!race && race.t < race.rim.time && Math.abs(race.rim.turn) > 1e-6;
  FM.rc = calm ? (marching ? 1 : 0) : FM.rc + ((marching ? 1 : 0) - FM.rc) * (1 - Math.exp(-dt / 0.25));
  FM.t += dt;
  draw();
  const settled = !touring && !lifting && (!race || race.t >= Math.max(race.hub.time, race.rim.time)) && (!back || S.r === 0) && !(race && !back);
  // the battlefield keeps firing and its trucks keep moving while it is on screen; the machine stops once it settles
  frame = visible && (!settled || (view === "field" && !calm)) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; step = -1; run(); }, 9000);
  run();
};
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
// The floor point under the pointer, in the projection of the view on show.
function floorAt(event) {
  const el = view === "field" ? fieldSvgEl : svg, PP = view === "field" ? PF : P;
  const pt = el.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const p = pt.matrixTransform(el.getScreenCTM().inverse());
  const a = PP.azimuth * Math.PI / 180, e = (PP.elevation ?? 30) * Math.PI / 180;
  const kk = PP.scale * Math.sqrt(1.6);
  const u = (p.x - PP.origin[0]) / kk, v = (p.y - PP.origin[1]) / (kk * Math.sin(e));
  return [u * Math.sin(a) + v * Math.cos(a), -u * Math.cos(a) + v * Math.sin(a)];
}
stage.addEventListener("click", (event) => {
  const [x, y] = floorAt(event);
  const deg = Math.atan2(y, x) * 180 / Math.PI;
  let best = 0;
  ST.forEach((a, i) => { if (Math.abs(wrap(deg - a)) < Math.abs(wrap(deg - ST[best]))) best = i; });
  hold(); call(best);
});
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowDown") { hold(); call(S.call + 1); }
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") { hold(); call(S.call - 1); }
  else if (event.key === "1" || event.key === "2" || event.key === "3") { hold(); setLugs(Number(event.key)); }
  else if (event.key === "+" || event.key === "=") { hold(); setSpeed(S.k + 0.1); }
  else if (event.key === "-" || event.key === "_") { hold(); setSpeed(S.k - 0.1); }
  else if (event.key === " " || event.key === "Enter") { hold(); call(S.call + 3); }
  else if (event.key === "v" || event.key === "V") setView(view === "field" ? "machine" : "field", true);
  else return;
  event.preventDefault();
});
lugBtns.forEach((b) => b.addEventListener("click", () => { hold(); setLugs(Number(b.dataset.lugs)); }));
speed.addEventListener("input", () => { hold(); setSpeed(Number(speed.value)); });
nextBtn.addEventListener("click", () => { hold(); call(farthest()); });
viewBtns.forEach((b) => b.addEventListener("click", (event) => { event.stopPropagation(); setView(b.dataset.view, true); }));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
setLugs(S.n); setSpeed(S.k);
readout.textContent = "Hub and rim at station 1";
setView(view, false);
window.__interiorLines = { S, call, setLugs, setSpeed, farthest, setView, view: () => view, get race() { return race; }, stop: () => { touring = false; clearTimeout(idle); } };
`;

const PAGE = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", () => k.ISO_CSS + FIELD_CSS + TERRAIN_CSS)
  .replace("<!--FIGURE-->", () => body)
  .replace("/*LIVE*/", () => (strip("../../kit/iso-kit.mjs") + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(TOOL, "index.html"), PAGE);

// Sanity: the numbers the page will show.
for (const d of [60, 120, 180]) console.log(`${d}° · hub ${hubPlan(0, ST[0], ST[0] + d).time.toFixed(2)} s · rim(1) ${rimPlan(ST[0], 1, ST[0] + d).time.toFixed(2)} s`);
console.log("field units", POSE0.units.length, "static items", FIELD.items.length, "paths", (FIELD.ground.match(/<path/g) || []).length + FIELD.items.reduce((n, it) => n + (it.svg.match(/<path/g) || []).length, 0));
console.log("scale", P.scale.toFixed(3), "wrote index.html", PAGE.length, "bytes");
