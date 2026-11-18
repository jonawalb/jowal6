// Capacity estimates: each metric as a set of graded source ranges on a log axis, with the
// envelope recomputed from whichever grades the reader switches on.
import { METRICS, ESTIMATES, GRADE_INFO, GRADE_COL, esc, fmtDate, svgEl, keyable, clip } from './common.js';
import { GRADES, pick, envelope, periods, fmtNum, logDomain } from './range.js';

const PRESETS = [
  { k: 'ABCD', n: 'All sources', r: 'All sources' }, { k: 'ABC', n: 'Drop unnamed sources', r: 'Without unnamed sources' },
  { k: 'AB', n: 'Official and company only', r: 'Official and company sources' }, { k: 'A', n: 'U.S. government only', r: 'U.S. government sources' },
];

/** Estimates for a metric and period that share the period's main unit; others are listed apart. */
function split(metric, period) {
  const all = ESTIMATES.filter(e => e.metric === metric && e.period === period);
  const c = new Map(); all.forEach(e => c.set(e.unit, (c.get(e.unit) || 0) + 1));
  const unit = [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const num = all.filter(e => !e.qual);
  return { unit, main: num.filter(e => e.unit === unit), other: num.filter(e => e.unit !== unit), qual: all.filter(e => e.qual) };
}
const natural = ps => [...ps].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
export function periodOf(S, m) {
  const ps = periods(ESTIMATES, m), def = METRICS.find(x => x.id === m)?.default;
  return S.per[m] && ps.includes(S.per[m]) ? S.per[m] : (ps.includes(def) ? def : ps[0]);
}

export function renderEstimates(root, S, { onPick, set, tip, rerender }) {
  const presetOn = PRESETS.find(p => p.k === S.grades.join(''));
  root.innerHTML = `
    <div class="card"><p class="eyebrow">Which evidence counts?</p>
      <div class="grades full-only" role="group" aria-label="Evidence grades included">${GRADES.map(g => `<button type="button" class="gbtn" data-g="${g}" aria-pressed="${S.grades.includes(g)}" title="${esc(GRADE_INFO[g].d)}"><b class="g-${g}">${g}</b>${esc(GRADE_INFO[g].n)}</button>`).join('')}</div>
      <div class="pseg mt-s presets" role="group" aria-label="Presets">${PRESETS.map(p => `<button type="button" class="btn" data-p="${p.k}" aria-pressed="${presetOn === p}">${esc(p.n)}</button>`).join('')}</div>
      <label class="tg mt-s full-only"><input type="checkbox" id="rep" ${S.rep ? 'checked' : ''}><span class="sw"></span><span class="t">Count official restatements (↺)<small>official figures that repeat an analyst or press estimate; off = independent observations only</small></span></label>
      <p class="fine mt-s full-only">A grade says what kind of source carries a number, not whether the number is right. The shaded band runs from the lowest low to the highest high among the sources switched on; the dark tick is the median of their midpoints. ↺ marks an official figure that restates another source (off by default); ‹ marks an upper bound and › a lower bound.</p>
    </div>
    <div id="metrics"></div>
    <div class="card full-only"><p class="eyebrow">Summary: range with all grades vs. your selection</p><div class="tablewrap"><table class="sumtab" id="sum"></table></div></div>`;
  root.querySelectorAll('[data-g]').forEach(b => { b.onclick = () => {
    const g = b.dataset.g, on = S.grades.includes(g);
    set({ grades: on ? S.grades.filter(x => x !== g) : GRADES.filter(x => x === g || S.grades.includes(x)) });
  }; });
  root.querySelector('#rep').onchange = e => set({ rep: e.target.checked });
  root.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => set({ grades: b.dataset.p.split('') }); });

  const host = root.querySelector('#metrics');
  const sumRows = [];
  // Smuggling (M4) comes second so Simple mode shows it without "Show all".
  const ORDER = ['M1', 'M4', 'M2', 'M3', 'M5'];
  const ordered = [...METRICS].sort((a, b) => (ORDER.indexOf(a.id) + 1 || 99) - (ORDER.indexOf(b.id) + 1 || 99));
  for (const M of ordered) {
    const ps = natural(periods(ESTIMATES, M.id));
    if (!ps.length) continue;
    const per = periodOf(S, M.id);
    const { unit, main, other, qual } = split(M.id, per);
    const incl = main.filter(e => S.grades.includes(e.grade) && (S.rep || !e.repeats));
    const envSel = envelope(incl), envAll = envelope(main);
    sumRows.push({ M, per, unit, envAll, envSel });
    const card = document.createElement('div');
    card.className = 'card metric';
    card.id = 'm-' + M.id;
    card.innerHTML = `<div class="m-head"><h3>${esc(M.name)}</h3>
        ${ps.length > 4 ? `<label class="persel"><span class="fine">Period</span> <select data-persel aria-label="Period for ${esc(M.name)}">${ps.map(p => `<option value="${esc(p)}"${p === per ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></label>`
          : ps.length > 1 ? `<div class="pseg" role="group" aria-label="Period for ${esc(M.name)}">${ps.map(p => `<button type="button" class="btn" data-per="${esc(p)}" aria-pressed="${p === per}">${esc(p)}</button>`).join('')}</div>` : `<span class="fine">${esc(per)}</span>`}</div>
      <p class="unit">${esc(unit)}${M.period_note ? `<span class="full-only"> · ${esc(M.period_note)}</span>` : ''}</p>
      <p class="m-read">${envSel ? `${presetOn ? esc(presetOn.r) : `With grades ${esc(S.grades.join(', '))}`}: <b>${fmtNum(envSel.low)}${envSel.high !== envSel.low ? ' to ' + fmtNum(envSel.high) : ''}</b> from ${envSel.n} source${envSel.n === 1 ? '' : 's'}, middle estimate ${fmtNum(envSel.median)}.`
        : `<b>No source</b> with grades ${esc(S.grades.join(', ') || 'none')}${S.rep ? '' : ' (restatements off)'} for ${esc(per)}.`}
        ${envAll && (!envSel || envSel.low !== envAll.low || envSel.high !== envAll.high) ? `<span class="delta">All sources: ${fmtNum(envAll.low)} to ${fmtNum(envAll.high)} (${envAll.n}).</span>` : ''}</p>
      <div class="chartbox"><svg class="est" role="group" aria-label="Estimates for ${esc(M.name)}, ${esc(per)}"></svg></div>
      ${greyNote(main, S)}
      ${qual.length ? `<p class="fine full-only">Stated without a number: ${qual.map(e => `<button type="button" class="linkbtn" data-id="${esc(e.id)}">${esc(e.source)}</button> <span class="gtag g-${e.grade}">${e.grade}</span>${e.repeats ? ' ↺' : ''}: ${esc(e.qual)}`).join('; ')}.</p>` : ''}
      ${other.length ? `<p class="fine full-only">Not on this axis (different unit): ${other.map(e => `<button type="button" class="linkbtn" data-id="${esc(e.id)}">${esc(e.source)}</button> (${esc(e.unit)})`).join('; ')}.</p>` : ''}`;
    host.appendChild(card);
    card.querySelectorAll('[data-per]').forEach(b => { b.onclick = () => set({ per: { ...S.per, [M.id]: b.dataset.per } }); });
    card.querySelector('[data-persel]')?.addEventListener('change', e => set({ per: { ...S.per, [M.id]: e.target.value } }));
    card.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => onPick('e:' + b.dataset.id, true); });
    drawRows(card.querySelector('svg'), main, S, envSel, { onPick, tip });
  }
  clip(host, 'metrics', 2, 'measures', rerender);
  const T = root.querySelector('#sum');
  const rg = e => (e ? `${fmtNum(e.low)}${e.high !== e.low ? ' – ' + fmtNum(e.high) : ''}` : '–');
  T.innerHTML = `<thead><tr><th>Metric</th><th>Period</th><th class="num">All grades</th><th class="num">Your selection</th><th class="num">Sources</th></tr></thead><tbody>${sumRows.map(r =>
    `<tr><td><a href="#m-${r.M.id}" data-jump="${r.M.id}">${esc(r.M.name)}</a><br><span class="fine">${esc(r.unit)}</span></td><td>${esc(r.per)}</td><td class="num">${rg(r.envAll)}</td><td class="num">${rg(r.envSel)}</td><td class="num">${r.envSel ? r.envSel.n : 0} of ${r.envAll ? r.envAll.n : 0}</td></tr>`).join('')}</tbody>`;
  T.querySelectorAll('[data-jump]').forEach(a => { a.onclick = e => { e.preventDefault(); root.querySelector('#m-' + a.dataset.jump).scrollIntoView({ block: 'start' }); }; });
}

/** One line explaining greyed rows in plain words. */
function greyNote(main, S) {
  const why = [];
  if (!S.rep && main.some(e => e.repeats)) why.push('↺ rows restate another source');
  if (main.some(e => !S.grades.includes(e.grade))) why.push(`${why.length ? 'other greyed rows' : 'they'} have grades you switched off`);
  return why.length ? `<p class="fine greyed-note">Greyed rows are not counted: ${why.join('; ')}.</p>` : '';
}

function drawRows(svg, list, S, env, { onPick, tip }) {
  const W = Math.max(300, svg.parentElement.clientWidth || 700);
  const narrow = W < 560;
  const L = narrow ? 30 : 230, R = narrow ? 30 : 30, T = 8, RH = narrow ? 44 : 26, B = 26;
  const rows = [...list].sort((a, b) => a.grade.localeCompare(b.grade) || a.low - b.low);
  const H = T + rows.length * RH + B;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const [d0, d1] = logDomain(list);
  const X = v => L + (Math.log10(Math.max(v, d0)) - Math.log10(d0)) / (Math.log10(d1) - Math.log10(d0)) * (W - L - R);
  for (let p = Math.log10(d0); p <= Math.log10(d1) + 1e-9; p++) {
    const x = X(10 ** p);
    svgEl('line', { x1: x, x2: x, y1: T, y2: H - B + 2, class: 'grid' }, svg);
    svgEl('text', { x, y: H - 8, 'text-anchor': 'middle', class: 'ax-t' }, svg, fmtNum(10 ** p).replace(' million', 'M').replace(' billion', 'B'));
  }
  if (env) {
    svgEl('rect', { x: X(env.low), y: T, width: Math.max(2, X(env.high) - X(env.low)), height: rows.length * RH, class: 'env' }, svg);
    for (const v of [env.low, env.high]) svgEl('line', { x1: X(v), x2: X(v), y1: T, y2: T + rows.length * RH, class: 'env-l' }, svg);
    svgEl('line', { x1: X(env.median), x2: X(env.median), y1: T, y2: T + rows.length * RH, class: 'med' }, svg);
  }
  rows.forEach((e, i) => {
    const y = T + i * RH;
    const on = S.grades.includes(e.grade) && (S.rep || !e.repeats);
    const g = svgEl('g', {}, svg);
    svgEl('rect', { x: 0, y, width: W, height: RH, class: `rowbg${'e:' + e.id === S.sel ? ' sel' : ''}` }, g);
    const cy = narrow ? y + 28 : y + RH / 2;
    const lab = `${e.repeats ? '↺ ' : ''}${e.source}`;
    svgEl('rect', { x: narrow ? 8 : 4, y: (narrow ? y + 4 : cy - 8), width: 16, height: 16, rx: 3, style: `fill:${GRADE_COL[e.grade]}`, class: on ? '' : 'off' }, g);
    svgEl('text', { x: (narrow ? 16 : 12), y: (narrow ? y + 16 : cy + 4), 'text-anchor': 'middle', class: 'gl-t' }, g, e.grade);
    svgEl('text', { x: narrow ? 30 : 26, y: narrow ? y + 16 : cy + 4, class: `lab${on ? '' : ' off'}` }, g, lab.length > (narrow ? 46 : 32) ? lab.slice(0, narrow ? 45 : 31) + '…' : lab);
    const x0 = X(e.low), x1 = X(e.high);
    if (x1 - x0 > 2) svgEl('line', { x1: x0, x2: x1, y1: cy, y2: cy, class: `bar${on ? '' : ' off'}`, style: `stroke:${GRADE_COL[e.grade]}` }, g);
    else svgEl('circle', { cx: x0, cy, r: 5.5, class: `pt${on ? '' : ' off'}`, style: `fill:${GRADE_COL[e.grade]}` }, g);
    const val = valText(e);
    if (e.bound === 'min') svgEl('path', { d: `M${x1 - 8} ${cy - 5}L${x1 - 2} ${cy}L${x1 - 8} ${cy + 5}`, class: `cap${on ? '' : ' off'}`, style: `stroke:${GRADE_COL[e.grade]}` }, g);
    if (e.bound === 'max') svgEl('path', { d: `M${x0 + 8} ${cy - 5}L${x0 + 2} ${cy}L${x0 + 8} ${cy + 5}`, class: `cap${on ? '' : ' off'}`, style: `stroke:${GRADE_COL[e.grade]}` }, g);
    keyable(g, `Grade ${e.grade}, ${e.source}: ${val}${on ? '' : ', excluded by grade filter'}`, () => onPick('e:' + e.id, true));
    g.addEventListener('mousemove', ev => tip(ev, `<b>${esc(e.source)}</b> · grade ${e.grade}<br>${esc(val)}<br><span class="fine">${esc(fmtDate(e.date))}${on ? '' : ' · excluded'}</span>`));
    g.addEventListener('mouseleave', () => tip(null));
  });
}

const BOUND = { max: 'at most ', min: 'more than ', approx: 'about ' };
const valText = e => (e.qual ? e.qual : `${BOUND[e.bound] || ''}${fmtNum(e.low)}${e.high !== e.low ? ' to ' + fmtNum(e.high) : ''}`);

export function estimateDetail(e) {
  const val = valText(e);
  const M = METRICS.find(m => m.id === e.metric);
  return `<p class="eyebrow"><span class="gtag g-${e.grade}">${e.grade}</span> ${esc(GRADE_INFO[e.grade].n)} · ${esc(M ? M.name : e.metric)}</p>
    <h3 class="d-h">${esc(val)} <span class="fine">${esc(e.unit)}</span></h3>
    <p class="d-meta">${esc(e.period)} · ${esc(e.source)}${e.publisher && e.publisher !== e.source ? ', ' + esc(e.publisher) : ''} · ${esc(fmtDate(e.date))}${e.unverified ? ' <span class="unv">unverified</span>' : ''}</p>
    <p>${esc(e.what)}</p>
    ${e.quote ? (e.quote_is_paraphrase ? `<p class="fine"><b>Paraphrase of the report:</b> ${esc(e.quote)}</p>` : `<blockquote>${esc(e.quote)}</blockquote>`) : ''}
    <div class="d-lv">${e.repeats ? '<p><span class="unv">restates another source</span> This official figure repeats an earlier estimate, so it is not an independent observation.</p>' : ''}${e.bound === 'max' ? '<p class="fine">The source gives an upper bound, plotted at the bound with a ‹ mark.</p>' : e.bound === 'min' ? '<p class="fine">The source gives a lower bound ("more than"), plotted at the bound with a › mark.</p>' : e.bound === 'approx' ? '<p class="fine">The source gives an approximate figure.</p>' : ''}${e.qual ? '<p class="fine">The source gives no number, so this item is not plotted or counted in any range.</p>' : ''}<p><b>Why grade ${e.grade}:</b> ${esc(e.grade_note)}</p>${e.via ? `<p class="fine"><b>How the figure reaches the public:</b> ${esc(e.via)}</p>` : ''}</div>
    <p class="eyebrow">Source</p><ol class="d-src"><li><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.publisher || e.source)}</a></li></ol>`;
}
