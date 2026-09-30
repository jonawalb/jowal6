// Motion for Is It a Nuke? The belief chain updates row by row as each clue arrives: bars slide from the last
// belief to the new one, starting at the first piece of evidence that changed and running down the chain. Costs
// count, the Pr(nuclear) marker glides along the decision strip, the recommendation pulses (and shakes when it
// becomes launch on warning), and the campaign-map point pings when moved. Presentation only.
import { ping, pulse, shake } from '../../../shared/js/motion.js';
import { reduced, trailer, count, tween, replay, num } from './fxkit.js';

let last = null;
const stops = [], timers = [];
const pctFmt = v => Math.round(v) + '%';

function chain(svg, prev) {
  stops.splice(0).forEach(f => f());
  timers.splice(0).forEach(clearTimeout);
  const now = {};
  const segs = [...svg.querySelectorAll('rect.seg')];
  segs.forEach(r => { now[r.dataset.row + '|' + r.dataset.s] = { x: +r.getAttribute('x'), w: +r.getAttribute('width') }; });
  if (reduced()) return now;
  const rows = [...new Set(segs.map(r => +r.dataset.row))].sort((a, b) => a - b);
  const diff = k => !prev || segs.some(r => +r.dataset.row === k && (!prev[k + '|' + r.dataset.s] ||
    Math.abs(prev[k + '|' + r.dataset.s].x - now[k + '|' + r.dataset.s].x) > 0.5 || Math.abs(prev[k + '|' + r.dataset.s].w - now[k + '|' + r.dataset.s].w) > 0.5));
  const first = rows.find(diff);
  if (first === undefined) return now;
  const T = trailer();
  rows.filter(k => k >= first).forEach(k => {
    const delay = (k - first) * (prev ? 140 : 200);
    const from = s => {
      if (prev) return prev[k + '|' + s] || { x: now[k + '|' + s].x, w: 0 };
      if (k > 0 && now[(k - 1) + '|' + s]) return now[(k - 1) + '|' + s];
      return { x: now[k + '|' + s].x, w: 0 };
    };
    const items = segs.filter(r => +r.dataset.row === k).map(r => {
      const s = r.dataset.s, a = from(s), b = now[k + '|' + s];
      const lab = svg.querySelector(`text.segl[data-row="${k}"][data-s="${s}"]`);
      return { r, lab, a, b };
    });
    items.forEach(({ r, lab, a }) => { r.setAttribute('x', a.x); r.setAttribute('width', a.w); if (lab) lab.setAttribute('x', a.x + a.w / 2); });
    stops.push(tween(prev ? 420 : 520, u => items.forEach(({ r, lab, a, b }) => {
      const x = a.x + (b.x - a.x) * u, w = a.w + (b.w - a.w) * u;
      r.setAttribute('x', x); r.setAttribute('width', w); if (lab) lab.setAttribute('x', x + w / 2);
    }), delay));
    // The clue lands: a ping where the nuclear share begins on this row.
    const n = now[k + '|N'];
    if (n && (k === first || T)) timers.push(setTimeout(() => {
      if (!svg.isConnected) return;
      const y = +items[0].r.getAttribute('y') + 15;
      ping(svg, n.x, y, { color: 'var(--bad)', r: T ? 28 : 16, width: T ? 2.4 : 1.6 });
    }, delay + (prev ? 420 : 520)));
  });
  return now;
}

function decision(svg, prev) {
  const bars = [...svg.querySelectorAll('rect.cbar')], ticks = [...svg.querySelectorAll('text.tk')].slice(0, bars.length);
  const now = { w: bars.map(b => +b.getAttribute('width')), t: ticks.map(t => t.textContent), cx: +svg.querySelector('.pbl').getAttribute('x1') };
  if (!prev || reduced()) return now;
  bars.forEach((b, i) => {
    if (Math.abs(prev.w[i] - now.w[i]) < 0.5 || !now.w[i]) return;
    b.style.transformBox = 'fill-box'; b.style.transformOrigin = 'left center';
    b.animate([{ transform: `scaleX(${Math.min(4, prev.w[i] / now.w[i])})` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  });
  ticks.forEach((t, i) => { if (/^\d+$/.test(t.textContent) && /^\d+$/.test(prev.t[i] || '') && prev.t[i] !== t.textContent) count(t, +prev.t[i], +t.textContent, v => String(Math.round(v)), 420); });
  const dx = prev.cx - now.cx;
  if (Math.abs(dx) > 0.5) svg.querySelectorAll('.pbm, .pbl, .cuml').forEach(e =>
    e.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)' }));
  return now;
}

export function afterRender(P, mu, dec) {
  const T = trailer();
  const ch = chain(document.getElementById('wa-chain'), last?.chain);
  const dv = decision(document.getElementById('wa-dec'), last?.dec);

  // Readouts: beliefs and expected costs count to their new values.
  const dds = [...document.querySelectorAll('#wa-read dd')], vals = dds.map(d => d.textContent);
  if (last) dds.forEach((d, i) => {
    const a = last.read[i], b = vals[i];
    if (a === b || a == null) return;
    if (/^\d+%$/.test(a) && /^\d+%$/.test(b)) count(d, num(a), num(b), pctFmt, 450);
    else if (/^\d+$/.test(a) && /^\d+$/.test(b)) count(d, +a, +b, v => String(Math.round(v)), 450);
  });

  // The recommendation.
  const box = document.getElementById('wa-status');
  if (last && dec.best !== last.best) {
    replay(box, 'fx-flash');
    if (dec.best === 'low') shake(box); else pulse(box);
  }

  // Which control changed: pulse it.
  if (last) {
    const panel = document.getElementById('panel');
    const pick = (i, v) => panel.querySelectorAll('.choices')[i]?.querySelector(`button[data-v="${v}"]`);
    if (P.ctx !== last.P.ctx) pulse(pick(0, P.ctx));
    if (P.site !== last.P.site) pulse(pick(1, P.site));
    if (P.traj !== last.P.traj) pulse(pick(2, P.traj));
    if (P.corr !== last.P.corr) pulse(document.getElementById('wa-corr')?.nextElementSibling);
    // Campaign map point.
    if (P.pNuc !== last.P.pNuc || P.E !== last.P.E) {
      const map = document.getElementById('wa-map'), m = map.querySelector('.mark');
      if (m) ping(map, +m.getAttribute('cx'), +m.getAttribute('cy'), { color: T ? 'var(--accent)' : 'var(--ink)', r: T ? 26 : 16 });
    }
    document.querySelectorAll('#wa-rates .tile b').forEach((b, i) => { if (last.rates[i] !== b.textContent) replay(b.parentElement, 'fx-flash'); });
  }
  last = { chain: ch, dec: dv, read: vals, best: dec.best, P: { ...P }, rates: [...document.querySelectorAll('#wa-rates .tile b')].map(b => b.textContent) };
}
