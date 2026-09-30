// Matrix-game engine: argument assessment, counter-arguments, 2d6 adjudication and board effects.
// Adjudication follows the "weighted probabilities" method (Mouat 2018, MaGCK): 2d6, 7+ succeeds,
// each strong reason +1, each strong counter-argument -1. Base difficulties and effects are notional.
import { ACTORS, TRACKS, INJECTS, TAGS } from '../data/scenario.js';
import { MOVES } from '../data/moves.js';

export const WEST = ['estonia', 'nato', 'eu'];
export const MAX_REASONS = 3;
export const MAX_COUNTERS = 2;
const TRACK = Object.fromEntries(TRACKS.map(t => [t.k, t]));

/** Seeded generator, one stream per turn and phase so a saved game replays exactly. */
export function rng(seed, turn, phase) {
  let a = (seed ^ Math.imul(turn + 1, 0x9E3779B1) ^ Math.imul(phase + 7, 0x85EBCA6B)) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const tagText = tags => tags.map(t => TAGS[t].toLowerCase()).join(', ');
const an = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;

/** Does a reason's or counter's condition hold on this board and inject? Returns { ok, why }. */
export function condHolds(cond, board, inject) {
  if (!cond) return { ok: true, why: '' };
  if (cond.inject) {
    const ok = inject.tags.includes(cond.inject);
    return { ok, why: ok ? `this turn's inject is ${an(TAGS[cond.inject].toLowerCase())} issue`
      : `this turn's inject is not ${an(TAGS[cond.inject].toLowerCase())} issue` };
  }
  const v = board[cond.k], name = TRACK[cond.k].name.toLowerCase();
  const ok = cond.op === 'ge' ? v >= cond.v : v <= cond.v;
  const need = cond.op === 'ge' ? `${cond.v} or more` : `${cond.v} or less`;
  return { ok, why: `${name} is ${v} (${ok ? 'holds' : 'needs'} ${need})` };
}

/** A reason is strong (+1) when it bears on the action's tags and its condition holds on the board. */
export function assessReason(reason, action, board, inject) {
  const fit = reason.tags.filter(t => action.tags.includes(t));
  if (!fit.length) return { strong: false, why: `Weak: it does not bear on ${an(tagText(action.tags))} action.` };
  const c = condHolds(reason.cond, board, inject);
  if (!c.ok) return { strong: false, why: `Weak: relevant (${tagText(fit)}), but ${c.why}.` };
  return { strong: true, why: `Strong: it bears on ${tagText(fit)}${c.why ? ', and ' + c.why : ''}.` };
}

/** A counter-argument is strong (-1) when it targets the action's tags and its condition holds. */
export function assessCounter(counter, action, board, inject) {
  const fit = counter.vs.filter(t => action.tags.includes(t));
  if (!fit.length) return { strong: false, why: `Weak: it does not engage ${an(tagText(action.tags))} action.` };
  const c = condHolds(counter.cond, board, inject);
  if (!c.ok) return { strong: false, why: `Weak: on point (${tagText(fit)}), but ${c.why}.` };
  return { strong: true, why: `Strong: it engages ${tagText(fit)}${c.why ? ', and ' + c.why : ''}.` };
}

/** Would AI actor b argue against actor a's action? Scripted stances (notional). */
export function opposes(b, a, action) {
  if (a === b) return false;
  if (b === 'russia') return WEST.includes(a) || (a === 'community' && action.tags.some(t => ['info', 'diplo', 'law'].includes(t)));
  if (a === 'russia') return WEST.includes(b) || (b === 'community' && action.tags.some(t => ['info', 'local', 'escal', 'border'].includes(t)));
  if (b === 'community') return action.tags.some(t => ['deter', 'escal'].includes(t)) || (['estonia', 'nato'].includes(a) && action.tags.includes('info'));
  return false;
}

/** Would AI actor b speak in support? Allies back each other only when cohesion is high (7+); the community
 *  backs local and economic help when local sentiment is 6+; the West backs community moves when cohesion is 6+. */
function supports(b, a, action, board) {
  if (a === b || a === 'russia' || b === 'russia') return false;
  if (WEST.includes(a) && WEST.includes(b)) return board.coh >= 7;
  if (b === 'community') return board.loc >= 6 && action.tags.some(t => ['local', 'econ'].includes(t)) && !action.tags.includes('deter');
  if (a === 'community') return board.coh >= 6 && action.tags.some(t => ['local', 'econ', 'info'].includes(t));
  return false;
}

/** Best counter an actor can raise: strong first, then list order with a seeded tiebreak. */
function bestCounter(b, action, board, inject, rand) {
  const opts = MOVES[b].counters.map((c, i) => ({ i, c, ...assessCounter(c, action, board, inject), j: rand() }))
    .filter(o => o.c.vs.some(t => action.tags.includes(t)));
  if (!opts.length) return null;
  opts.sort((x, y) => (y.strong - x.strong) || (x.j - y.j));
  return opts[0];
}

/**
 * Assemble the full adjudication for one argument.
 * reasonIdx: indexes into MOVES[actor].reasons. playerCounter: { actor, i } or null.
 * exclude: actors who do not act as AI here (the player).
 */
export function adjudicate({ actor, actionIdx, reasonIdx, board, inject, seed, turn, phase, exclude = [], playerCounter = null }) {
  const action = MOVES[actor].actions[actionIdx];
  const rand = rng(seed, turn, phase);
  const reasons = reasonIdx.slice(0, MAX_REASONS).map(i => ({ i, text: MOVES[actor].reasons[i].text, src: MOVES[actor].reasons[i].src,
    ...assessReason(MOVES[actor].reasons[i], action, board, inject) }));
  const counters = [];
  if (playerCounter) {
    const c = MOVES[playerCounter.actor].counters[playerCounter.i];
    counters.push({ actor: playerCounter.actor, i: playerCounter.i, text: c.text, byPlayer: true, ...assessCounter(c, action, board, inject) });
  }
  const ai = Object.keys(ACTORS).filter(b => b !== actor && !exclude.includes(b) && opposes(b, actor, action))
    .map(b => ({ b, o: bestCounter(b, action, board, inject, rand) })).filter(x => x.o)
    .sort((x, y) => (y.o.strong - x.o.strong) || (x.o.j - y.o.j));
  for (const { b, o } of ai) {
    if (counters.length >= MAX_COUNTERS) break;
    counters.push({ actor: b, i: o.i, text: o.c.text, strong: o.strong, why: o.why });
  }
  // One supporting voice at most: the first friendly AI actor holding a strong reason for this action.
  let support = null;
  for (const b of Object.keys(ACTORS)) {
    if (b === actor || exclude.includes(b) || !supports(b, actor, action, board)) continue;
    const r = MOVES[b].reasons.find(x => assessReason(x, action, board, inject).strong);
    if (r) { support = { actor: b, text: r.text }; break; }
  }
  const nStrong = reasons.filter(r => r.strong).length;
  const nCounter = counters.filter(c => c.strong).length;
  const net = action.diff + nStrong + (support ? 1 : 0) - nCounter;
  return { actor, actionIdx, action, reasons, counters, support, diff: action.diff, net, p: pSuccess(net), rand };
}

/** P(2d6 + net >= 7). */
export function pSuccess(net) {
  let n = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b + net >= 7) n++;
  return n / 36;
}

export const BANDS = [
  { k: 'decisive', min: 10, label: 'Decisive success', s: 'good', note: 'The result happens, with extra weight on its main effect.' },
  { k: 'success', min: 7, label: 'Success', s: 'good', note: 'The result happens as argued.' },
  { k: 'fail', min: 5, label: 'Fails', s: 'warn', note: 'The result does not happen and the attempt has a cost.' },
  { k: 'backfire', min: -99, label: 'Backfires', s: 'bad', note: 'It fails badly: the cost lands and escalation rises by 1.' },
];

/** Roll 2d6 from a dedicated stream, band the modified total and work out the board effects. */
export function roll(arg, seed, turn, phase) {
  const r = rng(seed, turn, phase + 50);
  const dice = [1 + Math.floor(r() * 6), 1 + Math.floor(r() * 6)];
  const total = dice[0] + dice[1] + arg.net;
  const band = BANDS.find(b => total >= b.min);
  let eff = {};
  if (band.k === 'decisive' || band.k === 'success') {
    eff = { ...arg.action.win };
    if (band.k === 'decisive') { const k = Object.keys(eff)[0]; eff[k] += Math.sign(eff[k]); }
  } else {
    eff = { ...arg.action.lose };
    if (band.k === 'backfire') eff.esc = (eff.esc || 0) + 1;
  }
  return { dice, total, band, eff };
}

/** Apply effects to a board copy, clamped to 0..10. Returns { board, delta } with the change actually applied. */
export function applyEffects(board, eff) {
  const next = { ...board }, delta = {};
  for (const [k, v] of Object.entries(eff)) {
    const nv = Math.max(0, Math.min(10, next[k] + v));
    if (nv !== next[k]) delta[k] = nv - next[k];
    next[k] = nv;
  }
  return { board: next, delta };
}

const value = (actor, eff, board) => Object.entries(eff).reduce((s, [k, v]) => {
  let w = ACTORS[actor].goals[k] || 0;
  if (actor === 'russia' && k === 'esc') w = board.esc + v >= 7 ? -2 : 0.3; // Moscow wants pressure, not war (notional)
  return s + w * v;
}, 0);

/** AI picks the action with the best expected value for its goals, plus a little seeded noise. */
export function aiChoose(actor, board, inject, seed, turn, exclude, lastId) {
  const rand = rng(seed, turn, 30);
  const reasonsFor = (a) => {
    const all = MOVES[actor].reasons.map((r, i) => ({ i, s: assessReason(r, a, board, inject).strong, j: rand() }));
    all.sort((x, y) => (y.s - x.s) || (x.j - y.j));
    return all.slice(0, MAX_REASONS).map(x => x.i);
  };
  let best = null;
  MOVES[actor].actions.forEach((a, idx) => {
    if (a.id === lastId) return;
    const rs = reasonsFor(a);
    const arg = adjudicate({ actor, actionIdx: idx, reasonIdx: rs, board, inject, seed, turn, phase: 31, exclude });
    const ev = arg.p * value(actor, a.win, board) + (1 - arg.p) * value(actor, a.lose, board) + rand() * 0.6;
    if (!best || ev > best.ev) best = { idx, rs, ev };
  });
  return best;
}

/** Which AI actor argues second this turn. */
export function aiActorFor(schedule, turn, player) {
  const s = schedule[turn];
  if (s !== player) return s;
  const alt = ['nato', 'community', 'eu', 'estonia', 'community', 'nato'];
  return alt[turn] === player ? 'eu' : alt[turn];
}

/** Debrief score: goal-weighted change in the board from the start (notional). */
export function score(actor, start, end) {
  const g = ACTORS[actor].goals;
  return Object.keys(g).reduce((s, k) => s + g[k] * (end[k] - start[k]), 0);
}

export const injectFor = t => INJECTS[t];
