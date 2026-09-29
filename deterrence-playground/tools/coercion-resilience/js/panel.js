// Side panel and timeline list HTML for both views.
import { esc, fmtUSD, fmtT, fmtN, pct, signed, dayLabel, monthLabel } from './util.js';
import { TRADE, PRODUCT_KEYS, YEARS, BASE_YEAR, redirection, unitValue, KR_ROWS, krYear } from './series.js';
import { AU_EVENTS, KR_EVENTS, IN_FORCE } from '../data/timeline.js';
import { AU_CLAIMS, KR_CLAIMS } from '../data/claims.js';

const VERDICT = {
  full: ['good', 'Replaced', 'Other buyers took up at least nine-tenths of the lost China trade.'],
  part: ['warn', 'Partly replaced', 'Other buyers took up between 40% and 90% of the lost China trade.'],
  none: ['bad', 'Not replaced', 'Other buyers took up less than 40% of the lost China trade.'],
  nofall: ['good', 'No loss', 'Exports to China did not fall below the baseline.'],
  gaps: ['warn', 'Weights incomplete', 'Comtrade has no weight for some months, so a tonnage comparison would mislead. Switch to value.'],
};

export function auPanelHtml() {
  return `
  <div class="sec">
    <p class="eyebrow">Product</p>
    <div class="choices prods" id="prods" role="group" aria-label="Product">
      ${PRODUCT_KEYS.map(p => `<button type="button" data-p="${p}" aria-pressed="false">${esc(TRADE.products[p].label)}${p === 'ironore' ? '<small>spared</small>' : ''}</button>`).join('')}
    </div>
  </div>
  <div class="sec">
    <div class="slider"><div class="sl-h"><label for="yr">Compare ${BASE_YEAR} with</label><output id="yr-out"></output></div>
      <input type="range" id="yr" min="0" max="${YEARS.length - 1}" step="1" value="1"><small>Or click a year on the chart.</small></div>
    <div class="choices units" role="group" aria-label="Unit">
      <button type="button" data-u="usd" aria-pressed="true">Value (US$)</button>
      <button type="button" data-u="t" aria-pressed="false">Weight (tonnes)</button>
    </div>
  </div>
  <div class="sec" id="au-read" aria-live="polite"></div>
  <div class="sec" id="au-claim"></div>`;
}

export function auReadHtml(S) {
  const r = redirection(S.product, S.unit, S.year);
  const f = S.unit === 't' ? fmtT : fmtUSD;
  const gaps = S.unit === 't' && (r.b.months < 12 || r.y.months < 12);
  const [s, head, sub] = VERDICT[gaps ? 'gaps' : r.verdict];
  const lab = TRADE.products[S.product].label;
  const force = IN_FORCE[S.product];
  const uv = unitValue(S.product, S.year);
  return `<p class="eyebrow">${esc(lab)}: ${BASE_YEAR} vs ${S.year}</p>
    <div class="status" data-s="${s}"><b>${head}</b><span>${sub}</span></div>
    <dl class="readout">
      <dt>China share</dt><dd>${pct(r.shareB)} → ${pct(r.shareY)}</dd>
      <dt>To China</dt><dd>${f(r.b.china)} → ${f(r.y.china)}</dd>
      <dt>Rest of world</dt><dd>${f(r.b.rest)} → ${f(r.y.rest)}</dd>
      <dt>All exports</dt><dd>${f(r.b.world)} → ${f(r.y.world)} (${signed(r.totalChange, x => pct(x))})</dd>
      ${r.ratio == null ? '' : `<dt>Replaced</dt><dd>${pct(Math.max(0, r.ratio))} of the China loss</dd>`}
      ${uv.b && uv.y ? `<dt>Unit value</dt><dd>$${Math.round(uv.b)}/t → $${Math.round(uv.y)}/t</dd>` : ''}
    </dl>
    ${S.unit === 't' && (r.b.months < 12 || r.y.months < 12) ? `<p class="fine warn">Weights are missing for some months (${r.b.months} of 12 in ${BASE_YEAR}, ${r.y.months} of 12 in ${S.year}); these totals cover only reported months.</p>` : ''}
    <p class="fine">${force ? (force.end ? `Restrictions in force ${monthLabel(force.start)} to ${monthLabel(force.end)}${force.partial ? ' (some plants)' : ''}.` : `Restrictions from ${monthLabel(force.start)}; the sources used give no removal date.`) : 'China did not restrict iron ore.'}
    ${S.unit === 'usd' ? ' Values are in US dollars, so they move with prices as well as quantities. Check the unit value, or switch to tonnes.' : ' Weights are net kilograms reported to Comtrade, shown in tonnes.'}</p>`;
}

export function auClaimHtml(p) {
  const c = AU_CLAIMS.figures.find(x => x.k === p);
  return `<p class="eyebrow">From the paper</p>
    ${c ? `<blockquote class="claim">${esc(c.text)}<cite>Walberg, “Coercion Without Concession,” citing ${esc(c.cites)}</cite></blockquote>` : ''}
    <p class="fine">Targeting logic in the paper: ${esc(AU_CLAIMS.logic)}</p>`;
}

export function krPanelHtml() {
  const years = ['2015', '2016', '2017', '2018', '2019'];
  return `
  <div class="sec" id="kr-read" aria-live="polite"></div>
  <div class="sec">
    <p class="eyebrow">Arrivals from China by year</p>
    <div class="tablewrap"><table><thead><tr><th>Year</th><th class="num">China</th><th class="num">Share</th></tr></thead><tbody>
    ${years.map(y => { const t = krYear(y); return `<tr><td>${y}</td><td class="num">${fmtN(t.china)}</td><td class="num">${pct(t.china / t.total)}</td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="fine">Computed from KTO Data Lab monthly figures.</p>
  </div>
  <div class="sec">
    <p class="eyebrow">From the paper</p>
    <ul class="claims">${KR_CLAIMS.figures.map(f => `<li>${esc(f.text)} <small>(${esc(f.cites)})</small></li>`).join('')}</ul>
    <p class="fine">${esc(KR_CLAIMS.concession)} Source: Walberg, “Beyond the Radar.”</p>
  </div>`;
}

export function krReadHtml(month) {
  const i = KR_ROWS.findIndex(r => r.ym === month);
  const r = KR_ROWS[i], prev = KR_ROWS[i - 12];
  const chg = prev ? r.china / prev.china - 1 : null;
  const s = chg == null ? 'good' : chg <= -0.3 ? 'bad' : chg < 0 ? 'warn' : 'good';
  return `<p class="eyebrow">${monthLabel(r.ym)}</p>
    <div class="status" data-s="${s}"><b>${fmtN(r.china)} from China</b><span>${chg == null ? 'No year-earlier month in the data.' : `${signed(chg, x => pct(x))} on ${monthLabel(prev.ym)}`}</span></div>
    <dl class="readout">
      <dt>China share</dt><dd>${pct(r.china / r.total)} of ${fmtN(r.total)}</dd>
      <dt>Japan</dt><dd>${fmtN(r.japan)}${prev ? ` (${signed(r.japan / prev.japan - 1, x => pct(x))})` : ''}</dd>
      <dt>All others</dt><dd>${fmtN(r.others)}${prev ? ` (${signed(r.others / prev.others - 1, x => pct(x))})` : ''}</dd>
    </dl>
    <p class="fine">Click the chart or use the arrow keys to pick another month.</p>`;
}

const KIND_LABEL = { trigger: 'Trigger', measure: 'Measure', response: 'Response', removal: 'Removal' };
export function timelineHtml(view, product, all) {
  const evs = view === 'au' ? AU_EVENTS.filter(e => all || !e.products.length || e.products.includes(product)) : KR_EVENTS;
  return evs.map(e => `<li class="tl-item" data-kind="${e.kind}">
      <button type="button" class="tl-go" data-date="${e.date}"${e.products?.length ? ` data-p="${e.products.join(',')}"` : ''}>
        <span class="tl-d num">${dayLabel(e.date)}</span><span class="tl-k">${KIND_LABEL[e.kind]}</span><span class="tl-t">${esc(e.title)}</span></button>
      <span class="tl-s">${e.note ? esc(e.note) + ' ' : ''}Source: <a href="${e.src.url}" target="_blank" rel="noopener">${esc(e.src.name)}</a>${e.paper ? `, citing ${esc(e.via)}` : ''}</span>
    </li>`).join('');
}
