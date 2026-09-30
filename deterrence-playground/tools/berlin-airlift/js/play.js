// Events, requests and the historical autopilot, on top of the model.
import { EVENTS } from '../data/events.js';
import { MONTHLY } from '../data/history.js';
import { dateOf, fmtDate } from './util.js';
import { step, northCap } from './model.js';

/** Event due today and not yet answered, or null. */
export function dueEvent(g) {
  const d = dateOf(g.day);
  return EVENTS.find(e => !(e.id in g.fired) && e.date <= d) || null;
}

/** Apply a choice. Effect sizes on political support are notional. */
export function choose(g, ev, i) {
  const c = ev.choices[i];
  g.fired[ev.id] = i;
  const fx = {
    none() {},
    askJuly() { g.flags.july = true; g.support -= 3; },
    declineJuly() { g.flags.july = false; },
    askOct() { g.flags.oct = true; g.support -= 3; },
    declineOct() { g.flags.oct = false; },
    straightIn() { g.plan.approach = 'straight'; },
    fillNorth() { g.plan.north = Math.max(g.plan.north, northCap(dateOf(g.day))); },
    rally() { g.support += 6; },
    recordDay() { g.record = true; },
    stalin() { g.support += 4; },
    deal() { g.support += 5; },
  }[c.fx];
  fx();
  g.support = Math.max(0, Math.min(100, g.support));
  if (ev.choices.length > 1) g.log.push({ d: dateOf(g.day), kind: 'info', text: `${ev.title}: ${c.label.toLowerCase()}.` });
}

/** What the "Ask Washington" button would do now, or null if nothing is available. */
export function requestOption(g) {
  const d = dateOf(g.day);
  if (d < '1948-07-22') return null;
  if (g.flags.july !== true) return { key: 'july', label: 'Ask for the summer C-54 build-up', cost: 3 };
  if (d >= '1948-10-01' && g.flags.oct !== true) return { key: 'oct', label: 'Ask for the winter C-54 build-up', cost: 3 };
  if (d >= '1948-10-22' && g.extra < 40) return { key: 'extra', label: 'Ask for 20 more C-54s', cost: 4 };
  return null;
}

export function request(g) {
  const o = requestOption(g);
  if (!o) return;
  if (o.key === 'july') g.flags.july = true;
  else if (o.key === 'oct') g.flags.oct = true;
  else g.extra += 20;
  g.support = Math.max(0, g.support - o.cost);
  g.log.push({ d: dateOf(g.day), kind: 'info', text: `Requested C-54s from Washington (support -${o.cost}).` });
}

/** Historical choices, used by the autopilot. Crew hours and the date field inspections start are the
 *  tool's reading of the record (surge flying in summer 1948, field inspections from November), not sourced numbers. */
export function historicalPlan(g) {
  const d = dateOf(g.day);
  const m = MONTHLY.find(x => x.m === d.slice(0, 7)) || MONTHLY[MONTHLY.length - 1];
  const coal = Math.round(100 * m.coal / m.total), food = Math.round(100 * m.food / m.total);
  return {
    north: northCap(d), c47: 200, dak: true, interval: 3,
    approach: d > '1948-08-13' ? 'straight' : 'stack',
    hours: 90,
    field: d >= '1948-11-01',
    coal, food, build: 50, prio: 'thf',
  };
}

/** Run up to n days, stopping at events (unless auto) and at the end. Returns the event that stopped play. */
export function run(g, n, { auto = false } = {}) {
  for (let i = 0; i < n && !g.over; i++) {
    let ev = dueEvent(g);
    while (ev) {
      if (!auto) return ev;
      choose(g, ev, Math.max(0, ev.choices.findIndex(c => c.hist)));
      ev = dueEvent(g);
    }
    if (auto) Object.assign(g.plan, historicalPlan(g));
    const before = g.cum;
    step(g);
    if (before < 1e6 && g.cum >= 1e6) {
      g.support = Math.min(100, g.support + 3);
      g.log.push({ d: dateOf(g.day - 1), kind: 'good', text: `The millionth ton reaches Berlin on ${fmtDate(dateOf(g.day - 1))}. Historically it arrived on 18 February 1949.` });
    }
  }
  return g.over ? null : dueEvent(g);
}
