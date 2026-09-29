// Guided walkthrough: fixed parameter states with short explanations.
import { DEFAULTS } from './model.js';

export const STEPS = [
  { title: 'A small true event',
    body: 'Four people see an accurate report: 16 aircraft entered the air defense zone. Blue dots are people passing on the accurate report. Press Play to watch the claim move through the network one round at a time.',
    set: { ...DEFAULTS, cor: 0, t: 0 } },
  { title: 'Each retelling can get worse',
    body: 'When someone passes the claim on, they repeat the most alarming version they saw, and sometimes add to it. Fear raises that chance. By round 40 about four in five sharers are passing on a retelling, and the most common versions say warplanes are circling or that the island is surrounded.',
    set: { ...DEFAULTS, cor: 0, t: 40 } },
  { title: 'Why people share: the Mass Game',
    body: 'A person shares once the share of their contacts who are sharing, as they perceive it, exceeds their private conviction Δ. Here the median conviction is raised to 0.6 and the cascade stalls after reaching about one person in seven. This is a threshold model in the sense of Granovetter (1978).',
    set: { ...DEFAULTS, cor: 0, md: 0.6, t: 40 } },
  { title: 'Fear lowers the bar',
    body: 'With median conviction 0.45 and no amplification, a calm population (fear gain λ = 1) passes the report to 9% of people. Here λ is 1.8 and the same people, with the same convictions, carry it to 90%. Fear makes each sharing contact count for more, the weighting channel in Walberg’s λ model. Drag λ back to 1 to compare.',
    set: { ...DEFAULTS, cor: 0, md: 0.45, lam: 1.8, amp: 0, t: 40 } },
  { title: 'A fact-check from outside the group',
    body: 'A correction reaches 40% of people at round 8. Rings mark who it reached. Almost no one who is already sharing retracts: their fear, the claim’s alarm and their neighbours’ sharing outweigh an out-group source. The gain comes from people it reached before they shared.',
    set: { ...DEFAULTS, t: 40 } },
  { title: 'The same correction from inside the group',
    body: 'Switch the source to an in-group voice, which the Moral Panic paper weights about three times an outside fact-check. Now most people reached retract, and each retraction lowers the share their neighbours see.',
    set: { ...DEFAULTS, src: 'i', t: 40 } },
  { title: 'Late corrections meet a hardened audience',
    body: 'Move the same in-group correction to round 20. By then the claim is old, it has been retold, and most of each person’s contacts are sharing it. Only about one in four sharers it reaches retracts. In the correction meta-analysis by Walter and Tukachinsky (2020), corrections were also less effective after a time lag.',
    set: { ...DEFAULTS, src: 'i', tc: 20, t: 40 } },
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
