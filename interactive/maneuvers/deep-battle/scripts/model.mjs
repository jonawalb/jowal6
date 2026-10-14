// The deep battle model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Distances are in km along the axis of attack, time in days.
// Sourced (Glantz 1990, pp. 14-15): an army attack echelon was to penetrate the
// tactical defenses to 25-30 km and an exploitation echelon to carry success to
// 70-100 km; front operations assumed 10-15 km a day for infantry and 40-50 for
// mobile forces. The values below sit inside those ranges.
// Notional: the start point of the second echelon, the lengths of the carriages,
// and above all the day the defender's reserve arrives.

export const MODEL = {
  tactical: 28,     // km: depth of the tactical defense the first echelon breaks (source: 25-30)
  deep: 70,         // km: where the exploitation echelon is carried to (source: 70-100)
  vInf: 12,         // km/day: first echelon (source: 10-15 for infantry)
  vMob: 45,         // km/day: second echelon (source: 40-50 for mobile forces)
  start2: -12,      // km: second echelon waits this far behind the start line (notional)
  reserveDay: 3,    // day the defender's reserve reaches the rear of its tactical zone (notional)
  archHalf: 7 / 3,  // km: half-length of the first-echelon carriage (drawing: 7 units at 3 units/km)
  mgHalf: 7.9 / 3,  // km: half-length of the second-echelon carriage (drawing: 7.9 units)
  gap: 1,           // km: closest the second echelon follows behind the first
  gateA: 1.5,       // km: forward edge of the defense (first gate)
  gateB: 29.5,      // km: rear gate of the tactical zone (drawing)
  stop1: 52,        // km: the first echelon rolls on through the rear gate and halts here (drawing)
  clear1: 30,       // km/day: how fast it rolls clear once the breach is done (drawing only)
  pins: [5, 10, 15, 20, 25], // km: obstacle pins in the tactical zone (drawing)
  days: 5,          // the day clock's full scale
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => { const x = clamp01(v); return x * x * (3 - 2 * x); };

// Derived times for a given commitment day of the second echelon.
export function timesOf(commit, m = MODEL) {
  const breach = m.tactical / m.vInf;                        // first echelon reaches the rear of the zone
  const off = 2 * m.archHalf + m.mgHalf + m.gap;            // second echelon's centre stays this far behind the first's front
  const toGate = (m.gateB - m.mgHalf - m.start2) / m.vMob;   // free run from the start point to the rear gate
  const held = commit <= breach - (m.tactical - off - m.start2) / m.vMob;
  const gate = held ? breach + (m.gateB - m.mgHalf - (m.tactical - off)) / m.vMob : commit + toGate; // second echelon's front reaches the gate
  const sealed = gate > m.reserveDay;
  const deepDay = sealed ? Infinity : gate + (m.deep - m.gateB) / m.vMob;
  const latest = m.reserveDay - toGate;                      // last commitment day that still beats the reserve
  return { breach, off, held, gate, sealed, deepDay, latest, margin: m.reserveDay - gate };
}

// The whole bench at day t, for commitment day `commit`.
export function stateAt(t, commit, m = MODEL) {
  const T = timesOf(commit, m);
  const breach = m.tactical / m.vInf;
  const f1 = t <= breach ? m.vInf * Math.max(0, t) : Math.min(m.stop1, m.tactical + m.clear1 * (t - breach)); // first echelon's front
  const free = m.start2 + m.vMob * Math.max(0, t - commit);
  let c2;
  if (t <= T.breach) c2 = Math.min(free, f1 - T.off);
  else c2 = T.held ? m.tactical - T.off + m.vMob * (t - T.breach) : free;
  c2 = Math.max(m.start2, c2);
  if (T.sealed) c2 = Math.min(c2, m.gateB - m.mgHalf - 1);
  c2 = Math.min(c2, m.deep - m.mgHalf);
  const front2 = c2 + m.mgHalf;
  const rear2 = c2 - m.mgHalf;
  // the rear gate closes when the reserve arrives, or behind the second echelon if it got through first
  const clear = T.sealed ? m.reserveDay : Math.max(m.reserveDay, T.gate + (2 * m.mgHalf + 1) / m.vMob);
  const liftB = smooth((f1 - (m.tactical - 2.5)) / 2.5) * (1 - smooth((t - clear) / 0.12));
  return {
    t, commit, f1, c2, front2, rear2,
    liftA: smooth((f1 - 0.2) / (m.gateA - 0.4)),
    liftB,
    pins: m.pins.map((p) => smooth((f1 - (p - 0.9)) / 0.9)),
    blade: smooth((t - T.breach) / 0.15),
    latch: smooth((t - commit) / 0.1),
    reserve: clamp01(t / m.reserveDay),
    phase: phaseOf(t, commit, T, f1, c2, m),
    T,
  };
}

function phaseOf(t, commit, T, f1, c2, m) {
  if (T.sealed && t >= m.reserveDay) return "sealed";
  if (!T.sealed && c2 >= m.deep - m.mgHalf - 1e-9) return "deep";
  if (c2 + m.mgHalf >= m.gateB) return "through";
  if (t > commit && t < T.breach && c2 >= f1 - T.off - 1e-9 && t > 0) return "held";
  if (t < T.breach) return "breaching";
  return t < commit ? "waiting" : "feeding";
}

const d1 = (v) => (Math.round(v * 10) / 10).toFixed(1);

// The card's readout, under 45 characters.
export function readoutOf(s, m = MODEL) {
  const day = "Day " + d1(s.t);
  switch (s.phase) {
    case "sealed": return day + " · sealed: reserve " + d1(-s.T.margin) + " d ahead";
    case "deep": return day + " · " + m.deep + " km deep · reserve " + d1(s.T.margin) + " d late";
    case "through": return day + " · 2nd echelon through · " + Math.round(s.front2) + " km";
    case "held": return day + " · 2nd echelon held behind 1st";
    case "feeding": return day + " · breach open · feeding 2nd";
    case "waiting": return day + " · breach open · 2nd echelon waits";
    default: return day + " · 1st echelon at " + Math.round(s.f1) + " km";
  }
}

// ---- Battlefield view (added 2026-10-13): casualties and the field readout ----
// Notional teaching values, not data: casualties in thousands of soldiers, attacker vs defender.
// The first echelon pays for the breach in proportion to the depth it has broken; a mobile group
// stopped at a sealed gate pays again there; one that gets through costs the defender its rear
// units as it runs into depth, and the late reserve then fights the first echelon at the shoulders.
export const LOSSES = {
  breachAtk: 4.0, breachDef: 3.0, // whole tactical zone broken
  gateAtk: 2.5, gateDef: 1.0,     // the fight at a sealed rear gate
  deepAtk: 0.6, deepDef: 2.0,     // the run from the rear gate to 70 km
  lateAtk: 0.4, lateDef: 0.6,     // the late reserve against the first echelon's shoulders
};

// The day the rear gate shuts (as in stateAt): when the reserve arrives, or behind the second echelon.
export const clearDay = (T, m = MODEL) => (T.sealed ? m.reserveDay : Math.max(m.reserveDay, T.gate + (2 * m.mgHalf + 1) / m.vMob));

export function lossesOf(s, m = MODEL, l = LOSSES) {
  const b = clamp01(Math.min(s.f1, m.tactical) / m.tactical);
  let atk = l.breachAtk * b, def = l.breachDef * b;
  if (s.T.sealed) {
    const f = smooth((s.t - m.reserveDay) / 0.5) * smooth((s.front2 - 24) / 3);
    atk += l.gateAtk * f; def += l.gateDef * f;
  } else {
    const e = clamp01((s.front2 - m.gateB) / (m.deep - m.gateB));
    const late = smooth((s.t - clearDay(s.T, m)) / 0.5);
    atk += l.deepAtk * e + l.lateAtk * late;
    def += l.deepDef * e + l.lateDef * late;
  }
  return { atk: Math.round(atk * 10) / 10, def: Math.round(def * 10) / 10 };
}

// The card's readout in the Battlefield view, under 45 characters: casualties as "N vs M down".
export function fieldReadoutOf(s, m = MODEL) {
  const c = lossesOf(s, m);
  const day = "Day " + d1(s.t), down = c.atk.toFixed(1) + "k vs " + c.def.toFixed(1) + "k down";
  switch (s.phase) {
    case "sealed": return day + " · sealed · " + down;
    case "deep": return day + " · " + m.deep + " km deep · " + down;
    case "through": return day + " · 2nd at " + Math.round(s.front2) + " km · " + down;
    case "held": return day + " · 2nd held · " + down;
    case "feeding": case "waiting": return day + " · breach open · " + down;
    default: return day + " · 1st at " + Math.round(s.f1) + " km · " + down;
  }
}
