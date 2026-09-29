// Hormuz Mine Clearance: state, URL hash, rendering and controls.
import { PRESETS, BENCH, S as SRC, FORCES, ENVS, THREAT_LEVELS, CONF } from '../data/params.js';
import { TIMELINE, CHECKED } from '../data/timeline.js';
import { DEFAULTS, run } from './model.js';
import { drawStrip, drawChart } from './views.js';
import { panelHTML, renderPanel, wirePanel, pct } from './panel.js';
import { createTour } from './tour.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const nice = d => { const [y, m, dd] = d.split('-').map(Number); return `${dd} ${MON[m - 1]} ${y}`; };
const BENCH_DAYS = Math.round((Date.parse(BENCH[0].to) - Date.parse(BENCH[0].from)) / 864e5);

let S = { ...DEFAULTS };
let day = 10, R = run(S), last = 0;
const NUMS = Object.keys(DEFAULTS).filter(k => typeof DEFAULTS[k] === 'number');

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  for (const k of NUMS) if (h.has(k) && Number.isFinite(Number(h.get(k)))) S[k] = Number(h.get(k));
  if (ENVS[h.get('env')]) S.env = h.get('env');
  if (THREAT_LEVELS[h.get('threat')]) S.threat = h.get('threat');
  if (CONF.includes(Number(h.get('conf')))) S.conf = Number(h.get('conf'));
  if (h.has('day')) day = Math.max(0, Number(h.get('day')) || 0);
}
let ht = 0;
function writeHash() {
  clearTimeout(ht);
  ht = setTimeout(() => {
    const h = new URLSearchParams();
    for (const [k, v] of Object.entries(S)) if (v !== DEFAULTS[k]) h.set(k, v);
    h.set('day', day);
    history.replaceState(null, '', '#' + h.toString());
  }, 150);
}

const panel = document.getElementById('panel');
panel.innerHTML = panelHTML();
const strip = document.getElementById('hm-strip');
const chart = document.getElementById('hm-chart');
const range = document.getElementById('hm-day');

function render() {
  R = run(S);
  last = drawChart(chart, S, R, day, BENCH_DAYS, d => { day = d; render(); });
  if (day > last) day = last;
  range.max = last;
  range.value = day;
  const v = drawStrip(strip, S, R, day);
  document.getElementById('hm-dayout').textContent = `Day ${day}`;
  const D = R.days[Math.min(day, R.days.length - 1)];
  document.getElementById('hm-daynote').textContent = `${v.live} mine${v.live === 1 ? '' : 's'} still undetected in this drawing · risk to one transit ${pct(D.risk).replace('&lt;', '<')}${v.capped ? ' · drawing capped at 400 mines' : ''}`;
  renderPanel(panel, S, R, day);
  document.querySelectorAll('#hm-presets [data-p]').forEach(b => {
    const p = PRESETS.find(x => x.k === b.dataset.p);
    b.setAttribute('aria-pressed', JSON.stringify(presetState(p)) === JSON.stringify(S));
  });
  writeHash();
}
function presetState(p) {
  const o = { ...DEFAULTS, ...p.set };
  if (p.set.share != null) o.share = p.set.share;
  return o;
}
const set = p => { Object.assign(S, p); render(); };
wirePanel(panel, set, () => S, k => { S = presetState(PRESETS.find(p => p.k === k)); render(); });

range.addEventListener('input', () => { day = Number(range.value); render(); });
const play = document.getElementById('hm-play');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let pt = 0;
const stop = () => { clearInterval(pt); pt = 0; play.textContent = 'Play'; play.setAttribute('aria-pressed', 'false'); };
play.addEventListener('click', () => {
  if (pt) return stop();
  if (day >= last) day = 0;
  play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
  const stepD = Math.max(1, Math.round(last / 90));
  pt = setInterval(() => { if (day >= last) return stop(); day = Math.min(last, day + stepD); render(); }, reduce.matches ? 400 : 60);
});
document.getElementById('hm-reset').addEventListener('click', () => { stop(); S = { ...DEFAULTS }; day = 10; render(); });
document.getElementById('hm-copy').addEventListener('click', async e => {
  writeHash();
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; }
  catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1800);
});
const tour = createTour(st => { stop(); S = { ...DEFAULTS, ...st.set }; day = st.day === 'end' ? (run(S).finish ?? 365) : st.day; render(); });
document.getElementById('hm-tour').addEventListener('click', () => tour.start());

// Timeline card and benchmarks (static).
const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
document.getElementById('hm-timeline').innerHTML = TIMELINE.map(e => `
  <li class="hm-tl-${e.cat}"><span class="d">${e.approx || nice(e.date)}</span><b>${esc(e.title)}</b><p>${esc(e.desc)}</p>${a(e.src.url, esc(e.src.name))}</li>`).join('');
document.getElementById('hm-bench').innerHTML = BENCH.map(b => `<li><b>${b.label}${b.from ? `: ${BENCH_DAYS} days` : ''}</b> ${esc(b.text)} ${b.src.map(k => a(SRC[k].url, esc(SRC[k].name))).join('; ')}${b.from ? `. The ${BENCH_DAYS}-day count is arithmetic on the two dates.` : ''}</li>`).join('');
document.getElementById('hm-checked').textContent = nice(CHECKED);
document.getElementById('hm-srcs').innerHTML = Object.values(SRC).map(s => `<li>${a(s.url, esc(s.name))}</li>`).join('');
document.getElementById('hm-forces-note').innerHTML = FORCES.map(f => `<li><b>${f.label}</b>: ${f.acr ? `${f.acr} sq nm per hour on an easy seabed` : `${f.idPerDay} contacts identified and neutralized per team per 12-hour working day`}${f.src ? ` (${a(SRC[f.src].url, 'Thales example')})` : ' (notional)'}. ${esc(f.note)}</li>`).join('');

let rw = 0;
new ResizeObserver(() => { const w = strip.parentElement.clientWidth; if (Math.abs(w - rw) > 4) { rw = w; render(); } }).observe(strip.parentElement);
addEventListener('hashchange', () => { S = { ...DEFAULTS }; readHash(); render(); });
readHash();
render();
