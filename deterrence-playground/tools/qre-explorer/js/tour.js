// Guided walkthrough: fixed states with short explanations. Numbers quoted are computed by this tool
// from its notional default payoffs.

export const STEPS = [
  { title: 'Pure noise at λ ≈ 0',
    body: 'This is Signorino’s (1999) crisis game. State 1 fights or not; State 2 answers; if only State 2 fights, State 1 chooses again. At λ = 0.01 every choice is a coin flip, so war is about 38% likely even though neither side wants it.',
    set: { g: 'sig', lu: -2 } },
  { title: 'Some precision, more war',
    body: 'At λ = 2 war is more likely still, about 57%. Each state now responds to the other’s noisy play: State 2 fights often because State 1 often fights, and the reverse. Precision does not move behavior straight toward Nash.',
    set: { g: 'sig', lu: Math.log10(2) } },
  { title: 'High precision: the subgame perfect outcome',
    body: 'At λ = 10 the status quo holds 98.5% of the time, close to the subgame perfect equilibrium in the ∞ column. Drag across the chart to watch the whole path. Try giving State 1 three times State 2’s capability.',
    set: { g: 'sig', lu: 1 } },
  { title: 'Audience costs in a deterrence game',
    body: 'A challenges, B resists or concedes, and A then fights or backs down. With a large audience cost (ā = −2) a resisted challenger fights, so in Nash play A never challenges. At λ = 1, A still challenges 35% of the time. Set ā to −0.5 and the backing-down outcome grows.',
    set: { g: 'det', lu: 0 } },
  { title: 'A game with several equilibria',
    body: 'In the standoff both sides choose at once. Past λ ≈ 2.5 two new branches appear, so three equilibria coexist. The bold principal branch starts at 50/50 and ends where the challenger escalates and the defender, whose clash cost is higher, backs down.',
    set: { g: 'chk', lu: 0.6 } },
  { title: 'Flip the costs, flip the selection',
    body: 'Give the challenger the higher clash cost (2.6 against 2.0). The principal branch now ends with the challenger backing down. The same Nash equilibria exist; the logit path picks a different one.',
    set: { g: 'chk', lu: 0.6, cc: 2.6, cd: 2 } },
  { title: 'Why estimation needs care',
    body: 'Below, 300 standoffs are simulated at λ* = 5 from an equilibrium off the principal branch. MLE on the principal branch runs to the edge of its search. The traditional MLE depends on where its solver starts: from a 50% guess it stops at about 2.6, where new equilibria appear, roughly half the truth. Move the starting guess and its estimate moves. PL, NPL and CMLE land within about 8% of the truth.',
    set: { g: 'chk', lu: 0.7 }, scroll: 'est-card' },
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
