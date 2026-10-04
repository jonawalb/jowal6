// "Learn to play" (2026-10-04): the hands-on first battle for a newcomer, as steps for the tour engine
// (js/ui/tour.js, track 'learn'). It runs on the small tutorial battle (js/tutorial.js): you defend, five hours,
// the real rules. One idea per step, in plain words; every term is explained the first time it appears. "do"
// steps wait until you have done the thing (or press Skip). Order: what winning means; a machine gun firing
// sideways (then the word "enfilade"); why not to pack the front line; ending an hour and reading it; a
// counterattack on a lost box while the window is open; the end and the result.
import { SCALES } from '../../data/scales.js';
import { gridFor } from '../grid.js';
import { fighting, isCompany } from '../forces.js';
import { S } from './store.js';
import { closeUnitPop } from './unit-pop.js';

const q = s => document.querySelector(s);
const g = () => S.g;
const G = () => gridFor(S.g ? S.g.scale : 't');
const obj = () => SCALES[S.g ? S.g.scale : 't'].obj;
const mine = () => (g() ? g().units.filter(u => u.side === 'def' && fighting(u) && u.sec >= 0) : []);
const mg = () => mine().find(u => u.type === 'mg');
const chip = u => (u ? q(`#map [data-u="${u.id}"]`) : null);
const box = s => (s != null && s >= 0 ? q(`#map [data-s="${s}"]`) : null);
const thisHour = kind => (g() ? g().log.filter(a => a.t === g().t && a.kind === kind) : []);
/** The crowded front box: the sector of yours with the most companies (the lesson starts with four in one). */
const crowded = () => {
  const n = new Map();
  for (const u of mine()) if (isCompany(u)) n.set(u.sec, (n.get(u.sec) || 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? -1;
};
const lodgs = () => (g() ? Object.keys(g().lodg).map(Number) : []);
/** Your companies next to a lodgment that have not been sent at it this hour. */
const nextTo = () => {
  const L = lodgs(), sent = new Set(thisHour('riposte').map(a => a.unit));
  return mine().filter(u => isCompany(u) && !sent.has(u.id) && L.some(s => G().adj(u.sec, s)));
};
/** The lost box and the boxes around it (kept clear of the card while you counterattack). */
const near3 = () => { const L = lodgs()[0]; return L == null ? [] : [L, ...G().nbrs[L]].map(box); };
/** What to point at while counterattacking: the button, then (once it is pressed) the lost box to tap. */
const caTarget = () => (S.tool && S.tool.kind === 'riposte' ? box(lodgs()[0]) : q('#upop:not([hidden]) [data-tool="riposte"]') || q('#sel [data-tool="riposte"]')) || box(lodgs()[0]) || q('#box');
const over = () => !!(g() && g().over);
const retook = () => !!(g() && g().events.some(e => e.kind === 'retaken' && e.side === 'def'));
const sel = () => q('#upop:not([hidden])') || q('#sel');
/** Start a step with nothing selected and no tool armed (an armed Lane would turn the next tap into a lane). */
const fresh = (keep = {}) => () => {
  if (S.g && !S.g.over && (S.sel.length || S.selFmn || S.tool)) { S.sel = []; S.selFmn = null; S.tool = null; closeUnitPop(false); S.ui.redraw(); }
  return keep;
};

export const LEARN_STEPS = [
  { title: 'You hold the line', target: () => q('#box'), tab: 'map',
    body: () => 'You command a small battalion of the Sorrel Republic: the <b>blue</b> squares. The enemy, the Orvane Crown, attacks from the top of the map. The battle lasts five turns; each turn is one hour.' },
  { title: 'How you win', target: () => q('#objtrack'), tab: 'map',
    body: () => `The thick line across the map is your <b>objective line</b>, ${obj().name}. The enemy wins only if, when the last hour ends, he holds ${obj().need} of its boxes side by side. Anything else is your win. Losses do not decide it: you can lose men, and even lose ground, and still win.` },
  { title: 'Boxes and units', target: () => q('#box'), tab: 'map',
    body: () => 'The map is cut into boxes 500 metres across (the game calls them <b>sectors</b>). Each square is one of your companies, about 100–200 men: <b>R</b> is riflemen, <b>M</b> a machine-gun company. The bar under each one is its strength left.' },
  { title: 'Pick your machine gun', target: () => chip(mg()) || q('#box'), tab: 'map', start: fresh(),
    do: () => 'Tap the <b>M</b> on the left edge of the map.',
    done: () => S.sel.length === 1 && g().units[g().ix[S.sel[0]]]?.type === 'mg' },
  { title: 'Fire sideways', target: () => q('#upop:not([hidden]) [data-tool="lane"]') || q('#sel [data-tool="lane"]') || sel(), tab: 'map',
    body: () => 'A machine gun firing straight at men coming toward it hits only the few in front, and they can hide behind cover. Fired <b>sideways, along their line</b>, it sweeps the whole line and their cover faces the wrong way.',
    do: () => 'Press <b>Lane</b>, then tap the box just to the right of the M. Its fire lane will run across the front.',
    done: () => thisHour('lane').some(a => a.dir === 2 || a.dir === 6) },
  { title: 'That is enfilade', target: () => q('#box'), tab: 'map',
    start: fresh(),
    body: () => 'Fire from the flank, along the enemy’s line, is called <b>enfilade</b>. When the hour starts, an orange wedge shows your lane. Only machine-gun companies lay lanes, and a lane belongs to the spot it was laid from: if the gun moves, lay it again.' },
  { title: 'Too many in one box', target: () => box(crowded()) || q('#box'), tab: 'map',
    start: fresh(),
    body: () => 'Four of your companies are packed into one front box (outlined). The enemy’s guns shell the front first, and a crowded box takes extra losses. Keep the front thin and hold men back.',
    do: () => 'Tap that box, pick one company in the list, then tap the empty box just behind it (below it on the map).',
    clear: () => [box(crowded()), box(crowded() + G().cols), q('#sheet:not([hidden])')],
    done: () => thisHour('move').length > 0 },
  { title: 'End the hour', target: () => q('#end'), tab: 'map', start: () => ({ t: g().t }),
    body: () => 'Your orders are in. Both sides now move and fight at the same time for one hour.',
    do: () => 'Press <b>End hour</b>.', done: s0 => g().t > s0.t },
  { title: 'Read what happened', target: () => q('#say'), tab: 'map',
    body: () => 'This line sums up the last hour: only what your side saw. Red diamonds on the map are enemy companies you have spotted; a faded one is an older sighting.' },
  { title: 'Here they come', target: () => q('#end'), tab: 'map', start: () => ({ t: g().t }), skip: () => over() || lodgs().length > 0,
    body: () => 'The enemy is closing on your front boxes.',
    do: () => 'Press <b>End hour</b> again and watch the front.', done: s0 => lodgs().length > 0 || over() || g().t >= s0.t + 2 },
  { title: 'He broke in', target: () => box(lodgs()[0]) || q('#box'), tab: 'map', skip: () => over() || !lodgs().length, start: fresh(),
    body: () => 'The enemy has taken a box: see the <b>clock badge</b> on it. A box he has just taken is called a <b>lodgment</b>. His men there are worn out (they fought all night) and not yet dug in, so a counterattack needs far fewer men than his attack did. Green badge: that window is open. Amber: closing. Grey: he has dug in.' },
  { title: 'Counterattack now', target: caTarget, tab: 'map',
    skip: () => over() || !lodgs().length, start: () => fresh({ n: thisHour('riposte').length })(),
    body: () => 'Companies next to the lost box can strike it this hour. This is a <b>local counterattack</b>.',
    do: () => 'Tap one of your companies next to the box with the clock, press <b>Local counterattack</b>, then tap the box.',
    clear: () => near3(),
    done: s0 => thisHour('riposte').length > s0.n || !lodgs().length },
  { title: 'Send more than one', target: caTarget, tab: 'map',
    skip: () => over() || !lodgs().length,
    body: () => 'One company alone is rarely enough. The more you send while the window is open, the better the odds.',
    start: fresh(),
    do: () => 'Do the same with <b>two more</b> companies next to the box.',
    clear: () => near3(),
    done: () => thisHour('riposte').length >= 3 || !nextTo().length || !lodgs().length },
  { title: 'Strike', target: () => q('#end'), tab: 'map', start: () => ({ t: g().t }), skip: () => over() || !thisHour('riposte').length,
    do: () => 'Press <b>End hour</b>. Counterattacks go in at once.', done: s0 => g().t > s0.t || over() },
  { title: () => (retook() ? 'You took it back' : 'Not this time'), target: () => q('#say'), tab: 'map', skip: () => over() || !g().log.some(a => a.kind === 'riposte'),
    body: () => (retook() ? 'The box is yours again. Striking while his men were still disorganized made the difference.'
      : 'The counterattack stalled: he had too many men there. With more companies, or sooner, it may still work while the badge is green.') },
  { title: 'Play to the end', target: () => q('#end'), tab: 'map', skip: over,
    body: () => `Keep him off ${obj().name}. You can move companies, lay the lane again if the gun moves, and counterattack any new lodgment.`,
    do: () => 'Press <b>End hour</b> until the battle ends (five hours in all).', done: over },
  { title: () => (g() && g().over && g().over.winner === 'def' ? 'You won' : 'The result'), target: () => q('#aar'), tab: 'map', end: 'Finish',
    body: () => `${g() && g().over && g().over.winner === 'def' ? 'He did not hold the objective line at the end: you won.' : 'He held the objective line at the end: this time he won.'} The result card shows how. That is the whole game: the real battles are bigger, with more of everything, and you plan your own defense or attack first.` },
];
