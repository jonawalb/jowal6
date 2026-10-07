// Key moments for the after-action review: first contact, lodgments, overruns, stalls, each riposte and
// counterstroke with its window, early and late barrage lifts, big enfilade hits, infiltration, the breakthrough,
// objective changes and units broken. Hour-stamped, toned good/bad for the player on side `me`. The review comes
// after the game, so it may tell the player what was true (for example, that an infiltrator was never seen),
// and says so when it does. Plain sentences; event contract in js/tldr.js.
import { hhmm, place, unitLabel, BIG_ENFILADE } from './tldr.js';

const MAX = 18;
const range = w => (w[0] === w[1] ? hhmm(w[0]) : `${hhmm(w[0])}–${hhmm(w[1] + 1)}`);
const ca = x => (x == null ? '' : `, counterattack strength × ${(Math.round(x * 10) / 10).toFixed(1)}`);

/** Window quality for a counterattack: inside, early, late or none. */
export function windowWord(e) {
  if (!e.window) return 'no window was open (the lodgment had consolidated)';
  if (e.t >= e.window[0] && e.t <= e.window[1]) return `inside the window (${range(e.window)})`;
  return `${e.t < e.window[0] ? 'before' : 'after'} the window (${range(e.window)})`;
}

const BUILD = {
  contact: (g, e, me) => ({ tone: '', text: `Your first contact with the enemy, at ${place(g, e.sec)}.` }),
  lodgment: (g, e, me) => (e.side === me ? { tone: 'good', text: `You took ${place(g, e.sec)}.` }
    : e.empty ? { tone: '', text: `The enemy occupied empty ${place(g, e.sec)}.` } : { tone: 'bad', text: `The enemy took ${place(g, e.sec)} from you.` }),
  overrun: (g, e, me) => (e.side === me
    ? { tone: 'bad', text: `Your ${unitLabel(g, e.unit, me)} was overrun at ${place(g, e.sec)}.` }
    : { tone: 'good', text: `You overran ${unitLabel(g, e.unit, me)} at ${place(g, e.sec)}.` }),
  stall: (g, e, me) => (e.side === me
    ? { tone: 'bad', text: `${e.side === 'def' ? 'Your counterattack' : 'Your assault'} stalled at ${place(g, e.sec)}${e.gauge != null ? ` at ${e.gauge}% of the strength it needed` : ''}.`, gauge: e.gauge }
    : { tone: 'good', text: `You stopped an assault at ${place(g, e.sec)}.` }),
  counter: (g, e, me) => {
    const what = e.how === 'counterstroke' ? 'deliberate counterattack (counterstroke)' : 'local counterattack (riposte)';
    const res = e.won ? 'and retook the sector' : 'and stalled';
    if (e.side === me) return { tone: e.won ? 'good' : 'bad', text: `Your ${what} at ${place(g, e.sec)} struck at ${hhmm(e.t)}, ${windowWord(e)}${ca(e.ca)}, ${res}.` };
    return { tone: e.won ? 'bad' : 'good', text: `An enemy ${what} hit your men at ${place(g, e.sec)} at ${hhmm(e.t)} ${e.won ? 'and threw you out' : 'and you beat it off'}.` };
  },
  lift: (g, e, me) => {
    const p = place(g, e.sec), own = e.side === me;
    if (e.case === 'late') return { tone: own ? 'bad' : 'good', text: own ? `Late lift at ${p}: your infantry ran into its own barrage.` : `Late lift at ${p}: the enemy’s infantry ran into their own barrage in front of your men.` };
    return { tone: own ? 'bad' : 'good', text: own ? `Early lift at ${p}: the barrage moved on before your infantry arrived, and the defenders were up and firing.` : `Early lift at ${p}: the enemy’s barrage moved on before his infantry arrived, and your men were up and firing.` };
  },
  enfilade: (g, e, me) => {
    if (e.loss != null && e.loss < BIG_ENFILADE) return null;
    const pts = e.loss != null ? ` (${e.loss.toFixed(1)} strength)` : '';
    return e.side === me
      ? { tone: 'good', text: `Your ${unitLabel(g, e.unit, me)} caught attackers along its lane at ${place(g, e.sec)}${pts}: fire from the flank hits a line along its length.` }
      : { tone: 'bad', text: `An enemy MG lane enfiladed your men at ${place(g, e.sec)}${pts}.` };
  },
  detect: (g, e, me) => (e.side === me ? { tone: 'good', text: `You spotted infiltrators at ${place(g, e.sec)}.` } : { tone: 'bad', text: `Your infiltrators were spotted at ${place(g, e.sec)}.` }),
  infiltrate: (g, e, me) => (e.side === me
    ? { tone: 'good', text: `Your ${unitLabel(g, e.unit, me)} slipped through ${place(g, e.sec)} unseen.` }
    : { tone: 'bad', text: `An enemy ${unitLabel(g, e.unit, me).replace(/^an enemy /, '')} slipped through ${place(g, e.sec)} without your men seeing it (revealed after the battle).` }),
  laneLost: (g, e, me) => (e.side === me ? { tone: 'bad', text: `Your ${unitLabel(g, e.unit, me)} lost its lane when it moved (now at ${place(g, e.sec)}): lay it again.` } : null),
  breakthrough: (g, e, me) => (e.side === me ? { tone: 'good', text: `You broke through at ${place(g, e.sec)}.` } : { tone: 'bad', text: `The enemy broke through your line at ${place(g, e.sec)}.` }),
  objective: (g, e, me) => {
    if (e.held === e.prevHeld) return null;
    const up = e.held > e.prevHeld, att = e.side === me;
    return { tone: up === att ? 'good' : 'bad', text: att ? `You now hold ${e.held} of the ${e.need} side-by-side objective sectors you need.` : `The enemy now holds ${e.held} of the ${e.need} side-by-side objective sectors he needs to beat you.` };
  },
};

/** Moments for the review, oldest first: [{ t, tone: 'good' | 'bad' | '', text, kind }]. */
export function moments(g, me, max = MAX) {   // QA: the hourly reports feed passes Infinity (the review keeps MAX)
  const ev = g.events || [], out = [];
  let contact = false;
  const lodg = new Set();
  for (const e of ev) {
    if (e.kind === 'contact') { if (contact) continue; contact = true; }
    if (e.kind === 'lodgment') { const k = e.side === me ? 'me' : 'foe'; if (lodg.has(k)) continue; lodg.add(k); } // first each side
    const b = BUILD[e.kind];
    const m = b && b(g, e, me);
    if (m) out.push({ t: e.t, kind: e.kind, ...m });
  }
  // Units broken: one line per hour per side.
  const brk = ev.filter(e => e.kind === 'break');
  for (const t of [...new Set(brk.map(e => e.t))]) {
    const mineB = brk.filter(e => e.t === t && e.side === me), foeB = brk.filter(e => e.t === t && e.side !== me);
    if (mineB.length) out.push({ t, kind: 'break', tone: 'bad', text: `${mineB.length > 1 ? `${mineB.length} of your units broke` : 'Your unit broke'}: ${mineB.map(e => `${unitLabel(g, e.unit, me)} at ${place(g, e.sec)}`).join(', ')}.` });
    if (foeB.length) out.push({ t, kind: 'break', tone: 'good', text: `${foeB.length > 1 ? `${foeB.length} enemy units broke` : 'An enemy unit broke'} under your fire.` });
  }
  const pri = ['breakthrough', 'objective', 'counter', 'overrun', 'lodgment', 'lift', 'enfilade', 'infiltrate', 'detect', 'stall', 'break', 'contact', 'laneLost'];
  const keep = out.length <= max ? out : [...out].sort((a, b) => pri.indexOf(a.kind) - pri.indexOf(b.kind)).slice(0, max);
  return keep.sort((a, b) => a.t - b.t).map(m => ({ ...m, when: hhmm(m.t) }));
}
