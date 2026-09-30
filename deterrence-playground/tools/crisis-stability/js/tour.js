// Guided walkthrough (pattern from tools/interceptor-burndown/js/tour.js). Each step names a preset and
// any overrides; everything else returns to that preset's values.
import { PRESETS } from '../data/presets.js';

const P = k => { const p = PRESETS.find(x => x.k === k); return { preset: k, A: { ...p.A }, B: { ...p.B }, prl: p.prl, wpt: p.wpt }; };
const with2 = (base, f) => { const s = P(base); f(s); s.preset = ''; return s; };

export const STEPS = [
  { title: 'Four costs make one number',
    body: 'Kent and Thaler ask each leader to compare the cost of striking first with the cost of waiting and being struck. The square on the left shows the two ratios. Its shaded box, where both sides do better by waiting, is the stability index. In this notional default, B\'s MIRVed silos give A a real reason to go first.',
    set: { ...P('mixed'), sweep: 'mirv' } },
  { title: 'Reading the weapons domain',
    body: 'Each axis counts weapons left to strike the other side\'s value. Solid lines are A\'s constant cost, dashed lines B\'s. A first strike walks down a draw-down curve as the striker spends warheads on the other side\'s forces. It stops where its own cost is lowest. Hover or tap along a curve to read the costs at any point.',
    set: { ...P('mixed'), sweep: 'mirv' }, scroll: 'domaincard' },
  { title: 'MIRVed silos invite a first strike',
    body: 'Put most warheads on ten-warhead silos and one incoming warhead can destroy ten. Each side can now push the other far down its curve, and the index falls toward the acute cases in the report. The sweep below shows the same warheads spread over fewer, richer launchers.',
    set: { ...P('silos'), sweep: 'mirv' }, scroll: 'sweepcard' },
  { title: 'Launch under attack changes the arithmetic',
    body: 'If the striker expects the victim to fire its silo missiles on warning, most of its counterforce strike lands on empty silos. The report found the same: its 1988 case rose from 0.76 to 0.91 (pp. 36–37). The report also flags the danger of this posture, a higher risk of accidental launch.',
    set: { ...with2('silos', s => { s.prl = true; }), sweep: 'mirv' } },
  { title: 'Alert rates matter most at low numbers',
    body: 'At about 500 warheads each, forces that sit in port or in garrison are cheap targets. Raise the day-to-day alert rate and the same arsenal becomes stable. Kent and Thaler stress day-to-day posture because an attacker may strike before the victim generates its forces (p. 48).',
    set: { ...P('cuts'), sweep: 'alert' }, scroll: 'sweepcard' },
  { title: 'Bigger is not always less stable',
    body: 'The report\'s Case II grew both arsenals and still saw only marginal erosion, because large forces sit where the cost lines are flat (p. 37). Scale the arsenals here and watch the index. The reverse also holds: deep cuts need survivable postures to stay stable.',
    set: { ...P('surv'), sweep: 'size' }, scroll: 'sweepcard' },
  { title: 'A third nuclear power',
    body: 'Kent and Thaler modeled two sides. This extension lets each side hold part of its force back to deter a third country. Withheld weapons cannot limit damage or retaliate in this exchange, so the index usually falls. Treat it as a prompt for thinking about three-party competition, not as a result from the report.',
    set: { ...with2('mixed', s => { s.A.hold = 0.3; s.B.hold = 0.3; }), sweep: 'hold' }, scroll: 'sweepcard' },
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
  return { start, stop, active: () => i >= 0, steps: STEPS.length };
}
