// Domestic politics (Batch B): a notional election calendar, Taiwan's legislature and the budget-type moves it
// votes on, Japan's survival declaration before its forces fight, the U.S. Congress and public, and the ceasefire
// after an accepted peace forum. Pure functions over the game state: the engine applies them (odds factors,
// refusals, home-support costs, Japan's stances) and the decision panel shows each one as a constraint chip with
// its reason (js/tips.js). Illustrative game design: no real election date, seat count or vote.
import { P } from '../data/params.js';
import { COUNTRIES } from '../data/countries.js';
import { BY_ID } from '../data/actions.js';
import { SEA } from '../data/theater.js';
import { allianceConstraints } from './alliance.js';

const POL = P.politics;

/** Does this capital have an opening (opportunists escalate when a rival looks weak)? */
export function opening(s, who) {
  if (who === 'cn') return s.coal < 50 || s.c.us.support < 40 || s.shock > 40;
  return s.c.cn.military < 55 || s.c.cn.support < 40;
}

/** This month's election for `who` on the notional calendar ({ turn, label }), or null. */
export const election = (s, who) => (POL.elections[who]?.turn === s.turn ? POL.elections[who] : null);
/** Is a ceasefire (after an accepted peace forum) in force this month? */
export const ceasefire = s => !!s.cease && s.cease.turn === s.turn && !s.cease.broken;

/** Taiwan's legislature this month: 'refuses' or 'slow' (for budget-type moves), or null when it passes them.
 * It follows the public mood (home support) unless the June by-elections settled it; it rallies once shooting starts. */
export function legislature(s) {
  if (s.rung >= 3) return null;
  const L = POL.legislature, sup = s.c.tw.support, mood = s.twLeg;
  if (mood === 'cooperative') return null;
  if (sup < L.refuse) return 'refuses';
  return mood === 'hostile' || sup < L.divided ? 'slow' : null;
}

const chip = (text, title, lines, notes = [], extra = {}) => ({ text, tip: { title, lines, notes }, ...extra });

/**
 * Every domestic or alliance constraint on move `id` for `who` this month: [{ text, tip, d?, block?, cost? }].
 * d: an odds factor [label, points]; block: the reason it cannot be carried out; cost: extra home support.
 */
export function constraints(s, who, id, o = {}) {
  const a = BY_ID[id], out = [], C = POL.congress;
  const el = election(s, who);
  if (el && (a.tags.includes('esc') || a.tags.includes('soft')))
    out.push(chip('Election month', 'Election month', [`${COUNTRIES[who].name} holds ${el.label} in ${P.months[el.turn]} (a notional calendar, invented for play).`],
      [`Home-support costs of postures and escalatory or accommodating moves are ×${POL.electionCost} this month. The result can change how the government behaves for the rest of the game.`]));
  if (who === 'tw' && a.budget) {
    const L = legislature(s), why = 'Budget-type moves (emergency arms purchases, the reserve call-up, reinforcing the outlying islands) need the Legislative Yuan.';
    if (L === 'refuses') out.push(chip('Legislature: refuses', 'The legislature will not pass it', [why, `With Taiwan’s home support below ${POL.legislature.refuse}, the opposition blocks the budget.`], ['From Limited strikes up the legislature rallies and passes it.'],
      { block: `The legislature will not pass the budget (Taiwan’s home support below ${POL.legislature.refuse})` }));
    else if (L === 'slow') out.push(chip(`Legislature ${POL.legislature.odds}`, 'The legislature slow-walks it', [why, s.twLeg === 'hostile' ? 'The June by-elections went against the government.' : `Taiwan’s home support is below ${POL.legislature.divided}: the opposition delays and trims the budget.`], ['From Limited strikes up the legislature rallies.'],
      { d: ['The legislature slow-walks the budget', POL.legislature.odds] }));
  }
  if (who === 'jp' && id === 'jp_escort' && s.rung >= 3 && !s.jpDeclared)
    out.push(chip('Needs survival declaration', 'Japan cannot use force yet', ['Escorting under fire is use of force. Japan must first declare a survival-threatening situation (the once-a-game Information move).'], ['Until then Japan’s forces hold to self-defence: Defend only, from Limited strikes up.'],
      { block: 'Japan must first declare a survival-threatening situation' }));
  if (who === 'us') {
    const sup = s.c.us.support, war = (s.usWar || 0) >= C.warMonths && sup < C.warSupport;
    if (id === 'us_aid' && sup < C.aid) out.push(chip(`Congress ${C.odds}`, 'Congress stalls the aid package', [`U.S. home support is below ${C.aid}: appropriations stall.`], [], { d: ['Congress stalls the aid package', C.odds] }));
    if (id === 'us_surge' && sup < C.surge) out.push(chip(`Public ${C.odds}`, 'The public is against a surge', [`U.S. home support is below ${C.surge}.`], [], { d: ['Public opposition to a surge', C.odds] }));
    if (id === 'us_mainland' && sup < C.mainland) out.push(chip('Congress: no', 'Congress will not back it', [`Strikes on the Chinese mainland need U.S. home support of ${C.mainland} or more.`], [],
      { block: `Congress will not back strikes on the mainland (U.S. home support below ${C.mainland})` }));
    if (war && ['us_strike', 'us_mainland', 'us_escort'].includes(id)) out.push(chip(`War Powers ${C.warOdds}`, 'The 60-day clock', [`U.S. forces have been fighting for ${s.usWar} months without authorisation from Congress, and home support is below ${C.warSupport}.`], [], { d: ['War Powers clock: no authorisation from Congress', C.warOdds] }));
  }
  if (ceasefire(s) && a.tags.includes('esc'))
    out.push(chip('Ceasefire', 'A ceasefire is in force', [`Each escalatory move costs ${-P.forum.ceaseEsc} more home support this month.`], ['A successful escalatory military or law-enforcement move breaks the ceasefire: a big loss of credibility at home and with partners, and the other side’s anger. If it holds through the month, the crisis ends in a settlement.'],
      { cost: P.forum.ceaseEsc }));
  out.push(...allianceConstraints(s, who, id, o).map(c => chip(c.text, c.title, c.lines, c.notes, c.extra)));
  return out;
}
export const politicsFactors = (s, who, id, o) => constraints(s, who, id, o).filter(c => c.d).map(c => c.d);
export const politicsBlock = (s, who, id, o) => constraints(s, who, id, o).find(c => c.block)?.block || null;

/** Home-support cost of a move after politics: ×1.5 in an election month, plus the ceasefire's extra cost. */
export function homeAdjust(s, who, move, d) {
  let x = d * (election(s, who) ? POL.electionCost : 1);
  if (ceasefire(s)) {
    x += P.forum.ceaseEsc * move.actions.filter(id => BY_ID[id].tags.includes('esc')).length;
    if (move.posture === 'esc' || move.posture === 'nuke') x += P.forum.ceaseEsc;
  }
  return x;
}

/** From Limited strikes up and before its survival declaration, Japan's forces hold to self-defence (Defend). */
export function selfDefence(s, log) {
  if (s.rung < 3 || s.jpDeclared) return;
  const fell = SEA.filter(a => s.stance.jp[a] !== 'defend' && s.units.jp.some(u => u.at === a && u.str > 0));
  for (const a of SEA) s.stance.jp[a] = 'defend';
  if (fell.length) log.push({ kind: 'note', text: 'Japan has not declared a survival-threatening situation: its forces hold to self-defence (Defend).' });
}

/** End of month: the War Powers clock, and the results of this month's elections. */
export function politicsMonth(s, log) {
  const fought = s.units.us.some(u => s.engaged?.[u.id]) || log.some(l => l.who === 'us' && ['us_strike', 'us_mainland'].includes(l.id) && ['success', 'partial'].includes(l.status));
  s.usWar = fought ? (s.usWar || 0) + 1 : (s.usWar || 0);
  for (const who of ['jp', 'tw']) {
    if (!election(s, who)) continue;
    const sup = s.c[who].support, won = sup >= 60, lost = sup < 45;
    if (who === 'jp') { s.jpCabinet = won ? 'firm' : lost ? 'wary' : null; }
    else s.twLeg = won ? 'cooperative' : lost ? 'hostile' : null;
    log.push({ kind: 'note', politics: true, text: `${COUNTRIES[who].name}’s ${POL.elections[who].label}: ${won ? 'the government wins clearly' : lost ? 'the government takes a beating' : 'no clear verdict'}${who === 'jp'
      ? (won ? '; Tokyo is firmer about U.S. use of its bases.' : lost ? '; a warier cabinet is slower to consent to U.S. use of its bases.' : '.')
      : (won ? '; the legislature will pass emergency budgets.' : lost ? '; the opposition will slow-walk emergency budgets.' : '.')}` });
  }
}

/** The constraints on the player's country this month, for the "At home" line in the decision panel. */
export function homeLine(s, who) {
  const out = [];
  const el = election(s, who); if (el) out.push(`${el.label[0].toUpperCase() + el.label.slice(1)} this month (notional): home-support costs ×${POL.electionCost}.`);
  for (const [w, e] of Object.entries(POL.elections)) if (w !== who && e.turn > s.turn) out.push(`${COUNTRIES[w].short}: ${e.label} in ${P.months[e.turn]}.`);
  if (who === 'tw') { const L = legislature(s); out.push(L === 'refuses' ? 'Legislature: refuses emergency budgets.' : L === 'slow' ? 'Legislature: slow-walks emergency budgets (−15).' : 'Legislature: passes emergency budgets.'); }
  if (who === 'jp') out.push(s.jpDeclared ? 'Survival-threatening situation declared: your forces may fight.' : 'No survival declaration yet: from Limited strikes up your forces hold to Defend.');
  if (who === 'us') out.push(`Congress: home support ${Math.round(s.c.us.support)}${s.usWar ? `; ${s.usWar} month${s.usWar === 1 ? '' : 's'} of fighting` : ''}.`);
  if (ceasefire(s)) out.push('Ceasefire this month: escalatory moves cost more at home; breaking it costs credibility.');
  return out;
}
