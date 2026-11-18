// Decision model for "Does This Chip Need a License?"
// Pure functions, no DOM. Imported by app.js and by scripts/model.test.mjs.
//
// Formula and thresholds: ECCN 3A090, Technical Note 2 to 3A090.a and 3A090.b, and Note 2,
// 15 CFR part 774 supp. 1 (eCFR text current through 16 Nov 2026, rechecked 18 Nov 2026).
// License requirements: 15 CFR 742.6(a)(6)(i)(B) and (iii), 744.23(a)(1)-(3), 740.8, 744.11, 744.21, 744.22, 746.8,
// 748.15 (VEU), 734.4 (de minimis), 734.9(e) and (h) (foreign direct product rules).
// Review policy: 742.6(b)(10)(ii)-(iii), 744.23(d). Enforcement: BIS guidance of 13 May 2025 and 31 May 2026,
// and the enforcement statement in 91 FR 43034 (14 Jul 2026).
// RIN 0694-AK50 (FR Doc 2026-23529): on public inspection 16 Nov 2026, scheduled for publication 19 Nov 2026,
// effective on publication.
// The engine never reads the clock: callers pass `today` (YYYY-MM-DD) or an explicit `rules`.

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

// § 744.21(a)(1): 'military end use' in, or 'military end user' of, Burma, Cambodia, China, Nicaragua or Venezuela
// (Belarus and Russia are under (a)(2) and part 746). Hong Kong is treated as China.
export const MEU_COUNTRIES = ['Burma', 'Cambodia', 'China (PRC)', 'Hong Kong', 'Nicaragua', 'Venezuela'];
// § 744.22(a): Belarus, Burma, Cambodia, China, Russia, Venezuela, and Country Groups E:1 and E:2.
export const MIEU_COUNTRIES = ['Belarus', 'Burma', 'Cambodia', 'China (PRC)', 'Hong Kong', 'Russia', 'Venezuela'];
export const inMieuScope = (c) => MIEU_COUNTRIES.includes(c) || has(c, 'E:1') || has(c, 'E:2');

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
const AMD8K = 'https://www.sec.gov/Archives/edgar/data/2488/000000248825000039/amd-20250415.htm';
const SUPP5 = 'https://www.ecfr.gov/current/title-15/part-740/appendix-Supplement%20No.%205%20to%20Part%20740';
const AFFIL = 'https://www.federalregister.gov/documents/2026/11/09/2026-22793/extension-of-the-suspension-of-expansion-of-end-user-controls-for-affiliates-of-certain-listed';
const PROC = 'https://www.federalregister.gov/documents/2026/01/20/2026-01052/adjusting-imports-of-semiconductors-semiconductor-manufacturing-equipment-and-their-derivative';
const AK50 = 'https://public-inspection.federalregister.gov/2026-23529.pdf';
const RF = 'https://www.ecfr.gov/current/title-15/part-732/appendix-Supplement%20No.%203%20to%20Part%20732';
const EL = 'https://www.ecfr.gov/current/title-15/part-744/appendix-Supplement%20No.%204%20to%20Part%20744';
const SUPP2_744 = 'https://www.ecfr.gov/current/title-15/part-744/appendix-Supplement%20No.%202%20to%20Part%20744';
const SUPP2_748 = 'https://www.ecfr.gov/current/title-15/part-748/appendix-Supplement%20No.%202%20to%20Part%20748';
const NEW = (label) => C(`${label} (RIN 0694-AK50, FR Doc 2026-23529)`, AK50);

// Destinations added by RIN 0694-AK50, § 742.6(a)(6)(iii)(A)(1) as revised.
export const AK50_FIVE = ['Indonesia', 'Malaysia', 'Singapore', 'Brazil', 'Thailand'];
export const AK50_DC_TPP = 12000000;
// Supp. 5 to part 740, para. (a) (AIA destinations, eCFR text before RIN 0694-AK50), as named in data/groups.js.
export const AIA_DESTS = ['Australia', 'Belgium', 'Canada', 'Denmark', 'Finland', 'France', 'Germany', 'Ireland', 'Italy', 'Japan', 'Netherlands',
  'New Zealand', 'Norway', 'Korea, South', 'Spain', 'Sweden', 'Taiwan', 'United Kingdom', 'United States'];

// RIN 0694-AK50 DATES: "This rule is effective [INSERT DATE OF PUBLICATION IN THE FEDERAL REGISTER]".
// The Federal Register public inspection record for FR Doc 2026-23529 gives publication_date 2026-11-19.
export const AK50_EFFECTIVE = '2026-11-19';
export const AK50_DOC = 'FR Doc 2026-23529';
export const AK50_URL = AK50;
// True on or after the effective date. `today` is an ISO date string supplied by the caller.
export const ak50InForce = (today) => typeof today === 'string' && today >= AK50_EFFECTIVE;
// Default rule set for a given date: the eCFR text before 19 Nov 2026, the AK50 text from that day on.
export const defaultRules = (today) => (ak50InForce(today) ? 'ak50' : 'current');
// Labels for the rule-set switch. Before the effective date AK50 is the toggle; from it, the old text is.
export function rulesetLabels(today) {
  return ak50InForce(today)
    ? { current: 'Rules before 19 Nov 2026', ak50: 'Rules in force from 19 Nov 2026 (RIN 0694-AK50)' }
    : { current: 'Current rules (eCFR, amended through 9 Nov 2026)', ak50: 'Rule effective 19 Nov 2026 (RIN 0694-AK50)' };
}
export const RULESETS = {
  current: 'eCFR text before RIN 0694-AK50 (amended through 9 Nov 2026)',
  ak50: 'RIN 0694-AK50 (FR Doc 2026-23529), effective 19 Nov 2026',
};

// Outcome codes, least to most restrictive.
export const OUTCOMES = {
  nlr: { label: 'No license required', s: 'good', rank: 0 },
  na: { label: 'No advanced-computing license (3A090/4A090)', s: 'good', rank: 0 },
  nle: { label: 'No license enforced', s: 'good', rank: 1 },
  exc: { label: 'License exception available', s: 'good', rank: 2 },
  lic: { label: 'License required', s: 'warn', rank: 3 },
  cbc: { label: 'License required: case-by-case review', s: 'warn', rank: 4 },
  poa: { label: 'License required: presumption of approval', s: 'warn', rank: 3 },
  pod: { label: 'License required: presumption of denial', s: 'bad', rank: 5 },
  pro: { label: 'Prohibited in practice', s: 'bad', rank: 6 },
  veu: { label: 'Authorized under a Data Center VEU', s: 'good', rank: 2 },
  out: { label: 'Outside this model', s: 'neutral', rank: -1 },
};

/**
 * input = {
 *   rules: 'current' | 'ak50' (optional; when absent the rule set follows `today`, see defaultRules),
 *   today: 'YYYY-MM-DD' (optional; supplied by the caller, never read from the clock here),
 *   chip: { tpp, pd, datacenter, dramBw, form: 'ic'|'computer'|'hbm', override?: 'h20'|'prc3a090', designerD5, name },
 *   origin: 'us' | 'fdp' | 'dm' (foreign-made, incorporating U.S.-origin content) | 'foreign', shipFrom: 'us' | 'abroad',
 *   dm: 'over' | 'under' (U.S. controlled content above or at/below the de minimis level; origin 'dm' only),
 *   dest, hqD5: bool, usHq: false | 'no' | true | 'us' | 'a56' (end user headquartered in the U.S. (true or 'us') or in another
 *     Country Group A:5 or A:6 destination ('a56'); § 744.23(d)(2). Only 'us' qualifies for Note 1 to AK50 § 742.6(a)(6)(iii)(A)(1)),
 *   dc: 'no' | 'yes' | 'recommender' (data center giving >12M aggregate TPP to D:5/Macau-HQ companies; AK50 only),
 *   endUser: 'commercial'|'cloud'|'entity'|'meu'|'mieu'|'uaeok'|'veu', certs: bool,
 *   fn: 'none'|'fn1'|'fn4'|'fn5' (Entity List footnote of the listed party; endUser 'entity' only),
 *   endUse: 'none'|'supercomputer'|'fab' (§ 744.23(a)(1) and (a)(2) knowledge-based end uses),
 *   otherEccn: 'unknown'|'listed'|'listed741'|'ear99' (ECCN of an item outside 3A090/4A090: 'listed' = 3A991, 4A994 or 5A992,
 *     which are in both the § 744.23(a)(1) item scope and supp. 2 to part 744; 'listed741' = 3A001, 5A002 or 5A004 (computers
 *     also 4A003, 4A004), in the (a)(1) item scope but not in supp. 2),
 *   foundry: 'no'|'unapproved' (shipper is a front-end fabricator or OSAT and the designer is neither approved nor authorized),
 *   node: 'yes'|'no' (the IC is an "applicable advanced logic integrated circuit", § 772.1; foundry only; absent = 'yes')
 * }
 * returns { outcome, title, detail, steps: [{ n, title, text, cites, verdict, flag }], cls, intricate, cites, rules }
 */
export function decide(input) {
  const { chip, origin, dest, hqD5, endUser, certs } = input;
  const rules = input.rules || defaultRules(input.today);
  const ak = rules === 'ak50';
  const fn = endUser === 'entity' ? (input.fn || 'none') : 'none';
  const fnFdp = fn === 'fn1' || fn === 'fn4';
  const endUse = input.endUse || 'none';
  const isHbm = chip.form === 'hbm';
  // A foreign-made item that is subject to the EAR through de minimis content is reexported from abroad.
  const shipFrom = origin === 'dm' ? 'abroad' : input.shipFrom;
  const steps = [];
  const add = (title, text, cites, verdict = 'pass', flag = '') => steps.push({ n: steps.length + 1, title, text, cites, verdict, flag });
  const done = (outcome, detail, extra = {}) => ({ outcome, title: OUTCOMES[outcome].label, detail, steps, rules, ...extra });
  const ecPrefix = isHbm ? '3A090' : chip.form === 'computer' ? '4A090' : '3A090';
  // country names that take "the" in running text (the Netherlands, the United Arab Emirates, ...)
  const Dn = /^(Netherlands|United |Czech Republic|Central African|Philippines|Bahamas|Gambia|Congo|Maldives|Marshall|Solomon|Comoros|Dominican Republic)/.test(dest) ? `the ${dest}` : dest;
  const DN = Dn[0].toUpperCase() + Dn.slice(1);
  const hkNote = dest === 'Hong Kong' ? ' Hong Kong is treated as part of China under the EAR.' : '';
  const hkCite = dest === 'Hong Kong' ? [C('85 FR 83765 (Hong Kong)', HK)] : [];
  const gp10Risk = !isHbm && (chip.override === 'prc3a090' || chip.designerD5);
  const d5dest = isD5orMacau(dest) || dest === 'Hong Kong';
  // § 744.23(d)(2): presumption of approval for end users headquartered in the U.S., A:5 or A:6 that are not majority-owned
  // by a D:5- or Macau-headquartered entity. A D:5- or Macau-headquartered end user or parent (hqD5) rules it out.
  const hqUS = input.usHq === true || input.usHq === 'us';
  const d2 = (hqUS || input.usHq === 'a56') && !hqD5;
  let chipDc = !!chip.datacenter;
  const reqs = []; // part 744 license requirements found on the way: { o: outcome code, label }

  // Step 1: classification
  let cls;
  // Note 1 to 3A090.a and AK50 § 744.23(a)(3)(i)(C) reach only an "applicable advanced logic integrated circuit" (§ 772.1).
  const foundryAsked = input.foundry === 'unapproved' && chip.form === 'ic' && !chip.override;
  const foundry = foundryAsked && input.node !== 'no';
  if (foundryAsked && !foundry) {
    add('Foundry presumption (Note 1 to 3A090.a)', 'Note 1 to 3A090.a and § 744.23(a)(3)(i)(C) of RIN 0694-AK50 apply only to an "applicable advanced logic integrated circuit", which § 772.1 defines as "logic integrated circuits produced using the "16/14 nanometer node" or below, or using a non-planar transistor architecture." This IC is not one, so the presumption and the foundry license requirement do not apply, and the chip is classified on its own figures.', [C('§ 772.1', ECFR('772.1')), C('ECCN 3A090.a, Note 1', CCL3)], 'pass');
  }
  if (isHbm) {
    cls = { para: 'c', clause: 'c', why: 'High-bandwidth memory.' };
    add('Classify the item', 'A high-bandwidth memory (HBM) stack is ECCN 3A090.c. It has its own license requirement (§ 742.6(a)(6)(i)(B)) and is not counted in TPP. NAC and ACA are not available for 3A090.c ("N/A for 3A090.c").', [C('ECCN 3A090.c', CCL3), C('§ 742.6(a)(6)(i)(B)', ECFR('742.6'))], 'flag', '3A090.c');
  } else if (chip.override === 'h20') {
    cls = { para: 'none', clause: '', why: 'NVIDIA has not published H20 performance figures, so this tool cannot compute its TPP.' };
    add('Classify the chip', 'NVIDIA publishes no datasheet figures for the H20, so its TPP and performance density cannot be computed here. Its license requirement for China came from a direct notice to NVIDIA, not from the 3A090 thresholds.', [C('ECCN 3A090, Tech. Note 2', CCL3)], 'info');
  } else if (chip.override === 'prc3a090') {
    cls = { para: 'a?', clause: '', why: 'BIS guidance names this chip as a "PRC 3A090 IC".' };
    add('Classify the chip', 'Huawei publishes no official datasheet for these parts. BIS guidance of 13 May 2025 lists the Ascend 910B, 910C and 910D as "PRC 3A090 ICs" presumptively subject to General Prohibition 10. The guidance does not say which 3A090 paragraph applies.', [C('BIS GP10 guidance, 13 May 2025', GP10)], 'info');
  } else {
    cls = classify(chip);
    const pdTxt = chip.pd == null ? 'not entered' : chip.pd.toFixed(2);
    const head = `TPP ${fmt(chip.tpp)}, performance density ${pdTxt}, ${chip.datacenter ? 'designed or marketed for datacenters' : 'not designed or marketed for datacenters'}.`;
    if (foundry) {
      // Note 1 to 3A090.a: the presumption binds the front-end fabricator or OSAT whatever the datasheet says.
      add('Classify the chip', `${head} On its own figures: ${cls.why} For this shipper the Note 1 presumption below makes it 3A090.a, designed or marketed for datacenters.`, [C('ECCN 3A090.a, Note 1', CCL3)], 'info', '3A090.a (presumed, Note 1)');
      add('Foundry presumption (Note 1 to 3A090.a)', 'The shipper is a front-end fabricator or OSAT, and the designer is neither an approved IC designer (supp. 6 to part 740) nor an authorized IC designer. Note 1 to 3A090.a: "there is a presumption that the item is 3A090.a and designed or marketed for datacenters. If the "front-end fabricator" or "OSAT" company cannot overcome this presumption, then it must comply with all license requirements applicable to items specified in 3A090.a." Without an approved or authorized designer, the presumption can be overcome only by the transistor-count attestations in paragraphs b and c of the Note, which this tool assumes were not made. The presumption binds only the fabricator or OSAT.', [C('ECCN 3A090.a, Note 1', CCL3)], 'flag', 'Note 1');
      cls = { para: 'a', clause: 'Note 1', why: 'Presumed 3A090.a and designed or marketed for datacenters (Note 1 to 3A090.a).' };
      chipDc = true;
    } else if (cls.para === 'unknown') {
      add('Classify the chip', `${head} ${cls.why}`, [C('ECCN 3A090.a-.b', CCL3)], 'stop');
      return done('out', 'The 3A090 paragraph cannot be settled without the applicable die area. Enter the area of all logic dies made on a non-planar (FinFET or GAA) process.' + (gp10Risk ? ' If the chip is in 3A090, BIS\'s GP10 guidance on chips designed by D:5- or Macau-headquartered companies applies.' : ''), { cls, cites: gp10Risk ? [C('BIS GP10 guidance, 13 May 2025', GP10)] : [] });
    } else if (cls.para === 'none') {
      add('Classify the chip', `${head} ${cls.why} The item is not in ${ecPrefix}.`, [C('ECCN 3A090, Notes 2 and 4', CCL3)], 'pass');
    } else {
      const ec = `${ecPrefix}.${cls.para}`;
      add('Classify the chip', `${head} ${cls.why} That places the chip in 3A090.${cls.clause}${chip.form === 'computer' ? `, and a computer, board or server containing it in ${ec}` : ''}.${chip.form === 'computer' ? ` A server that is also a mass market encryption commodity (5A992.c) is classified 5A992.z instead: z.1 "that also meet or exceed the performance parameters in 3A090.a or 4A090.a", z.2 for .b. § 742.6(a)(6)(iii) applies the same license requirements to 5A992.z, but the 5A992 entry allows NAC/ACA "for 5A992.z.2; N/A for all other 5A992 commodities".` : ''}${ak ? ' RIN 0694-AK50 leaves the thresholds unchanged.' : ''}`, [C(`ECCN 3A090.${cls.para}`, CCL3)].concat(chip.form === 'computer' ? [C('ECCN 4A090', CCL3), C('ECCN 5A992.z', 'https://www.ecfr.gov/current/title-15/part-774/appendix-Supplement%20No.%201%20to%20Part%20774')] : []), 'flag', ec);
    }
  }

  // GP10 for PRC-designed 3A090 chips: applies whether the chip was made inside or outside the PRC
  if (gp10Risk && cls.para !== 'none') {
    add('General Prohibition 10', 'BIS says 3A090 chips designed by companies headquartered in D:5 or Macau, whether produced within or outside the PRC, are likely subject to the EAR and likely made in violation of it. Selling, transferring, using or servicing them without BIS authorization risks violating General Prohibition 10. Parties should confirm that authorizations exist for the design-to-fab and fab-to-designer transfers.', [C('BIS GP10 guidance, 13 May 2025', GP10), C('§ 736.2(b)(10)', ECFR('736.2'))], 'stop', 'GP10');
    return done('pro', 'Dealing in the chip anywhere risks a GP10 violation unless BIS authorized the transfers that produced it. BIS will not pursue enforcement against parties that obtain a chip solely for technical analysis or evaluation.', { cls });
  }

  // Step 2: subject to the EAR?
  const fnName = fn === 'fn1' ? 'footnote 1' : 'footnote 4';
  const fnPara = fn === 'fn1' ? '(e)(1)' : '(e)(2)';
  const fnStep = () => add('Is it subject to the EAR?', `A party with an Entity List ${fnName} designation is a party to the transaction, so the Entity List FDP rule in § 734.9${fnPara} applies: a foreign-produced item is subject to the EAR if it is a direct product of listed "technology" or "software" subject to the EAR (3D001, 3E001, 4D001, 4E001, 5D001, 5E001 and others) or is produced by a plant, or major component of one, that is itself a direct product of listed U.S.-origin technology or software. This tool assumes that product scope is met, as it is for chips fabricated on tools built with U.S. technology.`, [C(`§ 734.9${fnPara}`, ECFR('734.9')), C(`§ 744.11(a)(2)(${fn === 'fn1' ? 'i' : 'iv'})`, ECFR('744.11'))], 'flag', fn === 'fn1' ? 'FN1 FDP' : 'FN4 FDP');
  if (origin === 'us') {
    add('Is it subject to the EAR?', 'U.S.-origin items are subject to the EAR wherever they are located.', [C('§ 734.3(a)', ECFR('734.3'))], 'pass');
  } else if (origin === 'fdp') {
    if (cls.para === 'none') {
      if (fnFdp) fnStep();
      else add('Is it subject to the EAR?', 'The advanced computing foreign direct product rule only reaches foreign-made items that are themselves in 3A090, 4A090 or the listed .z ECCNs. Other FDP rules (Entity List footnotes 1 and 4, Russia/Belarus) and de minimis can still apply.', [C('§ 734.9(h)(1)', ECFR('734.9')), C('§ 734.9(e)', ECFR('734.9')), C('§ 734.4 (de minimis)', ECFR('734.4'))], 'info');
    } else {
      add('Is it subject to the EAR?', `A foreign-made 3A090 or 4A090 item meets the product scope if it is the direct product of listed software or technology subject to the EAR, or is made by a plant (or major component of one) that is itself the direct product of listed U.S.-origin software or technology. The destination scope as written since January 2025 is any location worldwide; before that it was D:1, D:4, D:5 and D:5-headquartered parties. This tool assumes you have confirmed the product scope.${ak && !foundry && chip.form === 'ic' ? ' Under RIN 0694-AK50, a front-end fabricator or OSAT also needs a license for applicable advanced logic ICs in 3A090.a designed by companies that are neither approved nor authorized IC designers (new § 744.23(a)(3)(i)(C)); choose that shipper in Full detail to test it.' : ''}${fnFdp ? ` The Entity List FDP rule for ${fnName} parties (§ 734.9${fnPara}) reaches the item as well.` : ''}`, [C('§ 734.9(h)', ECFR('734.9'))].concat(ak && !foundry && chip.form === 'ic' ? [NEW('§ 744.23(a)(3)(i)(C)')] : []).concat(fnFdp ? [C(`§ 734.9${fnPara}`, ECFR('734.9'))] : []), 'flag', 'FDP');
    }
  } else if (origin === 'dm') {
    if (input.dm === 'under') {
      if (ak && input.dc === 'yes' && !isHbm && cls.para !== 'none') {
        add('Is it subject to the EAR?', 'The U.S.-origin controlled content is at or below the de minimis level (25% of the foreign-made item\'s value for most destinations, 10% for Country Groups E:1 and E:2), which would ordinarily leave the item outside the EAR. Note 2 to § 744.24(a)(1) removes that: "Reexporters and transferors may not rely on the de minimis provisions for incorporating or commingling U.S.-origin items specified under paragraph (a) into foreign-made items where there is "knowledge" at any point in the chain ... [that the item] will be used in a prohibited end-use under paragraph (a)(1)".', [C('§ 734.4(c), (d)', ECFR('734.4')), NEW('§ 744.24(a)(1), Note 2')], 'stop', 'no de minimis');
        add('Data center serving D:5 companies (§ 744.24)', 'A license is required to supply the data center, no license exception overcomes it, and review is case-by-case. The rest of this walk does not apply because, apart from § 744.24, the item is outside the EAR under de minimis.', [NEW('§ 744.24(a)(1), (b)(1), (c)')], 'stop', '744.24');
        return done('cbc', 'License required under § 744.24 (case-by-case; no license exceptions). De minimis cannot be relied on for this data-center end use.', { cls });
      }
      add('Is it subject to the EAR?', 'A foreign-made item whose U.S.-origin controlled content is at or below the de minimis level (25% of its value for most destinations, 10% for Country Groups E:1 and E:2) is not subject to the EAR when reexported. A foreign direct product rule can still reach it; choose "Abroad, with U.S. technology" to see that analysis.' + (ak ? ' Under RIN 0694-AK50, de minimis cannot be relied on when there is knowledge of a § 744.24 data-center end use (Note 2 to § 744.24(a)(1)); that note covers only the items listed in § 744.24(a)(1) (3A001.z, 3A090 except .c, 4A090 and the .z items).' : ''), [C('§ 734.4(c), (d)', ECFR('734.4')), C('Supp. 2 to part 734 (calculation)', 'https://www.ecfr.gov/current/title-15/part-734/appendix-Supplement%20No.%202%20to%20Part%20734')].concat(ak ? [NEW('§ 744.24(a)(1), Note 2')] : []), 'stop', 'de minimis');
      return done('out', 'Not subject to the EAR under the de minimis rule on these facts, so U.S. licensing does not apply unless a foreign direct product rule reaches the item.', { cls });
    }
    add('Is it subject to the EAR?', `The foreign-made item incorporates U.S.-origin controlled content worth more than the de minimis level (25% of its value for most destinations, § 734.4(d)(1); 10% for Country Groups E:1 and E:2, § 734.4(c)(1)), so it is subject to the EAR when reexported. The walk below treats the shipment as a reexport.${ak ? ' Under RIN 0694-AK50, de minimis cannot be relied on at all when there is knowledge of a § 744.24 data-center end use.' : ''}`, [C('§ 734.4(c), (d)', ECFR('734.4'))].concat(ak ? [NEW('§ 744.24(a)(1), Note 2')] : []), 'flag', 'de minimis');
  } else {
    add('Is it subject to the EAR?', 'A foreign-made item with no U.S. nexus is outside the EAR. The nexus questions this tool does not compute are de minimis U.S. content and the foreign direct product rules, which reach most chips fabricated with U.S.-origin tools or design software.' + (fnFdp ? ` With a ${fnName} party, the Entity List FDP rule (§ 734.9${fnPara}) reaches items produced by a plant that is itself a direct product of listed U.S.-origin technology or software.` : ''), [C('§ 734.3', ECFR('734.3')), C('§ 734.4', ECFR('734.4')), C('§ 734.9', ECFR('734.9'))], 'stop');
    return done('out', 'Whether a foreign-made chip is subject to the EAR is a fact question about its production. If it is not, U.S. export licensing does not apply. Choose "Made abroad with U.S. technology" to see the analysis if a foreign direct product rule applies.', { cls });
  }

  // Step 3: embargoes
  const emb = EMBARGO[dest];
  if (emb === 'russia') {
    add('Embargoes and sanctions', `${DN} is subject to § 746.8: a license is required for any item on the CCL, and applications are reviewed under a policy of denial with narrow case-by-case exceptions.`, [C('§ 746.8(a)(1), (b)(3)', ECFR('746.8'))], 'stop');
    return done('pro', `License required for ${Dn}; policy of denial.`, { cls });
  }
  if (emb === 'other') {
    const sec = { 'Cuba': '746.2', 'Iran': '746.7', 'Korea, North': '746.4', 'Syria': '746.9' }[dest];
    add('Embargoes and sanctions', `${DN} is covered by a country program in part 746 of the EAR, and in some cases by Treasury (OFAC) sanctions. This tool does not model those programs.`, [C(`§ ${sec}`, ECFR(sec))], 'stop');
    return done('out', `See § ${sec} and OFAC. Country embargo rules decide this case, not the advanced computing rules.`, { cls });
  }
  add('Embargoes and sanctions', `${DN} is not under a part 746 country embargo.`, [C('Part 746', 'https://www.ecfr.gov/current/title-15/part-746')], 'pass');

  // H20: direct notice, not codified
  if (chip.override === 'h20') {
    if (isD5orMacau(dest) || dest === 'Hong Kong' || dest === 'China (PRC)' || hqD5) {
      add('Check for a direct notice', 'On 9 April 2025 the U.S. government told NVIDIA that a license is required to export the H20, and any chip matching its memory bandwidth, interconnect bandwidth or both, to China (including Hong Kong and Macau) and D:5 countries, or to companies headquartered there, citing the risk of use in a supercomputer in China. NVIDIA reports that licenses for certain China customers were granted from August 2025, that U.S. officials expected 15% or more of licensed revenue, and that no regulation codified that expectation. AMD reported on 16 April 2025 that a new U.S. license requirement for exports to the same destinations and companies applies to its MI308 products, with expected charges of up to about $800 million.', [C('NVIDIA Form 8-K, 15 Apr 2025', NV8K), C('NVIDIA Form 10-K, FY2026', NV10K), C('AMD Form 8-K, 16 Apr 2025 (MI308)', AMD8K), C('§ 744.23(b) (notices)', ECFR('744.23'))], 'flag', 'notice');
      return done('lic', 'License required by a notice to NVIDIA rather than by the published CCL thresholds. The notice text is not public, so its review policy is not modeled here.', { cls, intricate: true });
    }
    // RIN 0694-AK50 § 742.6(a)(6)(iii)(A)(1): a license for every 3A090 (except .c), 4A090 and .z item to the five destinations.
    const ak5 = ak && AK50_FIVE.includes(dest);
    const ak5Txt = ak5 ? ` From 19 Nov 2026, RIN 0694-AK50 requires a license for every 3A090 (except .c) and 4A090 item to ${Dn} (revised § 742.6(a)(6)(iii)(A)(1)), so the H20 would need one there if it is in 3A090; NVIDIA publishes no figures that settle that.` : '';
    add('Check for a direct notice', `The April 2025 notice NVIDIA disclosed covers China, Hong Kong, Macau, D:5 countries and companies headquartered there. This destination is outside that scope.${ak5Txt}`, [C('NVIDIA Form 8-K, 15 Apr 2025', NV8K)].concat(ak5 ? [NEW('§ 742.6(a)(6)(iii)(A)(1)')] : []), 'pass');
    return done('out', 'No published 3A090 classification and no disclosed notice covers this case. Classification of the H20 for other destinations rests with NVIDIA and BIS.', { cls });
  }

  const none = cls.para === 'none';
  if (none && origin === 'fdp' && !fnFdp) {
    add('Other controls', 'Outside 3A090 and 4A090, the item may fall under another ECCN (for example 3A991, 4A994 or 5A992) or be EAR99. BIS can also impose a license requirement by direct notice, as it did for the NVIDIA H20 in April 2025.', [C('CCL Category 3', CCL3), C('§ 744.23(b)', ECFR('744.23'))], 'info');
    return done('na', 'Not in 3A090 or 4A090 on these figures, so neither the advanced computing foreign direct product rule nor the advanced-computing license requirements reach it. Whether this foreign-made item is subject to the EAR at all turns on de minimis U.S. content and the other foreign direct product rules; if it is, its other classification and any end-use or Entity List controls decide the answer.', { cls });
  }
  const para = cls.para === 'a?' ? 'a' : cls.para;
  const ec = `${ecPrefix}.${para}`;
  const dcA = para === 'a' && chipDc;

  // Step 4: end user screens (part 744)
  if (endUser === 'entity') {
    const fnTxt = fn === 'fn1' ? ' For a footnote 1 party, items subject to the EAR only through § 734.9(e)(1) need a license under § 744.11(a)(2)(i), and that paragraph makes all part 740 license exceptions available when their terms are met.'
      : fn === 'fn4' ? ' For a footnote 4 party, items subject to the EAR only through § 734.9(e)(2) need a license under § 744.11(a)(2)(iv), reviewed under the policy in the entity\'s entry.'
        : fn === 'fn5' ? ' The footnote 5 FDP rule (§ 734.9(e)(3)) reaches only semiconductor manufacturing equipment in Category 3B, not chips or servers, and § 744.23(a)(2)(iv) excludes items destined to footnote 5 entities from the advanced-node end-use control.' : '';
    add('End user: Entity List', `A license is required to the extent the entry says, usually for all items subject to the EAR. License exceptions are unavailable unless the entry allows them, and the review policy is the one stated in the entry. The 50 percent affiliates rule (90 FR 47201) is suspended until 10 January 2027.${fnTxt} Red flag 29 in supp. 3 to part 732 (a duty to determine the ownership percentage of listed owners) is stayed until 10 January 2027 with the affiliates rule.`, [C('§ 744.11(a)', ECFR('744.11')), C('Entity List, supp. 4 to part 744', EL), C('91 FR 70789', AFFIL), C('Supp. 3 to part 732, red flag 29', RF)].concat(fn !== 'none' ? [C('§ 734.9(e)', ECFR('734.9'))] : []), 'stop', 'Entity List');
    return done('lic', 'License required. Review policy is set in the Entity List entry, and many entries carry a presumption of denial. Read the entry.', { cls });
  }
  if (endUser === 'mieu') {
    if (inMieuScope(dest)) {
      add('End user: military-intelligence', `§ 744.22(a) requires a license for "any item subject to the EAR" when you know it is intended for a 'military-intelligence end use' in Belarus, Burma, Cambodia, China, Russia, Venezuela or a Country Group E:1 or E:2 country, or for a military-intelligence end user of one of those countries, wherever located. ${DN} is in that list.${hkNote} Review is a presumption of denial (§ 744.22(e)). U.S. persons also need a license to support such end users (§ 744.6(b)(5)).`, [C('§ 744.22(a), (e)', ECFR('744.22')), C('§ 744.6(b)(5)', ECFR('744.6'))].concat(hkCite), 'stop', 'MIEU');
      return done('pod', 'License required under § 744.22, reviewed with a presumption of denial.', { cls });
    }
    add('End user: military-intelligence', `§ 744.22(a) covers a 'military-intelligence end use' in Belarus, Burma, Cambodia, China, Russia, Venezuela or a Country Group E:1 or E:2 country, or a military-intelligence end user of one of those countries "wherever located". Outside those countries, such end users "are limited to entities identified under paragraph (f)(2) of this section", and (f)(2) is "an exhaustive listing" for all other countries. ${DN} is not one of the listed countries, so a military-intelligence end user of ${Dn} itself is outside § 744.22. This tool assumes the end user is not one of the (f)(2) organizations (for example China's Intelligence Bureau of the Joint Staff Department); if it is, a license is required with a presumption of denial (§ 744.22(e)). The walk continues as for a commercial end user.`, [C('§ 744.22(a), (e), (f)(2)', ECFR('744.22'))], 'info', 'MIEU');
  }
  const meuNexus = endUser === 'meu' && MEU_COUNTRIES.includes(dest);
  if (endUser === 'meu') {
    const meuCites = [C('§ 744.21(a), (c), (e)', ECFR('744.21')), C('Supp. 2 to part 744', SUPP2_744)];
    if (!meuNexus) {
      add('End user: military', `§ 744.21(a)(1) covers a 'military end use' in Burma, Cambodia, China, Nicaragua or Venezuela, or a military end user of those countries "wherever located", but "'Military end users' located outside of Burma, Cambodia, China, Nicaragua, or Venezuela are limited to entities identified on the 'Military End-User' (MEU) List under supplement no. 7". Russian and Belarusian military end users abroad are limited to Entity List footnote 3 entries ((a)(2)). A military end user of ${Dn} that is on neither list is outside § 744.21, so the walk continues as for a commercial end user. If the end user is on the MEU List, choose its home country to see the § 744.21 result.`, meuCites.concat([C('MEU List, supp. 7 to part 744', 'https://www.ecfr.gov/current/title-15/part-744/appendix-Supplement%20No.%207%20to%20Part%20744')]), 'info', 'MEU');
    } else {
      const base744 = `§ 744.21(a)(1) requires a license for "Any item subject to the EAR listed in supplement no. 2" when you know it is for a 'military end use' in Burma, Cambodia, China, Nicaragua or Venezuela, or for a military end user of those countries.${hkNote} Supp. 2 lists 3A991, 4A994 (limited to computers with an APP over 0.5 WT) and 5A992, among others; it does not list 3A090 or 4A090. Applications are reviewed with a presumption of denial (§ 744.21(e)(1)), and § 744.21(e)(3) applies the same review to "items requiring a license for any reason" for these end uses and end users. Only License Exception GOV can overcome the requirement (§ 744.21(c)). The January 2026 case-by-case path for China is closed to military end uses.`;
      if (cls.para !== 'none') {
        add('End user: military', base744, meuCites.concat([C('91 FR 1684 (dd)(1)(iv)', JAN26)]), 'flag', 'MEU');
      } else if (input.otherEccn === 'listed') {
        add('End user: military', `${base744} The item is in 3A991, 4A994 or 5A992, so a license is required.`, meuCites, 'stop', '744.21');
        reqs.push({ o: 'pod', label: '§ 744.21(a)(1) (military end user; presumption of denial)' });
      } else if (input.otherEccn === 'listed741') {
        add('End user: military', `${base744} 3A001, 5A002 and 5A004 are not in supp. 2, so § 744.21(a)(1) adds no license requirement. Those ECCNs carry their own license requirements on the CCL, which this tool does not model; if one applies, § 744.21(e)(3) makes its review a presumption of denial.`, meuCites, 'info', 'MEU');
      } else if (input.otherEccn === 'ear99') {
        add('End user: military', `${base744} EAR99 items, and ECCNs not in supp. 2, are outside § 744.21(a)(1).`, meuCites, 'pass', 'MEU');
      } else {
        add('End user: military', `${base744} Whether it applies turns on the item's ECCN outside 3A090, which is not set.`, meuCites, 'stop', 'MEU');
        return done('out', 'Set the item\'s other ECCN in Full detail. If it is 3A991, 4A994 or 5A992, § 744.21 requires a license with a presumption of denial; if EAR99, § 744.21 does not apply.', { cls, intricate: true });
      }
    }
  }
  if (endUser === 'cloud' && !ak) {
    add('End user: cloud or IaaS provider', 'The license requirements in this tool attach to exports, reexports and transfers of the hardware. Remote access by the provider\'s customers is not separately controlled in this text. BIS has warned that supplying chips to an IaaS provider that will train models for parties headquartered in D:5 or Macau can trigger part 744 controls when there is "knowledge" of a WMD or military-intelligence end use. Red flag 28 in supp. 3 to part 732 covers IaaS used to train models whose weights are controlled under ECCN 4E091; RIN 0694-AK50 removes it effective 19 Nov 2026.', [C('BIS policy statement, 13 May 2025', IAAS), C('Supp. 3 to part 732, red flag 28', RF)], 'info');
  }
  if (endUser === 'cloud' && ak) {
    add('End user: cloud or IaaS provider', 'RIN 0694-AK50 controls remote access through the hardware: § 744.24 (next step) covers data centers that give D:5- or Macau-headquartered companies more than 12,000,000 aggregate TPP, and BIS reads "for an entity" in § 744.23(a)(3)(i)(A) to cover a D:5- or Macau-headquartered purchaser or the exclusive or primary (over 50 percent of total compute) remote end user of the data center. The rule removes red flag 28 (IaaS for training 4E091 models) from supp. 3 to part 732.', [NEW('preamble, sec. III.B'), NEW('§ 744.24'), C('Supp. 3 to part 732', RF)], 'info', 'remote access');
  }

  // Step 5: knowledge-based end uses in § 744.23(a)(1) and (a)(2)
  if (endUse === 'supercomputer') {
    const scope = 'Section 744.23(a)(1) requires a license for an IC "specified in ECCN 3A001, 3A991, 4A994, 5A002, 5A004, or 5A992", or a computer, assembly or component in 4A003, 4A004, 4A994, 5A002, 5A004 or 5A992, when you know it is for the "development," "production," operation, installation, maintenance, repair, overhaul, or refurbishing of a "supercomputer" located in or destined to Macau or Country Group D:5, or for incorporation into a component or equipment for one.';
    if (!none) {
      add('End use: supercomputer (§ 744.23(a)(1))', `${scope} The item scope does not list 3A090 or 4A090, so ${ec} is not caught by (a)(1) on its classification alone; the CCL requirements below govern. An item also classified in a listed ECCN would need a license under (a)(1).`, [C('§ 744.23(a)(1)', ECFR('744.23'))], 'info', '744.23(a)(1)');
    } else if (input.otherEccn === 'listed' || input.otherEccn === 'listed741') {
      const rev = d2
        ? 'Review is a presumption of approval because the end user is headquartered in the United States or Country Group A:5 or A:6 and not majority-owned by a D:5- or Macau-headquartered entity (§ 744.23(d)(2); (d)(1) applies "unless either paragraph (d)(2) or (3) applies").'
        : 'Review is a presumption of denial for Macau and D:5 (§ 744.23(d)(1)), with case-by-case review where a foreign-made item not subject to the requirement performs the same function (§ 744.23(d)(3)(ii)), and a presumption of approval for end users headquartered in the United States, A:5 or A:6 (§ 744.23(d)(2)).';
      add('End use: supercomputer (§ 744.23(a)(1))', `${scope} The item is in one of those ECCNs. No license exception overcomes (a)(1): § 744.23(c) lets license exceptions overcome only (a)(3)(i) and (a)(4). ${rev}`, [C('§ 744.23(a)(1), (c), (d)', ECFR('744.23'))], 'stop', '744.23(a)(1)');
      reqs.push(d2 ? { o: 'poa', label: '§ 744.23(a)(1) (supercomputer end use; presumption of approval, (d)(2))' } : { o: 'pod', label: '§ 744.23(a)(1) (supercomputer end use; presumption of denial)' });
    } else if (input.otherEccn === 'ear99') {
      add('End use: supercomputer (§ 744.23(a)(1))', `${scope} An EAR99 item, or one in an ECCN not listed there, is outside (a)(1).`, [C('§ 744.23(a)(1)', ECFR('744.23'))], 'pass');
    } else {
      add('End use: supercomputer (§ 744.23(a)(1))', `${scope} Whether it applies turns on the item's ECCN outside 3A090, which is not set.`, [C('§ 744.23(a)(1)', ECFR('744.23'))], 'stop', '744.23(a)(1)');
      return done('out', 'Set the item\'s other ECCN in Full detail. If it is 3A001, 3A991, 4A994, 5A002, 5A004 or 5A992 (computers: 4A003, 4A004, 4A994, 5A002, 5A004, 5A992), § 744.23(a)(1) requires a license with a presumption of denial (approval for U.S.-, A:5- or A:6-headquartered end users); if EAR99, (a)(1) does not apply.', { cls, intricate: true });
    }
  }
  if (endUse === 'fab') {
    const cbc = !none && !dcA; // § 744.23(d)(3)(i): 3A090, 4A090 and .z items except datacenter 3A090.a
    const o2 = d2 ? 'poa' : cbc ? 'cbc' : 'pod';
    add('End use: advanced-node IC fab (§ 744.23(a)(2))', `Section 744.23(a)(2)(i) requires a license for "Any items subject to the EAR when you know the items will be used in the "development" or "production" of ICs destined to a "facility" located in Macau or a destination specified in Country Group D:5 where "production" of "advanced-node ICs" occurs." Back-end assembly, test and packaging that do not change the technology level are not "production" for this purpose (§ 744.23(a)(5)). A building connected to an advanced-node facility is a red flag that it is one (red flag 27, supp. 3 to part 732). No license exception overcomes (a)(2) (§ 744.23(c) lets exceptions overcome only (a)(3)(i) and (a)(4)). ${d2 ? 'Review: presumption of approval, because the end user is headquartered in the United States or Country Group A:5 or A:6 and not majority-owned by a D:5- or Macau-headquartered entity (§ 744.23(d)(2); (d)(1) applies "unless either paragraph (d)(2) or (3) applies").' : cbc ? `Review: case-by-case for ${ec} items under § 744.23(d)(3)(i), which covers 3A090, 4A090 and .z items except datacenter 3A090.a.` : 'Review: presumption of denial for Macau and D:5 (§ 744.23(d)(1)); § 744.23(d)(3)(i) case-by-case review excludes datacenter 3A090.a items and does not reach items outside 3A090 and 4A090.'}`, [C('§ 744.23(a)(2), (a)(5), (c), (d)', ECFR('744.23')), C('Supp. 3 to part 732, red flag 27', RF)], 'stop', '744.23(a)(2)');
    reqs.push({ o: o2, label: `§ 744.23(a)(2) (advanced-node fab end use; ${{ poa: 'presumption of approval, (d)(2)', cbc: 'case-by-case', pod: 'presumption of denial' }[o2]})` });
  }

  // RIN 0694-AK50: data center end-use control, § 744.24 (does not cover 3A090.c)
  if (ak && !isHbm && none && input.dc !== 'no' && input.dc) {
    add('Data center serving D:5 companies (§ 744.24)', '§ 744.24(a)(1) reaches only items in ECCNs 3A001.z, 3A090 (except 3A090.c), 4A090, 4A003.z, 4A004.z, 4A005.z, 5A002.z, 5A004.z, 5A992.z and their listed software and technology. This item is in none of them on these figures, so § 744.24 does not apply to it.', [NEW('§ 744.24(a)(1)')], 'pass');
  } else if (ak && !isHbm) {
    if (input.dc === 'yes') {
      add('Data center serving D:5 companies (§ 744.24)', `A license is required for any ${ecPrefix} item (and the listed .z items) when you know it is destined to a data center anywhere that provides, or will provide, directly or indirectly (e.g. through a non-D:5 customer training models for them), more than 12,000,000 aggregate TPP, at one site or through linked data centers, to or for companies headquartered in D:5 or Macau. No license exception overcomes it. Review is case-by-case. A data center that was already serving such companies must obtain a license within 90 days of the rule's effective date (19 Nov 2026) to keep doing so.${origin === 'dm' ? ' De minimis cannot be relied on for this end use (Note 2 to § 744.24(a)(1)).' : ''}`, [NEW('§ 744.24(a)(1), (b), (c)'), NEW('preamble, "for an entity" in § 744.24(a)(1)')], 'stop', '744.24');
      reqs.push({ o: 'cbc', label: '§ 744.24 (case-by-case; no license exceptions)' });
    } else if (input.dc === 'recommender') {
      add('Data center serving D:5 companies (§ 744.24)', 'The § 744.24 prohibition does not apply when the compute access is only for a commercial recommender system (ranking or suggesting products, services or content, and not generating content), provided the company, the aggregate TPP and the due diligence are reported to BIS. Caveat: the preamble says such operators "may continue providing these services for 90 days, but must obtain a license" after that, so the rule is internally inconsistent; this tool follows the regulatory text.', [NEW('§ 744.24(b)(2), (d)(1)'), NEW('preamble, p. 13')], 'flag', 'recommender');
    } else {
      add('Data center serving D:5 companies (§ 744.24)', 'You have no knowledge that the item is going to a data center that provides, directly or indirectly, more than 12,000,000 aggregate TPP to or for D:5- or Macau-headquartered companies. Exporters are expected to obtain the data center\'s know-your-customer diligence; a refusal to provide it is a red flag that presumptively gives "knowledge". If the end use later changes, the recipient must be told a BIS authorization is required.', [NEW('§ 744.24(a)(1) Note 3, (e)')], 'pass');
    }
  } else if (ak && isHbm && input.dc === 'yes') {
    add('Data center serving D:5 companies (§ 744.24)', '§ 744.24 lists "3A090 (except for 3A090.c)", so HBM stacks are outside it.', [NEW('§ 744.24(a)(1)')], 'pass');
  }

  // RIN 0694-AK50: front-end fabricator / OSAT license, § 744.23(a)(3)(i)(C)
  if (ak && foundry) {
    const o = d2 ? 'poa' : d5dest || hqD5 ? 'pod' : 'cbc';
    add('Foundry or OSAT shipment (§ 744.23(a)(3)(i)(C))', `RIN 0694-AK50 adds a license requirement for "An "applicable advanced logic integrated circuit" that is subject to the EAR, specified in 3A090.a, designed by a company that is neither an approved IC designer (specified in supplement no. 6 to part 740) nor an authorized IC designer (as described in Note 1 to 3A090.a), and exported, exported from abroad, reexported, or transferred (in-country) by a "front end fabricator" or "OSAT" to or within any destination." Authorized-designer status under paragraph a(2) of Note 1 runs to 31 December 2026. § 772.1: "Applicable advanced logic integrated circuits are logic integrated circuits produced using the "16/14 nanometer node" or below, or using a non-planar transistor architecture"; this walk assumes the IC is one (set in Full detail). Review under § 744.23(d): ${o === 'pod' ? 'presumption of denial for Macau, D:5 and D:5- or Macau-headquartered entities ((d)(1))' : o === 'poa' ? 'presumption of approval for end users headquartered in the United States, A:5 or A:6 that are not majority-owned by a D:5- or Macau-headquartered entity ((d)(2); (d)(1) applies "unless either paragraph (d)(2) or (3) applies")' : 'case-by-case ((d)(3)(iv)); presumption of approval if the end user is headquartered in the United States, A:5 or A:6 and not majority-owned by a D:5- or Macau-headquartered entity ((d)(2))'}. License exceptions: § 744.23(c) lets the exceptions in § 740.2(a)(9)(ii) overcome the (a)(3)(i) prohibitions (TMP, NAC/ACA, RPL, GOV, TSU, HBM and ACM, each within its stated limits). NAC and ACA are not available here because § 740.8(a) excludes items "designed or marketed for use in a datacenter and meeting the parameters of 3A090.a", which the Note 1 presumption makes this IC; ACM (§ 740.28) and the narrow TMP, RPL, GOV and TSU provisions are not modeled.`, [NEW('§ 744.23(a)(3)(i)(C)'), C('§ 744.23(c), (d)', ECFR('744.23')), C('§ 772.1', ECFR('772.1')), NEW('§ 740.2(a)(9)(ii)'), C('§ 740.8(a)', ECFR('740.8')), C('ECCN 3A090.a, Note 1', CCL3)], 'stop', '744.23(a)(3)(i)(C)');
    reqs.push({ o, label: `§ 744.23(a)(3)(i)(C) (front-end fabricator or OSAT; unapproved designer; ${{ poa: 'presumption of approval, (d)(2)', pod: 'presumption of denial', cbc: 'case-by-case' }[o]})` });
  }

  // Validated End-User: the Data Center VEU exists only in the text before RIN 0694-AK50
  let veuOk = false;
  if (endUser === 'veu' && !isHbm) {
    if (ak) {
      add('End user: validated end user', 'RIN 0694-AK50 "removes the Data Center VEU Authorization from § 748.15, supplement no. 8 to part 748, and supplement no. 10 to part 748", effective 19 Nov 2026; only the general VEU authorization remains. The walk continues as for a commercial end user.', [NEW('preamble, sec. IV.B; § 748.15 as revised'), C('§ 748.15', ECFR('748.15'))], 'info', 'VEU removed');
    } else if (d5dest || hqD5) {
      add('End user: validated end user', 'Data Center VEU data centers may not be located in Macau or D:5, and a national VEU may not be headquartered there (§ 748.15(b)(2)). The authorization does not cover this case; the walk continues as for a commercial end user.', [C('§ 748.15(b)(2)', ECFR('748.15'))], 'info', 'VEU');
    } else if (reqs.length) {
      add('End user: validated end user', 'Items obtained under a Data Center VEU "may not be used for any activities described in part 744" (§ 748.15(d)(2)), so the VEU does not cover the part 744 end use found above.', [C('§ 748.15(d)(2)', ECFR('748.15'))], 'info', 'VEU');
    } else veuOk = true;
  }

  let base;
  if (none) {
    add('Other controls', 'Outside 3A090 and 4A090, the item may fall under another ECCN (for example 3A991, 4A994 or 5A992) or be EAR99. BIS can also impose a license requirement by direct notice, as it did for the NVIDIA H20 in April 2025.', [C('CCL Category 3', CCL3), C('§ 744.23(b)', ECFR('744.23'))], 'info');
    // Note 2 to 3A090.a and .b, or below every threshold pair: the advanced-computing license requirements do not reach the item.
    base = done('na', `Not in 3A090 or 4A090 on these figures, so the advanced-computing license requirements (§ 742.6(a)(6), § 744.23(a)(3)${ak ? ', § 744.24' : ''}) do not apply; a license can still apply for an Entity List party, a military or military-intelligence end user, or a § 744.23(a)(1) or (a)(2) end use. The item may fall in another ECCN (e.g. 3A991, 4A994, 5A992), which can carry its own license requirements, or be EAR99.`, { cls });
  } else base = isHbm ? cclHbm() : ak ? cclNew() : cclCurrent();
  // § 744.21(e)(3): "Applications for items requiring a license for any reason that are destined for a 'military end use' in
  // ... China ... or for a ... Chinese ... 'military end user,' wherever located, also will be subject to the review policy
  // stated in paragraph (e)(1)" (presumption of denial).
  if (meuNexus && ['lic', 'cbc', 'poa'].includes(base.outcome)) {
    add('Military end use review (§ 744.21(e)(3))', `The item needs a license on the CCL, and § 744.21(e)(3) says "Applications for items requiring a license for any reason that are destined for a 'military end use' in Belarus, Burma, Cambodia, China, Nicaragua, the Russian Federation, or Venezuela or for a ... 'military end user,' wherever located, also will be subject to the review policy stated in paragraph (e)(1)", a presumption of denial. That replaces the ${lc(OUTCOMES[base.outcome].label)} result above.`, [C('§ 744.21(e)(1), (e)(3)', ECFR('744.21'))], 'stop', 'denial');
    base = { ...base, outcome: 'pod', title: OUTCOMES.pod.label, detail: `License required; presumption of denial for a military end use or end user (§ 744.21(e)(3)). Without it the result would be: ${lc(OUTCOMES[base.outcome].label)}.`, policy742: false };
  }
  // § 744.24(b)(2): the recommender carve-out holds only if the report is submitted to BIS.
  if (ak && !isHbm && !none && input.dc === 'recommender') {
    const rpt = 'the § 744.24(b)(2) report is submitted to BIS (the D:5- or Macau-headquartered company\'s name, the total TPP of the covered items provided to or for it, and the due diligence showing the access is exclusively for a commercial recommender system)';
    if (base.outcome === 'nlr') base = { ...base, title: 'No license required, if the § 744.24(b)(2) report is filed', detail: 'The report goes to BIS and names the D:5- or Macau-headquartered company, the total TPP of the covered items provided to or for it, and the due diligence showing the access is exclusively for a commercial recommender system. Without it § 744.24 requires a license (case-by-case). Check the Entity List and other part 744 controls.' };
    else base = { ...base, detail: `${base.detail} § 744.24 adds no requirement only if ${rpt}.` };
  }
  if (!reqs.length) return base;
  // Combine the part 744 license requirements with the CCL result: the most restrictive review governs,
  // and these part 744 requirements cannot be overcome by NAC or ACA (§ 740.8(b), § 744.23(c), § 744.24(b)(1)).
  const top = reqs.reduce((a, r) => (OUTCOMES[r.o].rank > OUTCOMES[a.o].rank ? r : a));
  const label = reqs.map(r => r.label).join(' and ');
  if (OUTCOMES[base.outcome].rank >= OUTCOMES[top.o].rank && base.outcome !== 'veu') {
    return { ...base, detail: `${base.detail} The same application must also clear ${label}; the stricter review above governs.` };
  }
  if (base.policy742) {
    // § 742.6(b)(10)(iii)(A)(1) (eCFR) and (A)(2) (RIN 0694-AK50) end: "If the license application meets the criteria of
    // more than one licensing policy, then this licensing policy and its requirements will be applied." That sentence sets
    // the review of the CCL requirement. Part 744 requirements apply "In addition to" the CCL with their own review
    // standards, and BIS carried the § 742.6 case-by-case policy into § 744.23 only for (a)(3)(i)(A), via (d)(3)(iii)
    // (91 FR 1684). One license must clear both requirements, so the stricter policy governs.
    const has23 = reqs.some(r => r.label.startsWith('§ 744.23')), has24 = reqs.some(r => r.label.startsWith('§ 744.24')), has21 = reqs.some(r => r.label.startsWith('§ 744.21'));
    const addl = [has23 ? '§ 744.23(a) applies "In addition to the license requirements for items specified on the CCL", with its own review standards in § 744.23(d)' : '',
      has24 ? '§ 744.24(a)(1) applies "In addition to the license requirements set forth elsewhere in the EAR", with case-by-case review under § 744.24(c)' : '',
      has21 ? '§ 744.21(a) applies "In addition to the license requirements for items specified on the Commerce Control List (CCL)", with review under § 744.21(e)' : ''].filter(Boolean).join('; ');
    const stale = ak ? ' RIN 0694-AK50 moves the China case-by-case text from § 742.6(b)(10)(iii)(A)(1) to (A)(2) but does not amend § 744.23(d)(3)(iii), which still points to (A)(1).' : '';
    add('Which review policy applies', `One application would meet two policies: "${lc(OUTCOMES[base.outcome].label)}" under § 742.6(b)(10)(iii) and the stricter policy of ${label}. The stricter one is the effective outcome. The § 742.6 paragraph ends: "If the license application meets the criteria of more than one licensing policy, then this licensing policy and its requirements will be applied." That sentence governs review of the CCL requirement in § 742.6. The part 744 requirement is a separate prohibition: ${addl}. When BIS wanted the § 742.6 case-by-case policy to carry into § 744.23, it said so. The January 2026 rule (91 FR 1684) added § 744.23(d)(3)(iii), "For items specified in paragraph (a)(3)(i)(A) of this section that meet the criteria for case-by-case license review under § 742.6(b)(10)(iii)(A)(1)", as a conforming change for (a)(3)(i)(A) only.${stale} One license must clear both requirements, so the stricter policy governs. Read literally, the § 742.6 sentence could instead displace the part 744 policy; BIS has not addressed that reading.`, [ak ? NEW('§ 742.6(b)(10)(iii)(A)(2)') : C('§ 742.6(b)(10)(iii)(A)(1)', ECFR('742.6')), C('§ 744.23(a), (d)(3)(iii)', ECFR('744.23')), C('91 FR 1684, sec. III', JAN26)].concat(has24 ? [NEW('§ 744.24(a)(1), (c)')] : []), 'flag', 'precedence');
  }
  const detail = base.outcome === 'out' || base.outcome === 'na'
    ? `License required under ${label}.`
    : `License required under ${label}. Without ${reqs.length > 1 ? 'these part 744 requirements' : 'this part 744 requirement'} the result would be: ${lc(OUTCOMES[base.outcome].label)}.`;
  return { ...base, outcome: top.o, title: OUTCOMES[top.o].label, detail, intricate: !!(base.intricate || base.policy742) };

  // ---------- VEU authorization (text before RIN 0694-AK50) ----------
  function veu(reqWhy, reqCites) {
    add('License requirement on the CCL', reqWhy, reqCites.concat(hkCite), 'flag', 'license');
    add('Validated end user', `A Data Center VEU authorizes exports and reexports of "all those items on the Commerce Control List, that require a license to the destination ... and are necessary for a data center" to a validated end user listed in supp. 7 to part 748, for use at its authorized data centers outside Macau and D:5 (§ 748.15(b)(2), (c)(2)). The items may not be used for any part 744 activity, and the exporter must obtain the end user's certifications first (§ 748.15(d)(2), (e)). Supp. 7 to part 748 (eCFR at 16 Nov 2026) lists no Data Center VEU: every entry is a General VEU. So this path cannot currently yield an authorization; it would apply only to a Data Center VEU listed there. RIN 0694-AK50 removes the Data Center VEU effective 19 Nov 2026.`, [C('§ 748.15', ECFR('748.15')), C('Supp. 7 to part 748', 'https://www.ecfr.gov/current/title-15/part-748/appendix-Supplement%20No.%207%20to%20Part%20748'), NEW('§ 748.15 as revised')], 'pass', 'VEU');
    return done('veu', 'Authorized under a Data Center VEU only if supp. 7 to part 748 lists the end user and data center, and it lists no Data Center VEU today, so in practice a license is needed. The Data Center VEU is removed effective 19 Nov 2026 (RIN 0694-AK50).', { cls, intricate: true });
  }

  // ---------- CCL requirement, HBM (3A090.c), both rule sets ----------
  function cclHbm() {
    if (d5dest) {
      add('License requirement on the CCL', `"A license is required for items specified in ECCNs 3A090.c ... when exported, reexported, or transferred (in-country) to or within Macau or a destination specified in Country Group D:5" (§ 742.6(a)(6)(i)(B)).${hkNote}`, [C('§ 742.6(a)(6)(i)(B)', ECFR('742.6'))].concat(hkCite), 'flag', 'license');
    } else if (hqD5) {
      add('License requirement on the CCL', 'The end user or its parent is headquartered in D:5 or Macau. § 744.23(a)(3)(i)(B) requires a license for 3A090.c destined anywhere other than Macau or D:5 for such an entity.', [C('§ 744.23(a)(3)(i)(B)', ECFR('744.23'))], 'flag', 'license');
    } else {
      add('License requirement on the CCL', `3A090.c needs a license only to Macau and D:5 and to D:5- or Macau-headquartered entities elsewhere. ${DN} is neither.${ak ? ' RIN 0694-AK50 says so expressly: an export of 3A090.c to D:1 or D:4 outside D:5 "may be made under the No License Required (NLR) designation, provided no part 744 or 746 license requirements are applicable" (Note 1 to § 740.2(a)(9)(ii)).' : ''}`, [C('§ 742.6(a)(6)(i)(B)', ECFR('742.6')), C('§ 744.23(a)(3)(i)(B)', ECFR('744.23'))].concat(ak ? [NEW('§ 740.2(a)(9)(ii), Note 1')] : []), 'pass');
      return done('nlr', 'No license required for HBM to this destination and end user. Check part 744 end-use controls and the Entity List.', { cls });
    }
    add('License exception', `NAC and ACA are not available for 3A090.c${ak ? ' (Note 1 to § 740.2(a)(9)(ii) as revised by RIN 0694-AK50)' : ''}. License Exception HBM (§ 740.25) can authorize the shipment if the exporter is headquartered in the U.S. or A:5 without a D:5 or Macau parent, the stack's memory bandwidth density is under 3.3 GB/s/mm², it is bought directly by the designer of the co-packaged chip and shipped directly to the packaging site, and the packaging is not at an advanced-node facility in Macau or D:5. This tool does not test those conditions.${reqs.length ? ' It cannot be used here: the part 744 end-use requirement above cannot be overcome by a license exception (§ 744.23(c)).' : ''}`, [C('§ 740.25', ECFR('740.25')), C('ECCN 3A090 (exceptions)', CCL3)].concat(ak ? [NEW('§ 740.2(a)(9)(ii), Note 1')] : []), 'flag', 'HBM exc.');
    if (d5dest && !hqD5) {
      add('Review policy', 'Presumption of approval for 3A090.c to Macau or D:5 for entities neither headquartered in nor with an ultimate parent headquartered in Macau or D:5 (§ 742.6(b)(10)(ii)). This walk assumes the end user is such an entity (e.g. a Korean- or U.S.-owned plant); most companies located in China or Macau are headquartered there, which makes the policy a presumption of denial. Set this in Full detail.', [C('§ 742.6(b)(10)(ii)', ECFR('742.6'))], 'flag', 'approval');
      return done('poa', 'License required; presumption of approval, assuming the end user and its ultimate parent are not headquartered in D:5 or Macau (§ 742.6(b)(10)(ii)). License Exception HBM may apply instead.', { cls, intricate: true });
    }
    if (!d5dest) {
      // Outside Macau and D:5 the requirement is § 744.23(a)(3)(i)(B), so § 744.23(d) sets the review. (d)(1) denial applies
      // "unless either paragraph (d)(2) or (3) applies", and (d)(3)(i) covers "items specified in ECCN 3A090" other than
      // datacenter 3A090.a, which includes 3A090.c.
      add('Review policy', 'The license requirement here is § 744.23(a)(3)(i)(B), so § 744.23(d) sets the review. Its presumption of denial for D:5- or Macau-headquartered entities ((d)(1)) applies "unless either paragraph (d)(2) or (3) applies", and (d)(3)(i) sets case-by-case review "For items specified in ECCN 3A090 ... except for items designed or marketed for use in a datacenter and meeting the parameters of 3A090.a". An HBM stack is specified in 3A090 (paragraph .c), so review is case-by-case.', [C('§ 744.23(d)(1), (d)(3)(i)', ECFR('744.23'))], 'flag', 'case-by-case');
      return done('cbc', 'License required under § 744.23(a)(3)(i)(B); case-by-case review under § 744.23(d)(3)(i). License Exception HBM may apply instead.', { cls, intricate: true });
    }
    add('Review policy', 'Presumption of denial for 3A090.c to D:5- or Macau-headquartered entities (§ 742.6(b)(10)(ii): "a presumption of denial policy for all other license applications"). This walk assumes the end user or its ultimate parent is headquartered in Macau or D:5; for a foreign-owned end user there, turn that off in Full detail (presumption of approval).', [C('§ 742.6(b)(10)(ii)', ECFR('742.6'))], 'stop', 'denial');
    return done('pod', 'License required; presumption of denial, assuming the end user or its ultimate parent is headquartered in D:5 or Macau (§ 742.6(b)(10)(ii)). License Exception HBM may apply instead.', { cls, intricate: true });
  }

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
            : `${DN} is in Country Group ${groupsOf(dest).filter(g => g.startsWith('D')).join(', ')} and not in A:5 or A:6. BIS enforces the ${ec} license requirement there.${hkNote}`;
      } else {
        const aca = dcA ? '' : ' As written, License Exception ACA covers this item; BIS does not enforce the requirement in any case.';
        // § 740.28(a)-(b): ACM covers exports to 'private sector end users' for development, production or storage of eligible items
        // (3A090.a only if designed by an approved or authorized IC designer; 4A090) ultimately destined outside Macau and D:5.
        const acm = ' License Exception ACM (§ 740.28) also remains in the text: it authorizes exports of eligible items (3A090.a only if designed by an approved or authorized IC designer; 4A090) to \'private sector end users\' for "development," "production," or storage before shipment to customers outside Macau and D:5.';
        // § 740.27(a): AIA covers 3A090.a (from approved or authorized IC designers) and 4A090.a to entities located and headquartered in supp. 5 para. (a).
        const aia = AIA_DESTS.includes(dest) ? ` As written, License Exception AIA (§ 740.27) also covers supp. 5 para. (a) destinations, ${Dn} among them, for 3A090.a chips from approved or authorized IC designers and for 4A090.a items, to entities located and headquartered in those destinations, with a certification to BIS. RIN 0694-AK50 removes AIA effective 19 Nov 2026.` : '';
        add('License requirement on the CCL', `As written since January 2025, ${ec} needs a license to every destination worldwide. BIS announced on 13 May 2025 that it would not enforce the AI Diffusion rule, and in July 2026 stated that it enforces this requirement only for D:1, D:4 and D:5 destinations (excluding A:5/A:6), the UAE, and entities headquartered in D:5 or Macau. ${DN} is none of these.${aca}${aia}${acm}`, reqCites.concat([C('BIS press release, 13 May 2025', MAY25), C('§ 740.28 (ACM)', ECFR('740.28'))]).concat(aia ? [C('§ 740.27 (AIA)', ECFR('740.27')), C('Supp. 5 to part 740', SUPP5)] : []), 'flag', 'not enforced');
        return done('nle', `The regulation text requires a license, but BIS has said it is not enforcing that requirement for ${Dn}. GAO found in May 2026 that the non-enforcement announcement is itself a rule under the Congressional Review Act. RIN 0694-AK50 (FR Doc 2026-23529), effective 19 Nov 2026, formally rescinds the Diffusion framework.`, { cls, intricate: true });
      }
    } else {
      reqCites = [C('§ 742.6(a)(6)(iii)(B)', ECFR('742.6')), C('§ 744.23(a)(3)(i)(A)', ECFR('744.23'))];
      if (uaeOk && !hqD5) {
        add('License requirement on the CCL', `${ec} needs a license for the UAE, except when the ultimate consignee and all end users are approved recipients in supp. 8 to part 740.`, [C('Supp. 8 to part 740', SUPP8)].concat(reqCites), 'pass');
        return done('nlr', 'No license required for an approved UAE recipient. Part 744 controls still apply.', { cls });
      }
      if (destScope || uae) reqWhy = uae ? `${ec} needs a license for the UAE (the July 2026 rule kept this requirement after moving the UAE to A:5).` : `${ec} needs a license to D:1, D:4 and D:5 destinations not also in A:5 or A:6. ${DN} is in ${groupsOf(dest).filter(g => g.startsWith('D')).join(', ')}.${hkNote}`;
      else if (hqD5) reqWhy = `The end user or its parent is headquartered in D:5 or Macau, so § 744.23(a)(3)(i)(A) requires a license for ${ec} items even outside D:1, D:4 and D:5.`;
      else {
        add('License requirement on the CCL', `${ec} needs a license only to D:1, D:4 and D:5 destinations not also in A:5 or A:6, the UAE, and D:5- or Macau-headquartered entities. ${DN} is none of these.`, reqCites.concat([C('Country Groups', GRP)]), 'pass');
        return done('nlr', 'No license required under the advanced computing rules. Check part 744 end-use controls and the Entity List for the actual parties.', { cls });
      }
    }
    if (veuOk && dcA) return veu(reqWhy, reqCites);
    add('License requirement on the CCL', reqWhy, reqCites.concat(hkCite), 'flag', 'license');
    const ex = exceptions(); if (ex) return ex;
    const d5 = isD5orMacau(dest) || dest === 'Hong Kong';
    if (d5 || hqD5) return chinaReview(C('§ 742.6(b)(10)(iii)(A)(1)', ECFR('742.6')), C('§ 744.23(d)(1)', ECFR('744.23')));
    if (para === 'a') {
      // § 742.6(b)(10)(iii)(B)(1): presumption of approval up to a per-country allocation, for destinations not in supp. 5 to
      // part 740 para. (a) or (b) (para. (b) lists none). (B)(2): policy of denial once the allocation is met.
      add('Review policy', `As written, § 742.6(b)(10)(iii)(B)(1) reviews ${ec} applications to destinations outside D:5 and Macau that are not in supp. 5 to part 740 "under a presumption of approval, up to a per-country allocation of 790,000,000 TPP for the period from 2025 to 2027"; once a country's allocation is met, (B)(2) sets "a policy of denial". Supp. 5 para. (b), the higher-allocation list, names no country. This is a provision of the AI Diffusion rule, which BIS has said it is not enforcing; BIS has not said how it applies the allocation in the meantime. RIN 0694-AK50 removes the allocations effective 19 Nov 2026 and sets a presumption of approval for D:1, D:4 and the UAE.`, [C('§ 742.6(b)(10)(iii)(B)', ECFR('742.6')), C('Supp. 5 to part 740', SUPP5), C('90 FR 4544 (AI Diffusion)', 'https://www.federalregister.gov/documents/2025/01/15/2025-00636/framework-for-artificial-intelligence-diffusion')], 'flag', 'approval (as written)');
      return done('poa', 'License required; as written, presumption of approval up to the 790,000,000 TPP country allocation (§ 742.6(b)(10)(iii)(B)(1)), denial once it is met. BIS has not said how it applies the allocation while the Diffusion rule is unenforced.', { cls, intricate: true });
    }
    add('Review policy', `§ 742.6(b)(10)(iii) states no review policy for ${ec} items to D:1 or D:4 destinations outside D:5, or to the UAE: paragraph (A)(1) covers D:5, Macau and D:5-headquartered entities, and (B) covers only items in (a)(6)(iii)(A). Before 2025 the policy for these destinations was a presumption of approval.`, [C('§ 742.6(b)(10)(iii)', ECFR('742.6'))], 'flag', 'unsettled');
    return done('lic', 'License required. The text states no review policy for this item and destination.', { cls, intricate: true });
  }

  // ---------- CCL requirement, RIN 0694-AK50 ----------
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
    if (five && !hqD5 && hqUS) {
      add('License requirement on the CCL', `${DN} is one of the five destinations RIN 0694-AK50 adds (Indonesia, Malaysia, Singapore, Brazil, Thailand). The requirement does not apply when the ultimate consignee or end user, or its ultimate parent, is headquartered in the United States and the exporter files the monthly reports in new § 743.10 (parties, ultimate parent, destination, ECCN, SKU, TPP, quantity, date).`, [NEW('§ 742.6(a)(6)(iii)(A)(1), Note 1'), NEW('§ 743.10')], 'pass', '743.10');
      return done('nlr', 'No license required for a U.S.-headquartered recipient, provided the § 743.10 reports are filed.', { cls });
    }
    if (five || destScope || uae) {
      reqWhy = five ? `${DN} is one of the five destinations the rule adds for every 3A090 (except .c), 4A090 and .z item, citing diversion risk.`
        : uae ? `The revised paragraph keeps a license requirement for the UAE except for approved supp. 8 recipients.`
          : `${DN} is in Country Group ${groupsOf(dest).filter(g => g.startsWith('D')).join(', ')} and not in A:5 or A:6.${hkNote}`;
      reqWhy += ` The rule rescinds the worldwide Diffusion requirement and applies one list to both .a and .b items (paragraph (iii)(B) is reserved).`;
    } else if (hqD5) {
      reqWhy = `The end user or its parent is headquartered in D:5 or Macau. The revised § 744.23(a)(3)(i)(A) requires a license for all 3A090 (except .c), 4A090 and .z items to such entities outside D:1, D:4 and D:5.`;
    } else {
      add('License requirement on the CCL', `RIN 0694-AK50 rescinds the AI Diffusion framework's worldwide requirement. ${ec} now needs a license only to Indonesia, Malaysia, Singapore, Brazil and Thailand; D:1, D:4 and D:5 destinations not also in A:5 or A:6; the UAE; and D:5- or Macau-headquartered entities. ${DN} is none of these.`, cites.concat([C('Country Groups', GRP)]), 'pass');
      return done('nlr', 'No license required under the advanced computing rules. Check part 744 end-use controls, including § 744.24, and the Entity List.', { cls });
    }
    add('License requirement on the CCL', reqWhy, cites.concat(hkCite), 'flag', 'license');
    const ex = exceptions(); if (ex) return ex;
    const d5 = isD5orMacau(dest) || dest === 'Hong Kong';
    if (five && hqD5) {
      add('Drafting note: § 744.23(d)(3)(iii) cross-reference', `RIN 0694-AK50 revises § 742.6(b)(10)(iii)(A)(1) and (A)(2): new (A)(1) reads "License review policy for paragraph (a)(6)(iii)(A)(1). Applications ... will be reviewed on a case-by-case basis", and (A)(2) is now headed "Policy for Country Groups D:1, D:4, D:5 and the United Arab Emirates". It does not amend § 744.23(d)(3)(iii), which still reads "For items specified in paragraph (a)(3)(i)(A) of this section that meet the criteria for case-by-case license review under § 742.6(b)(10)(iii)(A)(1)". For a D:5- or Macau-headquartered entity in ${Dn}, read literally, that cross-reference now points to the five-country case-by-case policy. New (A)(2) also says applications "for an entity headquartered or with an ultimate parent headquartered in Country Group D:5 or Macau will be reviewed under a presumption of denial" and ends "If the license application meets the criteria of more than one licensing policy, then this licensing policy and its requirements will be applied." This tool applies (A)(2); the rule text does not reconcile the two.`, [NEW('§ 742.6(b)(10)(iii)(A)(1)-(2)'), C('§ 744.23(d)(3)(iii)', ECFR('744.23'))], 'info', 'drafting note');
    }
    if (d5 || hqD5) return chinaReview(NEW('§ 742.6(b)(10)(iii)(A)(2)'), C('§ 744.23(d)(1)', ECFR('744.23')));
    if (five) {
      add('Review policy', 'Applications for the five added destinations are reviewed case-by-case, weighing the effectiveness of the destination\'s export control regime and its coordination with BIS on enforcement.', [NEW('§ 742.6(b)(10)(iii)(A)(1)')], 'flag', 'case-by-case');
      return done('cbc', 'License required; case-by-case review. No license is needed if the ultimate consignee or end user, or its ultimate parent, is headquartered in the United States and the exporter files § 743.10 reports (Note 1 to § 742.6(a)(6)(iii)(A)(1)); set this in Full detail.', { cls });
    }
    add('Review policy', 'Applications to D:1 and D:4 destinations outside D:5 (and not in A:5 or A:6), and to the UAE, are reviewed with a presumption of approval. The Diffusion country allocations are removed.', [NEW('§ 742.6(b)(10)(iii)(A)(2)')], 'flag', 'approval');
    return done('poa', 'License required; presumption of approval.', { cls, policy742: true });
  }

  // ---------- shared: NAC / ACA ----------
  function exceptions() {
    if (dcA) {
      const compNote = chip.form === 'computer' ? ' The 4A090 entry lists NAC/ACA as available; § 740.8(a) excludes items designed or marketed for datacenters that meet 3A090.a, and this tool applies that exclusion to computers built around such chips.' : '';
      add('License exception', `Datacenter 3A090.a chips are excluded from NAC and ACA.${ak ? ' License Exception ACM (§ 740.28), which the rule keeps, is not modeled here.' : ' The diffusion-era exceptions in the text (AIA, § 740.27, and LPP, § 740.29, both removed by RIN 0694-AK50 effective 19 Nov 2026) and License Exception ACM are not modeled here.'}${compNote}`, [C('§ 740.8(a)', ECFR('740.8')), C('ECCN 3A090 (exceptions)', CCL3)], 'stop');
      return null;
    }
    if (reqs.length) {
      add('License exception', `NAC and ACA are unavailable: § 740.8(b) bars them for any transaction "subject to a license requirement under part 744" (other than the § 744.23(a)(3) requirement for D:5-headquartered entities outside D:1, D:4 and D:5), and the end-use requirement above is one.`, [C('§ 740.8(b)', ECFR('740.8'))], 'stop');
      return null;
    }
    const nac = isD5orMacau(dest) || dest === 'Hong Kong' || hqD5;
    // § 740.8(c)(2): BIS answers each NAC notification and may require a license; § 744.21(e)(3): any license for a military
    // end use or end user in China (and the other listed countries) is reviewed with a presumption of denial.
    const milNac = nac && meuNexus;
    const milTxt = milNac ? ' BIS reviews the NAC notification and can require a license (§ 740.8(c)(2)); for this military end user any license would get a presumption of denial (§ 744.21(e)(3)).' : '';
    add('License exception', (nac
      ? `${ec} items that are not datacenter 3A090.a chips can use License Exception NAC to Macau, D:5 and D:5-headquartered entities. NAC needs a written purchase order and a notification in SNAP-R at least 25 days before shipment; BIS can respond that a license is required.`
      : `${ec} items that are not datacenter 3A090.a chips can use License Exception ACA to this destination, with a written purchase order.`) + milTxt,
      [C('§ 740.8(a)', ECFR('740.8')), C('ECCN 3A090 (NAC/ACA)', CCL3)].concat(ak ? [NEW('§ 740.2(a)(9)(ii)')] : []).concat(milNac ? [C('§ 740.8(c)(2)', ECFR('740.8')), C('§ 744.21(e)(3)', ECFR('744.21'))] : []), milNac ? 'flag' : 'pass', nac ? 'NAC' : 'ACA');
    return done('exc', (nac
      ? 'Shippable under License Exception NAC after a 25-day notification, unless BIS says a license is needed. NAC is unavailable when a part 744 license requirement applies (other than § 744.23(a)(3)).'
      : 'Shippable under License Exception ACA. ACA is unavailable when a part 744 or 746 license requirement applies.') + milTxt, { cls, intricate: milNac });
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
      add('Review policy', `Since 15 January 2026, exports from the United States to end users located in China or Macau of commodities with TPP under 21,000 and total DRAM bandwidth under 6,500 GB/s (for example the H200 or MI325X) are reviewed case-by-case, if the applicant makes the certifications in supp. 2 to part 748, para. (dd): U.S. supply is not short, China volume stays at or under 50% of U.S. shipments of the product, KYC and remote-access screening, physical security, and independent third-party testing in the United States before export.${ak ? ' RIN 0694-AK50 keeps this path.' : ''}${sysNote ? ' The rule speaks of "commodities"; how the thresholds apply to a multi-GPU server is not settled here.' : ''}`, [polCite, C('91 FR 1684', JAN26), C('Supp. 2 to part 748', SUPP2_748)], 'flag', 'case-by-case');
      return done('cbc', 'License required; case-by-case review under the January 2026 policy for exports to end users in China or Macau (TPP under 21,000, DRAM bandwidth under 6,500 GB/s, with the (dd) certifications). Chips routed through U.S. testing labs are imported, and a 25% Section 232 tariff applies to covered chips not used in the U.S. supply chain buildout. NVIDIA reports that PRC government restrictions have limited H200 sales under the licenses it received.', { cls, intricate: sysNote, policy742: true, cites: [C('Proclamation, 91 FR 2443', PROC), C('NVIDIA Form 10-K, FY2026', NV10K)] });
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
    return done('pod', 'License required; presumption of denial.', { cls, intricate: !bwKnown || sysNote, policy742: true });
  }
}

// Run both rule sets and describe the difference.
export function compareRules(input) {
  const cur = decide({ ...input, rules: 'current', dc: 'no' });
  const nw = decide({ ...input, rules: 'ak50' });
  const changed = cur.outcome !== nw.outcome;
  return { cur, nw, changed, summary: changed ? `${OUTCOMES[cur.outcome].label} under the rules before 19 Nov 2026; ${lc(OUTCOMES[nw.outcome].label)} under RIN 0694-AK50.` : `Same outcome under both: ${lc(OUTCOMES[cur.outcome].label)}.` };
}

// Lower-case only the first letter of an outcome label, so ECCNs such as "3A090" keep their case.
export const lc = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);

export function fmt(n) {
  if (n == null || !Number.isFinite(n)) return '–';
  const v = Math.round(n * 10) / 10;
  return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
}
