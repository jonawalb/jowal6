// "Learn to play": a short hands-on lesson (shared/js/learn.js) and the one-screen rules sheet.
const $ = s => document.querySelector(s);
const tab = t => $(`.tabs [data-t="${t}"]`);

export function lessonSteps(app) {
  return [
    { title: 'What this game is about',
      body: 'A state, <b>A</b>, decides whether and how to start a war against <b>B</b>. It can do nothing, start a limited or a theater-wide conventional war, use low-yield nuclear weapons, or launch a strategic strike. B then capitulates, retaliates in kind, or escalates. A wants the biggest share of the pie at the smallest loss.',
      target: () => tab('idea') },
    { title: 'Pie versus losses',
      body: 'Every outcome gives A a share of the pie and some losses. The <b>net share</b> (share minus losses divided by stakes) is how A compares them. With stakes of 1, 80% of the pie at a 4% loss beats all of it at a 40% loss.',
      do: 'Drag the <b>Stakes</b> slider in the calculator above 1.8 and watch the winner flip.',
      target: () => $('#ci-calc'),
      done: () => Number($('#cV')?.value) > 1.8 },
    { title: 'Play as A',
      body: 'The Play tab walks through the tree one move at a time. With <b>Show the logical responses</b> on, each option shows what both sides expect from it if everyone plays logically from there on, and the logical choice is marked.',
      do: 'Open the <b>4 · Play</b> tab.',
      target: () => tab('play'),
      done: () => app.tab === 'play' },
    { title: 'Make your opening',
      body: 'You are A. Pick any opening, logical or not. The computer answers as B with its logical response and tells you why. Chance decides the fighting: press <b>Roll the dice</b>.',
      do: 'Choose an opening.',
      target: () => $('#ci-card'),
      done: () => $('#ci-log li b') !== null },
    { title: 'Change the world',
      body: 'Parameters on the right move everything. Presets jump to settings where a different logic wins.',
      do: 'Click the <b>Disarming backstop</b> preset.',
      target: () => $('#ci-presets'),
      done: () => /Theater-wide/.test($('#ci-pred')?.textContent || '') },
    { title: 'See the whole solution',
      body: 'The Backward induction tab shows the full tree, solved from the last moves back to A\'s opening.',
      do: 'Open the <b>5 · Backward induction</b> tab.',
      target: () => tab('solve'),
      done: () => app.tab === 'solve' },
    { title: 'Watch it solve',
      body: 'Thick blue edges are A\'s logical choices, thick orange ones B\'s. The gold band is the equilibrium path. <b>Solve step by step</b> reveals the values from the deepest decisions up to the opening.',
      do: 'Press <b>Solve step by step</b>.',
      target: () => $('#ci-anim'),
      done: () => !!$('#ci-anim-note')?.textContent },
    { title: 'That is the model',
      body: 'Here the threat of disarming B never has to be carried out: B gives in to a theater-wide war first. The Theory tab explains why, with your current numbers plugged into each condition.',
      target: () => tab('theory') },
  ];
}

export const SHEET = {
  title: 'Conflict Initiation: the rules on one screen',
  goal: 'A chooses how to open a war, or not to. B responds. The fighting is decided by chance, and the losing side may escalate. Each side wants the biggest share of the pie at the smallest loss, and the model finds what each would logically do.',
  controls: [
    ['Tabs 1 to 5', 'The idea, the theory, every parameter, play the game, and the solved tree.'],
    ['Sliders and presets', 'Change stakes, odds and costs. Every tab updates.'],
    ['Who you play', 'Play A, B, both, or watch the computer play both logically.'],
    ['Show the logical responses', 'Shows each option\'s value and marks the logical choice.'],
    ['Tree nodes', 'Click to open or close. Hover for the shares and losses behind a node.'],
    ['Address bar', 'Stores the tab and every changed parameter.'],
  ],
  ideas: [
    'A compares outcomes by net share: share of the pie minus losses divided by stakes.',
    'Modest aims keep wars small; ambitious limited wars invite widening.',
    'A disarming capability usually works as a threat, not a strike.',
    'Deterrence at the top rests on automatic retaliation.',
  ],
  terms: [
    ['Stakes', 'What the whole pie is worth to a side, in the same units as its losses.'],
    ['Net share', 'Share of the pie minus losses divided by stakes.'],
    ['Backward induction', 'Solving from the last decisions back to the first.'],
    ['Equilibrium path', 'What happens when both sides play logically.'],
    ['Disarm', 'A strategic strike that leaves the target unable to respond.'],
  ],
};
