// Guided walkthrough: fixed tool states with short explanations. Quotes stay in the matrix and panel.
export const STEPS = [
  { title: 'Nine states, five kinds of promise',
    body: () => 'Each row is a nuclear-armed state and each column is one element of declared policy. A cell shows the latest official statement on record for the year you choose, or "Not declared" when no official text covers it. Click any cell to read the full quote and its source.',
    set: { sel: 'CHN.nfu' } },
  { title: 'Who pledges no first use',
    body: () => 'China\'s white papers pledge no first use "at any time and under any circumstances". India\'s 2003 doctrine promises retaliation only, but keeps the option of a nuclear answer to a major chemical or biological attack. North Korea\'s 2016 conditional pledge sits beside a 2022 law that allows use against attacks judged imminent. The U.S. reviewed the idea in 2022 and rejected it.',
    set: { els: ['nfu'], sel: 'IND.nfu' } },
  { title: 'Language moves over time',
    body: () => 'At 2020, Russia\'s conditions come from the June 2020 Basic Principles: conventional aggression "when the very existence of the state is in jeopardy". Drag the year to 2024 and the November Fundamentals replace that with a "critical threat" to sovereignty, extended to Belarus. The panel keeps both texts.',
    set: { asOf: 2020, sel: 'RUS.conditions', els: ['conditions', 'role'] } },
  { title: 'Deliberate silence counts too',
    body: () => 'Israel has never confirmed that it has nuclear weapons. Its row holds only the "not the first to introduce" formula, as recorded in U.S. government documents from 1965 and 1968. Pakistan has no published doctrine, so its row holds what its Foreign Office has said on the record. The tool leaves gaps empty and does not infer.',
    set: { states: ['ISR', 'PAK', 'PRK'], sel: 'ISR.nfu' } },
  { title: 'Compare two states side by side',
    body: () => 'Pick any two states below the timeline to read their statements element by element. India and Pakistan are a useful pair: one published a doctrine, the other describes its deterrent without one.',
    set: { cmp: ['IND', 'PAK'], scroll: 'compare-card' } },
  { title: 'The timeline of changes',
    body: () => 'Each marker is a dated document. Click one to jump the matrix to that year. Drag across the timeline to watch declared policy fill in, from the 1965 U.S.–Israel memorandum to Macron\'s speech of March 2026.',
    set: { asOf: 2026, scroll: 'timeline-card' } },
];

export function createTour(onClose, apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'dp-tour'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Walkthrough');
  document.body.appendChild(card);
  const stop = () => { const was = !card.hidden; card.hidden = true; i = -1; if (was) onClose(); };
  const show = () => {
    const s = STEPS[i];
    apply(s.set);
    card.innerHTML = `<div class="th"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body()}</p>
      <div class="tn"><button type="button" class="btn" data-d="-1" ${i === 0 ? 'disabled' : ''}>Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus({ preventScroll: true });
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start: () => { i = 0; card.hidden = false; show(); }, stop };
}
