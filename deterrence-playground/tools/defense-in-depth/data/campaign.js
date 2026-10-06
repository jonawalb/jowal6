// Campaign and learning data for Defense in Depth (SPEC §6). Standalone: imports nothing.
// Learning model after Hunzeker, *Dying to Learn* (2021): exploration → selection → action →
// mastery (pp. 22–24, 36–37); command latitude, assessment and training dials (pp. 27–33, 37–39).
// Every number is labelled SOURCED (page), CALIBRATED or NOTIONAL.

// ---- Time (D-23) ----
// One learning phase = 2 seasons; Hunzeker codes transitions by season (p. 37). 8 seasons in all:
// season 0 before battle 1, 3 phases × 2, season 7 after battle 4.
export const SEASONS = 8;                       // NOTIONAL (D-23)
export const TICKS_PER_PHASE = 2;               // NOTIONAL (D-23)
export const SEASON_LABELS = ['Before B1', 'Phase 1a', 'Phase 1b', 'Phase 2a', 'Phase 2b', 'Phase 3a', 'Phase 3b', 'After B4'];
export const PHASE_LETTERS = { E: 'Exploration', S: 'Selection', A: 'Action', M: 'Mastery' }; // pp. 22–24, 36–37

// ---- The four battles (SPEC §6.1; D-17, D-18, D-19) ----
// `ctx` = context modifiers the engine reads from opts.campaign.ctx; all values NOTIONAL unless cited.
export const BATTLES = [
  {
    id: 'B1', name: 'The Break-In at Wendrel', modern: 'The Break-In at Wendrel (drone sky)',
    inspired: 'Hunzeker Battle 1 (pp. 50–51, 77–78, 102–103, 109)',
    ctx: { defTrenchRows: [3, 6], defForwardShare: 0.7, counterstrokeArrives: 6, attAmmo: 0.6,
      attFormation: 'waves', attStorm: 1, tanks: false, drones: 0.5, attOrderDelay: 1 },
    briefing: 'A shallow linear system with most men forward. A break-in is easy; exploiting it is not, because orders take hours (pp. 78, 103).',
    beats: ['Barrages that lift early kill waves (p. 103).', 'Linear trenches are enfiladed (p. 77).'],
  },
  {
    id: 'B2', name: 'The Methodical Battle of Hask Rise', modern: 'The Methodical Battle of Hask Rise (drone sky)',
    inspired: 'Hunzeker Battle 2 (pp. 80, 104, 110, 145); war on a tether (Biddle pp. 32–33)',
    ctx: { defTrenchRows: [3, 10], defForwardShare: 0.6, attAmmo: 1.6, methodical: true,
      tanks: true, tankBreakdown: 0.2, pulverized: true, pulverizedStr: 0.4, broken: 'more' },
    briefing: 'More depth, still dense forward. A long bombardment kills forward garrisons but warns and churns the ground.',
    beats: ['A fast creeper outruns the infantry (p. 110).', 'Shell-hole defenders enfilade waves (p. 80).'],
    // Hidden: one column is pulverized (defenders 40%, wire gone), which seeds FL1 (Nivelle trap, p. 147).
  },
  {
    id: 'B3', name: 'The Brannoch Line', modern: 'The Brannoch Line (drone sky)',
    inspired: 'Hunzeker Battle 3 (pp. 81–82, 98, 113, 148–149); Biddle GOODWOOD (pp. 120–130)',
    ctx: { defZones: 'learned', reverseSlopeLine: true, attChoice: ['biteHold', 'surprise'], corridor: true },
    briefing: 'A narrow corridor between two villages, swept from both shoulders (Biddle p. 120).',
    beats: ['Unsupported armor dies (Biddle pp. 129–130).', 'Ripostes timed to consolidation beat bite-and-hold (Hunzeker p. 82).'],
  },
  {
    id: 'B4', name: 'The Storm', modern: 'The Storm (drone sky)',
    inspired: 'Hunzeker Battle 4 (pp. 73–74, 117–118); Biddle MICHAEL (pp. 78–107)',
    ctx: { attDoctrine: 'learned', defLayout: 'learned', fogHours: [0, 3] },
    briefing: 'Morning fog for three hours. Depth outlasts the fog (Biddle pp. 104–105).',
    beats: ['Copying the form without the rules fails (Hunzeker p. 117).'],
  },
];

// ---- Dials ----
// Command latitude levels 1–4 (Hunzeker pp. 37–38). Multiplier on observations surfaced (SPEC §6.3).
export const LATITUDE = [
  null,
  { id: 'centralized', label: 'Centralized', mult: 0.5 },
  { id: 'modCent', label: 'Moderately centralized', mult: 0.8 },
  { id: 'modDec', label: 'Moderately decentralized', mult: 1.2 },
  { id: 'decentralized', label: 'Decentralized', mult: 1.5 },
];
// Training systems (Hunzeker pp. 31–33, 38–39). rate = share of units trained per tick; resist = share
// of units that train at half fidelity (pp. 31–33). Rates NOTIONAL (SPEC §6.3).
export const TRAINING = {
  decentralized: { label: 'Decentralized', rate: 0.10, resist: 0.30 },
  partial: { label: 'Partial', rate: 0.20, resist: 0.15 },
  centralized: { label: 'Centralized', rate: 0.35, resist: 0.00 },
};
export const TRAINING_ORDER = ['decentralized', 'partial', 'centralized'];
export const TECH_TRAIN_MULT = 2;               // technical arms train ×2 (pp. 131–132, 168–169); NOTIONAL value
export const MASTERY_SHARE = 0.5;               // "majority of frontline units" (p. 37); threshold NOTIONAL

// Assessment: Independent needs independence, prestige and rigor (pp. 10, 29–31). A cell that only
// forwards paper is a "conduit" (p. 38). `cell: false` = None.
export const ASSESS_LEVELS = ['none', 'conduit', 'independent'];

// ---- Pipeline parameters (SPEC §6.3; all NOTIONAL unless cited) ----
export const LEARN = {
  obsBase: 3,                 // observations surfaced = 3 × latitude multiplier
  sigma: 0.25,                // apparent-value noise
  sigmaContext: 0.40,         // with the pulverized-context bonus
  capacity: 3,                // observations the cell can process per phase; Independent +1
  overloadLoss: 0.5,          // decentralized: share lost beyond capacity (p. 28 overload)
  overloadLossListening: 0.25,// at Listening ≥ 2 the loss halves (p. 28)
  whitewash: 0.3,             // centralized: apparent value biased 30% toward 0 (p. 127)
  actions: 3, actionsIndependent: 4,
  analyzeSigma: { independent: 0.5, conduit: 1.0, none: 1.5 },   // × σ
  falseReveal: 0.7,           // Independent analysis reveals a false lesson
  garbleNone: 0.5,            // codify with no cell: garbled at p = 0.5, half effect
  testRollouts: 20,           // micro-battle rollouts: 10 paired games (W3: was 40; ~130 ms a test with real engines)
  attribution: { rigor: 0.85, plain: 0.6 },   // concept vs execution signal (p. 71)
  study: { base: 0.4, rigor: 0.3, captured: 0.2 },   // fidelity p_full (pp. 65, 117)
  staffForwardRisk: 0.1,      // −1 action next phase (pp. 126–127)
  commanderReplaced: 0.2,     // per phase (p. 164)
  prestigeQuality: -0.05,     // leader-quality cost for line units (pp. 29–30)
  pullBattalionShare: 0.15,   // one battalion ≈ 3 of ~20 line companies
  codifyThreshold: 0.06,      // scripted chooser: codify only if estimate > this (W3: 0.1 -> 0.06, about 2 standard errors of a real micro-battle test)
  initiativeP: 0.03,          // §6.4: per stalled/pinned unit-hour × latitude level (pp. 28–29)
};

// ---- Doctrine cards (SPEC §6.3) ----
// `sides`: which side's army can use it ('a' attacker, 'd' defender). `tech`: technical arm (trains ×2).
// `effect`: NOTIONAL true effect size on the card's metric (fractional loss reduction etc.), used by the
// stub battle model and as the ground truth a micro-battle test should recover. `false`: a false lesson
// (positive-looking in context, harmful in fact). `metric`: the telemetry pair that yields observations.
export const CARDS = [
  { id: 'AT1', domain: 'AT', name: 'Small groups', sides: 'a', effect: 0.35,
    metric: 'Loss per sector gained: small groups vs waves', page: 'Hunzeker pp. 56, 70–72',
    text: 'Line infantry use small groups at full effect.', seen: 'their companies came in small groups this time' },
  { id: 'AT2', domain: 'AT', name: 'Infiltration and bypass', sides: 'a', effect: 0.25,
    metric: 'Detection rate and gain of infiltrators', page: 'Hunzeker pp. 71–72',
    text: 'Line infantry infiltrate with stealth.', seen: 'their line companies slipped past your posts' },
  { id: 'AT3', domain: 'AT', name: 'Organic firepower', sides: 'a', effect: 0.30,
    metric: 'Loss with vs without overwatch', page: 'Hunzeker pp. 71–72',
    text: '+30% firepower; overwatch cap +0.1.', seen: 'their assault groups carried more firepower' },
  { id: 'CA1', domain: 'CA', name: 'Predicted fire', sides: 'a', tech: true, effect: 0.30,
    metric: 'Defender reaction after hurricane vs methodical preparation', page: 'Hunzeker p. 59',
    text: 'Hurricane preparation without the registration warning.', seen: 'their bombardment came without registration fire' },
  { id: 'CA2', domain: 'CA', name: 'Artillery–infantry liaison', sides: 'ad', tech: true, effect: 0.40,
    metric: 'Early/late lifts and their losses', page: 'Hunzeker pp. 52, 110',
    text: 'Calls for fire −1 h; early-lift residual 0.5; gas discipline.', seen: 'their fire answered calls faster' },
  { id: 'CA3', domain: 'CA', name: 'Tank–infantry cooperation', modernName: 'Drone–fires link', sides: 'a', modernSides: 'ad', tech: true, effect: 0.20,
    metric: 'Tank losses supported vs unsupported', page: 'Hunzeker pp. 110–111; Biddle pp. 129–130',
    text: 'Unsupported-armor penalty halved; tanks suppress at full effect only beside trained infantry (1917–18); a Suppress mission on a drone-watched sector lands as one battery more (modern).', seen: 'their tanks kept infantry close' },
  { id: 'ED1', domain: 'ED', name: 'Outpost zone and concealed siting', sides: 'd', effect: 0.30,
    metric: 'Forward-zone bombardment losses', page: 'Hunzeker pp. 78–82',
    text: 'f_e −0.2 on reverse-slope trenches; dispersed positions fully concealed (f_e 0, untrained 0.3); dummy positions; outpost detection × 1.5.', seen: 'their front line was thinner and harder to find' },
  { id: 'ED2', domain: 'ED', name: 'Elastic yield', sides: 'd', effect: 0.20,
    metric: 'Yield outcomes', page: 'Hunzeker pp. 61, 81–82',
    text: 'Elastic without panic. Untrained: a yield turns into a break at p = 0.5.', seen: 'their posts gave ground and did not break' },
  { id: 'ED3', domain: 'ED', name: 'Immediate counterattack authority', sides: 'd', effect: 0.40,
    metric: 'Riposte success by window', page: 'Hunzeker p. 82',
    text: 'Riposte with no order delay; the counterstroke formation needs no extra 2 hours for orders.', seen: 'their counterattacks came faster' },
  { id: 'FL1', domain: 'AT', name: 'Quick rupture', sides: 'a', false: true, effect: -0.30, apparent: 0.5,
    metric: 'Fast win in a context-degraded column', page: 'Hunzeker pp. 138, 147–148',
    text: 'Defaults become Rush + fast creeper; the auto-plan uses it.', seen: 'they came at a run behind a fast creeper' },
  { id: 'FL2', domain: 'ED', name: 'Hold every yard', sides: 'd', false: true, effect: -0.25, apparent: 0.45,
    metric: 'Forward-heavy defense held against a poor attack', page: 'Hunzeker pp. 117–118',
    text: 'Hold at all costs by default; Elastic disabled.', seen: 'every forward post held to the last' },
];
export const CARD_IDS = CARDS.map(c => c.id);
export const TRUE_CARDS = CARDS.filter(c => !c.false).map(c => c.id);
export const DOMAINS = [
  { id: 'AT', label: 'Assault tactics' },
  { id: 'CA', label: 'Combined arms' },
  { id: 'ED', label: 'Elastic defense in depth' },
];

// ---- Archetypes (SPEC §6.2; D-20) ----
// `path[k]` = dials in force for battle k+1 and the learning phase after battle k (k = 0..3).
// Dials drift along the path unless the player changed that dial by hand.
// cell: assessment cell exists; indep/prestige/rigor: its attributes (all three = Independent).
const IND = { cell: true, indep: true, prestige: true, rigor: true };
const CONDUIT = { cell: true, indep: false, prestige: false, rigor: false };
const NONE = { cell: false, indep: false, prestige: false, rigor: false };
export const ARCHETYPES = {
  staff: {
    label: 'Staff model', note: 'modeled on one of the three armies in Hunzeker\'s study; see Lessons',
    sig: 'Explores later; selects and spreads fastest; copies freely (p. 65).',
    // latitude modCent → modDec (pp. 83–85); Independent from the start (pp. 86–87);
    // training partial → centralized (pp. 89–92).
    path: [
      { lat: 2, assess: IND, train: 'partial' },
      { lat: 3, assess: IND, train: 'centralized' },
      { lat: 3, assess: IND, train: 'centralized' },
      { lat: 3, assess: IND, train: 'centralized' },
    ],
    constraints: [],
  },
  regimental: {
    label: 'Regimental model', note: 'modeled on one of the three armies in Hunzeker\'s study; see Lessons',
    sig: 'Many pamphlets, no filter (p. 126); technical arms excel (pp. 131–132).',
    // latitude modCent → centralized (trap) → modDec (pp. 119–124); assessment none → Independent from
    // the second learning phase (pp. 127–128); training decentralized → partial → centralized (pp. 128–131).
    path: [
      { lat: 2, assess: NONE, train: 'decentralized' },
      { lat: 1, assess: NONE, train: 'decentralized' },
      { lat: 1, assess: IND, train: 'partial' },
      { lat: 3, assess: IND, train: 'centralized' },
    ],
    constraints: [],
  },
  republican: {
    label: 'Republican model', note: 'modeled on one of the three armies in Hunzeker\'s study; see Lessons',
    sig: 'Explores first and most; pamphlet cacophony; doctrinal whiplash (p. 164).',
    // modDec throughout (pp. 159–162); conduit → Independent at the last phase (pp. 163–165);
    // decentralized training, technical arms centralized (pp. 165–169); political bar on elasticity
    // (pp. 133–134, 169) as a constraint card (D-24).
    path: [
      { lat: 3, assess: CONDUIT, train: 'decentralized', techTrain: 'centralized' },
      { lat: 3, assess: CONDUIT, train: 'decentralized', techTrain: 'centralized' },
      { lat: 3, assess: CONDUIT, train: 'decentralized', techTrain: 'centralized' },
      { lat: 3, assess: IND, train: 'decentralized', techTrain: 'centralized' },
    ],
    constraints: ['noYield'],
  },
};
export const ARCHETYPE_IDS = ['staff', 'regimental', 'republican'];
export const ASSESS_PRESETS = { none: NONE, conduit: CONDUIT, independent: IND };

// Political constraint cards (D-24, P2; Hunzeker pp. 11, 134, 169).
export const CONSTRAINTS = {
  noYield: { label: 'No voluntary withdrawal', text: 'The capital forbids yielding ground: Elastic yield cannot be codified.', blocks: ['ED2'], page: 'Hunzeker pp. 133–134, 169' },
};

// ---- Learning actions (SPEC §6.3) ----
export const ACTIONS = {
  analyze: { label: 'Analyze an observation', page: 'pp. 29–31' },
  test: { label: 'Raise experimental unit', page: 'p. 71', cost: 'One company misses the next battle' },
  codify: { label: 'Codify', page: 'pp. 36–37' },
  train: { label: 'Train', page: 'pp. 31–33' },
  study: { label: 'Study enemy doctrine', page: 'pp. 65, 117' },
  redteam: { label: 'Red-team memo', page: 'p. 89' },
  staffForward: { label: 'Staff officers forward', page: 'pp. 126–127' },
  pullBattalion: { label: 'Pull a battalion off the line', page: 'p. 74', cost: 'The battalion misses the next battle' },
  dial: { label: 'Change a dial one step', page: 'pp. 29–30' },
};

// Card state ladder (SPEC §6.3). Index order matters.
export const STATES = ['unknown', 'observed', 'candidate', 'tested', 'codified', 'training', 'mastered'];
export const STATE_PHASE = { observed: 'E', candidate: 'E', tested: 'S', codified: 'S', training: 'A', mastered: 'M' };

// Campaign-sim targets (SPEC §9.2 campaign row).
export const SIM_TARGETS = { icMasters2: 0.70, conduitFalse: 0.30 };
