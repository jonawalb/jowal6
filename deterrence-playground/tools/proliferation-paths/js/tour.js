// Guided walkthrough: fixed tool states with short explanations drawn from the datasets' own coding notes.
export const STEPS = [
  { title: 'Three stages, three datasets',
    body: 'Political scientists code nuclear proliferation in stages. A state explores when leaders authorize study of the option, pursues when they take concrete steps toward a weapon, and acquires when it tests or assembles one. The map shows the stage Bleek (2017) codes for each state in 1965. Drag the year slider or the timeline to move through time.',
    set: { year: 1965, ds: 'bleek', sel: 'CHN' } },
  { title: 'South Africa built weapons, then gave them up',
    body: 'All three datasets code South Africa acquiring in 1979. De Klerk ordered the program ended in February 1990, and the weapons were dismantled by September 1991. Bleek codes the return to no activity in 1991; Jo and Gartzke\'s last year of possession is 1991 (shown as no activity from 1992). The original Singh and Way coding waited until 1994.',
    set: { year: 1985, ds: 'bleek', sel: 'ZAF' } },
  { title: 'The datasets do not agree on dates',
    body: 'Switch to "Compare all three" and each timeline row splits into three lanes. Israel acquires in 1966 (Jo and Gartzke), 1967 (Bleek) or 1969 (Way\'s update); the original Singh and Way paper said 1972. Dashed map outlines mark states the datasets code differently in the chosen year.',
    set: { year: 1968, ds: 'any', sel: 'ISR' } },
  { title: 'Libya, 1970 to 2003',
    body: 'Bleek and Singh and Way both code Libya pursuing from 1970 to its December 2003 announcement that it would dismantle its weapons programs. Way keeps pursuit continuous through years when activity "slowed to a crawl". Jo and Gartzke do not code Libya at all.',
    set: { year: 2003, ds: 'way12', sel: 'LBY' } },
  { title: 'Taiwan and South Korea in the 1970s',
    body: 'Both U.S. allies started programs in the late 1960s and around 1970 and stopped under U.S. pressure. The datasets split on how far they went: Way codes Taiwan pursuing from 1967 to 1977, Bleek only exploring. For South Korea, Jo and Gartzke end the program in 1975; Bleek runs pursuit to 1981.',
    set: { year: 1974, ds: 'any', sel: 'TWN', f: 'rev' } },
  { title: 'Arsenals left behind in 1991',
    body: 'Ukraine, Belarus and Kazakhstan held Soviet weapons after the USSR broke up, but none of the three datasets codes them, because none had operational control. They appear here with dotted outlines and a card, and the Budapest Memorandum of 1994 is linked from Ukraine\'s card.',
    set: { year: 1994, ds: 'bleek', sel: 'UKR' } },
  { title: 'Every disagreement in one table',
    body: 'The table lists the first year each dataset codes each stage and the first year back at no activity. Cells are shaded where the datasets differ by three years or more. Click a state name to open its card.',
    set: { year: 2017, ds: 'any', sel: 'IRQ', scroll: 'rec-card' } },
];

export function createTour(apply, onClose = () => {}) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'pp-tour'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Walkthrough');
  document.body.appendChild(card);
  const stop = () => { const was = !card.hidden; card.hidden = true; i = -1; if (was) onClose(); };
  const show = () => {
    const s = STEPS[i];
    apply(s.set);
    card.innerHTML = `<div class="th"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tn"><button type="button" class="btn" data-d="-1" ${i === 0 ? 'disabled' : ''}>Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus({ preventScroll: true });
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start: () => { i = 0; card.hidden = false; show(); }, stop };
}
