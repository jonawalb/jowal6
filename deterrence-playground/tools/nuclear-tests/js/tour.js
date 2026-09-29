// Guided walkthrough: fixed tool states with short explanations. Numbers are computed from the data at run time.
import { TESTS, SITES } from '../data/tests.js';
import { yearOf, fmt, dateText } from './common.js';

const count = f => TESTS.filter(f).length;
const site = id => SITES.findIndex(s => s.id === id);
const inYear = y => count(t => yearOf(t) === y);
const lastOf = f => TESTS.filter(f).reduce((a, t) => (t[0] > a ? t[0] : a), 0);

export const STEPS = [
  { title: 'From one test to dozens a year',
    body: () => `The United States tested at Trinity in July 1945 and the Soviet Union followed in August 1949. By 1958, the busiest year before the 1958–61 moratorium, the record shows ${inYear(1958)} tests. Drag across the chart or use the slider to move through time.`,
    set: { year: 1958 } },
  { title: '1962: the peak year',
    body: () => `${inYear(1962)} tests in a single year, ${count(t => yearOf(t) === 1962 && t[2] !== 1)} of them above ground, under water or in space. The Soviet Union resumed testing in September 1961 and the United States followed. The Partial Test Ban Treaty was signed the next August.`,
    set: { year: 1962, ms: 'ptbt' } },
  { title: 'The ban moved testing underground',
    body: () => `Stack the bars by environment and the color flips after 1963. Of all ${fmt(TESTS.length)} tests, ${fmt(count(t => t[2] === 1))} were underground. The treaty did not stop testing: the U.S. and Soviet programs kept going below ground for almost three decades.`,
    set: { year: 1964, by: 'env', ms: 'ptbt' } },
  { title: 'France and China kept testing in the air',
    body: () => `Switch off underground tests and the post-1963 bars that remain belong to states outside the treaty. France's last atmospheric test in this record is dated ${dateText(lastOf(t => t[1] === 3 && t[2] === 0))}; China's is ${dateText(lastOf(t => t[1] === 4 && t[2] === 0))}.`,
    set: { year: 1980, env: [0, 2, 3] } },
  { title: 'Where the tests happened',
    body: () => `The map sizes each named test site by the number of tests through the selected year. Nevada and Semipalatinsk dominate: ${fmt(count(t => t[4] === site('nts')))} and ${fmt(count(t => t[4] === site('semipalatinsk')))} tests. Click a site for its record by state, environment and the largest published yields.`,
    set: { year: 2026, site: 'nts', scroll: 'map-card' } },
  { title: 'Moratoria, then a treaty',
    body: () => 'The Soviet Union stopped in 1990, the United Kingdom in 1991 and the United States in 1992. France and China finished short final series in 1996, the year the Comprehensive Nuclear-Test-Ban Treaty opened for signature. The treaty is still not in force.',
    set: { year: 1996, ms: 'ctbt' } },
  { title: 'Only three states have tested since',
    body: () => `India and Pakistan tested in May 1998. North Korea has tested six times, most recently on ${dateText(lastOf(t => t[1] === 7))}. It is the only state to have tested this century.`,
    set: { year: 2017, st: [5, 6, 7], ms: 'dprk17' } },
  { title: 'Talk of testing again',
    body: () => 'Russia withdrew its ratification of the treaty in 2023, and in 2025 the U.S. and Russian presidents each ordered preparations related to testing. Read the milestone cards for the exact wording, and the section below the map on how the U.S. maintains its weapons without explosive tests.',
    set: { year: 2026, ms: 'latest', scroll: 'steward' } },
];

export function createTour(apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'nt-tour'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Walkthrough');
  document.body.appendChild(card);
  const stop = () => { card.hidden = true; i = -1; };
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
