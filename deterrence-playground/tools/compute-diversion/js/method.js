// Method and sources panel, built from the data modules so the page and the data never disagree.
import { P } from '../data/params.js';
import { LEVERS } from '../data/levers.js';
import { CASES } from '../data/cases.js';
import { POLICIES, TIMELINE, UNVERIFIED, ASOF } from '../data/policies.js';
import { escapeHtml as e } from '../../../shared/js/mapkit.js';

const link = (u, t = 'source') => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;

export function methodHTML() {
  const levers = LEVERS.map(L => `<tr><th scope="row">${L.name}</th><td class="num">${L.budget || (L.id === 'agents' ? '2/level/qtr' : 0)}</td><td class="num">${L.id === 'relax' ? '+' + P.fx.relax.cap : L.capital}</td><td>${e(L.text)}</td></tr>`).join('');
  return `
  <p><b>Current as of ${ASOF}.</b> Every case card, policy card and timeline entry below was read on its official page (some via the Wayback Machine) on that date, except where a card says otherwise. The game model is not data.</p>
  <h3>What is real and what is notional</h3>
  <p><b>Real:</b> the case cards (DOJ and BIS releases), the policy cards (eCFR, Federal Register, bis.gov, Congress.gov) and the rule timeline. Charges are allegations; a defendant is presumed innocent unless convicted. Status is the latest official record found, so a case may have moved on since. Countries and hubs appear only on case cards and only where the release names them.</p>
  <p><b><span class="notional">notional</span>:</b> everything in the game itself. The hubs are lettered on purpose. "Compute units" are an abstract measure of diverted capability, not chip counts. Budget, capital, revenue, goodwill, seizure odds, lags and adaptation rules are game design chosen to make the mechanisms in the public record show up in play:</p>
  <ul>
    <li><b>Front companies and replacement.</b> Several releases describe front or pass-through buyers (Janford Realtor; purported purchasers in Thailand; "Company-1", a buyer in Southeast Asia). In the game a listed shell is usually replaced within a quarter (85% chance, minus 15 points per agent level), so listing alone becomes whack-a-mole.</li>
    <li><b>Hub shifts.</b> Releases name several transit countries for the same flows (Singapore, Malaysia, Thailand). In the game, a hub where the seizure share passes 18% loses a quarter of its volume to a cooler hub. The same 16 Nov 2026 rule adds a license requirement for Indonesia, Malaysia, Singapore, Thailand and Brazil, citing diversion risk, with an exclusion for US-headquartered consignees and end users that meet reporting requirements; in the game this is the kind of hub-level move that pushes volume to other hubs.</li>
    <li><b>Disguise.</b> Releases describe falsified paperwork, misclassified goods and dummy servers staged for inspection. The game models this as split shipments that cut seizure odds by 12% per level and throughput by 8% per level.</li>
    <li><b>Cloud.</b> Giving foreign customers remote (IaaS) access to controlled chips has generally not been an export under the EAR, and the 2024 IaaS customer-identification rule is still only proposed. On 16 Nov 2026 BIS released an interim final rule (RIN 0694-AK50) that requires a license for advanced chips going to data centers that supply more than 12,000,000 aggregate TPP to companies headquartered in D:5 or Macau. It went on Federal Register public inspection on 16 Nov 2026 (FR Doc 2026-23529), is scheduled for publication on 19 Nov 2026, and takes effect on publication. It controls the chips going into such data centers rather than each remote session. No DOJ or BIS case card here involves cloud access. The cloud route in the game is a modelling assumption that diverters substitute toward it.</li>
    <li><b>Lags.</b> Rules take time: 2 quarters for the cloud rule and 3 for location verification in the game. Real rulemakings and bills have taken far longer (see the timeline and the Chip Security Act card).</li>
    <li><b>Cooperation.</b> End-use checks abroad and hub pressure scale with allied goodwill (goodwill / 80, between 0.3 and 1.1), because checks overseas depend on host governments.</li>
  </ul>
  <div class="tablewrap"><table class="cd-ptable"><caption>Levers and their notional costs</caption><thead><tr><th scope="col">Lever</th><th scope="col">Budget</th><th scope="col">Capital</th><th scope="col">Effect in the game</th></tr></thead><tbody>${levers}</tbody></table></div>
  <p class="fine">Other notional values: demand ${P.demand0} units in quarter 1, +${P.demandGrowth} a quarter; starting hub capacities ${P.hubs.map(h => h.name + ' ' + h.cap).join(', ')}; cloud ${P.cloud0}, rising by ${P.cloudStep} (or ${P.cloudStepKyc} under a KYC rule) when physical routes are squeezed; route choice is a logit on risk with steepness ${P.beta}; random noise ±${P.noise * 100}% on seizures. The full list is in <code>data/params.js</code>; the rules are in <code>js/network.js</code> and <code>js/engine.js</code>, and <code>scripts/engine.test.mjs</code> tests them.</p>
  <h3>Policy cards</h3>
  <div class="cd-polgrid">${POLICIES.map(p => `<article class="cd-polcard"><h4>${e(p.name)}</h4><p>${e(p.what)}</p><p class="fine"><b>Legal basis:</b> ${e(p.legalBasis)}<br><b>Status:</b> ${e(p.status)}<br>${link(p.url)} · checked ${p.checked}</p></article>`).join('')}</div>
  <h3>Rule timeline</h3>
  <ol class="cd-timeline">${TIMELINE.map(t => `<li><span class="num">${t.date}</span> ${e(t.event)} ${link(t.url)}</li>`).join('')}</ol>
  <h3>Case cards (${CASES.length})</h3>
  <ul class="cd-caselist">${CASES.map(c => `<li><span class="num">${c.date}</span> <b>${e(c.title)}</b>. ${e(c.status)} ${link(c.url, 'release')}</li>`).join('')}</ul>
  <h3>Looked for, not verified, left out</h3>
  <ul class="fine">${UNVERIFIED.map(u => `<li>${e(u)}</li>`).join('')}</ul>
  <h3>Limits</h3>
  <p>The game has one diversion network and one enforcer. It leaves out foreign chipmakers, domestic Chinese chip supply, licensing workload, the courts' timeline, and the many parts of BIS and DOJ that work on other things. Collateral cost is a single notional index. The scores show how the mechanisms trade off inside this model, not what any real policy would achieve.</p>
  <h3>How to cite</h3>
  <p class="fine">Jonathan Walberg, "Diversion: a chip export enforcement game," Interactive Deterrence, jwalberg.com, ${ASOF}. Cite the case and policy cards to their official sources.</p>`;
}
