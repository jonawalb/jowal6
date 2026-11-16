// Decision model for "Does This Chip Need a License?"
// Pure functions, no DOM. Imported by app.js and by scripts/model.test.mjs.
//
// Formula and thresholds: ECCN 3A090, Technical Note 2 to 3A090.a and 3A090.b, and Note 2,
// 15 CFR part 774 supp. 1 (eCFR text current through 12 Nov 2026).
// License requirements: 15 CFR 742.6(a)(6)(iii), 744.23(a)(3), 740.8, 744.11, 744.21, 744.22, 746.8.
// Review policy: 742.6(b)(10)(iii), 744.23(d). Enforcement: BIS guidance of 13 May 2025 and 31 May 2026,
// and the enforcement statement in 91 FR 43034 (14 Jul 2026).

import { GROUPS } from '../data/groups.js';

export const T = {
  A_TPP: 4800, A_TPP_LOW: 1600, A_PD: 5.92,
  B1_TPP: 2400, B1_PD: 1.6, B2_PD: 3.2,
  CHINA_CBC_TPP: 21000, CHINA_CBC_BW: 6500,
};

// ---------- 1. Arithmetic ----------

// 'TPP' = 2 x 'MacTOPS' x bit length. Datasheets report 2 x MacTOPS as TOPS/TFLOPS (Tech. Note 2, 1.b),
// so TPP = dense TOPS x bit length. Where a chip has several precisions, the highest TPP counts (Tech. Note 2, 2).
export function tppOf(rows) {
  let best = null;
  for (const r of rows || []) {
    const tops = Number(r.tops), bits = Number(r.bits);
    if (!(tops > 0) || !(bits > 0)) continue;
    const v = tops * bits;
    if (best === null || v > best.tpp) best = { tpp: v, tops, bits, label: r.label || '' };
  }
  return best;
}

// 'Performance density' = TPP / 'applicable die area' (mm2) (Tech. Note 2, 4).
export function pdOf(tpp, areaMm2) {
  const a = Number(areaMm2);
  if (!(tpp > 0) || !(a > 0)) return null;
  return tpp / a;
}

// ---------- 2. Classification ----------

// Returns { para: 'a' | 'b' | 'none' | 'unknown', clause, why }
export function classify({ tpp, pd, datacenter }) {
  if (!(tpp >= 0)) return { para: 'unknown', clause: '', why: 'No TPP entered.' };
  const hasPd = pd !== null && pd !== undefined && Number.isFinite(pd);
  if (!datacenter && tpp < T.A_TPP) {
    return { para: 'none', clause: 'Note 2', why: 'Not designed or marketed for datacenters and TPP below 4800, so Note 2 to 3A090.a and .b excludes it.' };
  }
  if (tpp >= T.A_TPP) return { para: 'a', clause: 'a.1', why: 'TPP of 4800 or more.' };
  if (tpp < T.A_TPP_LOW) return { para: 'none', clause: '', why: 'TPP below 1600, the lowest threshold in 3A090.a and .b.' };
  if (!hasPd) return { para: 'unknown', clause: '', why: 'TPP is between 1600 and 4800, so the result turns on performance density. Enter the die area.' };
  if (pd >= T.A_PD) return { para: 'a', clause: 'a.2', why: 'TPP of 1600 or more and performance density of 5.92 or more.' };
  if (tpp >= T.B1_TPP && pd >= T.B1_PD) return { para: 'b', clause: 'b.1', why: 'TPP of 2400 to under 4800 and performance density of 1.6 to under 5.92.' };
  if (pd >= T.B2_PD) return { para: 'b', clause: 'b.2', why: 'TPP of 1600 or more and performance density of 3.2 to under 5.92.' };
  return { para: 'none', clause: '', why: 'Below every 3A090.a and .b threshold pair.' };
}

// ---------- 3. Destinations ----------

export function groupsOf(country) {
  if (country === 'Hong Kong') return GROUPS['China (PRC)'] || [];
  return GROUPS[country] || [];
}
export const has = (country, g) => groupsOf(country).includes(g);
// D:1, D:4 or D:5, excluding destinations also in A:5 or A:6: the pre-2025 destination scope that BIS enforces.
export function inD145(country) {
  const g = groupsOf(country);
  return (g.includes('D:1') || g.includes('D:4') || g.includes('D:5')) && !g.includes('A:5') && !g.includes('A:6');
}
export const isChinaOrMacau = (c) => c === 'China (PRC)' || c === 'Hong Kong' || c === 'Macau';
export const isD5orMacau = (c) => c === 'Macau' || has(c, 'D:5');

const EMBARGO = {
  'Russia': 'russia', 'Belarus': 'russia',
  'Cuba': 'other', 'Iran': 'other', 'Korea, North': 'other', 'Syria': 'other',
};

// ---------- 4. The walk ----------

const C = (label, url) => ({ label, url });
const ECFR = (sec) => `https://www.ecfr.gov/current/title-15/section-${sec}`;
const CCL3 = 'https://www.ecfr.gov/current/title-15/part-774/appendix-Supplement%20No.%201%20to%20Part%20774';
const GRP = 'https://www.ecfr.gov/current/title-15/part-740/appendix-Supplement%20No.%201%20to%20Part%20740';
const SUPP8 = 'https://www.ecfr.gov/current/title-15/part-740/appendix-Supplement%20No.%208%20to%20Part%20740';
const UAE_FR = 'https://www.federalregister.gov/documents/2026/07/14/2026-14132/enhanced-favorable-treatment-for-the-united-arab-emirates-under-the-export-administration';
const JAN26 = 'https://www.federalregister.gov/documents/2026/01/15/2026-00789/revision-to-license-review-policy-for-advanced-computing-commodities';
const MAY25 = 'https://www.bis.gov/press-release/department-commerce-announces-rescission-biden-era-artificial-intelligence-diffusion-rule-strengthens';
const MAY26 = 'https://www.bis.gov/media/documents/bis-guidance-may-31-2026.pdf';
const GP10 = 'https://www.bis.gov/media/1575';
const IAAS = 'https://www.bis.gov/media/1577';
const HK = 'https://www.federalregister.gov/documents/2020/12/23/2020-28101/removal-of-hong-kong-as-a-separate-destination-under-the-export-administration-regulations';
const NV8K = 'https://www.sec.gov/Archives/edgar/data/1045810/000104581025000082/nvda-20250409.htm';
const NV10K = 'https://www.sec.gov/Archives/edgar/data/1045810/000104581026000021/nvda-20260125.htm';
const AFFIL = 'https://www.federalregister.gov/documents/2026/11/09/2026-22793/extension-of-the-suspension-of-expansion-of-end-user-controls-for-affiliates-of-certain-listed';
const PROC = 'https://www.federalregister.gov/documents/2026/01/20/2026-01052/adjusting-imports-of-semiconductors-semiconductor-manufacturing-equipment-and-their-derivative';
const AK50 = 'https://www.bis.gov/media/documents/rin-0694-ak50.pdf';
const SUPP2_748 = 'https://www.ecfr.gov/current/title-15/part-748/appendix-Supplement%20No.%202%20to%20Part%20748';
const NEW = (label) => C(`${label} (RIN 0694-AK50)`, AK50);

// Destinations added by the 16 Nov 2026 rule, § 742.6(a)(6)(iii)(A)(1) as revised.
export const AK50_FIVE = ['Indonesia', 'Malaysia', 'Singapore', 'Brazil', 'Thailand'];
export const AK50_DC_TPP = 12000000;

export const RULESETS = {
  current: 'Current rules (eCFR, amended through 9 Nov 2026)',
  ak50: 'Rule released 16 Nov 2026 (RIN 0694-AK50; takes effect on Federal Register publication)',
};

// Outcome codes, least to most restrictive.
export const OUTCOMES = {
  nlr: { label: 'No license required', s: 'good', rank: 0 },
  nle: { label: 'No license enforced', s: 'good', rank: 1 },
  exc: { label: 'License exception available', s: 'good', rank: 2 },
  lic: { label: 'License required', s: 'warn', rank: 3 },
  cbc: { label: 'License required: case-by-case review', s: 'warn', rank: 4 },
  poa: { label: 'License required: presumption of approval', s: 'warn', rank: 3 },
  pod: { label: 'License required: presumption of denial', s: 'bad', rank: 5 },
  pro: { label: 'Prohibited in practice', s: 'bad', rank: 6 },
  out: { label: 'Outside this model', s: 'neutral', rank: -1 },
};

/**
 * input = {
 *   rules: 'current' | 'ak50',
 *   chip: { tpp, pd, datacenter, dramBw, form: 'ic'|'computer', override?: 'h20'|'prc3a090', designerD5, name },
 *   origin: 'us' | 'fdp' | 'foreign', shipFrom: 'us' | 'abroad',
 *   dest, hqD5: bool, usHq: bool (U.S.-HQ consignee reporting under § 743.10; new rule only),
 *   dc: 'no' | 'yes' | 'recommender' (data center giving >12M aggregate TPP to D:5/Macau-HQ companies; new rule only),
 *   endUser: 'commercial'|'cloud'|'entity'|'meu'|'mieu'|'uaeok', certs: bool
 * }
 * returns { outcome, title, detail, steps: [{ n, title, text, cites, verdict, flag }], cls, intricate, cites }
 */
export function decide(input) {
  const { chip, origin, shipFrom, dest, hqD5, endUser, certs } = input;
  const ak = input.rules === 'ak50';
  const steps = [];
  const add = (title, text, cites, verdict = 'pass', flag = '') => steps.push({ n: steps.length + 1, title, text, cites, verdict, flag });
  const done = (outcome, detail, extra = {}) => ({ outcome, title: OUTCOMES[outcome].label, detail, steps, rules: ak ? 'ak50' : 'current', ...extra });
  const ecPrefix = chip.form === 'computer' ? '4A090' : '3A090';
  const hkNote = dest === 'Hong Kong' ? ' Hong Kong is treated as part of China under the EAR.' : '';
  const hkCite = dest === 'Hong Kong' ? [C('85 FR 83765 (Hong Kong)', HK)] : [];
  const gp10Risk = chip.override === 'prc3a090' || chip.designerD5;

  // Step 1: classification
  let cls;
  if (chip.override === 'h20') {
    cls = { para: 'none', clause: '', why: 'NVIDIA has not published H20 performance figures, so this tool cannot compute its TPP.' };
    add('Classify the chip', 'NVIDIA publishes no datasheet figures for the H20, so its TPP and performance density cannot be computed here. Its license requirement for China came from a direct notice to NVIDIA, not from the 3A090 thresholds.', [C('ECCN 3A090, Tech. Note 2', CCL3)], 'info');
  } else if (chip.override === 'prc3a090') {
    cls = { para: 'a?', clause: '', why: 'BIS guidance names this chip as a "PRC 3A090 IC".' };
    add('Classify the chip', 'Huawei publishes no official datasheet for these parts. BIS guidance of 13 May 2025 lists the Ascend 910B, 910C and 910D as "PRC 3A090 ICs" presumptively subject to General Prohibition 10. The guidance does not say which 3A090 paragraph applies.', [C('BIS GP10 guidance, 13 May 2025', GP10)], 'info');
  } else {
    cls = classify(chip);
    const pdTxt = chip.pd == null ? 'not entered' : chip.pd.toFixed(2);
    const head = `TPP ${fmt(chip.tpp)}, performance density ${pdTxt}, ${chip.datacenter ? 'designed or marketed for datacenters' : 'not designed or marketed for datacenters'}.`;
    if (cls.para === 'unknown') {
      add('Classify the chip', `${head} ${cls.why}`, [C('ECCN 3A090.a-.b', CCL3)], 'stop');
      return done('out', 'The 3A090 paragraph cannot be settled without the applicable die area. Enter the area of all logic dies made on a non-planar (FinFET or GAA) process.' + (gp10Risk ? ' If the chip is in 3A090, BIS\'s GP10 guidance on chips designed by D:5- or Macau-headquartered companies applies.' : ''), { cls, cites: gp10Risk ? [C('BIS GP10 guidance, 13 May 2025', GP10)] : [] });
    }
    if (cls.para === 'none') {
      add('Classify the chip', `${head} ${cls.why} The item is not in ${ecPrefix}.`, [C('ECCN 3A090, Notes 2 and 4', CCL3)], 'pass');
    } else {
      const ec = `${ecPrefix}.${cls.para}`;
      add('Classify the chip', `${head} ${cls.why} That places the chip in 3A090.${cls.clause}${chip.form === 'computer' ? `, and a computer, board or server containing it in ${ec}` : ''}.${ak ? ' The 16 Nov 2026 rule leaves the thresholds unchanged.' : ''}`, [C(`ECCN 3A090.${cls.para}`, CCL3)].concat(chip.form === 'computer' ? [C('ECCN 4A090', CCL3)] : []), 'flag', ec);
    }
  }

  // GP10 for PRC-designed 3A090 chips: applies whether the chip was made inside or outside the PRC
  if (gp10Risk && cls.para !== 'none') {
    add('General Prohibition 10', 'BIS says 3A090 chips designed by companies headquartered in D:5 or Macau, whether produced within or outside the PRC, are likely subject to the EAR and likely made in violation of it. Selling, transferring, using or servicing them without BIS authorization risks violating General Prohibition 10. Parties should confirm that authorizations exist for the design-to-fab and fab-to-designer transfers.', [C('BIS GP10 guidance, 13 May 2025', GP10), C('§ 736.2(b)(10)', ECFR('736.2'))], 'stop', 'GP10');
    return done('pro', 'Dealing in the chip anywhere risks a GP10 violation unless BIS authorized the transfers that produced it. BIS will not pursue enforcement against parties that obtain a chip solely for technical analysis or evaluation.', { cls });
  }

  // Step 2: subject to the EAR?
  if (origin === 'us') {
    add('Is it subject to the EAR?', 'U.S.-origin items are subject to the EAR wherever they are located.', [C('§ 734.3(a)', ECFR('734.3'))], 'pass');
  } else if (origin === 'fdp') {
    if (cls.para === 'none') {
      add('Is it subject to the EAR?', 'The advanced computing foreign direct product rule only reaches foreign-made items that are themselves in 3A090, 4A090 or the listed .z ECCNs. Other FDP rules (Entity List footnotes 1 and 4, Russia/Belarus) and de minimis can still apply.', [C('§ 734.9(h)(1)', ECFR('734.9')), C('§ 734.9(e)', ECFR('734.9')), C('§ 734.4 (de minimis)', ECFR('734.4'))], 'info');
    } else {
      add('Is it subject to the EAR?', `A foreign-made 3A090 or 4A090 item meets the product scope if it is the direct product of listed software or technology subject to the EAR, or is made by a plant (or major component of one) that is itself the direct product of listed U.S.-origin software or technology. The destination scope as written since January 2025 is any location worldwide; before that it was D:1, D:4, D:5 and D:5-headquartered parties. This tool assumes you have confirmed the product scope.${ak ? ' Under the 16 Nov 2026 rule, front-end fabs and OSATs also need a license for applicable advanced logic ICs in 3A090.a designed by companies that are neither approved nor authorized IC designers (new § 744.23(a)(3)(i)(C)); that path is not modeled.' : ''}`, [C('§ 734.9(h)', ECFR('734.9'))].concat(ak ? [NEW('§ 744.23(a)(3)(i)(C)')] : []), 'flag', 'FDP');
    }
  } else {
    add('Is it subject to the EAR?', 'A foreign-made item with no U.S. nexus is outside the EAR. The nexus questions this tool does not compute are de minimis U.S. content and the foreign direct product rules, which reach most chips fabricated with U.S.-origin tools or design software.', [C('§ 734.3', ECFR('734.3')), C('§ 734.4', ECFR('734.4')), C('§ 734.9', ECFR('734.9'))], 'stop');
    return done('out', 'Whether a foreign-made chip is subject to the EAR is a fact question about its production. If it is not, U.S. export licensing does not apply. Choose "Made abroad with U.S. technology" to see the analysis if a foreign direct product rule applies.', { cls });
  }

  // Step 3: embargoes
  const emb = EMBARGO[dest];
  if (emb === 'russia') {
    add('Embargoes and sanctions', `${dest} is subject to § 746.8: a license is required for any item on the CCL, and applications are reviewed under a policy of denial with narrow case-by-case exceptions.`, [C('§ 746.8(a)(1), (b)(3)', ECFR('746.8'))], 'stop');
    return done('pro', `License required for ${dest}; policy of denial.`, { cls });
  }
  if (emb === 'other') {
    const sec = { 'Cuba': '746.2', 'Iran': '746.7', 'Korea, North': '746.4', 'Syria': '746.9' }[dest];
    add('Embargoes and sanctions', `${dest} is covered by a country program in part 746 of the EAR, and in some cases by Treasury (OFAC) sanctions. This tool does not model those programs.`, [C(`§ ${sec}`, ECFR(sec))], 'stop');
    return done('out', `See § ${sec} and OFAC. Country embargo rules decide this case, not the advanced computing rules.`, { cls });
  }
  add('Embargoes and sanctions', `${dest} is not under a part 746 country embargo.`, [C('Part 746', 'https://www.ecfr.gov/current/title-15/part-746')], 'pass');

  // H20: direct notice, not codified
  if (chip.override === 'h20') {
    if (isD5orMacau(dest) || dest === 'Hong Kong' || dest === 'China (PRC)' || hqD5) {
      add('Check for a direct notice', 'On 9 April 2025 the U.S. government told NVIDIA that a license is required to export the H20, and any chip matching its memory bandwidth, interconnect bandwidth or both, to China (including Hong Kong and Macau) and D:5 countries, or to companies headquartered there, citing the risk of use in a supercomputer in China. NVIDIA reports that licenses for certain China customers were granted from August 2025, that U.S. officials expected 15% or more of licensed revenue, and that no regulation codified that expectation.', [C('NVIDIA Form 8-K, 15 Apr 2025', NV8K), C('NVIDIA Form 10-K, FY2026', NV10K), C('§ 744.23(b) (notices)', ECFR('744.23'))], 'flag', 'notice');
      return done('lic', 'License required by a notice to NVIDIA rather than by the published CCL thresholds. The notice text is not public, so its review policy is not modeled here.', { cls, intricate: true });
    }
    add('Check for a direct notice', 'The April 2025 notice NVIDIA disclosed covers China, Hong Kong, Macau, D:5 countries and companies headquartered there. This destination is outside that scope.', [C('NVIDIA Form 8-K, 15 Apr 2025', NV8K)], 'pass');
    return done('out', 'No published 3A090 classification and no disclosed notice covers this case. Classification of the H20 for other destinations rests with NVIDIA and BIS.', { cls });
  }

  if (cls.para === 'none') {
    add('Other controls', 'Outside 3A090 and 4A090, the item may fall under another ECCN (for example 3A991, 4A994 or 5A992) or be EAR99. BIS can also impose a license requirement by direct notice, as it did for the NVIDIA H20 in April 2025.', [C('CCL Category 3', CCL3), C('§ 744.23(b)', ECFR('744.23'))], 'info');
    return done('out', 'Not an advanced computing item on these figures. Its other classification and any end-use controls decide the answer.', { cls });
  }
  const para = cls.para === 'a?' ? 'a' : cls.para;
  const ec = `${ecPrefix}.${para}`;
  const dcA = para === 'a' && chip.datacenter;

  // Step 4: end user screens (part 744)
  if (endUser === 'entity') {
    add('End user: Entity List', 'A license is required to the extent the entry says, usually for all items subject to the EAR. License exceptions are unavailable unless the entry allows them, and the review policy is the one stated in the entry. The 50 percent affiliates rule (90 FR 47201) is suspended until 10 January 2027.', [C('§ 744.11(a)', ECFR('744.11')), C('Entity List, supp. 4 to part 744', 'https://www.ecfr.gov/current/title-15/part-744/appendix-Supplement%20No.%204%20to%20Part%20744'), C('91 FR 70789', AFFIL)], 'stop', 'Entity List');
    return done('lic', 'License required. Review policy is set in the Entity List entry, and many entries carry a presumption of denial. Read the entry.', { cls });
  }
  if (endUser === 'mieu') {
    add('End user: military-intelligence', 'A license is required for any item subject to the EAR when you know it is for a military-intelligence end use or end user of Belarus, Burma, Cambodia, China, Russia, Venezuela, or an E:1/E:2 country. Review is a presumption of denial. U.S. persons also need a license to support such end users.', [C('§ 744.22(a), (e)', ECFR('744.22')), C('§ 744.6(b)(5)', ECFR('744.6'))], 'stop', 'MIEU');
    return done('pod', 'License required under § 744.22, reviewed with a presumption of denial.', { cls });
  }
  if (endUser === 'meu') {
    add('End user: military', '§ 744.21 adds a license requirement for Chinese, Burmese, Cambodian, Nicaraguan and Venezuelan military end users only for items listed in supp. 2 to part 744. 3A090 and 4A090 are not listed there; 5A992 is. For Russian and Belarusian military end users it covers every item. The January 2026 case-by-case path for China is closed to military end uses.', [C('§ 744.21(a), (e)', ECFR('744.21')), C('Supp. 2 to part 744', 'https://www.ecfr.gov/current/title-15/part-744/appendix-Supplement%20No.%202%20to%20Part%20744'), C('91 FR 1684 (dd)(1)(iv)', JAN26)], 'flag', 'MEU');
  }
  if (endUser === 'cloud' && !ak) {
    add('End user: cloud or IaaS provider', 'The license requirements in this tool attach to exports, reexports and transfers of the hardware. Remote access by the provider\'s customers is not separately controlled in the current text. BIS has warned that supplying chips to an IaaS provider that will train models for parties headquartered in D:5 or Macau can trigger part 744 controls when there is "knowledge" of a WMD or military-intelligence end use.', [C('BIS policy statement, 13 May 2025', IAAS)], 'info');
  }

  // New rule: data center end-use control, § 744.24
  let dcReq = false;
  if (ak) {
    if (input.dc === 'yes') {
      dcReq = true;
      add('Data center serving D:5 companies (§ 744.24)', `A license is required for any ${ecPrefix} item (and the listed .z items) when you know it is destined to a data center anywhere that provides, or will provide, more than 12,000,000 aggregate TPP, at one site or through linked data centers, to companies headquartered in D:5 or Macau. No license exception overcomes it. Review is case-by-case. A data center that was already serving such companies must obtain a license within 90 days of the rule's effective date to keep doing so.`, [NEW('§ 744.24(a)(1), (b), (c)')], 'stop', '744.24');
    } else if (input.dc === 'recommender') {
      add('Data center serving D:5 companies (§ 744.24)', 'The § 744.24 prohibition does not apply when the compute access is only for a commercial recommender system (ranking or suggesting products, services or content, and not generating content), provided the company, the aggregate TPP and the due diligence are reported to BIS. Caveat: the preamble says such operators "may continue providing these services for 90 days, but must obtain a license" after that, so the rule is internally inconsistent; this tool follows the regulatory text.', [NEW('§ 744.24(b)(2), (d)(1)'), NEW('preamble, p. 13')], 'flag', 'recommender');
    } else {
      add('Data center serving D:5 companies (§ 744.24)', 'You have no knowledge that the item is going to a data center that gives D:5- or Macau-headquartered companies more than 12,000,000 aggregate TPP. Exporters are expected to obtain the data center\'s know-your-customer diligence; a refusal to provide it is a red flag. If the end use later changes, the recipient must be told a BIS authorization is required.', [NEW('§ 744.24(a)(1) Note 3, (e)')], 'pass');
    }
  }

  const ccl = ak ? cclNew() : cclCurrent();
  if (!dcReq) return ccl;
  // Combine: § 744.24 license (case-by-case, no exceptions) with the CCL result.
  if (ccl.outcome === 'pod' || ccl.outcome === 'pro') return ccl;
  return { ...ccl, outcome: 'cbc', title: OUTCOMES.cbc.label, detail: `License required under § 744.24 (case-by-case; no license exceptions). Without the data center end use the result would be: ${OUTCOMES[ccl.outcome].label.toLowerCase()}.` };

  // ---------- CCL requirement, current text ----------
  function cclCurrent() {
    const uae = dest === 'United Arab Emirates';
    const uaeOk = uae && endUser === 'uaeok';
    const destScope = inD145(dest);
    let reqWhy = '', reqCites;
    if (para === 'a') {
      reqCites = [C('§ 742.6(a)(6)(iii)(A)', ECFR('742.6')), C('91 FR 43034 (enforcement)', UAE_FR), C('BIS guidance, 31 May 2026', MAY26)];
      if (uaeOk && !hqD5) {
        add('License requirement on the CCL', `${ec} items are license-free for the UAE government and the companies in supp. 8 to part 740 (G42, Core42, and listed U.S. AI companies and their subsidiaries) when they are the ultimate consignee and all end users, under supp. 8 and BIS's stated enforcement policy (91 FR 43034). § 742.6(a)(6)(iii)(A) itself has no UAE exception.`, [C('Supp. 8 to part 740', SUPP8)].concat(reqCites), 'pass');
        return done('nlr', 'No license required for an approved UAE recipient. Part 744 end-use and end-user controls still apply.', { cls, intricate: true });
      }
      if (destScope || uae || hqD5) {
        reqWhy = hqD5 && !destScope
          ? `The end user or its ultimate parent is headquartered in D:5 or Macau. BIS enforces the ${ec} license requirement for such entities wherever they are located (a requirement dating to November 2023).`
          : uae ? `BIS continues to enforce the ${ec} license requirement for the UAE except for approved recipients in supp. 8 to part 740.`
            : `${dest} is in Country Group ${groupsOf(dest).filter(g => g.startsWith('D')).join(', ')} and not in A:5 or A:6. BIS enforces the ${ec} license requirement there.${hkNote}`;
      } else {
        const aca = dcA ? '' : ' As written, License Exception ACA covers this item; BIS does not enforce the requirement in any case.';
        add('License requirement on the CCL', `As written since January 2025, ${ec} needs a license to every destination worldwide. BIS announced on 13 May 2025 that it would not enforce the AI Diffusion rule, and in July 2026 stated that it enforces this requirement only for D:1, D:4 and D:5 destinations (excluding A:5/A:6), the UAE, and entities headquartered in D:5 or Macau. ${dest} is none of these.${aca}`, reqCites.concat([C('BIS press release, 13 May 2025', MAY25)]), 'flag', 'not enforced');
        return done('nle', `The regulation text requires a license, but BIS has said it is not enforcing that requirement for ${dest}. GAO found in May 2026 that the non-enforcement announcement is itself a rule under the Congressional Review Act. BIS released a rule formally rescinding the Diffusion framework on 16 Nov 2026; it takes effect on Federal Register publication.`, { cls, intricate: true });
      }
    } else {
      reqCites = [C('§ 742.6(a)(6)(iii)(B)', ECFR('742.6')), C('§ 744.23(a)(3)(i)(A)', ECFR('744.23'))];
      if (uaeOk && !hqD5) {
        add('License requirement on the CCL', `${ec} needs a license for the UAE, except when the ultimate consignee and all end users are approved recipients in supp. 8 to part 740.`, [C('Supp. 8 to part 740', SUPP8)].concat(reqCites), 'pass');
        return done('nlr', 'No license required for an approved UAE recipient. Part 744 controls still apply.', { cls });
      }
      if (destScope || uae) reqWhy = uae ? `${ec} needs a license for the UAE (the July 2026 rule kept this requirement after moving the UAE to A:5).` : `${ec} needs a license to D:1, D:4 and D:5 destinations not also in A:5 or A:6. ${dest} is in ${groupsOf(dest).filter(g => g.startsWith('D')).join(', ')}.${hkNote}`;
      else if (hqD5) reqWhy = `The end user or its parent is headquartered in D:5 or Macau, so § 744.23(a)(3)(i)(A) requires a license for ${ec} items even outside D:1, D:4 and D:5.`;
      else {
        add('License requirement on the CCL', `${ec} needs a license only to D:1, D:4 and D:5 destinations not also in A:5 or A:6, the UAE, and D:5- or Macau-headquartered entities. ${dest} is none of these.`, reqCites.concat([C('Country Groups', GRP)]), 'pass');
        return done('nlr', 'No license required under the advanced computing rules. Check part 744 end-use controls and the Entity List for the actual parties.', { cls });
      }
    }
    add('License requirement on the CCL', reqWhy, reqCites.concat(hkCite), 'flag', 'license');
    const ex = exceptions(); if (ex) return ex;
    const d5 = isD5orMacau(dest) || dest === 'Hong Kong';
    if (d5 || hqD5) return chinaReview(C('§ 742.6(b)(10)(iii)(A)(1)', ECFR('742.6')), C('§ 744.23(d)(1)', ECFR('744.23')));
    add('Review policy', `The current text reviews ${ec} applications for most destinations with a presumption of approval up to a per-country allocation (790,000,000 TPP for 2025-2027), a provision of the AI Diffusion rule. BIS has not said how it reviews these applications while that rule is unenforced. Before 2025 the policy for destinations outside D:5 and Macau was a presumption of approval. The 16 Nov 2026 rule sets a presumption of approval once it takes effect.`, [C('§ 742.6(b)(10)(iii)(B)', ECFR('742.6')), C('90 FR 4544 (AI Diffusion)', 'https://www.federalregister.gov/documents/2025/01/15/2025-00636/framework-for-artificial-intelligence-diffusion')], 'flag', 'unsettled');
    return done('lic', 'License required. The review policy in force is unsettled; the pre-2025 policy for these destinations was favorable.', { cls, intricate: true });
  }

  // ---------- CCL requirement, 16 Nov 2026 rule ----------
  function cclNew() {
    const uae = dest === 'United Arab Emirates';
    const five = AK50_FIVE.includes(dest);
    const destScope = inD145(dest);
    const cites = [NEW('§ 742.6(a)(6)(iii)(A)(1)-(2)'), NEW('§ 744.23(a)(3)(i)(A)')];
    let reqWhy;
    if (uae && endUser === 'uaeok' && !hqD5) {
      add('License requirement on the CCL', `The revised § 742.6(a)(6)(iii)(A)(2) requires a license for the UAE except when the ultimate consignee and all end users are approved entities in supp. 8 to part 740. The rule writes that exception into the paragraph itself and drops the separate .a/.b split.`, [NEW('§ 742.6(a)(6)(iii)(A)(2)'), C('Supp. 8 to part 740', SUPP8)], 'pass');
      return done('nlr', 'No license required for an approved UAE recipient. Part 744 controls, including the new § 744.24, still apply.', { cls });
    }
    if (five && !hqD5 && input.usHq) {
      add('License requirement on the CCL', `${dest} is one of the five destinations the rule adds (Indonesia, Malaysia, Singapore, Brazil, Thailand). The requirement does not apply when the ultimate consignee or end user, or its ultimate parent, is headquartered in the United States and the exporter files the monthly reports in new § 743.10 (parties, ultimate parent, destination, ECCN, SKU, TPP, quantity, date).`, [NEW('§ 742.6(a)(6)(iii)(A)(1), Note 1'), NEW('§ 743.10')], 'pass', '743.10');
      return done('nlr', 'No license required for a U.S.-headquartered recipient, provided the § 743.10 reports are filed.', { cls });
    }
    if (five || destScope || uae) {
      reqWhy = five ? `${dest} is one of the five destinations the rule adds for every 3A090 (except .c), 4A090 and .z item, citing diversion risk.`
        : uae ? `The revised paragraph keeps a license requirement for the UAE except for approved supp. 8 recipients.`
          : `${dest} is in Country Group ${groupsOf(dest).filter(g => g.startsWith('D')).join(', ')} and not in A:5 or A:6.${hkNote}`;
      reqWhy += ` The rule rescinds the worldwide Diffusion requirement and applies one list to both .a and .b items (paragraph (iii)(B) is reserved).`;
    } else if (hqD5) {
      reqWhy = `The end user or its parent is headquartered in D:5 or Macau. The revised § 744.23(a)(3)(i)(A) requires a license for all 3A090 (except .c), 4A090 and .z items to such entities outside D:1, D:4 and D:5.`;
    } else {
      add('License requirement on the CCL', `The rule rescinds the AI Diffusion framework's worldwide requirement. ${ec} now needs a license only to Indonesia, Malaysia, Singapore, Brazil and Thailand; D:1, D:4 and D:5 destinations not also in A:5 or A:6; the UAE; and D:5- or Macau-headquartered entities. ${dest} is none of these.`, cites.concat([C('Country Groups', GRP)]), 'pass');
      return done('nlr', 'No license required under the advanced computing rules. Check part 744 end-use controls, including § 744.24, and the Entity List.', { cls });
    }
    add('License requirement on the CCL', reqWhy, cites.concat(hkCite), 'flag', 'license');
    const ex = exceptions(); if (ex) return ex;
    const d5 = isD5orMacau(dest) || dest === 'Hong Kong';
    if (d5 || hqD5) return chinaReview(NEW('§ 742.6(b)(10)(iii)(A)(2)'), C('§ 744.23(d)(1)', ECFR('744.23')));
    if (five) {
      add('Review policy', 'Applications for the five added destinations are reviewed case-by-case, weighing the effectiveness of the destination\'s export control regime and its coordination with BIS on enforcement.', [NEW('§ 742.6(b)(10)(iii)(A)(1)')], 'flag', 'case-by-case');
      return done('cbc', 'License required; case-by-case review.', { cls });
    }
    add('Review policy', 'Applications to D:1 and D:4 destinations outside D:5 (and not in A:5 or A:6), and to the UAE, are reviewed with a presumption of approval. The Diffusion country allocations are removed.', [NEW('§ 742.6(b)(10)(iii)(A)(2)')], 'flag', 'approval');
    return done('poa', 'License required; presumption of approval.', { cls });
  }

  // ---------- shared: NAC / ACA ----------
  function exceptions() {
    if (dcA) {
      const compNote = chip.form === 'computer' ? ' The 4A090 entry lists NAC/ACA as available; § 740.8(a) excludes items designed or marketed for datacenters that meet 3A090.a, and this tool applies that exclusion to computers built around such chips.' : '';
      add('License exception', `Datacenter 3A090.a chips are excluded from NAC and ACA.${ak ? ' License Exception ACM (§ 740.28), which the rule keeps, is not modeled here.' : ' The diffusion-era exceptions in the text (AIA, LPP) and License Exception ACM are not modeled here.'}${compNote}`, [C('§ 740.8(a)', ECFR('740.8')), C('ECCN 3A090 (exceptions)', CCL3)], 'stop');
      return null;
    }
    const nac = isD5orMacau(dest) || dest === 'Hong Kong' || hqD5;
    add('License exception', nac
      ? `${ec} items that are not datacenter 3A090.a chips can use License Exception NAC to Macau, D:5 and D:5-headquartered entities. NAC needs a written purchase order and a notification in SNAP-R at least 25 days before shipment; BIS can respond that a license is required.`
      : `${ec} items that are not datacenter 3A090.a chips can use License Exception ACA to this destination, with a written purchase order.`,
      [C('§ 740.8(a)', ECFR('740.8')), C('ECCN 3A090 (NAC/ACA)', CCL3)].concat(ak ? [NEW('§ 740.2(a)(9)(ii)')] : []), 'pass', nac ? 'NAC' : 'ACA');
    return done('exc', nac
      ? 'Shippable under License Exception NAC after a 25-day notification, unless BIS says a license is needed. NAC is unavailable when a part 744 license requirement applies (other than § 744.23(a)(3)).'
      : 'Shippable under License Exception ACA. ACA is unavailable when a part 744 or 746 license requirement applies.', { cls });
  }

  // ---------- shared: D:5 / Macau / D:5-HQ review ----------
  function chinaReview(polCite, eu) {
    const d5 = isD5orMacau(dest) || dest === 'Hong Kong';
    const inCn = isChinaOrMacau(dest);
    const bwKnown = chip.dramBw > 0;
    const fits = chip.tpp < T.CHINA_CBC_TPP && bwKnown && chip.dramBw < T.CHINA_CBC_BW;
    const milBlocked = endUser === 'meu';
    const sysNote = chip.form === 'computer';
    if (inCn && shipFrom === 'us' && fits && certs && !milBlocked) {
      add('Review policy', `Since 15 January 2026, exports from the United States to end users located in China or Macau of commodities with TPP under 21,000 and total DRAM bandwidth under 6,500 GB/s (for example the H200 or MI325X) are reviewed case-by-case, if the applicant makes the certifications in supp. 2 to part 748, para. (dd): U.S. supply is not short, China volume stays at or under 50% of U.S. shipments of the product, KYC and remote-access screening, physical security, and independent third-party testing in the United States before export.${ak ? ' The 16 Nov 2026 rule keeps this path.' : ''}${sysNote ? ' The rule speaks of "commodities"; how the thresholds apply to a multi-GPU server is not settled here.' : ''}`, [polCite, C('91 FR 1684', JAN26), C('Supp. 2 to part 748', SUPP2_748)], 'flag', 'case-by-case');
      return done('cbc', 'License required; case-by-case review under the January 2026 policy. Chips routed through U.S. testing labs are imported, and a 25% Section 232 tariff applies to covered chips not used in the U.S. supply chain buildout. NVIDIA reports that PRC government restrictions have limited H200 sales under the licenses it received.', { cls, intricate: sysNote, cites: [C('Proclamation, 91 FR 2443', PROC), C('NVIDIA Form 10-K, FY2026', NV10K)] });
    }
    const why = [];
    if (!inCn) why.push(hqD5 && !d5 ? 'the end user is a D:5- or Macau-headquartered entity outside China and Macau' : 'the destination is not China or Macau');
    if (inCn && shipFrom !== 'us') why.push('the shipment is a reexport or export from abroad, not an export from the United States');
    if (chip.tpp >= T.CHINA_CBC_TPP) why.push(`TPP ${fmt(chip.tpp)} is 21,000 or more`);
    if (!bwKnown) why.push('total DRAM bandwidth is not entered');
    else if (chip.dramBw >= T.CHINA_CBC_BW) why.push(`DRAM bandwidth ${fmt(chip.dramBw)} GB/s is 6,500 or more`);
    if (inCn && !certs) why.push('the applicant cannot make the para. (dd) certifications');
    if (milBlocked) why.push('the end use is military');
    add('Review policy', `Applications for ${ec} items to D:5 or Macau, or to D:5- or Macau-headquartered entities anywhere, are reviewed with a presumption of denial. The January 2026 case-by-case path does not apply because ${why.join('; ')}.`, [polCite, eu, C('91 FR 1684', JAN26)], 'stop', 'denial');
    return done('pod', 'License required; presumption of denial.', { cls, intricate: !bwKnown || sysNote });
  }
}

// Run both rule sets and describe the difference.
export function compareRules(input) {
  const cur = decide({ ...input, rules: 'current', dc: 'no', usHq: false });
  const nw = decide({ ...input, rules: 'ak50' });
  const changed = cur.outcome !== nw.outcome;
  return { cur, nw, changed, summary: changed ? `${OUTCOMES[cur.outcome].label} under current rules; ${OUTCOMES[nw.outcome].label.toLowerCase()} under the 16 Nov 2026 rule.` : `Same outcome under both: ${OUTCOMES[cur.outcome].label.toLowerCase()}.` };
}

export function fmt(n) {
  if (n == null || !Number.isFinite(n)) return '–';
  const v = Math.round(n * 10) / 10;
  return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
}
