// Walkthrough steps for each side (SPEC §8.7): about twelve each, one action per "do" step, which moves on by
// itself once done. Targets are looked up when the step shows, since the page redraws as you play.
import { SCALES } from '../../data/scales.js';
import { S } from './store.js';
import { drawPanels } from './play.js';

const q = s => document.querySelector(s);
const firstMG = () => S.g && S.g.units.find(u => u.side === S.me && u.type === 'mg' && u.role === 'strong') || S.g.units.find(u => u.side === S.me && u.type === 'mg');
const unitRow = id => q(`#tree [data-u="${id}"]`);
const csRow = () => { const f = S.g && Object.values(S.g.fmns).find(x => x.side === 'def' && x.cs); return f ? q(`#tree [data-fmn="${f.id}"]`) : null; };
const ordered = kind => S.g && S.g.log.some(a => a.t === S.g.t && a.kind === kind);
/** QA fix: the standing-orders panel shows only with nothing selected, so that step clears the selection. */
const unselect = () => { if (S.g && S.g.phase === 'battle' && (S.sel.length || S.selFmn || S.tool)) { S.sel = []; S.selFmn = null; S.tool = null; drawPanels(); } return null; };
const obj = () => SCALES[S.g ? S.g.scale : 'd'].obj;

export const STEPS = {
  def: [
    { title: 'You defend', target: () => q('#objtrack'), tab: 'map',
      body: () => `The attacker wins only by holding ${obj().need} side-by-side sectors of ${obj().name} (the thick line) at the end of the last hour. Losses do not decide it. Your counterstroke force waits behind that line, so you can lose it and take it back.` },
    { title: 'Three zones', target: () => q('#box'), tab: 'map',
      body: () => 'Thin outposts warn and delay; the battle zone, behind the crest, is where the attack dies; the rear zone holds your guns and the counterstroke. Dense front lines die to bombardment.' },
    { title: 'Pick an MG company', target: () => unitRow(firstMG()?.id) || q('#tree'), tab: 'units',
      do: () => `Tap <b>${firstMG()?.short || 'an MG company'}</b> in the Units list. MG companies are your enfilade weapon: only they lay fire lanes.`, done: () => S.sel.length === 1 && S.g.units[S.g.ix[S.sel[0]]]?.type === 'mg' },
    { title: 'Lay its lane across the front', target: () => q('[data-ptool="lane"]'), tab: 'plan', start: () => ({ lanes: { ...(S.plan && S.plan.lanes) } }),
      do: () => 'Press <b>Lane</b> in the Plan pane, then tap a sector to the side of the MG on the map (east or west), so the lane runs along the attackers’ lines.',
      done: (s0) => S.plan && S.sel[0] && S.plan.lanes[S.sel[0]] !== undefined && S.plan.lanes[S.sel[0]] !== s0.lanes[S.sel[0]] },
    { title: 'Coverage from two directions', target: () => q('#layerbar [data-layer="cover"]'), tab: 'map',
      do: () => 'Turn on the <b>Coverage</b> layer. Each number is how many fire directions cover a sector; two or more remove most of the attacker’s dead ground.', done: () => S.layers.has('cover') },
    { title: 'Start the battle', target: () => q('#plan-start'), tab: 'plan',
      do: () => 'The rest of the plan is the doctrinal one. Press <b>Start the battle</b>.', done: () => S.g && S.g.phase === 'battle' },
    { title: 'Every percentage explains itself', target: () => q('#tree .dd-urow'), tab: 'units',
      do: () => 'Tap any company in the list.', done: () => S.sel.length > 0 },
    { title: 'The “i” buttons', target: () => q('#sel .dd-info') || q('#sel'), tab: 'units',
      body: () => 'Each “i” gives the base, the factors and the clamps behind a number, worked out from what your side has seen, never from hidden truth. Try one.' },
    { title: 'The counterattack window', target: () => csRow() || q('#tree'), tab: 'units',
      body: () => 'When the enemy takes a sector, a clock badge marks the lodgment: green while the window is open, amber closing, grey once he has consolidated (2 hours). Ripostes by units next to it go in at once; select the Counterstroke group and press Counterstroke to strike after its planning time.' },
    { title: 'Command whole formations', target: () => q('#tree [data-fmn]'), tab: 'units',
      do: () => 'Tap a formation’s name (a battalion or group) to select all its units at once.', done: () => !!S.selFmn },
    { title: 'End the hour', target: () => q('#end'), tab: 'map',
      do: () => 'Press <b>End hour</b> (or N).', done: () => S.g && S.g.t >= 1 },
    { title: 'Standing orders', target: () => q('.dd-standing') || q('#sel'), tab: 'units', start: unselect,
      body: () => 'With nothing selected, the panel lists your standing orders: until you order them yourself, your counterstroke group strikes a lodgment inside its window, idle companies block the penetration and your guns fire on what you see, all two hours late. Any unit you order is yours for three hours. Switch an order off to take that job over.' },
    { title: 'One line per hour', target: () => q('#say'), tab: 'map',
      body: () => 'This sentence says what happened last hour that you could see. The full reports are in the Reports pane. When the battle ends, the review below the map compares what you saw with what was true.' },
  ],
  att: [
    { title: 'You attack', target: () => q('#objtrack'), tab: 'map',
      body: () => `You win only by holding ${obj().need} side-by-side sectors of ${obj().name} at the end of the last hour, with no unbroken defender in them. The board is turned: you attack up the screen.` },
    { title: 'Choose your frontage', target: () => q('.dd-cols'), tab: 'plan',
      body: () => 'Main-effort columns get your assault battalions; fixing columns get one company each to pin the outposts (Biddle’s k3 = 0.4). Too narrow and his MGs sweep you from both shoulders.' },
    { title: 'Time the barrage', target: () => q('.dd-ttbox') || q('[data-barr]'), tab: 'plan',
      body: () => 'The strip shows the creeping barrage row by row, hour by hour, and where each battalion should be. A dot after the barrage has gone is a gap (defenders man the parapet); a dot before it is your men walking into their own shells.' },
    { title: 'Start the battle', target: () => q('#plan-start'), tab: 'plan',
      do: () => 'Press <b>Start the battle</b>.', done: () => S.g && S.g.phase === 'battle' },
    { title: 'Pick two companies', target: () => q('#tree .dd-urow'), tab: 'units',
      do: () => 'Tap one rifle company, then press <b>Select several</b> (or hold Shift) and tap a second one next to it.', done: () => S.sel.length === 2 },
    { title: 'Leapfrog', target: () => q('[data-tool="leapfrog"]') || q('#sel'), tab: 'units',
      do: () => 'Press <b>Leapfrog</b>, then tap a sector ahead on the map. One overwatches while the other bounds; next hour they swap.', done: () => ordered('leapfrog') },
    { title: 'The stall gauge', target: () => q('#sel') || q('#tree'), tab: 'units',
      body: () => 'When a selected unit is heading into a sector you believe is held, the panel shows its assault as a share of the strength needed to take it (Biddle’s k1 = 2.5). Its “i” shows every term.' },
    { title: 'His counterstroke', target: () => q('#box'), tab: 'map',
      body: () => 'His counterattack force waits in the rear zone. A fresh lodgment is easy to throw back for two hours; consolidate, or keep moving under your guns. The race badge compares your pace with his counterstroke.' },
    { title: 'Command whole formations', target: () => q('#tree [data-fmn]'), tab: 'units',
      do: () => 'Tap a formation’s name to select all its units, then try Attack on axis or a posture for all.', done: () => !!S.selFmn },
    { title: 'End the hour', target: () => q('#end'), tab: 'map',
      do: () => 'Press <b>End hour</b> (or N).', done: () => S.g && S.g.t >= 1 },
    { title: 'Standing orders', target: () => q('.dd-standing') || q('#sel'), tab: 'units', start: unselect,
      body: () => 'With nothing selected, the panel lists your standing orders: until you order them yourself, leading companies rush behind the barrage and leapfrog against live fire, follow-on waves go in behind success and direct-support batteries answer calls. Any unit you order is yours for three hours. Switch an order off to take that job over.' },
    { title: 'One line per hour', target: () => q('#say'), tab: 'map',
      body: () => 'This sentence says what happened last hour that you could see; the Reports pane has the rest. The review at the end shows what was really there.' },
  ],
};
