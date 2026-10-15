// The passage-of-lines model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so the figure,
// the readout and the tests all run this one file.
//
// DOCTRINE (the page quotes it, with paragraph and page): FM 3-90 (1 May 2023) para 16-1 and 16-3
// (passage of lines, forward and rearward), 16-20 (passing units prefer gaps; avoid concentrating),
// 16-29 (control passes "after two-thirds of forward passing combat elements move through their
// passage points"), 16-31 and 16-32 (no halting; passages occur rapidly), para 15-2 and 15-3 (relief in
// place; sequential, simultaneous, staggered; simultaneous "takes the least time to execute but is
// more easily detected"), 15-25 (simultaneous relief: roughly two thirds). ATP 3-21.10 (1 June 2026)
// para 5-52 (responsibility transfers "normally when the incoming unit has a majority of the fighting
// force in place") and 5-63 to 5-83. ATP 3-21.8 (11 Jan 2024, C1) paras 6-23 to 6-43.
//
// EVERYTHING BELOW IS A NOTIONAL TEACHING MODEL, stated as such on the page. No source gives a time, a
// number of lanes for a company, a detection threshold or a casualty count. A run is a closed-form
// function of figure time t, the mode and k, the number of platoons moving together.

export const MODEL = {
  platoons: 3,
  lanes: 2,            // passage lanes through the stationary unit's positions (notional)
  run: 3.0,            // s: assembly area to the contact point
  lane: 4.0,           // s: contact point to the BHL, through the passage point (the lane is held this long)
  onward: 3.0,         // s: BHL to the assault position
  ppAt: 0.5,           // share of the lane at which a platoon is "through its passage point"
  salvo: 5.0,          // s: enemy fires land on the area between the contact points and the BHL (passage)
  enemy: 6,            // defenders at the outpost forward of the BHL
  enemyBase: 8, enemySlope: 0.6,   // defenders neutralised = 8 - 0.6 x (time control passes), 1 to 6
  enemyGap: 1.2, enemyLag: 2.0,
  hitGap: 0.35,
  // relief in place
  move: 4.0,           // s: incoming platoon from its assembly area into the position
  exchange: 2.0,       // s: guided in, range cards and information exchanged
  back: 4.0,           // s: outgoing platoon withdraws to the rear
  reliefSalvo: 5.0,    // s
  detectAt: 3,         // platoons moving at once at which the enemy notices (notional)
  hold: 2.6,
};
export const START = { mode: "pass", k: 2 };
export const MODES = ["pass", "relief"];
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const ease = (t) => t * t * (3 - 2 * t);
export const snapK = (k) => clamp(Math.round(k), 1, 3);

// ---- forward passage ----
// Start times (when each platoon leaves its assembly area) by k, platoons together. Lane 0 takes platoons
// 1 and 3 in file, lane 1 takes platoon 2. A lane is held for m.lane seconds by each platoon that uses it.
export function passPlan(k, m = MODEL) {
  const start = k === 1 ? [0, m.lane, 2 * m.lane] : k === 2 ? [0, 0, m.lane] : [0, 0, 0];
  const lane = [0, 1, 0];
  const arrive = start.map((s) => s + m.run);
  // entry: a lane is free when the platoon ahead of it in that lane has cleared the BHL
  const enter = [];
  for (let i = 0; i < 3; i++) {
    let e = arrive[i];
    for (let j = 0; j < i; j++) if (lane[j] === lane[i]) e = Math.max(e, enter[j] + m.lane);
    enter.push(e);
  }
  const halt = enter.map((e, i) => +(e - arrive[i]).toFixed(6));
  const pp = enter.map((e) => e + m.ppAt * m.lane);
  const bhl = enter.map((e) => e + m.lane);
  const done = bhl.map((b) => b + m.onward);
  const T2 = [...pp].sort((a, b) => a - b)[1];   // the second platoon through its passage point
  // who is in the stationary unit's area, or halted at the contact point, when the enemy fires land
  const present = [0, 1, 2].filter((i) => arrive[i] <= m.salvo && bhl[i] > m.salvo);
  const halted = [0, 1, 2].filter((i) => arrive[i] <= m.salvo && enter[i] > m.salvo);
  const hitF = present.length + (halted.length ? 1 : 0);
  const nE = Math.round(clamp(m.enemyBase - m.enemySlope * T2, 1, m.enemy));
  const downFT = Array.from({ length: hitF }, (_, n) => +(m.salvo + n * m.hitGap).toFixed(3));
  const downET = Array.from({ length: nE }, (_, n) => +(T2 + m.enemyLag + n * m.enemyGap).toFixed(3));
  const end = Math.max(...done, ...downET) + 0.4;
  return { mode: "pass", k, start, lane, arrive, enter, halt, pp, bhl, done, T2, present, halted, hitF, nE, downFT, downET, end,
    maxHalt: Math.max(...halt), duration: Math.max(...done) };
}

// ---- relief in place ----
// k platoons relieved at once: 1 sequential, 3 simultaneous, 2 the model's own in-between (not a named
// variation). With k=1 the next platoon moves when the previous incoming platoon is in position.
export function reliefPlan(k, m = MODEL) {
  const step = m.move + m.exchange;
  const start = k === 1 ? [0, step, 2 * step] : k === 2 ? [0, 0, step] : [0, 0, 0];
  const inPos = start.map((s) => s + m.move);          // incoming arrives; both are in the position
  const ready = start.map((s) => s + step);            // exchange done: the outgoing platoon leaves
  const gone = ready.map((r) => r + m.back);
  const T2 = [...ready].sort((a, b) => a - b)[1];      // a majority of the incoming force in place
  const atOnce = (t) => [0, 1, 2].filter((i) => t >= start[i] && t < ready[i]).length;
  let peak = 0;
  for (let t = 0; t <= Math.max(...gone); t += 0.25) peak = Math.max(peak, atOnce(t));
  const detected = peak >= m.detectAt;
  const mixed = [0, 1, 2].filter((i) => inPos[i] <= m.reliefSalvo && ready[i] > m.reliefSalvo).length;
  const hitF = detected ? 2 * mixed - 1 : 1;
  const nE = detected ? 2 : 1;
  const downFT = Array.from({ length: hitF }, (_, n) => +(m.reliefSalvo + n * 0.3).toFixed(3));
  const downET = Array.from({ length: nE }, (_, n) => +(m.reliefSalvo + 1 + n * 0.6).toFixed(3));
  const end = Math.max(...gone, ...downET) + 0.4;
  return { mode: "relief", k, start, inPos, ready, gone, T2, peak, detected, mixed, hitF, nE, downFT, downET, end, duration: Math.max(...gone) };
}

export const planOf = (cfg, m = MODEL) => (cfg.mode === "relief" ? reliefPlan(snapK(cfg.k), m) : passPlan(snapK(cfg.k), m));

// Where platoon i is at figure time t: the plan's own timeline. sigma runs 0 (assembly area) to 1.
// Passage:  0 -> sCP (contact point) -> sBHL -> 1 (assault position). Relief: incoming 0 -> 1 (position);
// outgoing 1 -> 0 (rear), returned as .out.
export const SIG = { cp: 0.30, bhl: 0.78 };
function passPlatoon(p, i, t, m) {
  const s = p.start[i], a = p.arrive[i], e = p.enter[i], b = p.bhl[i], d = p.done[i];
  let sigma, ph;
  if (t < s) { sigma = 0; ph = "wait"; }
  else if (t < a) { sigma = SIG.cp * (t - s) / m.run; ph = "up"; }
  else if (t < e) { sigma = SIG.cp; ph = "halt"; }
  else if (t < b) { sigma = SIG.cp + (SIG.bhl - SIG.cp) * (t - e) / m.lane; ph = "lane"; }
  else if (t < d) { sigma = SIG.bhl + (1 - SIG.bhl) * (t - b) / m.onward; ph = "on"; }
  else { sigma = 1; ph = "set"; }
  return { sigma, ph };
}
function reliefPlatoon(p, i, t, m) {
  const s = p.start[i];
  let inS, outS, ph;
  if (t < s) { inS = 0; outS = 1; ph = "wait"; }
  else if (t < p.inPos[i]) { inS = (t - s) / m.move; outS = 1; ph = "in"; }
  else if (t < p.ready[i]) { inS = 1; outS = 1; ph = "swap"; }
  else if (t < p.gone[i]) { inS = 1; outS = 1 - (t - p.ready[i]) / m.back; ph = "out"; }
  else { inS = 1; outS = 0; ph = "done"; }
  return { sigma: inS, out: outS, ph };
}

export function stateAt(cfg, t, released = true, m = MODEL) {
  const mode = cfg.mode === "relief" ? "relief" : "pass";
  const k = snapK(cfg.k);
  const p = planOf({ mode, k }, m);
  const tt = released ? Math.max(0, t) : 0;
  const pl = [0, 1, 2].map((i) => (mode === "pass" ? passPlatoon(p, i, tt, m) : reliefPlatoon(p, i, tt, m)));
  const downFT = released ? p.downFT.filter((x) => tt >= x) : [];
  const downET = released ? p.downET.filter((x) => tt >= x) : [];
  let through, passed, salvo;
  if (mode === "pass") {
    through = [0, 1, 2].filter((i) => released && tt >= p.pp[i]).length;
    passed = released && tt >= p.T2;
    salvo = released && tt >= m.salvo && tt < m.salvo + 1.2;
  } else {
    through = [0, 1, 2].filter((i) => released && tt >= p.ready[i]).length;
    passed = released && tt >= p.T2;
    salvo = released && p.detected && tt >= m.reliefSalvo && tt < m.reliefSalvo + 1.2;
  }
  const haltedNow = mode === "pass" && pl.some((x) => x.ph === "halt");
  const finished = released && tt >= p.end - 1e-9;
  const done = released && tt >= p.end + m.hold;
  const moving = mode === "relief" ? [0, 1, 2].filter((i) => released && pl[i].ph !== "wait" && pl[i].ph !== "done").length : 0;
  return {
    cfg: { mode, k }, mode, k, t: tt, released, plan: p, pl, through, passed, salvo, haltedNow, finished, done,
    downFT, downET, downF: downFT.length, downE: downET.length, end: p.end,
    // who holds responsibility for the ground: the stationary (outgoing) unit until control passes
    holds: passed ? "passing" : "stationary",
    moving,
  };
}
export const finalState = (cfg, m = MODEL) => stateAt(cfg, planOf(cfg, m).end, true, m);

export function phaseWord(s) {
  if (!s.released) return "Ready";
  if (s.finished) return "Complete";
  if (s.mode === "pass") {
    if (s.passed) return "Handed over";
    if (s.haltedNow) return "Halted";
    if (s.pl.some((x) => x.ph === "lane")) return "In lanes";
    return "Moving up";
  }
  if (s.passed) return "Handed over";
  if (s.salvo || (s.plan.detected && s.t >= MODEL.reliefSalvo)) return "Detected";
  if (s.pl.some((x) => x.ph === "out")) return "Withdrawing";
  if (s.pl.some((x) => x.ph === "swap")) return "Exchange";
  return "Moving in";
}
export function readoutMachine(s) {
  if (!s.released) return s.mode === "pass" ? `Ready · ${s.k} together · 2 lanes` : `Ready · ${s.k} at once · ${s.k === 1 ? "sequential" : s.k === 3 ? "simultaneous" : "two at once"}`;
  const noun = s.mode === "pass" ? "through" : "in";
  return `${phaseWord(s)} · ${s.through} of 3 ${noun} · ${s.downF} vs ${s.downE} down`;
}
export const readoutField = readoutMachine;
