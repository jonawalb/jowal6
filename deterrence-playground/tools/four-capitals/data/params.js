// Game parameters. Every number here is game design (illustrative), not data: see METHOD.md.
export const P = {
  turns: 8,
  months: ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October'],
  year: 2029,
  ladder: ['Gray-zone pressure', 'Coercion and quarantine', 'Blockade', 'Limited strikes', 'Major war', 'Nuclear use'],
  maxClimb: 2,            // rungs per turn
  clamp: [0.05, 0.95],    // action odds
  partialBand: 0.2,       // a roll within this much above the odds is a partial result
  types: ['resolute', 'cautious', 'opportunist'],
  typeLabel: { resolute: 'Resolute', cautious: 'Cautious', opportunist: 'Opportunist' },
  typeText: {
    resolute: 'Backing down costs you a lot at home; escalating costs little.',
    cautious: 'Escalating costs you a lot at home; backing down costs little.',
    opportunist: 'Escalating is cheap when a rival looks weak, and costly otherwise.',
  },
  // Home-support cost of each posture by type (negative = support lost). `back` applies to Stand down / De-escalate
  // once the crisis is under way (ladder 1+) or after you escalated last turn.
  postureCost: {
    resolute:    { esc: -1, nuke: -3,  back: -8 },
    cautious:    { esc: -6, nuke: -12, back: -1 },
    opportunist: { esc: -4, nuke: -8,  back: -4 },
  },
  // Home-support cost of each escalatory ('esc') or accommodating ('soft') action by type.
  actionCost: {
    resolute:    { esc: 0,  soft: -3 },
    cautious:    { esc: -3, soft: 0 },
    opportunist: { esc: -2, soft: -1 },
  },
  // Per-turn drift.
  shockToEconomy: { us: 0.05, tw: 0.12, cn: 0.09, jp: 0.07 },
  blockadeDrain: { tw: 6, twEconomy: 7, coal: 3 },
  nukeLoss: 4,            // strength lost in one month above which each further point adds 2 to the nuclear shadow (3 in v2; v3 has more forces in each fight)
  majorWarLosses: 4,      // force points lost in one month that turn Limited strikes into Major war
  cables: { economy: 1.5, support: 1 }, // monthly cost to Taiwan while its undersea cables are cut
  impatience: 3.5,        // Beijing loses this much home support a month while Taiwan stands above 55 and the crisis is at Coercion or below (2 in v3, 3 in v4; gray-zone moves and the peace forum give it cheaper outlets)
  nuclear: { threshold: 65, scale: 0.27, limitedWar: 0.4 }, // (scale 0.3 before Batch B) P(use) per turn at ladder 3+ = scale * ((shadow - threshold) / (100 - threshold))^1.5, x limitedWar at ladder 3
  ai: {
    temp: { easy: 7, normal: 3.5, hard: 1.5 },
    supportWeight: 0.25,  // weight on own home support in the AI's utility, beside its objectives
    typeTaste: 2.5,       // per unit of move intensity: + for resolute (and opportunist with an opening), − for cautious
    responseRisk: 3,      // China: penalty per escalatory action x P(U.S./Japan resolute)
    weaknessRisk: 4,      // others: penalty per soft move x P(China resolute or opportunist)
    opportunistBonus: 3,  // opportunist with an opening: bonus per escalatory action
    answer: 1,            // China: bonus per escalatory step answering last month's coalition escalation, x (1 - edge/4) (js/edge.js)
    beta: { resolute: 0.55, cautious: -0.55, opportunistOpen: 0.55, opportunistShut: -0.3 },
    attention: { base: 0.7, aimed: 0.9 }, // evidence weight: 0.7 for moves aimed elsewhere, up to 1.6 for moves all aimed at the observer
    topActions: 6, topPostures: 3,
    scarcity: 3,          // utility cost of spending stocks: x (spent / stock left)^2; munitions count 1.5x
  },
  // Batch B. Domestic politics: a notional election calendar (invented for play), Taiwan's legislature and the
  // budget-type moves it votes on, and the U.S. Congress and public. Odds are in points; supports are 0–100.
  politics: {
    elections: { jp: { turn: 4, label: 'a snap general election' }, tw: { turn: 3, label: 'legislative by-elections' } },
    electionCost: 1.5,    // home-support costs of postures and moves are multiplied by this in an election month
    legislature: { divided: 55, refuse: 40, odds: -15 },  // Taiwan: slow below 55 home support, refuses below 40 (both only below Limited strikes)
    congress: { aid: 40, mainland: 45, surge: 35, odds: -15, warMonths: 2, warSupport: 55, warOdds: -10 },
  },
  // Alliance friction: the host's consent for each use of its bases (probabilities).
  alliance: {
    base: { open: 0.85, peacetime: 0.55, limited: 0.2, ph: 0.6 },   // Japan by basing policy; the Philippines
    support: 0.004, coal: 0.004, nuke: 0.003,   // per point of host home support above 50 / cohesion above 60 / shadow above 30
    struck: 0.2, declared: 0.15, chinaSouth: -0.1, cabinet: { wary: -0.1, firm: 0.05 },
    diverge: { coal: 45, consent: -0.15, rally: -10 },   // below this cohesion, partners' aims diverge
  },
  // Economic shock (markets and shipping insurance): monthly drivers and what it costs each capital at home.
  econ: {
    drivers: { blockade: 3, cables: 1, sanctions: 1.5, war: 2 },   // shock added each month while each holds
    floor: 20, support: { us: 0.5, tw: 0.7, cn: 0.7, jp: 0.6 },    // home support lost per 10 points of shock above the floor
    sanctionMonths: 3, mineralMonths: 2,
  },
  // Peace forum: P(accept) = 1 / (1 + e^-z), z = k0 − kR·R − kA·A + kC·C − kE·E + kL·L (+ hidden-trait term, Batch C),
  // every factor on 0–1; kept within `clamp`. See js/forum.js and METHOD.md.
  forum: {
    k0: -0.2, kR: 2, kA: 3, kC: 2.5, kE: 2, kL: 1.5, clamp: [0.03, 0.95],
    angerScale: 50, decay: 0.65, lossAnger: 5,   // anger 50+ counts in full; it keeps 65% a month; per force point lost
    breach: { support: -10, anger: 40, coal: 8, nuke: 4 }, rebuff: { support: -3, coal: -2 }, ceaseEsc: -3,
    aiValue: 6,           // the computer's later-value estimate for calling a forum (× its own willingness × the odds)
  },
  intelNoise: 0.12,
  benchRuns: 120,
};
