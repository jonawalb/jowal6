// Computer strategies for your seat. `sensible` is the benchmark you are compared with; `everything` and
// `minimal` are the two foils the balance script checks it against. Heuristics, not a search.
import { PARTNERS } from '../data/partners.js';
import { quarter, cohesion } from './model.js';
import { courtOdds } from './engine.js';

const add = (acts, m, a, b) => { if (acts.length < 3 && !acts.some(x => x.m === m)) acts.push({ m, a, b }); };

/** Coalition-preserving play: targeted first, enforcement once the coalition can bear it, look after the weakest partner. */
export function sensible(s, r) {
  const acts = [], p = s.pol, q = quarter(s), coh = cohesion(s);
  const jitter = () => (r ? r.u() : 0.5);
  // 1. Look after the weakest member before it walks.
  const members = PARTNERS.filter(d => s.partners[d.id].member).map(d => ({ d, st: s.partners[d.id] }))
    .sort((x, y) => x.st.commit - y.st.commit);
  const weak = members[0];
  if (weak && weak.st.commit < 45) add(acts, 'coalition', weak.d.id, weak.st.cost > weak.d.tol + 2 && weak.d.id === 'energy' ? 'exempt' : 'compensate');
  else if (weak && weak.st.commit < 58 && s.turn > 0) add(acts, 'coalition', weak.d.id, 'reassure');
  // 2. Opening package: targeted and capped, not broad.
  if (s.turn === 0) { add(acts, 'energy', 'cap', 2); add(acts, 'finance', 'banks', 2); add(acts, 'elites', undefined, 2); return acts; }
  if (p.tech.lvl === 0) add(acts, 'tech', undefined, 2);
  if (p.customs === 0) add(acts, 'enforce', 'customs', 1);
  // 3. Plug leaks once the coalition is solid enough to bear the cost.
  if (q.leak > 0.33 && coh > 58) {
    if (p.secondary === 0) add(acts, 'enforce', 'secondary', 1);
    else if (p.shipping.lvl < 2) add(acts, 'shipping', undefined, p.shipping.lvl + 1);
    else if (p.maritime === 0 && q.L.energy > 0.35) add(acts, 'enforce', 'maritime', 1);
  }
  if (p.shipping.lvl === 0 && jitter() < 0.5) add(acts, 'shipping', undefined, 1);
  // 4. Bring an outsider in when it is cheap to try.
  const out = PARTNERS.filter(d => !s.partners[d.id].member).sort((a, b) => courtOdds(s, b.id) - courtOdds(s, a.id))[0];
  if (out && coh > 60 && courtOdds(s, out.id) > 0.3 && jitter() < 0.45) add(acts, 'coalition', out.id, 'court');
  // 5. Turn up the targeted measures while partners can take it.
  if (coh > 62) {
    if (p.elites.lvl < 3) add(acts, 'elites', undefined, p.elites.lvl + 1);
    if (p.energy.lvl < 3 && jitter() < 0.6) add(acts, 'energy', 'cap', p.energy.lvl + 1);
    if (p.finance.lvl < 3 && jitter() < 0.4) add(acts, 'finance', 'banks', p.finance.lvl + 1);
  }
  // 6. Ease the heaviest burden when the coalition is fraying.
  if (coh < 45 && p.secondary > 0) add(acts, 'enforce', 'secondary', 0);
  return acts;
}

/** Everything at once: the heaviest version of every measure, as fast as the three-a-quarter limit allows. */
export function everything(s) {
  const acts = [], p = s.pol;
  if (p.energy.lvl < 3 || p.energy.mode !== 'embargo') add(acts, 'energy', 'embargo', 3);
  if (p.finance.lvl < 3 || p.finance.mode !== 'cb') add(acts, 'finance', 'cb', 3);
  if (p.tech.lvl < 3) add(acts, 'tech', undefined, 3);
  if (p.elites.lvl < 3) add(acts, 'elites', undefined, 3);
  if (p.shipping.lvl < 3) add(acts, 'shipping', undefined, 3);
  if (p.secondary < 2) add(acts, 'enforce', 'secondary', 2);
  else if (p.maritime < 2) add(acts, 'enforce', 'maritime', 2);
  else if (p.customs < 2) add(acts, 'enforce', 'customs', 2);
  return acts;
}

/** Minimal: a light, symbolic package and reassurance, never more. */
export function minimal(s) {
  const acts = [];
  if (s.turn === 0) { add(acts, 'energy', 'cap', 1); add(acts, 'elites', undefined, 1); return acts; }
  const weak = PARTNERS.filter(d => s.partners[d.id].member).sort((a, b) => s.partners[a.id].commit - s.partners[b.id].commit)[0];
  if (weak) add(acts, 'coalition', weak.id, 'reassure');
  return acts;
}

/** Uniformly random legal-looking choices (tests only). */
export function random(s, r) {
  const ms = ['energy', 'finance', 'tech', 'elites', 'shipping', 'enforce', 'coalition'], acts = [];
  const n = Math.floor(r.u() * 4);
  for (let i = 0; i < n; i++) {
    const m = ms[Math.floor(r.u() * ms.length)];
    if (m === 'enforce') add(acts, m, ['secondary', 'maritime', 'customs'][Math.floor(r.u() * 3)], Math.floor(r.u() * 3));
    else if (m === 'coalition') add(acts, m, PARTNERS[Math.floor(r.u() * PARTNERS.length)].id, ['reassure', 'compensate', 'exempt', 'court'][Math.floor(r.u() * 4)]);
    else add(acts, m, m === 'energy' ? (r.u() < 0.5 ? 'cap' : 'embargo') : m === 'finance' ? (r.u() < 0.5 ? 'banks' : 'cb') : undefined, Math.floor(r.u() * 4));
  }
  return acts;
}

export const STRATEGIES = { sensible, everything, minimal, random };
