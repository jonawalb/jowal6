// China Compute Tracker: state, URL hash, views and wiring.
import { EL_RULES, POLICY, CASES, ESTIMATES, SECTORS, AS_OF, GRADE_INFO, esc, fmtDate, $, tooltip } from './common.js';
import { GRADES } from './range.js';
import { renderEstimates, estimateDetail } from './estimates.js';
import { renderEntity, ruleDetail } from './entity.js';
import { renderCases, caseDetail, CASE_TYPES, STATUS_KEYS } from './cases.js';
import { renderTimeline, policyDetail } from './timeline.js';
import { renderMethod } from './method.js';
import { createTour } from './tour.js';

const VIEWS = [
  { k: 'est', n: 'Capacity estimates' }, { k: 'el', n: 'Entity List' }, { k: 'cases', n: 'Cases' },
  { k: 'tl', n: 'Timeline' }, { k: 'method', n: 'Method & sources' },
];
const SEC_KEYS = SECTORS.map(s => s.k);
const fresh = () => ({ view: 'est', grades: [...GRADES], rep: false, per: {}, secs: [...SEC_KEYS], other: false,
  ctypes: [...CASE_TYPES], cstat: STATUS_KEYS.map(s => s.k), q: '', sel: null });
const S = fresh();

// ---- Lookup for the detail panel ----
function find(id) {
  if (!id) return null;
  const [k, v] = [id.slice(0, 1), id.slice(2)];
  if (k === 'e') { const e = ESTIMATES.find(x => x.id === v); return e && { html: estimateDetail(e) }; }
  if (k === 'r') { const r = EL_RULES.find(x => x.doc === v); return r && { html: ruleDetail(r) }; }
  if (k === 'c') { const c = CASES.find(x => x.id === v); return c && { html: caseDetail(c) }; }
  if (k === 'p') { const p = POLICY.find(x => x.id === v); return p && { html: policyDetail(p) }; }
  return null;
}

// ---- Hash ----
function writeHash() {
  const q = new URLSearchParams({ v: S.view });
  if (S.grades.join('') !== GRADES.join('')) q.set('g', S.grades.join('') || '0');
  const per = Object.entries(S.per).map(([m, p]) => `${m}:${p}`).join('.');
  if (per) q.set('p', per);
  if (S.secs.length !== SEC_KEYS.length) q.set('s', S.secs.join('.'));
  if (S.other) q.set('o', 1);
  if (S.rep) q.set('r', 1);
  if (S.q) q.set('q', S.q);
  if (S.sel) q.set('sel', S.sel);
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (VIEWS.some(v => v.k === q.get('v'))) S.view = q.get('v');
  if (q.has('g')) S.grades = GRADES.filter(g => q.get('g').includes(g));
  if (q.has('p')) for (const kv of q.get('p').split('.')) { const [m, p] = kv.split(':'); if (m && p) S.per[m] = p; }
  if (q.has('s')) { const v = q.get('s').split('.').filter(k => SEC_KEYS.includes(k)); if (v.length) S.secs = v; }
  S.other = q.get('o') === '1';
  S.rep = q.get('r') === '1';
  S.q = (q.get('q') || '').slice(0, 60);
  if (find(q.get('sel'))) S.sel = q.get('sel');
}

// ---- Render ----
const tip = tooltip($('tip'));
const set = patch => { Object.assign(S, patch); update(); };
function pick(id, scroll) {
  S.sel = id; window.addEventListener('hashchange', () => { Object.assign(S, fresh()); readHash(); update(); });
update();
  if (scroll && window.matchMedia('(max-width: 1020px)').matches) $('detail').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

function renderSide() {
  $('side').innerHTML = `<p class="eyebrow">Evidence grades</p>
    <ul class="nowlist">${GRADES.map(g => `<li><span><span class="gtag g-${g}">${g}</span> ${esc(GRADE_INFO[g].n)}</span><span></span><span class="num">${ESTIMATES.filter(e => e.grade === g).length}</span><span class="fine nw">${esc(GRADE_INFO[g].d)}</span></li>`).join('')}</ul>
    <p class="fine">Number = estimates in the tool with that grade.</p>`;
}

function update() {
  $('tabs').innerHTML = VIEWS.map(v => `<button type="button" role="tab" class="tab" data-v="${v.k}" aria-selected="${v.k === S.view}" aria-controls="view">${esc(v.n)}</button>`).join('');
  $('tabs').querySelectorAll('[data-v]').forEach(b => { b.onclick = () => set({ view: b.dataset.v }); });
  const V = $('view');
  const h = { onPick: pick, set, tip };
  if (S.view === 'est') renderEstimates(V, S, h);
  else if (S.view === 'el') renderEntity(V, S, h);
  else if (S.view === 'cases') renderCases(V, S, h);
  else if (S.view === 'tl') renderTimeline(V, S, h);
  else renderMethod(V);
  const it = find(S.sel);
  $('detail').innerHTML = it ? it.html : `<p class="eyebrow">Details</p><p class="fine">Click an estimate, a rule, a case or a timeline mark to read it here with its source.</p>`;
  renderSide();
  writeHash();
}

// ---- Wiring ----
readHash();
$('asof').textContent = `Current as of ${fmtDate(AS_OF)}.`;
$('copy').onclick = async () => { try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Copied'; } catch { $('copy').textContent = 'Copy failed'; } setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1500); };
$('reset').onclick = () => { Object.assign(S, fresh()); update(); };
const tour = createTour($('stage'), patch => { Object.assign(S, fresh(), patch); update(); });
$('tour-btn').onclick = () => tour.start();
let rt, lastW = window.innerWidth;
window.addEventListener('resize', () => { if (window.innerWidth === lastW) return; lastW = window.innerWidth; clearTimeout(rt); rt = setTimeout(update, 150); });
window.addEventListener('hashchange', () => { Object.assign(S, fresh()); readHash(); update(); });
update();
