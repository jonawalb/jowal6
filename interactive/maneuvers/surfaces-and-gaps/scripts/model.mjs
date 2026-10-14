// The surfaces-and-gaps model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine: a wall face of five lanes. Each lane's key is set back by a
// depth d (bench millimetres). A lane with d below gapMin is a surface; at or above, a gap.
// Five feeler blades probe the face together; each stops on its key or reaches its full
// stroke. The main effort (the lit ram) is shifted to the lane whose blade went deepest.

export const MODEL = {
  lanes: 5,
  pitch: 18,            // lane spacing, world units
  face: -90,            // x of the wall face (a key set back 0)
  gapMin: 6,            // a key set back at least this far is a gap (notional)
  reach: 16,            // how far past the face a feeler blade can go
  ramReach: 24,         // how far past the face the ram can drive
  barHome: 6,           // push bar front face at rest
  barEnd: -30,          // push bar front face at full stroke (free blade tip = face - reach)
  bladeOff: 76,         // free blade tip = bar - bladeOff
  ramOff: 15,           // retracted ram tip = bar - ramOff
  // Notional faces the tour steps through (set-back of keys 1..5). Each has one or two gaps.
  patterns: [
    [0, 2, 0, 26, 1],
    [1, 0, 20, 0, 0],
    [22, 0, 1, 0, 9],
    [0, 1, 0, 2, 24],
  ],
  // Phase lengths, seconds, in order.
  phases: [
    ["rest", 0.8], ["probe", 3.0], ["strike", 1.2], ["back", 0.8], ["shift", 1.4],
    ["lunge", 1.2], ["hold", 1.6], ["home", 1.6], ["shuffle", 1.4],
  ],
};

export const CYCLE = MODEL.phases.reduce((s, [, d]) => s + d, 0);
export const startOf = (name, m = MODEL) => {
  let t = 0;
  for (const [n, d] of m.phases) { if (n === name) return t; t += d; }
  return NaN;
};

// Lane 1 is the nearest-left lane on screen (largest y), lane 5 the far right.
export const laneY = (i, m = MODEL) => ((m.lanes - 1) / 2 - i) * m.pitch;
export const isGap = (d, m = MODEL) => d >= m.gapMin;
export const probeDepth = (d, m = MODEL) => Math.min(d, m.reach);
export const ramDepth = (d, m = MODEL) => Math.min(d, m.ramReach);

// The lane whose blade went deepest; ties go to the lane nearest the planned one, then the lower.
export function deepest(depths, planned, m = MODEL) {
  let best = 0;
  for (let i = 1; i < depths.length; i++) {
    const a = probeDepth(depths[i], m), b = probeDepth(depths[best], m);
    if (a > b || (a === b && Math.abs(i - planned) < Math.abs(best - planned))) best = i;
  }
  return best;
}

const smooth = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;

function phaseAt(t, m) {
  let t0 = 0;
  for (const [name, d] of m.phases) {
    if (t < t0 + d) return { name, u: (t - t0) / d };
    t0 += d;
  }
  return { name: "shuffle", u: 1 };
}

// Pose at time t (0..CYCLE) in one probe cycle, for a planned lane and the face's depths.
export function pose(t, planned, depths, m = MODEL) {
  const { name, u } = phaseAt(t, m);
  const deep = deepest(depths, planned, m);
  const order = m.phases.map(([n]) => n);
  const at = order.indexOf(name);
  const past = (n) => at > order.indexOf(n);
  const e = smooth(u);

  let xb = m.barHome;
  if (name === "probe") xb = lerp(m.barHome, m.barEnd, e);
  else if (past("probe") && name !== "home" && name !== "shuffle") xb = m.barEnd;
  else if (name === "home") xb = lerp(m.barEnd, m.barHome, smooth(u * 1.6 - 0.6));

  const tipFree = xb - m.bladeOff;
  const tips = depths.map((d) => Math.max(tipFree, m.face - d));

  const base = xb - m.ramOff;
  const into = (lane) => m.face - (isGap(depths[lane], m) ? ramDepth(depths[lane], m) : depths[lane]);
  const same = deep === planned;
  let ramLane = planned, ramTip = base, ramY = laneY(planned, m);
  if (name === "strike") ramTip = lerp(base, into(planned), e);
  else if (same && past("strike") && name !== "home" && name !== "shuffle") ramTip = into(planned);
  else if (!same && name === "back") ramTip = lerp(into(planned), base, e);
  if (!same && past("back")) {
    ramLane = deep;
    ramY = name === "shift" ? lerp(laneY(planned, m), laneY(deep, m), e) : laneY(deep, m);
    if (name === "lunge") ramTip = lerp(base, into(deep), e);
    else if (name === "hold") ramTip = into(deep);
  }
  if (name === "home") ramTip = lerp(same ? into(planned) : into(deep), base, smooth(u * 1.6));
  if (same) ramLane = planned;
  const contacts = depths.filter((d) => d <= m.reach).length;
  return { phase: name, u, xb, tips, ramY, ramTip, ramLane, deep, planned, contacts, depths };
}

// Casualties (notional, men down in one probe, both sides; drawn in the Battlefield view and
// counted in the readout). Success is not free. When the probe makes contact, every team stopped
// on a key (a surface, or a shallow gap held in depth) trades fire: blue loses one man per two
// such teams (rounded up), red one per two (rounded down). If the main effort first strikes a
// surface, blue loses two more. When the main effort goes through the gap, red loses one more.
// Counts reset at the start of the next probe.
export const LOSS = { strike: 2, through: 1 };
export function casualties(p, m = MODEL) {
  if (p.phase === "rest" || (p.phase === "probe" && p.u < 0.75)) return { blue: 0, red: 0 };
  const order = m.phases.map(([n]) => n);
  const at = order.indexOf(p.phase);
  const reached = (n, u0) => at > order.indexOf(n) || (p.phase === n && p.u >= u0);
  const same = p.deep === p.planned;
  let blue = Math.ceil(p.contacts / 2), red = Math.floor(p.contacts / 2);
  if (!same && reached("back", 0)) blue += LOSS.strike;
  if (reached(same ? "strike" : "lunge", 0.6)) red += LOSS.through;
  return { blue, red };
}

// The card's readout for a pose (kept under 45 characters): the step, then blue vs red men down.
export function readout(p, depths, m = MODEL) {
  const n = (i) => i + 1;
  const c = casualties(p, m), down = ` · ${c.blue} vs ${c.red} down`;
  const deepTxt = `lane ${n(p.deep)} deepest, blade in ${probeDepth(depths[p.deep], m)} mm`;
  switch (p.phase) {
    case "rest": return `Main effort set on lane ${n(p.planned)}`;
    case "probe": return p.u < 0.75 ? "Probing the face" : cap(deepTxt) + down;
    case "strike": case "back":
      if (p.deep !== p.planned) return `Lane ${n(p.planned)} struck a surface` + down;
      return through(p.planned, depths, m) + down;
    case "shift": return (p.deep === p.planned ? through(p.planned, depths, m) : `Main effort shifts to lane ${n(p.deep)}`) + down;
    case "lunge": case "hold": return through(p.deep, depths, m) + down;
    case "home": return "Withdrawing to probe again" + down;
    default: return "The face shifts, gaps move" + down;
  }
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const through = (lane, depths, m) => `Through lane ${lane + 1}, ${ramDepth(depths[lane], m)} mm deep`;

// Depths during a shuffle from one pattern to the next.
export const mixDepths = (a, b, u) => a.map((d, i) => lerp(d, b[i], smooth(u)));
