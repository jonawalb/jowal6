// "Learn to play": the hands-on first game (shared/js/learn.js) and the rules on one screen.
// It folds in the old guided walkthrough. The lesson plays the default setup (seize and hold against
// full denial, dice seed 1987), so every player sees the same first game.
import { POSTURES } from '../data/params.js';

const US = { obj: 'seize', meu: 1, abn: 1, cvw: 1, ddg: 3, mcm: 1, helo: 1, sof: true, bases: false, sector: 'W', strikes: 1 };
const IR = { posture: 'deny', ...POSTURES.deny.v };
export const DEFAULT = { us: US, ir: IR, turns: 8 };
export const LESSON_SEED = 1987;

const $ = id => document.getElementById(id);
const q = s => document.querySelector(s);
const turnShown = () => /^Turn /.test($('turn-t').textContent);
const gameOver = () => turnShown() && $('next').disabled;

/** Lesson steps. showTab switches the phone tab (Setup / Play / 1,000 games) so the step's target is on screen. */
export function lessonSteps({ showTab }) {
  return [
    { title: 'Why Kharg, and what winning means',
      body: 'Kharg is a small coral island about 30 km off Iran\'s coast, and most of Iran\'s crude oil exports load there. Whoever controls it has leverage over Iran\'s oil income. In this game you command a U.S. operation against it. You win if you meet the objective you picked; with <b>Seize and hold</b> that means U.S. troops hold the whole island at the end. It is a notional teaching model: most numbers are assumptions, not predictions.',
      start: () => showTab('setup') },
    { title: 'What you are looking at',
      body: 'The map shows Kharg and the Iranian coast. The red dashed box holds Iran\'s forces: coastal missile batteries (▲), drone launch teams (◆) and fast attack craft (FAC: small armed boats that attack in swarms). The blue dashed area is the U.S. force at sea. The inset shows the island, the two sides you can land on and the airstrip. Tap or hover anything for a note.',
      start: () => showTab('play'), target: () => $('box') },
    { title: 'Your setup',
      body: 'Here you pick the objective, spend a 100-point budget on forces, and set Iran\'s posture. The lesson uses the default: seize and hold with one Marine expeditionary unit (MEU: about 2,200 Marines on three or four ships), an airborne battalion, carrier aircraft and destroyers, against Iran\'s <b>full denial</b> posture. Leave it as it is for now.',
      start: () => showTab('setup'), target: () => $('obj') },
    { title: 'Play the first turn',
      body: 'The game runs in turns of 12 hours.',
      do: 'Press <b>Next turn</b>.',
      start: () => showTab('play'), target: () => $('next'),
      done: turnShown },
    { title: 'Read the dice',
      body: 'Each row is one event. <b>Chance</b> is how likely it is; <b>Dice</b> are random numbers from 0 to 1. A roll below the chance (highlighted) means the event happens. On turn 1 the carrier aircraft strike Iran\'s launchers, drone teams and boats while the ships wait out of range. Iran can only reinforce the island and roll to widen the war; its missiles, drones and boats go after the fleet from turn 2.',
      start: () => showTab('play'), target: () => $('log') },
    { title: 'Land the troops',
      body: 'From turn 2 the landing groups cross the mined approaches, paratroopers drop and the special operations force goes for the airstrip.',
      do: 'Press <b>Next turn</b> until U.S. and Iranian troops fight on the island.',
      start: () => showTab('play'), target: () => $('next'),
      done: () => !!q('#crt td.hit') || gameOver() },
    { title: 'The fight ashore',
      body: 'Ground combat uses a combat results table, as in a board wargame. U.S. strength divided by Iranian strength picks the column; one die (1 to 6) picks the row. The cell says who loses what. <b>DL</b> and <b>DR</b> are good for you: Iran, the defender, falls back or is routed, and U.S. troops take the next objective. <b>AL</b> and <b>AR</b> are bad: the U.S. attack takes losses or is repulsed. <b>EX</b> is an exchange: both sides lose. Iran keeps ferrying troops from the mainland and striking yours with drones, so the ratio moves every turn.',
      start: () => showTab('play'), target: () => $('crt-wrap') },
    { title: 'Finish the game',
      do: 'Press <b>Next turn</b> or <b>Play all turns</b> until the last turn, then read the result line under the log.',
      start: () => showTab('play'), target: () => q('.playbar'),
      done: gameOver },
    { title: 'One game is one roll; here are 1,000',
      body: 'A single game can be lucky or unlucky. This card replays the same setup 1,000 times with seeded dice. The bar splits the games into a win (blue), still contested (sand) and a loss (red). Below it: how often the war widened, and <b>Key drivers</b>, the levers that move the odds most. Against full denial, one Marine unit rarely holds Kharg inside four days.',
      start: () => showTab('mc'), target: () => $('mc-card') },
    { title: 'The idea that wins: every gain has a price',
      body: 'More force holds the island more often, but a bigger fight, or flying from Gulf partner bases, raises the odds that Iran widens the war. A raid exposes fewer troops for less time, so it succeeds more and escalates less, but the oil keeps flowing once you leave. A blockade lands no one and cuts exports with less risk ashore.',
      do: 'Pick <b>Raid and withdraw</b> and watch the odds change.',
      start: () => showTab('setup'), target: () => $('obj'),
      done: () => !!q('#obj [data-k="raid"][aria-pressed="true"]') },
    { title: 'Reading your result',
      body: 'This box sums up 1,000 games of your setup: how often you met the objective, how often the result was mixed or a loss, and how often there was a <b>major escalation</b> (Iran strikes Gulf energy facilities, or the escalation index reaches 50 of 100). Change any force, posture or assumption and everything updates. Now build your own plan.',
      start: () => showTab('setup'), target: () => $('status') },
  ];
}

export const SHEET = {
  title: 'Kharg Island: the rules on one screen',
  goal: 'Command a notional U.S. operation against Kharg Island, Iran\'s main oil export terminal. Pick an objective (seize and hold, raid and withdraw, or blockade from offshore), spend 100 points on forces, set Iran\'s posture, then play 12-hour turns. You win by meeting your objective; you also want to keep the war from widening.',
  controls: [
    ['Objective', 'Seize and hold, Raid and withdraw, or Blockade (no landing).'],
    ['− / +', 'Add or remove U.S. forces within the 100-point budget, or set Iran\'s forces.'],
    ['Approach side', 'Choose in the panel, or click (Enter) a side in the island inset.'],
    ['Next turn / Back', 'Step one 12-hour turn forward or back.'],
    ['Play all turns', 'Plays the rest of the game; press again to stop.'],
    ['Turn slider', 'Jump to any turn (arrow keys move one turn).'],
    ['New dice', 'Plays the same setup with a different dice seed.'],
    ['Tab / Enter / Space', 'Reach and press every control from the keyboard. Esc leaves the tutorial.'],
  ],
  ideas: [
    'Suppression strikes before landing wear down Iran\'s launchers, but give Iran time to reinforce the island.',
    'Destroyers stop missile salvos; attack helicopters break up boat swarms; mine countermeasures groups clear the approaches.',
    'Taking the airstrip lets troops fly in every turn, which is often what tips the fight ashore.',
    'More force means better odds of holding the island and more escalation. Read both columns of Key drivers.',
    'One game is luck; judge a plan by the 1,000-game Monte Carlo.',
  ],
  terms: [
    ['MEU', 'Marine expeditionary unit: about 2,200 Marines on three or four amphibious ships.'],
    ['FAC', 'Fast attack craft: small armed boats that attack in swarms.'],
    ['MCM', 'Mine countermeasures: units that find and clear sea mines.'],
    ['Strength point', 'About 1,000 troops (notional).'],
    ['CRT', 'Combat results table: the strength ratio picks the column, a die picks the row.'],
    ['Monte Carlo', 'Replaying the same setup 1,000 times with random dice to see how often each result happens.'],
    ['Notional', 'An assumption no open source gives; you can edit it.'],
  ],
};
