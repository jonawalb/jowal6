// The opponent. Red answers Blue's previous month (moves are simultaneous) according to a hidden posture:
//   restrained: reversible means only, until Blue destroys two satellites or touches its warning satellites;
//   reciprocal: mirrors Blue's last month, kinetic for kinetic and warning for warning;
//   aggressive: goes kinetic against reconnaissance and communications as soon as the war starts.
// All three are notional doctrines written for the game, not models of any real state.
import { CRISIS_TURNS, MISSIONS } from '../data/params.js';
import { ACTS, valid, isKinetic } from './actions.js';

const REV = [{ a: 'dazzle', m: 'isr' }, { a: 'jam', m: 'com' }, { a: 'jam', m: 'nav' }, { a: 'cyber', m: 'com' }];

function fill(g, want, r) {
  const out = [];
  for (const x of want) { if (out.length < 2 && valid(g, 'R', x, out)) out.push(x); }
  let i = Math.floor(r() * REV.length);
  for (let k = 0; out.length < 2 && k < 8; k++, i++) { const x = REV[i % REV.length]; if (valid(g, 'R', x, out)) out.push(x); }
  while (out.length < 2) out.push({ a: 'hold', m: null });
  return out;
}

/** Red's two actions for the coming month. `r` is a seeded generator for this turn. */
export function redChoose(g, P, r) {
  const t = g.turn, war = t > CRISIS_TURNS, R = g.sides.R, B = g.sides.B, last = g.lastActs.B || [];
  const u = r();
  const want = [];
  // Housekeeping for every posture: relaunch a mission that has fallen below what it needs
  // (counting satellites already launched and due next month).
  for (const m of ['isr', 'com', 'ew', 'nav']) if (R.alive[m] + (R.pending[m] || 0) < MISSIONS[m].need && R.stock.reconst > 0) { want.push({ a: 'reconst', m }); break; }
  // Dodge after being shot at, some of the time.
  const jammed = last.find(x => ACTS[x.a] && ACTS[x.a].kind === 'rev' && !R.hard[x.m]);
  if (jammed && r() < 0.5) want.push({ a: 'harden', m: jammed.m });
  const shot = last.find(x => isKinetic(x.a) && x.m);
  if (shot && u < 0.3) want.push({ a: 'maneuver', m: shot.m });

  if (g.posture === 'restrained') {
    const provoked = B.kills >= 2 || B.ewHit;
    if (!war && !R.hard.isr) want.push({ a: 'harden', m: 'isr' });
    if (war && provoked) want.unshift({ a: 'asat', m: 'isr' }, { a: 'asat', m: 'com' });
    if (war && provoked && B.ewHit) want.unshift({ a: 'coorb', m: 'ew' });
  } else if (g.posture === 'reciprocal') {
    for (const x of last) {
      if (ACTS[x.a] && ACTS[x.a].on === 'enemy') want.unshift({ a: x.a, m: x.m });
      else if (x.a && x.a !== 'hold') want.push(REV[Math.floor(r() * REV.length)]);
    }
    if (!war && !last.length && !R.hard.com) want.push({ a: 'harden', m: 'com' });
  } else {
    if (war) {
      want.unshift({ a: 'asat', m: B.alive.isr > 0 ? 'isr' : 'com' }, { a: 'dazzle', m: 'isr' }, { a: 'coorb', m: 'nav' });
      if (B.ewHit) want.unshift({ a: 'coorb', m: 'ew' });
    } else want.push({ a: 'cyber', m: 'nav' }, { a: 'jam', m: 'com' });
  }
  // Offense first, housekeeping second, when there are more wishes than actions.
  want.sort((a, b) => (ACTS[b.a].on === 'enemy') - (ACTS[a.a].on === 'enemy'));
  return fill(g, want, r);
}
