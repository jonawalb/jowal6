// Schematic, city-level map of Taiwan's leading-edge chip clusters, shaded by output on the selected day.
import { createProjection, drawBasemap, el } from '../../../shared/js/mapkit.js';
import { LAND_TAIWAN } from '../../../shared/data/land-taiwan.js';
import { CLUSTERS } from '../data/chips.js';

let proj = null;

export function mountMap(svg) {
  proj = createProjection({ lon0: 119.25, lon1: 122.1, lat0: 21.85, lat1: 25.4, width: 420 });
  const { root } = drawBasemap(svg, proj, LAND_TAIWAN, { gratStep: 0 });
  svg._layer = el('g', {}, root);
}

/** level: share of normal fab and packaging output (0-1). */
export function drawMap(svg, level) {
  const g = svg._layer;
  g.replaceChildren();
  const col = level >= 0.95 ? 'var(--good)' : level >= 0.5 ? 'var(--warn)' : 'var(--bad)';
  CLUSTERS.forEach(c => {
    const [x, y] = proj.project(c.at);
    const r = 5 + Math.sqrt(c.fabs + c.back) * 4;
    el('circle', { cx: x, cy: y, r, class: 'site', fill: col, 'fill-opacity': 0.25 + 0.6 * Math.max(0, Math.min(1, level)) }, g);
    const left = c.n === 'Longtan' ? false : true;
    const tx = left ? x - r - 4 : x + r + 4;
    const anchor = left ? 'end' : 'start';
    const dy = { Zhunan: 12, Hsinchu: -12 }[c.n] || 0;
    el('text', { x: tx, y: y - 1 + dy, class: 'site-t', 'text-anchor': anchor }, g, c.n);
    const parts = [];
    if (c.fabs) parts.push(`${c.fabs} TSMC fab${c.fabs > 1 ? 's' : ''}`);
    if (c.back) parts.push('packaging');
    el('text', { x: tx, y: y + 12 + dy, class: 'site-s', 'text-anchor': anchor }, g, parts.join(' + '));
  });
}
