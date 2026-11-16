// Daily stock-and-flow model of Taiwan's fuel stocks and grid under a blockade.
// Forked from tools/energy-blockade/js/model.js (same logic; horizon is a parameter, no demand-reduction measures).
// Units: a fuel "day" is one day of its normal total consumption. Grid output is a share of normal generation.
import { MIX, POWER_SHARE, SECTORS, POLICIES, ENERGY_NOTIONAL } from '../data/energy.js';

const FK = ['lng', 'coal', 'oil'];

/** Split available power across sectors in the policy's priority order. Returns served share per sector. */
export function allocate(supply, policyKey) {
  const pol = POLICIES.find(p => p.k === policyKey) || POLICIES[0];
  const got = Object.fromEntries(SECTORS.map(s => [s.k, 0]));
  let left = supply;
  for (const [k, part] of pol.tiers) {
    const want = SECTORS.find(s => s.k === k).share * part;
    const give = Math.max(0, Math.min(want, left));
    got[k] += give; left -= give;
  }
  return Object.fromEntries(SECTORS.map(s => [s.k, s.share > 0 ? Math.min(1, got[s.k] / s.share) : 1]));
}

/**
 * cfg: { horizon, energyCut (0-1, share of inbound energy cargo stopped), dur (days), stock: {lng,coal,oil}, policy }
 * Returns per-day { stock, supply (share of normal demand met), served: {sector: share} } and run-out days.
 */
export function simulateEnergy(cfg) {
  const H = cfg.horizon, cut = cfg.energyCut;
  const stock = { ...cfg.stock }, cap0 = { ...cfg.stock };
  const days = [];
  const runout = { lng: null, coal: null, oil: null };
  const yieldPer = { lng: MIX.gas / POWER_SHARE.lng, coal: MIX.coal / POWER_SHARE.coal, oil: MIX.oil / POWER_SHARE.oil };
  for (let t = 0; t < H; t++) {
    const blockaded = t < cfg.dur;
    const inflow = blockaded ? 1 - cut : 1 + ENERGY_NOTIONAL.restock;
    const avail = Object.fromEntries(FK.map(k => [k, stock[k] + inflow]));
    let rest = Math.max(0, 1 - MIX.renew * ENERGY_NOTIONAL.renewAvail);
    let supply = Math.min(1, MIX.renew * ENERGY_NOTIONAL.renewAvail);
    const dispatch = (fk, cap, per) => {
      const g = Math.min(cap, rest, avail[fk] * per);
      supply += g; rest -= g; avail[fk] -= g / per;
    };
    dispatch('coal', MIX.coal, yieldPer.coal);  // coal first to stretch LNG
    dispatch('lng', MIX.gas, yieldPer.lng);
    dispatch('oil', MIX.oil, yieldPer.oil);
    FK.forEach(k => { avail[k] -= Math.min(1 - POWER_SHARE[k], avail[k]); });  // non-power uses take what is left
    FK.forEach(k => {
      stock[k] = Math.min(Math.max(cap0[k], 0), Math.max(0, avail[k]));
      if (runout[k] == null && blockaded && stock[k] <= 1e-6 && cap0[k] > 0) runout[k] = t;
    });
    days.push({ stock: { ...stock }, supply, served: allocate(supply, cfg.policy) });
  }
  return { days, runout, cap0 };
}
