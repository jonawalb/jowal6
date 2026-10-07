// Capability categories and the NOTIONAL parameters of the range model.
// Reaches, weights, baselines and saturation scales are round, illustrative numbers chosen to make the model's
// logic visible. They are not estimates of real programs or performance. See "How the range model works" on the page.
// Unit costs: rows with `src` are SOURCED from U.S. FMS notifications to Taiwan (program value / quantity, converted
// at the rate in taiwan_fms.js) or from Taiwan's own budget line; rows without `src` remain notional.
//
// k      NT$bn at which new spending closes ~63% of the remaining gap in that capability (diminishing returns)
// base   capability Taiwan already has before this budget, 0..1
// reach  km from Taiwan's coast that the layer covers during a crossing (0 = does not shoot at ships)
// w      largest share of the crossing force this layer could engage at full strength
// cls    survivability class under PLA suppression: 'mobile' (dispersible), 'fixed', 'platform' (large, visible)
// unit   one unit and its cost in NT$bn (sourced where `src` is set, otherwise notional)

import { NTD_PER_USD } from './taiwan_fms.js';

const ntd = usdM => usdM * NTD_PER_USD / 1000;

export const CATS = [
  { id: 'ascm', t: 'Coastal anti-ship missiles', col: '--c3', k: 70, base: 0.30, reach: 150, w: 0.6, cls: 'mobile',
    unit: 'Harpoon coastal launcher with its share of missiles and radars', cost: ntd(2370 / 100), s: 'Truck-mounted anti-ship missiles along the coast.',
    src: 'https://web.archive.org/web/20210618131826/https://www.dsca.mil/press-media/major-arms-sales/taipei-economic-and-cultural-representative-office-united-states-17', srcName: 'DSCA 20-68', est: true,
    basis: 'Harpoon Coastal Defense System, notified Oct. 26, 2020: up to 100 launchers, 25 radars and 400 missiles for US$2.37bn.' },
  { id: 'drones', t: 'Drones and USVs', col: '--c2', k: 45, base: 0.10, reach: 60, w: 0.5, cls: 'mobile',
    unit: '1,000 drones or one-way boats (line average)', cost: 55.9 / 40700 * 1000, s: 'Attack and reconnaissance drones, one-way uncrewed boats.',
    src: 'https://focustaiwan.tw/politics/202609030018', srcName: 'Focus Taiwan, Sept. 3, 2026', est: true,
    basis: 'Taiwan\'s own uncrewed line in the supplementary request: NT$55.9bn for more than 40,000 coastal attack drones, 600 reconnaissance drones and 100 one-way boats, averaged.' },
  { id: 'mines', t: 'Sea mines and minelayers', col: '--c5', k: 18, base: 0.15, reach: 15, w: 0.45, cls: 'mines',
    unit: 'lot of 100 mines', cost: 0.4, s: 'Mines laid off the landing areas before the assault.' },
  { id: 'strike', t: 'HIMARS and long-range strike', col: '--c4', k: 90, base: 0.15, reach: 200, w: 0.3, cls: 'mobile',
    unit: 'HIMARS launcher with its share of rockets and missiles', cost: ntd(4050 / 82), s: 'Rocket and missile fires on embarkation ports and the fleet.',
    src: 'https://web.archive.org/web/20260521192519/https://www.dsca.mil/Press-Media/Major-Arms-Sales/Article-Display/Article/4363081/taipei-economic-and-cultural-representative-office-in-the-united-states-high-mo', srcName: 'DSCA 26-01', est: true,
    basis: 'HIMARS case notified Dec. 17, 2025: 82 launchers, 420 ATACMS and 1,203 GMLRS pods for US$4.05bn.' },
  { id: 'airdef', t: 'Air and missile defense', col: '--c1', k: 140, base: 0.30, reach: 0, w: 0, cls: 'fixed',
    unit: 'NASAMS fire unit with its share of missiles', cost: ntd(1160 / 3), s: 'Protects launchers, sensors and bases from the opening strikes.',
    src: 'https://media.defense.gov/2024/Dec/18/2003615483/-1/-1/0/PRESS%20RELEASE%20-%20TECRO%2024-48%20CN.PDF', srcName: 'DSCA 24-48', est: true,
    basis: 'NASAMS case notified Oct. 25, 2024: 3 systems, 3 Sentinel radars and 123 AMRAAM-ER missiles for US$1.16bn.' },
  { id: 'c4isr', t: 'C4ISR and resilience', col: '--c6', k: 35, base: 0.25, reach: 0, w: 0, cls: 'mobile',
    unit: 'resilience package', cost: 0.5, s: 'Sensors, backup networks, hardening, decoys and dispersal.' },
  { id: 'ammo', t: 'Ammunition stocks', col: '--c7', k: 60, base: 0.25, reach: 0, w: 0, cls: 'fixed',
    unit: 'day of wartime stock', cost: 2.0, s: 'Missiles and munitions to keep firing after day one.' },
  { id: 'platforms', t: 'Big-ticket platforms', col: '--c8', k: 450, base: 0.30, reach: 200, w: 0.45, cls: 'platform',
    unit: 'F-16 Block 70, program cost', cost: ntd(8000 / 66), s: 'Fighters, submarines, large surface ships.',
    src: 'https://media.defense.gov/2024/Dec/18/2003615456/-1/-1/0/TECRO_19-50.PDF', srcName: 'DSCA 19-50', est: true,
    basis: 'F-16 case notified Aug. 20, 2019: 66 F-16C/D Block 70 with engines, avionics and support for US$8bn.' },
  { id: 'other', t: 'Not modeled', col: '--faint', k: 1, base: 0, reach: 0, w: 0, cls: 'none',
    unit: '', cost: 0, s: 'Classified programs, personnel and pay. Money here has no effect in the model.' },
];

export const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));

// Shares of the total (sum to 1). Preset mixes are notional illustrations of two schools of thought.
export const PRESETS = {
  porcupine: { t: 'Porcupine', s: 'Many small, mobile, cheap things',
    mix: { ascm: 0.22, drones: 0.24, mines: 0.1, strike: 0.1, airdef: 0.1, c4isr: 0.1, ammo: 0.11, platforms: 0.03, other: 0 } },
  legacy: { t: 'Legacy platforms', s: 'Fighters, submarines and big ships first',
    mix: { ascm: 0.05, drones: 0.03, mines: 0.02, strike: 0.05, airdef: 0.15, c4isr: 0.04, ammo: 0.06, platforms: 0.6, other: 0 } },
  even: { t: 'Even split', s: 'The same amount to each modeled category',
    mix: { ascm: 0.125, drones: 0.125, mines: 0.125, strike: 0.125, airdef: 0.125, c4isr: 0.125, ammo: 0.125, platforms: 0.125, other: 0 } },
};

// Crossing geometry (notional).
export const CROSSING = { km: 160, knots: 12 };
