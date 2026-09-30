// Side panel: the selected IAEA report (figures, quotes, link), the verification clock, quoted breakout
// estimates and the selected event. Arithmetic on sourced figures is labelled where it appears.
import { ROWS, LEVELS, prevNum, fmtKg, niceDate, daysBetween, esc, LIMIT_KG_U } from './series.js';
import { EVENTS, CATS } from '../data/events.js';
import { BREAKOUT, YARDSTICK, TIMELINESS, LAST_ESTIMATE, AS_OF } from '../data/breakout.js';
import { CAT_COLOR } from './chart.js';
import { num, rise, flash, reveal } from './fx.js';

// Motion bookkeeping (presentation only).
const mv = { report: null, total: null, status: null, ev: null, bo: null };

const a = (u, txt) => `<a href="${u}" target="_blank" rel="noopener">${txt}</a>`;
const BASIS = {
  verified: ['Verified by the IAEA', 'good'],
  estimated: ['IAEA estimate, partly from Iran\'s figures', 'warn'],
  limit: ['Report gives no figure', ''],
  unknown: ['Not reported: no access', 'bad'],
};

export function panelHTML() {
  return `
  <div class="sec" id="ie-rep" aria-live="polite"></div>
  <div class="sec" id="ie-clock"></div>
  <div class="sec">
    <p class="eyebrow">Breakout estimates, as published</p>
    <p class="fine">Time to make enough weapon-grade uranium for one weapon, in the source's own words. This tool does not calculate breakout.</p>
    <ol class="ie-bo" id="ie-bo"></ol>
  </div>
  <div class="sec">
    <p class="eyebrow">Event</p>
    <div id="ie-evcard"></div>
    <ul class="ie-evlist" id="ie-evlist" aria-label="Timeline of events"></ul>
  </div>`;
}

export function wirePanel(host, act) {
  host.querySelector('#ie-evlist').addEventListener('click', e => {
    const b = e.target.closest('[data-ev]');
    if (b) act.event(b.dataset.ev);
  });
  host.querySelector('#ie-rep').addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (b) act.step(Number(b.dataset.step));
  });
}

function repHTML(r) {
  const [bl, bs] = BASIS[r.basis];
  const pv = prevNum(r);
  const k = ROWS.indexOf(r);
  let status;
  if (r.basis === 'limit') status = `<div class="status" data-s="good"><b>Under the JCPOA limit</b><span>The report says the stockpile ${esc(r.note)}. It gives no figure.</span></div>`;
  else if (r.basis === 'unknown') status = `<div class="status" data-s="bad"><b>Unknown</b><span>The IAEA "${esc(r.note)}".</span></div>`;
  else {
    const mult = r.multiple;
    status = `<div class="status" data-s="${mult > 1 ? 'bad' : 'good'}"><b>${mult >= 10 ? Math.round(mult) : mult.toFixed(1)}× the JCPOA limit</b><span>${fmtKg(r.total)} kg of enriched uranium ÷ 202.8 kg. Arithmetic on the report's total${r.totalFromLevels ? ' (this report gives only the stock enriched up to 3.67%, counted under the JCPOA’s rules)' : ''}.</span></div>`;
  }
  let table = '';
  if (r.band) {
    const rows = LEVELS.filter(L => r.band[L.k] > 0 || (pv && pv.band[L.k] > 0)).map(L => {
      const d = pv ? r.band[L.k] - pv.band[L.k] : null;
      return `<tr><th scope="row"><span class="ie-sw" style="background:${L.color}"></span>${L.label}</th><td>${fmtKg(r.band[L.k])}</td><td class="d">${d == null ? '' : (d >= 0 ? '+' : '−') + fmtKg(Math.abs(d))}</td></tr>`;
    }).join('');
    const other = r.uf6 != null && r.uf6Only ? `<tr class="o"><th scope="row">Other forms (oxide, fuel, scrap)</th><td>${fmtKg(r.total - r.uf6)}</td><td></td></tr>` : '';
    table = `<table class="ie-lv"><thead><tr><th scope="col">${r.uf6Only ? 'UF6 by level' : 'By level'}</th><th scope="col">kg U</th><th scope="col">vs prior</th></tr></thead><tbody>${rows}${other}
      <tr class="tot"><th scope="row">Total, all forms</th><td>${fmtKg(r.total)}</td><td class="d">${pv ? (r.total - pv.total >= 0 ? '+' : '−') + fmtKg(Math.abs(r.total - pv.total)) : ''}</td></tr></tbody></table>
      <p class="fine">Levels as the report gives them${r.split === 'coarse' ? ' (the 3.67% and 4.5% stock is shown as "up to 5%", less any part the report says was enriched only up to 2%)' : ''}. The totals and changes are arithmetic on the report's figures.</p>`;
  }
  const quotes = [...(r.quotes || []), ...(r.note && r.basis === 'estimated' ? [r.note] : [])];
  const q = quotes.length ? `<ul class="ie-q">${quotes.map(s => `<li>"…${esc(s)}…"</li>`).join('')}</ul>` : '';
  return `
    <div class="ie-rep-h">
      <div><p class="eyebrow">IAEA report</p><p class="ie-rid">${esc(r.id)}</p><p class="fine">Issued ${niceDate(r.date)}${r.asof !== r.date ? ` · figures as of <b>${niceDate(r.asof)}</b>` : ''}</p></div>
      <div class="ie-steps"><button type="button" class="btn" data-step="-1" ${k === 0 ? 'disabled' : ''} aria-label="Previous report">‹</button><button type="button" class="btn" data-step="1" ${k === ROWS.length - 1 ? 'disabled' : ''} aria-label="Next report">›</button></div>
    </div>
    <span class="pill ie-basis" data-s="${bs}">${bl}</span>
    ${status}${table}
    <details class="ie-details"${r.basis === 'unknown' || r.basis === 'limit' ? ' open' : ''}><summary>What the report says</summary>${q}
      <p class="fine">${a(r.url, `Open ${esc(r.id)} (PDF)`)}${r.via ? ` · copy used: ${a(r.via, 'Wayback Machine')}` : ''}</p></details>`;
}

function clockHTML() {
  const days = daysBetween(LAST_ESTIMATE, AS_OF);
  const last = ROWS.find(r => r.asof === LAST_ESTIMATE && r.band);
  const heu = last.band.le60;
  return `
    <p class="eyebrow">The clock since June 2025</p>
    <div class="ie-clockrow">
      <div class="ie-big"><b class="num">${days}</b><span>days since the IAEA's last stockpile estimate (13 June 2025) as of ${niceDate(AS_OF)}</span></div>
      <div class="ie-big"><b class="num">${Math.floor(days / TIMELINESS.days)}×</b><span>the IAEA's one-month goal for verifying HEU</span></div>
    </div>
    <dl class="readout">
      <dt>60% UF6 at last estimate</dt><dd>${fmtKg(heu)} kg (IAEA; 432.9 kg of it verified)</dd>
      <dt>÷ 40 kg yardstick</dt><dd>≈ ${Math.floor(heu / YARDSTICK.kg)} weapons' worth <span class="notional">arithmetic</span></dd>
    </dl>
    <p class="fine">Arithmetic on sourced figures: day count from the dates above; ${fmtKg(heu)} ÷ ${YARDSTICK.kg} kg, the amount of 60% uranium the ${a(YARDSTICK.src.url, 'Institute for Science and International Security')} says is "sufficient for an implosion-type nuclear weapon" (${esc(YARDSTICK.context)}). The one-month goal: ${a(TIMELINESS.src.url, TIMELINESS.src.name)}. Where the material is now is not known.</p>`;
}

export function renderPanel(host, state) {
  const r = ROWS.find(x => x.id === state.report);
  host.querySelector('#ie-rep').innerHTML = repHTML(r);
  const moved = mv.report !== null && mv.report !== r.id;
  const tot = host.querySelector('#ie-rep tr.tot td');
  if (tot && r.total != null) { if (moved && mv.total != null) tot.dataset.fx = mv.total; num(tot, r.total, { fmt: fmtKg, ms: 380, flashIt: moved && mv.total != null }); }
  const sb = host.querySelector('#ie-rep .status b');
  if (moved && sb && sb.textContent !== mv.status) flash(sb.parentElement);
  // The clock does not depend on the selection: build it once, counting its figures up on first show.
  const clock = host.querySelector('#ie-clock');
  if (!clock.dataset.built) {
    clock.innerHTML = clockHTML();
    clock.dataset.built = '1';
    const [days, mult] = clock.querySelectorAll('.ie-big b');
    num(days, Number(days.textContent), { intro: true, ms: 700, fmt: v => String(Math.round(v)) });
    num(mult, parseInt(mult.textContent, 10), { intro: true, ms: 700, fmt: v => Math.round(v) + '×' });
  }
  // Breakout: highlight the latest estimate published on or before the selected report's date.
  const cur = [...BREAKOUT].reverse().find(b => b.date <= r.date);
  host.querySelector('#ie-bo').innerHTML = BREAKOUT.map(b => `
    <li class="${b === cur ? 'on' : ''}"><span class="d">${niceDate(b.date)} · ${esc(b.who)}</span><b>${esc(b.short)}</b>
      <q>${esc(b.quote)}</q> ${a(b.src.url, esc(b.src.name))}</li>`).join('');
  if (mv.bo !== null && mv.bo !== cur) flash(host.querySelector('#ie-bo li.on'));
  const e = EVENTS.find(x => x.id === state.ev);
  host.querySelector('#ie-evcard').innerHTML = e ? `
    <div class="ie-evc" style="border-left-color:${CAT_COLOR[e.cat]}">
      <p class="d">${e.approx || niceDate(e.date, true)} · ${esc(CATS[e.cat])}</p>
      <h3>${esc(e.title)}</h3><p>${esc(e.desc)}</p>
      <q>${esc(e.quote)}</q>
      <p class="fine">${a(e.src.url, esc(e.src.name))}${e.src.also ? ` · ${a(e.src.also.url, esc(e.src.also.name))}` : ''}</p>
    </div>` : '<p class="fine">Click a diamond above the chart, or pick an event below.</p>';
  host.querySelector('#ie-evlist').innerHTML = EVENTS.map(x => `
    <li><button type="button" data-ev="${x.id}" aria-pressed="${x.id === state.ev}"><i style="background:${CAT_COLOR[x.cat]}"></i><span class="d">${x.approx || niceDate(x.date)}</span> ${esc(x.title)}</button></li>`).join('');
  if (mv.ev !== null && mv.ev !== state.ev) rise(host.querySelector('#ie-evcard > *'), { ms: 300, dy: 6 });
  if (mv.report === null) reveal(host.querySelectorAll('#ie-evlist li'), { stagger: 40 });
  Object.assign(mv, { report: r.id, total: r.total ?? null, status: sb?.textContent ?? null, ev: state.ev, bo: cur ?? false });
}
export { LIMIT_KG_U };
