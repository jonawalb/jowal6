// The strongpoint / perimeter model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so both
// views, the readout and the tests run this one file.
//
// Sourced (FM 3-90, 1 May 2023; ATP 3-21.10, 1 June 2026): what a strong point and a perimeter defense
// are, that a perimeter has "most of the combat power located on the perimeter", a centrally located
// reserve, and is vulnerable to penetration for lack of depth. Notional (teaching values, labeled on the
// page): every number below.
//
// Bearings are compass degrees the attack comes FROM: 0 north, 90 east, 180 south, 270 west.
export const MODEL = {
  pos: 6,            // fighting positions the company holds, one squad-equivalent of fire each (notional)
  H: 90,             // degrees either side of its facing over which a position can bring fire (notional)
  ME: 1.5,           // extra fire put on the likely avenue (bearing 0) when it is reinforced (notional)
  reserve: 1.0,      // fire the reserve adds once committed (notional)
  lag: 2.0,          // seconds before the reserve is committed to the threatened sector (notional)
  E0: 5,             // attacking strength, in squad-equivalents (notional)
  k: 0.24,           // enemy strength lost per second per unit of defending fire (notional)
  m: 0.10,           // defending strength lost per second per unit of attacking strength (notional)
  fireF: 1.5,        // obstacles hold the enemy under fire: multiplies defending effect when prepared (notional)
  lossG: 0.5,        // fortified positions with overhead cover: multiplies defending losses when prepared (notional)
  men: 9,            // notional men per squad-equivalent, for the casualty readout
  tMax: 30,          // seconds after which an attack that has neither won nor lost ends (notional)
  speed: 2.2,        // model seconds per real second on the page
  likely: 0,         // the most likely avenue of approach (bearing), the defense's expectation
};
export const NAMES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const compass = (a) => NAMES[Math.round((((a % 360) + 360) % 360) / 45) % 8];
export const angDiff = (a, b) => { const d = Math.abs((((a - b) % 360) + 540) % 360 - 180); return d; };
// Where each position faces: round the ring, or all toward the likely avenue in a line.
export const facing = (layout, k) => (layout === "P" ? (k * 360) / MODEL.pos : MODEL.likely);
// Fire that position k can bring on bearing a: full on its facing, falling to nothing at H degrees.
export function posWeight(layout, k, a, m = MODEL) { return Math.max(0, 1 - angDiff(a, facing(layout, k)) / m.H); }
export function weights(s, m = MODEL) {
  const w = Array.from({ length: m.pos }, (_, k) => posWeight(s.layout, k, s.bearing, m));
  const extra = s.main ? m.ME * Math.max(0, 1 - angDiff(s.bearing, m.likely) / m.H) : 0;
  return { w, sum: w.reduce((a, b) => a + b, 0), extra };
}
export function fresh(o = {}) {
  const s = { layout: "L", fort: 0, main: 0, bearing: 135, ...o };
  Object.assign(s, { phase: "ready", t: 0, E: MODEL.E0, D: 0, lost: 0, res: 0, tb: 0, tres: null, end: "", down: Array(MODEL.E0).fill(null) });
  s.D = defenders(s);
  return s;
}
const defenders = (s, m = MODEL) => { const W = weights(s, m); return W.sum + W.extra; };
export function engage(s) { if (s.phase === "ready") s.phase = "run"; return s; }

export function step(s, dt, m = MODEL) {
  if (s.phase === "ready") return s;
  if (s.phase === "done") { if (s.end === "penetrated") s.tb += dt; return s; }
  s.t += dt;
  if (!s.res && s.t >= m.lag - 1e-12) { s.res = 1; s.tres = s.t; s.D += m.reserve; }
  const f = s.fort ? m.fireF : 1, g = s.fort ? m.lossG : 1;
  const dE = m.k * f * s.D * dt, dD = m.m * g * s.E * dt;
  s.E = Math.max(0, s.E - dE);
  const before = s.D;
  s.D = Math.max(0, s.D - dD);
  s.lost += before - s.D;
  for (let i = 0; i < m.E0; i++) if (s.down[i] === null && s.E <= m.E0 - (i + 1) + 1e-9) s.down[i] = s.t;
  if (s.E <= 0.05) { s.E = 0; for (let i = 0; i < m.E0; i++) if (s.down[i] === null) s.down[i] = s.t; s.phase = "done"; s.end = "held"; }
  else if (s.D <= 0.05 && s.res) { s.D = 0; s.phase = "done"; s.end = "penetrated"; }
  else if (s.t >= m.tMax) { s.phase = "done"; s.end = "held"; }
  return s;
}
export const friendDown = (s, m = MODEL) => Math.round(m.men * s.lost);
export const enemyDown = (s, m = MODEL) => Math.round(m.men * (m.E0 - s.E));
export const alive = (s) => s.down.filter((d) => d === null).length;   // enemy elements still up, 0..E0
// Pressure read on position k's gauge, 0..1: the attack's strength left, times how much of it this
// position faces. Bearings no position covers read on none; the reserve's own gauge reads the rest.
export const gauge = (s, k, m = MODEL) => Math.min(1, (s.E / m.E0) * posWeight(s.layout, k, s.bearing, m));
export const reserveGauge = (s, m = MODEL) => { const W = weights(s, m); const cover = Math.min(1, W.sum + W.extra); return Math.min(1, (s.E / m.E0) * (1 - 0.7 * cover)); };
export function simulate(o, { dt = 1 / 600 } = {}, m = MODEL) {
  const s = engage(fresh(o));
  for (let t = 0; t < m.tMax + 1 && s.phase !== "done"; t += dt) step(s, dt, m);
  return s;
}
export function verdict(s) { return s.phase === "ready" ? "Ready" : s.phase === "run" ? "Engaged" : s.end === "held" ? "Held" : "Penetrated"; }
