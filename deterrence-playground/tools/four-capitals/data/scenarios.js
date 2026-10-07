// Scenario starts (Batch C): the situation the game opens in. Every value is notional game design, invented for
// play: no real order of battle, incident, date or poll. js/scenario.js applies a scenario to a new game; the
// default ('gray') changes nothing, so it is the v5 start.
// A scenario: { id, code (one letter, for copy links), label, t0 (first month: 0 = March), short (the picker's line),
//   brief (the opening situation, shown before the first month), set (shared tracks, rung and flags),
//   c (capitals' tracks), anger (anger[victim][at]), res (resources), units (formation changes), last (the month
//   before the game: what the computer expects each capital to repeat, and what "used last month" reads) }.
const LAST = (posture, actions, follow = {}) => ({ posture, actions, follow, orders: {} });

export const SCENARIOS = [
  { id: 'gray', code: 'g', label: 'Gray-zone pressure', t0: 0,
    short: 'March 2029. Pressure below the threshold of force; nothing has been fired. The standard start.',
    brief: 'Beijing has stepped up pressure on Taiwan after a disputed election result. Its navy already holds the Strait; Japan watches the North and U.S. ships sit east of Taiwan. Washington, Tokyo and Taipei are watching each other as closely as they watch Beijing. Nothing has been fired yet.' },
  { id: 'quarantine', code: 'q', label: 'Quarantine', t0: 0,
    short: 'March 2029. China’s coast guard is already boarding and turning back ships bound for Taiwan.',
    brief: 'China’s coast guard has declared “customs inspections” of shipping bound for Taiwan’s ports, and its cutters are boarding cargo ships in the Strait. It is not a blockade, and nothing has been fired, but trade is slowing and insurers are nervous. The crisis opens at Coercion and quarantine.',
    set: { rung: 1, maxRung: 1, tw: 67, coal: 64, shock: 16, nuke: 7 },
    c: { tw: { economy: 61, support: 58 }, cn: { support: 68 } },
    anger: { tw: { cn: 6 } },
    res: { cn: { fuel: 7 }, tw: { fuel: 3.5 } },
    last: { cn: LAST('esc', ['cn_quarantine', 'cn_cglaw'], { cn_quarantine: { scope: 'north', rules: 'inspect' } }) } },
  { id: 'blockade', code: 'b', label: 'Blockade', t0: 1,
    short: 'April 2029. China has declared an energy blockade; a second U.S. carrier is on its way. Seven months.',
    brief: 'China has declared that no fuel or gas may reach Taiwan and holds the Strait and the waters to the south. Taiwan is rationing energy. A second U.S. carrier group has left Hawaii and arrives this month. Nobody has fired on anyone else’s forces yet. The crisis opens at Blockade, in April, with seven months left.',
    set: { rung: 2, maxRung: 2, tw: 64, coal: 66, shock: 26, nuke: 12, blockade: 0.7 },
    c: { tw: { economy: 58, support: 62 }, cn: { support: 67, economy: 60 }, us: { support: 57 }, jp: { economy: 58 } },
    anger: { tw: { cn: 10 }, us: { cn: 4 }, jp: { cn: 3 } },
    res: { cn: { fuel: 6, mun: 13 }, tw: { fuel: 3, mun: 3.5 } },
    units: { us_csg2: { transit: 'east' }, cn_ssf: { ready: 85 }, cn_esf: { ready: 85 } },
    last: { cn: LAST('esc', ['cn_blockade', 'cn_cog'], { cn_blockade: { kind: 'energy' } }) } },
  { id: 'kinmen', code: 'k', label: 'Kinmen seizure', t0: 1,
    short: 'April 2029. China has seized an outlying island group off its coast. Seven months.',
    brief: 'In a fast operation China has taken the Kinmen island group off its own coast and declared it “returned”. Taiwan’s island cables are cut, its public has rallied, and partners are alarmed. Beijing says it wants nothing more; nobody believes it. The crisis opens at Blockade level (no blockade is in force), in April, with seven months left.',
    set: { rung: 2, maxRung: 2, tw: 63, coal: 70, shock: 20, nuke: 10, cables: 2 },
    c: { tw: { support: 66 }, cn: { support: 70 }, us: { support: 58 }, jp: { support: 57 } },
    anger: { tw: { cn: 25 }, us: { cn: 8 }, jp: { cn: 4 } },
    res: { cn: { fuel: 6.5, mun: 12 } },
    units: { cn_amph: { ready: 70 }, cn_af: { ready: 85 } },
    last: { cn: LAST('esc', ['cn_militia', 'cn_cables'], { cn_militia: { where: 'kinmen' }, cn_cables: { target: 'outlying' } }) } },
  { id: 'election', code: 'e', label: 'Post-election crisis', t0: 0,
    short: 'March 2029. A bitterly disputed result in Taipei, a hostile legislature and a Beijing that smells weakness.',
    brief: 'Taiwan’s presidential election was decided by a sliver, and the losing side disputes it. The new government faces a legislature that will slow-walk its emergency budgets. Beijing calls the result illegitimate; Washington and Tokyo are unsure whom to back on the details. Nothing has been fired yet.',
    set: { rung: 0, tw: 70, coal: 56, shock: 10, nuke: 5, twLeg: 'hostile' },
    c: { tw: { support: 48 }, us: { support: 50 }, cn: { support: 70 } } },
];
export const SCENARIO = Object.fromEntries(SCENARIOS.map(x => [x.id, x]));
export const SCENARIO_BY_CODE = Object.fromEntries(SCENARIOS.map(x => [x.code, x]));
export const DEFAULT_SCENARIO = 'gray';
