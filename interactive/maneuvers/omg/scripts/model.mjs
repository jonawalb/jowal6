// The OMG model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Distances are km along the axis of advance, measured from the front face of the
// enemy's defended line (x = 0). Time is in days from the start of the attack.
// Every number here is NOTIONAL (a bench setting), except where noted. The one
// sourced figure, "100 kilometers or more beyond other army forces" (FM 100-2-1,
// 1984, p. 4-9), is matched by the track length, not used in any calculation.

export const MODEL = {
  line: [0, 6],          // the defended line, front and rear face (km)
  breach: [0.2, 0.5],    // the gate drops over these days, once the first echelon reaches the line
  wedgeIn: 0.25,         // day the first-echelon wedges reach the line
  speed: 80,             // OMG road speed once clear of the spring, km/day (notional)
  kick: 0.08,            // spring launch time constant, days (notional)
  start: -11,            // OMG nose when cocked behind the line (km)
  length: 6,             // OMG carriage length (km)
  end: 110,              // nose stops at the end buffer (km): 104 km past the line
  release: [0.5, 2.0],   // the release slider: earliest is the moment the breach is open
  targets: [             // drop targets in the rear, by nose position (km)
    { x: 30, name: "air defense" },
    { x: 54, name: "command post" },
    { x: 76, name: "missile launcher" },
    { x: 98, name: "depot" },
  ],
  reserve: { face: 42, depth: 6, move: 0.8, enter: 1.4, arrive: 1.5, close: 0.1 }, // large operational reserve (notional)
  lift: 0.03,            // latch pin lift time before release, days
  days: 4,               // the day clock runs 0..4
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };

// Nose position on a free run (no reserve), released on day r.
export function runAt(t, r, m = MODEL) {
  if (t <= r) return m.start;
  const tau = t - r;
  const s = m.speed * (tau - m.kick * (1 - Math.exp(-tau / m.kick)));
  return Math.min(m.end, m.start + s);
}

// First day the free-running nose reaches x (bisection on the monotone run).
export function timeAt(x, r, m = MODEL) {
  if (x <= m.start) return r;
  let lo = r, hi = r + 10;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (runAt(mid, r, m) >= x) hi = mid; else lo = mid;
  }
  return hi;
}

// With a large reserve, the OMG gets through only if its nose is past the reserve's
// lane before the reserve starts to enter it.
export function blockedBy(r, reserves, m = MODEL) {
  return reserves && timeAt(m.reserve.face, r, m) > m.reserve.enter;
}

// Latest release (days) that still beats a large reserve.
export const latestRelease = (m = MODEL) => {
  let lo = m.release[0] - 1, hi = m.release[1] + 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (blockedBy(mid, true, m)) hi = mid; else lo = mid;
  }
  return lo;
};

// Everything the bench shows at day t, released on day r, with or without a large reserve.
export function stateAt(t, r, reserves, m = MODEL) {
  const blocked = blockedBy(r, reserves, m);
  let nose = runAt(t, r, m);
  if (blocked) nose = Math.min(nose, m.reserve.face - 0.4);
  const wedge = smooth(t / m.wedgeIn);                                    // 0..1, first echelon to the line
  const gate = smooth((t - m.breach[0]) / (m.breach[1] - m.breach[0]));   // 0 shut .. 1 down
  // reserve: 0 parked .. 0.85 at the lane edge .. 1 across the lane
  let res = 0;
  if (reserves) {
    const R = m.reserve;
    const edge = 0.85 * smooth((t - R.move) / (R.enter - R.move));
    // through: it waits at the lane edge until the OMG's tail clears, then closes behind it
    const go = blocked ? R.enter : Math.max(R.enter, timeAt(R.face + R.depth + m.length, r, m));
    res = t < go ? edge : 0.85 + 0.15 * smooth((t - go) / R.close);
  }
  const hit = m.targets.map((g) => clamp01((nose - g.x + 1.3) / 2.6));   // the finger crosses the block
  const hits = m.targets.filter((g) => nose >= g.x).length;
  const released = t > r;
  const pin = clamp01((t - (r - m.lift)) / m.lift);     // latch pin lifts just before release
  const done = blocked ? nose >= m.reserve.face - 0.41 : nose >= m.end;
  return { nose, pin, wedge, gate, res, hit, hits, blocked, released, done, past: nose - m.line[1] };
}

// The day the run is over (the OMG has stopped), for the replay length.
export function endOf(r, reserves, m = MODEL) {
  if (blockedBy(r, reserves, m)) return timeAt(m.reserve.face - 0.4, r, m);
  return timeAt(m.end, r, m);
}

const day = (t) => "Day " + t.toFixed(1);

// The card readout, always under 45 characters.
export function readoutOf(t, r, reserves, m = MODEL) {
  const s = stateAt(t, r, reserves, m);
  const n = m.targets.length;
  if (!s.released) return day(t) + (s.gate < 1 ? " · breach opening · OMG held" : " · breach open · OMG held");
  if (s.blocked && s.done) return day(t) + " · blocked by reserve · " + s.hits + " of " + n + " hit";
  if (s.nose < m.line[0]) return day(t) + " · OMG released · " + s.hits + " of " + n + " hit";
  if (s.past < 0) return day(t) + " · OMG in the breach";
  const km = Math.round(s.past);
  return day(t) + " · " + km + " km past line · " + s.hits + " of " + n + " hit";
}

// ---------- Battlefield view (added 2026-10-13) ----------
// Losses, NOTIONAL teaching values, not data: armored vehicles knocked out, Soviet (red) and NATO
// (blue). The breach costs both sides as it opens; each raided target costs the raiders a few and the
// defenders more; a reserve that blocks the OMG forces the decisive fight the manual says the OMG tries
// to avoid, and that costs the OMG most.
export const LOSSES = {
  breach: [40, 22],   // Soviet, NATO: the first echelon's fight to open the breach, by day 0.5
  target: [3, 6],     // per raided target
  block: [34, 14],    // the fight when a large reserve blocks the OMG
  fight: 0.3,         // days the blocking fight takes to reach its full cost
};

// Losses so far at day t, released on day r, with or without a large reserve: { sov, nato }.
export function lossesAt(t, r, reserves, m = MODEL, l = LOSSES) {
  const s = stateAt(t, r, reserves, m);
  const open = smooth(t / m.breach[1]);
  const raided = s.hit.reduce((a, h) => a + h, 0);
  let f = 0;
  if (s.blocked) f = smooth((t - timeAt(m.reserve.face - 0.4, r, m)) / l.fight);
  const sov = l.breach[0] * open + l.target[0] * raided + l.block[0] * f;
  const nato = l.breach[1] * open + l.target[1] * raided + l.block[1] * f;
  return { sov: Math.round(sov), nato: Math.round(nato), fight: f };
}

// The card readout in the Battlefield view: the same state, with losses as "N vs M down"
// (Soviet vs NATO). Always under 45 characters.
export function fieldReadoutOf(t, r, reserves, m = MODEL) {
  const s = stateAt(t, r, reserves, m);
  const c = lossesAt(t, r, reserves, m);
  const down = " · " + c.sov + " vs " + c.nato + " down";
  const n = m.targets.length;
  if (!s.released) return day(t) + (s.gate < 1 ? " · breach opening" : " · breach open") + down;
  if (s.blocked && s.done) return day(t) + " · blocked · " + s.hits + "/" + n + " hit" + down;
  if (s.past < 0) return day(t) + " · OMG in the breach" + down;
  return day(t) + " · " + Math.round(s.past) + " km · " + s.hits + "/" + n + " hit" + down;
}
