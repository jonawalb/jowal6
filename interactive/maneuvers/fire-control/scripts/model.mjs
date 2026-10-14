// The fire-control model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so both views,
// the readout and the tests run this one file.
//
// Sourced (ATP 3-21.8, 11 Jan 2024, C1): the principles "avoid target overkill" and "destroy the
// greatest threat first" (A-2 to A-6), the four steps of the fire control process (A-33), engagement
// priorities and TRPs as means of distributing fires (A-28, A-61), the shift triggers (A-38).
// Notional (teaching values, labeled on the page): every number below.

export const MODEL = {
  teams: 6,                   // friendly fire teams on the line (3 squads of 2 teams), left to right
  w: [1, 1, 3, 1, 1],         // enemy fire weight per element; the middle one is the machine-gun team (notional)
  Q: [6, 6, 9, 6, 6],         // effect, in fire-team-seconds, that puts an element out of action (notional)
  threat: 2,                  // index of the greatest threat
  cap: 2,                     // most teams whose fire still adds effect on one element at once (notional)
  lag: 0.6,                   // seconds before a team shifts after its target is down (notional)
  tEnd: 16,                   // seconds until the enemy reaches the wire if still moving (notional)
  blueK: 0.06,                // friendly men down per weight-second of enemy fire (notional)
  prep: 3,                    // seconds of fire-control steps 1 to 3 before the enemy is released (notional)
  stepAt: [0.5, 1.5, 2.5],    // when steps 1, 2 and 3 are done within the prep time (notional)
  speed: 2.2,                 // model seconds per real second on the page
};
export const N_T = MODEL.w.length;
export const MODES = { U: "Uncontrolled", C: "Controlled" };
// The four steps of the fire control process, as ATP 3-21.8 para A-33 words them.
export const STEPS = [
  "Identify probable enemy locations and determine the enemy scheme of maneuver",
  "Determine where and how to mass fires",
  "Orient forces to speed target acquisition",
  "Shift fires to refocus or redistribute",
];
export const STEP_SHORT = ["Identify enemy locations", "Decide where, how to mass", "Orient forces", "Shift fires"];
// Controlled assignment at the start: frontal pattern, the greatest threat gets two teams (priority).
export const C_START = [0, 1, 2, 2, 3, 4];

export function fresh(mode = "U") {
  return { mode, phase: "ready", tp: 0, t: 0, stage: 0, fill: Array(N_T).fill(0), down: Array(N_T).fill(null),
    team: Array(MODEL.teams).fill(null).map(() => ({ tgt: -1, stale: 0 })), fired: 0, wasted: 0, X: 0, shifted: false, end: "" };
}
export const alive = (s, i) => s.down[i] === null;
export const firing = (s) => s.down.reduce((n, d) => n + (d === null ? 1 : 0), 0);
export const engaged = (s, i) => s.team.reduce((n, T) => n + (T.tgt === i ? 1 : 0), 0);
export const hitShare = (s, i, m = MODEL) => Math.min(1, s.fill[i] / m.Q[i]);

function assign(s, k, m) {
  const T = s.team[k];
  T.stale = 0;
  if (s.mode === "U") { const first = s.down.findIndex((d) => d === null); T.tgt = first; return; }
  // Controlled: the live element with the highest threat that still has room for another team, then the longest to kill.
  T.tgt = -1;
  let best = null;
  for (let i = 0; i < N_T; i++) {
    if (!alive(s, i)) continue;
    const used = s.team.reduce((n, o, j) => n + (j !== k && o.tgt === i ? 1 : 0), 0);
    if (used >= m.cap) continue;
    const key = [m.w[i], (m.Q[i] - s.fill[i]) / (used + 1)];
    if (!best || key[0] > best.key[0] || (key[0] === best.key[0] && key[1] > best.key[1] + 1e-9)) best = { i, key };
  }
  if (best) T.tgt = best.i;
}
export function ready(s) { return s.phase === "ready"; }
export function engage(s) { if (s.phase === "ready") s.phase = s.mode === "C" ? "prep" : "start"; return s; }

// One step of dt model seconds. Mutates and returns s.
export function step(s, dt, m = MODEL) {
  if (s.phase === "ready" || s.phase === "done") return s;
  if (s.phase === "prep") {
    s.tp += dt;
    s.stage = m.stepAt.filter((a) => s.tp >= a - 1e-12).length;
    if (s.tp < m.prep - 1e-12) return s;
    s.phase = "start";
  }
  if (s.phase === "start") {
    s.phase = "battle";
    if (s.mode === "C") { s.stage = 3; s.team.forEach((T, k) => { T.tgt = C_START[k]; }); }
    else s.team.forEach((T) => { T.tgt = 0; });
  }
  s.t += dt;
  // a team whose target is down keeps firing at it for the lag, then shifts
  for (let k = 0; k < m.teams; k++) {
    const T = s.team[k];
    if (T.tgt >= 0 && !alive(s, T.tgt)) {
      T.stale += dt;
      if (T.stale >= m.lag - 1e-12) { assign(s, k, m); if (s.mode === "C") { s.shifted = true; s.stage = 4; } }
    } else if (T.tgt < 0 && s.mode === "C") assign(s, k, m);
  }
  // fire and effect
  const on = Array(N_T).fill(0);
  let shooters = 0;
  for (const T of s.team) if (T.tgt >= 0) { shooters++; if (alive(s, T.tgt) && T.stale === 0) on[T.tgt]++; }
  let useful = 0;
  for (let i = 0; i < N_T; i++) if (alive(s, i) && on[i]) {
    const eff = Math.min(on[i], m.cap);
    useful += eff;
    s.fill[i] = Math.min(m.Q[i], s.fill[i] + eff * dt);
  }
  s.fired += shooters * dt;
  s.wasted += (shooters - useful) * dt;
  for (let i = 0; i < N_T; i++) if (alive(s, i)) { s.X += m.w[i] * dt; if (s.fill[i] >= m.Q[i] - 1e-9) s.down[i] = s.t; }
  if (firing(s) === 0) { s.phase = "done"; s.end = "cleared"; }
  else if (s.t >= m.tEnd - 1e-9) { s.phase = "done"; s.end = "reached"; }
  return s;
}
export const wastedPct = (s) => (s.fired > 1e-9 ? Math.round((100 * s.wasted) / s.fired) : 0);
export const bluesDown = (s, m = MODEL) => Math.round(m.blueK * s.X);
export const redDown = (s) => 3 * s.down.filter((d) => d !== null).length;
export function stateWord(s) {
  if (s.phase === "ready") return "Ready";
  if (s.phase === "prep") return `Step ${s.stage + 1 > 3 ? 3 : s.stage + 1} of 4`;
  if (s.phase === "done") return s.end === "cleared" ? "Cleared" : "At the wire";
  return s.mode === "C" ? "Shifting" : "Engaged";
}
// Run a whole engagement (for the tests). Returns the final state.
export function simulate(mode, { dt = 1 / 600, until = 40 } = {}, m = MODEL) {
  const s = engage(fresh(mode));
  for (let t = 0; t < until && s.phase !== "done"; t += dt) step(s, dt, m);
  return s;
}
