// Guided walkthrough: fixed view states with short explanations. Adapted from Nuclear Signals Observatory.
const STEPS = [
  { title: 'Every number has a grade',
    body: 'Each bar is one published estimate. The colored letter says what kind of source carries it: A for the U.S. government, B for company filings, C for named analysts who state a method, D for press reports citing unnamed sources.',
    set: { view: 'est' } },
  { title: 'Switch off the weakest evidence',
    body: 'Here only grades A and B count, and official restatements of other sources stay off. Watch the shaded band and the readout: the range shrinks or vanishes where official and company figures are thin. Compare it with the all-grades range under the readout.',
    set: { view: 'est', grades: ['A', 'B'] } },
  { title: 'The listing record, rule by rule',
    body: 'Each bar is a Federal Register rule, counted from the rule’s own table. December 2024 added 136 PRC entries tied to chipmaking or military-civil fusion in one rule. Click a bar for the entities and the reason BIS gave.',
    set: { view: 'el' } },
  { title: 'Cases: allegations vs. convictions',
    body: 'DOJ and BIS cases on smuggling chips and tools. The status pill says where each case stands on the date checked. A charge is an allegation until a plea or verdict.',
    set: { view: 'cases' } },
  { title: 'One timeline',
    body: 'U.S. rules and licensing, other events (bills, PRC actions, company roadmaps), listings, cases and estimates on one axis. The estimate lane follows the grade filter you set.',
    set: { view: 'tl' } },
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
