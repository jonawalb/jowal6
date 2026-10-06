// South Korea profile for the Defense Budget Allocator.
// SOURCED (all opened 2026-10-02; amounts in won as printed):
//   Budgets
//   MND/DAPA press release, 2026 defense budget confirmed, 2025-12-03 (korea.kr, PDF attachment opened):
//     https://www.korea.kr/briefing/pressReleaseView.do?newsId=156733517
//     (₩65.8642tn, +7.5%; government request ₩66.2947tn; force operations ₩45.8989tn; force improvement ₩19.9653tn, +11.9%;
//      three-axis system ₩8.8387tn, of which Korean missile defense ₩1.8126tn; program split of force improvement, annex)
//   MND/DAPA/MMA press release, 2027 government budget request, 2026-09-03 (korea.kr, PDF attachment opened):
//     https://www.korea.kr/briefing/pressReleaseView.do?newsId=156780057
//     (₩73.2777tn total expenditure, +8.2% on a restated 2026 base of ₩67.7040tn; force improvement ₩22.7112tn, +13.8%;
//      from 2027 the ministry counts total expenditure incl. special accounts and funds; drones/counter-drone ₩678.8bn → ₩806.1bn;
//      230 mm unguided rockets for Chunmoo, L-SAM fielded early)
//   MND, 2024-2028 Defense Mid-Term Plan, Dec. 2023: https://m.korea.kr/briefing/pressReleaseView.do?newsId=156604671
//     (₩348.7tn over five years; force improvement ₩113.9tn; force operations ₩234.8tn). No later plan total was found.
//   SIPRI Milex database v1.2 (2026): https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx
//     (2025: ₩67.92tn = US$47.77bn, 2.60% of GDP; the implied 1,422 KRW/USD is used for conversions, an estimate)
//   Unit costs: see `src` on each category below.
// NOTIONAL: every baseline (base), scale (k), reach, weight (w), the approach geometry and the preset mixes. No sourced
//   unit cost was found for attack drones or for barriers and mines, so those two are notional.

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2);
const USD = 1422;
const R26 = 'https://www.korea.kr/briefing/pressReleaseView.do?newsId=156733517';
const R27 = 'https://www.korea.kr/briefing/pressReleaseView.do?newsId=156780057';
const MTP = 'https://m.korea.kr/briefing/pressReleaseView.do?newsId=156604671';
const SIPRI = 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx';
const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;

export const KOREA = {
  k: 'kr', name: 'South Korea', sub: '₩ · artillery and missile threat', cur: '₩',
  money: bn => bn >= 1000 ? `₩${(bn / 1000).toFixed(2)}tn` : `₩${fmtBn(bn)}bn`,
  budgets: [
    { k: 'fi26', bn: 19965.3, t: 'Force improvement, 2026', s: '₩19.97tn · enacted, up 11.9%',
      note: 'The force improvement budget (방위력개선비) is the part of the defense budget that buys and develops new weapons. ₩19.97tn as passed by the National Assembly on Dec. 2, 2025.' },
    { k: 'fi27', bn: 22711.2, t: 'Force improvement, 2027 request', s: '₩22.71tn · government request, up 13.8%',
      note: 'The government\'s 2027 request, sent to the National Assembly in September 2026. The Assembly can still change it.' },
    { k: 'mnd26', bn: 65864.2, t: 'Defense budget, 2026', s: '₩65.86tn · enacted, up 7.5%',
      note: 'The whole 2026 defense budget: ₩45.90tn for running the current force and ₩19.97tn for force improvement. Most of it pays for people, upkeep and contracts already signed.' },
    { k: 'mtp', bn: 348700, t: 'Mid-Term Plan, 2024-2028', s: '₩348.7tn · five years',
      note: 'The five-year Defense Mid-Term Plan announced in December 2023, the latest whose total was found. ₩113.9tn of it is force improvement.' },
  ],
  cats: [
    { id: 'ascm', t: 'Anti-tank missiles', col: '--c3', k: 2500, base: 0.3, reach: 5, w: 0.45, cls: 'mobile',
      unit: '100 Hyungung anti-tank missiles', cost: 10, s: 'Hyungung and similar infantry anti-tank missiles.',
      src: 'https://www.g-enews.com/article/Industry/2024/12/20241226074643230c5557f8da8_1', srcName: 'Global Economic, Dec. 26, 2024', est: true,
      basis: '₩100.24bn for the fourth production lot of missiles and launchers. The quantity is not published; the paper estimates about ₩100m per missile, so per 100.' },
    { id: 'drones', t: 'Drones and loitering munitions', col: '--c2', k: 2500, base: 0.1, reach: 30, w: 0.4, cls: 'mobile',
      unit: '1,000 attack drones', cost: 50, s: 'Reconnaissance drones, loitering munitions and small attack drones.' },
    { id: 'mines', t: 'Barriers and mines', col: '--c5', k: 1000, base: 0.25, reach: 5, w: 0.35, cls: 'mines',
      unit: 'obstacle and mine package', cost: 100, s: 'Obstacles, barriers and minefields on the approaches.' },
    { id: 'strike', t: 'Rocket artillery and counter-fire', col: '--c4', k: 6000, base: 0.3, reach: 70, w: 0.35, cls: 'mobile',
      unit: 'Chunmoo production lot', cost: 342.3, s: 'Chunmoo rocket launchers that strike artillery and forces in depth.',
      src: 'https://www.g-enews.com/article/General-News/2024/11/20241116092823378c5557f8da8_1', srcName: 'Global Economic, Nov. 16, 2024',
      basis: '₩342.3bn for the third production lot of launchers and ammunition vehicles, 2024-2026. The number of launchers is not published.' },
    { id: 'airdef', t: 'Air, missile and drone defense', col: '--c1', k: 12000, base: 0.35, reach: 0, w: 0, cls: 'fixed',
      unit: 'L-SAM first production package', cost: 1226.6, s: 'L-SAM, M-SAM (Cheongung) and counter-drone systems: protect forces and bases from the opening strikes.',
      src: 'https://www.munhwa.com/article/11550502', srcName: 'Munhwa Ilbo, Nov. 28, 2025', est: true,
      basis: '₩705.4bn for interceptors and launchers plus ₩357.3bn for the radar (Munhwa) and ₩163.9bn for control stations and anti-aircraft missiles (Etoday, Nov. 27, 2025). The number of batteries is not published.' },
    { id: 'c4isr', t: 'Satellites and C4ISR', col: '--c6', k: 3000, base: 0.4, reach: 0, w: 0, cls: 'mobile',
      unit: '425-project reconnaissance satellite, share of program', cost: 1300 / 5, s: 'Reconnaissance satellites, drones, radars, networks and hardening.',
      src: 'https://edaily.co.kr/News/Read?mediaCodeNo=257&newsId=01649846642361784', srcName: 'Edaily, Nov. 2, 2025', est: true,
      basis: 'About ₩1.3tn for five reconnaissance satellites (one electro-optical, four radar), per satellite.' },
    { id: 'ammo', t: 'Munitions', col: '--c7', k: 4000, base: 0.3, reach: 0, w: 0, cls: 'fixed',
      unit: '155 mm extended-range round program, 2025-2029', cost: 970.5, s: 'Shells and rockets to keep firing after the first days.',
      src: 'https://edaily.co.kr/News/Read?mediaCodeNo=257&newsId=01259526639114912', srcName: 'Edaily, Dec. 3, 2024',
      basis: '₩970.5bn for initial and follow-on production of the extended-range 155 mm round (quantity not published).' },
    { id: 'platforms', t: 'Fighters and attack helicopters', col: '--c8', k: 25000, base: 0.35, reach: 40, w: 0.45, cls: 'platform',
      unit: 'KF-21 fighter, share of first contract', cost: 1960 / 20, s: 'KF-21 and F-35A fighters and attack helicopters.',
      src: 'https://www.khan.co.kr/article/202406251057001', srcName: 'Kyunghyang Shinmun, June 25, 2024', est: true,
      basis: '₩1.96tn for 20 KF-21 with manuals, training and support, per aircraft. For scale: up to 25 F-35A notified at US$5.06bn (DSCA 23-65), about ₩288bn each at 1,422.' },
    { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
      unit: '', cost: 0, s: 'Personnel, pay, upkeep, ships, submarines and programs outside the scenario.' },
  ],
  presets: {
    porcupine: { t: 'Counter-fire and depth', s: 'Rockets, drones, anti-tank missiles and defenses',
      mix: { ascm: 0.12, drones: 0.16, mines: 0.08, strike: 0.2, airdef: 0.17, c4isr: 0.12, ammo: 0.12, platforms: 0.03, other: 0 } },
    legacy: { t: 'Fighters first', s: 'KF-21, F-35A and attack helicopters',
      mix: { ascm: 0.03, drones: 0.02, mines: 0.01, strike: 0.05, airdef: 0.15, c4isr: 0.06, ammo: 0.05, platforms: 0.63, other: 0 } },
    even: { t: 'Even split', s: 'The same amount to each modeled category',
      mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
  },
  defaults: { b: 'fi26', preset: 'porcupine', supp: 0.5, warn: 3 },
  geo: { km: 80, speed: 8, unit: 'km/h' },
  geoLabel: 'Attack depth',
  refText: {
    fi26: ['How the line splits', 'By program: aircraft ₩4.79tn, maneuver and fires ₩3.62tn, guided missiles ₩2.93tn, ships ₩2.21tn, command and reconnaissance ₩1.89tn, and R&D and policy support ₩4.27tn. Korean missile defense gets ₩1.81tn. Those are programs, not these capabilities, so there is no reference mix.'],
    fi27: ['What the request stresses', 'Aircraft rise to ₩6.57tn, led by more KF-21 production. The request also fields L-SAM and medium-altitude reconnaissance drones early and puts ₩806.1bn into drones and counter-drone defense. There is no full split onto these categories, so there is no reference mix.'],
    mnd26: ['What the budget covers', '₩45.90tn runs the current force (₩26.32tn for people) and ₩19.97tn is force improvement. There is no per-capability split, so there is no reference mix.'],
    mtp: ['What the plan covers', '₩113.9tn for force improvement and ₩234.8tn for running the force over 2024-2028, with priority on the three-axis system against North Korea\'s nuclear and missile threat. No per-capability split was found, so there is no reference mix.'],
  },
  strip: { left: 'Start line', right: 'Defended line', zero: 'line', noun: 'vehicles', play: 'Play the attack', exportTitle: 'Notional attack in depth',
    land: true, vehicle: true,
    eyebrow: 'Notional attack in depth <span class="notional">Notional model, not a prediction</span>',
    note: 'Bands show how far each layer reaches forward of the defended line; darker means stronger after the opening barrage. Triangles on the right are South Korea\'s mobile launchers and teams and rectangles its fighters and helicopters; faded ones did not survive the opening strikes. No real terrain, base or unit is shown.',
    aria: 'Stylized attack in depth. After an opening barrage of artillery, missiles and drones, an attacking ground force moves from its start line on the left toward a defended line in South Korea on the right, through bands showing how far each South Korean layer reaches and how strong it is. Vehicles marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly attack', 'A large share of the attacking force comes under effective attack before it reaches the line.'],
      warn: ['Contested attack', 'South Korea engages part of the force, but most of it reaches the line intact.'],
      bad: ['Attack largely unopposed', 'Too little of South Korea\'s firepower survives the barrage, sees the force or reaches it.'],
    },
    explain: {
      mobile: n => `Only ${n}% of mobile launchers and teams survive the opening barrage; air and missile defense and resilient sensors protect them.`,
      platform: n => `Fighters and helicopters sit at known bases within range of the barrage, so only ${n}% remain after the opening strikes.`,
      track: 'Weak sensors and networks leave shooters without good tracks on the attacking force.',
      mines: n => `With short warning only ${n}% of the obstacle belt is in place in time.`,
    },
    tiles: { engaged: 'of the attacking force comes under effective attack', hours: h => `of a ${h} h attack`, shooters: 'after the opening barrage' },
    supp: ['Opening artillery, missile and drone strikes', 'Share of South Korea\'s unprotected forces the opening barrage would destroy.'],
    warn: ['Warning before the attack', 'Days South Korea has to disperse forces and close barriers before the attack.'],
  },
  doc: {
    terms: { attacker: 'The attacker', c4: 'C4ISR', platforms: 'Fighters and attack helicopters', edge: 'the defended line' },
    howto: [
      'Pick a budget, then divide it across eight kinds of capability. The model opens with a barrage of artillery, missiles and drones, then sends a notional ground force toward a defended line. It reports four things: the share of the force that comes under effective attack, how many hours of the attack are spent inside at least one working layer of South Korea\'s fires, the share of South Korea\'s shooters that survive the opening barrage, and a resilience score.',
      'The comparison table sets your plan beside three mixes. <b>Counter-fire and depth</b> buys rocket artillery, drones, anti-tank missiles, air and missile defense and munitions. <b>Fighters first</b> buys KF-21, F-35A and attack helicopters. The ministry splits its budget by program, not by these categories, so there is no official reference mix.',
    ],
    scenario: 'North Korea opens with long-range artillery, missiles and drones, then a ground force advances a notional 80 km at 8 km/h toward a defended line in South Korea. The defense ministry\'s budget documents name North Korea\'s nuclear and missile threat and call the Chunmoo rocket launcher a core counter-fire asset. The model is abstract: it includes no terrain, roads, bases, units or positions, and the attacker is not modeled in any detail. The opening barrage is the strength-of-strikes assumption; nuclear use is outside the model.',
    leavesOut: 'What the model leaves out matters: U.S. forces in Korea and the alliance, nuclear weapons and deterrence, the navy and submarines, North Korea\'s special forces, tunnels, electronic warfare and air defense, terrain, weather, civil defense in Seoul, training, maintenance and delivery schedules. A system that does poorly here can still be the right buy for those jobs.',
    real: {
      cols: ['Budget line', '₩tn', 'Notes'],
      rows: [
        ['Defense budget, 2026 enacted', '65.86', `Up 7.5%; government request ₩66.29tn. ${a(R26, 'MND, Dec. 3, 2025')}`],
        ['of which force improvement', '19.97', `Up 11.9%. ${a(R26, 'MND')}`],
        ['of which force operations', '45.90', `Up 5.8%. ${a(R26, 'MND')}`],
        ['Defense budget, 2027 request', '73.28', `Up 8.2% on a restated 2026 base of ₩67.70tn, which now counts special accounts and funds. ${a(R27, 'MND, Sept. 3, 2026')}`],
        ['of which force improvement', '22.71', `Up 13.8%, the largest increase in won on record. ${a(R27, 'MND')}`],
        ['Defense budget, 2025', '61.25', `Force improvement ₩17.85tn. ${a(R26, 'MND')}`],
        ['Defense Mid-Term Plan, 2024-2028', '348.7', `Force improvement ₩113.9tn. ${a(MTP, 'MND, Dec. 2023')}`],
      ],
      note: 'The 2026 lines count the general-account defense budget. From 2027 the ministry counts total expenditure, including special accounts, funds and the Military Manpower Administration, so the 2027 total and the 2026 enacted total are not on the same basis.',
    },
    menuNote: 'No unit cost was found for attack drones or for barriers and mines, so those rows are notional. For scale, the 2026 budget sets aside ₩33.0bn, including insurance, for 11,265 commercial drones used in training. Korean contracts often do not publish quantities, so several rows price a whole production lot or program.',
    related: [
      { b: 'SIPRI, 2025.', t: '₩67.92tn, about US$47.8bn, 2.6% of GDP.', url: SIPRI, src: 'SIPRI Military Expenditure Database, 2026 (xlsx)' },
      { b: 'Three-axis system, 2026.', t: '₩8.84tn, up 21.3%, of which Korean missile defense ₩1.81tn and surveillance and command ₩1.05tn.', url: R26, src: 'MND, Dec. 3, 2025' },
      { b: 'Drones and counter-drone, 2027 request.', t: '₩806.1bn, up from ₩678.8bn, including swarm drones, small attack drones, laser air defense and counter-drone systems near the border.', url: R27, src: 'MND, Sept. 3, 2026' },
      { b: 'L-SAM control stations and missiles.', t: '₩163.9bn production contract to LIG Nex1, deliveries through 2030.', url: 'https://www.etoday.co.kr/news/view/2530354', src: 'Etoday, Nov. 27, 2025' },
      { b: 'F-35A notification.', t: 'Up to 25 F-35A at an estimated US$5.06bn; a possible sale, not a contract.', url: 'https://www.govinfo.gov/content/pkg/FR-2024-11-06/html/2024-25767.htm', src: 'Federal Register, Nov. 6, 2024 (DSCA 23-65)' },
    ],
    sources: [
      { src: 'Ministry of National Defense and DAPA, 2026 defense budget confirmed', url: R26, d: 'December 3, 2025', n: 'Totals, program split and three-axis amounts (PDF attachment).' },
      { src: 'Ministry of National Defense, DAPA and MMA, 2027 defense budget request', url: R27, d: 'September 3, 2026', n: 'Totals, restated 2026 base and the drone and counter-drone line (PDF attachment).' },
      { src: 'Ministry of National Defense, 2024-2028 Defense Mid-Term Plan', url: MTP, d: 'December 2023' },
      { src: 'SIPRI Military Expenditure Database', url: SIPRI, d: '2026', n: 'Also the basis of the 1,422 KRW/USD rate used for conversions (₩67.92tn = US$47.77bn).' },
      { src: 'Unit-cost sources are linked in the spending menu table.' },
    ],
    missing: 'A Defense Mid-Term Plan total newer than 2024-2028, launcher, battery and missile counts for the Chunmoo, L-SAM and Hyungung contracts, and any unit cost for attack drones or barriers.',
  },
};
