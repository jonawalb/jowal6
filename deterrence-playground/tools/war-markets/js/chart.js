// Price chart: daily YES prices for one case's contracts, deadlines, settlements and dated events.
import { el, esc, niceTicks, placeTip, dayOf, isoOf, shortDay, dayLabel } from './util.js';
import { MARKETS, caseWindow, caseEvents, priceOn } from './series.js';

const PAD = { l: 44, r: 14, t: 30, b: 26 };
export const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)'];
export const colorOf = (c, id) => COLORS[c.ids.indexOf(id) % COLORS.length];

export function createChart(svg, tip, wrap, { onFocus }) {
  let geo = null, S = null, hoverD = null;

  function render(state, c) {
    S = state;
    const W = Math.max(320, wrap.clientWidth), H = W < 560 ? 260 : 340;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    const [a, b] = caseWindow(c);
    const x = d => PAD.l + (d - a) / (b - a + 1) * (W - PAD.l - PAD.r);
    const y = p => H - PAD.b - p / 100 * (H - PAD.t - PAD.b);
    geo = { x, y, a, b, W, H, c };
    const g = el('g', {}, svg);
    const ax = el('g', { class: 'tsm-axis' }, g);
    for (const t of niceTicks(100, 4)) {
      el('line', { x1: PAD.l, x2: W - PAD.r, y1: y(t), y2: y(t), class: 'grid' }, ax);
      el('text', { x: PAD.l - 6, y: y(t) + 4, 'text-anchor': 'end' }, ax, `${t}¢`);
    }
    const span = b - a + 1, pxDay = (W - PAD.l - PAD.r) / span;
    const week = [7, 14].find(k => k * pxDay >= 52);
    const mStep = [1, 2, 3, 6].find(k => k * 30 * pxDay >= 44) || 12;
    for (let d = a; d <= b; d++) {
      const iso = isoOf(d);
      const mon = +iso.slice(5, 7);
      const tick = week ? (d - a) % week === 0 : iso.endsWith('-01') && (mon - 1) % mStep === 0;
      if (!tick) continue;
      el('line', { x1: x(d), x2: x(d), y1: H - PAD.b, y2: H - PAD.b + 4 }, ax);
      if (x(d) < W - 28) el('text', { x: x(d) + 2, y: H - PAD.b + 16 }, ax, week ? shortDay(iso) : (mon === 1 ? iso.slice(0, 4) : shortDay(iso).split(' ')[1]));
    }
    // Events
    for (const e of caseEvents(c, [a, b])) {
      const xe = x(dayOf(e.date) + 0.5);
      el('line', { x1: xe, x2: xe, y1: PAD.t - 10, y2: H - PAD.b, class: 'ev-line' }, g);
      el('circle', { cx: xe, cy: PAD.t - 14, r: 4.5, class: e.opened ? 'ev-dot' : 'ev-dot hollow' }, g);
    }
    // Contracts
    for (const id of [...c.ids.filter(i => i !== S.focus), S.focus]) {
      const m = MARKETS[id];
      if (S.hidden.has(id)) continue;
      const col = colorOf(c, id), focus = id === S.focus;
      if (m.deadline) {
        const dd = dayOf(m.deadline);
        if (dd >= a && dd <= b) el('line', { x1: x(dd + 1), x2: x(dd + 1), y1: PAD.t, y2: H - PAD.b, class: 'deadline', style: `stroke:${col}` }, g);
      }
      let d = '', prev = null;
      for (const [iso, p] of m.series) {
        const dn = dayOf(iso);
        if (dn < a || dn > b) continue;
        d += `${prev != null && dn - prev <= 3 ? 'L' : 'M'}${x(dn + 0.5).toFixed(1)},${y(p).toFixed(1)}`;
        prev = dn;
      }
      el('path', { d, class: focus ? 'price focus' : 'price', style: `stroke:${col}`, 'data-id': id }, g);
      if (m.known && (m.res === 'yes' || m.res === 'no')) {
        const kd = dayOf(m.known);
        if (kd >= a && kd <= b) {
          const g2 = el('g', { class: 'settle' }, g);
          el('circle', { cx: x(kd + 0.5), cy: y(m.res === 'yes' ? 100 : 0), r: focus ? 6 : 4.5, style: `fill:${col}` }, g2);
          // "Yes" sits left of its dot so it stays clear of the event-dot row just above 100¢.
          if (focus) el('text', m.res === 'yes'
            ? { x: x(kd + 0.5) - 9, y: y(100) + 4, 'text-anchor': 'end', class: 'settle-t' }
            : { x: x(kd + 0.5), y: y(0) - 9, 'text-anchor': 'middle', class: 'settle-t' }, g2, m.res === 'yes' ? 'Yes' : 'No');
        }
      }
    }
    el('line', { class: 'cross', x1: 0, x2: 0, y1: PAD.t, y2: H - PAD.b, visibility: 'hidden' }, g).id = 'cross';
    if (hoverD != null) hover(hoverD);
  }

  function dayAt(evt) {
    const r = svg.getBoundingClientRect();
    const px = (evt.clientX - r.left) / r.width * geo.W;
    const d = Math.floor(geo.a + (px - PAD.l) / (geo.W - PAD.l - PAD.r) * (geo.b - geo.a + 1));
    return d < geo.a || d > geo.b ? null : d;
  }

  function hover(d) {
    hoverD = d;
    const cross = svg.querySelector('#cross');
    if (d == null || !geo) { tip.hidden = true; cross?.setAttribute('visibility', 'hidden'); return; }
    const xd = geo.x(d + 0.5);
    cross.setAttribute('x1', xd); cross.setAttribute('x2', xd); cross.setAttribute('visibility', 'visible');
    const c = geo.c, iso = isoOf(d);
    const rows = c.ids.filter(id => !S.hidden.has(id)).map(id => ({ id, p: priceOn(id, d) })).filter(r => r.p != null);
    const evs = caseEvents(c, [d, d]);
    tip.innerHTML = `<b>${dayLabel(iso)}</b>` +
      (rows.length ? rows.map(r => `<span class="tt-row"><i style="background:${colorOf(c, r.id)}"></i>${esc(short(MARKETS[r.id].q))}<b>${r.p.toFixed(1)}¢</b></span>`).join('') : '<small>No trades archived this day</small>') +
      evs.map(e => `<span class="tt-ev">${esc(e.text)}</span>`).join('');
    const bb = svg.getBoundingClientRect();
    placeTip(tip, wrap, xd / geo.W * bb.width, 40);
  }

  svg.addEventListener('pointermove', e => geo && hover(dayAt(e)));
  // A tap shows that day's values and keeps them up after the finger lifts; tapping outside the chart hides them.
  svg.addEventListener('pointerdown', e => geo && hover(dayAt(e)));
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover(null); });
  document.addEventListener('pointerdown', e => { if (hoverD != null && !svg.contains(e.target) && !tip.contains(e.target)) hover(null); });
  svg.addEventListener('click', e => {
    const id = e.target.getAttribute?.('data-id');
    if (id) onFocus(id);
  });
  svg.addEventListener('keydown', e => {
    if (!geo || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const n = (hoverD ?? geo.b) + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 7 : 1);
    hover(Math.max(geo.a, Math.min(geo.b, n)));
  });
  svg.addEventListener('blur', () => hover(null));
  return { render };
}

/** Compact label for a contract: the question without "Will", the year or the question mark. */
export function short(q) {
  return q.replace(/^Will (the )?/, '').replace(/,? 20\d\d\??$/, '').replace(/\?$/, '').replace(/ x /g, '–');
}
