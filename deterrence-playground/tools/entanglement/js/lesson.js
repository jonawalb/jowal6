// Nuclear Entanglement: the hands-on "Learn to play" lesson and the rules on one screen (shared/js/learn.js).
// Folds in the old walkthrough (js/tour.js). Steps read the live state S passed in from app.js.
import { run, baseline } from './model.js';
import { pct } from './ui.js';

const q = s => () => document.querySelector(s);
const closest = (s, up) => () => document.querySelector(s)?.closest(up);

export const SHEET = {
  title: 'Nuclear Entanglement on one screen',
  goal: 'You plan a conventional (non-nuclear) campaign against a nuclear-armed adversary, the target. Get as much conventional effect as you can while keeping the chance that the target turns to nuclear weapons low. The red number in the side panel is that chance by the end of the war. Every number is notional: made up to show how the mechanisms work, not a prediction.',
  controls: [
    ['Planner cell', 'Click or tap (or Tab to it and press Enter) to strike that asset category in that phase. Click again to cancel.'],
    ['All phases', 'Strike that category in every phase, or clear the row.'],
    ['Clear / Default / Strike everything', 'Quick plans under the planner.'],
    ['Mitigation levers', 'Switches in the side panel. Each shows what it does to the risk and to conventional effect.'],
    ['Target sliders', 'The target’s confidence in its second strike, and how many of your weapons are dual-capable.'],
    ['Model weights', 'Advanced: the notional numbers behind the model, with Reset everything.'],
  ],
  ideas: [
    'Entangled assets serve both conventional and nuclear forces. Hitting them for conventional reasons still looks like an attack on the nuclear deterrent.',
    'Early-warning and command strikes raise risk even when no nuclear weapon is touched: the target may misread them as the start of a nuclear attack.',
    'Timing matters. Damage builds up across phases and is partly repaired when you stop.',
    'Strike exclusions cut the risk most, but they also give up conventional effect. That trade-off is the dilemma.',
    'A target that is confident its deterrent will survive feels less pressure to “use it or lose it.”',
  ],
  terms: [
    ['Entanglement', 'One asset serving both nuclear and conventional forces (James Acton).'],
    ['Nuclear role', 'The share of a category that serves nuclear forces.'],
    ['Hazard', 'The chance of nuclear use in one phase, from all channels together.'],
    ['Second strike', 'The ability to retaliate after being hit first. A secure one makes threats credible (believable) without haste.'],
    ['NC3', 'Nuclear command, control and communications.'],
    ['ISR', 'Intelligence, surveillance and reconnaissance.'],
    ['Fog of war', 'Lost sight of the battle; the target fills the gap with worst-case guesses.'],
  ],
};

/** Steps for runLesson. S is the live state; risk() reads the current result. */
export function lessonSteps(S) {
  const risk = () => run(S).pEsc;
  const base = () => baseline(S).pEsc;
  let before = 0;
  return [
    { title: 'Win the war, avoid the bomb',
      body: () => `You command a conventional war against a nuclear-armed state. Your goal: damage its forces without pushing it to use nuclear weapons. This box is the chance it does, by the end of the war. With no strikes at all it is <b>${pct(base())}</b>, the background risk of any such war. All numbers are notional.`,
      target: q('#en-status') },
    { title: 'The planner',
      body: 'Each row is a kind of asset the target owns. Each column is a phase of the war. Many of these assets are <b>entangled</b>: the same satellites, links and bases serve both conventional and nuclear forces. The pill under each name gives its <b>nuclear role</b>, the share that serves nuclear forces.',
      target: q('#en-plan') },
    { title: 'Make your first strike',
      body: 'Early-warning satellites and radars spot missile launches. They also help the target defend against your conventional missiles, so they look like a good target.',
      do: 'Strike <b>early warning in phase 1</b>: click the first cell of the top row.',
      target: q('.pl-c[data-c="ew"][data-t="0"]'),
      done: () => !!S.plan.ew[0] },
    { title: 'What just happened',
      body: () => `The risk went from <b>${pct(base())}</b> to <b>${pct(risk())}</b>. You touched no nuclear weapon. But the target’s own warning system serves its nuclear forces, so it may read your strike as the opening of a nuclear attack. Acton calls this <b>misinterpreted warning</b>. The chart shows the risk per phase (bars) and in total (solid line).`,
      target: q('#en-time') },
    { title: 'Go after the launchers',
      body: 'Dual-capable missiles can carry either warhead. Hunting them is the core of a conventional campaign, and part of what you destroy is the target’s nuclear deterrent.',
      do: 'Press <b>All phases</b> on the <b>Dual-capable delivery systems</b> row.',
      target: q('.pl-all[data-row="dcd"]'),
      done: () => S.plan.dcd.every(Boolean) },
    { title: 'Why the target might go nuclear',
      body: () => `Risk is now <b>${pct(risk())}</b>. These cards split it into Acton’s mechanisms. <b>Use them or lose them</b>: as its deterrent shrinks, the target feels pressure to use it before it is gone. <b>Ambiguity</b>: it cannot tell your conventional missiles from nuclear ones. <b>Fog of war</b> multiplies both: the less it can see, the more it assumes the worst.`,
      target: q('#en-ch') },
    { title: 'Spare the nuclear part',
      start: () => { before = run(S).mil; },
      body: 'A lever: leave assets that serve nuclear forces off your target list.',
      do: 'Switch on <b>Strike exclusions</b> in the side panel.',
      target: closest('input[data-m="excl"]', 'label'),
      done: () => !!S.mit.excl },
    { title: 'The price of safety',
      body: () => `Risk fell to <b>${pct(risk())}</b>. Now look at <b>conventional effect</b> in the readout: it dropped from ${Math.round(before * 100)} to ${Math.round(run(S).mil * 100)} out of 100. Sparing the nuclear share of an asset also spares its conventional job. That trade-off is the dilemma entanglement creates.`,
      target: q('#en-read') },
    { title: 'A secure deterrent buys calm',
      body: 'The target’s confidence in its <b>second strike</b> (its ability to hit back after being hit) shapes the use-or-lose pressure. A small, vulnerable force feels it most.',
      do: 'Drag <b>Target’s confidence in its second strike</b> to <b>0.80</b> or higher.',
      target: closest('#sl-surv', '.slider'),
      done: () => S.P.surv >= 0.8 },
    { title: 'The one idea',
      body: () => `Risk is now <b>${pct(risk())}</b>. What you hit and when matters as much as how much you hit. Try other plans and levers: each lever shows what it would buy from here. The cards below the model show where entanglement exists in real forces, and the address bar saves your setup as a link.` },
  ];
}
