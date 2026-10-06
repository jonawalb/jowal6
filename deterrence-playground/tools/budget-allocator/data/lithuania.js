// Lithuania profile for the Defense Budget Allocator.
// SOURCED (all opened 2026-10-02; kam.lt blocks automated requests, so its pages were read through the Wayback Machine):
//   Budgets
//   KAM, "The Seimas approves record defence budget of EUR 4.79 billion or 5.38 % of GDP in 2026", 2025-12-11:
//     https://web.archive.org/web/20260915200644/https://kam.lt/en/the-seimas-approves-record-defence-budget-of-eur-4-79-billion-or-5-38-of-gdp-in-2026/
//     (EUR 4.79bn, 5.38% of GDP, +43% on 2025; 60% of the MoD budget for modernization; EUR 1.7bn for weaponry and equipment:
//      IFVs EUR 375m, tanks ~EUR 350m, CAESAR EUR 100m, HIMARS ~EUR 70m; NASAMS ~EUR 100m, MSHORAD ~EUR 60m, counter-drone EUR 145m;
//      infrastructure ~EUR 240m; personnel ~EUR 650m; Ukraine 0.25% of GDP; State Defence Fund ~EUR 700m, of which ~EUR 480m First
//      Division, ~EUR 50m German Brigade infrastructure, plus countermobility fortifications and counter-UAV)
//   LRT, Seimas approves 2026 budget: https://www.lrt.lt/en/news-in-english/19/2772232/lithuanian-seimas-approves-2026-budget-with-record-military-spending
//   The Defense Post, 2025-01-18: https://thedefensepost.com/2025/01/18/lithuania-increase-defense-spending/ (5-6% of GDP a year, 2026-2030)
//   Kyiv Independent, 2025-05-06: https://kyivindependent.com/lithuania-to-mine-border-with-russia-belarus-in-1-2-billion-defense-plan/
//     (EUR 1.1bn over the next decade for counter-mobility, about EUR 800m of it for anti-tank mines; MoD announcement of May 5)
//   European Interest: https://www.europeaninterest.eu/lithuania-signs-eu-safe-defence-loan-to-increase-its-defence-capability/ (SAFE EUR 6.375bn)
//   Open Access Government, 2026-06-24: https://www.openaccessgovernment.org/lithuania-receives-e956-million-as-the-first-payment-under-the-eu-safe-defence-fund/211099/
//     (first SAFE payment EUR 956.3m = 15% of EUR 6.4bn)
//   SIPRI Milex database v1.2 (2026): https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx
//     (2025: EUR 2,617m = US$2,952m, 3.08% of GDP; the implied 0.8865 EUR/USD is used for conversions, an estimate)
//   Unit costs: see `src` on each category below.
// NOTIONAL: every baseline (base), scale (k), reach, weight (w), the approach geometry and the preset mixes. No unit count was
//   published for Lithuania's anti-tank mine, artillery ammunition or sensor contracts, so those three unit costs are notional.

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2);
const USD = 0.8865;
const KAM = 'https://web.archive.org/web/20260915200644/https://kam.lt/en/the-seimas-approves-record-defence-budget-of-eur-4-79-billion-or-5-38-of-gdp-in-2026/';
const FR = 'https://www.federalregister.gov/d/';

export const LITHUANIA = {
  k: 'lt', name: 'Lithuania', sub: '€ · armored thrust', cur: '€',
  money: bn => bn >= 1 ? `€${fmtBn(bn)}bn` : bn >= 0.01 ? `€${Math.round(bn * 1000)}m` : `€${(bn * 1000).toFixed(1)}m`,
  budgets: [
    { k: 'sdf', bn: 0.7, t: 'State Defence Fund, 2026', s: '€0.7bn · expected, defense ministry',
      note: 'The separate fund the defense ministry expects to reach about €700m in 2026. Most of it, about €480m, goes to the new division\'s tanks and infantry fighting vehicles.' },
    { k: 'eq26', bn: 1.7, t: 'Weapons and equipment, 2026', s: '€1.7bn · within the 2026 defense budget',
      note: 'The part of the 2026 defense budget the ministry set aside for weapons and military equipment. It also pays for acquisitions already planned and under way.' },
    { k: 'lt26', bn: 4.79, t: 'All defense spending, 2026', s: '€4.79bn · 5.38% of GDP, budget act',
      note: 'The 2026 defense budget the Seimas approved in December 2025, up 43% on 2025. About a third pays for running costs such as pay.' },
    { k: 'safe', bn: 6.375, t: 'EU SAFE defense loans', s: '€6.375bn · signed 2026',
      note: 'Low-interest EU loans for ammunition, air defense, counter-drone systems and counter-mobility, paid out over several years. The first €956m arrived in June 2026.' },
  ],
  cats: [
    { id: 'ascm', t: 'Anti-tank missiles', col: '--c3', k: 0.2, base: 0.35, reach: 4, w: 0.5, cls: 'mobile',
      unit: '100 Javelin missiles with launchers', cost: 0.125 / 341 * 100 * USD, s: 'Javelin and Spike teams and 84 mm launchers with the infantry.',
      src: FR + '2023-11582', srcName: 'Federal Register, June 1, 2023 (DSCA 22-02)', est: true,
      basis: 'US$125m for 341 missiles and 30 command launch units, per 100 missiles, converted at 0.8865.' },
    { id: 'drones', t: 'Drones and loitering munitions', col: '--c2', k: 0.12, base: 0.15, reach: 25, w: 0.45, cls: 'mobile',
      unit: '1,000 FPV attack drones', cost: 0.008 / 7300 * 1000, s: 'Small attack and reconnaissance drones, many made in Lithuania.',
      src: 'https://www.defensenews.com/global/europe/2024/09/26/lithuania-to-deliver-thousands-of-fpv-drones-to-its-army-ukraine/', srcName: 'Defense News, Sept. 26, 2024', est: true,
      basis: '€8m for 7,300 Lithuanian-made FPV drones (2,300 for the army, 5,000 for Ukraine), per 1,000.' },
    { id: 'mines', t: 'Barriers and anti-tank mines', col: '--c5', k: 0.08, base: 0.15, reach: 8, w: 0.45, cls: 'mines',
      unit: '1,000 anti-tank mines', cost: 0.005, s: 'Ditches, dragon\'s teeth and minefields of the Baltic Defence Line.' },
    { id: 'strike', t: 'Rocket artillery', col: '--c4', k: 0.6, base: 0.2, reach: 60, w: 0.35, cls: 'mobile',
      unit: 'HIMARS launcher with missile pods', cost: 0.495 / 8 * USD, s: 'HIMARS and CAESAR howitzers striking the column in depth.',
      src: FR + '2024-18288', srcName: 'Federal Register, Aug. 15, 2024 (DSCA 22-60)', est: true,
      basis: 'US$495m for 8 launchers with 162 rocket and missile pods, per launcher, converted at 0.8865. An approval ceiling, not a contract.' },
    { id: 'airdef', t: 'Air and counter-drone defense', col: '--c1', k: 1.2, base: 0.25, reach: 0, w: 0, cls: 'fixed',
      unit: 'NASAMS battery', cost: 0.234, s: 'NASAMS, short-range and counter-drone systems protecting forces from the opening strikes.',
      src: 'https://www.baltictimes.com/lithuania_buys_additional_nasams_systems_for_eur_234_mln/', srcName: 'The Baltic Times, Oct. 4, 2024',
      basis: '€234m contract signed Oct. 3, 2024 for one more NASAMS battery, delivered in 2028. Kongsberg put its share at €193m, which also upgrades equipment bought in 2017.' },
    { id: 'c4isr', t: 'C4ISR and resilience', col: '--c6', k: 0.2, base: 0.3, reach: 0, w: 0, cls: 'mobile',
      unit: 'sensor and network package', cost: 0.02, s: 'Radars, surveillance, networks, electronic warfare and dispersal.' },
    { id: 'ammo', t: 'Artillery ammunition', col: '--c7', k: 0.4, base: 0.2, reach: 0, w: 0, cls: 'fixed',
      unit: 'week of artillery stock', cost: 0.05, s: '155 mm shells, rockets and mortar rounds to keep firing after the first days.' },
    { id: 'platforms', t: 'Tanks and infantry fighting vehicles', col: '--c8', k: 2.5, base: 0.1, reach: 25, w: 0.45, cls: 'platform',
      unit: 'Leopard 2A8 tank, share of contract', cost: 0.95 / 44, s: 'Leopard 2A8 tanks and CV90 fighting vehicles for the new division.',
      src: 'https://www.edrmagazine.eu/lithuania-procures-leopard-2-a8-main-battle-tanks-from-knds', srcName: 'EDR Magazine, Dec. 2024', est: true,
      basis: '€950m for 44 tanks with spare parts and logistics, signed Dec. 19, 2024, per tank. No price was published for the 100 CV90.' },
    { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
      unit: '', cost: 0, s: 'Personnel, pay, infrastructure, host-nation support, aid to Ukraine and programs outside the scenario.' },
  ],
  presets: {
    porcupine: { t: 'Depth and attrition', s: 'Mines, drones, rockets and anti-tank missiles',
      mix: { ascm: 0.14, drones: 0.14, mines: 0.14, strike: 0.2, airdef: 0.14, c4isr: 0.1, ammo: 0.1, platforms: 0.04, other: 0 } },
    legacy: { t: 'Heavy division first', s: 'Tanks, fighting vehicles and NASAMS',
      mix: { ascm: 0.03, drones: 0.02, mines: 0.02, strike: 0.06, airdef: 0.22, c4isr: 0.04, ammo: 0.06, platforms: 0.55, other: 0 } },
    even: { t: 'Even split', s: 'The same amount to each modeled category',
      mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
  },
  defaults: { b: 'eq26', preset: 'porcupine', supp: 0.5, warn: 5 },
  geo: { km: 60, speed: 10, unit: 'km/h' },
  geoLabel: 'Approach depth',
  refText: {
    sdf: ['What the fund pays for', 'About €480m for the division\'s tanks and fighting vehicles and about €50m for German Brigade infrastructure; the rest goes to civil defense, military mobility, counter-mobility fortifications and counter-drone systems. That is not a full split, so there is no reference mix.'],
    eq26: ['What the line pays for', 'Named items include infantry fighting vehicles (€375m), tanks (about €350m), CAESAR howitzers (€100m), HIMARS (about €70m), NASAMS (about €100m), mobile short-range air defense (about €60m) and counter-drone defense (€145m). They do not add up to the whole line, so there is no reference mix.'],
    lt26: ['How the budget splits', 'About 60% of the defense ministry budget goes to modernization and about a third to running costs, including about €650m in pay. There is no per-capability split, so there is no reference mix.'],
    safe: ['What the loans will buy', 'The defense minister named medium- and long-range air defense and counter-drone systems; reporting also lists ammunition and counter-mobility. No per-item amounts were found, so there is no reference mix.'],
  },
  strip: { left: 'Start line', right: 'Defended line', zero: 'line', noun: 'vehicles', play: 'Play the advance', exportTitle: 'Notional armored advance',
    land: true, vehicle: true,
    eyebrow: 'Notional armored advance <span class="notional">Notional model, not a prediction</span>',
    note: 'Bands show how far each layer reaches forward of the defended line; darker means stronger after the attacker\'s opening strikes. Triangles on the right are Lithuania\'s mobile launchers and teams and rectangles its tanks and fighting vehicles; faded ones did not survive the opening strikes. No real terrain or units are shown.',
    aria: 'Stylized armored advance. An attacking armored column moves from its start line on the left toward a defended line in Lithuania on the right, through bands showing how far each of Lithuania\'s layers reaches and how strong it is. Vehicles marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly advance', 'A large share of the attacking force comes under effective attack before it reaches the line.'],
      warn: ['Contested advance', 'Lithuania engages part of the force, but most of it reaches the line intact.'],
      bad: ['Advance largely unopposed', 'Too little of Lithuania\'s firepower survives, sees the column or reaches it.'],
    },
    explain: {
      mobile: n => `Only ${n}% of mobile launchers and teams survive the opening strikes; air defense and resilience spending protect them.`,
      platform: n => `Tanks and fighting vehicles concentrate at known bases, so only ${n}% remain after the opening strikes.`,
      track: 'Weak sensors and networks leave shooters without good tracks on the column.',
      mines: n => `With short warning only ${n}% of the obstacle belt is in place in time.`,
    },
    tiles: { engaged: 'of the attacking force comes under effective attack', hours: h => `of a ${h} h advance`, shooters: 'after the opening strikes' },
    supp: ['Opening missile and air strikes', 'Share of Lithuania\'s unprotected forces the attacker\'s opening strikes would destroy.'],
    warn: ['Warning before the attack', 'Days Lithuania has to close barriers and lay mines before the column moves.'],
  },
  doc: {
    terms: { attacker: 'The attacker', c4: 'C4ISR', platforms: 'Tanks and fighting vehicles', edge: 'the defended line' },
    howto: [
      'Pick a budget, then divide it across eight kinds of capability. The model sends a notional armored column toward a defended line and reports four things: the share of the force that comes under effective attack, how many hours of the advance are spent inside at least one working layer of Lithuania\'s fires, the share of Lithuania\'s shooters that survive the attacker\'s opening strikes, and a resilience score.',
      'The comparison table sets your plan beside three mixes. <b>Depth and attrition</b> buys many small, dispersed systems. <b>Heavy division first</b> buys tanks, fighting vehicles and NASAMS. No published breakdown maps Lithuania\'s budget onto these categories, so there is no official reference mix.',
    ],
    scenario: 'An attacking armored force advances a notional 60 km at 10 km/h from the border toward a defended line in Lithuania. Lithuania borders Belarus and Russia\'s Kaliningrad exclave, and the land link to Poland runs through the Suwałki gap between them. The model is abstract: it includes no terrain, roads, units or positions, and the attacker is not modeled in any detail. It is there to show how the order of spending changes what happens to a force that has to cross Lithuania\'s layers.',
    leavesOut: 'What the model leaves out matters: NATO allies, including the German brigade being stationed in Lithuania and U.S. forces, air power, the attacker\'s engineers, electronic warfare and air defense, terrain, weather, training, maintenance, delivery schedules and peacetime deterrence. A system that does poorly here can still be the right buy for those jobs.',
    real: {
      cols: ['Budget line', '€ bn', 'Notes'],
      rows: [
        ['Defense budget, 2026', '4.79', `5.38% of GDP, up 43% on 2025. <a href="${KAM}" target="_blank" rel="noopener">Defense ministry, Dec. 11, 2025</a>`],
        ['of which weapons and equipment', '1.7', `<a href="${KAM}" target="_blank" rel="noopener">Defense ministry</a>`],
        ['of which personnel pay', '~0.65', `About a third of the budget is running costs. <a href="${KAM}" target="_blank" rel="noopener">Defense ministry</a>`],
        ['State Defence Fund, 2026', '~0.7', `Expected; about €0.48bn for the division. <a href="${KAM}" target="_blank" rel="noopener">Defense ministry</a>`],
        ['Counter-mobility plan, next decade', '~1.1', 'About €0.8bn of it for anti-tank mines. <a href="https://kyivindependent.com/lithuania-to-mine-border-with-russia-belarus-in-1-2-billion-defense-plan/" target="_blank" rel="noopener">Kyiv Independent, May 6, 2025</a>'],
        ['EU SAFE loans', '6.375', 'First payment €0.956bn, 15%, in June 2026. <a href="https://www.openaccessgovernment.org/lithuania-receives-e956-million-as-the-first-payment-under-the-eu-safe-defence-fund/211099/" target="_blank" rel="noopener">Open Access Government, June 24, 2026</a>'],
      ],
      note: 'The State Defence Fund is counted inside the €4.79bn total. The ministry says detailed 2026 appropriations are set later by government decision.',
    },
    menuNote: 'Contract values were published for anti-tank mines (€22.8m from Eksplosita, Dec. 2025; €5.9m of Sentry mines, 2024) but not the number of mines, so the mine row is notional. Ammunition and sensors are notional for the same reason.',
    related: [
      { b: 'Multi-year commitment.', t: '5-6% of GDP a year on defense in 2026-2030, decided in January 2025 to build a division faster.', url: 'https://thedefensepost.com/2025/01/18/lithuania-increase-defense-spending/', src: 'The Defense Post, Jan. 18, 2025' },
      { b: 'SIPRI, 2025.', t: '€2.62bn, about US$2.95bn, 3.1% of GDP. SIPRI\'s definition differs from the national one.', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', src: 'SIPRI Military Expenditure Database, 2026 (xlsx)' },
      { b: 'CV90.', t: 'Lithuania and five partners signed an implementation agreement for 100 CV90 MkIV, first deliveries from 2028; no value published.', url: 'https://www.lrt.lt/en/news-in-english/19/2964056/lithuania-partners-sign-cv90-implementation-deal', src: 'LRT, June 18, 2026' },
      { b: 'Anti-tank mines and FPV warheads.', t: '€22.8m for anti-tank mines and €9m for FPV drone warheads, both from Lithuanian firms.', url: 'https://www.globalsecurity.org/military/library/news/2025/12/mil-251219-lithuania-mnd01.htm', src: 'Defense ministry via GlobalSecurity, Dec. 19, 2025' },
      { b: 'AIM-9X for NASAMS.', t: '168 AIM-9X Block II missiles at an estimated US$214m; an approval, not a contract.', url: FR + '2026-09647', src: 'Federal Register, May 14, 2026 (DSCA 26-40)' },
    ],
    sources: [
      { src: 'Ministry of National Defence, The Seimas approves record defence budget of EUR 4.79 billion or 5.38% of GDP in 2026', url: KAM, d: 'December 11, 2025', n: 'Read through the Wayback Machine.' },
      { src: 'Kyiv Independent, Lithuania to mine border with Russia, Belarus in $1.2 billion defense plan', url: 'https://kyivindependent.com/lithuania-to-mine-border-with-russia-belarus-in-1-2-billion-defense-plan/', d: 'May 6, 2025', n: 'Counter-mobility plan and the Suwałki gap.' },
      { src: 'SIPRI Military Expenditure Database', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', d: '2026', n: 'Also the basis of the 0.8865 EUR/USD rate used for conversions (€2,617m = US$2,952m in 2025).' },
      { src: 'Unit-cost sources are linked in the spending menu table.' },
    ],
    missing: 'Mine counts behind the published contract values, a CV90 price, Lithuanian 155 mm ammunition contract quantities, an IRIS-T or other medium-range air defense contract price, and a per-item split of the SAFE loans.',
  },
};
