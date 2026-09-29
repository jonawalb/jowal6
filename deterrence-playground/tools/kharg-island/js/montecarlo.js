// Monte Carlo: replay one setup many times with seeded dice, then test which levers move the result.
import { playGame } from './model.js';
import { MENU, IRAN_FIELDS, SECTORS } from '../data/params.js';

export const RUNS = 1000;
const STATS = ['shipsHit', 'usLost', 'lostMb', 'price', 'cost', 'esc'];

/** Seed for run i of a batch: spreads consecutive runs across the generator's state space. */
const runSeed = (seed, i) => (Math.imul(seed ^ 0x9E3779B9, 2654435761) + Math.imul(i + 1, 40503)) >>> 0;

/** Play `n` games. Returns outcome counts, escalation shares and average statistics. */
export function monteCarlo(cfg, P, seed, n = RUNS) {
  const out = { win: 0, mixed: 0, fail: 0, major: 0, hormuz: 0, gulf: 0, regional: 0, n, prices: [] };
  for (const k of STATS) out[k] = 0;
  for (let i = 0; i < n; i++) {
    const g = playGame(cfg, P, runSeed(seed, i), false);
    out[g.outcome]++;
    if (g.major) out.major++;
    if (g.stats.hormuz) out.hormuz++;
    if (g.stats.gulf) out.gulf++;
    if (g.stats.regional) out.regional++;
    out.prices.push(g.stats.price);
    for (const k of STATS) out[k] += g.stats[k];
  }
  for (const k of STATS) out[k] /= n;
  out.prices.sort((a, b) => a - b);
  return out;
}

const clone = cfg => ({ ...cfg, us: { ...cfg.us }, ir: { ...cfg.ir } });

/**
 * One-at-a-time sensitivity. Each variant changes one lever by one step and replays the same seeds
 * (common random numbers), so the difference reflects the lever and not the dice.
 */
export function drivers(cfg, P, seed, base, n = RUNS) {
  const V = [];
  const push = (t, side, f) => { const c = clone(cfg); f(c); V.push({ t, side, c }); };
  const land = cfg.us.obj !== 'blockade';
  for (const m of MENU) {
    if (!land && (m.k === 'abn')) continue;
    if (cfg.us[m.k] < m.max) push(`+1 ${m.one}`, 'us', c => { c.us[m.k]++; });
    if (cfg.us[m.k] > 0) push(`−1 ${m.one}`, 'us', c => { c.us[m.k]--; });
  }
  push(cfg.us.bases ? 'No partner bases' : 'Fly from partner bases', 'us', c => { c.us.bases = !c.us.bases; });
  if (land) {
    push(cfg.us.sof ? 'No special operations force' : 'Add special operations force', 'us', c => { c.us.sof = !c.us.sof; });
    if (cfg.us.strikes < 3) push('One more turn of prep strikes', 'us', c => { c.us.strikes++; });
    if (cfg.us.strikes > 0) push('One fewer turn of prep strikes', 'us', c => { c.us.strikes--; });
    const other = Object.keys(SECTORS).find(k => k !== cfg.us.sector);
    push(`Land on the ${SECTORS[other].t.toLowerCase()}`, 'us', c => { c.us.sector = other; });
  }
  for (const f of IRAN_FIELDS) {
    if (!land && (f.k === 'garrison' || f.k === 'reinf')) continue;
    const st = f.step || 1;
    if (cfg.ir[f.k] + st <= f.max) push(`Iran: +${st} ${f.one}`, 'ir', c => { c.ir[f.k] = cfg.ir[f.k] + st; });
  }
  if (cfg.ir.mines < 2) push('Iran: heavier mining', 'ir', c => { c.ir.mines++; });
  if (cfg.ir.mines > 0) push('Iran: lighter mining', 'ir', c => { c.ir.mines--; });
  return V.map(v => {
    const r = monteCarlo(v.c, P, seed, n);
    return { t: v.t, side: v.side, d: (r.win - base.win) / n, dMajor: (r.major - base.major) / n };
  }).sort((a, b) => Math.abs(b.d) + Math.abs(b.dMajor) / 2 - (Math.abs(a.d) + Math.abs(a.dMajor) / 2));
}
