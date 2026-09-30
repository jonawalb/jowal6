// Motion for the Crisis Stability Calculator: the index and first-strike cost readouts count to their new values,
// the probability-domain box slides to its new size, draw-down curves draw in for a new posture, and the status
// card pulses (and shakes when stability turns fragile). Presentation only.
import { pulse, shake, ping, burst } from '../../../shared/js/motion.js';
import { reduced, trailer, count, tween, replay, num } from './fxkit.js';

const $ = id => document.getElementById(id);
const f2 = v => v.toFixed(2);
let last = null, stopBox = () => {};

function drawIn(svg, sel, ms = 700) {
  if (reduced()) return;
  svg.querySelectorAll(sel).forEach((p, i) => {
    const L = p.getTotalLength();
    if (!L) return;
    const dash = getComputedStyle(p).strokeDasharray;
    if (dash && dash !== 'none') { p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, delay: i * 90 }); return; }
    p.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }],
      { duration: ms, delay: i * 90, easing: 'cubic-bezier(.2,.8,.2,1)' });
  });
}

/** Slide the probability-domain box and ratio lines from their last geometry. */
function slideBox(prev) {
  const svg = $('prob'), a = svg.querySelector('.pd-a'), la = svg.querySelector('.pd-la'), lb = svg.querySelector('.pd-lb');
  const now = { y: +a.getAttribute('y'), w: +a.getAttribute('width'), h: +a.getAttribute('height'), x: +la.getAttribute('x1'), ly: +lb.getAttribute('y1') };
  stopBox();
  if (prev) {
    const L = (k, u) => prev[k] + (now[k] - prev[k]) * u;
    stopBox = tween(prev.w === now.w && prev.h === now.h ? 1 : 420, u => {
      a.setAttribute('y', L('y', u)); a.setAttribute('width', L('w', u)); a.setAttribute('height', L('h', u));
      la.setAttribute('x1', L('x', u)); la.setAttribute('x2', L('x', u)); lb.setAttribute('y1', L('ly', u)); lb.setAttribute('y2', L('ly', u));
    });
  }
  return now;
}

export function afterUpdate(S, R) {
  const big = !last || S.preset !== last.preset;
  const ms = big ? 750 : 260, T = trailer();

  // Headline index and the cost table count.
  count($('idx'), last?.index ?? 0, R.index, f2, ms);
  const cells = [...document.querySelectorAll('#costs td.num')];
  const vals = cells.map(td => num(td.textContent));
  cells.forEach((td, i) => count(td, last?.costs?.[i] ?? 0, vals[i], f2, ms));

  // Status card: pulse when the stability band changes; shake when it turns fragile.
  const st = $('status'), band = st.dataset.s;
  if (last && band !== last.band) {
    replay(st, 'fx-flash');
    if (band === 'bad') shake(st); else pulse(st);
  }

  const box = slideBox(last?.box);

  if (big) {
    drawIn($('domain'), '.dd', T ? 900 : 650);
    drawIn($('sweep'), '.swl', 600);
    pulse(document.querySelector('#presets [aria-pressed="true"]'));
    if (last) replay($('summary'), 'fx-flash');
    const svg = $('domain');
    svg.querySelectorAll('.stop').forEach((c, i) => setTimeout(() => {
      if (!c.isConnected) return;
      const x = +c.getAttribute('cx'), y = +c.getAttribute('cy'), col = i ? 'var(--sb)' : 'var(--sa)';
      ping(svg, x, y, { color: col, r: T ? 34 : 22 });
      if (T) burst(svg, x, y, { color: col, n: 10, r: 20 });
    }, reduced() ? 0 : (T ? 900 : 650)));
  }
  last = { preset: S.preset, index: R.index, costs: vals, band, box };
}

/** A new sweep input was picked: draw its lines in. */
export function afterSweep() { drawIn($('sweep'), '.swl', 600); }
