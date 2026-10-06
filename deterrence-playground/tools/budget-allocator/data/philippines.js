// Philippines profile for the Defense Budget Allocator.
// SOURCED (all opened 2026-09-29, all re-opened 2026-10-02; PNA, Inquirer and DSCA via the Wayback Machine because they block automated requests):
//   DBM, 2026 People's Enacted Budget: https://www.dbm.gov.ph/wp-content/uploads/Our%20Budget/2026/2026-People's-Enacted-Budget.pdf
//     (DND ₱310.0B enacted vs ₱299.3B proposed; defense sector ₱423.7B, 6.2% of the budget; RAFPMP ₱40.0B;
//      land ₱117.0B, air ₱54.1B, naval ₱53.9B defense programs)
//   DBM, 2025 Budget-at-a-Glance (Enacted): https://www.dbm.gov.ph/wp-content/uploads/Our%20Budget/2025/2025-Budget-at-a-Glance-Enacted-English.pdf
//     (DND ₱315.1B; defense sector ₱378.9B)
//   Rappler, 2025-09-16: https://www.rappler.com/philippines/defense-budget-2026/ (2025 modernization ₱35B)
//   The Defense Post, 2024-01-30: https://www.thedefensepost.com/2024/01/30/philippines-military-modernization-plan/ (Re-Horizon 3, up to ₱2 trillion over 10 years)
//   SIPRI Milex database v1.2 (2026): https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx
//     (2025: ₱366.7B = US$6.38B, 1.30% of GDP; the implied 57.5 PHP/USD is used for conversions, an estimate)
//   PNA, 2024-03-20 (CADC): https://web.archive.org/web/20260309032309/https://www.pna.gov.ph/articles/1221211
//   DBM, 2027 Budget-at-a-Glance (Proposed), Aug. 13, 2026 (opened 2026-10-02): https://www.dbm.gov.ph/wp-content/uploads/Our%20Budget/2027/2027-Budget-at-a-Glance-(Proposed)-Briefer-%5BFinal%5D.pdf
//     (DND ₱328.8B; defense sector ₱452.4B, 6.3%; RAFPMP ₱50.0B)
//   DBM, 2027 People's Proposed Budget (opened 2026-10-02): https://www.dbm.gov.ph/wp-content/uploads/Our%20Budget/2027/2027-Peoples-Proposed-Budget.pdf
//     (defense ₱452.4B vs ₱423.7B, +6.8%; DND ₱310.0B -> ₱328.8B; land ₱131.3B, air ₱62.5B, naval ₱64.3B)
//   Manila Times, 2026-10-02: https://www.manilatimes.net/2026/10/02/news/detailed-report-on-budget-amendments-pushed/2437347
//     (House aims for third reading by Oct. 9)
//   Unit costs: see `src` on each category below.
// NOTIONAL: every baseline (base), scale (k), reach, weight (w), the approach geometry and the preset mixes. No sourced
//   unit cost was found for drones, sea mines, air defense or ammunition, so those four are notional.

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2);
const USD = 57.5;
const PEB = "https://www.dbm.gov.ph/wp-content/uploads/Our%20Budget/2026/2026-People%27s-Enacted-Budget.pdf";

export const PHILIPPINES = {
  k: 'ph', name: 'Philippines', sub: '₱ · EEZ coastal defense', cur: '₱',
  money: bn => bn >= 1000 ? `₱${(bn / 1000).toFixed(2)}tn` : `₱${fmtBn(bn)}bn`,
  budgets: [
    { k: 'afp26', bn: 40, t: 'AFP modernization, 2026', s: '₱40.0bn · Revised AFP Modernization Program, enacted',
      note: 'The 2026 appropriation for the Revised AFP Modernization Program, the line that pays for new equipment. In 2025 Congress gave it ₱35bn.' },
    { k: 'afp27', bn: 50, t: 'AFP modernization, 2027 proposal', s: '₱50.0bn · National Expenditure Program, Aug. 2026',
      note: 'The President\'s 2027 request for the Revised AFP Modernization Program, up from ₱40.0bn in 2026. It is a proposal: as of October 2, 2026 the House aimed to pass the budget bill on third reading by October 9.' },
    { k: 'dnd26', bn: 310, t: 'Department of National Defense, 2026', s: '₱310.0bn · enacted (₱299.3bn proposed)',
      note: 'The department\'s whole 2026 budget as enacted. Most of it pays for people, pensions and operations.' },
    { k: 'sec26', bn: 423.7, t: 'Defense sector, 2026', s: '₱423.7bn · 6.2% of the national budget',
      note: 'All 2026 spending the budget department counts under national defense, across agencies.' },
    { k: 'rh3', bn: 2000, t: 'Re-Horizon 3, ten years', s: 'up to ₱2 trillion · reported Jan. 2024',
      note: 'The modernization plan\'s reported ceiling over about ten years. No official total or breakdown was found, so treat the size as reported, not official.' },
  ],
  cats: [
    { id: 'ascm', t: 'Shore-based anti-ship missiles', col: '--c3', k: 19, base: 0.1, reach: 250, w: 0.55, cls: 'mobile',
      unit: 'BrahMos shore battery', cost: 374.96e-3 / 3 * USD, s: 'Truck-mounted anti-ship missile batteries along the coast.',
      src: 'https://www.thehindu.com/news/national/philippines-inks-deal-worth-375-million-for-brahmos-missiles/article38338340.ece', srcName: 'The Hindu, Jan. 28, 2022', est: true,
      basis: 'US$374.96m for three batteries with training and logistics support, per battery, converted at 57.5.' },
    { id: 'drones', t: 'Drones and uncrewed boats', col: '--c2', k: 12, base: 0.1, reach: 100, w: 0.45, cls: 'mobile',
      unit: '100 small drones or drone boats', cost: 0.5, s: 'Surveillance drones and small uncrewed attack boats.' },
    { id: 'mines', t: 'Sea mines', col: '--c5', k: 5, base: 0.02, reach: 15, w: 0.35, cls: 'mines',
      unit: 'lot of 100 mines', cost: 0.4, s: 'Mines off key coasts and straits. No Philippine sea-mine purchase was found.' },
    { id: 'strike', t: 'Fast attack and patrol craft', col: '--c4', k: 25, base: 0.2, reach: 150, w: 0.3, cls: 'mobile',
      unit: 'Acero-class (Shaldag Mk V) patrol boat', cost: 10 / 9, s: 'Missile-capable fast boats that shadow and strike close to shore.',
      src: 'https://web.archive.org/web/20240225155725/https://newsinfo.inquirer.net/1433382/ph-acquiring-israeli-missile-capable-patrol-boats-for-p10b', srcName: 'Inquirer, May 18, 2021', est: true,
      basis: '₱10bn approved budget for about nine boats, per boat.' },
    { id: 'airdef', t: 'Air defense', col: '--c1', k: 38, base: 0.15, reach: 0, w: 0, cls: 'fixed',
      unit: 'air defense battery', cost: 5, s: 'Ground-based air defense protecting launchers, radars and bases.' },
    { id: 'c4isr', t: 'Maritime domain awareness', col: '--c6', k: 10, base: 0.2, reach: 0, w: 0, cls: 'mobile',
      unit: 'coastal radar package (Japan grant, 2023)', cost: 0.2355, s: 'Coastal radars, patrol aircraft, satellites and networks that find and track ships.',
      src: 'https://web.archive.org/web/20240910104807/https://www.pna.gov.ph/articles/1213028', srcName: 'PNA, Nov. 4, 2023',
      basis: '¥600m (about ₱235.5m) Official Security Assistance grant for a coastal radar system; number of radars not stated.' },
    { id: 'ammo', t: 'Missile and munition stocks', col: '--c7', k: 16, base: 0.15, reach: 0, w: 0, cls: 'fixed',
      unit: 'reload of missiles for the force', cost: 2, s: 'Missiles and munitions to keep firing after the first engagement.' },
    { id: 'platforms', t: 'Frigates, corvettes and fighters', col: '--c8', k: 125, base: 0.2, reach: 370, w: 0.4, cls: 'platform',
      unit: 'Miguel Malvar-class corvette', cost: 14, s: 'Frigates, corvettes, offshore patrol vessels and FA-50 or F-16 jets.',
      src: 'https://web.archive.org/web/20241010202754/https://www.pna.gov.ph/articles/1231447', srcName: 'PNA, Aug. 18, 2024', est: true,
      basis: '₱28bn for two corvettes, per ship. For scale: 12 FA-50 for about US$700m (Defense News, 2025); 20 F-16 notified at US$5.58bn (DSCA, 2025).' },
    { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
      unit: '', cost: 0, s: 'Personnel, pensions, operations, internal security and disaster response.' },
  ],
  presets: {
    porcupine: { t: 'Sensors and missiles', s: 'Domain awareness, shore missiles, drones and fast boats',
      mix: { ascm: 0.26, drones: 0.16, mines: 0.04, strike: 0.12, airdef: 0.1, c4isr: 0.18, ammo: 0.12, platforms: 0.02, other: 0 } },
    legacy: { t: 'Ships and jets first', s: 'Frigates, corvettes and fighters',
      mix: { ascm: 0.05, drones: 0.03, mines: 0, strike: 0.05, airdef: 0.1, c4isr: 0.05, ammo: 0.05, platforms: 0.67, other: 0 } },
    even: { t: 'Even split', s: 'The same amount to each modeled category',
      mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
  },
  defaults: { b: 'afp26', preset: 'porcupine', supp: 0.4, warn: 5 },
  geo: { km: 370, speed: 14, unit: 'kn' },
  refText: {
    afp26: ['What the line pays for', 'Much of it pays installments on contracts already signed, such as the milestone payments on two corvettes from South Korea. There is no full split onto these categories, so there is no reference mix.'],
    afp27: ['What the request covers', 'The budget department says the line includes the purchase of defense equipment and weapon systems, but gives no split by capability, so there is no reference mix.'],
    dnd26: ['How the budget splits', 'The 2026 enacted budget divides ₱225.0bn of defense programs into land (₱117.0bn), air (₱54.1bn) and naval (₱53.9bn). Those are services, not capabilities, so there is no reference mix.'],
    sec26: ['What the sector covers', 'Everything counted under national defense in 2026, up from ₱378.9bn in 2025. There is no per-capability split, so there is no reference mix.'],
    rh3: ['What the plan stresses', 'Reporting describes a focus on domain awareness, connectivity, surveillance, reconnaissance and intelligence. No official breakdown was found, so there is no reference mix.'],
  },
  strip: { left: 'Open sea', right: 'Philippine coast', zero: 'coast', noun: 'ships', play: 'Play the approach', exportTitle: 'Notional EEZ approach',
    eyebrow: 'Notional EEZ approach <span class="notional">Notional model, not a prediction</span>',
    note: 'Bands show how far each layer reaches from the Philippine coast across the exclusive economic zone; darker means stronger after the attacker\'s opening strikes. Triangles on the right are mobile launchers and boats and rectangles large ships and jets; faded ones did not survive the opening strikes. No real coast, base or unit is shown.',
    aria: 'Stylized approach across the exclusive economic zone. A hostile naval task group sails from the open sea on the left toward the Philippine coast on the right, through bands showing how far each Philippine layer reaches and how strong it is. Ships marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly approach', 'A large share of the task group comes under effective attack inside the EEZ.'],
      warn: ['Contested approach', 'The Philippines engages part of the task group, but most of it reaches the coast untouched.'],
      bad: ['Approach largely unopposed', 'Too little Philippine firepower survives, sees the ships or reaches them.'],
    },
    explain: {
      mobile: n => `Only ${n}% of missile batteries, drones and boats survive the opening strikes; air defense and domain awareness spending protect them.`,
      platform: n => `Frigates, corvettes and jets are few and sit at known bases, so only ${n}% remain after the opening strikes.`,
      track: 'Weak domain awareness leaves shooters without good tracks on the ships. In this model that is the Philippines\' largest gap.',
      mines: n => `With short warning only ${n}% of the minefield is laid in time.`,
    },
    tiles: { engaged: 'of the task group comes under effective attack', hours: h => `of a ${h} h approach across the EEZ`, shooters: 'after the opening strikes' },
    supp: ['Opening missile and air strikes', 'Share of the Philippines\' unprotected forces the opening strikes would destroy.'],
    warn: ['Warning before the approach', 'Days the Philippines has to deploy launchers and lay mines before the ships arrive.'],
  },
  doc: {
    terms: { attacker: 'The attacker', c4: 'MDA', platforms: 'Frigates, corvettes and fighters', edge: 'the coast' },
    howto: [
      'Pick a budget, then divide it across eight kinds of capability. The model sends a notional naval task group across the Philippines\' exclusive economic zone toward its coast and reports four things: the share of the group that comes under effective attack, how many hours of the approach are spent inside at least one working layer of Philippine fires, the share of Philippine shooters that survive the opening strikes, and a resilience score.',
      'The comparison table sets your plan beside three mixes. <b>Sensors and missiles</b> buys domain awareness, shore-based missiles, drones and fast boats. <b>Ships and jets first</b> buys frigates, corvettes and fighters. No published breakdown maps these budgets onto capability categories, so there is no official reference mix.',
    ],
    scenario: 'A hostile naval task group sails a notional 370 km (the 200-nautical-mile EEZ) at 14 knots toward the Philippine coast. The government\'s Comprehensive Archipelagic Defense Concept aims to build the capability to protect all Philippine territory including the EEZ. The model is abstract: it includes no real coast, feature, base or unit, and does not model U.S. or other allied forces. It also treats a gray-zone contest as if it were a shooting one, which most real incidents are not.',
    leavesOut: 'What the model leaves out matters: the United States and other partners, coast guard and gray-zone operations that make up most real encounters, the attacker\'s air power, submarines and electronic warfare, weather, training, maintenance and delivery schedules. Ships and jets that do poorly here are the ones that patrol the EEZ every day.',
    real: {
      cols: ['Budget line', '₱bn', 'Notes'],
      rows: [
        ['Revised AFP Modernization Program, 2026 enacted', '40.0', `<a href="${PEB}" target="_blank" rel="noopener">DBM, 2026 People's Enacted Budget</a>`],
        ['Revised AFP Modernization Program, 2025', '35.0', 'Reported. <a href="https://www.rappler.com/philippines/defense-budget-2026/" target="_blank" rel="noopener">Rappler, Sept. 16, 2025</a>'],
        ['Revised AFP Modernization Program, 2027 proposed', '50.0', 'President\'s budget, not yet enacted. <a href="https://www.dbm.gov.ph/wp-content/uploads/Our%20Budget/2027/2027-Budget-at-a-Glance-(Proposed)-Briefer-%5BFinal%5D.pdf" target="_blank" rel="noopener">DBM, 2027 Budget-at-a-Glance</a>'],
        ['Department of National Defense, 2027 proposed', '328.8', 'Not yet enacted. <a href="https://www.dbm.gov.ph/wp-content/uploads/Our%20Budget/2027/2027-Peoples-Proposed-Budget.pdf" target="_blank" rel="noopener">DBM, 2027 People\'s Proposed Budget</a>'],
        ['Defense sector, 2027 proposed', '452.4', '6.3% of the proposed budget, up 6.8% on 2026. <a href="https://www.dbm.gov.ph/wp-content/uploads/Our%20Budget/2027/2027-Peoples-Proposed-Budget.pdf" target="_blank" rel="noopener">DBM</a>'],
        ['Department of National Defense, 2026 enacted', '310.0', `Proposed at ₱299.3bn. <a href="${PEB}" target="_blank" rel="noopener">DBM</a>`],
        ['Department of National Defense, 2025 enacted', '315.1', 'Includes modernization. <a href="https://www.dbm.gov.ph/wp-content/uploads/Our%20Budget/2025/2025-Budget-at-a-Glance-Enacted-English.pdf" target="_blank" rel="noopener">DBM, 2025 Budget-at-a-Glance</a>'],
        ['Defense sector, 2026', '423.7', `6.2% of the national budget; ₱378.9bn in 2025. <a href="${PEB}" target="_blank" rel="noopener">DBM</a>`],
        ['Re-Horizon 3, about ten years', '~2,000', 'Reported ceiling, no official total found. <a href="https://www.thedefensepost.com/2024/01/30/philippines-military-modernization-plan/" target="_blank" rel="noopener">The Defense Post, Jan. 30, 2024</a>'],
      ],
      note: 'The department, the sector and the modernization line are different bases. The sector total counts defense spending by every agency.',
    },
    menuNote: 'No sourced unit cost was found for drones or uncrewed boats, sea mines, air defense or ammunition, so those rows are notional. U.S.-funded drone boats and Japan-funded radars arrive as grants, outside these budget lines.',
    related: [
      { b: 'SIPRI, 2025.', t: '₱366.7bn, about US$6.38bn, 1.30% of GDP.', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', src: 'SIPRI Military Expenditure Database, 2026 (xlsx)' },
      { b: 'Offshore patrol vessels.', t: 'Six 2,400-ton ships for US$573m, contracted June 2022.', url: 'https://www.navalnews.com/naval-news/2022/06/hhi-six-new-opvs-for-the-philippine-navy/', src: 'Naval News, June 27, 2022' },
      { b: 'Two more frigates.', t: '850 billion won (about US$587m), deliveries by 2029.', url: 'https://thedefensepost.com/2025/12/30/philippines-next-gen-frigates/', src: 'The Defense Post, Dec. 30, 2025' },
      { b: 'FA-50 Block 20.', t: '12 more jets in a US$700m package, arriving around 2030.', url: 'https://www.defensenews.com/global/asia-pacific/2025/06/05/philippines-orders-12-more-fa-50-combat-jets-from-south-korea/', src: 'Defense News, June 5, 2025' },
      { b: 'F-16 notification.', t: '20 F-16 Block 70/72 at an estimated US$5.58bn; a possible sale, not a contract.', url: 'https://web.archive.org/web/20260207230253/https://www.dsca.mil/Press-Media/Major-Arms-Sales/Article-Display/Article/4142323/philippines-f-16-aircraft', src: 'DSCA, Apr. 1, 2025' },
    ],
    sources: [
      { src: 'Department of Budget and Management, 2026 People\'s Enacted Budget', url: PEB, d: '2026', n: 'DND, sector and modernization totals.' },
      { src: 'Philippine News Agency, CADC to allow PH to defend sea lanes of communication', url: 'https://web.archive.org/web/20260309032309/https://www.pna.gov.ph/articles/1221211', d: 'March 20, 2024', n: 'The Comprehensive Archipelagic Defense Concept and the EEZ.' },
      { src: 'SIPRI Military Expenditure Database', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', d: '2026', n: 'Also the basis of the 57.5 PHP/USD rate used for conversions (₱366.7bn = US$6.38bn).' },
      { src: 'Unit-cost sources are linked in the spending menu table.' },
    ],
    missing: 'An official Re-Horizon 3 total or breakdown, unit costs for drones, air defense and ammunition, and a count of radars in the Japanese grants.',
  },
};
