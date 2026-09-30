// After-action comparisons on the same scenario: your orders, your plan aimed at the truth, your orders
// without order delays, and the scripted doctrinal commander with and without fog. Each is replayed
// with fresh dice (combat, reports, order delays) while the Red plan and unit qualities stay fixed.
import { replay, play } from './engine.js';
import { doctrinal, aimAtTruth } from './policies.js';

export const REPLAYS = 1000;

export function variants(g) {
  const orders = g.orders.map(o => ({ t: o.t, unit: o.unit, dest: o.dest }));
  const drones = { ...g.drones };
  const aimed = aimAtTruth(g, orders);
  const changed = aimed.some((o, i) => o.dest !== orders[i].dest);
  return [
    { key: 'you', label: 'Your orders', note: 'exactly the orders you gave, at the hours you gave them',
      run: dice => replay({ seed: g.seed, dice }, orders, drones) },
    { key: 'aim', label: 'Your plan, perfect information', note: changed ? 'same units, same hours; every shift between axes re-aimed at Red\'s real main effort' : 'you made no shifts between axes, so perfect information would not change your orders',
      run: dice => replay({ seed: g.seed, dice }, aimed, drones) },
    { key: 'nodelay', label: 'Your orders, no order delay', note: 'your orders, each arriving the hour you sent it',
      run: dice => replay({ seed: g.seed, dice, noDelay: true }, orders, drones) },
    { key: 'doc', label: 'Doctrinal commander', note: 'reads the same kind of reports, commits the reserve when one axis clearly leads',
      run: dice => play({ seed: g.seed, dice }, doctrinal('belief')) },
    { key: 'docT', label: 'Doctrinal, perfect information', note: 'same rule, reading the true picture instantly (orders still delayed)',
      run: dice => play({ seed: g.seed, dice }, doctrinal('truth')) },
  ];
}

/** Run every variant REPLAYS times without freezing the page. onProgress(done, total). */
export async function runAll(g, onProgress, signal) {
  const vs = variants(g).map(v => ({ ...v, held: 0, lossB: 0, lossR: 0, n: 0 }));
  const total = vs.length * REPLAYS, chunk = 50;
  let done = 0;
  for (let d0 = 1; d0 <= REPLAYS; d0 += chunk) {
    for (const v of vs) {
      for (let d = d0; d < d0 + chunk && d <= REPLAYS; d++) {
        const r = v.run(d);
        v.n += 1; if (r.over.held) v.held += 1; v.lossB += r.over.lossB; v.lossR += r.over.lossR;
        done += 1;
      }
    }
    if (signal?.aborted) return null;
    onProgress?.(done, total);
    await new Promise(res => setTimeout(res, 0));
  }
  return vs.map(v => ({ key: v.key, label: v.label, note: v.note, p: v.held / v.n, lossB: v.lossB / v.n, lossR: v.lossR / v.n, n: v.n }));
}
