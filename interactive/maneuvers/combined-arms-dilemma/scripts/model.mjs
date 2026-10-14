// The two-key lock model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine. A single guard pad (the defender's shield) swings between
// two key plugs. Its position g runs from -1 (pressed on plug A) to +1 (pressed on plug B).
// A plug the pad presses cannot turn; a free plug with its key in turns 90 degrees and
// its cam draws the shared bolt. The geometry, not a curve fit, makes the dilemma:
// the pad is narrower than the gap between the plugs, so it can press only one at a time.

export const MODEL = {
  engage: 0.6,       // |g| at which the pad first touches a plug collar
  full: 1.0,         // |g| at which it presses fully
  holdAt: 0.5,       // engagement share above which the plug is held
  turnRate: 180,     // degrees per second a free key turns (eased)
  guardRate: 1.4,    // units of g per second the guard swings (plug to plug is 2 units)
};

// How hard the pad presses plug A (side -1) or plug B (side +1): 0..1.
export function press(g, side, m = MODEL) {
  const x = (g * side - m.engage) / (m.full - m.engage);
  return Math.max(0, Math.min(1, x));
}

export const held = (g, side, m = MODEL) => press(g, side, m) > m.holdAt;

// Target turn of each key in degrees: 90 when its key is in and its plug is free.
export function keyTarget(g, side, inserted, m = MODEL) {
  return inserted && !held(g, side, m) ? 90 : 0;
}

// Bolt drawn back, 0..1: either cam can draw it (the cams act in parallel).
export function boltOpen(turnA, turnB) {
  return Math.max(turnA, turnB, 0) / 90;
}

// Where a defender facing only the keys in the lock would put its shield:
// on the one key if there is one; with two it cannot cover both, so it stays where it is.
export function bestGuard(insertedA, insertedB, g) {
  if (insertedA && !insertedB) return -1;
  if (insertedB && !insertedA) return 1;
  return g;
}

// Settled outcome for a shield position: does the lock open?
export const opens = (g, insertedA, insertedB, m = MODEL) =>
  keyTarget(g, -1, insertedA, m) > 0 || keyTarget(g, 1, insertedB, m) > 0;

// One eased step toward a target angle, rate-limited.
export function turnToward(a, want, dt, m = MODEL) {
  const gap = want - a;
  const eased = gap * (1 - Math.exp(-dt / 0.18));
  const cap = m.turnRate * dt;
  return a + Math.max(-cap, Math.min(cap, eased));
}

// Casualties (notional, men down in the drawn moment), for the Battlefield view and the readout.
// The fire team is four men, the enemy a rifleman pair. Success is not free: the team has already
// lost one man (the rifleman) in the first exchange, whatever it does next. If the lock holds with
// one key (the enemy covers the only arm and waits it out), the fight drags on and costs the team a
// second man. Once a key turns (the bolt at least half drawn) one of the enemy pair is down.
export const TEAM = { blue: 4, red: 2 };
export function casualties(f, keysIn) {
  return { blue: keysIn === 1 && f <= 0.01 ? 2 : 1, red: f >= 0.5 ? 1 : 0 };
}
export const downText = (c) => `${c.blue} vs ${c.red} down`;
