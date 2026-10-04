// Dyad view: where each pair stands on Kahn's ladder, the evidence behind it, and its history.
import { esc, when, glyphSvg, svgEl, monthsBetween, monthLabel, NOW, RUNG_RULE, laneName } from './common.js';
import { DYADS } from './rules.js';
import { RUNGS, GROUPS } from '../data/ladder.js';
import { placement, history, context, aimed } from './placement.js';

const SHOW = 14;   // rungs drawn individually; 15-44 are folded into one band
const LAST = NOW.slice(0, 7);

function drawLadder(svg, p) {
  const W = 300, RH = 21, T = 8;
  const H = T + (SHOW + 1) * RH + 8;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const Y = r => T + (SHOW - r + 1) * RH;  // rung r row top; row 0 = folded band
  svgEl('rect', { x: 0, y: T, width: W, height: RH - 3, class: 'lad-fold', rx: 3 }, svg);
  svgEl('text', { x: 8, y: T + 14, class: 'lad-t' }, svg, '15–44: nuclear use. Never reached.');
  for (let r = SHOW; r >= 1; r--) {
    const y = Y(r), on = r === p.rung, has = p.ev.some(e => e.rung === r);
    svgEl('rect', { x: 0, y, width: W, height: RH - 3, rx: 3, class: `lad-r${on ? ' on' : has ? ' has' : ''}` }, svg);
    svgEl('text', { x: 8, y: y + 13, class: 'lad-n' }, svg, String(r));
    svgEl('text', { x: 30, y: y + 13, class: `lad-t${on ? ' on' : ''}` }, svg, RUNGS[r].length > 38 ? RUNGS[r].slice(0, 37) + '…' : RUNGS[r]);
    const n = p.ev.filter(e => e.rung === r).length;
    if (n) svgEl('text', { x: W - 8, y: y + 13, 'text-anchor': 'end', class: 'lad-c' }, svg, `${n}`);
  }
  for (const g of GROUPS) if (g.after && g.to < SHOW) {
    const y = Y(g.to) - 2;
    svgEl('line', { x1: 0, x2: W, y1: y, y2: y, class: 'lad-th' }, svg);
  }
}

function drawHistory(svg, dyId, from, win, asOf, onMonth) {
  const months = monthsBetween(from, LAST);
  const h = history(dyId, months, win);
  const W = Math.max(300, svg.parentElement.clientWidth || 600), H = 150, L = 30, R = 8, T = 10, B = 22;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const X = i => L + i / Math.max(1, months.length - 1) * (W - L - R);
  const Y = r => T + (1 - r / 12) * (H - T - B);
  for (const r of [0, 3, 6, 9, 12]) {
    svgEl('line', { x1: L, x2: W - R, y1: Y(r), y2: Y(r), class: 'grid' }, svg);
    svgEl('text', { x: L - 5, y: Y(r) + 4, 'text-anchor': 'end', class: 'ax-t' }, svg, String(r));
  }
  const yrs = months.filter(m => m.endsWith('-01'));
  const every = yrs.length > 30 ? 10 : yrs.length > 12 ? 4 : 1;
  yrs.forEach((m, i) => { if (i % every) return; const x = X(months.indexOf(m)); svgEl('text', { x, y: H - 6, 'text-anchor': 'middle', class: 'ax-t' }, svg, m.slice(0, 4)); });
  let d = '';
  h.forEach((r, i) => { d += `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(r).toFixed(1)}` + (i < h.length - 1 ? `L${X(i + 1).toFixed(1)} ${Y(r).toFixed(1)}` : ''); });
  svgEl('path', { d, class: 'hist-l' }, svg);
  const ai = months.indexOf(asOf);
  if (ai >= 0) svgEl('line', { x1: X(ai), x2: X(ai), y1: T, y2: H - B, class: 'selline' }, svg);
  const hit = svgEl('rect', { x: L, y: T, width: W - L - R, height: H - T - B, class: 'hit' }, svg);
  const pick = e => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    const i = Math.round((loc.x - L) / (W - L - R) * (months.length - 1));
    return months[Math.max(0, Math.min(months.length - 1, i))];
  };
  hit.addEventListener('click', e => onMonth(pick(e)));
}

export function renderLadder(root, S, { onPick, set }) {
  const D = DYADS.find(d => d.id === S.dyad) || DYADS[0];
  const p = placement(D.id, S.asOf, S.win);
  const ctx = context(D.id, S.asOf, S.win);
  const histFrom = S.hist === 'all' ? '1960-01' : '2021-01';
  const a2b = D.a.map(a => aimed(a, D.b, S.asOf, S.win)).find(Boolean);
  const b2a = D.b.map(b => aimed(b, D.a, S.asOf, S.win)).find(Boolean);
  const allMonths = monthsBetween('1960-01', LAST);
  const rhetLine = (r, from, to) => !r ? `<li>${esc(from)}: no official corpus series.</li>`
    : `<li><b>${esc(from)} on ${esc(to)}:</b> ${r.n} nuclear-weapons sentence${r.n === 1 ? '' : 's'} naming ${esc(to)} in ${r.docs.toLocaleString('en-US')} official documents over ${r.months} month${r.months === 1 ? '' : 's'}${r.threat !== null ? `; mean threat tone ${r.threat.toFixed(2)}` : ''}.</li>`;
  root.innerHTML = `
    <div class="dy-grid" role="group" aria-label="Dyad">${DYADS.map(d => { const q = placement(d.id, S.asOf, S.win);
      return `<button type="button" class="dy-b" data-dy="${d.id}" aria-pressed="${d.id === D.id}"><span class="dy-n">${esc(d.name)}</span>
        <span class="dy-r"><i style="width:${(q.rung / 12 * 100).toFixed(0)}%"></i></span><span class="fine">${q.rung ? `Rung ${q.rung}: ${esc(RUNGS[q.rung])}` : 'No placed item'}</span></button>`; }).join('')}</div>
    <div class="card ctl">
      <label class="lab" for="asof">As of <b id="asof-t">${esc(monthLabel(S.asOf))}</b></label>
      <input id="asof" class="slider" type="range" min="0" max="${allMonths.length - 1}" value="${allMonths.indexOf(S.asOf)}" aria-valuetext="${esc(monthLabel(S.asOf))}">
      <div class="row"><span class="lab">Window</span><div class="seg small" role="group" aria-label="Window in months">${[3, 6, 12, 24].map(w => `<button type="button" class="btn" data-win="${w}" aria-pressed="${w === S.win}">${w} months</button>`).join('')}</div>
      <button type="button" class="btn" id="asof-now">Latest</button></div>
    </div>
    <div class="lad-wrap">
      <div class="card"><p class="eyebrow">${esc(D.name)}, ${esc(monthLabel(S.asOf))}</p>
        <p class="lad-big">${p.rung ? `Rung ${p.rung}` : 'Not placed'}</p>
        <p class="fine">${p.rung ? `${esc(RUNGS[p.rung])}. Set by ${p.top.rule === 'K' ? "Kahn's Escalation Ladder coding" : `rule ${esc(p.top.rule)}`}: ${esc(p.top.t)} (${esc(when(p.top))}).` : `No placed item in the ${S.win} months to ${esc(monthLabel(S.asOf))}.`}</p>
        <svg class="ladder" id="ladder-svg" role="img" aria-label="Kahn's ladder, rungs 1 to 14, with the current placement highlighted"></svg>
        ${D.note ? `<p class="fine">${esc(D.note)}</p>` : ''}</div>
      <div class="card"><p class="eyebrow">Evidence in the window (${p.ev.length} placed, ${ctx.length} context)</p>
        <ol class="ev">${p.ev.map(it => `<li><button type="button" data-id="${esc(it.id)}"><span class="rpill">rung ${it.rung}</span>
          <span class="ev-t">${glyphSvg(it.cat)} ${esc(it.t)}</span><span class="fine">${esc(when(it))} · ${esc(it.st.map(laneName).join(', '))} · ${it.rule === 'K' ? 'Kahn tool coding' : `${esc(it.rule)}: ${esc(RUNG_RULE[it.rule].label)}`}</span></button></li>`).join('') || '<li class="fine">None.</li>'}</ol>
        ${ctx.length ? `<details><summary>Context items, not placed (${ctx.length})</summary><ol class="ev">${ctx.map(it => `<li><button type="button" data-id="${esc(it.id)}">
          <span class="ev-t">${glyphSvg(it.cat)} ${esc(it.t)}</span><span class="fine">${esc(when(it))} · R0</span></button></li>`).join('')}</ol></details>` : ''}
        <p class="eyebrow mt-s">Rhetoric in the same window (context only, never places)</p>
        <ul class="src">${rhetLine(a2b, laneName(D.a[0]), D.b.map(laneName).join('/'))}${rhetLine(b2a, laneName(D.b[0]), D.a.map(laneName).join('/'))}</ul>
      </div>
    </div>
    <div class="card"><div class="chart-h"><p class="eyebrow">Placement by month, ${S.win}-month window</p>
      <div class="seg small" role="group" aria-label="History range"><button type="button" class="btn" data-hist="now" aria-pressed="${S.hist !== 'all'}">2021 to now</button><button type="button" class="btn" data-hist="all" aria-pressed="${S.hist === 'all'}">1960 to now</button></div></div>
      <div class="chartbox"><svg class="chart" id="hist-svg" role="img" aria-label="Placement on the ladder by month"></svg></div>
      <p class="fine">Click the chart to move the as-of date. Rungs above 12 are never reached and not drawn.</p></div>`;
  drawLadder(root.querySelector('#ladder-svg'), p);
  drawHistory(root.querySelector('#hist-svg'), D.id, histFrom, S.win, S.asOf, m => set({ asOf: m }));
  root.querySelectorAll('[data-dy]').forEach(b => { b.onclick = () => set({ dyad: b.dataset.dy }); });
  root.querySelectorAll('[data-win]').forEach(b => { b.onclick = () => set({ win: +b.dataset.win }); });
  root.querySelectorAll('[data-hist]').forEach(b => { b.onclick = () => set({ hist: b.dataset.hist }); });
  root.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => onPick(b.dataset.id, false); });
  const sl = root.querySelector('#asof');
  sl.oninput = () => { const m = allMonths[+sl.value]; root.querySelector('#asof-t').textContent = monthLabel(m); sl.setAttribute('aria-valuetext', monthLabel(m)); };
  sl.onchange = () => set({ asOf: allMonths[+sl.value] });
  root.querySelector('#asof-now').onclick = () => set({ asOf: LAST });
}
