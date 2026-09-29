// Nuclear Entanglement: a transparent, notional hazard model of escalation through entanglement.
// Mechanisms follow James M. Acton, "Escalation through Entanglement," International Security 43:1 (2018):
// crisis instability ("use them or lose them"), misinterpreted warning and the damage-limitation window;
// warhead and target ambiguity follow Acton, "Is It a Nuke?" (Carnegie, 2020) and "Silver Bullet?" (Carnegie, 2013);
// wartime pessimism ("fog") follows Talmadge, "Would China Go Nuclear?" International Security 41:4 (2017).
// EVERY NUMBER IN THIS FILE IS NOTIONAL. None is an estimate for any real state, force or asset.
// Pure functions, no DOM.

export const PHASES = 4;

/**
 * Asset categories, generic by design. n: nuclear share (how entangled the category is), d: damage per phase struck,
 * v: conventional military value of degrading it. w: weight of the category in each channel.
 * Channels: ci crisis instability, mw misinterpreted warning, dl damage-limitation window, wa warhead/target ambiguity.
 * f: contribution of the category's damage to the target's fog of war.
 */
export const CATS = [
  { id: 'ew', name: 'Early-warning satellites and radars', short: 'Early warning',
    help: 'Sensors that detect missile launches. They also cue missile defenses against conventional missiles.',
    n: 0.8, d: 0.35, v: 0.15, w: { ci: 0.2, mw: 1.0, dl: 0.5, wa: 0 }, f: 0.45 },
  { id: 'nc3', name: 'NC3 and communications', short: 'NC3 / comms',
    help: 'Command, control and communication links that carry orders to both nuclear and high-priority conventional forces.',
    n: 0.6, d: 0.3, v: 0.25, w: { ci: 0.35, mw: 0.8, dl: 0.2, wa: 0 }, f: 0.35 },
  { id: 'dcd', name: 'Dual-capable delivery systems', short: 'Dual-capable',
    help: 'Missiles, launchers and aircraft that can carry either a nuclear or a conventional warhead.',
    n: 0.4, d: 0.25, v: 0.3, w: { ci: 1.0, mw: 0.1, dl: 0, wa: 0.7 }, f: 0 },
  { id: 'colo', name: 'Co-located bases', short: 'Co-located',
    help: 'Garrisons, airfields or depots that host nuclear and conventional units side by side.',
    n: 0.5, d: 0.3, v: 0.2, w: { ci: 0.8, mw: 0.3, dl: 0, wa: 0.5 }, f: 0.05 },
  { id: 'isr', name: 'ISR and targeting networks', short: 'ISR',
    help: 'Surveillance and reconnaissance that track forces at sea, in the air and on land, for conventional and strategic missions.',
    n: 0.3, d: 0.35, v: 0.1, w: { ci: 0.15, mw: 0.25, dl: 1.0, wa: 0 }, f: 0.25 },
];

export const CHANNELS = [
  { id: 'ci', name: 'Use them or lose them', term: 'Crisis instability', col: '--c2',
    text: 'Conventional strikes wear down forces the target needs for nuclear retaliation, or look as if they are meant to. Pressure grows to use nuclear weapons before they are lost.',
    src: 'Acton 2018; Talmadge 2017' },
  { id: 'mw', name: 'Misinterpreted warning', term: 'Misinterpreted warning', col: '--c4',
    text: 'Strikes on dual-use warning and command systems, made for conventional reasons, are read as the opening of a nuclear attack. The target moves to deter or blunt a strike that was never planned.',
    src: 'Acton 2018' },
  { id: 'dl', name: 'Closing damage-limitation window', term: 'Damage-limitation window', col: '--c3',
    text: 'A target that plans to limit damage by hunting the other side’s nuclear forces sees its sensors being degraded, fears the window for doing so is closing, and acts early. Only applies if the target has such a doctrine.',
    src: 'Acton 2018' },
  { id: 'wa', name: 'Warhead and target ambiguity', term: 'Ambiguity', col: '--c6',
    text: 'The strike weapons could carry nuclear warheads, and the targets serve nuclear forces. The target cannot tell a conventional attack on its conventional forces from the start of a nuclear one.',
    src: 'Acton 2013, 2020' },
];

export const MITIGATIONS = [
  { id: 'sep', name: 'Separation (disentangle)', side: 'Both sides, peacetime',
    text: 'Keep nuclear and conventional forces, bases and command links apart, so strikes on one do not touch the other. Cuts the nuclear share of every category by half.',
    lit: 'Acton 2019 Q&A: disentangling is “complex and expensive,” e.g. more satellites. Acton 2020: China appears to keep distinct nuclear and conventional launch brigades.',
    links: ['acton2019', 'acton2020'] },
  { id: 'excl', name: 'Strike exclusions', side: 'Attacker, wartime',
    text: 'Leave assets assessed as serving nuclear forces off the target list. Cuts damage to the nuclear share by 70%, and gives up the conventional value of those assets.',
    lit: 'Acton 2018: war planning and strike decisions should weigh entanglement risks. Acton 2020: assess escalation risk before authorizing strikes against ambiguous delivery systems.',
    links: ['acton2018', 'acton2020'] },
  { id: 'decl', name: 'Declaratory restraint', side: 'Attacker, peacetime and wartime',
    text: 'State in advance and in the war that conventional strikes are not aimed at nuclear forces. Halves misinterpreted warning and cuts ambiguity by a third, if believed.',
    lit: 'Acton 2020: offer verbal assurances to reduce false positives from conventional operations; declare which systems are nuclear, conventional or dual-use.',
    links: ['acton2020'] },
  { id: 'comm', name: 'Crisis communication', side: 'Both sides, wartime',
    text: 'A working channel between leaders to explain strikes as they happen. Cuts misinterpretation and ambiguity, but less as the fog thickens.',
    lit: 'Acton 2020: clarify the meaning of operations in accompanying statements. Acton 2018: cooperative measures and agreed restrictions over the longer term.',
    links: ['acton2020', 'acton2018'] },
  { id: 'res', name: 'Resilient NC3', side: 'Target, peacetime',
    text: 'Redundant, hardened command and warning systems. Halves the fog that degraded warning creates.',
    lit: 'Acton 2019 Q&A: building more resilient nuclear command and control could mitigate the consequences of attacks on it.',
    links: ['acton2019'] },
];

export const DEFAULTS = {
  h0: 0.004,      // baseline per-phase hazard of nuclear use in a conventional war with no entangled strikes
  kci: 0.08, kmw: 0.07, kdl: 0.07, kwa: 0.08, // channel scales
  phi: 1.2,       // fog pessimism: how much degraded warning inflates perceived threat
  surv: 0.5,      // target's confidence in its second strike (0 small and vulnerable, 1 large and secure)
  amb: 0.5,       // share of the attacker's strike weapons that are dual-capable
  rep: 0.15,      // share of damage repaired in a phase with no strikes
  dlDoc: 0,       // target has a damage-limitation doctrine
};

export const LIMITS = {
  h0: [0, 0.05], kci: [0, 0.5], kmw: [0, 0.5], kdl: [0, 0.5], kwa: [0, 0.5], phi: [0, 3], surv: [0, 1], amb: [0, 1], rep: [0, 0.6],
};

/** Default campaign: early-warning and co-located bases struck from phase 2, dual-capable launchers throughout. */
export const DEFAULT_PLAN = { ew: [0, 1, 1, 1], nc3: [0, 0, 1, 1], dcd: [1, 1, 1, 1], colo: [0, 1, 1, 0], isr: [1, 1, 0, 0] };
export const DEFAULT_MIT = { sep: 0, excl: 0, decl: 0, comm: 0, res: 0 };

/**
 * Run the campaign. S = { P (params), plan: {cat: [0/1 x4]}, mit: {id: 0/1}, cats: [{n,d,v}] overrides }.
 * Returns per-phase arrays and totals.
 */
export function run(S) {
  const { P, plan, mit } = S;
  const cats = CATS.map((c, i) => ({ ...c, ...(S.cats ? S.cats[i] : {}) }));
  const D = Object.fromEntries(cats.map(c => [c.id, 0]));
  const phases = [];
  let surviveAll = 1;
  for (let t = 0; t < PHASES; t++) {
    for (const c of cats) {
      if (plan[c.id][t]) D[c.id] = 1 - (1 - D[c.id]) * (1 - c.d);
      else D[c.id] *= (1 - P.rep);
    }
    const nEff = c => c.n * (mit.sep ? 0.5 : 1);
    const nucHit = c => nEff(c) * D[c.id] * (mit.excl ? 0.3 : 1);   // damage to the nuclear-serving share
    let fog = 0;
    for (const c of cats) fog += c.f * D[c.id];
    fog = Math.min(1, fog * (mit.res ? 0.5 : 1));
    const mult = 1 + P.phi * fog;
    const X = { ci: 0, mw: 0, dl: 0, wa: 0 };
    for (const c of cats) for (const k of Object.keys(X)) X[k] += c.w[k] * nucHit(c);
    const commEff = mit.comm ? 0.45 * (1 - fog) : 0;
    const h = {
      ci: P.kci * X.ci * mult * (1.5 - P.surv),
      mw: P.kmw * X.mw * mult * (mit.decl ? 0.5 : 1) * (1 - commEff),
      dl: P.dlDoc ? P.kdl * X.dl : 0,
      wa: P.kwa * X.wa * (0.25 + P.amb) * mult * (mit.decl ? 0.67 : 1) * (1 - commEff),
    };
    const H = P.h0 + h.ci + h.mw + h.dl + h.wa;
    const p = 1 - Math.exp(-H);
    surviveAll *= 1 - p;
    // Conventional effect: value of damage done, minus the nuclear-serving share spared by exclusions.
    let mil = 0;
    for (const c of cats) mil += c.v * D[c.id] * (mit.excl ? 1 - 0.7 * nEff(c) : 1);
    const pressure = Math.min(1, X.ci * mult * (1.5 - P.surv) / 2.2);
    phases.push({ t, D: { ...D }, fog, mult, X, h, H, p, pCum: 1 - surviveAll, mil, pressure });
  }
  const last = phases[PHASES - 1];
  const share = {};
  const tot = phases.reduce((s, ph) => s + ph.H, 0) || 1;
  for (const k of ['ci', 'mw', 'dl', 'wa']) share[k] = phases.reduce((s, ph) => s + ph.h[k], 0) / tot;
  share.base = PHASES * P.h0 / tot;
  return { phases, pEsc: last.pCum, mil: last.mil, fog: last.fog, pressure: Math.max(...phases.map(p => p.pressure)), share, cats };
}

/** Baseline for comparison: the same war with no strikes on any entangled category. */
export function baseline(S) {
  const plan = Object.fromEntries(CATS.map(c => [c.id, [0, 0, 0, 0]]));
  return run({ ...S, plan });
}

/** For each lever: change in final risk and conventional effect from having it on versus off, all else as set. */
export function leverEffects(S) {
  return MITIGATIONS.map(m => {
    const on = run({ ...S, mit: { ...S.mit, [m.id]: 1 } }), off = run({ ...S, mit: { ...S.mit, [m.id]: 0 } });
    return { id: m.id, on: !!S.mit[m.id], delta: on.pEsc - off.pEsc, milDelta: on.mil - off.mil };
  });
}
