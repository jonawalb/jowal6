// Russia's Nuclear Signals: state, URL hash, filters and rendering.
import { addExportBar } from '../../../shared/js/export.js';
import { EVENTS, TYPES, LEVELS, TYPE_KEYS, RANGES, byId, filtered, tally, when, typeName } from './model.js';
import { drawTimeline } from './timeline.js';
import { renderList, renderDetail } from './detail.js';
import { createTour } from './tour.js';
import { CODING_NOTES } from '../data/coding.js';
import { chart, pop, stroke, grow, rise, count, onChange, ring } from './fx.js';

const $ = id => document.getElementById(id);
const S = { range: 'all', from: RANGES[0].from, to: RANGES[0].to, types: [...TYPE_KEYS], min: 0, west: true, battle: true, q: '', sel: null };

// ---- Hash ------------------------------------------------------------------------------------
function writeHash() {
  const q = new URLSearchParams({ r: S.range });
  if (S.types.length !== TYPE_KEYS.length) q.set('t', S.types.join('.'));
  if (S.min > 0) q.set('lv', S.min);
  if (!S.west) q.set('w', 0);
  if (!S.battle) q.set('b', 0);
  if (S.q) q.set('q', S.q);
  if (S.sel) q.set('sel', S.sel);
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  setRange(q.get('r'));
  if (q.has('t')) { const v = q.get('t').split('.').filter(k => TYPE_KEYS.includes(k)); if (v.length) S.types = v; }
  const lv = +q.get('lv'); if (lv >= 0 && lv <= 5) S.min = lv;
  S.west = q.get('w') !== '0'; S.battle = q.get('b') !== '0';
  S.q = (q.get('q') || '').slice(0, 60);
  if (byId.has(q.get('sel'))) S.sel = q.get('sel');
}
function setRange(k) {
  const r = RANGES.find(x => x.k === k) || RANGES[0];
  Object.assign(S, { range: r.k, from: r.from, to: r.to });
}

// ---- Controls ------------------------------------------------------------------------------------
function renderControls() {
  $('range').innerHTML = RANGES.map(r => `<button type="button" class="btn" data-k="${r.k}" aria-pressed="${r.k === S.range}">${r.n}</button>`).join('');
  $('range').querySelectorAll('button').forEach(b => { b.onclick = () => { setRange(b.dataset.k); if (S.sel && !visibleSel()) S.sel = null; update(); }; });
  const T = tally(EVENTS);
  $('types').innerHTML = TYPES.map(ty => `<button type="button" class="gchip" data-k="${ty.k}" aria-pressed="${S.types.includes(ty.k)}" title="${ty.d}">
    <i style="background:${ty.col}"></i>${ty.n} <span class="num">${T.ty[ty.k]}</span></button>`).join('');
  $('types').querySelectorAll('.gchip').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.k, on = S.types.includes(k);
      if (on && S.types.length === 1) return;
      S.types = on ? S.types.filter(x => x !== k) : TYPE_KEYS.filter(x => x === k || S.types.includes(x));
      update();
    };
  });
  $('levels').innerHTML = LEVELS.map(l => `<button type="button" class="btn" data-v="${l.v}" aria-pressed="${l.v === S.min}" title="${l.d}">${l.v}+</button>`).join('');
  $('levels').querySelectorAll('button').forEach(b => { b.onclick = () => { S.min = +b.dataset.v; update(); }; });
  $('lv-note').textContent = `Showing Russian items at level ${S.min} (${LEVELS[S.min].n.toLowerCase()}) and above.`;
  $('west').checked = S.west; $('battle').checked = S.battle;
  if ($('q').value !== S.q) $('q').value = S.q;
}
const visibleSel = () => filtered(S).some(e => e.id === S.sel);

// ---- Tooltip -------------------------------------------------------------------------------------
const tipEl = $('tip');
function tip(e, html) {
  if (!e) { tipEl.hidden = true; return; }
  tipEl.innerHTML = html; tipEl.hidden = false;
  const box = tipEl.offsetParent.getBoundingClientRect();
  const x = e.clientX - box.left, y = e.clientY - box.top;
  tipEl.style.left = Math.max(4, Math.min(box.width - tipEl.offsetWidth - 4, x + 12)) + 'px';
  tipEl.style.top = (y + 14) + 'px';
}

// ---- Render ----------------------------------------------------------------------------------------
function update() {
  renderControls();
  const list = filtered(S);
  drawTimeline($('tl'), list, S, { onPick: pick, tip });
  renderList($('list'), list, S, pick);
  renderDetail($('detail'), byId.get(S.sel), step);
  const T = tally(list), rus = list.filter(e => e.group === 'russia').length;
  const nw = list.filter(e => e.group === 'west').length, nb = list.filter(e => e.group === 'battle').length;
  $('count').textContent = `${rus} Russian signal${rus === 1 ? '' : 's'}, ${nw} response${nw === 1 ? '' : 's'}, ${nb} battlefield moment${nb === 1 ? '' : 's'} in view`;
  const max = Math.max(1, ...Object.values(T.lv));
  $('lvdist').innerHTML = LEVELS.map(l => `<li><span>${l.v} ${l.n}</span><span class="lvd-b"><i style="width:${(T.lv[l.v] / max * 100).toFixed(1)}%"></i></span><span class="num">${T.lv[l.v]}</span></li>`).join('');
  animate();
  writeHash();
}
// Motion (see fx.js). Runs after each render and never changes what was drawn.
function animate() {
  const tl = $('tl');
  const view = [S.range, S.types.join('.'), S.min, S.west, S.battle, S.q].join('|');
  onChange('view', view, first => {
    chart(tl, f => pop(tl.querySelectorAll('.mk'), { first: f, spread: f ? 520 : 200 }), { gap: 0 });
    rise($('list').children, { first });
    grow($('lvdist').querySelectorAll('.lvd-b i'), { first, axis: 'x' });
  });
  count($('count'));
  onChange('sel', S.sel, () => {
    if (!S.sel) return;
    stroke(tl.querySelector('.selline'), { ms: 360 });
    const m = tl.querySelector('.mk.sel');
    if (m) { const b = m.getBBox(); ring(tl, b.x + b.width / 2, b.y + b.height / 2, { color: getComputedStyle(m).fill, r: 26, ms: 700 }); }
    rise($('detail').children, { stagger: 35 });
    grow($('detail').querySelectorAll('.lvbar i.on'), { axis: 'x', stagger: 200, ms: 260 });
  });
}
function pick(id) {
  S.sel = S.sel === id ? null : id;
  update();
  if (S.sel && matchMedia('(max-width: 1020px)').matches) $('detail').scrollIntoView({ block: 'nearest', behavior: 'auto' });
}
function step(d) {
  const list = filtered(S).sort((a, b) => (when(a) < when(b) ? -1 : 1));
  const i = list.findIndex(e => e.id === S.sel);
  const n = list[Math.max(0, Math.min(list.length - 1, i + d))];
  if (n) { S.sel = n.id; update(); $('detail').querySelector(`[data-n="${d}"]`)?.focus(); }
}

// ---- Boot --------------------------------------------------------------------------------------------
readHash();
$('west').onchange = e => { S.west = e.target.checked; update(); };
$('battle').onchange = e => { S.battle = e.target.checked; update(); };
let qt = null;
$('q').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value.trim(); update(); }, 150); };
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Copied'; }
  catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1500);
};
$('reset').onclick = () => { Object.assign(S, { types: [...TYPE_KEYS], min: 0, west: true, battle: true, q: '', sel: null }); setRange('all'); update(); };
document.addEventListener('keydown', e => {
  if (!S.sel || e.target.closest('input, textarea') || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  if (!e.target.closest('#detail, #tl')) return;
  e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1);
});
const tour = createTour($('stage'), set => {
  setRange(set.range || 'all');
  Object.assign(S, { types: set.types ? [...set.types] : [...TYPE_KEYS], min: set.min || 0, west: set.west ?? true, battle: set.battle ?? true, q: '', sel: set.sel ?? null });
  update();
});
$('tour-btn').onclick = () => tour.start();
addExportBar($('tl-export'), {
  target: () => $('tl'),
  title: 'Russian nuclear signals since February 2022',
  note: 'Escalation levels are the tool author’s coding. Sources listed per item.',
  csv: () => [['date', 'group', 'type', 'level', 'actor', 'title', 'sources'], ...filtered(S).sort((a, b) => (when(a) < when(b) ? -1 : 1))
    .map(e => [e.date, e.group, typeName(e), e.level || '', e.actor, e.title, e.src.map(s => s[1]).join(' ')])],
});
// Static reference tables below the tool.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
$('lvtable').innerHTML = LEVELS.map(l => `<tr><td>${l.v} · ${l.n}</td><td>${l.d}</td></tr>`).join('');
$('tytable').innerHTML = TYPES.map(ty => `<tr><td><i class="dot" style="background:${ty.col}"></i>${ty.n}</td><td>${ty.d}</td></tr>`).join('');
$('codenotes').innerHTML = CODING_NOTES.map(n => `<li>${n}</li>`).join('');
const pubs = new Map();
EVENTS.forEach(e => e.src.forEach(([n, u]) => { if (!pubs.has(n)) pubs.set(n, new Map()); pubs.get(n).set(u, e); }));
$('srclist').innerHTML = [...pubs].sort((a, b) => a[0].localeCompare(b[0])).map(([n, m]) =>
  `<li><b>${esc(n)}</b>: ${[...m].map(([u, e]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(e.title)}</a>`).join('; ')}</li>`).join('');

let rt = null;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(update, 150); });
update();
