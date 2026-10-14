// The recon-pull model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// A run is { mode: "pull" | "push", open: [5 booleans], planned: lane index }.
// Everything the bench shows (scout, diverter, marbles, stopwatch, readout) is a
// function of the run and the time since it started. All rates are notional.

export const MODEL = {
  lanes: [-52, -26, 0, 26, 52], // lane centre lines, x
  gateY: -38,                   // gate wall centre plane
  feedY: 18,                    // feeder groove, y
  magX: -72,                    // escapement: where the first marble waits (the queue runs back along -x)
  r: 4,                         // marble radius
  D: 8.4,                       // spacing of marbles queued nose to tail
  n: 7,                         // marbles in the main body
  v: 60,                        // marble speed, units per second
  gap: 0.26,                    // seconds between released marbles
  scoutPark: -72,               // scout carriage parked at the left end of the wall
  scoutSpeed: 70,               // scout carriage speed, units per second
  dip: 0.25,                    // seconds for the feeler to go down (or up)
  hold: 0.1,                    // seconds the feeler rests on a shut gate
  divertPark: 68,               // diverter parked clear of every lane
  divertSpeed: 120,             // diverter speed, units per second
  pushStart: 0.4,               // push: the plan releases the main body at once
  boardZ: 7.2,                  // marble centre height on the track board (sunk 0.6 in its groove)
  trayZ: 5.5,                   // marble centre height in the tray
  tray: [[0, -74], [-8.4, -74], [8.4, -74], [-4.2, -66.7], [4.2, -66.7], [-8.4, -59.4], [8.4, -59.4]],
};

// Enemy layouts the "new layout" button steps through (true = gap, false = held).
export const LAYOUTS = [
  [false, true, true, false, false],  // A: the planned lane (3) is open
  [false, true, false, false, true],  // B: the planned lane is held; lanes 2 and 5 open
  [true, false, false, true, false],
  [false, false, false, true, true],
  [false, false, true, false, true],
  [true, false, false, false, false],
];

const pathLen = (pts) => pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// The scout's schedule: which gates it probes and when.
export function plan(run, m = MODEL) {
  const stops = [];
  let x = m.scoutPark, t = 0, found = null;
  const order = run.mode === "pull" ? m.lanes.map((_, i) => i) : [run.planned];
  for (const i of order) {
    const arrive = t + Math.abs(m.lanes[i] - x) / m.scoutSpeed;
    const down = arrive + m.dip;
    const open = !!run.open[i];
    const leave = open ? Infinity : down + m.hold + m.dip;
    stops.push({ lane: i, from: x, arrive, down, leave, open });
    x = m.lanes[i];
    t = leave;
    if (open) { found = i; break; }
  }
  let lane, release, divertFrom, divertAt;
  if (run.mode === "push") {
    lane = run.planned;
    release = m.pushStart;
    divertFrom = m.lanes[lane];
    divertAt = 0;
  } else {
    lane = found;
    divertFrom = m.divertPark;
    divertAt = found === null ? Infinity : stops[stops.length - 1].down;
    release = found === null ? Infinity : divertAt + Math.abs(m.divertPark - m.lanes[found]) / m.divertSpeed;
  }
  return { stops, found, lane, release, divertFrom, divertAt };
}

// Scout carriage position and feeler dip (0 up, 1 down) at time t.
export function scoutAt(run, t, m = MODEL, p = plan(run, m)) {
  let x = m.scoutPark, dip = 0;
  for (const s of p.stops) {
    if (t < s.arrive) {
      const span = s.arrive - (s === p.stops[0] ? 0 : p.stops[p.stops.indexOf(s) - 1].leave);
      const f = span > 0 ? 1 - (s.arrive - t) / span : 1;
      x = s.from + (m.lanes[s.lane] - s.from) * smooth(f);
      return { x, dip: 0 };
    }
    x = m.lanes[s.lane];
    if (t < s.down) dip = (t - s.arrive) / m.dip;
    else if (t < s.down + m.hold) dip = 1;
    else if (t < s.down + m.hold + m.dip) dip = 1 - (t - s.down - m.hold) / m.dip;
    else dip = 0; // a found gap: the feeler lifts clear and the carriage waits over it
    if (t < s.leave) return { x, dip: smooth(dip) };
  }
  return { x, dip: 0 };
}

// Diverter x at time t.
export function divertAt(run, t, m = MODEL, p = plan(run, m)) {
  if (p.lane === null || t <= p.divertAt) return p.divertFrom;
  const to = m.lanes[p.lane];
  const span = p.release - p.divertAt;
  const f = span > 0 ? Math.min(1, (t - p.divertAt) / span) : 1;
  return p.divertFrom + (to - p.divertFrom) * smooth(f);
}

function smooth(f) {
  const c = Math.max(0, Math.min(1, f));
  return c * c * (3 - 2 * c);
}

// The route of marble i into lane `lane`: magazine, feeder, lane, gate, tray slot.
export function route(lane, i, m = MODEL) {
  const x = m.lanes[lane];
  const [dx, sy] = m.tray[i % m.tray.length];
  return [[m.magX, m.feedY], [x, m.feedY], [x, m.gateY + 2], [x, m.gateY - 6], [x + dx, sy]];
}

// Arc length from the escapement to where a marble stops against a held gate.
export function stopLen(lane, m = MODEL) {
  const pts = route(lane, 0, m).slice(0, 3);
  return pathLen(pts) - (m.r - 1.2 + 0.4); // 0.4 clear of the shutter face (gate plane - 0.8)
}
export const gateLen = (lane, m = MODEL) => pathLen(route(lane, 0, m).slice(0, 3)) + 2; // centre at the gate plane

// Marble i at time t: [x, y, z].
export function marbleAt(run, i, t, m = MODEL, p = plan(run, m)) {
  const lane = p.lane;
  let s = -i * m.D;
  if (lane !== null && Number.isFinite(p.release)) s = Math.max(s, (t - p.release - i * m.gap) * m.v);
  if (s <= 0 || lane === null) return [m.magX + s, m.feedY, m.boardZ];
  const pts = route(lane, i, m);
  const total = pathLen(pts);
  if (!run.open[lane]) s = Math.min(s, stopLen(lane, m) - i * m.D);
  s = Math.min(s, total);
  if (s <= 0) return [m.magX + s, m.feedY, m.boardZ];
  let left = s;
  for (let k = 1; k < pts.length; k++) {
    const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
    const len = Math.hypot(bx - ax, by - ay);
    if (left <= len || k === pts.length - 1) {
      const f = len ? Math.min(1, left / len) : 1;
      const x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
      return [x, y, zAt(y, m)];
    }
    left -= len;
  }
  return [...pts[pts.length - 1], m.trayZ];
}

// Centre height: on the board in front of the wall, easing down through the gate to the tray floor.
export function zAt(y, m = MODEL) {
  const y0 = m.gateY + 2, y1 = m.gateY - 6;
  if (y >= y0) return m.boardZ;
  if (y <= y1) return m.trayZ;
  return m.boardZ + (m.trayZ - m.boardZ) * smooth((y0 - y) / (y0 - y1));
}

// When the first marble of the main body passes the gate (Infinity if it never does).
export function firstThrough(run, m = MODEL, p = plan(run, m)) {
  if (p.lane === null || !run.open[p.lane]) return Infinity;
  return p.release + gateLen(p.lane, m) / m.v;
}
export function allThrough(run, m = MODEL, p = plan(run, m)) {
  const f = firstThrough(run, m, p);
  return f + (m.n - 1) * m.gap;
}
// When the first marble comes to rest against a held gate (push into a held lane).
export function stallAt(run, m = MODEL, p = plan(run, m)) {
  if (p.lane === null || run.open[p.lane]) return Infinity;
  return p.release + stopLen(p.lane, m) / m.v;
}
// When the run has nothing left to move.
export function runEnd(run, m = MODEL, p = plan(run, m)) {
  const f = firstThrough(run, m, p);
  if (Number.isFinite(f)) {
    const last = p.release + (m.n - 1) * m.gap + pathLen(route(p.lane, m.n - 1, m)) / m.v;
    return last;
  }
  if (p.lane !== null) return p.release + (stopLen(p.lane, m) - (m.n - 1) * m.D) / m.v + (m.n - 1) * m.gap + 0.1;
  const s = p.stops[p.stops.length - 1];
  return s ? s.leave : 0;
}

// The readout line.
export function status(run, t, m = MODEL, p = plan(run, m)) {
  const sec = (x) => x.toFixed(1) + " s";
  const lane = (i) => "lane " + (i + 1);
  if (run.mode === "push") {
    const f = firstThrough(run, m, p);
    if (Number.isFinite(f)) return t >= f ? `Push · ${lane(p.lane)} open · through ${sec(f)}` : `Push · ${lane(p.lane)} planned · ${sec(t)}`;
    const st = stallAt(run, m, p);
    return t >= st ? `Push · ${lane(p.lane)} held · stalled` : `Push · ${lane(p.lane)} planned · ${sec(t)}`;
  }
  if (p.found === null) {
    const last = p.stops[p.stops.length - 1];
    if (t >= last.leave) return "Pull · no gap found";
  }
  const f = firstThrough(run, m, p);
  if (Number.isFinite(f) && t >= f) return `Pull · ${lane(p.found)} open · through ${sec(f)}`;
  if (p.found !== null && t >= p.stops[p.stops.length - 1].down) return `Pull · ${lane(p.found)} open · ${sec(t)}`;
  let probing = p.stops[0].lane;
  for (const s of p.stops) if (t >= s.arrive - 0.3) probing = s.lane;
  return `Pull · probing ${lane(probing)} · ${sec(t)}`;
}

// ---- Casualties (notional, added with the Battlefield view) ----
// Success is not free, but losses follow contact. Men down, as events in time:
//  - each held gate the scouts check is a brush with the enemy: at the 1st, 3rd and 5th such contact
//    one scout goes down and one enemy at that gate (so ceil(h / 2) each for h held gates checked);
//  - a main body going through a gap takes fire from each held gate next to it: one man down in a
//    passing group and one enemy down at that gate (the main body fires back as it passes);
//  - a main body stalled at a held gate fights there: five more men down in the lead groups and one
//    more enemy at that gate.
// All counts and timings are teaching values, not loss rates from data or doctrine.
export const LOSS = { scoutHit: 0.2, enemyHit: 0.32, passGroups: [1, 3], stall: [0.4, 0.9, 1.5, 2.2, 3.0], stallGroups: [0, 0, 1, 0, 1], stallRed: 1.2 };
export function losses(run, m = MODEL, p = plan(run, m), L = LOSS) {
  const ev = [];
  let h = 0;
  for (const s of p.stops) {
    if (s.open) continue;
    if (h % 2 === 0) {
      ev.push({ side: "f", kind: "scout", k: h / 2, lane: s.lane, t: s.down + L.scoutHit });
      ev.push({ side: "h", kind: "enemy", lane: s.lane, t: s.down + L.enemyHit });
    }
    h++;
  }
  if (p.lane !== null && run.open[p.lane]) {
    const nb = [p.lane - 1, p.lane + 1].filter((j) => j >= 0 && j < m.lanes.length && !run.open[j]);
    nb.forEach((j, i) => {
      const g = L.passGroups[i];
      const t = p.release + g * m.gap + gateLen(p.lane, m) / m.v;
      ev.push({ side: "f", kind: "body", g, lane: p.lane, t });
      ev.push({ side: "h", kind: "enemy", lane: j, t: t + 0.15 });
    });
  } else if (p.lane !== null) {
    const st = stallAt(run, m, p);
    L.stall.forEach((dt, i) => ev.push({ side: "f", kind: "body", g: L.stallGroups[i], lane: p.lane, t: st + dt }));
    ev.push({ side: "h", kind: "enemy", lane: p.lane, t: st + L.stallRed });
  }
  return ev.sort((a, b) => a.t - b.t);
}
export function downAt(run, t, m = MODEL, p = plan(run, m)) {
  let blue = 0, red = 0;
  for (const e of losses(run, m, p)) if (e.t <= t) { if (e.side === "f") blue++; else red++; }
  return { blue, red };
}
// The readout: the bench's status line, then friendly vs enemy men down.
export function readoutOf(run, t, m = MODEL, p = plan(run, m)) {
  const d = downAt(run, t, m, p);
  return `${status(run, t, m, p)} · ${d.blue} vs ${d.red} down`;
}
