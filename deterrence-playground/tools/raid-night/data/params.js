// Notional game parameters. None of these describe a real weapon system: ranges, speeds, reload times,
// magazine sizes, kill probabilities and damage points are invented for play and marked "notional" on the page.
// Units: the field is 1000 x 720 game units; times are game seconds.
import { COST } from './costs.js';

export const FIELD = { W: 1000, H: 720, coastY: 548 };

export const CITIES = [
  { k: 'A', name: 'City A', x: 140, y: 632 },
  { k: 'B', name: 'City B', x: 380, y: 612 },
  { k: 'C', name: 'City C', x: 620, y: 612 },
  { k: 'D', name: 'City D', x: 860, y: 632 },
];

export const WEAPON_ORDER = ['gun', 'sri', 'lri'];
export const WEAPONS = {
  gun: { name: 'Guns and EW', short: 'Guns / EW', lc: 'guns and EW', key: '1', mag: 170, reload: 0.45, range: 105, speed: 700,
    pk: { drone: 0.55, cruise: 0.25, ballistic: 0 },
    sites: [{ x: 140, y: 606 }, { x: 380, y: 586 }, { x: 620, y: 586 }, { x: 860, y: 606 }] },
  sri: { name: 'Short-range interceptor', short: 'Short-range', lc: 'short-range interceptors', key: '2', mag: 46, reload: 1.1, range: 270, speed: 260,
    pk: { drone: 0.85, cruise: 0.75, ballistic: 0.2 },
    sites: [{ x: 262, y: 598 }, { x: 740, y: 598 }] },
  lri: { name: 'Long-range interceptor', short: 'Long-range', lc: 'long-range interceptors', key: '3', mag: 22, reload: 1.5, range: 600, speed: 340,
    pk: { drone: 0.9, cruise: 0.85, ballistic: 0.8 },
    sites: [{ x: 430, y: 690 }, { x: 570, y: 690 }] },
};

export const THREAT_ORDER = ['drone', 'cruise', 'ballistic'];
export const THREATS = {
  drone: { name: 'One-way attack drone', short: 'Drone', speed: 15, dmg: 1, weave: 12 },
  cruise: { name: 'Cruise missile', short: 'Cruise', speed: 32, dmg: 3, weave: 0 },
  ballistic: { name: 'Ballistic missile', short: 'Ballistic', speed: 72, dmg: 6, weave: 0 },
};

// Tracks per wave (the real raid mix is scaled to these totals) and spawn windows in game seconds.
export const WAVE_TRACKS = [30, 36, 40];
export const SPAWN = {
  drone: [0, 26],
  cruise: [10, 30],
  ballistic: [27, 40], // arrives in salvos of 2–5
};
export const SPEED = { normal: 1, reduced: 0.55 };

// Modes: Easy and Normal share one defense and the same controls; Hard splits it into two batteries.
export const MODES = ['easy', 'normal', 'hard'];
export const MODE_NAME = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

// Resupply between waves (NOTIONAL game mechanic). Before waves 2 and 3 the defender gets `budget[mode]` points
// to buy reloads; unspent points are lost and no weapon can be filled past its dusk magazine.
// Interceptor prices are scaled to the midpoint of the sourced unit-cost range in data/costs.js at one point
// per `usdPerPoint` million dollars, rounded, minimum 1 (short-range ~$70,000 -> 1 point, long-range $2.5m ->
// 25 points). Guns and EW have no sourced cost, so their price is purely notional.
const scaled = w => Math.max(1, Math.round((COST[w].lo + COST[w].hi) / 2 / 0.1));
export const RESUPPLY = {
  budget: { easy: 200, normal: 100, hard: 100 }, // points per break by mode, notional (Easy is 2x Normal)
  usdPerPoint: 0.1,   // $ millions per point, used only to scale interceptor prices
  gun: { per: 10, pts: 1 },            // 10 bursts per point: notional, no sourced cost
  sri: { per: 1, pts: scaled('sri') }, // scaled from the Iron Dome-like cost range
  lri: { per: 1, pts: scaled('lri') }, // scaled from the Arrow-like cost range
};

// Hard mode (NOTIONAL game mechanic): the defense splits into two batteries at the middle of the map.
// Site indices refer to WEAPONS[w].sites. Both batteries draw on the same magazines.
export const BATTERIES = {
  L: { name: 'Left battery', short: 'Left', cities: ['A', 'B'], sites: { gun: [0, 1], sri: [0], lri: [0] } },
  R: { name: 'Right battery', short: 'Right', cities: ['C', 'D'], sites: { gun: [2, 3], sri: [1], lri: [1] } },
};
export const ALL_SITES = Object.fromEntries(WEAPON_ORDER.map(w => [w, WEAPONS[w].sites.map((_, i) => i)]));
