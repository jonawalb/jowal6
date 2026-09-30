// Guided walkthrough: highlights one part of the page per step and explains the matrix-game method.
const STEPS = [
  { sel: '.mg-flag', title: 'A fictional exercise',
    body: 'This is a matrix game: an argument-based wargame. The crisis around Narva is invented for teaching. The background facts under the game are real and sourced; the injects, arguments and results are not.' },
  { sel: '#mg-board-card', title: 'The crisis board',
    body: 'Four tracks from 0 to 10 record the state of the crisis: escalation, allied cohesion, local sentiment in Narva and international attention. Every argument that succeeds or fails moves them. If escalation reaches 10, the exercise stops.' },
  { sel: '#mg-inject', title: 'Each turn opens with an inject',
    body: 'A short fictional event sets the scene and nudges the board. Its tags (border, info, local and so on) matter: some reasons only hold when the inject is about their subject.' },
  { sel: '#mg-actions', title: 'Make an argument: the action',
    body: 'In Engle\'s method a player states an action and the result they expect. Pick one here. Ambitious actions start at −1. We have picked one for you as an example.', demo: true },
  { sel: '#mg-reasons', title: 'Give up to three reasons',
    body: 'Each reason that bears on the action\'s tags and is backed by the current board counts +1. Reasons that are off-topic, or that the board does not support right now, count 0. Some reasons rest on sourced facts, like the census or NATO\'s forward presence.' },
  { sel: '#mg-adj', title: 'The adjudicator',
    body: 'After you submit, the panel lists every modifier with its reason: your reasons, any supporting ally and the AI actors\' counter-arguments, each −1 if strong. The net modifier sets the odds on 2d6: 7 or more succeeds, 10+ is decisive, 4 or less backfires.' },
  { sel: '#mg-panel', title: 'Then the other side argues',
    body: 'An AI actor makes its own argument from a scripted list. You choose a counter-argument to lower its odds, then roll for it. Six turns later you get a debrief of which arguments worked and why.' },
  { sel: '#mg-logcard', title: 'Keep the record',
    body: 'Every argument, modifier and roll goes into the turn log. Print it or download it. The link in the address bar replays the same game, dice included.' },
];

export function createTour(root, { demo }) {
  let i = -1, lit = null;
  const card = document.createElement('div');
  card.className = 'mg-tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.appendChild(card);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const light = sel => {
    lit?.classList.remove('mg-lit');
    lit = document.querySelector(sel);
    if (lit) { lit.classList.add('mg-lit'); lit.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); }
  };
  const show = () => {
    const s = STEPS[i];
    if (s.demo) demo();
    light(s.sel);
    card.innerHTML = `<div class="mg-tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="mg-tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = ev => {
      ev.stopPropagation();
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus({ preventScroll: true });
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; lit?.classList.remove('mg-lit'); lit = null; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
