// The balance table in the method section, from data/balance.js (written by scripts/balance.mjs).
import { BALANCE } from '../data/balance.js';

const $ = id => document.getElementById(id);
const pct = x => `${Math.round(x * 100)}%`;

export const BOTS = {
  random: ['Random', 'spends its effort on random actions at random points within 90 nm of the report, and fires at random.'],
  lazy: ['Lazy', 'searches nothing, leaves the ship where it starts, and fires once at the map\'s best spot on the last turn.'],
  barrier: ['Barrier at the gaps', 'lays buoy lines across the courses to the two southern gaps and relays them farther south every 8 hours; checks the brightest spot with the helicopter or a buoy circle; attacks at 45% odds.'],
  follow: ['Follow the map', 'every turn moves the ship toward the brightest spot, dips the helicopter on it, drops a buoy circle on the next brightest, and flies the aircraft when effort allows; attacks at 45% odds.'],
  good: ['Good player', 'spends each point where it buys the most chance of hearing the sub, saves effort when nothing is worth it, keeps the ship off a sub the map thinks is shy, and lowers its bar for attacking from 40% as time runs out.'],
};

export function renderBalance() {
  const rows = BALANCE.rows;
  $('bal-who').innerHTML = rows.map(r => `<li><b>${BOTS[r.name][0]}</b> ${BOTS[r.name][1]}</li>`).join('');
  $('bal-table').innerHTML = '<tr><th>Scripted player</th><th>Found</th><th>95% range</th><th>Slipped out</th><th>Time ran out</th><th>Found by habit: sprint-drift / zig-zag / shy / loiter</th></tr>' +
    rows.map(r => `<tr><td>${BOTS[r.name][0]}</td><td class="num"><b>${pct(r.found / r.n)}</b></td><td class="num">${pct(r.lo)}–${pct(r.hi)}</td><td class="num">${pct(r.escaped / r.n)}</td><td class="num">${pct(r.timeout / r.n)}</td>
      <td class="num">${['sprinter', 'zigzag', 'shy', 'loiter'].map(b => pct(r.byBeh[b].found / Math.max(1, r.byBeh[b].n))).join(' / ')}</td></tr>`).join('');
  $('bal-note').textContent = `${BALANCE.n.toLocaleString('en-US')} hunts per player, seeds 1–${BALANCE.n.toLocaleString('en-US')}, run ${BALANCE.date}. The scripted players use 1,500 particles in their maps rather than the page's 4,000. "95% range" is the normal-approximation interval for the share found.`;
}
