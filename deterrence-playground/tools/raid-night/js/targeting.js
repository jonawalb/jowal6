// Target-selection ("lock") orders. Cycling with the arrow keys (or A/D in hard mode) walks the live tracks
// in the chosen order. When a battery has no live target it locks onto the first track in that order that its
// selected weapon can reach from its own sites; in hard mode it prefers tracks bound for its own cities. If no
// track is in reach it takes the first track bound for its cities, then the first track overall.
import { WEAPONS, THREATS } from '../data/params.js';
import { liveThreats, tti } from './sim.js';

export const ORDERS = [
  { k: 'closest', name: 'Closest', help: 'closest: soonest time to impact first' },
  { k: 'fastest', name: 'Fastest', help: 'fastest: ballistic, then cruise, then drones; soonest impact breaks ties' },
  { k: 'ltr', name: 'Left → right', help: 'left to right across the map' },
  { k: 'rtl', name: 'Right → left', help: 'right to left across the map' },
];
export const ORDER_KEYS = ORDERS.map(o => o.k);
export const orderInfo = k => ORDERS.find(o => o.k === k) || ORDERS[0];

const CMP = {
  closest: (a, b) => tti(a) - tti(b),
  fastest: (a, b) => THREATS[b.type].speed - THREATS[a.type].speed || tti(a) - tti(b),
  ltr: (a, b) => a.x - b.x || tti(a) - tti(b),
  rtl: (a, b) => b.x - a.x || tti(a) - tti(b),
};

/** Live tracks sorted by a lock order. */
export const ordered = (S, k) => liveThreats(S).sort(CMP[k] || CMP.closest);

/** Auto-lock pick: reachable by weapon w from the given sites (range and kill chance only) and bound for one of
 *  `cities` (null = any city), then reachable, then bound for those cities, then the first track. */
export function autoLock(list, w, sites, cities = null) {
  const W = WEAPONS[w];
  const reach = th => W.pk[th.type] > 0 && sites.some(i => Math.hypot(W.sites[i].x - th.x, W.sites[i].y - th.y) <= W.range);
  const mine = th => !cities || cities.includes(th.city);
  const th = list.find(t => reach(t) && mine(t)) || list.find(reach) || list.find(mine) || list[0];
  return th ? th.id : null;
}

/** Next (d = 1) or previous (d = -1) track id after `cur` in the list; auto-lock when nothing is selected. */
export function cycleId(list, cur, d, w, sites, cities = null) {
  if (!list.length) return null;
  const i = list.findIndex(t => t.id === cur);
  if (i < 0) return autoLock(list, w, sites, cities);
  return list[(i + d + list.length) % list.length].id;
}
