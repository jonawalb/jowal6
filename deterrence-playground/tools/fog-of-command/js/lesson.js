// "Learn to play": the hands-on lesson (shared/js/learn.js) and the rules on one screen. It replaces the older
// walkthrough (js/tour.js, 2026-10-04) and keeps its steps: one action per step, each one checked against the
// real game state, so the lesson moves on only when the player has done it.
import { GAME } from '../data/params.js';

const hh = x => `${String(GAME.startClock + x).padStart(2, '0')}:00`;
const q = s => document.querySelector(s);
const sector = id => q(`#map .fc-sec[data-node="${id}"]`);
const icon = id => q(`#map [data-unit="${id}"]`);
const ordered = (g, id) => g.orders.some(o => o.unit === id && o.t === g.t && !o.cancelled);
const narrow = () => matchMedia('(max-width: 640px)').matches;

/** The seed of the lesson game: the same valley, the same dice, every time. */
export const LESSON_SEED = 4242;

/**
 * Lesson steps for one side. api: { get() -> { g, me, sel }, tab(name) } (the phone tabs: map, units, reports).
 * On a phone the lesson card sits at the bottom of the screen, so a step that points at the map first scrolls
 * its target into the top half.
 */
export function lessonSteps(side, api) {
  const st = () => api.get();
  const show = (tab, el) => () => {
    api.tab(tab);
    const t = el && el();
    if (t && narrow()) { const bar = q('#bar').getBoundingClientRect().bottom; scrollBy(0, t.getBoundingClientRect().top - Math.max(bar, 0) - 24); }
  };
  if (side === 'red') return [
    { title: 'You attack', target: () => q('#box'), start: show('map'),
      body: () => `You command Red. You win the moment you hold <b>Tarn Crossing</b> (the objective at the top of the map) with no Blue unit there, any time before ${hh(GAME.hours)}. The board is turned so you attack up the screen. Units not yet on the map wait in the staging tray below your entry edge; dashed markers show where and when each one will enter.` },
    { title: 'Pick a waiting unit', target: () => icon('r5'), start: show('map', () => icon('r5')),
      do: 'Click <b>1 Tank</b> in the staging tray (or press 5).', done: () => st().sel === 'r5' },
    { title: 'Choose where it enters', target: () => sector('n2'), start: show('map', () => sector('n2')),
      do: 'Now click <b>Cairn Gap</b>, on your entry edge.',
      done: () => { const { g } = st(); return g.log.some(a => a.kind === 'e' && a.unit === 'r5' && a.v === 'n2') || g.units.find(u => u.id === 'r5').node !== 'off'; },
      body: 'Its dashed marker moves there, labelled with the hour it arrives.' },
    { title: 'Send a unit forward', target: () => icon('r1'), start: show('map', () => sector('f1')),
      do: 'Click <b>Recon A</b> in Harrow Gap (or press 1), then click <b>Alder Woods</b>, the sector in front of it.',
      done: () => ordered(st().g, 'r1'),
      body: 'A recon troop is your eyes: you see Blue units only in sectors next to your own units.' },
    { title: 'Arm your artillery', target: () => q('#map .fc-bat'), start: show('map', () => q('#map .fc-bat')),
      do: 'Press <b>A</b>, or click your battery at the right end of the staging tray.', done: () => st().sel === 'r13' || !!st().g.fire.red[st().g.t],
      body: 'You fire once an hour, at any sector.' },
    { title: 'Fire', target: () => sector('f1'), start: show('map', () => sector('f1')),
      do: 'Now click <b>Alder Woods</b> to fire on it.', done: () => !!st().g.fire.red[st().g.t],
      body: 'Blue has a recon troop there. Your Recon A is next door, so it watches the shells land and shows exactly what was hit. Fire nobody watches gives only a rough report.' },
    { title: 'End the hour', target: () => q('#end'), start: show('map'),
      do: 'Press <b>End hour</b> (or N).', done: () => st().g.t >= 1,
      body: 'Both sides\' orders now play out at once: units move, fights happen where both sides meet, and new reports come in.' },
    { title: 'Read the reports', target: () => q('#feed'), start: show('reports', () => q('#feed')),
      body: () => `Each hour's reports list what you saw, what your fire did and where fighting broke out.${narrow() ? ' On a phone they are in the Reports tab; Map brings the board back.' : ''} Seen enemy units are diamonds; "?" is movement your recon heard but did not see.` },
    { title: 'The idea that wins: fool the reserve', target: () => q('#box'), start: show('map'),
      body: 'Blue has one reserve and sends it once, to the road that looks strongest. Enter your <b>Decoy</b> (unit 8, no combat strength) down a road away from your main attack and keep it two sectors from Blue\'s recon: it is heard as a tank battalion but never looked at. Then mass your tanks on another road. Attack where Blue looks thin, or hit a defender that is already fighting from a second sector: it then loses its dug-in advantage.' },
    { title: 'How it ends', target: () => q('#end'), start: show('map'),
      body: () => `Keep giving orders and pressing End hour. If you take the crossing, you win at once; if Blue still holds it at ${hh(GAME.hours)}, you lose. A review then opens below the map: key moments, the map as you saw it against what was really there, and 500 replays of your orders with fresh dice, to show how much was luck.` },
  ];
  return [
    { title: 'You defend', target: () => q('#mission'), start: show('map'),
      body: () => `You command Blue. You win if you still hold <b>Tarn Crossing</b> (the objective at the bottom of the map) at ${hh(GAME.hours)}, after ${GAME.hours} one-hour turns. You lose the moment a Red unit holds it with none of yours there. Red is stronger and arrives in waves from the top.` },
    { title: 'What you are looking at', target: () => q('#box'), start: show('map'),
      body: 'The valley is 16 <b>sectors</b> (map squares) on four roads running down to the crossing. Blue squares are your units; a diamond is a Red unit you have seen; "?" is movement your recon troops heard but did not see. This is the fog: you see Red only next to your own units, so most of the map is unknown.' },
    { title: 'Pick a unit', target: () => icon('b5'), start: show('map', () => icon('b5')),
      do: 'Click <b>Tanks</b> on the map at Wren Cross (or press 5).', done: () => st().sel === 'b5',
      body: 'Each unit shows the key that picks it.' },
    { title: 'Give it an order', target: () => sector('m1'), start: show('map', () => sector('m1')),
      do: 'Now click <b>Brook Hill</b>, on your main line, to send the tanks there.', done: () => ordered(st().g, 'b5'),
      body: 'The bar above the map says whether this hour\'s orders start now or next hour: orders sometimes run an hour late. A clock on a unit means its order waits.' },
    { title: 'Changed your mind? Undo', target: () => q('#undo'), start: show('map'),
      do: 'Press <b>Undo</b> (or U) to cancel that order.', done: () => !ordered(st().g, 'b5'),
      body: 'The tanks are your <b>reserve</b>: the one strong unit you hold back. Keep it behind the line until one road clearly carries Red\'s main attack, then send it there.' },
    { title: 'Arm your artillery', target: () => q('#map .fc-bat'), start: show('map', () => q('#map .fc-bat')),
      do: 'Press <b>A</b>, or click your battery in the bottom-right corner of the map.', done: () => st().sel === 'b9' || !!st().g.fire.blue[st().g.t],
      body: 'You fire once an hour, at any sector. The battery is fixed: it cannot move and cannot be attacked.' },
    { title: 'Fire', target: () => sector('n1'), start: show('map', () => sector('n1')),
      do: 'Now click <b>Harrow Gap</b> to fire there.', done: () => !!st().g.fire.blue[st().g.t],
      body: 'Your Recon A in Alder Woods is next door, so it watches the shells land and shows exactly what is there. Fire nobody watches gives only a rough report.' },
    { title: 'End the hour', target: () => q('#end'), start: show('map'),
      do: 'Press <b>End hour</b> (or N).', done: () => st().g.t >= 1,
      body: 'Both sides\' orders now play out at once: units move, fights happen where both sides meet, and new reports come in.' },
    { title: 'Read the reports', target: () => q('#feed'), start: show('reports', () => q('#feed')),
      body: () => `Each hour's reports list what you saw, what your fire did and where fighting broke out.${narrow() ? ' On a phone they are in the Reports tab; Map brings the board back.' : ''} Strength is in combat points: a mech battalion is 10, a tank battalion 12.` },
    { title: 'The ideas that win', target: () => q('#box'), start: show('map'),
      body: 'A unit that has sat in a sector for two hours is <b>dug in</b> and fights as if it were three times its size, so stay put on the main line. Beware the <b>decoy</b>: one Red "tank battalion" has no strength at all, sent to pull your reserve down the wrong road. Before you commit the reserve, fire on that road while a recon troop watches; a tank that takes no damage is the decoy.' },
    { title: 'How it ends', target: () => q('#end'), start: show('map'),
      body: () => `Keep giving orders and pressing End hour. Hold the crossing to ${hh(GAME.hours)} and you win. A review then opens below the map: key moments, the map as you saw it against what was really there, and 500 replays of your orders with fresh dice, to show how much was luck.` },
  ];
}

/** The rules on one screen. */
export const SHEET = {
  title: 'Fog of Command: the rules on one screen',
  goal: `Defending (Blue): still hold Tarn Crossing at ${hh(GAME.hours)}. Attacking (Red): hold it with no Blue unit there before then. ${GAME.hours} one-hour turns from ${hh(0)}.`,
  controls: [
    ['Click a unit, then a sector', 'Order the unit to move there (or, attacking, choose where a waiting unit enters)'],
    ['1–9, 0, T, W', 'Pick a unit (the key is printed on each unit)'],
    ['A, then a sector', 'Fire your artillery there (once an hour)'],
    ['G', 'Switch the picked unit between Hold and Give ground'],
    ['N / End hour', 'End the hour: orders play out, fights happen, reports come in'],
    ['U / Undo', 'Take back your last order this hour'],
    ['Tab, arrows, Enter', 'Move between sectors and act on one by keyboard'],
    ['Esc', 'Clear the selection'],
  ],
  ideas: [
    'Stay put to dig in: after two hours in a sector a unit fights as if three times its size.',
    'Hit a defender from a second sector while it is already fighting: it loses its dug-in advantage.',
    'Fire where a recon troop next door can watch: you see exactly what is there and how hurt it is.',
    'Defending, hold the reserve until one road clearly leads, and check that road for the decoy first.',
    'Attacking, send the decoy down a road away from your main effort and keep it two sectors from Blue\'s recon.',
  ],
  terms: [
    ['Sector', 'One square of the map; units in the same sector fight'],
    ['Recon troop', 'A small scouting unit; it hears movement two sectors away'],
    ['Decoy', 'A Red group with no combat strength that looks like a tank battalion'],
    ['Reserve', 'Strong units held back to send where the attack comes'],
    ['Give ground', 'A standing order to fall back one sector when a stronger enemy attacks'],
    ['Combat points', 'Unit strength: mech battalion 10, tank battalion 12'],
    ['Offense–defense balance', 'Start-screen slider; 5 is standard, lower helps whoever defends a sector'],
  ],
};
