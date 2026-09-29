// Kahn's Escalation Ladder: state, URL hash, panel, stepping, comparison, path chart and walkthrough.
import { RUNGS, groupOf, KAHN_SRC } from '../data/ladder.js';
import { CRISES } from '../data/crises.js';
import { SOURCES } from '../data/sources.js';
import { CRITIQUES } from '../data/critiques.js';
import { buildLadder, markLadder, pathChart } from './ladder-view.js';
import { createTour } from './tour.js';
import { CF, EXCLUDED } from '../data/counterfactuals.js';
import { createPlay, asCrisis } from './play.js';
import { mountEditor } from './model.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const byId = id => CRISES.find(c => c.id === id);
const state = { c: CRISES[0].id, s: 0, vs: '', rung: 0, m: '', p: [] };
const peak = c => Math.max(...c.steps.map(s => s.rung));

// ---- hash: #c=cuba&s=3&vs=kargil, or #c=cuba&m=play&p=0.2 (retry mode, option index per decision)
function parseChoices(id, str) {
  const cf = CF[id], out = [];
  if (!cf || !str) return out;
  for (const t of String(str).split('.')) {
    const d = cf.decisions[out.length], n = Number(t);
    if (!d || !Number.isInteger(n) || n < 0 || n >= d.options.length) break;
    out.push(n);
    if (!d.options[n].historical) break;   // a departure ends the record
  }
  return out;
}
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  state.m = h.get('m') === 'play' && CF[h.get('c')] ? 'play' : '';
  state.p = state.m ? parseChoices(h.get('c'), h.get('p')) : [];
  if (byId(h.get('c'))) state.c = h.get('c');
  const n = Number(h.get('s'));
  state.s = Number.isInteger(n) && n >= 1 ? Math.min(n, byId(state.c).steps.length) - 1 : byId(state.c).steps.length - 1;
  state.vs = byId(h.get('vs')) && h.get('vs') !== state.c ? h.get('vs') : '';
}
function writeHash() {
  if (picking) return;  // no crisis chosen yet: keep the URL clean so a reload shows the picker again
  const h = new URLSearchParams({ c: state.c });
  if (state.m) { h.set('m', 'play'); if (state.p.length) h.set('p', state.p.join('.')); }
  else { h.set('s', state.s + 1); if (state.vs) h.set('vs', state.vs); }
  history.replaceState(null, '', '#' + h.toString());
}

const srcLinks = ids => ids.map(id => {
  const s = SOURCES[id];
  if (!s) throw new Error('Missing source ' + id);
  return s.url ? `<a class="xlink" href="${s.url}" target="_blank" rel="noopener">${esc(s.short)}</a>` : `<span class="fine">${esc(s.short)}</span>`;
}).join('');

// ---- panel
const panel = document.getElementById('panel');
panel.innerHTML = `
  <div class="sec">
    <p class="kl-crises-h">Choose a crisis</p>
    <div class="choices kl-crises" id="crises" role="group" aria-label="Choose a crisis">${CRISES.map(c =>
      `<button type="button" data-c="${c.id}" aria-pressed="false">${esc(c.short)}<small>${esc(c.years)}</small></button>`).join('')}</div>
    <button type="button" class="btn cf-entry" id="retry">Retry this crisis from the allied side</button>
    <p class="fine" id="retry-note" hidden></p>
  </div>
  <div class="sec cf" id="play" hidden></div>
  <div class="sec kl-hist" aria-live="polite">
    <div class="kl-nav">
      <button type="button" class="btn" id="prev" aria-label="Previous step">Back</button>
      <div class="kl-dots" id="dots" role="group" aria-label="Steps"></div>
      <button type="button" class="btn solid" id="next" aria-label="Next step">Next</button>
    </div>
    <div class="kl-step" id="step"></div>
  </div>
  <div class="sec kl-cmp kl-hist">
    <p class="eyebrow">Compare with</p>
    <select id="vs" aria-label="Crisis to compare"><option value="">No comparison</option>${CRISES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
    <div class="kl-peaks" id="peaks"></div>
  </div>
  <div class="sec" id="rungnote"><p class="fine">Click any rung to see which crises in this tool reached it.</p></div>`;

buildLadder(document.getElementById('ladder'), n => { state.rung = n; render(); });

function renderStep() {
  const c = byId(state.c), s = c.steps[state.s], g = groupOf(s.rung);
  document.getElementById('dots').innerHTML = c.steps.map((_, i) =>
    `<button type="button" data-i="${i}" ${i === state.s ? 'aria-current="step"' : ''} aria-label="Step ${i + 1}">${i + 1}</button>`).join('');
  document.getElementById('prev').disabled = state.s === 0;
  document.getElementById('next').disabled = state.s === c.steps.length - 1;
  const coding = s.coding === 'source'
    ? `<p class="kl-coding"><span class="pill" style="color:var(--good)">placement from source</span> ${esc(s.codingNote || '')}</p>`
    : '<p class="kl-coding"><span class="pill">coding by the author of this tool</span> The events are sourced; placing them on this rung is this tool\'s judgment, not a claim made by the sources.</p>';
  document.getElementById('step').innerHTML = `
    <p class="d">${esc(c.name)} · step ${state.s + 1} of ${c.steps.length} · ${esc(s.date)}</p>
    <h3>${esc(s.title)}</h3>
    <p>${esc(s.text)}</p>
    <div class="kl-rq">Rung <b>${s.rung}</b>: “${esc(RUNGS[s.rung])}”<br><span class="fine">${esc(g.name)}</span></div>
    ${s.why ? `<p class="fine">${esc(s.why)}</p>` : ''}
    ${coding}
    <div class="xlinks">${srcLinks(s.src)}</div>
    ${state.s === c.steps.length - 1 ? promptHTML(c) : ''}`;
}

function promptHTML(c) {
  if (!CF[c.id]) return `<div class="cf-prompt off"><p class="cf-ph">No allied-side retry for this crisis</p><p class="fine">${esc(EXCLUDED[c.id] || '')}</p></div>`;
  return `<div class="cf-prompt"><p class="cf-ph">Retry this crisis from the allied side?</p>
    <p>Take the decisions of ${esc(CF[c.id].player)}, choose among the options actually on the table, and watch a notional model of how it could have ended.</p>
    <button type="button" class="btn solid cf-go" data-retry>Retry from the allied side</button></div>`;
}

function renderPeaks() {
  const a = byId(state.c), b = state.vs ? byId(state.vs) : null;
  const card = (c, cls) => `<div class="kl-peak ${cls}"><span>${esc(c.short)} highest rung</span><b>${peak(c)}</b><span>${esc(RUNGS[peak(c)])}</span><br><span class="fine">${esc(groupOf(peak(c)).name)}</span></div>`;
  document.getElementById('peaks').innerHTML = card(a, 'a') + (b ? card(b, 'b') : '<p class="fine">Pick a second crisis to see both paths on the ladder and in the chart below.</p>');
}

function renderRungNote() {
  const box = document.getElementById('rungnote');
  if (!state.rung) return;
  const hits = CRISES.filter(c => c.steps.some(s => s.rung === state.rung));
  box.innerHTML = `<p class="eyebrow">Rung ${state.rung}</p><p class="kl-rungnote"><b>“${esc(RUNGS[state.rung])}”</b> · ${esc(groupOf(state.rung).name)}</p>
    <p class="kl-rungnote">${hits.length ? 'Reached in this tool\'s coding by: ' + hits.map(c => `<button type="button" class="btn" data-go="${c.id}" data-r="${state.rung}" style="padding:2px 8px;margin:2px">${esc(c.short)}</button>`).join('') : 'No crisis in this tool is coded at this rung.'}</p>`;
  box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    const c = byId(b.dataset.go);
    set({ c: c.id, s: c.steps.findIndex(s => s.rung === Number(b.dataset.r)), vs: state.vs === c.id ? '' : state.vs });
  });
}

function renderPlay() {
  const c = byId(state.c), { me, hist } = play.render(c, state.p);
  const a = { crisis: asCrisis(me.rounds, 'Your run', 'Your run'), step: me.rounds.length - 1 };
  const b = { crisis: asCrisis(hist.rounds, 'History', 'What happened'), step: -1 };
  markLadder(document.getElementById('ladder'), me.rounds.length ? a : null, b, state.rung);
  pathChart(document.getElementById('path'), a, b);
  document.getElementById('path-legend').innerHTML = `<span><i></i>Your run</span><span><i class="b"></i>What happened (${esc(c.name)})</span>`;
  document.getElementById('summary').innerHTML = `<b>${esc(c.name)}: retry from the allied side.</b> You play ${esc(CF[c.id].player)}. Blue marks your path; orange marks what happened.`;
}

function render() {
  const inPlay = !!state.m && !!CF[state.c];
  if (!inPlay) state.m = '';
  panel.querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-pressed', x.dataset.c === state.c));
  panel.querySelectorAll('.kl-hist').forEach(x => { x.hidden = inPlay; });
  document.getElementById('play').hidden = !inPlay;
  document.getElementById('model-card').hidden = !inPlay;
  const retry = document.getElementById('retry'), note = document.getElementById('retry-note');
  retry.hidden = inPlay; retry.disabled = !CF[state.c];
  note.hidden = inPlay || !!CF[state.c]; note.textContent = EXCLUDED[state.c] || '';
  if (inPlay) { renderPlay(); writeHash(); return; }
  const a = { crisis: byId(state.c), step: state.s }, b = state.vs ? { crisis: byId(state.vs), step: -1 } : null;
  document.getElementById('vs').value = state.vs;
  renderStep(); renderPeaks(); renderRungNote();
  markLadder(document.getElementById('ladder'), a, b, state.rung);
  pathChart(document.getElementById('path'), a, b);
  document.getElementById('path-legend').innerHTML = `<span><i></i>${esc(a.crisis.name)}</span>` + (b ? `<span><i class="b"></i>${esc(b.crisis.name)}</span>` : '');
  document.getElementById('summary').innerHTML = `<b>${esc(a.crisis.name)}.</b> ${esc(a.crisis.summary)}`;
  writeHash();
}
function set(p) { Object.assign(state, p); render(); }

panel.querySelector('#crises').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b) return;
  play.reset();
  if (state.m && CF[b.dataset.c]) set({ c: b.dataset.c, p: [], vs: '' });
  else set({ c: b.dataset.c, s: 0, m: '', p: [], vs: state.vs === b.dataset.c ? '' : state.vs });
});
const startPlay = () => { play.reset(); set({ m: 'play', p: [], vs: '', rung: 0 }); document.getElementById('panel').scrollIntoView({ block: 'start' }); };
document.getElementById('retry').onclick = startPlay;
panel.addEventListener('click', e => { if (e.target.closest('[data-retry]')) startPlay(); });
const play = createPlay({
  root: document.getElementById('play'), srcLinks,
  onChoose: i => { if (i !== null) state.p = [...state.p, i]; render(); document.getElementById('play').scrollIntoView({ block: 'nearest' }); },
  onRestart: () => set({ p: [] }),
  onLeave: () => set({ m: '', p: [], s: byId(state.c).steps.length - 1 }),
});
mountEditor(document.getElementById('model-edit'), () => render());
panel.addEventListener('click', e => {
  if (!e.target.closest('[data-open-model]')) return;
  const d = document.querySelector('#model-card details'); d.open = true; d.scrollIntoView({ block: 'start' });
});
document.getElementById('dots').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) set({ s: Number(b.dataset.i) }); });
document.getElementById('prev').onclick = () => set({ s: Math.max(0, state.s - 1) });
document.getElementById('next').onclick = () => set({ s: Math.min(byId(state.c).steps.length - 1, state.s + 1) });
document.getElementById('vs').onchange = e => set({ vs: e.target.value === state.c ? '' : e.target.value });
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea') || e.altKey || e.metaKey || e.ctrlKey || state.m) return;
  if (e.key === 'ArrowRight' && e.target === document.body) document.getElementById('next').click();
  if (e.key === 'ArrowLeft' && e.target === document.body) document.getElementById('prev').click();
});

// ---- critiques and crisis table
document.getElementById('critiques').innerHTML = CRITIQUES.map(k => `<article><h3>${esc(k.title)}</h3>
  ${k.quote.map(q => `<blockquote>“${esc(q)}”</blockquote>`).join('')}
  <p>${esc(k.gloss)}</p><p class="who">${esc(k.cite)}</p>${srcLinks(k.src)}</article>`).join('');
document.getElementById('crisis-table').innerHTML = CRISES.map(c => `<tr><td>${esc(c.years)}</td><td>${esc(c.name)}</td><td class="num">${peak(c)}</td><td>${esc(RUNGS[peak(c)])}</td></tr>`).join('');
document.getElementById('cf-table').innerHTML = CRISES.map(c => {
  const cf = CF[c.id];
  if (!cf) return `<tr><td>${esc(c.name)}</td><td colspan="2">Left out (see below)</td></tr>`;
  return `<tr><td>${esc(c.name)}</td><td>${esc(cf.player)}</td><td>${cf.decisions.map(d => `${esc(d.date)}: ${d.options.length} options`).join('<br>')}</td></tr>`;
}).join('');
document.getElementById('cf-excluded').innerHTML = Object.entries(EXCLUDED).map(([id, t]) => `<b>${esc(byId(id).name)}.</b> ${esc(t)}`).join(' ');
document.getElementById('kahn-src').innerHTML = `<a href="${KAHN_SRC.url}" target="_blank" rel="noopener">${esc(KAHN_SRC.cite)}</a>`;
const cfSrc = Object.values(CF).flatMap(x => x.decisions.flatMap(d => d.options.flatMap(o => o.src)));
const used = new Set([...CRISES.flatMap(c => c.steps.flatMap(s => s.src)), ...CRITIQUES.flatMap(k => k.src), ...cfSrc]);
document.getElementById('sources').innerHTML = [...used].map(id => SOURCES[id]).sort((a, b) => a.cite.localeCompare(b.cite))
  .map(s => `<li>${esc(s.cite)}${s.url ? ` <a href="${s.url}" target="_blank" rel="noopener">Link</a>` : ''}</li>`).join('');

const tour = createTour(p => { play.reset(); set({ rung: 0, m: '', p: [], ...p }); });
document.getElementById('start-tour').onclick = () => tour.start();
document.getElementById('copy-link').onclick = async e => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; }
  catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1800);
};
let pw = 0;
new ResizeObserver(() => { const w = document.querySelector('.kl-path').clientWidth; if (Math.abs(w - pw) > 4) { pw = w; render(); } }).observe(document.querySelector('.kl-path'));
addEventListener('hashchange', () => { play.reset(); readHash(); render(); });
// ---- crisis picker: shown first unless the link already names a crisis
const pick = document.getElementById('pick');
let picking = !byId(new URLSearchParams(location.hash.slice(1)).get('c'));
pick.querySelector('#pick-grid').innerHTML = CRISES.map(c => `<button type="button" class="kl-pick-card" data-pick="${c.id}">
  <span class="kl-pick-y">${esc(c.years)}</span><b>${esc(c.name)}</b><span>${esc(c.summary)}</span></button>`).join('');
function showPicker(on) {
  picking = on; pick.hidden = !on; document.body.classList.toggle('kl-picking', on);
  if (on) { history.replaceState(null, '', location.pathname + location.search); pick.querySelector('.kl-pick-card').focus(); }
}
pick.addEventListener('click', e => {
  const b = e.target.closest('[data-pick]'); if (!b) return;
  showPicker(false); set({ c: b.dataset.pick, s: 0 }); scrollTo({ top: 0 });
});
document.getElementById('change-crisis').onclick = () => { showPicker(true); scrollTo({ top: 0 }); };
addEventListener('hashchange', () => { if (picking && byId(new URLSearchParams(location.hash.slice(1)).get('c'))) showPicker(false); });
document.getElementById('start-tour').addEventListener('click', () => { if (picking) showPicker(false); }, true);

if (location.hash && !picking) readHash(); else state.s = 0;
if (picking) showPicker(true);
render();
