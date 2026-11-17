// AI Chip Chokepoint Twin: shock model. Pure functions, no DOM. Monthly steps over HORIZON months.
//
// The AI accelerator chain is treated as serial: every accelerator needs output from every stage
// (design tools, IP, wafers, resists, lithography, fab tools, a leading-edge fab, HBM, advanced packaging,
// test). A shock removes an actor's share of a stage's world output, times the coverage you set.
//
// For a stage k hit with loss L_k (0-1), under a time-to-substitute T (months):
//   avail_k(t) = 1                                  while t < buffer_k (inventory or installed-base runway)
//              = 1 - L_k * (1 - R(t, T))           afterwards, while the shock lasts
//   R(t, T)    = clamp((t - T/2) / (T/2), 0, 1)     replacement starts at T/2 and is complete at T
// Stages not hit stay at 1. World accelerator output = min over stages (the narrowest stage binds).
// For input materials (gallium, germanium, rare earths) a notional pass-through `dep` (0-1) scales the loss:
// the share of accelerator output that cannot proceed without that input. Other stages use dep = 1.
// Two cases run side by side: T = the low end (fast) and the high end (slow) of the stage's range.
// Every buffer and time-to-substitute is a notional assumption (data/scenarios.js), never data.
export const HORIZON = 120;

const clamp01 = v => Math.max(0, Math.min(1, v));

// Share (0-1) of a stage's world output held by an actor: a country (stage.shares) or a firm (stage.firms).
export function shareOf(stage, actor) {
  const v = (stage.shares && stage.shares[actor]) ?? (stage.firms && stage.firms[actor]) ?? 0;
  return v / 100;
}

// Loss (0-1) at each stage hit by the shock, capped at 1.
export function stageLosses(stages, hits) {
  const out = {};
  for (const h of hits) {
    const st = stages.find(s => s.id === h.st);
    if (!st) continue;
    out[h.st] = Math.min(1, (out[h.st] || 0) + shareOf(st, h.a) * h.c / 100);
  }
  for (const k of Object.keys(out)) if (out[k] <= 0) delete out[k];
  return out;
}

export function replaced(t, T) {
  if (!(T > 0)) return 1;
  return clamp01((t - T / 2) / (T / 2));
}

export function availAt(t, loss, a, T, months = Infinity) {
  if (t >= months || t < a.buffer) return 1;
  return 1 - loss * (a.dep ?? 1) * (1 - replaced(t, T));
}

// p: { [stageId]: { buffer, lo, hi } }. months: shock duration (Infinity = open-ended).
export function simulate(stages, hits, p, { months = Infinity } = {}) {
  const losses = stageLosses(stages, hits);
  const hitIds = stages.filter(s => losses[s.id] > 0).map(s => s.id);
  const run = T => {
    const series = Object.fromEntries(hitIds.map(id => [id, []]));
    const thr = [], binding = [];
    for (let t = 0; t < HORIZON; t++) {
      let min = 1, bind = null;
      for (const id of hitIds) {
        const a = p[id];
        const v = availAt(t, losses[id], a, T(a), months);
        series[id].push(v);
        if (v < min - 1e-12) { min = v; bind = id; }
      }
      thr.push(min); binding.push(bind);
    }
    return { series, thr, binding, ...summarise(thr, binding) };
  };
  return { losses, hitIds, fast: run(a => a.lo), slow: run(a => a.hi), months };
}

export function summarise(thr, binding) {
  const loss = thr.map(v => 1 - v);
  const peak = Math.max(0, ...loss);
  const firstHit = loss.findIndex(x => x > 0.005);
  const shortMonths = loss.filter(x => x > 0.005).length;
  const cum = loss.reduce((a, b) => a + b, 0);
  let last = -1;
  for (let t = loss.length - 1; t >= 0; t--) if (loss[t] > 0.005) { last = t; break; }
  const open = last === loss.length - 1;
  const recover = last < 0 ? 0 : open ? null : last + 1;
  const count = {};
  binding.forEach(b => { if (b) count[b] = (count[b] || 0) + 1; });
  const peakAt = loss.indexOf(peak);
  const binder = (peak > 0 && binding[peakAt]) || Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return { peak, peakAt, firstHit, shortMonths, cum, recover, open, binder };
}

// Herfindahl-Hirschman index from a share map (0-10,000), ignoring "Other" buckets.
export function hhi(shares) {
  return Math.round(Object.entries(shares || {}).filter(([c]) => !/^Other/.test(c)).reduce((a, [, v]) => a + v * v, 0));
}

// Months shown on the simulator's time axis. Open-ended shocks use the full horizon; a shock with a set
// duration is shown over about three times its length (whole years, at least 24 months) so short shocks stay visible.
export function viewSpan(months) {
  if (!Number.isFinite(months)) return HORIZON;
  return Math.min(HORIZON, Math.max(24, Math.ceil((3 * months) / 12) * 12));
}
