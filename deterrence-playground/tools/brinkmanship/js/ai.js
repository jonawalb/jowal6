// The Rival's mind: an equilibrium-inspired cutoff strategy, and Bayes' rule on what each side sees the other do.
// Pure functions; no DOM. The same strategy plays the Rival, the computer in your seat and the "equilibrium play"
// overlay, so you are always compared with the same benchmark the Rival uses.
import { P, TYPES, ACTIONS, value } from '../data/params.js';

const D = P.disaster;
const logistic = z => 1 / (1 + Math.exp(-z));

/** Risk after a round in which both sides stayed in, given how many raised (0, 1 or 2). */
export const nextRisk = (risk, raises) => Math.min(P.riskCap, risk + P.raise * raises + P.drift);

/**
 * The cutoff: the shared risk past which a side backs down.
 * Base: kappa × (value of the stake ÷ cost of disaster). A side that values the stake more will run more risk
 * (the core result of the brinkmanship models). The base shifts with what the side believes about the other:
 * up when it thinks the other is probably low resolve (it will fold soon, so hanging on pays), down when it thinks
 * the other is probably high resolve.
 */
export function cutoff(v, belief) {
  return P.ai.kappa * (v / D) * (1 + P.ai.lambda * (belief.low - belief.high));
}

/**
 * Action probabilities for a side with value v (its stake) and belief about the other, at the current risk.
 * Back down once next round's risk (if nobody raises) would pass the cutoff; while staying in, raise only if the
 * risk after raising stays below a share rho of the cutoff (room to spare); otherwise hold. Logistic edges of width
 * P.ai.slope make the rule a little noisy, which is also what lets the other side learn from it by Bayes' rule.
 */
export function act(v, risk, belief) {
  const C = cutoff(v, belief), s = P.ai.slope;
  const back = logistic((risk + P.drift - C) / s);
  const raise = (1 - back) * logistic((P.ai.rho * C - risk - P.raise) / s);
  return { raise, hold: Math.max(0, 1 - back - raise), back };
}

/** The policy for one side. view: { crisis, risk, round }. Returns { p, best, cutoff }. */
export function policy(view, myType, belief) {
  const v = value(view.crisis, myType);
  const p = act(v, view.risk, belief);
  const best = ACTIONS.reduce((b, a) => (p[a] > p[b] ? a : b), 'hold');
  return { p, best, cutoff: cutoff(v, belief) };
}

/** Draw an action from policy probabilities with a uniform u in [0,1). */
export function draw(p, u) {
  let x = u;
  for (const a of ACTIONS) { x -= p[a]; if (x < 0) return a; }
  return 'back';
}

const norm = b => {
  const out = {}; let z = 0;
  for (const t of TYPES) { out[t] = Math.max(P.ai.floor, b[t]); z += out[t]; }
  for (const t of TYPES) out[t] /= z;
  return out;
};

/**
 * Bayes' rule. An observer believed `prior` about the actor's type; the actor took `action` at `view`.
 * The observer assumes the actor plays this strategy for its type, with the actor's own (public) belief
 * `actorBelief`, and allows that any move might be a slip (chance P.ai.tremble, spread evenly).
 */
export function updateBelief(prior, view, action, actorBelief) {
  const post = {};
  for (const t of TYPES) post[t] = prior[t] * ((1 - P.ai.tremble) * policy(view, t, actorBelief).p[action] + P.ai.tremble / 3);
  const z = TYPES.reduce((s, t) => s + post[t], 0);
  if (!(z > 0)) return { ...prior };
  for (const t of TYPES) post[t] /= z;
  return norm(post);
}

/** My payoff when the round ends with my action a and theirs o (no roll), or null if both stayed in. */
export function endPay(a, o, myV) {
  if (a === 'back' && o === 'back') return myV / 2;
  if (a === 'back') return 0;
  if (o === 'back') return myV;
  return null;
}

/**
 * One simulated future for a side with type myT against an opponent of type opT, starting at `at`
 * ({ crisis, risk, round, mine, theirs }: mine = my belief about the opponent, theirs = its belief about me),
 * with my first move fixed. Afterwards both sides follow the cutoff rule and read each other by Bayes' rule.
 * Returns my points.
 */
export function rollout(at, myT, opT, first, u) {
  const { crisis } = at;
  const myV = value(crisis, myT);
  let { risk, round, mine, theirs } = at, me = first;
  for (;;) {
    const view = { crisis, risk, round };
    const op = draw(policy(view, opT, theirs).p, u());
    const pay = endPay(me, op, myV);
    if (pay !== null) return pay;
    const r2 = nextRisk(risk, (me === 'raise') + (op === 'raise'));
    if (u() < r2) return -D;
    if (round >= P.rounds) return myV / 2;
    [mine, theirs] = [updateBelief(mine, view, op, theirs), updateBelief(theirs, view, me, mine)];
    risk = r2; round++;
    me = draw(policy({ crisis, risk, round }, myT, mine).p, u());
  }
}

/**
 * Average points of each first move over n simulated futures. opType: a known opponent type (hindsight), or null
 * to draw it from my belief each time. rng: a seeded generator; every option uses the same random numbers.
 */
export function optionValues(at, myT, opType, n, mkRng) {
  const ev = {};
  for (const first of ACTIONS) {
    const r = mkRng();
    let sum = 0;
    for (let k = 0; k < n; k++) {
      const opT = opType || TYPES[r.pick(TYPES.map(t => at.mine[t]))];
      sum += rollout(at, myT, opT, first, r.u);
    }
    ev[first] = sum / n;
  }
  return ev;
}

/** Softmax over expected points: a near-best choice with a little noise (temperature in points). */
export function softmax(ev, temp = P.ai.temp) {
  const mx = Math.max(...ACTIONS.map(a => ev[a]));
  const w = Object.fromEntries(ACTIONS.map(a => [a, Math.exp((ev[a] - mx) / temp)]));
  const z = ACTIONS.reduce((x, a) => x + w[a], 0);
  return Object.fromEntries(ACTIONS.map(a => [a, w[a] / z]));
}

/**
 * The computer's actual choice: look ahead from the cutoff rule (one round of policy improvement). For each move,
 * simulate P.ai.looks futures with the opponent's type drawn from my belief, then softmax over the averages.
 * Returns { ev, p, best, cutoff }.
 */
export function think(at, myT, mkRng) {
  const ev = optionValues(at, myT, null, P.ai.looks, mkRng);
  const best = ACTIONS.reduce((b, a) => (ev[a] > ev[b] ? a : b), 'hold');
  return { ev, p: softmax(ev), best, cutoff: cutoff(value(at.crisis, myT), at.mine) };
}

