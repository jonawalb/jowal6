// Chain flow view: one row per stage, in chain order, grouped by phase. Each row is a 100% bar of
// country shares of that stage's world output (with the data year and source), hatched where the active
// shock withholds output, a "% left" readout, and optional badges counting the export controls aimed at
// the stage (U.S., allied, Chinese). Rows are buttons: click or Enter opens the stage card.

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const OTHER = /^(Other|Others|Rest)/;
const FIXED = {
  'United States': 'var(--us)', China: 'var(--prc)', Taiwan: 'var(--roc)', Japan: 'var(--jp)', 'South Korea': 'var(--c6)',
  Netherlands: 'var(--c2)', Europe: 'var(--c7)', 'European Union': 'var(--c7)', Germany: 'var(--c7)', 'United Kingdom': 'var(--c8)',
  Singapore: 'var(--c5)', Malaysia: 'var(--c5)', 'Southeast Asia': 'var(--c5)', 'Rest of Asia': 'var(--c8)',
};
export function colorOf(c) { return OTHER.test(c) ? 'var(--faint)' : FIXED[c] || 'var(--c8)'; }

export function rowsOf(stage) {
  const ent = Object.entries(stage.shares || {});
  const named = ent.filter(([c]) => !OTHER.test(c)).sort((a, b) => b[1] - a[1]);
  const other = ent.filter(([c]) => OTHER.test(c));
  return [...named.map(([c, v]) => ({ c, v })), ...other.map(([c, v]) => ({ c, v }))];
}

export function legendCountries(stages) {
  const seen = new Map();
  stages.forEach(s => rowsOf(s).forEach(r => { if (!OTHER.test(r.c) && !seen.has(r.c)) seen.set(r.c, colorOf(r.c)); }));
  return [...seen.entries()].filter(([c]) => FIXED[c]);
}

export function drawFlow(el, chain, ctx) {
  const { losses, hits, ctlCount, overlay, selected } = ctx;
  let html = '';
  for (const ph of chain.phases) {
    const sts = chain.stages.filter(s => s.phase === ph.id);
    if (!sts.length) continue;
    html += `<li class="phase"><span class="ph-t">${esc(ph.label)}</span></li>`;
    for (const s of sts) {
      const loss = losses[s.id] || 0;
      const rows = rowsOf(s);
      const src = chain.sources[s.src];
      const segs = rows.map(r => {
        const h = hits.filter(x => x.st === s.id && (x.a === r.c || (s.firmCountry && s.firmCountry[x.a] === r.c)));
        const cut = h.reduce((a, x) => a + (x.a === r.c ? x.c : (s.firms[x.a] / r.v) * x.c), 0);
        const lab = r.v >= 11 ? `<span class="sg-t">${esc(short(r.c))} ${fmt(r.v)}%</span>` : '';
        const hatch = cut > 0 ? `<i class="cut" style="width:${Math.min(100, cut)}%"></i>` : '';
        return `<span class="sg" style="flex-basis:${r.v}%;background:${colorOf(r.c)}" data-c="${esc(r.c)}" data-v="${r.v}">${hatch}${lab}</span>`;
      }).join('');
      const empty = rows.length ? '' : `<span class="sg nodata">${s.phase === 'output' ? 'Target of controls; no share shown' : 'No public country split'}</span>`;
      const left = loss > 0 ? `<span class="left" data-s="${loss > 0.5 ? 'bad' : 'warn'}">${Math.round((1 - loss) * 100)}% left</span>` : '';
      const n = ctlCount[s.id] || { us: 0, al: 0, cn: 0 };
      const badges = overlay ? `<span class="bdg">${n.us ? `<b class="b-us" title="U.S. measures">US ${n.us}</b>` : ''}${n.al ? `<b class="b-al" title="Allied measures">Allied ${n.al}</b>` : ''}${n.cn ? `<b class="b-cn" title="Chinese measures">CN ${n.cn}</b>` : ''}${!n.us && !n.al && !n.cn ? '<b class="b-0">no control listed</b>' : ''}</span>` : '';
      const top = rows[0] ? `${rows[0].c} ${fmt(rows[0].v)}%` : 'no country split';
      const aria = `${s.label}. ${s.metric}, ${s.year}. Largest: ${top}.${loss > 0 ? ` ${Math.round((1 - loss) * 100)}% left in this shock.` : ''} Open details.`;
      html += `<li><button type="button" class="node" data-st="${s.id}" aria-pressed="${s.id === selected}" aria-label="${esc(aria)}">
        <span class="nl"><span class="nt">${esc(s.label)}</span><span class="nm">${esc(s.metric)} · ${esc(String(s.year))} · ${esc(src ? src.short : '')}</span></span>
        <span class="bar" aria-hidden="true">${segs}${empty}</span>
        <span class="nr">${left}${badges}</span></button></li>`;
    }
  }
  el.innerHTML = html;
}

const fmt = v => (v < 10 ? (Math.round(v * 10) / 10).toString() : Math.round(v).toString());
const short = c => ({ 'United States': 'U.S.', 'South Korea': 'Korea', Netherlands: 'NL', 'United Kingdom': 'UK', 'European Union': 'EU' }[c] || c);

// Hover tooltip on bar segments.
export function wireFlowTip(el, tip, chain) {
  el.addEventListener('pointermove', e => {
    const sg = e.target.closest('.sg[data-c]');
    if (!sg) { tip.hidden = true; return; }
    const s = chain.stages.find(x => x.id === sg.closest('.node').dataset.st);
    tip.innerHTML = `<b>${esc(sg.dataset.c)}: ${sg.dataset.v}%</b><small>${esc(s.metric)}, ${esc(String(s.year))}</small><small>${esc(chain.sources[s.src].short)}</small>`;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    tip.style.left = Math.min(Math.max(4, e.clientX - r.left + 12), r.width - 230) + 'px';
    tip.style.top = (e.clientY - r.top + 14) + 'px';
    tip.style.maxWidth = '230px';
  });
  el.addEventListener('pointerleave', () => { tip.hidden = true; });
}
