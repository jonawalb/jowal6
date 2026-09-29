// Guided walkthrough for Nuclear Entanglement. Each step loads a plan, levers and parameters on top of the defaults.
const none = () => ({ ew: [0, 0, 0, 0], nc3: [0, 0, 0, 0], dcd: [0, 0, 0, 0], colo: [0, 0, 0, 0], isr: [0, 0, 0, 0] });
const withRows = rows => Object.assign(none(), rows);
const ALL = [1, 1, 1, 1];

export const STEPS = [
  { title: 'A conventional war against a nuclear-armed state',
    body: 'You plan a conventional air and missile campaign in four phases. Each row is a category of the adversary’s assets that serves both conventional and nuclear forces. Click a cell to strike that category in that phase. The chart shows how the chance of nuclear use builds up. All numbers are notional.',
    set: {} },
  { title: 'Nothing entangled, little risk',
    body: 'With no strikes on entangled assets the war still carries a small baseline risk. Every point above it on the chart comes from what you choose to hit.',
    set: { plan: none() } },
  { title: 'Use them or lose them',
    body: 'Hunt the adversary’s dual-capable missile launchers and the bases they share with nuclear units. Some of what you destroy serves its nuclear deterrent. The smaller and more vulnerable that deterrent, the stronger the pressure to use it before it is gone. Talmadge (2017) argues this is how a U.S.-China conventional war could turn nuclear despite China’s no-first-use policy.',
    set: { plan: withRows({ dcd: ALL, colo: [0, 1, 1, 1] }), P: { surv: 0.3 } } },
  { title: 'Misinterpreted warning',
    body: 'Now strike only the early-warning satellites and radars, which also cue missile defenses against your conventional missiles. Acton (2018) calls the result “misinterpreted warning”: the target reads strikes made for conventional reasons as the prelude to a nuclear attack, even if its own forces are safe.',
    set: { plan: withRows({ ew: ALL }) } },
  { title: 'The fog thickens',
    body: 'Add strikes on command links and surveillance. The fog card shows the target losing sight of the battle. With less to go on, it assumes the worst, and the fog multiplies the other channels.',
    set: { plan: withRows({ ew: ALL, nc3: [0, 1, 1, 1], isr: ALL }) } },
  { title: 'The damage-limitation window',
    body: 'Acton’s second new mechanism applies to a state that plans to limit damage by hunting the other side’s nuclear forces and intercepting its missiles, as the United States does. When its sensors come under attack, it may fear its window is closing and act first. Here the target has that doctrine.',
    set: { plan: withRows({ ew: ALL, isr: ALL }), P: { dlDoc: 1 } } },
  { title: 'Levers: separation and restraint',
    body: 'Return to the default campaign and turn on separation and declaratory restraint. Separation halves the nuclear role of every category; restraint makes misinterpretation less likely. Each lever in the panel shows what it buys, and names where the literature proposes it.',
    set: { mit: { sep: 1, decl: 1 } } },
  { title: 'The price of exclusions',
    body: 'Strike exclusions cut the risk most in this model, but look at the conventional effect in the readout: sparing assets that serve nuclear forces also spares their conventional role. That is the dilemma entanglement creates. The cards below show where it exists in real forces.',
    set: { mit: { excl: 1 } } },
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
