// South Korea view: monthly arrivals from China, Japan and all other countries (KTO Data Lab).
import { el, esc, mIndex, dIndex, monthLabel, dayLabel, fmtN, niceTicks, placeTip } from './util.js';
import { KR_ROWS } from './series.js';
import { KR_EVENTS } from '../data/timeline.js';

const PAD = { l: 52, r: 12, t: 26, b: 26 };
const KIND_COLOR = { trigger: 'var(--muted)', measure: 'var(--bad)', response: 'var(--blue)', removal: 'var(--good)' };
export const KR_SERIES = [
  { k: 'china', label: 'China', cls: 'k-china' },
  { k: 'japan', label: 'Japan', cls: 'k-japan' },
  { k: 'others', label: 'All other countries', cls: 'k-others' },
];

export function createKrChart(svg, tip, wrap, { onMonth }) {
  let geo = null, hoverI = null, sel = null;

  function render(state) {
    sel = state.month;
    const W = Math.max(320, wrap.clientWidth), H = W < 560 ? 250 : 320;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    const i0 = mIndex(KR_ROWS[0].ym), i1 = mIndex(KR_ROWS[KR_ROWS.length - 1].ym) + 1;
    const x = i => PAD.l + (i - i0) / (i1 - i0) * (W - PAD.l - PAD.r);
    const max = Math.max(...KR_ROWS.map(r => Math.max(r.china, r.others))) * 1.08;
    const y = v => H - PAD.b - v / max * (H - PAD.t - PAD.b);
    geo = { x, y, i0, i1, W, H };
    const g = el('g', {}, svg);
    // Measures band: tour ban (15 Mar 2017) to normalization (31 Oct 2017)
    el('rect', { x: x(dIndex('2017-03-15')), y: PAD.t, width: x(dIndex('2017-10-31')) - x(dIndex('2017-03-15')), height: H - PAD.t - PAD.b, class: 'force' }, g);
    el('text', { x: x(dIndex('2017-03-15')) + 4, y: PAD.t + 12, class: 'force-t' }, g, 'Group-tour ban');
    const ax = el('g', { class: 'tsm-axis' }, g);
    for (const t of niceTicks(max / 1.08)) {
      el('line', { x1: PAD.l, x2: W - PAD.r, y1: y(t), y2: y(t), class: 'grid' }, ax);
      el('text', { x: PAD.l - 6, y: y(t) + 4, 'text-anchor': 'end' }, ax, t >= 1e6 ? `${t / 1e6}M` : `${t / 1e3}k`);
    }
    for (let yr = +KR_ROWS[0].ym.slice(0, 4); yr <= +KR_ROWS[KR_ROWS.length - 1].ym.slice(0, 4); yr++) {
      const xi = x(mIndex(`${yr}01`));
      el('line', { x1: xi, x2: xi, y1: H - PAD.b, y2: H - PAD.b + 4 }, ax);
      el('text', { x: xi + 3, y: H - PAD.b + 16 }, ax, String(yr));
    }
    for (const s of KR_SERIES) {
      const d = KR_ROWS.map((r, k) => `${k ? 'L' : 'M'}${x(mIndex(r.ym) + 0.5)},${y(r[s.k])}`).join('');
      el('path', { d, class: `k-line ${s.cls}` }, g);
    }
    for (const e of KR_EVENTS) {
      const xi = x(dIndex(e.date));
      if (xi < PAD.l) continue;
      el('line', { x1: xi, x2: xi, y1: PAD.t - 8, y2: H - PAD.b, class: 'ev-line', style: `stroke:${KIND_COLOR[e.kind]}` }, g);
      el('circle', { cx: xi, cy: PAD.t - 12, r: 4, class: 'ev-dot', style: `fill:${KIND_COLOR[e.kind]}` }, g);
    }
    if (sel) {
      const si = mIndex(sel);
      el('rect', { x: x(si), y: PAD.t, width: x(si + 1) - x(si), height: H - PAD.t - PAD.b, class: 'yr-band' }, g);
    }
    el('line', { class: 'cross', x1: 0, x2: 0, y1: PAD.t, y2: H - PAD.b, visibility: 'hidden' }, g).id = 'kr-cross';
    if (hoverI != null) hover(hoverI);
  }

  function idxAt(evt) {
    const r = svg.getBoundingClientRect();
    const px = (evt.clientX - r.left) / r.width * geo.W;
    const i = Math.floor(geo.i0 + (px - PAD.l) / (geo.W - PAD.l - PAD.r) * (geo.i1 - geo.i0));
    return i < geo.i0 || i >= geo.i1 ? null : i;
  }

  function hover(i) {
    hoverI = i;
    const cross = svg.querySelector('#kr-cross');
    if (i == null || !geo) { tip.hidden = true; cross?.setAttribute('visibility', 'hidden'); return; }
    const r = KR_ROWS[i - geo.i0];
    const prev = KR_ROWS[i - geo.i0 - 12];
    const xi = geo.x(i + 0.5);
    cross.setAttribute('x1', xi); cross.setAttribute('x2', xi); cross.setAttribute('visibility', 'visible');
    const yoy = prev ? Math.round((r.china / prev.china - 1) * 100) : null;
    const evs = KR_EVENTS.filter(e => e.date.slice(0, 7).replace('-', '') === r.ym);
    tip.innerHTML = `<b>${monthLabel(r.ym)}</b><small>China ${fmtN(r.china)}${yoy == null ? '' : ` (${yoy > 0 ? '+' : ''}${yoy}% on a year earlier)`}</small>` +
      `<small>Japan ${fmtN(r.japan)} · others ${fmtN(r.others)}</small>` +
      evs.map(e => `<span class="tt-ev">${dayLabel(e.date)}: ${esc(e.title)}</span>`).join('');
    const bb = svg.getBoundingClientRect();
    placeTip(tip, wrap, xi / geo.W * bb.width, geo.y(r.china) / geo.H * bb.height);
  }

  svg.addEventListener('pointermove', e => geo && hover(idxAt(e)));
  svg.addEventListener('pointerleave', () => hover(null));
  svg.addEventListener('click', e => { const i = geo && idxAt(e); if (i != null) onMonth(KR_ROWS[i - geo.i0].ym); });
  svg.addEventListener('keydown', e => {
    if (!geo) return;
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const n = (hoverI ?? mIndex(sel || KR_ROWS[KR_ROWS.length - 1].ym)) + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 12 : 1);
      hover(Math.max(geo.i0, Math.min(geo.i1 - 1, n)));
    } else if (e.key === 'Enter' && hoverI != null) onMonth(KR_ROWS[hoverI - geo.i0].ym);
  });
  svg.addEventListener('blur', () => hover(null));
  return { render };
}
