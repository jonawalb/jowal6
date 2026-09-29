// Australia view: where the product went, baseline year vs the selected year (annual Comtrade).
import { el, fmtUSD } from './util.js';
import { destinations, BASE_YEAR } from './series.js';

export function drawDest(svg, wrap, p, year) {
  const d = destinations(p, year, 7);
  const W = Math.max(300, wrap.clientWidth), rowH = 26, top = 22;
  const H = top + d.rows.length * rowH + 8;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  if (!d.hasYear) {
    el('text', { x: 0, y: 16, class: 'dest-empty' }, svg, `No annual partner data for ${year} yet.`);
    return d;
  }
  const labW = Math.min(150, W * 0.34), valW = 64;
  const max = Math.max(...d.rows.map(r => Math.max(r.base, r.now))) || 1;
  const x = v => labW + v / max * (W - labW - valW - 6);
  el('text', { x: labW, y: 12, class: 'dest-h' }, svg, `Bars: ${year}. Outline: ${BASE_YEAR}. US$, annual.`);
  d.rows.forEach((r, k) => {
    const y0 = top + k * rowH;
    const g = el('g', { class: r.code === '156' ? 'dest-row china' : 'dest-row' }, svg);
    el('text', { x: labW - 8, y: y0 + 15, 'text-anchor': 'end', class: 'dest-lab' }, g, r.name.length > 22 ? r.name.slice(0, 21) + '…' : r.name);
    el('rect', { x: labW, y: y0 + 4, width: Math.max(0, x(r.now) - labW), height: 14, rx: 2, class: 'dest-bar' }, g);
    el('rect', { x: labW, y: y0 + 2, width: Math.max(0, x(r.base) - labW), height: 18, rx: 2, class: 'dest-base' }, g);
    el('text', { x: Math.max(x(r.now), x(r.base)) + 5, y: y0 + 15, class: 'dest-val' }, g, fmtUSD(r.now));
    el('title', {}, g, `${r.name}: ${fmtUSD(r.base)} in ${BASE_YEAR}, ${fmtUSD(r.now)} in ${year}`);
  });
  return d;
}
