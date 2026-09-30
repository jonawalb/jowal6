// Guided walkthrough: points at parts of the page in turn. It explains; it does not play for you.
const STEPS = [
  { sel: '#box', title: 'The haze is your belief',
    body: 'The shaded map shows where the hidden submarine could be. It starts as the opening cue ring and spreads every hour, because the sub keeps moving and you do not know which way.' },
  { sel: '#rules-sec', title: 'The sub follows rules you can read',
    body: 'Pick how the sub behaves: transit toward one of three gaps, loiter, or evade you. Each hour it rolls to sprint. Sprinting covers more water but makes far more noise.' },
  { sel: '#controls', title: 'Spend a small budget',
    body: 'Sonobuoy fields and aircraft sweeps cost points; the towed-array ship is free but slow. Place them where the haze is thick, then advance the clock.' },
  { sel: '#math-sec', title: 'Search theory from 1946',
    body: 'Detection chances come from Koopman\'s random search formula and lateral range curves. The numbers are notional; the formulas are the classics.' },
  { sel: '#read', title: 'Silence is information',
    body: 'When a sensor hears nothing, the map drains probability out of the area it covered. That is Bayes\' rule, the same logic used to find the Scorpion and Air France 447.' },
  { sel: '#log', title: 'Contacts lie',
    body: 'Some contacts are real and some are noise. Clues arrive at hours 6, 15 and 24 with stated reliability. The map weighs each one; you decide how far to trust it.' },
  { sel: '.sh-prosbtn', title: 'One shot',
    body: 'When you think you have it, prosecute. You see your map\'s odds before you commit. Afterwards the reveal shows the true track over your search.' },
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
