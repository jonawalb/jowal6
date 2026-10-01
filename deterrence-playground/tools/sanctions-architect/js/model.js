// The economics of one quarter, as pure functions of the state. No DOM, no randomness.
// Every coefficient is illustrative game design (see METHOD.md), not an estimate.
import { P } from '../data/params.js';
import { PARTNERS, YOU } from '../data/partners.js';
import { SECTORS } from '../data/measures.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/** Gross effect of each sector measure in force, before leakage: revenue loss, economic hit, price shock, cost to others. */
export function gross(s) {
  const p = s.pol, out = {};
  const e = p.energy.lvl, emb = p.energy.mode === 'embargo';
  out.energy = { rev: e * (emb ? 11 : 6), econ: e * (emb ? 1 : 0.5), shock: e * (emb ? 4 : 0.8), cost: e * (emb ? 2.6 : 0.9) };
  const f = p.finance.lvl, cb = p.finance.mode === 'cb';
  out.finance = { rev: f * (cb ? 3 : 2), econ: f * (cb ? 4 : 3), shock: 0, cost: f * (cb ? 2.2 : 1.4), rally: f * (cb ? 1.6 : 0.4) };
  const t = p.tech.lvl;
  out.tech = { rev: 0, econ: t * 0.6 * Math.min(p.tech.q + 1, 5), shock: 0, cost: t * 1.1 };
  const el = p.elites.lvl;
  out.elites = { rev: 0, econ: el * 0.3, shock: 0, cost: el * 0.4, elite: el * 3 };
  const sh = p.shipping.lvl;
  out.shipping = { rev: sh * 2.5, econ: sh * 0.5, shock: sh * 0.6, cost: sh * 0.8 };
  return out;
}

const SEC = [1, 0.55, 0.3], MAR = [1, 0.75, 0.55], CUS = [1, 0.88, 0.76], CUS_IN = [1, 0.7, 0.5];

/** Share of each sector's pressure that leaks around the sanctions, with each partner's contribution. */
export function leakage(s) {
  const p = s.pol, reroute = 1 + s.tgt.reroute / 25;
  const by = {}, via = {};
  for (const sec of SECTORS) {
    let out = 0, inside = 0;
    for (const d of PARTNERS) {
      const st = s.partners[d.id];
      let x;
      if (!st.member) x = d.exposure * d.leak[sec] * reroute * SEC[p.secondary] * 1.3;
      else x = d.exposure * (1 - st.commit / 100) * 0.6 * CUS_IN[p.customs] + (st.exempt > 0 ? d.exposure * 0.25 : 0);
      if (st.member) inside += x; else out += x;
      via[d.id] = (via[d.id] || 0) + x / SECTORS.length;
    }
    let L = 0.04 + out + inside + (s.tgt.evasion / 250) * (sec === 'finance' || sec === 'elites' ? 1.4 : 0.8);
    L *= CUS[p.customs];
    if (sec === 'energy') L *= MAR[p.maritime] * (1 - 0.12 * p.shipping.lvl) * (p.energy.mode === 'embargo' ? 1.2 : 0.8);
    if (sec === 'tech') L *= 1 + 0.15 * Math.min(p.tech.q, 4);   // transshipment routes mature
    by[sec] = clamp(L, 0.02, 0.9);
  }
  return { by, via };
}

/** Everything that happens in a quarter given the policy in force (no rolls). */
export function quarter(s) {
  const g = gross(s), { by: L, via } = leakage(s), p = s.pol;
  let revLoss = 0, econHit = 0, grossPain = 0, shockT = 0;
  for (const sec of SECTORS) {
    revLoss += g[sec].rev * (1 - L[sec]);
    econHit += g[sec].econ * (1 - L[sec]);
    grossPain += g[sec].rev + g[sec].econ;
    shockT += g[sec].shock * (1 - 0.5 * L[sec]);
  }
  shockT += 1.5 * p.maritime + 0.5 * p.secondary;
  const shock = 0.5 * s.shock + shockT;
  const leak = grossPain > 0 ? 1 - (revLoss + econHit) / grossPain : weightedLeak(L);
  // A price spike pays the Target for every barrel that still gets through.
  const windfall = shock * 0.2 * (p.energy.mode === 'embargo' ? L.energy + 0.2 : 1);
  const revenue = clamp(100 - revLoss + windfall, 0, 130);
  const economy = clamp(s.tgt.economy - econHit * 0.5 + (100 - s.tgt.economy) * 0.05, 0, 100);
  const pain = Math.max(0, revLoss - windfall + econHit + (100 - economy) * 0.15);

  // Partners' costs this quarter.
  const cost = {};
  for (const d of PARTNERS) {
    const st = s.partners[d.id];
    let c = SECTORS.reduce((t, sec) => t + d.w[sec] * g[sec].cost, 0) * (st.member ? 1 : 0.3);
    c += st.counter + shock * (d.id === 'energy' ? 0.15 : 0.05);
    if (st.exempt > 0) c *= 0.4;
    cost[d.id] = c;
  }
  const own = SECTORS.reduce((t, sec) => t + YOU[sec] * g[sec].cost, 0) + shock * 0.12
    + 1.5 * p.secondary + 1.0 * p.maritime + 0.3 * p.customs;

  const eliteAdd = g.elites.elite * (1 - L.elites);
  const rallyAdd = 0.12 * econHit + g.finance.rally - p.elites.lvl * 1.0;
  return { g, L, via, revLoss, econHit, grossPain, shock, leak, windfall, revenue, economy, pain, cost, own, eliteAdd, rallyAdd };
}
const weightedLeak = L => SECTORS.reduce((t, k) => t + L[k], 0) / SECTORS.length;

/** Coalition cohesion 0–100: exposure-weighted commitment of members over everyone who ever was or is a member. */
export function cohesion(s) {
  let num = 0, den = 0;
  for (const d of PARTNERS) {
    const st = s.partners[d.id];
    if (!d.member && !st.member) continue;
    den += d.exposure;
    if (st.member) num += d.exposure * st.commit;
  }
  return den ? num / den : 0;
}

/** Credibility: how long the Target expects the sanctions to last, from cohesion. */
export const credibility = coh => 0.5 + 0.5 * coh / 100;

export const threshold = (s, type) => P.threshold[type] * P.demands[s.demand].mult * P.ambitions[s.ambition].mult;

/** Effective pressure on the Target and its parts. */
export function pressureParts(stock, elite, rally, coh) {
  const cred = credibility(coh);
  return { stock, cred, elite, rally, total: Math.max(0, stock * cred + elite - rally) };
}

export const pConcede = (pressure, thr) => P.concedeCap / (1 + Math.exp(-(pressure - thr) / (P.concedeSpread * thr)));

/** Your estimate of the concession chance, averaged over your belief about the Target's type. */
export const pExpected = (s, pressure) => P.types.reduce((t, k) => t + s.belief[k] * pConcede(pressure, threshold(s, k)), 0);
