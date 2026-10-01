// Magazine Depth: the peacetime engine. Pure functions over a plain state object, so the same seed and the
// same choices always give the same game (node tests and the shared link rely on this).
import { P, CLASSES, IDS, BY, COMPONENTS, CIDS, CBY, WARN_TEXT } from '../data/params.js';
import { makeRng, STREAM } from './rng.js';
import { initWar } from './war.js';

const clone = o => JSON.parse(JSON.stringify(o));
const sum = a => a.reduce((x, y) => x + y, 0);

/* ---------- Setup ---------- */
export function newGame({ seed }) {
  const r = makeRng(seed, STREAM.setup);
  const warYear = r.u() < P.noWar ? null : 2 + r.pick(P.warYearW);
  const rel = +(P.coprod.relLo + r.u() * (P.coprod.relHi - P.coprod.relLo)).toFixed(2);
  const warn = Array.from({ length: P.years }, (_, t) => warning(seed, t, warYear));
  return {
    v: 1, seed, year: 0, phase: 'peace', warYear, rel, warn,
    cls: Object.fromEntries(CLASSES.map(c => [c.id, { legacy: c.stock, modern: 0, exp: [], multi: null, coprod: null, modern_at: null }])),
    comp: Object.fromEntries(COMPONENTS.map(k => [k.id, { known: false, second: null }])),
    train: [], spent: 0, value: 0, history: [], war: null, over: null,
  };
}

/** The warning shown at the start of year t: rises over the three years before the war, with noise and false alarms. */
function warning(seed, t, W) {
  const r = makeRng(seed, STREAM.warn + t);
  let lv;
  if (W === null || t > W) lv = r.u() < 0.15 ? 1 : 0;
  else { const d = W - t; lv = d >= 3 ? 0 : 3 - d; const x = r.u(); lv += x < 0.22 ? -1 : x < 0.36 ? 1 : 0; }
  if (W === null && r.u() < 0.06) lv = 2;
  lv = Math.max(0, Math.min(3, lv));
  const texts = WARN_TEXT[lv];
  return { level: lv, text: texts[Math.floor(r.u() * texts.length)] };
}

/* ---------- Derived quantities (t = year index) ---------- */
export const budget = (s, t = s.year) => Math.round(P.budget * (1 + P.budgetWarn * s.warn[Math.min(t, P.years - 1)].level));
export const workLevel = (s, t = s.year) => Math.min(P.train.max, s.train.filter(y => y < t).length);
export const legacyEff = t => Math.max(P.obsolete.floor, 1 - P.obsolete.rate * Math.max(0, t - P.obsolete.from));
export const isModern = (s, id, t = s.year) => s.cls[id].modern_at !== null && t >= s.cls[id].modern_at;
const multiActive = (s, id, t) => s.cls[id].multi !== null && t >= s.cls[id].multi && t < s.cls[id].multi + P.multi.years;
const signalled = (s, id, t) => s.cls[id].multi !== null && t >= s.cls[id].multi + P.multi.signal;
export const secondActive = (s, k, t = s.year) => s.comp[k].second !== null && t >= s.comp[k].second + CBY[k].second.lead;
export const partnerActive = (s, id, t = s.year) => s.cls[id].coprod !== null && t >= s.cls[id].coprod + P.coprod.lead;

/** Own-line output a year at year t: base + finished expansions + supplier-funded growth, times workforce and model change-over. */
export function lineCap(s, id, t = s.year) {
  const c = BY[id], st = s.cls[id];
  let cap = c.cap + st.exp.filter(y => y + c.expand.lead <= t).length * c.expand.add;
  if (signalled(s, id, t)) cap += c.cap * P.multi.lineBoost;
  cap *= P.workEff[workLevel(s, t)];
  if (st.modern_at !== null) { const k = t - st.modern_at; if (k === 0 || k === 1) cap *= P.modern.dip[k]; }
  return Math.floor(cap);
}
export const partnerCap = (s, id, t = s.year) => partnerActive(s, id, t) ? Math.floor(BY[id].cap * P.coprod.share) : 0;
export const maxBuy = (s, id, t = s.year) => lineCap(s, id, t) + partnerCap(s, id, t);

/** Kits a year from a component's suppliers at year t (before any fault). */
export function compCap(s, k, t = s.year) {
  const K = CBY[k];
  let cap = K.cap * (secondActive(s, k, t) ? 1 + K.second.share : 1);
  for (const c of CLASSES) if (c.kits[k] && signalled(s, c.id, t)) cap += K.cap * P.multi.compBoost;
  return Math.floor(cap);
}
export function unitCost(s, id, t = s.year) {
  return BY[id].cost * (isModern(s, id, t) ? 1 + P.modern.costUp : 1) * (multiActive(s, id, t) ? 1 - P.multi.discount : 1);
}
export const listCost = (s, id, t = s.year) => BY[id].cost * (isModern(s, id, t) ? 1 + P.modern.costUp : 1);
/** Minimum order under a multiyear contract. */
export const floorBuy = (s, id, t = s.year) => multiActive(s, id, t) ? Math.floor(P.multi.floor * maxBuy(s, id, t)) : 0;

/* ---------- Decisions ---------- */
export const emptyDecision = () => ({ buy: Object.fromEntries(IDS.map(i => [i, 0])), expand: [], multi: [], coprod: [], modern: [], second: [], audit: [], train: false });

/** Which one-off actions are open this year. */
export function canDo(s, kind, id, t = s.year) {
  if (kind === 'expand') return true;
  if (kind === 'multi') return s.cls[id].multi === null || t >= s.cls[id].multi + P.multi.years;
  if (kind === 'coprod') return s.cls[id].coprod === null;
  if (kind === 'modern') return s.cls[id].modern_at === null;
  if (kind === 'second') return s.comp[id].second === null;
  if (kind === 'audit') return !s.comp[id].known;
  if (kind === 'train') return s.train.length < P.train.max;
  return false;
}
export function capitalCost(d) {
  return sum(d.expand.map(i => BY[i].expand.cost)) + d.coprod.length * P.coprod.cost + d.modern.length * P.modern.cost
    + sum(d.second.map(k => CBY[k].second.cost)) + d.audit.length * P.audit + (d.train ? P.train.cost : 0);
}
/** Most a year's orders can cost (you pay only for what is delivered). */
export function buyCost(s, d, t = s.year) {
  return sum(IDS.map(id => {
    const q = d.buy[id] || 0, pc = Math.min(q, partnerCap(s, id, t));
    return pc * unitCost(s, id, t) * (1 - P.coprod.discount) + (q - pc) * unitCost(s, id, t);
  }));
}
export const totalCost = (s, d) => capitalCost(d) + buyCost(s, d);

/** Make a decision legal: dedupe, drop closed options, clamp orders, then trim to the budget
 * (orders first, never below a contract floor; then capital projects from the last chosen). */
export function fit(s, d0) {
  const d = { ...emptyDecision(), ...clone(d0) };
  const uniq = (a, ids, kind) => [...new Set(a || [])].filter(x => ids.includes(x) && canDo(s, kind, x));
  d.expand = uniq(d.expand, IDS, 'expand'); d.multi = uniq(d.multi, IDS, 'multi'); d.coprod = uniq(d.coprod, IDS, 'coprod');
  d.modern = uniq(d.modern, IDS, 'modern'); d.second = uniq(d.second, CIDS, 'second'); d.audit = uniq(d.audit, CIDS, 'audit');
  d.train = !!d.train && canDo(s, 'train');
  for (const id of IDS) d.buy[id] = Math.max(floorBuy(s, id), Math.min(maxBuy(s, id), Math.floor(+d.buy[id] || 0)));
  const B = budget(s);
  const drop = ['audit', 'train', 'second', 'modern', 'coprod', 'expand'];
  while (capitalCost(d) + buyCost(s, { buy: Object.fromEntries(IDS.map(i => [i, floorBuy(s, i)])) }) > B) {
    const k = drop.find(x => (x === 'train' ? d.train : d[x].length));
    if (!k) break;
    if (k === 'train') d.train = false; else d[k].pop();
  }
  let over = capitalCost(d) + buyCost(s, d) - B;
  for (let guard = 0; over > 0.001 && guard < 400; guard++) {
    const room = IDS.filter(id => d.buy[id] > floorBuy(s, id));
    if (!room.length) break;
    const total = buyCost(s, d) - buyCost(s, { buy: Object.fromEntries(IDS.map(i => [i, floorBuy(s, i)])) });
    const f = Math.max(0, 1 - over / Math.max(total, 1e-9));
    for (const id of room) d.buy[id] = Math.max(floorBuy(s, id), Math.floor(floorBuy(s, id) + (d.buy[id] - floorBuy(s, id)) * f));
    over = capitalCost(d) + buyCost(s, d) - B;
    if (over > 0) { const id = room.reduce((a, b) => (d.buy[a] - floorBuy(s, a) >= d.buy[b] - floorBuy(s, b) ? a : b)); if (d.buy[id] > floorBuy(s, id)) d.buy[id]--; over = capitalCost(d) + buyCost(s, d) - B; }
  }
  return d;
}

/** Output this year from a decision: partner share first, then own lines, scaled by the scarcest component. */
export function production(s, d, t = s.year, fault = {}, held = false) {
  const made = {}, load = Object.fromEntries(CIDS.map(k => [k, 0]));
  for (const id of IDS) {
    const want = d.buy[id] || 0, partner = held ? 0 : Math.min(want, partnerCap(s, id, t));
    made[id] = { ordered: want, partner, own: Math.min(want - partner, lineCap(s, id, t)) };
    for (const k in BY[id].kits) load[k] += made[id].own * BY[id].kits[k];
  }
  const cap = Object.fromEntries(CIDS.map(k => [k, compCap(s, k, t) * (1 - (fault[k] || 0))]));
  const scale = Object.fromEntries(CIDS.map(k => [k, load[k] > cap[k] ? cap[k] / load[k] : 1]));
  for (const id of IDS) {
    const f = Math.min(1, ...Object.keys(BY[id].kits).map(k => scale[k]));
    made[id].lineShort = made[id].ordered - made[id].partner > lineCap(s, id, t);
    made[id].own = Math.floor(made[id].own * f + 1e-9);
    made[id].limitedBy = f < 1 ? Object.keys(BY[id].kits).reduce((a, k) => (scale[k] < scale[a] ? k : a)) : null;
  }
  return { made, load, cap, scale };
}

/* ---------- One peacetime year ---------- */
export function applyYear(s0, dIn) {
  const s = clone(s0), t = s.year, log = [];
  if (s.phase !== 'peace') return { state: s, log };
  const d = fit(s, dIn);
  for (const id of d.expand) s.cls[id].exp.push(t);
  for (const id of d.multi) s.cls[id].multi = t;
  for (const id of d.coprod) s.cls[id].coprod = t;
  for (const id of d.modern) s.cls[id].modern_at = t + P.modern.lead;
  for (const k of d.second) s.comp[k].second = t;
  for (const k of d.audit) { s.comp[k].known = true; log.push({ kind: 'audit', k, text: `Audit: ${CBY[k].label} can supply about ${compCap(s, k, t)} kits a year.` }); }
  if (d.train) s.train.push(t);
  const capital = capitalCost(d);

  const er = makeRng(s.seed, STREAM.event + t), fault = {};
  if (er.u() < P.peaceFault) {
    const k = CIDS[Math.floor(er.u() * CIDS.length)];
    fault[k] = P.faultCut[secondActive(s, k, t) ? 1 : 0];
    s.comp[k].known = true;
    log.push({ kind: 'fault', k, text: `A sub-tier supplier of ${CBY[k].label.toLowerCase()} had a quality failure: ${Math.round(fault[k] * 100)}% of its output lost this year${secondActive(s, k, t) ? ' (the second source covered most of it)' : ''}.` });
  }
  const anyPartner = IDS.some(id => partnerActive(s, id, t));
  const held = anyPartner && makeRng(s.seed, STREAM.partner + t).u() < (1 - s.rel) * P.coprod.holdPeace;
  if (held) log.push({ kind: 'partner', text: 'Your co-production partner held back its share this year for its own stocks.' });

  const pr = production(s, d, t, fault, held);
  let cost = 0, value = 0;
  for (const id of IDS) {
    const m = pr.made[id], q = m.own + m.partner, uc = unitCost(s, id, t);
    cost += m.own * uc + m.partner * uc * (1 - P.coprod.discount);
    value += q * listCost(s, id, t);
    s.cls[id][isModern(s, id, t) ? 'modern' : 'legacy'] += q;
    if (m.limitedBy) { s.comp[m.limitedBy].known = true; }
  }
  for (const k of CIDS) if (pr.scale[k] < 1) log.push({ kind: 'bind', k, text: `${CBY[k].label} ran short: lines that need them made only ${Math.round(pr.scale[k] * 100)}% of what was ordered.` });
  for (const id of d.modern) log.push({ kind: 'note', text: `${BY[id].label}: a new type enters production in ${P.startYear + t + P.modern.lead}; the line slows while it changes over.` });
  s.spent += capital + cost; s.value += value;
  s.history.push({ t, d, made: pr.made, scale: pr.scale, cost: Math.round(cost), capital, fault, held, budget: budget(s, t), stock: stockNow(s, t + 1) });
  s.year = t + 1;
  if (s.warYear === t) { s.phase = 'war'; s.war = initWar(s, STREAM.war); log.push({ kind: 'war', text: 'War.' }); }
  else if (s.year >= P.years) { s.phase = 'over'; s.over = { reason: 'peace' }; }
  return { state: s, log };
}

/** Effective stock by class (legacy units count less as the threat moves on; new types count more). */
export function stockNow(s, t = s.year) {
  return Object.fromEntries(IDS.map(id => [id, +(s.cls[id].legacy * legacyEff(t) + s.cls[id].modern * P.modern.eff).toFixed(1)]));
}
