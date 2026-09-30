// After-action replays of the same scenario: your actions, your actions against an opponent who sees
// everything (what your concealment, feints and bait were worth), and a scripted commander in your
// place with and without perfect information. Each is replayed with fresh dice (combat, sightings,
// artillery, order delays) while the scenario (Red's plan and hidden unit quality) stays fixed.
import { replay, play } from './engine.js';
import { redAI, blueAI } from './ai.js';
import { SIDE } from './panel.js';

export const REPLAYS = 500;

export function variants(g, me) {
  const log = g.log.map(a => ({ ...a }));
  const foe = me === 'blue' ? 'red' : 'blue';
  const opp = mode => (me === 'blue' ? redAI({ mode }) : blueAI({ mode }));
  const withMe = pl => (me === 'blue' ? { blue: null, red: pl } : { red: null, blue: pl });
  const script = mode => (me === 'blue' ? { blue: blueAI({ mode }), red: redAI() } : { red: redAI({ plan: 'smart', mode }), blue: blueAI() });
  return [
    { key: 'you', label: 'Your orders', note: 'exactly what you did, at the hours you did it',
      run: dice => replay({ seed: g.seed, dice, players: withMe(opp('fog')) }, log) },
    { key: 'seer', label: `Your orders, against a ${SIDE[foe]} commander who sees everything`, note: 'the difference is what hiding, feints and bait were worth to you',
      run: dice => replay({ seed: g.seed, dice, players: withMe(opp('truth')) }, log) },
    { key: 'doc', label: me === 'blue' ? 'The doctrinal defender in your place' : 'Scripted feint and mass in your place',
      note: me === 'blue' ? 'commits its reserve when one road clearly leads, after checking it with spotted fire' : 'feint with the decoy on a center road, main effort on an outer road',
      run: dice => play({ seed: g.seed, dice, players: script('fog') }) },
    { key: 'docT', label: 'The same script with perfect information', note: 'it reads the true picture; orders are still delayed',
      run: dice => play({ seed: g.seed, dice, players: script('truth') }) },
  ];
}

/** Run every variant REPLAYS times without freezing the page. onProgress(done, total). */
export async function runAll(g, me, onProgress, signal) {
  const vs = variants(g, me).map(v => ({ ...v, won: 0, lossB: 0, lossR: 0, n: 0 }));
  const total = vs.length * REPLAYS, chunk = 25;
  let done = 0;
  for (let d0 = 1; d0 <= REPLAYS; d0 += chunk) {
    for (const v of vs) {
      for (let d = d0; d < d0 + chunk && d <= REPLAYS; d++) {
        const r = v.run(d);
        v.n += 1; if (r.over && r.over.winner === me) v.won += 1;
        if (r.over) { v.lossB += r.over.lossB; v.lossR += r.over.lossR; }
        done += 1;
      }
    }
    if (signal?.aborted) return null;
    onProgress?.(done, total);
    await new Promise(res => setTimeout(res, 0));
  }
  return vs.map(v => ({ key: v.key, label: v.label, note: v.note, p: v.won / v.n, lossB: v.lossB / v.n, lossR: v.lossR / v.n, n: v.n }));
}
