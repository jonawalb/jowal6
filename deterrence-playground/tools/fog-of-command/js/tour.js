// Guided walkthrough, one action per step, for the side you play. Each action step waits until you have
// done it (click a unit, click a sector, press End hour) and then moves on. The card sits away from the
// part of the page it is teaching, so it never covers the sector or button you are asked to click.
import { GAME } from '../data/params.js';

const hh = x => `${String(GAME.startClock + x).padStart(2, '0')}:00`;
const q = s => document.querySelector(s);
const sector = id => q(`#map .fc-sec[data-node="${id}"]`);
const icon = id => q(`#map [data-unit="${id}"]`);
const button = id => q(`#units [data-u="${id}"]`);
const ordered = (g, id) => g.orders.some(o => o.unit === id && o.t === g.t && !o.cancelled);

const STEPS = {
  blue: [
    { title: 'You defend', target: () => q('#box'),
      body: () => `Hold Tarn Crossing until ${hh(GAME.hours)}. Red enters from the north, at the top of the map. Your units are in the list and on the map; diamonds are enemy units you have seen, and "?" is movement your recon has reported.` },
    { title: 'Pick a unit', target: () => icon('b5') || button('b5'), also: () => button('b5'),
      do: 'Click <b>Tanks</b> on the map at Wren Cross (or in the list, or press 5).', done: s => s.sel === 'b5' },
    { title: 'Send it', target: () => sector('m1'),
      do: 'Now click <b>Brook Hill</b>, on the main line, to send the tanks there.', done: s => ordered(s.g, 'b5'),
      body: () => 'The bar says whether orders this hour start now or next hour. A clock on a unit means its order waits an hour.' },
    { title: 'Arm your artillery', target: () => q('#map .fc-bat'),
      do: 'Click your battery in the bottom-right corner of the map (or press A).', done: s => s.sel === 'b9' || !!s.g.fire.blue[s.g.t] },
    { title: 'Fire', target: () => sector('n1'),
      do: 'Now click <b>Harrow Gap</b> to fire there.', done: s => !!s.g.fire.blue[s.g.t],
      body: () => 'Recon A in Alder Woods is next to it, so it watches the fall of shot: you will see exactly what is there. The result appears next to the target and in the reports.' },
    { title: 'End the hour', target: () => q('#end'),
      do: 'Press <b>End hour</b> (or N).', done: s => s.g.t >= 1 },
    { title: 'Play on', target: () => q('#feed'), tab: 'reports',
      body: () => `Units moved and new reports came in (in the Reports tab on a phone). Keep your line, check contacts with spotted fire, and commit the reserve when one road clearly leads. A defender hit from a second direction fights at no advantage. You win if you still hold the crossing at ${hh(GAME.hours)}.` },
  ],
  red: [
    { title: 'You attack', target: () => q('#box'),
      body: () => `Take Tarn Crossing by ${hh(GAME.hours)}. The board is turned: your entry edge is at the bottom and the crossing at the top. Units not yet on the map wait in the staging tray below the edge; the dashed markers show where and when each will enter.` },
    { title: 'Pick a waiting unit', target: () => icon('r5') || button('r5'), also: () => button('r5'),
      do: 'Click <b>1 Tank</b> in the staging tray (or press 5).', done: s => s.sel === 'r5' },
    { title: 'Choose its entry', target: () => sector('n2'),
      do: 'Now click <b>Cairn Gap</b>, on your entry edge, so it enters there.', done: s => s.g.log.some(a => a.kind === 'e' && a.unit === 'r5' && a.v === 'n2') || s.g.units.find(u => u.id === 'r5').node !== 'off',
      body: () => 'Its dashed marker moves there, labelled with the hour it arrives.' },
    { title: 'Pick a unit on the map', target: () => icon('r1') || button('r1'),
      do: 'Click <b>Recon A</b>, already on the map in Harrow Gap (or press 1).', done: s => s.sel === 'r1' },
    { title: 'Send it forward', target: () => sector('f1'),
      do: 'Now click <b>Alder Woods</b> to send it forward.', done: s => ordered(s.g, 'r1'),
      body: () => 'If an order waits an hour, a clock shows on the unit and a banner says so.' },
    { title: 'Arm your artillery', target: () => q('#map .fc-bat'),
      do: 'Click your battery at the right end of the staging tray (or press A).', done: s => s.sel === 'r13' || !!s.g.fire.red[s.g.t] },
    { title: 'Fire', target: () => sector('f1'),
      do: 'Now click <b>Alder Woods</b> to fire on it: Blue has a recon troop there.', done: s => !!s.g.fire.red[s.g.t],
      body: () => 'Recon A in Harrow Gap is next door, so it watches the fall of shot. The result appears next to the target.' },
    { title: 'End the hour', target: () => q('#end'),
      do: 'Press <b>End hour</b> (or N).', done: s => s.g.t >= 1 },
    { title: 'Play on', target: () => q('#feed'), tab: 'reports',
      body: () => 'Show Blue a threat on one road with the feint and the decoy, mass on another, and attack where the defender looks thin or is already fighting: a defender hit from a second direction fights at no advantage.' },
  ],
};

/** api: { get() -> {g, me, sel}, start(side), tab(name) } */
export function createTour(card, api) {
  let i = -1, side = 'blue', lit = [], waiting = false, pendingSide = null, back = false;
  const light = els => { lit.forEach(e => e.classList.remove('fc-hl')); lit = els.filter(Boolean); lit.forEach(e => e.classList.add('fc-hl')); };
  const stop = () => { card.hidden = true; i = -1; light([]); pendingSide = null; waiting = false; };
  const steps = () => STEPS[side];

  /** Put the card in the viewport corner farthest from the target, never on top of it. */
  function place(target) {
    const W = innerWidth, H = innerHeight, m = 12;
    // On wide screens the card is as wide as the reports column, so in the right-hand corners it covers
    // only that column and never the map.
    const side = q('#side');
    card.style.width = W >= 1021 && side ? `${Math.round(side.getBoundingClientRect().width)}px` : '';
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const r = target?.isConnected ? target.getBoundingClientRect() : null;
    const spots = [[W - cw - m, H - ch - m], [m, H - ch - m], [W - cw - m, m + 60], [m, m + 60], [(W - cw) / 2, H - ch - m], [(W - cw) / 2, m + 60]];
    const hit = (b, [x, y]) => b && !(x + cw < b.left - 8 || x > b.right + 8 || y + ch < b.top - 8 || y > b.bottom + 8);
    const endB = q('#end')?.getBoundingClientRect();
    const best = spots.find(p => !hit(r, p) && !hit(endB, p)) || spots.find(p => !hit(r, p)) || spots[0];
    card.style.left = `${Math.max(m, best[0])}px`; card.style.top = `${Math.max(m, best[1])}px`;
    card.style.right = 'auto'; card.style.bottom = 'auto';
  }

  function show() {
    const s = steps()[i];
    api.tab(s.tab || 'map');
    const target = s.target();
    light([target, s.also?.()]);
    const r = target?.getBoundingClientRect();
    if (r && (r.top < 0 || r.bottom > innerHeight) && r.height < innerHeight) target.scrollIntoView({ block: 'center', behavior: 'auto' });
    const n = steps().length;
    waiting = !!s.do;
    card.innerHTML = `<div class="tour-h"><span>Walkthrough, ${side === 'blue' ? 'defending' : 'attacking'}: step ${i + 1} of ${n}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3>${s.do ? `<p class="tour-do">${s.do}</p>` : ''}${s.body ? `<p>${s.body()}</p>` : ''}
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn${s.do ? '' : ' solid'}" data-d="1">${i === n - 1 ? 'Play' : s.do ? 'Skip' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => go(i + Number(b.dataset.d)); });
    place(target);
    replace();
    if (!s.do) card.querySelector('.btn.solid')?.focus({ preventScroll: true });
    else if (!back) setTimeout(check, 0);   // the action may already be done (clicked before the card moved on)
  }
  const go = k => { back = k < i; if (k >= steps().length) stop(); else { i = Math.max(0, k); show(); } };

  function confirmCard(s) {
    pendingSide = s;
    card.hidden = false;
    light([]);
    card.innerHTML = `<div class="tour-h"><span>Walkthrough</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>Start a new game?</h3><p>The walkthrough starts a new game ${s === 'blue' ? 'as the defender' : 'as the attacker'}. To keep this one, copy its link first.</p>
      <div class="tour-nav"><button type="button" class="btn" data-c="0">Cancel</button><button type="button" class="btn solid" data-c="1">Start the walkthrough</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => (b.dataset.c === '1' ? begin(pendingSide) : stop()); });
    place(null);
  }
  function begin(s) {
    side = s; pendingSide = null;
    i = 0; card.hidden = false;
    api.start(s);
    show();
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden && !waiting) stop(); });
  // Keep the card clear of its target when the page scrolls or resizes.
  let raf = 0;
  const replace = () => { if (raf) return; raf = setTimeout(() => { raf = 0; if (!card.hidden && i >= 0 && !pendingSide) place(steps()[i].target()); }, 40); };
  addEventListener('resize', replace);
  addEventListener('scroll', replace, { passive: true });
  return {
    start: (s, ask) => (ask ? confirmCard(s) : begin(s)),
    stop,
    get open() { return !card.hidden; },
    check,
  };
  /** Called after every redraw: moves on when the step's action is done, and keeps the highlight on the redrawn map. */
  function check() {
      if (card.hidden || i < 0 || pendingSide) return;
      const s = steps()[i], st = api.get();
      if (!st.g) return;
      if (s.do && waiting && s.done(st)) {
        waiting = false;
        const p = card.querySelector('.tour-do');
        if (p) p.insertAdjacentHTML('beforeend', ' <span class="tour-ok">Done.</span>');
        const at = i;
        setTimeout(() => { if (i === at) go(i + 1); }, 500);
        return;
      }
      light([s.target(), s.also?.()]);
      place(s.target());   // the map redraws its markers, so measure the new one
  }
}
