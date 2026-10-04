// Situation Room Replay: derived structures from the Cheap Talk coding (data/srs.js).
// Nothing here changes a coded value. Derivations are documented in the Method panel:
//  - a person's position on an issue is the side of their last coded turn on it; "moved" marks people
//    coded on both sides; N/A only when they have no 1/0 turn;
//  - the President's lean is the issue index's President Side (POTUS SP = 1), never inferred from turns.
import { META, PEOPLE, ISSUES, MEETINGS } from '../data/srs.js';

export { META, PEOPLE, ISSUES, MEETINGS };
export const ADMINS = ['Truman', 'Eisenhower', 'Kennedy', 'Johnson', 'Nixon', 'Ford', 'Carter', 'Reagan'];
export const ROLES = {
  pres: 'President', vp: 'Vice President', state: 'State & diplomacy', def: 'Defense (civilian)', mil: 'Military',
  intel: 'Intelligence', nsc: 'NSC & White House staff', econ: 'Treasury, budget & economy', cong: 'Congress', other: 'Other',
};
export const ROLE_COLOR = {
  pres: 'var(--ink)', vp: 'var(--muted)', state: 'var(--c1)', def: 'var(--c7)', mil: 'var(--c3)', intel: 'var(--c6)',
  nsc: 'var(--c5)', econ: 'var(--c8)', cong: 'var(--c4)', other: 'var(--faint)',
};
export const BY_ID = Object.fromEntries(MEETINGS.map((m, i) => [m.id, i]));
export const ISSUE_MEETING = {};
MEETINGS.forEach((m, i) => m.issues.forEach(k => { ISSUE_MEETING[k] = i; }));

/** "Should X? 1 says A, 0 says B" -> { q, s1, s0 }. Falls back to the full text. */
export function splitDesc(d) {
  const m = d.match(/^(.*?)\s*\b1 (?:says|=)\s*(.*?)[,;]?\s*(?:and\s+|while\s+)?\b0 (?:says|=)\s*(.*)$/s);
  if (!m) return { q: d, s1: '', s0: '' };
  return { q: m[1].trim(), s1: m[2].trim().replace(/[.;,]$/, ''), s0: m[3].trim().replace(/\.$/, '') };
}

/** Positions on every issue of a meeting: { issueKey: Map(pid -> {v, moved, turns:[segIdx]}) } */
export function positions(m, upto = Infinity) {
  const out = Object.fromEntries(m.issues.map(k => [k, new Map()]));
  m.turns.forEach((t, i) => {
    if (i > upto || !t[2]) return;
    for (const [k, v] of Object.entries(t[2])) {
      const map = out[k]; if (!map) continue;
      const p = map.get(t[1]) || { v: null, seen: new Set(), turns: [] };
      p.turns.push(i); p.seen.add(v);
      if (v !== 'N/A') p.v = v; else if (p.v == null) p.v = 'N/A';
      map.set(t[1], p);
    }
  });
  for (const map of Object.values(out)) for (const p of map.values()) p.moved = p.seen.has(1) && p.seen.has(0);
  return out;
}

// ---- Corpus-wide derivations (computed once) -------------------------------------------------
const POS = MEETINGS.map(m => positions(m));
const presOf = m => (m.pres == null ? null : m.pres);

/** Per-person records: meetings spoken in, sided issues, hawk share, President agreement. */
export const PERSON = PEOPLE.map(() => ({ meetings: [], stances: [], hawk: 0, dove: 0, ac: 0, nonac: 0, agree: 0, differ: 0 }));
/** Pair counts keyed "a|b" with a<b: { opp, same, issues:[keys] } */
export const PAIRS = new Map();

MEETINGS.forEach((m, mi) => {
  m.spk.forEach(s => PERSON[s[0]].meetings.push(mi));
  for (const k of m.issues) {
    const iss = ISSUES[k]; const map = POS[mi][k];
    const sided = [...map.entries()].filter(([, p]) => p.v === 0 || p.v === 1);
    for (const [pid, p] of map) {
      const rec = PERSON[pid];
      rec.stances.push({ k, mi, v: p.v, moved: p.moved });
      if (p.v !== 0 && p.v !== 1) continue;
      if (iss.hd === 'Y' && iss.hs != null) (p.v === iss.hs ? rec.hawk++ : rec.dove++);
      if (iss.acs != null) (p.v === iss.acs ? rec.ac++ : rec.nonac++);
      if (iss.ps != null && pid !== presOf(m)) (p.v === iss.ps ? rec.agree++ : rec.differ++);
    }
    for (let a = 0; a < sided.length; a++) for (let b = a + 1; b < sided.length; b++) {
      const [pa, xa] = sided[a], [pb, xb] = sided[b];
      const key = pa < pb ? `${pa}|${pb}` : `${pb}|${pa}`;
      const e = PAIRS.get(key) || { opp: 0, same: 0, opIss: [], sameIss: [] };
      if (xa.v !== xb.v) { e.opp++; e.opIss.push(k); } else { e.same++; e.sameIss.push(k); }
      PAIRS.set(key, e);
    }
  }
});
export const POSITIONS = POS;

/** Aggregates for a list of meeting indexes. */
export function aggregate(idx) {
  const a = { meetings: idx.length, code1: 0, level2: 0, issues: 0, F: 0, ac: 0, acSide: 0, hd: 0, sp: 0,
    presHawk: 0, presDove: 0, presAC: 0, presNonAC: 0, presNoSide: 0 };
  for (const mi of idx) {
    const m = MEETINGS[mi];
    if (m.code === 1) a.code1++;
    if (/Level-2/.test(m.assess)) a.level2++;
    for (const k of m.issues) {
      const i = ISSUES[k]; a.issues++;
      if (i.fp === 'F') a.F++;
      if (i.ac === 'Y') a.ac++;
      if (i.acs != null) a.acSide++;
      if (i.hd === 'Y') a.hd++;
      if (i.sp === 1) a.sp++; else a.presNoSide++;
      if (i.ps != null && i.hd === 'Y' && i.hs != null) (i.ps === i.hs ? a.presHawk++ : a.presDove++);
      if (i.ps != null && i.acs != null) (i.ps === i.acs ? a.presAC++ : a.presNonAC++);
    }
  }
  return a;
}

export const pct = (n, d) => (d ? Math.round((100 * n) / d) : null);
export const fmtPct = (n, d) => (d ? `${pct(n, d)}%` : '–');
export const fmtDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const issueLetter = k => k.replace(/^issue_/, '');
/** Short display name: last word of the name, plus first initial when the surname is shared. */
const LAST = {};
const words = n => n.split(' ').filter((w, i, a) => i === 0 || !/^(Jr\.?|Sr\.?|II|III|IV)$/.test(w) || a.length < 2);
PEOPLE.forEach(p => { const l = words(p.n).pop(); LAST[l] = (LAST[l] || 0) + 1; });
export const shortName = pid => { const n = words(PEOPLE[pid].n); const l = n[n.length - 1]; return LAST[l] > 1 && n.length > 1 ? `${n[0][0]}. ${l}` : l; };

/** Meeting filter: admin ('' = all), text query on subject/notes/participants, code filter. */
export function filterMeetings({ admin = '', q = '', code = 'all' } = {}) {
  const qq = q.trim().toLowerCase();
  const out = [];
  MEETINGS.forEach((m, i) => {
    if (admin && m.admin !== admin) return;
    if (code === '1' && m.code !== 1) return;
    if (code === 'issues' && !m.issues.length) return;
    if (qq && !(`${m.subj} ${m.notes} ${m.parts} ${m.id}`.toLowerCase().includes(qq))) return;
    out.push(i);
  });
  return out;
}
