// How the computer deploys its forces: a goal-driven heuristic, not a search. Each capital decides how far
// forward to lean (from its hidden type and the crisis), then spends logistics toward target strengths.
import { LOGISTICS, moveCost, SEA } from '../data/theater.js';
import { strength } from './forces.js';
import { opening } from './engine.js';

function lean(s, who) {
  const t = s.types[who];
  if (t === 'resolute') return 1;
  if (t === 'opportunist') return opening(s, who) ? 1 : 0.5;
  return 0.25;
}

/** Plan moves toward `targets` ({ area: wanted strength of this capital }) from `sources`, within `budget`. */
function plan(s, who, targets, sources, budget) {
  const have = { ...s.f[who] }, moves = [];
  for (const [area, want] of targets) {
    let need = Math.ceil(want - (have[area] || 0));
    for (const src of sources) {
      if (need <= 0 || budget <= 0) break;
      if (src === area) continue;
      const c = moveCost(src, area); if (c == null) continue;
      const keep = src === 'rear' ? 0 : (targets.find(([a]) => a === src)?.[1] || 0);
      const spare = Math.floor((have[src] || 0) - keep);
      const n = Math.min(need, spare, Math.floor(budget / c));
      if (n <= 0) continue;
      moves.push([src, area, n]); have[src] -= n; have[area] = (have[area] || 0) + n; budget -= n * c; need -= n;
    }
  }
  return moves;
}

/** Force orders for a computer capital this month. `bonus` = extra logistics from its military moves. */
export function forceOrders(s, who, bonus = 0) {
  const k = lean(s, who), war = s.rung >= 3;
  const L = Math.round((LOGISTICS[who] + bonus) * (0.4 + 0.6 * k));   // cautious capitals spend less of their logistics
  const red = a => strength(s, 'red', a), blue = a => strength(s, 'blue', a);
  const stance = {};
  if (who === 'tw') {
    // Shift the reserve toward the more exposed coast once a blockade or worse is on.
    const weak = s.f.tw.tn <= s.f.tw.ts ? 'tn' : 'ts';
    const moves = s.rung >= 2 && s.f.tw.tc >= 2 ? [['tc', weak, Math.min(L, 1)]] : [];
    return { moves, stance };
  }
  if (who === 'cn') {
    const targets = [['strait', Math.max(8, 2 * blue('strait') + 1 + 2 * k)], ['south', Math.max(3, (1 + k) * blue('south'))], ['north', Math.max(2, 0.8 * blue('north'))]];
    const moves = plan(s, who, targets, ['rear', 'north', 'east', 'south', 'strait'], L);
    for (const a of SEA) if (s.f.cn[a] > 0) stance[a] = war ? (k >= 0.9 && red(a) >= 1.2 * blue(a) ? 'attack' : k >= 0.5 ? 'contest' : 'defend') : k >= 0.5 ? 'contest' : 'defend';
    return { moves, stance };
  }
  // United States and Japan: hold the routes, lean toward parity where China masses.
  const threatened = s.rung >= 1 || k >= 0.9;
  const targets = who === 'us'
    ? [['east', 3], ['south', threatened ? Math.max(1, (0.5 + 0.5 * k) * red('south') / 1.5) : 1], ['strait', war && k >= 0.9 ? 2 : 0]]
    : [['north', Math.max(4, (0.4 + 0.4 * k) * red('north'))], ['east', threatened && k >= 0.5 ? 1 : 0]];
  const moves = plan(s, who, targets.filter(([, w]) => w > 0), ['rear', 'east', 'north', 'south', 'strait'], L);
  for (const a of SEA) if ((s.f[who][a] || 0) > 0) stance[a] = war ? (k >= 0.9 && blue(a) >= 1.3 * red(a) ? 'attack' : k >= 0.5 ? 'contest' : 'defend') : k >= 0.5 ? 'contest' : 'defend';
  return { moves, stance };
}
