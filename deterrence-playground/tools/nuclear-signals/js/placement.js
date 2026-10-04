// Dyad placement on Kahn's ladder: the highest rung of any placed item in the dyad within the window.
// Pure functions over ITEMS; the rules that set each item's rung live in rules.js and the builder.
import { ITEMS, addMonths } from './common.js';
import { RHET } from '../data/rhetoric.js';

const placedCache = new Map();
export function placedItems(dyadId) {
  if (!placedCache.has(dyadId)) placedCache.set(dyadId, ITEMS.filter(it => it.dy && it.dy.includes(dyadId) && it.rung));
  return placedCache.get(dyadId);
}
// Window (asOf - win months, end of asOf month]. asOf is 'YYYY-MM'.
const inWin = (it, asOf, win) => { const ym = it.d.slice(0, 7); return ym <= asOf && ym > addMonths(asOf, -win); };

export function placement(dyadId, asOf, win) {
  const ev = placedItems(dyadId).filter(it => inWin(it, asOf, win))
    .sort((a, b) => b.rung - a.rung || b.d.localeCompare(a.d));
  return { rung: ev.length ? ev[0].rung : 0, top: ev[0] || null, ev };
}
export function context(dyadId, asOf, win) {
  return ITEMS.filter(it => it.dy && it.dy.includes(dyadId) && !it.rung && it.from !== 'cx' && inWin(it, asOf, win));
}
export function history(dyadId, months, win) {
  const its = placedItems(dyadId);
  return months.map(m => {
    let best = 0;
    for (const it of its) if (it.rung > best && inWin(it, m, win)) best = it.rung;
    return best;
  });
}

// Corpus targets that count as each side's state ids.
const TARGETS = { USA: ['US'], NATO: ['NATO', 'WEST'], GBR: ['UK'], FRA: [], CHN: ['CHINA'], IND: ['INDIA'], PAK: ['PAKISTAN'], PRK: ['DPRK'], RUS: ['RUSSIA'] };
export const CORPUS_OF = { RUS: 'RU', USA: 'US', CHN: 'CN', IND: 'IN', PAK: 'PK' };

// Official nuclear-weapons sentences by `from` that mention any of `toIds`, summed over the window.
export function aimed(fromId, toIds, asOf, win) {
  const cc = CORPUS_OF[fromId];
  const C = cc && RHET.countries[cc];
  if (!C) return null;
  const tg = toIds.flatMap(t => TARGETS[t] || []);
  let n = 0, wsum = 0, wn = 0, months = 0, docs = 0;
  for (const r of C.months) {
    const m = r[0];
    if (m > asOf || m <= addMonths(asOf, -win)) continue;
    months++; docs += r[1];
    for (const t of tg) {
      const v = r[11][t];
      if (!v) continue;
      n += v[0];
      if (v[1] !== null) { wsum += v[1] * v[0]; wn += v[0]; }
    }
  }
  if (!months) return { cc, n: 0, threat: null, months: 0, docs: 0, tg };
  return { cc, n, threat: wn ? wsum / wn : null, months, docs, tg };
}
