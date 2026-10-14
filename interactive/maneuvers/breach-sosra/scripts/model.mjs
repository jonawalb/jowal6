// The breaching model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so the figure, the
// readout and the tests all run this one file.
//
// The five breaching fundamentals, their names and their ORDER are doctrine: FM 3-90 (1 May 2023)
// para 18-23 ("The fundamentals are described by the memory aid SOSRA: Suppress. Obscure. Secure.
// Reduce. Assault."), ATP 3-21.10 (1 June 2026) para F-23. The three forces are FM 3-90 para 18-32 and
// ATP 3-21.10 para F-29: support, breach and assault.
//
// Everything else is a NOTIONAL teaching model, stated as such on the page. A run is a closed-form
// function of figure time t and which fundamentals are applied (cfg). With all five applied the
// fundamentals set at T[0..4]; a fundamental left out stops the chain there (each station engages
// only after the one before it), and the breach is not completed. Times, rates and losses are not data.

export const NAMES = ["Suppress", "Obscure", "Secure", "Reduce", "Assault"];
// where the doctrine puts each (paragraph and page), for the page and the test
export const DOC = [
  { name: "Suppress", fm: "18-24", fmPage: "18-5", atp: "F-24", atpPage: "231" },
  { name: "Obscure", fm: "18-26", fmPage: "18-6", atp: "F-25", atpPage: "231" },
  { name: "Secure", fm: "18-27", fmPage: "18-6", atp: "F-26", atpPage: "232" },
  { name: "Reduce", fm: "18-30", fmPage: "18-6", atp: "F-27", atpPage: "232" },
  { name: "Assault", fm: "18-31", fmPage: "18-7", atp: "F-28", atpPage: "232" },
];
export const FORCES = ["Support", "Breach", "Assault"];

export const MODEL = {
  T: [1.5, 3.5, 5.5, 9.0, 12.5],  // s: when each fundamental is set, all applied (notional, compressed time)
  go: 3.0,        // s: the breach force leaves the assault position for the point of breach
  laneStart: 5.5, // s: reduction begins once suppression, obscuration and security are set
  assaultStart: 9.0,
  end: 12.5,      // s: the breach is complete (far side seized)
  stall: 10.5,    // s: the run stops here when the breach cannot be completed
  hold: 2.6,      // s: an outcome is held before the run ends
  enemy: 6,       // far-side defenders drawn
  breachMen: 8,   // the breach force drawn
  stalled: 0.35,  // how far the lane gets when reduction is attempted without effective support
  // losses, notional: friendly down per second while a fundamental is missing (m = index of the first missing one)
  rate: [0.9, 0.45, 0.5, 0.3, 0.5],
  rateFrom: [3.0, 3.0, 3.0, 5.5, 9.0],
  // all five applied: the breach is not free
  costT: [7.0, 10.8, 11.8],
  fireKillT: [2.0, 3.0],            // support fires put two defenders out of action once suppression is effective
  assaultKillT: [10.6, 11.2, 11.8, 12.4], // the assault force destroys the rest on the far side
};

export const allOn = () => [true, true, true, true, true];
export const noneOn = () => [false, false, false, false, false];
export const count = (cfg) => cfg.filter(Boolean).length;
// index of the first fundamental left out, or -1
export const firstMissing = (cfg) => cfg.findIndex((v) => !v);
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const ease = (t) => t * t * (3 - 2 * t);

export const endOf = (cfg, m = MODEL) => {
  const f = firstMissing(cfg);
  return f === -1 || f === 4 ? m.end : m.stall;
};

// State at figure time t for the applied fundamentals cfg. released = false: waiting at the start.
export function stateAt(cfg, t, released = true, m = MODEL) {
  const f = firstMissing(cfg);
  const tt = released ? Math.max(0, t) : 0;
  const set = m.T.map((T, i) => released && tt >= T && cfg.slice(0, i + 1).every(Boolean));
  const nSet = set.filter(Boolean).length;
  const supp = cfg[0] && released ? ease(clamp(tt / m.T[0])) : 0;
  const obscure = cfg[1] && released ? ease(clamp((tt - m.T[0]) / (m.T[1] - m.T[0]))) : 0;
  const breach = released ? ease(clamp((tt - m.go) / (m.T[2] - m.go))) : 0;
  let lane = 0;
  const raw = clamp((tt - m.laneStart) / (m.T[3] - m.laneStart));
  if (released) {
    if (f === -1 || f === 4) lane = raw;
    else if (f <= 2) lane = Math.min(m.stalled, raw);
    else lane = 0;
  }
  const assault = released && f === -1 ? clamp((tt - m.assaultStart) / (m.T[4] - m.assaultStart)) : 0;
  const end = endOf(cfg, m);
  // casualties
  const downFT = [];
  if (f === -1) {
    for (const x of m.costT) if (tt >= x) downFT.push(x);
  } else if (released) {
    const r = m.rate[f], from = m.rateFrom[f], cap = f <= 2 ? m.breachMen : 3;
    for (let k = 1; k <= cap; k++) {
      const x = from + k / r;
      if (x > end + 1e-9) break;
      if (tt >= x) downFT.push(+x.toFixed(3));
    }
  }
  const downET = [];
  if (released) {
    if (cfg[0]) for (const x of m.fireKillT) if (tt >= x) downET.push(x);
    if (f === -1) for (const x of m.assaultKillT) if (tt >= x) downET.push(x);
  }
  const jamAt = f === -1 ? Infinity : f === 0 ? 2.5 : m.T[f - 1] + 0.8;
  const jammed = released && f !== -1 && tt >= jamAt;
  const done = released && tt >= end + m.hold;
  const seized = released && f === -1 && tt >= m.end;
  const stage = Math.min(4, nSet);
  return { t: tt, released, cfg, missing: f, set, nSet, supp, obscure, breach, lane, assault, downFT, downET, downF: downFT.length, downE: downET.length, jammed, seized, done, end, stage };
}

export function phaseWord(s) {
  if (!s.released) return "Ready";
  if (s.seized) return "Far side seized";
  if (s.jammed) return `Jam: no ${NAMES[s.missing]}`;
  return NAMES[Math.min(4, s.nSet)];
}
export const finalState = (cfg, m = MODEL) => stateAt(cfg, endOf(cfg, m), true, m);

export function readoutMachine(s) {
  if (!s.released) return `Ready · ${count(s.cfg)}/5 applied · 0 down`;
  return `${phaseWord(s)} · ${s.nSet}/5 set · ${s.downE} down`;
}
export function readoutField(s) {
  if (!s.released) return `Ready · ${count(s.cfg)}/5 applied · 0 vs 0 down`;
  return `${phaseWord(s)} · ${s.nSet}/5 · ${s.downF} vs ${s.downE} down`;
}
