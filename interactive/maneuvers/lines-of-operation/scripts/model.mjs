// The lines model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine: every schedule below is a teaching shape. Campaign time t
// runs 0..1. Each line's progress p runs 0..1, where 1 means its carriage is home at
// the terminal (the end state). A line of operation travels ground and pauses at its
// decisive points; a line of effort steps from task to task.

export const MODEL = {
  move: 0.04, // campaign time one line-of-effort task step takes to slide to the next detent
  lines: [
    // Lines of operation: knots [t, p]; the flat stretches are the pauses at decisive points.
    { id: "loo-a", kind: "loo", name: "LOO A", dps: [0.3, 0.6, 0.85],
      knots: [[0, 0], [0.12, 0.3], [0.2, 0.3], [0.32, 0.6], [0.4, 0.6], [0.52, 0.85], [0.58, 0.85], [0.66, 1]] },
    { id: "loo-b", kind: "loo", name: "LOO B", dps: [0.35, 0.7],
      knots: [[0.05, 0], [0.2, 0.35], [0.3, 0.35], [0.45, 0.7], [0.55, 0.7], [0.72, 1]] },
    // Lines of effort: the campaign time each of five tasks is finished; the fifth sets the condition.
    { id: "loe-1", kind: "loe", name: "LOE 1", tasks: [0.1, 0.25, 0.4, 0.55, 0.78] },
    { id: "loe-2", kind: "loe", name: "LOE 2", tasks: [0.15, 0.3, 0.5, 0.7, 0.88] },
    { id: "loe-3", kind: "loe", name: "LOE 3", tasks: [0.2, 0.4, 0.62, 0.8, 0.97] },
  ],
  stall: { id: "loe-3", after: 3 }, // the "stall" control: LOE 3 never gets past its third task
};

const smooth = (x) => x * x * (3 - 2 * x);

// Progress of one line at campaign time t, 0..1.
export function progress(line, t, stalled = false, m = MODEL) {
  if (line.kind === "loo") {
    const k = line.knots;
    if (t <= k[0][0]) return 0;
    for (let i = 1; i < k.length; i++) {
      const [t0, p0] = k[i - 1], [t1, p1] = k[i];
      if (t <= t1) return p0 + (p1 - p0) * smooth((t - t0) / (t1 - t0));
    }
    return 1;
  }
  const n = line.tasks.length;
  const limit = stalled && m.stall.id === line.id ? m.stall.after : n;
  let p = 0;
  for (let i = 0; i < limit; i++) {
    const end = line.tasks[i];
    if (t >= end) p = (i + 1) / n;
    else if (t > end - m.move) p = (i + smooth((t - (end - m.move)) / m.move)) / n;
  }
  return p;
}

// Everything the readout and the drawing need at campaign time t.
export function state(t, stalled = false, m = MODEL) {
  const p = m.lines.map((line) => progress(line, t, stalled, m));
  const home = p.map((x) => x >= 0.999);
  const loo = m.lines.filter((l, i) => l.kind === "loo" && home[i]).length;
  const loe = m.lines.filter((l, i) => l.kind === "loe" && home[i]).length;
  const tasks = m.lines.map((l, i) => (l.kind === "loe" ? Math.floor(p[i] * l.tasks.length + 1e-6) : null));
  return { p, home, loo, loe, tasks, end: home.every(Boolean) };
}

// First campaign time at which every line is home (the end state), or null if never.
export function endTime(stalled = false, m = MODEL) {
  for (let i = 0; i <= 1000; i++) if (state(i / 1000, stalled, m).end) return i / 1000;
  return null;
}

// The live readout text, kept under 45 characters.
export function readoutText(t, stalled = false, m = MODEL) {
  const s = state(t, stalled, m);
  const nLoo = m.lines.filter((l) => l.kind === "loo").length;
  const nLoe = m.lines.length - nLoo;
  const head = "T+" + Math.round(t * 100) + "%";
  if (s.end) return head + " · all " + m.lines.length + " lines in · end state";
  return head + " · LOO " + s.loo + "/" + nLoo + " · LOE " + s.loe + "/" + nLoe + " · not set";
}

// ---- Battlefield view (notional) ----
// Each pause of a line of operation at a decisive point is a fight for that point. fightShare is how
// far through that pause campaign time t is (0 before it starts, 1 once the line moves on).
export function fightShare(line, k, t) {
  const t0 = line.knots[2 * k + 1][0], t1 = line.knots[2 * k + 2][0];
  return Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
}

// Casualties (notional, men down on each side). Each decisive point costs the line that takes it the
// numbers below, accrued over its fight. The lines of effort cost nothing while every line advances;
// with line of effort 3 stalled, in this model insurgents come back to the villages it never reached
// and attack the checkpoints there at T+72%, T+82% and T+92%.
export const LOSSES = {
  dp: { "loo-a": [[4, 9], [7, 12], [5, 8]], "loo-b": [[4, 8], [6, 11]] }, // [blue, red] per decisive point
  raids: [[0.72, 1, 0], [0.82, 1, 1], [0.92, 1, 1]],                      // [t, blue, red] with LOE 3 stalled
};
export function casualties(t, stalled = false, m = MODEL, L = LOSSES) {
  let blue = 0, red = 0;
  for (const line of m.lines) {
    if (line.kind !== "loo") continue;
    L.dp[line.id].forEach(([b, r], k) => { const f = fightShare(line, k, t); blue += b * f; red += r * f; });
  }
  blue = Math.round(blue); red = Math.round(red);
  if (stalled) for (const [tr, b, r] of L.raids) if (t >= tr) { blue += b; red += r; }
  return { blue, red };
}

// The Battlefield view's readout: the same campaign state, with the casualty count in place of
// "not set" (under 45 characters).
export function fieldReadoutText(t, stalled = false, m = MODEL) {
  const s = state(t, stalled, m);
  const c = casualties(t, stalled, m), down = c.blue + " vs " + c.red + " down";
  const nLoo = m.lines.filter((l) => l.kind === "loo").length;
  const nLoe = m.lines.length - nLoo;
  const head = "T+" + Math.round(t * 100) + "%";
  if (s.end) return head + " · end state · " + down;
  return head + " · LOO " + s.loo + "/" + nLoo + " · LOE " + s.loe + "/" + nLoe + " · " + down;
}
