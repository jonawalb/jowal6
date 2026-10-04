// Stage-flow chart: one stacked column per supply-chain stage (country shares of world output),
// bands linking the same country across stages, hatching for output withheld in the active shock,
// and a final column of defense end uses.
import { CHAIN } from '../data/chain.js';
import { ENDUSES } from '../data/enduses.js';

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const OTHER = /^(Other|Others)/;
const FIXED = { China: 'var(--prc)', DRC: 'var(--c5)', Russia: 'var(--c8)', 'United States': 'var(--us)', Japan: 'var(--jp)',
  Australia: 'var(--c3)', Chile: 'var(--c6)', Indonesia: 'var(--c2)', Argentina: 'var(--c7)', Mozambique: 'var(--c7)', 'South Africa': 'var(--c2)' };
const CYCLE = ['var(--c1)', 'var(--c3)', 'var(--c6)', 'var(--c7)', 'var(--c2)', 'var(--c4)', 'var(--c5)'];

export function colorOf(country, i = 0) {
  if (OTHER.test(country)) return 'var(--faint)';
  return FIXED[country] || CYCLE[i % CYCLE.length];
}

// Rows to draw for one stage: top `k` countries plus one merged "Other".
export function stageRows(stage, k = 6) {
  const ent = Object.entries(stage.shares);
  const named = ent.filter(([c]) => !OTHER.test(c)).sort((a, b) => b[1] - a[1]);
  const keep = named.slice(0, k);
  const rest = named.slice(k).reduce((s, [, v]) => s + v, 0) + ent.filter(([c]) => OTHER.test(c) && !/not broken/.test(c)).reduce((s, [, v]) => s + v, 0);
  const nb = ent.find(([c]) => /not broken/.test(c));
  const rows = keep.map(([c, v]) => ({ c, v }));
  if (rest > 0.05) rows.push({ c: 'Other', v: +rest.toFixed(1) });
  if (nb) rows.push({ c: nb[0], v: nb[1] });
  return rows;
}

const SRC_SHORT = id => (id ? CHAIN.sources[id].short : 'no source');

export function drawFlow(svg, tip, mineral, losses, hits, opts = {}) {
  const box = svg.parentElement.getBoundingClientRect();
  const W = Math.max(330, Math.round(box.width || 900));
  const narrow = W < 620;
  const H = narrow ? 330 : 360;
  const top = 58, bot = H - 14, span = bot - top;
  const stages = mineral.stages;
  const showUse = !narrow;
  const cols = stages.length + (showUse ? 1 : 0);
  const left = 8, right = 8;
  const colW = (W - left - right) / cols;
  const barW = narrow ? 16 : 22;
  const xs = stages.map((_, i) => left + i * colW);

  // Global country order and colour so a country keeps one colour across stages.
  const allRows = stages.map(s => stageRows(s, narrow ? 4 : 6));
  const seen = new Map();
  const actors = new Set(hits.map(h => h.a));
  allRows.flat().filter(r => !OTHER.test(r.c)).sort((a, b) => (actors.has(b.c) - actors.has(a.c)) || b.v - a.v)
    .forEach(r => { if (!seen.has(r.c)) seen.set(r.c, seen.size); });
  const order = c => (OTHER.test(c) ? 1e6 + (/not broken/.test(c) ? 1 : 0) : seen.get(c));
  const col = c => colorOf(c, seen.get(c) || 0);

  let g = `<defs><pattern id="mt-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="6" height="6" style="fill:var(--panel)" fill-opacity=".55"></rect><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--bad)" stroke-width="2.4"></line></pattern></defs>`;
  const pos = []; // per stage: { country: {y0, y1} }
  stages.forEach((s, i) => {
    const rows = allRows[i].sort((a, b) => order(a.c) - order(b.c));
    const x = xs[i];
    const loss = losses[s.id];
    const title = s.label;
    g += `<text class="col-t" x="${x}" y="16">${esc(narrow || colW < 200 ? s.short : title)}</text>`;
    g += `<text class="col-s" x="${x}" y="31">${s.year || 'n/a'}${narrow ? '' : ' · ' + esc(SRC_SHORT(s.src))}</text>`;
    if (loss > 0) {
      const a = Math.max(0, 1 - loss);
      g += `<text class="avail-t" x="${x}" y="47" style="fill:${a < 0.5 ? 'var(--bad)' : 'var(--warn)'}">${Math.round(a * 100)}% left</text>`;
    }
    const p = {};
    if (!rows.length) {
      g += `<rect class="nodata" x="${x}" y="${top}" width="${barW}" height="${span}"></rect>`;
      const lines = narrow ? ['No public', 'country data'] : ['No public country', 'shares published'];
      lines.forEach((l, k) => { g += `<text class="seg-t" x="${x + barW + 6}" y="${top + 16 + k * 14}">${l}</text>`; });
      pos.push(p); return;
    }
    let y = top;
    rows.forEach(r => {
      const h = span * r.v / 100;
      p[r.c] = { y0: y, y1: y + h };
      const lab = `${r.c}: ${r.v}% of world ${s.label.toLowerCase()}, ${s.year}`;
      g += `<rect class="segr" tabindex="0" role="img" aria-label="${esc(lab)}" data-st="${s.id}" data-c="${esc(r.c)}" x="${x}" y="${y}" width="${barW}" height="${Math.max(0.5, h)}" style="fill:${col(r.c)}"></rect>`;
      for (const hit of hits.filter(hh => hh.st === s.id && hh.a === r.c && opts.basis !== 'us')) {
        g += `<rect class="withheld" x="${x}" y="${y}" width="${barW}" height="${h * hit.c / 100}" pointer-events="none"></rect>`;
      }
      if (h >= 13) {
        const name = r.c.replace('Others (not broken out)', narrow ? 'Others' : 'Others, not broken out');
        g += `<text class="seg-t" x="${x + barW + 5}" y="${y + Math.min(h / 2 + 4, 13)}">${esc(name)} <tspan class="pct">${r.v}%</tspan></text>`;
      }
      y += h;
    });
    pos.push(p);
  });

  // Bands between adjacent stages for countries present in both.
  let bands = '';
  for (let i = 0; i < stages.length - 1; i++) {
    const a = pos[i], b = pos[i + 1];
    const x0 = xs[i] + barW, x1 = xs[i + 1], mx = (x0 + x1) / 2;
    for (const c of Object.keys(a)) {
      if (!b[c] || OTHER.test(c)) continue;
      const A = a[c], B = b[c];
      const dim = actors.size && !actors.has(c) ? ' dim' : '';
      bands += `<path class="band${dim}" style="fill:${col(c)}" d="M${x0},${A.y0} C${mx},${A.y0} ${mx},${B.y0} ${x1},${B.y0} L${x1},${B.y1} C${mx},${B.y1} ${mx},${A.y1} ${x0},${A.y1} Z"></path>`;
    }
  }
  if (showUse) {
    const x = left + stages.length * colW;
    const cls = (ENDUSES[mineral.id] || {}).classes || [];
    const bh = Math.min(span, 22 + cls.length * 18);
    g += `<text class="col-t" x="${x}" y="16">Defense end uses</text><text class="col-s" x="${x}" y="31">GAO, USGS, IEA</text>`;
    g += `<rect class="use-box" x="${x}" y="${top}" width="${colW - 10}" height="${bh}" rx="3"></rect>`;
    cls.forEach((c, k) => { g += `<text class="use-t" x="${x + 8}" y="${top + 20 + k * 18}">${esc(c.length > 40 ? c.slice(0, 38) + '…' : c)}</text>`; });
  }
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = bands + g;
  wireTip(svg, tip, mineral);
}

function wireTip(svg, tip, mineral) {
  const show = (el, ev) => {
    const s = mineral.stages.find(x => x.id === el.dataset.st);
    const c = el.dataset.c;
    const v = s.shares[c] ?? (c === 'Other' ? null : null);
    const qty = s.values && s.values[c] != null ? `${s.values[c].toLocaleString('en-US')} ${s.unit || ''}` : '';
    const src = s.src ? CHAIN.sources[s.src] : null;
    tip.innerHTML = `<b>${esc(c)}</b><span class="tt-d">${esc(s.label)}, ${s.year}</span>${v != null ? `${v}% of world` : 'Merged smaller producers'}${qty ? `<small>${qty}</small>` : ''}${src ? `<small>${esc(src.short)}</small>` : ''}${s.note ? `<small>${esc(s.note)}</small>` : ''}`;
    tip.hidden = false;
    const r = svg.parentElement.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const x = (ev && ev.clientX ? ev.clientX : er.right) - r.left;
    const y = (ev && ev.clientY ? ev.clientY : er.top) - r.top;
    tip.style.left = Math.min(Math.max(4, x + 12), r.width - 240) + 'px';
    tip.style.top = Math.max(4, y - 10) + 'px';
    tip.style.maxWidth = '240px';
  };
  svg.querySelectorAll('.segr').forEach(el => {
    el.addEventListener('pointermove', e => show(el, e));
    el.addEventListener('focus', () => show(el));
    el.addEventListener('pointerleave', () => { tip.hidden = true; });
    el.addEventListener('blur', () => { tip.hidden = true; });
  });
}

