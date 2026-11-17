// Understanding AI Policy: tabs, filters, URL hash and wiring between the four views.
import { DOCS, ISSUES, AXES, META } from '../data/policy.js';
import { THEMES, COUNTRIES, D, esc } from './common.js';
import { createTimeline, listHTML } from './timeline.js';
import { docHTML } from './panel.js';
import { issueButtons, compareHTML } from './compare.js';
import { SCOPES, debatesHTML } from './debates.js';
import { createCompass } from './compass.js';
import { encodeAnswers, decodeAnswers } from './compass-math.js';

const $ = id => document.getElementById(id);
const VIEWS = ['timeline', 'compare', 'debates', 'compass'];
const AX = AXES.map(a => a.id);
const narrow = () => matchMedia('(max-width: 700px)').matches;
const DEF = () => ({ v: 'timeline', d: 'us-chips-act-2022', th: new Set(), ln: new Set(COUNTRIES.map(c => c.id)), mode: narrow() ? 'list' : 'chart', q: '', i: ISSUES[0].id, s: 'all', a: {}, links: true });
let state = DEF();
// Simple | Full detail. Per-viewer convenience only; the page works without storage.
let full = false;
try { full = localStorage.getItem('et-detail') === 'full'; } catch {}
let debAll = false;
// Simple mode starts from "Key documents": a hand-picked set of the statutes, rules, strategies and agreements
// an AI and chip policy specialist would expect to see first. "Show all" lifts it; Full detail always shows all.
const KEY_IDS = `us-ecra-2018 us-firrma-2018 us-bis-huawei-2019 us-bis-huawei-fdp-2020 us-chips-act-2022 us-bis-oct2022 us-bis-oct2023
us-eo14105 us-eo14110 us-treasury-outbound-2024 us-bis-fdp-2024 us-bis-diffusion us-eo14179 us-ai-action-plan
us-ca-sb53-2025 us-coins-act-2025 us-eo14365 us-bis-h200-2026 us-eo14409 us-bis-remote-access-2026
cn-mic2025-2015 cn-big-fund-2014 cn-aidp-2017 cn-export-control-law-2020 cn-uel-provisions-2020 cn-algorithm-provisions-2021
cn-genai-measures-2023 cn-mofcom-gage-2023 cn-dual-use-regs-2024 cn-mofcom-46-2024 cn-ai-labeling-measures-2025
cn-mofcom-18-2025 cn-mofcom-61-2025 cn-gaap-2025 cn-15th-fyp-outline-2026
ru-decree490 ru-decree124 ru-decree166-cii ru-fz243-ai-law
intl-wassenaar intl-oecd-ai-principles intl-us-russia-ear-7468 intl-nl-sme-controls intl-jp-sme-controls intl-bletchley
unga-78-265 intl-eu-ai-act intl-coe-ai-convention intl-paris-statement us-cn-ai-dialogue-2026`.split(/\s+/);
const KEY = new Set(KEY_IDS.filter(id => DOCS.some(d => d.id === id)));
let tlAll = false;
const DEB_N = 4;
function applyDetail() {
  document.body.classList.toggle('detail-full', full);
  document.body.classList.toggle('detail-simple', !full);
  document.querySelectorAll('[data-detail]').forEach(b => b.setAttribute('aria-pressed', (b.dataset.detail === 'full') === full));
}
applyDetail();
if (!D[state.d]) state.d = DOCS[DOCS.length - 1]?.id;

// ---- hash
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  state = DEF();
  if (!D[state.d]) state.d = DOCS[DOCS.length - 1]?.id;
  if (VIEWS.includes(h.get('v'))) state.v = h.get('v');
  if (D[h.get('d')]) state.d = h.get('d');
  if (h.has('th')) state.th = new Set(h.get('th').split(',').filter(t => THEMES.some(x => x.id === t)));
  if (h.has('ln')) { const l = h.get('ln').split(',').filter(t => COUNTRIES.some(x => x.id === t)); if (l.length) state.ln = new Set(l); }
  if (h.get('m') === 'list' || h.get('m') === 'chart') state.mode = h.get('m');
  if (ISSUES.some(i => i.id === h.get('i'))) state.i = h.get('i');
  if (SCOPES.some(s => s.id === h.get('s'))) state.s = h.get('s');
  if (h.get('links') === '0') state.links = false;
  state.a = decodeAnswers(h.get('a'), AX);
}
let hashT = 0;
function writeHash() {
  clearTimeout(hashT);
  hashT = setTimeout(() => {
    const h = new URLSearchParams();
    h.set('v', state.v);
    if (state.v === 'timeline') {
      h.set('d', state.d);
      if (state.th.size) h.set('th', [...state.th].join(','));
      if (state.ln.size !== COUNTRIES.length) h.set('ln', [...state.ln].join(','));
      if (!state.links) h.set('links', '0');
    }
    if (state.v === 'compare') h.set('i', state.i);
    if (state.v === 'debates' && state.s !== 'all') h.set('s', state.s);
    const a = encodeAnswers(state.a, AX);
    if (a) h.set('a', a);
    history.replaceState(null, '', '#' + h.toString().replace(/%2C/g, ',').replace(/%3A/g, ':'));
  }, 120);
}

// ---- static controls
$('asof').textContent = META.checkedText;
$('f-themes').innerHTML = THEMES.map(t => `<button type="button" class="btn ap-chip" data-th="${t.id}" aria-pressed="false">${esc(t.name)}</button>`).join('');
$('f-lanes').innerHTML = COUNTRIES.map(c => `<button type="button" class="btn ap-chip" data-ln="${c.id}" aria-pressed="true"><span class="ap-cdot" style="background:${c.color}"></span>${esc(c.id === 'INTL' ? 'Between them' : c.name)}</button>`).join('');
$('issues').innerHTML = issueButtons(state.i);
$('scopes').innerHTML = SCOPES.map(s => `<button type="button" class="btn ap-chip" data-s="${s.id}" aria-pressed="false">${esc(s.name)}</button>`).join('');
$('n-docs').textContent = DOCS.length;

const tl = createTimeline($('tl'), { onSelect: id => set({ d: id }) });
const compass = createCompass($('axes'), $('compass-aside'), { onChange: a => { state.a = { ...a }; writeHash(); } });

// ---- render
function render(scroll) {
  // tabs
  for (const v of VIEWS) {
    const on = state.v === v;
    const tab = $('tab-' + v);
    tab.setAttribute('aria-selected', on); tab.tabIndex = on ? 0 : -1;
    $('view-' + v).hidden = !on;
    if (v === 'compass') $('cmp-mini').classList.toggle('off', !on);
  }
  if (state.v === 'timeline') {
    document.querySelectorAll('[data-th]').forEach(b => b.setAttribute('aria-pressed', state.th.has(b.dataset.th)));
    document.querySelectorAll('[data-ln]').forEach(b => b.setAttribute('aria-pressed', state.ln.has(b.dataset.ln)));
    $('m-chart').setAttribute('aria-pressed', state.mode === 'chart');
    $('m-list').setAttribute('aria-pressed', state.mode === 'list');
    $('links').checked = state.links;
    $('tl').hidden = state.mode !== 'chart';
    $('tl-legend').hidden = state.mode !== 'chart';
    $('tl-list').hidden = state.mode !== 'list';
    document.querySelector('.ap-filters').classList.toggle('ap-active', !!(state.th.size || state.q));
    const keyOnly = !full && !tlAll && !state.q; // a search always covers every document
    tl.update({ sel: state.d, themes: state.th, lanes: state.ln, links: state.links && full, q: state.q, only: keyOnly ? KEY : null });
    const shown = DOCS.filter(d => (!keyOnly || KEY.has(d.id) || d.id === state.d) && state.ln.has(d.country) && (!state.th.size || d.themes.some(t => state.th.has(t)))
      && (!state.q || `${d.title} ${d.titleOrig || ''} ${d.issuer} ${d.summary}`.toLowerCase().includes(state.q.toLowerCase())))
      .sort((a, b) => a.date.localeCompare(b.date));
    $('tl-count').textContent = keyOnly ? `${shown.length} key documents of ${DOCS.length}` : `${shown.length} of ${DOCS.length} documents`;
    $('tl-all').hidden = full;
    $('tl-all').textContent = tlAll ? 'Key documents only' : `Show all ${DOCS.length}`;
    $('tl-all').setAttribute('aria-pressed', tlAll);
    if (state.mode === 'list') $('tl-list').innerHTML = listHTML(shown, state.d);
    $('detail').innerHTML = docHTML(state.d);
    if (scroll === 'doc') tl.scrollTo(state.d);
  }
  if (state.v === 'compare') {
    document.querySelectorAll('[data-issue]').forEach(b => b.setAttribute('aria-pressed', b.dataset.issue === state.i));
    $('compare').innerHTML = compareHTML(state.i);
  }
  if (state.v === 'debates') {
    document.querySelectorAll('[data-s]').forEach(b => b.setAttribute('aria-pressed', b.dataset.s === state.s));
    $('debates').innerHTML = debatesHTML(state.s);
    const n = $('debates').querySelectorAll('.ap-debate').length;
    const clip = !full && !debAll && n > DEB_N;
    $('debates').classList.toggle('ap-clip', clip);
    $('deb-more').hidden = !clip;
    $('deb-more').textContent = `Show all ${n} debates`;
  }
  writeHash();
}
function set(next, scroll) { Object.assign(state, next); render(scroll); }

// ---- events
document.querySelector('.ap-detailsw').addEventListener('click', e => {
  const b = e.target.closest('[data-detail]'); if (!b) return;
  full = b.dataset.detail === 'full';
  try { localStorage.setItem('et-detail', full ? 'full' : 'simple'); } catch {}
  applyDetail(); render();
});
$('tl-all').addEventListener('click', () => { tlAll = !tlAll; render('doc'); });
$('deb-more').addEventListener('click', () => {
  debAll = true; render();
  $('debates').querySelectorAll('.ap-debate')[DEB_N]?.querySelector('h3')?.setAttribute('tabindex', '-1');
  $('debates').querySelectorAll('.ap-debate')[DEB_N]?.querySelector('h3')?.focus();
});
const tabs = VIEWS.map(v => $('tab-' + v));
tabs.forEach((t, i) => {
  t.addEventListener('click', () => set({ v: VIEWS[i] }));
  t.addEventListener('keydown', e => {
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = tabs.length - 1;
    if (j != null) { e.preventDefault(); set({ v: VIEWS[j] }); tabs[j].focus(); }
  });
});
$('f-themes').addEventListener('click', e => {
  const b = e.target.closest('[data-th]'); if (!b) return;
  const th = new Set(state.th); th.has(b.dataset.th) ? th.delete(b.dataset.th) : th.add(b.dataset.th);
  set({ th });
});
$('f-lanes').addEventListener('click', e => {
  const b = e.target.closest('[data-ln]'); if (!b) return;
  const ln = new Set(state.ln); ln.has(b.dataset.ln) ? ln.delete(b.dataset.ln) : ln.add(b.dataset.ln);
  if (ln.size) set({ ln });
});
$('m-chart').addEventListener('click', () => set({ mode: 'chart' }, 'doc'));
$('m-list').addEventListener('click', () => set({ mode: 'list' }));
$('links').addEventListener('change', e => set({ links: e.target.checked }));
$('q').addEventListener('input', e => set({ q: e.target.value.trim() }));
$('tl-reset').addEventListener('click', () => { $('q').value = ''; set({ th: new Set(), ln: new Set(COUNTRIES.map(c => c.id)), q: '', links: true }); });
$('tl-list').addEventListener('click', e => {
  const b = e.target.closest('.ap-li'); if (!b) return;
  set({ d: b.dataset.id });
  if (narrow()) $('detail').scrollIntoView({ block: 'start', behavior: 'smooth' });
  else $('tl-list').querySelector(`[data-id="${CSS.escape(b.dataset.id)}"]`)?.focus();
});
$('issues').addEventListener('click', e => { const b = e.target.closest('[data-issue]'); if (b) set({ i: b.dataset.issue }); });
$('scopes').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) set({ s: b.dataset.s }); });
// Any "open on the timeline" button anywhere on the page.
document.addEventListener('click', e => {
  const b = e.target.closest('.ap-jump'); if (!b || !D[b.dataset.id]) return;
  e.preventDefault();
  const d = D[b.dataset.id];
  const ln = new Set(state.ln); ln.add(d.country);
  const th = state.th.size && !d.themes.some(t => state.th.has(t)) ? new Set() : state.th;
  set({ v: 'timeline', d: d.id, ln, th }, 'doc');
  (state.mode === 'chart' && !narrow() ? $('tab-timeline') : $('detail')).scrollIntoView({ block: 'start', behavior: 'smooth' });
});
$('cmp-mini').addEventListener('click', e => { e.preventDefault(); $('cmp-sum').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
$('cmp-reveal').addEventListener('change', e => compass.reveal(e.target.checked));
$('cmp-reset').addEventListener('click', () => compass.reset());
$('cmp-share').addEventListener('click', async () => {
  writeHash();
  await new Promise(r => setTimeout(r, 150));
  const btn = $('cmp-share');
  try { await navigator.clipboard.writeText(location.href); btn.textContent = 'Link copied'; }
  catch { btn.textContent = 'Copy the address bar'; }
  setTimeout(() => { btn.textContent = 'Copy link to my answers'; }, 2000);
});
window.addEventListener('hashchange', () => {
  const before = location.hash;
  readHash(); compass.set(state.a); render('doc');
  if (location.hash !== before) writeHash();
});

readHash();
compass.set(state.a);
render('doc');
