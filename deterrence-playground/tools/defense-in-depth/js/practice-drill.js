// The Practice field's guided drill: nine short steps, one instruction at a time, each checked against what the
// player actually did (the selection, the logged orders, the clock), then free practice. Pure: no DOM, so the
// step-completion logic is tested in Node (scripts/practice.test.mjs). js/ui/practice-ui.js draws the card.
import { gridFor } from './grid.js';

const G = () => gridFor('p');
/** Orders the player gave since the step started (g.log holds every order, logged by engine.issue). */
const since = c => c.g.log.slice(c.log0 || 0);
/** How far an order sends a unit: from its box at the start of the hour the order was given. */
const reach = (g, a) => { const i = g.ix[a.unit], p = g.pos[a.t]; return p && i != null && p[i] >= 0 ? G().dist(p[i], a.to) : 0; };
/** Has the unit left the box it stood in when the order was given? */
const setOff = (g, a) => { const i = g.ix[a.unit], p = g.pos[a.t]; return !!p && g.units[i].sec !== p[i]; };
const isMove = a => a.kind === 'move' || a.kind === 'leapfrog' || (a.kind === 'fmn' && a.order && a.order.kind === 'move');
const ACROSS = new Set([2, 6]);   // lane directions east and west: along a row, across the enemy's line of advance

/**
 * The steps. Each: { id, title, do(side, era) → instruction, more?(side, era) → one or two plain sentences,
 * done(c) → true when the player has done it, nudge?(c) → a hint when they did something close but not it }.
 * c = { g, side, sel, selFmn, greyed, t0, log0 }: t0 and log0 are the clock and the log length at the step's start.
 */
export const DRILL = [
  {
    id: 'select', title: 'Pick a unit',
    do: () => 'Tap one of your units on the map (a square with a letter: R rifle, M machine gun …), or tap it in the unit list (the Units tab on a phone).',
    more: () => 'Each square is a box (the game calls it a sector, 500 m across). The unit’s orders open next to it; Escape or × closes them and the unit stays picked.',
    done: c => c.sel.length > 0 || !!c.selFmn,
  },
  {
    id: 'move', title: 'Move it one box',
    do: () => 'With a unit picked, tap an empty box next to it. That sends the order.',
    more: () => 'The line from the unit to the box is its order. A solid line starts this hour; a dashed line means the order is still on its way and starts later (the clock mark ◷ says so too).',
    done: c => since(c).some(isMove),
  },
  {
    id: 'end', title: 'End the hour',
    do: () => 'Press End hour (top bar, or the N key) and watch the unit move.',
    more: (side, era) => `Out of contact a company covers about two boxes an hour on open ground; woods, villages and diagonal steps cost more, and next to the enemy it slows to one. In the real game orders often start late: ${era === 'm' ? 'radio is quick, but jamming delays it' : 'in 1917–18 most go by runner, an hour or two late'}. The bar says when this hour’s orders start.`,
    done: c => c.g.t > c.t0,
  },
  {
    id: 'far', title: 'Send a unit farther',
    do: () => 'Pick a unit and tap a box two or more boxes away, then press End hour until it sets off.',
    more: () => 'This hour your orders are running late (the bar says when they start), so its line is dashed. A far box takes more than one hour: the late start plus the march.',
    done: c => since(c).some(a => a.kind === 'move' && reach(c.g, a) >= 2 && c.g.t > a.t && setOff(c.g, a)),
    nudge: c => (since(c).some(a => a.kind === 'move' && reach(c.g, a) >= 2) ? 'Good. Now press End hour until it sets off.' : since(c).some(isMove) ? 'That box is next door: pick one at least two boxes away.' : ''),
  },
  {
    id: 'group', title: 'Move a group together',
    do: () => `In the unit list, tap the formation name <b>1st Battalion</b> to pick all four of its companies, then tap a box on the map. (Or press <b>Select several</b>, tap two units, then a box.)`,
    more: () => 'A formation order moves every company and keeps their layout. In the big battles this saves hundreds of taps.',
    done: c => since(c).some(a => a.kind === 'fmn' && a.order && a.order.kind === 'move')
      || Object.values(groupBy(since(c).filter(a => a.kind === 'move'), a => `${a.t}:${a.to}`)).some(l => new Set(l.map(a => a.unit)).size >= 2),
  },
  {
    id: 'lane', title: 'Give a machine gun a fire lane',
    do: () => 'Pick an MG company (M), press <b>Lane</b> in its orders, then tap a box along its row, to its left or right.',
    more: (side, era) => `Machine guns are the enfilade weapon, and only ${era === 'm' ? 'weapons (MG) companies' : 'MG companies'} lay fire lanes. A lane along the row fires across the enemy’s line of advance, down the length of his line, from the side. It is laid when the hour is played.`,
    done: c => since(c).some(a => a.kind === 'lane' && ACROSS.has(a.dir)),
    nudge: c => (since(c).some(a => a.kind === 'lane') ? 'That lane points up or down the board, at the enemy’s front. Lay it along the row (left or right) so it enfilades.' : ''),
  },
  {
    id: 'fire', title: 'Give the guns a target',
    do: side => `Pick a battery (${side === 'att' ? 'in the unit list: your guns stand off the map, behind your lines' : 'a round chip, F'}). Keep <b>Suppress</b>, then tap any box.`,
    more: () => 'Batteries do not move: they fire on a box. The square on the map marks where the shells land this hour.',
    done: c => since(c).some(a => a.kind === 'fire'),
  },
  {
    id: 'grey', title: 'Greyed-out orders',
    do: () => 'Look at a unit’s orders: a greyed button has no effect for that unit. Tap one to see why. (A battery’s <b>Move</b> is greyed; so is a rifle company’s <b>Lane</b>.)',
    more: () => 'Greyed buttons stay visible so you learn what each unit can and cannot do.',
    done: c => !!c.greyed,
  },
  {
    id: 'stance', title: side => (side === 'att' ? 'Posture and route' : 'Stance and route'),
    do: side => `Pick a company and change its <b>${side === 'att' ? 'Posture' : 'Stance'}</b> or its <b>Route</b> (say, Route: Covered).`,
    more: side => (side === 'att' ? 'Posture is how it moves and fights (Rush is fastest and most exposed; Infiltrate slips past posts), and Route is how it travels (Covered is slower but safer; Road is fast behind your lines).'
      : 'Stance is how it fights for its box (Hold, Give ground, Delay, Local counterattack, Reserve), and Route is how it travels (Covered is slower but safer; Road is fast behind your lines).'),
    done: c => since(c).some(a => a.kind === 'stance' || a.kind === 'posture' || a.kind === 'mode' || (a.kind === 'fmn' && a.order && ['stance', 'posture', 'mode'].includes(a.order.kind))),
  },
];

export const DRILL_IDS = DRILL.map(s => s.id);
export const stepTitle = (s, side) => (typeof s.title === 'function' ? s.title(side) : s.title);

function groupBy(list, key) {
  const out = {};
  for (const x of list) (out[key(x)] ||= []).push(x);
  return out;
}

/** A fresh drill: step 0. Free practice is step DRILL.length. */
export const drillState = (g, side) => ({ i: 0, side, t0: g.t, log0: g.log.length, greyed: false });

/** Move to step k (skips included), noting the clock and the log length the next check counts from. */
export const goStep = (st, g, k) => ({ ...st, i: Math.max(0, Math.min(DRILL.length, k)), t0: g.t, log0: g.log.length, greyed: false });

/** Is the current step done? sel / selFmn come from the page (S.sel, S.selFmn). Free practice never completes. */
export function stepDone(st, g, sel = [], selFmn = null) {
  const s = DRILL[st.i];
  if (!s) return false;
  return !!s.done({ g, side: st.side, sel, selFmn, greyed: st.greyed, t0: st.t0, log0: Math.min(st.log0, g.log.length) });
}

/** A hint for the current step, or ''. */
export function stepNudge(st, g) {
  const s = DRILL[st.i];
  return s && s.nudge ? s.nudge({ g, side: st.side, greyed: st.greyed, t0: st.t0, log0: Math.min(st.log0, g.log.length) }) : '';
}

/** One line after a practice hour, from practiceHour()'s summary. names: id → short name. */
export function hourLine(h, names, clock) {
  const n = h.moved.length, w = h.waiting.length, f = h.fired.length;
  const bits = [];
  if (n) bits.push(n === 1 ? `${names(h.moved[0].id)} moved ${h.moved[0].steps} box${h.moved[0].steps === 1 ? '' : 'es'}` : `${n} units moved`);
  if (w) bits.push(`${w === 1 ? names(h.waiting[0]) : `${w} units`} still ${w === 1 ? 'has' : 'have'} an order on its way`);
  if (f) bits.push(`${f === 1 ? 'a battery' : `${f} batteries`} fired`);
  return `${clock}: ${bits.length ? bits.join('; ') : 'nothing moved (no orders were running)'}.`;
}
