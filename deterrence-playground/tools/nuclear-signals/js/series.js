// Rhetoric vs events: monthly nuclear-rhetoric measures from the corpus, with the same state's sourced events on top.
import { ITEMS, esc, when, svgEl, glyph, CAT_COL, monthLabel, yr } from './common.js';
import { CORPUS_STATE } from './rules.js';
import { RHET } from '../data/rhetoric.js';

export const RC = [
  { k: 'RU', n: 'Russia' }, { k: 'CN', n: 'China' }, { k: 'US', n: 'United States' },
  { k: 'IN', n: 'India' }, { k: 'PK', n: 'Pakistan' }, { k: 'IR', n: 'Iran (not nuclear-armed)' },
];
// months row: [m, docs, docs_w, sent_w, sent_a, scored, hi, threat, escalation, hostility, z_threat, tgt]
export const METRICS = [
  { k: 'share', n: 'Share of documents', d: 'Share of official documents with at least one nuclear-weapons sentence.', f: r => (r[1] ? r[2] / r[1] : null), fmt: v => (v * 100).toFixed(1) + '%', min: 1 },
  { k: 'threat', n: 'Threat tone', d: 'Mean threat probability of the nuclear-weapons sentences the tone model scored.', f: r => r[7], fmt: v => v.toFixed(2), min: 5 },
  { k: 'hi', n: 'High-threat sentences', d: 'Nuclear-weapons sentences with threat probability of 0.5 or more.', f: r => r[6], fmt: v => String(v), min: 1 },
  { k: 'esc', n: 'Escalation tone', d: 'Mean escalation probability of the scored nuclear-weapons sentences.', f: r => r[8], fmt: v => v.toFixed(2), min: 5 },
];

export function renderSeries(root, S, { onPick, set, tip }) {
  const C = RHET.countries[S.rc], M = METRICS.find(m => m.k === S.metric) || METRICS[0];
  const st = CORPUS_STATE[S.rc];
  const rows = C.months;
  const sel = rows.find(r => r[0] === S.rmonth) || null;
  const quotes = sel ? ITEMS.filter(it => it.from === 'cx' && it.st[0] === st && it.d.startsWith(sel[0])).sort((a, b) => b.tone.threat - a.tone.threat) : [];
  const heads = sel ? C.media.filter(h => h[0].startsWith(sel[0])) : [];
  const evs = ITEMS.filter(it => it.from !== 'cx' && it.st.includes(st) && it.d >= rows[0][0]);
  root.innerHTML = `
    <div class="card controls">
      <div class="seg" role="group" aria-label="Country">${RC.map(c => `<button type="button" class="btn" data-rc="${c.k}" aria-pressed="${c.k === S.rc}">${esc(c.n)}</button>`).join('')}</div>
      <div class="row"><span class="lab">Measure</span><div class="seg small" role="group" aria-label="Measure">${METRICS.map(m => `<button type="button" class="btn" data-m="${m.k}" aria-pressed="${m.k === M.k}" title="${esc(m.d)}">${esc(m.n)}</button>`).join('')}</div></div>
      <p class="fine">${esc(M.d)} Official outlets only. ${M.min === 5 ? 'Months with fewer than 5 scored sentences are left out.' : ''}${S.rc === 'IR' ? ' Iran is not nuclear-armed; its series is shown because the corpus covers it and its nuclear file drives other states’ signalling.' : ''}</p>
    </div>
    <div class="card chartcard"><div class="chart-h"><p class="eyebrow">${esc(RC.find(c => c.k === S.rc).n)}: ${esc(M.n.toLowerCase())} by month, with ${esc(RC.find(c => c.k === S.rc).n.split(' (')[0])}'s sourced events</p></div>
      <div class="chartbox"><svg class="chart" id="ser-svg" role="img" aria-label="Monthly rhetoric measure with event marks"></svg><div class="tooltip" id="ser-tip" hidden></div></div>
      <p class="fine">Bars: the measure. Marks above: this state's events from the timeline (not corpus sentences). Grey strip: official documents per month, the denominator. A ring marks a month whose threat tone has a z-score of 2 or more against its own prior 12 months (see Method). Click a month to read its sentences.</p></div>
    <div class="card"><p class="eyebrow">${sel ? `${esc(monthLabel(sel[0]))}: ${sel[1]} official documents, ${sel[3]} nuclear-weapons sentences (${sel[5]} scored), ${sel[4]} arms-control or programme sentences` : 'Click a month in the chart'}</p>
      ${sel ? `<p class="fine">${sel[7] !== null ? `Mean threat ${sel[7].toFixed(2)}; escalation ${sel[8].toFixed(2)}; ` : ''}${sel[10] !== null ? `z ${sel[10].toFixed(1)} against the prior 12 months. ` : ''}Targets named in nuclear sentences: ${Object.entries(sel[11]).sort((a, b) => b[1][0] - a[1][0]).slice(0, 8).map(([t, v]) => `${esc(t)} ${v[0]}`).join(', ') || 'none'}.</p>
      <p class="eyebrow mt-s">Highest-threat official sentences (threat ≥ 0.5)</p>
      <ol class="ev">${quotes.map(it => `<li><button type="button" data-id="${esc(it.id)}"><span class="rpill">${it.tone.threat.toFixed(2)}</span><span class="ev-t"${it.lang !== 'en' ? ` lang="${esc(it.lang)}"` : ''}>“${esc(it.q)}”</span><span class="fine">${esc(when(it))} · ${esc(it.src[0][0])}</span></button></li>`).join('') || '<li class="fine">None scored 0.5 or above this month.</li>'}</ol>
      ${heads.length ? `<p class="eyebrow mt-s">State-media headlines (headline and link only)</p><ul class="src">${heads.map(h => `<li><a href="${esc(h[4])}" target="_blank" rel="noopener"${h[2] !== 'en' ? ` lang="${esc(h[2])}"` : ''}>${esc(h[3])}</a> <span class="fine">${esc(h[0])}, ${esc(h[1])}</span></li>`).join('')}</ul>` : ''}` : ''}
    </div>`;
  draw(root.querySelector('#ser-svg'), rows, M, evs, S, set, onPick, tip);
  root.querySelectorAll('[data-rc]').forEach(b => { b.onclick = () => set({ rc: b.dataset.rc, rmonth: null }); });
  root.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => set({ metric: b.dataset.m }); });
  root.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => onPick(b.dataset.id, false); });
}

function draw(svg, rows, M, evs, S, set, onPick, tip) {
  const W = Math.max(320, svg.parentElement.clientWidth || 700), H = 300, L = 44, R = 10, T = 44, B = 52;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const m0 = rows[0][0], m1 = rows[rows.length - 1][0];
  const x0 = yr(m0 + '-01'), x1 = yr(m1 + '-28') + 0.05;
  const X = v => L + (v - x0) / (x1 - x0) * (W - L - R);
  const bw = Math.max(1.5, (W - L - R) / ((x1 - x0) * 12) - 1.5);
  const vals = rows.map(r => ((M.k === 'threat' || M.k === 'esc') && r[5] < M.min) || r[1] < 1 ? null : M.f(r));
  const max = Math.max(...vals.filter(v => v !== null), 1e-6);
  const Y = v => T + (1 - v / max) * (H - T - B);
  for (const f of [0, 0.5, 1]) {
    svgEl('line', { x1: L, x2: W - R, y1: Y(max * f), y2: Y(max * f), class: 'grid' }, svg);
    svgEl('text', { x: L - 5, y: Y(max * f) + 4, 'text-anchor': 'end', class: 'ax-t' }, svg, M.fmt(max * f));
  }
  for (let y = Math.ceil(x0); y <= x1; y++) svgEl('text', { x: X(y), y: H - 6, 'text-anchor': 'middle', class: 'ax-t' }, svg, String(y));
  const dmax = Math.max(...rows.map(r => r[1]));
  rows.forEach((r, i) => {
    const x = X(yr(r[0] + '-15')) - bw / 2;
    svgEl('rect', { x, y: H - B + 8, width: bw, height: Math.max(0.5, r[1] / dmax * 14), class: 'den' }, svg);
    const v = vals[i];
    if (v !== null) {
      svgEl('rect', { x, y: Y(v), width: bw, height: Math.max(0.5, H - B - Y(v)), class: `bar${r[0] === S.rmonth ? ' sel' : ''}` }, svg);
      if (r[10] !== null && r[10] >= 2) svgEl('circle', { cx: x + bw / 2, cy: Y(v) - 6, r: 3.5, class: 'zring' }, svg);
    }
    const hit = svgEl('rect', { x: x - 0.75, y: T - 30, width: bw + 1.5, height: H - T - B + 52, class: 'hit', 'data-m': r[0] }, svg);
    hit.addEventListener('mousemove', e => tip(e, `<b>${esc(monthLabel(r[0]))}</b><br>${v !== null ? `${esc(M.n)}: ${M.fmt(v)}<br>` : ''}${r[1]} documents, ${r[3]} nuclear sentences`));
    hit.addEventListener('mouseleave', () => tip(null));
    hit.addEventListener('click', () => set({ rmonth: r[0] }));
  });
  // Event marks
  for (const it of evs) {
    const x = X(yr(it.d));
    if (x < L || x > W - R) continue;
    const p = svgEl('path', { d: glyph(it.cat, 7 + Math.min(it.rung || 0, 12) * 0.4), transform: `translate(${x.toFixed(1)},${T - 20 + ({ rhet: -8, force: -3, doct: 2, arms: 7, crisis: 0 }[it.cat])})`, class: 'mk', style: `fill:${CAT_COL[it.cat]}` }, svg);
    p.addEventListener('click', () => onPick(it.id, false));
    p.addEventListener('mousemove', e => tip(e, `<b>${esc(when(it))}</b><br>${esc(it.t)}`));
    p.addEventListener('mouseleave', () => tip(null));
  }
}
