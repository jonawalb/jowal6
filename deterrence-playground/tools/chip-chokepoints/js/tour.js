// Guided walkthrough. Figures quoted here were computed with js/model.js under the default notional
// assumptions (asserted in scripts/model.test.mjs) and the shares in data/chain.js.
const STEPS = [
  { title: 'A chain of chokepoints',
    body: 'Each bar is one stage of the AI accelerator chain. Some are held by one country: ASML in the Netherlands makes every EUV scanner, Tokyo Electron makes 92.6% of resist tracks (ETO, 2025), and U.S. firms held 96% of EDA software (CSET, 2019 data). Select any stage for firm shares, China’s position and the controls aimed at it.',
    set: { s: 'none', sel: 'euv' } },
  { title: 'Cut the sole supplier',
    body: 'Suppose the Netherlands stopped EUV shipments and service to everyone. Installed scanners run for the notional nine-month buffer, then EUV output, and every accelerator that needs it, goes to zero. In the fast case a substitute arrives by year five; in the slow case not within ten years. Both times are assumptions, not estimates.',
    set: { s: 'nl-euv', sel: 'euv', month: 24 } },
  { title: 'Taiwan binds at the fab',
    body: 'Remove Taiwan-located output: 69% of logic capacity below 10 nm and 28% of assembly and test (SIA/BCG, 2022). After two to three months of inventory, the fab stage binds and at most 31% of output can still be made until new capacity is built elsewhere. Advanced packaging in Taiwan is not modelled, so this understates the shock.',
    set: { s: 'tw', sel: 'foundry', month: 12 } },
  { title: 'Memory is a second chokepoint',
    body: 'SK hynix and Samsung held 79% of HBM revenue in 3Q 2025 (Counterpoint). Lose Korean HBM and accelerator output falls to the 21% Micron can supply, after two months of inventory.',
    set: { s: 'kr-hbm', sel: 'hbm', month: 12 } },
  { title: 'Counter-controls with unknown reach',
    body: 'China produces 99% of primary gallium (USGS) and refines 85% of rare earths (IEA). How much accelerator output depends on them is not public, so the pass-through is a slider. At the notional 10% the loss peaks near 10%; set it to 100% to see the upper bound.',
    set: { s: 'cn-min', sel: 'ga', month: 12 } },
  { title: 'The rules behind each node',
    body: 'The timeline lists U.S., allied and Chinese measures from October 2022 to November 2026, each linked to the Federal Register or the official announcement, with its status today. Filter it by country or by stage; the overlay badges on the chain show the same counts.',
    set: { s: 'none', sel: 'accel', focus: 'ctl-card' } },
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
