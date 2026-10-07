// Static page sections: raid mixes, costs, notional parameters and sources.
import { RAIDS } from '../data/raids.js';
import { COST, THREAT_COST } from '../data/costs.js';
import { SRC } from '../data/sources.js';
import { WEAPONS, WEAPON_ORDER, THREATS, THREAT_ORDER, WAVE_TRACKS, SPEED, RESUPPLY, BATTERIES, MODES, MODE_NAME } from '../data/params.js';
import { scaleMix } from './sim.js';
import { range, money, esc } from './fmt.js';

const cite = keys => keys.map(k => `<a href="${SRC[k].u}" target="_blank" rel="noopener">[${Object.keys(SRC).indexOf(k) + 1}]</a>`).join(' ');
const N = '<span class="notional">notional</span>';
const SITE_NAME = { gun: 'gun/EW', sri: 'short-range', lri: 'long-range' };

export function renderInfo() {
  document.getElementById('raid-list').innerHTML = RAIDS.map((r, i) => {
    const c = scaleMix(r.mix, WAVE_TRACKS[i]);
    return `<li><b>Wave ${i + 1}: raid mix modelled on ${esc(r.name)}.</b> ${esc(r.detail)} ${cite(r.src)}<br>
      <span class="fine">Reported: ${r.mix.drone} drones, ${r.mix.cruise} cruise, ${r.mix.ballistic} ballistic. In the game: ${c.drone} / ${c.cruise} / ${c.ballistic} tracks.</span></li>`;
  }).join('');

  const row = (name, c) => `<tr><td>${name}</td><td class="num">${c.lo == null ? 'not priced' : range(c.lo, c.hi)}</td><td>${esc(c.note)} ${cite(c.src)}</td></tr>`;
  document.getElementById('cost-table').innerHTML = '<thead><tr><th>Item</th><th>Unit cost</th><th>Basis (estimate)</th></tr></thead><tbody>'
    + WEAPON_ORDER.map(w => row(WEAPONS[w].name, COST[w])).join('')
    + THREAT_ORDER.map(t => row(THREATS[t].name, THREAT_COST[t])).join('') + '</tbody>';

  const pk = w => THREAT_ORDER.map(t => `${THREATS[t].short.toLowerCase()} ${Math.round(WEAPONS[w].pk[t] * 100)}%`).join(', ');
  const rows = [
    ...WEAPON_ORDER.map(w => {
      const W = WEAPONS[w];
      return [`${W.name}`, `${W.sites.length} sites, magazine ${W.mag} at dusk, plus any reloads you buy, ${W.reload} s reload per site, range ${W.range} units; kill chance ${pk(w)}`];
    }),
    ...THREAT_ORDER.map(t => [THREATS[t].name, `speed ${THREATS[t].speed} units/s, ${THREATS[t].dmg} damage point${THREATS[t].dmg > 1 ? 's' : ''} if it leaks`]),
    ['Field', '1,000 × 720 game units; one wave is compressed into about a minute'],
    ['Wave sizes', WAVE_TRACKS.join(', ') + ' tracks'],
    ['Reduced motion', `game runs at ${SPEED.reduced}× speed`],
    ['Resupply budget', `${MODES.map(m => `${MODE_NAME[m]} ${RESUPPLY.budget[m]}`).join(', ')} points before wave 2 and again before wave 3; unspent points are lost; no magazine is filled past its dusk size`],
    ['Reload prices', `guns and EW ${RESUPPLY.gun.pts} point per ${RESUPPLY.gun.per} bursts; short-range ${RESUPPLY.sri.pts} point each; long-range ${RESUPPLY.lri.pts} points each`],
    ['Hard-mode batteries', Object.values(BATTERIES).map(B => `${B.name}: cities ${B.cities.join(' and ')}, sites ${WEAPON_ORDER.map(w => B.sites[w].map(i => `${SITE_NAME[w]} at x = ${WEAPONS[w].sites[i].x}`).join(', ')).join(', ')}`).join('. ') + '. Both share the magazines.'],
  ];
  document.getElementById('param-table').innerHTML = `<thead><tr><th>Parameter</th><th>Value ${N}</th></tr></thead><tbody>`
    + rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('') + '</tbody>';

  const mid = w => (COST[w].lo + COST[w].hi) / 2;
  document.querySelectorAll('.rs-budget').forEach(el => { el.textContent = RESUPPLY.budget.normal; });
  document.querySelectorAll('.rs-budget-easy').forEach(el => { el.textContent = RESUPPLY.budget.easy; });
  document.getElementById('resupply-method').innerHTML = `<b>Resupply between waves.</b> Before waves 2 and 3 the defender gets ${RESUPPLY.budget.normal} points ${N} to buy reloads (${RESUPPLY.budget.easy} in Easy mode; Hard uses the Normal budget).`
    + ` Interceptor prices are scaled to the midpoint of the sourced unit-cost ranges above at one point per ${money(RESUPPLY.usdPerPoint)}, rounded:`
    + ` a short-range reload (midpoint ${money(mid('sri'))}) costs ${RESUPPLY.sri.pts} point and a long-range reload (midpoint ${money(mid('lri'))}) costs ${RESUPPLY.lri.pts}.`
    + ` Guns and EW have no sourced cost, so their price of ${RESUPPLY.gun.pts} point per ${RESUPPLY.gun.per} bursts is ${N}, as are the budget and the rule that no magazine is filled past its dusk size.`
    + ` Buying reloads does not add to "Defense spent", which counts only interceptors fired.`
    + ` So the comparison stays fair, each rule in the review also gets the same budget as the player in the chosen mode before waves 2 and 3 and spends it by a fixed default:`
    + ' in proportion to the points\' worth of what it fired in the wave just ended, rounded down and capped at a full magazine, with leftover points buying one reload at a time for the weapon with the largest share.'
    + ' The "Split like the rules do" button in the resupply panel fills your order the same way.';

  document.getElementById('sources').innerHTML = Object.values(SRC).map((s, i) =>
    `<li>[${i + 1}] <a href="${s.u}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join('');
}
