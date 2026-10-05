// The computer's capitals: beliefs about every rival's hidden type (Bayes' rule on observed moves) and a
// one-month lookahead choice by softmax. The computer never reads another capital's true type.
import { P } from '../data/params.js';
import { COUNTRIES, IDS } from '../data/countries.js';
import { ACTIONS, POSTURES, BY_ID, TO, posturesFor, escRoom, isEsc, menu, MAX_MOVES } from '../data/actions.js';
import { resolveTurn, blockedWhy, opening } from './engine.js';
import { deployIntensity } from './forces.js';
import { forceOrders } from './ai-forces.js';
import { costOf, grantOf, short, avgReady, fuelUpkeep, ZERO } from './logistics.js';
import { makeRng, STREAM } from './rng.js';
import { traitUtility } from './traits.js';
import { coalitionEdge } from './edge.js';
import { mainReason } from './ai-reason.js';

const TYPES = P.types;

/** beliefs[observer][target] = { resolute, cautious, opportunist } from the priors. */
export function initBeliefs() {
  return Object.fromEntries(IDS.map(o => [o, Object.fromEntries(IDS.filter(t => t !== o).map(t => [t, { ...COUNTRIES[t].prior }]))]));
}

/** How hard a move reads: posture counts half, each escalatory move +1, each accommodating one −1,
 * plus forward deployment (massing in one area, Attack stances). */
export function intensity(move) {
  const lvl = (POSTURES.find(p => p.id === move.posture) || { level: 0 }).level;
  return 0.5 * lvl + move.actions.reduce((t, id) => t + (BY_ID[id].tags.includes('esc') ? 1 : BY_ID[id].tags.includes('soft') ? -1 : 0), 0) + deployIntensity(move.orders);
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

/** What a peace forum's answer teaches the caller about the rival (Batch B): a refusal reads as resolve, an
 * acceptance as caution. `log`: the month's log. Returns new beliefs. */
export function forumLearn(beliefs, log) {
  const out = JSON.parse(JSON.stringify(beliefs));
  for (const l of log) {
    if (l.kind !== 'action' || !l.forum || l.status === 'expected') continue;
    const b = out[l.who][l.forum.to], k = l.forum.accepted ? { resolute: 0.75, cautious: 1.4, opportunist: 1 } : { resolute: 1.4, cautious: 0.75, opportunist: 1.1 };
    for (const t of TYPES) b[t] *= k[t];
    const z = TYPES.reduce((a, t) => a + b[t], 0);
    for (const t of TYPES) b[t] /= z;
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

/** The belief-weighted risk term and the type's taste; `parts` also keeps each piece (for the replay's reasons). */
function riskTerm(s, who, move, B, parts) {
  const nEsc = move.actions.filter(id => BY_ID[id].tags.includes('esc')).length + (move.posture === 'esc' || move.posture === 'nuke' ? 1 : 0);
  const nSoft = move.actions.filter(id => BY_ID[id].tags.includes('soft')).length + (move.posture === 'stand' || move.posture === 'deesc' ? 1 : 0);
  let r = 0;
  if (who === 'cn') r -= P.ai.responseRisk * nEsc * (B.us.resolute + 0.5 * B.jp.resolute);
  else r -= P.ai.weaknessRisk * nSoft * (B.cn.resolute + B.cn.opportunist) * (s.rung >= 1 ? 1 : 0.4);
  const risk = r;
  if (s.types[who] === 'opportunist' && opening(s, who)) r += P.ai.opportunistBonus * nEsc;
  // Beijing answers pressure in kind unless the coalition has the upper hand: a bonus per escalatory step for each
  // escalatory posture or move the coalition made last month (up to 3), fading as the coalition's edge grows.
  let answer = 0;
  if (who === 'cn' && nEsc) {
    const pushed = Math.min(3, ['us', 'tw', 'jp'].reduce((t, w) => { const m = s.last[w]; return t + (m ? m.actions.filter(id => BY_ID[id].tags.includes('esc')).length + (['esc', 'nuke'].includes(m.posture) ? 1 : 0) : 0); }, 0));
    answer = P.ai.answer * nEsc * pushed * (1 - coalitionEdge(s) / 4);
    r += answer;
  }
  const t = s.types[who], open = opening(s, who);
  const sign = t === 'resolute' || (t === 'opportunist' && open) ? 1 : t === 'cautious' ? -1 : -0.5;
  const int = intensity(move), taste = sign * P.ai.typeTaste * int;
  if (parts) Object.assign(parts, { risk, opp: r - risk - answer, answer, taste, int });
  return r + taste;
}

/** Default guess at a rival's move: last month's posture and moves (no new deployments). */
const guess = (s, w) => s.last[w] ? { posture: s.last[w].posture, actions: s.last[w].actions.filter(id => !blockedWhy(s, id)), follow: s.last[w].follow || {}, orders: {} } : { posture: 'hold', actions: [], follow: {}, orders: {} };

/** The computer's one-month value of `move`, and (with `parts`) its pieces: the state it expects (n), objectives,
 * home support, risk and taste, later payoffs, scarcity and any hidden trait's term (js/traits.js). */
function utility(s, who, move, B, weights, parts) {
  const moves = Object.fromEntries(IDS.map(w => [w, w === who ? move : guess(s, w)]));
  const { state: n } = resolveTurn(s, moves, { expected: true, planner: who, plannerB: B });
  // Plus the computer's estimate of payoffs that land after this month (intelligence, rehearsals, dispersal...).
  const later = move.actions.reduce((t, id) => t + (BY_ID[id].ai ? BY_ID[id].ai(s, who) : 0), 0);
  const p = parts || {}, obj = objectiveValue(n, who, weights), sup = P.ai.supportWeight * n.c[who].support, risk = riskTerm(s, who, move, B, p), scar = scarcity(s, who, move);
  const trait = s.traits ? traitUtility(s, who, move, { later, scar }, p.int ?? intensity(move)) : 0;
  Object.assign(p, { n, obj, sup, later, scar, trait });
  return obj + sup + risk + later - scar + trait;
}

/** What spending stocks costs the computer: the share of fuel and munitions left that a move uses, squared (cheap
 * while stocks are full, steep when they run low). */
function scarcity(s, who, move) {
  const c = move.actions.reduce((t, id) => { const k = costOf(id, move.follow?.[id]); return { fuel: t.fuel + k.fuel, mun: t.mun + k.mun }; }, { fuel: 0, mun: 0 });
  const f = c.fuel / Math.max(1, s.res[who].fuel), m = c.mun / Math.max(1, s.res[who].mun);
  return P.ai.scarcity * (f * f + 1.5 * m * m);
}
/** Total cost of a set of moves and whether the capital can pay it (after the moves' own grants). */
function payable(s, who, ids, follow) {
  const g = grantOf(ids), res = { lift: s.res[who].lift + g.lift, fuel: s.res[who].fuel + g.fuel, mun: s.res[who].mun + g.mun };
  const c = ids.reduce((t, id) => { const k = costOf(id, follow[id]); for (const r in t) t[r] += k[r]; return t; }, { ...ZERO });
  const k = short(res, avgReady(s, who) + g.ready, c);
  return { ok: !k, res: k, left: { lift: res.lift - c.lift, fuel: res.fuel - c.fuel } };
}

/** Best follow-up answers for one move, judged on its own. */
function bestFollow(s, who, id, B, weights, orders) {
  const fq = BY_ID[id].follow || [];
  let best = {}, bu = -Infinity;
  const combos = fq.reduce((acc, q) => acc.flatMap(c => q.opts.map(o => ({ ...c, [q.id]: o.id }))), [{}]);
  for (const o of combos) {
    if (blockedWhy(s, id, o, { [who]: { orders } }) || (combos.length > 1 && !payable(s, who, [id], { [id]: o }).ok)) continue;
    const u = utility(s, who, { posture: 'hold', actions: [id], follow: { [id]: o }, orders }, B, weights);
    if (u > bu) { bu = u; best = o; }
  }
  return { o: best, u: bu };
}

/** Pick a move for `who`: posture, up to four moves with follow-ups (only what it can pay for), and force orders.
 * weights: its objective weights; beliefs: its beliefs about the others. `limits` notes resources that kept a
 * move it rated highly off the list. */
export function chooseMove(s, who, beliefs, weights, difficulty = s.difficulty) {
  const rng = makeRng(s.seed, STREAM.ai + s.turn * 10 + IDS.indexOf(who));
  const { limits: _, ...orders } = forceOrders(s, who, { lift: s.res[who].lift, fuel: Math.max(0, s.res[who].fuel - 2) });
  const legal = menu(s, who).filter(a => !blockedWhy(s, a.id, null, { [who]: { orders } }));
  const base = { posture: 'hold', actions: [], follow: {}, orders }, p0 = {};
  const u0 = utility(s, who, base, beliefs, weights, p0);
  const pScore = posturesFor(who, s).map(p => ({ id: p.id, u: utility(s, who, { ...base, posture: p.id }, beliefs, weights) - u0 }))
    .sort((a, b) => b.u - a.u).slice(0, P.ai.topPostures);
  const follow = {};
  const scored = legal.map(a => { const r = bestFollow(s, who, a.id, beliefs, weights, orders); follow[a.id] = r.o; return { id: a.id, u: r.u - u0, pay: payable(s, who, [a.id], { [a.id]: r.o }) }; })
    .sort((a, b) => b.u - a.u);
  const aScore = scored.filter(a => a.pay.ok).slice(0, P.ai.topActions);
  const cut = aScore[Math.min(MAX_MOVES, aScore.length) - 1]?.u ?? -Infinity, limits = {};
  for (const a of scored) if (!a.pay.ok && a.u > Math.max(0, cut)) limits[a.pay.res] = true;
  const ids = aScore.map(a => a.id);
  const sets = [];
  const pick = (from, k, acc) => { if (acc.length === k) { sets.push(acc); return; } for (let i = from; i < ids.length; i++) pick(i + 1, k, [...acc, ids[i]]); };
  pick(0, Math.min(MAX_MOVES, ids.length), []);
  const cands = [];
  for (const p of pScore) for (const t of sets) {
    let room = escRoom(p.id);
    const acts = t.filter(id => !isEsc(id) || room-- > 0);
    const fol = Object.fromEntries(acts.map(id => [id, follow[id]]));
    if (!payable(s, who, acts, fol).ok) continue;
    cands.push({ posture: p.id, actions: acts, follow: fol, orders });
  }
  if (!cands.length) cands.push({ ...base, posture: pScore[0]?.id || 'hold' });
  const us = cands.map(c => utility(s, who, c, beliefs, weights));
  const T = P.ai.temp[difficulty] || P.ai.temp.normal;
  const mx = Math.max(...us);
  const ws = us.map(u => Math.exp((u - mx) / T));
  const chosen = cands[rng.pick(ws)];
  // Re-plan the force orders with what the chosen moves leave (and any Lift they add).
  const left = payable(s, who, chosen.actions, chosen.follow).left;
  const { limits: fl, ...ord } = forceOrders(s, who, { lift: left.lift, fuel: Math.max(0, left.fuel - fuelUpkeep(s, who)) });
  Object.assign(limits, fl);
  // The main reason for the choice, against doing nothing (for the after-action replay; js/ai-reason.js).
  const p1 = {}; utility(s, who, chosen, beliefs, weights, p1);
  return { ...chosen, orders: ord, ...(Object.keys(limits).length ? { limits } : {}), why: mainReason(s, who, weights, p1, p0, chosen) };
}

/** Your read of a rival: the true posterior plus display noise, renormalised. */
export function intelView(beliefs, s, observer, target) {
  const r = makeRng(s.seed, STREAM.intel + s.turn * 10 + IDS.indexOf(target) + 4 * IDS.indexOf(observer));
  const v = Object.fromEntries(TYPES.map(k => [k, Math.max(0.02, beliefs[observer][target][k] + (r.u() - 0.5) * 2 * P.intelNoise)]));
  const z = TYPES.reduce((a, k) => a + v[k], 0);
  for (const k of TYPES) v[k] /= z;
  return v;
}
