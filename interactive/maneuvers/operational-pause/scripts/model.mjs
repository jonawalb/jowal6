// The operational-pause model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine. Two rams (two components of a force) each stroke only while
// the tank above them holds enough fuel for a stroke. A ram whose tank runs low halts
// (pauses) and one shared pump refills it. The enemy's combat power drops a little with
// every strike and recovers only while no ram is pushing. Every rate is a teaching number.

export const MODEL = {
  cycle: 0.9,        // seconds per ram stroke (out and back)
  perStroke: 0.25,   // share of a full tank one stroke uses
  pump: 0.45,        // tank-fulls per second the pump delivers, shared among refilling tanks
  pumpRange: [0.1, 0.6],
  hit: 0.035,        // share of the enemy's current combat power each strike removes
  recover: 0.15,     // per second, toward 100%, while no ram is pushing
};

export const UNITS = ["A", "B"];

export function initial(mode = "together") {
  return {
    mode,                       // "together" | "alternate"
    turn: 0,                    // in alternate mode, the unit allowed to push
    enemy: 1,
    units: UNITS.map((_, i) => ({ fuel: 1, phase: 0, running: mode === "together" || i === 0 })),
    strikes: 0,
  };
}

// Advance the state by dt seconds. Returns the number of strikes landed in the step.
export function step(S, dt, m = MODEL) {
  let landed = 0;
  const start = () => S.units.forEach((u, i) => {
    if (u.running) return;
    const allowed = S.mode === "together" || S.turn === i;
    if (allowed && u.fuel >= 1 - 1e-6) { u.running = true; u.phase = Math.floor(u.phase); }
  });
  // 1. who may start pushing: a halted ram restarts once its tank is full
  start();
  // 2. rams stroke; a ram only begins a stroke its tank can pay for
  S.units.forEach((u, i) => {
    if (!u.running) return;
    const before = u.phase;
    let next = before + dt / m.cycle;
    if (Math.floor(next - 0.5) > Math.floor(before - 0.5)) landed += 1; // strike at mid-stroke
    if (Math.floor(next) > Math.floor(before)) {
      u.fuel = Math.max(0, u.fuel - m.perStroke); // each finished stroke is paid for
      // a stroke just ended: halt here if the tank can't pay for another,
      // or, when pauses alternate, if it is the other unit's turn
      const dry = u.fuel < m.perStroke - 1e-6;
      if (dry || (S.mode === "alternate" && S.turn !== i)) {
        u.running = false;
        next = Math.floor(next);
        if (dry && S.mode === "alternate" && S.turn === i) S.turn = 1 - i;
      }
    }
    u.phase = next;
  });
  start(); // hand over in the same step, so an alternating force has no gap
  // 3. the pump fills every halted tank that is not full, sharing its rate
  const filling = S.units.filter((u) => !u.running && u.fuel < 1);
  for (const u of filling) u.fuel = Math.min(1, u.fuel + (m.pump / filling.length) * dt);
  // 4. the enemy: each strike removes a share; it recovers only while nobody pushes
  for (let n = 0; n < landed; n++) S.enemy *= 1 - m.hit;
  const pushing = S.units.some((u) => u.running);
  if (!pushing) S.enemy += (1 - S.enemy) * (1 - Math.exp(-m.recover * dt));
  S.strikes += landed;
  return landed;
}

export function setMode(S, mode) {
  S.mode = mode;
  if (mode === "alternate") {
    // the unit with more fuel keeps the turn
    S.turn = S.units[0].fuel >= S.units[1].fuel ? 0 : 1;
  }
}

// Ram position 0 (home) .. 1 (on the anvil), eased; peaks at mid-stroke.
export const ramAt = (phase) => (1 - Math.cos(2 * Math.PI * (phase % 1))) / 2;

// Pump plunger bob 0..1 while it is filling, by wall time.
export const plungerAt = (t, on) => (on ? (1 - Math.cos(2 * Math.PI * t * 1.6)) / 2 : 0);

// Simple run of the model for tests and the page's "what is notional" numbers.
export function simulate(mode, seconds, m = MODEL, dt = 1 / 120) {
  const S = initial(mode);
  const trace = [];
  for (let t = 0; t < seconds; t += dt) {
    step(S, dt, m);
    trace.push({ t, enemy: S.enemy, pushing: S.units.filter((u) => u.running).length, fuel: S.units.map((u) => u.fuel) });
  }
  return { S, trace };
}

export function readout(S) {
  const [a, b] = S.units;
  const pct = Math.round(S.enemy * 100);
  const word = (u) => (u.running ? "pushing" : u.fuel < 1 ? "refilling" : "waiting");
  if (a.running && b.running) return `Both pushing · enemy ${pct}%`;
  if (!a.running && !b.running) return `Both paused · enemy ${pct}%`;
  return `A ${word(a)} · B ${word(b)} · enemy ${pct}%`;
}

// NOTIONAL losses (Battlefield view and the losses line under the card; not data), counted in
// vehicles over the first minute of a plan from a fresh start. Friendly: what the attacking
// battalions are exposed to, the enemy's combat power integrated over every second each battalion
// attacks, times a notional rate. Enemy: its lost combat power at the end of the minute, out of
// the nine vehicles of its battalion (replacements make good what it recovers).
export const LOSS = { blue: 0.1, red: 9 };
export function losses(mode, pump = MODEL.pump, m = MODEL) {
  const dt = 1 / 120;
  const { trace } = simulate(mode, 60, { ...m, pump }, dt);
  let exposure = 0;
  for (const r of trace) exposure += r.pushing * r.enemy * dt;
  return { exposure, blue: Math.round(exposure * LOSS.blue), red: Math.round(LOSS.red * (1 - trace.at(-1).enemy)) };
}
