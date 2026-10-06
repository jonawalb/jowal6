// Poland profile for the Defense Budget Allocator.
// SOURCED (all opened 2026-09-29, all re-opened 2026-10-02; DSCA pages via the Wayback Machine because dsca.mil blocks automated requests):
//   Budgets
//   MoF, "Sejm przyjął ustawę budżetową na 2026 rok", 2025-12-05: https://www.gov.pl/web/finanse/sejm-przyjal-ustawe-budzetowa-na-2026-rok
//     (PLN 200.1bn for defense, 4.81% of GDP)
//   MoD brochure, budget of the defense ministry for 2026, March 2026: https://www.gov.pl/attachment/177eff55-1be1-4553-8bb8-a67fbfb820e9
//     (PLN 124.8bn state-budget part, 3.0% of GDP; FWSZ is an additional source, mainly for modernization; planning rate 3.94 PLN/USD)
//   Defence24, 2025-10-16: https://defence24.pl/polityka-obronna/200-mld-zl-na-obronnosc-komisja-pozytywnie-o-projekcie
//     (FWSZ planned 2026 inflows PLN 79.5bn, of which PLN 3.33bn from the MoD budget)
//   MoF, "Sejm przyjął ustawę budżetową na 2025 rok": https://www.gov.pl/web/finanse/sejm-przyjal-ustawe-budzetowa-na-2025-rok
//     (PLN 186.6bn, 4.7% of GDP; PLN 124.3bn state budget + PLN 62.3bn FWSZ)
//   KPRM, 2024-06-10: https://www.gov.pl/web/premier/uchwala-w-sprawie-ustanowienia-programu-narodowy-program-odstraszania-i-obrony---tarcza-wschod
//     (East Shield, about PLN 10bn, 2024-2028); KPRM EN, 2024-10-14: https://www.gov.pl/web/primeminister/shield-east---an-investment-in-peace-and-security
//   MoF, 2026-05-08: https://www.gov.pl/web/finanse/podpisanie-umowy-pozyczki-z-instrumentu-safe (SAFE loans EUR 43.7bn)
//   NATO, Defence Expenditure of NATO Countries (2014-2025): https://www.nato.int/content/dam/nato/webready/documents/finance/def-exp-2025-en.pdf (2025e 4.48%)
//   SIPRI Fact Sheet, April 2026: https://www.sipri.org/sites/default/files/2026-04/2604_milex_2025.pdf (2025: US$46.8bn, 4.5% of GDP)
//   MoF, 2026-09-29 (opened 2026-10-02): https://www.gov.pl/web/finanse/rada-ministrow-przyjela-projekt-ustawy-budzetowej-na--2027-rok
//     (2027 draft budget adopted by the cabinet: PLN 198.1bn for defense, 4.51% of projected 2027 GDP)
//   Sejm print 3150, justification, submitted 2026-09-30 (opened 2026-10-02): https://api.sejm.gov.pl/sejm/term10/prints/3150/3150-uzasadnienie.pdf
//     (2027: state budget PLN 131.7bn, 3.0% of GDP, plus FWSZ PLN 66.4bn net of transfers and debt repayment; part SAFE-financed, no amount)
//   NATO, Defence Expenditure of NATO Countries (2014-2026), cut-off July 3, 2026 (opened 2026-10-02, image PDF read by OCR):
//     https://www.nato.int/content/dam/nato/webready/documents/finance/def-exp-2026-en.pdf (new core-defence basis: Poland 2025e 4.25%, 2026e 4.68%)
//   Unit costs: see `src` on each category below.
// NOTIONAL: every baseline (base), scale (k), reach, weight (w), the approach geometry and the preset mixes.
// ESTIMATES: USD and EUR amounts converted at the MoD's 2026 planning rates of 3.94 PLN/USD and 4.26 PLN/EUR (MoD 2026 budget brochure).
// Federal Register copies of the DSCA notifications (opened 2026-09-30): 25-62 Javelin https://www.federalregister.gov/d/2026-01507 ;
//   23-16 IAMD https://www.federalregister.gov/d/2024-23550 ; 24-06 aerostats (four) https://www.federalregister.gov/d/2025-00141 ;
//   23-10 HIMARS https://www.federalregister.gov/d/2024-19129 ; 23-48 Apache (US$12.0bn) https://www.federalregister.gov/d/2024-25114

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3);
const USD = 3.94;
const DSCA_WB = 'https://web.archive.org/web/';

export const POLAND = {
  k: 'pl', name: 'Poland', sub: 'PLN · armored thrust', cur: 'PLN',
  money: bn => `PLN ${fmtBn(bn)}bn`,
  budgets: [
    { k: 'fwsz', bn: 79.5, t: 'Armed Forces Support Fund, 2026', s: 'PLN 79.5bn · planned inflows',
      note: 'The off-budget fund that pays mainly for modernization. PLN 79.5bn is its planned 2026 inflow as reported by Defence24, including PLN 3.33bn moved in from the defense ministry budget.' },
    { k: 'east', bn: 10, t: 'East Shield, 2024-2028', s: 'PLN ~10bn · government program',
      note: 'The government\'s program of barriers, shelters, sensors and depots on the eastern border, worth about PLN 10bn through 2028.' },
    { k: 'p2026', bn: 200.1, t: 'All defense spending, 2026', s: 'PLN 200.1bn · 4.81% of GDP, budget act',
      note: 'The 2026 budget act\'s defense total: PLN 124.8bn from the state budget plus the Armed Forces Support Fund. In reality most of it pays for people, operations and contracts already signed.' },
    { k: 'p2027', bn: 198.1, t: 'All defense spending, 2027 draft', s: 'PLN 198.1bn · 4.51% of GDP, draft sent to the Sejm Sept. 30, 2026',
      note: 'The defense total in the 2027 draft budget the cabinet adopted on September 29, 2026: PLN 131.7bn from the state budget and PLN 66.4bn from the Armed Forces Support Fund. It is a draft the Sejm has not yet passed.' },
    { k: 'safe', bn: 186.2, t: 'EU SAFE defense loans', s: 'EUR 43.7bn · about PLN 186bn (estimate)',
      note: 'Low-interest EU loans signed on May 8, 2026, paid out over several years. Converted at the defense ministry\'s 2026 planning rate of 4.26 PLN per euro, so the PLN figure is an estimate.' },
  ],
  cats: [
    { id: 'ascm', t: 'Anti-tank missiles', col: '--c3', k: 12, base: 0.35, reach: 5, w: 0.5, cls: 'mobile',
      unit: '100 Javelin missiles with launchers', cost: 780e-3 / 2506 * 100 * USD, s: 'Javelin, Spike and similar infantry anti-tank missiles.',
      src: DSCA_WB + '2026/https://www.dsca.mil/Press-Media/Major-Arms-Sales/Article-Display/Article/4307858/poland-javelin-missile-systems', srcName: 'DSCA, Sept. 18, 2025', est: true,
      basis: 'US$780m for 2,506 missiles and 253 launch units, per 100 missiles, converted at 3.94.' },
    { id: 'drones', t: 'Drones and loitering munitions', col: '--c2', k: 10, base: 0.15, reach: 40, w: 0.45, cls: 'mobile',
      unit: '1,000 loitering munitions', cost: 0.4, s: 'Reconnaissance drones and loitering munitions such as Warmate.' },
    { id: 'mines', t: 'Barriers and anti-tank mines', col: '--c5', k: 5, base: 0.15, reach: 10, w: 0.45, cls: 'mines',
      unit: '10,000 MN-123 anti-tank mines', cost: 3.4 / 36, s: 'Obstacles, ditches and minefields on the approaches (East Shield).',
      src: 'https://geekweek.interia.pl/militaria/news-setki-tysiecy-min-trafi-do-polskiej-armii-ogromny-kontrakt-p,nId,23470314', srcName: 'Interia, Apr. 29, 2026', est: true,
      basis: 'PLN 3.4bn gross for 360,000 combat and training mines, per 10,000.' },
    { id: 'strike', t: 'Rocket artillery', col: '--c4', k: 44, base: 0.3, reach: 80, w: 0.35, cls: 'mobile',
      unit: 'Homar-K launcher with missiles', cost: 3.55 / 218 * USD, s: 'Homar-K and HIMARS launchers striking the column in depth.',
      src: 'https://www.gov.pl/web/obrona-narodowa/homar-k', srcName: 'Ministry of National Defence, Homar-K', est: true,
      basis: 'US$3.55bn net for 218 launchers and over ten thousand missiles, per launcher, converted at 3.94.' },
    { id: 'airdef', t: 'Air and missile defense', col: '--c1', k: 90, base: 0.3, reach: 0, w: 0, cls: 'fixed',
      unit: 'Patriot launcher, share of program', cost: 15 / 48 * USD, s: 'Wisła, Narew and Piorun: protects forces and bases from the opening strikes.',
      src: DSCA_WB + '20250110170456/https://www.dsca.mil/press-media/major-arms-sales/poland-integrated-air-and-missile-defense-iamd-battle-command-system-0', srcName: 'DSCA, June 28, 2023', est: true,
      basis: 'US$15bn for 48 launchers, up to 644 PAC-3 MSE, 12 radars and command links, per launcher, converted at 3.94.' },
    { id: 'c4isr', t: 'C4ISR and resilience', col: '--c6', k: 12, base: 0.3, reach: 0, w: 0, cls: 'mobile',
      unit: 'aerostat early-warning program', cost: 1.2 * USD, s: 'Surveillance, warning, networks, shelters and dispersal.',
      src: DSCA_WB + '2024/https://www.dsca.mil/press-media/major-arms-sales/poland-aerostat-systems', srcName: 'DSCA, Feb. 7, 2024', est: true,
      basis: 'US$1.2bn for four aerostats with early-warning radar and ELINT payloads, converted at 3.94.' },
    { id: 'ammo', t: 'Artillery ammunition', col: '--c7', k: 28, base: 0.25, reach: 0, w: 0, cls: 'fixed',
      unit: '155 mm contract of several hundred thousand rounds', cost: 13.5, s: 'Shells and rockets to keep firing after the first days.',
      src: 'https://www.gov.pl/web/obrona-narodowa/wiecej-amunicji-dla-polskich-haubic-finansowanych-z-programu-safe', srcName: 'Ministry of National Defence, May 30, 2026',
      basis: 'PLN 13.5bn net for several hundred thousand 155 mm rounds (exact count not published).' },
    { id: 'platforms', t: 'Tanks and attack helicopters', col: '--c8', k: 180, base: 0.35, reach: 40, w: 0.45, cls: 'platform',
      unit: 'K2 tank, share of contract', cost: 6.5 / 180 * USD, s: 'K2 and Abrams tanks, Apache helicopters.',
      src: 'https://www.defensenews.com/global/europe/2025/08/01/poland-doubles-down-on-south-korean-tanks-with-65-billion-deal/', srcName: 'Defense News, Aug. 1, 2025', est: true,
      basis: 'About US$6.5bn for 180 tanks with 81 accompanying vehicles, per tank, converted at 3.94. Apache: US$10bn for 96 (MoD, Aug. 13, 2024).' },
    { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
      unit: '', cost: 0, s: 'Personnel, pay, operations and programs outside the scenario.' },
  ],
  presets: {
    porcupine: { t: 'Depth and attrition', s: 'Drones, mines, rockets and anti-tank missiles',
      mix: { ascm: 0.14, drones: 0.18, mines: 0.1, strike: 0.2, airdef: 0.12, c4isr: 0.1, ammo: 0.12, platforms: 0.04, other: 0 } },
    legacy: { t: 'Heavy forces first', s: 'Tanks, helicopters and Patriot',
      mix: { ascm: 0.03, drones: 0.02, mines: 0.02, strike: 0.06, airdef: 0.25, c4isr: 0.04, ammo: 0.06, platforms: 0.52, other: 0 } },
    even: { t: 'Even split', s: 'The same amount to each modeled category',
      mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
  },
  defaults: { b: 'fwsz', preset: 'porcupine', supp: 0.5, warn: 5 },
  geo: { km: 100, speed: 10, unit: 'km/h' },
  geoLabel: 'Approach depth',
  refText: {
    east: ['What the program covers', 'The government describes defensive infrastructure on the eastern flank: detection and warning systems, protective shelters, obstacles and underground depots, meant to deter an attack. No per-item amounts were published, so there is no reference mix.'],
    p2026: ['What the budget covers', 'PLN 124.8bn from the state budget (3.0% of GDP) and the Armed Forces Support Fund, which pays mainly for modernization. No per-capability split is published, so there is no reference mix.'],
    p2027: ['What the draft covers', 'PLN 131.7bn from the state budget (3.0% of GDP) and PLN 66.4bn from the Armed Forces Support Fund. Part of 2027 spending is financed by SAFE loans, with no amount given. No per-capability split is published, so there is no reference mix.'],
    safe: ['What the loans have bought so far', 'Contracts the defense ministry has announced under SAFE include 155 mm ammunition (over PLN 13.5bn net) and scatterable mine systems (about PLN 1.36bn net). There is no full per-capability split, so there is no reference mix.'],
  },
  strip: { left: 'Start line', right: 'Defended line', zero: 'line', noun: 'vehicles', play: 'Play the advance', exportTitle: 'Notional armored advance',
    land: true, vehicle: true,
    eyebrow: 'Notional armored advance <span class="notional">Notional model, not a prediction</span>',
    note: 'Bands show how far each layer reaches forward of the defended line; darker means stronger after the attacker\'s opening strikes. Triangles on the right are Poland\'s mobile launchers and rectangles its tanks and helicopters; faded ones did not survive the opening strikes. No real terrain or units are shown.',
    aria: 'Stylized armored advance. An attacking armored column moves from its start line on the left toward a defended line in Poland on the right, through bands showing how far each of Poland\'s layers reaches and how strong it is. Vehicles marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly advance', 'A large share of the attacking force comes under effective attack before it reaches the line.'],
      warn: ['Contested advance', 'Poland engages part of the force, but most of it reaches the line intact.'],
      bad: ['Advance largely unopposed', 'Too little of Poland\'s firepower survives, sees the column or reaches it.'],
    },
    explain: {
      mobile: n => `Only ${n}% of mobile launchers and teams survive the opening strikes; air defense and resilience spending protect them.`,
      platform: n => `Tanks and helicopters concentrate at known bases, so only ${n}% remain after the opening strikes.`,
      track: 'Weak sensors and networks leave shooters without good tracks on the column.',
      mines: n => `With short warning only ${n}% of the obstacle belt is in place in time.`,
    },
    tiles: { engaged: 'of the attacking force comes under effective attack', hours: h => `of a ${h} h advance`, shooters: 'after the opening strikes' },
    supp: ['Opening missile and air strikes', 'Share of Poland\'s unprotected forces the attacker\'s opening strikes would destroy.'],
    warn: ['Warning before the attack', 'Days Poland has to close barriers and lay mines before the column moves.'],
  },
  doc: {
    terms: { attacker: 'The attacker', c4: 'C4ISR', platforms: 'Tanks and attack helicopters', edge: 'the defended line' },
    howto: [
      'Pick a budget, then divide it across eight kinds of capability. The model sends a notional armored column toward a defended line and reports four things: the share of the force that comes under effective attack, how many hours of the advance are spent inside at least one working layer of Poland\'s fires, the share of Poland\'s shooters that survive the attacker\'s opening strikes, and a resilience score.',
      'The comparison table sets your plan beside three mixes. <b>Depth and attrition</b> buys many small, dispersed systems. <b>Heavy forces first</b> buys tanks, helicopters and Patriot. No published breakdown maps Poland\'s budget onto these categories, so there is no official reference mix.',
    ],
    scenario: 'An attacking armored force advances a notional 100 km at 10 km/h toward a defended line in Poland\'s northeast, the region around the Suwałki gap between Belarus and Russia\'s Kaliningrad exclave. The model is abstract: it includes no terrain, roads, units or positions, and the attacker is not modeled in any detail. It is there to show how the order of spending changes what happens to a force that has to cross Poland\'s layers.',
    leavesOut: 'What the model leaves out matters: NATO allies and their forces on Polish soil, air power beyond attack helicopters, the attacker\'s engineers, electronic warfare and air defense, terrain, weather, training, maintenance, delivery schedules and peacetime deterrence. A system that does poorly here can still be the right buy for those jobs.',
    real: {
      cols: ['Budget line', 'PLN bn', 'Notes'],
      rows: [
        ['Defense spending, 2026 budget act', '200.1', '4.81% of GDP. <a href="https://www.gov.pl/web/finanse/sejm-przyjal-ustawe-budzetowa-na-2026-rok" target="_blank" rel="noopener">MoF, Dec. 5, 2025</a>'],
        ['of which state defense budget', '124.8', '3.0% of GDP. <a href="https://www.gov.pl/attachment/177eff55-1be1-4553-8bb8-a67fbfb820e9" target="_blank" rel="noopener">MoD brochure, Mar. 2026</a>'],
        ['Armed Forces Support Fund, planned 2026 inflows', '79.5', 'Includes PLN 3.33bn from the MoD budget. <a href="https://defence24.pl/polityka-obronna/200-mld-zl-na-obronnosc-komisja-pozytywnie-o-projekcie" target="_blank" rel="noopener">Defence24, Oct. 16, 2025</a>'],
        ['Defense spending, 2027 draft budget', '198.1', '131.7 state budget + 66.4 fund; 4.51% of GDP; not yet passed. <a href="https://www.gov.pl/web/finanse/rada-ministrow-przyjela-projekt-ustawy-budzetowej-na--2027-rok" target="_blank" rel="noopener">MoF, Sept. 29, 2026</a>; <a href="https://api.sejm.gov.pl/sejm/term10/prints/3150/3150-uzasadnienie.pdf" target="_blank" rel="noopener">Sejm print 3150</a>'],
        ['Defense spending, 2025 budget act', '186.6', '124.3 state budget + 62.3 fund; 4.7% of GDP. <a href="https://www.gov.pl/web/finanse/sejm-przyjal-ustawe-budzetowa-na-2025-rok" target="_blank" rel="noopener">MoF</a>'],
        ['East Shield, 2024-2028', '~10', '<a href="https://www.gov.pl/web/premier/uchwala-w-sprawie-ustanowienia-programu-narodowy-program-odstraszania-i-obrony---tarcza-wschod" target="_blank" rel="noopener">KPRM, June 10, 2024</a>'],
        ['EU SAFE loans', '~186 (est.)', 'EUR 43.7bn, converted at the MoD planning rate of 4.26. <a href="https://www.gov.pl/web/finanse/podpisanie-umowy-pozyczki-z-instrumentu-safe" target="_blank" rel="noopener">MoF, May 8, 2026</a>'],
      ],
      note: 'The fund and the state budget overlap slightly, because the defense ministry transfers some money into the fund. The 2026 fund figure is the reported plan; the official financial plan on the BGK site could not be opened.',
    },
    menuNote: 'Drone unit costs were not published for Poland\'s Warmate framework deal (about 10,000 drones through 2035), so that row is notional.',
    related: [
      { b: 'NATO estimate, 2025.', t: '4.48% of GDP on NATO\'s earlier definition, then the highest in the alliance.', url: 'https://www.nato.int/content/dam/nato/webready/documents/finance/def-exp-2025-en.pdf', src: 'NATO, June 2025' },
      { b: 'NATO estimate, 2026.', t: '4.68% of GDP for 2026 and 4.25% for 2025 on NATO\'s new core-defence measure, behind Lithuania and Estonia.', url: 'https://www.nato.int/content/dam/nato/webready/documents/finance/def-exp-2026-en.pdf', src: 'NATO, July 2026' },
      { b: 'SIPRI, 2025.', t: 'US$46.8bn, 4.5% of GDP, up 23% in real terms on 2024.', url: 'https://www.sipri.org/sites/default/files/2026-04/2604_milex_2025.pdf', src: 'SIPRI Fact Sheet, April 2026' },
      { b: 'Apache contract.', t: 'US$10bn for 96 AH-64E, signed Aug. 13, 2024.', url: 'https://www.gov.pl/web/obrona-narodowa/umowa-na-96-smiglowcow-uderzeniowych-ah-64e-apache-podpisana', src: 'MoD, Aug. 13, 2024' },
      { b: 'Apache approval.', t: '96 AH-64E with engines, sensors and support at an estimated US$12.0bn; the U.S. approval ceiling, above the signed contract.', url: 'https://www.federalregister.gov/d/2024-25114', src: 'Federal Register, Oct. 29, 2024 (DSCA 23-48)' },
      { b: 'HIMARS approval.', t: 'Up to US$10bn for 18 launchers and 468 launcher-loader kits with rockets and missiles; an approval, not a contract.', url: DSCA_WB + '20250110170518/https://www.dsca.mil/press-media/major-arms-sales/poland-high-mobility-artillery-rocket-system-himars-0', src: 'DSCA, Feb. 7, 2023' },
      { b: 'Warmate drones.', t: 'Framework deal for about 1,000 sets and 10,000 loitering munitions through 2035; no value published.', url: 'https://www.gov.pl/web/obrona-narodowa/amunicja-krazaca-warmate-dla-wojska-polskiego2', src: 'MoD, May 15, 2025' },
      { b: 'Piorun air defense missiles.', t: '3,500 missiles and 600 launchers for about PLN 3.5bn gross (2022).', url: 'https://www.mesko.com.pl/aktualnosci/mesko-z-kontraktem-na-3500-ppzr-piorun-dla-sz-rp', src: 'Mesko' },
      { b: 'Scatterable mines under SAFE.', t: 'MN-123 mine cassettes for about PLN 1.36bn net.', url: 'https://www.gov.pl/web/obrona-narodowa/nowe-systemy-inzynieryjne-i-minowania-narzutowego-dla-sil-zbrojnych-rp-realizacja-programu-safe-w-bydgoszczy', src: 'MoD, May 29, 2026' },
    ],
    sources: [
      { src: 'Chancellery of the Prime Minister, Shield East: an investment in peace and security', url: 'https://www.gov.pl/web/primeminister/shield-east---an-investment-in-peace-and-security', d: 'October 14, 2024', n: 'Purpose of East Shield: to deter a potential adversary from starting a war.' },
      { src: 'Ministry of Finance, 2026 and 2025 budget acts', url: 'https://www.gov.pl/web/finanse/sejm-przyjal-ustawe-budzetowa-na-2026-rok', d: 'December 5, 2025' },
      { src: 'Ministry of National Defence, basic information on the 2026 defense budget', url: 'https://www.gov.pl/attachment/177eff55-1be1-4553-8bb8-a67fbfb820e9', d: 'March 2026', n: 'Also the source of the 3.94 PLN/USD and 4.26 PLN/EUR planning rates used for conversions.' },
      { src: 'Unit-cost sources are linked in the spending menu table.' },
    ],
    missing: 'An official 2026 financial plan for the Armed Forces Support Fund (the BGK page blocks automated access), signed contract values for HIMARS and Javelin (only U.S. approval ceilings are public), and any published drone unit costs.',
  },
};
