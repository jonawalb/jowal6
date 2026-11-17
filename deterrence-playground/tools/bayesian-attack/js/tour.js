// Guided walkthrough: fixed states with short explanations.
import { DEFAULTS, KINDS } from './state.js';

const K = k => ({ ...DEFAULTS, kind: k, ...KINDS[k].preset });
export const STEPS = [
  { title: 'Every signal here is true',
    body: 'There is no threat (θ = 0) and every dot is an accurate signal. The teal line is a citizen who updates by Bayes’ rule. The orange line is the same citizen after a fear campaign that makes threatening news count 2.5 times as much. Same evidence, different conclusion: this is the paper’s Proposition 3, “correct information, distorted conclusion.” Every number here is notional.',
    set: { ...K('fear') }, card: 'card-a' },
  { title: 'Affect fades',
    body: 'Induced emotion decays. With a decay of 0.2 per signal (ρe) the fear weight drifts back toward 1 and the two citizens end closer together. A fabricated signal does not decay, which is the sender’s reason to consider fabrication.',
    set: { ...K('fear'), rhoE: 0.2 }, card: 'card-a' },
  { title: 'Make good news weightless',
    body: 'The paper reads inevitability messaging as an attack on the weight given to reassuring news. A worried citizen (μ0 = 1.5) sees accurate signals that the threat is low, but discounts each reassuring one to 15% of its weight. The undisturbed citizen calms down; the attacked one stays worried.',
    set: { ...K('trust') }, card: 'card-a' },
  { title: 'Anger makes people sure, not sensitive',
    body: 'Anger is a separate operator. It leaves the gain alone and multiplies confidence at every step, so the band collapses and the belief freezes near where the campaign found it. Later truth barely moves it.',
    set: { ...K('anger') }, card: 'card-a' },
  { title: 'When the attack beats fabrication',
    body: 'The paper’s Proposition 2. Each cell compares the sender’s best weighting attack with fabrication. Orange is where the weighting attack pays more. It wins where fabrication is expensive (low cost ratio r, on the left). Drag the point or use the arrow keys to read the payoffs.',
    set: { ...K('fear'), rho: 0.1, tau: 5, dE: 0, dT: 20 }, card: 'card-b' },
  { title: 'Decay: what is left of the advantage?',
    body: 'Set decay to 0.3. By the paper’s count the region shrinks by 19.6% (at T = 10), short of the collapse of at least 50% it had predicted; this browser rerun at T = 20 gives about a quarter. But look at the hatching: here every remaining cell is one where the sender’s best weighting move is no attack at all. The weighting attack “wins” only because fabrication does not pay either.',
    set: { ...K('fear'), dE: 0.3, dT: 20 }, card: 'card-b', see: 'card-b-leg' },
  { title: 'Fact-checking a captured citizen',
    body: 'The paper’s Proposition 4. When the weight on evidence has been pushed down to 0.2 (λg), disclosed truth is itself discounted and removes little of the distortion. Reassurance restores the weight first, then lets the truth work, given the paper’s assumption that each unit of budget closes 30% of the gap. Both leave most of the distortion. Teal cells are where reassurance wins.',
    set: { ...K('fear'), def: 'd', lg: 0.2, b: 5 }, card: 'card-c' },
  { title: 'Fear can be undone; anger mostly cannot',
    body: 'After the campaign, 80 truthful signals arrive. The fear-captured citizen moves a little over half way back on average. The anger-captured citizen does not move at all, because the model treats anger as multiplying confidence at every step. If anger works this way, the paper’s triage rule follows: treat anger and division campaigns as prevention problems, fear campaigns as correction problems.',
    set: { ...K('fear'), def: 'r', peak: 1 }, card: 'card-c' },
];

export function createTour(root, apply, hooks = {}) {
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
    document.querySelectorAll('.tour-hl').forEach(n => n.classList.remove('tour-hl'));
    const target = document.getElementById(s.card);
    target?.classList.add('tour-hl');
    if (!(s.see && matchMedia('(max-width: 640px)').matches)) target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
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
    // Phone: the card sits over the lower screen, so lift the element the step points at to just above it.
    if (s.see && matchMedia('(max-width: 640px)').matches) requestAnimationFrame(() => {
      const e = document.getElementById(s.see); if (!e) return;
      scrollTo({ top: scrollY + e.getBoundingClientRect().bottom - (card.getBoundingClientRect().top - 12), behavior: 'auto' });
    });
  };
  const start = () => { hooks.onStart?.(); i = 0; card.hidden = false; show(); };
  const stop = () => {
    if (card.hidden) return;
    card.hidden = true; i = -1;
    document.querySelectorAll('.tour-hl').forEach(n => n.classList.remove('tour-hl'));
    hooks.onStop?.();
    document.getElementById('start-tour')?.focus({ preventScroll: true });
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
