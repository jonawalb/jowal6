// "Learn to play": the hands-on lesson (shared/js/learn.js) and the rules on one screen. It replaces the older
// ten-card walkthrough (js/tour.js, 2026-10-04) and keeps its content: one guided month as Washington, from the
// gray-zone start, on a fixed seed. Each "do" step checks the real game state before it moves on.
import { P } from '../data/params.js';

const $ = id => document.getElementById(id);

/** The seed of the lesson game: the same events and dice every time. */
export const LESSON_SEED = 2029;

/**
 * Lesson steps. api: { get() -> g (the game, or null), setStep(n), setPhoneTab(t), isPhone() }.
 * `view` opens the step of the move and the phone tab a lesson step is about.
 */
export function lessonSteps(api) {
  const g = () => api.get();
  // A skipped briefing still opens the month, so the rest of the lesson has something to point at.
  const rally = () => document.querySelector('[data-act="us_rally"]')?.closest('.k4-act');
  // On a phone the lesson card covers the bottom of the screen, so a step brings its target near the top.
  const lift = el => { const t = el && el(); if (t && api.isPhone()) scrollBy(0, t.getBoundingClientRect().top - 12); };
  const view = (step, tab, el) => () => { if ($('play').hidden && !$('typecard').hidden) $('type-go').click(); if (step && g()) api.setStep(step); if (tab && api.isPhone()) api.setPhoneTab(tab); lift(el); };
  let posted = false, turn0 = 0;
  const onPosture = () => { posted = true; };
  return [
    { title: 'Your private briefing', target: () => $('typecard'), start: () => $('typecard').scrollIntoView({ block: 'start' }),
      body: 'You lead Washington. Every leader has a hidden <b>type</b>: resolute, cautious or opportunist. Yours is on this card. The other capitals cannot see it; they guess it from what you do, and you guess theirs the same way.',
      do: () => `Press <b>Go to ${P.months[g()?.s.turn ?? 0]}</b>.`, done: () => !$('play').hidden },
    { title: 'How you win', target: () => document.querySelector('.k4-bar'), start: view(1, 'move'),
      body: `Nobody simply wins. The game runs up to ${P.turns} months and ends early in a settlement, with Beijing stepping back, with Taiwan forced to terms, or in nuclear use. You are then scored against the goals you weighted at the start (here, Washington's defaults), and compared with the computer playing your seat.` },
    { title: 'The state of the crisis', target: () => $('crisis'), start: view(1, 'sit'),
      body: 'The <b>escalation ladder</b> runs from Pressure to Nuclear use; the bottom two rungs are the <b>gray zone</b>, coercion short of shooting. Below it are shared tracks: Taiwan\'s position, how united the coalition is, the economic shock and the nuclear shadow (the risk of nuclear use).' },
    { title: 'Step 1: pick a posture', target: () => $('postures'), start: () => { posted = false; view(1, 'move')(); $('postures').addEventListener('click', onPosture); },
      body: 'Each month you go through three steps (Posture, Moves, Forces), then End month. All four capitals decide at once. Your <b>posture</b> sets how many escalatory (▲) moves you may make: none if you stand down, one if you de-escalate.',
      do: 'Click a posture. <b>Hold</b> is a safe first choice.', done: () => posted },
    { title: 'Step 2: choose a move', target: () => rally() || $('actions'),
      start: () => { $('postures').removeEventListener('click', onPosture); view(2, 'move')(); const t = document.querySelector('#tabs [data-line="D"]'); if (t && t.getAttribute('aria-selected') !== 'true') t.click(); lift(rally); },
      body: 'You get up to four moves a month across seven tabs: diplomatic, information, military, economic, financial, intelligence and law enforcement. Each shows its odds of success this month and its cost.',
      do: 'On the <b>Dip</b> tab, tick <b>Rally allies and partners</b>.', done: () => !!g()?.choice.actions.includes('us_rally') },
    { title: 'Answer the follow-up', target: rally, start: view(2, 'move', rally),
      body: 'Most moves ask a follow-up question that changes their odds and effect. Tap the <b>i</b> beside a % to see how the odds are worked out.',
      do: 'Choose <b>A wide coalition</b>.', done: () => g()?.choice.follow.us_rally?.who === 'wide' },
    { title: 'Step 3: forces and supplies', target: () => $('forces'), start: view(3, 'move'),
      body: 'Here you can move your named formations between four sea areas and the Rear, and set a stance in each area. Moves cost <b>Lift</b> (sea and air transport) and fuel; strikes and fighting burn munitions; forces kept forward lose readiness. As Washington, forces leaving the Rear take two months to arrive, so plan early. You can leave everything as it is this month.' },
    { title: 'Stuck? Ask your staff', target: () => $('advise'), start: view(3, 'move'),
      body: '<b>Ask your staff</b> fills in all three steps with what the computer would do in your seat, for your goals and from your own reads of the rivals. Nothing is locked in: change any of it before you end the month. On Step 3, <b>Let your staff set forces</b> does just the forces.' },
    { title: 'End the month', target: () => $('end-turn'), start: () => { turn0 = g()?.s.turn ?? 0; view(3, 'move')(); },
      do: 'Press <b>End month</b>.', done: () => !$('resolve').hidden || (g()?.s.turn ?? 0) > turn0 },
    { title: 'What happened', target: () => $('tldr'),
      body: 'All four capitals\' moves are revealed together. For each move the game rolled 0 to 100: below its odds is a success, up to 20 points above is a partial result, anything higher fails. The line "In short" sums up the month. The rivals\' reads of your type have shifted too.' },
    { title: 'The ideas that win', target: () => $('next'),
      body: 'Read the others: in the <b>Detailed</b> view the Situation panel shows how each rival looks to you and how it seems to see you, and costly moves say the most. Climb the ladder only on purpose, since every rung raises the risk for everyone. When an offer of talks succeeds, you may call a <b>peace forum</b> the next month. Press <b>Continue</b> for the next month; at the end, a debrief replays every month and shows who each leader really was.' },
  ];
}

/** The rules on one screen. */
export const SHEET = {
  title: 'Four Capitals: the rules on one screen',
  goal: `Play Washington, Taipei, Beijing or Tokyo through up to ${P.turns} months of a notional 2029 crisis. You are scored against the goals you weight at the start, and compared with the computer playing your seat.`,
  controls: [
    ['Step 1 · Posture', 'Stand down, De-escalate, Hold, Escalate (or a nuclear signal): sets how many escalatory ▲ moves you may make'],
    ['Step 2 · Moves', 'Up to 4 moves a month on seven tabs; tick one, then answer its follow-up questions'],
    ['Step 3 · Forces', 'One order per formation (move it, or aim a strike force) and a stance in each sea area'],
    ['Map', 'Tap or press Enter on a sea area to set your stance there'],
    ['i beside a %', 'How the odds of a move are worked out'],
    ['End month', 'Everyone reveals at once; the dice roll; fighting and upkeep resolve'],
    ['Simple / Detailed', 'Hides or shows the finer detail; the game is the same'],
  ],
  ideas: [
    'Your type is hidden. Costly moves (deploying forces, public commitments) tell rivals the most about you.',
    'Watch how rivals read you: a rival that thinks your aims are limited is likelier to accept a peace forum.',
    'Each rung of the ladder raises the nuclear shadow for everyone; climb only on purpose.',
    'Supplies run out. Lift refills each month; fuel and munitions rebuild slowly; send worn formations to the Rear.',
    'Repeating last month\'s move costs −15 on its odds. Vary your moves.',
  ],
  terms: [
    ['Posture', 'Your overall stance this month'],
    ['Escalation ladder', 'From Pressure to Nuclear use; the bottom two rungs are the gray zone'],
    ['Gray zone', 'Coercion short of military action: coast guard patrols, militia swarms, cable cuts, cyber'],
    ['DIMEFIL', 'The seven lines of moves: diplomatic, information, military, economic, financial, intelligence, law enforcement'],
    ['Lift', 'Sea and air transport: refills each month, pays for moving formations'],
    ['Readiness', 'How fit a formation is to fight: drains forward, recovers in the Rear'],
    ['Fog of war', 'Rival forces show as ranges (“about 6–9”), sharper near your own forces'],
    ['Nuclear shadow', 'The shared risk of nuclear use; once the shooting starts it can become real'],
    ['Peace forum', 'A once-a-game call to end the conflict, possible the month after a successful offer of talks'],
  ],
};
