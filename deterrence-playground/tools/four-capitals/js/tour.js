// Guided walkthrough of one month (pattern from tools/arms-race/js/tour.js): each step highlights one part of
// the page, after `reveal` has opened its step of the move (js/steps.js) and its phone tab. It starts a game as
// Washington if none is running.
export const STEPS = [
  { el: 'steps', step: 1, tab: 'move', title: 'Your month in three steps',
    body: 'Each month every capital decides at once. You go through three steps: 1 Posture, 2 Moves, 3 Forces, then End month. This bar shows your choices so far (posture, moves chosen, force orders, Lift and fuel left); click any step to go back to it. The Simple / Detailed switch at the top hides or shows the finer detail; the game runs the same either way.' },
  { el: 'postures', step: 1, tab: 'move', title: 'Step 1: Posture',
    body: 'Pick a posture. It caps how many escalatory (▲) moves you can make: none when you stand down, one when you de-escalate. Some postures cost home support, more so in an election month.' },
  { el: 'actions', step: 2, tab: 'move', title: 'Step 2: Moves, odds and costs',
    body: 'Choose up to four moves under seven tabs: diplomatic, information, military, economic, financial, intelligence and law enforcement. Each shows its odds, its cost (or Free) and the factors behind the odds, and many ask a follow-up question. A move you cannot pay for is greyed out with the reason. Tap or hover the i beside a % for how it is worked out, and the Opportunity, Gray zone and Once a game badges for what they mean. Dashed chips are constraints from politics and allies (an election, Taiwan’s legislature, Congress, a host’s consent to use its bases, a ceasefire), each with its reason.' },
  { el: 'logi-wrap', step: 3, tab: 'move', title: 'Step 3: Four resources',
    body: 'The logistics table updates as you choose. Have is what you start the month with (plus anything your moves add); Committed is what your moves, force orders and this month’s upkeep use; Left is what remains; Next month is what comes back. Lift refills every month. Fuel and munitions are stocks that rebuild slowly. Readiness is the average of your formations, and it falls while they stay forward. The counter beside the Forces heading shows the Lift and fuel left.' },
  { el: 'forces', step: 3, tab: 'move', title: 'Step 3: Formations and orders',
    body: 'Your named formations are listed with strength, readiness and place. Give each one order a month: move it (each option shows its Lift and fuel; ones you cannot afford are greyed out), or aim a strike force. Send worn formations to the Rear to recover readiness. Below, the stance in each sea area: tap one to change it on the map.' },
  { el: 'theatre', tab: 'map', title: 'The board, stances and Taiwan’s coast',
    body: 'The map shows each side’s strength in the four sea areas and who holds them, and Taiwan’s four landing sectors plus its inland reserve. Tap, click or press Enter on a sea area to set your stance there: Defend, Contest or Attack, with the fuel each burns a month, and see your formations in it. China picks a landing emphasis; Taiwan and the United States pick where their reserve and fires wait, without seeing China’s choice.' },
  { el: 'fog', tab: 'map', title: 'Fog of war',
    body: 'You see rival forces as ranges (“about 6–9”), sharper where your own forces are or after your surveillance pays off, rougher far away, and some formations only as “unidentified”. Feints and decoys can shift a range. Tap a level in the key for what it means; the list of rival forces you can see opens under it. The computer sees you by the same rules.' },
  { el: 'crisis', tab: 'sit', title: 'The state of the crisis',
    body: 'The escalation ladder runs from Pressure to Nuclear use; the bottom two rungs are the gray zone. Below it, the shared tracks (Taiwan’s position, coalition cohesion, economic shock, nuclear shadow) and each capital’s home support, economy and military.' },
  { el: 'intel', tab: 'sit', title: 'Reading the others',
    body: 'Every capital has a hidden type. For each rival, the table shows how it looks to you and how it seems to see you; both update after every month by Bayes’ rule. Costly moves and forward deployments say the most. These reads also matter if someone calls a peace forum: a rival that thinks your aims are limited is likelier to accept.' },
  { el: 'end-turn', title: 'End the month',
    body: 'When you are ready, end the month (here, or from Step 3). All four capitals reveal at once, the dice roll, fighting (if any) is resolved, upkeep is paid and resources refill for the next month.' },
];

export function createTour(prepare, reveal = () => {}) {
  let i = -1, lit = null;
  const card = document.createElement('div');
  card.className = 'k4-tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Walkthrough');
  document.body.appendChild(card);
  const light = el => { lit?.classList.remove('k4-hl'); lit = el; el?.classList.add('k4-hl'); };
  const show = () => {
    const s = STEPS[i];
    reveal(s);
    const el = document.getElementById(s.el), off = el && !el.getClientRects().length;   // hidden in Simple view
    light(off ? null : el);
    if (!off) el?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    card.innerHTML = `<div class="k4-tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>${off ? '<p class="fine">This part is hidden in Simple view: switch to Detailed at the top to see it.</p>' : ''}
      <div class="k4-tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= STEPS.length) stop(); else { i = n; show(); } }; });
    card.querySelector('.solid').focus({ preventScroll: true });
  };
  const start = () => { if (prepare() === false) return; i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; light(null); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
