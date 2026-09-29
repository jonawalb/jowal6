// Side panel, contract card and the "priced vs happened" scorecard.
import { el, esc, dayLabel, fmtUSD } from './util.js';
import { CASES, CASE_BY, MARKETS, weekBefore, brier, RES_LABEL } from './series.js';
import { colorOf, short } from './chart.js';

export function panelHtml() {
  return `
  <div class="sec">
    <p class="eyebrow">Question</p>
    <div class="choices cases" id="cases" role="group" aria-label="Question">
      ${CASES.map(c => `<button type="button" data-k="${c.k}" aria-pressed="false">${esc(c.title)}</button>`).join('')}
    </div>
  </div>
  <div class="sec">
    <p class="eyebrow">Contracts <small class="fine">(tap to focus, eye to hide)</small></p>
    <div class="mk-list" id="mk-list"></div>
  </div>
  <div class="sec" id="focus" aria-live="polite"></div>`;
}

export function listHtml(S) {
  const c = CASE_BY.get(S.case);
  return c.ids.map(id => {
    const m = MARKETS[id], on = !S.hidden.has(id);
    return `<div class="mk-row"><button type="button" class="mk" data-id="${id}" aria-pressed="${id === S.focus}">
        <i class="sw-c" style="background:${colorOf(c, id)}"></i><span>${esc(short(m.q))}</span><span class="res res-${m.res}">${m.res === 'open' ? 'open' : m.res}</span></button>
      <button type="button" class="eye" data-eye="${id}" aria-pressed="${on}" aria-label="${on ? 'Hide' : 'Show'} ${esc(short(m.q))}">${on ? '◉' : '○'}</button></div>`;
  }).join('');
}

export function focusHtml(S) {
  const m = MARKETS[S.focus];
  if (!m) return '';
  const wb = weekBefore(m), br = brier(m);
  const last = m.series[m.series.length - 1];
  const s = m.res === 'yes' ? 'bad' : m.res === 'no' ? 'good' : 'warn';
  return `<p class="eyebrow">Contract ${esc(m.id)}</p>
    <p class="q">${esc(m.q)}</p>
    <div class="status" data-s="${s}"><b>${RES_LABEL[m.res]}</b><span>${
      m.res === 'open' ? `Last archived price ${last ? `${last[1].toFixed(1)}¢ on ${dayLabel(last[0])}` : 'none'}.`
      : m.known ? `Prices settled at ${m.res === 'yes' ? '95¢ or more' : '5¢ or less'} from ${dayLabel(m.known)}.` : 'Final trades were not decisive.'}</span></div>
    <dl class="readout">
      <dt>Deadline</dt><dd>${m.deadline ? dayLabel(m.deadline) : '–'}</dd>
      ${wb ? `<dt>A week before</dt><dd>${wb.p.toFixed(1)}¢ (${dayLabel(wb.day)})${wb.early ? '*' : ''}</dd>` : ''}
      ${br != null ? `<dt>Mean Brier</dt><dd>${br.toFixed(3)} <small>(0 = perfect)</small></dd>` : ''}
      <dt>Archived days</dt><dd>${m.series.length} (${esc(m.seriesSrc)})</dd>
      <dt>Traded, archived</dt><dd>${fmtUSD(m.volume / 1e6)}</dd>
    </dl>
    ${wb?.early ? '<p class="fine">* The archive starts after that day; this is the first archived price.</p>' : ''}
    ${m.rule ? `<details class="rule"><summary>Resolution rule</summary><p>${esc(m.rule).replace(/\n+/g, '</p><p>')}</p>
      <p class="fine">Quoted from the <a href="${m.archive}" target="_blank" rel="noopener">archived Polymarket page</a> (snapshot ${m.ruleSnapshot.slice(0, 4)}-${m.ruleSnapshot.slice(4, 6)}-${m.ruleSnapshot.slice(6, 8)}).${/listed date|specified date/.test(m.rule) ? ' Contracts in a ladder share this rule; “the listed date” or “the specified date” is the date in the question.' : ''}</p></details>`
      : '<p class="fine">No archived copy of this contract’s rules could be retrieved; the question text is the only rule shown.</p>'}
    <p class="fine">Outcome from the final-price rule: the last 20 archived trades averaged ${m.finalYes == null ? '–' : `${(m.finalYes * 100).toFixed(1)}¢`} for Yes. It is not Polymarket’s official resolution notice.</p>`;
}

/** Scorecard: every resolved contract's price a week before settlement, by outcome. */
export function drawScore(svg, wrap, S, onPick) {
  const rows = CASES.flatMap(c => c.ids.map(id => ({ c, m: MARKETS[id] })))
    .filter(r => r.m.res === 'yes' || r.m.res === 'no')
    .map(r => ({ ...r, wb: weekBefore(r.m) })).filter(r => r.wb);
  const W = Math.max(300, wrap.clientWidth), H = 150, L = 92, R = 14;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const x = p => L + p / 100 * (W - L - R);
  const lanes = { yes: 44, no: 98 };
  const ax = el('g', { class: 'tsm-axis' }, svg);
  for (const t of [0, 25, 50, 75, 100]) {
    el('line', { x1: x(t), x2: x(t), y1: 20, y2: H - 22, class: 'grid' }, ax);
    el('text', { x: x(t), y: H - 6, 'text-anchor': 'middle' }, ax, `${t}¢`);
  }
  el('text', { x: L - 8, y: lanes.yes + 4, 'text-anchor': 'end', class: 'lane-t' }, svg, 'Happened');
  el('text', { x: L - 8, y: lanes.no + 4, 'text-anchor': 'end', class: 'lane-t' }, svg, 'Did not');
  const seen = {};
  for (const r of rows) {
    const key = `${r.m.res}${Math.round(r.wb.p / 3)}`;
    const k = seen[key] = (seen[key] || 0) + 1;
    const cy = lanes[r.m.res] + ((k % 2 ? 1 : -1) * Math.floor(k / 2) * 9);
    const g = el('g', { class: r.m.id === S.focus ? 'sc-dot focus' : 'sc-dot', tabindex: 0, role: 'button', 'aria-label': `${r.m.q} ${r.wb.p.toFixed(0)} cents a week before; ${r.m.res}` }, svg);
    el('circle', { cx: x(r.wb.p), cy, r: r.m.id === S.focus ? 7 : 5.5, class: `res-${r.m.res}` }, g);
    el('title', {}, g, `${r.m.q} ${r.wb.p.toFixed(1)}¢ a week before; resolved ${r.m.res}`);
    g.addEventListener('click', () => onPick(r.c.k, r.m.id));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(r.c.k, r.m.id); } });
  }
  const n = rows.length, mean = rows.reduce((s, r) => s + r.wb.err, 0) / n;
  const yesLow = rows.filter(r => r.m.res === 'yes' && r.wb.p < 50).length;
  const noHigh = rows.filter(r => r.m.res === 'no' && r.wb.p >= 50).length;
  return { n, mean, yesLow, noHigh, yes: rows.filter(r => r.m.res === 'yes').length };
}
