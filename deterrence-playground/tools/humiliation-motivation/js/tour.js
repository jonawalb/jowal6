// Guided walkthrough for Humiliation to Motivation. Each step loads values on top of the defaults and explains one result.
export const STEPS = [
  { title: 'A humiliated state chooses',
    body: 'A public humiliation has happened. The humiliated state H either accommodates or challenges; if it challenges, the dominant power D concedes or resists. H knows whether it is the capable type or the weak one. D does not.',
    set: {} },
  { title: 'Backing down has a domestic price',
    body: 'Accommodating costs H α = α<sub>0</sub>s(1 − λ): more after a severe humiliation, less when citizens see the order as legitimate. The paper treats this as an audience cost imposed from outside, not one the leader chose.',
    set: {} },
  { title: 'Moderate humiliation separates',
    body: 'At s = 0.35 only the capable type finds challenging worth it. A challenge reveals the challenger’s type, so D knows what it faces (Proposition 1).',
    set: { s: 0.35 } },
  { title: 'Severe humiliation springs the trap',
    body: 'Push s past s̄. Now accommodating costs more than a likely losing fight, so the weak type challenges too. D faces a mix of genuine threats and desperate gestures and cannot tell them apart (Proposition 2).',
    set: { s: 0.8 } },
  { title: 'Mild humiliation is absorbed',
    body: 'Drop s below s̲. Accommodating is cheap, and even the capable type accepts its diminished status (Proposition 3).',
    set: { s: 0.08 } },
  { title: 'Legitimacy moves the thresholds',
    body: 'Keep s = 0.8 and raise λ to 0.7. Both thresholds shift right on the map, and the same humiliation now produces separation. A perfectly legitimate order would never trap anyone (Proposition 4).',
    set: { s: 0.8, lam: 0.7 } },
  { title: 'The information curve',
    body: 'A challenge carries information only between s̲ and s̄. Below, nobody challenges; above, everybody does. The bottom figure plots this non-monotonic pattern (Proposition 5). The cards below place the paper’s cases on the map.',
    set: { s: 0.35 }, focus: 'fig-info' },
];

export function createTour(root, apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tour'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Guided walkthrough');
  root.appendChild(card);
  const show = () => {
    const s = STEPS[i];
    apply(s, `Walkthrough step ${i + 1}: ${s.title}`);
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus();
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}

