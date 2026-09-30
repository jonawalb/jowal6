// Resupply between waves (notional game mechanic). Pure functions on the sim state, shared by the live game
// and the headless rule replays so both get the same budget (S.budget, set by mode) and the same prices.
// An order counts reloads per weapon: one reload is RESUPPLY[w].per rounds for RESUPPLY[w].pts points.
import { WEAPONS, WEAPON_ORDER, RESUPPLY } from '../data/params.js';

export const emptyOrder = () => ({ gun: 0, sri: 0, lri: 0 });
export const orderCost = o => WEAPON_ORDER.reduce((a, w) => a + (o[w] || 0) * RESUPPLY[w].pts, 0);

/** Most reloads of weapon w that still fit in its magazine (the last reload may be partly used). */
export const maxReloads = (S, w) => Math.ceil(Math.max(0, WEAPONS[w].mag - S.ammo[w]) / RESUPPLY[w].per);

/** Can one more reload of w be added to the order? */
export function canAdd(S, o, w) {
  return (o[w] || 0) < maxReloads(S, w) && orderCost(o) + RESUPPLY[w].pts <= S.budget;
}

/** Load an order into the magazines. Over-budget or over-capacity parts are dropped. Returns what was added. */
export function applyResupply(S, order) {
  const o = emptyOrder();
  for (const w of WEAPON_ORDER) {
    const n = Math.max(0, Math.floor(order?.[w] || 0));
    for (let i = 0; i < n && canAdd(S, o, w); i++) o[w]++;
  }
  const added = emptyOrder();
  for (const w of WEAPON_ORDER) {
    added[w] = Math.min(o[w] * RESUPPLY[w].per, WEAPONS[w].mag - S.ammo[w]);
    S.ammo[w] += added[w];
  }
  S.resupplied.push({ before: S.wave + 2, pts: orderCost(o), reloads: o, added });
  return added;
}

/**
 * The rules' default order: spend the same budget in proportion to the points' worth of what was fired in the
 * wave just ended (rounds fired / rounds per reload x points per reload), rounded down and capped at a full
 * magazine. Leftover points then buy one reload at a time for the weapon with the largest share that still
 * has room and fits the budget.
 */
export function proportionalOrder(S) {
  const worth = Object.fromEntries(WEAPON_ORDER.map(w =>
    [w, Math.max(0, S.startAmmo[w] - S.ammo[w]) / RESUPPLY[w].per * RESUPPLY[w].pts]));
  const tot = WEAPON_ORDER.reduce((a, w) => a + worth[w], 0);
  const o = emptyOrder();
  if (!tot) return o;
  for (const w of WEAPON_ORDER) {
    o[w] = Math.min(maxReloads(S, w), Math.floor(S.budget * worth[w] / tot / RESUPPLY[w].pts));
  }
  const byShare = WEAPON_ORDER.filter(w => worth[w] > 0).sort((a, b) => worth[b] - worth[a]);
  for (let more = true; more;) {
    more = false;
    for (const w of byShare) if (canAdd(S, o, w)) { o[w]++; more = true; break; }
  }
  return o;
}
