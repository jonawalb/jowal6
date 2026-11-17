// Guided walkthrough: the same four steps as the "Presenting this in 3 minutes" panel. Each step sets the page state,
// scrolls to its target and outlines it. The tour never saves the Simple/Full mode, and when it ends or is closed it
// puts back the reader's own filters, view and mode (snapshot/restore come from app.js).
import { getDetail, setDetail } from './detail.js';

export const STEPS = [
  { title: 'Most echoes are media echoing media',
    body: 'All dated passage matches, split by the kind of source on each side. The bottom-right tile is the largest: 89% run from media in one country to media in another (each passage counts as the person speaking, so journalists\u2019 questions and foreign leaders\u2019 words are not the publishing government\u2019s), mostly the same news carried by several English-language state services.',
    target: 'view-paths' },
  { title: 'Officials repeating officials is rarer',
    body: 'Only clusters with official text from two or more countries. Play builds the network month by month; pink links are new that month. Many of these are joint statements or readouts of the same meeting, so read the members before calling it coordination.',
    target: 'view-network' },
  { title: 'One framing, item by item',
    body: 'The framing that reached the most countries with official text: India\u2019s, Belarus\u2019s and Pakistan\u2019s own speeches at the January 2024 Non-Aligned Movement summit in Kampala, matched on their openings. Each is that government\u2019s speech; the shared wording is summit protocol, not copying. The network replays it day by day; the dossier lists every item with a link to the original.',
    target: 'view-network', phoneTarget: 'nc-dossier',
    phoneBody: 'The framing that reached the most countries with official text, opened in its dossier: India\u2019s, Belarus\u2019s and Pakistan\u2019s own speeches at the January 2024 Non-Aligned Movement summit in Kampala. Each is that government\u2019s speech; the shared wording is summit protocol. Play the spread replays it on the network day by day.' },
  { title: 'Who comes first, and why to be careful',
    body: 'Net lead: blue cells mean the row country usually appears first, red the column country. The text under the matrix names the largest net leads; with all types the first is Russia before Taiwan (+84). Full detail is on for this step, so the coverage strip is further down. "First" means first in this corpus. Check the coverage strip (Full detail) for both countries before reading a lead as influence.',
    target: 'view-matrix' },
];

export function createTour(apply, snapshot, restore) {
  let i = -1, saved = null, hl = null;
  const card = document.createElement('div');
  card.className = 'nc-tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  document.body.append(card);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = () => {
    const s = STEPS[i], phone = matchMedia('(max-width: 640px)').matches;
    apply(i);
    if (hl) hl.classList.remove('nc-tour-hl');
    hl = document.getElementById(phone && s.phoneTarget ? s.phoneTarget : s.target);
    if (hl) { hl.classList.add('nc-tour-hl'); hl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }
    card.innerHTML = `<div class="nc-tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${phone && s.phoneBody ? s.phoneBody : s.body}</p>
      <div class="nc-tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= STEPS.length) stop(); else { i = n; show(); } }; });
    card.querySelector('.solid').focus({ preventScroll: true });
  };
  const start = () => { if (i < 0) saved = { state: snapshot(), mode: getDetail() }; i = 0; card.hidden = false; show(); };
  const stop = () => {
    if (i < 0) return;
    card.hidden = true; i = -1;
    if (hl) { hl.classList.remove('nc-tour-hl'); hl = null; }
    if (saved) { setDetail(saved.mode, false); restore(saved.state); saved = null; }
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop, active: () => i >= 0 };
}
