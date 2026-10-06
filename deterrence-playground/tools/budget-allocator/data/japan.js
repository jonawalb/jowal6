// Japan profile for the Defense Budget Allocator.
// SOURCED (all opened 2026-09-29, all re-opened 2026-10-02; amounts in yen billions as printed by the Ministry of Defense):
//   [A] MOD, Overview of FY2026 Budget (English): https://www.mod.go.jp/en/d_act/d_budget/pdf/fy2026_20260302a.pdf
//       p.6 Defense Buildup Program allocation by area, contract basis, ¥43.5tn FY2023-27 (table used for the reference mix);
//       p.4 FY2026 DBP expenditure ¥8,809bn; p.7 chart: ¥8.81tn (+3.9%), ¥9.04tn incl. SACO and U.S. realignment (+3.8%); FY2025 ¥8.47tn;
//       unit lines: upgraded Type-12 surface-launched ¥177bn; close-range UAVs 189 sets ¥4.4bn; Taigei-class submarine ¥120.8bn;
//       F-35A 8 for ¥149.3bn; new FFM ¥104.3bn; ammunition ¥255.3bn excl. other areas (¥907.5bn incl.).
//   [B] MOD, FY2026 Digest: https://www.mod.go.jp/en/d_act/d_budget/pdf/fy2026_20251226a.pdf (FY2025 supplementary ¥502.1bn DBP-counted)
//   [C] Defense Buildup Program (provisional translation): https://www.mod.go.jp/j/policy/agenda/guideline/plan/pdf/program_en.pdf
//       (approx. ¥43 trillion FY2023-27 expenditure; approx. ¥43,500bn new contracts)
//   [D] MOD, FY2025 Budget overview: https://www.mod.go.jp/en/d_act/d_budget/pdf/fy2025_20250411a.pdf (satellite constellation ¥283.2bn)
//   [E] MOD, FY2023 Budget overview: https://www.mod.go.jp/en/d_act/d_budget/pdf/230330a.pdf (Tomahawk ¥211.3bn)
//   [F] MOD, FY2024 Budget overview: https://www.mod.go.jp/en/d_act/d_budget/pdf/20240607a.pdf (ASEV approx. ¥395.0bn per ship)
//   [G] MOD, FY2027 request (Japanese), 2026-08-31: https://www.mod.go.jp/j/budget/yosan_gaiyo/fy2027/yosan_20260831.pdf (p.3: about ¥9tn expenditure, about ¥8tn contracts;
//       items awaiting the strategy revision, and SACO/realignment local-burden costs, are item requests without amounts;
//       p.17 contract basis: Type-25 surface-to-ship missile and ground equipment ¥157.5bn + item request; p.19 MQ-9B 17 for ¥292.2bn)
//   [H] MOD, FY2025 supplementary budget (Japanese), Dec. 2025: https://www.mod.go.jp/j/budget/yosan_gaiyo/fy2025/2025hoseiyosan.pdf (¥847.2bn)
//   [I] Federal Register, Tomahawk notification 23-69: https://www.federalregister.gov/documents/2024/11/21/2024-27301/arms-sales-notification
//       (200 Block IV + 200 Block V, US$2.35bn)
//   [K] SIPRI Fact Sheet, April 2026: https://www.sipri.org/sites/default/files/2026-04/2604_milex_2025.pdf (US$62.2bn, 1.4% of GDP, 2025)
//   [L] National Defense Strategy (provisional translation): https://www.mod.go.jp/j/policy/agenda/guideline/strategy/pdf/strategy_en.pdf
// NOTIONAL: every baseline (base), scale (k), reach, weight (w), the approach geometry and the preset mixes. No sea-mine
//   procurement line was found, so the mine unit cost is notional.

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2);
const A = 'https://www.mod.go.jp/en/d_act/d_budget/pdf/fy2026_20260302a.pdf';

// DBP areas, contract basis, ¥bn, from [A] p.6, mapped onto the model's categories.
const DBP = [
  { t: 'Stand-off defense capabilities', bn: 5000, cat: 'ascm' },
  { t: 'Integrated air and missile defense', bn: 3000, cat: 'airdef' },
  { t: 'Unmanned defense capabilities', bn: 1000, cat: 'drones' },
  { t: 'Cross-domain: space, cyber; command, control and intelligence', bn: 3000, cat: 'c4isr' },
  { t: 'Facilities improvement (incl. hardening)', bn: 4000, cat: 'c4isr' },
  { t: 'Cross-domain: vehicles, vessels, aircraft', bn: 6000, cat: 'platforms' },
  { t: 'Ammunition', bn: 2000, cat: 'ammo' },
  { t: 'Sustainment and maintenance of equipment', bn: 9000, cat: 'other' },
  { t: 'Mobile deployment and civil protection', bn: 2000, cat: 'other' },
  { t: 'R&D, production base, base measures, training and fuel', bn: 8000, cat: 'other' },
];

export const JAPAN = {
  k: 'jp', name: 'Japan', sub: '¥ · southwestern islands', cur: '¥',
  money: bn => bn >= 1000 ? `¥${(bn / 1000).toFixed(bn >= 10000 ? 1 : 2)}tn` : `¥${fmtBn(bn)}bn`,
  budgets: [
    { k: 'fy26', bn: 8809, t: 'FY2026 defense budget', s: '¥8.81tn · DBP expenditure, enacted',
      note: 'The FY2026 budget spent under the Defense Buildup Program, ¥8,809bn. With U.S. realignment and SACO costs it is ¥9.04tn. Most of it pays for people, upkeep and contracts already signed.' },
    { k: 'sup25', bn: 847.2, t: 'FY2025 supplementary', s: '¥847.2bn · Ministry of Defense share, Dec. 2025',
      note: 'The defense ministry\'s share of the December 2025 supplementary budget, which the government combines with the initial budget to meet its 2% of GDP goal in FY2025. It includes ¥345.1bn for U.S. force realignment.' },
    { k: 'dbp', bn: 43500, t: 'Defense Buildup Program', s: '¥43.5tn · FY2023-27 contracts',
      note: 'New contracts under the five-year program approved in December 2022, ¥43.5tn (about ¥43tn in spending). It is the only line with a published breakdown by area.' },
    { k: 'fy27', bn: 9000, t: 'FY2027 request', s: 'about ¥9tn · requested Aug. 31, 2026',
      note: 'The ministry\'s FY2027 request, about ¥9tn on a spending basis (about ¥8tn in new contracts). Items that wait on the revision of Japan\'s three strategy documents, and part of the U.S. realignment and SACO costs, are requested without an amount for now.' },
  ],
  cats: [
    { id: 'ascm', t: 'Stand-off and anti-ship missiles', col: '--c3', k: 2600, base: 0.3, reach: 300, w: 0.6, cls: 'mobile',
      unit: 'year of upgraded Type-12 buys at the FY2026 level', cost: 177, s: 'Upgraded Type-12 and other stand-off missiles on trucks and ships.',
      src: A, srcName: 'MOD, FY2026 budget', basis: 'Upgraded Type-12 surface-launched variant and ground equipment, ¥177bn in FY2026 (quantity not published).' },
    { id: 'drones', t: 'Uncrewed systems', col: '--c2', k: 1650, base: 0.1, reach: 100, w: 0.4, cls: 'mobile',
      unit: '100 close-range UAV sets', cost: 4.4 / 189 * 100, s: 'Aerial, surface and undersea drones.',
      src: A, srcName: 'MOD, FY2026 budget', est: true, basis: '189 close-range UAV sets for ¥4.4bn, per 100 sets.' },
    { id: 'mines', t: 'Sea mines', col: '--c5', k: 700, base: 0.15, reach: 15, w: 0.45, cls: 'mines',
      unit: 'lot of 100 mines', cost: 2, s: 'Mines laid off the islands before an assault.' },
    { id: 'strike', t: 'Long-range strike missiles', col: '--c4', k: 3400, base: 0.1, reach: 400, w: 0.3, cls: 'mobile',
      unit: '10 Tomahawk missiles', cost: 211.3 / 400 * 10, s: 'Tomahawk and hypervelocity glide missiles against staging ports and the force at sea.',
      src: 'https://www.mod.go.jp/en/d_act/d_budget/pdf/230330a.pdf', srcName: 'MOD, FY2023 budget', est: true,
      basis: '¥211.3bn for Tomahawk in FY2023; the U.S. notification covers 400 missiles (Federal Register, Nov. 21, 2024), per 10.' },
    { id: 'airdef', t: 'Integrated air and missile defense', col: '--c1', k: 5200, base: 0.35, reach: 0, w: 0, cls: 'fixed',
      unit: 'Aegis System Equipped Vessel', cost: 395, s: 'Aegis ships, SM-3, SM-6, PAC-3 and Type 03 missiles: protects forces and bases.',
      src: 'https://www.mod.go.jp/en/d_act/d_budget/pdf/20240607a.pdf', srcName: 'MOD, FY2024 budget', basis: 'Approx. ¥395.0bn per ship, as calculated by the ministry.' },
    { id: 'c4isr', t: 'C4ISR and resilience', col: '--c6', k: 1350, base: 0.3, reach: 0, w: 0, cls: 'mobile',
      unit: 'satellite constellation program', cost: 283.2, s: 'Space, cyber, command networks, hardening and dispersal.',
      src: 'https://www.mod.go.jp/en/d_act/d_budget/pdf/fy2025_20250411a.pdf', srcName: 'MOD, FY2025 budget', basis: 'Building a satellite constellation, ¥283.2bn in FY2025.' },
    { id: 'ammo', t: 'Missile and munition stocks', col: '--c7', k: 2250, base: 0.25, reach: 0, w: 0, cls: 'fixed',
      unit: 'year of ammunition at the FY2026 level', cost: 255.3, s: 'Missiles and munitions to keep firing after day one.',
      src: A, srcName: 'MOD, FY2026 budget', basis: 'Securing ammunition, ¥255.3bn excluding items counted in other areas (¥907.5bn including them).' },
    { id: 'platforms', t: 'Ships, submarines and fighters', col: '--c8', k: 16500, base: 0.4, reach: 400, w: 0.45, cls: 'platform',
      unit: 'Taigei-class submarine', cost: 120.8, s: 'Destroyers, frigates, submarines and F-35s.',
      src: A, srcName: 'MOD, FY2026 budget', basis: '1 Taigei-class submarine, ¥120.8bn. Same budget: new FFM frigate ¥104.3bn; 8 F-35A for ¥149.3bn.' },
    { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
      unit: '', cost: 0, s: 'Upkeep, personnel, training, bases, R&D and mobility. Money here has no effect in the model.' },
  ],
  presets: {
    porcupine: { t: 'Distributed denial', s: 'Missiles, drones, mines and resilience',
      mix: { ascm: 0.24, drones: 0.18, mines: 0.08, strike: 0.12, airdef: 0.12, c4isr: 0.12, ammo: 0.12, platforms: 0.02, other: 0 } },
    legacy: { t: 'Ships and aircraft first', s: 'Destroyers, submarines and fighters',
      mix: { ascm: 0.05, drones: 0.03, mines: 0.02, strike: 0.05, airdef: 0.2, c4isr: 0.04, ammo: 0.06, platforms: 0.55, other: 0 } },
    even: { t: 'Even split', s: 'The same amount to each modeled category',
      mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
  },
  defaults: { b: 'fy26', preset: 'porcupine', supp: 0.5, warn: 5 },
  geo: { km: 300, speed: 12, unit: 'kn' },
  refMix: { budget: 'dbp', label: 'Buildup Program mix', sub: 'FY2023-27 areas, mapped', lines: DBP,
    off: 'Only the ¥43.5tn program has a published breakdown by area', title: 'What the Defense Buildup Program allocates, FY2023-27',
    fmt: v => `${(v / 1000).toFixed(1)}tn` },
  refText: {
    fy26: ['What the budget covers', 'The ministry reports FY2026 spending by the program\'s 15 areas, but only on a contract basis; switch to the Defense Buildup Program to see that split as a reference mix.'],
    sup25: ['What the supplementary covers', 'U.S. force realignment (¥345.1bn), ammunition including Type 03 and Type-12 missiles (¥56.6bn), and other items. No full split onto these categories, so there is no reference mix.'],
    fy27: ['What the request covers', 'About ¥9tn in spending. Some lines carry amounts on a contract basis, such as ¥157.5bn for Type-25 surface-to-ship missiles and their ground equipment. New frigates, submarines, F-35s, SM-6 and PAC-3 MSE are listed without amounts until the strategy documents are revised, so there is no reference mix.'],
  },
  strip: { left: 'Staging area', right: 'Islands', zero: 'coast', noun: 'ships', play: 'Play the approach', exportTitle: 'Notional island approach',
    eyebrow: 'Notional island approach <span class="notional">Notional model, not a prediction</span>',
    note: 'Bands show how far each layer reaches from a notional island group in Japan\'s southwest; darker means stronger after the attacker\'s opening strikes. Triangles on the right are Japan\'s mobile launchers and rectangles its large ships and aircraft; faded ones did not survive the opening strikes. No real islands, bases or units are shown.',
    aria: 'Stylized island approach. An attacking amphibious force sails from a staging area on the left toward a notional group of Japan\'s southwestern islands on the right, through bands showing how far each of Japan\'s layers reaches and how strong it is. Ships marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly landing', 'A large share of the amphibious force comes under effective attack.'],
      warn: ['Contested landing', 'Japan engages part of the force, but most of it reaches the islands untouched.'],
      bad: ['Landing largely unopposed', 'Too little of Japan\'s firepower survives, sees the force or reaches it.'],
    },
    explain: {
      mobile: n => `Only ${n}% of mobile launchers survive the opening strikes; air defense and resilience spending protect them.`,
      platform: n => `Large ships and aircraft are few and sit at known bases, so only ${n}% remain after the opening strikes.`,
      track: 'Weak sensors and networks leave shooters without good tracks on the force.',
      mines: n => `With short warning only ${n}% of the minefield is laid in time.`,
    },
    tiles: { engaged: 'of the amphibious force comes under effective attack', hours: h => `of a ${h} h approach`, shooters: 'after the opening strikes' },
    supp: ['Opening missile and air strikes', 'Share of Japan\'s unprotected forces in the southwest the opening strikes would destroy.'],
    warn: ['Warning before the assault', 'Days Japan has to lay mines and deploy forces to the islands before the force sails.'],
  },
  doc: {
    terms: { attacker: 'The attacker', c4: 'C4ISR', platforms: 'Ships, submarines and fighters', edge: 'the islands\' coast' },
    howto: [
      'Pick a budget, then divide it across eight kinds of capability. The model sends a notional amphibious force toward a group of Japan\'s southwestern islands and reports four things: the share of the force that comes under effective attack, how many hours of the approach are spent inside at least one working layer of Japan\'s fires, the share of Japan\'s shooters that survive the opening strikes, and a resilience score.',
      'The comparison table sets your plan beside three or four mixes. <b>Distributed denial</b> buys many missiles, drones and mines. <b>Ships and aircraft first</b> buys large platforms. For the ¥43.5tn program, the <b>Buildup Program mix</b> maps the ministry\'s own allocation by area onto the model\'s categories.',
    ],
    scenario: 'An attacking amphibious force sails a notional 300 km at 12 knots toward a group of Japan\'s southwestern (Nansei) islands. Japan\'s National Defense Strategy notes Chinese navy vessels operating around these islands and plans to move forces to the region quickly. The model is abstract: it includes no real island, base, unit or route, and does not model U.S. forces.',
    leavesOut: 'What the model leaves out matters: U.S. forces and the alliance, the attacker\'s mine clearance, air defense and submarines, weather, deception, training, maintenance, delivery schedules, civil protection and the many peacetime missions large ships and aircraft perform. A platform that does poorly here can still be the right buy for those jobs.',
    real: {
      cols: ['Defense Buildup Program area, FY2023-27', '¥tn', 'Model category'],
      rows: [
        ['Stand-off defense capabilities', '5.0', 'Stand-off and anti-ship missiles'],
        ['Integrated air and missile defense', '3.0', 'Integrated air and missile defense'],
        ['Unmanned defense capabilities', '1.0', 'Uncrewed systems'],
        ['Cross-domain: space', '1.0', 'C4ISR and resilience'],
        ['Cross-domain: cyber', '1.0', 'C4ISR and resilience'],
        ['Command and control, intelligence', '1.0', 'C4ISR and resilience'],
        ['Facilities improvement', '4.0', 'C4ISR and resilience'],
        ['Cross-domain: vehicles, vessels, aircraft', '6.0', 'Ships, submarines and fighters'],
        ['Ammunition', '2.0', 'Missile and munition stocks'],
        ['Sustainment and maintenance, operational availability', '9.0', 'Not modeled'],
        ['Mobile deployment and civil protection', '2.0', 'Not modeled'],
        ['Base measures', '2.6', 'Not modeled'],
        ['Training, education, fuel', '4.0', 'Not modeled'],
        ['Research and development', '1.0', 'Not modeled'],
        ['Defense production base', '0.4', 'Not modeled'],
        ['<b>Total as printed</b>', '<b>43.5</b>', 'Rows sum to 43.0 because of rounding'],
      ],
      note: `Source: <a href="${A}" target="_blank" rel="noopener">MOD, Overview of FY2026 Budget</a>, p.6, contract basis. Mapping: stand-off capabilities include both anti-ship missiles and long-range strike missiles such as Tomahawk; the ministry does not split them, so the reference mix puts all of it in the first category. Facilities improvement includes hardening, which the model counts as resilience.`,
    },
    menuNote: 'Most ministry budget lines give a total without a quantity, so several units are a year of buys at the FY2026 level. No sea-mine purchase line was found, so that row is notional.',
    related: [
      { b: 'FY2026 budget.', t: '¥8.81tn under the program, up 3.9%; ¥9.04tn with U.S. realignment and SACO costs, up 3.8%.', url: A, src: 'MOD, Overview of FY2026 Budget' },
      { b: 'Two percent of GDP.', t: 'The government brought its goal of defense spending at 2% of GDP (about ¥11tn, counting complementary initiatives) forward to FY2025, to be met with the initial and supplementary budgets combined.', url: A, src: 'MOD, Overview of FY2026 Budget' },
      { b: 'FY2025 supplementary.', t: '¥847.2bn for the ministry, of which ¥502.1bn counts toward the program.', url: 'https://www.mod.go.jp/j/budget/yosan_gaiyo/fy2025/2025hoseiyosan.pdf', src: 'MOD, Dec. 2025 (Japanese)' },
      { b: 'FY2027 request.', t: 'About ¥9tn in spending and about ¥8tn in new contracts. MQ-9B, 17 aircraft for ¥292.2bn; Type-25 surface-to-ship missiles and ground equipment, ¥157.5bn; both also carry unpriced item requests.', url: 'https://www.mod.go.jp/j/budget/yosan_gaiyo/fy2027/yosan_20260831.pdf', src: 'MOD, Aug. 31, 2026 (Japanese)' },
      { b: 'SIPRI, 2025.', t: 'US$62.2bn, 1.4% of GDP by SIPRI\'s measure, Japan\'s highest since 1958.', url: 'https://www.sipri.org/sites/default/files/2026-04/2604_milex_2025.pdf', src: 'SIPRI Fact Sheet, April 2026' },
      { b: 'Tomahawk sale.', t: '200 Block IV and 200 Block V missiles, US$2.35bn.', url: 'https://www.federalregister.gov/documents/2024/11/21/2024-27301/arms-sales-notification', src: 'Federal Register, Nov. 21, 2024' },
    ],
    sources: [
      { src: 'Ministry of Defense, Progress and Budget in Fundamental Reinforcement of Defense Capabilities: Overview of FY2026 Budget', url: A, d: '2026', n: 'Allocation by area, annual totals and most unit lines.' },
      { src: 'Defense Buildup Program (provisional translation)', url: 'https://www.mod.go.jp/j/policy/agenda/guideline/plan/pdf/program_en.pdf', d: 'December 16, 2022', n: 'About ¥43tn in spending and ¥43.5tn in new contracts for FY2023-27.' },
      { src: 'National Defense Strategy (provisional translation)', url: 'https://www.mod.go.jp/j/policy/agenda/guideline/strategy/pdf/strategy_en.pdf', d: 'December 2022', n: 'Context on the southwestern islands.' },
      { src: 'Unit-cost sources are linked in the spending menu table.' },
    ],
    missing: 'Unit quantities for most missile lines (Type-12, SM-3, SM-6, PAC-3), any sea-mine purchase line, and an independent report of the FY2026 budget\'s passage date.',
  },
};
