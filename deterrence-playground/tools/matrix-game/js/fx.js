// Motion for the Baltic Matrix Game: argument cards dealt onto the adjudicator's table, the net modifier and
// odds counting in, dice that tumble and land, the board's tracks counting to their new values (a shake when
// escalation rises), the result card and the debrief rising in. Presentation only: every number shown at the
// end is the one the views wrote. Off under prefers-reduced-motion.
import { countUp, reveal, pulse, shake, flash, reduced } from '../../../shared/js/motion.js';
import { skin } from '../../../shared/js/skin.js';

const rich = () => skin() === 'trailer';

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
    { duration: 380, delay: i * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
  rows.forEach((li, i) => {
    const m = li.querySelector('.mg-mod');
    if (m && (m.classList.contains('up') || m.classList.contains('dn'))) setTimeout(() => flash(m), 300 + i * 90);
  });
  const after = 200 + rows.length * 90;
  const net = adj.querySelector('.mg-net b');
  if (net) {
    const v = parseInt(net.textContent.replace('−', '-'), 10);
    if (Number.isFinite(v)) setTimeout(() => countIn(net, 0, v, n => { const r = Math.round(n); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); }, 400), after);
  }
  const bar = adj.querySelector('.mg-pbar i');
  if (bar) bar.animate([{ width: '0%' }, { width: bar.style.width }], { duration: 650, delay: after, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'backwards' });
  const p = adj.querySelector('.mg-p');
  if (p) { const v = parseFloat(p.textContent); setTimeout(() => countIn(p, 0, v, n => `${n.toFixed(1)}% chance of success`, 650), after); }
  adj.querySelectorAll('.mg-dist .mg-bar rect').forEach((r, i) => r.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
    { duration: 420, delay: after + i * 25, easing: 'ease-out', fill: 'backwards' }));
  pulse(adj.querySelector('[data-roll]'));
}

/** The dice row while it rolls: the faces the controller swaps in tumble. */
export const tumble = row => { if (row && !reduced()) row.classList.add('mg-rolling'); };

/** After the roll: dice land, the result rises, the hit bar pulses, the board counts to its new values. */
export function landFx(adj, board, delta, res) {
  if (reduced()) return;
  adj.querySelectorAll('.mg-rollrow .mg-die').forEach((d, i) => d.animate(
    [{ transform: 'translateY(-10px) rotate(-24deg) scale(1.08)' }, { transform: 'translateY(2px) rotate(4deg)', offset: .7 }, { transform: 'none' }],
    { duration: 420, delay: i * 60, easing: 'ease-out', fill: 'backwards' }));
  const card = adj.querySelector('.mg-res');
  if (card) {
    card.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'ease-out', fill: 'backwards' });
    if (res && (res.band.k === 'decisive' || (rich() && res.band.k === 'success'))) setTimeout(() => pulse(card), 250);
  }
  const hit = adj.querySelector('.mg-bar.hit rect');
  if (hit) hit.animate([{ opacity: .3 }, { opacity: 1 }, { opacity: .5 }, { opacity: 1 }], { duration: 700, delay: 150 });
  boardFx(board, delta);
}

/** Tracks that moved: count their value, light the change, and shake the board if escalation rose. */
export function boardFx(board, delta = {}) {
  if (!board || reduced()) return;
  const keys = Object.keys(delta).filter(k => delta[k]);
  if (!keys.length) return;
  const tracks = [...board.querySelectorAll('.mg-track')];
  // Tracks render in TRACKS order; the delta badge marks which ones moved.
  tracks.forEach(tr => {
    const d = tr.querySelector('.mg-delta');
    if (!d) return;
    const tv = tr.querySelector('.mg-tv');
    const v = parseInt(tv.firstChild.textContent, 10), dv = parseInt(d.textContent.replace('−', '-'), 10);
    if (Number.isFinite(v) && Number.isFinite(dv)) {
      const node = tv.firstChild, to = v, from = v - dv, t0 = performance.now(), ms = 600;
      const f = now => { const u = Math.max(0, Math.min(1, (now - t0) / ms)); node.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - u, 3)))); if (u < 1 && node.isConnected) requestAnimationFrame(f); else node.textContent = String(to); };
      requestAnimationFrame(f);
    }
    flash(tr);
    const cur = tr.querySelector('.mg-cells i.cur');
    cur?.animate([{ transform: 'scale(1.6)' }, { transform: 'none' }], { duration: 500, easing: 'ease-out' });
    const line = tr.querySelector('.mg-tf polyline');
    if (line && line.getTotalLength) {
      const L = line.getTotalLength();
      line.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }], { duration: 700, easing: 'ease-out' });
    }
  });
  if (delta.esc > 0) setTimeout(() => shake(board.closest('.card') || board), 200);
}

/** A choice card was picked in the panel. */
export const pickFx = el => { if (el) pulse(el); };

/** A new inject is dealt at the start of a turn. */
export function injectFx(el) {
  if (!el || reduced()) return;
  el.animate([{ opacity: 0, transform: `translateY(${rich() ? 14 : 8}px)` }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

/** Debrief: sections rise in and the goal score counts up. */
export function debriefFx(el) {
  if (!el) return;
  const parts = [...el.children];
  parts.forEach(e => e.classList.remove('m-in'));
  reveal(parts, { stagger: 60 });
  const s = el.querySelector('.status .num');
  if (s) { const v = parseFloat(s.textContent); if (Number.isFinite(v)) countIn(s, 0, v, n => n.toFixed(1), 800); }
}
