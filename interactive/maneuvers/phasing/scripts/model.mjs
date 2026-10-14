// The phasing model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Phase names follow JP 3-0 (2017, Change 1 2018), Figure V-7. The effort
// levels are notional: a teaching shape read off the general form of that
// figure (effort peaks in Dominate), not numbers from any publication.

export const PHASES = [
  { n: "0", name: "Shape", effort: 0.15 },
  { n: "I", name: "Deter", effort: 0.3 },
  { n: "II", name: "Seize initiative", effort: 0.6 },
  { n: "III", name: "Dominate", effort: 1 },
  { n: "IV", name: "Stabilize", effort: 0.55 },
  { n: "V", name: "Enable civil authority", effort: 0.25 },
];

export const GATE = {
  x0: -50,     // x of the Phase 0 notch
  pitch: 20,   // notch spacing
  inY: 12,     // lever y when seated in a notch
  outY: 0,     // lever y in the cross channel
};

export const TIMING = {
  clutch: 0.12,     // clutch travel time constant, s
  lever: 0.08,      // lever in/out time constant, s
  slide: 70,        // lever slide speed along the gate, units per s
  dwell: 1.4,       // tour: seconds held in each phase
};

export const notchX = (i) => GATE.x0 + GATE.pitch * i;
export const effortOf = (i) => PHASES[i].effort;
export const clampPhase = (i) => Math.max(0, Math.min(PHASES.length - 1, Math.round(i)));

// Nearest notch to a lever x position.
export const phaseAt = (x) => clampPhase((x - GATE.x0) / GATE.pitch);

// The tour order: 0 through V, then back to Shape, as the JP 3-0 (2018) figure draws it.
export const TOUR = [0, 1, 2, 3, 4, 5, 0];

export function readoutFor(i) {
  const p = PHASES[i];
  return `Phase ${p.n}: ${p.name} · effort ${Math.round(p.effort * 100)}%`;
}

export function transitText(from, to, stage) {
  return `Transition ${PHASES[from].n} → ${PHASES[to].n} · ${stage}`;
}

// ---- Battlefield view (added 2026-10-13): notional casualties, men down on each side ----
// Success is not free. Losses come only where there is fighting: none in Shape and Deter, some in
// Seize initiative, most in Dominate, a few in Stabilize (a sniper at a checkpoint), none in Enable
// civil authority. Teaching numbers for one drawn campaign, not data. Index = phase.
export const FIELD_LOSS = [
  { blue: 0, red: 0 },
  { blue: 0, red: 0 },
  { blue: 6, red: 14 },
  { blue: 15, red: 38 },
  { blue: 3, red: 4 },
  { blue: 0, red: 0 },
];
// Men down by the end of phase i (the campaign so far; Shape again starts a new one).
export function lossesThrough(i) {
  let blue = 0, red = 0;
  for (let j = 0; j <= clampPhase(i); j++) { blue += FIELD_LOSS[j].blue; red += FIELD_LOSS[j].red; }
  return { blue, red };
}
// Men down part-way through phase i: earlier phases in full, this phase's losses as its fighting
// runs (d = share of the phase's action done, 0..1; all in by d = 0.8).
export function lossesAt(i, d = 1) {
  const n = clampPhase(i), f = Math.min(1, Math.max(0, d) / 0.8);
  const before = n === 0 ? { blue: 0, red: 0 } : lossesThrough(n - 1);
  return { blue: before.blue + Math.round(FIELD_LOSS[n].blue * f), red: before.red + Math.round(FIELD_LOSS[n].red * f) };
}
// The Battlefield readout: phase and men down, friendly vs enemy (kept under 45 characters).
export function fieldReadoutFor(i, d = 1) {
  const p = PHASES[clampPhase(i)], c = lossesAt(i, d);
  return `Ph ${p.n}: ${p.name} · ${c.blue} vs ${c.red} down`;
}
