// The mobile-defense model. Pure: no DOM, no kit, no geometry. Inlined into the page
// by build.mjs, so the figure, the readout and the tests all run this one file.
// Any view (the bench machine now, a battlefield map later) reads the same state:
// runAt(t, split) returns normalized progress, not world coordinates.
//
// Notional, not doctrine. Doctrine (FM 3-90, 2023) gives the structure: a fixing force
// with the minimum combat power it needs, a striking force with the bulk, the enemy
// let into a penetration, fixed, then hit when the striking force's offensive power is
// greater than the targeted enemy force. Every number below is a teaching choice.

export const MODEL = {
  total: 100,        // defender's combat power, in arbitrary units
  enemy: 70,         // combat power of the enemy force that enters the penetration
  fires: 0.30,       // share of that power fires and obstacles strip off by the time it reaches the fixing stop
  holdRatio: 0.70,   // fixing force needed per unit of enemy power at the stop, to hold it (notional)
  split: [0.30, 0.80], // range of the striking-force share the control allows
  start: 0.58,       // striking share the page opens on
  // one run of the trap, seconds
  T: { advance: 1.9, settle: 0.45, strike: 0.4, hold: 0.95, reset: 1.1 },
  overrunTo: 1.8,    // how far past the stop (in pocket lengths) an unchecked enemy runs
};
MODEL.cycle = Object.values(MODEL.T).reduce((a, b) => a + b, 0);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);

// Striking and fixing force for a striking share s (0..1). Reserve, security and
// sustaining forces are left off the bench and stated as such on the page.
export const forces = (s, m = MODEL) => ({ strike: m.total * s, fix: m.total * (1 - s) });

// Enemy power after advancing a share d (0..1) of the pocket under the defender's fires.
export const enemyAt = (d, m = MODEL) => m.enemy * (1 - m.fires * clamp(d, 0, 1));

// Fixing force needed to hold the enemy at the stop.
export const fixNeeded = (m = MODEL) => m.holdRatio * enemyAt(1, m);

export const holds = (s, m = MODEL) => forces(s, m).fix >= fixNeeded(m);
export const commits = (s, m = MODEL) => forces(s, m).strike > enemyAt(1, m);

// "trapped": fix holds and the strike goes in. "overrun": the fix fails.
// "held": the fix holds but the striking force is not stronger, so it is not committed.
export function outcome(s, m = MODEL) {
  if (!holds(s, m)) return "overrun";
  return commits(s, m) ? "trapped" : "held";
}

// The band of striking shares (whole percents) that trap, in this model.
export function band(m = MODEL) {
  const ok = [];
  for (let pct = Math.round(m.split[0] * 100); pct <= Math.round(m.split[1] * 100); pct++) {
    if (outcome(pct / 100, m) === "trapped") ok.push(pct);
  }
  return [ok[0], ok[ok.length - 1]];
}

// State of one run at time t (seconds, wraps at the cycle) for striking share s.
//   p     enemy progress: 0 at the mouth, 1 against the fixing stop, up to overrunTo
//   drop  how far the fixing stop is pushed down: 0 up, 1 flush (overrun)
//   arm   striking arm swing: 0 cocked, 1 across the enemy's rear
//   phase "advance" | "contact" | "strike" | "hold" | "reset"
export function runAt(t, s, m = MODEL) {
  const T = m.T;
  const out = outcome(s, m);
  const give = out === "overrun" ? 1 : Math.min(0.6, 0.18 * fixNeeded(m) / forces(s, m).fix);
  let time = ((t % m.cycle) + m.cycle) % m.cycle;
  const st = { p: 0, drop: 0, arm: 0, phase: "advance", outcome: out };
  const t1 = T.advance, t2 = t1 + T.settle, t3 = t2 + T.strike, t4 = t3 + T.hold;
  // the enemy's state at the end of the contact and strike phases
  const endP = out === "overrun" ? m.overrunTo : 1;
  // an unchecked enemy keeps rolling past the stop once it has pushed it flush
  const over = (tt) => 1 + (m.overrunTo - 1) * easeOut(clamp((tt - t1 - 0.12) / (T.settle + T.strike), 0, 1));
  if (time < t1) {
    const u = time / t1;
    st.p = 0.45 * u + 0.55 * smooth(u); // arrives still moving
  } else if (time < t2) {
    const u = (time - t1) / T.settle;
    st.phase = "contact";
    st.drop = give * easeOut(u * 1.6);
    st.p = out === "overrun" ? over(time) : 1;
  } else if (time < t4) {
    st.phase = time < t3 ? "strike" : "hold";
    st.drop = give;
    st.p = out === "overrun" ? over(time) : 1;
    if (out === "trapped") st.arm = easeOut((time - t2) / T.strike);
  } else {
    const u = smooth((time - t4) / T.reset);
    st.phase = "reset";
    st.p = endP * (1 - u);
    st.drop = give * (1 - u);
    st.arm = out === "trapped" ? 1 - u : 0;
  }
  return st;
}

// Striking force over the enemy power it would meet, at enemy progress p.
export const ratioAt = (p, s, m = MODEL) => forces(s, m).strike / enemyAt(Math.min(p, 1), m);

// ---- Notional losses (added with the Battlefield view, 2026-10-13; owner rule: success is not free) ----
// Counted in vehicles knocked out. The Battlefield view draws one vehicle per 5 units of combat power,
// so the defender has 20 (split by the slider) and the enemy column 14. Every constant is notional.
export const LOSS = {
  perVeh: 5,        // units of combat power per vehicle drawn
  fixK: 2,          // fixing-force vehicles lost at the stop, times (fix needed / fix): a thinner fix loses more
  overrun: 1,       // one more fixing vehicle lost when the enemy breaks through
  atStop: 1,        // enemy vehicles lost at the stop (its lead), in every outcome
  strikeRedK: 6,    // enemy vehicles the strike knocks out, times (strike / enemy at the stop)
  strikeBlueK: 3,   // striking-force vehicles lost, times (enemy at the stop / strike)
};

// Vehicles drawn for striking share s: striking force, fixing force, enemy column.
export function vehicles(s, m = MODEL) {
  const strike = Math.round(forces(s, m).strike / LOSS.perVeh);
  return { strike, fix: Math.round(m.total / LOSS.perVeh) - strike, enemy: Math.round(m.enemy / LOSS.perVeh) };
}

// Losses at the end of one run, by cause: fires (enemy, on the way in), stop (enemy lead at the stop),
// fix (fixing force at the stop), strikeRed / strikeBlue (the counterattack; trapped only).
export function lossFinal(s, m = MODEL) {
  const out = outcome(s, m), f = forces(s, m), v = vehicles(s, m), e1 = enemyAt(1, m);
  const fires = Math.round((m.enemy - e1) / LOSS.perVeh);
  const fix = Math.min(v.fix, Math.round(LOSS.fixK * fixNeeded(m) / f.fix) + (out === "overrun" ? LOSS.overrun : 0));
  const strikeRed = out === "trapped" ? Math.min(v.enemy - fires - LOSS.atStop, Math.round(LOSS.strikeRedK * f.strike / e1)) : 0;
  const strikeBlue = out === "trapped" ? Math.round(LOSS.strikeBlueK * e1 / f.strike) : 0;
  return { fires, stop: LOSS.atStop, fix, strikeRed, strikeBlue, blue: fix + strikeBlue, red: fires + LOSS.atStop + strikeRed };
}

// When each loss falls within one run: the time windows (seconds into the cycle) over which the
// counts accrue. Fires losses follow the enemy's progress; the k-th of n losses in a window falls at
// its (k - 0.5) / n point.
export function lossWindows(s, m = MODEL) {
  const T = m.T, t1 = T.advance, t2 = t1 + T.settle;
  const over = outcome(s, m) === "overrun";
  return { stop: t1 + 0.5 * T.settle, fix: [t1, over ? T.settle + T.strike : T.settle], strike: [t2, T.strike + 0.6 * T.hold] };
}

// Losses so far at time t (wraps at the cycle). They hold at their final values through the reset.
export function lossesAt(t, s, m = MODEL) {
  const time = ((t % m.cycle) + m.cycle) % m.cycle;
  const F = lossFinal(s, m), W = lossWindows(s, m), st = runAt(time, s, m);
  const share = ([a, d]) => clamp((time - a) / d, 0, 1);
  const fires = time < m.T.advance ? Math.round((m.enemy - enemyAt(Math.min(st.p, 1), m)) / LOSS.perVeh) : F.fires;
  const stop = time >= W.stop ? F.stop : 0;
  const fix = Math.round(F.fix * share(W.fix));
  const w = share(W.strike);
  const strikeRed = Math.round(F.strikeRed * w), strikeBlue = Math.round(F.strikeBlue * w);
  return { fires, stop, fix, strikeRed, strikeBlue, blue: fix + strikeBlue, red: fires + stop + strikeRed };
}
