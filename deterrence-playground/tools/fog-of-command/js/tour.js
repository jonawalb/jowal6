// Guided walkthrough: points at parts of the page in turn. It explains; it does not play for you.
const STEPS = [
  { sel: '#box', title: 'The valley, and what you can see of it',
    body: 'Red comes from the north down one of three roads. Your three mechanized battalions hold the line, your recon squadron is forward in Center Gap, and your armored reserve waits at Tarn Crossing. Red diamonds are reports, not Red units. Faded ones are old.' },
  { sel: '#units', title: 'Look first: task the drone',
    body: 'Press Drone, then click a sector. The drone looks there for one hour and reports quickly, but when it names a unit type, decoys fool it about half the time. Your recon squadron watches its own sector and the ones next to it.' },
  { sel: '#picture', title: 'Your picture is an estimate',
    body: 'These bars add up what the reports say is on each road. Missed units are missing from it, decoys can inflate it, and everything in it is an hour or two old.' },
  { sel: '#reports', title: 'Read the reports',
    body: 'Each report says who saw what, where, when it was seen and how sure the sender is, in Sherman Kent\'s words: almost certain, probable, or chances about even.' },
  { sel: '#units', title: 'Act: send orders',
    body: 'Pick a unit (keys 1–5), then click a sector. The order takes 0–2 hours to arrive, then the unit moves. The reserve takes 2 hours to reach Alder Woods or Kestrel Hills, 1 hour to Millfield. Commit it too early and you may guess wrong; too late and it arrives after the line breaks.' },
  { sel: '#end', title: 'End the hour',
    body: 'Red moves, units in the same sector fight, and new reports start their trip to you. After 22:00, or if the crossing falls, the review shows what you believed against what was true, and what perfect information would have been worth.' },
];

export function createTour(card) {
  let i = -1, lit = null;
  const light = el => { lit?.classList.remove('fc-hl'); lit = el; el?.classList.add('fc-hl'); };
  const stop = () => { card.hidden = true; i = -1; light(null); };
  const show = () => {
    const s = STEPS[i], target = document.querySelector(s.sel);
    light(target);
    target?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Start' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= STEPS.length) stop(); else { i = n; show(); } }; });
    card.querySelector('.btn.solid').focus({ preventScroll: true });
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start: () => { i = 0; card.hidden = false; show(); }, stop };
}
