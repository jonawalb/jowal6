// Motion for the Baltic Matrix Game: argument cards dealt onto the adjudicator's table, the net modifier and
// odds counting in, dice that tumble and land, the board's tracks counting to their new values (a shake when
// escalation rises), the result card and the debrief rising in. Presentation only: every number shown at the
// end is the one the views wrote. Off under prefers-reduced-motion.
import { countUp, reveal, pulse, shake, flash, reduced } from '../../../shared/js/motion.js';
import { skin } from '../../../shared/js/skin.js';

const rich = () => skin() === 'trailer';
// Curves come from the motion tokens (shared/css/motion.css); WAAPI cannot read var() itself.
const tok = (k, d) => getComputedStyle(document.documentElement).getPropertyValue(k).trim() || d;
const ENTER = () => tok('--ease-enter', 'cubic-bezier(0.16, 1, 0.3, 1)');

/** Count a number inside el up from `from`, then restore the exact text the view wrote. */
function countIn(el, from, to, fmt, ms = 600) {
  if (!el || reduced() || from === to) return;
  const text = el.textContent;
  countUp(el, to, { from, ms, fmt });
  setTimeout(() => { if (el.isConnected) el.textContent = text; }, ms + 80);
}

/** The adjudicator's rows arrive one by one like cards on a table, then the odds settle. */
export function dealFx(adj) {
  if (!adj || reduced()) return;
  const rows = [...adj.querySelectorAll('.mg-rows li')];
  rows.forEach((li, i) => li.animate(
    [{ opacity: 0, transform: `translateX(${rich() ? 28 : 16}px) rotate(${rich() ? 2.5 : 1}deg)` }, { opacity: 1, transform: 'none' }],
    { duration: 400, delay: i * 60, easing: ENTER(), fill: 'backwards' }));
  rows.forEach((li, i) => {
    const m = li.querySelector('.mg-mod');
    if (m && (m.classList.contains('up') || m.classList.contains('dn'))) setTimeout(() => flash(m), 300 + i * 60);
  });
  const after = 200 + rows.length * 60;
  const net = adj.querySelector('.mg-net b');
  if (net) {
    const v = parseInt(net.textContent.replace('−', '-'), 10);
    if (Number.isFinite(v)) setTimeout(() => countIn(net, 0, v, n => { const r = Math.round(n); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); }, 400), after);
  }
  const bar = adj.querySelector('.mg-pbar i');
  if (bar) bar.animate([{ width: '0%' }, { width: bar.style.width }], { duration: 750, delay: after, easing: ENTER(), fill: 'backwards' });
  const p = adj.querySelector('.mg-p');
  if (p) { const v = parseFloat(p.textContent); setTimeout(() => countIn(p, 0, v, n => `${n.toFixed(1)}% chance of success`, 750), after); }
  adj.querySelectorAll('.mg-dist .mg-bar rect').forEach((r, i) => r.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
    { duration: 400, delay: after + i * 25, easing: ENTER(), fill: 'backwards' }));
  pulse(adj.querySelector('[data-roll]'));
}

/** The dice row while it rolls: the faces the controller swaps in tumble. */
export const tumble = row => { if (row && !reduced()) row.classList.add('mg-rolling'); };

/** After the roll: dice land (the hero), then the result rises and the hit bar pulses, then the board counts to its
    new values. */
export function landFx(adj, board, delta, res) {
  if (reduced()) return;
  adj.querySelectorAll('.mg-rollrow .mg-die').forEach((d, i) => d.animate(
    [{ transform: 'translateY(-10px) rotate(-24deg) scale(1.08)' }, { transform: 'translateY(2px) rotate(4deg)', offset: .7 }, { transform: 'none' }],
    { duration: 400, delay: i * 60, easing: ENTER(), fill: 'backwards' }));
  const card = adj.querySelector('.mg-res');
  if (card) {
    card.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 400, delay: 400, easing: ENTER(), fill: 'backwards' });
    if (res && (res.band.k === 'decisive' || (rich() && res.band.k === 'success'))) setTimeout(() => pulse(card), 650);
  }
  const hit = adj.querySelector('.mg-bar.hit rect');
  if (hit) hit.animate([{ opacity: .3 }, { opacity: 1 }, { opacity: .5 }, { opacity: 1 }], { duration: 750, delay: 400 });
  boardFx(board, delta, 750);
}

/** Tracks that moved: count their value, light the change, and shake the board if escalation rose.
    wait: ms to hold last turn's values first (after a roll, so the board follows the dice). */
export function boardFx(board, delta = {}, wait = 0) {
  if (!board || reduced()) return;
  const keys = Object.keys(delta).filter(k => delta[k]);
  if (!keys.length) return;
  const tracks = [...board.querySelectorAll('.mg-track')];
  // Tracks render in TRACKS order; the delta badge marks which ones moved.
  let k = 0;
  tracks.forEach(tr => {
    const d = tr.querySelector('.mg-delta');
    if (!d) return;
    const tv = tr.querySelector('.mg-tv'), at = wait + k++ * 60;
    const v = parseInt(tv.firstChild.textContent, 10), dv = parseInt(d.textContent.replace('−', '-'), 10);
    if (Number.isFinite(v) && Number.isFinite(dv)) {
      const node = tv.firstChild, to = v, from = v - dv, t0 = performance.now() + at, ms = 400;
      node.textContent = String(from);
      const f = now => { const u = Math.max(0, Math.min(1, (now - t0) / ms)); node.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - u, 3)))); if (u < 1 && node.isConnected) requestAnimationFrame(f); else node.textContent = String(to); };
      requestAnimationFrame(f);
    }
    setTimeout(() => flash(tr), at);
    const cur = tr.querySelector('.mg-cells i.cur');
    cur?.animate([{ transform: 'scale(1.6)' }, { transform: 'none' }], { duration: 400, delay: at, easing: ENTER() });
    const line = tr.querySelector('.mg-tf polyline');
    if (line && line.getTotalLength) {
      const L = line.getTotalLength();
      line.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }], { duration: 750, delay: at, easing: ENTER(), fill: 'backwards' });
    }
  });
  if (delta.esc > 0) setTimeout(() => shake(board.closest('.card') || board), wait + 200);
}

/** A choice card was picked in the panel. */
export const pickFx = el => { if (el) pulse(el); };

/** A new inject is dealt at the start of a turn. */
export function injectFx(el) {
  if (!el || reduced()) return;
  el.animate([{ opacity: 0, transform: `translateY(${rich() ? 14 : 8}px)` }, { opacity: 1, transform: 'none' }], { duration: 400, easing: ENTER() });
}

/** Debrief: sections rise in and the goal score counts up. */
export function debriefFx(el) {
  if (!el) return;
  const parts = [...el.children];
  parts.forEach(e => e.classList.remove('m-in'));
  reveal(parts, { stagger: 60 });
  const s = el.querySelector('.status .num');
  if (s) { const v = parseFloat(s.textContent); if (Number.isFinite(v)) countIn(s, 0, v, n => n.toFixed(1), 750); }
}
