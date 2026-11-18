// Simple-mode text helpers for "Does This Chip Need a License?". Pure functions, no DOM; tested in scripts/model.test.mjs.
import { ak50InForce, isD5orMacau } from './model.js';

// Split the outcome detail into sentences. A period inside an abbreviation such as "U.S." does not end a sentence.
export function sentences(t) {
  const re = /^(.+?(?<!\b[A-Z]\.[A-Z])\.)\s+(?=[A-Z§])/;
  const out = []; let rest = t || '', m;
  while ((m = re.exec(rest))) { out.push(m[1]); rest = rest.slice(m[0].length); }
  if (rest) out.push(rest);
  return out;
}
// The sentence must say something the outcome title does not.
const norm = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function addsInfo(reason, title) {
  const a = norm(reason), b = norm(title);
  return !!a && a !== b && !b.includes(a);
}
// Simple-mode reason line: drop a leading "License required;" that repeats the title, skip sentences that only restate
// the title, and show the first sentence that adds something (two when the first is short).
// Also drop a leading restatement of the title's own words: "License required under § 744.24 ..." becomes "Under § 744.24 ...",
// and "Case-by-case review under ..." under the title "License required: case-by-case review" becomes "Under ...".
export function reasonLine(detail, title) {
  const lic = /^License required/.test(title || '');
  const tail = ((title || '').split(': ')[1] || '').toLowerCase();
  const ss = sentences(detail).map((x, i) => {
    if (i || !lic) return x;
    let y = x.replace(/^License required[;:.]\s*/, '').replace(/^License required\s+(?=under\b)/, '');
    if (tail && y.toLowerCase().startsWith(tail + ' ')) y = y.slice(tail.length + 1);
    return y ? y.charAt(0).toUpperCase() + y.slice(1) : '';
  }).filter(x => addsInfo(x, title));
  if (!ss.length) return '';
  return ss.length > 1 && ss[0].length < 40 ? `${ss[0]} ${ss[1]}` : ss[0];
}
// Plain-English glosses for terms that can appear in the Simple outcome. Definitions follow the CFR sections named.
const GLOSS = [
  [/\bNAC\b/, 'NAC (Notified Advanced Computing): a license exception that needs a notice to BIS at least 25 days before shipment (§ 740.8).'],
  [/\bACA\b/, 'ACA (Advanced Computing Authorized): a license exception with no notice to BIS (§ 740.8).'],
  [/\bVEU\b/, 'VEU: Validated End-User authorization (§ 748.15).'],
  [/\bOSAT\b/, 'OSAT: an outsourced semiconductor assembly and test company (§ 772.1).'],
  [/Entity List/, 'Entity List: parties listed in supp. 4 to part 744, which usually need a license for any item subject to the EAR (§ 744.11).'],
  [/\bGP10\b/, 'GP10: General Prohibition 10, which bars going ahead with a transaction knowing that an EAR violation has occurred or is about to (§ 736.2(b)(10)).'],
  [/\bD:5\b/, 'D:5: Country Group D:5, the U.S. arms-embargoed countries, which include China.'],
];
export function glossFor(text) { return GLOSS.filter(([re]) => re.test(text || '')).map(([, g]) => g).join(' '); }
// Short rule-set label for the Simple-mode chip. `today` is the Eastern date (YYYY-MM-DD) the page computed.
export function rulesChip(rules, today) {
  const inForce = ak50InForce(today);
  if (rules === 'ak50') return inForce ? 'Rules: Nov 2026 IFR (in force)' : 'Rules: Nov 2026 IFR (from 19 Nov)';
  return inForce ? 'Rules: pre-IFR text (before 19 Nov)' : 'Rules: current (eCFR)';
}
// Default for "end user or its ultimate parent is headquartered in D:5 or Macau": on when the destination itself is D:5 or
// Macau (Hong Kong counts as China), where most companies are headquartered locally; off elsewhere. The user can change it.
export const hqDefault = (dest) => dest === 'Hong Kong' || isD5orMacau(dest);
