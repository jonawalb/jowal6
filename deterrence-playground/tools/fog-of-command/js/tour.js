// Guided walkthrough: four steps pointing at parts of the page. It explains; it does not play for you.
const STEPS = [
  { sel: '#box', title: 'The valley',
    body: 'Red enters from the north and wants Tarn Crossing. Your side is always at the bottom of the screen: when you attack, the board is turned around. Blue holds the main line and keeps a reserve behind it. You see enemy units only in your own sectors and the ones next door; your recon also reports movement further out. Diamonds are enemy units you have seen; "?" is movement.' },
  { sel: '#units', title: 'Give orders',
    body: 'Pick a unit (or press its number), then click the sector it should go to. Orders start now or next hour, as the bar says. "Give ground" makes a unit fall back one sector when a stronger enemy attacks it: good bait, if something strong waits behind.' },
  { sel: '#units .fc-arty', title: 'Artillery and recon',
    body: 'Your battery sits fixed in the bottom-right corner of the map. Press A or click it, then click a sector to fire. The damage report comes back at once and is right 9 times in 10. If one of your recon troops is next to the target, it watches the fall of shot: you see exactly what is there and how hurt it is, and decoys are exposed. A recon troop inside the target may be hit.' },
  { sel: '#end', title: 'End the hour',
    body: 'Units move, fights happen where both sides meet, and new reports arrive on the right. Hit a defender from a second direction and its defense counts for nothing. After 22:00, or when the crossing falls, the review shows what you saw against what was true.' },
];

export function createTour(card) {
  let i = -1, lit = null;
  const light = el => { lit?.classList.remove('fc-hl'); lit = el; el?.classList.add('fc-hl'); };
  const stop = () => { card.hidden = true; i = -1; light(null); };
  const show = () => {
    const s = STEPS[i], target = document.querySelector(s.sel);
    light(target);
    target?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} of ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Play' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= STEPS.length) stop(); else { i = n; show(); } }; });
    card.querySelector('.btn.solid').focus({ preventScroll: true });
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start: () => { i = 0; card.hidden = false; show(); }, stop, get open() { return !card.hidden; } };
}
