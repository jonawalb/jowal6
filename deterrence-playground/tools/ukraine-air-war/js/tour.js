// Guided walkthrough: fixed view states with short explanations. Numbers come from the dataset
// (version noted in data/attacks.js) and are Ukrainian Air Force claims.
const ALL = ['shahed', 'drone', 'cruise', 'ballistic', 'sam', 'mixed', 'other'];
const STEPS = [
  { title: 'Every bar is a week of reports',
    body: 'Each bar stacks what the Ukrainian Air Force said Russia launched that week, by weapon type. Orange is Shahed-type drones. Click any bar to read the week in the side panel.',
    set: { range: 'all', res: 'week', groups: ALL, metric: 'l', sel: null } },
  { title: 'From missiles to mass drones',
    body: 'Switch off drones and the missile war looks roughly flat from year to year. The growth since mid-2024 is almost all Shahed-type drones.',
    set: { range: 'all', res: 'month', groups: ['cruise', 'ballistic', 'sam', 'mixed'], metric: 'l', sel: null } },
  { title: 'The largest single attack',
    body: 'The biggest report in the data began on 6 September 2025: 823 drones and missiles in one overnight attack, by the Air Force count. The salvo list ranks every attack by size.',
    set: { range: 'y25', res: 'day', groups: ALL, metric: 'l', sel: '2025-09-06' } },
  { title: 'Read the interception rate with care',
    body: 'From mid-2024 to July 2025 the Air Force reported many drones as "lost" rather than shot down; the dataset lists jamming, decoys, radar loss and crashes as reasons. Turn "count lost drones as stopped" off and the Shahed rate falls to around 55 percent in that window. From August 2025 the dataset records almost no lost drones, so part of the jump is a change in how the reports count.',
    set: { range: 'all', res: 'week', groups: ALL, metric: 'l', lost: false, sel: null } },
  { title: 'Ballistic missiles get through more often',
    body: 'This view shows what was not reported stopped. Among missiles, ballistic missiles were stopped least often: in 2025 about 3 in 4 were not reported stopped, against under 3 in 10 cruise missiles.',
    set: { range: 'y25', res: 'month', groups: ['cruise', 'ballistic'], metric: 'thru', lost: true, sel: null } },
  { title: 'When attacks begin',
    body: 'The grid at the bottom counts weapons by weekday and the start hour the report gives. In 2026 most drone reports start at 18:00 and cover the night that follows, so the grid shows reporting windows as much as launch times.',
    set: { range: 'y26', res: 'week', groups: ALL, metric: 'l', lost: true, sel: null, focus: 'clock' } },
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
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= STEPS.length) stop(); else { i = n; show(); } }; });
    card.querySelector('.solid').focus();
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
