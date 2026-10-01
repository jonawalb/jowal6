// Magazine Depth: scoring, whole-game playouts, the benchmark (the computer in your seat), the debrief's
// "what would have changed it" replays, and the shareable link.
import { P, IDS, BY, CIDS, CBY } from '../data/params.js';
import { STREAM } from './rng.js';
import { newGame, applyYear, secondActive, workLevel, emptyDecision, canDo } from './engine.js';
import { initWar, runWar, daysSustained } from './war.js';
import { STRATEGIES, rationAI } from './ai.js';

const clamp = x => Math.max(0, Math.min(1, x));

/** The war that decides the score: the real one, or (if none came) a stress test run by the computer. */
export function finalWar(s) {
  if (s.war) return s.war.done ? s : runWar(s, rationAI);
  const t = { ...s, war: initWar(s, STREAM.stress) };
  return runWar(t, rationAI);
}

export function score(s0) {
  const s = finalWar(s0), war = s.war, t = war.t + 1;
  const eff = war.series[0].eff;
  const stockPart = IDS.reduce((a, id) => a + clamp(eff[id] / (BY[id].demand * P.score.readyWeeks)), 0) / IDS.length;
  const res = 0.5 * CIDS.filter(k => secondActive(s, k, war.t)).length / CIDS.length + 0.5 * workLevel(s, t) / P.train.max;
  const ready = 0.75 * stockPart + 0.25 * res;
  const ratio = s.spent > 0 ? s.value / s.spent : 0;
  const cost = clamp((ratio - 0.4) / 0.7);
  const days = daysSustained(war);
  const parts = [
    { id: 'days', label: s0.war ? 'Days of war sustained' : 'Days sustained in the stress test', value: days, of: P.weeks * 7, pts: P.score.days * days / (P.weeks * 7) },
    { id: 'ready', label: 'Readiness when the war began', value: Math.round(ready * 100), of: 100, pts: P.score.readiness * ready },
    { id: 'cost', label: 'Peacetime cost efficiency', value: Math.round(cost * 100), of: 100, pts: P.score.cost * cost },
  ];
  return { total: Math.round(parts.reduce((a, p) => a + p.pts, 0)), parts, days, war, ratio, state: s, stress: !s0.war };
}

/** Replay a game from its choices. Missing years are filled by `fill` (a strategy); missing war weeks by the computer. */
export function replay(seed, years, fires = [], fill = STRATEGIES.balanced) {
  let s = newGame({ seed });
  while (s.phase === 'peace') { const d = years[s.year] || fill(s); s = applyYear(s, d).state; }
  if (s.phase === 'war') s = runWar(s, rationAI, fires);
  return s;
}

export function playOut(seed, strategy = 'balanced') {
  return replay(seed, [], [], STRATEGIES[strategy]);
}

/** The computer in your seat on your world, and its spread across other worlds. */
export function benchmark(seed, n = P.benchRuns) {
  const same = score(playOut(seed)).total;
  const runs = [];
  for (let i = 1; i <= n; i++) runs.push(score(playOut((seed * 31 + i * 7919) % 999983 + 1)).total);
  return { same, runs };
}
export const percentile = (total, runs) => runs.length ? Math.round(100 * runs.filter(r => r < total).length / runs.length + 50 * runs.filter(r => r === total).length / runs.length) : 50;

/** Single changes to the first year that the debrief tries, each replayed against the same war and rationing. */
export function alternatives(s0) {
  const s = newGame({ seed: s0.seed });
  const out = [];
  const add = (kind, id, label) => { if (canDo(s, kind, id)) out.push({ kind, id, label }); };
  for (const id of IDS) add('expand', id, `Expand the ${BY[id].short.toLowerCase()} line`);
  for (const k of CIDS) add('second', k, `Second-source ${CBY[k].label.toLowerCase()}`);
  for (const id of IDS) add('multi', id, `Sign a multiyear contract for ${BY[id].short.toLowerCase()}`);
  for (const id of IDS) add('coprod', id, `Co-produce ${BY[id].short.toLowerCase()} with a partner`);
  add('train', null, 'Train the workforce');
  return out;
}

export function counterfactuals(s0) {
  const years = s0.history.map(h => h.d), fires = s0.war ? s0.war.fires : [];
  const base = score(s0);
  const res = [];
  const run = (a, ys) => {
    const sc = score(replay(s0.seed, ys, fires));
    res.push({ ...a, days: sc.days, gain: sc.days - base.days, total: sc.total, dry: Object.fromEntries(IDS.map(id => [id, sc.war.dry[id]])) });
  };
  if (years.some(d => IDS.some(id => d.buy[id] < 1e6))) run({ kind: 'fill', label: 'Order the most your lines could make every year (within budget)' }, years.map(d => ({ ...d, buy: Object.fromEntries(IDS.map(id => [id, 1e6])) })));
  for (const a of alternatives(s0)) {
    const d0 = JSON.parse(JSON.stringify(years[0] || emptyDecision()));
    if (a.kind === 'train') { if (d0.train) continue; d0.train = true; }
    else { if (d0[a.kind].includes(a.id)) continue; d0[a.kind] = [a.id, ...d0[a.kind]]; }
    run(a, [d0, ...years.slice(1)]);
  }
  return { base, list: res.sort((x, y) => y.gain - x.gain || y.total - x.total) };
}

/* ---------- Shareable link: v1.seed.years.weeks ---------- */
const ci = (a, ids) => (a || []).map(x => ids.indexOf(x)).filter(i => i >= 0).join('');
export function encode(s) {
  const years = s.history.map(({ d }) => [IDS.map(id => d.buy[id] || 0).join('-'), ci(d.expand, IDS), ci(d.multi, IDS), ci(d.coprod, IDS), ci(d.modern, IDS), ci(d.second, CIDS), ci(d.audit, CIDS), d.train ? 1 : 0].join('~')).join('_');
  return `v1.${s.seed}.${years}.${s.war ? s.war.fires.join('') : ''}`;
}
export function decode(str) {
  const [v, seed, ys = '', ws = ''] = String(str).split('.');
  if (v !== 'v1' || !/^\d+$/.test(seed || '')) return null;
  const dec = (x, ids) => [...(x || '')].map(c => ids[+c]).filter(Boolean);
  const years = ys ? ys.split('_').map(y => {
    const [b, e, m, c, n, sc, au, tr] = y.split('~');
    const d = emptyDecision();
    (b || '').split('-').forEach((q, i) => { if (IDS[i]) d.buy[IDS[i]] = Math.max(0, +q || 0); });
    Object.assign(d, { expand: dec(e, IDS), multi: dec(m, IDS), coprod: dec(c, IDS), modern: dec(n, IDS), second: dec(sc, CIDS), audit: dec(au, CIDS), train: tr === '1' });
    return d;
  }) : [];
  if (!/^[012]*$/.test(ws)) return null;
  const fires = ws.match(new RegExp(`.{${IDS.length}}`, 'g')) || [];
  return { seed: +seed, years, fires };
}
