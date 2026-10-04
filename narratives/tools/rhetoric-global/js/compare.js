// Cross-country comparison: the same pattern run on both corpora, as monthly uses per 1,000
// words (3-month rolling mean), one small chart per shared theme. Hovering, tapping or arrow keys on any chart move a
// shared cursor and print both countries' values for that month.
import { SHARED } from '../data/corpus.js';
import { COUNTRIES, CC, escapeHtml, fmtValue } from './model.js';

const W = 260, H = 84, PAD = 4;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = m => `${MON[+m.slice(5) - 1]} ${m.slice(0, 4)}`;

function rates(cc, id, m0) {
  const S = SHARED[cc], out = [];
  for (let i = m0; i < SHARED.months.length; i++) {
    let w = 0, h = 0;
    for (let j = Math.max(m0, i - 2); j <= i; j++) { w += S.words[j]; h += S.hits[id][j]; }
    out.push(S.words[i] >= 1000 && w ? (h / w) * 1000 : null);
  }
  return out;
}

function overall(cc, id, m0) {
  const S = SHARED[cc];
  let w = 0, h = 0;
  for (let i = m0; i < SHARED.months.length; i++) { w += S.words[i]; h += S.hits[id][i]; }
  return w ? (h / w) * 1000 : 0;
}

export function renderCompare(box, S) {
  const m0 = Math.max(0, SHARED.months.findIndex(m => m >= S.range.from.slice(0, 7)));
  const months = SHARED.months.slice(m0);
  const dx = W / Math.max(1, months.length - 1);
  const charts = SHARED.themes.map(t => {
    const series = CC.map(cc => ({ cc, v: rates(cc, t.id, m0), all: overall(cc, t.id, m0) }));
    const max = Math.max(1e-9, ...series.flatMap(s => s.v.filter(v => v != null)));
    const y = v => H - PAD - (v / max) * (H - 2 * PAD);
    const lines = series.map(s => {
      let d = '', pen = false;
      s.v.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${(i * dx).toFixed(1)} ${y(v).toFixed(1)}`; pen = true; });
      return `<path d="${d}" class="cmp-line cc-${s.cc}"/>`;
    }).join('');
    const yrs = months.map((m, i) => m.endsWith('-01') ? `<path d="M${i * dx} ${H}v4" class="sp-tick"/><text x="${i * dx + 2}" y="${H + 13}" class="sp-yr">${m.slice(2, 4) === '21' || i === 0 ? m.slice(0, 4) : "'" + m.slice(2, 4)}</text>` : '').join('');
    const ratio = series[0].all && series[1].all ? series[0].all / series[1].all : null;
    const lead = ratio == null ? '' : ratio >= 1.5 ? `${COUNTRIES.ru.name} ${ratio.toFixed(1)}×` : ratio <= 1 / 1.5 ? `${COUNTRIES.ir.name} ${(1 / ratio).toFixed(1)}×` : 'Similar';
    return `<figure class="cmp" data-id="${t.id}">
      <figcaption><b>${escapeHtml(t.label)}</b><span class="cmp-lead">${lead}</span></figcaption>
      <p class="cmp-all">${series.map(s => `<span class="cc-${s.cc}">${COUNTRIES[s.cc].name} <b class="num">${fmtValue(s.all, 'rate')}</b></span>`).join(' ')} <span class="fine">per 1,000 words</span></p>
      <svg viewBox="0 -2 ${W} ${H + 18}" preserveAspectRatio="none" role="img" tabindex="0" aria-label="${escapeHtml(t.label)}: monthly uses per 1,000 words, Russia and Iran. Left and right arrow keys step through the months.">
        <path d="M0 ${H - PAD}H${W}" class="cmp-base"/>${yrs}${lines}<path class="cmp-cur" d="" /></svg>
      <p class="cmp-read fine" aria-live="polite"></p>
    </figure>`;
  }).join('');
  box.innerHTML = `<div class="cmp-head"><div><p class="eyebrow">Shared themes</p><h2>Russia and Iran, same patterns</h2>
    <p class="fine">Each chart runs one pattern on both corpora: monthly uses per 1,000 words, three-month rolling mean, ${monthLabel(months[0])} to ${monthLabel(months[months.length - 1])}. The two corpora are different kinds of text (the Russian president's spoken words against the Iranian Foreign Ministry's written statements), so compare shapes and orders of magnitude, not small gaps. Each chart has its own vertical scale. Hover or tap a chart to read both values for one month.</p></div>
    <p class="cmp-key"><span class="cc-ru">Russia (Kremlin)</span> <span class="cc-ir">Iran (Foreign Ministry)</span></p></div>
    <div class="cmp-grid">${charts}</div>`;

  const figs = [...box.querySelectorAll('.cmp')];
  const data = Object.fromEntries(SHARED.themes.map(t => [t.id, CC.map(cc => rates(cc, t.id, m0))]));
  const show = i => figs.forEach(f => {
    const [ru, ir] = data[f.dataset.id];
    f.querySelector('.cmp-cur').setAttribute('d', i == null ? '' : `M${i * dx} 0V${H}`);
    f.querySelector('.cmp-read').textContent = i == null ? '' : `${monthLabel(months[i])}: Russia ${fmtValue(ru[i], 'rate')}, Iran ${fmtValue(ir[i], 'rate')}`;
  });
  // Hover, tap or arrow keys move the shared cursor (taps keep it in place; touch has no hover).
  let cur = null;
  const at = i => { cur = i; show(i); };
  figs.forEach(f => {
    const svg = f.querySelector('svg');
    const pick = e => {
      const b = svg.getBoundingClientRect();
      at(Math.max(0, Math.min(months.length - 1, Math.round(((e.clientX - b.left) / b.width) * W / dx))));
    };
    svg.addEventListener('pointermove', pick);
    svg.addEventListener('pointerdown', pick);
    svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') at(null); });
    svg.addEventListener('keydown', e => {
      const step = { ArrowLeft: -1, ArrowRight: 1, Home: -1e9, End: 1e9 }[e.key];
      if (step == null) return;
      e.preventDefault();
      at(Math.max(0, Math.min(months.length - 1, (cur ?? (step > 0 ? -1 : months.length)) + step)));
    });
    svg.addEventListener('blur', () => { if (!figs.some(g => g.contains(document.activeElement))) at(null); });
  });
}
