// Guided walkthrough: fixed view states with short explanations.
export const STEPS = [
  { title: 'A price, not a forecast',
    body: 'Each line is the price of a Polymarket share that pays $1 if the event happens by the deadline. A 4¢ price means the last traders swapped the share for 4 cents. It is a market price set by whoever chose to trade, not a forecast from analysts or intelligence services.',
    set: { preset: 'open', focus: '567621' } },
  { title: 'The clock is priced in',
    body: 'Contracts on the same event with different deadlines stack up: the later the deadline, the higher the price. Each line slides toward zero as its deadline nears without an invasion, and resolved contracts end at zero.',
    set: { preset: 'ladder', focus: '956590' } },
  { title: 'Watch the volume strip',
    body: 'The bars under the chart show how many dollars changed hands each day in the focus market. On thin days one small trade can move the price several points. Treat those moves as noise until the volume says otherwise.',
    set: { markets: ['2382819', '604470'], focus: '2382819', win: ['2026-01-01', null] } },
  { title: 'Set it against the PLA record',
    body: 'The grey line is TSM’s count of PLA aircraft around Taiwan, as a 7-day mean. Shaded bands are major exercises. Here is Justice Mission-2025 at the end of December 2025. Hover the chart to compare prices and sorties on any day.',
    set: { markets: ['567621', '701290', '956590', '604470'], focus: '567621', win: ['2025-11-25', '2026-02-20'], show: { air: true, ex: true, jcrp: true } } },
  { title: 'Lead or lag?',
    body: 'The lower chart correlates day-over-day changes in aircraft activity with changes in the focus market’s price at different lags. Bars to the right would mean the market reacts after the PLA moves. Most bars sit inside the shaded noise band.',
    set: { preset: 'open', focus: '567621', xc: { diff: true, src: '7' } } },
  { title: 'Why changes, not levels',
    body: 'Switch to levels and correlations jump. Prices and sorties both drifted down over the year, so almost any lag looks related. This is the classic spurious correlation between trending series. Changes remove most of the shared drift.',
    set: { preset: 'open', focus: '567621', xc: { diff: false, src: '7' } } },
  { title: 'Every past contract resolved No',
    body: 'Each year’s invasion contract since 2023 closed at zero. The prices before that were never zero. Drag the window in the strip below the chart, or pick your own markets on the right.',
    set: { preset: 'yearly', focus: '520630', xc: { diff: true, src: '7' } } },
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
