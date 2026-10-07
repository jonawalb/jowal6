// Taiwan reference cases for the "What it buys" view: real U.S. Foreign Military Sales (FMS) notifications,
// their notified program values and quantities, and how long each has taken to reach Taiwan.
// All figures are copied from TSM's Arms Sales Backlog tool (tools/arms-backlog/data/cases.js, data date Sept. 30, 2026),
// which carries the DSCA/Federal Register notice and the milestone source for every row. Copied 2026-10-06.
// The F-16 first delivery (Oct. 2, 2026) is later than the backlog's data date and comes from Focus Taiwan.
//   Backlog source: TSM, Taiwan Arms Sale Backlog, September 2026 update: https://tsm.schar.gmu.edu/taiwan-arms-sale-backlog-september-2026-update/
// Exchange rate: Focus Taiwan, Sept. 3, 2026 gives the supplementary budget as NT$607.6bn = US$19.12bn,
//   i.e. NT$31.78 per US$: https://focustaiwan.tw/politics/202609030018
// Notified values are ceilings for the whole program (equipment, support, training, spares), so a cost per unit
// derived from them is a program cost per unit, not a flyaway price.

export const NTD_PER_USD = 607.6 / 19.12;
export const WAIT_ASOF = '2026-09-30';
export const BACKLOG_URL = 'https://tsm.schar.gmu.edu/taiwan-arms-sale-backlog-september-2026-update/';

// One reference case per model category. first = first delivery reported (null = none yet); done = case complete;
// left = month the case left TSM's backlog without a reported delivery.
export const REF_CASES = {
  ascm: { name: 'Harpoon Coastal Defense System', notified: '2020-10-26', first: '2024-09', done: null,
    note: 'First equipment arrived in Sept. 2024; the missile contract runs to March 2029.',
    src: 'https://def.ltn.com.tw/article/breakingnews/4814390' },
  drones: { name: 'ALTIUS-600M-V loitering munitions (2024)', notified: '2024-06-18', first: '2025-08', done: '2026-03',
    note: 'One of the fastest cases in the backlog: first drones in Aug. 2025, complete in March 2026.',
    src: 'https://tsm.schar.gmu.edu/taiwan-arms-sale-backlog-march-2026-update-abrams-and-altius-delivered-but-further-delays-emerge/' },
  mines: { name: 'Volcano anti-tank mining system', notified: '2022-12-28', first: null, done: null,
    note: 'No deliveries reported by Sept. 2026; MND expects all 14 systems in 2026 and related equipment through 2029.',
    src: 'https://def.ltn.com.tw/article/breakingnews/5169628' },
  strike: { name: 'HIMARS (December 2022 case)', notified: '2022-12-05', first: null, done: null,
    note: 'No deliveries reported by Sept. 2026; MND expected the 18 launchers before the fourth quarter of 2026.',
    src: 'https://www.taipeitimes.com/News/taiwan/archives/2026/02/09/2003852027' },
  airdef: { name: 'NASAMS', notified: '2024-10-25', first: null, done: null,
    note: 'No deliveries reported by Sept. 2026; the U.S. contract for the three fire units runs to spring 2031.',
    src: 'https://tsm.schar.gmu.edu/taiwan-arms-sale-backlog-november-2025-update/' },
  c4isr: { name: 'Field Information Communications System', notified: '2020-12-07', first: '2026-02', done: null,
    note: 'Army units began fielding it in Feb. 2026; unclear whether all of it has been delivered.',
    src: BACKLOG_URL },
  ammo: { name: '30mm ammunition', notified: '2023-06-29', first: null, done: null, left: '2025-01',
    note: 'Left TSM\'s backlog in Jan. 2025 when production moved to Taiwan, not because it was delivered.',
    src: 'https://tsm.schar.gmu.edu/taiwan-arms-sale-backlog-january-2025-update-f-16-delays-and-new-contracts/' },
  platforms: { name: 'F-16C/D Block 70', notified: '2019-08-20', first: '2026-10', done: null,
    note: 'The first two jets were delivered at Chihhang Air Base on Oct. 2, 2026; press reports put the rest in 2027 and 2028.',
    src: 'https://focustaiwan.tw/politics/202610020006' },
};
