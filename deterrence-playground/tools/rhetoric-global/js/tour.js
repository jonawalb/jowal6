// Guided walkthrough: fixed view states with short explanations. Step content is written against
// the built corpus (see data/corpus.js); each `set` is a state patch for app.js apply().
import { COUNTRIES, weekOf } from './model.js';

const k = (cc, id) => COUNTRIES[cc].phrases.findIndex(p => p.id === id);
const at = (cc, id, date) => (k(cc, id) >= 0 ? { k: k(cc, id), w: weekOf(date) } : null);

export const STEPS = () => [
  { title: 'Rows are phrases, columns are weeks',
    body: 'Each row is a recurring formula from the official record, grouped by category. Each column is one week. Darker means the phrase took up more of that week\'s official text. Labels above the grid mark key events.',
    set: { cc: 'ru', rangeKey: 'war', metric: 'rate', cat: 'all', sel: null } },
  { title: 'February 2022: a new vocabulary',
    body: 'In his 24 February 2022 address Putin announced a "special military operation" and said Russia would "seek to demilitarise and denazify Ukraine". After that he rarely uses the word himself. The panel shows the sentences, with a link to each Kremlin transcript.',
    set: { cc: 'ru', rangeKey: 'all', metric: 'rate', cat: 'all', sel: at('ru', 'denazi', '2022-02-24') } },
  { title: 'Nuclear language comes in bursts',
    body: 'Nuclear terms cluster around set pieces: the February 2023 address that suspended Russia\'s participation in New START, the September 2024 meeting on updating nuclear deterrence policy, and the November 2024 statement on the Oreshnik strike. The category menu shows only those rows.',
    set: { cc: 'ru', rangeKey: 'war', metric: 'rate', cat: 'Nuclear', sel: at('ru', 'newsys', '2024-11-21') } },
  { title: 'Share of statements',
    body: 'Switch the measure to share of statements to ask a different question: how many of the week\'s transcripts used the phrase at all, however briefly. Long set-piece speeches weigh less in this view.',
    set: { cc: 'ru', rangeKey: 'war', metric: 'share', cat: 'all', sel: null } },
  { title: 'Iran\'s Foreign Ministry',
    body: 'Switch country. The Iranian Foreign Ministry\'s statements track the region: Gaza after October 2023, the June 2025 war, the European move to restore UN sanctions ("snapback") in August and September 2025, and the U.S. and Israeli strikes from February 2026.',
    set: { cc: 'ir', rangeKey: 'all', metric: 'rate', cat: 'all', sel: at('ir', 'snapback', '2025-08-25') } },
  { title: 'Compare the shared themes',
    body: 'Below the heatmap, the same patterns run on both corpora. Hover a chart to read both countries\' monthly rates. The corpora are different kinds of text, so read the shapes, not small gaps.',
    set: { cc: 'ir', rangeKey: 'war', metric: 'rate', cat: 'all' }, scroll: 'compare' },
];

export function createTour(root, apply) {
  let i = -1, steps = [];
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.appendChild(card);
  const show = () => {
    const s = steps[i];
    apply(s.set);
    if (s.scroll) document.getElementById(s.scroll)?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${steps.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === steps.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= steps.length) stop(); else { i = n; show(); } }; });
    card.querySelector('.solid').focus({ preventScroll: true });
  };
  const start = () => { steps = STEPS(); i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
