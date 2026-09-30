// Guided walkthrough: fixed states with short explanations (pattern from strait-layers/js/tour.js).
export const STEPS = [
  { title: 'Three attacks, three shapes',
    body: 'Each bar is one of Iran\'s direct attacks on Israel. April 2024 mixed drones, cruise missiles and ballistic missiles. October 2024 was ballistic missiles only. June 2025 was far larger in both. The black whisker is the spread between sources.',
    set: { ep: 'apr24' } },
  { title: 'April 2024: most of it never arrived',
    body: 'The IDF said 99 percent was intercepted. A U.S. intelligence estimate held that as many as half the weapons failed on their own, and U.S., British, French and Jordanian aircraft downed many drones far from Israel. At least seven to nine missiles still landed.',
    set: { ep: 'apr24' } },
  { title: 'October 2024: a harder test',
    body: 'About 180 to 200 ballistic missiles and no drones or cruise missiles. Official statements said the attack failed; satellite and video analysis found dozens of impacts at air bases. The disagreement box lists both.',
    set: { ep: 'oct24' } },
  { title: 'June 2025: a campaign, not a raid',
    body: 'About 550 ballistic missiles and 1,000 drones over twelve days. Estimates of how many got through run from 31 to 63, and leakage grew as the war went on. Twenty-eight people were killed in Israel.',
    set: { ep: 'jun25' } },
  { title: 'A coalition defense',
    body: 'Israel did not defend alone. The table marks each country and system a source reports in action. In June 2025 U.S. THAAD batteries may have fired between 36 and more than 150 interceptors, depending on the source.',
    set: { ep: 'jun25' } },
  { title: 'The cost exchange',
    body: 'The panel prices the interceptors against Iran\'s weapons with cited unit costs. For June 2025 it starts from JINSA\'s estimated counts. Move the sliders: every count you add beyond a reported one is marked notional.',
    set: { ep: 'jun25' } },
];

export function createTour(root, apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.prepend(card);
  const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
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
    card.querySelector('.solid').focus({ preventScroll: true });
  };
  const start = () => { i = 0; card.hidden = false; show(); card.scrollIntoView({ block: 'nearest', behavior: motion() }); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
