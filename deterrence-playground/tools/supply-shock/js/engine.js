// Game state and the yearly turn: event → your actions → the Supplier's response → projects advance →
// supply settles. No DOM: the same code runs in the page, the tests and the balance script.
import { P } from '../data/params.js';
import { MINERALS, IDS, BY } from '../data/minerals.js';
import { ACT, cost, pc, blocked, SITE_LABEL } from '../data/actions.js';
import { EVENTS } from '../data/events.js';
import { makeRng, STREAM } from './rng.js';
import { decide, updateBelief } from './supplier.js';
import { settle, outputFrom } from './market.js';

const clone = s => JSON.parse(JSON.stringify(s));
/** Triangular draw on [lo, hi] with mode md, from a uniform u. */
export function tri(u, lo, md, hi) {
  const f = (md - lo) / (hi - lo);
  return u < f ? lo + Math.sqrt(u * (hi - lo) * (md - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - md));
}

export function newGame({ seed }) {
  const r = makeRng(seed, STREAM.setup);
  const type = P.types[r.pick(P.types.map(t => P.prior[t]))];
  return {
    seed, t: 0, type, budget: P.budget, pc: P.pcStart, tension: P.tensionStart, coalition: 0, coalAge: 0, permit: false,
    m: Object.fromEntries(MINERALS.map(({ id, game: g }) => [id, { ore: g.ore, ref: g.ref, recycled: g.recycled, recycleOn: false, recycleAt: null,
      thrift: 0, thriftOn: false, thriftAt: null, thriftOk: null, stock: 0, dump: 0, ctrlYears: 0 }])),
    ctrl: Object.fromEntries(IDS.map(id => [id, 'open'])),
    projects: [], offtakes: [], nextId: 1, belief: { ...P.prior }, history: [], choices: [],
    event: null, yr: { bump: {}, refOut: {}, offtakePause: false }, spent: 0, waste: 0, upkeep: 0, unspent: 0, over: false,
  };
}

/** Start the year: upkeep comes off the budget, then the year's event. Call once per year before choosing. */
export function brief(state) {
  const s = clone(state);
  s.yr = { bump: {}, refOut: {}, offtakePause: false };
  s.upkeep = +(P.stock.carry * IDS.reduce((t, m) => t + s.m[m].stock, 0)).toFixed(2);
  s.budget = Math.max(0, +(P.budget - s.upkeep).toFixed(2));
  s.spent += P.budget - s.budget;
  s.upkeepTotal = (s.upkeepTotal || 0) + (P.budget - s.budget);
  const r = makeRng(s.seed, STREAM.event + s.t);
  const pool = EVENTS.filter(e => e.when(s));
  const e = pool[r.pick(pool.map(x => x.w))];
  s.event = { id: e.id, title: e.title, text: '' };
  e.apply(s, r);
  return s;
}

const label = a => ACT[a.id].label + (a.m ? ` · ${BY[a.m].name}` : '') + (a.site ? ` · ${SITE_LABEL[a.site]}` : '') + (a.floor ? ' · price floor' : '');
export { label as actionLabel };

function apply(s, a, i, log) {
  const r = makeRng(s.seed, STREAM.project + s.t * 16 + i);
  if (a.id === 'mine' || a.id === 'refinery') {
    const k = P[a.id][a.site];
    let lead = tri(r.u(), ...k.lead);
    if (s.permit && a.site === 'dom') lead *= 1 - P.permitCut;
    lead = Math.max(1, Math.round(lead));
    s.projects.push({ id: s.nextId++, kind: a.id, m: a.m, site: a.site, cap: k.cap, lead, left: lead, start: s.t, floor: !!a.floor, status: 'build', cost: cost(a, s), slips: 0 });
    s.tension = Math.min(100, s.tension + P.tensionFrom[a.id] * (a.site === 'dom' ? 1 : 0.6));
    log.push({ kind: 'act', text: `${label(a)}: about ${lead} year${lead > 1 ? 's' : ''} to online (if nothing slips).` });
  } else if (a.id === 'stock') {
    s.m[a.m].stock += P.stock.months; s.tension = Math.min(100, s.tension + P.tensionFrom.stock);
    log.push({ kind: 'act', text: `${label(a)}: +${P.stock.months} months (now ${Math.round(s.m[a.m].stock)}).` });
  } else if (a.id === 'offtake') {
    s.offtakes.push({ m: a.m, cap: P.offtake.cap, on: false, start: s.t, ended: false });
    s.tension = Math.min(100, s.tension + P.tensionFrom.offtake);
    log.push({ kind: 'act', text: `${label(a)}: deliveries start next year.` });
  } else if (a.id === 'recycle') {
    Object.assign(s.m[a.m], { recycleOn: true, recycleAt: s.t });
    log.push({ kind: 'act', text: `${label(a)}: recovered material starts in ${P.recycle.ramp} years.` });
  } else if (a.id === 'thrift') {
    Object.assign(s.m[a.m], { thriftOn: true, thriftAt: s.t, thriftOk: r.u() < P.thrift.success, thriftCost: cost(a, s) });
    log.push({ kind: 'act', text: `${label(a)}: results in ${P.thrift.lag} years.` });
  } else if (a.id === 'permit') {
    s.permit = true;
    for (const p of s.projects) if (p.status === 'build' && p.site === 'dom') p.left = Math.max(1, Math.round(p.left * (1 - P.permitCut)));
    log.push({ kind: 'act', text: 'Permitting reform passes: domestic projects speed up; local opposition becomes likelier.' });
  } else if (a.id === 'diplo') {
    s.coalition += 1; s.coalAge = 0; s.tension = Math.min(100, s.tension + P.tensionFrom.diplo);
    log.push({ kind: 'act', text: `Buyers’ coalition now level ${s.coalition} of ${P.diplo.max}.` });
  }
}

function advance(s, log) {
  const r = makeRng(s.seed, STREAM.project + 1000 + s.t);
  for (const p of s.projects) {
    const u = [r.u(), r.u(), r.u(), r.u()];
    if (p.status !== 'build') continue;
    const k = P[p.kind][p.site], what = `${p.site === 'dom' ? 'Domestic' : 'Allied'} ${BY[p.m].name.toLowerCase()} ${p.kind === 'mine' ? 'mine' : 'refinery'}`;
    if (s.m[p.m].dump > 0 && !p.floor && u[0] < P.abandonOnDump) { p.status = 'abandoned'; s.waste += p.cost; log.push({ kind: 'bad', text: `${what} abandoned: dumped prices made it uneconomic.` }); continue; }
    if (u[1] < k.fail) { p.status = 'failed'; s.waste += p.cost; log.push({ kind: 'bad', text: `${what} failed (geology, financing or engineering).` }); continue; }
    const opp = p.site === 'dom' ? k.community + (s.permit ? P.permitCommunity : 0) : 0;
    if (u[2] < opp) { p.left += 1; p.slips++; log.push({ kind: 'warn', text: `${what}: local opposition, one year lost.` }); continue; }
    if (u[3] < k.delay) { p.slips++; log.push({ kind: 'warn', text: `${what} slipped a year.` }); continue; }
    p.left -= 1;
    if (p.left <= 0) { p.status = 'online'; p.online = s.t; log.push({ kind: 'good', text: `${what} is online (+${p.cap}).` }); }
  }
  const rp = makeRng(s.seed, STREAM.project + 2000 + s.t);
  for (const o of s.offtakes) {
    const u = rp.u();
    if (!o.on) continue;
    const lapse = P.offtake.lapse + (s.ctrl[o.m] !== 'open' && s.type !== 'commercial' ? P.offtake.pressured : 0);
    if (u < lapse) { o.on = false; o.ended = true; log.push({ kind: 'bad', text: `The ${BY[o.m].name.toLowerCase()} offtake partner walked away.` }); }
  }
  for (const m of IDS) {
    const x = s.m[m];
    if (x.recycleOn && s.t - x.recycleAt >= P.recycle.ramp) x.recycled = Math.min(BY[m].game.recycleCap, x.recycled + P.recycle.perYear);
    if (x.thriftOn && s.t - x.thriftAt >= P.thrift.lag) {
      if (x.thriftOk) x.thrift = Math.min(P.thrift.cap, x.thrift + P.thrift.perYear);
      else if (s.t - x.thriftAt === P.thrift.lag) { s.waste += x.thriftCost || P.thrift.cost; log.push({ kind: 'bad', text: `${BY[m].name} substitution research came up empty.` }); }
    }
  }
}

/** Resolve one year with the player's actions [{ id, m?, site?, floor? }]. Returns { state, log }. */
export function resolveYear(state, actions, opts = {}) {
  const s = clone(state), log = [];
  const done = [];
  actions.forEach((a, i) => {
    const why = blocked(a, s, done);
    if (why) { log.push({ kind: 'warn', text: `${label(a)} not carried out: ${why}.` }); return; }
    done.push(a);
  });
  const budget0 = s.budget, pc0 = s.pc;
  done.forEach((a, i) => { s.spent += cost(a, state); apply(s, a, i, log); });
  s.budget = +(budget0 - done.reduce((t, a) => t + cost(a, state), 0)).toFixed(2);
  s.pc = pc0 - done.reduce((t, a) => t + pc(a), 0);
  s.unspent += Math.max(0, s.budget);

  // The Supplier responds to the world as you have just left it.
  const moves = decide(s, makeRng(s.seed, STREAM.supplier + s.t));
  if (!opts.noBelief) s.belief = updateBelief(s.belief, s, moves);
  for (const mv of moves) {
    s.ctrl[mv.m] = mv.to;
    if (mv.dump) s.m[mv.m].dump = P.dumpYears;
  }

  advance(s, log);
  const rows = IDS.map(m => settle(s, m));
  const output = outputFrom(rows);

  s.history.push({ t: s.t, event: s.event, actions: done, moves, rows, output, belief: { ...s.belief }, tension: s.tension, coalition: s.coalition, log });
  s.choices.push(actions.map(a => [a.id, a.m || 0, a.site || 0, a.floor ? 1 : 0]));

  for (const m of IDS) { const x = s.m[m]; if (x.dump > 0) x.dump -= 1; x.ore *= 1 + P.allyGrowth; x.ctrlYears = s.ctrl[m] === 'open' ? 0 : x.ctrlYears + 1; }
  for (const o of s.offtakes) if (!o.on && !o.ended && o.start === s.t) o.on = true;
  s.tension = Math.max(0, s.tension - P.tensionDecay);
  if (s.coalition > 0 && ++s.coalAge >= P.diplo.decayEvery) { s.coalition -= 1; s.coalAge = 0; }
  s.pc = Math.min(P.pcCap, s.pc + P.pcRegen + (output < P.crisisOutput ? P.pcCrisisBonus : 0));
  s.t += 1;
  s.over = s.t >= P.years;
  return { state: s, log };
}

// Copy links: v1.<seed>.<base64url JSON of each year's actions as [id, mineral, site, floor]>.
const b64 = str => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(str))) : Buffer.from(str, 'utf8').toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = str => { const t = str.replace(/-/g, '+').replace(/_/g, '/'); return typeof atob === 'function' ? decodeURIComponent(escape(atob(t))) : Buffer.from(t, 'base64').toString('utf8'); };
export const encode = s => `v1.${s.seed}${s.choices.length ? '.' + b64(JSON.stringify(s.choices)) : ''}`;
export function decode(str) {
  const [v, seed, body] = String(str).split('.');
  if (v !== 'v1' || !/^\d+$/.test(seed || '')) return null;
  let years = [];
  try {
    years = body ? JSON.parse(unb64(body)).slice(0, P.years).map(y => (Array.isArray(y) ? y : []).filter(a => Array.isArray(a) && ACT[a[0]])
      .map(([id, m, site, floor]) => ({ id, ...(m ? { m } : {}), ...(site ? { site } : {}), ...(floor ? { floor: true } : {}) }))) : [];
  } catch { years = []; }
  return { seed: +seed, years };
}

/** Play a whole game with a policy(state, rng) → actions. Used by baselines, the benchmark and balance. */
export function playOut(seed, policy, aiSeed = 0) {
  let s = newGame({ seed });
  while (!s.over) {
    s = brief(s);
    const acts = policy(s, makeRng(seed + aiSeed * 7919, STREAM.ai + s.t));
    s = resolveYear(s, acts).state;
  }
  return s;
}
