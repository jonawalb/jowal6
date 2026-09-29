// Guided walkthrough for Hormuz Mine Clearance. Each step sets inputs (on top of the defaults) and a day.
export const STEPS = [
  { title: 'Two routes through the strait',
    body: 'The bands are two shipping routes, 100 nautical miles long and 2,000 yards wide, the geometry Eyer describes for reopening Hormuz: about 200 square miles. The red dots are mines no one has found yet. Gray specks are mine-like clutter that must each be checked.',
    set: {}, day: 0 },
  { title: 'Search, then identify',
    body: 'Uncrewed boats and ships drag sonar along the routes. Each pass finds most mines, so reaching 90 percent confidence takes two passes. Every contact the sonar finds must then be identified by divers or EOD teams. Press Play: the search finishes long before the divers do.',
    set: {}, day: 20 },
  { title: 'Clear is a probability',
    body: 'When the model declares the routes clear, it still expects some mines to be left. The chart shows the chance that one ship meets a live mine on one transit. It falls toward zero but never reaches it. That residual is what insurers price.',
    set: {}, day: 'end' },
  { title: 'More mines, more clutter',
    body: 'With 300 mines and more clutter on the seabed, the diver workload grows, and the finish moves out by months. Mines are cheap to lay and slow to clear.',
    set: { mines: 300, contactsPerNm2: 4, share: 60 }, day: 'end' },
  { title: 'Clearing under fire',
    body: 'Opposed clearance cuts working hours, wears down the force and lets the other side re-lay mines. With four new mines a week, these notional settings never finish. The 2026 clearance ran while a ceasefire held part of the time.',
    set: { threat: 'opposed', remineWeek: 4 }, day: 120 },
  { title: 'Compare 2026',
    body: 'The dashed line marks 138 days, from the destroyers entering the strait on 11 April 2026 to Adm. Cooper\'s 27 August statement. The model is not fitted to it. Change the forces and seabed to see which inputs could stretch a clearance to that length.',
    set: { usv: 8, ship: 4, helo: 4, eod: 16 }, day: 'end' },
];

export function createTour(apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'hm-tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  document.body.appendChild(card);
  const show = () => {
    const s = STEPS[i];
    apply(s);
    card.innerHTML = `<div class="th"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tn"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus({ preventScroll: true });
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
