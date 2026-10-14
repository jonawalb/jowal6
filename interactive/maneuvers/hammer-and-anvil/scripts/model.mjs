// The hammer-and-anvil model. Pure: no DOM, no kit, no geometry. Inlined into the
// page by build.mjs, so the figure, the readout and the tests all run this one file.
//
// One run, in seconds from the moment the anvil starts to move into its blocking
// position (t = 0). The user chooses `delta`: when the hammer lands, in seconds
// after the anvil is fully set (negative = before). Everything returned is
// normalized (fractions 0..1); scene.mjs turns it into positions.
//
// Notional, not doctrine or history: every time below is a teaching value.

export const MODEL = {
  setTime: 1.4,     // s for the anvil to move fully into its blocking position
  hold: 3.0,        // s the anvil can hold on its own once set (its endurance)
  retract: 0.8,     // s for a spent anvil to give way and pull back out
  swing: 1.2,       // s from hammer release to landing (accelerating, like a falling weight)
  slide: 0.25,      // s time constant of an escaping block's slide to the far bumper
  range: [-2, 5],   // delta the controls allow, s
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => { const x = clamp01(v); return x * x * (3 - 2 * x); };

// When the hammer lands, its release time, and whether it catches the enemy.
export function plan(delta, m = MODEL) {
  const land = m.setTime + delta;
  const release = land - m.swing;
  const caught = delta >= 0 && delta <= m.hold;
  const why = caught ? "caught" : delta < 0 ? "early" : "late";
  return { land, release, caught, why, start: Math.min(0, release) - 0.4 };
}

// Anvil insertion (1 = fully across the lane) at time t if nothing is caught.
export function anvilFree(t, m = MODEL) {
  const t2 = m.setTime + m.hold;
  if (t <= t2) return smooth(t / m.setTime);
  return 1 - smooth((t - t2) / m.retract);
}

// Hold remaining (1 = fresh, 0 = spent) at time t if nothing is caught.
export function holdFree(t, m = MODEL) {
  if (t <= m.setTime) return 1;
  return clamp01(1 - (t - m.setTime) / m.hold);
}

// The full state of one run at time t.
export function stateAt(t, delta, m = MODEL) {
  const p = plan(delta, m);
  const after = t >= p.land;
  const frozen = p.caught && after;
  const anvil = frozen ? 1 : anvilFree(t, m);
  const hold = frozen ? holdFree(p.land, m) : holdFree(t, m);
  const u = clamp01((t - p.release) / m.swing);
  const swing = u * u;
  const escape = !p.caught && after ? 1 - Math.exp(-(t - p.land) / m.slide) : 0;
  const down = downAt(t, delta, m);
  let phase = "waiting";
  if (t >= p.release && !after) phase = "swinging";
  if (after) phase = p.why;
  return { swing, anvil, hold, escape, phase, landed: after, caught: p.caught, down };
}

// The time a run is finished and can be shown at rest.
export function endOf(delta, m = MODEL) {
  const p = plan(delta, m);
  return Math.max(p.land, p.caught ? p.land : m.setTime + m.hold + m.retract) + 1.6;
}

// Casualties (notional, men down in the drawn engagement; Battlefield view and readout). Success is
// not free. The anvil loses men while it holds under the enemy's fire: up to 3 over its full hold
// (its wear = the share of the hold used up while the enemy is still in the pocket), plus 1 when the
// enemy is driven onto it, or 2 more if the enemy runs through it before it is set. The hammer loses
// 1 at contact. The enemy loses 2 to the hammer's drive; if caught, 6 more, 2 fewer when the anvil is
// worn out (its fire has thinned). Teaching values, not loss rates from data or doctrine.
export const LOSS = { wear: 3, shock: 1, overrun: 2, hammer: 1, contact: 2, caught: 6, worn: 2 };

// Share of the anvil's hold used up while the enemy is still in the pocket (frozen at landing).
export function wearAt(t, delta, m = MODEL) {
  return 1 - holdFree(Math.min(t, plan(delta, m).land), m);
}

// Men down on each side at time t: blue = anvil + hammer, red = enemy.
export function downAt(t, delta, m = MODEL, L = LOSS) {
  const p = plan(delta, m), w = wearAt(t, delta, m), after = t >= p.land;
  const anvil = Math.round(L.wear * w) + (after && p.caught ? L.shock : 0) + (after && p.why === "early" ? L.overrun : 0);
  const hammer = after ? L.hammer : 0;
  const red = after ? L.contact + (p.caught ? L.caught - Math.round(L.worn * w) : 0) : 0;
  return { blue: anvil + hammer, red, anvil, hammer };
}

// The final count for a run.
export const casualties = (delta, m = MODEL) => downAt(endOf(delta, m), delta, m);

// The card's readout, kept under 45 characters; it ends with blue vs red men down.
export function readoutOf(s, delta, m = MODEL) {
  const d = (delta > 0 ? "+" : delta < 0 ? "−" : "") + Math.abs(delta).toFixed(1);
  const c = s.down || { blue: 0, red: 0 }, down = `${c.blue} vs ${c.red} down`;
  if (s.phase === "caught") return `Lands ${d} s · caught · ${down}`;
  if (s.phase === "early") return `Lands ${d} s · escapes · ${down}`;
  if (s.phase === "late") return `Lands ${d} s · anvil spent · ${down}`;
  return `Anvil ${Math.round(s.anvil * 100)}% set · hold ${Math.round(s.hold * 100)}% · ${down}`;
}
