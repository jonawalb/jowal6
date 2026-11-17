// Guided walkthrough. Percentages quoted are computed by this tool's notional model (scripts/correction-lab.test.mjs
// checks every one). Each step names the element it scrolls to and highlights; `full` steps show Full detail for the
// step only. The reader's own settings and detail mode come back when the walkthrough ends or is closed.

export const STEPS = [
  { title: 'A weak correction',
    body: 'A false story has spread. A different source corrects it after a delay, restates the myth and offers no alternative account, the weaker side of every contrast. In this notional model about 51% of the 200 people who took in the myth still believe it. Filled dots still believe; open dots revised.',
    set: {}, scroll: 'hero-card' },
  { title: 'The average correction',
    body: 'Set every meta-analytic lever to zero (κ, the lever strength, = 0) and the model returns 31%. That anchor comes from Chan et al. (2017): persistence d = 0.97 against a misinformation effect of d = 3.08 (d is a standardized effect size). Walter and Tukachinsky’s estimate of the same contrast is much smaller (r = −.05, about d = 0.10), so treat 31% as a high-end anchor.',
    set: { k: 0 }, scroll: 'panel', full: true },
  { title: 'Better design',
    body: 'Correct immediately, from the myth’s own source (the tool’s stand-in for an in-group voice), with an alternative explanation, without restating the myth. Each choice follows a contrast in Walter and Tukachinsky’s meta-analysis. Persistence falls to about 19%. The waterfall shows what each choice bought. (Restating made no significant difference in the meta-analysis, and Ecker et al. advise restating the myth once, with a warning.)',
    set: { tm: 'i', src: 'i', alt: 1, rs: 0 }, scroll: 'wf-card' },
  { title: 'Repetition before the correction',
    body: 'Let the audience hear the myth three times first. Walter and Tukachinsky report that each added repetition strengthens continued influence (b = −.30, from eight effect sizes, unit unstated). With the weak correction, persistence rises to about 88%. Read this as an upper bound.',
    set: { rep: 3 }, scroll: 'wf-card' },
  { title: 'Emotion and the Sticky Affect condition',
    body: 'Now the audience is frightened and angry (E = 3). The same well-designed correction leaves about 54% believing, up from 19%. This is Walberg’s Sticky Affect condition at work: emotion lowers the weight on accuracy, α, so identity carries more of the decision. It is a theoretical claim, not a meta-analytic finding.',
    set: { tm: 'i', src: 'i', alt: 1, rs: 0, e: 3 }, scroll: 'sweep-card' },
  { title: 'Switch the theory off',
    body: 'Turn Sticky Affect off and emotion stops mattering, which is roughly what the meta-analyses show: Walter and Tukachinsky found no difference between negative and neutral misinformation. The gap between the two lines in the emotion chart is the part of the prediction that rests on the theory alone.',
    set: { tm: 'i', src: 'i', alt: 1, rs: 0, e: 3, sa: 0 }, scroll: 'sweep-card' },
  { title: 'Identity raises the bar',
    body: 'Make the claim central to the audience’s identity. With high emotion and a strong identity stake, even the best-designed correction leaves about 72% believing. The histogram shows why: most people’s bars now sit above α(E)·evidence, the correction’s weighted strength.',
    set: { tm: 'i', src: 'i', alt: 1, rs: 0, e: 3, id: 2 }, scroll: 'thresh-card', full: true },
];

/**
 * hooks: apply(set) applies a step's settings; save() returns the reader's state; restore(saved) puts it back;
 * detail(full) shows Full detail for a step without persisting; detailRestore() returns to the reader's mode.
 */
export function createTour(root, hooks) {
  let i = -1, saved = null, lit = null, opener = null;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.appendChild(card);
  const unlight = () => { if (lit) lit.classList.remove('tour-hl'); lit = null; };
  const show = () => {
    const s = STEPS[i];
    hooks.detail(!!s.full);
    hooks.apply(s.set);
    unlight();
    const target = document.getElementById(s.scroll || 'hero-card');
    if (target) {
      target.classList.add('tour-hl'); lit = target;
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
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
  };
  const start = () => { opener = document.activeElement; saved = hooks.save(); i = 0; card.hidden = false; show(); };
  const stop = () => {
    if (card.hidden) return;
    card.hidden = true; i = -1; unlight();
    hooks.detailRestore();
    if (saved) hooks.restore(saved);
    saved = null;
    if (opener && opener.focus) opener.focus();
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop, get active() { return !card.hidden; } };
}
