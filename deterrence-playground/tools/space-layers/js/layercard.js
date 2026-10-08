// The card under the globe: facts for the focused layer (or an overview of all layers).
import { LAYERS, LAYER, COUNTRY, COUNTRIES, ORBIT_LAYERS, TYPES, esc, fmtUsd } from './common.js';

const n = v => v == null ? '—' : Number(v).toLocaleString('en-US');
const perKg = a => !a?.usd_per_kg ? '—' : Array.isArray(a.usd_per_kg)
  ? `${fmtUsd(a.usd_per_kg[0])}–${fmtUsd(a.usd_per_kg[1])}/kg` : `${fmtUsd(a.usd_per_kg)}/kg`;
const activeIn = (C, L) => C ? Object.values(C.byCountry).reduce((s, d) => s + (d[L] || 0), 0) : null;

function countryBars(C, L) {
  if (!C) return '';
  const rows = Object.entries(C.byCountry).map(([c, d]) => [c, L ? d[L] || 0 : Object.values(d).reduce((a, b) => a + b, 0)])
    .filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '<p class="fine">No active satellites catalogued here.</p>';
  const max = rows[0][1], log = max > 50 * (rows[2]?.[1] || 1);
  const w = v => (log ? Math.log10(v + 1) / Math.log10(max + 1) : v / max) * 100;
  const name = c => c === 'other' ? 'All other countries' : c === 'com' ? 'Starlink, OneWeb, Kuiper' : COUNTRY[c]?.name || c;
  return `<div class="sl-countbars">${rows.map(([c, v]) =>
    `<span>${esc(name(c))}</span><span class="sl-bar"><i style="width:${w(v).toFixed(1)}%;background:var(--k-${c === 'other' ? 'com' : c}, var(--k-com))"></i></span><span class="num">${n(v)}</span>`).join('')}</div>
    <p class="fine">Active payloads in the CelesTrak catalog on ${esc(C.asof)}, by registering country${log ? '; bar lengths on a log scale' : ''}. "All other countries" pools the rest of the world.</p>`;
}

function reachList(data, L, threats) {
  const ws = data.ALL.filter(w => w.kind === 'offensive' && (w.reach || []).includes(L));
  if (!ws.length) return L === 'spectrum' ? '' : `<p class="fine">No weapon in this data set is reported to reach ${esc(LAYER[L].short)} directly. Jammers and cyber attacks still act on every layer's links.</p>`;
  const by = {}; ws.forEach(w => (by[w.country] ??= []).push(w));
  return `<ul class="sl-reach">${Object.entries(by).map(([c, a]) =>
    `<li><b>${esc(COUNTRY[c]?.name || c)}</b>: ${a.map(w => `${esc(w.name)} <span class="muted">(${esc(TYPES[w.type] || w.type)}, ${esc(w.status)})</span>`).join('; ')}</li>`).join('')}</ul>`;
}

export function renderLayerCard(host, L, data, { threats, vulnOn }) {
  const C = data.COUNTS, F = data.LAYERS_FACTS || {}, A = data.LAUNCH?.LAYER_ACCESS || {};
  if (L === 'all') {
    host.innerHTML = `<p class="eyebrow">All layers</p><h2>From the ground to the Moon</h2>
      <p class="muted">Pick a layer above the globe to zoom in on it. The table compares them; every figure links to its source in the sections below.</p>
      <div class="tablewrap"><table class="sl-heat"><thead><tr><th>Layer</th><th>Altitude</th><th class="num">Active satellites</th><th class="num">Tracked debris</th><th>Launch cost to reach</th><th>Time to get there</th></tr></thead><tbody>
      ${LAYERS.filter(l => ORBIT_LAYERS.includes(l.id)).map(l => `<tr><td><a href="#" data-layer="${l.id}">${esc(l.name)}</a></td>
        <td class="num">${esc(F[l.id]?.altitude || (l.id === 'geo' ? '35,786 km' : `${n(l.lo)}–${n(l.hi)} km`))}</td>
        <td class="num">${n(activeIn(C, l.id))}</td><td class="num">${n(C?.debrisByLayer?.[l.id])}</td>
        <td>${esc(perKg(A[l.id]))}</td><td>${esc(A[l.id]?.transfer_time || '—')}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="fine" style="margin-top:6px">Counts: CelesTrak SATCAT, ${esc(C?.asof || '')}; layer assigned by mean altitude, apogee minus perigee over 10,000 km counted as HEO. Debris = catalogued fragments only; tens of thousands of untracked pieces are smaller than about 10 cm.</p>
      <h3 style="margin:16px 0 6px;font-size:17px">Who has the most satellites up</h3>${countryBars(C, null)}`;
  } else {
    const l = LAYER[L], f = F[L] || {}, a = A[L] || {};
    const facts = [
      ['Altitude', f.alt_km ? (Array.isArray(f.alt_km) ? `${n(f.alt_km[0])}–${n(f.alt_km[1])} km` : `${n(f.alt_km)} km`) : (L === 'ground' || L === 'spectrum' ? 'Surface' : L === 'geo' ? '35,786 km' : `${n(l.lo)}–${n(l.hi)} km`)],
      f.period && ['One orbit takes', f.period],
      ORBIT_LAYERS.includes(L) && ['Active satellites', n(activeIn(C, L))],
      ORBIT_LAYERS.includes(L) && C?.debrisByLayer && ['Tracked debris pieces', n(C.debrisByLayer[L])],
      a.usd_per_kg && ['Launch cost to reach', perKg(a)],
      a.transfer_time && ['Time to get there', a.transfer_time],
    ].filter(Boolean);
    const txt = v => Array.isArray(v) ? `<ul>${v.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ` ${esc(v)}`;
    const extra = ['why', 'missions', 'debris'].filter(k => f[k]).map(k => `<div class="sl-fact"><b>${{ missions: 'What flies here.', debris: 'Debris.', why: 'Why militaries care.' }[k]}</b>${txt(f[k])}</div>`).join('');
    const src = [...(f.sources || []), ...(a.sources || [])];
    host.innerHTML = `<p class="eyebrow">${esc(l.short)}</p><h2>${esc(l.name)}</h2><p>${esc(l.line)}</p>
      <div class="sl-lgrid">${facts.filter(([, v]) => String(v).length <= 28).map(([k, v]) => `<div><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>
      ${facts.filter(([, v]) => String(v).length > 28).map(([k, v]) => `<div class="sl-fact"><b>${esc(k)}.</b> ${esc(v)}</div>`).join('')}
      ${a.note ? `<p class="fine">${esc(a.note)}</p>` : ''}${extra}
      <div class="sl-twocol"><div>${ORBIT_LAYERS.includes(L) ? `<h3 style="margin:10px 0 6px;font-size:17px">Who operates here</h3>${countryBars(C, L)}` : ''}</div>
      <div><h3 style="margin:10px 0 6px;font-size:17px">${L === 'spectrum' ? 'Who attacks the links' : 'What can reach it'}${vulnOn && threats.has(L) ? ' <span class="pill" style="color:var(--bad)">in reach</span>' : ''}</h3>
      ${L === 'spectrum' ? spectrumList(data) : reachList(data, L, threats)}</div></div>
      ${src.length ? `<p class="fine" style="margin-top:8px">Sources: ${src.map(s => `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>`).join('; ')}</p>` : ''}`;
  }
  host.querySelectorAll('[data-layer]').forEach(a => a.onclick = e => { e.preventDefault(); document.querySelector(`#layerbar [data-v="${a.dataset.layer}"]`)?.click(); });
}

function spectrumList(data) {
  const ws = data.ALL.filter(w => w.type === 'jammer' || w.type === 'cyber');
  if (!ws.length) return '';
  const by = {}; ws.forEach(w => (by[w.country] ??= []).push(w));
  return `<ul class="sl-reach">${Object.entries(by).map(([c, a]) => `<li><b>${esc(COUNTRY[c]?.name || c)}</b>: ${a.map(w => esc(w.name)).join('; ')}</li>`).join('')}</ul>`;
}
