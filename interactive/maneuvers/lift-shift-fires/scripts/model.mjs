// The lift-and-shift model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so the
// machine, the battlefield, the readout and the tests all run this one file.
//
// Doctrine (quoted on the page): suppression lasts only while the fires fall; once they "lift or
// shift to another target" the enemy "regains its effectiveness without needing to reconstitute"
// (FM 3-90, para B-62). Units therefore want to "get as close as possible to the objective before
// lifting fires" (FM 3-90, para 5-27), and observers call for fires to shift or cease as a friendly
// element approaches the minimum safe line (ATP 3-21.8, para A-29).
//
// Everything numeric below is NOTIONAL (a teaching shape, stated as such on the page): the
// distances, the speed, the recovery time, the halt and the losses. Times are figure seconds
// (compressed); distances are metres from the objective.

export const MODEL = {
  start: 160,       // m: where the assault element starts its final approach
  speed: 32,        // m per figure second (compressed time)
  msl: 50,          // m: the figure's minimum safe line for the mortars (notional, not a doctrinal distance)
  recover: 4,       // figure seconds: time constant for the enemy to come back up once fires lift
  halt: 2.5,        // figure seconds an assault stays down after a cease fire at the minimum safe line
  floor: 0.1,       // share of the enemy's fire that still comes while it is suppressed
  reinforce: 0.2,   // extra share when the depth team is not pinned (fires lifted, not shifted) and joins
  reinDelay: 0.8,   // figure seconds before an unpinned depth team starts moving up
  reinMove: 1.6,    // figure seconds it takes to reach the position
  lift: [0, 150],   // slider range: lift distance in m
  dwell: 1.8,       // figure seconds the run holds on the objective before it ends
};
export const LOSS = { assault: 20, enemy: 9 };

const smooth01 = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

// The timeline for a lift distance L (m) and mode (shift = true: fires shift to the depth position;
// false: they lift, i.e. stop). Fires lift when the assault reaches L, or, if L is inside the minimum
// safe line, when it reaches the line: the observers call a cease fire and the assault goes to ground
// for `halt` seconds before it gets moving again.
export function plan(L, shift = true, m = MODEL) {
  const late = L < m.msl;
  const tL = (m.start - Math.max(L, m.msl)) / m.speed;
  const tA = m.start / m.speed + (late ? m.halt : 0);
  return { L, shift, late, tL, halt0: late ? tL : Infinity, halt1: late ? tL + m.halt : Infinity, tA, tEnd: tA + m.dwell, risk: late ? (m.msl - L) / m.msl : 0 };
}

// Assault distance to the objective at time t.
export function distAt(t, p, m = MODEL) {
  if (!p.late || t < p.halt0) return Math.max(0, m.start - m.speed * Math.max(0, t));
  if (t < p.halt1) return m.msl;
  return Math.max(0, m.msl - m.speed * (t - p.halt1));
}

// The share of the enemy's full fire coming at the assault at time t (0..1). After the assault
// reaches the objective the value holds (the fight on the position).
export function enemyAt(t, p, m = MODEL) {
  const tt = Math.min(Math.max(0, t), p.tA);
  if (tt < p.tL) return m.floor;
  const since = tt - p.tL;
  const obj = m.floor + (1 - m.floor) * (1 - Math.exp(-since / m.recover));
  const rein = p.shift ? 0 : m.reinforce * smooth01((since - m.reinDelay) / m.reinMove);
  return Math.min(1, obj + rein);
}

// Progress (0..1) of an unpinned depth team moving up to the position (it keeps moving after the
// assault arrives; its share of the fire counts only up to arrival, in enemyAt).
export function reinAt(t, p, m = MODEL) {
  if (p.shift || t < p.tL) return 0;
  return smooth01((t - p.tL - m.reinDelay) / m.reinMove);
}

// How far the enemy squad itself has come back up (0 suppressed .. 1 fully back), held at arrival.
export function recAt(t, p, m = MODEL) {
  const tt = Math.min(Math.max(0, t), p.tA);
  return tt < p.tL ? 0 : 1 - Math.exp(-(tt - p.tL) / m.recover);
}

// Notional losses for a plan, men down (friendly assault element vs enemy squad). Success is not
// free: the assault always loses at least one man; more of the enemy's fire on arrival costs more.
export function outcome(L, shift = true, m = MODEL, l = LOSS) {
  const p = plan(L, shift, m);
  const eA = enemyAt(p.tA, p, m);
  const blue = Math.max(1, Math.round(l.assault * (0.04 + 0.3 * eA)));
  const red = Math.max(1, Math.round(l.enemy * (0.15 + 0.5 * (1 - eA))));
  return { eA, risk: p.risk, blue, red, p };
}

// Everything the figures draw at time t of a run.
export function stateAt(t, L, shift = true, m = MODEL) {
  const o = outcome(L, shift, m);
  const p = o.p;
  const d = distAt(t, p, m);
  const firing = t < p.tL;
  const halted = t >= p.halt0 && t < p.halt1;
  const arrived = t >= p.tA;
  const prog = (m.start - d) / m.start;
  // men down so far: friendly losses grow with the square of progress (most come close in);
  // enemy losses with time (mortars first, then the assault); all counted at arrival
  const blue = arrived ? o.blue : Math.floor(o.blue * prog * prog);
  const red = arrived ? o.red : Math.floor(o.red * Math.min(1, Math.max(0, t) / p.tA));
  const phase = arrived ? "On objective" : halted ? "Cease fire" : firing ? "Suppressing" : shift ? "Shifted" : "Lifted";
  return { t, d, firing, halted, arrived, e: enemyAt(t, p, m), rec: recAt(t, p, m), rein: reinAt(t, p, m), risk: p.risk, blue, red, phase, p, o };
}

// Where the k-th friendly man down (0-based) fell, as a distance to the objective, for a final count B.
export function fellAt(k, B, m = MODEL) {
  const prog = Math.sqrt((k + 1) / B);
  return m.start * (1 - Math.min(1, prog));
}
