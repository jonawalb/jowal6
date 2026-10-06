// Romania profile for the Defense Budget Allocator.
// SOURCED (all opened 2026-10-02):
//   Budgets
//   AGERPRES, 2026-03-16: https://agerpres.ro/politic/2026/03/16/parlament---buget2026-aviz-favorabil-pentru-bugetul-mapn-in-comisiile-de-specialitate--1537899
//     (MApN 2026: budget credits 49.426bn lei, +16.62% on 2025; commitment credits 112.593bn lei, +1.19%; personnel 13.883bn lei;
//      equipment almost 38% of the budget, 31.6% the year before)
//   Digi24, 2026-03-20: https://www.digi24.ro/stiri/actualitate/cum-va-fi-cheltuit-bugetul-mapn-in-2026-explicatiile-ministrului-radu-miruta-3687243
//     (49.426bn lei, 2.45% of GDP; about 18.8bn lei, 38%, for equipment)
//   MApN, "Programul SAFE": https://www.mapn.ro/programul_safe/ (loan agreement EUR 16,680,055,394; MApN share EUR 9.53bn over
//     2026-2030, 21 projects; EUR 4.2bn roads; list of projects with estimated values, used for unit costs below)
//   Airforce Technology, 2026-05-25: https://www.airforce-technology.com/news/romania-eu-defence-loan/ (signed May 12, 2026)
//   MApN press release via GlobalSecurity, 2026-06-03: https://www.globalsecurity.org/military/library/news/2026/06/mil-260603-ro-mnd04.htm
//     (May 29 contracts: 298 IFVs EUR 3,337m; 7 Skynex + 2 Skyranger 35 + 2 Millennium EUR 981.95m; 401,760 35 mm rounds EUR 449.75m)
//   SIPRI Milex database v1.2 (2026): https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx
//     (2025: 43.45bn lei = US$9.73bn, 2.28% of GDP; the implied 4.4675 lei/USD is used for conversions, an estimate)
//   ECB euro reference rate, 2026-05-12 (SAFE signing): https://data-api.ecb.europa.eu/service/data/EXR/D.RON.EUR.SP00.A?startPeriod=2026-05-12&endPeriod=2026-05-12
//     (5.2045 lei/EUR, used for EUR conversions, an estimate)
//   Unit costs: see `src` on each category below.
// NOTIONAL: every baseline (base), scale (k), reach, weight (w), the approach geometry and the preset mixes. No Romanian sea-mine
//   purchase was found, so the mine unit cost is notional.

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2);
const USD = 4.4675;
const EUR = 5.2045;
const SAFE = 'https://www.mapn.ro/programul_safe/';
const FR = 'https://www.federalregister.gov/d/';
const AG = 'https://agerpres.ro/politic/2026/03/16/parlament---buget2026-aviz-favorabil-pentru-bugetul-mapn-in-comisiile-de-specialitate--1537899';
const DIGI = 'https://www.digi24.ro/stiri/actualitate/cum-va-fi-cheltuit-bugetul-mapn-in-2026-explicatiile-ministrului-radu-miruta-3687243';

export const ROMANIA = {
  k: 'ro', name: 'Romania', sub: 'lei · Black Sea coast', cur: 'lei',
  money: bn => bn >= 1 ? `${fmtBn(bn)}bn lei` : `${Math.round(bn * 1000).toLocaleString('en-US')}m lei`,
  budgets: [
    { k: 'inz26', bn: 18.8, t: 'Equipment, 2026', s: '18.8bn lei · about 38% of the defense ministry budget',
      note: 'The part of the defense ministry\'s 2026 budget the minister says goes to equipment and new capabilities, up from 31.6% of the budget in 2025. Much of it continues major programs already under way.' },
    { k: 'mapn26', bn: 49.426, t: 'Defense ministry budget, 2026', s: '49.4bn lei · national budget, 2.45% of GDP',
      note: 'The defense ministry\'s 2026 budget as passed by Parliament, up 16.6% on 2025. About 13.9bn lei of it pays for personnel. This is national budget money for one year; the SAFE line is separate EU loan money.' },
    { k: 'safe', bn: 9.53 * EUR, t: 'EU SAFE loans, defense ministry share', s: '€9.53bn · about 49.6bn lei, EU loans for 2026-2030',
      note: 'The defense ministry\'s share of Romania\'s €16.68bn SAFE loan, for 21 projects in 2026-2030. Converted at the ECB rate of 5.2045 lei per euro on the signing date, so the lei figure is an estimate. This is borrowed EU money spread over five years, not part of the national budget. It is close in size to the ministry\'s 2026 budget, so the two lines give nearly the same results here; what differs is where the money comes from and how long it takes to spend.' },
    { k: 'ca26', bn: 112.593, t: 'Multi-year commitments, 2026', s: '112.6bn lei · commitment credits',
      note: 'The ceiling for new contracts the defense ministry may sign in 2026, paid out over several years. It is not money spent in 2026.' },
  ],
  cats: [
    { id: 'ascm', t: 'Coastal anti-ship missiles', col: '--c3', k: 5, base: 0.15, reach: 150, w: 0.55, cls: 'mobile',
      unit: 'Naval Strike Missile coastal battery', cost: 0.3 / 2 * USD, s: 'Truck-mounted Naval Strike Missile launchers on the coast.',
      src: FR + '2020-27299', srcName: 'Federal Register, Dec. 11, 2020 (DSCA 20-72)', est: true,
      basis: 'US$300m for two coastal defense systems with four launch vehicles and missiles, per system, converted at 4.4675. An approval ceiling, not a contract.' },
    { id: 'drones', t: 'Drones and loitering munitions', col: '--c2', k: 2, base: 0.1, reach: 80, w: 0.45, cls: 'mobile',
      unit: '10 loitering munition systems', cost: 0.147 / 70 * 10 * EUR, s: 'Attack and reconnaissance drones, loitering munitions and drone boats.',
      src: SAFE, srcName: 'Defense ministry, SAFE project list', est: true,
      basis: '€147m estimated for 70 loitering munition systems (joint buy led by Poland), per 10, converted at 5.2045.' },
    { id: 'mines', t: 'Sea mines', col: '--c5', k: 1.5, base: 0.05, reach: 15, w: 0.35, cls: 'mines',
      unit: 'lot of 100 mines', cost: 0.2, s: 'Mines off the approaches to ports and beaches. No Romanian sea-mine purchase was found.' },
    { id: 'strike', t: 'Rocket artillery', col: '--c4', k: 6, base: 0.2, reach: 70, w: 0.3, cls: 'mobile',
      unit: 'HIMARS launcher with missiles', cost: 1.25 / 54 * USD, s: 'HIMARS launchers striking ships close to shore and forces landing.',
      src: FR + '2017-22984', srcName: 'Federal Register, Oct. 24, 2017 (DSCA 17-36)', est: true,
      basis: 'US$1.25bn for 54 launchers with rockets, missiles and support, per launcher, converted at 4.4675. An approval ceiling, not a contract.' },
    { id: 'airdef', t: 'Air, missile and counter-drone defense', col: '--c1', k: 14, base: 0.25, reach: 0, w: 0, cls: 'fixed',
      unit: 'Patriot fire unit', cost: 3.9 / 7 * USD, s: 'Patriot, short-range and counter-drone guns protecting the coast, bases and launchers.',
      src: FR + '2017-16621', srcName: 'Federal Register, Aug. 8, 2017 (DSCA 17-35)', est: true,
      basis: 'US$3.9bn for seven fire units with 56 GEM-T and 168 PAC-3 MSE missiles, per fire unit, converted at 4.4675.' },
    { id: 'c4isr', t: 'Radars and resilience', col: '--c6', k: 2.5, base: 0.3, reach: 0, w: 0, cls: 'mobile',
      unit: 'Ground Master 200 gap-filler radar', cost: 0.247 / 12 * EUR, s: 'Low-altitude radars, maritime surveillance, networks and dispersal.',
      src: SAFE, srcName: 'Defense ministry, SAFE contracts', est: true,
      basis: 'About €247m acquisition order for 12 Thales Ground Master 200 radars with logistics and training (project €258m), per radar, converted at 5.2045.' },
    { id: 'ammo', t: 'Missile and ammunition stocks', col: '--c7', k: 5, base: 0.2, reach: 0, w: 0, cls: 'fixed',
      unit: '100,000 rounds of 35 mm air defense ammunition', cost: 0.44975 / 401760 * 100000 * EUR, s: 'Missiles, rockets and shells to keep firing after the first waves.',
      src: 'https://www.globalsecurity.org/military/library/news/2026/06/mil-260603-ro-mnd04.htm', srcName: 'Defense ministry, June 3, 2026', est: true,
      basis: '€449.75m without VAT for 401,760 rounds of 35 mm AHEAD ammunition, per 100,000, converted at 5.2045.' },
    { id: 'platforms', t: 'Fighters and warships', col: '--c8', k: 30, base: 0.2, reach: 200, w: 0.4, cls: 'platform',
      unit: 'F-35A, share of program', cost: 7.2 / 32 * USD, s: 'F-16 and F-35 fighters, frigates and patrol ships.',
      src: FR + '2025-20505', srcName: 'Federal Register, Nov. 21, 2025 (DSCA 24-94)', est: true,
      basis: 'US$7.2bn for 32 F-35A with engines, weapons support and training, per aircraft, converted at 4.4675. For scale: two offshore patrol vessels, €836m estimated (SAFE list).' },
    { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
      unit: '', cost: 0, s: 'Personnel, operations, land forces, infrastructure and programs outside the scenario.' },
  ],
  presets: {
    porcupine: { t: 'Sensors and missiles', s: 'Radars, shore missiles, drones and counter-drone guns',
      mix: { ascm: 0.22, drones: 0.16, mines: 0.06, strike: 0.1, airdef: 0.16, c4isr: 0.14, ammo: 0.12, platforms: 0.04, other: 0 } },
    legacy: { t: 'Jets and ships first', s: 'F-35s, warships and Patriot',
      mix: { ascm: 0.04, drones: 0.02, mines: 0, strike: 0.04, airdef: 0.2, c4isr: 0.04, ammo: 0.06, platforms: 0.6, other: 0 } },
    even: { t: 'Even split', s: 'The same amount to each modeled category',
      mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
  },
  defaults: { b: 'inz26', preset: 'porcupine', supp: 0.4, warn: 5 },
  geo: { km: 200, speed: 15, unit: 'kn' },
  refText: {
    inz26: ['What the line pays for', 'The minister describes continued major modernization programs and strategic infrastructure. No per-capability split was published, so there is no reference mix.'],
    mapn26: ['How the budget splits', 'About 13.9bn lei pays for personnel and about 18.8bn lei for equipment. There is no per-capability split, so there is no reference mix.'],
    safe: ['What the loans buy', 'Signed contracts include 298 infantry fighting vehicles (€3.34bn), counter-drone and very short-range air defense guns (€0.98bn), 401,760 rounds of 35 mm ammunition (€0.45bn) and patrol and diving-support ships (€0.92bn). Most of it is for land forces, so there is no reference mix.'],
    ca26: ['What the commitments cover', 'New multi-year contracts, which are paid for over several budgets. There is no per-capability split, so there is no reference mix.'],
  },
  strip: { left: 'Open sea', right: 'Romanian coast', zero: 'coast', noun: 'ships', play: 'Play the approach', exportTitle: 'Notional Black Sea approach',
    eyebrow: 'Notional Black Sea approach <span class="notional">Notional model, not a prediction</span>',
    note: 'Bands show how far each layer reaches out to sea from the Romanian coast; darker means stronger after the attacker\'s opening strikes. Triangles on the right are mobile launchers and drones and rectangles jets and warships; faded ones did not survive the opening strikes. No real coast, port, base or unit is shown.',
    aria: 'Stylized approach across the Black Sea. A hostile naval group sails from the open sea on the left toward the Romanian coast on the right, through bands showing how far each Romanian layer reaches and how strong it is. Ships marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly approach', 'A large share of the naval group comes under effective attack before it reaches the coast.'],
      warn: ['Contested approach', 'Romania engages part of the naval group, but most of it reaches the coast untouched.'],
      bad: ['Approach largely unopposed', 'Too little Romanian firepower survives, sees the ships or reaches them.'],
    },
    explain: {
      mobile: n => `Only ${n}% of missile launchers and drone teams survive the opening drone and missile strikes; air defense and radars protect them.`,
      platform: n => `Jets and warships are few and sit at known bases, so only ${n}% remain after the opening strikes.`,
      track: 'Weak radars and surveillance leave shooters without good tracks on the ships.',
      mines: n => `With short warning only ${n}% of the minefield is laid in time.`,
    },
    tiles: { engaged: 'of the naval group comes under effective attack', hours: h => `of a ${h} h approach`, shooters: 'after the opening strikes' },
    supp: ['Opening drone and missile strikes', 'Share of Romania\'s unprotected forces the opening drone and missile strikes would destroy.'],
    warn: ['Warning before the approach', 'Days Romania has to deploy launchers and lay mines before the ships arrive.'],
  },
  doc: {
    terms: { attacker: 'The attacker', c4: 'radars', platforms: 'Fighters and warships', edge: 'the coast' },
    howto: [
      'Pick a budget, then divide it across eight kinds of capability. The model sends a notional naval group across the Black Sea toward Romania\'s coast and reports four things: the share of the group that comes under effective attack, how many hours of the approach are spent inside at least one working layer of Romanian fires, the share of Romanian shooters that survive the opening drone and missile strikes, and a resilience score.',
      'The comparison table sets your plan beside three mixes. <b>Sensors and missiles</b> buys radars, shore-based missiles, drones and counter-drone defense. <b>Jets and ships first</b> buys F-35s, warships and Patriot. No published breakdown maps these budgets onto capability categories, so there is no official reference mix.',
    ],
    scenario: 'A hostile naval group sails a notional 200 km at 15 knots toward Romania\'s Black Sea coast, after opening drone and missile strikes. Russia\'s war against Ukraine runs along Romania\'s border: Romania has repeatedly reported Russian drones entering its airspace during attacks on Ukraine, and in January 2025 the defense ministry confirmed fragments of Russian drones in Tulcea County. The model is abstract: it includes no real coast, port, base or unit, and does not model NATO allies. A single drone crossing the border is a very different event from the attack shown here.',
    leavesOut: 'What the model leaves out matters: NATO allies and their forces in Romania, the Montreux Convention limits on warships entering the Black Sea, drifting mines, the attacker\'s submarines and electronic warfare, land forces, weather, training, maintenance and delivery schedules. Jets that do poorly here also police the airspace against stray drones every day.',
    real: {
      cols: ['Budget line', 'lei bn', 'Notes'],
      rows: [
        ['Defense ministry, 2026 (budget credits)', '49.4', `2.45% of GDP; up 16.6% on 2025. <a href="${DIGI}" target="_blank" rel="noopener">Digi24, Mar. 20, 2026</a>; <a href="${AG}" target="_blank" rel="noopener">AGERPRES, Mar. 16, 2026</a>`],
        ['of which equipment', '~18.8', `About 38%, up from 31.6% in 2025. <a href="${DIGI}" target="_blank" rel="noopener">Digi24</a>`],
        ['of which personnel', '13.9', `<a href="${AG}" target="_blank" rel="noopener">AGERPRES</a>`],
        ['Defense ministry, 2026 (commitment credits)', '112.6', `Ceiling for new multi-year contracts. <a href="${AG}" target="_blank" rel="noopener">AGERPRES</a>`],
        ['EU SAFE loan, all of Romania', '~86.8 (est.)', `€16.68bn, signed May 12, 2026; €9.53bn for the defense ministry, €4.2bn for roads. <a href="${SAFE}" target="_blank" rel="noopener">Defense ministry</a>`],
      ],
      note: 'Budget credits are what can be spent in 2026; commitment credits cap the contracts that can be signed, paid over later years. Euro figures are converted at the ECB rate of 5.2045 lei per euro on May 12, 2026, so they are estimates.',
    },
    menuNote: 'No Romanian sea-mine purchase was found, so that row is notional. The loitering-munition, radar and ammunition rows use the defense ministry\'s own SAFE figures.',
    related: [
      { b: 'SIPRI, 2025.', t: '43.4bn lei, about US$9.7bn, 2.3% of GDP.', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', src: 'SIPRI Military Expenditure Database, 2026 (xlsx)' },
      { b: 'Counter-drone guns.', t: '7 Skynex, 2 Skyranger 35 and 2 Millennium systems for €981.95m without VAT, signed May 29, 2026 under SAFE.', url: 'https://www.globalsecurity.org/military/library/news/2026/06/mil-260603-ro-mnd04.htm', src: 'Defense ministry, June 3, 2026' },
      { b: 'Ship-launched NSM.', t: '7 Naval Strike Missile launch systems and 48 missiles for warships, €207m estimated.', url: SAFE, src: 'Defense ministry, SAFE project list' },
      { b: 'Bayraktar TB2.', t: '18 armed drones in three systems, with support and training, for US$321m.', url: 'https://thedefensepost.com/2023/04/26/romania-combat-drone-contract-baykar/', src: 'The Defense Post, Apr. 26, 2023' },
      { b: 'Patriot replacement.', t: 'One more radar, control station and two launchers at an estimated US$280m; an approval, not a contract.', url: FR + '2026-00707', src: 'Federal Register, Jan. 15, 2026 (DSCA 25-19)' },
      { b: 'Drone incidents.', t: 'An armed drone came down near Grindu, Tulcea County, on Aug. 19-20, 2026; Kyiv said it was not Ukrainian and Romania had not yet identified its origin.', url: 'https://www.euronews.com/my-europe/2026/08/20/nato-jets-scrambled-as-drone-enters-romanian-airspace', src: 'Euronews, Aug. 20, 2026' },
    ],
    sources: [
      { src: 'AGERPRES, Favorable opinion for the 2026 defense ministry budget', url: AG, d: 'March 16, 2026', n: 'Budget and commitment credits, personnel, equipment share.' },
      { src: 'Ministry of National Defence, Programul SAFE', url: SAFE, d: 'opened October 2, 2026', n: 'Loan amount, the defense ministry share and the project list with estimated values.' },
      { src: 'Kyiv Independent via Yahoo News, Debris from Russian drones found in Romanian border town, defense ministry confirms', url: 'https://www.yahoo.com/news/debris-russian-drones-found-romanian-225537715.html', d: 'January 17, 2025' },
      { src: 'Euronews, NATO jets scrambled as drone enters Romanian airspace', url: 'https://www.euronews.com/my-europe/2026/08/20/nato-jets-scrambled-as-drone-enters-romanian-airspace', d: 'August 20, 2026', n: 'Romania has repeatedly reported Russian drones entering its airspace since 2022.' },
      { src: 'SIPRI Military Expenditure Database', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', d: '2026', n: 'Also the basis of the 4.4675 lei/USD rate used for conversions (43.45bn lei = US$9.73bn in 2025).' },
      { src: 'European Central Bank, euro reference rate for the Romanian leu', url: 'https://data-api.ecb.europa.eu/service/data/EXR/D.RON.EUR.SP00.A?startPeriod=2026-05-12&endPeriod=2026-05-12', d: 'May 12, 2026', n: '5.2045 lei per euro, used for euro conversions.' },
      { src: 'Unit-cost sources are linked in the spending menu table.' },
    ],
    missing: 'A per-capability split of the 2026 budget, a signed price for Romania\'s NSM coastal batteries and HIMARS (only U.S. approval ceilings are public), a Romanian 155 mm ammunition contract, and any sea-mine purchase.',
  },
};
