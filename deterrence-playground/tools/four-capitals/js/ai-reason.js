// The computer's main reason for a month's choice, for the after-action replay (Batch C). Its utility (js/ai.js) is a
// sum of terms; the reason is the term that gained most against holding with no moves: one of its six objectives,
// home support, the belief-weighted risk, an opening to exploit, payoffs after this month, saving stocks, or a hidden
// trait; its type's taste for intensity only when nothing more concrete gained. A short record: { term, text, v }
// (v in utility points).
import { COUNTRIES } from '../data/countries.js';
import { BY_ID } from '../data/actions.js';
import { TRAITS } from './traits.js';

/** `p1`, `p0`: the utility's parts for the chosen move and for holding with no moves. */
export function mainReason(s, who, weights, p1, p0, move) {
  const obs = COUNTRIES[who].objectives;
  let tw = obs.reduce((t, o) => t + (weights[o.id] || 0), 0);
  const w = tw > 0 ? weights : Object.fromEntries(obs.map(o => [o.id, 1]));
  if (tw <= 0) tw = obs.length;
  const terms = obs.map(o => [`obj:${o.id}`, `to improve “${o.label}”`, (w[o.id] || 0) * (o.measure(p1.n) - o.measure(p0.n)) / tw]);
  // Later payoffs: name the move that carries the biggest one.
  const lat = (move?.actions || []).map(id => [id, BY_ID[id].ai ? BY_ID[id].ai(s, who) : 0]).sort((a, b) => b[1] - a[1])[0];
  terms.push(
    ['support', 'to shore up support at home', p1.sup - p0.sup],
    ['risk', who === 'cn' ? 'to keep the risk of a U.S. or Japanese response down' : 'to avoid looking weak to Beijing', p1.risk - p0.risk],
    ['opening', 'a rival looked weak: an opening to exploit', p1.opp - p0.opp],
    ['later', lat && lat[1] > 0 ? `the later payoff of “${BY_ID[lat[0]].label}”` : 'payoffs expected after this month', p1.later - p0.later],
    ['stocks', 'to save fuel and munitions', p0.scar - p1.scar],
    ['trait', s.traits?.[who] ? `its leader’s ${TRAITS[s.traits[who]].label.toLowerCase()} streak` : 'its leader’s trait', p1.trait - p0.trait],
  );
  // The type's taste (how much it likes intensity) only leads when nothing more concrete gained.
  const taste = ['taste', p1.int < 0 ? 'its leader’s instinct to lower the temperature' : 'its leader’s appetite for firm action', p1.taste - p0.taste];
  let [term, text, v] = terms.reduce((a, b) => (b[2] > a[2] ? b : a));
  if (!(v > 0.1)) [term, text, v] = taste;
  if (!(v > 0.1)) return { term: 'none', text: 'nothing looked worth its cost, so it kept its moves small', v: 0 };
  return { term, text, v: Math.round(v * 10) / 10 };
}
