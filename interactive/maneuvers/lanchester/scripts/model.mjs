// The Lanchester model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the balance, the battlefield, the readout and the tests all run this one file.
//
// The equations are Lanchester's (Aircraft in Warfare, 1916, ch. V, sec. 21, eqs. 1 and 2):
//   db/dt = -r x c,   dr/dt = -b x k        (aimed fire: the square law)
// The linear law the toggle shows is the unaimed (area) fire form, where each side's losses
// grow with both sides' numbers:  db/dt = -beta b r,  dr/dt = -beta b r.  It gives the same end
// state as Lanchester's "ancient conditions" (equal losses on both sides).
// Everything else (the force sizes, the coefficients, the step, the pause to shift fire, the
// half-a-man cut-off) is notional: teaching values, stated as such on the page.

export const MODEL = {
  blue: 16,          // blue riflemen, one force
  red: [10, 10],     // red riflemen in two separated groups, A and B
  alpha: 0.06,       // square law: hits per man per step (c = k: equal fighting value)
  beta: 0.02,        // linear law: losses per step per (b x r)
  move: 4,           // steps blue needs to shift from group A to group B (no fire)
  cut: 0.5,          // a group under half a man is out of the fight (finite men, not a fluid)
  dt: 0.01,          // integration substep (steps)
  sample: 0.05,      // stored sample spacing (steps)
  maxStep: 46,       // the slider's range; every battle is over before it
  k: 4.5,            // balance: rider distance per man (square law), world units
  d0: 45,            // balance: fixed rider distance under the linear law (k x 10)
  tiltMax: 11,       // balance: largest beam tilt, degrees
  tiltScale: 60,     // balance: torque difference (in man x man units) for a strong tilt
};

export const LAWS = ["square", "linear"];
export const PLANS = ["detail", "both"];   // detail = concentrate on one red group at a time

// Rates of change for blue and the two red groups, given which red groups are engaged.
function rates(law, b, rA, rB, engA, engB, m) {
  const eA = engA ? rA : 0, eB = engB ? rB : 0, r = eA + eB;
  if (r <= 0 || b <= 0) return [0, 0, 0];
  if (law === "square") {
    // blue loses alpha per engaged red man; blue's fire, alpha per blue man, is spread over the
    // engaged groups in proportion to their size
    return [-m.alpha * r, -m.alpha * b * (eA / r), -m.alpha * b * (eB / r)];
  }
  // area fire: losses grow with the shooters and with the targets packed in the area
  return [-m.beta * b * r, -m.beta * b * eA, -m.beta * b * eB];
}

// Runs one battle to its end and returns samples every m.sample steps.
export function simulate(law, plan, m = MODEL) {
  let b = m.blue, rA = m.red[0], rB = m.red[1], t = 0;
  let phase = plan === "detail" ? "A" : "both";
  let tAend = null, tBstart = null, tEnd = null;
  const samples = [];
  const every = Math.round(m.sample / m.dt);
  const engaged = () => (phase === "both" ? [true, true] : phase === "A" ? [true, false] : phase === "B" ? [false, true] : [false, false]);
  for (let i = 0; t <= m.maxStep + 1e-9; i++) {
    if (i % every === 0) samples.push({ t: +t.toFixed(4), b, rA, rB, phase });
    const [eA, eB] = engaged();
    if (phase === "A" || phase === "B" || phase === "both") {
      // RK4 over one substep
      const f = (bb, a, c) => rates(law, bb, a, c, eA, eB, m);
      const h = m.dt;
      const k1 = f(b, rA, rB);
      const k2 = f(b + h / 2 * k1[0], rA + h / 2 * k1[1], rB + h / 2 * k1[2]);
      const k3 = f(b + h / 2 * k2[0], rA + h / 2 * k2[1], rB + h / 2 * k2[2]);
      const k4 = f(b + h * k3[0], rA + h * k3[1], rB + h * k3[2]);
      b += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      rA += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      rB += h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
      if (b < m.cut) b = 0;
      if (rA < m.cut) rA = 0;
      if (rB < m.cut) rB = 0;
    }
    t += m.dt;
    if (phase === "A" && rA === 0 && b > 0) { phase = "move"; tAend = t; }
    else if (phase === "move" && t >= tAend + m.move - 1e-9) { phase = "B"; tBstart = t; }
    if (phase !== "end" && (b === 0 || (rA === 0 && rB === 0) || (phase === "B" && rB === 0))) { phase = "end"; tEnd = t; }
  }
  return { law, plan, samples, tAend, tBstart, tEnd };
}

const CACHE = new Map();
export function battle(law, plan, m = MODEL) {
  const key = law + "|" + plan;
  if (m !== MODEL) return simulate(law, plan, m);
  if (!CACHE.has(key)) CACHE.set(key, simulate(law, plan, m));
  return CACHE.get(key);
}

// Men still fighting: under half a man is none.
export const alive = (x, m = MODEL) => (x < m.cut ? 0 : Math.round(x));

// The state at (continuous) step t, interpolated between samples.
export function stateAt(law, plan, t, m = MODEL) {
  const B = battle(law, plan, m);
  const s = B.samples;
  const x = Math.min(Math.max(t, 0), s[s.length - 1].t) / m.sample;
  const i = Math.min(Math.floor(x), s.length - 2), f = x - i;
  const a = s[i], c = s[i + 1];
  const mix = (p, q) => p + (q - p) * f;
  const st = { t, b: mix(a.b, c.b), rA: mix(a.rA, c.rA), rB: mix(a.rB, c.rB), phase: f < 0.5 ? a.phase : c.phase };
  // progress of blue's shift from group A to group B (0 before, 1 after)
  st.shift = plan === "detail" && B.tAend !== null ? Math.min(1, Math.max(0, (t - B.tAend) / m.move)) : 0;
  st.over = B.tEnd !== null && t >= B.tEnd;
  return st;
}

// Men down on each side (notional, from the counts above).
export function casualties(st, m = MODEL) {
  const blue = m.blue - alive(st.b, m);
  const red = m.red[0] - alive(st.rA, m) + m.red[1] - alive(st.rB, m);
  return { blue, red, redA: m.red[0] - alive(st.rA, m), redB: m.red[1] - alive(st.rB, m) };
}

// Losses in one whole step, from step n to n + 1 (the step-through).
export function stepLoss(law, plan, n, m = MODEL) {
  const a = stateAt(law, plan, n, m), c = stateAt(law, plan, n + 1, m);
  return { blue: a.b - c.b, red: a.rA + a.rB - c.rA - c.rB };
}

// The balance. Square law: each rider sits k x N from the pivot and carries N discs, so its
// moment is k x N x N. Linear law: the riders are pinned at d0, so the moment is d0 x N.
export const riderDist = (law, n, m = MODEL) => (law === "square" ? m.k * n : m.d0);
export function moment(law, n, m = MODEL) {
  return riderDist(law, n, m) * n / m.k;           // in man x man units
}
// Beam tilt in degrees, positive = blue side down.
export function tilt(law, b, r, m = MODEL) {
  return m.tiltMax * Math.tanh((moment(law, b, m) - moment(law, r, m)) / m.tiltScale);
}

// The card readout, kept under 45 characters: step (it stops counting when the battle ends), men
// fighting, then blue vs red men down.
export function readoutOf(law, plan, t, m = MODEL) {
  const st = stateAt(law, plan, t, m);
  const c = casualties(st, m);
  const red = `${alive(st.rA, m)}+${alive(st.rB, m)}`;
  const B = battle(law, plan, m);
  const step = Math.min(Math.floor(t + 1e-6), B.tEnd === null ? Infinity : Math.ceil(B.tEnd - 1e-6));
  return `Step ${step} · Blue ${alive(st.b, m)}, Red ${red} · ${c.blue} vs ${c.red} down`;
}

// The end of each battle, for the text and the tests.
export function outcome(law, plan, m = MODEL) {
  const B = battle(law, plan, m);
  const end = stateAt(law, plan, m.maxStep, m);
  return { tEnd: B.tEnd, tAend: B.tAend, blue: alive(end.b, m), red: alive(end.rA, m) + alive(end.rB, m), down: casualties(end, m) };
}
