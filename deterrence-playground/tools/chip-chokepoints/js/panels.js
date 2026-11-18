// Stage card, controls timeline, heat table, method text and source list.
import { CHAIN } from '../data/chain.js';
import { CONTROLS, CONTROLS_ASOF, CONTROLS_NOTE } from '../data/controls.js';
import { NOTIONAL, NOTIONAL_NOTE } from '../data/scenarios.js';
import { esc, rowsOf, colorOf } from './flow.js';
import { hhi } from './model.js';

const BLOC = { us: 'United States', al: 'Allied', cn: 'China' };
const src = id => CHAIN.sources[id];
const link = (id, txt) => { const s = src(id); return s ? `<a href="${s.url}" target="_blank" rel="noopener">${esc(txt || s.short)}</a>` : ''; };

export function ctlForStage(id) {
  return CONTROLS.filter(c => c.nodes.includes(id));
}
export function ctlCounts() {
  const out = {};
  for (const s of CHAIN.stages) {
    const n = { us: 0, al: 0, cn: 0 };
    ctlForStage(s.id).forEach(c => { n[c.bloc]++; });
    out[s.id] = n;
  }
  return out;
}

const ctlHead = c => (c.title ? `<span class="r">${esc(c.title)}</span><span class="k">${esc(c.status)}</span>${c.verified === false ? ' <span class="pill unv">unverified</span>' : ''}<span class="cite">${esc(c.who)}: ${esc(c.ref)}</span>`
  : `<span class="r">${esc(c.who)}: ${esc(c.ref)}</span><span class="k">${esc(c.status)}</span>${c.verified === false ? ' <span class="pill unv">unverified</span>' : ''}<br>`);
const ctlItem = (c, showNodes) => `<li data-b="${c.bloc}" data-st="${esc(c.status)}"><span class="d">${esc(c.date)}</span>
  <span>${ctlHead(c)}${esc(c.text)}
  ${showNodes ? `<br><span class="fine">Targets: ${c.nodes.map(n => esc((CHAIN.stages.find(s => s.id === n) || { short: n }).short)).join(', ')}</span>` : ''}
  ${c.url ? ` <a href="${c.url}" target="_blank" rel="noopener">${esc(c.urlLabel || 'Source')}</a>` : ''}</span></li>`;

const OFF = /pending|proposed|bill|not enacted|superseded|withdrawn|moot|rescind|removed|unverified|reported|unknown|expired|lapsed|ran to|ended|lifted|background/i;

// Landmark measures per stage (citation prefixes), shown first in the Simple stage card.
const NL23 = 'Regeling geavanceerde productieapparatuur voor halfgeleiders (Regeling van 23 juni 2023';
const KEY = {
  euv: [NL23, '88 FR 73424', '89 FR 96790'], duv: [NL23, 'Regeling van 2 september 2024', '89 FR 96790'],
  hbm: ['89 FR 96790', '91 FR 1684', 'CAC Cybersecurity Review Office'],
  foundry: ['87 FR 62186', '85 FR 83416', '90 FR 5298'], accel: ['87 FR 62186', '88 FR 73458', '91 FR 1684'],
  ga: ['MOFCOM/GACC Announcement 2023 No. 23', 'MOFCOM Announcement 2024 No. 46', 'MOFCOM Announcement 2025 No. 72'],
  ge: ['MOFCOM/GACC Announcement 2023 No. 23', 'MOFCOM Announcement 2024 No. 46', 'MOFCOM Announcement 2025 No. 72'],
};

export function renderCard(el, id, loss, shockLabel) {
  const s = CHAIN.stages.find(x => x.id === id);
  if (!s) { el.innerHTML = ''; return; }
  const rows = rowsOf(s);
  const h = rows.length ? hhi(s.shares) : null;
  const firms = s.firms ? Object.entries(s.firms).sort((a, b) => b[1] - a[1]) : [];
  const ctl = ctlForStage(id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const n = NOTIONAL[id];
  // Simple view: the landmark measures for this stage where named in KEY, then measures in force that target the
  // fewest stages; three shown, newest first.
  const off = c => (OFF.test(c.status) || c.kind === 'suspend' ? 1 : 0);
  const pin = c => ((KEY[id] || []).some(p => c.ref.startsWith(p)) ? 0 : 1);
  const key = [...ctl].sort((a, b) => pin(a) - pin(b) || off(a) - off(b) || a.nodes.length - b.nodes.length || (a.date < b.date ? 1 : -1))
    .slice(0, 3).sort((a, b) => (a.date < b.date ? 1 : -1));
  el.innerHTML = `<div class="card-h"><h3>${esc(s.label)}</h3>${loss ? `<span class="left" data-s="${loss > 0.5 ? 'bad' : 'warn'}" title="${esc(shockLabel || '')}">${Math.round((1 - loss) * 100)}% left in the selected shock</span>` : ''}</div>
    ${loss && shockLabel ? `<p class="fine shock-n">Shock: ${esc(shockLabel)}</p>` : ''}
    <p class="fine full-only">${esc(s.metric)}, data year ${esc(String(s.year))}. Source: ${link(s.src)}.${h ? ` HHI ${h.toLocaleString('en-US')}.` : ''}</p>
    <div class="cgrid">
      <div><p class="eyebrow">Country shares</p>${rows.length ? `<table class="mini"><tbody>${rows.map(r => `<tr><td><span class="dot" style="background:${colorOf(r.c)}"></span>${esc(r.c)}</td><td class="num">${r.v}%</td></tr>`).join('')}</tbody></table>` : '<p class="fine">No public country split found.</p>'}
      ${firms.length ? `<p class="eyebrow mt-s">Firms</p><table class="mini"><tbody>${firms.map(([f, v]) => `<tr><td>${esc(f)}${s.firmCountry && s.firmCountry[f] ? ` <span class="fine">(${esc(s.firmCountry[f])})</span>` : ''}</td><td class="num">${v}%</td></tr>`).join('')}</tbody></table><p class="fine full-only">${s.firmSrc ? `Firm shares: ${link(s.firmSrc)}, ${esc(String(s.firmYear || s.year))}.` : ''}</p>` : ''}
      ${s.note ? `<p class="fine mt-s full-only">${esc(s.note)}</p>` : ''}</div>
      <div><p class="eyebrow">China's position</p><p class="cn">${esc(s.china.text)}</p>
      ${s.china.subs && s.china.subs.length ? `<ul class="subs">${s.china.subs.map(x => `<li><b>${esc(x.name)}</b> ${esc(x.note || '')}</li>`).join('')}</ul>` : ''}
      ${s.china.src ? `<p class="fine full-only">Source: ${s.china.src.map(i => link(i)).join('; ')}</p>` : ''}
      ${n ? `<div class="full-only"><p class="eyebrow mt-s">Model assumptions <span class="notional">notional</span></p><p class="fine">Buffer ${n.buffer} months; time to substitute ${n.lo} to ${n.hi} months. ${esc(n.why)}</p></div>` : ''}</div>
    </div>
    <div class="full-only"><p class="eyebrow mt-s">Controls aimed at this stage (${ctl.length})</p>
    ${ctl.length ? `<ol class="ctl">${ctl.map(c => ctlItem(c, false)).join('')}</ol>` : '<p class="fine">No export control in this tool targets this stage directly.</p>'}</div>
    <div class="simple-only">${ctl.length ? `<p class="eyebrow mt-s">Main controls aimed at this stage</p><p class="fine">In force and most targeted at this stage first.</p>
      <ol class="ctl brief">${key.map(c => `<li data-b="${c.bloc}"><span class="d">${esc(c.date)}</span><span>${ctlHead(c)}</span></li>`).join('')}</ol>
      <button type="button" class="linkbtn" data-act="all-ctl">All ${ctl.length} control${ctl.length === 1 ? '' : 's'} for this stage, with sources and notional assumptions (Full detail)</button>`
      : '<p class="fine">No export control in this tool targets this stage directly. Sources and notional model assumptions are in Full detail.</p>'}</div>`;
}

// Text search over every measure: all words must match somewhere. Title or citation matches rank first,
// then matches in the summary; ties go to the newest measure.
export function searchControls(list, q) {
  const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const out = [];
  for (const c of list) {
    const head = `${c.title || ''} ${c.who} ${c.ref}`.toLowerCase();
    const body = `${c.text} ${c.date} ${c.eff || ''} ${c.status}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (head.includes(w)) score += 2; else if (body.includes(w)) score += 1; else { score = -1; break; }
    }
    if (score > 0) out.push([score, c]);
  }
  return out.sort((a, b) => b[0] - a[0] || (a[1].date < b[1].date ? 1 : -1)).map(x => x[1]);
}

export function renderControls(el, noteEl, f) {
  const hits = searchControls(CONTROLS, f.q);
  const rows = hits ? hits.filter(c => (f.bloc === 'all' || c.bloc === f.bloc) && (f.node === 'all' || c.nodes.includes(f.node)))
    : CONTROLS.filter(c => (f.bloc === 'all' || c.bloc === f.bloc) && (f.node === 'all' || c.nodes.includes(f.node))).sort((a, b) => (a.date < b.date ? 1 : -1));
  el.innerHTML = rows.length ? rows.map(c => ctlItem(c, true)).join('') : '<li>No measure matches these filters.</li>';
  noteEl.textContent = `${rows.length} of ${CONTROLS.length} measures shown${hits ? ', best matches first' : ''}. Current as of ${CONTROLS_ASOF}. ${CONTROLS_NOTE}`;
}

// Simple mode: search results across all measures, ignoring the Full-detail filters.
export function renderSearchSimple(el, q) {
  const hits = searchControls(CONTROLS, q);
  el.hidden = !hits;
  if (!hits) { el.innerHTML = ''; return; }
  el.innerHTML = `<p class="fine" role="status">${hits.length} of ${CONTROLS.length} measures match, best matches first.</p>`
    + (hits.length ? `<ol class="ctl">${hits.map(c => ctlItem(c, true)).join('')}</ol>` : '');
}

export function renderHeat(table, selected, onPick, sort = 0, onSort = () => {}) {
  const cols = ['United States', 'Taiwan', 'South Korea', 'Japan', 'Netherlands', 'Europe', 'China'];
  const lab = c => ({ 'United States': 'U.S.', 'South Korea': 'Korea', Netherlands: 'NL', Europe: 'Europe' }[c] || c);
  const hh = s => (Object.keys(s.shares || {}).length ? hhi(s.shares) : -1);
  const stages = sort ? [...CHAIN.stages].sort((a, b) => sort * (hh(b) - hh(a))) : CHAIN.stages;
  const sortLab = sort === 1 ? 'highest first' : sort === -1 ? 'lowest first' : 'chain order';
  let h = `<thead><tr><th>Stage</th><th class="c">Year</th>${cols.map(c => `<th class="c">${lab(c)}</th>`).join('')}<th class="c">Rest</th><th class="c" aria-sort="${sort === 1 ? 'descending' : sort === -1 ? 'ascending' : 'none'}"><button type="button" class="sortbtn" id="hhi-sort" title="Sort by HHI">HHI <span aria-hidden="true">${sort === 1 ? '▼' : sort === -1 ? '▲' : '↕'}</span><span class="vh">, sorted ${sortLab}; activate to change</span></button></th><th class="c">Controls</th></tr></thead><tbody>`;
  for (const s of stages) {
    // SIA/BCG label its European column "EU"; it shares the Europe column here, with the UK and Germany.
    const sh = { ...(s.shares || {}) };
    for (const k of ['European Union', 'United Kingdom', 'Germany']) if (sh[k] != null) { sh.Europe = (sh.Europe || 0) + sh[k]; delete sh[k]; }
    const tot = Object.values(sh).reduce((a, b) => a + b, 0);
    const listed = cols.reduce((a, c) => a + (sh[c] || 0), 0);
    const cell = v => `<td class="c" style="background:color-mix(in srgb, var(--bad) ${Math.round(Math.min(100, v) * 0.75)}%, transparent)">${v ? (v < 10 ? v.toFixed(1) : v.toFixed(0)) : '·'}</td>`;
    h += `<tr tabindex="0" data-st="${s.id}" aria-selected="${s.id === selected}"><td class="mn">${esc(s.label)}</td><td class="c">${esc(String(s.year))}</td>
      ${tot ? cols.map(c => cell(sh[c] || 0)).join('') : cols.map(() => '<td class="c">–</td>').join('')}
      <td class="c">${tot ? Math.max(0, tot - listed).toFixed(0) : '–'}</td><td class="c">${tot ? hhi(s.shares).toLocaleString('en-US') : '–'}</td><td class="c">${ctlForStage(s.id).length}</td></tr>`;
  }
  table.innerHTML = h + '</tbody>';
  table.querySelector('#hhi-sort').addEventListener('click', () => onSort(sort === 0 ? 1 : sort === 1 ? -1 : 0));
  table.querySelectorAll('tbody tr').forEach(tr => {
    tr.addEventListener('click', () => onPick(tr.dataset.st));
    tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(tr.dataset.st); } });
  });
}

export function renderMethod(el) {
  const asRows = CHAIN.stages.filter(s => NOTIONAL[s.id]).map(s => { const n = NOTIONAL[s.id]; return `<tr><td>${esc(s.short)}</td><td class="num">${n.buffer}</td><td class="num">${n.lo}–${n.hi}</td><td>${esc(n.why)}</td></tr>`; }).join('');
  el.innerHTML = `
  <p><b>What the data are.</b> ${esc(CHAIN.method.data)}</p>
  <p><b>Coverage gaps.</b> ${esc(CHAIN.method.gaps)}</p>
  <h3>How the shock model works</h3>
  <p>The model treats the AI accelerator chain as serial: a data-center accelerator needs design tools, IP, wafers, resists, gases, substrates, lithography and other fab tools, a leading-edge logic fab, HBM, advanced packaging and test. A shock removes an actor's share of a stage's world output, times the coverage you set. The stage with the least output left binds, and world accelerator output can be no larger than that stage allows.</p>
  <p>Each hit stage first runs on its buffer: inventory for materials and finished parts, or the months installed tools keep running without the supplier's service and spare parts for equipment. After the buffer, the lost share is gone until substitutes arrive. Substitution is timed from the onset of the shock, not from the end of the buffer: replacement output starts at half the time-to-substitute and ramps linearly to full at the time-to-substitute. The simulator runs the low end (fast) and high end (slow) of each stage's range side by side. When a shock with a set duration ends, the stage returns to full output at once, which flatters recovery.</p>
  <p><b>Limits.</b> Shares are general market shares for the stage, not shares of the inputs used in AI accelerators specifically, and AI accelerators are often more concentrated (see each stage card). Shares measure production by firm headquarters or by location as each source defines it; the card says which. The model has no prices, no rationing between AI and other chips, no stockpiles held by the accelerator firms, and no trade rerouting. Equipment shocks hit the installed base only through service and spares; an export stop on new tools to one country (the actual Dutch and Japanese rules) cuts that country's future capacity, which this model does not show. Treat the timelines as orders of magnitude driven by the notional values below.</p>
  <h3>Notional assumptions <span class="notional">notional</span></h3>
  <p class="fine">${esc(NOTIONAL_NOTE)}</p>
  <div class="tablewrap"><table><thead><tr><th>Stage</th><th>Buffer (months)</th><th>Time to substitute (months)</th><th>Rationale</th></tr></thead><tbody>${asRows}</tbody></table></div>`;
}

export function renderSources(el, citeEl) {
  const main = Object.values(CHAIN.sources).map(s => [s.title, s.url]);
  el.innerHTML = main.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')
    + `<li>Control measures: see the timeline above; every entry links to the official text, or to press where flagged unverified. Sources accessed 16–18 November 2026.</li>`;
  citeEl.textContent = `Walberg, Jonathan. "AI Chip Chokepoint Twin." Interactive Deterrence, jwalberg.com, ${CHAIN.retrieved}.`;
}
export { BLOC };
