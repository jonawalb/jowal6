// Rhetoric Heatmap: Russia and Beyond. State, controls, URL hash and rendering.
import { EVENTS } from '../data/events.js';
import { COUNTRIES, CC, RANGES, METRICS, weekOf, weekStart, rowsOf, peakWeek, fmtN, fmtDate, escapeHtml } from './model.js';
import { createGrid } from './grid.js';
import { renderDetail, loadQuotes } from './detail.js';
import { renderCompare } from './compare.js';
import { renderDictionary, renderEvents } from './dict.js';
import { createTour } from './tour.js';
import { chart, wipe, fade, grow, stroke, rise, count, onChange, ring } from './fx.js';

const $ = id => document.getElementById(id);
const S = { cc: 'ru', rangeKey: 'war', range: RANGES.war, metric: 'rate', cat: 'all', sel: null, rows: [] };

// ---- URL hash ---------------------------------------------------------------
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (CC.includes(q.get('c'))) S.cc = q.get('c');
  if (RANGES[q.get('r')]) { S.rangeKey = q.get('r'); S.range = RANGES[S.rangeKey]; }
  if (METRICS[q.get('m')]) S.metric = q.get('m');
  if (COUNTRIES[S.cc].cats.includes(q.get('cat'))) S.cat = q.get('cat');
  const s = (q.get('sel') || '').split('@');
  if (s.length === 2 && /^\d{4}-\d{2}-\d{2}$/.test(s[1])) {
    const k = COUNTRIES[S.cc].phrases.findIndex(p => p.id === s[0]);
    if (k >= 0) S.sel = { k, w: weekOf(s[1]) };
  }
}
function writeHash() {
  const q = new URLSearchParams({ c: S.cc, r: S.rangeKey, m: S.metric });
  if (S.cat !== 'all') q.set('cat', S.cat);
  if (S.sel) q.set('sel', `${COUNTRIES[S.cc].phrases[S.sel.k].id}@${weekStart(S.sel.w)}`);
  history.replaceState(null, '', '#' + q.toString());
}

// ---- Controls ---------------------------------------------------------------
function mountControls() {
  $('country').innerHTML = CC.map(cc => `<button type="button" data-c="${cc}">${COUNTRIES[cc].name}</button>`).join('');
  $('country').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b && b.dataset.c !== S.cc) apply({ cc: b.dataset.c }); });
  $('ranges').innerHTML = Object.entries(RANGES).map(([k, r]) => `<button type="button" data-r="${k}">${r.label}</button>`).join('');
  $('ranges').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) apply({ rangeKey: b.dataset.r }); });
  $('metric').innerHTML = Object.entries(METRICS).map(([k, m]) => `<button type="button" data-m="${k}">${m.label}</button>`).join('');
  $('metric').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) apply({ metric: b.dataset.m }); });
  $('cats').addEventListener('change', e => apply({ cat: e.target.value }));
  $('copy-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); $('copy-link').textContent = 'Link copied'; } catch { $('copy-link').textContent = 'Copy from the address bar'; }
    setTimeout(() => { $('copy-link').textContent = 'Copy link'; }, 1800);
  });
}

function syncControls() {
  const C = COUNTRIES[S.cc];
  $('country').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === S.cc));
  $('ranges').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.r === S.rangeKey));
  $('metric').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === S.metric));
  $('cats').innerHTML = `<option value="all">All categories</option>` + C.cats.map(c => `<option${c === S.cat ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('');
  document.body.dataset.cc = S.cc;
  const st = C.stream;
  $('source-card').innerHTML = `<p class="eyebrow">Corpus</p><p class="src-name"><b>${escapeHtml(st.name)}</b></p>
    <p class="fine"><span class="num">${fmtN(st.n)}</span> ${st.unit}s, <span class="num">${fmtN(st.words)}</span> words, ${fmtDate(st.first)} to ${fmtDate(st.last)}.
    <a href="${escapeHtml(st.home)}" target="_blank" rel="noopener">Official source</a></p>
    <p class="fine">${fmtN(st.wayback)} read from Wayback Machine copies${st.listed ? `; the official index lists about ${fmtN(st.listed)} ${st.unit}s for this period` : ''}. See Method.</p>`;
}

// ---- Apply a state patch and redraw -----------------------------------------
function apply(patch = {}) {
  if (patch.cc && patch.cc !== S.cc) { S.cc = patch.cc; S.cat = 'all'; S.sel = null; loadQuotes(S.cc); }
  if (patch.rangeKey) { S.rangeKey = patch.rangeKey; S.range = RANGES[patch.rangeKey]; }
  if (patch.metric) S.metric = patch.metric;
  if (patch.cat) S.cat = patch.cat;
  if ('sel' in patch) S.sel = patch.sel;
  render();
}

function defaultSel() {
  // Open on the first phrase's busiest week in range.
  const w0 = Math.max(0, weekOf(S.range.from)), w1 = COUNTRIES[S.cc].words.length - 1;
  const r = S.rows.find(r => r.kind === 'phrase');
  if (!r) return null;
  const w = peakWeek(S.cc, r.k, w0, w1, S.metric);
  return w == null ? null : { k: r.k, w };
}

function render() {
  S.rows = rowsOf(S.cc, S.cat);
  const w0 = Math.max(0, weekOf(S.range.from)), w1 = COUNTRIES[S.cc].words.length - 1;
  if (S.sel && !S.rows.some(r => r.kind === 'phrase' && r.k === S.sel.k)) S.sel = null;
  if (S.sel && S.sel.w == null) {
    const w = peakWeek(S.cc, S.sel.k, w0, w1, S.metric);
    S.sel = w == null ? null : { k: S.sel.k, w };
  }
  if (S.sel && (S.sel.w < w0 || S.sel.w > w1)) S.sel = { k: S.sel.k, w: peakWeek(S.cc, S.sel.k, w0, w1, S.metric) ?? w1 };
  if (!S.sel) S.sel = defaultSel();
  syncControls();
  const { max } = grid.render(S, EVENTS[S.cc]);
  $('legend-max').textContent = S.metric === 'share' ? '100%' : `≥ ${max >= 1 ? max.toFixed(1) : max.toFixed(2)}`;
  $('legend-note').textContent = S.metric === 'share'
    ? `Share of the week's ${COUNTRIES[S.cc].stream.unit}s that use the phrase at least once`
    : 'Uses per 1,000 words of official text that week (square-root scale; top 3% share the darkest shade)';
  renderDetail($('detail'), S);
  renderCompare($('compare'), S);
  renderEvents($('events-list'), EVENTS, S.cc, ev => jumpToEvent(ev));
  animate();
  writeHash();
  if (S.sel) requestAnimationFrame(() => grid.scrollTo(S.sel.w, 60));
}

// Motion (see fx.js). Runs after each render and never changes what was drawn.
function animate() {
  const svg = $('hm-svg');
  onChange('view', [S.cc, S.rangeKey, S.metric, S.cat].join('|'), () => chart(svg, first => {
    wipe(svg.querySelector('.cells'), { first });
    grow(svg.querySelectorAll('.cov'), { first, stagger: first ? 300 : 120 });
    fade(svg.querySelectorAll('.ev-band, .ev-label, .ev-stem'), { first, delay: first ? 250 : 100, max: 40 });
  }, { gap: 0 }));
  onChange('cmp', [S.cc, S.rangeKey].join('|'), () => chart($('compare'), first => {
    stroke($('compare').querySelectorAll('.cmp-line'), { first });
    $('compare').querySelectorAll('.cmp-all b').forEach((b, i) => count(b, 'cmp' + i));
  }, { gap: 0 }));
  onChange('src', S.cc, first => { if (!first) rise($('source-card').children, { stagger: 40 }); });
  count($('legend-max'));
  selMotion();
}
function selMotion() {
  onChange('sel', S.sel ? S.cc + S.sel.k + '@' + S.sel.w : null, first => {
    if (first || !S.sel) return;
    const r = $('hm-svg').querySelector('.sel');
    if (r) ring($('hm-svg'), +r.getAttribute('x') + +r.getAttribute('width') / 2, +r.getAttribute('y') + +r.getAttribute('height') / 2, { r: 22 });
    rise($('detail').children, { stagger: 35, max: 12 });
  });
}

function jumpToEvent(ev) {
  const w = weekOf(ev.date);
  const k = S.sel ? S.sel.k : S.rows.find(r => r.kind === 'phrase')?.k;
  if (w < weekOf(S.range.from)) { S.rangeKey = 'all'; S.range = RANGES.all; }
  apply({ sel: { k, w } });
  $('stage').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

const grid = createGrid({
  labelSvg: $('hm-labels'), svg: $('hm-svg'), scroller: $('hm-scroll'), tip: $('hm-tip'),
  onSelect: sel => {
    if (sel.w == null) { apply({ sel }); return; }
    S.sel = sel; grid.drawSelection(); renderDetail($('detail'), S); selMotion(); writeHash();
  },
  onEvent: ev => jumpToEvent(ev),
});

// ---- Boot -------------------------------------------------------------------
function boot() {
  readHash();
  mountControls();
  renderDictionary($('dict'));
  document.body.classList.remove('loading');
  loadQuotes(S.cc);
  render();
  const tour = createTour($('stage'), patch => apply(patch));
  $('start-tour').addEventListener('click', tour.start);
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(render, 150); });
}
boot();
