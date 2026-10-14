// The bypass model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine. A convoy of 12 floats (the attacking force) runs down a
// flume past three rocks (enemy strongpoints) of three sizes. The bypass criteria
// say which sizes may be bypassed. A rock that is not bypassed must be reduced:
// the lead float stops at it and the whole convoy waits until it is cleared. A rock
// that is bypassed costs no time, but it is not gone: floats peel off from the head
// of the convoy and stay with it to keep it contained, and they never reach the exit.
// Every number here is a teaching value, stated as such on the page.

export const MODEL = {
  n: 12,            // floats in the convoy
  speed: 80,        // flume units per second
  gap: 10.5,           // spacing between floats, flume units
  puck: 4.2,        // float radius
  lane: 16,      // lane centre, either side of the channel axis
  x0: -140,         // inlet
  x1: 125,          // the meter line at the end of the flume
  rocks: [
    // x: position along the flume; size rank 1 small .. 3 large; r: plan radius;
    // hold: seconds to reduce it; fix: floats it takes to contain it if bypassed
    { x: -80, name: "medium", rank: 2, r: 10, h: 15, hold: 1.0, fix: 1 },
    { x: -5, name: "large", rank: 3, r: 12.5, h: 22, hold: 2.0, fix: 2 },
    { x: 70, name: "small", rank: 1, r: 8, h: 10, hold: 0.5, fix: 1 },
  ],
  slots: { x: [135, 145.5, 156], y: [-21, -7, 7, 21] },  // collecting pool grid
  dt: 1 / 120,
};

// Bypass criteria, 0..3: rocks whose size rank is at or below this are bypassed.
export const CRITERIA = ["Reduce all", "Bypass small", "Bypass ≤ medium", "Bypass all"];

export const bypassed = (rock, criteria) => rock.rank <= criteria;

// Which floats contain which rock: the lead floats peel off first, rock by rock in flume order.
export function plan(criteria, m = MODEL) {
  const fixerOf = new Array(m.n).fill(-1);
  let next = 0;
  m.rocks.forEach((rock, j) => {
    if (!bypassed(rock, criteria)) return;
    for (let k = 0; k < rock.fix && next < m.n; k++) fixerOf[next++] = j;
  });
  return fixerOf;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Lateral position of a float at flume station s: the rock lane (far, y < 0) by default,
// swinging into the open lane (near, y > 0) round every rock it bypasses.
export function laneY(s, criteria, fixer, m = MODEL) {
  let u = 0;
  m.rocks.forEach((rock, j) => {
    // a float holding rock j goes round any bypassed rock before it, and stays in the rock lane at j
    if (!bypassed(rock, criteria) || (fixer >= 0 && j >= fixer)) return;
    u += smooth(rock.x - 46, rock.x - 28, s) - smooth(rock.x + 28, rock.x + 46, s);
  });
  return -m.lane + 2 * m.lane * Math.min(1, Math.max(0, u));
}

// Where a float that crossed the meter line ends up in the collecting pool.
export function slotOf(k, m = MODEL) {
  // the far column fills first, so a float never crosses one already parked
  const rows = m.slots.y.length, cols = m.slots.x.length;
  return [m.slots.x[(cols - 1 - Math.floor(k / rows) % cols)], m.slots.y[k % rows]];
}

// Floor position of a float: along its lane in the flume, then straight to its pool slot.
export function posOf(f, criteria, m = MODEL) {
  if (f.out < 0 || f.s <= m.x1) return { x: f.s, y: laneY(Math.min(f.s, m.x1), criteria, f.fixer, m) };
  const u = f.run > 0 ? Math.min(1, (f.s - m.x1) / f.run) : 1;
  const e = u * u * (3 - 2 * u);
  return { x: m.x1 + (f.slot[0] - m.x1) * e, y: f.exitY + (f.slot[1] - f.exitY) * e };
}

// Run the convoy from t = 0 to time t. Returns every float's station and lane,
// each rock's reduction progress (0..1), the count through, the count left
// containing rocks, and the finish time once the last free float is through.
export function simulate(criteria, t, m = MODEL) {
  return runner(criteria, m).to(t);
}

// The same run, advanced step by step: to(t) moves it forward to time t (never back) and returns the
// state simulate() would return for t. The page keeps one per run so a frame costs a few steps, not a rerun.
export function runner(criteria, m = MODEL) {
  const fixerOf = plan(criteria, m);
  const launch = m.gap / m.speed;
  const floats = fixerOf.map((fixer, i) => ({ i, fixer, s: m.x0, born: i * launch, live: false, parked: false, out: -1, slot: null }));
  const rocks = m.rocks.map((rock) => ({ ...rock, by: bypassed(rock, criteria), progress: 0, started: false, done: false }));
  const parkAt = (j, k) => rocks[j].x - rocks[j].r - m.puck - 1.5 - k * m.gap;
  const stopAt = (j) => rocks[j].x - rocks[j].r - m.puck - 1.5;
  let through = 0, finish = null, done = 0;
  const step = (time) => {
    // rocks being reduced
    for (const rock of rocks) {
      if (rock.started && !rock.done) {
        rock.progress = Math.min(1, rock.progress + m.dt / rock.hold);
        if (rock.progress >= 1) rock.done = true;
      }
    }
    let ahead = Infinity;            // station of the nearest moving float ahead
    const fixCount = rocks.map(() => 0);
    for (const f of floats) {
      if (time < f.born) break;
      f.live = true;
      if (f.out >= 0) { f.s = Math.min(f.s + m.speed * m.dt, m.x1 + f.run); continue; }
      let limit = f.s + m.speed * m.dt;
      if (f.fixer >= 0) {
        const k = fixCount[f.fixer]++;
        limit = Math.min(limit, parkAt(f.fixer, k));
      }
      rocks.forEach((rock, j) => {
        if (rock.done || (rock.by && f.fixer !== j)) return;
        if (f.fixer === j) return;
        if (f.s <= stopAt(j) + 0.01) limit = Math.min(limit, stopAt(j));
      });
      if (ahead < Infinity) limit = Math.min(limit, ahead - m.gap);
      f.s = Math.max(f.s, limit);
      // the lead float reaching a rock that must be reduced starts the work
      rocks.forEach((rock, j) => {
        if (!rock.by && !rock.started && f.s >= stopAt(j) - 0.01) rock.started = true;
      });
      if (f.fixer >= 0 && f.s >= parkAt(f.fixer, fixCount[f.fixer] - 1) - 0.01) f.parked = true;
      if (f.s >= m.x1) {
        f.out = through++;
        f.slot = slotOf(f.out, m);
        f.exitY = laneY(m.x1, criteria, f.fixer, m);
        f.run = Math.hypot(f.slot[0] - m.x1, f.slot[1] - f.exitY);
        f.s = Math.min(f.s, m.x1 + f.run);
      }
      if (!f.parked) ahead = f.s;
    }
    const free = floats.filter((f) => f.fixer < 0).length;
    if (finish === null && through === free) finish = time;
  };
  const to = (t) => {
    const steps = Math.max(0, Math.round(t / m.dt));
    for (let n = done + 1; n <= steps; n++) step(n * m.dt);
    done = Math.max(done, steps);
    return {
      floats: floats.map((f) => ({ ...f, ...posOf(f, criteria, m) })),
      rocks: rocks.map((r) => ({ progress: r.progress, by: r.by, started: r.started })),
      through,
      held: fixerOf.filter((j) => j >= 0).length,
      finish,
      t,
    };
  };
  return { to, steps: () => done };
}

// The headline numbers for one setting: floats through, floats left holding rocks, finish time.
export function outcome(criteria, m = MODEL) {
  const r = simulate(criteria, 30, m);
  return { through: r.through, held: r.held, finish: r.finish };
}

// Notional casualties (added with the Battlefield view, owner rule 2026-10-13: success is not free).
// Men down, [friendly, enemy]. Reducing a strongpoint is a fight: the cost accrues with its reduction
// progress. Bypassing one is not free either: as the column passes, the strongpoint fires on it and the
// vehicles left to watch it fire back, so a smaller cost falls once the first free float is past it.
export const LOSS = {
  reduce: { small: [1, 3], medium: [2, 6], large: [3, 11] },
  bypass: { small: [0, 1], medium: [1, 1], large: [1, 2] },
};
// Has the first float not holding a rock gone past rock j's station?
export const passed = (sim, j, m = MODEL) => sim.floats.some((f) => f.fixer < 0 && f.live && f.s >= m.rocks[j].x);
export function casualties(sim, m = MODEL) {
  let blue = 0, red = 0;
  m.rocks.forEach((rock, j) => {
    const r = sim.rocks[j];
    if (r.by) { if (passed(sim, j, m)) { blue += LOSS.bypass[rock.name][0]; red += LOSS.bypass[rock.name][1]; } }
    else { blue += Math.round(LOSS.reduce[rock.name][0] * r.progress); red += Math.round(LOSS.reduce[rock.name][1] * r.progress); }
  });
  return { blue, red };
}
// Short names for the criteria in the readout, so the line keeps its casualty figure under 45 characters.
export const CRITERIA_SHORT = ["Reduce all", "Bypass small", "Bypass ≤ med", "Bypass all"];

// What the card's readout says at a moment of a run: criteria, floats through, time, then men down
// (friendly vs enemy). The floats held back are the gap between the count through and 12.
export function readout(criteria, sim, m = MODEL) {
  const time = (sim.finish ?? sim.t).toFixed(1);
  const c = casualties(sim, m);
  return `${CRITERIA_SHORT[criteria]} · ${sim.through}/${m.n} · ${time} s · ${c.blue} vs ${c.red} down`;
}
