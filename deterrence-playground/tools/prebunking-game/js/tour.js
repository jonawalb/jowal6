// Guided walkthrough. Each step can put a preview on screen (show) and highlights a target element.
// Previews use example answers and never touch the player's own answers.

export const STEPS = [
  { title: 'Every round is one number', show: 'p1', target: 'ev',
    body: 'A yes/no question about an invented town, a base rate and one report. The report’s strength is stated plainly, for example “2× as likely if it is real.” Those two lines are the only evidence in the round.' },
  { title: 'Everything else carries no evidence', show: 'p1', target: 'chan',
    body: 'Around the evidence sits something that can move a feeling: a comment thread in a panic, a low drone, an unrelated scare read a moment earlier, a grievance, a countdown. None of it changes the answer.' },
  { title: 'You set a belief, the game reads a weight', show: 'p1', target: 'answer',
    body: 'From your answer the game works out λ̂, the weight you put on the report. λ = 1 is the Bayesian weight. The form, posterior odds = prior odds × LR^λ, is from Walberg’s working papers on emotional updating.' },
  { title: 'The mirror', show: 'mirror', target: 'rcard',
    body: 'After Part 1 each loaded round is drawn against its neutral twin, which had the same numbers. These are example answers, not yours. A gap between a filled and an open dot is the pull of the feeling.' },
  { title: 'Part 2: feel it, name it, place it', show: 'p2', target: 'check',
    body: 'Before each answer you tap a valence × arousal grid, pick a word for the feeling and say what produced it. The slider unlocks after that. Two of the pulls in Part 2 are new, to test whether the habit transfers.' },
  { title: 'Progress and sound', show: null, target: 'panel',
    body: 'The panel tracks your rounds. The soundtrack round plays a synthesized drone only if you turn sound on here. Nothing you enter leaves your browser.' },
  { title: 'What this is and is not', show: null, target: 'method', scroll: true,
    body: 'A teaching and research prototype, with no efficacy data. The method notes say what comes from published studies, what comes from Walberg’s working papers and what is this game’s own invention.' },
];

export function createTour(root, { show, restore }) {
  let i = -1, lastTarget = null;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.appendChild(card);
  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  const mark = id => {
    if (lastTarget) lastTarget.classList.remove('tour-on');
    const el = id === 'chan' ? document.querySelector('.chan') : document.getElementById(id);
    lastTarget = el;
    if (el) {
      el.classList.add('tour-on');
      el.scrollIntoView({ behavior: smooth(), block: 'center' });
    }
  };
  const render = () => {
    const s = STEPS[i];
    if (s.show !== undefined) show(s.show);
    mark(s.target);
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; render(); }
    });
    card.querySelector('.solid').focus({ preventScroll: true });
  };
  const start = () => { i = 0; card.hidden = false; render(); };
  function stop() {
    if (i < 0) return;
    card.hidden = true; i = -1;
    if (lastTarget) lastTarget.classList.remove('tour-on');
    lastTarget = null;
    restore();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop, active: () => i >= 0 };
}
