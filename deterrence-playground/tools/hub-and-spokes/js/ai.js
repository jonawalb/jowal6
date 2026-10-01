// What the hub can see of each ally (noisy estimates of hidden feelings), the computer's heuristic hub, and
// scripted strategies used for balance testing. The computer never reads an ally's hidden traits directly.
import { P } from '../data/params.js';
import { IDS, BY } from '../data/allies.js';
import { costOf } from '../data/actions.js';
import { act, respond, brief, newGame, fearIdx, budgetOf, warOdds } from './engine.js';
import { makeRng, STREAM } from './rng.js';
import { score } from './score.js';

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** Embassy reporting: abandonment fear and entrapment risk, each within about ±8, fixed for the year. */
export function intel(s) {
  const r = makeRng(s.seed, STREAM.intel + s.turn);
  return Object.fromEntries(IDS.map(id => {
    const x = s.allies[id];
    return [id, { fear: Math.round(clamp(fearIdx(x) + 8 * (r.u() * 2 - 1))), entrap: Math.round(clamp(x.entrap + 8 * (r.u() * 2 - 1))) }];
  }));
}

/** The computer hub: tops up the most fearful, brakes the most emboldened, presses free-riders, then networks. */
export function computerPlan(s, noise = 0, salt = 0) {
  const I = intel(s), r = makeRng(s.seed, STREAM.ai + s.turn, salt);
  let left = budgetOf(s);
  const acts = [];
  const add = (ally, id, f = null) => { if (noise && r.u() < 0.15 * noise) return false; const c = costOf(id, f); if (c <= left && !acts.some(a => a.ally === ally && a.id === id)) { acts.push({ ally, id, f }); left -= c; return true; } return false; };
  const need = IDS.map(id => ({ id, fear: I[id].fear + noise * (r.u() * 30 - 15), entrap: I[id].entrap, x: s.allies[id] }));
  for (const n of [...need].sort((a, b) => b.fear - a.fear)) {
    if (n.fear > 70) { if (!n.x.last.includes('summit')) add(n.id, 'summit'); add(n.id, 'guarantee', n.x.stake ? 'private' : 'public'); }
    else if (n.fear > 55) { if (!add(n.id, 'exercise')) add(n.id, 'summit'); }
  }
  for (const n of [...need].sort((a, b) => b.entrap - a.entrap)) {
    if (n.entrap > 45) add(n.id, 'condition'); else if (n.entrap > 28) add(n.id, 'warn');
  }
  for (const n of need) if (n.x.effort < 38 && n.fear < 55) add(n.id, 'pressure', n.fear < 35 ? 'loud' : 'quiet');
  const pairs = [];
  for (const a of IDS) for (const b of IDS) if (a < b && !s.allies[a].links.includes(b)) pairs.push([a, b, s.allies[a].coh + s.allies[b].coh]);
  pairs.sort((p, q) => q[2] - p[2]);
  if (pairs.length && Math.min(s.allies[pairs[0][0]].coh, s.allies[pairs[0][1]].coh) >= 35) add(pairs[0][0], 'link', pairs[0][1]);
  for (const n of [...need].sort((a, b) => b.fear - a.fear)) if (n.fear > 40) add(n.id, 'summit');
  return acts;
}

/** The computer's crisis answer: lowest expected cost of war against what each response does to the alliance. */
export function computerRespond(s, salt = 0) {
  if (salt && makeRng(s.seed, STREAM.ai + 50 + s.turn, salt).u() < 0.2) return 'restrain';
  const c = s.crisis, x = s.allies[c.ally], I = intel(s)[c.ally];
  const val = { full: c.kind === 'probe' ? 12 : 3, restrain: c.kind === 'probe' ? 6 : 6, out: c.kind === 'probe' ? -14 * (1 + 0.5 * x.stake) : -4 };
  if (c.kind === 'provoked' && I.entrap > 40) val.full -= 6;
  const cost = r => 100 * warOdds(s, c, r) * 0.9;
  return ['full', 'restrain', 'out'].reduce((b, r) => (val[r] - cost(r) > val[b] - cost(b) ? r : b), 'restrain');
}

/* ---------- Scripted strategies (balance testing) ---------- */
const reassureOrder = ['guarantee', 'deploy', 'exercise', 'arms', 'summit'];
export const STRATEGIES = {
  computer: { plan: s => computerPlan(s), respond: computerRespond },
  reassureAll: {
    plan: s => { const acts = []; for (const id of reassureOrder) for (const a of IDS) acts.push({ ally: a, id, f: id === 'guarantee' ? 'treaty' : id === 'arms' ? 'offensive' : null }); return acts; },
    respond: () => 'full',
  },
  reassureSome: {
    plan: s => { const acts = []; for (const id of ['summit', 'exercise', 'guarantee']) for (const a of IDS) acts.push({ ally: a, id, f: id === 'guarantee' ? 'public' : null }); return acts; },
    respond: () => 'full',
  },
  restrainAll: {
    plan: s => { const acts = []; for (const id of ['warn', 'pressure', 'condition', 'refuse']) for (const a of IDS) acts.push({ ally: a, id, f: id === 'pressure' ? 'loud' : null }); return acts; },
    respond: s => (s.crisis.kind === 'probe' ? 'restrain' : 'out'),
  },
  neglect: { plan: () => [], respond: () => 'out' },
  random: {
    plan: s => { const r = makeRng(s.seed, 900 + s.turn); const ids = ['deploy', 'summit', 'exercise', 'guarantee', 'arms', 'warn', 'condition', 'refuse', 'pressure', 'link'];
      return Array.from({ length: 8 }, () => { const id = ids[Math.floor(r.u() * ids.length)], ally = IDS[Math.floor(r.u() * 4)];
        return { ally, id, f: id === 'link' ? IDS[(IDS.indexOf(ally) + 1 + Math.floor(r.u() * 3)) % 4] : id === 'guarantee' ? ['private', 'public', 'treaty'][Math.floor(r.u() * 3)] : id === 'arms' ? 'defensive' : id === 'pressure' ? 'quiet' : null }; }); },
    respond: s => ['full', 'restrain', 'out'][makeRng(s.seed, 950 + s.turn).pick([1, 1, 1])],
  },
};

/** Play a whole game with a strategy. onYear(s) is called after each year closes. */
export function playOut(seed, strat = STRATEGIES.computer, onYear) {
  let s = newGame({ seed });
  while (!s.over) {
    s = brief(s);
    s = act(s, strat.plan(s)).state;
    if (s.crisis) s = respond(s, strat.respond(s)).state;
    if (onYear) onYear(s);
  }
  return s;
}

/** Benchmark: the computer hub plays the player's own world (same seed, allies and dice) n times, each with
 * a different jitter in how it reads the allies' fears, so its results form a spread to rank the player in. */
export function benchmark(seed, n = P.benchRuns, from = 0) {
  const out = [];
  for (let i = from + 1; i <= from + n; i++) out.push(score(playOut(seed, { plan: s => computerPlan(s, 1, i), respond: s => computerRespond(s, i) })).total);
  return out;
}
export const allyName = id => BY[id].name;
