// Maneuver Trainer: page pieces shared by every game mode (Easy, Medium, Hard). Inlined by build.mjs
// before the mode script. DOM only; all game logic stays in ../core.
//   best              best scores in localStorage (try/catch: works without it)
//   picker(el, mode, onPick)            level tabs + 4 scenario cards each
//   briefing(el, scen)                  Mission / Enemy / Terrain / Troops / Time tabs
//   mountMap(card, scen)                the map card (iso plate, corners) + render.mjs createMap, sized to the card
//   roster(el, state, opts)             unit roster: strength, suppression bar, task
//   eventLog(el, state)                 newest first
//   recorder(scen) / replayState()      snapshots for the AAR scrubber
//   aarView(el, aar, opts)              four-part AAR with scrubber and concept links
import { SCENARIOS, LEVELS, byId } from "../core/scenarios.mjs";
import { createMap } from "../core/render.mjs";
import { fmtClock } from "../core/sim.mjs";

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const h = (tag, attrs = {}, html = "") => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? "" : v); e.innerHTML = html; return e; };
export { SCENARIOS, LEVELS, byId, fmtClock };

// ---------- best scores ----------
const BEST_KEY = "maneuverTrainer.best";
export const best = {
  all() { try { return JSON.parse(localStorage.getItem(BEST_KEY) || "{}") || {}; } catch (e) { return {}; } },
  get(mode, id) { return best.all()[`${mode}:${id}`] || null; },
  put(mode, id, sc) {
    try {
      const all = best.all(), key = `${mode}:${id}`, old = all[key];
      if (!old || sc.score > old.score) { all[key] = { score: sc.score, grade: sc.grade, line: sc.line }; localStorage.setItem(BEST_KEY, JSON.stringify(all)); return true; }
    } catch (e) { /* storage blocked: scores simply are not kept */ }
    return false;
  },
};

// ---------- scenario picker ----------
export function picker(el, mode, onPick) {
  let level = "fireteam";
  try { level = localStorage.getItem("maneuverTrainer.level") || level; } catch (e) {}
  if (!LEVELS[level]) level = "fireteam";
  const draw = () => {
    el.innerHTML = `<div class="mt-tabs" role="tablist" aria-label="Level">${Object.entries(LEVELS).map(([k, v]) => `<button type="button" role="tab" data-level="${k}" aria-selected="${k === level}">${esc(v)}</button>`).join("")}</div>` +
      `<div class="mt-cards">${SCENARIOS.filter((s) => s.level === level).map((s) => {
        const b = best.get(mode, s.id);
        return `<button type="button" class="mt-card" data-scen="${s.id}"><span class="mt-card-n">Scenario ${s.n}</span><b>${esc(s.title)}</b><span class="mt-card-line">${esc(s.briefing.mission.split(/(?<=\.)\s/)[0])}</span><span class="mt-tags">${s.concepts.map((c) => `<span>${esc(c.title)}</span>`).join("")}</span><span class="mt-best">${b ? `Best: ${esc(b.grade)} · ${esc(b.line)}` : "Not played yet"}</span></button>`;
      }).join("")}</div>`;
    el.querySelectorAll("[data-level]").forEach((b) => b.addEventListener("click", () => { level = b.dataset.level; try { localStorage.setItem("maneuverTrainer.level", level); } catch (e) {} draw(); }));
    el.querySelectorAll("[data-scen]").forEach((b) => b.addEventListener("click", () => onPick(b.dataset.scen)));
  };
  draw();
  return { setLevel(l) { level = l; draw(); } };
}

// ---------- briefing ----------
const BRIEF_TABS = [["mission", "Mission"], ["enemy", "Enemy"], ["terrain", "Terrain"], ["troops", "Troops"], ["time", "Time"]];
export function briefing(el, scen) {
  let tab = "mission";
  const draw = () => {
    el.innerHTML = `<div class="mt-tabs mt-tabs-sm" role="tablist" aria-label="Briefing">${BRIEF_TABS.map(([k, v]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}">${v}</button>`).join("")}</div><p class="mt-brief-text">${esc(scen.briefing[tab])}</p>`;
    el.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; draw(); }));
  };
  draw();
}

// ---------- the map card ----------
// card: an element with .mt-map-host inside an .iso-plate with corners [data-corner].
export function mountMap(card, scen) {
  const host = card.querySelector(".mt-map-host");
  const size = () => {
    const w = Math.max(280, Math.round(host.clientWidth || card.clientWidth || 760));
    const phone = w < 600;
    return [w, Math.round(w * (phone ? 0.92 : 0.6))];
  };
  let [W, H] = size();
  host.style.height = `${H}px`;
  const map = createMap(host, scen, { W, H });
  let timer = 0;
  const onResize = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const [w, hh] = size();
      if (Math.abs(w - W) < 24) return;
      W = w; H = hh; host.style.height = `${H}px`; map.resize(W, H); map.onresize?.();
    }, 180);
  };
  addEventListener("resize", onResize);
  map.dispose = () => removeEventListener("resize", onResize);
  const corner = (name) => card.querySelector(`[data-corner="${name}"]`);
  map.corners = (c) => { for (const [k, v] of Object.entries(c)) { const e = corner(k); if (e && e.textContent !== v) e.textContent = v; } };
  map.corners({ fig: `Scenario ${scen.n} · ${LEVELS[scen.level]}`, title: scen.title });
  return map;
}

// ---------- roster ----------
export function roster(el, st, { selected = null, onSelect = null } = {}) {
  const rows = st.elements.filter((e) => e.side === "f");
  const sig = rows.map((e) => `${e.id}${e.strength}${e.down}${Math.round(e.suppression * 20)}${e.task}${e.pinned}`).join("|") + selected;
  if (el._sig === sig) return;
  el._sig = sig;
  el.innerHTML = rows.map((e) => {
    const s = Math.round(e.suppression * 100);
    return `<div class="mt-unit${e.id === selected ? " is-sel" : ""}${e.strength === 0 ? " is-out" : ""}" data-el="${e.id}"${onSelect ? ' role="button" tabindex="0"' : ""}>` +
      `<span class="mt-unit-name">${esc(e.short || e.name)}${e.ally ? " <i>(neighbour)</i>" : ""}</span><span class="mt-unit-str" title="Able to fight / strength">${e.strength}/${e.size}</span>` +
      `<span class="mt-supp" title="Suppression ${s}%"><span style="width:${s}%"></span></span><span class="mt-unit-task">${esc(e.task || "")}${e.pinned ? " · pinned" : ""}</span></div>`;
  }).join("");
  if (onSelect) el.querySelectorAll("[data-el]").forEach((r) => { r.addEventListener("click", () => onSelect(r.dataset.el)); r.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onSelect(r.dataset.el); } }); });
}

// ---------- event log ----------
const LOG_SKIP = new Set(["down"]);
export function eventLog(el, st, max = 40) {
  const ev = st.events;
  if (el._n === ev.length) return;
  el._n = ev.length;
  const shown = [];
  for (let i = ev.length - 1; i >= 0 && shown.length < max; i--) if (!LOG_SKIP.has(ev[i].type)) shown.push(ev[i]);
  el.innerHTML = shown.map((e) => `<li data-type="${esc(e.type)}"${e.side === "h" ? ' data-side="h"' : ""}><time>${esc(e.clock)}</time> ${esc(e.text)}</li>`).join("") || `<li class="mt-muted">Nothing yet.</li>`;
}

// ---------- replay recorder ----------
const POSES = ["stand", "kneel", "prone", "hole", "building", "veh"], STATUS = ["ok", "down", "captured", "absent"];
export function recorder(first, every = 1) {
  const meta = first.soldiers.map((s) => ({ id: s.id, el: s.el, side: s.side, role: s.role }));
  const frames = [];
  let next = 0;
  return {
    frames,
    add(st, force) {
      if (!force && st.t < next) return;
      next = st.t + every;
      const a = new Float32Array(meta.length * 5);
      st.soldiers.forEach((s, i) => { a[i * 5] = s.x; a[i * 5 + 1] = s.y; a[i * 5 + 2] = s.face; a[i * 5 + 3] = Math.max(0, POSES.indexOf(s.pose)); a[i * 5 + 4] = Math.max(0, STATUS.indexOf(s.status)); });
      frames.push({ t: st.t, clock: st.clock, a, streams: st.streams, smoke: st.smoke, contacts: st.contacts, losses: st.losses });
    },
    state(i) {
      const f = frames[Math.max(0, Math.min(frames.length - 1, i))];
      const soldiers = meta.map((m, j) => ({ ...m, x: f.a[j * 5], y: f.a[j * 5 + 1], face: f.a[j * 5 + 2], pose: POSES[f.a[j * 5 + 3]], status: STATUS[f.a[j * 5 + 4]], stride: 0 }));
      return { t: f.t, clock: f.clock, soldiers, streams: f.streams, smoke: f.smoke, contacts: f.contacts, losses: f.losses };
    },
    indexAt(t) { let i = 0; while (i < frames.length - 1 && frames[i + 1].t <= t) i++; return i; },
  };
}

// ---------- after-action review ----------
export function aarView(el, aar, { frames = 0, onScrub = null, onSeek = null, extra = "" } = {}) {
  const sc = aar.score;
  const tl = aar.happened.map((e) => `<li${e.side === "h" ? ' data-side="h"' : ""}><button type="button" class="mt-seek" data-t="${e.t}">${esc(e.clock)}</button> ${esc(e.text)}</li>`).join("");
  const list = (arr) => (arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="mt-muted">Nothing to add.</p>`);
  el.innerHTML = `<div class="mt-score" data-tier="${sc.tier}"><span class="mt-grade">${esc(sc.grade)}</span><div><b>${esc(sc.line)}</b><span class="mt-muted">${esc(sc.reason)} · score ${sc.score} (notional)</span></div></div>${extra}` +
    `<h3>1. What was planned</h3><p><b>${esc(aar.planned.name)}</b>${aar.planned.form ? ` · ${esc(aar.planned.form)}` : ""}${aar.planned.doctrinal ? ' <span class="mt-badge">recommended plan</span>' : ""}</p>${aar.planned.summary ? `<p class="mt-muted">${esc(aar.planned.summary)}</p>` : ""}` +
    `<h3>2. What happened</h3>${frames > 1 ? `<label class="mt-scrub"><span>Replay</span><input type="range" min="0" max="${frames - 1}" value="${frames - 1}" step="1" aria-label="Replay the run"><output>end</output></label>` : ""}<ol class="mt-timeline">${tl}</ol>` +
    `<h3>3. Why it happened</h3>${list(aar.why)}` +
    `<h3>4. Sustain and improve</h3><div class="mt-si"><div><h4>Sustain</h4>${list(aar.sustain)}</div><div><h4>Improve</h4>${list(aar.improve)}</div></div>` +
    `<h3>Concepts</h3><ul class="mt-concepts">${aar.concepts.map((c) => `<li><a href="${esc(c.href)}">Fig ${c.fig} ${esc(c.title)}</a> <span class="mt-badge${c.status === "missed" ? " is-miss" : c.status === "related" ? " is-plain" : ""}">${c.status === "missed" ? (c.trap ? "fell into it" : "missed") : c.status === "avoided" ? "trap avoided" : c.status === "related" ? "related" : "used"}</span></li>`).join("")}</ul>` +
    `<p class="mt-fine">${esc(aar.notional)}</p>`;
  // phones: the map sits far above the review; put the replay scrubber directly under the map card
  document.querySelectorAll(".mt-scrub-under").forEach((n) => n.remove());
  const scrubEl = el.querySelector(".mt-scrub"), card = document.querySelector("#mt-card");
  if (scrubEl && card && matchMedia("(max-width: 600px)").matches) { scrubEl.classList.add("mt-scrub-under"); card.insertAdjacentElement("afterend", scrubEl); }
  const range = scrubEl?.querySelector("input"), out = scrubEl?.querySelector("output");
  if (range && onScrub) range.addEventListener("input", () => { out.textContent = onScrub(Number(range.value)); });
  el.querySelectorAll(".mt-seek").forEach((b) => b.addEventListener("click", () => { if (!onSeek || !range) return; const i = onSeek(Number(b.dataset.t)); range.value = String(i); out.textContent = onScrub(i); range.closest(".mt-scrub")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }));
  return { setScrub(i) { if (range) { range.value = String(i); out.textContent = onScrub(i); } } };
}
