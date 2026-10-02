// Side panel: market picker, overlays and the focus-market card.
import { escapeHtml, fmt } from '../../../shared/js/mapkit.js';
import { MARKETS, FAMILIES, BY_ID, priceNear, nice, dayOf } from './series.js';
import { colorOf } from './chart.js';

export const MAX_SEL = 8;
export const PRESETS = [
  { k: 'open', t: 'Open contracts', ids: ['567621', '1633611', '677407', '2382819'], win: ['2025-07-25', null] },
  { k: 'ladder', t: 'Invasion ladder 2026–27', ids: ['701290', '956590', '1633606', '567621', '1811266', '1633611'], win: ['2025-11-20', null] },
  { k: 'yearly', t: 'Each year’s invasion odds', ids: ['252608', '253889', '520630', '567621'], win: [null, null] },
  { k: 'types', t: 'Invasion vs. blockade vs. clash', ids: ['956590', '604470', '521019', '567621', '2382819', '677407'], win: ['2025-01-25', null] },
];

export function panelHtml() {
  const fam = FAMILIES.map(f => `
    <div class="fam"><h3>${f.t}</h3><div class="mk-list">${MARKETS.filter(m => m.family === f.k).map(m =>
      `<button type="button" class="mk" data-id="${m.id}" aria-pressed="false"><i class="sw-c"></i><span>${escapeHtml(m.label)}</span><small class="num">${m.resolved ? 'resolved ' + m.resolved : m.closed ? 'closed' : 'open'}</small></button>`).join('')}
    </div></div>`).join('');
  return `
  <div class="sec">
    <p class="eyebrow">Presets</p>
    <div class="choices" id="presets">${PRESETS.map(p => `<button type="button" data-k="${p.k}" aria-pressed="false">${p.t}</button>`).join('')}</div>
  </div>
  <div class="sec" id="focus-card" aria-live="polite"></div>
  <div class="sec">
    <div class="sec-h"><p class="eyebrow">Markets</p><span class="fine" id="sel-count"></span></div>
    <p class="fine">Click to add or remove (up to ${MAX_SEL}). Every contract here is a Polymarket “Yes” share that pays $1 if the event happens.</p>
    ${fam}
  </div>
`;
}

export function syncPicker(S) {
  document.querySelectorAll('.mk').forEach(b => {
    const i = S.markets.indexOf(b.dataset.id);
    b.setAttribute('aria-pressed', i >= 0);
    b.querySelector('.sw-c').style.background = i >= 0 ? colorOf(i) : '';
    b.disabled = i < 0 && S.markets.length >= MAX_SEL;
  });
  document.getElementById('sel-count').textContent = `${S.markets.length} of ${MAX_SEL}`;
  document.getElementById('ov-air').checked = S.show.air;
  document.getElementById('ov-jcrp').checked = S.show.jcrp;
  document.getElementById('ov-ex').checked = S.show.ex;
  document.querySelectorAll('#presets button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S.preset));
}

export function focusHtml(S, cursorIso) {
  const m = BY_ID.get(S.focus);
  if (!m) return '<p class="fine">Pick a market to see its details.</p>';
  const d = cursorIso ? dayOf(cursorIso) : Math.min(S.win[1], m.last);
  const at = priceNear(m, d);
  const cents = at ? at.p * 100 : null;
  const inWin = m.series.filter(r => { const k = dayOf(r[0]); return k >= S.win[0] && k <= S.win[1]; });
  const volWin = inWin.reduce((s, r) => s + r[2], 0);
  const quiet = inWin.filter(r => r[3] === 0 || r[2] < 1000).length;
  const opts = S.markets.map(id => BY_ID.get(id)).map(x => `<option value="${x.id}" ${x.id === m.id ? 'selected' : ''}>${escapeHtml(x.label)}</option>`).join('');
  const status = m.resolved ? `Resolved ${m.resolved}` : m.closed ? 'Closed' : 'Open';
  return `
    <div class="sec-h"><p class="eyebrow">Focus market</p>
      <label class="sr" for="focus-sel">Focus market</label><select id="focus-sel">${opts}</select></div>
    <h3 class="q">${escapeHtml(m.question)}</h3>
    <div class="status price-box">
      <b>${cents == null ? 'No trades' : (cents < 1 ? cents.toFixed(2) : cents.toFixed(1)) + '¢'}</b>
      <span>${at ? `Yes price on ${nice(at.d)}${cursorIso ? ' (cursor)' : ''}. Traders swapped a $1-if-it-happens share for ${cents < 1 ? cents.toFixed(2) : cents.toFixed(1)} cents.` : 'No trade within a week of this date.'}</span>
    </div>
    <dl class="readout">
      <dt>Status</dt><dd>${status}${m.resolved ? '' : ` · settles ${nice(dayOf(m.deadline))}`}</dd>
      <dt>Record here</dt><dd>${nice(m.first)} – ${nice(m.last)} (${m.days} days)</dd>
      <dt>Window volume</dt><dd>$${fmt(volWin)} over ${inWin.length} days</dd>
      <dt>Thin days</dt><dd>${quiet} of ${inWin.length} under $1,000</dd>
      <dt>Lifetime volume</dt><dd>$${fmt(m.volume)} (platform figure)</dd>
    </dl>
    <p class="fine">${escapeHtml(m.summary)}</p>
    ${m.rule ? `<details class="rule"><summary>Full resolution rules</summary><p>${escapeHtml(m.rule).replace(/\n+/g, '<br>')}</p></details>` : ''}
    <p class="fine links"><a href="${m.url}" target="_blank" rel="noopener">Polymarket page</a>${m.archive ? ` · <a href="${m.archive}" target="_blank" rel="noopener">archived copy of the rules</a>` : ''}</p>
    ${m.first > dayOf(m.created) + 10 ? `<p class="fine warn">This contract opened ${nice(dayOf(m.created))}, but the archive holds its trades only from ${nice(m.first)}. Earlier history is missing.</p>` : ''}`;
}
