// The engagement area development model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so
// the figure, the readout and the tests all run this one file.
//
// The seven steps and their order are doctrine (ATP 3-21.10, Infantry Rifle Company, 1 June 2026,
// para 3-61, p. 86): the names below are the manual's, word for word, abbreviations included
// (COA = course of action, EA = engagement area).
//
// Everything else is a NOTIONAL teaching model, stated as such on the page: one enemy column comes
// down an avenue of approach toward a company defense. x is the distance of its lead element in front
// of the defenders' battle positions, in notional metres. The engagement area is the stretch between
// the trigger line and the near edge (the standoff). Each step that is built multiplies how fast the
// defenders kill; each step skipped takes something away. None of the speeds, rates or losses is data.

export const STEPS = [
  { n: 1, name: "Identify likely enemy avenues of approach", para: "3-61", page: "86" },
  { n: 2, name: "Identify the most likely enemy COA", para: "3-61", page: "86" },
  { n: 3, name: "Determine where to kill the enemy", para: "3-61", page: "86" },
  { n: 4, name: "Position subordinate forces and weapons systems", para: "3-61", page: "86" },
  { n: 5, name: "Plan and integrate obstacles", para: "3-61", page: "86" },
  { n: 6, name: "Plan and integrate fires", para: "3-61", page: "86" },
  { n: 7, name: "Rehearse the execution of operations within the EA", para: "3-61", page: "86" },
];

export const MODEL = {
  start: 400,        // m: where the column's lead element starts, out on the avenue
  trigger: 290,      // m: the trigger line; fires open when the lead crosses it
  standoff: 60,      // m: the EA's near edge (notional)
  belt: [100, 150],  // m: the obstacle belt across the avenue
  speed: 30,         // m per figure second moving freely (time is compressed)
  beltSpeed: 8,      // m per figure second working through the belt (notional)
  enemy: 12,         // the column: six vehicles and six dismounts
  rate: 0.9,         // kills per figure second with the EA built (notional)
  fires: 1.5,        // multiplier with the fires planned and integrated (step 6)
  wrongPlace: 0.2,   // multiplier when the EA is built on the wrong avenue (step 1 or 2 missing)
  noMass: 0.6,       // multiplier when no TRPs or trigger line mass the fires (step 3 missing)
  noPosition: 0.55,  // multiplier when weapons are not placed to cover the kill zone (step 4 missing)
  noRehearse: 0.6,   // multiplier when the actions were not rehearsed (step 7 missing)
  friendly: 33,      // the defenders drawn: three rifle platoons' positions, MGs, leaders
  hold: 2.6,         // figure seconds an outcome is held before the run ends
};

export const allSteps = () => [true, true, true, true, true, true, true];
export const noSteps = () => [false, false, false, false, false, false, false];
export const stepCount = (steps) => steps.filter(Boolean).length;
// The EA is built on the avenue the enemy really takes only when steps 1 and 2 are both done.
export const rightAvenue = (steps) => !!(steps[0] && steps[1]);

export function newRun(steps = allSteps(), m = MODEL) {
  return { t: 0, x: m.start, steps: steps.slice(), released: false, phase: "waiting", E: 0, F: 0, downE: [], downF: 0, end: 0, done: false };
}

export const inEA = (x, m = MODEL) => x <= m.trigger && x >= m.standoff;
export const inBelt = (x, m = MODEL) => x <= m.belt[1] && x >= m.belt[0];

// The kill rate in the EA for a set of steps (kills per figure second).
export function killRate(steps, m = MODEL) {
  let r = m.rate;
  if (!rightAvenue(steps)) r *= m.wrongPlace;
  if (!steps[2]) r *= m.noMass;
  if (!steps[3]) r *= m.noPosition;
  if (steps[5]) r *= m.fires;
  if (!steps[6]) r *= m.noRehearse;
  return r;
}

// One step of the run, dt in figure seconds. release = true lets the enemy go.
export function step(s, dt, m = MODEL, release = false) {
  if (s.done) return s;
  if (!s.released) {
    if (!release) return s;
    s.released = true; s.phase = "advancing";
  }
  s.t += dt;
  let e = 0, f = 0;
  const alive = m.enemy - s.downE.length;
  if (s.phase === "advancing") {
    const slow = s.steps[4] && inBelt(s.x, m);
    s.x -= (slow ? m.beltSpeed : m.speed) * dt;
    if (inEA(s.x, m)) {
      e += killRate(s.steps, m) * dt;
      f += 0.035 * (alive / m.enemy) * (s.steps[6] ? 1 : 2.2) * dt;
    }
    if (s.downE.length + e >= m.enemy - 1e-9 || s.E + e >= m.enemy) { s.phase = "destroyed"; s.end = s.t; }
    else if (s.x <= m.standoff) { s.x = m.standoff; s.phase = "through"; s.end = s.t; }
  } else if (s.phase === "through") {
    f += 4.5 * (alive / m.enemy) * dt;
    e += 0.25 * dt;
  }
  if (s.phase !== "advancing" && s.t - s.end >= m.hold) s.done = true;
  const before = Math.floor(s.E + 1e-9);
  s.E = Math.min(m.enemy, s.E + e);
  if (s.phase === "destroyed") s.E = m.enemy;
  s.F = Math.min(12, s.F + f);
  for (let k = before + 1; k <= Math.floor(s.E + 1e-9); k++) s.downE.push(+s.x.toFixed(1));
  s.downF = Math.floor(s.F);
  return s;
}

// Run a whole column at a fixed step (tests, and the still frame under reduced motion).
export function simulate(steps = allSteps(), until = Infinity, m = MODEL, dt = 1 / 60) {
  const s = newRun(steps, m);
  step(s, 0, m, true);
  while (!s.done && s.t < until - 1e-9) step(s, dt, m);
  return s;
}

export function phaseWord(s, m = MODEL) {
  if (!s.released) return "Building the EA";
  if (s.phase === "destroyed") return "Destroyed in the EA";
  if (s.phase === "through") return "Through the EA";
  return inEA(s.x, m) ? "In the EA" : "Advancing";
}
export const enemyDown = (s) => s.downE.length;
export const friendlyDown = (s) => (s.released ? Math.max(1, s.downF) : 0);

export function readoutMachine(s, m = MODEL) {
  return `${phaseWord(s, m)} · ${stepCount(s.steps)}/7 steps · ${enemyDown(s)} down`;
}
export function readoutField(s, m = MODEL) {
  return `${phaseWord(s, m)} · ${stepCount(s.steps)}/7 · ${friendlyDown(s)} vs ${enemyDown(s)} down`;
}
