// Guided walkthrough: fixed view states with short explanations.
export const STEPS = [
  { title: 'Coercion without concession',
    body: 'In 2020 Beijing restricted a string of Australian exports after Canberra called for an inquiry into the origins of COVID-19. Walberg’s case study argues the measures did real damage but won no policy change. This chart shows barley: exports to China in red, everything else in blue.',
    set: { view: 'au', product: 'barley', year: '2021', unit: 'usd' } },
  { title: 'Barley found other buyers',
    body: 'Barley sales to China stopped in mid-2020, and total barley exports still rose in 2021 and 2022. The bars below the chart show where it went. The paper notes those sales came at lower margins.',
    set: { view: 'au', product: 'barley', year: '2022', unit: 'usd' } },
  { title: 'Wine did not',
    body: 'Wine is the other extreme. China took close to 40% of Australian wine exports by value in 2019. When the duties hit, no other market absorbed it, and total wine exports fell. Trade came back only after the duties ended in March 2024.',
    set: { view: 'au', product: 'wine', year: '2022', unit: 'usd' } },
  { title: 'Watch prices as well as volumes',
    body: 'Coal exports by value soared in 2022 even without China. Switch to tonnes and the picture is plainer: other buyers more than replaced the lost tonnage in 2021 and made up most of it in 2022, and the value jump was mostly price. The readout shows the unit value.',
    set: { view: 'au', product: 'coal', year: '2022', unit: 't' } },
  { title: 'The one Beijing spared',
    body: 'Beijing left iron ore alone. The paper argues China could not easily replace it, and its earnings cushioned the whole Australian economy while targeted sectors took losses.',
    set: { view: 'au', product: 'ironore', year: '2021', unit: 'usd' } },
  { title: 'South Korea, 2017',
    body: 'Here the instrument was informal: after Lotte gave up land for the THAAD battery, Beijing’s tourism administration told agencies to stop selling South Korea tours from 15 March 2017. Monthly arrivals from China fell by about two-thirds from April 2017, against the same months of 2016, while arrivals from Japan held steady.',
    set: { view: 'kr', month: '201704' } },
  { title: 'Pain without reversal',
    body: 'Chinese arrivals fell from about 8.07 million in 2016 to 4.17 million in 2017. Seoul offered the symbolic “Three No’s,” and the battery stayed. Walberg calls it a tactical win for Beijing that damaged its standing in South Korea.',
    set: { view: 'kr', month: '201712' } },
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
