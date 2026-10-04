// Ranked list of framings (clusters) and the cluster dossier with its evidence.
import { TYPE_LABEL, coverageAt } from './model.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TYPE_NAME = { o: 'Official', s: 'State media', m: 'Media' };
const READING = {
  'official-official': 'Officials in two or more countries used near-identical wording within 14 days. This is what a joint statement, two readouts of the same meeting, or a line one government repeats from another look like. Read the members before calling it coordination.',
  mixed: 'One country’s officials and other countries’ media. Most often this is media reporting or quoting an official statement, which is amplification in the plain sense, not proof of a shared line.',
  'media-media': 'Media outlets only. Most often the same news event, wire copy or translated report carried by several countries’ outlets. Treat it as shared news flow unless the members show otherwise.',
};

const clip = t => (t && t.length >= 300 ? `${t.replace(/\s+\S*$/, '')}\u2026` : t);
export const leadText = c => (c.lead.text ? clip(c.lead.text) : c.lead.title);
const shortDate = d => d.slice(0, 10);

export function renderList(host, D, list, { limit, selected, onPick }) {
  if (!list.length) { host.innerHTML = '<li class="nc-empty">No clusters match these filters. Widen the period or clear a filter.</li>'; return; }
  host.innerHTML = list.slice(0, limit).map((c, i) => {
    const official = !!c.lead.text;
    const chips = c.countries.map(k => `<span class="cc${c.officialCountries.includes(k) ? ' off' : ''}" title="${esc(D.countries[k])}${c.officialCountries.includes(k) ? ' (official text)' : ''}">${k}</span>`).join('<span class="arr" aria-hidden="true">›</span>');
    return `<li><button type="button" class="nc-item${c.id === selected ? ' on' : ''}" data-id="${c.id}" aria-pressed="${c.id === selected}">
      <span class="rank num">${i + 1}</span>
      <span class="body">
        <span class="quote${official ? ' official' : ''}">${official ? '' : '<span class="tag">Headline</span> '}${esc(leadText(c))}</span>
        <span class="meta"><span class="chips">${chips}</span>
          <span class="pill t-${c.type}">${TYPE_LABEL[c.type]}</span>
          <span class="num">${c.members.length} items · ${shortDate(c.start)}${c.span ? ` → +${c.span}d` : ''}</span>
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
  return `<svg class="nc-strip" viewBox="0 0 ${W} ${H}" role="img" aria-label="Timeline of the cluster's ${c.members.length} items by country over ${c.span} days">
    ${rows}${lines}${dots}
    <text x="${left}" y="${H - 2}" class="ax">${shortDate(c.start)}</text><text x="${W - right}" y="${H - 2}" class="ax" text-anchor="end">+${c.span}d</text></svg>`;
}

export function renderDossier(host, D, c, { onReplay, onClose }) {
  if (!c) { host.hidden = true; host.innerHTML = ''; return; }
  host.hidden = false;
  const month = c.month;
  const cov = c.countries.map(k => { const [o, m] = coverageAt(D, k, month);
    return `<tr><th scope="row">${esc(D.countries[k])}</th><td class="num">${o.toLocaleString()}</td><td class="num">${m.toLocaleString()}</td></tr>`; }).join('');
  const first = c.members[0];
  const items = c.members.map((m, i) => {
    const more = i === 12 ? `</ol><details class="nc-more-items"><summary>Show the other ${c.members.length - 12} items</summary><ol class="nc-members" start="13">` : '';
    const o = D.outlets[m.outlet], p = c.parents[i];
    const via = p >= 0 ? `matches #${p + 1} (${c.members[p].country}, ${c.members[p].date})` : i === 0 ? 'first in this corpus' : 'no earlier match in this cluster';
    const body = m.text
      ? `<blockquote class="q">${esc(clip(m.text))}</blockquote><p class="fine">Official text, matched passage (at most 300 characters). ${m.title ? `From: ${esc(m.title)}` : ''}</p>`
      : `<p class="hl">${esc(m.title) || '(no headline)'}</p><p class="fine">${o.type === 'o' ? 'Official item; the matched passage is its title.' : 'Media item: headline and link only.'}</p>`;
    return `${more}<li class="nc-mem">
      <p class="mh"><span class="num">#${i + 1} · ${esc(m.date)}</span> <b>${esc(D.countries[m.country])}</b> · ${esc(o.name)} <span class="pill k-${o.type === 'o' ? 'official' : 'media'}">${TYPE_NAME[o.type]}</span></p>
      ${body}
      <p class="fine num">similarity ${m.sim.toFixed(3)} · ${esc(m.lang)} · ${esc(via)}</p>
      ${m.url ? `<a class="xlink" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Open the original ↗</a>` : ''}
    </li>`;
  }).join('');
  host.innerHTML = `
    <div class="nc-dossier-head">
      <p class="eyebrow">Cluster dossier</p>
      <button type="button" class="btn nc-x" id="nc-close" aria-label="Close the dossier">Close</button>
    </div>
    <p class="nc-lead${c.lead.text ? ' official' : ''}">${esc(leadText(c))}</p>
    <dl class="readout">
      <dt>Type</dt><dd>${TYPE_LABEL[c.type]}</dd>
      <dt>Countries</dt><dd>${c.countries.map(k => esc(D.countries[k])).join(' → ')}</dd>
      <dt>Items</dt><dd>${c.members.length} (${c.e.length} passage matches)</dd>
      <dt>First seen</dt><dd>${esc(first.date)}, ${esc(D.outlets[first.outlet].name)} (${esc(D.countries[first.country])})</dd>
      <dt>Span</dt><dd>${c.span} day${c.span === 1 ? '' : 's'}</dd>
      ${c.t != null ? `<dt>Topic</dt><dd>${c.t}: ${esc(D.topics[c.t])}</dd>` : ''}
      <dt>Cluster id</dt><dd>${c.id}</dd>
    </dl>
    <div class="nc-actions"><button type="button" class="btn solid" id="nc-replay">Play the spread on the network</button></div>
    <div class="status" data-s="warn"><b>How to read this cluster</b><span>${READING[c.type]}</span>
      <span>“First seen” means first in this corpus, not where the framing started.</span></div>
    ${strip(D, c)}
    <details class="nc-cov-month"><summary>Corpus coverage in ${month}</summary>
      <p class="fine">Documents the corpus holds for each country that month. A country with thin coverage can look late or absent when it was neither.</p>
      <div class="tablewrap"><table><thead><tr><th>Country</th><th>Official</th><th>Media</th></tr></thead><tbody>${cov}</tbody></table></div>
    </details>
    <p class="eyebrow">Evidence, in date order</p>
    <ol class="nc-members">${items}</ol>${c.members.length > 12 ? '</details>' : ''}`;
  host.querySelector('#nc-replay').addEventListener('click', onReplay);
  host.querySelector('#nc-close').addEventListener('click', onClose);
}
