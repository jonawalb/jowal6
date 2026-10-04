// Detail panel for one item, and the item list under the timeline.
import { esc, when, srcList, glyphSvg, CAT_COL, CAT_NAME, ORIGIN, RUNG_RULE, laneName, dyadById } from './common.js';
import { RUNGS } from '../data/ladder.js';
import { DYAD_RULES } from './rules.js';

const LANG = { en: 'English', ru: 'Russian', zh: 'Chinese', fa: 'Persian' };
const EL = { nfu: 'No first use', nsa: 'Negative security assurance', conditions: 'Conditions for use', role: 'Role of nuclear weapons', alert: 'Alert posture' };

export function renderDetail(el, it, nav) {
  if (!it) {
    el.innerHTML = `<p class="eyebrow">Item</p><p class="fine">Click a mark on the timeline, a row in a list, or a piece of evidence on the ladder to read it here with its sources and coding.</p>`;
    return;
  }
  const rr = RUNG_RULE[it.rule];
  const rungTxt = it.rung ? `Rung ${it.rung}: ${esc(RUNGS[it.rung])}` : 'Not placed on the ladder';
  const dy = (it.dy || []).map(d => dyadById(d)).filter(Boolean);
  const dyRule = DYAD_RULES.find(r => r.id === it.dyRule);
  const o = ORIGIN[it.from];
  const origin = o.slug ? `<a href="../${o.slug}/">${esc(o.n)}</a>` : esc(o.n);
  el.innerHTML = `
    <div class="d-nav"><p class="eyebrow">${glyphSvg(it.cat)} ${esc(CAT_NAME[it.cat])} · ${esc(it.sub || '')}</p>
      <span>${nav ? `<button type="button" class="btn" data-step="-1" aria-label="Previous item">‹</button><button type="button" class="btn" data-step="1" aria-label="Next item">›</button>` : ''}</span></div>
    <h3 class="d-h">${esc(it.t)}</h3>
    <p class="d-meta">${esc(when(it))}${it.prec !== 'day' ? ` <span class="pill">${it.prec} only</span>` : ''} · ${(it.st.length ? it.st : ['MULTI']).map(laneName).map(esc).join(', ')}${it.who && it.from === 'rns' ? ` · ${esc(it.who)}` : ''}</p>
    ${it.x ? `<p>${esc(it.x)}</p>` : ''}
    ${it.q ? `<blockquote${it.lang && it.lang !== 'en' ? ` lang="${esc(it.lang)}"` : ''}>${esc(it.q)}</blockquote>${it.lang && it.lang !== 'en' ? `<p class="fine">Original ${esc(LANG[it.lang] || it.lang)} text, not translated.</p>` : ''}` : ''}
    ${it.quotes && it.quotes.length ? `<div class="d-q"><p class="eyebrow">Declared policy quoted in Who Promises What</p>${it.quotes.slice(0, 4).map(q =>
      `<p class="fine"><b>${esc(EL[q.el] || q.el)}:</b> ${esc(q.tag)}</p><blockquote>${esc(q.text)}</blockquote>`).join('')}</div>` : ''}
    ${it.tone ? `<p class="fine">Tone model: threat ${it.tone.threat.toFixed(2)}, escalation ${it.tone.esc.toFixed(2)} (probabilities that the sentence expresses each; the model also scores reported or denied threats).</p>` : ''}
    <div class="d-lv">
      <p class="d-rung"><b>${rungTxt}</b></p>
      <p class="fine">${it.rule === 'K' ? `Coded in <a href="../escalation-ladder-kahn/">Kahn's Escalation Ladder</a> (${esc(it.k.crisis)}${it.k.coding === 'source' ? ', following a cited source' : ', author coding'}).${it.k.why ? ' ' + esc(it.k.why) : ''}`
        : `Rule ${esc(it.rule)} (${esc(rr ? rr.label : '')}). ${esc(rr ? rr.text : '')}`}</p>
      ${it.why ? `<p class="fine"><b>Coding note:</b> ${esc(it.why)}</p>` : ''}
      ${it.lvl !== undefined && it.from === 'rns' ? `<p class="fine">Russia's Nuclear Signals level: ${it.lvl}.</p>` : ''}
      <p class="fine"><b>Dyads:</b> ${dy.length ? dy.map(d => esc(d.name)).join('; ') + (dyRule ? ` (rule ${dyRule.id})` : '') : 'none. It appears on the timeline and in the dossier but does not place any dyad.'}</p>
    </div>
    <p class="eyebrow">Sources</p>${srcList(it)}
    <p class="fine">From: ${origin}${it.also ? `; also in ${it.also.map(a => esc(ORIGIN[a.from].n)).join(', ')}` : ''}.</p>`;
  if (nav) el.querySelectorAll('[data-step]').forEach(b => { b.onclick = () => nav(+b.dataset.step); });
}

export function renderList(el, list, selId, onPick, limit, more) {
  const rows = list.slice(0, limit);
  el.innerHTML = rows.length ? rows.map(it => `<li class="it${it.id === selId ? ' on' : ''}${it.from === 'cx' ? ' it-cx' : ''}"><button type="button" data-id="${esc(it.id)}">
    <span class="it-d">${esc(when(it))}</span>
    <span class="it-k">${glyphSvg(it.cat)}${esc((it.st.length ? it.st : ['MULTI']).map(laneName).join(', '))}</span>
    <span class="it-t">${esc(it.t)}${it.from === 'cx' ? ` <span class="it-q">“${esc(it.q.slice(0, 110))}${it.q.length > 110 ? '…' : ''}”</span>` : ''}</span>
    <span class="it-a">${it.rung ? `<span class="rpill">rung ${it.rung}</span>` : ''}</span></button></li>`).join('')
    + (list.length > limit ? `<li class="none"><button type="button" class="btn" id="more">Show ${Math.min(100, list.length - limit)} more of ${list.length - limit}</button></li>` : '')
    : '<li class="none">Nothing matches these filters.</li>';
  el.querySelectorAll('button[data-id]').forEach(b => { b.onclick = () => onPick(b.dataset.id, true); });
  const m = el.querySelector('#more'); if (m) m.onclick = more;
}
export { CAT_COL };
