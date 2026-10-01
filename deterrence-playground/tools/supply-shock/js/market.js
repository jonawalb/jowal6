// Supply arithmetic for one mineral in one year. No DOM.
// secure  = min(non-Supplier ore you can reach, non-Supplier refining you can use) + allied offtake + recycling.
// Everything else (dep) is routed through the Supplier. Controls withhold part of it; a stockpile can cover
// the gap until it runs out. shortfall = demand − (secure + Supplier deliveries + stockpile draw).
import { P } from '../data/params.js';
import { BY, IDS } from '../data/minerals.js';

const online = (s, m, kind) => s.projects.filter(p => p.m === m && p.kind === kind && p.status === 'online').reduce((t, p) => t + p.cap, 0);

export function demand(s, m) {
  const g = BY[m].game, x = s.m[m];
  return 100 * Math.pow(1 + g.growth, s.t) * (1 + (s.yr?.bump?.[m] || 0)) * (1 - x.thrift);
}

/** The parts of supply that the Supplier cannot touch. */
export function parts(s, m) {
  const D = demand(s, m), x = s.m[m];
  const ore = x.ore + online(s, m, 'mine');
  const ref = x.ref * (1 - (s.yr?.refOut?.[m] || 0)) + online(s, m, 'refinery');
  const off = s.yr?.offtakePause ? 0 : s.offtakes.filter(o => o.m === m && o.on).reduce((t, o) => t + o.cap, 0);
  const rec = x.recycled / 100 * D;
  const secure = Math.min(D, Math.min(ore, ref) + off + rec);
  return { D, ore, ref, off, rec, secure, dep: Math.max(0, D - secure), oreIdle: Math.max(0, ore - ref) };
}

/** Share of demand that runs through the Supplier (0–1). */
export const exposure = (s, m) => { const p = parts(s, m); return p.D ? p.dep / p.D : 0; };

/** Withheld share of Supplier-routed volume under a control level, after coalition relief. */
export const cutShare = (ctrl, coalition, years = 0) => (P.cut[ctrl] || 0) * (1 - P.coalitionRelief * coalition) * (1 - Math.min(P.adaptCap, P.adapt * years));

/** This year's supply for mineral m; draws down the stockpile in s (mutates s.m[m].stock). */
export function settle(s, m) {
  const p = parts(s, m), ctrl = s.ctrl[m];
  const withheld = p.dep * cutShare(ctrl, s.coalition, s.m[m].ctrlYears || 0);
  const avail = s.m[m].stock / 12 * p.D;
  const draw = Math.min(withheld, avail);
  s.m[m].stock = Math.max(0, s.m[m].stock - (p.D ? draw / p.D * 12 : 0));
  const shortfall = withheld - draw;
  return { m, ctrl, D: p.D, secure: p.secure, dep: p.dep, delivered: p.dep - withheld, withheld, draw, shortfall,
    met: p.D ? (p.D - shortfall) / p.D : 1, securePct: p.D ? p.secure / p.D : 1 };
}

/** Industry output index (100 = no shortfall) from this year's records. */
export const outputFrom = rows => 100 * (1 - rows.reduce((t, r) => t + BY[r.m].game.importance * (1 - r.met), 0));

/** Share of demand you could still meet, year after year, through a sustained ban on every mineral
 * (importance-weighted). Stockpiles do not count: they buy time, not supply. A buyers' coalition and the
 * small leakage of a ban do count. */
export function banProof(s) {
  return IDS.reduce((t, m) => {
    const p = parts(s, m), withheld = p.dep * cutShare('ban', s.coalition);
    return t + BY[m].game.importance * (p.D ? (p.D - withheld) / p.D : 1);
  }, 0);
}
