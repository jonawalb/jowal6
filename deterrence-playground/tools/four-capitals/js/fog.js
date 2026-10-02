// Fog of war: what one capital can see of another's formations. Pure functions over the game state, used by the
// map, the contacts list, the landing odds shown before the month resolves and the computer's force planning, so
// the human and the computer see the board by the same rules. Illustrative game design, not a sensor model.
import { SEA, ISLAND, SECTOR_SEA, adjacent, SIDE } from '../data/theater.js';
import { FBY, TYPES } from '../data/formations.js';
import { eff, contributors } from './forces.js';
import { makeRng, STREAM } from './rng.js';

const IDS = ['us', 'tw', 'cn', 'jp'];
export const FOG = {
  near: { frac: 0.2, min: 0.5 },   // a close read: half-width of the range as a share of the true value, and its floor
  far: { frac: 0.4, min: 1 },      // a rough read
  unidentified: 0.5,               // chance each formation's type is unknown on a rough read
  shift: 0.4,                      // deception: how far "look smaller" / "look bigger" moves the middle of a range
  widen: 0.8,                      // deception: how much "blur the picture" widens a range
};
export const SIGHT_LABEL = { exact: 'Exact', near: 'Close read', far: 'Rough read' };
const WORSE = { exact: 'near', near: 'far', far: 'far' };

const partners = who => IDS.filter(w => w !== who && SIDE[w] === SIDE[who]);
const present = (s, who, a) => s.units[who].some(u => u.at === a && u.str > 0);

/**
 * How well `obs` sees `target`'s forces in `area`: 'exact', 'near' (a close read) or 'far' (a rough read).
 * Exact: your own and your partners' forces; anywhere, if your surveillance paid off last month; or a sea area where
 * your own formations are. Close: a sea area next to one of yours, or where a partner's formations are; Taiwan's
 * coast from a sea area that gives access to it. Rough: everything else, including the Rear and Taiwan's inland
 * reserve. If you burned your sources last month (a public intelligence release), you see one step worse and your
 * surveillance does not count.
 */
export function sight(s, obs, target, area) {
  if (obs === target || SIDE[obs] === SIDE[target]) return 'exact';
  const blind = !!s.blind?.[obs];
  let lvl;
  if (!blind && s.sharp?.[obs]) return 'exact';
  if (SEA.includes(area)) {
    if (present(s, obs, area)) lvl = 'exact';
    else if (SEA.some(b => adjacent(area, b) && present(s, obs, b)) || partners(obs).some(p => present(s, p, area))) lvl = 'near';
    else lvl = 'far';
  } else if (ISLAND.includes(area) && SECTOR_SEA[area]?.some(b => present(s, obs, b))) lvl = 'near';
  else lvl = 'far';
  return blind ? WORSE[lvl] : lvl;
}

/** Deception in force on `target`'s forces this month ({ mode, m } or null): feints and decoys from last month. */
const deceit = (s, target, lvl) => (lvl !== 'exact' && s.deceive?.[target]) || null;

/**
 * A range for a true value `v` seen at `lvl`: { lo, hi, mid, exact }. The truth always lies inside the range unless
 * deception shifted it. Deterministic for a given month, observer, target and area.
 */
export function range(s, obs, target, area, v, lvl = sight(s, obs, target, area)) {
  if (lvl === 'exact' || v <= 0) return { lo: v, hi: v, mid: v, exact: true };
  const d = deceit(s, target, lvl), F = FOG[lvl];
  let half = Math.max(F.min, F.frac * v), centre = v;
  if (d?.mode === 'confuse') half *= 1 + FOG.widen * d.m;
  if (d?.mode === 'inflate') centre = v * (1 + FOG.shift * d.m);
  if (d?.mode === 'hide') centre = v * (1 - FOG.shift * d.m);
  const r = makeRng(s.seed, STREAM.fog + s.turn, IDS.indexOf(obs) * 100 + IDS.indexOf(target) * 20 + [...SEA, 'rear', ...ISLAND].indexOf(area));
  const lo0 = centre - 2 * half * r.u();
  const lo = Math.max(v >= 1 && !d ? 1 : 0, Math.floor(lo0)), hi = Math.max(lo + 1, Math.ceil(lo0 + 2 * half));   // something seen is at least 1
  return { lo, hi, mid: (lo + hi) / 2, exact: false };
}

/** What `obs` sees of `target` in `area`: null if nothing is there, else the range of its raw strength, the sight
 * level, any deception, and each formation's type (or 'Unidentified'). */
export function seen(s, obs, target, area) {
  const list = s.units[target].filter(u => u.at === area && u.str > 0);
  const v = list.reduce((t, u) => t + u.str, 0);
  if (v <= 0) return null;
  const lvl = sight(s, obs, target, area), r = range(s, obs, target, area, v, lvl), d = deceit(s, target, lvl);
  const rt = makeRng(s.seed, STREAM.fog + 50 + s.turn, IDS.indexOf(obs) * 100 + IDS.indexOf(target) * 20 + [...SEA, 'rear', ...ISLAND].indexOf(area));
  const types = list.map(u => {
    const unknown = lvl === 'far' ? rt.u() < FOG.unidentified : lvl === 'near' && d?.mode === 'hide';
    return { id: u.id, name: lvl === 'exact' ? FBY[u.id].short : null, type: unknown ? 'Unidentified' : TYPES[FBY[u.id].type].label };
  });
  return { ...r, v: lvl === 'exact' ? v : null, lvl, deceived: !!d, types };
}

/** The computer's (and the landing odds') estimate of a side's effective strength in a sea area, as `obs` sees it:
 * exact for its own side, the middle of each rival capital's range otherwise. */
export function estStrength(s, obs, side, area) {
  const con = contributors(s, side, area);
  if (side === SIDE[obs]) return con.reduce((t, c) => t + eff(c.u) * c.wt, 0);
  let t = 0;
  for (const w of new Set(con.map(c => c.w))) {
    const v = con.filter(c => c.w === w).reduce((x, c) => x + eff(c.u) * c.wt, 0);
    t += range(s, obs, w, area, v).mid;
  }
  return t;
}

/** Estimated Taiwanese defence of a coast as `obs` sees it (see landing.js for the true figure). */
export function estDefence(s, obs, sector, reserve) {
  const at = a => s.units.tw.filter(u => u.at === a && u.str > 0).reduce((t, u) => t + eff(u), 0);
  return range(s, obs, 'tw', sector, at(sector)).mid + reserve * range(s, obs, 'tw', 'res', at('res')).mid;
}
