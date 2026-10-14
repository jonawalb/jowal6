// The fire-effects model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so both views,
// the readout and the tests run this one file.
//
// Sourced (FM 3-09, 12 August 2024, para 3-66): in the computed effects of field artillery fires,
// suppression produces at least 3 percent casualties or materiel damage, neutralization 10 percent
// and destruction 30 percent; suppressive fire degrades a weapon system "during the conduct of the fires".
// Notional (teaching values, labeled on the page): the casualty curve, the rates of fire, the platoon's
// time window, how long a neutralized enemy stays down, and every loss count.

export const MODEL = {
  men: 26,            // enemy rifle platoon as drawn (notional)
  n0: 170,            // rounds scale of the casualty curve: share hit = 1 - exp(-n / n0) (notional)
  levels: { S: 0.03, N: 0.10, D: 0.30 }, // FM 3-09 para 3-66 (sourced)
  rEff: 10,           // rounds per minute while firing for effect (notional)
  rSus: 4,            // rounds per minute that keep a suppression going (notional)
  window: 8,          // minutes the friendly platoon needs to cross the open ground (notional)
  tN: 2,              // minutes a neutralized enemy stays out of action (notional "short period")
  heads: 0.15,        // share of the enemy's fire that still comes back while rounds are landing (notional)
  tau: 0.2,           // minutes for the enemy's fire to come back or die away
  blueK: 0.6,         // friendly men down per minute of full enemy fire on the platoon (notional)
  speed: 2,           // model minutes per real second on the page
};

export const NAMES = { S: "Suppress", N: "Neutralize", D: "Destroy" };
export const DONE = { "": "Firing", S: "Suppressed", N: "Neutralized", D: "Destroyed" };

export const hitShare = (n, m = MODEL) => 1 - Math.exp(-n / m.n0);
export const roundsFor = (lvl, m = MODEL) => Math.ceil(-m.n0 * Math.log(1 - m.levels[lvl]));
export const minutesFor = (lvl, m = MODEL) => roundsFor(lvl, m) / m.rEff;
// The effect reached by a share hit: "", "S", "N" or "D".
export function effectOf(c, m = MODEL) {
  if (c >= m.levels.D - 1e-12) return "D";
  if (c >= m.levels.N - 1e-12) return "N";
  if (c >= m.levels.S - 1e-12) return "S";
  return "";
}

// A fresh mission for one detent.
export const mission = (level = "S") => ({ level, firing: false, started: false, tt: 0, t: 0, nEff: 0, nSus: 0, last: 0, E: 1, X: 0 });

// The share of the enemy's fire the state calls for (before easing).
export function wantE(s, m = MODEL) {
  if (!s.started) return 1;
  if (s.firing) return m.heads;
  const c = hitShare(s.nEff, m), eff = effectOf(c, m);
  if (eff === "D") return 0;
  if (eff === "N" && s.tt - s.last < m.tN) return 0;
  return 1 - c;
}

// One step of dt model minutes. Mutates and returns s.
export function step(s, dt, m = MODEL) {
  if (s.firing) {
    s.started = true;
    const cap = roundsFor(s.level, m);
    if (s.nEff < cap) s.nEff = Math.min(cap, s.nEff + m.rEff * dt);
    else if (s.level === "S") s.nSus += m.rSus * dt;
    if (s.nEff >= cap && s.level !== "S") { s.firing = false; s.last = s.tt; } // end of mission
  }
  if (s.started) {
    const open = s.t < m.window;
    s.tt += dt;
    s.t = Math.min(m.window, s.tt);
    if (open && s.t >= m.window && s.firing) { s.firing = false; s.last = s.tt; } // the platoon is across
    const want = wantE(s, m);
    s.E += (want - s.E) * (1 - Math.exp(-dt / m.tau));
    if (open) s.X += s.E * dt;
  }
  return s;
}
export function cease(s) { if (s.firing) { s.firing = false; s.last = s.tt; } return s; }

export const rounds = (s) => Math.floor(s.nEff + s.nSus + 1e-9);
// Notional men down: friendly (the crossing platoon) vs enemy.
export function losses(s, m = MODEL) {
  return { blue: Math.round(m.blueK * s.X), red: Math.round(m.men * hitShare(s.nEff, m)) };
}
export function stateWord(s, m = MODEL) {
  if (!s.started) return "Ready";
  if (s.firing) return "Firing";
  const c = hitShare(s.nEff, m), eff = effectOf(c, m);
  if (eff === "D") return "Destroyed";
  if (eff === "N" && s.tt - s.last < m.tN) return "Neutralized";
  return s.E > 0.5 ? "Firing back" : (eff === "N" ? "Neutralized" : eff === "S" ? "Suppressed" : "Firing back");
}
// Run a scripted mission (for the tests): fire, optionally cease at `ceaseAt` minutes, run to `until`.
export function simulate(level, { ceaseAt = Infinity, until = 10, dt = 1 / 600 } = {}, m = MODEL) {
  const s = mission(level);
  s.firing = true;
  for (let t = 0; t < until - 1e-9; t += dt) {
    if (s.firing && s.tt >= ceaseAt - 1e-9) cease(s);
    step(s, dt, m);
  }
  return s;
}
