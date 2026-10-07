// Who Supports Ukraine: state, URL hash, controls and rendering.
import { addExportBar } from '../../../shared/js/export.js';
import { META, MONTHS, DONORS, TYPES, GROUPS, PERIODS, ranking, monthly, cumulative, summary, eucApplies,
  eur, slug, donorBySlug } from './model.js';
import { renderRanking, drawTimeline } from './charts.js';
import { renderPanel, renderMonth } from './panel.js';
import { createTour } from './tour.js';
import { chart, grow, stroke, fade, rise, count, flashIfChanged, onChange } from './fx.js';

document.title = 'Who Supports Ukraine | Interactive Deterrence';
const $ = id => document.getElementById(id);
const MEASURES = [['b', 'Both'], ['a', 'Allocations'], ['c', 'Commitments']];
const SCALES = [['eur', '€ billion'], ['gdp', '% of 2021 GDP']];
const TL = [['month', 'Per month'], ['cum', 'Running total']];
const DEF = { measure: 'b', types: TYPES.map(t => t.k), groups: GROUPS.map(g => g.k), scale: 'eur', period: 'all', tl: 'month', donor: null, month: null, euc: false, all: false };
const S = { ...DEF };

// ---- Hash ------------------------------------------------------------------------------------------
function writeHash() {
  const q = new URLSearchParams({ m: S.measure, s: S.scale, p: S.period, tl: S.tl });
  if (S.types.length !== 3) q.set('t', S.types.join('.'));
  if (S.groups.length !== GROUPS.length) q.set('g', S.groups.join('.'));
  if (S.donor !== null) q.set('d', slug(DONORS[S.donor].key || DONORS[S.donor].n));
  if (S.month !== null) q.set('mo', MONTHS[S.month]);
  if (S.euc) q.set('euc', '1');
  if (S.all) q.set('n', 'all');
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (MEASURES.some(m => m[0] === q.get('m'))) S.measure = q.get('m');
  if (SCALES.some(m => m[0] === q.get('s'))) S.scale = q.get('s');
  if (TL.some(m => m[0] === q.get('tl'))) S.tl = q.get('tl');
  if (PERIODS.some(p => p.k === q.get('p'))) S.period = q.get('p');
  if (q.has('t')) { const t = q.get('t').split('.').filter(k => TYPES.some(x => x.k === k)); if (t.length) S.types = TYPES.map(x => x.k).filter(k => t.includes(k)); }
  if (q.has('g')) { const g = q.get('g').split('.').filter(k => GROUPS.some(x => x.k === k)); if (g.length) S.groups = GROUPS.map(x => x.k).filter(k => g.includes(k)); }
  if (q.has('d')) { const i = donorBySlug(q.get('d')); if (i >= 0) S.donor = i; }
  if (q.has('mo')) { const i = MONTHS.indexOf(q.get('mo')); if (i >= 0) S.month = i; }
  S.euc = q.get('euc') === '1';
  S.all = q.get('n') === 'all';
}

// ---- Controls ------------------------------------------------------------------------------------------
function seg(host, items, cur, on) {
  host.innerHTML = items.map(([k, n]) => `<button type="button" class="btn" data-k="${k}" aria-pressed="${k === cur}">${n}</button>`).join('');
  host.querySelectorAll('button').forEach(b => { b.onclick = () => on(b.dataset.k); });
}
function chips(host, items, on, cur) {
  host.innerHTML = items.map(it => `<button type="button" class="gchip" data-k="${it.k}" aria-pressed="${cur.includes(it.k)}" title="${it.d || it.n}">
    ${it.col ? `<i style="background:${it.col}"></i>` : ''}${it.n}</button>`).join('');
  host.querySelectorAll('.gchip').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.k, onNow = cur.includes(k);
      if (onNow && cur.length === 1) return;
      on(onNow ? cur.filter(x => x !== k) : items.map(x => x.k).filter(x => x === k || cur.includes(x)));
    };
  });
}
function renderControls() {
  seg($('measure'), MEASURES, S.measure, k => { S.measure = k; update(); });
  seg($('scale'), SCALES, S.scale, k => { S.scale = k; update(); });
  seg($('period'), PERIODS.map(p => [p.k, p.n]), S.period, k => { S.period = k; update(); });
  seg($('tlmode'), TL, S.tl, k => { S.tl = k; update(); });
  chips($('types'), TYPES, v => { S.types = v; update(); }, S.types);
  chips($('groups'), GROUPS, v => { S.groups = v; update(); }, S.groups);
  const eucOk = S.scale === 'gdp' && S.measure !== 'a';
  $('euc').checked = S.euc;
  $('euc').disabled = !eucOk;
  $('euc-wrap').hidden = !eucOk;
  $('euc-note').textContent = eucOk && S.euc && !eucApplies(S) ? 'Kiel gives these shares only as totals: pick all aid types and the whole period to add them.' : '';
}

// ---- Tooltip ---------------------------------------------------------------------------------------------
const tipEl = $('tip');
function tip(e, html) {
  if (!e) { tipEl.hidden = true; return; }
  tipEl.innerHTML = html; tipEl.hidden = false;
  const host = tipEl.offsetParent.getBoundingClientRect();
  const x = e.clientX - host.left, y = e.clientY - host.top, w = tipEl.offsetWidth;
  tipEl.style.left = Math.max(4, Math.min(host.width - w - 4, x + 12)) + 'px';
  tipEl.style.top = (y + 14) + 'px';
}

// ---- Render ----------------------------------------------------------------------------------------------
const LIMIT = 15;
function update() {
  if (S.donor !== null && !S.groups.includes(DONORS[S.donor].g)) S.donor = null;
  renderControls();
  const list = ranking(S);
  const what = { b: 'Allocated (bar) and committed (outline)', a: 'Allocated', c: 'Committed' }[S.measure];
  const per = S.scale === 'gdp' ? ', percent of 2021 GDP' : ', € billion';
  $('rk-h').textContent = what + per;
  renderRanking($('rank'), list, S, { onPick: pickDonor, limit: S.all ? 0 : LIMIT });
  $('more').hidden = list.length <= LIMIT;
  $('more').textContent = S.all ? `Show top ${LIMIT}` : `Show all ${list.length}`;
  $('rk-note').textContent = S.scale === 'gdp' ? 'EU institutions have no GDP and are left out. GDP is 2021 (pre-war), from the World Bank via Kiel.' : '';

  const series = monthly(S), cum = cumulative(series);
  const who = S.donor !== null ? DONORS[S.donor].n : 'Donors in view';
  $('tl-h').textContent = `${who}: ${S.tl === 'cum' ? 'running total since January 2022' : ({ b: 'allocated (bars) and committed (ticks)', a: 'allocated', c: 'committed' }[S.measure]) + ' per month'}`;
  drawTimeline($('tl'), series, cum, S, { tip, onPick: pickMonth });
  $('tl-legend').innerHTML = S.tl === 'cum'
    ? `${S.measure !== 'c' ? '<li><i class="ln a"></i>Allocated</li>' : ''}${S.measure !== 'a' ? '<li><i class="ln c"></i>Committed</li>' : ''}${S.measure === 'b' ? '<li><i class="sw gapk"></i>Committed, not yet allocated</li>' : ''}`
    : S.types.map(k => TYPES.find(t => t.k === k)).map(t => `<li><i class="sw" style="background:${t.col}"></i>${t.n}</li>`).join('') + (S.measure === 'b' ? '<li><i class="ln c"></i>Committed that month</li>' : '');
  const ua = series.undated.a.reduce((s, x) => s + x, 0), uc = series.undated.c.reduce((s, x) => s + x, 0);
  $('undated').textContent = ua + uc > 0.5 ? `Not in the timeline: ${eur(ua)} allocated and ${eur(uc)} committed that Kiel dates only as a range (for example "until December 2022"). They count in the "All" totals.` : '';

  renderPanel(S, summary(S));
  renderMonth($('month'), S, series, i => pickDonor(i));
  const cm = $('clear-month'); if (cm) cm.onclick = () => { S.month = null; update(); };
  $('to-month').hidden = S.month === null;
  animate();
  writeHash();
}

// Motion (see fx.js). Runs after each render and never changes what was drawn.
function animate() {
  const tl = $('tl'), rank = $('rank');
  const view = [S.measure, S.scale, S.period, S.types.join('.'), S.groups.join('.'), S.euc].join('|');
  onChange('rank', view + S.all, () => chart(rank, first => {
    rise(rank.children, { first, max: 20 });
    grow(rank.querySelectorAll('.rk-bar'), { first, axis: 'x', stagger: first ? 300 : 120 });
  }, { gap: 0 }));
  onChange('tl', view + S.tl + S.donor, () => chart(tl, first => {
    grow(tl.querySelectorAll('g > rect[style]'), { first, stack: true });
    fade(tl.querySelectorAll('.ctick, .gap'), { first, delay: first ? 300 : 120, max: 80 });
    stroke(tl.querySelectorAll('.aline, .cline'), { first });
  }, { gap: 0 }));
  onChange('month', S.month === null ? null : S.month + '|' + S.donor, () => { fade(tl.querySelector('.selbox'), { ms: 240 }); rise($('month').children, { stagger: 40 }); });
  count($('st-b'), 'st-b');
  $('summary').querySelectorAll('dd').forEach((dd, i) => count(dd, 'sum' + i + (S.donor !== null)));
  $('split').querySelectorAll('td.num').forEach((td, i) => flashIfChanged(td, 'split' + i));
}
function pickDonor(i) { S.donor = S.donor === i ? null : i; update(); }
function pickMonth(i, keepFocus) {
  S.month = S.month === i && !keepFocus ? null : i;
  update();
  if (keepFocus) $('tl').querySelector('.hit')?.focus();
}

// ---- Boot ------------------------------------------------------------------------------------------------
readHash();
$('euc').onchange = e => { S.euc = e.target.checked; update(); };
$('more').onclick = () => { S.all = !S.all; update(); };
$('clear-donor').onclick = () => { S.donor = null; update(); };
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Copied'; }
  catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1500);
};
$('reset').onclick = () => { Object.assign(S, DEF, { types: [...DEF.types], groups: [...DEF.groups] }); update(); };
const tour = createTour($('stage'), set => {
  Object.assign(S, set, { types: [...set.types], groups: [...set.groups], all: false });
  S.donor = typeof set.donor === 'string' ? DONORS.findIndex(d => d.n === set.donor) : null;
  S.month = typeof set.month === 'string' ? MONTHS.indexOf(set.month) : null;
  update();
});
$('tour-btn').onclick = () => tour.start();
addExportBar($('rk-export'), {
  target: () => $('rank-card'),
  title: () => `Aid to Ukraine by donor: ${$('rk-h').textContent.toLowerCase()}`,
  note: `Data: Kiel Institute, Ukraine Support Tracker, release ${META.release} (${META.file})`,
  csv: () => [['donor', 'group', 'allocated_eur_m', 'committed_eur_m', 'gdp_2021_eur_bn', 'allocated_pct_gdp', 'committed_pct_gdp'],
    ...ranking(S).map(o => [o.d.n, o.d.g, o.A.toFixed(1), o.C.toFixed(1), o.d.gdp ?? '', o.d.gdp ? (o.A / 10 / o.d.gdp).toFixed(4) : '', o.d.gdp ? (o.C / 10 / o.d.gdp).toFixed(4) : ''])],
});
addExportBar($('tl-export'), {
  target: () => $('tl'),
  title: () => $('tl-h').textContent,
  note: `Data: Kiel Institute, Ukraine Support Tracker, release ${META.release}`,
  csv: () => { const s = monthly(S); return [['month', ...TYPES.flatMap(t => [`${t.k}_allocated_eur_m`, `${t.k}_committed_eur_m`])], ...s.bins.map(b => [b.m, ...[0, 1, 2].flatMap(t => [b.a[t].toFixed(1), b.c[t].toFixed(1)])])]; },
});
let rt = null;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(update, 150); });
$('cite').textContent = META.cite;
$('checks').textContent = META.checks.length ? `Smaller differences remain: ${META.checks.join('; ')}.` : 'All donors match.';
$('asof').textContent = `Kiel release ${META.release}, data ${META.coverFrom} to ${META.coverTo}, published ${META.updated}; retrieved ${META.retrieved}.`;
update();
