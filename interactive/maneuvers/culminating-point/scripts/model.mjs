// The culmination model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine: the attacker's combat power, measured against what it
// needs to keep advancing against this defense, falls in a straight line with its
// distance from its supply base. Where the two meet, the force culminates. The
// slope and the starting ratio are teaching numbers, stated as such on the page.

export const MODEL = {
  p0: 2.0,          // power ratio at the base: twice what the advance needs
  need: 1.0,        // the defender's line: the ratio below which the attack cannot go on
  loss: 1 / 120,    // ratio lost per km of distance from the base (1.0 over 120 km)
  vmax: 34,         // km per second of figure time at full margin (falling back runs at twice this)
  soft: 0.3,        // margin over which the advance slows to a crawl
  vmin: 0.1,        // the crawl, as a share of vmax, just before the stall
  // the bench, in km along the rail (1 world unit = 1 km, notional)
  track: {
    start: -59,     // carriage front at the start line
    objective: 108, // carriage front where its prow meets the objective
    sledRear: -129, // supply sled (the base) at the rear depot
    sledFwd: -60,   // supply sled moved to the forward position
    span: 50,       // hook-to-hook length that is carriage and sled, not tether
    slack: 20,      // tether length at zero distance
  },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Distance from the base, km: tether length beyond its slack.
export const distance = (x, sled, m = MODEL) => x - sled - m.track.span - m.track.slack;

// Combat power as a ratio of what the advance needs, at distance d km from the base.
export const power = (d, m = MODEL) => m.p0 - Math.max(0, d) * m.loss;

// The culminating distance, km from the base: where power meets the defender's line.
export const reach = (m = MODEL) => (m.p0 - m.need) / m.loss;

// Furthest the carriage front can go with the sled at `sled`: the culminating point
// or the objective, whichever comes first.
export const limitOf = (sled, m = MODEL) =>
  Math.min(m.track.objective, sled + m.track.span + m.track.slack + reach(m));

// Speed of advance at power p: full speed with a wide margin, slowing to a crawl near the line.
export const speedAt = (p, m = MODEL) =>
  p <= m.need ? 0 : m.vmax * clamp((p - m.need) / m.soft, m.vmin, 1);

// One step of the carriage toward an ordered position, never past its limit.
export function advance(x, target, sled, dt, m = MODEL) {
  const lo = sled + m.track.span + m.track.slack;
  const goal = clamp(target, lo, limitOf(sled, m));
  if (goal < x) return Math.max(goal, x - 2 * m.vmax * dt);      // falling back is never limited
  const v = speedAt(power(distance(x, sled, m), m), m);
  const next = Math.min(goal, x + Math.max(v, m.vmax * m.vmin) * dt);
  return next;
}

// The base can only go forward behind the force: never closer than zero distance.
export const sledLimit = (x, m = MODEL) => x - m.track.span - m.track.slack;

// What the readout calls the state.
export function stateOf(x, target, sled, m = MODEL) {
  const lim = limitOf(sled, m);
  const atLimit = x >= lim - 0.5;
  if (atLimit && lim >= m.track.objective - 0.05) return "Objective reached";
  if (atLimit && target > x + 0.5) return "Culminated";
  if (Math.abs(target - x) < 0.5 || target < x) return target < x - 0.5 ? "Falling back" : "Holding";
  return "Advancing";
}

// Notional losses (added with the Battlefield view, owner rule 2026-10-13: success is not free).
// Attacker casualties per km advanced rise as its margin of power runs down: 0.12 per km with the
// full 2.0 : 1 margin, 0.62 per km at the defender's line. Measured over the advance from the start
// line, at the power halfway between where the advance began (relative to the current base) and now.
// The defender loses 0.15 per km the attacker gains, plus 18 when the objective falls.
export const LOSS = { base: 0.12, slope: 0.5, red: 0.15, redObj: 18, perVehicle: 12, perRedVehicle: 10 };
export const lossRate = (p, m = MODEL) => LOSS.base + LOSS.slope * (m.p0 - p) / (m.p0 - m.need);
export function losses(x, sled, m = MODEL) {
  const km = Math.max(0, x - m.track.start);
  const d0 = Math.max(0, distance(m.track.start, sled, m)), d1 = Math.max(0, distance(x, sled, m));
  const blue = Math.round(km * lossRate(power((d0 + d1) / 2, m), m));
  const red = Math.round(km * LOSS.red + (x >= m.track.objective - 0.05 ? LOSS.redObj : 0));
  return { blue, red };
}
