// The security-tasks model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so the figure,
// the readout and the tests all run this one file.
//
// DOCTRINE (the page quotes it, with paragraph and page): FM 3-90, Tactics (1 May 2023), chapter 13:
// security operations provide "the forces being protected with time and maneuver space within which to
// react to the enemy" (13-1); screen "primarily provides early warning" and "provides the least amount of
// protection of any security mission" (13-56); guard works by "fighting to gain time" and "contains
// sufficient combat power to defeat, cause the withdrawal of, or fix the lead elements of an enemy ground
// force before it can engage the main body with direct fire" (13-72); cover is "done independent of the
// main body" and "defeats larger enemy forces" (13-99, 13-100); "more combat power in the security force
// means less for the main body" (13-51). ATP 3-21.10 (1 June 2026) paras 5-20, 5-24, 5-25, 5-26;
// ATP 3-21.8 (11 Jan 2024, C1) paras 6-91 to 6-93.
//
// EVERYTHING BELOW IS A NOTIONAL TEACHING MODEL, stated as such on the page. No manual gives these
// distances, rates, hold times, shares or casualty counts. Distances are notional km along the axis
// (s = 0 at the main body's front); times are notional minutes; the figure plays minPerSec of them per
// second. The question the model answers: from the moment the security force reports, how long before
// the enemy can observe the main body ("time bought"), for each security task against each enemy level.

export const TASKS = [
  { id: "screen", name: "Screen" },
  { id: "guard", name: "Guard" },
  { id: "cover", name: "Cover" },
];
export const ENEMIES = [
  { id: "recon", short: "recon", name: "reconnaissance elements" },
  { id: "lead", short: "lead", name: "lead elements" },
  { id: "main", short: "main", name: "main body" },
];
export const BENCH = { X0: -54, X1: 58, S0: 0, S1: 32 };
export const MODEL = {
  D0: 32,                 // km: where the enemy starts
  v: 0.5,                 // km/min: the enemy's rate of advance
  S_OBS: 6,               // km: inside this the enemy can observe and engage the main body
  R: 2,                   // km: the enemy is engaged this far beyond the security line
  STROKE: 1.5,            // km the security force gives ground while it takes the enemy's weight
  LINE: [12, 12, 22],     // km: where each task is set (screen and guard inside the main body's fire
                          // support, cover beyond it: FM 3-90 13-25, 13-105)
  HOLD: [8, 24, 48],      // min: the time each task can hold an enemy it is able to handle
  CAP: [0, 1, 2],         // the largest enemy level (0 recon, 1 lead, 2 main) each task can handle
  EXC: [1, 0.5, 0.25],    // share of the hold that is left when the enemy exceeds the capacity by 0, 1, 2 levels
  SHARE: [10, 20, 40],    // % of the force's combat power in the security force
  FRIENDS: [6, 10, 16],   // soldiers drawn per task
  ENEMY_N: [4, 9, 18],    // soldiers drawn per enemy level
  FD: [[0, 1, 1], [0, 1, 3], [1, 2, 5]],     // friendly down: [task][enemy]
  ED: [[3, 1, 1], [4, 4, 5], [4, 7, 10]],    // enemy down: [task][enemy]
  minPerSec: 10,
  dialMax: 100,           // min on the dial
  tail: 3,                // min the run goes on after the reaction time
  holdEnd: 2.4,           // s an outcome is held before the run ends
};
export const START = { task: 1, enemy: 1 };
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const ease = (t) => t * t * (3 - 2 * t);
export const benchX = (s) => BENCH.X0 + ((s - BENCH.S0) / (BENCH.S1 - BENCH.S0)) * (BENCH.X1 - BENCH.X0);
export const norm = (cfg) => ({ task: clamp(Math.round(cfg.task), 0, 2), enemy: clamp(Math.round(cfg.enemy), 0, 2) });

export function planOf(cfg, m = MODEL) {
  const { task, enemy } = norm(cfg);
  const line = m.LINE[task], sEng = line + m.R;
  const tc = (m.D0 - sEng) / m.v;                       // the enemy reaches the engagement point: the security force reports
  const excess = Math.max(0, enemy - m.CAP[task]);
  const held = excess === 0;
  const d = m.HOLD[task] * m.EXC[excess];               // minutes the enemy is held at the line
  const space = (sEng - m.STROKE - m.S_OBS) / m.v;      // minutes the enemy needs from the line to the observation line
  const react = space + d;                              // time bought: report to the enemy able to observe the main body
  const win = Math.max(d, 4);
  const nF = m.FD[task][enemy], nE = m.ED[task][enemy];
  const fT = Array.from({ length: nF }, (_, i) => tc + ((i + 1) / (nF + 1)) * win);
  const eT = Array.from({ length: nE }, (_, i) => tc + ((i + 1) / (nE + 1)) * win * 0.85);
  const end = tc + react + m.tail;
  return { task, enemy, line, sEng, tc, excess, held, d, space, react, win, nF, nE, fT, eT, end, tObs: tc + react };
}

export function stateAt(cfg, t, released = true, m = MODEL) {
  const p = planOf(cfg, m);
  const tt = released ? Math.max(0, t) : 0;
  const tm = tt * m.minPerSec;
  const engaged = released && tm >= p.tc && tm < p.tc + p.d;
  const c = !released || tm < p.tc ? 0
    : p.held ? 0.55 * ease(clamp((tm - p.tc) / (0.4 * p.d))) * (1 - 0.6 * ease(clamp((tm - p.tc - 0.55 * p.d) / (0.3 * p.d))))
    : ease(clamp((tm - p.tc) / p.d));
  let sE;
  if (!released || tm < p.tc) sE = m.D0 - m.v * tm;
  else if (p.held) sE = p.sEng - c * m.STROKE;
  else if (tm < p.tc + p.d) sE = p.sEng - c * m.STROKE;
  else sE = Math.max(m.S_OBS, p.sEng - m.STROKE - m.v * (tm - p.tc - p.d));
  if (!released) sE = m.D0;
  const through = released && !p.held && tm >= p.tc + p.d;           // the enemy has gone on past the line
  // the security force gives ground once it has held as long as it can (screen and guard displace rearward)
  const sSec = p.held || !released ? p.line : Math.max(3, p.line - 1.0 * Math.max(0, tm - (p.tc + 0.5 * p.d)));
  const reported = released && tm >= p.tc;
  const clockMin = reported ? Math.min(tm - p.tc, p.react) : 0;
  const downFT = p.fT.filter((x) => tm >= x), downET = p.eT.filter((x) => tm >= x);
  const finished = released && tm >= p.end - 1e-9;
  const done = released && tm >= p.end + m.holdEnd * m.minPerSec;
  return {
    cfg: norm(cfg), t: tt, tm, released, plan: p, sE, c, engaged, through, sSec, reported,
    clockMin, clock: clamp(clockMin / m.dialMax),
    downFT, downET, downF: downFT.length, downE: downET.length,
    finished, done, end: p.end, held: p.held, react: p.react,
    sObs: released && !p.held && tm >= p.tObs - 1e-9,
    task: p.task, enemy: p.enemy,
  };
}
export const finalState = (cfg, m = MODEL) => stateAt(cfg, planOf(cfg, m).end / m.minPerSec + 1e-6, true, m);

const plus = (p) => (p.held ? "+" : "");
export function phaseWord(s) {
  if (!s.released) return "ready";
  if (s.finished) return s.held ? "Enemy stopped" : "Enemy comes on";
  if (!s.reported) return "enemy closing";
  return "in contact";
}
export function readoutMachine(s) {
  const head = `${TASKS[s.task].name} vs ${ENEMIES[s.enemy].short}`;
  if (!s.released) return `${head} · ready`;
  if (s.finished) return `${phaseWord(s)} · ${Math.round(s.react)}${plus(s.plan)} min · ${s.downF} vs ${s.downE} down`;
  if (!s.reported) return `${head} · enemy closing`;
  return `${head} · ${Math.round(s.clockMin)} min since report`;
}
export const readoutField = readoutMachine;
