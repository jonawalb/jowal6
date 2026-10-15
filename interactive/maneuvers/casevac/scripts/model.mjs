// The casualty evacuation model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so the figure,
// the readout and the tests all run this one file.
//
// DOCTRINE (the page quotes it, with paragraph and printed page; FACTCHECK.md has the table):
//  * ATP 3-21.8 (11 Jan 2024, incl. C1 Jun 2025): 1-22 (PSG operates the platoon CCP), 4-6, 4-38, 4-39,
//    8-33 to 8-36, 8-44, 8-45;
//  * ATP 4-02.13, Casualty Evacuation (30 Jun 2021): 1-2, 1-5, 1-8, 1-10, 1-12;
//  * ATP 4-02.2, Medical Evacuation (12 Jul 2019): pp. 1-6 and 1-7.
// None of them gives a time, a distance or a number of casualties for this situation, so none appears here
// as doctrine and the figure uses no medical timing figure of any kind.
//
// EVERYTHING BELOW IS A NOTIONAL TEACHING MODEL, stated as such on the page. In this model:
//  * a platoon attack is four moves from phase line to phase line, with a halt after each;
//  * casualties occur in the moves (the slider sets how many), are carried by the platoon's aid and litter
//    teams to the platoon CCP, and wait there;
//  * one carrier does two jobs at each halt, the pairing ATP 3-21.8 para 8-34 describes for a logistics team
//    under the first sergeant (it "carries additional ammunition forward to the platoons and evacuates
//    casualties"): it takes the casualties back to the company CCP, one trip each, and then brings
//    ammunition forward. The carrier is litter bearers or a nonmedical vehicle (para 8-35);
//  * the line does not step off again until the ammunition has arrived. That last rule is this figure's own
//    mapping of "sustainment limits tempo", not a doctrinal rule.
// A run is a closed-form function of figure time t, the casualty count and the means of evacuation.

export const MODEL = {
  B: 4,              // moves in the attack (the model stops at the fourth phase line)
  bound: 3.0,        // s: one bound
  res: 1.6,          // s: the resupply leg, the team's way forward to the line with ammunition
  k: { litter: 2.6, vehicle: 1.2 },   // s per casualty at the halt: a litter team's round trip / a nonmedical vehicle's
  carry: 1.6,        // s: the aid and litter team's trip from the platoon CCP to the casualty and back
  occ: { 1: [0.2], 2: [0.15, 0.3] },  // where in the bound each casualty occurs (share of the bound)
  cas: { min: 0, max: 8, step: 1, start: 3 },
  enemyT: [[1.4], [1.2], [0.8, 1.8], [0.9, 1.8]],   // s into each bound: when each defender goes out of action (six in all)
  ammoLow: 0.35,     // share of the ammunition left at the end of a bound (the gauge)
  hold: 2.6,         // s the finished picture is held
};
export const START = { cas: MODEL.cas.start, vehicle: true };
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const ease = (t) => t * t * (3 - 2 * t);
export const snap = (c) => clamp(Math.round(c / MODEL.cas.step) * MODEL.cas.step, MODEL.cas.min, MODEL.cas.max);
export const ENEMY_TOTAL = MODEL.enemyT.reduce((a, b) => a + b.length, 0);

// The timeline: for each bound j its start S, halt start Hs, halt length H, ammunition leg start and the
// casualties (tc occurs, tArr reaches the platoon CCP, evacStart leaves it, evacMid reaches the company CCP).
const PLANS = new Map();
export function planOf(cfg, m = MODEL) {
  const c = snap(cfg.cas), kk = cfg.vehicle ? m.k.vehicle : m.k.litter;
  const key = c + "|" + (cfg.vehicle ? 1 : 0);
  if (m === MODEL && PLANS.has(key)) return PLANS.get(key);
  const bounds = [], cas = [];
  let S = 0, n = 0;
  for (let j = 0; j < m.B; j++) {
    const cj = Math.floor(c / m.B) + (j < c % m.B ? 1 : 0);
    const Hs = S + m.bound, H = m.res + kk * cj, E = Hs + H;
    for (let r = 0; r < cj; r++) {
      const tc = S + m.bound * m.occ[cj][r];
      cas.push({ n: n++, bound: j, rank: r, tc, tArr: tc + m.carry, evacStart: Hs + r * kk, evacMid: Hs + r * kk + kk / 2, evacEnd: Hs + (r + 1) * kk });
    }
    bounds.push({ j, S, Hs, H, E, c: cj, ammoStart: Hs + cj * kk });
    S = E;
  }
  const enemy = [];
  bounds.forEach((b, j) => m.enemyT[j].forEach((x) => enemy.push(b.S + x)));
  const plan = { c, k: kk, bounds, cas, enemy, end: S, vehicle: !!cfg.vehicle };
  if (m === MODEL) PLANS.set(key, plan);
  return plan;
}
// the total time the line spends halted (the cost of the sustainment flow in this model)
export const heldTotal = (cfg, m = MODEL) => planOf(cfg, m).bounds.reduce((a, b) => a + b.H, 0);

export function stateAt(cfg, t, released = true, m = MODEL) {
  const p = planOf(cfg, m);
  const tt = released ? Math.max(0, t) : 0;
  // where the line is: u counts bounds (0 at the line of departure, B at the fourth phase line)
  let u = 0, phase = "ready", j = -1, f = 0;
  if (released) {
    phase = "done"; u = m.B; j = m.B - 1;
    for (const b of p.bounds) {
      if (tt < b.Hs) { phase = "bound"; j = b.j; f = (tt - b.S) / m.bound; u = b.j + ease(f); break; }
      if (tt < b.E) { phase = "halt"; j = b.j; f = (tt - b.Hs) / b.H; u = b.j + 1; break; }
    }
  }
  const b = j >= 0 ? p.bounds[j] : null;
  // ammunition left in the line (gauge): falls in a bound, refilled by the team's leg at the halt
  let ammo = 1;
  if (phase === "bound") ammo = 1 - (1 - m.ammoLow) * f;
  else if (phase === "halt") ammo = tt < b.ammoStart ? m.ammoLow : m.ammoLow + (1 - m.ammoLow) * ease(clamp((tt - b.ammoStart) / m.res));
  else if (phase === "done") ammo = 1;
  // the casualties
  const cas = p.cas.map((x) => {
    const down = released && tt >= x.tc - 1e-9;
    const arrived = released && tt >= x.tArr - 1e-9;
    const left = released && tt >= x.evacStart - 1e-9;
    const evac = released && tt >= x.evacMid - 1e-9;
    // aid and litter team: out to the casualty in the first half of the carry, back with it in the second
    const cf = down && !arrived ? (tt - x.tc) / m.carry : 0;
    return { ...x, down, arrived, left, evac, carryF: cf, atCCP: arrived && !left };
  });
  const downF = cas.filter((x) => x.down).length;
  const atCCP = cas.filter((x) => x.atCCP).length;
  const evac = cas.filter((x) => x.evac).length;
  const downE = released ? p.enemy.filter((x) => tt >= x - 1e-9).length : 0;
  // the carrier (the logistics team: litter bearers, or a nonmedical vehicle): at the platoon CCP, taking a
  // casualty to the company CCP and back (mode "cas"), bringing ammunition forward ("ammoOut"), or coming back ("ammoBack")
  let carrier = { mode: "idle", f: 0, idx: -1, bound: -1 };
  if (released) {
    carrier = { mode: "atLine", f: 1, idx: -1, bound: m.B - 1 };
    for (const bb of p.bounds) {
      if (tt < bb.S) break;
      if (bb.j > 0 && tt < bb.Hs) { carrier = { mode: "ammoBack", f: (tt - bb.S) / m.bound, idx: -1, bound: bb.j - 1 }; break; }
      if (bb.j === 0 && tt < bb.Hs) { carrier = { mode: "idle", f: 0, idx: -1, bound: -1 }; break; }
      if (tt < bb.E) {
        if (tt < bb.ammoStart) {
          const i = Math.min(bb.c - 1, Math.floor((tt - bb.Hs) / p.k)), w = (tt - bb.Hs - i * p.k) / p.k;
          carrier = { mode: "cas", f: w < 0.5 ? w * 2 : 2 - w * 2, out: w < 0.5, idx: p.cas.findIndex((x) => x.bound === bb.j && x.rank === i), bound: bb.j };
        } else carrier = { mode: "ammoOut", f: (tt - bb.ammoStart) / m.res, idx: -1, bound: bb.j };
        break;
      }
    }
  }
  const finished = released && tt >= p.end - 1e-9;
  const done = released && tt >= p.end + m.hold;
  const pending = released ? cas.filter((x) => x.down && !x.evac).length : 0;
  return { cfg, t: tt, released, plan: p, u, phase, j, f, ammo, cas, downF, downE, atCCP, evac, carrier, finished, done, end: p.end, vehicle: p.vehicle, cdown: pending };
}
export const finalState = (cfg, m = MODEL) => stateAt(cfg, planOf(cfg, m).end, true, m);

export function phaseWord(s) {
  if (!s.released) return "Ready";
  if (s.phase === "done") return "Last phase line";
  if (s.phase === "bound") return `Move ${s.j + 1} of ${MODEL.B}`;
  return `Halt ${s.j + 1} of ${MODEL.B}`;
}
export function readoutMachine(s) {
  if (!s.released) return `Ready · ${s.cfg.cas} casualties · ${s.vehicle ? "vehicle" : "litters"}`;
  return `${phaseWord(s)} · ${s.downF} vs ${s.downE} down · ${s.atCCP} at CCP`;
}
export const readoutField = readoutMachine;
