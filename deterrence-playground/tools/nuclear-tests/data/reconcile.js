// Published test counts, source by source, for the "Whose count?" table. Opened 2026-09-29.
// Order of the country columns: U.S., USSR/Russia, UK, France, China, India, Pakistan, North Korea. null = not covered.
export const COUNTS = [
  { id: 'aca', src: 'Arms Control Association, Nuclear Testing Tally', note: 'Last reviewed Oct. 2025. Excludes Hiroshima and Nagasaki; TTBT counting rule.',
    url: 'https://www.armscontrol.org/factsheets/nucleartesttally', total: 2056, by: [1030, 715, 45, 210, 45, 3, 2, 6] },
  { id: 'sipri', src: 'SIPRI/FOA, Nuclear Explosions 1945–1998, summary table', note: 'July 2000. Includes the two combat uses in the U.S. figure; ends 1998.',
    url: 'https://github.com/data-is-plural/nuclear-explosions/raw/master/documents/sipri-report-original.pdf', total: 2052, by: [1032, 715, 45, 210, 45, 3, 2, null] },
  { id: 'list', src: 'SIPRI/FOA itemized list (machine-readable copy)', note: 'Rows, not a published total. One Soviet 1972 test in the summary table has no row.',
    url: 'https://raw.githubusercontent.com/rfordatascience/tidytuesday/master/data/2019/2019-08-20/nuclear_explosions.csv', total: 2051, by: [1032, 714, 45, 210, 45, 3, 2, null] },
  { id: 'ctbto', src: 'CTBTO, World Overview (archived Aug. 2022)', note: '"Nearly 2,050" explosions 1945–1996. U.S. includes combat uses; India listed as two 1998 tests plus one 1974 peaceful explosion.',
    url: 'https://web.archive.org/web/20220810223536/https://www.ctbto.org/nuclear-testing/history-of-nuclear-testing/world-overview/', total: null, by: [1032, 715, 45, 210, 45, 3, 2, 6] },
  { id: 'doe', src: 'DOE/NNSA, United States Nuclear Tests (DOE/NV-209 Rev. 16)', note: 'Sept. 2015. 1,026 U.S. tests plus 28 joint U.S.–UK tests = 1,054 tests, 1,149 detonations.',
    url: 'https://www.osti.gov/servlets/purl/1351809', total: null, by: [1054, null, null, null, null, null, null, null] },
  { id: 'owid', src: 'Our World in Data, Number of nuclear weapons tests', note: 'Updated May 13, 2026; data from the ACA tally, so its sums match ACA.',
    url: 'https://ourworldindata.org/grapher/number-of-nuclear-weapons-tests', total: 2056, by: [1030, 715, 45, 210, 45, 3, 2, 6] },
];

export const NOTES = [
  'U.S. 1,030 or 1,054? DOE counts 28 joint U.S.–UK tests as U.S. tests: 24 underground at the Nevada Test Site and 4 storage-transportation safety shots on the Nevada range. ACA, following an earlier DOE edition, gives the 24 Nevada joint tests to the UK. 1,054 − 24 = 1,030. This tool follows ACA and SIPRI: the UK\'s 45 tests include the 24 at Nevada.',
  'U.S. 1,032? SIPRI and the CTBTO page add the Hiroshima and Nagasaki bombs. DOE says its totals "do not include two combat uses". This tool leaves them out.',
  'Soviet 715 or 969? 715 counts tests; Russian official figures cited by Johnston\'s Archive count 969 devices. Under the Threshold Test Ban Treaty rule, a salvo of explosions within a 2 km circle and 0.1 second is one test. DOE likewise counts 1,149 U.S. detonations in its 1,054 tests.',
  'Soviet 714 or 715? SIPRI\'s summary table lists 24 Soviet underground tests in 1972 and 456 at Semipalatinsk; its itemized list, which this tool uses, has 23 and 455. The tool adds one un-itemized 1972 Semipalatinsk test with no date or yield, so the Soviet total matches the report and ACA.',
  'India 3: one peaceful explosion in 1974, and the May 11 and May 13, 1998 salvos counted as one test each. Pakistan 2: the five explosions of May 28, 1998 count as one test, plus May 30.',
  'Johnston\'s Archive counts individual explosions: 2,402 for 1945–2009, including the two combat uses and the unconfirmed 1979 South Atlantic event. Its totals are larger by design.',
];
