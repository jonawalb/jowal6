// Defense Budget Allocator: state, URL hash and rendering.
import { BUDGETS, CABINET_145, ACT_780_ITEMS } from '../data/budget.js';
import { CATS, PRESETS } from '../data/categories.js';
import { evaluate, verdict, explain } from './model.js';
import { setShare, normalize, barHtml, mountDragBar, mountSliders, fmtBn } from './alloc.js';
import { createStrip } from './strip.js';
import { renderCompare, mobileWeighted } from './compare.js';
import { createTour } from './tour.js';
import { addExportBar, tableRows } from '../../../shared/js/export.js';

const $ = id => document.getElementById(id);
const CAB_MIX = normalize(Object.fromEntries(CATS.map(c => [c.id, CABINET_145.filter(l => l.cat === c.id).reduce((a, l) => a + l.bn, 0)])));
const mixOf = k => (k === 'cabinet' ? { ...CAB_MIX } : normalize({ ...PRESETS[k].mix }));

const S = { b: 's145', shares: mixOf('porcupine'), locks: {}, supp: 0.6, warn: 5, preset: 'porcupine' };
const budget = () => BUDGETS.find(x => x.k === S.b);

// ---- hash ------------------------------------------------------------------------
function writeHash() {
  const q = new URLSearchParams({ b: S.b, a: CATS.map(c => Math.round(S.shares[c.id] * 1000)).join('.'), sp: Math.round(S.supp * 100), w: S.warn });
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (BUDGETS.some(x => x.k === q.get('b'))) S.b = q.get('b');
  const a = (q.get('a') || '').split('.').map(Number);
  if (a.length === CATS.length && a.every(v => Number.isFinite(v) && v >= 0) && a.some(v => v > 0)) {
    S.shares = normalize(Object.fromEntries(CATS.map((c, i) => [c.id, a[i]]))); S.preset = null;
  }
  const sp = +q.get('sp'); if (q.has('sp') && Number.isFinite(sp)) S.supp = Math.max(0, Math.min(90, sp)) / 100;
  const w = +q.get('w'); if (q.has('w') && Number.isFinite(w)) S.warn = Math.max(1, Math.min(14, Math.round(w)));
}
readHash();

// ---- mount -----------------------------------------------------------------------
$('realtable').innerHTML = CABINET_145.map(l => `<tr><td>${l.t}</td><td class="num">${l.bn.toFixed(1)}</td><td>${CATS.find(c => c.id === l.cat).t}</td></tr>`).join('')
  + `<tr><td><b>Total</b></td><td class="num"><b>${CABINET_145.reduce((a, l) => a + l.bn, 0).toFixed(1)}</b></td><td></td></tr>`;
$('budgets').innerHTML = BUDGETS.map(b => `<button type="button" data-b="${b.k}"><b>${b.t}</b><br><span class="muted">${b.s}</span></button>`).join('');
$('budgets').querySelectorAll('button').forEach(btn => btn.onclick = () => { S.b = btn.dataset.b; if (S.preset === 'cabinet' && S.b !== 's145') S.preset = null; render(); });
const presetList = [['porcupine', PRESETS.porcupine.t], ['legacy', PRESETS.legacy.t], ['even', PRESETS.even.t], ['cabinet', 'Cabinet mix']];
$('presets').innerHTML = presetList.map(([k, t]) => `<button type="button" data-p="${k}">${t}</button>`).join('');
$('presets').querySelectorAll('button').forEach(btn => btn.onclick = () => applyPreset(btn.dataset.p));
function applyPreset(k) { S.shares = mixOf(k); S.preset = k; S.locks = {}; render(); }

const strip = createStrip($('strip'), (t, hit, n) => {
  $('clock').textContent = `Hour ${(t * evaluate(S.shares, budget().bn, S).hours).toFixed(1)} · ${hit} of ${n} ships hit`;
});
const onMix = s => { S.shares = normalize(s); S.preset = null; render(); };
const bar = mountDragBar($('dragbar'), () => S, onMix);
const sliders = mountSliders($('sliders'), () => ({ shares: S.shares, total: budget().bn, locks: S.locks }),
  (id, v) => { S.shares = setShare(S.shares, S.locks, id, v); S.preset = null; render(); },
  id => { S.locks[id] = !S.locks[id]; render(); });

function bindRange(id, get, set, f) {
  const i = $(id);
  i.oninput = () => { set(+i.value); render(); };
  return () => { i.value = get(); $(id + '-out').textContent = f(get()); };
}
const drawSupp = bindRange('supp', () => Math.round(S.supp * 100), v => { S.supp = v / 100; }, v => v + '%');
const drawWarn = bindRange('warn', () => S.warn, v => { S.warn = v; }, v => v + (v === 1 ? ' day' : ' days'));
$('play').onclick = () => strip.play();

// ---- render ----------------------------------------------------------------------
function render() {
  const B = budget(), r = evaluate(S.shares, B.bn, S), v = verdict(r);
  document.querySelectorAll('#budgets button').forEach(b => b.setAttribute('aria-pressed', b.dataset.b === S.b));
  document.querySelectorAll('#presets button').forEach(b => {
    b.setAttribute('aria-pressed', b.dataset.p === S.preset);
    if (b.dataset.p === 'cabinet') { b.disabled = S.b !== 's145'; b.title = b.disabled ? 'Only the NT$145.7bn line has a published breakdown' : ''; }
  });
  $('budget-note').textContent = B.note;
  $('alloc-title').textContent = `Your allocation · NT$${fmtBn(B.bn)}bn`;
  bar.draw(); sliders.draw(); drawSupp(); drawWarn();
  // reference
  $('reference').innerHTML = S.b === 's145'
    ? `<p class="eyebrow sm">What the cabinet proposed, Sept. 3, 2026</p>${barHtml(CAB_MIX, { labels: true })}
       <ul class="reflist">${CABINET_145.map(l => `<li><span class="sw8" style="background:var(${CATS.find(c => c.id === l.cat).col})"></span>${l.t}<b class="num">${l.bn.toFixed(1)}</b></li>`).join('')}</ul>`
    : S.b === 's780'
      ? `<p class="eyebrow sm">What the act names</p><p class="fine">The act reserves the money for U.S. Foreign Military Sales cases and names ${ACT_780_ITEMS.join(', ')}. No per-item amounts were published, so there is no reference mix.</p>`
      : `<p class="eyebrow sm">What the plan covered</p><p class="fine">The proposal listed precision artillery, long-range missiles, drones, air and missile defense, AI-enabled command and surveillance, war stocks, production lines and co-development with the United States, across 23 programs. No per-category amounts were published, so there is no reference mix.</p>`;
  // status + readout
  const st = $('status'); st.dataset.s = v.s; st.innerHTML = `<b>${v.b}</b><span>${v.t}</span>`;
  $('tiles').innerHTML = [
    ['Force engaged', Math.round(r.engaged * 100) + '%', 'of the crossing force comes under effective attack'],
    ['Hours under fire', `${r.fireHours.toFixed(1)} h`, `of a ${r.hours.toFixed(1)} h crossing`],
    ['Shooters left', Math.round(mobileWeighted(r) * 100) + '%', 'after PLA suppression strikes'],
    ['Resilience', Math.round(r.resilience), 'out of 100'],
  ].map(([t, b, s]) => `<div class="tile"><span>${t}</span><b>${b}</b><small>${s}</small></div>`).join('');
  $('why').innerHTML = explain(r);
  $('layers').innerHTML = r.layers.map(l => `<li><span class="sw8" style="background:var(${l.col})"></span>${l.t}<span class="lbar"><i style="width:${Math.round(l.st * 100)}%;background:var(${l.col})"></i></span><span class="num">${Math.round(l.p * 100)}%</span></li>`).join('');
  // comparison
  const rows = [{ t: 'Your plan', you: true, shares: S.shares },
    { t: PRESETS.porcupine.t, s: PRESETS.porcupine.s, shares: mixOf('porcupine') },
    { t: PRESETS.legacy.t, s: PRESETS.legacy.s, shares: mixOf('legacy') }];
  if (S.b === 's145') rows.push({ t: 'Cabinet mix', s: 'Sept. 3 proposal, mapped', shares: CAB_MIX });
  $('compare').innerHTML = renderCompare(rows, B.bn, S);
  $('cmp-title').textContent = `Compare at NT$${fmtBn(B.bn)}bn, ${Math.round(S.supp * 100)}% suppression, ${S.warn}-day warning`;
  strip.set(r);
  writeHash();
}

const tour = createTour($('stage'), p => {
  if (p.b) S.b = p.b;
  if (p.supp != null) S.supp = p.supp;
  if (p.warn != null) S.warn = p.warn;
  if (p.preset) { S.shares = mixOf(p.preset); S.preset = p.preset; S.locks = {}; }
  render(); strip.play();
});
$('start-tour').onclick = () => tour.start();
addExportBar($('strip-note'), {
  target: () => $('strip'),
  title: () => `Notional crossing, NT$${fmtBn(budget().bn)}bn plan: ${$('clock').textContent}`,
  note: 'Notional model (TSM Defense Budget Allocator), not a forecast',
  where: 'after',
});
addExportBar($('real').parentElement, { csv: () => tableRows($('real')), csvLabel: 'Copy table as CSV', where: 'after' });
$('copy-link').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy-link').textContent = 'Link copied'; }
  catch { $('copy-link').textContent = 'Copy the address bar'; }
  setTimeout(() => { $('copy-link').textContent = 'Copy link'; }, 1800);
};
render();
