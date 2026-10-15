// The troop leading procedures model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so
// the figure, the readout and the tests all run this one file.
//
// Doctrine supplies the structure: eight steps (ATP 3-21.8 para 2-16) and the one-third / two-thirds
// guide to time (FM 5-0 para 7-7; ATP 3-21.8 paras 2-19 and 2-24). Everything numeric below is
// NOTIONAL (a teaching shape, labelled so on the page): the twelve hours, how long the leader's own
// work and the squads' three tasks take, and the casualties.

export const MODEL = {
  total: 12,               // notional hours from receiving the mission to the line of departure
  range: [2, 8],           // hours the leader keeps: the slider
  start: 4,                // one third of the total
  leaderNeed: 3,           // notional hours the leader needs to take steps 1 to 7 without abbreviating
  tasks: [                 // the squads' tasks, done in this order in the time they are given
    { id: "plan", len: 2 },
    { id: "check", len: 2 },
    { id: "rehearse", len: 3 },
  ],
  after: 2,                // display hours after the line of departure (the assault)
  weights: [0.07, 0.07, 0.36, 0.07, 0.21, 0.07, 0.15],   // steps 1 to 7 as shares of the leader's block
  enemy: 6,                // defenders on the objective (three two-man positions)
};
// The eight steps, as ATP 3-21.8 para 2-16 lists them.
export const STEPS = [
  "Receive the mission",
  "Issue a WARNORD",
  "Make a tentative plan",
  "Initiate movement",
  "Conduct reconnaissance",
  "Complete the plan",
  "Issue the order",
  "Supervise and refine",
];
const clip = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const END = MODEL.total + MODEL.after;
export const subHours = (split, m = MODEL) => m.total - split;
export const oneThird = (m = MODEL) => m.total / 3;
export const keptTooMuch = (split, m = MODEL) => split > oneThird(m);
export const planDone = (split, m = MODEL) => Math.min(1, split / m.leaderNeed);
// Share of each squad task the time given to the squads covers (tasks run in order).
export function taskFrac(split, m = MODEL) {
  const sub = subHours(split, m);
  let at = 0;
  return m.tasks.map((t) => { const f = clip((sub - at) / t.len, 0, 1); at += t.len; return f; });
}
export const rehearsed = (split, m = MODEL) => taskFrac(split, m)[2];
// Share of the squads' whole list the time covers (the dial).
export const covered = (split, m = MODEL) => Math.min(1, subHours(split, m) / m.tasks.reduce((a, t) => a + t.len, 0));

// Boundaries of steps 1 to 7 inside the leader's block, in hours.
export function bounds(split, m = MODEL) {
  let c = 0;
  return m.weights.map((w) => (c += w * split));
}
// 0 pending, 1 active, 2 done, for each of the eight steps at a clock time.
export function stepStates(clock, split, m = MODEL) {
  const b = bounds(split, m);
  const out = b.map((end, i) => { const start = i ? b[i - 1] : 0; return clock >= end ? 2 : clock >= start ? 1 : 0; });
  // step 8 begins when the order has been issued (ATP 3-21.8 para 2-114) and runs to the end
  out.push(clock >= END ? 2 : clock >= split ? 1 : 0);
  return out;
}
export const activeStep = (clock, split, m = MODEL) => { const s = stepStates(clock, split, m); return s.lastIndexOf(1) < 0 ? -1 : s.lastIndexOf(1); };

// Notional casualties at the objective, friendly and enemy (final counts).
export function outcome(split, m = MODEL) {
  const r = rehearsed(split, m), p = planDone(split, m);
  const friendly = 1 + Math.round(4 * (1 - r)) + Math.round(2 * (1 - p));
  const enemy = m.enemy - Math.round(3 * (1 - r)) - Math.round(1 * (1 - p));
  return { sub: subHours(split, m), plan: p, rehearsed: r, covered: covered(split, m), friendly, enemy, kept: keptTooMuch(split, m) };
}
// Assault progress 0..1 from the clock (after the line of departure).
export const assaultAt = (clock, m = MODEL) => clip((clock - m.total) / m.after, 0, 1);
// Casualties fall one at a time as the assault goes in (a = assault progress).
export const FALL_F = (k) => 0.5 + 0.08 * k;
export const FALL_E = (k) => 0.4 + 0.07 * k;
export const fallenF = (out, a) => { let n = 0; while (n < out.friendly && a >= FALL_F(n)) n++; return n; };
export const fallenE = (out, a) => { let n = 0; while (n < out.enemy && a >= FALL_E(n)) n++; return n; };
// How many of the squads' three tasks are finished at this clock time.
export function tasksDone(clock, split, m = MODEL) {
  const f = taskFrac(split, m);
  let at = split, n = 0;
  m.tasks.forEach((t, i) => { at += t.len; if (f[i] >= 1 && clock >= at) n++; });
  return n;
}

export function readout(split, clock, m = MODEL) {
  const head = `Leader ${Math.round(split)} h · squads ${m.total - Math.round(split)} h`;
  if (clock >= m.total) {
    const o = outcome(Math.round(split), m), a = assaultAt(clock, m);
    return `${head} · ${fallenF(o, a)} vs ${fallenE(o, a)} down`;
  }
  return `${head} · ${tasksDone(clock, Math.round(split), m)}/3 done`;
}
