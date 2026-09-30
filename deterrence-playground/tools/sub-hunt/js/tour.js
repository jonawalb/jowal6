// Walkthrough: five cards that point at parts of the page in turn. It opens by itself on a first visit
// (remembered in this browser only) and from the Walkthrough button. It explains; it does not play.
import { GAME, ACTIONS } from '../data/params.js';

const A = ACTIONS;
const STEPS = [
  { sel: '#box', title: 'The glow is where the sub could be',
    body: `A report ${GAME.reportAge} hours old put a submarine inside the dashed ring. Brighter orange means more likely. Each turn the glow spreads, because the sub keeps moving. Most subs are heading south for a gap into the Atlantic; one kind circles a marked patrol point (P1 or P2).` },
  { sel: '#meter-effort', title: `You get ${GAME.effort} effort points a turn`,
    body: `Spend them on as many actions as they cover, then press End turn: two hours pass. Unspent points carry over, up to ${GAME.bank}, so you can save up for a big turn. Buoys (${GAME.buoyLoads} patterns) and attacks (${GAME.torpedoes}) must last the whole hunt.` },
  { sel: '#tools', title: 'Wide and blurry, or narrow and sharp',
    body: `The aircraft box (${A.air.cost}) and buoy lines (${A.line.cost}) cover a lot of water but place a contact only roughly. A helicopter dip (${A.helo.cost}) covers a small spot near your ship but pins the sub to ±2 nm. Moving the ship is free, and its towed array hears bearings. Queue several, undo any, then End turn.` },
  { sel: '#beh-card', title: 'Learn how it moves',
    body: 'The sub follows one of four habits: it sprints and drifts, zig-zags to a gap, hides from your ship and helicopter, or loiters. Sprints are loud, so every sensor hears them better. This panel shows the map\'s odds on each habit; they sharpen as you gather contacts.' },
  { sel: '#meter', title: 'Pounce when the odds are high',
    body: `Best attack odds is the chance your map gives the single best ${GAME.prosR} nm ring. Choose Attack and click there; it strikes when you press End turn, before the sub moves. A miss rules that ring out, but a sub nearby hears it and bolts. After the hunt, a review replays the sub's true track against your searches.` },
];

export function createTour(card) {
  let i = -1, lit = null;
  const light = el => { lit?.classList.remove('sh-hl'); lit = el; el?.classList.add('sh-hl'); };
  const stop = () => { if (card.hidden) return; card.hidden = true; i = -1; light(null); };
  const show = () => {
    const s = STEPS[i], target = document.querySelector(s.sel);
    light(target);
    target?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Start hunting' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= STEPS.length) stop(); else { i = n; show(); } }; });
    card.querySelector('.btn.solid').focus({ preventScroll: true });
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) { e.stopPropagation(); stop(); } }, true);
  return { start: () => { i = 0; card.hidden = false; show(); }, stop, get open() { return !card.hidden; } };
}
