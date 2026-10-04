// Side panel: status, before/after comparison, series options, event filter and list, EIA oil flows.
import { escapeHtml } from '../../../shared/js/mapkit.js';
import { EVENTS, CATS } from '../data/events.js';
import { EIA } from '../data/eia.js';
import { PRESETS } from './presets.js';
import { NAMES, METRICS, smoothed, windowMean, idx, pct, fmtPct, fmtVal, niceDate, FIRST, LAST } from './series.js';
import { catColor } from './charts.js';

const tone = p => p == null ? '' : p <= -40 ? 'bad' : p <= -15 ? 'warn' : p >= 15 ? 'up' : '';

export function buildPanel(host) {
  host.innerHTML = `
  <div class="sec"><div class="status" id="rs-status"><b></b><span></span></div></div>
  <div class="sec">
    <p class="eyebrow">1 · Compare two periods</p>
    <div class="choices" id="rs-presets">${PRESETS.map(p => `<button type="button" data-p="${p.id}" aria-pressed="false"><b>${p.label}</b><small>${p.sub}</small></button>`).join('')}</div>
    <div class="rs-win">
      <span class="wl"><span class="legend"><span class="sw sw-b"></span></span>Before</span>
      <label for="rs-b0">from</label><input type="date" id="rs-b0" min="${FIRST}" max="${LAST}"><label for="rs-b1">to</label><input type="date" id="rs-b1" min="${FIRST}" max="${LAST}">
      <span class="wl"><span class="legend"><span class="sw sw-a"></span></span>After</span>
      <label for="rs-a0">from</label><input type="date" id="rs-a0" min="${FIRST}" max="${LAST}"><label for="rs-a1">to</label><input type="date" id="rs-a1" min="${FIRST}" max="${LAST}">
    </div>
    <div class="tablewrap"><table class="rs-cmp" id="rs-cmp"></table></div>
    <p class="fine" id="rs-cmp-note"></p>
  </div>
  <div class="sec">
    <p class="eyebrow">2 · What to count</p>
    <div class="seg" id="rs-metric" role="group" aria-label="Ship type">${Object.entries(METRICS).map(([k, m]) => `<button type="button" data-m="${k}">${m.label}</button>`).join('')}</div>
    <div class="seg" id="rs-smooth" role="group" aria-label="Smoothing"><button type="button" data-s="1">Daily</button><button type="button" data-s="7">7-day average</button><button type="button" data-s="30">30-day average</button></div>
    <div class="seg" id="rs-range" role="group" aria-label="Chart range"><button type="button" data-r="2023-01-01">Since 2023</button><button type="button" data-r="${FIRST}">Since 2019</button><button type="button" data-r="2025-06-01">Since June 2025</button></div>
    <label class="tg"><input type="checkbox" id="rs-cape-tg"><span class="sw"></span><span class="t">Show the Cape of Good Hope<small>Where Suez traffic went: the long way around Africa</small></span></label>
  </div>
  <div class="sec">
    <p class="eyebrow">3 · Events</p>
    <div class="rs-cats" id="rs-cats">${Object.entries(CATS).map(([k, c]) => `<label class="tg"><input type="checkbox" value="${k}" checked><span class="sw"></span><span class="t"><i style="background:${catColor(k)}"></i>${c}</span></label>`).join('')}</div>
    <ul class="rs-evlist" id="rs-evlist" aria-label="Event timeline"></ul>
  </div>
  <div class="sec rs-eia">
    <p class="eyebrow">4 · Oil through the chokepoints (EIA)</p>
    <div class="rs-bars" id="rs-eia"></div>
    <p class="fine" id="rs-eia-note"></p>
  </div>`;
  renderEia();
}

export function renderPanel(S) {
  // Status line
  const ci = idx(S.date);
  const now = ['bab', 'suez', 'hormuz'].map(k => ({ k, v: smoothed(k, S.metric, S.smooth)[ci], b: windowMean(k, S.metric, S.before) }));
  const worst = now.map(o => ({ ...o, p: pct(o.b, o.v) })).filter(o => o.p != null).sort((a, b) => a.p - b.p)[0];
  const st = document.getElementById('rs-status');
  st.dataset.s = worst && worst.p <= -40 ? 'bad' : worst && worst.p <= -15 ? 'warn' : 'good';
  st.querySelector('b').textContent = worst ? `${NAMES[worst.k]} ${fmtPct(worst.p)}` : 'No data';
  st.querySelector('span').textContent = `${niceDate(S.date)}, ${S.smooth > 1 ? S.smooth + '-day average of ' : ''}${METRICS[S.metric].label.toLowerCase()}, against the "before" period. ` +
    now.map(o => `${NAMES[o.k]} ${fmtVal(o.v, S.metric)}`).join(' · ');
  // Presets and windows
  document.querySelectorAll('#rs-presets button').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === S.preset));
  const set = (id, v) => { const e = document.getElementById(id); if (e.value !== v) e.value = v; };
  set('rs-b0', S.before[0]); set('rs-b1', S.before[1]); set('rs-a0', S.after[0]); set('rs-a1', S.after[1]);
  const keys = ['bab', 'suez', 'hormuz', 'cape'];
  const rows = keys.map(k => {
    const b = windowMean(k, S.metric, S.before), a = windowMean(k, S.metric, S.after), p = pct(b, a);
    return `<tr><td>${NAMES[k]}</td><td>${fmtVal(b, S.metric)}</td><td>${fmtVal(a, S.metric)}</td><td class="${tone(p)}">${fmtPct(p)}</td></tr>`;
  }).join('');
  document.getElementById('rs-cmp').innerHTML = `<thead><tr><th>${escapeHtml(METRICS[S.metric].unit)}</th><th>Before</th><th>After</th><th>Change</th></tr></thead><tbody>${rows}</tbody>`;
  const pr = PRESETS.find(p => p.id === S.preset);
  document.getElementById('rs-cmp-note').textContent = pr ? pr.note : 'Custom periods. Averages are of raw daily counts, whatever smoothing the charts show.';
  // Options
  document.querySelectorAll('#rs-metric button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === S.metric));
  document.querySelectorAll('#rs-smooth button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.s === S.smooth));
  document.querySelectorAll('#rs-range button').forEach(b => b.setAttribute('aria-pressed', b.dataset.r === S.from));
  document.getElementById('rs-cape-tg').checked = S.cape;
  document.querySelectorAll('#rs-cats input').forEach(i => { i.checked = S.cats.has(i.value); });
  // Event list
  const list = document.getElementById('rs-evlist');
  list.innerHTML = EVENTS.filter(e => S.cats.has(e.cat)).map(e =>
    `<li><button type="button" data-ev="${e.id}" aria-pressed="${e.id === S.ev}"><span class="dot" style="background:${catColor(e.cat)}"></span><span class="dd">${niceDate(e.date)}</span><span>${escapeHtml(e.title)}</span></button></li>`).join('') || '<li class="fine">No events shown. Switch on a category above.</li>';
  const on = list.querySelector('[aria-pressed="true"]');
  if (on) list.scrollTop = Math.max(0, on.offsetTop - list.clientHeight / 2);
}

function renderEia() {
  const max = Math.max(...EIA.bars.map(b => b.v));
  document.getElementById('rs-eia').innerHTML = EIA.bars.map(b =>
    `<div class="rs-bar"><span>${escapeHtml(b.label)}</span><span class="tr"><span style="width:${(b.v / max * 100).toFixed(1)}%"></span></span><span class="v">${b.v.toFixed(1)}</span><small>${escapeHtml(b.note)}</small></div>`).join('');
  document.getElementById('rs-eia-note').innerHTML = EIA.note;
}
