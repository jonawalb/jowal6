// Ranked list of framings (clusters) and the cluster dossier with its evidence.
import { TYPE_LABEL, passageLabel, coverageAt, pathways, langStats } from './model.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TYPE_NAME = { o: 'Official', s: 'State media', m: 'Media', q: 'Reporter (counted as media)', r: 'Repost, author unclear', f: 'Other government' };
const READING = {
  'official-official': 'Officials in two or more countries used near-identical wording within 14 days. This is what a joint statement, two readouts of the same meeting, or a line one government repeats from another look like. Read the members before calling it coordination.',
  mixed: 'One country’s officials and other countries’ media. Most often this is media reporting or quoting an official statement, which is amplification in the plain sense, not proof of a shared line.',
  'media-media': 'Media outlets only. Most often the same news event, wire copy or translated report carried by several countries’ outlets. Treat it as shared news flow unless the members show otherwise.',
};

const clip = t => (t && t.length >= 300 ? `${t.replace(/\s+\S*$/, '')}\u2026` : t);
export const leadText = c => (c.lead.text ? clip(c.lead.text) : c.lead.title);
const shortDate = d => d.slice(0, 10);
const DEAD_LINK = { mppre_es: 'Link dead: the ministry\u2019s site no longer serves this page (checked 16 Nov 2026).' };
/** Class and label for a cluster's representative passage: quote marks only for official wording, a tag for translations. */
function leadMarkup(D, c) {
  const K = c.lead.text ? passageLabel(c.lead) : null;
  const tag = !c.lead.text ? '<span class="tag">Headline</span> ' : !K.quote ? tagsOf(K) : '';
  return { cls: K && K.quote ? ' official' : '', html: `${tag}${esc(leadText(c))}` };
}
const tagsOf = K => `<span class="tag tr">${esc(K.tag)}</span> ${K.tag2 ? `<span class="tag tr">${esc(K.tag2)}</span> ` : ''}`;
// The corpus builds some official titles as "Ministry of Foreign Affairs: <first words of the answer>" and cut them at
// the first full stop, including the one in "U.S." or "Mr.", leaving "...: The St". Mark those as cut, not as the title.
export const showTitle = t => {
  if (!t) return t;
  const m = t.match(/^(Ministry of Foreign Affairs|Ministry of National Defense|Taiwan Affairs Office): (.*)$/);
  return m && !/[.?!”"')\]]$/.test(m[2]) ? `${t}\u2026 (title built by the corpus from the answer's opening and cut short)` : t;
};
const leadSource = (D, c) => `${esc(D.outlets[c.lead.outlet].name)}, ${esc(D.countries[c.lead.country])}, ${esc(c.lead.date)}`;

export function renderList(host, D, list, { limit, selected, onPick }) {
  if (!list.length) { host.innerHTML = '<li class="nc-empty">No clusters match these filters. Widen the period or clear a filter.</li>'; return; }
  host.innerHTML = list.slice(0, limit).map((c, i) => {
    const L = leadMarkup(D, c);
    const chips = c.countries.map(k => `<span class="cc${c.officialCountries.includes(k) ? ' off' : ''}" title="${esc(D.countries[k])}${c.officialCountries.includes(k) ? ' (official text)' : ''}">${k}</span>`).join('<span class="arr" aria-hidden="true">›</span>');
    return `<li><button type="button" class="nc-item${c.id === selected ? ' on' : ''}" data-id="${c.id}" aria-pressed="${c.id === selected}">
      <span class="rank num">${i + 1}</span>
      <span class="body">
        <span class="quote${L.cls}">${L.html}</span>
        <span class="src">${c.lead.text ? (c.lead.role ? 'Passage' : 'Representative official passage') : 'Headline'}: ${leadSource(D, c)}${c.lead === c.members[0] ? '' : ' (not the first-seen item)'}</span>
        <span class="meta"><span class="chips">${chips}</span>
          <span class="pill t-${c.type}">${TYPE_LABEL[c.type]}</span>
          <span class="num">${c.members.length} passages from ${c.docs} document${c.docs === 1 ? '' : 's'} · ${shortDate(c.start)}${c.span ? ` → +${c.span}d` : ''}</span>
          ${c.t != null ? `<span class="topic">Topic ${c.t}: ${esc(D.topics[c.t])}</span>` : ''}</span>
      </span></button></li>`;
  }).join('');
  host.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', () => onPick(b.dataset.id)));
}

/** Small timeline: one row per country in order of appearance, members as dots, parent links as lines. */
function strip(D, c) {
  const W = 320, rowH = 22, left = 34, right = 10;
  const H = c.countries.length * rowH + 22;
  const span = Math.max(1, c.span);
  const x = d => left + ((d - c.members[0].day) / span) * (W - left - right);
  const y = k => 12 + c.countries.indexOf(k) * rowH;
  const lines = c.members.map((m, i) => { const p = c.parents[i]; if (p < 0) return ''; const q = c.members[p];
    return `<line x1="${x(q.day).toFixed(1)}" y1="${y(q.country)}" x2="${x(m.day).toFixed(1)}" y2="${y(m.country)}" class="pl"/>`; }).join('');
  const jit = new Map();
  const dots = c.members.map(m => { const k = `${m.country}|${m.day}`; const n = jit.get(k) || 0; jit.set(k, n + 1);
    return `<circle cx="${(x(m.day) + (n % 4) * 3).toFixed(1)}" cy="${y(m.country) + (n >= 4 ? 4 : 0)}" r="4" class="t-${m.otype}"><title>${esc(m.date)} ${esc(D.outlets[m.outlet].name)}</title></circle>`; }).join('');
  const rows = c.countries.map(k => `<text x="0" y="${y(k) + 4}" class="lab">${k}</text><line x1="${left}" x2="${W - right}" y1="${y(k)}" y2="${y(k)}" class="row"/>`).join('');
  return `<svg class="nc-strip" viewBox="0 0 ${W} ${H}" role="img" aria-label="Timeline of the cluster's ${c.members.length} passages by country over ${c.span} days">
    ${rows}${lines}${dots}
    <text x="${left}" y="${H - 2}" class="ax">${shortDate(c.start)}</text><text x="${W - right}" y="${H - 2}" class="ax" text-anchor="end">+${c.span}d</text></svg>`;
}

/** Countries whose only official passages in the cluster are reporters' questions. */
export const askedOnly = c => c.officialCountries.filter(k => c.members.every(m => m.country !== k || m.otype !== 'o' || (m.asker && !m.askerInside)));
const qNote = c => {
  const moved = c.members.filter(m => m.moved).length, dropped = c.dropped.length;
  if (!moved && !dropped) return '';
  const parts = [moved ? `${moved} counted as the speaker's own outlet or government` : '', dropped ? `${dropped} left out of the network (joint statements, quoted third parties, and speakers whose outlet or country is not in the corpus)` : ''].filter(Boolean).join('; ');
  return `<span>${moved + dropped} passage${moved + dropped === 1 ? ' here is' : 's here are'} not the publishing government's own words (a journalist's question, another government's official, a joint statement or a quoted third party): ${parts}.</span>`;
};

export function renderDossier(host, D, c, { onReplay, onClose }) {
  if (!c) { host.hidden = true; host.innerHTML = ''; return; }
  host.hidden = false;
  const month = c.month;
  const cov = c.countries.map(k => { const [o, m] = coverageAt(D, k, month);
    return `<tr><th scope="row">${esc(D.countries[k])}</th><td class="num">${o.toLocaleString()}</td><td class="num">${m.toLocaleString()}</td></tr>`; }).join('');
  const thin = c.countries.some(k => { const [o, m] = coverageAt(D, k, month); return o + m < 50; });
  const first = c.members[0];
  const items = c.members.map((m, i) => {
    const more = i === 12 ? `</ol><details class="nc-more-items"><summary>Show the other ${c.members.length - 12} items</summary><ol class="nc-members" start="13">` : '';
    const o = D.outlets[m.base.outlet], p = c.parents[i];
    const via = p >= 0 ? `matches #${p + 1} (${c.members[p].country}, ${c.members[p].date})` : i === 0 ? 'first in this corpus' : 'no earlier match in this cluster';
    const K = m.text && passageLabel(m);
    const body = m.text
      ? `${K.quote ? `<blockquote class="q">${esc(clip(m.text))}</blockquote>` : `<p class="q tr">${tagsOf(K)}${esc(clip(m.text))}</p>`}<p class="fine">${esc(K.note)} Matched passage, at most 300 characters. ${m.title ? `Document title as recorded in the corpus: ${esc(showTitle(m.title))}` : ''}</p>`
      : `<p class="hl">${esc(showTitle(m.title)) || '(no headline)'}</p><p class="fine">${o.type === 'o' ? 'Official item; the matched passage is its title as recorded in the corpus.' : 'Media item: headline and link only.'}</p>`;
    return `${more}<li class="nc-mem">
      <p class="mh"><span class="num">#${i + 1} · ${esc(m.date)}</span> <b>${esc(D.countries[m.base.country])}</b> · ${esc(o.name)} <span class="pill k-${m.otype === 'o' ? 'official' : 'media'}">${m.moved ? `${m.role === 'q' ? 'Question by' : 'Spoken by'} ${esc(m.role === 'q' ? D.outlets[m.outlet].name : m.asker)}: counted as ${esc(D.countries[m.country])}, ${TYPE_NAME[m.otype].toLowerCase()}` : TYPE_NAME[m.otype]}</span></p>
      ${body}
      <p class="fine num">similarity ${m.sim.toFixed(3)} · ${esc(m.lang)} · ${esc(via)}</p>
      ${m.url ? `<a class="xlink" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Open the original ↗</a>` : ''}${DEAD_LINK[m.source] ? `<p class="fine">${DEAD_LINK[m.source]}</p>` : ''}
    </li>`;
  }).join('');
  host.innerHTML = `
    <div class="nc-dossier-head">
      <p class="eyebrow">Cluster dossier</p>
      <button type="button" class="btn nc-x" id="nc-close" aria-label="Close the dossier">Close</button>
    </div>
    <p class="nc-lead${leadMarkup(D, c).cls}">${leadMarkup(D, c).html}</p>
    <p class="fine">${c.lead.text ? `${c.lead.role ? 'Passage' : 'Representative official passage'}, ${leadSource(D, c)}. ${esc(passageLabel(c.lead).note)}` : `Headline, ${leadSource(D, c)}.`}</p>
    <dl class="readout">
      <dt>Type</dt><dd>${TYPE_LABEL[c.type]}</dd>
      <dt>Countries</dt><dd>${c.countries.map(k => esc(D.countries[k])).join(' → ')}</dd>
      <dt>Passages</dt><dd>${c.members.length} from ${c.docs} document${c.docs === 1 ? '' : 's'} (${c.e.length} passage matches; one document can contribute more than one passage)</dd>
      <dt>First seen</dt><dd>${esc(first.date)}, ${esc(D.outlets[first.outlet].name)} (${esc(D.countries[first.country])})</dd>
      <dt>Span</dt><dd>${c.span} day${c.span === 1 ? '' : 's'}</dd>
      ${c.t != null ? `<dt>Topic</dt><dd>${c.t}: ${esc(D.topics[c.t])}</dd>` : ''}
      <dt>Cluster id</dt><dd>${c.id}</dd>
    </dl>
    <div class="nc-actions"><button type="button" class="btn solid" id="nc-replay">Play the spread on the network</button></div>
    <div class="status" data-s="warn"><b>How to read this cluster</b><span>${READING[c.type]}</span>
      <span>“First seen” means first in this corpus, not where the framing started.</span>${D.oldMethod ? '' : qNote(c)}${askedOnly(c).length ? `<span><b>Caution (old method):</b> the official text from ${askedOnly(c).map(k => esc(D.countries[k])).join(' and ')} in this cluster is only a reporter's question at a press conference, so its &ldquo;official&rdquo; label rests on a journalist's words.</span>` : ''}</div>
    ${strip(D, c)}
    <details class="nc-cov-month"${thin ? ' open' : ''}><summary>Corpus coverage in ${month}</summary>
      <p class="fine">Documents the corpus holds for each country that month. A country with thin coverage can look late or absent when it was neither.${thin ? ' <b>At least one country here has fewer than 50 documents this month.</b>' : ''}</p>
      <div class="tablewrap"><table><thead><tr><th>Country</th><th>Official</th><th>Media</th></tr></thead><tbody>${cov}</tbody></table></div>
    </details>
    <p class="eyebrow">Evidence, in date order</p>
    <ol class="nc-members">${items}</ol>${c.members.length > 12 ? '</details>' : ''}
    ${c.dropped.length ? `<p class="eyebrow">Left out of the network (${c.dropped.length})</p><ol class="nc-members">${c.dropped.map(m => `<li class="nc-mem"><p class="mh"><span class="num">${esc(m.date)}</span> <b>${esc(D.countries[m.base.country])}</b> · ${esc(D.outlets[m.base.outlet].name)}</p><p class="q tr">${tagsOf(passageLabel(m))}${esc(clip(m.text))}</p><p class="fine">${esc(passageLabel(m).note)}</p>${m.url ? `<a class="xlink" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Open the original ↗</a>` : ''}</li>`).join('')}</ol>` : ''}
    ${c.countries.length < 2 ? '<p class="fine"><b>Without the journalists\u2019 questions this cluster has fewer than two countries, so it is not in the list, network or counts.</b></p>' : ''}`;
  host.querySelector('#nc-replay').addEventListener('click', onReplay);
  host.querySelector('#nc-close').addEventListener('click', onClose);
}

const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
/** The live plain-English reading of the current selection. Every number is counted from the filtered clusters. */
export function resultSentence(list) {
  if (!list.length) return 'No clusters match these filters. Widen the period or clear a filter.';
  const { P, total } = pathways(list);
  const dated = Object.values(P).reduce((t, p) => t + p.n, 0);
  const [top, tp] = Object.entries(P).sort((a, b) => b[1].n - a[1].n)[0];
  const [from, to] = top.split('>');
  const oo = list.filter(c => c.type === 'official-official').length;
  const L = langStats(list), en = pct(L.en, L.items);
  const lead = dated ? `<b>${pct(tp.n, dated)}% of the ${dated.toLocaleString()} dated passage matches here run from ${from} in one country to ${to} in another</b>` : '<b>All matches here fall on the same day, so none has an order</b>';
  const off = oo ? `; officials in two or more countries share wording in ${oo.toLocaleString()} of ${list.length.toLocaleString()} clusters` : '; no cluster here has official text from two countries';
  const lang = `${L.cross.toLocaleString()} of ${total.toLocaleString()} matches join two languages and ${en}% of items are in English, so read this as ${en >= 60 ? 'overlap among English-language services' : 'same-language overlap'}, not coordination.`;
  return `${lead}${off}. ${lang}`;
}

/** One-line version of the result for the phone's sticky bar. */
export function shortResult(list) {
  if (!list.length) return 'No clusters match these filters.';
  const { P } = pathways(list);
  const dated = Object.values(P).reduce((t, p) => t + p.n, 0);
  const L = langStats(list);
  return `${dated ? `${pct(P['media>media'].n, dated)}% of dated matches media to media` : 'No dated matches'} · ${list.filter(c => c.type === 'official-official').length.toLocaleString()} official-official clusters · ${L.cross.toLocaleString()} of ${L.total.toLocaleString()} cross-language`;
}
