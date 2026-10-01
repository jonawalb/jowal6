// The computer's capitals: beliefs about every rival's hidden type (Bayes' rule on observed moves) and a
// one-month lookahead choice by softmax. The computer never reads another capital's true type.
import { P } from '../data/params.js';
import { COUNTRIES, IDS } from '../data/countries.js';
import { ACTIONS, POSTURES, BY_ID, TO, posturesFor, escRoom, isEsc, menu } from '../data/actions.js';
import { resolveTurn, blockedWhy, opening } from './engine.js';
import { deployIntensity } from './forces.js';
import { forceOrders } from './ai-forces.js';
import { makeRng, STREAM } from './rng.js';

const TYPES = P.types;

/** beliefs[observer][target] = { resolute, cautious, opportunist } from the priors. */
export function initBeliefs() {
  return Object.fromEntries(IDS.map(o => [o, Object.fromEntries(IDS.filter(t => t !== o).map(t => [t, { ...COUNTRIES[t].prior }]))]));
}

/** How hard a move reads: posture counts half, each escalatory move +1, each accommodating one −1,
 * plus forward deployment (massing in one area, Attack stances). */
export function intensity(move) {
  const lvl = (POSTURES.find(p => p.id === move.posture) || { level: 0 }).level;
  return 0.5 * lvl + move.actions.reduce((t, id) => t + (BY_ID[id].tags.includes('esc') ? 1 : BY_ID[id].tags.includes('soft') ? -1 : 0), 0) + deployIntensity(null, null, move.orders);
}

const GRID = []; for (let x = -4; x <= 5; x += 0.5) GRID.push(x);
const betaFor = (s, who, type) => type === 'opportunist' ? (opening(s, who) ? P.ai.beta.opportunistOpen : P.ai.beta.opportunistShut) : P.ai.beta[type];
/** P(this level of intensity | type): a proper distribution over the intensity grid. */
export function likelihood(s, who, move, type) {
  const b = betaFor(s, who, type);
  const z = GRID.reduce((t, x) => t + Math.exp(b * x), 0);
  const x = Math.max(-4, Math.min(5, Math.round(intensity(move) * 2) / 2));
  return Math.exp(b * x) / z;
}

/** Update every observer's beliefs after a reveal. `s` is the state the moves were chosen in. */
export function updateBeliefs(beliefs, s, moves) {
  const out = JSON.parse(JSON.stringify(beliefs));
  for (const o of IDS) for (const t of IDS) {
    if (o === t || !moves[t]) continue;
    const prior = out[o][t];
    // Capitals read hardest the moves aimed at them: the evidence is weighted by attention.
    const acts = moves[t].actions, aimed = acts.length ? acts.filter(id => TO[id] === o).length / acts.length : 0;
    const k = P.ai.attention.base + P.ai.attention.aimed * aimed;
    const post = Object.fromEntries(TYPES.map(x => [x, prior[x] * Math.pow(likelihood(s, t, moves[t], x), k)]));
    const z = TYPES.reduce((a, x) => a + post[x], 0) || 1;
    for (const x of TYPES) out[o][t][x] = Math.max(0.01, post[x] / z);
    const z2 = TYPES.reduce((a, x) => a + out[o][t][x], 0);
    for (const x of TYPES) out[o][t][x] /= z2;
  }
  return out;
}

/** Weighted objective value 0–100 for `who` in state `s`. */
export function objectiveValue(s, who, weights) {
  const obs = COUNTRIES[who].objectives;
  let tw = obs.reduce((t, o) => t + (weights[o.id] || 0), 0);
  const w = tw > 0 ? weights : Object.fromEntries(obs.map(o => [o.id, 1]));
  if (tw <= 0) tw = obs.length;
  return obs.reduce((t, o) => t + (w[o.id] || 0) * o.measure(s), 0) / tw;
}

function riskTerm(s, who, move, B) {
  const nEsc = move.actions.filter(id => BY_ID[id].tags.includes('esc')).length + (move.posture === 'esc' || move.posture === 'nuke' ? 1 : 0);
  const nSoft = move.actions.filter(id => BY_ID[id].tags.includes('soft')).length + (move.posture === 'stand' || move.posture === 'deesc' ? 1 : 0);
  let r = 0;
  if (who === 'cn') r -= P.ai.responseRisk * nEsc * (B.us.resolute + 0.5 * B.jp.resolute);
  else r -= P.ai.weaknessRisk * nSoft * (B.cn.resolute + B.cn.opportunist) * (s.rung >= 1 ? 1 : 0.4);
  if (s.types[who] === 'opportunist' && opening(s, who)) r += P.ai.opportunistBonus * nEsc;
  const t = s.types[who], open = opening(s, who);
  const sign = t === 'resolute' || (t === 'opportunist' && open) ? 1 : t === 'cautious' ? -1 : -0.5;
  return r + sign * P.ai.typeTaste * intensity(move);
}

/** Default guess at a rival's move: last month's posture and moves (no new deployments). */
const guess = (s, w) => s.last[w] ? { posture: s.last[w].posture, actions: s.last[w].actions.filter(id => !blockedWhy(s, id)), follow: s.last[w].follow || {}, orders: {} } : { posture: 'hold', actions: [], follow: {}, orders: {} };

function utility(s, who, move, B, weights) {
  const moves = Object.fromEntries(IDS.map(w => [w, w === who ? move : guess(s, w)]));
  const { state: n } = resolveTurn(s, moves, { expected: true });
  // Plus the computer's estimate of payoffs that land after this month (intelligence, rehearsals, dispersal...).
  const later = move.actions.reduce((t, id) => t + (BY_ID[id].ai ? BY_ID[id].ai(s, who) : 0), 0);
  return objectiveValue(n, who, weights) + P.ai.supportWeight * n.c[who].support + riskTerm(s, who, move, B) + later;
}

/** Best follow-up answers for one move, judged on its own. */
function bestFollow(s, who, id, B, weights, orders) {
  const fq = BY_ID[id].follow || [];
  let best = {}, bu = -Infinity;
  const combos = fq.reduce((acc, q) => acc.flatMap(c => q.opts.map(o => ({ ...c, [q.id]: o.id }))), [{}]);
  for (const o of combos) {
    if (blockedWhy(s, id, o)) continue;
    const u = utility(s, who, { posture: 'hold', actions: [id], follow: { [id]: o }, orders }, B, weights);
    if (u > bu) { bu = u; best = o; }
  }
  return { o: best, u: bu };
}

/** Pick a move for `who`: posture, up to three moves with follow-ups, and force orders.
 * weights: its objective weights; beliefs: its beliefs about the others. */
export function chooseMove(s, who, beliefs, weights, difficulty = s.difficulty) {
  const rng = makeRng(s.seed, STREAM.ai + s.turn * 10 + IDS.indexOf(who));
  const orders = forceOrders(s, who);
  const legal = menu(s, who).filter(a => !blockedWhy(s, a.id));
  const base = { posture: 'hold', actions: [], follow: {}, orders };
  const u0 = utility(s, who, base, beliefs, weights);
  const pScore = posturesFor(who, s).map(p => ({ id: p.id, u: utility(s, who, { ...base, posture: p.id }, beliefs, weights) - u0 }))
    .sort((a, b) => b.u - a.u).slice(0, P.ai.topPostures);
  const follow = {};
  const aScore = legal.map(a => { const r = bestFollow(s, who, a.id, beliefs, weights, orders); follow[a.id] = r.o; return { id: a.id, u: r.u - u0 }; })
    .sort((a, b) => b.u - a.u).slice(0, P.ai.topActions);
  const cands = [];
  const ids = aScore.map(a => a.id);
  const triples = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = j + 1; k < ids.length; k++) triples.push([ids[i], ids[j], ids[k]]);
  if (!triples.length) triples.push(ids.slice(0, 3));
  for (const p of pScore) for (const t of triples) {
    let room = escRoom(p.id);
    const acts = t.filter(id => !isEsc(id) || room-- > 0);
    cands.push({ posture: p.id, actions: acts, follow: Object.fromEntries(acts.map(id => [id, follow[id]])), orders });
  }
  const us = cands.map(c => utility(s, who, c, beliefs, weights));
  const T = P.ai.temp[difficulty] || P.ai.temp.normal;
  const mx = Math.max(...us);
  const ws = us.map(u => Math.exp((u - mx) / T));
  const pick = cands[rng.pick(ws)];
  // Spend any logistics its military moves add.
  const bonus = pick.actions.reduce((t, id) => t + (BY_ID[id].deploy || 0), 0);
  return bonus ? { ...pick, orders: forceOrders(s, who, bonus) } : pick;
}

/** Your read of a rival: the true posterior plus display noise, renormalised. */
export function intelView(beliefs, s, observer, target) {
  const r = makeRng(s.seed, STREAM.intel + s.turn * 10 + IDS.indexOf(target) + 4 * IDS.indexOf(observer));
  const v = Object.fromEntries(TYPES.map(k => [k, Math.max(0.02, beliefs[observer][target][k] + (r.u() - 0.5) * 2 * P.intelNoise)]));
  const z = TYPES.reduce((a, k) => a + v[k], 0);
  for (const k of TYPES) v[k] /= z;
  return v;
}
