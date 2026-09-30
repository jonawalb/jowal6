// Ukraine's Air War: state, URL hash, controls and rendering.
import { fmt } from '../../../shared/js/mapkit.js';
import { addExportBar } from '../../../shared/js/export.js';
import { META, GROUPS, RANGES, series, rateSeries, salvos, clockGrid, totals, periodKey } from './model.js';
import { drawTimeline, drawRate } from './charts.js';
import { renderSalvos, renderClock, renderDetail } from './panels.js';
import { createTour } from './tour.js';
import { GROUP_INFO } from '../data/groups.js';
import { chart, grow, stroke, fade, rise, count, flashIfChanged, onChange } from './fx.js';

const $ = id => document.getElementById(id);
const RES = [['day', 'Day'], ['week', 'Week'], ['month', 'Month']];
const METRICS = [['l', 'Launched'], ['x', 'Reported stopped'], ['thru', 'Not reported stopped']];
const RATE_GROUPS = ['shahed', 'cruise', 'ballistic'];
const S = { range: 'all', from: META.first, to: META.last, res: 'week', groups: [...GROUPS], metric: 'l', lost: true, sel: null };

// ---- Hash ------------------------------------------------------------------------------------
function writeHash() {
  const q = new URLSearchParams({ r: S.range, res: S.res, m: S.metric, lost: +S.lost });
  if (S.groups.length !== GROUPS.length) q.set('g', S.groups.join('.'));
  if (S.sel) q.set('sel', S.sel);
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  setRange(q.get('r'), false);
  if (RES.some(r => r[0] === q.get('res'))) S.res = q.get('res');
  if (METRICS.some(m => m[0] === q.get('m'))) S.metric = q.get('m');
  if (q.has('lost')) S.lost = q.get('lost') !== '0';
  if (q.has('g')) { const g = q.get('g').split('.').filter(k => GROUPS.includes(k)); if (g.length) S.groups = g; }
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(q.get('sel') || '')) S.sel = q.get('sel');
  guardRes();
}
function setRange(k, setRes = true) {
  const r = RANGES.find(x => x.k === k) || RANGES[0];
  S.range = r.k; S.from = r.from; S.to = r.to;
  if (setRes) S.res = r.res;
}
// Daily bars over four years are too thin to read: fall back to weeks for long ranges.
function guardRes() {
  const days = (Date.parse(S.to) - Date.parse(S.from)) / 864e5;
  if (S.res === 'day' && days > 400) S.res = 'week';
  if (S.sel) {
    const d = S.sel.length === 7 ? S.sel + '-01' : S.sel;
    S.sel = d < S.from || d > S.to ? null : periodKey(d, S.res);
  }
}

// ---- Controls -----------------------------------------------------------------------------------
function seg(host, items, cur, on) {
  host.innerHTML = items.map(([k, n]) => `<button type="button" class="btn" data-k="${k}" aria-pressed="${k === cur}">${n}</button>`).join('');
  host.querySelectorAll('button').forEach(b => { b.onclick = () => on(b.dataset.k); });
}
function renderControls() {
  seg($('range'), RANGES.map(r => [r.k, r.n]), S.range, k => { setRange(k); guardRes(); update(); });
  const days = (Date.parse(S.to) - Date.parse(S.from)) / 864e5;
  seg($('res'), RES.filter(r => r[0] !== 'day' || days <= 400), S.res, k => { S.res = k; guardRes(); update(); });
  seg($('metric'), METRICS, S.metric, k => { S.metric = k; update(); });
  $('groups').innerHTML = GROUPS.map(g => `<button type="button" class="gchip" data-g="${g}" aria-pressed="${S.groups.includes(g)}" title="${GROUP_INFO[g].d}">
    <i style="background:${GROUP_INFO[g].col}"></i>${GROUP_INFO[g].n}</button>`).join('');
  $('groups').querySelectorAll('.gchip').forEach(b => {
    b.onclick = () => {
      const g = b.dataset.g, on = S.groups.includes(g);
      if (on && S.groups.length === 1) return;
      S.groups = on ? S.groups.filter(x => x !== g) : GROUPS.filter(x => x === g || S.groups.includes(x));
      update();
    };
  });
  $('lost').checked = S.lost;
}

// ---- Tooltip -------------------------------------------------------------------------------------
const tipEl = $('tip');
function tip(e, html) {
  if (!e) { tipEl.hidden = true; return; }
  tipEl.innerHTML = html; tipEl.hidden = false;
  const host = tipEl.offsetParent.getBoundingClientRect();
  const x = e.clientX - host.left, y = e.clientY - host.top;
  const w = tipEl.offsetWidth;
  tipEl.style.left = Math.max(4, Math.min(host.width - w - 4, x + 12)) + 'px';
  tipEl.style.top = (y + 14) + 'px';
}

// ---- Render ----------------------------------------------------------------------------------------
function renderStatus(t) {
  const rate = t.lr ? (t.x + (S.lost ? t.nr : 0)) / t.lr : 0;
  $('st-b').textContent = `${fmt(t.l)} launched`;
  $('st-s').textContent = `${Math.round(rate * 100)}% reported stopped${S.lost ? ' (shot down, suppressed or lost)' : ' (shot down or suppressed)'}, ${RANGES.find(r => r.k === S.range).n.toLowerCase()}, weapon types in view.`;
  const top = t.top ? `${new Date(t.top[0] + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}: ${fmt(t.top[1])}` : 'n/a';
  $('summary').innerHTML = GROUPS.filter(g => S.groups.includes(g) && t.by[g]).map(g => `<dt>${GROUP_INFO[g].short}</dt><dd>${fmt(t.by[g])}</dd>`).join('')
    + `<dt>Busiest day</dt><dd>${top}</dd>` + (t.hid ? `<dt>Withheld</dt><dd>${t.hid} report rows without numbers</dd>` : '');
}

function update() {
  guardRes();
  renderControls();
  const bins = series(S);
  $('tl-h').textContent = { l: 'Launched', x: 'Reported stopped', thru: 'Not reported stopped' }[S.metric] + ` per ${S.res}`;
  drawTimeline($('tl'), bins, S, { onPick: pick, tip });
  const lines = RATE_GROUPS.filter(g => S.groups.includes(g)).map(g => ({ g, pts: rateSeries(S, g) }));
  $('rate-empty').hidden = lines.length > 0;
  drawRate($('rate'), lines.length ? lines : [{ g: 'shahed', pts: [] }], S, tip);
  $('rate-legend').innerHTML = lines.map(l => `<li><i class="sw" style="background:${GROUP_INFO[l.g].col}"></i>${GROUP_INFO[l.g].n}</li>`).join('');
  renderSalvos($('salvos'), salvos(S), d => { S.sel = periodKey(d, S.res); update(); document.getElementById('tl').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
  renderClock($('clock'), clockGrid(S), $('clock-note'));
  renderStatus(totals(S));
  renderDetail($('detail'), S, S.sel);
  animate();
  writeHash();
}
// Motion (see fx.js). Runs after each render and never changes what was drawn.
function animate() {
  const tl = $('tl'), rate = $('rate');
  chart(tl, first => grow(tl.querySelector('.bar')?.parentNode, { first }));
  chart(rate, first => { stroke(rate.querySelectorAll('.rline'), { first }); fade(rate.querySelectorAll('.rdot'), { first, delay: first ? 380 : 160, max: 400 }); });
  const view = [S.range, S.res, S.metric, S.lost, S.groups.join('.')].join('|');
  onChange('view', view, first => {
    rise($('salvos').children, { first });
    fade($('clock').querySelectorAll('.ck-row'), { first, stagger: 40 });
    grow($('clock').querySelectorAll('.wd-b i'), { first, axis: 'x' });
  });
  count($('st-b')); count($('st-s')); flashIfChanged($('summary'));
  onChange('sel', S.sel && view + S.sel, () => rise($('detail').children, { stagger: 40 }));
}
function pick(k, keepFocus) {
  S.sel = S.sel === k && !keepFocus ? null : k;
  update();
  if (keepFocus) $('tl').querySelector('.hit')?.focus();
}

// ---- Boot --------------------------------------------------------------------------------------------
readHash();
$('lost').onchange = e => { S.lost = e.target.checked; update(); };
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Copied'; }
  catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1500);
};
$('reset').onclick = () => { Object.assign(S, { res: 'week', groups: [...GROUPS], metric: 'l', lost: true, sel: null }); setRange('all'); update(); };
const tour = createTour($('stage'), set => {
  if (set.range) setRange(set.range);
  Object.assign(S, { res: set.res || S.res, groups: set.groups ? [...set.groups] : S.groups, metric: set.metric || S.metric,
    lost: set.lost ?? S.lost, sel: set.sel ?? null });
  update();
  if (set.focus === 'clock') $('clock-card').scrollIntoView({ block: 'nearest' });
});
$('tour-btn').onclick = () => tour.start();
addExportBar($('tl-export'), {
  target: () => $('tl'),
  title: () => `Russian strikes on Ukraine: ${$('tl-h').textContent.toLowerCase()}`,
  note: `Data: Ukrainian Air Force reports compiled by Petro Ivaniuk (Kaggle, ${META.license}), version ${META.version}`,
  csv: () => [['period', ...GROUPS.filter(g => S.groups.includes(g))], ...series(S).map(b => [b.k, ...GROUPS.filter(g => S.groups.includes(g)).map(g => b.v[g])])],
});
let rt = null;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(update, 150); });
$('asof').textContent = `Data ${META.first} to ${META.last}, dataset version ${META.version} (retrieved ${META.retrieved}).`;
update();
