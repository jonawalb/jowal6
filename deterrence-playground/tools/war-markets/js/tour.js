// Guided walkthrough: fixed view states with short explanations.
export const STEPS = [
  { title: 'A price is not a forecast',
    body: 'Each line is the price of a Polymarket share that pays $1 if the event happens by the deadline. Traders often read 20¢ as a 20% chance. It is a market price set by whoever chose to trade, and in thin markets one trade can move it.',
    set: { case: 'ukraine', focus: '2243897' } },
  { title: 'A ladder of deadlines',
    body: 'Contracts on the same question with later deadlines cost more, and each one slides toward zero as its deadline passes quietly. The August ceasefire contract ended at zero; the later ones are still open.',
    set: { case: 'ukraine', focus: '2602052' } },
  { title: 'Before the strikes on Iran',
    body: 'In January and February 2026 traders priced a US or Israeli strike on Iran by each deadline. The January contracts expired worthless. The February 28 contract jumped to Yes on the day of the strikes. Dots at the top are dated events from Walberg’s event list.',
    set: { case: 'strike', focus: '1198479' } },
  { title: 'Settled by the fine print',
    body: 'Ceasefire contracts turned on definitions. “Effective ceasefire” required 14 straight days without a qualifying US strike on Iran, so the July 31 contract settled Yes only on 11 August, after its deadline date. Open the resolution rule in the panel to see what counted.',
    set: { case: 'ceasefire', focus: '2937525' } },
  { title: 'What did not happen',
    body: 'Some contracts priced events that never came, such as an Iranian invasion of Kuwait. Prices a week out were already low, and these contracts expired worthless.',
    set: { case: 'kuwait', focus: '2995866' } },
  { title: 'Priced vs happened',
    body: 'The strip below the chart places every resolved contract at its price a week before the outcome was settled. A market that saw events coming would put what happened on the right and what did not on the left.',
    set: { case: 'blockade', focus: '2643405', score: true } },
];

export function createTour(root, apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.appendChild(card);
  const show = () => {
    const s = STEPS[i];
    apply(s.set);
    card.innerHTML = `<div class="tour-h"><span>Step ${i + 1} of ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
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
