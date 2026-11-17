// Detail card for one document: what it does, status, quote, primary source and relations.
import { C, D, REL, KIND, statusOf, relationsOf, esc, dateText, ext, host, quoteHTML } from './common.js';
import { THEMES } from './common.js';

const themeName = id => THEMES.find(t => t.id === id)?.name || id;

export function docHTML(id) {
  const d = D[id];
  if (!d) return '<p class="fine">Click a node on the timeline, or a document in the list, to read what it does.</p>';
  const s = statusOf(d), c = C[d.country];
  const rels = relationsOf(id);
  const parties = d.parties ? `<dl class="ap-parties">${['US', 'CN', 'RU'].filter(k => d.parties[k]).map(k =>
    `<dt><span class="ap-cdot" style="background:${C[k].color}"></span>${esc(C[k].short)}</dt><dd>${esc(d.parties[k])}</dd>`).join('')}</dl>` : '';
  return `
    <p class="eyebrow"><span class="ap-cdot" style="background:${c.color}"></span>${esc(c.name)} · ${esc(KIND[d.kind] || d.kind)}</p>
    <h2 class="ap-dh">${esc(d.title)}</h2>
    ${d.titleOrig ? `<p class="ap-orig" lang="${d.country === 'RU' ? 'ru' : 'zh'}">${esc(d.titleOrig)}</p>` : ''}
    <p class="ap-meta"><span class="num">${esc(dateText(d.date, d.datePrecision))}</span>${d.effective && d.effective !== d.date ? ` · effective <span class="num">${esc(dateText(d.effective))}</span>` : ''} · ${esc(d.issuer)}</p>
    <p class="ap-statusline"><span class="ap-st" data-s="${s.s}">${esc(s.name)}</span> ${esc(d.statusNote || '')}</p>
    <p class="ap-sum">${esc(d.summary)}</p>
    ${parties}
    ${quoteHTML(d.quote, d.quoteEn, `<cite>${ext(d.quoteUrl || d.url, d.quoteLabel || (d.quoteUrl && d.quoteUrl !== d.url ? 'Quoted from ' + host(d.quoteUrl) : 'Quoted from the official text'))}</cite>`)}
    <ul class="ap-links-out">
      ${d.url ? `<li>${ext(d.url, 'Primary text')} <span class="fine">${esc(host(d.url))}</span></li>` : ''}
      ${d.archive ? `<li class="full-only">${ext(d.archive, 'Archived copy')} <span class="fine">web.archive.org</span></li>` : ''}
      ${d.translation ? `<li class="full-only">${ext(d.translation, 'English translation')} <span class="fine">${esc(host(d.translation))}</span></li>` : ''}
    </ul>
    ${rels.length ? `<div class="ap-rels full-only"><p class="eyebrow">Linked documents</p><ul>${rels.map(r => {
      const o = D[r.id], lab = r.dir === 'out' ? REL[r.type].verb : REL[r.type].back;
      return `<li><span class="ap-relk" style="color:${REL[r.type].color}">${esc(lab)}</span> <a href="#" class="ap-jump" data-id="${esc(r.id)}">${esc(o.title)}</a> <span class="fine">${esc(dateText(o.date, o.datePrecision))}</span></li>`;
    }).join('')}</ul></div>` : ''}
    <p class="fine ap-themes full-only">${d.themes.map(t => `<span class="pill">${esc(themeName(t))}</span>`).join('')}</p>
    ${d.verified === false ? '<p class="fine ap-unv">Unverified: see the note in Method &amp; sources.</p>' : ''}`;
}
