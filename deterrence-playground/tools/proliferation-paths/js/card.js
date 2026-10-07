// State card (side panel) and the dataset-reconciliation table.
import { STATES, COVER, DIFFS } from '../data/codings.js';
import { NOTES } from '../data/notes.js';
import { esc, summary, episodes, everHighest, everReversed, stateById, srcLink, DATASETS, DS_SHORT, DS_LABEL, STAGES, STAGE_LABEL, STAGE_COLOR, END_EXCLUSIVE } from './common.js';

const COLS = [['explore', 'Explore'], ['pursue', 'Pursue'], ['acquire', 'Acquire'], ['stop', 'No activity']];
const val = (sm, k, ds) => {
  if (!sm) return '';
  if (k === 'stop') return sm.open ? `open (${COVER[ds]})` : sm.stop;
  if (k === 'explore' && ds === 'jg') return 'n/a';
  return sm.first[k] ?? '';
};
// Datasets that split a state's history into a different number of spells are not comparable on the end year.
const sameSpells = id => new Set(DATASETS.map(ds => summary(ds, id)).filter(Boolean).map(sm => sm.spells)).size <= 1;
const spread = (id, k) => {
  if (k === 'stop' && !sameSpells(id)) return 0;
  const v = DATASETS.map(ds => summary(ds, id)).filter(Boolean).map(sm => (k === 'stop' ? (sm.open ? null : sm.stop) : sm.first[k])).filter(x => x != null);
  return v.length > 1 ? Math.max(...v) - Math.min(...v) : 0;
};

function episodeText(ds, id) {
  const eps = episodes(ds, id);
  if (!eps.length) return '<span class="pp-nc">not coded</span>';
  return eps.map(e => `<span class="pp-ep"><i style="background:${STAGE_COLOR[e.stage]}"></i>${e.stage} ${e.from}–${e.to == null ? '' : e.to}</span>`).join(' ');
}

export function cardHTML(id) {
  const s = stateById(id);
  if (!s) return '<p class="fine">Click a state on the map or a row in the timeline to open its card.</p>';
  const hi = everHighest(id);
  const notes = NOTES.filter(n => n.state === id);
  const rows = DATASETS.map(ds => {
    const sm = summary(ds, id);
    return `<tr><th scope="row">${esc(DS_SHORT[ds])}</th>${COLS.map(([k]) => `<td class="num${spread(id, k) >= 3 ? ' gap' : ''}">${sm ? val(sm, k, ds) : k === 'explore' ? '<span class="pp-nc">not coded</span>' : ''}</td>`).join('')}</tr>`;
  }).join('');
  const big = COLS.filter(([k]) => spread(id, k) >= 3).map(([k, l]) => `${l.toLowerCase()} (${spread(id, k)} years apart)`);
  return `<p class="eyebrow">State card</p>
    <h3 class="pp-ch">${esc(s.name)}</h3>
    <p class="pp-badges">${hi === 'none' ? '<span class="pill">Not coded by any dataset</span>' : `<span class="pill pp-pill" style="--pc:${STAGE_COLOR[hi]}">Highest stage coded: ${esc(STAGE_LABEL[hi].toLowerCase())}</span>`}${everReversed(id) ? '<span class="pill">Reversed course</span>' : ''}</p>
    ${hi === 'none' ? '' : `<p class="fine pp-minicap">First year coded at each stage or higher, and first year back at no activity</p><div class="tablewrap"><table class="pp-mini">
      <thead><tr><th></th>${COLS.map(([, l]) => `<th scope="col">${l}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
      ${big.length ? `<p class="fine pp-warn">The datasets disagree by three years or more on ${big.join(', ')}.</p>` : ''}
      <details><summary>Episodes as each dataset prints them</summary>${DATASETS.map(ds => `<p class="pp-eps"><b>${esc(DS_SHORT[ds])}</b> ${episodeText(ds, id)}</p>`).join('')}
      <p class="fine">Bleek's second year is the year the state dropped back; Singh &amp; Way and Jo &amp; Gartzke give the last active year. The table above puts both on Bleek's convention.</p></details>`}
    ${s.sw04 ? `<p class="fine"><b>Singh &amp; Way 2004 original, as reported by Bleek:</b> ${esc(s.sw04)}</p>` : ''}
    ${notes.length ? `<p class="eyebrow pp-mt">Notes</p><ul class="pp-notes">${notes.map(n => `<li>${esc(n.text)} <span class="fine">(${srcLink(n.src, n.page)})</span></li>`).join('')}</ul>` : ''}`;
}

/** Table of first-year codings for every state, with cells flagged where datasets differ by 3+ years. */
export function reconcileHTML(onlyGaps) {
  const ids = STATES.filter(s => everHighest(s.id) !== 'none').map(s => s.id)
    .filter(id => !onlyGaps || COLS.some(([k]) => spread(id, k) >= 3))
    .sort((a, b) => Math.max(...COLS.map(([k]) => spread(b, k))) - Math.max(...COLS.map(([k]) => spread(a, k))));
  const cell = (id, k) => {
    const parts = DATASETS.map(ds => { const sm = summary(ds, id); const v = sm ? val(sm, k, ds) : ''; return `<span title="${esc(DS_LABEL[ds])}"><abbr>${ds === 'bleek' ? 'B' : ds === 'way12' ? 'W' : 'J'}</abbr> ${v === '' ? '–' : v}</span>`; }).join('');
    const note = k === 'stop' && !sameSpells(id) ? '<small class="fine">different number of episodes</small>' : '';
    return `<td class="${spread(id, k) >= 3 ? 'gap' : ''}"><div class="pp-trip num">${parts}</div>${note}</td>`;
  };
  return `<table class="pp-rec"><thead><tr><th scope="col">State</th>${COLS.map(([, l]) => `<th scope="col">${l} from</th>`).join('')}<th scope="col">Widest gap</th></tr></thead>
    <tbody>${ids.map(id => `<tr><th scope="row"><button type="button" class="pp-link" data-open="${id}">${esc(stateById(id).name)}</button></th>${COLS.map(([k]) => cell(id, k)).join('')}<td class="num">${Math.max(...COLS.map(([k]) => spread(id, k)))} yrs</td></tr>`).join('')}</tbody></table>`;
}

export function diffsHTML() {
  const way = DIFFS.way2011to2012.map(t => `<li>Way, ${esc(t)}</li>`).join('');
  const jg = DIFFS.jgTableVsDta.map(t => `<li>Jo &amp; Gartzke, ${esc(t)}</li>`).join('');
  return `<ul class="src">${way}${jg}</ul>`;
}
export { END_EXCLUSIVE };
