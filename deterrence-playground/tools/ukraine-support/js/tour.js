// Guided walkthrough: fixed view states with short explanations. Figures come from the Kiel Ukraine Support
// Tracker, release 30 (data to 30 June 2026), as aggregated in data/aid.js.
const ALLT = ['mil', 'hum', 'fin'], ALLG = ['eu', 'eur', 'oth', 'inst'];
const base = { measure: 'b', types: ALLT, groups: ALLG, scale: 'eur', period: 'all', tl: 'month', donor: null, month: null, euc: false };
const STEPS = [
  { title: 'Two numbers for every donor',
    body: 'Kiel counts commitments (pledges and agreements announcing future aid) and allocations (aid delivered or set aside for a specific purpose). The filled bar is allocations, the outline is commitments. Across all donors, Kiel records €374 billion allocated and €549 billion committed from January 2022 to June 2026.',
    set: {} },
  { title: 'The United States allocated the most',
    body: 'Kiel records €115 billion allocated by the United States, most of it military. EU institutions follow: the Commission and Council have allocated €92 billion, mostly financial aid, against €188 billion committed (€95 billion and €191 billion with the European Investment Bank, which this tool lists separately).',
    set: { donor: 'United States' } },
  { title: 'US allocations stop in early 2025',
    body: 'The timeline shows US aid by month. The last new US allocation in this release is dated January 2025, and the last US commitment November 2024.',
    set: { donor: 'United States', tl: 'month' } },
  { title: 'European allocations rose in 2025',
    body: 'With the United States switched off, European allocations rise. The tracker records €73 billion allocated by European governments and EU institutions in 2025, against €44 billion in 2024. US allocations in 2025 come to €0.5 billion, all dated January.',
    set: { groups: ['eu', 'eur', 'inst'], period: '2025' } },
  { title: 'Commitments come in large steps',
    body: 'The cumulative view shows commitments rising in jumps. The largest single month is April 2026, when Kiel records the EU\'s €90 billion Ukraine Support Loan as a commitment. The shaded band is what had been committed but not yet allocated.',
    set: { tl: 'cum', month: '2026-04' } },
  { title: 'Relative to the size of the economy',
    body: 'Measured against 2021 GDP, small neighbours lead. Denmark has allocated 3.46 percent of its 2021 GDP, Estonia 3.06 percent and Lithuania 2.86 percent. The United States comes to 0.59 percent. EU institutions have no GDP and drop out of this view.',
    set: { scale: 'gdp', measure: 'a', groups: ['eu', 'eur', 'oth'] } },
  { title: 'Military aid alone',
    body: 'Switch off humanitarian and financial aid to rank military allocations. The United States (€65 billion) leads, then Germany (€25 billion) and the United Kingdom (€16 billion). Germany has committed €42 billion in military aid, well above what it has allocated so far.',
    set: { types: ['mil'] } },
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
    apply({ ...base, ...s.set });
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
