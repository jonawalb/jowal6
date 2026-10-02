// The economic shock meter (Batch B): the shared "Global economic shock" track read as a market and
// shipping-insurance index. Moves push it up once (blockade, sanctions, cable cuts, mineral bans...); while a
// blockade, cut cables, sanctions or a shooting war last, it rises again every month. Each month it erodes every
// economy (data/params.js shockToEconomy) and, above 20, costs every capital home support, China included; it eases
// at Coercion or below. It also counts as an opportunity cost in the peace-forum equation (js/forum.js). Illustrative.
import { P } from '../data/params.js';
import { COUNTRIES, IDS } from '../data/countries.js';
import { T } from '../data/actions.js';

const E = P.econ;
const LABEL = { blockade: 'blockade', cables: 'cut cables', sanctions: 'sanctions on China', war: 'war-risk insurance' };

/** What pushes the index up this month: [[driver, points]]. */
export function shockDrivers(s) {
  const D = E.drivers, out = [];
  if (s.blockade) out.push(['blockade', D.blockade * s.blockade * Math.max(0, 1 - (s.escort || 0))]);
  if (s.cables > 0) out.push(['cables', D.cables]);
  if (s.sanctions > 0) out.push(['sanctions', D.sanctions]);
  if (s.rung >= 3) out.push(['war', D.war]);
  return out.filter(([, d]) => d > 0);
}
/** Home support the shock costs `who` this month (negative). */
export const shockSupport = (s, who) => -E.support[who] * Math.max(0, s.shock - E.floor) / 10;

/** Monthly: the drivers, then the cost to every economy and (above the floor) every capital's home support. */
export function econMonth(s, log) {
  const up = shockDrivers(s);
  for (const [, d] of up) T(s, 'shock', d);
  if (up.length) log.push({ kind: 'note', econ: true, text: `Markets and shipping insurance: the shock rises ${up.map(([k, d]) => `${+d.toFixed(1)} (${LABEL[k]})`).join(', ')}.` });
  for (const who of IDS) {
    T(s, `${who}.economy`, -s.shock * P.shockToEconomy[who]);
    T(s, `${who}.support`, shockSupport(s, who));
    if (s.c[who].economy < 40) T(s, `${who}.support`, -3);
  }
  if (s.sanctions > 0) s.sanctions -= 1;
  if (s.minerals > 0) s.minerals -= 1;
}

/** The one-line explanation under the meter. */
export function shockLine(s) {
  const up = shockDrivers(s), v = Math.round(s.shock);
  const cost = IDS.map(w => `${COUNTRIES[w].short} ${(-shockSupport(s, w)).toFixed(1)}`).join(', ');
  return `Markets and shipping insurance. ${up.length ? `Rising ${+up.reduce((t, [, d]) => t + d, 0).toFixed(1)} a month (${up.map(([k, d]) => `${LABEL[k]} +${+d.toFixed(1)}`).join(', ')}). ` : ''}`
    + (v > E.floor ? `At ${v} it costs every capital home support each month (${cost}) and erodes economies.` : `Above ${E.floor} it starts costing every capital home support each month; it already erodes economies.`)
    + (s.rung <= 1 ? ' It eases by 4 a month at Coercion or below.' : '');
}

/** The tooltip for the meter. */
export const SHOCK_TIP = {
  title: 'Economic shock: markets and shipping insurance',
  lines: [
    'Jumps when a move hits trade or markets (blockade, quarantine, sanctions, mineral bans, cable cuts, chip leverage).',
    `Rises again every month while a blockade (+${E.drivers.blockade}, less with escorts), cut cables (+${E.drivers.cables}), sanctions on China (+${E.drivers.sanctions}) or a shooting war (+${E.drivers.war}) last.`,
    `Every month it erodes every economy, and above ${E.floor} costs every capital home support (per 10 points above ${E.floor}: U.S. ${E.support.us}, Taiwan ${E.support.tw}, China ${E.support.cn}, Japan ${E.support.jp}).`,
    'It also counts as an opportunity cost when a capital weighs a peace forum.',
  ],
  notes: ['It eases by 4 a month at Coercion or below. All numbers are illustrative.'],
};
