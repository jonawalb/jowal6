// Guided walkthrough: fixed view states with short explanations.
const STEPS = [
  { title: 'Nine states on one timeline',
    body: 'Each lane is a nuclear-armed state, plus NATO and multilateral steps. Circles are rhetoric, triangles tests and exercises, squares doctrine, diamonds arms control, crosses crisis moves. Larger marks sit higher on Kahn’s escalation ladder. Faint dots are the highest-threat official sentences from the rhetoric corpus.',
    set: { view: 'timeline' } },
  { title: 'Russia since 2022 carries most of the weight',
    body: 'The Russian lane holds an alert order, warheads in Belarus, a revised doctrine, the end of New START and three Oreshnik strikes. Click any mark: the panel shows the sources, the rule that set its rung, and the dyad it counts for.',
    set: { view: 'timeline', sel: 'rns:2022-02-putin-orders-deterrence-forc' } },
  { title: 'Where each pair stands now',
    body: 'The ladder view places each dyad at the highest rung of any placed item in the last 12 months. Every placement is set by a written rule, and the evidence list shows each item that counted.',
    set: { view: 'ladder', dyad: 'RUS-NATO' } },
  { title: 'India and Pakistan, May 2025',
    body: 'Move the date back to May 2025. Strikes on air bases put the dyad at rung 12, "large conventional war (or actions)", the highest any dyad has reached in the period. These steps are coded in Kahn’s Escalation Ladder from Indian government sources only.',
    set: { view: 'ladder', dyad: 'IND-PAK', asOf: '2025-05' } },
  { title: 'Rhetoric is context, not evidence of rung',
    body: 'The rhetoric view counts official sentences about nuclear weapons month by month and averages a tone model’s threat score. Event marks sit above the bars. Click a month to read the sentences; the model flags reassurances and reported threats too, which is why rhetoric never moves the ladder.',
    set: { view: 'rhet', rc: 'RU', rmonth: '2024-11' } },
  { title: 'Check the method',
    body: 'Method & sources lists every dataset, how it was checked, the dyad and rung rules, the corpus coverage and the tone model’s validation, the gaps, and every source link grouped by publisher.',
    set: { view: 'method' } },
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
