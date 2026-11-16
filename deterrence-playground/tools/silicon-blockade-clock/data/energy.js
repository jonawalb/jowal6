// Silicon Blockade Clock: Taiwan energy baseline (forked from tools/energy-blockade, every figure re-checked 2026-11-16).
// Sources opened 2026-11-16:
//   U.S. EIA, Taiwan Analysis Brief, April 2026 (PDF, HTTP 200): "over 94%" of energy imported (2024); oil stocks 146 days
//     (MOEA, 2024); natural gas 78% to power (2024); about 76% of coal to power (2024); gas stocks "10 to 11 days of use".
//     https://www.eia.gov/international/content/analysis/countries_short/Taiwan/Taiwan.pdf
//   Eco-Business, 18 Mar 2026, reporting the MOEA monthly energy report: 2025 generation gas 47.8%, coal 35.4%,
//     renewables 13.1%, nuclear 1.1% (last reactor shut in May 2025).
//   World Nuclear News, 19 May 2025: Maanshan 2 disconnected 17 May 2025.
//   CNA, 24 Sep 2026: Nuclear Safety Commission approved the Maanshan restart plan; self safety checks still to come,
//     so no nuclear output in 2026.
//   Energy Administration (MOEA), "Stable supply of natural gas" (read via Wayback 2026 snapshot, live site behind
//     Cloudflare): LNG security stockpile at least 7 days in 2019, 14 days in 2027.
//   Taipei Times, 23 Jan 2023 (HTTP 200): rules require up to 30 days of coal; Taipower keeps 40 to 42; 50 days studied.
//   Taipei Times, 6 Mar 2026 (HTTP 200): crude reserves >100 days, gas >11 days; about 30 gas shipments a month.
//   CSIS, Lights Out? (July 2025), pp. 74-77: default inventories oil 146 days, gas 12 days, coal 45 days;
//     1 percent of oil used for electricity; electricity allocated to six sectors.
//   MOEA Energy Administration open data set 148 (electricity consumption by sector; read via Wayback snapshot of
//     18 Jun 2026; category "electronic products and electrical equipment manufacturing"): 2024 total 283,846 GWh (million kWh); electronics and electrical equipment manufacturing 65,953 GWh (23.2%);
//     industry 55.2%.
// Anything marked notional is a model assumption.

export const MIX_RAW = { gas: 47.8, coal: 35.4, renew: 13.1, oil: 2.6 }; // 2025; "oil and other" is the remainder after nuclear 1.1
const SUM = Object.values(MIX_RAW).reduce((a, b) => a + b, 0);
export const MIX = Object.fromEntries(Object.entries(MIX_RAW).map(([k, v]) => [k, v / SUM]));
export const POWER_SHARE = { lng: 0.78, coal: 0.76, oil: 0.01 };

export const FUELS = [
  { k: 'lng', n: 'LNG', long: 'Liquefied natural gas' },
  { k: 'coal', n: 'Coal', long: 'Coal' },
  { k: 'oil', n: 'Oil', long: 'Crude and products' },
];

export const STOCKS = [
  { k: 'reported', n: 'Reported', s: 'Latest public figures', v: { lng: 11, coal: 41, oil: 146 },
    note: 'Natural gas 10 to 11 days (EIA 2026; Taipei Times, Mar 2026), coal 40 to 42 days (Taipower, 2023), oil 146 days (MOEA, 2024).' },
  { k: 'y2027', n: 'Larger stocks', s: '2027 LNG rule, coal under study', v: { lng: 14, coal: 50, oil: 146 },
    note: 'Natural gas stockpile 14 days (2027 rule); coal 50 days (Taipower was studying this, reported 2023).' },
];

// Sector shares of power demand. 'chips' = electronics and electrical equipment manufacturing, 23.2% of 2024
// consumption (MOEA set 148). Other industry = industry 55.2% minus electronics, plus agriculture and transport.
// 'ess' (hospitals, water, telecom) is carved out of services at 5%: notional, no official split exists.
const T24 = 283845.7, ELEC24 = 65953.1, IND24 = 156560.4, ENERGY24 = 18504.0, RES24 = 53442.2, AGTR24 = 3403.9 + 1907.8;
export const SECTOR_SOURCE = { year: 2024, totalGWh: T24, chipsGWh: ELEC24 };
export const SECTORS = [
  { k: 'ess', n: 'Essential services', share: 0.05 },
  { k: 'energy', n: 'Energy sector own use', share: ENERGY24 / T24 },
  { k: 'chips', n: 'Electronic products and electrical equipment', share: ELEC24 / T24 },
  { k: 'ind', n: 'Other industry', share: (IND24 - ELEC24 + AGTR24) / T24 },
  { k: 'res', n: 'Households', share: RES24 / T24 },
  { k: 'svc', n: 'Commerce and services', share: 0 },
];
// Services take the remainder so shares sum to 1.
SECTORS[5].share = 1 - SECTORS.slice(0, 5).reduce((a, s) => a + s.share, 0);

// Who gets power first when supply falls short. Each tier is [sector, portion of its demand]. Notional orders.
export const POLICIES = [
  { k: 'chips', n: 'Protect chips', s: 'Essentials, then fabs, then half of homes (close to CSIS priorities)',
    tiers: [['ess', 1], ['energy', 1], ['chips', 1], ['res', 0.5], ['ind', 0.5], ['res', 0.5], ['svc', 0.5], ['ind', 0.5], ['svc', 0.5]] },
  { k: 'industry', n: 'All industry equal', s: 'Fabs share cuts with steel and petrochemicals',
    tiers: [['ess', 1], ['energy', 1], ['chips', 0.5], ['ind', 0.5], ['res', 0.5], ['chips', 0.5], ['ind', 0.5], ['res', 0.5], ['svc', 1]] },
  { k: 'households', n: 'Households first', s: 'Keep homes lit; fabs take what is left',
    tiers: [['ess', 1], ['energy', 1], ['res', 1], ['svc', 1], ['chips', 1], ['ind', 1]] },
];

export const ENERGY_NOTIONAL = {
  restock: 0.25,   // extra import capacity after the blockade lifts, share of normal daily use (same as energy-blockade)
  renewAvail: 1.0, // renewables keep their normal share
};
