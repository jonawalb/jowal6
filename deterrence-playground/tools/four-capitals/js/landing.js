// Landings on Taiwan's coast, at region level. China picks an emphasis sector; Taiwan positions its reserve
// and the United States its fires without seeing that choice. Illustrative game design, not an invasion model.
import { SECTOR_SEA, AREA_LABEL } from '../data/theater.js';
import { FBY } from '../data/formations.js';
import { eff } from './forces.js';

const sum = l => l.reduce((t, u) => t + eff(u), 0);
const typ = u => FBY[u.id].type;
export const LAND = {
  ratio: 15, cap: [-40, 25],   // odds points per unit of (assault − 1.5 × defence) / defence
  fire: 0.4, second: 0.5,      // shares of fleet/air support in the access area and of the group armies that count
  reserve: 0.4,                // share of Taiwan's inland reserve that reaches a coast it was not waiting on
  twEmph: -12, usEmph: -10,    // Taiwan's reserve or U.S. fires already on the landing coast
};

/** The sea area a landing on `sector` goes through: one China holds, with amphibious forces in it. */
export const accessSea = (s, sector) => (SECTOR_SEA[sector] || []).find(a => s.ctrl[a] === 'red' && s.units.cn.some(u => u.at === a && u.str > 0 && typ(u) === 'amph')) || null;

/** Why China cannot land on `sector` now (null if it can try). */
export function landingWhy(s, sector) {
  const seas = SECTOR_SEA[sector];
  if (!seas) return 'Choose a landing coast';
  const names = seas.map(a => `the ${AREA_LABEL[a]}`).join(' or ');
  if (!seas.some(a => s.ctrl[a] === 'red')) return `China must hold ${names} to land on the ${AREA_LABEL[sector].toLowerCase()}`;
  if (!accessSea(s, sector)) return `China needs an amphibious formation in ${names}`;
  return null;
}

/** Assault strength: amphibious forces in the access area, part of the fleet and air there, and (if committed)
 * half of the group armies following as the second echelon. */
export function assault(s, sector, follow) {
  const a = accessSea(s, sector) || SECTOR_SEA[sector][0];
  const here = s.units.cn.filter(u => u.at === a && u.str > 0);
  const second = follow ? sum(s.units.cn.filter(u => typ(u) === 'land' && u.at === 'rear' && u.str > 0)) : 0;
  return sum(here.filter(u => typ(u) === 'amph')) + LAND.fire * sum(here.filter(u => typ(u) !== 'amph')) + LAND.second * second;
}
/** Defence before anyone's emphasis: Taiwan's formations on that coast plus part of the inland reserve. */
export const defence = (s, sector) => sum(s.units.tw.filter(u => u.at === sector && u.str > 0)) + LAND.reserve * sum(s.units.tw.filter(u => u.at === 'res' && u.str > 0));
/** U.S. fires can only meet a landing from Limited strikes up, with munitions to spare. */
export const usFiresReady = s => s.rung >= 3 && s.res.us.mun >= 1;

/** Odds factors for a landing. `final`: the month is resolving, so the hidden emphasis choices are known. */
export function landingFactors(s, sector, follow, final) {
  const att = assault(s, sector, follow), def = defence(s, sector);
  const k = Math.max(LAND.cap[0], Math.min(LAND.cap[1], Math.round(LAND.ratio * (att - 1.5 * def) / Math.max(1, def))));
  const f = [['Landing force vs defenders on that coast', k]];
  if (final && s.emph.tw === sector) f.push(['Taiwan’s reserve was waiting on that coast', LAND.twEmph]);
  if (final && s.emph.us === sector && usFiresReady(s)) f.push(['U.S. fires were aimed at that coast', LAND.usEmph]);
  return f;
}
