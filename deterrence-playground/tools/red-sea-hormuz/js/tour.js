// Guided walkthrough: fixed states with short explanations (pattern from strait-layers/js/tour.js).
// Each step names a preset and optional state overrides; app.js resets everything else to defaults.
export const STEPS = [
  { title: 'Three chokepoints, one route',
    body: 'Ships between Asia and Europe pass Bab el-Mandeb, cross the Red Sea and use the Suez Canal. Gulf oil and gas leave through the Strait of Hormuz. Each chart counts ships a day at one chokepoint, estimated by the IMF\'s PortWatch from ship-tracking (AIS) data.',
    set: { preset: 'redsea', state: { date: '2023-10-01' } } },
  { title: 'November 2023: the Galaxy Leader',
    body: 'The Houthis seized the car carrier Galaxy Leader on 19 November 2023 and began a campaign of missile and drone attacks on shipping. Watch the Bab el-Mandeb line fall away over the following weeks as carriers paused Red Sea voyages.',
    set: { preset: 'redsea', state: { date: '2023-11-19', ev: 'galaxy-leader' } } },
  { title: 'The detour around Africa',
    body: 'Traffic did not vanish. It went around the Cape of Good Hope. Turn on the Cape row: its line rises as the Suez and Bab el-Mandeb lines fall. The comparison table puts numbers on the shift between 2023 and 2024.',
    set: { preset: 'redsea', state: { date: '2024-06-01', cape: true } } },
  { title: 'Strikes and escorts did not bring ships back',
    body: 'Operation Prosperity Guardian, U.S. and UK strikes from January 2024, the EU\'s Aspides mission and a U.S. air campaign in 2025 all appear on the timeline. None returned Bab el-Mandeb to its 2023 level. Pauses in the attacks show up as small recoveries at most.',
    set: { preset: 'redsea', state: { from: '2023-01-01', date: '2025-05-06' } } },
  { title: 'Hormuz in 2026',
    body: 'Hormuz traffic held up through the June 2025 war. In 2026 it collapsed. Choose the 2026 comparison to see the fall. PortWatch counts ships by AIS; ships that switch off their transponders are missed, so near-zero counts can understate real traffic.',
    set: { preset: 'hormuz26' } },
  { title: 'Mines outlast the fighting',
    body: 'Jonathan Walberg\'s commentary on the 2026 mine clearance makes the point this chart shows: a handful of mines kept commercial traffic away for months, and insurers did not return when the military declared the lanes clear.',
    set: { preset: 'clearance' } },
];

export function createTour(root, apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.prepend(card);
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
  const start = () => { i = 0; card.hidden = false; show(); card.scrollIntoView({ block: 'nearest' }); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop, active: () => i >= 0 };
}
