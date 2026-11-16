// Method & sources view.
import { EL_RULES, EL_BUILT, POLICY, CASES, CASES_CHECKED, ESTIMATES, METRICS, EST_CHECKED, GRADE_INFO, SECTORS, esc, fmtDate } from './common.js';

export function renderMethod(root) {
  const elTot = EL_RULES.reduce((a, r) => a + r.cnRel, 0);
  root.innerHTML = `<div class="card prose">
  <h2>Method &amp; sources</h2>
  <p>This tool asks one question of each data point on China's access to AI compute: how good is the evidence? It has three datasets, each checked against primary sources on the dates shown.</p>

  <h3>1. Entity List additions (${EL_RULES.length} rules, ${elTot} PRC entries)</h3>
  <p><b>Source.</b> Federal Register API v1 (federalregister.gov), every Bureau of Industry and Security final rule published Oct. 1, 2022 to Nov. 16, 2026 whose text mentions the Entity List, and each rule's full-text XML. Built ${esc(fmtDate(EL_BUILT))} by <code>scripts/build_entity_list.py</code>, which anyone can re-run.</p>
  <p><b>Counting.</b> Each rule amends Supplement No. 4 to part 744 with a table. A new entry cites only the rule that adds it; a revised entry also cites earlier rules. The builder counts new entries under each destination heading. The China heading includes Hong Kong addresses, which BIS lists under China; the builder flags an entry when one of its addresses ends in Hong Kong or Kowloon (place names such as the Shenzhen-Hong Kong International Hi-Tech Park do not count). Some flagged entries also list mainland addresses. Counts are entries, not unique companies: one firm listed under two destinations is two entries. For every rule the builder compares its count with the total the rule states in its summary. The ten rules shown match except where noted in each rule's detail panel.</p>
  <p><b>Scope and sector coding.</b> A rule is shown if it added at least one entity whose stated reason ties it to ${SECTORS.map(s => s.n.toLowerCase()).join(', ')}. The sector comes from the paragraph in which the End-User Review Committee explains each group of additions, coded by hand in the builder's <code>GROUPS</code> table with the reason paraphrased. Keyword matching was tried and rejected: it swept in Hong Kong and Shenzhen distributors listed for supplying U.S. chips to Russia's military, quantum research institutes, and hypersonics suppliers. Those are excluded on purpose because they are not about China's own compute. The March 2023 group (Inspur Group, Loongson, the National Research Center for Parallel Computer Engineering and Technology and three others) is coded as computing although that rule cites only military modernization; BIS's March 2025 rule describes Inspur Group as China's leading cloud computing and big data provider.</p>
  <p><b>Gap.</b> No rule from Oct. 10, 2025 through Nov. 16, 2026 added PRC entities. The three Entity List rules in that window only removed entries or addresses (FR Docs. 2025-19858, 2026-17230 and 2026-17231). The September 2025 affiliates rule would have extended listings to firms at least 50 percent owned by listed parties; it was suspended in November 2025 and the suspension now runs through Jan. 10, 2027. The Unverified List and the Military End-User List are not counted.</p>

  <h3>2. Enforcement and diversion cases (${CASES.length})</h3>
  <p><b>Source.</b> U.S. Department of Justice press releases (justice.gov) and BIS enforcement releases. Each case links the releases used; later releases (plea, verdict, sentence, dismissal) set the status. Status checked ${esc(fmtDate(CASES_CHECKED))}. Where no later release was found, the status is the last one published, and the detail panel says so.</p>
  <p><b>Language.</b> A complaint or indictment states allegations. The tool labels those cases as allegations and lists only what the release alleges: items, routes and values. Summaries are written for this tool; quotes from releases are official text under 300 characters.</p>
  <p><b>Scope.</b> Advanced AI chips (and servers containing them) and chipmaking tools or technology bound for the PRC, Hong Kong or Macau, directly or through third countries. Cases about Russia or Iran military parts are excluded unless they involve advanced chips or tools for China.</p>
  <p><b>Gaps.</b> justice.gov blocks automated access, so DOJ releases were read through Web Archive copies of the same pages. Cases were found by searching and by paging DOJ's press-release listing by title, so a case whose headline names no chip, AI, semiconductor or China terms may be missing. Releases from Oct. 2022 to July 2023 were screened by title only. Several cases have no release after the charging announcement; their detail panels say whether the status was re-checked. One status (a guilty plea in the S.D.N.Y. server case) rests on a press report because no DOJ release was found. Cases decided before Oct. 2022 are out of window.</p>

  <h3>3. Capacity estimates (${ESTIMATES.length} estimates, ${METRICS.length} metrics)</h3>
  <p><b>Source.</b> Each estimate was located on a public page and checked against it on or before ${esc(fmtDate(EST_CHECKED))}. When a figure comes from a paywalled report, the tool cites the public statement that reports it and says so under "How the figure reaches the public".</p>
  <p><b>Grades.</b></p>
  <table><thead><tr><th>Grade</th><th>Kind of source</th><th>Estimates</th></tr></thead><tbody>
  ${Object.entries(GRADE_INFO).map(([g, i]) => `<tr><td><span class="gtag g-${g}">${g}</span></td><td><b>${esc(i.n)}.</b> ${esc(i.d)}.</td><td class="num">${ESTIMATES.filter(e => e.grade === g).length}</td></tr>`).join('')}
  </tbody></table>
  <p>A grade describes the source, not the truth of the number. An official statement can repeat an analyst figure (the detail panel notes this where known), and a press report can prove right. The grade filter lets readers see how much of a range rests on each kind of evidence.</p>
  <p><b>Ranges.</b> For each metric and period, the band runs from the lowest low to the highest high among the sources switched on. The tick marks the median of source midpoints. A point estimate is a source whose low equals its high. Official figures that repeat an analyst or press estimate are marked ↺ and are left out by default, so the range uses independent observations; a switch adds them back. Upper bounds ("at or below") are plotted at the bound and marked ‹. Estimates in a different unit from the period's main unit are listed under the chart and not placed on the axis. The axis is logarithmic because estimates differ by orders of magnitude. The math is in <code>js/range.js</code> with tests in <code>scripts/range.test.mjs</code>.</p>

  <h3>4. Rule changes on the timeline (${POLICY.length})</h3>
  <p>Federal Register abstracts fetched Nov. 16, 2026, and the BIS May 13, 2025 press release and General Prohibition 10 guidance. Each is paraphrased and linked.</p>

  <h3>How to cite</h3>
  <p class="cite">Walberg, Jonathan. "China Compute Tracker." Interactive Deterrence, jwalberg.com. Data current as of Nov. 16, 2026.</p>

  <h3>Every source</h3>
  <table><thead><tr><th>Item</th><th>Source</th></tr></thead><tbody>
  ${EL_RULES.map(r => `<tr><td>${esc(fmtDate(r.date))} Entity List rule</td><td class="src"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.cite)}</a></td></tr>`).join('')}
  ${POLICY.map(p => `<tr><td>${esc(fmtDate(p.date))} ${esc(p.t)}</td><td class="src">${p.src.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join('<br>')}</td></tr>`).join('')}
  ${CASES.map(c => `<tr><td>${esc(fmtDate(c.date))} ${esc(c.title)}</td><td class="src">${c.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('<br>')}</td></tr>`).join('')}
  ${ESTIMATES.map(e => `<tr><td>${esc(e.metric)} · ${esc(e.source)} (${e.grade})</td><td class="src"><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.publisher || e.source)}, ${esc(fmtDate(e.date))}</a></td></tr>`).join('')}
  </tbody></table>
  </div>`;
}
