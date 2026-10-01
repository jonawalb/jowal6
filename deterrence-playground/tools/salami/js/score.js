// Scoring (0–100 for each side) and the debrief timeline. Pure.
import { P } from '../data/params.js';
import { newGame, brief, resolveTurn } from './engine.js';
import { choosePower, chooseCoastal } from './ai.js';

const c01 = v => Math.max(0, Math.min(1, v));
const r = v => Math.round(v);

/** Who won: 'coastal', 'power', or 'none' (clash, or a withdrawal the Patron had to intervene in). */
export const winner = s => (s.over?.reason === 'hold' ? 'coastal' : s.over?.reason === 'withdrawal' ? 'power' : 'none');

export function score(s, side) {
  const why = s.over?.reason, held = s.over?.month ?? s.turn;
  const sym = c01((s.sympathy - 30) / 50), cred = c01(s.cred / 100), calm = c01(1 - s.peakEsc / 100);
  let parts;
  if (side === 'c') {
    parts = why === 'clash' ? [['Outcome: a clash, everyone loses', 5], ['Sympathy you kept', 5 * sym]]
      : why === 'hold' ? [['Outcome: the outpost held', 55], ['Supplies left in December', 10 * c01(s.supplies / 4)], ['International sympathy', 15 * sym], ['Patron credibility', 10 * cred], ['Kept the risk down', 10 * calm]]
      : [['Outcome: the garrison withdrew', 5], [`Months held (${held})`, 2 * held], ['International sympathy', 8 * sym], ['Patron credibility', 5 * cred]];
  } else {
    const squeeze = c01(1 - s.minSupplies / P.start.supplies);
    parts = why === 'clash' ? [['Outcome: a clash, everyone loses', 5], ['Kept sympathy against you down', 5 * (1 - sym)]]
      : why === 'withdrawal' ? [['Outcome: withdrawal, no Patron intervention', 60], [`Speed (month ${held})`, 2.5 * (P.turns - held)], ['Kept sympathy against you down', 10 * (1 - sym)], ['Kept the risk down', 10 * calm]]
      : why === 'pyrrhic' ? [['Outcome: withdrawal, but the Patron intervened', 35], ['Kept sympathy against you down', 10 * (1 - sym)], ['Kept the risk down', 10 * calm]]
      : [['Outcome: the outpost held', 5], ['How hard you squeezed (lowest supplies)', 25 * squeeze], ['Dented the Patron’s credibility', 10 * (1 - cred)], ['Kept sympathy against you down', 5 * (1 - sym)], ['Kept the risk down', 5 * calm]];
  }
  parts = parts.map(([label, v]) => ({ label, value: r(v) }));
  return { total: Math.min(100, parts.reduce((a, p) => a + p.value, 0)), parts };
}

/** Play a whole game. policies: { c(s), p(s) } return moves; missing ones use the computer. */
export function playOut(seed, side = 'c', policies = {}) {
  let s = newGame({ seed, side });
  while (!s.over) {
    s = brief(s);
    const c = (policies.c || chooseCoastal)(s), p = (policies.p || choosePower)(s);
    s = resolveTurn(s, { c, p }).state;
  }
  return s;
}

/** Timeline for the debrief: per month, how close each side came to the other's threshold. */
export const timeline = s => s.history.map(h => ({
  month: h.turn, E: h.E, gapR: h.E > 0 ? h.E - s.R : null, resp: h.resp, P: h.P, gapT: h.P - (s.T - h.tAdj), supplies: h.after.supplies, esc: h.after.esc,
}));
