// Breakout estimates, quoted from named sources. "Breakout" here means the time to produce enough
// weapon-grade uranium (WGU) for one weapon; it is not the time to build a weapon. This tool does not
// compute breakout. Each page was opened on 29 September 2026 and contains the quoted words.
export const BREAKOUT = [
  { date: '2016-01-16', who: 'Obama White House', short: '2–3 months before the deal; 12 months or more under it',
    quote: 'Before this agreement, Iran\'s breakout time -- or the time it would have taken for Iran to gather enough fissile material to build a weapon -- was only two to three months. Today, because of the Iran deal, it would take Iran 12 months or more.',
    src: { name: 'White House, "The Historic Deal that Will Prevent Iran from Acquiring a Nuclear Weapon" (archived site, after Implementation Day)', url: 'https://obamawhitehouse.archives.gov/node/328996/' } },
  { date: '2022-06-01', who: 'Institute for Science and International Security', short: 'Breakout timeline "at zero"',
    quote: 'Iran has crossed a new, dangerous threshold; Iran\'s breakout timeline is now at zero. It has enough 60 percent enriched uranium or highly enriched uranium (HEU) to be assured it could fashion a nuclear explosive.',
    src: { name: 'Albright and Burkhard, "Iranian Breakout Timeline Now at Zero," 1 June 2022', url: 'https://isis-online.org/isis-reports/iranian-breakout-timeline-now-at-zero' } },
  { date: '2024-07-19', who: 'Secretary of State Antony Blinken', short: '"probably one or two weeks"',
    quote: 'Iran\'s breakout time – the amount of time needed to produce enough weapons grade material for a nuclear weapon – "is now probably one or two weeks"',
    src: { name: 'CNN, 19 July 2024 (Aspen Security Forum remarks)', url: 'https://www.cnn.com/2024/07/19/politics/blinken-nuclear-weapon-breakout-time/index.html' } },
  { date: '2025-06-09', who: 'Institute for Science and International Security', short: 'First weapon\'s worth in 2–3 days at Fordow',
    quote: 'Iran can convert its current stock of 60 percent enriched uranium into 233 kg of WGU in three weeks at the Fordow Fuel Enrichment Plant (FFEP), enough for 9 nuclear weapons, taken as 25 kg of weapon-grade uranium (WGU) per weapon. Iran could produce its first quantity of 25 kg of WGU in Fordow in as little as two to three days.',
    src: { name: 'Albright, Burkhard and Faragasso, analysis of the May 2025 IAEA report, 9 June 2025', url: 'https://isis-online.org/isis-reports/analysis-of-iaea-iran-verification-and-monitoring-report-may-2025' } },
  { date: '2026-06-09', who: 'Institute for Science and International Security', short: 'No estimate: no identifiable route to WGU',
    quote: 'With the massive destruction of its gas centrifuge program and installed centrifuge cascades, for the first time in 20 years, Iran has no identifiable route to produce weapon-grade uranium (WGU) in its centrifuge enrichment plants. [...] no breakout estimate to WGU is included in the Institute\'s analysis of the IAEA report, since to do so would require unsubstantiated speculation',
    src: { name: 'Institute analysis of the June 2026 IAEA reports, 9 June 2026', url: 'https://isis-online.org/isis-reports/analysis-of-iaea-iran-verification-and-monitoring-and-npt-safeguards-reports-june-2026' } },
];

// The one yardstick used for labelled arithmetic in the panel.
export const YARDSTICK = {
  kg: 40,
  quote: 'Practically, 40 kg are sufficient for an implosion-type nuclear weapon and double that amount, or 80 kg, is sufficient for a gun-type nuclear explosive device.',
  context: 'of 60 percent enriched uranium, which "can also be used directly in a nuclear explosive"; the same analysis says the strikes severely degraded Iran\'s ability to make a weapon',
  src: { name: 'Institute for Science and International Security, June 2026', url: 'https://isis-online.org/isis-reports/analysis-of-iaea-iran-verification-and-monitoring-and-npt-safeguards-reports-june-2026' },
};

// IAEA timeliness goal for verifying HEU, used for the "clock" readout.
export const TIMELINESS = {
  days: 30,
  quote: 'the Agency\'s timeliness goal for the detection of the diversion of one significant quantity (SQ) of HEU is one month',
  src: { name: 'IAEA, GOV/2025/65, para. 6', url: 'https://www.iaea.org/sites/default/files/gov2025-65.pdf' },
};
export const LAST_ESTIMATE = '2025-06-13';
export const AS_OF = '2026-10-02';
