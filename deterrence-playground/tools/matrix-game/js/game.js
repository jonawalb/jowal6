// Game state: a six-turn sequence of player and AI arguments, rebuilt deterministically from (actor, seed, moves).
import { TRACKS, INJECTS, AI_SCHEDULE } from '../data/scenario.js';
import { MOVES } from '../data/moves.js';
import { adjudicate, roll, applyEffects, aiChoose, aiActorFor } from './engine.js';

export const TURNS = 6;
export const START = Object.fromEntries(TRACKS.map(t => [t.k, t.start]));

export function newGame(actor, seed) {
  const g = { actor, seed, turns: [], board: { ...START }, over: false, halted: false };
  openTurn(g);
  return g;
}

/** Start the next turn: its fictional inject nudges the board. */
export function openTurn(g) {
  const t = g.turns.length;
  const inject = INJECTS[t];
  const { board, delta } = applyEffects(g.board, inject.nudge);
  g.turns.push({ t, inject, board0: { ...g.board }, boardOpen: board, injectDelta: delta });
  g.board = board;
}

export const cur = g => g.turns[g.turns.length - 1];

/** Player submits an argument; returns the assembled adjudication (not yet rolled). */
export function playerArgue(g, actionIdx, reasonIdx) {
  const rec = cur(g);
  rec.player = { actionIdx, reasonIdx: [...reasonIdx] };
  rec.player.arg = adjudicate({ actor: g.actor, actionIdx, reasonIdx, board: g.board, inject: rec.inject, seed: g.seed, turn: rec.t, phase: 1 });
  return rec.player.arg;
}

export function playerRoll(g) {
  const rec = cur(g);
  const res = roll(rec.player.arg, g.seed, rec.t, 1);
  const { board, delta } = applyEffects(g.board, res.eff);
  rec.player.res = { ...res, delta, before: { ...g.board }, after: board };
  g.board = board;
  if (board.esc >= 10) { g.over = true; g.halted = true; return rec.player.res; }
  prepareAI(g);
  return rec.player.res;
}

/** The scheduled AI actor chooses its action and reasons against the updated board. */
function prepareAI(g) {
  const rec = cur(g);
  const actor = aiActorFor(AI_SCHEDULE, rec.t, g.actor);
  const last = [...g.turns].reverse().find(r => r.ai && r.ai.actor === actor);
  const pick = aiChoose(actor, g.board, rec.inject, g.seed, rec.t, [g.actor], last ? MOVES[actor].actions[last.ai.actionIdx].id : null);
  rec.ai = { actor, actionIdx: pick.idx, reasonIdx: pick.rs };
}

/** Player counters (or not) the AI argument; returns the assembled adjudication. counterIdx: number or null. */
export function aiArgue(g, counterIdx) {
  const rec = cur(g);
  rec.ai.counterIdx = counterIdx;
  rec.ai.arg = adjudicate({ actor: rec.ai.actor, actionIdx: rec.ai.actionIdx, reasonIdx: rec.ai.reasonIdx, board: g.board,
    inject: rec.inject, seed: g.seed, turn: rec.t, phase: 2, exclude: [g.actor],
    playerCounter: counterIdx == null ? null : { actor: g.actor, i: counterIdx } });
  return rec.ai.arg;
}

export function aiRoll(g) {
  const rec = cur(g);
  const res = roll(rec.ai.arg, g.seed, rec.t, 2);
  const { board, delta } = applyEffects(g.board, res.eff);
  rec.ai.res = { ...res, delta, before: { ...g.board }, after: board };
  g.board = board;
  rec.boardEnd = { ...board };
  if (board.esc >= 10) { g.over = true; g.halted = true; }
  else if (rec.t >= TURNS - 1) g.over = true;
  return rec.ai.res;
}

/** Compact move string for the URL: per turn "action.reasons.counter", turns joined by "_". Completed turns only. */
export function encodeMoves(g) {
  return g.turns.filter(r => r.player && r.player.res && (r.ai?.res || g.halted)).map(r =>
    `${r.player.actionIdx}.${r.player.reasonIdx.join('') || '-'}.${r.ai?.res ? (r.ai.counterIdx ?? 'x') : 'h'}`).join('_');
}

/** Rebuild a game from a move string. Invalid pieces stop the replay at the last good turn. */
export function replay(actor, seed, str) {
  const g = newGame(actor, seed);
  if (!str) return g;
  const nA = MOVES[actor].actions.length, nR = MOVES[actor].reasons.length, nC = MOVES[actor].counters.length;
  for (const part of str.split('_')) {
    const m = /^(\d)\.(\d{1,3}|-)\.(\d|x|h)$/.exec(part);
    if (!m || g.over) break;
    const a = +m[1], rs = m[2] === '-' ? [] : [...new Set(m[2].split('').map(Number))];
    if (a >= nA || rs.some(r => r >= nR)) break;
    playerArgue(g, a, rs);
    playerRoll(g);
    if (g.over) break;
    const c = m[3] === 'x' || m[3] === 'h' ? null : +m[3];
    if (c != null && c >= nC) break;
    aiArgue(g, c);
    aiRoll(g);
    if (!g.over) openTurn(g);
  }
  return g;
}

/** Advance after a completed turn. */
export function nextTurn(g) { if (!g.over) openTurn(g); }
