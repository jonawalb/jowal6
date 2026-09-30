// Lead/lag cross-correlation between one market's price and PLA aircraft activity, computed in the browser.
import { el } from '../../../shared/js/mapkit.js';
import { AIR, AIR7, priceAt } from './series.js';

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 8) return null;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

/**
 * r(k) = corr(aircraft[t], price[t + k]) over days t in the window.
 * k > 0: aircraft moves come first and the market follows k days later.
 * With diff on, both series are day-over-day changes (consecutive calendar days only).
 */
export function crossCorr(m, [a, b], { src = '7', diff = true, maxLag = 21 } = {}) {
  const air = src === '7' ? AIR7 : AIR;
  const P = new Map(), A = new Map();
  for (let d = a - maxLag - 1; d <= b + maxLag; d++) {
    const p = priceAt(m, d), q = air.get(d);
    if (diff) {
      const p0 = priceAt(m, d - 1), q0 = air.get(d - 1);
      if (p != null && p0 != null) P.set(d, p - p0);
      if (q != null && q0 != null) A.set(d, q - q0);
    } else {
      if (p != null) P.set(d, p);
      if (q != null) A.set(d, q);
    }
  }
  const out = [];
  for (let k = -maxLag; k <= maxLag; k++) {
    const xs = [], ys = [];
    for (let d = a; d <= b; d++) {
      if (A.has(d) && P.has(d + k) && d + k >= a && d + k <= b) { xs.push(A.get(d)); ys.push(P.get(d + k)); }
    }
    out.push({ k, r: pearson(xs, ys), n: xs.length });
  }
  const valid = out.filter(o => o.r != null);
  const n0 = out.find(o => o.k === 0)?.n || 0;
  const best = valid.reduce((m, o) => (Math.abs(o.r) > Math.abs(m?.r ?? 0) ? o : m), null);
  return { lags: out, best, n: n0, band: n0 ? 1.96 / Math.sqrt(n0) : null };
}

export function drawXcorr(svg, res, color) {
  const W = Math.max(300, Math.round(svg.clientWidth || 600)), H = 170, L = 36, R = 10, T = 12, B = 30;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const lags = res.lags, K = lags.length;
  const X = i => L + (i + 0.5) / K * (W - L - R);
  const top = Math.max(res.band || 0, ...lags.map(o => Math.abs(o.r ?? 0))) * 1.2;
  const ymax = [0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1].find(v => v >= top) ?? 1;
  const Y = r => T + (1 - (r + ymax) / (2 * ymax)) * (H - T - B);
  const bw = Math.max(2, (W - L - R) / K - 2);
  if (res.band) el('rect', { x: L, y: Y(res.band), width: W - L - R, height: Y(-res.band) - Y(res.band), class: 'xc-band' }, svg);
  [-ymax, -ymax / 2, 0, ymax / 2, ymax].forEach(v => {
    el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: v === 0 ? 'xc-zero' : 'grid' }, svg);
    el('text', { x: L - 5, y: Y(v) + 4, 'text-anchor': 'end', class: 'axis-t' }, svg, +v.toFixed(2));
  });
  lags.forEach((o, i) => {
    if (o.r == null) return;
    const y0 = Y(0), y1 = Y(o.r);
    const out = res.band && Math.abs(o.r) > res.band;
    el('rect', { x: X(i) - bw / 2, y: Math.min(y0, y1), width: bw, height: Math.max(1, Math.abs(y1 - y0)),
      class: 'xc-bar' + (out ? ' out' : '') + (res.best && o.k === res.best.k ? ' best' : ''), fill: color }, svg);
  });
  const mid = lags.findIndex(o => o.k === 0);
  [lags[0], lags[mid], lags[K - 1]].forEach(o => {
    const i = lags.indexOf(o);
    el('text', { x: X(i), y: H - 14, 'text-anchor': 'middle', class: 'axis-t' }, svg, (o.k > 0 ? '+' : '') + o.k + 'd');
  });
  el('text', { x: L, y: H - 2, class: 'axis-t' }, svg, '← market moves first');
  el('text', { x: W - R, y: H - 2, 'text-anchor': 'end', class: 'axis-t' }, svg, 'aircraft move first →');
}

export function xcorrText(res, m, opts) {
  if (!res.best || res.n < 20) {
    return `<p class="xc-verdict" data-s="warn"><b>Too little overlap.</b> Only ${res.n} matched days in this window. Widen the window or pick a market with a longer record.</p>`;
  }
  const { k, r } = res.best;
  const outside = res.lags.filter(o => o.r != null && Math.abs(o.r) > res.band).length;
  const chance = Math.max(1, Math.round(res.lags.length * 0.05));
  const quiet = outside <= chance * 2;
  const who = k > 0 ? `aircraft changes lead the price by ${k} day${k > 1 ? 's' : ''}` : k < 0 ? `the price leads aircraft changes by ${-k} day${k < -1 ? 's' : ''}` : 'same day';
  return `<p class="xc-verdict" data-s="${quiet ? 'good' : 'warn'}"><b>${quiet ? 'No clear lead or lag' : 'A pattern, or a shared trend'}</b>
    ${outside} of ${res.lags.length} lags fall outside the shaded noise band (±${res.band.toFixed(2)}); pure noise would put about ${chance} there.
    The largest is r = <span class="num">${r.toFixed(2)}</span> at lag <span class="num">${k > 0 ? '+' : ''}${k}</span> (${who}), on ${res.n} matched days.</p>
    <p class="fine">${opts.diff ? 'Using day-over-day changes.' : '<b>Using levels.</b> Two series that both drift down over months will look correlated at every lag. Switch changes back on.'}
    ${opts.src === '7' ? ' Overlapping 7-day means are smoothed, which widens the true noise band beyond the one drawn.' : ''}
   </p>`;
}
