// Regional map: Natural Earth countries, schematic sea lanes and one marker per chokepoint sized by daily transits.
import { createProjection, el } from '../../../shared/js/mapkit.js';
import { BOX, COUNTRIES } from '../data/geo.js';
import { PORTWATCH } from '../data/transits.js';
import { NAMES, METRICS, smoothed, windowMean, idx, pct, fmtPct, fmtVal, KEYS } from './series.js';

// Schematic lanes through open water, for orientation only (not traffic separation schemes).
const LANES = [
  [[32.44, 30.59], [32.58, 29.6], [33.6, 27.8], [35.2, 25.8], [37.2, 22.4], [39.2, 19.2], [41.2, 15.8], [42.7, 13.6], [43.35, 12.62], [44.6, 12.25], [47.5, 12.7], [51.2, 12.9], [54.5, 13.8], [64, 15.2]],
  [[48.9, 29.1], [50.4, 27.6], [52.3, 26.6], [54.6, 26.3], [56.1, 26.55], [56.6, 26.4], [57.1, 25.7], [58.4, 24.6], [60.0, 23.2], [64, 21.3]],
];
const LABELS = [['Egypt', 30.2, 26.6], ['Sudan', 32.2, 17.5], ['Eritrea', 38.4, 15.9], ['Ethiopia', 39.0, 10.2], ['Somalia', 47.4, 9.6], ['Yemen', 46.5, 15.6], ['Saudi Arabia', 44.0, 23.7], ['Oman', 56.4, 20.6], ['Iran', 55.5, 31.0], ['Iraq', 43.8, 32.8], ['Israel', 34.6, 31.35], ['Jordan', 36.6, 30.6], ['UAE', 54.3, 23.4], ['Djibouti', 42.6, 11.4]];
const SEAS = [['Red Sea', 37.6, 21.3, -58], ['Gulf of Aden', 48.2, 13.4, 0], ['Arabian Sea', 60.4, 17.0, 0], ['Persian Gulf', 51.0, 27.7, -30], ['Gulf of Oman', 59.4, 24.8, -38]];
const LABEL_POS = { bab: [-12, 18, 'end'], suez: [12, 4, 'start'], hormuz: [4, -20, 'middle'] };

export function createMap(svg, card, { onPick }) {
  const proj = createProjection({ lon0: BOX[0], lon1: BOX[2], lat0: BOX[1], lat1: BOX[3], width: 1000 });
  const { W, H, project } = proj;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const root = el('g', {}, svg);
  el('rect', { x: 0, y: 0, width: W, height: H, class: 'tsm-sea' }, root);
  const grat = el('g', { class: 'tsm-grat' }, root);
  for (let lon = 30; lon <= 60; lon += 10) { const [x] = project([lon, 0]); el('line', { x1: x, y1: 0, x2: x, y2: H }, grat); el('text', { x: x + 3, y: H - 5 }, grat, `${lon}°E`); }
  for (let lat = 10; lat <= 30; lat += 10) { const [, y] = project([0, lat]); el('line', { x1: 0, y1: y, x2: W, y2: y }, grat); el('text', { x: 4, y: y - 3 }, grat, `${lat}°N`); }
  COUNTRIES.forEach(c => el('path', { d: proj.path(c.rings), class: 'tsm-land rs-land', 'fill-rule': 'evenodd' }, root));
  SEAS.forEach(([t, lon, lat, rot]) => { const [x, y] = project([lon, lat]); el('text', { x, y, class: 't-sea', 'text-anchor': 'middle', transform: `rotate(${rot} ${x} ${y})` }, root, t); });
  LABELS.forEach(([t, lon, lat]) => { const [x, y] = project([lon, lat]); el('text', { x, y, class: t === 'Israel' || t === 'Jordan' ? 'rs-country rs-near-suez' : 'rs-country', 'text-anchor': 'middle' }, root, t); });
  const lanes = el('g', { class: 'rs-lanes' }, root);
  LANES.forEach(l => el('path', { d: proj.line(l), class: 'rs-lane' }, lanes));
  { const [x, y] = project([57.2, 12.3]); el('text', { x, y, class: 'rs-lane-t' }, root, 'to Asia'); }
  { const [x, y] = project([33.0, 32.6]); el('text', { x, y, class: 'rs-lane-t', 'text-anchor': 'middle' }, root, 'to Mediterranean'); }

  const marks = {};
  ['bab', 'suez', 'hormuz'].forEach(k => {
    const inf = PORTWATCH.series[k] && PORTWATCH.info[k];
    const [x, y] = project([inf.lon, inf.lat]);
    const g = el('g', { class: 'rs-mark', transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`, tabindex: 0, role: 'button' }, root);
    g.setAttribute('aria-label', `${NAMES[k]}: show this chokepoint's events`);
    const ghost = el('circle', { r: 10, class: 'rs-ghost' }, g);
    const dot = el('circle', { r: 10, class: 'rs-dot' }, g);
    const pulse = el('circle', { r: 14, class: 'rs-pulse' }, g);
    el('circle', { r: 3, class: 'rs-core' }, g);
    const [dx, dy, anc] = LABEL_POS[k];
    const t1 = el('text', { x: dx, y: dy, class: 'rs-mark-t', 'text-anchor': anc }, g, NAMES[k]);
    const t2 = el('text', { x: dx, y: dy + 15, class: 'rs-mark-v', 'text-anchor': anc }, g, '');
    const act = () => onPick(k);
    g.addEventListener('click', act);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    marks[k] = { g, ghost, dot, pulse, t1, t2 };
  });

  // Largest smoothed value per metric sets the radius scale, so circles compare across chokepoints.
  const maxOf = {};
  const scale = (metric, w) => {
    const k = metric + w;
    if (!maxOf[k]) maxOf[k] = Math.max(...KEYS.slice(0, 3).map(c => Math.max(...smoothed(c, metric, w).filter(v => v != null))));
    return maxOf[k];
  };

  function draw(S, EV) {
    const mx = scale(S.metric, S.smooth), R = v => v == null ? 0 : 4 + 34 * Math.sqrt(Math.max(0, v) / mx);
    const ci = idx(S.date), evCp = EV ? EV.cp : [];
    Object.entries(marks).forEach(([k, m]) => {
      const v = smoothed(k, S.metric, S.smooth)[ci], b = windowMean(k, S.metric, S.before);
      const p = pct(b, v);
      m.dot.setAttribute('r', R(v).toFixed(1));
      m.ghost.setAttribute('r', R(b).toFixed(1));
      m.g.dataset.tone = p == null ? '' : p <= -40 ? 'bad' : p <= -15 ? 'warn' : '';
      m.g.dataset.ev = evCp.includes(k) ? '1' : '';
      m.t2.textContent = `${fmtVal(v, S.metric)} ${METRICS[S.metric].short}/day · ${fmtPct(p)}`;
    });
    const cape = document.getElementById('rs-cape');
    if (cape) {
      const v = smoothed('cape', S.metric, S.smooth)[ci], b = windowMean('cape', S.metric, S.before);
      cape.innerHTML = `<b>Cape of Good Hope</b> <span>off map, far south</span><span class="v">${fmtVal(v, S.metric)} ${METRICS[S.metric].short}/day <em>${fmtPct(pct(b, v))} vs before</em></span>`;
    }
    card.hidden = !EV;
    if (EV) card.innerHTML = EV.html;
  }
  return { draw };
}
