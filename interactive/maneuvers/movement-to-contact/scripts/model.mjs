// The movement-to-contact model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so the
// figure, the readout and the tests all run this one file.
//
// DOCTRINE (the page quotes it, with paragraph and page): FM 3-90 (1 May 2023) para 4-1, 3-4: a movement
// to contact "establish[es] or regain[s] contact to develop the situation"; units "seek to make contact
// using the smallest friendly force feasible" (3-4); the main body "keeps enough distance between itself
// and its forward security force to maintain flexibility for maneuver" (4-29); when the security force
// "cannot overrun enemy forces by conducting a hasty frontal attack, units deploy a portion of their
// main body", and the unit "transitions to an attack and is no longer conducting a movement to
// contact" (4-43). ATP 3-21.10 (1 June 2026) paras 2-60, 2-62, 2-75, 2-78, 2-81; ATP 3-21.8 (11 Jan 2024,
// C1) paras 4-8, 4-56, 4-67, 4-68.
//
// EVERYTHING BELOW IS A NOTIONAL TEACHING MODEL, stated as such on the page. No source gives the
// distances, speeds or times. A run is a closed-form function of figure time t, the gap between the lead
// element and the head of the main body, and whether a lead element goes ahead at all.
// Distances are in notional units along the axis of advance (s); times are compressed figure seconds.

export const BENCH = { X0: -74, X1: 74, S0: -680, S1: 520 };   // bench rail ends and the s they stand for
export const MODEL = {
  v: 60,            // u/s: every element's speed on the march
  SE: 500,          // the enemy position
  SC: 300,          // the edge of the enemy's direct-fire reach (200 u from the enemy position at SE)
  SL: 330,          // where the lead is engaged, a short way inside that edge
  SSTOP: 400,       // where the main body stops, at the enemy position's edge
  tDep: 4.0,        // s: the main body needs this long from contact to shake out from column
  dCaught: 1.5,     // s added to the shake-out when the main body is hit in column (lead ahead)
  dNoLead: 2.5,     // s added when there is no lead element and the main body is hit in column
  bodyLen: 150,     // u: the main body's column length
  gap: { min: 0, max: 480, step: 20, start: 280 },
  leadT: [1.0, 2.5, 4.0, 5.5],                 // s after contact: lead men down while the main body is not yet firing
  bodyT: [0.6, 1.3, 1.9, 2.5, 3.2, 3.9],      // s after the main body is in range: men down in column
  enemyT: [0.8, 1.6, 2.2, 3.0, 3.6, 4.2],     // s after the main body fires: defenders out of action
  enemy: 6,
  friendMax: 6,
  hold: 2.6,        // s an outcome is held before the run ends
  clockMax: 8.0,    // s on the time dial
};
export const START = { gap: MODEL.gap.start, lead: true };
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const ease = (t) => t * t * (3 - 2 * t);
export const snap = (g) => clamp(Math.round(g / MODEL.gap.step) * MODEL.gap.step, MODEL.gap.min, MODEL.gap.max);
export const benchX = (s) => BENCH.X0 + ((s - BENCH.S0) / (BENCH.S1 - BENCH.S0)) * (BENCH.X1 - BENCH.X0);

// the shortest gap that lets the main body shake out before it crosses the edge of the enemy's reach
export const gapMin = (m = MODEL) => m.v * m.tDep + (m.SL - m.SC);

function planOf(cfg, m = MODEL) {
  const lead = !!cfg.lead;
  const g = lead ? clamp(cfg.gap, m.gap.min, m.gap.max) : 0;
  const tc = m.SL / m.v;                              // the lead (or the main body's head, with no lead) is engaged
  const tIn = lead ? Math.max(tc, (m.SC + g) / m.v) : tc;           // the main body's head crosses the edge of the enemy's reach
  const tDepOk = tc + m.tDep;                         // shake-out done, if undisturbed
  const caught = tIn < tDepOk - 1e-9;
  const tDep = caught ? tDepOk + (lead ? m.dCaught : m.dNoLead) : tDepOk;   // when it is actually shaken out
  const tFire = Math.max(tIn, tDep);                  // the main body's weapons are in action
  const leadT = lead ? m.leadT.map((x) => tc + x).filter((x) => x < Math.min(tFire, tIn) - 1e-9) : [];
  const bodyT = caught ? m.bodyT.map((x) => tIn + x).filter((x) => x <= tDep + 1e-9).slice(0, m.friendMax - leadT.length) : [];
  const enemyT = m.enemyT.map((x) => tFire + x);
  const isolated = lead && !caught && leadT.length >= m.leadT.length;
  const outcome = !lead ? "nolead" : caught ? "caught" : isolated ? "isolated" : "complete";
  const end = enemyT[enemyT.length - 1];
  return { g, lead, tc, tIn, tDep, caught, tFire, leadT, bodyT, enemyT, isolated, outcome, end };
}

export function stateAt(cfg, t, released = true, m = MODEL) {
  const p = planOf(cfg, m);
  const tt = released ? Math.max(0, t) : 0;
  // positions along the axis (s): the lead stops where it meets the fire; the head of the main body
  // keeps marching, with the shake-out, to its stop line
  const sLead = p.lead ? Math.min(m.SL, m.v * tt) : null;
  const sBody = Math.min(m.SSTOP, (p.lead ? -p.g : 0) + m.v * tt);
  const contact = released && tt >= p.tc;
  const dep = contact ? clamp((tt - p.tc) / (p.tDep - p.tc)) : 0;       // shake-out progress, 0..1
  const inRange = released && tt >= p.tIn;
  const firing = released && tt >= p.tFire;
  const downFT = released ? [...p.leadT, ...p.bodyT].filter((x) => tt >= x).sort((a, b) => a - b).map((x) => +x.toFixed(3)) : [];
  const downET = released ? p.enemyT.filter((x) => tt >= x) : [];
  const finished = released && tt >= p.end - 1e-9;
  const done = released && tt >= p.end + m.hold;
  const clock = contact ? clamp((tt - p.tc) / m.clockMax) : 0;
  return {
    cfg, t: tt, released, plan: p, sLead, sBody, contact, dep, inRange, firing, clock,
    pegs: Math.ceil(dep * 6 - 1e-9), downFT, downET, downF: downFT.length, downE: downET.length,
    caught: p.caught, finished, done, end: p.end, outcome: p.outcome,
    gap: p.g, lead: p.lead,
    deployed: released && tt >= p.tDep,
  };
}
export const finalState = (cfg, m = MODEL) => stateAt(cfg, planOf(cfg, m).end, true, m);

export function phaseWord(s) {
  if (!s.released) return "Ready";
  if (s.finished) {
    return { complete: "Enemy position defeated", caught: "Main body hit in column", isolated: "Lead left unsupported", nolead: "Main body made contact" }[s.outcome];
  }
  if (!s.contact) return "Find the enemy";
  if (!s.firing) return "Fix the enemy";
  return "Finish the enemy";
}
const fmt = (g) => String(Math.round(g));
export function readoutMachine(s) {
  if (!s.released) return s.lead ? `Ready · gap ${fmt(s.gap)} · lead on` : "Ready · no lead element";
  return `${phaseWord(s)} · ${s.downF} vs ${s.downE} down`;
}
export const readoutField = readoutMachine;
