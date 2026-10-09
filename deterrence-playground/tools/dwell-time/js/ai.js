// Computer responders. They see only what the team sees (alerts, verdicts, clocks, the business meters),
// never the attacker's hidden state. "textbook" follows NIST SP 800-61r3 / CISA practice; the others are
// the common failure modes, used by scripts/balance.mjs and for the comparison on the end screen.
import { ACTIONS, actionById, slotsFor, cost } from './actions.js';
import { blocked, openFlags, newGame, step } from './engine.js';
import { sectorById } from '../data/sectors.js';

function pick(s, wants) {
  const left = slotsFor(s), out = [];
  for (const id of wants) {
    const a = actionById(id);
    if (!a || out.includes(id) || blocked(s, a, out)) continue;
    const c = cost(a);
    if (Object.entries(c).some(([r, n]) => (left[r] || 0) < n)) continue;
    for (const [r, n] of Object.entries(c)) left[r] -= n;
    out.push(id);
  }
  return out;
}

export const POLICIES = {
  textbook(s) {
    const anyFlag = s.flags.some(x => x.st !== 'fp');
    const real = s.flags.filter(x => x.st === 'confirmed').length;
    const quietHunt = s.lastHunt && s.lastHunt.t === s.t - 1 && s.lastHunt.found === 0;
    const huntedTwice = s.log.filter(l => l.acts.includes('hunt')).length >= 2;
    const evicted = s.d.evictT != null;
    const ready = s.d.declared != null && real >= 1 && (quietHunt || s.t >= 5) && huntedTwice && !evicted;
    const w = [];
    if (anyFlag) w.push('declare', 'authorize', 'vendoroff', 'insurer', 'triage', 'irfirm', 'oob', 'counsel', 'hold', 'le');
    if (ready) w.push('evict', 'vector', 'vendoroff');
    if (s.clocks.some(k => k.filedH == null)) w.push('file', 'notify');
    if (s.ransom) w.push('ofac', 'negotiate');
    if (sectorById(s.sector).public && s.d.aware != null && (s.biz.ops < 70 || s.d.breachT != null)) w.push('materiality');
    if (s.biz.ops < 80) w.push('continuity', 'restore');
    if (s.d.publicT != null || s.biz.ops < 90) w.push('holding', 'customers');
    if (anyFlag) w.push('staff', 'image', 'hunt', 'monitor', 'board', 'intel');
    if (evicted) w.push('hunt', 'vector', 'restore', 'customers');
    return pick(s, w);
  },
  whack(s) {
    const w = ['triage', 'disable', 'isolate', 'reimage'];
    if (s.biz.ops < 60) w.push('declare', 'irfirm', 'insurer', 'restore', 'restore', 'reassure', 'file');
    if (s.ransom && s.biz.ops < 40) w.push('pay');
    return pick(s, w);
  },
  nuke(s) {
    const any = openFlags(s).length || s.flags.length;
    if (!any) return [];
    const w = ['authorize', 'declare', 'resetall', 'offline', 'reimage', 'insurer', 'holding', 'counsel'];
    if (s.d.offline && s.t >= 5) w.push('online');
    w.push('rebuild', 'restore', 'file', 'notify');
    return pick(s, w);
  },
  passive(s) {
    const w = [];
    if (s.biz.ops < 50) w.push('declare', 'insurer', 'irfirm', 'restore', 'holding');
    if (s.ransom) w.push('pay');
    return pick(s, w);
  },
};

export function playPolicy(setup, name) {
  let s = newGame(setup);
  const f = POLICIES[name];
  while (!s.over) s = step(s, { acts: f(s) }).state;
  return s;
}
export { ACTIONS };
