// Australia profile for the Defense Budget Allocator.
// SOURCED (all opened 2026-10-02; defence.gov.au refuses automated requests, so its PDFs were opened via the Wayback Machine):
//   [P] Defence Portfolio Budget Statements 2026-27 (Budget 12 May 2026):
//       https://web.archive.org/web/20260514030830/https://www.defence.gov.au/sites/default/files/2026-05/Defence-Portfolio-Budget-Statements-2026-27.pdf
//       Table 1: total Defence resourcing 2026-27 A$66,385.8m; Table 4a: Defence A$59,501.5m, consolidated Defence, ASD, ASA
//       and ANNPSR funding A$62,595.5m (A$340,439.9m 2025-26 to 2029-30); Table 5: Capability Acquisition Program A$20,998.1m,
//       Military Equipment Acquisition Program A$15,398.9m; Table 37: Program 2.16 Nuclear-Powered Submarines A$2,437.7m
//       (A$5,030.5m in 2025-26); ASA resource statement A$512.5m. Appendix B (Table 54), approved military-equipment expenditure:
//       LAND 8113 Ph1 first long range fires regiment A$2,136m; SEA 5000 Hunter (six frigates) A$26,570m; SEA 3000 general purpose
//       frigates A$7,532m; AIR 2025 JORN A$1,243m; SEA 1300 maritime guided weapons A$16,902m approved, A$845m in 2026-27.
//   [I] 2026 Integrated Investment Program (full text; mirror, the defence.gov.au original was not reachable):
//       https://www.globalsecurity.org/military/library/policy/int/2026-integrated-investement-program_australia_20260416.pdf
//       (A$887bn total Defence funding to 2035-36; about A$425bn allocated to capability; A$71-96bn for nuclear-powered submarines;
//        Chart 1 shares by capability priority; A$1.7bn Ghost Shark contract; A$1.4bn Ghost Bat commitment; 11 Mogami-class frigates;
//        "deter through denial ... through our northern approaches"; about 3.0% of GDP by 2033-34)
//   [F] 2026 IIP overview factsheet (official): https://web.archive.org/web/20260725070209/https://www.defence.gov.au/sites/default/files/2026-04/2026%20IIP%20Overview%20factsheet%20A4_WEB%20(1).pdf
//   [T] Federal Register 2024-20730, DSCA transmittal 23-02 (Tomahawk, US$895m, 200 Block V + 20 Block IV), delivered Mar. 16, 2023
//   [N] Australian Defence Magazine, 2019-06-24: A$680m NASAMS acquisition contract (LAND 19 Phase 7B)
//   [S] SIPRI Milex database v1.2 (2026): 2025 calendar year A$54.81bn = US$35.33bn, 1.92% of GDP; implied 1.55 AUD/USD used
//       for conversions (an estimate).
// NOTIONAL: every baseline (base), scale (k), reach, weight (w), the approach geometry and the preset mixes. No sea-mine unit
//   cost was found, so that row is notional.

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2);
const AUD = 1.55;
const PBS = 'https://web.archive.org/web/20260514030830/https://www.defence.gov.au/sites/default/files/2026-05/Defence-Portfolio-Budget-Statements-2026-27.pdf';
const IIP = 'https://www.globalsecurity.org/military/library/policy/int/2026-integrated-investement-program_australia_20260416.pdf';
const FS = 'https://web.archive.org/web/20260725070209/https://www.defence.gov.au/sites/default/files/2026-04/2026%20IIP%20Overview%20factsheet%20A4_WEB%20(1).pdf';
const SIPRI = 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx';
const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;

// 2026 IIP Chart 1, share of planned investment by capability priority (percent, as printed), mapped onto the model's categories.
const IIP_MIX = [
  { t: 'Undersea warfare (incl. nuclear-powered submarines)', bn: 23, cat: 'platforms' },
  { t: 'Maritime capabilities for sea denial and sea control', bn: 15, cat: 'platforms' },
  { t: 'Expeditionary air operations', bn: 8, cat: 'platforms' },
  { t: 'Targeting and long-range strike', bn: 7, cat: 'strike' },
  { t: 'Guided weapons and explosive ordnance', bn: 6, cat: 'ammo' },
  { t: 'Missile defence', bn: 5, cat: 'airdef' },
  { t: 'Space and cyber', bn: 6, cat: 'c4isr' },
  { t: 'Theatre command and control', bn: 3, cat: 'c4isr' },
  { t: 'Northern bases', bn: 3, cat: 'c4isr' },
  { t: 'Amphibious capable combined-arms land system', bn: 11, cat: 'other' },
  { t: 'Theatre logistics and health', bn: 4, cat: 'other' },
  { t: 'Enterprise infrastructure', bn: 7, cat: 'other' },
  { t: 'Enterprise data and ICT', bn: 3, cat: 'other' },
  { t: 'Advanced Strategic Capabilities Accelerator', bn: 1, cat: 'other' },
];

export const AUSTRALIA = {
  k: 'au', name: 'Australia', sub: 'A$ · northern approaches', cur: 'A$',
  money: bn => bn >= 1000 ? `A$${(bn / 1000).toFixed(2)}tn` : `A$${fmtBn(bn)}bn`,
  budgets: [
    { k: 'mea26', bn: 15.4, t: 'Military equipment acquisition, 2026-27', s: 'A$15.4bn · Budget, May 2026',
      note: 'The 2026-27 Military Equipment Acquisition Program, the part of Defence\'s budget that buys ships, aircraft, vehicles and weapons. Most of it pays for projects already approved.' },
    { k: 'def26', bn: 62.6, t: 'Defence portfolio funding, 2026-27', s: 'A$62.6bn · Budget, May 2026',
      note: 'Funding from government for Defence, the Australian Signals Directorate, the Australian Submarine Agency and the nuclear safety regulator in 2026-27. Most of it pays for people, upkeep and operations.' },
    { k: 'iip', bn: 425, t: '2026 Integrated Investment Program', s: 'about A$425bn · capability, 2026-27 to 2035-36',
      note: 'The funding the government has allocated to new capability over ten years in the April 2026 investment program. It is the only line with a published split by capability priority.' },
  ],
  cats: [
    { id: 'ascm', t: 'Land-based maritime strike', col: '--c3', k: 4, base: 0.15, reach: 500, w: 0.55, cls: 'mobile',
      unit: 'long range fires regiment (HIMARS)', cost: 2.136, s: 'Truck-mounted HIMARS with Precision Strike Missiles that can hit ships from the coast.',
      src: PBS, srcName: 'Defence PBS 2026-27, Appendix B',
      basis: 'LAND 8113 Phase 1, Army\'s first long range fires regiment, A$2,136m approved military equipment.' },
    { id: 'drones', t: 'Uncrewed systems', col: '--c2', k: 3, base: 0.1, reach: 400, w: 0.4, cls: 'mobile',
      unit: 'Ghost Shark fleet contract (2025)', cost: 1.7, s: 'Ghost Shark undersea vehicles, Ghost Bat aircraft and uncrewed boats.',
      src: IIP, srcName: '2026 Integrated Investment Program',
      basis: 'A$1.7bn contract with Anduril Australia in 2025 for a fleet of Ghost Shark extra-large autonomous undersea vehicles (number not published).' },
    { id: 'mines', t: 'Sea mines', col: '--c5', k: 3, base: 0.05, reach: 20, w: 0.35, cls: 'mines',
      unit: 'lot of 100 smart sea mines', cost: 0.5, s: 'Smart sea mines laid in chokepoints and approaches before an assault.' },
    { id: 'strike', t: 'Long-range strike missiles', col: '--c4', k: 5, base: 0.15, reach: 1000, w: 0.3, cls: 'mobile',
      unit: '100 Tomahawk missiles', cost: 895 / 220 * 100 * AUD / 1000, s: 'Tomahawk and other long-range missiles against the force at sea and its bases.',
      src: 'https://www.federalregister.gov/documents/2024/09/12/2024-20730/arms-sales-notification', srcName: 'Federal Register, Sept. 12, 2024', est: true,
      basis: 'US$895m for 200 Block V and 20 Block IV with support (DSCA 23-02), per 100, converted at 1.55.' },
    { id: 'airdef', t: 'Air and missile defense', col: '--c1', k: 8, base: 0.2, reach: 0, w: 0, cls: 'fixed',
      unit: 'NASAMS acquisition contract (2019)', cost: 0.68, s: 'NASAMS, ship-based missiles and counter-drone systems that protect forces and bases.',
      src: 'https://www.australiandefence.com.au/defence/joint/commonwealth-signs-nasams-acquisition-contract', srcName: 'Australian Defence Magazine, June 24, 2019',
      basis: 'A$680m acquisition contract with Raytheon Australia for NASAMS (LAND 19 Phase 7B); number of fire units not stated.' },
    { id: 'c4isr', t: 'Surveillance and resilience', col: '--c6', k: 4, base: 0.35, reach: 0, w: 0, cls: 'mobile',
      unit: 'JORN radar upgrade', cost: 1.243, s: 'Over-the-horizon radar, patrol aircraft, space, networks and hardened northern bases.',
      src: PBS, srcName: 'Defence PBS 2026-27, Appendix B',
      basis: 'AIR 2025, modernising the Jindalee Operational Radar Network, A$1,243m approved military equipment.' },
    { id: 'ammo', t: 'Guided weapons stocks', col: '--c7', k: 5, base: 0.2, reach: 0, w: 0, cls: 'fixed',
      unit: 'year of Navy guided-weapons buys at the 2026-27 level', cost: 0.845, s: 'Missiles and munitions to keep firing after the first days.',
      src: PBS, srcName: 'Defence PBS 2026-27, Appendix B',
      basis: 'SEA 1300 maritime guided weapons and munitions, A$845m budgeted in 2026-27 (A$16,902m approved).' },
    { id: 'platforms', t: 'Ships, submarines and aircraft', col: '--c8', k: 60, base: 0.35, reach: 800, w: 0.45, cls: 'platform',
      unit: 'Hunter-class frigate', cost: 26.57 / 6, s: 'Frigates, destroyers, submarines, F-35s and patrol aircraft.',
      src: PBS, srcName: 'Defence PBS 2026-27, Appendix B', est: true,
      basis: 'SEA 5000, A$26,570m approved military equipment for six Hunter-class frigates, per ship. Same table: general purpose frigates (Mogami class) A$7,532m approved.' },
    { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
      unit: '', cost: 0, s: 'Personnel, upkeep, land forces, logistics, estate and IT. Money here has no effect in the model.' },
  ],
  presets: {
    porcupine: { t: 'Denial layers', s: 'Strike missiles, uncrewed systems and surveillance',
      mix: { ascm: 0.24, drones: 0.18, mines: 0.06, strike: 0.14, airdef: 0.1, c4isr: 0.12, ammo: 0.12, platforms: 0.04, other: 0 } },
    legacy: { t: 'Ships and aircraft first', s: 'Frigates, submarines and fighters',
      mix: { ascm: 0.04, drones: 0.03, mines: 0.01, strike: 0.05, airdef: 0.12, c4isr: 0.05, ammo: 0.05, platforms: 0.65, other: 0 } },
    even: { t: 'Even split', s: 'The same amount to each modeled category',
      mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
  },
  defaults: { b: 'mea26', preset: 'porcupine', supp: 0.4, warn: 7 },
  geo: { km: 800, speed: 15, unit: 'kn' },
  refMix: { budget: 'iip', label: 'Investment Program mix', sub: '2026-36 priorities, mapped', lines: IIP_MIX,
    off: 'Only the 2026 Integrated Investment Program has a published split by priority', title: 'How the 2026 Integrated Investment Program splits, 2026-36',
    fmt: v => `${v}%` },
  refText: {
    mea26: ['What the line pays for', 'Mostly installments on approved projects such as the Hunter-class frigates, F-35s, HIMARS and guided weapons. There is no full split onto these categories, so there is no reference mix; switch to the Investment Program to see one.'],
    def26: ['How the budget splits', 'Of Defence\'s A$60.6bn planned spending in 2026-27, about A$18.4bn goes to workforce, A$21.0bn to capability acquisition and A$18.5bn to sustainment. Those are cost types, not capabilities, so there is no reference mix.'],
  },
  strip: { left: 'Open ocean', right: 'Northern Australia', zero: 'coast', noun: 'ships', play: 'Play the approach', exportTitle: 'Notional northern approach',
    eyebrow: 'Notional northern approach <span class="notional">Notional model, not a prediction</span>',
    note: 'Bands show how far each layer reaches out from Australia\'s northern coast across the sea-air gap; darker means stronger after the attacker\'s opening strikes. Triangles on the right are mobile launchers and drones and rectangles large ships and aircraft; faded ones did not survive the opening strikes. No real coast, base or unit is shown.',
    aria: 'Stylized northern approach. A hostile naval task group sails from the open ocean on the left toward northern Australia on the right, through bands showing how far each Australian layer reaches and how strong it is. Ships marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly approach', 'A large share of the task group comes under effective attack in the northern approaches.'],
      warn: ['Contested approach', 'Australia engages part of the task group, but most of it reaches the coast untouched.'],
      bad: ['Approach largely unopposed', 'Too little Australian firepower survives, sees the ships or reaches them.'],
    },
    explain: {
      mobile: n => `Only ${n}% of launchers and drones survive the opening strikes; air defense and surveillance spending protect them.`,
      platform: n => `Ships, submarines and aircraft are few and sit at known bases, so only ${n}% remain after the opening strikes.`,
      track: 'Weak surveillance leaves shooters without good tracks on the ships.',
      mines: n => `With short warning only ${n}% of the minefield is laid in time.`,
    },
    tiles: { engaged: 'of the task group comes under effective attack', hours: h => `of a ${h} h approach`, shooters: 'after the opening strikes' },
    supp: ['Opening missile and air strikes', 'Share of Australia\'s unprotected forces in the north the opening strikes would destroy.'],
    warn: ['Warning before the approach', 'Days Australia has to deploy launchers to the north and lay mines before the ships arrive.'],
  },
  doc: {
    terms: { attacker: 'The attacker', c4: 'ISR', platforms: 'Ships, submarines and aircraft', edge: 'the northern coast' },
    howto: [
      'Pick a budget, then divide it across eight kinds of capability. The model sends a notional naval task group across the sea-air gap toward northern Australia and reports four things: the share of the group that comes under effective attack, how many hours of the approach are spent inside at least one working layer of Australian fires, the share of Australian shooters that survive the opening strikes, and a resilience score.',
      'The comparison table sets your plan beside three or four mixes. <b>Denial layers</b> buys land-based strike, uncrewed systems, surveillance and missiles. <b>Ships and aircraft first</b> buys large platforms. For the ten-year program, the <b>Investment Program mix</b> maps the government\'s own split by capability priority onto the model\'s categories.',
    ],
    scenario: 'A hostile naval task group sails a notional 800 km at 15 knots across the sea-air gap toward Australia\'s northern coast. One of the five tasks the government sets the Defence Force is to "deter through denial any potential adversary\'s attempt to project power against Australia through our northern approaches". The model is abstract: it includes no real coast, island, base or unit, and does not model U.S. or other allied forces.',
    leavesOut: 'What the model leaves out matters: the United States and other partners, the attacker\'s submarines, long-range bombers and electronic warfare, weather, the size of the north, fuel and logistics, training, maintenance and delivery schedules. Submarines and frigates that do poorly here are bought for jobs this strip does not show, such as protecting sea lanes far from Australia.',
    real: {
      cols: ['Budget line', 'A$bn', 'Notes'],
      rows: [
        ['Military Equipment Acquisition Program, 2026-27', '15.4', `Part of the A$21.0bn Capability Acquisition Program. ${a(PBS, 'Defence PBS 2026-27')}, Table 5`],
        ['Defence portfolio funding from government, 2026-27', '62.6', `Defence A$59.5bn, plus the Signals Directorate, Submarine Agency and nuclear regulator. ${a(PBS, 'PBS')}, Table 4a`],
        ['Total Defence resourcing, 2026-27', '66.4', `All sources, including administered funding. ${a(PBS, 'PBS')}, Table 1`],
        ['Nuclear-Powered Submarines program, 2026-27', '2.4', `A$5.0bn in 2025-26; the Submarine Agency gets another A$0.5bn. ${a(PBS, 'PBS')}, Table 37`],
        ['Nuclear-powered submarines, ten years', '71-96', `Planned investment, 2026-27 to 2035-36. ${a(IIP, '2026 IIP')}`],
        ['2026 Integrated Investment Program, ten years', '~425', `Allocated to capability, 2026-27 to 2035-36. ${a(FS, 'IIP overview')}`],
        ['Total Defence funding, ten years', '887', `To 2035-36, including the Signals Directorate and Submarine Agency. ${a(IIP, '2026 IIP')}`],
      ],
      note: 'The program and portfolio lines are different bases. The ten-year figures are plans, not appropriations, and the submarine range sits inside the A$425bn.',
    },
    menuNote: 'Most budget lines give a project total without a quantity, so several units are whole projects or contracts. No sea-mine price was found, so that row is notional.',
    related: [
      { b: 'SIPRI, 2025.', t: 'A$54.8bn, about US$35.3bn, 1.92% of GDP by SIPRI\'s measure.', url: SIPRI, src: 'SIPRI Military Expenditure Database, 2026 (xlsx)' },
      { b: 'Three percent.', t: 'Defence funding is projected to reach about 3.0% of GDP by 2033-34 on the NATO method; the 2026 program adds A$53bn over ten years.', url: IIP, src: '2026 Integrated Investment Program' },
      { b: 'General purpose frigates.', t: '11 upgraded Mogami-class frigates, the first three built in Japan; A$7,532m approved so far.', url: PBS, src: 'Defence PBS 2026-27' },
      { b: 'Ghost Bat.', t: 'A A$1.4bn commitment in December 2025 to make the MQ-28A an operational aircraft.', url: IIP, src: '2026 Integrated Investment Program' },
      { b: 'Strike range.', t: 'The program says Army strike range grew from 40 km to 500 km between 2024 and 2026, and Navy\'s from 120 km to 2,500 km.', url: IIP, src: '2026 Integrated Investment Program' },
    ],
    sources: [
      { src: 'Department of Defence, Portfolio Budget Statements 2026-27', url: PBS, d: 'May 2026', n: 'Annual totals, program lines and approved project costs (opened via the Wayback Machine).' },
      { src: 'Department of Defence, 2026 Integrated Investment Program', url: IIP, d: 'April 16, 2026', n: 'Ten-year totals, the split by capability priority and the defence tasks (copy hosted by GlobalSecurity.org).' },
      { src: 'Department of Defence, 2026 Integrated Investment Program overview factsheet', url: FS, d: 'April 2026', n: 'About A$425bn to 2035-36 and the ranges for each priority.' },
      { src: 'SIPRI Military Expenditure Database', url: SIPRI, d: '2026', n: 'Also the basis of the 1.55 AUD/USD rate used for conversions (A$54.8bn = US$35.3bn).' },
      { src: 'Unit-cost sources are linked in the spending menu table.' },
    ],
    missing: 'Quantities for most projects (Ghost Shark, NASAMS fire units, PrSM), any sea-mine price, a per-ship cost for the general purpose frigates, and a defence.gov.au copy of the full 2026 Integrated Investment Program that could be opened.',
  },
};
