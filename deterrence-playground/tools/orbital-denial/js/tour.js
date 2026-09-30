// Guided walkthrough: points at parts of the page in turn. It explains; it does not play for you.
const STEPS = [
  { sel: '#bar', title: 'Ten months, two powers',
    body: 'Blue (you) and Red are notional powers. Months 1 to 3 are a crisis, months 4 to 10 a war. Space support is how much of each side\'s satellite service still works, weighted by mission. The side with more support over the war wins it.' },
  { sel: '#orbit', title: 'Four shells, shared by everyone',
    body: 'Your constellations sit on the left, Red\'s on the right: reconnaissance in low LEO, communications in high LEO, navigation in MEO and early warning in GEO. Grey speckle is debris. Both sides and a notional crowd of other satellites fly through the same shells.' },
  { sel: '#acts-rev', title: 'Reversible attacks wear off',
    body: 'Jamming, dazzling and cyber attacks cut a mission for a month or two, then it comes back. They must be repeated, and backups blunt them. The Secure World Foundation finds that only non-destructive means like these are being used against satellites in current wars.' },
  { sel: '#acts-kin', title: 'Destructive attacks are permanent',
    body: 'A missile destroys a satellite and makes a debris cloud sized by NASA\'s breakup model: on the order of the 2007 and 2021 tests. In low LEO the air drags it down within a year or two. In high LEO it stays for generations.' },
  { sel: '#tgts', title: 'Early warning is entangled',
    body: 'Red\'s early-warning satellites also serve its nuclear command. Attacking them helps you in a conventional war, but Red may read it as preparation for a nuclear strike. Any attack on them multiplies the escalation risk.' },
  { sel: '#end', title: 'End the month',
    body: 'Red moves at the same time, answering what you did last month in line with a posture you cannot see. The log explains every roll, and the outlook shows what your debris will cost over 25 years.' },
  { sel: '#outlook', title: 'Then the review',
    body: 'After month 10 the review replays your months with every destructive attack swapped for a reversible one, on the same dice, and then runs 1,000 replays of both.' },
];

export function createTour(card) {
  let i = -1, lit = null;
  const light = el => { lit?.classList.remove('od-hl'); lit = el; el?.classList.add('od-hl'); };
  const stop = () => { card.hidden = true; i = -1; light(null); };
  const show = () => {
    const s = STEPS[i], target = document.querySelector(s.sel);
    light(target);
    target?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Start playing' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= STEPS.length) stop(); else { i = n; show(); } }; });
    card.querySelector('.btn.solid').focus({ preventScroll: true });
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start: () => { i = 0; card.hidden = false; show(); }, stop };
}
