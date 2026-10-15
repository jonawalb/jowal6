// The clearing model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so the figure, the
// readout and the tests all run this one file.
//
// DOCTRINE is only the vocabulary: the drill names (ATP 3-21.8, 11 Jan 2024 incl. C1, para E-2, p. E-2),
// "clear" as a tactical mission task (FM 3-90, 1 May 2023, para B-16). The step-by-step sequence below
// (a lead team clears the next point while the other team secures the last one) is THIS FIGURE'S OWN
// teaching model, not doctrine. Every time, rate and loss is NOTIONAL and labelled so on the page.
//
// A run is a closed-form function of figure time t and three choices (cfg):
//   support  the support element suppresses and isolates the entry point
//   alt      the two fire teams alternate the lead (the one that cleared passes the other)
//   secure   the team left behind holds and marks each cleared point
// FOUR points are cleared in order (corners and junctions of a trench, or rooms of a building).
// A point is set only after the one before it: the key advances only when the previous pin is set.

export const POINTS = 4;
export const MEN = 9; // squad leader + two fire teams of four drawn (ATP 3-21.8 para 1-9, 1-11)
export const OPT = ["Support fires", "Teams alternate", "Secure behind"];

export const MODEL = {
  entry: 1.5,       // s: the squad is at the entry point and the first team goes in (all options)
  noSupport: 1.0,   // s: extra delay at the entry when the entry point is not suppressed
  dur: 3.0,         // s: one point cleared by a fresh lead team
  wear: 0.3,        // extra share of dur per point when the same team keeps the lead (no alternate)
  back: 0.9,        // s after a point is set when an enemy re-enters it, if nobody holds it
  reclear: 1.8,     // s to deal with that enemy
  redo: 2.0,        // s the clearing is held up by it
  hold: 2.6,        // s an outcome is held before the run ends
};

export const allOn = () => [true, true, true];
export const noneOn = () => [false, false, false];
export const count = (cfg) => cfg.filter(Boolean).length;
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const ease = (t) => t * t * (3 - 2 * t);

// start time of clearing point i and the time it is set
export function timesOf(cfg, m = MODEL) {
  const [support, alt, secure] = cfg;
  const t0 = m.entry + (support ? 0 : m.noSupport);
  const start = [], set = [];
  let t = t0;
  for (let i = 0; i < POINTS; i++) {
    if (i === 2 && !secure) t += m.redo;
    start.push(t);
    t += m.dur * (alt ? 1 : 1 + m.wear * i);
    set.push(+t.toFixed(3));
  }
  return { t0, start, set };
}
export const endOf = (cfg, m = MODEL) => timesOf(cfg, m).set[POINTS - 1];

// when the model puts a friendly or an enemy soldier out of action
export function downTimes(cfg, m = MODEL) {
  const [support, alt, secure] = cfg;
  const { t0, set } = timesOf(cfg, m);
  const f = [+(set[2] - 1.2).toFixed(3)];                 // contact at the third point, even when all is done
  if (!support) f.push(+(t0 - 0.7).toFixed(3));           // fire into the entry point
  if (!alt) f.push(+(set[3] - 1.0).toFixed(3));           // the lead team is worn
  if (!secure) f.push(+(set[1] + 1.5).toFixed(3));        // struck from behind
  f.sort((a, b) => a - b);
  const e = set.map((s) => +(s - 0.7).toFixed(3));
  if (!secure) e.push(+(set[1] + m.back + m.reclear).toFixed(3)); // the enemy who re-entered, dealt with
  e.sort((a, b) => a - b);
  return { f, e };
}

// State at figure time t for options cfg. released = false: waiting at the start.
export function stateAt(cfg, t, released = true, m = MODEL) {
  const [support, alt, secure] = cfg;
  const tt = released ? Math.max(0, t) : 0;
  const { t0, start, set: T } = timesOf(cfg, m);
  const set = T.map((x) => released && tt >= x);
  const nSet = set.filter(Boolean).length;
  // reopened: with nobody holding point 2, an enemy is back in it for a moment
  const reopen = released && !secure && tt >= T[1] + m.back && tt < T[1] + m.back + m.reclear;
  // the enemy who re-entered, drawn between those times
  const extra = !secure && released && tt >= T[1] + m.back;
  // key position along the points: p = number set + share of the one being worked
  let p = 0;
  if (released) {
    p = nSet;
    if (nSet < POINTS) p += ease(clamp((tt - start[nSet]) / (T[nSet] - start[nSet])));
  }
  const dn = downTimes(cfg, m);
  const downFT = dn.f.filter((x) => released && tt >= x);
  const downET = dn.e.filter((x) => released && tt >= x);
  // who leads the point now being worked: with alternation the two teams swap each point
  const lead = alt ? Math.min(POINTS - 1, nSet) % 2 : 0;
  const wearOut = alt ? 0 : clamp(p / POINTS);
  const end = T[POINTS - 1];
  const done = released && tt >= end + m.hold;
  const cleared = released && tt >= end;
  return { t: tt, released, cfg, set, nSet, p, reopen, extra, downFT, downET, downF: downFT.length, downE: downET.length, lead, wear: wearOut, cleared, done, end, start, T, t0, support, alt, secure };
}

export function phaseWord(s, unit = "Point") {
  if (!s.released) return "Ready";
  if (s.cleared) return "Cleared";
  if (s.reopen) return "Enemy behind";
  if (s.t < s.t0) return "At the entry";
  return `${unit} ${Math.min(POINTS, s.nSet + 1)} of ${POINTS}`;
}
export const finalState = (cfg, m = MODEL) => stateAt(cfg, endOf(cfg, m), true, m);

export function readoutMachine(s) {
  if (!s.released) return `Ready · ${count(s.cfg)}/3 options · 0 down`;
  return `${phaseWord(s)} · ${s.nSet}/${POINTS} set · ${s.downF} down`;
}
export function readoutField(s, unit = "Point") {
  if (!s.released) return `Ready · ${count(s.cfg)}/3 options · 0 vs 0 down`;
  return `${phaseWord(s, unit)} · ${s.downF} vs ${s.downE} down`;
}
