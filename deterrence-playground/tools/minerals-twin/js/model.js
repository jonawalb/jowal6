// Chokepoint model. Pure functions, no DOM. Monthly steps over HORIZON months.
// Every quantity is a fraction of pre-shock flow at a stage (1 = what buyers received before the shock).
//
// For each stage k hit by the shock:
//   avail_k(t) = min(1, 1 − Σ exposure·coverage  +  idle_k(t)  +  new_k(t))
// Stages not hit stay at 1. Throughput = min over stages (a chain delivers only what its narrowest stage
// passes). Demand falls linearly by `flex` % over `flexLag` months. The gap between demand and throughput
// is met first from commercial inventory, then from the strategic stockpile; what is left is the shortfall.
export const HORIZON = 120;

const KIND_LAG = { mine: 'lagMine', refine: 'lagRefine', component: 'lagComp' };

// Share (0–1) of a stage's world output held by `actor`.
export function shareOf(stage, actor) {
  return (stage.shares[actor] || 0) / 100;
}

// Idle or spare capacity outside the actors that are withholding output, as a fraction of world output.
export function idleOutside(stage, actors) {
  if (!stage.capacity && !stage.idle) return 0;
  const prod = stage.values || {};
  const base = Math.max(stage.world || 0, Object.values(prod).reduce((a, b) => a + b, 0));
  let spare = 0;
  for (const [c, cap] of Object.entries(stage.capacity || {})) {
    if (actors.includes(c)) continue;
    spare += Math.max(0, cap - (prod[c] || 0));
  }
  for (const [c, cap] of Object.entries(stage.idle || {})) if (!actors.includes(c)) spare += cap;
  return base ? spare / base : 0;
}

// U.S. direct exposure to an actor: net import reliance × actor's share of U.S. imports.
export function usExposure(mineral, actor) {
  const nir = mineral.usNir ? mineral.usNir.value / 100 : 0;
  const imp = mineral.usImports ? (mineral.usImports.shares[actor] || 0) / 100 : 0;
  return nir * imp;
}

const rampFrac = (t, lag, ramp) => (t < lag ? 0 : Math.min(1, (t - lag + 1) / Math.max(1, ramp)));

// Build per-stage loss for a scenario under the chosen exposure basis.
export function stageLosses(mineral, hits, basis) {
  const out = {};
  if (basis === 'us') {
    // Direct U.S. exposure is one number per actor, applied once at the stage whose product the
    // United States imports (usImports.stage), whichever stage the actor withholds.
    const byActor = {};
    for (const h of hits) byActor[h.a] = Math.max(byActor[h.a] || 0, h.c / 100);
    const loss = Object.entries(byActor).reduce((s, [a, c]) => s + usExposure(mineral, a) * c, 0);
    if (loss > 0) out[mineral.usImports.stage] = loss;
    return out;
  }
  for (const h of hits) {
    const st = mineral.stages.find(s => s.id === h.st);
    if (!st) continue;
    out[h.st] = (out[h.st] || 0) + shareOf(st, h.a) * h.c / 100;
  }
  return out;
}

// Run the simulation. `p` holds the ASSUMPTIONS values; `months` is the shock duration (Infinity = open-ended).
export function simulate(mineral, hits, p, { basis = 'world', months = Infinity } = {}) {
  const losses = stageLosses(mineral, hits, basis);
  const actors = [...new Set(hits.map(h => h.a))];
  const hitStages = mineral.stages.filter(s => losses[s.id] > 0);
  const series = Object.fromEntries(hitStages.map(s => [s.id, []]));
  const thr = [], dem = [], short = [], draw = [], stockLeft = [], binding = [];
  let buf = p.buffer, stock = p.stock;
  for (let t = 0; t < HORIZON; t++) {
    const on = t < months;
    let min = 1, bind = null;
    for (const s of hitStages) {
      let a = 1;
      if (on) {
        const idle = basis === 'us' ? 0 : idleOutside(s, actors) * rampFrac(t, p.restart, 6);
        const lag = p[KIND_LAG[s.kind]] ?? p.lagRefine;
        const fresh = (p.add / 100) * rampFrac(t, lag, p.ramp);
        a = Math.min(1, 1 - losses[s.id] + idle + fresh);
      }
      series[s.id].push(a);
      if (a <= min + 1e-9) { min = Math.min(min, a); if (a < 1) bind = s.id; }
    }
    const d = on ? 1 - (p.flex / 100) * Math.min(1, (t + 1) / Math.max(1, p.flexLag)) : 1;
    let gap = Math.max(0, d - min);
    let used = 0;
    const fromBuf = Math.min(gap, buf); buf -= fromBuf; gap -= fromBuf; used += fromBuf;
    const fromStock = Math.min(gap, stock); stock -= fromStock; gap -= fromStock; used += fromStock;
    thr.push(min); dem.push(d); short.push(gap); draw.push(used); stockLeft.push(buf + stock); binding.push(bind);
  }
  return { losses, series, thr, dem, short, draw, stockLeft, binding, hitStages: hitStages.map(s => s.id), ...summarise(thr, dem, short, draw, binding) };
}

export function summarise(thr, dem, short, draw, binding) {
  const peak = Math.max(0, ...short);
  const shortMonths = short.filter(x => x > 0.005).length;
  const cum = short.reduce((a, b) => a + b, 0);
  let firstShort = short.findIndex(x => x > 0.005);
  let recover = null;
  for (let t = thr.length - 1; t >= 0; t--) { if (thr[t] + 1e-9 < dem[t]) { recover = t + 1; break; } }
  if (recover === null) recover = 0;
  const lastDraw = draw.reduce((acc, x, i) => (x > 0 ? i : acc), -1);
  const minThr = Math.min(...thr);
  const bindCount = {};
  binding.forEach(b => { if (b) bindCount[b] = (bindCount[b] || 0) + 1; });
  const binder = Object.entries(bindCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return { peak, shortMonths, cum, firstShort, recover: recover >= thr.length ? null : recover, open: recover >= thr.length,
    minThr, lastDraw, binder };
}
