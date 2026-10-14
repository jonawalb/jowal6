// The friction model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Real physics, notional mapping: a 1 kg block on a 20 degree incline, pulled up the
// slope by a winch through a spring (the spring balance). Coulomb friction with a
// static coefficient a little above the kinetic one, a light damper, and grit grains
// that each add a breakaway force. Distances are in centimetres (1 world unit = 1 cm).

export const MODEL = {
  mass: 1,            // kg
  g: 9.81,            // m/s^2
  angle: 20,          // degrees, the incline
  stiffness: 0.5,     // N per cm: the balance spring stretches 2 cm per newton
  damping: 6,         // N·s/m, notional: a dashpot beside the spring, so the motion can be followed
  staticExtra: 0.08,  // notional: static coefficient = kinetic + 0.08
  winch: 16,          // cm/s the winch winds in with no load (notional)
  stall: 18,          // N at which the winch motor stalls: its speed falls in a straight line with load (notional)
  travel: 112,        // cm the block runs from the bottom stop to the top stop
  mu: [0, 0.6],       // range of the kinetic coefficient the control allows
  grit: { count: [2, 4], force: [2.5, 5], gap: 18, from: 26, to: 104 }, // notional grit
  scale: 15,          // N, full scale of the balance
};

const RAD = Math.PI / 180;

// Pull needed to slide the block up the slope at a steady speed, in newtons.
export function steadyPull(mu, m = MODEL) {
  const a = m.angle * RAD;
  return m.mass * m.g * (Math.sin(a) + mu * Math.cos(a));
}
// Pull needed to start it moving from rest (static friction), plus any grit in the way.
export function breakaway(mu, grit = 0, m = MODEL) {
  return steadyPull(mu + m.staticExtra, m) + grit;
}
// "War on paper": no friction at all. Only the slope itself resists.
export const paperPull = (m = MODEL) => steadyPull(0, m);
// Winch speed in cm/s under a load of T newtons: a motor's straight-line torque-speed curve.
export const winchSpeed = (T, m = MODEL) => m.winch * Math.max(0, 1 - T / m.stall);

// Small deterministic generator, so a seed always gives the same grit.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Grit grains for one run: positions (cm along the slope, measured at the block's front
// travel), a sideways offset for the drawing, and the extra breakaway force each adds.
export function gritFor(seed, m = MODEL) {
  const r = rng(seed);
  const [lo, hi] = m.grit.count;
  const count = lo + Math.floor(r() * (hi - lo + 1));
  const out = [];
  let tries = 0;
  while (out.length < count && tries++ < 200) {
    const at = m.grit.from + r() * (m.grit.to - m.grit.from);
    if (out.some((g) => Math.abs(g.at - at) < m.grit.gap)) continue;
    out.push({ at, side: (r() - 0.5) * 11, force: m.grit.force[0] + r() * (m.grit.force[1] - m.grit.force[0]), crushed: false });
  }
  return out.sort((a, b) => a.at - b.at);
}

// A fresh run: block at the bottom stop, winch slack, spring unloaded.
export function startRun(seed, m = MODEL) {
  return { x: 0, v: 0, wound: 0, stuck: true, on: null, t: 0, done: false, grit: gritFor(seed, m) };
}

// Spring force in newtons: what the balance's pointer reads (the cord can go slack, never push).
export const tension = (s, m = MODEL) => Math.max(0, (s.wound - s.x) * m.stiffness);

// Advance the run by dt seconds at kinetic coefficient mu. Grit only counts when useGrit.
export function step(s, dt, mu, useGrit = true, m = MODEL) {
  if (s.done) return s;
  const a = m.angle * RAD;
  const W = m.mass * m.g;
  const slope = W * Math.sin(a);
  const normal = W * Math.cos(a);
  const sub = Math.max(1, Math.ceil(dt / (1 / 480)));
  const h = dt / sub;
  for (let i = 0; i < sub && !s.done; i++) {
    s.t += h;
    const wind = winchSpeed(tension(s, m), m);
    s.wound += wind * h;
    // cord pull = spring + dashpot (the dashpot works on the rate of stretch, so it adds no steady drag)
    const T = Math.max(0, tension(s, m) + m.damping * ((wind - s.v) / 100));
    if (s.stuck) {
      const grain = useGrit && s.on ? s.on.force : 0;
      if (T - slope > (mu + m.staticExtra) * normal + grain) {
        s.stuck = false;
        if (s.on) { s.on.crushed = true; s.on = null; }
      } else continue;
    }
    // moving up the slope (it never runs backwards while the winch pulls: checked in tests)
    const F = T - slope - mu * normal;
    const v1 = s.v + (F / m.mass) * 100 * h; // m/s^2 to cm/s^2
    if (v1 <= 0 && s.v >= 0 && T - slope <= (mu + m.staticExtra) * normal) {
      s.v = 0; s.stuck = true;
      continue;
    }
    s.v = Math.max(0, v1);
    const next = s.x + s.v * h;
    if (useGrit) {
      const hit = s.grit.find((g) => !g.crushed && s.x <= g.at && next >= g.at);
      if (hit) { s.x = hit.at; s.v = 0; s.stuck = true; s.on = hit; continue; }
    }
    s.x = next;
    if (s.x >= m.travel) { s.x = m.travel; s.v = 0; s.stuck = true; s.done = true; }
  }
  return s;
}

// What the run is doing now, for the readout.
export function stateOf(s) {
  if (s.done) return "top";
  if (s.on) return "grit";
  if (s.stuck) return "stuck";
  return "moving";
}

// Seconds a run takes to reach the top at coefficient mu, with or without grit.
export function runTime(mu, useGrit, seed = 1, m = MODEL) {
  const s = startRun(seed, m);
  while (!s.done && s.t < 120) step(s, 1 / 60, mu, useGrit, m);
  return s.t;
}
// "War on paper": the same winch and slope with no friction and no grit at all.
export const paperTime = (m = MODEL) => runTime(0, false, 1, { ...m, staticExtra: 0 });

// ---- Battlefield view (added 2026-10-13). The same run, read as a platoon's march. ----
// The block's travel becomes the platoon's route from the start point to the release point, each
// grit grain an incident at the same random point, and the run's seconds the march's minutes at a
// fixed notional rate. The incident kinds and the casualty counts are notional, chosen for teaching.
export const FIELD = {
  minPerSec: 5,                                    // notional: 1 s of the bench run = 5 min of the march
  kinds: ["bog", "turn", "radio", "fog", "contact"],
  names: { bog: "Bogged in mud", turn: "Wrong turn", radio: "Radio down", fog: "Fog rolls in", contact: "Contact" },
  heavy: 3.75,                                     // N: a contact on a grain above this costs a second casualty
};

// The incident kind of each grain of a run: the five kinds shuffled by the seed, one per grain.
export function incidentKinds(seed, n = gritFor(seed).length) {
  const r = rng(seed * 31 + 7), k = [...FIELD.kinds];
  for (let i = k.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; }
  return k.slice(0, n);
}

// Notional casualties of a contact on a grain: friendly 1 (2 if the grain is heavy), enemy 1.
export const contactLoss = (force) => ({ blue: force > FIELD.heavy ? 2 : 1, red: 1 });

// Casualties so far in a run: every contact the platoon has reached (stalled on or broken through).
export function casualties(run, seed) {
  const kinds = incidentKinds(seed, run.grit.length);
  const out = { blue: 0, red: 0 };
  run.grit.forEach((g, i) => {
    if (kinds[i] !== "contact" || !(g.crushed || run.on === g)) return;
    const c = contactLoss(g.force);
    out.blue += c.blue; out.red += c.red;
  });
  return out;
}

// The plan's timetable: the paper run's position at time t, and the time it reaches position x.
let PAPER_TAB = null;
function paperTable(m = MODEL) {
  if (PAPER_TAB) return PAPER_TAB;
  const s = startRun(1, m), cfg = { ...m, staticExtra: 0 }, tab = [[0, 0]];
  while (!s.done && s.t < 120) { step(s, 1 / 60, 0, false, cfg); tab.push([s.t, s.x]); }
  return (PAPER_TAB = tab);
}
export function paperXAt(t) {
  const tab = paperTable();
  if (t >= tab[tab.length - 1][0]) return tab[tab.length - 1][1];
  for (let i = 1; i < tab.length; i++) if (tab[i][0] >= t) { const [t0, x0] = tab[i - 1], [t1, x1] = tab[i]; return x0 + ((x1 - x0) * (t - t0)) / (t1 - t0 || 1); }
  return 0;
}
export function paperTAt(x) {
  const tab = paperTable();
  for (let i = 1; i < tab.length; i++) if (tab[i][1] >= x) { const [t0, x0] = tab[i - 1], [t1, x1] = tab[i]; return t0 + ((t1 - t0) * (x - x0)) / (x1 - x0 || 1); }
  return tab[tab.length - 1][0];
}
export const minutes = (sec) => Math.round(sec * FIELD.minPerSec);

// The Battlefield view's readout: the same run, in minutes against the plan.
export function fieldReadout(run, seed, mu, phase) {
  if (phase === "reset") return "Back to the start · friction " + mu.toFixed(2);
  if (run.done) {
    const c = casualties(run, seed);
    return "Arrived " + minutes(run.t) + " min · plan " + minutes(paperTAt(MODEL.travel)) + " min · " + c.blue + " vs " + c.red + " down";
  }
  const kinds = incidentKinds(seed, run.grit.length);
  const i = run.on ? run.grit.indexOf(run.on) : -1;
  const head = i >= 0 ? FIELD.names[kinds[i]] : run.x < 0.5 ? "Waiting to move" : stateOf(run) === "stuck" ? "Held up" : "On the move";
  return head + " · " + minutes(run.t) + " min · plan " + minutes(paperTAt(run.x)) + " min";
}
