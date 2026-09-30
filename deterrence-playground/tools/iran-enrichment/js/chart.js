// Stockpile chart: stacked areas of the IAEA's reported stockpile by enrichment level, the total in all
// chemical forms, the JCPOA limit, the unverified period since June 2025 and event markers. Pure SVG.
import { ROWS, NUM, LEVELS, VIEWS, LIMIT_KG_U, t, fmtKg, niceDate, esc } from './series.js';
import { EVENTS, CATS } from '../data/events.js';
import { LAST_ESTIMATE, AS_OF } from '../data/breakout.js';
import { chartMotion, ping } from './fx.js';

const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
export const CAT_COLOR = { deal: 'var(--c3)', program: 'var(--c2)', iaea: 'var(--c6)', strike: 'var(--bad)' };
const X0 = t('2016-01-01'), X1 = t('2026-12-31');

function niceTicks(max, n = 5) {
  const raw = max / n, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  const step = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

export function createChart(host, { onReport, onEvent }) {
  const svg = mk('svg', { role: 'img', 'aria-label': 'Iran\'s enriched uranium stockpile by enrichment level from IAEA reports, 2016 to 2026' });
  host.appendChild(svg);
  const tip = document.createElement('div');
  tip.className = 'tooltip'; tip.hidden = true;
  host.appendChild(tip);
  let geo = null, st = null, dragging = false, lastReport = null;
  const motion = chartMotion();

  const nearest = ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (geo.W / r.width);
    const when = geo.xi(px);
    let best = null, bd = Infinity;
    for (const row of ROWS) { const d = Math.abs(t(row.asof) - when); if (d < bd) { bd = d; best = row; } }
    return best;
  };
  svg.addEventListener('pointerdown', ev => {
    if (!geo || ev.target.closest('.ie-ev')) return;
    dragging = true; svg.setPointerCapture(ev.pointerId); onReport(nearest(ev).id);
  });
  svg.addEventListener('pointermove', ev => {
    if (!geo) return;
    if (dragging) onReport(nearest(ev).id);
    if (ev.pointerType === 'mouse' && !ev.target.closest('.ie-ev')) showTip(nearest(ev), ev);
  });
  const end = () => { dragging = false; };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('pointerleave', () => { tip.hidden = true; });

  function place(ev) {
    const r = host.getBoundingClientRect();
    let x = ev.clientX - r.left + 14;
    if (x > r.width - 240) x = ev.clientX - r.left - 250;
    tip.style.left = Math.max(0, x) + 'px';
    tip.style.top = Math.max(0, ev.clientY - r.top - 10) + 'px';
    tip.hidden = false;
  }
  function showTip(row, ev) {
    let body;
    if (row.band) {
      const keys = VIEWS[st.view].keys;
      body = LEVELS.filter(l => keys.includes(l.k) && row.band[l.k] > 0)
        .map(l => `<small><span class="ie-sw" style="background:${l.color}"></span> ${l.label}: ${fmtKg(row.band[l.k])} kg</small>`).join('')
        + (row.total != null ? `<small>Total, all forms: ${fmtKg(row.total)} kg</small>` : '');
    } else body = `<small>${row.basis === 'limit' ? 'Under the JCPOA limit; no figure published' : 'Stockpile not reported: no IAEA access'}</small>`;
    tip.innerHTML = `<b>${esc(row.id)}</b><small>As of ${niceDate(row.asof)}</small>${body}`;
    place(ev);
  }

  function draw(state) {
    st = state;
    const W = Math.max(300, Math.round(host.clientWidth || 800));
    const narrow = W < 560;
    const H = narrow ? 340 : 420;
    const m = { l: narrow ? 44 : 56, r: narrow ? 10 : 20, t: 30, b: 28 };
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const x = ms => m.l + (ms - X0) / (X1 - X0) * pw;
    const xi = px => X0 + (px - m.l) / pw * (X1 - X0);
    geo = { W, xi };
    const keys = VIEWS[state.view].keys;
    const showTotal = state.view === 'all';
    const stackTop = r => keys.reduce((s, k) => s + r.band[k], 0);
    const mx = Math.max(...NUM.map(r => showTotal ? Math.max(r.total, stackTop(r)) : stackTop(r)), showTotal && state.limit ? LIMIT_KG_U : 1);
    const ticks = niceTicks(mx * 1.06);
    const top = ticks[ticks.length - 1];
    const y = v => m.t + ph - v / top * ph;

    // Grid and axes
    const grid = mk('g', { class: 'ie-grid' }, svg);
    const ax = mk('g', { class: 'tsm-axis' }, svg);
    for (const v of ticks) {
      mk('line', { x1: m.l, x2: m.l + pw, y1: y(v), y2: y(v) }, grid);
      mk('text', { x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end' }, ax).textContent = v >= 1000 ? (v / 1000) + 'k' : v;
    }
    for (let yr = 2016; yr <= 2026; yr += narrow ? 2 : 1) {
      mk('text', { x: x(t(`${yr}-07-01`)), y: m.t + ph + 16, 'text-anchor': 'middle' }, ax).textContent = narrow ? `’${String(yr).slice(2)}` : yr;
      mk('line', { x1: x(t(`${yr}-01-01`)), x2: x(t(`${yr}-01-01`)), y1: m.t + ph, y2: m.t + ph + 4 }, ax);
    }

    // JCPOA period with no published figures
    const jcpoa0 = x(t('2016-01-16')), jcpoa1 = x(t(NUM[0].asof));
    const lim = mk('g', { class: 'ie-limitonly' }, svg);
    mk('rect', { x: jcpoa0, y: showTotal ? y(LIMIT_KG_U) : m.t + ph - 6, width: jcpoa1 - jcpoa0, height: showTotal ? m.t + ph - y(LIMIT_KG_U) : 6 }, lim);
    if (!narrow) mk('text', { x: jcpoa0 + 2, y: (showTotal ? y(LIMIT_KG_U) : m.t + ph - 6) - (showTotal && state.limit ? 20 : 6), 'text-anchor': 'start' }, lim).textContent = '2016–17: under the limit, no figures';

    // Unverified period
    const u0 = x(t(LAST_ESTIMATE)), u1 = x(t(AS_OF));
    const unk = mk('g', { class: 'ie-unknown' }, svg);
    mk('rect', { x: u0, y: m.t, width: u1 - u0, height: ph }, unk);
    const ul = mk('text', { x: u1 - 4, y: m.t + ph - (narrow ? 8 : 22), 'text-anchor': 'end' }, unk);
    ul.textContent = narrow ? '?' : 'Not verified since';
    if (!narrow) mk('text', { x: u1 - 4, y: m.t + ph - 8, 'text-anchor': 'end', class: 'sub' }, unk).textContent = '13 June 2025';

    // Stacked areas (straight lines join quarterly reports)
    const plot = mk('g', {}, svg);
    const base = NUM.map(() => 0);
    for (const L of LEVELS) {
      if (!keys.includes(L.k)) continue;
      const topv = NUM.map((r, j) => base[j] + r.band[L.k]);
      if (topv.every((v, j) => v === base[j])) continue;
      const up = NUM.map((r, j) => `${x(t(r.asof)).toFixed(1)},${y(topv[j]).toFixed(1)}`);
      const dn = NUM.map((r, j) => `${x(t(r.asof)).toFixed(1)},${y(base[j]).toFixed(1)}`).reverse();
      const p = mk('path', { class: 'ie-area', d: `M${up.join('L')}L${dn.join('L')}Z` }, plot);
      p.style.fill = L.color;
      topv.forEach((v, j) => { base[j] = v; });
    }
    if (showTotal) {
      mk('path', { class: 'ie-total', d: 'M' + NUM.map(r => `${x(t(r.asof)).toFixed(1)},${y(r.total).toFixed(1)}`).join('L') }, plot);
    }
    if (showTotal && state.limit) {
      mk('line', { class: 'ie-limit', x1: jcpoa0, x2: m.l + pw, y1: y(LIMIT_KG_U), y2: y(LIMIT_KG_U) }, plot);
      const lt = mk('text', { class: 'ie-limit-t', x: jcpoa0 + 2, y: y(LIMIT_KG_U) - 5 }, plot);
      lt.textContent = 'JCPOA limit, 202.8 kg';
    }
    motion(plot, [state.view, state.limit].join('|'));
    // Report dots
    const dots = mk('g', { class: 'ie-dots' }, svg);
    let onDot = null;
    for (const r of NUM) {
      const v = showTotal ? r.total : stackTop(r);
      mk('circle', { cx: x(t(r.asof)), cy: y(v), r: r.id === state.report ? 5 : 2.6, class: r.basis + (r.id === state.report ? ' on' : '') }, dots);
      if (r.id === state.report) onDot = [x(t(r.asof)), y(v)];
    }
    // Events along the top
    if (state.events) {
      const evg = mk('g', {}, svg);
      EVENTS.forEach((e, k) => {
        const ex = x(t(e.date));
        const g = mk('g', { class: 'ie-ev' + (state.ev === e.id ? ' on' : ''), tabindex: 0, role: 'button', 'aria-label': `${e.title}, ${niceDate(e.date)}` }, evg);
        mk('line', { x1: ex, x2: ex, y1: m.t - 8, y2: m.t + ph }, g);
        const cy = m.t - 14 + (k % 2) * 6;
        const d = mk('path', { d: `M${ex},${cy - 5}L${ex + 5},${cy}L${ex},${cy + 5}L${ex - 5},${cy}Z` }, g);
        d.style.fill = CAT_COLOR[e.cat];
        mk('rect', { x: ex - 9, y: cy - 9, width: 18, height: 18, class: 'hit' }, g);
        mk('title', {}, g).textContent = `${niceDate(e.date)}: ${e.title} (${CATS[e.cat]})`;
        g.addEventListener('click', () => onEvent(e.id));
        g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onEvent(e.id); } });
      });
    }
    // Cursor at the selected report
    const sel = ROWS.find(r => r.id === state.report);
    if (sel) {
      const cx = x(t(sel.asof));
      mk('line', { class: 'ie-cursor', x1: cx, x2: cx, y1: m.t, y2: m.t + ph }, svg);
    }
    // Motion: a ping on the selected report's dot when the report changes.
    if (onDot && lastReport !== null && lastReport !== state.report) ping(svg, onDot[0], onDot[1], { color: 'var(--ink)', r: 18, ms: 600, width: 1.5 });
    lastReport = state.report;
  }
  return { draw };
}
