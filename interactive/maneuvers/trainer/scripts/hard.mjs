// Maneuver Trainer, Hard: real time with pause. Scenario picker → briefing → the battle clock runs
// compressed (TEMPO per level, so a run takes minutes, not half an hour), with Pause (Space), 1×/2×/4×
// and an optional pause on contact; orders can be given while paused → score and after-action review. The player selects a
// unit (map, roster or number key), picks an order from the core vocabulary (order bar or hotkey) and
// taps the ground or the enemy. At company level an order reaches the platoon after the core's notional
// 10–20 s (NOTIONAL.hardDelay): this page holds it as a pending order with a chalk route and a countdown,
// then hands it to the sim. Fog of war: only spotted enemy is drawn; last-known marks in red chalk.
// All game logic is the core's (createSim); this file turns taps into orders, keeps the radio log and draws.
import { esc, best, picker, briefing, mountMap, roster, eventLog, recorder, aarView, byId, fmtClock } from "./ui.mjs";
import { createSim } from "../core/sim.mjs";
import { TASKS, TECHNIQUES, describeTrigger } from "../core/orders.mjs";
import { conceptStatus, closestPlan, matchRoute, routeKeysFor } from "../core/aar.mjs";
import { NOTIONAL, KINDS } from "../core/units.mjs";
import { hashStr } from "../core/rng.mjs";

const MODE = "hard";
const $ = (s) => document.querySelector(s);
const ui = {
  pick: $("#mt-pick"), picker: $("#mt-picker"), game: $("#mt-game"), title: $("#mt-title"), steps: $("#mt-steps"),
  card: $("#mt-card"), orders: $("#mh-orders"), controls: $("#mt-controls"), panel: $("#mt-panel"), aar: $("#mt-aar"), help: $("#mh-help"),
};
const HELP_KEY = "maneuverTrainer.hardHelpSeen2";
const AUTOPAUSE_KEY = "maneuverTrainer.hardAutoPause";
// Battle seconds per real second at 1×. Soldiers walk at 1–2.5 m/s over 150 m (fire team) to 800 m
// (company) of ground, so 1:1 time meant minutes of watching troops walk. These rates put the approach
// at roughly 30–60 real seconds; the sim itself is unchanged (same fixed 0.1 s steps, same results).
const TEMPO = { fireteam: 3, platoon: 5, company: 8 };
const SPEEDS = [1, 2, 4];
// the main orders stay on the panel; the rest sit under "More orders"
const PRIMARY = new Set(["move", "sbf", "assault", "hold", "smoke", "callfire", "withdraw", "lift", "shift"]);
const PICK_R = { fireteam: 12, platoon: 22, company: 44 };   // ground metres: tap on a unit
const TGT_R = { fireteam: 26, platoon: 45, company: 75 };    // ground metres: tap on an enemy
const ROUTE_TOL = { fireteam: 28, platoon: 45, company: 80 }; // ground metres: a drawn route this close (on average) follows a named route
const SAME_R = { fireteam: 6, platoon: 10, company: 18 };    // tap the same spot again = finish
const DWELL = 35;                                            // observe: seconds at each stop
const BOX = { fireteam: [16, 7], platoon: [44, 16], company: [110, 34] };

// The order bar. need: "dest" = a place (waypoints allowed), "target" = an enemy (ground taps are
// waypoints), "point" = a spot (actions), null = at once.
const ORD = [
  { k: "move", key: "m", need: "dest", tech: true, form: true },
  { k: "sbf", key: "s", need: "target", tech: true, form: true },
  { k: "assault", key: "a", need: "target", tech: true },
  { k: "hold", key: "h", need: "dest", form: true },
  { k: "bypass", key: "y", need: "dest", tech: true, form: true },
  { k: "smoke", key: "k", need: "point", action: true },
  { k: "callfire", key: "f", need: "point", action: true },
  { k: "breach", key: "x", need: "dest", tech: true },
  { k: "withdraw", key: "b", need: "dest" },
  { k: "reserve", key: "r", need: "dest" },
  { k: "observe", key: "o", need: "dest", tech: true, form: true },
  { k: "counterattack", key: "c", need: "dest" },
  { k: "lift", key: "l", need: null, action: true },
  { k: "shift", key: "t", need: "target", action: true },
];
const ORD_BY = Object.fromEntries(ORD.map((o) => [o.k, o]));
const LABEL = {
  move: "Move", sbf: "Support by fire", assault: "Assault", hold: "Hold / defend", bypass: "Bypass", smoke: "Smoke", callfire: "Call for fire",
  breach: "Breach", withdraw: "Break contact", reserve: "Reserve", observe: "Observe / reconnoiter", counterattack: "Counterattack", lift: "Lift fire", shift: "Shift fire",
};
const PROMPT = {
  move: "tap where to go", bypass: "lay the route round the enemy (Waypoints), then tap the end twice", hold: "tap the position (tap the unit to hold where it is)",
  breach: "tap the obstacle to breach", withdraw: "tap the rally point", reserve: "tap where to wait", observe: "tap each place to observe from (Waypoints for several)",
  counterattack: "tap the enemy or the area to counterattack into", sbf: "tap the enemy to suppress (ground taps first set the position)",
  assault: "tap the enemy (ground taps first are waypoints)", smoke: "tap where to throw smoke (up to 40 m)", callfire: "tap the target for the mortars",
  shift: "tap the new target",
};
const DEF_TECH = { move: "overwatch", bypass: "overwatch", sbf: "overwatch", assault: "overwatch", breach: "overwatch", observe: "infiltrate" };

let G = null;

// ---------- small helpers ----------
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; const u = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0; return Math.hypot(px - ax - u * dx, py - ay - u * dy); };
const polyDist = (x, y, pts) => { let d = Infinity; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return d; };
const inRing = (ring, x, y) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const COMPASS = ["east", "north-east", "north", "north-west", "west", "south-west", "south", "south-east"];
const compass = (from, to) => COMPASS[((Math.round(Math.atan2(to[1] - from[1], to[0] - from[0]) / (Math.PI / 4)) % 8) + 8) % 8];
const bearing = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;

const elState = (id) => G?.state?.elements.find((e) => e.id === id) || null;
const mine = () => (G?.state?.elements || []).filter((e) => e.side === "f" && !e.ally);
const shortOf = (id) => { const e = G.sim.S.byId[id]; return e ? e.short || e.name : id; };
const nameOf = (id) => { const e = G.sim.S.byId[id]; return e ? e.name : id; };

// where something is, in words: the nearest named piece of ground
function featureNear(x, y) {
  const t = G.scen.terrain;
  for (const h of t.houses || []) if (Math.hypot(h.x - x, h.y - y) < 26) return "by the houses";
  for (const w of t.woods || []) if (inRing(w.ring, x, y) || polyDist(x, y, [...w.ring, w.ring[0]]) < 16) return "in the treeline";
  for (const h of t.hedges || []) if (polyDist(x, y, h) < 20) return "along the hedge";
  for (const w of t.walls || []) if (polyDist(x, y, w) < 18) return "behind the wall";
  for (const s of t.streams || []) if (polyDist(x, y, s.pts) < 18) return "by the stream";
  for (const s of t.ditches || []) if (polyDist(x, y, s.pts) < 14) return "in the ditch";
  for (const r of t.roads || []) if (polyDist(x, y, r.pts) < 16) return "on the road";
  for (const r of t.rises || []) if (Math.hypot(r.cx - x, r.cy - y) < r.r * 0.8) return "on the high ground";
  return "";
}
function kindWord(id) {
  const e = G.sim.S.byId[id];
  if (!e) return "enemy";
  if (e.kind === "mg") return "MG";
  if (e.kind === "tank" || e.vehicle) return "armor";
  if (e.kind === "mortar") return "mortar";
  if (e.kind === "platoon") return "enemy platoon";
  const n = e.size;
  return n >= 7 ? "squad-size position" : n >= 3 ? "enemy team" : "enemy pair";
}

// ---------- phases ----------
function setPhase(p) {
  G.phase = p;
  ui.steps.querySelectorAll("[data-step]").forEach((s) => s.setAttribute("aria-current", s.dataset.step === p ? "step" : "false"));
  ui.game.setAttribute("data-phase", p);
}

function openScenario(id, keep = {}) {
  const scen = byId[id];
  if (!scen) return;
  stopLoop();
  G?.map?.dispose?.();
  ui.pick.hidden = true; ui.game.hidden = false; ui.aar.hidden = true; ui.aar.innerHTML = ""; ui.help.hidden = true; ui.orders.innerHTML = "";
  ui.title.textContent = scen.title;
  G = { scen, phase: "brief", seed: keep.seed ?? 1 + Math.floor(Math.random() * 999), sel: null, arm: null, pts: [], wp: false, pend: [], radio: [], evN: 0, cas: {}, tech: { ...DEF_TECH }, opts: { kind: "he", method: "alternating", formation: "" }, nOrders: 0, acc: 0, marksSig: "", speed: 1, paused: false, pauseWhy: "", autoPause: readAutoPause(), seen: new Set(), more: false };
  G.map = mountMap(ui.card, scen);
  G.map.onresize = () => { G.marksSig = ""; if (G.state) { G.map.frame(G.state, G.state.t, G.view); updateMarks(true); } };
  G.sim = createSim(scen, { seed: G.seed, mode: MODE, orderDelay: 0 }); // the page holds the radio delay itself (see sendOrder)
  G.state = G.sim.state();
  G.view = { fog: true, lit: new Set() };
  G.map.frame(G.state, 0, G.view);
  G.map.setPlan("");
  G.map.corners({ hint: "Briefing", readout: `0:00 / ${fmtClock(scen.timeLimit)}` });
  try { history.replaceState(null, "", `#${id}`); } catch (e) {}
  showBrief();
  ui.game.scrollIntoView({ block: "start", behavior: keep.instant ? "auto" : "smooth" });
}

function showPicker() {
  stopLoop();
  G?.map?.dispose?.();
  G = null;
  ui.game.hidden = true; ui.pick.hidden = false; ui.help.hidden = true;
  try { history.replaceState(null, "", location.pathname); } catch (e) {}
  picker(ui.picker, MODE, (id) => openScenario(id));
}

// ---------- briefing ----------
function showBrief() {
  setPhase("brief");
  const s = G.scen;
  const radio = s.level === "company" ? ` Orders reach the platoons by radio after a notional ${NOTIONAL.hardDelay[0]} to ${NOTIONAL.hardDelay[1]} battle seconds: order early.` : "";
  ui.panel.innerHTML = `<button type="button" class="btn btn-primary mt-go mh-start-top" id="mh-start">Start</button><h3>Briefing</h3><div id="mt-brief"></div>` +
    `<p class="mt-muted">Time runs ${TEMPO[s.level]}× faster than real life (${fmtClock(s.timeLimit)} of battle in about ${Math.round(s.timeLimit / TEMPO[s.level] / 60)} minutes). Pause any time with <kbd>Space</kbd> and give orders while paused.${radio}</p>` +
    `<p class="mt-muted">Concepts in play: ${s.concepts.map((c) => `<a href="${c.href}">Fig ${c.fig} ${esc(c.title)}</a>`).join(", ")}.</p>`;
  briefing($("#mt-brief"), s);
  ui.orders.innerHTML = "";
  ui.controls.innerHTML = `<span class="mt-muted">Blue: your troops. Red: the enemy, shown only once spotted. Soldiers drawn larger than scale; all numbers notional.</span><button type="button" class="mt-link" id="mh-help-btn">Controls</button>`;
  $("#mh-start").addEventListener("click", () => startClock());
  $("#mh-help-btn").addEventListener("click", () => showHelp(false));
}

function helpHtml(button) {
  const co = G.scen.level === "company";
  return `<div class="mh-help-box" role="dialog" aria-label="Controls"><h3>How to command</h3><ol>` +
    `<li><b>Select</b> a unit: tap it on the map or in the list, or press its number (1–9).</li>` +
    `<li><b>Pick an order</b> in the panel (or its letter: <kbd>M</kbd> move, <kbd>S</kbd> support by fire, <kbd>A</kbd> assault, <kbd>H</kbd> hold).</li>` +
    `<li><b>Tap the map</b>: the ground for a move, the enemy (red) for support by fire or an assault. Taps on open ground first are waypoints, so you can go round a flank.</li></ol>` +
    `<ul><li><b>Time</b> runs ${TEMPO[G.scen.level]}× faster than real life. <kbd>Space</kbd> pauses; you can give orders while paused. 2× and 4× speed things up; “Pause on contact” stops the clock when you first see the enemy or come under fire.</li>` +
    (co ? `<li><b>Radio delay</b>: orders reach a platoon after a notional ${NOTIONAL.hardDelay[0]}–${NOTIONAL.hardDelay[1]} battle seconds; a blue dotted route with a countdown shows the order on its way.</li>` : "") +
    `<li><kbd>Esc</kbd> cancels the order you are giving, then deselects.</li></ul>` +
    `<button type="button" class="btn btn-primary" id="mh-help-ok">${button}</button></div>`;
}
function showHelp(thenStart) {
  const running = G.phase === "run";
  if (!ui.help.hidden && running) return;
  const wasPaused = running && G.paused;
  if (running) setPaused(true, "Paused for the controls");
  ui.help.innerHTML = helpHtml(running ? "Close and resume" : thenStart ? "Got it: start" : "Close");
  ui.help.hidden = false;
  ui.help.querySelector("#mh-help-ok").addEventListener("click", () => {
    ui.help.hidden = true;
    if (running && !wasPaused) setPaused(false);
    try { localStorage.setItem(HELP_KEY, "1"); } catch (e) {}
    if (thenStart) startClock(true);
  });
  ui.help.querySelector("#mh-help-ok").focus({ preventScroll: true });
  const r = ui.card.getBoundingClientRect(); // phones: Start sits below the map, so bring the dialog (drawn over the map) into view
  if (r.top < 0 || r.top > innerHeight * 0.5) ui.card.scrollIntoView({ block: "start", behavior: "smooth" });
}

// ---------- the fight ----------
let raf = 0, last = 0, uiT = 0;
function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

function startClock(skipHelp) {
  if (!G || G.phase !== "brief") return false;
  let seen = false;
  try { seen = localStorage.getItem(HELP_KEY) === "1"; } catch (e) { seen = false; }
  if (!seen && !skipHelp) { showHelp(true); return false; }
  setPhase("run");
  G.rec = recorder(G.state, G.scen.timeLimit > 1200 ? 2 : 1);
  G.rec.add(G.state, true);
  G.vt = 0;
  ui.panel.innerHTML = `<div class="mt-clock" id="mh-clockbox"><span id="mt-clock">0:00</span><span class="mt-muted"> / ${fmtClock(G.scen.timeLimit)}</span><span id="mt-losses" class="mt-losses"></span></div>` +
    `<div class="mh-transport"><button type="button" class="mh-ord mh-pause" id="mh-pause" aria-pressed="false">Pause<kbd>Space</kbd></button>` +
    `<div class="mt-speed" role="group" aria-label="Speed">${SPEEDS.map((n) => `<button type="button" data-speed="${n}" aria-pressed="${n === G.speed}">${n}×</button>`).join("")}</div>` +
    `<label class="mh-auto"><input type="checkbox" id="mh-auto"${G.autoPause ? " checked" : ""}> Pause on contact</label></div>` +
    `<div class="mh-paused" id="mh-paused" hidden></div><div id="mh-orders-slot"></div>` +
    `<h3>Your units</h3><div class="mt-roster" id="mt-roster"></div><details class="mh-logbox"><summary>Radio log</summary><ol class="mt-log" id="mt-log"></ol></details>`;
  $("#mh-orders-slot").replaceWith(ui.orders);
  ui.controls.innerHTML = `<button type="button" class="btn btn-outline mh-stop" id="mh-stop">End exercise</button><button type="button" class="mt-link" id="mh-help-btn">Controls</button><span class="mt-muted">Time runs ${TEMPO[G.scen.level]}× real life at 1×. All numbers notional.</span>`;
  $("#mh-stop").addEventListener("click", onStop);
  $("#mh-help-btn").addEventListener("click", () => showHelp(false));
  $("#mh-pause").addEventListener("click", () => setPaused(!G.paused));
  ui.panel.querySelectorAll("[data-speed]").forEach((b) => b.addEventListener("click", () => setSpeed(Number(b.dataset.speed))));
  $("#mh-auto").addEventListener("change", (ev) => { G.autoPause = ev.target.checked; try { localStorage.setItem(AUTOPAUSE_KEY, G.autoPause ? "1" : "0"); } catch (e) {} ev.target.blur(); });
  setPaused(false);
  drawOrderBar();
  G.map.corners({ hint: "Select a unit" });
  { const r = ui.card.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * 0.5) ui.card.scrollIntoView({ block: "start", behavior: "smooth" }); } // phones: the fight starts above the Start button
  updateRunUi(G.state);
  last = 0;
  raf = requestAnimationFrame(loop);
  return true;
}

let stopTimer = 0;
function onStop() {
  const b = $("#mh-stop");
  if (!b) return;
  if (!b.classList.contains("is-armed")) {
    b.classList.add("is-armed"); b.textContent = "Tap again to stop";
    clearTimeout(stopTimer); stopTimer = setTimeout(() => { if (b.isConnected) { b.classList.remove("is-armed"); b.textContent = "End exercise"; } }, 3000);
    return;
  }
  stopExercise();
}
function stopExercise() {
  if (!G || G.phase !== "run") return false;
  const S = G.sim.S;
  if (!S.done) {
    S.done = { reason: "exercise stopped before the end", tier: 3, t: S.t };
    S.events.push({ t: +S.t.toFixed(1), clock: fmtClock(S.t), type: "end", text: "Exercise stopped", tier: 3 });
  }
  G.state = G.sim.state();
  G.rec.add(G.state, true);
  showAAR();
  return true;
}

// ---------- time: pause, speed, pause on contact ----------
function readAutoPause() { try { return localStorage.getItem(AUTOPAUSE_KEY) !== "0"; } catch (e) { return true; } }
function setPaused(on, why = "") {
  if (!G || G.phase !== "run") return false;
  G.paused = !!on; G.pauseWhy = on ? why || "Paused" : "";
  const b = $("#mh-pause");
  if (b) { b.setAttribute("aria-pressed", String(G.paused)); b.innerHTML = `${G.paused ? "Resume" : "Pause"}<kbd>Space</kbd>`; }
  const p = $("#mh-paused");
  if (p) { p.hidden = !G.paused; p.textContent = G.pauseWhy ? `${G.pauseWhy}. Give orders, then press Resume or Space.` : ""; }
  ui.card.classList.toggle("is-paused", G.paused);
  if (!G.paused) last = 0;
  return true;
}
function setSpeed(n) {
  G.speed = SPEEDS.includes(n) ? n : 1;
  ui.panel.querySelectorAll("[data-speed]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.speed) === G.speed)));
}
// first sighting of each enemy element, or one of ours first pinned: stop the clock so the player can react
function contactCheck(ev) {
  if (!G.autoPause || G.paused) return;
  let why = "";
  if (ev.type === "spotted" && ev.side !== "h" && ev.el && !G.seen.has(ev.el)) { G.seen.add(ev.el); why = "Contact: enemy spotted"; }
  else if (ev.type === "pinned" && G.sim.S.byId[ev.el]?.side === "f" && !G.seen.has(`p:${ev.el}`)) { G.seen.add(`p:${ev.el}`); why = `${shortOf(ev.el)} pinned down`; }
  // one stop per burst of contact: further sightings within a minute of battle time just go on the radio
  if (why && G.sim.S.t - (G.lastAuto ?? -999) >= 60) { G.lastAuto = G.sim.S.t; setPaused(true, why); }
}

// advance the sim in whole ticks, handing pending orders over at their tick
function tickSim(dt) {
  G.acc += dt;
  while (G.acc >= NOTIONAL.dt - 1e-9 && !G.sim.done()) {
    deliverDue(); G.sim.step(NOTIONAL.dt); G.acc -= NOTIONAL.dt;
    if (G.evN < G.sim.S.events.length) { pullRadio(); if (G.paused) { G.acc = 0; break; } }
  }
}

function loop(now) {
  raf = 0;
  if (!G || G.phase !== "run") return;
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
  last = now;
  if (!G.paused) {
    const gdt = dt * TEMPO[G.scen.level] * G.speed;
    tickSim(gdt);
    G.vt += gdt;
    if (G.evN < G.sim.S.events.length) pullRadio(); // pause on contact reacts on the frame it happens
  }
  const st = (G.state = G.sim.state());
  G.vt = Math.max(st.t - 0.1, Math.min(st.t + 0.1, G.vt));
  G.rec.add(st);
  G.map.frame(st, G.vt, G.view);
  if (now - uiT > 250 || st.done) { uiT = now; updateRunUi(st); }
  if (st.done) { G.rec.add(st, true); return showAAR(); }
  raf = requestAnimationFrame(loop);
}

function updateRunUi(st) {
  pullRadio();
  const c = $("#mt-clock"); if (c) c.textContent = st.clock;
  const box = $("#mh-clockbox"); if (box) box.classList.toggle("is-late", st.timeLimit - st.t < Math.max(60, st.timeLimit * 0.1));
  const l = $("#mt-losses"); if (l) l.textContent = `${st.losses.friendly} vs ${st.losses.enemy} down`;
  const r = $("#mt-roster");
  if (r) {
    // number keys in the roster, the pending radio order in the task line
    const ids = mine().map((e) => e.id);
    const els = st.elements.map((e) => {
      if (e.side !== "f") return e;
      const n = ids.indexOf(e.id);
      const p = G.pend.filter((q) => q.el === e.id).sort((a, b) => a.at - b.at)[0];
      const m = motion(e.id);
      const task = (p ? `${e.task || ""} · radio: ${LABEL[p.order.type]} in ${Math.max(0, Math.ceil(p.at - st.t))} s` : e.task || "") + (m ? ` · ${m}` : "");
      return { ...e, short: n >= 0 && n < 9 ? `${n + 1} · ${e.short || e.name}` : e.short || e.name, task };
    });
    roster(r, { ...st, elements: els }, { selected: G.sel, onSelect: (id) => { select(id); const r = ui.card.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * 0.5) ui.card.scrollIntoView({ block: "start", behavior: "smooth" }); } });
  }
  const g = $("#mt-log"); if (g) eventLog(g, { events: G.radio });
  const left = Math.max(0, st.timeLimit - st.t);
  G.map.corners({ readout: `${st.clock} · ${fmtClock(left)} left · ${st.losses.friendly} vs ${st.losses.enemy} down` });
  refreshOrderBar();
  updateMarks();
}

// how a unit is moving, in words, with the battle time left on its route (so speeds read as intended:
// troops slow to fire and movement in contact and crawl when pinned)
function motion(id) {
  const el = G.sim.S.byId[id];
  if (!el || !el.path || el.arrived) return "";
  if (el.pinned) return "crawling";
  const v = el.curSpeed || 0;
  if (!(v > 0)) return el.boundState === "cover" ? "bounding: covering" : "";
  let d = Math.hypot(el.path[el.seg + 1]?.[0] - el.x, el.path[el.seg + 1]?.[1] - el.y) || 0;
  for (let i = el.seg + 1; i < el.path.length - 1; i++) d += Math.hypot(el.path[i + 1][0] - el.path[i][0], el.path[i + 1][1] - el.path[i][1]);
  return `${Math.max(10, Math.round(d / 10) * 10)} m to go`;
}

// ---------- orders ----------
function canDo(k, e) {
  if (!e || e.strength === 0) return false;
  if (k === "smoke") return (e.smoke || 0) > 0;
  if (k === "callfire") return G.sim.S.els.some((x) => x.side === "f" && x.kind === "mortar" && x.soldiers.some((s) => s.status === "ok")) || (G.sim.S.fireCalls.f || 0) > 0;
  if (k === "lift" || k === "shift") return e.order === "sbf" && !e.lifted;
  return true;
}

function drawOrderBar() {
  if (!G || G.phase !== "run") { ui.orders.innerHTML = ""; return; }
  const e = G.sel && elState(G.sel);
  const o = G.arm && ORD_BY[G.arm];
  const kind = e ? G.sim.S.byId[e.id].kind : null;
  const forms = kind ? KINDS[kind]?.formations || [] : [];
  let opts = "";
  if (o?.tech) opts += `<label>Movement <select data-opt="tech">${Object.entries(TECHNIQUES).map(([k, v]) => `<option value="${k}"${G.tech[G.arm] === k ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label>` ;
  if (o?.form && forms.length > 1) opts += `<label>Formation <select data-opt="formation"><option value="">as now</option>${forms.map((f) => `<option value="${f}"${G.opts.formation === f ? " selected" : ""}>${f}</option>`).join("")}</select></label>`;
  if (G.arm === "callfire") opts += `<label>Rounds <select data-opt="kind"><option value="he"${G.opts.kind === "he" ? " selected" : ""}>high explosive</option><option value="smoke"${G.opts.kind === "smoke" ? " selected" : ""}>smoke</option></select></label>`;
  if (G.arm === "withdraw") opts += `<label>Method <select data-opt="method"><option value="alternating"${G.opts.method === "alternating" ? " selected" : ""}>alternating bounds</option><option value="run"${G.opts.method === "run" ? " selected" : ""}>everyone at once</option></select></label>`;
  const multi = o && (o.need === "dest" || o.need === "target") && !o.action;
  if (multi || (!o && e)) opts += `<button type="button" class="mh-ord mh-wp" data-wp aria-pressed="${G.wp}">Waypoints</button>`;
  if (G.pts.length) opts += `<button type="button" class="mh-ord" data-send>Send<kbd>Enter</kbd></button>`;
  if (o) opts += `<button type="button" class="mh-ord" data-cancel>Cancel<kbd>Esc</kbd></button>`;
  const kc = G.kb && G.kb.list[G.kb.i];
  const kbLine = o && KB_TYPES.has(o.k) ? (kc ? `Keyboard: ${G.kb.i + 1} of ${G.kb.list.length}, ${kc.label}. Enter to confirm, Tab or arrows for the next.` : "") : "";
  const head = e ? `<span>Selected: <b>${esc(e.name)}</b>${e.task ? ` · ${esc(e.task)}` : ""}</span>${o ? `<span class="mh-prompt">${esc(LABEL[o.k])}: ${esc(kc ? "" : G.pts.length && o.need !== "target" ? "tap more points, then the last one again" : PROMPT[o.k])}</span>` : ""}${kbLine ? `<span class="mh-kb" role="status">${esc(kbLine)}</span>` : ""}` : `<span class="mh-prompt">Select a unit: tap it on the map or in the list below, or press 1–9.</span>`;
  // only the orders this unit can carry out now; the main ones first, the rest under "More orders"
  const btn = (x) => `<button type="button" class="mh-ord" data-ord="${x.k}" aria-pressed="${G.arm === x.k}">${LABEL[x.k]}<kbd>${x.key.toUpperCase()}</kbd></button>`;
  const can = e ? ORD.filter((x) => canDo(x.k, e)) : [];
  const prim = can.filter((x) => PRIMARY.has(x.k) || (G.scen.stealth && x.k === "observe"));
  const rest = can.filter((x) => !prim.includes(x));
  const more = rest.length ? `<details class="mh-more"${G.more || rest.some((x) => x.k === G.arm) ? " open" : ""}><summary>More orders</summary><div class="mh-more-list">${rest.map(btn).join("")}</div></details>` : "";
  ui.orders.innerHTML = `<div class="mh-sel">${head}</div>` + prim.map(btn).join("") + more + (opts ? `<div class="mh-opts">${opts}</div>` : "");
  ui.orders.querySelector(".mh-more")?.addEventListener("toggle", (ev) => { G.more = ev.target.open; });
  ui.orders._sig = barSig();
  ui.orders.querySelectorAll("[data-ord]").forEach((b) => b.addEventListener("click", () => arm(b.dataset.ord)));
  ui.orders.querySelectorAll("select[data-opt]").forEach((s) => s.addEventListener("change", () => {
    const f = s.dataset.opt;
    if (f === "tech") G.tech[G.arm] = s.value; else G.opts[f] = s.value;
  }));
  ui.orders.querySelector("[data-wp]")?.addEventListener("click", () => { G.wp = !G.wp; if (G.wp && !G.arm) G.arm = "move"; drawOrderBar(); });
  ui.orders.querySelector("[data-send]")?.addEventListener("click", sendDraft);
  ui.orders.querySelector("[data-cancel]")?.addEventListener("click", cancel);
}
const barSig = () => { const e = G.sel && elState(G.sel); return [G.sel, G.arm, G.wp, G.pts.length, G.kb ? G.kb.i : -1, e && ORD.map((x) => +canDo(x.k, e)).join(""), e?.task].join("|"); };
function refreshOrderBar() { if (ui.orders._sig !== barSig()) drawOrderBar(); }

function hint() {
  const e = G.sel && elState(G.sel);
  G.map.corners({ hint: !e ? "Select a unit" : G.arm ? `${LABEL[G.arm]}: ${PROMPT[G.arm].split(" (")[0]}` : `${e.short || e.name}: pick an order` });
}

export function select(id) {
  if (!G || G.phase !== "run") return false;
  const e = elState(id);
  if (!e || e.side !== "f" || e.ally) return false;
  if (G.sel !== id) { G.arm = null; G.pts = []; G.kb = null; }
  G.sel = id;
  G.view.lit = new Set([id]);
  drawOrderBar(); hint(); updateMarks(true);
  const r = $("#mt-roster"); if (r) { r._sig = ""; updateRunUi(G.state); }
  return true;
}
function deselect() { G.sel = null; G.arm = null; G.pts = []; G.kb = null; G.wp = false; G.view.lit = new Set(); drawOrderBar(); hint(); updateMarks(true); const r = $("#mt-roster"); if (r) { r._sig = ""; updateRunUi(G.state); } }
function cancel() { G.arm = null; G.pts = []; G.kb = null; drawOrderBar(); hint(); updateMarks(true); }

export function arm(k) {
  if (!G || G.phase !== "run" || !ORD_BY[k]) return false;
  const e = G.sel && elState(G.sel);
  if (!canDo(k, e)) return false;
  if (G.arm === k) { cancel(); return true; }
  G.arm = k; G.pts = []; G.kb = null;
  if (ORD_BY[k].need === null) { sendOrder(G.sel, { type: k }); G.arm = null; }
  drawOrderBar(); hint(); updateMarks(true);
  return true;
}

// what is under a ground point
function unitAt(x, y) {
  const R = PICK_R[G.scen.level];
  let bestId = null, bd = Infinity;
  for (const e of mine()) {
    if (e.strength === 0) continue;
    let d = Math.hypot(e.x - x, e.y - y) * 0.8;
    for (const s of G.state.soldiers) if (s.el === e.id && s.status === "ok") d = Math.min(d, Math.hypot(s.x - x, s.y - y));
    if (d < R && d < bd) { bd = d; bestId = e.id; }
  }
  return bestId;
}
// an enemy element at a ground point: known contacts first (spotted or last known), then (for a tap right on
// a suspected position) an unseen one, so a player can fire on or assault a position the map does not show
function enemyAt(x, y, allowUnseen = true) {
  const R = TGT_R[G.scen.level];
  let bestId = null, bd = Infinity;
  for (const c of G.state.contacts) { if (c.out) continue; const d = Math.hypot(c.x - x, c.y - y); if (d < R && d < bd) { bd = d; bestId = c.el; } }
  if (bestId || !allowUnseen) return bestId;
  for (const e of G.sim.S.els) {
    if (e.side !== "h" || e.surrendered || !e.soldiers.some((s) => s.status === "ok")) continue;
    const d = Math.hypot((e.cx ?? e.x) - x, (e.cy ?? e.y) - y);
    if (d < R * 0.6 && d < bd) { bd = d; bestId = e.id; }
  }
  return bestId;
}
const enemyPos = (id) => { const c = G.state.contacts.find((q) => q.el === id); if (c) return [c.x, c.y]; const e = G.sim.S.byId[id]; return [e.cx ?? e.x, e.cy ?? e.y]; };

function onMapClick(ev) {
  if (!G || G.phase !== "run" || !G.map) return;
  const [x, y] = G.map.pick(ev.clientX, ev.clientY);
  tap(x, y, { shift: ev.shiftKey });
}

export function tap(x, y, { shift = false } = {}) {
  if (!G || G.phase !== "run") return false;
  const wp = G.wp || shift;
  if (!G.arm) {
    const hit = unitAt(x, y);
    if (hit) return select(hit);
    if (!G.sel) { G.map.corners({ hint: "Select a unit first" }); return false; }
    if (G.sentAt && performance.now() - G.sentAt < 700) return false; // a double tap that just finished an order must not also send a Move
    G.arm = "move";
    if (!wp) { G.pts = [[x, y]]; return finishDest(); }
  }
  const o = ORD_BY[G.arm];
  const same = G.pts.length && d2(G.pts[G.pts.length - 1], [x, y]) < SAME_R[G.scen.level];
  if (o.need === "point") { sendOrder(G.sel, G.arm === "smoke" ? { type: "smoke", at: [x, y] } : { type: "callfire", at: [x, y], kind: G.opts.kind }); G.arm = null; G.pts = []; afterSend(); return true; }
  if (o.k === "shift") {
    const t = enemyAt(x, y) || [x, y];
    sendOrder(G.sel, { type: "shift", target: t }); G.arm = null; afterSend(); return true;
  }
  if (o.need === "target") {
    const t = enemyAt(x, y, true);
    if (t) return finishTarget(t);
    if (same && o.k === "sbf") { G.pts.pop(); return finishTarget([x, y]); }
    if (same && o.k === "assault") { G.map.corners({ hint: "Assault needs an enemy: tap near red soldiers or a red ring" }); return false; }
    G.pts.push([x, y]); drawOrderBar(); updateMarks(true);
    G.map.corners({ hint: o.k === "sbf" ? "Position set: now tap the target (same spot twice = area)" : "Waypoint: tap more, then the enemy" });
    return true;
  }
  // dest orders
  if (wp) {
    if (same) return finishDest();
    G.pts.push([x, y]); drawOrderBar(); updateMarks(true); return true;
  }
  G.pts.push([x, y]);
  return finishDest();
}
function sendDraft() {
  if (!G?.arm || !G.pts.length) return false;
  const o = ORD_BY[G.arm];
  if (o.need === "target") { if (o.k === "sbf") { const p = G.pts.pop(); return finishTarget(p); } G.map.corners({ hint: "Assault needs an enemy: tap one" }); return false; }
  return finishDest();
}

function finishTarget(target) {
  const e = elState(G.sel), k = G.arm;
  const here = [e.x, e.y];
  const tp = Array.isArray(target) ? target : enemyPos(target);
  const formation = G.opts.formation || undefined;
  let order;
  if (k === "assault") order = { type: "assault", route: [here, ...G.pts, tp], target, technique: G.tech.assault, formation: "line" };
  else order = { type: "sbf", route: G.pts.length ? [here, ...G.pts] : [here, here], target, technique: G.tech.sbf, formation };
  sendOrder(G.sel, order);
  G.arm = null; G.pts = []; afterSend();
  return true;
}

function finishDest() {
  const e = elState(G.sel), k = G.arm;
  if (!e || !G.pts.length) return false;
  const here = [e.x, e.y], S = G.sim.S, el = S.byId[e.id];
  const pts = G.pts.slice();
  const atSelf = pts.length === 1 && d2(pts[0], here) < PICK_R[G.scen.level];
  const route = atSelf ? [here, here] : [here, ...pts];
  const end = route[route.length - 1];
  const formation = G.opts.formation || undefined;
  const tech = G.tech[k];
  let order;
  switch (k) {
    case "hold": {
      let face = route.length > 1 && !atSelf ? bearing(route[route.length - 2], end) : el.face;
      const near = G.state.contacts.filter((c) => !c.out).sort((a, b) => d2([a.x, a.y], end) - d2([b.x, b.y], end))[0];
      if (near && d2([near.x, near.y], end) < 500) face = bearing(end, [near.x, near.y]);
      order = { type: "hold", route, face: Math.round(face), formation };
      break;
    }
    case "reserve": order = { type: "reserve", route }; break;
    case "breach": order = { type: "breach", route, technique: tech }; break;
    case "withdraw": {
      const partner = mine().find((x) => x.id !== e.id && x.kind === e.kind && x.strength > 0);
      order = { type: "withdraw", route, method: G.opts.method, partner: G.opts.method === "alternating" && partner ? partner.id : undefined, first: !(partner && partner.order === "withdraw") };
      break;
    }
    case "observe": order = { type: "observe", route, stops: pts.length > 1 ? pts.slice(0, -1) : pts, dwell: DWELL, technique: tech, formation }; break;
    case "counterattack": order = { type: "counterattack", route, zone: { x: end[0], y: end[1], r: TGT_R[G.scen.level] * 1.6 }, technique: "rush" }; break;
    default: {
      // a move from a defended position under fire is a displacement (it keeps moving when pinned, as a delay does)
      const displace = (el.order?.type === "hold" && el.inContact) || undefined;
      order = { type: k === "bypass" ? "bypass" : "move", route, technique: tech, formation, displace, label: displace ? "Displacing" : undefined };
    }
  }
  sendOrder(G.sel, order);
  G.arm = null; G.pts = []; afterSend();
  return true;
}
function afterSend() {
  G.kb = null; G.sentAt = performance.now(); G.wp = false; drawOrderBar(); hint(); updateMarks(true); }

// ---------- keyboard targets: after picking Move / Bypass / Assault / Support by fire, Tab or the arrow keys
// cycle through the element's named routes (from where it now stands) and the known enemy; Enter sends ----------
const KB_TYPES = new Set(["move", "bypass", "sbf", "assault"]);
function kbList() {
  const e = G.sel && elState(G.sel), k = G.arm, out = [];
  if (!e || !KB_TYPES.has(k)) return out;
  const here = [e.x, e.y], fire = k === "sbf" || k === "assault";
  const contacts = G.state.contacts.filter((c) => !c.out);
  const nearC = (p, maxD) => { let b = null, bd = maxD; for (const c of contacts) { const d = d2(p, [c.x, c.y]); if (d < bd) { bd = d; b = c; } } return b; };
  for (const key of routeKeysFor(G.scen, e.id)) {
    const R = G.scen.routes[key].pts.map((q) => q.slice(0, 2));
    // join the route at its point nearest the element, so a later order does not walk back to the start
    let bi = 0, bd = Infinity; R.forEach((q, i) => { const d = d2(q, here); if (d < bd) { bd = d; bi = i; } });
    const pts = R.slice(Math.min(bi + 1, R.length - 1));
    const end = R[R.length - 1];
    let c = fire ? nearC(end, k === "sbf" ? 450 * (G.scen.level === "company" ? 1.6 : 1) : TGT_R[G.scen.level] * 3) : null;
    // not yet seen: the briefing still names the objective's positions, so a route that ends on one can target it
    if (fire && !c) { const o = (G.scen.objectiveEls || []).map((id) => G.scen.forces.enemy.find((x) => x.id === id)).filter((x) => x && G.sim.S.byId[x.id]?.ok > 0).sort((a, b) => d2(a.at, end) - d2(b.at, end))[0]; if (o && d2(o.at, end) < (k === "sbf" ? 450 : TGT_R[G.scen.level] * 3)) c = { el: o.id, x: o.at[0], y: o.at[1] }; }
    if (k === "assault" && !c) continue;
    if (d2(end, here) < PICK_R[G.scen.level] && k !== "sbf") continue;
    out.push({ route: key, pts, target: c?.el, label: `route “${G.scen.routes[key].label}”${c ? `, ${k === "sbf" ? "firing on" : "at"} ${nameOf(c.el)}` : ""}` });
  }
  if (fire) for (const c of contacts) out.push({ target: c.el, at: [c.x, c.y], label: `${k === "sbf" ? "fire from here on" : "straight at"} ${nameOf(c.el)}${c.spotted ? "" : " (last seen)"}` });
  return out;
}
function kbStep(d) {
  const list = kbList();
  if (!list.length) return false;
  G.kb = { list, i: G.kb ? (G.kb.i + d + list.length) % list.length : d > 0 ? 0 : list.length - 1 };
  const c = G.kb.list[G.kb.i];
  G.pts = c.pts ? c.pts.map((q) => q.slice()) : [];
  drawOrderBar(); updateMarks(true);
  return true;
}
function kbConfirm() {
  const c = G.kb?.list[G.kb.i];
  if (!c || !G.arm) return false;
  G.pts = c.pts ? c.pts.map((q) => q.slice()) : [];
  if (G.arm === "sbf" || G.arm === "assault") return finishTarget(c.target || G.pts[G.pts.length - 1]);
  return finishDest();
}

function describe(o) {
  const tgt = (t) => (Array.isArray(t) ? "the area" : nameOf(t).replace(/^Enemy /, "the enemy "));
  switch (o.type) {
    case "move": return `move, ${TECHNIQUES[o.technique] || "traveling"}${o.formation ? `, ${o.formation}` : ""}`;
    case "bypass": return `bypass, ${TECHNIQUES[o.technique] || "traveling"}`;
    case "sbf": return `support by fire on ${tgt(o.target)}`;
    case "assault": return `assault ${tgt(o.target)}`;
    case "hold": return "hold and dig in";
    case "reserve": return "reserve: wait, concealed";
    case "breach": return "breach the obstacle";
    case "withdraw": return `break contact${o.method === "alternating" ? " by alternating bounds" : ", everyone at once"}`;
    case "observe": return `observe from ${o.stops?.length || 1} point${(o.stops?.length || 1) > 1 ? "s" : ""}`;
    case "counterattack": return "counterattack";
    case "lift": return "lift fire";
    case "shift": return `shift fire to ${tgt(o.target)}`;
    case "smoke": return "smoke";
    case "callfire": return `fire mission, ${o.kind === "smoke" ? "smoke" : "high explosive"}`;
    default: return LABEL[o.type] || o.type;
  }
}
function radio(text, extra = {}) { const t = G.sim.S.t; G.radio.push({ t: +t.toFixed(1), clock: fmtClock(t), type: "radio", text, ...extra }); }

// Give an order. Company level: it goes by radio and takes effect after the core's notional delay.
export function sendOrder(elId, order) {
  if (!G || G.phase !== "run") return false;
  const e = elState(elId);
  if (!e || e.side !== "f" || e.ally) return false;
  G.nOrders++;
  const t = G.sim.S.t;
  // for the AAR: which named scenario route (if any) this drawn order follows
  const rk = order.route && matchRoute(G.scen, elId, order.route, ROUTE_TOL[G.scen.level] || 40);
  if (rk) (G.used = G.used || []).push([elId, rk]);
  if (G.scen.level === "company") {
    const [a, b] = NOTIONAL.hardDelay;
    const delay = a + (hashStr(`${elId}:${t}:${G.nOrders}`) % 1000) / 1000 * (b - a);
    const isAct = ORD_BY[order.type]?.action;
    if (!isAct) G.pend = G.pend.filter((p) => !(p.el === elId && !ORD_BY[p.order.type]?.action)); // a new order supersedes one still on the radio
    G.pend.push({ el: elId, order, at: t + delay, sent: t });
    radio(`You to ${shortOf(elId)}: ${describe(order)} (by radio, about ${Math.round(delay)} s)`);
    updateMarks(true);
    return { delay };
  }
  deliver({ el: elId, order });
  return true;
}
function deliver(p) {
  const ok = G.sim.issue(p.el, p.order);
  if (ok && p.order.type !== "smoke" && p.order.type !== "callfire") radio(`${shortOf(p.el)}: ${G.scen.level === "company" ? "roger, " : ""}${describe(p.order)}`);
}
function deliverDue() {
  if (!G.pend.length) return;
  const t = G.sim.S.t;
  const due = G.pend.filter((p) => p.at <= t + 1e-9);
  if (!due.length) return;
  G.pend = G.pend.filter((p) => p.at > t + 1e-9);
  for (const p of due) deliver(p);
}

// ---------- the radio log: the sim's events as reports ----------
function pullRadio() {
  const S = G.sim.S, ev = S.events;
  for (; G.evN < ev.length; G.evN++) {
    const e = ev[G.evN];
    if (G.phase === "run") contactCheck(e);
    const r = toRadio(e);
    if (r) G.radio.push({ t: e.t, clock: e.clock, type: e.type, text: r, side: e.side });
  }
  sitrep();
}
// when the net has been quiet for a while, one element reports in (rotating through them): where it is,
// what it is doing, how many are up and whether it is under fire. Game time; never more often than SITREP_GAP.
const SITREP_GAP = 75;
function sitrep() {
  const S = G.sim.S, t = S.t;
  const lastT = G.radio.length ? G.radio[G.radio.length - 1].t : 0;
  if (t - lastT < SITREP_GAP || S.done) return;
  const els = mine().filter((e) => e.strength > 0);
  if (!els.length) return;
  G.srN = ((G.srN ?? -1) + 1) % els.length;
  const e = els[G.srN];
  const obj = G.scen.objective, f = featureNear(e.x, e.y);
  const dObj = obj ? Math.hypot(obj.x - e.x, obj.y - e.y) : 0, step = G.scen.level === "company" ? 50 : 10;
  const where = f || (obj && dObj > step ? `${Math.max(step, Math.round(dObj / step) * step)} m ${compass([obj.x, obj.y], [e.x, e.y])} of the objective` : "on the objective");
  const up = e.size - e.down;
  const fire = e.pinned ? "pinned, taking heavy fire" : e.suppression > 0.5 ? "under heavy fire" : e.inContact || e.suppression > 0.15 ? "in contact" : e.firing ? "engaging, not taking fire" : "no contact";
  const task = (e.task || "holding").replace(/^\w/, (c) => c.toLowerCase());
  radio(`${e.short || e.name}: sitrep, ${task}, ${where}; ${up} of ${e.size} up, ${fire}. Over.`, { type: "sitrep" });
}
function toRadio(ev) {
  const S = G.sim.S;
  const el = ev.el ? S.byId[ev.el] : null;
  const fr = el && el.side === "f";
  const sh = el ? el.short || el.name : "";
  const rest = (text) => (el && text.startsWith(el.name) ? text.slice(el.name.length).replace(/^[:\s]+/, "") : text).replace(/\bEnemy /g, "the enemy ");
  switch (ev.type) {
    case "order": return null; // the page writes its own order traffic
    case "down": {
      if (!fr || el.ally) return null;
      const c = (G.cas[el.id] = G.cas[el.id] || { t: -99, n: 0 });
      c.n++;
      if (ev.t - c.t < 8) return null;
      const n = c.n; c.n = 0; c.t = ev.t;
      return `${sh}: ${n > 1 ? `${n} casualties` : "casualty"}`;
    }
    case "spotted": {
      if (ev.side === "h") return el ? `${sh}: we've been spotted` : ev.text;
      const k = S.know.f[ev.el];
      if (!k) return ev.text;
      const pos = [k.x, k.y];
      const near = mine().filter((m) => m.strength > 0).sort((a, b) => d2([a.x, a.y], pos) - d2([b.x, b.y], pos))[0];
      if (!near) return ev.text;
      const dist = d2([near.x, near.y], pos), step = G.scen.level === "company" ? 50 : 10;
      const f = featureNear(pos[0], pos[1]);
      return `${near.short || near.name}: contact, ${kindWord(ev.el)}, ${compass([near.x, near.y], pos)}, ${Math.max(step, Math.round(dist / step) * step)} m${f ? `, ${f}` : ""}`;
    }
    case "pinned": return fr ? `${sh}: pinned down, taking heavy fire` : ev.text;
    case "sbf": return fr ? `${sh}: set, suppressing ${(ev.text.split(" on ").pop() || "the target").replace(/^Enemy /, "the enemy ")}` : ev.text;
    case "arrive": return fr && ev.t >= 1 ? `${sh}: ${/rally/.test(ev.text) ? "at the rally point" : "in position"}` : null;
    case "lift": return fr ? `${sh}: lifting fire, staying in position` : ev.text;
    case "smoke": return fr ? `${sh}: smoke out` : ev.text;
    case "lane": return fr ? `${sh}: ${/hasty/.test(ev.text) ? "forced a hasty lane" : "lane open"}` : ev.text;
    case "cleared": return ev.side === "h" ? `${ev.text.replace(/^Enemy /, "The enemy ")}` : `${sh}: out of action`;
    case "stall": return fr ? `${sh}: gone to ground, the attack has stalled` : ev.text;
    case "obstacle": return fr ? `${sh}: held at the obstacle` : ev.text;
    case "casevac": return null;
    default: return fr ? `${sh}: ${rest(ev.text)}` : ev.text;
  }
}

// ---------- chalk on the map: current route of the selected unit, orders on the radio, the draft ----------
function updateMarks(force) {
  if (!G?.map || G.phase !== "run") return;
  const t = G.sim.S.t;
  const sel = G.sel && elState(G.sel);
  const pend = G.pend.map((p) => ({ p, left: Math.max(0, Math.ceil(p.at - t)) }));
  const sig = [G.sel, sel?.order, sel?.route?.length, sel?.route?.[sel.route.length - 1]?.join(), G.arm, G.pts.map((q) => q.join()).join(";"), pend.map((q) => `${q.p.el}${q.left}`).join(",")].join("|");
  if (!force && sig === G.marksSig) return;
  G.marksSig = sig;
  const marks = [];
  const len = (p) => p.reduce((n, q, i) => (i ? n + d2(q, p[i - 1]) : 0), 0);
  if (sel?.route && len(sel.route) > 6 && sel.order !== "reserve") marks.push({ pts: sel.route, cls: "mt-route mt-sel" });
  const tags = [];
  for (const { p, left } of pend) {
    const e = elState(p.el);
    if (!e) continue;
    const r = p.order.route || (p.order.at ? [[e.x, e.y], p.order.at] : null);
    const end = r ? r[r.length - 1] : [e.x, e.y];
    if (r && len(r) > 6) marks.push({ pts: r, cls: "mt-route mh-pend" });
    tags.push({ at: end, text: `${e.short || e.name}: radio ${left} s`, cls: "mh-tag" });
  }
  if (sel && G.pts.length) marks.push({ pts: [[sel.x, sel.y], ...G.pts], cls: "mt-route mh-draft", arrow: G.arm !== "sbf" });
  G.map.setPlan(G.map.planMarks(marks));
  // countdown tags sit above the soldiers and trees: a thin SVG of their own over the map
  const host = ui.card.querySelector(".mt-map-host"), base = host.querySelector("svg.iso-svg");
  let over = host.querySelector("svg.mh-over");
  if (!over) { host.insertAdjacentHTML("beforeend", `<svg class="mt-map-svg mh-over" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>`); over = host.querySelector("svg.mh-over"); }
  if (base) over.setAttribute("viewBox", base.getAttribute("viewBox"));
  over.innerHTML = tags.map((tg) => { const [sx, sy] = G.map.toView(tg.at); return `<text class="${tg.cls}" x="${sx.toFixed(1)}" y="${(sy - 9).toFixed(1)}" text-anchor="middle">${esc(tg.text)}</text>`; }).join("");
}

// ---------- AAR ----------
function showAAR() {
  setPhase("aar");
  stopLoop();
  ui.help.hidden = true;
  ui.card.classList.remove("is-paused");
  G.arm = null; G.pts = []; G.sel = null; G.view.lit = new Set();
  ui.orders.innerHTML = "";
  const st = (G.state = G.sim.state());
  pullRadio();
  const aar = G.sim.aar();
  // Hard has no chosen plan: judge the concepts against the scenario plan the orders came closest to
  const bestP = closestPlan(G.scen, G.used || []);
  if (bestP) {
    aar.planned = { id: bestP.id, name: `Your orders came closest to: ${bestP.name}`, form: bestP.form, summary: bestP.summary, doctrinal: !!bestP.doctrinal };
    aar.concepts = conceptStatus(G.scen, bestP.concepts || []);
  }
  G.view.fog = false;
  G.map.setPlan("");
  const over = ui.card.querySelector("svg.mh-over"); if (over) over.innerHTML = "";
  G.map.frame(st, st.t, G.view);
  const isBest = best.put(MODE, G.scen.id, aar.score);
  G.map.corners({ hint: "After-action review", readout: `${aar.score.grade} · ${st.losses.friendly} vs ${st.losses.enemy} down` });
  ui.panel.innerHTML = `<div class="mt-clock"><span id="mt-clock">${esc(st.clock)}</span><span class="mt-muted"> / ${fmtClock(G.scen.timeLimit)}</span><span class="mt-losses">${st.losses.friendly} vs ${st.losses.enemy} down</span></div><h3>Your units</h3><div class="mt-roster" id="mt-roster"></div><h3>Radio log</h3><ol class="mt-log" id="mt-log"></ol>`;
  roster($("#mt-roster"), st);
  eventLog($("#mt-log"), { events: G.radio });
  ui.controls.innerHTML = `<button type="button" class="btn btn-primary" id="mt-retry">Retry</button><button type="button" class="btn btn-outline" id="mt-rec">Show the recommended plan</button><button type="button" class="mt-link" id="mt-other">Other scenarios</button>`;
  $("#mt-retry").addEventListener("click", () => openScenario(G.scen.id, { seed: G.seed }));
  $("#mt-rec").addEventListener("click", showRecommended);
  $("#mt-other").addEventListener("click", showPicker);
  ui.aar.hidden = false;
  const rec = G.rec;
  const scrub = (i) => { const s = rec.state(i); G.map.setPlan(""); G.map.frame(s, s.t, { fog: false, lit: new Set() }); G.map.corners({ readout: `${s.clock} · ${s.losses.friendly} vs ${s.losses.enemy} down` }); return s.clock; };
  ui.aar.innerHTML = `<h2>After-action review</h2><div id="mh-rec-box"></div><div id="mt-aar-body"></div>`;
  aarView($("#mt-aar-body"), aar, {
    frames: rec.frames.length, onScrub: scrub, onSeek: (t) => rec.indexAt(t),
    extra: `<p class="mt-muted">Run ${G.seed} · you gave ${G.nOrders} order${G.nOrders === 1 ? "" : "s"}${isBest && aar.score.tier < 3 ? " · new best for this scenario" : ""}. Retry plays the same scenario with the same chances.</p>`,
  });
}

// the recommended plan: its scheme, each element's task, and its routes in chalk on the start positions
function showRecommended() {
  const s = G.scen, p = s.plans.find((x) => x.doctrinal);
  if (!p) return false;
  const names = Object.fromEntries([...s.forces.friendly, ...s.forces.enemy].map((e) => [e.id, e.short || e.name]));
  const trig = (t) => (typeof t === "string" ? s.triggers?.[t]?.label || t : describeTrigger(t, names));
  const route = (r) => (typeof r === "string" ? s.routes[r]?.label || r : "as drawn");
  const rows = Object.entries(p.assign).map(([id, a]) => {
    const chain = [a, ...(a.then || [])].map((x, i) => `${i ? "then " : ""}${TASKS[x.task] || x.task}${x.route ? ` (${route(x.route)})` : ""}${x.wait ? `, ${trig(x.wait)}` : ""}${x.trigger ? `, ${x.task === "sbf" ? "lift " : ""}${trig(x.trigger).replace(/^Lift /, "")}` : ""}`);
    return `<li><b>${esc(s.forces.friendly.find((f) => f.id === id)?.name || id)}</b>: ${esc(chain.join("; "))}</li>`;
  }).join("");
  const acts = (p.actions || []).map((a) => `<li>${esc(s.forces.friendly.find((f) => f.id === a.el)?.name || a.el)}: ${esc(LABEL[a.action.type] || a.action.type)}${a.action.kind ? ` (${a.action.kind === "smoke" ? "smoke" : "high explosive"})` : ""}, ${esc(trig(a.trigger))}</li>`).join("");
  $("#mh-rec-box").innerHTML = `<div class="mh-rec"><h3>Recommended plan: ${esc(p.name)}</h3><p class="mt-muted">${esc(p.form || "")}</p><p>${esc(p.summary)}</p><ul>${rows}${acts}</ul>` +
    `<p class="mt-fine">One good answer, not the only one. In real time the timing is yours: ${s.level === "company" ? "allow for the radio delay and " : ""}give each order as its trigger comes up.</p></div>`;
  // chalk the routes on the start positions
  const st0 = createSim(s, { seed: G.seed, mode: MODE }).state();
  const me = Object.keys(p.assign).find((id) => p.assign[id].task === "assault") || Object.keys(p.assign).find((id) => p.assign[id].task === "breach");
  const pts = (r) => (Array.isArray(r) ? r : s.routes[r]?.pts);
  const marks = [];
  const [bw, bd] = BOX[s.level];
  for (const [id, a] of Object.entries(p.assign)) {
    [a, ...(a.then || [])].forEach((step, k) => {
      const q = pts(step.route);
      if (!q || q.length < 2 || q.reduce((n, v, i) => (i ? n + d2(v, q[i - 1]) : 0), 0) < 6) return;
      marks.push({ pts: q, cls: id === me ? "mt-route mt-main" : "mt-route" });
      if ((step.task === "sbf" || step.task === "fix") && k === 0) {
        const end = q[q.length - 1];
        const tp = Array.isArray(step.target) ? step.target : s.forces.enemy.find((x) => x.id === step.target)?.at || end;
        marks.push({ box: [end[0], end[1], bearing(end, tp) + 90, bw, bd], cls: "mt-route mt-box" });
      }
    });
  }
  G.map.frame(st0, 0, { fog: false, lit: new Set(me ? [me] : []) });
  G.map.setPlan(G.map.planMarks(marks));
  G.map.corners({ hint: "Recommended plan", readout: "start positions" });
  ui.card.scrollIntoView({ block: "start", behavior: "smooth" });
  return true;
}

// ---------- input ----------
ui.card.addEventListener("click", onMapClick);
addEventListener("keydown", (ev) => {
  if (!G || G.phase !== "run" || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || "")) return;
  const k = ev.key;
  if (k === " " || k === "Spacebar") { ev.preventDefault(); if (ui.help.hidden) setPaused(!G.paused); return; }
  if (k === "Escape") { ev.preventDefault(); if (!ui.help.hidden) { ui.help.querySelector("#mh-help-ok")?.click(); return; } if (G.arm || G.pts.length) cancel(); else deselect(); return; }
  if (G.arm && KB_TYPES.has(G.arm) && (G.kb || !G.pts.length) && /^(Tab|Arrow(Right|Left|Up|Down))$/.test(k)) { if (kbStep(k === "ArrowLeft" || k === "ArrowUp" || (k === "Tab" && ev.shiftKey) ? -1 : 1)) ev.preventDefault(); return; }
  if (k === "Enter" && G.kb && G.arm) { ev.preventDefault(); kbConfirm(); return; }
  if (k === "Enter" && G.pts.length) { ev.preventDefault(); sendDraft(); return; }
  if (/^[1-9]$/.test(k)) { const e = mine()[Number(k) - 1]; if (e) { ev.preventDefault(); select(e.id); } return; }
  const o = ORD.find((x) => x.key === k.toLowerCase());
  if (o && G.sel) { ev.preventDefault(); arm(o.k); }
});

ui.steps.innerHTML = [["brief", "Briefing"], ["run", "Fight"], ["aar", "Review"]].map(([k, v]) => `<li data-step="${k}">${v}</li>`).join("");
$("#mt-to-picker").addEventListener("click", showPicker);
const start = location.hash.slice(1);
if (byId[start]) { picker(ui.picker, MODE, (id) => openScenario(id)); openScenario(start, { instant: true }); } else showPicker();

// ---------- testing hooks (advance is for tests only) ----------
window.__trainerHard = {
  pick: (id, seed = 1) => { openScenario(id, { instant: true, seed }); return !!G; },
  start: () => startClock(true),
  select, arm, tap,
  kb: (d = 1) => kbStep(d), kbConfirm: () => kbConfirm(), kbChoice: () => (G?.kb ? G.kb.list[G.kb.i].label : null),
  order: (elId, order) => sendOrder(elId, order),
  advance: (sec) => {
    if (!G || G.phase !== "run") return false;
    const n = Math.round(sec / NOTIONAL.dt);
    for (let i = 0; i < n && !G.sim.done(); i++) {
      deliverDue(); G.sim.step(NOTIONAL.dt);
      if (i % 10 === 9) { G.state = G.sim.state(); G.rec.add(G.state); pullRadio(); }
    }
    G.state = G.sim.state(); G.vt = G.state.t; G.rec.add(G.state);
    G.map.frame(G.state, G.vt, G.view); updateRunUi(G.state);
    if (G.state.done) { G.rec.add(G.state, true); showAAR(); }
    return G.state.clock;
  },
  finish: () => stopExercise(),
  pause: (on = true) => setPaused(on), speed: (n) => setSpeed(n), paused: () => !!G?.paused, tempo: () => (G ? TEMPO[G.scen.level] : null),
  recommended: () => showRecommended(),
  state: () => (G ? { phase: G.phase, scen: G.scen.id, seed: G.seed, t: G.sim.S.t, clock: fmtClock(G.sim.S.t), sel: G.sel, arm: G.arm, pts: G.pts.length, pend: G.pend.map((p) => ({ el: p.el, type: p.order.type, left: +(p.at - G.sim.S.t).toFixed(1) })), radio: G.radio.length, done: G.sim.done(), score: G.sim.done() ? G.sim.score() : null, stats: G.map.stats() } : null),
  radio: (n = 12) => (G ? G.radio.slice(-n).map((r) => `${r.clock} ${r.text}`) : []),
  fps: (ms = 3000) => new Promise((done) => { let n = 0, worst = 0, prev = performance.now(); const t0 = prev; const f = (now) => { n++; worst = Math.max(worst, now - prev); prev = now; if (now - t0 < ms) requestAnimationFrame(f); else done({ fps: +(n * 1000 / (now - t0)).toFixed(1), worstMs: +worst.toFixed(1) }); }; requestAnimationFrame(f); }),
};
