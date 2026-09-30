// Guided walkthrough: fixed view states with short explanations. Facts come from the items' sources;
// levels are the tool author's coding.
const STEPS = [
  { title: 'Signals, responses and the war on one line',
    body: 'Circles are Russian nuclear signals, placed higher the more they changed. Squares along the bottom are Western and NATO responses. Diamonds along the top are moments in the war. Click any mark to read it and its sources.',
    set: { range: 'all' } },
  { title: 'February 2022: an alert order in the first week',
    body: 'Three days into the invasion, Putin ordered the deterrence forces onto a "special regime of combat duty" (the Kremlin’s English text says "high combat alert"). It is coded 4 because it declared a change in the forces’ readiness. The White House said it fit a pattern of Putin "manufacturing threats".',
    set: { range: 'y22', sel: '2022-02-putin-orders-deterrence-forc' } },
  { title: 'September 2022: threats follow battlefield losses',
    body: 'After Ukraine’s Kharkiv breakthrough, Putin announced mobilization and said "this is not a bluff". Medvedev and the annexation speech followed within days. Loud as they were, these are coded 1 or 2: words, some with conditions, and no change to forces.',
    set: { range: 'y22', sel: '2022-09-mobilisation-speech-this-is' } },
  { title: '2023: from words to rules and forces',
    body: 'Russia suspended New START, announced nuclear weapons for Belarus and then said the first warheads had arrived, and revoked its ratification of the test-ban treaty. The signals moved up the scale from statements to treaty and force changes.',
    set: { range: 'y23', sel: '2023-06-putin-first-nuclear-warheads' } },
  { title: 'November 2024: doctrine, long-range strikes and Oreshnik',
    body: 'In one week Ukraine fired U.S.-made ATACMS into Russia, Putin signed a revised nuclear doctrine, and Russia fired a new nuclear-capable intermediate-range missile, the Oreshnik, at Dnipro with a conventional payload. That is the first level 5 item.',
    set: { range: 'y24', sel: '2024-11-oreshnik-missile-fired-at-dn' } },
  { title: '2025 and 2026: Belarus, Oreshnik and restraint offers',
    body: 'Oreshnik units went on duty in Belarus and the missile was used twice more. Russia also offered to keep New START limits after the treaty expired, if the U.S. did the same. Those offers sit at level 0.',
    set: { range: 'y25', sel: '2026-02-lavrov-russia-keeps-new-star' } },
  { title: 'Filter to the changes that stuck',
    body: 'Set the minimum level to 3 and turn off the context lanes. What is left is the record of rules, forces and use: the steps that changed something beyond the words.',
    set: { range: 'all', min: 3, west: false, battle: false } },
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
    apply(s.set);
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
