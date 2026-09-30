// Phrase x week heatmap, drawn as SVG: key-event band, category headers, phrase rows, time axis
// and a coverage row (words of official text held per week). Hover shows a tooltip; click or
// arrow keys select a cell.
import { el } from '../../../shared/js/mapkit.js';
import { COUNTRIES, weekOf, weekStart, value, scaleMax, fmtValue, fmtN, MIN_WORDS, METRICS, escapeHtml } from './model.js';

const ROW = 20, GAP = 2, CATH = 20, EVH = 44, AXH = 22, COVH = 16;
const narrow = () => matchMedia('(max-width: 600px)').matches;
let LABW = 196;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function createGrid({ labelSvg, svg, scroller, tip, onSelect, onEvent }) {
  let G = null;

  function layout(rows) {
    let y = EVH;
    return rows.map(r => {
      const h = r.kind === 'cat' ? CATH : ROW;
      const out = { ...r, y, h };
      y += h + GAP;
      return out;
    });
  }

  function render(S, events) {
    LABW = narrow() ? 124 : 196;
    const C = COUNTRIES[S.cc];
    const w0 = Math.max(0, weekOf(S.range.from)), w1 = C.words.length - 1;
    const nW = w1 - w0 + 1;
    const avail = Math.max(200, scroller.clientWidth - 2);
    const cw = Math.max(3.2, avail / nW);
    const W = Math.round(cw * nW);
    const rows = layout(S.rows);
    const gridBottom = rows.length ? rows[rows.length - 1].y + rows[rows.length - 1].h : EVH;
    const yAxis = gridBottom + 4, yCov = yAxis + AXH + 4, H = yCov + COVH + 6;
    const x = w => (w - w0) * cw;
    const max = scaleMax(S.cc, rows, w0, w1, S.metric);
    G = { S, rows, w0, w1, cw, W, H, max };
    const pct = v => Math.min(1, S.metric === 'share' ? v : Math.sqrt(v / max)) * 100;

    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);

    // Key events: a stem and label above the grid, a faint band through it.
    const lanes = [-1e9, -1e9, -1e9];
    for (const ev of events) {
      const a = weekOf(ev.date), b = weekOf(ev.end || ev.date);
      if (b < w0 || a > w1) continue;
      const xa = x(a), xb = x(b) + cw;
      el('rect', { x: xa, y: EVH - 3, width: Math.max(2, xb - xa), height: gridBottom - EVH + 6, class: 'ev-band' }, svg);
      const tw = ev.short.length * 6.3 + 10;
      const lane = lanes.findIndex(l => l <= xa);
      if (lane < 0) { // no free lane: keep the band, drop the label (its name stays in the list below)
        el('path', { d: `M${xa + 0.5} ${EVH - 10}V${EVH - 3}`, class: 'ev-stem' }, svg).appendChild(el('title', {}, null, ev.name));
        continue;
      }
      lanes[lane] = xa + tw;
      const ly = 11 + lane * 12;
      el('path', { d: `M${xa + 0.5} ${ly + 2}V${EVH - 3}`, class: 'ev-stem' }, svg);
      const t = el('text', { x: xa + 3, y: ly, class: 'ev-label', tabindex: -1 }, svg, ev.short);
      t.appendChild(el('title', {}, null, `${ev.name} (${ev.date}${ev.end ? ' to ' + ev.end : ''})`));
      t.addEventListener('click', () => onEvent?.(ev));
    }

    // Cells
    const g = el('g', { class: 'cells' }, svg);
    for (const r of rows) {
      if (r.kind === 'cat') {
        el('rect', { x: 0, y: r.y + r.h - 1, width: W, height: 1, class: 'cat-rule' }, g);
        continue;
      }
      for (let w = w0; w <= w1; w++) {
        const v = value(S.cc, r.k, w, S.metric);
        const rect = el('rect', { x: x(w) + (cw > 5 ? 0.5 : 0), y: r.y, width: Math.max(1, cw - (cw > 5 ? 1 : 0.25)), height: r.h }, g);
        if (v == null) { rect.setAttribute('class', 'c-empty'); continue; }
        if (!v) { rect.setAttribute('class', C.words[w] < MIN_WORDS ? 'c-zero thin' : 'c-zero'); continue; }
        rect.style.fill = `color-mix(in oklab, var(--heat) ${Math.max(14, pct(v)).toFixed(0)}%, var(--cell0))`;
        if (C.words[w] < MIN_WORDS) rect.setAttribute('class', 'thin');
      }
    }

    // Time axis
    const step = cw * 4.3 < 24 ? 3 : 1;
    const t0 = Date.parse(weekStart(w0) + 'T00:00:00Z'), tEnd = Date.parse(weekStart(w1 + 1) + 'T00:00:00Z');
    const d = new Date(t0); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
    let first = true, lastX = -1e9;
    for (; d.getTime() < tEnd; d.setUTCMonth(d.getUTCMonth() + 1)) {
      const m = d.getUTCMonth();
      if (m % step) continue;
      const xx = ((d.getTime() - t0) / (7 * 864e5)) * cw;
      el('path', { d: `M${xx} ${yAxis}v5`, class: 'ax-tick' + (m === 0 ? ' yr' : '') }, svg);
      const lab = m === 0 || first ? `${MONTHS[m]} ${d.getUTCFullYear()}` : MONTHS[m];
      if (xx + lab.length * 6 < W && xx > lastX) {
        el('text', { x: xx + 2, y: yAxis + 16, class: 'ax-label' + (m === 0 ? ' yr' : '') }, svg, lab);
        lastX = xx + lab.length * 6.2 + 6;
      }
      first = false;
    }

    // Coverage: words of official text held per week.
    let cmax = 1;
    for (let w = w0; w <= w1; w++) cmax = Math.max(cmax, C.words[w]);
    for (let w = w0; w <= w1; w++) {
      if (!C.words[w]) continue;
      const hh = Math.max(1.5, COVH * Math.sqrt(C.words[w] / cmax));
      el('rect', { x: x(w), y: yCov + COVH - hh, width: Math.max(1, cw - 0.3), height: hh, class: 'cov' }, svg);
    }

    drawSelection();
    drawLabels(rows, yCov, H, S);
    return { max };
  }

  function drawLabels(rows, yCov, H, S) {
    labelSvg.replaceChildren();
    labelSvg.setAttribute('viewBox', `0 0 ${LABW} ${H}`);
    labelSvg.setAttribute('width', LABW); labelSvg.setAttribute('height', H);
    el('text', { x: LABW - 8, y: 24, class: 'lab-ev' }, labelSvg, 'Key events');
    for (const r of rows) {
      if (r.kind === 'cat') { el('text', { x: 4, y: r.y + 14, class: 'lab-cat' }, labelSvg, r.label); continue; }
      const sel = S.sel && S.sel.k === r.k;
      const t = el('text', { x: LABW - 8, y: r.y + 14, class: 'lab-row' + (sel ? ' on' : ''), 'data-k': r.k }, labelSvg,
        r.p.label.length > (narrow() ? 18 : 30) ? r.p.label.slice(0, narrow() ? 17 : 29) + '…' : r.p.label);
      t.appendChild(el('title', {}, null, `${r.p.label}: ${r.p.note} Click to jump to its peak week.`));
    }
    el('text', { x: LABW - 8, y: yCov + 12, class: 'lab-small' }, labelSvg, narrow() ? 'Words held' : 'Words held per week');
  }

  function hit(e) {
    if (!G) return null;
    const b = svg.getBoundingClientRect();
    const px = (e.clientX - b.left) * (G.W / b.width), py = (e.clientY - b.top) * (G.H / b.height);
    const r = G.rows.find(r => r.kind === 'phrase' && py >= r.y && py < r.y + r.h + GAP);
    const w = G.w0 + Math.floor(px / G.cw);
    if (!r || w < G.w0 || w > G.w1) return null;
    return { k: r.k, w };
  }

  function drawSelection() {
    svg.querySelector('.sel')?.remove();
    const sel = G?.S.sel;
    if (!sel) return;
    const r = G.rows.find(r => r.kind === 'phrase' && r.k === sel.k);
    if (!r || sel.w < G.w0 || sel.w > G.w1) return;
    el('rect', { x: (sel.w - G.w0) * G.cw - 1, y: r.y - 1, width: G.cw + 2, height: r.h + 2, class: 'sel' }, svg);
    labelSvg.querySelectorAll('.lab-row').forEach(t => t.classList.toggle('on', +t.dataset.k === sel.k));
  }

  svg.addEventListener('pointermove', e => {
    const h = hit(e);
    if (!h) { tip.hidden = true; return; }
    const S = G.S, C = COUNTRIES[S.cc], p = C.phrases[h.k];
    const v = value(S.cc, h.k, h.w, S.metric);
    tip.innerHTML = `<b>${escapeHtml(p.label)}</b><br>Week of ${weekStart(h.w)}<br>` + (C.ndocs[h.w]
      ? `<span class="num">${p.hits[h.w]}</span> uses in <span class="num">${p.docs[h.w]}</span> of <span class="num">${C.ndocs[h.w]}</span> ${C.stream.unit}s<br><span class="num">${fmtValue(v, S.metric)}</span> ${METRICS[S.metric].unit}${C.words[h.w] < MIN_WORDS ? `<br><i>Thin week: ${fmtN(C.words[h.w])} words</i>` : ''}`
      : 'No text held this week');
    const box = scroller.parentElement.getBoundingClientRect();
    tip.hidden = false;
    tip.style.left = Math.max(4, Math.min(e.clientX - box.left + 14, box.width - tip.offsetWidth - 6)) + 'px';
    tip.style.top = (e.clientY - box.top + 14) + 'px';
  });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  svg.addEventListener('click', e => { const h = hit(e); if (h) onSelect(h); });
  svg.addEventListener('keydown', e => {
    if (!G) return;
    const pr = G.rows.filter(r => r.kind === 'phrase');
    const sel = G.S.sel || { k: pr[0].k, w: G.w1 };
    let ri = Math.max(0, pr.findIndex(r => r.k === sel.k)), w = sel.w;
    if (e.key === 'ArrowLeft') w--; else if (e.key === 'ArrowRight') w++;
    else if (e.key === 'ArrowUp') ri--; else if (e.key === 'ArrowDown') ri++;
    else return;
    e.preventDefault();
    ri = Math.max(0, Math.min(pr.length - 1, ri)); w = Math.max(G.w0, Math.min(G.w1, w));
    onSelect({ k: pr[ri].k, w });
    scrollTo(w);
  });

  function scrollTo(w, pad = 40) {
    if (!G) return;
    const cx = (w - G.w0) * G.cw * (svg.getBoundingClientRect().width / G.W);
    if (cx < scroller.scrollLeft + pad || cx > scroller.scrollLeft + scroller.clientWidth - pad) scroller.scrollLeft = Math.max(0, cx - scroller.clientWidth / 2);
  }

  labelSvg.addEventListener('click', e => {
    const t = e.target.closest('.lab-row');
    if (t) onSelect({ k: +t.dataset.k, w: null });
  });

  return { render, drawSelection, scrollTo, geometry: () => G };
}
