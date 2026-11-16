// Computer strategies, used for the end-of-game comparison and the balance script. Each returns a quarter's actions.

import { HUB_IDS } from './network.js';

const busiest = s => [...HUB_IDS].filter(h => s.hubs[h].cap > 0).sort((a, b) => s.hubs[b].cap - s.hubs[a].cap);
const seenShells = s => s.shells.filter(x => x.seen && !x.listed).map(x => x.id);

export const STRATEGIES = {
  /** Do nothing (the baseline). */
  none: () => [],
  /** List every identified shell and check the busiest hubs: whack-a-mole. */
  whack: s => {
    const out = [{ k: 'agents', v: 1 }];
    for (const id of seenShells(s)) out.push({ k: 'list', t: id });
    const b = busiest(s); out.push({ k: 'euc', t: b[0] }, { k: 'euc', t: b[0] }, { k: 'euc', t: b[1] });
    return out;
  },
  /** Rules first: cloud KYC and location verification early, relax licensing to pay for them. */
  rules: s => {
    const out = [];
    if (s.turn === 0) out.push({ k: 'relax' }, { k: 'kyc' });
    if (s.turn === 1) out.push({ k: 'relax' }, { k: 'lv' });
    if (s.turn >= 2) out.push({ k: 'agents', v: 1 });
    for (const id of seenShells(s)) out.push({ k: 'list', t: id });
    return out;
  },
  /** Balanced: standing agents, hub coordination, targeted listings, cloud KYC once capital allows. */
  balanced: s => {
    const out = [{ k: 'agents', v: 2 }];
    const b = busiest(s);
    if (s.pol.kyc == null && s.capital >= 14) out.push({ k: 'kyc' });
    if (s.hubs[b[0]].lvl < 1) out.push({ k: 'hub', t: b[0] });
    for (const id of seenShells(s)) out.push({ k: 'list', t: id });
    out.push({ k: 'euc', t: b[0] });
    if (s.goodwill < 50) out.unshift({ k: 'relax' });
    return out;
  },
  /** Everything at once, every quarter. */
  max: s => {
    const out = [{ k: 'agents', v: 3 }, { k: 'kyc' }, { k: 'lv' }];
    for (const h of busiest(s)) out.push({ k: 'hub', t: h }, { k: 'euc', t: h });
    for (const id of seenShells(s)) out.push({ k: 'list', t: id });
    return out;
  },
};
export const STRATEGY_LABEL = { none: 'No enforcement', whack: 'List and check (whack-a-mole)', rules: 'Rules first', balanced: 'Balanced', max: 'Everything at once' };

// Used only by the balance script to probe the ceiling.
export const PROBES = {
  smart: s => {
    const out = [{ k: 'agents', v: 1 }];
    if (s.turn === 0) out.push({ k: 'kyc' });
    const b = busiest(s);
    for (const id of seenShells(s)) out.push({ k: 'list', t: id });
    out.push({ k: 'euc', t: b[0] });
    if (s.capital < 10) out.unshift({ k: 'relax' });
    return out;
  },
  lvOnly: s => s.turn === 0 ? [{ k: 'relax' }, { k: 'lv' }] : (s.turn === 1 ? [{ k: 'relax' }] : []),
  agents2: () => [{ k: 'agents', v: 2 }],
};
PROBES.agents3 = () => [{ k: 'agents', v: 3 }];
PROBES.smart2 = s => {
  const out = [{ k: 'agents', v: 2 }];
  if (s.turn === 0) out.push({ k: 'kyc' });
  const hot = [...HUB_IDS].filter(h => s.hubs[h].cap > 0).sort((a, b) => s.shells.filter(x => x.hub === b && x.seen && !x.listed).length - s.shells.filter(x => x.hub === a && x.seen && !x.listed).length);
  for (const id of seenShells(s)) out.push({ k: 'list', t: id });
  out.push({ k: 'euc', t: busiest(s)[0] });
  if (s.capital < 10) out.unshift({ k: 'relax' });
  return out;
};
