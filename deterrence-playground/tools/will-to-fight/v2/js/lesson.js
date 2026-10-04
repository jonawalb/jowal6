// "Learn to play" for Will to Fight v2: a hands-on lesson and the rules on one screen.
// Steps read the page (the outcome line and slider values), never a global.
const $ = id => document.getElementById(id);
const outcome = () => ($('v2-summary').querySelector('b')?.textContent || '').replace(/\.$/, '');
const val = k => +$(`v2-${k}`).value;
const row = k => $(`v2-${k}`).closest('.slider');

export function lessonSteps() {
  return [
    { title: 'What you are trying to do',
      body: 'Three players. An <b>adversary</b> decides whether to attack. If it does, the defender\'s <b>fighters</b> each decide to fight or flee. Then the defender\'s <b>government</b> decides to fight on or give in. You set the conditions and the page works out what each player does. The defender\'s best result is <b>Deterred</b>: the adversary looks at the defender and decides an attack is not worth it. This line always shows the result.',
      target: () => $('v2-summary') },
    { title: 'Cohesion: why fighting depends on others',
      body: 'A soldier is more willing to fight if the others around them will fight too. The curve shows <b>cohesion</b>, the share of fighters who fight (W), against the <b>public reading of commitment</b> (μ): how committed the force looks, built from four things you set (attachment to the state, leaders\' signal, believed outside help, and the rally when attacked). Cohesion flips fast near the dotted <b>tipping point</b> and barely moves far from it.',
      target: () => $('v2-fig') },
    { title: 'Two bars to clear',
      body: 'The dashed lines are two bars. If cohesion is below the <b>government\'s bar</b>, its <b>payoff</b> (what it gets from an outcome) is better from giving in than from fighting on. If the cohesion the adversary <i>expects</i> is below the <b>adversary\'s bar</b>, war looks worth it to the adversary. Note the two dots: the adversary judges from peacetime signs, so its view leaves out the rally that an attack sparks.',
      target: () => $('v2-read') },
    { title: 'Make your first move',
      body: 'Fighters care about whether allies will come. Cut that belief and see how the adversary reacts.',
      do: 'Drag <b>Believed outside help π</b> down until the result line no longer says Deterred (about 0 is enough).',
      done: () => !outcome().startsWith('Deterred'),
      target: () => row('pi') },
    { title: 'Read what happened: the rally surprise',
      body: () => `Result: <b>${outcome()}</b>. The adversary's view (the hollow dot) fell below its bar, so attacking now looks worth it. But the true cohesion (the filled dot) includes the rally an attack provokes. If it stays above the government's bar, the government fights on and the adversary has started a war it regrets. That is how a force that "looked weak" can hold, as Ukraine did in 2022.`,
      target: () => $('v2-fig') },
    { title: 'Push it until the force breaks',
      body: 'Now make the force look much weaker.',
      do: 'Keep dragging <b>Believed outside help π</b> down, to about −0.5, until the result says <b>concession</b>.',
      done: () => /concession/.test(outcome()),
      target: () => row('pi') },
    { title: 'Leaders who cannot afford to give in',
      body: 'True cohesion fell below the government\'s bar, so it gives in. Some leaders lose much more by conceding: exile, prison or worse. That makes their threat to fight on <b>credible</b> (believable, because carrying it out really is their best choice).',
      do: 'Raise <b>Leaders\' cost of conceding L</b> to 0.5 or more.',
      done: () => val('L') >= 0.5 && outcome() === 'Attack, then war',
      target: () => row('L') },
    { title: 'Hollow resolve',
      body: () => `Result: <b>${outcome()}</b>. The government's bar dropped below zero: it fights on whatever the army does, even as the army breaks. A tough government alone does not deter. The adversary still attacks, because it expects the force to collapse.`,
      target: () => $('v2-read') },
    { title: 'The idea that wins: clear both bars, as the adversary sees them',
      body: 'Deterrence needs a government that will fight on <i>and</i> a force the adversary believes will hold. What counts is the adversary\'s view, which leaves out the rally.',
      do: 'Bring <b>Believed outside help π</b> back up until the result says <b>Deterred</b>.',
      done: () => outcome().startsWith('Deterred'),
      target: () => row('pi') },
    { title: 'How to finish',
      body: 'There is no score to beat. Try <b>Uncertainty about commitment σ</b>: clear, shared information pushes a force that is above the tipping point toward full cohesion and one below it toward collapse. The <b>equilibrium</b> shown (each player\'s best move, given what the others will do) is worked out backward from the government\'s choice. The page address keeps your settings, so you can share it. Below: the game tree, what each input measures for Taiwan, and the fuller v1 model.',
      target: () => $('v2-panel') },
  ];
}

export const SHEET = {
  title: 'Will to Fight (v2): the rules on one screen',
  goal: 'See when an adversary is deterred, and why. It is deterred only if, in its own view, the defender\'s force will hold well enough that the government fights on and the war is not worth it.',
  controls: [
    ['μ sliders', 'Attachment to the state, leaders\' signal, believed outside help, rally when attacked. Together they set how committed the force looks.'],
    ['Fighters sliders', 'Private cost of fighting, how much fighting depends on others, and how foggy the information is.'],
    ['War sliders', 'Win chances, war costs, and what leaders lose by conceding.'],
    ['Arrow keys', 'Move a focused slider one step. Tab moves between sliders. Esc closes the tutorial.'],
    ['Model version', 'v1 is the fuller two-level model with historical case presets.'],
  ],
  ideas: [
    'Cohesion is a coordination problem: people fight when they expect others to fight.',
    'Near the tipping point a small change in leadership or allied help decides the outcome.',
    'The adversary leaves out the rally, so it can attack a force that then holds.',
    'A government that cannot afford to concede fights on even as its army breaks: it does not deter by itself.',
    'Clear information helps a force above the tipping point and hurts one below it.',
  ],
  terms: [
    ['Cohesion W', 'Share of fighters who fight in the first weeks.'],
    ['Public reading μ', 'How committed the force looks; the adversary\'s version μ̂ leaves out the rally.'],
    ['Tipping point μ†', 'Where cohesion is one half and changes fastest.'],
    ['Payoff', 'What a player gets from an outcome; each player picks the move with the best payoff.'],
    ['Bar W̄', 'The cohesion level where a player switches choice.'],
    ['Credible', 'A threat the player would really carry out when the time comes.'],
    ['Equilibrium', 'Everyone\'s choices are best replies to each other; no one wants to switch.'],
    ['Global game', 'A coordination game with a little private uncertainty, which gives one answer instead of many.'],
  ],
};
