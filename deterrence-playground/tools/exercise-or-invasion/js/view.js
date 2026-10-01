// Drawing helpers: calendar strip, reading bars and the debrief timeline. DOM only, no game rules.
import { P, LABEL } from '../data/params.js';
import { inWindow } from './model.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.appendChild(n); return n; }
export const pct = x => `${Math.round(x * 100)}%`;
export const COL = { red: 'var(--red)', blue: 'var(--blue)' };

/** Twelve week cells: exercise windows, the current week, warnings, stand-downs and an attack. */
export function paintCalendar(ol, s) {
  const marks = {};
  for (const h of s.history) marks[h.week] = h.attack ? 'attack' : h.act === 'warn' ? 'warn' : h.act === 'stand' ? 'stand' : '';
  ol.innerHTML = Array.from({ length: P.weeks }, (_, w) => {
    const win = inWindow(s, w), cur = w === s.week && !s.over, m = marks[w] || '';
    const label = `Week ${w + 1}${win ? ', exercise window' : ''}${cur ? ', this week' : ''}${m ? ', ' + { attack: 'Red attacked', warn: 'Blue warned', stand: 'Blue stood down' }[m] : ''}`;
    return `<li class="${win ? 'win' : ''}${cur ? ' cur' : ''}${w < s.week ? ' past' : ''} ${m}" aria-label="${label}" title="${label}"><span>${w + 1}</span></li>`;
  }).join('');
}

/** A 0-100 meter with a label and value. */
export const meter = (label, v, { col = 'var(--accent)', mark = null, note = '' } = {}) =>
  `<div class="eo-meter" style="--mc:${col}"><div><span>${label}</span><b class="num">${Math.round(v)}</b></div>
   <div class="bar" role="img" aria-label="${label} ${Math.round(v)} of 100"><span style="width:${Math.max(0, Math.min(100, v))}%"></span>${mark != null ? `<i style="left:${mark}%"></i>` : ''}</div>${note ? `<small>${note}</small>` : ''}</div>`;

/** One reading against what an exercise alone and an attack build-up would look like. */
export function readingRow(k, x, e, c) {
  const hi = Math.max(6, e.A + 2.5, (x ?? 0) + 1);
  const at = v => `${Math.max(0, Math.min(100, (v / hi) * 100)).toFixed(1)}%`;
  const sd = Math.sqrt(P.sigma[k] ** 2 / Math.max(1, c));
  const verdict = x == null ? 'not collected' : x > e.A ? 'looks like preparation' : x < e.E ? 'quieter than an exercise' : (x - e.E) / (e.A - e.E || 1) > 0.5 ? 'leans preparation' : 'leans exercise';
  return `<tr><th scope="row">${LABEL[k]} <span class="muted">(${c} pt${c === 1 ? '' : 's'})</span></th>
    <td class="num">${x == null ? '—' : x.toFixed(1)}</td>
    <td class="eo-rbar"><div class="rb" aria-hidden="true"><i class="e" style="left:${at(e.E)}" title="exercise only"></i><i class="a" style="left:${at(e.A)}" title="build-up"></i>${x == null ? '' : `<b style="left:${at(x)};--w:${at(sd * 2)}"></b>`}</div><small>${verdict}</small></td></tr>`;
}

/** End screen timeline. rows: [{ week, R, M, p, red, you }] on a 0-100 scale. */
export function paintTimeline(root, s, rows) {
  root.innerHTML = '';
  const W = 640, H = 250, L = 38, R = 14, T = 12, B = 30, n = P.weeks;
  const x = i => L + (i + 0.5) * (W - L - R) / n, y = v => T + (1 - v / 100) * (H - T - B);
  for (let w = 0; w < n; w++) if (inWindow(s, w)) el('rect', { x: L + w * (W - L - R) / n, y: T, width: (W - L - R) / n, height: H - T - B, fill: 'var(--chip)' }, root);
  for (const v of [0, 25, 50, 75, 100]) {
    el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: 'var(--rule)' }, root);
    el('text', { x: L - 6, y: y(v) + 4, 'font-size': 11, 'text-anchor': 'end', fill: 'var(--muted)' }, root).textContent = v;
  }
  for (let w = 0; w < n; w++) el('text', { x: x(w), y: H - 10, 'font-size': 11, 'text-anchor': 'middle', fill: 'var(--muted)' }, root).textContent = w + 1;
  el('line', { x1: L, x2: W - R, y1: y(P.readiness.attackMin), y2: y(P.readiness.attackMin), stroke: 'var(--red)', 'stroke-dasharray': '4 4', opacity: 0.7 }, root);
  const line = (key, col, dash) => {
    const pts = rows.filter(r => r[key] != null);
    if (!pts.length) return;
    el('polyline', { points: pts.map(r => `${x(r.week)},${y(r[key])}`).join(' '), fill: 'none', stroke: col, 'stroke-width': 2.5, ...(dash ? { 'stroke-dasharray': dash } : {}) }, root);
    for (const r of pts) el('circle', { cx: x(r.week), cy: y(r[key]), r: 2.5, fill: col }, root);
  };
  for (const [k, c, d] of LINES) line(k, c, d);
  for (const h of s.history) {
    const mk = h.attack ? ['✕', 'var(--bad)'] : h.act === 'warn' ? ['!', 'var(--blue)'] : h.act === 'stand' ? ['↓', 'var(--muted)'] : null;
    if (!mk) continue;
    el('line', { x1: x(h.week), x2: x(h.week), y1: T, y2: H - B, stroke: mk[1], 'stroke-width': 1.5, opacity: 0.8 }, root);
    el('text', { x: x(h.week) + 4, y: T + 12, 'font-size': 13, 'font-weight': 700, fill: mk[1] }, root).textContent = mk[0];
  }
}

const LINES = [['R', 'var(--red)', null], ['M', 'var(--blue)', null], ['p', 'var(--ink)', '2 3'], ['red', 'var(--warn)', '6 3'], ['you', 'var(--good)', '1 4']];
const NAMES = { R: 'Red readiness', M: 'Blue mobilization', p: 'Blue analyst model: P(attack)', red: 'Red’s estimate of Blue’s suspicion', you: 'Your belief: P(attack)' };
/** HTML legend for the timeline (only the lines present). */
export const legendHTML = keys => `<p class="eo-key">${LINES.filter(([k]) => keys.includes(k)).map(([k, c, d]) =>
  `<span><svg width="22" height="8" aria-hidden="true"><line x1="0" x2="22" y1="4" y2="4" stroke="${c}" stroke-width="2.5"${d ? ` stroke-dasharray="${d}"` : ''}/></svg>${NAMES[k]}</span>`).join('')}<span>! warning · ↓ stand-down · ✕ attack</span></p>`;
