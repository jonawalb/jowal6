// After the hunt: outcome, the probability-over-time chart, and the slider that replays the map.
import { el } from '../../../shared/js/mapkit.js';
import { GAME, BEHAVIOURS, SENSORS } from '../data/params.js';
import { dist } from './geo.js';
import { routeName } from './panel.js';

const $ = id => document.getElementById(id);
const pct = x => `${Math.round(x * 100)}%`;

function outcomeText(g) {
  const o = g.over, route = routeName(g.sub.route), beh = BEHAVIOURS[g.sub.beh].label.toLowerCase();
  const where = g.sub.beh === 'loiter' ? 'loitering' : `heading for the ${route} exit`;
  if (o.kind === 'found') return ['good', `Found it at hour ${o.h}`, `Your attack landed ${o.d.toFixed(1)} nm from the sub (${beh}, ${where}). Your map gave that spot ${pct(o.pBelief)}.`];
  if (o.kind === 'missed') return ['bad', `Missed by ${o.d.toFixed(0)} nm`, `The sub (${beh}) was ${where}. Your map gave that spot ${pct(o.pBelief)}. A miss gives the hunt away.`];
  if (o.kind === 'escaped') return ['bad', `Slipped out through the ${route} gap at hour ${o.h}`, `The sub (${beh}) reached the exit before you attacked.`];
  return ['bad', 'Time ran out', `After ${GAME.hours} hours the sub (${beh}) was still ${where}, unlocated.`];
}

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
  for (let h = 0; h <= T; h += T > 18 || W < 500 ? 6 : 3) el('text', { x: sx(h), y: y0 + 16, 'text-anchor': 'middle' }, ax, `h${h}`);
  // Contacts as ticks along the bottom: filled = real, hollow = false.
  for (const c of g.contacts) {
    el('path', { d: `M${sx(c.h)} ${y0 + 24}v10`, class: `sh-tick ${c.real ? 'real' : 'false'}` }, svg);
  }
  el('text', { x: x0, y: y0 + 44, class: 'sh-ct' }, svg, 'contacts: solid = real, faint = false');
  const line = f => S.map((s, h) => `${h ? 'L' : 'M'}${sx(h).toFixed(1)} ${sy(f(s)).toFixed(1)}`).join('');
  el('path', { d: line(s => s.near), class: 'sh-l near' }, svg);
  el('line', { x1: sx(hour), x2: sx(hour), y1: y1, y2: y0, class: 'sh-now' }, svg);
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
      const [s, t, sub] = outcomeText(g);
      $('reveal').hidden = false;
      $('rv-status').dataset.s = s; $('rv-title').textContent = t; $('rv-sub').textContent = sub;
      range.max = g.snaps.length - 1;
      const real = g.contacts.filter(c => c.real).length, fake = g.contacts.length - real;
      const sprintH = g.subTrack.filter(x => x.sprint).length, evH = g.subTrack.filter(x => x.evading).length;
      const last = g.snaps[g.snaps.length - 1];
      const peak = g.snaps.reduce((m, s2, i) => (s2.near > m.v ? { v: s2.near, h: i } : m), { v: 0, h: 0 });
      const rows = [
        ['Behaviour', BEHAVIOURS[g.sub.beh].label + (g.beh === 'unknown' ? ' (hidden from you)' : '')],
        ['Route', g.sub.beh === 'loiter' ? 'none (loitered)' : routeName(g.sub.route)],
        ['Hours sprinting', `${sprintH} of ${g.subTrack.length - 1}`],
        ...(g.sub.beh === 'evade' ? [['Hours evading you', `${evH}`]] : []),
        ['Contacts', `${real} real, ${fake} false`],
        ['Sonobuoys used', `${SENSORS.buoy.count - g.left.buoy} of ${SENSORS.buoy.count}`],
        ['Aircraft flights', `${SENSORS.mpa.count - g.left.mpa} of ${SENSORS.mpa.count}`],
        ['Map near the sub, peak', `${pct(peak.v)} at hour ${peak.h}`],
        ['Map near the sub, end', pct(last.near)],
      ];
      if (g.over.p) rows.push(['Attack to sub', `${dist(g.over.p, [g.sub.lon, g.sub.lat]).toFixed(1)} nm`]);
      $('rv-read').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
      $('rv-note').textContent = 'Move the slider to watch your map and the true track together, hour by hour. When the line climbs, your search was squeezing the odds onto the sub. When it falls, the sub was slipping out of the water you searched, or a false contact pulled the map away.';
      setHour(g.snaps.length - 1);
    },
    hide() { stop(); $('reveal').hidden = true; },
  };
}
