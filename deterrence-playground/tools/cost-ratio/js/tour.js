// Guided walkthrough for Cost Ratio Bargaining. Each step loads values on top of the defaults and explains one result.
export const STEPS = [
  { title: 'Fearon’s bargaining game, one change',
    body: 'Two actors split a good worth 1. S offers W a share x; W accepts or fights. A war gives W the good with probability p and costs both sides. The paper’s change is to hold the total cost C fixed and let the cost-exchange ratio κ = c<sub>S</sub>/c<sub>W</sub> decide who pays it.',
    set: {} },
  { title: 'The range is the two war costs',
    body: 'W prefers any deal above p − c<sub>W</sub>; S prefers any deal below p + c<sub>S</sub>. The range between them is exactly the two costs laid end to end around p, so its width is C (Proposition 1). S offers the bottom of the range, and W takes it (Proposition 2).',
    set: {} },
  { title: 'Cheaper war for W, better deal for W',
    body: 'Raise κ to 4. S now pays most of the war’s cost. W’s war payoff rises, so S must offer more. The range slides toward W without getting wider. This is Proposition 3, the paper’s central result.',
    set: { k: 4 } },
  { title: 'The ceiling is p',
    body: 'Push κ to 10. W’s share climbs toward p but never reaches it: however cheaply W fights, S never has to give W more than W would expect from winning. Capability and cost technology stay separate levers.',
    set: { k: 10 } },
  { title: 'The same weapons can cut the other way',
    body: 'Set κ to 0.25. When S’s strikes are cheap against W’s few, fixed leadership nodes, W carries most of the cost and settles below the symmetric benchmark p − C/2.',
    set: { k: 0.25 } },
  { title: 'Denial versus survival',
    body: 'Proposition 4 compares one dyad fought two ways. In a denial war W strikes S’s spread-out forces (κ<sub>D</sub> &gt; 1); in a survival war S strikes W’s leaders (κ<sub>V</sub> &lt; 1). Same p, same C, and W does better in the denial war by the gap shown.',
    set: { kD: 4, kV: 0.25 }, focus: 'fig-compare' },
  { title: 'Taking κ to data',
    body: 'κ is not observed directly. Section 5 proposes an index of three parts, each scaled 0 to 1, and treats an average above 0.5 as the high-κ regime. The case cards below give the paper’s codings for Ukraine, the Houthis, Iran in 2024 and Sri Lanka.',
    set: { off: 0.2, def: 0.1, exp: 0.15 }, focus: 'fig-index' },
];

export function createTour(root, apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tour'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Guided walkthrough');
  root.appendChild(card);
  const show = () => {
    const s = STEPS[i];
    apply(s, `Walkthrough step ${i + 1}: ${s.title}`);
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
