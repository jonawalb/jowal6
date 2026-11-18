// Dien Bien Phu virtual staff ride: wiring of data, map, timeline and panels.
import { BattleMap } from './map.js';
import { Timeline, clamp, RANGE } from './timeline.js';
import { renderStand, renderExplore, renderLogistics, renderWhatIf, renderAnalysis } from './panels.js';
import { fmtDate, addDays, esc } from './util.js';

const $ = (s) => document.querySelector(s);
const state = { mode: 'ride', date: '1954-03-13', stand: 0, style: 'period', dim: '2d', cf: new Set(), playing: null };

const D = await fetch('data/dbp.json').then((r) => r.json());
D.placeIndex = Object.fromEntries(D.places.map((p) => [p.id, p]));
D.quoteIndex = Object.fromEntries(D.quotes.map((q) => [q.id, q]));

const ctx = {
  setDate: (d) => setDate(d),
  goStand: (i) => goStand(i),
  viewshed: (id, stand) => showViewshed(id, stand),
  to3d: (s) => { setDim('3d'); if (s?.cam) bm.fly(s.cam); },
  cfChanged: () => tl.setWindows(D.cf.filter((c) => state.cf.has(c.id) && c.window).map((c) => c.window)),
};

const bm = new BattleMap($('#map'), D, { onReady: () => { $('#loading').classList.add('done'); bm.setDate(state.date); route(); } });
const tl = new Timeline($('#tl-track'), D, { onDate: (d) => setDate(d), onStand: (i) => { setMode('ride'); goStand(i); } });

// ------------------------------------------------------------------ state changes
function setDate(d, opts = {}) {
  state.date = clamp(d);
  tl.setDate(state.date);
  bm.setDate(state.date);
  const ph = D.meta.phases.find((p) => p.start <= state.date && state.date <= p.end);
  $('#tl-date').textContent = fmtDate(state.date);
  $('#tl-sub').textContent = ph ? ph.long || ph.name : '';
  if (state.mode === 'explore' && !opts.noPanel) renderExplore($('#panel'), D, state.date, ctx);
  if (state.mode === 'logistics' && !opts.noPanel) renderLogistics($('#panel'), D, state.date, ctx);
  writeHash();
}

function goStand(i) {
  i = Math.max(0, Math.min(D.stands.length - 1, i));
  state.stand = i;
  const s = D.stands[i];
  showViewshed(null);
  setDate(s.date, { noPanel: true });
  renderStand($('#panel'), D, i, ctx);
  bm.setActive(s.place);
  if (s.cam) bm.fly(s.cam);
  writeHash();
}

function showViewshed(id, stand) {
  bm.showViewshed(id);
  const o = id && D.viewsheds.observers.find((x) => x.id === id);
  const note = $('#mapnote');
  if (o) {
    note.hidden = false;
    note.innerHTML = `<b>Line of sight from ${esc(o.label)}</b> (eye ${o.height_m} m above ground). Shaded ground was in direct view; unshaded ground was hidden by terrain. ${esc(o.finding || '')} <a href="#" data-close>Hide</a>`;
    note.querySelector('[data-close]').addEventListener('click', (e) => { e.preventDefault(); showViewshed(null); });
    const cam = stand?.cam && stand.observers?.includes(id) ? stand.cam : { center: [o.lon, o.lat], zoom: 12.6 };
    bm.fly(cam);
  } else { note.hidden = true; }
}

function setMode(m) {
  const prev = state.mode;
  state.mode = m;
  document.querySelectorAll('.modes button').forEach((b) => b.setAttribute('aria-selected', b.dataset.mode === m));
  if (prev === 'logistics' && m !== 'logistics') bm.setLogistics(false);
  if (m !== 'ride') bm.setActive(null);
  if (m !== 'ride' && m !== 'analysis') showViewshed(null);
  if (m === 'ride') goStand(state.stand);
  else if (m === 'explore') renderExplore($('#panel'), D, state.date, ctx);
  else if (m === 'logistics') { bm.setLogistics(true); renderLogistics($('#panel'), D, state.date, ctx); }
  else if (m === 'whatif') renderWhatIf($('#panel'), D, state, ctx);
  else if (m === 'analysis') renderAnalysis($('#panel'), D, ctx);
  legend();
  writeHash();
}

function setStyle(s) {
  state.style = s;
  document.querySelectorAll('[data-style]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.style === s));
  bm.setStyle(s);
}
function setDim(dm) {
  state.dim = dm;
  document.querySelectorAll('[data-dim]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.dim === dm));
  bm.setDim(dm, state.mode === 'ride' ? D.stands[state.stand]?.cam : null);
}

function legend() {
  const rows = state.mode === 'logistics'
    ? [['#b23a2b', 'Viet Minh supply routes'], ['#2f5d8a', 'French airlift (dashed)']]
    : [['#2f5d8a', 'French Union strongpoint, held', 'ring'], ['#b23a2b', 'Strongpoint lost', 'fill'], ['#b23a2b', 'Viet Minh position', 'diamond'], ['#b23a2b', 'Attack on this date', 'line']];
  $('#legend').innerHTML = rows.map(([c, l, k]) => `<div class="row"><span class="sw" style="${k === 'ring' ? `border:2px solid ${c};border-radius:50%;background:#fbf8f1` : k === 'diamond' ? `border:2px solid ${c};transform:rotate(45deg) scale(.75);background:#fbf8f1` : k === 'line' ? `height:4px;background:${c}` : `background:${c};border-radius:${k === 'fill' ? '50%' : '3px'}`}"></span>${l}</div>`).join('')
    + `<div class="row" style="margin-top:4px;color:var(--muted)">${state.mode === 'logistics' ? 'Schematic: straight lines between documented waypoints' : 'Positions: relic sites surveyed; others placed from published maps'}</div>`;
}

// ------------------------------------------------------------------ play
$('#play').addEventListener('click', () => {
  if (state.playing) { clearInterval(state.playing); state.playing = null; $('#play').textContent = '▶'; $('#play').setAttribute('aria-label', 'Play'); return; }
  if (state.mode === 'ride' || state.mode === 'whatif' || state.mode === 'analysis') setMode('explore');
  if (state.date >= RANGE.END) setDate(RANGE.START);
  $('#play').textContent = '❚❚'; $('#play').setAttribute('aria-label', 'Pause');
  state.playing = setInterval(() => {
    const step = state.date < RANGE.SIEGE ? 4 : 1;
    if (state.date >= RANGE.END) { $('#play').click(); return; }
    setDate(addDays(state.date, step));
  }, 450);
});

// ------------------------------------------------------------------ controls + hash
document.querySelectorAll('.modes button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
document.querySelectorAll('[data-style]').forEach((b) => b.addEventListener('click', () => setStyle(b.dataset.style)));
document.querySelectorAll('[data-dim]').forEach((b) => b.addEventListener('click', () => setDim(b.dataset.dim)));

let hashLock = false;
function writeHash() {
  if (hashLock) return;
  const h = state.mode === 'ride' ? `#stand=${state.stand + 1}` : `#${state.mode}&d=${state.date}`;
  history.replaceState(null, '', h);
}
function route() {
  hashLock = true;
  const h = location.hash.slice(1);
  const p = new URLSearchParams(h.replace(/^(\w+)(&|$)/, 'm=$1$2'));
  const stand = /stand=(\d+)/.exec(h);
  if (p.get('d')) state.date = clamp(p.get('d'));
  setDate(state.date, { noPanel: true });
  if (stand) { state.stand = Number(stand[1]) - 1; setMode('ride'); }
  else if (['explore', 'logistics', 'whatif', 'analysis'].includes(p.get('m'))) setMode(p.get('m'));
  else setMode('ride');
  hashLock = false;
  writeHash();
}
legend();
