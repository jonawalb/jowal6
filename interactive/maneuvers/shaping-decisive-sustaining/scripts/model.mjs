// The press-line model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine: a feeder (sustaining) supplies flat sheets, a shaping
// press pre-bends each one, and a decisive press makes the final bend. Every
// rate, angle and limit here is a teaching number, stated as such on the page.

export const MODEL = {
  cycle: 1.8,      // seconds between sheets from the feeder
  speed: 90,       // conveyor speed, world units per second
  dwell: 0.6,      // seconds per press stroke (down and up)
  push: 0.45,      // seconds for the feeder's pusher stroke
  pushLen: 30,     // world units the pusher moves a sheet out of the magazine
  perStroke: 45,   // most bend one die can add in one stroke, degrees
  target: 90,      // finished bend, degrees
  tol: 1,          // a part within this many degrees of target is good
  gap: 36,         // closest two sheets may ride on the conveyor, units
  land: 0.5,       // seconds to slide off the conveyor into the bin
  tau: 10,         // seconds, smoothing of the output meter
};

// Where things sit on the line (world x). Shared with the drawing.
export const LINE = { feed: -125, shape: -45, decide: 45, end: 112, bin: 135 };
export const STAGES = ["feed", "shape", "decide"];
export const STAGE_NAMES = { feed: "Feeder", shape: "Shaping", decide: "Decisive" };

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Bend a sheet leaves the line with, given which presses run.
export const finalBend = (on, m = MODEL) =>
  Math.min(m.target, (on.shape ? m.perStroke : 0) + (on.decide ? m.perStroke : 0));

// What happens to each sheet: "good", "scrap" or "none" (the feeder sends nothing).
export function verdict(on, m = MODEL) {
  if (!on.feed) return "none";
  return Math.abs(finalBend(on, m) - m.target) <= m.tol ? "good" : "scrap";
}

// Good parts per minute once the line has settled.
export const steadyRate = (on, m = MODEL) => (verdict(on, m) === "good" ? 60 / m.cycle : 0);

export function newLine(m = MODEL) {
  // Starts as if it had been running: the meter at its steady value.
  return { sheets: [], feedT: m.cycle, rate: 60 / m.cycle, ram: [0, 0], push: 1, good: 0, scrap: 0, bin: { good: 0, scrap: 0 }, id: 0 };
}

// One time step of the line. `on` = { feed, shape, decide } booleans.
export function stepLine(L, on, dt, m = MODEL) {
  const X = [LINE.shape, LINE.decide];
  const keys = ["shape", "decide"];
  L.rate -= (L.rate * dt) / m.tau;
  // feeder
  if (on.feed) L.feedT += dt;
  const pushing = L.sheets.some((s) => s.mode === "push");
  const last = L.sheets.filter((s) => s.mode !== "land").reduce((lo, s) => Math.min(lo, s.x), Infinity);
  if (on.feed && !pushing && L.feedT >= m.cycle && last > LINE.feed + m.pushLen + m.gap) {
    L.sheets.push({ id: ++L.id, x: LINE.feed, y: 0, z: 0, bend: 0, from: 0, mode: "push", t: 0, next: 0 });
    L.feedT = 0;
  }
  L.push = 1;
  L.ram = [0, 0];
  // front to back, so each sheet sees where the one ahead has got to
  const order = [...L.sheets].sort((a, b) => b.x - a.x);
  let ahead = Infinity;
  for (const s of order) {
    if (s.mode === "land") {
      s.t += dt;
      if (s.t >= m.land) s.done = true;
      continue;
    }
    if (s.mode === "push") {
      s.t += dt;
      const f = s.t / m.push;
      s.x = LINE.feed + m.pushLen * ease(f);
      L.push = Math.min(L.push, f);
      if (f >= 1) s.mode = "move";
    } else if (s.mode === "press") {
      s.t += dt;
      const f = Math.min(1, s.t / m.dwell);
      s.stroke = f < 0.5 ? ease(f * 2) : 1 - ease((f - 0.5) * 2);
      s.bend = Math.min(m.target, s.from + m.perStroke * ease(f * 2));
      L.ram[s.next] = s.stroke;
      if (f >= 1) { s.mode = "move"; s.stroke = 0; s.next++; }
    } else {
      let x = Math.min(s.x + m.speed * dt, ahead - m.gap);
      x = Math.max(x, s.x);
      while (s.next < 2 && x >= X[s.next] && !on[keys[s.next]]) s.next++;
      if (s.next < 2 && x >= X[s.next]) {
        x = X[s.next];
        s.mode = "press"; s.t = 0; s.from = s.bend; s.stroke = 0;
      } else if (s.next >= 2 && x >= LINE.end) {
        x = LINE.end;
        s.mode = "land"; s.t = 0;
        s.good = Math.abs(s.bend - m.target) <= m.tol;
        s.dest = s.good ? -13 : 12;
      }
      s.x = x;
    }
    ahead = s.x;
  }
  for (const s of L.sheets) {
    if (!s.done) continue;
    if (s.good) { L.good++; L.bin.good++; L.rate += 60 / m.tau; } else { L.scrap++; L.bin.scrap++; }
  }
  L.sheets = L.sheets.filter((s) => !s.done);
  return L;
}

// Where a landing sheet is, f in 0..1 of its slide into the bin.
export function landing(s, m = MODEL) {
  const f = ease(Math.min(1, s.t / m.land));
  return { x: LINE.end + (LINE.bin - LINE.end) * f, y: s.dest * f, drop: f };
}

// Short status for the readout.
export function status(on) {
  const off = STAGES.filter((k) => !on[k]);
  if (!off.length) return "Line running";
  if (off.length === 1) return STAGE_NAMES[off[0]] + " stopped";
  return off.length + " stages stopped";
}

// ---------- Battlefield view only (added 2026-10-13; all notional teaching values) ----------
// The same switches `on` drive a brigade-sized vignette: artillery and scouts shape, a lit
// mechanized battalion makes the decisive attack, supply trucks sustain. Each change of the
// switches replays the attack from its attack position; `b` (0..1) is how far that replay has run.
export const FIELD = {
  replay: 3.2,       // seconds for one replay of the attack
  reach: { all: 1, noShape: 0.42, noFeed: 0.55 }, // share of the way to the objective the attack gets
};

// How far the decisive attack gets, as a share of the distance from its attack position to the
// objective: all the way (1) only with all three running. Without the decisive operation it never
// leaves its attack position; unshaped, it is stopped by the enemy's unsuppressed fire; unsustained,
// it runs short of fuel and ammunition and stalls.
export function attackReach(on, m = FIELD) {
  if (!on.decide) return 0;
  return Math.min(on.shape ? 1 : m.reach.noShape, on.feed ? 1 : m.reach.noFeed);
}

// Notional losses for one replay, counted in vehicles (one per platoon). Blue: one scout vehicle when
// the scouts are out (shaping running), and attack vehicles: 2 with the enemy suppressed, 5 without,
// one more if the attack stalls for lack of supply. Red: 3 to the shaping fires (2 if the guns run short
// of ammunition), plus 3 to the attack when it is shaped and sustained, or 1 when it is not.
export function losses(on) {
  const scout = on.shape ? 1 : 0;
  const attack = on.decide ? (on.shape ? 2 : 5) + (on.feed ? 0 : 1) : 0;
  const red = (on.shape ? (on.feed ? 3 : 2) : 0) + (on.decide ? (on.shape && on.feed ? 3 : 1) : 0);
  return { scout, attack, blue: scout + attack, red };
}

// Losses so far, b of the way through a replay: each loss falls at its own point of the replay.
export function lossesAt(on, b) {
  const L = losses(on), f = (n) => Math.min(n, Math.floor(n * Math.max(0, Math.min(1, b)) + 0.5));
  const scout = f(L.scout), attack = f(L.attack);
  return { scout, attack, blue: scout + attack, red: f(L.red) };
}

// Short status for the Battlefield readout ("N vs M down" is added by the page: friendly vs enemy).
export const FIELD_NAMES = { feed: "Sustaining", shape: "Shaping", decide: "Decisive" };
export function fieldStatus(on, b) {
  const off = STAGES.filter((k) => !on[k]);
  if (off.length === 1) return FIELD_NAMES[off[0]] + " stopped";
  if (off.length > 1) return off.length + " stages stopped";
  return b >= 1 ? "Objective seized" : "Attack going in";
}
