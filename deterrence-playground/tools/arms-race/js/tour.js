// Guided walkthrough (pattern from tools/crisis-stability/js/tour.js). Each step names a preset and any
// overrides; everything else returns to the tool's defaults.
import { PRESETS2, PRESETS3 } from '../data/presets.js';

const P = (k, extra = {}) => ({ preset: k, ...PRESETS2.find(p => p.k === k).p, ...extra });
const P3 = k => ({ mode: 'three', p3: PRESETS3.find(p => p.k === k).k });

export const STEPS = [
  { title: 'Two equations',
    body: 'Each side\'s arms grow with the other side\'s arms (reaction k and l), shrink with the burden of its own (fatigue a and b), and carry a constant push (grievance g and h). The arrows show where the race heads from every point. Four races start from four corners; all four end at the same point.',
    set: P('stable') },
  { title: 'One comparison decides it',
    body: 'Compare fatigue, ab, with reaction, kl. Here ab = 0.25 and kl = 0.09, so the equilibrium is stable. Click anywhere on the plane: every new race comes to rest at the same balance. Try raising both reaction sliders past 0.5 and watch the headline flip.',
    set: P('stable') },
  { title: 'A runaway race',
    body: 'Swap the numbers: reaction 0.5, fatigue 0.3. Now kl exceeds ab. With grievances on both sides the equilibrium sits at negative arms, where no race can reach it, and every race grows without limit. This is the case Richardson feared: an arms race that feeds itself.',
    set: P('runaway') },
  { title: 'The knife edge',
    body: 'Keep the strong reactions but replace grievance with goodwill. The equilibrium moves into view but it is a saddle. Races that start above the dashed line run away; races below it collapse toward disarmament. Where you start decides where you end.',
    set: P('knife', { starts: [[12, 5], [5, 12], [14, 18], [22, 14], [8, 8]] }) },
  { title: 'Real stockpiles',
    body: 'Switch on the overlay: the solid path is the U.S. and Soviet/Russian stockpile, 1945–2026, in thousands of warheads, with decades marked. The dashed path is what Richardson\'s equations produce when fitted to the years you choose. The fit is loose and some signs come out wrong, which is itself a finding: warhead counts answered to treaties and technology as much as to the rival.',
    set: P('stable', { overlay: true, starts: [], y0: 1950, y1: 1986 }) },
  { title: 'Three sides',
    body: 'Add China. Each pair on its own is stable, yet the trio is not: each side now reacts to two rivals, and the sum of those reactions outruns fatigue. This is an extension with notional coefficients, starting from the latest real stockpiles. It illustrates a general point from the literature, not a forecast.',
    set: P3('trio-unstable') },
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
    apply(JSON.parse(JSON.stringify(s.set)));
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus({ preventScroll: true });
    card.scrollIntoView({ block: 'nearest' });
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
