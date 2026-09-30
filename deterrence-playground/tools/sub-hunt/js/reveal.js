// After-action review: outcome, what the sub was doing, where you nearly had it, a chart of how close
// your map got, and a slider that replays the sub's true track against your searches hour by hour.
import { el, escapeHtml } from '../../../shared/js/mapkit.js';
import { GAME } from '../data/params.js';
import { outcome, story, nearMisses } from './aar.js';
import { routeName, pct } from './panel.js';

const $ = id => document.getElementById(id);

/** Line chart: how much of the map's probability lay within 20 nm of the true sub, hour by hour. */
function chart(g, hour) {
  const svg = $('rv-chart');
  svg.replaceChildren();
  const S = g.snaps, T = Math.max(1, S.length - 1);
  const W = Math.max(300, Math.round(svg.getBoundingClientRect().width) || 640);
  svg.setAttribute('viewBox', `0 0 ${W} 230`);
  const x0 = 44, x1 = W - 16, y0 = 176, y1 = 14;
  const sx = h => x0 + h / T * (x1 - x0), sy = p => y0 - p * (y0 - y1);
  const ax = el('g', { class: 'tsm-axis' }, svg);
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    el('line', { x1: x0, x2: x1, y1: sy(p), y2: sy(p), class: 'sh-grid' }, ax);
    el('text', { x: x0 - 6, y: sy(p) + 4, 'text-anchor': 'end' }, ax, pct(p));
  }
  for (let h = 0; h <= T; h += T > 12 || W < 500 ? 6 : 2) el('text', { x: sx(h), y: y0 + 16, 'text-anchor': 'middle' }, ax, `h${h}`);
  for (const c of g.contacts) el('path', { d: `M${sx(c.h)} ${y0 + 24}v10`, class: `sh-tick ${c.real ? 'real' : 'false'}` }, svg);
  el('text', { x: x0, y: y0 + 46, class: 'sh-ct' }, svg, 'contacts: solid = real, faint = false');
  const line = f => S.map((s, h) => `${h ? 'L' : 'M'}${sx(h).toFixed(1)} ${sy(f(s)).toFixed(1)}`).join('');
  el('path', { d: line(s => s.near), class: 'sh-l near' }, svg);
  el('line', { x1: sx(hour), x2: sx(hour), y1, y2: y0, class: 'sh-now' }, svg);
  const lg = el('g', { class: 'sh-lg' }, svg);
  el('path', { d: `M${x0 + 8} ${y1 + 8}h18`, class: 'sh-l near' }, lg);
  el('text', { x: x0 + 32, y: y1 + 12 }, lg, W < 480 ? 'odds within 20 nm of the sub' : 'your map\'s odds within 20 nm of the true sub');
}

export function createReveal({ onHour, onAgain, onNew }) {
  let g = null, timer = null;
  const range = $('rv-range');
  new ResizeObserver(() => { if (g && !$('reveal').hidden) chart(g, +range.value); }).observe($('rv-chart'));
  const stop = () => { if (timer) { clearInterval(timer); timer = null; $('rv-play').textContent = 'Replay the hunt'; } };
  const setHour = h => {
    range.value = h; $('rv-h').textContent = `${h}`;
    chart(g, h);
    onHour(h);
  };
  range.oninput = () => { stop(); setHour(+range.value); };
  $('rv-play').onclick = () => {
    if (timer) { stop(); return; }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let h = +range.value >= +range.max ? 0 : +range.value;
    $('rv-play').textContent = 'Pause';
    setHour(h);
    timer = setInterval(() => { h += 1; if (h > +range.max) { stop(); return; } setHour(h); }, reduce ? 900 : 450);
  };
  $('rv-again').onclick = () => { stop(); onAgain(); };
  $('rv-new').onclick = () => { stop(); onNew(); };

  return {
    show(game) {
      g = game;
      const [s, t, sub] = outcome(g);
      $('reveal').hidden = false;
      $('rv-status').dataset.s = s; $('rv-title').textContent = t; $('rv-sub').textContent = sub;
      $('rv-story').textContent = story(g);
      $('rv-near').innerHTML = nearMisses(g).map(x => `<li>${escapeHtml(x)}</li>`).join('');
      range.max = g.snaps.length - 1;
      const real = g.contacts.filter(c => c.real).length, fake = g.contacts.length - real;
      const last = g.snaps[g.snaps.length - 1];
      const rows = [
        ['Route', g.sub.beh === 'loiter' ? 'none (loitered)' : routeName(g.sub.route)],
        ['Hours sprinting', `${g.subTrack.filter(x => x.sprint).length} of ${g.subTrack.length - 1}`],
        ['Contacts', `${real} real, ${fake} false`],
        ['Buoy patterns used', `${GAME.buoyLoads - g.buoys} of ${GAME.buoyLoads}`],
        ['Attacks used', `${g.attacks.length} of ${GAME.torpedoes}`],
        ['Map near the sub, end', pct(last.near)],
      ];
      $('rv-read').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
      setHour(g.snaps.length - 1);
    },
    hide() { stop(); $('reveal').hidden = true; },
    redraw() { if (g) setHour(+range.value); },
  };
}
