// "Learn to play": a hands-on first night in Easy mode on a fixed seed, plus the rules on one screen.
// The lesson freezes the game clock (api.hold) while the player reads, and lets it run for the steps
// where the player has to act. It replaces the old read-only walkthrough.
import { WEAPONS, RESUPPLY } from '../data/params.js';

export const LESSON_SEED = 2026;

const $ = id => document.getElementById(id);
const phone = () => innerWidth <= 700;
// On a phone the lesson card covers the bottom of the screen, so keep the field near the top.
const fieldUp = () => { if (phone()) scrollTo({ top: $('fieldbox').getBoundingClientRect().top + scrollY - 70, behavior: 'auto' }); };
const shots = S => S.fired.gun + S.fired.sri + S.fired.lri;
const ballisticDone = S => S.kills.ballistic + S.leaks.ballistic > 0;
const tap = () => (matchMedia('(pointer: coarse)').matches ? 'tap' : 'click');

/** Lesson steps. `api` is the game's own hook: { S, started, mode, hold(v), advanceUntil(pred, sec), inReach(type, w) }. */
export function lessonSteps(api) {
  const card = () => document.querySelector('#overlay .ov-card');
  return [
    { title: 'Your job tonight',
      body: 'A notional (invented) country must defend four cities against three waves of drones and missiles. You are scored two ways: <b>leakers</b>, the tracks that get through to a city, and <b>cost</b>, the dollars you spend on interceptors for each dollar of threat you destroy. Both low is a good night.',
      target: card },
    { title: 'Start in Easy mode',
      body: 'Easy has the same controls as Normal and twice the resupply between waves. This lesson uses the same raids every time.',
      do: 'Choose <b>Easy</b> to start wave 1.',
      target: () => document.querySelector('#overlay [data-mode="easy"]'),
      done: () => api.started && api.mode === 'easy' },
    { title: 'What you are looking at',
      start: () => { api.hold(true); api.advanceUntil(S => api.inReach('drone', 'sri'), 30); fieldUp(); },
      body: 'The sea is at the top and four cities, A to D, sit on the coast at the bottom. Each moving symbol is a <b>track</b> (one incoming weapon). Triangles are drones: slow, many and cheap. Diamonds are cruise missiles: faster. Circles with long trails are ballistic missiles: they fall in seconds, and a dashed ring marks where each will land. The clock is frozen while you read.',
      target: () => $('fieldbox') },
    { title: 'Three weapons',
      start: () => { api.hold(true); },
      body: `<b>Guns and EW</b> (electronic warfare, i.e. jamming) are almost free but reach only the area around each city, and cannot stop a ballistic missile. <b>Short-range</b> interceptors cost tens of thousands of dollars and handle drones and cruise missiles well. <b>Long-range</b> interceptors reach almost the whole map and are the only good answer to ballistic missiles, but each costs millions and you have only ${WEAPONS.lri.mag} for the night. The dashed circles on the map show where the chosen weapon can reach.`,
      target: () => $('weapons') },
    { title: 'Fire your first shot',
      start: () => { fieldUp(); api.hold(false); return shots(api.S); },
      do: () => `Press <kbd>2</kbd> (or ${tap()} <b>Short-range</b>), then ${tap()} a drone inside a dashed circle.`,
      wait: 'The clock is running. From the keyboard: the arrow keys pick a track and Space fires.',
      target: () => $('field'),
      done: s0 => shots(api.S) > s0 },
    { title: 'Read what happened',
      start: () => { api.hold(true); },
      body: 'Your interceptor flies to the track. A flash means a kill; if it misses, the track keeps coming and you can fire again. A thin ring marks a track that already has a shot on the way, so you do not waste a second one. Each site then needs a moment to reload (the arc around it). This panel adds up the dollars: <b>Defense spent</b> against <b>Threats destroyed</b>. A ratio of 0.5 : 1 means you spent 50 cents for each dollar of threat you stopped. Guns are not priced.',
      target: () => $('sec-exchange') },
    { title: 'Keep the drones off',
      start: () => { fieldUp(); api.hold(false); },
      body: 'Keep shooting drones as they come in. Let them get close and switch to guns (key <kbd>1</kbd>) when they are inside a gun circle: guns cost almost nothing.',
      do: 'Defend until the ballistic missile appears, about half a minute into the wave. The lesson freezes the game when it does.',
      wait: 'The clock is running.',
      target: () => $('field'),
      done: () => api.inReach('ballistic', 'lri') || ballisticDone(api.S) },
    { title: 'The idea that wins',
      start: () => { api.hold(true); fieldUp(); return api.S.use.lri.ballistic; },
      body: () => (ballisticDone(api.S) && !api.S.threats.some(t => t.alive && t.type === 'ballistic')
        ? 'The ballistic missile is already gone. Remember the rule anyway: use the cheapest weapon that can do the job, and save long-range interceptors for ballistic missiles.'
        : 'Use the cheapest weapon that can do the job, and save long-range interceptors for this: a ballistic missile, the circle with the long trail. Only long-range stops it reliably; guns cannot touch it. The clock is frozen.'),
      do: () => `Press <kbd>3</kbd> (or ${tap()} <b>Long-range</b>), then ${tap()} the ballistic missile.`,
      target: () => $('field'),
      done: s0 => api.S.use.lri.ballistic > s0 || !api.S.threats.some(t => t.alive && t.type === 'ballistic') },
    { title: 'Finish the wave and resupply',
      start: () => { fieldUp(); api.hold(false); },
      body: `When the last track is gone, a resupply card opens. You get ${RESUPPLY.budget.easy} points in Easy mode to buy reloads with the + and − buttons, or press <b>Split like the rules do</b>. A long-range reload costs ${RESUPPLY.lri.pts} points, a short-range one ${RESUPPLY.sri.pts}. Unspent points are lost.`,
      do: 'Finish wave 1, buy reloads, then press <b>Load and start wave 2</b>.',
      wait: 'The clock is running. P pauses at any time.',
      target: () => (api.S.phase === 'break' ? card() : $('field')),
      done: () => api.S.wave >= 1 && api.S.phase === 'wave' },
    { title: 'How the night ends',
      start: () => { api.hold(true); },
      body: 'Waves 2 and 3 are bigger. Wave 3 is modelled on Iran\'s April 2024 attack on Israel and is heavy with ballistic missiles, so keep long-range interceptors for it. After wave 3 an after-action review replays the same raids with two simple rules (cheapest weapon first, and best weapon first) so you can see whether you let fewer through or spent less. The game starts again when you press Finish.',
      target: () => $('sec-exchange') },
  ];
}

/** The rules on one screen. */
export const SHEET = {
  title: 'Raid Night: the rules',
  goal: 'Defend four cities through three waves, about a minute each. Let as few tracks through as you can (leakers do damage to cities), and spend as little as you can on interceptors for each dollar of threat you destroy.',
  controls: [
    ['1 2 3', 'choose guns and EW, short-range or long-range'],
    ['Click / tap', 'fire the chosen weapon at a track'],
    ['← → (J K)', 'select the previous or next track in the lock order'],
    ['Space, Enter', 'fire at the selected track'],
    ['Tab', 'switch weapon during a wave'],
    ['O', 'change the lock order: the order the arrow keys step through tracks'],
    ['P, Esc', 'pause and resume'],
    ['N', 'load the resupply and start the next wave'],
    ['Hard mode', 'two batteries. Left (cities A–B): W fires, A/D pick, Tab switches munition. Right (C–D): Space or ↑ fires, ← → pick, Return, \\ or Delete switches. Both share the same magazines.'],
  ],
  ideas: [
    'Use the cheapest weapon that can do the job: guns at drones near a city, short-range at drones and cruise missiles, long-range at ballistic missiles.',
    `Save long-range interceptors. You have ${WEAPONS.lri.mag} for the night, and wave 3 is heavy with ballistic missiles.`,
    'Do not double up: a thin ring marks a track that already has a shot flying at it. Fire again only after a miss.',
    'Spend the resupply. Unspent points are lost, and long-range reloads are what you will miss in wave 3.',
  ],
  terms: [
    ['Track', 'one incoming drone or missile on the map'],
    ['Leaker', 'a track that reaches a city: 1 damage point for a drone, 3 for a cruise missile, 6 for a ballistic missile'],
    ['EW', 'electronic warfare: jamming that brings drones down'],
    ['Cost exchange', 'dollars spent on interceptors per dollar of threat destroyed (0.5 : 1 means 50 cents per dollar)'],
    ['Magazine', 'the interceptors a weapon has left for the night'],
    ['Notional', 'invented for the game; only raid mixes and unit costs are sourced'],
  ],
};
