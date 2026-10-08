// Layers of Space: anti-satellite tests and notable counterspace events.
//
// Sources (opened and checked 2026-10-08):
//   - Secure World Foundation (SWF), "Global Counterspace Capabilities", April 2026 edition (events through
//     February 2026): https://www.swfound.org/publications-and-reports/2026-global-counterspace-capabilities-report
//     Table 5-1 (p. 05-01) gives tracked debris and debris still on orbit for all 16 debris-generating tests.
//     SWF counts tracked debris (generally larger than 10 cm) from the public US satellite catalog.
//     Appendix I tables 16-1 to 16-4 (pp. 16-02 to 16-04) list known and suspected tests by country.
//   - CSIS Aerospace Security Project, "Space Threat Assessment 2025".
//   - US Space Command press release on the Nov. 15, 2021 Russian test (Wayback copy; the live .mil page
//     blocks automated requests).
// Fields: date (ISO; 'YYYY-MM' where only the month is known), alt_km (intercept altitude, null if not
// published or co-orbital), debris_tracked, debris_still_on_orbit, asof (date of the remainder count),
// destructive (true if the event created tracked debris), note (source disagreements).
// Where SWF tables disagree with each other, we use Table 5-1 or the chapter table and say so in `note`.

const SWF_URL = 'https://www.swfound.org/publications-and-reports/2026-global-counterspace-capabilities-report';
const CSIS_URL = 'https://aerospace.csis.org/wp-content/uploads/2025/10/250425_Swope_Space_Threat.pdf';
const swf = (pp, topic) => ({ t: `SWF, Global Counterspace Capabilities (April 2026), pp. ${pp}${topic ? ': ' + topic : ''}`, u: SWF_URL });
const csis = (p, topic) => ({ t: `CSIS, Space Threat Assessment 2025, p. ${p}${topic ? ': ' + topic : ''}`, u: CSIS_URL });
const T51 = swf('05-01', 'Table 5-1, orbital debris created by ASAT tests in space');
const ASOF = '2026-02';

export const TESTS = [
  // ------------------------------------------------ Debris-generating (destructive) tests, SWF Table 5-1
  {
    date: '1968-10-20', country: 'ru', name: 'IS intercept of Cosmos 248', type: 'co-orbital', destructive: true,
    interceptor: 'Cosmos 249, Cosmos 252 (IS)', target: 'Cosmos 248', alt_km: null,
    debris_tracked: 252, debris_still_on_orbit: 71, asof: ASOF,
    summary: 'The first Soviet co-orbital interceptor to destroy a target. Two intercepts were made and debris was created.',
    sources: [T51, swf('16-03', 'Table 16-2')],
  },
  {
    date: '1970-10-23', country: 'ru', name: 'IS intercept of Cosmos 373', type: 'co-orbital', destructive: true,
    interceptor: 'Cosmos 374, Cosmos 375 (IS)', target: 'Cosmos 373', alt_km: null,
    debris_tracked: 147, debris_still_on_orbit: 33, asof: ASOF,
    summary: 'Two successful co-orbital intercepts of the same Soviet target satellite.',
    sources: [T51, swf('16-03', 'Table 16-2')],
  },
  {
    date: '1971-02-25', country: 'ru', name: 'IS intercept of Cosmos 394', type: 'co-orbital', destructive: true,
    interceptor: 'Cosmos 397 (IS)', target: 'Cosmos 394', alt_km: null,
    debris_tracked: 117, debris_still_on_orbit: 43, asof: ASOF,
    summary: 'A Soviet co-orbital intercept that created debris.',
    sources: [T51, swf('16-03', 'Table 16-2')],
  },
  {
    date: '1971-12-03', country: 'ru', name: 'IS intercept of Cosmos 459', type: 'co-orbital', destructive: true,
    interceptor: 'Cosmos 462 (IS)', target: 'Cosmos 459', alt_km: null,
    debris_tracked: 28, debris_still_on_orbit: 0, asof: ASOF,
    summary: 'A successful Soviet co-orbital intercept. All tracked debris decayed within about three years.',
    sources: [T51, swf('16-03', 'Table 16-2')],
  },
  {
    date: '1976-12-17', country: 'ru', name: 'IS intercept of Cosmos 880', type: 'co-orbital', destructive: true,
    interceptor: 'Cosmos 886 (IS)', target: 'Cosmos 880', alt_km: null,
    debris_tracked: 127, debris_still_on_orbit: 54, asof: ASOF,
    summary: 'A successful Soviet co-orbital intercept that created debris.',
    sources: [T51, swf('16-03', 'Table 16-2')],
  },
  {
    date: '1977-12-21', country: 'ru', name: 'IS intercept of Cosmos 967', type: 'co-orbital', destructive: true,
    interceptor: 'Cosmos 970 (IS)', target: 'Cosmos 967', alt_km: null,
    debris_tracked: 121, debris_still_on_orbit: 115, asof: ASOF,
    summary: 'A successful Soviet co-orbital intercept. Almost all of its tracked debris is still in orbit.',
    sources: [T51, swf('16-03', 'Table 16-2')],
  },
  {
    date: '1980-04-18', country: 'ru', name: 'IS-M test against Cosmos 1171', type: 'co-orbital', destructive: true,
    interceptor: 'Cosmos 1174 (IS-M)', target: 'Cosmos 1171', alt_km: null,
    debris_tracked: 47, debris_still_on_orbit: 4, asof: ASOF,
    summary: 'The intercept failed, but the interceptor still created debris.',
    sources: [T51, swf('16-03', 'Table 16-2')],
  },
  {
    date: '1982-06-18', country: 'ru', name: 'IS-M intercept of Cosmos 1375', type: 'co-orbital', destructive: true,
    interceptor: 'Cosmos 1379 (IS-M)', target: 'Cosmos 1375', alt_km: null,
    debris_tracked: 62, debris_still_on_orbit: 59, asof: ASOF,
    summary: 'The last debris-generating test of the Soviet IS program.',
    sources: [T51, swf('16-03', 'Table 16-2')],
  },
  {
    date: '1985-09-13', country: 'us', name: 'ASM-135 intercept of Solwind', type: 'da-asat', destructive: true,
    interceptor: 'ASM-135 (fired from an F-15)', target: 'Solwind P78-1', alt_km: 530,
    debris_tracked: 285, debris_still_on_orbit: 0, asof: ASOF,
    summary: 'An air-launched US missile destroyed a US satellite. All tracked debris has decayed.',
    sources: [T51, swf('16-02', 'Table 16-1')],
  },
  {
    date: '1986-09-05', country: 'us', name: 'Delta 180 collision test', type: 'co-orbital', destructive: true,
    interceptor: 'Delta 180 PAS', target: 'Delta 2 rocket body', alt_km: null,
    debris_tracked: 18, debris_still_on_orbit: 0, asof: ASOF,
    summary: 'A US experiment that deliberately collided a payload with a Delta 2 rocket body. Debris decayed in under a year.',
    sources: [T51, swf('16-02', 'Table 16-1')],
  },
  {
    date: '1994-12-26', country: 'ru', name: 'Naryad-V test', type: 'co-orbital', destructive: true,
    interceptor: 'Naryad-V', target: 'Unknown', alt_km: null,
    debris_tracked: 26, debris_still_on_orbit: 22, asof: ASOF,
    summary: 'A suspected Russian co-orbital interceptor flight. SWF lists it as a potential intercept that created debris.',
    sources: [T51, swf('16-03', 'Table 16-2')],
  },
  {
    date: '2007-01-11', country: 'cn', name: 'Fengyun-1C intercept', type: 'da-asat', destructive: true,
    interceptor: 'SC-19', target: 'FY-1C weather satellite', alt_km: 865,
    debris_tracked: 3532, debris_still_on_orbit: 2351, asof: ASOF,
    note: 'SWF chapter 3 gives 865 km; SWF Table 5-1 gives 880 km.',
    summary: 'China destroyed an old weather satellite with a ground-launched missile. It created more tracked debris than any other test, and most of it is still in orbit.',
    sources: [T51, swf('03-18', 'SC-19 test')],
  },
  {
    date: '2008-02-20', country: 'us', name: 'Operation Burnt Frost (USA-193)', type: 'interceptor-msl', destructive: true,
    interceptor: 'SM-3 Block IA from USS Lake Erie', target: 'USA-193', alt_km: 240,
    debris_tracked: 175, debris_still_on_orbit: 0, asof: ASOF,
    note: 'SWF chapter 1 gives 240 km; SWF Table 5-1 gives 220 km.',
    summary: 'A US Navy interceptor destroyed a failing US reconnaissance satellite at low altitude. The debris took about 20 months to fall out of orbit.',
    sources: [T51, swf('01-24', 'Burnt Frost')],
  },
  {
    date: '2019-03-27', country: 'in', name: 'Mission Shakti', type: 'da-asat', destructive: true,
    interceptor: 'PDV Mk-II', target: 'Microsat-R', alt_km: 300,
    debris_tracked: 130, debris_still_on_orbit: 0, asof: ASOF,
    summary: 'India destroyed one of its own satellites with a missile defense interceptor. All tracked debris has decayed.',
    sources: [T51, swf('04-03 to 04-04', 'Mission Shakti; Table 4-1')],
  },
  {
    date: '2019-08', country: 'ru', name: 'Cosmos 2535 / Cosmos 2536 event', type: 'co-orbital', destructive: true,
    interceptor: 'Cosmos 2535 (SWF Table 5-1)', target: 'Cosmos 2536 (SWF Table 5-1)', alt_km: null,
    debris_tracked: 30, debris_still_on_orbit: 16, asof: ASOF,
    note: 'SWF Table 5-1 dates this August to December 2019 with Cosmos 2535 as interceptor. SWF Table 16-2 lists it as "September 2019?" with the roles reversed and calls it a possible ASAT test or collision.',
    summary: 'Two Russian satellites made at least 25 close approaches in 2019, and the event produced tracked debris. SWF counts it as a destructive test while noting it may have been a collision.',
    sources: [T51, swf('02-15', 'Table 2-3'), swf('16-03', 'Table 16-2')],
  },
  {
    date: '2021-11-15', country: 'ru', name: 'Nudol intercept of Cosmos 1408', type: 'da-asat', destructive: true,
    interceptor: 'Nudol', target: 'Cosmos 1408 (1,750 kg defunct Tselina-D satellite)', alt_km: 470,
    debris_tracked: 1807, debris_still_on_orbit: 5, asof: ASOF,
    note: 'US Space Command counted more than 1,500 trackable pieces on the day of the test.',
    summary: 'Russia destroyed a defunct Soviet satellite with a ground-launched missile.',
    sources: [
      T51,
      swf('02-21', 'Nudol test'),
      { t: 'US Space Command, "Russian direct-ascent anti-satellite missile test creates significant, long-lasting space debris," Nov. 15, 2021 (Wayback copy)', u: 'https://web.archive.org/web/20260926165944/https://www.spacecom.mil/Newsroom/News/Article-Display/Article/2842957/russian-direct-ascent-anti-satellite-missile-test-creates-significant-long-last/' },
    ],
  },

  // ------------------------------------------------ Notable non-destructive tests and events
  {
    date: '1959-10-13', country: 'us', name: 'Bold Orion pass of Explorer VI', type: 'da-asat', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'A US missile passed within its kill radius of a satellite. It was one of the first anti-satellite tests.',
    sources: [swf('16-02', 'Table 16-1')],
  },
  {
    date: '1963-05-24', country: 'us', name: 'Program 505 (Nike Zeus) close intercept of Agena D', type: 'nuclear-asat', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'A US Army missile designed to carry a nuclear warhead made a close intercept of an orbiting rocket stage.',
    sources: [swf('16-02', 'Table 16-1')],
  },
  {
    date: '1964-02-14', country: 'us', name: 'Program 437 (Thor) pass of Transit 2A rocket body', type: 'nuclear-asat', destructive: false,
    alt_km: 1000, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'The first Program 437 test passed within the kill radius of its target. The operational weapon would have used a nuclear warhead.',
    sources: [swf('01-23', 'Table 1-4'), swf('16-02', 'Table 16-1')],
  },
  {
    date: '1967-10-27', country: 'ru', name: 'First IS interceptor launch', type: 'co-orbital', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'The first launch of the Soviet IS kill vehicle, a year before its first intercept.',
    sources: [swf('16-03', 'Table 16-2')],
  },
  {
    date: '1997-10', country: 'us', name: 'MIRACL laser test against MSTI-3', type: 'dew-laser', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'The US fired a high-power chemical laser at a retired US Air Force satellite. Results were not made public.',
    sources: [swf('01-35', 'MIRACL')],
  },
  {
    date: '2010-01-11', country: 'cn', name: 'SC-19 intercept of a ballistic missile target', type: 'da-asat', destructive: false,
    alt_km: 250, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'China destroyed a suborbital missile target launched from Jiuquan. Because the target was suborbital, no lasting debris was created.',
    sources: [swf('03-22', 'Table 3-3')],
  },
  {
    date: '2013-01-27', country: 'cn', name: 'Possible SC-19 intercept test', type: 'da-asat', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'A launch from Korla destroyed a suborbital ballistic missile target.',
    sources: [swf('03-22', 'Table 3-3')],
  },
  {
    date: '2013-05-13', country: 'cn', name: 'High-altitude launch from Xichang (DN-2)', type: 'da-asat', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    note: 'China said the rocket reached 10,000 km. A US military official said it went "nearly to GEO."',
    summary: 'China called it a science rocket. US officials and SWF judge it a test of a missile able to reach high orbits. No objects remained in space.',
    sources: [swf('03-19 to 03-20', 'May 2013 launch')],
  },
  {
    date: '2014-07-23', country: 'cn', name: 'Suborbital test the US called an ASAT test', type: 'da-asat', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    note: 'SWF Table 3-3 labels the system a possible DN-2. A US-China Commission report called it SC-19/DN-1.',
    summary: 'China described it as a missile defense test. A US State Department official said the United States had "high confidence" it was an anti-satellite test.',
    sources: [swf('03-21 to 03-22', 'Table 3-3')],
  },
  {
    date: '2018-02-05', country: 'cn', name: 'Land-based midcourse intercept test (possible DN-3)', type: 'interceptor-msl', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'Chinese state media announced a midcourse missile intercept test. Anonymous US officials linked it to the DN-3.',
    sources: [swf('03-21 to 03-22', 'Table 3-3')],
  },
  {
    date: '2021-02-04', country: 'cn', name: 'Land-based midcourse intercept test (possible DN-3)', type: 'interceptor-msl', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'One of several announced Chinese midcourse intercept tests with descriptions similar to earlier DN-series tests.',
    sources: [swf('03-21 to 03-22', 'Table 3-3')],
  },
  {
    date: '2022-06', country: 'cn', name: 'Land-based midcourse intercept test (possible DN-3)', type: 'interceptor-msl', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    note: 'SWF Table 3-3 gives June 19, 2022; SWF Table 16-3 gives June 21, 2022.',
    summary: 'An announced Chinese midcourse intercept test against a suborbital target.',
    sources: [swf('03-22', 'Table 3-3'), swf('16-04', 'Table 16-3')],
  },
  {
    date: '2023-04-14', country: 'cn', name: 'Land-based midcourse intercept test (possible DN-3)', type: 'interceptor-msl', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'The most recent announced Chinese midcourse intercept test listed by SWF.',
    sources: [swf('03-22', 'Table 3-3')],
  },
  {
    date: '2019-02-12', country: 'in', name: 'First PDV Mk-II attempt', type: 'da-asat', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'An unsuccessful Indian intercept attempt against Microsat-R, six weeks before Mission Shakti.',
    sources: [swf('16-04', 'Table 16-4')],
  },
  {
    date: '2015-11-18', country: 'ru', name: 'First successful Nudol flight', type: 'da-asat', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    note: 'SWF Table 2-4 gives Nov. 18, 2015; SWF Table 16-2 gives Oct. 18, 2015.',
    summary: 'The first successful flight test of the Nudol missile, from Plesetsk, after two failures.',
    sources: [swf('02-21', 'Table 2-4'), swf('16-03', 'Table 16-2')],
  },
  {
    date: '2018-03-26', country: 'ru', name: 'First Nudol launch from a mobile launcher', type: 'da-asat', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'Russia flew the Nudol from a road-mobile launcher for the first time.',
    sources: [swf('02-21', 'Table 2-4')],
  },
  {
    date: '2020-04-15', country: 'ru', name: 'Nudol flight test', type: 'da-asat', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    note: 'SWF Table 2-4 says nothing was hit. SWF Table 16-2 says "potential intercept, debris created."',
    summary: 'A Nudol flight test from Plesetsk. SWF tables disagree on whether anything was hit.',
    sources: [swf('02-21', 'Table 2-4'), swf('16-03', 'Table 16-2')],
  },
  {
    date: '2017-10-30', country: 'ru', name: 'Cosmos 2521 high-speed sub-satellite release', type: 'rpo', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'A Russian inspector satellite released a small object at relatively high speed, a sign SWF reads as possible weapons testing.',
    sources: [swf('16-03', 'Table 16-2'), swf('02-15', 'Table 2-3')],
  },
  {
    date: '2019-12', country: 'ru', name: 'Cosmos 2542 and 2543 shadow USA 245', type: 'rpo', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'Cosmos 2542 released Cosmos 2543, then raised its orbit to make repeated close approaches to a US government satellite, USA 245, through March 2020.',
    sources: [swf('02-15', 'Table 2-3')],
  },
  {
    date: '2020-07-15', country: 'ru', name: 'High-speed object release in orbit', type: 'rpo', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    note: 'SWF Table 2-3 credits Cosmos 2543 with releasing a small object at high relative velocity between June and October 2020. SWF Table 16-2 lists a July 15, 2020 release by Cosmos 2536.',
    summary: 'A Russian satellite released a small object at high speed near another Russian satellite, the second such release SWF cites as evidence of weapons work.',
    sources: [swf('02-15', 'Table 2-3'), swf('16-03', 'Table 16-2')],
  },
  {
    date: '2022-08', country: 'ru', name: 'Cosmos 2558 shadows USA 326', type: 'rpo', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    note: 'CSIS gives an August 2022 launch. SWF Table 2-3 dates the shadowing from February 2022 and notes Cosmos 2558 released an object (Object C) in June 2025 that approached USA 326.',
    summary: 'A satellite the US Space Force calls a counterspace weapon was placed in the same orbital plane as a US government satellite and has stayed there.',
    sources: [csis(10, 'Cosmos 2558'), swf('02-15', 'Table 2-3')],
  },
  {
    date: '2024-05-16', country: 'ru', name: 'Cosmos 2576 launched near USA 314', type: 'rpo', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'The US told the UN Security Council that Cosmos 2576 is likely a counterspace weapon. It entered the orbital plane of US satellite USA 314 and began raising its orbit in February 2025. Russia called the charge fake news.',
    sources: [csis(10, 'Cosmos 2576'), swf('02-16', 'Cosmos 2576')],
  },
  {
    date: '2025-05', country: 'ru', name: 'Cosmos 2588 placed near USA 338', type: 'rpo', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'A Russian satellite was launched into an orbit very close to that of a US reconnaissance satellite. Analysts suspect it is a Nivelir inspector.',
    sources: [swf('02-16 to 02-17', 'Cosmos 2588')],
  },
  {
    date: '2022-01', country: 'cn', name: 'Shijian-21 tows Compass G2', type: 'rpo', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'A Chinese satellite docked with the Compass G2 navigation satellite and pulled it well past the graveyard orbit above the geostationary belt.',
    sources: [swf('03-15', 'Table 3-2')],
  },
  {
    date: '2024-04', country: 'cn', name: 'Shiyan-24C and Shijian-6 05 close maneuvers', type: 'rpo', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'Five Chinese satellites made coordinated close approaches in low orbit, at times under 1 km apart. A senior US Space Force official later called this "dogfighting."',
    sources: [csis(8, 'SY-24C and SJ-6 05 RPO'), swf('03-16', 'Table 3-2')],
  },
  {
    date: '2025-07', country: 'cn', name: 'Shijian-21 and Shijian-25 docking', type: 'rpo', destructive: false,
    alt_km: null, debris_tracked: 0, debris_still_on_orbit: 0,
    summary: 'Two Chinese satellites appear to have docked in geostationary orbit and stayed joined until November 2025. SWF discusses this as a possible refueling exercise.',
    sources: [swf('03-16', 'Table 3-2')],
  },
];
