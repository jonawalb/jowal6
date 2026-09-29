// Treaty Tracker: status of a state under a treaty at the end of a chosen year, plus shared helpers.
import { TREATIES, STATES, RECS, EVENTS } from '../data/treaties.js';

export const Y0 = 1963, Y1 = 2026;
export const GROUPS = [
  { id: 'nuclear', name: 'Nuclear tests and weapons', help: 'PTBT, NPT, CTBT, TPNW' },
  { id: 'wmd', name: 'Other weapons of mass destruction', help: 'BWC, CWC, Outer Space, Sea-bed' },
  { id: 'usrus', name: 'U.S.–Soviet/Russian treaties', help: 'INF, START I, START II, SORT, New START' },
  { id: 'europe', name: 'European security', help: 'CFE, Open Skies' },
  { id: 'nwfz', name: 'Nuclear-weapon-free zones', help: 'Tlatelolco, Rarotonga, Bangkok, Pelindaba, Semipalatinsk' },
];
// Order matters: the legend and counts follow it.
export const STATUS = [
  { id: 'party', name: 'Party', help: 'Instrument deposited and the treaty in force' },
  { id: 'ratified', name: 'Ratified, treaty not in force', help: 'Instrument deposited; the treaty itself has not entered into force' },
  { id: 'signed', name: 'Signed only', help: 'Signed, no instrument deposited' },
  { id: 'susppart', name: 'Partly suspended', help: 'Suspended towards some parties' },
  { id: 'suspended', name: 'Suspended', help: 'Operation of the treaty suspended by this state' },
  { id: 'disputed', name: 'Withdrawal announced, disputed', help: 'Announced withdrawal whose legal effect parties dispute' },
  { id: 'revoked', name: 'Ratification revoked', help: 'Ratification withdrawn; the signature stands' },
  { id: 'withdrawn', name: 'Withdrawn', help: 'Withdrawal has taken effect' },
  { id: 'ended', name: 'Treaty ended', help: 'Was bound until the treaty expired, terminated or was superseded' },
  { id: 'none', name: 'Not signed', help: 'No signature or deposit on record' },
];
export const NUCLEAR_ARMED = ['USA', 'RUS', 'GBR', 'FRA', 'CHN', 'IND', 'PAK', 'ISR', 'PRK'];
export const T = Object.fromEntries(TREATIES.map(t => [t.id, t]));
export const S = Object.fromEntries(STATES.map(s => [s.iso, s]));
export const stateName = iso => S[iso]?.name || iso;
export const statusName = id => STATUS.find(s => s.id === id)?.name || id;
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function dateText(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Has the treaty itself entered into force by `cut` (YYYY-12-31)? Tlatelolco enters into force state by state. */
function treatyInForce(t, cut) {
  if (/individually/i.test(t.eifNote || '')) return true;
  return !!t.eif && t.eif <= cut;
}

/** Status of state `iso` under treaty `tid` at the end of `year`, with the date that set it. */
export function statusAt(tid, iso, year) {
  const t = T[tid], r = RECS[tid]?.[iso];
  const cut = `${year}-12-31`;
  if (!r) return { s: 'none' };
  const le = d => d && d <= cut;
  if (le(r.wd)) return { s: 'withdrawn', d: r.wd };
  if (le(r.end) && le(r.dep)) return { s: 'ended', d: r.end };
  if (le(r.revoked)) return { s: 'revoked', d: r.revoked };
  if (le(r.disputed)) return { s: 'disputed', d: r.disputed };
  const susp = (r.susp || []).filter(x => le(x.date)).sort((a, b) => a.date.localeCompare(b.date)).pop();
  if (susp) return { s: susp.scope === 'partial' ? 'susppart' : 'suspended', d: susp.date };
  if (le(r.dep)) return treatyInForce(t, cut) ? { s: 'party', d: r.dep } : { s: 'ratified', d: r.dep };
  if (le(r.sig)) {
    if (t.end && t.end <= cut) return { s: 'ended', d: t.end };
    return { s: 'signed', d: r.sig };
  }
  return { s: 'none' };
}

/** Count states in each status for a treaty at a year. */
export function counts(tid, year, isos = STATES.map(s => s.iso)) {
  const c = Object.fromEntries(STATUS.map(s => [s.id, 0]));
  for (const iso of isos) c[statusAt(tid, iso, year).s]++;
  return c;
}

/** "Bound" = party, suspended or partly suspended: the treaty is in force for the state and it has not left. */
export const BOUND = new Set(['party', 'suspended', 'susppart', 'disputed']);

/** Dated record lines for one state and treaty, oldest first. */
export function recordLines(tid, iso) {
  const r = RECS[tid]?.[iso];
  if (!r) return [];
  const out = [];
  if (r.sig) out.push({ d: r.sig, t: tid === 'start1' && iso !== 'USA' && iso !== 'RUS' ? 'Signed the Lisbon Protocol' : 'Signed' });
  if (r.dep) out.push({ d: r.dep, t: r.how === 'In force (bilateral)' ? 'Treaty entered into force' : `${r.how} deposited` });
  (r.susp || []).forEach(x => out.push({ d: x.date, t: x.scope === 'partial' ? 'Partial suspension' : 'Suspension' }));
  if (r.disputed) out.push({ d: r.disputed, t: 'Withdrawal announced (status disputed)' });
  if (r.revoked) out.push({ d: r.revoked, t: 'Ratification revoked' });
  if (r.wd) out.push({ d: r.wd, t: 'Withdrawal took effect' });
  if (r.end) out.push({ d: r.end, t: `Treaty ${T[tid].endKind || 'ended'}` });
  return out.sort((a, b) => a.d.localeCompare(b.d));
}

export const eventsFor = (tid, iso) => EVENTS.filter(e => e.treaty === tid && (e.state === iso || (!e.state && RECS[tid]?.[iso])));
