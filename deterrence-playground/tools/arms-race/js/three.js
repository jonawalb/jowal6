// Three-party extension: United States, Russia, China. Controls, chart and stability table.
// This is an extension of Richardson's two-party model written by the tool, not a published fit.
import { PRESETS3, ACTORS3 } from '../data/presets.js';
import { STOCKPILES } from '../data/warheads.js';
import { matrix3, eigen3, equilibrium3, path3, pairs3 } from './model.js';
import { drawTime } from './phase.js';

const $ = id => document.getElementById(id);
const f2 = v => (+v).toFixed(2);
const last = k => STOCKPILES[k][STOCKPILES[k].length - 1] / 1000;
export const START3 = ACTORS3.map(a => last(a.k)); // latest stockpiles, thousands of warheads

export const fromPreset3 = k => ({ p3: k, ...JSON.parse(JSON.stringify(PRESETS3.find(p => p.k === k).p)) });

// Slider fields: [label, getter path]
export const FIELDS3 = [
  ...ACTORS3.map((a, i) => ({ id: `a${i}`, grp: 'sl3-a', n: `${a.n}`, get: S => S.a[i], set: (S, v) => { S.a[i] = v; }, min: 0, max: 1.2, step: 0.05 })),
  ...[[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]].map(([i, j]) => ({ id: `k${i}${j}`, grp: 'sl3-k',
    n: `${ACTORS3[i].n} to ${ACTORS3[j].n}`, get: S => S.K[i][j], set: (S, v) => { S.K[i][j] = v; }, min: 0, max: 1, step: 0.05 })),
  ...ACTORS3.map((a, i) => ({ id: `g${i}`, grp: 'sl3-g', n: `${a.n}`, get: S => S.g[i], set: (S, v) => { S.g[i] = v; }, min: -2, max: 2, step: 0.05 })),
];

const sl = {};
export function mountThree(S, update) {
  $('presets3').innerHTML = PRESETS3.map(p => `<button type="button" data-k="${p.k}"><b>${p.n}</b><br><small>${p.s}</small></button>`).join('');
  $('presets3').querySelectorAll('button').forEach(b => b.onclick = () => { Object.assign(S, fromPreset3(b.dataset.k)); update(); });
  FIELDS3.forEach(f => {
    const w = document.createElement('div');
    w.className = 'slider';
    w.innerHTML = `<div class="sl-h"><label for="s3-${f.id}">${f.n}</label><output for="s3-${f.id}"></output></div>
      <input type="range" id="s3-${f.id}" min="${f.min}" max="${f.max}" step="${f.step}">`;
    $(f.grp).appendChild(w);
    const input = w.querySelector('input'), out = w.querySelector('output');
    input.addEventListener('input', () => { f.set(S, +input.value); S.p3 = ''; update(); });
    sl[f.id] = v => { input.value = v; out.textContent = f2(v); };
  });
}

export function renderThree(S) {
  $('presets3').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S.p3));
  const note = PRESETS3.find(p => p.k === S.p3)?.note;
  $('preset3-note').hidden = !note;
  $('preset3-note').textContent = note || '';
  FIELDS3.forEach(f => sl[f.id](f.get(S)));

  const ev = eigen3(matrix3(S)), stable = ev.every(e => e.re < 0), eq = equilibrium3(S), pr = pairs3(S);
  const pts = path3(S, START3, 40);
  drawTime($('time3'), ACTORS3.map((a, i) => ({ c: a.c, pts: pts.map(p => [p[0], p[i + 1]]) })),
    { T: 40, xlab: 'Years from 2026', ylab: 'Warheads (thousands)', ymax: Math.max(6, ...pts.flatMap(p => p.slice(1))) > 30 ? 30 : undefined,
      eqs: stable && eq ? eq.map((v, i) => ({ v, c: ACTORS3[i].c })) : [] });

  const lead = ev[0], fmtE = e => f2(e.re) + (e.im ? ` ± ${f2(Math.abs(e.im))}i` : '');
  const allPairs = pr.every(p => p.stable);
  $('three-status').dataset.s = stable ? 'good' : 'bad';
  $('three-status').querySelector('b').textContent = stable ? 'Stable trio' : 'Unstable trio: a runaway race';
  $('three-status').querySelector('span').textContent = stable
    ? `All three growth rates are negative; the largest is ${f2(lead.re)} a year. Arms settle at ${eq.map(v => f2(v)).join(', ')} thousand warheads.`
    : `The largest growth rate is +${f2(lead.re)} a year${allPairs ? ', even though every pair on its own would be stable' : ''}.`;
  $('pairs3').innerHTML = pr.map(p => {
    const A = ACTORS3[p.i], B = ACTORS3[p.j];
    return `<tr><th scope="row">${A.n} and ${B.n}</th><td class="num r">${f2(S.a[p.i] * S.a[p.j])}</td><td class="num r">${f2(S.K[p.i][p.j] * S.K[p.j][p.i])}</td><td>${p.stable ? '<span class="ok">stable</span>' : '<span class="no">unstable</span>'}</td></tr>`;
  }).join('') + `<tr class="tot"><th scope="row">All three together</th><td colspan="2" class="num r">growth rates ${ev.map(fmtE).join(', ')}</td><td>${stable ? '<span class="ok">stable</span>' : '<span class="no">unstable</span>'}</td></tr>`;
  $('start3').textContent = ACTORS3.map((a, i) => `${a.n} ${Math.round(START3[i] * 1000).toLocaleString()}`).join(' · ');
  return { stable };
}

export const hash3 = S => ({ p3: S.p3 || 'custom', a3: S.a.map(f2).join('_'), k3: S.K.flatMap((r, i) => r.filter((_, j) => j !== i)).map(f2).join('_'), g3: S.g.map(f2).join('_') });
export function readHash3(q, S) {
  if (PRESETS3.some(p => p.k === q.get('p3'))) Object.assign(S, fromPreset3(q.get('p3')));
  const nums = k => (q.get(k) || '').split('_').map(parseFloat);
  const a = nums('a3'), k = nums('k3'), g = nums('g3');
  if (a.length === 3 && a.every(Number.isFinite)) S.a = a;
  if (g.length === 3 && g.every(Number.isFinite)) S.g = g;
  if (k.length === 6 && k.every(Number.isFinite)) S.K = [[0, k[0], k[1]], [k[2], 0, k[3]], [k[4], k[5], 0]];
  if (q.get('p3') === 'custom') S.p3 = '';
}
