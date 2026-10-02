// The peace forum (Batch B). The month after a capital's offer of talks succeeds (Taiwan's openness to talks, the
// U.S. back channel, Beijing's talks offer, Japan's mediation) it may, once a game, call a forum to end the conflict,
// addressed to a rival. The rival accepts with probability
//   P = 1 / (1 + e^−z),  z = k0 − kR·R − kA·A + kC·C − kE·E + kL·L (+ a hidden-trait term, Batch C), kept 3–95%,
// every factor on 0–1 (coefficients in data/params.js, P.forum):
//   R resolve        = 0.6 × type (resolute 1, opportunist 0.6 or 0.9 with an opening, cautious 0.2) + 0.4 × home support
//   A anger          = anger at the proposer / 50 (strikes and losses it caused; mainland strikes count most; decays)
//   C opportunity    = 0.3 economic damage + 0.25 shock + 0.2 attrition + 0.15 fuel and munitions used + 0.1 sanctions
//   E expected gains = 0.45 force balance at sea (as the recipient sees it through the fog) + 0.35 Taiwan's position
//                      (its inverse for China) + 0.2 landing progress (China) or its absence (the others)
//   L limited aims   = the recipient's belief that the proposer is cautious, plus half its belief it is opportunist
// Accepted: a ceasefire next month, the ladder down a rung, and a settlement if the ceasefire holds. Declined: a
// small loss of credibility for the proposer. Pure functions; the engine calls them. Illustrative, not a model of
// any real government's decision.
import { P } from '../data/params.js';
import { COUNTRIES, IDS } from '../data/countries.js';
import { SEA, SIDE } from '../data/theater.js';
import { SUPPLY } from '../data/formations.js';
import { T } from '../data/ops.js';
import { estStrength } from './fog.js';
import { opening } from './politics.js';
import { setForumAi } from '../data/moves/forum.js';

const F = P.forum;
const c01 = x => Math.max(0, Math.min(1, x));
export const TALKS = { tw: 'tw_talks', us: 'us_talks', cn: 'cn_talks', jp: 'jp_mediate' };
export const FORUM_ID = { tw: 'tw_forum', us: 'us_forum', cn: 'cn_forum', jp: 'jp_forum' };
export const FORUM_BY = Object.fromEntries(Object.entries(FORUM_ID).map(([w, id]) => [id, w]));
/** Whom a forum call is addressed to: Beijing for the coalition; Washington or Taipei for Beijing. */
export const forumTo = (who, o = {}) => (who === 'cn' ? (o.to === 'tw' ? 'tw' : 'us') : 'cn');
/** Hidden leader traits (Batch C) add to z here; none yet. */
export const traitTerm = (s, who) => (s.traitForum?.[who] || 0);

// Anger a successful move causes in its target (× the result, so a partial counts half). Mainland strikes weigh most.
export const ANGER = {
  us_mainland: { cn: 40 }, tw_counter: { cn: 35 }, us_strike: { cn: 12 }, cn_hitallies: { us: 20, jp: 10 },
  cn_strike: { tw: 15, us: 4 }, cn_landing: { tw: 25, us: 8, jp: 4 }, cn_blockade: { tw: 10, us: 4, jp: 3 },
  cn_quarantine: { tw: 4 }, cn_cables: { tw: 3 }, cn_cyber: { tw: 3 }, cn_senkaku: { jp: 4 },
  us_sanction: { cn: 5 }, jp_sanction: { cn: 4 }, cn_minerals: { jp: 4, us: 3 }, cn_assets: { tw: 4 }, us_elites: { cn: 4 },
};
const typeR = (s, who, t) => (t === 'resolute' ? 1 : t === 'cautious' ? 0.2 : opening(s, who) ? 0.9 : 0.6);
export const limitedOf = d => (d.cautious || 0) + 0.5 * (d.opportunist || 0);

/** Opportunity costs of fighting on for `who` (0–1). `est`: as a rival sees it (stocks unknown: attrition stands in). */
export function oppCost(s, who, est = false) {
  const c = s.c[who], st = COUNTRIES[who].start, S = SUPPLY[who];
  const econ = c01(2 * (st.economy - c.economy) / st.economy), shock = c01(s.shock / 60), attr = c01(1 - c.military / 100);
  const depl = est ? attr : c01(1 - (s.res[who].fuel / S.fuel.cap + s.res[who].mun / S.mun.cap) / 2);
  const sanc = who === 'cn' ? (s.sanctions > 0 ? 1 : 0) : who === 'tw' ? (s.blockade ? 1 : 0) : (s.minerals > 0 ? 1 : 0);
  return c01(0.3 * econ + 0.25 * shock + 0.2 * attr + 0.15 * depl + 0.1 * sanc);
}

/** `who`'s expected gains from fighting on (0–1), with the force balance as `obs` sees it through the fog. */
export function gains(s, who, obs = who) {
  const side = SIDE[who], foe = side === 'red' ? 'blue' : 'red';
  let own = 0, other = 0;
  for (const a of SEA) { own += estStrength(s, obs, side, a); other += estStrength(s, obs, foe, a); }
  const fb = own + other > 0 ? own / (own + other) : 0.5;
  const landed = c01((s.landings || []).reduce((t, l) => t + l.m, 0));
  return who === 'cn' ? c01(0.45 * fb + 0.35 * (1 - s.tw / 100) + 0.2 * landed) : c01(0.45 * fb + 0.35 * s.tw / 100 + 0.2 * (1 - landed));
}

/**
 * The equation for `to` weighing a forum called by `from`. view: { types: `to`'s type as a distribution (default:
 * its true type), lim: P(`from` has limited aims) as `to` believes it (default: `to`'s prior), obs: whose fog the
 * force balance is read through (default `to`), est: stocks unknown }. Returns the factors, terms, z and p.
 */
export function forumFactors(s, from, to, view = {}) {
  const td = view.types || { [s.types[to]]: 1 };
  const R = c01(0.6 * P.types.reduce((t, k) => t + (td[k] || 0) * typeR(s, to, k), 0) + 0.4 * s.c[to].support / 100);
  const A = c01((s.anger?.[to]?.[from] || 0) / F.angerScale);
  const C = oppCost(s, to, !!view.est), E = gains(s, to, view.obs || to);
  const L = c01(view.lim ?? limitedOf(COUNTRIES[from].prior));
  const terms = { R: -F.kR * R, A: -F.kA * A, C: F.kC * C, E: -F.kE * E, L: F.kL * L }, trait = traitTerm(s, to);
  const z = F.k0 + Object.values(terms).reduce((t, x) => t + x, 0) + trait;
  const p = Math.max(F.clamp[0], Math.min(F.clamp[1], 1 / (1 + Math.exp(-z))));
  return { R, A, C, E, L, terms, trait, z, p };
}

/** The proposer's estimate: its belief about the recipient's type (`B` = its beliefs), the fog, stocks unknown; and
 * `lim` (its read of what the recipient thinks of it) if it has one, else the recipient's prior. */
export const forumEstimate = (s, from, to, B, lim) => forumFactors(s, from, to, { types: B?.[to] || COUNTRIES[to].prior, lim, obs: from, est: true });

// Plain words for the factors, for the results line and the dialog. Reference points: what counts as high or low.
const REF = { R: 0.5, A: 0.1, C: 0.3, E: 0.5, L: 0.5 };
const WORDS = {
  no: { R: 'resolve high', A: 'anger high', C: 'costs still bearable', E: 'expects gains', L: 'doubts the other side’s aims' },
  yes: { R: 'resolve wavering', A: 'little anger', C: 'costs mounting', E: 'gains look slim', L: 'believes the other side’s aims are limited' },
};
const K = { R: -F.kR, A: -F.kA, C: F.kC, E: -F.kE, L: F.kL };
/** The two factors that pushed hardest toward the decision, in words. */
export function reasons(f, accepted) {
  const pull = Object.keys(REF).map(k => [k, K[k] * (f[k] - REF[k])]).filter(([k, v]) => (accepted ? v > 0 : v < 0) && !(k === 'A' && accepted));
  return pull.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2).map(([k]) => WORDS[accepted ? 'yes' : 'no'][k]);
}

/** Anger from one successful (or partial) move. */
export function angerFrom(s, who, id, m) {
  const t = ANGER[id]; if (!t || m <= 0) return;
  for (const [v, n] of Object.entries(t)) bump(s, v, who, n * m);
}
export const bump = (s, victim, at, n) => { if (victim !== at) { s.anger[victim][at] = Math.min(100, (s.anger[victim][at] || 0) + n); } };
/** Anger from combat losses (s.hurt[victim][by] = force points lost to `by` this month), then the monthly decay. */
export function angerMonth(s) {
  for (const [v, by] of Object.entries(s.hurt || {})) for (const [w, n] of Object.entries(by)) bump(s, v, w, F.lossAnger * n);
  for (const v of IDS) for (const w of IDS) if (s.anger[v][w]) s.anger[v][w] = Math.round(s.anger[v][w] * F.decay * 10) / 10;
}

/**
 * Settle one forum call: the recipient's reply (a human's, from its move) or a roll against P. Applies the result.
 * `m` in expected mode is P. Returns the log entry.
 */
export function settleForum(s, from, id, o, moves, opts, rng) {
  const to = forumTo(from, o), B = opts.beliefs;
  // The computer planning its own call sees only its estimate; otherwise the recipient's own view decides.
  const f = opts.expected && opts.planner === from ? forumEstimate(s, from, to, opts.plannerB)
    : forumFactors(s, from, to, B ? { lim: limitedOf(B[to][from]) } : {});
  const reply = moves[to]?.reply?.[from];
  let m, roll = null;
  if (opts.expected) m = f.p;
  else if (reply) m = reply === 'accept' ? 1 : 0;
  else { roll = rng.u(); m = roll < f.p ? 1 : 0; }
  applyForum(s, from, to, m);
  return { who: from, kind: 'action', id, o, forum: { to, f, accepted: m >= 0.5, human: !!reply, why: reasons(f, m >= 0.5) }, status: opts.expected ? 'expected' : m ? 'success' : 'failure', p: f.p, roll, factors: [] };
}

/** Accepted (m = 1): ceasefire next month, the ladder down a rung after this month's climb, calmer markets.
 * Declined (m = 0): the proposer loses a little credibility at home and, for the coalition, with partners. */
export function applyForum(s, from, to, m) {
  T(s, 'nuke', -6 * m); T(s, 'shock', -4 * m);
  T(s, `${from}.support`, F.rebuff.support * (1 - m));
  if (from !== 'cn') T(s, 'coal', F.rebuff.coal * (1 - m));
  if (m >= 0.5) { s.cease = { from, to, turn: s.turn + 1 }; s.forumDrop = true; }
}

/** A ceasefire breach by `who` (a successful escalatory military or law-enforcement move during the ceasefire). */
export function breach(s, who, m, log) {
  const B = F.breach;
  T(s, `${who}.support`, B.support * m); T(s, 'nuke', B.nuke * m);
  T(s, 'coal', (who === 'cn' ? B.coal * 0.75 : -B.coal) * m);
  for (const v of IDS) if (SIDE[v] !== SIDE[who]) bump(s, v, who, B.anger * m);
  if (m >= 0.5 && !s.cease.broken) { s.cease.broken = who; log.push({ kind: 'note', forum: true, text: `${COUNTRIES[who].name} broke the ceasefire: a heavy loss of credibility at home${who === 'cn' ? '' : ' and with partners'}, and anger on the other side.` }); }
}

/** The computer's later-value estimate for calling a forum: how much it wants out (its own acceptance of the
 * mirror offer) × the chance the rival accepts × P.forum.aiValue. */
export function forumAi(s, who, B) {
  const to = forumTo(who), mine = forumFactors(s, to, who).p, theirs = forumEstimate(s, who, to, B).p;
  return F.aiValue * mine * theirs;
}

setForumAi(forumAi);
