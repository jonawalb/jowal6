// Finland profile for the Defense Budget Allocator.
// SOURCED (all opened 2026-10-02; defmin.fi and valtioneuvosto.fi pages that showed a bot check were read through WebFetch):
//   Budgets
//   MoD, "Budget for 2026" (composition of the defence budget, EUR million):
//     https://defmin.fi/documents/236553176/249313883/Budget%20for%202026.pdf/df530b24-c4bc-bc8f-715b-f09f5a252c99?t=1768994377721
//     (procurement of materiel excl. F-35 and Squadron 2020: 1,240; F-35 Fighter Program: 1,355; Squadron 2020: 213;
//      materiel maintenance 560; payroll 911; real estate 367; upkeep of conscripts 231; other military 563; military
//      total 5,440; crisis management 66; VAT 736; other 155; total expenditure of the defence administration 6,397)
//   MoD press release, 2025-09-25: https://defmin.fi/en/-/finnish-defence-forces-to-launch-army-materiel-procurement-projects-for-2030s-
//     (2026 proposal EUR 6.3bn, 2.5% of forecast GDP; about EUR 1.5bn materiel and EUR 1.4bn multi-role fighters; two new
//      procurement authorities, EUR 4bn materiel (largest element: army mobility) and EUR 2bn joint weapons systems (ammunition);
//      payments mainly 2029-2036)
//   Government, 2021-12-10: https://valtioneuvosto.fi/en/-/236553176/the-lockheed-martin-f-35a-lightning-ii-is-finland-s-next-multi-role-fighter
//     (64 F-35A Block 4, about EUR 8.378bn; aircraft EUR 4.703bn; AMRAAM and Sidewinder EUR 754.6m; HX programme EUR 10bn)
//   Government, 2026-06-02: https://valtioneuvosto.fi/en/-/236553176/parliamentary-working-group-on-defence-submits-final-report-to-minister-of-defence-hakkanen
//     ("Russia poses a long-term and unpredictable threat to the security of Finland and NATO.")
//   SIPRI Milex database v1.2 (2026): https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx
//     (2025: EUR 7.164bn = US$8.08bn, 2.57% of GDP; implied 0.8865 EUR/USD used for conversions, an estimate)
//   Unit costs: see `src` on each category below.
// NOTIONAL: every baseline (base), scale (k), reach, weight (w), the approach geometry and the preset mixes. No sourced unit
//   cost was found for mines (the Defence Forces say a cost estimate will come as planning advances) or for sensors and
//   networks, so those two rows are notional.
// NOTE FOR THE INTEGRATOR: euro budgets are small numbers, so several scales k are below 1. js/params.js clamps edited k to
//   a minimum of 1 with step 1; that editor field needs a lower minimum (e.g. 0.01, step "any") for this profile.

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2);
const eur = bn => bn >= 1 ? `€${fmtBn(bn)}bn` : bn >= 0.01 ? `€${Math.round(bn * 1000)}m` : `€${(bn * 1000).toFixed(1)}m`;
const USD = 0.8865;
const BUD = 'https://defmin.fi/documents/236553176/249313883/Budget%20for%202026.pdf/df530b24-c4bc-bc8f-715b-f09f5a252c99?t=1768994377721';
const PR26 = 'https://defmin.fi/en/-/finnish-defence-forces-to-launch-army-materiel-procurement-projects-for-2030s-';
const HX = 'https://valtioneuvosto.fi/en/-/236553176/the-lockheed-martin-f-35a-lightning-ii-is-finland-s-next-multi-role-fighter';
const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;

export const FINLAND = {
  k: 'fi', name: 'Finland', sub: '€ · eastern border', cur: '€',
  money: eur,
  budgets: [
    { k: 'mat', bn: 1.24, t: 'Materiel procurement, 2026', s: '€1.24bn · excl. F-35 and Squadron 2020',
      note: 'The 2026 line for new defense materiel, leaving out the F-35 and the Squadron 2020 corvettes, which have their own lines.' },
    { k: 'f35', bn: 1.355, t: 'F-35 programme, 2026', s: '€1.355bn · one year of the HX programme',
      note: 'What Finland budgets in 2026 for the 64 F-35A fighters it ordered in 2021. Here you may spend it on anything.' },
    { k: 'auth', bn: 6, t: 'New procurement authorities, 2026', s: '€6bn · €4bn materiel + €2bn ammunition',
      note: 'Two authorities in the 2026 budget let the Defence Forces sign €6bn of new contracts this year: €4bn for materiel, led by army mobility, and €2bn for joint weapons systems, used for ammunition. The payments fall mainly in 2029-2036.' },
    { k: 'mod26', bn: 6.397, t: 'All defence spending, 2026', s: '€6.40bn · about 2.5% of GDP in the proposal',
      note: 'Total expenditure of the defence administration in 2026. In reality most of it pays for people, upkeep, VAT and contracts already signed.' },
  ],
  cats: [
    { id: 'ascm', t: 'Howitzers', col: '--c3', k: 0.3, base: 0.5, reach: 40, w: 0.55, cls: 'mobile',
      unit: 'K9 howitzer with spares', cost: 0.5468 / 112, s: 'K9 Thunder howitzers firing on the column as it closes.',
      src: 'https://defmin.fi/en/-/finland-procures-more-155-mm-k9-self-propelled-howitzers-from-the-republic-of-korea', srcName: 'Ministry of Defence, Apr. 9, 2026', est: true,
      basis: 'About €546.8m for 112 K9 howitzers with spare parts, special tools and test equipment, per howitzer.' },
    { id: 'drones', t: 'Drones', col: '--c2', k: 0.12, base: 0.1, reach: 25, w: 0.4, cls: 'mobile',
      unit: 'FPV drone contract with options', cost: 0.014, s: 'Reconnaissance and first-person-view attack drones.',
      src: 'https://puolustusvoimat.fi/en/-/procurement-of-domestically-produced-fpv-drones-from-insta-group-oy', srcName: 'Defence Forces, Aug. 25, 2026',
      basis: '€14m including options, with training, spare parts and maintenance; number of drones not published.' },
    { id: 'mines', t: 'Mines and obstacles', col: '--c5', k: 0.15, base: 0.15, reach: 10, w: 0.35, cls: 'mines',
      unit: 'lot of 10,000 mines', cost: 0.02, s: 'Minefields and barriers on the approaches. Finland left the anti-personnel mine treaty in January 2026.' },
    { id: 'strike', t: 'Rocket artillery', col: '--c4', k: 0.45, base: 0.2, reach: 80, w: 0.3, cls: 'mobile',
      unit: '10 GMLRS rocket pods', cost: 535e-3 / 400 * 10 * USD, s: 'GMLRS rockets striking deep into the column and its supply routes.',
      src: 'https://www.federalregister.gov/d/2024-17596', srcName: 'Federal Register, Aug. 8, 2024 (DSCA 22-61)', est: true,
      basis: 'US$535m approval for 150 alternative-warhead and 250 unitary GMLRS pods, per 10 pods, converted at 0.8865 EUR/USD. An approval, not a contract.' },
    { id: 'airdef', t: 'Air and missile defense', col: '--c1', k: 1.2, base: 0.3, reach: 0, w: 0, cls: 'fixed',
      unit: 'David\'s Sling initial buy', cost: 0.316, s: 'Long-range air defense and shorter-range systems protecting forces and bases.',
      src: 'https://defmin.fi/en/-/new-long-range-air-defence-system-for-the-finnish-defence-forces', srcName: 'Ministry of Defence, Apr. 5, 2023',
      basis: 'About €213m main contract plus €103m immediate options, excluding VAT; quantities not published. A further €213m of options needs separate approval.' },
    { id: 'c4isr', t: 'Sensors, networks and dispersal', col: '--c6', k: 0.2, base: 0.35, reach: 0, w: 0, cls: 'mobile',
      unit: 'resilience package', cost: 0.05, s: 'Surveillance, backup networks, shelters, decoys and dispersal.' },
    { id: 'ammo', t: 'Artillery ammunition', col: '--c7', k: 0.4, base: 0.35, reach: 0, w: 0, cls: 'fixed',
      unit: '155 mm full-charge order', cost: 0.079, s: 'Shells, charges and rockets to keep firing after the first days.',
      src: 'https://defmin.fi/en/-/finnish-defence-forces-places-order-with-nammo-lapua-for-full-charges-for-artillery-1', srcName: 'Ministry of Defence, Mar. 20, 2025',
      basis: '€79m order with Nammo Lapua for 155 mm full propelling charges for the K9 and towed guns; quantity not published.' },
    { id: 'platforms', t: 'F-35 fighters', col: '--c8', k: 3.5, base: 0.4, reach: 150, w: 0.4, cls: 'platform',
      unit: 'F-35A, share of HX procurement', cost: 8.378 / 64, s: 'F-35A fighters striking the column and its air cover.',
      src: HX, srcName: 'Finnish Government, Dec. 10, 2021', est: true,
      basis: 'About €8.378bn for 64 F-35A with missiles, spares, training and sustainment to 2030, per aircraft. The aircraft alone were €4.703bn.' },
    { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
      unit: '', cost: 0, s: 'Personnel, upkeep, VAT, the navy and programs outside the scenario.' },
  ],
  presets: {
    porcupine: { t: 'Fires and obstacles', s: 'Artillery, rockets, drones, mines and shells',
      mix: { ascm: 0.2, drones: 0.14, mines: 0.1, strike: 0.18, airdef: 0.1, c4isr: 0.1, ammo: 0.16, platforms: 0.02, other: 0 } },
    legacy: { t: 'Air power first', s: 'F-35 fighters and long-range air defense',
      mix: { ascm: 0.04, drones: 0.02, mines: 0.02, strike: 0.04, airdef: 0.25, c4isr: 0.03, ammo: 0.05, platforms: 0.55, other: 0 } },
    even: { t: 'Even split', s: 'The same amount to each modeled category',
      mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
  },
  defaults: { b: 'mat', preset: 'porcupine', supp: 0.45, warn: 7 },
  geo: { km: 150, speed: 8, unit: 'km/h' },
  geoLabel: 'Approach depth',
  refText: {
    f35: ['What the line pays for', 'Payments on the 64 F-35A ordered in December 2021. There is no split onto these categories, so there is no reference mix.'],
    auth: ['What the authorities are for', 'The €4bn materiel authority is led by the army mobility programme and the €2bn joint weapons authority buys ammunition. No further split was published, so there is no reference mix.'],
    mod26: ['How the budget splits', 'Of €6,397m: F-35 €1,355m, other materiel €1,240m, payroll €911m, maintenance €560m, other operations €563m, VAT €736m, real estate €367m, conscripts €231m, Squadron 2020 €213m, and the rest. Most lines are not capabilities, so there is no reference mix.'],
  },
  strip: { left: 'Border', right: 'Defended line', zero: 'line', noun: 'vehicles', play: 'Play the attack', exportTitle: 'Notional attack across the eastern border',
    land: true, vehicle: true,
    eyebrow: 'Notional attack across the eastern border <span class="notional">Notional model, not a prediction</span>',
    note: 'Bands show how far each layer reaches forward of the defended line; darker means stronger after the attacker\'s opening missile and air strikes. Triangles on the right are Finland\'s guns, launchers and drone teams and rectangles its fighters; faded ones did not survive the opening strikes. No real terrain, border crossing or unit is shown.',
    aria: 'Stylized attack across Finland\'s eastern border. An attacking force moves from the border on the left toward a defended line on the right, through bands showing how far each Finnish layer reaches and how strong it is. Vehicles marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly attack', 'A large share of the attacking force comes under effective fire before it reaches the line.'],
      warn: ['Contested attack', 'Finland engages part of the force, but most of it reaches the line intact.'],
      bad: ['Attack largely unopposed', 'Too little of Finland\'s firepower survives the opening strikes, sees the column or reaches it.'],
    },
    explain: {
      mobile: n => `Only ${n}% of guns, launchers and drone teams survive the opening strikes; air defense and dispersal spending protect them.`,
      platform: n => `Fighters are few and their bases are known, so only ${n}% remain after the opening strikes.`,
      track: 'Weak sensors and networks leave the guns without good targets.',
      mines: n => `With short warning only ${n}% of the minefields and barriers are in place in time.`,
    },
    tiles: { engaged: 'of the attacking force comes under effective fire', hours: h => `of a ${h} h advance`, shooters: 'after the opening strikes' },
    supp: ['Opening missile and air strikes', 'Share of Finland\'s unprotected forces the attacker\'s opening strikes would destroy.'],
    warn: ['Warning before the attack', 'Days Finland has to mobilize reserves, lay mines and close barriers before the attack.'],
  },
  doc: {
    terms: { attacker: 'The attacker', c4: 'C4ISR', platforms: 'F-35 fighters', edge: 'the defended line' },
    howto: [
      'Pick a budget, then divide it across eight kinds of capability. The model sends a notional attacking force across Finland\'s eastern border toward a defended line and reports four things: the share of the force that comes under effective fire, how many hours of the advance are spent inside at least one working layer of Finland\'s fires, the share of Finland\'s shooters that survive the opening missile and air strikes, and a resilience score.',
      'The comparison table sets your plan beside three mixes. <b>Fires and obstacles</b> buys guns, rockets, drones, mines and shells, the traditional core of Finland\'s land defense. <b>Air power first</b> buys F-35 fighters and long-range air defense. No published breakdown maps Finland\'s budget onto these categories, so there is no official reference mix.',
    ],
    scenario: 'An attacking force crosses Finland\'s long eastern border and pushes a notional 150 km at 8 km/h toward a defended line, after opening missile and air strikes on Finland\'s forces and bases. A parliamentary working group reported in June 2026 that Russia poses a long-term and unpredictable threat to Finland and NATO. The model is abstract: it includes no terrain, roads, crossing points, units or positions, and the attacker is not modeled in any detail. It shows how the order of spending changes what happens to a force that has to cross Finland\'s layers.',
    leavesOut: 'What the model leaves out matters: NATO allies, the reserve army Finland mobilizes in wartime, forests, lakes and winter, the attacker\'s engineers, artillery and electronic warfare, the air war over Finland itself, fighters operating from dispersed bases, training, maintenance and delivery schedules. A system that does poorly here can still be the right buy for those jobs.',
    real: {
      cols: ['Budget line', '€ bn', 'Notes'],
      rows: [
        ['Total expenditure of the defence administration, 2026', '6.40', `About 2.5% of GDP in the September 2025 proposal. ${a(BUD, 'MoD, Budget for 2026')}`],
        ['of which F-35 Fighter Program', '1.355', a(BUD, 'MoD, Budget for 2026')],
        ['of which procurement of materiel (excl. F-35 and Squadron 2020)', '1.24', a(BUD, 'MoD, Budget for 2026')],
        ['of which Squadron 2020 corvettes', '0.213', a(BUD, 'MoD, Budget for 2026')],
        ['New procurement authorities, 2026', '6.0', `€4bn materiel + €2bn ammunition; payments mainly 2029-2036. ${a(PR26, 'MoD, Sept. 25, 2025')}`],
        ['HX fighter programme, total', '10.0', `64 F-35A ordered for about €8.378bn. ${a(HX, 'Finnish Government, Dec. 10, 2021')}`],
      ],
      note: 'The 2026 lines come from the ministry\'s budget breakdown. Procurement authorities are permission to sign contracts, not money spent in 2026, so they overlap with future years\' budgets.',
    },
    menuNote: 'No sourced unit cost was found for mines, which Finland plans to develop with domestic industry from 2026, or for sensors and networks, so those rows are notional. The GMLRS row is a U.S. approval, not a signed contract.',
    related: [
      { b: 'SIPRI, 2025.', t: '€7.164bn, about US$8.08bn, 2.57% of GDP.', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', src: 'SIPRI Military Expenditure Database, 2026 (xlsx)' },
      { b: 'Ammunition authority.', t: 'The 2026 budget\'s €2bn joint weapons authority is used to procure ammunition.', url: PR26, src: 'MoD, Sept. 25, 2025' },
      { b: 'Anti-personnel mines.', t: 'Finland\'s withdrawal from the Ottawa Convention took effect on Jan. 10, 2026; first new mines are expected in 2027 and a cost estimate will follow as planning advances.', url: 'https://maavoimat.fi/en/-/the-defence-forces-starts-measures-for-acquiring-anti-personnel-landmines-and-launching-training', src: 'Finnish Army, Jan. 14, 2026' },
      { b: 'F-35 missiles.', t: 'AMRAAM and Sidewinder air-to-air missiles, €754.6m within the HX procurement.', url: HX, src: 'Finnish Government, Dec. 10, 2021' },
    ],
    sources: [
      { src: 'Ministry of Defence, Budget for 2026 (composition of the defence budget)', url: BUD, d: '2026', n: 'All 2026 budget lines.' },
      { src: 'Ministry of Defence, Finnish Defence Forces to launch army materiel procurement projects for 2030s', url: PR26, d: 'September 25, 2025', n: 'The 2026 proposal, its share of GDP and the new procurement authorities.' },
      { src: 'Finnish Government, Parliamentary working group on defence submits final report', url: 'https://valtioneuvosto.fi/en/-/236553176/parliamentary-working-group-on-defence-submits-final-report-to-minister-of-defence-hakkanen', d: 'June 2, 2026', n: 'The threat assessment quoted in the scenario.' },
      { src: 'SIPRI Military Expenditure Database', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', d: '2026', n: 'Also the basis of the 0.8865 EUR/USD rate used for the GMLRS conversion (€7.164bn = US$8.08bn).' },
      { src: 'Unit-cost sources are linked in the spending menu table.' },
    ],
    missing: 'Unit costs for mines and for sensors and networks, signed contract values for GMLRS (only the U.S. approval is public), quantities in the David\'s Sling and drone contracts, and any published split of the 2026 materiel line.',
  },
};
