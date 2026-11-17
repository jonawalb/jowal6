// Silicon Blockade Clock: chip-chain facts, sources, scenarios and notional bridging parameters.
// Every source below was opened on 2026-11-16 (HTTP 200 directly or through the Wayback Machine where noted).
// Values marked notional are model assumptions; their rationale is shown on the page.

export const ASOF = '16 November 2026';

export const SOURCES = {
  eia: { t: 'U.S. Energy Information Administration, Taiwan Analysis Brief, April 2026', u: 'https://www.eia.gov/international/content/analysis/countries_short/Taiwan/Taiwan.pdf' },
  eco: { t: 'Eco-Business, "Taiwan misses 2025 renewable target as coal power remains above goal," 18 March 2026 (the 2025 generation mix as reported by Eco-Business, citing MOEA\'s monthly energy report)', u: 'https://www.eco-business.com/news/taiwan-misses-2025-renewable-target-as-coal-power-remains-above-goal/' },
  wnn: { t: 'World Nuclear News, "Reactor closure marks Taiwan\'s nuclear exit," 19 May 2025', u: 'https://www.world-nuclear-news.org/articles/reactor-closure-marks-taiwans-nuclear-exit' },
  cna: { t: 'Central News Agency, Nuclear Safety Commission approves the Maanshan restart plan, 24 September 2026 (Chinese)', u: 'https://www.cna.com.tw/news/afe/202609240313.aspx' },
  moeaGas: { t: 'Energy Administration, MOEA, "Stable supply of natural gas" (statutory LNG stockpile by year; Wayback copy, live site blocks scripts)', u: 'https://web.archive.org/web/2026/https://www.moeaea.gov.tw/ECW/english/content/Content.aspx?menu_id=8677' },
  ttCoal: { t: 'Taipei Times, "Taipower aims to increase coal storage," 23 January 2023', u: 'https://www.taipeitimes.com/News/front/archives/2023/01/23/2003793032' },
  ttRes: { t: 'Taipei Times, "Taiwan crude oil and gas reserves above minimum," 6 March 2026', u: 'https://www.taipeitimes.com/News/biz/archives/2026/03/06/2003853325' },
  csisLO: { t: 'Mark F. Cancian, Matthew F. Cancian and Eric Heginbotham, Lights Out? Wargaming a Chinese Blockade of Taiwan, CSIS, July 2025', u: 'https://csis-website-prod.s3.amazonaws.com/s3fs-public/2025-07/250730_Cancian_Taiwan_Blockade.pdf' },
  moeaElec: { t: 'Energy Administration, MOEA, open data set 148, electricity consumption by sector (CSV; Wayback copy of 18 June 2026, live site blocks scripts)', u: 'https://web.archive.org/web/20260618052919/https://www.moeaea.gov.tw/ECW/populace/opendata/wHandOpenData_File.ashx?set_id=148' },
  tsmcSR: { t: 'TSMC, 2024 Sustainability Report (energy data appendix; Wayback copy, live site blocks scripts)', u: 'https://web.archive.org/web/2026/https://esg.tsmc.com/file/public/2024-TSMC-Sustainability-Report-e.pdf' },
  sia24: { t: 'SIA and BCG, Emerging Resilience in the Semiconductor Supply Chain, May 2024 (Exhibits 6 and 13)', u: 'https://www.semiconductors.org/wp-content/uploads/2024/05/Report_Emerging-Resilience-in-the-Semiconductor-Supply-Chain.pdf' },
  tsmcFabs: { t: 'TSMC, "TSMC Fabs" (fab and advanced backend fab locations; Wayback copy of 3 November 2026)', u: 'https://web.archive.org/web/20261103203803/https://www.tsmc.com/english/aboutTSMC/TSMC_Fabs' },
  tsmc4q24: { t: 'TSMC, 4Q24 earnings conference call transcript, 16 January 2025', u: 'https://web.archive.org/web/20261030202754if_/https://investor.tsmc.com/english/encrypt/files/encrypt_file/reports/2025-01/84aeb15bbe33894365d33f52e027c5268ba95dcf/TSMC%204Q24%20Transcript.pdf' },
  tsmc4q25: { t: 'TSMC, 4Q25 earnings conference call transcript, 15 January 2026', u: 'https://web.archive.org/web/20261112225404if_/https://investor.tsmc.com/english/encrypt/files/encrypt_file/reports/2026-01/51d09df96cd89ac19d65af39032b038dc2896a24/TSMC%204Q25%20Transcript.pdf' },
  tsmc2q26: { t: 'TSMC, 2Q26 earnings conference call transcript, 16 July 2026 (Wayback copy)', u: 'https://web.archive.org/web/20261008043719/https://investor.tsmc.com/english/encrypt/files/encrypt_file/reports/2026-08/3e494f0c14dd0890f897aa044415e21d93486cc4/TSMC%202Q26%20Transcript.pdf' },
  tsmc3q26: { t: 'TSMC, 3Q26 earnings conference call transcript, 15 October 2026', u: 'https://web.archive.org/web/20261112225404if_/https://investor.tsmc.com/english/encrypt/files/encrypt_file/reports/2026-10/eba4fac72873bf546b669bd2b5d973df5c93215d/TSMC%203Q26%20Transcript.pdf' },
  tsmc3q26pr: { t: 'TSMC, 3Q26 earnings release (Form 6-K), 15 October 2026', u: 'https://www.sec.gov/Archives/edgar/data/1046179/000104617926000726/a3q26e_withguidancexfinal.htm' },
  nvBlog: { t: 'NVIDIA blog, Nvidia celebrates the first Blackwell wafer made in the United States at TSMC Arizona, 17 October 2025', u: 'https://blogs.nvidia.com/blog/tsmc-blackwell-manufacturing/' },
  thAZ: { t: 'Tom\'s Hardware, "Nvidia and TSMC produce the first Blackwell wafer made in the U.S.; chips still need to be shipped back to Taiwan," 18 October 2025', u: 'https://www.tomshardware.com/tech-industry/semiconductors/nvidia-and-tsmc-produce-the-first-blackwell-wafer-made-in-the-u-s-chips-still-need-to-be-shipped-back-to-taiwan-to-complete-the-final-product' },
  star: { t: 'Reuters via The Star, "Nvidia CEO says its advanced packaging technology needs are changing," 16 January 2025', u: 'https://www.thestar.com.my/tech/tech-news/2025/01/16/nvidia-ceo-says-its-advanced-packaging-technology-needs-are-changing' },
  amkor: { t: 'Amkor Technology blog, Peoria, Arizona campus, 13 May 2026', u: 'https://amkor.com/blog/amkor-peoria-number-one-deal-north-america/' },
  tfCowos: { t: 'TrendForce, "TSMC reportedly expands outsourcing of key CoWoS front-end step to OSATs," 5 August 2026', u: 'https://www.trendforce.com/news/2026/08/05/news-tsmc-reportedly-expands-outsourcing-of-key-cowos-front-end-step-to-osats-amid-rising-nvidia-asic-demand/' },
  tfAP7: { t: 'TrendForce (citing MoneyDJ), "TSMC speeds advanced packaging: AP7 targets 2026 output," 4 December 2025', u: 'https://www.trendforce.com/news/2025/12/04/news-tsmc-speeds-advanced-packaging-ap7-targets-2026-output-arizona-p6-eyed-for-u-s-packaging-hub/' },
  esmc: { t: 'ESMC, "Who we are" (Wayback copy of 8 November 2026)', u: 'https://web.archive.org/web/20261108001449/https://www.esmc.eu/en/who_we_are.html' },
  intel18a: { t: 'Intel Newsroom, Panther Lake on Intel 18A, 9 October 2025', u: 'https://www.intel.com/content/www/us/en/newsroom/news/client-computing/intel-unveils-panther-lake-architecture-first-ai-pc-platform-built-on-18a.html' },
  samsung: { t: 'Electrek, "Samsung Taylor fab: Tesla AI5 chip on 2nm," 13 July 2026 (secondary report)', u: 'https://electrek.co/2026/07/13/samsung-taylor-fab-tesla-ai5-chip-2nm/' },
  epoch: { t: 'Epoch AI, "AI Chip Sales" dataset (updated 21 October 2026; estimates generated 27 August 2026)', u: 'https://epoch.ai/data/ai-chip-sales' },
  nv10q: { t: 'NVIDIA, Form 10-Q for the quarter ended 26 July 2026', u: 'https://www.sec.gov/Archives/edgar/data/1045810/000104581026000075/nvda-20260726.htm' },
  rhg22: { t: 'Charlie Vest, Agatha Kratz and Reva Goujon, "The Global Economic Disruptions from a Taiwan Conflict," Rhodium Group, 14 December 2022', u: 'https://rhg.com/research/taiwan-economic-disruption/' },
  ttHw: { t: 'Taipei Times, "TSMC notifies US about use of its chip by Huawei," 24 October 2024 (citing Reuters on a TechInsights teardown)', u: 'https://www.taipeitimes.com/News/front/archives/2024/10/24/2003825780' },
  tfFab: { t: 'TrendForce, on the TSMC Fab 14 P7 power incident, 15 April 2021', u: 'https://www.trendforce.com/presscenter/news/20210415-10762.html' },
};

// Sourced baseline table. src lists keys in SOURCES.
export const FACTS = [
  { item: 'Leading-edge logic (<10nm) capacity in Taiwan', fig: '69% of world (2022); 47% projected for 2032. Korea held the other 31% in 2022', src: ['sia24'] },
  { item: 'TSMC N2 (2nm) production', fig: 'high-volume manufacturing since 4Q25, ramping at TSMC\'s Hsinchu and Kaohsiung sites (3Q26 call)', src: ['tsmc3q26'] },
  { item: 'All assembly, test and packaging in Taiwan', fig: '27% of world capacity (2022). No public figure isolates advanced (2.5D) packaging', src: ['sia24'] },
  { item: 'TSMC advanced backend (packaging) fabs', fig: 'All in Taiwan: five in TSMC\'s list (Hsinchu, Tainan, Longtan in Taoyuan, Taichung, Zhunan in Miaoli), plus AP7 Chiayi (opening ceremony Dec 2025; output from 2026)', src: ['tsmcFabs', 'tfAP7'] },
  { item: 'TSMC CoWoS capacity', fig: 'about 70,000 wafers a month in 2025, 130,000 to 140,000 by end-2026 (TrendForce relaying ETNews and other reports; TSMC does not publish it)', src: ['tfCowos'] },
  { item: 'Packaging as the bottleneck', fig: 'TSMC CEO C.C. Wei, 2Q26 call, 16 Jul 2026: "our packaging capacity is so tight that now it limits my customers\' growth"', src: ['tsmc2q26'] },
  { item: 'TSMC 3Q26 wafer revenue by node', fig: '2nm 8%, 3nm 33%, 5nm 28%, 7nm 10%', src: ['tsmc3q26pr'] },
  { item: 'Nvidia data-center GPUs', fig: 'made by TSMC; Blackwell uses CoWoS-L packaging (Huang, Jan 2025)', src: ['star'] },
  { item: 'World AI accelerators shipped', fig: '9.58 million in 2025; 3.09 million in 2Q26, about 237,000 a week (median estimates)', src: ['epoch'] },
  { item: 'Accelerators made in China (Huawei, Cambricon)', fig: '11.6% of 2Q26 units in the same dataset. TechInsights reportedly found a TSMC-made chip in a Huawei Ascend 910B accelerator (Oct 2024), so 11.6% is best read as an upper bound on output with no Taiwan step', src: ['epoch', 'ttHw'] },
  { item: 'Nvidia inventory, 26 Jul 2026', fig: '$31.6bn total, of which $6.9bn finished goods; quarterly cost of revenue $24.1bn', src: ['nv10q'] },
  { item: 'Electricity used by electronic products and electrical equipment manufacturing (MOEA category, wider than chips)', fig: '65,953 GWh of 283,846 GWh in 2024 (23.2%)', src: ['moeaElec'] },
  { item: 'TSMC electricity at Taiwan sites', fig: '23,329 GWh of purchased electricity ("indirect energy consumption") in 2024: 8.2% of Taiwan\'s use, 35% of the MOEA electronic products and electrical equipment category', src: ['tsmcSR', 'moeaElec'] },
  { item: 'Fab recovery after a short power loss', fig: '2 to 7 days to recalibrate tools (single fab, 2021)', src: ['tfFab'] },
  { item: 'World economic activity at risk in a blockade (Rhodium Group estimate, 2022)', fig: '"well over two trillion dollars" before international responses or second-order effects; semiconductors are the most serious channel. A dollar estimate, not modelled here', src: ['rhg22'] },
  { item: 'Energy imported', fig: 'over 94% (2024)', src: ['eia'] },
  { item: 'Electricity by fuel, 2025', fig: 'gas 47.8%, coal 35.4%, renewables 13.1%, nuclear 1.1% and zero since May 2025', src: ['eco', 'wnn', 'cna'] },
  { item: 'Fuel stocks', fig: 'natural gas 10 to 11 days (EIA, 2026), over 11 days (Taipei Times, Mar 2026); coal 40 to 42 days kept; oil 146 days (2024)', src: ['eia', 'ttRes', 'ttCoal'] },
  { item: 'LNG stockpile rule', fig: '14 days required from 2027', src: ['moeaGas'] },
];

// Readout facts with year and source, shown in the panel.
export const HEADLINE = {
  logic: { v: '69%', s: 'of world sub-10nm logic capacity, 2022 (SIA/BCG, 2024)', src: 'sia24' },
  pack: { v: 'All', s: 'All TSMC advanced packaging fabs (5 in TSMC\'s list, plus AP7 Chiayi) are in Taiwan. Taiwan held 27% of all packaging capacity in 2022', src: 'tsmcFabs' },
};

// City-level clusters (city centres, rounded). fabs = TSMC wafer fabs of every generation in TSMC's fab list; back = advanced
// backend (packaging) fabs in the same list. Chiayi AP7 is from TrendForce, not the TSMC list.
export const CLUSTERS = [
  { n: 'Hsinchu', at: [120.97, 24.8], fabs: 7, back: 1, note: 'Hsinchu Science Park' },
  { n: 'Longtan', at: [121.21, 24.86], fabs: 0, back: 1, note: 'Taoyuan: backend fab' },
  { n: 'Zhunan', at: [120.88, 24.69], fabs: 0, back: 1, note: 'Miaoli: backend fab' },
  { n: 'Taichung', at: [120.62, 24.21], fabs: 2, back: 1, note: 'Central Taiwan Science Park' },
  { n: 'Chiayi', at: [120.45, 23.48], fabs: 0, back: 1, note: 'AP7, opening ceremony Dec 2025; output from 2026 (TrendForce)', ext: true },
  { n: 'Tainan', at: [120.28, 23.1], fabs: 5, back: 1, note: 'Southern Taiwan Science Park' },
  { n: 'Kaohsiung', at: [120.31, 22.73], fabs: 1, back: 0, note: 'Kaohsiung' },
];

// Scenarios: what each one stops. All three shares are notional.
export const SCENARIOS = [
  { k: 'quarantine', n: 'Inspection quarantine', s: 'Coast guard boards ships; most cargo gets through; flights mostly continue',
    v: { energyCut: 0.25, inputCut: 0.1, exportCut: 0.05 }, dur: 90 },
  { k: 'energy', n: 'Energy-only blockade', s: 'Fuel tankers and LNG carriers turned away; other cargo and flights keep moving only if shippers keep sailing, which CSIS doubts',
    v: { energyCut: 1, inputCut: 0, exportCut: 0 }, dur: 120 },
  { k: 'full', n: 'Full blockade', s: 'Sea and air closed; a few runners and airlifts get through',
    v: { energyCut: 1, inputCut: 0.9, exportCut: 0.9 }, dur: 120 },
];
export const LEVERS = [
  { k: 'energyCut', t: 'Inbound fuel cargo stopped', why: 'Quarantine at 25% follows the "loose quarantine" in TSM\'s Energy Blockade Clock. CSIS judges that any blockade, quarantine included, would halt commercial shipping; the quarantine shares are a deliberately optimistic case.' },
  { k: 'inputCut', t: 'Inbound process materials stopped', why: 'Wafers, chemicals, gases and spare parts arrive by sea and air. A quarantine delays some; a full blockade closes both.' },
  { k: 'exportCut', t: 'Chip exports stopped', why: 'Finished chips mostly leave by air. Only a blockade that also closes the airspace stops them.' },
];

// Bridging parameters. All notional; anchor marks a default set from a sourced figure and then extrapolated.
// Every one has a slider.
export const PARAMS = [
  { k: 'leShare', t: 'Leading-edge share of chip-sector power', anchor: true, v: 0.35, min: 0.1, max: 1, step: 0.01, pct: true,
    why: 'When fabs get priority, this block is powered first. Default: TSMC\'s Taiwan sites bought 23,329 GWh in 2024, 35% of the 65,953 GWh used by MOEA\'s electronic products and electrical equipment category (TSMC 2024 Sustainability Report, purchased electricity; MOEA). Not all of TSMC is leading edge, and other firms also make chips.' },
  { k: 'rationLoss', t: 'Output lost to rotating cuts', v: 0.15, min: 0, max: 0.6, step: 0.05, pct: true,
    why: 'Fabs run on stable full power. When the grid rations by shutting sites in turn, each restart costs output beyond the power lost. No public estimate.' },
  { k: 'restartDays', t: 'Days to recover full output after a cut', anchor: true, v: 7, min: 1, max: 45, step: 1, u: 'days',
    why: 'TrendForce estimated 2 to 7 days to recalibrate after a one-day power incident at a single fab in 2021. A long island-wide outage would take at least as long.', src: 'tfFab' },
  { k: 'matDays', t: 'Process materials on hand', v: 30, min: 0, max: 120, step: 5, u: 'days',
    why: 'Fabs hold stocks of wafers, chemicals, gases and parts, much of it imported from Japan, the U.S. and Europe. No public figure for Taiwan\'s fabs.' },
  { k: 'chanWeeks', t: 'Finished accelerators held outside Taiwan', anchor: true, v: 3, min: 0, max: 16, step: 1, u: 'weeks',
    why: 'Nvidia\'s finished goods were $6.9bn on 26 Jul 2026 against $24.1bn of quarterly cost of revenue, about 26 days (10-Q), so 3.7 weeks is an upper anchor. Location of Nvidia\'s finished goods is not disclosed; some sits at Taiwan server makers and would be trapped in a full blockade. Chips already installed do not count.' },
  { k: 'nonTw', t: 'World output with no Taiwan step', anchor: true, v: 0.116, min: 0, max: 0.4, step: 0.005, pct: true, dp: 1,
    why: 'Huawei and Cambricon chips were 11.6% of 2Q26 units in Epoch AI\'s data. The model assumes every other accelerator has a Taiwan step (TSMC wafers or packaging). Chinese chips do not reach most buyers outside China. TechInsights reportedly found a TSMC-made chip in a Huawei Ascend 910B (Taipei Times, citing Reuters, Oct 2024), so 11.6% is best read as an upper bound.', src: 'ttHw' },
  { k: 'release', t: 'Stranded chips shipped per day after it lifts', v: 0.25, min: 0.05, max: 1, step: 0.05, pct: true,
    why: 'Share of a normal day\'s output that can leave on top of current output once routes reopen. Air freight capacity limits it.' },
  { k: 'catchUp', t: 'Catch-up ceiling above normal deliveries', v: 0.25, min: 0.05, max: 1, step: 0.05, pct: true,
    why: 'While buyers are owed chips, deliveries can exceed normal by at most this share of a normal day. Air freight, server assembly and data-centre installation limit it. No public estimate.' },
  { k: 'matRestock', t: 'Extra materials inflow after it lifts', v: 0.5, min: 0, max: 2, step: 0.1, pct: true,
    why: 'Suppliers surge deliveries to refill stocks. No public estimate.' },
];
export const FIXED = { protect: true, weeklyUnits: 237479 }; // weeklyUnits: Epoch AI 2Q26 median, 3,087,226 / 13 weeks

// Alternatives outside Taiwan. Status lines are sourced; start delay, ramp and ceiling are notional.
// cap = ceiling as a share of normal world accelerator output. delay and ramp in days, counted from the first day Taiwan's supply
// falls below 95% of normal (day 0 in a full blockade).
export const ALTS = [
  { k: 'az', n: 'Arizona wafers, packaged outside Taiwan', cap: 0.08, delay: 120, ramp: 270,
    status: 'TSMC Arizona fab 1 (N4) in volume production since 4Q24; Nvidia celebrated the first Arizona Blackwell wafer on 17 Oct 2025; such wafers return to Taiwan for packaging (Tom\'s Hardware). Fab 2 (N3) volume production 3Q27. Arizona packaging fab still in permitting (Jan 2026); Amkor Peoria opens 2028.',
    src: ['tsmc4q24', 'nvBlog', 'thAZ', 'tsmc3q26', 'tsmc4q25', 'amkor'],
    why: 'Wafers exist but need CoWoS-class packaging that is almost all in Taiwan. The ceiling assumes OSAT lines elsewhere can be qualified for a small share.' },
  { k: 'osat', n: 'OSAT advanced packaging outside Taiwan', cap: 0.05, delay: 90, ramp: 365,
    status: 'ASE, Amkor and SPIL make the WoS step under TSMC licence, and TSMC is outsourcing more of the CoW step (TrendForce, Aug 2026). Where those lines sit is not published.',
    src: ['tfCowos'],
    why: 'Packaging lines outside Taiwan would need tools, substrates and qualification. Ceiling and timing are guesses.' },
  { k: 'kr', n: 'Samsung foundry (Korea, Texas)', cap: 0.1, delay: 270, ramp: 365,
    status: 'Korea held 31% of sub-10nm capacity in 2022 (SIA/BCG). Taylor, Texas: volume production of Tesla AI chips on 2nm expected 2H 2027 (secondary report).',
    src: ['sia24', 'samsung'],
    why: 'A design made for TSMC must be ported to a different process, taped out and qualified, and needs packaging too. Most of that time is engineering, not construction.' },
  { k: 'intel', n: 'Intel 18A and Intel packaging (U.S.)', cap: 0.05, delay: 330, ramp: 365,
    status: 'Fab 52 in Arizona was "set to reach high-volume production using Intel 18A" late 2025 (Intel). No third-party AI accelerator on 18A is confirmed.',
    src: ['intel18a'],
    why: 'Same porting problem as Samsung, with no AI accelerator customer in volume yet.' },
  { k: 'jp', n: 'TSMC Japan and Germany', cap: 0.03, delay: 540, ramp: 365,
    status: 'Kumamoto fab 1 makes specialty nodes; fab 2 will use 3nm with volume production in 2028. Dresden starts at 28 to 12nm, tool-in 2027.',
    src: ['tsmc4q24', 'tsmc3q26', 'esmc'],
    why: 'Neither site makes leading-edge logic before 2028, so the default start falls outside the one-year window.' },
];

export const CHANGELOG = [
  { d: '16 Nov 2026', t: 'First version. Energy baseline forked from TSM\'s Energy Blockade Clock and re-checked; electricity by sector updated to 2024 MOEA data; chip facts sourced from TSMC, SIA/BCG, Epoch AI and Nvidia filings.' },
  { d: '15 Oct 2026', t: 'TSMC: Arizona fab 2 (N3) volume production moved to 3Q27; Japan fab 2 to use 3nm, volume production 2028.' },
  { d: '24 Sep 2026', t: 'Taiwan\'s Nuclear Safety Commission approves the Maanshan restart plan. No nuclear output before safety checks; the model keeps nuclear at zero.' },
  { d: '16 Jul 2026', t: 'TSMC 2Q26 call: C.C. Wei says "our packaging capacity is so tight that now it limits my customers\' growth"; new Arizona investment includes advanced packaging fabs.' },
  { d: '15 Jan 2026', t: 'TSMC applies for permits for its first Arizona advanced packaging fab.' },
  { d: '17 Oct 2025', t: 'Nvidia celebrates the first Blackwell wafer made at TSMC Arizona; packaging still in Taiwan.' },
  { d: '17 May 2025', t: 'Maanshan 2, Taiwan\'s last reactor, disconnected.' },
  { d: '4Q 2024', t: 'TSMC Arizona fab 1 (N4) enters high-volume production.' },
];
