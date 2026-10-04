// Panel readout for a selected cell: counts, a monthly sparkline for the phrase, and the
// actual quote windows with links to the official page. Quote files load on first use.
import { COUNTRIES, META, weekStart, value, fmtValue, fmtN, fmtDate, METRICS, MIN_WORDS, phraseRe, mark, escapeHtml } from './model.js';

const cache = {};
export const loadQuotes = cc => (cache[cc] ||= import(`../data/quotes-${cc}.js`));

function sparkline(cc, k, selW) {
  // Monthly uses per 1,000 words for the phrase, whole corpus.
  const C = COUNTRIES[cc], p = C.phrases[k];
  const byM = new Map();
  C.words.forEach((wd, w) => {
    const m = weekStart(w).slice(0, 7);
    if (m < '2021-01') return;
    const o = byM.get(m) || { w: 0, h: 0 };
    o.w += wd; o.h += p.hits[w]; byM.set(m, o);
  });
  const months = [...byM.keys()];
  const vals = months.map(m => { const o = byM.get(m); return o.w >= 1000 ? (o.h / o.w) * 1000 : null; });
  const max = Math.max(...vals.filter(v => v != null), 1e-9);
  const W = 300, H = 46, dx = W / Math.max(1, months.length - 1);
  let d = '', pen = false;
  vals.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${(i * dx).toFixed(1)} ${(H - 4 - (v / max) * (H - 8)).toFixed(1)}`;
    pen = true;
  });
  const selM = weekStart(selW).slice(0, 7), si = months.indexOf(selM);
  const years = months.map((m, i) => m.endsWith('-01') ? `<text x="${i * dx + 2}" y="${H + 11}" class="sp-yr">${m.slice(0, 4)}</text><path d="M${i * dx} ${H - 2}v4" class="sp-tick"/>` : '').join('');
  return `<svg class="spark" viewBox="0 -2 ${W} ${H + 16}" role="img" aria-label="Monthly uses per 1,000 words of ${escapeHtml(p.label)}">
    <path d="${d}" class="sp-line"/>${si >= 0 ? `<path d="M${si * dx} 0V${H}" class="sp-sel"/>` : ''}${years}</svg>
    <p class="fine sp-cap">Uses per 1,000 words by month, ${months[0].slice(0, 4)}–${months[months.length - 1].slice(0, 4)}. Busiest month: ${fmtValue(max, 'rate')} per 1,000 words.</p>`;
}

export async function renderDetail(box, S) {
  const sel = S.sel;
  const C = COUNTRIES[S.cc];
  if (!sel) { box.innerHTML = '<p class="fine">Click any cell to read the quotes behind it.</p>'; return; }
  const p = C.phrases[sel.k], w = sel.w;
  const v = value(S.cc, sel.k, w, S.metric);
  const head = `<div class="d-head"><p class="eyebrow">${escapeHtml(C.name)} · ${escapeHtml(p.cat)}</p>
    <h3>${escapeHtml(p.label)}</h3>
    <p class="d-week">Week of ${fmtDate(weekStart(w))}</p>
    <p class="d-count">${C.ndocs[w]
      ? `<b class="num">${p.hits[w]}</b> use${p.hits[w] === 1 ? '' : 's'} in <b class="num">${p.docs[w]}</b> of <span class="num">${C.ndocs[w]}</span> ${C.stream.unit}s (${fmtN(C.words[w])} words): <b class="num">${fmtValue(v, S.metric)}</b> ${METRICS[S.metric].unit}.`
      : 'No text held for this week.'}${C.words[w] && C.words[w] < MIN_WORDS ? ' <span class="pill warn">thin week</span>' : ''}</p>
    ${sparkline(S.cc, sel.k, w)}
    <p class="fine d-note">${escapeHtml(p.note)} Pattern: <code>${escapeHtml(p.re)}</code></p></div>`;
  if (!p.docs[w]) { box.innerHTML = head + `<p class="fine">${C.ndocs[w] ? 'No statement that week used this phrase.' : ''}</p>`; return; }
  box.innerHTML = head + '<p class="fine">Loading quotes…</p>';
  const token = (box.dataset.tok = `${S.cc}:${sel.k}:${w}`);
  const { DOCS, CELLS } = await loadQuotes(S.cc);
  if (box.dataset.tok !== token) return;
  const items = CELLS[p.id]?.[w] || [];
  const re = phraseRe(p.re);
  const quotes = items.filter(Array.isArray).map(([i, q]) => {
    const [d, t, u] = DOCS[i];
    return `<article class="quote"><p class="q-meta"><span class="num">${d}</span> · <a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(t)}</a></p>
      <blockquote>${mark(q, re)}</blockquote></article>`;
  }).join('');
  const rest = items.filter(x => !Array.isArray(x));
  const more = rest.length ? `<details class="more"><summary>${rest.length} more ${C.stream.unit}${rest.length === 1 ? '' : 's'} that week (links only)</summary><ul>${rest.map(i => {
    const [d, t, u] = DOCS[i];
    return `<li><span class="num">${d}</span> <a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(t)}</a></li>`;
  }).join('')}</ul></details>` : '';
  box.innerHTML = head + `<p class="eyebrow">Quotes, first ${Math.min(META.qmax, items.length)} of ${items.length} ${C.stream.unit}${items.length === 1 ? '' : 's'}</p><div class="quotes">${quotes}</div>${more}`;
}
