// Guided walkthrough: fixed states with short explanations.
import { DEFAULTS, KINDS } from './state.js';

const K = k => ({ ...DEFAULTS, kind: k, ...KINDS[k].preset });
export const STEPS = [
  { title: 'Every signal here is true',
    body: 'There is no threat (θ = 0) and every dot is an accurate signal. The teal line is a citizen who updates by Bayes’ rule. The orange line is the same citizen after a fear campaign that makes threatening news count 2.5 times as much. Same evidence, different conclusion: this is Proposition 3, “correct information, distorted conclusion.”',
    set: { ...K('fear') }, card: 'card-a' },
  { title: 'Affect fades',
    body: 'Induced emotion decays. With ρe = 0.2 the fear gain drifts back toward 1 and the two citizens end closer together. A fabricated signal does not decay, which is the sender’s reason to consider fabrication.',
    set: { ...K('fear'), rhoE: 0.2 }, card: 'card-a' },
  { title: 'Make good news weightless',
    body: 'The paper reads inevitability messaging as an attack on the weight given to reassuring news. A worried citizen (μ0 = 1.5) sees accurate signals that the threat is low, but discounts each reassuring one to 15% of its weight. The undisturbed citizen calms down; the attacked one stays worried.',
    set: { ...K('trust') }, card: 'card-a' },
  { title: 'Anger makes people sure, not sensitive',
    body: 'Anger is a separate operator. It leaves the gain alone and multiplies confidence at every step, so the band collapses and the belief freezes near where the campaign found it. Later truth barely moves it.',
    set: { ...K('anger') }, card: 'card-a' },
  { title: 'When the attack beats fabrication',
    body: 'Proposition 2. Each cell compares the sender’s best weighting attack with fabrication. Orange is where the weighting attack pays more. It wins where fabrication is expensive (low ρ). Drag the point to read the payoffs.',
    set: { ...K('fear'), rho: 0.1, tau: 5, dE: 0, dT: 20 }, card: 'card-b' },
  { title: 'Decay erodes, but does not erase, the advantage',
    body: 'Set decay to 0.3. The orange region shrinks, but not by half: in the paper by 19.6%, in this browser rerun at T = 20 by about a quarter. The paper had predicted a collapse of at least 50% and reports the failed prediction plainly: most of the region sits where fabrication is too expensive for decay to matter.',
    set: { ...K('fear'), dE: 0.3, dT: 20 }, card: 'card-b' },
  { title: 'Fact-checking a captured citizen',
    body: 'Proposition 4. When the weight on evidence has been pushed down to λg = 0.2, disclosed truth is itself discounted and removes little of the distortion. Reassurance restores the weight first, then lets the truth work. Teal cells are where reassurance wins.',
    set: { ...K('fear'), def: 'd', lg: 0.2, b: 5 }, card: 'card-c' },
  { title: 'Fear can be undone; anger mostly cannot',
    body: 'After the campaign, 80 truthful signals arrive. The fear-captured citizen moves a good way back. The anger-captured citizen does not move at all. The paper’s triage rule: treat anger and division campaigns as prevention problems, fear campaigns as correction problems.',
    set: { ...K('fear'), def: 'r', peak: 1 }, card: 'card-c' },
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
    document.getElementById(s.card)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
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
