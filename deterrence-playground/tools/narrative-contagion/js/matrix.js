// Country-pair amplification matrix, official-vs-media pathways, and the corpus coverage strip.
import { pairMatrix, pathways, firstMover } from './model.js';
import { RING } from './network.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '–');

export function renderMatrix(host, D, clusters, metric, onPair) {
  const M = pairMatrix(clusters);
  const cs = RING.filter(c => D.countries[c] && clusters.some(k => k.countries.includes(c)));
  const val = (a, b) => {
    const x = M.get(`${a}>${b}`), y = M.get(`${b}>${a}`);
    if (metric === 'net') return (x ? x.before : 0) - (y ? y.before : 0);
    if (metric === 'lag') return x && x.before ? x.medLag : null;
    return x ? x.before : 0;
  };
  let max = 1;
  for (const a of cs) for (const b of cs) if (a !== b) { const v = val(a, b); if (v != null) max = Math.max(max, Math.abs(v)); }
  const fill = v => {
    if (v == null || v === 0) return '';
    const t = Math.round(12 + 70 * Math.sqrt(Math.abs(v) / max));
    const col = metric === 'net' && v < 0 ? 'var(--red)' : metric === 'lag' ? 'var(--c3)' : 'var(--blue)';
    return `background:color-mix(in srgb, ${col} ${t}%, transparent)`;
  };
  if (!cs.length) { host.innerHTML = '<p class="fine">No clusters match the current filters.</p>'; return; }
  const short = c => (c === 'US' ? 'U.S.' : D.countries[c]);
  const head = cs.map(c => `<th scope="col" title="${esc(D.countries[c])}">${c}</th>`).join('');
  const rows = cs.map(a => `<tr><th scope="row" title="${esc(D.countries[a])}"><span class="nm">${esc(short(a))}</span><span class="code">${a}</span></th>${cs.map(b => {
    if (a === b) return '<td class="self" aria-hidden="true"></td>';
    const x = M.get(`${a}>${b}`) || { before: 0, same: 0, medLag: null }, y = M.get(`${b}>${a}`) || { before: 0 };
    const v = val(a, b);
    const label = `${D.countries[a]} appeared before ${D.countries[b]} in ${x.before} cluster${x.before === 1 ? '' : 's'}; ${D.countries[b]} before ${D.countries[a]} in ${y.before}; same day ${x.same}` +
      (x.medLag != null ? `; median lag when ${D.countries[a]} led: ${x.medLag} days` : '');
    const n = x.before + y.before + x.same;
    const shown = v == null ? '' : metric === 'lag' ? `${v}d` : metric === 'net' && v > 0 ? `+${v}` : String(v);
    return n ? `<td><button type="button" style="${fill(v)}" data-a="${a}" data-b="${b}" aria-label="${esc(label)}. Show these clusters." title="${esc(label)}">${shown}</button></td>` : '<td class="none"></td>';
  }).join('')}</tr>`).join('');
  host.innerHTML = `<div class="nc-matrix-wrap" tabindex="0" aria-label="Country-pair table; scrolls sideways on small screens"><table class="nc-matrix"><thead><tr><th scope="col" class="corner"><span>first ↓ / then →</span></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  host.querySelectorAll('button[data-a]').forEach(b => b.addEventListener('click', () => onPair(b.dataset.a, b.dataset.b)));
  const top = topPairs(M, metric).map(([a, b, v, rev]) => {
    const lag = v.medLag == null ? '' : `; median lag ${v.medLag} day${v.medLag === 1 ? '' : 's'}`;
    if (metric === 'net') return `${D.countries[a]} before ${D.countries[b]}: net +${v.before - rev} (${v.before} clusters against ${rev} the other way${lag})`;
    if (metric === 'lag') return `${D.countries[a]} before ${D.countries[b]}: median lag ${v.medLag} day${v.medLag === 1 ? '' : 's'} (${v.before} clusters)`;
    return `${D.countries[a]} before ${D.countries[b]}: ${v.before} clusters (the reverse: ${rev}${lag})`;
  });
  return top;
}

export const TOP_HEAD = { before: 'Most clusters with the row country first', net: 'Largest net leads', lag: 'Longest median lags (pairs with at least 5 clusters)' };
/** The three largest pairs under the metric shown: [rowCountry, colCountry, cell, reverseCount]. */
export function topPairs(M, metric) {
  const rows = [...M.entries()].filter(([, v]) => v.before).map(([k, v]) => { const [a, b] = k.split('>'); return [a, b, v, (M.get(`${b}>${a}`) || { before: 0 }).before]; });
  const key = metric === 'net' ? r => r[2].before - r[3] : metric === 'lag' ? r => (r[2].before >= 5 ? r[2].medLag : -1) : r => r[2].before;
  return rows.filter(r => key(r) > 0).sort((x, y) => key(y) - key(x) || y[2].before - x[2].before).slice(0, 3);
}

/** Plain words for the matrix colours under the current metric. */
export function matrixKey(metric) {
  if (metric === 'net') return '<span class="sw sw-b"></span>Blue: the row country is usually first. <span class="sw sw-r"></span>Red: the column country is usually first. The number is row-first minus column-first clusters; darker means a larger gap.';
  if (metric === 'lag') return '<span class="sw sw-t"></span>Darker teal: more days, on the median, between the row country and the column country when the row came first.';
  return '<span class="sw sw-b"></span>Darker blue: more clusters in which the row country appeared before the column country.';
}

export function renderPathways(host, clusters) {
  const { P, same, total } = pathways(clusters);
  const fm = firstMover(clusters);
  const lab = { official: 'Official', media: 'Media' };
  const buckets = ['1 day', '2–3 days', '4–7 days', '8–10 days', '11–14 days'];
  const dirTotal = Object.values(P).reduce((s, p) => s + p.n, 0);
  const tile = (a, b) => {
    const p = P[`${a}>${b}`];
    const mx = Math.max(1, ...p.buckets);
    return `<div class="nc-path t-${a}-${b}">
      <p class="nc-path-h"><span class="pill k-${a}">${lab[a]}</span> first, then <span class="pill k-${b}">${lab[b]}</span> in another country</p>
      <p class="nc-big num">${p.n.toLocaleString()}</p>
      <p class="fine">${pct(p.n, dirTotal)} of dated passage matches${p.med != null ? ` · median lag ${p.med} day${p.med === 1 ? '' : 's'}` : ''}</p>
      <div class="nc-bars" role="img" aria-label="Lag distribution: ${p.buckets.map((n, i) => `${buckets[i]} ${n}`).join(', ')}">
        ${p.buckets.map((n, i) => `<span class="bar"><i style="height:${Math.round((60 * n) / mx)}px"></i><em class="num">${n}</em><small>${buckets[i]}</small></span>`).join('')}
      </div></div>`;
  };
  host.innerHTML = `<div class="nc-paths">${tile('official', 'official')}${tile('official', 'media')}${tile('media', 'official')}${tile('media', 'media')}</div>
    <div class="nc-path-notes">
      <p><b>Same-day matches</b> have no order and are left out above: ${(same['official|official'] + same['media|official'] + same['media|media']).toLocaleString()} of ${total.toLocaleString()} passage matches
      (official–official ${same['official|official']}, official–media ${same['media|official']}, media–media ${same['media|media']}).</p>
      <p><b>Who appears first in each cluster:</b> an official text in ${fm.official} cluster${fm.official === 1 ? '' : 's'}, a media item in ${fm.media}, both on the first day in ${fm.both}.
      Media here means state media plus Taiwan's Taipei Times; Taiwan's CNA and Focus Taiwan are classed as state media in the corpus.</p>
    </div>`;
}

/** Docs per country per month, so readers can see where silence means no collection. */
export function renderCoverage(host, D) {
  const months = [];
  for (let y = 2021; y <= 2026; y++) for (let m = 1; m <= 12; m++) months.push(`${y}-${String(m).padStart(2, '0')}`);
  const last = D.meta.generated.slice(0, 7);
  const ms = months.filter(m => m <= last);
  const cs = RING.filter(c => D.coverage[c]);
  let max = 1;
  cs.forEach(c => ms.forEach(m => { const v = D.coverage[c][m]; if (v) max = Math.max(max, v[0] + v[1]); }));
  const cell = (c, m) => {
    const v = D.coverage[c][m] || [0, 0], n = v[0] + v[1];
    const t = n ? Math.round(30 + 70 * Math.sqrt(n / max)) : 0;
    const part = m === last ? ` (partial: data built ${D.meta.generated.slice(0, 10)})` : '';
    return `<i title="${esc(D.countries[c])} ${m}${part}: ${v[0]} official, ${v[1]} media docs" style="${n ? `background:color-mix(in srgb, var(--brand-ink) ${t}%, transparent)` : ''}"${v[1] ? '' : ' class="nomedia"'}></i>`;
  };
  host.innerHTML = `<div class="nc-cov" role="img" aria-label="Documents in the corpus per country per month, 2021 to ${last}. Darker means more documents.">
    ${cs.map(c => `<div class="row"><span class="cc">${c}</span><span class="cells">${ms.map(m => cell(c, m)).join('')}</span></div>`).join('')}
    <div class="row axis"><span class="cc"></span><span class="cells">${ms.map(m => `<i>${m.endsWith('-01') ? `<b>${m.slice(0, 4)}</b>` : ''}</i>`).join('')}</span></div>
  </div>
  <p class="nc-cov-key fine">Documents per month: ${[1, 0.25, 0.04, 0.005].map(f => Math.max(1, Math.round(f * max))).reverse().map(n => `<span class="sw" style="background:color-mix(in srgb, var(--brand-ink) ${Math.round(30 + 70 * Math.sqrt(n / max))}%, transparent)"></span>${n.toLocaleString()}`).join(' ')} <span class="sw nomedia"></span>no media that month. The last column (${last}) is partial.</p>`;
}
