// Guided walkthrough (pattern from tools/interceptor-burndown/js/tour.js). Each step overrides the defaults.
export const STEPS = [
  { title: 'A quota of inspections',
    body: 'A treaty runs for 12 periods and allows 4 inspections. The inspectee can start one violation in any period; an inspection that period catches it. Neither side can be predictable, so both randomize. The inspector opens with about a one-in-four chance of inspecting, and a violation, if it comes, is caught about a quarter of the time.',
    set: { mode: 'quota' } },
  { title: 'More inspections, fewer violations',
    body: 'Double the quota to 8. Violation becomes less likely and a violation that does happen is caught more often. The first chart traces both across every quota from 0 to 12; the inspectee stops violating only when every period is covered.',
    set: { mode: 'quota', m: 8 }, scroll: 'c1card' },
  { title: 'A bigger penalty lets the inspector relax',
    body: 'Raise the penalty from 2 to 8. The inspectee is now deterred at a lower chance of inspection, so in equilibrium the inspector inspects less often and the detection chance falls. The inspector\'s own expected payoff does not change: in this game it depends on the quota and on a, not on b (Theorem 4.1).',
    set: { mode: 'quota', b: 8 } },
  { title: 'Imperfect inspections',
    body: 'Real inspections can miss things. Here each inspection catches a violation 60 percent of the time. This is the tool\'s extension of the published game; at 100 percent it matches the chapter\'s formula exactly. Violation becomes close to certain over the treaty\'s life.',
    set: { mode: 'quota', dq: 0.6 } },
  { title: 'Inspection with false alarms',
    body: 'Switch to the alarm game. One inspection yields a noisy measurement, and the inspector picks an alarm threshold. A lower threshold catches more violations but accuses a compliant party more often. The curve shows that trade-off; the dot is the equilibrium.',
    set: { mode: 'alarm', sweep: 'b' }, scroll: 'c1card' },
  { title: 'Each side is steered by the other\'s stakes',
    body: 'In equilibrium the inspectee must be indifferent between complying and cheating, which fixes the inspector\'s false-alarm rate from the inspectee\'s payoffs, b and h. The inspector must be indifferent across thresholds, which fixes the cheating rate from the inspector\'s payoffs, e and a (Theorem 3.1). Raising the penalty lowers detection and false alarms together.',
    set: { mode: 'alarm', sweep: 'b', b: 8 }, scroll: 'c2card' },
  { title: 'The cost of crying wolf',
    body: 'If a false accusation is politically expensive for the inspector, e rises and the inspectee cheats more often, with the same detection chance. Arms control debates about challenge inspections turn on this cost.',
    set: { mode: 'alarm', sweep: 'e', e: 0.6 }, scroll: 'c2card' },
  { title: 'Better instruments',
    body: 'A sharper test (larger detection strength) lets the inspector hold detection at the level the penalty requires with far fewer false alarms, and cheating falls toward zero. Scroll down for the real regimes: inspection quotas under New START, IAEA safeguards and the CTBT monitoring network.',
    set: { mode: 'alarm', sweep: 's', s: 3 }, scroll: 'regimes' },
];

export function createTour(root, apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.prepend(card);
  const show = () => {
    const s = STEPS[i];
    apply(JSON.parse(JSON.stringify(s.set)));
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
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (s.scroll) document.getElementById(s.scroll)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    else card.scrollIntoView({ block: 'nearest' });
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
