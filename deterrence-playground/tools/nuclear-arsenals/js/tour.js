// Guided walkthrough: fixed chart states with short explanations. Numbers are read from the data at run time.
import { COUNTRIES, WORLD, Y0 } from '../data/stockpiles.js';
import { fmt } from './common.js';

const v = (iso, y) => COUNTRIES.find(c => c.iso === iso).v[y - Y0];
const ALL = COUNTRIES.map(c => c.iso);

export const STEPS = [
  { title: 'One bomb, then thousands',
    body: () => `The United States had ${v('USA', 1945)} warheads at the end of 1945 in this series; the first Soviet warhead appears in 1949. By 1960 the two held ${fmt(v('USA', 1960) + v('RUS', 1960))} between them. Drag across the chart or use the slider to move through time.`,
    set: { year: 1960, view: 'stack', log: false, on: ALL, msId: null, page: 'USA' } },
  { title: 'The U.S. peak came first',
    body: () => `The U.S. stockpile peaked in 1967 at ${fmt(v('USA', 1967))}. SALT I (1972) limited missiles, not warheads, and the Soviet stockpile kept climbing until its 1986 peak.`,
    set: { year: 1967, view: 'lines', log: false, on: ['USA', 'RUS'], msId: 'salt1', page: 'USA' } },
  { title: 'The global peak: 1986',
    body: () => `The global total reached ${fmt(Math.max(...WORLD))} in 1986, when the Soviet stockpile alone was ${fmt(v('RUS', 1986))}. The INF Treaty was signed a year later.`,
    set: { year: 1986, view: 'stack', log: false, on: ALL, msId: 'inf', page: 'RUS' } },
  { title: 'Most of the fall came in the 1990s',
    body: () => `Between 1986 and 2000 the global total fell from ${fmt(WORLD[1986 - Y0])} to ${fmt(WORLD[2000 - Y0])}. FAS notes that "the overwhelming portion of the reduction happened in the 1990s", after START I and the end of the Soviet Union.`,
    set: { year: 2000, view: 'stack', log: false, on: ALL, msId: 'start1', page: 'RUS' } },
  { title: 'Small arsenals need a log scale',
    body: () => `On a linear chart the other seven arsenals are a sliver. On a log scale you can see China grow from ${fmt(v('CHN', 2010))} warheads in 2010 to ${fmt(v('CHN', 2026))} in 2026, and India, Pakistan and North Korea rise from zero.`,
    set: { year: 2026, view: 'lines', log: true, on: ['GBR', 'FRA', 'CHN', 'ISR', 'IND', 'PAK', 'PRK'], msId: null, page: 'CHN' } },
  { title: 'Without a treaty',
    body: () => 'New START expired on February 5, 2026. Russia offered to keep its central limits for a year if Washington did the same; the Kremlin says no official response came. FAS says military stockpiles are rising again even as retired warheads are dismantled.',
    set: { year: 2026, view: 'stack', log: false, on: ALL, msId: 'nsexpiry', page: 'USA' } },
  { title: 'Then versus now, country by country',
    body: () => 'Under the chart, compare any year with 2026, and open a country page for its peak, its 2026 split into deployed, reserve and retired warheads, and the FAS notes behind the estimate.',
    set: { year: 1986, view: 'stack', log: false, on: ALL, msId: null, page: 'CHN', scroll: true } },
];

export function createTour(apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'na-tour'; card.hidden = true;
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
    card.querySelector('.solid').focus();
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start: () => { i = 0; card.hidden = false; show(); }, stop };
}
