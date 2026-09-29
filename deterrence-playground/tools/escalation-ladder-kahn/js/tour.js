// Guided walkthrough: fixed ladder states with short explanations.
export const STEPS = [
  { title: 'Forty-four rungs, six thresholds',
    body: 'Herman Kahn\'s 1965 ladder runs from "Ostensible crisis" at the bottom to "Spasm or insensate war" at the top. The red dashed lines are his thresholds, the points where he thought a crisis changes character.',
    set: { c: 'cuba', s: 0, vs: '' } },
  { title: 'Cuba, 1962: the climb',
    body: 'Kennedy\'s quarantine speech hardens positions (rung 4). DEFCON 3 follows, then the quarantine line at sea, then DEFCON 2 on October 24: "Super-ready status," just above the Nuclear War Is Unthinkable threshold.',
    set: { c: 'cuba', s: 3, vs: '' } },
  { title: 'Not every step is a choice',
    body: 'On October 27 a U-2 was shot down over Cuba. The ladder treats moves as deliberate; this one was not ordered as a step up. RAND\'s Dangerous Thresholds makes the point: you cannot fall up a ladder, but crises can.',
    set: { c: 'cuba', s: 4, vs: '' } },
  { title: 'Compare 1973',
    body: 'The October 1973 alert (orange) stopped at DEFCON III, coded "Significant mobilization," below Cuba\'s peak. Both crises ended with a diplomatic step down.',
    set: { c: 'cuba', s: 5, vs: 'defcon73' } },
  { title: 'Balakot: a source does the coding',
    body: 'Rohan Mukherjee places the 2019 Indian strike and air battle on rung 9, "Dramatic military confrontations," one rung above anything India and Pakistan had done before. Steps marked "placement from source" follow him.',
    set: { c: 'balakot', s: 2, vs: 'kargil' } },
  { title: 'Loud words, low rungs',
    body: 'In 2017 and 2022 the threats were nuclear and explicit, but the actions coded here stay mostly between rungs 3 and 6. Russia\'s 2022 alert order is the exception, coded by its wording.',
    set: { c: 'russia2022', s: 0, vs: 'korea2017' } },
  { title: 'Retry from the allied side',
    body: 'At the end of any crisis you can replay it from the U.S. or allied side. Here you are Kennedy\'s ExComm, October 16 to 22: quarantine, air strike and invasion, or stern warnings. Every option was really on the table; the sources appear after you choose.',
    set: { c: 'cuba', m: 'play', p: [] } },
  { title: 'A notional model, not a prediction',
    body: 'This run follows the quarantine, then attacks Cuba on October 27. The bar is a notional model of how the crisis ends; the hatched band is Kennedy\'s own estimate of the chance of war. Leaving the record ends the run, and every number can be changed under "Edit the model."',
    set: { c: 'cuba', m: 'play', p: [0, 1] } },
  { title: 'Read the critiques',
    body: 'Below the chart: why a single line misleads. Walberg\'s working paper argues escalation moves on several dimensions at once, so a step can escalate on one and de-escalate on another.',
    set: { c: 'russia2022', s: 5, vs: '', scroll: true } },
];

export function createTour(apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'kl-tour'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Walkthrough');
  document.body.appendChild(card);
  const stop = () => { card.hidden = true; i = -1; };
  const show = () => {
    const s = STEPS[i];
    const { scroll, ...st } = s.set;
    apply(st);
    if (scroll) document.getElementById('crit-h').scrollIntoView({ block: 'start' });
    card.innerHTML = `<div class="th"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tn"><button type="button" class="btn" data-d="-1" ${i === 0 ? 'disabled' : ''}>Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus();
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start: () => { i = 0; card.hidden = false; show(); }, stop };
}
