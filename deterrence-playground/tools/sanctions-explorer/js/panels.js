// Summary readout, the TIES/GSDB comparison, the case list and the case card.
import { STATES, INSTS, ISSUES, OUTCOMES, CLASSES, TYPES, senderLabel, pct } from './model.js';
import { TYPE_INFO } from '../data/codebook.js';
import { GSDB_SOURCES, GSDB_FIGURES } from '../data/gsdb.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => n.toLocaleString('en-US');
const CLS = Object.fromEntries(CLASSES.map(k => [k.k, k]));
const DEF_TXT = { strict: 'the target gave in fully', broad: 'the target gave in fully, partly or by negotiation' };

export function renderSummary(els, st, S) {
  els.b.textContent = st.coded ? `${pct(st.rate)} ended with ${S.def === 'strict' ? 'full compliance' : 'the target giving ground'}` : 'No outcomes coded';
  els.s.textContent = st.coded
    ? `${fmt(st.win)} of ${fmt(st.coded)} cases with an outcome coded: ${DEF_TXT[S.def]}. ${fmt(st.n - st.coded)} more have no outcome in TIES.`
    : 'None of the cases in view has a final outcome coded.';
  els.box.dataset.s = st.rate == null ? 'warn' : st.rate >= 0.5 ? 'good' : st.rate >= 0.25 ? 'warn' : 'bad';
  els.dl.innerHTML = `<dt>Cases in view</dt><dd>${fmt(st.n)}</dd>
    <dt>Sanctions imposed</dt><dd>${st.imp}</dd><dt>Threat only</dt><dd>${st.thrOnly}</dd>
    ${CLASSES.map(k => `<dt><i class="key" style="background:${k.col}"></i>${k.n}</dt><dd>${st.by[k.k]}</dd>`).join('')}
    <dt>Rate, ended at threat</dt><dd>${pct(st.tRate)} <small>of ${st.tCoded}</small></dd>
    <dt>Rate, after imposing</dt><dd>${pct(st.iRate)} <small>of ${st.iCoded}</small></dd>`;
}

/** TIES rate for imposed cases in view, next to what the GSDB authors publish. */
export function renderCompare(host, stImposed, st, S) {
  const bar = (v, cls) => `<span class="cmp-bar"><i class="${cls}" style="width:${v == null ? 0 : Math.round(v * 100)}%"></i></span>`;
  host.innerHTML = `
    <p class="eyebrow">TIES and GSDB, side by side</p>
    <p class="fine">The GSDB only counts imposed sanctions, so the closest TIES figure is the imposed cases in view. These are different case lists with different definitions of success; the rows are not the same cases.</p>
    <ul class="cmp">
      <li><span class="cmp-l"><b>TIES</b>, imposed cases in view, ${S.def}</span>${bar(stImposed.rate, 'ties')}<span class="num">${pct(stImposed.rate)}</span></li>
      <li><span class="cmp-l"><b>TIES</b>, all cases in view (threats too), ${S.def}</span>${bar(st.rate, 'ties')}<span class="num">${pct(st.rate)}</span></li>
      ${GSDB_FIGURES.map((f, i) => `<li><span class="cmp-l"><b>GSDB</b>, ${esc(f.label)} <button type="button" class="q" data-q="${i}" aria-expanded="false">quote</button></span>${bar(f.pct / 100, 'gsdb')}<span class="num">~${f.pct}%</span>
        <blockquote class="gq" id="gq${i}" hidden>“${esc(f.quote)}” <a href="${GSDB_SOURCES[f.src].url}" target="_blank" rel="noopener">${esc(GSDB_SOURCES[f.src].cite.split(',')[0])} et al.</a></blockquote></li>`).join('')}
    </ul>
    <p class="fine">GSDB figures are all-case figures published by its authors. They do not change with the filters. Case-level GSDB data is not in this tool (see Method).</p>`;
  host.querySelectorAll('.q').forEach(b => {
    b.onclick = () => { const q = host.querySelector('#gq' + b.dataset.q); q.hidden = !q.hidden; b.setAttribute('aria-expanded', String(!q.hidden)); };
  });
}

export function renderDisagree(host, st) {
  host.innerHTML = st.both ? `Of the ${fmt(st.both)} cases in view with an outcome and both scores, the two point different ways in ${fmt(st.dis)}.` : 'No case in view has an outcome and both scores.';
}

function outcomePill(c) {
  const k = CLS[c.cls];
  return `<span class="pill" style="color:${k.col}">${esc(k.n)}</span>`;
}

export function renderList(host, list, S, limit, onPick) {
  if (!list.length) { host.innerHTML = '<li class="none">No cases match the filters.</li>'; return; }
  host.innerHTML = list.slice(0, limit).map(c => `<li><button type="button" class="cc" data-id="${c.id}" aria-pressed="${c.id === S.c}">
    <span class="cc-y num">${c.y}${c.ey && c.ey !== c.y ? '–' + c.ey : ''}</span>
    <span class="cc-m"><b>${esc(senderLabel(c))}</b> <span class="arr" aria-hidden="true">→</span> <b>${esc(STATES[c.tg])}</b>
    <small>${c.iss.map(i => esc(ISSUES[i].n)).join(' · ') || 'Issue not coded'}</small></span>
    <span class="cc-o">${c.imp ? '<span class="tag">imposed</span>' : '<span class="tag thr">threat</span>'}${outcomePill(c)}${c.dis ? '<span class="tag dis" title="Outcome code and settlement scores disagree">scores disagree</span>' : ''}</span>
  </button></li>`).join('');
  host.querySelectorAll('.cc').forEach(b => { b.onclick = () => onPick(+b.dataset.id); });
}

const mon = m => m ? new Date(Date.UTC(2000, m - 1, 1)).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }) + ' ' : '';
const typeList = ix => ix.map(i => esc(TYPE_INFO[TYPES[i]].n)).join(', ');

export function renderCase(host, c) {
  if (!c) {
    host.innerHTML = `<p class="eyebrow">Case card</p><p class="fine">Pick a case from the list to see how TIES codes it.</p>`;
    return;
  }
  const end = c.ey ? String(c.ey) : c.oy ? `ongoing as of ${c.oy}` : 'no end date coded';
  const ps = c.ps >= 0 && c.snd.length > 1 ? `<dt>Primary sender</dt><dd>${esc(STATES[c.ps])}</dd>` : '';
  const out = OUTCOMES[c.out];
  const sc = c.ss == null && c.ts == null ? 'Not coded' : `sender ${c.ss ?? 'n/a'}, target ${c.ts ?? 'n/a'} <small>(0 to 10, higher is better for that side)</small>`;
  const prevail = c.ss == null || c.ts == null ? '' : c.ss > c.ts ? 'the sender' : c.ts > c.ss ? 'the target' : 'neither side';
  const dis = c.dis === 'tgt' ? 'The outcome code says the target gave ground, but the target scored higher than the sender.'
    : c.dis === 'snd' ? 'The outcome code says the target made no concession, but the sender scored higher than the target.' : '';
  host.innerHTML = `<p class="eyebrow">Case card · TIES ${c.id}</p>
    <h3 class="d-h">${esc(senderLabel(c))} → ${esc(STATES[c.tg])}</h3>
    <dl class="readout card-dl">
      <dt>Began</dt><dd>${mon(c.m)}${c.y}${c.thr ? ' (threat)' : ' (imposed without threat)'}</dd>
      <dt>Ended</dt><dd>${end}</dd>
      ${ps}
      ${c.inst.length ? `<dt>Institution</dt><dd>${c.inst.map(i => esc(INSTS[i])).join(', ')}</dd>` : ''}
      <dt>Objective</dt><dd>${c.iss.map(i => esc(ISSUES[i].n)).join('; ') || 'Not coded'}</dd>
      ${c.note ? `<dt>TIES note</dt><dd>${esc(c.note)}</dd>` : ''}
      <dt>Threatened</dt><dd>${c.thr ? (typeList(c.tt) || 'Type not coded') : 'No threat recorded'}</dd>
      <dt>Imposed</dt><dd>${c.imp ? `${c.iy ? c.iy + ': ' : ''}${typeList(c.ti) || 'Type not coded'}` : 'Not imposed'}</dd>
    </dl>
    <div class="twocodes">
      <div><p class="eyebrow">Outcome code</p><p>${outcomePill(c)}</p><p class="fine">${esc(out.n)}${c.out ? ` (code ${c.out})` : ''}</p></div>
      <div><p class="eyebrow">Settlement scores</p><p class="fine">${sc}</p>${prevail ? `<p class="fine">Higher score: ${prevail}</p>` : ''}</div>
    </div>
    ${dis ? `<p class="status-note">${dis} TIES's manual calls the scores "somewhat questionable" when read on their own.</p>` : ''}
    <p class="fine">No GSDB coding is shown: its case data may not be republished.</p>`;
}
