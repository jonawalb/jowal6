// Stochastic Lanchester square law, one hour at a time, in every sector where both sides have
// effective units. Lanchester (1916), ch. V, eq. (5): with aimed fire, fighting strength goes as
// (fighting value) x (numbers)^2. The defender's posture multiplies its fighting value by k; k is
// calibrated so the square law's break-even ratio sqrt(k) equals FM 5-0's historical planning ratios.
import { COMBAT, GAME } from '../data/params.js';

export const sum = us => us.reduce((s, u) => s + u.str, 0);
/** Fighting power: strength times each unit's hidden quality factor (training, leadership, luck). */
export const power = us => us.reduce((s, u) => s + u.str * (u.q ?? 1), 0);

/** Which side defends in a sector and in what posture. */
export function posture(blue, red, t) {
  const bs = Math.min(...blue.map(u => u.since)), rs = Math.min(...red.map(u => u.since));
  if (bs === rs) return { def: 'blue', kind: 'meeting', k: COMBAT.k.meeting };
  const def = bs < rs ? 'blue' : 'red', since = Math.min(bs, rs);
  const kind = t + 1 - since >= GAME.prepHours ? 'prepared' : 'hasty';
  return { def, kind, k: COMBAT.k[kind] };
}

/** Expected hourly losses (attacker, defender) for strengths A and D under multiplier k. */
export const meanLoss = (A, D, k) => [COMBAT.c * k * D, COMBAT.c * A];

function take(units, loss) {
  const tot = sum(units);
  if (tot <= 0) return;
  const f = Math.min(1, loss / tot);
  for (const u of units) u.str = Math.max(0, u.str * (1 - f));
}

/** Fight one hour at a node. Returns an event record for the log and the after-action review. */
export function fight(blue, red, t, rng) {
  const p = posture(blue, red, t);
  const B = sum(blue), Rr = sum(red), PB = power(blue), PR = power(red);
  const [A, D] = p.def === 'blue' ? [Rr, B] : [B, Rr];
  const [PA, PD] = p.def === 'blue' ? [PR, PB] : [PB, PR];
  const [la, ld] = meanLoss(PA, PD, p.k);
  const s = COMBAT.sigma, noise = () => Math.exp(s * rng.normal() - s * s / 2);
  const lossA = Math.min(A, la * noise()), lossD = Math.min(D, ld * noise());
  const [lb, lr] = p.def === 'blue' ? [lossD, lossA] : [lossA, lossD];
  take(blue, lb); take(red, lr);
  return { t, B, R: Rr, lb, lr, def: p.def, kind: p.kind, ratio: A / Math.max(D, 1e-9) };
}

/** Mark units that crossed the break threshold. */
export function breaks(units) {
  const out = [];
  for (const u of units) if (!u.broken && u.str0 > 0 && u.str < COMBAT.breakFrac * u.str0) { u.broken = true; out.push(u); }
  return out;
}
