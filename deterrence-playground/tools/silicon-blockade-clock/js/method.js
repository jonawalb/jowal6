// Method text, assumption table, sourced baseline, sources list and changelog for the panel below the tool.
import { SOURCES, FACTS, PARAMS, LEVERS, ALTS, CHANGELOG, SCENARIOS, ASOF } from '../data/chips.js';
import { escapeHtml } from '../../../shared/js/mapkit.js';

const $ = id => document.getElementById(id);
const pc = v => Math.round(v * 100) + '%';
const srcLinks = keys => keys.map(k => `<a href="${SOURCES[k].u}" target="_blank" rel="noopener">${escapeHtml(SOURCES[k].t.split(',')[0])}</a>`).join('; ');

export function renderBelow() {
  $('method').innerHTML = `
    <p>The model runs day by day for one year. Every quantity is a share of its normal, pre-crisis level.</p>
    <h3>1. Fuel and grid</h3>
    <p>This link is forked from TSM's Energy Blockade Clock, with every input re-checked on ${ASOF}. Each fuel is a stock measured in days of normal use. Arrivals equal normal supply times the share of cargo that gets through. Renewables run at their 2025 share. Coal is burned first to stretch the LNG, then gas, then oil, and power plants take fuel before other users. Nuclear is zero: Taiwan's last reactor shut in May 2025 and the restart plan approved in September 2026 still needs safety checks.</p>
    <h3>2. Rationing</h3>
    <p>When supply falls short, power goes to six sectors in a priority order you choose. The sector shares of demand come from 2024 MOEA data, in which electronic products and electrical equipment manufacturing (a category wider than chips) used 23.2 percent of Taiwan's electricity. If "leading-edge first" is on, the chip sector's power goes first to a leading-edge block, sized by default at TSMC's purchased electricity in Taiwan as a share of that category in 2024 (35 percent). The orders themselves are <span class="notional">notional</span>.</p>
    <h3>3. Fabs and packaging</h3>
    <p>Leading-edge wafer fabs and CoWoS-class packaging lines are treated as one block, because both sit in the same science parks, draw on the same grid and are needed for the same product. Below full power, output equals the power share less a loss for rotating cuts. Output also stops when process materials run out, and after any cut it recovers at a limited rate while tools are requalified. The model does not scrap wafers in process. A long hard outage would scrap some and add months of cycle time, so real losses after recovery would be larger.</p>
    <h3>4. Exports and buffers outside Taiwan</h3>
    <p>What Taiwan makes leaves the island at the export rate the scenario sets; the rest is stranded and ships after the blockade lifts, at most a set share of a normal day's output on top of current output. Outside Taiwan, a stock of finished accelerators covers shortfalls until it runs out. A share of world output with no Taiwan step (by default, Huawei and Cambricon chips in Epoch AI's data) continues unaffected. No chip is discarded: every chip made is delivered, held in stock abroad or stranded in Taiwan, and the tests check this balance.</p>
    <p>Demand not met on the day becomes a backlog. Later supply clears it before refilling stock abroad, at most a <span class="notional">notional</span> catch-up ceiling above normal deliveries per day. The readouts separate three totals: chips that missed their delivery date (late or never), chips still owed at the end of the year, and output never made at all, measured against a year of normal production.</p>
    <h3>5. Alternatives</h3>
    <p>Each alternative starts after a delay, counted from the first day Taiwan's supply falls below 95 percent, then ramps linearly to a ceiling. Its capacity keeps growing after the blockade lifts, but it only runs to fill a gap: today's demand, backlog catch-up and refilling stock abroad. Their status lines are sourced; delays, ramps and ceilings are <span class="notional">notional</span>.</p>
    <h3>6. Units</h3>
    <p>Units are the daily shortfall or backlog times about 237,000 a week, Epoch AI's median estimate for 2Q26. Epoch counts chips sold, not chips made, and publishes wide uncertainty intervals around each estimate.</p>
    <h3>Scenarios <span class="notional">notional</span></h3>
    <div class="tablewrap"><table class="ptable"><thead><tr><th>Scenario</th>${LEVERS.map(L => `<th>${L.t}</th>`).join('')}<th>Default length</th></tr></thead><tbody>
      ${SCENARIOS.map(s => `<tr><td>${s.n}</td>${LEVERS.map(L => `<td>${pc(s.v[L.k])}</td>`).join('')}<td>${s.dur} days</td></tr>`).join('')}
    </tbody></table></div>
    <p>${LEVERS.map(L => `<b>${L.t}.</b> ${L.why}`).join(' ')}</p>
    <h3>Bridging assumptions</h3>
    <div class="tablewrap"><table class="ptable"><thead><tr><th>Assumption</th><th>Default</th><th>Rationale</th></tr></thead><tbody>
      ${PARAMS.map(P => `<tr><td>${P.t} ${P.src ? '' : '<span class="notional">notional</span>'}</td><td>${P.pct ? (P.v * 100).toFixed(P.dp || 0) + '%' : P.v + ' ' + P.u}</td><td>${P.why}</td></tr>`).join('')}
      ${ALTS.map(A => `<tr><td>${A.n} <span class="notional">notional</span></td><td>starts +${A.delay} d, ramps ${A.ramp} d, ceiling ${pc(A.cap)}</td><td>${A.why}</td></tr>`).join('')}
    </tbody></table></div>
    <h3>What the model leaves out</h3>
    <p>Strikes on fabs, terminals or the grid; weather; renewables are held at their 2025 share around the clock, although solar does not serve night-time fab load; grid stability limits; wafers scrapped in process; high-bandwidth memory and other parts, which the model holds at normal supply; demand falling as buyers wait; export controls that keep Chinese chips from most buyers; airlifted fuel; and differences between science parks. It is a structural model for reasoning about which link breaks first and what buys time. It does not forecast dates or totals.</p>`;

  $('basetable').innerHTML = FACTS.map(f => `<tr><td>${f.item}</td><td>${f.fig}</td><td>${srcLinks(f.src)}</td></tr>`).join('');
  $('sources').innerHTML = Object.values(SOURCES).map(s => `<li><a href="${s.u}" target="_blank" rel="noopener">${escapeHtml(s.t)}</a></li>`).join('') +
    '<li>Alternatives table status lines: ' + ALTS.map(A => `${A.n}: ${srcLinks(A.src)}`).join('. ') + '.</li>';
  $('changelog').innerHTML = CHANGELOG.map(c => `<li><b>${c.d}.</b> ${c.t}</li>`).join('');
}
