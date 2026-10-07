// Interceptor Burn-down: Taiwan's long-range air and missile defense interceptors, national totals only.
// Every figure below is a public open-source estimate or a public order figure. Taiwan's Ministry of National
// Defense does not publish its interceptor stockpile, so none of these is an official on-hand count.
// Sources (each opened and checked, September 2026):
//   Open Nuclear Network (Tianran Xu), "Taiwan's Air and Missile Defence", Part 2 (9 Oct 2024) and Part 4 (29 Apr 2025):
//     about 200 PAC-2 GEM and about 380 PAC-3 CRI purchased; PAC-3 MSE "possibly in the range of 50 to 100";
//     Tien Kung-3 "at least 400" (production-based estimate 498-648); 432 Tien Kung-2 silos, likely all armed;
//     Tien Kung-2 has no anti-ballistic role in live-fire drills.
//   Open Nuclear Network, Part 3 (23 Jan 2025): Tien Kung-3 mix with Tien Kung-2 and the 12-battery Tien Kung-3 program.
//   CRS RL30957 (Shirley Kan), Taiwan: Major U.S. Arms Sales Since 1990: 330 PAC-3 notified 3 Oct 2008 and
//     114 PAC-3 notified 29 Jan 2010 (notification ceilings, 444 total).
//   The Defense Post, 12 Feb 2026, reporting the Liberty Times: 102 PAC-3 MSE procured; first batch delivered Jan 2026.
//   DSCA notification TECRO 24-48 (25 Oct 2024), mirrored by GlobalSecurity.org: 3 NASAMS, 123 AMRAAM-ER.
//   TSM Arms Sales Backlog (tools/arms-backlog/data/cases.js, TSM local): NASAMS fire-unit contract due spring 2031;
//     PAC-3 MSE case partly delivered.
//   Taipei Times, 3 Jan 2026: T-Dome plan includes 230 more Tien Kung III and two Chiang Kung (Tien Kung IV/V)
//     systems with 128 missiles, subject to the special defense budget.
//   Liberty Times Defense, 3 Sep 2026 (opened 2026-10-02): the May 2026 special act (NT$780bn cap, U.S. FMS only) dropped
//     13 items including Strong Bow; Strong Bow is in the FY2027 budget and the cabinet's 2026 supplementary request.
//   Taipei Times, 4 Mar 2022 and 16 Aug 2026: Tien Kung III production capacity 96 a year (up from 48).

export const SYSTEMS = [
  { k: 'mse', n: 'PAC-3 MSE', long: 'Patriot PAC-3 Missile Segment Enhancement', col: 'var(--c1)',
    roles: ['b', 'c', 'd'], limB: false, max: 400,
    basis: '102 ordered; first batch reportedly delivered January 2026', src: 'defpost', tag: 'order' },
  { k: 'cri', n: 'PAC-3 CRI', long: 'Patriot PAC-3 Cost Reduction Initiative', col: 'var(--c7)',
    roles: ['b', 'c', 'd'], limB: false, max: 600,
    basis: 'about 380 purchased (analyst estimate); 444 notified in 2008 and 2010', src: 'onn2', tag: 'estimate' },
  { k: 'gem', n: 'PAC-2 GEM', long: 'Patriot PAC-2 Guidance Enhanced Missile', col: 'var(--c6)',
    roles: ['b', 'c', 'd'], limB: true, max: 400,
    basis: 'about 200 purchased (analyst estimate); limited anti-ballistic role', src: 'onn2', tag: 'estimate' },
  { k: 'tk3', n: 'Tien Kung III', long: 'Tien Kung III (Sky Bow III)', col: 'var(--c3)',
    roles: ['b', 'c', 'd'], limB: true, max: 1000,
    basis: 'at least 400 (analyst estimate from production capacity)', src: 'onn4', tag: 'estimate' },
  { k: 'tk2', n: 'Tien Kung II', long: 'Tien Kung II (Sky Bow II)', col: 'var(--c5)',
    roles: ['c', 'd'], limB: true, max: 800,
    basis: 'about 430 (432 silos, analyst estimate); no anti-ballistic role', src: 'onn4', tag: 'estimate' },
  { k: 'nasams', n: 'NASAMS', long: 'NASAMS with AMRAAM-ER', col: 'var(--c4)',
    roles: ['c', 'd'], limB: true, max: 500,
    basis: '123 AMRAAM-ER notified October 2024; fire units due by spring 2031, so zero today', src: 'dsca', tag: 'order' },
  { k: 'tk4', n: 'Tien Kung IV', long: 'Tien Kung IV (Chiang Kung program)', col: 'var(--c2)',
    roles: ['b', 'c', 'd'], limB: false, max: 500,
    basis: '128 missiles planned under T-Dome; zero today. The special act passed in May 2026 left the Strong Bow (Chiang Kung) system out; the cabinet moved it into the FY2027 budget and the 2026 supplementary request, which the legislature had not passed by 6 October 2026 (Liberty Times, 3 Sept. 2026)', src: 'tt2026', tag: 'planned' },
];

// Which systems each threat class draws on, in firing order: for ballistic missiles the most capable interceptors
// first; for cruise missiles and drones, cheaper rounds first.
// The ordering is a modelling choice, not published doctrine: older PAC-3 CRI rounds fire before the newer MSE.
export const ORDER = {
  b: ['tk4', 'cri', 'mse', 'tk3', 'gem'],
  c: ['tk2', 'nasams', 'tk3', 'gem', 'tk4', 'cri', 'mse'],
  d: ['nasams', 'tk2', 'tk3', 'gem', 'cri', 'mse', 'tk4'],
};
export const PAC3 = new Set(['mse', 'cri', 'tk4']);

export const INV_PRESETS = [
  { k: 'open', n: 'Open estimates, 2026', s: 'Analyst estimates plus the 102-missile MSE order',
    v: { mse: 102, cri: 380, gem: 200, tk3: 400, tk2: 430, nasams: 0, tk4: 0 },
    note: 'Open-source estimates. Assumes the full 102-missile PAC-3 MSE order has arrived, which MND has not confirmed. Live-fire use since purchase is not subtracted.' },
  { k: 'low', n: 'Lean', s: 'MSE at 50, Tien Kung III at the low end',
    v: { mse: 50, cri: 380, gem: 200, tk3: 400, tk2: 430, nasams: 0, tk4: 0 },
    note: 'ONN puts the MSE count at possibly 50 to 100 by end of 2026. Other systems as in the open estimate.' },
  { k: 'planned', n: 'With planned orders', s: 'T-Dome and NASAMS added',
    v: { mse: 102, cri: 380, gem: 200, tk3: 630, tk2: 430, nasams: 123, tk4: 128 },
    note: 'Adds 230 Tien Kung III and 128 Tien Kung IV (T-Dome plan, Taipei Times, Jan. 2026) and 123 AMRAAM-ER for NASAMS (due by 2031). Funding for the Tien Kung III is unconfirmed: the extra missiles were requested in 2025, but the special act passed in May 2026 covered U.S. purchases only and left out domestic programs, and Tien Kung III is not among the dropped items the cabinet moved into the 2026 supplementary request (Liberty Times, 3 Sept. 2026). The planned PAC-3 battalion is left out because its missile count is not public.' },
];

// Sourced production and delivery facts used for the resupply controls.
export const SUPPLY = {
  tk3PerYear: 96,          // Taipei Times, 4 Mar 2022 and 16 Aug 2026: capacity, not a wartime rate
  mseOrdered: 102,         // The Defense Post / Liberty Times, Feb 2026
  nasamsDue: 'spring 2031' // TSM backlog, November 2025 update
};
