// Sanctions Explorer: decode TIES rows, filter them, and count outcomes.
import { META, TYPES, STATES, INSTS, CASES } from '../data/ties.js';
import { ISSUES, OUTCOMES, CLASSES } from '../data/codebook.js';

export { META, TYPES, STATES, INSTS, ISSUES, OUTCOMES, CLASSES };

/** One object per TIES case. */
export const ALL = CASES.map(r => {
  const [id, y, m, ey, oy, snd, ps, tg, inst, iss, thr, imp, iy, ti, tt, out, ss, ts, note] = r;
  const cls = OUTCOMES[out]?.cls || 'open';
  const types = new Set([...ti, ...tt].map(i => TYPES[i]));
  return { id, y, m, ey, oy, snd, ps, tg, inst, iss, thr, imp, iy, ti, tt, out, ss, ts, note, cls, types, dis: disagrees(cls, ss, ts) };
});
export const BY_ID = new Map(ALL.map(c => [c.id, c]));
export const FIRST = META.first, LAST = META.last;

/**
 * Within-TIES check. The manual (fn. 3) says the settlement scores are reliable if the side with the
 * higher score is read as the side that prevailed. The tool flags a case when that reading points the
 * other way from the final-outcome code.
 *   'tgt' : outcome says the target conceded (fully, partly or by negotiation) but the target scored higher.
 *   'snd' : outcome says the target made no concession but the sender scored higher.
 */
function disagrees(cls, ss, ts) {
  if (ss == null || ts == null || cls === 'open') return '';
  if (['full', 'part', 'nego'].includes(cls) && ts > ss) return 'tgt';
  if (cls === 'none' && ss > ts) return 'snd';
  return '';
}

export const senderLabel = c => c.snd.length ? c.snd.map(i => STATES[i]).join(', ') : (c.inst.length ? c.inst.map(i => INSTS[i]).join(', ') : 'Not coded');

// Sender options: states that appear as a sender, and institutions. Value 's<idx>' or 'i<idx>'.
function countBy(keyFn) {
  const m = new Map();
  for (const c of ALL) for (const k of keyFn(c)) m.set(k, (m.get(k) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
export const SENDER_OPTS = [
  ...countBy(c => c.snd.map(i => 's' + i)).map(([k, n]) => ({ k, n: STATES[+k.slice(1)], c: n })),
  ...countBy(c => c.inst.map(i => 'i' + i)).map(([k, n]) => ({ k, n: INSTS[+k.slice(1)] + ' (institution)', c: n })),
];
export const TARGET_OPTS = countBy(c => [String(c.tg)]).map(([k, n]) => ({ k, n: STATES[+k], c: n }));
export const ISSUE_OPTS = countBy(c => c.iss.map(String)).map(([k, n]) => ({ k, n: ISSUES[k].n, c: n }));
export const TYPE_OPTS = countBy(c => [...c.types]).map(([k, n]) => ({ k, n, c: n }));

/** Cases matching the filters in S. `skip` names one filter to ignore (for per-category breakdowns). */
export function filter(S, skip = '') {
  const snd = S.snd ? { kind: S.snd[0], idx: +S.snd.slice(1) } : null;
  return ALL.filter(c => {
    if (c.y < S.y0 || c.y > S.y1) return false;
    if (snd && (snd.kind === 's' ? !c.snd.includes(snd.idx) : !c.inst.includes(snd.idx))) return false;
    if (S.tgt !== '' && c.tg !== +S.tgt) return false;
    if (S.iss && skip !== 'iss' && !c.iss.includes(+S.iss)) return false;
    if (S.ty && !c.types.has(S.ty)) return false;
    if (S.st === 'threat' && c.imp) return false;
    if (S.st === 'imposed' && !c.imp) return false;
    if (S.dis && !c.dis) return false;
    return true;
  });
}

/** 'strict': only full acquiescence counts. 'broad': full, partial or negotiated concession counts. */
export const isSuccess = (c, def) => def === 'strict' ? c.cls === 'full' : ['full', 'part', 'nego'].includes(c.cls);

export function stats(list, def) {
  const by = Object.fromEntries(CLASSES.map(k => [k.k, 0]));
  let imp = 0, thrOnly = 0, win = 0, coded = 0, tWin = 0, tCoded = 0, iWin = 0, iCoded = 0, dis = 0, both = 0;
  for (const c of list) {
    by[c.cls]++;
    if (c.imp) imp++; else thrOnly++;
    if (c.dis) dis++;
    if (c.ss != null && c.ts != null && c.cls !== 'open') both++;
    if (c.cls === 'open') continue;
    coded++;
    const w = isSuccess(c, def);
    if (w) win++;
    if (OUTCOMES[c.out].stage === 'threat') { tCoded++; if (w) tWin++; } else { iCoded++; if (w) iWin++; }
  }
  return { n: list.length, by, imp, thrOnly, coded, win, rate: coded ? win / coded : null,
    tCoded, tRate: tCoded ? tWin / tCoded : null, iCoded, iRate: iCoded ? iWin / iCoded : null, dis, both };
}

/** Counts per start year, by outcome class. */
export function byYear(list, y0, y1) {
  const bins = [];
  for (let y = y0; y <= y1; y++) bins.push({ y, v: Object.fromEntries(CLASSES.map(k => [k.k, 0])), n: 0 });
  for (const c of list) { const b = bins[c.y - y0]; if (b) { b.v[c.cls]++; b.n++; } }
  return bins;
}

/** One row per objective (issue), computed with every filter except the issue filter. */
export function byIssue(S) {
  const list = filter(S, 'iss');
  const rows = new Map();
  for (const c of list) for (const i of c.iss) {
    if (!rows.has(i)) rows.set(i, []);
    rows.get(i).push(c);
  }
  return [...rows.entries()].map(([i, cs]) => ({ i, st: stats(cs, S.def) })).sort((a, b) => b.st.n - a.st.n);
}

export const pct = v => v == null ? 'n/a' : Math.round(v * 100) + '%';
