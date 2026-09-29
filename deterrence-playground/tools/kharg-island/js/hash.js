// Shareable state in the URL hash.
// #o=seize&m=1&a=1&c=1&d=3&x=1&h=1&sf=1&b=0&sc=W&st=1&po=deny&ia=4&id=4&if=4&ig=1.5&ir=0.75&is=4&im=2&ie=1&t=8&seed=1987&p.pMine=0.2
import { MENU, IRAN_FIELDS, OBJECTIVES, SECTORS, POSTURES, PROB } from '../data/params.js';

const US = { meu: 'm', abn: 'a', cvw: 'c', ddg: 'd', mcm: 'x', helo: 'h' };
const IR = { ascm: 'ia', drones: 'id', fac: 'if', garrison: 'ig', reinf: 'ir', srbm: 'is' };
const ESC = [0.5, 1, 1.8];

export function writeHash(cfg, P, seed, view) {
  const q = new URLSearchParams();
  q.set('o', cfg.us.obj);
  for (const m of MENU) q.set(US[m.k], cfg.us[m.k]);
  q.set('sf', cfg.us.sof ? 1 : 0); q.set('b', cfg.us.bases ? 1 : 0);
  q.set('sc', cfg.us.sector); q.set('st', cfg.us.strikes);
  q.set('po', cfg.ir.posture);
  for (const f of IRAN_FIELDS) q.set(IR[f.k], cfg.ir[f.k]);
  q.set('im', cfg.ir.mines); q.set('ie', cfg.ir.escal);
  q.set('t', cfg.turns); q.set('seed', seed);
  if (view) q.set('turn', view);
  for (const p of PROB) if (P[p.k] !== p.v) q.set('p.' + p.k, P[p.k]);
  history.replaceState(null, '', '#' + q.toString());
}

/** Apply a hash onto defaults. Returns { cfg, P, seed, view } with every value clamped. */
export function readHash(cfg, P, seed) {
  const q = new URLSearchParams(location.hash.slice(1));
  if (![...q.keys()].length) return { cfg, P, seed, view: 0 };
  const num = (k, lo, hi, d) => { const v = parseFloat(q.get(k)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
  if (OBJECTIVES[q.get('o')]) cfg.us.obj = q.get('o');
  for (const m of MENU) cfg.us[m.k] = Math.round(num(US[m.k], 0, m.max, cfg.us[m.k]));
  if (q.has('sf')) cfg.us.sof = q.get('sf') === '1';
  if (q.has('b')) cfg.us.bases = q.get('b') === '1';
  if (SECTORS[q.get('sc')]) cfg.us.sector = q.get('sc');
  cfg.us.strikes = Math.round(num('st', 0, 3, cfg.us.strikes));
  if (POSTURES[q.get('po')] || q.get('po') === 'custom') cfg.ir.posture = q.get('po');
  for (const f of IRAN_FIELDS) {
    const st = f.step || 1;
    cfg.ir[f.k] = Math.round(num(IR[f.k], f.min, f.max, cfg.ir[f.k]) / st) * st;
  }
  cfg.ir.mines = Math.round(num('im', 0, 2, cfg.ir.mines));
  if (ESC.includes(num('ie', 0, 5, -1))) cfg.ir.escal = num('ie', 0, 5, 1);
  cfg.turns = Math.round(num('t', 6, 12, cfg.turns));
  for (const p of PROB) if (q.has('p.' + p.k)) P[p.k] = num('p.' + p.k, p.min, p.max, p.v);
  return { cfg, P, seed: Math.round(num('seed', 1, 999999, seed)), view: Math.round(num('turn', 0, cfg.turns, 0)) };
}
