// The review's replays, in a module Worker so the page stays responsive (SPEC §7.4 item 8; D-33). Each variant
// reruns the same scenario with fresh dice (combat, sightings, order delays): your orders; your orders against an
// opponent who sees everything; the doctrinal computer in your place; the opponent's Easy/Standard doctrine
// flipped (after Biddle's Table 9.1 excursions, p. 184); and your plan and orders in the other era.
import { advance } from '../engine.js';
import { decodeCampaign } from '../campaign.js';
import { makeGame, rebuild, setupFor, beginBattle } from './game.js';
import { aiPlayer, planFor, profileKey } from './ai-bridge.js';

const PER = { d: 500, c: 200, a: 100 };

function variants(m) {
  const { ch, plan, log } = m, foeDiff = ch.diff === 'e' ? 's' : 'e', other = ch.era === 'w' ? 'm' : 'w';
  const setup = m.token ? setupFor(decodeCampaign(m.token)) : null;
  const opt = { telemetry: false };
  return [
    { key: 'you', label: 'Your orders', note: 'exactly what you did, at the hours you did it',
      run: dice => rebuild({ ...ch, dice }, setup, plan, log, Infinity, opt) },
    { key: 'seer', label: 'Your orders, against an opponent who sees everything', note: 'the difference is what your concealment and deception were worth',
      run: dice => rebuild({ ...ch, dice }, setup, plan, log, Infinity, { ...opt, seer: true }) },
    { key: 'doc', label: 'The doctrinal computer in your place', note: 'the Standard plan and orders for your side',
      run: dice => { const me = aiPlayer(ch.side, 's'); const g = makeGame({ ...ch, dice }, setup, { ...opt, mePlayer: me }); if (g.phase === 'plan') beginBattle(g, planFor(g, ch.side, profileKey('s', ch.side), g.rng.planAi)); while (!g.over) advance(g); return g; } },
    { key: 'flip', label: `Your orders, against the ${foeDiff === 'e' ? 'Easy (massed, forward-heavy)' : 'Standard (modern-system)'} opponent`, note: 'the opponent’s doctrine flipped: what its methods were worth',
      run: dice => rebuild({ ...ch, dice }, setup, plan, log, Infinity, { ...opt, foeDiff }) },
    { key: 'era', label: `Your plan and orders in the ${other === 'm' ? 'modern' : '1917–18'} era`, note: 'technology magnifies force employment (Biddle p. 234)',
      run: dice => rebuild({ ...ch, dice, era: other }, null, plan, log, Infinity, { ...opt, era: other }) },
  ].filter(v => v.key !== 'era' || !setup);
}

const loss = (g, side) => g.units.filter(u => u.side === side).reduce((s, u) => s + (u.str0 - Math.max(0, u.str)), 0);

onmessage = e => {
  const m = e.data, N = m.n || PER[m.ch.scale] || 100;
  const vs = variants(m).map(v => ({ ...v, won: 0, n: 0, lossMe: 0, lossFoe: 0 }));
  const total = vs.length * N, foe = m.ch.side === 'def' ? 'att' : 'def';
  let done = 0, last = 0;
  for (let d = 1; d <= N; d++) {
    for (const v of vs) {
      try {
        const g = v.run(d);
        v.n++; if (g.over && g.over.winner === m.ch.side) v.won++;
        v.lossMe += loss(g, m.ch.side); v.lossFoe += loss(g, foe);
      } catch (err) { v.err = String(err && err.message || err); }
      done++;
    }
    const now = Date.now();
    if (now - last > 250) { last = now; postMessage({ progress: done / total }); }
  }
  postMessage({ done: true, results: vs.map(v => ({ key: v.key, label: v.label, note: v.note, n: v.n, wins: v.won, p: v.n ? v.won / v.n : 0, lossMe: v.n ? v.lossMe / v.n : 0, lossFoe: v.n ? v.lossFoe / v.n : 0, err: v.err })) });
};
