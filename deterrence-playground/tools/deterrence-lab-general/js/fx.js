// Motion for the Deterrence Lab. Every view redraws from scratch on each change; this layer remembers what was on
// screen a moment ago and moves it to the new picture: model curves bend into their new shape, the current
// point and the "now" line glide, equilibrium-path edges thicken or thin, and readout numbers count to their new
// values. The new picture is always drawn first with the true values; the motion only covers the last ~quarter
// second. While you drag on a plot the point follows your pointer with no delay. Off under prefers-reduced-motion.
import { countUp, flash, pulse, reduced } from '../../../shared/js/motion.js';

const ease = u => 1 - Math.pow(1 - u, 3);
const rich = () => document.documentElement.dataset.skin === 'trailer';
const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
let dragging = false;
addEventListener('pointerdown', e => { dragging = !!e.target.closest?.('svg.region, svg.lines'); });
addEventListener('pointerup', () => { dragging = false; });
addEventListener('pointercancel', () => { dragging = false; });

/** Everything that can move, keyed by figure and order. */
export function snap(root) {
  const s = { d: new Map(), at: new Map(), sw: new Map(), dd: new Map(), st: new Map() };
  root.querySelectorAll('svg[id]').forEach(svg => {
    svg.querySelectorAll('path.ln').forEach((p, i) => s.d.set(`${svg.id}:ln${i}`, p.getAttribute('d')));
    svg.querySelectorAll('circle.mark').forEach((c, i) => s.at.set(`${svg.id}:mk${i}`, [+c.getAttribute('cx'), +c.getAttribute('cy')]));
    svg.querySelectorAll('line.now').forEach((l, i) => s.at.set(`${svg.id}:now${i}`, [+l.getAttribute('x1'), +l.getAttribute('x2')]));
    svg.querySelectorAll('line.edge').forEach((l, i) => s.sw.set(`${svg.id}:e${i}`, +l.getAttribute('stroke-width')));
  });
  root.querySelectorAll('dl.readout, table.mini').forEach((dl, j) => dl.querySelectorAll('dd, td.num').forEach((d, i) => s.dd.set(`${j}:${i}`, d.textContent)));
  root.querySelectorAll('.status').forEach((b, i) => s.st.set(i, b.querySelector('b')?.textContent));
  return s;
}

function tween(ms, frame) {
  const t0 = performance.now();
  const step = now => { const u = Math.min(1, (now - t0) / ms); if (frame(ease(u)) === false) return; if (u < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/** Move from the old picture (a snap taken before render) to the one on screen now. */
export function morph(root, before) {
  if (!before || reduced()) return;
  const ms = rich() ? 320 : 260, jobs = [];
  root.querySelectorAll('svg[id]').forEach(svg => {
    svg.querySelectorAll('path.ln').forEach((p, i) => {
      const a = before.d.get(`${svg.id}:ln${i}`), b = p.getAttribute('d');
      if (!a || a === b) return;
      const na = a.match(NUM) || [], nb = b.match(NUM) || [];
      if (na.length !== nb.length || a.replace(NUM, '#') !== b.replace(NUM, '#')) return;   // different shape: draw it as is
      const parts = b.split(NUM);
      jobs.push(e => { if (!p.isConnected) return false; p.setAttribute('d', parts.map((t, k) => k < nb.length ? t + (+na[k] + (nb[k] - na[k]) * e).toFixed(1) : t).join('')); });
    });
    if (!dragging) svg.querySelectorAll('circle.mark').forEach((c, i) => {
      const a = before.at.get(`${svg.id}:mk${i}`), bx = +c.getAttribute('cx'), by = +c.getAttribute('cy');
      if (!a || (Math.abs(a[0] - bx) < .5 && Math.abs(a[1] - by) < .5)) return;
      jobs.push(e => { if (!c.isConnected) return false; c.setAttribute('cx', a[0] + (bx - a[0]) * e); c.setAttribute('cy', a[1] + (by - a[1]) * e); });
    });
    if (!dragging) svg.querySelectorAll('line.now').forEach((l, i) => {
      const a = before.at.get(`${svg.id}:now${i}`), b = +l.getAttribute('x1');
      if (!a || Math.abs(a[0] - b) < .5) return;
      jobs.push(e => { if (!l.isConnected) return false; const x = a[0] + (b - a[0]) * e; l.setAttribute('x1', x); l.setAttribute('x2', x); });
    });
    svg.querySelectorAll('line.edge').forEach((l, i) => {
      const a = before.sw.get(`${svg.id}:e${i}`), b = +l.getAttribute('stroke-width');
      if (a === undefined || Math.abs(a - b) < .05) return;
      jobs.push(e => { if (!l.isConnected) return false; l.setAttribute('stroke-width', (a + (b - a) * e).toFixed(2)); });
    });
  });
  // Readouts: numbers count to their new value; a changed value flashes once the pointer is up.
  root.querySelectorAll('dl.readout, table.mini').forEach((dl, j) => dl.querySelectorAll('dd, td.num').forEach((d, i) => {
    const was = before.dd.get(`${j}:${i}`), now = d.textContent;
    if (was === undefined || was === now) return;
    const mw = /^(−?-?[\d.]+)(%?)$/.exec(was), mn = /^(−?-?[\d.]+)(%?)$/.exec(now);
    if (mw && mn && mw[2] === mn[2]) {
      const num = t => +t.replace('−', '-'), dec = (mn[1].split('.')[1] || '').length, suf = mn[2];
      countUp(d, num(mn[1]), { from: num(mw[1]), ms, fmt: v => { const t = v.toFixed(dec); return (+t < 0 ? t.replace('-', '−') : t.replace('-', '')) + suf; } });
    }
    if (!dragging) flash(d);
  }));
  root.querySelectorAll('.status').forEach((b, i) => {
    const was = before.st.get(i), now = b.querySelector('b')?.textContent;
    if (was !== undefined && was !== now) { flash(b); if (rich()) pulse(b); }
  });
  if (jobs.length) tween(ms, e => { let live = false; for (const j of jobs) if (j(e) !== false) live = true; return live; });
}

/** First view of a model (page load or a new tab): curves and the equilibrium path draw themselves in. */
export function drawIn(root) {
  if (reduced()) return;
  root.querySelectorAll('path.ln, .tree line.edge.on').forEach((p, i) => {
    const L = p.getTotalLength?.();
    if (!L) return;
    p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L;
    p.style.transition = `stroke-dashoffset .6s cubic-bezier(.3,.7,.2,1) ${Math.min(i * 40, 300)}ms`;
    requestAnimationFrame(() => requestAnimationFrame(() => { p.style.strokeDashoffset = 0; }));
    const clear = () => { p.style.strokeDasharray = p.style.strokeDashoffset = p.style.transition = ''; };
    p.addEventListener('transitionend', clear, { once: true });
    setTimeout(clear, 1200);
  });
  root.querySelectorAll('.raster').forEach(r => r.animate?.([{ opacity: 0 }, { opacity: r.getAttribute('opacity') || 1 }], { duration: 450, easing: 'ease-out' }));
  root.querySelectorAll('.strip li').forEach((li, i) => li.animate?.([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: Math.min(i * 25, 400), easing: 'ease-out', fill: 'backwards' }));
}
