// The final protective fires model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so the
// figure, the readout and the tests all run this one file.
//
// One enemy assault runs at a defended platoon position. x is the distance of the assault's leading
// line in front of the final protective line (FPL), in notional metres: positive out in front, 0 at
// the outer edge of the wire, negative inside the wire and the position. The defender calls the
// final protective fires (FPF) when the assault reaches the trigger distance (or by hand). From then
// on the mortars fire their FPF at the maximum rate until the rounds run out (ATP 3-21.8, para B-18:
// "fire is conducted at the maximum rate until the mortars are ordered to stop, or until ammunition is
// depleted") and the machine guns shift to grazing fire along the FPL (para A-51).
//
// Everything below is a NOTIONAL teaching model, stated as such on the page: the speeds, the number
// of rounds, the rate, how fast the assault is checked and the losses are not data. The only sourced
// number is the 60 m by 30 m FPF of a section of two 60-mm mortars (para B-18, Table B-1), used for
// the depth of the beaten zone.

export const MODEL = {
  start: 150,       // m out where the assault starts its run at the position
  speed: 30,        // m per second of figure time while advancing (time is compressed)
  wire: [0, -8],    // the protective wire belt: its outer edge is the FPL
  box: [2, 32],     // the FPF's beaten zone, 30 m deep (Table B-1, two 60-mm mortars), just in front of the wire
  posts: -34,       // the forward fighting positions
  wireSlow: 0.25,   // share of its speed the assault keeps while working through the wire
  pinned: 0.08,     // share of its speed it keeps under the FPF in the beaten zone or the wire
  rounds: 30,       // mortar rounds held for the FPF (notional)
  rate: 7.5,        // rounds per figure second at the maximum rate (notional): 4 s of fire
  checkRate: 0.45,  // how fast the FPF checks an assault inside it, per figure second (breaks at 1)
  retreat: 20,      // m per figure second when the assault breaks and falls back
  range: 150,       // distance inside which the defender's direct fire reaches the assault
  enemy: 19,        // the assault element: two rifle squads and a leader
  friendly: 22,     // the defenders on the drawn front: two rifle squads, two MG teams, PL and RTO
  hold: 2.6,        // figure seconds an outcome is held before the run ends
  trigger: [0, 150],  // the trigger slider's range, m
};

// A fresh run. trigger: distance at which the FPF is called (null = only by hand).
export function newRun(trigger, m = MODEL) {
  return { t: 0, x: m.start, trigger, called: false, calledAt: null, calledT: null, rounds: m.rounds, check: 0,
    phase: "advancing", E: 0, F: 0, downE: [], downF: 0, end: 0, done: false };
}

const zone = (x, m) => x <= m.box[1] && x >= m.wire[1];

// One step of the run, dt in figure seconds. call = true calls the FPF now (by hand).
export function step(s, dt, m = MODEL, call = false) {
  if (s.done) return s;
  s.t += dt;
  if (!s.called && (call || (s.trigger !== null && s.x <= s.trigger && s.phase === "advancing"))) { s.called = true; s.calledAt = s.x; s.calledT = s.t; }
  const firing = s.called && s.rounds > 0;
  if (firing) s.rounds = Math.max(0, s.rounds - m.rate * dt);
  let e = 0, f = 0;
  if (s.phase === "advancing") {
    const inWire = s.x <= m.wire[0] && s.x > m.wire[1];
    const held = firing && zone(s.x, m);
    const v = m.speed * (held ? m.pinned : inWire ? m.wireSlow : 1);
    s.x -= v * dt;
    if (held) { s.check += m.checkRate * dt; e += 2.2 * dt; }
    else if (s.x < m.range) e += (inWire ? 0.45 : 0.16) * dt;
    if (s.x < m.range) f += 0.05 * dt;
    if (s.check >= 1) { s.phase = "breaking"; s.end = s.t; }
    else if (s.x <= m.posts) { s.x = m.posts; s.phase = "through"; s.end = s.t; }
  } else if (s.phase === "breaking") {
    s.x += m.retreat * dt;
    if (s.x < m.range) e += 0.22 * dt;
  } else if (s.phase === "through") {
    f += 2 * dt; e += 0.4 * dt;
  }
  if (s.phase !== "advancing" && s.t - s.end >= m.hold) s.done = true;
  // men down: whole numbers; each enemy casualty is left where the line was when he fell
  const before = Math.floor(s.E);
  s.E = Math.min(m.enemy - 4, s.E + e);
  s.F = Math.min(10, s.F + f);
  for (let k = before + 1; k <= Math.floor(s.E); k++) s.downE.push(+s.x.toFixed(1));
  s.downF = Math.floor(s.F);
  return s;
}

// Run a whole assault at a fixed step (tests, and the still frame under reduced motion).
export function simulate(trigger, until = Infinity, m = MODEL, dt = 1 / 60) {
  const s = newRun(trigger, m);
  while (!s.done && s.t < until - 1e-9) step(s, dt, m);
  return s;
}

// What the readout calls the moment.
export function phaseWord(s, m = MODEL) {
  if (s.phase === "breaking") return "Assault breaks";
  if (s.phase === "through") return "Through the wire";
  if (!s.called) return "Advancing";
  if (s.rounds <= 0) return "FPF spent";
  return zone(s.x, m) ? "Checked" : "FPF called";
}

export const roundsLeft = (s) => Math.max(0, Math.ceil(s.rounds - 1e-6));
export const enemyDown = (s) => s.downE.length;
export const friendlyDown = (s) => Math.max(1, s.downF);

// The two readouts: machine (distance and rounds) and battlefield (rounds and men down). Each fits
// the card's corner (under 45 characters).
export function readoutMachine(s, m = MODEL) {
  const where = s.phase === "through" ? "" : s.x > 0.5 ? ` · ${Math.round(s.x)} m out` : s.x > m.wire[1] ? " · at the wire" : " · in the wire";
  return `${phaseWord(s, m)}${where} · FPF ${roundsLeft(s)} rds`;
}
export function readoutField(s, m = MODEL) {
  return `${phaseWord(s, m)} · FPF ${roundsLeft(s)} rds · ${friendlyDown(s)} vs ${enemyDown(s)} down`;
}
