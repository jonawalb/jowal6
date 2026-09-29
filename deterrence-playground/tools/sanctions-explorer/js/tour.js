// Guided walkthrough: fixed filter states with short explanations. Numbers are computed from
// TIES version 4.0 as built into data/ties.js (see scripts/build_data.py).
const STEPS = [
  { title: 'Sixty years of sanctions cases',
    body: 'TIES records 1,412 cases that began between 1945 and 2005, threats included. Each bar counts the cases that began that year, coloured by how TIES codes the final outcome. Grey cases have no outcome coded, mostly because the data gives no end date.',
    set: {} },
  { title: 'What counts as success changes the answer',
    body: 'Of the 1,024 cases with an outcome coded, the target gave in fully in 26 percent. Count partial compliance and negotiated settlements too and the figure rises to 56 percent. The switch in the side panel moves between the two readings.',
    set: { def: 'strict' } },
  { title: 'Many cases end at the threat stage',
    body: 'In 567 cases the sender threatened sanctions and never imposed them. The TIES authors collected threats because sanctions that would work may never need to be imposed. Among threat-only cases with an outcome, 31 percent ended in full compliance, against 22 percent of cases where sanctions were imposed.',
    set: { def: 'strict', st: 'threat' } },
  { title: 'Most cases are trade disputes',
    body: 'Half the cases (704) involve trade practices, many of them among partners: the most common pairs are the United States against Japan (43 cases), South Korea, Canada and the European Community. Here the target rarely gave in fully (15 percent of coded cases) and negotiated settlements are common.',
    set: { iss: '13' } },
  { title: 'The United Nations as sender',
    body: 'TIES links 76 cases to the United Nations. Once sanctions were imposed, 32 of the 36 cases with an outcome ended with the target giving some ground. Where UN action stopped at a threat, 7 of 32 did.',
    set: { snd: 'i0' } },
  { title: 'Two TIES measures that disagree',
    body: 'TIES also scores how each side fared, 0 to 10. Its manual calls these scores questionable on their own. In 75 of 912 cases the higher-scoring side is the opposite of what the outcome code implies. This case is one: coded a negotiated settlement, with the target scoring higher.',
    set: { dis: true, c: 1949050101 } },
  { title: 'Where the GSDB fits',
    body: 'The Global Sanctions Data Base covers imposed sanctions only, 1950 to the present, and codes success per objective. Its data may not be republished, so the side panel sets its authors’ published figures next to the TIES rate for imposed cases. Read them as two different yardsticks.',
    set: { st: 'imposed', focus: 'compare' } },
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
    const { focus, ...set } = s.set;
    apply(set);
    if (focus) document.getElementById(focus)?.scrollIntoView({ block: 'nearest' });
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= STEPS.length) stop(); else { i = n; show(); } }; });
    card.querySelector('.solid').focus();
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
