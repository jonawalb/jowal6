// Guided briefing: fixed scenario states with short explanations. Numbers quoted in the text are checked
// against the model in scripts/model.test.mjs.
export const STEPS = [
  { title: 'Where AI chips come from',
    body: 'Taiwan held 69 percent of the world\'s sub-10nm logic capacity in 2022, and all of TSMC\'s advanced packaging fabs (five in its list, plus AP7 in Chiayi) are in Taiwan. With no blockade, world deliveries run at about 237,000 accelerators a week.',
    set: { scen: 'energy', dur: 120, policy: 'chips', protect: true, day: 0 } },
  { title: 'An energy blockade hits the grid first',
    body: 'Stop the fuel tankers. Gas stocks run out around day 10 and the grid falls to about half of normal. If Taiwan protects its fabs, they keep full power until the coal runs out in week six.',
    set: { scen: 'energy', dur: 120, policy: 'chips', protect: true, day: 20 } },
  { title: 'Then the fabs throttle',
    body: 'Once coal is gone, the grid holds under a fifth of normal. Even with priority, the leading-edge block gets about half its power. Rotating cuts and restarts lose more. Watch the Taiwan chart drop after the coal cliff.',
    set: { scen: 'energy', dur: 120, policy: 'chips', protect: true, day: 50 } },
  { title: 'Rationing is a political choice',
    body: 'Put households first and the chip sector gets a little over a third of its power once the gas is gone. Priority within the sector still covers the leading edge, but after the coal cliff it gets nothing. The deliveries missed in the readouts are about three times the "protect chips" case.',
    set: { scen: 'energy', dur: 120, policy: 'households', protect: true, day: 20 } },
  { title: 'A full blockade also traps the chips',
    body: 'Close the airspace too and finished chips cannot leave, so world deliveries fall within days of the stock abroad running out, whatever the grid does. The buffer outside Taiwan is the only cushion.',
    set: { scen: 'full', dur: 120, policy: 'chips', protect: true, day: 45 } },
  { title: 'Alternatives are slow',
    body: 'Arizona already makes leading-edge wafers, but they come back to Taiwan for packaging. Samsung and Intel would need ported designs. In this run the alternatives reach about 6 percent of normal output by day 240, against a shortfall of about 80 percent.',
    set: { scen: 'full', dur: 240, policy: 'chips', protect: true, day: 239 } },
  { title: 'A quarantine is a different problem',
    body: 'A loose inspection regime that turns back a quarter of fuel cargo drains the gas slowly but leaves the fabs running if shippers keep sailing, which CSIS doubts. Now build your own scenario.',
    set: { scen: 'quarantine', dur: 90, policy: 'chips', protect: true, day: 60 } },
];

export function createTour(root, apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided briefing');
  root.appendChild(card);
  const show = () => {
    const s = STEPS[i];
    apply(s.set);
    card.innerHTML = `<div class="tour-h"><span>Briefing ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close briefing">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus();
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
