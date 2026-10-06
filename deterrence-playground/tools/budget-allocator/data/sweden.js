// Sweden profile for the Defense Budget Allocator.
// SOURCED (all opened 2026-10-02; government.se and regeringen.se pages via the Wayback Machine because they show a bot check):
//   Budgets
//   Riksdagen, Prop. 2025/26:1 Utgiftsområde 6 (Budget Bill for 2026, expenditure area 6):
//     https://www.riksdagen.se/sv/dokument-och-lagar/dokument/proposition/budgetpropositionen-for-2026-utgiftsomrade-6_hd031d8/html/
//     (appropriation 1:3 Anskaffning av materiel och anläggningar SEK 71,191,794 thousand for 2026; area 6 total SEK 225,022,485
//      thousand; 1:14 Ukraine support SEK 39,725,000 thousand; table 4.4: medium-range air defence (Patriot) SEK 10,033m spent,
//      all 4 fire units delivered; Blekinge-class submarines SEK 13,482m spent, construction ongoing; table 4.5: fighter
//      and underwater investment for 2026 SEK 12,161m and SEK 2,635m)
//   Government Offices, Military budget (Wayback 2026-07-15): https://www.government.se/government-policy/military-budget/
//     (military defence appropriations SEK 175bn for 2026, +SEK 26.6bn, 18%; 2.8% of GDP by NATO's definition; SEK 148bn in 2025)
//   Government press release, 2025-09-15: https://www.government.se/press-releases/2025/09/the-government-presents-defence-investments-for-a-stronger-sweden/
//   Government press release, 2024-10-15: https://www.government.se/press-releases/2024/10/new-total-defence-resolution-for-a-stronger-sweden/
//     (Total Defence Bill 2025-2030: over SEK 170bn additional for military defence and SEK 37.5bn for civil defence through 2030)
//   SIPRI Milex database v1.2 (2026): https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx
//     (2025: SEK 161.7bn = US$16.47bn, 2.47% of GDP)
//   Unit costs: see `src` on each category below.
// NOTIONAL: every baseline (base), scale (k), reach, weight (w), the approach geometry and the preset mixes. No sea-mine
//   procurement cost was found, so the mine row is notional.

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2);
const kr = v => v >= 1 ? `${fmtBn(v)}bn kr` : `${Math.round(v * 1000)}m kr`;
const UO6 = 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/proposition/budgetpropositionen-for-2026-utgiftsomrade-6_hd031d8/html/';
const MIL = 'https://web.archive.org/web/20260715072649/https://www.government.se/government-policy/military-budget/';
const TDB = 'https://web.archive.org/web/2026/https://www.government.se/press-releases/2024/10/new-total-defence-resolution-for-a-stronger-sweden/';
const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;

export const SWEDEN = {
  k: 'se', name: 'Sweden', sub: 'SEK (kr) · Baltic approach', cur: 'SEK',
  money: kr,
  budgets: [
    { k: 'mat26', bn: 71.19, t: 'Materiel and facilities, 2026', s: '71.2bn kr (SEK) · appropriation 1:3, Budget Bill',
      note: 'The 2026 appropriation for buying materiel and facilities for the armed forces, as proposed in the Budget Bill.' },
    { k: 'mil26', bn: 175, t: 'Military defence, 2026', s: '175bn kr (SEK) · defence spending 2.8% of GDP',
      note: 'All 2026 appropriations for military defence, not counting support to Ukraine, up 18% on 2025. In reality most of it pays for people, operations and signed contracts.' },
    { k: 'tdb', bn: 170, t: 'Total Defence Bill, added to 2030', s: 'over 170bn kr (SEK) · extra for military defence, 2025-2030',
      note: 'The extra money the Total Defence Bill of October 2024 adds to military defence through 2030, on top of earlier budgets. Civil defence gets a further 37.5bn kr.' },
  ],
  cats: [
    { id: 'ascm', t: 'Anti-ship missiles', col: '--c3', k: 15, base: 0.35, reach: 200, w: 0.55, cls: 'mobile',
      unit: 'RBS 15 Mk3 coastal truck upgrade', cost: 0.8, s: 'RBS 15 missiles fired from trucks on the coast and from corvettes.',
      src: 'https://www.navalnews.com/naval-news/2024/12/saab-to-modernise-swedens-coastal-anti-ship-missile-capability/', srcName: 'Naval News, Dec. 23, 2024',
      basis: '800m kr contract for RBS 15 Mk3 missiles on truck-mounted launcher modules; quantities not published.' },
    { id: 'drones', t: 'Drones and uncrewed vessels', col: '--c2', k: 10, base: 0.15, reach: 80, w: 0.4, cls: 'mobile',
      unit: 'uncrewed systems package, 2026-2028', cost: 4, s: 'Loitering munitions, reconnaissance drones and uncrewed surface and underwater craft.',
      src: 'https://www.globalsecurity.org/military/library/news/2026/01/mil-260112-govse01.htm', srcName: 'Government Offices of Sweden, Jan. 12, 2026 (GlobalSecurity copy)',
      basis: 'More than 4bn kr for loitering munitions, reconnaissance drones, airborne electronic warfare and maritime drones, delivered 2026-2028.' },
    { id: 'mines', t: 'Sea mines', col: '--c5', k: 5, base: 0.3, reach: 20, w: 0.45, cls: 'mines',
      unit: 'lot of 100 mines', cost: 0.5, s: 'Mines laid in the approaches and the archipelago before the assault.' },
    { id: 'strike', t: 'Archer artillery', col: '--c4', k: 12, base: 0.3, reach: 40, w: 0.2, cls: 'mobile',
      unit: 'Archer system', cost: 5 / 48, s: 'Truck-mounted Archer guns firing on ships and landing craft close to shore.',
      src: 'https://www.nyteknik.se/industri/forsvaret-koper-nya-archerpjaser-fran-bofors-behover-oka-formagan-till-artilleribekampning/4192237', srcName: 'Ny Teknik, Sept. 13, 2023', est: true,
      basis: '5bn kr for 48 Archer systems, per system.' },
    { id: 'airdef', t: 'Air and missile defense', col: '--c1', k: 40, base: 0.35, reach: 0, w: 0, cls: 'fixed',
      unit: 'Patriot fire unit', cost: 10.033 / 4, s: 'Patriot and shorter-range systems protecting launchers, ports, airbases and ships.',
      src: UO6, srcName: 'Budget Bill for 2026, expenditure area 6, table 4.4', est: true,
      basis: '10,033m kr spent on medium-range air defence, with all four fire units delivered, per fire unit. The program total may still change.' },
    { id: 'c4isr', t: 'Surveillance and space', col: '--c6', k: 10, base: 0.4, reach: 0, w: 0, cls: 'mobile',
      unit: 'reconnaissance satellite package', cost: 1.3, s: 'Radars, airborne and space surveillance, networks and dispersal.',
      src: 'https://www.globalsecurity.org/military/library/news/2026/01/mil-260112-govse01.htm', srcName: 'Government Offices of Sweden, Jan. 12, 2026 (GlobalSecurity copy)',
      basis: '1.3bn kr for a number of reconnaissance and surveillance satellites; number not published.' },
    { id: 'ammo', t: 'Ammunition stocks', col: '--c7', k: 15, base: 0.3, reach: 0, w: 0, cls: 'fixed',
      unit: 'Archer shell orders, July 2025', cost: 5, s: 'Missiles, shells and charges to keep firing after the first engagement.',
      src: 'https://web.archive.org/web/2026/https://www.regeringen.se/pressmeddelanden/2025/07/sverige-bestaller-artilleriammunition-for-over-5-miljarder-kronor/', srcName: 'Government Offices, July 8, 2025',
      basis: 'Over 5bn kr in two orders of 155 mm shells and charges for Archer; quantity not published.' },
    { id: 'platforms', t: 'Fighters and submarines', col: '--c8', k: 110, base: 0.45, reach: 300, w: 0.45, cls: 'platform',
      unit: 'Gripen E conversion', cost: 16.4 / 60, s: 'Gripen fighters, A26 and Gotland-class submarines, corvettes.',
      src: 'https://www.saab.com/newsroom/press-releases/2013/saab-receives-serial-production-order-for-gripen-e-to-sweden', srcName: 'Saab, Dec. 18, 2013', est: true,
      basis: '16.4bn kr order to convert 60 Gripen C into Gripen E, per aircraft; development and equipment were separate orders, so the full cost is higher. Submarines: 9.6bn kr for the last phase of two A26 (Saab, Oct. 13, 2025).' },
    { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
      unit: '', cost: 0, s: 'Personnel, operations, the army\'s land battle and programs outside the scenario.' },
  ],
  presets: {
    porcupine: { t: 'Missiles, mines and drones', s: 'Coastal missiles, mines, drones and surveillance',
      mix: { ascm: 0.24, drones: 0.18, mines: 0.12, strike: 0.08, airdef: 0.1, c4isr: 0.12, ammo: 0.12, platforms: 0.04, other: 0 } },
    legacy: { t: 'Gripen and submarines first', s: 'Fighters, submarines and Patriot',
      mix: { ascm: 0.05, drones: 0.03, mines: 0.02, strike: 0.03, airdef: 0.2, c4isr: 0.05, ammo: 0.05, platforms: 0.57, other: 0 } },
    even: { t: 'Even split', s: 'The same amount to each modeled category',
      mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
  },
  defaults: { b: 'mat26', preset: 'porcupine', supp: 0.5, warn: 5 },
  geo: { km: 300, speed: 15, unit: 'kn' },
  refText: {
    mat26: ['What the appropriation pays for', 'The Budget Bill plans about 12.2bn kr of investment in fighter aircraft and 2.6bn kr in submarines for 2026, not all of it from this appropriation. There is no full split onto these categories, so there is no reference mix.'],
    mil26: ['What the total covers', 'Fourteen appropriations in expenditure area 6, from unit operations to materiel and research. The government expects larger buys in 2026 of air defense, rocket artillery, ammunition, combat vehicles, new surface combatants and long-range combat capability. There is no per-capability split, so there is no reference mix.'],
    tdb: ['What the bill buys', 'Four new brigades by 2030, 10,000 conscripts a year by 2030, refilled stocks of ammunition and air defense missiles, and new long-range cruise missiles, anti-ship missiles and rocket artillery. No per-capability split was published, so there is no reference mix.'],
  },
  strip: { left: 'Open sea', right: 'Swedish coast', zero: 'coast', noun: 'ships', play: 'Play the approach', exportTitle: 'Notional Baltic Sea approach',
    eyebrow: 'Notional Baltic Sea approach <span class="notional">Notional model, not a prediction</span>',
    note: 'Bands show how far each layer reaches out from the Swedish coast; darker means stronger after the attacker\'s opening strikes. Triangles on the right are missile trucks, guns and drone teams and rectangles fighters and submarines; faded ones did not survive the opening strikes. No real coast, island, base or unit is shown.',
    aria: 'Stylized approach across the Baltic Sea. A hostile naval and amphibious group sails from the open sea on the left toward the Swedish coast on the right, through bands showing how far each Swedish layer reaches and how strong it is. Ships marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly approach', 'A large share of the naval group comes under effective attack before it reaches the coast.'],
      warn: ['Contested approach', 'Sweden engages part of the group, but most of it reaches the coast untouched.'],
      bad: ['Approach largely unopposed', 'Too little Swedish firepower survives, sees the ships or reaches them.'],
    },
    explain: {
      mobile: n => `Only ${n}% of missile trucks, guns and drone teams survive the opening strikes; air defense and surveillance spending protect them.`,
      platform: n => `Fighters and submarines are few and their bases are known, so only ${n}% remain after the opening strikes.`,
      track: 'Weak surveillance leaves shooters without good tracks on the ships.',
      mines: n => `With short warning only ${n}% of the minefield is laid in time.`,
    },
    tiles: { engaged: 'of the naval group comes under effective attack', hours: h => `of a ${h} h approach`, shooters: 'after the opening strikes' },
    supp: ['Opening missile and air strikes', 'Share of Sweden\'s unprotected forces the opening strikes would destroy.'],
    warn: ['Warning before the approach', 'Days Sweden has to lay mines and disperse launchers before the ships sail.'],
  },
  doc: {
    terms: { attacker: 'The attacker', c4: 'C4ISR', platforms: 'Fighters and submarines', edge: 'the coast' },
    howto: [
      'Pick a budget, then divide it across eight kinds of capability. The model sends a notional naval and amphibious group across the Baltic Sea toward the Swedish coast and reports four things: the share of the group that comes under effective attack, how many hours of the approach are spent inside at least one working layer of Swedish fires, the share of Swedish shooters that survive the opening strikes, and a resilience score.',
      'The comparison table sets your plan beside three mixes. <b>Missiles, mines and drones</b> buys coastal missiles, sea mines, drones and surveillance. <b>Gripen and submarines first</b> buys fighters, submarines and Patriot. No published breakdown maps Sweden\'s budget onto these categories, so there is no official reference mix.',
    ],
    scenario: 'A hostile naval and amphibious group sails a notional 300 km at 15 knots across the Baltic Sea toward a stretch of Swedish coast or an island. The government says Russia constitutes a multi-dimensional threat to Sweden. The model is abstract: it includes no real coast, island, base or unit, does not model NATO allies, and does not model the fight ashore once troops land.',
    leavesOut: 'What the model leaves out matters: NATO allies around the Baltic, the land battle after a landing (where CV90 vehicles and the new brigades come in), the attacker\'s submarines, aircraft and electronic warfare, ice and weather, training, maintenance and delivery schedules. Fighters and submarines that do poorly here also guard the airspace and the sea every day.',
    real: {
      cols: ['Budget line', 'SEK bn', 'Notes'],
      rows: [
        ['Military defence appropriations, 2026', '175', `2.8% of GDP by NATO's definition; 148 in 2025. ${a(MIL, 'Government Offices')}`],
        ['of which materiel and facilities (1:3)', '71.2', `Budget Bill proposal. ${a(UO6, 'Prop. 2025/26:1, area 6')}`],
        ['Expenditure area 6, all appropriations, 2026', '225.0', `Includes 39.7 for Ukraine and civil defence agencies. ${a(UO6, 'Prop. 2025/26:1, area 6')}`],
        ['Total Defence Bill 2025-2030, extra for military defence', '>170', `Plus 37.5 for civil defence through 2030. ${a(TDB, 'Government Offices, Oct. 15, 2024')}`],
      ],
      note: 'The 2026 figures are the Budget Bill as proposed in September 2025. The Total Defence Bill amount is extra money over several years, not a single year\'s budget.',
    },
    menuNote: 'No sourced unit cost was found for sea mines, so that row is notional. The Patriot row divides money spent so far by the four fire units delivered, so it is a program cost to date.',
    related: [
      { b: 'SIPRI, 2025.', t: '161.7bn kr, about US$16.5bn, 2.47% of GDP.', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', src: 'SIPRI Military Expenditure Database, 2026 (xlsx)' },
      { b: 'CV90 combat vehicles.', t: '205 CV9035 MkIIIC with Denmark for 25bn kr in all; 50 for Sweden to replace vehicles given to Ukraine. They fight ashore, outside this scenario.', url: 'https://web.archive.org/web/2026/https://www.government.se/press-releases/2024/12/joint-infantry-fighting-vehicle-procurement-worth-sek-25-billion-signed/', src: 'Government Offices, Dec. 6, 2024' },
      { b: 'A26 submarines.', t: 'About 9.6bn kr for the last production phase and added scope for the two Blekinge-class boats, deliveries mostly 2026-2032.', url: 'https://www.saab.com/newsroom/press-releases/2025/saab-receives-additional-order-relating-to-the-swedish-a26-submarines', src: 'Saab, Oct. 13, 2025' },
      { b: 'Gripen E programme.', t: 'The 2013 agreement put all orders at up to 47.2bn kr, including development and a possible Swiss order.', url: 'https://www.saab.com/newsroom/press-releases/2013/saab-signs-agreement-for-the-next-generation-fighter-aircraft-gripen-e-and-receives-development-order', src: 'Saab, Feb. 15, 2013' },
    ],
    sources: [
      { src: 'Riksdagen, Budget Bill for 2026, expenditure area 6 (Prop. 2025/26:1)', url: UO6, d: 'September 2025', n: 'Appropriations, materiel project table and fighter and submarine investment plan.' },
      { src: 'Government Offices of Sweden, Military budget', url: MIL, d: 'archived July 15, 2026', n: 'The 175bn kr total and the 2.8% of GDP estimate.' },
      { src: 'Government Offices of Sweden, The Government presents defence investments for a stronger Sweden', url: 'https://web.archive.org/web/2026/https://www.government.se/press-releases/2025/09/the-government-presents-defence-investments-for-a-stronger-sweden/', d: 'September 15, 2025', n: 'Names Russia as a multi-dimensional threat to Sweden.' },
      { src: 'Government Offices of Sweden, New total defence resolution for a stronger Sweden', url: TDB, d: 'October 15, 2024' },
      { src: 'Unit-cost sources are linked in the spending menu table.' },
    ],
    missing: 'A unit cost for sea mines, quantities in the RBS 15, drone, satellite and ammunition orders, the final cost of the Patriot and A26 programs, and any per-capability split of the materiel appropriation.',
  },
};
