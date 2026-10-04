// "Learn to play": the hands-on first game (shared/js/learn.js runs it) and the rules on one screen.
// Steps read the page itself (order slots, month counter, log), so they finish when the player really acts.
const $ = id => document.getElementById(id);
const orders = () => [...document.querySelectorAll('#slots li.full')].map(li => li.textContent);
// When a step's highlight moves (action chosen, now pick a target), bring the new spot into the top part of the
// screen: on a phone the lesson card covers the bottom half.
let followed = null;
const follow = el => {
  if (el && el !== followed) {
    followed = el;
    const r = el.getBoundingClientRect();
    if (r.top < 56 || r.bottom > innerHeight * (innerWidth <= 600 ? 0.52 : 0.97)) scrollTo({ top: scrollY + r.top - 72, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  return el;
};
const pressed = a => document.querySelector(`[data-a="${a}"]`)?.getAttribute('aria-pressed') === 'true';

/** The seed the lesson plays on: Red's hidden posture is restrained, and month 1 is quiet. */
export const LESSON_SEED = 2026;

export const STEPS = [
  { title: 'How you win',
    body: 'You run the satellites of Blue, an invented power, through ten months: a three-month crisis, then a seven-month war with Red. Win by keeping more of your satellite services working than Red does, without the crisis turning nuclear. If the nuclear threshold is crossed, the game ends and everyone loses.' },
  { title: 'The scoreboard', target: () => $('bar'),
    body: '<b>Space support</b> is how much of each side\'s satellite service still works, out of 100. Each month your support minus Red\'s adds to the <b>advantage</b>; crisis months count a fifth. After month 10, +0.50 or more is your win, −0.50 or less is Red\'s, anything between is a stalemate. <b>Escalation risk</b> is the chance, so far, that the crisis has crossed the nuclear threshold.' },
  { title: 'Four orbits, shared by everyone', target: () => $('orbit'),
    body: 'Your satellites are on the left, Red\'s on the right. Reconnaissance (ISR, imaging spy satellites) flies in low LEO (low Earth orbit, about 450 km up), communications in high LEO (850 km), navigation in MEO (medium orbit, 20,000 km) and early warning in GEO (geostationary orbit, 36,000 km). "Comms 24/16" means 24 satellites alive, 16 needed for full service. Grey speckle is debris, which both sides fly through.' },
  { title: 'Two orders a month', target: () => document.querySelector('#acts-rev')?.closest('.sec'),
    body: 'Each month you give two orders: an action, then a target. <b>Reversible</b> attacks (jam, dazzle with a laser, cyber) cut a mission for a month or two, then wear off. <b>Destructive</b> ones (a missile, or a killer satellite called co-orbital) remove a satellite for good. <b>Defend</b> moves protect or replace your own. Red gives its two orders at the same time, without seeing yours.' },
  { title: 'First order: protect your eyes',
    target: () => follow(pressed('harden') ? $('tgts') : document.querySelector('[data-a="harden"]')),
    body: 'Backups are ground and airborne stand-ins for one mission. They halve jamming, dazzling and cyber against it for the rest of the game.',
    do: 'Tap <b>Backups</b>, then <b>Your ISR</b> (or tap your reconnaissance satellites in the orbit view).',
    done: () => orders().some(t => t.includes('Backups')) },
  { title: 'Second order: blind their navigation',
    target: () => follow(pressed('jam') ? $('tgts') : document.querySelector('[data-a="jam"]')),
    body: 'Jamming drowns out a satellite\'s signal. It costs nothing to repeat and raises the escalation risk very little.',
    do: 'Tap <b>Jam</b>, then <b>Red\'s Nav</b>.',
    done: () => orders().length >= 2 },
  { title: 'End the month', target: () => $('end'),
    body: 'Both orders sit in the slots above. Undo takes back the last one.',
    do: 'Press <b>End month</b>.',
    done: () => !!$('log').children.length },
  { title: 'Read what happened', target: () => $('log'),
    body: 'The log shows your orders in blue and Red\'s in red, with each roll\'s result. Red answers what you did last month, following a posture you cannot see: restrained, reciprocal or aggressive. The scoreboard has moved: both sides lost a little support to jamming.' },
  { title: 'The one idea that wins', target: () => $('outlook'),
    body: 'Destructive attacks free up your later orders, because a dead satellite stays dead. But a missile kill leaves a debris cloud in that orbit. In low LEO the air drags it down within a year or two; in high LEO it stays for generations and hits your satellites and everyone else\'s. Red\'s early-warning satellites also serve its nuclear command, so any attack on them multiplies the escalation risk. This panel shows what your debris would cost over 25 years.' },
  { title: 'Finish the war, then read the review', target: () => $('end'),
    body: 'Play on to month 10. From month 4 each month counts in full, and Red may reach for missiles. The review then replays your ten months with every destructive attack swapped for a reversible one, on the same dice, and runs 1,000 replays of both. It tells you whether the debris and the risk bought you anything.' },
];

export const SHEET = {
  title: 'Orbital Denial: the rules',
  goal: 'Ten months: three of crisis, seven of war. Each month you and Red each give two orders at once. Keep your space support (satellite service still working, out of 100) above Red\'s. After month 10 an advantage of +0.50 or more is your win, −0.50 or less is Red\'s, in between is a stalemate. If the nuclear threshold is crossed, the game ends and everyone loses.',
  controls: [
    ['Action button', 'Choose what to do (Reversible, Destructive or Defend). Tap again to cancel.'],
    ['Target button', 'Choose whose satellites, by mission. Or tap a highlighted group in the orbit view.'],
    ['End month', 'Lock in both orders. Red moves at the same time.'],
    ['Undo', 'Take back the last order, or the last month played.'],
    ['Tab, Enter, Space', 'Every button and every highlighted orbit group works from the keyboard.'],
    ['Esc', 'Close the tutorial or this sheet.'],
    ['Advanced', 'Set Red\'s posture, the debris model or the seed. Changing one restarts the game.'],
  ],
  ideas: [
    'Reversible attacks must be repeated, but they leave no debris and add little escalation risk.',
    'A missile kill is permanent, but its debris stays in high LEO for generations and hits your satellites too.',
    'Leave Red\'s early-warning satellites alone: they also serve its nuclear command, so attacks on them multiply the risk.',
    'Backups early blunt every later jam, dazzle and cyber attack on that mission.',
    'Crisis months count a fifth as much as war months. Save missiles and relaunches for the war.',
  ],
  terms: [
    ['LEO, MEO, GEO', 'Low, medium and geostationary Earth orbit: from a few hundred km up to 36,000 km.'],
    ['ISR', 'Intelligence, surveillance and reconnaissance: imaging spy satellites.'],
    ['ASAT', 'Anti-satellite weapon. Here, a missile fired from the ground.'],
    ['Co-orbital', 'A killer satellite that closes on its target. Little debris.'],
    ['Fragments', 'Trackable debris, 10 cm or larger.'],
    ['Entanglement', 'One satellite serving both conventional war and nuclear command.'],
    ['Posture', 'Red\'s hidden doctrine: restrained, reciprocal or aggressive. The review reveals it.'],
    ['Seed', 'The number that fixes every dice roll, so a link replays the same game.'],
  ],
};
