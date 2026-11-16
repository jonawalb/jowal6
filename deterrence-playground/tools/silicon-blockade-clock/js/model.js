// Silicon Blockade Clock: the chain from Taiwan's fuel stocks to world AI accelerator deliveries.
// energy stocks -> grid supply -> power to the chip sector -> leading-edge fab and packaging output in Taiwan
// -> exports -> buffers and alternatives outside Taiwan -> world deliveries.
// All quantities are shares of normal (pre-crisis) daily output unless noted. Pure functions, no DOM.
import { simulateEnergy } from './energy-model.js';

export const HORIZON = 365;

/** Share of normal power that reaches leading-edge fabs and packaging lines, given the chip sector's served share. */
export function leadingEdgePower(chipServed, leShare, protect) {
  if (!protect) return chipServed;
  return Math.min(1, chipServed / Math.max(leShare, 1e-6));
}

/** Output a fab block can sustain on a given share of its power. Below full power, rotating cuts lose some output. */
export function powerToUtil(x, rationLoss) {
  return x >= 0.999 ? 1 : Math.max(0, x * (1 - rationLoss));
}

/** Output of one alternative on day t, given the day the shortfall was first seen (t0). Linear ramp after a delay. */
export function altOutput(alt, t, t0) {
  if (t0 == null || t < t0 + alt.delay) return 0;
  return alt.cap * Math.min(1, (t - t0 - alt.delay) / Math.max(1, alt.ramp));
}

/**
 * cfg: {
 *   dur, energyCut, inputCut, exportCut (0-1), stock {lng,coal,oil}, policy,
 *   p: { leShare, protect, rationLoss, restartDays, matDays, matRestock, chanWeeks, nonTw, release, catchUp, weeklyUnits },
 *   alts: [{ k, cap, delay, ramp }]
 * }
 * Conservation: every chip made is either delivered, held in stock abroad or stranded in Taiwan. Nothing is discarded.
 * Demand not met on the day becomes a backlog that later supply clears, at most catchUp above normal per day.
 */
export function simulate(cfg) {
  const H = cfg.horizon || HORIZON, p = cfg.p;
  const energy = simulateEnergy({ horizon: H, energyCut: cfg.energyCut, dur: cfg.dur, stock: cfg.stock, policy: cfg.policy });
  const matCap = p.matDays;
  const inv0 = p.chanWeeks * 7;
  let mat = matCap, util = 1, stranded = 0, inv = inv0, backlog = 0, t0 = null;
  const days = [];
  let throttle = null, shortDay = null, recover = null, cleared = null, cumShort = 0, made = 0, deliveredSum = 0;
  for (let t = 0; t < H; t++) {
    const on = t < cfg.dur;
    const e = energy.days[t];
    const lePower = leadingEdgePower(e.served.chips, p.leShare, p.protect);
    const pUtil = powerToUtil(lePower, p.rationLoss);
    // Process materials and parts: a stock in days of full-rate use, refilled by inbound cargo.
    const matIn = on ? 1 - cfg.inputCut : 1 + p.matRestock;
    const matAvail = mat + matIn;
    const want = Math.min(pUtil, matAvail);
    // Cuts bite at once; recovery is limited by the time to requalify tools after a power loss.
    util = want < util ? want : Math.min(want, util + 1 / Math.max(1, p.restartDays));
    mat = Math.min(matCap, Math.max(0, matAvail - util));
    // Exports: what leaves Taiwan. Stranded output ships after the blockade lifts, at most `release` a day.
    const out = on ? 1 - cfg.exportCut : 1;
    let shipped = util * out;
    stranded += util - shipped;
    if (!on && stranded > 0) { const r = Math.min(stranded, p.release); shipped += r; stranded -= r; }
    const twSupply = (1 - p.nonTw) * shipped;
    if (t0 == null && on && twSupply < (1 - p.nonTw) * 0.95) t0 = t;
    // Alternatives run only to fill the gap: today's demand, backlog catch-up and refilling stock abroad.
    const altCap = cfg.alts.map(a => altOutput(a, t, t0));
    const capSum = altCap.reduce((a, b) => a + b, 0);
    const need = 1 + Math.min(backlog, p.catchUp) + Math.max(0, inv0 - inv) - twSupply - p.nonTw;
    const f = capSum > 0 ? Math.min(1, Math.max(0, need) / capSum) : 0;
    const alts = altCap.map(c => c * f);
    const altSum = capSum * f;
    const supplyIn = twSupply + p.nonTw + altSum;
    made += (1 - p.nonTw) * util + p.nonTw + altSum;
    // Deliver today's demand first, then clear backlog (capped), and keep the rest as stock abroad.
    let avail = supplyIn + inv;
    const onTime = Math.min(1, avail); avail -= onTime;
    const catchUp = Math.min(backlog, p.catchUp, avail); avail -= catchUp;
    inv = avail;
    const short = 1 - onTime;
    backlog = backlog + short - catchUp;
    cumShort += short;
    deliveredSum += onTime + catchUp;
    if (throttle == null && on && util < 0.95) throttle = t;
    if (shortDay == null && short > 0.005) shortDay = t;
    if (shortDay != null && recover == null && t >= cfg.dur && short <= 0.005) recover = t;
    if (shortDay != null && cleared == null && t >= cfg.dur && backlog <= 0.01) cleared = t;
    days.push({ t, on, grid: e.supply, chipPower: e.served.chips, lePower, util, mat: matCap > 0 ? mat / matCap : 0,
      shipped, stranded, twSupply, nonTw: p.nonTw, alts, altSum, altCap: capSum, inv: inv0 > 0 ? Math.min(1, inv / inv0) : 0, invDays: inv,
      onTime, catchUp, delivered: onTime + catchUp, short, backlog, stock: e.stock });
  }
  const units = d => d * p.weeklyUnits / 7;
  const worst = days.reduce((a, d) => (d.onTime < a.onTime ? d : a), days[0]);
  const last = days[H - 1];
  // Balance check: start stock + made = delivered + end stock + stranded (in days of normal output).
  const balance = inv0 + made - deliveredSum - last.invDays - (1 - p.nonTw) * last.stranded;
  return { days, energy, throttle, shortDay, recover, cleared, t0, worst, balance,
    cumShortDays: cumShort, cumShortUnits: units(cumShort), backlogEndUnits: units(last.backlog),
    caughtUpUnits: units(cumShort - last.backlog),
    neverMadeUnits: units(Math.max(0, H - made)),  // output never produced in the year, against normal production
    shortUnitsTo: t => units(days.slice(0, t + 1).reduce((a, d) => a + d.short, 0)),
    backlogUnitsAt: t => units(days[t].backlog) };
}
