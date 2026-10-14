// Maneuver Trainer, Medium: turn-based orders (WEGO). Scenario picker → briefing → every turn the
// player selects each element (map, roster or number key), gives it an order from the core
// vocabulary and taps the ground for its destination or target → End turn runs the core's
// runTurn for one turn of game time (fire team 20 s, platoon 45 s, company 2 min), animated, for
// both sides at once → a "what changed" summary and new orders → score and after-action review.
// Orders stand until changed. All game logic is the core's (createSim / issue / runTurn); this
// file builds order objects, draws them as chalk and keeps the turn loop.
import { esc, best, picker, briefing, mountMap, roster, eventLog, recorder, aarView, byId, fmtClock } from "./ui.mjs";
import { createSim } from "../core/sim.mjs";
import { ORDER_LABELS, TECHNIQUES, TASKS, compilePlan, describeTrigger } from "../core/orders.mjs";
import { KINDS } from "../core/units.mjs";
import { conceptStatus, closestPlan } from "../core/aar.mjs";
import { LOOK } from "../core/render.mjs";

const MODE = "medium";
const TURN = { fireteam: 20, platoon: 45, company: 120 };          // game seconds per turn (brief)
const PLAY = { slow: 14, normal: 7, fast: 3 };                       // real seconds a turn takes to play
const ZONE = { fireteam: 50, platoon: 140, company: 250 };           // counterattack zone radius
const LIFT_AT = { fireteam: 35, platoon: 55, company: 80 };          // "lift when the assault is close"
const BOX = { fireteam: [16, 7], platoon: [44, 16], company: [110, 34] };
const TAP_PX = 30;                                                     // tap tolerance in card px
const ACTS = new Set(["lift", "shift", "smoke", "callfire"]);
const MOVE_TYPES = new Set(["move", "bypass", "assault", "breach", "observe", "withdraw", "counterattack"]);
const KEY_EVENTS = new Set(["sbf", "lift", "assault", "cleared", "surrender", "withdraw", "displace", "break", "stall", "lane", "obstacle", "counter", "culminate", "smoke", "fire", "report", "alert", "decisive", "objective", "pinned", "spotted", "consolidate", "end"]);
const ORDER_BTNS = [
  ["move", "Move"], ["bypass", "Bypass"], ["sbf", "Support by fire"], ["assault", "Assault"], ["hold", "Hold / defend"],
  ["reserve", "Reserve"], ["counterattack", "Counterattack"], ["breach", "Breach"], ["withdraw", "Break contact"],
  ["observe", "Observe / reconnoiter"], ["smoke", "Smoke"], ["callfire", "Call for fire"], ["shift", "Shift fire"], ["lift", "Lift fire"],
];
const DEF_TECH = { move: "overwatch", bypass: "overwatch", sbf: "overwatch", assault: "overwatch", breach: "overwatch", observe: "infiltrate", counterattack: "rush", hold: "travelling", reserve: "travelling" };

const $ = (s) => document.querySelector(s);
const ui = {
  pick: $("#mt-pick"), picker: $("#mt-picker"), game: $("#mt-game"), title: $("#mt-title"), steps: $("#mt-steps"),
  card: $("#mt-card"), controls: $("#mt-controls"), panel: $("#mt-panel"), aar: $("#mt-aar"),
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const bearing = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
const polyLen = (p) => p.reduce((n, q, i) => (i ? n + dist(q, p[i - 1]) : 0), 0);
const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy; const u = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy); };
const polyDist = (p, pts) => { let d = Infinity; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(p, pts[i], pts[i + 1])); return d; };
const r1 = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];

let G = null;

// ---------- phases ----------
function setPhase(p) {
  G.phase = p;
  ui.steps.querySelectorAll("[data-step]").forEach((s) => s.setAttribute("aria-current", s.dataset.step === (p === "turn" ? "orders" : p) ? "step" : "false"));
  ui.game.setAttribute("data-phase", p);
}

function openScenario(id, keep = {}) {
  const scen = byId[id];
  if (!scen) return false;
  stopLoop();
  G?.map?.dispose?.();
  ui.pick.hidden = true; ui.game.hidden = false; ui.aar.hidden = true; ui.aar.innerHTML = "";
  ui.title.textContent = scen.title;
  const seed = keep.seed ?? 1 + Math.floor(Math.random() * 999);
  G = {
    scen, seed, phase: "brief", turn: 1, turnLen: TURN[scen.level], sel: null, arm: null, staged: {}, acts: [], watch: [], opts: {},
    showRec: !!keep.showRec, advisor: null, speed: G?.speed || "normal", paused: false, changes: null, view: { fog: true, lit: new Set() },
  };
  G.map = mountMap(ui.card, scen);
  G.map.onresize = () => { drawMarks(); if (G.state) G.map.frame(G.state, G.state.t, G.view); };
  G.sim = createSim(scen, { seed, mode: MODE });
  G.state = G.sim.state();
  G.rec = recorder(G.state, scen.timeLimit > 1200 ? 2 : 1);
  G.rec.add(G.state, true);
  G.map.frame(G.state, 0, G.view);
  G.map.corners({ hint: "Briefing", readout: `0:00 / ${fmtClock(scen.timeLimit)}` });
  try { history.replaceState(null, "", `#${id}`); } catch (e) {}
  if (G.showRec) G.advisor = makeAdvisor(scen);
  if (keep.orders) startOrders(); else showBrief();
  ui.game.scrollIntoView({ block: "start", behavior: keep.instant ? "auto" : "smooth" });
  return true;
}

function showPicker() {
  stopLoop();
  G?.map?.dispose?.();
  G = null;
  ui.game.hidden = true; ui.pick.hidden = false;
  try { history.replaceState(null, "", location.pathname); } catch (e) {}
  picker(ui.picker, MODE, (id) => openScenario(id));
}

// ---------- briefing ----------
function showBrief() {
  setPhase("brief");
  const s = G.scen;
  ui.panel.innerHTML = `<h3>Briefing</h3><div id="mt-brief"></div><p class="mt-muted">Concepts in play: ${s.concepts.map((c) => `<a href="${c.href}">Fig ${c.fig} ${esc(c.title)}</a>`).join(", ")}.</p>` +
    `<p class="mt-muted">Each turn is ${G.turnLen < 60 ? `${G.turnLen} seconds` : `${G.turnLen / 60} minutes`} of game time; you have ${fmtClock(s.timeLimit)} in all.</p><button type="button" class="btn btn-primary mt-go" id="md-to-orders">Give orders</button>`;
  briefing($("#mt-brief"), s);
  ui.controls.innerHTML = `<span class="mt-muted">Blue: your troops. Red: the enemy, shown only once spotted. Soldiers drawn larger than scale; all numbers notional.</span>`;
  $("#md-to-orders").addEventListener("click", () => { startOrders(); showMap(); });
  G.map.setPlan("");
}

// ---------- the orders phase ----------
const friendly = () => G.state.elements.filter((e) => e.side === "f");
const elState = (id) => G.state.elements.find((e) => e.id === id);
const elSpec = (id) => G.scen.forces.friendly.find((e) => e.id === id);
const nameOf = (id) => { const e = G.state.elements.find((x) => x.id === id); return e ? e.short || e.name : id; };
const fullName = (id) => { const e = G.state.elements.find((x) => x.id === id); return e ? e.name : id; };
const commandable = (id) => { const e = elState(id); return !!e && e.side === "f" && !e.ally && e.strength > 0; };

function startOrders() {
  setPhase("orders");
  drawPanel();
  drawControls();
  drawMarks();
  hint();
}

// phones: the roster and the Give orders button sit below the map, so after using them bring the map and its order buttons back into view
function showMap() {
  const r = ui.card.getBoundingClientRect();
  if (r.top < 0 || r.top > innerHeight * 0.5) ui.card.scrollIntoView({ block: "start", behavior: "smooth" });
}

function hint() {
  const st = G.state;
  G.map.corners({ hint: G.phase === "turn" ? `Turn ${G.turn} · ${G.paused ? "paused" : "running"}` : G.phase === "aar" ? "After-action review" : `Turn ${G.turn} · orders`, readout: `${st.clock} · ${st.losses.friendly} vs ${st.losses.enemy} down` });
}

function drawPanel() {
  const s = G.scen, st = G.state;
  const turns = Math.ceil(s.timeLimit / G.turnLen);
  const rec = G.showRec ? s.plans.find((p) => p.doctrinal) : null;
  const names = Object.fromEntries([...s.forces.friendly, ...s.forces.enemy].map((e) => [e.id, e.short || e.name]));
  const recHtml = rec ? `<div class="md-rec"><h3>Recommended plan</h3><p><b>${esc(rec.name)}</b> <span class="mt-form">${esc(rec.form || "")}</span></p><p class="mt-muted">${esc(rec.summary)}</p><ul>${Object.entries(rec.assign).map(([id, a]) => {
    const steps = [a, ...(a.then || [])].map((b) => {
      const trig = b.trigger ? (typeof b.trigger === "string" ? s.triggers?.[b.trigger]?.label : describeTrigger(b.trigger, names)) || "" : "";
      const trigText = trig ? (b.task === "sbf" || b.task === "fix" ? (/^lift/i.test(trig) ? trig : `lift ${trig}`) : trig) : "";
      return `${TASKS[b.task] || b.task}${b.route && s.routes[b.route] ? `, ${s.routes[b.route].label.replace(/^[A-Z](?=[a-z ])/, (c) => c.toLowerCase())}` : ""}${trigText ? ` (${trigText.replace(/^[A-Z](?=[a-z ])/, (c) => c.toLowerCase())})` : ""}`;
    });
    return `<li><b>${esc(names[id] || id)}</b>: ${esc(steps.join("; then "))}</li>`;
  }).join("")}</ul><p class="mt-muted">Its routes are the dotted chalk on the map. “Recommended orders” fills in this turn’s orders from it; you can still change any of them.</p></div>` : "";
  ui.panel.innerHTML = `<div class="mt-clock"><span class="md-turn">Turn <b id="md-turn">${G.turn}</b><span class="mt-muted"> of ${turns}</span></span><span id="mt-clock">${st.clock}</span><span class="mt-muted"> / ${fmtClock(s.timeLimit)}</span><span id="mt-losses" class="mt-losses">${st.losses.friendly} vs ${st.losses.enemy} down</span></div>` +
    `<div id="md-changes" class="md-changes">${changesHtml()}</div>` +
    `<h3>Your units</h3><div class="mt-roster md-roster" id="mt-roster"></div>` +
    `<div id="md-staged" class="md-staged"></div>` + recHtml +
    `<h3>Log</h3><ol class="mt-log" id="mt-log"></ol>`;
  updatePanel();
}

function updatePanel() {
  const st = G.state;
  const c = $("#mt-clock"); if (c) c.textContent = st.clock;
  const t = $("#md-turn"); if (t) t.textContent = String(G.turn);
  const l = $("#mt-losses"); if (l) l.textContent = `${st.losses.friendly} vs ${st.losses.enemy} down`;
  const r = $("#mt-roster"); if (r) { r._sig = null; roster(r, st, { selected: G.sel, onSelect: G.phase === "orders" ? (id) => { select(id); showMap(); } : null }); markRoster(r); }
  const g = $("#mt-log"); if (g) eventLog(g, st);
  drawStaged();
}
// new orders this turn, shown under each roster row
function markRoster(r) {
  r.querySelectorAll("[data-el]").forEach((row, i) => {
    row.dataset.n = i < 9 ? String(i + 1) : "";
    const id = row.dataset.el, o = G.staged[id], acts = G.acts.filter((a) => a.el === id), ws = G.watch.filter((x) => x.el === id);
    if (o || acts.length || ws.length) row.insertAdjacentHTML("beforeend", `<span class="md-new">${o || acts.length ? "New: " : "On order: "}${esc([o ? describe(o, id) : "", ...acts.map((a) => describe(a.action, id)), ...ws.map(watchText)].filter(Boolean).join("; "))}</span>`);
  });
}
function watchText(w) {
  if (w.type === "liftNear") return "lift fire when the assault is close";
  const names = Object.fromEntries([...G.scen.forces.friendly, ...G.scen.forces.enemy].map((e) => [e.id, e.short || e.name]));
  return `${describe(w.order, w.el).replace(/^[A-Z](?=[a-z ])/, (c) => c.toLowerCase())} ${describeTrigger(w.trigger, names)}`;
}
function drawStaged() {
  const el = $("#md-staged");
  if (!el) return;
  const n = Object.keys(G.staged).length + G.acts.length + G.watch.length;
  el.innerHTML = G.phase === "orders" ? `<p class="mt-muted">${n ? `${n} new order${n > 1 ? "s" : ""} this turn; the rest stand.` : "No new orders yet: every element keeps its current order."}</p>` : "";
}

// ---------- what changed ----------
function snapshotForDiff(st) {
  return {
    t: st.t, losses: { ...st.losses }, ev: st.events.length,
    down: Object.fromEntries(st.elements.map((e) => [e.id, e.down])),
    pinned: new Set(st.elements.filter((e) => e.side === "f" && e.pinned).map((e) => e.id)),
    seen: new Set(st.contacts.filter((c) => c.spotted).map((c) => c.el)),
    known: new Set(st.contacts.map((c) => c.el)),
  };
}
function computeChanges(before, st) {
  const ch = { from: fmtClock(before.t), to: st.clock, fDown: st.losses.friendly - before.losses.friendly, hDown: st.losses.enemy - before.losses.enemy, cap: st.losses.captured - before.losses.captured, hit: [], newContacts: [], lost: [], pinned: [], events: [] };
  for (const e of st.elements) if (e.side === "f" && !e.ally && e.down > (before.down[e.id] || 0)) ch.hit.push(`${e.short || e.name} ${e.down - (before.down[e.id] || 0)}`);
  for (const c of st.contacts) {
    if (!before.known.has(c.el)) ch.newContacts.push(c.name);
    else if (before.seen.has(c.el) && !c.spotted && !c.out) ch.lost.push(c.name);
  }
  const pinnedNow = new Set(st.elements.filter((e) => e.side === "f" && !e.ally && e.pinned && !before.pinned.has(e.id)).map((e) => e.id));
  for (let i = before.ev; i < st.events.length; i++) if (st.events[i].type === "pinned" && st.events[i].el && elState(st.events[i].el)?.side === "f") pinnedNow.add(st.events[i].el);
  for (const id of pinnedNow) { const e = elState(id); if (e) ch.pinned.push(`${e.short || e.name}${e.pinned ? "" : " (recovered)"}`); }
  for (let i = before.ev; i < st.events.length; i++) { const e = st.events[i]; if (KEY_EVENTS.has(e.type) && e.type !== "spotted" && e.type !== "pinned") ch.events.push(e); }
  return ch;
}
function changesHtml() {
  const ch = G.changes;
  if (!ch) return `<p class="mt-muted">Turn 1. Select an element, give it an order, then End turn. Each turn runs ${G.turnLen < 60 ? `${G.turnLen} s` : `${G.turnLen / 60} min`} of game time.</p>`;
  const li = [];
  li.push(`<li><b>Your losses:</b> ${ch.fDown > 0 ? `${ch.fDown} down (${esc(ch.hit.join(", "))})` : "none"}</li>`);
  li.push(`<li><b>Enemy:</b> ${ch.hDown > 0 || ch.cap > 0 ? `${ch.hDown} down${ch.cap ? `, ${ch.cap} captured` : ""}` : "no losses seen"}</li>`);
  if (ch.newContacts.length) li.push(`<li class="md-alert"><b>New contact:</b> ${esc(ch.newContacts.join(", "))}</li>`);
  if (ch.lost.length) li.push(`<li><b>Lost sight of:</b> ${esc(ch.lost.join(", "))} (last-known mark on the map)</li>`);
  if (ch.pinned.length) li.push(`<li class="md-alert"><b>Pinned down:</b> ${esc(ch.pinned.join(", "))}</li>`);
  for (const e of ch.events.slice(-5)) li.push(`<li${e.side === "h" ? ' data-side="h"' : ""}><time>${esc(e.clock)}</time> ${esc(e.text)}</li>`);
  return `<h3>What changed <span class="mt-muted">${esc(ch.from)}–${esc(ch.to)}</span></h3><ul>${li.join("")}</ul>`;
}

// ---------- selection and the order bar ----------
export function select(id) {
  if (!G || G.phase !== "orders") return false;
  if (id === null) { G.sel = null; G.arm = null; }
  else {
    if (typeof id === "number") id = friendly()[id]?.id;
    if (!id || !elState(id)) return false;
    G.sel = id; G.arm = null;
  }
  G.view.lit = new Set(G.sel ? [G.sel] : []);
  drawControls(); drawMarks(); updatePanel();
  G.map.frame(G.state, G.state.t, G.view);
  return true;
}

function available(id) {
  const e = elState(id), spec = elSpec(id), S = G.sim.S;
  const out = {};
  if (!e) return out;
  const mortar = e.kind === "mortar", tank = e.kind === "tank";
  const curType = G.staged[id]?.type || e.order;
  const obstacles = (G.scen.terrain.wire || []).length + (G.scen.terrain.mines || []).length > 0;
  const fireOk = S.els.some((x) => x.side === "f" && x.kind === "mortar" && x.soldiers.some((s) => s.status === "ok")) || S.fireCalls.f > 0;
  for (const [k] of ORDER_BTNS) {
    let ok = true, why = "";
    if (mortar && !["move", "hold", "callfire", "withdraw"].includes(k)) { ok = false; why = "The mortar section fires on call; move it, hold, or call for fire."; }
    else if (k === "breach" && !obstacles) { ok = false; why = "No obstacle in this scenario."; }
    else if (k === "observe" && tank) { ok = false; why = "Use the rifle platoons to observe."; }
    else if (k === "smoke" && !(e.smoke > 0)) { ok = false; why = "No hand-thrown smoke left."; }
    else if (k === "callfire" && !fireOk) { ok = false; why = G.scen.level === "fireteam" ? "No fire support at this level." : "No call for fire left."; }
    else if ((k === "lift" || k === "shift") && curType !== "sbf") { ok = false; why = "Only an element supporting by fire can lift or shift."; }
    else if (k === "lift" && e.lifted) { ok = false; why = "Fire already lifted."; }
    out[k] = { ok, why };
  }
  if (!spec) for (const k in out) out[k] = { ok: false, why: "Not under your command." };
  return out;
}

function drawControls() {
  if (!G || G.phase !== "orders") return;
  const id = G.sel, e = id && elState(id);
  let html = "";
  if (!e) {
    html += `<p class="md-selline mt-muted">Select an element: tap it on the map or in the roster, or press 1–${Math.min(9, friendly().length)}.</p>`;
  } else if (!commandable(id)) {
    html += `<p class="md-selline"><b>${esc(e.name)}</b> <span class="mt-muted">${e.ally ? "is a neighbouring unit, not under your command." : "has no one left able to fight."}</span></p>`;
  } else {
    const av = available(id);
    const o = G.staged[id];
    html += `<p class="md-selline"><b>${esc(e.name)}</b> <span class="mt-muted">${o ? `New order: ${esc(describe(o, id))}` : `Standing order: ${esc(e.task || "hold")}`}</span></p>`;
    html += `<div class="md-orders" role="group" aria-label="Orders">${ORDER_BTNS.map(([k, label]) => `<button type="button" data-order="${k}"${av[k]?.ok ? "" : " disabled"} title="${esc(av[k]?.why || "")}" aria-pressed="${G.arm?.type === k}">${label}</button>`).join("")}</div>`;
    html += optsHtml(id);
    html += promptHtml(id);
  }
  html += `<div class="md-turnbar"><button type="button" class="btn btn-primary" id="md-end">End turn ${G.turn}</button>` +
    `<div class="mt-speed" role="group" aria-label="Playback">${Object.keys(PLAY).map((k) => `<button type="button" data-speed="${k}" aria-pressed="${k === G.speed}">${k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div>` +
    (G.showRec ? `<button type="button" class="btn btn-outline" id="md-recorders">Recommended orders</button>` : "") +
    (o0() ? `<button type="button" class="mt-link" id="md-clear">Clear new orders</button>` : "") +
    `<button type="button" class="mt-link" id="md-finish">Run to the end</button></div>`;
  ui.controls.innerHTML = html;
  ui.controls.querySelectorAll("[data-order]").forEach((b) => b.addEventListener("click", () => arm(b.dataset.order)));
  ui.controls.querySelectorAll("[data-opt]").forEach((s) => s.addEventListener("change", () => setOpt(s.dataset.opt, s.value)));
  ui.controls.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => promptAction(b.dataset.do)));
  ui.controls.querySelectorAll("[data-speed]").forEach((b) => b.addEventListener("click", () => { G.speed = b.dataset.speed; ui.controls.querySelectorAll("[data-speed]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.speed === G.speed))); }));
  $("#md-end").addEventListener("click", () => endTurn());
  $("#md-recorders")?.addEventListener("click", () => { recommend(); });
  $("#md-clear")?.addEventListener("click", () => { G.staged = {}; G.acts = []; G.watch = []; G.arm = null; drawControls(); drawMarks(); updatePanel(); });
  $("#md-finish").addEventListener("click", () => finish());
}
const o0 = () => Object.keys(G.staged).length + G.acts.length + G.watch.length > 0;

function optOf(id) {
  const e = elState(id);
  const o = (G.opts[id] = G.opts[id] || {});
  const forms = KINDS[e.kind]?.formations || ["line"];
  if (!o.formation) o.formation = forms.includes(G.sim.S.byId[id].formation) ? G.sim.S.byId[id].formation : forms[0];
  return o;
}
function optsHtml(id) {
  const a = G.arm, staged = G.staged[id];
  const type = a?.type || staged?.type;
  if (!type) return "";
  const e = elState(id), o = optOf(id);
  const forms = KINDS[e.kind]?.formations || ["line"];
  const bits = [];
  if (["move", "bypass", "sbf", "assault", "breach", "observe"].includes(type) && e.kind !== "tank") {
    const tech = o.technique || staged?.technique || DEF_TECH[type];
    bits.push(`<label><span>Movement</span><select data-opt="technique">${Object.entries(TECHNIQUES).map(([k, v]) => `<option value="${k}"${k === tech ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label>`);
    if (["assault", "sbf", "breach"].includes(type)) bits.push(`<span class="mt-note">Approach technique before contact; once fired on, the element uses fire and movement.</span>`);
  }
  if (["move", "bypass", "breach", "observe", "hold"].includes(type) && forms.length > 1) bits.push(`<label><span>Formation</span><select data-opt="formation">${forms.map((f) => `<option value="${f}"${f === o.formation ? " selected" : ""}>${f}</option>`).join("")}</select></label>`);
  const sbfEls = friendly().filter((x) => x.id !== id && commandable(x.id) && ((G.staged[x.id]?.type || x.order) === "sbf"));
  if (["move", "bypass", "assault", "breach", "counterattack"].includes(type) && sbfEls.length) bits.push(`<label><span>Start</span><select data-opt="when"><option value="">now</option>${sbfEls.map((x) => `<option value="${x.id}"${o.when === x.id ? " selected" : ""}>when ${esc(x.short || x.name)} has set support by fire</option>`).join("")}</select></label>`);
  if (type === "withdraw") bits.push(`<label><span>Method</span><select data-opt="method">${[["alternating", "alternating bounds"], ["run", "everyone at once"]].map(([k, v]) => `<option value="${k}"${k === (o.method || "alternating") ? " selected" : ""}>${v}</option>`).join("")}</select></label>`);
  if (type === "callfire") bits.push(`<label><span>Rounds</span><select data-opt="kind">${[["he", "high explosive"], ["smoke", "smoke"]].map(([k, v]) => `<option value="${k}"${k === (o.kind || "he") ? " selected" : ""}>${v}</option>`).join("")}</select></label>`);
  return bits.length ? `<div class="md-opts">${bits.join("")}</div>` : "";
}
function setOpt(k, v) {
  const id = G.sel; if (!id) return;
  optOf(id)[k] = v;
  const o = G.staged[id];
  if (o) {
    if (k === "technique" && "technique" in o) o.technique = v;
    if (k === "technique" && !("technique" in o) && o.type !== "hold" && o.type !== "reserve") o.technique = v;
    if (k === "formation") o.formation = v;
    if (k === "method" && o.type === "withdraw") o.method = v;
    if (k === "when") { if (v) o.startWhen = v; else delete o.startWhen; }
  }
  drawControls(); updatePanel();
}

const PROMPTS = {
  move: "Tap the ground to move there, or tap near a dashed route to follow it.",
  bypass: "Tap the route that avoids the known position (or tap the ground).",
  sbf: ["Tap where to set the base of fire, or fire from here.", "Now tap the enemy (or the ground) to fire on."],
  assault: "Tap the enemy to assault it, or first tap a route or the ground to approach that way.",
  hold: "Tap the position to hold, or hold here.",
  reserve: "Tap where to wait as the reserve, or wait here.",
  counterattack: "Tap the enemy or the ground to counterattack into.",
  breach: "Tap the obstacle where the lane should go (or a route that leads to it).",
  withdraw: "Tap the rally point to break contact to.",
  observe: "Tap each point to watch from; the element waits about 30 s at each, then reports when its route is done.",
  smoke: "Tap where the smoke should go (a hand-thrown grenade lands within about 40 m).",
  callfire: "Tap the target for the mortars.",
  shift: "Tap the enemy to shift fire onto.",
  lift: "Lift now (it stops firing and stays), or lift when the assault closes on the target.",
};
function promptHtml(id) {
  const a = G.arm;
  if (!a) {
    const o = G.staged[id];
    return o && MOVE_TYPES.has(o.type) && o.type !== "observe" ? `<div class="md-prompt"><button type="button" class="mt-link" data-do="leg">Add a leg to this route</button><button type="button" class="mt-link" data-do="unstage">Cancel this new order</button></div>` :
      o ? `<div class="md-prompt"><button type="button" class="mt-link" data-do="unstage">Cancel this new order</button></div>` : "";
  }
  const text = Array.isArray(PROMPTS[a.type]) ? PROMPTS[a.type][a.stage === "target" ? 1 : 0] : a.leg ? "Tap the ground to add a leg to the route." : PROMPTS[a.type];
  const btn = [];
  if (a.type === "sbf" && a.stage !== "target") btn.push(["here", "Fire from here"]);
  if (a.type === "hold") btn.push(["here", "Hold here"]);
  if (a.type === "reserve") btn.push(["here", "Wait here"]);
  if (a.type === "withdraw" && G.scen.rally) btn.push(["rally", "To the rally point"]);
  if (a.type === "observe" && a.stops?.length) btn.push(["done", "Done"]);
  if (a.type === "lift") { btn.push(["liftnow", "Lift now"]); btn.push(["liftnear", "Lift when the assault is close"]); }
  btn.push(["cancel", "Cancel"]);
  const kc = G.kb && G.kb.list[G.kb.i];
  const kbLine = KB_TYPES.has(a.type) && !a.leg && a.stage !== "target" ? (kc ? ` Keyboard: ${G.kb.i + 1} of ${G.kb.list.length}, ${kc.label}. Enter to confirm, Tab or arrows for the next.` : " Or press Tab to cycle through routes and known enemy.") : "";
  return `<div class="md-prompt" role="status"><span>${esc(text + kbLine)}</span>${btn.map(([k, v]) => `<button type="button" class="${k === "cancel" ? "mt-link" : "btn btn-outline md-small"}" data-do="${k}">${v}</button>`).join("")}</div>`;
}

function arm(type) {
  const id = G.sel;
  if (!id || !commandable(id) || !available(id)[type]?.ok) return false;
  if (G.arm?.type === type) { G.arm = null; drawControls(); drawMarks(); return true; }
  G.arm = { type, stage: "dest", taps: [] }; G.kb = null;
  drawControls(); drawMarks();
  return true;
}

function promptAction(k) {
  const id = G.sel, e = id && elState(id);
  if (!e) return;
  const here = [e.x, e.y];
  const a = G.arm;
  if (k === "cancel") G.arm = null;
  else if (k === "unstage") { delete G.staged[id]; G.acts = G.acts.filter((x) => x.el !== id); G.watch = G.watch.filter((x) => x.el !== id); }
  else if (k === "leg") { const o = G.staged[id]; G.arm = { type: o.type, stage: "dest", taps: [], leg: true }; }
  else if (k === "here" && a) {
    if (a.type === "sbf") { a.route = [here, here]; a.stage = "target"; }
    else { stageOrder(id, buildOrder(a.type, id, [here, here])); G.arm = null; }
  } else if (k === "rally" && a) { stageOrder(id, buildOrder("withdraw", id, [here, G.scen.rally])); G.arm = null; }
  else if (k === "done") G.arm = null;
  else if (k === "liftnow") { stageAct(id, { type: "lift" }); G.watch = G.watch.filter((x) => x.el !== id); G.arm = null; }
  else if (k === "liftnear") { G.watch = G.watch.filter((x) => x.el !== id).concat([{ el: id, type: "liftNear", dist: LIFT_AT[G.scen.level] }]); G.acts = G.acts.filter((x) => !(x.el === id && x.action.type === "lift")); G.arm = null; }
  drawControls(); drawMarks(); updatePanel();
}

// ---------- building orders ----------
function faceFrom(p) {
  const st = G.state;
  const cs = st.contacts.filter((c) => !c.out);
  let tgt = null, bd = Infinity;
  for (const c of cs) { const d = dist(p, [c.x, c.y]); if (d < bd) { bd = d; tgt = [c.x, c.y]; } }
  if (!tgt && G.scen.objective) tgt = [G.scen.objective.x, G.scen.objective.y];
  return tgt && dist(tgt, p) > 1 ? Math.round(bearing(p, tgt)) : undefined;
}
function nearestEnemyTo(p, maxD = 160) {
  let best0 = null, bd = maxD;
  for (const c of G.state.contacts) { if (c.out) continue; const d = dist(p, [c.x, c.y]); if (d < bd) { bd = d; best0 = c.el; } }
  if (!best0) for (const id of G.scen.objectiveEls || []) { const e = G.scen.forces.enemy.find((x) => x.id === id); if (e && dist(p, e.at) < maxD) return id; }
  return best0;
}
function buildOrder(type, id, route, extra = {}) {
  const o = optOf(id);
  const tech = o.technique || DEF_TECH[type];
  const R = route.map(r1);
  switch (type) {
    case "move": case "bypass": return { type, route: R, technique: tech, formation: o.formation };
    case "breach": return { type, route: R, technique: tech, formation: o.formation };
    case "hold": return { type, route: R, face: faceFrom(R[R.length - 1]), formation: o.formation };
    case "reserve": return { type, route: R };
    case "sbf": return { type, route: R, target: extra.target, technique: tech };
    case "assault": return { type, route: R, target: extra.target, technique: tech, formation: "line" };
    case "counterattack": { const end = R[R.length - 1]; return { type, route: R, zone: { x: end[0], y: end[1], r: ZONE[G.scen.level] }, technique: "rush" }; }
    case "withdraw": return { type, route: R, method: o.method || "alternating" };
    case "observe": return { type, route: R, stops: extra.stops || [R[R.length - 1]], dwell: 32, technique: tech, formation: o.formation || "file" };
  }
  return { type, route: R };
}
// ---------- keyboard targets: after picking Move / Bypass / Assault / Support by fire, Tab or the arrow keys
// cycle through the element's named routes and the known enemy, Enter confirms (no map needed) ----------
const KB_TYPES = new Set(["move", "bypass", "sbf", "assault"]);
function kbList(id) {
  const type = G.arm?.type, e = elState(id), out = [];
  if (!KB_TYPES.has(type) || !e) return out;
  const fire = type === "sbf" || type === "assault";
  for (const k of routesFor(id)) {
    const pts = G.scen.routes[k].pts.map((q) => q.slice(0, 2)), end = pts[pts.length - 1];
    const tgt = fire ? nearestEnemyTo(end, type === "sbf" ? 450 : 160) : null;
    if (type === "assault" && !tgt) continue;
    out.push({ route: k, pts, target: tgt, label: `route “${G.scen.routes[k].label}”${tgt ? `, ${type === "sbf" ? "firing on" : "at"} ${fullName(tgt)}` : ""}` });
  }
  if (fire) for (const c of G.state.contacts) if (!c.out) out.push({ target: c.el, at: [c.x, c.y], label: `${type === "sbf" ? "fire from here on" : "straight at"} ${fullName(c.el)}${c.spotted ? "" : " (last seen)"}` });
  return out;
}
function kbStep(d) {
  const list = kbList(G.sel);
  if (!list.length) return false;
  G.kb = { list, i: G.kb ? (G.kb.i + d + list.length) % list.length : d > 0 ? 0 : list.length - 1 };
  drawControls(); drawMarks();
  return true;
}
function kbConfirm() {
  const c = G.kb?.list[G.kb.i], id = G.sel, a = G.arm;
  if (!c || !a) return false;
  const e = elState(id), here = [e.x, e.y];
  if (a.type === "move" || a.type === "bypass") stageOrder(id, buildOrder(a.type, id, c.pts));
  else if (a.type === "sbf") stageOrder(id, buildOrder("sbf", id, c.pts || [here, here], { target: c.target || r1(c.pts[c.pts.length - 1]) }));
  else stageOrder(id, buildOrder("assault", id, c.pts || [here, c.at], { target: c.target }));
  if (c.route) { G.staged[id].routeLabel = G.scen.routes[c.route].label; G.staged[id].routeKey = c.route; }
  G.arm = null; G.kb = null;
  drawControls(); drawMarks(); updatePanel();
  return true;
}
function stageOrder(id, order) {
  if (order.type === "withdraw" && order.method === "alternating") {
    // pair with another element breaking contact (alternating bounds need a partner); the first one ordered bounds first
    const other = friendly().find((e) => e.id !== id && commandable(e.id) && ((G.staged[e.id]?.type === "withdraw") || (!G.staged[e.id] && e.order === "withdraw")));
    if (other) { order.partner = other.id; if (G.staged[other.id]) G.staged[other.id].partner = id; }
    else order.first = true;
  }
  const w = optOf(id).when;
  if (w && ["move", "bypass", "assault", "breach", "counterattack"].includes(order.type)) order.startWhen = w;
  G.staged[id] = order;
}
function stageAct(id, action) {
  G.acts = G.acts.filter((x) => !(x.el === id && x.action.type === action.type)).concat([{ el: id, action }]);
}

// routes the selected element may snap to: its Easy choices plus every route a plan gives it
function routesFor(id) {
  const s = G.scen, keys = new Set(s.choices?.[id]?.routes || []);
  for (const p of s.plans || []) {
    const a = p.assign?.[id];
    if (!a) continue;
    for (const b of [a, ...(a.then || [])]) if (typeof b.route === "string") keys.add(b.route);
    if (a.commit?.route) keys.add(a.commit.route);
  }
  return [...keys].filter((k) => s.routes[k] && polyLen(s.routes[k].pts) > 8);
}
function stopsFor(key) {
  for (const p of G.scen.plans || []) for (const a of Object.values(p.assign || {})) if (a.route === key && a.stops) return a.stops;
  return null;
}

// screen helpers: client point → card (viewBox) px; world point → card px
function cardPt(cx, cy) {
  const svg = ui.card.querySelector("svg.mt-map-svg");
  const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return [p.x, p.y];
}
const pxPerM = (p) => { const a = G.map.toView(p), b = G.map.toView([p[0] + 10, p[1]]), c = G.map.toView([p[0], p[1] + 10]); return (Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - a[0], c[1] - a[1])) / 20; };
const tapScale = () => {
  const svg = ui.card.querySelector("svg.mt-map-svg"), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  return vb.width / Math.max(1, r.width);   // card px per CSS px
};
function nearestOnScreen(cp, items, tolCss = TAP_PX) {
  const tol = tolCss * tapScale();
  let best0 = null, bd = tol;
  for (const it of items) { const v = G.map.toView(it.at); const d = Math.hypot(v[0] - cp[0], v[1] - cp[1]); if (d < bd) { bd = d; best0 = it; } }
  return best0;
}

// one tap on the map, in client coordinates (also the test hook's ground taps)
// the part of a route up to the point nearest p (null if p is near the route's end: take it all)
function cutRoute(pts, p, endTol) {
  const P = pts.map((q) => q.slice(0, 2));
  if (dist(p, P[P.length - 1]) < endTol) return null;
  let bi = 0, bd = Infinity, bq = P[0];
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    const u = L ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L)) : 0;
    const q = [ax + u * dx, ay + u * dy], d = dist(p, q);
    if (d < bd) { bd = d; bi = i; bq = q; }
  }
  return [...P.slice(0, bi + 1), [Math.round(bq[0]), Math.round(bq[1])]];
}

function tap(cx, cy) {
  if (!G || G.phase !== "orders") return null;
  const cp = cardPt(cx, cy);
  const g = G.map.pick(cx, cy);
  const a = G.arm, id = G.sel;
  const contacts = G.state.contacts.filter((c) => !c.out).map((c) => ({ id: c.el, at: [c.x, c.y] }));
  if (!a) {
    const hit = nearestOnScreen(cp, friendly().map((e) => ({ id: e.id, at: [e.x, e.y] })), 34);
    if (hit) select(hit.id);
    return hit ? { selected: hit.id } : { ground: g };
  }
  const e = elState(id), here = [e.x, e.y];
  // a dashed route near the tap?
  const tolM = (TAP_PX * tapScale()) / pxPerM(g) * 0.8;
  let snap = null;
  if (!a.leg && !["smoke", "callfire", "shift", "lift"].includes(a.type) && !(a.type === "sbf" && a.stage === "target")) {
    let bd = tolM;
    for (const k of routesFor(id)) { const d = polyDist(g, G.scen.routes[k].pts); if (d < bd) { bd = d; snap = k; } }
  }
  const prevRoute = G.staged[id]?.route;
  const routeTo = (p) => (snap ? G.scen.routes[snap].pts.map((q) => q.slice(0, 2)) : a.leg && prevRoute ? [...prevRoute, p] : [here, p]);
  const contactHit = nearestOnScreen(cp, contacts);
  let done = true;
  switch (a.type) {
    case "move": case "bypass": case "breach": case "hold": case "reserve": case "withdraw": {
      // a tap part-way along a drawn route follows it only as far as the tap (a Move should not run on into the enemy)
      const cut = snap && a.type !== "breach" ? cutRoute(G.scen.routes[snap].pts, g, tolM * 1.5) : null;
      stageOrder(id, buildOrder(a.type, id, cut || routeTo(g)));
      if (snap) G.staged[id].routeLabel = G.scen.routes[snap].label + (cut ? ", as far as the point tapped" : "");
      break;
    }
    case "counterattack": {
      const p = contactHit ? contactHit.at : g;
      stageOrder(id, buildOrder("counterattack", id, snap ? routeTo(g) : [here, p]));
      break;
    }
    case "observe": {
      if (snap && stopsFor(snap)) { stageOrder(id, buildOrder("observe", id, routeTo(g), { stops: stopsFor(snap) })); G.staged[id].routeLabel = G.scen.routes[snap].label; break; }
      a.stops = [...(a.stops || []), r1(g)];
      stageOrder(id, buildOrder("observe", id, [here, ...a.stops], { stops: a.stops }));
      done = false;
      break;
    }
    case "sbf":
      if (a.stage !== "target") { a.route = routeTo(g); a.routeLabel = snap ? G.scen.routes[snap].label : null; a.stage = "target"; done = false; }
      else { stageOrder(id, buildOrder("sbf", id, a.route, { target: contactHit ? contactHit.id : r1(g) })); if (a.routeLabel) G.staged[id].routeLabel = a.routeLabel; }
      break;
    case "assault":
      if (contactHit) {
        const base = a.route || [here];
        stageOrder(id, buildOrder("assault", id, [...base, contactHit.at], { target: contactHit.id }));
        if (a.routeLabel) G.staged[id].routeLabel = a.routeLabel;
      } else {
        const route = routeTo(g), end = route[route.length - 1];
        const tgt = nearestEnemyTo(end);
        if (tgt) { stageOrder(id, buildOrder("assault", id, route, { target: tgt })); if (snap) G.staged[id].routeLabel = G.scen.routes[snap].label; }
        else { a.route = route; a.routeLabel = snap ? G.scen.routes[snap].label : null; done = false; }
      }
      break;
    case "smoke": stageAct(id, { type: "smoke", at: r1(g) }); break;
    case "callfire": stageAct(id, { type: "callfire", at: r1(g), kind: optOf(id).kind || "he" }); break;
    case "shift": if (contactHit) stageAct(id, { type: "shift", target: contactHit.id }); else done = false; break;
    default: done = false;
  }
  if (snap && G.staged[id] && G.staged[id].routeLabel?.startsWith(G.scen.routes[snap].label)) G.staged[id].routeKey = snap;
  if (a.type === "sbf" && done && a.routeKey && G.staged[id]) G.staged[id].routeKey = a.routeKey;
  if (a.type === "sbf" && !done && snap) a.routeKey = snap;
  if (done) G.arm = null;
  drawControls(); drawMarks(); updatePanel();
  return { ground: g, snap, staged: G.staged[id] || null };
}

const fmtM = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`);
function describe(o, id) {
  if (o.startWhen) { const { startWhen, ...rest } = o; return `${describe(rest, id)}, starting when ${nameOf(startWhen)} has set support by fire`; }
  const tname = (t) => (Array.isArray(t) ? "the area tapped" : fullName(t));
  const along = o.routeLabel ? ` via “${o.routeLabel}”` : o.route && polyLen(o.route) > 3 ? ` ${fmtM(polyLen(o.route))}` : " in place";
  const via = o.routeLabel ? ` via “${o.routeLabel}”` : "";
  const tech = o.technique && TECHNIQUES[o.technique] ? `, ${TECHNIQUES[o.technique].replace(/ \(.*\)/, "")}` : "";
  switch (o.type) {
    case "move": case "bypass": return `${ORDER_LABELS[o.type]}${along}${tech}${o.formation ? `, ${o.formation}` : ""}`;
    case "sbf": return `Support by fire${o.route && polyLen(o.route) > 3 ? along : " from here"} on ${tname(o.target)}`;
    case "assault": return `Assault ${tname(o.target)}${via}`;
    case "hold": return `Hold / defend${along}`;
    case "reserve": return `Reserve${along}`;
    case "counterattack": return `Counterattack${along}`;
    case "breach": return `Breach${along}`;
    case "withdraw": return `Break contact${along}, ${o.method === "run" ? "everyone at once" : "alternating bounds"}`;
    case "observe": return `Observe from ${o.stops?.length || 1} point${(o.stops?.length || 1) > 1 ? "s" : ""}${via}`;
    case "smoke": return "Smoke";
    case "callfire": return `Call for fire (${o.kind === "smoke" ? "smoke" : "HE"})`;
    case "shift": return `Shift fire to ${tname(o.target)}`;
    case "lift": return "Lift fire";
    case "follow": return "Follow";
  }
  return ORDER_LABELS[o.type] || o.type;
}

// ---------- chalk on the map ----------
function remaining(route, p) {
  if (!route || route.length < 2) return null;
  let bi = 0, bd = Infinity;
  for (let i = 0; i < route.length - 1; i++) { const d = segDist(p, route[i], route[i + 1]); if (d < bd - 1e-6) { bd = d; bi = i; } }
  return [p, ...route.slice(bi + 1)];
}
function targetAt(t) {
  if (Array.isArray(t)) return t;
  const c = G.state.contacts.find((x) => x.el === t);
  return c ? [c.x, c.y] : null;
}
function drawMarks() {
  if (!G?.map) return;
  const marks = [];
  const [bw, bd] = BOX[G.scen.level];
  const minLen = { fireteam: 5, platoon: 8, company: 14 }[G.scen.level];
  if (G.showRec) {
    const rec = G.scen.plans.find((p) => p.doctrinal);
    for (const a of Object.values(rec?.assign || {})) for (const b of [a, ...(a.then || [])]) { const p = G.scen.routes[b.route]?.pts; if (p && polyLen(p) > minLen) marks.push({ pts: p, cls: "mt-route-alt" }); }
  }
  if (G.phase === "orders" && G.sel && G.arm && !G.showRec) for (const k of routesFor(G.sel)) marks.push({ pts: G.scen.routes[k].pts, cls: "mt-route-alt" });
  const kc = G.kb && G.arm && G.kb.list[G.kb.i];
  if (kc && G.sel) { const e = elState(G.sel); const pts = kc.pts || [[e.x, e.y], kc.at]; if (polyLen(pts) > 3) marks.push({ pts, cls: "mt-route mt-sel" }); }
  for (const e of friendly()) {
    if (e.ally || e.strength === 0) continue;
    const sim = G.sim.S.byId[e.id];
    const staged = G.staged[e.id] || G.watch.find((w) => w.el === e.id && w.type === "when" && !ACTS.has(w.order.type))?.order;
    const o = staged || sim.order;
    if (!o) continue;
    let pts = staged ? o.route : remaining(o.route, [e.x, e.y]);
    const tp = o.target ? targetAt(o.target) : null;
    if (o.type === "assault" && tp && pts) pts = [...pts.slice(0, -1), tp];
    const cls = staged ? "mt-route mt-main" : `mt-route${G.sel === e.id ? " mt-sel" : ""}`;
    if (pts && polyLen(pts) > minLen && !(o.type === "sbf" && sim.arrived && !staged)) marks.push({ pts, cls });
    if (o.type === "sbf" && o.route) {
      const end = o.route[o.route.length - 1], face = tp ? bearing(end, tp) : e.face;
      marks.push({ box: [end[0], end[1], face + 90, bw, bd], cls: `mt-route mt-box${staged ? " mt-main" : ""}` });
      if (tp && dist(end, tp) > minLen * 2 && !sim.lifted) {
        const L = dist(end, tp), u = [(tp[0] - end[0]) / L, (tp[1] - end[1]) / L], s0 = Math.min(bd, L * 0.3);
        marks.push({ pts: [[end[0] + u[0] * s0, end[1] + u[1] * s0], [tp[0] - u[0] * s0, tp[1] - u[1] * s0]], cls: "mt-route-alt" });
      }
    }
  }
  for (const a of G.acts) if (a.action.at) {
    const s = a.action.type === "callfire" ? { fireteam: 14, platoon: 30, company: 50 }[G.scen.level] : { fireteam: 8, platoon: 14, company: 24 }[G.scen.level];
    marks.push({ box: [a.action.at[0], a.action.at[1], 0, s, s], cls: "mt-route mt-box mt-main" });
  }
  if (G.arm?.type === "sbf" && G.arm.route) marks.push({ pts: G.arm.route, cls: "mt-route mt-main" });
  if (G.arm?.type === "assault" && G.arm.route) marks.push({ pts: G.arm.route, cls: "mt-route mt-main" });
  G.map.setPlan(G.map.planMarks(marks.filter((m) => m.box || (m.pts && m.pts.length > 1))));
}

// ---------- the recommended plan, turn by turn ----------
// Compiles the recommended plan and, at each turn boundary, gives the orders whose trigger is now
// true (a copy of the core's trigger test, read from sim.S). Triggers that come true mid-turn wait
// for the next turn, as they would for a commander giving orders once a turn.
function evalTrig(S, tr) {
  const ok = (e) => e.soldiers.reduce((n, s) => n + (s.status === "ok" ? 1 : 0), 0);
  const fighting = (e) => e.soldiers.reduce((n, s) => n + (s.status === "ok" && !s.carry ? 1 : 0), 0);
  const pos = (t) => (Array.isArray(t) ? t : S.byId[t] ? [S.byId[t].cx ?? S.byId[t].x, S.byId[t].cy ?? S.byId[t].y] : null);
  switch (tr.when) {
    case "start": return true;
    case "time": return S.t >= tr.t;
    case "arrived": { const e = S.byId[tr.el]; return !!e && (e.arrived || fighting(e) === 0); }
    case "sbfSet": return S.metrics.sbfSetAt[tr.el] != null || fighting(S.byId[tr.el]) === 0;
    case "cleared": return !!S.flags[`cleared:${tr.target}`];
    case "near": { const e = S.byId[tr.el]; if (!e || !ok(e)) return false; const p = pos(tr.target); return !!p && Math.hypot((e.cx ?? e.x) - p[0], (e.cy ?? e.y) - p[1]) <= tr.dist; }
    case "enemyNear": return S.els.some((e) => e.side === "h" && e.soldiers.some((s) => s.status === "ok" && Math.hypot(s.x - tr.at[0], s.y - tr.at[1]) <= tr.dist));
    case "flag": return !!S.flags[tr.name];
    case "lane": return S.lanes.length > 0;
    case "all": return tr.of.every((x) => evalTrig(S, x));
    case "any": return tr.of.some((x) => evalTrig(S, x));
  }
  return false;
}
function makeAdvisor(scen) {
  const plan = scen.plans.find((p) => p.doctrinal);
  const map = compilePlan(scen, plan);
  const st = Object.fromEntries(Object.entries(map).map(([id, steps]) => [id, { steps: steps.filter((s) => !s.parallel), acts: steps.filter((s) => s.parallel).map((s) => ({ ...s, done: false })), si: -1 }]));
  // the label of the scenario route this step uses (a step may use the first part of one, up to the assault position)
  const routeKey = (pts) => Object.keys(scen.routes).find((k) => { const r = scen.routes[k]; return r.pts.length >= pts.length && pts.every((p, i) => r.pts[i] && r.pts[i][0] === p[0] && r.pts[i][1] === p[1]); });
  const fix = (o) => { if (o.route) { const k = routeKey(o.route); if (k) { o.routeKey = k; o.routeLabel = scen.routes[k].label; } o.route = o.route.map((p) => p.slice(0, 2)); } return o; };
  return {
    plan,
    orders(S) {
      const out = [];
      for (const [id, f] of Object.entries(st)) {
        const el = S.byId[id];
        if (!el) continue;
        for (let g = 0; g < 8; g++) {
          const next = f.steps[f.si + 1];
          if (!next) break;
          const go = next.trigger ? evalTrig(S, next.trigger) : f.si < 0 || el.complete;
          const o = { ...next.order };
          if (!go) {
            // an explicit trigger that is not true yet: give it as an order to act on when it comes true
            if (next.trigger && next.trigger.when !== "start") { const idx = f.si + 1; out.push([id, fix(o), { trigger: next.trigger, onFire: () => { if (f.si < idx) f.si = idx; } }]); }
            break;
          }
          f.si++;
          if (o.type === "move" && o.route && polyLen(o.route) < 3 && Math.hypot(el.x - o.route[0][0], el.y - o.route[0][1]) < 5) continue; // "stay": nothing to order
          out.push([id, fix(o)]);
          if (!ACTS.has(o.type)) break;
        }
        for (const a of f.acts) {
          if (a.done) continue;
          if (!a.trigger || evalTrig(S, a.trigger)) { a.done = true; out.push([id, { ...a.order }]); }
          else out.push([id, { ...a.order }, { trigger: a.trigger, src: a, onFire: () => { a.done = true; } }]);
        }
      }
      return out;
    },
  };
}
export function recommend() {
  if (!G || G.phase !== "orders") return null;
  if (!G.advisor) G.advisor = makeAdvisor(G.scen);
  const list = G.advisor.orders(G.sim.S);
  G.watch = G.watch.filter((w) => !w.adv);
  for (const [id, o, cond] of list) {
    if (cond) G.watch.push({ el: id, type: "when", order: o, trigger: cond.trigger, onFire: cond.onFire, adv: true });
    else if (ACTS.has(o.type)) stageAct(id, o);
    else G.staged[id] = o;
  }
  drawControls(); drawMarks(); updatePanel();
  return list.length;
}

// ---------- running a turn ----------
let raf = 0, last = 0;
function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

export function order(id, o) {
  if (!G || G.phase !== "orders" || !commandable(id)) return false;
  if (ACTS.has(o.type)) stageAct(id, o);
  else if (o.type === "liftNear") G.watch.push({ el: id, type: "liftNear", dist: o.dist ?? LIFT_AT[G.scen.level] });
  else { const e = elState(id); stageOrder(id, o.route || o.to ? { ...o, route: o.route || [[e.x, e.y], o.to] } : o); }
  drawControls(); drawMarks(); updatePanel();
  return true;
}

function runWatch() {
  if (!G.watch.length) return;
  const S = G.sim.S;
  G.watch = G.watch.filter((w) => {
    const el = S.byId[w.el];
    if (w.type === "when") {
      if (!el || !el.soldiers.some((q) => q.status === "ok")) return false;
      if (!evalTrig(S, w.trigger)) return true;
      G.sim.issue(w.el, w.order);
      if (w.order.routeKey) (G.used = G.used || []).push([w.el, w.order.routeKey]);
      w.onFire?.();
      return false;
    }
    if (!el || el.order?.type !== "sbf" || el.lifted) return false;
    const tgt = Array.isArray(el.order.target) ? el.order.target : S.byId[el.order.target] ? [S.byId[el.order.target].cx ?? S.byId[el.order.target].x, S.byId[el.order.target].cy ?? S.byId[el.order.target].y] : null;
    if (!tgt) return false;
    const close = S.els.some((a) => a.side === "f" && !a.ally && (a.order?.type === "assault" || a.order?.type === "counterattack") && a.soldiers.some((s) => s.status === "ok") && Math.hypot((a.cx ?? a.x) - tgt[0], (a.cy ?? a.y) - tgt[1]) <= w.dist);
    if (close) { G.sim.issue(w.el, { type: "lift" }); return false; }
    return true;
  });
}

export function endTurn(instant = false) {
  if (!G || G.phase !== "orders") return false;
  stopLoop();
  for (const [id, o] of Object.entries(G.staged)) {
    G.watch = G.watch.filter((w) => !(w.el === id && w.type === "when" && !ACTS.has(w.order.type)));
    if (o.startWhen) { const { startWhen, ...order } = o; G.watch.push({ el: id, type: "when", order, trigger: { when: "sbfSet", el: startWhen } }); continue; }
    G.sim.issue(id, o); if (o.routeKey) (G.used = G.used || []).push([id, o.routeKey]);
  }
  for (const a of G.acts) G.sim.issue(a.el, a.action);
  G.staged = {}; G.acts = []; G.arm = null;
  G.before = snapshotForDiff(G.state);
  G.turnEnd = Math.round((G.state.t + G.turnLen) * 10) / 10;
  G.acc = 0; G.vt = G.state.t; G.paused = false;
  setPhase("turn");
  ui.controls.innerHTML = `<p class="md-selline"><b>Turn ${G.turn}</b> <span class="mt-muted">running: both sides act for ${G.turnLen < 60 ? `${G.turnLen} s` : `${G.turnLen / 60} min`} of game time.</span></p>` +
    `<div class="md-turnbar"><button type="button" class="btn btn-outline" id="md-pause" aria-pressed="false">Pause</button><div class="mt-speed" role="group" aria-label="Playback">${Object.keys(PLAY).map((k) => `<button type="button" data-speed="${k}" aria-pressed="${k === G.speed}">${k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div><button type="button" class="mt-link" id="md-skip">Skip to the end of the turn</button></div>`;
  ui.controls.querySelectorAll("[data-speed]").forEach((b) => b.addEventListener("click", () => { G.speed = b.dataset.speed; ui.controls.querySelectorAll("[data-speed]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.speed === G.speed))); }));
  $("#md-pause").addEventListener("click", () => pause(!G.paused));
  $("#md-skip").addEventListener("click", () => skipTurn());
  updatePanel();
  drawMarks();
  G.view.lit = new Set();
  hint();
  if (instant) { skipTurn(); return G.state.clock; }
  last = 0;
  raf = requestAnimationFrame(loop);
  return true;
}

function pause(on) {
  if (!G || G.phase !== "turn") return;
  G.paused = on;
  const b = $("#md-pause");
  if (b) { b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "Resume" : "Pause"; }
  hint();
}

// advance at most `sec` of game time, never past the turn's end; whole 0.1 s ticks
function advance(sec) {
  const S = G.sim.S;
  G.acc += sec;
  const left = Math.max(0, Math.round((G.turnEnd - S.t) * 10));
  const n = Math.min(left, Math.floor(G.acc * 10 + 1e-6));
  if (n > 0) { G.sim.runTurn(n / 10); G.acc -= n / 10; }
  runWatch();
  return Math.round((G.turnEnd - G.sim.S.t) * 10) <= 0 || !!G.sim.done();
}

let uiT = 0;
function loop(now) {
  raf = 0;
  if (!G || G.phase !== "turn") return;
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
  last = now;
  let end = false;
  if (!G.paused) {
    const rate = G.turnLen / PLAY[G.speed];
    // tracers animate on the smooth clock; the sim catches up in whole ticks
    end = advance(dt * rate);
    G.vt += dt * rate;
  }
  const st = (G.state = G.sim.state());
  G.vt = Math.max(st.t - 0.1, Math.min(st.t + 0.1, G.vt));
  G.rec.add(st);
  G.map.frame(st, G.vt, G.view);
  if (now - uiT > 250 || end) { uiT = now; updateRunUi(st); }
  if (end) return turnDone();
  raf = requestAnimationFrame(loop);
}
function updateRunUi(st) {
  const c = $("#mt-clock"); if (c) c.textContent = st.clock;
  const l = $("#mt-losses"); if (l) l.textContent = `${st.losses.friendly} vs ${st.losses.enemy} down`;
  const r = $("#mt-roster"); if (r) { roster(r, st, { selected: null }); }
  const g = $("#mt-log"); if (g) eventLog(g, st);
  hint();
}
function skipTurn() {
  if (!G || G.phase !== "turn") return false;
  stopLoop();
  for (let k = 0; k < 400; k++) { const end = advance(1); G.rec.add(G.sim.state()); if (end) break; }
  G.state = G.sim.state();
  turnDone();
  return true;
}
function turnDone() {
  stopLoop();
  const st = (G.state = G.sim.state());
  G.rec.add(st, true);
  G.changes = computeChanges(G.before, st);
  G.map.frame(st, st.t, G.view);
  if (st.done) return showAAR();
  G.turn++;
  if (G.sel && !elState(G.sel)) G.sel = null;
  G.view.lit = new Set(G.sel ? [G.sel] : []);
  startOrders();
  G.map.frame(st, st.t, G.view);
}

export function finish() {
  if (!G) return false;
  if (G.phase === "aar") return true;
  if (G.phase === "brief") startOrders();
  for (let k = 0; k < 500 && G.phase !== "aar"; k++) {
    if (G.phase === "orders") endTurn(true);
    else if (G.phase === "turn") skipTurn();
  }
  return G.phase === "aar";
}

// ---------- AAR ----------
// The core's AAR knows only that orders were given during play. Name the scenario plan the orders
// came closest to (elements sent along the routes that plan uses) and judge the concepts against that
// plan as the core does for Easy (used / trap avoided / missed); with no match nothing is judged.
function closestPlanAAR(aar) {
  const bestP = closestPlan(G.scen, G.used || []);
  if (!bestP) { if (G.showRec) aar.planned = { ...aar.planned, name: "Orders given turn by turn, with the recommended plan shown" }; return; }
  aar.planned = { id: bestP.id, name: `Your orders came closest to: ${bestP.name}`, form: bestP.form, summary: bestP.summary, doctrinal: !!bestP.doctrinal };
  aar.concepts = conceptStatus(G.scen, bestP.concepts || []);
}

function showAAR() {
  setPhase("aar");
  stopLoop();
  const st = G.sim.state();
  const aar = G.sim.aar();
  closestPlanAAR(aar);
  G.view.fog = false; G.view.lit = new Set();
  G.map.setPlan("");
  G.map.frame(st, st.t, G.view);
  updateRunUi(st);
  const isBest = best.put(MODE, G.scen.id, aar.score);
  G.map.corners({ hint: "After-action review", readout: `${aar.score.grade} · ${st.losses.friendly} vs ${st.losses.enemy} down` });
  ui.controls.innerHTML = `<button type="button" class="btn btn-primary" id="mt-retry">Retry</button><button type="button" class="btn btn-outline" id="mt-rec">Show the recommended plan</button><button type="button" class="mt-link" id="mt-other">Other scenarios</button>`;
  $("#mt-retry").addEventListener("click", () => openScenario(G.scen.id, { seed: G.seed, orders: true }));
  $("#mt-rec").addEventListener("click", () => openScenario(G.scen.id, { seed: G.seed, orders: true, showRec: true }));
  $("#mt-other").addEventListener("click", showPicker);
  ui.panel.querySelector("#md-changes")?.remove();
  ui.aar.hidden = false;
  const rec = G.rec;
  const scrub = (i) => { const s = rec.state(i); G.map.frame(s, s.t, { fog: false }); G.map.corners({ readout: `${s.clock} · ${s.losses.friendly} vs ${s.losses.enemy} down` }); return s.clock; };
  ui.aar.innerHTML = `<h2>After-action review</h2><div id="mt-aar-body"></div>`;
  aarView($("#mt-aar-body"), aar, {
    frames: rec.frames.length, onScrub: scrub, onSeek: (t) => rec.indexAt(t),
    extra: `<p class="mt-muted">${G.turn} turn${G.turn > 1 ? "s" : ""} of ${G.turnLen < 60 ? `${G.turnLen} s` : `${G.turnLen / 60} min`} · run ${G.seed}${isBest && aar.score.tier < 3 ? " · new best for this scenario" : ""}. Retry plays the same run from the start; Show the recommended plan draws it on the map and can fill in each turn’s orders.</p>`,
  });
}

// ---------- input ----------
ui.card.addEventListener("click", (ev) => { if (G?.phase === "orders") tap(ev.clientX, ev.clientY); });
addEventListener("keydown", (ev) => {
  if (!G || ui.game.hidden) return;
  const tag = document.activeElement?.tagName || "";
  if (/INPUT|SELECT|TEXTAREA/.test(tag)) return;
  if (ev.key === " " && tag !== "BUTTON") {
    if (G.phase === "orders") { ev.preventDefault(); endTurn(); }
    else if (G.phase === "turn") { ev.preventDefault(); pause(!G.paused); }
  } else if (G.phase === "orders" && G.arm && KB_TYPES.has(G.arm.type) && !G.arm.leg && G.arm.stage !== "target" && /^(Tab|Arrow(Right|Left|Up|Down))$/.test(ev.key)) {
    if (kbStep(ev.key === "ArrowLeft" || ev.key === "ArrowUp" || (ev.key === "Tab" && ev.shiftKey) ? -1 : 1)) ev.preventDefault();
  } else if (ev.key === "Enter" && G.phase === "orders" && G.kb && G.arm) {
    ev.preventDefault(); kbConfirm();
  } else if (ev.key === "Escape" && G.phase === "orders") {
    if (G.arm) { G.arm = null; G.kb = null; drawControls(); drawMarks(); } else select(null);
  } else if (/^[1-9]$/.test(ev.key) && G.phase === "orders" && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
    const e = friendly()[Number(ev.key) - 1];
    if (e) { ev.preventDefault(); select(e.id); }
  }
});

// ---------- start ----------
ui.steps.innerHTML = [["brief", "Briefing"], ["orders", "Orders"], ["aar", "Review"]].map(([k, v]) => `<li data-step="${k}">${v}</li>`).join("");
$("#mt-to-picker").addEventListener("click", showPicker);
const start = location.hash.slice(1);
if (byId[start]) { picker(ui.picker, MODE, (id) => openScenario(id)); openScenario(start, { instant: true }); } else showPicker();

// testing hooks
window.__trainerMedium = {
  pick: (id, seed = 1, showRec = false) => openScenario(id, { instant: true, seed, orders: true, showRec }),
  select, order, recommend, finish,
  endTurn: (instant = true) => endTurn(instant),
  arm: (type) => arm(type),
  kb: (d = 1) => kbStep(d), kbConfirm: () => kbConfirm(), kbChoice: () => (G.kb ? G.kb.list[G.kb.i].label : null),
  tapWorld: (x, y) => { const v = G.map.toView([x, y]); const svg = ui.card.querySelector("svg.mt-map-svg"); const m = svg.getScreenCTM(); return tap(m.a * v[0] + m.c * v[1] + m.e, m.b * v[0] + m.d * v[1] + m.f); },
  clientOf: (x, y) => { const v = G.map.toView([x, y]); const svg = ui.card.querySelector("svg.mt-map-svg"); const m = svg.getScreenCTM(); return [m.a * v[0] + m.c * v[1] + m.e, m.b * v[0] + m.d * v[1] + m.f]; },
  state: () => (G ? { phase: G.phase, scen: G.scen.id, turn: G.turn, clock: G.state.clock, sel: G.sel, arm: G.arm?.type || null, staged: Object.fromEntries(Object.entries(G.staged).map(([k, o]) => [k, describe(o, k)])), acts: G.acts.length, done: G.sim.done(), score: G.sim.done() ? G.sim.score() : null, stats: G.map.stats(), contacts: G.state.contacts.length } : null),
  look: LOOK,
};
