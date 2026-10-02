// Walkthrough steps for each side (SPEC §8.7), updated for the streamlined screen (2026-10-02): the stepped
// "Your plan" panel, orders in a popover next to the unit on the map, layers under "More layers", and the unit
// list folded to battalions with the "Needs orders" filter. One action per "do" step, which moves on by itself
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
      body: () => `The attacker wins only by holding ${obj().need} side-by-side sectors of ${obj().name} (the thick line) at the end of the last hour. Losses do not decide it. Your counterattack force waits behind that line, so you can lose it and take it back.` },
    { title: 'Your plan, step by step', target: () => q('.dd-steps'), tab: 'plan', start: planStep(1),
      body: () => 'Five steps: Zones, MG lanes, Works, Counterattack, Artillery. Each chip shows that step’s status; tap one to open it. A sound plan is already filled in, and the map stays live the whole time.' },
    { title: 'Three zones', target: () => q('#box'), tab: 'map',
      body: () => 'Thin outposts warn and delay; the battle zone, behind the crest, is where the attack dies; the rear zone holds your guns and the counterattack force. Dense front lines die to bombardment.' },
    { title: 'Pick an MG company', target: () => q(`#pstep [data-pselu="${firstMG()?.id}"]`) || q('#pstep'), tab: 'plan', start: planStep(2),
      do: () => `In the MG lanes step, tap <b>${firstMG()?.short || 'an MG company'}</b> (or tap it on the map). MG companies are your enfilade weapon: only they lay fire lanes.`, done: () => S.sel.length === 1 && S.g.units[S.g.ix[S.sel[0]]]?.type === 'mg' },
    { title: 'Lay its lane across the front', target: () => q('#pstep [data-ptool="lane"]') || q('[data-ptool="lane"]'), tab: 'plan', start: () => ({ n: S.lanesLaid || 0 }),
      do: () => 'Press <b>Lay lane</b>, then tap a sector to the side of the MG on the map (east or west), so the lane runs along the attackers’ lines.',
      done: (s0) => (S.lanesLaid || 0) > s0.n },
    { title: 'Coverage from two directions', target: () => q('#layerbar [data-layer="cover"]') || q('#layerbar [data-more]'), tab: 'map', start: openMore,
      do: () => 'Under <b>More layers</b>, turn on <b>Coverage</b>. Each number is how many fire directions cover a sector; two or more remove most of the attacker’s dead ground.', done: () => S.layers.has('cover') },
    { title: 'Start the battle', target: () => q('#plan-start'), tab: 'plan',
      do: () => 'The rest of the plan is the doctrinal one. Press <b>Start the battle</b>.', done: () => S.g && S.g.phase === 'battle' },
    { title: 'Orders open next to the unit', target: () => q('#box'), tab: 'map',
      do: () => 'Tap any of your units on the map. Its orders open next to it (at the bottom on a phone).', done: () => S.sel.length > 0 },
    { title: 'The “i” buttons and greyed orders', target: () => sel()?.querySelector('.dd-info') || sel(), tab: 'map',
      body: () => 'Each “i” gives the base, the factors and the clamps behind a number, worked out from what your side has seen, never from hidden truth. Hover a button to see what it does; a greyed one has no effect for this unit, and says why.' },
    { title: 'The counterattack window', target: () => csRow() || q('#tree'), tab: 'units', start: () => { S.filter = 'all'; drawPanels(); return null; },
      body: () => 'When the enemy takes a sector, a clock badge marks the lodgment: green while the window is open, amber closing, grey once he has consolidated (2 hours). Local counterattacks by units next to it go in at once; select the counterattack force and press Deliberate counterattack to strike after its planning time.' },
    { title: 'Command whole formations', target: () => q('#tree [data-fmn]'), tab: 'units',
      do: () => 'Tap a formation’s name (a battalion or group) to select all its units at once.', done: () => !!S.selFmn },
    { title: 'End the hour', target: () => q('#end'), tab: 'map',
      do: () => 'Press <b>End hour</b> (or N).', done: () => S.g && S.g.t >= 1 },
    { title: 'Standing orders', target: () => q('.dd-standing') || q('#sel'), tab: 'units', start: unselect,
      body: () => 'With nothing selected, the panel lists your standing orders: until you order them yourself, your counterattack force strikes a lodgment inside its window, idle companies block the penetration and your guns fire on what you see, all two hours late. Any unit you order is yours for three hours. Switch an order off to take that job over. The list shows units that need orders first.' },
    { title: 'One line per hour', target: () => q('#say'), tab: 'map',
      body: () => 'This sentence says what happened last hour that you could see; the tip below it changes with what you are doing. The full reports are in the Reports pane. When the battle ends, the review below the map compares what you saw with what was true.' },
  ],
  att: [
    { title: 'You attack', target: () => q('#objtrack'), tab: 'map',
      body: () => `You win only by holding ${obj().need} side-by-side sectors of ${obj().name} at the end of the last hour, with no unbroken defender in them. The board is turned: you attack up the screen.` },
    { title: 'Your plan, step by step', target: () => q('.dd-steps'), tab: 'plan', start: planStep(1),
      body: () => 'Five steps: Frontage, Battalions, Infiltration, Fire plan, Reserves. Each chip shows that step’s status; tap one to open it. A sound plan is already filled in.' },
    { title: 'Choose your frontage', target: () => q('.dd-cols'), tab: 'plan', start: planStep(1),
      body: () => 'Main-effort columns get your assault battalions; Pin columns get one company each to hold the outposts in place (a fixing attack, Biddle’s k3 = 0.4). Too narrow and his MGs sweep you from both shoulders.' },
    { title: 'Set each battalion', target: () => q('.dd-bnall') || q('#pstep'), tab: 'plan', start: planStep(2),
      body: () => 'One row per battalion: tap its chip to choose waves or small groups, and leapfrog, rush or infiltrate. Apply to all sets every battalion at once.' },
    { title: 'Time the barrage', target: () => q('#pstep [data-rate]') || q('#pstep'), tab: 'plan', start: planStep(4),
      body: () => 'Set the lift rate and the start row; the line below predicts gaps. A gap means the barrage has gone before your men arrive (defenders man the parapet); too slow and they walk into their own shells. Detailed view adds the hour-by-row strip.' },
    { title: 'Start the battle', target: () => q('#plan-start'), tab: 'plan',
      do: () => 'Press <b>Start the battle</b>.', done: () => S.g && S.g.phase === 'battle' },
    { title: 'Pick two companies', target: () => unitRow(firstRifle()?.id) || q('#tree'), tab: 'units', start: () => { showUnit(firstRifle()); return null; },
      do: () => 'Tap one rifle company, then press <b>Select several</b> (or hold Shift) and tap a second one next to it.', done: () => S.sel.length === 2 },
    { title: 'Leapfrog', target: () => q('#upop:not([hidden]) [data-tool="leapfrog"]') || q('[data-tool="leapfrog"]') || sel(), tab: 'map',
      do: () => 'Press <b>Leapfrog</b>, then tap a sector ahead on the map. One overwatches while the other bounds; next hour they swap.', done: () => ordered('leapfrog') },
    { title: 'The stall gauge', target: () => sel() || q('#tree'), tab: 'map',
      body: () => 'When a selected unit is heading into a sector you believe is held, its orders show the assault as a share of the strength needed to take it (Biddle’s k1 = 2.5). Its “i” shows every term. Greyed orders have no effect for that unit; hover them to see why.' },
    { title: 'His counterattack', target: () => q('#box'), tab: 'map',
      body: () => 'His counterattack force waits in the rear zone. A fresh lodgment is easy to throw back for two hours; consolidate, or keep moving under your guns. The race clock (More layers, Detailed view) compares your pace with his.' },
    { title: 'Command whole formations', target: () => q('#tree [data-fmn]'), tab: 'units',
      do: () => 'Tap a formation’s name to select all its units, then try Attack on axis or a posture for all.', done: () => !!S.selFmn },
    { title: 'End the hour', target: () => q('#end'), tab: 'map',
      do: () => 'Press <b>End hour</b> (or N).', done: () => S.g && S.g.t >= 1 },
    { title: 'Standing orders', target: () => q('.dd-standing') || q('#sel'), tab: 'units', start: unselect,
      body: () => 'With nothing selected, the panel lists your standing orders: until you order them yourself, leading companies rush behind the barrage and leapfrog against live fire, follow-on waves go in behind success and direct-support batteries answer calls. Any unit you order is yours for three hours. Switch an order off to take that job over.' },
    { title: 'One line per hour', target: () => q('#say'), tab: 'map',
      body: () => 'This sentence says what happened last hour that you could see; the tip below it changes with what you are doing, and the Reports pane has the rest. The review at the end shows what was really there.' },
  ],
};
