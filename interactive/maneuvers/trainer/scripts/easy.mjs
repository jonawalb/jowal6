// Maneuver Trainer, Easy: plan, then watch. Scenario picker → briefing → planning board (scheme of
// maneuver, then per element task, route, trigger) → Execute and watch at 1×/2×/4× (pause only) →
// score and after-action review with a replay scrubber. All game logic is the core's (createSim);
// this file only turns choices into a plan object and draws.
import { esc, h, best, picker, briefing, mountMap, roster, eventLog, recorder, aarView, byId, LEVELS, fmtClock } from "./ui.mjs";
import { createSim } from "../core/sim.mjs";
import { TASKS, TECHNIQUES, describeTrigger } from "../core/orders.mjs";
import { LOOK } from "../core/render.mjs";

const MODE = "easy";
const $ = (s) => document.querySelector(s);
const ui = {
  pick: $("#mt-pick"), picker: $("#mt-picker"), game: $("#mt-game"), title: $("#mt-title"), steps: $("#mt-steps"),
  card: $("#mt-card"), controls: $("#mt-controls"), panel: $("#mt-panel"), aar: $("#mt-aar"),
};
const BOX = { fireteam: [16, 7], platoon: [44, 16], company: [110, 34] };
const clone = (o) => JSON.parse(JSON.stringify(o));
const hashS = (s) => { let x = 7; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; };

let G = null; // the current game: { scen, map, phase, base, assign, custom, sel, seed, sim, ... }

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
  ui.pick.hidden = true; ui.game.hidden = false; ui.aar.hidden = true; ui.aar.innerHTML = "";
  ui.title.textContent = `${scen.title}`;
  G = { scen, phase: "brief", base: null, assign: null, custom: false, sel: null, seed: keep.seed ?? 1 + Math.floor(Math.random() * 999), sim: null, speed: 1, paused: false };
  G.map = mountMap(ui.card, scen);
  G.map.onresize = () => { if (G.phase === "plan" || G.phase === "brief") drawPlanMarks(); if (G.lastState) G.map.frame(G.lastState, G.lastState.t, G.view || { fog: true }); };
  G.sim0 = createSim(scen, { seed: G.seed, mode: MODE }); // a still first frame: forces in their start positions
  G.lastState = G.sim0.state();
  G.view = { fog: true, lit: new Set() };
  G.map.frame(G.lastState, 0, G.view);
  G.map.corners({ hint: "Briefing", readout: `0:00 / ${fmtClock(scen.timeLimit)}` });
  try { history.replaceState(null, "", `#${id}`); } catch (e) {}
  if (keep.plan) { choosePlan(keep.plan, true); showPlan(); } else showBrief();
  ui.game.scrollIntoView({ block: "start", behavior: keep.instant ? "auto" : "smooth" });
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
  ui.panel.innerHTML = `<h3>Briefing</h3><div id="mt-brief"></div><p class="mt-muted">Concepts in play: ${s.concepts.map((c) => `<a href="${c.href}">Fig ${c.fig} ${esc(c.title)}</a>`).join(", ")}.</p><button type="button" class="btn btn-primary mt-go" id="mt-to-plan">Plan the operation</button>`;
  briefing($("#mt-brief"), s);
  ui.controls.innerHTML = `<span class="mt-muted">Blue: your troops. Red: the enemy, shown only once spotted. Soldiers drawn larger than scale; all numbers notional.</span>`;
  $("#mt-to-plan").addEventListener("click", showPlan);
  G.map.setPlan("");
}

// ---------- planning board ----------
const routeLabel = (key) => G.scen.routes[key]?.label || key;
const trigLabel = (t) => (typeof t === "string" ? G.scen.triggers?.[t]?.label || t : describeTrigger(t, Object.fromEntries([...G.scen.forces.friendly, ...G.scen.forces.enemy].map((e) => [e.id, e.short || e.name]))));
const elName = (id) => { const e = G.scen.forces.friendly.find((x) => x.id === id); return e ? e.name : id; };
const planOrder = () => [...G.scen.plans].sort((a, b) => hashS(a.id + G.scen.id) - hashS(b.id + G.scen.id));

export function choosePlan(i, quiet) {
  const plans = planOrder();
  const p = typeof i === "number" ? plans[i] : G.scen.plans.find((x) => x.id === i || (i === "recommended" && x.doctrinal));
  if (!p) return false;
  G.base = p; G.assign = clone(p.assign); G.custom = false;
  if (!G.sel || !G.assign[G.sel]) G.sel = Object.keys(G.assign)[0] || null;
  if (!quiet) drawPlanPanel();
  drawPlanMarks();
  return true;
}

function mainEffort(assign) {
  const ids = Object.keys(assign || {});
  return ids.find((id) => assign[id].task === "assault") || ids.find((id) => assign[id].task === "breach") || ids.find((id) => assign[id].task === "follow" && assign[id].target) || null;
}

function targetPos(t) {
  if (Array.isArray(t)) return t;
  const e = G.scen.forces.enemy.find((x) => x.id === t);
  return e ? e.at : G.scen.objective ? [G.scen.objective.x, G.scen.objective.y] : null;
}

function drawPlanMarks() {
  if (!G.map) return;
  if (!G.assign) { G.map.setPlan(""); return; }
  const marks = [];
  const me = mainEffort(G.assign);
  const [bw, bd] = BOX[G.scen.level];
  const pts = (r) => (Array.isArray(r) ? r : G.scen.routes[r]?.pts);
  const len = (p) => p.reduce((n, q, i) => (i ? n + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
  // the selected element's other routes first (faint), then every element's chosen route
  const sel = G.sel && G.scen.choices[G.sel];
  if (sel && G.phase === "plan") for (const r of sel.routes || []) if (r !== G.assign[G.sel]?.route && pts(r) && len(pts(r)) > 6) marks.push({ pts: pts(r), cls: "mt-route-alt" });
  // executing: the plan fades back (main effort a little stronger), a finished leg drops off, the current leg
  // shows only what is left of it
  const run = G.phase === "run" && G.sim;
  const same = (p, q) => p && q && Math.abs(p[0] - q[0]) < 1 && Math.abs(p[1] - q[1]) < 1;
  G.execK = G.execK || {};
  for (const [id, a] of Object.entries(G.assign)) {
    const chain = [a, ...(a.then || [])];
    const el = run ? G.sim.S.byId[id] : null;
    let cur = -1;
    if (el?.order?.route) {
      const end = el.order.route[el.order.route.length - 1];
      const k = chain.findIndex((st0) => { const p = pts(st0.route); return p && same(p[p.length - 1], end); });
      cur = G.execK[id] = k >= 0 ? k : G.execK[id] ?? 0;
    }
    if (el && el.ok === 0) continue;
    chain.forEach((step, k) => {
      let p = pts(step.route);
      if (!p || len(p) < 6) return;
      const isSbf = (step.task === "sbf" || step.task === "fix") && k === 0;
      if (run && k < cur) return;
      let line = true;
      if (run && k === cur) {
        if (el.arrived || el.complete) line = false;
        else { let bi = 0, bd = Infinity; p.forEach((q, i) => { const d = Math.hypot(q[0] - el.x, q[1] - el.y); if (d < bd) { bd = d; bi = i; } }); p = [[el.x, el.y], ...p.slice(bi + 1)]; if (p.length < 2 || len(p) < 6) line = false; }
      }
      const cls = (id === me ? "mt-route mt-main" : G.sel === id && G.phase === "plan" ? "mt-route mt-sel" : "mt-route") + (run ? " mt-exec" : "");
      if (line) marks.push({ pts: p, cls });
      if (run && isSbf && el.lifted) return;
      if (isSbf) {
        p = pts(step.route);
        const end = p[p.length - 1], tp = targetPos(step.target) || end;
        const face = Math.atan2(tp[1] - end[1], tp[0] - end[0]) * 180 / Math.PI;
        marks.push({ box: [end[0], end[1], face + 90, bw, bd], cls: `mt-route mt-box${run ? " mt-exec" : ""}` });
      }
    });
  }
  const sig = JSON.stringify(marks.map((m) => [m.cls, m.box, m.pts && m.pts.length, m.pts && m.pts[0].map(Math.round)]));
  if (!run || sig !== G.execSig) G.map.setPlan(G.map.planMarks(marks));
  G.execSig = run ? sig : null;
  G.view.lit = new Set(me ? [me] : []);
}

function optionList(values, current, label) {
  const vals = [...(values || [])];
  const has = vals.some((v) => JSON.stringify(v) === JSON.stringify(current));
  if (current !== undefined && current !== null && !has) vals.unshift(current);
  return vals.map((v, i) => `<option value="${i}"${JSON.stringify(v) === JSON.stringify(current) ? " selected" : ""}>${esc(label(v))}</option>`).join("");
}

function drawPlanPanel() {
  const s = G.scen;
  const plans = planOrder();
  const schemes = plans.map((p, i) => `<label class="mt-scheme${G.base?.id === p.id ? " is-on" : ""}"><input type="radio" name="mt-scheme" value="${i}"${G.base?.id === p.id ? " checked" : ""}><span><b>${esc(p.name)}</b>${G.showRec && p.doctrinal ? ' <span class="mt-badge">recommended</span>' : ""}<span class="mt-form">${esc(p.form || "")}</span><span class="mt-sum">${esc(p.summary)}</span></span></label>`).join("");
  let els = "";
  if (G.assign) {
    for (const id of Object.keys(s.choices)) {
      const c = s.choices[id], a = G.assign[id] || {};
      const sel = id === G.sel;
      const row = (f, label, values, cur, lab) => (values && (values.length || cur) ? `<label><span>${label}</span><select data-el="${id}" data-f="${f}">${optionList(values, cur, lab)}</select></label>` : "");
      els += `<div class="mt-el${sel ? " is-sel" : ""}" data-el="${id}"><button type="button" class="mt-el-h" data-pick="${id}"><b>${esc(elName(id))}</b>${id === mainEffort(G.assign) ? ' <span class="mt-badge">main effort</span>' : ""}</button>` +
        row("task", "Task", c.tasks, a.task, (v) => TASKS[v] || v) +
        row("route", "Route", c.routes, a.route, (v) => (typeof v === "string" ? routeLabel(v) : "As planned")) +
        row("trigger", a.task === "sbf" || a.task === "fix" ? "Lift fire" : "Trigger", c.triggers, a.trigger, (v) => trigLabel(v)) +
        row("technique", "Movement", c.techniques, a.technique, (v) => TECHNIQUES[v] || v) +
        row("method", "Method", c.methods, a.method, (v) => (v === "alternating" ? "alternating bounds" : v === "run" ? "everyone runs" : v)) +
        (c.commits ? row("commit", "Counterattack", c.commits, a.commit?.route, (v) => routeLabel(v)) : "") +
        `</div>`;
    }
  }
  const rec = G.scen.plans.find((p) => p.doctrinal);
  ui.panel.innerHTML = `<h3>Scheme of maneuver</h3><p class="mt-muted">Pick one. Then adjust each element if you like; its route shows as chalk on the map (the main effort in black).</p><div class="mt-schemes">${schemes}</div>` +
    (G.assign ? `<h3>Elements${G.custom ? ' <span class="mt-badge">modified</span>' : ""}</h3><div class="mt-els">${els}</div>` : "") +
    `<div class="mt-exec"><button type="button" class="btn btn-primary mt-go" id="mt-exec"${G.assign ? "" : " disabled"}>Execute</button><span class="mt-muted">Run ${G.seed} · same plan and run number give the same result</span></div>`;
  ui.panel.querySelectorAll('input[name="mt-scheme"]').forEach((r) => r.addEventListener("change", () => choosePlan(Number(r.value))));
  ui.panel.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => { G.sel = b.dataset.pick; drawPlanPanel(); drawPlanMarks(); }));
  ui.panel.querySelectorAll("select[data-f]").forEach((sel) => sel.addEventListener("change", () => {
    const id = sel.dataset.el, f = sel.dataset.f, c = s.choices[id], a = (G.assign[id] = G.assign[id] || {});
    const list = { task: c.tasks, route: c.routes, trigger: c.triggers, technique: c.techniques, method: c.methods, commit: c.commits }[f] || [];
    const cur = f === "commit" ? a.commit?.route : a[f];
    const vals = [...list];
    if (cur !== undefined && cur !== null && !vals.some((v) => JSON.stringify(v) === JSON.stringify(cur))) vals.unshift(cur);
    const v = vals[Number(sel.value)];
    if (f === "commit") a.commit = { ...(a.commit || {}), route: v };
    else a[f] = v;
    if (f === "task" && (v === "assault" || v === "sbf" || v === "fix") && !a.target) a.target = (s.objectiveEls || [])[0] || s.forces.enemy[0]?.id;
    if (f === "task" || f === "route") delete a.then;
    G.sel = id; G.custom = true;
    drawPlanPanel(); drawPlanMarks();
  }));
  $("#mt-exec")?.addEventListener("click", execute);
}

function showPlan() {
  setPhase("plan");
  ui.aar.hidden = true;
  drawPlanPanel();
  drawPlanMarks();
  ui.controls.innerHTML = `<span class="mt-muted">Tap a chalk route on the map to give it to the selected element.</span>${G.showRec ? "" : ""}`;
  G.map.corners({ hint: "Planning", readout: `0:00 / ${fmtClock(G.scen.timeLimit)}` });
  if (G.lastState && G.sim0) { G.lastState = G.sim0.state(); G.view.fog = true; G.map.frame(G.lastState, 0, G.view); }
}

// tap a route on the map: the nearest offered route of the selected element (or of any element)
function onMapClick(ev) {
  if (!G || G.phase !== "plan" || !G.assign) return;
  const [x, y] = G.map.pick(ev.clientX, ev.clientY);
  const dist = (pts) => { let d = Infinity; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; const u = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0; d = Math.min(d, Math.hypot(x - ax - u * dx, y - ay - u * dy)); } return d; };
  const tol = { fireteam: 14, platoon: 22, company: 38 }[G.scen.level];
  let bestHit = null;
  for (const [id, c] of Object.entries(G.scen.choices)) for (const r of c.routes || []) {
    const p = G.scen.routes[r]?.pts;
    if (!p) continue;
    const d = dist(p) - (id === G.sel ? tol * 0.5 : 0);
    if (d < tol && (!bestHit || d < bestHit.d)) bestHit = { id, r, d };
  }
  if (!bestHit) return;
  const a = (G.assign[bestHit.id] = G.assign[bestHit.id] || {});
  if (a.route !== bestHit.r) { a.route = bestHit.r; delete a.then; G.custom = true; }
  G.sel = bestHit.id;
  drawPlanPanel(); drawPlanMarks();
}

// ---------- execute and watch ----------
let raf = 0, last = 0;
function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

function planObject() {
  if (!G.custom) return G.base.id;
  return { id: "custom", name: `${G.base.name} (modified)`, form: G.base.form, concepts: G.base.concepts, summary: G.base.summary, assign: clone(G.assign), actions: clone(G.base.actions || []) };
}

export function execute() {
  if (!G || !G.assign) return false;
  stopLoop();
  setPhase("run");
  ui.aar.hidden = true;
  G.sim = createSim(G.scen, { seed: G.seed, plan: planObject(), mode: MODE });
  G.state = G.sim.state();
  G.rec = recorder(G.state, G.scen.timeLimit > 1200 ? 2 : 1);
  G.rec.add(G.state, true);
  G.vt = 0; G.paused = false; G.view.fog = true; G.execK = {}; G.execSig = null;
  drawPlanMarks();
  ui.panel.innerHTML = `<div class="mt-clock"><span id="mt-clock">0:00</span><span class="mt-muted"> / ${fmtClock(G.scen.timeLimit)}</span><span id="mt-losses" class="mt-losses"></span></div><h3>Your units</h3><div class="mt-roster" id="mt-roster"></div><h3>Log</h3><ol class="mt-log" id="mt-log"></ol>`;
  ui.controls.innerHTML = `<div class="mt-speed" role="group" aria-label="Speed">${[1, 2, 4].map((n) => `<button type="button" data-speed="${n}" aria-pressed="${n === G.speed}">${n}×</button>`).join("")}</div><button type="button" class="btn btn-outline" id="mt-pause" aria-pressed="false">Pause</button><button type="button" class="mt-link" id="mt-skip">Skip to the result</button>`;
  ui.controls.querySelectorAll("[data-speed]").forEach((b) => b.addEventListener("click", () => speed(Number(b.dataset.speed))));
  $("#mt-pause").addEventListener("click", () => pause(!G.paused));
  $("#mt-skip").addEventListener("click", finish);
  G.map.corners({ hint: "Executing" });
  { const r = ui.card.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * 0.5) ui.card.scrollIntoView({ block: "start", behavior: "smooth" }); } // phones: Execute sits below a long panel; bring the battle into view
  last = 0;
  raf = requestAnimationFrame(loop);
  return true;
}

export function speed(n) {
  if (!G) return;
  G.speed = [1, 2, 4].includes(n) ? n : 1;
  ui.controls.querySelectorAll("[data-speed]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.speed) === G.speed)));
}
function pause(on) {
  if (!G || G.phase !== "run") return;
  G.paused = on;
  const b = $("#mt-pause");
  if (b) { b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "Resume" : "Pause"; }
  G.map.corners({ hint: on ? "Paused" : "Executing" });
}

let uiT = 0;
function loop(now) {
  raf = 0;
  if (!G || G.phase !== "run") return;
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
  last = now;
  if (!G.paused) {
    G.sim.step(dt * G.speed);
    G.vt += dt * G.speed;
  }
  const st = (G.state = G.sim.state());
  G.vt = Math.max(st.t - 0.1, Math.min(st.t + 0.1, G.vt));
  G.lastState = st;
  G.rec.add(st);
  G.map.frame(st, G.vt, G.view);
  if (now - uiT > 240 || st.done) { uiT = now; updateRunUi(st); drawPlanMarks(); }
  if (st.done) { G.rec.add(st, true); return showAAR(); }
  raf = requestAnimationFrame(loop);
}

function updateRunUi(st) {
  const c = $("#mt-clock"); if (c) c.textContent = st.clock;
  const l = $("#mt-losses"); if (l) l.textContent = `${st.losses.friendly} vs ${st.losses.enemy} down`;
  const r = $("#mt-roster"); if (r) roster(r, st);
  const g = $("#mt-log"); if (g) eventLog(g, st);
  G.map.corners({ readout: `${st.clock} · ${st.losses.friendly} vs ${st.losses.enemy} down` });
}

export function finish() {
  if (!G || !G.sim) return false;
  if (G.phase === "aar") return true;
  stopLoop();
  while (!G.sim.done()) { G.sim.step(G.rec.frames.length > 1 ? 1 : 1); G.rec.add(G.sim.state()); }
  const st = (G.state = G.lastState = G.sim.state());
  G.rec.add(st, true);
  updateRunUi(st);
  showAAR();
  return true;
}

// ---------- AAR ----------
function showAAR() {
  setPhase("aar");
  stopLoop();
  const st = G.sim.state();
  const aar = G.sim.aar();
  G.view.fog = false;
  G.map.frame(st, st.t, G.view);
  updateRunUi(st);
  const isBest = best.put(MODE, G.scen.id, aar.score);
  G.map.corners({ hint: "After-action review", readout: `${aar.score.grade} · ${st.losses.friendly} vs ${st.losses.enemy} down` });
  ui.controls.innerHTML = `<button type="button" class="btn btn-primary" id="mt-retry">Retry</button><button type="button" class="btn btn-outline" id="mt-again">Run again</button><button type="button" class="btn btn-outline" id="mt-rec">Show the recommended plan</button><button type="button" class="mt-link" id="mt-other">Other scenarios</button>`;
  $("#mt-retry").addEventListener("click", () => { G.showRec = false; showPlan(); });
  $("#mt-again").addEventListener("click", () => { G.seed += 1; execute(); });
  $("#mt-rec").addEventListener("click", () => { G.showRec = true; choosePlan("recommended", true); showPlan(); ui.panel.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
  $("#mt-other").addEventListener("click", showPicker);
  ui.aar.hidden = false;
  const rec = G.rec;
  const scrub = (i) => { const s = rec.state(i); G.map.frame(s, s.t, { fog: false, lit: G.view.lit }); G.map.corners({ readout: `${s.clock} · ${s.losses.friendly} vs ${s.losses.enemy} down` }); return s.clock; };
  ui.aar.innerHTML = `<h2>After-action review</h2><div id="mt-aar-body"></div>`;
  aarView($("#mt-aar-body"), aar, {
    frames: rec.frames.length, onScrub: scrub, onSeek: (t) => rec.indexAt(t),
    extra: `<p class="mt-muted">Run ${G.seed}${isBest && aar.score.tier < 3 ? " · new best for this scenario" : ""}. Retry replays the same run; Run again rolls new chances with the same plan.</p>`,
  });
}

// ---------- start ----------
ui.card.addEventListener("click", onMapClick);
addEventListener("keydown", (ev) => {
  if (!G || G.phase !== "run") return;
  if (ev.key === " " && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement?.tagName || "")) { ev.preventDefault(); pause(!G.paused); }
});
ui.steps.innerHTML = [["brief", "Briefing"], ["plan", "Plan"], ["run", "Execute"], ["aar", "Review"]].map(([k, v]) => `<li data-step="${k}">${v}</li>`).join("");
$("#mt-to-picker").addEventListener("click", showPicker);
const start = location.hash.slice(1);
if (byId[start]) { picker(ui.picker, MODE, (id) => openScenario(id)); openScenario(start, { instant: true }); } else showPicker();

// testing hooks
window.__trainer = {
  pick: (id, seed = 1) => { openScenario(id, { instant: true, seed }); return !!G; },
  choosePlan: (i) => { if (G.phase !== "plan") showPlan(); return choosePlan(i ?? "recommended"); },
  execute, speed, finish,
  pause: (on = true) => pause(on),
  advance: (sec) => { if (!G?.sim || G.phase !== "run") return false; for (let k = 0; k < sec && !G.sim.done(); k++) { G.sim.step(1); G.rec.add(G.sim.state()); } G.lastState = G.sim.state(); G.vt = G.lastState.t; G.map.frame(G.lastState, G.vt, G.view); updateRunUi(G.lastState); return G.lastState.clock; },
  state: () => (G ? { phase: G.phase, scen: G.scen.id, plan: G.base?.id, custom: G.custom, done: G.sim?.done() || null, score: G.sim?.done() ? G.sim.score() : null, stats: G.map.stats() } : null),
  frame: () => G && G.map.frame(G.lastState, G.lastState.t, G.view),
  look: LOOK,
};
