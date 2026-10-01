// The Target State adapts each quarter. It picks two responses, weighted by where the pressure is coming from,
// and they take effect from the next quarter. It never sees your next move.
import { PARTNERS } from '../data/partners.js';

export const RESPONSES = {
  reroute: { label: 'Reroutes trade through neutral hubs', short: 'Reroute' },
  evade: { label: 'Builds evasion networks (front companies, alternative payments)', short: 'Evasion' },
  counter: { label: 'Counter-sanctions a partner', short: 'Counter' },
  rally: { label: 'Rallies the public against foreign pressure', short: 'Rally' },
};

/** The member a wedge strategy should hit: the least committed, weighted by how much it trades with the Target. */
export function weakestMember(s) {
  let best = null, bv = -Infinity;
  for (const d of PARTNERS) {
    const st = s.partners[d.id];
    if (!st.member) continue;
    const v = (100 - st.commit) * (0.5 + d.exposure);
    if (v > bv) { bv = v; best = d.id; }
  }
  return best;
}

/** Weights for each response given this quarter's pressure. */
export function responseWeights(s, q) {
  const p = s.pol;
  const weak = weakestMember(s);
  return {
    reroute: 1 + (q.g.energy.rev + q.g.tech.econ + q.g.shipping.rev) / 8 * (1 - 0.35 * p.secondary),
    evade: 1 + (q.g.finance.econ + q.g.elites.elite) / 6 * (1 - 0.25 * p.customs),
    counter: weak ? 0.6 + (100 - s.partners[weak].commit) / 25 : 0,
    rally: 0.8 + q.econHit / 8,
  };
}

/** Choose two distinct responses with the AI stream `r`. */
export function chooseResponses(s, q, r) {
  const w = responseWeights(s, q);
  const ids = Object.keys(w), out = [];
  for (let k = 0; k < 2; k++) {
    const left = ids.filter(i => !out.includes(i) && w[i] > 0);
    if (!left.length) break;
    out.push(left[r.pick(left.map(i => w[i]))]);
  }
  return out;
}

/** Apply chosen responses to the state (mutates `s`). Returns log lines. */
export function applyResponses(s, picks) {
  const p = s.pol, log = [];
  for (const id of picks) {
    if (id === 'reroute') { s.tgt.reroute += 10 * (1 - 0.35 * p.secondary); log.push({ id, text: RESPONSES.reroute.label }); }
    if (id === 'evade') { s.tgt.evasion += 10 * (1 - 0.3 * p.customs); log.push({ id, text: RESPONSES.evade.label }); }
    if (id === 'rally') { s.tgt.rally += 7 * (1 - 0.15 * p.elites.lvl); log.push({ id, text: RESPONSES.rally.label }); }
    if (id === 'counter') {
      const w = weakestMember(s);
      if (w) { s.partners[w].counter += 3.5; log.push({ id, who: w, text: `${RESPONSES.counter.label}: the ${PARTNERS.find(d => d.id === w).name}` }); }
    }
  }
  return log;
}
