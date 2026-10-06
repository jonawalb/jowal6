// Germany profile for the Defense Budget Allocator.
// SOURCED (all opened 2026-10-02):
//   Budgets
//   Bundestag, text archive, 2025-11 (week 48), "Deutlicher Anstieg bei den Verteidigungsausgaben":
//     https://www.bundestag.de/dokumente/textarchiv/2025/kw48-de-verteidigung-1126048
//     (Einzelplan 14 EUR 82.69bn; Sondervermögen EUR 25.51bn; total EUR 108.2bn; military procurement EUR 47.88bn =
//      22.37 Einzelplan 14 + 25.51 Sondervermögen; personnel EUR 24.71bn; commitment authorizations EUR 300bn through 2041)
//   BMVg, 2025-11-26: https://www.bmvg.de/de/aktuelles/deutschland-investiert-in-verteidigung-und-staerkt-das-buendnis-6045046
//     (82.69 + 25.51; about EUR 152bn in 2029; NATO target of 3.5% of GDP in 2029)
//   NATO, Defence Investment of NATO Countries (2014-2026), cut-off 2026-07-03:
//     https://www.nato.int/content/dam/nato/webready/documents/finance/def-exp-2026-en.pdf (image PDF, read by OCR)
//     (Germany core defence expenditure 2026e EUR 124,660m; 2.69% of GDP; 2025e 2.22%)
//   Tagesspiegel, 2026-07-07: https://www.tagesspiegel.de/politik/fast-125-milliarden-euro-deutschland-meldet-nato-verteidigungsausgaben-in-rekordhohe-15814766.html
//     (EUR 124.7bn reported to NATO for 2026, 2.69% of GDP)
//   bundeswehr-journal, 2026-08-06: https://www.bundeswehr-journal.de/2026/ueber-das-sondervermoegen-fuer-die-bundeswehr/
//     (Sondervermögen: about EUR 50.7bn paid out by 2026-06-30, per BMVg written answer of 2026-07-09)
//   Handelsblatt, 2024-03-20: https://www.handelsblatt.com/politik/deutschland/bundeswehr-80-prozent-des-sondervermoegens-sind-laut-pistorius-bereits-gebunden/100026066.html
//     (about 80% of the EUR 100bn contractually bound)
//   SIPRI Milex database v1.2 (2026): https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx
//     (Germany 2025: EUR 100.7bn = US$113.6bn, 2.27% of GDP)
//   Scenario: Bundeswehr, 2025-05-22: https://www.bundeswehr.de/en/news/lithuania-45-armoured-brigade-activated-5948796
//     (45 Armoured Brigade activated in Vilnius; 4,800 service members and 200 civilians when complete)
//   Unit costs: see `src` on each category below. All in euros, so no currency conversion is needed.
// NOTIONAL: every baseline (base), scale (k), reach, weight (w), the approach geometry and the preset mixes. No sourced unit
//   cost was found for anti-tank missiles, mines and barriers, or C4ISR, so those three are notional.

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2);
const BT = 'https://www.bundestag.de/dokumente/textarchiv/2025/kw48-de-verteidigung-1126048';
const NATO26 = 'https://www.nato.int/content/dam/nato/webready/documents/finance/def-exp-2026-en.pdf';

export const GERMANY = {
  k: 'de', name: 'Germany', sub: '€ · eastern-flank reinforcement', cur: '€',
  money: bn => bn >= 1 ? `€${fmtBn(bn)}bn` : bn >= 0.01 ? `€${Math.round(bn * 1000)}m` : `€${(bn * 1000).toFixed(1)}m`,
  budgets: [
    { k: 'sv26', bn: 25.51, t: 'Special fund, 2026', s: '€25.51bn · Sondervermögen Bundeswehr',
      note: 'The 2026 draw on the €100bn special fund created in 2022. All of it goes to military procurement.' },
    { k: 'proc26', bn: 47.88, t: 'Military procurement, 2026', s: '€47.88bn · budget passed Nov. 2025',
      note: 'All 2026 money for military procurement: €22.37bn from the regular defense budget plus €25.51bn from the special fund.' },
    { k: 'ep14', bn: 82.69, t: 'Defense budget, 2026', s: '€82.69bn · Einzelplan 14',
      note: 'The regular 2026 defense budget, without the special fund. In reality most of it pays for people, operations and bases.' },
    { k: 'nato26', bn: 124.66, t: 'Defense spending as reported to NATO, 2026', s: '€124.7bn · 2.69% of GDP (NATO estimate)',
      note: 'What Germany reported to NATO for 2026. It counts more than the defense ministry budget, by NATO\'s definitions, so it is the widest measure here.' },
  ],
  cats: [
    { id: 'ascm', t: 'Anti-tank missiles', col: '--c3', k: 6, base: 0.3, reach: 5, w: 0.5, cls: 'mobile',
      unit: '100 anti-tank missiles with launchers', cost: 0.03, s: 'Infantry and vehicle-mounted anti-tank missiles.' },
    { id: 'drones', t: 'Drones and loitering munitions', col: '--c2', k: 4, base: 0.1, reach: 40, w: 0.45, cls: 'mobile',
      unit: '1,000 HX-2 loitering munitions', cost: 0.27 / 4.3, s: 'Reconnaissance drones and loitering munitions for the brigade.',
      src: 'https://esut.de/2026/02/meldungen/68450/loitering-munition-beschaffung-von-mehr-als-6-000-kampfdrohnen-gebilligt/', srcName: 'ESUT, Feb. 2026', est: true,
      basis: 'About €270m for 4,300 Helsing HX-2, per 1,000. A second order buys 2,200 Stark Virtus for a similar sum.' },
    { id: 'mines', t: 'Barriers and anti-tank mines', col: '--c5', k: 2, base: 0.1, reach: 10, w: 0.4, cls: 'mines',
      unit: 'lot of 10,000 anti-tank mines', cost: 0.1, s: 'Obstacles and minefields on the approaches, built with the host nation.' },
    { id: 'strike', t: 'Rocket artillery', col: '--c4', k: 20, base: 0.15, reach: 80, w: 0.35, cls: 'mobile',
      unit: 'PULS launcher, launcher only (rockets cost extra, so real buys get far fewer)', cost: 0.055 / 5, s: 'PULS launchers striking the column in depth.',
      src: 'https://soldat-und-technik.de/2025/02/bewaffnung/42191/bundeswehr-europuls/', srcName: 'Soldat & Technik, Feb. 10, 2025', est: true,
      basis: 'About €55m for five launchers, per launcher. Rockets are not stated as included.' },
    { id: 'airdef', t: 'Air and missile defense', col: '--c1', k: 40, base: 0.25, reach: 0, w: 0, cls: 'fixed',
      unit: 'IRIS-T SLM fire unit with missiles', cost: 0.95 / 6, s: 'IRIS-T SLM, Patriot and Arrow 3: protects forces and bases from the opening strikes.',
      src: 'https://www.bundeswehr-journal.de/2023/sechs-waffensysteme-iris-t-slm-fuer-die-deutsche-luftwaffe/', srcName: 'bundeswehr-journal, June 22, 2023', est: true,
      basis: 'Up to €950m for six fire units with missiles, per fire unit. Patriot: about €1.4bn for four systems (BMVg, July 2024).' },
    { id: 'c4isr', t: 'C4ISR and resilience', col: '--c6', k: 5, base: 0.3, reach: 0, w: 0, cls: 'mobile',
      unit: 'resilience package', cost: 0.1, s: 'Sensors, networks, shelters, decoys and dispersal.' },
    { id: 'ammo', t: 'Artillery ammunition', col: '--c7', k: 12, base: 0.2, reach: 0, w: 0, cls: 'fixed',
      unit: 'first 155 mm call-off, Rheinmetall framework', cost: 0.88, s: 'Shells and rockets to keep firing after the first days.',
      src: 'https://www.rheinmetall.com/en/media/news-watch/news/2024/06/2024-06-20-rheinmetall-receives-framework-contract-for-155mm-ammunition', srcName: 'Rheinmetall, June 20, 2024',
      basis: 'About €880m for the first call-off under a framework of up to €8.5bn gross. The number of rounds was not published.' },
    { id: 'platforms', t: 'Tanks, IFVs and combat jets', col: '--c8', k: 80, base: 0.3, reach: 40, w: 0.45, cls: 'platform',
      unit: 'Leopard 2A8 tank, share of contract', cost: 2.9 / 105, s: 'Leopard 2A8 tanks, Puma infantry fighting vehicles, F-35A jets.',
      src: 'https://www.bmvg.de/de/aktuelles/leopard-2-a8-neue-kampfpanzer-fuer-die-brigade-litauen-5810986', srcName: 'BMVg, July 11, 2024', est: true,
      basis: 'About €2.9bn for 105 tanks with extra services and an availability guarantee, per tank. Puma: €4.2bn for 200 (2025). F-35A: about €8.3bn for 35 with weapons and support (2022).' },
    { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
      unit: '', cost: 0, s: 'Personnel, pay, operations, bases, nuclear sharing and programs outside the scenario.' },
  ],
  presets: {
    porcupine: { t: 'Depth and attrition', s: 'Drones, rockets, mines and anti-tank missiles',
      mix: { ascm: 0.14, drones: 0.18, mines: 0.08, strike: 0.2, airdef: 0.14, c4isr: 0.1, ammo: 0.12, platforms: 0.04, other: 0 } },
    legacy: { t: 'Heavy forces first', s: 'Tanks, IFVs, jets and Patriot',
      mix: { ascm: 0.03, drones: 0.02, mines: 0.02, strike: 0.05, airdef: 0.24, c4isr: 0.04, ammo: 0.06, platforms: 0.54, other: 0 } },
    even: { t: 'Even split', s: 'The same amount to each modeled category',
      mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
  },
  defaults: { b: 'proc26', preset: 'porcupine', supp: 0.5, warn: 4 },
  geo: { km: 100, speed: 10, unit: 'km/h' },
  geoLabel: 'Approach depth',
  refText: {
    sv26: ['What the fund pays for', 'The special fund pays for large programs such as the F-35A. By June 30, 2026 about €50.7bn of the €100bn had been paid out, and most of the rest is tied to signed contracts. There is no per-capability split, so there is no reference mix.'],
    proc26: ['What the line covers', 'Military procurement from the regular budget and the special fund. During the budget talks the committee cut planned ammunition spending by €3.72bn. There is no per-capability split, so there is no reference mix.'],
    ep14: ['How the budget splits', 'Of the €82.69bn, €24.71bn pays for personnel, €22.37bn for procurement and €11.31bn for barracks and other facilities. Those are budget headings, not capabilities, so there is no reference mix.'],
    nato26: ['What the figure covers', 'NATO counts defense spending across the federal budget, not only the defense ministry. There is no per-capability split, so there is no reference mix.'],
  },
  strip: { left: 'Start line', right: 'Defended line', zero: 'line', noun: 'vehicles', play: 'Play the advance', exportTitle: 'Notional armored advance',
    land: true, vehicle: true,
    eyebrow: 'Notional armored advance <span class="notional">Notional model, not a prediction</span>',
    note: 'Bands show how far each German layer reaches forward of an allied defended line; darker means stronger after the attacker\'s opening strikes. Triangles on the right are mobile launchers and teams and rectangles tanks, IFVs and jets; faded ones did not survive the opening strikes. No real terrain, country or unit is shown.',
    aria: 'Stylized armored advance. An attacking armored column moves from its start line on the left toward a defended line held with German forces on the right, through bands showing how far each German layer reaches and how strong it is. Vehicles marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly advance', 'A large share of the attacking force comes under effective attack before it reaches the line.'],
      warn: ['Contested advance', 'German forces engage part of the column, but most of it reaches the line intact.'],
      bad: ['Advance largely unopposed', 'Too little German firepower survives, sees the column or reaches it.'],
    },
    explain: {
      mobile: n => `Only ${n}% of mobile launchers and teams survive the opening strikes; air defense and resilience spending protect them.`,
      platform: n => `Tanks, IFVs and jets gather at known bases and depots, so only ${n}% remain after the opening strikes.`,
      track: 'Weak sensors and networks leave shooters without good tracks on the column.',
      mines: n => `With short warning only ${n}% of the obstacle belt is in place in time.`,
    },
    tiles: { engaged: 'of the attacking force comes under effective attack', hours: h => `of a ${h} h advance`, shooters: 'after the opening strikes' },
    supp: ['Opening missile and air strikes', 'Share of the unprotected German force the attacker\'s opening strikes would destroy.'],
    warn: ['Warning before the attack', 'Days to deploy forward, lay mines and close barriers before the column moves.'],
  },
  doc: {
    terms: { attacker: 'The attacker', c4: 'C4ISR', platforms: 'Tanks, IFVs and combat jets', edge: 'the defended line' },
    howto: [
      'Pick a budget, then divide it across eight kinds of capability. The model sends a notional armored column toward a defended line held with German forces and reports four things: the share of the force that comes under effective attack, how many hours of the advance are spent inside at least one working layer of German fires, the share of German shooters that survive the attacker\'s opening strikes, and a resilience score.',
      'The comparison table sets your plan beside three mixes. <b>Depth and attrition</b> buys many small, dispersed systems. <b>Heavy forces first</b> buys tanks, infantry fighting vehicles, jets and Patriot. No published breakdown maps Germany\'s budget onto these categories, so there is no official reference mix.',
    ],
    scenario: 'German forces help hold a defended line on NATO\'s eastern flank while an attacking armored force advances a notional 100 km at 10 km/h. Germany activated its 45 Armoured Brigade in Lithuania in May 2025, its first formation permanently based abroad since the Second World War, planned at 4,800 troops. The model is generic: it shows no real terrain, border, units or positions, and the attacker is not modeled in any detail. It is there to show how the order of spending changes what happens to a force that has to cross the defender\'s layers.',
    leavesOut: 'What the model leaves out matters: the host nation\'s own forces and other NATO allies, the time and transport needed to move German units east, air power beyond the jets counted here, the attacker\'s engineers, electronic warfare and air defense, terrain, weather, training, maintenance, delivery schedules and peacetime deterrence. A system that does poorly here can still be the right buy for those jobs.',
    real: {
      cols: ['Budget line', '€bn', 'Notes'],
      rows: [
        ['Defense budget (Einzelplan 14), 2026', '82.69', `Passed Nov. 2025. <a href="${BT}" target="_blank" rel="noopener">Bundestag</a>`],
        ['Special fund (Sondervermögen), 2026', '25.51', `All for procurement. <a href="${BT}" target="_blank" rel="noopener">Bundestag</a>`],
        ['Total, 2026', '108.2', 'Budget plus special fund. <a href="https://www.bmvg.de/de/aktuelles/deutschland-investiert-in-verteidigung-und-staerkt-das-buendnis-6045046" target="_blank" rel="noopener">BMVg, Nov. 26, 2025</a>'],
        ['of which military procurement', '47.88', `22.37 from the budget, 25.51 from the fund. <a href="${BT}" target="_blank" rel="noopener">Bundestag</a>`],
        ['Reported to NATO, 2026', '124.66', `2.69% of GDP, NATO estimate (2.22% in 2025). <a href="${NATO26}" target="_blank" rel="noopener">NATO, July 2026</a>`],
        ['Special fund paid out by June 30, 2026', '~50.7', 'Of €100bn. <a href="https://www.bundeswehr-journal.de/2026/ueber-das-sondervermoegen-fuer-die-bundeswehr/" target="_blank" rel="noopener">bundeswehr-journal, Aug. 6, 2026</a>'],
      ],
      note: 'The defense budget and the NATO figure are different bases: NATO counts defense-related spending outside the defense ministry too. About 80% of the special fund was already under contract by March 2024, so little of it is free for new choices.',
    },
    menuNote: 'No sourced unit cost was found for anti-tank missiles, mines and barriers, or C4ISR, so those rows are notional. The PULS price covers launchers only.',
    related: [
      { b: 'Special fund commitments.', t: 'About 80% of the €100bn under contract by March 2024.', url: 'https://www.handelsblatt.com/politik/deutschland/bundeswehr-80-prozent-des-sondervermoegens-sind-laut-pistorius-bereits-gebunden/100026066.html', src: 'Handelsblatt, Mar. 20, 2024' },
      { b: 'Spending path.', t: 'About €152bn for the defense ministry in 2029, to meet NATO\'s 3.5% of GDP target that year.', url: 'https://www.bmvg.de/de/aktuelles/deutschland-investiert-in-verteidigung-und-staerkt-das-buendnis-6045046', src: 'BMVg, Nov. 26, 2025' },
      { b: 'SIPRI, 2025.', t: '€100.7bn, about US$113.6bn, 2.3% of GDP.', url: 'https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx', src: 'SIPRI Military Expenditure Database, 2026 (xlsx)' },
      { b: 'Patriot.', t: 'Four more systems for about €1.4bn, deliveries through 2030.', url: 'https://www.bmvg.de/de/aktuelles/beschaffung-patriot-systemen-lenkflugkoerpern-5811004', src: 'BMVg, July 11, 2024' },
      { b: 'Arrow 3.', t: '€3.6bn for launchers, missiles and radars; three sites, full capability planned by 2030.', url: 'https://www.bmvg.de/de/aktuelles/bundeswehr-beschafft-arrow-3-luftverteidigungssystem-5709582', src: 'BMVg' },
      { b: 'F-35A.', t: '35 jets for about €8.3bn with engines, weapons, spares and training, paid from the special fund.', url: 'https://www.bmvg.de/de/aktuelles/bundeswehr-kann-35-f-35a-fuer-rund-8-3-milliarden-euro-kaufen-5540934', src: 'BMVg, Dec. 14, 2022' },
      { b: 'Puma.', t: '200 more infantry fighting vehicles, €4.2bn approved Dec. 17, 2025.', url: 'https://www.hartpunkt.de/bundeswehr-darf-unter-massgabe-200-weitere-schuetzenpanzer-puma-bestellen/', src: 'hartpunkt, Dec. 2025' },
      { b: 'Taurus Neo.', t: 'A reported plan for about 600 cruise missiles for about €2.1bn, first deliveries around 2029; not a signed contract.', url: 'https://suv.report/bundeswehr-will-600-neue-marschflugkoerper-beschaffen/', src: 'Sicherheit & Verteidigung, Oct. 25, 2024, citing Spiegel' },
    ],
    sources: [
      { src: 'German Bundestag, debate on the 2026 defense budget', url: BT, d: 'November 2025', n: 'Einzelplan 14, special fund and procurement totals.' },
      { src: 'NATO, Defence Investment of NATO Countries (2014-2026)', url: NATO26, d: 'July 2026', n: 'Germany 2026 estimate: €124,660m, 2.69% of GDP.' },
      { src: 'Bundeswehr, 45 Armoured Brigade activated in Lithuania', url: 'https://www.bundeswehr.de/en/news/lithuania-45-armoured-brigade-activated-5948796', d: 'May 22, 2025' },
      { src: 'Unit-cost sources are linked in the spending menu table.' },
    ],
    missing: 'A per-capability split of the 2026 budget, an official list of what remains uncontracted in the special fund, signed values for Taurus Neo, and published unit costs for anti-tank missiles, mines and C4ISR.',
  },
};
