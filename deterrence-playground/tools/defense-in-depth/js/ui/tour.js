// Guided walkthrough (Fog of Command's step engine; SPEC §8.7). The card sits in the corner farthest from what
// it teaches, never over the End hour button, and while it is open the page is padded at the bottom by the
// card's height so nothing is ever stuck under it. Game keys keep working: only keys typed inside the card
// belong to it (js/ui/keys.js ignores them).
import { STEPS } from './tour-steps.js';

/** api: { start(side), tab(name), after() } */
export function createTour(card, api) {
  let i = -1, side = 'def', lit = [], waiting = false, s0 = null, back = false, confirmSide = null;
  const steps = () => STEPS[side];
  const light = els => { lit.forEach(e => e.classList.remove('dd-hl-tour')); lit = els.filter(Boolean); lit.forEach(e => e.classList.add('dd-hl-tour')); };
  const pad = () => { document.body.style.paddingBottom = card.hidden ? '' : `${Math.ceil(card.offsetHeight) + 16}px`; };
  const stop = () => { card.hidden = true; i = -1; light([]); waiting = false; confirmSide = null; pad(); };

  function place(target) {
    const W = innerWidth, H = innerHeight, m = 12;
    const side = document.getElementById('side');
    card.style.width = W >= 1021 && side ? `${Math.max(300, Math.round(side.getBoundingClientRect().width))}px` : '';
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const r = target && target.isConnected ? target.getBoundingClientRect() : null;
    const spots = [[W - cw - m, H - ch - m], [m, H - ch - m], [W - cw - m, m], [m, m]];
    const hit = (b, [x, y]) => b && !(x + cw < b.left - 8 || x > b.right + 8 || y + ch < b.top - 8 || y > b.bottom + 8);
    const endB = document.getElementById('end')?.getBoundingClientRect();
    const best = spots.find(p => !hit(r, p) && !hit(endB, p)) || spots.find(p => !hit(r, p)) || spots[0];
    // Clear the stylesheet's right/bottom anchors: with top AND bottom set, a fixed card is squeezed to fit
    // between them and its text gets cut off.
    card.style.right = 'auto'; card.style.bottom = 'auto';
    card.style.left = `${Math.max(m, best[0])}px`; card.style.top = `${Math.max(m, best[1])}px`;
    pad();
  }

  function show() {
    const s = steps()[i];
    api.tab(s.tab || 'map');
    s0 = s.start ? s.start() : null;
    let target = s.target();
    // QA fix: on phones the selection panel (#sel) lives on the Map tab, so a step aimed at it must show that tab.
    if (target && !target.getClientRects().length) {
      const t = target.closest('#mcol') ? 'map' : target.closest('#ucol') ? 'units' : null;
      if (t && t !== (s.tab || 'map')) { api.tab(t); target = s.target(); }
    }
    light([target]);
    const r = target?.getBoundingClientRect();
    if (r && (r.top < 0 || r.bottom > innerHeight) && r.height < innerHeight) target.scrollIntoView({ block: 'center', behavior: 'auto' });
    const n = steps().length;
    waiting = !!s.do;
    card.hidden = false;
    card.innerHTML = `<div class="tour-h"><span>Walkthrough, ${side === 'def' ? 'defending' : 'attacking'}: step ${i + 1} of ${n}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3>${s.do ? `<p class="tour-do">${s.do()}</p>` : ''}${s.body ? `<p>${s.body()}</p>` : ''}
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn${s.do ? '' : ' solid'}" data-d="1">${i === n - 1 ? 'Play' : s.do ? 'Skip' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => go(i + Number(b.dataset.d)); });
    place(target);
    if (!s.do) card.querySelector('.btn.solid')?.focus({ preventScroll: true });
    else if (!back) setTimeout(check, 0);
  }
  const go = k => { back = k < i; if (k >= steps().length) stop(); else { i = Math.max(0, k); show(); } };

  function confirmCard(sd) {
    confirmSide = sd; card.hidden = false; light([]);
    card.innerHTML = `<div class="tour-h"><span>Walkthrough</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>Start a new game?</h3><p>The walkthrough starts a new Division, 1917–18, Standard battle ${sd === 'def' ? 'as the defender' : 'as the attacker'}. To keep this one, copy its link first.</p>
      <div class="tour-nav"><button type="button" class="btn" data-c="0">Cancel</button><button type="button" class="btn solid" data-c="1">Start the walkthrough</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => (b.dataset.c === '1' ? begin(confirmSide) : stop()); });
    place(null);
  }
  function begin(sd) { side = sd; confirmSide = null; i = 0; api.start(sd); show(); }

  /** After every redraw: move on when the step's action is done; keep the highlight on the redrawn page. */
  function check() {
    if (card.hidden || i < 0 || confirmSide) return;
    const s = steps()[i];
    if (s.do && waiting && s.done(s0)) {
      waiting = false;
      const p = card.querySelector('.tour-do');
      if (p) p.insertAdjacentHTML('beforeend', ' <span class="tour-ok">Done.</span>');
      const at = i;
      setTimeout(() => { if (i === at) go(i + 1); }, 500);
      return;
    }
    light([s.target()]);
    place(s.target());
  }

  let raf = 0;
  const replace = () => { if (raf) return; raf = setTimeout(() => { raf = 0; if (!card.hidden && i >= 0 && !confirmSide) place(steps()[i].target()); else pad(); }, 60); };
  addEventListener('resize', replace);
  addEventListener('scroll', replace, { passive: true });
  card.addEventListener('keydown', e => { if (e.key === 'Escape') { stop(); e.stopPropagation(); } });
  return { start: (sd, ask) => (ask ? confirmCard(sd) : begin(sd)), stop, check, get open() { return !card.hidden; } };
}
