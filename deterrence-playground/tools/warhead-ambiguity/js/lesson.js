// Is It a Nuke? The hands-on "Learn to play" lesson and the rules on one screen (shared/js/learn.js).
// Folds in the old walkthrough (js/tour.js). Steps read the live state S passed in from app.js.
import { update, decide, longRun, ACTIONS } from './model.js';
import { pct } from './ui.js';

const q = s => () => document.querySelector(s);
const card = s => () => document.querySelector(s)?.closest('.card');
const choice = (group, v) => () => document.querySelector(`[aria-label="${group}"] button[data-v="${v}"]`);
const now = S => { const ch = update(S.P); const mu = ch[ch.length - 1].mu; return { mu, best: decide(S.P, mu, S.costs).best }; };
const name = id => ACTIONS.find(a => a.id === id).name.toLowerCase();
const campaign = S => { const r = longRun(S.P, S.costs); return 1 - (1 - r.C.low) ** S.P.K; };
const pc1 = x => (x > 0 && x < 0.01 ? '<1%' : pct(x));

/** The setup the lesson starts from: the default conventional war, with a launch that looks conventional. */
export const LESSON_START = { site: 'conv', traj: 'theater' };
/** The setup loaded for the campaign step (the old walkthrough's "cost of a wrong assumption"). */
const CAMPAIGN = { ctx: 'war', pReal: 0.9, pNuc: 0.2, Eo: 0.1, E: 0.8, surv: 0.1, site: 'mixed', traj: 'dual', corr: 0, lowCap: 1 };

export const SHEET = {
  title: 'Is It a Nuke? on one screen',
  goal: 'Your sensors report an incoming missile that could carry a nuclear or a conventional warhead. Read the evidence and pick the response with the lowest expected cost: wait, hit back conventionally, or launch nuclear weapons on warning. The worst mistakes are launching nuclear weapons at a false alarm or a conventional strike, and riding out a real nuclear attack. Every number is notional.',
  controls: [
    ['Context', 'Peacetime, crisis or conventional war. Sets your priors.'],
    ['Prior sliders', 'Your belief before any evidence: is it a real attack, and is a real launch nuclear?'],
    ['Launch site / Trajectory', 'What your sensors show. Each choice updates the belief chart.'],
    ['Second sensor', 'Switch: an independent sensor confirms the launch.'],
    ['Entanglement', 'How mixed the adversary’s nuclear and conventional forces are: what you assume, and what is real.'],
    ['Posture', 'Survivability of your own nuclear force, and whether you can launch before impact.'],
    ['Campaign map', 'Click, tap or drag to set the prior and the actual entanglement.'],
    ['Tab / Enter / Space', 'Every control works from the keyboard; arrow keys move sliders.'],
  ],
  ideas: [
    'Priors do most of the work: in peacetime a lone warning is usually a false alarm; in a war it is usually a real, conventional strike.',
    'A second, independent sensor is the strongest single piece of evidence.',
    'A survivable nuclear force makes waiting cheap. A vulnerable one pushes you toward launching on warning.',
    'Entanglement weakens evidence: conventional strikes come from mixed sites and hit dual-use targets. Assume too little of it and you misread them as nuclear.',
  ],
  terms: [
    ['Prior', 'What you believe before looking at the evidence.'],
    ['Bayes’ rule', 'The arithmetic for updating a belief as evidence arrives.'],
    ['Expected cost', 'The cost of a response in each possible truth, weighted by how likely you think each truth is. Lower is better.'],
    ['Launch on warning', 'Ordering nuclear retaliation before the incoming weapons land.'],
    ['Survivability', 'Share of your nuclear force that would survive a first strike and could still hit back.'],
    ['Entanglement', 'Nuclear and conventional forces sharing sites, launchers or command links.'],
    ['Warhead ambiguity', 'Not knowing whether an incoming missile is nuclear (James Acton).'],
  ],
};

/** Steps for runLesson. S is the live state; apply(set) loads a setup on top of the defaults. */
export function lessonSteps(S, apply) {
  let camp0 = 0;
  return [
    { title: 'A missile is coming. Is it a nuke?',
      body: () => `Your sensors detect an incoming missile that could carry either kind of warhead. You have minutes. Your job: pick the response that is expected to cost least. This box shows the best response right now: <b>${name(now(S).best)}</b>. All numbers are notional.`,
      target: q('#wa-status') },
    { title: 'What you believe',
      body: () => `Each bar splits your belief between no attack (blue), a conventional strike (gold) and a nuclear one (red). The top bar is your <b>prior</b>, what you believe before any evidence. Each row below adds one piece of evidence by <b>Bayes’ rule</b>, the arithmetic of updating. In a conventional war, missiles are already flying: this one is almost surely real and conventional (${pct(now(S).mu.C)}).`,
      target: card('#wa-chain') },
    { title: 'What each response costs',
      body: 'Each response has a cost in each possible truth: launching nuclear weapons at a conventional strike is a catastrophe; waiting during a real nuclear attack loses part of your deterrent. The <b>expected cost</b> weights those by your beliefs. The lowest line wins. The strip under the chart shows where the winner changes as Pr(nuclear) rises.',
      target: card('#wa-dec') },
    { title: 'New evidence: the launch site',
      do: 'Under <b>Launch site</b> in the panel, choose <b>Nuclear site</b>.',
      body: 'Missiles from a site linked to nuclear units are more likely to be nuclear.',
      target: choice('Launch site', 'nuc'),
      done: () => S.P.site === 'nuc' },
    { title: 'Now make it peacetime',
      body: () => `The red share rose to ${pct(now(S).mu.N)}, but in a war you still hit back conventionally. Now move the same detection to a quiet day.`,
      do: 'Under <b>Context</b>, choose <b>Peacetime</b>.',
      target: choice('Context of the detection', 'peace'),
      done: () => S.P.ctx === 'peace' },
    { title: 'Probably a false alarm',
      body: () => `A real attack out of the blue is rare, so with one sensor a false alarm is the best explanation (${pct(now(S).mu.F)}). Best response: <b>${name(now(S).best)}</b>. Stanislav Petrov stood roughly here in 1983.`,
      do: 'Switch on <b>Confirmed by a second, independent sensor</b>.',
      target: () => document.querySelector('#wa-corr')?.closest('label'),
      done: () => !!S.P.corr },
    { title: 'And it is heading for your missiles',
      body: () => `With a second sensor agreeing, the false-alarm share fell to ${pct(now(S).mu.F)}. One more clue:`,
      do: 'Under <b>Trajectory and apparent target</b>, choose <b>Your nuclear forces</b>.',
      target: choice('Trajectory and apparent target', 'nucf'),
      done: () => S.P.traj === 'nucf' },
    { title: 'Launch, or ride it out?',
      body: () => `Pr(nuclear) is now ${pct(now(S).mu.N)} and the model says <b>${name(now(S).best)}</b>. Why? If you wait and it is nuclear, most of your force is destroyed first: <b>survivability</b>, the share that would survive, is only ${pct(S.P.surv)}.`,
      do: 'Drag <b>Survivability of your retaliatory force</b> up until the decision stops being launch on warning.',
      target: () => document.querySelector('#sl-surv')?.closest('.slider'),
      done: () => now(S).best !== 'low' },
    { title: 'Assume the right entanglement',
      start: () => { apply(CAMPAIGN); camp0 = campaign({ ...S, P: { ...S.P, ...CAMPAIGN } }); },
      body: 'A survivable force makes waiting cheap: if the attack turns out to be nuclear, you can still hit back later. (Acton notes most states cannot launch before impact at all.) Now, back in a war, over a whole campaign. The lesson loaded a setup where the adversary’s forces are really mixed (actual entanglement 0.8) but you assume they are separate (0.1). Then conventional strikes from mixed sites at dual-use targets look nuclear to you. The red tile below the map is the chance that a campaign of conventional launches gets at least one nuclear launch from you.',
      do: 'In the panel, press <b>Assume the actual level</b>.',
      target: q('#wa-match'),
      done: () => S.P.Eo === S.P.E },
    { title: 'The one idea',
      body: () => `Reading the evidence correctly cut that campaign risk from ${pc1(camp0)} to ${pc1(campaign(S))}. Priors, a second sensor and a survivable force keep you from guessing wrong; entanglement makes the evidence weaker. The cards below load real false alarms and ambiguous launches, and the address bar saves any setup as a link.`,
      target: q('#wa-rates') },
  ];
}
