// Guided walkthrough: fixed parameter states with short explanations. Adapted from the site-wide walkthrough pattern.
import { A_DEFAULTS } from './models/crisis.js';
import { B_DEFAULTS } from './models/signal.js';
import { C_DEFAULTS } from './models/reputation.js';

export const STEPS = [
  { title: 'A threat is information',
    body: 'S threatens and R must guess whether S would really fight. Here R thinks S is probably irresolute, so the irresolute type bluffs some of the time and R calls some of the time. Follow the thick lines in the tree: war happens with positive probability.',
    set: { m: 'A', A: { ...A_DEFAULTS }, case: 'syria' } },
  { title: 'Audience costs tie hands',
    body: 'Raise the cost of backing down above the irresolute type’s net loss from war (a ≥ cₕ − q). Now both types would fight, R believes every threat and concedes, and the audience cost is never paid. This is Fearon’s commitment logic, and one common reading of Kennedy’s public warnings before the Cuban Missile Crisis. The case card below the figures gives Trachtenberg’s doubts.',
    set: { m: 'A', A: { ...A_DEFAULTS, a: 0.8 }, case: 'cuba' } },
  { title: 'A reputation can do the work instead',
    body: 'Keep the audience cost low but make R believe S is likely resolute. R concedes to any threat, so the threat works without tied hands, and an irresolute S could bluff and win. Trachtenberg reads Fashoda (1898) this way: Britain’s resolve was known before the crisis began.',
    set: { m: 'A', A: { ...A_DEFAULTS, p: 0.85, a: 0.1 }, case: 'fashoda' } },
  { title: 'Sinking costs: pay to be believed',
    body: 'A costly action such as an airlift, paid whatever happens, separates the types once k exceeds what the irresolute type could gain. R’s posterior after the signal jumps to 1. The price is that the resolute type burns k every time.',
    set: { m: 'B', B: { ...B_DEFAULTS, tech: 'sunk', k: 0.45 }, case: 'berlin48' } },
  { title: 'Tying hands: pay only if you fold',
    body: 'A public commitment, or a small multinational force on a border, costs little unless S backs down. Past a ≥ c − vᵢ no one who commits will fold. Compare the table: tying hands leaves S better off on average but carries a higher chance of war, the two results in Fearon (1997).',
    set: { m: 'B', B: { ...B_DEFAULTS, tech: 'tied', k: 0.36 }, case: 'efp' } },
  { title: 'Salami tactics and reputation',
    body: 'A defender faces ten slices, like the restrictions that built up into the 1948 Berlin blockade. Even a 5% chance that it is tough keeps the challenger out of the early slices, because a weak defender will resist early to protect its reputation. Press “Play it out” to watch one history.',
    set: { m: 'C', C: { ...C_DEFAULTS }, case: 'blockade' } },
  { title: 'Cheap slices are hard to deter',
    body: 'Make each slice cheap to attempt (b = 0.9) and add more of them. The reputation the challenger needs to see stays high for longer than the defender can supply it, so probing starts at once. Fences moved a short distance at a time fit this pattern.',
    set: { m: 'C', C: { ...C_DEFAULTS, N: 25, b: 0.9 }, case: 'georgia' } },
  { title: 'Without doubt, deterrence unravels',
    body: 'Remove all uncertainty about the defender. The weak defender gives way on the last slice, so resisting the one before it buys nothing, and the logic runs back to the first slice. Every slice is taken. Small doubts carry the whole deterrent.',
    set: { m: 'C', C: { ...C_DEFAULTS, p0: 0 } } },
];

export function createTour(root, apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.appendChild(card);
  const show = () => {
    const s = STEPS[i];
    apply(s.set);
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus();
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
