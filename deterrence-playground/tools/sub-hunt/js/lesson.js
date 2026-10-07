// "Learn to play": the hands-on lesson (shared/js/learn.js) and the rules on one screen. It replaces the older
// five-card walkthrough and the "How to play" card (2026-10-04) and keeps their content.
import { GAME, ACTIONS } from '../data/params.js';
import { thisTurn } from './game.js';

const A = ACTIONS;
const q = s => document.querySelector(s);
const narrow = () => matchMedia('(max-width: 720px)').matches;

/** The seed of the lesson hunt: the same sub and the same dice every time. */
export const LESSON_SEED = 2718;

/**
 * Lesson steps. api: { get() -> g, tool() -> the chosen action }. On a phone the lesson card sits at the
 * bottom of the screen, so a step first scrolls its target into the top part of the screen.
 */
export function lessonSteps(api) {
  const g = () => api.get();
  const queued = k => thisTurn(g()).some(e => e.k === k);
  let picked = false;
  const top = el => () => { const t = el(); if (t && narrow()) scrollBy(0, t.getBoundingClientRect().top - 12); };
  return [
    { title: 'Find the submarine', target: () => q('#status'), start: top(() => q('#box')),
      body: `A report ${GAME.reportAge} hours old put an enemy submarine inside the dashed ring. You win if one of your attacks lands within ${GAME.prosR} nautical miles (nm) of it. You lose if it slips out through a gap into the Atlantic, or if ${GAME.turns} turns (${GAME.turns * GAME.turnHours} hours) run out.` },
    { title: 'The glow is your best guess', target: () => q('#box'), start: top(() => q('#box')),
      body: 'The orange glow is your <b>probability map</b>: brighter means the sub is more likely there. It spreads every turn because the sub keeps moving, most likely south toward the gaps. You never see the sub itself until the hunt ends.' },
    { title: 'Effort is your budget', target: () => q('#meter-effort'), start: top(() => q('#controls')),
      body: `Each turn you get ${GAME.effort} <b>effort points</b> to spend on actions; unspent points carry over, up to ${GAME.bank}. Buoys (${GAME.buoyLoads} patterns) and attacks (${GAME.torpedoes}) must last the whole hunt.` },
    { title: 'Drop a buoy circle', target: () => q('#box'), start: top(() => q('#box')),
      do: () => `With <b>Buoy circle</b> chosen${narrow() ? '' : ' (key 2)'}, click inside the brightest part of the glow.`,
      done: () => queued('c'),
      body: `A buoy circle (${A.circle.cost} points) is a ring of listening buoys. It covers a small area but pins a sub inside it to within a few miles.` },
    { title: 'Now try a wide sensor', target: () => q('#tools [data-tool="air"]'),
      do: () => `Choose <b>Aircraft box</b>${narrow() ? '' : ' (key 3)'}, then click the map just south of the glow, where the sub is heading.`,
      // On a phone the actions sit below the map: once the aircraft is chosen, bring the map back into view.
      start: () => { picked = false; top(() => q('#tools'))(); },
      done: () => {
        if (!picked && api.tool() === 'air') { picked = true; if (narrow()) q('#box').scrollIntoView({ block: 'start' }); }
        return queued('a');
      },
      body: `The aircraft box (${A.air.cost} points) covers a big square cheaply, but places a contact only roughly and mostly hears a sub that is sprinting. Wide and blurry, or narrow and sharp: that is the trade-off in every turn.` },
    { title: 'End the turn', target: () => q('#end'), start: top(() => q('#controls')),
      do: 'Press <b>End turn</b> (or E). Two hours pass.', done: () => g().turn >= 1,
      body: 'Your sensors listen while the sub moves. Then the map updates.' },
    { title: 'Read what happened', target: () => q('#log'), start: top(() => q('#log')),
      body: 'Each sensor either heard something (a <b>contact</b>, drawn with its error circle; some contacts are noise) or heard nothing. Hearing nothing is news too: it dims the glow where you listened and brightens it everywhere else, because the sub must be somewhere.' },
    { title: 'Learn its habit', target: () => q('#beh-card'), start: top(() => q('#beh-card')),
      body: 'The sub follows one of four habits: it sprints and drifts, zig-zags to a gap, hides from your ship and helicopter, or circles a patrol point. These bars are the map\'s odds on each habit; they sharpen as contacts come in. Sprints are loud, so every sensor hears a sprinting sub far better.' },
    { title: 'The idea that wins: save up, then pounce', target: () => q('#meter'), start: top(() => q('#meter')),
      body: () => `<b>Best attack odds</b> is the chance that the sub is inside the single best ${GAME.prosR} nm ring on your map. Squeeze the glow with sharp sensors, save effort for a big turn, and when the odds are high choose <b>Attack</b>${narrow() ? ' and tap the bright spot.' : ' (key 7) and click the bright spot (key B jumps there).'} A miss rules that ring out, but a sub nearby hears it and bolts.` },
    { title: 'How it ends', target: () => q('#end'), start: top(() => q('#controls')),
      body: 'An attack strikes when you end the turn, before the sub moves. A hit wins at once. When the hunt is over, a review below the map names the sub\'s habit, draws its true track against your searches and replays the hunt hour by hour. Good hunting.' },
  ];
}

/** The rules on one screen. */
export const SHEET = {
  title: 'The Hunt: the rules on one screen',
  goal: `Hit the hidden submarine with an attack (within ${GAME.prosR} nm) before it slips out through a gap into the Atlantic or ${GAME.turns} turns of ${GAME.turnHours} hours run out.`,
  controls: [
    ...Object.values(ACTIONS).map(a => [`${a.key} · ${a.name}`, `${a.cost ? `${a.cost} pt. ` : a.help.startsWith('Free') ? '' : 'Free. '}${a.help}`]),
    ['Click the map', 'Queue the chosen action there (queue as many as your effort covers)'],
    ['R / Shift+R', 'Turn a buoy line 22.5° (also the ⟳ buttons or the mouse wheel)'],
    ['B', 'Jump the crosshair to the brightest spot; arrows move it, Enter acts'],
    ['U / Undo', 'Take back the last action queued this turn'],
    ['E / End turn', 'Resolve any attack, then play two hours'],
  ],
  ideas: [
    'Hearing nothing is information: it moves the odds away from where you listened.',
    'Use wide sensors (aircraft, buoy line) to find the sub, sharp ones (buoy circle, helicopter dip) to pin it down.',
    'A buoy line across a zig-zagger\'s course to its gap catches it.',
    'A shy sub hides from your ship and helicopter, so hunt it with buoys and the aircraft, which it cannot hear.',
    'Save effort, then pounce: several sharp sensors and an attack in one turn.',
  ],
  terms: [
    ['nm', 'Nautical mile, about 1.85 km'],
    ['Probability map', 'The orange glow: where the sub could be, brighter = more likely'],
    ['Contact', 'A sensor report of the sub, with a stated error; some are false'],
    ['Effort', `Points to spend each turn (${GAME.effort}, carry over up to ${GAME.bank})`],
    ['Sprint', 'The sub running fast: loud, so every sensor hears it better'],
    ['Towed array', 'Your ship\'s trailing sonar: hears the bearing (direction) of a sub'],
  ],
};
