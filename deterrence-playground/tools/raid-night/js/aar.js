// After-action review: the player's night beside two headless replays of the same seed.
import { WEAPONS, WEAPON_ORDER, THREAT_ORDER, RESUPPLY, MODE_NAME } from '../data/params.js';
import { replay } from './policy.js';
import { COST } from '../data/costs.js';
import { range, ratio, esc } from './fmt.js';
import { orderInfo } from './targeting.js';

const RUNS = [['you', 'Your night'], ['heuristic', 'Cheapest-capable rule'], ['premium', 'Best-weapon-first rule']];

const bought = (r, w) => r.resupplied.reduce((a, x) => a + x.added[w], 0);

export function renderAAR(you, seed, { mode = 'normal', batFired = null, lock = 'closest' } = {}) {
  const budget = RESUPPLY.budget[mode] ?? RESUPPLY.budget.normal;
  const R = { you, heuristic: replay(seed, 'heuristic', budget), premium: replay(seed, 'premium', budget) };
  const cell = f => RUNS.map(([k]) => `<td class="num">${f(R[k])}</td>`).join('');
  const rows = [
    ['Leakers (drone / cruise / ballistic)', r => `${r.leakTotal} <span class="muted">(${THREAT_ORDER.map(t => r.leaks[t]).join(' / ')})</span>`],
    ['Damage points', r => r.dmgTotal],
    ['Defense spent', r => range(r.spent.lo, r.spent.hi)],
    ['Threats destroyed, priced', r => range(r.value.lo, r.value.hi)],
    ['Exchange: $ spent per $ destroyed, low estimates', r => ratio(r.ratio.lo)],
    ['Exchange: $ spent per $ destroyed, high estimates', r => ratio(r.ratio.hi)],
    ['Long-range fired (at drone / cruise / ballistic)', r => `${r.fired.lri} <span class="muted">(${THREAT_ORDER.map(t => r.use.lri[t]).join(' / ')})</span>`],
    ['Short-range fired', r => r.fired.sri],
    ['Gun and EW bursts', r => r.fired.gun],
    ['Shots at tracks already down', r => WEAPON_ORDER.reduce((a, w) => a + r.wasted[w], 0)],
    ['Rounds resupplied (guns / short / long)', r => WEAPON_ORDER.map(w => bought(r, w)).join(' / ')],
    ['Resupply points used', r => `${r.resupplied.reduce((a, x) => a + x.pts, 0)} of ${r.budget * 2}`],
  ];
  document.getElementById('aar-table').innerHTML = `<thead><tr><th scope="col">Seed ${seed}</th>${RUNS.map(([, n]) => `<th scope="col">${n}</th>`).join('')}</tr></thead><tbody>`
    + rows.map(([n, f]) => `<tr><th scope="row">${n}</th>${cell(f)}</tr>`).join('') + '</tbody>';

  document.getElementById('aar-mags').innerHTML = WEAPON_ORDER.map(w => {
    const mag = WEAPONS[w].mag;
    const line = ([k, n]) => {
      const pw = R[k].perWave;
      return `<tr><th scope="row">${n}</th>${[0, 1, 2].map(i => {
        const left = pw[i] ? pw[i].ammo[w] : null;
        return `<td>${left == null ? '' : `<span class="mbar" data-w="${w}"><i style="width:${(left / mag * 100).toFixed(1)}%"></i></span><span class="num">${left}</span>`}</td>`;
      }).join('')}</tr>`;
    };
    return `<p class="mag-h">${WEAPONS[w].name} <span class="muted num">(${mag} at dusk)</span></p>
      <div class="tablewrap"><table class="magt"><thead><tr><th></th><th>after wave 1</th><th>2</th><th>3</th></tr></thead><tbody>${RUNS.map(line).join('')}</tbody></table></div>`;
  }).join('');

  const hard = mode === 'hard';
  document.getElementById('aar-mode').innerHTML = `<span class="pill">${hard ? 'Hard mode: two batteries' : `${MODE_NAME[mode]} mode`}</span> `
    + esc(`Lock order at the end: ${orderInfo(lock).name.toLowerCase()}. `)
    + (hard && batFired ? esc(`Left battery fired ${batFired.L} shot${batFired.L === 1 ? '' : 's'}, right battery ${batFired.R}. The rules fire from every site as one defense. `) : '')
    + esc(`Every run got the ${MODE_NAME[mode]}-mode budget of ${budget} resupply points before waves 2 and 3; the rules split theirs in proportion to what they fired in the wave before (see the method).`);

  const h = R.heuristic, lriCheap = you.use.lri.drone + you.use.lri.cruise;
  const parts = [`You let ${you.leakTotal} track${you.leakTotal === 1 ? '' : 's'} through for ${you.dmgTotal} damage points and spent ${range(you.spent.lo, you.spent.hi)}.`,
    `Facing the same raids, the cheapest-capable rule let ${h.leakTotal} through for ${h.dmgTotal} points and spent ${range(h.spent.lo, h.spent.hi)}.`];
  if (lriCheap) parts.push(`You fired ${lriCheap} long-range interceptor${lriCheap > 1 ? 's' : ''} at drones or cruise missiles, about ${range(lriCheap * COST.lri.lo, lriCheap * COST.lri.hi)} at the cost estimates.`);
  if (you.ammo.lri === 0 && you.leaks.ballistic) parts.push('Your long-range magazine ran dry, and ballistic missiles leaked.');
  const p = R.premium;
  parts.push(`Firing the best weapon first at everything spent ${range(p.spent.lo, p.spent.hi)}`
    + (p.ammo.lri === 0 ? `, ran the long-range magazine dry and leaked ${p.leaks.ballistic} ballistic missile${p.leaks.ballistic === 1 ? '' : 's'}.` : ` and leaked ${p.leakTotal} tracks.`));
  document.getElementById('aar-lede').innerHTML = esc(parts.join(' '));
  return R;
}

/** Plain-text result for sharing. */
export function resultText(you, seed, url, mode = 'normal') {
  return `Raid Night, seed ${seed}, ${(MODE_NAME[mode] || 'Normal').toLowerCase()} mode: ${you.leakTotal} leakers, ${you.dmgTotal} damage points, spent ${range(you.spent.lo, you.spent.hi)}, `
    + `exchange ${ratio(you.ratio.lo)} to ${ratio(you.ratio.hi)} (notional model). Same raids: ${url}`;
}
