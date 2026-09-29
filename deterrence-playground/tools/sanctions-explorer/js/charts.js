// Timeline of case starts (stacked by outcome) and success-by-objective bars.
import { CLASSES, ISSUES, pct } from './model.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (String(v).startsWith('var(')) e.style.setProperty(k === 'fill' ? 'fill' : k, v); else e.setAttribute(k, v);
  }
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

/** Stacked bars per start year. onPick(year) toggles the year filter on the case list. */
export function drawTimeline(svg, bins, sel, { onPick, tip }) {
  const W = Math.max(300, svg.parentElement.clientWidth || 700);
  const narrow = W < 560;
  const H = narrow ? 200 : 230, L = 34, R = 8, T = 10, B = 24;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const max = Math.max(1, ...bins.map(b => b.n));
  const step = max > 60 ? 20 : max > 25 ? 10 : max > 10 ? 5 : 2;
  const top = Math.ceil(max / step) * step;
  const bw = (W - L - R) / bins.length;
  const y = v => T + (H - T - B) * (1 - v / top);
  for (let v = 0; v <= top; v += step) {
    el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }, svg);
    el('text', { x: L - 5, y: y(v) + 3.5, 'text-anchor': 'end', class: 'ax-t' }, svg, v);
  }
  const every = narrow ? 20 : 10;
  bins.forEach((b, i) => {
    const x = L + i * bw;
    if (b.y % every === 0) el('text', { x: x + bw / 2, y: H - 6, 'text-anchor': 'middle', class: 'ax-t' }, svg, b.y);
    let acc = 0;
    for (const k of CLASSES) {
      const v = b.v[k.k];
      if (!v) continue;
      el('rect', { x: x + 0.5, width: Math.max(0.8, bw - 1), y: y(acc + v), height: y(acc) - y(acc + v), fill: k.col }, svg);
      acc += v;
    }
    if (b.y === sel) el('rect', { x: x - 0.5, width: bw + 1, y: T - 2, height: H - T - B + 2, class: 'selbox' }, svg);
    const hit = el('rect', { x, width: bw, y: T, height: H - T - B, class: 'hit', tabindex: b.n ? 0 : -1,
      role: 'button', 'aria-label': `${b.y}: ${b.n} cases began. Show them in the case list.` }, svg);
    const html = () => `<b>${b.y}</b>${b.n} case${b.n === 1 ? '' : 's'} began${CLASSES.filter(k => b.v[k.k]).map(k => `<small>${k.n}: ${b.v[k.k]}</small>`).join('')}`;
    hit.addEventListener('mousemove', e => tip(e, html()));
    hit.addEventListener('mouseleave', () => tip(null));
    hit.addEventListener('click', () => { tip(null); if (b.n) onPick(b.y); });
    hit.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && b.n) { e.preventDefault(); onPick(b.y); } });
  });
  el('line', { x1: L, x2: W - R, y1: y(0), y2: y(0), class: 'ax' }, svg);
}

/** 100%-stacked bars per objective, with the success rate on the right. */
export function renderIssues(host, rows, S, onPick) {
  if (!rows.length) { host.innerHTML = '<p class="fine">No cases match the filters.</p>'; return; }
  host.innerHTML = rows.map(({ i, st }) => {
    const segs = CLASSES.filter(k => st.by[k.k]).map(k =>
      `<span style="width:${(st.by[k.k] / st.n * 100).toFixed(2)}%;background:${k.col}" title="${k.n}: ${st.by[k.k]}"></span>`).join('');
    const on = String(i) === String(S.iss);
    return `<li><button type="button" class="ob" data-i="${i}" aria-pressed="${on}" title="${ISSUES[i].d}">
      <span class="ob-n">${ISSUES[i].n}</span><span class="ob-c num">${st.n}</span>
      <span class="ob-bar">${segs}</span><span class="ob-r num" title="${st.coded} with an outcome coded">${pct(st.rate)}</span></button></li>`;
  }).join('');
  host.querySelectorAll('.ob').forEach(b => { b.onclick = () => onPick(b.dataset.i); });
}
