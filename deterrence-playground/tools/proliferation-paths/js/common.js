// Proliferation Paths: shared lookups. Stage of a state in a year under one dataset, coverage, reversals, formatting.
import { STATES, CODINGS, COVER, FIRST, SOURCES } from '../data/codings.js';

export const T0 = 1939, T1 = 2017;
export const DATASETS = ['bleek', 'way12', 'jg'];
export const DS_LABEL = { bleek: 'Bleek 2017', way12: 'Singh & Way (2012 update)', jg: 'Jo & Gartzke 2007', any: 'Any of the three' };
export const DS_SHORT = { bleek: 'Bleek', way12: 'Singh & Way', jg: 'Jo & Gartzke' };
export const STAGES = ['explore', 'pursue', 'acquire'];
export const RANK = { none: 0, explore: 1, pursue: 2, acquire: 3 };
export const STAGE_LABEL = { none: 'No activity coded', explore: 'Exploring', pursue: 'Pursuing', acquire: 'Acquired', out: 'Outside coverage' };
export const STAGE_COLOR = { explore: 'var(--pp-explore)', pursue: 'var(--pp-pursue)', acquire: 'var(--pp-acquire)' };

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const stateById = id => STATES.find(s => s.id === id);
export const ALL_IDS = STATES.map(s => s.id);

// Bleek's second year is the year the state returned to a lower level ("returned to no activity in 1991"), so the
// last active year is one earlier. Way and Jo & Gartzke give the last active year itself.
export const END_EXCLUSIVE = { bleek: true, way12: false, jg: false };

/** Episodes a dataset codes for a state, as inclusive year spans; open ends run to the dataset's last year. */
export function episodes(ds, id) {
  return (CODINGS[ds][id] || []).map(e => ({ ...e, end: e.to == null ? COVER[ds] : e.to - (END_EXCLUSIVE[ds] ? 1 : 0), open: e.to == null }));
}

/** Does a dataset cover year y at all? */
export const covers = (ds, y) => y >= FIRST[ds] && y <= COVER[ds];

/** Highest stage a dataset codes for a state in year y: 'none' | stage | 'out' (outside the dataset's years). */
export function stageAt(ds, id, y) {
  if (ds === 'any') {
    const live = DATASETS.filter(d => covers(d, y));
    if (!live.length) return 'out';
    return live.map(d => stageAt(d, id, y)).reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'none');
  }
  if (!covers(ds, y)) return 'out';
  let best = 'none';
  for (const e of episodes(ds, id)) if (y >= e.from && y <= e.end && RANK[e.stage] > RANK[best]) best = e.stage;
  return best;
}

/** Do the datasets that cover year y disagree about this state's stage? */
export function disagree(id, y) {
  const s = DATASETS.filter(d => covers(d, y)).map(d => stageAt(d, id, y));
  return new Set(s).size > 1;
}

/** Years in which a dataset codes a state stepping down: to a lower stage ('down') or to no activity ('stop'). */
export function reversals(ds, id) {
  const out = [];
  let prev = 'none';
  for (let y = FIRST[ds]; y <= COVER[ds]; y++) {
    const s = stageAt(ds, id, y);
    if (RANK[s] < RANK[prev]) out.push({ year: y, from: prev, to: s, kind: s === 'none' ? 'stop' : 'down' });
    prev = s;
  }
  return out;
}

/** First year a dataset codes a state at or above each stage, and the first year back at no activity. */
export function summary(ds, id) {
  const eps = episodes(ds, id);
  if (!eps.length) return null;
  const first = {};
  for (const st of STAGES) {
    if (st === 'explore' && ds === 'jg') { first[st] = null; continue; } // Jo & Gartzke have no explore category
    const ys = eps.filter(e => RANK[e.stage] >= RANK[st]).map(e => e.from);
    first[st] = ys.length ? Math.min(...ys) : null;
  }
  const open = eps.some(e => e.open);
  // First year with no activity coded, put on one convention across datasets (Bleek's "returned to no activity in").
  const stop = open ? null : Math.max(...eps.map(e => e.end)) + 1;
  let spells = 0, prev = 'none';
  for (let y = FIRST[ds]; y <= COVER[ds]; y++) { const s = stageAt(ds, id, y); if (s !== 'none' && prev === 'none') spells++; prev = s; }
  const highest = eps.reduce((a, e) => (RANK[e.stage] > RANK[a] ? e.stage : a), 'none');
  return { first, stop, open, spells, highest };
}

/** Highest stage any dataset ever codes for a state ('none' if uncoded everywhere). */
export function everHighest(id) {
  let best = 'none';
  for (const ds of DATASETS) { const s = summary(ds, id); if (s && RANK[s.highest] > RANK[best]) best = s.highest; }
  return best;
}
export const everReversed = id => DATASETS.some(ds => reversals(ds, id).some(r => r.kind === 'stop'));
export const firstActivity = id => Math.min(...DATASETS.map(ds => summary(ds, id)?.first.explore ?? summary(ds, id)?.first.pursue ?? summary(ds, id)?.first.acquire ?? 9999));

export function srcLink(key, page) {
  const s = SOURCES[key];
  if (!s) return '';
  return `<a href="${esc(s.pdf || s.url)}" target="_blank" rel="noopener">${esc(s.short)}</a>${page ? `, p.&nbsp;${esc(page)}` : ''}`;
}
