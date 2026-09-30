// After-action review: the player's night beside two headless replays of the same seed.
import { WEAPONS, WEAPON_ORDER, THREAT_ORDER } from '../data/params.js';
import { replay } from './policy.js';
import { COST } from '../data/costs.js';
import { range, ratio, esc } from './fmt.js';

const RUNS = [['you', 'Your night'], ['heuristic', 'Cheapest-capable rule'], ['premium', 'Best-weapon-first rule']];

export function renderAAR(you, seed) {
  const R = { you, heuristic: replay(seed, 'heuristic'), premium: replay(seed, 'premium') };
  const cell = f => RUNS.map(([k]) => `<td class="num">${f(R[k])}</td>`).join('');
  const rows = [
    ['Leakers (drone / cruise / ballistic)', r => `${r.leakTotal} <span class="muted">(${THREAT_ORDER.map(t => r.leaks[t]).join(' / ')})</span>`],
    ['Damage points', r => r.dmgTotal],
    ['Defense spent', r => range(r.spent.lo, r.spent.hi)],
    ['Threats destroyed, priced', r => range(r.value.lo, r.value.hi)],
    ['Exchange, low estimates', r => ratio(r.ratio.lo)],
    ['Exchange, high estimates', r => ratio(r.ratio.hi)],
    ['Long-range fired (at drone / cruise / ballistic)', r => `${r.fired.lri} <span class="muted">(${THREAT_ORDER.map(t => r.use.lri[t]).join(' / ')})</span>`],
    ['Short-range fired', r => r.fired.sri],
    ['Gun and EW bursts', r => r.fired.gun],
    ['Shots at tracks already down', r => WEAPON_ORDER.reduce((a, w) => a + r.wasted[w], 0)],
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
export function resultText(you, seed, url) {
  return `Raid Night, seed ${seed}: ${you.leakTotal} leakers, ${you.dmgTotal} damage points, spent ${range(you.spent.lo, you.spent.hi)}, `
    + `exchange ${ratio(you.ratio.lo)} to ${ratio(you.ratio.hi)} (notional model). Same raids: ${url}`;
}
