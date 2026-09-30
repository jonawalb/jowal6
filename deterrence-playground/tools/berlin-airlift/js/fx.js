// Motion for Airlift: Berlin 1948-49. Presentation only: nothing here changes a number or slows the day
// loop, and every effect is skipped under prefers-reduced-motion.
import { reduced, pulse, shake, flash, ping as ping0 } from '../../../shared/js/motion.js';
import { fmt } from './util.js';

// Start rings on the next frame: the shared ring can compute a negative radius on its first frame when the
// frame timestamp predates the call (reported for shared/js/motion.js).
const ping = (...a) => requestAnimationFrame(() => ping0(...a));
const $ = id => document.getElementById(id);
const trailer = () => document.documentElement.dataset.skin === 'trailer';
const FIELD_AT = { teg: [520, 112], gat: [468, 176], thf: [566, 204] }; // js/map.js FIELDS

/** Roll a number from what is on screen to its new value; ends on the exact text the page rendered. */
function roll(el, to, ms = 450) {
  if (!el || reduced()) return;
  const final = el.textContent;
  const from = el._shown ?? to;
  el._shown = to;
  if (!Number.isFinite(from) || from === to) return;
  const id = (el._tw || 0) + 1; el._tw = id;
  const t0 = performance.now();
  const step = now => {
    if (el._tw !== id) return;
    const u = Math.max(0, Math.min(1, (now - t0) / ms)), e = 1 - Math.pow(1 - u, 3), v = from + (to - from) * e;
    el._shown = v;
    el.textContent = u < 1 ? fmt(v) : final;
    if (u < 1) requestAnimationFrame(step); else el._shown = to;
  };
  el.textContent = fmt(from);
  requestAnimationFrame(step);
}

let prev = null, lastPing = 0, drew = false;

/** Called at the end of every render. */
export function afterRender(g, { cursor, avg }) {
  const n = g.rec.length;
  const acc = g.rec.reduce((a, r) => a + r.acc, 0), fatal = g.rec.reduce((a, r) => a + r.fatal, 0);
  const now = { n, cum: g.cum, avg, acc, fatal, ev: !$('event').hidden, over: g.over, seed: g.seed };
  const fresh = !prev || prev.seed !== g.seed || n < prev.n;
  if (!reduced()) {
    // Tonnage counters roll up as the days are flown.
    if (!fresh && n > prev.n) {
      roll($('k-cum'), g.cum, n - prev.n > 1 ? 300 : 650);
      if (avg != null) roll($('k-week'), avg, n - prev.n > 1 ? 300 : 650);
      if (prev.cum < 1e6 && g.cum >= 1e6) { pulse($('k-cum').parentElement); flash($('k-cum').parentElement); }
      if (acc > prev.acc) { shake($('k-acc').parentElement); flash($('k-acc').parentElement); }
      if (fatal > prev.fatal) shake($('statcard'));
      if (cursor == null) arrivals(g);
    } else { $('k-cum')._shown = g.cum; $('k-week')._shown = avg; }
    // A decision card or the debrief rises in when it appears.
    if (now.ev && !(prev && prev.ev)) rise($('event'));
    if (now.over && !(prev && prev.over)) {
      rise($('debrief'));
      const b = $('debrief').querySelector('.db-grade b');
      if (b) { b._shown = 0; roll(b, g.rec[n - 1].cum, trailer() ? 1400 : 1000); }
    }
  }
  if (!drew && !reduced() && 'IntersectionObserver' in window) {
    drew = true;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); drawIn($('chart')); } }, { threshold: .3 });
    io.observe($('chart'));
  }
  prev = now;
}

/** Landings: a ring at each Berlin airfield that took aircraft, and one on the newest bar in the chart. */
function arrivals(g) {
  const t = performance.now();
  if (t - lastPing < (trailer() ? 200 : 320)) return;
  lastPing = t;
  const rich = trailer(), r = g.rec[g.rec.length - 1], map = $('map');
  for (const [k, [x, y]] of Object.entries(FIELD_AT)) {
    const land = r.land[k] || 0;
    if (land > 0) ping(map, x, y, { color: 'var(--you)', r: (rich ? 16 : 11) + Math.min(14, land / 40), ms: 700, width: rich ? 2 : 1.5 });
  }
  const bars = $('chart').querySelectorAll('rect.you'), bar = bars[bars.length - 1];
  if (bar) ping($('chart'), +bar.getAttribute('x') + +bar.getAttribute('width') / 2, +bar.getAttribute('y'), { color: 'var(--you)', r: rich ? 14 : 10, ms: 600 });
}

function rise(el) {
  if (!el || reduced()) return;
  el.classList.remove('ba-rise'); void el.offsetWidth; el.classList.add('ba-rise');
}

/** The history and requirement lines draw in left to right the first time the chart comes into view. */
function drawIn(svg) {
  if (reduced()) return;
  svg.querySelectorAll('.hist-l, .req-l, .anc').forEach((p, i) => {
    p.animate([{ clipPath: 'inset(-10px 100% -10px -10px)' }, { clipPath: 'inset(-10px -10px -10px -10px)' }],
      { duration: trailer() ? 1000 : 700, delay: p.classList.contains('anc') ? 500 : i * 80, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' });
  });
}

/** A pulse on the button that flew the airlift on. */
export const press = btn => pulse(btn);
