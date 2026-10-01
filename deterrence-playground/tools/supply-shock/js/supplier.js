// The Supplier: a computer opponent with a hidden type (commercial, coercive or opportunist).
// Each year, after you act, it decides mineral by mineral whether to impose export licensing, tighten to a ban,
// ease, or dump prices on a mineral where you are building capacity. Your read of its type is Bayes' rule
// over what it does, using the same probabilities it uses. No DOM.
import { P } from '../data/params.js';
import { IDS } from '../data/minerals.js';
import { exposure } from './market.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const buildingIn = (s, m) => s.projects.filter(p => p.status === 'build' && p.m === m).length;

/** Yearly move probabilities for mineral m if the Supplier were `type`. */
export function probs(s, type, m) {
  const k = P.sup[type], T = s.tension / 100, c = s.coalition;
  const V = exposure(s, m), cover = Math.min(1, s.m[m].stock / 12);
  return {
    impose: clamp(k.impose + k.tension * T + k.vuln * V * (1 - cover) - P.coalitionDeterrence * c, 0.003, 0.6),
    direct: k.direct,
    esc: clamp(k.esc + 0.1 * T - 0.03 * c, 0.01, 0.8),
    ease: clamp(k.ease + P.coalitionEase * c - 0.2 * T, 0.03, 0.9),
    dump: buildingIn(s, m) ? clamp(k.dump * Math.min(1, 0.5 * buildingIn(s, m)), 0, 0.6) : 0,
  };
}

/** The Supplier's moves this year. Three draws per mineral always, so the stream stays aligned. */
export function decide(s, r) {
  const moves = [];
  let fresh = 0;
  for (const m of IDS) {
    const p = probs(s, s.type, m), u1 = r.u(), u2 = r.u(), u3 = r.u();
    const from = s.ctrl[m];
    let to = from;
    if (from === 'open' && u1 < p.impose) {
      if (fresh < P.maxNewControls && s.t >= P.graceYears) { to = u2 < p.direct ? 'ban' : 'lic'; fresh++; }
    } else if (from === 'lic') to = u1 < p.ease ? 'open' : u1 < p.ease + p.esc ? 'ban' : 'lic';
    else if (from === 'ban') to = u1 < p.ease * 0.8 ? 'lic' : 'ban';
    const dump = s.m[m].dump === 0 && from !== 'ban' && u3 < p.dump;
    if (to !== from || dump) moves.push({ m, from, to, dump });
  }
  return moves;
}

/** Probability of what the Supplier did on mineral m (no move = staying put) under `type`. Ignores the cap. */
function likelihood(s, type, m, mv) {
  const p = probs(s, type, m), from = s.ctrl[m], to = mv ? mv.to : from;
  let l;
  if (from === 'open' && s.t < P.graceYears) l = 1;
  else if (from === 'open') l = to === 'open' ? 1 - p.impose : p.impose * (to === 'ban' ? Math.max(p.direct, 0.02) : 1 - p.direct);
  else if (from === 'lic') l = to === 'open' ? p.ease : to === 'ban' ? p.esc : 1 - p.ease - p.esc;
  else l = to === 'lic' ? p.ease * 0.8 : 1 - p.ease * 0.8;
  if (s.m[m].dump === 0 && from !== 'ban' && p.dump > 0) l *= mv && mv.dump ? p.dump : 1 - p.dump;
  return Math.max(l, 1e-4);
}

/** Update the belief (type → probability) from this year's moves, judged in the pre-move state s. */
export function updateBelief(belief, s, moves) {
  const out = {};
  for (const t of P.types) out[t] = belief[t] * IDS.reduce((x, m) => x * likelihood(s, t, m, moves.find(v => v.m === m)), 1);
  const z = P.types.reduce((a, t) => a + out[t], 0) || 1;
  for (const t of P.types) out[t] = Math.max(0.005, out[t] / z);
  const z2 = P.types.reduce((a, t) => a + out[t], 0);
  for (const t of P.types) out[t] /= z2;
  return out;
}

export const topType = b => P.types.reduce((a, t) => (b[t] > b[a] ? t : a));
