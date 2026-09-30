// Comparison charts: daily tons, cumulative tons and reserves, player's run against the historical record.
import { MONTHLY, ANCHORS, REQUIREMENT } from '../data/history.js';
import { N_DAYS, dayOf, dateOf, fmt, fmtShort, monLabel } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, parent, text) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
};

/** Historical daily average by game day (USAFE monthly totals / days in the month's airlift). */
export const HIST_DAILY = (() => {
  const out = [];
  for (let i = 0; i < N_DAYS; i++) {
    const m = MONTHLY.find(x => x.m === dateOf(i).slice(0, 7));
    out.push(m ? m.total / m.days : 0);
  }
  return out;
})();

/** Historical cumulative tons at the end of each game day, linear within each month. */
export const HIST_CUM = (() => {
  const out = []; let cum = 0;
  for (let i = 0; i < N_DAYS; i++) { cum += HIST_DAILY[i]; out.push(cum); }
  return out;
})();

const reqOn = i => { const d = dateOf(i); let r = REQUIREMENT[0]; for (const x of REQUIREMENT) if (d >= x.from) r = x; return r.total; };

export const LEGENDS = {
  daily: [['ln', 'var(--you)', 'You, each day'], ['ln', 'var(--hist)', 'History, monthly average', true], ['dot', 'var(--hist)', 'History, sourced single days'], ['ln', 'var(--req)', 'Requirement', true]],
  cum: [['ln', 'var(--you)', 'You'], ['ln', 'var(--hist)', 'History (USAFE monthly totals)', true]],
  stocks: [['ln', 'var(--food)', 'Food reserve, days'], ['ln', 'var(--coal)', 'Coal reserve, days'], ['ln', 'var(--muted)', 'Political support (0–100)', true]],
};

export function drawChart(svg, tab, rec, cursor) {
  const W = Math.max(300, Math.round(svg.parentElement.clientWidth - 2));
  const H = W < 520 ? 230 : 270;
  const m = { l: W < 520 ? 40 : 52, r: tab === 'stocks' ? 34 : 12, t: 14, b: 26 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.textContent = '';
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const x = i => m.l + iw * i / N_DAYS;
  let yMax;
  if (tab === 'daily') yMax = Math.max(13500, ...rec.map(r => r.tons));
  else if (tab === 'cum') yMax = Math.max(HIST_CUM[N_DAYS - 1], rec.length ? rec[rec.length - 1].cum : 0) * 1.05;
  else yMax = Math.max(60, ...rec.map(r => Math.max(r.food, r.coal)));
  const y = v => m.t + ih * (1 - v / yMax);
  // Grid and axes
  const step = tab === 'daily' ? 2000 : tab === 'cum' ? (yMax > 1.2e6 ? 250000 : 100000) : 10;
  for (let v = 0; v <= yMax; v += step) {
    el('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'grid' }, svg);
    el('text', { x: m.l - 5, y: y(v) + 4, 'text-anchor': 'end', class: 'ax-t' }, svg, tab === 'cum' ? (v / 1e6).toFixed(v % 1e6 ? 2 : 0) + 'M' : (W < 520 && v >= 1000 ? v / 1000 + 'k' : fmt(v)));
  }
  if (tab === 'stocks') for (let v = 0; v <= 100; v += 25) el('text', { x: W - m.r + 4, y: m.t + ih * (1 - v / 100) + 4, class: 'ax-t' }, svg, v);
  MONTHLY.forEach((mo, j) => {
    const i = Math.max(0, dayOf(mo.m + '-01'));
    if (dayOf(mo.m + '-01') < 0) return;
    el('line', { x1: x(i), x2: x(i), y1: m.t, y2: H - m.b, class: 'grid' }, svg);
    if (W > 560 || j % 2 === 0) el('text', { x: x(i) + 3, y: H - m.b + 15, class: 'ax-t' }, svg, monLabel(mo.m));
  });
  el('text', { x: 4, y: 10, class: 'ax-l' }, svg, tab === 'daily' ? 'Tons a day' : tab === 'cum' ? 'Tons delivered' : 'Days of reserve');
  const line = (vals, cls, from = 0) => {
    if (!vals.length) return;
    el('path', { d: vals.map((v, i) => `${i ? 'L' : 'M'}${x(from + i + 0.5).toFixed(1)},${y(v).toFixed(1)}`).join(''), class: cls }, svg);
  };
  const stepLine = (vals, cls) => {
    let d = '';
    vals.forEach((v, i) => { d += `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}L${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`; });
    el('path', { d, class: cls }, svg);
  };
  if (tab === 'daily') {
    const bw = Math.max(1, iw / N_DAYS - 0.4);
    for (const r of rec) el('rect', { x: x(r.day), y: y(r.tons), width: bw, height: Math.max(0, y(0) - y(r.tons)), class: 'you' }, svg);
    const ma = rec.map((r, i) => { const w = rec.slice(Math.max(0, i - 6), i + 1); return w.reduce((a, b) => a + b.tons, 0) / w.length; });
    line(ma, 'you-l');
    stepLine(HIST_DAILY, 'hist-l');
    stepLine(Array.from({ length: N_DAYS }, (_, i) => reqOn(i)), 'req-l');
    for (const r of rec.filter(r => r.record)) el('circle', { cx: x(r.day + 0.5), cy: y(r.tons), r: 4, class: 'rec' }, svg);
    for (const a of ANCHORS) {
      const i = dayOf(a.d);
      el('circle', { cx: x(i + 0.5), cy: y(a.t), r: 4.5, class: 'anc' }, svg);
      if (a.t > 6000 && W > 420) el('text', { x: x(i + 0.5) - 6, y: y(a.t) - 7, 'text-anchor': 'end', class: 'anc-t' }, svg, a.label);
    }
  } else if (tab === 'cum') {
    line(HIST_CUM, 'hist-l');
    line(rec.map(r => r.cum), 'you-l');
  } else {
    el('rect', { x: m.l, y: y(10), width: iw, height: y(0) - y(10), class: 'band' }, svg);
    line(rec.map(r => r.food), 'food-l');
    line(rec.map(r => r.coal), 'coal-l');
    el('path', { d: rec.map((r, i) => `${i ? 'L' : 'M'}${x(i + 0.5).toFixed(1)},${(m.t + ih * (1 - r.support / 100)).toFixed(1)}`).join(''), class: 'sup-l' }, svg);
  }
  if (cursor != null && cursor >= 0) el('line', { x1: x(cursor + 0.5), x2: x(cursor + 0.5), y1: m.t, y2: H - m.b, class: 'cur' }, svg);
  return { dayAt: px => Math.max(0, Math.min(N_DAYS - 1, Math.floor((px - m.l) / iw * N_DAYS))) };
}

/** Text for the hover line on day i. */
export function describeDay(tab, rec, i) {
  const r = rec[i], d = dateOf(i);
  const a = ANCHORS.find(x => x.d === d);
  const hist = `History: <b>${fmt(HIST_DAILY[i])}</b> t/day (month average)`;
  let s = `<b>${fmtShort(d)} ${d.slice(0, 4)}</b> `;
  if (tab === 'cum') s += r ? `You: <b>${fmt(r.cum)}</b> t · History: <b>${fmt(HIST_CUM[i])}</b> t` : `History: <b>${fmt(HIST_CUM[i])}</b> t`;
  else if (tab === 'stocks') s += r ? `Food <b>${r.food.toFixed(0)}</b> days · Coal <b>${r.coal.toFixed(0)}</b> days · Support <b>${r.support.toFixed(0)}</b>` : 'Not flown yet';
  else s += (r ? `You: <b>${fmt(r.tons)}</b> t in ${fmt(r.flights)} landings · ` : '') + hist + ` · Required <b>${fmt(reqOn(i))}</b>`;
  if (a) s += `<br>${a.label}: <b>${fmt(a.t)}</b> t. ${a.note} (${a.src})`;
  return s;
}
