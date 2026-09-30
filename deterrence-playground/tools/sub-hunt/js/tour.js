// Guided walkthrough: points at parts of the page in turn. It explains; it does not play for you.
const STEPS = [
  { sel: '#box', title: 'The glow is where the sub could be',
    body: 'Brighter orange means more likely. At hour 0 the glow fills the ring from the opening report. Each hour it spreads, because the sub keeps moving and you do not know which way.' },
  { sel: '#tools', title: 'Search: one tool per hour',
    body: 'Pick sonobuoys (they listen in a circle for 6 hours) or the patrol aircraft (it sweeps a big square for 2 hours), then click the map. You have 6 sonobuoy drops and 3 flights. Your towed-array ship is free and steers itself toward the brightest water.' },
  { sel: '#end', title: 'End the hour and watch the map',
    body: 'The sub moves, your sensors listen, and the map updates by Bayes\' rule. Hearing nothing is information: where you searched goes darker, and everywhere else gets a little brighter. The same idea guided the searches that found the Scorpion wreck in 1968 and the Air France 447 wreck in 2011.' },
  { sel: '#log', title: 'Read what happened',
    body: 'Each hour is summed up here in words. A contact pulls the odds toward it, but some contacts are noise. You only learn which after the hunt.' },
  { sel: '#meter', title: 'Attack when the odds look good',
    body: 'Best attack odds is the chance your map gives to the single best spot. When you are confident, press Attack and click that spot. You get one shot. Then the true track appears, and a slider replays the whole hunt.' },
];

export function createTour(card) {
  let i = -1, lit = null;
  const light = el => { lit?.classList.remove('sh-hl'); lit = el; el?.classList.add('sh-hl'); };
  const stop = () => { card.hidden = true; i = -1; light(null); };
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
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start: () => { i = 0; card.hidden = false; show(); }, stop };
}
