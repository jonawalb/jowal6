// Drawing: this week's reports, the week-by-indicator history grid, the estimate chart and the
// "how indicators work" table. No game logic here.
import { P } from '../data/params.js';
import { ALL, CATS, EXERCISE, ratios } from '../data/indicators.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, a, parent) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (parent) parent.appendChild(n); return n; };
export const LEVEL_COL = ['var(--chip)', 'color-mix(in srgb, var(--warn) 45%, var(--panel))', 'var(--warn)', 'var(--bad)'];

/** Did category k (index in ALL) show this week? */
export const seen = (wk, k) => (k === 0 ? wk.ex : wk.obs[k - 1]);

/** This week's reporting list. `look` = index looked at this week (or -1); `canLook` whether a look is still possible. */
export function paintReports(root, wk, look, canLook) {
  root.innerHTML = ALL.map((c, k) => {
    const on = seen(wk, k);
    const res = look === k ? `<span class="cw-look ${wk.look[k] ? 'hot' : 'cold'}">Closer look: ${wk.look[k] ? 'looks tied to preparation' : 'looks routine'}</span>` : '';
    const btn = look < 0 && canLook ? `<button type="button" class="btn cw-lk" data-look="${k}" aria-label="Take a closer look at ${c.label}">Look closer</button>` : '';
    return `<li class="cw-rep ${on ? 'on' : ''}"><span class="cw-dot" aria-hidden="true"></span><div><b>${c.label}</b> <span class="cw-st">${on ? 'Reported' : 'Quiet'}</span><small>${c.text}</small>${res}</div>${btn}</li>`;
  }).join('');
}

/**
 * Week × indicator grid. hist = committed weeks; `upto` = weeks to show; reveal = show the true phase of each week.
 */
export function paintGrid(root, world, hist, upto, reveal = false) {
  const cols = Array.from({ length: P.weeks }, (_, i) => i + 1);
  const cell = (t, k) => {
    if (t > upto) return '<td></td>';
    const wk = world.weeks[t - 1], h = hist[t - 1];
    const looked = h && h.look === k ? (wk.look[k] ? ' lk hot' : ' lk cold') : '';
    return `<td class="${seen(wk, k) ? 'on' : ''}${looked}"></td>`;
  };
  const phaseRow = reveal ? `<tr class="cw-ph"><th scope="row">Truth</th>${cols.map(t => `<td class="ph${t <= world.last ? world.weeks[t - 1].ph : 'x'}"></td>`).join('')}</tr>` : '';
  const lvRow = `<tr class="cw-lv"><th scope="row">Level</th>${cols.map(t => `<td style="background:${hist[t - 1] ? LEVEL_COL[hist[t - 1].level] : 'transparent'}"></td>`).join('')}</tr>`;
  root.innerHTML = `<table class="cw-grid" aria-label="Reports by week. A filled cell means the indicator was reported that week."><thead><tr><th></th>${cols.map(t => `<th scope="col" class="${t === upto ? 'now' : ''}">${t % 5 === 0 || t === 1 ? t : ''}</th>`).join('')}</tr></thead><tbody>${ALL.map((c, k) => `<tr><th scope="row">${c.short}</th>${cols.map(t => cell(t, k)).join('')}</tr>`).join('')}${lvRow}${phaseRow}</tbody></table>`;
}

/** Line chart of probabilities by week. series = [{ v: [0..1 per week], cls, label }]. */
export function paintChart(svg, series, { attackWeek = null, levels = null } = {}) {
  svg.innerHTML = '';
  const W = 640, H = 240, x0 = 40, x1 = 628, y0 = 14, y1 = levels ? 196 : 214;
  const X = t => x0 + (x1 - x0) * (t - 1) / (P.weeks - 1), Y = v => y1 - (y1 - y0) * v;
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    el('line', { x1: x0, x2: x1, y1: Y(v), y2: Y(v), class: 'cw-gl' }, svg);
    el('text', { x: x0 - 6, y: Y(v) + 4, 'text-anchor': 'end', class: 'cw-ax' }, svg).textContent = `${v * 100}%`;
  }
  for (let t = 1; t <= P.weeks; t += t === 1 ? 4 : 5) el('text', { x: X(t), y: H - 6, 'text-anchor': 'middle', class: 'cw-ax' }, svg).textContent = `wk ${t}`;
  if (levels) levels.forEach((L, i) => el('rect', { x: X(i + 1) - (x1 - x0) / (P.weeks - 1) / 2, y: y1 + 6, width: (x1 - x0) / (P.weeks - 1), height: 12, fill: LEVEL_COL[L] }, svg));
  if (attackWeek) {
    el('line', { x1: X(attackWeek), x2: X(attackWeek), y1: y0, y2: y1, class: 'cw-atk' }, svg);
    el('text', { x: X(attackWeek) - 4, y: y0 + 10, 'text-anchor': 'end', class: 'cw-ax cw-atkt' }, svg).textContent = 'attack';
  }
  for (const s of series) {
    if (!s.v.length) continue;
    el('path', { d: s.v.map((v, i) => `${i ? 'L' : 'M'}${X(i + 1).toFixed(1)} ${Y(v).toFixed(1)}`).join(''), class: `cw-ln ${s.cls}` }, svg);
    const last = s.v.length;
    el('circle', { cx: X(last), cy: Y(s.v[last - 1]), r: 3.5, class: `cw-pt ${s.cls}` }, svg);
  }
}

const fx = v => (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2));
/** The "how indicators work" table: illustrative likelihood ratios. */
export function indicatorTable() {
  const row = c => {
    const r = ratios(c);
    const cells = a => `<td class="num">×${fx(a[0])}</td><td class="num">×${fx(a[1])}</td>`;
    return `<tr><th scope="row">${c.label}</th>${cells(r.normal.seen)}${r.exercise ? cells(r.exercise.seen) : '<td class="muted" colspan="2">n/a</td>'}${cells(r.normal.quiet)}${cells(r.look)}</tr>`;
  };
  return `<div class="cw-tw"><table class="cw-lr"><caption class="fine">Illustrative likelihood ratios: how many times likelier a report is in early / late preparation than in a routine week. Invented for the game.</caption>
  <thead><tr><th></th><th colspan="2" scope="colgroup">Reported, normal week</th><th colspan="2" scope="colgroup">Reported, exercise week</th><th colspan="2" scope="colgroup">Quiet, normal week</th><th colspan="2" scope="colgroup">Closer look: tied to prep</th></tr>
  <tr><th></th>${'<th scope="col">early</th><th scope="col">late</th>'.repeat(4)}</tr></thead>
  <tbody>${[EXERCISE, ...CATS].map(row).join('')}</tbody></table></div>`;
}
