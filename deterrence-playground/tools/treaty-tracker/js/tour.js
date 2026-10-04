// Guided walkthrough: fixed tool states with short explanations drawn from the records in the data.
export const STEPS = [
  { title: 'Who is bound, year by year',
    body: 'Each row is a state and each column a treaty. The colour shows the state\'s standing at the end of the chosen year: party, signed only, suspended, withdrawn and so on. Click any cell for its dates and the depositary record behind them.',
    set: { year: 2026, sel: 'npt.IND', tsel: 'npt' } },
  { title: 'The nuclear-armed states',
    body: 'Filter to the nine nuclear-armed states. India, Israel and Pakistan never joined the NPT. No nuclear-armed state has joined the TPNW. At 2026, Russia\'s CTBT cell shows its ratification revoked and North Korea\'s NPT cell a withdrawal it announced in 2003, whose legal status parties still dispute.',
    set: { year: 2026, preset: 'nuclear', sel: 'ctbt.RUS', tsel: 'ctbt' } },
  { title: 'Go back to 1990',
    body: 'Move the year to 1990. The NPT had far fewer parties, China and France were outside it, and the CWC, CTBT and TPNW had not been opened. The chart in the panel tracks how many states were bound by the selected treaty each year.',
    set: { year: 1990, preset: 'nuclear', sel: 'npt.CHN', tsel: 'npt' } },
  { title: 'The U.S.–Russian treaties ran out',
    body: 'INF ended when the U.S. withdrawal took effect on 2 August 2019. Russia suspended New START in February 2023 and the treaty expired on 5 February 2026. No bilateral limit on U.S. and Russian strategic forces remains.',
    set: { year: 2026, preset: 'nuclear', groups: ['usrus'], sel: 'newstart.RUS', tsel: 'newstart' } },
  { title: 'Europe\'s conventional arms treaty unravels',
    body: 'Russia suspended the CFE Treaty from 12 December 2007 and withdrew on 7 November 2023. Most other parties then notified suspensions; Armenia, Azerbaijan and Ukraine have none on record. Open Skies lost the United States in 2020 and Russia in 2021.',
    set: { year: 2024, preset: 'cfe', groups: ['europe'], sel: 'cfe.RUS', tsel: 'cfe' } },
  { title: 'The timeline of exits',
    body: 'Each marker is a withdrawal, suspension, revocation or expiry, dated from depositary records or official statements. Click one to read the passage and jump the matrix to that year.',
    set: { year: 2023, ev: 'ctbt-rus-law', scroll: 'timeline-card' } },
  { title: 'Compare two states',
    body: 'Pick any two states to see where their commitments differ. The United States and Russia now share few treaties in force; try India and Pakistan, or Germany and Austria.',
    set: { year: 2026, cmp: ['USA', 'RUS'], scroll: 'compare-card' } },
];

export function createTour(apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tt-tour'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Walkthrough');
  document.body.appendChild(card);
  const stop = () => { const had = card.contains(document.activeElement); card.hidden = true; i = -1; if (had) document.getElementById('start-tour')?.focus(); };
  const show = () => {
    const s = STEPS[i];
    apply(s.set);
    card.innerHTML = `<div class="th"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
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
