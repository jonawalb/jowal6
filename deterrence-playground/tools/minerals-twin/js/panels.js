// Heat table, end-use cards, controls timeline, method text and source list.
import { CHAIN } from '../data/chain.js';
import { ENDUSES, DEFENSE_SCALE } from '../data/enduses.js';
import { CONTROLS, CONTROLS_NOTE } from '../data/controls.js';
import { ASSUMPTIONS, FLEX_DEFAULT, FLEX_WHY } from '../data/scenarios.js';
import { esc } from './flow.js';

const HEAT_COLS = ['China', 'DRC', 'Russia', 'Australia', 'Indonesia', 'Japan', 'Chile', 'Mozambique', 'South Africa', 'United States'];

export function renderHeat(table, selected, onPick) {
  let h = `<thead><tr><th>Mineral</th><th>Stage</th><th class="c">Year</th>${HEAT_COLS.map(c => `<th class="c">${c === 'United States' ? 'U.S.' : c === 'South Africa' ? 'S. Africa' : c}</th>`).join('')}<th class="c">Rest</th><th class="c">HHI</th><th class="c">U.S. import reliance</th></tr></thead><tbody>`;
  for (const m of CHAIN.minerals) {
    m.stages.forEach((s, i) => {
      const sh = s.shares;
      const listed = HEAT_COLS.reduce((a, c) => a + (sh[c] || 0), 0);
      const tot = Object.values(sh).reduce((a, b) => a + b, 0);
      const rest = tot ? Math.max(0, tot - listed) : null;
      const cell = v => (v == null ? '<td class="c">–</td>'
        : `<td class="c" style="background:color-mix(in srgb, var(--bad) ${Math.round(Math.min(100, v) * 0.75)}%, transparent)">${v ? v.toFixed(v < 10 ? 1 : 0) : '·'}</td>`);
      const nir = m.usNir ? `${m.usNir.atLeast ? '>' : ''}${m.usNir.value}%` : '–';
      h += `<tr class="${i === 0 ? 'first' : ''}" tabindex="0" data-m="${m.id}" aria-selected="${m.id === selected}">
        <td class="mn">${i === 0 ? esc(m.short) : ''}</td><td class="sg">${esc(s.label)}</td><td class="c">${s.year || '–'}</td>
        ${tot ? HEAT_COLS.map(c => cell(sh[c] || 0)).join('') : HEAT_COLS.map(() => '<td class="c">–</td>').join('')}
        ${rest == null ? '<td class="c">–</td>' : `<td class="c">${rest.toFixed(0)}</td>`}
        <td class="c">${s.hhi != null ? s.hhi.toLocaleString('en-US') : '–'}</td><td class="c">${i === 0 ? nir : ''}</td></tr>`;
    });
  }
  table.innerHTML = h + '</tbody>';
  table.querySelectorAll('tbody tr').forEach(tr => {
    tr.addEventListener('click', () => onPick(tr.dataset.m));
    tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(tr.dataset.m); } });
  });
}

export function renderUses(el, scaleEl, selected) {
  scaleEl.innerHTML = `${esc(DEFENSE_SCALE.t)} <a href="${DEFENSE_SCALE.u}" target="_blank" rel="noopener">GAO-24-107176</a>. ${esc(DEFENSE_SCALE.stockpile)}`;
  const ids = [selected, ...CHAIN.minerals.map(m => m.id).filter(id => id !== selected)];
  el.innerHTML = ids.map(id => {
    const m = CHAIN.minerals.find(x => x.id === id);
    const u = ENDUSES[id];
    return `<article class="use${id === selected ? ' on' : ''}"><h3>${esc(m.short)}</h3>
      <div class="cls">${u.classes.map(c => `<span class="pill">${esc(c)}</span>`).join('')}</div>
      <ul>${u.lines.map(l => `<li>${l.q ? `<blockquote>“${esc(l.t)}”</blockquote>` : esc(l.t)} <span class="s"><a href="${l.u}" target="_blank" rel="noopener">${esc(l.s)}</a></span></li>`).join('')}</ul></article>`;
  }).join('');
}

export function renderControls(el, noteEl, selected, all) {
  const rows = CONTROLS.filter(c => all || c.min.includes(selected));
  const name = id => CHAIN.minerals.find(m => m.id === id).short;
  el.innerHTML = rows.length ? rows.map(c => `<li data-k="${c.kind}"><span class="d">${c.date}</span>
    <span><span class="r">${esc(c.who)}: ${esc(c.ref)}</span><span class="k">${c.kind}</span><br>${esc(c.text)}
    ${all ? `<br><span class="fine">${c.min.map(name).join(', ')}</span>` : ''} <a href="${c.url}" target="_blank" rel="noopener">Source</a></span></li>`).join('')
    : '<li>No official export control found for this mineral.</li>';
  noteEl.textContent = CONTROLS_NOTE;
}

export function renderMethod(el) {
  const flexRows = CHAIN.minerals.map(m => `<tr><td>${esc(m.short)}</td><td class="num">${FLEX_DEFAULT[m.id]}%</td><td>${esc(FLEX_WHY[m.id])}</td></tr>`).join('');
  const asRows = Object.values(ASSUMPTIONS).map(a => `<tr><td>${esc(a.label)}</td><td class="num">${a.v} ${esc(a.unit)}</td><td>${esc(a.why)}</td></tr>`).join('');
  el.innerHTML = `
  <p><b>What the data are.</b> Country shares of world output at each stage. Mining figures are USGS Mineral Commodity Summaries 2026 estimates for 2025, transcribed from the chapter tables; titanium sponge is also USGS. Refining shares are IEA Global Critical Minerals Outlook 2026 figures for 2025, read from the data embedded in the IEA's published charts (CC BY 4.0): a full country split for lithium, cobalt, graphite and rare earths, and the top refiner's share only for gallium, germanium, antimony and tungsten, where the rest is shown as "not broken out". Magnet manufacturing shares are DOE's 2022 assessment for 2020 (Adamas Intelligence data); no newer public breakdown was found. The build script checks every USGS breakdown against the published world total.</p>
  <p><b>Coverage gaps.</b> No public country shares exist for gallium wafers and devices, germanium mining, or tungsten and antimony refining beyond the top country. Magnet data are five years older than the rest. Shares measure production, not trade: no public source gives who ships how much to whom at each stage, so the bands in the flow chart join a country to itself only. U.S. figures marked ">50%" are USGS lower bounds.</p>
  <h3>How the shock model works</h3>
  <p>All flows are fractions of pre-shock supply at a stage. When an actor withholds output at a stage, that stage loses the actor's share times the coverage you set. The chain delivers what its narrowest stage passes, so the stage with the least left binds. Idle capacity outside the actor (published only for gallium and titanium sponge) restarts after the restart time; new capacity arrives after the lead time for that kind of stage and ramps linearly to the share you set. Demand falls by the substitution share over its ramp. Each month the gap is met first from commercial inventory, then from any stockpile, and what remains is the shortfall. "Recovered" means supply meets the (reduced) demand for the rest of the ten-year window.</p>
  <p><b>Whose supply.</b> "World pool" treats every buyer outside the actor as drawing pro rata on world output, so losing a 90% share removes 90% of supply. It overstates the loss where the actor consumes much of its own output (China in lithium chemicals or graphite anodes) and understates it where third countries process the actor's material. "U.S. direct" uses USGS net import reliance times the actor's share of U.S. imports. It is a lower bound: U.S. imports from Canada, Japan or Europe often contain Chinese material (USGS notes this for gallium and rare earths).</p>
  <p><b>Limits.</b> No prices, no elasticities estimated from data, no trade rerouting, no grades or specifications (a defense buyer needs qualified suppliers, not just tonnes), and no allocation between civilian and defense users. DOD buys under 0.1% of global demand for these materials (GAO), so a defense shortfall is a question of priority and qualification more than volume; the model does not show that. Stockpile inventories are not public. Treat the timelines as orders of magnitude, driven by the assumptions below.</p>
  <h3>Assumptions</h3>
  <div class="tablewrap"><table><thead><tr><th>Assumption</th><th>Default</th><th>Rationale</th></tr></thead><tbody>${asRows}</tbody></table></div>
  <h3>Substitution defaults by mineral</h3>
  <div class="tablewrap"><table><thead><tr><th>Mineral</th><th>Default</th><th>Basis</th></tr></thead><tbody>${flexRows}</tbody></table></div>
  <h3>Public data only</h3>
  <p>The tool uses public data only: U.S. government, IEA and official Chinese government sources. It draws on no company, deal or client material and names no commercial projects or firms.</p>`;
}

export function renderSources(el, citeEl) {
  const extra = [
    ['GAO-24-107176, Critical Materials: Action Needed to Implement Requirements That Reduce Supply Chain Risks (Sept 2024)', 'https://www.gao.gov/products/gao-24-107176'],
    ['IEA, Global Critical Minerals Outlook 2026, Executive summary (CC BY 4.0)', 'https://www.iea.org/reports/global-critical-minerals-outlook-2026/executive-summary'],
    ['IEA, Global Critical Minerals Outlook 2026, Outlook (CC BY 4.0)', 'https://www.iea.org/reports/global-critical-minerals-outlook-2026/outlook'],
    ['IEA, Economic value of downstream production at risk from full export controls of rare earths by sector, 2025 (chart data, CC BY 4.0)', 'https://www.iea.org/data-and-statistics/charts/economic-value-of-downstream-production-at-risk-from-full-export-controls-of-rare-earths-by-sector-2025'],
    ['IEA, The Role of Critical Minerals in Clean Energy Transitions (2021), Executive summary: 16.5-year average mine lead time', 'https://www.iea.org/reports/the-role-of-critical-minerals-in-clean-energy-transitions/executive-summary'],
    ['MOFCOM Bureau of Industry Security, Import and Export Control: export-control list and announcements', 'https://aqygzj.mofcom.gov.cn/qdml/index.html'],
  ];
  const main = Object.values(CHAIN.sources).map(s => [s.title + ` (${s.short})`, s.url]);
  el.innerHTML = [...main, ...extra].map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')
    + `<li>All accessed ${CHAIN.retrieved}. USGS, DOE and GAO works are U.S. government public domain. IEA material is CC BY 4.0: "Source: IEA."</li>`;
  citeEl.textContent = `Walberg, Jonathan. "Critical-Minerals Chokepoint Twin." Interactive Deterrence, jwalberg.com, ${CHAIN.retrieved}. Data: USGS Mineral Commodity Summaries 2026; IEA Global Critical Minerals Outlook 2026 (CC BY 4.0); U.S. DOE (2022); GAO-24-107176; MOFCOM announcements.`;
}
