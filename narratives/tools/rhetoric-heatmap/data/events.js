// Large PLA exercises and surges around Taiwan, July 2022 to September 2026 (TSM's verified list
// holds no large exercise after Justice Mission-2025, and none is marked before July 2022).
// Source: TSM "Exercises as Theater" verified event list (TSM local, exercise_events.json);
// each linked source below was opened and checked on 2026-09-28; re-checked 2026-09-30 (see FACTCHECK.md).
// Sep 2023: the carrier drills are in the Maritime Executive piece; the 17 Sep air surge is in Taiwan MND's
// 17 Sep release and TSM's daily series (103 aircraft in the 17-18 Sep window). Dec 2024: GTI dates the
// deployment 9-12 Dec; 9-11 here are MND reporting windows, the last ending 06:00 on 12 Dec.
// Joint combat readiness patrol days come from shared/data/tsm.js (flag "J") at runtime.
export const EVENTS = [
  { start: '2022-08-04', end: '2022-08-07', name: 'Encirclement drills after Pelosi visit', short: 'Aug 2022',
    src: [['CSIS ChinaPower', 'https://chinapower.csis.org/tracking-the-fourth-taiwan-strait-crisis/']] },
  { start: '2022-12-25', end: '2022-12-26', name: 'Joint readiness patrol and strike drills', short: 'Dec 2022',
    src: [['Radio Free Asia', 'https://www.rfa.org/english/news/china/china-taiwan-warplanes-12252022234253.html']] },
  { start: '2023-04-08', end: '2023-04-10', name: 'Joint Sword', short: 'Joint Sword',
    src: [['CSIS ChinaPower', 'https://chinapower.csis.org/tracking-chinas-april-2023-military-exercises-around-taiwan/']] },
  { start: '2023-08-19', end: '2023-08-19', name: 'Joint sea-air patrol after Lai U.S. stopover', short: 'Aug 2023',
    src: [['China Military Online', 'http://eng.chinamil.com.cn/CHINA_209163/TopStories_209189/16246270.html'],
          ['Al Jazeera', 'https://www.aljazeera.com/amp/news/2023/8/19/china-launches-military-drills-in-stern-warning-to-taiwan-after-us-visit']] },
  { start: '2023-09-11', end: '2023-09-18', name: 'Unannounced surge and Shandong carrier drills', short: 'Sep 2023',
    src: [['Maritime Executive', 'https://maritime-executive.com/article/china-s-pla-navy-conducts-largest-ever-carrier-drill-in-the-pacific'],
          ['Taiwan Ministry of National Defense', 'https://www.mnd.gov.tw/en/News/PressRelease/82187']] },
  { start: '2024-05-23', end: '2024-05-24', name: 'Joint Sword-2024A', short: 'JS-2024A',
    src: [['CSIS ChinaPower', 'https://chinapower.csis.org/china-respond-inauguration-taiwan-william-lai-joint-sword-2024a-military-exercise/']] },
  { start: '2024-10-14', end: '2024-10-14', name: 'Joint Sword-2024B', short: 'JS-2024B',
    src: [['PRC Ministry of National Defense', 'http://eng.mod.gov.cn/xb/News_213114/TopStories/16345116.html'],
          ['Xinhua', 'https://english.news.cn/20241014/091d9b4df25346cca0c5dc657a5a067e/c.html']] },
  { start: '2024-12-09', end: '2024-12-11', name: 'Unannounced naval and air deployment', short: 'Dec 2024',
    src: [['Global Taiwan Institute', 'https://globaltaiwan.org/2025/01/the-prc-sends-a-message-to-the-international-community/']] },
  { start: '2025-02-26', end: '2025-02-26', name: 'Live-fire zone off Kaohsiung', short: 'Feb 2025',
    src: [['Radio Free Asia', 'https://www.rfa.org/english/southchinasea/2025/02/26/china-navy-taiwan-live-fire-exercise-kaohsiung/']] },
  { start: '2025-04-01', end: '2025-04-02', name: 'Joint drills and Strait Thunder-2025A', short: 'Strait Thunder',
    src: [['Global Taiwan Institute', 'https://globaltaiwan.org/2025/04/the-plas-strait-thunder-exercise/'],
          ['Jamestown Foundation', 'https://jamestown.org/strait-thunder-2025a-drill-implies-future-increase-in-pla-pressure-on-taiwan/']] },
  { start: '2025-12-29', end: '2025-12-30', name: 'Justice Mission-2025', short: 'Justice Mission',
    src: [['Global Taiwan Institute', 'https://globaltaiwan.org/2026/01/pla-justice-mission-2025/'],
          ['Jamestown Foundation', 'https://jamestown.org/pla-justice-mission-2025-further-rehearses-taiwan-invasion-operations/'],
          ['PRC Ministry of National Defense (Chinese)', 'http://www.mod.gov.cn/gfbw/xwfyr/fyrthhdjzw/16429836.html']] },
];

// Points where the collection changed. Counts or wording on either side are not directly comparable.
// LECTERN v2 (2026-11-06): one collection for all three agencies, 2015-01 to 2026-11. MFA is official
// English throughout and TAO machine translation throughout; MND's English source changes twice.
export const SEAMS = [
  { date: '2021-10-01', src: 'MND', text: 'MND: from October 2021 to March 2025 most items are machine translations of the Chinese transcript (official English not held), so theme matches can shift with wording' },
  { date: '2025-04-01', src: 'MND', text: 'MND: from April 2025 most items carry the official English transcript again' },
];
