// Guided walkthrough of one month (pattern from tools/arms-race/js/tour.js): each step highlights one part of
// the page. It starts a game as Washington if none is running.
export const STEPS = [
  { el: 'postures', title: 'Your month',
    body: 'Each month every capital picks a posture and up to four moves, all at once. Your posture caps how many escalatory (▲) moves you can make: none when you stand down, one when you de-escalate.' },
  { el: 'actions', title: 'Moves, odds and costs',
    body: 'Moves sit under seven tabs: diplomatic, information, military, economic, financial, intelligence and law enforcement. Each shows its odds and the factors behind them, and many ask a follow-up question. Some cost Lift, fuel, munitions or readiness (shown as “Cost”); some add resources. A move you cannot pay for is greyed out with the reason. Tap or hover the i beside a % for how it is worked out, and the Opportunity, Gray zone and Once a game badges for what they mean. Dashed chips are constraints from politics and allies (an election, Taiwan’s legislature, Congress, a host’s consent to use its bases, a ceasefire), each with its reason.' },
  { el: 'logi-wrap', title: 'Four resources',
    body: 'The logistics table updates as you choose. Have is what you start the month with (plus anything your moves add); Committed is what your moves, force orders and this month’s upkeep use; Left is what remains; Next month is what comes back. Lift refills every month. Fuel and munitions are stocks that rebuild slowly. Readiness is the average of your formations, and it falls while they stay forward.' },
  { el: 'forces', title: 'Formations and stances',
    body: 'Your named formations are listed with strength, readiness and place. Give each one order a month: move it (Lift and fuel), or aim a strike force. Set each sea area to Defend, Contest or Attack: Contest and Attack burn fuel every month. Send worn formations to the Rear to recover readiness.' },
  { el: 'theatre', title: 'The board and Taiwan’s coast',
    body: 'The map shows each side’s strength in the four sea areas and who holds them, and Taiwan’s four landing sectors (northwest, central-west, southwest, east) plus its inland reserve. China picks a landing emphasis; Taiwan and the United States pick where their reserve and fires wait, without seeing China’s choice. Landings are only possible from Limited strikes up.' },
  { el: 'fog', title: 'Fog of war',
    body: 'You see rival forces as ranges (“about 6–9”), sharper where your own forces are or after your surveillance pays off, rougher far away, and some formations only as “unidentified”. Feints and decoys can shift a range. The key explains each level; the computer sees you by the same rules.' },
  { el: 'logi-open', title: 'Everything you could still do',
    body: 'This list shows every decision still open this month (moves on the menu, force orders, stance changes, emphasis) with its cost, greyed when you can no longer afford it. Use “Add” to put a move straight into your plan.' },
  { el: 'intel', title: 'Reading the others',
    body: 'Every capital has a hidden type. Your read of the others, and your guess of what they think of you, update after every month by Bayes’ rule. Costly moves and forward deployments say the most. These reads also matter if someone calls a peace forum: a rival that thinks your aims are limited is likelier to accept.' },
  { el: 'end-turn', title: 'End the month',
    body: 'When you are ready, end the month. All four capitals reveal at once, the dice roll, fighting (if any) is resolved, upkeep is paid and resources refill for the next month.' },
];

export function createTour(prepare) {
  let i = -1, lit = null;
  const card = document.createElement('div');
  card.className = 'k4-tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Walkthrough');
  document.body.appendChild(card);
  const light = el => { lit?.classList.remove('k4-hl'); lit = el; el?.classList.add('k4-hl'); };
  const show = () => {
    const s = STEPS[i], el = document.getElementById(s.el);
    light(el);
    el?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    card.innerHTML = `<div class="k4-tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
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
