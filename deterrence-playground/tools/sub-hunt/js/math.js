// "The math" card: Koopman's random search formula with this game's numbers, and the towed array's
// lateral range curve. Updates when the player picks a tool.
import { el } from '../../../shared/js/mapkit.js';
import { SENSORS, SUB, GAME } from '../data/params.js';
import { randomSearch, lateral, lateralW, BUOY_AREA, MPA_AREA } from './sensors.js';

const f1 = x => x.toFixed(1), pct = x => `${Math.round(x * 100)}%`;
const B = SENSORS.buoy, M = SENSORS.mpa;

function row(mode) {
  const v = SUB[mode];
  const W = B.n * 2 * B.rDet[mode];
  return `<tr><td>${mode === 'quiet' ? `Quiet, ${v} kt` : `Sprint, ${v} kt`}</td><td class="num">${f1(W)}</td><td class="num">${v}</td><td class="num">${pct(randomSearch(W, v, BUOY_AREA))}</td></tr>`;
}

export function mathHtml(tool) {
  if (tool === 'mpa') {
    return `<p class="fine">Koopman's <b>random search</b> formula (1946, p. 28): if the sub is somewhere in the box and the
      aircraft's track wanders over it, the chance of detection in an hour is</p>
      <p class="sh-eq">P = 1 − e<sup>−W·L/A</sup></p>
      <div class="tablewrap"><table><tr><th>Sub</th><th>W nm</th><th>L nm</th><th>A nm²</th><th>P / hour</th></tr>
      ${['quiet', 'sprint'].map(m => `<tr><td>${m === 'quiet' ? 'Quiet' : 'Sprint'}</td><td class="num">${M.W[m]}</td><td class="num">${M.L}</td><td class="num">${MPA_AREA.toLocaleString()}</td><td class="num">${pct(randomSearch(M.W[m], M.L, MPA_AREA))}</td></tr>`).join('')}
      </table></div>
      <p class="fine">W is the sweep width, L the track flown, A the box. All three are <span class="notional">notional</span>.
      Doubling the track does not double the chance: overlapping search is wasted, which is where the exponential comes from.</p>`;
  }
  if (tool === 'ship') {
    return `<p class="fine">The towed array uses a <b>lateral range curve</b> (Koopman, p. 24): the chance of detecting a sub
      as a function of how close it passes to the ship's track. The area under the curve is the <b>sweep width</b> W.</p>
      <svg class="sh-lrc" id="lrc" viewBox="0 0 320 130" role="img" aria-label="Lateral range curves for a quiet and a sprinting sub"></svg>
      <p class="fine">Quiet sub: W = ${f1(lateralW('quiet'))} nm. Sprinting sub: W = ${f1(lateralW('sprint'))} nm.
      Faster means louder. Curve shapes are <span class="notional">notional</span>.</p>`;
  }
  if (tool === 'pros') {
    return `<p class="fine">Prosecuting commits your one attack. You win if the sub is within ${GAME.prosR} nm of your mark
      <span class="notional">notional</span>. The panel shows how much of your map's probability lies inside that ring: that is your
      chance of success if your map is right. Your map is only as good as its assumptions.</p>`;
  }
  return `<p class="fine">A sonobuoy field sits still while the sub moves through it, so the sub's own speed supplies the track
    length L in Koopman's <b>random search</b> formula (1946, p. 28):</p>
    <p class="sh-eq">P = 1 − e<sup>−W·L/A</sup></p>
    <div class="tablewrap"><table><tr><th>Sub</th><th>W nm</th><th>L nm/h</th><th>P / hour</th></tr>${row('quiet')}${row('sprint')}</table></div>
    <p class="fine">W here is ${B.n} buoys × twice each buoy's detection radius; A = ${Math.round(BUOY_AREA).toLocaleString()} nm². A sprinting sub
    is both louder (wider W) and covers more water (longer L), so it lights up the field. Every number is <span class="notional">notional</span>.</p>`;
}

/** Draw the lateral range curves into #lrc if it is on the page. */
export function drawLRC(root) {
  const svg = root.querySelector('#lrc');
  if (!svg) return;
  const X = 40, W = 290, H = 100, T = 8, sx = x => 30 + (x + X) / (2 * X) * W, sy = p => T + (1 - p) * H;
  const ax = el('g', { class: 'tsm-axis' }, svg);
  el('line', { x1: 30, y1: sy(0), x2: 30 + W, y2: sy(0) }, ax);
  for (const x of [-40, -20, 0, 20, 40]) el('text', { x: sx(x), y: sy(0) + 14, 'text-anchor': 'middle' }, ax, `${x}`);
  for (const p of [0, 0.5, 1]) el('text', { x: 26, y: sy(p) + 4, 'text-anchor': 'end' }, ax, `${p}`);
  el('text', { x: 30 + W, y: sy(0) - 4, 'text-anchor': 'end' }, ax, 'lateral range, nm');
  for (const mode of ['sprint', 'quiet']) {
    const pts = [];
    for (let x = -X; x <= X; x += 1) pts.push(`${sx(x).toFixed(1)},${sy(lateral(Math.abs(x), mode)).toFixed(1)}`);
    el('path', { d: `M${sx(-X)},${sy(0)}L${pts.join('L')}L${sx(X)},${sy(0)}Z`, class: `sh-lrc-a ${mode}` }, svg);
    el('path', { d: `M${pts.join('L')}`, class: `sh-lrc-l ${mode}` }, svg);
  }
  el('text', { x: sx(15), y: sy(0.75), class: 'sh-lrc-t sprint' }, svg, 'sprint');
  el('text', { x: sx(5), y: sy(0.3) - 6, class: 'sh-lrc-t quiet' }, svg, 'quiet');
}
