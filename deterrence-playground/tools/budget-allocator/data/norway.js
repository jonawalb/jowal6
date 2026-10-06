// Norway profile for the Defense Budget Allocator.
// SOURCED (all opened 2026-10-02; regjeringen.no pages via the Wayback Machine because they show a bot check):
//   Budgets
//   Ministry of Defence, "180 milliarder til forsvar og støtte til Ukraina", 2025-10-15:
//     https://www.regjeringen.no/no/aktuelt/180-milliarder-til-forsvar-og-stotte-til-ukraina/id3121831/
//     (defence budget NOK 180bn in 2026 = 3.4% of GDP; about NOK 112bn without Ukraine support; Nansen programme NOK 85bn
//      in 2026, of which NOK 70bn military; +NOK 4.2bn to follow the long-term plan)
//   Storting, Innst. 7 S (2025-2026): https://www.stortinget.no/no/Saker-og-publikasjoner/Publikasjoner/Innstillinger/Stortinget/2025-2026/inns-202526-007s/?all=true
//     (Prop. 1 S (2025-2026) proposes NOK 38,615.5m on chapter 1760, defence materiel and major procurement and maintenance)
//   Government press release, 2024-04-05: https://www.regjeringen.no/en/whats-new/new-norwegian-long-term-plan-on-defence-a-historic-plan/id3032878/
//     (Long-term Defence Plan: NOK 1,624bn over twelve years to 2036, an increase of NOK 600bn)
//   Government press release, 2026-03-27: https://www.regjeringen.no/en/whats-new/government-to-provide-additional-nok-115-billion-to-strengthen-long-term-defence-plan/id3155063/
//     (a further NOK 115bn to 2036, NOK 31bn by 2030; planning period extended to 2040)
//   SIPRI Milex database v1.2 (2026): https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx
//     (2025: NOK 177bn = US$17.03bn, 3.28% of GDP; implied 10.391 NOK/USD used for conversions, an estimate)
//   Unit costs: see `src` on each category below.
// NOTIONAL: every baseline (base), scale (k), reach, weight (w), the approach geometry and the preset mixes. No sourced
//   unit cost was found for drones (Norway cancelled its long-range maritime drone project in March 2026) or sea mines,
//   so those two rows are notional.
// MODEL NOTE: submarines sit in the `strike` slot with class 'mobile', because at sea they are hard to find in an opening
//   strike; frigates and fighters sit in `platforms` with class 'platform'.

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2);
const kr = v => v >= 1 ? `${fmtBn(v)}bn kr` : `${Math.round(v * 1000)}m kr`;
const USD = 10.391;
const WB = 'https://web.archive.org/web/2026/';
const B26 = WB + 'https://www.regjeringen.no/no/aktuelt/180-milliarder-til-forsvar-og-stotte-til-ukraina/id3121831/';
const INN = 'https://www.stortinget.no/no/Saker-og-publikasjoner/Publikasjoner/Innstillinger/Stortinget/2025-2026/inns-202526-007s/?all=true';
const LTP = WB + 'https://www.regjeringen.no/en/whats-new/new-norwegian-long-term-plan-on-defence-a-historic-plan/id3032878/';
const LTP2 = WB + 'https://www.regjeringen.no/en/whats-new/government-to-provide-additional-nok-115-billion-to-strengthen-long-term-defence-plan/id3155063/';
const SUB = WB + 'https://www.regjeringen.no/no/aktuelt/regjeringen-gar-inn-for-anskaffelse-av-ytterligere-to-ubater/id3142018/';
const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;

export const NORWAY = {
  k: 'no', name: 'Norway', sub: 'NOK (kr) · High North', cur: 'NOK',
  money: kr,
  budgets: [
    { k: 'mat26', bn: 38.6, t: 'Materiel and major procurement, 2026', s: '38.6bn kr (NOK) · chapter 1760, proposed',
      note: 'The 2026 budget chapter for defence materiel, major procurement and maintenance, as proposed to the Storting in October 2025.' },
    { k: 'nd26', bn: 112, t: 'Defence budget without Ukraine, 2026', s: 'about 112bn kr (NOK) · proposed',
      note: 'Norway\'s own defence spending in the 2026 proposal, leaving out support to Ukraine. In reality most of it pays for people, operations and signed contracts.' },
    { k: 'all26', bn: 180, t: 'Whole defence budget, 2026', s: '180bn kr (NOK) · 3.4% of GDP, incl. Ukraine',
      note: 'The full 2026 proposal, including 70bn kr of military support to Ukraine. Here you may spend all of it on Norway\'s own defence.' },
    { k: 'ltp', bn: 1624, t: 'Long-term Defence Plan, 2025-2036', s: '1,624bn kr (NOK) · twelve years',
      note: 'Total defence spending in the long-term plan the Storting adopted in 2024, an increase of 600bn kr. In March 2026 the government proposed adding 115bn kr more by 2036.' },
  ],
  cats: [
    { id: 'ascm', t: 'Naval Strike Missiles', col: '--c3', k: 8, base: 0.35, reach: 180, w: 0.5, cls: 'mobile',
      unit: 'NSM outfit for a frigate class', cost: 2.1, s: 'Anti-ship missiles on ships and mobile coastal launchers.',
      src: 'https://www.kongsberg.com/news/news-archive/2025/denmark-acquires-kongsbergs-naval-strike-missile/', srcName: 'Kongsberg, Mar. 6, 2025',
      basis: 'Denmark\'s 2.1bn kr purchase of NSM for its frigates, contracted through Norway\'s materiel agency: missiles, shipboard equipment, training and support. Quantities not published; used here as a proxy for a Norwegian buy.' },
    { id: 'drones', t: 'Drones and uncrewed vessels', col: '--c2', k: 5, base: 0.1, reach: 150, w: 0.3, cls: 'mobile',
      unit: 'squadron of long-range drones', cost: 1.5, s: 'Surveillance drones and uncrewed surface and underwater craft.' },
    { id: 'mines', t: 'Sea mines', col: '--c5', k: 3, base: 0.02, reach: 20, w: 0.25, cls: 'mines',
      unit: 'lot of 100 mines', cost: 0.5, s: 'Mines off key fjords and harbors before the assault.' },
    { id: 'strike', t: 'Submarines', col: '--c4', k: 40, base: 0.2, reach: 600, w: 0.4, cls: 'mobile',
      unit: '212CD submarine', cost: 46 / 2, s: 'Submarines hunting the group across the whole approach. At sea they are hard to find, so the model treats them as mobile.',
      src: SUB, srcName: 'Ministry of Defence, Dec. 5, 2025', est: true,
      basis: '46bn kr added to the program for a fifth and sixth 212CD submarine, including VAT, contingency and project costs, per boat. The six-boat program totals 98bn kr.' },
    { id: 'airdef', t: 'Air defense (NASAMS)', col: '--c1', k: 20, base: 0.3, reach: 0, w: 0, cls: 'fixed',
      unit: '100 AMRAAM-ER missiles', cost: 405e-3 * USD, s: 'NASAMS and longer-range air defense protecting bases, ports and launchers.',
      src: 'https://www.federalregister.gov/d/2025-20509', srcName: 'Federal Register, Nov. 21, 2025 (DSCA 24-86)', est: true,
      basis: 'US$405m approval for 100 extended-range AMRAAM for NASAMS with support, converted at 10.391 NOK/USD. An approval, not a contract.' },
    { id: 'c4isr', t: 'Maritime surveillance', col: '--c6', k: 10, base: 0.25, reach: 0, w: 0, cls: 'mobile',
      unit: 'P-8A patrol aircraft', cost: 1.75 / 5 * USD, s: 'Patrol aircraft, satellites, radars and networks that find and track ships in the north.',
      src: 'https://www.federalregister.gov/d/2026-00528', srcName: 'Federal Register, Jan. 14, 2026 (DSCA 16-57 and 24-1A)', est: true,
      basis: 'US$1.75bn notified in 2016 for five P-8A with support, per aircraft, converted at 10.391 NOK/USD. A sixth aircraft and later upgrades raised the case to US$3.43bn.' },
    { id: 'ammo', t: 'Munition stocks', col: '--c7', k: 8, base: 0.3, reach: 0, w: 0, cls: 'fixed',
      unit: 'long-range 155 mm shell order', cost: 4.245, s: 'Missiles, torpedoes and shells to keep firing after the first engagement.',
      src: WB + 'https://www.regjeringen.no/en/whats-new/store-investeringer-i-forsvaret/id2970607/', srcName: 'Ministry of Defence, Mar. 31, 2023',
      basis: '4,245m kr for long-range artillery ammunition from Nammo for the K9 guns; quantity not published.' },
    { id: 'platforms', t: 'Frigates and fighters', col: '--c8', k: 90, base: 0.35, reach: 600, w: 0.4, cls: 'platform',
      unit: 'Type 26 frigate, share of deal', cost: 13.5 / 5 * USD, s: 'New Type 26 frigates, the current frigates and F-35 fighters.',
      src: 'https://www.defensenews.com/global/europe/2025/09/01/norway-to-buy-british-frigates-in-14-billion-deal/', srcName: 'Defense News, Sept. 1, 2025', est: true,
      basis: 'Reported US$13.5bn for at least five frigates, per ship, converted at 10.391 NOK/USD. The government\'s announcement gave no price.' },
    { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
      unit: '', cost: 0, s: 'Personnel, operations, the army in Finnmark, Ukraine support and programs outside the scenario.' },
  ],
  presets: {
    porcupine: { t: 'Sensors, missiles and submarines', s: 'Patrol aircraft, NSM, submarines and stocks',
      mix: { ascm: 0.2, drones: 0.08, mines: 0.04, strike: 0.22, airdef: 0.1, c4isr: 0.16, ammo: 0.14, platforms: 0.06, other: 0 } },
    legacy: { t: 'Frigates and fighters first', s: 'Surface fleet, fighters and air defense',
      mix: { ascm: 0.05, drones: 0.02, mines: 0, strike: 0.05, airdef: 0.18, c4isr: 0.05, ammo: 0.05, platforms: 0.6, other: 0 } },
    even: { t: 'Even split', s: 'The same amount to each modeled category',
      mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
  },
  defaults: { b: 'mat26', preset: 'porcupine', supp: 0.4, warn: 5 },
  geo: { km: 600, speed: 16, unit: 'kn' },
  refText: {
    mat26: ['What the chapter pays for', 'Operating costs of the materiel agency, major equipment purchases and maintenance, and Norway\'s share of NATO-funded investments. There is no split onto these categories, so there is no reference mix.'],
    nd26: ['What the budget adds', 'The 2026 proposal adds 4.2bn kr to follow the long-term plan, including 1.3bn kr for about 600 permanent staff, 750 reservists and 700 conscripts, and 800m kr for maintenance. There is no per-capability split, so there is no reference mix.'],
    all26: ['What the total includes', '70bn kr of the 180bn kr is military support to Ukraine through the Nansen programme. There is no per-capability split, so there is no reference mix.'],
    ltp: ['What the plan stresses', 'Situational awareness, a new maritime surface fleet, at least five frigates and five submarines, Norway\'s first long-range air defense, and an army of three brigades. No per-category amounts were published, so there is no reference mix.'],
  },
  strip: { left: 'Barents Sea', right: 'Norwegian coast', zero: 'coast', noun: 'ships', play: 'Play the approach', exportTitle: 'Notional High North approach',
    eyebrow: 'Notional High North approach <span class="notional">Notional model, not a prediction</span>',
    note: 'Bands show how far each layer reaches out from the Norwegian coast; darker means stronger after the attacker\'s opening strikes. Triangles on the right are missile launchers, submarines and drone teams and rectangles frigates and fighters; faded ones did not survive the opening strikes. No real coast, fjord, base or unit is shown.',
    aria: 'Stylized maritime approach in the High North. A hostile naval group sails from the open sea on the left toward the Norwegian coast on the right, through bands showing how far each Norwegian layer reaches and how strong it is. Ships marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly approach', 'A large share of the naval group comes under effective attack on its way south.'],
      warn: ['Contested approach', 'Norway engages part of the group, but most of it reaches the coast untouched.'],
      bad: ['Approach largely unopposed', 'Too little Norwegian firepower survives, finds the ships or reaches them.'],
    },
    explain: {
      mobile: n => `Only ${n}% of missile launchers, submarines and drone teams survive the opening strikes; air defense and surveillance spending protect them.`,
      platform: n => `Frigates and fighters are few and their bases are known, so only ${n}% remain after the opening strikes.`,
      track: 'Weak maritime surveillance leaves shooters without good tracks on the ships across a very large sea.',
      mines: n => `With short warning only ${n}% of the minefield is laid in time.`,
    },
    tiles: { engaged: 'of the naval group comes under effective attack', hours: h => `of a ${h} h approach`, shooters: 'after the opening strikes' },
    supp: ['Opening missile and air strikes', 'Share of Norway\'s unprotected forces the opening strikes would destroy.'],
    warn: ['Warning before the approach', 'Days Norway has to put submarines to sea, disperse launchers and lay mines.'],
  },
  doc: {
    terms: { attacker: 'The attacker', c4: 'surv.', platforms: 'Frigates and fighters', edge: 'the coast' },
    howto: [
      'Pick a budget, then divide it across eight kinds of capability. The model sends a notional naval group a long way across northern waters toward the Norwegian coast and reports four things: the share of the group that comes under effective attack, how many hours of the approach are spent inside at least one working layer of Norwegian fires, the share of Norwegian shooters that survive the opening strikes, and a resilience score.',
      'The comparison table sets your plan beside three mixes. <b>Sensors, missiles and submarines</b> buys patrol aircraft, Naval Strike Missiles, submarines and munitions. <b>Frigates and fighters first</b> buys the new frigates, fighters and air defense. No published breakdown maps Norway\'s budget onto these categories, so there is no official reference mix.',
    ],
    scenario: 'A hostile naval group sails a notional 600 km at 16 knots through northern waters toward the Norwegian coast. The government calls Russia\'s war against Ukraine Norway\'s largest security challenge and reports increased Russian activity in the North Atlantic and the Barents Sea. The model is abstract: it includes no real coast, fjord, base or unit, and does not model NATO allies or the land battle in Finnmark.',
    leavesOut: 'What the model leaves out matters: NATO allies, the attacker\'s submarines, aircraft and long-range missiles, the land battle in the north, darkness, ice and weather, training, maintenance and delivery schedules. Frigates and patrol aircraft that do poorly here also watch the northern seas every day.',
    real: {
      cols: ['Budget line', 'NOK bn', 'Notes'],
      rows: [
        ['Defence budget, 2026 proposal', '180', `3.4% of GDP, including Ukraine support. ${a(B26, 'Ministry of Defence, Oct. 15, 2025')}`],
        ['of which without Ukraine support', '~112', a(B26, 'Ministry of Defence, Oct. 15, 2025')],
        ['of which Nansen programme, military support to Ukraine', '70', `85 in all, with 15 civil. ${a(B26, 'Ministry of Defence')}`],
        ['Chapter 1760, materiel and major procurement, 2026 proposal', '38.6', a(INN, 'Storting, Innst. 7 S (2025-2026)')],
        ['Long-term Defence Plan, 2025-2036', '1,624', `An increase of 600. ${a(LTP, 'Government, Apr. 5, 2024')}`],
        ['Proposed addition to the plan, to 2036', '115', `31 of it by 2030. ${a(LTP2, 'Government, Mar. 27, 2026')}`],
      ],
      note: 'The 2026 figures are the government\'s proposal of October 2025. The long-term plan total covers twelve years, not one.',
    },
    menuNote: 'No sourced unit cost was found for drones or sea mines, so those rows are notional; the government cancelled its long-range maritime drone project in March 2026. The NSM row is Denmark\'s purchase through Norway, and the frigate row is a press estimate.',
    related: [
      { b: 'SIPRI, 2025.', t: '177bn kr, about US$17.0bn, 3.28% of GDP.', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', src: 'SIPRI Military Expenditure Database, 2026 (xlsx)' },
      { b: 'Two more submarines signed.', t: 'Contract with TKMS for a fifth and sixth 212CD, signed Jan. 30, 2026; first boat due in 2029.', url: 'https://www.fma.no/aktuelt-og-media/2026/forsvarsmateriell-inngar-kontrakt-om-to-ekstra-ubater', src: 'Norwegian Defence Materiel Agency, Jan. 30, 2026' },
      { b: 'Long-range precision fires.', t: 'The government proposed 19bn kr for long-range precision fires for the army alongside the submarines.', url: SUB, src: 'Ministry of Defence, Dec. 5, 2025' },
      { b: 'K9 howitzers.', t: '24 more K9 VIDAR, bringing the fleet to 52, deliveries by 2027; value not published.', url: 'https://www.hanwha.com/newsroom/news/press-releases/hanwha-aerospace-signs-third-contract-to-supply-k9-vidar-howitzers-to-norway.do', src: 'Hanwha, Sept. 19, 2025' },
      { b: 'Frigate partner.', t: 'Norway chose the UK and the Type 26 for at least five frigates; deliveries from 2030.', url: WB + 'https://www.regjeringen.no/en/whats-new/norway-will-acquire-british-frigates/id3117431/', src: 'Government, Aug. 31, 2025' },
      { b: 'Drones cancelled.', t: 'The long-range maritime surveillance drone project was dropped in the March 2026 revision of the plan.', url: 'https://breakingdefense.com/2026/03/norway-floats-additional-11-8b-in-defense-spending-through-2035-cancels-drone-program/', src: 'Breaking Defense, Mar. 27, 2026' },
    ],
    sources: [
      { src: 'Ministry of Defence, 180 milliarder til forsvar og støtte til Ukraina', url: B26, d: 'October 15, 2025', n: 'The 2026 totals and the Russia assessment.' },
      { src: 'Storting, Innst. 7 S (2025-2026)', url: INN, d: '2025', n: 'Chapter 1760 as proposed in Prop. 1 S (2025-2026).' },
      { src: 'Government of Norway, New Norwegian Long Term Plan on Defence', url: LTP, d: 'April 5, 2024' },
      { src: 'Ministry of Defence, Regjeringen går inn for anskaffelse av ytterligere to ubåter', url: SUB, d: 'December 5, 2025', n: 'Also reports increased Russian activity in the North Atlantic and the Barents Sea.' },
      { src: 'SIPRI Military Expenditure Database', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', d: '2026', n: 'Also the basis of the 10.391 NOK/USD rate used for conversions (177bn kr = US$17.03bn).' },
      { src: 'Unit-cost sources are linked in the spending menu table.' },
    ],
    missing: 'Unit costs for drones and sea mines, Norway\'s own NSM purchase prices, an official price for the Type 26 frigates, the K9 contract value, and any per-capability split of the 2026 budget.',
  },
};
