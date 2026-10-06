// Oil flows through the chokepoints, million barrels per day, from the U.S. Energy Information Administration.
// World Oil Transit Chokepoints (last updated 3 March 2026), Table 1 (all bars, including the Cape of Good Hope).
// Both pages checked 29 September 2026. EIA's figures stop at the first half of 2025, before the 2026 closure.
const WOTC = 'https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints';
const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;

export const EIA = {
  bars: [
    { label: 'Hormuz, 2023', v: 21.8, note: 'crude and products' },
    { label: 'Hormuz, 1H 2025', v: 20.9, note: 'about 20% of world liquids use' },
    { label: 'Bab el-Mandeb, 2023', v: 9.3, note: 'before the attacks' },
    { label: 'Bab el-Mandeb, 2024', v: 4.1, note: 'less than half of 2023' },
    { label: 'Suez + SUMED, 2023', v: 8.8, note: 'canal and pipeline' },
    { label: 'Suez + SUMED, 2024', v: 4.8, note: '' },
    { label: 'Cape, 2023', v: 6.2, note: 'around southern Africa' },
    { label: 'Cape, 2024', v: 9.3, note: 'rerouted oil' },
  ],
  note: `Million barrels a day. ${a(WOTC, 'EIA, World Oil Transit Chokepoints')} (updated 3 March 2026): Hormuz carried about one-quarter of seaborne oil trade and, in 1H 2025, 11.4 billion cubic feet a day of LNG, over 20 percent of world LNG trade. Saudi and UAE pipelines could bypass about 4.7 million barrels a day. LNG through Bab el-Mandeb was near zero in 2024. Cape figures are from the same table; ${a('https://www.eia.gov/todayinenergy/detail.php?id=62263', 'EIA, Today in Energy, 11 June 2024')} describes the early-2024 rerouting. EIA has not yet published annual flows for 2026; it reports that ${a('https://www.eia.gov/todayinenergy/detail.php?id=67604', 'no laden LNG vessel is known to have crossed Hormuz between 1 March and 24 April 2026, according to Kpler data')}.`,
  url: WOTC,
};
