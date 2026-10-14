// The mission-command model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine. Two identical engines carry the same load (the situation).
// The governed engine's throttle is set on the spot by its own flyball governor, toward
// a set point the commander chose (the intent). The cranked engine's throttle is set
// from headquarters through a rod, by a commander who learns of load changes only
// through reports that lag. Jam the link and the cranked throttle freezes where it was.

export const MODEL = {
  set: 100,         // set point, % of rated speed (the commander's intent)
  tau: 1.2,         // engine speed time constant, s
  u0: 0.7,          // governor throttle at the set point
  kp: 8,            // governor gain: throttle per unit speed error
  report: 2.0,      // lag of the reports headquarters steers by, s (first-order)
  crank: 0.25,      // fastest headquarters can crank the throttle, throttle units per s
  load: [0.5, 1.0], // range of the load the situation puts on both engines
  load0: 0.7,       // starting load (throttle u0 holds the set point at this load)
  uMax: 1.2,        // throttle stop
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lag = (x, to, dt, tau) => x + (to - x) * (1 - Math.exp(-dt / tau));

// Steady speed of an engine at throttle u under load L, % of rated.
export const speedAt = (u, L, m = MODEL) => (m.set * u) / L;

// What the governor sets the throttle to at speed w.
export const governorThrottle = (w, m = MODEL) => clamp(m.u0 + m.kp * (1 - w / m.set), 0, m.uMax);

// Where the governed engine settles under load L: w/set = (u0 + kp) / (L + kp).
// A proportional governor holds near, not exactly at, its set point ("droop").
export const governedSteady = (L, m = MODEL) => (m.set * (m.u0 + m.kp)) / (L + m.kp);

// Where the cranked engine settles if its throttle froze at u while the load moved to L.
export const frozenSteady = (u, L, m = MODEL) => speedAt(u, L, m);

export function initial(m = MODEL) {
  return { L: m.load0, seen: m.load0, wG: m.set, wC: m.set, uG: m.u0, uC: m.u0, uHQ: m.u0 };
}

// One step of both engines. linked: whether the command link to the cranked engine works.
export function step(s, L, linked, dt, m = MODEL) {
  s.L = clamp(L, m.load[0], m.load[1]);
  // headquarters sees the load through lagging reports and cranks toward the throttle
  // that would hold the set point at that load, at a limited rate
  s.seen = lag(s.seen, s.L, dt, m.report);
  const want = clamp(s.seen, 0, m.uMax);
  s.uHQ += clamp(want - s.uHQ, -m.crank * dt, m.crank * dt);
  if (linked) s.uC = s.uHQ;
  // the governor reads its own engine's speed and sets its own throttle
  s.uG = governorThrottle(s.wG, m);
  s.wG = lag(s.wG, speedAt(s.uG, s.L, m), dt, m.tau);
  s.wC = lag(s.wC, speedAt(s.uC, s.L, m), dt, m.tau);
  return s;
}

// ---- Battlefield view (notional) ----
// Each engine drives one platoon in the Battlefield view: the governed engine the platoon that works
// to the commander's intent, the cranked engine the platoon that waits for orders. The load is the
// enemy situation: at a heavy load an enemy machine gun moves up to cover the road to the bridges; at
// a light one the enemy at the bridges pulls back. A platoon advances only while its action fits the
// situation, which in this model means while its engine runs within FIELD.band of the set point;
// outside that band it halts and waits. Every number here is a teaching value, not data.
export const FIELD = {
  band: 12,          // % off the set point at which a platoon's action no longer fits: it halts
  rate: 0.09,        // share of the route covered per second at a perfect fit
  turn: 0.45,        // share per second a platoon shifts between the road and the covered route
  heavy: 0.8,        // load at and above which the enemy machine gun moves up to cover the road
  light: 0.55,       // load at and below which the enemy at the bridges pulls back
  move: 0.7,         // share per second the enemy moves between its positions
  reach: [0.12, 0.86], // stretch of the route (share) that gun can hit on the open road
  hitHalt: 0.8,      // men down per second for a platoon halted on the open road under that gun
  hitMove: 0.25,     // the same while it keeps moving
  cap: 4,            // most men one platoon loses to that gun in one run
  seize: 0.9,        // share of the route at which the lead squad is over the bridge: the bridge is taken
  assault: [1, 2],   // men down when a platoon takes a defended bridge: friendly, enemy
  men: 20,           // men drawn per platoon (two rifle squads, the platoon leader and his RTO)
  enemy: 6,          // enemy at each bridge (a fire team and a machine-gun team)
};
const fieldSmooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fieldToward = (x, to, rate, dt) => x + clamp(to - x, -rate * dt, rate * dt);
// How well a platoon's action fits the situation: 1 on the set point, 0 at FIELD.band off it.
export const fit = (w, m = MODEL, f = FIELD) => clamp(1 - Math.abs(w - m.set) / f.band, 0, 1);
// Whether a load puts the enemy machine gun on the road (1) or leaves it in depth (0).
export const threat = (L, f = FIELD) => (L >= f.heavy - 1e-9 ? 1 : 0);

export function fieldInitial() {
  return { pG: 0, pC: 0, rG: 0, rC: 0, gun: 0, back: 0, hitG: 0, hitC: 0, tookG: 0, tookC: 0 };
}
// One step of the battlefield, after step(s, ...). The enemy moves toward the positions the load
// calls for. The governed platoon reads the situation itself and picks its route: the covered route
// behind the hedge while the gun covers the road. The waiting platoon takes the route its orders were
// cut for: the load headquarters' throttle answers (uC). took: 0 not yet, 1 took a defended bridge,
// 2 crossed after the enemy had pulled back.
export function fieldStep(F, s, dt, m = MODEL, f = FIELD) {
  F.gun = fieldToward(F.gun, threat(s.L, f), f.move, dt);
  F.back = fieldToward(F.back, s.L <= f.light + 1e-9 ? 1 : 0, f.move, dt);
  const onRoad = fieldSmooth(0.9, 1, F.gun);
  const one = (p, r, hit, took, w, sees) => {
    const go = fit(w, m, f);
    r = fieldToward(r, threat(sees, f), f.turn, dt);
    p = Math.min(1, p + f.rate * go * dt);
    const open = onRoad * (1 - r) * (p > f.reach[0] && p < f.reach[1] ? 1 : 0);
    hit = Math.min(f.cap, hit + open * (go < 0.2 ? f.hitHalt : f.hitMove) * dt);
    if (!took && p >= f.seize) took = F.back > 0.5 ? 2 : 1;
    return [p, r, hit, took];
  };
  [F.pG, F.rG, F.hitG, F.tookG] = one(F.pG, F.rG, F.hitG, F.tookG, s.wG, s.L);
  [F.pC, F.rC, F.hitC, F.tookC] = one(F.pC, F.rC, F.hitC, F.tookC, s.wC, s.uC);
  return F;
}
// Men down in this run (notional): friendly vs enemy.
export function fieldLosses(F, f = FIELD) {
  const fought = (F.tookG === 1 ? 1 : 0) + (F.tookC === 1 ? 1 : 0);
  return { blue: Math.floor(F.hitG) + Math.floor(F.hitC) + fought * f.assault[0], red: fought * f.assault[1] };
}
// The readout in the Battlefield view, kept under 45 characters.
export function fieldReadout(s, F, linked) {
  const c = fieldLosses(F);
  const text = `${linked ? "Linked" : "Jammed"} · gov ${Math.round(s.wG)}% · crank ${Math.round(s.wC)}% · ${c.blue} vs ${c.red} down`;
  return text.length <= 44 ? text : text.replace(/%/g, "");
}
