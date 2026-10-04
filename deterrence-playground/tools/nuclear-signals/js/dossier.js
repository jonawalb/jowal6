// State dossier: arsenal, tests, declared policy, treaties, dyad placements, recent signals and rhetoric coverage.
import { ITEMS, esc, when, glyphSvg, NOW, svgEl } from './common.js';
import { DOSSIER, Y0, FAS_URL, ACA_URL, ELEMENTS, TREATY_URL } from '../data/dossier.js';
import { STATES, DYADS } from './rules.js';
import { placement, CORPUS_OF } from './placement.js';
import { RUNGS } from '../data/ladder.js';
import { RHET } from '../data/rhetoric.js';

const fmt = n => (n === null || n === undefined ? '–' : Number(n).toLocaleString('en-US'));
const KIND = { pledge: 'Pledge', qualified: 'Qualified', reject: 'Rejected', stmt: 'Statement' };

function spark(el, v) {
  const W = 300, H = 70, P = 4;
  const max = Math.max(...v, 1);
  el.setAttribute('viewBox', `0 0 ${W} ${H}`);
  el.innerHTML = '';
  const X = i => P + i / (v.length - 1) * (W - 2 * P), Y = n => H - 14 - n / max * (H - 24);
  svgEl('path', { d: v.map((n, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(n).toFixed(1)}`).join(''), class: 'sp-l' }, el);
  svgEl('text', { x: P, y: H - 2, class: 'ax-t' }, el, String(Y0));
  svgEl('text', { x: W - P, y: H - 2, class: 'ax-t', 'text-anchor': 'end' }, el, String(Y0 + v.length - 1));
  svgEl('text', { x: X(v.indexOf(max)), y: Y(max) - 3, class: 'ax-t', 'text-anchor': 'middle' }, el, `peak ${fmt(max)}`);
}

export function renderDossier(root, S, { onPick, setState, setDyad }) {
  const id = S.dossier, D = DOSSIER[id], st = STATES.find(s => s.id === id);
  const picks = STATES.map(s => `<button type="button" class="btn" data-s="${s.id}" aria-pressed="${s.id === id}">${esc(s.short)}</button>`).join('');
  const status = D.status || {};
  const deployed = (status.deployed_strategic || 0) + (status.deployed_nonstrategic || 0);
  const latest = {};
  for (const p of D.policy) if (!latest[p.el] || p.d > latest[p.el].d) latest[p.el] = p;
  const asOf = NOW.slice(0, 7);
  const dy = DYADS.filter(d => !d.d1only && (d.a.includes(id) || d.b.includes(id)));
  const recent = ITEMS.filter(it => it.from !== 'cx' && it.sub !== 'Battlefield moment' && it.st.includes(id) && it.d >= '2021').sort((a, b) => b.d.localeCompare(a.d));
  const cc = CORPUS_OF[id];
  const C = cc && RHET.countries[cc];
  root.innerHTML = `
    <div class="seg" role="group" aria-label="Nuclear-armed state">${picks}</div>
    <h2 class="dz-h">${esc(st.name)}</h2>
    <div class="dz-grid">
      <div class="card"><p class="eyebrow">Warheads, FAS 2026</p>
        <dl class="readout"><dt>Military stockpile</dt><dd class="num">${fmt(D.fas && D.fas.stockpile)}</dd>
        <dt>Deployed</dt><dd class="num">${fmt(deployed)}</dd><dt>Total inventory</dt><dd class="num">${fmt(D.fas && D.fas.inventory)}</dd></dl>
        <svg class="spark" role="img" aria-label="Stockpile estimate by year since ${Y0}"></svg>
        <p class="fine">${esc(D.fas ? D.fas.text : '')} <a href="${FAS_URL}" target="_blank" rel="noopener">FAS</a>; series via <a href="../nuclear-arsenals/">Nuclear Arsenals</a>.</p></div>
      <div class="card"><p class="eyebrow">Nuclear tests</p><p class="big num">${fmt(D.tests)}</p>
        <p class="fine">Arms Control Association tally (<a href="${ACA_URL}" target="_blank" rel="noopener">ACA</a>); <a href="../nuclear-tests/">Every Nuclear Test</a> reconciles the counts.${id === 'ISR' ? ' Israel has never acknowledged a test.' : ''}</p></div>
      <div class="card"><p class="eyebrow">Dyads on the ladder now</p>${dy.length ? `<ul class="dz-dy">${dy.map(d => { const p = placement(d.id, asOf, 12);
        return `<li><button type="button" class="linkbtn" data-dy="${d.id}">${esc(d.name)}</button> <span class="rpill">${p.rung ? 'rung ' + p.rung : 'none'}</span><br><span class="fine">${p.rung ? esc(RUNGS[p.rung]) : 'No placed item'} in the 12 months to ${esc(asOf)}</span></li>`; }).join('')}</ul>`
        : '<p class="fine">No dyad is coded for this state. Its items appear on the timeline only.</p>'}</div>
    </div>
    <div class="card"><p class="eyebrow">Declared policy, latest statement per element (<a href="../declaratory-policy/">Who Promises What</a>)</p>
      <div class="tablewrap"><table class="dz-t"><thead><tr><th>Element</th><th>Latest position</th><th>Document</th></tr></thead><tbody>
      ${ELEMENTS.map(e => { const p = latest[e.id]; return `<tr><td>${esc(e.name)}</td><td>${p ? `<span class="pill">${esc(KIND[p.kind] || p.kind)}</span> ${esc(p.tag)}` : '<span class="fine">Not declared: no official statement found</span>'}</td>
        <td>${p ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.doc)}</a>, ${esc(p.d.slice(0, 4))}` : ''}</td></tr>`; }).join('')}
      </tbody></table></div></div>
    <div class="card"><p class="eyebrow">Treaty status (<a href="../treaty-tracker/">Treaty Tracker</a>, depositary records)</p>
      <div class="tablewrap"><table class="dz-t"><thead><tr><th>Treaty</th><th>Signed</th><th>Joined</th><th>Later steps</th></tr></thead><tbody>
      ${D.treaties.map(t => `<tr><td><a href="${esc(TREATY_URL[t.t] || '#')}" target="_blank" rel="noopener">${esc(t.name)}</a></td><td>${esc(t.sig || '–')}</td><td>${esc(t.dep ? `${t.dep}${t.how ? ' (' + t.how.toLowerCase() + ')' : ''}` : '–')}</td>
        <td>${t.ev.map(e => `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.kind)} ${esc(e.d)}</a>`).join('; ') || ''}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="fine">A dash means no signature or deposit is on record. INF, New START and CFE bound only some states; New START expired on Feb. 5, 2026.</p></div>
    <div class="card"><p class="eyebrow">Rhetoric coverage in the corpus</p>${C ? `<p class="fine">${C.streams.map(s => `${esc(s.source)} (${esc(s.lang)}, ${fmt(s.n)} documents, ${esc(s.first)} to ${esc(s.last)})`).join('; ')}.</p>
      <button type="button" class="btn" data-rh="${cc}">Open the rhetoric series</button>`
      : `<p class="fine">The rhetoric corpus holds no official ${esc(st.name)} statements, so this state has no rhetoric series. Its statements appear only where another dataset records them.</p>`}</div>
    <div class="card"><p class="eyebrow">Signals since 2021 (${recent.length})</p>
      <ol class="list">${recent.slice(0, 40).map(it => `<li class="it"><button type="button" data-id="${esc(it.id)}"><span class="it-d">${esc(when(it))}</span>
        <span class="it-k">${glyphSvg(it.cat)}${esc(it.sub || '')}</span><span class="it-t">${esc(it.t)}</span><span class="it-a">${it.rung ? `<span class="rpill">rung ${it.rung}</span>` : ''}</span></button></li>`).join('') || '<li class="none">No items since 2021 in these datasets.</li>'}</ol>
      ${recent.length > 40 ? `<p class="fine">Showing the latest 40. The timeline shows all ${recent.length}.</p>` : ''}</div>
    ${D.cases.length ? `<div class="card"><p class="eyebrow">Cases in the model tools</p><ul class="src">${D.cases.map(c => `<li><a href="../${c.tool}/">${esc(c.t)}</a> (${esc(c.y)})</li>`).join('')}</ul></div>` : ''}`;
  if (D.stock) spark(root.querySelector('.spark'), D.stock);
  root.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => setState(b.dataset.s); });
  root.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => onPick(b.dataset.id, false); });
  root.querySelectorAll('[data-dy]').forEach(b => { b.onclick = () => setDyad(b.dataset.dy); });
  root.querySelectorAll('[data-rh]').forEach(b => { b.onclick = () => setDyad(null, b.dataset.rh); });
}
