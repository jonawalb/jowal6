// Scoring (0–100 for each side) and the debrief timeline. Pure.
import { P } from '../data/params.js';
import { newGame, brief, resolveTurn } from './engine.js';
import { choosePower, chooseCoastal } from './ai.js';

const c01 = v => Math.max(0, Math.min(1, v));
const r = v => Math.round(v);

/** Who won: 'coastal', 'power', or 'none' (clash, or a withdrawal the Patron had to intervene in). */
const WIN = { hold: 'coastal', smash_patron: 'coastal', withdrawal: 'power', smash_power: 'power', smash_abandoned: 'power' };
export const winner = s => WIN[s.over?.reason] || 'none';

export function score(s, side) {
  const why = s.over?.reason, held = s.over?.month ?? s.turn;
  const sym = c01((s.sympathy - 30) / 50), cred = c01(s.cred / 100), calm = c01(1 - s.peakEsc / 100);
  let parts;
  if (side === 'c') {
    parts = why === 'clash' ? [['Outcome: a clash, everyone loses', 5], ['Sympathy you kept', 5 * sym]]
      : why === 'smash_patron' ? [['Outcome: you forced the issue and the Patron came', 60], ['International sympathy', 15 * sym], ['Patron credibility', 10 * cred], ['Kept the risk down', 5 * calm]]
      : why === 'smash_power' ? [['Outcome: the Power seized the outpost', 3], [`Months held (${held})`, 1.5 * held], ['International sympathy', 5 * sym]]
      : why === 'smash_abandoned' ? [['Outcome: you forced the issue and the Patron stayed out', 3], [`Months held (${held})`, 1.5 * held], ['International sympathy', 3 * sym]]
      : why === 'hold' ? [['Outcome: the outpost held', 55], ['Supplies left in December', 10 * c01(s.supplies / 4)], ['International sympathy', 15 * sym], ['Patron credibility', 10 * cred], ['Kept the risk down', 10 * calm]]
      : [['Outcome: the garrison withdrew', 5], [`Months held (${held})`, 2 * held], ['International sympathy', 8 * sym], ['Patron credibility', 5 * cred]];
  } else {
    const squeeze = c01(1 - s.minSupplies / P.start.supplies);
    parts = why === 'clash' ? [['Outcome: a clash, everyone loses', 5], ['Kept sympathy against you down', 5 * (1 - sym)]]
      : why === 'smash_power' ? [['Outcome: you smashed the line and the Patron stayed out', 60], [`Speed (month ${held})`, 2 * (P.turns - held)], ['Kept sympathy against you down', 10 * (1 - sym)]]
      : why === 'smash_abandoned' ? [['Outcome: they forced the issue and the Patron stayed out', 55], [`Speed (month ${held})`, 2 * (P.turns - held)], ['Kept sympathy against you down', 10 * (1 - sym)]]
      : why === 'smash_patron' ? [['Outcome: the Patron stepped in', 5], ['Kept sympathy against you down', 5 * (1 - sym)]]
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
  month: h.turn, base: h.base ?? 0, answered: h.answered, enc: h.enc, E: h.smash ? null : h.E, gapR: h.E > 0 && !h.smash ? h.E - s.R : null, resp: h.resp, P: h.smash ? null : h.P, gapT: h.smash ? null : h.P - (s.T - h.tAdj), smash: !!h.smash, supplies: h.after.supplies, esc: h.after.esc,
}));
