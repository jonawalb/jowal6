// Magazine Depth: the war phase. Weekly demand by class, fire set by the player's rationing, surge production
// only from lines and suppliers that already exist, and a "line holds" track that collapses on critical shortfall.
import { P, IDS, BY, CIDS, CBY } from '../data/params.js';
import { makeRng } from './rng.js';
import { lineCap, partnerCap, compCap, workLevel, legacyEff, isModern, secondActive } from './engine.js';

const clone = o => JSON.parse(JSON.stringify(o));

/** Start a war at the end of the last peacetime year (s.year has already advanced). `base` picks the rng stream. */
export function initWar(s, base) {
  const t = s.year - 1, r = makeRng(s.seed, base);
  const hits = [];
  const k1 = CIDS[Math.floor(r.u() * CIDS.length)];
  hits.push({ k: k1, from: 3 + Math.floor(r.u() * 6) });
  if (r.u() < 0.5) hits.push({ k: CIDS[Math.floor(r.u() * CIDS.length)], from: 10 + Math.floor(r.u() * 7) });
  const stock = Object.fromEntries(IDS.map(id => [id, { legacy: s.cls[id].legacy, modern: s.cls[id].modern }]));
  return {
    base, t, week: 0, hold: P.hold.start, effL: legacyEff(s.year), hits, stock,
    dry: Object.fromEntries(IDS.map(id => [id, null])), critical: null, done: false, fires: [],
    series: [{ week: 0, hold: P.hold.start, eff: effStock(stock, legacyEff(s.year)) }], log: [],
  };
}

export const effStock = (stock, effL) => Object.fromEntries(IDS.map(id => [id, stock[id].legacy * effL + stock[id].modern * P.modern.eff]));
const surgeAt = (s, w) => 1 + (P.surgeMax[workLevel(s, s.war.t + 1)] - 1) * Math.min(1, (w + 1) / P.surgeWeeks);

/** Weekly output by class in week w (expected, before the partner's dice): own lines limited by components under attack. */
export function weeklyOutput(s, w = s.war.week) {
  const war = s.war, t = war.t, surge = surgeAt(s, w);
  const hit = Object.fromEntries(CIDS.map(k => [k, 0]));
  for (const h of war.hits) if (w >= h.from && w < h.from + P.warHit.weeks) hit[h.k] = Math.max(hit[h.k], P.warHit.cut[secondActive(s, h.k, t) ? 1 : 0]);
  const own = {}, load = Object.fromEntries(CIDS.map(k => [k, 0]));
  for (const id of IDS) { own[id] = lineCap(s, id, t) / 52 * surge; for (const k in BY[id].kits) load[k] += own[id] * BY[id].kits[k]; }
  const scale = Object.fromEntries(CIDS.map(k => { const cap = compCap(s, k, t) / 52 * surge * (1 - hit[k]); return [k, load[k] > cap ? cap / load[k] : 1]; }));
  const out = {};
  for (const id of IDS) out[id] = { own: own[id] * Math.min(1, ...Object.keys(BY[id].kits).map(k => scale[k])), partner: partnerCap(s, id, t) / 52 * surge };
  return { out, hit, scale };
}

export const demandAt = (s, id, w) => {
  const r = makeRng(s.seed, s.war.base + 10 + w);
  const noise = IDS.map(() => 0.9 + 0.2 * r.u());
  return BY[id].demand * (w < P.opening.weeks ? P.opening.mult : 1) * noise[IDS.indexOf(id)];
};
export const holdChange = cov => P.hold.a * Math.pow(Math.max(0, Math.min(1, cov)), P.hold.b) - P.hold.c;

/** Resolve one week. fire: { id: 0|1|2 } index into P.fire. */
export function warWeek(s0, fire = {}) {
  const s = clone(s0), war = s.war, w = war.week, log = [];
  if (war.done) return { state: s, log };
  const f = Object.fromEntries(IDS.map(id => [id, [0, 1, 2].includes(fire[id]) ? fire[id] : 0]));
  war.fires.push(IDS.map(id => f[id]).join(''));
  const cov = {};
  let delta = 0;
  for (const id of IDS) {
    const dem = demandAt(s, id, w), target = dem * P.fire[f[id]], st = war.stock[id];
    const avail = st.legacy * war.effL + st.modern * P.modern.eff;
    const fired = Math.min(target, avail);
    let need = fired;
    const useL = Math.min(st.legacy, need / war.effL); st.legacy -= useL; need -= useL * war.effL;
    st.modern = Math.max(0, st.modern - need / P.modern.eff);
    cov[id] = fired / dem;
    delta += BY[id].imp * holdChange(cov[id]);
    if (war.dry[id] === null && avail < target - 1e-9) {
      war.dry[id] = w * 7 + Math.max(1, Math.round(7 * avail / target));
      log.push({ kind: 'dry', id, text: `${BY[id].label} ran out on day ${war.dry[id]}.` });
    }
  }
  const { out, hit } = weeklyOutput(s, w);
  const pr = makeRng(s.seed, war.base + 200 + w);
  const partnerOk = pr.u() < s.rel;
  let partnerAny = false;
  for (const id of IDS) {
    const add = out[id].own + (partnerOk ? out[id].partner : 0);
    if (out[id].partner > 0) partnerAny = true;
    war.stock[id][isModern(s, id, war.t) ? 'modern' : 'legacy'] += add;
  }
  if (partnerAny && !partnerOk) log.push({ kind: 'partner', text: 'Your co-production partner kept this week’s output.' });
  for (const h of war.hits) if (h.from === w) log.push({ kind: 'hit', text: `Strikes and sabotage hit ${CBY[h.k].label.toLowerCase()}: output down ${Math.round(hit[h.k] * 100)}% for ${P.warHit.weeks} weeks${secondActive(s, h.k, war.t) ? ' (the second source keeps some flowing)' : ''}.` });
  war.hold = Math.min(P.hold.start, war.hold + delta);
  war.week = w + 1;
  war.series.push({ week: war.week, hold: +war.hold.toFixed(1), eff: effStock(war.stock, war.effL), cov });
  if (war.hold < P.hold.critical) {
    war.critical = war.week * 7; war.done = true;
    log.push({ kind: 'end', text: `Critical shortfall on day ${war.critical}: the line no longer holds.` });
  } else if (war.week >= P.weeks) {
    war.done = true;
    log.push({ kind: 'end', text: `You sustained ${P.weeks * 7} days. The fighting pauses.` });
  }
  if (war.done && s.phase === 'war') { s.phase = 'over'; s.over = { reason: war.critical ? 'shortfall' : 'held' }; }
  war.log.push(...log);
  return { state: s, log, cov };
}

export const daysSustained = war => war.critical ?? P.weeks * 7;

/** Days of stock left at this week's fire settings, net of production. */
export function daysLeft(s, fire = {}) {
  const war = s.war, eff = effStock(war.stock, war.effL), { out } = weeklyOutput(s);
  return Object.fromEntries(IDS.map(id => {
    const use = BY[id].demand * P.fire[fire[id] || 0] - out[id].own - out[id].partner * s.rel;
    return [id, use <= 0 ? Infinity : Math.floor(7 * eff[id] / use)];
  }));
}

/** Play a war to the end with a rationing policy (used for the computer, the stress test and the debrief). */
export function runWar(s, policy, fires = []) {
  let st = s;
  while (!st.war.done) { const w = st.war.week; const f = fires[w] ? decodeFire(fires[w]) : policy(st); st = warWeek(st, f).state; }
  return st;
}
export const decodeFire = str => Object.fromEntries(IDS.map((id, i) => [id, +String(str)[i] || 0]));
