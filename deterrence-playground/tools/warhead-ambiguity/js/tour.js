// Guided walkthrough for Is It a Nuke? Each step loads settings on top of the defaults and explains one idea.
export const STEPS = [
  { title: 'A missile is coming. Is it a nuke?',
    body: 'Your sensors detect an incoming missile of a type that can carry either a nuclear or a conventional warhead. You have minutes. The chart shows your belief over three possibilities: no attack at all, a conventional strike, or a nuclear one. All numbers are notional.',
    set: {} },
  { title: 'Priors do most of the work',
    body: 'In a conventional war missiles are already flying, so a detection is almost surely real, and almost surely conventional. Your best move is to hit back conventionally. Launching nuclear weapons would turn a conventional strike into a nuclear war.',
    set: { site: 'conv', traj: 'theater' } },
  { title: 'Peacetime, one sensor',
    body: 'Switch to peacetime. A real attack out of the blue is rare, but if one comes it is likely nuclear. With only one sensor reporting, a false alarm is still the best explanation. This is roughly where Stanislav Petrov stood in 1983.',
    set: { ctx: 'peace', pReal: 0.02, pNuc: 0.7, site: 'nuc', traj: 'unclear', corr: 0 } },
  { title: 'A second sensor agrees',
    body: 'Now a radar confirms what the satellite saw, and the track points at your nuclear forces. The false-alarm explanation collapses and the nuclear share jumps. Whether you launch now depends on the costs and on how much of your deterrent would survive.',
    set: { ctx: 'peace', pReal: 0.02, pNuc: 0.7, site: 'nuc', traj: 'nucf', corr: 1, surv: 0.2 } },
  { title: 'Entanglement makes evidence weaker',
    body: 'Back in the war, a missile rises from a site that hosts both kinds of units and heads for a dual-use early-warning radar. If you assume the adversary’s forces are separate, that looks like a nuclear pattern. The more entangled the forces really are, the more often conventional strikes look like this.',
    set: { site: 'mixed', traj: 'dual', Eo: 0.1, E: 0.8, pNuc: 0.2 } },
  { title: 'The cost of a wrong assumption',
    body: 'The map below shows the chance that a campaign of conventional launches triggers at least one nuclear launch, by your prior and the true entanglement. The dashed line marks what you assume. Press “Assume the actual level” in the panel and watch the wrongful launches fall: you now discount dual-use targets correctly.',
    set: { Eo: 0.1, E: 0.8, pNuc: 0.2, surv: 0.1 } },
  { title: 'Survivability buys patience',
    body: 'Raise the survivability of your retaliatory force, or switch off launch before impact. Acton notes that only the United States and Russia can launch before incoming weapons detonate; for other states, post-launch ambiguity cannot trigger a nuclear response in time. Waiting becomes cheap, and the wrongful launches vanish.',
    set: { Eo: 0.1, E: 0.8, pNuc: 0.2, surv: 0.9 } },
  { title: 'Real cases',
    body: 'The cards below load setups for the NORAD false alarms of 1979 and 1980, Petrov in 1983, the Norwegian rocket in 1995 and the accidental missile that landed in Pakistan in 2022, each with sources.',
    set: {} },
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
