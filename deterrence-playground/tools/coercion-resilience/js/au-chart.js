// Australia view: monthly exports of one product, China vs the rest of the world, stacked.
import { el, esc, mIndex, dIndex, monthLabel, dayLabel, fmtUSD, fmtT, niceTicks, placeTip } from './util.js';
import { monthly } from './series.js';
import { AU_EVENTS, IN_FORCE } from '../data/timeline.js';

const PAD = { l: 52, r: 12, t: 26, b: 26 };
const KIND_COLOR = { trigger: 'var(--muted)', measure: 'var(--bad)', response: 'var(--blue)', removal: 'var(--good)' };

export function createAuChart(svg, tip, wrap, { onYear, onHover }) {
  let S = null, geo = null, hoverM = null;

  function render(state) {
    S = state;
    const W = Math.max(320, wrap.clientWidth), H = W < 560 ? 250 : 320;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    const rows = monthly(S.product, S.unit);
    const i0 = mIndex(rows[0][0]), i1 = mIndex(rows[rows.length - 1][0]) + 1;
    const x = i => PAD.l + (i - i0) / (i1 - i0) * (W - PAD.l - PAD.r);
    const max = Math.max(...rows.map(r => r[1] || 0)) * 1.08 || 1;
    const y = v => H - PAD.b - v / max * (H - PAD.t - PAD.b);
    geo = { x, y, i0, i1, W, H, rows };
    const fmt = S.unit === 't' ? fmtT : fmtUSD;

    const g = el('g', {}, svg);
    // Selected-year band
    const ys = mIndex(`${S.year}01`);
    el('rect', { x: x(ys), y: PAD.t, width: x(ys + 12) - x(ys), height: H - PAD.t - PAD.b, class: 'yr-band' }, g);
    // In-force band
    const f = IN_FORCE[S.product];
    if (f) {
      const a = mIndex(f.start), b = f.end ? mIndex(f.end) : i1;
      el('rect', { x: x(a), y: PAD.t, width: Math.max(1, x(b) - x(a)), height: H - PAD.t - PAD.b, class: f.end ? 'force' : 'force open' }, g);
      el('text', { x: x(a) + 4, y: PAD.t + 12, class: 'force-t' }, g, f.end ? 'Restrictions in force' : 'Restrictions (no end date sourced)');
    }
    // Grid + y axis
    const ax = el('g', { class: 'tsm-axis' }, g);
    for (const t of niceTicks(max / 1.08)) {
      el('line', { x1: PAD.l, x2: W - PAD.r, y1: y(t), y2: y(t), class: 'grid' }, ax);
      el('text', { x: PAD.l - 6, y: y(t) + 4, 'text-anchor': 'end' }, ax, fmt(t));
    }
    for (let yr = +rows[0][0].slice(0, 4); yr <= +rows[rows.length - 1][0].slice(0, 4); yr++) {
      const xi = x(mIndex(`${yr}01`));
      el('line', { x1: xi, x2: xi, y1: H - PAD.b, y2: H - PAD.b + 4 }, ax);
      if (W >= 480 || yr % 2 === 0) el('text', { x: xi + 3, y: H - PAD.b + 16 }, ax, String(yr));
    }
    // Stacked areas: China at the bottom, rest of world above. Gaps stay gaps.
    const segs = [];
    let cur = [];
    rows.forEach(r => { if (r[1] == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push(r); });
    if (cur.length) segs.push(cur);
    for (const sg of segs) {
      const xs = sg.map(r => x(mIndex(r[0]) + 0.5));
      const top = sg.map((r, k) => `${xs[k]},${y(r[1])}`), mid = sg.map((r, k) => `${xs[k]},${y(r[2] || 0)}`);
      el('path', { d: `M${top.join('L')}L${[...mid].reverse().join('L')}Z`, class: 'a-rest' }, g);
      el('path', { d: `M${mid.join('L')}L${xs[xs.length - 1]},${y(0)}L${xs[0]},${y(0)}Z`, class: 'a-china' }, g);
      el('path', { d: `M${top.join('L')}`, class: 'l-world' }, g);
    }
    // Event ticks along the top
    const evs = AU_EVENTS.filter(e => !e.products.length || e.products.includes(S.product));
    for (const e of evs) {
      const xi = x(dIndex(e.date));
      if (xi < PAD.l || xi > W - PAD.r) continue;
      el('line', { x1: xi, x2: xi, y1: PAD.t - 8, y2: H - PAD.b, class: 'ev-line', style: `stroke:${KIND_COLOR[e.kind]}` }, g);
      el('circle', { cx: xi, cy: PAD.t - 12, r: 4, class: 'ev-dot', style: `fill:${KIND_COLOR[e.kind]}` }, g);
    }
    el('line', { class: 'cross', x1: 0, x2: 0, y1: PAD.t, y2: H - PAD.b, visibility: 'hidden' }, g).id = 'au-cross';
    if (hoverM != null) hover(hoverM);
  }

  function monthAt(evt) {
    if (!geo) return null;
    const r = svg.getBoundingClientRect();
    const px = (evt.clientX - r.left) / r.width * geo.W;
    const i = Math.floor(geo.i0 + (px - PAD.l) / (geo.W - PAD.l - PAD.r) * (geo.i1 - geo.i0));
    return i < geo.i0 || i >= geo.i1 ? null : i;
  }

  function hover(i) {
    hoverM = i;
    const cross = svg.querySelector('#au-cross');
    if (i == null || !geo) { tip.hidden = true; if (cross) cross.setAttribute('visibility', 'hidden'); onHover?.(null); return; }
    const row = geo.rows[i - geo.i0];
    if (!row) return;
    const xi = geo.x(i + 0.5);
    cross.setAttribute('x1', xi); cross.setAttribute('x2', xi); cross.setAttribute('visibility', 'visible');
    const fmt = S.unit === 't' ? fmtT : fmtUSD;
    const evs = AU_EVENTS.filter(e => (!e.products.length || e.products.includes(S.product)) && e.date.slice(0, 7).replace('-', '') === row[0]);
    tip.innerHTML = `<b>${monthLabel(row[0])}</b>` + (row[1] == null ? '<small>No Comtrade figure this month</small>' :
      `<small>To China ${fmt(row[2])} · rest of world ${fmt(row[3])}</small><small>Total ${fmt(row[1])} · China share ${row[1] ? Math.round(row[2] / row[1] * 100) : 0}%</small>`) +
      evs.map(e => `<span class="tt-ev">${dayLabel(e.date)}: ${esc(e.title)}</span>`).join('');
    const r = svg.getBoundingClientRect();
    placeTip(tip, wrap, xi / geo.W * r.width, geo.y(row[1] || 0) / geo.H * r.height);
    onHover?.(row[0]);
  }

  svg.addEventListener('pointermove', e => hover(monthAt(e)));
  svg.addEventListener('pointerleave', () => hover(null));
  svg.addEventListener('click', e => { const i = monthAt(e); if (i != null) onYear(String(2000 + Math.floor(i / 12))); });
  svg.addEventListener('keydown', e => {
    if (!geo) return;
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const n = (hoverM ?? geo.i1 - 1) + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 12 : 1);
      hover(Math.max(geo.i0, Math.min(geo.i1 - 1, n)));
    } else if (e.key === 'Enter' && hoverM != null) onYear(String(2000 + Math.floor(hoverM / 12)));
  });
  svg.addEventListener('blur', () => hover(null));
  return { render };
}
