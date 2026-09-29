// Prebunking Game: guided walkthrough. Each step loads a fixed view with made-up example answers;
// closing the walkthrough restores the player's own game.
// Example answers in display order (ORDER in data/quiz.js): man, neu, man, man, neu, man, man, neu, man.
const DEMO_A = [5, 6, 4, 5, 6, 4, 3, 5, 3];
const DEMO_B = [2, 6, 2, 3, 6, 2, 1, 5, 2];
const DEMO_C = [1, 2, 0, 1, 0, 2];

const STEPS = [
  { title: 'Four short stages',
    body: 'A pre-test, a training round on six manipulation techniques, a post-test with different posts, and your results. It takes about five minutes.',
    set: { s: 'intro' } },
  { title: 'Rate before you learn',
    body: 'Each post is invented and labelled as such. Rate how much you would trust it, from 1 to 7. Six of the nine posts use a technique; three are plain notices.',
    set: { s: 'pre', qi: 0, a: Array(9).fill(null) } },
  { title: 'Play the manipulator',
    body: 'In training you run a fictional page. For each technique, pick the post a manipulator would publish. The honest post loses followers; the blatant one loses credibility.',
    set: { s: 'learn', t: 0, c: Array(6).fill(null) } },
  { title: 'See the tells',
    body: 'After you pick, the manipulative post shows its tells in highlight, with the technique’s definition from the research paper and a short list of things to look for.',
    set: { s: 'learn', t: 0, c: [1, null, null, null, null, null] } },
  { title: 'Your score: sharper, or just warier?',
    body: 'These are example answers. Results compare trust in manipulative posts with trust in plain ones. Distrusting everything is not the goal: the discernment line rewards keeping trust in plain posts.',
    set: { s: 'done', o: 0, a: DEMO_A, b: DEMO_B, c: DEMO_C } },
  { title: 'What the studies found',
    body: 'Published effects for the original Bad News game sit in a separate card, quoted exactly, with the caveats the literature states. They describe a different, longer game, not your score.',
    set: { s: 'done', o: 0, a: DEMO_A, b: DEMO_B, c: DEMO_C, focus: 'research' } },
];

export function createTour(root, { apply, save, restore }) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.prepend(card);
  const show = () => {
    const s = STEPS[i];
    apply(s.set);
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= STEPS.length) stop(); else { i = n; show(); } }; });
    card.querySelector('.solid').focus({ preventScroll: true });
  };
  const start = () => { if (i < 0) save(); i = 0; card.hidden = false; show(); };
  const stop = () => { if (i < 0) return; card.hidden = true; i = -1; restore(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop, active: () => i >= 0 };
}
