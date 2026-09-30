// Motion for Kahn's Escalation Ladder. Called after every render; it compares the new page with the last one and
// animates only what changed: rungs light up in order as a crisis climbs or falls, thresholds flash when crossed,
// the path chart pings the current step, readouts count, outcome bars slide and model dice tumble.
// Presentation only: it never changes a number or delays input.
import { GROUPS } from '../data/ladder.js';
import { ping, burst, pulse, shake } from '../../../shared/js/motion.js';
import { reduced, trailer, count, replay, tumble, num } from './fxkit.js';

const $ = s => document.querySelector(s);
let last = null;   // { key, cur, step, peaks, bars, legend, logN, body }

const pctFmt = v => Math.round(v) + '%';

function climb(ladder, from, to, first) {
  const lis = [...ladder.querySelectorAll('.kl-rung')];
  ladder.querySelectorAll('.kl-lit, .kl-arrive').forEach(li => li.classList.remove('kl-lit', 'kl-arrive'));
  let seq;
  if (first) seq = lis.filter(li => li.classList.contains('hit-a')).map(li => +li.dataset.n).sort((a, b) => a - b);
  else {
    const dir = to >= from ? 1 : -1, n = Math.abs(to - from);
    seq = Array.from({ length: n }, (_, i) => from + dir * (i + 1));
  }
  const gap = Math.max(28, Math.min(80, 560 / Math.max(1, seq.length)));
  seq.forEach((n, i) => {
    const li = ladder.querySelector(`.kl-rung[data-n="${n}"]`);
    if (!li) return;
    replay(li, n === to ? 'kl-arrive' : 'kl-lit', i * gap);
  });
  // Thresholds crossed on the way.
  if (!first && from !== to) {
    const lo = Math.min(from, to), hi = Math.max(from, to);
    GROUPS.forEach((g, gi) => {
      if (!g.after || g.to < lo || g.to >= hi) return;
      const thr = ladder.querySelector(`.kl-thr[data-after="${g.id}"]`);
      const at = seq.indexOf(to > from ? g.to + 1 : g.to);
      replay(thr, 'kl-thr-hit', Math.max(0, at) * gap);
      if (to > from) setTimeout(() => shake(ladder.querySelector(`.kl-rung[data-n="${to}"]`)), seq.length * gap);
    });
  }
  return seq.length * gap;
}

function drawIn(svg) {
  if (reduced()) return;
  const line = svg.querySelector('.pc-line.a');
  if (line) {
    const L = line.getTotalLength();
    line.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }],
      { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  svg.querySelectorAll('.pc-dot.a').forEach((d, i, all) => d.animate([{ opacity: 0 }, { opacity: 1 }],
    { duration: 220, delay: (i / Math.max(1, all.length - 1)) * 600, fill: 'backwards' }));
}

function slideBars(root, prev) {
  const bars = [...root.querySelectorAll('.cf-bar')].map(b => [...b.querySelectorAll(':scope > span')]);
  bars.forEach((spans, bi) => {
    const old = prev?.[bi];
    spans.forEach((s, i) => {
      const to = s.style.width, from = old ? old[i] : '0%';
      if (reduced() || from === to) return;
      s.style.transition = 'none'; s.style.width = from;
      void s.offsetWidth;
      s.style.transition = ''; s.style.width = to;
    });
  });
  return bars.map(sp => sp.map(s => s.style.width));
}

export function afterRender(state) {
  const ladder = $('#ladder'), svg = $('#path');
  const cur = +(ladder.querySelector('.kl-rung.cur')?.dataset.n || 0);
  const key = state.c + '|' + state.m;
  const first = !last || last.key !== key;
  const T = trailer(), rose = !first && cur > last.cur;

  // Ladder: light the rungs between the last position and this one.
  if (first || cur !== last.cur) {
    climb(ladder, first ? 0 : last.cur, cur, first);
  }

  // Path chart: draw the line in for a new crisis; ping the current step when it moves.
  if (first) drawIn(svg);
  const dot = svg.querySelector('.pc-dot.a.now') || [...svg.querySelectorAll('.pc-dot.a')].pop();
  if (dot && (first || cur !== last.cur || state.s !== last.step)) {
    const x = +dot.getAttribute('cx'), y = +dot.getAttribute('cy');
    setTimeout(() => {
      ping(svg, x, y, { color: 'var(--blue)', r: T ? 30 : 18, width: T ? 2.4 : 1.6 });
      if (T && rose) burst(svg, x, y, { color: 'var(--accent)', n: 10, r: 18 });
    }, first ? 600 : 0);
  }

  // Step buttons: pulse the one that moved the story.
  if (!first && state.m !== 'play' && state.s !== last.step) pulse(state.s > last.step ? $('#next') : $('#prev'));
  if (!first && state.m !== 'play' && state.s !== last.step) replay($('#step'), 'fx-rise');

  // Highest-rung readouts count up.
  const peaks = {};
  document.querySelectorAll('.kl-peak').forEach(p => {
    const cls = p.classList.contains('b') ? 'b' : 'a', b = p.querySelector('b'), to = num(b.textContent);
    peaks[cls] = to;
    count(b, last?.peaks?.[cls] ?? 1, to, v => String(Math.round(v)), 650);
  });

  // Retry mode.
  let bars = null, legend = [], logN = 0, body = '';
  const play = $('#play');
  if (state.m === 'play' && !play.hidden) {
    bars = slideBars(play, first ? null : last.bars);
    play.querySelectorAll('.cf-dist .cf-leg b').forEach((b, i) => {
      const txt = b.textContent; legend.push(txt);
      if (/^\d+%$/.test(txt) && last?.legend?.[i] && /^\d+%$/.test(last.legend[i]) && txt !== last.legend[i]) count(b, num(last.legend[i]), num(txt), pctFmt, 500);
    });
    const log = [...play.querySelectorAll('.cf-log li')];
    logN = log.length;
    if (logN && (!last || logN > last.logN)) {
      const li = log[logN - 1];
      replay(li, 'fx-rise');
      li.querySelectorAll('.cf-roll').forEach((r, i) => setTimeout(() => tumble(r, T ? 560 : 420), i * 140));
      if (last && cur > last.cur) setTimeout(() => shake(li), 520);
    }
    body = [state.p.join('.'), state.b.join(''), play.querySelector('.cf-body > *')?.className || ''].join('|');
    if (!first && body !== last.body) {
      const blk = play.querySelector('.cf-body > *');
      if (blk && !blk.classList.contains('cf-brwrap')) replay(blk, 'fx-rise');
      pulse(play.querySelector('.cf-olist li.me'));
      const end = play.querySelector('.cf-end h3');
      if (end) { replay(end, 'fx-glow'); if (cur >= 21) setTimeout(() => shake(play.querySelector('.cf-end')), 300); }
    }
    const mc = play.querySelector('.cf-mc [aria-live] .cf-bar');
    if (mc && !last?.mcShown) replay(play.querySelector('.cf-mc [aria-live]'), 'fx-rise');
    last = { key, cur, step: state.s, peaks, bars, legend, logN, body, mcShown: !!mc };
    return;
  }
  last = { key, cur, step: state.s, peaks, bars, legend, logN, body, mcShown: false };
}
