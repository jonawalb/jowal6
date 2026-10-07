// Postures and the strategic move menus (per country in data/moves/). Every number is illustrative game design.
// A move: { id, line, to, label, explain, tags, base, rung?, unlock?, maxRung?, opp?, avail?, oppWhy?, once?, cost?, grant?, fast?, follow?, req?, f?, fx, budget?, forum? }.
// budget: a Taiwanese budget-type move the legislature votes on (js/politics.js); forum: the peace-forum call (js/forum.js).
// opp: an opportunity move, on the menu only while avail(s) holds; oppWhy(s) says the condition in words.
// once: the move's effect lasts the game, so it can be carried out once (engine-enforced; see blockedWhy).
// tags: 'esc' escalatory, 'soft' accommodating, 'gray' gray-zone pressure below military action, 'talks'.
// fx(s, m, o, ctx) is linear in m (1 success, 0.5 partial, 0 failure) so the computer can plan with m = p.
// req(s, o, moves) and f(s, moves, who, o, final): `final` is true when the month resolves (hidden choices known).
// cost { lift, fuel, mun, ready } (or a function of the follow-up answers) is paid when chosen; grant adds resources.
import { CN } from './moves/cn.js';
import { US } from './moves/us.js';
import { TW } from './moves/tw.js';
import { JP } from './moves/jp.js';
import { FORUM } from './moves/forum.js';
export { T } from './ops.js';

export const POSTURES = [
  { id: 'stand', label: 'Stand down', level: -2, maxEsc: 0, explain: 'Pull back forces and rhetoric. Reads as weakness or as good faith. No escalatory (▲) moves.' },
  { id: 'deesc', label: 'De-escalate', level: -1, maxEsc: 1, explain: 'Lower the temperature while keeping your options. At most one escalatory (▲) move.' },
  { id: 'hold', label: 'Hold', level: 0, explain: 'Keep your current stance.' },
  { id: 'esc', label: 'Escalate', level: 1, explain: 'Raise readiness and harden your public line. Your military moves get +5.' },
  { id: 'nuke', label: 'Nuclear signal', level: 2, only: ['us', 'cn'], minRung: 2, explain: 'Put nuclear forces on visible alert. A loud signal that also raises the nuclear shadow for everyone.' },
];

export const ACTIONS = { cn: [...CN, FORUM.cn], us: [...US, FORUM.us], tw: [...TW, FORUM.tw], jp: [...JP, FORUM.jp] };
export const BY_ID = Object.fromEntries(Object.values(ACTIONS).flat().map(a => [a.id, a]));
export const TO = Object.fromEntries(Object.values(BY_ID).map(a => [a.id, a.to]));
/** Which capital a move belongs to. */
export const OWNER = Object.fromEntries(Object.entries(ACTIONS).flatMap(([w, l]) => l.map(a => [a.id, w])));
/** Has this once-a-game move already been carried out? */
export const usedUp = (s, id) => !!BY_ID[id].once && !!s.used?.[OWNER[id]]?.includes(id);
export const LINES = { D: 'Diplomatic', I: 'Information', M: 'Military', E: 'Economic', F: 'Financial', N: 'Intelligence', L: 'Law enforcement' };
export const LINE_SHORT = { D: 'Dip', I: 'Info', M: 'Mil', E: 'Econ', F: 'Fin', N: 'Intel', L: 'Law' };
/** Strategic moves a capital may choose each month. */
export const MAX_MOVES = 4;

/** How many escalatory moves a posture allows (Infinity if no limit). */
export const escRoom = posture => { const p = POSTURES.find(x => x.id === posture); return p && p.maxEsc != null ? p.maxEsc : Infinity; };
export const isEsc = id => BY_ID[id].tags.includes('esc');
/** Postures open to a capital (only the nuclear-armed can signal, and only from Blockade up). */
export const posturesFor = (who, s) => POSTURES.filter(p => (!p.only || p.only.includes(who)) && (!s || !p.minRung || s.rung >= p.minRung));
/** Is a move on the menu this month (rung unlocks, opportunity conditions)? */
export const onMenu = (s, a) => (a.unlock == null || s.rung >= a.unlock) && (a.maxRung == null || s.rung <= a.maxRung) && (!a.avail || a.avail(s));
export const menu = (s, who) => ACTIONS[who].filter(a => onMenu(s, a));
/** Follow-up answers with defaults (first option) filled in. */
export function answers(id, given = {}) {
  const a = BY_ID[id], o = {};
  for (const fq of a.follow || []) o[fq.id] = fq.opts.some(x => x.id === given[fq.id]) ? given[fq.id] : fq.opts[0].id;
  return o;
}
