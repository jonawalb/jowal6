// The OODA tempo model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine. Each side runs one loop per turn of its wheel, through four
// stages of equal length (observe, orient, decide, act). A loop begins when the side
// observes (phase 0) and its action lands when the loop ends (phase 1).
//
// "Stale" rule, in this model: a side's action is stale when the other side ran one
// whole loop of its own, observing after this loop began and acting before this
// loop's action landed. That is the other side getting inside this side's loop.

export const MODEL = {
  hourSec: 0.6,        // seconds of animation per notional hour of cycle time
  range: [2, 10],      // cycle times the levers can set, notional hours
  start: { blue: 4, red: 6 },
  phase0: { blue: 0, red: 0.37 }, // starting phases, offset so the two loops never cross in step
  window: 8,           // how many recent actions each tally rack holds
  stages: ["Observe", "Orient", "Decide", "Act"],
};

export const SIDES = ["blue", "red"];
const other = (side) => (side === "blue" ? "red" : "blue");

// Long-run share of `own`'s actions that are stale when both tempos hold steady.
// A window of length own contains whole loops of length theirs: at least two loop
// boundaries fall inside it with probability clamp(own / theirs - 1, 0, 1).
export function staleShare(own, theirs) {
  return Math.min(1, Math.max(0, own / theirs - 1));
}

// Loops gained per hour by the faster side.
export const lapRate = (blue, red) => 1 / blue - 1 / red;

export function makeSim(m = MODEL) {
  return {
    c: { ...m.phase0 },              // loops run, as a continuous count (whole part = loops done)
    since: { blue: 0, red: 0 },      // the other side's loop boundaries since this side's last one
    log: { blue: [], red: [] },      // recent actions, true = stale
    acts: { blue: 0, red: 0 },
    stale: { blue: 0, red: 0 },
  };
}

// Advance by dt notional hours with cycle times T = { blue, red } (hours per loop).
// Returns the actions that landed, in time order: [{ side, stale }].
export function advance(sim, dt, T, m = MODEL) {
  const events = [];
  for (const side of SIDES) {
    const before = sim.c[side];
    const after = before + dt / T[side];
    for (let n = Math.floor(before) + 1; n <= after; n++) events.push({ side, at: (n - before) * T[side] });
    sim.c[side] = after;
  }
  events.sort((a, b) => a.at - b.at);
  const out = [];
  for (const { side } of events) {
    const stale = sim.since[side] >= 2;
    sim.since[side] = 0;
    sim.since[other(side)] += 1;
    sim.log[side].push(stale);
    if (sim.log[side].length > m.window) sim.log[side].shift();
    sim.acts[side] += 1;
    if (stale) sim.stale[side] += 1;
    out.push({ side, stale });
  }
  return out;
}

// Phase 0..1 within the current loop.
export const phaseOf = (sim, side) => sim.c[side] - Math.floor(sim.c[side]);

// Which stage a phase falls in (0 observe, 1 orient, 2 decide, 3 act).
export const stageOf = (phase) => Math.min(3, Math.floor(phase * 4));

const hours = (h) => (Number.isInteger(h) ? String(h) : h.toFixed(1)) + " h";

// The live readout: both tempos, then the tally of whichever side is slower (Red on a tie).
export function readoutOf(sim, T) {
  const slow = T.blue > T.red ? "blue" : "red";
  const log = sim.log[slow];
  const name = slow === "blue" ? "Blue" : "Red";
  const tally = log.length ? `${name} stale ${log.filter(Boolean).length} of ${log.length}` : `${name} acts pending`;
  return `Blue ${hours(T.blue)} · Red ${hours(T.red)} · ${tally}`;
}

// The still readout for reduced motion: long-run shares instead of a live tally.
export function stillReadoutOf(T) {
  const slow = T.blue > T.red ? "blue" : "red";
  const share = slow === "blue" ? staleShare(T.blue, T.red) : staleShare(T.red, T.blue);
  return `Blue ${hours(T.blue)} · Red ${hours(T.red)} · ${slow === "blue" ? "Blue" : "Red"} stale ${Math.round(share * 100)}%`;
}

// ---- Battlefield view (added with the terrain view; the bench above is unchanged) ----
// Notional. The battlefield runs the same loops at half the bench's speed (FIELD.rate) so the moves
// can be followed; stale shares depend only on the ratio of the tempos, so the tally is unchanged.
// Casualties, men down in a notional day (FIELD.day hours) of this fight: each side loses half a man
// for every fresh action the other side lands (a stale action falls on an empty position and costs
// nothing) plus 0.15 of a man for every move it makes itself (moving exposes it), so tempo is not free.
export const FIELD = { rate: 0.5, day: 24, perHit: 0.5, perMove: 0.15 };

export function casualties(T, f = FIELD) {
  const fresh = (own, theirs) => (f.day / own) * (1 - staleShare(own, theirs));
  const down = (side) => {
    const o = other(side);
    return Math.round(f.perHit * fresh(T[o], T[side]) + f.perMove * (f.day / T[side]));
  };
  return { blue: down("blue"), red: down("red") };
}

// The Battlefield view's readout: the slower side's tally (as on the bench), then Blue vs Red men down.
// The tempos stay on the sliders, so the line fits the card corner (under 45 characters).
export function fieldReadoutOf(sim, T) {
  const c = casualties(T);
  return `${readoutOf(sim, T).split(" · ").slice(2).join(" · ")} · ${c.blue} vs ${c.red} down`;
}
export function fieldStillReadoutOf(T) {
  const c = casualties(T);
  return `${stillReadoutOf(T).split(" · ").slice(2).join(" · ")} · ${c.blue} vs ${c.red} down`;
}
