// The words behind the info icons: how a move's odds are worked out, what an opportunity move's condition is, what
// once-a-game, gray-zone and the fog-of-war ranges mean. Pure (no DOM), so the tests can check the text.
import { P } from '../data/params.js';
import { BY_ID } from '../data/actions.js';
import { oddsFor } from './engine.js';

const pts = d => `${d > 0 ? '+' : '−'}${Math.abs(d)}`;

/** { title, lines, notes } for the odds shown on a move: base + listed factors, the clamp, the roll, the assumption. */
export function oddsTip(s, moves, who, id) {
  const a = BY_ID[id], { p, factors } = oddsFor(s, moves, who, id);
  const base = Math.round(a.base * 100), sum = base + factors.reduce((t, f) => t + f[1], 0), pct = Math.round(p * 100);
  const lo = Math.round(P.clamp[0] * 100), hi = Math.round(P.clamp[1] * 100), band = Math.round(P.partialBand * 100);
  const top = Math.min(100, pct + band);
  return {
    title: `How ${pct}% is worked out`,
    lines: [`Base chance ${base}%`, ...factors.map(([l, d]) => `${l}: ${pts(d)}`)],
    notes: [
      sum === pct ? `Total ${pct}% (odds are kept between ${lo}% and ${hi}%).` : `Total ${sum}%, kept to ${pct}%: odds always stay between ${lo}% and ${hi}%.`,
      `One roll from 0 to 100: below ${pct} is a success; from ${pct} to ${top} a partial result (half the effect)${top < 100 ? `; above ${top} a failure` : ''}.`,
      'Assumes the other capitals repeat last month’s moves. When the month resolves the odds are worked out again with what everyone actually did, so they can change.',
    ],
  };
}

/** { title, lines, notes } for an opportunity move: the specific condition that puts it on the menu. */
export function oppTip(s, id) {
  const a = BY_ID[id];
  return {
    title: 'Opportunity',
    lines: [`On the menu only while ${a.oppWhy ? a.oppWhy(s) : 'its condition holds'}.`],
    notes: ['When the condition stops holding, the move disappears from the menu until it holds again.'],
  };
}

export const ONCE_TIP = { title: 'Once a game', lines: ['Its effect lasts the rest of the game, so you can carry it out only once.'], notes: ['After the month you use it (whatever the roll) it is marked USED and cannot be chosen again. A move that was blocked before it happened does not count.'] };
export const USED_TIP = { title: 'Used', lines: ['You have already carried out this once-a-game move.'], notes: [] };
export const GRAY_TIP = { title: 'Gray zone', lines: ['Coercion below military action: coast guard, maritime militia, cable cutting, cyber. It builds pressure without firing a shot. Only the quarantine and the militia swarm climb the ladder, and only to Coercion.'], notes: ['Each has a counter: coast guard escorts and expulsions, cable patrols and repairs, cyber defense.'] };

/** The fog-of-war key under the map. */
export const FOG_KEY = [
  ['Exact', 'Your own and your partners’ forces; rival forces in a sea area where your own formations are; and everywhere, if your surveillance or early-warning move paid off last month.'],
  ['Close read', 'A sea area next to one of yours, or where a partner’s formations are, and Taiwan’s coast seen from the sea in front of it: a narrow range (“about 6–8”), types known.'],
  ['Rough read', 'Everywhere else, including the Rear and Taiwan’s inland reserve: a wide range, and some formations show only as “unidentified”.'],
  ['Deception', 'China’s feints and Taiwan’s decoys shift or widen a range for a month (the truth may then lie outside it). Surveillance and forces in contact see through them; a public intelligence release blurs your own sight for a month.'],
];
