// Guided walkthrough. Figures quoted here were computed with js/model.js under the default assumptions
// (see scripts/model.test.mjs) and the shares in data/chain.js.
const STEPS = [
  { title: 'Mine to magnet',
    body: 'Rare earths show the pattern. China mined 69% of the world’s rare earths in 2025 (USGS), separated 85% (IEA) and made 92% of NdFeB magnets (DOE, 2020 data). Concentration rises as the material moves downstream.',
    set: { m: 'ree', s: 'none' } },
  { title: 'The narrowest stage binds',
    body: 'Suppose China withholds rare earths at every stage. Magnets bind: 8% of world magnet output is made elsewhere. Two months of inventory cover the start; the red area is what is left uncovered. With the default 20% of new capacity, supply reaches only about 28% of the old flow by year ten. That number rests on assumptions: open Assumptions in the side panel and move them.',
    set: { m: 'ree', s: 'ree-ban', month: 12 } },
  { title: 'Whose supply?',
    body: 'The world-pool view treats every buyer as sharing world output. Switch to U.S. direct imports: USGS puts U.S. import reliance at 67% and China at 71% of imports of rare-earth compounds and metals, so about half of U.S. supply is directly exposed. This is a lower bound: imports from Malaysia, Japan and Estonia carry material from China.',
    set: { m: 'ree', s: 'ree-ban', b: 'us', month: 12 } },
  { title: 'A stockpile buys time, not capacity',
    body: 'A release equal to six months of use pushes the first shortfall from month 2 to month 8, then the curve looks the same. Public data do not say how much the National Defense Stockpile holds: inventories have not been reported since 2023.',
    set: { m: 'ree', s: 'ree-stock', month: 6 } },
  { title: 'Idle plants matter for gallium',
    body: 'China produced 99% of primary gallium. USGS lists 100 tonnes of idle capacity in Germany, Hungary, Kazakhstan, Korea and Ukraine, plus spare plant in Japan and Russia: about 12% of world output if restarted. Here they restart after 12 months, an assumption.',
    set: { m: 'ga', s: 'ga-ban', month: 30 } },
  { title: 'An announced measure: the DRC cobalt quota',
    body: 'The DRC capped cobalt exports at up to 96,600 tonnes a year for 2026 and 2027, against 230,000 tonnes mined in 2025. That withholds about 58% of DRC output, or 42% of world mine supply, for two years. Here the gap opens after two months of stocks and closes when the quota ends.',
    set: { m: 'co', s: 'co-quota', month: 12 } },
  { title: 'Sources behind every scenario',
    body: 'The cards below quote where each mineral goes in defense systems, from GAO, USGS and the IEA. The timeline lists every Chinese and DRC measure, linked to the official announcement where one could be opened. Some October 2025 Chinese measures are suspended until November 2026.',
    set: { m: 'co', s: 'co-quota', focus: 'use-card' } },
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
    const { focus, ...set } = s.set;
    apply(set);
    if (focus) document.getElementById(focus)?.scrollIntoView({ block: 'nearest' });
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
