// "Learn to play": the hands-on lesson and the one-screen rules for the Crisis Stability Calculator.
// Folds in the old walkthrough (MIRVed silos, launch under attack, alert rates, the shared-goal lesson).
// Steps read the page itself (pressed buttons, slider values, the index readout), never a global.
const $ = id => document.getElementById(id);
// The status line is written straight from the model; the big number counts up, so it can lag mid-animation.
const idx = () => parseFloat(($('status').querySelector('b').textContent.match(/Index ([\d.]+)/) || [])[1]) || 0;
const pressed = (box, attr, v) => !!document.querySelector(`#${box} button[${attr}="${v}"][aria-pressed="true"]`);
const btn = (box, attr, v) => document.querySelector(`#${box} button[${attr}="${v}"]`);

export function lessonSteps() {
  let before = 0, lua = '';
  return [
    { title: 'What you are trying to do',
      body: 'Two nuclear powers, Side A and Side B, are in a deep crisis. Each leader asks: would I be better off <b>striking first</b> (firing before the other side does) than waiting and being hit? Your job is to find force postures that take that temptation away. The score is the <b>stability index</b>, from 0 to 1. Near 1, neither side gains by going first. Near 0, one side can disarm the other and escape lightly.',
      target: () => $('status') },
    { title: 'Four costs make one number',
      body: 'This table is the heart of the model. A <b>cost</b> runs from 0 (no damage to you, enemy aims denied) to about 1.3 (you are destroyed and the enemy is untouched). For each side, compare the cost of striking first with the cost of waiting and being struck. That ratio, shown in the last row, is the <b>break-even chance</b>: if a leader thinks an enemy attack is more likely than that, going first looks better. The index is the two ratios multiplied together.',
      target: () => document.querySelector('.costwrap') },
    { title: 'The square shows the same thing',
      body: 'The square plots the two ratios as lines. The green box is where both leaders prefer to wait. Its area is the index. A big green box means a stable crisis; a thin sliver means at least one leader is close to the edge.',
      target: () => $('prob') },
    { title: 'Make your first move',
      body: 'Postures are starting setups for both sides. They are <b>notional</b>: made-up forces, not any real country. Try the classic worrying case, where most warheads sit in <b>MIRVed silos</b> (a fixed missile carrying several warheads).',
      do: 'Click <b>Both MIRVed silos</b> in the posture list.',
      start: () => { before = idx(); },
      done: () => pressed('presets', 'data-k', 'silos'),
      target: () => btn('presets', 'data-k', 'silos') },
    { title: 'Read what happened',
      body: () => `The index went from <b>${before.toFixed(2)}</b> to <b>${idx().toFixed(2)}</b>. Why? A silo holding ten warheads can be destroyed by one incoming warhead. So each side can wipe out much of the other's force cheaply, and striking first now costs far less than waiting. Both ratios in the table shrank, and the green box with them. The panel's status line names the side that feels the stronger pull.`,
      target: () => $('idx') },
    { title: 'A hair trigger raises the number',
      body: '<b>Launch under attack</b> means firing your silo missiles on warning, before the enemy warheads land. If the striker expects that, most of its first strike hits empty silos, so going first buys less. Kent and Thaler found the same: one of their 1988 cases rose from 0.76 to 0.91. The catch, which they also flag: a hair-trigger posture raises the risk of an accidental launch.',
      do: 'Switch on <b>Striker expects launch under attack</b>.',
      start: () => { before = idx(); },
      done: () => $('prl').checked,
      target: () => $('prl').closest('label') },
    { title: 'The idea that wins: make your own forces survivable',
      body: () => `${lua}Now try the safer fix. <b>Survivable</b> forces are submarines, mobile missiles and bombers that the enemy cannot find while they are on <b>alert</b> (at sea, dispersed or ready to fly). The panel is now set to deep cuts with low alert, a fragile case.`,
      do: 'Under <b>2 · Edit a side</b>, drag Side A\'s <b>Day-to-day alert rate</b> to 80% or more.',
      start: () => { lua = `Launch under attack moved the index from <b>${before.toFixed(2)}</b> to <b>${idx().toFixed(2)}</b>. `; btn('presets', 'data-k', 'cuts').click(); btn('side-tabs', 'data-s', 'A').click(); before = idx(); },
      done: () => $('side-sliders').dataset.side === 'A' && +$('sl-alert').value >= 0.8,
      target: () => $('sl-alert').closest('.slider') },
    { title: 'Stability is shared',
      body: () => `Raising A's alert rate moved the index from <b>${before.toFixed(2)}</b> to <b>${idx().toFixed(2)}</b>, and the index is the same number for both sides. That is Kent and Thaler's main lesson: each side does better by making its own forces hard to destroy than by making the other side's forces easy to destroy. This chart sweeps one input across its range so you can see the whole trend at once.`,
      target: () => $('sweepcard') },
    { title: 'How to finish',
      body: 'There is no end screen. Explore until you can explain why a posture is stable or fragile. Try the sweep buttons above the chart, edit Side B, or switch to the U.S. and Russian deployed totals. <b>Copy link</b> saves your setup; <b>Reset</b> goes back to the default. Remember: the index ranks postures. It is not the probability of war.',
      target: () => document.querySelector('.head-btns') },
  ];
}

export const SHEET = {
  title: 'Crisis Stability Calculator: the rules on one screen',
  goal: 'Find force postures where neither side gains by striking first. The stability index runs from 0 (one side can disarm the other) to 1 (no first-strike advantage). Above 0.75 is robust; below 0.45 is fragile.',
  controls: [
    ['Posture buttons', 'Load a notional starting setup for both sides.'],
    ['Side A / Side B', 'Choose which side the sliders edit.'],
    ['Sliders', 'Launchers, warheads per launcher, alert rate, damage expectancy, damage curve, reserve for a third country. Arrow keys move a focused slider.'],
    ['Launch under attack', 'The striker expects the victim to fire its silo missiles on warning.'],
    ['Sweep buttons', 'Redraw the bottom chart for a different input.'],
    ['Chart', 'Hover or tap along a curve to read the costs at that point.'],
    ['Tab / Shift+Tab', 'Move between controls. Esc closes the tutorial.'],
  ],
  ideas: [
    'Many warheads on one fixed launcher (MIRVed silos) invite a first strike: one warhead can kill ten.',
    'Survivable forces on alert cannot be hit, so striking first buys little.',
    'Alert rates matter most when arsenals are small.',
    'Launch under attack raises the index but also the risk of an accidental launch.',
    'The index is shared: making your own forces safe helps both sides.',
  ],
  terms: [
    ['First strike', 'Attacking first, mainly to destroy the other side\'s weapons before they fly.'],
    ['Counterforce', 'Aiming at the enemy\'s weapons rather than its cities and industry ("value").'],
    ['Cost', '0 = no damage to you and enemy aims denied; 1.0 = total loss on both sides; 1.3 = total loss with the enemy untouched.'],
    ['Break-even chance', 'First-strike cost ÷ cost of being struck. Above this chance of an enemy attack, going first looks better.'],
    ['MIRV', 'Several independently aimed warheads on one missile.'],
    ['Damage expectancy', 'The chance one warhead destroys the launcher it is aimed at.'],
    ['Notional', 'Made-up for illustration, not an estimate of real forces.'],
  ],
};
