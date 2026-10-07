// Model parameters for Kharg Island.
// Each entry names a source key (see data/sources.js) or is notional (src: null). Notional values are
// modelling assumptions that no open source gives; every one of them can be edited on the page.
// Strength points are notional: one point is about 1,000 troops.

export const TURN_HOURS = 12;
export const BUDGET = 100; // notional

/** U.S. objectives. */
export const OBJECTIVES = {
  seize: { t: 'Seize and hold', s: 'Take the island and keep it as leverage over exports' },
  raid: { t: 'Raid and withdraw', s: 'Land, take the airstrip area, pull out' },
  blockade: { t: 'Blockade, no landing', s: 'Stop tankers loading at Kharg from offshore' },
};

/** U.S. force menu. cost = notional budget points. */
export const MENU = [
  { k: 'meu', one: 'ARG/MEU', t: 'Amphibious ready group with a Marine expeditionary unit', s: 'Three or four ships, about 2,200 Marines', cost: 24, max: 2, def: 1, src: 'meu' },
  { k: 'abn', one: 'airborne battalion', t: 'Airborne or air assault battalions', s: 'Parachute or helicopter lift onto the island', cost: 10, max: 2, def: 1, src: 'ab82' },
  { k: 'cvw', one: 'carrier air wing', t: 'Carrier air wings', s: 'Suppression strikes and close air support', cost: 18, max: 2, def: 1, src: 'twzBlockade' },
  { k: 'ddg', one: 'escort destroyer', t: 'Escort destroyers', s: 'Air and missile defense; blockade stations', cost: 6, max: 5, def: 3, src: 'twzBlockade' },
  { k: 'mcm', one: 'MCM group', t: 'Mine countermeasures groups', s: 'Clear the approaches each turn', cost: 6, max: 2, def: 1, src: 'usniMcm' },
  { k: 'helo', one: 'attack helicopter detachment', t: 'Attack helicopter detachments', s: 'Break up fast-attack-craft swarms', cost: 5, max: 3, def: 1, src: null },
];
export const TOGGLES = [
  { k: 'sof', t: 'Special operations raid force', s: 'Seizes the airstrip area ahead of the main landing', cost: 8, def: true, src: null },
  { k: 'bases', t: 'Fly from Gulf partner bases', s: 'More strike sorties, but hosts become targets', cost: 0, def: false, src: 'fp' },
];

/** Iranian forces the player can set, and the presets. mines: 0 none, 1 light, 2 heavy. */
export const IRAN_FIELDS = [
  { k: 'ascm', t: 'Coastal anti-ship missile batteries', s: 'Mobile launchers ashore, two salvos each', min: 0, max: 6, one: 'battery', src: 'dia' },
  { k: 'drones', t: 'Drone launch teams', s: 'One-way attack drones vs ships and troops', min: 0, max: 6, one: 'drone team', src: 'csisMissiles' },
  { k: 'fac', t: 'Fast attack craft squadrons', s: 'IRGC Navy swarm tactics', min: 0, max: 6, one: 'FAC squadron', src: 'dia' },
  { k: 'garrison', t: 'Island garrison', s: 'Strength points; up to about 1,000 personnel in 1979', min: 0.5, max: 4, step: 0.5, one: 'garrison point', src: 'frus8' },
  { k: 'reinf', t: 'Mainland reinforcement', s: 'Points Iran tries to ferry across each turn', min: 0, max: 2, step: 0.25, one: 'reinforcement point', src: null },
  { k: 'srbm', t: 'Ballistic missile salvos for regional strikes', s: 'Used for strikes on Gulf states and bases', min: 0, max: 8, one: 'missile salvo', src: 'csisMissiles' },
];
export const MINE_LEVELS = { 0: 'None', 1: 'Light', 2: 'Heavy' };
export const POSTURES = {
  deny: { t: 'Full denial', s: 'Defend the island and the approaches hard', v: { ascm: 4, drones: 4, fac: 4, garrison: 1.5, reinf: 0.75, srbm: 4, mines: 2, escal: 1 } },
  limited: { t: 'Limited response', s: 'Defend, avoid widening the war', v: { ascm: 2, drones: 2, fac: 2, garrison: 1.5, reinf: 0.5, srbm: 2, mines: 1, escal: 0.5 } },
  widen: { t: 'Widen the war', s: 'Hit shipping and Gulf states instead', v: { ascm: 3, drones: 3, fac: 3, garrison: 1.5, reinf: 0.5, srbm: 8, mines: 2, escal: 1.8 } },
};

/** Notional approach sectors. steps = objectives from the beach to the whole island; the airstrip is objective 1. */
export const SECTORS = {
  W: { t: 'Seaward side', s: 'Away from the mainland; longer to secure', steps: 3, expo: 0.85 },
  E: { t: 'Landward side', s: 'Faces the mainland; shorter, more exposed', steps: 2, expo: 1.25 },
};

/**
 * Probabilities and rates. g = group in the assumptions editor. Sourced entries name their source and
 * carry a note; everything else is notional.
 */
export const PROB = [
  // Forces
  { k: 'meuPts', t: 'Marine strength per MEU', v: 2.2, min: 1, max: 3, step: 0.1, u: 'pts', g: 'U.S. forces', src: 'meu', note: 'About 2,200 Marines per MEU; 1 point per 1,000 troops is the model\'s conversion.' },
  { k: 'abnPts', t: 'Strength per airborne battalion', v: 0.8, min: 0.3, max: 1.5, step: 0.1, u: 'pts', g: 'U.S. forces', src: null },
  { k: 'abnEff', t: 'Airborne effectiveness after the drop', v: 0.7, min: 0.3, max: 1, step: 0.05, u: '×', g: 'U.S. forces', src: null },
  { k: 'sofPts', t: 'Special operations force strength', v: 0.3, min: 0.1, max: 1, step: 0.05, u: 'pts', g: 'U.S. forces', src: null },
  { k: 'sofEff', t: 'Special operations combat multiplier', v: 2.5, min: 1, max: 4, step: 0.25, u: '×', g: 'U.S. forces', src: null },
  { k: 'airBonus', t: 'Troops flown in via a working airstrip', v: 0.4, min: 0, max: 1.5, step: 0.1, u: 'pts/turn', g: 'U.S. forces', src: null },
  { k: 'baseSorties', t: 'Partner-base strike weight', v: 0.6, min: 0, max: 1.5, step: 0.1, u: 'air wings', g: 'U.S. forces', src: null },
  // Suppression
  { k: 'pStrikeAscm', t: 'Air wing kills a missile battery', v: 0.18, min: 0, max: 0.6, step: 0.01, u: 'per turn', g: 'Suppression strikes', src: null, note: 'Mobile launchers are hard to find; the 1991 Scud hunt is the usual cautionary case.' },
  { k: 'pStrikeDrone', t: 'Air wing kills a drone team', v: 0.12, min: 0, max: 0.6, step: 0.01, u: 'per turn', g: 'Suppression strikes', src: null },
  { k: 'pStrikeFac', t: 'Air wing kills a FAC squadron', v: 0.25, min: 0, max: 0.8, step: 0.01, u: 'per turn', g: 'Suppression strikes', src: null },
  { k: 'pStrikeIsland', t: 'Prep strikes reduce the garrison', v: 0.08, min: 0, max: 0.3, step: 0.01, u: 'share/wing', g: 'Suppression strikes', src: null },
  // Iranian fire at sea
  { k: 'pAscm', t: 'Missile salvo leaks through to a ship', v: 0.35, min: 0, max: 1, step: 0.01, u: 'before defense', g: 'Salvos and swarms', src: null },
  { k: 'pDroneShip', t: 'Drone wave leaks through to a ship', v: 0.25, min: 0, max: 1, step: 0.01, u: 'before defense', g: 'Salvos and swarms', src: null },
  { k: 'pIntercept', t: 'Each destroyer stops a leaking salvo', v: 0.3, min: 0, max: 0.8, step: 0.01, u: 'per salvo', g: 'Salvos and swarms', src: null },
  { k: 'pShipHit', t: 'A leaking salvo damages a ship', v: 0.5, min: 0, max: 1, step: 0.05, u: '', g: 'Salvos and swarms', src: null },
  { k: 'pFacStop', t: 'Each helicopter detachment breaks a swarm', v: 0.35, min: 0, max: 0.9, step: 0.01, u: 'per squadron', g: 'Salvos and swarms', src: null },
  { k: 'pFacDdg', t: 'Each destroyer breaks a swarm', v: 0.1, min: 0, max: 0.5, step: 0.01, u: 'per squadron', g: 'Salvos and swarms', src: null },
  { k: 'pFacHit', t: 'A swarm that gets through damages a ship', v: 0.2, min: 0, max: 0.8, step: 0.01, u: '', g: 'Salvos and swarms', src: null, note: 'Swarm doctrine relies on numbers to saturate defenses (open descriptions of IRGC Navy doctrine).' },
  // Mines
  { k: 'pMine', t: 'Heavy mine threat stops a landing group', v: 0.12, min: 0, max: 0.5, step: 0.01, u: 'per crossing', g: 'Mines', src: null, note: 'Light mining is half this. Iran holds more than 5,000 mines (DIA); in 1988 one mine nearly sank USS Samuel B. Roberts.' },
  { k: 'mcmRate', t: 'Mine threat cleared per MCM group per turn', v: 0.25, min: 0, max: 0.6, step: 0.05, u: 'share', g: 'Mines', src: null },
  { k: 'blockMine', t: 'Mine risk to ships on blockade station', v: 0.2, min: 0, max: 1, step: 0.05, u: '× landing risk', g: 'Mines', src: null },
  // Landing and ground
  { k: 'pIslandAd', t: 'Island air defense downs an air lift', v: 0.12, min: 0, max: 0.5, step: 0.01, u: 'per lift', g: 'Landing and ground combat', src: null },
  { k: 'defMult', t: 'Defender terrain and fortification', v: 1.5, min: 1, max: 3, step: 0.1, u: '×', g: 'Landing and ground combat', src: null },
  { k: 'cas', t: 'Close air support shift per air wing', v: 0.25, min: 0, max: 1, step: 0.05, u: '× ratio', g: 'Landing and ground combat', src: null },
  { k: 'pCrater', t: 'Iran wrecks the airstrip as it falls', v: 0.5, min: 0, max: 1, step: 0.05, u: '', g: 'Landing and ground combat', src: null },
  // Mainland pressure
  { k: 'pDroneShore', t: 'Drone team hits troops ashore', v: 0.35, min: 0, max: 0.9, step: 0.05, u: 'per turn', g: 'Mainland counterattack', src: null, note: 'The nearest mainland shore is about 30 km away (measured on the map).' },
  { k: 'droneDmg', t: 'Strength lost per drone hit', v: 0.12, min: 0, max: 0.5, step: 0.01, u: 'pts', g: 'Mainland counterattack', src: null },
  { k: 'pReinf', t: 'Reinforcements get across', v: 0.6, min: 0, max: 1, step: 0.05, u: 'before interdiction', g: 'Mainland counterattack', src: null },
  { k: 'interdict', t: 'Interdiction per air wing or helicopter detachment', v: 0.2, min: 0, max: 0.5, step: 0.01, u: 'share', g: 'Mainland counterattack', src: null },
  { k: 'pExtract', t: 'Withdrawal under fire goes badly', v: 0.2, min: 0, max: 0.8, step: 0.01, u: 'base chance', g: 'Mainland counterattack', src: null, note: 'Rises by a fifth for each Iranian drone team and FAC squadron still in action.' },
  { k: 'extractLoss', t: 'Share of the raid force lost in a bad withdrawal', v: 0.4, min: 0, max: 1, step: 0.05, u: 'share', g: 'Mainland counterattack', src: null },
  // Blockade
  { k: 'pStation', t: 'Each ship on station stops a tanker attempt', v: 0.25, min: 0, max: 0.9, step: 0.01, u: 'per attempt', g: 'Blockade', src: null },
  { k: 'warRisk', t: 'Loadings that stop while fighting is nearby', v: 0.3, min: 0, max: 1, step: 0.05, u: 'share', g: 'Blockade', src: null, note: 'Tanker owners and insurers pull back from a war zone even without a blockade.' },
  { k: 'tankers', t: 'Tanker attempts per turn', v: 3, min: 1, max: 6, step: 1, u: 'per 12 h', g: 'Blockade', src: null, note: 'Each attempt stands for a third of a normal half-day of Kharg loadings.' },
  // Escalation
  { k: 'pHormuz', t: 'Iran attempts to close Hormuz', v: 0.08, min: 0, max: 0.5, step: 0.01, u: 'per turn', g: 'Escalation and politics', src: null, note: 'Base chance before posture, U.S. action and the escalation level scale it.' },
  { k: 'pGulf', t: 'Iran strikes Gulf energy infrastructure', v: 0.05, min: 0, max: 0.5, step: 0.01, u: 'per turn', g: 'Escalation and politics', src: null },
  { k: 'pRegional', t: 'Iran fires missiles at U.S. bases in the region', v: 0.07, min: 0, max: 0.5, step: 0.01, u: 'per turn', g: 'Escalation and politics', src: null },
  { k: 'basesEsc', t: 'Extra Gulf-strike risk when partner bases are used', v: 1.6, min: 1, max: 3, step: 0.1, u: '×', g: 'Escalation and politics', src: null },
  { k: 'costShip', t: 'Domestic and allied cost per ship damaged', v: 6, min: 0, max: 20, step: 1, u: 'index pts', g: 'Escalation and politics', src: null },
  { k: 'costPt', t: 'Cost per strength point lost', v: 8, min: 0, max: 25, step: 1, u: 'index pts', g: 'Escalation and politics', src: null },
  { k: 'costBases', t: 'Allied cost per turn of flying from partner bases', v: 1.5, min: 0, max: 10, step: 0.5, u: 'index pts', g: 'Escalation and politics', src: null },
  { k: 'costOil', t: 'Cost per $1 rise in the oil price', v: 0.6, min: 0, max: 3, step: 0.1, u: 'index pts', g: 'Escalation and politics', src: null },
  // Oil
  { k: 'brent', t: 'Brent baseline', v: 71, min: 30, max: 150, step: 1, u: '$/bbl', g: 'Oil', src: 'eiaBrent', note: 'EIA Brent spot on 27 February 2026, the last trading day before the war: $71.32. It was $113.96 on 29 September 2026.' },
  { k: 'iranExp', t: 'Iran\'s crude exports before the fight', v: 1.6, min: 0.3, max: 3, step: 0.1, u: 'mb/d', g: 'Oil', src: 'kpler', note: 'Kpler: about 1.61 million b/d over the 12 months to March 2026.' },
  { k: 'khargShare', t: 'Share of those exports loaded at Kharg', v: 0.94, min: 0.5, max: 1, step: 0.01, u: 'share', g: 'Oil', src: 'kpler', note: 'Kpler measured about 94%; CRS and most outlets say about 90%.' },
  { k: 'elast', t: 'Price rise per 1 mb/d taken off the market', v: 5, min: 0, max: 20, step: 0.5, u: '$/bbl', g: 'Oil', src: null, note: 'No source isolates Kharg\'s effect; 2026 prices moved with Hormuz, not Kharg alone.' },
  { k: 'premHormuz', t: 'Price premium after a Hormuz closure attempt', v: 12, min: 0, max: 50, step: 1, u: '$/bbl', g: 'Oil', src: null },
  { k: 'premGulf', t: 'Price premium after a Gulf infrastructure strike', v: 8, min: 0, max: 40, step: 1, u: '$/bbl', g: 'Oil', src: null, note: 'The 2019 Abqaiq attack brought the largest one-day Brent rise in a decade (EIA); the size here is notional.' },
];
export const PROB_DEF = Object.fromEntries(PROB.map(p => [p.k, p.v]));

/**
 * Combat results table (notional, in the style of classic board wargames). Columns: U.S. strength ashore
 * divided by effective Iranian strength. Rows: one six-sided die.
 */
export const CRT_COLS = [
  { t: '< 1:2', max: 0.5 }, { t: '1:2', max: 1 }, { t: '1:1', max: 1.5 },
  { t: '1.5:1', max: 2 }, { t: '2:1', max: 3 }, { t: '3:1+', max: Infinity },
];
export const CRT = [
  ['AR', 'AR', 'AL', 'AL', 'EX', 'EX'],
  ['AR', 'AL', 'AL', 'EX', 'EX', 'DL'],
  ['AR', 'AL', 'EX', 'EX', 'DL', 'DL'],
  ['AL', 'AL', 'EX', 'DL', 'DL', 'DR'],
  ['AL', 'EX', 'DL', 'DL', 'DR', 'DR'],
  ['EX', 'EX', 'DL', 'DR', 'DR', 'DR'],
]; // CRT[roll-1][column]
export const RESULTS = {
  AR: { t: 'Attack repulsed', us: 0.3, ir: 0.05, adv: 0 },
  AL: { t: 'Attacker losses', us: 0.2, ir: 0.1, adv: 0 },
  EX: { t: 'Exchange', us: 0.15, ir: 0.15, adv: 0 },
  DL: { t: 'Defender falls back', us: 0.1, ir: 0.25, adv: 1 },
  DR: { t: 'Defender routed', us: 0.05, ir: 0.4, adv: 1 },
};

/** Escalation events: index points added and whether the event counts as a major escalation. */
export const ESC_EVENTS = {
  hormuz: { t: 'Hormuz closure attempt', add: 15, major: false },
  gulf: { t: 'Strike on Gulf energy infrastructure', add: 25, major: true },
  regional: { t: 'Missile strikes on U.S. bases in the region', add: 12, major: false },
};
export const MAJOR_INDEX = 50; // escalation index at or above which a game counts as a major escalation (notional)
