// Parameters for Hormuz Mine Clearance. Each value carries `src` (a cited open source) or `notional: true`.
// Notional values are round numbers chosen to make the trade-offs visible; they are not estimates of any
// real force, minefield or operation. Every source below was opened on 29 September 2026.
export const S = {
  eyer: { name: 'Kevin Eyer, "The Crisis in Mine Countermeasures," Proceedings, April 2026 (archived copy)', url: 'https://web.archive.org/web/2026/https://www.usni.org/magazines/proceedings/2026/april/crisis-mine-countermeasures' },
  thales: { name: 'Habonneau, Bousquet and Malkasse (Thales), "Performance Assessment of MCM Toolbox," UDT conference paper', url: 'https://cdn.asp.events/CLIENT_Clarion__96F66098_5056_B733_492B7F3A0E159DC7/sites/UDT-2020/media/libraries/unmanned-remotely-piloted-and-autonomous-systems/28---Jerome-Habonneau-Paper-FINAL.pdf' },
  cnn: { name: 'CNN, 10 March 2026', url: 'https://www.cnn.com/2026/03/10/politics/iran-begins-laying-mines-in-strait-of-hormuz' },
  mwc: { name: 'Connell and Walberg, "It\'s Time to Bring Back MINEWARCOM," Center for Maritime Strategy, 31 July 2026', url: 'https://centerformaritimestrategy.org/publications/its-time-to-bring-back-minewarcom/' },
  nyt91: { name: 'New York Times, "Allied Flotilla Quickly Clears Mines Off Kuwait," 25 June 1991 (archived)', url: 'https://web.archive.org/web/2024/https://www.nytimes.com/1991/06/25/world/allied-flotilla-quickly-clears-mines-off-kuwait.html' },
  hgram59: { name: 'Naval History and Heritage Command, H-Gram 059 (archived)', url: 'https://web.archive.org/web/20251208110839/https://www.history.navy.mil/about-us/leadership/director/directors-corner/h-grams/h-gram-059.html' },
  tp: { name: 'Task & Purpose, 28 August 2026', url: 'https://taskandpurpose.com/news/navy-clears-mines-strait-of-hormuz-centcom/' },
  national: { name: 'The National, 28 August 2026', url: 'https://www.thenationalnews.com/news/us/2026/08/28/hormuz-iran-shipping-lanes-military/' },
  dote: { name: 'DOT&E FY2025 Annual Report, Littoral Combat Ship (archived copy)', url: 'https://web.archive.org/web/2026/https://www.dote.osd.mil/Portals/97/pub/reports/FY2025/navy/2025lcs.pdf' },
};

// Channel geometry. Defaults follow Eyer's description of what reopening Hormuz would take.
export const CHANNEL = {
  lengthNm: { v: 100, min: 20, max: 160, step: 5, src: 'eyer', q: 'The strait\'s traffic separation scheme stretches roughly 100 nautical miles.' },
  routes: { v: 2, min: 1, max: 4, step: 1, src: 'eyer', q: 'supporting both inbound and outbound oil and LNG traffic would require two channels' },
  widthYd: { v: 2000, min: 1000, max: 4000, step: 250, src: 'eyer', q: 'While a standard Q-route is 1,000 yards wide, supporting both inbound and outbound oil and LNG traffic would require two channels, each 2,000 yards wide, covering roughly 200 square miles.' },
};

// Threat: mines and false contacts.
export const THREAT = {
  mines: { v: 40, min: 0, max: 600, step: 10, notional: true, note: 'Default echoes CNN\'s 10 March 2026 report of "a few dozen" mines laid; no source gives a total. Eyer puts Iran\'s inventory at 5,000–6,000 mines, Connell and Walberg at "roughly six thousand".' },
  shareInRoutes: { v: 50, min: 10, max: 100, step: 5, notional: true, note: 'Percent of mines laid inside the routes being cleared.' },
  contactsPerNm2: { v: 2, min: 0, max: 6, step: 0.5, notional: true, note: 'Mine-like objects per square nautical mile (debris, wrecks, rocks) that must each be identified. No open source gives a figure for Hormuz.' },
  remineWeek: { v: 0, min: 0, max: 20, step: 1, notional: true, note: 'Mines laid into the routes each week during clearance. U.S. strikes on Larak Island in August 2026 aimed to stop rocket-laid mines (Al Jazeera, 31 August 2026).' },
};

// Environment, from the Thales paper's example towed-sonar area coverage rates (square nm per hour).
export const ENVS = {
  easy: { label: 'Easy seabed', acr: 0.93 },
  medium: { label: 'Medium', acr: 0.8 },
  complex: { label: 'Complex', acr: 0.4 },
};
export const ENV_NOTE = 'The Thales paper\'s example: "assume a multi-aspect towed sonar Area Coverage Rate is equal to 0.93 square Nautical Miles per hour (NM²/h) on easy environment, 0.8 NM²/h on medium environment and 0.4NM²/h on complex environment." Other assets are scaled by the same ratios (notional).';

// Forces. acr = square nm searched per asset-hour on an easy seabed; the environment scales it.
// Only the USV figure comes from a source; the others are notional ratios to it.
export const FORCES = [
  { k: 'usv', label: 'Uncrewed boats with towed sonar', short: 'USVs', v: 2, max: 24, acr: 0.93, src: 'thales', note: 'Search rate from the Thales example.' },
  { k: 'ship', label: 'Crewed MCM ships or LCS', short: 'Ships', v: 1, max: 12, acr: 0.5, notional: true, note: 'Hull-mounted or variable-depth sonar. Eyer (April 2026) writes that U.S. options in the Gulf were limited to three Independence-variant LCS; two Sasebo-based Avengers left Singapore toward the Gulf in April 2026 (Stars and Stripes).' },
  { k: 'helo', label: 'MCM helicopters', short: 'Helicopters', v: 0, max: 12, acr: 1.5, notional: true, note: 'Towed sweep: fast but does not find every mine type. The U.S. retired its MH-53E detachment in August 2025 (Eyer).' },
  { k: 'eod', label: 'EOD and diver teams', short: 'Teams', v: 4, max: 30, idPerDay: 2, notional: true, note: 'Identify and neutralize contacts; they do not search. Cooper said divers and SEALs led the 2026 clearance (Task & Purpose).' },
];

export const THREAT_LEVELS = {
  permissive: { label: 'Permissive', sub: 'No attacks on MCM forces', hours: 12, lossWeek: 0 },
  harassed: { label: 'Harassed', sub: 'Drones and boats; daylight and escorts only', hours: 8, lossWeek: 0.02 },
  opposed: { label: 'Opposed', sub: 'Missiles and fire on the swept area', hours: 4, lossWeek: 0.08 },
};
export const THREAT_NOTE = 'Hours of productive search and identification work per day, and the weekly loss of MCM assets, are notional. Transit, launch and recovery, sonar data review and re-checks eat much of a day at sea.';

export const CONF = [80, 90, 95, 99];
export const MODEL = {
  pdPass: { v: 0.85, notional: true, note: 'Chance one search pass detects a given mine.' },
  setupDays: { v: 3, notional: true, note: 'Days to arrive and start work.' },
  dangerWidthM: { v: 60, notional: true, note: 'Width of the path in which a mine can hit a transiting ship.' },
  actuate: { v: 0.5, notional: true, note: 'Chance a mine in a ship\'s path fires.' },
  maxDays: 365,
};

// Historical and 2026 benchmarks, all sourced; the day count is arithmetic on sourced dates.
export const BENCH = [
  { k: 'h2026', label: 'Hormuz 2026', from: '2026-04-11', to: '2026-08-27',
    text: 'Two U.S. destroyers entered the strait to start mine clearance on 11 April 2026 (Task & Purpose). Adm. Brad Cooper said the routes were clear in remarks The National dates to 27 August. Cooper did not say how many mines were removed.', src: ['tp', 'national'] },
  { k: 'k1991', label: 'Kuwait 1991', text: 'After the Gulf War, "two dozen vessels from nine nations" cleared five shipping channels into Kuwaiti ports by June 1991 and expected to have swept "about 1,000 square miles" by the end of July; about 1,100 mines had been destroyed (New York Times, 25 June 1991). NHHC counts over 1,200 Iraqi mines.', src: ['nyt91', 'hgram59'] },
];

export const PRESETS = [
  { k: 'default', label: 'Two routes, light mining', sub: 'Defaults', set: {} },
  { k: 'heavy', label: 'Heavy mining', sub: '300 mines, more clutter', set: { mines: 300, contactsPerNm2: 4, share: 60 } },
  { k: 'opposed', label: 'Opposed clearance', sub: 'Under fire, re-mining', set: { threat: 'opposed', remineWeek: 4 } },
  { k: 'bigforce', label: 'Coalition surge', sub: 'More ships, boats, helicopters, divers', set: { usv: 8, ship: 4, helo: 4, eod: 16 } },
];
