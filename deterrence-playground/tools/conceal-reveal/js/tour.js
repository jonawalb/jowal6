// Guided walkthrough for Conceal or Reveal? Each step sets parameters (on top of the defaults) and explains one idea.
export const STEPS = [
  { title: 'Two things the adversary cannot see',
    body: 'A state knows two things about its new weapon that its rival does not: how strong it is, and what it is for. Coercive intent means the state wants the rival to know; operational intent means it plans to use the weapon in a fight. The grid shows the four combinations and what each does in equilibrium.',
    set: {} },
  { title: 'Intent separates the types',
    body: 'At these values both coercive types reveal and the Receiver concedes, while both operational types conceal and the Receiver fights. Capability does not decide who reveals: the strong operational type hides and the weak coercive type shows. This is Proposition 1 of the paper.',
    set: {}, hi: ['HO', 'LC'] },
  { title: 'The operational bonus holds it together',
    body: 'Lower V, the extra payoff operational types get from war. Below the IC-O line the weak operational type would rather reveal and collect the concession, and the separation breaks. V is the only parameter that moves the operational types’ incentive alone.',
    set: { V: 0.6 } },
  { title: 'Revelation has a price',
    body: 'Raise r, the cost of revealing: countermeasures, exposed methods, a faster arms race. Past the IC-C line even the strong coercive type prefers to keep quiet and fight with surprise.',
    set: { r: 0.8 } },
  { title: 'The Receiver must read the signal as strength',
    body: 'Make capability independent of intent (same chance of high capability for both). Now revealers and concealers look alike on average, and concealment adds surprise, so the Receiver cannot concede after a reveal while fighting after concealment. Revealers must be stronger on average by more than σ.',
    set: { hC: 0.55, hO: 0.55 }, ax: 'hh' },
  { title: 'Surprise can deter on its own',
    body: 'Raise σ, the surprise advantage. Past the R-F line the concealers plus surprise look strong enough that the Receiver concedes to them too, and the reason to reveal disappears.',
    set: { sig: 0.28 }, ax: 'sc' },
  { title: 'Secrecy hides the serious and the weak together',
    body: 'Look at the belief after Conceal. It mixes strong states planning to fight with weak ones. The Receiver cannot tell them apart, so it answers concealment by fighting rather than conceding. The case cards below place real episodes in this grid.',
    set: { hO: 0.35 }, hi: ['HO', 'LO'] },
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
    apply({ P: s.set, ax: s.ax, hi: s.hi });
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
