// "The math behind each sensor": Koopman's random search formula with this game's numbers for the buoy
// circle and the aircraft box, the buoy line's crossing geometry, and the ship's lateral range curve.
import { el } from '../../../shared/js/mapkit.js';
import { SENSORS, SUB } from '../data/params.js';
import { randomSearch, lateral, lateralW, lineP, CIRCLE_AREA, AIR_AREA } from './sensors.js';

const f1 = x => x.toFixed(1), pct = x => `${Math.round(x * 100)}%`;
const C = SENSORS.circle, A = SENSORS.air, LN = SENSORS.line, H = SENSORS.helo;
const SPEEDS = [
  ['Shy, hiding', SUB.shy.quiet, 'quiet'], ['Drifting', SUB.sprinter.drift, 'quiet'], ['Loitering', SUB.loiter.speed, 'quiet'],
  ['Zig-zag', SUB.zigzag.speed, 'quiet'], ['Sprinting', SUB.sprinter.sprint, 'sprint'],
];

const CIRCLE = () => `<h3>Buoy circle</h3>
    <p>The buoys sit still while the sub moves among them, so the sub's own speed supplies the track length L
    in Koopman's <b>random search</b> formula (1946, p. 28):</p>
    <p class="sh-eq">P = 1 − e<sup>−W·L/A</sup></p>
    <div class="tablewrap"><table><tr><th>Sub</th><th>W nm</th><th>L nm/h</th><th>P / hour</th></tr>
    ${SPEEDS.map(([t, v, m]) => { const W = C.n * 2 * C.rDet[m]; return `<tr><td>${t}</td><td class="num">${f1(W)}</td><td class="num">${v}</td><td class="num">${pct(randomSearch(W, Math.max(1, v), CIRCLE_AREA))}</td></tr>`; }).join('')}
    </table></div>
    <p class="fine">W is ${C.n} buoys × twice each buoy's detection radius; A = ${Math.round(CIRCLE_AREA).toLocaleString()} nm².
    A slow sub crosses little water, so it is hard to hear; a sprinting sub is louder (wider W) and covers more water
    (longer L). A hiding shy sub's chance is then cut to ${SUB.shy.hush * 100}% of these. Every number is <span class="notional">notional</span>.</p>`;

const AIR = () => `<h3>Aircraft box</h3>
    <p>The same formula with the aircraft's own track: if the sub is somewhere in the square and the aircraft's
    search track wanders over it, the chance of detection in an hour is P = 1 − e<sup>−W·L/A</sup>.</p>
    <div class="tablewrap"><table><tr><th>Sub</th><th>W nm</th><th>L nm</th><th>A nm²</th><th>P / hour</th></tr>
    ${['quiet', 'sprint'].map(m => `<tr><td>${m === 'quiet' ? 'Quiet' : 'Sprinting'}</td><td class="num">${A.W[m]}</td><td class="num">${A.L}</td><td class="num">${AIR_AREA.toLocaleString()}</td><td class="num">${pct(randomSearch(A.W[m], A.L, AIR_AREA))}</td></tr>`).join('')}
    </table></div>
    <p class="fine">Doubling the track does not double the chance: overlapping search is wasted, which is where the
    exponential comes from. That is why the box is cheap per square mile but blurry and weak against a quiet sub.</p>`;

const LINE = () => `<h3>Buoy line</h3>
    <p>${LN.n} buoys spaced s = ${f1(LN.len / (LN.n - 1))} nm apart along ${LN.len} nm. A sub crossing the line square-on passes within r
    of a buoy with chance 2r / s (plain geometry; the game uses it at every crossing angle and caps it at 95%): ${pct(lineP('quiet'))} for a quiet sub (r = ${LN.rDet.quiet} nm),
    ${pct(lineP('sprint'))} for a sprinting one (r = ${LN.rDet.sprint} nm). A sub that never crosses is never heard, which is why a line
    belongs across a course, not on top of the glow.</p>`;

const HELO = () => `<h3>Helicopter dip</h3>
    <p>A flat chance for the hour of the dip if the sub is within ${H.r} nm: ${pct(H.p.quiet)} quiet, ${pct(H.p.sprint)} sprinting,
    with a small position error (±${H.loc * 2} nm). Narrow, costly and sharp.</p>`;

const SHIP = () => `<h3>Ship's towed array</h3>
    <p>The ship uses a <b>lateral range curve</b> (Koopman, p. 24): the chance of detecting a sub as a function of
    how close it passes to the ship's track. The area under the curve is the <b>sweep width</b> W. A detection gives
    a bearing (±${SENSORS.ship.brg * 2}°), not a position.</p>
    <svg class="sh-lrc" id="lrc" viewBox="0 0 320 130" role="img" aria-label="Lateral range curves for a quiet and a sprinting sub"></svg>
    <p class="fine">Quiet sub: W = ${f1(lateralW('quiet'))} nm. Sprinting sub: W = ${f1(lateralW('sprint'))} nm. The listening network
    hears only sprints (${pct(SENSORS.net.p)} of sprint hours, ±${SENSORS.net.loc * 2} nm). Curve shapes and all values are <span class="notional">notional</span>.</p>`;

/** All sensor models, for the method section. */
export const mathHtml = () => CIRCLE() + LINE() + AIR() + HELO() + SHIP();

/** Draw the lateral range curves into #lrc if it is on the page. */
export function drawLRC(root) {
  const svg = root.querySelector('#lrc');
  if (!svg) return;
  const X = 50, W = 290, Ht = 100, T = 8, sx = x => 30 + (x + X) / (2 * X) * W, sy = p => T + (1 - p) * Ht;
  const ax = el('g', { class: 'tsm-axis' }, svg);
  el('line', { x1: 30, y1: sy(0), x2: 30 + W, y2: sy(0) }, ax);
  for (const x of [-50, -25, 0, 25, 50]) el('text', { x: sx(x), y: sy(0) + 14, 'text-anchor': 'middle' }, ax, `${x}`);
  for (const p of [0, 0.5, 1]) el('text', { x: 26, y: sy(p) + 4, 'text-anchor': 'end' }, ax, `${p}`);
  el('text', { x: 30 + W, y: sy(0) - 4, 'text-anchor': 'end' }, ax, 'lateral range, nm');
  for (const mode of ['sprint', 'quiet']) {
    const pts = [];
    for (let x = -X; x <= X; x += 1) pts.push(`${sx(x).toFixed(1)},${sy(lateral(Math.abs(x), mode)).toFixed(1)}`);
    el('path', { d: `M${sx(-X)},${sy(0)}L${pts.join('L')}L${sx(X)},${sy(0)}Z`, class: `sh-lrc-a ${mode}` }, svg);
    el('path', { d: `M${pts.join('L')}`, class: `sh-lrc-l ${mode}` }, svg);
  }
  el('text', { x: sx(22), y: sy(0.72), class: 'sh-lrc-t sprint' }, svg, 'sprint');
  el('text', { x: sx(6), y: sy(0.45) - 6, class: 'sh-lrc-t quiet' }, svg, 'quiet');
}
