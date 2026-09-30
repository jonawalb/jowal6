// Scripted commanders used by the after-action review and the balance check. Each is a function
// policy(g) -> { orders: [[unitId, destNode]], drone: node }. They read either your picture (reports)
// or the truth, which is how the review separates the cost of fog from the cost of bad luck.
import { NORTH, LINE } from '../data/map.js';
import { belief, truth, unit } from './engine.js';

export const COMMIT = { min: 26, margin: 8 };   // NOTIONAL doctrine: commit when one axis clearly leads

const lastSeen = (g, node) => {
  let t = -99;
  for (const r of g.reports) if (r.node === node && r.arrT <= g.t && r.obsT > t) t = r.obsT;
  return t;
};

/** Drone on the north sector you know least about (the one with the stalest report). */
function droneTarget(g) {
  const recon = unit(g, 'c');
  const cand = NORTH.filter(n => recon.broken || recon.node !== n);
  return cand.reduce((a, b) => (lastSeen(g, b) < lastSeen(g, a) ? b : a));
}

/** Drone on the leading axis if it is not yet confirmed; otherwise on the stalest north sector. */
function droneConfirm(g, pic) {
  const ax = pic.axis, top = ax.indexOf(Math.max(...ax));
  const n = NORTH[top];
  const recent = g.reports.some(r => r.sensor === 'drone' && r.node === n && r.arrT <= g.t && g.t - r.obsT < 2);
  return ax[top] > 0 && !recent ? n : droneTarget(g);
}

/** Doctrinal commander: hold the reserve until one axis clearly carries the main effort, then commit it. */
export function doctrinal(view = 'belief') {
  let committed = false;
  return g => {
    const pic = view === 'truth' ? truth(g) : belief(g);
    const out = { orders: [], drone: view === 'truth' ? droneTarget(g) : droneConfirm(g, pic) };
    if (committed) return out;
    const ax = pic.axis.slice(), top = ax.indexOf(Math.max(...ax));
    const second = Math.max(...ax.filter((_, i) => i !== top));
    if (ax[top] >= COMMIT.min && ax[top] - second >= COMMIT.margin) {
      committed = true;
      out.orders.push(['d', LINE[top]]);
    }
    return out;
  };
}

/** Naive commander: sends the reserve to the first axis where anything is reported. */
export function reactFirst() {
  let committed = false;
  return g => {
    const out = { orders: [], drone: droneTarget(g) };
    if (committed) return out;
    const pic = belief(g);
    const ax = pic.axis, top = ax.indexOf(Math.max(...ax));
    if (ax[top] > 0) { committed = true; out.orders.push(['d', LINE[top]]); }
    return out;
  };
}

/** Static commander: never moves anything. */
export const holdFast = () => () => ({ orders: [], drone: null });

/** Guess commander: commits the reserve at 06:00 to a fixed axis. */
export const guess = axis => g => (g.t === 0 ? { orders: [['d', LINE[axis]]] } : {});

/**
 * "Your plan, perfect information": the same units move at the same hours, but every order that
 * shifts a unit onto a different axis is re-aimed at the axis Red's main effort actually used.
 * Orders that keep a unit on its own axis, or send it to the crossing, are unchanged.
 */
export function aimAtTruth(g0, orders) {
  const main = g0.plan.main;
  const axisOf = n => { const i = LINE.indexOf(n); if (i >= 0) return i; const j = NORTH.indexOf(n); return j >= 0 ? j : null; };
  const pos = Object.fromEntries(g0.units.filter(u => u.side === 'blue').map(u => [u.id, g0.snaps[0].units.find(s => s.id === u.id).node]));
  return orders.map(o => {
    const from = pos[o.unit], a = axisOf(o.dest), fa = axisOf(from);
    pos[o.unit] = o.dest;
    if (a === null || a === fa) return o;
    const dest = LINE.includes(o.dest) ? LINE[main] : NORTH[main];
    pos[o.unit] = dest;
    return { ...o, dest };
  });
}
