// Singapore profile for the Defense Budget Allocator.
// SOURCED (all opened 2026-10-02):
//   Budgets
//   MOF, Analysis of Revenue and Expenditure, Financial Year 2026 (Budget Day, 2026-02-12):
//     https://isomer-user-content.by.gov.sg/153/b25a4bb9-db1b-428d-ab48-4528e0ee0d37/fy2026_analysis_of_revenue_and_expenditure_2026.pdf
//     (Table 3.3: Defence FY2026 estimated S$24,934m = operating 23,315 + development 1,619; FY2025 revised S$23,440m;
//      Table 3.6b: Defence 3.0% of GDP in FY2026, 2.9% in FY2025; MINDEF operating up S$1.24bn (5.6%) "mainly due to planned military expenditure")
//   MINDEF, Minister for Defence at the Committee of Supply Debate, 2026-02-27:
//     https://www.mindef.gov.sg/news-and-events/latest-releases/27feb26-speech2/
//     ("We have no hinterland for early warning"; "air- and sea-locked"; spending to keep pace with GDP; MRCV; G550-MSA)
//   SIPRI Milex database v1.2 (2026): https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx
//     (Singapore 2025: S$22.79bn = US$17.44bn, 3.0% of GDP; the implied 1.307 SGD/USD is used for conversions, an estimate)
//   MINDEF, written reply on submarine costs, 2023-01-09: https://www.mindef.gov.sg/news-and-events/latest-releases/09jan23_pq2
//     (about S$600m per Invincible-class submarine, S$2.4bn for four; MINDEF does not usually disclose precise costs)
//   Federal Register copies of DSCA notifications: 2020-01142 (20-06, 12 F-35B, US$2.75bn); 2026-00530 (8 F-35A added, case to US$4.76bn);
//     2026-05147 (26-12, 4 P-8A, US$2.316bn); 2026-09003 (26-24, 45 GMLRS-AW pods, US$83.14m); 2025-20511 (24-83, 54 AMRAAM, US$133m)
//   Defense News, 2018-03-29 (Aster 30 SAMP/T: two systems and 200 missiles, EUR 651m / US$805m, citing SIPRI)
//   Unit costs: see `src` on each category below.
// NOTIONAL: every baseline (base), scale (k), reach, weight (w), the approach geometry and the preset mixes. No sourced unit
//   cost was found for anti-ship missiles, drones and uncrewed vessels, or sea mines, so those three are notional. MINDEF does
//   not publish most unit costs (the Multi-Role Combat Vessel and Hunter contracts have no published value).

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3);
const USD = 1.307;
const MOF = 'https://isomer-user-content.by.gov.sg/153/b25a4bb9-db1b-428d-ab48-4528e0ee0d37/fy2026_analysis_of_revenue_and_expenditure_2026.pdf';
const COS = 'https://www.mindef.gov.sg/news-and-events/latest-releases/27feb26-speech2/';
const FR = 'https://www.federalregister.gov/d/';

export const SINGAPORE = {
  k: 'sg', name: 'Singapore', sub: 'S$ · island air and sea defense', cur: 'S$',
  money: bn => `S$${fmtBn(bn)}bn`,
  budgets: [
    { k: 'inc26', bn: 1.494, t: 'This year\'s increase', s: 'S$1.49bn · FY2026 over FY2025 (derived)',
      note: 'The rise from S$23.44bn (FY2025 revised) to S$24.93bn (FY2026 estimate). We worked it out from the budget tables; it is not a separate budget line.' },
    { k: 'tot25', bn: 23.44, t: 'Defence spending, FY2025', s: 'S$23.44bn · revised, 2.9% of GDP',
      note: 'Last year\'s defence spending as revised in the FY2026 budget.' },
    { k: 'tot26', bn: 24.934, t: 'Defence spending, FY2026', s: 'S$24.93bn · estimate, 3.0% of GDP',
      note: 'The whole FY2026 defence budget. The finance ministry links most of this year\'s rise to planned military expenditure, which sits in operating spending. Much of the total pays for people, training and operations.' },
  ],
  cats: [
    { id: 'ascm', t: 'Anti-ship missiles', col: '--c3', k: 4, base: 0.25, reach: 40, w: 0.5, cls: 'mobile',
      unit: 'shore or ship launcher with missiles', cost: 0.2, s: 'Anti-ship missiles fired from ships, aircraft or mobile launchers.' },
    { id: 'drones', t: 'Drones and uncrewed vessels', col: '--c2', k: 2, base: 0.15, reach: 20, w: 0.4, cls: 'mobile',
      unit: '100 drones or uncrewed boats', cost: 0.1, s: 'Surveillance drones and uncrewed surface vessels, some launched from motherships.' },
    { id: 'mines', t: 'Sea mines and harbor barriers', col: '--c5', k: 1, base: 0.05, reach: 5, w: 0.25, cls: 'mines',
      unit: 'lot of 100 mines', cost: 0.05, s: 'Mines and barriers close to shore. Mining busy sea lanes would also close Singapore\'s own port.' },
    { id: 'strike', t: 'Rocket artillery', col: '--c4', k: 3, base: 0.2, reach: 40, w: 0.3, cls: 'mobile',
      unit: '45 HIMARS rocket pods (GMLRS)', cost: 83.14e-3 * USD, s: 'HIMARS launchers firing guided rockets at ships and landing sites.',
      src: FR + '2026-09003', srcName: 'Federal Register, May 7, 2026 (DSCA 26-24)', est: true,
      basis: 'US$83.14m for 45 GMLRS alternative-warhead pods with support, converted at 1.307. A possible sale, not a contract.' },
    { id: 'airdef', t: 'Air and missile defense', col: '--c1', k: 6, base: 0.35, reach: 0, w: 0, cls: 'fixed',
      unit: 'Aster 30 SAMP/T system with 100 missiles', cost: 0.805 / 2 * USD, s: 'Layered ground-based air defense protecting bases, ports and the city.',
      src: 'https://www.defensenews.com/land/2018/03/29/singapore-confirms-delivery-of-aster-30-missile-with-video-post/', srcName: 'Defense News, Mar. 29, 2018', est: true,
      basis: 'Two systems and 200 missiles for a reported €651m (US$805m, per SIPRI), per system, converted at 1.307.' },
    { id: 'c4isr', t: 'Maritime surveillance and networks', col: '--c6', k: 3, base: 0.35, reach: 0, w: 0, cls: 'mobile',
      unit: 'P-8A patrol aircraft, share of package', cost: 2.316 / 4 * USD, s: 'Patrol aircraft, radars and networks that find and track ships early.',
      src: FR + '2026-05147', srcName: 'Federal Register, Mar. 17, 2026 (DSCA 26-12)', est: true,
      basis: 'US$2.316bn for four P-8A with torpedoes, sensors and support, per aircraft, converted at 1.307. A possible sale, not a contract.' },
    { id: 'ammo', t: 'Missile stocks', col: '--c7', k: 3, base: 0.25, reach: 0, w: 0, cls: 'fixed',
      unit: '54 AMRAAM missiles with support', cost: 0.133 * USD, s: 'Missiles and munitions to keep firing after the first engagement.',
      src: FR + '2025-20511', srcName: 'Federal Register, Nov. 21, 2025 (DSCA 24-83)', est: true,
      basis: 'US$133m for 54 AIM-120C-8 and two guidance sections with support, converted at 1.307. A possible sale, not a contract.' },
    { id: 'platforms', t: 'Warships, submarines and fighters', col: '--c8', k: 20, base: 0.35, reach: 40, w: 0.45, cls: 'platform',
      unit: 'Invincible-class submarine', cost: 0.6, s: 'Frigates and Multi-Role Combat Vessels, submarines, F-35 and F-15SG jets.',
      src: 'https://www.mindef.gov.sg/news-and-events/latest-releases/09jan23_pq2', srcName: 'MINDEF, Jan. 9, 2023',
      basis: 'About S$600m each at purchase, S$2.4bn for four, as estimated by MINDEF from similar foreign buys. F-35B: 12 notified at US$2.75bn (DSCA, 2020).' },
    { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
      unit: '', cost: 0, s: 'Personnel, national service, training, operations and programs outside the scenario.' },
  ],
  presets: {
    porcupine: { t: 'Sensors and missiles', s: 'Surveillance, missiles, drones and air defense',
      mix: { ascm: 0.2, drones: 0.14, mines: 0.02, strike: 0.1, airdef: 0.18, c4isr: 0.16, ammo: 0.14, platforms: 0.06, other: 0 } },
    legacy: { t: 'Ships, submarines and jets first', s: 'Warships, submarines and fighters',
      mix: { ascm: 0.04, drones: 0.03, mines: 0, strike: 0.03, airdef: 0.12, c4isr: 0.05, ammo: 0.05, platforms: 0.68, other: 0 } },
    even: { t: 'Even split', s: 'The same amount to each modeled category',
      mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
  },
  defaults: { b: 'tot26', preset: 'porcupine', supp: 0.5, warn: 2 },
  geo: { km: 40, speed: 15, unit: 'kn' },
  refText: {
    inc26: ['What the increase pays for', 'The finance ministry says the rise in defence operating spending is mainly due to planned military expenditure. There is no per-capability split, so there is no reference mix.'],
    tot25: ['How the budget splits', 'S$22.08bn operating and S$1.36bn development spending. Those are accounting headings, not capabilities, so there is no reference mix.'],
    tot26: ['How the budget splits', 'S$23.32bn operating and S$1.62bn development spending. Singapore does not publish a breakdown by capability, so there is no reference mix.'],
  },
  strip: { left: 'Open sea', right: 'Singapore', zero: 'coast', noun: 'ships', play: 'Play the approach', exportTitle: 'Notional sea and air approach',
    eyebrow: 'Notional sea and air approach <span class="notional">Notional model, not a prediction</span>',
    note: 'Bands show how far each layer reaches from the coast of a small island state; darker means stronger after the attacker\'s opening strikes. The approach is short, so most layers cover all of it. Triangles on the right are mobile launchers and drones and rectangles ships, submarines and jets; faded ones did not survive the opening strikes. No real coast, base or unit is shown.',
    aria: 'Stylized short sea approach. A hostile naval force sails from the open sea on the left toward the coast of a small island state on the right, through bands showing how far each defending layer reaches and how strong it is. Ships marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly approach', 'A large share of the attacking force comes under effective attack before it reaches the coast.'],
      warn: ['Contested approach', 'Singapore engages part of the force, but most of it reaches the coast untouched.'],
      bad: ['Approach largely unopposed', 'Too little of Singapore\'s firepower survives, sees the ships or reaches them.'],
    },
    explain: {
      mobile: n => `Only ${n}% of mobile launchers and drones survive the opening strikes; air defense and surveillance spending protect them.`,
      platform: n => `Ships and jets sit at a few known bases on a small island, so only ${n}% remain after the opening strikes.`,
      track: 'Weak surveillance and networks leave shooters without good tracks on the ships.',
      mines: n => `With short warning only ${n}% of the minefield is laid in time.`,
    },
    tiles: { engaged: 'of the attacking force comes under effective attack', hours: h => `of a ${h} h approach`, shooters: 'after the opening strikes' },
    supp: ['Opening missile and air strikes', 'Share of Singapore\'s unprotected forces the opening strikes would destroy. With no strategic depth, every base is within reach.'],
    warn: ['Warning before the attack', 'Days Singapore has to disperse forces and lay mines. The government says it has no hinterland for early warning.'],
  },
  doc: {
    terms: { attacker: 'The attacker', c4: 'ISR', platforms: 'Warships, submarines and fighters', edge: 'the coast' },
    howto: [
      'Pick a budget, then divide it across eight kinds of capability. The model sends a notional naval force on a short approach toward the coast of a small island state and reports four things: the share of the force that comes under effective attack, how many hours of the approach are spent inside at least one working layer of fire, the share of Singapore\'s shooters that survive the opening strikes, and a resilience score.',
      'The comparison table sets your plan beside three mixes. <b>Sensors and missiles</b> buys surveillance, missiles, drones and air defense. <b>Ships, submarines and jets first</b> buys large platforms. Singapore does not publish a breakdown by capability, so there is no official reference mix.',
    ],
    scenario: 'A hostile naval force, with air and missile support, approaches a small island state across a notional 40 km of sea at 15 knots. The model is generic and names no adversary, as Singapore\'s own defence statements do not. It reflects the constraints the defence minister set out in 2026: a small country with "no hinterland for early warning", "air- and sea-locked". The model includes no real coast, strait, base or unit.',
    leavesOut: 'What the model leaves out matters: partners and the Five Power Defence Arrangements, the sea lanes far from Singapore that its navy and air force also guard, civil defence and national service, cyber attack, the attacker\'s submarines and electronic warfare, weather, training, maintenance and delivery schedules. A ship or jet that does poorly here may be the right buy for those jobs.',
    real: {
      cols: ['Budget line', 'S$bn', 'Notes'],
      rows: [
        ['Defence, FY2026 estimate', '24.93', `Operating 23.32, development 1.62; 3.0% of GDP. <a href="${MOF}" target="_blank" rel="noopener">MOF, Feb. 12, 2026</a>`],
        ['Defence, FY2025 revised', '23.44', `Operating 22.08, development 1.36; 2.9% of GDP. <a href="${MOF}" target="_blank" rel="noopener">MOF</a>`],
        ['Increase, FY2026 over FY2025', '1.49', 'Derived from the two lines above.'],
        ['SIPRI estimate, 2025', '22.79', 'Calendar year; about US$17.4bn, 3.0% of GDP. <a href="https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx" target="_blank" rel="noopener">SIPRI, 2026 (xlsx)</a>'],
      ],
      note: 'The budget figures are financial years; SIPRI\'s are calendar years. The minister said in February 2026 that he expects defence spending to keep pace with GDP, barring major shocks.',
    },
    menuNote: 'MINDEF does not usually publish what equipment costs, so most rows rest on U.S. sale notifications, which are ceilings for possible sales rather than contracts. Anti-ship missiles, drones and uncrewed vessels, and sea mines are notional. The Multi-Role Combat Vessel and Hunter contracts have no published value. U.S. dollar amounts are converted at 1.307 S$ per US$, implied by SIPRI\'s 2025 figures.',
    related: [
      { b: 'F-35.', t: '12 F-35B notified at US$2.75bn in 2020; 8 F-35A added in 2024, raising the case to US$4.76bn. Possible sales, not contracts.', url: FR + '2026-00530', src: 'Federal Register, Jan. 14, 2026' },
      { b: 'Submarines.', t: 'Four Invincible-class boats, about S$2.4bn in total.', url: 'https://www.mindef.gov.sg/news-and-events/latest-releases/09jan23_pq2', src: 'MINDEF, Jan. 9, 2023' },
      { b: 'Multi-Role Combat Vessel.', t: 'Frigate-level combat power and a mothership for unmanned systems; the second ship to launch in the third quarter of 2026. No value published.', url: COS, src: 'MINDEF, Feb. 27, 2026' },
      { b: 'Maritime surveillance aircraft.', t: 'Three Gulfstream G550 maritime surveillance aircraft to be acquired. No value published.', url: COS, src: 'MINDEF, Feb. 27, 2026' },
      { b: 'P-8A.', t: 'Four patrol aircraft notified at US$2.316bn; a possible sale, not a contract.', url: FR + '2026-05147', src: 'Federal Register, Mar. 17, 2026' },
    ],
    sources: [
      { src: 'Ministry of Finance, Analysis of Revenue and Expenditure, FY2026', url: MOF, d: 'February 12, 2026', n: 'Defence totals and share of GDP.' },
      { src: 'MINDEF, speech by the Minister for Defence at the Committee of Supply debate', url: COS, d: 'February 27, 2026', n: 'Singapore\'s geographic constraints and new capabilities.' },
      { src: 'SIPRI Military Expenditure Database', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', d: '2026', n: 'Also the basis of the 1.307 SGD/USD rate used for conversions (S$22.79bn = US$17.44bn).' },
      { src: 'Unit-cost sources are linked in the spending menu table.' },
    ],
    missing: 'Any official breakdown of the defence budget by capability, contract values for the Multi-Role Combat Vessels, Hunter vehicles, F-35s and Aster 30 (only reported or notified figures exist), and unit costs for anti-ship missiles, drones and mines.',
  },
};
