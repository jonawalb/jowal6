// Static page sections: raid mixes, costs, notional parameters and sources.
import { RAIDS } from '../data/raids.js';
import { COST, THREAT_COST } from '../data/costs.js';
import { SRC } from '../data/sources.js';
import { WEAPONS, WEAPON_ORDER, THREATS, THREAT_ORDER, WAVE_TRACKS, SPEED } from '../data/params.js';
import { scaleMix } from './sim.js';
import { range, esc } from './fmt.js';

const cite = keys => keys.map(k => `<a href="${SRC[k].u}" target="_blank" rel="noopener">[${Object.keys(SRC).indexOf(k) + 1}]</a>`).join(' ');
const N = '<span class="notional">notional</span>';

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
      return [`${W.name}`, `${W.sites.length} sites, magazine ${W.mag} for the night, ${W.reload} s reload per site, range ${W.range} units; kill chance ${pk(w)}`];
    }),
    ...THREAT_ORDER.map(t => [THREATS[t].name, `speed ${THREATS[t].speed} units/s, ${THREATS[t].dmg} damage point${THREATS[t].dmg > 1 ? 's' : ''} if it leaks`]),
    ['Field', '1,000 × 720 game units; one wave is compressed into about a minute'],
    ['Wave sizes', WAVE_TRACKS.join(', ') + ' tracks'],
    ['Reduced motion', `game runs at ${SPEED.reduced}× speed`],
  ];
  document.getElementById('param-table').innerHTML = `<thead><tr><th>Parameter</th><th>Value ${N}</th></tr></thead><tbody>`
    + rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('') + '</tbody>';

  document.getElementById('sources').innerHTML = Object.values(SRC).map((s, i) =>
    `<li>[${i + 1}] <a href="${s.u}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join('');
}
