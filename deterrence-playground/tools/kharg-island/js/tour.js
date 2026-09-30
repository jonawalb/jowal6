// Guided walkthrough: a fixed sequence of setups with short explanations.
import { POSTURES } from '../data/params.js';

const US = { obj: 'seize', meu: 1, abn: 1, cvw: 1, ddg: 3, mcm: 1, helo: 1, sof: true, bases: false, sector: 'W', strikes: 1 };
const IR = { posture: 'deny', ...POSTURES.deny.v };
export const DEFAULT = { us: US, ir: IR, turns: 8 };
const set = (us = {}, ir = {}, extra = {}) => ({ us: { ...US, ...us }, ir: { ...IR, ...ir }, turns: 8, view: 0, ...extra });

export const STEPS = [
  { title: 'Why Kharg',
    body: 'Kharg is a coral island of about 20 km² some 25 to 30 km off Iran\'s coast, and most of Iran\'s crude exports load there. That makes it leverage: whoever controls it controls much of Iran\'s oil income. It is also within reach of Iran\'s coastal missiles, drones and boats. This game asks what taking it, raiding it or blockading it would cost.',
    set: set() },
  { title: 'Play one game',
    body: 'Press Next turn to step through a game in 12-hour turns. Here carrier aircraft strike for one turn while the ships wait out of range, then Marines, paratroopers and a special operations force land. Every row in the log shows the chance of an event, the dice and the result.',
    set: set({}, {}, { view: 2 }) },
  { title: 'The fight ashore',
    body: 'Once troops are ashore, the ratio of U.S. to Iranian strength picks a column of the combat results table and one die picks a row. Iran keeps trying to ferry reinforcements from the mainland, and drones from the coast strike troops on the island. The table, like most numbers here, is notional and you can change it.',
    set: set({}, {}, { view: 3 }) },
  { title: 'A thousand games',
    body: 'One game is one roll of the dice. The Monte Carlo card replays the same setup 1,000 times and shows how often the U.S. holds the island, how often it stays contested, and how often the war widens. Against a full Iranian defense, one Marine unit rarely holds Kharg inside four days.',
    set: set() },
  { title: 'Bring more force, pay more',
    body: 'Add a second Marine unit and fly strike aircraft from Gulf partner bases. The U.S. holds the island more often, but Iran is more likely to hit the hosts\' energy facilities, and the cost track climbs. The key drivers table shows both columns: the objective and the escalation risk.',
    set: set({ meu: 2, abn: 0, sof: false, bases: true, ddg: 3, helo: 1, mcm: 1 }) },
  { title: 'Raid and leave',
    body: 'A raid takes the airstrip area, holds it for a turn and pulls out. It exposes fewer troops for less time, so it succeeds more often and escalates less, but it leaves Iran\'s exports flowing once the force has gone.',
    set: set({ obj: 'raid' }) },
  { title: 'Or blockade from offshore',
    body: 'A blockade lands no one. Destroyers on station turn tankers back, and Iran answers with missiles, drones and mines at the ships. Exports fall, though in these notional settings a landing that shuts the terminal cuts them more. Watch the oil panel: the price effect is a notional sensitivity, while the export baseline comes from sources.',
    set: set({ obj: 'blockade', ddg: 5, meu: 0, abn: 0, sof: false, cvw: 1, mcm: 2, helo: 2 }) },
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
