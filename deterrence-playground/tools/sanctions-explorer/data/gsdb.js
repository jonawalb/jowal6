// What the Global Sanctions Data Base (GSDB) authors publish about objectives and success.
// No GSDB case data is used: the GSDB is sent by e-mail on request, and its site asks users
// "Please do not pass the data on to others" (https://www.globalsanctionsdatabase.com/data, read 2026-09-29).
// Quotes are copied exactly from the working-paper versions listed in SOURCES (opened 2026-09-29).

export const GSDB_SOURCES = {
  v1: { cite: 'Felbermayr, Kirilakha, Syropoulos, Yalcin & Yotov, "The Global Sanctions Data Base", Drexel School of Economics Working Paper 2020-02; published in European Economic Review 129 (2020) 103561',
    url: 'https://EconPapers.repec.org/RePEc:ris:drxlwp:2020_002', doi: 'https://doi.org/10.1016/j.euroecorev.2020.103561',
    copy: 'https://drive.google.com/file/d/11djwEIr96SFt6YpMzo9gaB6ZJrOer8AX/view', cover: '1950 to 2016, 729 cases' },
  v2: { cite: 'Kirilakha, Felbermayr, Syropoulos, Yalcin & Yotov, "The Global Sanctions Data Base: An Update that Includes the Years of the Trump Presidency", Drexel Economics Working Paper 2021-10',
    url: 'https://ideas.repec.org/p/ris/drxlwp/2021_010.html', doi: 'https://doi.org/10.4337/9781839102721.00010',
    copy: 'https://drive.google.com/file/d/1ERc5uNcTumu8gyjOhzDtRNIWgkpk03T8/view', cover: '1950 to 2019, 1,101 cases' },
  r4: { cite: 'Yalcin, Felbermayr, Kariem, Kirilakha, Kwon, Syropoulos & Yotov, "The Global Sanctions Data Base – Release 4: The Heterogeneous Effects of the Sanctions on Russia", WIFO Working Paper 681/2024; published in The World Economy (2025)',
    url: 'https://www.econstor.eu/bitstream/10419/301174/1/1894532740.pdf', doi: 'https://doi.org/10.1111/twec.13732', cover: '1950 to 2023, 1,547 cases' },
  site: { cite: 'GSDB website, data page (lists Release 5: 1,794 cases, 1949 to 2025)', url: 'https://www.globalsanctionsdatabase.com/data' },
};

// How the GSDB codes objectives and success (Release 4, section 2.1).
export const GSDB_CODING = {
  objectives: ['Policy change', 'Destabilize regime', 'Territorial conflict', 'Prevent war', 'End war', 'Terrorism', 'Human rights', 'Democracy', 'Other'],
  success: ['Total success', 'Partial success', 'Negotiation settlement', 'Failure', 'Ongoing'],
  quote: 'the GSDB defines nine political objectives (policy change, regime destabilization, ending territorial conflict, war prevention, ending war, terrorism, human rights violation, restoration of democracy, and other objectives that do not fit into any of the aforementioned categories) and five objective-specific success score categories (total success, partial success, negotiation settlement, failure, and ongoing for cases that have not been repealed) for each sanction objective.',
  quoteSrc: 'r4',
  threats: 'The GSDB excludes sanction threats.',
  basis: 'The GSDB relies on official government statements or indirect confirmations in international press announcements to document whether sanction objectives have been achieved once a sanction was imposed.',
  basisSrc: 'v1',
};

// Published aggregate success figures. `pct` is the figure as the authors state it.
export const GSDB_FIGURES = [
  { src: 'v1', pct: 34, label: 'Average success rate across policy objectives, 1950 to 2016',
    quote: 'Overall, the average success rate of around 34% across different policy objectives is very much in line with the effectiveness rate of 34% that is reported in the analysis of Hufbauer et al. (2007) and falls in the middle of the success rates ranging between 27% and 37% form [sic] Threat and Imposition of Economic Sanctions (TIES) database of Morgan et al. (2014).' },
  { src: 'v2', pct: 42, label: 'Fully successful, 1950 to 2019, ongoing cases left out',
    quote: 'Overall, the average success rate of all identified sanction cases that have been classified as fully successful over the 1950-2019 period is around 42%, while sanctions with partial success account for about 16%. These percentages are calculated without taking into account ongoing sanction cases.' },
  { src: 'v2', pct: 30, label: 'At least partial success, 1950 to 2019, ongoing cases counted',
    quote: 'If the latter were taken into account then the sanctions with at least partial success would account for about 30%, which is very much in line with the effectiveness rate of 34% reported in Hufbauer et al. (2007).' },
];

// The GSDB authors' own comment on success by objective (v1, section 2.3). No numbers are given per objective.
export const GSDB_BY_OBJECTIVE = 'Interestingly, except for terrorism related policy objectives, where the success rate is very low, around one third of the listed aims are assessed as successful. A significantly stronger positive assessment is observed for policy objectives related to democracy issues.';

// The tool's rough alignment of TIES issues with GSDB objectives (not from either dataset).
export const ALIGN = [
  { ties: [3], gsdb: 'Destabilize regime' },
  { ties: [5], gsdb: 'Territorial conflict' },
  { ties: [2], gsdb: 'Prevent war / End war' },
  { ties: [10], gsdb: 'Terrorism (TIES also counts support for civil-war factions)' },
  { ties: [8], gsdb: 'Human rights' },
  { ties: [], gsdb: 'Democracy (no TIES category)' },
  { ties: [1, 4, 6, 7, 9, 11, 12, 13, 14, 15], gsdb: 'Policy change or Other' },
];
