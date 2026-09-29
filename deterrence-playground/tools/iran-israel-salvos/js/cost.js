// Side panel: episode status and the notional "interceptor cost vs threat cost" comparison.
import { escapeHtml, fmt } from '../../../shared/js/mapkit.js';
import { EPISODES } from '../data/episodes.js';
import { INTERCEPTORS, THREATS } from '../data/costs.js';
import { refs } from './refs.js';

const MAXN = { thaad: 200, sm3: 150, arrow3: 200, arrow2: 200, davids: 200, sm6: 60, irondome: 600 };
/** Reported interceptor counts for an episode (from the systems table), 0 where none is published. */
export function reportedCounts(ep) {
  const e = EPISODES.find(x => x.id === ep);
  return Object.fromEntries(INTERCEPTORS.map(i => [i.k, e.systems[i.k]?.n ?? 0]));
}
const money = m => m >= 1000 ? `$${(m / 1000).toFixed(m >= 10000 ? 0 : 2)} bn` : `$${m >= 10 ? Math.round(m) : m.toFixed(1)} m`;

export function buildPanel(host) {
  host.innerHTML = `
  <div class="sec"><div class="status" id="ii-status"><b></b><span></span></div><dl class="readout" id="ii-read"></dl></div>
  <div class="sec ii-cost">
    <p class="eyebrow">Interceptor cost vs threat cost <span class="notional">notional</span></p>
    <p class="fine">Counts marked "reported" come from the cited source; every other count is yours to set. Unit costs are cited low and high estimates.</p>
    <div class="ii-mix" id="ii-sliders"></div>
    <div class="seg" id="ii-reset" role="group" aria-label="Counts"><button type="button" data-reset="rep">Reset to reported counts</button><button type="button" data-reset="zero">Clear all</button></div>
    <div id="ii-cbars"></div>
    <p class="ii-ratio" id="ii-ratio"></p>
    <p class="fine" id="ii-cnote"></p>
  </div>
  <div class="sec">
    <p class="eyebrow">Unit costs used (estimates)</p>
    <div class="tablewrap"><table class="ii-unit"><thead><tr><th>Item</th><th>Low–high, $m</th></tr></thead><tbody>
      ${[...INTERCEPTORS, ...THREATS].map(u => `<tr><td>${u.name}<br><small class="fine">${escapeHtml(u.note)} ${refs(u.src)}</small></td><td class="num">${u.lo == null ? 'n/a' : u.lo === u.hi ? u.lo : `${u.lo}–${u.hi}`}</td></tr>`).join('')}
    </tbody></table></div>
  </div>`;
  document.getElementById('ii-sliders').innerHTML = INTERCEPTORS.map(i => `<div class="slider">
    <div class="sl-h"><label for="n-${i.k}">${i.name}</label><output id="o-${i.k}"></output></div>
    <input type="range" id="n-${i.k}" data-k="${i.k}" min="0" max="${MAXN[i.k]}" step="1" value="0">
    <small id="s-${i.k}"></small></div>`).join('');
}

export function renderPanel(S) {
  const e = EPISODES.find(x => x.id === S.ep);
  const through = e.funnel.find(f => f.k === 'through');
  const st = document.getElementById('ii-status');
  st.querySelector('b').textContent = `${e.name}, ${e.dates}`;
  st.querySelector('span').textContent = e.summary;
  document.getElementById('ii-read').innerHTML = `<dt>Launched</dt><dd>${escapeHtml(e.totalTxt)}</dd><dt>Interception</dt><dd>${escapeHtml(e.rate.txt)}</dd><dt>Got through</dt><dd>${escapeHtml(through.txt)}</dd><dt>Defenders</dt><dd>${e.defenders.filter(d => !/no interceptions/.test(d.role)).length} states</dd>`;

  const rep = reportedCounts(S.ep);
  INTERCEPTORS.forEach(i => {
    const n = S.counts[i.k], inp = document.getElementById(`n-${i.k}`);
    if (+inp.value !== n) inp.value = n;
    document.getElementById(`o-${i.k}`).textContent = fmt(n);
    const isRep = rep[i.k] > 0 && n === rep[i.k];
    const sys = e.systems[i.k];
    document.getElementById(`s-${i.k}`).innerHTML = isRep ? `reported: ${escapeHtml(sys.txt)} ${refs(sys.src)}`
      : n ? '<span class="notional">notional</span> your count' : (sys ? `used; no public count ${refs(sys.src)}` : 'no source reports it in this episode');
  });
  let dLo = 0, dHi = 0, nTot = 0, nRep = 0;
  INTERCEPTORS.forEach(i => { nTot += S.counts[i.k]; if (rep[i.k] > 0) nRep += Math.min(S.counts[i.k], rep[i.k]); });
  INTERCEPTORS.forEach(i => { dLo += S.counts[i.k] * i.lo; dHi += S.counts[i.k] * i.hi; });
  let aLo = 0, aHi = 0;
  THREATS.forEach(t => { const f = e.launched[t.k]; if (f.v && t.lo != null) { aLo += f.v * t.lo; aHi += f.v * t.hi; } });
  const reported = e.costs;
  const scale = Math.max(dHi, aHi, ...reported.map(c => c.hi)) * 1.05 || 1;
  const w = v => `${(v / scale * 100).toFixed(2)}%`;
  const bar = (cls, label, lo, hi, marks) => `<div class="ii-cbar ${cls}"><span>${label}</span>
      <span class="tr"><span class="hi" style="left:0;width:${w(hi)}"></span><span class="lo" style="left:0;width:${w(lo)}"></span>${marks}</span>
      <span class="v">${money(lo)}${hi !== lo ? ` to ${money(hi)}` : ''}</span></div>`;
  const mk = side => reported.filter(c => c.side === side).map(c => `<span class="ref" style="left:${w((c.lo + c.hi) / 2)}" title="${escapeHtml(c.who)}: ${c.txt}"></span>`).join('');
  document.getElementById('ii-cbars').innerHTML =
    bar('def', 'Interceptors', dLo, dHi, mk('def')) + bar('thr', 'Iran\'s weapons', aLo, aHi, mk('att'));
  const mid = (dLo + dHi) / 2, amid = (aLo + aHi) / 2;
  document.getElementById('ii-ratio').innerHTML = mid && amid
    ? `${(mid / amid).toFixed(1)} : 1<small>interceptor cost to threat cost at midpoint unit costs (range ${(dLo / aHi).toFixed(1)} to ${(dHi / aLo).toFixed(1)}), counting ${fmt(nTot)} interceptors, ${fmt(nRep)} of them at reported counts</small>`
    : `n/a<small>set at least one interceptor count to compare</small>`;
  document.getElementById('ii-cnote').innerHTML = `Threat cost counts ballistic missiles and drones at the launch figures above; cruise missiles have no sourced unit cost and are left out. Dashed ticks mark published estimates for this episode: ${reported.map(c => `${escapeHtml(c.who)}, ${c.txt} ${refs(c.src)}`).join('; ')}.`;
}
