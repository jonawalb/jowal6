// Guided walkthrough (Fog of Command's step engine; SPEC §8.7). The card sits in the corner farthest from what
// it teaches, never over the End hour button, and while it is open the page is padded at the bottom by the
// card's height so nothing is ever stuck under it. Game keys keep working: only keys typed inside the card
// belong to it (js/ui/keys.js ignores them).
// 2026-10-04: one engine, three tracks: the full walkthroughs ('def', 'att', js/ui/tour-steps.js) and the
// "Learn to play" lesson ('learn', js/ui/tutorial-steps.js, played on the small tutorial battle). A step may
// have skip() (left out when it returns true, e.g. "counterattack" when nothing was lost). Each new step is
// announced in a live region (#tour-live) and keyboard focus moves into the card; Escape closes it.
import { STEPS as TOUR } from './tour-steps.js';
import { LEARN_STEPS } from './tutorial-steps.js';

const TRACKS = { ...TOUR, learn: LEARN_STEPS };
const NAME = { def: 'Walkthrough, defending', att: 'Walkthrough, attacking', learn: 'Learn to play' };
const strip = h => String(h || '').replace(/<[^>]+>/g, '');

/** api: { start(track), tab(name), done?(track) } */
export function createTour(card, api) {
  let i = -1, track = 'def', lit = [], waiting = false, s0 = null, back = false, confirmTrack = null;
  const steps = () => TRACKS[track];
  const live = document.getElementById('tour-live');
  const light = els => { lit.forEach(e => e.classList.remove('dd-hl-tour')); lit = els.filter(Boolean); lit.forEach(e => e.classList.add('dd-hl-tour')); };
  const pad = () => { document.body.style.paddingBottom = card.hidden ? '' : `${Math.ceil(card.offsetHeight) + 16}px`; };
  const stop = () => { card.hidden = true; i = -1; light([]); waiting = false; confirmTrack = null; card.classList.remove('learn'); pad(); };
  const skipped = k => { const s = steps()[k]; try { return !!(s && s.skip && s.skip()); } catch { return false; } };
  // Step numbers as the player sees them: steps skipped so far are not counted (later skips are not guessed,
  // so the count only ever shrinks when a step is actually passed over).
  let gone = 0;
  const shown = () => steps().length - gone;
  const nth = () => i + 1 - gone;

  function place(target) {
    const W = innerWidth, H = innerHeight, m = 12;
    const side = document.getElementById('side');
    const open = ['upop', 'sheet'].map(id => document.getElementById(id)).filter(e => e && !e.hidden).map(e => e.getBoundingClientRect());
    // Phones, while the unit's orders or the "units here" list are open: only the instruction shows, so the card,
    // the orders and the boxes to tap all fit on one screen (the explanation was read when the step opened).
    card.classList.toggle('compact', W <= 640 && open.length > 0 && !!(i >= 0 && !confirmTrack && steps()[i] && steps()[i].do));
    card.style.width = W >= 1021 && side ? `${Math.max(300, Math.round(side.getBoundingClientRect().width))}px` : '';
    const cw = card.offsetWidth, ch = card.offsetHeight;
    // The area to keep clear: the target, plus anything the step asks for (clear(): e.g. the box you must tap next).
    const st = i >= 0 && !confirmTrack ? steps()[i] : null;
    const r = target && target.isConnected ? target.getBoundingClientRect() : null;
    const more = st && st.clear ? (st.clear() || []).filter(e => e && e.isConnected).map(e => e.getBoundingClientRect()) : [];
    const spots = [[W - cw - m, H - ch - m], [m, H - ch - m], [W - cw - m, m], [m, m]];
    const hit = (b, [x, y]) => b && !(x + cw < b.left - 8 || x > b.right + 8 || y + ch < b.top - 8 || y > b.bottom + 8);
    const endB = document.getElementById('end')?.getBoundingClientRect();
    // 2026-10-04: never cover the unit's orders (popover / phone bottom sheet) or the "units here" list either.
    // Most important first: the open orders, then the target, then the step's other boxes, then End hour.
    const openFree = p => open.every(o => !hit(o, p)), clearFree = p => more.every(o => !hit(o, p));
    const best = spots.find(p => openFree(p) && !hit(r, p) && clearFree(p) && !hit(endB, p)) || spots.find(p => openFree(p) && !hit(r, p) && clearFree(p))
      || spots.find(p => openFree(p) && !hit(r, p)) || spots.find(openFree) || spots.find(p => !hit(r, p)) || spots[0];
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
    const n = shown(), k = nth(), last = steps().slice(i + 1).every((_, j) => skipped(i + 1 + j));
    waiting = !!s.do;
    card.hidden = false;
    card.classList.toggle('learn', track === 'learn');
    const title = typeof s.title === 'function' ? s.title() : s.title;
    const body = s.body ? `<p>${s.body()}</p>` : '', act = s.do ? `<p class="tour-do">${s.do()}</p>` : '';
    // The lesson explains first, then asks; the walkthroughs lead with the action (on phones they show only it).
    card.innerHTML = `<div class="tour-h"><span>${NAME[track]}: step ${k} of ${n}</span><button type="button" class="x" aria-label="Close: ${NAME[track].toLowerCase()}">×</button></div>
      <h3 tabindex="-1">${title}</h3>${track === 'learn' ? body + act : act + body}
      <div class="tour-nav"><button type="button" class="btn" ${k <= 1 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn${s.do ? '' : ' solid'}" data-d="1">${last ? (s.end || 'Play') : s.do ? 'Skip' : 'Next'}</button></div>`;
    card.setAttribute('aria-label', NAME[track]);
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => go(Number(b.dataset.d)); });
    place(target);
    if (live) live.textContent = `${NAME[track]}, step ${k} of ${n}: ${strip(title)}. ${strip(s.body ? s.body() : '')} ${strip(s.do ? s.do() : '')}`;
    // Focus moves into the card: the Next button on a reading step, the heading on a "do" step (so the step's
    // words come first and the page is one Tab away).
    if (!s.do) card.querySelector('.btn.solid')?.focus({ preventScroll: true });
    else { card.querySelector('h3').focus({ preventScroll: true }); if (!back) setTimeout(check, 0); }
  }
  /** Step d (+1 / -1) from here, passing over skipped steps; past the last step the card closes. */
  const go = d => {
    back = d < 0;
    let k = i + d;
    while (k >= 0 && k < steps().length && skipped(k)) { k += d; gone += d > 0 ? 1 : 0; }
    if (k >= steps().length) { const t = track; stop(); if (api.done) api.done(t); return; }
    if (k < 0) return;
    i = k; show();
  };

  function confirmCard(tr) {
    confirmTrack = tr; card.hidden = false; light([]);
    const what = tr === 'learn' ? 'The lesson starts a small practice battle' : `The walkthrough starts a new Division, 1917–18, Standard battle ${tr === 'def' ? 'as the defender' : 'as the attacker'}`;
    card.innerHTML = `<div class="tour-h"><span>${NAME[tr]}</span><button type="button" class="x" aria-label="Close">×</button></div>
      <h3 tabindex="-1">Leave this battle?</h3><p>${what}. To keep this battle, copy its link first.</p>
      <div class="tour-nav"><button type="button" class="btn" data-c="0">Cancel</button><button type="button" class="btn solid" data-c="1">${tr === 'learn' ? 'Start the lesson' : 'Start the walkthrough'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => (b.dataset.c === '1' ? begin(confirmTrack) : stop()); });
    place(null);
    card.querySelector('[data-c="1"]').focus({ preventScroll: true });
  }
  function begin(tr) {
    track = tr; confirmTrack = null; i = -1; gone = 0;
    api.start(tr);
    go(1);
  }

  /** After every redraw: move on when the step's action is done; keep the highlight on the redrawn page. */
  function check() {
    if (card.hidden || i < 0 || confirmTrack) return;
    const s = steps()[i];
    if (s.do && waiting && s.done(s0)) {
      waiting = false;
      const p = card.querySelector('.tour-do');
      if (p) p.insertAdjacentHTML('beforeend', ' <span class="tour-ok">Done.</span>');
      if (live) live.textContent = 'Done.';
      const at = i;
      setTimeout(() => { if (i === at) go(1); }, 500);
      return;
    }
    light([s.target()]);
    place(s.target());
  }

  let raf = 0;
  const replace = () => { if (raf) return; raf = setTimeout(() => { raf = 0; if (!card.hidden && i >= 0 && !confirmTrack) place(steps()[i].target()); else pad(); }, 60); };
  addEventListener('resize', replace);
  addEventListener('scroll', replace, { passive: true });
  card.addEventListener('keydown', e => { if (e.key === 'Escape') { stop(); e.stopPropagation(); } });
  return {
    start: (tr, ask) => (ask ? confirmCard(tr) : begin(tr)), stop, check,
    get open() { return !card.hidden; }, get track() { return card.hidden ? null : track; },
  };
}
