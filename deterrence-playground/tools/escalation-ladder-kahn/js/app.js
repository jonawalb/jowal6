// Kahn's Escalation Ladder: state, URL hash, panel, stepping, comparison, path chart and walkthrough.
import { RUNGS, groupOf, KAHN_SRC } from '../data/ladder.js';
import { CRISES } from '../data/crises.js';
import { SOURCES } from '../data/sources.js';
import { CRITIQUES } from '../data/critiques.js';
import { buildLadder, markLadder, pathChart } from './ladder-view.js';
import { createTour } from './tour.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const byId = id => CRISES.find(c => c.id === id);
const state = { c: CRISES[0].id, s: 0, vs: '', rung: 0 };
const peak = c => Math.max(...c.steps.map(s => s.rung));

// ---- hash: #c=cuba&s=3&vs=kargil
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (byId(h.get('c'))) state.c = h.get('c');
  const n = Number(h.get('s'));
  state.s = Number.isInteger(n) && n >= 1 ? Math.min(n, byId(state.c).steps.length) - 1 : byId(state.c).steps.length - 1;
  state.vs = byId(h.get('vs')) && h.get('vs') !== state.c ? h.get('vs') : '';
}
function writeHash() {
  if (picking) return;  // no crisis chosen yet: keep the URL clean so a reload shows the picker again
  const h = new URLSearchParams({ c: state.c, s: state.s + 1 });
  if (state.vs) h.set('vs', state.vs);
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
  </div>
  <div class="sec" aria-live="polite">
    <div class="kl-nav">
      <button type="button" class="btn" id="prev" aria-label="Previous step">Back</button>
      <div class="kl-dots" id="dots" role="group" aria-label="Steps"></div>
      <button type="button" class="btn solid" id="next" aria-label="Next step">Next</button>
    </div>
    <div class="kl-step" id="step"></div>
  </div>
  <div class="sec kl-cmp">
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
    <div class="xlinks">${srcLinks(s.src)}</div>`;
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

function render() {
  const a = { crisis: byId(state.c), step: state.s }, b = state.vs ? { crisis: byId(state.vs), step: -1 } : null;
  panel.querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-pressed', x.dataset.c === state.c));
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
  set({ c: b.dataset.c, s: 0, vs: state.vs === b.dataset.c ? '' : state.vs });
});
document.getElementById('dots').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) set({ s: Number(b.dataset.i) }); });
document.getElementById('prev').onclick = () => set({ s: Math.max(0, state.s - 1) });
document.getElementById('next').onclick = () => set({ s: Math.min(byId(state.c).steps.length - 1, state.s + 1) });
document.getElementById('vs').onchange = e => set({ vs: e.target.value === state.c ? '' : e.target.value });
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea') || e.altKey || e.metaKey || e.ctrlKey) return;
  if (e.key === 'ArrowRight' && e.target === document.body) document.getElementById('next').click();
  if (e.key === 'ArrowLeft' && e.target === document.body) document.getElementById('prev').click();
});

// ---- critiques and crisis table
document.getElementById('critiques').innerHTML = CRITIQUES.map(k => `<article><h3>${esc(k.title)}</h3>
  ${k.quote.map(q => `<blockquote>“${esc(q)}”</blockquote>`).join('')}
  <p>${esc(k.gloss)}</p><p class="who">${esc(k.cite)}</p>${srcLinks(k.src)}</article>`).join('');
document.getElementById('crisis-table').innerHTML = CRISES.map(c => `<tr><td>${esc(c.years)}</td><td>${esc(c.name)}</td><td class="num">${peak(c)}</td><td>${esc(RUNGS[peak(c)])}</td></tr>`).join('');
document.getElementById('kahn-src').innerHTML = `<a href="${KAHN_SRC.url}" target="_blank" rel="noopener">${esc(KAHN_SRC.cite)}</a>`;
const used = new Set([...CRISES.flatMap(c => c.steps.flatMap(s => s.src)), ...CRITIQUES.flatMap(k => k.src)]);
document.getElementById('sources').innerHTML = [...used].map(id => SOURCES[id]).sort((a, b) => a.cite.localeCompare(b.cite))
  .map(s => `<li>${esc(s.cite)}${s.url ? ` <a href="${s.url}" target="_blank" rel="noopener">Link</a>` : ''}</li>`).join('');

const tour = createTour(p => set({ rung: 0, ...p }));
document.getElementById('start-tour').onclick = () => tour.start();
document.getElementById('copy-link').onclick = async e => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; }
  catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1800);
};
let pw = 0;
new ResizeObserver(() => { const w = document.querySelector('.kl-path').clientWidth; if (Math.abs(w - pw) > 4) { pw = w; render(); } }).observe(document.querySelector('.kl-path'));
addEventListener('hashchange', () => { readHash(); render(); });
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
