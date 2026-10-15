// The raid model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so the figure, the readout
// and the tests all run this one file.
//
// DOCTRINE (the page quotes it, with paragraph and page): FM 3-90 (1 May 2023) para 5-142: a raid is
// "a variation of attack to temporarily seize an objective with a planned withdrawal"; five phases
// (insertion or infiltration, isolation, surprise attack, objective seized and task accomplished,
// withdrawal). ATP 3-21.8 (11 Jan 2024, C1) paras 7-97 to 7-120: three elements (assault, support,
// security); "accomplishes its assigned task quickly before any surviving enemy in the objective
// area can recover or be reinforced" (7-114); the security element isolates the objective, with "enemy
// reserves or response forces that will be alerted once the engagement begins" (7-102). ATP 3-21.10
// (1 June 2026) para 2-199: "The raid ends with a planned exfiltration off the objective and a return
// to the main body."
//
// EVERYTHING BELOW IS A NOTIONAL TEACHING MODEL, stated as such on the page. No source gives the times.
// A run is a closed-form function of figure time t, the time held on the objective (dwell) and whether
// the security element is holding the response force (security). Times are compressed figure seconds.

export const RAIL = { HX: -62, OX: 52, SHL: 7, GX: 2 };   // bench units: home stop, objective stop, half length of the shuttle, gate bar
const SPAN = RAIL.OX - RAIL.HX;
export const MODEL = {
  run: 6.0,          // s: the raiding force's run-in from the release point to the objective (and the same back)
  fire: 4.5,         // s: fires open and the response force is alerted; the reaction clock starts
  task: 3.0,         // s on the objective needed to accomplish the task (the target trips)
  uTail: (RAIL.GX - RAIL.SHL - RAIL.HX) / SPAN,   // 0.5: the shuttle's far end has cleared the gate bar
  uNose: (RAIL.GX + RAIL.SHL - RAIL.HX) / SPAN,   // about 0.623: its near end meets the gate bar
  R: { off: 9.0, on: 15.0 },   // s from the alert until the response force reaches the withdrawal route: security off / holding it
  block: 5.0,        // s after the alert at which a blocked response force is halted (security on)
  dwell: { min: 0, max: 12, step: 0.5, start: 4.0 },
  pegs: 6,           // the task meter
  enemy: 6,          // defenders drawn at the objective
  friendMax: 6,      // most friendly men drawn going down
  enemyT: [5.2, 6.4, 7.2, 8.0, 8.8, 9.6],   // s: when each defender goes out of action while the raiding force is there
  hitT: [1.2, 2.6],                          // s after arrival: friendly men down on the objective
  caughtT: [0.8, 1.8, 2.8, 3.8],             // s after the response force arrives: friendly men down at the gate
  gateDrop: 0.4,     // s: the gate bar's fall
  hold: 2.6,         // s an outcome is held before the run ends
};
export const START = { dwell: MODEL.dwell.start, security: true };
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const ease = (t) => t * t * (3 - 2 * t);
export const snap = (d) => clamp(Math.round(d / MODEL.dwell.step) * MODEL.dwell.step, MODEL.dwell.min, MODEL.dwell.max);

export const reaction = (security, m = MODEL) => (security ? m.R.on : m.R.off);
// The largest dwell that still gets the force back through the gate in time (the tail clears at leave + (1 - uTail) run).
export const maxDwell = (security, m = MODEL) => m.fire + reaction(security, m) - m.run - (1 - m.uTail) * m.run;

// Where the shuttle (the lead of the raiding force) is, 0 = release point, 1 = objective, at figure time t.
function planOf(cfg, m = MODEL) {
  const d = clamp(cfg.dwell, m.dwell.min, m.dwell.max);
  const L = m.run + d;                              // leaves the objective
  const tClose = m.fire + reaction(cfg.security, m); // the response force reaches the route: the gate is shut
  const crossT = L + (1 - m.uTail) * m.run;          // the tail would clear the gate bar
  const caught = crossT > tClose + 1e-9;
  let uStall = null, stallT = null, straddle = false;
  if (caught) {
    const uAt = tClose <= m.run ? tClose / m.run : tClose <= L ? 1 : 1 - (tClose - L) / m.run;
    straddle = uAt <= m.uNose;
    uStall = straddle ? uAt : m.uNose;
    stallT = L + (1 - uStall) * m.run;
  }
  const outcome = caught ? "caught" : d < m.task ? "early" : "complete";
  const end = caught ? Math.max(stallT, tClose + m.caughtT[m.caughtT.length - 1] + 0.4) : L + m.run;
  return { d, L, tClose, crossT, caught, uStall, stallT, straddle, outcome, end };
}

export function stateAt(cfg, t, released = true, m = MODEL) {
  const p = planOf(cfg, m);
  const tt = released ? Math.max(0, t) : 0;
  const { d, L, tClose } = p;
  let u;
  if (tt <= m.run) u = tt / m.run;
  else if (tt <= L) u = 1;
  else u = Math.max(1 - (tt - L) / m.run, p.uStall ?? 0);
  const phase = tt < m.run ? "in" : tt <= L ? "on" : "out";
  const taskProg = released ? clamp((Math.min(tt, L) - m.run) / m.task) : 0;
  const taskDone = released && p.d >= m.task && tt >= m.run + m.task;
  const alert = released && tt >= m.fire;
  const clockFrac = alert ? clamp((tt - m.fire) / reaction(cfg.security, m)) : 0;
  const gate = released ? clamp((tt - (tClose - m.gateDrop)) / m.gateDrop) : 0;
  const downET = released ? m.enemyT.filter((x) => x <= L + 1e-9 && tt >= x) : [];
  const downFT = [];
  if (released) {
    for (const x of m.hitT) if (m.run + x <= L + 1e-9 && tt >= m.run + x) downFT.push(+(m.run + x).toFixed(3));
    if (p.caught) for (const x of m.caughtT) if (tt >= tClose + x) downFT.push(+(tClose + x).toFixed(3));
  }
  const stalled = released && p.caught && tt >= p.stallT - 1e-9;
  const finished = released && tt >= p.end - 1e-9;
  const done = released && tt >= p.end + m.hold;
  return {
    cfg, t: tt, released, plan: p, u, phase, taskProg, taskDone, alert, clockFrac, gate, tClose,
    pegs: Math.ceil(taskProg * m.pegs - 1e-9), downFT, downET, downF: downFT.length, downE: downET.length,
    caught: p.caught, stalled, finished, done, end: p.end, outcome: p.outcome, straddle: p.straddle,
    dwell: p.d, security: cfg.security,
    // the reaction clock the machine's dial reads, and where the response force is in its own time
    reactT: alert ? tt - m.fire : 0,
  };
}
export const finalState = (cfg, m = MODEL) => stateAt(cfg, planOf(cfg, m).end, true, m);

export function phaseWord(s) {
  if (!s.released) return "Ready";
  if (s.stalled) return "Caught by response force";
  if (s.finished && !s.caught) return s.outcome === "early" ? "Task not done" : "Raid complete";
  if (s.phase === "in") return "Run in";
  if (s.phase === "on") return s.taskDone ? "Task done" : "On objective";
  return "Withdrawing";
}
const fmt = (d) => d.toFixed(1);
export function readoutMachine(s) {
  if (!s.released) return `Ready · hold ${fmt(s.dwell)} s · security ${s.security ? "on" : "off"}`;
  return `${phaseWord(s)} · ${s.downF} vs ${s.downE} down`;
}
export const readoutField = readoutMachine;
// the response force's progress along its road (0 at its assembly area, 1 at the withdrawal route), with
// the halt at the security element's block when security is on. Pure; used by the Battlefield.
export function columnAt(s, m = MODEL) {
  if (!s.alert) return { f: 0, halted: false };
  const tp = s.reactT, delay = m.R.on - m.R.off, hf = m.block;
  let te = tp;
  let halted = false;
  if (s.security) {
    if (tp >= hf && tp < hf + delay) { te = hf; halted = true; }
    else if (tp >= hf + delay) te = tp - delay;
  }
  return { f: clamp(te / m.R.off), halted, blockF: m.block / m.R.off };
}
