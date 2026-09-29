// Sanctions Explorer: state, URL hash, filters and rendering.
import { META, FIRST, LAST, BY_ID, SENDER_OPTS, TARGET_OPTS, ISSUE_OPTS, TYPE_OPTS,
  filter, stats, byYear, byIssue } from './model.js';
import { TYPE_INFO, CLASSES } from '../data/codebook.js';
import { drawTimeline, renderIssues } from './charts.js';
import { renderSummary, renderCompare, renderDisagree, renderList, renderCase } from './panels.js';
import { createTour } from './tour.js';

document.title = 'Sanctions Explorer | Interactive Deterrence';
const $ = id => document.getElementById(id);
const DEFAULT = { snd: '', tgt: '', iss: '', ty: '', st: 'all', y0: FIRST, y1: LAST, def: 'broad', dis: false, yr: null, c: null };
const S = { ...DEFAULT };
const PAGE = 20;
let limit = PAGE;

// ---- Hash ------------------------------------------------------------------------------------
const KEYS = { snd: 's', tgt: 't', iss: 'i', ty: 'ty', st: 'st', y0: 'y0', y1: 'y1', def: 'def', yr: 'yr', c: 'c' };
function writeHash() {
  const q = new URLSearchParams();
  for (const [k, h] of Object.entries(KEYS)) if (S[k] !== DEFAULT[k] && S[k] !== '' && S[k] != null) q.set(h, S[k]);
  if (S.dis) q.set('dis', '1');
  history.replaceState(null, '', q.toString() ? '#' + q.toString() : location.pathname + location.search);
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const inOpts = (v, opts) => opts.some(o => o.k === v) ? v : '';
  S.snd = inOpts(q.get('s'), SENDER_OPTS);
  S.tgt = inOpts(q.get('t'), TARGET_OPTS);
  S.iss = inOpts(q.get('i'), ISSUE_OPTS);
  S.ty = inOpts(q.get('ty'), TYPE_OPTS);
  S.st = ['all', 'threat', 'imposed'].includes(q.get('st')) ? q.get('st') : 'all';
  S.def = q.get('def') === 'strict' ? 'strict' : 'broad';
  const yr = v => { const n = parseInt(v, 10); return n >= FIRST && n <= LAST ? n : null; };
  S.y0 = yr(q.get('y0')) ?? FIRST; S.y1 = yr(q.get('y1')) ?? LAST;
  if (S.y0 > S.y1) [S.y0, S.y1] = [S.y1, S.y0];
  S.yr = yr(q.get('yr'));
  S.c = BY_ID.has(+q.get('c')) ? +q.get('c') : null;
  S.dis = q.get('dis') === '1';
}

// ---- Controls ------------------------------------------------------------------------------------
function fillSelect(sel, opts, all) {
  sel.innerHTML = `<option value="">${all}</option>` + opts.map(o => `<option value="${o.k}">${o.n} (${o.c})</option>`).join('');
}
function buildControls() {
  fillSelect($('f-snd'), SENDER_OPTS, 'Any sender');
  fillSelect($('f-tgt'), TARGET_OPTS, 'Any target');
  fillSelect($('f-iss'), ISSUE_OPTS, 'Any objective');
  fillSelect($('f-ty'), TYPE_OPTS.map(o => ({ ...o, n: TYPE_INFO[o.k].n })), 'Any type');
  const years = []; for (let y = FIRST; y <= LAST; y++) years.push(`<option>${y}</option>`);
  $('f-y0').innerHTML = $('f-y1').innerHTML = years.join('');
  const on = (id, k, cast = v => v) => { $(id).onchange = e => { S[k] = cast(e.target.value); S.yr = null; limit = PAGE; update(); }; };
  on('f-snd', 'snd'); on('f-tgt', 'tgt'); on('f-iss', 'iss'); on('f-ty', 'ty');
  on('f-y0', 'y0', Number); on('f-y1', 'y1', Number);
  $('f-dis').onchange = e => { S.dis = e.target.checked; limit = PAGE; update(); };
}
function seg(host, items, cur, onPick) {
  host.innerHTML = items.map(([k, n]) => `<button type="button" class="btn" data-k="${k}" aria-pressed="${k === cur}">${n}</button>`).join('');
  host.querySelectorAll('button').forEach(b => { b.onclick = () => onPick(b.dataset.k); });
}
function syncControls() {
  $('f-snd').value = S.snd; $('f-tgt').value = S.tgt; $('f-iss').value = S.iss; $('f-ty').value = S.ty;
  if (S.y0 > S.y1) [S.y0, S.y1] = [S.y1, S.y0];
  $('f-y0').value = S.y0; $('f-y1').value = S.y1; $('f-dis').checked = S.dis;
  seg($('f-st'), [['all', 'All cases'], ['threat', 'Threat only'], ['imposed', 'Imposed']], S.st, k => { S.st = k; S.yr = null; limit = PAGE; update(); });
  seg($('f-def'), [['broad', 'Any concession'], ['strict', 'Full compliance only']], S.def, k => { S.def = k; update(); });
}

// ---- Tooltip ----------------------------------------------------------------------------------------
const tipEl = $('tip');
function tip(e, html) {
  if (!e) { tipEl.hidden = true; return; }
  tipEl.innerHTML = html; tipEl.hidden = false;
  const host = tipEl.offsetParent.getBoundingClientRect();
  const x = e.clientX - host.left, y = e.clientY - host.top;
  tipEl.style.left = Math.max(4, Math.min(host.width - tipEl.offsetWidth - 4, x + 12)) + 'px';
  tipEl.style.top = (y + 14) + 'px';
}

// ---- Render ---------------------------------------------------------------------------------------------
function update() {
  syncControls();
  const list = filter(S);
  const st = stats(list, S.def);
  renderSummary({ b: $('st-b'), s: $('st-s'), box: $('status'), dl: $('summary') }, st, S);
  drawTimeline($('tl'), byYear(list, S.y0, S.y1), S.yr, { onPick: y => { S.yr = S.yr === y ? null : y; limit = PAGE; update(); }, tip });
  renderIssues($('issues'), byIssue(S), S, i => { S.iss = S.iss === i ? '' : i; S.yr = null; limit = PAGE; update(); });
  renderCompare($('compare'), stats(list.filter(c => c.imp), S.def), st, S);
  renderDisagree($('dis-note'), st);
  const shown = (S.yr ? list.filter(c => c.y === S.yr) : list).slice().sort((a, b) => b.y - a.y || b.id - a.id);
  $('list-h').textContent = S.yr ? `Cases that began in ${S.yr}` : 'Cases in view, newest first';
  $('list-n').textContent = `${shown.length} case${shown.length === 1 ? '' : 's'}`;
  $('clear-yr').hidden = !S.yr;
  renderList($('cases'), shown, S, limit, pick);
  $('more').hidden = shown.length <= limit;
  $('more').textContent = `Show ${Math.min(PAGE, shown.length - limit)} more`;
  renderCase($('detail'), S.c ? BY_ID.get(S.c) : null);
  $('iss-help').textContent = `Right-hand figure: share of cases with an outcome coded that ended with ${S.def === 'strict' ? 'the target complying fully' : 'the target giving some ground'}. A case can list up to three objectives, so it can appear in more than one row. Click a row to filter.`;
  writeHash();
}
function pick(id) {
  S.c = S.c === id ? null : id;
  update();
  if (S.c && matchMedia('(max-width: 1020px)').matches) {
    $('detail').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}

// ---- Boot ----------------------------------------------------------------------------------------------------
buildControls();
readHash();
$('more').onclick = () => { limit += PAGE; update(); };
$('clear-yr').onclick = () => { S.yr = null; update(); };
$('reset').onclick = () => { Object.assign(S, DEFAULT); limit = PAGE; update(); };
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Copied'; }
  catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1500);
};
const tour = createTour($('stage'), set => { Object.assign(S, DEFAULT, set); limit = PAGE; update(); });
$('tour-btn').onclick = () => tour.start();
let rt = null;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(update, 150); });
addEventListener('hashchange', () => { readHash(); update(); });
$('asof').textContent = `TIES version ${META.version}: ${META.n.toLocaleString('en-US')} cases that began ${FIRST} to ${LAST}. Retrieved ${META.retrieved}.`;
$('legend').innerHTML = CLASSES.map(k => `<li><i class="sw" style="background:${k.col}"></i>${k.n}</li>`).join('');
update();
