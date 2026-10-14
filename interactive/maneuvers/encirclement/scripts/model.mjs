// The encirclement model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so the
// machine, the battlefield, the readout and the tests all run this one file.
//
// One run, in seconds. The user chooses N, the number of companies in the inner encircling
// arm. The ring's companies sit at fixed bearings round the pocket; the one or two in front
// (the direct pressure force) are in contact from the start, and the rest come round both
// sides in two arms that link up behind the enemy. Then the enemy tries to break out through
// the seam where the arms met. Then the ring is squeezed in to finish the pocket.
//
// Distances are in km. Every number below is a notional teaching value, not doctrine or data.

export const MODEL = {
  R0: 1.8,          // km, pocket radius at linkup (perimeter 11.3 km)
  RF: 0.85,         // km, pocket radius when the squeeze ends
  S: 0.75,          // km of perimeter one company can cover with observation and direct fire
  BW: 0.7,          // km, the gap a breakout needs to get through
  N: [4, 10],       // companies the control allows
  enc: 3.2,         // s, from the arms setting off to linkup
  spacing: 0.09,    // the arms' column spacing, as a share of the half circle
  lag: 0.4,         // s, linkup to the breakout attempt
  hit: 0.9,         // s, the breakout's run from its seat to the ring
  run: 1.7,         // s, a breakout through a gap: seat to clear of the ring
  pause: 0.4,       // s, a stopped breakout's pause at the ring before it falls back
  back: 0.9,        // s, its fall back to its seat
  sqAt: 2.4,        // s after linkup, the squeeze starts
  sq: 3.6,          // s, the squeeze
  tail: 1.2,        // s shown at rest after the squeeze
  KM: 40,           // drawing units per km (both views)
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => { const x = clamp01(v); return x * x * (3 - 2 * x); };
const TAU = Math.PI * 2;

// Largest gap between neighbouring companies on a closed ring of radius r (km); negative = overlap.
export const gapAt = (N, r, m = MODEL) => (TAU * r) / N - m.S;
// The ring is thin when the gap at linkup is wide enough for a breakout.
export const thinOf = (N, m = MODEL) => gapAt(N, m.R0, m) >= m.BW;

// The ring's companies. Bearing `a` in degrees from the seam behind the enemy (0 = the seam,
// 180 = the front, where the direct pressure force is), so the seam is always midway between
// companies 0 and N-1. `d` is the share of the half circle from the front (0 front .. 1 seam).
// Companies within half a slot of the front are the direct pressure force; the rest form two
// arms (left a < 180, right a > 180), each a column whose lead company goes farthest. `at` is
// the arm progress p (0..1) at which a company reaches its place. `tier` stacks overlapping
// neighbours (even 0, odd 1, the last of an odd ring 2), like the leaves of an iris.
export function companies(N, m = MODEL) {
  const list = [];
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) * 360 / N;
    const d = Math.abs(a - 180) / 180;
    const front = Math.abs(a - 180) <= 180 / N + 1e-9;
    list.push({ i, a, d, front, arm: front ? 0 : a < 180 ? -1 : 1, tier: N % 2 && i === N - 1 ? 2 : i % 2 });
  }
  for (const arm of [-1, 1]) {
    const mine = list.filter((c) => c.arm === arm).sort((x, y) => y.d - x.d);
    mine.forEach((c, k) => { c.k = k; c.raw = c.d + k * m.spacing; });
  }
  const top = Math.max(...list.filter((c) => c.arm).map((c) => c.raw));
  for (const c of list) c.at = c.arm ? c.raw / top : 0;
  return list;
}

// How far in a company is at arm progress p: 0 = still coming round, 1 = in its place. A company
// steps in over the last 0.3 of progress before it arrives.
export const inAt = (c, p) => (c.front ? 1 : smooth((p - c.at) / 0.3 + 1));

// Casualties (notional): vehicles knocked out in the drawn engagement, blue (friendly) and red
// (enemy). The enemy is a battalion of 10 vehicles: three companies of three and a headquarters.
// Contact while the ring closes costs each side 1. A breakout through a gap costs the two
// companies at the seam 1 each and the breakout 1, and the rest of its company (2) gets away; a
// breakout that hits a closed seam loses 2 and costs blue 1. The squeeze costs blue 1 and the
// enemy 1 per company still in the pocket (2 if a company got away, 3 if not); the rest surrender.
export const LOSS = { contact: [1, 1], breach: [2, 1], stopped: [1, 2], escaped: 2, squeeze: 1, enemy: 10 };

// The run's clock: when each thing happens.
export function timesOf(m = MODEL) {
  const link = m.enc, b = link + m.lag;
  return { link, b, hit: b + m.hit * 0.85, sq0: link + m.sqAt, sq1: link + m.sqAt + m.sq, end: link + m.sqAt + m.sq + m.tail };
}

export function downAt(t, N, m = MODEL, L = LOSS) {
  const T = timesOf(m), thin = thinOf(N, m);
  let blue = 0, red = 0;
  if (t >= T.link) { blue += L.contact[0]; red += L.contact[1]; }
  if (t >= T.hit) { const x = thin ? L.breach : L.stopped; blue += x[0]; red += x[1]; }
  const left = 3 - (thin ? 1 : 0);   // enemy companies still in the pocket
  const f = clamp01((t - T.sq0) / m.sq);
  if (f >= 0.5) blue += L.squeeze;
  red += Math.min(left, Math.floor(f * (left + 1)));
  const escaped = thin && t >= T.hit ? L.escaped : 0;
  const surrendered = t >= T.sq1 ? L.enemy - red - escaped : 0;
  return { blue, red, escaped, surrendered };
}

// The full state at time t for N companies.
export function stateAt(t, N, m = MODEL) {
  const T = timesOf(m), thin = thinOf(N, m);
  const p = clamp01(t / m.enc);
  const linked = t >= T.link;
  // the breakout: out = 0 at its seat, 1 at the ring (stopped) or clear of it (through a gap)
  let out = 0;
  if (t > T.b) {
    if (thin) out = smooth((t - T.b) / m.run);
    else {
      const u = t - T.b;
      out = u < m.hit ? smooth(u / m.hit) : u < m.hit + m.pause ? 1 : 1 - smooth((u - m.hit - m.pause) / m.back);
    }
  }
  const sq = smooth((t - T.sq0) / m.sq);
  const r = m.R0 + (m.RF - m.R0) * sq;
  const down = downAt(t, N, m);
  let phase = "idle";
  if (t > 0) phase = "closing";
  if (linked) phase = "linked";
  if (t >= T.hit) phase = thin ? "escaping" : "stopped";
  if (t > T.sq0) phase = "squeeze";
  if (t >= T.sq1) phase = "done";
  return { p, linked, out, thin, sq, r, gap: gapAt(N, r, m), phase, down, t };
}

export const endOf = (m = MODEL) => timesOf(m).end;

// The card's readout, under 45 characters, ending with blue vs red vehicles down.
export function readoutOf(s, N, m = MODEL) {
  const c = s.down, down = `${c.blue} vs ${c.red} down`;
  if (s.phase === "idle") return `${N} companies · gaps ${gapAt(N, m.R0, m).toFixed(2)} km at linkup`;
  if (s.phase === "closing") {
    const cs = companies(N, m), share = cs.reduce((a, x) => a + inAt(x, s.p), 0) / N;
    return `Arms closing · ring ${Math.round(share * 100)}% · ${down}`;
  }
  if (s.phase === "linked") return `Ring closed · gaps ${s.gap.toFixed(2)} km · ${down}`;
  if (s.phase === "escaping") return `Breakout gets through · ${down}`;
  if (s.phase === "stopped") return `Breakout stopped · ${down}`;
  if (s.phase === "squeeze") return `Squeeze · ring ${(Math.PI * 2 * s.r).toFixed(1)} km · ${down}`;
  return s.thin ? `Part got out · rest surrender · ${down}` : `Pocket surrenders · ${down}`;
}
