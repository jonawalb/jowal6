// How the computer deploys its formations: a goal-driven heuristic, not a search. Each capital decides how far
// forward to lean (from its hidden type and the crisis), moves whole formations toward target strengths within its
// Lift and fuel, rotates worn-out formations home, sets stances it can fuel, aims strike forces, and picks a
// landing or defensive emphasis by a noisy best guess (China mixes its choice so Taiwan cannot read it for sure).
import { SEA, COAST, SECTOR_SEA, SECTOR_VALUE, moveCost } from '../data/theater.js';
import { FBY, UPKEEP, placesFor } from '../data/formations.js';
import { strength, eff, orderCheck } from './forces.js';
import { opening } from './engine.js';
import { landingWhy, defence } from './landing.js';
import { makeRng, STREAM } from './rng.js';

function lean(s, who) {
  const t = s.types[who];
  if (t === 'resolute') return 1;
  if (t === 'opportunist') return opening(s, who) ? 1 : 0.5;
  return 0.25;
}
const mine = (s, who, a) => s.units[who].filter(u => u.at === a && u.str > 0).reduce((t, u) => t + eff(u), 0);

/** Move whole formations toward `targets` ([[area, wanted effective strength]]) within `budget` { lift, fuel }. */
function plan(s, who, targets, budget, keepFuel, limits = {}, full = budget) {
  const moves = [], done = {}, cur = {};
  const at = a => (cur[a] ?? mine(s, who, a));
  const want = a => targets.find(([x]) => x === a)?.[1] || 0;
  for (const [area, w] of targets) {
    const cands = s.units[who].filter(u => u.str > 0 && u.at !== area && u.at !== 'transit' && FBY[u.id].type !== 'strike'
      && placesFor(u.id).includes(area) && moveCost(u.at, area) != null)
      .sort((a, b) => (b.at === 'rear') - (a.at === 'rear') || b.ready - a.ready);
    let blocked = null;
    for (const u of cands) {
      if (at(area) >= w - 0.25) break;
      if (done[u.id] || (u.at !== 'rear' && at(u.at) - eff(u) < want(u.at) - 0.25)) continue;
      const c = orderCheck(s, who, [u.id, area], budget, done);
      if (c.why || budget.fuel - c.fuel < keepFuel) { if (c.res && orderCheck(s, who, [u.id, area], full, done).res) blocked = blocked || c.res; continue; }
      budget.lift -= c.lift; budget.fuel -= c.fuel; done[u.id] = true; moves.push([u.id, area]);
      cur[u.at] = at(u.at) - eff(u); cur[area] = at(area) + eff(u);
    }
    if (blocked && at(area) < w - 1) limits[blocked] = true;   // still well short of the target for want of Lift or fuel
  }
  // Rotation: below Limited strikes, send formations worn below 45 readiness home if they are not needed.
  if (s.rung < 3) for (const u of s.units[who]) {
    if (done[u.id] || u.ready >= 45 || !SEA.includes(u.at) || !placesFor(u.id).includes('rear')) continue;
    if (at(u.at) - eff(u) < 0.7 * want(u.at)) continue;
    const c = orderCheck(s, who, [u.id, 'rear'], budget, done);
    if (c.why || budget.fuel - c.fuel < keepFuel) continue;
    budget.lift -= c.lift; budget.fuel -= c.fuel; done[u.id] = true; moves.push([u.id, 'rear']); cur[u.at] = at(u.at) - eff(u);
  }
  return moves;
}

/** Stances by type and crisis, then stepped down (least important areas first) until the fuel and munitions last. */
function stances(s, who, k, budget, order) {
  const war = s.rung >= 3, side = who === 'cn' ? 'red' : 'blue', foe = side === 'red' ? 'blue' : 'red';
  const st = {};
  for (const a of SEA) if (s.units[who].some(u => u.at === a && u.str > 0) || (s.f[who][a] || 0) > 0) {
    const ratio = strength(s, side, a) / Math.max(0.1, strength(s, foe, a));
    st[a] = war ? (k >= 0.9 && ratio >= (who === 'cn' ? 1.2 : 1.3) && s.res[who].mun >= 2 ? 'attack' : k >= 0.5 ? 'contest' : 'defend') : k >= 0.5 ? 'contest' : 'defend';
  }
  const fuelFor = () => s.units[who].filter(u => u.str > 0 && st[u.at]).reduce((t, u) => t + UPKEEP.fuel[st[u.at]], 0);
  for (const a of order) {
    while (st[a] && st[a] !== 'defend' && fuelFor() > budget.fuel + 1e-9) st[a] = st[a] === 'attack' ? 'contest' : 'defend';
  }
  return st;
}

/** Noisy choice among coast sectors: softmax of `score` at temperature `temp`. */
function pickSector(s, who, score, temp, salt) {
  const r = makeRng(s.seed, STREAM.ai + 900 + s.turn * 10 + salt);
  const sc = COAST.map(score), mx = Math.max(...sc);
  return COAST[r.pick(sc.map(x => Math.exp((x - mx) / temp)))];
}
/** Where China would land, as China sees it: valuable, reachable, thinly held coasts. */
const cnScore = s => x => SECTOR_VALUE[x] / 10 - (landingWhy(s, x) ? 4 : 0) - 1.2 * defence(s, x);
/** Where Taiwan and the U.S. expect a landing: valuable coasts China can reach, and where its strikes fell last month. */
const guessScore = s => x => SECTOR_VALUE[x] / 10 + (SECTOR_SEA[x].some(a => s.ctrl[a] === 'red') ? 1.5 : -2) - 0.4 * defence(s, x) + (s.shownEmph === x ? 1.5 : 0);

/** Force orders for a computer capital this month. budget = { lift, fuel } left after its moves are paid. */
export function forceOrders(s, who, budget) {
  const k = lean(s, who), war = s.rung >= 3;
  const F = { ...(budget || { lift: s.res[who].lift, fuel: s.res[who].fuel }) }, B = { ...F };
  B.lift = Math.round(B.lift * (0.5 + 0.5 * k) * 2) / 2;      // cautious capitals spend under three quarters of their Lift
  const keepFuel = Math.min(B.fuel, 0.5 * s.units[who].filter(u => SEA.includes(u.at)).length);
  const red = a => strength(s, 'red', a), blue = a => strength(s, 'blue', a);
  const out = { moves: [], stance: {}, limits: {} };
  if (who === 'tw') {
    // Reserve emphasis on the coast it expects; a cautious Taipei also pulls the Marines up to the capital's coast.
    out.emph = pickSector(s, who, guessScore(s), 1, 1);
    const mc = s.units.tw.find(u => u.id === 'tw_mc');
    if (s.rung >= 2 && k < 0.5 && mc && mc.at === 'res' && defence(s, 'nw') < 2.5 && !orderCheck(s, who, ['tw_mc', 'nw'], B).why) out.moves.push(['tw_mc', 'nw']);
    out.stance = stances(s, who, k, B, ['strait']);
    return out;
  }
  if (who === 'cn') {
    const targets = [['strait', Math.max(8, 2 * blue('strait') + 1 + 2 * k)], ['south', Math.max(3, (1 + k) * blue('south'))], ['north', Math.max(2, 0.8 * blue('north'))]];
    out.moves = plan(s, who, targets, B, keepFuel, out.limits, F);
    const rf = s.units.cn.find(u => u.id === 'cn_rf');
    if (war && rf) { const a = ['strait', 'south', 'north', 'east'].sort((x, y) => blue(y) * (x === 'strait' ? 1 : 1.5) - blue(x) * (y === 'strait' ? 1 : 1.5))[0]; if (rf.focus !== a) out.moves.push(['cn_rf', a]); }
    out.stance = stances(s, who, k, B, ['east', 'north', 'south', 'strait']);
    out.emph = pickSector(s, who, cnScore(s), s.types.cn === 'resolute' ? 0.7 : 1.2, 2);
    return out;
  }
  // United States and Japan: hold the routes, lean toward parity where China masses.
  const threatened = s.rung >= 1 || k >= 0.9;
  const targets = who === 'us'
    ? [['east', 3], ['south', threatened ? Math.max(1, (0.5 + 0.5 * k) * red('south') / 1.5) : 1], ['north', s.rung >= 2 && k >= 0.5 ? 3 : 1], ['strait', war && k >= 0.9 ? 2 : 0]]
    : [['north', Math.max(4, (0.4 + 0.4 * k) * red('north')) + (threatened && k >= 0.5 ? 1 : 0)], ['east', threatened && k >= 0.5 ? 1 : 0]];
  out.moves = plan(s, who, targets.filter(([, w]) => w > 0), B, keepFuel, out.limits, F);
  const bm = s.units.us.find(u => u.id === 'us_bmb');
  if (who === 'us' && war && bm) { const a = s.ctrl.strait === 'red' || s.rung >= 4 ? 'strait' : 'south'; if (bm.focus !== a) out.moves.push(['us_bmb', a]); }
  out.stance = stances(s, who, k, B, ['strait', 'north', 'south', 'east']);
  if (who === 'us') out.emph = pickSector(s, who, guessScore(s), 1, 3);
  return out;
}
