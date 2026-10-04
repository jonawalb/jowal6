// Walkthrough steps for each side (SPEC §8.7), updated for the streamlined screen (2026-10-02): the stepped
// "Your plan" panel, orders in a popover next to the unit on the map, layers under "More layers", and the unit
// list folded to battalions with the "Needs orders" filter. 2026-10-04: plain words, each term glossed the first
// time it appears (enfilade, dead ground, lodgment, consolidate, overwatch ...), shorter cards. One action per "do" step, which moves on by itself
// once done. Targets are looked up when the step shows, since the page redraws as you play.
import { SCALES } from '../../data/scales.js';
import { S } from './store.js';
import { drawPanels } from './play.js';
import { reveal } from './units-panel.js';

const q = s => document.querySelector(s);
const firstMG = () => S.g && S.g.units.find(u => u.side === S.me && u.type === 'mg' && u.role === 'strong') || S.g.units.find(u => u.side === S.me && u.type === 'mg');
const unitRow = id => q(`#tree [data-u="${id}"]`);
const csRow = () => { const f = S.g && Object.values(S.g.fmns).find(x => x.side === 'def' && x.cs); return f ? q(`#tree [data-fmn="${f.id}"]`) : null; };
const ordered = kind => S.g && S.g.log.some(a => a.t === S.g.t && a.kind === kind);
/** QA fix: the standing-orders panel shows only with nothing selected, so that step clears the selection. */
const unselect = () => { if (S.g && S.g.phase === 'battle' && (S.sel.length || S.selFmn || S.tool)) { S.sel = []; S.selFmn = null; S.tool = null; S.ui.redraw(); } return null; };
const obj = () => SCALES[S.g ? S.g.scale : 'd'].obj;
/** Open plan step n (the step a tour card talks about). */
const planStep = n => () => { if (S.g && S.g.phase === 'plan' && S.planStep !== n) { S.planStep = n; S.ui.redraw(); } return null; };
/** Show every unit in the list and unfold the battalion of `u`. */
const showUnit = u => { if (!S.g || !u) return; S.filter = 'all'; reveal(u.id); drawPanels(); };
const openMore = () => { const b = q('#layerbar [data-more]'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); return null; };
const firstRifle = () => S.g && S.g.units.find(u => u.side === 'att' && u.type === 'rifle' && u.role === 'wave1' && u.sec >= 0);
const sel = () => q('#upop:not([hidden])') || q('#sel');

export const STEPS = {
  def: [
    { title: 'You defend', target: () => q('#objtrack'), tab: 'map',
      body: () => `The attacker wins only if, at the end of the last hour, he holds ${obj().need} side-by-side sectors (map boxes, 500 m across) of ${obj().name}, the thick line. Losses do not decide it. Your counterattack force waits behind that line, so you can lose part of it and take it back.` },
    { title: 'Your plan, step by step', target: () => q('.dd-steps'), tab: 'plan', start: planStep(1),
      body: () => 'Five steps: Zones, MG lanes, Works (trenches and wire), Counterattack, Artillery. Each chip shows its status; tap one to open it. A sound plan is already filled in.' },
    { title: 'Three zones', target: () => q('#box'), tab: 'map',
      body: () => 'Three bands, front to back: thin <b>outposts</b> warn and delay; the <b>battle zone</b>, behind the crest of the ridge, is where you stop the attack; the <b>rear zone</b> holds your guns and the counterattack force. Packed front lines die to shellfire.' },
    { title: 'Pick an MG company', target: () => q(`#pstep [data-pselu="${firstMG()?.id}"]`) || q('#pstep'), tab: 'plan', start: planStep(2),
      do: () => `Tap <b>${firstMG()?.short || 'an MG company'}</b> here (or on the map). Only machine-gun (MG) companies lay fire lanes.`, done: () => S.sel.length === 1 && S.g.units[S.g.ix[S.sel[0]]]?.type === 'mg' },
    { title: 'Lay its lane across the front', target: () => q('#upop:not([hidden]) [data-ptool="lane"]') || q('#pstep [data-ptool="lane"]') || q('[data-ptool="lane"]'), tab: 'plan', start: () => ({ n: S.lanesLaid || 0 }),
      do: () => 'Press <b>Lay lane</b>, then tap a sector to the left or right of the MG on the map.',
      body: () => 'A lane along the row fires sideways into the attackers’ line, not head-on: it hits the whole line and their cover faces the wrong way. That is <b>enfilade</b>.',
      done: (s0) => (S.lanesLaid || 0) > s0.n },
    { title: 'Coverage from two directions', target: () => q('#layerbar [data-layer="cover"]') || q('#layerbar [data-more]'), tab: 'map', start: openMore,
      do: () => 'Under <b>More layers</b>, turn on <b>Coverage</b>.', done: () => S.layers.has('cover'),
      body: () => 'Each number is how many directions fire covers a sector from. Two or more leave the attacker few folds and hollows to shelter in (<b>dead ground</b>).' },
    { title: 'Start the battle', target: () => q('#plan-start'), tab: 'plan',
      do: () => 'The rest of the plan is the doctrinal one. Press <b>Start the battle</b>.', done: () => S.g && S.g.phase === 'battle' },
    { title: 'Orders open next to the unit', target: () => q('#box'), tab: 'map',
      do: () => 'Tap any of your units on the map. Its orders open next to it (at the bottom on a phone).', done: () => S.sel.length > 0 },
    { title: 'The “i” buttons and greyed orders', target: () => sel()?.querySelector('.dd-info') || sel(), tab: 'map',
      body: () => 'Each “i” shows how a number was worked out, only from what your side has seen. Hover a button to see what it does; a greyed one does nothing for this unit and says why.' },
    { title: 'The counterattack window', target: () => csRow() || q('#tree'), tab: 'units', start: () => { S.filter = 'all'; drawPanels(); return null; },
      body: () => 'A sector the enemy has just taken is a <b>lodgment</b>; a clock badge marks it. His men there are tired and not yet dug in: green while that window is open, amber as it closes, grey once he has <b>consolidated</b> (dug in, about 2 hours). Companies next to it can strike at once (<b>Local counterattack</b>); your counterattack force strikes after its planning time (<b>Deliberate counterattack</b>).' },
    { title: 'Command whole formations', target: () => q('#tree [data-fmn]'), tab: 'units',
      do: () => 'Tap a formation’s name (a battalion or group) to select all its units at once.', done: () => !!S.selFmn },
    { title: 'End the hour', target: () => q('#end'), tab: 'map',
      do: () => 'Press <b>End hour</b> (or N).', done: () => S.g && S.g.t >= 1 },
    { title: 'Standing orders', target: () => q('.dd-standing') || q('#sel'), tab: 'units', start: unselect,
      body: () => 'With nothing selected, the panel lists your <b>standing orders</b>: what your units do by themselves, two hours late. Your counterattack force strikes a fresh lodgment, idle companies block the break-in and your guns fire on what you see. Any unit you order is yours for three hours. Switch one off to do that job yourself.' },
    { title: 'One line per hour', target: () => q('#say'), tab: 'map',
      body: () => 'This line says what you saw happen last hour. The full reports are in the Reports pane. When the battle ends, the review below the map compares what you saw with what was true.' },
  ],
  att: [
    { title: 'You attack', target: () => q('#objtrack'), tab: 'map',
      body: () => `You win only if, at the end of the last hour, you hold ${obj().need} side-by-side sectors (map boxes, 500 m across) of ${obj().name}, with no defender left fighting in them. The board is turned: you attack up the screen.` },
    { title: 'Your plan, step by step', target: () => q('.dd-steps'), tab: 'plan', start: planStep(1),
      body: () => 'Five steps: Frontage (where you attack), Battalions, Infiltration, Fire plan, Reserves. Each chip shows its status; tap one to open it. A sound plan is already filled in.' },
    { title: 'Choose your frontage', target: () => q('.dd-cols'), tab: 'plan', start: planStep(1),
      body: () => '<b>Main-effort</b> columns get your assault battalions. <b>Pin</b> columns get one company each, to keep the defenders there busy so they cannot shift (a fixing attack). Too narrow a front and his machine guns sweep you from both sides.' },
    { title: 'Set each battalion', target: () => q('.dd-bnall') || q('#pstep'), tab: 'plan', start: planStep(2),
      body: () => 'One row per battalion: choose <b>waves</b> (shoulder to shoulder) or <b>small groups</b>, and how they move: leapfrog, rush or infiltrate (slip past his posts). Apply to all sets every battalion at once.' },
    { title: 'Time the barrage', target: () => q('#pstep [data-rate]') || q('#pstep'), tab: 'plan', start: planStep(4),
      body: () => 'Your <b>creeping barrage</b> is a line of shells that moves ahead of your men. Set how fast it moves (rows an hour) and where it starts. Too fast and it leaves a gap: the defenders are up and firing when your men arrive. Too slow and your men walk into their own shells.' },
    { title: 'Start the battle', target: () => q('#plan-start'), tab: 'plan',
      do: () => 'Press <b>Start the battle</b>.', done: () => S.g && S.g.phase === 'battle' },
    { title: 'Pick two companies', target: () => unitRow(firstRifle()?.id) || q('#tree'), tab: 'units', start: () => { showUnit(firstRifle()); return null; },
      do: () => 'Tap one rifle company, then press <b>Select several</b> (or hold Shift) and tap a second one next to it.', done: () => S.sel.length === 2 },
    { title: 'Leapfrog', target: () => q('#upop:not([hidden]) [data-tool="leapfrog"]') || q('[data-tool="leapfrog"]') || sel(), tab: 'map',
      do: () => 'Press <b>Leapfrog</b>, then tap a sector ahead on the map.', done: () => ordered('leapfrog'),
      body: () => 'One company covers with fire (<b>overwatch</b>) while the other dashes forward (<b>bounds</b>); next hour they swap.' },
    { title: 'The stall gauge', target: () => sel() || q('#tree'), tab: 'map',
      body: () => 'When a unit heads into a sector you believe is held, its orders show the <b>stall gauge</b>: its assault as a share of the strength needed to take the sector. Under 100% the assault stalls. The “i” shows how it is worked out.' },
    { title: 'His counterattack', target: () => q('#box'), tab: 'map',
      body: () => 'His counterattack force waits in his rear zone. A sector you have just taken (a <b>lodgment</b>) is easy for him to retake for about two hours, while your men are tired. <b>Consolidate</b> (dig in) or keep moving, under the cover of your guns.' },
    { title: 'Command whole formations', target: () => q('#tree [data-fmn]'), tab: 'units',
      do: () => 'Tap a formation’s name to select all its units, then try Attack on axis or a posture for all.', done: () => !!S.selFmn },
    { title: 'End the hour', target: () => q('#end'), tab: 'map',
      do: () => 'Press <b>End hour</b> (or N).', done: () => S.g && S.g.t >= 1 },
    { title: 'Standing orders', target: () => q('.dd-standing') || q('#sel'), tab: 'units', start: unselect,
      body: () => 'With nothing selected, the panel lists your <b>standing orders</b>: what your units do by themselves. Leading companies follow the barrage and leapfrog under fire, follow-on waves go in behind success, and some batteries answer calls for fire. Any unit you order is yours for three hours. Switch one off to do that job yourself.' },
    { title: 'One line per hour', target: () => q('#say'), tab: 'map',
      body: () => 'This line says what you saw happen last hour; the Reports pane has the rest. The review at the end shows what was really there.' },
  ],
};
