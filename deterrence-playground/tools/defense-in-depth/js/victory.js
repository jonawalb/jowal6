// Victory is territory only (SPEC §4; D-14, D-15). The attacker wins if, at the end of the final turn, it
// holds at least `need` contiguous objective-line sectors (2 / 3 / 4 by scale). A sector counts as held if
// it contains unbroken attacker units totalling >= 5 strength (half a company) and no unbroken defender.
// The game ends early only if the attacker has no unbroken unit on the map and none still to arrive.
import { SCALES } from '../data/scales.js';
import { gridFor } from './grid.js';
import { fighting, isCompany } from './forces.js';

export const HALF_COMPANY = 5;

/** Objective tracker: per-column hold flags, the best contiguous run, and whether the attacker meets `need`. */
export function objectiveStatus(g) {
  const S = SCALES[g.scale], G = gridFor(g.scale), row = S.obj.row, need = S.obj.need;
  const held = [];
  for (let c = 0; c < G.cols; c++) {
    const s = G.idx(row, c);
    let a = 0, d = false;
    for (const u of g.units) {
      if (u.sec !== s || !fighting(u) || !isCompany(u)) continue;
      if (u.side === 'att') a += u.str; else d = true;
    }
    held.push(a >= HALF_COMPANY && !d);
  }
  let best = 0, run = 0, at = -1, bestAt = -1;
  held.forEach((h, c) => { if (h) { if (!run) at = c; run++; if (run > best) { best = run; bestAt = at; } } else run = 0; });
  return { row, name: S.obj.name, need, held, best, bestAt, attWins: best >= need,
    text: `The attacker holds ${best} of the ${need} side-by-side objective sectors needed.` };
}

/** Is the attacker spent (nothing unbroken on the map and nothing still to arrive)? */
export const attackerSpent = g => !g.units.some(u => u.side === 'att' && !u.broken && isCompany(u) && (u.sec >= 0 ? u.str > 0 : u.arrive != null && u.arrive >= g.t));

/** Check for the end of the game after an hour; sets g.over. */
export function checkVictory(g) {
  const S = SCALES[g.scale];
  if (attackerSpent(g)) { g.over = { winner: 'def', h: g.t, why: 'spent' }; return g.over; }
  if (g.t >= (g.turns || S.turns)) {
    const o = objectiveStatus(g);
    g.over = { winner: o.attWins ? 'att' : 'def', h: g.t, why: 'time', best: o.best, need: o.need };
  }
  return g.over;
}
