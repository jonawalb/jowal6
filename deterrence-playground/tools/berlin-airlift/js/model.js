// Airlift model: aircraft x trips x payload, limited by landing slots in Berlin and by the weather.
// Pure logic, no DOM. `capacity()` computes one day's throughput for a plan; `step()` advances the game a day.
import { FLEET, C54_GATES, NORTH_CAP, DEPOT, PROJECTS, PROJECT_RATE, PROJECT_MIN_FRAC, WEATHER, COEF_DEFAULT } from '../data/params.js';
import { REQUIREMENT } from '../data/history.js';
import { START, N_DAYS, dateOf, dayOf, monthOf, interp, stepVal, rng, poisson, clamp } from './util.js';

export const PLAN_DEFAULT = { north: 0, c47: 200, dak: true, interval: 3, approach: 'stack', hours: 90, field: false, coal: 45, food: 40, build: 50, prio: 'thf' };
const MISSED = [0.01, 0.06, 0.25];     // notional share of approaches missed in good, instrument, fog weather
const WX_ACC = [0.8, 1.3, 2];            // notional accident multiplier by weather
const INT_ACC = { 2: 1.6, 2.5: 1.25, 3: 1, 3.5: 0.92, 4: 0.85, 4.5: 0.78, 5: 0.7 }; // notional, by landing interval
const RAMP = [['1948-06-26', 0.15], ['1948-07-10', 0.6], ['1948-07-24', 1]]; // notional start-up; USAFE planned 450 t/day by 30 June and 1,500 by 10 July (MILLER p. 31)
const REPAIR_DAYS = 30;                // notional days out after a major accident
const GRACE = 3;
const FRESH = 150;                     // notional flying hours an arriving C-54 has before its first 200-hour inspection
const EXPECT = [['1948-06-26', 500], ['1948-07-10', 1500], ['1948-08-21', 4500]]; // notional ramp of what Washington expects; USAFE planned 1,500 t/day by 10 July (MILLER p. 31)                       // notional overdue inspections before aircraft are grounded

export function requirement(d) {
  let r = REQUIREMENT[0];
  for (const x of REQUIREMENT) if (d >= x.from) r = x;
  return { total: r.total, coal: r.coal, food: r.food, other: r.total - r.coal - r.food };
}

/** Weather for every day, [south, north]: 0 good, 1 instrument, 2 below minimums. North (British zone) is
 *  one step better on 30 percent of bad days (notional; MILLER p. 27 and 95 say it had milder weather and less fog). */
export function makeWeather(seed) {
  const r = rng(seed * 7919 + 17);
  const out = [];
  let prev = 0;
  for (let i = 0; i < N_DAYS; i++) {
    const d = dateOf(i);
    const p = WEATHER[monthOf(d)];
    let s;
    if (i > 0 && r() < 0.45) s = prev; // spells of weather persist (notional)
    else { const x = r(); s = x < p[0] ? 0 : x < p[0] + p[1] ? 1 : 2; }
    if (d === '1948-08-13') s = 2; // Black Friday
    const n = s > 0 && r() < 0.3 ? s - 1 : s;
    out.push([s, n]); prev = s;
  }
  return out;
}

export function newGame(seed, coef = {}, plan = {}) {
  const k = { ...COEF_DEFAULT, ...coef };
  const g = {
    seed, coef: k, plan: { ...PLAN_DEFAULT, ...plan }, day: 0, wx: makeWeather(seed), r: rng(seed * 104729 + 3),
    flags: { july: null, oct: null }, extra: 0, c54: 0, fresh: 0, dmg: [], fatigue: 0, due: 0, inWork: [],
    stocks: {}, support: k.support0, cum: 0, rec: [], log: [], proj: {}, record: false, starve: 0, over: false, outcome: null,
    fired: {}, week: { tons: 0, exp: 0, n: 0 }, best: 0,
  };
  const q = requirement(START);
  g.stocks = { food: k.foodDays0 * q.food, coal: k.coalDays0 * q.coal, other: k.otherDays0 * q.other };
  for (const p of PROJECTS) g.proj[p.k] = { tons: 0, done: null, need: PROJECT_RATE / 2 * (dayOf(p.hist) - dayOf(p.start)) };
  return g;
}

/** Aircraft in theater on date d, before damage and inspections. */
export function fleetOn(g, d) {
  return {
    c54: g.c54, c47: Math.round(interp(FLEET.c47, d)), dak: Math.round(interp(FLEET.dak, d)),
    york: Math.round(interp(FLEET.york, d)), hast: Math.round(interp(FLEET.hast, d)), civ: Math.round(interp(FLEET.civ, d)),
  };
}

export const northCap = d => stepVal(NORTH_CAP, d);
export const projectOpen = (g, k) => !!g.proj[k].done;

function c54Target(g, d) {
  let t = interp(FLEET.c54, d);
  if (g.flags.july !== true) t = Math.min(t, C54_GATES.july.cap);
  if (g.flags.oct !== true) t = Math.min(t, C54_GATES.october.cap);
  return t + g.extra;
}


/** One day's throughput. wx = [south, north]. Returns landings, tons, slots and the binding limit. */
export function capacity(g, d, wx, opt = {}) {
  const k = g.coef, p = g.plan;
  const rec = opt.record ?? g.record;
  const f = fleetOn(g, d);
  const dmg = t => g.dmg.filter(x => x.t === t).length;
  const inWork = g.inWork.reduce((s, x) => s + x.n, 0);
  const grounded = Math.max(0, g.due - GRACE);
  // On record days planners massaged the maintenance schedule to put the most aircraft up (MILLER p. 100); +0.15 is notional.
  const av = Math.min(0.95, k.avail - (p.field ? k.fieldCost : 0) + (rec ? 0.15 : 0));
  const c54svc = Math.max(0, f.c54 - dmg('c54') - inWork - grounded);
  const nN = Math.min(p.north, northCap(d), f.c54);
  const share = f.c54 > 0 ? nN / f.c54 : 0;
  const ramp = interp(RAMP, d);
  const fat = 1 - Math.max(0, g.fatigue - 50) / 100;
  const H = (rec ? 150 : p.hours) * fat;
  const cu = k.crewUS, cb = k.crewBR;
  // Trips a stream can fly: crews (per aircraft in theater) x hours / round trip, capped by the aircraft
  // in commission x the cycles that fit in a day.
  const trips = (nTheater, nUp, rt, crew) => ramp * Math.min(nTheater * crew * H / 30 / rt, nUp * av * 24 / (rt + k.ground));
  const c54th = Math.max(0, f.c54 - dmg('c54'));
  const tS = c54th * (1 - share), tN = c54th * share;
  const uS = c54svc * (1 - share), uN = c54svc * share;
  const up = (n, t) => Math.max(0, n - dmg(t));
  const nc47 = up(Math.min(p.c47, f.c47), 'c47');
  const south = [
    { t: 'c54', n: trips(tS, uS, k.rtSouth, cu), pay: k.payC54, rt: k.rtSouth },
    { t: 'c47', n: trips(nc47, nc47, k.rtC47, cu), pay: k.payC47, rt: k.rtC47 },
  ];
  const br = t => up(t === 'dak' && !p.dak ? 0 : f[t], t);
  const north = [
    { t: 'c54', n: trips(tN, uN, k.rtNorth, cu), pay: k.payC54, rt: k.rtNorth },
    ...['hast', 'york', 'civ', 'dak'].map(t => ({ t, n: trips(br(t), br(t), k.rtNorth, cb), pay: k[{ hast: 'payHast', york: 'payYork', civ: 'payCiv', dak: 'payDak' }[t]], rt: k.rtNorth })),
  ];
  const wf = w => w === 0 ? 1 : w === 1 ? (d < '1948-10-01' ? k.wxIfrEarly : k.wxIfr) : k.wxFog;
  const iv = rec ? Math.min(3, p.interval) : p.interval;
  const thf = projectOpen(g, 'thfSouth') ? (projectOpen(g, 'thfNorth') ? 1.1 : 1) : k.thfEarly;
  const gInt = p.dak && f.dak > 0 ? Math.max(iv, k.gatowMixed) : iv;
  const tegel = projectOpen(g, 'tegel') ? (d >= '1948-12-16' ? 1 : k.tegelTowers) : 0;
  const eff = (slots, w) => {
    const m = MISSED[w];
    if (p.approach === 'stack') return { slots: slots * Math.max(k.stackRatio, 1 - m * (1 / k.stackRatio - 1)), del: 1 };
    return { slots, del: 1 - m };
  };
  const S = eff(1440 / iv * thf * wf(wx[0]), wx[0]);
  const G = eff(1440 / gInt * wf(wx[1]), wx[1]);
  const X = eff(1440 / iv * tegel * wf(wx[1]), wx[1]);
  const fill = (list, slots) => {
    let left = slots;
    return [...list].sort((a, b) => b.pay - a.pay).map(x => { const l = Math.min(x.n, left); left -= l; return { ...x, land: l }; });
  };
  const s = fill(south, S.slots), n = fill(north, G.slots + X.slots);
  const demS = south.reduce((a, x) => a + x.n, 0), demN = north.reduce((a, x) => a + x.n, 0);
  const landS = s.reduce((a, x) => a + x.land, 0), landN = n.reduce((a, x) => a + x.land, 0);
  const tons = s.reduce((a, x) => a + x.land * x.pay, 0) * S.del + n.reduce((a, x) => a + x.land * x.pay, 0) * (G.slots + X.slots > 0 ? (G.slots * G.del + X.slots * X.del) / (G.slots + X.slots) : 1);
  const nG = G.slots + X.slots > 0 ? landN * G.slots / (G.slots + X.slots) : 0;
  return {
    tons, flights: landS + landN, south: s, north: n, demS, demN, slotsS: S.slots, slotsN: G.slots + X.slots,
    land: { thf: landS, gat: nG, teg: landN - nG }, slots: { thf: S.slots, gat: G.slots, teg: X.slots },
    limitS: demS > S.slots + 0.5 ? 'slots' : 'fleet', limitN: demN > G.slots + X.slots + 0.5 ? 'slots' : 'fleet',
    c54svc, grounded, inWork, H, iv, avail: av, fleet: f,
    hoursC54: s[0] && s.find(x => x.t === 'c54').land * k.rtSouth + n.find(x => x.t === 'c54').land * k.rtNorth,
  };
}

/** Advance one day. Returns the day's record. Events are handled by the caller before each step. */
export function step(g) {
  const k = g.coef, p = g.plan, d = dateOf(g.day), r = g.r;
  const q = requirement(d);
  // Fleet arrivals toward the authorized target, at up to 6 C-54s a day (notional pace).
  const tgt = c54Target(g, d);
  if (g.c54 < tgt) { const add = Math.min(tgt, g.c54 + 6) - g.c54; g.c54 += add; g.fresh += add * FRESH; }
  g.dmg = g.dmg.filter(x => x.until > g.day);
  g.inWork = g.inWork.filter(x => x.until > g.day);
  const wx = g.wx[g.day];
  const c = capacity(g, d, wx);
  if (c.grounded > 0.5 && !g.warned) { g.warned = true; g.log.push({ d, kind: 'bad', text: 'C-54s grounded: 200-hour inspections are overdue. Turn on field inspections or cut crew hours.' }); }
  if (c.grounded < 0.1) g.warned = false;
  // Construction lift comes out of the day's tonnage.
  const active = Object.entries(g.proj).filter(([key, v]) => !v.done && d >= PROJECTS.find(x => x.k === key).start);
  // Active projects share the construction lift equally; the priority project gets a double share.
  const prioKey = p.prio === 'tegel' ? 'tegel' : null;
  const w = ([key]) => (prioKey ? (key === prioKey ? 2 : 1) : (key === 'thfSouth' ? 2 : 1));
  const wsum = active.reduce((a, x) => a + w(x), 0);
  let build = active.length ? Math.min(p.build, c.tons * 0.25) : 0;
  let left = build;
  for (const x of active) {
    const [key, pr] = x; const meta = PROJECTS.find(y => y.k === key);
    const take = Math.min(build * w(x) / wsum, pr.need - pr.tons); pr.tons += take; left -= take;
    const minDay = dayOf(meta.start) + Math.round(PROJECT_MIN_FRAC * (dayOf(meta.hist) - dayOf(meta.start)));
    if (pr.tons >= pr.need - 0.01 && g.day >= minDay) { pr.done = d; g.log.push({ d, kind: 'good', text: `${meta.name} opens.` }); }
  }
  build -= left;
  const city = c.tons - build;
  const coalPct = g.record ? 100 : p.coal, foodPct = g.record ? 0 : p.food;
  const got = { coal: city * coalPct / 100, food: city * foodPct / 100, other: city * Math.max(0, 100 - coalPct - foodPct) / 100 };
  const short = {};
  for (const key of ['food', 'coal', 'other']) {
    g.stocks[key] += got[key] - q[key] * (key === 'food' ? 1 - k.foodOutside : 1);
    short[key] = g.stocks[key] < 0;
    if (g.stocks[key] < 0) g.stocks[key] = 0;
  }
  // 200-hour inspections for the C-54 fleet.
  const credit = Math.min(g.fresh, c.hoursC54); g.fresh -= credit;
  g.due += (c.hoursC54 - credit) / k.inspHours;
  const capI = interpDepot(d) / 30 + (p.field ? k.fieldPerDay : 0);
  const done = Math.min(g.due, capI);
  g.due -= done;
  if (done > 0) g.inWork.push({ n: done, until: g.day + k.inspDays });
  // Crew fatigue (notional): drifts toward a level set by the monthly hours (0 at 90 h, 35 at 120 h,
  // 70 at 150 h) over about two weeks.
  const H = g.record ? 150 : p.hours;
  const fTarget = clamp((H - 90) * 70 / 60, 0, 100);
  g.fatigue = clamp(g.fatigue + (fTarget - g.fatigue) / 14 + (g.record ? 3 : 0), 0, 100);
  // Accidents.
  const iv = c.iv;
  const mult = WX_ACC[Math.max(wx[0], wx[1])] * (1 + g.fatigue / 100) * (INT_ACC[iv] ?? 1) * (p.approach === 'stack' && Math.max(...wx) > 0 ? 2 : 1) * (c.grounded > 0 ? 1.2 : 1);
  const lamUS = (c.south.reduce((a, x) => a + x.land, 0) + c.north.find(x => x.t === 'c54').land) * k.accUS * mult;
  const lamBR = c.north.filter(x => x.t !== 'c54').reduce((a, x) => a + x.land, 0) * k.accBR * mult;
  let acc = 0, fatal = 0;
  const hit = (list, n) => {
    for (let i = 0; i < n; i++) {
      const tot = list.reduce((a, x) => a + x.land, 0); if (!tot) return;
      let u = r() * tot, t = list[0].t;
      for (const x of list) { u -= x.land; if (u <= 0) { t = x.t; break; } }
      const dead = r() < k.fatalShare;
      acc++; if (dead) fatal++;
      g.dmg.push({ t, until: g.day + REPAIR_DAYS });
      g.log.push({ d, kind: dead ? 'bad' : 'warn', text: `${NAMES[t]} ${dead ? 'crashes; crew killed' : 'damaged in a landing accident; out for about a month'}.` });
    }
  };
  hit([...c.south, c.north.find(x => x.t === 'c54')], poisson(r, lamUS));
  hit(c.north.filter(x => x.t !== 'c54'), poisson(r, lamBR));
  // Politics.
  g.support -= fatal * 1.5 + (acc - fatal) * 0.2;
  if (short.food) g.support -= 1;
  if (short.coal) g.support -= 0.4;
  g.starve = short.food ? g.starve + 1 : 0;
  g.week.tons += c.tons; g.week.exp += Math.min(q.total, interp(EXPECT, d)); g.week.n++;
  if (g.week.n === 7) {
    const ratio = g.week.tons / g.week.exp;
    g.support += clamp(10 * (ratio - 1), -3, 3);
    if (g.stocks.food / q.food < 10) g.support -= 2;
    if (g.stocks.coal / q.coal < 10) g.support -= 2;
    g.week = { tons: 0, exp: 0, n: 0 };
  }
  g.support = clamp(g.support, 0, 100);
  g.cum += c.tons;
  const rec = {
    day: g.day, d, wx, tons: c.tons, flights: c.flights, build, req: q.total, land: c.land, slots: c.slots, acc, fatal,
    food: g.stocks.food / q.food, coal: g.stocks.coal / q.coal, support: g.support, cum: g.cum, record: g.record,
    c54: c.fleet.c54, limitS: c.limitS, limitN: c.limitN, grounded: c.grounded, hours: H,
    stack: p.approach === 'stack' && Math.max(...wx) > 0,
  };
  g.rec.push(rec);
  if (g.record) { g.best = Math.max(g.best, c.tons); g.log.push({ d, kind: 'good', text: `Record attempt: ${Math.round(c.tons).toLocaleString('en-US')} tons in ${Math.round(c.flights).toLocaleString('en-US')} landings.` }); g.record = false; }
  g.day++;
  if (g.support <= 0) { g.over = true; g.outcome = 'abandoned'; }
  else if (g.starve >= 5) { g.over = true; g.outcome = 'starved'; }
  else if (g.day >= N_DAYS) { g.over = true; g.outcome = 'lifted'; }
  return rec;
}

function interpDepot(d) { return stepVal(DEPOT, d); }

export const NAMES = { c54: 'A C-54', c47: 'A C-47', york: 'An RAF York', hast: 'An RAF Hastings', dak: 'An RAF Dakota', civ: 'A British civil transport' };
