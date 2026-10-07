// "Learn to play": a guided first turn as Estonia (seed 5, picked so the first roll succeeds), using the shared lesson component.
// The lesson reads the game's state from the page (pressed buttons, the adjudicator panel), so it
// needs no hooks into the controller beyond the start-up call in app.js.
export const LESSON_SEED = 5;
const $ = s => document.querySelector(s);
const pressed = sel => $(`#mg-panel ${sel}[aria-pressed="true"]`);

export const SHEET = {
  title: 'Baltic Matrix Game: the rules on one screen',
  goal: 'Play one actor through six turns of a fictional crisis around Narva, the Estonian border town. Each turn you argue for one action and the other side argues for theirs. You win by moving the four tracks on the crisis board the way your actor wants. The debrief scores you against random play in the same seat. If escalation reaches 10, the exercise stops early.',
  controls: [
    ['Play as', 'Pick an actor. Switching starts a new game.'],
    ['1 · Your action', 'Click one action. Its tags (border, law, info…) say what it is about.'],
    ['2 · Reasons', 'Click up to three reasons. Click again to drop one.'],
    ['Put the argument…', 'Send it to the adjudicator, which scores it and hears counter-arguments.'],
    ['Roll 2d6', 'Roll two dice. Total plus the net modifier: 7+ succeeds.'],
    ['3 · Counter', 'When the AI argues, pick a counter-argument (or none) and send it.'],
    ['Tab / Enter / Space', 'Every button works from the keyboard. Esc leaves the tutorial.'],
  ],
  ideas: [
    'Pick an action that fits this turn\'s inject. Some reasons only hold when the inject is about their subject.',
    'A reason is strong (+1) only if it shares a tag with your action and the board backs it right now.',
    'Ambitious actions start at −1. A plain action with two strong reasons usually has better odds.',
    'Opponents argue back. Actions outside their strong ground draw weaker counters.',
    'Counter every AI move you can: a strong counter takes 1 off their roll.',
  ],
  terms: [
    ['Matrix game', 'A wargame played with arguments instead of unit counters.'],
    ['Inject', 'The event that opens each turn. Invented for this exercise.'],
    ['Adjudicator', 'The umpire. Here, a fixed and visible rule set.'],
    ['Tags', 'Labels for what an action, reason or counter is about.'],
    ['Net modifier', 'All the +1s and −1s added up. It is added to the dice.'],
    ['2d6', 'Two six-sided dice: totals 2 to 12, 7 is most common.'],
    ['Decisive / backfire', '10+ is a decisive success. 4 or less backfires and raises escalation.'],
  ],
};

/** The lesson steps. Start state: Estonia, seed 5, turn 1, nothing chosen. */
export function lessonSteps() {
  return [
    { title: 'What you are trying to do',
      body: 'This is a matrix game: a wargame played with arguments. You are Estonia in an invented crisis around Narva. Over six turns you argue for actions. Each success moves the crisis board your way. At the end, the debrief scores your board against random play as Estonia.',
      target: () => $('.mg-flag') },
    { title: 'The crisis board',
      body: 'Four tracks run from 0 to 10: escalation (how close to a clash), allied cohesion, local sentiment in Narva, and international attention. Estonia wants escalation low and Narva residents confident. If escalation hits 10, the game stops early.',
      target: () => $('#mg-board-card') },
    { title: 'Each turn opens with an inject',
      body: 'An inject is the event that starts the turn. Here, buoys marking the border river have vanished. Note its tags: <b>border</b> and <b>law</b>. Actions and reasons carry tags too, and matching them is how you score.',
      target: () => $('#mg-inject') },
    { title: 'Choose your action',
      body: 'The inject is about the border and the law, so answer it on that ground.',
      do: 'Click “Replace the buoys and step up … patrols on the river”.',
      target: () => $('#mg-actions'),
      done: () => !!pressed('[data-act="0"]') },
    { title: 'Back it with reasons',
      body: 'A reason is <b>strong (+1)</b> if it shares a tag with your action and the board backs it now. Otherwise it is weak and adds nothing. Two fit here: Estonian law applies on its own side of the river (law, border), and Estonia has handled incidents like this before (only holds on a border turn, which this is).',
      do: 'Pick “Estonian law applies…” and “Estonia has handled border incidents…”.',
      target: () => $('#mg-reasons'),
      done: () => !!(pressed('[data-rsn="0"]') && pressed('[data-rsn="7"]')) },
    { title: 'Put it to the adjudicator',
      body: 'The adjudicator is the umpire. It scores each reason, then the other actors argue back. Russia will raise a counter-argument: each strong counter is −1.',
      do: 'Click “Put the argument to the adjudicator”.',
      target: () => $('#mg-submit'),
      done: () => !!$('#mg-adj [data-roll]') },
    { title: 'Read the odds, then roll',
      body: 'Each line above shows a +1, 0 or −1 and why. They add up to the <b>net modifier</b>. You roll two dice (2d6) and add it: 7 or more succeeds, 10+ is decisive, 4 or less backfires. The bars show every dice total, shaded by the result it would give.',
      do: 'Click “Roll 2d6”.',
      target: () => $('#mg-adj .mg-rollrow'),
      done: () => !!$('#mg-adj .mg-res') },
    { title: 'The other side argues',
      body: 'Your result moved the board (see the coloured +/− tags). Now an AI actor argues its own move. You can lower its odds with a counter-argument. Like a reason, a counter is strong (−1 to them) only if it engages their action\'s tags and the board backs it.',
      do: 'Click “Next: Russia argues”. Russia runs a state-media campaign (an <b>info</b> action). Pick “Residents already have Estonian services…”, then click “Send to the adjudicator”.',
      target: () => $('#mg-panel [data-next="ai"]') || $('#mg-counters') || $('#mg-panel'),
      done: () => !!$('#mg-adj [data-roll]') && !$('#mg-counters') && !$('#mg-panel [data-next="ai"]') },
    { title: 'Roll for Russia',
      body: 'Check the adjudicator panel: your counter shows as “(you)” with its −1 or 0. Then roll their dice.',
      do: 'Click “Roll 2d6”.',
      target: () => $('#mg-adj .mg-rollrow'),
      done: () => !!$('#mg-panel [data-next="turn"], #mg-panel [data-next="debrief"]') },
    { title: 'How to win the next five turns',
      body: 'That is one full turn; click “Start turn 2” to carry on. The idea that wins: <b>match the inject</b>. Choose the action that fits this turn\'s event, give it two strong reasons, avoid ambitious −1 actions unless your reasons carry them, and counter every AI move. After turn 6 the debrief shows which reasons carried weight and how your score compares with random play. The turn log below keeps every roll, and the page link replays the same game.',
      target: () => $('#mg-panel [data-next]') },
  ];
}
