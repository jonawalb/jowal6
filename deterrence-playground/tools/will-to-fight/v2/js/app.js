// Will to Fight v2 page: text, sketch, measurement table (sealed in ../data/) and the calculator.
import { MODEL, PARAMS, MEASURES } from '../data/model.js';
import { solve, cohesion } from './model.js';
import { lessonSteps, SHEET } from './lesson.js';
import { learnButton, runLesson } from '../../../../shared/js/learn.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f2 = x => (Number.isFinite(x) ? x.toFixed(2) : '—').replace(/^-/, '−');
const pct = x => `${Math.round(100 * x)}%`;

// ---- Text sections ----
$('intro').innerHTML = `<h2>The simple model</h2>
  <p class="dg-meta">${esc(MODEL.status)} · version ${esc(MODEL.version)} · ${esc(MODEL.date)}</p>
  ${MODEL.summary.map(p => `<p>${esc(p)}</p>`).join('')}`;

$('sketch').innerHTML = `<h2 id="sk-t">Model sketch</h2>
  <div class="dg-actions"><a class="btn" id="v2-pdf" download="${esc(MODEL.pdf)}" href="#">Download the PDF</a></div>
  <figure class="dg-fig"><img id="v2-img" alt="${esc(MODEL.alt)}"></figure>
  <h3>How it plays</h3><ol class="howto">${MODEL.notes.map(p => `<li>${esc(p)}</li>`).join('')}</ol>`;

$('results').innerHTML = `<h2 id="res-t">What it says</h2>
  <dl class="wf2-res">${MODEL.results.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;

$('measure').innerHTML = `<h2 id="ms-t">What to measure</h2>
  <p class="fine">Inputs for θ₀, ℓ, π and r use the DIA five-point rating (significantly weakens … significantly strengthens) mapped to −1, −0.5, 0, +0.5, +1. That mapping is a proposed convention for v2, not a DIA method. Taiwan readings are those already verified for the v1 presets; [TK] marks cells with no verified source.</p>
  <div class="wf2-scroll"><table class="wf2-tab"><thead><tr><th>Symbol</th><th>What it is</th><th>What to measure</th><th>Indicators</th><th>DIA factor</th><th>Input</th><th>Taiwan now</th></tr></thead>
  <tbody>${MEASURES.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;

$('link').innerHTML = `<h2>How v2 relates to v1</h2>${MODEL.link.map(p => `<p>${esc(p)}</p>`).join('')}
  <h3>Literature it draws on</h3><ul>${MODEL.lit.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
  <p class="fine">Full references and proofs: Will to Fight theory memo v3 (for v1) and the v2 model note.</p>`;

async function fileUrl(name) {
  const r = await fetch(new URL(`../data/${name}`, import.meta.url));
  if (!r.ok) throw new Error(`${name}: ${r.status}`);
  return URL.createObjectURL(await r.blob());
}
(async () => {
  try { $('v2-img').src = await fileUrl(MODEL.image); $('v2-pdf').href = await fileUrl(MODEL.pdf); }
  catch (e) { $('sketch').insertAdjacentHTML('beforeend', `<p class="fine">Could not load the sketch (${esc(e.message)}).</p>`); }
})();

// ---- Calculator ----
const P = Object.fromEntries(PARAMS.map(s => [s[0], s[6]]));
const hash = new URLSearchParams(location.hash.slice(1));
for (const s of PARAMS) if (hash.has(s[0]) && Number.isFinite(+hash.get(s[0]))) P[s[0]] = Math.min(s[4], Math.max(s[3], +hash.get(s[0])));

const GROUPS = [['mu', 'Public reading of commitment <span class="sym-n">μ</span>'], ['fight', 'Fighters'], ['war', 'Government and adversary']];
const panel = $('v2-panel');
for (const [g, title] of GROUPS) {
  const sec = document.createElement('div');
  sec.className = 'sec';
  sec.innerHTML = `<p class="eyebrow">${title}</p>`;
  for (const [key, sym, label, min, max, step] of PARAMS.filter(s => s[7] === g)) {
    const w = document.createElement('div');
    w.className = 'slider';
    w.innerHTML = `<div class="sl-h"><label for="v2-${key}">${esc(label)} <span class="sym">${esc(sym)}</span></label><output id="v2o-${key}"></output></div>
      <input type="range" id="v2-${key}" min="${min}" max="${max}" step="${step}" value="${P[key]}">`;
    const input = w.querySelector('input'), out = w.querySelector('output');
    out.textContent = f2(P[key]);
    input.addEventListener('input', () => { P[key] = +input.value; out.textContent = f2(P[key]); render(); });
    sec.appendChild(w);
  }
  panel.appendChild(sec);
}

const NS = 'http://www.w3.org/2000/svg';
function draw(svg, R) {
  const Wd = 560, H = 300, m = { l: 46, r: 14, t: 14, b: 40 };
  const lo = Math.min(R.mu, R.muHat, R.muDag) - 1.5, hi = Math.max(R.mu, R.muHat, R.muDag) + 1.5;
  const x = v => m.l + (v - lo) / (hi - lo) * (Wd - m.l - m.r), y = w => m.t + (1 - w) * (H - m.t - m.b);
  const el = (t, a, txt) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt) e.textContent = txt; svg.appendChild(e); return e; };
  svg.setAttribute('viewBox', `0 0 ${Wd} ${H}`);
  svg.replaceChildren();
  const bar = Math.max(R.barG, R.barA);
  if (bar < 1) el('rect', { class: 'fightz', x: m.l, y: y(1), width: Wd - m.l - m.r, height: y(Math.max(0, bar)) - y(1) });
  for (const w of [0, 0.5, 1]) { el('line', { class: w === 0.5 ? 'half' : 'axis-l', x1: m.l, x2: Wd - m.r, y1: y(w), y2: y(w), stroke: 'var(--rule)' }); el('text', { class: 'zl', x: m.l - 6, y: y(w) + 4, 'text-anchor': 'end' }, pct(w)); }
  for (const [b, lab] of [[R.barG, 'W̄_G government'], [R.barA, 'W̄_A adversary']]) {
    if (!(b > 0 && b < 1)) continue;
    el('line', { class: 'bound', x1: m.l, x2: Wd - m.r, y1: y(b), y2: y(b) });
    el('text', { class: 'bl', x: Wd - m.r - 4, y: y(b) - 4, 'text-anchor': 'end' }, lab);
  }
  el('line', { class: 'zero', x1: x(R.muDag), x2: x(R.muDag), y1: y(0), y2: y(1), 'stroke-dasharray': '2 3' });
  el('text', { class: 'zl', x: x(R.muDag) + 4, y: y(0) - 6 }, 'μ† tipping point');
  let d = '';
  for (let i = 0; i <= 200; i++) { const v = lo + (hi - lo) * i / 200; d += `${i ? 'L' : 'M'}${x(v).toFixed(1)},${y(cohesion(v, P)).toFixed(1)}`; }
  el('path', { class: 'ln ln-s', d });
  el('circle', { class: 'mark', cx: x(R.muHat), cy: y(R.What), r: 6 });
  el('text', { class: 'adv-t zl', x: x(R.muHat) + 10, y: y(R.What) + 18, 'text-anchor': 'start' }, 'adversary’s view Ŵ');
  el('circle', { class: 'root', cx: x(R.mu), cy: y(R.W), r: 6 });
  el('text', { class: 'bl', x: x(R.mu), y: y(R.W) - 12, 'text-anchor': 'middle' }, 'true W');
  el('text', { class: 'ax-t', x: (m.l + Wd - m.r) / 2, y: H - 8, 'text-anchor': 'middle', fill: 'var(--muted)' }, 'public reading of commitment μ  →');
  for (let t = Math.ceil(lo); t <= hi; t++) el('text', { class: 'zl', x: x(t), y: y(0) + 16, 'text-anchor': 'middle' }, String(t).replace('-', '−'));
}

function render() {
  const R = solve(P);
  $('v2-summary').innerHTML = `<b>${esc(R.outcome)}.</b> ${esc(R.detail)}`;
  $('v2-read').innerHTML = [
    ['μ (true)  ·  μ̂ (adversary)  ·  μ†', `${f2(R.mu)}  ·  ${f2(R.muHat)}  ·  ${f2(R.muDag)}`],
    ['Cohesion W  ·  adversary’s estimate Ŵ', `${pct(R.W)}  ·  ${pct(R.What)}`],
    ['Defender’s war odds p  ·  as the adversary sees them', `${pct(R.p)}  ·  ${pct(R.pHat)}`],
    ['Government’s bar W̄_G', R.barG <= 0 ? `${f2(R.barG)} (fights on at any cohesion)` : R.barG >= 1 ? `${f2(R.barG)} (concedes at any cohesion)` : pct(R.barG)],
    ['Adversary’s bar W̄_A', R.barA <= 0 ? `${f2(R.barA)} (war never pays)` : R.barA >= 1 ? `${f2(R.barA)} (war always pays)` : pct(R.barA)],
    ['Adversary expects', R.expectConcede ? 'concession' : 'a war'],
  ].map(([k, v]) => `<tr><th scope="row">${k}</th><td class="num">${v}</td></tr>`).join('');
  draw($('v2-fig'), R);
  history.replaceState(null, '', '#' + PARAMS.map(s => `${s[0]}=${P[s[0]]}`).join('&'));
}
render();

// ---- Learn to play: banner at the top of the page; the lesson starts from the default settings ----
function resetDefaults() {
  for (const s of PARAMS) { P[s[0]] = s[6]; $(`v2-${s[0]}`).value = s[6]; $(`v2o-${s[0]}`).textContent = f2(s[6]); }
  render();
}
const learn = learnButton(document.querySelector('main.wf2'), { slug: 'will-to-fight', minutes: 5, sheet: SHEET,
  onStart: () => { resetDefaults(); runLesson(lessonSteps(), { slug: 'will-to-fight', title: 'Learn to play', onFinish: () => learn.refresh() }); } });
