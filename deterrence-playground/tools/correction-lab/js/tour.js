// Guided walkthrough. Percentages quoted are computed by this tool's notional model.

export const STEPS = [
  { title: 'A typical correction',
    body: 'A false story has spread. An outside fact-checker corrects it after a delay, restates the myth and offers no alternative account. In this model about 51% of the 200 people who took in the myth still believe it. Filled dots still believe; open dots revised.',
    set: {} },
  { title: 'The average correction',
    body: 'Set every meta-analytic lever to zero (κ = 0) and the model returns 31%. That anchor comes from Chan et al. (2017): persistence d = 0.97 against a misinformation effect of d = 3.08. Walter and Tukachinsky (2020) likewise find that correction “does not entirely eliminate the effect of misinformation.”',
    set: { k: 0 } },
  { title: 'Better design',
    body: 'Correct immediately, from inside the group, with an alternative explanation, without restating the myth. Each choice follows a contrast in Walter and Tukachinsky’s meta-analysis. Persistence falls to about 19%. The waterfall shows what each choice bought.',
    set: { tm: 'i', src: 'i', alt: 1, rs: 0 } },
  { title: 'Repetition before the correction',
    body: 'Let the audience hear the myth three times first. Walter and Tukachinsky report that each added repetition strengthens continued influence (b = −.30). With the typical correction, persistence rises to about 88%.',
    set: { rep: 3 } },
  { title: 'Emotion and the Sticky Affect condition',
    body: 'Now the audience is frightened and angry (E = 3). The same well-designed correction leaves about 54% believing, up from 19%. This is Walberg’s Sticky Affect condition at work: emotion lowers the weight on accuracy, so identity carries more of the decision. It is a theoretical claim, not a meta-analytic finding.',
    set: { tm: 'i', src: 'i', alt: 1, rs: 0, e: 3 } },
  { title: 'Switch the theory off',
    body: 'Turn Sticky Affect off and emotion stops mattering, which is roughly what the meta-analyses show: Walter and Tukachinsky found no difference between negative and neutral misinformation. The gap between the two lines in the emotion chart is the part of the prediction that rests on the theory alone.',
    set: { tm: 'i', src: 'i', alt: 1, rs: 0, e: 3, sa: 0 } },
  { title: 'Identity raises the bar',
    body: 'Make the claim central to the audience’s identity. With high emotion and a strong identity stake, even the best-designed correction leaves about 72% believing. The histogram shows why: most people’s bars now sit above α(E)·evidence.',
    set: { tm: 'i', src: 'i', alt: 1, rs: 0, e: 3, id: 2 } },
];

export function createTour(root, apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.appendChild(card);
  const show = () => {
    const s = STEPS[i];
    apply(s.set);
    const target = document.getElementById(s.scroll || 'stage-top');
    if (target) target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
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
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
