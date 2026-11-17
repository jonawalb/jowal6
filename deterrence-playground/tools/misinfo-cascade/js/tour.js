// Guided walkthrough: fixed parameter states with short explanations.
// Each step scrolls to and highlights its target. The tour never changes the Simple | Full mode, and it restores the
// user's own settings (and kept run) when it ends or is closed.
import { DEFAULTS } from './model.js';

export const STEPS = [
  { title: 'A small true event', target: '#netbox',
    body: 'Four people see an accurate report: 16 aircraft entered the air defense zone. Blue dots are people passing on the accurate report. Press Play to watch the claim move through the network one round at a time.',
    set: { ...DEFAULTS, cor: 0, t: 0 } },
  { title: 'Each retelling can get worse', target: '#versions',
    body: 'When someone passes the claim on, they repeat the most alarming version they saw, and sometimes add to it. Fear raises that chance. By round 40 about four in five sharers are passing on a retelling of some kind, and the most common versions say warplanes are circling or that the island is surrounded.',
    set: { ...DEFAULTS, cor: 0, t: 40 } },
  { title: 'Why people share: the Mass Game', target: '#w-md',
    body: 'A person shares once the share of their contacts who are sharing, as they perceive it, exceeds their private conviction Δ, the cost of repeating a claim they doubt. Here the median conviction is raised to 0.6 and the cascade stalls after reaching about one person in seven. This is a threshold model in the sense of Granovetter (1978), run on a network as in Watts (2002).',
    set: { ...DEFAULTS, cor: 0, md: 0.6, t: 40 } },
  { title: 'Fear lowers the bar', target: '#w-lam',
    body: 'With median conviction 0.45 and no amplification, a calm population (fear gain λ = 1) passes the report to 9% of people. Here λ is 1.8 and the same people, with the same convictions, carry it to 90%. Fear makes each sharing contact count for more, the weighting channel in Walberg’s λ model. Drag λ back to 1 to compare.',
    set: { ...DEFAULTS, cor: 0, md: 0.45, lam: 1.8, amp: 0, t: 40 } },
  { title: 'A fact-check from outside the group', target: '#status',
    body: 'A correction reaches 40% of people at round 8. Dashed rings mark who it reached. Almost no one who is already sharing retracts (2 of 31 on this network): their fear, the claim’s alarm and their neighbours’ sharing outweigh an out-group source. The gain comes from people it reached before they shared.',
    set: { ...DEFAULTS, cor: 1, t: 40 } },
  { title: 'The same correction from inside the group', target: '#sec-cor .choices',
    body: 'Switch the source to an in-group voice, which the Moral Panic model (a simulation, not an estimate) weights about three times an outside fact-check. Now every sharer it reaches retracts (31 of 31), and each retraction lowers the share their neighbours see.',
    set: { ...DEFAULTS, cor: 1, src: 'i', t: 40 } },
  { title: 'Late corrections meet a hardened audience', target: '#w-tc',
    body: 'Move the same in-group correction to round 20. By then the claim is old, it has been retold, and most of each person’s contacts are sharing it. Only about one in four sharers it reaches retracts. In the correction meta-analysis by Walter and Tukachinsky (2020), corrections were also less effective after a time lag.',
    set: { ...DEFAULTS, cor: 1, src: 'i', tc: 20, t: 40 } },
];

/** hooks: { apply(set), snapshot(), restore(snap), result() } */
export function createTour(root, hooks) {
  let i = -1, snap = null, hi = null;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.appendChild(card);
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const highlight = sel => {
    if (hi) hi.classList.remove('tour-hi');
    hi = sel ? document.querySelector(sel) : null;
    if (!hi || !hi.offsetParent) { hi = null; return; }
    hi.classList.add('tour-hi');
    const phone = matchMedia('(max-width: 640px)').matches;
    hi.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: phone ? 'start' : 'center' });
    const r = hi.getBoundingClientRect();
    card.classList.toggle('left', !phone && r.left + r.width / 2 > innerWidth / 2);
  };
  const show = () => {
    const s = STEPS[i];
    hooks.apply(s.set);
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p><p class="tour-now">${hooks.result()}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    highlight(s.target);
    card.querySelector('.solid').focus({ preventScroll: true });
  };
  const start = () => { if (i < 0) snap = hooks.snapshot(); i = 0; card.hidden = false; show(); };
  const stop = () => {
    if (i < 0) return;
    card.hidden = true; i = -1; highlight(null);
    if (snap) { hooks.restore(snap); snap = null; }
    document.getElementById('start-tour')?.focus({ preventScroll: true });
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
