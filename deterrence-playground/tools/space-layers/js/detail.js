// The card that opens when a system is clicked: capability, cost (placed on a log strip against every costed system),
// specs, exposure or reach, resilience and sources.
import { LAYERS, LAYER, COUNTRY, TYPES, STATUS, EFFECTS, THREATS, COST_BANDS, fmtUsd, esc, homeLayers, bandOf } from './common.js';

const LADDER = ['ground', 'vleo', 'leo', 'meo', 'heo', 'geo', 'cislunar'];
const VLABEL = ['Low', 'Some', 'High', 'Very high'];

function costStrip(it, all) {
  const vals = all.map(x => x.cost?.usd).filter(v => v > 0);
  if (!it.cost?.usd || vals.length < 3) return '';
  const lo = Math.floor(Math.log10(Math.min(...vals))), hi = Math.ceil(Math.log10(Math.max(...vals)));
  const x = v => ((Math.log10(v) - lo) / (hi - lo) * 100).toFixed(2) + '%';
  const ticks = [];
  for (let e = lo; e <= hi; e++) if ((e - lo) % Math.max(1, Math.round((hi - lo) / 4)) === 0 || e === hi) ticks.push(fmtUsd(10 ** e));
  return `<h4>Cost against every system with a public figure</h4>
    <div class="sl-coststrip" role="img" aria-label="${esc(fmtUsd(it.cost.usd))} on a log scale from ${esc(fmtUsd(10 ** lo))} to ${esc(fmtUsd(10 ** hi))}">
      ${vals.map(v => `<i style="left:${x(v)}"></i>`).join('')}<i class="me" style="left:${x(it.cost.usd)}"></i></div>
    <div class="sl-costaxis">${ticks.map(t => `<span>${t}</span>`).join('')}</div>
    <p class="fine">Log scale. Grey ticks are the other ${vals.length - 1} costed systems; costs mix per-unit and program figures.</p>`;
}

export function renderDetail(box, it, data, { colorOf, onClose, onPick }) {
  const c = COUNTRY[it.country];
  const pills = [c?.name, it.operator, TYPES[it.type] || it.type, STATUS[it.status] || it.status, it.effect && EFFECTS[it.effect]?.split(' (')[0]]
    .filter(Boolean).map(t => `<span class="pill">${esc(t)}</span>`).join('');
  const cost = it.cost?.usd != null
    ? `<div><b>${fmtUsd(it.cost.usd)}</b><span>${esc([it.cost.per && 'per ' + it.cost.per, it.cost.year && `(${it.cost.year} $)`].filter(Boolean).join(' '))}</span></div>`
    : `<div><b>${bandOf(it) ? esc(COST_BANDS.find(b => b.id === bandOf(it)).name) : 'n/a'}</b><span>${bandOf(it) ? 'cost band' : 'no public cost figure'}</span></div>`;
  const where = homeLayers(it).map(l => LAYER[l]?.short).join(', ');
  const big = `<div class="sl-big">${cost}<div><b>${esc(where)}</b><span>${it.reach ? 'based in' : 'operates in'}</span></div>${it.firstTest ? `<div><b>${it.firstTest}</b><span>first test</span></div>` : ''}</div>`;

  let exposure = '';
  if (it.reach?.length) {
    exposure = `<h4>What it can reach</h4><div class="sl-ladder">${LADDER.map(l =>
      `<span class="${it.reach.includes(l) ? 'on' : ''} ${homeLayers(it).includes(l) ? 'home' : ''}">${esc(LAYER[l].name)}${it.reach.includes(l) ? ' · in reach' : ''}</span>`).join('')}</div>
      <p class="fine">Red rows: layers this weapon can attack. Dashed: where it is based.</p>`;
  } else if (it.vuln) {
    exposure = `<h4>Exposure by threat ${it.vulnNotional !== false ? '<span class="notional">judgment</span>' : ''}</h4><div class="sl-bars">${THREATS.map(t => {
      const v = it.vuln[t.id] ?? 0;
      return `<span>${t.name}</span><span class="sl-bar"><i style="width:${(v / 3 * 100).toFixed(0)}%;background:var(--v${v})"></i></span><span class="num">${v}/3</span>`;
    }).join('')}</div>${it.vuln.note ? `<p class="fine" style="margin-top:6px">${esc(it.vuln.note)}</p>` : ''}`;
    // Which weapons in the data set could reach this system's layers?
    const ls = homeLayers(it), threats = data.ALL.filter(w => w.kind === 'offensive' && w.country !== it.country
      && ((w.reach || []).some(l => ls.includes(l)) || w.type === 'jammer' || w.type === 'cyber'));
    if (threats.length) {
      const by = {}; threats.forEach(w => (by[w.country] ??= []).push(w));
      exposure += `<h4>Weapons in this data set that could reach it</h4><ul>${Object.entries(by).map(([cc, ws]) =>
        `<li>${esc(COUNTRY[cc]?.name || cc)}: ${ws.slice(0, 6).map(w => `<a href="#" data-pick="${esc(w.id)}">${esc(w.name)}</a>`).join(', ')}${ws.length > 6 ? `, and ${ws.length - 6} more` : ''}</li>`).join('')}</ul>
        <p class="fine">Jammers and cyber tools are listed for every system: they act on links and ground networks, not altitude.</p>`;
    }
  }

  const specs = it.specs && Object.keys(it.specs).length
    ? `<h4>Technical specs</h4><dl class="sl-specs">${Object.entries(it.specs).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '';
  const res = it.resilience?.length ? `<h4>Resilience</h4><ul>${it.resilience.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : '';
  const costNote = (it.cost?.note ? `<p class="fine">${esc(it.cost.note)}</p>` : '')
    + (it.notional && it.note ? `<p class="fine"><span class="notional">placement</span> ${esc(it.note)}</p>` : '');
  const srcs = it.sources?.length ? `<h4>Sources</h4><ol class="src">${it.sources.map(s => `<li>${s.u ? `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>` : esc(s.t)}</li>`).join('')}</ol>` : '';

  box.innerHTML = `<button type="button" class="sl-close" aria-label="Close">×</button>
    <p class="eyebrow" style="color:${colorOf(it)}">${esc(it.kind === 'enabler' ? 'Space service' : it.kind)}</p>
    <h3>${esc(it.name)}</h3><div class="sl-meta">${pills}</div>
    <p>${esc(it.summary || '')}</p>${big}${costNote}${costStrip(it, data.ALL)}${exposure}${specs}${res}${srcs}`;
  box.querySelector('.sl-close').onclick = onClose;
  box.querySelectorAll('[data-pick]').forEach(a => a.onclick = e => { e.preventDefault(); onPick(a.dataset.pick); });
  box.scrollTop = 0;
}
