// The reverse-slope model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so both views,
// the readout and the tests run this one file.
//
// Sourced (FM 3-90, 1 May 2023, and ATP 3-21.8, 11 Jan 2024, C1): the advantages and disadvantages
// of a reverse slope defense (FM 3-90 paras 9-104, 9-105; ATP 3-21.8 paras 5-133, 5-135), controlling
// the crest by fire (FM 3-90 9-102), an observation post forward of the crest (9-107; ATP 5-132), FPFs
// along the crest (9-112), protective obstacles just down from the crest (ATP 5-132).
// Notional (teaching values, labeled on the page): every number below, including the hill's shape.
// One distance unit is about a metre of ground (notional). x runs from the enemy side (negative) over the
// crest (0) to the reverse slope (positive).

export const MODEL = {
  hill: { r: 75, steps: 5, h: 2.4, top: 0.2 },  // contour terraces, centred on x = 0 (the field draws the same ones)
  x0: -150,           // where the enemy attack starts
  eyeE: 1.6, eyeD: 1.0,   // eye heights above the ground, enemy and defender
  pos: { F: -30, R: 30 }, // the platoon's line: on the forward slope, or behind the crest
  op: -4,             // the observation post, at the crest
  belt: { fwd: -45, rear: 18 },  // wire on the forward slope; a protective belt just down from the crest
  Re: 110, Rd: 70,    // effective range of the enemy's and the defender's direct fire
  Robs: 180,          // how far the enemy's observers see a position they have line of sight to
  v: 5, vDown: 7,     // enemy speed up the forward slope and over open ground, and downhill past the crest
  dwell: 4,           // seconds the enemy needs to breach a belt
  B0: 30, R0: 30,     // men: the platoon, the attack
  cE: 0.55,           // men the platoon loses per second to the enemy's direct fire, at full enemy strength
  cI: 0.30,           // men per second to enemy indirect fire on a position it observes, while it closes
  cB: 1.2,            // men the enemy loses per second to the platoon's direct fire, at full platoon strength
  mass: 2.2,          // factor on that fire when every weapon covers one small area at the crest
  cF: 1.0,            // men per second to the FPF
  fpf: { F: [-60, -30], R: [-10, 12] },  // FPF boxes (x), by mode; behind the crest it needs the OP to call it
  lag: 3,             // seconds before the platoon fires on an enemy it was not warned of
  breaks: 0.4,        // the attack stops when this share of it is left
  speed: 2.4,         // model seconds per real second on the page
};
export const MODES = { F: "Forward slope", R: "Reverse slope" };

// height of the ground at x (m): the field's terraces, so both views agree
export function ground(x, m = MODEL) {
  const H = m.hill, d = Math.abs(x);
  let n = 0;
  for (let i = 0; i < H.steps; i++) {
    const f = 1 - (i / Math.max(1, H.steps - 1)) * (1 - H.top);
    if (H.r * f >= d - 1e-9) n++;
  }
  return n * H.h;
}
// true when a viewer standing at xa (eye height ha) and one at xb (hb) can see each other over the ground between
export function sees(xa, ha, xb, hb, m = MODEL) {
  const za = ground(xa, m) + ha, zb = ground(xb, m) + hb;
  const n = 120;
  for (let i = 1; i < n; i++) {
    const t = i / n, x = xa + (xb - xa) * t;
    if (ground(x, m) > za + (zb - za) * t + 1e-9) return false;
  }
  return true;
}
// where the enemy first sees a platoon standing at x (null if it never does before reaching it)
export function firstSight(xp, m = MODEL) {
  for (let x = m.x0; x < xp; x += 0.25) if (sees(x, m.eyeE, xp, m.eyeD, m)) return +x.toFixed(2);
  return null;
}

export function fresh(mode = "R", op = true) {
  return { mode, op, phase: "ready", t: 0, x: MODEL.x0, blue: MODEL.B0, red: MODEL.R0, dwell: 0, belts: { fwd: false, rear: false },
    seen: false, warned: false, lagT: 0, firstFire: null, ended: "", fireE: false, fireB: false, fallR: [], fallB: 0 };
}
export const pos = (s, m = MODEL) => m.pos[s.mode];
export const bluesDown = (s, m = MODEL) => Math.round(m.B0 - s.blue);
export const redDown = (s, m = MODEL) => Math.round(m.R0 - s.red);
// does the enemy lead element see the platoon now, within its weapons' reach
export function enemyFires(s, m = MODEL) { return sees(s.x, m.eyeE, pos(s, m), m.eyeD, m) && Math.abs(pos(s, m) - s.x) <= m.Re; }
// can the platoon's direct fire reach the enemy now
export function platoonFires(s, m = MODEL) { return sees(pos(s, m), m.eyeD, s.x, m.eyeE, m) && Math.abs(pos(s, m) - s.x) <= m.Rd; }
export function ready(s) { return s.phase === "ready"; }
export function advance(s) { if (s.phase === "ready") s.phase = "battle"; return s; }

// One step of dt model seconds. Mutates and returns s.
export function step(s, dt, m = MODEL) {
  if (s.phase === "ready" || s.phase === "done") return s;
  s.t += dt;
  const p = pos(s, m), see = sees(s.x, m.eyeE, p, m.eyeD, m);
  s.seen = see;
  // the observation post (at the crest, in both modes) warns the platoon when the enemy is within its sight
  const opSees = s.op && Math.abs(s.x - m.op) <= m.Robs && sees(s.x, m.eyeE, m.op, m.eyeD + 1, m);
  if (opSees) s.warned = true;
  // fire on the platoon
  const fireE = see && Math.abs(p - s.x) <= m.Re;
  const eStr = s.red / m.R0, bStr = s.blue / m.B0;
  let lossB = 0;
  if (fireE) lossB += m.cE * eStr * dt;
  if (see && Math.abs(p - s.x) <= m.Robs) lossB += m.cI * eStr * dt;
  // fire on the enemy
  let lossR = 0;
  const reach = platoonFires(s, m);
  let engaged = reach;
  if (reach && !s.warned && s.firstFire === null) {
    s.lagT += dt;               // not warned: the platoon is surprised at close range
    if (s.lagT < m.lag - 1e-9) engaged = false;
  }
  if (engaged) {
    if (s.firstFire === null) s.firstFire = +s.t.toFixed(2);
    lossR += m.cB * bStr * (s.mode === "R" ? m.mass : 1) * dt;
  }
  const box = m.fpf[s.mode];
  if (s.x >= box[0] && s.x <= box[1] && (s.mode === "F" || s.op) && bStr > 0) lossR += m.cF * bStr * dt;
  s.blue = Math.max(0, s.blue - lossB);
  s.red = Math.max(0, s.red - lossR);
  s.fireE = fireE; s.fireB = engaged;
  while (s.fallR.length < redDown(s, m)) s.fallR.push(+s.x.toFixed(1));
  s.fallB = bluesDown(s, m);
  // the attack moves, and stops to breach a belt
  if (s.dwell > 0) { s.dwell = Math.max(0, s.dwell - dt); }
  else {
    const nx = s.x + (s.x >= 0 ? m.vDown : m.v) * dt;
    const hit = ["fwd", "rear"].find((b) => !s.belts[b] && s.x < m.belt[b] && nx >= m.belt[b]);
    if (hit) { s.belts[hit] = true; s.dwell = m.dwell; s.x = m.belt[hit]; } else s.x = nx;
  }
  if (s.red <= m.R0 * m.breaks + 1e-9) { s.phase = "done"; s.ended = "stopped"; }
  else if (s.blue <= 1e-9 || s.x >= p - 1e-9) { s.phase = "done"; s.ended = "reached"; s.x = Math.min(s.x, p); }
  return s;
}
export function simulate(mode, op = true, { dt = 1 / 120, until = 80 } = {}, m = MODEL) {
  const s = advance(fresh(mode, op));
  for (let t = 0; t < until && s.phase !== "done"; t += dt) step(s, dt, m);
  return s;
}
export function stateWord(s) {
  if (s.phase === "ready") return "Ready";
  if (s.phase === "done") return s.ended === "stopped" ? "Attack stopped" : "Enemy at the line";
  return s.x < 0 ? "Enemy on the slope" : "Enemy over the crest";
}
