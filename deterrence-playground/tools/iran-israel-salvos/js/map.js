// Country-level map: launching country, target country and regional defenders for the chosen episode.
// Arcs are schematic (country centroid to country centroid) and carry the reported launch counts only.
import { createProjection, el } from '../../../shared/js/mapkit.js';
import { BOX, COUNTRIES } from '../data/geo.js';

const LABEL = { Iran: [54.5, 32.6], Israel: [34.9, 31.4], Jordan: [36.9, 30.9], Iraq: [43.6, 33.2], Syria: [38.6, 35.2], 'Saudi Arabia': [44.5, 24.2],
  Lebanon: [35.9, 34.0], Egypt: [31.6, 27.2], Turkey: [34.5, 39.2], Kuwait: [47.6, 29.4], Qatar: [51.2, 25.3], Oman: [57.0, 22.4], 'United Arab Emirates': [54.3, 23.6], Bahrain: [50.6, 26.1] };
const SHORT = { 'United Arab Emirates': 'UAE', 'Saudi Arabia': 'Saudi Arabia' };
const TYPES = [['bm', 'var(--c2)', 'ballistic'], ['cm', 'var(--c5)', 'cruise'], ['uav', 'var(--c7)', 'drones']];

export function createMap(svg, ext) {
  const proj = createProjection({ lon0: BOX[0], lon1: BOX[2], lat0: BOX[1], lat1: BOX[3], width: 1000 });
  const { W, H, project } = proj;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const root = el('g', {}, svg);
  el('rect', { x: 0, y: 0, width: W, height: H, class: 'tsm-sea' }, root);
  const paths = {};
  COUNTRIES.forEach(c => { paths[c.name] = el('path', { d: proj.path(c.rings), class: 'ii-land', 'fill-rule': 'evenodd' }, root); });
  const names = {};
  Object.entries(LABEL).forEach(([n, p]) => {
    const [x, y] = project(p);
    // Israel's label ends at its point so it does not run into Jordan's at narrow widths.
    names[n] = el('text', { x: n === 'Israel' ? x - 4 : x, y, class: 'ii-cname', 'text-anchor': n === 'Israel' ? 'end' : 'middle' }, root, SHORT[n] || n);
  });
  const arcs = el('g', {}, root);

  function draw(ep, maxTotal) {
    Object.entries(paths).forEach(([n, p]) => {
      p.classList.toggle('src', ep.map.from.includes(n));
      p.classList.toggle('tgt', ep.map.to.includes(n));
      p.classList.toggle('def', ep.map.regional.includes(n));
    });
    Object.entries(names).forEach(([n, t]) => t.classList.toggle('hot', [...ep.map.from, ...ep.map.to, ...ep.map.regional].includes(n)));
    arcs.textContent = '';
    const [x1, y1] = project(LABEL.Israel);
    ep.map.from.forEach((from, fi) => {
      const [x0, y0] = project(LABEL[from]);
      const counts = from === 'Iran' ? TYPES.map(([k]) => ep.launched[k]?.v || 0) : [0, 0, 0];
      TYPES.forEach(([k, col], i) => {
        const n = counts[i]; if (!n) return;
        const bend = 90 + i * 55 + fi * 30;
        const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - bend;
        const w = 2 + 16 * Math.sqrt(n / maxTotal);
        el('path', { d: `M${x0} ${y0 - 8}Q${mx} ${my} ${x1 + 6} ${y1 - 6}`, class: 'ii-arc', stroke: col, 'stroke-width': w.toFixed(1) }, arcs);
        const tx = 0.25 * x0 + 0.5 * mx + 0.25 * x1, ty = 0.25 * (y0 - 8) + 0.5 * my + 0.25 * (y1 - 6);
        el('text', { x: tx, y: ty - 4, class: 'ii-arc-t', 'text-anchor': 'middle', fill: col }, arcs, `${ep.launched[k].txt} ${TYPES[i][2]}`);
      });
    });
    ext.innerHTML = `<b>Also defending, from outside the region</b>${ep.map.external.length ? ep.map.external.join(', ') : 'none reported'}`;
  }
  return { draw };
}
